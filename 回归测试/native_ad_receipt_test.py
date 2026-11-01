"""Provider contract, replay, ownership, persistence and concurrent settlement tests."""
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
import hashlib
import importlib.util
from pathlib import Path
import secrets
import sqlite3
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('native_rewards', ROOT / '开发工具/广告奖励服务/rewards.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReceiptTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='guyu-ad-receipts-')
        self.path = Path(self.temp.name) / 'test.sqlite3'
        self.key = secrets.token_hex(32)
        self.now = 1793516400
        self.owner = hashlib.sha256(b'test-account').hexdigest()
        self.other = hashlib.sha256(b'other-test-account').hexdigest()
        self.ledger = self.open()

    def tearDown(self):
        self.temp.cleanup()

    def open(self):
        return module.RewardLedger(self.path, self.key, 12345, clock=lambda: self.now)

    def issue(self, account=None):
        account = account or self.owner
        request = secrets.token_hex(16)
        return request, self.ledger.create(account, request)

    def callback(self, pending, transaction=None, account=None):
        transaction = transaction or secrets.token_hex(16)
        return dict(pid='12345', user_id=account or self.owner, trans_id=transaction,
                    extra=pending['nonce'], sign=hashlib.sha256((transaction+':'+self.key).encode()).hexdigest())

    def test_no_client_completion_or_unsigned_reward(self):
        request, pending = self.issue()
        self.assertIsNone(self.ledger.receipt(self.owner, request))
        args = self.callback(pending)
        args['sign'] = '0'*64
        with self.assertRaises(ValueError): self.ledger.settle(**args)
        self.assertIsNone(self.ledger.receipt(self.owner, request))

    def test_amount_duplicate_callback_and_restart(self):
        request, pending = self.issue()
        self.assertEqual(self.ledger.create(self.owner, request), pending)
        args = self.callback(pending)
        receipt = self.ledger.settle(**args)
        self.assertIn(receipt['amount'], range(3,7))
        self.assertEqual(self.ledger.settle(**args), receipt)
        self.assertEqual(self.open().receipt(self.owner, request), receipt)
        self.assertEqual(self.open().create(self.owner, request), {'receipt': receipt})

    def test_wrong_account_and_placement(self):
        request, pending = self.issue()
        for changes in [{'user_id':self.other}, {'pid':'99999'}, {'extra':'a'*64}]:
            args = self.callback(pending); args.update(changes)
            with self.assertRaises(ValueError): self.ledger.settle(**args)
        self.assertIsNone(self.ledger.receipt(self.owner, request))

    def test_expiry_and_new_request(self):
        request, pending = self.issue()
        self.now += 600
        with self.assertRaises(ValueError): self.ledger.settle(**self.callback(pending))
        self.issue()
        self.assertIsNone(self.ledger.receipt(self.owner, request))

    def test_five_successes_survive_restart_and_next_day_resets(self):
        for unused in range(5):
            request, pending = self.issue()
            self.ledger.settle(**self.callback(pending))
        with self.assertRaises(ValueError): self.open().create(self.owner, secrets.token_hex(16))
        self.now += 86400
        self.issue()

    def test_only_one_inflight_request(self):
        self.issue()
        with self.assertRaises(ValueError): self.issue()

    def test_transaction_cannot_move_to_another_request(self):
        request, pending = self.issue()
        args = self.callback(pending); self.ledger.settle(**args)
        other_request, other_pending = self.issue(self.other)
        reused = self.callback(other_pending, args['trans_id'], self.other)
        with self.assertRaises(ValueError): self.ledger.settle(**reused)
        self.assertIsNone(self.ledger.receipt(self.other, other_request))

    def test_one_request_cannot_use_multiple_transactions(self):
        request, pending = self.issue()
        self.ledger.settle(**self.callback(pending))
        with self.assertRaises(ValueError): self.ledger.settle(**self.callback(pending))

    def test_concurrent_duplicate_callbacks_and_retrieval(self):
        request, pending = self.issue()
        args = self.callback(pending)
        with ThreadPoolExecutor(max_workers=8) as pool:
            receipts = list(pool.map(lambda unused:self.open().settle(**args), range(16)))
        self.assertEqual(len({r['id'] for r in receipts}),1)
        self.assertEqual(self.ledger.receipt(self.owner, request),receipts[0])

    def test_no_cross_account_receipt_access(self):
        request, pending = self.issue()
        self.ledger.settle(**self.callback(pending))
        self.assertIsNone(self.ledger.receipt(self.other, request))


    def test_storage_failure_does_not_settle_or_burn_request(self):
        request, pending = self.issue()
        with closing(sqlite3.connect(self.path)) as db, db:
            db.execute("CREATE TRIGGER test_failure BEFORE UPDATE ON requests BEGIN SELECT RAISE(ABORT, 'simulated write failure'); END")
        args = self.callback(pending)
        with self.assertRaises(sqlite3.IntegrityError): self.ledger.settle(**args)
        self.assertIsNone(self.ledger.receipt(self.owner, request))
        with closing(sqlite3.connect(self.path)) as db, db: db.execute('DROP TRIGGER test_failure')
        self.assertIn(self.ledger.settle(**args)['amount'],range(3,7))

    def test_concurrent_distinct_requests_reserve_one_slot(self):
        def issue(unused):
            try: return self.open().create(self.owner,secrets.token_hex(16))
            except ValueError: return None
        with ThreadPoolExecutor(max_workers=8) as pool: results=list(pool.map(issue,range(16)))
        self.assertEqual(sum(r is not None for r in results),1)

    def test_date_rollover_does_not_accept_previous_day_callback(self):
        self.now = (int(self.now)//86400)*86400 + 16*3600 - 1
        request,pending=self.issue();self.now+=2
        with self.assertRaises(ValueError):self.ledger.settle(**self.callback(pending))
        self.assertIsNone(self.ledger.receipt(self.owner,request))

    def test_malformed_requests_fail_before_creating_rewards(self):
        for account,request in [('client-name',secrets.token_hex(16)),(self.owner,'not-a-request')]:
            with self.assertRaises(ValueError):self.ledger.create(account,request)


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(ReceiptTests)
    result = unittest.TextTestRunner(verbosity=1).run(suite)
    print(f'通过 {result.testsRun-len(result.failures)-len(result.errors)} 项，失败 {len(result.failures)+len(result.errors)} 项')
    print('RESULT:PASS' if result.wasSuccessful() else 'RESULT:FAIL')
    raise SystemExit(not result.wasSuccessful())
