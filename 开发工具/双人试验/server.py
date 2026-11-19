"""《孤屿遗章》双人房间服务。"""
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
    'camp': ('营地', 0), 'forest': ('树林', 15), 'river': ('河畔', 10),
    'quarry': ('采石场', 20), 'cave': ('山洞', 35),
}
GATHER = {'forest': 'wood', 'river': 'water', 'quarry': 'stone'}
NAMES = {'wood': '木材', 'water': '淡水', 'stone': '石头', 'bandage': '绷带', 'trophy': '战利品'}
FOES = {'wolf': ('狼', 32, 2.7), 'boar': ('野猪', 43, 3.4), 'bats': ('蝙蝠群', 28, 2.3)}
START_MINUTE = 480
PRESENCE = 12
HEARTBEAT = 4
AD_MIN_WAIT = 25
ATTACK_INTERVAL = 1.5
HEAL_INTERVAL = 4
MAX_BATCH = 20


class RuleError(ValueError):
    pass


def need(condition, message):
    if not condition:
        raise RuleError(message)


def player(seat, now):
    return {
        'seat': seat, 'name': ('旅者 A', '旅者 B')[seat], 'secret': secrets.token_urlsafe(24),
        'seen': now, 'zone': 'camp', 'hp': 60, 'target': None, 'ready': 0, 'healReady': 0,
        'job': None, 'lastFight': None, 'recent': [],
        'bag': {'wood': 2, 'water': 2, 'stone': 1, 'bandage': 0, 'trophy': 0},
    }


def online(p, now):
    return p['seen'] + PRESENCE > now


def travel_minutes(source, target):
    a, b = LAND[source][1], LAND[target][1]
    return max(a, b) if 'camp' in (source, target) else max(10, abs(a - b))


def inventory_change(bag, item, quantity):
    bag[item] = bag.get(item, 0) + quantity


def start_job(p, minutes, kind, **data):
    p['job'] = {'kind': kind, 'minutes': minutes, 'left': minutes, **data}


def complete_job(p):
    job = p['job']
    if job['kind'] == 'travel':
        p['zone'] = job['zone']
    else:
        inventory_change(p['bag'], job['item'], job['quantity'])
    p['job'] = None


def current_rate(present, working):
    if not present:
        return 0
    if not working:
        return 0.2
    return 10 if present == 1 or working == 2 else 3


def migrate_room(room, now):
    if room.get('schema') == 2:
        return
    cursor = room.get('clockAt', max(p['seen'] for p in room['players']))
    old_minute = room.get('clockMinute', START_MINUTE + (cursor - room['start']) * 3)
    for p in room['players']:
        p['healReady'] = 0
        p['lastFight'] = None
        p.pop('ad', None)
        job = p['job']
        if not job:
            continue
        if 'endMinute' in job:
            end = job.pop('endMinute')
            minutes = end - job.pop('startMinute')
            left = end - old_minute
        else:
            minutes = (job['due'] - job['started']) * 3
            left = (job.pop('due') - cursor) * 3
            del job['started']
        job.pop('id', None)
        job.update(minutes=minutes, left=max(0, left))
        if not job['left']:
            complete_job(p)
    fight = room.pop('fight', None)
    room['fights'] = [fight] if fight else []
    if fight:
        for foe in fight['foes']:
            foe['ready'] = fight['next']
        del fight['next']
    room.pop('lastFight', None)
    room['invite'] = None
    room.update(schema=2, clockMinute=old_minute, clockAt=min(now, cursor))


def active_players(room, at):
    return [p for p in room['players'] if online(p, at)]


def advance_clock(room, now):
    at = room['clockAt']
    changed = False
    while at < now:
        present = active_players(room, at)
        if not present:
            break
        working = [p for p in present if p['job']]
        rate = current_rate(len(present), len(working))
        until = min(now, *(p['seen'] + PRESENCE for p in present))
        if working:
            until = min(until, at + min(p['job']['left'] for p in working) / rate)
        passed = (until - at) * rate
        room['clockMinute'] += passed
        for p in working:
            p['job']['left'] -= passed
            if p['job']['left'] <= 1e-5:
                complete_job(p)
                changed = True
        at = until
    room['clockAt'] = max(room['clockAt'], now)
    return changed


