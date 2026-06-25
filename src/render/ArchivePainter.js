// ArchivePainter：用程序化绘制为「南部档案馆」10 关生成占位底图。
// 真实图片到位后，关卡配置里把 imageA 指向真实路径即可，painter 自动停用。
//
// 风格：低饱和、暗色调、悬疑探案。
// 每个 painter 接收 (ctx, w, h, seed)，seed 用来产生稳定的伪随机变化。

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function vignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function wallBg(ctx, w, h, base) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, base[0]);
  grad.addColorStop(1, base[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function woodFloor(ctx, w, h, y) {
  const grad = ctx.createLinearGradient(0, y, 0, h);
  grad.addColorStop(0, '#3a2a1c');
  grad.addColorStop(1, '#1a120a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, w, h - y);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, h); ctx.stroke();
  }
}

function bookshelf(ctx, x, y, w, h, seed) {
  const r = rng(seed);
  ctx.fillStyle = '#2a1f12';
  ctx.fillRect(x, y, w, h);
  const rows = 4;
  const rowH = (h - 8) / rows;
  for (let i = 0; i < rows; i++) {
    const ry = y + 4 + i * rowH;
    ctx.fillStyle = '#1a120a';
    ctx.fillRect(x + 2, ry + rowH - 4, w - 4, 4);
    let bx = x + 4;
    while (bx < x + w - 8) {
      const bw = 8 + Math.floor(r() * 14);
      const bh = rowH - 8 - Math.floor(r() * 4);
      const colors = ['#5a3a2a', '#3a4a5a', '#5a4a2a', '#3a2a4a', '#4a3a3a', '#2a3a3a'];
      ctx.fillStyle = colors[Math.floor(r() * colors.length)];
      ctx.fillRect(bx, ry + rowH - 4 - bh, bw, bh);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(bx + bw - 1, ry + rowH - 4 - bh, 1, bh);
      bx += bw + 1;
    }
  }
}

function lamp(ctx, x, y, on) {
  ctx.fillStyle = '#222';
  ctx.fillRect(x - 1, y - 30, 2, 30);
  ctx.fillStyle = on ? '#3a3a3a' : '#3a3a3a';
  ctx.beginPath();
  ctx.moveTo(x - 18, y); ctx.lineTo(x + 18, y);
  ctx.lineTo(x + 12, y + 14); ctx.lineTo(x - 12, y + 14);
  ctx.closePath();
  ctx.fill();
  if (on) {
    const g = ctx.createRadialGradient(x, y + 18, 4, x, y + 18, 80);
    g.addColorStop(0, 'rgba(255,210,140,0.7)');
    g.addColorStop(1, 'rgba(255,210,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 80, y - 10, 160, 160);
    ctx.fillStyle = '#ffd28c';
    ctx.beginPath(); ctx.arc(x, y + 14, 5, 0, Math.PI * 2); ctx.fill();
  }
}

function windowFrame(ctx, x, y, w, h) {
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#3a3a4a';
  ctx.fillRect(x + w / 2 - 2, y, 4, h);
  ctx.fillRect(x, y + h / 2 - 2, w, 4);
  ctx.strokeStyle = '#7a6a4a';
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);
  // 月光透出
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(180,200,230,0.35)');
  g.addColorStop(1, 'rgba(40,60,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
}

function frame(ctx, x, y, w, h, content) {
  ctx.fillStyle = '#7a5a3a';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.fillStyle = content || '#3a2a2a';
  ctx.fillRect(x, y, w, h);
}

// ====== 各关卡场景 ======

function scene01(ctx, w, h, seed) {
  // 入口大厅
  wallBg(ctx, w, h, ['#3a3024', '#1a140c']);
  woodFloor(ctx, w, h, h - 120);
  // 立柱
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(40, 60, 30, h - 120);
  ctx.fillRect(w - 70, 60, 30, h - 120);
  // 中央铁门
  ctx.fillStyle = '#2a2a32';
  ctx.fillRect(w / 2 - 80, 80, 160, h - 200);
  ctx.fillStyle = '#5a5a6a';
  ctx.fillRect(w / 2 - 76, 84, 4, h - 208);
  ctx.fillRect(w / 2 + 72, 84, 4, h - 208);
  // 门把手
  ctx.fillStyle = '#c0a050';
  ctx.beginPath(); ctx.arc(w / 2 - 30, h / 2 + 20, 4, 0, Math.PI * 2); ctx.fill();
  // 牌匾
  frame(ctx, w / 2 - 60, 30, 120, 36, '#1a1a1a');
  ctx.fillStyle = '#c8b074';
  ctx.font = 'bold 16px serif';
  ctx.textAlign = 'center';
  ctx.fillText('南部档案馆', w / 2, 56);
  // 壁灯
  lamp(ctx, 120, 140, true);
  lamp(ctx, w - 120, 140, true);
  // 地毯
  ctx.fillStyle = '#5a2a2a';
  ctx.fillRect(w / 2 - 60, h - 110, 120, 100);
  vignette(ctx, w, h);
}

function scene02(ctx, w, h) {
  // 走廊
  wallBg(ctx, w, h, ['#2a2418', '#0e0a06']);
  // 透视地砖
  for (let i = 0; i < 8; i++) {
    const t = i / 8;
    const y1 = h - 80 + t * 60;
    const y2 = h - 80 + (t + 1 / 8) * 60;
    ctx.fillStyle = i % 2 ? '#2a1a14' : '#1a120c';
    ctx.fillRect(0, y1, w, y2 - y1);
  }
  // 两侧门
  for (let i = 0; i < 4; i++) {
    const x = 40 + i * (w - 80) / 3 - 20;
    ctx.fillStyle = '#3a2618';
    ctx.fillRect(x, 120, 40, 200);
    ctx.fillStyle = '#c0a050';
    ctx.beginPath(); ctx.arc(x + 32, 220, 2, 0, Math.PI * 2); ctx.fill();
  }
  // 顶灯
  for (let i = 0; i < 3; i++) {
    const x = w / 4 * (i + 1) - 20;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x - 8, 0, 16, 8);
    ctx.fillStyle = '#ffd28c';
    ctx.beginPath(); ctx.ellipse(x, 18, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
  }
  // 远处人影
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 90, 8, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(w / 2 - 6, h - 90, 12, 30);
  vignette(ctx, w, h);
}

function scene03(ctx, w, h, seed) {
  // 档案室（核心场景：书架 + 桌子）
  wallBg(ctx, w, h, ['#2e2418', '#100a04']);
  woodFloor(ctx, w, h, h - 100);
  bookshelf(ctx, 20, 60, (w - 60) / 2, h - 180, seed);
  bookshelf(ctx, w / 2 + 10, 60, (w - 60) / 2, h - 180, seed + 7);
  // 中央桌
  ctx.fillStyle = '#3a2618';
  ctx.fillRect(w / 2 - 100, h - 160, 200, 60);
  ctx.fillStyle = '#1a120a';
  ctx.fillRect(w / 2 - 100, h - 100, 200, 6);
  // 台灯
  lamp(ctx, w / 2 - 70, h - 175, true);
  // 一本翻开的书
  ctx.fillStyle = '#e8dcb8';
  ctx.fillRect(w / 2 - 30, h - 145, 60, 30);
  ctx.strokeStyle = '#3a2618';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(w / 2, h - 145); ctx.lineTo(w / 2, h - 115); ctx.stroke();
  // 信封
  ctx.fillStyle = '#d8c89a';
  ctx.fillRect(w / 2 + 40, h - 138, 30, 18);
  vignette(ctx, w, h);
}

function scene04(ctx, w, h) {
  // 地下室楼梯
  wallBg(ctx, w, h, ['#1c1a20', '#08060a']);
  // 楼梯
  for (let i = 0; i < 10; i++) {
    const y = 80 + i * 24;
    ctx.fillStyle = i % 2 ? '#2a2628' : '#1a1618';
    ctx.fillRect(40 + i * 6, y, w - 80 - i * 12, 24);
  }
  // 把手
  ctx.strokeStyle = '#3a3a4a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(40, 80); ctx.lineTo(w - 40, 320);
  ctx.stroke();
  // 底部光
  const g = ctx.createRadialGradient(w / 2, h - 40, 10, w / 2, h - 40, 200);
  g.addColorStop(0, 'rgba(180,140,80,0.5)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, h - 200, w, 200);
  // 蛛网角落
  ctx.strokeStyle = 'rgba(220,220,220,0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(60, i * 12);
    ctx.stroke();
  }
  vignette(ctx, w, h);
}

function scene05(ctx, w, h, seed) {
  // 馆长办公室
  wallBg(ctx, w, h, ['#2a2230', '#100c14']);
  woodFloor(ctx, w, h, h - 90);
  // 大书桌
  ctx.fillStyle = '#3a2a18';
  ctx.fillRect(80, h - 180, w - 160, 90);
  ctx.fillStyle = '#1a120a';
  ctx.fillRect(80, h - 90, w - 160, 6);
  // 椅背
  ctx.fillStyle = '#4a2a2a';
  ctx.fillRect(w / 2 - 40, h - 240, 80, 80);
  // 桌面物：墨水瓶 / 纸 / 钢笔
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(120, h - 200, 16, 24);
  ctx.fillStyle = '#f0e6cf';
  ctx.fillRect(160, h - 200, 60, 30);
  ctx.strokeStyle = '#7a6748';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const y = h - 195 + i * 8;
    ctx.beginPath(); ctx.moveTo(165, y); ctx.lineTo(215, y); ctx.stroke();
  }
  ctx.fillStyle = '#c0a050';
  ctx.fillRect(240, h - 198, 30, 3);
  // 墙上画框
  frame(ctx, 60, 50, 100, 80, '#3a2a2a');
  frame(ctx, w - 160, 50, 100, 80, '#2a3a3a');
  // 落地灯
  lamp(ctx, w - 60, 150, true);
  vignette(ctx, w, h);
}

function scene06(ctx, w, h) {
  // 阅览室（午夜空座）
  wallBg(ctx, w, h, ['#2a2820', '#0e0c08']);
  woodFloor(ctx, w, h, h - 80);
  // 长桌
  ctx.fillStyle = '#3a2a18';
  ctx.fillRect(40, h - 160, w - 80, 80);
  // 椅子
  for (let i = 0; i < 4; i++) {
    const x = 60 + i * (w - 120) / 3;
    ctx.fillStyle = '#2a1a12';
    ctx.fillRect(x, h - 80, 30, 40);
    ctx.fillRect(x, h - 130, 30, 50);
  }
  // 台灯
  for (let i = 0; i < 3; i++) {
    const x = 80 + i * (w - 160) / 2;
    lamp(ctx, x, h - 175, i !== 1);
  }
  // 一本独立摆放的书
  ctx.fillStyle = '#5a2a2a';
  ctx.fillRect(w / 2 - 12, h - 150, 24, 8);
  vignette(ctx, w, h);
}

function scene07(ctx, w, h) {
  // 储藏间（杂物 + 木箱）
  wallBg(ctx, w, h, ['#2a2418', '#0c0a06']);
  woodFloor(ctx, w, h, h - 60);
  // 木箱
  for (let i = 0; i < 3; i++) {
    const x = 60 + i * 200;
    const y = h - 160 - (i % 2) * 20;
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x, y, 100, 80);
    ctx.strokeStyle = '#2a1a08';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 100, 80);
    ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.lineTo(x + 100, y + 40); ctx.stroke();
  }
  // 挂着的麻布
  ctx.fillStyle = '#4a4232';
  ctx.beginPath();
  ctx.moveTo(40, 40); ctx.quadraticCurveTo(120, 80, 200, 40); ctx.lineTo(200, 0); ctx.lineTo(40, 0);
  ctx.closePath(); ctx.fill();
  // 油灯
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(w - 80, h - 100, 20, 40);
  ctx.fillStyle = '#ff9a3c';
  ctx.beginPath(); ctx.ellipse(w - 70, h - 110, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
  vignette(ctx, w, h);
}

function scene08(ctx, w, h) {
  // 屋顶 / 雨夜
  // 天空
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
  sky.addColorStop(0, '#0a0a18');
  sky.addColorStop(1, '#1a1a28');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.7);
  // 月亮
  ctx.fillStyle = 'rgba(220,220,200,0.85)';
  ctx.beginPath(); ctx.arc(w - 100, 80, 28, 0, Math.PI * 2); ctx.fill();
  // 屋顶轮廓
  ctx.fillStyle = '#1a1a20';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5);
  ctx.lineTo(w * 0.3, h * 0.35);
  ctx.lineTo(w * 0.6, h * 0.5);
  ctx.lineTo(w, h * 0.4);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath(); ctx.fill();
  // 烟囱
  ctx.fillStyle = '#2a1a18';
  ctx.fillRect(w * 0.45, h * 0.32, 30, 50);
  // 雨
  ctx.strokeStyle = 'rgba(180,200,230,0.4)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 80; i++) {
    const x = (i * 53) % w;
    const y = (i * 91) % (h * 0.7);
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 12);
    ctx.stroke();
  }
  // 远处人影
  ctx.fillStyle = '#000';
  ctx.fillRect(w * 0.7, h * 0.42, 4, 14);
  ctx.beginPath(); ctx.arc(w * 0.7 + 2, h * 0.42 - 2, 2, 0, Math.PI * 2); ctx.fill();
  vignette(ctx, w, h);
}

