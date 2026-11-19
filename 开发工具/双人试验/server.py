"""《孤屿遗章》双人试验的独立房间服务。仅使用 Python 标准库。"""
import argparse
from contextlib import closing
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import secrets
import sqlite3
import time
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2] / '孤屿遗章-游戏 - 发布'
LAND = {
    'camp': ('营地', 0),
    'forest': ('树林', 45),
    'river': ('河畔', 30),
    'quarry': ('采石场', 60),
    'cave': ('山洞', 90),
}
GATHER = {'forest': 'wood', 'river': 'water', 'quarry': 'stone'}
NAMES = {'wood': '木材', 'water': '淡水', 'stone': '石头', 'bandage': '绷带', 'trophy': '战利品'}
FOES = {'wolf': ('狼', 32), 'boar': ('野猪', 43), 'bats': ('蝙蝠', 28)}
START_MINUTE = 8 * 60
SECONDS_PER_GAME_MINUTE = 1 / 3
PRESENCE = 12


class RuleError(ValueError):
    pass


def need(condition, message):
    if not condition:
        raise RuleError(message)


def player(seat, now):
    return {
        'seat': seat, 'name': ('旅者 A', '旅者 B')[seat],
        'secret': secrets.token_urlsafe(24), 'seen': now, 'zone': 'camp', 'hp': 60,
        'target': None, 'ready': 0, 'job': None,
        'bag': {'wood': 2, 'water': 2, 'stone': 1, 'bandage': 0, 'trophy': 0},
        'recent': [],
    }


def inventory_change(bag, item, quantity):
    bag[item] = bag.get(item, 0) + quantity


def settle(room, now):
    for p in room['players']:
        job = p['job']
        if job and job['due'] <= now:
            if job['kind'] == 'travel':
                p['zone'] = job['zone']
            else:
                inventory_change(p['bag'], job['item'], job['quantity'])
            p['job'] = None
    if room['invite'] and room['invite']['until'] <= now:
        room['invite'] = None
    fight = room['fight']
    if not fight or fight['next'] > now:
        return
    active = [p for p in room['players'] if p['seat'] in fight['team'] and p['hp'] > 0 and now - p['seen'] <= PRESENCE]
    if not active:
        fight['next'] = now + 3
        return
    for index, foe in enumerate(fight['foes']):
        if foe['hp'] <= 0:
            continue
        target = active[(fight['turn'] + index) % len(active)]
        target['hp'] = max(0, target['hp'] - 4)
    fight['turn'] += 1
    fight['next'] = now + 3
    if not any(p['hp'] > 0 for p in room['players'] if p['seat'] in fight['team']):
        finish_fight(room)


def fighting(room, p):
    return room['fight'] is not None and p['seat'] in room['fight']['team']


def can_act(room, p):
    return not p['job'] and not fighting(room, p)


def begin_job(p, now, minutes, kind, **data):
    p['job'] = {'kind': kind, 'started': now,
                'due': now + minutes * SECONDS_PER_GAME_MINUTE, **data}


def add_effect(fight, kind, p, target, now):
    fight['serial'] += 1
    fight['effects'].append({'id': fight['serial'], 'seat': p['seat'], 'target': target,
                             'kind': kind, 'at': now})
    fight['effects'] = fight['effects'][-12:]


def start_fight(room, group, now):
    zone = group[0]['zone']
    foes = ['bats', 'bats'] if zone == 'cave' else ['wolf', 'boar']
    room['fight'] = {
        'id': secrets.token_hex(8), 'zone': zone, 'team': [p['seat'] for p in group], 'next': now + 3,
        'turn': 0, 'serial': 0, 'effects': [],
        'foes': [{'id': i, 'kind': kind, 'name': FOES[kind][0],
                  'hp': FOES[kind][1], 'maxHp': FOES[kind][1]} for i, kind in enumerate(foes)],
    }
    room['invite'] = None
    for p in group:
        p['target'] = None
        p['ready'] = now


def finish_fight(room, victory=False):
    fight = room['fight']
    for p in room['players']:
        if p['seat'] not in fight['team']:
            continue
        p['target'] = None
        if victory:
            inventory_change(p['bag'], 'trophy', 1)
        if not p['hp']:
            p['zone'], p['hp'] = 'camp', 30
    room['lastFight'] = {'victory': victory, 'zone': fight['zone']}
    room['fight'] = None


