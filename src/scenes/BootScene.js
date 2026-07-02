const SplashScene = require('./SplashScene.js');
const { drawPageBackground } = require('../render/SceneBackground.js');

class BootScene {
  constructor({ sceneManager, canvasManager, env }) {
    this.sceneManager = sceneManager;
    this.canvasManager = canvasManager;
    this.env = env;
    this.status = '准备中...';
    this.error = null;
    setTimeout(() => this.start(), 60);
  }

  start() {
    try {
      this.sceneManager.replace(new SplashScene({
        sceneManager: this.sceneManager,
        canvasManager: this.canvasManager,
        env: this.env,
        progress: {},
      }));
    } catch (e) {
      this.error = (e && e.message) ? e.message : String(e);
      this.status = '出错：' + this.error;
      console.error(e);
    }
  }

  render(ctx) {
    const { width, height } = this.canvasManager;
    drawPageBackground(ctx, width, height);
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('剧迷找不同', width / 2, height / 2 - 20);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = this.error ? '#ff6b6b' : '#7a8a9a';
    ctx.fillText(this.status, width / 2, height / 2 + 14);
  }
}

module.exports = BootScene;
