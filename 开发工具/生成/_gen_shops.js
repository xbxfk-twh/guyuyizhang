/* 生成《全商店价格表》（含浮动区间 + 影响因素）
   价格公式照 js/game.js 的 priceOf()：先算季节/声望/收购折扣，再乘 90~110 的浮动（按"物品id+天数"哈希固定）
   用法：node 开发工具\生成\_gen_shops.js → 写 文档\商店价格表.md */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const OUT = path.join(__dirname, '..', '..', '文档', '商店价格表.md');
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const UI = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
new Function('console', DATA + '\nObject.assign(globalThis, {ITEMS, LAOCHAO, TOWN, BLACKMARKET});')(console);
const { ITEMS, LAOCHAO, TOWN, BLACKMARKET } = globalThis;

// 亚特兰蒂斯交易机的货架写在 ui.js 里，这里把两段数组抠出来
function grabArray(name) {
  const m = new RegExp('const ' + name + '\\s*=\\s*(\\[[\\s\\S]*?\\n\\s*\\];)').exec(UI);
  if (!m) throw new Error('没找到 ' + name);
  return eval(m[1]);
}
const ATL_BUY = grabArray('ATL_BUY');
const ATL_SHOP = grabArray('ATL_SHOP');

// ---- 与 game.js 完全一致的价格计算 ----
const round = Math.round;
const buyPrice = (base, season, fame, jit) => round(round(base * season * fame) * jit / 100);
const sellPrice = (base, season, jit, winterMul) => round(round(base * season * 0.8 * (winterMul || 1)) * jit / 100);
const SEASON = { 春: 0.9, 夏: 0.9, 秋: 1.0, 冬: 1.2 };
const FAME = { 无: 1.0, 声望1: 0.95, 声望2: 0.9 };
const JIT = { 最低: 90, 最高: 110 };
const winterOf = id => (ITEMS[id] && ITEMS[id].winter) || 1;
const nm = id => (ITEMS[id] ? ITEMS[id].name : (id === 'beibi' ? '贝壳币' : id));

// 买入区间：最低 = 春/夏 + 声望2 + 浮动90 ；最高 = 冬 + 无声望 + 浮动110
const buyRange = id => { const b = ITEMS[id] ? (ITEMS[id].price || 0) : 0; return [buyPrice(b, SEASON.春, FAME.声望2, JIT.最低), buyPrice(b, SEASON.冬, FAME.无, JIT.最高)]; };
const sellRange = (id, base) => {
  const b = base !== undefined ? base : (ITEMS[id] ? (ITEMS[id].price || 0) : 0);
  const w = winterOf(id);
  return [sellPrice(b, SEASON.春, JIT.最低), sellPrice(b, SEASON.冬, JIT.最高, w)];
};
const rng = r => (r[0] === r[1] ? `${r[0]}` : `${r[0]} ~ ${r[1]}`);

let md = '';
md += '# 孤屿遗章 · 全商店价格表（含浮动区间）\n\n';
md += '> 由 `开发工具\\生成\\_gen_shops.js` 从 `js/data.js` + `js/ui.js` 现算，公式与 `js/game.js` 的 `priceOf()` 一致。\n\n';
md += '## 一、价格是怎么算出来的\n\n';
md += '```\n';
md += '你买进   = 基础价 × 季节系数 × 声望折扣 × 浮动(90~110%)\n';
md += '你卖出   = 基础价 × 季节系数 × 0.8（商人收购折扣）× 冬季溢价 × 浮动(90~110%)\n';
md += '```\n\n';
md += '| 影响因素 | 取值 | 说明 |\n|---|---|---|\n';
md += '| **季节** | 春 0.9 ／ 夏 0.9 ／ 秋 1.0 ／ **冬 1.2** | 冬天东西最贵 |\n';
md += '| **声望折扣**（只影响你买） | 声望 0 → ×1.0 ／ 1 → ×0.95 ／ **≥2 → ×0.9** | 名声大了商人给折扣 |\n';
md += '| **商人收购折扣** | ×0.8（固定） | 卖东西永远八折，不会因为卖得多继续跌 |\n';
md += '| **冬季溢价** | 兽皮 ×1.5（只有它标了 winter） | 冬天卖兽皮最划算 |\n';
md += '| **日浮动** | 90 ~ 110%（按"物品 id + 当天"哈希） | **同一天同一件货看多少就是多少**，换天才变；不是每次打开都跳 |\n\n';
md += `于是极值区间是：**买入 = 基础价 × 0.729 ~ 1.32**，**卖出 = 基础价 × 0.648 ~ 1.056**（兽皮冬天最高 1.584）。\n\n`;

const shop = (title, list, opts) => {
  opts = opts || {};
  let s = `## ${title}\n\n`;
  if (opts.note) s += opts.note + '\n\n';
  s += `| 货品 | 基础价 | ${opts.rangeLabel || '你买进（最低~最高）'} | 解锁 / 备注 |\n|---|---|---|---|\n`;
  for (const e of list) {
    const it = ITEMS[e.id] || {};
    const r = opts.sell ? sellRange(e.id, e.base) : (e.base !== undefined ? [buyPrice(e.base, SEASON.春, FAME.声望2, JIT.最低), buyPrice(e.base, SEASON.冬, FAME.无, JIT.最高)] : buyRange(e.id));
    const note = [e.from ? `第 ${e.from} 天起` : '', e.kind === 'bp' ? '图纸（限购 1）' : '', it.winter ? `冬季收购 ×${it.winter}` : ''].filter(Boolean).join('；') || '—';
    s += `| ${nm(e.id)} | ${e.base !== undefined ? e.base : (it.price || 0)} | ${rng(r)} | ${note} |\n`;
  }
  return s + '\n';
};

