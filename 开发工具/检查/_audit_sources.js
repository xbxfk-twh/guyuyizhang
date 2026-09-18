// 找出"图鉴里有、但游戏里没有任何获取途径"的物品
const fs = require('fs');
const ROOT = 'C:/Users/34297/Desktop/孤屿遗章/孤屿遗章-游戏 - 发布';
const DATA = fs.readFileSync(ROOT + '/js/data.js', 'utf8');
const GAME = fs.readFileSync(ROOT + '/js/game.js', 'utf8');
const UI = fs.readFileSync(ROOT + '/js/ui.js', 'utf8');
const D = new Function('console', DATA + '\nreturn {ITEMS,SCENES,ENEMIES,RECIPES,LAOCHAO,TOWN,BLACKMARKET,RANDOM_EVENTS,REDEEM_CODES};')(console);
const ATL = [...UI.matchAll(/const ATL_(?:SHOP|BUY) = \[([\s\S]*?)\];/g)].map(m => m[1]).join(' ');

const ids = Object.keys(D.ITEMS).filter(k => ['mat', 'special', 'bp', 'seed'].includes(D.ITEMS[k].cat));
const noSource = [];
for (const id of ids) {
  const hits = [];
  for (const sc of D.SCENES) {
    const zs = sc.zones || { _: sc };
    for (const zk in zs) for (const p of (zs[zk].points || [])) if ((p.yields || []).some(y => y.id === id)) hits.push('采集:' + p.id);
  }
  for (const k in D.ENEMIES) for (const d of (D.ENEMIES[k].drops || [])) if (d.id === id) hits.push('掉落:' + k);
  for (const r of D.RECIPES) if (r.out && r.out[id]) hits.push('配方:' + r.id);
  for (const shop of [D.LAOCHAO.sell, D.TOWN.grocer.sell, D.TOWN.smith.sell, D.TOWN.informant.sell, D.BLACKMARKET.sell])
    for (const e of shop) if (e.id === id) hits.push('商店');
  for (const c in D.REDEEM_CODES) if (D.REDEEM_CODES[c].item === id) hits.push('兑换码:' + c);
  for (const ev of D.RANDOM_EVENTS) for (const ch of (ev.choices || [])) if (ch.items && ch.items[id]) hits.push('奇遇:' + ev.id);
  // 注意：给物品的调用有两种写法 —— addItem('x',…) 和 if (gainItem('x',…))（后者是"装不下就进待收"）
  if (new RegExp("(?:addItem|gainItem)\\('" + id + "'").test(GAME)) hits.push('脚本');
  if (ATL.includes("id:'" + id + "'")) hits.push('交易机');
  if (!hits.length) noSource.push(id + '（' + D.ITEMS[id].name + '）');
}
console.log('资源类共', ids.length, '条；没有任何获取途径的:', noSource.length);
noSource.forEach(x => console.log('  -', x));
