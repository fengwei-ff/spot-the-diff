const chapters = require('../../levels/chapters.js');
const ScrollController = require('../core/ScrollController.js');
const ChapterScene = require('./ChapterScene.js');
const AudioManager = require('../audio/AudioManager.js');
const BackgroundCache = require('../render/BackgroundCache.js');
const { drawHeaderBand } = require('../render/SceneBackground.js');
const { RULES } = require('../config/playRules.js');
const { wrapText } = require('../render/TextHelper.js');

const PADDING = 16;
const FOOTER_GAP = 24;
const SETTINGS_BTN_SIZE = 32;
const RULES_BTN_W = SETTINGS_BTN_SIZE;
const HEADER_BTN_GAP = 8;
const CAPSULE_BOTTOM_GAP = 14;

class HomeScene {
  constructor({ sceneManager, canvasManager, env, progress = {}, audio }) {
    this.sceneManager = sceneManager;
    this.canvasManager = canvasManager;
    this.env = env;
    this.progress = progress;
    this.audio = audio || AudioManager.getInstance(env);
    this.chapters = chapters;
    this.toast = null;
    this.toastUntil = 0;
    this.settingsModal = false;
    this.rulesModal = false;
    this.rulesLayout = null;
    this.bgPhase = 0;
    this.bgCache = new BackgroundCache(env, canvasManager.width, canvasManager.height, canvasManager.dpr);
    this.scroll = new ScrollController();
    this._tapX = null;
    this._tapY = null;
    this.initLayout();
  }

