#!/usr/bin/env python3
"""从原图离线生成像素对齐的差异图。

以原图为唯一基底，仅在指定差异点做局部修改，保证除差异圆外与原图 100% 一致。
变色类差异采用 HSV 色相替换（保留原始明暗与纹理，比半透明色块自然）。
"""

import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / 'levels' / 'images'

# 坐标基于关卡 imageSize（900×675），脚本按实际像素自动缩放
ARCHIVE_06 = {
    'imageA': 'archive_06.jpeg',
    'imageB': 'archive_06_diff.jpeg',
    'imageSize': {'w': 900, 'h': 675},
    'diffs': [
        # 油灯火焰：暖黄 → 亮蓝（色相替换 + 提亮提饱和）
        {'op': 'hue', 'x': 130, 'y': 466, 'r': 22, 'targetHue': 150,
         'satRef': 0.18, 'satScale': 1.35, 'valBoost': 1.12, 'feather': 0.6},
        # 胸前口袋上方新增纽扣
        {'op': 'shape', 'kind': 'button', 'x': 667, 'y': 400, 'r': 7},
        # 青花茶壶花纹：蓝 → 红（白瓷底因低饱和不受影响）
        {'op': 'hue', 'x': 186, 'y': 636, 'r': 36, 'targetHue': 2,
         'satRef': 0.11, 'satScale': 1.6, 'feather': 0.45},
        # 左墙字幅：受潮泛冷色调（色调变化）
        {'op': 'tint', 'x': 224, 'y': 145, 'r': 34, 'color': '#6f86ac',
         'blendAlpha': 0.6, 'feather': 0.6},
        # 礼帽男子帽色：深灰 → 棕（叠色，灰色饱和低无法用色相）
        {'op': 'tint', 'x': 299, 'y': 219, 'r': 26, 'color': '#6e4220',
         'blendAlpha': 0.82, 'feather': 0.45},
        # 相机旁新增白瓷茶杯
        {'op': 'shape', 'kind': 'cup', 'x': 586, 'y': 622, 'r': 18},
        # 肩带上的小铆钉
        {'op': 'shape', 'kind': 'rivet', 'x': 697, 'y': 307, 'r': 5},
        # 架子上麻布袋减少（从相邻处采样覆盖）
        {'op': 'patch', 'x': 30, 'y': 341, 'r': 30, 'sampleFrom': {'x': 95, 'y': 341}},
    ],
}


def hex_to_rgb(hex_color):
    h = hex_color.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def scale_diff(diff, sx, sy):
    out = dict(diff)
    out['x'] = diff['x'] * sx
    out['y'] = diff['y'] * sy
    out['r'] = diff['r'] * (sx + sy) / 2
    if 'sampleFrom' in diff:
        out['sampleFrom'] = {'x': diff['sampleFrom']['x'] * sx, 'y': diff['sampleFrom']['y'] * sy}
    return out


def feather_alpha(dist, r, feather, peak=1.0):
    inner_r = max(0.0, r * (1.0 - feather))
    alpha = np.zeros_like(dist, dtype=np.float32)
    alpha[dist <= inner_r] = peak
    between = (dist > inner_r) & (dist < r)
    if np.any(between):
        t = (dist[between] - inner_r) / max(r - inner_r, 1e-6)
        alpha[between] = peak * (1.0 - t)
    return alpha


def circle_dist(shape, x, y):
    h, w = shape
    yy, xx = np.ogrid[:h, :w]
    return np.sqrt((xx - x) ** 2 + (yy - y) ** 2)


