# 重新裁切已有四宫格原图：把"贴边浅灰底"也算背景抠掉，再按真实内容缩放，
# 让图标在 96×96 里占满（和 tea/antidote 那些老图标一致的视觉大小）。
import sys, os
from collections import deque
from PIL import Image


def cutout(im):
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = [[False] * h for _ in range(w)]
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[x][y]:
            continue
        seen[x][y] = True
        r, g, b, a = px[x, y]
        hi, lo = max(r, g, b), min(r, g, b)
        if a > 0 and hi > 178 and (hi - lo) <= 20:      # 贴边的浅灰底（含 196 那种灰噪点）
            px[x, y] = (0, 0, 0, 0)
            q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    return im


def abbox(im, th=12):
    return im.split()[3].point(lambda v: 255 if v > th else 0).getbbox()


def make(raw, cell, out, pad=0.03):
    big = Image.open(raw).convert("RGBA")
    c = cutout(big.crop(cell))
    b = abbox(c)
    if b:
        c = c.crop(b)
    w, h = c.size
    target = int(96 * (1 - pad * 2))
    s = min(target / w, target / h)
    c = c.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
    canvas = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    canvas.paste(c, ((96 - c.size[0]) // 2, (96 - c.size[1]) // 2), c)
    canvas.save(out)
    bb = abbox(canvas)
    print(os.path.basename(out), "content", bb, "= %dx%d" % (bb[2] - bb[0], bb[3] - bb[1]))


ROOT = r"C:\Users\34297\Desktop\孤屿遗章"
make(ROOT + r"\_icon_tmp\raw.png", (512, 512, 1024, 1024), ROOT + r"\_icon_tmp\bluebull_big.png")
make(ROOT + r"\_icon_tmp2\raw.png", (0, 0, 512, 512), ROOT + r"\_icon_tmp2\laoji_big.png")
