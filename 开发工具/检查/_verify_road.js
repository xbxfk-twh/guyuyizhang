/* 赶路遇袭验证：危险度门槛 / 概率随危险度递增 / 迎战与退回 / 设置开关 / 存档兼容 */
const fs = require('fs');
const path = require('path');
const ROOT = 'E:\\灵灰工作区\\孤屿遗章-游戏';
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');
const UI = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const box = {};
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console', 'box',
  DATA + '\n' + GAME + '\nObject.assign(box,{Game:Game,ITEMS:ITEMS,SCENES:SCENES,ENEMIES:ENEMIES});\n')(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console, box);
const { Game, ITEMS, SCENES, ENEMIES } = box;

let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };
const sec = t => console.log('\n===== ' + t + ' =====');
const L = [];
let OV = null;
Game.bind({ onLog: (t) => L.push(t), onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: (o) => { OV = o; } });
function fresh() {
  Game.newGame('fisher', 'normal');
  const s = Game.S(); s.tut = null; s.stats.stamina = 99999; s.stats.hp = 99999;
  s.buildings.watch = 3; s.buildings.dock = 3; s.inv = {};
  Game.addItem('furCoat', 1, true); s.equipment.cloth = 'furCoat';   // 山顶要保暖≥4，否则走不过去（和拦路无关）
  return s;
}
const dangerOf = (id) => (SCENES.find(s => s.id === id) || {}).danger;

sec('A. 危险度门槛（只有 ≥3 的区域才拦路）');
{
  const s = fresh();
  const cases = [['quarry',3],['grassland',3],['desert',4],['cave',4],['sea',4],['peak',5],['shore',5]];
  ck('这批区域的危险度确实 ≥3', cases.every(([id, d]) => dangerOf(id) === d), cases.map(([id]) => id + '=' + dangerOf(id)).join(' '));
  const low = ['camp','farm','river','forest','bamboo'];
  ck('低危区域危险度 <3', low.every(id => dangerOf(id) < 3), low.map(id => id + '=' + dangerOf(id)).join(' '));
  ck('代码里门槛写的是 3', /const ROAD_AMBUSH_MIN_DANGER = 3;/.test(GAME));
}

sec('B. 概率随危险度递增（3→15% 4→20% 5→25%，上限 30%）');
{
  ck('概率公式 = min(0.30, 0.05×危险度)', /Math\.min\(0\.30, 0\.05 \* danger\)/.test(GAME));
  // 实测 1000 次各地图的触发率
  const rate = (target, n) => {
    let hit = 0;
    for (let i = 0; i < n; i++) {
      const s = fresh(); s.scene = 'camp'; OV = null;
      Game.travel(target);
      if (OV && /拦住了/.test(OV.title || '')) hit++;
    }
    return hit / n;
  };
  const r3 = rate('quarry', 600), r4 = rate('desert', 600), r5 = rate('peak', 600);
  console.log('    实测触发率：采石场(3) ' + (r3*100).toFixed(1) + '%   荒漠(4) ' + (r4*100).toFixed(1) + '%   山顶(5) ' + (r5*100).toFixed(1) + '%');
  ck('★ 危险度 3 实测约 15%', r3 > 0.09 && r3 < 0.22, (r3*100).toFixed(1) + '%');
  ck('★ 危险度 4 实测约 20%', r4 > 0.13 && r4 < 0.28, (r4*100).toFixed(1) + '%');
  ck('★ 危险度 5 实测约 25%', r5 > 0.18 && r5 < 0.33, (r5*100).toFixed(1) + '%');
  ck('★ 危险度越高越容易被拦（5 > 3）', r5 > r3, '5→' + (r5*100).toFixed(1) + '% > 3→' + (r3*100).toFixed(1) + '%');
  // 低危区域永不触发
  let lowHit = 0;
  for (let i = 0; i < 400; i++) { const s = fresh(); s.scene = 'camp'; OV = null; Game.travel('forest'); if (OV && /拦住了/.test(OV.title || '')) lowHit++; }
  ck('★ 低危区域（树林）永远不拦路', lowHit === 0, '400 次里 ' + lowHit + ' 次');
}

