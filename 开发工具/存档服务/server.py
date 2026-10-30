"""Lightweight backup only. Tap login is verified server-side; saves are not authoritative economy."""
import argparse, base64, binascii, hashlib, hmac, json, os, re, secrets, sqlite3, threading, time, urllib.parse, urllib.request, zlib
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

MAX_BODY=2*1024*1024
MAX_STORAGE=512*1024*1024
SAVE_KEYS={'guyuyizhang_save','guyuyizhang_save_bak','guyuyizhang_meta','guyuyizhang_meta_bak','guyuyizhang_rev','guyuyizhang_savedAt','guyuyizhang_rescue','guyuyizhang_write_journal','guyuyizhang_alternate_save'}

class Failure(Exception):
    def __init__(self,status,message,**details): self.status=status;self.message=message;self.details=details

class Transfers:
    """Ten-minute bearer codes. Memory only: never enter SQLite or daily backups."""
    TTL=600
    MAX_BYTES=16*1024*1024
    MAX_ENTRIES=500
    ALPHABET='23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    def __init__(self,clock=time.time):
        self.clock=clock;self.entries={};self.lock=threading.Lock();self.used=0
    def _purge(self):
        for key in [k for k,v in self.entries.items() if v[1]<=self.clock()]:
            self.used-=len(self.entries.pop(key)[0])
    def purge(self):
        with self.lock:self._purge()
    @staticmethod
    def validate(code):
        if not isinstance(code,str) or not 1<=len(code)<=MAX_BODY-4096:raise Failure(413,'存档过大，请使用备份文件迁移')
        try:
            raw=base64.b64decode(code,validate=True)
            data=json.loads(raw.decode('utf-8'))
            if not isinstance(data,dict) or data.get('v')!=1 or set(data)-{'v','t','meta','save','checksum'}:raise ValueError()
            meta=data.get('meta');save=data.get('save')
            if not isinstance(meta,dict):raise ValueError()
            if 'slots' in meta and (not isinstance(meta['slots'],list) or len(meta['slots']) not in (3,4)):raise ValueError()
            if save is not None and (not isinstance(save,dict) or type(save.get('day')) is not int or save['day']<1 or not isinstance(save.get('stats'),dict)):raise ValueError()
            if not re.fullmatch('[0-9a-f]{8}',str(data.get('checksum',''))):raise ValueError()
        except (ValueError,TypeError,UnicodeError,binascii.Error):raise Failure(400,'存档格式不完整，原进度未改变') from None
    def create(self,body):
        self.validate(body);packed=zlib.compress(body.encode('ascii'),6)
        with self.lock:
            self._purge()
            if len(self.entries)>=self.MAX_ENTRIES or self.used+len(packed)>self.MAX_BYTES:raise Failure(503,'临时取档空间暂满，请稍后重试或保存备份文件')
            while True:
                token=''.join(secrets.choice(self.ALPHABET) for _ in range(16))
                key=hashlib.sha256(token.encode()).digest()
                if key not in self.entries:break
            expires=int(self.clock()+self.TTL)
            self.entries[key]=(packed,expires);self.used+=len(packed)
        return {'ok':True,'code':'SAVE-'+'-'.join(token[i:i+4] for i in range(0,16,4)),'expiresAt':expires}
    def read(self,code):
        token=re.sub(r'[\s-]','',str(code or '')).upper()
        if not re.fullmatch('SAVE['+self.ALPHABET+']{16}',token):raise Failure(400,'请输入完整的临时取档码')
        key=hashlib.sha256(token[4:].encode()).digest()
        with self.lock:
            self._purge();entry=self.entries.get(key)
            if not entry:raise Failure(404,'取档码不存在或已过期，请在原设备重新生成')
            packed,expires=entry
        return {'ok':True,'body':zlib.decompress(packed).decode('ascii'),'expiresAt':expires}