def clock_view(room, now):
    present = active_players(room, now)
    left = {p['seat']:p['job']['left'] for p in present if p['job']}
    rate = current_rate(len(present), len(left))
    wall, due = now, {}
    while left:
        minutes = min(left.values())
        wall += minutes / current_rate(len(present), len(left))
        done = [seat for seat, remaining in left.items() if remaining == minutes]
        for seat in done:
            due[seat] = round(wall, 3)
        left = {seat:remaining-minutes for seat, remaining in left.items() if seat not in done}
    edges = [*due.values(), *(p['seen'] + PRESENCE for p in present)]
    return rate, due, min(edges, default=None)


def fight_for(room, p):
    return next((fight for fight in room['fights'] if p['seat'] in fight['team']), None)


def can_act(room, p):
    return not p['job'] and not fight_for(room, p)


def start_fight(room, group, now):
    zone = group[0]['zone']
    kinds = ['bats'] if zone == 'cave' else ['wolf']
    if len(group) == 2:
        kinds.append('bats' if zone == 'cave' else 'boar')
    foes = []
    for i, kind in enumerate(kinds):
        name, hp, interval = FOES[kind]
        foes.append({'id':i, 'kind':kind, 'name':name, 'hp':hp, 'maxHp':hp, 'ready':now + interval + i * 0.4})
    fight = {'id':secrets.token_hex(8), 'zone':zone, 'team':[p['seat'] for p in group],
             'foes':foes, 'turn':0, 'serial':0, 'effects':[]}
    room['fights'].append(fight)
    room['invite'] = None
    for p in group:
        p.update(target=None, ready=now, healReady=now)


def end_fight(room, fight, victory=False):
    for seat in fight['team']:
        p = room['players'][seat]
        p['target'] = None
        p['lastFight'] = {'victory':victory, 'zone':fight['zone'], 'id':fight['id']}
        if p['hp'] and victory:
            inventory_change(p['bag'], 'trophy', 1)
        if not p['hp']:
            p.update(zone='camp', hp=30)
    room['fights'].remove(fight)


def react_enemies(room, now):
    changed = False
    for fight in room['fights'][:]:
        standing = [room['players'][seat] for seat in fight['team'] if room['players'][seat]['hp'] > 0]
        if not standing:
            end_fight(room, fight)
            changed = True
            continue
        active = [p for p in standing if online(p, now)]
        if not active:
            continue
        for foe in fight['foes']:
            if not foe['hp'] or foe['ready'] > now:
                continue
            target = active[fight['turn'] % len(active)]
            fight['turn'] += 1
            target['hp'] = max(0, target['hp'] - 4)
            if not target['hp']:
                target['target'] = None
                active.remove(target)
            foe['ready'] = now + FOES[foe['kind']][2]
            changed = True
            if not active:
                break
        if not any(p['hp'] for p in standing):
            end_fight(room, fight)
    return changed


def refresh_presence(room, p, now):
    fight = fight_for(room, p)
    if fight and not any(online(room['players'][seat], now) and room['players'][seat]['hp'] for seat in fight['team']):
        for foe in fight['foes']:
            foe['ready'] = now + FOES[foe['kind']][2]
    p['seen'] = now


def prune_invite(room, now):
    invite = room['invite']
    if not invite:
        return False
    if invite['until'] > now and all(online(room['players'][seat], now) for seat in (invite['by'], invite['to'])):
        return False
    room['invite'] = None
    return True