  initLayout() {
    const { width, height, safeBottom, capsuleCenterY, capsule } = this.canvasManager;
    // 设置按钮顶部与胶囊底部保持间距，副标题与按钮同一行
    this.settingsRowTop = capsule.bottom + CAPSULE_BOTTOM_GAP;
    this.subtitleY = this.settingsRowTop + SETTINGS_BTN_SIZE - 6;
    this.headerH = this.settingsRowTop + SETTINGS_BTN_SIZE + 10;
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

  settingsBtnRect() {
    const { width } = this.canvasManager;
    const cardRight = width - PADDING;
    return {
      x: cardRight - SETTINGS_BTN_SIZE,
      y: this.settingsRowTop,
      w: SETTINGS_BTN_SIZE,
      h: SETTINGS_BTN_SIZE,
    };
  }

  rulesBtnRect() {
    const settings = this.settingsBtnRect();
    return {
      x: settings.x - HEADER_BTN_GAP - RULES_BTN_W,
      y: settings.y,
      w: RULES_BTN_W,
      h: settings.h,
    };
  }

  settingsModalRects() {
    const { width, height } = this.canvasManager;
    const boxW = Math.min(300, width - 48);
    const boxH = 220;
    const box = {
      x: (width - boxW) / 2,
      y: (height - boxH) / 2,
      w: boxW,
      h: boxH,
    };
    const rowH = 44;
    const rowStartY = box.y + 56;
    const toggleW = 48;
    const toggleH = 26;
    const rows = [
      { key: 'bgm', label: '背景音乐', y: rowStartY },
      { key: 'sfx', label: '音效', y: rowStartY + rowH },
      { key: 'fx', label: '点击动效', y: rowStartY + rowH * 2 },
    ].map((row) => ({
      ...row,
      toggle: {
        x: box.x + box.w - 24 - toggleW,
        y: row.y + (rowH - toggleH) / 2,
        w: toggleW,
        h: toggleH,
        key: row.key,
      },
    }));
    const close = {
      x: box.x + box.w - 36,
      y: box.y + 10,
      w: 26,
      h: 26,
    };
    return { box, rows, close };
  }

  rulesModalRects() {
    if (this.rulesLayout) return this.rulesLayout;
    const { width, height } = this.canvasManager;
    const ctx = this.canvasManager.ctx;
    return this._buildRulesLayout(ctx, width, height);
  }

  _buildRulesLayout(ctx, width, height) {
    const boxW = Math.min(320, width - 40);
    const padX = 20;
    const padTop = 52;
    const padBottom = 24;
    const contentW = boxW - padX * 2;
    const fontSize = 13;
    const lineH = 20;
    const itemGap = 6;

    ctx.font = `${fontSize}px sans-serif`;
    const blocks = RULES.map((rule, i) => wrapText(ctx, `${i + 1}. ${rule}`, contentW, fontSize));

    let contentH = 0;
    blocks.forEach((lines, i) => {
      contentH += lines.length * lineH;
      if (i < blocks.length - 1) contentH += itemGap;
    });

    const boxH = Math.min(padTop + contentH + padBottom, height - 48);
    const box = {
      x: (width - boxW) / 2,
      y: (height - boxH) / 2,
      w: boxW,
      h: boxH,
    };
    const close = {
      x: box.x + box.w - 36,
      y: box.y + 10,
      w: 26,
      h: 26,
    };
    const layout = {
      box,
      close,
      blocks,
      lineH,
      itemGap,
      fontSize,
      padX,
      padTop,
      padBottom,
      contentH: boxH - padTop - padBottom,
    };
    this.rulesLayout = layout;
    return layout;
  }

  hit(rect, x, y) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  onTouchStart({ x, y }) {
    this._tapX = x;
    this._tapY = y;
    if (this.settingsModal || this.rulesModal) return;
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
    const x = this._tapX;
    const y = this._tapY;
    if (x == null || y == null) return;

    if (this.settingsModal || this.rulesModal) {
      if (this.rulesModal) this.handleRulesTouch(x, y);
      else this.handleSettingsTouch(x, y);
      return;
    }

    if (this.hit(this.rulesBtnRect(), x, y)) {
      this.audio.playSfx('tap');
      this.rulesLayout = null;
      this.rulesModal = true;
      return;
    }

    if (this.hit(this.settingsBtnRect(), x, y)) {
      this.audio.playSfx('tap');
      this.settingsModal = true;
      return;
    }

    if (!wasDragging || !isTap) return;
    const localY = y - this.headerH + this.scroll.scrollY;
    for (const c of this.cards) {
      if (x >= c.x && x <= c.x + c.w && localY >= c.y && localY <= c.y + c.h) {
        if (!c.data.available) {
          this.audio.playSfx('tap');
          this.toast = '敬请期待';
          this.toastUntil = Date.now() + 1200;
          return;
        }
        this.audio.playSfx('tap');
        this.sceneManager.push(new ChapterScene({
          sceneManager: this.sceneManager,
          canvasManager: this.canvasManager,
          env: this.env,
          progress: this.progress,
          chapter: c.data.data,
          audio: this.audio,
        }));
        return;
      }
    }
  }

  handleSettingsTouch(x, y) {
    const { box, rows, close } = this.settingsModalRects();
    if (this.hit(close, x, y)) {
      this.audio.playSfx('tap');
      this.settingsModal = false;
      return;
    }
    const inBox = this.hit(box, x, y);
    for (const row of rows) {
      if (this.hit(row.toggle, x, y)) {
        this.audio.playSfx('tap');
        if (row.key === 'bgm') this.audio.setBgmEnabled(!this.audio.bgmEnabled);
        else if (row.key === 'sfx') this.audio.setSfxEnabled(!this.audio.sfxEnabled);
        else if (row.key === 'fx') this.audio.setFxEnabled(!this.audio.fxEnabled);
        return;
      }
    }
    if (!inBox) {
      this.settingsModal = false;
    }
  }

  handleRulesTouch(x, y) {
    const { box, close } = this.rulesModalRects();
    if (this.hit(close, x, y)) {
      this.audio.playSfx('tap');
      this.rulesModal = false;
      this.rulesLayout = null;
      return;
    }
    if (!this.hit(box, x, y)) {
      this.rulesModal = false;
      this.rulesLayout = null;
    }
  }

  update(dt) {
    this.bgPhase += dt * 0.004;
    this.scroll.update(dt);
  }

  render(ctx) {
    const { width, height } = this.canvasManager;
    const bg = this.bgCache.get(width, height, this.bgPhase, this.canvasManager.dpr);
    ctx.drawImage(bg, 0, 0, width, height);

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
    drawHeaderBand(ctx, 0, 0, width, this.headerH);

    this.drawBrand(ctx, capsuleCenterY);

    ctx.fillStyle = '#6a7a8a';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('选择今晚要打开的剧本', PADDING, this.subtitleY);

    this.drawRulesBtn(ctx);
    this.drawSettingsBtn(ctx);

    if (this.settingsModal) this.renderSettingsModal(ctx);
    if (this.rulesModal) this.renderRulesModal(ctx);
    if (this.toast && Date.now() < this.toastUntil) this.drawToast(ctx, this.toast);
  }

  drawDocIcon(ctx, cx, cy) {
    const w = 10;
    const h = 12;
    const left = cx - w / 2;
    const top = cy - h / 2;
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeRect(left, top, w, h);
    ctx.beginPath();
    ctx.moveTo(left + w - 3.5, top);
    ctx.lineTo(left + w - 3.5, top + 3.5);
    ctx.lineTo(left + w, top + 3.5);
    ctx.stroke();
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const ly = top + 4.5 + i * 2.8;
      ctx.beginPath();
      ctx.moveTo(left + 2, ly);
      ctx.lineTo(left + w - 2 - (i === 0 ? 2 : 0), ly);
      ctx.stroke();
    }
  }