class Store:
    def __init__(self,path,config,verify=None,clock=time.time):
        self.path=str(path);self.config=config;self.verify=verify or self.verify_tap;self.clock=clock
        Path(path).parent.mkdir(parents=True,exist_ok=True)
        with self.connect() as c:
            c.executescript('''PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,version INTEGER NOT NULL DEFAULT 0,created REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,account TEXT NOT NULL,expires REAL NOT NULL);
            CREATE INDEX IF NOT EXISTS session_account ON sessions(account);
            CREATE TABLE IF NOT EXISTS snapshots(account TEXT NOT NULL,version INTEGER NOT NULL,hash TEXT NOT NULL,data BLOB NOT NULL,created REAL NOT NULL,PRIMARY KEY(account,version));
            CREATE TABLE IF NOT EXISTS usage(id INTEGER PRIMARY KEY,bytes INTEGER NOT NULL);
            INSERT OR IGNORE INTO usage VALUES(1,0);''')
    @contextmanager
    def connect(self):
        c=sqlite3.connect(self.path,timeout=5);c.row_factory=sqlite3.Row
        try:
            with c:yield c
        finally:c.close()
    def verify_tap(self,code):
        query=urllib.parse.urlencode({'appid':self.config['appid'],'secret':self.config['secret'],'js_code':code,'grant_type':'authorization_code'})
        try:
            with urllib.request.urlopen('https://cloud-miniapp.tapapis.cn/auth/v1/jscode2session?'+query,timeout=5) as response:
                data=json.loads(response.read(65536))
        except Exception:raise Failure(503,'TapTap身份校验暂不可用，请稍后重试') from None
        if not isinstance(data.get('openid'),str) or not data['openid'] or data.get('errcode'):
            raise Failure(401,'登录凭证已失效，请重新登录')
        # 不保存或下发session_key；只使用经过Tap服务器确认的openid。
        return data['openid']
    def auth(self,code):
        if not isinstance(code,str) or not 1<=len(code)<=2048:raise Failure(400,'登录凭证格式错误')
        user=self.verify(code)
        account=hmac.new(self.config['account_key'].encode(),user.encode(),hashlib.sha256).hexdigest()
        token=secrets.token_hex(32);digest=hashlib.sha256(token.encode()).hexdigest();expires=int(self.clock()+30*86400)
        with self.connect() as c:
            c.execute('BEGIN IMMEDIATE')
            if not c.execute('SELECT 1 FROM accounts WHERE id=?',(account,)).fetchone():
                if c.execute('SELECT count(*) FROM accounts').fetchone()[0]>=10000:raise Failure(503,'备用存档空间暂满，设备备份仍可使用')
                c.execute('INSERT INTO accounts(id,created) VALUES(?,?)',(account,self.clock()))
            c.execute('DELETE FROM sessions WHERE expires<?',(self.clock(),))
            # 每账号最多保留3台设备的有效会话，防止会话表无限增长。
            old=c.execute('SELECT token_hash FROM sessions WHERE account=? ORDER BY expires DESC',(account,)).fetchall()
            for row in old[2:]:c.execute('DELETE FROM sessions WHERE token_hash=?',(row[0],))
            c.execute('INSERT INTO sessions VALUES(?,?,?)',(digest,account,expires))
        return {'ok':True,'token':token,'expires':expires}
    def account(self,c,token):
        if not isinstance(token,str) or len(token)!=64 or any(x not in '0123456789abcdef' for x in token):raise Failure(401,'备用存档登录已失效')
        row=c.execute('SELECT account FROM sessions WHERE token_hash=? AND expires>?',(hashlib.sha256(token.encode()).hexdigest(),self.clock())).fetchone()
        if not row:raise Failure(401,'备用存档登录已失效')
        return row['account']
    def load(self,token):
        with self.connect() as c:
            account=self.account(c,token)
            rows=c.execute('SELECT * FROM snapshots WHERE account=? ORDER BY version DESC LIMIT 3',(account,)).fetchall()
            if not rows:return {'ok':True,'found':False,'version':0}
            for row in rows:
                try:
                    raw=zlib.decompressobj().decompress(row['data'],MAX_BODY+1)
                    if len(raw)>MAX_BODY or hashlib.sha256(raw).hexdigest()!=row['hash']:continue
                    return {'ok':True,'found':True,'version':rows[0]['version'],'body':raw.decode(),'savedAt':row['created'],'recoveredFrom':row['version']}
                except (zlib.error,UnicodeError):continue
            raise Failure(503,'备用存档校验失败，原记录已保留')
    @staticmethod
    def validate(body):
        if not isinstance(body,str) or len(body.encode())>MAX_BODY-4096:raise Failure(413,'存档超过备用大小上限')
        try:
            wrapper=json.loads(body);p=wrapper['payload'];k=p['keys']
            if p['format']!='guyu-persistent-v1' or not isinstance(k,dict) or set(k)-SAVE_KEYS or k.get('guyuyizhang_write_journal'):raise ValueError()
            if any(v is not None and not isinstance(v,str) for v in k.values()):raise ValueError()
            metas=[]
            for key in ['guyuyizhang_meta','guyuyizhang_meta_bak']:
                try:metas.append(json.loads(k[key]))
                except (KeyError,ValueError,TypeError):pass
            if not any(isinstance(m,dict) for m in metas):raise ValueError()
            runs=[]
            for key in ['guyuyizhang_save','guyuyizhang_save_bak']:
                try:runs.append(json.loads(k[key]))
                except (KeyError,ValueError,TypeError):pass
            if any(k.get(x) for x in ['guyuyizhang_save','guyuyizhang_save_bak']) and not any(isinstance(r,dict) and type(r.get('day')) is int and r['day']>0 and isinstance(r.get('stats'),dict) for r in runs):raise ValueError()
        except (ValueError,TypeError,KeyError):raise Failure(400,'存档不完整，未覆盖原记录') from None
    def save(self,token,base_version,body):
        if type(base_version) is not int or base_version<0:raise Failure(400,'备用版本号错误')
        self.validate(body);raw=body.encode();digest=hashlib.sha256(raw).hexdigest();packed=zlib.compress(raw,6)
        with self.connect() as c:
            c.execute('BEGIN IMMEDIATE');account=self.account(c,token)
            row=c.execute('SELECT * FROM snapshots WHERE account=? ORDER BY version DESC LIMIT 1',(account,)).fetchone()
            version=row['version'] if row else 0
            if row and row['hash']==digest:return {'ok':True,'version':version,'unchanged':True}
            if version!=base_version:raise Failure(409,'另一设备已更新备用存档，请重新打开游戏选择',version=version)
            if row and self.clock()-row['created']<45:raise Failure(429,'备用存档保存过于频繁，请稍后重试')
            older=c.execute('SELECT version,length(data) AS size FROM snapshots WHERE account=? ORDER BY version DESC',(account,)).fetchall()[2:]
            removed=sum(r['size'] for r in older)
            used=c.execute('SELECT bytes FROM usage WHERE id=1').fetchone()[0]
            if used+len(packed)-removed>MAX_STORAGE:raise Failure(503,'备用存档空间暂满，本机进度未删除')
            c.execute('INSERT INTO snapshots VALUES(?,?,?,?,?)',(account,version+1,digest,packed,self.clock()))
            for old in older:c.execute('DELETE FROM snapshots WHERE account=? AND version=?',(account,old['version']))
            c.execute('UPDATE usage SET bytes=bytes+? WHERE id=1',(len(packed)-removed,))
            c.execute('UPDATE accounts SET version=? WHERE id=?',(version+1,account))
        return {'ok':True,'version':version+1}

