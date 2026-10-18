from pathlib import Path
import json
base=Path(__file__).resolve().parent
root=base.parents[1]
d=json.loads((base/'_locale_en.json').read_text(encoding='utf-8'))
s=(base/'_locale_runtime.txt').read_text(encoding='utf-8')
(root/'孤屿遗章-游戏 - 发布/js/i18n.js').write_text('const DICTIONARY='+json.dumps(d,ensure_ascii=False)+';\n'+s,encoding='utf-8')
print('Offline locale built:',len(d),'entries')
