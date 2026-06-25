// 微信小游戏入口
const adapter = require('./src/core/adapter.js');
const SceneManager = require('./src/core/SceneManager.js');
const CanvasManager = require('./src/render/CanvasManager.js');
const TouchRouter = require('./src/render/TouchRouter.js');
const BootScene = require('./src/scenes/BootScene.js');

const env = adapter.detect();
const canvas = env.createCanvas();
const ctx = canvas.getContext('2d');

const canvasManager = new CanvasManager(canvas, ctx, env);
const sceneManager = new SceneManager({ canvasManager });
const touchRouter = new TouchRouter(canvas, env, {
  onTouchStart: (e) => sceneManager.onTouchStart(e),
  onTouchMove: (e) => sceneManager.onTouchMove(e),
  onTouchEnd: () => sceneManager.onTouchEnd(),
});

sceneManager.replace(new BootScene({ sceneManager, canvasManager, env }));

let last = Date.now();
function loop() {
  const now = Date.now();
  const dt = Math.min(50, now - last);
  last = now;
  sceneManager.update(dt);
  canvasManager.clear();
  sceneManager.render(ctx);
  env.requestAnimationFrame(loop);
}
loop();
