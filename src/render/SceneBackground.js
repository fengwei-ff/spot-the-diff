function drawSkyGradient(ctx, width, height) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#a8d8f0');
  sky.addColorStop(0.55, '#d4ecfa');
  sky.addColorStop(1, '#eef8ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
}

function drawSunGlow(ctx, width, height) {
  const sunGlow = ctx.createRadialGradient(
    width * 0.85, height * 0.08, 8,
    width * 0.85, height * 0.08, width * 0.4,
  );
  sunGlow.addColorStop(0, 'rgba(255,220,120,0.32)');
  sunGlow.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, width, height);
}

function drawCloud(ctx, cx, cy, scale) {
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(cx, cy, 18 * scale, 0, Math.PI * 2);
  ctx.arc(cx + 22 * scale, cy - 6 * scale, 14 * scale, 0, Math.PI * 2);
  ctx.arc(cx + 40 * scale, cy, 16 * scale, 0, Math.PI * 2);
  ctx.arc(cx + 20 * scale, cy + 8 * scale, 12 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawSoftBubbles(ctx, width, height, phase = 0) {
  const bob = Math.sin(phase * 3) * 3;
  const bubbles = [
    [width * 0.08, height * 0.18, 14, 'rgba(255,107,107,0.18)'],
    [width * 0.92, height * 0.25, 12, 'rgba(78,205,196,0.22)'],
    [width * 0.06, height * 0.72, 10, 'rgba(255,200,87,0.25)'],
    [width * 0.94, height * 0.68, 16, 'rgba(116,185,255,0.2)'],
    [width * 0.15, height * 0.9, 11, 'rgba(162,155,254,0.2)'],
    [width * 0.85, height * 0.88, 13, 'rgba(255,140,66,0.15)'],
  ];
  for (const [bx, by, br, color] of bubbles) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(bx, by + bob, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawNeutralBackground(ctx, width, height) {
  // 纯色替代每帧 createLinearGradient，视觉差异极小
  ctx.fillStyle = '#eeeae4';
  ctx.fillRect(0, 0, width, height);
}

function drawPlayAreaBackground(ctx, x, y, w, h) {
  ctx.fillStyle = '#ebe7e2';
  ctx.fillRect(x, y, w, h);
}

function drawPageBackground(ctx, width, height, options = {}) {
  const { decor = 'subtle', phase = 0 } = options;
  drawSkyGradient(ctx, width, height);
  drawSunGlow(ctx, width, height);
  if (decor === 'full') {
    drawCloud(ctx, width * 0.18, height * 0.14, 1.1);
    drawCloud(ctx, width * 0.72, height * 0.2, 0.9);
    drawCloud(ctx, width * 0.45, height * 0.08, 0.7);
  }
  drawSoftBubbles(ctx, width, height, phase);
}

function drawHeaderBand(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(90,170,230,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + h - 0.5);
  ctx.lineTo(x + w, y + h - 0.5);
  ctx.stroke();
}

module.exports = {
  drawPageBackground,
  drawNeutralBackground,
  drawPlayAreaBackground,
  drawHeaderBand,
  drawSkyGradient,
};
