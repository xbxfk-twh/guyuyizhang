# 生成采集动作图标（石镐 / 手摘浆果 / 木勺舀水 / 手采草药）×2 格，抠底裁成 256×256
# ⚠️ 密钥不落盘：从环境变量读（$env:DASHSCOPE_API_KEY='sk-...'），与 _gen_farm_icons.py 同约定。
import json, urllib.request, os, sys
from collections import deque
from PIL import Image

API = os.environ.get("DASHSCOPE_API_KEY", "")
if not API:
    raise SystemExit("没有 DASHSCOPE_API_KEY，先设置环境变量再跑")

URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
OUT = r"C:\Users\34297\Desktop\孤屿遗章\归档\素材实验\_icon_anim"
os.makedirs(OUT, exist_ok=True)

# 2×2 四格：左上石镐 / 右上摘浆果的手 / 左下舀水的木勺 / 右下采草药的手
PROMPT = (
    "A game action icon sheet, 2x2 grid with four equal cells on a pure white background, "
    "each cell contains ONE separate illustration, viewed from the side, "
    "centered inside its own cell with generous empty white space around it. "
    "Cell 1 (top-left): a stone pickaxe, wooden handle, chipped flint head, angled like a mining swing. "
    "Cell 2 (top-right): a human hand picking a small cluster of round berries with two leaves. "
    "Cell 3 (bottom-left): a small wooden ladle scooping water, a few water drops falling. "
    "Cell 4 (bottom-right): a human hand plucking a sprig of herbs with small leaves. "
    "Style: monochrome black ink illustration, hand-drawn woodcut engraving look, thick clean black outlines, "
    "cross-hatched shading, grayscale only, no color, no text, no letters, no numbers, no watermark, "
    "no frames, no borders, no grid lines."
)


def fetch():
    body = {"model": "qwen-image-3.0",
            "input": {"messages": [{"role": "user", "content": [{"text": PROMPT}]}]},
            "parameters": {"size": "1024*1024", "n": 1, "prompt_extend": False, "watermark": False}}
    req = urllib.request.Request(URL, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json",
                                          "Authorization": "Bearer " + API})
    with urllib.request.urlopen(req, timeout=300) as r:
        data = json.loads(r.read().decode())
    url = data["output"]["choices"][0]["message"]["content"][0]["image"]
    raw = os.path.join(OUT, "raw.png")
    urllib.request.urlretrieve(url, raw)
    print("OK", raw)
    return raw


def cutout(im):
    """从四边洪水填充掉白底，转成 LA（黑墨 + 透明）。"""
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
        if a < 8 or min(r, g, b) > 232:      # 近白 → 当作背景，继续往外扩
            px[x, y] = (0, 0, 0, 0)
            q.append((x + 1, y)); q.append((x - 1, y))
            q.append((x, y + 1)); q.append((x, y - 1))
    return im


def main():
    raw = sys.argv[1] if len(sys.argv) > 1 else fetch()
    im = Image.open(raw).convert("RGBA")
    w, h = im.size
    cells = {'pick': (0, 0), 'berry_pick': (1, 0), 'water_ladle': (0, 1), 'herb_pick': (1, 1)}
    for name, (cx, cy) in cells.items():
        box = (cx * w // 2, cy * h // 2, (cx + 1) * w // 2, (cy + 1) * h // 2)
        cell = cutout(im.crop(box))
        bbox = cell.getchannel('A').getbbox()
        if bbox:
            cell = cell.crop(bbox)
        canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
        cell.thumbnail((228, 228), Image.LANCZOS)
        canvas.paste(cell, ((256 - cell.width) // 2, (256 - cell.height) // 2), cell)
        out = canvas.convert("LA")
        path = os.path.join(OUT, name + ".png")
        out.save(path)
        print("saved", path, out.size)


if __name__ == "__main__":
    main()
