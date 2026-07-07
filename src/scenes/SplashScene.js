const HomeScene = require('./HomeScene.js');
const ImageLoader = require('../render/ImageLoader.js');
const chapters = require('../../levels/chapters.js');
const AudioManager = require('../audio/AudioManager.js');
const { ensureLevelImages } = require('../core/SubpackageLoader.js');
const { drawPageBackground } = require('../render/SceneBackground.js');

const HEALTH_LINES = [
  '抵制不良游戏，拒绝盗版游戏。',
  '注意自我保护，谨防受骗上当。',
  '适度游戏益脑，沉迷游戏伤身。',
  '合理安排时间，享受健康生活。',
];
const MIN_ADVISORY_MS = 3000;
const BRAND_MS = 800;
const SUBPACKAGE_WEIGHT = 0.15;
const IMAGES_WEIGHT = 0.85;

class SplashScene {
  constructor({ sceneManager, canvasManager, env, progress = {} }) {
    this.sceneManager = sceneManager;
    this.canvasManager = canvasManager;
    this.env = env;
    this.progress = progress;
    this.startedAt = Date.now();
    this.loadProgress = 0;
    this.displayProgress = 0;
    this.loadDone = false;
    this.loadLabel = '准备加载…';
    this.enterReady = false;
    this.pulse = 0;
    this.audio = AudioManager.getInstance(env);
    this._preload();
    this.audio.loadSettings();
  }

  collectPreloadUrls() {
    const urls = new Set();
    for (const ch of chapters) {
      if (!ch.available || !ch.data || !ch.data.levels) continue;
      for (const lv of ch.data.levels) {
        if (lv.imageA) urls.add(lv.imageA);
        if (lv.imageB) urls.add(lv.imageB);
      }
    }
    return [...urls];
  }

  _setProgress(value, label) {
    this.loadProgress = Math.min(1, Math.max(0, value));
    if (label) this.loadLabel = label;
  }

  async _preload() {
    this._setProgress(0.02, '准备加载…');

    try {
      this._setProgress(0.05, '加载资源包…');
      await ensureLevelImages(this.env);
      this._setProgress(SUBPACKAGE_WEIGHT, '资源包就绪');
    } catch (e) {
      console.warn('[SplashScene] 关卡图片分包加载失败:', e);
      this._setProgress(SUBPACKAGE_WEIGHT, '加载资源包…');
    }

    const urls = this.collectPreloadUrls();
    if (!urls.length) {
      this._setProgress(1, '资源加载完成');
      this.loadDone = true;
      this._checkEnterReady();
      return;
    }

    const loader = new ImageLoader(this.env);
    let done = 0;
    for (const url of urls) {
      try {
        await loader.load(url);
      } catch (e) {
        console.warn('[SplashScene] preload failed:', url, e);
      } finally {
        done += 1;
        const ratio = done / urls.length;
        this._setProgress(
          SUBPACKAGE_WEIGHT + IMAGES_WEIGHT * ratio,
          `加载图片 ${done}/${urls.length}`,
        );
      }
    }
    this._setProgress(1, '资源加载完成');
    this.loadDone = true;
    this._checkEnterReady();
  }

  _checkEnterReady() {
    const elapsed = Date.now() - this.startedAt;
    this.enterReady = this.loadDone && elapsed >= MIN_ADVISORY_MS + BRAND_MS;
  }

  update(dt) {
    this.pulse += dt * 0.004;
    const target = this.loadProgress;
    const gap = target - this.displayProgress;
    if (gap > 0) {
      // 缓动逼近真实进度，避免一帧跳满；慢加载时也能跟上
      const step = Math.max(gap * 0.12, 0.004);
      this.displayProgress = Math.min(target, this.displayProgress + step * (dt / 16));
    }
    this._checkEnterReady();
  }

  onTouchEnd() {
    if (!this.enterReady) return;
    this.audio.enterHome();
    this.sceneManager.replace(new HomeScene({
      sceneManager: this.sceneManager,
      canvasManager: this.canvasManager,
      env: this.env,
      progress: this.progress,
      audio: this.audio,
    }));
  }

