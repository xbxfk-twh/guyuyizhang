/* 单独验一遍：全新玩家打开邮箱，能不能真的收到最新那条公告（避免被 patchSent 撞车漏发）。
   用法：node _check_announce_mail.js  */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = require('../../回归测试/helpers/runtime.js').engineSource(path.join(ROOT, 'js', 'game.js'));
const probe = `
Game.newGame('fisher', 'normal');
const box = Game.mailboxList();
const notices = box.filter(x => x && x.notice);
console.log('全新玩家打开邮箱，收到公告 ' + notices.length + ' 条：');
for (const x of notices) console.log('  ' + x.notice + '  ' + x.title + '  （' + (x.body || []).length + ' 行）');
const want = PATCH_NOTES.filter(n => n && n.approved).map(n => n.version);
const got = notices.map(x => x.notice);
const missing = want.filter(v => got.indexOf(v) < 0);
console.log(missing.length ? ('漏发：' + missing.join(' , ')) : '全部 approved 公告都投递成功 ✓');
`;
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'console', DATA + '\n' + GAME + '\n' + probe)(fakeLS, {}, {}, fs, ROOT, console);
