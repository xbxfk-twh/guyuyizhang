import concurrent.futures, importlib.util, json, pathlib, tempfile, unittest
spec=importlib.util.spec_from_file_location('backup_server',pathlib.Path(__file__).with_name('server.py'));mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
def body(day=12):
    return json.dumps({'payload':{'format':'guyu-persistent-v1','seq':1,'capturedAt':1,'keys':{'guyuyizhang_save':json.dumps({'day':day,'stats':{'hp':90}}),'guyuyizhang_meta':json.dumps({'soul':50,'slots':[None,None,None]})}},'checksum':'test'})
class Tests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.now=10000
        def verify(code):
            if code not in ['A','B']:raise mod.Failure(401,'invalid code')
            return 'verified-user-'+code
        self.s=mod.Store(pathlib.Path(self.tmp.name)/'save.sqlite3',{'account_key':'unit-only'},verify=verify,clock=lambda:self.now)
        self.a=self.s.auth('A')['token'];self.b=self.s.auth('B')['token']
    def tearDown(self):self.tmp.cleanup()
    def test_auth_and_isolation(self):
        with self.assertRaises(mod.Failure):self.s.auth('claimed-openid')
        self.s.save(self.a,0,body());self.assertFalse(self.s.load(self.b)['found'])
        self.assertTrue(self.s.load(self.s.auth('A')['token'])['found'])
        with self.assertRaises(mod.Failure):self.s.load('f'*64)
    def test_retry_no_duplicate(self):
        first=self.s.save(self.a,0,body());again=self.s.save(self.a,0,body());self.assertEqual(first['version'],again['version']);self.assertTrue(again['unchanged'])
    def test_concurrent_one_writer(self):
        def put(n):
            try:return self.s.save(self.a,0,body(n))['ok']
            except mod.Failure:return False
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(put,range(20,28)))
        self.assertEqual(sum(results),1);self.assertEqual(self.s.load(self.a)['version'],1)
    def test_old_version_never_overwrites(self):
        self.s.save(self.a,0,body(50));self.now+=60
        with self.assertRaises(mod.Failure) as e:self.s.save(self.a,0,body(1))
        self.assertEqual(e.exception.status,409);self.assertEqual(self.s.load(self.a)['body'],body(50))
    def test_limits_and_retention(self):
        for n in range(5):self.now+=60;self.s.save(self.a,n,body(n+1))
        with self.s.connect() as c:
            self.assertEqual(c.execute('SELECT count(*) FROM snapshots').fetchone()[0],3)
            self.assertEqual(c.execute('SELECT bytes FROM usage').fetchone()[0],c.execute('SELECT sum(length(data)) FROM snapshots').fetchone()[0])
        with self.assertRaises(mod.Failure) as e:self.s.save(self.a,5,body(99))
        self.assertEqual(e.exception.status,429)
        with self.assertRaises(mod.Failure):self.s.save(self.a,5,'a'*mod.MAX_BODY)
    def test_expiry_and_invalid_progress(self):
        self.now+=31*86400
        with self.assertRaises(mod.Failure):self.s.load(self.a)
        for raw in ['{}','[]',body().replace('guyu-persistent-v1','unknown')]:
            with self.assertRaises(mod.Failure):self.s.save(self.b,0,raw)
    def test_disk_failure_keeps_previous(self):
        self.s.save(self.a,0,body());self.now+=60
        with self.s.connect() as c:c.execute('CREATE TRIGGER injected BEFORE INSERT ON snapshots BEGIN SELECT RAISE(ABORT,"injected"); END;')
        with self.assertRaises(Exception):self.s.save(self.a,1,body(13))
        self.assertEqual(self.s.load(self.a)['body'],body())
    def test_global_quota_preserves_existing(self):
        self.s.save(self.a,0,body());self.now+=60
        with self.s.connect() as c:c.execute('UPDATE usage SET bytes=?',(mod.MAX_STORAGE,))
        with self.assertRaises(mod.Failure) as e:self.s.save(self.a,1,body(14))
        self.assertEqual(e.exception.status,503);self.assertEqual(self.s.load(self.a)['body'],body())
    def test_corrupt_latest_recovers_previous_with_current_cas(self):
        self.s.save(self.a,0,body(20));self.now+=60;self.s.save(self.a,1,body(21));self.now+=60
        with self.s.connect() as c:c.execute('UPDATE snapshots SET data=? WHERE version=2',(b'broken',))
        r=self.s.load(self.a);self.assertEqual(r['body'],body(20));self.assertEqual(r['version'],2);self.assertEqual(r['recoveredFrom'],1)
        self.assertEqual(self.s.save(self.a,r['version'],body(22))['version'],3)
    def test_shared_ip_login_burst_still_bounded(self):
        server=mod.Server(('127.0.0.1',0),self.s)
        try:
            self.assertTrue(all(server.auth_slot('campus',100) for _ in range(12)))
            self.assertFalse(server.auth_slot('campus',100));self.assertTrue(server.auth_slot('campus',101))
            self.assertTrue(server.auth_slot('other',100))
        finally:server.server_close()
if __name__=='__main__':
    result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Tests));print('RESULT:'+('PASS' if result.wasSuccessful() else 'FAIL'));raise SystemExit(not result.wasSuccessful())
