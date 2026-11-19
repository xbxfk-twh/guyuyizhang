from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import tempfile
import unittest
import uuid

from server import Rooms, RuleError


class SharedRoomTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.db = Path(self.directory.name) / 'rooms.sqlite3'
        self.now = 1000
        self.rooms = Rooms(self.db, lambda: self.now)
        a = self.rooms.request({'action':'create'})
        b = self.rooms.request({'action':'join', 'room':a['room']})
        self.a, self.b = [{k: q[k] for k in ('room','secret')} for q in (a,b)]

    def send(self, session, action, **args):
        return self.rooms.request(session | {'action':action, 'nonce':str(uuid.uuid4())} | args)

    def meet(self):
        self.send(self.a,'travel',zone='forest')
        self.send(self.b,'travel',zone='forest')
        self.now += 15
        self.send(self.a,'state')
        self.send(self.b,'state')

    def test_parallel_actions_and_reload(self):
        a = self.send(self.a,'travel',zone='forest')
        b = self.send(self.b,'craft')
        self.assertEqual(a['players'][0]['job']['due'], self.now + 15)
        self.assertEqual(b['players'][1]['job']['due'], self.now + 10)
        self.now += 10
        self.rooms = Rooms(self.db, lambda: self.now)
        b = self.send(self.b,'state')
        self.assertEqual(b['players'][1]['bag']['bandage'],2)
        self.assertEqual(b['players'][0]['zone'],'camp')
        self.assertNotIn('bag',b['players'][0])
        self.assertNotIn('secret',b['players'][0])
        self.now += 5
        self.assertEqual(self.send(self.a,'state')['players'][0]['zone'],'forest')
        self.assertEqual(self.send(self.b,'state')['players'][1]['bag']['bandage'],2)
        self.assertEqual(self.send(self.a,'state')['minute'],self.send(self.b,'state')['minute'])

    def test_invite_same_place_and_decline(self):
        self.send(self.a,'travel',zone='forest')
        self.now += 15
        with self.assertRaisesRegex(RuleError,'同一地点'):
            self.send(self.a,'invite')
        self.send(self.b,'travel',zone='forest')
        self.now += 15
        self.send(self.b,'state')
        self.send(self.a,'invite')
        b = self.send(self.b,'state')
        self.assertEqual(b['invite']['to'],1)
        with self.assertRaisesRegex(RuleError,'另一位'):
            self.send(self.a,'accept')
        self.assertIsNone(self.send(self.b,'decline')['invite'])
        self.assertIsNone(self.send(self.a,'state')['fight'])
        self.send(self.a,'invite')
        self.send(self.b,'travel',zone='cave')
        with self.assertRaisesRegex(RuleError,'结束'):
            self.send(self.b,'accept')

    def test_concurrent_targets_and_idempotency(self):
        self.meet()
        self.send(self.a,'invite')
        fight = self.send(self.b,'accept')['fight']
        self.assertEqual(fight['team'],[0,1])
        nonce = str(uuid.uuid4())
        with ThreadPoolExecutor(max_workers=2) as threads:
            a = threads.submit(self.send,self.a,'attack',target=0,nonce=nonce)
            b = threads.submit(self.send,self.b,'attack',target=1)
            a.result()
            b.result()
        result = self.send(self.a,'attack',target=0,nonce=nonce)
        self.assertEqual([p['target'] for p in result['players']],[0,1])
        fight = result['fight']
        self.assertEqual([foe['hp'] for foe in fight['foes']],[23,34])
        self.assertEqual({(e['seat'],e['target']) for e in fight['effects']},{(0,0),(1,1)})
        with self.assertRaisesRegex(RuleError,'恢复'):
            self.send(self.a,'attack',target=0)

    def test_shared_chest_does_not_duplicate_last_item(self):
        self.send(self.a,'store',item='wood')
        def take(session):
            try:
                self.send(session,'take',item='wood')
                return 1
            except RuleError:
                return 0
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sum(pool.map(take,(self.a,self.b))),1)
        self.assertEqual(self.send(self.a,'state')['chest']['wood'],0)

    def test_join_and_token_validation(self):
        with self.assertRaisesRegex(RuleError,'满了'):
            self.rooms.request({'action':'join','room':self.a['room']})
        with self.assertRaisesRegex(RuleError,'凭据'):
            self.send(self.a | {'secret':'a'*32},'state')


if __name__ == '__main__':
    unittest.main()
