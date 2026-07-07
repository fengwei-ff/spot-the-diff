#!/usr/bin/env python3
"""合成 650x250 通用素材封面，无文字无 Logo。"""
import os
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

W, H = 650, 250
MAX_BYTES = 80 * 1024
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make_sky_bg():
    img = Image.new('RGB', (W, H))
    px = img.load()
    top = (168, 216, 240)
    mid = (212, 236, 250)
    bot = (238, 248, 255)
    for y in range(H):
        t = y / (H - 1)
        c = lerp(lerp(top, mid, min(1, t * 1.6)), bot, max(0, (t - 0.35) / 0.65))
        for x in range(W):
            px[x, y] = c
    return img


def paste_cover(img, src_path, box, radius=10):
    src = Image.open(src_path).convert('RGB')
    bw, bh = box[2] - box[0], box[3] - box[1]
    scale = max(bw / src.width, bh / src.height)
    sw, sh = int(src.width * scale), int(src.height * scale)
    src = src.resize((sw, sh), Image.Resampling.LANCZOS)
    left = (sw - bw) // 2
    top = (sh - bh) // 2
    src = src.crop((left, top, left + bw, top + bh))

    mask = Image.new('L', (bw, bh), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, bw, bh), radius=radius, fill=255)
    img.paste(src, (box[0], box[1]), mask)
    return img


def draw_frame(draw, box, color, width=2):
    draw.rounded_rectangle(box, radius=10, outline=color, width=width)


def draw_magnifier(draw, cx, cy, r):
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(255, 140, 66), width=4)
    draw.line((cx + r * 0.65, cy + r * 0.65, cx + r * 1.55, cy + r * 1.55), fill=(255, 140, 66), width=5)


def draw_glow_circle(draw, cx, cy, r):
    for i in range(6, 0, -1):
        alpha = 30 + i * 8
        c = (78, 205, 196)
        col = tuple(min(255, int(v * alpha / 100)) for v in c)
        draw.ellipse((cx - r - i, cy - r - i, cx + r + i, cy + r + i), outline=col, width=1)


def draw_clouds(draw):
    clouds = [(90, 48, 1.0), (520, 36, 0.85), (380, 62, 0.7)]
    for cx, cy, s in clouds:
        for dx, dy, rad in [(0, 0, 18), (18, -6, 14), (34, 0, 16), (16, 8, 12)]:
            draw.ellipse(
                (cx + dx * s - rad * s, cy + dy * s - rad * s, cx + dx * s + rad * s, cy + dy * s + rad * s),
                fill=(255, 255, 255, 180) if hasattr(draw, 'fill') else (255, 255, 255),
            )


def build(output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img_a = os.path.join(ROOT, 'levels/images/archive_05.jpeg')
    img_b = os.path.join(ROOT, 'levels/images/archive_05_diff.jpeg')
    bg_blur = os.path.join(ROOT, 'levels/images/archive_07.jpg')

    canvas = make_sky_bg()

    # 虚化远景增加层次
    if os.path.exists(bg_blur):
        blur = Image.open(bg_blur).convert('RGB')
        blur = blur.resize((W, H), Image.Resampling.LANCZOS)
        blur = blur.filter(ImageFilter.GaussianBlur(14))
        blur = ImageEnhance.Brightness(blur).enhance(1.08)
        canvas = Image.blend(canvas, blur, 0.28)

    draw = ImageDraw.Draw(canvas)
    draw_clouds(draw)

    # 上下双图：体现找不同核心玩法
    panel_w, panel_h = 248, 88
    gap = 10
    left = (W - panel_w) // 2
    top_a = (H - panel_h * 2 - gap) // 2
    box_a = (left, top_a, left + panel_w, top_a + panel_h)
    box_b = (left, top_a + panel_h + gap, left + panel_w, top_a + panel_h * 2 + gap)

    canvas = paste_cover(canvas, img_a, box_a)
    canvas = paste_cover(canvas, img_b, box_b)
    draw = ImageDraw.Draw(canvas)
    draw_frame(draw, box_a, (255, 255, 255), 3)
    draw_frame(draw, box_b, (255, 255, 255), 3)
    draw_frame(draw, box_a, (90, 170, 230), 1)
    draw_frame(draw, box_b, (78, 205, 196), 1)

    # 差异高亮圈（右侧面板偏右区域）
    draw_glow_circle(draw, left + int(panel_w * 0.72), top_a + panel_h + gap + int(panel_h * 0.55), 14)

    # 放大镜
    draw_magnifier(draw, W - 78, H // 2 + 8, 22)

    # 装饰气泡
    bubbles = [(48, 190, 11, (255, 107, 107)), (600, 200, 9, (78, 205, 196)), (36, 58, 8, (255, 200, 87))]
    for bx, by, br, col in bubbles:
        draw.ellipse((bx - br, by - br, bx + br, by + br), fill=(*col, 40) if False else col)

    # 导出 JPG，控制 ≤80KB
    quality = 88
    while quality >= 50:
        canvas.save(output_path, 'JPEG', quality=quality, optimize=True, progressive=True)
        size = os.path.getsize(output_path)
        if size <= MAX_BYTES:
            print(f'OK {output_path} {size} bytes quality={quality}')
            return
        quality -= 4
    print(f'WARN: 仍超过 80KB ({os.path.getsize(output_path)} bytes)，已用最低质量', file=sys.stderr)


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'assets', 'promo', 'cover-650x250.jpg')
    build(out)
