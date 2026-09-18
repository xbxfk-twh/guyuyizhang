# 生成牧场/蛋料理图标：两版四宫格，抠图后裁成 96×96
import json, urllib.request, sys, os
from collections import deque
from PIL import Image

# ⚠️ 密钥不许写进文件：从环境变量读（$env:DASHSCOPE_API_KEY='sk-...'）。
#    2026-09-18 清理：以前这里硬编码过一把 key，准备开源/上 GitHub 前必须改成读环境变量，
#    并且那把旧 key 建议去百炼后台重置一次（它在旧聊天记录里出现过）。
API = os.environ.get("DASHSCOPE_API_KEY", "")
if not API:
    raise SystemExit("没有 DASHSCOPE_API_KEY，先设置环境变量再跑")
URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
OUT = r"C:\Users\34297\Desktop\孤屿遗章\归档\素材实验\_icon_farm"
os.makedirs(OUT, exist_ok=True)

PROMPTS = {
    'A': ("a bundle of dried hay tied with a cord; a single hen egg; a fried egg sunny-side-up in a small iron pan; "
          "a thick rolled omelette on a simple wooden plate"),
    'B': ("a large platter piled with egg dishes, a whole meal; a small fluffy baby chick standing; "
          "two hen eggs resting on straw; a folded omelette cut into slices"),
}
HEAD = ("A game inventory icon sheet, 2x2 grid with four equal cells, each cell contains ONE separate item icon. "
        "Style: monochrome black ink illustration, hand-drawn engraving look, thick clean black outlines, cross-hatched shading, "
        "grayscale only, no color, no text, no letters, no numbers, no watermark, no frames, no borders. "
        "Each object is centered inside its own cell with generous empty white space around it. ")


def fetch(tag):
    prompt = HEAD + "Items: " + PROMPTS[tag] + "."
    body = {"model": "qwen-image-3.0",
            "input": {"messages": [{"role": "user", "content": [{"text": prompt}]}]},
            "parameters": {"size": "1024*1024", "n": 1, "prompt_extend": False, "watermark": False}}
    req = urllib.request.Request(URL, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "Authorization": "Bearer " + API})
    with urllib.request.urlopen(req, timeout=300) as r:
        data = json.loads(r.read().decode())
    url = data["output"]["choices"][0]["message"]["content"][0]["image"]
    raw = os.path.join(OUT, "raw%s.png" % tag)
    urllib.request.urlretrieve(url, raw)
    print("OK", raw)
    return raw


def cutout(im):
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = [[False] * h for _ in range(w)]
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[x][y]:
            continue
        seen[x][y] = True
        r, g, b, a = px[x, y]
        hi, lo = max(r, g, b), min(r, g, b)
        if a > 0 and hi > 178 and (hi - lo) <= 20:
            px[x, y] = (0, 0, 0, 0)
            q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    return im


def to_icon(im, size=96, pad=0.04):
    im = cutout(im)
    bb = im.split()[3].point(lambda v: 255 if v > 12 else 0).getbbox()
    if bb:
        im = im.crop(bb)
    w, h = im.size
    target = int(size * (1 - pad * 2))
    s = min(target / w, target / h)
    im = im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(im, ((size - im.size[0]) // 2, (size - im.size[1]) // 2), im)
    return canvas


for tag in ('A', 'B'):
    raw = fetch(tag)
    big = Image.open(raw)
    W, H = big.size
    icons = []
    for i, (cx, cy) in enumerate([(0, 0), (1, 0), (0, 1), (1, 1)], 1):
        cell = big.crop((cx * W // 2, cy * H // 2, (cx + 1) * W // 2, (cy + 1) * H // 2))
        ic = to_icon(cell)
        ic.save(os.path.join(OUT, "%s%d.png" % (tag, i)))
        icons.append(ic)
    sheet = Image.new("RGBA", (96 * 4 + 50, 116), (245, 242, 232, 255))
    for i, ic in enumerate(icons):
        sheet.paste(ic, (10 + i * 106, 10), ic)
    sheet.resize((sheet.size[0] * 3, sheet.size[1] * 3), Image.NEAREST).save(os.path.join(OUT, "sheet%s.png" % tag))
    print("sheet", tag)