class Handler(BaseHTTPRequestHandler):
    def setup(self):super().setup();self.connection.settimeout(10)
    def log_message(self,*args):pass # 不记录存档正文、登录code或Authorization。
    def reply(self,status,data):
        raw=json.dumps(data,ensure_ascii=False,separators=(',',':')).encode()
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(raw)))
        self.send_header('Access-Control-Allow-Origin','*');self.send_header('Access-Control-Allow-Headers','Authorization, Content-Type');self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS');self.send_header('Access-Control-Max-Age','600');self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.end_headers();self.wfile.write(raw)
    def do_OPTIONS(self):self.reply(200,{'ok':True})
    def token(self):
        header=self.headers.get('Authorization','')
        if not header.startswith('Bearer '):raise Failure(401,'请先验证备用存档身份')
        return header[7:]
    def dispatch(self):
        try:
            if self.path=='/backup/v1/health':return self.reply(200,{'ok':True,'service':'guyu-save','format':1})
            if self.command=='GET' and self.path=='/backup/v1/latest':return self.reply(200,self.server.store.load(self.token()))
            if self.command!='POST' or self.path not in ['/backup/v1/auth','/backup/v1/save','/backup/v1/transfer/create','/backup/v1/transfer/read']:raise Failure(404,'接口不存在')
            if self.headers.get('Transfer-Encoding'):raise Failure(400,'不支持分块请求')
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=MAX_BODY:raise Failure(413,'请求大小超限')
            if self.path.endswith('/transfer/read') and size>1024:raise Failure(413,'取档码格式错误')
            data=json.loads(self.rfile.read(size))
            if not isinstance(data,dict):raise Failure(400,'请求格式错误')
            if '/transfer/' in self.path:
                creating=self.path.endswith('/create')
                ip=self.headers.get('X-Real-IP',self.client_address[0])
                if not self.server.transfer_slot(ip,creating):raise Failure(429,'操作过于频繁，请稍后重试')
                return self.reply(200,self.server.transfers.create(data.get('body')) if creating else self.server.transfers.read(data.get('code')))
            if self.path.endswith('/auth'):
                # 短期内存限流只针对身份校验，不在保存路径调用Tap接口。
                ip=self.headers.get('X-Real-IP',self.client_address[0]);now=time.time()
                if not self.server.auth_slot(ip,now):raise Failure(429,'请稍后再试')
                return self.reply(200,self.server.store.auth(data.get('code')))
            return self.reply(200,self.server.store.save(self.token(),data.get('baseVersion'),data.get('body')))
        except Failure as e:self.reply(e.status,{'ok':False,'reason':e.message,**e.details})
        except (ValueError,TypeError,UnicodeError):self.reply(400,{'ok':False,'reason':'请求格式错误'})
        except Exception:self.reply(503,{'ok':False,'reason':'备用存档服务暂时不可用，本机进度仍保留'})
    def do_GET(self):self.dispatch()
    def do_POST(self):self.dispatch()

