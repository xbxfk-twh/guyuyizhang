"""Integration tests run only against an isolated temporary database."""
import importlib.util,json,urllib.request,urllib.error,sqlite3,tempfile,subprocess,time,sys
from collections import deque
from contextlib import contextmanager
from pathlib import Path
folder=Path(__file__).parent
spec=importlib.util.spec_from_file_location('site_api',folder/'server.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
@contextmanager
def database(file):
    c=sqlite3.connect(file)
    try:
        with c:yield c
    finally:c.close()
with tempfile.TemporaryDirectory() as temp:
    db=str(Path(temp)/'test.sqlite3');p=subprocess.Popen([sys.executable,str(folder/'server.py'),'--db',db,'--port','18083'],stdout=subprocess.DEVNULL)
    def req(path,data=None):
        raw=json.dumps(data).encode() if data is not None else None
        r=urllib.request.Request('http://127.0.0.1:18083/api'+path,data=raw,headers={'Content-Type':'application/json'})
        with urllib.request.urlopen(r) as response:return json.load(response)
    def rejected(path,data):
        try:req(path,data)
        except urllib.error.HTTPError as e:assert e.code==400;return
        raise AssertionError('Invalid request accepted')
    try:
        for _ in range(50):
            try:req('/health');break
            except Exception:time.sleep(.1)
        assert req('/messages')['rows']==[]
        assert req('/messages',{'name':'测试岛民','text':'<script>alert(1)</script>'})['pending']
        assert req('/messages')['rows']==[]
        with database(db) as c:c.execute('UPDATE messages SET approved=1')
        assert req('/messages')['rows'][0]['text']=='<script>alert(1)</script>'
        rejected('/messages',{'name':'测试','text':'x'*601})
        session=req('/snake/start',{});g=m.Snake(session['seed']);dirs=[]
        for _ in range(3):
            queue=deque([(g.body[0],[]) ]);seen={g.body[0]};found=None
            while queue:
                cell,path=queue.popleft()
                if cell==g.food:found=path;break
                for d,v in enumerate([(0,-1),(1,0),(0,1),(-1,0)]):
                    dest=(cell[0]+v[0],cell[1]+v[1])
                    if not path and (d+2)%4==g.direction:continue
                    if all(0<=n<20 for n in dest) and dest not in seen and dest not in g.body[1:]:seen.add(dest);queue.append((dest,path+[d]))
            assert found
            for d in found:g.step(d);dirs.append(d)
        while not g.dead:dirs.append(g.direction);g.step(g.direction)
        body={**session,'name':'测试岛民','dirs':dirs}
        rejected('/snake/finish',body)
        with database(db) as c:c.execute('UPDATE games SET created=? WHERE id=?',(time.time()-len(dirs)*.12-2,session['id']))
        result=req('/snake/finish',body);assert result['score']>=30
        assert req('/snake/finish',body)==result
        assert req('/leaderboard')['rows'][0]['score']==result['score']
        rejected('/snake/finish',{**body,'name':'冒名'})
        rejected('/snake/finish',{**body,'token':'bad'})
        print('PASS pending moderation, content limits, positive score, timing validation, idempotency, leaderboard, invalid token')
    finally:p.terminate();p.wait()
