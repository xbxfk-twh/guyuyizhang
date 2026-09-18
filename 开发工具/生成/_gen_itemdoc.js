/* 生成《道具 / 治疗物品一览》——直接从 js/data.js 读真实数据，不手抄。
   用法：node _gen_itemdoc.js  → 写出 _道具与治疗一览.md
   说明：造价折价 = 配方材料按各自 price 折算（缺价的材料标 ≥），再除以产出数量。 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const OUT = path.join(__dirname, '..', '..', '文档', '道具与治疗一览.md');
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
new Function('console', DATA + '\nObject.assign(globalThis, {ITEMS, RECIPES, LAOCHAO, TOWN, BLACKMARKET, DURA, CROPS, FURNITURE});')(console);
const { ITEMS, RECIPES, LAOCHAO, TOWN, BLACKMARKET } = globalThis;

const STATION = {
  none: '手工', work1: '工作台', work2: '工作台', work3: '工作台',
  furn1: '熔炉', furn2: '熔炉', furn3: '熔炉', smoke1: '烟熏炉', smoke2: '烟熏炉',
  fire: '篝火', pot: '药锅', spin: '纺车', loom: '织布机', mortar: '研钵',
  medPot: '药炉', stove: '灶台', rack: '晾肉架', tannery: '制革架',
  pearlWork: '珠光工作台', sourceForge: '源质熔炉',
};
const nm = id => (ITEMS[id] ? ITEMS[id].name : id);
const fmt = n => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// 产出索引：itemId → [recipe]
const byOut = {};
for (const r of RECIPES) for (const id of Object.keys(r.out || {})) (byOut[id] = byOut[id] || []).push(r);

function matStr(mats) {
  return Object.entries(mats || {}).map(([k, v]) => `${nm(k)}×${v}`).join(' + ');
}
// 造价折价（材料基础价折算，缺价的材料用 ≥ 标记）
function foldCost(r) {
  let sum = 0, unknown = false, qty = 0;
  for (const [k, v] of Object.entries(r.in || {})) {
    const p = ITEMS[k] && ITEMS[k].price;
    if (typeof p === 'number') sum += p * v; else unknown = true;
    qty += v;
  }
  const outQty = Object.values(r.out || {}).reduce((a, b) => a + b, 0) || 1;
  const unit = sum / outQty;
  return { text: (unknown ? '≥' : '') + fmt(Math.round(unit * 10) / 10), ok: !unknown, unit };
}
function recipeStr(id) {
  const list = byOut[id];
  if (!list || !list.length) return '—（无配方）';
  return list.map(r => {
    const st = STATION[r.station] || r.station || '手工';
    const bp = r.needBp ? `，需【${nm(r.needBp)}】` : '';
    const t = r.time ? ` · ${r.time}分` : '';
    return `${matStr(r.in)} @${st}${t}${bp}`;
  }).join('；<br>');
}
function effects(it) {
  const out = [];
  if (it.heal) out.push(`回血+${it.heal}`);
  if (it.food) out.push(`饱食+${it.food}`);
  if (it.water) out.push(`水分+${it.water}`);
  if (it.sta) out.push(`体力+${it.sta}`);
  if (it.spirit) out.push(`精神${it.spirit > 0 ? '+' : ''}${it.spirit}`);
  if (it.curePoison) out.push('解毒');
  if (it.stopBleed) out.push('止血');
  if (it.revive) out.push(`复活(留${it.reviveHp || 0}血)`);
  if (it.buffStat) out.push(`${it.buffH || 24}h内 ${it.buffStat}+${it.buffVal || 0}`);
  if (it.negChance) out.push(`${Math.round(it.negChance * 100)}%概率${it.negHp ? ` -${it.negHp}血` : ''}${it.negPoison ? ' 中毒' : ''}`);
  if (it.atk) out.push(`攻+${it.atk}`);
  if (it.atkBonus) out.push(`攻+${it.atkBonus}(条件)`);
  if (it.def) out.push(`防+${it.def}`);
  if (it.warm) out.push(`保暖+${it.warm}`);
  if (it.block) out.push(`格挡${Math.round(it.block * 100)}%`);
  if (it.dodge) out.push(`闪避+${it.dodge}`);
  if (it.acc) out.push(`命中+${it.acc}`);
  if (it.spd) out.push(`速度${it.spd}`);
  if (it.ranged) out.push('远程');
  if (it.twoHand) out.push('双手');
  if (it.throw) out.push('投掷');
  if (it.ammoItem) out.push(`弹药:${nm(it.ammoItem)}`);
  if (it.dive) out.push('潜水装备');
  if (it.diveO2) out.push('氧气罩');
  if (it.light) out.push(`照明+${it.light}`);
  if (it.cap) out.push(`扩容+${it.cap}`);
  if (it.tool) out.push(`工具(${it.tool.kind} T${it.tool.tier})`);
  if (it.spoil) out.push(`保质${it.spoil}h`);
  if (it.dur) out.push(`耐久${it.dur}`);
  return out.join('，') || '—';
}
const priceOfId = id => (typeof ITEMS[id].price === 'number' ? ITEMS[id].price : '—');
const durOf = id => (ITEMS[id].dur !== undefined ? ITEMS[id].dur : (ITEMS[id].tool && globalThis.DURA && globalThis.DURA[ITEMS[id].cat] ? '' : ''));
function row(id) {
  const it = ITEMS[id];
  const r = byOut[id] && byOut[id][0];
  const fc = r ? foldCost(r) : null;
  return `| ${it.name} | \`${id}\` | ${effects(it)} | ${recipeStr(id)} | ${priceOfId(id)} | ${fc ? fc.text : '—'} |`;
}
function rowEq(id) {
  const it = ITEMS[id];
  const r = byOut[id] && byOut[id][0];
  const fc = r ? foldCost(r) : null;
  const dur = (globalThis.DURA && globalThis.DURA[id]) ? globalThis.DURA[id] : '—';
  return `| ${it.name} | \`${id}\` | ${effects(it)} | ${dur} | ${recipeStr(id)} | ${priceOfId(id)} | ${fc ? fc.text : '—'} |`;
}
// 治疗类多一列：每 1 点回血的材料成本
function rowHeal(id) {
  const it = ITEMS[id];
  const r = byOut[id] && byOut[id][0];
  const fc = r ? foldCost(r) : null;
  const per = (fc && it.heal) ? `${(fc.text[0] === '≥' ? '≥' : '')}${fmt(Math.round(fc.unit / it.heal * 10) / 10)}` : '—';
  return `| ${it.name} | \`${id}\` | ${effects(it)} | ${recipeStr(id)} | ${priceOfId(id)} | ${fc ? fc.text : '—'} | ${per} |`;
}
const HEAD = '| 名称 | id | 效果 | 配方（材料 @工位 · 耗时 / 图纸） | 基础价 | 造价折价 |\n|---|---|---|---|---|---|';
const HEAD_EQ = '| 名称 | id | 效果 | 耐久 | 配方（材料 @工位 · 耗时 / 图纸） | 基础价 | 造价折价 |\n|---|---|---|---|---|---|---|';
const HEAD_HEAL = '| 名称 | id | 效果 | 配方（材料 @工位 · 耗时 / 图纸） | 基础价 | 造价折价 | 每 1 点回血 |\n|---|---|---|---|---|---|---|';
const ids = Object.keys(ITEMS);
const by = c => ids.filter(i => ITEMS[i].cat === c);
let md = '';

md += `# 孤屿遗章 · 道具 / 治疗物品一览\n\n`;
md += `> 由 \`_gen_itemdoc.js\` 直接从 \`js/data.js\` 生成，改完数据重跑一次即可。\n>\n`;
md += `> **怎么读**：\n`;
md += `> - **效果**列 = 使用/装备后真正生效的字段。\n`;
md += `> - **配方**列 = 该物品能做的话，材料 + 工位 + 耗时（有图纸要求会标出）。\n`;
md += `> - **基础价** = 数据表里的 \`price\`（商店买卖在此基础上乘行情/声望/浮动系数）。\n`;
md += `> - **造价折价** = 配方材料按各自基础价折算再除以产量，用来横向比性价比；\`≥\` 表示有材料没有标价（低于这个数）。\n`;
md += `> - 物品总数 ${ids.length}，配方 ${RECIPES.length} 条。\n\n`;

md += `## 一、治疗 · 药物（cat=med，共 ${by('med').length} 项）\n\n${HEAD_HEAL}\n`;
for (const id of by('med')) md += rowHeal(id) + '\n';
md += `\n最后一列是"每 1 点回血要花多少材料钱"（按材料基础价折算），越低越划算；解毒 / 止血那几件不回血，所以是"—"。\n\n`;

const foods = [...by('food'), ...by('drink')];
const withHeal = foods.filter(i => ITEMS[i].heal);
const onlyFill = foods.filter(i => !ITEMS[i].heal && !ITEMS[i].buffStat && !ITEMS[i].negChance);
const specialFood = foods.filter(i => !ITEMS[i].heal && (ITEMS[i].buffStat || ITEMS[i].negChance));
md += `## 二、食物 · 饮品（共 ${foods.length} 项）\n\n`;
md += `### 2.1 能回血（${withHeal.length} 项）\n\n${HEAD_HEAL}\n`;
for (const id of withHeal.slice().sort((a, b) => ITEMS[b].heal - ITEMS[a].heal)) md += rowHeal(id) + '\n';
md += `\n### 2.2 只回饱食 / 水分（${onlyFill.length} 项）\n\n${HEAD}\n`;
for (const id of onlyFill) md += row(id) + '\n';
md += `\n### 2.3 带增益 / 副作用的食物（稀有鱼等，${specialFood.length} 项）\n\n${HEAD}\n`;
for (const id of specialFood) md += row(id) + '\n';

md += `\n## 三、工具（cat=tool，共 ${by('tool').length} 项）\n\n${HEAD}\n`;
for (const id of by('tool')) md += row(id) + '\n';

md += `\n## 四、武器 / 盾 / 护甲 / 衣物 / 饰品\n\n`;
for (const [c, label] of [['weapon', '武器'], ['shield', '盾'], ['armor', '护甲'], ['cloth', '衣物'], ['accessory', '饰品']]) {
  md += `### ${label}（${by(c).length} 项）\n\n${HEAD_EQ}\n`;
  for (const id of by(c)) md += rowEq(id) + '\n';
  md += '\n';
}

md += `## 五、特殊物品（cat=special，共 ${by('special').length} 项）\n\n${HEAD}\n`;
for (const id of by('special')) md += row(id) + '\n';

md += `\n## 六、材料 / 种子 / 图纸（速查）\n\n`;
md += `### 材料（${by('mat').length} 项）\n\n| 名称 | id | 基础价 | 说明 |\n|---|---|---|---|\n`;
for (const id of by('mat')) md += `| ${ITEMS[id].name} | \`${id}\` | ${priceOfId(id)} | ${ITEMS[id].desc || ''} |\n`;
md += `\n### 种子（${by('seed').length} 项）\n\n| 名称 | id | 基础价 | 配方 |\n|---|---|---|---|\n`;
for (const id of by('seed')) md += `| ${ITEMS[id].name} | \`${id}\` | ${priceOfId(id)} | ${recipeStr(id)} |\n`;
md += `\n### 图纸（${by('bp').length} 项）\n\n| 名称 | id | 基础价 | 解锁 |\n|---|---|---|---|\n`;
for (const id of by('bp')) {
  const uses = RECIPES.filter(r => r.needBp === id).map(r => r.name);
  md += `| ${ITEMS[id].name} | \`${id}\` | ${priceOfId(id)} | ${uses.join('、') || '—'} |\n`;
}

md += `\n## 七、商店价目（卖给你的价 = 代码原值，实际还会乘行情/声望/浮动 ±10%）\n\n`;
const shopRows = (title, list) => {
  let s = `### ${title}\n\n| 货品 | id | 标价 | 解锁天数 |\n|---|---|---|---|\n`;
  for (const e of list) s += `| ${nm(e.id)} | \`${e.id}\` | ${e.base} | ${e.from ? '第 ' + e.from + ' 天起' : '—'} |\n`;
  return s + '\n';
};
md += shopRows('老潮（LAOCHAO.sell）', LAOCHAO.sell || []);
for (const key of Object.keys(TOWN || {})) {
  const t = TOWN[key];
  md += shopRows(`盐镇 · ${t.name}（声望 ${t.needFame || 0}）`, t.sell || []);
  md += `> 他收购：${(t.buy || []).map(e => `${nm(e.id)} ${e.base}`).join('、') || '—'}\n\n`;
}
md += shopRows('黑市（BLACKMARKET.sell）', BLACKMARKET.sell || []);
md += `> 黑市收购：${(BLACKMARKET.buy || []).map(e => `${nm(e.id)} ${e.base}`).join('、') || '—'}\n`;

fs.writeFileSync(OUT, md);
console.log('OK →', OUT, (md.length / 1024).toFixed(1) + ' KB');
