/* 亚克兰蒂斯（第二章）资源链体检：
   逐个回答"这个材料/图纸到底拿不拿得到"，以及"点位门槛是否可满足"。
   只读，不改游戏文件。 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const { ITEMS, RECIPES, SCENES, ENEMIES, FURNITURE, BUILDING_CHAINS, CROPS, RELICS } =
  new Function(DATA + '; return {ITEMS,RECIPES,SCENES,ENEMIES,FURNITURE,BUILDING_CHAINS,CROPS,RELICS};')();

const ATL = SCENES.find(s => s.id === 'atlantis');

// ---- 收集"能拿到的东西"：点位产出 / 敌人掉落 / 商店 / 鱼人 ----
const sources = {};   // itemId -> [来源描述]
const add = (id, why) => { if (!id) return; (sources[id] = sources[id] || []).push(why); };

for (const zk of Object.keys(ATL.zones)) {
  const z = ATL.zones[zk];
  for (const p of (z.points || [])) {
    for (const y of (p.yields || [])) add(y.id, `点位「${z.name}·${p.name}」`);
    for (const e of (p.enemies || [])) {
      const en = ENEMIES[e];
      if (en) for (const d of (en.drops || [])) add(d.id, `敌人「${en.name}」掉落（${z.name}·${p.name}）`);
    }
    if (p.guard) { const g = ENEMIES[Array.isArray(p.guard) ? p.guard[0] : p.guard]; if (g) for (const d of (g.drops || [])) add(d.id, `守卫「${g.name}」掉落`); }
    if (p.reward) for (const k in (p.reward.items || {})) add(k, `点位奖励「${p.name}」`);
  }
}
// 第一章也扫一遍（有些材料跨章节）
for (const sc of SCENES) {
  for (const zk of Object.keys(sc.zones || {})) {
    const z = sc.zones[zk];
    for (const p of (z.points || [])) {
      for (const y of (p.yields || [])) add(y.id, `点位「${sc.name}·${p.name}」`);
      for (const e of (p.enemies || [])) { const en = ENEMIES[e]; if (en) for (const d of (en.drops || [])) add(d.id, `敌人「${en.name}」掉落`); }
    }
  }
}
// 鱼人兑换（在 game.js 里）
const GAME = require('../../回归测试/helpers/runtime.js').engineSource(path.join(ROOT, 'js', 'game.js'));
const fm = GAME.match(/FISHMAN_DEALS\s*=\s*\[([\s\S]*?)\n\s*\];/);
const fishDeals = fm ? fm[1] : '';
for (const m of fishDeals.matchAll(/relic:'(\w+)'/g)) add(m[1], '神秘鱼人兑换');
for (const m of fishDeals.matchAll(/\{\s*id:'(\w+)',\s*name:[^}]*?\}\s*,\s*need/g)) { /* noop */ }

// ---- 亚特兰蒂斯相关物品：哪些是"深海材料" ----
const ATL_MATS = ['deepCoral', 'pearlGranule', 'sourceOre', 'anctDevice', 'energyCrystal', 'tideSteel', 'shipPlate', 'glowCrystal', 'deepCore', 'atlantisCore', 'sourceBar', 'coralBlade', 'coralArmor', 'sourceSpear', 'sourceArmor', 'thruster', 'diveSuit', 'diveSuit2', 'diveMask', 'lightWeak', 'lightStrong', 'goggles'];

console.log('========== 一、亚特兰蒂斯材料/装备的来源 ==========');
for (const id of ATL_MATS) {
  const it = ITEMS[id];
  if (!it) { console.log(`  ✗ ${id} —— 物品不存在！`); continue; }
  const src = sources[id] || [];
  // 配方产出也算来源
  const made = RECIPES.filter(r => r.out && r.out[id]);
  const mark = src.length || made.length ? 'ok ' : '✗  ';
  console.log(`  ${mark}${(it.name + '（' + id + '）').padEnd(22)} ${src.length ? src.slice(0, 3).join(' / ') : ''}${made.length ? ' [配方:' + made.map(m => m.name).join(',') + ']' : ''}`);
  if (!src.length && !made.length) console.log(`      ⚠ 没有任何来源！`);
}

console.log('\n========== 二、神秘鱼人交易项 ==========');
console.log(fishDeals.trim().split('\n').map(l => '  ' + l.trim()).join('\n'));
// 鱼人要求的材料是否拿得到
const needIds = [...fishDeals.matchAll(/(\w+):\s*\d+/g)].map(m => m[1]).filter(x => ITEMS[x]);
console.log('  交易所需材料：' + [...new Set(needIds)].map(k => `${ITEMS[k].name}${sources[k] || RECIPES.some(r => r.out && r.out[k]) ? '✓' : '✗无来源'}`).join('、'));

console.log('\n========== 三、区域门槛（照明 / 潜水 / 工具）==========');
for (const zk of Object.keys(ATL.zones)) {
  const z = ATL.zones[zk];
  console.log(`  【${z.name}】needLight=${z.needLight === undefined ? '-' : z.needLight} needSuit=${z.needSuit === undefined ? '-' : z.needSuit}`);
  for (const p of (z.points || [])) {
    const n = p.need || {};
    console.log(`     · ${p.name.padEnd(10)} type=${String(p.type).padEnd(8)} need=${JSON.stringify(n)} daily=${p.daily === undefined ? '-' : p.daily}${p.once ? ' once' : ''}${p.guard ? ' 守卫:' + (Array.isArray(p.guard) ? p.guard.join('/') : p.guard) : ''}`);
  }
}

console.log('\n========== 四、关键图纸来源 ==========');
for (const id of Object.keys(ITEMS).filter(k => ITEMS[k].cat === 'bp')) {
  const nm = ITEMS[id].name;
  const src = sources[id] || [];
  const sold = /base:\s*\d+/.test(DATA) && new RegExp(`id:'${id}'`).test(DATA);
  console.log(`  ${src.length ? 'ok ' : '✗  '}${(nm + '（' + id + '）').padEnd(24)} ${src.slice(0, 3).join(' / ') || '（没有点位/掉落来源）'}`);
}
