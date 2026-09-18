/* 实测晾肉架新机制：挂 30 分 → 晾 20 小时 → 期间不能晾别的 → 到期可收取 */
const fs = require('fs');
const path = require('path');
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const box = {};
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console', 'box',
  DATA + '\n' + GAME + '\nObject.assign(box,{Game:Game,ITEMS:ITEMS,RECIPES:RECIPES});\n')(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console, box);
const { Game, ITEMS, RECIPES } = box;

let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };
const sec = t => console.log('\n===== ' + t + ' =====');
const LOGS = [];
Game.bind({ onLog: (t) => LOGS.push(t), onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: () => {} });

function setup() {
  Game.newGame('fisher', 'normal');
  const S = Game.S();
  S.inv = {}; S.tut = null; S.stats.hp = 99999; S.stats.stamina = 99999;
  S.buildings.watch = 3; S.furniture.rack = 1;
  Game.addItem('meat', 10, true);
  S.scene = 'camp';
  return S;
}
const RACK = RECIPES.find(r => r.id === 'r_rackmeat');

sec('A. 配方数据');
ck('晾肉干 = 挂 30 分 + 晾 1200 分（20 小时）', RACK.time === 30 && RACK.hang === 1200, `time=${RACK.time} hang=${RACK.hang}`);
// 作者 2026-09-18：一批太慢 → 改成"一次晾两个"，出肉率不变（1 份肉 3 条肉干）
ck('一次晾两个：材料 肉×2、一批出 肉干×4', JSON.stringify(RACK.in) === '{"meat":2}' && JSON.stringify(RACK.out) === '{"jerky":4}',
   'in=' + JSON.stringify(RACK.in) + ' out=' + JSON.stringify(RACK.out));

sec('B. 挂上去：只花 30 分钟，不当场给成品');
{
  const S = setup();
  const t0 = S.minute, day0 = S.day, meat0 = Game.invCount('meat');
  LOGS.length = 0;
  Game.craft(RACK);
  const d = Game.dryOf('rack');
  ck('★ 只推进 30 分钟（不是 480）', Game.S().minute - t0 === 30 && Game.S().day === day0, `+${Game.S().minute - t0} 分`);
  ck('★ 没有当场拿到肉干', !Game.invCount('jerky'), 'jerky=' + Game.invCount('jerky'));
  ck('扣掉了 2 份肉', Game.invCount('meat') === meat0 - 2, `${meat0} → ${Game.invCount('meat')}`);
  ck('架子上记着"晾晒中"', !!d, d ? '还要 ' + Game.fmtLeft(Game.dryLeftMin('rack')) : '无');
  ck('剩余时间是 20 小时', Game.dryLeftMin('rack') === 1200, Game.fmtLeft(Game.dryLeftMin('rack')));
  console.log('    日志: ' + JSON.stringify(LOGS));
}

sec('C. 晾晒期间不能晾别的（作者明确要求）');
{
  const S = setup();
  Game.craft(RACK);
  const chk = Game.canCraft(RACK);
  ck('★ 晾晒中，再想晾 = 被拦下', !chk.ok, chk.reason);
  ck('拦下来的提示说清了还要多久', /还要/.test(chk.reason), chk.reason);
  const meat0 = Game.invCount('meat');
  LOGS.length = 0;
  Game.craft(RACK);          // 强行再挂
  ck('★ 强行重复挂：不扣材料、不改计时', Game.invCount('meat') === meat0 && Game.dryLeftMin('rack') === 1200,
     '肉=' + Game.invCount('meat') + ' 剩余=' + Game.dryLeftMin('rack'));
}

sec('D. 没到时间不能取');
{
  const S = setup();
  Game.craft(RACK);
  const r = Game.dryCollect('rack');
  ck('★ 没到期就取 = 被拦下', !r.ok, r.reason);
  ck('没拿到肉干', !Game.invCount('jerky'));
  ck('架子还占着', !!Game.dryOf('rack'));
}

sec('E. 晾满 20 小时：可以取，一批产出肉干×4');
{
  const S = setup();
  Game.craft(RACK);
  Game.addMin(1200);          // 过 20 小时
  ck('剩余归零', Game.dryLeftMin('rack') === 0, Game.fmtLeft(Game.dryLeftMin('rack')));
  const r = Game.dryCollect('rack');
  ck('★ 到期能取下来', r.ok, JSON.stringify(r));
  ck('★ 拿到肉干×4（一批的量）', Game.invCount('jerky') === 4, 'jerky=' + Game.invCount('jerky'));
  ck('架子空了，可以再晾', !Game.dryOf('rack') && Game.canCraft(RACK).ok);
}

sec('F. 睡一觉就能取（20 小时 ≈ 一夜多，实际体验）');
{
  const S = setup();
  S.minute = 20 * 60;         // 晚上 8 点挂上
  Game.craft(RACK);
  ck('晚上 20:00 挂上 → 要晾到次日 16:00', Game.dryLeftMin('rack') === 1200, Game.fmtLeft(Game.dryLeftMin('rack')));
  Game.addMin(480);
  const after = Game.dryLeftMin('rack');
  ck('过 8 小时后还剩一些', after > 0 && after < 1200, '还剩 ' + Game.fmtLeft(after));
  Game.addMin(720);
  ck('再过 12 小时就晾透了', Game.dryLeftMin('rack') === 0 && Game.dryCollect('rack').ok, '取到 jerky=' + Game.invCount('jerky'));
}

sec('G. 存档往返（晾晒进度不能丢）');
{
  const S = setup();
  Game.craft(RACK);
  Game.addMin(300);
  const leftBefore = Game.dryLeftMin('rack');
  Game.save(); Game.load();
  ck('读档后剩余时间一致', Game.dryLeftMin('rack') === leftBefore, `${leftBefore} → ${Game.dryLeftMin('rack')}`);
  Game.addMin(900);
  ck('读档后照样能晾透并取到', Game.dryCollect('rack').ok && Game.invCount('jerky') === 4, 'jerky=' + Game.invCount('jerky'));
}

console.log('\n================ 汇总 ================');
console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
if (bad.length) { console.log('失败项：'); bad.forEach(b => console.log(' - ' + b)); }
console.log(bad.length ? 'RESULT:FAIL' : 'RESULT:PASS');
