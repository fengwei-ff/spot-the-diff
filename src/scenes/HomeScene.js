const chapters = require('../../levels/chapters.js');
const ScrollController = require('../core/ScrollController.js');
const ChapterScene = require('./ChapterScene.js');

const PADDING = 16;
const FOOTER_GAP = 24;

class HomeScene {
  constructor({ sceneManager, canvasManager, env, progress = {} }) {
    this.sceneManager = sceneManager;
    this.canvasManager = canvasManager;
    this.env = env;
    this.progress = progress;
    this.chapters = chapters;
    this.toast = null;
    this.toastUntil = 0;
    this.scroll = new ScrollController();
    this._tapX = null;
    this._tapY = null;
    this.initLayout();
  }

  initLayout() {
    const { width, height, safeBottom, capsuleCenterY } = this.canvasManager;
    // 标题→飘带→副标题 紧凑排布，避免与卡片间留大空隙
    this.subtitleY = capsuleCenterY + 50;
    this.headerH = this.subtitleY + 2;
    this.cardH = 160;
    this.cards = this.chapters.map((ch, i) => ({
      data: ch,
      x: PADDING,
      y: PADDING + i * (this.cardH + PADDING), // y 相对于内容区
      w: width - PADDING * 2,
      h: this.cardH,
      index: i,
    }));
    const last = this.cards[this.cards.length - 1];
    const contentH = (last.y + last.h) + safeBottom + FOOTER_GAP;
    const viewportH = height - this.headerH;
    this.scroll.setBounds(contentH, viewportH);
  }

  onTouchStart({ x, y }) {
    this._tapX = x;
    this._tapY = y;
    if (y < this.headerH) return;
    this.scroll.onTouchStart(y);
  }

  onTouchMove({ y }) {
    this.scroll.onTouchMove(y);
  }

  onTouchEnd() {
    const wasDragging = this.scroll.dragging;
    const isTap = this.scroll.isTap();
    this.scroll.onTouchEnd();
    if (!wasDragging || !isTap) return;
    const x = this._tapX, y = this._tapY;
    if (x == null || y == null) return;
    const localY = y - this.headerH + this.scroll.scrollY;
    for (const c of this.cards) {
      if (x >= c.x && x <= c.x + c.w && localY >= c.y && localY <= c.y + c.h) {
        if (!c.data.available) {
          this.toast = '敬请期待';
          this.toastUntil = Date.now() + 1200;
          return;
        }
        this.sceneManager.push(new ChapterScene({
          sceneManager: this.sceneManager,
          canvasManager: this.canvasManager,
          env: this.env,
          progress: this.progress,
          chapter: c.data.data,
        }));
        return;
      }
    }
  }

  update(dt) {
    this.scroll.update(dt);
  }

