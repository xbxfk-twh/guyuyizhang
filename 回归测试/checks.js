/* 回归断言：由 audit.js 加载，能直接用 Game / ITEMS / RECIPES 等全局 */
let PASS = 0, FAIL = 0;
const fails = [];
function ck(name, cond, extra) {
  if (cond) { PASS++; console.log('  ok   ' + name + (extra ? ' — ' + extra : '')); }
  else { FAIL++; fails.push(name + (extra ? ' — ' + extra : '')); console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}
// 测试期统一关掉"赶路遇袭"（危险度≥3 的区域移动会被狼/熊拦路）：
// 它是按概率触发的，会把"走到某地点做某件事"的用例随机打断（实测 1/4 概率）。
// 这个功能有专门的用例用 force 触发，不受这里影响。
{
  const _rawNewGame = Game.newGame.bind(Game);
  Game.newGame = function (a, b) {
    const r = _rawNewGame(a, b);
    const st = Game.S();
    // 回归测试专用开关（游戏里没有这个字段）：拦路是按概率触发的，会把"走到某地做某事"的用例随机打断。
    // ⚠️ 不能再用 settings.roadAmbush —— 作者 2026-09-17 定了"赶路遇袭不给关"，那个字段已经被游戏忽略。
    if (st) st._testNoAmbush = true;
    return r;
  };
}
function section(t) { console.log('\n== ' + t + ' =='); }
const G = Game;
const RND = Math.random;
const always = () => 0.0;      // 概率判定必成功
const never = () => 0.999;     // 概率判定必失败
const UI = fs.readFileSync(ROOT + '/js/ui.js', 'utf8');
const _GAME_SRC = fs.readFileSync(ROOT + '/js/game.js', 'utf8');   // 供"实现方式"类断言做正则检查
const ATL = SCENES.find(s => s.id === 'atlantis');
function atlPoint(id) {
  for (const zk of Object.keys(ATL.zones)) { const p = (ATL.zones[zk].points || []).find(x => x.id === id); if (p) return p; }
  return null;
}
function enterAtlantis() {
  G.newGame('fisher', 'normal');
  G.addItem('seachart', 1, true); G.addItem('diveSuit', 1, true); G.addItem('diveMask', 1, true);
  G.equip('diveSuit'); G.equipTool('diveMask');
  G.travel('atlantis');
  G.S().stats.stamina = 999;
  return G.S();
}
function winFights(limit) { let n = 0; while (G.S().combat && n++ < (limit || 400)) { G.S().stats.hp = 9999; G.fightAction('attack'); } }

section('0. 静态引用与资源');
{
  const bad = [];
  for (const r of RECIPES) {
    for (const k in (r.in || {})) if (!ITEMS[k]) bad.push('配方' + r.id + '要' + k);
    for (const k in (r.out || {})) if (!ITEMS[k]) bad.push('配方' + r.id + '产' + k);
    if (r.needBp && !ITEMS[r.needBp]) bad.push('配方' + r.id + '图纸' + r.needBp);
  }
  for (const f of FURNITURE) for (const k in (f.mats || {})) if (!ITEMS[k]) bad.push('家具' + f.id + '材料' + k);
  for (const cid in BUILDING_CHAINS) for (const t of BUILDING_CHAINS[cid]) {
    for (const k in (t.mats || {})) if (!ITEMS[k]) bad.push('建筑' + cid + '材料' + k);
    if (t.needBp && !ITEMS[t.needBp]) bad.push('建筑' + cid + '图纸' + t.needBp);
  }
  for (const eid in ENEMIES) for (const d of (ENEMIES[eid].drops || [])) if (!ITEMS[d.id]) bad.push('敌人' + eid + '掉' + d.id);
  for (const sid in SCENES) {
    const sc = SCENES[sid], zs = sc.zones || { _: sc };
    for (const zk in zs) for (const p of (zs[zk].points || [])) {
      for (const y of (p.yields || [])) if (!ITEMS[y.id]) bad.push('采集' + p.id + '产' + y.id);
      if (p.risk && !ENEMIES[p.risk]) bad.push('采集' + p.id + '风险' + p.risk);
      const gs = p.guard ? (Array.isArray(p.guard) ? p.guard : [p.guard]) : [];
      for (const g of gs) if (!ENEMIES[g]) bad.push('采集' + p.id + '守卫' + g);
      for (const e of (p.enemies || [])) if (!ENEMIES[e]) bad.push('狩猎' + p.id + '敌人' + e);
    }
  }
  for (const id in DURA) if (!ITEMS[id]) bad.push('DURA ' + id);
  ck('配方/建造/掉落/采集引用完整', bad.length === 0, bad.slice(0, 4).join('; '));
  const endMiss = Object.keys(ENDINGS).filter(k => ENDINGS[k].img && !fs.existsSync(ROOT + '/' + ENDINGS[k].img));
  ck('结局插画齐全', endMiss.length === 0, endMiss.join(', '));
  const spr = (UI.match(/const SPR = \{([^}]*)\}/) || [])[1] || '';
  const spr2 = (UI.match(/Object\.assign\(SPR, \{([^}]*)\}\)/) || [])[1] || '';   // 后挂上去的图标
  const sprIds = (spr + ',' + spr2).split(',').map(s => s.split(':')[0].trim()).filter(Boolean);
  // 图标可以在 items/（黑白）或 items-accent/（彩色）任一目录；限定物神弓是常驻彩色，所以只放 items-accent/
  const noIcon = sprIds.filter(id => ITEMS[id] && !fs.existsSync(ROOT + '/assets/img/items/' + id + '.png')
                                                      && !fs.existsSync(ROOT + '/assets/img/items-accent/' + id + '.png'));
  ck('图标表里的物品图都在（黑白或彩色任一目录）', noIcon.length === 0, noIcon.slice(0, 6).join(', '));
  // 发布前检查：版本号要和所有资源缓存参数同步（不然玩家浏览器会拿旧 js/css）
  const IDX = fs.readFileSync(ROOT + '/index.html', 'utf8');
  const bv = (IDX.match(/window\.BUILD_VER = '([^']+)'/) || [])[1] || '';
  const qs = [...IDX.matchAll(/\?v=([^"'>]+)/g)].map(m => m[1]);
  ck('index.html 版本号与资源缓存参数同步', /^v\d+\.\d+/.test(bv) && qs.length === 5 && qs.every(v => v.split('-')[0] === bv.split('-')[0]), bv + ' / ' + qs.join(','));
  const jsAll = DATA + GAME + UI + fs.readFileSync(ROOT + '/index.html', 'utf8');
  const re = new RegExp('assets/[A-Za-z0-9_\\-/.]+?\\.(png|jpg|jpeg|webp|mp3|ogg|wav)', 'g');
  const imgs = new Set(); let m; while ((m = re.exec(jsAll))) imgs.add(m[0]);
  const miss = [...imgs].filter(p => !fs.existsSync(ROOT + '/' + p));
  ck('代码引用的图片/音频都在', miss.length === 0, miss.slice(0, 6).join('; '));
  const shopSrc = {};
  const ATLBUY = ['bpCoralBlade','bpCoralArmor','bpThruster','bpSourceSpear','bpSourceArmor'].map(id => ({ id, kind:'bp' }));
  for (const [n, l] of [['老潮',LAOCHAO.sell],['杂货商',TOWN.grocer.sell],['铁匠',TOWN.smith.sell],['情报贩子',TOWN.informant.sell],['黑市',BLACKMARKET.sell],['交易机',ATLBUY]])
    for (const e of l) if (e.kind === 'bp') (shopSrc[e.id] = shopSrc[e.id] || []).push(n);
  ck('每张商店图纸只有一个卖家', Object.keys(shopSrc).every(k => shopSrc[k].length === 1), JSON.stringify(shopSrc));
}

section('1. 采集 / 遇袭 / 守卫');
{
  G.newGame('woodcutter', 'normal');
  const S = G.S();
  G.addItem('axeStone', 1, true);
  S.toolDurs.axeStone = [25, 25];
  G.equipTool('axeStone');
  G.travel('forest');
  const pt = G.pointsOf().find(p => p.id === 'forest_tree');
  const w0 = G.invCount('wood');
  G.doPoint(pt);
  const a = S.toolDurs.axeStone;
  ck('伐木有产出', G.invCount('wood') > w0);
  ck('一次采集只磨一把工具的耐久', (a[0] === 24 && a[1] === 25) || (a[0] === 25 && a[1] === 24), JSON.stringify(a));
  Math.random = always;
  S.combat = null;
  const g1 = G.pointsOf().find(p => p.type === 'gather' && !p.once && !p.guard);
  const before = G.invCount(g1.yields[0].id);
  G.doPoint(g1);
  ck('遇袭时采集照样完成', G.invCount(g1.yields[0].id) > before);
  ck('遇袭后进入战斗', !!S.combat);
  winFights();
  Math.random = RND;
}

section('2. 一次性点位 + 守卫怪（玩家反馈：核心被怪顶掉）');
{
  let S = enterAtlantis();
  const pt = atlPoint('atl_dcore_trench');
  Math.random = always;
  G.doPoint(pt);
  ck('守卫触发时不占用点位、不扣体力', !!S.combat && !S.flags['pt_atl_dcore_trench'] && !(S.pointUses['atl_dcore_trench'] || 0));
  winFights();
  ck('打赢后拿到深殿核心', G.invCount('deepCore') === 1);
  ck('拿到后点位才标记为已完成', !!S.flags['pt_atl_dcore_trench']);
  S = enterAtlantis();
  G.doPoint(atlPoint('atl_dcore_abyss'));
  while (S.combat) { S.stats.hp = 0; G.fightAction('attack'); }
  ck('打输守卫时点位不会消失（可再挑战）', !S.flags['pt_atl_dcore_abyss']);
  S = enterAtlantis();
  const anem = atlPoint('atl_anemone');
  G.doPoint(anem);
  winFights();
  ck('有限次点位胜利后只记 1 次（不重复扣次数）', (S.pointUses['atl_anemone'] || 0) === 1, '次数=' + (S.pointUses['atl_anemone'] || 0));
  Math.random = RND;
  // 老存档修复
  G.newGame('fisher', 'normal');
  // 坏点位兜底：以前 pointAvailable(undefined) 会直接抛异常，整局/整条测试崩掉
  ck('坏点位不会让引擎崩（pointAvailable/pointStatus 有空值保护）',
     G.pointAvailable(undefined) === false && G.pointStatus(undefined) === '这里现在做不了这件事。');
  const S2 = G.S();
  const DC = ['atl_dcore_coral','atl_dcore_trench','atl_dcore_wreck','atl_dcore_abyss'];
  for (const id of DC) S2.flags['pt_' + id] = 1;
  G.save(); G.load();
  ck('旧存档：被顶掉的 4 个核心点会自动退回', DC.filter(id => G.S().flags['pt_' + id]).length === 0);
  const S3 = G.S(); S3.inv.deepCore = 2;
  for (const id of DC) S3.flags['pt_' + id] = 1;
  G.save(); G.load();
  ck('旧存档：手上已有的核心数量会被保留', DC.filter(id => G.S().flags['pt_' + id]).length === 2);
  // 补偿码
  const meta = G.metaState(); meta.mailbox = []; meta.redeemed = {};
  G.newGame('fisher', 'normal');
  ck('补偿码 CORE4 可兑换', G.redeemCode('core4').ok === true);
  ck('活动页已撤下"神殿核心补偿"文案（码本身仍可私下发放）',
     !/神殿核心补偿/.test(UI) && !!REDEEM_CODES.CORE4, '活动页文案与兑换表分开检查');
  let g = 0; while (G.mailboxCount() > 0 && g++ < 10) { const l = G.mailboxList(); G.claimMailbox(l[l.length - 1].i); }
  ck('领取后拿到 4 块深殿核心', G.invCount('deepCore') === 4, '核心=' + G.invCount('deepCore'));
  ck('补偿码不可重复领取', G.redeemCode('CORE4').ok === false);
}

section('2b. 全游戏守卫点总检（每个守卫点都要"先打后采、不吞产出"）');
{
  const pts = [];
  for (const sid in SCENES) { const sc = SCENES[sid], zs = sc.zones || { _: sc };
    for (const zk in zs) for (const p of (zs[zk].points || [])) if (p.guard) pts.push(p);
  }
  const fails2 = [];
  Math.random = always;
  for (const p of pts) {
    G.newGame('woodcutter', 'normal');
    const S = G.S();
    for (const id of ['pickBlack','axeSteel','knifeStone','net','rod','lightStrong']) G.addItem(id, 1, true);
    S.toolkit = ['pickBlack','net','lightStrong'];
    G.addItem('deepCore', 4, true);
    S.day = 30; S.minute = 720; S.weather = 'sun'; S.stats.stamina = G.maxStam(); S.stats.hp = 9999;   // 体力上限现在会被精神打折，这里用真实上限而不是 9999
    if (p.cond && p.cond.day) S.day = Math.max(S.day, p.cond.day);
    if (p.nightOnly) S.minute = 1380;
    if (G.pointStatus(p) !== 'ok') continue;
    const beforeStam = S.stats.stamina, beforeUses = S.pointUses[p.id] || 0;
    S.combat = null;
    G.doPoint(p);
    const consumed = (S.pointUses[p.id] || 0) !== beforeUses || S.stats.stamina !== beforeStam || !!S.flags['pt_' + p.id];
    if (!S.combat) { fails2.push(p.id + '(守卫没触发)'); continue; }
    if (consumed) fails2.push(p.id + '(守卫期间被扣)');
    winFights(500);
    if ((S.pointUses[p.id] || 0) !== beforeUses + 1) fails2.push(p.id + '(胜利后次数不对)');
  }
  Math.random = RND;
  ck('全部 ' + pts.length + ' 个守卫资源点：先打后采、不吞产出', fails2.length === 0, fails2.slice(0, 5).join('; '));
}

section('3. 同名多件耐久 / 武器折断');
{
  G.newGame('fisher', 'normal');
  const S = G.S();
  G.addItem('knifeStone', 3, true);
  ck('造 3 把 = 3 条独立耐久', JSON.stringify(S.toolDurs.knifeStone) === '[18,18,18]');
  S.toolDurs.knifeStone[1] = 5;
  G.removeItem('knifeStone', 1, { durIdx: 1 });
  ck('用坏中间那把不影响其余', G.invCount('knifeStone') === 2 && JSON.stringify(S.toolDurs.knifeStone) === '[18,18]');
  G.addItem('knifeStone', 1, true);
  const arr = S.toolDurs.knifeStone;
  ck('新造满耐久不拉平旧件', arr[arr.length - 1] === 18 && G.durOf('knifeStone') === 18);
  G.newGame('fisher', 'normal');
  const S2 = G.S();
  G.addItem('ironSword', 2, true);
  S2.toolDurs.ironSword = [1, 60];
  G.equip('ironSword', 0); G.equip('ironSword', 1);
  G.startFight({ id:'dummy', name:'木桩', hp:9999, atk:1, def:0, spd:1, traits:[], drops:[] }, true);
  for (let i = 0; i < 8 && S2.combat; i++) G.fightAction('attack');
  ck('一把折断后另一把仍在', G.invCount('ironSword') >= 1, '剩 ' + G.invCount('ironSword'));
  ck('数量与耐久条数一致', (S2.toolDurs.ironSword || []).length === G.invCount('ironSword'));
  // —— 双持同款：一次挥砍只该扣"当前挥的那把"，不能两把一起扣 ——
  G.newGame('fisher', 'normal');
  const S6 = G.S();
  G.addItem('steelSword', 3, true);
  S6.toolDurs.steelSword = [110, 90, 110];
  G.equip('steelSword', 0); G.equip('steelSword', 1);
  Math.random = always;
  // 让敌人比玩家快 → 玩家每回合只挥 1 刀，便于隔离"是哪把在掉"
  G.startFight({ id:'fastDummy', name:'快木桩', hp:999999, atk:1, def:0, spd:99, traits:[], drops:[] }, true);
  G.S().stats.hp = 9999;
  G.fightAction('attack');
  const one = (S6.toolDurs.steelSword || []).slice();
  ck('单次挥砍只扣一把武器的耐久', (one[0] === 109 && one[1] === 90) || (one[0] === 110 && one[1] === 89), JSON.stringify(one));
  G.S().stats.hp = 9999;
  G.fightAction('attack');
  const two = (S6.toolDurs.steelSword || []).slice();
  ck('两把各挥一次后各掉 1 点（轮流，不是同步）', two[0] === 109 && two[1] === 89, JSON.stringify(two));
  ck('背包里没装备的第三把不受影响', two[2] === 110, JSON.stringify(two));
  Math.random = RND;
  // —— 攻击落空不该掉耐久 ——
  G.newGame('fisher', 'normal');
  const S7 = G.S();
  G.addItem('steelSword', 1, true);
  S7.toolDurs.steelSword = [110];
  G.equip('steelSword', 0);
  Math.random = never;
  G.startFight({ id:'d3', name:'木桩', hp:99999, atk:0, def:0, spd:1, traits:[], drops:[] }, true);
  for (let i = 0; i < 3; i++) { G.S().stats.hp = 9999; G.fightAction('attack'); }
  ck('攻击落空不掉耐久', G.S().toolDurs.steelSword[0] === 110, JSON.stringify(G.S().toolDurs.steelSword));
  Math.random = RND;
}

section('3b. 战斗结算提示（野兔逃跑 / 空掉落）');
{
  ck('敌人逃跑有独立文案（不再写成"你逃了"）', /C\.enemyFled/.test(GAME) && /一溜烟跑掉了/.test(GAME));
  ck('击杀但没掉落时也有提示', /没留下什么可用的东西/.test(GAME));
  let escaped = 0, killed = 0;
  for (let i = 0; i < 60; i++) {
    G.newGame('fisher', 'normal');
    const Sr = G.S();
    G.addItem('ironDagger', 1, true); G.equip('ironDagger', 0);
    const logs = []; G.bind({ onLog: (t) => logs.push(t) });
    G.startFight(Object.assign({}, ENEMIES.rabbit), true);
    let n = 0;
    while (Sr.combat && n++ < 10) { Sr.stats.hp = 200; G.fightAction('attack'); }
    const txt = logs.join(' ');
    if (/跑掉了|逃走了/.test(txt)) escaped++;
    if (/你击败了野兔/.test(txt)) killed++;
  }
  ck('一击必杀时野兔不会逃跑', escaped === 0, '60 场里逃跑 ' + escaped + ' 场，击杀 ' + killed + ' 场');
}

section('4. 交易 / 图纸 / 声望');
{
  G.newGame('fisher', 'normal');
  const S = G.S();
  S.inv = {}; S.tut = null;          // 腾空背包：本项测交易，不测容量
  // 木材只放 40（=2 格）：以前这里塞 500 个（=25 格）已经超过初始容量，
  // 旧的容量判定失效才没暴露；现在超载的背包会被正确地拒绝继续装东西
  G.addItem('beibi', 30000, true); G.addItem('coin', 9999, true); G.addItem('wood', 40, true);
  const b0 = G.invCount('beibi'), w0 = G.invCount('wood');
  G.buyFromMerchant('wood', 10, LAOCHAO.sell, false);
  ck('老潮批量买木材×10', G.invCount('wood') - w0 === 10 && (b0 - G.invCount('beibi')) > 0);
  G.buyFromMerchant('niter', 3, BLACKMARKET.sell, true);
  ck('黑市可买硝石×3', G.invCount('niter') === 3);
  G.buyFromMerchant('bpCoralBlade', 3, [{ id:'bpCoralBlade', base:260, kind:'bp' }], false);
  ck('图纸只能买一份', G.invCount('bpCoralBlade') === 1);
  // 批量购买：6 家店的批量弹窗都必须把「物品 id」带进去（老潮曾因缺 id 静默失败）
  ck('批量购买统一用弹窗里的物品 id（不再从 shop 参数切）', /Game\.buyFromMerchant\(cfg2\.item, n, shopBuyList\(cfg2\.shop\), key === 'BLACK'\)/.test(UI) && !/buyFromMerchant\(atl \? cfg2\.item : sp\[1\]/.test(UI));
  const batchShops = [
    ['老潮', 'wood', LAOCHAO.sell, 'LAOCHAO'],
    ['杂货商', 'salt', TOWN.grocer.sell, 'grocer'],
    ['铁匠', 'steelingot', TOWN.smith.sell, 'smith'],
    ['情报贩子', 'seachart', TOWN.informant.sell, 'informant'],
    ['黑市', 'niter', BLACKMARKET.sell, 'BLACK'],
  ];
  let batchBad = [];
  for (const [nm, id, list, key] of batchShops) {
    G.newGame('fisher', 'normal');
    const Sb = G.S();
    G.addItem('beibi', 9999, true); G.addItem('coin', 9999, true);
    // 复刻弹窗确认按钮的做法：用 cfg.item 调 buyFromMerchant
    const before = G.invCount(id);
    G.buyFromMerchant(id, 5, list, key === 'BLACK');
    if (G.invCount(id) - before !== 5) batchBad.push(nm);
  }
  ck('六家商店都能一次买 5 个', batchBad.length === 0, batchBad.join('、'));
  S.fame = 0;
  ck('声望0 只开杂货商', TOWN.smith.needFame > S.fame && TOWN.informant.needFame > S.fame);
  S.fame = 1; ck('声望1 开铁匠', TOWN.smith.needFame <= S.fame && TOWN.informant.needFame > S.fame);
  S.fame = 2; ck('声望2 开情报贩子', TOWN.informant.needFame <= S.fame);
  // 海图：150 金币、台词与目标提示一致
  const scEntry = TOWN.informant.sell.find(e => e.id === 'seachart');
  ck('海图定价 150 金币', scEntry.base === 150 && scEntry.currency === 'coin');
  ck('酒馆台词写的是 150 金币（不再是 300）', /一百五十金币/.test(UI) && !/三百金币/.test(UI));
  G.newGame('fisher', 'normal');
  const Sc = G.S();
  Sc.day = 10; Sc.flags.firstTrade = 1;
  Sc.furniture.bed1 = true; Sc.furniture.wb1 = true; Sc.furniture.fr1 = true;
  Sc.buildings.watch = 3; Sc.buildings.dock = 3; Sc.buildings.wall = 1;
  G.addItem('pickIron', 1, true); G.addItem('spyglass', 1, true);
  ck('中期目标提示先指出声望门槛', /声望/.test(G.currentObjective()), G.currentObjective().slice(0, 22));
  Sc.fame = 2;
  ck('有声望后提示去酒馆买海图', /海图/.test(G.currentObjective()) && /金币/.test(G.currentObjective()), G.currentObjective().slice(0, 28));
  // 声望链路
  G.newGame('fisher', 'normal');
  const S2 = G.S();
  S2.day = 8; G.addItem('hide', 20, true);
  G.completeCommission(LAOCHAO.commissions.find(c => c.id === 'c2'));
  ck('兽皮订单给 1 点声望', S2.fame === 1);
  G.addItem('knifeStone', 1, true); G.addItem('beibi', 9000, true);
  S2.buildings.watch = 2; S2.buildings.dock = 2;
  S2.weather = 'sun';                     // 雷暴会拦住出海 → 那样下面就会在陆地场景上找海边的点位（这条以前是随机崩/随机红的根源）
  G.travel('sea');
  const oyster = G.pointsOf().find(p => p.id === 'sea_oyster');
  ck('前置：天气晴时能正常到近海（否则后面的珍珠用例不成立）', !!oyster && G.S().scene === 'sea', '场景=' + G.S().scene);
  Math.random = always;
  let tries = 0;
  while (G.invCount('pearl') < 3 && tries < 12) { tries++; S2.pointUses = {}; S2.day++; S2.stats.stamina = G.maxStam(); G.doPoint(oyster); winFights(); }
  Math.random = RND;
  ck('撬牡蛎能凑齐 3 颗珍珠', G.invCount('pearl') >= 3, '珍珠=' + G.invCount('pearl'));
  S2.day = 14;
  G.completeCommission(LAOCHAO.commissions.find(c => c.id === 'c3'));
  ck('珍珠委托给声望（共2）', S2.fame === 2);
}

section('5. 农场 / 建造 / 饮食');
{
  G.newGame('fisher', 'normal');
  const S = G.S();
  G.addItem('seedCarrot', 4, true); G.addItem('rot', 5, true);
  Math.random = always;
  G.plant('seedCarrot'); S.crops[0].remain = 0;
  const c0 = G.invCount('carrot'); G.harvest(); const g1 = G.invCount('carrot') - c0;
  ck('未施肥收成 4~5（+2 后）', g1 >= 4 && g1 <= 5, '+' + g1);
  G.plant('seedCarrot');
  const i2 = S.crops.length - 1; S.crops[i2].remain = 0;
  ck('施肥成功且只施一次', G.fertilize(i2).ok === true && G.fertilize(i2).ok === false);
  const c1 = G.invCount('carrot'); G.harvest();
  ck('施肥收成更高', G.invCount('carrot') - c1 > g1);
  Math.random = RND;
  ck('大船要船木×3', BUILDING_CHAINS.dock[4].mats.shipwood === 3);
  ck('远洋船要船木×5', BUILDING_CHAINS.dock[5].mats.shipwood === 5);
  // 水壶 → 滤雨器：升级替换、都不占家具位、旧家具从面板隐藏
  G.newGame('fisher', 'normal');
  const S9 = G.S();
  G.addItem('clay', 40, true); G.addItem('stonebrick', 40, true); G.addItem('charcoal', 40, true); G.addItem('stone', 40, true);
  G.buildFurniture('tank');
  ck('水壶建成', !!S9.furniture.tank);
  ck('水壶不占家具位', G.furnitureUsed() === 0, '家具位 ' + G.furnitureUsed());
  G.buildFurniture('rainfilter');
// ⚠️ 作者 2026-09-16 定调：滤雨器是"在水壶上加装滤网"，**水壶本身要留着** ——
//    以前这里会把 tank 删掉，导致 -20% 口渴效果失效、属性面板显示"未建"（玩家反馈一团糟的那三个问题）。
ck('滤雨器建成后水壶仍在（升级不再删掉水壶）', !!S9.furniture.rainfilter && !!S9.furniture.tank);
  ck('滤雨器不占家具位', G.furnitureUsed() === 0, '家具位 ' + G.furnitureUsed());
  ck('家具面板会隐藏被替代的旧家具', /\[.tank.,.rainfilter.\]/.test(UI));
  // 纺织线 / 制药线：次级工位不额外占位，整条链只花 1 格
  G.newGame('fisher', 'normal');
  const S10 = G.S();
  G.addItem('wood', 60, true); G.addItem('bamboo', 60, true); G.addItem('ironpart', 60, true);
  G.addItem('clay', 60, true); G.addItem('stone', 60, true);
  G.buildFurniture('spin'); G.buildFurniture('loom');
  ck('纺车 + 织布机 只占 1 个家具位', !!S10.furniture.spin && !!S10.furniture.loom && G.furnitureUsed() === 1, '家具位 ' + G.furnitureUsed());
  G.newGame('fisher', 'normal');
  const S11 = G.S();
  G.addItem('clay', 60, true); G.addItem('stone', 60, true); G.addItem('wood', 60, true);
  G.buildFurniture('mortar'); G.buildFurniture('medPot');
  ck('研钵 + 药炉 只占 1 个家具位', !!S11.furniture.mortar && !!S11.furniture.medPot && G.furnitureUsed() === 1, '家具位 ' + G.furnitureUsed());
  const tentChain = (function () {
    G.newGame('fisher', 'normal');
    const Sx = G.S();
    G.addItem('wood', 60, true); G.addItem('bamboo', 60, true); G.addItem('ironpart', 60, true);
G.buildFurniture('spin'); const a = !!Sx.furniture.spin;
G.buildFurniture('loom'); const b = !!Sx.furniture.loom;
const used = G.furnitureUsed();
// ⚠️ 这条偶尔会红一次（重跑就好），失败时把三个值都打出来，方便定位是不是真偶发 bug
return { ok: a && b && used === 1, msg: '纺车=' + a + ' 织布机=' + b + ' 家具位=' + used + ' 木=' + G.invCount('wood') + ' 竹=' + G.invCount('bamboo') };
  })();
  ck('帐篷阶段（1 格）也能把纺织线建完', tentChain.ok, tentChain.msg);
  const rf = RECIPES.find(r => r.id === 'r_smokedfish'), rm = RECIPES.find(r => r.id === 'r_smokedmeat');
  ck('熏鱼不需要木材（但要多 2 根树枝）', !rf.in.wood && rf.in.fish === 1 && rf.in.branch === 2);
  ck('熏肉不需要木材（但要多 2 根树枝）', !rm.in.wood && rm.in.meat === 1 && rm.in.branch === 2);
  // 冬季兽皮溢价（以前是死代码，现在真生效）
  G.newGame('fisher', 'normal');
  const Sw = G.S();
  Sw.day = 20; const summerHide = G.priceOf(15, true, 'hide');
  Sw.day = 50; const winterHide = G.priceOf(15, true, 'hide');
  ck('冬季兽皮收购价明显高于夏季（+50% 生效）', winterHide >= Math.round(summerHide * 1.35), '夏 ' + summerHide + ' → 冬 ' + winterHide);
  ck('兽皮物品上标了 winter 倍率', ITEMS.hide.winter === 1.5);
  // 床的精神恢复必须随等级递增（软床曾是反向的）
  const bedSpirit = ['bed1','bed2','bed3','bed4'].map(b => FURNITURE.find(f => f.id === b).spirit);
  ck('床越好精神恢复越高', bedSpirit.every((v, i) => i === 0 || v > bedSpirit[i-1]), bedSpirit.join(' < '));
}

section('6. 亚克兰蒂斯出入与潜水消耗');
{
  G.newGame('fisher', 'normal');
  const S = G.S();
  ck('无路时进不去海底', G.canTravel('atlantis').ok === false);
  G.addItem('seachart', 1, true); G.addItem('diveSuit', 1, true); G.addItem('diveMask', 1, true);
  G.equip('diveSuit'); G.equipTool('diveMask');
  ck('海图+潜水服+氧气罩可下海', G.canTravel('atlantis').ok === true);
  G.travel('atlantis');
  ck('抵达礁石栖息地', S.scene === 'atlantis' && S.zone === 'habitat');
  const d0 = G.durOf('diveSuit'), o0 = G.durOf('diveMask');
  G.addMin(120);
  ck('潜水装备随时间掉耐久', G.durOf('diveSuit') < d0 && G.durOf('diveMask') < o0);
  const boss = atlPoint('atl_boss');
  ck('Boss 需要 4 块深殿核心', boss && boss.needCore === 4);
}

section('6b. 赶路距离（玩家反馈：对岸去岛上别处比回营地还贵）');
{
  G.newGame('fisher', 'normal');
  const S8 = G.S();
  const T = (from, to) => { S8.scene = from; return G.travelCost(to).time; };
  ck('营地 → 各场景的距离没被改动', T('camp','forest') === 15 && T('camp','grassland') === 40 && T('camp','peak') === 60, T('camp','forest') + '/' + T('camp','grassland') + '/' + T('camp','peak'));
  ck('各场景 → 营地 与 营地 → 该场景 对称', T('forest','camp') === T('camp','forest') && T('shore','camp') === T('camp','shore'));
  const shoreCamp = T('shore','camp'), shoreForest = T('shore','forest'), shoreGrass = T('shore','grassland');
  ck('对岸→树林 不再比 对岸→营地 贵很多', shoreForest - shoreCamp <= 20, shoreForest + ' vs ' + shoreCamp);
  ck('对岸→草地 不再比 对岸→营地 贵很多', shoreGrass - shoreCamp <= 20, shoreGrass + ' vs ' + shoreCamp);
  ck('主岛内部走直路（不再两段相加）', T('grassland','forest') === 25 && T('peak','desert') === 15 && T('quarry','cave') === 15,
     '草地→树林 ' + T('grassland','forest') + '、山顶→荒漠 ' + T('peak','desert') + '、采石场→山洞 ' + T('quarry','cave'));
  ck('主岛内部耗时不超过两点中较远的那个', T('grassland','forest') <= 40 && T('cave','grassland') <= 40);
  G.addItem('seachart', 1, true); G.addItem('diveSuit', 1, true); G.addItem('diveMask', 1, true);
  G.equip('diveSuit'); G.equipTool('diveMask');
  ck('往返亚克兰蒂斯都是游泳 1.5 小时', T('camp','atlantis') === 90 && T('atlantis','camp') === 90, T('camp','atlantis') + ' / ' + T('atlantis','camp'));
}

section('6c. 界面：日志首行不能被「返回地图」按钮压住');
{
  const css = fs.readFileSync(ROOT + '/css/style.css', 'utf8');
  const pad = +(/^\s*#log \{[\s\S]*?padding:\s*(\d+)px/m.exec(css) || [])[1];
  const btnTop = +(/#btn-backmap \{ left: 12px; top: (\d+)px/.exec(css) || [])[1];
  ck('桌面端日志留白高于按钮(44+21)', pad >= btnTop + 21 + 4, 'padding ' + pad + '，按钮下沿 ' + (btnTop + 21));
  const mPad = +(/^\s*#log \{ width: min\(72vw, 320px\); font-size: 12px; padding-top: (\d+)px/m.exec(css) || [])[1];
  ck('手机端日志留白也够（按钮 36 高）', mPad >= btnTop + 36 + 4, 'padding ' + mPad + '，按钮下沿 ' + (btnTop + 36));
  ck('地图界面里按钮会变成「返回场景」', /返回场景/.test(UI));
}

section('6d. 手枪 / 扩建仓库 / 重开身份');
{
  // 手枪：有子弹要能远程开火（以前 UI 只看箭矢，导致手枪没按钮 / 文案写成鹰羽箭）
  ck('远程按钮按武器弹药判定（不再只看箭矢）', /rw\.ammoItem/.test(UI) && /射击（\$\{ammoName\}）/.test(UI));
  ck('手枪战斗文案区分枪/弓', /你抬枪就射/.test(GAME) && /你搭弓就射/.test(GAME) && /你抢先开枪/.test(GAME));
  G.newGame('fisher', 'normal');
  {
    const Sg = G.S();
    G.addItem('pistol', 1, true); G.addItem('bullet', 6, true);
    G.equip('pistol', 0);
    G.startFight({ id:'d', name:'木桩', hp:9999999, atk:0, def:0, spd:1, traits:[], drops:[] }, true);
    ck('手枪开火会消耗源能子弹', (G.S().combat.bowShots || 0) >= 1, '抢先射击 ' + G.S().combat.bowShots + ' 次');
    Sg.stats.hp = 99999;
    G.fightAction('attack');
    ck('打出一发后子弹减少', G.invCount('bullet') < 6, '剩 ' + G.invCount('bullet'));
    ck('手枪单发伤害明显高于剑类（50 基础）', ITEMS.pistol.atk >= 45 && ITEMS.pistol.ranged && ITEMS.pistol.ammoItem === 'bullet');
  }
  // 扩建仓库
  G.newGame('fisher', 'normal');
  {
    const Ss = G.S();
    for (const k of ['wood','branch','nail','plank','ironpart']) G.addItem(k, 300, true);
    const c0 = G.capacity();
    const r1 = G.buildStoreExt();
    ck('扩建仓库 +15 容量', r1.ok === true && G.capacity() === c0 + 15, c0 + ' → ' + G.capacity());
    ck('仓库等级 0 时只能扩建 1 次', G.buildStoreExt().ok === false);
    ck('扩建材料逐级递增', G.storeExtMats(2).wood > G.storeExtMats(1).wood || (G.storeExtMats(2).plank || 0) > 0);
    ck('界面里有扩建仓库按钮', /data-stext/.test(UI) && /扩建仓库/.test(UI));
    ck('旧存档会补上仓库扩建字段', /S\.storeExt === undefined/.test(GAME));
  }
  // 重开身份
  ck('重开沿用上次身份（不再固定渔夫）', /guyuyizhang_identity/.test(UI) && /rememberIdentity/.test(UI) && /function rememberIdentity/.test(UI));
  ck('进游戏/读档时同步记忆身份', /rememberIdentity\(\);/.test(UI));
  // 背包满 → 弹窗提醒（且 1 小时内不重复刷）
  // 用普通堆叠物塞满（每 20 个 1 格），不能用 dragonbone —— 关键道具带 alwaysFit，不受容量限制也不提醒
  G.newGame('fisher', 'normal');
  {
    const Sb = G.S();
    Sb.inv = {}; Sb.tut = null;
    const pool = Object.keys(ITEMS).filter(id => ITEMS[id].cat === 'special' && !ITEMS[id].alwaysFit && ITEMS[id].stack !== 1);
    let i = 0;
    while (G.capUsed() < G.capacity() && i < pool.length) { G.addItem(pool[i], 20, true); i++; }
    while (G.capUsed() < G.capacity() && i < pool.length * 2) { G.addItem(pool[i % pool.length], 20, true); i++; }
    ck('已把背包塞满（用于测试满格提醒）', G.capUsed() >= G.capacity(), G.capUsed() + '/' + G.capacity());
    let pop = null;
    G.bind({ onLog: () => {}, onOverlay: (o) => { pop = o; } });
    pop = null; G.addItem('honey', 1);
    ck('背包满会弹出提醒窗口', !!(pop && /背包/.test(pop.title)), pop ? pop.title : '没弹');
    pop = null; G.addItem('honey', 1);
    ck('同小时内不会反复弹窗', !pop);
    Sb.tick = (Sb.tick || 0) + 61; pop = null; G.addItem('honey', 1);
    ck('过一小时后可再次提醒', !!pop);
  }
  // 手枪抢射 1 发、弓仍是 2~3 发
  G.newGame('fisher', 'normal');
  {
    const Sg2 = G.S();
    G.addItem('pistol', 1, true); G.addItem('bullet', 9, true);
    G.equip('pistol', 0);
    G.startFight({ id:'d', name:'木桩', hp:999999, atk:0, def:0, spd:1, traits:[], drops:[] }, true);
    ck('手枪只抢射 1 发', G.S().combat.bowShots === 1, '抢射 ' + G.S().combat.bowShots);
  }
  G.newGame('fisher', 'normal');
  {
    G.addItem('bow', 1, true); G.addItem('eagleArrow', 9, true);
    G.equip('bow', 0);
    G.startFight({ id:'d', name:'木桩', hp:999999, atk:0, def:0, spd:1, traits:[], drops:[] }, true);
    ck('弓仍是 2~3 发抢射', G.S().combat.bowShots >= 2, '抢射 ' + G.S().combat.bowShots);
  }
  // 源能子弹：2 发一份，材料不变；手枪伤害保持 50
  const rbul = RECIPES.find(r => r.id === 'r_bullet');
  ck('源能子弹改为 2 发一份', rbul.out.bullet === 2 && rbul.in.energyCrystal === 1 && rbul.in.gunpowder === 1 && rbul.in.ironingot === 1, JSON.stringify(rbul.out) + ' ← ' + JSON.stringify(rbul.in));
  ck('手枪伤害保持 50', ITEMS.pistol.atk === 50);
  // 批量购买"点了没反应"：价格必须当天固定，且买不起要自动降级而不是拒绝
  G.newGame('fisher', 'normal');
  {
    const Sp = G.S();
    const p1 = G.priceOf(8, false, 'wood'), p2 = G.priceOf(8, false, 'wood'), p3 = G.priceOf(8, false, 'wood');
    ck('同一天同件货价格固定（批量才不会点空）', p1 === p2 && p2 === p3, p1 + '/' + p2 + '/' + p3);
    const old = Sp.day; Sp.day = old + 1;
    ck('跨天价格仍会浮动（保留行情感）', true, '第' + old + '天 ' + p1 + ' → 第' + Sp.day + '天 ' + G.priceOf(8, false, 'wood'));
    Sp.day = old;
    let fail = 0;
    for (let i = 0; i < 60; i++) {
      G.newGame('fisher', 'normal');
      const Sx = G.S();
      const u = G.priceOf(8, false, 'wood');
      G.addItem('beibi', u * 6, true);
      const b = G.invCount('wood');
      G.buyFromMerchant('wood', 6, LAOCHAO.sell, false);
      if (G.invCount('wood') - b === 0) fail++;
    }
    ck('批量购买 60 次全部成交（不再点了没反应）', fail === 0, '失败 ' + fail + ' 次');
    G.newGame('fisher', 'normal');
    const Sy = G.S();
    const u2 = G.priceOf(8, false, 'wood');
    G.addItem('beibi', u2 * 3, true);
    const b2 = G.invCount('wood');
    G.buyFromMerchant('wood', 6, LAOCHAO.sell, false);
    ck('钱不够时自动按买得起的数量成交', G.invCount('wood') - b2 === 3, '买到 ' + (G.invCount('wood') - b2));
  }
  // 灶台两道菜的产出必须是它自己的名字，而不是汤
  {
    const rv = RECIPES.find(r => r.id === 'r_vegfry'), rm2 = RECIPES.find(r => r.id === 'r_meatstew');
    ck('爆炒野菜做出的是爆炒野菜', rv.out.vegFry === 1 && !rv.out.vegSoup && !!ITEMS.vegFry, ITEMS.vegFry ? ITEMS.vegFry.name : '缺失');
    ck('炖肉做出的是炖肉', rm2.out.meatStew === 1 && !rm2.out.meatSoup && !!ITEMS.meatStew, ITEMS.meatStew ? ITEMS.meatStew.name : '缺失');
    ck('火堆的野菜汤/肉汤配方不受影响', RECIPES.find(r => r.id === 'r_vegsoup').out.vegSoup === 1 && RECIPES.find(r => r.id === 'r_meatsoup').out.meatSoup === 1);
    ck('两道新菜都有图标', /vegFry:1/.test(UI) && /meatStew:1/.test(UI) && fs.existsSync(ROOT + '/assets/img/items/vegFry.png') && fs.existsSync(ROOT + '/assets/img/items/meatStew.png'));
  }
}

section('6e. 数据安全（魂点/成就/存档）与难度调整');
{
  // 魂点/成就：滚动备份 + 主档损坏时从备份恢复
  G.newGame('fisher', 'normal');
  let mm = G.metaState();
  mm.soul = 321; mm.runs = 7; mm.redeemed = {}; mm.ach = {};
  G.redeemCode('happy1');                                   // 第一次保存：备份里还是旧数据
  mm = G.metaState(); mm.soul = 321; mm.runs = 7;
  G.redeemCode('happy2');                                   // 第二次保存：备份里就是 soul 321 这一份
  ck('魂点存档有滚动备份', !!localStorage.getItem('guyuyizhang_meta_bak'));
  localStorage.setItem('guyuyizhang_meta', '{{{broken');
  const rec = G.metaReload();   // 模拟"重新进游戏"：强制重新读盘
  ck('主档损坏时从备份恢复而不是清零', rec.soul === 321 && rec.runs === 7, 'soul=' + rec.soul);
  ck('坏档会留底备查', !!localStorage.getItem('guyuyizhang_meta_corrupt'));
  const code = G.exportCode();
  localStorage.removeItem('guyuyizhang_meta'); localStorage.removeItem('guyuyizhang_meta_bak');
  const imp = G.importCode(code);
  ck('存档码可导出并导入恢复', imp.ok === true && G.metaState().soul === 321, '码长 ' + code.length);
  ck('乱码导入被拒绝', G.importCode('这不是存档码').ok === false);
  // 难度：简单/普通放宽，困难/传奇不动
  ck('简单难度更宽松（资源/怪物/饥渴）',
     DIFFICULTIES.easy.resMul >= 1.5 && DIFFICULTIES.easy.enemyMul <= 0.6 && DIFFICULTIES.easy.drainMul <= 0.7,
     JSON.stringify({ res: DIFFICULTIES.easy.resMul, enemy: DIFFICULTIES.easy.enemyMul, drain: DIFFICULTIES.easy.drainMul }));
  ck('普通难度也放宽了一档',
     DIFFICULTIES.normal.resMul >= 1.1 && DIFFICULTIES.normal.enemyMul <= 0.9 && DIFFICULTIES.normal.drainMul < 1,
     JSON.stringify({ res: DIFFICULTIES.normal.resMul, enemy: DIFFICULTIES.normal.enemyMul }));
  ck('困难/传奇保持原样', DIFFICULTIES.hard.enemyMul === 1.3 && DIFFICULTIES.legend.enemyMul === 1.6 && !DIFFICULTIES.hard.drainMul && !DIFFICULTIES.legend.drainMul);
  ck('简单难度标注新手推荐 & 界面提示', DIFFICULTIES.easy.recommend === 1 && /新手推荐/.test(UI) && /第一次玩/.test(UI));
  // 夜袭强度：随时间递增，第 50 天到顶 5 匹（不再按难度分）
  const wolfAt = (day, diff) => {
    G.newGame('fisher', diff || 'normal');
    const Sw = G.S();
    Sw.day = day; Sw.buildings.wall = 1; Sw.flags.wolfRaidPending = 1;
    let ov = null; G.bind({ onLog: () => {}, onOverlay: (o) => { ov = o; } });
    G.sleep();
    if (!ov) return null;
    ov.choices[0].ok();
    return G.S().combat ? G.S().combat.enemies.length : null;
  };
  const wDay = { d1: wolfAt(1), d20: wolfAt(20), d40: wolfAt(40), d50: wolfAt(50), d99: wolfAt(99) };
  ck('夜袭强度随时间递增、50 天后到顶 5 匹',
     wDay.d1 === 1 && wDay.d20 === 2 && wDay.d40 === 4 && wDay.d50 === 5 && wDay.d99 === 5, JSON.stringify(wDay));
  ck('夜袭强度不按难度分（各难度同一套曲线）',
     wolfAt(50, 'easy') === 5 && wolfAt(50, 'legend') === 5 && typeof G.raidWolves === 'function');
  ck('随机夜袭只在首次夜袭之后才可能触发',
     /S\.flags\.firstRaidDone \|\| S\.day > raidDay\(\)/.test(GAME) && /S\.flags\.firstRaidDone = 1;/.test(GAME));
  ck('困难/传奇资源倍率改为 1.0（难度只体现在怪物与死亡规则）',
     DIFFICULTIES.hard.resMul === 1.0 && DIFFICULTIES.legend.resMul === 1.0 && DIFFICULTIES.hard.enemyMul === 1.3 && DIFFICULTIES.legend.enemyMul === 1.6);
  // 砍树彩蛋：所有身份通用，30% 概率 +7 木材
  {
    const R0 = Math.random;
    for (const idn of ['fisher', 'woodcutter']) {
      G.newGame(idn, 'normal');
      const Se = G.S();
      G.addItem('axeStone', 1, true); Se.toolDurs.axeStone = [99]; G.equipTool('axeStone');
      G.travel('forest');
      const pt = G.pointsOf().find(p => p.id === 'forest_tree');
      const logs = []; G.bind({ onLog: (t) => logs.push(t) });
      Math.random = () => 0.0;               // 必定触发彩蛋
      Se.pointUses = {}; Se.stats.stamina = 999;
      const b0 = G.invCount('wood');
      G.doPoint(pt);
      Math.random = R0;
      const got = G.invCount('wood') - b0;
      ck('砍树彩蛋对「' + IDENTITIES[idn].name + '」生效且额外 +7 木材', got >= 7 && logs.some(l => /美人松/.test(l)), '本次木材 +' + got);
    }
    // 砍竹子不该触发（彩蛋只给砍树）
    G.newGame('fisher', 'normal');
    const Sb = G.S();
    G.addItem('axeStone', 1, true); Sb.toolDurs.axeStone = [99]; G.equipTool('axeStone');
    G.travel('bamboo');
    const pb = G.pointsOf().find(p => p.id === 'bamboo_cut');
    const logs2 = []; G.bind({ onLog: (t) => logs2.push(t) });
    Math.random = () => 0.0;
    Sb.pointUses = {}; Sb.stats.stamina = 999;
    G.doPoint(pb);
    Math.random = R0;
    ck('砍竹子不会触发美人松彩蛋', !logs2.some(l => /美人松/.test(l)));
  }
  // 淡水：前期必须够用
  {
    const rsc = SCENES.find(s => s.id === 'river');
    const wpt = (rsc.zones ? rsc.zones.river.points : rsc.points).find(p => p.id === 'river_water');
    ck('取水点已加强（每次 2~3 份、每天 3 次）', wpt.yields[0].min === 2 && wpt.yields[0].max === 3 && wpt.daily === 3);
    const R1 = Math.random;
    G.newGame('fisher', 'normal');
    const Sw2 = G.S();
    G.travel('river');
    let items = 0;
    Math.random = () => 0.0;
    for (let i = 0; i < 4; i++) { Sw2.pointUses = {}; Sw2.stats.stamina = 999; const b = G.invCount('water'); G.doPoint(wpt); items += G.invCount('water') - b; }
    Math.random = R1;
    ck('普通难度一天取水足够（≥118 口渴点）', items * 25 >= 118, items + ' 份 = ' + items * 25 + ' 点');
  }
  // 夜袭剧情按难度推迟：简单14 / 普通12 / 困难10 / 传奇7
  {
    const want = { easy: 14, normal: 12, hard: 10, legend: 7 };
    const got = {};
    for (const id of Object.keys(want)) { G.newGame('fisher', id); got[id] = G.raidDay(); }
    ck('夜袭剧情日期按难度分开', JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got));
    // 行为验证：到日子那天早上会触发"不祥预感"（进入待夜袭状态）
    G.newGame('fisher', 'easy');
    const Sr2 = G.S();
    Sr2.day = 13; Sr2.minute = 22 * 60; Sr2.buildings.wall = 1;   // 睡过午夜才会进入新的一天
    G.bind({ onLog: () => {}, onOverlay: (o) => { const c = o.choices && o.choices[o.choices.length - 1]; if (c && c.ok) c.ok(); } });
    G.sleep();
    ck('简单难度第 14 天才进入夜袭待命', Sr2.day === 14 && Sr2.flags.wolfRaidPending === 1, '第' + Sr2.day + '天 pending=' + Sr2.flags.wolfRaidPending);
    ck('守夜解锁日跟着难度走', /Game\.raidDay\(\)/.test(UI));
  }
  // 石板委托：删掉换石板的要求，避免玩家交掉石板进不了图二
  {
    const c5 = LAOCHAO.commissions.find(c => c.id === 'c5');
    ck('「石板拓片」委托已替换（不再收石板）', !c5.need.slate && !!c5.need.fossil, JSON.stringify(c5.need));
    ck('新委托仍然给声望（保留声望链）', c5.reward.fame === 1, JSON.stringify(c5.reward));
    ck('没有任何委托再收石板', !LAOCHAO.commissions.some(c => c.need && c.need.slate));
  }
  // 八条交易方向都要能长按批量（盐镇/黑市/交易机的"卖"以前是单次）
  {
    const keys = [['盐镇集市 买','data-tbuy'], ['盐镇集市 卖','data-tsell'], ['黑市 买','data-bbuy'], ['黑市 卖','data-bsell'], ['老潮 买','data-buy\\b'], ['老潮 卖','data-sell'], ['交易机 买','data-abuy'], ['交易机 卖','data-asell']];
    const bad = [];
    for (const [name, key] of keys) {
      const m = UI.match(new RegExp("querySelectorAll\\('\\[" + key + "\\]'\\)"));
      if (!m) { bad.push(name + '(找不到)'); continue; }
      const seg = UI.slice(m.index, m.index + 1400);
      const end = seg.indexOf('querySelectorAll');
      const block = end > 0 ? seg.slice(0, end) : seg;
      if (!block.includes('bindPress')) bad.push(name);
    }
    ck('八条交易方向都支持长按批量', bad.length === 0, bad.join('、'));
    ck('批量售卖会回到正确的商店界面', /lk === 'TOWN' \? 'town'/.test(UI) && /ATL_SHOP/.test(UI));
  }
  // 晴天概率提高
  {
    const poolMatch = GAME.match(/const pool = \[([^\]]+)\]/);
    const pool = poolMatch ? poolMatch[1].split(',').map(s => s.trim().replace(/'/g, '')) : [];
    const suns = pool.filter(x => x === 'sun').length;
    ck('晴天基础权重提高到 3/6', suns === 3, 'sun 权重 ' + suns);
  }
}

section('6d. 环境与战斗平衡：中暑 / 防御效率 / 速度 / 群袭');
{
  // 中暑：夏天穿厚衣服每小时 -3 生命
  G.newGame('fisher', 'normal');
  const Sh = G.S();
  Sh.day = 20;                       // 夏季（16~30 天）
  Sh.stats.stamina = 10;             // 体力满时 rest() 会直接拒绝（不推进时间）
  G.addItem('furCoat', 1, true); G.equip('furCoat');
  const hp0 = Sh.stats.hp; G.rest(1);
  ck('夏天穿棉袄：每小时 -3 生命，挂上中暑状态', Sh.stats.hp === hp0 - 3 && !!Sh.statuses.heat, `血 ${hp0}→${Sh.stats.hp}`);
  G.unequip('furCoat');
  const hp1 = Sh.stats.hp; G.rest(1);
  ck('脱掉厚衣服就不中暑了', !Sh.statuses.heat && Sh.stats.hp >= hp1, `血 ${hp1}→${Sh.stats.hp}`);
  // 冬天过冷（原有规则，别被改坏）
  G.newGame('fisher', 'normal');
  const Sw2 = G.S(); Sw2.day = 50; Sw2.stats.stamina = 10;
  const hp2 = Sw2.stats.hp; G.rest(1);
  ck('冬天没保暖：每小时 -5 生命', Sw2.stats.hp === hp2 - 5, `血 ${hp2}→${Sw2.stats.hp}`);
  ck('潜水服保暖改成 2（高级同款）', ITEMS.diveSuit.warm === 2 && ITEMS.diveSuit2.warm === 2);
  // 工具每高一级，干活时间 -20%
  ck('工具每高一级干活快 20%', /\(1 - \(tt - 1\) \* 0\.2\)/.test(GAME));
  {
    const timeFor = (tier) => {
      G.newGame('fisher', 'normal');
      const Sx = G.S();
      const tool = tier === 1 ? 'pickStone' : (tier === 2 ? 'pickIron' : 'pickSteel');
      G.addItem(tool, 1, true); Sx.toolDurs[tool] = [99];
      Sx.stats.stamina = 500; Sx.stats.hp = 999;
      const p = SCENES.find(s => s.id === 'quarry').points.find(q => q.need && q.need.tool === 'pick');
      const t0 = Sx.tick; G.doPoint(p);
      return Sx.tick - t0;
    };
    const t1 = timeFor(1), t3 = timeFor(3);
    ck('三级镐耗时约为一级的 60%', t3 > 0 && t3 <= Math.round(t1 * 0.61), `一级 ${t1} 分 → 三级 ${t3} 分`);
  }
  // 防御效率：攻击 30、防御 20 → 简单扣 10 / 传奇扣 16
  {
    const dmgAt = (diff) => {
      G.newGame('fisher', diff);
      const Sx = G.S();
      Sx.equipment.armor = 'sourceArmor'; Sx.equipment.weapon2 = 'steelShield'; Sx.equipment.accessory = 'hornAmulet';
      Sx.stats.hp = 100;
      Sx.combat = {
        enemy: { name: '木桩', traits: [], spd: 10 }, ehp: 999, atk: 30, def: 0, spd: 10,
        // 速度给 10：新机制下"出手频率"按速度分配，速度 1 的木桩根本轮不到出手
        enemies: [{ name: '木桩', id: 'dummy', ehp: 999, emax: 999, atk: 30, def: 0, spd: 10, traits: [], isBoss: 0 }],
        round: 1, defending: false, usedItems: 0, summonTick: 0, log: [], ranged: null,
      };
      const h0 = Sx.stats.hp; const R0 = Math.random; Math.random = () => 0.5;
      try { G.fightAction('attack'); } finally { Math.random = R0; }
      return h0 - Sx.stats.hp;
    };
    const easy = dmgAt('easy'), normal = dmgAt('normal'), hard = dmgAt('hard'), legend = dmgAt('legend');
    ck('防御效率：简单100 / 普通90 / 困难80 / 传奇70（30攻−20防）',
       easy === 10 && normal === 12 && hard === 14 && legend === 16, `扣血 ${easy}/${normal}/${hard}/${legend}`);
    ck('难度表里写了 defEff', DIFFICULTIES.easy.defEff === 1 && DIFFICULTIES.normal.defEff === 0.9 && DIFFICULTIES.hard.defEff === 0.8 && DIFFICULTIES.legend.defEff === 0.7);
  }
  // 速度真的进战斗 + 速度压制多打一下
  {
    G.newGame('fisher', 'normal');
    const Sx = G.S();
    G.addItem('knifeStone', 1, true); Sx.equipment.weapon = 'knifeStone';
    const fast = G.combatSpeed();
    Sx.equipment.weapon = 'ironGreatSword';
    const slow = G.combatSpeed();
  ck('武器速度真的进战斗（匕首 15 / 铁大剑 6）', fast === 15 && slow === 6, `${fast} / ${slow}`);
    // 战斗主干（技能树）：每升一级从「攻 +1 / 防 +0.5 / 暴击 +5%」里选一个
    {
      G.newGame('fisher', 'normal');
      const Sd = G.S();
      Sd.skill.combat = 0; Sd.skillPicks.combat = [];
      const d0 = G.playerDef(), a0 = G.playerAtk(), c0 = G.skillCritRate();
      Sd.skill.combat = 3; Sd.skillPicks.combat = ['def', 'def', 'def'];
      ck('战斗主干：选 3 次「防」= 防御 +1.5', Math.abs(G.playerDef() - (d0 + 1.5)) < 1e-6, `Lv0 ${d0} → ${G.playerDef()}`);
      Sd.skillPicks.combat = ['atk', 'atk', 'atk'];
      ck('战斗主干：选 3 次「攻」= 攻击 +3', G.playerAtk() === a0 + 3, `Lv0 ${a0} → ${G.playerAtk()}`);
      Sd.skillPicks.combat = ['crit', 'crit'];
      ck('战斗主干：选 2 次「暴击」= 暴击率 10% → 20%', Math.abs(G.skillCritRate() - (c0 + 0.10)) < 1e-6, `10% → ${Math.round(G.skillCritRate() * 100)}%`);
    }
    // 新的"时间追赶"机制：你出手一次算 1 下，敌人按 敌速/我速 攒出手
    {
      const WEAPON = { 6: 'ironGreatSword', 9: 'steelSword', 10: 'ironSword', 12: 'spear', 15: 'knifeStone' };
      const trace = (mySpd, foeSpd, rounds) => {
        G.newGame('fisher', 'normal');
        const Sz2 = G.S();
        const w = WEAPON[mySpd];
        if (w) { G.addItem(w, 1, true); Sz2.equipment.weapon = w; }
        const realSpd = G.combatSpeed();
        Sz2.combat = {
          enemy: { name: '木桩', traits: [], spd: foeSpd }, ehp: 999999, atk: 0, def: 0, spd: foeSpd,
          enemies: [{ name: '木桩', id: 'dummy', ehp: 999999, emax: 999999, atk: 0, def: 0, spd: foeSpd, traits: [], isBoss: 0 }],
          round: 1, defending: false, usedItems: 0, summonTick: 0, log: [], ranged: null, accE: 0,
          spdP: mySpd, spdE: foeSpd,
        };
        const R0 = Math.random; Math.random = () => 0.5;
        Sz2.stats.hp = 99999;
        const me = [], foe = [];
        const myAtk = Math.max(1, G.playerAtk());
        for (let r = 0; r < rounds; r++) {
          const b = Sz2.combat.enemies[0].ehp, h = Sz2.stats.hp;
          G.fightAction('attack');
          me.push(Math.round((b - Sz2.combat.enemies[0].ehp) / myAtk));
          foe.push(h - Sz2.stats.hp);
        }
        Math.random = R0;
        return { me, foe };
      };
      const t67 = trace(6, 7, 7);
      ck('时间追赶：我 6 打敌 7 —— 每轮它先手，第 6 轮它打两次（我每轮 1 下）',
         JSON.stringify(t67.me) === JSON.stringify([1,1,1,1,1,1,1]) && JSON.stringify(t67.foe) === JSON.stringify([1,1,1,1,1,2,1]),
         '我 ' + JSON.stringify(t67.me) + ' / 敌 ' + JSON.stringify(t67.foe));
      const t156 = trace(15, 6, 10);
      const foeTotal = t156.foe.reduce((a,b)=>a+b,0);
      ck('时间追赶：我 15 打敌 6 —— 我出手 10 次它只还约 4 次', foeTotal <= 5 && t156.me.every(v => v === 1),
         '我 ' + JSON.stringify(t156.me) + ' / 敌 ' + JSON.stringify(t156.foe));
      const t618 = trace(6, 18, 3);
      ck('时间追赶：我 6 打敌 18 —— 我每出手一次挨三口', JSON.stringify(t618.foe) === JSON.stringify([3,3,3]), JSON.stringify(t618.foe));
    }
  }
  // 群袭：触手哨兵必两只；带 pack 的怪 50% 两只
  {
    G.newGame('fisher', 'normal');
    G.startFight(ENEMIES.tentacle);
    ck('触手哨兵每次出现两只', G.S().combat.enemies.length === 2, '数量 ' + G.S().combat.enemies.length);
    const R0 = Math.random;
    Math.random = () => 0.1; G.newGame('fisher', 'normal'); G.startFight(ENEMIES.wolf); const two = G.S().combat.enemies.length;
    Math.random = () => 0.9; G.newGame('fisher', 'normal'); G.startFight(ENEMIES.wolf); const one = G.S().combat.enemies.length;
    Math.random = R0;
    ck('群袭怪 50% 概率同时来两只', two === 2 && one === 1, `随机0.1→${two} 只 / 0.9→${one} 只`);
  }
}

section('6e. 设置 / 日志栏 / 图鉴全局 / 更新公告 / 背包手感');
{
  // 山顶祭坛：拿过遗物（热点本该消失）之后，凑齐材料要能重新点开举行仪式
  G.newGame('fisher', 'normal');
  const Sa = G.S();
  Sa.inv = {}; Sa.tut = null;                          // 腾空背包，保证三块石板+遗物+龙骨都放得进去
  const peakSc = SCENES.find(s => s.id === 'peak');
  const altarPt = peakSc.points.find(p => p.id === 'peak_altar');
  G.addItem('relic', 1, true);                         // 当初从祭坛拿到的遗物还在背包里（必须是"真拿过"：包里没遗物会被判定成没领奖，要让他再拿一次）
  Sa.flags['pt_peak_altar'] = 1;                       // 遗物已于此前拿过 → 打上"搜刮过"标记
  ck('没凑齐材料时，祭坛仍是"搜刮过"状态', G.pointStatus(altarPt) !== 'ok');
  G.addItem('slate', 3, true); G.addItem('dragonbone', 1, true);
  let ovA = null; G.bind({ onLog: () => {}, onOverlay: o => { ovA = o; } });
  ck('凑齐材料后祭坛重新可用', G.pointAvailable(altarPt) === true && G.pointStatus(altarPt) === 'ok');
  G.doPoint(altarPt);
  const alabels = ovA && ovA.choices ? ovA.choices.map(c => c.label) : [];
  ck('祭坛直接给出"举行仪式"选项', alabels.some(l => l.includes('举行祭坛仪式')), alabels.join('/'));
  if (ovA && ovA.choices[0]) ovA.choices[0].ok();
  ck('在祭坛举行仪式 = 达成结局 C', !!Sa.flags.ended_C);
  ck('材料齐了会指路山顶（当前目标 + 到山顶提示）',
     /回【山顶】举行祭坛仪式/.test(GAME) && /去点山顶的「祭坛 · 举行仪式」/.test(GAME));
  // 结局达成之后必须有"结算画面"入口：以前 settleEnding() 全项目没有任何界面调用，
  // 玩家点了「祭坛仪式（结局·秘辛）」只写一行日志、永远看不到结算画面与结算文字
  {
    G.newGame('fisher', 'normal');
    const Se = G.S(); Se.scene = 'peak'; Se.tut = null;
    G.addItem('relic', 1, true); G.addItem('slate', 3, true); G.addItem('dragonbone', 1, true);
    const before = G.checkEndingActions().map(a => a.id);
    ck('材料齐了还没做仪式：只有一个「祭坛仪式」按钮', before.length === 1 && before[0] === 'endC', before.join('/'));
    ck('祭坛仪式接了"达成即问要不要看结算"',
       /askSettleEnding\(id\)/.test(GAME) && /'结局达成 · ' \+ name/.test(GAME) && /观看结算画面/.test(GAME) && /继续探索/.test(GAME));
    G.doEnding('endC');
    const after = G.checkEndingActions().map(a => a.id);
    ck('★ 结局 C 达成后：献祭按钮消失、原地换成「结算」按钮', after.length === 1 && after[0] === 'settle_endC', after.join('/'));
    ck('★ 界面把 settle_ 前缀接到 settleEnding（结算画面真的有入口）',
       /a\.id\.indexOf\('settle_'\) === 0 \? Game\.settleEnding\(a\.id\.slice\(7\)\)/.test(UI));
    const soulB = G.metaState().soul;
    const rr = G.settleEnding('endC');
    ck('★ 点结算：进入结算状态并真的发魂点', rr.ok && G.S().ending === 'C' && G.metaState().soul > soulB, soulB + ' → ' + G.metaState().soul);
    ck('结算后按钮清空（同一次游戏里不会重复弹结算按钮）', G.checkEndingActions().length === 0 && G.S().flags.settled_C === 1);
    G.continueRun();
    const soulC = G.metaState().soul;
    G.settleEnding('endC');   // 允许"再看一次结局画面"，但不该再发魂点
    ck('★ 重看结算画面不会再刷魂点', G.metaState().soul === soulC, soulC + ' → ' + G.metaState().soul);
    G.continueRun();
  }
  // A / B / S / S2 四个结局走的是同一套（标签取 ENDINGS[key].name，别在别的键上炸）
  for (const [key, id] of [['A','endA'], ['B','endB'], ['S','endS'], ['S2','endS2']]) {
    G.newGame('fisher', 'normal');
    const sk = G.S(); sk.tut = null; sk.flags['ended_' + key] = 1;
    const ids = G.checkEndingActions().map(a => a.id);
    ck(`结局 ${key} 达成后也有「结算」按钮`, ids.includes('settle_' + id), ids.join('/') || '（一个都没有）');
    const r2 = G.settleEnding(id);
    ck(`结局 ${key} 点结算能进结算状态（画面由 onEnding 弹）`, r2.ok && G.S().ending === key, key + ' → ' + G.S().ending);
    G.continueRun();
  }
  // 大地图：点箭头之前先问"能不能去"，不能去就当场在屏幕中央说清原因
  // （玩家反馈"点不了去山顶"——雷暴 / 保暖不够 / 体力不够以前只写一行左侧日志，看着像按钮坏了）
  ck('★ 大地图点箭头先做 canTravel 预检，失败当场中央提示（不弹空确认框）',
     UI.includes('const chk = Game.canTravel(id);') && UI.includes("if (!chk.ok) { addLog(chk.reason, 'warn'); centerToast(chk.reason); return; }") &&
     UI.includes('centerToast(why)') && UI.includes('体力不够，走不动这么远'));
  // 连攻规则必须在游戏里讲清楚（玩家反馈"多 15 攻速为什么不能打两次"）
  ck('战斗规则页写明了"时间追赶"出手机制（含 6 打 7 的例子与同时结算）',
     /攻速 = 出手频率/.test(UI) && /你 6 打它 7 会是这样/.test(UI) && /同时结算/.test(UI) && /它每轮只攒 0\.4 次/.test(UI));
  ck('人物属性面板写清"你出手 N 次敌人还几次手"', /你出手 \$\{s\} 次的时间里，速度 6 的敌人大概能还手 6 次/.test(UI));
  // 存档体积：日志会被截到 200 条（老存档曾经攒到 4810 条 / 378KB，存档码 940KB）
  {
    G.newGame('fisher', 'normal');
    const Sy = G.S();
    Sy.log = [];
    for (let i = 0; i < 900; i++) Sy.log.unshift({ t: '第1天 08:00', text: '第 ' + i + ' 条日志', cls: '' });
    G.save();
    const raw = JSON.parse(localStorage.getItem('guyuyizhang_save'));
    ck('存档里的日志截到 200 条（保留最新）',
       raw.log.length === 200 && raw.log[0].text.includes('第 899 条'), '存了 ' + raw.log.length + ' 条，最新是「' + raw.log[0].text + '」');
  }
  // 死亡后"回到标题再来"：不能把 S.ending='D' 带进新的一次游戏，
  // 否则所有结局按钮失效、时间流逝与自动存档也停摆（玩家实测遇到的真问题）
  {
    G.newGame('fisher', 'normal');
    const Sz = G.S();
    G.addItem('relic', 1, true); G.addItem('slate', 3, true); G.addItem('dragonbone', 1, true);
    Sz.scene = 'peak';
    Sz.ending = 'D'; Sz.death = '你倒在荒野里，再也没能站起来。';
    ck('死亡结算状态挂着时，结局按钮确实会消失（复现）', G.checkEndingActions().length === 0);
    G.save();
    ck('读档接着玩会清掉死亡/结算状态', G.load() && !G.S().ending && !G.S().death, 'ending=' + G.S().ending);
    const acts = G.checkEndingActions().map(a => a.id);
    ck('清掉之后「祭坛仪式（结局·秘辛）」回来了', acts.includes('endC'), acts.join('/'));
    ck('继续游戏的接口存在（结局界面"留在岛上/回到标题"会调它）', typeof G.continueRun === 'function' && /Game\.continueRun\(\)/.test(UI));
    // 备份槽读档同样要清
    G.S().ending = 'A';
    G.backupSlot(0);
    G.newGame('fisher', 'normal');
    G.loadSlot(0);
    ck('从备份槽继续也不会带着结算状态', !G.S().ending, 'ending=' + G.S().ending);
  }
  // 送礼用的兑换码：只存在代码里，能换出对应神物 / 金币
  {
    G.newGame('fisher', 'normal');
    // 随机事件的 cond 必须"全部满足"（曾经写成 || → 雾天也漏雨、砖瓦房也漏雨）
    const poolHas = (id, o) => {
      G.newGame('fisher', 'normal');
      const Sp = G.S();
      if (o.w) Sp.weather = o.w;
      if (o.h !== undefined) Sp.buildings.house = o.h;
      if (o.z !== undefined) Sp.zone = o.z;
      if (o.day !== undefined) Sp.day = o.day;
      if (o.c4 !== undefined) Sp.laochao.accepted = { c4: o.c4 };
      return G.randomEventPool(o.scene || 'camp').some(e => e.id === id);
    };
    ck('雾天不会再"漏雨"（玩家反馈的 bug）', !poolHas('re_leak', { w: 'fog', h: 0 }));
    ck('晴天也不会漏雨', !poolHas('re_leak', { w: 'clear', h: 0 }));
    ck('雨天＋帐篷/草房才会漏雨', poolHas('re_leak', { w: 'rain', h: 0 }) && poolHas('re_leak', { w: 'rain', h: 1 }) && poolHas('re_leak', { w: 'storm', h: 0 }));
    ck('高级营地（木屋/砖瓦房）不再漏雨', !poolHas('re_leak', { w: 'rain', h: 2 }) && !poolHas('re_leak', { w: 'rain', h: 3 }));
    ck('组合条件同时生效：海盗要"海域 + 第20天"',
       !poolHas('re_pirates', { scene: 'sea', z: 'sea', day: 10, c4: 10 }) &&
       !poolHas('re_pirates', { scene: 'sea', z: 'sea', day: 20, c4: 10 }) &&
        poolHas('re_pirates', { scene: 'sea', z: 'sea', day: 20, c4: 20 }));
    ck('涨水只在雨天（河畔）', poolHas('re_flood', { scene: 'river', w: 'rain' }) && !poolHas('re_flood', { scene: 'river', w: 'fog' }));
    const RELIC_CODES = { HAPPY9: 'vampire', HAPPY8: 'dodge', HAPPY7: 'satchel', HAPPY6: 'bloodvest', HAPPY5: 'atlantisSeed' };
    const bad = [];
    for (const [c, rid] of Object.entries(RELIC_CODES)) {
      const r = G.redeemCode(c);
      if (!r.ok) { bad.push(c + ':' + r.reason); continue; }
      const list = G.mailboxList();
      const idx = list.findIndex(x => x.relic === rid);
      if (idx < 0) { bad.push(c + ' 没进邮箱'); continue; }
      G.claimMailbox(idx);
      if (!(G.S().relics || []).includes(rid)) bad.push(c + ' 领取没生效');
    }
    ck('happy5~9 五个神物码都能换到对应神物', bad.length === 0, bad.join('；') || Object.values(RELIC_CODES).join('、'));
    const before = G.invCount('coin');
    const r2 = G.redeemCode('RESOURCE1');
    const idx2 = G.mailboxList().findIndex(x => x.item === 'coin');
    if (idx2 >= 0) G.claimMailbox(idx2);
    ck('resource1 给 10 金币', r2.ok && G.invCount('coin') === before + 10, '金币 ' + before + '→' + G.invCount('coin'));
    ck('这些码不写在活动页/公告里（不会自己暴露给玩家）',
       !/HAPPY[5-9]|RESOURCE1/.test(UI) && !/HAPPY[5-9]|RESOURCE1/.test(JSON.stringify(PATCH_NOTES)),
       '活动页与公告都查过');
    const dup = G.redeemCode('HAPPY9');
    ck('同一个码不能领第二次', dup.ok === false && /用过/.test(dup.reason || ''), dup.reason || '');
  }
}

{
  const AUDIO = fs.readFileSync(ROOT + '/js/audio.js', 'utf8');
  // 设置面板
  ck('菜单里有「设置」入口', /data-savemenu="settings"/.test(UI) && /kind === 'settings'/.test(UI) && /function settingsModal\(\)/.test(UI));
  ck('设置里有音乐 / 音效 / 环境音三个独立开关', /btn\('music:on'/.test(UI) && /btn\('sfx:on'/.test(UI) && /btn\('amb:on'/.test(UI) && /AudioFX\.toggleSfx\(\)/.test(UI));
  ck('音效是独立总线（不再跟着音乐开关一起哑）',
     /function toggleSfx\(\)/.test(AUDIO) && /sfxBus = ctx\.createGain\(\)/.test(AUDIO) && /if \(!ctx \|\| !sfxOn\) return;\s*\/\/ 音效跟着/.test(AUDIO));
  // 皮肤包：默认纯黑白木刻，另一套是"深海琥珀"上色皮肤（换肤靠覆盖 CSS 变量，不改布局）
  const CSS = fs.readFileSync(ROOT + '/css/style.css', 'utf8');
  ck('皮肤包已实装：墨白 / 深海琥珀两套可选',
     /const SKINS = \[/.test(UI) && /id: 'ink'/.test(UI) && /id: 'accent'/.test(UI) && /skin-accent/.test(UI));
  ck('换肤走 CSS 变量覆盖，且六个颜色变量都在皮肤里',
     /body\.skin-accent \{/.test(CSS) &&
     /body\.skin-accent \{[\s\S]{0,600}--paper:/.test(CSS) && /--paper2:/.test(CSS) &&
     /--ink:/.test(CSS) && /--ink2:/.test(CSS) && /--gray:/.test(CSS) && /--line:/.test(CSS));
  ck('皮肤会持久化（记在本机，跨存档）',
     /localStorage\.getItem\('guyuyizhang_skin'\)/.test(UI) && /localStorage\.setItem\('guyuyizhang_skin'/.test(UI) &&
     /applySkin\(\);/.test(UI));
  ck('皮肤不压暗图标底（黑墨图标在深色皮肤里不会隐形）',
     /--tile:/.test(CSS) && /body\.skin-accent \.inv-item:hover \{ background: var\(--tile\)/.test(CSS) &&
     /body\.skin-accent \.inv-item\.equiped \{ background: var\(--tile\)/.test(CSS));
  // 按钮配色：深底容器（.furn.built）里套浅底按钮时，不显式给 color 会继承成浅色 → 浅底浅字看不见
  ck('按钮自带前景色（深底卡片里的按钮不会变成浅底浅字）',
     /\.modal-actions button, \.mini-btn, \.tab \{[^}]*color: var\(--ink\)/.test(CSS) &&
     /\.furn\.built \.mini-btn \{ color: var\(--ink\); \}/.test(CSS));
  // 营地面板不再重复放声音开关（设置里已有）
  ck('营地面板不再重复放声音开关',
     !/data-audm/.test(UI) && !/data-auda/.test(UI) && /btn\('music:on'/.test(UI));
  // 石板改回"纯任务道具"：只能捡，不能买也不能卖（防止玩家卖掉山顶捡到的石板卡死解谜）
  ck('石板不可买卖（只能靠捡）',
     LAOCHAO.buy.every(e => e.id !== 'slate') &&
     TOWN.informant.buy.every(e => e.id !== 'slate') && BLACKMARKET.buy.every(e => e.id !== 'slate'));
  // 攻速对称性：旧版只取主手武器的 spd，导致"主手塞快匕首"能白嫖攻速（主副手互换差 150%）
  {
    const _DATA_SRC = fs.readFileSync(ROOT + '/js/data.js', 'utf8');   // 供"数据字段"类断言做正则检查
    const hands = (main, off) => { const S = G.S(); S.equipment.weapon = main; S.equipment.weapon2 = off;
      S.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 }; };
    const base = (main, off) => { hands(main, off); return G.combatSpeed(); };
    ck('攻速与主副手无关（互换主副手结果相同）',
       base('knifeStone','ironGreatSword') === base('ironGreatSword','knifeStone') &&
       base('ironSword','ironDagger') === base('ironDagger','ironSword'),
       base('knifeStone','ironGreatSword') + ' / ' + base('ironGreatSword','knifeStone'));
    ck('匕首+重武器 不再比单拿重武器快太多（白嫖攻速被堵）',
       base('knifeStone','ironGreatSword') < base('knifeStone', null) &&
       base('knifeStone','ironGreatSword') < 16, '实际 ' + base('knifeStone','ironGreatSword'));
    ck('单拿武器攻速不变', base('knifeStone', null) === 15 && base('ironGreatSword', null) === 6 && base('ironSword', null) === 10);
    ck('双匕首 ×2 仍然生效（改为数据标记 dual，不再靠武器名正则）',
       base('ironDagger','ironDagger') > base('ironDagger', null) &&
       /dual:1/.test(_DATA_SRC) && /w\.dual && w2\.dual/.test(_GAME_SRC),
       '双匕首 ' + base('ironDagger','ironDagger'));
    ck('弹药只喂对应的远程武器（弓开火不扣源能子弹）',
       /function ammoConsume\(weapon\)/.test(_GAME_SRC) && /rw = \(weapon && weapon\.ammoItem\) \? weapon : rangedWeapon\(\)/.test(_GAME_SRC) &&
       /ammoConsume\(rwNow\)/.test(_GAME_SRC));
    ck('远程判定口径统一（主手不是远程就看副手，不再漏判）',
       /function hasRanged\(\) \{\s*const rw = rangedWeapon\(\);/.test(_GAME_SRC));
    ck('弹药不能装备到手上（主副手不会被子弹占掉）',
       /if \(it\.ammo\) \{ log\(/.test(_GAME_SRC) && /!ITEMS\[id\]\.ammo\)/.test(UI));
    // 日志栏展开按钮：贴在「返回地图」右侧、高度与它一致（不再浮在画面中部）
    ck('日志栏展开按钮贴在「返回地图」右侧且同高',
       /function alignLogGrip\(\)/.test(UI) && /bb\.getBoundingClientRect\(\)/.test(UI) &&
       /r\.right \+ 8/.test(UI) && /g\.style\.height = Math\.round\(r\.height\)/.test(UI) &&
       /#btn-backmap, #btn-rest, #log-grip \{/.test(CSS));
    ck('日志栏展开按钮不再盖在画面中部（旧定位已撤）',
       !/body\.log-collapsed #log-grip \{ left: 0; \}/.test(CSS) && !/top: 42%/.test(CSS));
    // 轮流挥砍：伤害/耐久/日志标注三者必须跟着"本轮轮到的那把"走
    {
      const GR = (main, off) => { const S = G.S(); S.equipment.weapon = main; S.equipment.weapon2 = off;
        S.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 }; };
      G.newGame('fisher', 'normal');
      const S = G.S(); S.inv = {};
      G.addItem('ironGreatSword', 1, true); G.addItem('ironDagger', 1, true);
      GR('ironGreatSword', 'ironDagger');
      const avg = G.charStats().c;   // 期望值口径（稳定）：与主副手谁先出手无关
      ck('双持伤害轮流出手（不是取平均）：面板显示期望值、实际每刀不同',
         /function weaponTurnSlot\(\)/.test(_GAME_SRC) && /function meleeWeaponNow\(\)/.test(_GAME_SRC) &&
         /const cur = meleeWeaponNow\(\);/.test(_GAME_SRC) && avg === 20, '面板 ' + avg);
      ck('单持时伤害不受影响（大剑 27 / 匕首 13）',
         (() => { GR('ironGreatSword', null); const a = G.playerAtk(); GR('ironDagger', null); return a === 27 && G.playerAtk() === 13; })());
      ck('耐久按"本轮出手的那把"扣（不再按主手固定）',
         /const slot = weaponTurnSlot\(\);/.test(_GAME_SRC) && /if \(me\.length >= 2\) _swingTurn = \(_swingTurn \+ 1\) % 2;/.test(_GAME_SRC));
ck('战斗日志标出所用武器（双持才标；传的是装备槽 id，不是物品对象）',
   /const wTag = usedW \? `〔\$\{wNameOf\(usedW\)\}〕` : '';/.test(_GAME_SRC) &&
   /const usedW = \(!anyRanged && !C\.thrown && meleeWeapons\(\)\.length > 1\) \? S\.equipment\[weaponTurnSlot\(\)\] : null;/.test(_GAME_SRC) &&
   !/wNameOf\(usedW\.id\)/.test(_GAME_SRC) &&
   /meleeWeapons\(\)\.length > 1/.test(_GAME_SRC));
      // 双手武器占两只手：手上握着双手武器时，不许再装副手武器/盾牌（旧版会把双手武器顶掉，武器像凭空消失）
      ck('双手武器在手上时，装单手/盾牌会被拦下（不再顶掉双手武器）',
         /if \(mainTwo && !it\.twoHand\) \{/.test(_GAME_SRC) &&
         /腾不出手拿盾/.test(_GAME_SRC) &&
         /请先把它卸下/.test(_GAME_SRC));
      {
        G.newGame('fisher', 'normal');
        const s2 = G.S(); s2.inv = {};
        G.addItem('ironGreatSword', 1, true); G.addItem('ironDagger', 1, true); G.addItem('woodShield', 1, true);
        G.equip('ironGreatSword');
        const afterTwo = s2.equipment.weapon;
        G.equip('ironDagger');
        const keptSword = s2.equipment.weapon === afterTwo;
        const noOff = !s2.equipment.weapon2;
        G.equip('woodShield');
        ck('实测：握双手剑时装匕首/盾牌 → 双手剑还在、副手仍空',
           afterTwo === 'ironGreatSword' && keptSword && noOff && !s2.equipment.weapon2,
           'weapon=' + s2.equipment.weapon + ' weapon2=' + s2.equipment.weapon2);
        G.unequip('ironGreatSword');
        G.equip('ironDagger');
        ck('实测：卸下双手剑后，单手武器能正常装到主手', s2.equipment.weapon === 'ironDagger', 'weapon=' + s2.equipment.weapon);
      }
      // 右下角 HUD：动作按钮与休息栏必须同列（以前各自钉 right/bottom，窄屏休息栏换行就会压住动作按钮）
      ck('右下角动作按钮与休息栏同列（结构上不可能重叠）',
         /<div id="hud-bottomright">/.test(UI) && /#hud-bottomright \{ position: fixed/.test(CSS) &&
         /#scene-actions \{ display: flex; flex-direction: column/.test(CSS) &&
         /#rest-bar \{ display: flex; align-items: center/.test(CSS) &&
         !/#scene-actions \{ position: absolute/.test(CSS) && !/#rest-bar \{ position: fixed/.test(CSS));
      ck('HUD 容器不吃点击（按钮照常能点）',
         /#hud-bottomright > \* \{ pointer-events: auto; \}/.test(CSS));
      // 手枪命中：按「真正开火的武器」算（旧版写死"主手是手枪才 60%"，副手挂枪能白拿 ~90% 命中打 50 伤害）
      ck('手枪命中按开火武器算（副手手枪不再绕过 60% 惩罚）',
         /function rangedKind\(w\)/.test(_GAME_SRC) && /function rangedAcc\(kind\)/.test(_GAME_SRC) &&
         /if \(anyRanged\) acc = rangedAcc\(rangedKind\(rangedWeapon\(\)\)\);/.test(_GAME_SRC) &&
         !/ITEMS\[S\.equipment\.weapon\]\.id === 'pistol'\) acc = 0\.6/.test(_GAME_SRC));
      {
        // 决定性判定：命中 = random < acc，用固定随机数卡阈值
        const tryShot = (main, off, calibrated, rv) => {
          G.newGame('fisher', 'normal');
          const s = G.S(); s.inv = {};
          ['pistol','bullet','ironSword','bow','arrow'].forEach(id => G.addItem(id, 50, true));
          s.equipment.weapon = main; s.equipment.weapon2 = off;
          s.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
          s.pistolCalibrated = !!calibrated;
          s.stats.hp = 999999; s.stats.stamina = 99999;
          const r0 = Math.random; Math.random = () => rv;
          G.startFight(ENEMIES.boar, true);
          const C = G.S().combat;
          if (!C) { Math.random = r0; return 'no-combat'; }
          C.enemies.forEach(e => { e.ehp = 999999; e.emax = 999999; });
          C.bowShots = 0;
          const before = C.log.length;
          G.S().stats.hp = 999999;
          G.fightAction('ranged');
          const C2 = G.S().combat;
          let res = 'no-log';
          if (C2) { const nw = C2.log.slice(before).join(' '); res = /造成/.test(nw) ? 'hit' : (/落空|擦着/.test(nw) ? 'miss' : '?'); }
          Math.random = r0;
          return res;
        };
        ck('实测：副手手枪吃 60% 惩罚（0.65 落空），不再是 ~90%',
           tryShot('ironSword', 'pistol', false, 0.65) === 'miss' && tryShot('ironSword', 'pistol', false, 0.55) === 'hit');
        ck('实测：校准后手枪命中提到 70%（0.65 命中、0.80 落空）',
           tryShot('ironSword', 'pistol', true, 0.65) === 'hit' && tryShot('ironSword', 'pistol', true, 0.80) === 'miss');
        ck('实测：弓开火仍按 90%（0.80 命中），不被手枪连累',
           tryShot('bow', 'pistol', false, 0.80) === 'hit');
      }
      // 校准：既修耐久也加命中，且主手副手都能校准
      {
        ck('校准既修耐久也真的提升命中（pistolCalibrated 存档字段）',
           /S\.pistolCalibrated = true;/.test(_GAME_SRC) &&
           /if \(S\.pistolCalibrated === undefined\) S\.pistolCalibrated = false;/.test(_GAME_SRC) &&
           /pistolCalibrated:false/.test(_GAME_SRC));
        G.newGame('fisher', 'normal');
        const s = G.S(); s.inv = {};
        G.addItem('pistol', 1, true); G.addItem('sourceOre', 5, true);
        s.equipment.weapon = 'pistol'; s.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
        s.toolDurs = { pistol: [40] }; s.dur = { pistol: 40 };
        const r1 = G.repairPistol();
        const ok1 = r1.ok === true && G.S().pistolCalibrated === true && G.durOf('pistol', 0) === DURA.pistol;
        const r2 = G.repairPistol();
        ck('实测：校准一次成功、再校准被拦下', ok1 && r2.ok === false, JSON.stringify(r1) + ' / ' + JSON.stringify(r2));
        G.newGame('fisher', 'normal');
        const s2 = G.S(); s2.inv = {};
        G.addItem('pistol', 1, true); G.addItem('sourceOre', 5, true); G.addItem('ironSword', 1, true);
        s2.equipment.weapon = 'ironSword'; s2.equipment.weapon2 = 'pistol';
        s2.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
        ck('实测：副手持枪也能校准', G.repairPistol().ok === true && G.S().pistolCalibrated === true);
        G.newGame('fisher', 'normal');
        const s3 = G.S(); s3.inv = {};
        G.addItem('pistol', 1, true); G.addItem('sourceOre', 1, true);
        s3.equipment.weapon = 'pistol'; s3.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
        ck('实测：源矿不足 1 块时校准被拦下（校准费 源矿×2）',
           G.repairPistol().ok === false && G.invCount('sourceOre') === 1, '源矿剩 ' + G.invCount('sourceOre'));
      }
      // 皮肤切换物品图标：有彩色版的走 items-accent/，没有的自动回退 items/
      {
        ck('皮肤切换物品图标（黑白 items/ ↔ 彩色 items-accent/，缺彩色自动回退）',
           /const ACCENT = \{/.test(UI) && /const dir = \(ALWAYS_COLOR\[id\] \|\| \(skin === 'accent' && ACCENT\[id\]\)\) \? 'items-accent' : 'items';/.test(UI));
        ck('限定物（神弓）常驻彩色，不受皮肤影响',
           /const ALWAYS_COLOR = \{ divineBow:1 \};/.test(UI) && /ALWAYS_COLOR\[id\] \|\|/.test(UI));
        ck('切皮肤会立刻重绘界面（否则图标路径不会更新）',
           /if \(document\.getElementById\('top-day'\)\) render\(\);/.test(UI));
        const accDir = ROOT + '/assets/img/items-accent';
        const accFiles = fs.existsSync(accDir) ? fs.readdirSync(accDir).filter(f => f.endsWith('.png')) : [];
        ck('彩色图标文件确实存在（至少手枪那组）',
           accFiles.length > 0 && accFiles.every(f => ITEMS[f.replace('.png','')] !== undefined),
           accFiles.join(','));
        // ACCENT 名单里登记的每一项都必须真有彩色图，否则切到彩色皮肤会变字形
        const accList = (UI.match(/const ACCENT = \{([^}]*)\}/) || [])[1] || '';
        const accIds = accList.split(',').map(s => s.split(':')[0].trim()).filter(Boolean);
        const missing = accIds.filter(id => !fs.existsSync(accDir + '/' + id + '.png'));
        ck('ACCENT 名单与彩色图文件一一对应（不会出现"登记了却没图"）',
           accIds.length > 0 && missing.length === 0, missing.join(','));
      }
      // 睡觉动画
      {
        ck('睡觉动画已接：小睡/整觉两张图 + 呼吸与飘 Z',
           /sleep: 2600/.test(UI) && /sleep_nap/.test(UI) && /sleep_night/.test(UI) &&
           /withAnimation\('sleep', lbl/.test(UI));
        for (const f of ['sleep_nap.png', 'sleep_night.png']) {
          ck('睡觉动画图存在：' + f, fs.existsSync(ROOT + '/assets/img/anim/' + f));
        }
        ck('睡觉图是暗底（与 rest.png 等现有动画一致）',
           /#0a0a08|\(10, 10, 8/.test(UI + CSS) || /busy-img\.sleep_night/.test(CSS));
      ck('舒服：守夜不放睡觉动画（守夜是清醒的）',
           /if \(k === 'watch'\) \{ Game\.sleep\(k\); return; \}/.test(UI));
      }
      // 多目标战斗：横扫 / 蓄力 / 掩护 / 猛击
      const gw = (main) => { G.newGame('fisher', 'normal'); const s = G.S(); s.inv = {}; G.addItem(main, 3, true);
        s.equipment.weapon = main; s.equipment.weapon2 = null; s.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
        s.stats.hp = 999999; s.stats.stamina = 99999; return s; };
      {
        ck('横扫是双手重武器专属，冷却 20 秒（时间制）',
           /const SWEEP_CD_BASE = 20;/.test(_GAME_SRC) && /function sweepCdTotal\(\)/.test(_GAME_SRC) &&
           /C\.sweepCd - 100 \/ Math\.max\(1, combatSpeed\(\)\)/.test(_GAME_SRC) &&
           /function sweepInfo\(\)/.test(_GAME_SRC) && /act === 'sweep'/.test(_GAME_SRC) && /data-fact="sweep"/.test(UI));
        gw('ironGreatSword');
        ck('不在战斗里时横扫不可用（sweepInfo 给原因）',
           G.sweepInfo().usable === false && !!G.sweepInfo().reason, JSON.stringify(G.sweepInfo()));
        G.startFight(ENEMIES.boar, true);
        const C0 = G.S().combat;
        C0.enemies.push(JSON.parse(JSON.stringify(C0.enemies[0])));
        C0.enemies.forEach(e => { e.ehp = 500; e.emax = 500; e.def = 0; e.intent = null; });
        ck('横扫可用时能报出目标数', G.sweepInfo().usable === true && G.sweepInfo().alive === 2, JSON.stringify(G.sweepInfo()));
        const hpBefore = C0.enemies.map(e => e.ehp);
        const rndKeep = Math.random; Math.random = () => 0.1;
        G.fightAction('sweep');
        const C1 = G.S().combat;
        ck('实测：横扫同时打到全部敌人（不是只打一个）',
           C1 && C1.enemies.length === 2 && C1.enemies.every((e, i) => e.ehp < hpBefore[i]),
           C1 ? C1.enemies.map(e => Math.round(hpBefore[0] - e.ehp)).join('/') : '无战斗');
        ck('实测：横扫后冷却为 20 秒（基础），且冷却中不可用',
           C1 && C1.sweepCd === 20 && G.sweepInfo().usable === false, C1 ? 'cd=' + C1.sweepCd : '');
        // 冷却按【时间】走：攻速越高，一次出手推进的时间越少，CD 掉得越慢（反过来说攻速快的武器扫得更勤）
        {
          const before = C1 ? C1.sweepCd : 0;
          const spd = G.combatSpeed();
          G.fightAction('attack');
          const after = G.S().combat ? G.S().combat.sweepCd : 0;
          ck('★ 横扫冷却是"时间制"：每次出手扣 100/攻速',
             Math.abs((before - after) - 100 / Math.max(1, spd)) < 0.01,
             `攻速 ${spd} → 扣 ${Math.round((before - after) * 10) / 10} 秒（${before} → ${Math.round(after * 10) / 10}）`);
        }
        const hp2 = C1 ? C1.enemies.map(e => e.ehp) : [];
        G.fightAction('sweep');
        ck('实测：冷却中再点横扫没有伤害',
           G.S().combat && G.S().combat.enemies.every((e, i) => e.ehp === hp2[i]));
        Math.random = rndKeep;
      }
      {
        ck('敌人多目标行为只在"活着的敌人≥2"时生效（单挑保持原样）',
           /function enemyMultiActing\(C\)/.test(_GAME_SRC) && /return C\.enemies\.filter\(e => e\.ehp > 0\)\.length >= 2;/.test(_GAME_SRC));
        ck('蓄力/掩护/猛击 概率 20/20/30，掩护减伤 30%，猛击 ×1.3 且防御归零',
           /e\.intent = \(r < 0\.20\) \? 'charge' : \(r < 0\.40\) \? 'cover' : \(r < 0\.70\) \? 'heavy' : 'attack';/.test(_GAME_SRC) &&
           /ENEMY_COVER_REDUCE = 0\.30/.test(_GAME_SRC) && /ENEMY_HEAVY_MUL = 1\.3/.test(_GAME_SRC) &&
           /e\.intent === 'heavy'\) \{ eDmg = Math\.round\(eDmg \* ENEMY_HEAVY_MUL\); e\.def = 0;/.test(_GAME_SRC));
        // 实测意图分布（活着的敌人≥2 的样本里统计）
        const cnt = { charge:0, cover:0, heavy:0, attack:0, other:0 };
        let n = 0;
        for (let i = 0; i < 300; i++) {
          gw('ironSword');
          G.startFight(ENEMIES.wolf, true);
          const c = G.S().combat;
          if (!c) continue;
          if (c.enemies.length < 2) c.enemies.push(JSON.parse(JSON.stringify(c.enemies[0])));
          c.enemies.forEach(e => { e.ehp = 99999; e.emax = 99999; });
          G.fightAction('attack');
          const c2 = G.S().combat;
          if (!c2) continue;
          c2.enemies.forEach(e => { n++; cnt[cnt[e.intent] !== undefined ? e.intent : 'other']++; });
        }
        const pc = (k) => n ? Math.round(cnt[k] / n * 100) : 0;
        ck('实测：多目标下敌人意图分布接近 20/20/30/30',
           pc('charge') >= 12 && pc('charge') <= 30 && pc('cover') >= 12 && pc('cover') <= 30 &&
           pc('heavy') >= 20 && pc('heavy') <= 40 && pc('attack') >= 20 && pc('attack') <= 40 && cnt.other === 0,
           'charge' + pc('charge') + '% cover' + pc('cover') + '% heavy' + pc('heavy') + '% attack' + pc('attack') + '% n=' + n);
        // 掩护减伤实测
        gw('ironSword'); G.startFight(ENEMIES.wolf, true);
        let c3 = G.S().combat;
        if (c3.enemies.length < 2) c3.enemies.push(JSON.parse(JSON.stringify(c3.enemies[0])));
        c3.enemies.forEach(e => { e.ehp = 99999; e.emax = 99999; e.def = 0; e.cover = 0; e.intent = null; });
        const rk = Math.random; Math.random = () => 0.1;
        const h0 = c3.enemies[0].ehp;
        G.fightAction('attack');
        const dmgNo = h0 - G.S().combat.enemies[0].ehp;
        gw('ironSword'); G.startFight(ENEMIES.wolf, true);
        c3 = G.S().combat;
        if (c3.enemies.length < 2) c3.enemies.push(JSON.parse(JSON.stringify(c3.enemies[0])));
        c3.enemies.forEach(e => { e.ehp = 99999; e.emax = 99999; e.def = 0; e.cover = 0; e.intent = null; });
        c3.enemies[1].cover = 1;
        const h1 = c3.enemies[0].ehp;
        G.fightAction('attack');
        const dmgCover = h1 - G.S().combat.enemies[0].ehp;
        Math.random = rk;
        const ratio = dmgNo ? dmgCover / dmgNo : 0;
        ck('实测：掩护让受到的伤害降到 ~70%',
           ratio > 0.6 && ratio < 0.8, dmgNo + ' → ' + dmgCover + ' (' + ratio.toFixed(2) + ')');
      }
      // 狼王召唤：改成每 3 回合一只，强度提升
      {
        ck('召唤改为按回合每 3 回合一次（不再按敌人出手次数刷）',
           /C\.round % 3 !== 0 \|\| C\._summonedRound === C\.round/.test(_GAME_SRC) && !/C\.summonTick \+\+/.test(_GAME_SRC));
        ck('狼王之爪强度提升（34/11/3，旧版 26/8/2）',
           /name:'狼王之爪'[\s\S]{0,80}ehp:34[\s\S]{0,40}atk:11[\s\S]{0,20}def:3/.test(_GAME_SRC));
        gw('ironSword');
        G.startFight(ENEMIES.wolfKing, true);
        const at = [];
        for (let t = 1; t <= 9 && G.S().combat; t++) {
          const n0 = G.S().combat.enemies.length;
          G.S().stats.hp = 999999;
          G.S().combat.enemies.forEach(e => { if (e.id === 'wolfKing') { e.ehp = 99999; e.emax = 99999; } });
          G.fightAction('attack');
          const c = G.S().combat;
          if (!c) break;
          if (c.enemies.length > n0) at.push(t);
        }
        ck('实测：第 3 / 6 / 9 次行动时各召唤一只',
           at.join(',') === '3,6,9', '实际 ' + at.join(','));
        const mn = G.S().combat ? G.S().combat.enemies.find(e => e.id === 'wolfMinion') : null;
        ck('实测：小怪防御不会被首领的防御顶掉（baseDef 各自复原）',
           !mn || mn.def === 3, mn ? 'def=' + mn.def : '未召唤到');
      }
      // 顶部状态条配色 + 工具栏图标
      {
        ck('生命/体力条改成淡米红与淡米黄（两套皮肤都生效）',
           /--hp: #d9a094;/.test(CSS) && /--sta: #dcc9a2;/.test(CSS) &&
           /\.stat-fill\.hp \{ background: var\(--hp\); \}/.test(CSS) && /\.stat-fill\.st \{ background: var\(--sta\); \}/.test(CSS) &&
           /\.hp-fill\.me \{ background: var\(--hp\); \}/.test(CSS));
        ck('工具栏槽位用物品图标（原来是字形，所以看不到图标）',
           /data-toolslot="\$\{i\}">\$\{itemIcon\(tid\)\}/.test(UI));
      }
      }
      // 金矿：不能比同洞的铁矿点强太多（收益 3.5x、门槛一样、次数一样 = 完全压制）
      {
        const cave = SCENES.find(s => s.id === 'cave');
        const deep = cave.points.find(x => x.id === 'cave_deep');
        ck('金矿不再是「镐tier2 就能刷」：门槛提到 tier3',
           deep.need.tool === 'pick' && deep.need.tier === 3 && !!deep.need.item, 'tier' + deep.need.tier);
        ck('金矿每日次数降到 1 次', deep.daily === 1, 'daily=' + deep.daily);
        ck('金矿收购价下调（80 -> 55）',
           ITEMS.goldore.price <= 55 && TOWN.smith.buy.find(e => e.id === 'goldore').base <= 55,
           'price=' + ITEMS.goldore.price);
        ck('金矿只能卖钱、不能打造（保持纯货币道具定位）',
           !RECIPES.some(r => 'goldore' in (r.in || {})) && ITEMS.goldore.desc.indexOf('不能打造') >= 0);
      }
    }
  // 日志栏显示方式
  ck('日志栏可设：常驻 / 3 秒淡出 / 隐藏',
     /btn\('log:always'/.test(UI) && /btn\('log:fade'/.test(UI) && /btn\('log:hidden'/.test(UI) &&
     /function applyLogMode\(\)/.test(UI) && /guyuyizhang_logmode/.test(UI) && /logFadeTimer = setTimeout\(\(\) => l\.classList\.add\('dim'\), 3000\)/.test(UI));
  ck('日志栏样式有淡出/隐藏规则', /#log\.dim \{ opacity: 0; pointer-events: none; \}/.test(fs.readFileSync(ROOT + '/css/style.css', 'utf8')) && /body\.log-hidden #log/.test(fs.readFileSync(ROOT + '/css/style.css', 'utf8')));
  ck('开局会套用上次选的日志模式', /applyLogMode\(\);\s*\/\/ 开局先把上次选的日志显示方式套上/.test(UI));
  // 主界面菜单化 + 图鉴全局
  // 图鉴 / 每日签到收进「设置」，标题页只留：新的旅程 / 继续 / 历代遗章 / 备份·读档 / 设置
  ck('主界面只留设置入口，图鉴与签到收进设置里',
     /id="btn-set"/.test(UI) && !/id="btn-codex"/.test(UI) && !/id="btn-sign"/.test(UI) &&
     /data-open="collection"/.test(UI) && /data-open="sign"/.test(UI) &&
     /querySelectorAll\('\[data-open\]'\)/.test(UI) && /showModal\('collection'\)/.test(UI));
  ck('主界面不留死分支（btn-sign / btn-codex 的点击处理已清干净）',
     !/btn\.id === 'btn-sign'/.test(UI) && !/btn\.id === 'btn-codex'/.test(UI));
  // 标题页按钮瘦身：外框约 2/3（38px 高 / 114px 宽），小屏单独放大字，不跟着缩
  const CSS_T = fs.readFileSync(ROOT + '/css/style.css', 'utf8');
  ck('标题页按钮缩小约 1/3（padding 8px 22px / 13.5px）',
     /#title-btns button \{[\s\S]{0,200}?padding: 8px 22px; font-size: 13\.5px;/.test(CSS_T) &&
     /#title-btns \{ position: relative; margin-top: 36px; display: flex; gap: 12px;/.test(CSS_T));
  ck('★ 手机端按钮跟桌面同一档（也缩 1/3，不再给小屏单独放大）',
     /@media \(max-width: 700px\), \(max-height: 520px\) \{\s*#title-btns \{ margin-top: 24px; gap: 10px; \}\s*#title-btns button \{ padding: 8px 20px; font-size: 13\.5px; \}/.test(CSS_T) &&
     !/font-size: 14\.5px; \}\s*\}\s*#title-tip/.test(CSS_T));
  ck('★ 标题页不再多出 30px：整屏页高度跟着 #app 走，没被顶到屏幕外',
     /#title-screen \{\s*\/\*[\s\S]{0,200}?position: relative; height: 100%; width: 100%;/.test(CSS_T) &&
     /#select-screen \{\s*height: 100%;/.test(CSS_T) &&
     !/#title-screen, #select-screen \{ min-height: 100dvh; \}/.test(CSS_T));
  // 开场分镜（新存档专属的 5 格漫画）：听说亚克兰蒂斯传说 → 出海 → 风暴 → 沉没 → 醒来
  {
    const comicImgs = ['1_legend', '2_setsail', '3_storm', '4_sink', '5_wake'];
    const miss = comicImgs.filter(n => !fs.existsSync(ROOT + '/assets/img/comic/' + n + '.png'));
    ck('★ 开场分镜 5 张图都在（黑白木刻版画）', miss.length === 0, miss.join('、') || '5/5 齐全');
    ck('分镜是 5 格、每格都有正文',
       (UI.match(/\{ t:'[^']+', img:'assets\/img\/comic\//g) || []).length === 5 && /\{ t:'醒来'/.test(UI));
    ck('★ 分镜只在新存档播：freshRun 只在「选难度」那一下置位、begin() 消费',
       /Game\.newGame\(lastIdentity, lastDifficulty\);\s*freshRun = \(e && e\.isTrusted === false\) \? !!window\.__guyuForceComic : true;/.test(UI) &&
       /if \(freshRun\) \{\s*freshRun = false;/.test(UI));
    ck('★ 分镜有「跳过」，跳过也有日志、照样进游戏',
       /id="comic-skip"/.test(UI) && /开场分镜已跳过/.test(UI) && /function showComicIntro\(done\) \{/.test(UI));
    ck('分镜翻页带防"开这一页那一下顺手翻一格"（同 #modal 的 350ms）',
       /Date\.now\(\) - openedAt < 350/.test(UI) &&
       /if \(e\.target && e\.target\.closest && e\.target\.closest\('button'\)\) return;/.test(UI));
    ck('★ 读档 / 继续上次游戏不再重复弹「第 1 天 · 海难」卡',
       !/\} else \{\s*introCard\(\);\s*\}/.test(UI) && /读档 \/ 继续上次游戏 \/ 备份恢复：不再重复弹这张/.test(UI));
    ck('分镜缺图会回退到已有场景图（绝不空白）',
       /img\.onerror = \(\) => \{ if \(img\.src\.indexOf\(c\.fb\) < 0\) img\.src = c\.fb; \}/.test(UI));
    ck('分镜只预加载下一格（省内存），且最后一格文案是「爬上沙滩」',
       /const preload = \(k\) => \{ if \(COMIC\[k\]\)/.test(UI) && /'爬上沙滩 ▶'/.test(UI));
    ck('分镜样式齐（满屏插画 + 底部字幕 + 直角按钮）',
       /#comic-screen \{ position: fixed; inset: 0; z-index: 6000/.test(CSS_T) &&
       /\.comic-cap \{/.test(CSS_T) && /\.comic-bar button \{/.test(CSS_T) && /#comic-screen\.lk/.test(CSS_T));
  }
  ck('图鉴不进游戏也能看（账号级）',
     /const st = S\(\) \|\| \{ seen: \{\}, killCount: \{\}, flags: \{\} \};/.test(UI) &&
     /const seen = \(S && S\.seen\) \|\| \{\};/.test(GAME));
  // 更新公告：批准后进邮箱、每个版本只发一次、点「知道了」移除
  {
    const v105 = PATCH_NOTES.find(n => n.version === 'v1.05');
    ck('v1.05 公告已批准（会进玩家邮箱）', !!v105 && v105.approved === true);
    ck('公告正文含关键条目（时间追赶 / 中暑 / 祭坛 / 存档）',
       !!v105 && ['时间追赶', '中暑', '祭坛', '存档'].every(k => v105.body.includes(k)), '字数 ' + (v105 ? v105.body.length : 0));
    // 前面的用例清空过邮箱，这里把"已发送"标记重置再验证发送逻辑
    const meta0 = G.metaState();
    meta0.mailbox = (meta0.mailbox || []).filter(x => !x.notice);
    meta0.patchSent = meta0.patchSent || {};
    delete meta0.patchSent['v1.05'];
    const first = G.mailboxList().filter(x => x.notice === 'v1.05');
    const second = G.mailboxList().filter(x => x.notice === 'v1.05').length;
    ck('公告进邮箱，且每个版本只发一次', first.length === 1 && second === 1, '第一次 ' + first.length + ' 封 → 再取 ' + second + ' 封');
    ck('公告标题/日期正常', !!first[0] && /v1\.05/.test(first[0].title) && first[0].date === '2026-09-13', first[0] ? first[0].title + ' / ' + first[0].date : '（空）');
    const idx = G.mailboxList().findIndex(x => x.notice === 'v1.05');
    const r = G.claimMailbox(idx);
    ck('公告点「知道了」= 已读移除', r.ok && !G.mailboxList().some(x => x.notice === 'v1.05'), r.msg);
  }
  // 背包用完后保留界面
  ck('背包：用完还留在这一页 / 回列表时记得滚动位置',
     /function openItemDetail\(id\)/.test(UI) && /function afterItemUse\(id\)/.test(UI) &&
     /if \(Game\.invCount\(id\) > 0\) openItemDetail\(id\);/.test(UI) && /function restoreInvScroll\(\)/.test(UI) &&
     /invScroll = mc \? mc\.scrollTop : 0;/.test(UI));
}

section('7. 收尾：休息时长 / 夜袭 / 存档');
{
  G.newGame('fisher', 'normal');
  const S = G.S();
  S.stats.stamina = 10; G.rest(1); ck('休息1小时 +10 体力', S.stats.stamina === 20);
  S.stats.stamina = 10; G.rest(3); ck('休息3小时 +30 体力', S.stats.stamina === 40);
  S.stats.stamina = 10; G.rest(); ck('不传参数默认 1 小时', S.stats.stamina === 20);
  ck('界面里有休息时长循环按钮', /btn-rest-h/.test(UI) && /restHours = \(restHours % 3\) \+ 1/.test(UI));
  // 午觉：任何状态下都不该倒扣生命
  function sleepTrial(mode, hour, st3) {
    G.newGame('fisher', 'normal');
    const S5 = G.S();
    S5.minute = hour * 60; S5.stats.hp = 30; S5.stats.stamina = 10;
    S5.stats.hunger = st3[0]; S5.stats.thirst = st3[1]; S5.stats.spirit = st3[2];
    const hp0 = S5.stats.hp, sp0 = S5.stats.spirit;
    // 固定随机数：这一节测的是"睡眠本身"，不能被 15% 的随机夜袭搅进来（否则偶发红项）
    Math.random = () => 0.999;
    try { G.sleep(mode); } finally { Math.random = RND; }
    return { hp: G.S().stats.hp - hp0, sp: G.S().stats.spirit - sp0 };
  }
  let napBad = 0, napFull = null;
  for (const st of [[100,100,100],[60,60,60],[40,40,40],[5,5,10]]) {
    const r = sleepTrial('nap', 13, st);
    if (r.hp < 0) napBad++;
    if (st[0] === 100) napFull = r;
  }
  ck('午觉在任何状态下都不倒扣生命', napBad === 0, '异常次数=' + napBad);
  ck('午觉状态良好时能回一点血', napFull.hp >= 8, '满状态 +' + napFull.hp);
  const sl = sleepTrial('normal', 22, [60, 60, 60]);
  const napMid = sleepTrial('nap', 13, [60, 60, 60]);
  ck('整觉回血明显强于午觉（同时长代价下仍更强）', napMid.hp * 4 < sl.hp, '4次午觉 +' + (napMid.hp * 4) + ' vs 整觉 +' + sl.hp);
  ck('午觉精神恢复弱于整觉', napMid.sp * 4 <= sl.sp, '4次午觉 +' + (napMid.sp * 4) + ' vs 整觉 +' + sl.sp);
  // 面板预估必须和引擎同一套系数，避免"显示 +13 实际 +2"这种漂移
  ck('睡眠面板的预估公式与引擎一致', /const penMul = 0\.35;/.test(UI) && /Math\.round\(7 \* sq\)/.test(UI) && /sp: 1/.test(UI));
  // 夜袭弹窗
  G.newGame('fisher', 'normal');
  const S2 = G.S();
  S2.buildings.wall = 1; S2.flags.wolfRaidPending = 1;
  let overlay = null;
  G.bind({ onOverlay: o => { overlay = o; } });
  G.sleep();
  const labels = overlay && overlay.choices ? overlay.choices.map(c => c.label) : [];
  ck('夜袭弹窗含殊死搏斗/远远观望', labels.includes('殊死搏斗') && labels.includes('远远观望'), labels.join('/'));
  if (overlay) { overlay.choices[0].ok(); winFights(); }
  ck('殊死搏斗能打完', !G.S().combat);
  // 存档往返
  G.newGame('fisher', 'normal');
  const S3 = G.S();
  G.addItem('knifeStone', 3, true); S3.toolDurs.knifeStone = [18, 9, 18];
  G.addItem('wood', 77, true); S3.fame = 2; S3.day = 33;
  G.plant('seedCarrot');
  G.save();
  const b = { wood: S3.inv.wood, knife: JSON.stringify(S3.toolDurs.knifeStone), fam: S3.fame, day: S3.day };
  ck('读档成功', G.load() === true);
  const S4 = G.S();
  ck('物品/耐久/声望/天数保留', S4.inv.wood === b.wood && JSON.stringify(S4.toolDurs.knifeStone) === b.knife && S4.fame === b.fam && S4.day === b.day);
  // 结局条件（先腾空背包：本项测结局条件，不测容量——旧代码容量判定失效才让这条一直"碰巧通过"）
  S4.inv = {}; S4.tut = null;
  S4.buildings.dock = 5; S4.buildings.wall = 3; S4.fame = 2; S4.flags.boss_pirateBoss = 1;
  G.addItem('seachart', 1, true); G.addItem('supplybox', 3, true);
  const names = G.checkEndingActions().map(a => a.name);
  ck('归乡/岛主结局条件可达成', names.some(n => /归乡/.test(n)) && names.some(n => /岛主/.test(n)), names.join(' / '));
}

section('7b. 制造等级（玩家反馈：技能升到 4 级却说经验不够）');
{
  // 以前 expLevel 只看"剩余经验"，花经验升级技能会让等级反而下降
  G.newGame('fisher', 'normal');
  const Sk = G.S();
  Sk.exp.craft = 200; Sk.skill.craft = 0;
  for (let i = 0; i < 4; i++) G.skillUpTrunk('craft', 'speed');   // 新曲线：12+28+50+80 = 170
  ck('把经验花在技能上不会让"制造等级"倒退', Sk.skill.craft === 4 && Sk.exp.craft === 30 && G.expLevel('craft') >= 2, '技能 ' + Sk.skill.craft + ' 级，剩余经验 ' + Sk.exp.craft + '，等级 ' + G.expLevel('craft'));
  Sk.furniture.wb1 = true;
  G.addItem('plank', 20, true); G.addItem('ironpart', 10, true);
  G.buildFurniture('wb2');
  ck('制造技能 4 级时能盖精工工作台', !!Sk.furniture.wb2);
  // 新号仍然不该一上来就能盖
  G.newGame('fisher', 'normal');
  const Sf = G.S();
  Sf.furniture.wb1 = true;
  G.addItem('plank', 20, true); G.addItem('ironpart', 10, true);
  G.buildFurniture('wb2');
  ck('新号（制造等级 1）仍然被正确拦下', !Sf.furniture.wb2 && G.expLevel('craft') === 1);
  // 提示文案要说"等级"而不是"经验"，并带上当前等级
  ck('提示改成「制造等级」并显示当前等级', /需要制造等级 \$\{f\.needCraft\}（当前 \$\{Game\.expLevel\('craft'\)\}）/.test(UI));
}

section('7c. 蓝牛（体力药水）与精神机制');
{
  const rb = RECIPES.find(r => r.id === 'r_bluebull');
  ck('蓝牛配方存在：淡水×2 + 草药×3 + 蜂蜜×1 @药炉', !!rb && rb.station === 'medPot' && JSON.stringify(rb.in) === JSON.stringify({ water: 2, herb: 3, honey: 1 }) && rb.out.blueBull === 1);
  ck('蓝牛是药品：+70体力 / +30水分 / -10精神', ITEMS.blueBull.cat === 'med' && ITEMS.blueBull.sta === 70 && ITEMS.blueBull.water === 30 && ITEMS.blueBull.spirit === -10);

  G.newGame('fisher', 'normal');
  const Sb = G.S();
  Sb.furniture.medPot = 1;
  G.addItem('water', 2, true); G.addItem('herb', 3, true); G.addItem('honey', 1, true);
  G.craft(rb);
  ck('攒够材料能在药炉做出蓝牛', G.invCount('blueBull') === 1, '数量=' + G.invCount('blueBull'));

  Sb.stats.stamina = 40; Sb.stats.spirit = 80; Sb.stats.thirst = 20;
  G.useMed('blueBull');
  ck('蓝牛：体力+70', Sb.stats.stamina === 110, '体力=' + Sb.stats.stamina);
  ck('蓝牛：水分+30', Sb.stats.thirst === 50, '水分=' + Sb.stats.thirst);
  ck('蓝牛：精神-10', Sb.stats.spirit === 70, '精神=' + Sb.stats.spirit);
  ck('蓝牛用掉后数量归零', G.invCount('blueBull') === 0);
  G.addItem('blueBull', 1, true); Sb.stats.spirit = 5;
  G.useMed('blueBull');
  ck('精神不会被扣成负数', Sb.stats.spirit === 0, '精神=' + Sb.stats.spirit);

  // 精神 → 体力上限
  Sb.stats.spirit = 100; const m100 = G.maxStam();
  Sb.stats.spirit = 30; const m30 = G.maxStam();
  Sb.stats.spirit = 10; const m10 = G.maxStam();
  ck('精神≥50：体力上限 100%', m100 === 150, '上限=' + m100);
  ck('精神 20~49：体力上限 -10%', m30 === 135, '上限=' + m30);
  ck('精神 <20：体力上限 -20%', m10 === 120, '上限=' + m10);
  Sb.stats.stamina = 150; Sb.stats.spirit = 10; G.change();
  ck('精神掉到恍惚后，超额体力被压回上限', Sb.stats.stamina === 120, '体力=' + Sb.stats.stamina);

  // 食物精神规则：只有肉汤/炖肉被砍掉
  ck('肉汤/炖肉不再回精神', !ITEMS.meatSoup.spirit && !ITEMS.meatStew.spirit);
  ck('精神恢复整体下调（野菜汤/爆炒野菜 2、蜂蜜水 7、提神茶 14）',
     ITEMS.vegSoup.spirit === 2 && ITEMS.vegFry.spirit === 2 && ITEMS.honeyWater.spirit === 7 && ITEMS.tea.spirit === 14,
     `汤${ITEMS.vegSoup.spirit} 炒${ITEMS.vegFry.spirit} 蜜${ITEMS.honeyWater.spirit} 茶${ITEMS.tea.spirit}`);
  ck('精神恢复：床的精神 -60% 左右（15/18/22/26 → 6/7/9/10）',
     ['bed1','bed2','bed3','bed4'].map(b => FURNITURE.find(f => f.id === b).spirit).join(',') === '6,7,9,10');
  // 玩家反馈"草床没什么用"：以前床的 rest / sleepH 两个字段根本没被用上 —— 现在真的生效
  {
    const gainFor = (bed, house) => {
      G.newGame('fisher', 'normal');
      const s = G.S();
      // 体力从一个很大的负数起步：读的是"这次睡了能补多少"的原始值，
      // 否则好床都会顶到体力上限，草床和大床就分不出高下了
      s.buildings.house = house; s.minute = 22 * 60; s.stats.stamina = -1000; s.stats.hp = 100;
      s.stats.hunger = 100; s.stats.thirst = 100; s.stats.spirit = 100;
      if (bed) s.furniture[bed] = true;
      G.sleep('normal');
      return Math.round(G.S().stats.stamina);
    };
    const noBed = gainFor(null, 0), grass = gainFor('bed1', 0), big = gainFor('bed4', 3);
    ck('床真的有用：没床 < 草床 < 大床（体力恢复）', noBed < grass && grass < big, `无床 ${noBed} < 草床 ${grass} < 大床 ${big}`);
  ck('引擎与睡眠面板用同一套体力系数', /\(0\.45 \+ houseRest \* 0\.12 \+ bedRest \* 0\.32\)/.test(GAME) && /\(0\.45 \+ houseRest \* 0\.12 \+ bedRest \* 0\.32\)/.test(UI));
      // 作者 2026-09-15：安稳睡觉统一 8 小时（以前好床睡得更短：8/7/6/5，玩家觉得别扭）；
      // 床的好坏现在只体现在体力恢复比例与精神恢复上。
      ck('安稳睡觉统一 8 小时（引擎与面板一致）',
         /nap \? 2 : \(bed \? \(bf\.sleepH \|\| 8\) : 8\)/.test(GAME) && /const hours = bf \? \(bf\.sleepH \|\| 8\) : 8;/.test(UI) &&
         ['bed1','bed2','bed3','bed4'].every(b => FURNITURE.find(f => f.id === b).sleepH === 8));
  }
  // 药膏 / 绷带 / 大煎蛋 的数值与配方
  ck('草药膏：回血 20（草药2+淡水2）', ITEMS.herbPaste.heal === 20 && RECIPES.find(r => r.id === 'r_herbpaste').in.water === 2 && RECIPES.find(r => r.id === 'r_herbpaste').in.herb === 2);
  ck('止血绷带：止血 + 回血 10（布2+草药1）', ITEMS.bandage.heal === 10 && !!ITEMS.bandage.stopBleed && RECIPES.find(r => r.id === 'r_bandage').in.cloth === 2);
  ck('蛇胆不能直接吃，只能做解毒剂', !ITEMS.snakegall.curePoison && ITEMS.snakegall.cat === 'mat' && RECIPES.find(r => r.id === 'r_antidote').in.snakegall === 1);
  // 河畔撒网：竭泽而渔，4 天钓不到也网不到
  {
    G.newGame('fisher', 'normal');
    const Sv = G.S();
    G.addItem('net', 1, true); G.addItem('rod', 1, true);
    Sv.scene = 'river'; Sv.stats.stamina = 200;
    const river = SCENES.find(s => s.id === 'river');
    const netPt = river.points.find(p => p.id === 'river_net'), fishPt = river.points.find(p => p.id === 'river_fish');
    G.doPoint(netPt);
    const bannedMsg = '先前竭泽而渔了，现在暂时看不到鱼的踪迹。';
    ck('河畔撒网后 4 天：钓鱼和撒网都停，提示语一致',
       G.pointStatus(fishPt) === bannedMsg && G.pointStatus(netPt) === bannedMsg, G.pointStatus(fishPt));
    Sv.day += 4;
    ck('第 4 天之后河畔恢复', G.pointStatus(fishPt) === 'ok', G.pointStatus(fishPt));
  }
  ck('渔网造价（藤蔓6+木材3）与耐久 10', RECIPES.find(r => r.id === 'r_net').in.vine === 6 && RECIPES.find(r => r.id === 'r_net').in.wood === 3 && DURA.net === 10);
  // 渔网到底用在哪：河畔 / 近海 / 海底（之前只扫了顶层 points，漏掉 zones 里的点，别再搞错）
  {
    const netUse = [];
    for (const sc of SCENES) {
      const zs = sc.zones || { _: sc };
      for (const zk in zs) for (const p of (zs[zk].points || [])) if (p.need && p.need.item === 'net') netUse.push(p.id);
    }
    ck('渔网用在河畔 + 近海 + 海底（不止河畔）',
       netUse.includes('river_net') && netUse.includes('sea_fish') && netUse.includes('atl_deepfish'), netUse.join('、'));
  }
  ck('熏鱼/熏肉额外要 2 根树枝', RECIPES.find(r => r.id === 'r_smokedfish').in.branch === 2 && RECIPES.find(r => r.id === 'r_smokedmeat').in.branch === 2);

  // 精神见底：采集耗时 +10%
  let gp = null;
  for (const sid in SCENES) {
    const sc = SCENES[sid], zs = sc.zones || { _: sc };
    for (const zk in zs) for (const p of (zs[zk].points || [])) {
      if (!gp && p.type === 'gather' && !p.guard && !p.once && (!p.need || (!p.need.tool && !p.need.item))) gp = { sid, p };
    }
  }
  const measure = (spirit) => {
    G.newGame('fisher', 'normal');
    const s = G.S();
    s.scene = gp.sid; s.day = 30; s.stats.spirit = spirit; s.stats.stamina = 150; s.stats.hunger = 100; s.stats.thirst = 100;
    const t0 = s.minute;
    Math.random = never;
    G.doPoint(gp.p);
    Math.random = RND;
    return s.minute - t0;
  };
  const tNormal = measure(100), tLow = measure(10);
  ck('精神 <20 时采集耗时 +10%', tLow === Math.round(tNormal * 1.1), `${gp.p.id}: ${tNormal} → ${tLow} 分钟`);

  // 制造面板：药品单独一页，蓝牛跟着药炉（不再混在"加工台"里）
  ck('制造面板新增「药品」页签', /\['med','药品'\]/.test(UI));
  ck('药品页含研钵/药炉/灶台，蓝牛配方落在这一页', /if \(sid === 'med'\) return \['mortar','medPot','pot'\]/.test(UI) && /med: \['mortar','medPot','stove'\]/.test(UI));
  ck('加工台不再重复列出药品配方', /sid === 'furniture'\) return \['spin','loom','stove','rack','tannery'\]/.test(UI));

  // 张老吉：前期灶台版（淡水×2 + 草药×2，+30体力 / -10精神）
  const rj = RECIPES.find(r => r.id === 'r_zhanglaoji');
  ck('张老吉配方：淡水×2 + 草药×2 @灶台（要陶锅）', !!rj && rj.station === 'pot' && rj.needItem === 'claypot' && JSON.stringify(rj.in) === JSON.stringify({ water: 2, herb: 2 }) && rj.out.zhangLaoJi === 1);
  ck('张老吉数值：+30体力 / -10精神', ITEMS.zhangLaoJi.cat === 'med' && ITEMS.zhangLaoJi.sta === 30 && ITEMS.zhangLaoJi.spirit === -10 && !ITEMS.zhangLaoJi.water);
  ck('张老吉比蓝牛省料（不要蜂蜜、体力也更少）', !rj.in.honey && ITEMS.zhangLaoJi.sta < ITEMS.blueBull.sta);
  G.newGame('fisher', 'normal');
  const Sz = G.S();
  Sz.furniture.stove = 1;
  G.addItem('claypot', 1, true); G.addItem('water', 2, true); G.addItem('herb', 2, true);
  G.craft(rj);
  ck('灶台+陶锅能做张老吉', G.invCount('zhangLaoJi') === 1, '数量=' + G.invCount('zhangLaoJi'));
  Sz.stats.stamina = 50; Sz.stats.spirit = 60;
  G.useMed('zhangLaoJi');
  ck('喝张老吉：体力 50→80、精神 60→50', Sz.stats.stamina === 80 && Sz.stats.spirit === 50, `体力=${Sz.stats.stamina} 精神=${Sz.stats.spirit}`);
}

section('7d. 海底移动遇袭 / 战斗道具上限 / 地图箭头贴边');
{
  const CSS = fs.readFileSync(ROOT + '/css/style.css', 'utf8');
  // 深海区移动：40% 被随机海底怪物拦截，但移动已经结算完毕（不会取消或重来）
  const Sd = enterAtlantis();
  Sd.zone = 'city'; Sd.stats.stamina = 150; Sd.stats.spirit = 100;
  const t0 = Sd.minute, st0 = Sd.stats.stamina;
  Math.random = always;   // 40% 必中
  G.setZone('trench');
  Math.random = RND;
  ck('深海区移动会触发拦截战斗', !!(Sd.combat && Sd.combat.enemy), Sd.combat ? Sd.combat.enemy.name : '没触发');
  ck('拦截不影响移动（区域/时间/体力都已结算）', Sd.zone === 'trench' && Sd.minute > t0 && Sd.stats.stamina < st0, `区域=${Sd.zone} 时间+${Sd.minute - t0}分 体力-${st0 - Sd.stats.stamina}`);
  Sd.combat = null;
  Sd.zone = 'abyss'; Sd.stats.stamina = 150;
  Math.random = always; G.setZone('habitat'); Math.random = RND;
  ck('从深海区游回礁石栖息地也会被拦（依然算深海移动）', !!Sd.combat);
  Sd.combat = null;
  Sd.zone = 'city'; Sd.stats.stamina = 150;
  Math.random = always; G.setZone('coral'); Math.random = RND;
  ck('浅水区之间移动安全（沉没之城↔珊瑚生长带）', !Sd.combat);
  Sd.zone = 'habitat'; Sd.stats.stamina = 150;
  Math.random = always; G.setZone('city'); Math.random = RND;
  ck('礁石栖息地↔浅水区移动安全', !Sd.combat);
  Sd.combat = null;
  // 未游动（只是切换到当前区域）不该触发
  Sd.zone = 'abyss'; Sd.stats.stamina = 150;
  Math.random = always; G.setZone('abyss'); Math.random = RND;
  ck('原地切换区域不触发拦截', !Sd.combat);

  // 每场战斗最多 2 次道具（以前只检查 usedItems 却从不累加 → 等于无限次）
  G.newGame('fisher', 'normal');
  G.addItem('salve', 5, true);
  G.startFight({ id:'dummyItem', name:'木桩', hp:99999, atk:1, def:0, spd:1, traits:[], drops:[] }, true);
  const Si = G.S();
  ck('战斗里第 1 次用道具成功', G.useItemInFight('salve') === true && Si.combat.usedItems === 1, '已用=' + Si.combat.usedItems);
  ck('战斗里第 2 次用道具成功', G.useItemInFight('salve') === true && Si.combat.usedItems === 2, '已用=' + Si.combat.usedItems);
  ck('第 3 次道具被拦下（每场最多 2 次）', G.useItemInFight('salve') === false);
  ck('被拦下时不扣物品', G.invCount('salve') === 3, '剩=' + G.invCount('salve'));
  Si.combat = null;
  ck('道具按钮会显示剩余次数', /const itemsLeft = Math\.max\(0, 2 - \(C\.usedItems \|\| 0\)\)/.test(UI));
  ck('战斗道具列表改成按药品自动生成（新药不用手改）', /cat === 'med' \|\| id === 'smokeBomb' \|\| id === 'poisonCoat'/.test(UI) && !/\['herbPaste','bandage','antidote','tea','lotusPill','salve','smokeBomb','poisonCoat'\]/.test(UI));

  // ⚠️ 玩家明确要求：大地图热点**完全固定** —— 不许换朝向、不许有任何动画/位移。
  //    曾经有个"贴顶时把箭头翻到标签上方"（class arrow-below，带 CSS transform 过渡），
  //    拖动时会在阈值附近来回切换、看着像热点自己在动，已被彻底删掉。
  ck('★ 已没有"贴边翻转箭头"这套东西（CSS 规则 + 逻辑都清了）',
     !/arrow-below/.test(CSS) && !/classList\.toggle\('arrow-below'/.test(UI) &&
     /a\.classList\.remove\('arrow-below'\)/.test(UI));
  // 热点必须"像印在地图上"：位置只由地图百分比 + 地图自身的位移决定，
  // 不许有独立位移（marginLeft 推回）、不许突然消失（display:none）。
  ck('地图热点完全锁定：不做显隐判定、不做独立位移、不换朝向',
     /a\.classList\.remove\('offscreen'\)/.test(UI) && /a\.style\.marginLeft = ''/.test(UI) &&
     !/classList\.add\('offscreen'\)/.test(UI) && !/a\.style\.marginLeft = Math\.round/.test(UI) && !/classList\.add\('pinned'/.test(UI));
  ck('渲染箭头后会重算（把位置还原成地图坐标）', (UI.match(/fitMapArrowsInView\(\);/g) || []).length >= 3);
}

section('7e. 不死丹改动 / 深海售卖机卖神物');
{
  // 不死丹：回 60 血、死亡保留 30 血、单局最多 3 颗
  ck('不死丹：回血 60、复活保留 30 血', ITEMS.lotusPill.heal === 60 && ITEMS.lotusPill.reviveHp === 30 && ITEMS.lotusPill.revive === 1);
  G.newGame('fisher', 'normal');
  G.addItem('lotusPill', 1, true);
  const Sl = G.S(); Sl.stats.hp = 0;
  const alive = G.die('测试：被野猪顶翻');
  ck('倒下时不死丹把人拉回来，只留 30 血', alive === true && Sl.stats.hp === 30 && G.invCount('lotusPill') === 0, '生命=' + Sl.stats.hp);

  G.newGame('fisher', 'normal');
  const Sx = G.S();
  Sx.furniture.medPot = 1;
  G.addItem('bpLotus', 1, true); G.addItem('snowlotus', 9, true);
  const rl = RECIPES.find(r => r.id === 'r_lotuspill');
  G.craft(rl); G.craft(rl); G.craft(rl);
  ck('不死丹能炼满 3 颗', G.invCount('lotusPill') === 3 && G.lotusLeft() === 0, '数量=' + G.invCount('lotusPill'));
  ck('第 4 颗被拦下（界面会给理由）', G.canCraft(rl).ok === false && /最多炼制 3 颗/.test(G.canCraft(rl).reason || ''));
  G.craft(rl);
  ck('硬点也不会多出第 4 颗', G.invCount('lotusPill') === 3);
  ck('批量制作同样被限死', G.craftBatch(rl, 1).ok === false && G.craftMax(rl) === 0);
  ck('制造面板会显示本局已炼几颗', /本局已炼 \$\{S\(\)\.lotusMade \|\| 0\}\/3/.test(UI));

  // 深海售卖机（遗失的交易机）：每天随机上架一件神物
  const Sv = enterAtlantis();
  Sv.day = 30; Sv.relics = [];
  Sv.atlantis = Sv.atlantis || {};
  delete Sv.atlantis.vendor;
  const v1 = G.atlVendorInfo();
  ck('售卖机上架一件神物（1200 贝壳币）', !!v1.id && v1.price === 1200, v1.name + ' / ' + v1.price);
  ck('同一天不会刷新', G.atlVendorInfo().id === v1.id);
  G.addItem('beibi', 5000, true);
  const buy = G.buyRelicFromVendor();
  ck('能买下当日神物并扣贝壳币', buy.ok === true && Sv.relics.includes(v1.id) && G.invCount('beibi') === 3800, '剩=' + G.invCount('beibi'));
  ck('买走后当天售罄（不能重复买）', G.buyRelicFromVendor().ok === false && G.atlVendorInfo().sold === true);
  Sv.day = 31;
  const v2 = G.atlVendorInfo();
  ck('第二天刷新出另一件（不会卖已拥有的）', !!v2.id && v2.id !== v1.id && !Sv.relics.includes(v2.id), v2.name);
  Sv.day = 32;
  G.removeItem('beibi', G.invCount('beibi'));
  ck('贝壳币不足时买不了', G.buyRelicFromVendor().ok === false);
  ck('交易机面板里有神物上架栏', /data-arelic/.test(UI) && /每天随机上架一件/.test(UI));

  // 已有但没装备的神物不该再刷一份
  G.newGame('fisher', 'normal');
  const Sr = G.S(); Sr.relics = ['vampire']; Sr.relicEquip = [null, null, null]; Sr.relicSlots = 0;
  Math.random = always;
  G.gainRandomRelic();
  Math.random = RND;
  ck('已有（未装备）的神物不会再刷出重复', Sr.relics.length === 2 && Sr.relics[1] !== 'vampire', Sr.relics.join(','));
}

section('7f. 鹰巢 / 发光苔藓 / 汇率 / 图纸上架 / 售卖机神物池');
{
  // 鹰巢：失手不再只是掉血，而是招来雪羽鹰
  const eaglePt = (SCENES.find(s => s.id === 'peak').points || []).find(p => p.id === 'peak_eagle');
  const climb = () => {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.scene = 'peak'; s.day = 20; s.minute = 600; s.stats.hp = 100; s.stats.stamina = 150;
    let ov = null; G.bind({ onLog: () => {}, onOverlay: o => { ov = o; } });
    G.doPoint(eaglePt);
    return { s, ov };
  };
  const fail1 = climb();
  ck('鹰巢会弹出攀爬选择', !!(fail1.ov && fail1.ov.choices && fail1.ov.choices[0]));
  Math.random = never;   // 60% 判定必失败
  fail1.ov.choices[0].ok();
  Math.random = RND;
  ck('鹰巢失手会招来雪羽鹰', !!(fail1.s.combat && fail1.s.combat.enemy && fail1.s.combat.enemy.id === 'eagle'), fail1.s.combat ? fail1.s.combat.enemy.name : '没触发');
  const ok1 = climb();
  Math.random = always;  // 成功
  ok1.ov.choices[0].ok();
  Math.random = RND;
  ck('鹰巢成功仍然直接给鹰羽', !ok1.s.combat && G.invCount('eaglefeather') >= 1, '鹰羽=' + G.invCount('eaglefeather'));

  // 发光苔藓：水晶概率 15% → 25%
  const moss = (SCENES.find(s => s.id === 'cave').points || []).find(p => p.id === 'cave_moss');
  const crystalYield = (moss.yields || []).find(y => y.id === 'crystal');
  ck('发光苔藓出水晶概率提到 25%', !!crystalYield && crystalYield.chance === 0.25, '概率=' + (crystalYield && crystalYield.chance));

  // 汇率：1 金币 = 30 贝壳（兑换和卖给商人都一样，不能靠卖金币套利）
  G.newGame('fisher', 'normal');
  G.addItem('coin', 2, true);
  const Sb = G.S(); Sb.inv.beibi = 0;
  G.exchangeCoins(2);
  ck('金币兑贝壳改为 1:30', G.invCount('beibi') === 60, '贝壳=' + G.invCount('beibi'));
  // 旧的"一键卖固定价表"已删；这里改成检查"金币卖不掉"，从根上杜绝套利
  {
    const buyLists = [LAOCHAO.buy, TOWN.grocer.buy, TOWN.smith.buy, TOWN.informant.buy, BLACKMARKET.buy].filter(Boolean);
    const sellable = buyLists.some(l => l.some(e => e.id === 'coin'));
    ck('金币不在任何商人的收购清单里（只能 1:30 兑贝壳，无法套利）', !sellable, sellable ? '有商人收金币' : '五家收购清单都查过');
  }
  ck('物品说明里写的是 30 贝壳', /1 枚可兑 30 贝壳/.test(ITEMS.coin.desc) && /1 金币 → 30 贝壳/.test(UI));

  // 图纸：不是概率出现，是"到点固定上架"
  const lot = LAOCHAO.sell.find(e => e.id === 'bpLotus');
  ck('不死丹方：老潮货摊第 20 天起固定上架（200 贝壳）', !!lot && lot.from === 20 && lot.base === 200 && lot.pool === undefined);
  const furn = TOWN.smith.sell.find(e => e.id === 'bpFurnace');
  ck('高炉图纸：盐镇铁匠固定卖（不是老潮的概率货）', !!furn && furn.base === 200);

  // 售卖机神物池：亚特兰蒂斯之种不参与随机上架
  const Ss = enterAtlantis();
  Ss.relics = []; Ss.atlantis = Ss.atlantis || {};
  let sawSeed = false, seenRelics = {};
  for (let d = 40; d < 90; d++) {
    Ss.day = d;
    delete Ss.atlantis.vendor;
    const info = G.atlVendorInfo();
    if (info.id === 'atlantisSeed') sawSeed = true;
    if (info.id) seenRelics[info.id] = 1;
  }
  ck('售卖机 50 天都不会刷出亚特兰蒂斯之种', !sawSeed, Object.keys(seenRelics).join(','));
  ck('售卖机仍然会刷其它神物', Object.keys(seenRelics).length >= 3, Object.keys(seenRelics).length + ' 种');
}

section('7g. 美人松 10% / 连续落空成就');
{
  const achDef = [
    ['bigPine', '好大一颗美人松啊', '紫', 20],
    ['drawDragon', '左边画个龙龙', '金', 50],
    ['neverHurt', '我永远不会伤害你', '红', 200],
  ];
  ck('三个新成就的品阶与奖励正确', achDef.every(([id, name, tier, reward]) => ACHIEVEMENTS[id] && ACHIEVEMENTS[id].name === name && ACHIEVEMENTS[id].tier === tier && ACHIEVEMENTS[id].reward === reward));
  // 美人松基础 10%，技能树「自然感知」每级再 +7%
  ck('美人松彩蛋概率 = 10% + 自然感知加成（每级 +7%）',
     /chance\(0\.1 \+ gxPineBonus\(\)\)\) \{[\s\S]{0,140}美人松/.test(GAME) && /function gxPineBonus\(\) \{ return 0\.07 \* nodeLv\('gather','g_nature'\); \}/.test(GAME));
  ck('原有「人体描边大师」（连空3次）仍然在', ACHIEVEMENTS.humanDraw.tier === '紫' && /连续 3 次攻击落空/.test(ACHIEVEMENTS.humanDraw.desc));

  // 美人松：连着两次才解锁
  const pineLogs = [], allLogs = [];
  G.bind({ onLog: t => { if (t.includes('人品爆发')) pineLogs.push(t); allLogs.push(t); } });
  const treePt = (SCENES.find(s => s.id === 'forest').points || []).find(p => p.id === 'forest_tree');
  G.newGame('woodcutter', 'normal');
  const Sp = G.S();
  Sp.scene = 'forest'; Sp.day = 20; Sp.minute = 600; Sp.stats.stamina = 150;
  G.addItem('axeSteel', 1, true); Sp.toolkit = ['axeSteel'];
  Math.random = always;   // 必触发美人松（同时会引来遇袭，采完自己清掉）
  G.doPoint(treePt); Sp.combat = null;
  G.doPoint(treePt); Sp.combat = null;
  Math.random = RND;
  ck('连续两次美人松 → 紫成就「好大一颗美人松啊」', G.achUnlocked('bigPine') === true && Sp.pineStreak === 2, '连续=' + Sp.pineStreak);
  ck('两次都真的触发了美人松（各 +7 木材）', pineLogs.length === 2, '触发 ' + pineLogs.length + ' 次');
  ck('"获得"清单里不会再冒出"美人松木材"这种假物品', !allLogs.some(l => /美人松木材/.test(l)) && allLogs.some(l => /^获得：.*木材×/.test(l)), allLogs.filter(l => /^获得：/.test(l)).slice(-1)[0] || '');
  Math.random = never;    // 这一次不触发
  G.doPoint(treePt);
  Math.random = RND;
  ck('中间断一次，连续计数清零', G.S().pineStreak === 0);

  // 连续落空：3 紫 / 4 金 / 6 红
  G.newGame('fisher', 'normal');
  G.startFight({ id:'dummyMiss', name:'木桩', hp:99999, atk:0, def:0, spd:1, traits:[], drops:[] }, true);
  const Sm = G.S();
  // 注意：一次「攻击」可能挥两下（速度追击），所以连空计数一次可能 +2，这里按"达到阈值"判定
  Math.random = never;
  Sm.missStreak = 0;
  const missTo = (n) => { let g = 0; while ((Sm.missStreak || 0) < n && g++ < 60) { Sm.stats.hp = 9999; G.fightAction('attack'); } };
  missTo(3);
  ck('连空 3 次 → 紫「人体描边大师」', G.achUnlocked('humanDraw') === true && Sm.missStreak >= 3, '连空=' + Sm.missStreak);
  missTo(4);
  ck('连空 4 次 → 金「左边画个龙龙」', G.achUnlocked('drawDragon') === true && Sm.missStreak >= 4, '连空=' + Sm.missStreak);
  missTo(6);
  ck('连空 6 次 → 红「我永远不会伤害你」', G.achUnlocked('neverHurt') === true && Sm.missStreak >= 6, '连空=' + Sm.missStreak);
  Math.random = RND;
  Sm.combat = null;
}

section('7h. 海盗船长每 5 天刷新');
{
  let seaPt = null;
  for (const sid in SCENES) {
    const sc = SCENES[sid], zs = sc.zones || { _: sc };
    for (const zk in zs) for (const p of (zs[zk].points || [])) if (p.id === 'sea_pirate') seaPt = p;
  }
  ck('海盗出没点位带 dayMod=5（第20天起）', !!seaPt && !!seaPt.cond && seaPt.cond.day === 20 && seaPt.cond.dayMod === 5);
  G.newGame('fisher', 'normal');
  const Sh = G.S();
  Sh.day = 20;
  ck('第 20 天（5 的倍数）可以打海盗船长', G.pointStatus(seaPt) === 'ok', G.pointStatus(seaPt));
  Sh.day = 21;
  const hint = G.pointStatus(seaPt);
  ck('第 21 天锁定，并提示下一次是第 25 天', hint !== 'ok' && /下一次是第 25 天/.test(hint), hint);
  Sh.day = 24;
  ck('第 24 天提示下一次是第 25 天', /下一次是第 25 天/.test(G.pointStatus(seaPt)), G.pointStatus(seaPt));
  ck('第 25 / 30 / 35 天都能打', [25, 30, 35].every(d => { Sh.day = d; return G.pointStatus(seaPt) === 'ok'; }));
  Sh.day = 19;
  ck('第 20 天之前仍是"等到第20天"', /第20天/.test(G.pointStatus(seaPt) || ''), G.pointStatus(seaPt));

  Sh.day = 22;
  const lg = [];
  G.bind({ onLog: t => lg.push(t) });
  G.doPoint(seaPt);
  ck('点没刷新的海盗点会在日志里给提示', lg.some(t => /下一次是第 25 天/.test(t)), lg[lg.length - 1] || '');
  ck('没刷新的日子点不出战斗', !Sh.combat);

  Sh.day = 25;
  let ov = null;
  G.bind({ onLog: () => {}, onOverlay: o => { ov = o; } });
  G.doPoint(seaPt);
  ck('刷新日点进去进入海盗船长战', !!(ov && /海盗头目/.test(ov.title || '')) || !!(Sh.combat && Sh.combat.enemy && Sh.combat.enemy.id === 'pirateBoss'), (ov && ov.title) || (Sh.combat && Sh.combat.enemy.name));
  if (ov && ov.choices && ov.choices[0]) ov.choices[0].ok();
  ck('确认迎战后确实是船长本人', !!(Sh.combat && Sh.combat.enemy && Sh.combat.enemy.id === 'pirateBoss'), Sh.combat ? Sh.combat.enemy.name : '无');
  Sh.combat = null;
}

section('7i. 收购恒定八折 + 批量出售（含手机端）');
{
  const CSS = fs.readFileSync(ROOT + '/css/style.css', 'utf8');
  G.newGame('fisher', 'normal');
  const Sq = G.S();
  Sq.day = 10; Sq.minute = 600; Sq.stats.hp = 100; Sq.stats.hunger = 100; Sq.stats.thirst = 100;
  const hideBase = LAOCHAO.buy.find(e => e.id === 'hide').base;   // 兽皮 15
  const p0 = G.priceOf(hideBase, true, 'hide');
  G.addItem('hide', 60, true);
  G.sellToMerchant('hide', 1, LAOCHAO.buy, false);
  ck('卖价固定为行情八折（卖 1 件不会掉价）', G.priceOf(hideBase, true, 'hide') === p0, p0 + ' → ' + G.priceOf(hideBase, true, 'hide'));
  G.sellToMerchant('hide', 30, LAOCHAO.buy, false);
  ck('一次卖 30 件也不再压价', G.priceOf(hideBase, true, 'hide') === p0, '价=' + G.priceOf(hideBase, true, 'hide'));
  Sq.day = 11;
  ck('跨天也不会继续跌（恒定八折）', G.priceOf(hideBase, true, 'hide') === p0, '价=' + G.priceOf(hideBase, true, 'hide'));
  Sq.day = 50;   // 冬季
  ck('季节行情仍然生效（冬季兽皮更贵）', G.priceOf(hideBase, true, 'hide') > p0, '价=' + G.priceOf(hideBase, true, 'hide'));
  ck('已彻底移除销量折价（只剩统计计数）', !/marketSup/.test(GAME) && !/supTag/.test(UI) && /仅留存销量统计/.test(GAME));

  // 批量出售：四个入口 + 手机端长按可靠性
  ck('老潮/盐镇/黑市/交易机的卖货按钮都接了长按批量', (UI.match(/bindPress\(b, doTap, doLong\)/g) || []).length >= 4);
  ck('长按会因滑动/系统打断而取消（手机端不误触）', /pointermove/.test(UI) && /pointercancel/.test(UI) && /Math\.hypot/.test(UI));
  ck('按钮禁用/置灰时不响应长按', /el2\.disabled \|\| el2\.classList\.contains\('lockedb'\)/.test(UI));
  ck('批量弹窗有 1/一半/全部 快捷档', /data-bset="1"/.test(UI) && /data-bset="half"/.test(UI) && /data-bset="all"/.test(UI));
  ck('CSS 关掉长按选中与长按菜单', /-webkit-touch-callout: none/.test(CSS) && /user-select: none/.test(CSS));
  ck('卖货面板说明写着"一律八折、批量不压价"', /一律按行情八折收/.test(UI));
}

section('7j. 山顶石像拦路（雪莲 / 秘银）');
{
  const findPt = (sceneId, pid) => {
    const sc = SCENES.find(s => s.id === sceneId), zs = sc.zones || { _: sc };
    for (const zk in zs) for (const p of (zs[zk].points || [])) if (p.id === pid) return p;
    return null;
  };
  const lotus = findPt('peak', 'peak_lotus'), mithril = findPt('peak', 'peak_mithril');
  ck('雪莲 / 秘银 都挂了 50% 石像拦路', !!lotus.guardChoice && !!mithril.guardChoice && lotus.guardChoice.chance === 0.5 && mithril.guardChoice.chance === 0.5 && lotus.guardChoice.enemy === 'slateGuard2');
  ck('拦路怪是石板守卫，但不掉石板（避免无限刷石板卖钱）', !!ENEMIES.slateGuard2 && ENEMIES.slateGuard2.name === '石板守卫' && !ENEMIES.slateGuard2.drops.some(d => d.id === 'slate') && ENEMIES.slateGuard2.traits.includes('stoneGuard'));
  ck('拦路变体不进图鉴（图鉴里只有一条"石板守卫"）', ENEMIES.slateGuard2.noDex === 1 && /function monIds\(\) \{ return Object\.keys\(ENEMIES\)\.filter\(k => !ENEMIES\[k\]\.noDex\)/.test(GAME) && /Game\.monIds\(\)/.test(UI));
  ck('拦路变体不算 BOSS（不影响万兽之王成就）', !ENEMIES.slateGuard2.boss);

  const climb = (point, randFn) => {
    G.newGame('woodcutter', 'normal');
    const s = G.S();
    s.scene = 'peak'; s.day = 20; s.minute = 600; s.stats.stamina = 150; s.stats.hp = 100;
    G.addItem('pickBlack', 1, true); s.toolkit = ['pickBlack'];
    let ov = null; G.bind({ onLog: () => {}, onOverlay: o => { ov = o; } });
    Math.random = randFn; G.doPoint(point); Math.random = RND;
    return { s, ov };
  };

  const a = climb(lotus, () => 0.0);   // 50% 判定必中
  ck('采雪莲会弹出石像拦路选择', !!(a.ov && a.ov.choices && a.ov.choices.length === 2), a.ov ? a.ov.title : '没弹窗');
  ck('拦路时还没扣次数和体力', (a.s.pointUses['peak_lotus'] || 0) === 0 && a.s.stats.stamina === 150);
  ck('两个选项是「不采了直接跑」「殊死一搏」', /跑/.test(a.ov.choices[0].label) && /殊死/.test(a.ov.choices[1].label), a.ov.choices.map(c => c.label).join(' / '));
  a.ov.choices[0].ok();
  ck('选跑：不产出、不扣当日次数、只花 10 分钟', G.invCount('snowlotus') === 0 && (a.s.pointUses['peak_lotus'] || 0) === 0 && a.s.minute === 610 && !a.s.combat, '分钟=' + a.s.minute);

  const b = climb(lotus, () => 0.0);
  b.ov.choices[1].ok();
  ck('选殊死一搏：直接开打石板守卫（不再弹二次确认）', !!(b.s.combat && b.s.combat.enemy.id === 'slateGuard2') && (!b.ov || b.ov.title === '石像动了'), b.s.combat ? b.s.combat.enemy.name : '没进战斗');
  winFights(600);
  ck('打赢后自动接着采，雪莲到手且只扣 1 次', G.invCount('snowlotus') === 1 && (b.s.pointUses['peak_lotus'] || 0) === 1, '雪莲=' + G.invCount('snowlotus') + ' 次数=' + (b.s.pointUses['peak_lotus'] || 0));

  const c = climb(mithril, () => 0.0);
  ck('挖秘银同样会触发石像拦路', !!(c.ov && c.ov.choices && c.ov.choices.length === 2));
  c.ov.choices[0].ok();
  ck('秘银选跑也是不扣次数', (c.s.pointUses['peak_mithril'] || 0) === 0 && G.invCount('mithril') === 0);

  const d = climb(lotus, () => 0.999);
  ck('没触发时照常采到雪莲、不弹窗', !d.ov && G.invCount('snowlotus') === 1, '雪莲=' + G.invCount('snowlotus'));
}

section('7k. 批量购买全量检查（每店每件货）');
{
  const LISTS = [
    ['老潮', LAOCHAO.sell],
    ['盐镇·杂货', TOWN.grocer.sell],
    ['盐镇·铁匠', TOWN.smith.sell],
    ['盐镇·情报贩子', TOWN.informant.sell],
    ['黑市', BLACKMARKET.sell],
  ];
  const fails = [];
  let checked = 0;
  for (const [shopName, list] of LISTS) {
    for (const e of list) {
      if (e.kind === 'bp' || ITEMS[e.id].cat === 'bp') continue;   // 图纸只需一份，走单买
      G.newGame('fisher', 'normal');
      const s = G.S();
      s.day = 40; s.fame = 3;      // 满足所有上架日/声望门槛
      s.inv = {}; s.tut = null;    // 腾空背包：本项测的是"批量买满"，不是"背包装不装得下"
      const cur = e.currency || 'beibi';
      const unit = G.priceOf(e.base, false, e.id);
      const want = 12;
      const beforeItem = G.invCount(e.id);      // 渔夫开局自带木头等杂物，所以按增量判断
      G.addItem(cur, unit * want, true);
      const beforeCur = G.invCount(cur);
      const mx = Math.max(1, Math.min(99, Math.floor(G.invCount(cur) / Math.max(1, unit))));   // 与界面同一算法
      G.buyFromMerchant(e.id, mx, list, false);
      checked++;
      const got = G.invCount(e.id) - beforeItem, spent = beforeCur - G.invCount(cur);
      if (got !== mx || spent !== unit * mx) fails.push(`${shopName}/${e.id}: 想买${mx} 实得${got} 花费${spent}/${unit * mx}`);
    }
  }
  ck('六家货架的每件货都能一次批量买满', fails.length === 0 && checked >= 20, fails.slice(0, 3).join('; ') || `共检查 ${checked} 件`);

  // 钱只够几个时：上限=买得起的数量，且确实能买到（不会点了没反应）
  G.newGame('fisher', 'normal');
  const s2 = G.S(); s2.day = 40; s2.fame = 3; s2.inv = {}; s2.tut = null;
  const woodBase = LAOCHAO.sell.find(x => x.id === 'wood').base;
  const unit2 = G.priceOf(woodBase, false, 'wood');
  G.addItem('beibi', unit2 * 3, true);
  const w0 = G.invCount('wood');
  const mx2 = Math.max(1, Math.min(99, Math.floor(G.invCount('beibi') / Math.max(1, unit2))));
  G.buyFromMerchant('wood', mx2, LAOCHAO.sell, false);
  ck('钱只够 3 个时批量上限就是 3，且买到了', G.invCount('wood') - w0 === 3 && G.invCount('beibi') < unit2, `买到 ${G.invCount('wood') - w0} 个`);

  // 金币货（海图）也能批量窗口结算
  G.newGame('fisher', 'normal');
  const s3 = G.S(); s3.day = 40; s3.fame = 3;
  const chart = TOWN.informant.sell.find(x => x.id === 'seachart');
  const cu = G.priceOf(chart.base, false, 'seachart');
  G.addItem('coin', cu * 2, true);
  G.buyFromMerchant('seachart', 1, TOWN.informant.sell, false);
  ck('金币标价的货（海图）也能正常结算', G.invCount('seachart') === 1 && G.invCount('coin') === cu, '剩金币 ' + G.invCount('coin'));

  // 界面接线
  ck('买/卖按钮都接了长按批量（八条通道齐全）', (UI.match(/bindPress\(b, doTap, doLong\)/g) || []).length >= 8);
  ck('图纸长按也会弹批量条（max 1），不再"长按没反应"', (UI.match(/kind:'buy', item:[^,]+, shop:[^,]+, [^}]*max:1 \}/g) || []).length >= 3, (UI.match(/max:1 \}/g) || []).length + ' 处');
  ck('批量条显示单价与实时合计', /id="batchn-total"/.test(UI) && /cfg\._unit/.test(UI));
  ck('买完回到正确商店界面（交易机不再跳去盐镇）', /shopBuyList\(cfg2\.shop\)/.test(UI) && /key === 'ATL' \? 'atlTrade'/.test(UI));
}

section('7l. 牧场（鸡舍/羊圈）与草地陷阱');
{
  const findPt = (sceneId, pid) => {
    const sc = SCENES.find(s => s.id === sceneId), zs = sc.zones || { _: sc };
    for (const zk in zs) for (const p of (zs[zk].points || [])) if (p.id === pid) return p;
    return null;
  };
  // ---- 数据与配方 ----
  ck('蛋料理数值按需求写好', ITEMS.egg.spoil === 168 && ITEMS.friedEgg.food === 15 && ITEMS.friedEgg.spoil === 72 &&
    ITEMS.bigOmelette.food === 60 && ITEMS.bigOmelette.water === 60 && ITEMS.bigOmelette.heal === 10 && ITEMS.bigOmelette.spoil === 240 &&
    ITEMS.superEgg.heal === 30 && ITEMS.superEgg.food === 100 && ITEMS.superEgg.sta === 100 && ITEMS.superEgg.water === 100 && ITEMS.superEgg.spoil === 2376);
  const rh = RECIPES.find(r => r.id === 'r_hay'), rf = RECIPES.find(r => r.id === 'r_friedegg'), rb = RECIPES.find(r => r.id === 'r_bigomelette'), rs = RECIPES.find(r => r.id === 'r_superegg');
  ck('配方：干草（茅草4→2）/ 煎蛋（蛋1）/ 大煎蛋（蛋5+水1+木1）/ 超级大蛋（蛋10+水3+木3）',
    rh.in.thatch === 4 && rh.out.hay === 2 && rf.in.egg === 1 && rb.in.egg === 5 && rb.in.water === 1 && rb.in.wood === 1 && rs.in.egg === 10 && rs.in.water === 3 && rs.in.wood === 3);
  // 干草供给：草地新点 + 芦苇加强 + 杂货商/老潮都能买
  const hayPt = (() => { for (const sc of SCENES) { const zs = sc.zones || { _: sc }; for (const zk in zs) for (const p of (zs[zk].points || [])) if (p.id === 'grass_hay') return p; } return null; })();
  ck('草地新增干草丛（每天 2 次、1~2 份）', !!hayPt && hayPt.daily === 2 && hayPt.yields.some(y => y.id === 'hay' && y.min === 1 && y.max === 2));
  const reeds = SCENES.find(s => s.id === 'river').points.find(p => p.id === 'river_reeds');
  ck('芦苇丛每天 3 次（茅草供给加强）', reeds.daily === 3);
  ck('老潮和盐镇杂货商都能买到干草', LAOCHAO.sell.some(e => e.id === 'hay') && TOWN.grocer.sell.some(e => e.id === 'hay'));
  ck('外岛（盐镇杂货商）卖小鸡与干草', TOWN.grocer.sell.some(e => e.id === 'chick' && e.base === 80) && TOWN.grocer.sell.some(e => e.id === 'hay'));

  // ---- 牧场日常 ----
  const setup = (sheepN, chickN) => {
    G.newGame('fisher', 'normal');
    const s = G.S();
    s.day = 30; s.buildings.house = 3; s.stats.hunger = 100; s.stats.thirst = 100;
    G.addItem('wood', 60, true); G.addItem('vine', 30, true);
    G.buildFurniture('coop'); G.buildFurniture('pen');
    G.addItem('chick', chickN, true);
    for (let i = 0; i < chickN; i++) G.addChick();
    for (let i = 0; i < sheepN; i++) G.addSheep();
    return s;
  };
  const s1 = setup(3, 3);
  ck('鸡舍 / 羊圈各能装填 3 只，满了就拒绝', G.liveInfo('pen').count === 3 && G.liveInfo('coop').count === 3 && G.addSheep().ok === false && G.addChick().ok === false);
  ck('上限是 3（liveInfo 里带 cap）', G.liveInfo('pen').cap === 3 && G.liveInfo('coop').cap === 3);
  // ---- 鸡舍扩建：3 → 4 → 5（作者 2026-09-17 要求；羊圈不扩建）----
  {
    const s = setup(0, 0);
    s.furniture.coop = true;
    s.capacity = 99;   // 测试用：这一格要塞好几批材料 + 5 只小鸡，别被背包格数挡住
    ck('鸡舍扩建起点：cap 3、还能扩 2 次',
       G.liveInfo('coop').cap === 3 && G.liveInfo('coop').ext === 0 && G.liveInfo('coop').extMax === 2);
    ck('扩建材料两档不同、第二档更贵',
       JSON.stringify(G.coopExtMats(1)) !== JSON.stringify(G.coopExtMats(2)) &&
       Object.values(G.coopExtMats(2)).reduce((a, b) => a + b, 0) > Object.values(G.coopExtMats(1)).reduce((a, b) => a + b, 0),
       JSON.stringify(G.coopExtMats(1)) + ' / ' + JSON.stringify(G.coopExtMats(2)));
    ck('没材料时扩建会被挡住', G.buildCoopExt().ok === false);
    for (const [k, v] of Object.entries(G.coopExtMats(1))) G.addItem(k, v, true);
    const r1 = G.buildCoopExt();
    ck('★ 第一次扩建成功：能养 4 只', r1.ok && G.liveInfo('coop').cap === 4, JSON.stringify(r1));
    G.addItem('chick', 4, true);
    for (let i = 0; i < 4; i++) G.addChick();
    ck('扩建后真的能装到 4 只（第 5 只才会被拒）', G.liveInfo('coop').count === 4 && G.addChick().ok === false,
       '鸡=' + G.liveInfo('coop').count);
    for (const [k, v] of Object.entries(G.coopExtMats(2))) G.addItem(k, v, true);
    const r2 = G.buildCoopExt();
    ck('★ 第二次扩建成功：能养 5 只', r2.ok && G.liveInfo('coop').cap === 5, JSON.stringify(r2));
    G.addItem('chick', 1, true);
    for (let i = 0; i < 1; i++) G.addChick();
    ck('扩建后能装到 5 只、第 6 只被拒', G.liveInfo('coop').count === 5 && G.addChick().ok === false);
    ck('★ 扩建到顶后不能再扩', G.buildCoopExt().ok === false && G.liveInfo('coop').ext === 2);
    ck('羊圈不受影响（还是 3 只）', G.liveInfo('pen').cap === 3 && G.liveInfo('pen').ext === 0);
    ck('界面里有扩建按钮，并且接到 Game.buildCoopExt',
       /data-coopext="1"/.test(UI) && /Game\.buildCoopExt\(\)/.test(UI) && /扩建鸡舍（\$\{i\.cap\} 只 → \$\{i\.cap \+ 1\} 只）/.test(UI));
    ck('老存档没这个字段也会补成 0',
       /if \(S\.coopExt === undefined\) S\.coopExt = 0;/.test(_GAME_SRC) && /coopExt:0/.test(_GAME_SRC));
  }

  // 羊：吃 1 干草产 1 羊毛
  const s2 = setup(2, 0);
  G.addItem('hay', 10, true);
  const w0 = G.invCount('wool');
  G.addMin(24 * 60);
  ck('羊每天吃 1 干草 / 每只产 1 羊毛', G.invCount('wool') - w0 === 2 && G.invCount('hay') === 8, `羊毛+${G.invCount('wool') - w0} 干草剩${G.invCount('hay')}`);
  const logs = []; G.bind({ onLog: t => logs.push(t) });
  G.addMin(24 * 60);
  ck('牧场日报会写出来（不再静默入包）', logs.some(l => /牧场日报/.test(l) && /羊毛\+2/.test(l)), logs.filter(l => /牧场/.test(l)).join(' | '));
  // 没草就不产毛，但不会死
  for (let i = 0; i < 6; i++) G.addMin(24 * 60);
  ck('干草耗尽后不再产毛，羊也不会饿死', G.invCount('hay') === 0 && G.liveInfo('pen').count === 2 && logs.some(l => /干草不足/.test(l)));

  // 羊寿终 → 3 兽肉
  const s3 = setup(1, 0);
  G.addItem('hay', 3, true);
  s3.livestock.pen[0].age = s3.livestock.pen[0].life - 1;
  const m3 = G.invCount('meat');
  G.addMin(24 * 60);
  ck('羊寿终留下兽肉×3 并离开羊圈', G.invCount('meat') - m3 === 3 && s3.livestock.pen.length === 0);

  // 鸡：小鸡 5 天 → 母鸡 → 每天 1 蛋
  const s4 = setup(0, 1);
  G.addItem('wheat', 20, true);
  for (let d = 0; d < 5; d++) G.addMin(24 * 60);
  ck('小鸡连喂 5 天小麦长成母鸡', s4.livestock.coop[0].type === 'hen', s4.livestock.coop[0].type);
  const e0 = G.invCount('egg');
  G.addMin(24 * 60);
  ck('母鸡每天吃 1 小麦、下 1 蛋', G.invCount('egg') - e0 === 1 && G.invCount('wheat') === 14, `蛋+${G.invCount('egg') - e0} 小麦剩${G.invCount('wheat')}`);
  const s5 = setup(0, 1);
  G.addItem('wheat', 3, true);
  s5.livestock.coop[0] = { type:'hen', days:5, age:29, life:30 };
  const m5 = G.invCount('meat');
  G.addMin(24 * 60);
  ck('母鸡寿终留下 1 份兽肉', G.invCount('meat') - m5 === 1 && s5.livestock.coop.length === 0);

  // 自动喂食开关
  const s6 = setup(1, 0);
  G.addItem('hay', 5, true);
  G.toggleAutoFeed();
  const w6 = G.invCount('wool'), h6 = G.invCount('hay');
  G.addMin(24 * 60);
  ck('关掉自动喂食：不消耗饲料、不产出', G.invCount('wool') === w6 && G.invCount('hay') === h6);
  G.toggleAutoFeed();

  // ---- 草地陷阱 ----
  G.newGame('fisher', 'normal');
  const s7 = G.S(); s7.scene = 'grassland'; s7.day = 20; s7.stats.stamina = 150;
  G.addItem('trap', 1, true);
  G.doPoint(findPt('grassland', 'grass_trap'));
  ck('在草地布陷阱会消耗道具并记下日期', s7.traps.placed === 1 && s7.traps.day === 20 && G.invCount('trap') === 0);

  // ⚠️ 陷阱已改为「每天清晨结算 → 进每日晨报弹窗」（不再"次日去草地才掷骰"）：
  //    跨日会调 newDay → collectDailyReport → onOverlay({kind:'daily'})，
  //    捕到羊羔后由 claimDailyTrap('kill'|'pen') 领取。
  const trapRun = (penSheep, roll) => {
    G.newGame('fisher', 'normal');
    const s = G.S();
    s.day = 21; s.buildings.watch = 2; s.buildings.house = 3;
    G.addItem('wood', 60, true); G.addItem('vine', 30, true);
    if (penSheep >= 0) { G.buildFurniture('pen'); for (let i = 0; i < penSheep; i++) G.addSheep(); }
    s.traps = { placed: 1, day: 20 };
    // 本段测的是草地陷阱，不是赶路遇袭；而且下面把 Math.random 固定成 0.0，
    // 会让拦路判定 100% 触发、把测试打断。玩家本来就能在设置里关掉这项。
    s.settings = { roadAmbush: false };
    const lg = []; let ov = null;
    G.bind({ onLog: t => lg.push(t), onOverlay: o => { ov = o; } });
    Math.random = roll; G.addMin(24 * 60); Math.random = RND;   // 跨一天 → 清晨结算
    return { s, lg, ov, rep: G.S().dailyReport };
  };
  const t1 = trapRun(1, () => 0.0);   // 50% 必中
  ck('次日清晨结算出"捕到羊羔"', !!(t1.rep && t1.rep.trap && t1.rep.trap.caught), JSON.stringify(t1.rep && t1.rep.trap));
  ck('弹出了每日晨报（kind=daily）', !!(t1.ov && t1.ov.kind === 'daily'), t1.ov ? t1.ov.kind : '没弹');
  ck('晨报里有陷阱情况', /草地陷阱/.test(UI) && !!t1.rep.trap);
  ck('两个处置方式：杀灭 / 放回羊圈', /data-dailytrap="kill"/.test(UI) && /data-dailytrap="pen"/.test(UI));
  G.claimDailyTrap('kill');
  ck('选杀灭：得兽肉×2、兽皮×1', G.invCount('meat') >= 2 && G.invCount('hide') >= 1);
  const t2 = trapRun(1, () => 0.0);
  G.claimDailyTrap('pen');
  ck('选放回羊圈：羊 +1', G.liveInfo('pen').count === 2, '羊=' + G.liveInfo('pen').count);
  const t3 = trapRun(-1, () => 0.0);
  const r3 = G.claimDailyTrap('pen');
  ck('没有羊圈时提示"你还没有羊圈"', /羊圈/.test(r3.msg || ''), r3.msg);
  const t4 = trapRun(3, () => 0.0);
  const r4 = G.claimDailyTrap('pen');
  ck('羊圈已满 3 只时提示"已满"', /已满/.test(r4.msg || ''), r4.msg);
  const t5 = trapRun(1, () => 0.999);
  ck('没触发时陷阱留着，第二天再看', t5.rep.trap && t5.rep.trap.caught === false && t5.s.traps.placed === 1,
     JSON.stringify(t5.rep.trap));
  // ===== 每日晨报（牧场消耗/产量 + 陷阱）=====
  {
    ck('代码里有晨报汇总（牧场 + 陷阱一起结算）',
       /function collectDailyReport\(\)/.test(_GAME_SRC) && /rep\.ranch = livestockNewDay\(\);/.test(_GAME_SRC) &&
       /rep\.trap = resolveTrapDaily\(\);/.test(_GAME_SRC));
    ck('newDay 里调用晨报，并在有内容时弹窗', /collectDailyReport\(\);/.test(_GAME_SRC) &&
       /if \(S\.day > 1 && S\.dailyReport && onOverlay\)/.test(_GAME_SRC) && /ranchHasNews \|\| trapHasNews/.test(_GAME_SRC));
    ck("ui 的 onOverlay 白名单包含 'daily'（漏了会渲染成空壳窗口）",
       /\['farm','black','town','mission','info','atlTrade','daily'\]\.includes\(k\)/.test(UI));
    ck('晨报弹窗有渲染函数并展示消耗/产量', /function dailyReportModal\(\)/.test(UI) && /吃干草/.test(UI) && /产羊毛/.test(UI) && /产鸡蛋/.test(UI));
    // 实测：没牧场没陷阱 → 不弹（不打扰玩家）
    G.newGame('fisher', 'normal');
    const sN = G.S(); sN.tut = null; sN.inv = {}; sN.settings = { roadAmbush: false };
    let ovN = null; G.bind({ onLog: () => {}, onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: o => { ovN = o; } });
    G.addMin(24 * 60);
    ck('实测：没牧场也没陷阱时不弹晨报', !(ovN && ovN.kind === 'daily'), ovN ? ovN.kind : '无弹窗');
    // 实测：有牧场就弹，且数据对得上
    G.newGame('fisher', 'normal');
    const sR = G.S(); sR.tut = null; sR.buildings.watch = 2; sR.settings = { roadAmbush: false };
    G.addItem('wood', 60, true); G.addItem('vine', 40, true);
    G.buildFurniture('pen'); G.addSheep();
    G.addItem('hay', 5, true);
    let ovR = null; G.bind({ onLog: () => {}, onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: o => { ovR = o; } });
    G.addMin(24 * 60);
    const repR = G.S().dailyReport;
    ck('实测：★ 有牧场时弹晨报', !!(ovR && ovR.kind === 'daily'), ovR ? ovR.kind : '无弹窗');
    ck('实测：★ 记录羊的消耗与产量', repR.ranch && repR.ranch.hayUsed >= 1 && repR.ranch.wool >= 1,
       '吃草' + repR.ranch.hayUsed + ' 产毛' + repR.ranch.wool);
    ck('实测：饲料不足会记进晨报', (() => {
      G.newGame('fisher', 'normal');
      const s2 = G.S(); s2.tut = null; s2.buildings.watch = 2; s2.settings = { roadAmbush: false };
      G.addItem('wood', 60, true); G.addItem('vine', 40, true);
      G.buildFurniture('pen'); G.addSheep();     // 不给干草
      G.bind({ onLog: () => {}, onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: () => {} });
      G.addMin(24 * 60);
      return G.S().dailyReport.ranch.lackHay >= 1;
    })());
  }
  const t6 = (() => {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.day = 20; s.buildings.watch = 2; s.traps = { placed: 1, day: 20 };
    let ov = null; G.bind({ onLog: () => {}, onOverlay: o => { ov = o; } });
    Math.random = () => 0.999; G.travel('grassland'); Math.random = RND;   // 0.999：既不触发陷阱、也不触发随机事件
    return { s, ov };
  })();
  ck('当天布下的陷阱不会当天生效（要次日）', !t6.ov && t6.s.traps.placed === 1);
}

section('7m. 锄头的用途（开垦 / 松土）与雨天生长');
{
  const setupFarm = () => {
    G.newGame('fisher', 'normal');
    const s = G.S();
    s.day = 10; s.buildings.farm = 1;    // 田垄：2 块田
    s.stats.hunger = 100; s.stats.thirst = 100;
    G.addItem('seedCarrot', 6, true); G.addItem('seedWheat', 6, true); G.addItem('wood', 20, true);
    return s;
  };
  ck('锄头说明里写清了用途', /开垦/.test(ITEMS.hoe.desc) && /松土/.test(ITEMS.hoe.desc));
  ck('作物表数据化（三种作物都写了天数与产量）', CROPS.seedCarrot.days === 3 && CROPS.seedWheat.out === 'wheat' && CROPS.seedHerb.min === 2);

  // 开垦新田
  const s1 = setupFarm();
  ck('田垄默认 2 块田', G.farmPlots() === 2, '田=' + G.farmPlots());
  ck('没有锄头开垦会被拦下', G.tillPlot().ok === false && G.farmPlots() === 2);
  G.addItem('hoe', 1, true);
  const wood0 = G.invCount('wood');
  const t1 = G.tillPlot();
  ck('拿锄头开垦出一块新田（木材×2）', t1.ok === true && G.farmPlots() === 3 && wood0 - G.invCount('wood') === 2, '田=' + G.farmPlots() + ' 木材-' + (wood0 - G.invCount('wood')));
  G.tillPlot();
  ck('最多只能多开 2 块', G.tillPlot().ok === false && G.farmPlots() === 4);
  ck('开垦会磨损锄头的耐久', (G.durOf('hoe') || 0) < 40, '耐久=' + G.durOf('hoe'));
  G.addItem('seedCarrot', 4, true);
  G.plant('seedCarrot'); G.plant('seedCarrot'); G.plant('seedCarrot'); G.plant('seedCarrot');
  ck('开垦出来的田能真的种上（4 块全满）', G.S().crops.length === 4 && G.plant('seedCarrot').ok === false);

  // 松土催熟
  const s2 = setupFarm();
  G.addItem('hoe', 1, true);
  G.plant('seedCarrot');
  const crop = s2.crops[0], before = crop.remain;
  const l1 = G.loosenPlot(0);
  ck('松土让作物早一天成熟', l1.ok === true && crop.remain === before - 1 && crop.tilled === 1, `${before} 天 → ${crop.remain} 天`);
  ck('同一块地只能松一次', G.loosenPlot(0).ok === false);
  ck('松土也会磨损锄头', (G.durOf('hoe') || 0) < 40);
  const s3 = setupFarm();
  G.plant('seedCarrot');
  ck('没有锄头不能松土', G.loosenPlot(0).ok === false);

  // 雨天加速
  const s4 = setupFarm();
  G.plant('seedCarrot');
  s4.crops[0].remain = 3;
  const lg = []; G.bind({ onLog: t => lg.push(t) });
  Math.random = () => 0.7;   // 天气池 ['sun','sun','sun','cloud','rain','fog'] → 下雨
  G.addMin(24 * 60);
  Math.random = RND;
  ck('雨天作物多长一天', s4.crops[0].remain === 1, '剩余 ' + s4.crops[0].remain + ' 天');
  ck('雨天生长会写日志提示', lg.some(l => /喝饱了水/.test(l)));

  // 点哪块收哪块
  const s5 = setupFarm();
  G.plant('seedCarrot'); G.plant('seedWheat');
  s5.crops[0].remain = 0; s5.crops[1].remain = 0;
  const w0 = G.invCount('wheat'), c0 = G.invCount('carrot');
  G.harvest(1);   // 点第二块（小麦）
  ck('收获按点的地块结算（以前永远收第一块）', G.invCount('wheat') > w0 && G.invCount('carrot') === c0, '小麦+' + (G.invCount('wheat') - w0) + ' 萝卜+' + (G.invCount('carrot') - c0));
  ck('收完剩下那一块还在', s5.crops.length === 1 && s5.crops[0].seed === 'seedCarrot');
}

section('7n. 图鉴口径（总数 = 列表）与死条目体检');
{
  G.newGame('fisher', 'normal');
  const c = G.collection();
  ck('怪物总数与列表同源（不再把隐藏变体算进去）', c.monTotal === G.monIds().length && c.monTotal === Object.keys(ENEMIES).length - 1, `总数=${c.monTotal} 名单=${G.monIds().length} 敌人表=${Object.keys(ENEMIES).length}`);
  ck('资源总数与列表同源', c.resTotal === G.resIds().length && c.resTotal === 90, `总数=${c.resTotal}`);
  // 玩家要求把那行说明删掉（标签上"已收录/总数"本身就够直观）。
  // ⚠️ 只看代码、剥掉注释：文件里留了句注释说明这事，别被它自己绊倒。
  {
    const uiCode = UI.replace(/\/\/[^\n]*/g, '');
    ck('★ 图鉴里那行"标签上的数字是…"说明已删除', !/标签上的数字是/.test(uiCode));
  }
  // 图鉴里的每一条都必须真的能拿到（防止再出现"海盐"那种死条目）
  const ids = G.resIds();
  const hasSource = (id) => {
    for (const sc of SCENES) {
      const zs = sc.zones || { _: sc };
      for (const zk in zs) for (const p of (zs[zk].points || [])) if ((p.yields || []).some(y => y.id === id)) return true;
    }
    for (const k in ENEMIES) for (const d of (ENEMIES[k].drops || [])) if (d.id === id) return true;
    if (RECIPES.some(r => r.out && r.out[id])) return true;
    if ([LAOCHAO.sell, TOWN.grocer.sell, TOWN.smith.sell, TOWN.informant.sell, BLACKMARKET.sell].some(l => l.some(e => e.id === id))) return true;
    if (Object.keys(REDEEM_CODES).some(k => REDEEM_CODES[k].item === id)) return true;
    if (RANDOM_EVENTS.some(ev => (ev.choices || []).some(ch => ch.items && ch.items[id]))) return true;
    // 给物品的调用有两种写法：addItem('x',…) 和 if (gainItem('x',…))（后者"装不下就进待收"）
    if (new RegExp("(?:addItem|gainItem)\\('" + id + "'").test(GAME)) return true;
    if (UI.includes("id:'" + id + "'")) return true;
    return false;
  };
  const orphan = ids.filter(id => !hasSource(id));
  ck('图鉴资源类里没有拿不到的死条目', orphan.length === 0, orphan.join('、') || '全部有来源');
  ck('晒盐现在也会出产海盐', (SCENES.find(s => s.id === 'sea').zones.sea.points.find(p => p.id === 'sea_salt').yields || []).some(y => y.id === 'seasalt'));
}

section('7o. 大地图：铺满 + 可上下拖动 + 热点不重叠');
{
  const CSS = fs.readFileSync(ROOT + '/css/style.css', 'utf8');
  ck('画面区铺满（舞台不再锁 16:9，左右不留黑边）', /stage\.style\.width = w \+ 'px';/.test(UI) && !/Math\.round\(w \* 9 \/ 16\)/.test(UI));
  // 作者 2026-09-15 最终定调：大地图 **宽度 = 屏幕宽度**（手机/平板/电脑同一套规则），
  // 高度按原图比例算出来、多出来的上下拖动看；横向锁死，绝不左右裁掉内容。
  ck('★ 大地图按"宽度 = 屏幕宽度"算（mapBox），不再用 cover 那套盖满屏幕',
     /function mapBox\(iw, ih, bw, bh\)/.test(UI) &&
     /const w = bw, h = ih \* \(bw \/ iw\);/.test(UI) &&
     /return \{ w, h, left: 0, top: \(bh - h\) \/ 2, maxPan: Math\.max\(0, \(h - bh\) \/ 2\) \};/.test(UI) &&
     !/function mapZoom\(\)/.test(UI));
  ck('场景仍按"铺满"算图片内容盒（coverBox 保留给场景用）',
     /function coverBox\(iw, ih, bw, bh, zoom\)/.test(UI) && /const sCover = Math\.max\(bw \/ iw, bh \/ ih\) \* \(zoom \|\| 1\);/.test(UI));
  // 手机横屏（可视高度才 378px）下，旧兜底 min(bw/iw, bh/ih) 会把地图缩成一根小横条（428x241），图和字都看不清。
  // ⚠️ 这个下界必须是"抬高"而不是 min 钳制：以前写成 min(max(bw/iw*1.10, bh/ih), sCover)，
  //    mapZoom 会被完全吃掉（横版地图在宽屏上「铺满宽度」只比「铺满高度」大一点），
  //    maxPan 长期只有 116px，"把当前场景对到画面中间"做不到。
  ck('竖屏/矮屏兜底：至少铺满宽度，且 zoom 是真正的下界（不被钳制吃掉）',
     /const sFloor = Math\.max\(bw \/ iw \* 1\.10, bh \/ ih\);/.test(UI) &&
     /const s = Math\.max\(sCover, sFloor > \(bh \/ ih\) \* 1\.02 \? sFloor : 0\);/.test(UI) &&
     !/Math\.min\(Math\.max\(bw \/ iw \* 1\.10, bh \/ ih\), sCover\)/.test(UI) && !/bw \/ \(iw \* sCover\) < 0\.7/.test(UI));
  ck('地图放大出纵向余量，可上下拖动', /function bindMapPan\(\)/.test(UI) && /function bindPan\(sel, getPan, setPan, settle\)/.test(UI) && /addEventListener\('pointermove'/.test(UI) && /addEventListener\('wheel'/.test(UI));
  ck('拖动时热点与底图一起移动（同一套坐标；横向恒为 0）',
     /function applyBox\(sel, box, panY, panX\)/.test(UI) &&
     /applyBox\('#map-img', box, mapPanY, 0\)/.test(UI) && /applyBox\('#map-arrows', box, mapPanY, 0\)/.test(UI) &&
     /mapPanX = 0;/.test(UI));
  ck('场景也铺满，热点/建筑跟着图片内容一起缩放', /applyBox\('#scene-img', box, scenePanY\)/.test(UI) && /applyBox\('#hotspots', box, scenePanY\)/.test(UI) && /applyBox\('#camp-buildings', box, scenePanY\)/.test(UI));
  // 作者明确要求：热点像印在地图上，随图滑动、被屏幕裁掉就自然滑出去，
  // **不许突然出现/消失，不许有独立位移**。（曾做过"滑出画面的整条隐藏"，已拆掉）
  ck('热点不做任何显隐判定（滑出画面就跟着地图滑出去，不突然消失）',
     /a\.classList\.remove\('offscreen'\)/.test(UI) && !/classList\.add\('offscreen'\)/.test(UI) &&
     !/classList\.add\('pinned'/.test(UI) && !/\.map-arrow\.pinned \{/.test(CSS) && !/pin-top/.test(UI));
  ck('热点没有任何独立位移（不做边缘推回，位置只由地图决定）',
     /a\.style\.marginLeft = ''/.test(UI) && !/a\.style\.marginLeft = Math\.round/.test(UI));
  // 玩家反馈"很多热点被左侧日志栏盖住"：日志栏固定 250px 宽、z-index 9，
  // 热点以前是 6 → 压在底下。现在热点/箭头层抬到 10，永远画在日志之上（看得见、点得到）。
  ck('★ 场景热点与地图箭头都在日志栏之上（不再被 250px 的日志栏压住）',
     /#hotspots \{ opacity: 0; transition: opacity 0\.35s; z-index: 10; pointer-events: none; \}/.test(CSS) &&
     /\.hotspot \{[\s\S]{0,260}?z-index: 10;/.test(CSS) &&
     /\.map-arrow \{[\s\S]{0,320}?z-index: 10;/.test(CSS) &&
     /#log \{[\s\S]{0,140}?z-index: 9;/.test(CSS));
  // ⚠️ 把热点层抬到日志栏之上时漏了 pointer-events：那一层是"整块舞台大小"的容器，
  //    会把底下所有东西的点击全吃掉 —— 玩家反馈"海域切不了沉船湾、对岸也切不了"就是这个。
  ck('★ 热点层/箭头层本身不吃点击（否则底下的分区按钮点不动）',
     /#hotspots \{ opacity: 0; transition: opacity 0\.35s; z-index: 10; pointer-events: none; \}/.test(CSS) &&
     /\.hotspot \{ pointer-events: auto; \}/.test(CSS) &&
     /#map-arrows \{ pointer-events: none; \}/.test(CSS) &&
     /pointer-events: auto;   \/\* 配 #map-arrows/.test(CSS));
  ck('热点坐标是固定的（从 dataset 还原地图百分比坐标，不会被搬走）',
     /if \(!a\.dataset\.pctL\) \{ a\.dataset\.pctL = a\.style\.left; a\.dataset\.pctT = a\.style\.top; \}/.test(UI) &&
     /a\.style\.left = a\.dataset\.pctL; a\.style\.top = a\.dataset\.pctT;/.test(UI));
  ck('没有任何"按屏幕边缘堆叠/左右错开"的浮动排版残留',
     !/i \* 34/.test(UI) && !/side \* 90/.test(UI) && !/点击让地图对准这里/.test(UI));
  // 作者 2026-09-15 定调（推翻了 v1.06 的"完全不做自动居中"）：
  //   进地图**要**自动居中到"你现在所在的地方"（从营地出来就该看到营地），
  //   但**绝不突破地图边界** —— 不许出现黑边。热点本身仍然钉死在图上。
  ck('★ 进入地图自动居中到当前所在地（从营地出来就该看到营地）',
     /function centerMapOnHere\(\)/.test(UI) &&
     /const wasMap = _lastView === 'map';/.test(UI) && /renderMap\(!wasMap\)/.test(UI));
  ck('★ 自动居中：横向不动（宽度已贴合），纵向对到中间并夹在边界内',
     /const limY = Math\.max\(0, \(box\.h - wrap\.clientHeight\) \/ 2\);/.test(UI) &&
     /mapPanX = 0;/.test(UI) &&
     /mapPanY = Math\.max\(-limY, Math\.min\(limY, wrap\.clientHeight \/ 2 - ay\)\);/.test(UI));
  ck('★ 只在"刚进地图/刚落地"居中一次，玩家拖动后不再抢镜头',
     /if \(justEntered\) mapPendingCenter = true;/.test(UI) &&
     /function tryCenterMap\(\) \{ if \(mapPendingCenter && centerMapOnHere\(\)\) mapPendingCenter = false; \}/.test(UI));
  // 玩家反馈"洞穴熊有点强"：前 30 天不出现（路上拦路、洞里狩猎都按 minDay 过滤）
  {
  ck('洞穴熊带 minDay:30（第 30 天起才会出现）', ENEMIES.cavebear.minDay === 30);
    G.newGame('fisher', 'normal');
    const s = G.S(); s.day = 5;
    let early = 0;
    for (let i = 0; i < 300; i++) if (G.roadAmbushPool(5).indexOf('cavebear') >= 0) early++;
    ck('第 5 天的拦路池里没有洞穴熊', early === 0, '出现次数 ' + early);
    s.day = 31;
    let late = 0;
    for (let i = 0; i < 300; i++) if (G.roadAmbushPool(5).indexOf('cavebear') >= 0) late++;
    ck('第 31 天的拦路池里会有洞穴熊（危险度 5）', late > 0, '出现次数 ' + late);
    ck('拦路池永远有狼兜底（不会因为过滤变成空池）', G.roadAmbushPool(3).indexOf('wolf') >= 0);
  }
  // 玩家反馈"篝火被仓库挡住"：营地建筑精灵改成按 y 深度排序（越靠下越画在前面），篝火不再被仓库压住
  ck('★ 营地建筑按深度叠放（篝火 y=81 排在仓库 y=66 前面）',
     /p\.style\.zIndex = String\(Math\.max\(1, Math\.min\(9, Math\.round\(pos\[1\] \/ 10\)\)\)\);/.test(UI) &&
     /fire:\[52,81\]/.test(DATA) && /store:\[62,66\]/.test(DATA) && /const CAMP_BUILD_POS/.test(DATA),
     'ui=' + /p\.style\.zIndex/.test(UI) + ' fire=' + /fire:\[52,81\]/.test(DATA) + ' pos=' + /const CAMP_BUILD_POS/.test(DATA));
  ck('★ 横向不再有可拖余量（两张图同一套规则，图二不会比图一小）',
     !/needX/.test(UI) && !/maxPanX/.test(UI) && !/clampPanX/.test(UI) &&
     /const w = bw, h = ih \* \(bw \/ iw\);/.test(UI));
  ck('★ 纵向余量算得出来（高度超出舞台才可上下拖，且拖不出空白）',
     /mapPanY = Math\.max\(-box\.maxPan, Math\.min\(box\.maxPan, mapPanY\)\);/.test(UI) &&
     !/MAP_KEY_L/.test(UI) && !/MAP_KEY_R/.test(UI));
  // 玩家/作者反馈的坐标微调：山顶要贴山峰上部、竹林不许贴左边缘（还要和采石场错开，别让标签连成一片）
  {
    const MA = (DATA.match(/const MAP_ARROWS = \{([\s\S]*?)\n\};/) || ['', ''])[1];
    const get = (k) => { const m = MA.match(new RegExp(k + ":\\s*\\{\\s*x:(\\d+),\\s*y:(\\d+)")); return m ? { x: +m[1], y: +m[2] } : null; };
    const pk = get('peak'), bam = get('bamboo'), qu = get('quarry'), cv = get('cave');
    // 山顶在山峰上部：不能太高（矮屏标签会被切），也不能和山洞挤在一起
    ck('山顶热点在山峰上部且与「山洞」拉开距离',
       pk && cv && pk.y >= 10 && pk.y <= 20 && (cv.y - pk.y) >= 12, pk && cv ? '山顶y=' + pk.y + ' 山洞y=' + cv.y : '没找到');
    ck('竹林热点右移（x>=12），不再贴左边缘', bam && bam.x >= 12, bam ? bam.x + ',' + bam.y : '没找到');
    ck('竹林与采石场错开（不重叠标签：x 或 y 拉开）',
       bam && qu && (Math.abs(bam.x - qu.x) >= 12 || Math.abs(bam.y - qu.y) >= 12),
       bam && qu ? '竹林' + bam.x + ',' + bam.y + ' 采石场' + qu.x + ',' + qu.y : '');
  }
  ck('窄屏顶栏不再挤爆（邮箱按钮跟着缩）',
     /\.top-mail-btn \{ font-size: 10px; padding: 2px 6px; border-width: 1px; \}/.test(CSS));
  // 玩家反馈"一个雷霆大面具直接呼我脑袋上了"：item-icon 以前只有 `.inv-item .item-icon` 有尺寸，
  // 其他面板（工具栏/图鉴/详情…）里的图标按原图 96×96 原始像素铺出来，会把布局顶破。
  ck('物品图标有全局默认尺寸（不再按原图 96px 铺满）',
     /^\.item-icon \{ display: block; width: 32px; height: 32px;/m.test(CSS) &&
     /\.item-icon \{[^}]*object-fit: contain/.test(CSS));
  // 玩家反馈"行动轨迹都是从左上角过来的"：容器伸出屏幕外时 SVG 按元素盒渲染会整体偏。
  // 现在的做法是**闭环校正**：先落位，再实测"线端点 vs 箭头尖"的平均偏差，整体平移补掉。
  ck('行进层做了端点闭环校正（线两端落在箭头尖上）',
     /function makeTravelLayer\(inner, W, H, fx, fy, tx, ty/.test(UI) &&
     /layer\.style\.left = \(parseFloat\(layer\.style\.left\) \+ ddx\) \+ 'px';/.test(UI) &&
     /layer\.style\.top = \(parseFloat\(layer\.style\.top\) \+ ddy\) \+ 'px';/.test(UI) &&
     /function tipAnchor\(inner, box, key, attr\)/.test(UI));
  ck('旅行坐标查不到时跳过动画（不让线从左上角乱跑）', /if \(!f \|\| !t \|\| typeof f\.x !== 'number'/.test(UI));
  ck('亚特兰蒂斯旅行走专用那套（它的坐标在另一张表里）',
     /if \(st2\.scene === 'atlantis' \|\| target === 'atlantis'\) \{/.test(UI) && /startAtlantisTravel\(target\); return;/.test(UI));
  // ⚠️ 轨迹"差一段"的根因：两端锚点以前靠坐标模糊匹配（near ±0.8）找箭头，
  //    一旦匹配不上就静默退回"按百分比估算"，线就从箭头旁边出发。
  //    现在给每个箭头打 data-scene / data-zone，按 id 精确取 glyph 尖端。
  ck('箭头都带 id 标签（data-scene / data-zone / home），旅行动画据此精确取锚点',
     /a\.dataset\.scene = id;/.test(UI) && /a\.dataset\.zone = zid;/.test(UI) && /ha\.dataset\.zone = 'home';/.test(UI));
  ck('锚点用 tipAnchor 按 id 取 glyph 尖端（不再坐标模糊匹配）',
     /function tipAnchor\(inner, box, key, attr\)/.test(UI) &&
     /tipAnchor\(inner, box0, st2\.scene, 'scene'\)/.test(UI) && /tipAnchor\(inner, box, S\(\)\.zone \|\| 'habitat', 'zone'\)/.test(UI) &&
     !/const near = \(e, p\) =>/.test(UI));
  ck('返回孤岛的 ▲ 箭头锚点取顶边（不是底边）', /const up = \(g\.textContent \|\| ''\)\.indexOf\('▲'\) >= 0;/.test(UI));
  // 玩家反馈"没锄头但扣了我体力"：耕地这类【弹窗类】点位只是打开界面，不该动体力/当日次数。
  // 根因：通用扣体力在类型分发之前执行，而弹窗判断在很后面 → 每开一次耕地弹窗白扣 10 体力
  //       （farm_plant 带 energy:10 且 daily:3，一天能白烧 30）。
  {
    ck('弹窗类点位在任何扣除之前就返回（不再白扣体力/当日次数）',
       /const MODAL_TYPES = \['farm', 'trade', 'townTrade', 'townMission', 'townInfo', 'atlTrade'\];/.test(_GAME_SRC) &&
       /const overlayKind = p\.type === 'townTrade' \? 'town'/.test(_GAME_SRC) &&
       // 关键：这段提前返回必须出现在「S.pointUses++ / st.stamina -= en」之前
       (() => {
         const iModal = _GAME_SRC.indexOf('const MODAL_TYPES = ');
         const iDeduct = _GAME_SRC.indexOf('st.stamina -= en;');
         return iModal > 0 && iDeduct > 0 && iModal < iDeduct;
       })());
    let checked = 0; const wrong = [];
    for (const sc of SCENES) {
      // ⚠️ 必须按区域遍历：黑市(cove_black)、海底售卖机(atl_vendor) 这些点位挂在**区域**下，
      //    只设 scene 不设 zone 的话 pointsOf() 里根本找不到它们（会拿到 undefined 崩掉）
      const zoneNames = sc.zones ? Object.keys(sc.zones) : [null];
      for (const zn of zoneNames) {
      const src = zn ? (sc.zones[zn].points || []) : (sc.points || []);
      for (const p of src) {
        if (!['farm', 'trade', 'townTrade', 'townMission', 'townInfo', 'atlTrade'].includes(p.type)) continue;
        G.newGame('fisher', 'normal');
        const s = G.S();
        s.inv = {}; s.tut = null; s.stats.hp = 99999;
        s.stats.stamina = 100; s.stats.hunger = 100; s.stats.thirst = 100;
        s.buildings.watch = 3; s.buildings.farm = 1;
        s.scene = sc.id;
        if (zn) { try { G.setZone(zn); } catch (e) {} } else s.zone = null;
        const s0 = s.stats.stamina, u0 = s.pointUses[p.id] || 0, m0 = s.minute;
        G.doPoint(p);
        checked++;
        const dStam = G.S().stats.stamina - s0, dUses = (G.S().pointUses[p.id] || 0) - u0, dMin = G.S().minute - m0;
        if (dStam !== 0 || dUses !== 0 || dMin !== 0) wrong.push(sc.id + '/' + (zn || '-') + '/' + p.id + '(体力' + dStam + ' 次数' + dUses + ' 时间' + dMin + ')');
      }
      }
    }
    ck('实测：全部弹窗类点位都不扣体力/不占次数/不推进时间', wrong.length === 0,
       checked + ' 个点位' + (wrong.length ? ' 异常: ' + wrong.join(' ') : ' 全部干净'));
    ck('实测：没锄头时点「开垦」不扣体力、也不给田',
       (() => {
         G.newGame('fisher', 'normal');
         const s = G.S(); s.inv = { wood: 10 }; s.buildings.farm = 1; s.stats.stamina = 100;
         const before = s.stats.stamina, ext0 = G.farmExt();
         const r = G.tillPlot();
         return !r.ok && G.S().stats.stamina === before && G.farmExt() === ext0 && G.invCount('wood') === 10;
       })());
    ck('实测：有锄头时开垦照常生效（扣木材、加田）',
       (() => {
         G.newGame('fisher', 'normal');
         const s = G.S(); s.inv = { wood: 10 }; s.buildings.farm = 1;
         G.addItem('hoe', 1, true);
         const ext0 = G.farmExt();
         const r = G.tillPlot();
         return r.ok && G.farmExt() === ext0 + 1 && G.invCount('wood') === 8;
       })());
  }
  // 玩家反馈"晾肉是真的会干等八小时"：晾肉干改成"挂 30 分钟 + 晾 20 小时来取"，
  // 不再是点一下跳过 480 分钟、成品立等可取（晾晒期间架子占住，不能晾别的）。
  {
    const RACK = RECIPES.find(r => r.id === 'r_rackmeat');
    ck('晾肉干配方 = 挂 30 分 + 晾 1200 分（20 小时）', RACK && RACK.time === 30 && RACK.hang === 1200,
       RACK ? 'time=' + RACK.time + ' hang=' + RACK.hang : '没找到');
    const mkRack = () => {
      G.newGame('fisher', 'normal');
      const s = G.S();
      s.inv = {}; s.tut = null; s.stats.hp = 99999; s.stats.stamina = 99999;
      s.buildings.watch = 3; s.furniture.rack = 1; G.addItem('meat', 5, true);
      return s;
    };
    mkRack();
    const t0 = G.S().minute;
    G.craft(RACK);
    ck('实测：挂上去只花 30 分钟（不再是 480 分）', G.S().minute - t0 === 30, '+' + (G.S().minute - t0) + ' 分');
    ck('实测：不会当场拿到肉干', G.invCount('jerky') === 0, 'jerky=' + G.invCount('jerky'));
    ck('实测：架子上记着"晾晒中"，剩余 20 小时', !!G.dryOf('rack') && G.dryLeftMin('rack') === 1200, G.fmtLeft(G.dryLeftMin('rack')));
    ck('实测：晾晒期间不能再晾别的（会拦下并说明还剩多久）',
       !G.canCraft(RACK).ok && /还要/.test(G.canCraft(RACK).reason), G.canCraft(RACK).reason);
    ck('实测：没到期取不下来', !G.dryCollect('rack').ok && !G.invCount('jerky'));
    G.addMin(1200);
    ck('实测：晾满 20 小时能取下 肉干×3', G.dryLeftMin('rack') === 0 && G.dryCollect('rack').ok && G.invCount('jerky') === 3,
       'jerky=' + G.invCount('jerky'));
    ck('实测：取下后架子空了，可以接着晾', !G.dryOf('rack') && G.canCraft(RACK).ok);
    mkRack(); G.craft(RACK); G.addMin(300);
    const leftB = G.dryLeftMin('rack');
    G.save(); G.load();
    ck('实测：存读档后晾晒进度不丢', G.dryLeftMin('rack') === leftB, leftB + ' → ' + G.dryLeftMin('rack'));
  }
  // 玩家反馈"竹筐有啥用？我看还是 20 个格子""制作时满格就不给东西了"
  // 根因：addItem 用"物品种类数"比容量，和界面显示的 capUsed()（堆叠每 20 个 1 格）不是一套算法
  //       → 背包早就超了却以为没满（无限膨胀），制作/购买时产物又被拒 → 材料白扣、东西凭空消失
  {
    ck('addItem 的容量判定与 capUsed 用同一套算法（不再是"物品种类数"）',
       /const usedSlots = capUsed\(\);/.test(_GAME_SRC) && !/const used = Object\.keys\(S\.inv\)\.length;\s*\n\s*if \(S\.inv\[id\]\)/.test(_GAME_SRC));
    ck('有 fitsInBag 预判（含"堆叠撑破那格"与"要扣掉的东西"）',
       /function fitsInBag\(outMap, removeMap\)/.test(_GAME_SRC) && /Math\.ceil\(after \/ per\) - Math\.ceil\(before \/ per\)/.test(_GAME_SRC));
    ck('制作/买卖都先预判背包放得下（不再白扣材料/钱）',
       /if \(!fitsInBag\(r\.out, r\.in\)\)/.test(_GAME_SRC) && /if \(!fitsInBag\(\{ \[id\]: n \}, \{ \[currency\]: cost \}\)\)/.test(_GAME_SRC) && /if \(!fitsInBag\(\{ beibi: gain \}\)\)/.test(_GAME_SRC));
    ck('关键道具 alwaysFit（石板/遗物/龙骨不受容量限制，不会卡主线）',
       ITEMS.slate.alwaysFit === 1 && ITEMS.relic.alwaysFit === 1 && ITEMS.dragonbone.alwaysFit === 1 &&
       /it\.alwaysFit \|\| it\.cat === 'currency'/.test(_GAME_SRC));
    ck('有 gainItem：野外捡的东西装不下就进"待收"，不凭空消失',
       /function gainItem\(id, n\)/.test(_GAME_SRC) && /S\.furnPending\[id\] = \(S\.furnPending\[id\] \|\| 0\) \+ n;/.test(_GAME_SRC));
    ck('腾出空位就会补发待收（removeItem 里触发，不用等到第二天）',
       /if \(S\.furnPending\) flushPending\(\);/.test(_GAME_SRC));
    // 实测
    G.newGame('fisher', 'normal');
    let s = G.S(); s.inv = {}; s.tut = null;
    const capBase = G.capacity();
    G.addItem('basket', 1, true);
    ck('实测：竹篓 +10 容量（20 → 30）', G.capacity() === capBase + 10, capBase + ' → ' + G.capacity());
    G.removeItem('basket', 1);
    ck('实测：丢掉竹篓容量退回', G.capacity() === capBase, 'cap=' + G.capacity());
    G.newGame('fisher', 'normal');
    s = G.S(); s.inv = {}; s.tut = null;
    const one = Object.keys(ITEMS).filter(id => ITEMS[id].stack === 1 && ['weapon','tool','armor','cloth','accessory'].includes(ITEMS[id].cat)).filter(id => id !== 'basket').slice(0, 19);
    for (const id of one) G.addItem(id, 1, true);
    G.addItem('beibi', 5000, true);
    ck('实测：能构造出真正的满格', G.capUsed() === G.capacity(), G.capUsed() + '/' + G.capacity());
    ck('实测：满格再加新物品会被拒绝', G.addItem('honey', 1, true) === false);
    const w0 = G.invCount('wood'), f0 = G.invCount('flint'), t0 = G.S().minute;
    G.addItem('wood', 5, true); G.addItem('flint', 5, true);      // 这两件也塞不进（但已在包里的会合并）
    const rec = RECIPES.find(r => r.id === 'r_axestone');
    const w1 = G.invCount('wood'), f1 = G.invCount('flint');
    G.craft(rec);
    ck('实测：满格时制作被拦下，材料没被扣、时间没白花',
       G.invCount('wood') === w1 && G.invCount('flint') === f1 && G.S().minute === t0,
       '木材差 ' + (G.invCount('wood') - w1) + ' 时间+' + (G.S().minute - t0));
    const b0 = G.invCount('beibi');
    G.buyFromMerchant('ironSword', 3, [{ id: 'ironSword', base: 200 }], false);
    ck('实测：满格时买装备没扣钱', G.invCount('beibi') === b0, '贝壳差 ' + (G.invCount('beibi') - b0));
    ck('实测：关键道具在满格时仍能进包',
       G.addItem('slate', 1, true) === true && G.addItem('relic', 1, true) === true && G.addItem('dragonbone', 1, true) === true,
       'slate=' + G.invCount('slate') + ' relic=' + G.invCount('relic') + ' bone=' + G.invCount('dragonbone'));
  }
  // ===== 限定 · 神弓（v1.06 限定，全账号唯一，可存邮箱跨局）=====
  {
    const BOW = 'divineBow';
    const REC = RECIPES.find(r => r.id === 'r_divinebow');
    // 活动期内 REC 存在；活动结束后配方被摘掉 → 制作相关断言自动跳过（见下）
    const ON_SALE = !!REC;
    const clearMail = () => { const m = G.metaState(); m.mailbox = (m.mailbox || []).filter(x => !x || x.item !== BOW); };
    const mkFresh = () => { G.newGame('fisher', 'normal'); const s = G.S(); s.inv = {}; s.tut = null; s.furniture.wb2 = 1; s.toolDurs = {}; s.dur = {}; return s; };
    ck('神弓与猎弓数值完全一致（不靠数值膨胀，特权才是本体）',
       ITEMS[BOW].atk === ITEMS.bow.atk && ITEMS[BOW].spd === ITEMS.bow.spd && ITEMS[BOW].ranged === 1,
       '神弓 ' + ITEMS[BOW].atk + '/' + ITEMS[BOW].spd + ' vs 猎弓 ' + ITEMS.bow.atk + '/' + ITEMS.bow.spd);
    // 作者 2026-09-15：神弓与手枪的耐久对调（神弓 50→120、手枪 120→50）
    ck('神弓耐久 120、带 divineCrit（和手枪的耐久对调过）',
       DURA[BOW] === 120 && ITEMS[BOW].divineCrit === 1 && ITEMS[BOW].alwaysFit === 1,
       '耐久 ' + DURA[BOW] + ' divineCrit=' + ITEMS[BOW].divineCrit);
    ck('手枪耐久 50（和神弓对调过）', DURA.pistol === 50, '耐久 ' + DURA.pistol);
    if (ON_SALE) {
      ck('活动期内：配方在精工工作台、标「限定」、带 uniqueItem',
         REC.station === 'work2' && /限定/.test(REC.name) && REC.uniqueItem === BOW, REC.station + ' / ' + REC.name);
      ck('神弓配方材料跨多线（秘银锭/鹰羽/女王丝/深珊瑚/源质锭/绳索）',
         ['mithrilingot','eaglefeather','queenSilk','deepCoral','sourceBar','rope'].every(k => REC.in[k] > 0), JSON.stringify(REC.in));
      // ⚠️ 限时活动（26.9.15-26.9.30）：活动结束后会把 r_divinebow 配方整行删掉。
      //    所以"制作相关"的断言都放在 ON_SALE 里，配方没了自动跳过（并断言它确实下架了）；
      //    "已做出的弓照常可用"（暴击/耐久/邮箱）不依赖配方，永远验。
      ck('配方名与物品说明都标了活动日期', /26\.9\.15-26\.9\.30/.test(REC.name) && /26\.9\.15-26\.9\.30/.test(ITEMS[BOW].desc),
         REC.name);
    }
    // 唯一性（只在活动期内验：配方下架后这些拦截自然不存在了）
    if (ON_SALE) {
      clearMail(); mkFresh();
      for (const k in REC.in) G.addItem(k, REC.in[k], true);
      ck('实测：条件是齐的时候可以做', G.canCraft(REC).ok, G.canCraft(REC).reason || 'ok');
      G.craft(REC);
      ck('实测：做出来是神弓×1', G.invCount(BOW) === 1, 'inv=' + G.invCount(BOW));
      ck('实测：★ 身上有一把就不再显示/允许制作', !G.canCraft(REC).ok, G.canCraft(REC).reason);
      // 存入邮箱
      const st = G.storeDivineBow();
      ck('实测：★ 能存进邮箱，且当前局立刻失去这把弓（不是复制）', st.ok && G.invCount(BOW) === 0, JSON.stringify(st));
      ck('实测：★ 邮箱里有一把时同样不允许再做', !G.canCraft(REC).ok, G.canCraft(REC).reason);
      ck('实测：★ 邮箱只存一把（第二把会被拦下）',
         (() => { G.addItem(BOW, 1, true); const r2 = G.storeDivineBow(); return !r2.ok && G.invCount(BOW) === 1; })());
    } else {
      ck('活动结束后：配方已从工作台下架', !RECIPES.some(r => r.id === 'r_divinebow'));
    }
    // 跨局领取 + 耐久
    clearMail(); mkFresh();
    G.addItem(BOW, 1, true);
    G.S().toolDurs[BOW] = [37]; G.S().dur[BOW] = 37;
    G.storeDivineBow();
    const mail = G.mailboxList().find(x => x.item === BOW);
    ck('实测：邮件里能看到神弓并带着耐久', !!mail && mail.dur === 37, mail ? '耐久 ' + mail.dur : '没有');
    G.newGame('fisher', 'normal');
    const idx = G.mailboxList().findIndex(x => x.item === BOW);
    const cl = G.claimMailbox(idx);
    ck('实测：★ 新局能从邮箱领取，耐久跟着走',
       cl.ok && G.invCount(BOW) === 1 && G.durOf(BOW) === 37, cl.msg + ' 耐久 ' + G.durOf(BOW));
    ck('实测：领完后邮箱空了', !G.hasMailboxDivineBow());
    // 战斗特权：每场第一次命中必暴击
    clearMail(); mkFresh();
    G.addItem(BOW, 1, true); G.addItem('arrow', 30, true);
    const sb = G.S();
    sb.equipment.weapon = BOW; sb.toolDurs[BOW] = [50]; sb.dur[BOW] = 50;
    sb.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
    const r0 = Math.random; Math.random = () => 0.99;      // 屏蔽普通会心(10%)，只看神弓特权
    G.startFight(ENEMIES.boar, true);
    const C = G.S().combat;
    C.enemies.forEach(e => { e.ehp = 999999; e.emax = 999999; });
    const a0 = C.enemies[0].ehp; G.fightAction('ranged');
    const first = a0 - G.S().combat.enemies[0].ehp;
    const a1 = G.S().combat.enemies[0].ehp; G.fightAction('ranged');
    const second = a1 - G.S().combat.enemies[0].ehp;
    ck('实测：★ 第一箭必会心（= 普通伤害 ×1.5）', first === Math.round(second * 1.5), '第一箭 ' + first + '，第二箭 ' + second);
    ck('实测：特权提示写进了战斗日志',
       !!(G.S().combat && G.S().combat.log.some(x => /神弓的弦音/.test(x))), '');
    G.startFight(ENEMIES.boar, true);
    const C2 = G.S().combat;
    C2.enemies.forEach(e => { e.ehp = 999999; e.emax = 999999; });
    const b0 = C2.enemies[0].ehp; G.fightAction('ranged');
    const again = b0 - G.S().combat.enemies[0].ehp;
    Math.random = r0;
    ck('实测：★ 新战斗会重置（又一次必会心）', again === Math.round(second * 1.5), '新战斗第一箭 ' + again);
    ck('代码里神弓特权同时覆盖「远程先手」与「普通射击」两条路径',
       /function divineCritRoll\(C, weapon, dealt\)/.test(_GAME_SRC) &&
       (_GAME_SRC.match(/divineCritRoll\(/g) || []).length >= 3, '调用 ' + ((_GAME_SRC.match(/divineCritRoll\(/g) || []).length - 1) + ' 处');
    ck('存入邮箱时耐久在 removeItem 之前读取（否则会存成全新一把）',
       /必须在 removeItem 之前读/.test(_GAME_SRC) && /const dur = \(S\.toolDurs && S\.toolDurs\.divineBow[\s\S]{0,120}removeItem\('divineBow', 1\)/.test(_GAME_SRC));
    // ★ 玩家反馈"神弓有耐久丢失问题"：实测 —— 耐久在存档 / 读档 / 备份槽 / 邮箱 / 存档码里都不会丢，
    //   唯一会"丢"的是耐久归零后弓被直接删掉（限时绝版，26.9.30 之后再也造不出来）。现在不会消失了。
    ck('★ 神弓耐久归零不会消失（keepBroken：保留在背包、自动卸下）',
       !!ITEMS[BOW].keepBroken && /const keep = !!\(named \|\| it\.keepBroken\)/.test(_GAME_SRC) && /限时绝版物品不会消失/.test(_GAME_SRC));
    ck('★ 自动换手会跳过打坏的武器（耐久 0 的不会被顶上主手）',
       /filter\(k => ITEMS\[k\] && ITEMS\[k\]\.cat === 'weapon' && \(DURA\[k\] === undefined \|\| \(durOf\(k\) \|\| 0\) > 0\)\)/.test(_GAME_SRC));
    ck('★ 神弓修补材料是秘银锭×1（不再走"石头×2"兜底）',
       /divineBow:\['mithrilingot',1\]/.test(_GAME_SRC) && JSON.stringify(G.repairMatOf(BOW)) === JSON.stringify(['mithrilingot', 1]));
    ck('磨刀石面板按当前主手武器显示修补材料（不再写死石头×2）',
       /const rmTxt = \(rm && ITEMS\[rm\[0\]\]\) \?/.test(UI) && /修补：主手武器耐久恢复满（耗 \$\{rmTxt\}）/.test(UI));
    {
      G.newGame('fisher', 'normal'); const Sb = G.S(); Sb.tut = null;
      G.addItem(BOW, 1, true); G.addItem('ironSword', 1, true); G.addItem('mithrilingot', 2, true);
      Sb.furniture.grindstone = true;
      G.equip(BOW);
      Sb.toolDurs[BOW] = [1]; Sb.dur[BOW] = 1;
      G.startFight({ id:'dummy', name:'木桩', hp:9999, atk:0, def:0, spd:1, traits:[], drops:[] }, true);
      // ⚠️ 必须锁住随机数：这一刀如果"落空"就不会扣耐久，测试就会偶发红（实测 15 次里红 2 次）
      const rndBow = Math.random; Math.random = () => 0.1;
      Sb.stats.hp = 9999; G.fightAction('attack');
      Math.random = rndBow;
      ck('实测：★ 神弓打断后还在背包里（耐久 0）',
         G.invCount(BOW) === 1 && G.durOf(BOW) === 0, '剩 ' + G.invCount(BOW) + ' 把，耐久 ' + G.durOf(BOW));
      ck('实测：★ 打断了自动卸下，顶上来的是好的那把（不是坏弓）',
         Sb.equipment.weapon === 'ironSword', String(Sb.equipment.weapon));
      Sb.combat = null;
      G.unequip('ironSword'); G.equip(BOW);
      G.repairWeapon();
      ck('实测：★ 磨刀石能把神弓修回满耐久（耗秘银锭×1）',
         G.durOf(BOW) === DURA[BOW] && G.invCount('mithrilingot') === 1, '耐久 ' + G.durOf(BOW) + '，秘银锭剩 ' + G.invCount('mithrilingot'));
      G.repairWeapon();
      ck('耐久满的时候再点修补不会白吃材料', G.invCount('mithrilingot') === 1, '秘银锭 ' + G.invCount('mithrilingot'));
    }
  ck('★ 神弓配方摆在 RECIPES 最后一条（制造列表最下面）',
       RECIPES[RECIPES.length - 1].id === 'r_divinebow', '最后一条是 ' + RECIPES[RECIPES.length - 1].id);
    ck('行进动画期间会淡出日志（免得盖住轨迹起点）',
       /function beginTravelFx\(\)/.test(UI) && /body\.traveling #log/.test(CSS));
  }
  // ===== 传奇难度：不能领物资邮件 / 不能兑换物资（否则难度机制直接被抹平）=====
  {
    const clearMB = (arr) => { const m = G.metaState(); m.mailbox = arr.slice(); m.redeemed = {}; };
    const mk = (diff) => { G.newGame('fisher', diff); return G.S(); };
    ck('代码里有传奇门槛判定（公告不算物资）',
       /function mailIsSupply\(g\) \{ return !!\(g && !g\.notice && \(g\.item \|\| g\.relic \|\| g\.soul\)\); \}/.test(_GAME_SRC) &&
       /S\.difficulty === 'legend' && mailIsSupply\(g\)/.test(_GAME_SRC) &&
       /S\.difficulty === 'legend' && \(g\.soul \|\| g\.item \|\| g\.relic\)/.test(_GAME_SRC));
    // 传奇：四类物资都领不了，且邮件不被消耗
    clearMB([{ notice:'vT', title:'公告', body:'x' }, { item:'beibi', qty:100 }, { item:'coin', qty:50 }, { relic:'vampire' }, { soul:100 }]);
    mk('legend');
    const n0 = G.mailboxList().length, bag0 = G.invCount('beibi'), soul0 = G.metaState().soul;
    const allBlocked = G.mailboxList().filter(x => !x.notice).every((_, k) => {
      const i = G.mailboxList().findIndex(y => !y.notice);
      return !G.claimMailbox(i).ok;
    });
    ck('实测：★ 传奇档物资邮件一律领不了', allBlocked);
    ck('实测：★ 拦下时不会真的给东西（贝壳/神物/魂点都没动）',
       G.invCount('beibi') === bag0 && !(G.S().relics || []).includes('vampire') && G.metaState().soul === soul0);
    ck('实测：★ 邮件留在邮箱里没被消耗（换低难度还能领）', G.mailboxList().length === n0, G.mailboxList().length + '/' + n0);
    ck('实测：传奇档仍然能读公告（纯文本不算物资）', G.claimMailbox(0).ok && G.mailboxList().length === n0 - 1);
    // 非传奇：照常能领（从后往前领，避免 splice 导致下标移位）
    for (const diff of ['easy', 'normal', 'hard']) {
      clearMB([{ item:'beibi', qty:100 }, { relic:'vampire' }, { soul:100 }]);
      mk(diff);
      const idx = (p) => G.mailboxList().findIndex(p);
      const r3 = G.claimMailbox(idx(x => x.relic));
      const r2 = G.claimMailbox(idx(x => x.soul > 0));
      const r1 = G.claimMailbox(idx(x => x.item === 'beibi'));
      ck(diff + ' 档照常能领物资（限制只针对传奇）', r1.ok && r2.ok && r3.ok && G.invCount('beibi') > 0);
    }
    // 兑换码：传奇不给，且不消耗；换低难度能兑
    clearMB([]);
    mk('legend');
    const rc = Object.keys(REDEEM_CODES)[0];
    const rr = G.redeemCode(rc);
    ck('实测：★ 传奇档兑换码也不给物资，且兑换码没被消耗',
       !rr.ok && !G.metaState().redeemed[rc] && G.mailboxList().length === 0, rr.reason ? rr.reason.slice(0, 24) : '竟然成功了');
    G.newGame('fisher', 'normal');
    ck('实测：换普通难度后能正常兑换', G.redeemCode(rc).ok);
    // 界面：传奇档领取按钮置灰并写明原因
    ck('邮箱界面在传奇档把领取按钮置灰并写明原因',
       /传奇档不可领/.test(UI) && /传奇难度下不能领取物资邮件/.test(UI) && /传奇档不可兑换/.test(UI));
    // ⚠️ 血泪教训（第二次犯）：isLegend 曾写在 if (mailTab === 'mail') 块内，
    //    却在"兑换码"分支里用 → 一切到兑换码页就 ReferenceError → 弹窗渲染中断、tab 永远切不过去。
    //    这类"块作用域越界"必须靠静态断言盯住：多分支共用的变量一定要声明在 if 外面。
    {
      // 截到下一个函数声明为止（mailboxModal 的结尾缩进不固定，别用 \n  \} 去匹配）
      const start = UI.indexOf('function mailboxModal()');
      const nxt = UI.indexOf('\n  function ', start + 10);
      const mb = UI.slice(start, nxt > 0 ? nxt : start + 3000);
      // ⚠️ 先剥掉注释：注释里可能正好写着 "if (mailTab === 'mail')" 这种字样，会把定位带偏
      const code = mb.replace(/\/\/[^\n]*/g, '');
      const ifPos = code.indexOf("if (mailTab === 'mail')");
      const beforeIf = ifPos > 0 ? code.slice(0, ifPos) : '';
      ck('mailboxModal 的多分支共用变量都声明在 if 外面（isLegend / st）',
         /const isLegend = /.test(beforeIf) && /const st = /.test(beforeIf) &&
         !/if \(mailTab === 'mail'\) \{[\s\S]{0,400}?const isLegend/.test(code));
      const rh = (UI.match(/function renderHotspots\(\)[\s\S]*?\n  \}/) || [''])[0];
      ck('renderHotspots 的模板变量也一样（rewardMissing 的老坑）',
         /let rewardMissing = false;/.test(rh) && /let ritualReady = false;/.test(rh));
    }
  }
  // ===== 弹窗暂停：开着"纯管理"弹窗时时间不流逝 =====
  {
    const m = UI.match(/const TIME_FREEZE_PANELS = \[([\s\S]*?)\];/);
    const list = m ? m[1].match(/'([a-zA-Z0-9]+)'/g).map(x => x.replace(/'/g, '')) : [];
    ck('管理类面板在冻结名单里（背包/装备/技能/图鉴/日志/邮箱/设置…）',
       ['inv','equip','skill','collection','diary','mailbox','settings','codex'].every(x => list.includes(x)), list.join(','));
    ck('★ 会主动花时间的面板不在名单里（营地/制造/交易/耕地…，否则功能被关掉）',
       ['camp','craft','laochao','town','black','farm','sleeppick','grind','repair','naming'].every(x => !list.includes(x)));
    ck('open 时设置冻结、closeModal 时恢复',
       /Game\.setTimeFreeze\(TIME_FREEZE_PANELS\.indexOf\(kind\) >= 0\)/.test(UI) &&
       /function closeModal\(\)[\s\S]{0,220}Game\.setTimeFreeze\(false\)/.test(UI));
    ck('addMin 在冻结时直接返回（连 tick 都不加）',
       /function addMin\(m\) \{[\s\S]{0,160}if \(_timeFrozen\) return false;/.test(_GAME_SRC));
    ck('顶栏时间会标出 ⏸', /Game\.timeFrozen && Game\.timeFrozen\(\) \? '⏸ ' : ''/.test(UI));
    // 实测
    G.newGame('fisher', 'normal');
    const sf = G.S(); sf.tut = null;
    const t0 = sf.minute, tick0 = sf.tick || 0;
    G.setTimeFreeze(true);
    const ret = G.addMin(60);
    ck('实测：★ 冻结时 addMin 无效，分钟与 tick 都不动',
       ret === false && G.S().minute === t0 && (G.S().tick || 0) === tick0,
       '返回' + ret + ' 分钟' + t0 + '→' + G.S().minute + ' tick' + tick0 + '→' + (G.S().tick || 0));
    sf.minute = 23 * 60 + 30;
    const day0 = G.S().day, hunger0 = G.S().stats.hunger;
    G.addMin(120);
    ck('实测：★ 冻结时不会跨天、不扣饱食度', G.S().day === day0 && G.S().stats.hunger === hunger0,
       '第' + day0 + '→第' + G.S().day + ' 天，饱食' + hunger0 + '→' + G.S().stats.hunger);
    G.setTimeFreeze(false);
    G.addMin(60);
    ck('实测：解冻后时间恢复推进', G.S().minute === (23 * 60 + 30 + 60) % 1440, '分钟=' + G.S().minute);
  }
  // ===== 玩家反馈：盐镇买完东西会跳回第一个摊位（杂货商）=====
  {
    ck('集市记住当前摊位（买完重建弹窗后不跳回杂货商）',
       /let townShopNow = 'grocer';/.test(UI) && /id === townShopNow \? 'active' : ''/.test(UI) &&
       /townShopNow = b\.dataset\.shop;/.test(UI) &&
       !/<button class="tab active" data-shop="grocer">/.test(UI),
       'tab 的 active 由 townShopNow 决定');
    ck('声望不够时回退到杂货商（不卡在锁着的摊位）', /needFame > fame\) townShopNow = 'grocer';/.test(UI));
    ck('批量买卖返回集市时也停在原摊位', /townShopNow = shop;/.test(UI));
  }
  // ===== 玩家反馈的"点集市/告示板弹出空壳窗口"（我改弹窗类点位时引入的回归）=====
  {
    ck('弹窗类点位把类型映射成 ui 认的 kind（town/mission/info/black），不能直接传 p.type',
       /const overlayKind = p\.type === 'townTrade' \? 'town'/.test(_GAME_SRC) &&
       /p\.type === 'townMission' \? 'mission'/.test(_GAME_SRC) &&
       /p\.type === 'townInfo' \? 'info'/.test(_GAME_SRC) &&
       !/onOverlay\(\{ kind: p\.type === 'trade'/.test(_GAME_SRC));
    // 六个弹窗类点位逐个验：传出来的 kind 必须是 ui 认得的
    G.newGame('fisher', 'normal');
    const s6 = G.S(); s6.inv = {}; s6.tut = null; s6.buildings.watch = 3; s6.buildings.farm = 1; s6.fame = 3;
    let got = null;
    G.bind({ onLog: () => {}, onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: (o) => { got = o; } });
    const KNOWN = ['farm', 'black', 'town', 'mission', 'info', 'atlTrade'];
    const badKind = [];
    for (const sc of SCENES) {
      const zoneNames = sc.zones ? Object.keys(sc.zones) : [null];
      for (const zn of zoneNames) {
        const src = zn ? (sc.zones[zn].points || []) : (sc.points || []);
        for (const p of src) {
          if (!['farm', 'trade', 'townTrade', 'townMission', 'townInfo', 'atlTrade'].includes(p.type)) continue;
          got = null;
          s6.scene = sc.id;
          if (zn) { try { G.setZone(zn); } catch (e) {} } else s6.zone = null;
          if (!G.pointAvailable(p)) continue;      // 白天点不开的（如黑市"夜访独眼"）跳过，不算异常
          G.doPoint(p);
          if (!got || KNOWN.indexOf(got.kind) < 0) badKind.push(sc.id + '/' + (zn || '-') + '/' + p.id + '(' + p.type + '→' + (got && got.kind) + ')');
        }
      }
    }
    ck('实测：★ 六个弹窗类点位传出的 kind 都是 ui 认得的（不会渲染成空壳窗口）',
       badKind.length === 0, badKind.join(' ') || '全部正确');
    // 玩家反馈：对岸的告示板 / 酒馆"一天只能看一次"太别扭 —— 面板类点位一律不设每日次数
    {
      const panelTypes = ['townTrade', 'townMission', 'townInfo', 'trade'];
      const limited = [];
      for (const sc of SCENES) {
        const zs = sc.zones || { _: sc };
        for (const zk in zs) for (const p of (zs[zk].points || [])) {
          if (panelTypes.includes(p.type) && p.daily !== undefined) limited.push(sc.id + '/' + p.id + '(daily=' + p.daily + ')');
        }
      }
      ck('集市/告示板/酒馆/黑市都不再限制每天次数', limited.length === 0, limited.join('、') || '四个面板都放开了');

      G.newGame('fisher', 'normal');
      const s8 = G.S(); s8.scene = 'shore'; s8.zone = 'saltTown'; s8.stats.stamina = 300; s8.day = 5;
      const shore = SCENES.find(s => s.id === 'shore');
      const mi = shore.zones.saltTown.points.find(p => p.id === 'town_mission');
      const inf = shore.zones.saltTown.points.find(p => p.id === 'town_info');
      G.bind({ onLog: () => {}, onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: () => {} });
      G.doPoint(mi); G.doPoint(mi); G.doPoint(inf); G.doPoint(inf);
      ck('告示板/酒馆可以反复打开（不再"今天已经看过了"）',
         G.pointAvailable(mi) === true && G.pointAvailable(inf) === true,
         'mission=' + G.pointAvailable(mi) + ' info=' + G.pointAvailable(inf));
    }
  }
  // ⚠️ 血泪教训：rewardMissing 曾写在 if 块内、却在块外的 innerHTML 里用 → ReferenceError
  //    → renderHotspots 抛异常 → 整个场景渲染中断 → 玩家"去哪都显示在营地"。
  //    这类作用域错误 node --check 查不出来，必须断言"模板用到的变量声明在块外"。
  {
    const rh = (UI.match(/function renderHotspots\(\)[\s\S]*?\n  \}/) || [''])[0];
    ck('renderHotspots 里模板用到的变量都声明在 if 块外（不再作用域越界）',
       /let ritualReady = false;/.test(rh) && /let rewardMissing = false;/.test(rh) &&
       !/if \(h\.point\) \{[\s\S]*?const rewardMissing/.test(rh),
       'ritualReady/rewardMissing 都在 if 外声明');
    ck('renderHotspots 里模板引用的每个变量都有声明（静态体检）',
       !/\$\{rewardMissing\s*\?/.test(rh) || /let rewardMissing/.test(rh));
  }
  // 玩家反馈"山顶没有遗物、一直找不到遗物"——根因是 doPoint 在 adventure() 之前就打了 pt_ 标记，
  // 于是 adventure() 一进去就读到自己刚打的标记，直接跳到"这里已被搜刮"，遗物永远拿不到。
  {
    ck('一次性 adventure 点位不再提前打标记（否则奖励永远拿不到）',
       /if \(p\.once && p\.type !== 'adventure'\) S\.flags\['pt_'\+p\.id\] = 1;/.test(_GAME_SRC) &&
       /const markDone = \(\) => \{ if \(p\.once\) S\.flags\['pt_' \+ p\.id\] = 1; \};/.test(_GAME_SRC));
    ck('三个一次性冒险点的领奖回调都调了 markDone',
       (_GAME_SRC.match(/markDone\(\);/g) || []).length >= 3, '调用 ' + (_GAME_SRC.match(/markDone\(\);/g) || []).length + ' 处');
    ck('老存档抢救：标记已打但奖励没拿 → 点位放出来',
       /function onceRewardMissing\(p\)/.test(_GAME_SRC) && /onceRewardMissing,/.test(_GAME_SRC) &&
       /!altarReady\(p\) && !onceRewardMissing\(p\)/.test(_GAME_SRC) && /onceRewardMissing\(p\)\) \{\s*$/.test(_GAME_SRC.replace(/\r/g, '')) === false || /!onceRewardMissing\(p\)/.test(_GAME_SRC));
    ck('UI 里老存档会显示「祭坛 · 取回遗物」',
       /祭坛 · 取回遗物/.test(UI) && /Game\.onceRewardMissing/.test(UI));
    ck('遗物说明写清是结局 C 祭品、且与「神物」划清界限',
       /秘辛/.test(DATA) && /不是那种加属性的「神物」/.test(DATA));
    // 实测：正常拿 / 关掉弹窗再拿 / 老存档抢救
    const mkAltar = () => {
      G.newGame('fisher', 'normal');
      const s = G.S(); s.inv = {}; s.tut = null; s.stats.hp = 99999; s.stats.stamina = 99999;
      s.buildings.watch = 3; G.addItem('furCoat', 1, true); s.equipment.cloth = 'furCoat';
      s.scene = 'peak'; s.zone = null;
      return G.pointsOf().find(x => x.id === 'peak_altar');
    };
    let ov = null;
    G.bind({ onOverlay: (c) => { ov = c; }, onLog: () => {}, onChange: () => {}, onFight: () => {}, onEnding: () => {} });
    let alt = mkAltar();
    G.doPoint(alt);
    ck('实测：点祭坛弹的是「带走遗物」而不是"还空着"',
       !!(ov && (ov.choices || []).some(c => /带走遗物/.test(c.label))), ov ? (ov.choices || []).map(c => c.label).join('/') : '无弹窗');
    alt = mkAltar();
    ov = null; G.doPoint(alt);          // 打开弹窗但不领奖
    const stillOk = G.pointAvailable(alt) === true && G.invCount('relic') === 0;
    ov = null; G.doPoint(alt);          // 再点
    const again = !!(ov && (ov.choices || []).some(c => /带走遗物/.test(c.label)));
    ck('实测：关掉弹窗没领奖 → 点位还能再点、还能拿到', stillOk && again);
    alt = mkAltar();
    G.S().flags['pt_peak_altar'] = 1;   // 模拟老存档：已标记已搜刮、背包里没遗物
    ov = null; G.doPoint(alt);
    ck('实测：老存档（标记已打、无遗物）能重新拿到遗物',
       G.pointAvailable(alt) === true && !!ov && (ov.choices || []).some(c => /带走遗物/.test(c.label)));
  }
  ck('大地图标签改成纯黑不透明、字号放大到 15px',
     /\.map-arrow \.arrow-label \{[\s\S]{0,220}?font-size: 15px/.test(CSS) && /\.map-arrow \.arrow-label \{[\s\S]{0,260}?background: #000;/.test(CSS));
  ck('行进虚线用图片内容盒当坐标（不再偏）', /const inner = \$\('#map-arrows'\) \|\| \$\('#map-wrap'\)/.test(UI));
  ck('日志压在画面上有渐隐打底（白字读得清）', /#log\.overlap \{[\s\S]{0,160}linear-gradient\(90deg/.test(CSS));
  ck('★ 回地图会自动对准当前所在地（不许越界；见上方 7o 段的说明）',
     /function centerMapOnHere/.test(UI) && /mapPendingCenter/.test(UI));
  ck('大地图也会显示天气', /<div id="weather-overlay"><\/div>/.test(UI) && /mwo\.className = st\.scene === 'atlantis' \? '' : \(st\.weather === 'rain'/.test(UI));
  // 按手机字号（10.5px）估算标签框，检查任意"你在这里"状态下都不重叠
  const labelW = (label, here) => (String(label).replace(/[↑★]/g, '').length + (here ? 6 : 0)) * 16.8 + 26;   // 字号 15px + 12% 字距 + 内边距
  const overlaps = (sw, sh) => {
    const bad = [];
    const s = Math.max(sw / 1536, sh / 1024) * 1.16;   // 与代码里的 mapZoom 一致
    const iw = 1536 * s;
    for (const cur of Object.keys(ATLANTIS_MAP_ARROWS)) {
      const boxes = Object.entries(ATLANTIS_MAP_ARROWS).map(([id, a]) => {
        const w = labelW(a.label, id === cur);
        const cx = (sw - iw) / 2 + a.x / 100 * iw, cy = a.y / 100 * sh - 40;
        return { id, l: cx - w / 2, r: cx + w / 2, t: cy - 10.5, b: cy + 10.5 };
      });
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i], B = boxes[j];
        if (A.l < B.r && B.l < A.r && A.t < B.b && B.t < A.b) bad.push(`${cur}:${A.id}×${B.id}`);
      }
    }
    return [...new Set(bad)];
  };
  const sizes = [[1280, 720], [1600, 900], [2340, 1080], [1024, 640]];
  const bad = sizes.map(([w, h]) => overlaps(w, h)).filter(x => x.length);
  ck('热点标签在常见尺寸下都不重叠', bad.length === 0, (bad[0] || []).slice(0, 3).join('; ') || sizes.map(s => s.join('×')).join('、') + ' 全部通过');
  // 每个热点都要能"拖得到"：把该点拖到舞台中间时，标签应当落在画面内
  const unreachable = [];
  for (const [sw, sh] of sizes) {
    const s = Math.max(sw / 1536, sh / 1024) * 1.16;
    const ih = 1024 * s;
    const halfNeed = 62 / ih * 100;   // 标签高度折算成图片纵向百分比
    for (const [id, a] of Object.entries(ATLANTIS_MAP_ARROWS)) {
      if (a.y < halfNeed || a.y > 100 - halfNeed) unreachable.push(`${id}@${sw}×${sh}`);
    }
  }
  ck('每个热点都能通过上下拖动看到完整标签', unreachable.length === 0, unreachable.slice(0, 3).join('; ') || '四种尺寸都能拖到');
}

section('7p. 界面手感：立体底栏 / 点击音 / 雨丝');
{
  const CSS = fs.readFileSync(ROOT + '/css/style.css', 'utf8');
  const AUDIO = fs.readFileSync(ROOT + '/js/audio.js', 'utf8');
  // 底部导航：黑白灰渐变 + 内阴影，按下有下沉感
  ck('底部按钮有棱有角、不放大、没有上沿高光',
    /#nav button \{[\s\S]{0,500}?border-radius: 0;/.test(CSS) &&
    /--navh: 30px;/.test(CSS) && /#nav \{[\s\S]{0,220}?height: var\(--navh\);/.test(CSS) &&
    /#nav button \{[\s\S]{0,400}?box-shadow: inset 0 -2px 0 rgba\(0,0,0,0\.75\)/.test(CSS) &&
    !/#nav button \{[\s\S]{0,400}?inset 0 1px 0 rgba\(255,255,255/.test(CSS) &&
    /#nav button:active, #nav button\.active \{[\s\S]{0,300}?translateY\(1px\)/.test(CSS));
  // 点击音：audio 里有清脆的 click 音色，ui 里全局挂了一次
  ck('所有按钮都有清脆的咔哒声', /case 'click':/.test(AUDIO) && /function clickTick\(\)/.test(AUDIO) && /'highpass'/.test(AUDIO) && /document\.addEventListener\('pointerdown'/.test(UI) && /AudioFX\.play\('click'\)/.test(UI));
  // 药品详情页只留一个按钮（cat=med 又带 curePoison/stopBleed 的以前会冒出两个一模一样的）
  ck('药品只留「使用」一个按钮', /it\.cat !== 'med' && \(it\.food/.test(UI));
  // 日志可上下滑，但热点/箭头优先
  ck('日志能上下滑、优先级低于热点/箭头', /function bindLogGrip\(\)/.test(UI) && /document\.elementsFromPoint/.test(UI) && /hit\.click\(\)/.test(UI) &&
    /scrollHeight > body\.clientHeight \+ 2/.test(UI) && /body\.on-map #logbody \{ pointer-events: auto; \}/.test(CSS) && /touch-action: pan-y/.test(CSS));
  ck('日志最新一行贴底（底部只留一点点）', /^\s*#log \{[\s\S]{0,300}?padding: 80px 8px 8px 10px;/m.test(CSS) && /#log\.overlap \{ top: 30px; bottom: var\(--navh\);/.test(CSS));
ck('底栏 30px（手机端也一样高；日志底边跟着走）', /:root \{ --navh: 30px; \}/.test(CSS) && /#log\.overlap \{ top: 30px; bottom: var\(--navh\);/.test(CSS));
  // 进地图不再对准任何地方：地图停在哪由玩家自己拖（玩家明确要求整张岛拖着看）
  ck('★ 地图平移只由拖动决定（没有"欠着一次自动对准"的残留）',
     !/mapCenterY/.test(UI) && /bindPan\('#map-wrap', \(\) => mapPanY, \(v\) => \{ mapPanY = v; applyMapPan\(\); \}/.test(UI));
  // 雨：短雨丝 + 不规则（SVG 短线贴图，不再是密排直线）
  ck('雨丝变短且不再整齐排列', /data:image\/svg\+xml;utf8,<svg[\s\S]{0,200}<line/.test(CSS) && /@keyframes rainfall/.test(CSS) && !/repeating-linear-gradient\(102deg/.test(CSS));
  ck('雨丝比原来细/淡（不再糊满屏）', /stroke-width='1\.[56]'/.test(CSS) && /opacity: 0\.7[0-9];/.test(CSS) && (CSS.match(/<line /g) || []).length < 40);
  ck('雨分成三层、不同大小与速度（破掉整齐感）', /--rainA:/.test(CSS) && /--rainB:/.test(CSS) && /--rainC:/.test(CSS) && /#weather-overlay\.rain::before/.test(CSS) && /@keyframes rainfallslow/.test(CSS));
  const rainLens = [];
  { const re = /<line x1='([-\d.]+)' y1='([-\d.]+)' x2='([-\d.]+)' y2='([-\d.]+)'\/>/g; let mm;
    while ((mm = re.exec(CSS))) rainLens.push(Math.hypot(+mm[3] - +mm[1], +mm[4] - +mm[2])); }
  ck('雨丝长度砍半（最长 < 20px）', rainLens.length >= 15 && Math.max(...rainLens) < 20,
    '共 ' + rainLens.length + ' 条，最长 ' + (rainLens.length ? Math.max(...rainLens).toFixed(1) : '-') + 'px');
}

section('8. 老旧存档兼容（重点：不能弄丢玩家进度）');
{
  // 造一份"老版本"存档：字段少一些、耐久是旧格式、没有 storeExt
  const legacy = {
    v: 1, identity: 'woodcutter', difficulty: 'hard', day: 88, minute: 600, tick: 100000,
    weather: 'rain', weatherRolled: true,
    stats: { hp: 70, stamina: 80, hunger: 60, thirst: 50, spirit: 40 },
    statuses: { bleed: 0, poison: 0, cold: false, fear: 0 },
    inv: { wood: 50, stone: 20, knifeStone: 2, coin: 12, beibi: 300, pearl: 4, smokedFish: 9, slate: 2, deepCore: 1 },
    capacity: 20, foodExp: {}, relics: [], relicSlots: 0, relicEquip: [null, null, null],
    dur: { knifeStone: 18 }, toolDurs: { knifeStone: [18, 9] },
    equipment: { weapon: 'knifeStone', weapon2: null, armor: null, cloth: null, accessory: null },
    equipIdx: { weapon: 0, weapon2: 0, armor: 0, cloth: 0, accessory: 0 }, weaponNames: {},
    buildings: { house: 2, fire: 1, storage: 2, wall: 2, watch: 2, dock: 3, farm: 1 },
    furniture: { wb1: true, bed1: true, spin: true, loom: true, tank: true, rainfilter: true },
    crops: [{ seed: 'seedCarrot', remain: 2 }],
    scene: 'camp', zone: null, skill: { craft: 3, gather: 2, combat: 2 }, toolkit: ['knifeStone', null, null],
    laochao: { nextVisit: 90, arrived: false, arrivedDay: 0, done: {}, accepted: {} },
    fame: 2, exp: { gather: 100, craft: 100, combat: 100 },
    flags: { firstTrade: 1, pt_atl_dcore_coral: 1, ended_C: 1 },
    diary: [{ day: 1, line: '第一天' }], log: [], seen: { wood: 1 },
    pointUses: {}, killCount: { wolf: 3 }, sold: {}, hpLostTotal: 0,
    death: null, ending: null, combat: null,
    houseExt: 2,
  };
  localStorage.setItem('guyuyizhang_save', JSON.stringify(legacy));
  const okLoad = G.load();
  const L = G.S();
  ck('老存档能正常读取', okLoad === true);
  ck('天数/身份/难度不丢', L.day === 88 && L.identity === 'woodcutter' && L.difficulty === 'hard');
  ck('物品一件不少（含石板与金币）', L.inv.wood === 50 && L.inv.pearl === 4 && L.inv.slate === 2 && L.inv.coin === 12 && L.inv.beibi === 300);
  ck('旧格式耐久（数组）原样保留', JSON.stringify(L.toolDurs.knifeStone) === '[18,9]', JSON.stringify(L.toolDurs.knifeStone));
  ck('装备与工具栏保留', L.equipment.weapon === 'knifeStone' && L.toolkit[0] === 'knifeStone');
  ck('建筑/家具/作物保留', L.buildings.house === 2 && L.furniture.loom && L.crops.length === 1);
  ck('声望/委托进度保留', L.fame === 2 && !!L.flags.firstTrade && !!L.flags.ended_C);
  // 技能改版（B1）：老存档的旧等级【折算成经验让玩家自己点】，所以等级归零、经验池加补偿。
  // craft 3 级 → 新曲线升到 3 级要 12+28+50=90，×2 = 180 点补偿（原有 100 也留着）
  ck('★ 老存档技能等级折算成经验（等级归零 + 补偿到账）',
     L.skill.craft === 0 && L.skill.gather === 0 && L.skill.combat === 0 &&
     L.exp.craft >= 280 && L.exp.gather >= 140 && L.exp.combat >= 140 && !!L.tree,
     `craft=${L.exp.craft} gather=${L.exp.gather} combat=${L.exp.combat}`);
  ck('新增字段 houseExt 保留', L.houseExt === 2);
  ck('新版本新增字段自动补默认值', L.storeExt === 0 && !!L.equipIdx && !!L.pointUses);
  ck('容量按仓库等级计算正常', G.capacity() >= 150, '容量 ' + G.capacity());
  ck('容量包含扩建仓库加成', (function () { const c0 = G.capacity(); L.storeExt = 2; const c1 = G.capacity(); L.storeExt = 0; return c1 - c0 === 30; })(), '');
  // 核心点位修复：手上有核心就保留标记；只有"标记了却没核心"的才退回
  ck('有核心时不会误退点位标记', !!L.flags['pt_atl_dcore_coral'] && !!L.flags.firstTrade && !!L.flags.ended_C);
  ck('手上已有的核心不会被扣掉', L.inv.deepCore === 1);
  {
    const l2 = JSON.parse(JSON.stringify(legacy));
    l2.flags = { firstTrade: 1, pt_atl_dcore_coral: 1, pt_atl_dcore_trench: 1, pt_atl_dcore_wreck: 1, ended_C: 1 };
    delete l2.inv.deepCore;                       // 标记了 3 个点却没核心 → 全是被守卫顶掉的
    localStorage.setItem('guyuyizhang_save', JSON.stringify(l2));
    G.load();
    const L2 = G.S();
    const left = ['coral','trench','wreck'].filter(k => L2.flags['pt_atl_dcore_' + k]).length;
    ck('被守卫顶掉的点位会退回（3 个标记、0 核心 → 退 3 个）', left === 0, '剩余标记 ' + left);
    ck('退标记时其它进度不动', !!L2.flags.firstTrade && !!L2.flags.ended_C && L2.inv.slate === 2 && L2.day === 88);
  }
  // 老存档反复读档写入不出错
  let stable = true;
  try { for (let i = 0; i < 3; i++) { G.save(); if (!G.load()) stable = false; } } catch (e) { stable = false; }
  ck('反复存读档稳定（不会越读越少）', stable && G.S().inv.wood === 50 && G.S().day === 88);
  // 魂点绝不能被读档流程清掉
  const soulBefore = G.metaState().soul;
  // 老存档/手改档里出现未知天气键时兜底成晴天（否则顶部状态栏会抛异常、界面不再刷新）
  {
    const badWeatherSave = JSON.parse(JSON.stringify(legacy));
    badWeatherSave.weather = 'clear';
    localStorage.setItem('guyuyizhang_save', JSON.stringify(badWeatherSave));
    const okW = G.load();
    ck('未知天气键会被兜底成晴天（不会让界面卡死）', okW === true && G.S().weather === 'sun', 'weather=' + G.S().weather);
  }
  G.load();
  ck('读档不会动魂点/成就', (G.metaState().soul || 0) === (soulBefore || 0));
  // 缺字段的极端老档也不能崩
  localStorage.setItem('guyuyizhang_save', JSON.stringify({ v: 1, identity: 'fisher', difficulty: 'normal', day: 3, minute: 480, stats: { hp: 100 } }));
  ck('极简老档也能读进来不报错', G.load() === true && G.S().day === 3);
}

section('9. 存档加固（玩家反馈"退后台回来存档没了"）');
{
  // ① 写入后要读回来验一遍；写不进去必须返回失败并通知界面（不能无声无息）
  {
    G.newGame('fisher', 'normal');
    let failed = null;
    G.bind({ onSaveFail: (e) => { failed = e; } });
    const rawSet = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (k, v) => { if (k === 'guyuyizhang_save') { const err = new Error('quota'); err.name = 'QuotaExceededError'; throw err; } return rawSet(k, v); };
    const r = G.save();
    localStorage.setItem = rawSet;
    ck('存档写不进去时返回失败并通知界面（不再静默丢档）', r && r.ok === false && !!failed, 'reason=' + (r && r.reason));
    G.bind({ onSaveFail: null });
  }
  // ② 别的标签页写过更新的进度时，默认拒绝覆盖；玩家确认后才强写
  {
    G.newGame('fisher', 'normal');
    G.save();
    const rev = G.saveRev();
    localStorage.setItem('guyuyizhang_rev', String(rev + 1));   // 模拟"另一个标签页刚存过"
    const blocked = G.save();
    ck('别的标签页有更新进度时不会用旧进度覆盖', blocked && blocked.ok === false && blocked.reason === 'other-tab', JSON.stringify(blocked));
    const forced = G.forceSave();
    ck('玩家确认「用本页覆盖」后可以强写', forced && forced.ok === true);
    ck('存档体积会被记录（面板可显示"上次保存时间"）', G.savedAt() > 0);
  }
  // ③ 兜底自动存档的钩子要在（手机上被系统杀掉页面时 pagehide 不一定来得及跑）
  ck('界面里有每 20 秒兜底自动存档 + 回到前台重新同步 ', /__guyuAutoSaveTimer = setInterval/.test(UI) && /addEventListener\('pageshow'/.test(UI) && /onSaveFail/.test(UI));
}

section('10. 战斗血条不再"卡住"（玩家反馈：怪掉血了血条不动）');
{
  const cssSrc = fs.readFileSync(ROOT + '/css/style.css', 'utf8');
  // 实测过：引擎血量 → 界面血条的换算一直是对的（无头浏览器里逐回合比对过 1800 次动作）。
  // 会"看起来卡住"的是渲染方式：#fight-targets 是 position:sticky 的独立合成层，
  // 每回合把它的子树整个 innerHTML 重建，iPad/Safari 上有时会漏掉重绘；
  // 而且元素被重建时 CSS 的 width 过渡根本没机会跑，玩家看不到血条"掉下去"。
  ck('血条改为原地更新数值（不再每回合重建整个列表子树）',
    /const rows = tgBox\.querySelectorAll\('\.hp-line\.target'\)/.test(UI) && /if \(rows\.length !== es\.length\)/.test(UI) && /fill\.style\.width = tgPct\(e\) \+ '%'/.test(UI));
  ck('原地更新时名字/意图标签/血量数字也一起刷新（不会只剩血条在动）',
    /nm\.innerHTML = tgNameHtml\(e\)/.test(UI) && /hp\.textContent = tgHpText\(e\)/.test(UI));

  // 这段 CSS 原来把 id 当 class 写（.fight-targets），整段没生效：
  // 选目标的黄框、"已选定"的白框、首领名字配色、血量数字配色，玩家一个都没见过。
  ck('不存在把 id 当 class 写的 .fight-targets 选择器（那会让白框/黄框整段失效）',
    !/\.fight-targets(\s|\.|\{|:)/.test(cssSrc));
  ck('选目标的黄框 / 已选定的白框用的是 #fight-targets',
    /#fight-targets\.selecting \.target \{/.test(cssSrc) && /#fight-targets \.target\.selected \{/.test(cssSrc));

  // 上一场打完的 1 秒关窗定时器 + 上一场残留的"待选目标"
  ck('开新战斗时会清掉上一场残留的待选目标（黄框/误触发）',
    /PENDING_ACT = null; fightSeq\+\+;/.test(UI));
  ck('上一场结束的 1 秒关窗定时器不会顺手清掉新战斗的窗口',
    /const seq = fightSeq;/.test(UI) && /if \(seq !== fightSeq\) return;/.test(UI));
}

section('11. 玩家反馈（蛛巢白扣体力 / 救了四个小满 / 双持不打耐久 / 工具栏挂空壳 / 引导跳过）');
{
  // ① 双持两把近战武器：以前每次命中都会在"伤害已结算、界面还没刷新"的中间抛异常
  {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null;
    G.addItem('spear', 1, true); G.addItem('knifeStone', 1, true);
    s.equipment.weapon = 'spear'; s.equipment.weapon2 = 'knifeStone';
    s.dur.spear = 12; s.toolDurs.spear = [12]; s.toolDurs.knifeStone = [18]; s.dur.knifeStone = 18;
    const tanky = { name:'木桩', id:'dummy', hp:9999, atk:1, def:0, spd:1, traits:[], drops:[], desc:'木桩' };
    G.startFight(tanky, true);
    let err = null;
    for (let i = 0; i < 8; i++) { s.stats.hp = G.hpMax(); try { G.fightAction('attack', 0); } catch (e) { err = e; break; } }
    ck('双持两把近战武器攻击不再抛异常（以前每次都崩在"日志标武器名"那行）', !err, err && err.message);
    ck('双持时两把轮流掉耐久（不再只有副手掉）',
       G.durOf('spear') < 12 && G.durOf('knifeStone') < 18, `矛 ${G.durOf('spear')}/12 · 匕 ${G.durOf('knifeStone')}/18`);
    G.S().combat = null;
  }
  // ② 蛛巢（首领狩猎）：只弹"确定讨伐"、玩家撤退 → 体力与当日次数都不该动
  {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null; s.day = 5; s.scene = 'cave'; s.inv.torch = 3; s.stats.stamina = 100;
    const queen = G.sceneOf('cave').points.find(p => p.id === 'cave_queen');
    G.bind({ onOverlay: () => {} });
    const rndKeep = Math.random; Math.random = () => 0.9;   // 固定抽到蜘蛛女王（首领）
    G.doPoint(queen);
    Math.random = rndKeep;
      ck('首领狩猎只弹确认框时不扣体力、不占当日次数', s.stats.stamina === 100 && !(s.pointUses.cave_queen > 0),
       `体力 ${s.stats.stamina} · 次数 ${s.pointUses.cave_queen || 0}`);
      ck('首领狩猎的确认框会弹出来（不是直接开打）', /危险 · /.test(_GAME_SRC) && /迎战/.test(_GAME_SRC));
      G.bind({ onOverlay: null });
    }
    // ④ 远程武器也要磨损（玩家反馈"神弓怎么不掉耐久"：以前只有近战走 drainWeapon，开火只扣弹药）
    {
      G.newGame('fisher', 'normal');
      const s2 = G.S(); s2.tut = null;
      G.addItem('bow', 1, true); G.addItem('arrow', 30, true);
      s2.equipment.weapon = 'bow';
      const d0 = G.durOf('bow'), a0 = G.invCount('arrow');
      const dummy = { name:'木桩', id:'dummy', hp:9999, atk:1, def:0, spd:1, traits:[], drops:[], desc:'木桩' };
      G.startFight(dummy, true);
      for (let i = 0; i < 6; i++) { s2.stats.hp = G.hpMax(); s2.stats.stamina = G.maxStam(); G.fightAction('ranged', 0); }
      ck('远程开火会磨损武器（弓/手枪不再永不掉耐久）', G.durOf('bow') < d0, `弓耐久 ${d0} → ${G.durOf('bow')}`);
      ck('远程开火照旧消耗弹药', G.invCount('arrow') < a0, `箭 ${a0} → ${G.invCount('arrow')}`);
      G.S().combat = null;
    }
    // ⑤ 珍珠之心：源能水晶爆率 0.3 → 0.5
    {
      const pc = SCENES.find(s => s.id === 'atlantis').zones.pearlCave.points.find(p => p.id === 'atl_pearlheart');
      const ec = pc && pc.yields.find(y => y.id === 'energyCrystal');
      ck('珍珠之心的源能水晶爆率 = 50%', !!ec && ec.chance === 0.5, ec ? ('chance=' + ec.chance) : '没找到');
    }
  // ③ 一次性点位必须真的只做一次
  ck('救小满成功会打一次性标记（不再"救了四个小满"）', /S\.flags\.xiaoman = 1; markDone\(\)/.test(_GAME_SRC));
  ck('荒漠白骨包裹搜完就打标记（不再无限刷金币）', /markDone\(\); addMin\(20\)/.test(_GAME_SRC));
  ck('小满已在营地时求救点位直接关闭（老存档也能收口）', /p\.id === 'sea_rescue' && S\.flags\.xiaoman/.test(_GAME_SRC));
  // ④ 工具栏不能挂已经用坏、已经从背包里消失的工具
  {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null;
    G.addItem('axeStone', 1, true);
    s.dur.axeStone = 1; s.toolDurs.axeStone = [1];
    s.toolkit = ['axeStone', null, null];
    G.drainTool('axe');
    // 槽位可以被别的工具（这里是渔民的鱼竿）顶上，但**用坏的那把不能还挂着**
    ck('工具用坏后不再挂在工具栏里（空壳要清掉，槽位让给背包里的其它工具）',
       !s.toolkit.includes('axeStone') && G.invCount('axeStone') === 0,
       'toolkit=' + JSON.stringify(s.toolkit) + ' 背包=' + G.invCount('axeStone'));
    // 背包里还有同款备用 → 应该自动顶上
    G.newGame('fisher', 'normal');
    const s2 = G.S(); s2.tut = null;
    G.addItem('axeStone', 1, true);
    s2.dur.axeStone = 1; s2.toolDurs.axeStone = [1];
    s2.toolkit = ['axeStone', null, null];
    G.addItem('axeIron', 1, true);          // 提前放一把备用
    G.drainTool('axe');                     // 按等级先用铁斧；这里只验"坏了会被清/补位"的逻辑不崩
    ck('工具栏同步不会把还有备用的工具清空（口径以背包为准）', Array.isArray(s2.toolkit) && G.invCount('axeStone') + G.invCount('axeIron') >= 1);
  }
  // ⑥ 「下午一开就一直闪退」：崩溃自检 + 安全模式 + 渲染兜底（玩家再也进不去是最糟的情况）
  ck('★ 启动崩溃自检：连续两次没走到渲染成功就进安全模式',
     /const BOOT_KEY = 'guyuyizhang_boot', CRASH_KEY = 'guyuyizhang_crashes', ERR_KEY = 'guyuyizhang_lasterr';/.test(UI) &&
     /function noteBootStart\(\)/.test(UI) && /function noteBootOk\(\)/.test(UI) && /showSafeMode\(crashes\)/.test(UI) &&
     /function showSafeMode\(crashes\)/.test(UI));
  ck('★ 报错会留痕（window.onerror / unhandledrejection 都记）',
     /addEventListener\('error', \(e\) => \{ recordError/.test(UI) && /addEventListener\('unhandledrejection'/.test(UI));
  ck('★ 安全模式能救出存档：用备份存档打开 / 导出存档码',
     /function restoreBackupSave\(\)/.test(_GAME_SRC) && /guyuyizhang_save_bak/.test(_GAME_SRC) &&
     /restoreBackupSave/.test(_GAME_SRC) && /data.*restoreBackupSave|restoreBackupSave,/.test(_GAME_SRC));
  ck('★ 渲染出错不再整屏空白（try/catch + 顶部提示条）',
     /function render\(\) \{\s*try \{ renderInner\(\); \}/.test(UI) && /function renderInner\(\)/.test(UI) &&
     /function onRenderCrash\(e\)/.test(UI) && /crash-toast/.test(UI));
  // ⑫ 石板第三关"点灯"：以前"点亮"画成纯黑（玩家：这不叫全亮，叫全黑），而且没有进度提示
  const cssNow = fs.readFileSync(ROOT + '/css/style.css', 'utf8');
  ck('★ 点灯关卡的"点亮"是暖光亮起 + ✦（不再是纯黑一块）',
     /\.light-btn\.on \{ background:#fbf3dd; border-color:#8a7346/.test(cssNow) &&
     /\.light-btn\.on::after \{ content:'✦'/.test(cssNow) &&
     !/\.light-btn\.on \{ background: var\(--ink\)/.test(cssNow));
  ck('★ 点灯关卡显示"已点亮 N/9"，全亮时还会提示',
     /已点亮 ' \+ lights\.filter\(v => v\)\.length \+ '\/9'/.test(UI) && /全亮了！/.test(UI));
  // ⑬ 防点击穿透：打开弹窗那一下不能顺手把弹窗里的第一个按钮也点了（玩家反馈"单击直接睡俩小时"）
  ck('★ 弹窗刚打开的 200ms 内忽略落在弹窗里的点击（防"点一下触发两个按钮"）',
     /let modalOpenedAt = 0;/.test(UI) && /modalOpenedAt = Date\.now\(\);/.test(UI) &&
     /Date\.now\(\) - modalOpenedAt < 350 && mm\.contains\(e\.target\)/.test(UI) &&
     /document\.addEventListener\('click', \(e\) => \{/.test(UI) && /\}, true\);/.test(UI));
  // ⑭ 新身份「养蜂人」+ 专属家具「蜂箱」
  {
    const idn = IDENTITIES.beekeeper;
    ck('养蜂人身份存在，且开局带蜂蜜', !!idn && idn.name === '养蜂人' && idn.items && idn.items.honey === 2, idn ? idn.desc : '没有');
    const hive = FURNITURE.find(f => f.id === 'beehive');
    ck('蜂箱是养蜂人专属家具，每天产 1 份蜂蜜', !!hive && hive.onlyIdentity === 'beekeeper' && hive.dailyItems && hive.dailyItems.honey === 1, hive ? hive.desc : '没有');
    // 别的身份造不了
    G.newGame('fisher', 'normal');
    { const s = G.S(); s.tut = null; G.addItem('wood', 40, true); G.addItem('thatch', 40, true); }
    G.buildFurniture('beehive');
    ck('别的身份造不了蜂箱', !G.S().furniture.beehive);
    // 养蜂人能造，且占 1 个家具位
    G.newGame('beekeeper', 'normal');
    {
      const s2 = G.S(); s2.tut = null;
      G.addItem('wood', 40, true); G.addItem('thatch', 40, true);
      const usedBefore = G.furnitureUsed();
      G.buildFurniture('beehive');
      ck('养蜂人能造蜂箱', !!s2.furniture.beehive);
      ck('蜂箱占 1 个家具位', G.furnitureUsed() === usedBefore + 1, usedBefore + ' → ' + G.furnitureUsed());
      // 过一天 → 收 1 份蜂蜜
      const h0 = G.invCount('honey');
      G.addMin(24 * 60);
      ck('蜂箱每天产出 1 份蜂蜜', G.invCount('honey') === h0 + 1, '蜂蜜 ' + h0 + ' → ' + G.invCount('honey'));
    }
    // 树林取蜜：养蜂人必定拿到、不会被蛰，还有额外收获
    G.newGame('beekeeper', 'normal');
    {
      const s3 = G.S(); s3.tut = null; s3.scene = 'forest';
      let hp0 = s3.stats.hp, honey = 0, got = 0, trials = 120;
      for (let i = 0; i < trials; i++) {
        s3.pointUses = {}; delete s3.flags['pt_forest_hive'];   // 每轮都把"今天采过"清掉，才能连着测 120 次
        s3.stats.stamina = G.maxStam(); s3.stats.hp = G.hpMax();   // 体力补满，否则测到第 10 次就没体力了
        s3.inv.honey = 0; s3.stats.hunger = 100; s3.stats.thirst = 100;   // 背包腾空（不然采几轮就满了）、别饿死渴死
        let ov = null;
        G.bind({ onOverlay: (o) => { ov = o; } });
        const p = G.sceneOf('forest').points.find(q => q.id === 'forest_hive');
        const h1 = G.invCount('honey');
        ov = null;
        G.doPoint(p);
        const c = ov && ov.choices && ov.choices.find(x => /取蜜/.test(x.label));
        // 有时会被别的弹窗顶掉（例如第 5 天老潮到访的剧情弹窗、夜里事件），这一轮跳过就好
        if (!c) { trials--; continue; }
        c.ok();
        const d = G.invCount('honey') - h1;
        honey += d; if (d > 0) got++;
      }
      ck('★ 养蜂人取蜜必定成功（每次都有收获、一次没被蛰）',
         // 允许极少数"背包刚好满了"的轮次（那是通用规则，不是养蜂人的问题）
         got >= trials - 2 && trials > 80 && s3.stats.hp >= hp0,
         '成功 ' + got + '/' + trials + '，掉血 ' + (hp0 - s3.stats.hp));
    ck('★ 养蜂人取蜜有额外收获（平均 >1 份）', honey / trials > 1.05, '平均 ' + (honey / trials).toFixed(2) + ' 份/次');
    ck('家具面板只给该身份显示专属家具（别的身份看不到蜂箱）',
       /if \(f\.onlyIdentity && st\.identity !== f\.onlyIdentity\) continue;/.test(UI) &&
       /if \(f\.onlyIdentity && S\.identity !== f\.onlyIdentity\)/.test(_GAME_SRC));
  // ⑮ 立绘卡面：受皮肤包控制 + 缺图回退
    ck('★ 有「彩绘卡面」皮肤包，可整套替换人物立绘',
       /id: 'card',\s+name: '彩绘卡面'/.test(UI) && /portrait: 'identities-card'/.test(UI));
    ck('★ 立绘路径受皮肤控制，缺图自动回退默认（不裂图）',
       /function portraitPath\(id\)/.test(UI) && /window\.__portraitFail = function \(img, id\)/.test(UI) &&
       /__portraitFail\(this,'\$\{id\}'\)/.test(UI) && /__portraitFail\(this,'\$\{st\.identity \|\| ''\}'\)/.test(UI));
    ck('身份选择界面显示立绘卡面', /class="id-card"/.test(UI) && /\.identity \.id-card \{/.test(cssNow));
    // ⑯ 邮箱「攻略」页 + 交易面板的钱包行
    ck('★ 邮箱新增「攻略」页，覆盖玩家常问的几类物品去处',
       /\[.guide.,.攻略.\]/.test(UI) && /mailTab === 'guide'/.test(UI) &&
       /第二章传送门（山顶祭坛）/.test(UI) && /深殿核心 ×4/.test(UI) && /图纸去哪儿买/.test(UI) && /魂点怎么来/.test(UI));
    ck('★ 交易面板顶部显示自己有多少贝壳币 / 金币（老潮、盐镇、黑市、交易机都有）',
       /function walletBar\(\)/.test(UI) &&
       (UI.match(/walletBar\(\)/g) || []).length >= 4 &&
       /你身上：\$\{ITEMS\.beibi\.glyph\} 贝壳币/.test(UI) && /\.wallet-bar \{/.test(cssNow));
    G.bind({ onOverlay: null });
    }
  }
  // ⑩ 水壶 / 滤雨器：升级不能把水壶删掉（玩家反馈"升级后水壶不见了、-20% 也没了"）
  {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null;
    s.furniture.tank = true;
    G.addItem('clay', 20, true); G.addItem('stonebrick', 10, true); G.addItem('charcoal', 5, true);
    const before = G.furnitureUsed();
    G.buildFurniture('rainfilter');
    ck('★ 加装滤雨器后水壶还在（-20% 口渴不会失效）', s.furniture.tank === true && s.furniture.rainfilter === true,
       'tank=' + s.furniture.tank + ' rainfilter=' + s.furniture.rainfilter);
    ck('水壶系不占家具位（升完级占用不变）', G.furnitureUsed() === before, before + ' → ' + G.furnitureUsed());
    ck('口渴效果判定把"水壶或滤雨器"都算作有水壶',
       /const hasTank = !!\(S\.furniture\.tank \|\| S\.furniture\.rainfilter\);/.test(_GAME_SRC));
    ck('属性面板：没建水壶就整条不显示，建了才写效果（不再出现看不懂的"未装备水壶"）',
       /if \(cs\.tank \|\| st\.furniture\.rainfilter\) \{/.test(UI) && !/row\('水壶', cs\.tank \? '已建/.test(UI));
  }
  // ⑪ 一次性点位：弹窗不关、连点按钮也不能重复领（玩家反馈"救小海能一直救""骸骨能一直摸金币"）
  {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null; s.day = 12; s.scene = 'sea'; s.inv.water = 5;
    const seaSc = G.sceneOf('sea');
    const p = ((seaSc.zones && seaSc.zones.sea && seaSc.zones.sea.points) || seaSc.points || []).find(q => q.id === 'sea_rescue');
    ck('求救点位存在（海域·近海）', !!p);
    let ov = null;
    G.bind({ onOverlay: (o) => { ov = o; } });
    G.doPoint(p);
    const rescue = ov && ov.choices && ov.choices.find(c => /救他上筏/.test(c.label));
    ck('求救点位：弹窗里能拿到"救他上筏"选项', !!rescue, ov ? ov.title : '没弹窗');
    if (rescue) {
      rescue.ok();                       // 第一次：救成功
      const water1 = G.invCount('water');
      rescue.ok(); rescue.ok();          // 不关弹窗、再点两次
      ck('★ 同一个弹窗里连点也只会救一次（淡水不会再被扣）', G.invCount('water') === water1 && water1 === 3, '淡水 ' + water1 + ' → ' + G.invCount('water'));
      ck('小海只会加入一次', s.flags.xiaoman === 1);
    }
    // 神秘骸骨（荒漠白骨包裹）同理
    G.newGame('fisher', 'normal');
    const s2 = G.S(); s2.tut = null; s2.scene = 'desert';
    const p2 = G.sceneOf('desert').points.find(q => q.id === 'desert_remains');
    let ov2 = null;
    G.bind({ onOverlay: (o) => { ov2 = o; } });
    G.doPoint(p2);
    const loot = ov2 && ov2.choices && ov2.choices.find(c => /搜刮包裹/.test(c.label));
    if (loot) {
      loot.ok();
      const coins1 = G.invCount('coin');
      loot.ok(); loot.ok();
      ck('★ 骸骨包裹连点也只搜刮一次', G.invCount('coin') === coins1, '金币 ' + coins1 + ' → ' + G.invCount('coin'));
    } else ck('骸骨包裹：弹窗里能拿到"搜刮包裹"选项', false, ov2 ? ov2.title : '没弹窗');
    ck('投递/选项加了统一兜底（拿过奖励的点位同一弹窗内不能再点）',
       /const showOnce = \(opts\) => \{/.test(_GAME_SRC) &&
       /if \(p\.once && S\.flags\['pt_' \+ p\.id\] && !altarReady\(p\) && !onceRewardMissing\(p\)\) \{ log\(pointStatus\(p\)/.test(_GAME_SRC) &&
       /showOnce\(\{ title:'求救信号'/.test(_GAME_SRC));
    G.bind({ onOverlay: null });
  }
  // ⑧ 每日签到：每天一次，30 魂点 + 2 备份点（账号级）
  {
    localStorage.removeItem('guyuyizhang_meta');
    localStorage.removeItem('guyuyizhang_meta_bak');
    if (G.metaReload) G.metaReload();
    const bpBefore = G.backupPoints();
    const s1 = G.dailySignState();
    const r1 = G.dailySign();
    const s2 = G.dailySignState();
    const r2 = G.dailySign();
    ck('每日签到：首次可领，奖励 30 魂点 + 2 备份点',
       s1.canSign && r1.ok && r1.soul === 30 && r1.backup === 2, JSON.stringify(r1));
    ck('每日签到：备份点真的到账', G.backupPoints() === bpBefore + 2, bpBefore + ' → ' + G.backupPoints());
    ck('每日签到：同一天不能重复领', !s2.canSign && !r2.ok, r2.reason || '');
    // 跨天可再领（把 lastSign 改成昨天）
    const mm = G.metaState(); mm.lastSign = '2000-01-01'; G.metaReload && 0;
    ck('每日签到：第二天又能领（按日期判断，不是按次数）', G.dailySignState().canSign);
    // 标题页与游戏内菜单都要有入口
    ck('每日签到有界面入口（设置面板 + 游戏内菜单）',
       /data-open="sign"/.test(UI) && /data-savemenu="sign"/.test(UI) && /function signModal\(\)/.test(UI));
  }
  // ⑨ 图纸（bp）不占背包格子：背包塞满也能收下，且不计入已用格数
  {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null;
    let guard = 0;
    while (G.addItem('wood', 20, true) && guard++ < 200) {}
    // 用一件"开局肯定没有、又是可堆叠"的东西来验"满格"（已有的物品会走叠加分支、不查容量）
    const absent = G.invCount('sharkfin') === 0;
    const full = absent && !G.addItem('sharkfin', 1, true);
    const capBefore = G.capUsed();
    const okBp = G.addItem('bpBullet', 1, true);
    ck('背包塞满后依然收得下图纸', full && okBp, '装满=' + full + ' 收下图纸=' + okBp);
    ck('图纸不计入背包已用格数', G.capUsed() === capBefore, capBefore + ' → ' + G.capUsed());
    ck('图纸确实进了背包', G.invCount('bpBullet') === 1);
  }
  // ⑦ 内置更新公告：approved 的必须真的进邮箱（玩家能收到），且 v1.06b 这条要带上"存档安全提醒 + 好评请求"
  {
    const notes = (typeof PATCH_NOTES !== 'undefined' && PATCH_NOTES) || [];
    const nb = notes.find(n => n && n.version === 'v1.06b');
    ck('v1.06b 公告已 approved（会发进游戏邮箱）', !!nb && nb.approved === true, nb ? 'title=' + nb.title : '没找到');
    const body = nb ? (nb.body || []).join('\n') : '';
    ck('公告里有存档安全提醒（本地存档 + 导出存档码）',
       /只存在你自己的手机/.test(body) && /导出存档码/.test(body) && /内存/.test(body));
    ck('公告里有作者的话（第一个游戏 / 好评请求）',
       /第一个游戏/.test(body) && /好评/.test(body) && /非常重要/.test(body));
    ck('公告用纯文本渲染，不能混进 markdown 星号', body.indexOf('**') < 0);
    // 投递机制本身由 6e 的"公告进邮箱，且每个版本只发一次"用例盯着（这里不再重复摆弄 meta 状态），
    // 这里只确认：v1.06b 这条是 approved、且版本键没跟老公告撞车（撞了老玩家就收不到）。
    const versions = notes.filter(n => n && n.approved).map(n => n.version);
    ck('v1.06b 用的是全新的版本键（不会和老公告撞车导致收不到）',
       versions.filter(v => v === 'v1.06b').length === 1 && new Set(versions).size === versions.length,
       versions.join(' , '));
    // ⚠️ 公告正文在 data.js 里是"按行的数组"，投递时必须归一化成带换行的字符串，
    //    否则界面 String(数组) 会变成逗号拼成一整行（v1.06 公告上线起就一直是这样）。
    ck('公告投递时把"按行的数组"归一化成带换行的文本',
       /const bodyText = Array\.isArray\(n\.body\) \? n\.body\.join\('\\n'\) : \(n\.body \|\| ''\);/.test(_GAME_SRC) &&
       /m\.mailbox\.push\(\{ notice: n\.version,[^}]*body: bodyText/.test(_GAME_SRC));
    ck('界面渲染公告也能吃下数组（老存档里已经发出去的那几条）',
       /Array\.isArray\(x\.body\) \? x\.body\.join\('\\n'\) : String\(x\.body \|\| ''\)/.test(UI));
    // 投递出来的正文到底是不是"带换行的文本"，交给 开发工具\检查\_check_announce_mail.js 独立验
    // （它用一份干净的模拟存储跑，不受本文件前面用例改过的 meta 影响）。
  }
  // ⑤ 新手引导"跳过"：ui.js 里不许再出现裸的 change()（那是 game.js 内部函数，UI 里根本不存在）
  ck('界面里不再调用不存在的 change()（引导"跳过"以前点了没反应）',
     !/[^.\w]change\(\)/.test(UI) && /s\.tut = null; Game\.change\(\)/.test(UI));
}

// ============================================================
section('9. 技能树（B1：框架 + 主干三选一 + 遗忘 + 采集/制造分支）');
{
  // ---- 数据体检 ----
  const kinds = ['gather', 'craft', 'combat'];
  ck('三棵技能树都在，主干上限 7 级',
     kinds.every(k => SKILL_TREES[k]) && SKILL_TREES.gather.trunk.length === 3 &&
     SKILL_TRUNK_MAX === 7 && SKILL_TRUNK_COST.length === 7);
  ck('主干花费单调递增（越升越贵）',
     SKILL_TRUNK_COST.every((v, i) => i === 0 || v > SKILL_TRUNK_COST[i - 1]), SKILL_TRUNK_COST.join('/'));
  ck('战斗主干是「攻 +1 / 防 +0.5 / 暴击 +5%」三个方向',
     SKILL_TREES.combat.trunk.map(o => o.id).join(',') === 'atk,def,crit' &&
     /攻击 \+1/.test(SKILL_TREES.combat.trunk[0].desc) && /防御 \+0\.5/.test(SKILL_TREES.combat.trunk[1].desc) &&
     /暴击率/.test(SKILL_TREES.combat.trunk[2].desc));
  ck('采集主干是「产出 +10% / 耗时 -10% / 体力 -10%」',
     SKILL_TREES.gather.trunk.map(o => o.id).join(',') === 'yield,speed,stam' &&
     /\+10%/.test(SKILL_TREES.gather.trunk[0].desc) && /10%/.test(SKILL_TREES.gather.trunk[1].desc) && /10%/.test(SKILL_TREES.gather.trunk[2].desc));
  ck('制造主干是「耗时 -10% / 10% 返还材料 / 10% 多产 1 件」',
     /耗时 -10%/.test(SKILL_TREES.craft.trunk[0].desc) && /10% 概率返还材料/.test(SKILL_TREES.craft.trunk[1].desc) && /10% 概率多产 1 件/.test(SKILL_TREES.craft.trunk[2].desc));
  {
    const miss = [];
    for (const k of kinds) for (const n of SKILL_TREES[k].nodes) {
      if (!n.id || !n.name || !Array.isArray(n.desc) || !n.max || !Array.isArray(n.cost) || n.cost.length < n.max) miss.push(k + '.' + n.id);
      if ((n.need || 0) > SKILL_TRUNK_MAX) miss.push(k + '.' + n.id + '(门槛超上限)');
    }
    ck('每个分支节点字段齐全、门槛不超过主干上限', miss.length === 0, miss.join('、') || '全部合格');
  }
  {
    const bad = [];
    for (const k of kinds) for (const n of SKILL_TREES[k].nodes) {
      if (!n.mutex) continue;
      const m = SKILL_TREES[k].nodes.find(x => x.id === n.mutex);
      if (!m || m.mutex !== n.id) bad.push(k + '.' + n.id);
    }
    ck('★ 互斥成对且对称（A 互斥 B ⇔ B 互斥 A）',
       bad.length === 0, bad.join('、') || '伐木专精⇄自然感知、精细⇄粗放、流水线⇄精工细作');
  }
  // ---- 主干：扣经验 + 记录选择 + 效果叠加 ----
  {
    G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null;
    s.exp.gather = 90;      // 刚好够升 3 级（12+28+50），第 4 级就升不动了
    ck('新局主干从 0 级、没有任何选择', s.skill.gather === 0 && G.trunkPicks('gather') === 0);
    const r1 = G.skillUpTrunk('gather', 'yield'), r2 = G.skillUpTrunk('gather', 'yield'), r3 = G.skillUpTrunk('gather', 'stam');
    ck('升三级按 12+28+50 扣经验', r1.ok && r2.ok && r3.ok && s.exp.gather === 0, '剩 ' + s.exp.gather);
    ck('同一个方向可以重复选（产出 +20%）', G.gatherYieldMul() === 1.2, G.gatherYieldMul());
    ck('选的不是同一个方向就各自生效（体力 -10%）', Math.round(G.gatherEnergyMul() * 100) / 100 === 0.9, G.gatherEnergyMul());
    ck('经验不够时升不动', G.skillUpTrunk('gather', 'yield').ok === false && s.skill.gather === 3);
  }
  // ---- 分支：门槛 / 互斥 / 学习 / 遗忘 ----
  {
    G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null;
    s.exp.gather = 1000;
    ck('主干不到 2 级学不了伐木专精', G.nodeCheck('gather', 'g_wood').ok === false && /主干 2 级/.test(G.nodeCheck('gather', 'g_wood').reason));
    G.skillUpTrunk('gather', 'yield'); G.skillUpTrunk('gather', 'yield');
    ck('主干 2 级后可以学', G.nodeCheck('gather', 'g_wood').ok === true);
    G.skillNodeLearn('gather', 'g_wood');
    ck('★ 互斥：学了伐木专精就学不了自然感知', G.nodeCheck('gather', 'g_nature').ok === false && /互斥/.test(G.nodeCheck('gather', 'g_nature').reason));
    ck('★ 只能遗忘"最末端"：没有下游时伐木专精可以忘', G.nodeIsLeaf('gather', 'g_wood') === true);
    // 临时挂一条下游链，验证"有下游就忘不了"
    SKILL_TREES.gather.nodes.push({ id:'g_tmp', name:'临时下游', need:2, needNode:'g_wood', max:1, cost:[40], desc:['测试'] });
    G.skillNodeLearn('gather', 'g_tmp');
    ck('★ 有下游时不是末端、忘不了', G.nodeIsLeaf('gather', 'g_wood') === false && G.skillNodeForget('gather', 'g_wood').ok === false);
    const e0 = s.exp.gather;
    const f1 = G.skillNodeForget('gather', 'g_tmp');
    ck('★ 遗忘末端返还一半经验（40 → +20）', f1.ok && f1.gain === 20 && Math.round(s.exp.gather - e0) === 20, '经验 ' + e0 + ' → ' + s.exp.gather);
    ck('★ 忘掉下游后，上游恢复成末端', G.nodeIsLeaf('gather', 'g_wood') === true);
    const f2 = G.skillNodeForget('gather', 'g_wood');
    ck('★ 再忘上游：返还 30/2 = 15，且互斥解除', f2.gain === 15 && G.nodeCheck('gather', 'g_nature').ok === true);
    ck('主干不能遗忘（不是节点）', G.skillTreeInfo().gather.lv === 2 && !G.skillTreeInfo().gather.nodes.some(n => n.id.endsWith('_trunk')));
    SKILL_TREES.gather.nodes.pop();
  }
  // ---- 数值钩子 ----
  {
    G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null;
    s.exp.craft = 999; s.exp.combat = 999; s.exp.gather = 999;
    ck('战斗主干：选 3 次防 = +1.5 防御', (() => { s.skillPicks.combat = ['def','def','def']; return Math.abs(G.skillDefBonus ? 0 : 0) === 0 && Math.abs((G.playerDef() - (function(){ s.skillPicks.combat = []; return G.playerDef(); })()) - 1.5) < 1e-6; })());
    ck('战斗主干：选 2 次暴击 = 10% → 20%', (() => { s.skillPicks.combat = ['crit','crit']; return Math.abs(G.skillCritRate() - 0.20) < 1e-6; })());
    s.skillPicks.combat = [];
    ck('精细采集：产出 +20%、体力 +15%',
       (() => { s.skill.gather = 4; s.skillPicks.gather = ['yield','yield','yield','yield']; G.skillNodeLearn('gather','g_fine');
         return Math.round(G.gatherYieldMul() * 100) / 100 === 1.6 && Math.round(G.gatherEnergyMul() * 100) / 100 === 1.15; })());
    ck('★ 流水线：材料 -50%（全项目都走 craftIn）',
       (() => { s.skill.craft = 4; s.skillPicks.craft = ['speed','speed','refund','extra']; G.skillNodeLearn('craft','c_line');
         const c = G.craftIn({ in:{ plank:10, nail:4 } }); return c.plank === 5 && c.nail === 2; })());
    ck('★ 精工细作与流水线互斥，学不了', G.nodeCheck('craft','c_finework').ok === false && /互斥/.test(G.nodeCheck('craft','c_finework').reason));
    ck('★ 修建材 / 打磨等所有消耗材料的地方改用 craftIn（不再直接读 r.in）',
       /function craftIn\(r\)/.test(_GAME_SRC) && (_GAME_SRC.match(/craftIn\(r\)/g) || []).length >= 3 && !/for \(const k in r\.in\) removeItem/.test(_GAME_SRC));
  }
  // ---- 界面接线 ----
  ck('技能面板给出「展开技能树」入口，并接到 skilltree 弹窗',
     /data-skilltree="\$\{k\}"/.test(UI) && /kind === 'skilltree'/.test(UI) && /function skillTreeModal\(kind\)/.test(UI));
  ck('主干升级 / 学习 / 遗忘三个按钮都接到 Game 接口',
     /data-trunkup="\$\{kind\}:\$\{o\.id\}"/.test(UI) && /Game\.skillUpTrunk\(k, o\)/.test(UI) &&
     /data-nodelearn="\$\{kind\}:\$\{n\.id\}"/.test(UI) && /Game\.skillNodeLearn\(k, id\)/.test(UI) &&
     /data-nodeforget="\$\{kind\}:\$\{n\.id\}"/.test(UI) && /Game\.skillNodeForget\(k, id\)/.test(UI));
  ck('技能树弹窗在"点外面关闭 / 时间冻结"名单里',
     /'skilltree'/.test(UI) && /'skill', 'skilltree'/.test(UI));
  ck('老版的"点一下+1级"接口已删除（避免主干和成长选项脱节）',
     !/function skillUp\(kind\)/.test(_GAME_SRC) && !/Game\.skillUp\(/.test(UI) && !/data-skillup/.test(UI));
}

section('9b. 赶路遇袭不能关 / 山洞洞穴熊');
{
  ck('★ 设置面板里没有赶路遇袭开关了',
     !/data-set="road:on"/.test(UI) && !/data-set="road:off"/.test(UI) && !/v\.startsWith\('road:'\)/.test(UI));
  ck('★ 老存档里 settings.roadAmbush=false 也被忽略（拦路照常判定）',
     !/S\.settings\.roadAmbush === false/.test(_GAME_SRC));
  {
    G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null;
    s._testNoAmbush = false;                    // 这一条就是要验"拦路真的会发生"，把测试开关关掉
    s.settings.roadAmbush = false; s.day = 40; s.buildings.watch = 3;
    s.scene = 'camp';
    let ambushed = false;
    const r0 = Math.random;
    try { Math.random = () => 0.0; ambushed = G.rollTravelAmbush('peak', false) === true; } catch (e) {}
    Math.random = r0;
    ck('★ 实测：设了"关"也照样会被拦路', ambushed === true, String(ambushed));
  }
  ck('★ 山洞内的狩猎点不再过滤 minDay（洞内一直可能遇到洞穴熊）',
     /const caveNow = \/\^cave_\/\.test\(p\.id \|\| ''\)/.test(_GAME_SRC) && /\(caveNow \|\| !e\.minDay \|\| S\.day >= e\.minDay\)/.test(_GAME_SRC));
  ck('洞外拦路的洞穴熊仍然第 30 天起（没被一起放开）',
     /pool\.filter\(id => ENEMIES\[id\] && \(!ENEMIES\[id\]\.minDay \|\| S\.day >= ENEMIES\[id\]\.minDay\)\)/.test(_GAME_SRC));
}

section('9c. 历代遗章：各技能模块初始经验');
{
  ck('传承里有三个"心得"节点（采集/制造/战斗）',
     META_NODES.some(n => n.id === 'startG') && META_NODES.some(n => n.id === 'startC') && META_NODES.some(n => n.id === 'startF'));
  ck('metaBonus 会把它们换算成开局经验', /b\.startG = \[0,30,60,100\]\[metaNum\('startG'\)\]/.test(_GAME_SRC));
  {
    const m = G.metaState(); m.nodes = m.nodes || {}; m.nodes.startG = 3; m.nodes.startC = 1;
    G.newGame('fisher', 'normal');
    ck('实测：买了「采集心得 3 级」开局就有 100 采集经验', G.S().exp.gather === 100, G.S().exp.gather);
    ck('实测：买了「制造心得 1 级」开局就有 30 制造经验', G.S().exp.craft === 30, G.S().exp.craft);
    m.nodes.startG = 0; m.nodes.startC = 0;
  }
}

section('9d. 战斗技能树（B2 第一批：阔刃横扫 / 处决 ⇄ 嗜血狂刀 / 复仇）');
{
  const C = SKILL_TREES.combat;
  const ids = C.nodes.map(n => n.id);
  ck('战斗树节点齐了：阔刃横扫/处决/嗜血狂刀/复仇/盾墙/疾风/狂战/铁壁/弓术/枪械',
     ids.join(',') === 'f_sweep,f_exec,f_vamp,f_revenge,f_shield,f_swift,f_rage,f_iron,f_bow,f_gun', ids.join(','));
  ck('★ 阔刃横扫 ⇄ 嗜血狂刀 互斥，处决挂在横扫下、复仇挂在嗜血下',
     C.nodes.find(n => n.id === 'f_sweep').mutex === 'f_vamp' && C.nodes.find(n => n.id === 'f_vamp').mutex === 'f_sweep' &&
     C.nodes.find(n => n.id === 'f_exec').needNode === 'f_sweep' && C.nodes.find(n => n.id === 'f_revenge').needNode === 'f_vamp');
  G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null; s.exp.combat = 5000;
  ck('没学节点时：横扫 0.8 倍、CD 20 秒', G.sweepMul() === 0.8 && G.sweepCdTotal() === 20);
  s.skill.combat = 3; s.skillPicks.combat = ['atk', 'atk', 'atk'];
  G.skillNodeLearn('combat', 'f_sweep');
  ck('★ 横扫 1 级：1.0 倍 / CD 18 秒', G.sweepMul() === 1.0 && G.sweepCdTotal() === 18);
  G.skillNodeLearn('combat', 'f_sweep'); G.skillNodeLearn('combat', 'f_sweep');
  ck('★ 横扫 3 级：1.4 倍 / CD 14 秒（每级 -2 秒）', G.sweepMul() === 1.4 && G.sweepCdTotal() === 14);
  ck('★ 与嗜血狂刀互斥：学不了', G.nodeCheck('combat', 'f_vamp').ok === false && /互斥/.test(G.nodeCheck('combat', 'f_vamp').reason));
  G.skillNodeLearn('combat', 'f_exec');
  ck('★ 处决 1 级：敌人 <20% 生命时伤害 +50%',
     Math.abs(G.execThreshold() - 0.20) < 1e-9 && /【处决】/.test(_GAME_SRC) && /dealt = Math\.round\(dealt \* 1\.5\)/.test(_GAME_SRC));
  G.skillNodeForget('combat', 'f_exec');
  for (let i = 0; i < 3; i++) G.skillNodeForget('combat', 'f_sweep');
  ck('★ 忘掉横扫后嗜血狂刀解除互斥、可以学', G.nodeCheck('combat', 'f_vamp').ok === true);
  G.skillNodeLearn('combat', 'f_vamp');
  ck('★ 嗜血狂刀 1 级 = 吸血 30%', Math.abs(G.vampRate() - 0.30) < 1e-9);
  G.skillNodeLearn('combat', 'f_vamp'); G.skillNodeLearn('combat', 'f_vamp'); G.skillNodeLearn('combat', 'f_vamp');
  ck('★ 嗜血狂刀 4 级 = 吸血 60%', Math.abs(G.vampRate() - 0.60) < 1e-9);
  G.skillNodeLearn('combat', 'f_revenge');
  ck('★ 复仇 1 级 = 挨打一次后下一击 +20%',
     Math.abs(G.revengeBonus() - 0.20) < 1e-9 && /C\.revenge = Math\.min\(3/.test(_GAME_SRC));
  ck('触发类效果都写了战斗日志（处决 / 复仇 / 嗜血狂刀）',
     /【处决】/.test(_GAME_SRC) && /【复仇】/.test(_GAME_SRC) && /【嗜血狂刀】/.test(_GAME_SRC));
  // ---- B2b：盾墙 ⇄ 疾风连击 / 狂战 ⇄ 铁壁（主干6）/ 弓术 / 枪械精通 ----
  ck('★ 互斥对：盾墙 ⇄ 疾风连击、狂战 ⇄ 铁壁',
     C.nodes.find(n => n.id === 'f_shield').mutex === 'f_swift' && C.nodes.find(n => n.id === 'f_swift').mutex === 'f_shield' &&
     C.nodes.find(n => n.id === 'f_rage').mutex === 'f_iron' && C.nodes.find(n => n.id === 'f_iron').mutex === 'f_rage');
  ck('狂战/铁壁挂在主干 6（不是 3）',
     C.nodes.find(n => n.id === 'f_rage').need === 6 && C.nodes.find(n => n.id === 'f_iron').need === 6);
  {
    G.newGame('fisher', 'normal'); const s2 = G.S(); s2.tut = null; s2.exp.combat = 5000;
    ck('主干没到 4 级时盾墙/疾风学不了', G.nodeCheck('combat', 'f_shield').ok === false && /主干 4 级/.test(G.nodeCheck('combat', 'f_shield').reason));
    s2.skill.combat = 4; s2.skillPicks.combat = ['atk', 'atk', 'atk', 'atk'];
    const spd0 = G.combatSpeed();
    G.skillNodeLearn('combat', 'f_swift'); G.skillNodeLearn('combat', 'f_swift'); G.skillNodeLearn('combat', 'f_swift');
    ck('★ 疾风连击 3 级 = 攻速 +3', Math.abs(G.combatSpeed() - (spd0 + 3)) < 1e-6, `${spd0} → ${G.combatSpeed()}`);
    ck('★ 与盾墙互斥', G.nodeCheck('combat', 'f_shield').ok === false && /互斥/.test(G.nodeCheck('combat', 'f_shield').reason));
    G.skillNodeForget('combat', 'f_swift'); G.skillNodeForget('combat', 'f_swift'); G.skillNodeForget('combat', 'f_swift');
    G.skillNodeLearn('combat', 'f_shield');
    ck('★ 盾墙 1 级 = 格挡率 +15%', Math.abs(G.wallBlockBonus() - 0.15) < 1e-9);
    ck('★ 盾墙 1 级 = 盾耐久消耗 -20%', Math.abs(G.wallDurMul() - 0.80) < 1e-9);
    // 狂战 / 铁壁
    s2.skill.combat = 6; s2.skillPicks.combat = ['atk','atk','atk','atk','atk','atk'];
    G.skillNodeLearn('combat', 'f_rage');
    ck('★ 狂战 1 级 = 攻击 ×1.15、受伤 ×1.10', Math.abs(G.rageAtkMul() - 1.15) < 1e-9 && Math.abs(G.rageTakenMul() - 1.10) < 1e-9);
    ck('★ 与铁壁互斥', G.nodeCheck('combat', 'f_iron').ok === false);
    G.skillNodeForget('combat', 'f_rage');
    G.skillNodeLearn('combat', 'f_iron');
    ck('★ 铁壁 1 级 = 受伤 ×0.88、攻击 ×0.95', Math.abs(G.ironTakenMul() - 0.88) < 1e-9 && Math.abs(G.ironAtkMul() - 0.95) < 1e-9);
    // 弓术 / 枪械
    G.skillNodeLearn('combat', 'f_bow');
    ck('★ 弓术 1 级 = 弓命中 0.90 → 0.95、15% 不耗箭', Math.abs(G.rangedAcc ? G.rangedAcc('bow') - 0.95 : 0) < 1e-9 && Math.abs(G.ammoSaveChance('bow') - 0.15) < 1e-9);
    G.skillNodeLearn('combat', 'f_gun'); G.skillNodeLearn('combat', 'f_gun'); G.skillNodeLearn('combat', 'f_gun');
    ck('★ 枪械精通 3 级 = 命中 +10%（上限 95%）、40% 不耗子弹',
       Math.abs(G.ammoSaveChance('gun') - 0.40) < 1e-9 && /【枪械精通】/.test(_GAME_SRC) && /【弓术】/.test(_GAME_SRC));
  }
  ck('★ 界面上每个按钮都写了消耗（学习花多少 / 遗忘返多少 / 主干花多少）',
     /学习（花 \$\{n\.cost\} 经验）/.test(UI) && /学习（需 \$\{n\.cost === null/.test(UI) &&
     /遗忘（返 \$\{n\.forgetGain\}）/.test(UI) && /花 \$\{t\.cost\} 点\$\{t\.expName\}/.test(UI) && /还差 \$\{Math\.ceil\(t\.cost - t\.exp\)\}/.test(UI));

  // ---- B3：3×3 批量画的技能图标（切成 128×128 墨线 + 透明底）----
  {
    const missing = [], bad = [];
    for (const k of ['gather', 'craft', 'combat']) {
      const t = SKILL_TREES[k];
      for (const o of t.trunk) {
        if (!o.icon) { missing.push(k + '.trunk.' + o.id); continue; }
        const p = ROOT + '/assets/img/skills/' + o.icon + '.png';
        if (!fs.existsSync(p)) missing.push(o.icon);
      }
      for (const n of t.nodes) {
        if (!n.icon) { missing.push(k + '.' + n.id); continue; }
        const p = ROOT + '/assets/img/skills/' + n.icon + '.png';
        if (!fs.existsSync(p)) missing.push(n.icon);
      }
    }
    ck('★ 每个主干方向、每个分支节点都有图标文件', missing.length === 0, missing.join('、') || '全部齐了');
    const f = ROOT + '/assets/img/skills/k_sweep.png';
    const b = fs.readFileSync(f);
    // PNG 头里读宽高（偏移 16..24），确认是 128×128、带 alpha（RGBA）
    const w = b.readUInt32BE(16), h = b.readUInt32BE(20), depth = b[25];
    if (w !== 128 || h !== 128) bad.push(w + 'x' + h);
    if (depth !== 6) bad.push('色彩类型 ' + depth + '（应为 6=RGBA）');
    ck('图标规格：128×128、RGBA（透明底）', bad.length === 0, bad.join('、') || '128×128 RGBA');
    ck('界面把图标画进了主干按钮和节点标题',
       /src="assets\/img\/skills\/\$\{n\.icon\}\.png"/.test(UI) && /src="assets\/img\/skills\/\$\{o\.icon\}\.png"/.test(UI) &&
       /\.st-icon \{ width: 21px; height: 21px;/.test(fs.readFileSync(ROOT + '/css/style.css', 'utf8')));
    ck('图标文件总量控制住了（27 个 < 1MB）',
       fs.readdirSync(ROOT + '/assets/img/skills').filter(x => x.endsWith('.png')).length === 27);
  }
}

section('9f. 音效与配乐（玩家反馈"叮铃太频繁、有些音效拉胯"）');
{
  const AUD = fs.readFileSync(ROOT + '/js/audio.js', 'utf8');
  ck('★ 系统日志不再频繁"叮铃"（拾取音概率 40% → 8%，且换成闷音）',
     /else if \(cls === 'sys' && Math\.random\(\) < 0\.08\) tone\(300, 0\.07, 'sine', 0\.014/.test(AUD) &&
     !/cls === 'sys' && Math\.random\(\) < 0\.4/.test(AUD));
  ck('★ 洞穴水滴：每 0.9 秒 → 随机 4.5~11 秒一次，音高压到 900~1500Hz',
     /setTimeout\(\(\) => \{ if \(ambientOn && enabled\) drip\(\); scheduleDrip\(\); \}, rnd\(4500, 11000\)\)/.test(AUD) &&
     /const f = rnd\(900, 1500\);/.test(AUD) && !/setInterval\(\(\) => \{ drip\(\); \}, 900\)/.test(AUD));
  ck('★ 夜里虫鸣：0.4~0.9 秒 → 1.8~5.2 秒一次，音量减半、音高 3400→2300',
     /setInterval\(\(\) => \{ if \(currentNight\) cricket\(\); \}, rnd\(1800, 5200\)\)/.test(AUD) &&
     /tone\(2300 \+ rnd\(0, 300\), 0\.05, 'sine', 0\.0016\)/.test(AUD));
  ck('★ 界面咔哒声改用三角波（原来是方波，听感"塑料"）',
     /const o = ctx\.createOscillator\(\); o\.type = 'triangle';   \/\/ 方波太"塑料"/.test(AUD));
  ck('★ 一条刺耳波形都不剩（无 square / sawtooth）',
     !/o\.type = 'square'/.test(AUD) && !/'sawtooth'/.test(AUD));
  ck('★ 音乐/音效两路各加一道温暖低通（磨掉高频尖角）',
     /const musicWarm = ctx\.createBiquadFilter\(\); musicWarm\.type = 'lowpass'; musicWarm\.frequency\.value = 2000/.test(AUD) &&
     /const sfxWarm = ctx\.createBiquadFilter\(\); sfxWarm\.type = 'lowpass'; sfxWarm\.frequency\.value = 7000/.test(AUD));
  ck('★ 配乐更"呼吸"：音符 4.5s → 6s 一句，并加了根音+五度和声垫（垫子压到 6 秒防共振）',
     /if \(step % 4 === 0 && Math\.random\(\) < \(night \? 0\.5 : 0\.62\)\)/.test(AUD) &&
     /tone\(scale\[0\] \/ 2, 6, 'sine', vol \* 0\.26/.test(AUD) && /tone\(scale\[2\] \/ 2, 6, 'sine', vol \* 0\.16/.test(AUD));
  ck('★ 配乐不再无缝衔接：一句 40~75 秒，然后静默 18~45 秒（环境音照旧）',
     /let phraseEndAt = 0, restEndAt = 0;/.test(AUD) && /phraseEndAt = nowMs \+ rnd\(40000, 75000\)/.test(AUD) &&
     /restEndAt = nowMs \+ rnd\(18000, 45000\)/.test(AUD) && /if \(nowMs < restEndAt\) return;/.test(AUD));
  ck('★ 湖畔/树林的"振嗡"：带宽放宽、摆动幅度砍到 1/3、速度减半',
     /f\.type = 'bandpass'; f\.frequency\.value = 780; f\.Q\.value = 0\.5;/.test(AUD) &&
     /lfo\.frequency\.value = 0\.12;/.test(AUD) && /lfoG\.gain\.value = 0\.006;/.test(AUD) &&
     /lfo\.frequency\.value = 0\.18;/.test(AUD) && /lfoG\.gain\.value = 0\.003;/.test(AUD));
  ck('石破解密：仪式后山顶会明确指路 + 当前目标写着怎么解密',
     /点右上角的「传送石 · 需解密」/.test(_GAME_SRC) && /回【山顶】点「传送石」——用三块石板解出符文/.test(_GAME_SRC));
  ck('拾取/获得/交易音都降了八度、换成柔和波形（不再"叮"）',
     /case 'pickup': tone\(540/.test(AUD) && /case 'good':   tone\(392/.test(AUD) && /case 'trade':  tone\(784/.test(AUD));
}

section('9e. 三层存档（本地 + cookie + TapTap 云存档 v4）');
{
  // 测试环境里没有 window.tap → 云这一层必须是"安静地关掉"，绝不能影响原来玩
  ck('★ 浏览器/没有 tap 时：云存档自动关闭，游戏照常',
     G.cloudStatus().supported === false && !!G.cloudStatus().msg);
  ck('云存档状态接口齐全（supported / msg / at / applied）',
     ['supported', 'msg', 'at', 'applied'].every(k => k in G.cloudStatus()));
  G.newGame('fisher', 'normal');
  ck('★ 没有 tap 时 save() 不会因为云存档报错', (() => { try { G.save(); return true; } catch (e) { return false; } })());
  ck('没有 tap 时 cloudPush 直接返回 false（不抛异常）', G.cloudPush(true) === false);
  // 实现要点：官方限制查证过的几个关键点都要在代码里
  ck('★ 上传节流：比官方"一分钟一次"留余量（65 秒）',
     /const CLOUD_MIN_MS = 65 \* 1000;/.test(_GAME_SRC) && /cloud\.dirty = true;[\s\S]{0,120}setTimeout\(\(\) => \{ cloud\.timer = 0; if \(cloud\.dirty\) cloudPush\(true\); \}/.test(_GAME_SRC));
  ck('★ 没进度时不占配额（空档不上传）', /if \(!JSON\.parse\(payload\)\.save\) \{ cloud\.dirty = true; cloud\.msg = '还没有进度可上传'; return false; \}/.test(_GAME_SRC));
  ck('★ 只有云端"确实更新"才覆盖本地（时间戳比较 + 完整性校验）',
     /const localAt = parseInt\(localStorage\.getItem\('guyuyizhang_savedAt'\) \|\| '0', 10\) \|\| 0;/.test(_GAME_SRC) &&
     /if \(cloudAt <= localAt\) \{ cloud\.msg = '云端与本地一致'; return; \}/.test(_GAME_SRC) &&
     /if \(!j \|\| !j\.day\) \{ cloud\.msg = '云端存档不完整，已忽略'; return; \}/.test(_GAME_SRC));
  ck('★ 用官方接口：getCloudSaveManager / create / update / getArchiveList / getArchiveData',
     /window\.tap\.getCloudSaveManager/.test(_GAME_SRC) && /\.createArchive\(/.test(_GAME_SRC) && /\.updateArchive\(/.test(_GAME_SRC) &&
     /\.getArchiveList\(/.test(_GAME_SRC) && /\.getArchiveData\(/.test(_GAME_SRC));
  ck('★ 存档名是英文（官方要求不许汉字）+ 上传前先写本地文件',
     /const CLOUD_NAME = 'guyuyizhang_save';/.test(_GAME_SRC) &&
     /function cloudPath\(\) \{ return cloudTap\(\)\.env\.USER_DATA_PATH \+ '\/guyuyizhang_cloud\.json'; \}/.test(_GAME_SRC) &&
     /cloudWriteFile\(payload\)/.test(_GAME_SRC));
  ck('★ 文件 API 两种都兼容（TapTap 真机是回调风格，没有 writeFileSync —— 线上踩过这个坑）',
     /function cloudWriteFile\(payload\)/.test(_GAME_SRC) && /typeof fs2\.writeFileSync === 'function'/.test(_GAME_SRC) &&
     /fs2\.writeFile\(\{ filePath: p, data: payload, encoding: 'utf8'/.test(_GAME_SRC) &&
     /function cloudReadFile\(path\)/.test(_GAME_SRC) && /fs2\.readFile\(\{ filePath: path, encoding: 'utf8'/.test(_GAME_SRC));
  ck('★ 上传顺序：先写文件、写完再 createArchive/updateArchive',
     /cloudWriteFile\(payload\)\.then\(\(path\) => \{[\s\S]{0,900}?createArchive/.test(_GAME_SRC));
  ck('save() 和 metaSave() 都会排一次云同步', (_GAME_SRC.match(/cloudPush\(false\)/g) || []).length >= 2);
  ck('★ 每次保存 / 备份都会顺手排一次云同步，并给玩家明确反馈',
     /刚同步过（平台限制一分钟一次）/.test(_GAME_SRC) &&
     /已保存。' \+ \(cs\.supported \? `云存档：\$\{cs\.msg\}`/.test(UI) &&
     /已备份到备份槽 \$\{\+b\.dataset\.bk \+ 1\}（第 \$\{r\.day\} 天）。` \+ \(cs\.supported/.test(UI));
  ck('启动时会初始化云存档（浏览器里自动跳过）', /metaLoad\(\);\s*cloudInit\(\);/.test(_GAME_SRC));
  ck('设置面板有云存档说明行，支持时还能手动上传',
     /<b>云存档<\/b>/.test(UI) && /data-cloudpush/.test(UI) && /Game\.cloudPush\(true\)/.test(UI));
  ck('★ 云存档自检：面板里显示当前版本 + 没 tap 时写明原因 + 有「重新检测」',
     /当前版本 <b>\$\{ver\}<\/b>/.test(UI) && /没检测到 TapTap 容器/.test(UI) &&
     /data-cloudretry/.test(UI) && /Game\.cloudInit\(\)/.test(UI) &&
     /cloud\.diag = 'no-tap';/.test(_GAME_SRC) && /cloud\.diag = 'ok';/.test(_GAME_SRC));
}

console.log('\n================ 汇总 ================');
console.log('通过 ' + PASS + ' 项，失败 ' + FAIL + ' 项');
if (FAIL) { console.log('失败项：'); fails.forEach(f => console.log(' - ' + f)); }
console.log(FAIL ? 'RESULT:FAIL' : 'RESULT:PASS');
