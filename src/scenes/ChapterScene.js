const ArchivePainter = require('../render/ArchivePainter.js');
const ImageLoader = require('../render/ImageLoader.js');
const DiffPainter = require('../render/DiffPainter.js');
const ScrollController = require('../core/ScrollController.js');
const { BODY_FONT_SIZE, BODY_LINE_HEIGHT, wrapText, drawBodyLines, getLevelSubtitle } = require('../render/TextHelper.js');
const LevelScene = require('./LevelScene.js');
const LevelLoadingScene = require('./LevelLoadingScene.js');
const AudioManager = require('../audio/AudioManager.js');
const { drawHeaderBand } = require('../render/SceneBackground.js');
const BackgroundCache = require('../render/BackgroundCache.js');
const { ensureLevelImages } = require('../core/SubpackageLoader.js');
const { LEVEL_LOCK_ENABLED } = require('../config/gameConfig.js');
const ProgressStore = require('../core/ProgressStore.js');

const TILE_PADDING = 12;
const FOOTER_GAP = 24;

class ChapterScene {
  constructor({ sceneManager, canvasManager, env, progress = {}, chapter, audio }) {
    this.sceneManager = sceneManager;
    this.canvasManager = canvasManager;
    this.env = env;
    this.chapter = chapter;
    this.progress = progress;
    this.audio = audio || AudioManager.getInstance(env);
    this.scroll = new ScrollController();
    this._tapX = null;
    this._tapY = null;
    this.bgPhase = 0;
    this.bgCache = new BackgroundCache(env, canvasManager.width, canvasManager.height, canvasManager.dpr);
    this.toast = null;
    this.toastUntil = 0;
    this.initLayout();
  }

  initLayout() {
    const { width, height, safeBottom, capsule, ctx } = this.canvasManager;
    this.introFontSize = BODY_FONT_SIZE;
    this.introLineH = BODY_LINE_HEIGHT;
    const maxW = width - TILE_PADDING * 2;
    this.introLines = wrapText(ctx, (this.chapter.chapterIntro || ''), maxW, this.introFontSize);
    this.introTop = capsule.bottom + 12;
    this.headerH = this.introTop + this.introLines.length * this.introLineH + 14;
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
    const h = 36;
    return { x: 8, y: this.canvasManager.capsuleCenterY - h / 2, w: 44, h };
  }

  isUnlocked(index) {
    if (!LEVEL_LOCK_ENABLED) return true;
    if (index <= 0) return true;
    const prev = this.chapter.levels[index - 1];
    if (!prev) return false;
    const prog = this.progress[prev.levelId];
    return !!(prog && prog.stars > 0);
  }

  async _loadLevelAssets(level) {
    try {
      await ensureLevelImages(this.env);
    } catch (e) {
      console.warn('[ChapterScene] 关卡图片分包加载失败:', e);
    }

    const imageSize = level.imageSize || this.chapter.imageSize;
    let imageA;
    let imageAForB = null;
    let imageB = null;
    if (level.imageA && typeof level.imageA === 'string') {
      const loader = this.imageLoader || (this.imageLoader = new ImageLoader(this.env));
      imageA = await loader.load(level.imageA);
      if (level.imageB && typeof level.imageB === 'string') {
        imageB = await loader.loadFresh(level.imageB);
      } else if (level.diffs && level.diffs.length > 0) {
        const bBasePath = level.imageBBase || level.imageA;
        const baseForB = await loader.loadFresh(bBasePath);
        imageB = await DiffPainter.paintB(this.env, baseForB, imageSize, level.diffs);
      }
    } else {
      imageA = ArchivePainter.paint(this.env, level.painterId, imageSize, level.index || 1);
      if (level.diffs && level.diffs.length > 0) {
        imageB = await DiffPainter.paintB(this.env, imageA, imageSize, level.diffs);
      }
    }
    if (this.env.toDrawable && imageA && typeof imageA.getContext === 'function') {
      imageA = await this.env.toDrawable(imageA);
    }
    if (this.env.toDrawable && imageB && typeof imageB.getContext === 'function') {
      imageB = await this.env.toDrawable(imageB);
    }
    return { imageA, imageAForB, imageB, imageSize };
  }

