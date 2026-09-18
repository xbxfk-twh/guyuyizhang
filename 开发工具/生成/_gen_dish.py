import json, urllib.request, sys
# ⚠️ 密钥不许写进文件：从环境变量读（$env:DASHSCOPE_API_KEY='sk-...'）。
#    2026-09-18 清理：以前这里硬编码过一把 key，准备开源/上 GitHub 前必须改成读环境变量，
#    并且那把旧 key 建议去百炼后台重置一次（它在旧聊天记录里出现过）。
API = os.environ.get("DASHSCOPE_API_KEY", "")
if not API:
    raise SystemExit("没有 DASHSCOPE_API_KEY，先设置环境变量再跑")
URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
prompt = ("A game inventory icon sheet, 2x1 grid, monochrome black ink illustration, hand-drawn vector look, thick clean outlines, "
          "flat black and white shading, no color, no text, no letters, each item centered inside its own cell with generous white margin. "
          "Left cell: a small iron wok with stir-fried wild greens. "
          "Right cell: a small clay pot filled with stewed meat chunks, steam rising.")
body = {"model":"qwen-image-3.0","input":{"messages":[{"role":"user","content":[{"text":prompt}]}]},
        "parameters":{"size":"1024*512","n":1,"prompt_extend":False,"watermark":False}}
req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={"Content-Type":"application/json","Authorization":"Bearer "+API})
try:
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.loads(r.read().decode())
except Exception as e:
    print("ERR", e)
    if hasattr(e, "read"): print(e.read().decode()[:500])
    sys.exit(1)
url = data["output"]["choices"][0]["message"]["content"][0]["image"]
        open(r"C:\Users\34297\Desktop\孤屿遗章\归档\素材实验\_dish_url.txt", "w", encoding="utf-8").write(url)
print("OK", url[:110])
