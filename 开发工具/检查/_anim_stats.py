"""动作动画图体检：算平均亮度、亮像素占比、对比度（标准差），看哪张和别的不在一个风格上。
用法：python 开发工具/检查/_anim_stats.py  [--fix]
   不带 --fix：只报告
   带 --fix： 把 sleep_night / sleep_nap 的对比度调回和其它图一致（原图备份到 归档/素材实验/anim_原图/）
"""
import os
import sys
import statistics
from PIL import Image, ImageOps, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ANIM = os.path.join(ROOT, '孤屿遗章-游戏 - 发布', 'assets', 'img', 'anim')
BACKUP = os.path.join(ROOT, '归档', '素材实验', 'anim_原图')

def stats(path):
    im = Image.open(path).convert('L')
    px = list(im.getdata())
    mean = sum(px) / len(px)
    sd = statistics.pstdev(px)
    bright = sum(1 for v in px if v > 200) / len(px)
    return mean, sd, bright, im.size

def main():
    fix = '--fix' in sys.argv
    names = sorted(f for f in os.listdir(ANIM) if f.endswith('.png'))
    print('%-18s %8s %8s %10s %10s' % ('file', 'mean', 'stdev', '>200', 'size'))
    for n in names:
        m, sd, br, size = stats(os.path.join(ANIM, n))
        flag = ''
        if br > 0.06 or m > 110:
            flag = '   <== 偏亮/发灰，和其它图不像一套'
        print('%-18s %8.1f %8.1f %9.1f%% %10s%s' % (n, m, sd, br * 100, '%dx%d' % size, flag))
    if not fix:
        return
    os.makedirs(BACKUP, exist_ok=True)
    for n in ['sleep_night.png', 'sleep_nap.png']:
        src = os.path.join(ANIM, n)
        dst = os.path.join(BACKUP, n)
        if not os.path.exists(dst):
            Image.open(src).save(dst)
        im = Image.open(src).convert('RGB')
        g = ImageOps.grayscale(im)
        # 1) 把白雾压下去：自动对比度 + 轻微压暗
        g = ImageOps.autocontrast(g, cutoff=(1, 1))
        g = ImageEnhance.Contrast(g).enhance(1.35)
        g = ImageEnhance.Brightness(g).enhance(0.72)
        # 2) 暗部再压一点，让背景接近纯黑（其它图的背景就是这个调子）
        g = g.point(lambda v: 0 if v < 26 else min(255, int((v - 26) * 255 / 229)))
        g.convert('RGB').save(src)
        m, sd, br, size = stats(src)
        print('修好 %s → 平均 %.1f 对比度 %.1f 亮像素 %.1f%%' % (n, m, sd, br * 100))

main()