  _buildLevelConfig(level, imageSize) {
    return {
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
  }

  _createLevelScene(level, levelIndex, assets) {
    const { imageA, imageAForB, imageB, imageSize } = assets;
    const levelData = { ...level, index: levelIndex };
    return new LevelScene({
      sceneManager: this.sceneManager,
      canvasManager: this.canvasManager,
      env: this.env,
      levelConfig: this._buildLevelConfig(levelData, imageSize),
      imageA,
      imageAForB,
      imageB,
      audio: this.audio,
      levelIndex,
      hasNextLevel: levelIndex + 1 < this.chapter.levels.length,
      onFinish: (result) => {
        this.onLevelFinish(levelData, result);
        while (this.sceneManager.current !== this) this.sceneManager.pop();
      },
      onContinue: (result) => {
        this.onLevelFinish(levelData, result);
        const nextIndex = levelIndex + 1;
        if (nextIndex < this.chapter.levels.length) {
          this.transitionToLevel(this.chapter.levels[nextIndex], nextIndex);
        }
      },
    });
  }

  _pushLevelScene(level, levelIndex, assets) {
    this.sceneManager.push(this._createLevelScene(level, levelIndex, assets));
    this._preloadNextLevel(levelIndex + 1);
  }

  _preloadNextLevel(nextIndex) {
    if (nextIndex >= this.chapter.levels.length) return;
    const next = { ...this.chapter.levels[nextIndex], index: nextIndex };
    this._loadLevelAssets(next).catch((e) => {
      console.warn('[ChapterScene] preload next level failed:', e);
    });
  }

  async transitionToLevel(level, levelIndex) {
    const loading = new LevelLoadingScene({
      canvasManager: this.canvasManager,
      subtitle: getLevelSubtitle(level.title) || '',
    });
    this.sceneManager.replaceTop(loading);
    try {
      const assets = await this._loadLevelAssets({ ...level, index: levelIndex });
      this.sceneManager.replaceTop(this._createLevelScene(level, levelIndex, assets));
      this._preloadNextLevel(levelIndex + 1);
    } catch (e) {
      console.warn('[ChapterScene] transitionToLevel failed:', e);
      while (this.sceneManager.current !== this) this.sceneManager.pop();
      this.toast = '加载失败，请重试';
      this.toastUntil = Date.now() + 2000;
    }
  }

  async startLevel(level) {
    const levelIndex = level.index ?? this.chapter.levels.findIndex((lv) => lv.levelId === level.levelId);
    const loading = new LevelLoadingScene({
      canvasManager: this.canvasManager,
      subtitle: getLevelSubtitle(level.title) || '',
    });
    this.sceneManager.push(loading);
    try {
      const assets = await this._loadLevelAssets({ ...level, index: levelIndex });
      this.sceneManager.pop();
      this._pushLevelScene({ ...level, index: levelIndex }, levelIndex, assets);
    } catch (e) {
      console.warn('[ChapterScene] startLevel failed:', e);
      if (this.sceneManager.current === loading) this.sceneManager.pop();
      this.toast = '加载失败，请重试';
      this.toastUntil = Date.now() + 2000;
    }
  }

  onLevelFinish(level, result) {
    if (result.stars > 0) {
      const cur = this.progress[level.levelId] || { stars: 0, bestTime: Infinity };
      this.progress[level.levelId] = {
        stars: Math.max(cur.stars, result.stars),
        bestTime: Math.min(cur.bestTime, result.time || Infinity),
      };
      ProgressStore.getInstance().save(this.env).catch((e) => {
        console.warn('[ChapterScene] save progress failed:', e);
      });
    }
  }

  hit(rect, x, y) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  truncateNavTitle(ctx, text, maxWidth) {
    if (!text) return '';
    if (ctx.measureText(text).width <= maxWidth) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
    return s + '…';
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
      this.audio.playSfx('tap');
      this.sceneManager.pop();
      return;
    }
    if (!wasDragging || !isTap) return;
    if (y < this.headerH) return;
    const localY = y - this.headerH + this.scroll.scrollY;
    for (const t of this.tiles) {
      if (x >= t.x && x <= t.x + t.w && localY >= t.y && localY <= t.y + t.h) {
        if (!this.isUnlocked(t.index)) {
          this.audio.playSfx('tap');
          this.toast = '请先通关上一关';
          this.toastUntil = Date.now() + 1200;
          return;
        }
        this.audio.playSfx('tap');
        this.startLevel({ ...t.level, index: t.index });
        return;
      }
    }
  }

