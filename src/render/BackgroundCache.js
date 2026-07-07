const { BG_ANIM_INTERVAL } = require('../config/gameConfig.js');
const { drawPageBackground } = require('./SceneBackground.js');

// 首页/章节页渐变背景缓存：避免每帧重建渐变与气泡
class BackgroundCache {
  constructor(env, width, height) {
    this.env = env;
    this.width = width;
    this.height = height;
    this.phase = -1;
    this.frameCounter = 0;
    this.cache = null;
  }

  _ensureCanvas() {
    if (this.cache && this.cache.width === this.width && this.cache.height === this.height) {
      return this.cache;
    }
    const off = this.env.createOffscreenCanvas(this.width, this.height);
    off.width = this.width;
    off.height = this.height;
    this.cache = off;
    this.phase = -1;
    return off;
  }

  /** 返回缓存 canvas；phase 变化或降频帧到达时才重绘 */
  get(ctx, width, height, phase) {
    if (width !== this.width || height !== this.height) {
      this.width = width;
      this.height = height;
      this.cache = null;
      this.phase = -1;
    }

    this.frameCounter += 1;
    const phaseChanged = phase !== this.phase;
    const shouldRedraw = phaseChanged || (this.frameCounter % BG_ANIM_INTERVAL === 0);

    if (!shouldRedraw && this.cache) return this.cache;

    const off = this._ensureCanvas();
    const octx = off.getContext('2d');
    drawPageBackground(octx, width, height, { phase });
    this.phase = phase;
    return off;
  }
}

module.exports = BackgroundCache;