  drawRulesBtn(ctx) {
    const btn = this.rulesBtnRect();
    ctx.save();
    this.roundRectPath(ctx, btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fillStyle = 'rgba(78, 205, 196, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();

    this.drawDocIcon(ctx, btn.x + btn.w / 2, btn.y + btn.h / 2);
    ctx.restore();
  }

  drawSettingsBtn(ctx) {
    const btn = this.settingsBtnRect();
    ctx.save();
    this.roundRectPath(ctx, btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,176,116,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const cx = btn.x + btn.w / 2;
    const cy = btn.y + btn.h / 2;
    const r = 7;
    ctx.strokeStyle = '#c8b074';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x1 = cx + Math.cos(angle) * (r - 2);
      const y1 = cy + Math.sin(angle) * (r - 2);
      const x2 = cx + Math.cos(angle) * (r + 3);
      const y2 = cy + Math.sin(angle) * (r + 3);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  renderSettingsModal(ctx) {
    const { width, height } = this.canvasManager;
    const { box, rows, close } = this.settingsModalRects();

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, width, height);

    this.roundRectPath(ctx, box.x, box.y, box.w, box.h, 10);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#e6d8a8';
    ctx.font = 'bold 17px serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('设置', box.x + 20, box.y + 28);

    ctx.strokeStyle = '#9aa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(close.x + 6, close.y + 6);
    ctx.lineTo(close.x + close.w - 6, close.y + close.h - 6);
    ctx.moveTo(close.x + close.w - 6, close.y + 6);
    ctx.lineTo(close.x + 6, close.y + close.h - 6);
    ctx.stroke();

    for (const row of rows) {
      ctx.fillStyle = '#cdd';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(row.label, box.x + 20, row.y + 22);
      const on = row.key === 'bgm' ? this.audio.bgmEnabled
        : row.key === 'sfx' ? this.audio.sfxEnabled
          : this.audio.fxEnabled;
      this.drawToggle(ctx, row.toggle, on);
    }
  }

  renderRulesModal(ctx) {
    const { width, height } = this.canvasManager;
    const layout = this._buildRulesLayout(ctx, width, height);
    const {
      box, close, blocks, lineH, itemGap, fontSize, padX, padTop, contentH,
    } = layout;

    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, width, height);

    this.roundRectPath(ctx, box.x, box.y, box.w, box.h, 12);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#e6d8a8';
    ctx.font = 'bold 17px serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('玩法说明', box.x + padX, box.y + 28);

    ctx.strokeStyle = '#9aa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(close.x + 6, close.y + 6);
    ctx.lineTo(close.x + close.w - 6, close.y + close.h - 6);
    ctx.moveTo(close.x + close.w - 6, close.y + 6);
    ctx.lineTo(close.x + 6, close.y + close.h - 6);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x + padX, box.y + padTop, box.w - padX * 2, contentH);
    ctx.clip();

    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#b8c8d8';
    let y = box.y + padTop;
    blocks.forEach((lines, i) => {
      for (const line of lines) {
        ctx.fillText(line, box.x + padX, y);
        y += lineH;
      }
      if (i < blocks.length - 1) y += itemGap;
    });
    ctx.restore();
  }

