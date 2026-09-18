/* "做装备点上，做完取消，木板精不精加工都没耐久" —— 实测成品耐久到底对不对
   用法：node _debug_craft_dur.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');

const PROBE = `
const G = Game;
const P = (k, v) => console.log('  ' + k + ' → ' + v);
function setup(node) {
  G.newGame('fisher', 'normal');
  const s = G.S(); s.tut = null; s.capacity = 99; s.exp.craft = 9999;
  s.skill.craft = 4; s.skillPicks.craft = ['speed','speed','speed','speed'];
  if (node) G.skillNodeLearn('craft', node);
  G.addItem('wood', 50, true); G.addItem('stone', 50, true); G.addItem('branch', 50, true); G.addItem('flint', 50, true);
  return s;
}
const cases = [['无加成', null], ['精工细作(+30%耐久)', 'c_finework'], ['流水线(-20%耐久)', 'c_line']];
for (const [name, node] of cases) {
  const s = setup(node);
  const r = RECIPES.find(x => x.out && x.out.axeStone);       // 石斧
  P(name + '｜配方', r ? r.id : '没找到石斧配方');
  if (r) {
    const rnd = Math.random; Math.random = () => 0.99;         // 不触发巧手/精算
    G.craft(r);
    Math.random = rnd;
    P('  做出来的石斧耐久 durOf', G.durOf('axeStone') + '（DURA 定义 ' + DURA.axeStone + '）');
    P('  背包里的实例数组 toolDurs', JSON.stringify(s.toolDurs.axeStone));
    P('  日志尾条', ((s.log[0] || {}).text || '').slice(0, 60));
  }
}
// 护具也看一眼（皮甲）
{
  const s = setup('c_finework');
  const r = RECIPES.find(x => x.out && x.out.leatherArmor);
  if (r) {
    G.addItem('leather', 20, true); G.addItem('vine', 20, true);
    const rnd = Math.random; Math.random = () => 0.99; G.craft(r); Math.random = rnd;
    P('皮甲（精工细作）耐久', G.durOf('leatherArmor') + '（DURA ' + DURA.leatherArmor + '）');
  } else P('没有皮甲配方', '');
}
// 批量制作（长按）是不是也吃耐久加成
{
  const s = setup('c_finework');
  const r = RECIPES.find(x => x.out && x.out.axeStone);
  G.addItem('wood', 30, true); G.addItem('flint', 30, true);
  P('批量前 木材/石头', G.invCount('wood') + ' / ' + G.invCount('stone'));
  P('精工细作 cxDurMul 是否生效（节点等级）', s.tree.craft && s.tree.craft.c_finework);
  const rnd = Math.random; Math.random = () => 0.99;
  const res = G.craftBatch(r, 3);
  Math.random = rnd;
  P('craftBatch(石斧,3) 返回', JSON.stringify(res));
  P('做完后 石斧实例耐久', JSON.stringify(s.toolDurs.axeStone));
  P('做完后 木材/石头', G.invCount('wood') + ' / ' + G.invCount('stone'));
  P('日志尾条', ((s.log[0] || {}).text || '').slice(0, 70));
}
`;
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console',
  DATA + '\n' + GAME + '\n' + PROBE)(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console);
