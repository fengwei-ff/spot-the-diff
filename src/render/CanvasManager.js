class CanvasManager {
  constructor(canvas, ctx, env) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.env = env;
    this.width = env.screenWidth;
    this.height = env.screenHeight;
    this.safeTop = env.safeAreaTop || 0;
    this.safeBottom = env.safeAreaBottom || 0;
    // 胶囊按钮区域：用于让各页标题与其纵向对齐
    this.capsule = env.capsule || { top: 8, bottom: this.safeTop || 40, left: this.width - 95, right: this.width - 8, width: 87, height: 32 };
    this.capsuleCenterY = (this.capsule.top + this.capsule.bottom) / 2;
    // 按设备像素比放大背景缓冲区，避免高清图在高 DPI 屏上被放大显示而发虚
    this.dpr = env.pixelRatio || 1;
    canvas.width = Math.round(this.width * this.dpr);
    canvas.height = Math.round(this.height * this.dpr);
    // 浏览器 demo：保持显示尺寸为逻辑像素（微信主屏 canvas 无 style，跳过）
    if (canvas.style) {
      canvas.style.width = this.width + 'px';
      canvas.style.height = this.height + 'px';
    }
    // 绘制坐标统一使用逻辑像素，触摸坐标也是逻辑像素，二者一致
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  clear() {
    // 每帧重置变换，保证基准缩放始终生效
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}

module.exports = CanvasManager;
