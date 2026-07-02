const ScoreEvaluator = require('../game/ScoreEvaluator.js');
const AudioManager = require('../audio/AudioManager.js');
const { drawPageBackground } = require('../render/SceneBackground.js');

class ResultScene {
  constructor({ sceneManager, canvasManager, env, config, result, time, misses, hintUsed, reason, onRetry, onBack, audio }) {
    this.sceneManager = sceneManager;
    this.canvasManager = canvasManager;
    this.env = env;
    this.config = config;
    this.result = result;
    this.time = time;
    this.misses = misses;
    this.hintUsed = hintUsed;
    this.reason = reason;
    this.onRetry = onRetry;
    this.onBack = onBack;
    this.audio = audio || AudioManager.getInstance(env);
    this.stars = result === 'clear'
      ? ScoreEvaluator.evaluate({
        elapsedTime: time,
        missCount: misses,
        hintUsed,
        thresholds: config.starThresholds,
      })
      : 0;
  }

  onEnter() {
    this.audio.playSfx(this.result === 'clear' ? 'clear' : 'fail');
  }

  retryRect() {
    const { width, height } = this.canvasManager;
    return { x: width / 2 - 100, y: height / 2 + 80, w: 200, h: 50 };
  }

  backRect() {
    const { width, height } = this.canvasManager;
    return { x: width / 2 - 100, y: height / 2 + 144, w: 200, h: 44 };
  }

  hit(rect, x, y) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  onTouch({ x, y }) {
    if (this.hit(this.retryRect(), x, y)) {
      this.audio.playSfx('tap');
      if (this.onRetry) this.onRetry();
    } else if (this.hit(this.backRect(), x, y)) {
      this.audio.playSfx('tap');
      if (this.onBack) this.onBack(this.stars);
    }
  }

  render(ctx) {
    const { width, height } = this.canvasManager;
    drawPageBackground(ctx, width, height);
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = this.result === 'clear' ? '#ff8c42' : '#ff6b6b';
    ctx.fillText(this.result === 'clear' ? '案件解读' : '线索中断', width / 2, height / 2 - 130);

    if (this.result === 'clear') {
      const cx = width / 2;
      const cy = height / 2 - 70;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < this.stars ? '#ffd166' : '#c8d4e0';
        this.drawStar(ctx, cx + (i - 1) * 50, cy, 18);
      }
    }

    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#5a6a7a';
    const lines = [
      `用时：${this.time.toFixed(1)}s`,
      `失误：${this.misses}`,
      `提示：${this.hintUsed}`,
    ];
    if (this.result !== 'clear') {
      lines.push(`原因：${this.reason === 'timeout' ? '时间到' : '失误超限'}`);
    }
    lines.forEach((s, i) => ctx.fillText(s, width / 2, height / 2 - 20 + i * 22));

    const r1 = this.retryRect();
    ctx.fillStyle = '#4ecdc4';
    ctx.fillRect(r1.x, r1.y, r1.w, r1.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('再次潜入', r1.x + r1.w / 2, r1.y + r1.h / 2);

    const r2 = this.backRect();
    ctx.strokeStyle = '#90b8d8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(r2.x + 0.5, r2.y + 0.5, r2.w - 1, r2.h - 1);
    ctx.fillStyle = '#2f80c8';
    ctx.font = '15px sans-serif';
    ctx.fillText('返回章节', r2.x + r2.w / 2, r2.y + r2.h / 2);
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

module.exports = ResultScene;
