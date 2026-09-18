# 扫描物品图标：找出"被切在画布边缘的碎片"（多半是从多格图里裁进来的邻居）
import glob, os, sys
from collections import deque
from PIL import Image

D = r"C:\Users\34297\Desktop\孤屿遗章\孤屿遗章-游戏 - 发布\assets\img\items"


def comps(im, th=20):
    w, h = im.size
    a = im.split()[3].load()
    seen = [[False] * h for _ in range(w)]
    out = []
    for y0 in range(h):
        for x0 in range(w):
            if seen[x0][y0] or a[x0, y0] <= th:
                continue
            q = deque([(x0, y0)]); seen[x0][y0] = True
            x1 = x2 = x0; y1 = y2 = y0; n = 0
            while q:
                x, y = q.popleft(); n += 1
                x1 = min(x1, x); x2 = max(x2, x); y1 = min(y1, y); y2 = max(y2, y)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[nx][ny] and a[nx, ny] > th:
                        seen[nx][ny] = True; q.append((nx, ny))
            out.append({'n': n, 'box': (x1, y1, x2 + 1, y2 + 1)})
    return sorted(out, key=lambda c: -c['n'])


bad = []
for f in sorted(glob.glob(D + '/*.png')):
    n = os.path.basename(f)
    if n == 'spritesheet.png':
        continue
    im = Image.open(f).convert('RGBA')
    w, h = im.size
    cs = comps(im)
    if not cs:
        continue
    main = cs[0]
    for c in cs[1:]:
        if c['n'] < 40:
            continue
        bx = c['box']
        touches = bx[0] <= 1 or bx[1] <= 1 or bx[2] >= w - 1 or bx[3] >= h - 1
        if touches and c['n'] > main['n'] * 0.03:
            bad.append((n, c['n'], main['n'], bx, (w, h)))
print('疑似边缘碎片的图标：', len(bad))
for b in bad:
    print('  %-22s 碎片像素=%-6d 主体像素=%-6d 碎片框=%s 画布=%s' % b)
