const { drawNeutralBackground } = require('../render/SceneBackground.js');
const { LOADING_TIP } = require('../config/playRules.js');

class LevelLoadingScene {
  constructor({ canvasManager, subtitle = '' }) {
    this.canvasManager = canvasManager;
    this.subtitle = subtitle;
    this.phase = 0;
  }

  update(dt) {
    this.phase += dt * 0.005;
  }

  render(ctx) {
    const { width, height } = this.canvasManager;
    drawNeutralBackground(ctx, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const r = 18;
    const start = this.phase * Math.PI * 2;

    ctx.strokeStyle = 'rgba(78, 205, 196, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy - 20, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy - 20, r, start, start + Math.PI * 1.2);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5a6a7a';
    ctx.font = '15px sans-serif';
    ctx.fillText('加载下一关…', cx, cy + 24);

    if (this.subtitle) {
      ctx.fillStyle = '#2f4a5f';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(this.subtitle, cx, cy + 50);
    }

    ctx.fillStyle = '#8a9aaa';
    ctx.font = '12px sans-serif';
    ctx.fillText(LOADING_TIP, cx, cy + (this.subtitle ? 78 : 54));
  }
}

module.exports = LevelLoadingScene;
