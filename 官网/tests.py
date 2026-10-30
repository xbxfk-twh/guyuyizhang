import importlib.util, json, subprocess, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('site_server',Path(__file__).with_name('server.py')); m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Tests(unittest.TestCase):
    def test_shared_replay(self):
        for seed in [1,4294967295,128738]:
            g=m.Snake(seed); rows=[{'body':list(g.body),'food':g.food,'score':g.score,'dead':g.dead}]
            for d in [1]*15:
                g.step(d);rows.append({'body':list(g.body),'food':g.food,'score':g.score,'dead':g.dead})
            js="const S=require('./snake.js');let s=new S("+str(seed)+");let a=[{body:s.body.map(p=>p.slice()),food:s.food,score:s.score,dead:s.dead}];for(let i=0;i<15;i++){s.step(1);a.push({body:s.body.map(p=>p.slice()),food:s.food,score:s.score,dead:s.dead})}process.stdout.write(JSON.stringify(a))"
            got=json.loads(subprocess.check_output(['node','-e',js],cwd=Path(__file__).parent))
            self.assertEqual(json.loads(json.dumps(rows)),got)
    def test_invalid_reverse(self):
        with self.assertRaises(ValueError):m.Snake(1).step(3)
        with self.assertRaises(ValueError):m.Snake(1).step(True)
    def test_move_into_tail(self):
        g=m.Snake(1);g.body=[(1,1),(1,2),(0,2),(0,1)];g.direction=0;g.food=(15,15);g.step(3);self.assertFalse(g.dead)
if __name__=='__main__':unittest.main()