def command(room, p, data, now):
    action = data.get('action')
    if action in ('travel', 'craft', 'gather', 'rest'):
        need(can_act(room, p), '先完成当前行动。')
        if action == 'travel':
            zone = data.get('zone')
            need(isinstance(zone, str) and zone in LAND and zone != p['zone'], '请选择地图上的另一处地点。')
            if room['invite']:
                room['invite'] = None
            begin_job(p, now, LAND[zone][1] or 30, 'travel', zone=zone)
        elif action == 'craft':
            need(p['zone'] == 'camp', '回营地后再制作。')
            need(p['bag']['wood'] >= 1 and p['bag']['water'] >= 1, '制作绷带需要木材×1、淡水×1。')
            inventory_change(p['bag'], 'wood', -1)
            inventory_change(p['bag'], 'water', -1)
            begin_job(p, now, 30, 'craft', item='bandage', quantity=2)
        elif action == 'gather':
            need(p['zone'] in GATHER, '这里没有可采集的物资。')
            begin_job(p, now, 24, 'gather', item=GATHER[p['zone']], quantity=2)
        else:
            need(p['zone'] == 'camp', '回营地后再休整。')
            p['hp'] = 60
    elif action in ('invite', 'solo'):
        need(room['fight'] is None and room['invite'] is None, '房间已有战斗或邀请。')
        need(can_act(room, p) and p['zone'] in ('forest', 'cave'), '到树林或山洞集合后再开战。')
        if action == 'solo':
            start_fight(room, [p], now)
            return
        partner = next((q for q in room['players'] if q is not p), None)
        need(partner and can_act(room, partner) and partner['zone'] == p['zone'] and now - partner['seen'] <= PRESENCE,
             '队友须在线、与你在同一地点且空闲。')
        room['invite'] = {'by': p['seat'], 'to': partner['seat'], 'zone': p['zone'], 'until': now + 20}
    elif action in ('accept', 'decline', 'cancel'):
        invite = room['invite']
        need(invite is not None, '邀请已结束。')
        need(p['seat'] == invite['to' if action != 'cancel' else 'by'], '这是另一位玩家的邀请。')
        if action != 'accept':
            room['invite'] = None
            return
        caller = room['players'][invite['by']]
        need(all(can_act(room, q) and q['zone'] == invite['zone'] and now - q['seen'] <= PRESENCE
                 for q in (caller, p)), '两人须在线、同地点且空闲。')
        start_fight(room, [caller, p], now)
    elif action in ('target', 'attack', 'heal', 'flee'):
        need(fighting(room, p) and p['hp'] > 0, '你没有参加当前战斗。')
        fight = room['fight']
        if action in ('target', 'attack'):
            target = data.get('target')
            need(type(target) is int and 0 <= target < len(fight['foes']), '请选择有效目标。')
            foe = fight['foes'][target]
            need(foe['hp'] > 0, '这个目标已被击败。')
            if action == 'attack':
                need(now >= p['ready'], '攻击正在恢复。')
                foe['hp'] = max(0, foe['hp'] - 9)
                p['ready'] = now + 1.5
                add_effect(fight, 'hit', p, target, now)
                if not any(enemy['hp'] for enemy in fight['foes']):
                    finish_fight(room, True)
                    return
            p['target'] = target
        elif action == 'heal':
            need(p['bag']['bandage'] and p['hp'] < 60, '需要绷带和可恢复的生命。')
            inventory_change(p['bag'], 'bandage', -1)
            p['hp'] = min(60, p['hp'] + 18)
        else:
            fight['team'].remove(p['seat'])
            p['target'], p['zone'] = None, 'camp'
            if not any(q['hp'] > 0 for q in room['players'] if q['seat'] in fight['team']):
                finish_fight(room)
    elif action in ('store', 'take'):
        need(can_act(room, p) and p['zone'] == 'camp', '空闲时可在营地使用共享箱。')
        item = data.get('item')
        need(isinstance(item, str) and item in NAMES, '没有这个物品。')
        src, dst = (p['bag'], room['chest']) if action == 'store' else (room['chest'], p['bag'])
        need(src.get(item, 0) > 0, '手边没有这件物品。')
        inventory_change(src, item, -1)
        inventory_change(dst, item, 1)
    else:
        raise RuleError('未知操作。')


