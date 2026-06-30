from PIL import Image, ImageDraw
import os

HERE = os.path.dirname(__file__)
IMG = os.path.join(HERE, '..', 'levels', 'images', 'archive_06.jpeg')

# 显示空间 900x675，原图 1600x1200
DISP_W, DISP_H = 900, 675
src = Image.open(IMG).convert('RGB').resize((DISP_W, DISP_H), Image.LANCZOS)
d = ImageDraw.Draw(src)

# 每 50px 画一条网格线，每 100px 标注坐标
for x in range(0, DISP_W + 1, 50):
    color = (255, 80, 80) if x % 100 == 0 else (255, 180, 180)
    d.line([(x, 0), (x, DISP_H)], fill=color, width=1)
    if x % 100 == 0:
        d.text((x + 2, 2), str(x), fill=(255, 255, 0))
for y in range(0, DISP_H + 1, 50):
    color = (255, 80, 80) if y % 100 == 0 else (255, 180, 180)
    d.line([(0, y), (DISP_W, y)], fill=color, width=1)
    if y % 100 == 0:
        d.text((2, y + 2), str(y), fill=(255, 255, 0))

out = os.path.join(HERE, '_grid.png')
src.save(out)
print('saved', out)
