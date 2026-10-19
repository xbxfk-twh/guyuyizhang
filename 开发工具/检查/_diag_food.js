/* 食物保鲜机制实测：消耗顺序 / 新旧混合 / 过期处理 / 烤鱼烤肉的耐久 */
const fs = require('fs');
const path = require('path');
const ROOT = 'E:\\灵灰工作区\\孤屿遗章-游戏';
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = require('../../回归测试/helpers/runtime.js').engineSource(path.join(ROOT, 'js', 'game.js'));
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const box = {};
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console', 'box',
  DATA + '\n' + GAME + '\nObject.assign(box,{Game:Game,ITEMS:ITEMS,RECIPES:RECIPES,DURA:DURA});\n')(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console, box);
const { Game, ITEMS, RECIPES, DURA } = box;

const L = [];
Game.bind({ onLog: (t) => L.push(t), onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: () => {} });
const fmt = (min) => min === undefined ? '—' : (min <= 0 ? '已过期' : (min < 60 ? min + ' 分钟' : Math.floor(min / 60) + ' 小时' + (min % 60 ? (min % 60) + ' 分' : '')));
function fresh() { Game.newGame('fisher', 'normal'); const s = Game.S(); s.tut = null; s.stats.stamina = 99999; s.inv = {}; s.foodExp = {}; return s; }
const leftOf = (id) => { const s = Game.S(); if (s.foodExp[id] === undefined) return undefined; return Math.round(s.foodExp[id] - (s.tick || 0)); };

console.log('===== A. 相关食物的保质期与耐久设定 =====');
for (const id of ['berry', 'fish', 'meat', 'roastFish', 'roastMeat', 'jerky', 'smokedFish', 'smokedMeat', 'saltedMeat']) {
  const it = ITEMS[id]; if (!it) continue;
  console.log('  ' + it.name.padEnd(6) + ' id=' + id.padEnd(11) + ' spoil=' + String(it.spoil === undefined ? '—' : it.spoil).padEnd(6) +
    ' DURA=' + String(DURA[id] === undefined ? '—' : DURA[id]).padEnd(5) + ' stack=' + it.stack);
}

console.log('\n===== B. 食物有没有"逐件耐久"？（对比工具）=====');
{
  const s = fresh();
  Game.addItem('berry', 3, true);
  console.log('  浆果×3  foodExp = ' + JSON.stringify(s.foodExp) + '  （一种食物只有一个到期时刻）');
  Game.addItem('axeStone', 3, true);
  console.log('  石斧×3  toolDurs = ' + JSON.stringify(s.toolDurs.axeStone) + '  （工具是逐件记耐久）');
  console.log('  → 食物：' + (Object.keys(s.foodExp).length === 1 ? '★ 每种只有一个到期时刻（没有逐件记录）' : '逐件'));
}

console.log('\n===== C. 新旧混合：会取加权平均 =====');
{
  fresh();
  Game.addItem('berry', 2, true);
  const e0 = leftOf('berry');
  console.log('  ① 摘 2 颗浆果 → 保鲜 ' + fmt(e0));
  Game.S().tick += 40 * 60;                       // 过了 40 小时，这 2 颗快坏了
  console.log('  ② 过了 40 小时 → 手里这 2 颗保鲜 ' + fmt(leftOf('berry')));
  Game.addItem('berry', 2, true);                 // 又摘 2 颗新鲜的
  const e1 = leftOf('berry');
  console.log('  ③ 又摘 2 颗新鲜的（新的本该有 ' + fmt(ITEMS.berry.spoil * 2 * 60) + '）');
  console.log('     → 现在 4 颗合并后显示保鲜 ' + fmt(e1));
  console.log('     → 加权平均验证：(旧' + Math.round(e0 - 40 * 60) + '×2 + 新' + (ITEMS.berry.spoil * 2 * 60) + '×2) / 4 = ' +
    Math.round(((e0 - 40 * 60) * 2 + ITEMS.berry.spoil * 2 * 60 * 2) / 4));
}

