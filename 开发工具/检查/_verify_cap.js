/* 容量系统验证：竹篓 / 满格拦截 / 不吞东西 / 关键道具不受限 / 堆叠占格
   用法：node _verify_cap.js */
const fs = require('fs');
const path = require('path');
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const DATA = fs.readFileSync(ROOT + '/js/data.js', 'utf8');
const GAME = fs.readFileSync(ROOT + '/js/game.js', 'utf8');
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const box = {};
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console', 'box',
  DATA + '\n' + GAME + '\nObject.assign(box,{Game:Game,ITEMS:ITEMS,RECIPES:RECIPES});\n')(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console, box);
const { Game, ITEMS, RECIPES } = box;

let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };
const sec = t => console.log('\n===== ' + t + ' =====');
const L = [];
Game.bind({ onLog: (t) => L.push(t), onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: () => {} });
const fresh = () => { Game.newGame('fisher', 'normal'); const s = Game.S(); s.inv = {}; s.tut = null; s.stats.stamina = 9999; return s; };
// 塞满：用 stack:1 的武器/工具（一件一格），这是唯一能精确填满的方式
function fillBag() {
  const one = Object.keys(ITEMS).filter(id => ITEMS[id].stack === 1 && ['weapon', 'tool', 'armor', 'cloth', 'accessory'].includes(ITEMS[id].cat));
  for (const id of one) { if (Game.capUsed() >= Game.capacity()) break; Game.addItem(id, 1, true); }
  // 还不够就用"可堆叠但空格只算 1"的补：每种 1 个
  const stacky = Object.keys(ITEMS).filter(id => ITEMS[id].stack !== 1 && ITEMS[id].cat !== 'currency' && !ITEMS[id].alwaysFit);
  for (const id of stacky) { if (Game.capUsed() >= Game.capacity()) break; Game.addItem(id, 1, true); }
  return Game.capUsed() >= Game.capacity();
}

sec('A. 开局背包占格');
{
  Game.newGame('fisher', 'normal');
  ck('开局还有空闲格子', Game.capUsed() < Game.capacity(), Game.capUsed() + '/' + Game.capacity() + '（空 ' + (Game.capacity() - Game.capUsed()) + ' 格）');
}

sec('B. 竹篓加容量');
{
  fresh();
  const base = Game.capacity();
  Game.addItem('basket', 1, true);
  ck('★ 竹篓在背包里就 +10 容量', Game.capacity() === base + 10, base + ' → ' + Game.capacity());
  Game.removeItem('basket', 1);
  ck('丢掉竹篓容量退回', Game.capacity() === base, 'cap=' + Game.capacity());
}

sec('C. 满格时 addItem 会拒绝');
{
  fresh();
  ck('能塞满（测试前提）', fillBag(), Game.capUsed() + '/' + Game.capacity());
  ck('★ 满格再加新物品 = 被拒绝', Game.addItem('honey', 1, true) === false);
}

sec('D. 满格时制作：不吞材料、不白花时间');
{
  fresh();
  fillBag();
  // 腾 2 格放材料
  const one = Object.keys(ITEMS).filter(id => ITEMS[id].stack === 1 && ITEMS[id].cat === 'weapon');
  Game.removeItem(one[0], 1); Game.removeItem(one[1], 1);
  Game.addItem('wood', 5, true); Game.addItem('flint', 5, true);
  const rec = RECIPES.find(r => r.id === 'r_axestone');
  const w0 = Game.invCount('wood'), f0 = Game.invCount('flint'), t0 = Game.S().minute;
  L.length = 0;
  Game.craft(rec);
  ck('★ 满格时制作被拦下，材料没被扣',
     Game.invCount('wood') === w0 && Game.invCount('flint') === f0,
     '木材差 ' + (Game.invCount('wood') - w0) + ' 燧石差 ' + (Game.invCount('flint') - f0));
  ck('★ 也没白花时间', Game.S().minute === t0, '+' + (Game.S().minute - t0) + ' 分');
  ck('有明确提示', L.some(x => /塞不下/.test(x)), L.join('|').slice(0, 60));
}

sec('E. 满格时买装备：不吞钱');
{
  // 确定性构造：先放货币（1 格），再放 19 件 stack:1 物品 = 刚好占满默认 20 格
  fresh();
  Game.addItem('beibi', 5000, true);
  // 排除竹篓（它 +10 容量会把"满格"顶掉）；19 件 stack:1 物品 + 1 格货币 = 刚好满 20
  const one = Object.keys(ITEMS).filter(id => ITEMS[id].stack === 1 && ['weapon', 'tool', 'armor', 'cloth', 'accessory'].includes(ITEMS[id].cat))
    .filter(id => id !== 'ironSword' && id !== 'basket').slice(0, 19);
  for (const id of one) Game.addItem(id, 1, true);
  ck('构造出满格状态', Game.capUsed() === Game.capacity(), Game.capUsed() + '/' + Game.capacity() + '（' + one.length + ' 件物品 + 货币）');
  const b0 = Game.invCount('beibi');
  Game.buyFromMerchant('ironSword', 5, [{ id: 'ironSword', base: 200 }], false);
  ck('★ 满格时买装备：钱没被扣、货也没给',
     Game.invCount('beibi') === b0 && Game.invCount('ironSword') === 0,
     '贝壳 ' + b0 + '→' + Game.invCount('beibi') + '  铁剑=' + Game.invCount('ironSword'));
  // 腾出一格后应该就能买
  Game.removeItem(one[0], 1);
  Game.buyFromMerchant('ironSword', 1, [{ id: 'ironSword', base: 200 }], false);
  ck('腾出一格后能正常买', Game.invCount('ironSword') === 1 && Game.invCount('beibi') < b0,
     '铁剑=' + Game.invCount('ironSword') + '  贝壳=' + Game.invCount('beibi'));
}

sec('F. 关键道具不受容量限制（石板/遗物/龙骨）');
{
  fresh();
  fillBag();
  ck('背包已满', Game.capUsed() >= Game.capacity(), Game.capUsed() + '/' + Game.capacity());
  ck('★ 石板能进包', Game.addItem('slate', 1, true) === true, 'slate=' + Game.invCount('slate'));
  ck('★ 遗物能进包', Game.addItem('relic', 1, true) === true, 'relic=' + Game.invCount('relic'));
  ck('★ 龙骨能进包', Game.addItem('dragonbone', 1, true) === true, 'dragonbone=' + Game.invCount('dragonbone'));
}

sec('G. 堆叠按 20 个 1 格（和界面显示一致）');
{
  fresh();
  Game.addItem('wood', 19, true);
  const c0 = Game.capUsed();
  Game.addItem('wood', 5, true);
  ck('★ 19→24 个会多占 1 格', Game.capUsed() === c0 + 1, c0 + ' → ' + Game.capUsed());
  ck('★ capUsed 与"种类数"不是一回事（旧 bug 根因）', Object.keys(Game.S().inv).length === 1 && Game.capUsed() === 2,
     '种类 ' + Object.keys(Game.S().inv).length + ' 种，占 ' + Game.capUsed() + ' 格');
}

console.log('\n================ 汇总 ================');
console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
if (bad.length) { console.log('失败项：'); bad.forEach(b => console.log(' - ' + b)); }
console.log(bad.length ? 'RESULT:FAIL' : 'RESULT:PASS');
