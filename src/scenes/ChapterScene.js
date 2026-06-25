const ArchivePainter = require('../render/ArchivePainter.js');
const ImageLoader = require('../render/ImageLoader.js');
const ScrollController = require('../core/ScrollController.js');
const LevelScene = require('./LevelScene.js');

const TILE_PADDING = 12;
const FOOTER_GAP = 24;

class ChapterScene {
  constructor({ sceneManager, canvasManager, env, progress = {}, chapter }) {
    this.sceneManager = sceneManager;
    this.canvasManager = canvasManager;
    this.env = env;
    this.chapter = chapter;
    this.progress = progress;
    this.scroll = new ScrollController();
    this._tapX = null;
    this._tapY = null;
    this.initLayout();
  }

  initLayout() {
    const { width, height, safeTop, safeBottom } = this.canvasManager;
    const introLines = this.chapter.chapterIntro ? this.chapter.chapterIntro.split('\n').length : 0;
    this.headerH = safeTop + 56 + introLines * 18 + 22;
    this.cols = 2;
    this.tileW = (width - TILE_PADDING * (this.cols + 1)) / this.cols;
    this.tileH = 130;
    this.tiles = this.chapter.levels.map((lv, i) => {
      const col = i % this.cols;
      const row = Math.floor(i / this.cols);
      return {
        level: lv,
        x: TILE_PADDING + col * (this.tileW + TILE_PADDING),
        y: TILE_PADDING + row * (this.tileH + TILE_PADDING), // 相对于内容区
        w: this.tileW,
        h: this.tileH,
        index: i,
      };
    });
    const last = this.tiles[this.tiles.length - 1];
    const contentH = (last.y + last.h + TILE_PADDING) + safeBottom + FOOTER_GAP;
    const viewportH = height - this.headerH;
    this.scroll.setBounds(contentH, viewportH);
  }

  backRect() {
    const { safeTop } = this.canvasManager;
    return { x: 8, y: safeTop + 6, w: 44, h: 36 };
  }

  isUnlocked(index) {
    if (index === 0) return true;
    const prev = this.chapter.levels[index - 1];
    return !!(this.progress[prev.levelId] && this.progress[prev.levelId].stars > 0);
  }

  async startLevel(level) {
    const imageSize = level.imageSize || this.chapter.imageSize;
    let imageA;
    let imageAForB = null;
    let imageB = null;
    if (level.imageA && typeof level.imageA === 'string') {
      const loader = this.imageLoader || (this.imageLoader = new ImageLoader(this.env));
      imageA = await loader.load(level.imageA);
      if (level.imageB && typeof level.imageB === 'string') {
        imageB = await loader.loadFresh(level.imageB);
      } else if (this.env.isWx && level.diffs && level.diffs.length > 0) {
        const bBasePath = level.imageBBase || level.imageA;
        imageAForB = await loader.loadFresh(bBasePath);
      }
    } else {
      imageA = ArchivePainter.paint(this.env, level.painterId, imageSize, level.index || 1);
    }
    if (this.env.toDrawable && imageA && typeof imageA.getContext === 'function') {
      imageA = await this.env.toDrawable(imageA);
    }
    const levelConfig = {
      levelId: level.levelId,
      title: level.title,
      layout: level.layout || 'vertical',
      imageSize,
      timeLimit: level.timeLimit,
      maxMisses: level.maxMisses,
      diffs: level.diffs,
      starThresholds: level.starThresholds,
      story: level.story,
      debugCoords: !!level.debugCoords,
    };
    this.sceneManager.push(new LevelScene({
      sceneManager: this.sceneManager,
      canvasManager: this.canvasManager,
      env: this.env,
      levelConfig,
      imageA,
      imageAForB,
      imageB,
      onFinish: (result) => {
        this.onLevelFinish(level, result);
        while (this.sceneManager.current !== this) this.sceneManager.pop();
      },
    }));
  }

  onLevelFinish(level, result) {
    if (result.stars > 0) {
      const cur = this.progress[level.levelId] || { stars: 0, bestTime: Infinity };
      this.progress[level.levelId] = {
        stars: Math.max(cur.stars, result.stars),
        bestTime: Math.min(cur.bestTime, result.time || Infinity),
      };
    }
  }

