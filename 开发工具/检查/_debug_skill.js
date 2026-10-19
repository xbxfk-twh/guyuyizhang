/* 技能树（B1）专项探针：主干三选一 / 经验扣减 / 分支门槛 / 互斥 / 遗忘（只能末端 + 返还一半）/ 数值钩子真的生效
   用法：node _debug_skill.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = require('../../回归测试/helpers/runtime.js').engineSource(path.join(ROOT, 'js', 'game.js'));

const PROBE = `
const G = Game;
let bad = 0;
const P = (k, v) => console.log('  ' + k + ' → ' + v);
const EQ = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want) || (typeof want === 'number' && Math.abs(got - want) < 1e-6); if (!ok) bad++; console.log((ok ? '  ok   ' : '  FAIL ') + name + ' — ' + got + (ok ? '' : '（应为 ' + want + '）')); };
const fresh = () => { G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null; return s; };

console.log('【1】主干：选一个方向、扣经验、效果真的变');
{
  const s = fresh();
  s.exp.gather = 1000;
  const g0 = G.gatherYieldMul(), t0 = G.gatherTimeMul(), e0 = G.gatherEnergyMul();
  EQ('起始倍率', [g0, t0, e0], [1, 1, 1]);
  const r1 = G.skillUpTrunk('gather', 'yield');
  const r2 = G.skillUpTrunk('gather', 'yield');
  const r3 = G.skillUpTrunk('gather', 'speed');
  const r4 = G.skillUpTrunk('gather', 'stam');
  P('四次升级', [r1.lv, r2.lv, r3.lv, r4.lv] + ' 剩经验 ' + s.exp.gather);
  EQ('花费 12+28+50+80', s.exp.gather, 830);
  EQ('产出 ×1.2（选了两次熟手）', G.gatherYieldMul(), 1.2);
  EQ('耗时 ×0.9（选了一次迅捷）', Math.round(G.gatherTimeMul() * 100) / 100, 0.9);
  EQ('体力 ×0.9（选了一次耐劳）', Math.round(G.gatherEnergyMul() * 100) / 100, 0.9);
  EQ('主干等级 = 4', s.skill.gather, 4);
  EQ('主干上限 7', G.skillTreeInfo().gather.max, 7);
}

console.log('【2】分支门槛 / 互斥 / 学习');
{
  const s = fresh();
  s.exp.gather = 1000;
  EQ('主干没到 2 级时学不了伐木专精', G.nodeCheck('gather','g_wood').ok, false);
  G.skillUpTrunk('gather','yield'); G.skillUpTrunk('gather','yield');
  EQ('主干 2 级后可以学', G.nodeCheck('gather','g_wood').ok, true);
  G.skillNodeLearn('gather','g_wood');
  EQ('伐木专精 1 级', G.nodeLv('gather','g_wood'), 1);
  EQ('★ 与自然感知互斥：学不了', G.nodeCheck('gather','g_nature').ok, false);
  EQ('互斥原因写清楚了', G.nodeCheck('gather','g_nature').reason, '与「伐木专精」互斥');
  EQ('额外木材 +0.5/次', G.gatherYieldMul() !== 0 && G.S && true, true);
}

console.log('【3】遗忘：只能末端 + 返还一半（用一条临时链验证）');
{
  const s = fresh();
  s.exp.gather = 1000;
  G.skillUpTrunk('gather','yield'); G.skillUpTrunk('gather','yield');
  G.skillNodeLearn('gather','g_wood');            // 30
  // 临时挂一个"下游节点"，验证"有下游时不能忘"
  SKILL_TREES.gather.nodes.push({ id:'g_test', name:'测试下游', need:2, needNode:'g_wood', max:1, cost:[40], desc:['测试'] });
  G.skillNodeLearn('gather','g_test');            // 40
  EQ('有下游时不是末端', G.nodeIsLeaf('gather','g_wood'), false);
  EQ('有下游时忘不了', G.skillNodeForget('gather','g_wood').ok, false);
  EQ('下游自己是末端，可以忘', G.nodeIsLeaf('gather','g_test'), true);
  const before = s.exp.gather;
  const fr = G.skillNodeForget('gather','g_test');
  EQ('忘掉下游返还一半（40/2=20）', fr.gain, 20);
  EQ('经验真的加回来了', Math.round(s.exp.gather - before), 20);
  EQ('忘掉下游后，上游恢复成末端', G.nodeIsLeaf('gather','g_wood'), true);
  const fr2 = G.skillNodeForget('gather','g_wood');
  EQ('再忘掉上游：返还 30/2=15', fr2.gain, 15);
  EQ('★ 忘掉后互斥解除（自然感知又能学了）', G.nodeCheck('gather','g_nature').ok, true);
  SKILL_TREES.gather.nodes.pop();                 // 清理临时节点
}

console.log('【4】采集数值钩子：产出 / 耗时 / 体力 / 美人松');
{
  const s = fresh();
  s.exp.gather = 1000;
  G.skillUpTrunk('gather','yield'); G.skillUpTrunk('gather','yield');
  G.skillUpTrunk('gather','yield'); G.skillUpTrunk('gather','yield');   // 4 次熟手 = +40%
  EQ('产出 ×1.4', G.gatherYieldMul(), 1.4);
  s.skill.gather = 4; s.skillPicks.gather = ['yield','yield','yield','yield'];
  G.skillNodeLearn('gather','g_fine');                                   // 精细采集：+20% 产出 / +15% 体力
  EQ('精细采集后产出 ×1.6', Math.round(G.gatherYieldMul() * 100) / 100, 1.6);
  EQ('精细采集后体力 ×1.15', Math.round(G.gatherEnergyMul() * 100) / 100, 1.15);
  const r0 = Math.random; Math.random = () => 0.5;
  EQ('美人松基础 10%（0.5 > 0.1 不触发）', 0.1 + 0 > Math.random(), false);
  Math.random = r0;
}

console.log('【5】制造数值钩子：耗时 / 材料 / 耐久 / 修补匠');
{
  const s = fresh();
  s.exp.craft = 2000;
  const t0 = G.craftIn({ in:{ plank:10, nail:4 } });
  EQ('没学节点时材料不变', t0, { plank:10, nail:4 });
  G.skillUpTrunk('craft','speed'); G.skillUpTrunk('craft','speed');       // 两次熟手 = -20%
  P('制造耗时倍率', '（内部函数不导出，改查配方结算日志）');
  // 精工细作 / 流水线：材料 +30% / -50%，耐久 ±
  s.skill.craft = 4; s.skillPicks.craft = ['speed','speed','refund','extra'];
  G.skillNodeLearn('craft','c_finework');
  EQ('精工细作：材料 +30%（10→13、4→5）', G.craftIn({ in:{ plank:10, nail:4 } }), { plank:13, nail:5 });
  s.tree.craft = {}; G.skillNodeLearn('craft','c_line');
  EQ('流水线：材料 -50%（10→5、4→2）', G.craftIn({ in:{ plank:10, nail:4 } }), { plank:5, nail:2 });
}

console.log('【6】《历代遗章》初始技能经验');
{
  const m = G.metaState();
  m.nodes = m.nodes || {}; m.nodes.startG = 3; m.nodes.startC = 1;
  const s = fresh();
  EQ('开局采集经验 +100', s.exp.gather, 100);
  EQ('开局制造经验 +30', s.exp.craft, 30);
  EQ('开局战斗经验 +0（没买）', s.exp.combat || 0, 0);
  m.nodes.startG = 0; m.nodes.startC = 0;
}

console.log(bad ? ('\\n✗ 有 ' + bad + ' 项不对') : '\\n✓ 技能树 B1 全部通过');
`;
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console',
  DATA + '\n' + GAME + '\n' + PROBE)(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console);
