/* 界面接线审计：**每一份数据都要有一个真的入口/来源**。
   为什么加它：2026-09-25 作者问"对岸美食家确定实装了吗" —— 结果是 data.js 里摊位、图纸、配方全都在，
   但集市标签硬编码三家、买货处理器也把新摊位吞成杂货商：**数据齐全、玩家却摸不到**。
   这类"接线漏了"的 bug 不会让任何测试变红（因为数据本身是对的），只能靠"从数据反查入口"来抓。
   本文件只读源码/数据，不启动浏览器。

   查七类：
     ① TOWN 摊位 → 集市标签是否派生（不硬编码）
     ② FURNITURE → 是否真能建造（营地家具循环 / 农田畜牧位）
     ③ RECIPES → 工位有没有提供者、材料/产出/图纸 id 是否存在
     ④ 场景点位 → 有没有对应的场景热点（没有热点 = 玩家点不到）
     ⑤ 热点 → 指向的点位是否存在（反向：点了没反应）
     ⑥ 商店清单 / 兑换 / 委托 / 邮件里引用的 item id 是否存在
     ⑦ 建筑链 / 家具 dailyItems / 作物 / 敌人掉落 的 id 是否存在
   用法：node 开发工具/检查/_audit_wiring.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const DATA = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
const GAME = require('../../回归测试/helpers/runtime.js').engineSource(path.join(ROOT, 'js/game.js'));
const UI = fs.readFileSync(path.join(ROOT, 'js/ui.js'), 'utf8');
let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };

// 在假环境里把 data.js + game.js 跑起来，直接读真实数据表
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const D = new Function('localStorage', 'window', 'document', 'console',
  DATA + '\nreturn { ITEMS, RECIPES, FURNITURE, SCENES, SCENE_HOTSPOTS, CAMP_HOTSPOTS, TOWN, LAOCHAO, BLACKMARKET, BUILDING_CHAINS, RELICS, ENEMIES, CROPS, MAILS: (typeof MAILS !== "undefined" ? MAILS : []) };'
)(fakeLS, {}, {}, console);
const { ITEMS, RECIPES, FURNITURE, SCENES, SCENE_HOTSPOTS, CAMP_HOTSPOTS, TOWN, LAOCHAO, BLACKMARKET, BUILDING_CHAINS, ENEMIES, CROPS } = D;
const has = (id) => !!ITEMS[id];

console.log('\n① TOWN 摊位 → 集市标签');
{
  const keys = Object.keys(TOWN);
  ck('①1 每个摊位都有 name / needFame / sell / buy',
     keys.every(k => TOWN[k].name && typeof TOWN[k].needFame === 'number' && Array.isArray(TOWN[k].sell) && Array.isArray(TOWN[k].buy)),
     keys.join(','));
  const order = (UI.match(/const TOWN_ORDER = \[([^\]]*)\]/) || [])[1] || '';
  const listed = (order.match(/'([^']+)'/g) || []).map(s => s.slice(1, -1));
  // ①2 的第一层：标签顺序表里不能漏摊位（漏了会 FAIL，不会静默）。
  ck('①2 集市标签顺序表覆盖了所有摊位',
     listed.length > 0 && keys.every(k => listed.includes(k)),
     '顺序表：' + listed.join(',') + ' / 数据：' + keys.join(','));
  // ①2 的第二层（更硬的保证）：标签列表本身必须从 Object.keys(TOWN) 派生，
  //    顺序表只当"排序偏好"用。这样就算顺序表漏写，新摊位也照样出现 —— 从根上关掉这个 bug 类型。
  ck('①2b 标签列表从 Object.keys(TOWN) 派生（顺序表只影响排序，漏写也不会漏摊位）',
     /const shopIds = Object\.keys\(TOWN\)\.sort\(/.test(UI) &&
     /const shops = shopIds\.map\(id => \[id, TOWN\[id\]\.name, TOWN\[id\]\.needFame \|\| 0\]\);/.test(UI));
  ck('①3 点「买」按当前摊位取货架（不写死摊位名）', /const list = \(TOWN\[shop\] && TOWN\[shop\]\.sell\) \|\| \[\];/.test(UI));
  ck('①4 点「卖」按当前摊位取收购表', /const list = \(TOWN\[townShopNow\] && TOWN\[townShopNow\]\.buy\) \|\| \[\];/.test(UI));
}

console.log('\n② FURNITURE → 能不能建');
{
  // 营地家具循环会跳过 farmOnly（那些走农田畜牧位面板），两处都要有入口
  const skipFarmOnly = /if \(f\.farmOnly\) continue;/.test(UI);
  const farmPanel = /const liveIds = Game\.FARM_LIVESTOCK_IDS;/.test(UI) && /data-fid="\$\{f\.id\}"/.test(UI);
  const farmOnly = FURNITURE.filter(f => f.farmOnly).map(f => f.id);
  ck('②1 家具要么在营地家具列表里、要么走农田畜牧位面板（farmOnly 不会两头都漏）',
     skipFarmOnly && farmPanel && farmOnly.every(id => id === 'coop' || id === 'pen'),
     'farmOnly: ' + farmOnly.join(','));
  const noMats = FURNITURE.filter(f => !f.mats || Object.keys(f.mats).length === 0).map(f => f.id);
  ck('②2 每件家具都写了材料（没材料的只能在别处白送，属于接线漏）',
     noMats.length === 0, noMats.join(',') || '都有');
  const badMat = [];
  for (const f of FURNITURE) for (const k in (f.mats || {})) if (!has(k)) badMat.push(f.id + '←' + k);
  ck('②3 家具材料 id 都存在', badMat.length === 0, badMat.join(',') || '都正确');
  const badPrev = FURNITURE.filter(f => f.needPrev && !FURNITURE.some(x => x.id === f.needPrev)).map(f => f.id);
  ck('②4 needPrev 指向的家具存在', badPrev.length === 0, badPrev.join(',') || '都正确');
}

console.log('\n③ RECIPES → 工位与材料');
{
  const providers = new Set(['none', 'fire', 'pot']);
  for (const f of FURNITURE) if (f.station) providers.add(f.station);
  for (const c of Object.values(BUILDING_CHAINS)) for (const t of c) if (t.station) providers.add(t.station);
  // 亚特兰蒂斯工位单独在 ATLANTIS_FURNITURE 里
  const atl = (DATA.match(/const ATLANTIS_FURNITURE = \[([\s\S]*?)\n\];/) || [])[1] || '';
  for (const m of atl.matchAll(/station:'([a-zA-Z0-9]+)'/g)) providers.add(m[1]);
  const orphan = RECIPES.filter(r => r.station && r.station !== 'none' && !providers.has(r.station)).map(r => r.id + '@' + r.station);
  ck('③1 每个配方的工位都有提供者（工坊/篝火/灶台/手工…），否则配方永远做不了',
     orphan.length === 0, orphan.join(',') || '都接上了');
  const badIn = [], badOut = [], badBp = [], badItem = [];
  for (const r of RECIPES) {
    for (const k in (r.in || {})) if (!has(k)) badIn.push(r.id + '←' + k);
    for (const k in (r.out || {})) if (!has(k)) badOut.push(r.id + '→' + k);
    if (r.needBp && !has(r.needBp)) badBp.push(r.id + '←' + r.needBp);
    if (r.needItem && !has(r.needItem)) badItem.push(r.id + '←' + r.needItem);
  }
  ck('③2 配方材料 id 都存在', badIn.length === 0, badIn.join(',') || '都正确');
  ck('③3 配方产出 id 都存在', badOut.length === 0, badOut.join(',') || '都正确');
  ck('③4 needBp / needItem 指向的物品都存在', badBp.length === 0 && badItem.length === 0, (badBp.concat(badItem)).join(',') || '都正确');
}

console.log('\n④ 场景点位 → 场景热点（没有热点 = 玩家点不到）');
{
  // ⚠️ 热点有三个来源：SCENE_HOTSPOTS（普通场景）、CAMP_HOTSPOTS（营地）、
  //    以及**区域自带**的 z.hotspots（海域/盐镇/遗迹/亚特兰蒂斯各层都走这个）——
  //    第一版只算了前两个，把整片深海和盐镇都误报成"没入口"。
  const hotspotPoints = new Set();
  for (const arr of Object.values(SCENE_HOTSPOTS)) for (const h of arr) if (h.point) hotspotPoints.add(h.point);
  for (const h of CAMP_HOTSPOTS) if (h.point) hotspotPoints.add(h.point);
  for (const sc of SCENES) for (const z of Object.values(sc.zones || {})) for (const h of (z.hotspots || [])) if (h.point) hotspotPoints.add(h.point);
  const all = [];
  for (const sc of SCENES) {
    for (const p of (sc.points || [])) all.push({ scene: sc.id, id: p.id });
    for (const [zk, z] of Object.entries(sc.zones || {})) for (const p of (z.points || [])) all.push({ scene: sc.id + '·' + zk, id: p.id });
  }
  // 已核对的例外（不是 bug，别当成漏接线）：
  //   atlantis·habitat/atl_rest —— 栖息地的**占位点位**（type:'camp'、time/energy 全 0、text 空），
  //   区域里那条 { label:'礁石驻地' } 热点也没接 point；而且栖息地渲染时统一走 ATLANTIS_HOTSPOTS
  //   （见 ui.js renderHotspots：`sc.id === 'atlantis' && zk === 'habitat' ? ATLANTIS_HOTSPOTS`），
  //   所以它压根不会出现在画面上，玩家点不到也无从困惑。栖息地的「礁石营地·建造」覆盖了这块功能。
  const KNOWN_DEAD_POINTS = new Set(['atl_rest']);
  const noHot = all.filter(x => !hotspotPoints.has(x.id) && !KNOWN_DEAD_POINTS.has(x.id)).map(x => x.scene + '/' + x.id);
  ck('④1 每个交互点位都挂了场景热点（否则数据在、玩家摸不到）',
     noHot.length === 0, noHot.join(', ') || all.length + ' 个点位都有热点（已核对例外：atl_rest 占位）');
}

console.log('\n⑤ 热点 → 点位（反向：点了没反应）');
{
  const pointIds = new Set();
  for (const sc of SCENES) {
    for (const p of (sc.points || [])) pointIds.add(p.id);
    for (const z of Object.values(sc.zones || {})) for (const p of (z.points || [])) pointIds.add(p.id);
  }
  const dead = [];
  for (const [sid, arr] of Object.entries(SCENE_HOTSPOTS)) for (const h of arr) if (h.point && !pointIds.has(h.point)) dead.push(sid + '/' + h.point);
  for (const h of CAMP_HOTSPOTS) if (h.point && !pointIds.has(h.point)) dead.push('camp/' + h.point);
  for (const sc of SCENES) for (const [zk, z] of Object.entries(sc.zones || {})) for (const h of (z.hotspots || [])) if (h.point && !pointIds.has(h.point)) dead.push(sc.id + '·' + zk + '/' + h.point);
  ck('⑤1 热点指向的点位都存在（不会点了没反应）', dead.length === 0, dead.join(', ') || '都正确');
  // 场景热点不许挂到别的场景的点位上（以前"龙骨无来源"就是这么来的）
  const wrong = [];
  for (const [sid, arr] of Object.entries(SCENE_HOTSPOTS)) {
    const sc = SCENES.find(x => x.id === sid);
    const own = new Set();
    for (const p of (sc && sc.points) || []) own.add(p.id);
    for (const z of Object.values((sc && sc.zones) || {})) for (const p of (z.points || [])) own.add(p.id);
    for (const h of arr) if (h.point && !own.has(h.point)) wrong.push(sid + '/' + h.point);
  }
  // 区域热点同理：只能挂本区域的点位
  for (const sc of SCENES) for (const [zk, z] of Object.entries(sc.zones || {})) {
    const own = new Set((z.points || []).map(p => p.id));
    for (const h of (z.hotspots || [])) if (h.point && !own.has(h.point)) wrong.push(sc.id + '·' + zk + '/' + h.point);
  }
  ck('⑤2 每个场景/区域的热点只挂自己的点位', wrong.length === 0, wrong.join(', ') || '都正确');
}

console.log('\n⑥ 商店 / 兑换 / 委托 / 邮件引用的 item id');
{
  // ⚠️ 委托奖励里有 fame（声望）这类**不是物品**的字段，别当成打错的 item id
  const NOT_ITEM = new Set(['fame', 'soul', 'backup', 'relic']);
  const bad = [];
  const scan = (tag, list) => { for (const e of (list || [])) if (e && e.id && !has(e.id)) bad.push(tag + '←' + e.id); };
  for (const [k, sh] of Object.entries(TOWN)) { scan('TOWN.' + k + '.sell', sh.sell); scan('TOWN.' + k + '.buy', sh.buy); }
  scan('LAOCHAO.sell', LAOCHAO.sell); scan('LAOCHAO.buy', LAOCHAO.buy);
  scan('BLACKMARKET.sell', BLACKMARKET.sell); scan('BLACKMARKET.buy', BLACKMARKET.buy);
  for (const c of (LAOCHAO.commissions || [])) {
    for (const k in (c.need || {})) if (!has(k)) bad.push('委托' + c.id + '.need←' + k);
    for (const k in (c.reward || {})) if (!has(k) && !NOT_ITEM.has(k)) bad.push('委托' + c.id + '.reward←' + k);
  }
  ck('⑥1 商店/委托引用的物品 id 都存在（fame/soul 这类非物品字段不计）', bad.length === 0, bad.join(', ') || '都正确');
}

console.log('\n⑦ 建筑链 / 家具每日产出 / 作物 / 敌人掉落');
{
  const bad = [];
  for (const [cid, chain] of Object.entries(BUILDING_CHAINS)) for (const t of chain) for (const k in (t.mats || {})) if (!has(k)) bad.push(cid + '←' + k);
  for (const f of FURNITURE) for (const k in (f.dailyItems || {})) if (!has(k)) bad.push('家具' + f.id + '产出←' + k);
  for (const [sid, c] of Object.entries(CROPS)) if (!has(sid) || !has(c.out)) bad.push('作物' + sid + '→' + c.out);
  for (const [eid, e] of Object.entries(ENEMIES)) for (const d of (e.drops || [])) if (!has(d.id)) bad.push('敌人' + eid + '掉落←' + d.id);
  ck('⑦1 建筑/家具产出/作物/掉落的 id 都存在', bad.length === 0, bad.join(', ') || '都正确');
}

console.log('\n⑧ 热点 id → 处理分支 / 弹窗 kind → 渲染分支');
{
  // ⑧1 没有 point 的热点（"按钮型"热点：营地建造、储物箱、农场管理…）靠 h.id 分派。
  //     漏一个分支 = 画面上有这颗按钮、点了毫无反应，而且不报错（2026-09-25 新增「农场管理」时最容易漏）。
  const idSpots = new Set();
  for (const arr of Object.values(SCENE_HOTSPOTS)) for (const h of arr) if (!h.point && h.id) idSpots.add(h.id);
  for (const h of CAMP_HOTSPOTS) if (!h.point && h.id) idSpots.add(h.id);
  for (const sc of SCENES) for (const z of Object.values(sc.zones || {})) for (const h of (z.hotspots || [])) if (!h.point && h.id) idSpots.add(h.id);
  const atlSpots = (DATA.match(/const ATLANTIS_HOTSPOTS = \[([\s\S]*?)\n\];/) || [])[1] || '';
  for (const m of atlSpots.matchAll(/(?:^|[{,]\s*)id:'([a-zA-Z0-9_]+)'/g)) idSpots.add(m[1]);
  const idHandled = new Set();
  for (const m of UI.matchAll(/h\.id === '([a-zA-Z0-9_]+)'/g)) idHandled.add(m[1]);
  const deadSpots = [...idSpots].filter(x => !idHandled.has(x));
  ck('⑧1 每个"按钮型"热点（无 point，按 id 分派）都有处理分支',
     deadSpots.length === 0, deadSpots.join(', ') || idSpots.size + ' 个热点都有分支');

  // ⑧2 showModal('x') 的每个 kind 都得有渲染分支，否则会弹出个空白面板（同样是"点了没反应"）
  const opens = new Set([...UI.matchAll(/showModal\('([a-zA-Z]+)'/g)].map(m => m[1]));
  const kindHandled = new Set();
  for (const m of UI.matchAll(/kind === '([a-zA-Z]+)'/g)) kindHandled.add(m[1]);
  for (const m of UI.matchAll(/case '([a-zA-Z]+)'/g)) kindHandled.add(m[1]);
  for(const match of UI.matchAll(/panels\.register\('([a-zA-Z]+)'/g))kindHandled.add(match[1]);
  const blank = [...opens].filter(k => !kindHandled.has(k));
  ck('⑧2 每个 showModal 的 kind 都有渲染分支（不会弹出空白面板）',
     blank.length === 0, blank.join(', ') || opens.size + ' 种弹窗都有分支');
}

console.log('\n================ 汇总 ================');
console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
if (bad.length) { console.log('失败项：'); bad.forEach(b => console.log(' - ' + b)); }
console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
process.exit(bad.length ? 1 : 0);
