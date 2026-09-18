"""把 3×3 技能图标大图切成单个 128×128 图标（深色墨线 + 透明底，能直接放在纸色卡片上）。
   输入：归档/素材实验/技能图标原图/sheetN.png
   输出：孤屿遗章-游戏 - 发布/assets/img/skills/<名字>.png
   用法：python 开发工具/生成/_slice_skill_icons.py
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(ROOT, '归档', '素材实验', '技能图标原图')
DST = os.path.join(ROOT, '孤屿遗章-游戏 - 发布', 'assets', 'img', 'skills')
SIZE, INNER = 128, 116          # 画布 128、内容最多占 116（留一点呼吸）

# 每个格子一个名字，顺序 = 生成脚本里的顺序（行优先）
SHEETS = {
    'sheet1': ['g_yield', 'g_speed', 'g_stam', 'g_wood', 'g_nature', 'g_fine', 'g_rough', 'c_speed', 'c_refund'],
    'sheet2': ['c_extra', 'c_patch', 'c_line', 'c_finework', 'k_atk', 'k_def', 'k_crit', 'k_sweep', 'k_exec'],
    'sheet3': ['k_vamp', 'k_revenge', 'k_shield', 'k_swift', 'k_rage', 'k_iron', 'k_bow', 'k_gun', 'skill_emblem'],
}

os.makedirs(DST, exist_ok=True)
made = 0
for sheet, names in SHEETS.items():
    p = os.path.join(SRC, sheet + '.png')
    if not os.path.exists(p):
        print('缺少 ' + p + '（先跑 _gen_skill_icons.js）')
        continue
    im = Image.open(p).convert('L')
    W, H = im.size
    for idx, name in enumerate(names):
        r, c = divmod(idx, 3)
        cell = im.crop((c * W // 3, r * H // 3, (c + 1) * W // 3, (r + 1) * H // 3))
        # 去掉四周留白 + 切图边缘可能带到的分隔线
        mask = cell.point(lambda v: 255 if v < 215 else 0)
        bbox = mask.getbbox()
        if bbox:
            pad = 2
            cell = cell.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad),
                              min(cell.size[0], bbox[2] + pad), min(cell.size[1], bbox[3] + pad)))
        cw, ch = cell.size
        sc = min(INNER / cw, INNER / ch)
        cell = cell.resize((max(1, round(cw * sc)), max(1, round(ch * sc))), Image.LANCZOS)
        canvas = Image.new('L', (SIZE, SIZE), 255)
        canvas.paste(cell, ((SIZE - cell.size[0]) // 2, (SIZE - cell.size[1]) // 2))
        alpha = canvas.point(lambda v: 255 - v)          # 白底 → 透明，墨线保留
        out = Image.merge('RGBA', (canvas, canvas, canvas, alpha))
        dst = os.path.join(DST, name + '.png')
        out.save(dst, optimize=True, compress_level=9)
        made += 1
print('切好 %d 个图标 → %s' % (made, DST))
