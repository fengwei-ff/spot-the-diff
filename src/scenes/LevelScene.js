const LevelEngine = require('../game/LevelEngine.js');
const DiffPainter = require('../render/DiffPainter.js');
const ResultScene = require('./ResultScene.js');

const HEADER_BASE = 98;
const FOOTER_H = 80;

// 找到差异后的圈：呼吸闪烁动画时长与脉动次数
const FOUND_ANIM_MS = 1500;
const FOUND_PULSES = 3;
// 激励语（保持 3~5 字），首个固定为「太棒了」
const PRAISES = ['太棒了', '找到啦', '好眼力', '真厉害', '没跑了', '火眼金睛', '就是这', '又一处'];

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

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
    this.foundAnims = {};
    this.flashUntil = 0;
    this.hintTarget = null;
    this.hintUntil = 0;
    this.hintUsed = 0;
    this.hintQuota = 1; // 每关默认 1 次提示，用完需看广告获取
    this.adModal = false;
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

  flashFound(d) {
    this.flashUntil = Date.now() + 200;
    if (!d) return;
    // engine 在回调前已把 id 加入 found，size 即为本次找到的序号（1-based）
    const order = this.engine.found.size;
    const praise = PRAISES[(order - 1) % PRAISES.length];
    this.foundAnims[d.id] = { at: Date.now(), praise };
  }

  flashMiss(x, y) {
    const now = Date.now();
    this.toasts.push({ x, y, at: now, until: now + 700, type: 'miss' });
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
    const { capsule } = this.canvasManager;
    // 广告弹窗打开时，优先处理弹窗交互
    if (this.adModal) {
      this.handleAdTouch(x, y);
      return;
    }
    // 返回按钮：与胶囊对齐的左上角点击区
    if (x < 48 && y >= capsule.top - 6 && y <= capsule.bottom + 10) {
      if (this.onFinish) this.onFinish({ result: 'abort', stars: 0, time: this.engine.elapsed, misses: this.engine.misses, hintUsed: this.hintUsed });
      return;
    }
    const btn = this.hintButtonRect();
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
      if (this.hintQuota > 0) {
        const used = this.engine.useHint();
        if (used) {
          this.hintQuota -= 1;
          this.hintUsed += 1;
        }
      } else {
        // 提示次数用完：弹出广告弹窗（占位）
        this.adModal = true;
      }
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
    const w = 64, h = 64;
    return { x: width / 2 - w / 2, y: height - this.footerH + (this.footerH - h) / 2, w, h };
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
    if (this.adModal) this.renderAdModal(ctx);
  }

  adModalRects() {
    const { width, height } = this.canvasManager;
    const w = Math.min(300, width - 48);
    const h = 190;
    const x = (width - w) / 2;
    const y = (height - h) / 2;
    return {
      box: { x, y, w, h },
      watch: { x: x + 24, y: y + h - 58, w: w - 48, h: 42 },
      close: { x: x + w - 36, y: y + 12, w: 26, h: 26 },
    };
  }

  handleAdTouch(x, y) {
    const { watch, close, box } = this.adModalRects();
    const hit = (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    if (hit(close)) {
      this.adModal = false;
      return;
    }
    if (hit(watch)) {
      // TODO: 接入微信激励视频广告 wx.createRewardedVideoAd，播放完成后再发放
      this.grantHintByAd();
      this.adModal = false;
      return;
    }
    // 点击弹窗外的遮罩关闭
    const inBox = x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
    if (!inBox) this.adModal = false;
  }

  grantHintByAd() {
    // 占位：观看广告后获得 1 次提示机会
    this.hintQuota += 1;
  }

  renderAdModal(ctx) {
    const { width, height } = this.canvasManager;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, width, height);

    const { box, watch, close } = this.adModalRects();
    ctx.fillStyle = '#20203a';
    roundRectPath(ctx, box.x, box.y, box.w, box.h, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,209,102,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 关闭按钮
    ctx.strokeStyle = '#9aa';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(close.x + 7, close.y + 7); ctx.lineTo(close.x + close.w - 7, close.y + close.h - 7);
    ctx.moveTo(close.x + close.w - 7, close.y + 7); ctx.lineTo(close.x + 7, close.y + close.h - 7);
    ctx.stroke();

    // 灯泡图标
    this.drawHintIcon(ctx, box.x + box.w / 2, box.y + 46, 13);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('提示次数已用完', box.x + box.w / 2, box.y + 86);

    ctx.fillStyle = '#aab';
    ctx.font = '13px sans-serif';
    ctx.fillText('观看一段视频，获得 1 次提示机会', box.x + box.w / 2, box.y + 110);

    // 观看按钮
    ctx.fillStyle = '#ffd166';
    roundRectPath(ctx, watch.x, watch.y, watch.w, watch.h, watch.h / 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('观看视频 +1', watch.x + watch.w / 2, watch.y + watch.h / 2);
  }

  renderHeader(ctx) {
    const { width, capsule, capsuleCenterY } = this.canvasManager;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, this.headerH);

    // 返回按钮（与胶囊纵向对齐）
    ctx.strokeStyle = '#e6d8a8';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const bx = 22, by = capsuleCenterY;
    ctx.beginPath();
    ctx.moveTo(bx + 6, by - 8);
    ctx.lineTo(bx - 4, by);
    ctx.lineTo(bx + 6, by + 8);
    ctx.stroke();

    // 标题：在返回键与胶囊之间的导航区内水平居中，纵向与胶囊对齐
    const regionLeft = 52;
    const regionRight = capsule.left - 8;
    const titleCenterX = (regionLeft + regionRight) / 2;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const title = this.truncateText(ctx, this.config.title || '找不同', regionRight - regionLeft - 8);
    ctx.fillText(title, titleCenterX, capsuleCenterY);

    // 标题下方描述（剧情简介）—— 与头部拉开间距
    const descTop = capsule.bottom + 16;
    if (this.config.story) {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#8a8aa6';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(this.truncateText(ctx, this.config.story, width - 32), 16, descTop);
    }

    const found = this.engine.found.size;
    const total = this.config.diffs.length;
    const remaining = Math.max(0, this.engine.allowedMisses - this.engine.misses);
    const t = Math.ceil(this.engine.remainingTime());

    // 第一行：红心(剩余可错次数) + 倒计时 两个胶囊，居中
    const pillsCy = descTop + 34;
    this.drawStatPills(ctx, width, pillsCy, `${remaining}`, this.formatTime(t), t <= 10);

    // 第二行：五角星进度，从左至右排列（找到一处点亮一颗）
    const starR = 9;
    const starGap = starR * 2 + 8;
    const starsCy = pillsCy + 34;
    const startX = 16 + starR;
    for (let i = 0; i < total; i++) {
      const lit = i < found;
      ctx.fillStyle = lit ? '#ffd166' : '#3a3a4a';
      this.drawStar(ctx, startX + i * starGap, starsCy, starR);
      if (lit) {
        ctx.strokeStyle = 'rgba(255,209,102,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }

  drawStatPills(ctx, width, cy, heartText, clockText, danger) {
    const w1 = this.measureStatPill(ctx, heartText);
    const w2 = this.measureStatPill(ctx, clockText);
    const gap = 10;
    let x = (width - (w1 + gap + w2)) / 2;
    this.drawStatPill(ctx, x, cy, w1, 'heart', heartText, '#e8485a');
    x += w1 + gap;
    this.drawStatPill(ctx, x, cy, w2, 'clock', clockText, danger ? '#ef5350' : '#f0a93c');
  }

  measureStatPill(ctx, text) {
    ctx.font = 'bold 14px sans-serif';
    return 26 + ctx.measureText(text).width + 18;
  }

  drawStatPill(ctx, x, cy, w, kind, text, accent) {
    const h = 26;
    const top = cy - h / 2;

    // 胶囊底（奶白）
    ctx.fillStyle = '#f4ecd6';
    roundRectPath(ctx, x, top, w, h, h / 2);
    ctx.fill();

    // 左侧圆形徽标
    const bcx = x + h / 2;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(bcx, cy, h / 2 + 1, 0, Math.PI * 2);
    ctx.fill();
    if (kind === 'heart') this.drawHeart(ctx, bcx, cy, 6, '#fff');
    else this.drawClockGlyph(ctx, bcx, cy, 7, '#fff');

    // 数值文本
    ctx.fillStyle = '#5a3a22';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, (x + h + (x + w)) / 2, cy + 0.5);
  }

  drawClockGlyph(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - r * 0.6);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * 0.5, cy + r * 0.15);
    ctx.stroke();
    ctx.restore();
  }

  drawHeart(ctx, cx, cy, s, color) {
    ctx.save();
    ctx.fillStyle = color || '#ff5a5a';
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.8);
    ctx.bezierCurveTo(cx - s * 1.2, cy - s * 0.4, cx - s * 0.6, cy - s * 1.2, cx, cy - s * 0.45);
    ctx.bezierCurveTo(cx + s * 0.6, cy - s * 1.2, cx + s * 1.2, cy - s * 0.4, cx, cy + s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
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

  truncateText(ctx, text, maxWidth) {
    if (!text) return '';
    if (ctx.measureText(text).width <= maxWidth) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
    return `${s}…`;
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
    const now = Date.now();
    const sxA = aRect.w / imageSize.w;
    const syA = aRect.h / imageSize.h;
    const sxB = bRect.w / imageSize.w;
    const syB = bRect.h / imageSize.h;

    for (const d of found) {
      const ax = aRect.x + d.x * sxA;
      const ay = aRect.y + d.y * syA;
      const bx = bRect.x + d.x * sxB;
      const by = bRect.y + d.y * syB;
      // 圈整体放大：基于差异半径加成，并设下限避免过小
      const baseR = Math.max(d.r * sxA * 1.5, 20);

      const anim = this.foundAnims[d.id];
      const elapsed = anim ? now - anim.at : Infinity;

      this.drawFoundRing(ctx, ax, ay, baseR, elapsed);
      this.drawFoundRing(ctx, bx, by, baseR, elapsed);

      if (anim && elapsed < FOUND_ANIM_MS) {
        this.drawPraise(ctx, ax, ay, baseR, anim.praise, elapsed, aRect);
        this.drawPraise(ctx, bx, by, baseR, anim.praise, elapsed, bRect);
      }
    }
  }

  drawFoundRing(ctx, cx, cy, r, elapsed) {
    // 呼吸闪烁：动画期内圈做数次明暗+缩放脉动，结束后稳定显示大圈
    let scale = 1;
    let alpha = 1;
    let glow = 0;
    if (elapsed < FOUND_ANIM_MS) {
      const t = elapsed / FOUND_ANIM_MS;
      const pulse = 0.5 + 0.5 * Math.sin(t * FOUND_PULSES * Math.PI * 2 - Math.PI / 2);
      scale = 1 + 0.2 * pulse;
      alpha = 0.5 + 0.5 * pulse;
      glow = pulse;
    }
    ctx.save();
    if (glow > 0) {
      ctx.shadowColor = `rgba(74, 222, 128, ${(0.9 * glow).toFixed(2)})`;
      ctx.shadowBlur = 18 * glow;
    }
    ctx.strokeStyle = `rgba(74, 222, 128, ${alpha.toFixed(2)})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawPraise(ctx, cx, cy, r, text, elapsed, bound) {
    const t = elapsed / FOUND_ANIM_MS;
    let alpha = 1;
    if (t < 0.12) alpha = t / 0.12;
    else if (t > 0.7) alpha = Math.max(0, (1 - t) / 0.3);
    if (alpha <= 0) return;

    const pop = t < 0.2 ? 0.8 + 0.2 * (t / 0.2) : 1;
    const fontSize = Math.round(16 * pop);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width;
    const padX = 9;
    const pillW = tw + padX * 2;
    const pillH = 26;

    // 默认放在圈右侧，贴近右边界时翻到左侧
    let tx = cx + r + 8;
    if (tx + pillW > bound.x + bound.w - 4) tx = cx - r - 8 - pillW;
    let ty = cy - pillH / 2 - 4 * t; // 轻微上浮

    ctx.fillStyle = 'rgba(18, 38, 26, 0.85)';
    roundRectPath(ctx, tx, ty, pillW, pillH, 13);
    ctx.fill();
    ctx.strokeStyle = `rgba(74, 222, 128, ${(0.7 * alpha).toFixed(2)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#7CFFA8';
    ctx.textAlign = 'left';
    ctx.fillText(text, tx + padX, ty + pillH / 2 + 1);
    ctx.restore();
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
    const DURATION = 700;
    const RED = '244, 67, 54';
    for (const t of this.toasts) {
      const elapsed = now - (t.at ?? now);
      const p = Math.min(1, Math.max(0, elapsed / DURATION));
      // 入场弹性放大 + 末段整体淡出
      const pop = p < 0.25 ? 0.4 + 0.6 * (p / 0.25) : 1;
      const fade = p > 0.6 ? Math.max(0, (1 - p) / 0.4) : 1;
      const baseR = 16;

      ctx.save();
      ctx.translate(t.x, t.y);

      // 向外扩散的涟漪环
      const rippleR = baseR + p * 22;
      ctx.strokeStyle = `rgba(${RED}, ${(0.5 * (1 - p)).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, rippleR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = fade;
      const r = baseR * pop;

      // 圆形徽标底（半透明红 + 描边）
      ctx.fillStyle = `rgba(${RED}, 0.18)`;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${RED}, 0.95)`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      // 居中的叉号
      const k = r * 0.42;
      ctx.strokeStyle = `rgba(255, 235, 235, 0.98)`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-k, -k); ctx.lineTo(k, k);
      ctx.moveTo(k, -k); ctx.lineTo(-k, k);
      ctx.stroke();

      ctx.restore();
    }
  }

  renderFooter(ctx) {
    const { width, height } = this.canvasManager;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, height - this.footerH, width, this.footerH);

    // 底部居中的「提示」灯泡图标
    const btn = this.hintButtonRect();
    const cx = btn.x + btn.w / 2;
    const iconCy = btn.y + btn.h * 0.4;
    this.drawHintIcon(ctx, cx, iconCy, 12);

    // 提示次数用完时，灯泡右下角显示绿色「+」表示可看广告获取
    if (this.hintQuota <= 0) {
      const bx = cx + 13;
      const by = iconCy + 11;
      ctx.fillStyle = '#3ddc84';
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx - 3.5, by); ctx.lineTo(bx + 3.5, by);
      ctx.moveTo(bx, by - 3.5); ctx.lineTo(bx, by + 3.5);
      ctx.stroke();
    }
  }

  drawHintIcon(ctx, cx, cy, r) {
    ctx.save();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 灯泡玻璃
    ctx.fillStyle = 'rgba(255,209,102,0.16)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 灯丝（V 形）
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.38, cy - r * 0.12);
    ctx.lineTo(cx, cy + r * 0.3);
    ctx.lineTo(cx + r * 0.38, cy - r * 0.12);
    ctx.stroke();

    // 螺口底座
    ctx.lineWidth = 2;
    const bw = r * 0.85;
    const by = cy + r + 1;
    ctx.beginPath();
    ctx.moveTo(cx - bw / 2, by);
    ctx.lineTo(cx + bw / 2, by);
    ctx.moveTo(cx - bw / 2 + 1.5, by + 3.5);
    ctx.lineTo(cx + bw / 2 - 1.5, by + 3.5);
    ctx.stroke();

    // 顶部光芒
    ctx.lineWidth = 1.6;
    const rays = [[0, -1.3], [-0.95, -0.95], [0.95, -0.95], [-1.3, 0], [1.3, 0]];
    for (const [dx, dy] of rays) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * r * 1.3, cy + dy * r * 1.3);
      ctx.lineTo(cx + dx * r * 1.7, cy + dy * r * 1.7);
      ctx.stroke();
    }
    ctx.restore();
  }
}

module.exports = LevelScene;
