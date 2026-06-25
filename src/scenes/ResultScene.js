const ScoreEvaluator = require('../game/ScoreEvaluator.js');

class ResultScene {
  constructor({ sceneManager, canvasManager, env, config, result, time, misses, hintUsed, reason, onRetry, onBack }) {
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
    this.stars = result === 'clear'
      ? ScoreEvaluator.evaluate({
        elapsedTime: time,
        missCount: misses,
        hintUsed,
        thresholds: config.starThresholds,
      })
      : 0;
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
      if (this.onRetry) this.onRetry();
    } else if (this.hit(this.backRect(), x, y)) {
      if (this.onBack) this.onBack(this.stars);
    }
  }

  render(ctx) {
    const { width, height } = this.canvasManager;
    ctx.fillStyle = 'rgba(11,11,22,0.96)';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 30px serif';
    ctx.fillStyle = this.result === 'clear' ? '#e6d8a8' : '#ff6b6b';
    ctx.fillText(this.result === 'clear' ? '案件解读' : '线索中断', width / 2, height / 2 - 130);

    if (this.result === 'clear') {
      const cx = width / 2;
      const cy = height / 2 - 70;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < this.stars ? '#ffd166' : '#3a3a4a';
        this.drawStar(ctx, cx + (i - 1) * 50, cy, 18);
      }
    }

    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#ccd';
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
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(r1.x, r1.y, r1.w, r1.h);
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('再次潜入', r1.x + r1.w / 2, r1.y + r1.h / 2);

    const r2 = this.backRect();
    ctx.strokeStyle = '#9aa';
    ctx.lineWidth = 1;
    ctx.strokeRect(r2.x + 0.5, r2.y + 0.5, r2.w - 1, r2.h - 1);
    ctx.fillStyle = '#cdd';
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