def work(room, p, action, data):
    need(can_act(room, p), '先完成当前行动。')
    if room['invite']:
        room['invite'] = None
    if action == 'travel':
        zone = data.get('zone')
        need(isinstance(zone, str) and zone in LAND and zone != p['zone'], '请选择地图上的另一处地点。')
        start_job(p, travel_minutes(p['zone'], zone), 'travel', zone=zone)
    elif action == 'gather':
        need(p['zone'] in GATHER, '这里没有可采集的物资。')
        start_job(p, 24, 'gather', item=GATHER[p['zone']], quantity=2)
    elif action == 'craft':
        count = data.get('count', 1)
        need(p['zone'] == 'camp', '回营地后再制作。')
        need(type(count) is int and 1 <= count <= MAX_BATCH, '请选择 1～20 条绷带。')
        need(min(p['bag']['wood'], p['bag']['water']) >= count, '每条绷带需要木材和淡水各一份。')
        for item in ('wood', 'water'):
            inventory_change(p['bag'], item, -count)
        start_job(p, 15 * count, 'craft', item='bandage', quantity=count)
    else:
        need(p['zone'] == 'camp', '回营地后再休整。')
        p['hp'] = 60


def invite_action(room, p, action, data, now):
    invite = room['invite']
    if action in ('invite', 'solo'):
        need(can_act(room, p) and p['zone'] in ('forest', 'cave'), '到树林或山洞后再开战。')
        if action == 'solo':
            start_fight(room, [p], now)
            return
        need(not invite, '房间已有待处理的邀请。')
        partner = next((q for q in room['players'] if q is not p), None)
        need(partner and can_act(room, partner) and partner['zone'] == p['zone'] and online(partner, now),
             '队友须在线、与你在同一地点且空闲。')
        room['invite'] = {'id':secrets.token_hex(8), 'by':p['seat'], 'to':partner['seat'],
                          'zone':p['zone'], 'until':now + 20}
        return
    need(invite and invite['id'] == data.get('invite'), '邀请已结束。')
    need(p['seat'] == invite['to' if action != 'cancel' else 'by'], '这是另一位玩家的邀请。')
    if action == 'accept':
        caller = room['players'][invite['by']]
        need(all(can_act(room, q) and q['zone'] == invite['zone'] and online(q, now) for q in (caller, p)),
             '两人须在线、同地点且空闲。')
        start_fight(room, [caller, p], now)
    else:
        room['invite'] = None


def combat_action(room, p, action, data, now):
    fight = fight_for(room, p)
    need(fight and fight['id'] == data.get('fight') and p['hp'] > 0, '你未参加这场战斗或已倒下。')
    if action == 'heal':
        need(now >= p['healReady'], '包扎还在冷却。')
        need(p['bag']['bandage'] and p['hp'] < 60, '需要绷带和可恢复的生命。')
        inventory_change(p['bag'], 'bandage', -1)
        p.update(hp=min(60, p['hp'] + 15), healReady=now+HEAL_INTERVAL)
        return
    if action == 'flee':
        fight['team'].remove(p['seat'])
        p.update(target=None, zone='camp')
        if not any(room['players'][seat]['hp'] for seat in fight['team']):
            end_fight(room, fight)
        return
    target = data.get('target')
    need(type(target) is int and 0 <= target < len(fight['foes']), '请选择有效目标。')
    foe = fight['foes'][target]
    need(foe['hp'] > 0, '这个目标已被击败。')
    p['target'] = target
    if action == 'attack':
        need(now >= p['ready'], '攻击正在恢复。')
        p['ready'] = now + ATTACK_INTERVAL
        foe['hp'] = max(0, foe['hp'] - 9)
        if not foe['hp']:
            for seat in fight['team']:
                q = room['players'][seat]
                if q['target'] == target:
                    q['target'] = None
        fight['serial'] += 1
        fight['effects'].append({'id':fight['serial'], 'seat':p['seat'], 'target':target, 'kind':'hit', 'at':now})
        fight['effects'] = fight['effects'][-12:]
        if not any(foe['hp'] for foe in fight['foes']):
            end_fight(room, fight, True)


