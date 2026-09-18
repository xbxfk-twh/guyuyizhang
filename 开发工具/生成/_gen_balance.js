/* 生成《武器 × 敌人 对照》——数据全部从 js/data.js 现算，公式照 game.js 的战斗逻辑。
   用法：node _gen_balance.js → 写出 _武器与敌人对照.md */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const OUT = path.join(__dirname, '..', '..', '文档', '武器与敌人对照.md');
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
new Function('console', DATA + '\nObject.assign(globalThis, {ITEMS, RECIPES, SCENES, ENEMIES, AMBUSH_MONSTERS, DURA});')(console);
const { ITEMS, RECIPES, SCENES, ENEMIES, AMBUSH_MONSTERS, DURA } = globalThis;

const PLAYER_HP = 100;          // hpMax 基础值
const BASE_ATK = 5;             // playerAtk 里的人物基础攻击
const BASE_DEF = 2;             // playerDef 里的人物基础防御
const ACC = 0.9;                // 命中基准（怕惧 0.7 / 猎人 +0.1）
const CRIT = 1.05;              // 10% 会心 ×1.5 的期望
const GROW = 0.1;               // 采集/战斗技能未计（1 级 +0.1 → 见备注）

const byOut = {};
for (const r of RECIPES) for (const id of Object.keys(r.out || {})) (byOut[id] = byOut[id] || []).push(r);
function foldCost(id) {
  const r = byOut[id] && byOut[id][0];
  if (!r) return null;
  let sum = 0, unknown = false;
  for (const [k, v] of Object.entries(r.in || {})) {
    const p = ITEMS[k] && ITEMS[k].price;
    if (typeof p === 'number') sum += p * v; else unknown = true;
  }
  const outQty = Object.values(r.out || {}).reduce((a, b) => a + b, 0) || 1;
  return { v: Math.round(sum / outQty * 10) / 10, unknown, mats: r.in };
}
const costStr = c => (!c ? '—' : (c.unknown ? '≥' : '') + c.v);
const matStr = m => Object.entries(m || {}).map(([k, v]) => `${ITEMS[k].name}×${v}`).join('+');

// ---------- 场景分阶段 ----------
const STAGES = [
  { key: 's1', name: '① 开局 · 瞭望台 0（第 1~5 天）', scenes: ['camp', 'farm', 'river', 'forest', 'bamboo'], weapon: 'knifeStone', armor: 'grassArmor', shield: 'woodShield' },
  { key: 's2', name: '② 前期 · 瞭望台 1（第 5~12 天）', scenes: ['quarry', 'grassland', 'desert'], weapon: 'ironSword', armor: 'leatherArmor', shield: 'woodShield' },
  { key: 's3', name: '③ 中期 · 瞭望台 2（第 12~20 天）', scenes: ['cave', 'peak'], weapon: 'ironGreatSword', armor: 'ironArmor', shield: 'ironShield' },
  { key: 's4', name: '④ 出海 · 海图/船（第 20 天+）', scenes: ['sea', 'shore'], weapon: 'steelSword', armor: 'blackArmor', shield: 'ironShield' },
  { key: 's5', name: '⑤ 第二章 · 亚克兰蒂斯', scenes: ['atlantis'], weapon: 'sourceSpear', armor: 'sourceArmor', shield: 'steelShield' },
];

// 每个场景里的敌人（hunt / 守卫 / 伏击 / 风险遭遇）
function sceneEnemies(sc) {
  const out = {};
  const add = (id, src) => { if (ENEMIES[id]) (out[id] = out[id] || []).push(src); };
  const scan = (p, where) => {
    if (p.enemies) for (const e of p.enemies) add(e, `${where}${p.name}`);
    if (p.guard) for (const g of (Array.isArray(p.guard) ? p.guard : [p.guard])) add(g, `守卫·${p.name}`);
    if (p.guardChoice) add(p.guardChoice.enemy, `守卫·${p.name}`);
    if (p.risk) add(p.risk, `风险·${p.name}`);
  };
  for (const p of (sc.points || [])) scan(p, '');
  for (const zk in (sc.zones || {})) for (const p of (sc.zones[zk].points || [])) scan(p, '');
  for (const e of (AMBUSH_MONSTERS[sc.id] || [])) add(e, '采集遇袭');
  return out;
}

