class TouchRouter {
  constructor(canvas, env, handlers) {
    this.canvas = canvas;
    this.env = env;
    // 兼容旧用法：传入函数视为 onTouchStart
    if (typeof handlers === 'function') handlers = { onTouchStart: handlers };
    const { onTouchStart, onTouchMove, onTouchEnd } = handlers || {};
    if (env.onTouchStart) {
      env.onTouchStart((e) => {
        const t = e.touches && e.touches[0];
        if (!t || !onTouchStart) return;
        onTouchStart({ x: t.clientX, y: t.clientY });
      });
    }
    if (env.onTouchMove) {
      env.onTouchMove((e) => {
        const t = e.touches && e.touches[0];
        if (!t || !onTouchMove) return;
        onTouchMove({ x: t.clientX, y: t.clientY });
      });
    }
    if (env.onTouchEnd) {
      env.onTouchEnd(() => {
        if (onTouchEnd) onTouchEnd();
      });
    }
  }
}

module.exports = TouchRouter;
