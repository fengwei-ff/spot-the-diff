class CanvasManager {
  constructor(canvas, ctx, env) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.env = env;
    this.width = env.screenWidth;
    this.height = env.screenHeight;
    this.safeTop = env.safeAreaTop || 0;
    this.safeBottom = env.safeAreaBottom || 0;
    canvas.width = this.width;
    canvas.height = this.height;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}

module.exports = CanvasManager;
