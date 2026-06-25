// DiffPainter：单底图 → 程序化生成 B 图
// 输入 imageA + diffs，返回一个绘制了所有差异的离屏 canvas。
//
// 支持的差异类型：
//   recolor  - 圆形/矩形区域整体染色
//   patch    - 复制 A 图另一区域，覆盖到目标位置（用于"消失某物"）
//   overlay  - 在目标位置贴一个图标/形状（用于"多出某物"）
//   blur     - 简易模糊（用于"模糊招牌"）
//   mirror   - 区域水平翻转（用于"文字反转"）
//   shape    - 直接用 fill/stroke 画一个形状覆盖

const ICONS = {
  // 简易矢量图标，直接在 ctx 上画。坐标以 (cx,cy) 为中心，size 为外接半径。
  cobweb(ctx, cx, cy, size) {
    ctx.save();
    ctx.strokeStyle = 'rgba(230,230,230,0.85)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * size, cy + Math.sin(a) * size);
      ctx.stroke();
    }
    for (let r = size / 3; r <= size; r += size / 3) {
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  },
  candle(ctx, cx, cy, size) {
    ctx.save();
    ctx.fillStyle = '#f5e9b8';
    ctx.fillRect(cx - size * 0.2, cy - size * 0.2, size * 0.4, size * 0.8);
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath();
    ctx.ellipse(cx, cy - size * 0.4, size * 0.18, size * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  envelope(ctx, cx, cy, size) {
    ctx.save();
    ctx.fillStyle = '#d8c89a';
    ctx.strokeStyle = '#5a4632';
    ctx.lineWidth = 1.5;
    const w = size * 1.6, h = size * 1.1;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, cy - h / 2);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx + w / 2, cy - h / 2);
    ctx.stroke();
    ctx.restore();
  },
  key(ctx, cx, cy, size) {
    ctx.save();
    ctx.fillStyle = '#c0a050';
    ctx.beginPath();
    ctx.arc(cx - size * 0.4, cy, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - size * 0.1, cy - size * 0.12, size * 1.0, size * 0.24);
    ctx.fillRect(cx + size * 0.7, cy + size * 0.12, size * 0.18, size * 0.24);
    ctx.restore();
  },
  bloodstain(ctx, cx, cy, size) {
    ctx.save();
    ctx.fillStyle = 'rgba(140,20,20,0.85)';
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = size * (0.7 + Math.sin(i * 1.7) * 0.25);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  },
  eye(ctx, cx, cy, size) {
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(cx, cy, size, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  paper(ctx, cx, cy, size) {
    ctx.save();
    ctx.fillStyle = '#f0e6cf';
    ctx.strokeStyle = '#7a6748';
    ctx.lineWidth = 1.2;
    const w = size * 1.4, h = size * 1.8;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
    ctx.strokeStyle = '#7a6748';
    for (let i = 0; i < 4; i++) {
      const y = cy - h / 2 + (i + 1) * h / 5;
      ctx.beginPath();
      ctx.moveTo(cx - w / 2 + 4, y);
      ctx.lineTo(cx + w / 2 - 4, y);
      ctx.stroke();
    }
    ctx.restore();
  },
};

function withCircleClip(ctx, cx, cy, r, fn) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  fn();
  ctx.restore();
}

function withFeatheredCircle(ctx, cx, cy, r, feather, fn) {
  // feather: 0=硬边, 1=完全羽化到边缘；默认 0.85
  const f = typeof feather === 'number' ? feather : 0.85;
  const innerR = Math.max(0, r * (1 - f));
  const g = ctx.createRadialGradient(cx, cy, innerR, cx, cy, r);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-in';
  fn();
  ctx.restore();
}

function drawFromSource(ctx, source, sx, sy, sw, sh, dx, dy, dw, dh) {
  if (source && source.useCanvas) {
    const scaleX = source.rect.w / source.imageSize.w;
    const scaleY = source.rect.h / source.imageSize.h;
    const csx = source.rect.x + sx * scaleX;
    const csy = source.rect.y + sy * scaleY;
    ctx.drawImage(source.canvas, csx, csy, sw * scaleX, sh * scaleY, dx, dy, dw, dh);
    return;
  }
  ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh);
}

