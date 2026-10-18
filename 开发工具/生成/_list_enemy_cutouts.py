import re,json
from pathlib import Path
from PIL import Image
root=Path('孤屿遗章-游戏 - 发布')
s=(root/'js/data.js').read_text(encoding='utf-8-sig').split('const ENEMIES = {')[1].split('const RECIPES')[0]
paths=sorted(set(re.findall(r"assets/img/[^']+\.png",s)))
print(json.dumps([str((root/p).resolve()) for p in paths if (root/p).exists() and (Image.open(root/p).mode!='RGBA' or Image.open(root/p).getextrema()[-1][0]==255)]))
