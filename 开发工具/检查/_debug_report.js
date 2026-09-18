/* 玩家反馈四条一次性验证（Node 直跑真实 game.js）
   ① 制造界面显示的材料 vs 实际扣的材料  ② 【精算】退款到底有没有加回来
   ③ 装神弓后"攻击"用的是副手还是弓箭、逃跑能不能用  ④ 采集扣的是不是"正在用的那把"的耐久
   用法：node _debug_report.js */
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
const fresh = () => { G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null; s.capacity = 200; s._testNoAmbush = true; s.settings.roadAmbush = false; return s; };

console.log('【① / ②】制造材料：显示值 vs 实际扣的值，以及【精算】退款');
{
  const s = fresh();
  const r = RECIPES.find(x => x.id === 'r_charcoal');        // 烧木炭：木材×2
  s.skill.craft = 4; s.skillPicks.craft = ['speed','speed','refund','extra'];
  P('没学材料类节点时 craftIn', JSON.stringify(G.craftIn(r)));
  G.skillNodeLearn('craft', 'c_finework');                    // 精工细作：材料 +30%
  P('学了精工细作后 craftIn（真实扣的）', JSON.stringify(G.craftIn(r)));
  P('配方本身写的 r.in（界面以前显示这个）', JSON.stringify(r.in));
  const before = G.invCount('wood');
  const rnd = Math.random; Math.random = () => 0.999;          // 不触发精算退款
  G.craft(r);
  Math.random = rnd;
  P('做一次烧木炭：木材', before + ' → ' + G.invCount('wood') + '（差 ' + (before - G.invCount('wood')) + '）');
  // 精算退款：强制触发
  G.S().tree.craft = {}; G.skillNodeLearn('craft', 'c_finework');   // 先只留精工细作? 这里重置节点
  const s2 = G.S(); s2.tree.craft = {};                            // 清节点
  s2.skillPicks.craft = ['refund','refund','refund','refund','refund','refund','refund'];
  P('精算概率', G.craftIn ? '（内部）' : '');
  const b2 = G.invCount('wood');
  const rnd2 = Math.random; Math.random = () => 0.0;            // 必中退款
  G.craft(RECIPES.find(x => x.id === 'r_charcoal'));
  Math.random = rnd2;
  P('满精算做一次：木材 ' + b2 + ' → ' + G.invCount('wood') + '（成本 2、退款 1，应该只 -1）');
}

console.log('【③】神弓（主手）+ 近战（副手）：攻击打的是谁？逃跑能不能用？');
{
  const s = fresh();
  G.addItem('divineBow', 1, true); G.addItem('ironSword', 1, true); G.addItem('arrow', 20, true);
  G.equip('divineBow'); G.equip('ironSword', 0, 'weapon2');
  P('主手/副手', s.equipment.weapon + ' / ' + s.equipment.weapon2);
  G.startFight({ id:'dummy', name:'木桩', hp:999999, atk:0, def:0, spd:1, traits:[], drops:[] }, true);
  const rnd = Math.random; Math.random = () => 0.1;              // 必命中
  const bhp = G.S().combat.enemies[0].ehp;
  G.fightAction('attack');
  const log1 = (G.S().combat ? G.S().combat.log : []).slice(-1)[0] || '';
  P('点"攻击"后的战斗日志', log1.slice(0, 90));
  P('伤害', Math.round(bhp - (G.S().combat ? G.S().combat.enemies[0].ehp : bhp)));
  P('弓的耐久 / 剑的耐久', G.durOf('divineBow') + ' / ' + G.durOf('ironSword'));
  const bar0 = (G.S().combat ? G.S().combat.enemies[0].ehp : 0);
  G.fightAction('ranged');
  P('点"射击"后的日志', ((G.S().combat ? G.S().combat.log : []).slice(-1)[0] || '').slice(0, 90));
  P('射击伤害', Math.round(bar0 - (G.S().combat ? G.S().combat.enemies[0].ehp : bar0)));
  // 逃跑
  Math.random = () => 0.0;
  G.fightAction('flee');
  const fl = (G.S().combat ? G.S().combat.log : []).slice(-1)[0] || '（战斗已结束）';
  P('点"逃跑"的结果', fl.slice(0, 60));
  Math.random = rnd;
}

console.log('【④】工具栏：采集扣的是哪一把的耐久？');
{
  const s = fresh();
  G.addItem('axeStone', 1, true); G.addItem('axeSteel', 1, true);
  s.toolDurs.axeStone = [25]; s.toolDurs.axeSteel = [77];      // 石斧 25/25、钢斧 77/90
  G.equipTool('axeStone');                                     // 栏里放石斧（截图里的情形）
  s.toolkit = ['axeStone', null, null];
  P('工具栏里', JSON.stringify(s.toolkit));
  P('背包里的斧头耐久', '石斧 ' + G.durOf('axeStone') + ' / 钢斧 ' + G.durOf('axeSteel'));
  const lv = G.bestToolTier ? G.bestToolTier('axe') : '（无此接口）';
  P('"用哪一级工具"判定 bestToolTier(axe)', lv);
  for (let i = 0; i < 3; i++) { try { G.drainTool('axe'); } catch (e) { P('drainTool 抛错', e.message); break; } }
  P('用 3 次后：石斧 / 钢斧', G.durOf('axeStone') + ' / ' + G.durOf('axeSteel'));
}
`;
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console',
  DATA + '\n' + GAME + '\n' + PROBE)(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console);