def command(room, p, action, data, now):
    if action in ('travel', 'gather', 'craft', 'rest'):
        work(room, p, action, data)
    elif action in ('invite', 'solo', 'accept', 'decline', 'cancel'):
        invite_action(room, p, action, data, now)
    elif action in ('attack', 'target', 'heal', 'flee'):
        combat_action(room, p, action, data, now)
    elif action in ('store', 'take'):
        need(can_act(room, p) and p['zone'] == 'camp', '空闲时可在营地使用共享箱。')
        item = data.get('item')
        need(isinstance(item, str) and item in NAMES, '没有这个物品。')
        src, dst = (p['bag'], room['chest']) if action == 'store' else (room['chest'], p['bag'])
        need(src.get(item, 0) > 0, '手边没有这件物品。')
        inventory_change(src, item, -1)
        inventory_change(dst, item, 1)
    elif action == 'leave':
        p['seen'] = now - PRESENCE
        prune_invite(room, now)
    else:
        raise RuleError('未知操作。')


def snapshot(code, room, p, now, action):
    rate, due, next_change = clock_view(room, now)
    players = []
    for q in room['players']:
        visible = {k:q[k] for k in ('seat','name','zone','hp','ready','healReady','target')}
        visible.update(online=online(q, now), inCombat=fight_for(room, q) is not None, job=None)
        if q['job']:
            job = q['job']
            visible['job'] = job | {'due':due.get(q['seat']), 'progress':1-job['left']/job['minutes']}
        if q is p:
            visible['bag'] = p['bag']
        players.append(visible)
    result = {'room':code, 'seat':p['seat'], 'players':players, 'now':now,
              'clockMinute':room['clockMinute'], 'clockRate':rate, 'nextClockChange':next_change,
              'places':LAND, 'items':NAMES, 'chest':room['chest'], 'invite':room['invite'],
              'fight':fight_for(room, p), 'lastFight':p['lastFight'],
              'adWait':AD_MIN_WAIT}
    if action in ('create','join'):
        result['secret'] = p['secret']
    return result


def valid_nonce(nonce):
    return isinstance(nonce, str) and re.fullmatch(r'[a-f0-9-]{36}', nonce)


class Rooms:
    def __init__(self, db, clock=time.time, max_rooms=10000):
        self.db, self.clock, self.max_rooms = db, clock, max_rooms
        with closing(sqlite3.connect(self.db)) as conn, conn:
            conn.execute('PRAGMA journal_mode=WAL')
            conn.execute('CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY, state TEXT NOT NULL)')
            conn.execute('''CREATE TABLE IF NOT EXISTS openings(
                nonce TEXT PRIMARY KEY, action TEXT NOT NULL, room TEXT NOT NULL, seat INTEGER NOT NULL)''')

    def transaction(self, operation):
        with closing(sqlite3.connect(self.db, timeout=4)) as db, db:
            db.execute('BEGIN IMMEDIATE')
            return operation(db)

    def request(self, data):
        def update(db):
            now = self.clock()
            action = data.get('action')
            code = data.get('room')
            nonce = data.get('nonce')
            opening = None
            if action in ('create','join') and nonce is not None:
                need(valid_nonce(nonce), '操作凭据有误。')
                opening = db.execute('SELECT action, room, seat FROM openings WHERE nonce=?',(nonce,)).fetchone()
                if opening:
                    need(opening[0] == action and (action == 'create' or opening[1] == code), '操作凭据有误。')
                    code = opening[1]
            if action == 'create' and not opening:
                need(db.execute('SELECT count(*) FROM rooms').fetchone()[0] < self.max_rooms, '房间暂满，请稍后再试。')
                p = player(0, now)
                room = {'schema':2, 'start':now, 'clockAt':now, 'clockMinute':START_MINUTE,
                        'players':[p], 'invite':None, 'fights':[], 'chest':{}}
                while True:
                    code = secrets.token_hex(4).upper()
                    inserted = db.execute('INSERT OR IGNORE INTO rooms VALUES (?, ?)', (code,json.dumps(room)))
                    if inserted.rowcount:
                        break
                if nonce:
                    db.execute('INSERT INTO openings VALUES (?,?,?,0)',(nonce,action,code))
                return snapshot(code, room, p, now, action)
            need(isinstance(code, str) and re.fullmatch(r'[A-F0-9]{8}', code), '房间码格式有误。')
            row = db.execute('SELECT state FROM rooms WHERE code=?', (code,)).fetchone()
            need(row is not None, '找不到房间。')
            room = json.loads(row[0])
            dirty = room.get('schema') != 2
            migrate_room(room, now)
            now = max(now, room['clockAt'])
            changed = advance_clock(room, now)
            expired = prune_invite(room, now)
            if opening:
                p = room['players'][opening[2]]
                refresh_presence(room, p, now)
                dirty = True
            elif action == 'join':
                need(len(room['players']) == 1, '这个双人房间已经满了。')
                p = player(1, now)
                room['players'].append(p)
                dirty = True
                if nonce:
                    db.execute('INSERT INTO openings VALUES (?,?,?,1)',(nonce,action,code))
            else:
                secret = data.get('secret')
                need(isinstance(secret, str) and re.fullmatch(r'[A-Za-z0-9_-]{32}', secret), '请先进入房间。')
                p = next((q for q in room['players'] if secrets.compare_digest(q['secret'], secret)), None)
                need(p is not None, '房间凭据已失效。')
                if action != 'leave' and (now - p['seen'] >= HEARTBEAT or not online(p, now)):
                    refresh_presence(room, p, now)
                    dirty = True
            fought = react_enemies(room, now)
            if action not in ('create','join','state'):
                need(valid_nonce(nonce), '操作凭据有误。')
                if nonce not in p['recent']:
                    command(room, p, action, data, now)
                    p['recent'] = (p['recent'] + [nonce])[-48:]
                    dirty = True
            if dirty or changed or expired or fought:
                db.execute('UPDATE rooms SET state=? WHERE code=?', (json.dumps(room),code))
            return snapshot(code, room, p, now, action)
        return self.transaction(update)


