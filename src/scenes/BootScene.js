const HomeScene = require('./HomeScene.js');

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
      this.sceneManager.replace(new HomeScene({
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
    ctx.fillStyle = '#0b0b16';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#e6d8a8';
    ctx.font = 'bold 22px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('剧迷找不同', width / 2, height / 2 - 20);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = this.error ? '#ff6b6b' : '#9aa';
    ctx.fillText(this.status, width / 2, height / 2 + 14);
  }
}

module.exports = BootScene;
