"""Standalone website API. SQLite persistence; server verifies Snake replays."""
import argparse, hashlib, json, secrets, sqlite3, time, threading
from contextlib import contextmanager
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

class Snake:
    def __init__(self, seed):
        self.rng=seed or 1; self.body=[(5,10),(4,10),(3,10)]; self.direction=1; self.score=0; self.dead=False; self.food=self.spawn()
    def random(self):
        x=self.rng; x^=(x<<13)&0xffffffff; x^=x>>17; x^=(x<<5)&0xffffffff; self.rng=x&0xffffffff; return self.rng
    def spawn(self):
        free=[(x,y) for y in range(20) for x in range(20) if (x,y) not in self.body]
        return free[self.random()%len(free)] if free else None
    def step(self,d):
        if type(d)!=int or not 0<=d<=3 or (d+2)%4==self.direction or self.dead: raise ValueError('无效的游戏记录')
        self.direction=d; v=[(0,-1),(1,0),(0,1),(-1,0)][d]; head=(self.body[0][0]+v[0],self.body[0][1]+v[1]); eat=head==self.food
        if not all(0<=n<20 for n in head) or head in (self.body if eat else self.body[:-1]): self.dead=True; return
        self.body.insert(0,head)
        if eat: self.score+=10; self.food=self.spawn(); self.dead=self.food is None
        else: self.body.pop()

@contextmanager
def connect():
    c=sqlite3.connect(DB,timeout=15); c.row_factory=sqlite3.Row
    try:
        with c: yield c
    finally: c.close()
def init():
    Path(DB).parent.mkdir(parents=True,exist_ok=True)
    with connect() as c:
        c.executescript('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,name TEXT NOT NULL,text TEXT NOT NULL,created REAL NOT NULL,approved INTEGER DEFAULT 0); CREATE TABLE IF NOT EXISTS games(id TEXT PRIMARY KEY,token TEXT,seed INTEGER,created REAL,name TEXT,score INTEGER,steps INTEGER,replay TEXT);')
limits={}; lock=threading.Lock()
def rate(ip,kind,seconds):
    now=time.time()
    with lock:
        if len(limits)>10000:
            for k in list(limits):
                if now-limits[k]>3600: del limits[k]
        key=(ip,kind)
        if now-limits.get(key,0)<seconds: raise ValueError('操作太频繁，请稍后再试')
        limits[key]=now
def clean(v,n):
    if not isinstance(v,str): raise ValueError('请填写昵称和内容')
    v=v.strip()
    if not v or len(v)>n or any(ord(x)<32 and x not in '\n\t' for x in v): raise ValueError('内容为空或超过长度限制')
    return v

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(Path(__file__).parent),**kw)
    def log_message(self,*a): pass
    def respond(self,data,status=200):
        raw=json.dumps(data,ensure_ascii=False).encode(); self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Cache-Control','no-store'); self.send_header('Content-Length',str(len(raw))); self.end_headers(); self.wfile.write(raw)
    def do_GET(self):
        if self.path.startswith('/api/'):
            with connect() as c:
                if self.path=='/api/messages': rows=c.execute('SELECT name,text,created FROM messages WHERE approved=1 ORDER BY id DESC LIMIT 50').fetchall()
                elif self.path=='/api/leaderboard': rows=c.execute('SELECT name,MAX(score) AS score FROM games WHERE score>0 GROUP BY name ORDER BY score DESC,name ASC LIMIT 20').fetchall()
                elif self.path=='/api/health': return self.respond({'ok':True})
                else: return self.respond({'error':'没有这个接口'},404)
            return self.respond({'rows':[dict(r) for r in rows]})
        if self.path.split('?')[0].endswith(('.py','.sqlite3')): return self.respond({'error':'没有这个页面'},404)
        super().do_GET()
    def do_POST(self):
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=70000: raise ValueError('请求过大或为空')
            data=json.loads(self.rfile.read(length)); ip=self.headers.get('X-Real-IP',self.client_address[0]) if self.client_address[0]=='127.0.0.1' else self.client_address[0]
            if not isinstance(data,dict): raise ValueError('请求格式错误')
            if self.path=='/api/messages':
                name=clean(data.get('name'),20); body=clean(data.get('text'),600); rate(ip,'message',60)
                with connect() as c: c.execute('INSERT INTO messages(name,text,created) VALUES(?,?,?)',(name,body,time.time()))
                return self.respond({'ok':True,'pending':True})
            if self.path=='/api/snake/start':
                rate(ip,'start',2); gid=secrets.token_urlsafe(18); token=secrets.token_urlsafe(24); seed=secrets.randbelow(0xffffffff)+1
                with connect() as c:
                    c.execute('DELETE FROM games WHERE score IS NULL AND created<?',(time.time()-86400,))
                    c.execute('INSERT INTO games(id,token,seed,created) VALUES(?,?,?,?)',(gid,hashlib.sha256(token.encode()).hexdigest(),seed,time.time()))
                return self.respond({'id':gid,'token':token,'seed':seed})
            if self.path=='/api/snake/finish':
                name=clean(data.get('name'),20); dirs=data.get('dirs'); token=data.get('token'); gid=data.get('id')
                if not isinstance(dirs,list) or not 1<=len(dirs)<=15000 or not isinstance(token,str) or not isinstance(gid,str): raise ValueError('无效的游戏记录')
                digest=hashlib.sha256(json.dumps([name,dirs],separators=(',',':')).encode()).hexdigest()
                with connect() as c:
                    c.execute('BEGIN IMMEDIATE'); r=c.execute('SELECT * FROM games WHERE id=?',(gid,)).fetchone()
                    if not r or not secrets.compare_digest(r['token'],hashlib.sha256(token.encode()).hexdigest()): raise ValueError('游戏凭证无效')
                    if r['score'] is not None:
                        if r['replay']!=digest: raise ValueError('本局已经登记')
                        return self.respond({'score':r['score']})
                    elapsed=time.time()-r['created']
                    if elapsed>3600 or elapsed<len(dirs)*.12-1: raise ValueError('游戏时间不符合记录')
                    game=Snake(r['seed'])
                    for d in dirs: game.step(d)
                    if not game.dead: raise ValueError('游戏尚未结束')
                    c.execute('UPDATE games SET name=?,score=?,steps=?,replay=? WHERE id=?',(name,game.score,len(dirs),digest,gid))
                return self.respond({'score':game.score})
            self.respond({'error':'没有这个接口'},404)
        except (ValueError,TypeError,json.JSONDecodeError) as e: self.respond({'error':str(e)},400)
        except Exception: self.respond({'error':'服务暂时不可用，请稍后再试'},500)

if __name__=='__main__':
    p=argparse.ArgumentParser(); p.add_argument('--db',default=str(Path(__file__).parent/'_local/site.sqlite3')); p.add_argument('--port',type=int,default=18082); p.add_argument('--approve',type=int); p.add_argument('--pending',action='store_true'); args=p.parse_args(); DB=args.db; init()
    if args.pending:
        with connect() as c:
            for r in c.execute('SELECT id,name,text FROM messages WHERE approved=0'): print(dict(r))
    elif args.approve is not None:
        with connect() as c: c.execute('UPDATE messages SET approved=1 WHERE id=?',(args.approve,))
    else: ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
