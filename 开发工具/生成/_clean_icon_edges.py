# 清理物品图标边缘残留的底色（那圈"小框"）
# 做法：从四条边做洪水填充，只吃「近白 且 与边框连通」的像素 —— 图案内部的墨线永远碰不到。
# 输出到 归档/素材实验/_icon_clean/（不覆盖原图），并生成前后对照图供人工过目。
import os, glob
from collections import deque
from PIL import Image, ImageDraw

SRC = r"C:\Users\34297\Desktop\孤屿遗章\孤屿遗章-游戏 - 发布\assets\img\items"
OUT = r"C:\Users\34297\Desktop\孤屿遗章\归档\素材实验\_icon_clean"
os.makedirs(OUT, exist_ok=True)
WHITE = 232          # 近白阈值：三通道都 >= 232 才算"底色"


def clean(im):
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = [[False] * h for _ in range(w)]
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    removed = 0
    edge_hit = 0
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[x][y]:
            continue
        seen[x][y] = True
        r, g, b, a = px[x, y]
        if a < 8:
            pass                                    # 本来就透明：允许继续往内扩散
        elif min(r, g, b) >= WHITE:
            px[x, y] = (0, 0, 0, 0)                 # 近白底色 → 抹成透明
            removed += 1
        else:
            continue                                # 碰到墨线就停，不再往里走
        if x in (0, w - 1) or y in (0, h - 1):
            edge_hit += 1
        q.append((x + 1, y)); q.append((x - 1, y)); q.append((x, y + 1)); q.append((x, y - 1))
    return im, removed, edge_hit


def main():
    rows = []
    for f in sorted(glob.glob(os.path.join(SRC, "*.png"))):
        name = os.path.basename(f)
        im = Image.open(f)
        out, removed, edge = clean(im)
        if removed:
            out.save(os.path.join(OUT, name))
            rows.append((name, removed, edge, im.size))
    rows.sort(key=lambda r: -r[1])
    print("需要清理的图：%d / %d" % (len(rows), len(glob.glob(os.path.join(SRC, "*.png")))))
    for r in rows[:20]:
        print("  %-22s 抹掉 %4d 像素（边缘命中 %d） %s" % (r[0], r[1], r[2], r[3]))

    # 前后对照：拿改动最大的 8 张，左=原图 右=清理后，铺在深色底上（和物品格背景接近）
    top = rows[:8]
    if not top:
        print("没有需要清理的图"); return
    S = 120
    sheet = Image.new("RGB", (len(top) * S * 2, 2 * 150), (238, 234, 222))
    dr = ImageDraw.Draw(sheet)
    for i, (name, _, _, _) in enumerate(top):
        a = Image.open(os.path.join(SRC, name)).convert("RGBA").resize((S, S), Image.LANCZOS)
        b = Image.open(os.path.join(OUT, name)).convert("RGBA").resize((S, S), Image.LANCZOS)
        for j, im in enumerate((a, b)):
            x = i * S * 2 + j * S
            sheet.paste(im, (x, 26), im)
            dr.text((x + 4, 8), ("原图 " if j == 0 else "清理后 ") + name[:14], fill=(20, 20, 20))
    sheet.save(os.path.join(OUT, "_对照.png"))
    print("对照图：", os.path.join(OUT, "_对照.png"))


if __name__ == "__main__":
    main()
