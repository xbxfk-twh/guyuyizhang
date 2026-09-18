# 把亚特兰蒂斯地图从 3:2（1536×1024）延展到 16:9（1820×1024）：
# 原图内容不动，左右各补 142px —— 用紧贴边缘的条带做镜像延续（接缝天然连续），再把镜像区微微压暗，弱化"照镜子"感。
import os
from PIL import Image, ImageEnhance

SRC = r"C:\Users\34297\Desktop\孤屿遗章\孤屿遗章-游戏 - 发布\assets\img\atlantis_map.png"
OUT = r"C:\Users\34297\Desktop\孤屿遗章\归档\素材实验\_map_wide\atlantis_map_wide.png"
W, H = 1820, 1024
os.makedirs(os.path.dirname(OUT), exist_ok=True)

src = Image.open(SRC).convert("RGB")
sw, sh = src.size
pad = (W - sw) // 2      # 142
canvas = Image.new("RGB", (W, H))
canvas.paste(src, (pad, 0))

# 左侧：镜像原图的左侧条带，接缝处与原图边缘连续
left = src.crop((pad, 0, pad * 2, sh)).transpose(Image.FLIP_LEFT_RIGHT)
canvas.paste(left, (0, 0))
# 右侧：镜像原图右侧条带
right = src.crop((sw - pad * 2, 0, sw - pad, sh)).transpose(Image.FLIP_LEFT_RIGHT)
canvas.paste(right, (W - pad, 0))

# 镜像区做"由外向内"的渐变（最外侧略暗一点、再往外加一层浅色雾），避免整块压暗留下一条竖缝
px = canvas.load()
for y in range(H):
    for k in range(pad):
        depth = (pad - k) / pad            # 1=最外侧，0=接缝处
        dark = 1 - 0.08 * depth            # 最外侧压暗 8%
        haze = 0.22 * max(0.0, (depth - 0.45) / 0.55)   # 只在最外侧 55% 区域加雾
        for x in (k, W - 1 - k):
            r, g, b = px[x, y]
            r, g, b = r * dark, g * dark, b * dark
            r = r * (1 - haze) + 214 * haze
            g = g * (1 - haze) + 216 * haze
            b = b * (1 - haze) + 218 * haze
            px[x, y] = (int(r), int(g), int(b))

# 接缝处横向渐变：镜像条内侧 1/3 与原图边缘混合，进一步弱化接缝
fade = pad // 3
px = canvas.load()
for y in range(H):
    for k in range(fade):
        t = k / fade                      # 0（最靠内）→ 1（接缝）
        # 左侧：把 x=pad-1-k 拉向 x=pad+k
        a = px[pad - 1 - k, y]; b = px[pad + k, y]
        px[pad - 1 - k, y] = tuple(int(a[i] * (0.55 + 0.45 * t) + b[i] * (0.45 - 0.45 * t)) for i in range(3))
        # 右侧
        c = px[W - pad + k, y]; d2 = px[W - pad - 1 - k, y]
        px[W - pad + k, y] = tuple(int(c[i] * (0.55 + 0.45 * t) + d2[i] * (0.45 - 0.45 * t)) for i in range(3))

# 接缝两侧做一次轻微横向模糊（只影响 ±12px），把镜像折叠线糊掉
from PIL import ImageFilter
blurred = canvas.filter(ImageFilter.GaussianBlur(3))
bpx = blurred.load()
band = 12
for y in range(H):
    for x in list(range(max(0, pad - band), min(W, pad + band))) + list(range(max(0, W - pad - band), min(W, W - pad + band))):
        d = min(abs(x - pad), abs(x - (W - pad)))
        wgt = 0.75 * (1 - d / band)
        if wgt <= 0:
            continue
        a = px[x, y]; b = bpx[x, y]
        px[x, y] = tuple(int(a[i] * (1 - wgt) + b[i] * wgt) for i in range(3))

canvas.save(OUT)
print("OK", OUT, canvas.size, "比例 %.3f" % (canvas.size[0] / canvas.size[1]))
