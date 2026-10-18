"""Generate an offline English dictionary from public game text fragments only."""
import json,urllib.request,urllib.parse,time,concurrent.futures
from pathlib import Path
root=Path(__file__).resolve().parents[2]
source=json.loads((Path(__file__).with_name('_locale_source.json')).read_text(encoding='utf-8'))
out=root/'孤屿遗章-游戏 - 发布/js/en-text.json'
cache=json.loads(out.read_text(encoding='utf-8')) if out.exists() else {}
pending=[s for s in source if s not in cache]
batches=[];batch=[];size=0
for s in pending:
 if size+len(s)>900 and batch:batches.append(batch);batch=[];size=0
 batch.append(s);size+=len(s)+1
if batch:batches.append(batch)
def fetch(batch):
 q='\n'.join(batch)
 url='https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q='+urllib.parse.quote(q)
 for n in range(4):
  try:
   with urllib.request.urlopen(url,timeout=35) as r:data=json.load(r)
   text=''.join(x[0] for x in data[0]);lines=text.split('\n')
   if len(lines)!=len(batch):raise ValueError('Line count differs')
   return dict(zip(batch,lines))
  except Exception:
   if n==3:raise
   time.sleep(1+n)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for i,res in enumerate(pool.map(fetch,batches)):
  cache.update(res);out.write_text(json.dumps(cache,ensure_ascii=False,indent=2),encoding='utf-8')
  print('Translated',len(cache),'/',len(source),flush=True)