  hit(rect, x, y) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  onTouchStart({ x, y }) {
    this._tapX = x;
    this._tapY = y;
    if (this.hit(this.backRect(), x, y)) return; // 留到 end 再判断点击
    if (y < this.headerH) return;
    this.scroll.onTouchStart(y);
  }

  onTouchMove({ y }) {
    this.scroll.onTouchMove(y);
  }

  onTouchEnd() {
    const wasDragging = this.scroll.dragging;
    const isTap = this.scroll.isTap();
    this.scroll.onTouchEnd();
    const x = this._tapX, y = this._tapY;
    if (x == null || y == null) return;
    // 返回按钮不参与滚动，独立判定
    if (this.hit(this.backRect(), x, y)) {
      this.sceneManager.pop();
      return;
    }
    if (!wasDragging || !isTap) return;
    if (y < this.headerH) return;
    const localY = y - this.headerH + this.scroll.scrollY;
    for (const t of this.tiles) {
      if (x >= t.x && x <= t.x + t.w && localY >= t.y && localY <= t.y + t.h) {
        if (!this.isUnlocked(t.index)) return;
        this.startLevel({ ...t.level, index: t.index });
        return;
      }
    }
  }

  update(dt) {
    this.scroll.update(dt);
  }

  render(ctx) {
    const { width, height, safeTop } = this.canvasManager;
    ctx.fillStyle = '#0b0b16';
    ctx.fillRect(0, 0, width, height);

    // 关卡格（裁剪在内容区内）
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, this.headerH, width, height - this.headerH);
    ctx.clip();
    for (const t of this.tiles) {
      const ty = this.headerH + t.y - this.scroll.scrollY;
      if (ty + t.h < this.headerH || ty > height) continue;
      this.drawTile(ctx, t, ty);
    }
    ctx.restore();

    // header（盖在最上）
    ctx.fillStyle = '#15152a';
    ctx.fillRect(0, 0, width, this.headerH);

    const br = this.backRect();
    ctx.strokeStyle = '#e6d8a8';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const acx = br.x + br.w / 2 - 4;
    const acy = br.y + br.h / 2;
    ctx.moveTo(acx + 6, acy - 8);
    ctx.lineTo(acx - 4, acy);
    ctx.lineTo(acx + 6, acy + 8);
    ctx.stroke();

    ctx.fillStyle = '#e6d8a8';
    ctx.font = 'bold 20px serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(this.chapter.chapterTitle, 56, safeTop + 12);

    ctx.fillStyle = '#9aa';
    ctx.font = '12px sans-serif';
    const lines = (this.chapter.chapterIntro || '').split('\n');
    lines.forEach((s, i) => ctx.fillText(s, 56, safeTop + 40 + i * 18));
  }

  drawTile(ctx, t, ty) {
    const unlocked = this.isUnlocked(t.index);
    const prog = this.progress[t.level.levelId];
    const stars = prog ? prog.stars : 0;

    ctx.fillStyle = unlocked ? '#1f1f38' : '#15151f';
    ctx.fillRect(t.x, ty, t.w, t.h);
    ctx.strokeStyle = unlocked ? '#3a3a5a' : '#222';
    ctx.lineWidth = 1;
    ctx.strokeRect(t.x + 0.5, ty + 0.5, t.w - 1, t.h - 1);

    ctx.fillStyle = unlocked ? '#c8b074' : '#555';
    ctx.font = 'bold 26px serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`第${t.index + 1}夜`, t.x + 12, ty + 12);

    ctx.fillStyle = unlocked ? '#e6d8a8' : '#444';
    ctx.font = 'bold 14px sans-serif';
    const subTitle = (t.level.title || '').replace(/^第.+?夜 · /, '');
    ctx.fillText(subTitle, t.x + 12, ty + 50);

    if (!unlocked) {
      ctx.fillStyle = '#444';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('锁', t.x + t.w - 12, ty + 14);
      return;
    }

    const starY = ty + t.h - 24;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < stars ? '#ffd166' : '#3a3a4a';
      this.drawStar(ctx, t.x + 16 + i * 18, starY, 7);
    }

    if (prog && prog.bestTime !== Infinity) {
      ctx.fillStyle = '#9aa';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${prog.bestTime.toFixed(1)}s`, t.x + t.w - 12, starY);
    }
  }

  drawStar(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const rad = i % 2 === 0 ? r : r / 2.3;
      const x = cx + Math.cos(angle) * rad;
      const y = cy + Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
}

module.exports = ChapterScene;
