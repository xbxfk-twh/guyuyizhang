# 尝试用 qwen-image-edit 把亚特兰蒂斯地图从 3:2 扩到 16:9（左右各补一块同风格深海）
import json, urllib.request, base64, os, sys
from PIL import Image

# ⚠️ 密钥不许写进文件：从环境变量读（$env:DASHSCOPE_API_KEY='sk-...'）。
#    2026-09-18 清理：以前这里硬编码过一把 key，准备开源/上 GitHub 前必须改成读环境变量，
#    并且那把旧 key 建议去百炼后台重置一次（它在旧聊天记录里出现过）。
API = os.environ.get("DASHSCOPE_API_KEY", "")
if not API:
    raise SystemExit("没有 DASHSCOPE_API_KEY，先设置环境变量再跑")
URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
SRC = r"C:\Users\34297\Desktop\孤屿遗章\孤屿遗章-游戏 - 发布\assets\img\atlantis_map.png"
OUT = r"C:\Users\34297\Desktop\孤屿遗章\归档\素材实验\_map_wide"
os.makedirs(OUT, exist_ok=True)

b64 = base64.b64encode(open(SRC, "rb").read()).decode()
data_uri = "data:image/png;base64," + b64
prompt = ("Outpaint this black ink underwater illustration to a seamless 16:9 widescreen picture: only widen the view by drawing "
          "more of the same sea floor on the left and right sides (soft sand ripples, a few distant sunken ship masts, sparse white coral). "
          "Fill the whole canvas edge to edge, absolutely no black bars, no dark bands, no letterboxing, no borders, no frames. "
          "Keep the existing middle artwork unchanged, same engraving style, same light grayscale tone, no text, no letters, no watermark.")

body = {"model": "qwen-image-edit",
        "input": {"messages": [{"role": "user", "content": [{"image": data_uri}, {"text": prompt}]}]},
        "parameters": {"size": "1664*928", "n": 1, "prompt_extend": False, "watermark": False}}
req = urllib.request.Request(URL, data=json.dumps(body).encode(),
                             headers={"Content-Type": "application/json", "Authorization": "Bearer " + API})
try:
    with urllib.request.urlopen(req, timeout=300) as r:
        res = json.loads(r.read().decode())
    print(json.dumps(res, ensure_ascii=False)[:400])
    url = res["output"]["choices"][0]["message"]["content"][0]["image"]
    out = os.path.join(OUT, "wide.png")
    urllib.request.urlretrieve(url, out)
    print("OK", out, Image.open(out).size)
except Exception as e:
    print("ERR", e)
    if hasattr(e, "read"):
        print(e.read().decode()[:600])
    sys.exit(1)
