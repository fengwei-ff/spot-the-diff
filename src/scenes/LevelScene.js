const LevelEngine = require('../game/LevelEngine.js');
const DiffPainter = require('../render/DiffPainter.js');
const ResultScene = require('./ResultScene.js');

const HEADER_BASE = 70;
const FOOTER_H = 80;

class LevelScene {
  constructor({ sceneManager, canvasManager, env, levelConfig, imageA, imageAForB, imageB, onFinish }) {
    this.sceneManager = sceneManager;
    this.canvasManager = canvasManager;
    this.env = env;
    this.config = levelConfig;
    this.imageA = imageA;
    this.imageAForB = imageAForB;
    this.imageB = imageB;
    this.onFinish = onFinish;
    this.toasts = [];
    this.flashUntil = 0;
    this.hintTarget = null;
    this.hintUntil = 0;
    this.hintUsed = 0;
    this.debugTaps = [];
    this.coordToast = null;

    const { width, height, safeTop, safeBottom } = canvasManager;
    this.headerH = safeTop + HEADER_BASE;
    this.footerH = FOOTER_H + safeBottom;
    const viewport = { x: 0, y: this.headerH, w: width, h: height - this.headerH - this.footerH };

    this.engine = new LevelEngine({
      levelConfig,
      imageA,
      imageB,
      viewport,
      hooks: {
        onDiffFound: (d) => this.flashFound(d),
        onMiss: ({ x, y }) => this.flashMiss(x, y),
        onClear: ({ time, misses }) => this.finish('clear', time, misses),
        onFail: ({ reason, time, misses }) => this.finish('fail', time, misses, reason),
        onHint: (d) => this.showHint(d),
      },
    });
    this.engine.start();
  }

  finish(result, time, misses, reason) {
    setTimeout(() => {
      this.sceneManager.push(new ResultScene({
        sceneManager: this.sceneManager,
        canvasManager: this.canvasManager,
        env: this.env,
        config: this.config,
        result,
        time,
        misses,
        hintUsed: this.hintUsed,
        reason,
        onRetry: () => this.restart(),
        onBack: (stars) => {
          if (this.onFinish) this.onFinish({ result, stars, time, misses, hintUsed: this.hintUsed });
        },
      }));
    }, 600);
  }

  restart() {
    // 弹掉当前 Result 与本 Level，重新入栈一个新 Level
    const sm = this.sceneManager;
    while (sm.current && sm.current !== this) sm.pop();
    sm.pop(); // 弹掉自身
    sm.push(new LevelScene({
      sceneManager: sm,
      canvasManager: this.canvasManager,
      env: this.env,
      levelConfig: this.config,
      imageA: this.imageA,
      imageAForB: this.imageAForB,
      imageB: this.imageB,
      onFinish: this.onFinish,
    }));
  }

  flashFound() {
    this.flashUntil = Date.now() + 200;
  }

  flashMiss(x, y) {
    this.toasts.push({ x, y, until: Date.now() + 600, type: 'miss' });
  }

  showHint(d) {
    this.hintTarget = d;
    this.hintUntil = Date.now() + 2000;
  }

  update(dt) {
    this.engine.update(dt);
    const now = Date.now();
    this.toasts = this.toasts.filter((t) => t.until > now);
    this.debugTaps = this.debugTaps.filter((t) => t.until > now);
    if (this.coordToast && this.coordToast.until <= now) this.coordToast = null;
  }