md += shop('二、老潮（营地商人，他卖给你）', LAOCHAO.sell, {});
md += shop('三、老潮收购（你卖给他）', (LAOCHAO.buy || []), { sell: true, rangeLabel: '他收购（最低~最高）' });
for (const key of Object.keys(TOWN || {})) {
  const t = TOWN[key];
  md += shop(`四、盐镇 · ${t.name}（声望 ${t.needFame || 0} 解锁，他卖给你）`, t.sell || [], {});
  if ((t.buy || []).length) md += shop(`　 ↳ ${t.name} 收购（你卖给他）`, t.buy, { sell: true, rangeLabel: '他收购（最低~最高）' });
}
md += shop('五、黑市 · 独眼（他卖给你）', BLACKMARKET.sell || [], {});
md += shop('　 ↳ 黑市收购（你卖给他）', BLACKMARKET.buy || [], { sell: true, rangeLabel: '他收购（最低~最高）' });
md += shop('六、亚克兰蒂斯 · 遗失的交易机（货币：贝壳币）', ATL_BUY, { note: '> 这台机器用**贝壳币**结算，图纸每人只能买一次；下面列出它认的货（你卖给它换贝壳币）。' });
md += shop('　 ↳ 交易机收的货（你卖给机器）', ATL_SHOP, { sell: true, rangeLabel: '它收购（最低~最高）' });

md += '## 七、不走波动的固定定价\n\n';
md += '| 项目 | 价格 | 说明 |\n|---|---|---|\n';
md += '| 金币 → 贝壳 | **1 金币 = 30 贝壳** | 老潮面板「金币兑贝壳」，不限次数 |\n';
md += '| 对岸 · 神秘货郎（奇遇，一次性） | **30 金币 → 随机 1 件未拥有的神物** | 在盐镇附近遇到，选「成交」；不是老潮面板里的常驻兑换 |\n';
md += '| 洞穴神龛（奇遇） | 免费 → 随机 1 件未拥有的神物 | 山洞里摸到发光的石龛 |\n';
md += '| 深海售卖机（亚克兰蒂斯） | **1200 贝壳币 → 当天上架的神物** | 每天刷新 1 件，亚特兰蒂斯之种不上架 |\n';
md += '| 修复潜水装备 | 深珊瑚 ×2（不花钱） | 礁石栖息地的修补台 |\n';
md += '| 校准 / 修复手枪 | 源矿×1 / 源能晶石×1 + 源质锭×1 | 同上 |\n';
md += '\n> （旧的"一键卖固定价表" `sellPrice()` 已删除——它没有任何界面入口。现在卖东西一律走各商店的收购清单 + 上面的公式。）\n';

fs.writeFileSync(OUT, md);
console.log('OK →', OUT, (md.length / 1024).toFixed(1) + ' KB');

// ---- 自检：拿真引擎的 priceOf() 跑一遍，确认所有区间都包得住 ----
const GAME = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const all = [];
const scan = (list, sell) => { for (const e of (list || [])) if (e && e.id !== undefined) all.push({ id: e.id, base: e.base, sell: !!sell, winter: winterOf(e.id) }); };
scan(LAOCHAO.sell, false); scan(LAOCHAO.buy, true);
for (const k in TOWN) { scan(TOWN[k].sell, false); scan(TOWN[k].buy, true); }
scan(BLACKMARKET.sell, false); scan(BLACKMARKET.buy, true);
scan(ATL_BUY, false); scan(ATL_SHOP, true);
const check = `
const all = ${JSON.stringify(all)};
Game.newGame('fisher', 'normal');
let bad = 0, n = 0;
for (const day of [1, 16, 31, 46, 60]) {           // 春夏秋冬各抽几天
  for (const fame of [0, 1, 2]) {                  // 声望三档
    const S = Game.S();
    S.day = day; S.fame = fame;
    for (const it of all) {
      const p = Game.priceOf(it.base, it.sell, it.id);
      const season = (day >= 16 && day <= 30) ? 0.9 : (day >= 31 && day <= 45 ? 1.0 : (day >= 46 ? 1.2 : 0.9));
      const lo = it.sell ? Math.round(Math.round(it.base * 0.9 * 0.8) * 0.9) : Math.round(Math.round(it.base * 0.9 * 0.9) * 0.9);
      let hi = it.sell ? Math.round(Math.round(it.base * 1.2 * 0.8 * (it.winter || 1)) * 1.1) : Math.round(Math.round(it.base * 1.2 * 1.0) * 1.1);
      n++;
      if (p < lo - 1 || p > hi + 1) { bad++; if (bad <= 5) console.log('  区间外:', it.id, 'day', day, 'fame', fame, 'sell', it.sell, '=', p, '区间', lo, '~', hi); }
    }
  }
}
console.log('价格区间自检：跑了 ' + n + ' 次，越界 ' + bad + ' 次');
`;
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console',
  DATA + '\n' + GAME + '\n' + check)(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console);
