import base64, concurrent.futures, importlib.util, json, pathlib, tempfile, threading, unittest, urllib.request
spec=importlib.util.spec_from_file_location('save_server',pathlib.Path(__file__).with_name('server.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def code(day=8):
    return base64.b64encode(json.dumps({'v':1,'t':'test','checksum':'12345678','meta':{'soul':321,'slots':[None,None,None]},'save':{'day':day,'stats':{'hp':90},'inv':{'wood':12}}},ensure_ascii=False).encode()).decode()
class Tests(unittest.TestCase):
    def setUp(self):self.now=10000;self.s=m.Transfers(clock=lambda:self.now)
    def test_roundtrip_and_expiry_boundary(self):
        r=self.s.create(code());self.assertRegex(r['code'],r'^SAVE-(?:[2-9A-HJ-NP-Z]{4}-){3}[2-9A-HJ-NP-Z]{4}$');self.assertEqual(r['expiresAt'],10600)
        self.now=10599;self.assertEqual(self.s.read(r['code'].lower())['body'],code())
        self.now=10600
        with self.assertRaises(m.Failure) as e:self.s.read(r['code'])
        self.assertEqual(e.exception.status,404);self.assertEqual(self.s.used,0);self.assertFalse(self.s.entries)
    def test_preview_retry_does_not_consume(self):
        r=self.s.create(code())
        for _ in range(3):self.assertEqual(self.s.read(r['code'])['body'],code())
    def test_wrong_code_does_not_delete_real_one(self):
        r=self.s.create(code())
        with self.assertRaises(m.Failure):self.s.read('SAVE-2222-2222-2222-2222')
        self.assertEqual(self.s.read(r['code'])['body'],code())
    def test_malformed_payload_rejected(self):
        for body in ['',None,'bad',base64.b64encode(b'[]').decode(),base64.b64encode(b'{"v":1,"meta":[]}').decode(),'A'*m.MAX_BODY]:
            with self.assertRaises(m.Failure):self.s.create(body)
        self.assertFalse(self.s.entries)
    def test_concurrency_unique_and_isolated(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:rows=list(pool.map(lambda n:(n,self.s.create(code(n))),range(1,41)))
        self.assertEqual(len({r['code'] for _,r in rows}),40)
        for n,r in rows:self.assertEqual(self.s.read(r['code'])['body'],code(n))
    def test_quota_rejection_keeps_existing(self):
        r=self.s.create(code());self.s.MAX_BYTES=self.s.used
        with self.assertRaises(m.Failure):self.s.create(code(9))
        self.assertEqual(self.s.read(r['code'])['body'],code())
    def test_expired_memory_reclaimed_without_read(self):
        self.s.create(code());self.now+=601;self.s.purge();self.assertEqual(self.s.used,0);self.assertFalse(self.s.entries)
    def test_no_transfer_in_database_and_restart_discards(self):
        with tempfile.TemporaryDirectory() as tmp:
            store=m.Store(pathlib.Path(tmp)/'db.sqlite3',{'account_key':'test'},verify=lambda c:'test')
            r=self.s.create(code())
            with store.connect() as c:self.assertFalse(c.execute("SELECT name FROM sqlite_master WHERE name LIKE '%transfer%'").fetchall())
            with self.assertRaises(m.Failure):m.Transfers().read(r['code'])
    def test_http_without_tap_login_and_cors(self):
        with tempfile.TemporaryDirectory() as tmp:
            server=m.Server(('127.0.0.1',0),m.Store(pathlib.Path(tmp)/'db.sqlite3',{'account_key':'test'},verify=lambda c:'test'))
            thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
            def post(path,data):
                req=urllib.request.Request('http://127.0.0.1:'+str(server.server_port)+'/backup/v1/transfer/'+path,data=json.dumps(data).encode(),headers={'Content-Type':'application/json'},method='POST')
                with urllib.request.urlopen(req,timeout=3) as res:self.assertEqual(res.headers['Access-Control-Allow-Origin'],'*');return json.load(res)
            try:r=post('create',{'body':code()});self.assertEqual(post('read',{'code':r['code']})['body'],code())
            finally:server.shutdown();server.server_close();thread.join()
    def test_rate_limit_separate_and_bounded(self):
        with tempfile.TemporaryDirectory() as tmp:
            server=m.Server(('127.0.0.1',0),m.Store(pathlib.Path(tmp)/'db.sqlite3',{'account_key':'test'},verify=lambda c:'test'))
            try:
                for _ in range(5):self.assertTrue(server.transfer_slot('one',True))
                self.assertFalse(server.transfer_slot('one',True));self.assertTrue(server.transfer_slot('one',False));self.assertTrue(server.transfer_slot('two',True))
            finally:server.server_close()
if __name__=='__main__':unittest.main(verbosity=2)
