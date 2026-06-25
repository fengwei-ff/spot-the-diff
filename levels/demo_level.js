// 关卡配置（JS 模块，避免微信端 JSON 文件加载差异）
module.exports = {
  levelId: 'demo_01',
  title: 'Demo · 山门初见',
  // 用程序化绘制替代图片资源
  sceneId: 'mountain_gate',
  layout: 'vertical',
  imageSize: { w: 720, h: 540 },
  timeLimit: 90,
  maxMisses: 3,
  diffs: [
    { id: 'd1', x: 560, y: 90,  r: 42, desc: '月亮大小' },
    { id: 'd2', x: 240, y: 290, r: 24, desc: '左灯笼颜色' },
    { id: 'd3', x: 615, y: 290, r: 22, desc: '旗子颜色' },
    { id: 'd4', x: 378, y: 378, r: 18, desc: '门把手颜色' },
    { id: 'd5', x: 87,  y: 310, r: 44, desc: '树叶颜色' },
    { id: 'd6', x: 640, y: 60,  r: 18, desc: '消失的星星' },
  ],
  starThresholds: { 3: 30, 2: 60, 1: 90 },
};