sec('C. 拦的是狼或熊，狼可能来两条（1~2 条）');
{
  const pool = { wolf: 0, cavebear: 0 };
  let twoWolves = 0, total = 0, otherEnemy = 0, wolfPair = 0, bearPair = 0;
  const R = Math.random;
  // ⚠️ 不要固定 Math.random：那样随机池 pool[floor(r*n)] 永远取同一个元素，熊永远选不到。
  //    改用 force 参数强制触发，其余（选哪种怪、狼是否成群）保持真随机。
  for (let i = 0; i < 300; i++) {
    const s = fresh(); s.scene = 'camp'; OV = null;
    Game.rollTravelAmbush('peak', true);
    if (!OV || !/拦住了/.test(OV.title || '')) continue;
    total++;
    const txt = (OV.title || '') + (OV.text || '');
    const isWolf = /狼/.test(txt), isBear = /熊/.test(txt);
    if (isWolf) pool.wolf++; else if (isBear) pool.cavebear++; else otherEnemy++;
    OV.choices[0].ok();                // 迎战 → 开战
    const C = Game.S().combat;
    if (C) {
      const ids = C.enemies.map(e => e.id);
      if (ids.some(x => x !== 'wolf' && x !== 'cavebear')) otherEnemy++;
      if (ids.filter(x => x === 'wolf').length >= 2) twoWolves++;
      if (ids.includes('cavebear')) bearPair++;
      if (ids.length === 2 && ids.includes('cavebear')) otherEnemy++;   // 熊不该成对
    }
  }
  Math.random = R;
  console.log('    300 次拦路里：狼 ' + pool.wolf + ' 次，熊 ' + pool.cavebear + ' 次，两条狼 ' + twoWolves + ' 次');
  ck('★ 拦路的只有狼或熊（没有别的怪）', total > 0 && otherEnemy === 0, '共 ' + total + ' 次拦路，异常 ' + otherEnemy + ' 次');
  ck('★ 狼比熊常见（狼是主力）', pool.wolf > pool.cavebear, '狼 ' + pool.wolf + ' vs 熊 ' + pool.cavebear);
  ck('★ 狼会出现两条（对应"1~2 条狼"）', twoWolves > 0, twoWolves + ' 次出现两条');
  ck('★ 熊会出现在危险度 5 的山顶', pool.cavebear > 0, '熊 ' + pool.cavebear + ' 次');
  ck('★ 熊不会成对出现', bearPair === pool.cavebear || twoWolves === 0, '熊单独 ' + bearPair + '/' + pool.cavebear);
  ck('狼的 pack 特性支撑"50% 两只"', (ENEMIES.wolf.traits || []).includes('pack'));
}

sec('D. 弹窗两个选择：迎战 / 退回');
{
  const R = Math.random;
  // 迎战
  Math.random = () => 0.01;
  let s = fresh(); s.scene = 'camp'; OV = null;
  Game.travel('quarry');
  const labels = (OV.choices || []).map(c => c.label);
  ck('★ 弹出拦路弹窗，给了"迎战/退回"两个选择', /拦住了/.test(OV.title) && labels.length === 2 && /迎战/.test(labels[0]) && /退回/.test(labels[1]), labels.join(' / '));
  Math.random = R;
  OV.choices[0].ok();               // 迎战
  const C = Game.S().combat;
  ck('★ 选"迎战"会进入战斗', !!C && C.enemies.length > 0, C ? C.enemies.map(e => e.name).join(',') : '没进战斗');
  ck('迎战时还没落地（避免先到再退）', Game.S().scene === 'camp', '当前 ' + Game.S().scene);
  ck('留了"打赢后抵达"的回调', typeof Game.S()._onFightWin === 'function');
  // 模拟打赢
  const s2 = Game.S();
  s2.combat.enemies.forEach(e => { e.ehp = 0; });
  Game.fightAction('attack');
  ck('★ 打赢后会自动抵达那格区域', Game.S().scene === 'quarry', '当前 ' + Game.S().scene);
  ck('打赢后回调被清掉（不会重复触发）', !Game.S()._onFightWin && !Game.S()._roadAmbush);

  // 退回
  Math.random = () => 0.01;
  s = fresh(); s.scene = 'camp'; OV = null;
  const stam0 = s.stats.stamina, min0 = s.minute;
  Game.travel('quarry');
  Math.random = R;
  ck('拦路时体力已扣（走都走了）', Game.S().stats.stamina < stam0, stam0 + ' → ' + Game.S().stats.stamina);
  OV.choices[1].ok();               // 退回
  ck('★ 选"退回"会留在原地（没到那片区域）', Game.S().scene === 'camp', '当前 ' + Game.S().scene);
  ck('退回要额外花点时间脱身', Game.S().minute > min0, '+' + (Game.S().minute - min0) + ' 分');
  ck('退回后不残留战斗/标记', !Game.S().combat && !Game.S()._roadAmbush);
  ck('退回后还能再走（不是卡死）', (() => { Math.random = () => 0.99; const r = Game.travel('quarry'); Math.random = R; return Game.S().scene === 'quarry'; })());
}