def make_server(host, port, db, *, api_only=False, max_rooms=10000):
    if Path(db).resolve().is_relative_to(ROOT):
        raise ValueError('房间存档须放在游戏网页目录之外。')
    rooms = Rooms(db,max_rooms=max_rooms)
    api_paths = {'/api/coop','/coop/v1'}

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT), **kwargs)

        def setup(self):
            super().setup()
            self.connection.settimeout(8)

        def log_request(self, code='-', size='-'):
            if str(code).startswith(('4','5')):
                super().log_request(code,size)

        def do_GET(self):
            if api_only:
                self.send_error(404)
            else:
                super().do_GET()

        def do_HEAD(self):
            if api_only:
                self.send_error(404)
            else:
                super().do_HEAD()

        def respond(self, status, result=None):
            raw = json.dumps(result,ensure_ascii=False).encode() if result is not None else b''
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.send_header('Access-Control-Max-Age', '600')
            self.send_header('Content-Length', str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        def do_OPTIONS(self):
            if urlsplit(self.path).path in api_paths:
                self.respond(204)
            else:
                self.send_error(404)

        def do_POST(self):
            if urlsplit(self.path).path not in api_paths:
                self.send_error(404)
                return
            try:
                need(self.headers.get_content_type() == 'application/json', '需要 JSON 请求。')
                length = int(self.headers.get('Content-Length',0))
                need(0 < length <= 4096, '请求体长度无效。')
                data = json.loads(self.rfile.read(length))
                need(isinstance(data,dict), '请求格式有误。')
                result = rooms.request(data)
            except RuleError as exc:
                self.respond(400, {'error':str(exc)})
            except (ValueError, UnicodeError, TimeoutError):
                self.respond(400, {'error':'无法读取请求。'})
            except sqlite3.OperationalError:
                self.respond(503, {'error':'房间暂时繁忙，请稍后再试。'})
            else:
                self.respond(200,result)

    class RoomHTTPServer(ThreadingHTTPServer):
        request_queue_size = 128

    return RoomHTTPServer((host,port), Handler)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='启动《孤屿遗章》双人房间')
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8088)
    parser.add_argument('--db', default=Path(__file__).with_name('双人试验.sqlite3'))
    parser.add_argument('--api-only', action='store_true')
    parser.add_argument('--max-rooms', type=int, default=10000)
    args = parser.parse_args()
    with make_server(args.host, args.port, args.db, api_only=args.api_only, max_rooms=args.max_rooms) as http:
        print(f'双人服务 http://{args.host}:{http.server_port}', flush=True)
        http.serve_forever()
