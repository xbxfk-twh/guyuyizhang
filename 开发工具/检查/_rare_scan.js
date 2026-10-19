// 稀有物品获取途径扫描（只读，不修改游戏文件）
const fs = require('fs');
const ROOT = 'C:/Users/34297/Desktop/孤屿遗章/孤屿遗章-游戏 - 发布';
const DATA = fs.readFileSync(ROOT + '/js/data.js', 'utf8');
const GAME = require('../../回归测试/helpers/runtime.js').engineSource(ROOT + '/js/game.js');
const UI = fs.readFileSync(ROOT + '/js/ui.js', 'utf8');

const D = new Function('console', DATA + '\nreturn {ITEMS,SCENES,ENEMIES,RECIPES,LAOCHAO,TOWN,BLACKMARKET,RANDOM_EVENTS,REDEEM_CODES,RELICS,FURNITURE,BUILDING_CHAINS};')(console);

// ui.js 里的亚克兰蒂斯交易机（IIFE 内部，正则抠出来）
const grab = (name) => {
  const m = UI.match(new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\];'));
  if (!m) return [];
  return [...m[1].matchAll(/id:'([^']+)'[^}]*?base:(\d+)/g)].map(x => ({ id: x[1], base: +x[2] }));
};
const ATL_SHOP = grab('ATL_SHOP');
const ATL_BUY = grab('ATL_BUY');

const TARGETS = process.argv[2] ? process.argv[2].split(',') :
  Object.keys(D.ITEMS).filter(id => (D.ITEMS[id].price || 0) >= 25 || ['bp', 'currency'].includes(D.ITEMS[id].cat));

const shops = [];
for (const e of D.LAOCHAO.sell) shops.push({ shop: '老潮(卖)', ...e });
for (const e of D.LAOCHAO.buy) shops.push({ shop: '老潮(收)', ...e });
for (const k of ['grocer', 'smith', 'informant']) {
  for (const e of D.TOWN[k].sell) shops.push({ shop: D.TOWN[k].name + '(卖)', ...e });
  for (const e of D.TOWN[k].buy) shops.push({ shop: D.TOWN[k].name + '(收)', ...e });
}
for (const e of D.BLACKMARKET.sell) shops.push({ shop: '黑市(卖)', ...e });
for (const e of D.BLACKMARKET.buy) shops.push({ shop: '黑市(收)', ...e });
for (const e of ATL_BUY) shops.push({ shop: '交易机(卖)', ...e });
for (const e of ATL_SHOP) shops.push({ shop: '交易机(收)', ...e });

function pointsOf(sc) {
  const zs = sc.zones || { _: sc };
  const out = [];
  for (const zk in zs) for (const p of (zs[zk].points || [])) out.push({ zone: zs[zk].name, p });
  return out;
}

for (const id of TARGETS) {
  const it = D.ITEMS[id];
  if (!it) { console.log('?? ' + id + ' 未定义'); continue; }
  const f = [];
  // 采集 / 狩猎 / 冒险点
  for (const sc of D.SCENES) {
    for (const { zone, p } of pointsOf(sc)) {
      const y = (p.yields || []).find(x => x.id === id);
      if (y) f.push(`采集｜${sc.name}·${zone !== sc.name ? zone + '·' : ''}${p.name}｜${y.chance ? (y.chance * 100) + '%' : '必得'} ${y.min || 1}~${y.max || y.min || 1}｜${p.daily ? '每天' + p.daily + '次' : p.once ? '一次性' : '不限'}｜${p.needLight ? '需照明' + p.needLight : ''}${p.guard ? '｜守卫:' + (Array.isArray(p.guard) ? p.guard.join('/') : p.guard) + (p.guardChance !== undefined ? '(' + p.guardChance * 100 + '%)' : '(80%)') : ''}`);
      if (p.type === 'hunt' && (p.enemies || []).includes(id)) f.push('狩猎点｜' + sc.name + '·' + p.name);
    }
  }
  // 敌人掉落
  for (const k in D.ENEMIES) {
    const e = D.ENEMIES[k];
    for (const d of (e.drops || [])) if (d.id === id) f.push(`怪物掉落｜${e.name}（${e.boss ? 'BOSS' : e.elite ? '精英' : '普通'}）｜${(d.ch * 100).toFixed(0)}% ×${d.qty}`);
  }
  // 商店
  for (const s of shops) if (s.id === id) f.push(`商店｜${s.shop}｜${s.base}${s.currency === 'coin' ? '金币' : '贝壳'}${s.from ? '｜第' + s.from + '天起' : ''}${s.winter ? '｜冬季×' + s.winter : ''}`);
  // 配方产出
  for (const r of D.RECIPES) if (r.out && r.out[id]) f.push(`制作｜${r.name}×${r.out[id]}｜${(D.FURNITURE.find(x => x.station === r.station) || {}).name || r.station}${r.needBp ? '｜需' + D.ITEMS[r.needBp].name : ''}`);
  // 随机事件
  for (const ev of D.RANDOM_EVENTS) for (const c of (ev.choices || [])) if (c.items && c.items[id]) f.push(`奇遇｜${ev.scene}·${ev.id}｜${c.label}｜${c.chance ? c.chance * 100 + '%' : '必得'}${c.dmg ? '｜代价-' + c.dmg + '血' : ''}${ev.once ? '｜一次性' : ''}`);
  // game.js 里的冒险分支
  const re = new RegExp("addItem\\('" + id + "',\\s*([^)]*)\\)", 'g');
  let m; while ((m = re.exec(GAME))) {
    const before = GAME.slice(Math.max(0, m.index - 400), m.index);
    const ctx = (before.match(/id === '([a-z_0-9]+)'/g) || []).pop();
    f.push('剧情/冒险｜' + (ctx || '?') + '｜' + m[1]);
  }
  // 兑换码
  for (const c in D.REDEEM_CODES) if (D.REDEEM_CODES[c].item === id) f.push('兑换码｜' + c);
  // 神物
  if (D.RELICS[id]) f.push('神物｜' + D.RELICS[id].name + '｜' + D.RELICS[id].desc);
  console.log('\n=== ' + it.name + '（' + id + '）｜' + it.cat + '｜售价' + (it.price || '-') + '｜' + (it.desc || ''));
  f.forEach(x => console.log('   - ' + x));
  if (!f.length) console.log('   - （未找到产出途径）');
}
