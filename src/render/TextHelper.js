// 正文/简介文字：统一字体栈与换行，提升 Canvas 中文清晰度
const BODY_FONT_FAMILY = '"PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif';
const BODY_FONT_SIZE = 14;
const BODY_LINE_HEIGHT = 22;
const BODY_COLOR = '#d0d0dc';

function applyBodyTextStyle(ctx, fontSize = BODY_FONT_SIZE) {
  ctx.font = `${fontSize}px ${BODY_FONT_FAMILY}`;
  ctx.textBaseline = 'top';
  if ('textRenderingOptimization' in ctx) {
    ctx.textRenderingOptimization = 'optimizeQuality';
  }
}

function wrapText(ctx, text, maxWidth, fontSize = BODY_FONT_SIZE) {
  if (!text) return [];
  applyBodyTextStyle(ctx, fontSize);
  const lines = [];
  let line = '';
  const normalized = text.replace(/\s+/g, '');
  for (const ch of normalized) {
    const next = line + ch;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = ch;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function clampLines(ctx, lines, maxLines, maxWidth, fontSize = BODY_FONT_SIZE) {
  if (lines.length <= maxLines) return lines;
  applyBodyTextStyle(ctx, fontSize);
  const clipped = lines.slice(0, maxLines);
  let last = clipped[maxLines - 1];
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
    last = last.slice(0, -1);
  }
  clipped[maxLines - 1] = `${last}…`;
  return clipped;
}

function drawBodyLines(ctx, lines, x, y, options = {}) {
  const {
    fontSize = BODY_FONT_SIZE,
    lineHeight = BODY_LINE_HEIGHT,
    color = BODY_COLOR,
    align = 'left',
  } = options;
  applyBodyTextStyle(ctx, fontSize);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  lines.forEach((line, i) => {
    const ly = Math.round(y + i * lineHeight) + 0.5;
    ctx.fillText(line, x, ly);
  });
}

function getLevelSubtitle(title) {
  if (!title) return '';
  const sep = title.indexOf(' · ');
  return sep >= 0 ? title.slice(sep + 3) : title;
}

module.exports = {
  BODY_FONT_FAMILY,
  BODY_FONT_SIZE,
  BODY_LINE_HEIGHT,
  BODY_COLOR,
  applyBodyTextStyle,
  wrapText,
  clampLines,
  drawBodyLines,
  getLevelSubtitle,
};
