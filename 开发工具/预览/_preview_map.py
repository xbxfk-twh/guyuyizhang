# 按游戏里的排版规则，模拟"铺满裁切"后海底大地图的最终显示效果（用于自检热点是否遮挡）
import os
from PIL import Image, ImageDraw, ImageFont

SRC = r"C:\Users\34297\Desktop\孤屿遗章\孤屿遗章-游戏 - 发布\assets\img\atlantis_map.png"
import sys
SW, SH = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (1600, 900)
OUT = r"C:\Users\34297\Desktop\孤屿遗章\归档\素材实验\_map_wide\preview_%dx%d.png" % (SW, SH)
ARROWS = [
    (78, 22, '礁石栖息地', 'habitat'),
    (50, 35, '沉没之城', 'city'),
    (30, 56, '珊瑚生长带', 'coral'),
    (15, 45, '沉船墓地', 'shipwreck'),
    (68, 52, '珊瑚森林', 'coralForest'),
    (38, 20, '珍珠洞窟', 'pearlCave'),
    (87, 52, '海沟', 'trench'),
    (90, 80, '深渊裂谷', 'abyss'),
    (50, 80, '深水圣殿', 'sanctum'),
    (8, 20, '↑ 返回孤岛', 'home'),
]
CUR = 'habitat'

src = Image.open(SRC).convert('RGB')
scale = max(SW / src.size[0], SH / src.size[1])
iw, ih = int(src.size[0] * scale), int(src.size[1] * scale)
big = src.resize((iw, ih), Image.LANCZOS)
left, top = (SW - iw) // 2, (SH - ih) // 2
canvas = Image.new('RGB', (SW, SH), (11, 11, 9))
canvas.paste(big, (left, top))
d = ImageDraw.Draw(canvas)
try:
    font = ImageFont.truetype(r"C:\Windows\Fonts\msyh.ttc", 13)
except Exception:
    font = ImageFont.load_default()
for x, y, label, key in ARROWS:
    cx, cy = left + x / 100 * iw, top + y / 100 * ih
    text = label + (' · 你在这里' if key == CUR else '')
    tw = d.textlength(text, font=font)
    bw, bh = tw + 16, 21
    bx, by = cx - bw / 2, cy - 62
    d.rectangle([bx, by, bx + bw, by + bh], fill=(10, 10, 8), outline=(234, 230, 218))
    d.text((bx + 8, by + 3), text, font=font, fill=(240, 236, 224))
    d.text((cx - 6, cy - 40), 'v', font=font, fill=(240, 236, 224))
canvas.save(OUT)
print('OK', OUT, canvas.size)