  render(ctx) {
    const { width, height } = this.canvasManager;
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#0d0d18');
    bg.addColorStop(1, '#06060c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, this.headerH, width, height - this.headerH);
    ctx.clip();
    for (const c of this.cards) {
      const cy = this.headerH + c.y - this.scroll.scrollY;
      if (cy + c.h < this.headerH || cy > height) continue;
      this.drawCard(ctx, c, cy);
    }
    ctx.restore();

    const { capsuleCenterY } = this.canvasManager;
    ctx.fillStyle = '#0d0d18';
    ctx.fillRect(0, 0, width, this.headerH);

    this.drawBrand(ctx, capsuleCenterY);

    ctx.fillStyle = '#9aa';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('选择今晚要打开的剧本', PADDING, this.subtitleY);

    if (this.toast && Date.now() < this.toastUntil) this.drawToast(ctx, this.toast);
  }

  drawBrand(ctx, titleY) {
    const title = '剧迷找不同';

    // 标题：金色竖向渐变 + 深色描边与投影，质感更厚重
    ctx.save();
    ctx.font = 'bold 18px "STKaiti", "KaiTi", serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const titleW = ctx.measureText(title).width;
    const grad = ctx.createLinearGradient(0, titleY - 14, 0, titleY + 14);
    grad.addColorStop(0, '#fbe8b6');
    grad.addColorStop(0.5, '#ecca7c');
    grad.addColorStop(1, '#c89a3e');
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1.5;
    ctx.fillStyle = grad;
    ctx.fillText(title, PADDING, titleY);
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = 'rgba(90,62,18,0.5)';
    ctx.strokeText(title, PADDING, titleY);
    ctx.restore();

    // 飘带：上移与标题底部略重合，长度与标题一致
    this.drawRibbon(ctx, PADDING, titleY + 12, '', titleW);
  }

  drawRibbon(ctx, x, cy, text, width) {
    ctx.save();
    const span = width != null ? width : 120;
    const left = x;
    const right = x + span;
    const th = 3; // 右端（最粗处）厚度
    const baseAmp = 1.8; // 摆幅基准
    const k = (Math.PI * 2 * 1.6) / span; // 波数
    const segs = 44;

    const t = (px) => (px - left) / span; // 0(左)→1(右)
    const amp = (px) => baseAmp * (0.6 + 1.4 * t(px));
    // 左细右粗
    const half = (px) => Math.max(0.4, (th / 2) * (0.28 + 0.72 * t(px)));
    const mid = (px) => cy + amp(px) * Math.sin((px - left) * k);
    const top = (px) => mid(px) - half(px);
    const bot = (px) => mid(px) + half(px);

    const buildPath = (dy = 0) => {
      ctx.beginPath();
      ctx.moveTo(left, top(left) + dy);
      for (let i = 1; i <= segs; i++) {
        const px = left + (span * i) / segs;
        ctx.lineTo(px, top(px) + dy);
      }
      for (let i = segs; i >= 0; i--) {
        const px = left + (span * i) / segs;
        ctx.lineTo(px, bot(px) + dy);
      }
      ctx.closePath();
    };

    // 投影（同样向远端收窄）
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    buildPath(2);
    ctx.fill();

    // 主带：左端轻淡、右端更实
    const g = ctx.createLinearGradient(left, 0, right, 0);
    g.addColorStop(0, 'rgba(216,88,74,0.72)');
    g.addColorStop(0.5, 'rgba(190,54,46,0.9)');
    g.addColorStop(1, 'rgba(150,32,28,0.98)');
    ctx.fillStyle = g;
    buildPath(0);
    ctx.fill();

    // 顶部高光波纹，随距离渐隐
    const gh = ctx.createLinearGradient(left, 0, right, 0);
    gh.addColorStop(0, 'rgba(255,214,205,0.55)');
    gh.addColorStop(1, 'rgba(255,214,205,0)');
    ctx.strokeStyle = gh;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= segs; i++) {
      const px = left + (span * i) / segs;
      const py = top(px) + 1;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    if (text) {
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#ffe6c2';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, (left + right) / 2, cy + 0.5);
    }
    ctx.restore();
  }

  roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  drawCard(ctx, c, cy) {
    const ch = c.data;
    const g = ctx.createLinearGradient(c.x, cy, c.x, cy + c.h);
    g.addColorStop(0, ch.palette[0]);
    g.addColorStop(1, ch.palette[1]);
    ctx.fillStyle = g;
    ctx.fillRect(c.x, cy, c.w, c.h);

    ctx.fillStyle = ch.accent;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(c.x, cy, 6, c.h);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = ch.available ? ch.accent : '#3a3a4a';
    ctx.lineWidth = 1;
    ctx.strokeRect(c.x + 0.5, cy + 0.5, c.w - 1, c.h - 1);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = ch.available ? '#f0e6cf' : '#7a7a88';
    ctx.font = 'bold 22px serif';
    ctx.fillText(ch.title, c.x + 24, cy + 22);

    ctx.fillStyle = ch.available ? '#bcb29a' : '#5a5a68';
    ctx.font = '13px sans-serif';
    ctx.fillText(ch.subtitle, c.x + 24, cy + 56);

    if (ch.available && ch.data) {
      const total = ch.data.levels.length;
      let cleared = 0; let stars = 0;
      for (const lv of ch.data.levels) {
        const p = this.progress[lv.levelId];
        if (p && p.stars > 0) { cleared++; stars += p.stars; }
      }
      const barX = c.x + 24;
      const barY = cy + c.h - 38;
      const barW = c.w - 48;
      const barH = 4;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = ch.accent;
      ctx.fillRect(barX, barY, barW * (cleared / total), barH);
      ctx.fillStyle = '#bcb29a';
      ctx.font = '12px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(`${cleared}/${total} 关  ${stars}⭐`, barX, barY + 10);
    } else {
      ctx.fillStyle = '#5a5a68';
      ctx.font = '12px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText('敬请期待', c.x + 24, cy + c.h - 28);
    }
  }

  drawToast(ctx, text) {
    const { width, height } = this.canvasManager;
    const w = 160, h = 44;
    const x = width / 2 - w / 2;
    const y = height / 2 - h / 2;
    ctx.fillStyle = 'rgba(20,20,32,0.92)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#3a3a5a';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = '#e6d8a8';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
  }
}

module.exports = HomeScene;
