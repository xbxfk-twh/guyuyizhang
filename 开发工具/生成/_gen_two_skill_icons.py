# -*- coding: utf-8 -*-
"""补两个技能图标：k_heavy（重击）/ k_sure（必中）。
   风格跟 assets/img/skills/ 里那批一致：128×128、粗墨线、白底转透明（alpha = 255 - 灰度）。
   为什么自己画：图像模型那张 3×3 出图需要 DASHSCOPE_API_KEY，当前环境没有；
   这两个图标是几何形状（下砸 / 靶心），手画反而更干净、也不会和已有的图撞脸。
   用法：python -X utf8 开发工具/生成/_gen_two_skill_icons.py
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
DST = os.path.join(ROOT, '孤屿遗章-游戏 - 发布', 'assets', 'img', 'skills')
S = 128
INK = 0          # 墨线
BG = 255         # 白底（最后转成透明）


def blank():
    im = Image.new('L', (S, S), BG)
    return im, ImageDraw.Draw(im)


def finish(im, name):
    alpha = im.point(lambda v: 255 - v)           # 白底透明、墨线保留（同 _slice_skill_icons.py）
    out = Image.merge('RGBA', (im, im, im, alpha))
    out.save(os.path.join(DST, name + '.png'), optimize=True, compress_level=9)
    print('写出 ' + name + '.png')


# ---------- k_heavy：重物下砸（向下粗箭头 + 地面 + 冲击裂纹）----------
im, d = blank()
d.line([(64, 14), (64, 62)], fill=INK, width=11)                     # 柄
d.polygon([(40, 52), (88, 52), (64, 84)], fill=INK)                  # 箭头
d.line([(22, 96), (106, 96)], fill=INK, width=9)                     # 地面
for x1, y1, x2, y2 in [(30, 108, 18, 120), (54, 110, 44, 124),       # 冲击裂纹
                       (74, 110, 84, 124), (98, 108, 110, 120),
                       (64, 106, 64, 122)]:
    d.line([(x1, y1), (x2, y2)], fill=INK, width=6)
finish(im, 'k_heavy')

# ---------- k_sure：靶心（同心圆 + 中心点 + 十字准星）----------
im, d = blank()
d.ellipse([16, 16, 112, 112], outline=INK, width=9)                  # 外环
d.ellipse([40, 40, 88, 88], outline=INK, width=7)                    # 内环
d.ellipse([56, 56, 72, 72], fill=INK)                                # 靶心
d.line([(64, 4), (64, 22)], fill=INK, width=7)                       # 准星：上
d.line([(64, 106), (64, 124)], fill=INK, width=7)                    # 下
d.line([(4, 64), (22, 64)], fill=INK, width=7)                       # 左
d.line([(106, 64), (124, 64)], fill=INK, width=7)                    # 右
finish(im, 'k_sure')
