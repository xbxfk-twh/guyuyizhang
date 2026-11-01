"""Local S2S reward ledger. No HTTP server, login endpoint or production deployment.

The future HTTP caller must resolve account_id from a verified session; never
accept a client-supplied account ID. This module does not grant game currency.
"""
import hashlib
import hmac
import re
import secrets
import sqlite3
import time
from contextlib import contextmanager


class RewardLedger:
    def __init__(self, path, security_key, space_id, *, clock=time.time, lifetime=600):
        if len(security_key) < 24 or not str(space_id).isdigit():
            raise ValueError('Missing provider S2S key or placement')
        self.path, self.key, self.space = str(path), security_key, str(space_id)
        self.clock, self.lifetime = clock, lifetime
        with self._transaction() as db:
            db.execute('''CREATE TABLE IF NOT EXISTS requests (
                account TEXT NOT NULL, request_id TEXT NOT NULL,
                nonce TEXT NOT NULL UNIQUE, day TEXT NOT NULL,
                expires REAL NOT NULL, amount INTEGER NOT NULL,
                transaction_id TEXT UNIQUE,
                PRIMARY KEY(account,request_id))''')
            db.execute('CREATE INDEX IF NOT EXISTS account_day ON requests(account,day)')

    @contextmanager
    def _transaction(self):
        db = sqlite3.connect(self.path, timeout=10, isolation_level=None)
        db.row_factory = sqlite3.Row
        try:
            db.execute('BEGIN IMMEDIATE')
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise
        finally:
            db.close()

    def _day(self, now):
        return time.strftime('%Y-%m-%d', time.gmtime(now + 8 * 3600))

    def _account(self, account):
        # The format check is not authentication. See the module contract above.
        if not isinstance(account, str) or not re.fullmatch(r'[a-f0-9]{64}', account):
            raise ValueError('Expected verified opaque account index')

    def _receipt(self, row):
        return {'id': 'native-adn:' + row['transaction_id'], 'amount': row['amount'],
                'day': row['day']}

    def create(self, account_id, request_id):
        self._account(account_id)
        if not isinstance(request_id, str) or not re.fullmatch(r'[a-f0-9]{32}', request_id):
            raise ValueError('Invalid request id')
        now = self.clock()
        with self._transaction() as db:
            # Retain settled IDs to reject replay; only expired unfinished attempts are removed.
            db.execute('DELETE FROM requests WHERE transaction_id IS NULL AND expires<=?', (now,))
            row = db.execute('SELECT * FROM requests WHERE account=? AND request_id=?',
                             (account_id, request_id)).fetchone()
            if row and row['transaction_id']:
                return {'receipt': self._receipt(row)}
            if not row:
                active = db.execute('SELECT 1 FROM requests WHERE account=? AND transaction_id IS NULL',
                                    (account_id,)).fetchone()
                if active:
                    raise ValueError('A viewing request is already active')
                used = db.execute('SELECT count(*) FROM requests WHERE account=? AND day=? AND transaction_id IS NOT NULL',
                                  (account_id, self._day(now))).fetchone()[0]
                if used >= 5:
                    raise ValueError('Daily limit reached')
                if db.execute('SELECT count(*) FROM requests').fetchone()[0] >= 100000:
                    raise ValueError('Ledger quota reached; retain existing receipts')
                db.execute('INSERT INTO requests VALUES(?,?,?,?,?,?,NULL)',
                           (account_id, request_id, secrets.token_hex(32), self._day(now),
                            now + self.lifetime, 3 + secrets.randbelow(4)))
                row = db.execute('SELECT * FROM requests WHERE account=? AND request_id=?',
                                 (account_id, request_id)).fetchone()
            return {'nonce': row['nonce'], 'expiresAt': row['expires'], 'spaceId': self.space}

    def settle(self, *, pid, user_id, trans_id, extra, sign):
        """Validate provider GET parameters; HTTP auth/routing is deliberately not exposed here."""
        self._account(user_id)
        if (str(pid) != self.space or not isinstance(trans_id, str)
                or not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', trans_id)
                or not isinstance(extra, str) or not re.fullmatch(r'[a-f0-9]{64}', extra)
                or not isinstance(sign, str) or not re.fullmatch(r'[a-f0-9]{64}', sign)):
            raise ValueError('Invalid callback parameters')
        expected = hashlib.sha256((trans_id + ':' + self.key).encode()).hexdigest()
        if not hmac.compare_digest(expected, sign):
            raise ValueError('Invalid provider signature')
        now = self.clock()
        with self._transaction() as db:
            row = db.execute('SELECT * FROM requests WHERE nonce=? AND account=?',
                             (extra, user_id)).fetchone()
            if not row:
                raise ValueError('Callback does not match an issued account request')
            if row['transaction_id']:
                if row['transaction_id'] != trans_id:
                    raise ValueError('Viewing request already settled')
                return self._receipt(row)
            if row['expires'] <= now or row['day'] != self._day(now):
                raise ValueError('Viewing request expired')
            used = db.execute('SELECT count(*) FROM requests WHERE account=? AND day=? AND transaction_id IS NOT NULL',
                              (user_id, self._day(now))).fetchone()[0]
            if used >= 5:
                raise ValueError('Daily limit reached')
            try:
                db.execute('UPDATE requests SET transaction_id=? WHERE nonce=?', (trans_id, extra))
            except sqlite3.IntegrityError as error:
                if error.sqlite_errorcode == sqlite3.SQLITE_CONSTRAINT_UNIQUE:
                    raise ValueError('Provider transaction already claimed') from error
                raise
            return self._receipt(db.execute('SELECT * FROM requests WHERE nonce=?', (extra,)).fetchone())

    def receipt(self, account_id, request_id):
        self._account(account_id)
        with self._transaction() as db:
            row = db.execute('SELECT * FROM requests WHERE account=? AND request_id=?',
                             (account_id, request_id)).fetchone()
            return self._receipt(row) if row and row['transaction_id'] else None
