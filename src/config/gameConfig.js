// 游戏全局开关（调试时可改这里）
module.exports = {
  // 是否按通关进度锁定关卡；调试阶段设为 false，上线前改回 true
  LEVEL_LOCK_ENABLED: true,
  // 渲染像素比上限；null 表示使用设备原生 pixelRatio（画质最佳）
  // 中档机 CPU 仍偏高时可设为 2
  MAX_DPR: null,
  // 首页/章节页背景动画降频：每 N 帧才重绘一次渐变背景
  BG_ANIM_INTERVAL: 3,

  // 关卡是否debug模式
  debugCoords: false,

  // 关卡图片尺寸
  LEVEL_IMAGE_SIZE: { w: 900, h: 675 },
  // 关卡时间限制
  LEVEL_TIME_LIMIT: 120,
  // 关卡最大失误次数
  LEVEL_MAX_MISSES: 3,
};