  onTouch({ x, y }) {
    const { safeTop } = this.canvasManager;
    // 返回按钮：左上 44x44
    if (x < 44 && y >= safeTop && y < safeTop + 64) {
      if (this.onFinish) this.onFinish({ result: 'abort', stars: 0, time: this.engine.elapsed, misses: this.engine.misses, hintUsed: this.hintUsed });
      return;
    }
    const btn = this.hintButtonRect();
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
      const used = this.engine.useHint();
      if (used) this.hintUsed += 1;
      return;
    }
    if (this.config.debugCoords) {
      const { onImage, localX, localY } = this.engine.hitTester.toLocal(x, y);
      if (onImage) {
        const ix = Math.round(localX);
        const iy = Math.round(localY);
        const snippet = `{ id: 'd?', x: ${ix}, y: ${iy}, r: 20, hitR: 36, desc: '' }`;
        console.log('[diff坐标]', onImage, snippet);
        this.debugTaps.push({ x, y, ix, iy, onImage, until: Date.now() + 3000 });
        this.coordToast = { text: `${onImage}图: x=${ix}, y=${iy}`, until: Date.now() + 2500 };
        return;
      }
    }
    this.engine.onTouch(x, y);
  }

  hintButtonRect() {
    const { width, height } = this.canvasManager;
    const w = 120, h = 48;
    return { x: width - w - 16, y: height - this.footerH + (this.footerH - h) / 2, w, h };
  }

  render(ctx) {
    const { width, height } = this.canvasManager;
    ctx.fillStyle = '#0f0f1f';
    ctx.fillRect(0, 0, width, height);

    this.renderHeader(ctx);
    this.renderImages(ctx);
    this.renderFoundMarks(ctx);
    this.renderDebugOverlay(ctx);
    this.renderHint(ctx);
    this.renderToasts(ctx);
    this.renderFooter(ctx);
  }

  renderHeader(ctx) {
    const { width, safeTop } = this.canvasManager;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, this.headerH);
    // 返回按钮
    ctx.strokeStyle = '#e6d8a8';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const bx = 22, by = safeTop + 32;
    ctx.beginPath();
    ctx.moveTo(bx + 6, by - 8);
    ctx.lineTo(bx - 4, by);
    ctx.lineTo(bx + 6, by + 8);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.config.title || '找不同', 48, safeTop + 22);

    const found = this.engine.found.size;
    const total = this.config.diffs.length;
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#9ad';
    ctx.fillText(`已找到 ${found}/${total}  失误 ${this.engine.misses}/${this.config.maxMisses || 3}`,
      48, safeTop + 48);

    const t = Math.ceil(this.engine.remainingTime());
    ctx.textAlign = 'right';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = t <= 10 ? '#ff5a5a' : '#ffd166';
    ctx.fillText(`${t}s`, width - 16, safeTop + 36);
  }

  drawLevelImage(ctx, image, rect) {
    if (!image) return;
    const sw = image.width || rect.w;
    const sh = image.height || rect.h;
    ctx.drawImage(image, 0, 0, sw, sh, rect.x, rect.y, rect.w, rect.h);
  }

  renderImages(ctx) {
    const { aRect, bRect, imageSize } = this.engine.layout;
    const { w, h } = imageSize;
    this.drawLevelImage(ctx, this.imageA, aRect);
    if (this.imageB) {
      this.drawLevelImage(ctx, this.imageB, bRect);
    } else if (this.imageAForB) {
      ctx.drawImage(this.imageAForB, bRect.x, bRect.y, bRect.w, bRect.h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(bRect.x, bRect.y, bRect.w, bRect.h);
      ctx.clip();
      ctx.translate(bRect.x, bRect.y);
      ctx.scale(bRect.w / w, bRect.h / h);
      ctx.globalCompositeOperation = 'source-over';
      DiffPainter.applyDiffs(ctx, this.imageAForB, this.config.diffs);
      ctx.restore();
    } else {
      DiffPainter.renderBPanel(ctx, this.imageA, aRect, bRect, imageSize, this.config.diffs);
    }
    // 边框
    ctx.strokeStyle = '#2a2a44';
    ctx.lineWidth = 2;
    ctx.strokeRect(aRect.x, aRect.y, aRect.w, aRect.h);
    ctx.strokeRect(bRect.x, bRect.y, bRect.w, bRect.h);
  }

  renderDebugOverlay(ctx) {
    if (!this.config.debugCoords) return;
    const { aRect, bRect, imageSize } = this.engine.layout;
    const sxA = aRect.w / imageSize.w;
    const syA = aRect.h / imageSize.h;
    const sxB = bRect.w / imageSize.w;
    const syB = bRect.h / imageSize.h;

    ctx.lineWidth = 2;
    for (const d of this.config.diffs) {
      const hitR = d.hitR ?? d.r;
      const ax = aRect.x + d.x * sxA;
      const ay = aRect.y + d.y * syA;
      const bx = bRect.x + d.x * sxB;
      const by = bRect.y + d.y * syB;
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.9)';
      ctx.beginPath(); ctx.arc(ax, ay, hitR * sxA, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx, by, hitR * sxB, 0, Math.PI * 2); ctx.stroke();
    }

    const now = Date.now();
    for (const tap of this.debugTaps) {
      const alpha = Math.min(1, (tap.until - now) / 1000);
      ctx.strokeStyle = `rgba(96, 165, 250, ${alpha.toFixed(2)})`;
      ctx.fillStyle = `rgba(96, 165, 250, ${(alpha * 0.35).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tap.x, tap.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (this.coordToast) {
      const { width, height } = this.canvasManager;
      const text = this.coordToast.text;
      ctx.font = 'bold 14px monospace';
      const tw = ctx.measureText(text).width + 20;
      const th = 32;
      const tx = width / 2 - tw / 2;
      const ty = height - this.footerH - th - 8;
      ctx.fillStyle = 'rgba(20, 20, 40, 0.92)';
      ctx.fillRect(tx, ty, tw, th);
      ctx.strokeStyle = '#60a5fa';
      ctx.strokeRect(tx + 0.5, ty + 0.5, tw - 1, th - 1);
      ctx.fillStyle = '#e0f2fe';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, width / 2, ty + th / 2);
    }
  }

  renderFoundMarks(ctx) {
    const found = this.engine.getFoundDiffs();
    if (!found.length) return;
    const { aRect, bRect, imageSize } = this.engine.layout;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#4ade80';
    for (const d of found) {
      const sxA = aRect.w / imageSize.w;
      const syA = aRect.h / imageSize.h;
      const ax = aRect.x + d.x * sxA;
      const ay = aRect.y + d.y * syA;
      const bx = bRect.x + d.x * (bRect.w / imageSize.w);
      const by = bRect.y + d.y * (bRect.h / imageSize.h);
      const r = d.r * sxA;
      ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.stroke();
    }
  }

  renderHint(ctx) {
    if (!this.hintTarget || Date.now() > this.hintUntil) return;
    const phase = (Date.now() % 600) / 600;
    const alpha = 0.4 + 0.6 * Math.abs(0.5 - phase) * 2;
    const { aRect, bRect, imageSize } = this.engine.layout;
    const d = this.hintTarget;
    const sx = aRect.w / imageSize.w;
    const r = d.r * sx * 1.8;
    ctx.strokeStyle = `rgba(255, 209, 102, ${alpha.toFixed(2)})`;
    ctx.lineWidth = 4;
    const ax = aRect.x + d.x * sx;
    const ay = aRect.y + d.y * (aRect.h / imageSize.h);
    const bx = bRect.x + d.x * (bRect.w / imageSize.w);
    const by = bRect.y + d.y * (bRect.h / imageSize.h);
    ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.stroke();
  }

  renderToasts(ctx) {
    const now = Date.now();
    for (const t of this.toasts) {
      const left = (t.until - now) / 600;
      ctx.strokeStyle = `rgba(255, 90, 90, ${left.toFixed(2)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(t.x - 12, t.y - 12); ctx.lineTo(t.x + 12, t.y + 12);
      ctx.moveTo(t.x + 12, t.y - 12); ctx.lineTo(t.x - 12, t.y + 12);
      ctx.stroke();
    }
  }

  renderFooter(ctx) {
    const { width, height } = this.canvasManager;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, height - this.footerH, width, this.footerH);

    const btn = this.hintButtonRect();
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`提示 (${this.hintUsed})`, btn.x + btn.w / 2, btn.y + btn.h / 2);

    ctx.fillStyle = '#aaa';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.config.debugCoords ? '调试：点图取坐标' : '点击两图中差异处', 16, height - this.footerH / 2);
  }
}

module.exports = LevelScene;