  update(dt) {
    this.bgPhase += dt * 0.004;
    this.scroll.update(dt);
  }

  render(ctx) {
    const { width, height, capsuleCenterY, navTitleCenterX } = this.canvasManager;
    const bg = this.bgCache.get(width, height, this.bgPhase, this.canvasManager.dpr);
    ctx.drawImage(bg, 0, 0, width, height);

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
    drawHeaderBand(ctx, 0, 0, width, this.headerH);

    const br = this.backRect();
    ctx.strokeStyle = '#4a90c8';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const acx = br.x + br.w / 2 - 4;
    const acy = br.y + br.h / 2;
    ctx.moveTo(acx + 6, acy - 8);
    ctx.lineTo(acx - 4, acy);
    ctx.lineTo(acx + 6, acy + 8);
    ctx.stroke();

    const nav = this.canvasManager.getNavTitleLayout();
    ctx.fillStyle = '#2f80c8';
    ctx.font = 'bold 20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const chapterTitle = this.truncateNavTitle(ctx, this.chapter.chapterTitle, nav.maxWidth);
    ctx.fillText(chapterTitle, navTitleCenterX, capsuleCenterY);

    drawBodyLines(ctx, this.introLines, TILE_PADDING, this.introTop, {
      fontSize: this.introFontSize,
      lineHeight: this.introLineH,
    });

    if (this.toast && Date.now() < this.toastUntil) this.drawToast(ctx, this.toast);
  }

  drawToast(ctx, text) {
    const { width, height } = this.canvasManager;
    const w = 180;
    const h = 44;
    const x = width / 2 - w / 2;
    const y = height / 2 - h / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = 'rgba(90,170,230,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#5a6a7a';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
  }

  drawTile(ctx, t, ty) {
    const unlocked = this.isUnlocked(t.index);
    const prog = this.progress[t.level.levelId];

    ctx.fillStyle = unlocked ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.55)';
    ctx.fillRect(t.x, ty, t.w, t.h);
    ctx.strokeStyle = unlocked ? 'rgba(90,170,230,0.45)' : 'rgba(180,190,200,0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(t.x + 0.5, ty + 0.5, t.w - 1, t.h - 1);

    ctx.fillStyle = unlocked ? '#ff8c42' : '#a0a8b0';
    ctx.font = 'bold 26px serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`第${t.index + 1}关`, t.x + 12, ty + 12);

    ctx.fillStyle = unlocked ? '#2f4a5f' : '#8a949e';
    ctx.font = 'bold 14px sans-serif';
    const subTitle = getLevelSubtitle(t.level.title);
    ctx.fillText(subTitle, t.x + 12, ty + 50);

    if (!unlocked) {
      ctx.fillStyle = '#444';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('锁', t.x + t.w - 12, ty + 14);
      return;
    }

    if (prog && prog.bestTime !== Infinity) {
      ctx.fillStyle = '#7a8a9a';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${prog.bestTime.toFixed(1)}s`, t.x + t.w - 12, ty + t.h - 10);
    }
  }
}

module.exports = ChapterScene;
