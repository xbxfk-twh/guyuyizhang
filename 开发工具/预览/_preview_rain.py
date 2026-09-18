# 模拟"旧密排雨丝"和"新短雨丝"在场景上的效果对比
from PIL import Image, ImageDraw

SRC = r"C:\Users\34297\Desktop\孤屿遗章\孤屿遗章-游戏 - 发布\assets\img\grassland.png"
OUT = r"C:\Users\34297\Desktop\孤屿遗章\归档\素材实验\_map_wide\rain_compare.png"
W, H = 1100, 620

base = Image.open(SRC).convert("RGB").resize((W, H))
base = base.point(lambda v: int(v * 0.92))          # 雨天压暗一点

# ---- 旧：密排等距直线（每 9px 一条，贯穿整屏）----
old = base.copy()
d = ImageDraw.Draw(old, "RGBA")
for x in range(-H, W + H, 9):
    d.line([(x, 0), (x - 90, H)], fill=(220, 228, 240, 60), width=1)
for x in range(-H, W + H, 14):
    d.line([(x, 0), (x - 110, H)], fill=(234, 230, 218, 36), width=1)

# ---- 新：220×420 的短线贴图（每条 18~26px、位置随机），按 rainfall 循环平铺 ----
new = base.copy()
d2 = ImageDraw.Draw(new, "RGBA")
tile = [(30,20,24,44),(96,60,90,86),(168,16,161,40),(58,120,51,146),(140,150,134,175),
        (200,200,193,224),(24,250,18,276),(110,300,103,326),(176,350,169,376),(70,395,64,419),
        (150,240,144,266),(44,330,38,356)]
for ox in range(-220, W + 220, 220):
    for oy in range(-420, H + 420, 420):
        for (x1, y1, x2, y2) in tile:
            d2.line([(ox + x1, oy + y1), (ox + x2, oy + y2)], fill=(226, 234, 248, 140), width=2)
# 第二层（更大更淡）
tile2 = [(40,60,34,84),(210,140,204,164),(120,260,114,284),(280,340,274,364),(80,460,74,484),(240,560,234,584)]
for ox in range(-340, W + 340, 340):
    for oy in range(-640, H + 640, 640):
        for (x1, y1, x2, y2) in tile2:
            d2.line([(ox + x1, oy + y1), (ox + x2, oy + y2)], fill=(234, 230, 218, 70), width=2)

sheet = Image.new("RGB", (W * 2 + 30, H + 30), (20, 20, 18))
sheet.paste(old, (10, 10))
sheet.paste(new, (W + 20, 10))
sheet.save(OUT)
print("OK", OUT, sheet.size)
