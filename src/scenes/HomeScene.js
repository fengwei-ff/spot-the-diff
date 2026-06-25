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
    const { width, height, safeTop, safeBottom } = this.canvasManager;
    this.headerH = safeTop + 70;
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
    const { width, height, safeTop } = this.canvasManager;
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

    ctx.fillStyle = '#0d0d18';
    ctx.fillRect(0, 0, width, this.headerH);
    ctx.fillStyle = '#e6d8a8';
    ctx.font = 'bold 24px serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('剧迷找不同', PADDING, safeTop + 14);
    ctx.fillStyle = '#9aa';
    ctx.font = '13px sans-serif';
    ctx.fillText('选择今晚要打开的剧本', PADDING, safeTop + 44);

    if (this.toast && Date.now() < this.toastUntil) this.drawToast(ctx, this.toast);
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
