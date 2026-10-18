"""Single-use codes. Public HTTP runs behind nginx; issuance is an SSH-only CLI."""
import argparse
import csv
import hashlib
import json
import os
import pathlib
import re
import secrets
import sqlite3
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

CODE = re.compile(r"GY-[A-F0-9]{32}")
OWNER = re.compile(r"[a-f0-9]{64}")


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


class ClosingConnection(sqlite3.Connection):
    def __exit__(self, *args):
        try:
            return super().__exit__(*args)
        finally:
            self.close()


def connect(path):
    db = sqlite3.connect(path, timeout=10, factory=ClosingConnection)
    db.execute("PRAGMA busy_timeout=10000")
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA synchronous=FULL")
    db.execute("CREATE TABLE IF NOT EXISTS codes (hash TEXT PRIMARY KEY, gift TEXT NOT NULL, expires INTEGER NOT NULL, owner TEXT, receipt TEXT UNIQUE, claimed INTEGER)")
    return db


def redeem(path, code, owner, now=None):
    now = int(time.time() if now is None else now)
    if not isinstance(code, str) or not isinstance(owner, str):
        return 400, {"ok": False, "reason": "兑换请求格式不正确"}
    code = code.strip().upper()
    if not CODE.fullmatch(code) or not OWNER.fullmatch(owner):
        return 400, {"ok": False, "reason": "兑换码格式不正确"}
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT gift,expires,owner,receipt FROM codes WHERE hash=?", (digest(code),)).fetchone()
        if not row:
            return 404, {"ok": False, "reason": "兑换码无效"}
        gift, expires, prior, receipt = row
        if prior and not secrets.compare_digest(prior, digest(owner)):
            return 409, {"ok": False, "reason": "这个兑换码已经被使用"}
        if not prior:
            if expires and now >= expires:
                return 410, {"ok": False, "reason": "兑换码已过期"}
            receipt = "remote:" + secrets.token_hex(16)
            db.execute("UPDATE codes SET owner=?,receipt=?,claimed=? WHERE hash=? AND owner IS NULL", (digest(owner), receipt, now, digest(code)))
        # Same owner can retry after a lost HTTP reply or failed local save, using the same receipt.
        return 200, {"ok": True, "receipt": receipt, "gift": json.loads(gift)}


def issue(path, count, soul, coins, expires, output):
    if not 1 <= count <= 10000 or not 0 <= soul <= 1000000 or not 0 <= coins <= 100000 or soul + coins == 0:
        raise ValueError("数量或奖励超出范围")
    rows = []
    # Exclusive file creation prevents replacing an earlier distribution list.
    fd = os.open(output, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    try:
        with os.fdopen(fd, "w", encoding="utf-8-sig", newline="") as f, connect(path) as db:
            db.execute("BEGIN IMMEDIATE")
            for _ in range(count):
                code = "GY-" + secrets.token_hex(16).upper()
                db.execute("INSERT INTO codes(hash,gift,expires) VALUES(?,?,?)", (digest(code), json.dumps({"soul": soul, "adCoins": coins}), expires))
                rows.append([code, soul, coins, expires])
            writer = csv.writer(f)
            writer.writerow(["code", "soul", "adCoins", "expiresUnix"])
            writer.writerows(rows)
            f.flush()
            os.fsync(f.fileno())
    except Exception:
        os.unlink(output)
        raise
    return count


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # No codes, owner credentials or request bodies in logs.

    def reply(self, status, body):
        raw = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        self.reply(200, {"ok": True})

    def do_GET(self):
        self.reply(200 if self.path == "/health" else 404, {"ok": self.path == "/health"})

    def do_POST(self):
        if self.path != "/v1/redeem":
            self.reply(404, {"ok": False, "reason": "接口不存在"})
            return
        try:
            n = int(self.headers.get("Content-Length", "0"))
            if not 0 < n <= 2048:
                self.reply(413, {"ok": False, "reason": "请求过大或为空"})
                return
            data = json.loads(self.rfile.read(n))
            if not isinstance(data, dict):
                raise ValueError()
            status, result = redeem(self.server.db_path, data.get("code"), data.get("owner"))
            self.reply(status, result)
        except (ValueError, UnicodeError):
            self.reply(400, {"ok": False, "reason": "请求格式不正确"})
        except Exception:
            self.reply(503, {"ok": False, "reason": "兑换服务暂时繁忙，请稍后重试"})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default="/var/lib/guyu-redeem/codes.sqlite3")
    commands = parser.add_subparsers(dest="action", required=True)
    serve = commands.add_parser("serve")
    serve.add_argument("--port", type=int, default=18081)
    add = commands.add_parser("issue")
    add.add_argument("--count", type=int, required=True)
    add.add_argument("--soul", type=int, default=300)
    add.add_argument("--coins", type=int, default=30)
    add.add_argument("--expires", type=int, default=0)
    add.add_argument("--output", required=True)
    backup = commands.add_parser("backup")
    backup.add_argument("--output", required=True)
    args = parser.parse_args()
    if args.action == "issue":
        print("Generated", issue(args.db, args.count, args.soul, args.coins, args.expires, args.output), "codes; secrets written only to the output file.")
    elif args.action == "backup":
        destination = pathlib.Path(args.output)
        temp = destination.with_suffix('.tmp')
        with connect(args.db) as source, sqlite3.connect(temp, factory=ClosingConnection) as target:
            source.backup(target)
        os.chmod(temp, 0o600)
        os.replace(temp, destination)
        print('Database backup complete')
    else:
        connect(args.db).close()
        server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
        server.db_path = args.db
        server.serve_forever()