const handlers = {
  recolor(ctx, source, diff) {
    const { x, y, r, color, blendAlpha = 0.65, feather = 0.85 } = diff;
    const innerR = Math.max(0, r * (1 - feather));
    const g = ctx.createRadialGradient(x, y, innerR, x, y, r);
    const toRgba = (hex, a) => {
      const h = hex.replace('#', '');
      const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
      return `rgba(${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}, ${a})`;
    };
    g.addColorStop(0, toRgba(color, blendAlpha));
    g.addColorStop(1, toRgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  },
  patch(ctx, source, diff) {
    // 用 source 的另一处覆盖到 (x,y) 位置，边缘羽化
    const { x, y, r, sampleFrom, feather = 0.75 } = diff;
    const sx = sampleFrom.x - r;
    const sy = sampleFrom.y - r;
    withFeatheredCircle(ctx, x, y, r, feather, () => {
      drawFromSource(ctx, source, sx, sy, r * 2, r * 2, x - r, y - r, r * 2, r * 2);
    });
  },
  overlay(ctx, source, diff) {
    const { x, y, r, icon } = diff;
    const fn = ICONS[icon];
    if (fn) fn(ctx, x, y, r);
  },
  blur(ctx, source, diff) {
    const { x, y, r, passes = 3 } = diff;
    // 用降采样再放大模拟模糊
    const off = (typeof OffscreenCanvas !== 'undefined')
      ? new OffscreenCanvas(r * 2, r * 2)
      : (function () {
        const c = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
        if (!c) return null;
        c.width = r * 2; c.height = r * 2; return c;
      })();
    if (!off) {
      // 兜底：半透明色块
      withCircleClip(ctx, x, y, r, () => {
        ctx.fillStyle = 'rgba(40,40,60,0.55)';
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      });
      return;
    }
    const octx = off.getContext('2d');
    drawFromSource(octx, source, x - r, y - r, r * 2, r * 2, 0, 0, r * 2, r * 2);
    for (let i = 0; i < passes; i++) {
      octx.drawImage(off, 0, 0, r * 2, r * 2, 0, 0, r, r);
      octx.drawImage(off, 0, 0, r, r, 0, 0, r * 2, r * 2);
    }
    withCircleClip(ctx, x, y, r, () => {
      ctx.drawImage(off, x - r, y - r, r * 2, r * 2);
    });
  },
  mirror(ctx, source, diff) {
    const { x, y, r } = diff;
    withCircleClip(ctx, x, y, r, () => {
      ctx.save();
      ctx.translate(x * 2, 0);
      ctx.scale(-1, 1);
      drawFromSource(ctx, source, x - r, y - r, r * 2, r * 2, x - r, y - r, r * 2, r * 2);
      ctx.restore();
    });
  },
  shape(ctx, source, diff) {
    const { x, y, r, shape, color = '#222' } = diff;
    ctx.save();
    ctx.fillStyle = color;
    if (shape === 'circle') {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    } else if (shape === 'rect') {
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    } else if (shape === 'cross') {
      ctx.lineWidth = Math.max(2, r * 0.4);
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r);
      ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r);
      ctx.stroke();
    }
    ctx.restore();
  },
};

async function paintB(env, sourceImage, size, diffs) {
  const off = env.createOffscreenCanvas(size.w, size.h);
  off.width = size.w;
  off.height = size.h;
  const ctx = off.getContext('2d');
  const sw = sourceImage.width || size.w;
  const sh = sourceImage.height || size.h;
  ctx.drawImage(sourceImage, 0, 0, sw, sh, 0, 0, size.w, size.h);
  applyDiffs(ctx, sourceImage, diffs);
  if (env.toDrawable) {
    return env.toDrawable(off);
  }
  return off;
}

// 在主屏 canvas 上绘制 B 图：先复制上图区域，再叠差异
function renderBPanel(ctx, sourceImage, aRect, bRect, size, diffs) {
  const canvas = ctx.canvas;
  const { w, h } = size;
  ctx.drawImage(canvas, aRect.x, aRect.y, aRect.w, aRect.h, bRect.x, bRect.y, bRect.w, bRect.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(bRect.x, bRect.y, bRect.w, bRect.h);
  ctx.clip();
  ctx.translate(bRect.x, bRect.y);
  ctx.scale(bRect.w / w, bRect.h / h);
  ctx.globalCompositeOperation = 'source-over';
  const sampleSource = {
    useCanvas: true,
    canvas,
    rect: aRect,
    imageSize: size,
  };
  applyDiffs(ctx, sourceImage, diffs, sampleSource);
  ctx.restore();
}

function applyDiffs(ctx, sourceImage, diffs, sampleSource) {
  const source = sampleSource || sourceImage;
  for (const d of diffs) {
    const h = handlers[d.type] || handlers.recolor;
    h(ctx, source, d);
  }
}

module.exports = { paintB, renderBPanel, applyDiffs, ICONS };
