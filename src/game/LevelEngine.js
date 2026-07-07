const DiffHitTester = require('./DiffHitTester.js');

const STATE = { READY: 'ready', PLAYING: 'playing', CLEAR: 'clear', FAIL: 'fail' };

class LevelEngine {
  constructor({ levelConfig, imageA, imageB, viewport, hooks = {} }) {
    this.config = levelConfig;
    this.imageA = imageA;
    this.imageB = imageB;
    this.viewport = viewport;
    this.hooks = hooks;
    this.state = STATE.READY;
    this.found = new Set();
    this.misses = 0;
    // 允许错误次数 = 差异点数量的 1/3（向下取整）
    this.allowedMisses = Math.floor((levelConfig.diffs ? levelConfig.diffs.length : 0) / 3);
    this.elapsed = 0;
    this.lastMissAt = -1;
    this.layout = this.computeLayout();
    this.hitTester = new DiffHitTester(this.layout);
  }

  computeLayout() {
    const { viewport, config } = this;
    const margin = 12;
    const isVertical = (config.layout || 'vertical') === 'vertical';
    const aspect = config.imageSize.w / config.imageSize.h;
    let aRect, bRect;
    if (isVertical) {
      // 同时受宽度与高度约束，避免两图总高超出可视区导致底部被裁
      const maxW = viewport.w - margin * 2;
      const maxH = (viewport.h - margin) / 2;
      const w = Math.min(maxW, maxH * aspect);
      const h = w / aspect;
      const totalH = h * 2 + margin;
      const top = viewport.y + (viewport.h - totalH) / 2;
      const left = viewport.x + (viewport.w - w) / 2;
      aRect = { x: left, y: top, w, h };
      bRect = { x: left, y: top + h + margin, w, h };
    } else {
      const h = viewport.h - margin * 2;
      const w = h * aspect;
      const totalW = w * 2 + margin;
      const left = viewport.x + (viewport.w - totalW) / 2;
      aRect = { x: left, y: viewport.y + margin, w, h };
      bRect = { x: left + w + margin, y: viewport.y + margin, w, h };
    }
    return { aRect, bRect, imageSize: config.imageSize };
  }

  start() {
    this.state = STATE.PLAYING;
    this.elapsed = 0;
  }

  update(dt) {
    if (this.state !== STATE.PLAYING) return;
    this.elapsed += dt / 1000;
    if (this.elapsed >= this.config.timeLimit) this.fail('timeout');
  }

  remainingTime() {
    return Math.max(0, this.config.timeLimit - this.elapsed);
  }

  onTouch(x, y) {
    if (this.state !== STATE.PLAYING) return;
    const { onImage, localX, localY } = this.hitTester.toLocal(x, y);
    if (!onImage) return;
    const diff = this.hitTester.hitDiff(localX, localY, this.config.diffs, this.found);
    if (diff) {
      this.found.add(diff.id);
      if (this.hooks.onDiffFound) this.hooks.onDiffFound(diff);
      if (this.found.size >= this.config.diffs.length) this.clear();
    } else {
      this.misses += 1;
      this.lastMissAt = this.elapsed;
      const nearest = this.hitTester.nearestUnfoundDiff(
        localX, localY, this.config.diffs, this.found,
      );
      const nearMiss = nearest
        && nearest.distance > nearest.hitR
        && nearest.distance <= nearest.hitR * 1.5;
      if (this.hooks.onMiss) {
        this.hooks.onMiss({ x, y, misses: this.misses, nearMiss: !!nearMiss });
      }
      // 红心为剩余可错次数，扣到 0 即游戏结束
      if (this.misses >= this.allowedMisses) this.fail('misses');
    }
  }

  useHint() {
    if (this.state !== STATE.PLAYING) return null;
    const remaining = this.config.diffs.filter((d) => !this.found.has(d.id));
    if (!remaining.length) return null;
    const d = remaining[Math.floor(Math.random() * remaining.length)];
    if (this.hooks.onHint) this.hooks.onHint(d);
    return d;
  }

  clear() {
    this.state = STATE.CLEAR;
    if (this.hooks.onClear) this.hooks.onClear({ time: this.elapsed, misses: this.misses });
  }

  fail(reason) {
    this.state = STATE.FAIL;
    if (this.hooks.onFail) this.hooks.onFail({ reason, time: this.elapsed, misses: this.misses });
  }

  getFoundDiffs() {
    return this.config.diffs.filter((d) => this.found.has(d.id));
  }
}

LevelEngine.STATE = STATE;
module.exports = LevelEngine;
