# 修掉"图标底部被裁进来的邻居碎片"：熏鱼 / 烤鱼 / 肉干
# 做法：只保留底部碎片以外的墨迹，再按真实内容重新铺满 96×96
from collections import deque
from PIL import Image

D = r"C:\Users\34297\Desktop\孤屿遗章\孤屿遗章-游戏 - 发布\assets\img\items/"
TARGETS = ['ironDagger', 'pickBlack', 'shipwood']


def comps(mask, w, h):
    seen = [[False] * h for _ in range(w)]
    out = []
    for y0 in range(h):
        for x0 in range(w):
            if seen[x0][y0] or not mask(x0, y0):
                continue
            q = deque([(x0, y0)]); seen[x0][y0] = True
            pts = []; x1 = x2 = x0; y1 = y2 = y0
            while q:
                x, y = q.popleft(); pts.append((x, y))
                x1 = min(x1, x); x2 = max(x2, x); y1 = min(y1, y); y2 = max(y2, y)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[nx][ny] and mask(nx, ny):
                        seen[nx][ny] = True; q.append((nx, ny))
            out.append({'pts': pts, 'box': (x1, y1, x2 + 1, y2 + 1), 'n': len(pts)})
    return sorted(out, key=lambda c: -c['n'])


for name in TARGETS:
    path = D + name + '.png'
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    px = im.load()
    lum = lambda x, y: 0.299 * px[x, y][0] + 0.587 * px[x, y][1] + 0.114 * px[x, y][2]
    ink = lambda x, y: px[x, y][3] > 40 and lum(x, y) < 238
    cs = comps(ink, w, h)
    print(name, '组件:', [(c['n'], c['box']) for c in cs])
    # 剔除"整块都贴在画布边缘 12 像素带里"的小碎片（邻居的残影）
    def in_edge_band(c):
        x1, y1, x2, y2 = c['box']
        return y1 >= h - 12 or y2 <= 12 or x1 >= w - 12 or x2 <= 12
    drop = [c for c in cs[1:] if in_edge_band(c)]
    keep = set()
    for c in cs:
        if c in drop:
            continue
        for p in c['pts']:
            keep.add(p)
    # 连边缘的羽化像素一起带上：以保留像素为中心扩 1 像素
    grown = set()
    for (x, y) in keep:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] > 8:
                    grown.add((nx, ny))
    for y in range(h):
        for x in range(w):
            if (x, y) not in grown:
                px[x, y] = (0, 0, 0, 0)
    box = im.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
    body = im.crop(box)
    bw, bh = body.size
    target = int(96 * 0.92)
    s = min(target / bw, target / bh)
    body = body.resize((max(1, int(bw * s)), max(1, int(bh * s))), Image.LANCZOS)
    canvas = Image.new('RGBA', (96, 96), (0, 0, 0, 0))
    canvas.paste(body, ((96 - body.size[0]) // 2, (96 - body.size[1]) // 2), body)
    canvas.save(path)
    print('   -> 重排完成，内容框', canvas.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox())