function scene09(ctx, w, h) {
  // 钟楼内部
  wallBg(ctx, w, h, ['#1c1812', '#080604']);
  // 大钟
  ctx.fillStyle = '#c8b074';
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 130, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a120a';
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 110, 0, Math.PI * 2); ctx.fill();
  // 时针 / 分针
  ctx.strokeStyle = '#c8b074';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(w / 2, h / 2); ctx.lineTo(w / 2 + 40, h / 2 - 60); ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(w / 2, h / 2); ctx.lineTo(w / 2 - 50, h / 2 + 10); ctx.stroke();
  // 刻度
  ctx.fillStyle = '#c8b074';
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 - Math.PI / 2;
    const x = w / 2 + Math.cos(a) * 95;
    const y = h / 2 + Math.sin(a) * 95;
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }
  // 齿轮
  ctx.fillStyle = '#5a4a2a';
  ctx.beginPath(); ctx.arc(80, h - 80, 32, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a120a';
  ctx.beginPath(); ctx.arc(80, h - 80, 12, 0, Math.PI * 2); ctx.fill();
  vignette(ctx, w, h);
}

function scene10(ctx, w, h, seed) {
  // 秘密档案：地下密室
  wallBg(ctx, w, h, ['#1a1a28', '#040408']);
  // 石墙缝
  ctx.strokeStyle = 'rgba(80,80,100,0.3)';
  ctx.lineWidth = 1;
  for (let y = 40; y < h - 80; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  for (let x = 0; x < w; x += 80) {
    for (let y = 40; y < h - 80; y += 80) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 40); ctx.stroke();
    }
  }
  woodFloor(ctx, w, h, h - 80);
  // 中央祭台
  ctx.fillStyle = '#2a2a32';
  ctx.fillRect(w / 2 - 80, h - 200, 160, 100);
  // 一本古书
  ctx.fillStyle = '#5a2a1a';
  ctx.fillRect(w / 2 - 30, h - 215, 60, 18);
  ctx.fillStyle = '#c0a050';
  ctx.fillRect(w / 2 - 4, h - 213, 8, 14);
  // 烛台
  for (const cx of [w / 2 - 70, w / 2 + 70]) {
    ctx.fillStyle = '#5a4a2a';
    ctx.fillRect(cx - 3, h - 220, 6, 30);
    ctx.fillStyle = '#f5e9b8';
    ctx.fillRect(cx - 2, h - 240, 4, 20);
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath(); ctx.ellipse(cx, h - 244, 3, 6, 0, 0, Math.PI * 2); ctx.fill();
  }
  // 顶部符号
  ctx.strokeStyle = '#c0a050';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w / 2, 60, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w / 2 - 18, 60); ctx.lineTo(w / 2 + 18, 60);
  ctx.moveTo(w / 2, 42); ctx.lineTo(w / 2, 78);
  ctx.stroke();
  vignette(ctx, w, h);
}

const PAINTERS = {
  archive_01: scene01,
  archive_02: scene02,
  archive_03: scene03,
  archive_04: scene04,
  archive_05: scene05,
  archive_06: scene06,
  archive_07: scene07,
  archive_08: scene08,
  archive_09: scene09,
  archive_10: scene10,
};

function paint(env, sceneId, size, seed = 1) {
  const fn = PAINTERS[sceneId];
  if (!fn) throw new Error('Unknown archive scene: ' + sceneId);
  const off = env.createOffscreenCanvas(size.w, size.h);
  off.width = size.w; off.height = size.h;
  const ctx = off.getContext('2d');
  fn(ctx, size.w, size.h, seed);
  return off;
}

module.exports = { paint, PAINTERS };
