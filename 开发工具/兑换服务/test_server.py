import concurrent.futures
import csv
import importlib.util
import pathlib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("redeem_server", pathlib.Path(__file__).with_name("server.py"))
api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)


class Redemption(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db = str(pathlib.Path(self.temp.name) / "test.sqlite3")
        self.file = str(pathlib.Path(self.temp.name) / "codes.csv")
        api.issue(self.db, 1, 300, 30, 100, self.file)
        with open(self.file, encoding="utf-8-sig") as f:
            self.code = next(csv.DictReader(f))["code"]

    def tearDown(self):
        self.temp.cleanup()

    def test_race_and_retry(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
            results = list(pool.map(lambda i: api.redeem(self.db, self.code, f"{i:064x}", 50), range(12)))
        winners = [i for i, (status, _) in enumerate(results) if status == 200]
        self.assertEqual(len(winners), 1)
        i = winners[0]
        self.assertEqual(api.redeem(self.db, self.code.lower(), f"{i:064x}", 101), results[i])
        self.assertEqual(results[i][1]["gift"], {"soul": 300, "adCoins": 30})

    def test_expiry_and_bad_input_do_not_claim(self):
        self.assertEqual(api.redeem(self.db, self.code, "a" * 64, 100)[0], 410)
        self.assertEqual(api.redeem(self.db, self.code, "bad", 50)[0], 400)
        self.assertEqual(api.redeem(self.db, self.code, "a" * 64, 50)[0], 200)
        self.assertEqual(api.redeem(self.db, self.code, "b" * 64, 50)[0], 409)

    def test_disk_contains_no_plain_code_or_owner(self):
        api.redeem(self.db, self.code, "a" * 64, 50)
        with api.connect(self.db) as db:
            row = db.execute("SELECT hash,owner FROM codes").fetchone()
        self.assertNotEqual(row[0], self.code)
        self.assertNotEqual(row[1], "a" * 64)
        with self.assertRaises(FileExistsError):
            api.issue(self.db, 1, 300, 30, 100, self.file)


if __name__ == "__main__":
    unittest.main()
