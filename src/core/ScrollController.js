// 简易滚动控制器：竖向滚动，支持触摸拖动 + 惯性 + 边界回弹。
class ScrollController {
  constructor() {
    this.scrollY = 0;
    this.minY = 0;
    this.maxY = 0;
    this.dragging = false;
    this.lastY = 0;
    this.startY = 0;
    this.startScroll = 0;
    this.startTime = 0;
    this.velocity = 0;
    this.lastMoveTime = 0;
    this.lastMoveY = 0;
    this.dragMoved = false;
    this.tapThreshold = 6; // 像素：超过则不算点击
  }

  // contentH 内容总高度，viewportH 可视区域高度
  setBounds(contentH, viewportH) {
    this.maxY = Math.max(0, contentH - viewportH);
    if (this.scrollY > this.maxY) this.scrollY = this.maxY;
    if (this.scrollY < 0) this.scrollY = 0;
  }

  onTouchStart(y) {
    this.dragging = true;
    this.dragMoved = false;
    this.startY = y;
    this.lastY = y;
    this.lastMoveY = y;
    this.startScroll = this.scrollY;
    this.startTime = Date.now();
    this.lastMoveTime = this.startTime;
    this.velocity = 0;
  }

  onTouchMove(y) {
    if (!this.dragging) return;
    const dy = y - this.startY;
    if (Math.abs(dy) > this.tapThreshold) this.dragMoved = true;
    this.scrollY = this.clampSoft(this.startScroll - dy);
    const now = Date.now();
    const dt = Math.max(1, now - this.lastMoveTime);
    this.velocity = (this.lastMoveY - y) / dt * 16; // px/frame
    this.lastMoveTime = now;
    this.lastMoveY = y;
  }

  onTouchEnd() {
    this.dragging = false;
  }

  // 软边界：超界时阻尼
  clampSoft(v) {
    if (v < 0) return v * 0.4;
    if (v > this.maxY) return this.maxY + (v - this.maxY) * 0.4;
    return v;
  }

  update() {
    if (this.dragging) return;
    if (Math.abs(this.velocity) > 0.1) {
      this.scrollY += this.velocity;
      this.velocity *= 0.92;
      if (this.scrollY < 0 || this.scrollY > this.maxY) this.velocity *= 0.6;
    } else {
      this.velocity = 0;
    }
    // 边界回弹
    if (this.scrollY < 0) {
      this.scrollY += (0 - this.scrollY) * 0.2;
      if (this.scrollY > -0.5) this.scrollY = 0;
    } else if (this.scrollY > this.maxY) {
      this.scrollY += (this.maxY - this.scrollY) * 0.2;
      if (this.scrollY < this.maxY + 0.5) this.scrollY = this.maxY;
    }
  }

  // 是否可视为点击（未发生明显拖动）
  isTap() {
    return !this.dragMoved;
  }
}

module.exports = ScrollController;