def apply_hue(arr, diff):
    """HSV 色相替换：保留明暗(V)，按饱和度门控只改有色像素。"""
    x, y, r = diff['x'], diff['y'], diff['r']
    target = diff['targetHue']
    sat_ref = diff.get('satRef', 0.2)
    sat_scale = diff.get('satScale', 1.2)
    val_boost = diff.get('valBoost', 1.0)
    blend = diff.get('blendAlpha', 1.0)
    feather = diff.get('feather', 0.6)

    hsv = np.array(Image.fromarray(arr).convert('HSV')).astype(np.float32)
    s_norm = hsv[:, :, 1] / 255.0

    hsv2 = hsv.copy()
    hsv2[:, :, 0] = target
    hsv2[:, :, 1] = np.clip(hsv[:, :, 1] * sat_scale, 0, 255)
    hsv2[:, :, 2] = np.clip(hsv[:, :, 2] * val_boost, 0, 255)
    recolored = np.array(Image.fromarray(hsv2.astype(np.uint8), 'HSV').convert('RGB')).astype(np.float32)

    dist = circle_dist(arr.shape[:2], x, y)
    alpha = feather_alpha(dist, r, feather, blend)
    sat_gate = np.clip(s_norm / sat_ref, 0, 1)
    eff = (alpha * sat_gate)[:, :, None]
    arr[:] = np.clip(arr.astype(np.float32) * (1 - eff) + recolored * eff, 0, 255).astype(np.uint8)


def apply_tint(arr, diff):
    """正片叠底着色：用于低饱和区域(灰帽/纸张)的色调变化。"""
    x, y, r = diff['x'], diff['y'], diff['r']
    color = np.array(hex_to_rgb(diff['color']), dtype=np.float32)
    blend = diff.get('blendAlpha', 0.6)
    feather = diff.get('feather', 0.6)

    dist = circle_dist(arr.shape[:2], x, y)
    alpha = feather_alpha(dist, r, feather, blend)[:, :, None]
    tinted = arr.astype(np.float32) * (color / 255.0)
    arr[:] = np.clip(arr.astype(np.float32) * (1 - alpha) + tinted * alpha, 0, 255).astype(np.uint8)


