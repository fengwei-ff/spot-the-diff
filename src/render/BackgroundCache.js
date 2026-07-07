const { BG_ANIM_INTERVAL } = require('../config/gameConfig.js');
const { drawPageBackground } = require('./SceneBackground.js');

// 首页/章节页渐变背景缓存：避免每帧重建渐变与气泡
class BackgroundCache {
  constructor(env, width, height, dpr = 1) {
    this.env = env;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.phase = -1;
    this.frameCounter = 0;
    this.cache = null;
  }

  _ensureCanvas() {
    const pw = Math.round(this.width * this.dpr);
    const ph = Math.round(this.height * this.dpr);
    if (this.cache && this.cache.width === pw && this.cache.height === ph) {
      return this.cache;
    }
    const off = this.env.createOffscreenCanvas(pw, ph);
    off.width = pw;
    off.height = ph;
    this.cache = off;
    this.phase = -1;
    return off;
  }

  /** 返回缓存 canvas；phase 变化或降频帧到达时才重绘 */
  get(width, height, phase, dpr = this.dpr) {
    if (width !== this.width || height !== this.height || dpr !== this.dpr) {
      this.width = width;
      this.height = height;
      this.dpr = dpr;
      this.cache = null;
      this.phase = -1;
    }

    this.frameCounter += 1;
    const phaseChanged = phase !== this.phase;
    const shouldRedraw = phaseChanged || (this.frameCounter % BG_ANIM_INTERVAL === 0);

    if (!shouldRedraw && this.cache) return this.cache;

    const off = this._ensureCanvas();
    const octx = off.getContext('2d');
    octx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawPageBackground(octx, width, height, { phase });
    this.phase = phase;
    return off;
  }
}

module.exports = BackgroundCache;