  drawToggle(ctx, rect, on) {
    const { x, y, w, h } = rect;
    this.roundRectPath(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = on ? 'rgba(200,176,116,0.85)' : 'rgba(80,80,100,0.6)';
    ctx.fill();

    const knobR = h / 2 - 3;
    const knobCx = on ? x + w - knobR - 3 : x + knobR + 3;
    const knobCy = y + h / 2;
    ctx.beginPath();
    ctx.arc(knobCx, knobCy, knobR, 0, Math.PI * 2);
    ctx.fillStyle = on ? '#1a1a2e' : '#ccc';
    ctx.fill();
  }

  drawBrand(ctx, titleY) {
    const title = '剧迷找不同';

    // 标题：金色竖向渐变 + 深色描边与投影，质感更厚重
    ctx.save();
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const titleW = ctx.measureText(title).width;
    const grad = ctx.createLinearGradient(0, titleY - 14, 0, titleY + 14);
    grad.addColorStop(0, '#ff8c42');
    grad.addColorStop(0.5, '#ff6b6b');
    grad.addColorStop(1, '#ee5a6f');
    ctx.shadowColor = 'rgba(47,128,200,0.2)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = grad;
    ctx.fillText(title, PADDING, titleY);
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 0;
    ctx.strokeStyle = 'transparent';
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
    const radius = 12;

    ctx.save();
    ctx.shadowColor = 'rgba(47,128,200,0.12)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    const g = ctx.createLinearGradient(c.x, cy, c.x, cy + c.h);
    g.addColorStop(0, ch.palette[0]);
    g.addColorStop(1, ch.palette[1]);
    ctx.fillStyle = g;
    this.roundRectPath(ctx, c.x, cy, c.w, c.h, radius);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = ch.available ? `${ch.accent}55` : 'rgba(180,190,200,0.6)';
    ctx.lineWidth = 1.5;
    this.roundRectPath(ctx, c.x + 0.5, cy + 0.5, c.w - 1, c.h - 1, radius);
    ctx.stroke();

    ctx.fillStyle = ch.accent;
    ctx.globalAlpha = ch.available ? 0.9 : 0.35;
    this.roundRectPath(ctx, c.x, cy, 6, c.h, radius);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = ch.available ? '#2f4a5f' : '#9aa8b5';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(ch.title, c.x + 24, cy + 22);

    ctx.fillStyle = ch.available ? '#7a8a9a' : '#b0b8c0';
    ctx.font = '13px sans-serif';
    ctx.fillText(ch.subtitle, c.x + 24, cy + 56);

    if (ch.available && ch.data) {
      const total = ch.data.levels.length;
      let cleared = 0;
      for (const lv of ch.data.levels) {
        const p = this.progress[lv.levelId];
        if (p && p.stars > 0) cleared++;
      }
      const barX = c.x + 24;
      const barY = cy + c.h - 38;
      const barW = c.w - 48;
      const barH = 6;
      this.roundRectPath(ctx, barX, barY, barW, barH, 3);
      ctx.fillStyle = 'rgba(90,170,230,0.18)';
      ctx.fill();
      this.roundRectPath(ctx, barX, barY, barW * (cleared / total), barH, 3);
      ctx.fillStyle = ch.accent;
      ctx.fill();
      ctx.fillStyle = '#7a8a9a';
      ctx.font = '12px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(`${cleared}/${total} 关`, barX, barY + 10);
    } else {
      ctx.fillStyle = '#b0b8c0';
      ctx.font = '12px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText('敬请期待', c.x + 24, cy + c.h - 28);
    }
  }

  drawToast(ctx, text) {
    const { width, height } = this.canvasManager;
    const w = 160;
    const h = 44;
    const x = width / 2 - w / 2;
    const y = height / 2 - h / 2;
    this.roundRectPath(ctx, x, y, w, h, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,170,230,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#5a6a7a';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
  }
}

module.exports = HomeScene;
