"""PNG 重编码：黑白画风里绝大多数图是灰度的，却按 RGB(A) 存 —— 白占一倍通道。
   这里判断"是不是真灰度"，是就存成 L / LA，并用最高压缩重存（画质零损失，文件小很多）。
   原图已在 归档/素材实验/原图备份_降采样前/ 有备份。
   用法：python 开发工具/生成/_reencode_png.py [--go]
"""
import os, sys
from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
IMG = os.path.join(ROOT, '孤屿遗章-游戏 - 发布', 'assets', 'img')

def is_gray(im):
    """RGB 三个通道是否完全相同（真灰度）"""
    if im.mode not in ('RGB', 'RGBA'):
        return im.mode in ('L', 'LA')
    r, g, b = im.convert('RGB').split()
    return ImageChops.difference(r, g).getbbox() is None and ImageChops.difference(g, b).getbbox() is None

# 游戏里对这些图**一定会加 filter: grayscale(1)**（CSS 或 JS 里写死的），
# 所以文件本身存成灰度通道=零损失，还能省掉一半通道与大量压缩体积。
FORCE_GRAY_DIRS = ('atlantis', 'endings', 'enemies', 'anim', 'build')
FORCE_GRAY_ROOT = ('bamboo', 'camp', 'cave', 'desert', 'farm', 'forest', 'grassland', 'map',
                   'peak', 'quarry', 'river', 'sea', 'shore', 'title', 'boss_pirate', 'boss_spider',
                   'boss_wolf', 'boss_sunken', 'laochao')

def force_gray(rel):
    rel = rel.replace('\\', '/')
    parts = rel.split('/')
    if len(parts) > 1:
        return parts[0] in FORCE_GRAY_DIRS
    return parts[0].replace('.png', '') in FORCE_GRAY_ROOT

def is_opaque(im):
    if im.mode not in ('RGBA', 'LA'):
        return True
    return im.getchannel('A').getextrema()[0] == 255

def main():
    go = '--go' in sys.argv
    before = after = 0
    n_gray = n_total = 0
    rows = []
    for cur, _, files in os.walk(IMG):
        for f in sorted(files):
            if not f.lower().endswith('.png'):
                continue
            p = os.path.join(cur, f)
            size = os.path.getsize(p)
            before += size
            n_total += 1
            try:
                im = Image.open(p)
            except Exception as e:
                print('读不了', p, e); after += size; continue
            gray = force_gray(os.path.relpath(p, IMG)) or is_gray(im)
            if gray and is_opaque(im):
                target = 'L'                      # 不透明 → 连透明通道也不要
            elif gray:
                target = 'LA'
            else:
                target = None
            if go:
                if target:
                    out = im.convert(target) if im.mode != target else im
                    n_gray += 1
                else:
                    out = im
                    if im.mode == 'RGBA' and is_opaque(im):
                        out = im.convert('RGB')      # 不透明就别带 alpha 通道
                out.save(p, optimize=True, compress_level=9)
                newsize = os.path.getsize(p)
            else:
                newsize = size * (0.5 if gray and im.mode in ('RGB', 'RGBA') else 0.92)
            after += newsize
            rows.append((os.path.relpath(p, IMG), im.mode, 'gray' if gray else 'color', size, newsize))
    print('%d 张图，其中灰度 %d 张' % (n_total, n_gray if go else sum(1 for r in rows if r[2] == 'gray')))
    big = sorted(rows, key=lambda r: -r[3])[:10]
    for rel, mode, kind, s0, s1 in big:
        print('  %-40s %-5s %-5s %8.1fKB -> %8.1fKB' % (rel, mode, kind, s0 / 1024, s1 / 1024))
    print('磁盘：%.1f MB -> %.1f MB' % (before / 1048576, after / 1048576))
    if not go:
        print('（预估；加 --go 才会真的重存）')

main()
