// 游戏全局开关（调试时可改这里）
module.exports = {
  // 是否按通关进度锁定关卡；调试阶段设为 false，上线前改回 true
  LEVEL_LOCK_ENABLED: true,
  // 渲染像素比上限，降低中档机 CPU/GPU 压力（微信建议 ≤2）
  MAX_DPR: 2,
  // 首页/章节页背景动画降频：每 N 帧才重绘一次渐变背景
  BG_ANIM_INTERVAL: 3,
};
