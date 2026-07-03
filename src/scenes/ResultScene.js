const ScoreEvaluator = require('../game/ScoreEvaluator.js');
const AudioManager = require('../audio/AudioManager.js');
const { drawPageBackground } = require('../render/SceneBackground.js');

class ResultScene {
  constructor({
    sceneManager, canvasManager, env, config, result, time, misses, hintUsed, reason,
    onRetry, onBack, onContinue, audio, hasNextLevel = false,
  }) {
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
    this.onContinue = onContinue;
    this.hasNextLevel = hasNextLevel;
    this.audio = audio || AudioManager.getInstance(env);
    this.stars = result === 'clear'
      ? ScoreEvaluator.evaluate({
        elapsedTime: time,
        missCount: misses,
        hintUsed,
        thresholds: config.starThresholds,
      })
      : 0;
    this.encouragement = this.buildEncouragement();
  }

  buildEncouragement() {
    if (this.result === 'clear') {
      if (this.stars >= 3) return '恭喜闯关成功！';
      if (this.stars >= 2) return '闯关成功，干得漂亮！';
      return '闯关成功，下次争取更快！';
    }
    if (this.reason === 'timeout') return '时间到了，再接再厉！';
    return '别灰心，再接再厉！';
  }

  onEnter() {
    this.audio.playSfx(this.result === 'clear' ? 'clear' : 'fail');
  }

  primaryRect() {
    const { width, height } = this.canvasManager;
    return { x: width / 2 - 100, y: height / 2 + 80, w: 200, h: 50 };
  }

  secondaryRect() {
    const { width, height } = this.canvasManager;
    return { x: width / 2 - 100, y: height / 2 + 144, w: 200, h: 44 };
  }

  hit(rect, x, y) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  onTouch({ x, y }) {
    const cleared = this.result === 'clear';
    const primary = this.primaryRect();
    const secondary = this.secondaryRect();

    if (cleared) {
      if (this.hasNextLevel && this.hit(primary, x, y)) {
        this.audio.playSfx('tap');
        if (this.onContinue) this.onContinue(this.stars);
        return;
      }
      if (this.hit(secondary, x, y) || (!this.hasNextLevel && this.hit(primary, x, y))) {
        this.audio.playSfx('tap');
        if (this.onBack) this.onBack(this.stars);
      }
      return;
    }

    if (this.hit(primary, x, y)) {
      this.audio.playSfx('tap');
      if (this.onRetry) this.onRetry();
    } else if (this.hit(secondary, x, y)) {
      this.audio.playSfx('tap');
      if (this.onBack) this.onBack(this.stars);
    }
  }

  render(ctx) {
    const { width, height } = this.canvasManager;
    const cleared = this.result === 'clear';

    drawPageBackground(ctx, width, height);
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = cleared ? '#ff8c42' : '#ff6b6b';
    ctx.fillText(cleared ? '关卡解读' : '闯关中断', width / 2, height / 2 - 130);

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = cleared ? '#4ecdc4' : '#7a8a9a';
    ctx.fillText(this.encouragement, width / 2, height / 2 - 70);

    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#5a6a7a';
    const lines = [
      `用时：${this.time.toFixed(1)}s`,
      `失误：${this.misses}`,
      `提示：${this.hintUsed}`,
    ];
    if (!cleared) {
      lines.push(`原因：${this.reason === 'timeout' ? '时间到' : '失误超限'}`);
    }
    lines.forEach((s, i) => ctx.fillText(s, width / 2, height / 2 - 20 + i * 22));

    const r1 = this.primaryRect();
    const r2 = this.secondaryRect();

    if (cleared) {
      if (this.hasNextLevel) {
        ctx.fillStyle = '#4ecdc4';
        ctx.fillRect(r1.x, r1.y, r1.w, r1.h);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 17px sans-serif';
        ctx.fillText('继续', r1.x + r1.w / 2, r1.y + r1.h / 2);
      } else {
        ctx.fillStyle = '#4ecdc4';
        ctx.fillRect(r1.x, r1.y, r1.w, r1.h);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 17px sans-serif';
        ctx.fillText('返回', r1.x + r1.w / 2, r1.y + r1.h / 2);
        return;
      }

      ctx.strokeStyle = '#90b8d8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(r2.x + 0.5, r2.y + 0.5, r2.w - 1, r2.h - 1);
      ctx.fillStyle = '#2f80c8';
      ctx.font = '15px sans-serif';
      ctx.fillText('返回', r2.x + r2.w / 2, r2.y + r2.h / 2);
      return;
    }

    ctx.fillStyle = '#4ecdc4';
    ctx.fillRect(r1.x, r1.y, r1.w, r1.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('再次潜入', r1.x + r1.w / 2, r1.y + r1.h / 2);

    ctx.strokeStyle = '#90b8d8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(r2.x + 0.5, r2.y + 0.5, r2.w - 1, r2.h - 1);
    ctx.fillStyle = '#2f80c8';
    ctx.font = '15px sans-serif';
    ctx.fillText('返回章节', r2.x + r2.w / 2, r2.y + r2.h / 2);
  }
}

module.exports = ResultScene;
