/* 技能经验"到手速度"核算：正常游玩下，把采集 / 制造 / 战斗各自升满要多少天。
   用法：node 开发工具\检查\_calc_skill_days.js
   口径：数据全部读真实 SKILL_TREES / SKILL_TRUNK_COST；每天到手经验按"正常游玩"的频次估，
        三档强度都算一遍（休闲 / 正常 / 肝），方便作者按数据调曲线。 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = require('../../回归测试/helpers/runtime.js').engineSource(path.join(ROOT, 'js', 'game.js'));
const box = {};
new Function('window', 'document', 'console', 'box',
  DATA + '\n' + GAME + '\n' +
  'box.SKILL_TREES=SKILL_TREES; box.SKILL_TRUNK_COST=SKILL_TRUNK_COST; box.SKILL_TRUNK_MAX=SKILL_TRUNK_MAX;' +
  'box.RECIPES=RECIPES; box.SCENES=SCENES; box.ENEMIES=ENEMIES; box.DIFFICULTIES=DIFFICULTIES; box.Game=Game;\n'
)({}, {}, console, box);
const { SKILL_TREES, SKILL_TRUNK_COST, SKILL_TRUNK_MAX, SCENES, ENEMIES, Game } = box;

// 升级消耗倍率（作者 2026-09-19 口径纠正）：采集树 ×2、制造树 ×3、战斗树不变 —— 从 game.js 里读，别写死
const mMul = GAME.match(/const SKILL_COST_MUL = \{ gather: (\d+), craft: (\d+), combat: (\d+) \};/);
const COST_MUL = mMul ? { gather: +mMul[1], craft: +mMul[2], combat: +mMul[3] } : { gather:1, craft:1, combat:1 };
const trunkBase = SKILL_TRUNK_COST.reduce((a, b) => a + b, 0);

// 每棵树"能拿到的最多专项经验"：枚举满足 互斥 / 前置 的子集，取总花费最大的一组
function nodeMax(tree) {
  const nodes = (tree.nodes || []);
  let best = { cost: 0, ids: [] };
  const n = nodes.length;
  for (let mask = 0; mask < (1 << n); mask++) {
    const pick = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) pick.push(nodes[i]);
    const coin = pick.filter(p => p.cost).reduce((a, p) => a + p.cost.reduce((x, y) => x + y, 0), 0);
    let ok = true;
    for (const p of pick) {
      if (p.mutex && pick.some(q => q.id === p.mutex)) { ok = false; break; }
      if (p.needNode && !pick.some(q => q.id === p.needNode)) { ok = false; break; }
    }
    if (ok && coin > best.cost) best = { cost: coin, ids: pick.map(p => p.id) };
  }
  return best;
}

const out = {};
for (const kind of ['gather', 'craft', 'combat']) {
  const t = SKILL_TREES[kind];
  const nm = nodeMax(t);
  const mul = COST_MUL[kind] || 1;
  out[kind] = { name: t.name, mul, trunk: trunkBase * mul, nodes: nm.cost * mul, full: (trunkBase + nm.cost) * mul, ids: nm.ids };
}

// —— 每天大概能拿多少经验（按"正常游玩"的动作频次估）——
// 每次动作的经验值直接从 game.js 里读，避免这份核算和代码漂移（作者 2026-09-19 调过一轮）
const mG = GAME.match(/const EXP_GATHER = (\d+), EXP_CRAFT = (\d+);/);
const EXP_GATHER = mG ? +mG[1] : 2;
const EXP_CRAFT = mG ? +mG[2] : 3;
const EXP_BOSS = /const xg = en\.boss \? (\d+) :/.test(GAME) ? +GAME.match(/const xg = en\.boss \? (\d+) :/)[1] : 15;
console.log(`（每次动作经验：采集 +${EXP_GATHER} / 制造每件 +${EXP_CRAFT} / 小怪 +1 普通 +2 精英 +3 首领 +${EXP_BOSS}）\n`);
// 采集：每次点位 +EXP_GATHER 经验（钓鱼/砍树/拾取都一样），体力是天花板。
//   体力：睡一觉回满（上限 150，普通难度）、吃两顿 +16~20、休息每小时 +10。
//   采集一个点位平均 -15 体力，另外一天赶路来回约 -30 → 约 10 次/天。
// 制造：每件 +EXP_CRAFT（有书架 +10%），耗时不占体力；一天按"造多少件"估。
// 战斗：打赢一只小怪 +1、普通 +2、精英 +3、首领 +EXP_BOSS。
const TIERS = [
  { key: '休闲', gather: 5,  craft: 8,  small: 3, normal: 0, elite: 0, boss: 0, note: '每天上线一会儿：采 5 次、造 8 件、打 3 只小怪' },
  { key: '正常', gather: 10, craft: 20, small: 2, normal: 3, elite: 1, boss: 0, note: '稳步推进：采 10 次、造 20 件、打 6 只（2 小怪 + 3 普通 + 1 精英）' },
  { key: '肝',   gather: 18, craft: 40, small: 4, normal: 6, elite: 2, boss: 1, note: '集中肝一天：采 18 次、造 40 件、打 12 只 + 1 个首领' },
];
const perDayExp = (k, t) => k === 'gather' ? t.gather * EXP_GATHER
  : k === 'craft' ? t.craft * EXP_CRAFT
  : (t.small * 1 + t.normal * 2 + t.elite * 3 + t.boss * EXP_BOSS);

console.log('===== 升满需要多少经验（真实数据）=====');
console.log(`升级消耗倍率：采集 ×${COST_MUL.gather} / 制造 ×${COST_MUL.craft} / 战斗 ×${COST_MUL.combat}`);
console.log('主干 ' + SKILL_TRUNK_MAX + ' 级基准合计 ' + trunkBase + ' 点（' + SKILL_TRUNK_COST.join(' / ') + '）');
for (const k of ['gather', 'craft', 'combat']) {
  const o = out[k];
  console.log(`${o.name}（×${o.mul}）：主干满 ${o.trunk} · 专项最多再 ${o.nodes} · 全满 ${o.full}（专项组合：${o.ids.join(' + ') || '无'}）`);
}

console.log('\n===== 每天到手经验 & 升满天数的估算 =====');
for (const k of ['gather', 'craft', 'combat']) {
  const o = out[k];
  console.log(`\n【${o.name}】`);
  for (const t of TIERS) {
    const perDay = perDayExp(k, t);
    const dTrunk = Math.ceil(o.trunk / perDay);
    const dFull = Math.ceil(o.full / perDay);
    console.log(`  ${t.key}（${t.note}）→ 约 ${perDay} 点/天：主干满 ${dTrunk} 天 · 全满 ${dFull} 天`);
  }
}

// 采集侧的体力账：给作者核对自己改体力/加成后的天花板
const gatherPts = [];
for (const sc of SCENES) {
  const zones = sc.zones || { _: sc };
  for (const zk in zones) for (const p of (zones[zk].points || [])) if (p.type === 'gather' || p.type === 'fish' || p.type === 'wood') gatherPts.push(p);
}
const energies = gatherPts.map(p => p.energy).filter(e => typeof e === 'number');
const avgE = energies.length ? Math.round(energies.reduce((a, b) => a + b, 0) / energies.length) : 0;
const dailyCap = gatherPts.reduce((a, p) => a + (p.daily || 0), 0);
const avgExp = 1;   // 每个点位固定 +1 经验
console.log('\n===== 采集侧参考 =====');
console.log(`全岛采集/钓鱼/伐木点位 ${gatherPts.length} 个，平均单次体力 ${avgE}，全岛每天次数上限合计 ${dailyCap}`);
console.log(`按每天可用体力 170（睡满 150 + 两顿饭）、赶路占 30 → 约 ${Math.floor((170 - 30) / Math.max(1, avgE))} 次采集/天（体力是天花板，不是次数上限）`);
console.log(`采集经验固定 +${avgExp}/次；主干「耐劳」每级 -7% 体力、满 7 级 -49% → 同样的体力能采的次数 ×${(1 / 0.51).toFixed(2)}`);

// 战斗侧参考：岛上怪的经验档位
const tiers = { '小怪(+1)': [], '普通(+2)': [], '精英(+3)': [], 'Boss(+10)': [] };
for (const id in ENEMIES) {
  const e = ENEMIES[id];
  const x = e.boss ? 10 : (e.hp >= 100 ? 3 : e.hp >= 30 ? 2 : 1);
  (x === 10 ? tiers['Boss(+10)'] : x === 3 ? tiers['精英(+3)'] : x === 2 ? tiers['普通(+2)'] : tiers['小怪(+1)']).push(e.name);
}
console.log('\n===== 战斗侧参考（按怪强度分档）=====');
for (const k in tiers) console.log(`  ${k}：${tiers[k].length} 种 —— ${tiers[k].slice(0, 6).join('、')}${tiers[k].length > 6 ? '…' : ''}`);