  render(ctx) {
    const { width, height } = this.canvasManager;
    const elapsed = Date.now() - this.startedAt;
    const showAdvisory = elapsed >= BRAND_MS;

    this._drawBackground(ctx, width, height);
    this._drawBackdropDecor(ctx, width, height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 品牌标题
    const titleAlpha = showAdvisory ? 0.7 : 1;
    ctx.save();
    ctx.globalAlpha = titleAlpha;
    ctx.font = 'bold 30px sans-serif';
    ctx.shadowColor = 'rgba(47,128,200,0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    const titleGrad = ctx.createLinearGradient(0, height * 0.22, 0, height * 0.28);
    titleGrad.addColorStop(0, '#ff8c42');
    titleGrad.addColorStop(0.5, '#ff6b6b');
    titleGrad.addColorStop(1, '#ee5a6f');
    ctx.fillStyle = titleGrad;
    ctx.fillText('剧迷找不同', width / 2, height * 0.25);
    ctx.shadowColor = 'transparent';
    ctx.restore();

    // 品牌阶段也显示加载进度
    if (!showAdvisory) {
      this._drawLoadBar(ctx, width / 2, height * 0.38, width - 80, 8);
      return;
    }

    if (showAdvisory) {
      const boxW = width - 48;
      const boxX = 24;
      const boxY = height * 0.34;
      const lineH = 26;
      const boxH = HEALTH_LINES.length * lineH + 36;

      ctx.save();
      ctx.shadowColor = 'rgba(47,128,200,0.18)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.strokeStyle = 'rgba(90,170,230,0.45)';
      ctx.lineWidth = 1.5;
      this._roundRect(ctx, boxX, boxY, boxW, boxH, 14);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = '#2f80c8';
      ctx.fillText('健康游戏忠告', width / 2, boxY + 22);

      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#5a6a7a';
      HEALTH_LINES.forEach((line, i) => {
        ctx.fillText(line, width / 2, boxY + 48 + i * lineH);
      });

      // 加载进度
      this._drawLoadBar(ctx, width / 2, boxY + boxH + 36, boxW - 40, 8);

      if (this.enterReady) {
        const alpha = 0.65 + 0.35 * (0.5 + 0.5 * Math.sin(this.pulse * 6));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold 17px sans-serif';
        ctx.fillText('点击进入游戏', width / 2, height * 0.82);
        ctx.restore();
      } else {
        ctx.fillStyle = '#8a9aaa';
        ctx.font = '13px sans-serif';
        ctx.fillText('请稍候…', width / 2, height * 0.82);
      }
    }
  }

  _drawLoadBar(ctx, centerX, barY, barW, barH) {
    const barX = centerX - barW / 2;
    const progress = this.displayProgress;
    this._roundRect(ctx, barX, barY, barW, barH, 4);
    ctx.fillStyle = 'rgba(90,170,230,0.2)';
    ctx.fill();
    if (progress > 0) {
      this._roundRect(ctx, barX, barY, Math.max(barH, barW * progress), barH, 4);
      ctx.fillStyle = '#4ecdc4';
      ctx.fill();
    }

    ctx.fillStyle = '#7a8a9a';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const pct = Math.round(progress * 100);
    const text = this.loadDone && progress >= 0.99
      ? '资源加载完成'
      : `${this.loadLabel} ${pct}%`;
    ctx.fillText(text, centerX, barY + barH + 10);
  }

  _drawBackground(ctx, width, height) {
    drawPageBackground(ctx, width, height, { decor: 'full', phase: this.pulse });
  }

  _drawBackdropDecor(ctx, width, height) {
    ctx.save();
    const frameW = 72;
    const frameH = 54;
    const frameY = height * 0.62;
    const frameGap = 16;
    const frameX = (width - frameW * 2 - frameGap) / 2;
    for (let i = 0; i < 2; i++) {
      const fx = frameX + i * (frameW + frameGap);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      this._roundRect(ctx, fx, frameY, frameW, frameH, 8);
      ctx.fill();
      ctx.strokeStyle = i === 1 ? '#4ecdc4' : '#ff6b6b';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(90,170,230,0.15)';
      ctx.fillRect(fx + 10, frameY + 12, frameW - 20, frameH - 24);
      if (i === 1) {
        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.arc(fx + frameW * 0.65, frameY + frameH * 0.45, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 放大镜
    const mgX = frameX + frameW * 2 + frameGap + 8;
    const mgY = frameY + frameH * 0.5;
    ctx.strokeStyle = 'rgba(255,140,66,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(mgX, mgY - 6, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mgX + 10, mgY + 4);
    ctx.lineTo(mgX + 22, mgY + 16);
    ctx.stroke();

    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}

module.exports = SplashScene;
