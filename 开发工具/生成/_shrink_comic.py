"""开场分镜：原图降采样 + 黑白灰量化（手机端省内存、也跟游戏的黑白版画统一）。
   原图在 归档/素材实验/开场分镜原图/，处理结果写到 孤屿遗章-游戏 - 发布/assets/img/comic/。
   用法：python 开发工具/生成/_shrink_comic.py
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(ROOT, '归档', '素材实验', '开场分镜原图')
DST = os.path.join(ROOT, '孤屿遗章-游戏 - 发布', 'assets', 'img', 'comic')
WIDTH = 1280                      # 全屏铺满，1280 宽在 2K 屏上也不糊；再大纯属浪费内存
# 出图会带一圈印张纸边（实测 22~43px @1536 宽），裁掉它，让画面真正满幅
TRIM = 46

os.makedirs(DST, exist_ok=True)
tot0 = tot1 = 0
for f in sorted(os.listdir(SRC)):
    if not f.lower().endswith('.png'):
        continue
    p = os.path.join(SRC, f)
    im = Image.open(p).convert('RGB')
    w0, h0 = im.size
    im = im.crop((TRIM, TRIM, w0 - TRIM, h0 - TRIM))
    w, h = im.size
    if w != WIDTH:
        im = im.resize((WIDTH, max(1, round(h * WIDTH / w))), Image.LANCZOS)
    g = im.convert('L')                                  # 本来就是黑白木刻，直接走灰度通道
    out = os.path.join(DST, f)
    g.save(out, optimize=True, compress_level=9)
    s0, s1 = os.path.getsize(p), os.path.getsize(out)
    tot0 += s0; tot1 += s1
    print('%-16s %5.1fMB → %5.0fKB  %dx%d' % (f, s0 / 1048576, s1 / 1024, g.size[0], g.size[1]))
print('合计 %.1fMB → %.1fMB  输出目录：%s' % (tot0 / 1048576, tot1 / 1048576, DST))
