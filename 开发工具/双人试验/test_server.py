from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import tempfile
import unittest
import uuid

from server import PRESENCE, Rooms, RuleError, travel_minutes


class RoomTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.db = Path(self.directory.name) / 'rooms.sqlite3'
        self.now = 1000.0
        self.rooms = Rooms(self.db, lambda: self.now)
        a = self.rooms.request({'action':'create'})
        self.a = self.credentials(a)
        self.b = self.credentials(self.rooms.request({'action':'join', 'room':a['room']}))

    def credentials(self, view):
        return {k:view[k] for k in ('room','secret')}

    def send(self, session, action, **data):
        return self.rooms.request(session | {'action':action, 'nonce':str(uuid.uuid4())} | data)

    def meet(self, location='forest'):
        for session in (self.a, self.b):
            self.send(session, 'travel', zone=location)
        self.now += travel_minutes('camp', location) / 10

    def edit_room(self, edit):
        def change(db):
            key = self.a['room']
            room = json.loads(db.execute('SELECT state FROM rooms WHERE code=?',(key,)).fetchone()[0])
            edit(room)
            db.execute('UPDATE rooms SET state=? WHERE code=?',(json.dumps(room),key))
        self.rooms.transaction(change)

    def test_original_distances_and_piecewise_clock(self):
        self.assertEqual(travel_minutes('camp','cave'),35)
        self.assertEqual(travel_minutes('cave','camp'),35)
        self.assertEqual(travel_minutes('forest','cave'),20)
        self.now += 5
        a = self.send(self.a,'travel',zone='cave')
        self.assertEqual(a['clockMinute'],481)
        self.assertEqual(a['clockRate'],3)
        self.assertEqual(a['players'][0]['job']['due'],round(self.now+35/3,3))
        b = self.send(self.b,'craft')
        self.assertEqual(b['clockRate'],10)
        self.assertEqual(b['players'][1]['job']['due'],self.now+1.5)
        self.assertAlmostEqual(b['players'][0]['job']['due'],self.now+1.5+20/3,places=3)
        self.now += 3.5
        self.rooms = Rooms(self.db,lambda:self.now)
        b = self.send(self.b,'state')
        self.assertEqual(b['players'][1]['bag']['bandage'],1)
        self.assertEqual(b['clockRate'],3)
        self.assertAlmostEqual(b['clockMinute'],502)

    def test_departure_pauses_jobs_and_resumes_without_catchup(self):
        self.send(self.a,'travel',zone='cave')
        self.send(self.b,'craft')
        self.now += 1
        b = self.send(self.b,'leave')
        self.assertEqual(b['clockRate'],10)
        self.assertFalse(b['players'][1]['online'])
        self.assertEqual(b['players'][1]['job']['left'],5)
        self.now += 2.5
        a = self.send(self.a,'state')
        self.assertEqual(a['players'][0]['zone'],'cave')
        self.assertEqual(a['clockRate'],.2)
        self.send(self.a,'leave')
        self.now += 10000
        b = self.send(self.b,'state')
        self.assertAlmostEqual(b['clockMinute'],a['clockMinute'])
        self.assertEqual(b['clockRate'],10)
        self.now += .5
        self.assertEqual(self.send(self.b,'state')['players'][1]['bag']['bandage'],1)

    def test_heartbeat_expiry_preserves_partial_action_on_restart(self):
        self.edit_room(lambda room:room['players'][0]['bag'].update(wood=30,water=30))
        a = self.send(self.a,'craft',count=20)
        self.assertGreater(a['players'][0]['job']['due'] - self.now, a['adWait'])
        self.now += PRESENCE + 1000
        self.rooms = Rooms(self.db,lambda:self.now)
        a = self.send(self.a,'state')
        self.assertFalse(a['players'][1]['online'])
        self.assertEqual(a['clockRate'],10)
        self.assertEqual(a['players'][0]['job']['left'],264)
        self.now += 4
        self.send(self.a,'state')
        self.now += 1
        b = self.send(self.b,'state')
        self.assertEqual(b['clockRate'],3)
        self.assertEqual(b['players'][0]['job']['left'],214)
        self.assertNotIn('secret', b['players'][0])
        self.assertNotIn('bag', b['players'][0])
        with self.assertRaisesRegex(RuleError,'未知操作'):
            self.send(self.a,'claimAd',amount=200)

    def test_v5_room_migration_retains_job_without_old_ad_booking(self):
        def convert(room):
            room.pop('schema')
            room.pop('fights')
            room['fight'] = None
            room.update(clockAt=self.now,clockMinute=500)
            room['players'][0].update(job={'id':'old','kind':'travel','zone':'forest',
                 'startMinute':480,'endMinute':525},ad={'old':True})
        self.edit_room(convert)
        a = self.send(self.a,'state')
        self.assertEqual(a['players'][0]['job']['left'],25)
        self.now += 9
        self.assertEqual(self.send(self.a,'state')['players'][0]['zone'],'forest')

    def test_invitation_location_recipient_expiry_and_id(self):
        with self.assertRaisesRegex(RuleError,'树林或山洞'):
            self.send(self.a,'invite')
        self.meet()
        offer = self.send(self.a,'invite')['invite']['id']
        with self.assertRaisesRegex(RuleError,'另一位'):
            self.send(self.a,'accept',invite=offer)
        self.assertIsNone(self.send(self.b,'decline',invite=offer)['invite'])
        replacement = self.send(self.a,'invite')['invite']['id']
        with self.assertRaisesRegex(RuleError,'结束'):
            self.send(self.b,'accept',invite=offer)
        self.send(self.b,'leave')
        with self.assertRaisesRegex(RuleError,'结束'):
            self.send(self.b,'accept',invite=replacement)

    def test_independent_attacks_and_enemy_clock(self):
        self.meet()
        offer = self.send(self.a,'invite')['invite']['id']
        fight = self.send(self.b,'accept',invite=offer)['fight']
        self.assertEqual(fight['team'],[0,1])
        fid = fight['id']
        nonce = str(uuid.uuid4())
        with ThreadPoolExecutor(max_workers=2) as threads:
            a = threads.submit(self.send,self.a,'attack',fight=fid,target=0,nonce=nonce)
            b = threads.submit(self.send,self.b,'attack',fight=fid,target=1)
            a.result()
            b.result()
        a = self.send(self.a,'attack',fight=fid,target=0,nonce=nonce)
        self.assertEqual([p['target'] for p in a['players']],[0,1])
        self.assertEqual([f['hp'] for f in a['fight']['foes']],[23,34])
        with self.assertRaisesRegex(RuleError,'恢复'):
            self.send(self.a,'attack',fight=fid,target=0)
        self.now += 2.8
        self.assertEqual([p['hp'] for p in self.send(self.a,'state')['players']],[56,60])
        self.send(self.b,'leave')
        self.now += 1.1
        self.assertEqual([p['hp'] for p in self.send(self.a,'state')['players']],[52,60])

    def test_separate_fights_and_no_enemy_offline_backlog(self):
        self.send(self.a,'travel',zone='forest')
        self.send(self.b,'travel',zone='cave')
        self.now += 9
        a = self.send(self.a,'solo')
        b = self.send(self.b,'solo')
        self.assertNotEqual(a['fight']['id'],b['fight']['id'])
        self.assertEqual(len(b['fight']['foes']),1)
        self.assertTrue(b['players'][0]['inCombat'])
        self.send(self.a,'leave')
        self.now += 600
        a = self.send(self.a,'state')
        self.assertEqual(a['players'][0]['hp'],60)
        self.assertGreater(a['fight']['foes'][0]['ready'],self.now)
        with self.assertRaisesRegex(RuleError,'未参加'):
            self.send(self.a,'attack',fight=b['fight']['id'],target=0)

    def test_shared_chest_atomic_and_room_token_private(self):
        self.send(self.a,'store',item='wood')
        def take(session):
            try:
                self.send(session,'take',item='wood')
                return 1
            except RuleError:
                return 0
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sum(pool.map(take,(self.a,self.b))),1)
        with self.assertRaisesRegex(RuleError,'满了'):
            self.rooms.request({'action':'join', 'room':self.a['room']})
        with self.assertRaisesRegex(RuleError,'凭据'):
            self.send(self.a | {'secret':'a'*32},'state')

    def test_create_and_join_network_retries_reclaim_the_same_seat(self):
        create = {'action':'create','nonce':str(uuid.uuid4())}
        a = self.rooms.request(create)
        join = {'action':'join','room':a['room'],'nonce':str(uuid.uuid4())}
        b = self.rooms.request(join)
        self.rooms = Rooms(self.db,lambda:self.now)
        self.assertEqual(self.credentials(self.rooms.request(create)),self.credentials(a))
        self.assertEqual(self.credentials(self.rooms.request(join)),self.credentials(b))
        with self.assertRaisesRegex(RuleError,'凭据'):
            self.rooms.request(join | {'room':self.a['room']})


if __name__ == '__main__':
    unittest.main()