class Server(ThreadingHTTPServer):
    daemon_threads=True
    def __init__(self,address,store):
        super().__init__(address,Handler);self.store=store;self.transfers=Transfers();self.workers=threading.BoundedSemaphore(4);self.limits={};self.limit_lock=threading.Lock();self.last_purge=0
    def service_actions(self):
        if time.monotonic()-self.last_purge>=10:self.transfers.purge();self.last_purge=time.monotonic()
    def transfer_slot(self,ip,creating):
        now=time.time();key=('create' if creating else 'read',ip);capacity,rate=(5,1/30) if creating else (20,1/3)
        with self.limit_lock:
            # Never clear active limits when full; new senders wait for stale entries to age out.
            if len(self.limits)>4096:
                for old in [k for k,v in self.limits.items() if now-v[1]>900]:self.limits.pop(old,None)
                if key not in self.limits and len(self.limits)>4096:return False
            tokens,last=self.limits.get(key,(capacity,now));tokens=min(capacity,tokens+max(0,now-last)*rate)
            accepted=tokens>=1;self.limits[key]=(tokens-1 if accepted else tokens,now);return accepted
    def process_request(self,request,address):
        if not self.workers.acquire(False):
            request.sendall(b'HTTP/1.0 503 Busy\r\nContent-Length: 0\r\n\r\n');self.shutdown_request(request);return
        try:super().process_request(request,address)
        except BaseException:self.workers.release();raise
    def process_request_thread(self,request,address):
        try:super().process_request_thread(request,address)
        finally:self.workers.release()
    def auth_slot(self,ip,now):
        # 同宿舍/校园共享公网IP时允许短时登录并发；持续请求仍限流。
        with self.limit_lock:
            tokens,last=self.limits.get(ip,(12,now));tokens=min(12,tokens+max(0,now-last)*2)
            if len(self.limits)>4096:
                for old in [k for k,v in self.limits.items() if now-v[1]>900]:self.limits.pop(old,None)
                if ip not in self.limits and len(self.limits)>4096:return False
            accepted=tokens>=1;self.limits[ip]=(tokens-1 if accepted else tokens,now);return accepted

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--db',required=True);p.add_argument('--config',required=True);p.add_argument('--port',type=int,default=18083);a=p.parse_args()
    config=json.loads(Path(a.config).read_text())
    for key in ['appid','secret','account_key']:
        if not isinstance(config.get(key),str) or not config[key]:raise SystemExit('Missing server-only configuration: '+key)
    Server(('127.0.0.1',a.port),Store(a.db,config)).serve_forever()