console.log('\n===== D. 过期时：整叠一起变腐烂物 =====');
{
  fresh();
  Game.addItem('berry', 2, true);
  Game.S().tick += 40 * 60;
  Game.addItem('berry', 2, true);                 // 混成 4 颗，平均保鲜
  console.log('  混合后 4 颗，显示保鲜 ' + fmt(leftOf('berry')));
  const before = Game.invCount('berry');
  // 过期判定在 addMin 里、用的是推进【之前】的 tick，所以要让时间真正走过到期点
  Game.addMin(leftOf('berry') + 60);
  console.log('  过期后：浆果 ' + before + ' → ' + Game.invCount('berry') + '，腐烂物 ' + Game.invCount('rot'));
  console.log('  日志：' + JSON.stringify(L.filter(x => /变质|腐烂/.test(x))));
  console.log('  → ' + (Game.invCount('berry') === 0 ? '★ 4 颗全部变成腐烂物（包括刚摘的 2 颗新鲜的）' : '只坏了一部分'));
}

console.log('\n===== E. 玩家问的场景：烤鱼快过期，又烤了一批 =====');
{
  fresh();
  const rec = RECIPES.find(r => r.id === 'r_roastfish');
  console.log('  烤鱼配方: ' + (rec ? rec.name + ' ' + JSON.stringify(rec.in) + ' → ' + JSON.stringify(rec.out) : '找不到'));
  Game.addItem('fish', 10, true);
  Game.addItem('wood', 10, true);
  Game.craft(rec);                                 // 烤 1 条
  const e0 = leftOf('roastFish');
  console.log('  ① 烤出 1 条烤鱼 → 保鲜 ' + fmt(e0) + '（设定 ' + ITEMS.roastFish.spoil + ' / 2 = ' + fmt(ITEMS.roastFish.spoil * 2 * 60) + '）');
  Game.S().tick += (ITEMS.roastFish.spoil * 2 * 60) - 20;   // 快过期了（还剩 20 分钟）
  console.log('  ② 放到快过期 → 保鲜 ' + fmt(leftOf('roastFish')));
  Game.craft(rec);                                 // 又烤 1 条新鲜的
  const e1 = leftOf('roastFish');
  console.log('  ③ 又烤 1 条新鲜的（新的本该有 ' + fmt(ITEMS.roastFish.spoil * 2 * 60) + '）');
  console.log('     → 合并后 2 条显示保鲜 ' + fmt(e1));
  console.log('     → ★ 那条快过期的被"续命"了：从 ' + fmt(20) + ' 变成 ' + fmt(e1));
  const before = Game.invCount('roastFish');
  Game.addMin(e1 + 60);
  console.log('  ④ 平均到期时刻一到：烤鱼 ' + before + ' → ' + Game.invCount('roastFish') + '，腐烂物 +' + Game.invCount('rot'));
  console.log('     → ' + (Game.invCount('roastFish') === 0 ? '★ 两条一起坏（那条新鲜的也陪葬了）' : '只坏了一部分'));
}

console.log('\n===== F. 晾肉架的 +50% 保鲜对哪些有用 =====');
{
  fresh();
  const s = Game.S();
  Game.addItem('fish', 1, true);
  const noRack = leftOf('fish');
  fresh();
  Game.S().furniture.rack = 1;
  Game.addItem('fish', 1, true);
  const withRack = leftOf('fish');
  console.log('  生鱼：无晾肉架 ' + fmt(noRack) + ' → 有晾肉架 ' + fmt(withRack) + (withRack > noRack ? '  ✅ 有加成' : '  ★ 没加成'));
  fresh();
  Game.addItem('roastFish', 1, true);
  const r1 = leftOf('roastFish');
  fresh();
  Game.S().furniture.rack = 1;
  Game.addItem('roastFish', 1, true);
  const r2 = leftOf('roastFish');
  console.log('  烤鱼：无晾肉架 ' + fmt(r1) + ' → 有晾肉架 ' + fmt(r2) + (r2 > r1 ? '  ✅ 有加成' : '  ★ 没加成（只有生肉/生鱼吃这个加成）'));
}

console.log('\n===== G. 吃的时候拿的是哪一份？=====');
{
  fresh();
  Game.addItem('berry', 2, true);
  Game.S().tick += 40 * 60;
  Game.addItem('berry', 2, true);
  const e = leftOf('berry');
  console.log('  4 颗混合后保鲜 ' + fmt(e));
  Game.consume('berry');
  console.log('  吃掉 1 颗后还剩 ' + Game.invCount('berry') + ' 颗，保鲜仍是 ' + fmt(leftOf('berry')));
  console.log('  → ' + (leftOf('berry') === e ? '★ 吃完保鲜时间不变（无法区分新旧，吃哪颗都一样）' : '吃完会重算'));
}
