/* 弹窗冻结时间验证 */
const fs = require('fs');
const path = require('path');
const ROOT = 'E:\\灵灰工作区\\孤屿遗章-游戏';
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = require('../../回归测试/helpers/runtime.js').engineSource(path.join(ROOT, 'js', 'game.js'));
const UI = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const box = {};
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console', 'box',
  DATA + '\n' + GAME + '\nObject.assign(box,{Game:Game,ITEMS:ITEMS,RECIPES:RECIPES,ENEMIES:ENEMIES});\n')(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console, box);
const { Game, ITEMS, RECIPES } = box;

let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };
const sec = t => console.log('\n===== ' + t + ' =====');
Game.bind({ onLog: () => {}, onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: () => {} });
function fresh() { Game.newGame('fisher', 'normal'); const s = Game.S(); s.tut = null; s.stats.stamina = 99999; return s; }

sec('A. 引擎层闸门');
{
  const s = fresh();
  const t0 = s.minute, tick0 = s.tick || 0;
  Game.setTimeFreeze(true);
  const r = Game.addMin(60);
  ck('冻结时 addMin 返回 false（没推进）', r === false, '返回 ' + r);
  ck('★ 分钟数没变', Game.S().minute === t0, t0 + ' → ' + Game.S().minute);
  ck('★ 连 tick 都没加（否则晾晒/保鲜计时会被偷偷推进）', (Game.S().tick || 0) === tick0, tick0 + ' → ' + (Game.S().tick || 0));
  Game.setTimeFreeze(false);
  const r2 = Game.addMin(60);
  ck('解冻后能正常推进', r2 !== false && Game.S().minute === t0 + 60, '分钟 ' + t0 + ' → ' + Game.S().minute);
}

sec('B. 冻结期间跨天/小时效果都不会触发');
{
  const s = fresh();
  s.minute = 23 * 60 + 30;     // 23:30，正常再过 60 分钟会跨天
  const day0 = s.day, hunger0 = s.stats.hunger;
  Game.setTimeFreeze(true);
  Game.addMin(120);
  ck('★ 不会跨天', Game.S().day === day0, '第 ' + day0 + ' → 第 ' + Game.S().day + ' 天');
  ck('★ 不会扣饱食度（HOUR_EFFECTS 没跑）', Game.S().stats.hunger === hunger0, hunger0 + ' → ' + Game.S().stats.hunger);
  Game.setTimeFreeze(false);
}

sec('C. UI：哪些面板冻结、哪些不冻结');
{
  const m = UI.match(/const TIME_FREEZE_PANELS = \[([\s\S]*?)\];/);
  const list = m ? m[1].match(/'([a-zA-Z0-9]+)'/g).map(x => x.replace(/'/g, '')) : [];
  console.log('    冻结面板: ' + list.join(', '));
  const must = ['inv', 'equip', 'skill', 'collection', 'diary', 'mailbox', 'settings', 'codex'];
  const notMust = ['camp', 'craft', 'laochao', 'town', 'black', 'farm', 'sleeppick', 'grind', 'repair', 'naming'];
  ck('管理类面板都在冻结名单里', must.every(x => list.includes(x)), must.filter(x => !list.includes(x)).join(',') || '全部包含');
  ck('★ 会花时间的面板【不在】冻结名单里（否则功能被关掉）',
     notMust.every(x => !list.includes(x)), notMust.filter(x => list.includes(x)).join(',') || '都没包含');
  ck('open 时调用 setTimeFreeze（并重绘顶栏让 ⏸ 立刻出现）',
     /Game\.setTimeFreeze\(TIME_FREEZE_PANELS\.indexOf\(kind\) >= 0\)/.test(UI) &&
     /wasFrozen !== Game\.timeFrozen\(\) && document\.getElementById\('top-time'\)\) render\(\)/.test(UI));
  ck('closeModal 里恢复时间', /function closeModal\(\)[\s\S]{0,200}Game\.setTimeFreeze\(false\)/.test(UI));
  ck('顶栏时间有冻结标记（⏸）', /Game\.timeFrozen && Game\.timeFrozen\(\) \? '⏸ ' : ''/.test(UI));
}

sec('D. 冻结时操作会被挡住（不会出现"点了没反应"）');
{
  const s = fresh();
  s.furniture.wb2 = 1;
  Game.addItem('wood', 50, true); Game.addItem('flint', 50, true);
  Game.setTimeFreeze(true);
  const rec = RECIPES.find(r => r.id === 'r_axestone');
  const w0 = Game.invCount('wood');
  const t0 = Game.S().minute;
  Game.craft(rec);
  ck('冻结时制作不会推进时间', Game.S().minute === t0, '+' + (Game.S().minute - t0) + ' 分');
  Game.setTimeFreeze(false);
  // 解冻后照常
  const t1 = Game.S().minute;
  Game.craft(rec);
  ck('解冻后制作照常推进时间', Game.S().minute > t1, '+' + (Game.S().minute - t1) + ' 分');
}

console.log('\n================ 汇总 ================');
console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
if (bad.length) { console.log('失败项：'); bad.forEach(b => console.log(' - ' + b)); }
console.log(bad.length ? 'RESULT:FAIL' : 'RESULT:PASS');
