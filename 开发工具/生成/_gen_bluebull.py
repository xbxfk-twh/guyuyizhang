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
OUT = r"C:\Users\34297\Desktop\孤屿遗章\归档\素材实验\_icon_tmp"
os.makedirs(OUT, exist_ok=True)

prompt = (
    "A game inventory icon sheet, 2x2 grid with four equal cells, each cell contains ONE separate item icon. "
    "Style: monochrome black ink illustration, hand-drawn engraving look, thick clean black outlines, cross-hatched shading, "
    "grayscale only, no color, no text, no letters, no numbers, no watermark, no frames, no borders. "
    "Each object is centered inside its own cell with generous empty white space around it. "
    "Cell 1 top-left: a small squat glass bottle of energy tonic, cork stopper, blank plain paper label. "
    "Cell 2 top-right: a tall slim vial of tonic, cork stopper, narrow neck, liquid filled to the shoulder. "
    "Cell 3 bottom-left: a small tin can of tonic drink, pull tab, blank label. "
    "Cell 4 bottom-right: a round-bellied flask of tonic, cork stopper, a rope tied around its neck."
)

body = {"model": "qwen-image-3.0",
        "input": {"messages": [{"role": "user", "content": [{"text": prompt}]}]},
        "parameters": {"size": "1024*1024", "n": 1, "prompt_extend": False, "watermark": False}}
req = urllib.request.Request(URL, data=json.dumps(body).encode(),
                             headers={"Content-Type": "application/json", "Authorization": "Bearer " + API})
try:
    with urllib.request.urlopen(req, timeout=300) as r:
        data = json.loads(r.read().decode())
except Exception as e:
    print("ERR", e)
    if hasattr(e, "read"):
        print(e.read().decode()[:600])
    sys.exit(1)

url = data["output"]["choices"][0]["message"]["content"][0]["image"]
open(os.path.join(OUT, "url.txt"), "w", encoding="utf-8").write(url)
raw = os.path.join(OUT, "raw.png")
urllib.request.urlretrieve(url, raw)
print("OK", raw, url[:100])


def cutout(im):
    """把贴边的白底抠掉（内部留白保留），返回裁到内容边界的 RGBA 图"""
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
        if a > 0 and r > 232 and g > 232 and b > 232:
            px[x, y] = (0, 0, 0, 0)
            q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    box = im.getbbox()
    return im.crop(box) if box else im


def to_icon(im, size=96, pad=0.06):
    im = cutout(im)
    w, h = im.size
    target = int(size * (1 - pad * 2))
    s = min(target / w, target / h)
    im = im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(im, ((size - im.size[0]) // 2, (size - im.size[1]) // 2), im)
    return canvas


big = Image.open(raw)
W, H = big.size
cells = [(0, 0), (1, 0), (0, 1), (1, 1)]
icons = []
for i, (cx, cy) in enumerate(cells, 1):
    cell = big.crop((cx * W // 2, cy * H // 2, (cx + 1) * W // 2, (cy + 1) * H // 2))
    ic = to_icon(cell)
    ic.save(os.path.join(OUT, "cand%d.png" % i))
    icons.append(ic)

sheet = Image.new("RGBA", (96 * 4 + 50, 96 + 20), (245, 242, 232, 255))
for i, ic in enumerate(icons):
    sheet.paste(ic, (10 + i * 106, 10), ic)
sheet.save(os.path.join(OUT, "sheet.png"))
print("candidates ->", OUT)