class Rooms:
    def __init__(self, db, clock=time.time):
        self.db, self.clock = db, clock
        self.transaction(lambda db: db.execute('CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY, state TEXT NOT NULL)'))

    def transaction(self, operation):
        with closing(sqlite3.connect(self.db, timeout=8)) as db, db:
            db.execute('BEGIN IMMEDIATE')
            return operation(db)

    def request(self, data):
        def update(db):
            now = self.clock()
            action = data.get('action')
            code = data.get('room', '')
            if action == 'create':
                while True:
                    code = secrets.token_hex(4).upper()
                    room = {'start': now, 'players': [player(0, now)], 'invite': None,
                            'fight': None, 'lastFight': None, 'chest': {}}
                    row = db.execute('INSERT OR IGNORE INTO rooms VALUES (?, ?)', (code, json.dumps(room)))
                    if row.rowcount:
                        break
                p = room['players'][0]
            else:
                need(isinstance(code, str) and re.fullmatch(r'[A-F0-9]{8}', code), '房间码格式有误。')
                row = db.execute('SELECT state FROM rooms WHERE code = ?', (code,)).fetchone()
                need(row is not None, '找不到房间。')
                room = json.loads(row[0])
                if action == 'join':
                    need(len(room['players']) == 1, '这个双人房间已经满了。')
                    p = player(1, now)
                    room['players'].append(p)
                else:
                    secret = data.get('secret')
                    need(isinstance(secret, str) and re.fullmatch(r'[A-Za-z0-9_-]{32}', secret), '请先进入房间。')
                    p = next((q for q in room['players'] if secrets.compare_digest(q['secret'], secret)), None)
                    need(p is not None, '房间凭据已失效。')
                p['seen'] = now
                settle(room, now)
                if action not in ('join', 'state'):
                    nonce = data.get('nonce')
                    need(isinstance(nonce, str) and re.fullmatch(r'[a-f0-9-]{36}', nonce), '操作凭据有误。')
                    if nonce not in p['recent']:
                        command(room, p, data, now)
                        p['recent'] = (p['recent'] + [nonce])[-48:]
            db.execute('UPDATE rooms SET state = ? WHERE code = ?', (json.dumps(room), code))
            visible = [{k: v for k, v in q.items() if k not in ('secret', 'recent', 'seen') and (q is p or k != 'bag')}
                       | {'online': now - q['seen'] <= PRESENCE} for q in room['players']]
            result = {k: v for k, v in room.items() if k != 'players'} | {
                'room': code, 'seat': p['seat'], 'players': visible, 'now': now,
                'minute': START_MINUTE + int(max(0, now - room['start']) / SECONDS_PER_GAME_MINUTE),
                'places': LAND, 'items': NAMES,
            }
            if action in ('create', 'join'):
                result['secret'] = p['secret']
            return result
        return self.transaction(update)


def make_server(host, port, db):
    if Path(db).resolve().is_relative_to(ROOT):
        raise ValueError('房间存档须放在游戏网页目录之外。')
    rooms = Rooms(db)

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT), **kwargs)

        def do_POST(self):
            if urlsplit(self.path).path != '/api/coop':
                self.send_error(404)
                return
            try:
                need(self.headers.get_content_type() == 'application/json', '需要 JSON 请求。')
                length = int(self.headers.get('Content-Length', 0))
                need(0 < length <= 4096, '请求体长度无效。')
                data = json.loads(self.rfile.read(length))
                need(isinstance(data, dict), '请求格式有误。')
                response, status = rooms.request(data), 200
            except RuleError as exc:
                response, status = {'error': str(exc)}, 400
            except (ValueError, UnicodeError):
                response, status = {'error': '无法读取请求。'}, 400
            payload = json.dumps(response, ensure_ascii=False).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

    return ThreadingHTTPServer((host, port), Handler)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='启动《孤屿遗章》双人试验')
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8088)
    parser.add_argument('--db', default=Path(__file__).with_name('双人试验.sqlite3'))
    args = parser.parse_args()
    with make_server(args.host, args.port, args.db) as http:
        print(f'双人试验 http://{args.host}:{http.server_port}/coop.html')
        http.serve_forever()
