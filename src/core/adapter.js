// 平台适配：在微信小游戏环境与浏览器/Node demo 环境之间统一接口
function detect() {
  const isWx = typeof wx !== 'undefined' && typeof wx.createCanvas === 'function';
  if (isWx) {
    const info = wx.getSystemInfoSync();
    // 计算顶部安全区（避开胶囊按钮）
    let topInset = info.statusBarHeight || 20;
    try {
      const cap = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      if (cap && cap.bottom) topInset = cap.bottom + 6;
    } catch (e) { /* ignore */ }
    const sa = info.safeArea || { bottom: info.windowHeight };
    const bottomInset = Math.max(0, info.windowHeight - sa.bottom);
    return {
      isWx: true,
      screenWidth: info.windowWidth,
      screenHeight: info.windowHeight,
      pixelRatio: info.pixelRatio || 1,
      safeAreaTop: topInset,
      safeAreaBottom: bottomInset,
      createCanvas: () => wx.createCanvas(),
      createOffscreenCanvas: (w, h) => {
        // 优先使用真正的离屏 canvas；小游戏里 wx.createCanvas() 拿到的是主屏 canvas，
        // 把它再 drawImage 回主屏在某些机型/版本上会出现黑色块。
        if (typeof wx.createOffscreenCanvas === 'function') {
          try {
            const c = wx.createOffscreenCanvas({ type: '2d', width: w, height: h });
            if (c) return c;
          } catch (e) {
            // 兜底旧版 API
            try {
              const c = wx.createOffscreenCanvas(w, h);
              if (c) return c;
            } catch (e2) { /* ignore */ }
          }
        }
        const c = wx.createCanvas();
        c.width = w; c.height = h;
        return c;
      },
      createImage: () => wx.createImage(),
      // 离屏 canvas 直接 drawImage 到主屏在小游戏里不稳定，转成 Image 再绘制
      toDrawable: (canvas) => new Promise((resolve, reject) => {
        try {
          if (!canvas || typeof canvas.toDataURL !== 'function') {
            resolve(canvas);
            return;
          }
          const img = wx.createImage();
          img.onload = () => resolve(img);
          img.onerror = (e) => reject(e);
          img.src = canvas.toDataURL('image/png');
        } catch (e) {
          reject(e);
        }
      }),
      requestAnimationFrame: (cb) => (typeof requestAnimationFrame !== 'undefined'
        ? requestAnimationFrame(cb)
        : setTimeout(cb, 16)),
      onTouchStart: (cb) => wx.onTouchStart(cb),
      onTouchMove: (cb) => wx.onTouchMove(cb),
      onTouchEnd: (cb) => wx.onTouchEnd(cb),
      readJSON: (path) => new Promise((resolve, reject) => {
        const fs = wx.getFileSystemManager();
        fs.readFile({
          filePath: path,
          encoding: 'utf8',
          success: (res) => {
            try { resolve(JSON.parse(res.data)); } catch (e) { reject(e); }
          },
          fail: reject,
        });
      }),
    };
  }
  // 浏览器降级（用于本地 demo）
  const canvasEl = (typeof document !== 'undefined') ? document.getElementById('game') : null;
  return {
    isWx: false,
    screenWidth: canvasEl ? canvasEl.width : 750,
    screenHeight: canvasEl ? canvasEl.height : 1334,
    pixelRatio: (typeof window !== 'undefined' && window.devicePixelRatio) || 1,
    safeAreaTop: 0,
    safeAreaBottom: 0,
    createCanvas: () => canvasEl,
    createOffscreenCanvas: (w, h) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      return c;
    },
    createImage: () => new Image(),
    toDrawable: (canvas) => Promise.resolve(canvas),
    requestAnimationFrame: (cb) => requestAnimationFrame(cb),
    onTouchStart: (cb) => {
      if (!canvasEl) return;
      canvasEl._tsCb = cb;
      const handler = (clientX, clientY) => {
        const rect = canvasEl.getBoundingClientRect();
        cb({ touches: [{ clientX: clientX - rect.left, clientY: clientY - rect.top }] });
      };
      canvasEl.addEventListener('mousedown', (e) => { canvasEl._mouseDown = true; handler(e.clientX, e.clientY); });
      canvasEl.addEventListener('touchstart', (e) => {
        const t = e.touches[0]; if (t) handler(t.clientX, t.clientY);
      });
    },
    onTouchMove: (cb) => {
      if (!canvasEl) return;
      const handler = (clientX, clientY) => {
        const rect = canvasEl.getBoundingClientRect();
        cb({ touches: [{ clientX: clientX - rect.left, clientY: clientY - rect.top }] });
      };
      canvasEl.addEventListener('mousemove', (e) => {
        if (!canvasEl._mouseDown) return;
        handler(e.clientX, e.clientY);
      });
      canvasEl.addEventListener('touchmove', (e) => {
        const t = e.touches[0]; if (t) handler(t.clientX, t.clientY);
      });
    },
    onTouchEnd: (cb) => {
      if (!canvasEl) return;
      const handler = () => cb({});
      canvasEl.addEventListener('mouseup', () => { canvasEl._mouseDown = false; handler(); });
      canvasEl.addEventListener('mouseleave', () => { if (canvasEl._mouseDown) { canvasEl._mouseDown = false; handler(); } });
      canvasEl.addEventListener('touchend', handler);
      canvasEl.addEventListener('touchcancel', handler);
    },
    readJSON: (path) => fetch(path).then((r) => r.json()),
  };
}

module.exports = { detect };