const weaponIds = Object.keys(ITEMS).filter(i => ITEMS[i].cat === 'weapon');
const armorIds = Object.keys(ITEMS).filter(i => ['armor', 'cloth', 'shield', 'accessory'].includes(ITEMS[i].cat));
let md = '';
md += `# 孤屿遗章 · 武器 × 敌人 对照（自动生成）\n\n`;
md += `> 由 \`_gen_balance.js\` 用 \`js/data.js\` 现算，公式照 \`game.js\` 的战斗逻辑：\n`;
md += `> 我方伤害 = max(1, (5 + 武器攻击 + 加成) − 敌人防御)，命中 ${ACC}（敌人有 evade 再 −0.3），10% 会心 ×1.5（期望 ×${CRIT}）；\n`;
md += `> **出手按"时间追赶"分配**：攻速 = 出手频率。你点一次＝你出手一次，敌人按 敌速 ÷ 我速 攒出手次数；\n`;
md += `> 所以「它打我」那一列 = 单次伤害 ×（敌速 ÷ 我速）的期望值。你 6 打它 7：前几轮它先手，攒满 2 次的那一轮它打你两下（第二下与你同时结算）。\n`;
md += `> 敌人伤害 = max(1, 敌人攻击 − (${BASE_DEF} + 护甲 + 盾) × 防御效率)，防御效率按难度：简单 100% / 普通 90% / 困难 80% / 传奇 70%（表里按**普通 90%**算）；\n`;
md += `> **首回合冲锋 ×2、残血狂暴 ×1.5、石甲反噬、穿透 −50% 防御**这些还要另算，群体（pack）现在是"50% 概率同时来两只"。\n`;
md += `> 玩家血量按 ${PLAYER_HP}；技能等级、磨刀、神物加成未计入（注意：战斗技能现在**每级 +1 防御**，满级 5 级相当于多 5 点防）。\n\n`;

md += `## 一、武器一览（按阶段）\n\n| 名称 | id | 攻击 | 速度 | 耐久 | 造价折价 | 每点攻击造价 | 配方 |\n|---|---|---|---|---|---|---|---|\n`;
const atkSorted = weaponIds.slice().sort((a, b) => (ITEMS[a].atk || 0) - (ITEMS[b].atk || 0));
for (const id of atkSorted) {
  const it = ITEMS[id];
  const c = foldCost(id);
  const per = (it.atk && c) ? Math.round(c.v / it.atk * 10) / 10 : '—';
  md += `| ${it.name} | \`${id}\` | ${it.atk || 0}${it.ranged ? '（远程）' : ''}${it.twoHand ? '（双手）' : ''} | ${it.spd || '—'} | ${DURA[id] || '—'} | ${costStr(c)} | ${per} | ${c ? matStr(c.mats) : '—'} |\n`;
}
md += `\n> 弹药：箭矢 = 木材1+燧石1（造价 1.7）；源能子弹 = 源能晶石1+火药1+铁锭1（造价 70）。远程每射一次消耗 1 发。\n\n`;

md += `## 二、防具 / 盾 / 饰品\n\n| 名称 | id | 防御 | 保暖 | 格挡 | 耐久 | 造价折价 | 配方 |\n|---|---|---|---|---|---|---|---|\n`;
for (const id of armorIds.slice().sort((a, b) => (ITEMS[a].def || 0) - (ITEMS[b].def || 0))) {
  const it = ITEMS[id], c = foldCost(id);
  md += `| ${it.name} | \`${id}\` | ${it.def || 0} | ${it.warm || '—'} | ${it.block ? Math.round(it.block * 100) + '%' : '—'} | ${DURA[id] || '—'} | ${costStr(c)} | ${c ? matStr(c.mats) : '—'} |\n`;
}

// ---------- 每个阶段：装备 + 敌人 + 算好的回合数 ----------
md += `\n## 三、各阶段：你的武器 vs 你要打的敌人\n\n`;
const stageEnemyMap = STAGES.map(st => {
  const map = {};
  for (const sid of st.scenes) {
    const sc = SCENES.find(s => s.id === sid);
    if (!sc) continue;
    for (const [e, src] of Object.entries(sceneEnemies(sc))) (map[e] = map[e] || []).push(...src);
  }
  return map;
});