sec('E. 设置开关（默认开，可关）');
{
  const s = fresh();
  ck('新档默认开着', s.settings && s.settings.roadAmbush === true);
  s.settings.roadAmbush = false;
  const R = Math.random; Math.random = () => 0.01;   // 必定触发
  let hit = 0;
  for (let i = 0; i < 40; i++) { const s2 = fresh(); s2.scene = 'camp'; s2.settings.roadAmbush = false; OV = null; Game.travel('peak'); if (OV && /拦住了/.test(OV.title || '')) hit++; }
  Math.random = R;
  ck('★ 关掉后一路平安（40 次全不触发）', hit === 0, hit + ' 次触发');
  ck('设置面板里有这个开关', /赶路遇袭/.test(UI) && /road:on/.test(UI) && /road:off/.test(UI) && /function roadAmbushOn\(\)/.test(UI));
  ck('开关会写进存档并保存', /st\.settings\.roadAmbush = \(v\.slice\(5\) === 'on'\)/.test(UI));
}

sec('F. 老存档兼容（没有 settings 字段也要能用）');
{
  ck('读档时补上 settings', /if \(!S\.settings\) S\.settings = \{ roadAmbush: true \};/.test(GAME));
  ck('缺 roadAmbush 也补上默认开', /if \(S\.settings\.roadAmbush === undefined\) S\.settings\.roadAmbush = true;/.test(GAME));
  fresh();
  Game.save();
  const raw = JSON.parse(fakeLS.getItem('guyuyizhang_save') || '{}');
  // 手动删掉 settings 模拟老档，再读
  delete raw.settings;
  fakeLS.setItem('guyuyizhang_save', JSON.stringify(raw));
  Game.load();
  ck('★ 老档读进来后自动补上默认开', Game.S().settings && Game.S().settings.roadAmbush === true, JSON.stringify(Game.S().settings));
}

sec('G. 海底不受影响（有自己那套）');
{
  ck('亚特兰蒂斯不参与赶路遇袭', /if \(id === 'atlantis' \|\| S\.scene === 'atlantis'\) return false;/.test(GAME));
  const s = fresh();
  s.atlantis = { unlocked: 1, stoneActive: 1 }; s.scene = 'peak';
  Game.addItem('diveSuit', 1, true); Game.addItem('diveMask', 1, true);
  s.equipment.cloth = 'diveSuit'; s.toolkit = ['diveMask', null, null];
  const R = Math.random; Math.random = () => 0.01;
  OV = null; Game.travel('atlantis');
  Math.random = R;
  ck('去亚特兰蒂斯不会弹拦路', !(OV && /拦住了/.test(OV.title || '')), OV ? OV.title : '(无弹窗)');
}

console.log('\n================ 汇总 ================');
console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
if (bad.length) { console.log('失败项：'); bad.forEach(b => console.log(' - ' + b)); }
console.log(bad.length ? 'RESULT:FAIL' : 'RESULT:PASS');
