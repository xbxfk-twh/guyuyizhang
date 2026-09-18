"""给刚生成的立绘降采样 + 压体积（手机端省内存）。
   原图备份到 归档/素材实验/立绘原图/；处理后就地覆盖 identities-card/*.png。
   用法：python 开发工具/生成/_shrink_portraits.py
"""
import os, shutil
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(ROOT, '孤屿遗章-游戏 - 发布', 'assets', 'img', 'identities-card')
BAK = os.path.join(ROOT, '归档', '素材实验', '立绘原图')
TARGET = (768, 1152)          # 3:4，界面里最大只显示到 300px 左右，够用

os.makedirs(BAK, exist_ok=True)
tot0 = tot1 = 0
for f in sorted(os.listdir(SRC)):
    if not f.lower().endswith('.png'):
        continue
    p = os.path.join(SRC, f)
    b = os.path.join(BAK, f)
    if not os.path.exists(b):
        shutil.copy2(p, b)
    s0 = os.path.getsize(p); tot0 += s0
    im = Image.open(p).convert('RGB')
    if im.size != TARGET:
        im = im.resize(TARGET, Image.LANCZOS)
    im.save(p, optimize=True, compress_level=9)
    s1 = os.path.getsize(p)
    # 再试一版 256 色量化，看能不能再小一截（画风是厚涂，量化可能出色带，先只报告）
    q = im.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
    qp = p + '.q.png'
    q.save(qp, optimize=True, compress_level=9)
    s2 = os.path.getsize(qp)
    os.remove(qp)
    tot1 += s1
    print('%-16s %6.1fMB → %5.1fKB（256色可到 %5.1fKB）  %s' % (f, s0 / 1048576, s1 / 1024, s2 / 1024, '%dx%d' % TARGET))
print('合计 %.1fMB → %.1fMB；原图备份在 %s' % (tot0 / 1048576, tot1 / 1048576, BAK))