def apply_shape(arr, diff):
    """绘制带阴影/高光的小物件，比纯色圆自然。"""
    kind = diff.get('kind', 'button')
    x, y, r = diff['x'], diff['y'], diff['r']
    img = Image.fromarray(arr).convert('RGBA')
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    if kind == 'button':
        draw.ellipse((x - r - 1, y - r + 2, x + r + 1, y + r + 3), fill=(0, 0, 0, 90))
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(54, 44, 36, 255))
        draw.ellipse((x - r, y - r, x + r, y + r), outline=(28, 22, 18, 255), width=1)
        hr = max(1, r // 3)
        draw.ellipse((x - hr, y - hr - 1, x, y - 1), fill=(120, 104, 88, 180))
    elif kind == 'cup':
        bw, bh = r * 1.5, r * 1.1
        draw.ellipse((x - bw * 0.6, y + bh * 0.6, x + bw * 0.6, y + bh * 1.0), fill=(0, 0, 0, 80))
        draw.ellipse((x - bw / 2, y - bh / 2, x + bw / 2, y + bh / 2), fill=(238, 232, 222, 255))
        draw.ellipse((x - bw / 2, y - bh / 2, x + bw / 2, y - bh / 2 + bh * 0.45),
                     fill=(214, 206, 192, 255))
        draw.ellipse((x - bw / 2, y - bh / 2, x + bw / 2, y + bh / 2),
                     outline=(150, 140, 124, 255), width=1)
    elif kind == 'rivet':
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(120, 96, 64, 255))
        draw.ellipse((x - r, y - r, x + r, y + r), outline=(70, 54, 36, 255), width=1)
        hr = max(1, r // 2)
        draw.ellipse((x - hr, y - hr, x, y), fill=(200, 180, 140, 220))

    out = Image.alpha_composite(img, layer).convert('RGB')
    arr[:] = np.array(out)


def apply_patch(arr, diff):
    x, y, r = diff['x'], diff['y'], diff['r']
    sx, sy = diff['sampleFrom']['x'], diff['sampleFrom']['y']
    feather = diff.get('feather', 0.7)
    h, w = arr.shape[:2]
    ri = int(np.ceil(r))

    src_x0, src_y0 = int(sx - r), int(sy - r)
    dst_x0, dst_y0 = int(x - r), int(y - r)
    patch = arr[src_y0:src_y0 + 2 * ri, src_x0:src_x0 + 2 * ri].copy()
    ph, pw = patch.shape[:2]
    if ph == 0 or pw == 0:
        return

    dist = circle_dist((ph, pw), pw / 2, ph / 2)
    alpha = feather_alpha(dist, r, feather, 1.0)

    dy0, dx0 = max(0, dst_y0), max(0, dst_x0)
    dy1, dx1 = min(h, dst_y0 + ph), min(w, dst_x0 + pw)
    if dy1 <= dy0 or dx1 <= dx0:
        return
    py0, px0 = dy0 - dst_y0, dx0 - dst_x0
    py1, px1 = py0 + (dy1 - dy0), px0 + (dx1 - dx0)

    region = arr[dy0:dy1, dx0:dx1].astype(np.float32)
    src = patch[py0:py1, px0:px1].astype(np.float32)
    a = alpha[py0:py1, px0:px1][:, :, None]
    arr[dy0:dy1, dx0:dx1] = np.clip(region * (1 - a) + src * a, 0, 255).astype(np.uint8)


HANDLERS = {'hue': apply_hue, 'tint': apply_tint, 'shape': apply_shape, 'patch': apply_patch}


def apply_diffs(img, diffs, logical_size):
    w, h = img.size
    sx, sy = w / logical_size['w'], h / logical_size['h']
    arr = np.array(img.convert('RGB'))
    for diff in diffs:
        d = scale_diff(diff, sx, sy)
        handler = HANDLERS.get(d['op'])
        if not handler:
            raise ValueError(f"未知差异操作: {d['op']}")
        handler(arr, d)
    return Image.fromarray(arr)


def verify_alignment(base, result, diffs, logical_size):
    w, h = base.size
    sx, sy = w / logical_size['w'], h / logical_size['h']
    delta = np.abs(np.array(base.convert('RGB'), dtype=np.int16)
                   - np.array(result.convert('RGB'), dtype=np.int16)).sum(axis=2)
    mask = np.zeros((h, w), dtype=bool)
    yy, xx = np.ogrid[:h, :w]
    for d in diffs:
        sd = scale_diff(d, sx, sy)
        r = sd['r'] * 1.2
        mask |= (xx - sd['x']) ** 2 + (yy - sd['y']) ** 2 <= r * r
    outside = ~mask
    changed = int(np.sum((delta > 8) & outside))
    total = int(np.sum(outside))
    return round(changed / max(total, 1) * 100, 2)


def generate(config, quality=88):
    src_path = IMAGES / config['imageA']
    dst_path = IMAGES / config['imageB']
    if not src_path.exists():
        raise FileNotFoundError(f'原图不存在: {src_path}')

    base = Image.open(src_path)
    result = apply_diffs(base, config['diffs'], config['imageSize'])

    bak = dst_path.with_suffix(dst_path.suffix + '.bak')
    if dst_path.exists() and not bak.exists():
        shutil.copy2(dst_path, bak)
        print(f'已备份旧差异图 → {bak.name}')

    result.save(dst_path, 'JPEG', quality=quality, optimize=True)
    ratio = verify_alignment(base, result, config['diffs'], config['imageSize'])
    print(f'已生成: {dst_path.name}  {result.size[0]}×{result.size[1]}  {dst_path.stat().st_size // 1024}KB')
    print(f'非差异区像素变化率: {ratio}% (越低越好)')


def main():
    level = sys.argv[1] if len(sys.argv) > 1 else 'archive_06'
    if level != 'archive_06':
        print(f'暂仅支持 archive_06，收到: {level}')
        sys.exit(1)
    generate(ARCHIVE_06)


if __name__ == '__main__':
    main()