STAGES.forEach((st, i) => {
  const w = ITEMS[st.weapon], ar = ITEMS[st.armor], sh = ITEMS[st.shield];
  const myAtk = BASE_ATK + (w.atk || 0);
  const myDef = BASE_DEF + (ar.def || 0) + (sh.def || 0);
  const mySpd = w.ranged ? Math.min(10, w.spd || 8) : (w.spd || 10);
  md += `### ${st.name}\n\n`;
  md += `**代表装备**：${w.name}（攻 ${w.atk}）× ${ar.name}（防 ${ar.def}）× ${sh.name}（防 ${sh.def}${sh.block ? '、格挡 ' + Math.round(sh.block * 100) + '%' : ''}）`;
  md += ` → 我方 **攻击 ${myAtk} / 防御 ${myDef} / 速度 ${mySpd}**，血量 ${PLAYER_HP}\n\n`;
  md += `| 敌人 | HP | 攻 | 防 | 速度 | 特性 | 出现地 | 我打它·约几次出手 | 它打我·每次我出手 | 我能撑·约几次出手 | 谁先手 |\n|---|---|---|---|---|---|---|---|---|---|---|\n`;
  const rows = [];
  for (const [eid, srcs] of Object.entries(stageEnemyMap[i])) {
    const e = ENEMIES[eid];
    let acc = ACC; if ((e.traits || []).includes('evade')) acc -= 0.3;
    let dmg = Math.max(1, myAtk - e.def);
    if ((e.traits || []).includes('ironImmune') && myAtk < 22) dmg = Math.max(1, Math.floor(dmg * 0.7));
    const perRound = Math.max(0.5, dmg * acc * CRIT);            // 你每点一次＝出手一次
    const kill = Math.ceil(e.hp / perRound);
    const hit = Math.max(1, e.atk - Math.round(myDef * 0.9));     // 敌人单次攻击打你多少
    const taken = Math.round(hit * (e.spd / Math.max(1, mySpd)) * 10) / 10;   // 你每出手一次，它平均能还几次手
    const die = Math.ceil(PLAYER_HP / Math.max(1, taken));
    const first = (e.traits || []).includes('first') || e.spd > 10;
    rows.push({ eid, e, kill, taken, die, first, srcs: [...new Set(srcs)].join('、') });
  }
  rows.sort((a, b) => a.kill - b.kill || a.e.hp - b.e.hp);
  for (const r of rows) {
    const flag = (r.kill >= 8 ? ' ⚠肉' : '') + (r.die <= 3 ? ' ⚠疼' : '');
    const boss = r.e.hp >= 120 ? '⚑' : '';
    md += `| ${boss}${r.e.name} | ${r.e.hp} | ${r.e.atk} | ${r.e.def} | ${r.e.spd} | ${(r.e.traits || []).join('、') || '—'} | ${r.srcs} | ${r.kill}${flag} | ${r.taken} | ${r.die} | ${r.first ? '敌先' : '我先'} |\n`;
  }
  md += `\n> ⚑ = 首领级（HP ≥ 120）；⚠肉 = 要 8 回合以上；⚠疼 = 一下打你 25 点以上。\n\n`;
});

// ---------- 自动挑出来的可疑项 ----------
md += `## 四、自动挑出来的"值得看一眼"\n\n`;
const notes = [];
STAGES.forEach((st, i) => {
  const w = ITEMS[st.weapon], ar = ITEMS[st.armor], sh = ITEMS[st.shield];
  const myAtk = BASE_ATK + (w.atk || 0), myDef = BASE_DEF + (ar.def || 0) + (sh.def || 0);
  const mySpd = w.ranged ? Math.min(10, w.spd || 8) : (w.spd || 10);
  for (const [eid] of Object.entries(stageEnemyMap[i])) {
    const e = ENEMIES[eid];
    let acc = ACC - ((e.traits || []).includes('evade') ? 0.3 : 0);
    const dmg = Math.max(1, myAtk - e.def);
    const kill = Math.ceil(e.hp / Math.max(0.5, dmg * acc * CRIT));
    const taken = Math.round(Math.max(1, e.atk - Math.round(myDef * 0.9)) * (e.spd / Math.max(1, mySpd)) * 10) / 10;
    if (kill >= 10) notes.push(`- **${st.name}｜${e.name}**：用该阶段主力武器要 **${kill} 次出手**才打死（HP ${e.hp} / 防 ${e.def}）——偏肉。`);
    if (taken >= 12) notes.push(`- **${st.name}｜${e.name}**：你每出手一次，它平均打你 **${taken}** 点（你 ${PLAYER_HP} 血）——偏疼。`);
  }
});
const fast = new Set();
STAGES.forEach((st, i) => { for (const [eid] of Object.entries(stageEnemyMap[i])) { const e = ENEMIES[eid]; if (e.spd > 10) fast.add(`${e.name}(${e.spd})`); } });
md += `- **速度机制（时间追赶）**：攻速 = 出手频率，你点一次＝你出手一次，敌人按「敌速 ÷ 我速」攒出手次数；同一次里它攒满 2 次时，第二下与你同时结算。所以速度 >10 的敌人（${[...fast].join('、')}）会先手、而且你每次出手都可能挨不止一下；反之你换上快武器（匕首 15、双匕首 30）它们还手次数会明显变少。\n`;
const seen = new Set();
md += notes.filter(n => (seen.has(n) ? false : seen.add(n))).join('\n') || '';
md += '\n';
// 武器性价比异常：每点攻击造价明显高于同档
const perList = weaponIds.filter(i => ITEMS[i].atk && foldCost(i)).map(i => ({ id: i, per: foldCost(i).v / ITEMS[i].atk })).sort((a, b) => a.per - b.per);
const mid = perList.length ? perList[Math.floor(perList.length / 2)].per : 0;
const weird = perList.filter(p => p.per > mid * 2.5);
md += `\n**武器性价比**（每点攻击的造价，从低到高）：` + perList.map(p => `${ITEMS[p.id].name} ${Math.round(p.per * 10) / 10}`).join('、') + `\n\n`;
md += weird.length ? `其中明显贵的一档：` + weird.map(p => `**${ITEMS[p.id].name}（${Math.round(p.per * 10) / 10}/点）**`).join('、') + `（约为中位数 ${Math.round(mid * 10) / 10} 的 2.5 倍以上，多半是秘银/源质/图纸卡的）。\n` : '';
md += '\n';

fs.writeFileSync(OUT, md);
console.log('OK →', OUT, (md.length / 1024).toFixed(1) + ' KB');
