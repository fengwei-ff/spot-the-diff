// 程序化场景绘制：把"图片"画到离屏 canvas，再当作 image 使用
// 解决微信小游戏不支持 SVG / 资源路径不一致的问题。
function paintMountainGate(ctx, w, h, variant) {
  // 天空
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#3a4a7a');
  sky.addColorStop(1, '#8aa0c8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.7);

  // 月亮（差异1：B 变小）
  ctx.fillStyle = '#f5e9b8';
  ctx.beginPath();
  ctx.arc(560, 90, variant === 'B' ? 26 : 38, 0, Math.PI * 2);
  ctx.fill();

  // 远山
  ctx.fillStyle = 'rgba(42,48,80,0.85)';
  ctx.beginPath();
  ctx.moveTo(0, 260);
  ctx.lineTo(120, 180); ctx.lineTo(220, 240); ctx.lineTo(320, 170);
  ctx.lineTo(460, 250); ctx.lineTo(600, 190); ctx.lineTo(720, 260);
  ctx.lineTo(720, 380); ctx.lineTo(0, 380);
  ctx.closePath(); ctx.fill();

  // 地面
  const ground = ctx.createLinearGradient(0, 380, 0, h);
  ground.addColorStop(0, '#5a4a36');
  ground.addColorStop(1, '#2a1f12');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 380, w, h - 380);

  // 屋檐
  ctx.fillStyle = '#7a3b2e';
  ctx.beginPath();
  ctx.moveTo(180, 260); ctx.lineTo(360, 180); ctx.lineTo(540, 260);
  ctx.lineTo(540, 300); ctx.lineTo(180, 300); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#5e2c22';
  ctx.beginPath();
  ctx.moveTo(180, 260); ctx.lineTo(360, 180); ctx.lineTo(540, 260);
  ctx.closePath(); ctx.fill();

  // 屋身
  ctx.fillStyle = '#c8a36a';
  ctx.fillRect(220, 300, 280, 120);

  // 门
  ctx.fillStyle = '#3a2412';
  ctx.fillRect(330, 330, 60, 90);

  // 差异4：门把手颜色
  ctx.fillStyle = variant === 'B' ? '#22d3ee' : '#ffd166';
  ctx.beginPath(); ctx.arc(378, 378, 3, 0, Math.PI * 2); ctx.fill();

  // 差异2：左灯笼颜色
  ctx.fillStyle = variant === 'B' ? '#3b82f6' : '#d63031';
  ctx.beginPath(); ctx.ellipse(240, 290, 14, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(237, 270, 6, 6);

  // 右灯笼（无差异）
  ctx.fillStyle = '#d63031';
  ctx.beginPath(); ctx.ellipse(480, 290, 14, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(477, 270, 6, 6);

  // 树干
  ctx.fillStyle = '#3a2412';
  ctx.fillRect(80, 320, 14, 80);
  // 差异5：树叶颜色
  ctx.fillStyle = variant === 'B' ? '#d97706' : '#2f6b3a';
  ctx.beginPath(); ctx.arc(87, 310, 40, 0, Math.PI * 2); ctx.fill();

  // 星星
  ctx.fillStyle = '#fff';
  const stars = [[120, 80], [200, 50], [320, 100]];
  // 差异6：B 缺少 [640,60] 这颗
  if (variant !== 'B') stars.push([640, 60]);
  for (const [x, y] of stars) {
    ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
  }

  // 旗杆
  ctx.fillStyle = '#222';
  ctx.fillRect(600, 280, 3, 40);
  // 差异3：旗子颜色
  ctx.fillStyle = variant === 'B' ? '#06b6d4' : '#ffd166';
  ctx.beginPath();
  ctx.moveTo(603, 280); ctx.lineTo(630, 290); ctx.lineTo(603, 300);
  ctx.closePath(); ctx.fill();

  // 石灯
  ctx.fillStyle = '#7a7a7a';
  ctx.fillRect(140, 380, 20, 30);
  ctx.fillStyle = '#9a9a9a';
  ctx.fillRect(135, 370, 30, 12);
}

const PAINTERS = {
  mountain_gate: paintMountainGate,
};

// 创建离屏 canvas，绘制场景，返回可作为 drawImage 源的对象
function createScene(env, sceneId, variant, size) {
  const off = env.createOffscreenCanvas
    ? env.createOffscreenCanvas(size.w, size.h)
    : env.createCanvas();
  off.width = size.w;
  off.height = size.h;
  const ctx = off.getContext('2d');
  const painter = PAINTERS[sceneId];
  if (!painter) throw new Error('Unknown sceneId: ' + sceneId);
  painter(ctx, size.w, size.h, variant);
  return off;
}

module.exports = { createScene };
