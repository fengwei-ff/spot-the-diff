class SceneManager {
  constructor({ canvasManager }) {
    this.canvasManager = canvasManager;
    this.stack = [];
  }

  get current() {
    return this.stack[this.stack.length - 1];
  }

  replace(scene) {
    while (this.stack.length) {
      const s = this.stack.pop();
      if (s.onExit) s.onExit();
    }
    this.push(scene);
  }

  push(scene) {
    this.stack.push(scene);
    if (scene.onEnter) scene.onEnter();
  }

  pop() {
    const s = this.stack.pop();
    if (s && s.onExit) s.onExit();
  }

  /** 替换栈顶场景（不触动下层），用于关卡切换过渡 */
  replaceTop(scene) {
    const s = this.stack.pop();
    if (s && s.onExit) s.onExit();
    this.push(scene);
  }

  update(dt) {
    if (this.current && this.current.update) this.current.update(dt);
  }

  render(ctx) {
    if (this.current && this.current.render) this.current.render(ctx);
  }

  onTouch(e) {
    this.onTouchStart(e);
  }

  onTouchStart(e) {
    if (this.current) {
      if (this.current.onTouchStart) this.current.onTouchStart(e);
      else if (this.current.onTouch) this.current.onTouch(e);
    }
  }

  onTouchMove(e) {
    if (this.current && this.current.onTouchMove) this.current.onTouchMove(e);
  }

  onTouchEnd() {
    if (this.current && this.current.onTouchEnd) this.current.onTouchEnd();
  }
}

module.exports = SceneManager;
