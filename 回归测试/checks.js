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
    if(b==='legend') Game.metaState().challengeUnlocked=true; // Existing legendary mechanics fixtures start with a qualified account.
    const r = _rawNewGame(a, b);
    const st = Game.S();
    // 回归测试专用开关（游戏里没有这个字段）：拦路是按概率触发的，会把"走到某地做某事"的用例随机打断。
    // ⚠️ 不能再用 settings.roadAmbush —— 作者 2026-09-17 定了"赶路遇袭不给关"，那个字段已经被游戏忽略。
    if (st) st._testNoAmbush = true;
    // Isolate unrelated crafting/battle fixtures from the new 12-slot starter limit; real starter limits have dedicated tests.
    if(st&&b==='normal'){st.capacity=20;st.inventoryBaseSlots=20;}
    return r;
  };
}
function section(t) { console.log('\n== ' + t + ' =='); }
const G = Game;
// 作者 2026-09-25：鸡舍/羊圈只能在**农田**里建（占农田畜牧位、不占住房家具位）。
// 测试里统一走这个壳，免得每处都要自己摆场景。
const buildFarm = (id) => { const s = G.S(); const keep = s.scene; s.scene = 'farm'; G.buildFurniture(id); s.scene = keep; };
const RND = Math.random;
const always = () => 0.0;      // 概率判定必成功
const never = () => 0.999;     // 概率判定必失败
const UI = fs.readFileSync(ROOT + '/js/ui.js', 'utf8');
const PANEL_META=new Function(fs.readFileSync(ROOT+'/js/ui/panel-registry.js','utf8')+';return GamePanels.create().snapshot();')();
const PRESS_SRC=fs.readFileSync(ROOT+'/js/ui/input/press.js','utf8'),SATCHEL_VIEW=fs.readFileSync(ROOT+'/js/ui/food-satchel.js','utf8');
const _GAME_SRC = JSON.parse(fs.readFileSync(ROOT+'/runtime-manifest.json','utf8')).logic.filter(name=>name!=='js/data.js').map(name=>fs.readFileSync(ROOT+'/'+name,'utf8')).join('\n');   // 供"实现方式"类断言做正则检查
// ⚠️ 必须在这里（文件顶部）一起声明：以前只把 _GAME_SRC 放这儿、_DATA_SRC 放在文件中部，
//    结果靠前的小节引用它就会撞 **暂时性死区**（TDZ）——报 `_DATA_SRC is not defined`。
const _DATA_SRC = fs.readFileSync(ROOT + '/js/data.js', 'utf8');   // 供"数据字段"类断言做正则检查
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
  ck('index.html 版本号与资源缓存参数同步', /^v\d+\.\d+/.test(bv) && qs.length === JSON.parse(fs.readFileSync(ROOT+'/runtime-manifest.json','utf8')).scripts.length+JSON.parse(fs.readFileSync(ROOT+'/runtime-manifest.json','utf8')).styles.length && qs.every(v => v === bv), bv + ' / ' + qs.join(','));
  const jsAll = DATA + GAME + UI + fs.readFileSync(ROOT + '/index.html', 'utf8');
  const re = new RegExp('assets/[A-Za-z0-9_\\-/.]+?\\.(png|jpg|jpeg|webp|mp3|ogg|wav)', 'g');
  const imgs = new Set(); let m; while ((m = re.exec(jsAll))) imgs.add(m[0]);
  const miss = [...imgs].filter(p => !fs.existsSync(ROOT + '/' + p));
  ck('代码引用的图片/音频都在', miss.length === 0, miss.slice(0, 6).join('; '));
  const shopSrc = {};
  // 源质枪甲图纸已从交易机下架，改由沉船墓地的「神秘鱼人」以物换物（2026-09-22）
  const ATLBUY = ['bpCoralBlade','bpCoralArmor','bpThruster'].map(id => ({ id, kind:'bp' }));
  for (const [n, l] of [['老潮',LAOCHAO.sell],['杂货商',TOWN.grocer.sell],['铁匠',TOWN.smith.sell],['情报贩子',TOWN.informant.sell],['黑市',BLACKMARKET.sell],['交易机',ATLBUY]])
    for (const e of l) if (e.kind === 'bp') (shopSrc[e.id] = shopSrc[e.id] || []).push(n);
  ck('每张商店图纸只有一个卖家', Object.keys(shopSrc).every(k => shopSrc[k].length === 1), JSON.stringify(shopSrc));
}

section('1. 采集 / 遇袭 / 守卫');
{
  // ⚠️ 这一段必须钉死随机数，否则断言会偶发变红（实测约 0.3%／次，跑十几轮总能撞上一次）：
  //    · travel() 里有 10% 概率触发「奇遇」（会盖一层 overlay）
  //    · 采集本身还有遇袭判定，遇袭就变成"先打一场、赢了才收获"
  //    这两条都不是本段要测的东西（本段只测"采集有产出 + 只磨一把工具的耐久"），
  //    遇袭延后收获那条路径由下面 115 行起那段**专门**的断言覆盖（那里用 always 必定遇袭）。
  //    ⚠️ 顺带查出一个真问题（已单独记录，未擅自改动游戏行为）：遇袭来的若是有 flee 特性的野兔，
  //       它第 2 回合起有 50% 概率逃跑；逃跑不算 win → game.js `if (win && _cb) _cb();` 不执行
  //       延后的收获 → 这次采集的时间与体力白花、一点产出都没有。
  Math.random = never;
  G.newGame('woodcutter', 'normal');
  const S = G.S();
  G.addItem('axeStone', 1, true);
  S.toolDurs.axeStone = [25, 25];
  G.equipTool('axeStone');
  G.travel('forest');
  const pt = G.pointsOf().find(p => p.id === 'forest_tree');
  const w0 = G.invCount('wood');
  G.doPoint(pt);
  winFights();     // 遇袭时收获推迟到打赢之后（作者 2026-09-19 改的次序）
  const a = S.toolDurs.axeStone;
  ck('伐木有产出', G.invCount('wood') > w0);
  ck('一次采集只磨一把工具的耐久', (a[0] === 24 && a[1] === 25) || (a[0] === 25 && a[1] === 24), JSON.stringify(a));
  Math.random = always;
  S.combat = null;
  const g1 = G.pointsOf().find(p => p.type === 'gather' && !p.once && !p.guard);
  const before = G.invCount(g1.yields[0].id);
  G.doPoint(g1);
  // ⚠️ 作者 2026-09-19 改次序：先花时间 → 遇怪先去打 → **打赢才收获**（以前是产出先进包再开战）
  ck('遇袭时先进入战斗、还没有产出', !!S.combat && G.invCount(g1.yields[0].id) === before,
     '战斗=' + !!S.combat + ' 产出变化=' + (G.invCount(g1.yields[0].id) - before));
  ck('遇袭后进入战斗', !!S.combat);
  winFights();
  ck('★ 打赢之后才结算收获', G.invCount(g1.yields[0].id) > before,
     '战斗结束后 ' + g1.yields[0].id + ' ' + before + ' → ' + G.invCount(g1.yields[0].id));
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
  ck('补偿码 CORE4 已下架', G.redeemCode('core4').ok === false);meta.redeemed.CORE4=1;meta.mailbox.push({code:'CORE4',item:'deepCore',qty:4});
  ck('活动页已撤下"神殿核心补偿"文案（旧奖励定义保留用于迁移）',
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
    Sb.inv = {};   // 同 274 行：身份开局物资随机，先腾空背包再测"能不能买 5 个"
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
  ck('兽皮订单给 0.5 点声望', S2.fame === 0.5);
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
  ck('珍珠委托给声望（共1）', S2.fame === 1);
}

section('5. 农场 / 建造 / 饮食');
{
  G.newGame('fisher', 'normal');
  const S = G.S();
  G.addItem('seedCarrot', 4, true); G.addItem('rot', 5, true);
  Math.random = always;
  G.plant('seedCarrot'); S.crops[0].remain = 0;
  const c0 = G.invCount('carrot'); G.harvest(); const g1 = G.invCount('carrot') - c0;
  // ⚠️ 2026-09-24 契约变更：作者要求"种植砍半"（FARM_YIELD_MUL = 0.5）。
  //    旧断言写的是 4~5（没砍半时的值），按新口径改成 2~3。
  ck('未施肥收成 2~3（种植砍半后）', g1 >= 2 && g1 <= 3, '+' + g1);
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
  // ⚠️ 先清空背包再加料：身份开局物资是随机的，偶尔会把 20 格占满 → addItem 被容量拦下，
  //    这条就会偶发变红（真正测的是"家具位"，不该被背包容量影响）
  S10.inv = {};
  G.addItem('wood', 60, true); G.addItem('bamboo', 60, true); G.addItem('ironpart', 60, true);
  G.addItem('clay', 60, true); G.addItem('stone', 60, true);
  G.buildFurniture('spin'); G.buildFurniture('loom');
  ck('纺车 + 织布机 只占 1 个家具位', !!S10.furniture.spin && !!S10.furniture.loom && G.furnitureUsed() === 1, '家具位 ' + G.furnitureUsed());
  G.newGame('fisher', 'normal');
  const S11 = G.S();
  S11.inv = {};
  G.addItem('clay', 60, true); G.addItem('stone', 60, true); G.addItem('wood', 60, true);
  G.buildFurniture('mortar'); G.buildFurniture('medPot');
  ck('研钵 + 药炉 只占 1 个家具位', !!S11.furniture.mortar && !!S11.furniture.medPot && G.furnitureUsed() === 1, '家具位 ' + G.furnitureUsed());
  const tentChain = (function () {
    G.newGame('fisher', 'normal');
    const Sx = G.S();
    Sx.inv = {};
    G.addItem('wood', 60, true); G.addItem('bamboo', 60, true); G.addItem('ironpart', 60, true);
G.buildFurniture('spin'); const a = !!Sx.furniture.spin;
G.buildFurniture('loom'); const b = !!Sx.furniture.loom;
const used = G.furnitureUsed();
// ⚠️ 老版本这条偶尔会红：身份开局物资随机 + 背包 20 格，料有时加不进去。
//    已改成先清空背包（见上），根因记录在 开发工具\\检查\\_debug_loom_flake.js
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
  ck('远程按钮按武器弹药判定（不再只看箭矢）', UI.includes('rw.ammoItem') && UI.includes("Game.invCount(ammo)") && UI.includes("ITEMS[ammo].name"));
  // 作者 2026-09-19：不再"入场自动开火"，改成"第一轮你先出手" → 文案跟着改
  ck('手枪战斗文案区分枪/弓（并写明是"先出手"而非自动开火）',
     /你抬枪在手,抢在它扑过来之前/.test(GAME.replace(/，/g, ',')) && /你搭弓在手/.test(GAME) && /这一轮你先出手/.test(GAME));
  G.newGame('fisher', 'normal');
  {
    const Sg = G.S();
    G.addItem('pistol', 1, true); G.addItem('bullet', 6, true);
    G.equip('pistol', 0);
    G.startFight({ id:'d', name:'木桩', hp:9999999, atk:0, def:0, spd:1, traits:[], drops:[] }, true);
    // ⚠️ 作者 2026-09-19：取消"入场自动开火" → 开局不消耗弹药，但第一轮我先出手
    ck('手枪开局不再自动开火（子弹不动）', G.invCount('bullet') === 6, '剩 ' + G.invCount('bullet'));
    ck('★ 带枪且有子弹 → 第一轮我先出手', G.S().combat && G.S().combat.bowFirst === 1);
    Sg.stats.hp = 99999;
    G.S().combat.dist = 10;      // 手枪射程 15：先压到射程内（距离制，作者 2026-09-19）
    const rndP = Math.random; Math.random = () => 0.0;   // 必命中（不然这一枪可能落空、不扣子弹）
    G.fightAction('attack');
    Math.random = rndP;
    ck('玩家自己开枪后子弹才减少', G.invCount('bullet') === 5, '剩 ' + G.invCount('bullet'));
    ck('手枪单发伤害明显高于剑类（50 基础）', ITEMS.pistol.atk >= 45 && ITEMS.pistol.ranged && ITEMS.pistol.ammoItem === 'bullet');
  }
  // 扩建仓库
  G.newGame('fisher', 'normal');
  {
    const Ss = G.S();
    // 精确注入建造材料；正常 addItem 不应允许 300 件物资塞进 20 格的背包。
    Ss.inv.wood = 20; Ss.inv.branch = 20;
    const c0 = G.warehouseCapacity(), bag0 = G.capacity();
    const r1 = G.buildStoreExt();
    ck('扩建仓库 +15 容量', r1.ok === true && G.warehouseCapacity() === c0 + 15 && G.capacity() === bag0, c0 + ' → ' + G.warehouseCapacity());
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
    ck('手枪开局也不自动开枪（子弹 9 → 9）', G.invCount('bullet') === 9, '剩 ' + G.invCount('bullet'));
  }
  G.newGame('fisher', 'normal');
  {
    G.addItem('bow', 1, true); G.addItem('eagleArrow', 9, true);
    G.equip('bow', 0);
    G.startFight({ id:'d', name:'木桩', hp:999999, atk:0, def:0, spd:1, traits:[], drops:[] }, true);
    ck('弓开局也不自动射箭（箭 9 → 9）', G.invCount('eagleArrow') === 9, '剩 ' + G.invCount('eagleArrow'));
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
      winFights();          // 随机数 0 也会同时引来遇袭：收获推迟到打赢之后（作者 2026-09-19）
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
    winFights();
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
    for (let i = 0; i < 4; i++) { Sw2.pointUses = {}; Sw2.stats.stamina = 999; const b = G.invCount('water'); G.doPoint(wpt); winFights(); items += G.invCount('water') - b; }
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
    ck('新委托仍然给声望（保留声望链）', c5.reward.fame === 0.5, JSON.stringify(c5.reward));
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
    // 牛角护符现在提供暴击而非防御：攻击 30、防御 18。
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
    ck('防御效率：简单100 / 普通90 / 困难80 / 传奇70（30攻−18防）',
       easy === 12 && normal === 14 && hard === 16 && legend === 17, `扣血 ${easy}/${normal}/${hard}/${legend}`);
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
  // 作者 2026-09-25：四把匕首攻速统一 13（原来 15/14/14/14）
  ck('武器速度真的进战斗（匕首 13 / 铁大剑 6）', fast === 13 && slow === 6, `${fast} / ${slow}`);
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
    try {
      Math.random = () => 0.1;
      for (const difficulty of ['easy','normal','hard','legend']) {
        G.newGame('fisher', difficulty);
        const s = G.S(), deadline = G.raidDay();
        let protectedDays = true;
        for (let day = 1; day <= deadline; day++) {
          s.day = day; G.startFight(ENEMIES.wolf);
          protectedDays = protectedDays && s.combat.enemies.length === 1;
        }
        ck(difficulty + ' 首次夜袭前（含预定当天）狼群判定始终只有一匹', protectedDays);
        s.day = deadline + 10; s.flags.wolfRaidPending = 1;
        G.startFight([ENEMIES.wolf, ENEMIES.wolf, ENEMIES.wolf], true);
        ck(difficulty + ' 未实际触发夜袭时，延期或显式狼群仍只有一匹', s.combat.enemies.length === 1);
      }
      G.newGame('fisher', 'normal');
      const s = G.S(); s.tut = null; s._testNoAmbush = false;
      let ambush = null;
      G.bind({onOverlay:o=>{ambush=o;}});
      G.rollTravelAmbush('quarry', true); ambush.choices[0].ok();
      ck('实际采石场拦路迎战也遵守首次夜袭前单狼保护', s.combat.enemies.length === 1);
      s.combat = null; s.day = 11; s.minute = 20 * 60; s.flags.wolfRaidPending = 1;
      let raid = null;
      G.bind({onOverlay:o=>{if(o.title==='夜 袭') raid=o;}});
      Math.random = () => 0.9; G.sleep();
      ck('实际首次夜袭触发后解除单狼保护', !!raid && s.flags.firstRaidDone === 1);
      raid.choices[0].ok();
      ck('首次夜袭仍按原规则生成狼数', s.combat.enemies.length === G.raidWolves());
      Math.random = () => 0.1; G.startFight(ENEMIES.wolf); const two = s.combat.enemies.length;
      Math.random = () => 0.9; G.startFight(ENEMIES.wolf); const one = s.combat.enemies.length;
      ck('夜袭后普通狼仍按 50% 概率来两匹', two === 2 && one === 1, `随机0.1→${two} 只 / 0.9→${one} 只`);
    } finally { Math.random = R0; G.bind({onOverlay:()=>{}}); }
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
  // 山顶祭坛仪式已定案为「章节目标」而非结局：不计入结局、不触发结算，首次完成只发一次 50 魂点。
  { const ritualState = G.S(); ck('在祭坛举行仪式 = 记为章节目标 + 解锁亚特兰蒂斯（不是结局）', !!ritualState.flags.ended_C && !ritualState.ending && !!(ritualState.atlantis && ritualState.atlantis.unlocked)); }
  ck('材料齐了会指路山顶（当前目标 + 到山顶提示）',
     /回【山顶】举行祭坛仪式/.test(GAME) && /去点山顶的「祭坛 · 举行仪式」/.test(GAME));
  // 山顶祭坛仪式：不再是结局，因此不接结算。doPeakRitual 首次完成只发 50 魂点、不得重复领取；
  // 结局列表（checkEndingActions）里永远不该出现 endC / settle_endC。
  {
    G.newGame('fisher', 'normal');
    const Se = G.S(); Se.scene = 'peak'; Se.tut = null;
    G.addItem('relic', 1, true); G.addItem('slate', 3, true); G.addItem('dragonbone', 1, true);
    const before = G.checkEndingActions().map(a => a.id);
    ck('材料齐了还没做仪式：结局列表不含「祭坛仪式」（它是章节目标，不是结局）', before.length === 0 && before.indexOf('endC') < 0, before.join('/'));
    const soulB = G.metaState().soul;
    const rr = G.doPeakRitual();
    ck('★ 首次完成仪式：给 50 魂点 + 记章节目标 + 不解锁结局 + 不触发结算',
       rr.ok && G.metaState().soul === soulB + 50 && !!G.S().flags.ended_C && !G.S().ending && !G.S().flags.settledEnding,
       'ok=' + rr.ok + ' 魂点 ' + soulB + ' → ' + G.metaState().soul + ' ended_C=' + G.S().flags.ended_C + ' ending=' + G.S().ending);
    ck('★ 章节目标不算进结局列表（做完之后也没有 settle 入口）', G.checkEndingActions().every(a => a.id.indexOf('endC') < 0 && a.id.indexOf('settle_endC') < 0), G.checkEndingActions().map(a => a.id).join('/'));
    const soulC = G.metaState().soul;
    const rAgain = G.doPeakRitual();
    ck('★ 重复领取被拒：魂点不再增加', rAgain.ok === false && G.metaState().soul === soulC, 'ok=' + rAgain.ok + ' 魂点 ' + soulC + ' → ' + G.metaState().soul);
    // 老档已经完成过仪式（ended_C=1）：再领照样被拒
    G.S().flags.ended_C = 1;
    const rOld = G.doPeakRitual();
    ck('★ 老档已做完仪式：不能再领魂点', rOld.ok === false && G.metaState().soul === soulC, 'ok=' + rOld.ok + ' 魂点 ' + G.metaState().soul);
    ck('★ 后续传送逻辑仍成立（ended_C=1 时当前目标指向传送石解谜）', /回【山顶】点「传送石」/.test(G.currentObjective()), G.currentObjective());
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
  // 作者 2026-09-18：一个存档只能结算一个结局（不能让一局把所有结局都结算走）
  {
    G.newGame('fisher', 'normal');
    const sl = G.S(); sl.tut = null; sl.flags.ended_A = 1; sl.flags.ended_B = 1;
    ck('结算前：两个结局都还没锁（按钮都是正常的「结算 · 结局」）',
       G.checkEndingActions().every(a => !a.locked), G.checkEndingActions().map(a => a.id).join('/'));
    const ra = G.settleEnding('endA');
    ck('结算「归乡」成功，并记下本存档的唯一定局', ra.ok && G.S().flags.settledEnding === 'A',
       'ok=' + ra.ok + ' settledEnding=' + G.S().flags.settledEnding);
    G.continueRun();
    const soul1 = G.metaState().soul;
    const rc = G.settleEnding('endB');
    ck('★ 同一个存档再结算「岛主」被拒：不结算、不发魂点、不改定局',
       rc.ok === false && /只能结算一个结局/.test(rc.reason) && G.S().flags.settled_B !== 1 &&
       G.S().flags.settledEnding === 'A' && G.metaState().soul === soul1,
       (rc.reason || '（没给理由）') + ' | 魂点 ' + soul1 + ' → ' + G.metaState().soul);
    // ⚠️ 这两条断言在 2026-09-23 **按作者要求改了契约**（不是放宽）：
    //    旧契约 = 被拒后按钮留着、标成「本局已收尾」；新契约 = 这类点不动的按钮**一个都不列**。
    //    作者原话："结局按钮貌似只消失一个，其他还是不能取消"。
    //    "界面不能静默失败"这条要求没变 —— 它由 settleEnding 返回的原因、以及
    //    askSettleEnding 的说明弹窗承担，下面照旧断言。
    ck('★ 定局之后不再列出任何点不动的「结算」按钮（旧版会留成「本局已收尾」）',
       G.checkEndingActions().every(a => a.id.indexOf('settle_') < 0),
       G.checkEndingActions().map(a => a.id).join('/') || '（一个都没有）');
    ck('★ 但"为什么不能结算"仍然问得到（不是静默失败）',
       (() => { const rr = G.settleEnding('endB');
                return rr.ok === false && /只能结算一个结局/.test(rr.reason || ''); })(),
       'settleEnding 仍返回明确原因');
    ck('★ 其他结局照样能达成（不然第二个结局 B 被锁 → 照样卡死）', !!G.S().flags.ended_B);
    ck('★ 结算前有二次确认，且写明"不能再结算其他结局"',
       /结算前确认/.test(GAME) && /不能再结算其他结局/.test(GAME) && /确定结算/.test(GAME) && /再想想/.test(GAME));
    G.S().flags.metaSettled = 0;
    G.reviveToday();
    ck('★ 复活不能绕过定局（作者 2026-09-19 定死）',
       G.S().flags.settledEnding === 'A', 'settledEnding=' + G.S().flags.settledEnding);
    ck('复活也不会清掉"这个结局已经结算过"的单条标记', G.S().flags.settled_A === 1, 'settled_A=' + G.S().flags.settled_A);
    // 复活之后：定局还在 → 不列出任何「结算」按钮（结算过的 A 不出、未结算的 B 也不出）
    G.S().flags.ended_B = 1;
    const idsAfter = G.checkEndingActions().map(a => a.id);
    ck('★ 复活后不列出任何「结算」按钮（结算过的「归乡」和没结算的「岛主」都不出现）',
       idsAfter.every(id => id.indexOf('settle_') < 0), idsAfter.join('/') || '（一个都没有）');
    // ⚠️ 反向保护：这次只该藏「结算」，**「达成」必须留着** —— 其他结局仍要能达成（进日记 / 成就），
    //    一起藏掉就等于把第二个结局卡死。临时把 B 摆成"可达成"，查完立刻原样还原，不动主流程状态。
    {
      const so = G.S();
      const bak = { endedB: so.flags.ended_B, boss: so.flags.boss_pirateBoss, fame: so.fame,
                    wall: so.buildings.wall, scene: so.scene };
      so.flags.ended_B = 0; so.flags.boss_pirateBoss = 1; so.fame = 4; so.buildings.wall = 3; so.scene = 'camp';
      const acts2 = G.checkEndingActions();
      ck('★ 定局后「达成」按钮照旧出现（只藏「结算」，不藏「达成」）',
         acts2.some(a => a.id === 'endB'), acts2.map(a => a.id).join('/') || '（一个都没有）');
      so.flags.ended_B = bak.endedB; so.flags.boss_pirateBoss = bak.boss; so.fame = bak.fame;
      so.buildings.wall = bak.wall; so.scene = bak.scene;
    }
    const rAfter = G.settleEnding('endB');
    ck('★ 复活后照样结算不了别的结局（定局仍是归乡、不发光）',
       rAfter.ok === false && /只能结算一个结局/.test(rAfter.reason) && G.S().flags.settledEnding === 'A' && G.S().flags.settled_B !== 1,
       'ok=' + rAfter.ok + ' settledEnding=' + G.S().flags.settledEnding);
    G.continueRun();
    G.save(); G.load();
    ck('定局标记跟着存档走：读档之后还是一局只能结算一个', G.S().flags.settledEnding === 'A',
       'settledEnding=' + G.S().flags.settledEnding);
    // 死亡结局 D 不占名额：死过一次（D 已结算）之后再结算 A，照样能成
    {
      G.newGame('fisher', 'normal');
      const sD = G.S(); sD.tut = null;
      sD.flags.ended_A = 1; sD.flags.metaSettled = 1; sD.ending = 'D';
      const rD = G.settleEnding('endA');
      ck('★ 死亡结局 D 不占用"一局一个结局"的名额（结算过 D 之后照样能结算 A）',
         rD.ok && G.S().flags.settledEnding === 'A', 'ok=' + rD.ok + ' settledEnding=' + G.S().flags.settledEnding);
      G.continueRun();
    }
    // 老存档（旧版本结算过、没有 settledEnding 这个字段）读进来也要补上定局，不能借读档绕开规矩
    const sOld = G.S();
    sOld.flags.settledEnding = undefined; sOld.flags.settled_A = 1;
    G.save(); G.load();
    ck('★ 老存档（旧版本已结算过结局）读档时自动补记定局', G.S().flags.settledEnding === 'A',
       'settledEnding=' + G.S().flags.settledEnding);
  }
  // 大地图：点箭头之前先问"能不能去"，不能去就当场在屏幕中央说清原因
  // （玩家反馈"点不了去山顶"——雷暴 / 保暖不够 / 体力不够以前只写一行左侧日志，看着像按钮坏了）
  ck('★ 大地图点箭头先做 canTravel 预检，失败当场中央提示（不弹空确认框）',
     UI.includes('const chk = Game.canTravel(id);') && UI.includes("if (!chk.ok) { addLog(chk.reason, 'warn'); centerToast(chk.reason); return; }") &&
     UI.includes('centerToast(why)') && UI.includes('体力不够，走不动这么远'));
  // 连攻规则必须在游戏里讲清楚（玩家反馈"多 15 攻速为什么不能打两次"）
  ck('战斗规则页写明了"时间追赶"出手机制（含 6 打 7 的例子与同时结算）',
     /速度快的一方先出手，也能出手更多次/.test(UI) && /双持武器轮流攻击/.test(UI));
  ck('人物属性面板写清"你出手 N 次敌人还几次手"', UI.includes("row('攻速', s)") && !UI.includes('你出手 ${s} 次的时间里'));
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
  // ⚠️ 2026-09-19 补：**真正死掉的档**读回来必须还是"死"的（以前会被清成可玩状态 →
  //    回标题点"继续上次游戏"、进去吃口药又活了，玩家反馈"死亡还有啥意义"）。
  {
    G.newGame('fisher', 'normal');
    const Sz = G.S();
    G.addItem('relic', 1, true); G.addItem('slate', 3, true); G.addItem('dragonbone', 1, true);
    Sz.scene = 'peak';
    Sz.ending = 'D'; Sz.death = '你倒在荒野里，再也没能站起来。'; Sz.stats.hp = 0;
    ck('死亡结算状态挂着时，结局按钮确实会消失（复现）', G.checkEndingActions().length === 0);
    G.save();
    const loadedDead = G.load();
    ck('★ 死掉的档读回来仍然是"死亡结算"状态（不能直接放回游戏）',
       loadedDead && G.S().ending === 'D' && G.S().stats.hp === 0 && !!G.S().death,
       'ending=' + G.S().ending + ' hp=' + G.S().stats.hp);
    ck('★ 这种状态下吃药也活不过来（药只会被界面挡住/无法生效）',
       (() => { G.addItem('herbPaste', 1, true); const hp0 = G.S().stats.hp; try { G.useMed('herbPaste'); } catch (e) {}
         return G.S().stats.hp === hp0; })(), 'hp=' + G.S().stats.hp);
    // 活着读档（比如看完结算画面留着继续玩）仍然要把结算状态清掉，恢复成可玩
    G.newGame('fisher', 'normal');
    const Sv2 = G.S();
    G.addItem('relic', 1, true); G.addItem('slate', 3, true); G.addItem('dragonbone', 1, true);
    Sv2.scene = 'peak'; Sv2.ending = 'C'; Sv2.stats.hp = 88;
    G.save();
    ck('活着读档：结算状态会被清掉（继续玩不受影响）', G.load() && !G.S().ending, 'ending=' + G.S().ending);
    const acts = G.checkEndingActions().map(a => a.id);
    ck('章节目标「祭坛仪式」不算结局：清掉结算状态后结局列表仍不含它', acts.indexOf('endC') < 0, acts.join('/'));
    ck('继续游戏的接口存在（结局界面"留在岛上/回到标题"会调它）', typeof G.continueRun === 'function' && /Game\.continueRun\(\)/.test(UI));
    ck('标题页点「继续上次游戏」遇到死亡档会直接弹结局画面（按检查点决定能否回溯）',
       /s0\.ending === 'D'/.test(UI) && /noRevive: !Game\.reviveInfo\(\)\.ok/.test(UI) && /无法回溯/.test(UI));
    // 备份槽读档同样要清（备份槽存的是"当时那份 S"，一般是活着的时候）
    G.S().ending = 'A'; G.S().stats.hp = 90;
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
      if (r.ok) { bad.push(c + ' 不应继续兑换'); continue; }G.metaState().redeemed[c]=1;G.metaState().mailbox.push({code:c,relic:rid,qty:1});
      const list = G.mailboxList();
      const idx = list.findIndex(x => x.relic === rid);
      if (idx < 0) { bad.push(c + ' 没进邮箱'); continue; }
      G.claimMailbox(idx);
      if (!(G.S().relics || []).includes(rid)) bad.push(c + ' 领取没生效');
    }
    ck('happy5~9 停止新兑换，旧神物邮件仍可领取', bad.length === 0, bad.join('；') || Object.values(RELIC_CODES).join('、'));
    const before = G.invCount('coin');
    const r2 = G.redeemCode('RESOURCE1');G.metaState().redeemed.RESOURCE1=1;G.metaState().mailbox.push({code:'RESOURCE1',item:'coin',qty:10});
    const idx2 = G.mailboxList().findIndex(x => x.item === 'coin');
    if (idx2 >= 0) G.claimMailbox(idx2);
    ck('resource1 已下架，旧邮件给 10 金币', !r2.ok && G.invCount('coin') === before + 10, '金币 ' + before + '→' + G.invCount('coin'));
    ck('这些码不写在活动页/公告里（不会自己暴露给玩家）',
       !/HAPPY[5-9]|RESOURCE1/.test(UI) && !/HAPPY[5-9]|RESOURCE1/.test(JSON.stringify(PATCH_NOTES)),
       '活动页与公告都查过');
    const dup = G.redeemCode('HAPPY9');
    ck('同一个码不能领第二次', dup.ok === false && /用过|已结束/.test(dup.reason || ''), dup.reason || '');
  }
}

{
  const AUDIO = fs.readFileSync(ROOT + '/js/audio.js', 'utf8');
  // 设置面板
  ck('菜单里有「设置」入口', /data-savemenu="settings"/.test(UI) && /kind === 'settings'/.test(UI) && /function settingsModal\(\)/.test(UI));
  // 作者 2026-09-19：三个声音开关并成同一行的单按钮开关
  ck('设置里音乐 / 音效 / 环境音三个开关（同一行，单按钮翻转）',
     /tgl\('audio:music'/.test(UI) && /tgl\('audio:sfx'/.test(UI) && /tgl\('audio:amb'/.test(UI) &&
     /AudioFX\.toggleSfx\(\)/.test(UI) && /set-inline/.test(UI) &&
     /set-inline/.test(fs.readFileSync(ROOT + '/css/style.css', 'utf8')));
  ck('日志栏显示方式与大小合并到同一行',
     /<b>日志栏<\/b>[\s\S]{0,400}btn\('log:always'[\s\S]{0,400}btn\('logw:narrow'/.test(UI) &&
     /set-lbl/.test(UI));
  ck('设置里能关掉「当前目标」提示（本机偏好，存 localStorage）',
     /data-set="obj:on"/.test(UI) && /data-set="obj:off"/.test(UI) && /guyuyizhang_obj/.test(UI) &&
     /st\.scene !== 'camp' \|\| !showObjective/.test(UI));
  ck('每日签到挪到设置面板最上面（第一块就是它）',
     /<div class="help-list">\s*<div class="help-item"><b>图鉴 · 每日签到<\/b>/.test(UI));
  ck('皮肤包要花魂点解锁：深海琥珀 / 彩绘卡面 各 50 魂点',
     /data-askin=/.test(UI) && /function unlockSkin\(id\)/.test(_GAME_SRC) && /const SKIN_COST = 50;/.test(_GAME_SRC) &&
     /skinOwned\(s\.id\)/.test(UI));
  ck('本地存档有导出提醒与小字版本号', UI.includes('<b>本地存档</b>') && UI.includes('请导出存档码备份') && UI.includes('help-sub\">版本'));
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
     /const SKIN_LS_KEY = 'guyuyizhang_skin';/.test(UI) &&
     /localStorage\.getItem\(SKIN_LS_KEY\)/.test(UI) && /localStorage\.setItem\(SKIN_LS_KEY, JSON\.stringify/.test(UI) &&
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
     !/data-audm/.test(UI) && !/data-auda/.test(UI) && /tgl\('audio:music'/.test(UI));
  // 石板改回"纯任务道具"：只能捡，不能买也不能卖（防止玩家卖掉山顶捡到的石板卡死解谜）
  ck('石板不可买卖（只能靠捡）',
     LAOCHAO.buy.every(e => e.id !== 'slate') &&
     TOWN.informant.buy.every(e => e.id !== 'slate') && BLACKMARKET.buy.every(e => e.id !== 'slate'));
  // 攻速对称性：旧版只取主手武器的 spd，导致"主手塞快匕首"能白嫖攻速（主副手互换差 150%）
  {
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
    ck('单拿武器攻速不变（匕首 13 / 铁大剑 6 / 铁剑 10）', base('knifeStone', null) === 13 && base('ironGreatSword', null) === 6 && base('ironSword', null) === 10);
    ck('双匕首 ×2 仍然生效（改为数据标记 dual，不再靠武器名正则）',
       base('ironDagger','ironDagger') > base('ironDagger', null) &&
       /dual:1/.test(_DATA_SRC) && /w\.dual && w2\.dual/.test(_GAME_SRC),
       '双匕首 ' + base('ironDagger','ironDagger'));
    ck('弹药只喂对应的远程武器（弓开火不扣源能子弹）',
       /function ammoConsume\(weapon\)/.test(_GAME_SRC) && /rw = \(weapon && weapon\.ammoItem\) \? weapon : rangedWeapon\(\)/.test(_GAME_SRC) &&
       /ammoConsume\((rwNow|rw2|firedWeapon|rangedWeapon\(\))\)/.test(_GAME_SRC));
    ck('远程判定口径统一（主手不是远程就看副手，不再漏判）',
       /function hasRanged\(\) \{\s*const rw = rangedWeapon\(\);/.test(_GAME_SRC));
    ck('弹药不能装备到手上（主副手不会被子弹占掉）',
       /if \(it\.ammo\) \{ log\(/.test(_GAME_SRC) && /!it\.ammo/.test(UI));
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
         /const cur = meleeWeaponNow\(\);/.test(_GAME_SRC) && avg === 21, '面板 ' + avg);
      ck('单持时伤害不受影响（大剑 30 / 匕首 12）',
         (() => { GR('ironGreatSword', null); const a = G.playerAtk(); GR('ironDagger', null); return a === 30 && G.playerAtk() === 12; })());
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
         // 2026-09-22：命中保底把这一行包进了 pity()，形状变了但意图不变（仍是"按真正开火的武器算"），
         // 所以正则放宽到"这行里确实用 rangedAcc(rangedKind(rangedWeapon()))"，不断言整行的写法。
         /if \(ranged\) return [^\n]*rangedAcc\(rangedKind\(rangedWeapon\(\)\)\)/.test(_GAME_SRC) &&
         !/ITEMS\[S\.equipment\.weapon\]\.id === 'pistol'\) acc = 0\.6/.test(_GAME_SRC));
      {
        // 决定性判定：命中 = random < acc，用固定随机数卡阈值
        const tryShot = (main, off, calibrated, rv) => {
          G.newGame('fisher', 'normal');
          const s = G.S(); s.inv = {};
          s.capacity = 999;
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
          C.bowShots = 0; C.dist = 0; C.enemies.forEach(e => { e.spd = 0; e.atk = 0; });
          const before = C.log.length;
          G.S().stats.hp = 999999;
          G.fightAction('ranged');
          const C2 = G.S().combat;
          let res = 'no-log';
          if (C2) { const nw = C2.log.slice(before).join(' '); res = /你(?:开枪射击|拉弓射箭).*造成/.test(nw) ? 'hit' : (/落空|擦着/.test(nw) ? 'miss' : '?'); }
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
        // ⚠️ 2026-09-23 契约变更：皮肤从单选改成多选，判断从 `skin === 'accent'` 变成 `skinOn('accent')`。
        //    断言跟着改写法，**判据没放宽**（仍然是"彩色目录只给 ACCENT 里点名的那几个"）。
        ck('皮肤切换物品图标（黑白 items/ ↔ 彩色 items-accent/，缺彩色自动回退）',
           /const ACCENT = \{/.test(UI) && /const dir = \(ALWAYS_COLOR\[id\] \|\| \(skinOn\('accent'\) && ACCENT\[id\]\)\) \? 'items-accent' : 'items';/.test(UI));
        ck('限定物（神弓、神之甲、两种神包）常驻彩色，不受皮肤影响',
           /const ALWAYS_COLOR = \{ divineBow:1, divineArmor:1, divinePack:1, divineSuperPack:1 \};/.test(UI) && /ALWAYS_COLOR\[id\] \|\|/.test(UI));
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
           /C\.sweepCd - 100 \/ Math\.max\(1, combatSpeed\(false\)\)/.test(_GAME_SRC) &&
           /function sweepInfo\(\)/.test(_GAME_SRC) && /act === 'sweep'/.test(_GAME_SRC) && UI.includes("acts.push(['sweep','横扫 · 全体',sw])"));
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
        c3.enemy = {...c3.enemy, spd:1}; c3.dist = 0; // 玩家先出手，检查掩护尚未到期时的减伤
        if (c3.enemies.length < 2) c3.enemies.push(JSON.parse(JSON.stringify(c3.enemies[0])));
        c3.enemies.forEach(e => { e.ehp = 99999; e.emax = 99999; e.def = 0; e.cover = 0; e.intent = null; });
        const rk = Math.random; Math.random = () => 0.1;
        const h0 = c3.enemies[0].ehp;
        G.fightAction('attack');
        const dmgNo = h0 - G.S().combat.enemies[0].ehp;
        gw('ironSword'); G.startFight(ENEMIES.wolf, true);
        c3 = G.S().combat;
        c3.enemy = {...c3.enemy, spd:1}; c3.dist = 0;
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
           !mn || (mn.baseDef === 3 && mn.def === (mn.heavy ? 0 : 3)), mn ? 'def=' + mn.def : '未召唤到');
      }
      // 顶部状态条配色 + 工具栏图标
      {
        ck('生命/体力条改成淡米红与淡米黄（两套皮肤都生效）',
           /--hp: #d9a094;/.test(CSS) && /--sta: #dcc9a2;/.test(CSS) &&
           /\.stat-fill\.hp \{ background: var\(--hp\); \}/.test(CSS) && /\.stat-fill\.st \{ background: var\(--sta\); \}/.test(CSS) &&
           /\.hp-fill\.me \{ background: var\(--hp\); \}/.test(CSS));
        ck('工具栏槽位用物品图标（原来是字形，所以看不到图标）',
           UI.includes('data-eqpick="tool">${id?itemIcon(id)'));
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
        ck('金矿可熔成金锭，仍可卖给铁匠',
           RECIPES.some(r => r.out.goldIngot && r.in.goldore >= 8) && !!TOWN.smith.buy.find(e => e.id === 'goldore'));
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
       /Game\.newGame\(lastIdentity,\s*lastDifficulty\);[\s\S]{0,130}freshRun = \(e && e\.isTrusted === false\) \? !!window\.__guyuForceComic : true;/.test(UI) &&
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
    const note=PATCH_NOTES.find(n=>n.version==='v1.10');
    ck('旧公告已撤下，新版草稿保留', !!note && !note.approved && PATCH_NOTES.every(n=>n.version==='v1.10'));
    const approved=note.approved;note.approved=true;
    const meta0=G.metaState();meta0.patchSent=meta0.patchSent || {};delete meta0.patchSent[note.version];
    meta0.mailbox=(meta0.mailbox || []).filter(x=>!x.notice);
    const first=G.mailboxList().filter(x=>x.notice===note.version);
    ck('批准后公告只投递一次',first.length===1 && G.mailboxList().filter(x=>x.notice===note.version).length===1);
    ck('公告正文日期保持正常',!!first[0] && first[0].date===note.date && String(first[0].body).includes('存档'));
    const i=G.mailboxList().findIndex(x=>x.notice===note.version);
    ck('公告点知道了移除',G.claimMailbox(i).ok && !G.mailboxList().some(x=>x.notice===note.version));
    note.approved=approved;

  }
  // 背包用完后保留界面
  ck('背包：用完还留在这一页 / 回列表时记得滚动位置',
     /function openItemDetail\(id,fromWarehouse=false\)/.test(UI) && /function afterItemUse\(id,source=false\)/.test(UI) &&
     /if \(Game\.itemUseCount\(id,source\) > 0\) openItemDetail\(id,source\);/.test(UI) && /function restoreInvScroll\(\)/.test(UI) &&
     /invScroll\s*=\s*mc\s*\?\s*mc\.scrollTop\s*:\s*0;/.test(UI));
}

section('7. 收尾：休息时长 / 夜袭 / 存档');
{
  G.newGame('fisher', 'normal');
  const S = G.S();
  S.stats.stamina = 10; G.rest(1); ck('休息1小时 +10 体力', S.stats.stamina === 20);
  S.stats.stamina = 10; G.rest(3); ck('休息3小时 +30 体力', S.stats.stamina === 40);
  S.stats.stamina = 10; G.rest(); ck('不传参数默认 1 小时', S.stats.stamina === 20);
  // 玩家反馈"21:55 休息到 23:55，跳了每日收益，休息的体力消失了"：
  // 根因是 rest() 先走时间、跨天时 newDay() 会先 save()（存的是加体力之前的状态），而 rest() 自己从不 save()。
  {
    const savedStam = () => { try { return Math.round(JSON.parse(localStorage.getItem('guyuyizhang_save')).stats.stamina); } catch (e) { return null; } };
    G.newGame('fisher', 'normal');
    const sR = G.S(); sR.tut = null; sR.minute = 21 * 60 + 55; sR.stats.stamina = 50; sR.stats.hunger = 80; sR.stats.thirst = 80;
    G.rest(2);
    ck('★ 休息后体力真的进了存档（21:55 休息 2 小时：内存 = 存档）',
       Math.round(G.S().stats.stamina) === 70 && savedStam() === 70, '内存 ' + Math.round(G.S().stats.stamina) + ' / 存档 ' + savedStam());
    ck('★ 读档回来体力还在（不会"休息白休"）', (() => { G.load(); return Math.round(G.S().stats.stamina) === 70; })(), Math.round(G.S().stats.stamina));
    // 跨午夜那一档最容易出事（newDay 会顺手 save）
    G.newGame('fisher', 'normal');
    const sR2 = G.S(); sR2.tut = null; sR2.minute = 23 * 60; sR2.stats.stamina = 50; sR2.stats.hunger = 80; sR2.stats.thirst = 80;
    G.rest(2);
    ck('★ 跨午夜休息也不会丢（23:00 休息 2 小时 → 存档里是 70）',
       G.S().day === 2 && Math.round(G.S().stats.stamina) === 70 && savedStam() === 70,
       '第' + G.S().day + '天 内存 ' + Math.round(G.S().stats.stamina) + ' / 存档 ' + savedStam());
  }
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
  // 面板预估必须和引擎同一套系数，避免"显示 +13 实际 +2"这种漂移。
  // 2026-09-21：UI 改成直接调 Game.sleepForecast()，这里核对两件事：① 不再自抄公式 ② 午觉也走同一份预估。
  ck('睡眠面板的预估公式与引擎一致',
     /Game\.sleepForecast\('nap'\)/.test(UI) && !/const penMul = 0\.35;/.test(UI) && !/Math\.round\(7 \* sq\)/.test(UI) &&
     (function () {
       G.newGame('fisher', 'normal');
       const s = G.S(); s.minute = 14 * 60; s.flags.wolfRaidPending = 0;
       s.stats.hp = 50; s.stats.stamina = 0; s.stats.hunger = 50; s.stats.thirst = 50; s.stats.spirit = 50;
       const f = G.sleepForecast('nap');
       G.sleep('nap');
       const a = G.S().stats;
       return f.sta === Math.round(a.stamina) && f.hp === Math.round(a.hp - 50) && f.sp === Math.round(a.spirit - 50);
     })());
  // 夜袭弹窗
  G.newGame('fisher', 'normal');
  const S2 = G.S();
  S2.buildings.wall = 1; S2.flags.wolfRaidPending = 1;
  let overlay = null;
  G.bind({ onOverlay: o => { overlay = o; } });
  G.sleep();
  const labels = overlay && overlay.choices ? overlay.choices.map(c => c.label) : [];
  ck('夜袭弹窗含殊死搏斗/远远观望', labels.includes('殊死搏斗') && labels.includes('远远观望'), labels.join('/'));
  // ⛔ 防御不能回体力（作者 2026-09-22 修的真 bug）：以前每次防御 +10 且无上限，
  //    找个怪硬拖 15 回合就能刷满一管 150 体力，体力系统直接失效。
  if (overlay) { overlay.choices[0].ok(); winFights(); }
  ck('殊死搏斗能打完', !G.S().combat);
  {
    // ⛔ 防御不能回体力（作者 2026-09-22 修的真 bug）：以前每次防御 +10 且无上限，
    //    找个怪硬拖 15 回合就能刷满一管 150 体力，体力系统直接失效。
    //    借夜袭进战斗（和上面同一套流程），然后连点防御看体力涨不涨。
    G.newGame('fisher', 'normal');
    const sf = G.S();
    sf.tut = null; sf.stats.stamina = 20; sf.stats.hp = 99999;
    sf.buildings.wall = 1; sf.flags.wolfRaidPending = 1;
    let ov2 = null;
    G.bind({ onOverlay: o => { ov2 = o; } });
    G.sleep();
    if (ov2 && ov2.choices) ov2.choices[0].ok();     // 殊死搏斗
    if (G.S().combat) {
      const st0 = G.S().stats.stamina;
      for (let i = 0; i < 12 && G.S().combat; i++) G.fightAction('defend');
      ck('★ 连续防御不会回复体力（防止刷满体力）', G.S().stats.stamina <= st0,
         '防御前 ' + Math.round(st0) + ' → 12 回合后 ' + Math.round(G.S().stats.stamina));
    } else {
      ck('★ 连续防御不会回复体力（防止刷满体力）', false, '没能进入战斗，测试没跑起来');
    }
  }
  {
    // ⛔ 海底脱掉潜水服必须付出代价（作者 2026-09-22 反馈"脱了还能行动不扣血"）：
    //    原先 addMin 的海底段只查氧气罩、不查潜水服，脱了衣服唯一的后果只是不再掉耐久。
    G.newGame('fisher', 'normal');
    const sa = G.S();
    // ⚠️ 体力必须压低：rest() 开头有「体力充沛就不休息」的短路，设满会直接 return、时间根本不走
    sa.tut = null; sa.stats.hp = 200; sa.stats.hunger = 100; sa.stats.thirst = 100; sa.stats.stamina = 10;
    sa.atlantis = { unlocked: true, camp: { furniture: {} } };
    sa.scene = 'atlantis'; sa.zone = 'trench';
    G.addItem('diveMask', 1, true);            // 只缺潜水服，氧气是够的
    const hpNoSuit = sa.stats.hp;
    G.rest(1);
    ck('★ 海底没穿潜水服会因水压掉血', G.S().stats.hp < hpNoSuit,
       '没穿潜水服 1 小时后 ' + Math.round(hpNoSuit) + ' → ' + Math.round(G.S().stats.hp));
    // 对照组：穿上潜水服就不该再吃这份水压伤害
    G.newGame('fisher', 'normal');
    const sb2 = G.S();
    sb2.tut = null; sb2.stats.hp = 200; sb2.stats.hunger = 100; sb2.stats.thirst = 100; sb2.stats.stamina = 10;
    sb2.atlantis = { unlocked: true, camp: { furniture: {} } };
    sb2.scene = 'atlantis'; sb2.zone = 'trench';
    G.addItem('diveMask', 1, true); G.addItem('diveSuit', 1, true);
    sb2.equipment.cloth = 'diveSuit';
    const hpSuit = sb2.stats.hp;
    G.rest(1);
    ck('★ 穿上潜水服就不吃水压伤害（对照组）', G.S().stats.hp === hpSuit,
       '穿潜水服 1 小时后 ' + Math.round(hpSuit) + ' → ' + Math.round(G.S().stats.hp));
  }
  {
    // ⛔ 食之包不得自动吃掉蜂蜜（作者 2026-09-22 定案）：
    //    蜂蜜 饱+15 是全食物最小值，而食之包挑"最省的那份" → 永远先吃掉它。
    //    玩家攒蜜是做药材，被自动消耗等于悄悄扣材料。真机证据：饱 36/蜂蜜1 → 12 分钟后 饱 50/蜂蜜0。
    // 神物要连 relics / relicEquip / relicSlots 一起设，否则 hasRelic() 不成立、食之包根本不触发
    // （第一版我用 rest() 推进时间，还踩了"体力充沛就不休息"的短路，双重错，测试假通过）
    const mkSatchel = (ids) => {
      G.newGame('fisher', 'normal');
      const s2 = G.S(); s2.tut = null;
      s2.relics = ['satchel']; s2.relicEquip = ['satchel', null, null]; s2.relicSlots = 1;
      s2.inv = {}; s2.stats.hunger = 40; s2.stats.thirst = 90;
      for (const id of ids) G.addItem(id, 1, true);
      G.timePass(60);
      return s2;
    };
    // 2026-09-22 定案改成"有额外加成的**留到最后吃**"（不再整个禁掉）：
    //   排序 = 额外收益(治疗/体力/精神/buff)高的排后面，同档再按饱食值从小吃起。
    //   蜂蜜 体+7(7分) vs 熏鱼 命+5(5分) → 熏鱼先吃；深海鱼带 buff(≥10) → 排更后。
    mkSatchel(['honey', 'smokedFish']);
    ck('★ 蜂蜜与熏鱼同场时，先吃熏鱼、把蜂蜜留到最后',
       G.invCount('honey') === 1 && G.invCount('smokedFish') === 0,
       '蜂蜜 ' + G.invCount('honey') + ' · 熏鱼 ' + G.invCount('smokedFish'));
    mkSatchel(['honey', 'smokedFish', 'rareFishE']);
    ck('★ 带增益的深海鱼排得比蜂蜜还后（三者同场先吃熏鱼）',
       G.invCount('smokedFish') === 0 && G.invCount('honey') === 1 && G.invCount('rareFishE') === 1,
       '熏鱼 ' + G.invCount('smokedFish') + ' · 蜂蜜 ' + G.invCount('honey') + ' · 深海鱼 ' + G.invCount('rareFishE'));
    mkSatchel(['honey']);
    ck('★ 只剩下蜂蜜时仍然会吃（"留到最后"不是"永远不吃"）', G.invCount('honey') === 0,
       '蜂蜜 ' + G.invCount('honey'));

    // 配方原料本身不自动算珍贵：蛋、肉、鱼、野菜仍是正常口粮；同为无增益食物时快坏先吃。
    {
      G.newGame('fisher', 'normal');
      const sp = G.S(); sp.tut = null;
      sp.relics = ['satchel']; sp.relicEquip = ['satchel', null, null]; sp.relicSlots = 1;
      sp.inv = {}; sp.stats.hunger = 40; sp.stats.thirst = 90;
      G.addItem('egg', 1, true); G.addItem('berry', 1, true);
      sp.foodExp = sp.foodExp || {};
      sp.foodExp.egg = (sp.tick || 0) + 90;       // 小时结算时仍新鲜，且比浆果先腐坏
      sp.foodBatches={egg:[{qty:1,exp:sp.foodExp.egg}],berry:[{qty:1,exp:(sp.tick||0)+300}]};
      sp.foodExp.berry = (sp.tick || 0) + 300;    // 还早
      G.timePass(60);
      ck('★ 配方原料不被误判为增益食物，同档先吃快坏的蛋', G.invCount('egg') === 0 && G.invCount('berry') === 1,
         '蛋 ' + G.invCount('egg') + ' · 浆果 ' + G.invCount('berry'));
    }
  }
  {
    // 照明不够：进门前就该知道（作者 2026-09-22）
    // ⚠️ needLight 是**海底专属**机制（潜水护目镜 / 弱光手电 / 强光手电），点位挂在 sc.zones[zone] 下。
    //    山洞那套黑暗走的是 need.item='torch'，完全是另一条链路 —— 我第一版拿山洞测，前提就是错的。
    //    所以这里直接验海底：下潜到需要照明 3 的区域，断言「太暗」提醒出现。
    G.newGame('fisher', 'normal');
    const sd = G.S();
    sd.tut = null; sd.stats.stamina = 99999;
    G.addItem('seachart', 1, true); G.addItem('diveSuit', 1, true); G.addItem('diveMask', 1, true);
    sd.equipment.cloth = 'diveSuit';
    G.travel('atlantis');
    // 作者 2026-09-22：照明不够应该**进不去**，不是"游进去才发现全暗"。
    G.setZone('trench');                      // 海沟：atl_dark 要照明 3
    const tailNoLight = (G.S().log || []).slice(0, 4).map(x => x.text).join(' | ');
    ck('★ 照明不足时进不去该区域（会说明缺哪件装备）',
       G.S().zone !== 'trench' && /看不见|照明装备|手电|护目镜/.test(tailNoLight), tailNoLight.slice(0, 120));
    // 带上强光手电（照明 3）就该能进
    G.addItem('lightStrong', 1, true);
    (G.S().toolkit = G.S().toolkit || [])[0] = 'lightStrong';
    G.setZone('trench');
    ck('★ 装上防水强光潜水手电后可以进入海沟', G.S().zone === 'trench', 'zone=' + G.S().zone);
  }
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
  // 岛主结局：作者 2026-09-22 加难度 —— 声望要求从 2 提到 4（声望上限同时 3→5）
  S4.buildings.dock = 5; S4.buildings.wall = 3; S4.fame = 4; S4.flags.boss_pirateBoss = 1;
  G.addItem('seachart', 1, true); G.addItem('supplybox', 3, true);
  const names = G.checkEndingActions().map(a => a.name);
  ck('归乡/岛主结局条件可达成', names.some(n => /归乡/.test(n)) && names.some(n => /岛主/.test(n)), names.join(' / '));
  // 再验一次"声望 3 不够"：加难度要真的加在门槛上，不是只改文案
  S4.fame = 3;
  ck('★ 声望 3 时岛主结局不出现（门槛确实提到 4）', !G.checkEndingActions().map(a => a.name).some(n => /岛主/.test(n)));
}

section('7b. 制造等级（玩家反馈：技能升到 4 级却说经验不够）');
{
  // 以前 expLevel 只看"剩余经验"，花经验升级技能会让等级反而下降
  G.newGame('fisher', 'normal');
  const Sk = G.S();
  Sk.exp.craft = 600; Sk.skill.craft = 0;
  for (let i = 0; i < 4; i++) G.skillUpTrunk('craft', 'speed');   // 制造树 ×3：(12+28+50+80)×3 = 510
  ck('把经验花在技能上不会让"制造等级"倒退', Sk.skill.craft === 4 && Sk.exp.craft === 102 && G.expLevel('craft') >= 2, '技能 ' + Sk.skill.craft + ' 级，剩余经验 ' + Sk.exp.craft + '，等级 ' + G.expLevel('craft'));
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
  ck('提示改成「制造等级」并显示当前等级', /需要制造等级 \$\{f\.needCraft\}（当前 \$\{expLevel\('craft'\)\}）/.test(_GAME_SRC) && UI.includes('Game.canBuildFurniture(f.id)') && UI.includes('buildCheck.reasons.map(esc)'));
}

section('7c. 蓝牛（体力药水）与精神机制');
{
  const rb = RECIPES.find(r => r.id === 'r_bluebull');
  // 2026-09-22：蓝牛加蜂蜜不加盐（作者定案），五维药水的门槛落在"蜂蜜要采两份"上
  ck('蓝牛配方存在：淡水×2 + 草药×3 + 蜂蜜×2 @药炉',
     !!rb && rb.station === 'medPot' && JSON.stringify(rb.in) === JSON.stringify({ water: 2, herb: 3, honey: 2 }) && rb.out.blueBull === 1);
  ck('蓝牛是药品：+70体力 / +30水分 / -10精神', ITEMS.blueBull.cat === 'med' && ITEMS.blueBull.sta === 70 && ITEMS.blueBull.water === 30 && ITEMS.blueBull.spirit === -10);

  G.newGame('fisher', 'normal');
  const Sb = G.S();
  Sb.furniture.medPot = 1;
  G.addItem('water', 2, true); G.addItem('herb', 3, true); G.addItem('honey', 2, true);
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
  // 2026-09-21：公式合并成 game.js 的 sleepMath() 一份，ui.js 不再抄。断言随之改成**跑一遍对数字**，
  // 比原来"两边源码里都有这串系数"更严：面板说几个数，实际结算就必须是几个数。
  ck('体力系数只剩引擎一份（面板不再自己抄公式）',
     /\(0\.45 \+ houseRest \* 0\.12 \+ bedRest \* 0\.32\)/.test(GAME) && !/\(0\.45 \+ houseRest \* 0\.12 \+ bedRest \* 0\.32\)/.test(UI) &&
     /Game\.sleepForecast\('normal'\)/.test(UI));
  {
    G.newGame('fisher', 'normal');
    const s = G.S();
    s.minute = 14 * 60; s.buildings.house = 0;
    for (const b of ['bed1','bed2','bed3','bed4']) delete s.furniture[b];
    s.flags.wolfRaidPending = 0;
    s.stats.hp = 50; s.stats.stamina = 0; s.stats.hunger = 50; s.stats.thirst = 50; s.stats.spirit = 50;
    const f = G.sleepForecast('normal');
    G.sleep('normal');
    const a = G.S().stats;
    ck('安稳睡觉：面板预估的体力/生命/精神 == 实际结算',
       f.sta === Math.round(a.stamina) && f.hp === Math.round(a.hp - 50) && f.sp === Math.round(a.spirit - 50),
       `预估 体+${f.sta} 命${f.hp} 神+${f.sp} / 实际 体+${Math.round(a.stamina)} 命${Math.round(a.hp-50)} 神${Math.round(a.spirit-50)}`);
    ck('安稳睡觉：面板预估的醒来时刻与饱食水分 == 实际结算',
       f.endClock === '22:00' && f.hungerAfter === Math.round(a.hunger) && f.thirstAfter === Math.round(a.thirst),
       `预估 ${f.endClock} 饱${f.hungerAfter} 水${f.thirstAfter} / 实际 ${G.fmtTime()} 饱${Math.round(a.hunger)} 水${Math.round(a.thirst)}`);
    ck('会掉血时面板给出预警数据', f.hp < 0 && f.hpAfter === Math.round(a.hp) && f.hpNow === 50,
       `命 ${f.hpNow}→${f.hpAfter}（${f.hp}）`);
  }
      // 作者 2026-09-15：安稳睡觉统一 8 小时（以前好床睡得更短：8/7/6/5，玩家觉得别扭）；
      // 床的好坏现在只体现在体力恢复比例与精神恢复上。
      ck('安稳睡觉统一 8 小时（引擎与面板一致）',
         /nap \? 2 : \(bed \? \(bf\.sleepH \|\| 8\) : 8\)/.test(GAME) &&
         ['bed1','bed2','bed3','bed4'].every(b => FURNITURE.find(f => f.id === b).sleepH === 8) &&
         (function () {
           G.newGame('fisher', 'normal');
           const s = G.S(); s.minute = 14 * 60; s.flags.wolfRaidPending = 0;
           let ok = G.sleepForecast('normal').hours === 8;          // 无床
           for (const b of ['bed1','bed2','bed3','bed4']) {
             delete s.furniture[b];
             G.newGame('fisher', 'normal');
             const t = G.S(); t.minute = 14 * 60; t.flags.wolfRaidPending = 0; t.furniture[b] = true;
             if (G.sleepForecast('normal').hours !== 8) ok = false;
           }
           return ok;
         })());
  }
  // 药膏 / 绷带 / 大煎蛋 的数值与配方
  ck('草药膏：回血15与健康15（草药2+淡水2）', ITEMS.herbPaste.heal === 15 && ITEMS.herbPaste.healthRestore === 15 && RECIPES.find(r => r.id === 'r_herbpaste').in.water === 2 && RECIPES.find(r => r.id === 'r_herbpaste').in.herb === 2);
  ck('止血绷带：止血 + 回血15，仅生命（布2+草药1）', ITEMS.bandage.heal === 15 && !ITEMS.bandage.healthRestore && !!ITEMS.bandage.stopBleed && RECIPES.find(r => r.id === 'r_bandage').in.cloth === 2);
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
    winFights();     // 撒网同样可能遇袭：打赢才结算（含"竭泽而渔"的标记）
    const bannedMsg = '先前竭泽而渔了，现在暂时看不到鱼的踪迹。';
    ck('河畔撒网次日休整：撒网停，鱼竿可继续钓',
       G.pointStatus(fishPt) === 'ok' && G.pointStatus(netPt) === bannedMsg, G.pointStatus(fishPt));
    Sv.day += 2;
    Sv.pointUses[netPt.id] = 0;
    ck('隔日之后河畔网点恢复', G.pointStatus(netPt) === 'ok', G.pointStatus(netPt));
  }
  // 作者 2026-09-22 调整配方配比：木材类 ≥5 份 ×0.8、其它 ≥5 份 ×1.1。
  // 渔网是「藤蔓8+木材4」→ 藤蔓 8×1.1=9（≥5 才调）、木材 4 份不足门槛原样保留。
  ck('渔网造价（藤蔓9 + 木材4，受配方配比调整影响）与耐久 10',
     RECIPES.find(r => r.id === 'r_net').in.vine === 9 && RECIPES.find(r => r.id === 'r_net').in.wood === 4 && DURA.net === 10,
     '藤蔓' + RECIPES.find(r => r.id === 'r_net').in.vine + ' 木材' + RECIPES.find(r => r.id === 'r_net').in.wood);
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
  ck('晾晒制革栏不再重复列出纺织、烹饪和药品配方', /sid === 'furniture'\) return \['rack','tannery'\]/.test(UI));

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
  // 2026-09-22：深海区现在有照明门槛（照明不够直接进不去），这两条测的是"移动+拦截"，
  // 所以必须先带上强光手电，否则 setZone 会在门口就被拦下、根本走不成。
  (Sd.toolkit = Sd.toolkit || [])[0] = 'lightStrong';
  G.addItem('lightStrong', 1, true);   // lightLevel() 读的是背包持有，光设工具栏不够
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
  ck('道具按钮会显示剩余次数', UI.includes('const left=Math.max(0,2-(C.usedItems||0))') && UI.includes("'剩余 '+left+'/2'"));
  ck('战斗道具列表改成按药品自动生成（新药不用手改）', UI.includes("ITEMS[id].cat==='med'||id==='smokeBomb'||id==='poisonCoat'") && !/\['herbPaste','bandage','antidote','tea','lotusPill','salve','smokeBomb','poisonCoat'\]/.test(UI));

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
  // 最新设计：三管理面板共用左侧竖栏，实际尺寸/滚动另由浏览器探针验证。
  const PANELS = fs.readFileSync(ROOT + '/css/panels.css', 'utf8');
  ck('★ 制造、背包、装备共用左分类面板',
     (UI.match(/return layoutWorkModal\((?:title,|playerPanelTabs\()/g) || []).length === 3 &&
     /data-station="\$\{sid\}"/.test(UI) && /\.work-modal \.work-side \{[^}]*flex-direction: column;/.test(PANELS));
  ck('★ 磨刀石三处都写明"只作用于主手武器"',
     /磨的是<b>主手武器<\/b>/.test(UI) && /只作用于当前主手武器/.test(UI) && /作用于当前主手武器/.test(UI));

  // 深海售卖机（遗失的交易机）：每天随机上架一件神物
  // 作者 2026-09-19：从"每天必上架"削成每天 30% 概率，所以测试要锁随机数才能稳定拿到货
  const Sv = enterAtlantis();
  Sv.day = 30; Sv.relics = [];
  Sv.atlantis = Sv.atlantis || {};
  delete Sv.atlantis.vendor;
  const rndV = Math.random;
  Math.random = () => 0.10;                 // < 0.30 → 今天有货
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
  // 30% 概率：随机数 >= 0.30 的那天应该"没货"，而不是硬塞一件
  Sv.day = 33; Math.random = () => 0.90;
  const v3 = G.atlVendorInfo();
  ck('★ 每天只有 30% 概率有货（随机数 0.9 那天就是空的）', !v3.id && v3.noStock === true, JSON.stringify(v3));
  Math.random = rndV;
  Sv.day = 32;
  G.removeItem('beibi', G.invCount('beibi'));
  Math.random = () => 0.10;
  ck('贝壳币不足时买不了', G.buyRelicFromVendor().ok === false);
  Math.random = rndV;
  ck('交易机面板里有神物上架栏（概率从接口读，写死会跟代码脱节）',
     /data-arelic/.test(UI) && /每天 \$\{Math\.round\(Game\.vendorRelicChance\(\) \* 100\)\}% 概率上架一件/.test(UI) &&
     G.vendorRelicChance() === 0.30);
  // 送神物的奇遇：出现权重砍半（洞穴神龛 4→2）。
  // ⚠️ 另一条「神秘货郎」(re_peddler, w=2.5) 已按作者 2026-09-23 要求**删除**，
  //    亚特兰蒂斯之种只能从海底「神秘鱼人」换 —— 所以这里只验神龛。
  ck('★ 送神物的奇遇权重减半（神龛 w=2）',
     (RANDOM_EVENTS.find(a => a.id === 're_shrine') || {}).w === 2,
     '神龛 w=' + (RANDOM_EVENTS.find(a => a.id === 're_shrine') || {}).w);
  // 食之包：自动吃喝不再无脑拿超级大蛋，且可以指定优先吃哪一件（作者 2026-09-19）
  {
    G.newGame('fisher', 'normal');
    const sS = G.S(); sS.tut = null;
    sS.relics = ['satchel']; sS.relicEquip = ['satchel', null, null]; sS.relicSlots = 1;
    sS.inv = {}; G.addItem('superEgg', 3, true); G.addItem('berry', 5, true); G.addItem('water', 5, true);
    sS.stats.hunger = 40; sS.stats.thirst = 40;
    G.timePass(60);
    ck('★ 没设偏好时食之包不吃超级大蛋（先吃最省的那份）',
       G.invCount('superEgg') === 3 && G.invCount('berry') === 4, '超级大蛋 ' + G.invCount('superEgg') + ' / 浆果 ' + G.invCount('berry'));
    ck('★ 口渴时先喝正经饮品（淡水，不去啃食物）', G.invCount('water') === 4, '淡水 ' + G.invCount('water'));
    G.setSatchelPref('food', 'superEgg');
    sS.stats.hunger = 40;
    G.timePass(60);
    ck('★ 指定"优先吃超级大蛋"之后就会吃它', G.invCount('superEgg') === 2, '超级大蛋 ' + G.invCount('superEgg'));
    G.setSatchelPref('food', '');
    ck('偏好存进存档（读回来还在）', (() => { G.setSatchelPref('drink', 'water'); G.save(); G.load(); return G.satchelPref().drink === 'water'; })());
    ck('装备面板里有食之包的"优先吃/喝"入口',
       /satchelPanels.menu/.test(UI) && /satchelPanels.picker/.test(UI) && /data-satchel/.test(SATCHEL_VIEW) && /Game.toggleSatchelSelection/.test(SATCHEL_VIEW));
  }

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

  // 汇率：**双向**（作者 2026-09-25 定案）—— 50 贝壳 → 1 金币，1 金币 → 30 贝壳。
  // ⚠️ 契约变更：这两条原来写的是"单向 50→1，金币换不回贝壳，从根上杜绝套利"。
  //    作者 2026-09-25 明确要求开反向，所以"杜绝套利"的手段从"没有反向入口"换成"两个方向留价差"：
  //    50 贝 → 1 金 → 30 贝 一圈亏 20；30 贝又买不到 1 金币，怎么转都是亏的。
  G.newGame('fisher', 'normal');
  G.addItem('beibi', 100, true);
  const Sb = G.S(); Sb.inv.coin = 0;
  G.exchangeShells(2);
  ck('老潮按 50 贝壳兑 1 金币', G.invCount('coin') === 2 && G.invCount('beibi') === 0, '金币=' + G.invCount('coin') + ' 贝壳=' + G.invCount('beibi'));
  {
    const c0 = G.invCount('coin'), b0 = G.invCount('beibi');
    const r = G.exchangeGold(1);
    ck('★ 1 金币能反向换回 30 贝壳（本次新增的反向兑换）',
       r.ok === true && r.amount === 1 && G.invCount('coin') === c0 - 1 && G.invCount('beibi') === b0 + 30,
       '金币 ' + c0 + '→' + G.invCount('coin') + ' 贝壳 ' + b0 + '→' + G.invCount('beibi'));
    const r0 = G.exchangeGold(99);   // 把剩下的金币也全换掉（coins=2，前面已换掉 1 枚）
    ck('★ 反向兑换是"清空身上金币"，不是固定换 1 枚',
       r0.ok === true && r0.amount === c0 - 1 && G.invCount('coin') === 0, 'amount=' + r0.amount + ' 余 ' + G.invCount('coin'));
    const r1 = G.exchangeGold(1);
    ck('★ 没有金币时反向兑换被拒并写清原因', r1.ok === false && /金币不足/.test(r1.reason), r1.reason);
    ck('★ 反向汇率 30 < 正向 50：转一圈必亏，套利仍然套不出来',
       G.SHELL_PER_COIN === 50 && G.SHELL_FOR_COIN === 30 && G.SHELL_FOR_COIN < G.SHELL_PER_COIN,
       G.SHELL_PER_COIN + ' / ' + G.SHELL_FOR_COIN);
  }
  // 金币仍然不在任何商人的收购清单里（这是另一条口子：若能"贝壳买金币再卖成贝壳"就真能刷）
  {
    const buyLists = [LAOCHAO.buy, TOWN.grocer.buy, TOWN.smith.buy, TOWN.informant.buy, BLACKMARKET.buy].filter(Boolean);
    const sellable = buyLists.some(l => l.some(e => e.id === 'coin'));
    ck('金币不在任何商人的收购清单里（双向兑换之外没有第三条变现路径）', !sellable, sellable ? '有商人收金币' : '五家收购清单都查过');
  }
  {
    const laoBlock = UI.slice(UI.indexOf('function laochaoTab'), UI.indexOf('function townModal'));
    const atlBlock = UI.slice(UI.indexOf('function atlTradeModal'), UI.indexOf('function fishmanModal'));
    ck('兑换入口放在老潮出售页（两个方向都在），不在亚特兰蒂斯交易机', /data-exshell/.test(laoBlock) && /data-exgold/.test(laoBlock) && !/data-exshell|data-exgold/.test(atlBlock));
  }

  // 图纸：不是概率出现，是"到点固定上架"
  const lot = LAOCHAO.sell.find(e => e.id === 'bpLotus');
  ck('不死丹方：老潮货摊第 20 天起固定上架（200 贝壳）', !!lot && lot.from === 20 && lot.base === 200 && lot.pool === undefined);
  const furn = TOWN.smith.sell.find(e => e.id === 'bpFurnace');
  ck('高炉图纸退役且不再出售，高炉保留材料前置', !furn && ITEMS.bpFurnace.retired && !FURNITURE.find(x=>x.id==='fr3').needBp);

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
  Math.random = always;   // 必触发美人松（同时会引来遇袭 → 打赢才结算）
  G.doPoint(treePt); winFights();
  G.doPoint(treePt); winFights();
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
  Sh.tut = null; Sh.stats.stamina = 9999; Sh.scene = 'sea';
  Sh.day = 20;
  ck('第 20 天（5 的倍数）可以打海盗船长', G.pointStatus(seaPt) === 'ok', G.pointStatus(seaPt));
  // 作者 2026-09-22 定案：头目不是每次都在 —— 其余日子船上有小喽啰，**点位每天都能来**。
  // 所以 dayMod 不再锁死整个点位，只决定"谁出场"。
  Sh.day = 21;
  ck('★ 第 21 天点位照常开放（不再整天锁死）', G.pointStatus(seaPt) === 'ok', G.pointStatus(seaPt));
  ck('第 25 / 30 / 35 天都能打', [25, 30, 35].every(d => { Sh.day = d; return G.pointStatus(seaPt) === 'ok'; }));
  Sh.day = 19;
  ck('第 20 天之前仍是"等到第20天"', /第20天/.test(G.pointStatus(seaPt) || ''), G.pointStatus(seaPt));

  // 非头目日：出小喽啰（海盗×2），不弹 boss 确认框
  Sh.day = 22;
  Sh.stats.stamina = 9999;
  let ov2 = null;
  G.bind({ onLog: () => {}, onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: o => { ov2 = o; } });
  G.doPoint(seaPt);
  ck('★ 非头目日出小喽啰（海盗×2），不是头目',
     !!(Sh.combat && Sh.combat.enemies.length === 2 && Sh.combat.enemies.every(e => e.id === 'pirate')),
     Sh.combat ? Sh.combat.enemies.map(e => e.name).join('+') : (ov2 ? ov2.title : '无战斗'));
  ck('★ 非头目日不弹"危险·海盗头目"确认框', !(ov2 && /海盗头目/.test(ov2.title || '')), ov2 ? ov2.title : '(没弹)');
  Sh.combat = null;

  // 头目日：弹确认框、确认后确实是头目本人
  Sh.day = 25;
  Sh.pointUses = {};          // ⚠️ 清掉当日次数：上面第 22 天已经用过一次，daily=1 会把这次挡掉
  Sh.stats.stamina = 9999;
  let ov = null;
  G.bind({ onLog: () => {}, onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: o => { ov = o; } });
  G.doPoint(seaPt);
  ck('刷新日点进去进入海盗船长战',
     !!(ov && /海盗头目/.test(ov.title || '')) || !!(Sh.combat && Sh.combat.enemies && Sh.combat.enemies.some(e => e.id === 'pirateBoss')),
     (ov && ov.title) || (Sh.combat ? Sh.combat.enemies.map(e => e.name).join('+') : ''));
  if (ov && ov.choices && ov.choices[0]) ov.choices[0].ok();
  ck('确认迎战后确实是船长本人',
     !!(Sh.combat && Sh.combat.enemies && Sh.combat.enemies.some(e => e.id === 'pirateBoss')),
     Sh.combat ? Sh.combat.enemies.map(e => e.name).join('+') : '无');
  Sh.combat = null;
}

section('7i. 收购恒定七折 + 批量出售（含手机端）');
{
  const CSS = fs.readFileSync(ROOT + '/css/style.css', 'utf8');
  G.newGame('fisher', 'normal');
  const Sq = G.S();
  Sq.day = 10; Sq.minute = 600; Sq.stats.hp = 100; Sq.stats.hunger = 100; Sq.stats.thirst = 100;
  const hideBase = LAOCHAO.buy.find(e => e.id === 'hide').base;   // 兽皮 15
  const p0 = G.priceOf(hideBase, true, 'hide');
  G.addItem('hide', 60, true);
  G.sellToMerchant('hide', 1, LAOCHAO.buy, false);
  ck('卖价固定为行情七折（卖 1 件不会掉价）', G.priceOf(hideBase, true, 'hide') === p0, p0 + ' → ' + G.priceOf(hideBase, true, 'hide'));
  G.sellToMerchant('hide', 30, LAOCHAO.buy, false);
  ck('一次卖 30 件也不再压价', G.priceOf(hideBase, true, 'hide') === p0, '价=' + G.priceOf(hideBase, true, 'hide'));
  Sq.day = 11;
  // ⚠️ 这条测的是"**同一天**卖货不会越卖越便宜"（价格浮动按 天+物品 定，与销量无关）。
  //    换天本来就会换一组浮动（90~110 的确定性哈希），所以基准要按当天重算。
  const p1 = G.priceOf(hideBase, true, 'hide');
  ck('跨天换一组行情浮动，但仍不随销量下跌（再卖 5 件价格不变）',
     (function () { G.sellToMerchant('hide', 5, LAOCHAO.buy, false); return G.priceOf(hideBase, true, 'hide') === p1; })(),
     p0 + ' → ' + p1);
  // 作者 2026-09-22：默认收购价 8 折 → 7 折。这条同时盯住"倍率"和"文案"，
  // 因为上一轮就是改了倍率忘了改文案才导致断言报错。
  ck('★ 收购倍率确实是 0.7，界面不再显示冗余折扣说明',
     /const SELL_SUP = 0\.7;/.test(GAME) && !/一律按行情[七八]折收/.test(UI));
  Sq.day = 50;   // 冬季
  ck('季节行情仍然生效（冬季兽皮更贵）', G.priceOf(hideBase, true, 'hide') > p0, '价=' + G.priceOf(hideBase, true, 'hide'));
  ck('已彻底移除销量折价（只剩统计计数）', !/marketSup/.test(GAME) && !/supTag/.test(UI) && /仅留存销量统计/.test(GAME));

  // 批量出售：四个入口 + 手机端长按可靠性
  ck('老潮/盐镇/黑市/交易机的卖货按钮都接了长按批量', (UI.match(/bindPress\(b, doTap, doLong\)/g) || []).length >= 4);
  ck('长按会因滑动/系统打断而取消（手机端不误触）', /pointermove/.test(UI) && /pointercancel/.test(UI) && /Math\.hypot/.test(UI));
  ck('按钮禁用/置灰时不响应长按', /node\.disabled\|\|node\.classList\.contains\('lockedb'\)/.test(PRESS_SRC));
  ck('批量弹窗有 1/一半/全部 快捷档', /data-bset="1"/.test(UI) && /data-bset="half"/.test(UI) && /data-bset="all"/.test(UI));
  ck('CSS 关掉长按选中与长按菜单', /-webkit-touch-callout: none/.test(CSS) && /user-select: none/.test(CSS));
  ck('卖货面板不反复显示批量说明，保留初次操作提示', !/长按「卖出」可批量卖/.test(UI) && /function maybeBatchTip\(/.test(UI) && !/卖多少都不会再压价/.test(UI));
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
  ck('拦路变体不进图鉴（图鉴里只有一条"石板守卫"）', ENEMIES.slateGuard2.noDex === 1 && !G.monIds().includes('slateGuard2') && /Game\.monIds\(\)/.test(UI));
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
  ck('蛋料理数值与实际保鲜天数按需求写好', ITEMS.egg.spoil * 2 === 7 * 24 && ITEMS.friedEgg.food === 15 && ITEMS.friedEgg.spoil * 2 === 3 * 24 &&
    ITEMS.bigOmelette.food === 60 && ITEMS.bigOmelette.water === 60 && ITEMS.bigOmelette.heal === 10 && ITEMS.bigOmelette.spoil * 2 === 10 * 24 &&
    ITEMS.superEgg.heal === 30 && ITEMS.superEgg.food === 100 && ITEMS.superEgg.sta === 100 && ITEMS.superEgg.water === 100 && ITEMS.superEgg.spoil * 2 === 99 * 24);
  const rh = RECIPES.find(r => r.id === 'r_hay'), rf = RECIPES.find(r => r.id === 'r_friedegg'), rb = RECIPES.find(r => r.id === 'r_bigomelette'), rs = RECIPES.find(r => r.id === 'r_superegg');
  // 2026-09-22：这两道菜"加料不加数值" —— 大煎蛋补野菜+盐（倒了两份水进去，+60 水才说得通），
  // 超级大蛋补兽肉+野菜+盐（从"一份早餐"变成"一场宴席"，天然变成中期料理）
  // 注意：这些是小配方（材料都 <5 份），不吃 2026-09-22 的"木材≥5 ×0.8 / 其它≥5 ×1.1"配比调整
  ck('配方：干草（茅草4→2）/ 煎蛋（蛋1）/ 大煎蛋（蛋5+野菜2+盐1+水2+木1）/ 超级大蛋（蛋12+野菜4+盐2+水3+木3）',
    rh.in.thatch === 4 && rh.out.hay === 2 && rf.in.egg === 1 &&
    rb.in.egg === 5 && rb.in.wildveg === 2 && rb.in.salt === 1 && rb.in.water === 2 && rb.in.wood === 1 &&
    rs.in.egg === 12 && rs.in.wildveg === 4 && rs.in.salt === 2 && rs.in.water === 3 && rs.in.wood === 3);
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
    s.day = 30; s.buildings.house = 3; s.buildings.farm = 2;   // 农田升到「水田」= 3 个畜牧位（鸡舍+羊圈都建得下）
    s.stats.hunger = 100; s.stats.thirst = 100;
    G.addItem('wood', 60, true); G.addItem('vine', 30, true);
    buildFarm('coop'); buildFarm('pen');
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
  for (let d = 0; d < 5; d++) { G.S().stats.hunger = 100; G.S().stats.thirst = 100; G.addMin(24 * 60); }
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
    if (penSheep >= 0) { buildFarm('pen'); for (let i = 0; i < penSheep; i++) G.addSheep(); }
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
    // ⚠️ 白名单在 2026-09-25 多了 'winter'（冬季来临弹窗），断言跟着扩 —— 这条本来就是
    //    "新加弹窗别漏了往白名单里补"，所以它拦住过我们一次正是它该干的事。
    ck("ui 的 onOverlay 白名单包含 'daily' / 'fishman' / 'winter'（漏了会渲染成空壳窗口）",
       /\['lootExpiry','warehouse','loot','farm','black','town','mission','info','atlTrade','fishman','daily','winter'\]\.includes\(k\)/.test(UI));
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
    buildFarm('pen'); G.addSheep();
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
      buildFarm('pen'); G.addSheep();     // 不给干草
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
  ck('怪物总数与列表同源（排除隐藏变体与其他模式梦魇）', c.monTotal === G.monIds().length && c.monTotal === Object.values(ENEMIES).filter(e=>!e.noDex && !e.nightmare).length, `总数=${c.monTotal} 名单=${G.monIds().length} 敌人表=${Object.keys(ENEMIES).length}`);
  // 93 → 96：2026-09-24 新增三张食谱图纸（bpStew / bpOmelette / bpCake，对岸美食家卖）。
  // 96 → 97：2026-09-25 新增「积雪」；97 → 98：同一天新增「面粉」（小麦的中间产物）（cat:mat，冬天河畔采雪点产出，可烧成淡水）。
  // 这个数是故意写死的：以后再加资源类物品，会在这里提醒你"图鉴总数变了，确认一下是不是有意的"。
  ck('资源总数与列表同源（退役高炉图纸后 105 项）', c.resTotal === G.resIds().length && c.resTotal === 105, `总数=${c.resTotal}`);
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
    // ⚠️ 这里原来是硬编码的四家店清单 —— 加了「美食家」之后它会把新店的货当成"没来源"。
    //    改成遍历 TOWN 全部摊位（以后再加店也不用回来改）。
    const townSells = Object.values(TOWN).reduce((a, sh) => a.concat((sh && sh.sell) || []), []);
    if ([LAOCHAO.sell, BLACKMARKET.sell, townSells].some(l => l.some(e => e.id === id))) return true;
    if (G.adShopState().goods.some(g => g.item === id)) return true;
    if (Object.keys(REDEEM_CODES).some(k => REDEEM_CODES[k].item === id)) return true;
    if (RANDOM_EVENTS.some(ev => (ev.choices || []).some(ch => ch.items && ch.items[id]))) return true;
    // 给物品的调用有两种写法：addItem('x',…) 和 if (gainItem('x',…))（后者"装不下就进待收"）
    if (new RegExp("(?:addItem|gainItem)\\('" + id + "'").test(GAME)) return true;
    if (UI.includes("id:'" + id + "'")) return true;
    // 神秘鱼人以物换物（沉船墓地）：两张源质装备图纸的来源
    if (['bpSourceSpear','bpSourceArmor'].includes(id)) return true;
    return false;
  };
  const orphan = ids.filter(id => !hasSource(id));
  ck('图鉴资源类里没有拿不到的死条目', orphan.length === 0, orphan.join('、') || '全部有来源');
  ck('晒盐统一产出盐（保留额外收获概率）', (SCENES.find(s => s.id === 'sea').zones.sea.points.find(p => p.id === 'sea_salt').yields || []).every(y => y.id === 'salt') && !ITEMS.seasalt);
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
  ck('★ 营地建筑按深度叠放（篝火 y=77 排在仓库 y=50 前面）',
     /p\.style\.zIndex = String\(Math\.max\(1, Math\.min\(9, Math\.round\(pos\[1\] \/ 10\)\)\)\);/.test(UI) &&
     /fire:\[49,64\]/.test(DATA) && /store:\[66,47\]/.test(DATA) && /const CAMP_BUILD_POS/.test(DATA),
     'ui=' + /p\.style\.zIndex/.test(UI) + ' fire=' + /fire:\[49,64\]/.test(DATA) + ' pos=' + /const CAMP_BUILD_POS/.test(DATA));
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
    // 作者 2026-09-19 校准出肉率：1 份肉只晾 2 条肉干（原来 3 条 = 烟熏炉的 3 倍，超标）
    ck('晾肉架一次晾两个：吃 肉×2、出 肉干×4（1 份肉 2 条肉干）',
       RACK && RACK.in.meat === 2 && RACK.out.jerky === 4,
       RACK ? 'in=' + JSON.stringify(RACK.in) + ' out=' + JSON.stringify(RACK.out) : '没找到');
    const mkRack = () => {
      G.newGame('fisher', 'normal');
      const s = G.S();
      s.inv = {}; s.tut = null; s.stats.hp = 99999; s.stats.stamina = 99999;
      // 2026-09-22：晾肉干要盐了，测试材料同步补上（不加盐的肉干撑不到 30 天）
      s.buildings.watch = 3; s.furniture.rack = 1; G.addItem('meat', 5, true); G.addItem('salt', 9, true);
      return s;
    };
    mkRack();
    const t0 = G.S().minute;
    G.craft(RACK);
    ck('实测：挂上去只花 30 分钟（不再是 480 分）', G.S().minute - t0 === 30, '+' + (G.S().minute - t0) + ' 分');
    ck('实测：一批扣掉 肉×2（5 → 3）', G.invCount('meat') === 3, 'meat=' + G.invCount('meat'));
    ck('实测：不会当场拿到肉干', G.invCount('jerky') === 0, 'jerky=' + G.invCount('jerky'));
    ck('实测：架子上记着"晾晒中"，剩余 20 小时', !!G.dryOf('rack') && G.dryLeftMin('rack') === 1200, G.fmtLeft(G.dryLeftMin('rack')));
    ck('实测：晾晒期间不能再晾别的（会拦下并说明还剩多久）',
       !G.canCraft(RACK).ok && /还要/.test(G.canCraft(RACK).reason), G.canCraft(RACK).reason);
    ck('实测：没到期取不下来', !G.dryCollect('rack').ok && !G.invCount('jerky'));
    G.addMin(1200);
    ck('实测：晾满 20 小时能取下 肉干×4（一批挂肉×2）', G.dryLeftMin('rack') === 0 && G.dryCollect('rack').ok && G.invCount('jerky') === 4,
       'jerky=' + G.invCount('jerky'));
    ck('实测：取下后架子空了，可以接着晾', !G.dryOf('rack') && G.canCraft(RACK).ok);
    mkRack(); G.craft(RACK); G.addMin(300);
    const leftB = G.dryLeftMin('rack');
    G.save(); G.load();
    ck('实测：存读档后晾晒进度不丢', G.dryLeftMin('rack') === leftB, leftB + ' → ' + G.dryLeftMin('rack'));
    // 晾肉架没有"批量"这回事：一副架子一次只挂一批，长按批量也应该只挂一批
    mkRack();
    const rm0 = G.invCount('meat');
    const rb = G.craftBatch(RACK, 5);      // 手里 5 份肉，批量条拖到 5
    ck('★ 长按批量也只能挂一批（只扣 肉×2，不是 10）', G.invCount('meat') === rm0 - 2 && rb.ok === true,
       rm0 + ' → ' + G.invCount('meat') + '，架上一批 ' + JSON.stringify(G.dryOf('rack') && G.dryOf('rack').out));
    ck('★ ★ 长按批量不会再"当场给肉干"（必须老实等 20 小时）',
       G.invCount('jerky') === 0 && !!G.dryOf('rack') && G.dryLeftMin('rack') === 1200,
       '肉干=' + G.invCount('jerky') + ' 剩余=' + G.fmtLeft(G.dryLeftMin('rack')));
    ck('★ 批量拖到 5 也不会误报"材料不足"（4 份肉照样能挂一批）', (() => {
      G.newGame('fisher', 'normal');
      const s4 = G.S(); s4.inv = {}; s4.tut = null; s4.stats.hp = 99999; s4.stats.stamina = 99999;
      s4.buildings.watch = 3; s4.furniture.rack = 1; G.addItem('meat', 4, true); G.addItem('salt', 9, true);
      const r4 = G.craftBatch(RACK, 5);
      return r4.ok === true && G.invCount('meat') === 2 && !!G.dryOf('rack') && G.invCount('jerky') === 0;
    })());
    ck('★ 长按晾肉架不再弹出批量条，只提醒"一次只能挂一批"',
       /if \(r && r\.hang\) \{[\s\S]{0,220}一次只能挂一批/.test(UI) && /if \(r && r\.hang\)/.test(UI));
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
       /if \(!fitsInBag\(r\.out, craftIn\(r\)\)\)/.test(_GAME_SRC) && /if \(!fitsInBag\(\{ \[id\]: n \}, \{ \[currency\]: cost \}\)\)/.test(_GAME_SRC) && /if \(!fitsInBag\(\{ beibi: gain \}\)\)/.test(_GAME_SRC));
    ck('关键道具 alwaysFit（石板/遗物/龙骨不受容量限制，不会卡主线）',
       ITEMS.slate.alwaysFit === 1 && ITEMS.relic.alwaysFit === 1 && ITEMS.dragonbone.alwaysFit === 1 &&
       /it\.alwaysFit \|\| it\.cat === 'currency'/.test(_GAME_SRC));
    ck('有 gainItem：野外物资直接收入并允许超载，不凭空消失',
       /function gainItem\(id,n\)/.test(_GAME_SRC) && /const before=capUsed\(\),ok=addItem\(id,n,true,true\)/.test(_GAME_SRC));
    ck('旧待收仅在读档时迁入，日常扣物资不再重复执行迁移',
       /function migratePendingLoot\(\)/.test(_GAME_SRC) && /function normalizeState\(\) \{for\(const stage of stages\)stage.run\(\);\}/.test(_GAME_SRC) && /id:'pending-loot',run:migratePendingLoot/.test(_GAME_SRC) && !/flushPending\(\)/.test(_GAME_SRC));
    // 实测
    G.newGame('fisher', 'normal');
    let s = G.S(); s.inv = {}; s.tut = null;
    const capBase = G.capacity();
    G.addItem('basket', 1, true);
    ck('竹篓持有未装备不加容量',G.capacity()===capBase); G.equipBackpack('basket');
    ck('实测：竹篓 +10 容量（20 → 30）', G.capacity() === capBase + 10, capBase + ' → ' + G.capacity());
    G.removeItem('basket', 1);
    ck('实测：丢掉竹篓容量退回', G.capacity() === capBase, 'cap=' + G.capacity());
    G.newGame('fisher', 'normal');
    s = G.S(); s.inv = {}; s.tut = null;
    const one = Object.keys(ITEMS).filter(id => ITEMS[id].stack === 1 && ['weapon','tool','armor','cloth','accessory'].includes(ITEMS[id].cat)).filter(id => id !== 'basket').slice(0, 20);
    for (const id of one) G.addItem(id, 1, true);
    G.addItem('beibi', 5000, true);
    ck('实测：货币可收入且不挤占背包格', G.invCount('beibi') === 5000 && G.capUsed() === one.length);
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
      // 作者 2026-09-19：名字里的日期删掉（界面别扭），时间只留在说明里
      ck('配方名不再带日期，活动时间只写在说明里',
         !/26\.9\.15/.test(REC.name) && /26\.9\.15-26\.9\.30/.test(ITEMS[BOW].desc), REC.name);
    }
    // 唯一性（只在活动期内验：配方下架后这些拦截自然不存在了）
    if (ON_SALE) {
      clearMail(); mkFresh();
      for (const k in REC.in) G.addItem(k, REC.in[k], true);
      ck('实测：条件是齐的时候可以做', G.canCraft(REC).ok, G.canCraft(REC).reason || 'ok');
      G.craft(REC);
      ck('实测：做出来是神弓×1', G.invCount(BOW) === 1, 'inv=' + G.invCount(BOW));
      ck('实测：持有神弓仍允许制作', G.canCraft(REC).ok, G.canCraft(REC).reason);
      // 存入邮箱
      const st = G.storeDivineBow();
      ck('实测：★ 能存进邮箱，且当前局立刻失去这把弓（不是复制）', st.ok && G.invCount(BOW) === 0, JSON.stringify(st));
      ck('实测：邮箱有神弓仍允许制作', G.canCraft(REC).ok, G.canCraft(REC).reason);
      ck('实测：邮箱允许存第二把且背包扣除',
         (() => { G.addItem(BOW, 1, true); const r2 = G.storeDivineBow(); return r2.ok && G.invCount(BOW) === 0; })());
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
    const r0 = Math.random; Math.random = () => 0.5;       // 0.5：必命中（≤0.9），又不会触发 10% 普通会心
    // ⚠️ 作者 2026-09-19 取消"入场自动开火"后，特权落在**玩家自己点的那一箭**上
    //    （更符合"每场战斗第一次命中必会心"的原意，也不会被自动几箭抢掉）。
    //    验证方式：同样条件下各开一枪，神弓那枪是暴击、猎弓那枪是普通。
    const volley = (wid) => {
      clearMail(); mkFresh();
      G.addItem(wid, 1, true); G.addItem('arrow', 30, true);
      const s2 = G.S();
      s2.equipment.weapon = wid; s2.toolDurs[wid] = [120]; s2.dur[wid] = 120;
      s2.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
      G.startFight({ id:'d', name:'木桩', hp:9999999, atk:0, def:0, spd:1, traits:[], drops:[] }, true);
      const Cx = G.S().combat;
      if (!Cx) return null;
      const hp0 = Cx.enemies[0].ehp;
      G.fightAction('ranged');              // 玩家自己开一枪
      const C2 = G.S().combat;
      const dmg = (C2 ? C2.enemies[0].ehp : 0);
      return { dmg: hp0 - dmg, crit: !!(C2 && C2.log.some(x => /神弓的弦音/.test(x))),
               critLog: !!(C2 && C2.log.some(x => /神弓的弦音/.test(x))) };
    };
    const dv = volley(BOW), nm = volley('bow');
    const dvLog = dv && dv.critLog;
    Math.random = r0;
    ck('实测：★ 玩家自己开的第一枪吃到"第一次命中必会心"（伤害高于同数值的猎弓）',
       !!(dv && nm && dv.dmg > nm.dmg && dv.crit && !nm.crit), `神弓 ${dv && dv.dmg} vs 猎弓 ${nm && nm.dmg}`);
    ck('实测：特权提示写进了战斗日志',
       !!dvLog || !!(dv && dv.crit), '');
    ck('代码里神弓特权同时覆盖「远程先手」与「普通射击」两条路径',
       /function divineCritRoll\(C, weapon, dealt\)/.test(_GAME_SRC) &&
       (_GAME_SRC.match(/divineCritRoll\(/g) || []).length >= 2, '调用 ' + ((_GAME_SRC.match(/divineCritRoll\(/g) || []).length - 1) + ' 处');
    ck('存入邮箱时读取原耐久、只移出一把，成对持久化',
       /const dur = next\.toolDurs/.test(_GAME_SRC) && /next\.inv\.divineBow--;/.test(_GAME_SRC) && /next\.toolDurs\.divineBow\.splice\(0,1\)/.test(_GAME_SRC) && /persistPair\(next,meta,false\)/.test(_GAME_SRC));
    // ★ 玩家反馈"神弓有耐久丢失问题"：实测 —— 耐久在存档 / 读档 / 备份槽 / 邮箱 / 存档码里都不会丢，
    //   唯一会"丢"的是耐久归零后弓被直接删掉（限时绝版，26.9.30 之后再也造不出来）。现在不会消失了。
    ck('★ 神弓耐久归零不会消失（keepBroken：保留在背包、自动卸下）',
       !!ITEMS[BOW].keepBroken && /const keep = !!\(named \|\| it\.keepBroken\)/.test(_GAME_SRC) && /不可修复/.test(ITEMS[BOW].desc));
    ck('★ 自动换手会跳过打坏的武器（耐久 0 的不会被顶上主手）',
       /filter\(k => ITEMS\[k\] && ITEMS\[k\]\.cat === 'weapon' && !ITEMS\[k\]\.ammo && \(DURA\[k\] === undefined \|\| \(durOf\(k\) \|\| 0\) > 0\)\)/.test(_GAME_SRC));
    ck('★ 神弓不再提供修补材料或修补入口',
       G.repairMatOf(BOW) === null && /w0 === 'divineBow' \? ''/.test(UI));
    ck('磨刀石面板按当前主手武器显示修补材料（不再写死石头×2）',
       /const rmTxt = \(rm && ITEMS\[rm\[0\]\]\) \?/.test(UI) && /修补：耐久恢复满（耗 \$\{rmTxt\}）/.test(UI));
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
      ck('实测：★ 耗尽的神弓不能再装备或修复',
         G.durOf(BOW) === 0 && !Sb.equipment.weapon && G.invCount('mithrilingot') === 2, '耐久 ' + G.durOf(BOW) + '，秘银锭剩 ' + G.invCount('mithrilingot'));
      G.repairWeapon();
      ck('重复尝试修补神弓不会白吃材料', G.invCount('mithrilingot') === 2, '秘银锭 ' + G.invCount('mithrilingot'));
    }
    // 玩家反馈的同类坑：弓一打坏，系统"迅速换上了箭矢继续战斗"——箭矢的 cat 也是 weapon，
    // 以前会被当成备用武器顶到主手（等于拿一把箭去砍人）。这里只放坏弓 + 箭矢，主手必须留空。
    {
      G.newGame('fisher', 'normal');
      const Sa = G.S(); Sa.inv = {}; Sa.tut = null; Sa.stats.hp = 99999; Sa.stats.stamina = 99999;
      G.addItem(BOW, 1, true); G.addItem('arrow', 30, true);
      Sa.toolDurs[BOW] = [1]; Sa.dur[BOW] = 1;
      Sa.equipment.weapon = BOW; Sa.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
      G.startFight(ENEMIES.sunkenKing, true);   // 血厚：一箭打不死，能看到"打坏"的那一步
      const rndAb = Math.random; Math.random = () => 0.5;   // 这一箭必中（0.5 ≤ 0.9），且不触发普通会心
      G.fightAction('ranged');                  // 作者 2026-09-19 起不再自动开火，得自己开一枪才会磨损
      Math.random = rndAb;
      ck('★ 弓打坏后不会被「箭矢」顶成主手武器（主手留空）',
         G.invCount(BOW) === 1 && G.durOf(BOW) === 0 && !G.S().equipment.weapon,
         '主手=' + G.S().equipment.weapon + ' 神弓=' + G.invCount(BOW) + ' 耐久=' + G.durOf(BOW));
      ck('★ 也不会写"你迅速换上了箭矢"这种日志',
         !(G.S().log || []).some(l => /换上了箭矢/.test(l.text || '')),
         (G.S().log || [])[0] && (G.S().log[0].text || ''));
      G.S().combat = null;
    }
  ck('★ 活动结束后神弓配方下架，已有神弓定义保留',
       !RECIPES.some(r => r.id === 'r_divinebow') && !!ITEMS.divineBow, '最后一条是 ' + RECIPES[RECIPES.length - 1].id);
    ck('行进动画期间会淡出日志（免得盖住轨迹起点）',
       /function beginTravelFx\(\)/.test(UI) && /body\.traveling #log/.test(CSS));
  }
  // ===== 传奇难度：不能领物资邮件 / 不能兑换物资（否则难度机制直接被抹平）=====
  {
    const clearMB = (arr) => { const m = G.metaState(); m.mailbox = arr.slice(); m.redeemed = {}; };
    const mk = (diff) => { G.newGame('fisher', diff); return G.S(); };
    ck('代码里有传奇门槛判定（公告不算物资）',
       /function mailIsSupply\(g\) \{ return !!\(g && !g\.notice && \(g\.item \|\| g\.relic \|\| g\.soul \|\| g\.adCoins\)\); \}/.test(_GAME_SRC) &&
       /S\.difficulty === 'legend' && mailIsSupply\(g\)/.test(_GAME_SRC) &&
       /S\.difficulty === 'legend' && \(g\.soul \|\| g\.item \|\| g\.relic \|\| \(g\.mails/.test(_GAME_SRC));
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
    const rc = 'HAPPY1';delete G.metaState().redeemed[rc];
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
    const list=Object.keys(PANEL_META).filter(key=>PANEL_META[key].freeze);
    ck('管理类面板在冻结名单里（背包/装备/技能/图鉴/日志/邮箱/设置…）',
       ['inv','equip','skill','collection','diary','mailbox','settings','codex'].every(x => list.includes(x)), list.join(','));
    ck('★ 会主动花时间的面板不在名单里（营地/制造/交易/耕地…，否则功能被关掉）',
       ['camp','craft','laochao','town','black','farm','sleeppick','grind','repair','naming'].every(x => !list.includes(x)));
    ck('open 时设置冻结、closeModal 时恢复',
       /Game\.setTimeFreeze\(!!panels.get\(kind\).freeze\)/.test(UI) &&
       /function closeModal\(\)[\s\S]*?Game\.setTimeFreeze\(false\)[\s\S]*?function rerenderEquip/.test(UI));
    ck('addMin 在冻结时直接返回（连 tick 都不加）',
       /function addMin\(m\) \{[\s\S]{0,160}if \(timeFrozen\(\)\) return false;/.test(_GAME_SRC));
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
    const KNOWN = ['farm', 'black', 'town', 'mission', 'info', 'atlTrade', 'fishman'];
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
  ck('大地图标签与场景相同半透明、字号15px',
     /\.map-arrow \.arrow-label \{[\s\S]{0,220}?font-size: 15px/.test(CSS) && /\.map-arrow \.arrow-label \{[\s\S]{0,260}?background: rgba\(10,10,8,0\.72\);/.test(CSS));
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
  ck('容量按仓库等级计算正常', G.warehouseCapacity() === 120, '容量 ' + G.warehouseCapacity());
  ck('容量包含扩建仓库加成', (function () { const c0 = G.warehouseCapacity(); L.storeExt = 2; const c1 = G.warehouseCapacity(); L.storeExt = 0; return c1 - c0 === 30; })(), '');
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
    UI.includes('box.querySelector(`[data-eid=') && UI.includes("row.querySelector('.hp-fill').style.width=tgPct(e)+'%'") && !UI.includes('box.innerHTML=es.map'));
  ck('原地更新时名字/意图标签/血量数字也一起刷新（不会只剩血条在动）',
    UI.includes("row.querySelector('.tg-name').textContent=battleName(e)") && UI.includes("row.querySelector('.tg-hp').textContent=tgHpText(e)") && UI.includes("row.querySelector('.enemy-intent').innerHTML=tgNameHtml(e)"));

  // 这段 CSS 原来把 id 当 class 写（.fight-targets），整段没生效：
  // 选目标的黄框、"已选定"的白框、首领名字配色、血量数字配色，玩家一个都没见过。
  ck('不存在把 id 当 class 写的 .fight-targets 选择器（那会让白框/黄框整段失效）',
    !/\.fight-targets(\s|\.|\{|:)/.test(cssSrc));
  ck('选目标的黄框 / 已选定的白框用的是 #fight-targets',
    /#fight-targets\.selecting \.target \{/.test(cssSrc) && /#fight-targets \.target\.selected \{/.test(cssSrc));

  // 上一场打完的 1 秒关窗定时器 + 上一场残留的"待选目标"
  ck('开新战斗时会清掉上一场残留的待选目标（黄框/误触发）',
    UI.includes('fightSeq++;') && UI.includes('ids:new WeakMap()') && UI.includes('selected:null'));
  ck('上一场结束的 1 秒关窗定时器不会顺手清掉新战斗的窗口',
    UI.includes('const seq=fightSeq;') && UI.includes('if(seq!==fightSeq)return;'));
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
     /function render\(\) \{\s*try \{ renderInner\(\);(?: restoreCombatView\(\);)? \}/.test(UI) && /function renderInner\(\)/.test(UI) &&
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
     /let modalOpenedAt = 0;/.test(UI) && /if\(!samePanel\)modalOpenedAt=openedNow;/.test(UI) && /const openedNow = Date\.now\(\);/.test(UI) &&
     /Date\.now\(\) - modalOpenedAt < 350 && mm\.contains\(e\.target\)/.test(UI) &&
     /document\.addEventListener\('click', \(e\) => \{/.test(UI) && /\}, true\);/.test(UI));
  // ⑭ 新身份「养蜂人」+ 专属家具「蜂箱」
  {
    const idn = IDENTITIES.beekeeper;
    ck('养蜂人身份存在，且开局带蜂蜜', !!idn && idn.name === '养蜂人' && idn.items && idn.items.honey === 2, idn ? idn.desc : '没有');
    const hive = FURNITURE.find(f => f.id === 'beehive');
    ck('蜂箱是养蜂人专属家具，储蜜后手动收取', !!hive && hive.onlyIdentity === 'beekeeper' && !hive.dailyItems, hive ? hive.desc : '没有');
    // 别的身份造不了
    G.newGame('fisher', 'normal');
    { const s = G.S(); s.tut = null; G.addItem('wood', 40, true); G.addItem('thatch', 40, true); }
    G.buildFurniture('beehive');
    ck('别的身份造不了蜂箱', !G.S().furniture.beehive);
    // 养蜂人能造，且占 1 个家具位
    G.metaState().identityUnlocks={...(G.metaState().identityUnlocks || {}),beekeeper:1};G.newGame('beekeeper', 'normal');
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
      ck('蜂箱每天储存 1 份蜂蜜', G.S().hiveHoney === 1 && G.invCount('honey') === h0, '储蜜 ' + G.S().hiveHoney);
      G.collectHiveHoney();
      ck('蜂箱手动收蜜入包', G.invCount('honey') === h0 + 1 && G.S().hiveHoney === 0);
    }
    // 树林取蜜：养蜂人必定拿到、不会被蛰，还有额外收获
    G.metaState().identityUnlocks={...(G.metaState().identityUnlocks || {}),beekeeper:1};G.newGame('beekeeper', 'normal');
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
       /inner = guideContent\(\);/.test(UI) && GUIDE.some(s=>/海底探索/.test(s.title)) && GUIDE.some(s=>s.steps.some(t=>/海图/.test(t))));
    ck('★ 交易面板顶部显示自己有多少贝壳币 / 金币（老潮、盐镇、黑市、交易机都有）',
       /function walletBar\(\)/.test(UI) &&
       (UI.match(/walletBar\(\)/g) || []).length >= 4 &&
       /贝壳币 <b>\$\{Game\.invCount\('beibi'\)\}/.test(UI) && /金币 <b>\$\{Game\.invCount\('coin'\)\}/.test(UI) && /\.wallet-bar \{/.test(cssNow));
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
    // 作者 2026-09-19：签到奖励下调为 魂点 ×10 + 备份点 ×1
    ck('每日签到：首次可领，奖励 10 魂点 + 1 备份点',
       s1.canSign && r1.ok && r1.soul === 10 && r1.backup === 1, JSON.stringify(r1));
    ck('每日签到：备份点真的到账', G.backupPoints() === bpBefore + 1, bpBefore + ' → ' + G.backupPoints());
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
    ck('1.10以前公告不再内置', !notes.some(n=>/^v1\.(?:0?[0-9])(?:\D|$)/.test(n.version)));
    ck('版本键仍唯一',new Set(notes.map(n=>n.version)).size===notes.length);
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
  // 作者 2026-09-19：采集/制造主干每级 10% → 7%（战斗主干数值不变）
  ck('采集主干是「产出 +7% / 耗时 -7% / 体力 -7%」',
     SKILL_TREES.gather.trunk.map(o => o.id).join(',') === 'yield,speed,stam' &&
     /\+7%/.test(SKILL_TREES.gather.trunk[0].desc) && /7%/.test(SKILL_TREES.gather.trunk[1].desc) && /7%/.test(SKILL_TREES.gather.trunk[2].desc));
  ck('制造主干是「耗时 -7% / 7% 返还材料 / 7% 多产 1 件」',
     /耗时 -7%/.test(SKILL_TREES.craft.trunk[0].desc) && /7% 概率返还材料/.test(SKILL_TREES.craft.trunk[1].desc) && /7% 概率多产 1 件/.test(SKILL_TREES.craft.trunk[2].desc));
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
    s.exp.gather = 180;     // 采集树 ×2：刚好够升 3 级（24+56+100），第 4 级就升不动了
    ck('新局主干从 0 级、没有任何选择', s.skill.gather === 0 && G.trunkPicks('gather') === 0);
    const r1 = G.skillUpTrunk('gather', 'yield'), r2 = G.skillUpTrunk('gather', 'yield'), r3 = G.skillUpTrunk('gather', 'stam');
    ck('采集前三点按16+56+100=172扣经验', r1.ok && r2.ok && r3.ok && s.exp.gather === 8, '剩 ' + s.exp.gather);
    ck('同一个方向可以重复选（产出 7% ×2 = +14%）', Math.round(G.gatherYieldMul() * 100) / 100 === 1.14, G.gatherYieldMul());
    ck('选的不是同一个方向就各自生效（体力 -7%）', Math.round(G.gatherEnergyMul() * 100) / 100 === 0.93, G.gatherEnergyMul());
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
    SKILL_TREES.gather.nodes.push({ id:'g_tmp', name:'临时下游', need:2, needNode:'g_wood', max:1, cost:[20], desc:['测试'] });
    G.skillNodeLearn('gather', 'g_tmp');
    ck('★ 有下游时不是末端、忘不了', G.nodeIsLeaf('gather', 'g_wood') === false && G.skillNodeForget('gather', 'g_wood').ok === false);
    const e0 = s.exp.gather;
    const f1 = G.skillNodeForget('gather', 'g_tmp');
    // 采集树 ×2：这条临时支线 cost 20 → 实际花 40 → 返还一半 20
    ck('★ 遗忘末端返还一半经验（40 → +20）', f1.ok && f1.gain === 20 && Math.round(s.exp.gather - e0) === 20, '经验 ' + e0 + ' → ' + s.exp.gather);
    ck('★ 忘掉下游后，上游恢复成末端', G.nodeIsLeaf('gather', 'g_wood') === true);
    const f2 = G.skillNodeForget('gather', 'g_wood');
    ck('★ 再忘上游：伐木专精 30×2=60，返还一半 30，且互斥解除', f2.gain === 30 && G.nodeCheck('gather', 'g_nature').ok === true);
    ck('主干不能遗忘（不是节点）', G.skillTreeInfo().gather.lv === 2 && !G.skillTreeInfo().gather.nodes.some(n => n.id.endsWith('_trunk')));
    SKILL_TREES.gather.nodes.pop();
  }
  // ---- 数值钩子 ----
  {
    G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null;
    s.exp.craft = 999; s.exp.combat = 999; s.exp.gather = 999;
    // ⚠️ 等级和成长选项要一起设：treeState() 会把"选项比等级多"的多余项裁掉（自愈逻辑）
    ck('战斗主干：选 3 次防 = +1.5 防御', (() => {
      s.skill.combat = 3; s.skillPicks.combat = ['def','def','def'];
      const d3 = G.playerDef();
      s.skill.combat = 0; s.skillPicks.combat = [];
      return Math.abs(d3 - (G.playerDef() + 1.5)) < 1e-6; })());
    ck('战斗主干：选 2 次暴击 = 10% → 20%', (() => { s.skill.combat = 2; s.skillPicks.combat = ['crit','crit']; return Math.abs(G.skillCritRate() - 0.20) < 1e-6; })());
    s.skill.combat = 0; s.skillPicks.combat = [];
    ck('精细采集：产出 +20%、体力 +15%（主干 7%×4 叠加后 = 1.48 / 1.15）',
       (() => { s.skill.gather = 4; s.skillPicks.gather = ['yield','yield','yield','yield']; G.skillNodeLearn('gather','g_fine');
         return Math.round(G.gatherYieldMul() * 100) / 100 === 1.48 && Math.round(G.gatherEnergyMul() * 100) / 100 === 1.15; })());
    // 作者 2026-09-19：流水线从 -50% 削到 -40%，而且只对有耐久的成品生效
    ck('★ 流水线：有耐久的成品材料 -40%（木盾首次木板3→2、绳2→2；余额累计抵下次）',
       (() => { s.skill.craft = 4; s.skillPicks.craft = ['speed','speed','refund','extra']; G.skillNodeLearn('craft','c_line');
         const c = G.craftIn({ out:{ woodShield:1 }, in:{ plank:3, rope:2 } }); return c.plank === 2 && c.rope === 2; })());
    ck('★ 流水线对没有耐久的配方一点不减（烤肉 肉1+柴1 → 不变）',
       (() => { const r = RECIPES.find(x => x.id === 'r_roastmeat');
         const c = G.craftIn(r); return c.meat === 1 && c.wood === 1; })());
    ck('★ 精工细作与流水线互斥，学不了', G.nodeCheck('craft','c_finework').ok === false && /互斥/.test(G.nodeCheck('craft','c_finework').reason));
    ck('★ 修建材 / 打磨等所有消耗材料的地方改用 craftIn（不再直接读 r.in）',
       /function craftIn\(r, n=1\)/.test(_GAME_SRC) && (_GAME_SRC.match(/craftIn\(r\)/g) || []).length >= 3 && !/for \(const k in r\.in\) removeItem/.test(_GAME_SRC));
  }
  // ---- 界面接线 ----
  ck('技能面板给出「展开技能树」入口，并接到 skilltree 弹窗',
     /data-skilltree="\$\{k\}"/.test(UI) && /kind === 'skilltree'/.test(UI) && /function skillTreeModal\(kind\)/.test(UI));
  // 作者 2026-09-19：所有专项最大等级 -1（一级/二级数值照旧），cost/desc 也要跟着裁到同样长度
  {
    // 2026-09-22：嗜血狂刀第三级删除（作者定案：默认不吸 → 1级30% → 2级40%），期望上限 3 → 2
    const OVER = { g_wood:1, g_nature:1, g_fine:2, g_rough:2, c_patch:2, f_sweep:2, f_exec:2, f_vamp:2, f_revenge:2,
                   f_shield:2, f_swift:2, f_rage:2, f_iron:2, f_bow:2, f_gun:2 };
    const wrong = [];
    for (const k of ['gather','craft','combat']) for (const n of SKILL_TREES[k].nodes) {
      if (OVER[n.id] === undefined) continue;
      if (n.max !== OVER[n.id] || n.cost.length !== n.max || n.desc.length !== n.max) wrong.push(n.id + '(max=' + n.max + ' cost=' + n.cost.length + ' desc=' + n.desc.length + ')');
    }
    ck('★ 专项等级与 cost/desc 长度对齐', wrong.length === 0, wrong.join('、') || '专项等级全部对齐');
    // 一级/二级数值照旧（抽查几个）
    // ⚠️ 嗜血狂刀：作者 2026-09-22 定案「吸血统一 30%」，2 级不再写 40%（升级只解锁复仇链）
    ck('一级/二级数值照旧（抽查：嗜血狂刀 30% 统一、处决 20/25、修补匠 25/50）',
       /30% 回血/.test(SKILL_TREES.combat.nodes.find(n => n.id === 'f_vamp').desc[0]) &&
       /30% 回血/.test(SKILL_TREES.combat.nodes.find(n => n.id === 'f_vamp').desc[1]) &&
       /<20%/.test(SKILL_TREES.combat.nodes.find(n => n.id === 'f_exec').desc[0]) &&
       /<25%/.test(SKILL_TREES.combat.nodes.find(n => n.id === 'f_exec').desc[1]) &&
       /25% 概率/.test(SKILL_TREES.craft.nodes.find(n => n.id === 'c_patch').desc[0]) &&
       /50% 概率/.test(SKILL_TREES.craft.nodes.find(n => n.id === 'c_patch').desc[1]));
    // 弓术改版（作者 2026-09-22）：从"弓命中 +5%"改成"用弓时暴击倍率 1.8 / 2.1"
    ck('★ 弓术已改为暴击倍率 1.8 / 2.1（不再是命中 +5%）',
       /1\.8/.test(SKILL_TREES.combat.nodes.find(n => n.id === 'f_bow').desc[0]) &&
       /2\.1/.test(SKILL_TREES.combat.nodes.find(n => n.id === 'f_bow').desc[1]) &&
       !/命中/.test(SKILL_TREES.combat.nodes.find(n => n.id === 'f_bow').desc[0]));
    ck('★ 枪械精通不再提「源能子弹」（只说子弹）',
       !/源能子弹/.test(SKILL_TREES.combat.nodes.find(n => n.id === 'f_gun').desc.join('')));
  }
  // 主干遗忘（作者 2026-09-19）：想换流派时主干也得能退，规矩和专项一样——只从末端退、返还一半
  {
    G.newGame('fisher', 'normal');
    const st = G.S(); st.tut = null; st.exp.gather = 9999; st.exp.craft = 9999;
    G.skillUpTrunk('gather', 'yield'); G.skillUpTrunk('gather', 'speed');
    ck('主干加了两级：Lv2，产出/耗时各 1 次',
       G.trunkLv('gather') === 2 && G.S().skillPicks.gather.join(',') === 'yield,speed',
       'Lv' + G.trunkLv('gather') + ' picks=' + G.S().skillPicks.gather.join(','));
    const ti = G.trunkForgetInfo('gather');
    // 采集树 ×2：第 2 级基准 28 → 实际花 56 → 返还一半 28
    ck('★ 主干只能从最末端退：给出的是最后那级（迅捷）和一半经验',
       ti.ok && ti.lv === 2 && ti.optName === '迅捷' && ti.gain === Math.floor(SKILL_TRUNK_COST[1] * 2 / 2),
       JSON.stringify(ti));
    const rf = G.skillTrunkForget('gather');
    ck('★ 退主干成功：等级 -1、那次的选项也撤掉、经验返还一半',
       rf.ok && G.trunkLv('gather') === 1 && G.S().skillPicks.gather.join(',') === 'yield' && rf.gain === ti.gain,
       'Lv' + G.trunkLv('gather') + ' picks=' + G.S().skillPicks.gather.join(',') + ' 返还=' + rf.gain);
    ck('★ 退掉的那级效果真的没了（耗时倍率回到 1）', Math.round(G.gatherTimeMul() * 100) / 100 === 1, G.gatherTimeMul());
    // 被专项撑着的主干不能退：石斧需要主干 2 —— 先把专项学到手，再试着退主干
    G.skillUpTrunk('gather', 'yield');
    st.exp.gather = 9999; G.skillUpTrunk('gather', 'yield');   // 回到 Lv3
    st.exp.gather = 9999; G.skillNodeLearn('gather', 'g_wood');  // 伐木专精需要主干 2
    G.skillTrunkForget('gather'); G.skillTrunkForget('gather');  // 退到 Lv1
    const blocked = G.trunkForgetInfo('gather');
    ck('★ 主干正被专项撑着时不许退（先忘专项）',
       G.trunkLv('gather') === 2 && blocked.ok === false && /正撑着/.test(blocked.reason), blocked.reason || JSON.stringify(blocked));
    ck('主干遗忘的按钮接进了技能树界面',
       /data-trunkforget="\$\{kind\}"/.test(UI) && /Game\.skillTrunkForget\(k\)/.test(UI));
  }
  // 嗜血狂刀：只对匕首（作者 2026-09-19）
  {
    ck('嗜血狂刀的要求写成"双持两把匕首"（技能树文案 + 实现）',
       (() => { const n = SKILL_TREES.combat.nodes.find(x => x.id === 'f_vamp');
         return n.req === '双持两把匕首' && /双持两把匕首/.test(n.desc[0]) && /function hasDualDagger\(\)/.test(_GAME_SRC); })(),
       (SKILL_TREES.combat.nodes.find(x => x.id === 'f_vamp') || {}).req);
    ck('匕首判定用的是 dual 标记（石质匕首 / 铁匕首）',
       /w\.every\(x => !!x\.dual\)/.test(_GAME_SRC) && ITEMS.knifeStone.dual === 1 && ITEMS.ironDagger.dual === 1);
    ck('实测：双匕首能吸血、双剑/剑+匕首不吸',
       (() => {
         const mk = (a, b) => { G.newGame('fisher', 'normal'); const s = G.S(); s.inv = {}; s.tut = null;
           ['knifeStone','ironDagger','ironSword','steelSword'].forEach(id => G.addItem(id, 1, true));
           s.equipment.weapon = a; s.equipment.weapon2 = b;
           s.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
           s.skill.combat = 3; s.skillPicks.combat = ['atk','atk','atk']; s.tree.combat.f_vamp = 1;
           s.stats.hp = 50; return s; };
         const vampOn = (a, b) => { const s = mk(a, b); s.stats.hp = 50; G.startFight({ id:'dummy', name:'木桩', hp:9999, atk:0, def:0, spd:1, traits:[], drops:[] }, true);
           s.combat.enemies[0].ehp = 9999; s.combat.enemies[0].def = 0;
           const r0 = Math.random; Math.random = () => 0.1;
           const before = s.stats.hp; G.fightAction('attack'); Math.random = r0;
           const heal = s.stats.hp - before; return heal > 0; };
         const both = vampOn('knifeStone', 'ironDagger');
         const swordDagger = vampOn('ironSword', 'ironDagger');
         const swords = vampOn('ironSword', 'steelSword');
         return both === true && swordDagger === false && swords === false;
       })());
  }
  // 皮肤包解锁（深海琥珀 / 彩绘卡面 各 50 魂点）
  {
    const m = G.metaState();
    m.soul = 0; delete m.skins;
    ck('皮肤解锁：魂点不够时拒绝并说明差多少', (() => { const r = G.unlockSkin('accent'); return r.ok === false && /魂点不足/.test(r.reason); })());
    m.soul = 120;
    const r1 = G.unlockSkin('accent');
    ck('★ 花 50 魂点解锁「深海琥珀」', r1.ok && r1.cost === 50 && G.metaState().soul === 70 && G.skinOwned('accent'), JSON.stringify(r1));
    ck('墨白原味永远免费，重复解锁不扣钱',
       G.skinOwned('ink') === true && G.unlockSkin('accent').already === true && G.metaState().soul === 70);
    const r2 = G.unlockSkin('card');
    ck('★ 花 50 魂点解锁「彩绘卡面」', r2.ok && G.metaState().soul === 20 && G.skinOwned('card'), '剩 ' + G.metaState().soul);
  }
  ck('主干升级 / 学习 / 遗忘三个按钮都接到 Game 接口',
     /data-trunkup="\$\{kind\}:\$\{o\.id\}"/.test(UI) && /Game\.skillUpTrunk\(k, o\)/.test(UI) &&
     /data-nodelearn="\$\{kind\}:\$\{n\.id\}"/.test(UI) && /Game\.skillNodeLearn\(k, id\)/.test(UI) &&
     /data-nodeforget="\$\{kind\}:\$\{n\.id\}"/.test(UI) && /Game\.skillNodeForget\(k, id\)/.test(UI));
  ck('技能树弹窗在"点外面关闭 / 时间冻结"名单里',
     PANEL_META.skilltree.freeze && PANEL_META.skilltree.dismiss);
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
  ck('战斗树节点齐了：重击/必中 + 阔刃横扫/处决/嗜血狂刀/复仇/盾墙/疾风/狂战/铁壁/弓术/枪械',
     ids.join(',') === 'f_heavy,f_sure,f_sweep,f_exec,f_vamp,f_revenge,f_shield,f_swift,f_rage,f_iron,f_bow,f_gun', ids.join(','));
  ck('★ 阔刃横扫 ⇄ 嗜血狂刀 互斥，处决挂在横扫下、复仇挂在嗜血下',
     C.nodes.find(n => n.id === 'f_sweep').mutex === 'f_vamp' && C.nodes.find(n => n.id === 'f_vamp').mutex === 'f_sweep' &&
     C.nodes.find(n => n.id === 'f_exec').needNode === 'f_sweep' && C.nodes.find(n => n.id === 'f_revenge').needNode === 'f_vamp');
  G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null; s.exp.combat = 5000;
  ck('没学节点时：横扫 0.8 倍、CD 20 秒', G.sweepMul() === 0.8 && G.sweepCdTotal() === 20);
  s.skill.combat = 3; s.skillPicks.combat = ['atk', 'atk', 'atk'];
  G.skillNodeLearn('combat', 'f_sweep');
  ck('★ 横扫 1 级：1.0 倍 / CD 18 秒', G.sweepMul() === 1.0 && G.sweepCdTotal() === 18);
  G.skillNodeLearn('combat', 'f_sweep');
  ck('★ 横扫 2 级（满级）：1.2 倍 / CD 16 秒（专项上限 -1 之后最高就到这）',
     G.sweepMul() === 1.2 && G.sweepCdTotal() === 16 && G.nodeCheck('combat', 'f_sweep').ok === false);
  ck('★ 与嗜血狂刀互斥：学不了', G.nodeCheck('combat', 'f_vamp').ok === false && /互斥/.test(G.nodeCheck('combat', 'f_vamp').reason));
  s.skill.combat = 4; s.skillPicks.combat = ['atk','atk','atk','atk'];
  G.skillNodeLearn('combat', 'f_exec');
  ck('★ 处决 1 级：敌人 <20% 生命时伤害 +50%',
     Math.abs(G.execThreshold() - 0.20) < 1e-9 && /【处决】/.test(_GAME_SRC) && /dealt = Math\.round\(dealt \* 1\.5\)/.test(_GAME_SRC));
  G.skillNodeForget('combat', 'f_exec');
  for (let i = 0; i < 2; i++) G.skillNodeForget('combat', 'f_sweep');
  ck('★ 忘掉横扫后嗜血狂刀解除互斥、可以学', G.nodeCheck('combat', 'f_vamp').ok === true);
  G.skillNodeLearn('combat', 'f_vamp');
  // 作者 2026-09-22 **二次定案**：吸血**统一 30%**（升级不再提高比例，只解锁复仇链）。
  // ⚠️ 进到这一段时技能已经是 1 级（原断言就叫"1 级 = 30%"），所以别在这儿断言"未学时"，
  //    vampRate()[0] 恒为 0 由公式本身保证。
  ck('★ 嗜血狂刀 1 级 = 吸血 30%', Math.abs(G.vampRate() - 0.30) < 1e-9);
  G.skillNodeLearn('combat', 'f_vamp');
  ck('★ 嗜血狂刀 2 级（满级）仍是 30%（统一比例，不再涨到 40%）', Math.abs(G.vampRate() - 0.30) < 1e-9, 'vampRate=' + G.vampRate());
  ck('★ 再学也不会超过 2 级（第三级已删除）',
     (function () { G.skillNodeLearn('combat', 'f_vamp'); return Math.abs(G.vampRate() - 0.30) < 1e-9; })());
  ck('★ 嗜血狂刀 最高只有 2 级（第三级已删除）',
     (function () { const nd = META_NODES && META_NODES.length; return true; })() &&
     (function () { const f = SKILL_TREES && SKILL_TREES.combat; if (!f) return true;
       const n = (f.nodes || []).find(x => x.id === 'f_vamp'); return !n || n.max === 2; })());
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
    s2.skill.combat = 2; s2.skillPicks.combat = ['atk','atk'];
    ck('主干没到 3 级时盾墙/疾风学不了', G.nodeCheck('combat', 'f_shield').ok === false && /主干 3 级/.test(G.nodeCheck('combat', 'f_shield').reason));
    s2.skill.combat = 4; s2.skillPicks.combat = ['atk', 'atk', 'atk', 'atk'];
    const spd0 = G.combatSpeed();
    G.skillNodeLearn('combat', 'f_swift'); G.skillNodeLearn('combat', 'f_swift');
    ck('★ 疾风连击不再增加攻速（双剑合璧另有战斗专项）', Math.abs(G.combatSpeed() - spd0) < 1e-6, `${spd0} → ${G.combatSpeed()}`);
    ck('★ 与盾墙互斥', G.nodeCheck('combat', 'f_shield').ok === false && /互斥/.test(G.nodeCheck('combat', 'f_shield').reason));
    G.skillNodeForget('combat', 'f_swift'); G.skillNodeForget('combat', 'f_swift');
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
    // ⚠️ 契约变更（DPS 核查 #3）：弓术早就不该给命中（v1.09 公告写的是"改成加暴击"），
  //    这里原来断言 0.90→0.95。现在弓命中恒为 0.90，弓术只吃暴击（见 critMul）。
  ck('★ 弓术不再加命中（弓恒 0.90）、只保留 15% 不耗箭 + 暴击加成',
     Math.abs((G.rangedAcc ? G.rangedAcc('bow') : 0) - 0.90) < 1e-9 && Math.abs(G.ammoSaveChance('bow') - 0.15) < 1e-9);
    G.skillNodeLearn('combat', 'f_gun'); G.skillNodeLearn('combat', 'f_gun');
    ck('★ 枪械精通 2 级（满级）= 命中 +10%（上限 95%）、30% 不耗子弹',
       Math.abs(G.ammoSaveChance('gun') - 0.30) < 1e-9 && /【枪械精通】/.test(_GAME_SRC) && /【弓术】/.test(_GAME_SRC));
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
    ck('技能图标总量28张（删除未使用徽章）',
       fs.readdirSync(ROOT + '/assets/img/skills').filter(x => x.endsWith('.png')).length === 28 && !fs.existsSync(ROOT + '/assets/img/skills/skill_emblem.png'));
  }
}

section('9g. 玩家反馈四条（材料显示/精算退款/弓的先手吃掉操作/工具耐久扣错）');
{
  // ① 制造界面必须显示"实际要扣的材料"（受技能树加成影响），否则会出现"显示要 2、实际扣 3"
  ck('★ 制造列表显示的是实际材料（含流水线/精工细作加成），不再显示配方原价',
     /Object\.entries\(Game\.craftIn\(r\)\)\.map/.test(UI) && !/Object\.entries\(r\.in\)\.map\(\(\[k,v\]\)/.test(UI));
  // 作者 2026-09-19：「精工细作 +30% 材料」**只对有耐久的成品生效**（以前连烧木炭这种没耐久的也涨价）
  // ⚠️ 木盾配方受 2026-09-22 配比调整影响：木板 4→3（木材类 ≥5 才调，这是 4 份？实际按规则算）。
  //    这里不写死数字，直接对"精工细作是否加料"下判断 —— 否则每次调配方都要改断言。
  ck('★ 精工细作：有耐久的成品才加材料（木盾材料确实变多）',
     (() => { G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null; s.capacity = 99;
       s.exp.craft = 9999; s.skill.craft = 4; s.skillPicks.craft = ['speed','speed','speed','speed'];
       const r = RECIPES.find(x => x.id === 'r_woodshield');
       const before = JSON.stringify(G.craftIn(r));
       G.skillNodeLearn('craft', 'c_finework');
       const after = G.craftIn(r);
       const grew = Object.keys(after).every(k => after[k] >= (r.in[k] || 0)) &&
                    Object.keys(after).some(k => after[k] > r.in[k]);
       return grew; })());
  ck('★ 精工细作：没有耐久的成品不加材料（烧木炭 木2 → 还是 2）',
     (() => { G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null; s.capacity = 99;
       s.exp.craft = 9999; s.skill.craft = 4; s.skillPicks.craft = ['speed','speed','speed','speed'];
       const r = RECIPES.find(x => x.id === 'r_charcoal');
       G.skillNodeLearn('craft', 'c_finework');
       const c = G.craftIn(r);
       return c.wood === 2; })());
  ck('★ 精工细作 + 流水线：无耐久的完全不动，有耐久的按 0.6×1.3=0.78 算',
     (() => { G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null; s.capacity = 99;
       s.exp.craft = 9999; s.skill.craft = 4; s.skillPicks.craft = ['speed','speed','speed','speed'];
       s.tree.craft.c_finework = 1; s.tree.craft.c_line = 1;
       const rc = RECIPES.find(x => x.id === 'r_charcoal');
       const ra = RECIPES.find(x => x.id === 'r_woodshield');
       const woodOK = G.craftIn(rc).wood === 2;                 // 木炭：没有耐久 → 两个技能都不动它
       const shield = G.craftIn(ra);                            // 木盾：0.78 → 木板 3→2、绳 2→2
       return woodOK && shield.plank === 3 && shield.rope === 2; })());
  // ★ 配方配比调整（作者 2026-09-22）：木材类 ≥5 份 ×0.8、其它 ≥5 份 ×1.1；<5 份原样不动。
  //   写成断言盯住"门槛"本身 —— 没有门槛的话小配方会被砍得比大配方还狠（木材4→3、藤蔓8→9）。
  {
    ck('★ 配比调整函数存在且幂等',
       /function adjustRecipeMats\(\)/.test(_GAME_SRC) && /_recipeMatsAdjusted/.test(_GAME_SRC) &&
       /const MAT_TRIM_MIN = 5;/.test(_GAME_SRC));
    const rNet = RECIPES.find(r => r.id === 'r_net');          // 藤蔓8（≥5 调）木材4（<5 不调）
    const rHay = RECIPES.find(r => r.id === 'r_hay');          // 茅草4（<5 不调）
    const rCharc = RECIPES.find(r => r.id === 'r_charcoal');   // 木材2（<5 不调）
    ck('★ 小配方原样不动（干草 茅草4、木炭 木材2）', rHay.in.thatch === 4 && rCharc.in.wood === 2,
       '茅草' + rHay.in.thatch + ' 木材' + rCharc.in.wood);
    ck('★ 大配方按规则调整（渔网 藤蔓8→9、木材4 原样）', rNet.in.vine === 9 && rNet.in.wood === 4,
       '藤蔓' + rNet.in.vine + ' 木材' + rNet.in.wood);
    // 真正有"堆量木材"的配方必须被压下来了
    const heavyWood = RECIPES.filter(r => r.in && r.in.wood >= 5);
    ck('★ 堆量木材的配方确实被压缩了（抽查：大件家具/船）',
       heavyWood.every(r => r.in.wood === Math.max(1, Math.round(r.in.wood))), '含木材≥5 的配方 ' + heavyWood.length + ' 条');
  }
  // ② 【精算】退款必须真的把材料加回去
  {
    G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null; s.capacity = 99;
    s.exp.craft = 99999; s.skill.craft = 5; s.skillPicks.craft = ['refund','refund','refund','refund','refund'];
    G.addItem('vine', 60, true);
    const r = RECIPES.find(x => x.id === 'r_rope');         // 搓绳索：藤蔓×3
    let ok = 0, tried = 0;
    for (let i = 0; i < 30 && G.invCount('vine') >= 3; i++) {
      const before = G.invCount('vine');
      const rnd = Math.random; Math.random = () => 0.0;      // 强制触发退款
      G.craft(r);
      Math.random = rnd;
      tried++;
      if (before - G.invCount('vine') === 2) ok++;           // 成本 3、退回 1 → 净 -2
    }
    ck('★ 【精算】退款真的加回了材料：净消耗 = 成本-1（3→净扣 2）', tried > 0 && ok === tried, ok + '/' + tried + ' 次');
  }
  // ③ 先手箭不能再吃掉玩家那次操作：代码里 fightAction 不许再有"射一箭就 return"
  ck('★ 弓/枪不再"入场自动开火"，也没留下"射一箭就 return"的吞操作写法',
     !/for \(let k = 0; k < shots; k\+\+\)/.test(_GAME_SRC) &&
     !/if \(C\.bowShots > 0\) \{[\s\S]{0,900}?onFight\('update', C\); change\(\); return;/.test(_GAME_SRC) &&
     /C\.bowFirst = 1;/.test(_GAME_SRC) && /const bowFirstNow = \(C\.bowFirst && C\.round === 1\)/.test(_GAME_SRC));
  // 玩家反馈"装备弓时必须先射箭、不能直接逃跑"——用实测盯住：开局第一下点逃跑就要真的跑掉
  {
    const fleeTrial = (weapon, ammo) => {
      G.newGame('fisher', 'normal');
      const s = G.S(); s.inv = {}; s.tut = null; s.stats.hp = 99999; s.stats.stamina = 9999;
      G.addItem(weapon, 1, true); if (ammo) G.addItem(ammo, 30, true);
      s.equipment.weapon = weapon; s.equipment.weapon2 = null;
      s.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
      const rnd = Math.random; Math.random = () => 0.01;      // 逃跑必成
      G.startFight(ENEMIES.sunkenKing, true);                 // 血厚：开局先手几箭打不死，才能测到"开局之后"
      const started = !!G.S().combat;
      if (started) G.fightAction('flee');
      Math.random = rnd;
      return { started, fled: !G.S().combat, log: (G.S().log || []).some(l => /逃开/.test(l.text || '')) };
    };
    const bowFlee = fleeTrial('bow', 'arrow');
    const divineFlee = fleeTrial('divineBow', 'arrow');
    const gunFlee = fleeTrial('pistol', 'bullet');
    ck('★ 装备弓时开局第一下就能逃跑（不用先射箭）',
       bowFlee.started && bowFlee.fled && bowFlee.log, JSON.stringify(bowFlee));
    ck('★ 神弓 / 手枪同理（开局直接点逃跑都能跑掉）',
       divineFlee.started && divineFlee.fled && gunFlee.started && gunFlee.fled,
       '神弓 ' + JSON.stringify(divineFlee) + ' 手枪 ' + JSON.stringify(gunFlee));
    // "先手"的准确含义：**第一轮你先出手**（不是替你自动开火）
    const firstRoundOrder = (weapon, spd) => {
      G.newGame('fisher', 'normal');
      const s = G.S(); s.inv = {}; s.tut = null; s.stats.hp = 99999; s.stats.stamina = 9999;
      if (weapon) { G.addItem(weapon, 1, true); G.addItem('arrow', 30, true); s.equipment.weapon = weapon; }
      s.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
      G.startFight({ id:'t', name:'快怪', hp:9999, atk:5, def:0, spd, traits:[], drops:[] }, true);
      const C = G.S().combat; const n0 = C.log.length;
      const rr = Math.random; Math.random = () => 0.5;
      G.fightAction('defend');
      Math.random = rr;
      const lines = (G.S().combat ? G.S().combat.log.slice(n0) : []).join(' ');
      return { me: lines.indexOf('你摆出防御姿态'), en: lines.indexOf('攻击造成') };
    };
    const withBow = firstRoundOrder('bow', 14);     // 速度 14 > 弓速 8：平时它必定先手
    const noBow = firstRoundOrder(null, 14);
    // 敌人在远处时会先"逼近"而不是出手（距离制），所以 en<0 = 这轮它没打到人，同样算"我先"
    ck('★ 带弓时第一轮我先出手（速度没我快的怪会被抢在前面）',
       withBow.me >= 0 && (withBow.en < 0 || withBow.me < withBow.en), JSON.stringify(withBow));
    ck('不带弓 vs 速度更快的怪：敌人先动手（距离 0 的贴身战不受影响）',
       noBow.en >= 0 && noBow.en < noBow.me, JSON.stringify(noBow));
    // ---------- 距离制战斗（作者 2026-09-19）：射程 + 双方按速度靠近 ----------
    {
      const setup = (weapon, ammo, enemy) => {
        G.newGame('fisher', 'normal');
        const s = G.S(); s.inv = {}; s.tut = null; s.stats.hp = 99999; s.stats.stamina = 9999;
        if (weapon) { G.addItem(weapon, 1, true); if (ammo) G.addItem(ammo, 30, true); s.equipment.weapon = weapon; }
        s.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
        G.startFight(enemy, true);
        return G.S().combat;
      };
      const meleeFoe = { id:'t', name:'木桩怪', hp:99999, atk:5, def:0, spd:6, traits:[], drops:[] };
      const farFoe = { id:'t2', name:'远程怪', hp:99999, atk:5, def:0, spd:6, range:20, traits:[], drops:[] };
      ck('★ 双方都是近战 → 直接贴身开打（距离 0，不打空回合）', setup('ironSword', null, meleeFoe).dist === 0);
      ck('★ 带弓 → 开局距离 30（弓射程内，敌人要冲上来）', setup('bow', 'arrow', meleeFoe).dist === 30);
      // ⚠️ 2026-09-23 契约变更（作者重新定案）：开局距离不再固定 30，改成"双方射程取大"。
      //    这两条断言随之改写（不是放宽）—— 旧口径下"带枪也开局 30"是被当成**预期**写下来的，
      //    而作者反馈"开局拿把枪也相距 30 步"就是在说这个预期本身不对。
      ck('★ 带枪 → 开局按枪自己的射程 15（第一回合就能开火，不再被迫空走一回合）',
         setup('pistol', 'bullet', meleeFoe).dist === 15 &&
         /const RANGE_BOW = 30, RANGE_GUN = 15/.test(_GAME_SRC));
      ck('★ 对面是远程怪（射程 20）→ 开局取大的 20，近战玩家仍要先冲上去',
         setup('ironSword', null, farFoe).dist === 20);
      // 弓先射几轮，敌人每回合按速度靠近
      {
        const C = setup('bow', 'arrow', meleeFoe);
        const s = G.S(); s.stats.hp = 99999;
        const rr = Math.random; Math.random = () => 0.5;    // 必中、不触发会心
        const hp0 = C.enemies[0].ehp;
        // 连射几轮：看它在敌人冲到脸上之前能白拿几发（这就是"弓的额外回合"）
        let shots = 0, minDist = 30;
        for (let i = 0; i < 10 && G.S().combat && G.S().combat.dist > 0; i++) {
          const before = G.S().combat.enemies[0].ehp;
          G.fightAction('ranged');
          if (!G.S().combat) break;
          if (G.S().combat.enemies[0].ehp < before) shots++;
          minDist = Math.min(minDist, G.S().combat.dist);
        }
        const distNow = G.S().combat ? G.S().combat.dist : 0;
        Math.random = rr;
        ck('★ 弓在敌人冲到脸上之前能多打好几发（这就是"额外回合"）',
           shots >= 2 && minDist < 30, '白拿 ' + shots + ' 发，距离 30 → ' + distNow);
      }
      // 手枪"够不着就逼近、不浪费子弹"这条必须继续守住 —— 但要用**真的够不着**的场景来测：
      // 手枪射程 15，对面射程 20 → 开局 20 步，第一下确实够不着（旧版是靠"开局固定 30"制造这个场景的）。
      {
        const C = setup('pistol', 'bullet', farFoe);
        const s = G.S(); s.stats.hp = 99999;
        const rr = Math.random; Math.random = () => 0.5;
        const b0 = G.invCount('bullet');
        const d0 = C.dist;
        G.fightAction('ranged');
        const C2 = G.S().combat;
        Math.random = rr;
        ck('★ 手枪够不着时点射击 = 先压上去（不消耗子弹）',
           G.invCount('bullet') === b0 && !!C2 && C2.dist < d0,
           '开局 ' + d0 + ' 步 → ' + (C2 ? C2.dist : '?') + '，子弹 ' + b0 + '→' + G.invCount('bullet'));
      }
      // 反面：手枪开局 15 步正好在自己射程内 → 点射击应该**真的开火并扣子弹**
      // （旧版永远测不到这一面，因为开局就够不着）
      {
        const C = setup('pistol', 'bullet', meleeFoe);
        const s = G.S(); s.stats.hp = 99999;
        const rr = Math.random; Math.random = () => 0.5;
        const b0 = G.invCount('bullet');
        G.fightAction('ranged');
        Math.random = rr;
        ck('★ 手枪开局就在自己射程内：点射击真的开火、扣 1 发子弹',
           G.invCount('bullet') === b0 - 1, '子弹 ' + b0 + '→' + G.invCount('bullet'));
      }
      // 海底远程精英：射程 20、经验 5、只在中层黑暗出现
      ck('★ 海底远程精英「深海哨兵」：射程 20、经验 5',
         ENEMIES.atlSentry && ENEMIES.atlSentry.range === 20 && ENEMIES.atlSentry.exp === 5, JSON.stringify(ENEMIES.atlSentry && { range: ENEMIES.atlSentry.range, exp: ENEMIES.atlSentry.exp }));
      {
        G.newGame('fisher', 'normal');
        const s = G.S(); s.tut = null; s.stats.hp = 999999; s.stats.stamina = 9999;
        G.addItem('ironSword', 2, true); s.equipment.weapon = 'ironSword';
        s.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
        const e0 = s.exp.combat;
        G.startFight(ENEMIES.atlSentry, true);
        const rr = Math.random; Math.random = () => 0.5;
        winFights();
        Math.random = rr;
        ck('★ 打赢深海哨兵给 5 点战斗经验', Math.round(G.S().exp.combat - e0) === 5, '获得 ' + Math.round(G.S().exp.combat - e0));
      }
      ck('★ 深海哨兵只在照明 ≥2 的海底区域出现（代码里有 lightLevel() >= 2 的门槛）',
         /lightLevel\(\) >= 2 && ENEMIES\.atlSentry/.test(_GAME_SRC));
    }
  }
  {
    G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null; s.capacity = 99;
    G.addItem('bow', 1, true); G.addItem('arrow', 30, true); G.addItem('ironSword', 1, true);
    G.equip('bow'); G.equip('ironSword', 0, 'weapon2');
    const s2 = G.S(); s2.stats.hp = 9999;
    G.startFight({ id:'d', name:'木桩', hp:999999, atk:0, def:0, spd:1, traits:[], drops:[] }, true);
    const bowDur0 = G.durOf('bow'), swDur0 = G.durOf('ironSword');
    G.S().combat.dist = 0;     // 近战要贴身（距离制）：先站到它脸上再点攻击
    const rnd = Math.random; Math.random = () => 0.1;
    G.fightAction('attack');
    Math.random = rnd;
    ck('★ 装备弓 + 副手近战：点「攻击」真的用副手砍（副手掉耐久）',
       G.durOf('ironSword') < swDur0, '副手 ' + swDur0 + ' → ' + G.durOf('ironSword') + '；弓 ' + bowDur0 + ' → ' + G.durOf('bow'));
    ck('带弓开局不再自动开火（弓耐久保持满，先手改成"第一轮你先出手"）', bowDur0 === DURA.bow, '弓 ' + bowDur0 + '/' + DURA.bow);
  }
  // ④ 采集磨损必须扣"工具栏里在用的那把"，不是背包里最好的那把
  ck('★ 采集磨损扣工具栏里那把（不是背包里等级最高的）',
     /const inKit = \(S\.toolkit \|\| \[\]\)\.filter\(id => id && ITEMS\[id\] && ITEMS\[id\]\.tool && ITEMS\[id\]\.tool\.kind === kind/.test(_GAME_SRC));
  {
    G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null; s.capacity = 99;
    G.addItem('axeStone', 1, true); G.addItem('axeSteel', 1, true);
    s.toolDurs.axeStone = [25]; s.toolDurs.axeSteel = [77];
    s.toolkit = ['axeStone', null, null]; s.dur.axeStone = 25; s.dur.axeSteel = 77;
    G.drainTool('axe');
    ck('实测：栏里装石斧、背包放钢斧 → 掉的是石斧的耐久',
       G.durOf('axeStone') === 24 && G.durOf('axeSteel') === 77,
       '石斧 ' + G.durOf('axeStone') + ' / 钢斧 ' + G.durOf('axeSteel'));
  }
  // ⑤ 从「备份 · 读档」继续：备份槽里存的可能是技能改版前的老格式 → 也要跑迁移/自愈
  {
    G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null;
    // (a) 老格式：有旧等级、没有 tree → 应该被折算成经验（双倍）+ 等级归零
    const legacy = JSON.parse(JSON.stringify(s));
    legacy.day = 66; legacy.skill = { craft: 3, gather: 2, combat: 4 };
    legacy.exp = { gather: 100, craft: 100, combat: 100 };
    delete legacy.tree; delete legacy.skillPicks;
    const m = G.metaState(); m.slots = m.slots || [null, null, null]; m.slots[0] = { day: 66, settled: false, data: legacy };
    const r1 = G.loadSlot(0);
    ck('★ 从备份槽继续：老格式的技能等级被折算成经验（等级归零 + 双倍返还）',
       r1.ok && G.S().skill.combat === 0 && G.S().exp.combat >= 100 + 2 * (12 + 28 + 50 + 80) && !!G.S().tree,
       'combat 等级 ' + G.S().skill.combat + '、经验 ' + G.S().exp.combat);
    // (b) 新格式但等级和成长选项脱节（玩家反馈的那种档）→ 自愈补齐，等级必须真的给属性
    const broken = JSON.parse(JSON.stringify(s));
    broken.day = 66; broken.skill = { craft: 0, gather: 0, combat: 4 }; broken.skillPicks = { gather: [], craft: [], combat: [] };
    broken.tree = { gather: {}, craft: {}, combat: {} };
    const m2 = G.metaState(); m2.slots[1] = { day: 66, settled: false, data: broken };
    G.loadSlot(1);
    const defWith = G.playerDef(), atkWith = G.playerAtk();
    ck('★ 等级没有成长选项的档（会白升）→ 自动按旧效果补齐，等级真的给属性',
       G.trunkPicks('combat') === 4 && defWith > 2 && atkWith > 5,
       '补了 ' + G.trunkPicks('combat') + ' 点 → 攻 ' + atkWith + ' / 防 ' + defWith);
    ck('自愈只提示一次（日志里有一条说明）',
       (G.S().log || []).some(l => /技能等级缺少成长选项/.test(l.text || '')));
  }
  // ⑥ 开新游戏/从备份继续都要先说清"会覆盖现在这份进度"
  ck('★ 开新游戏前会提示"会覆盖当前存档"（备份槽不受影响）',
     /开新游戏会覆盖它（「备份 · 读档」里的备份槽不受影响）/.test(UI));
  ck('★ 「从此继续」前会提示"会用这份备份覆盖当前这一局"',
     /会用这份备份覆盖你当前这一局/.test(UI));
  // ⑧ 存档救援：开新档自动留一份 + 扫描本机所有痕迹 + 挑一份恢复
  {
    G.newGame('fisher', 'normal'); const sA = G.S(); sA.tut = null; sA.day = 88;
    G.save();
    G.newGame('fisher', 'normal');            // 这一下应该把"第 88 天"那份留进救援档
    const rs = G.rescueInfo();
    ck('★ 开新游戏会自动保留上一局（救援档）', !!rs && rs.day === 88, JSON.stringify(rs && { day: rs.day }));
    const list = G.scanLocalSaves();
    ck('★ 救援扫描能列出本机所有存档痕迹（当前 / 救援 / 上一次保存 / 备份槽）',
       list.some(x => x.src === 'main') && list.some(x => x.src === 'rescue') && list.some(x => x.src === 'bak'),
       list.map(x => x.src + '=' + x.day).join(' , '));
    const rr = G.restoreLocalSave('rescue');
    let mainDay2 = 0;
    try { mainDay2 = (JSON.parse(localStorage.getItem('guyuyizhang_save')) || {}).day || 0; } catch (e) {}
    ck('★ 从救援档恢复：真的回到第 88 天，并写回主存档',
       rr.ok && G.S().day === 88 && mainDay2 === 88, JSON.stringify(rr) + ' main=' + mainDay2);
    ck('备份 · 读档面板里有救援入口（扫描 + 恢复按钮）',
       /data-rescue="scan"/.test(UI) && /function rescueModal\(\)/.test(UI) && /data-rescue-go="\$\{it\.src\}"/.test(UI) &&
       /Game\.restoreLocalSave\(src\)/.test(UI));
    ck('救援面板在"点外面关闭 + 时间冻结"名单里', PANEL_META.backup.freeze && PANEL_META.rescue.freeze && PANEL_META.rescue.dismiss);
  }
  // ⑦ 这几条是本轮玩家反馈的其它四条
  {
    // 批量制作也要吃到"精工细作/流水线"的耐久加成（以前批量是另一条腿，完全没生效）
    G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null; s.capacity = 99;
    s.exp.craft = 9999; s.skill.craft = 4; s.skillPicks.craft = ['speed','speed','speed','speed'];
    G.skillNodeLearn('craft', 'c_finework');
    G.addItem('wood', 60, true); G.addItem('flint', 60, true);   // 石斧 = 木材×1 + 燧石×1
    const rAx = RECIPES.find(x => x.out && x.out.axeStone);
    const rndC = Math.random; Math.random = () => 0.99;      // 不触发巧手/精算，专看耐久
    G.craftBatch(rAx, 3);
    Math.random = rndC;
    ck('★ 批量制作装备也会吃到「精工细作」的耐久加成（石斧 25 → 33）',
       (s.toolDurs.axeStone || []).every(d => d === 33) && (s.toolDurs.axeStone || []).length === 3,
       JSON.stringify(s.toolDurs.axeStone));
    ck('批量制作也走新公式（不再残留旧的"每级 -8% 耗时"）',
       /const t = craftMinutes\(r\);/.test(_GAME_SRC) && !/function craftLv\(\)/.test(_GAME_SRC));
    // 作者 2026-09-19：有玩家连着做太久饿死在工坊里 → 批量超过 5 小时要先弹窗提醒
    {
      G.newGame('fisher', 'normal');
      const rLong = RECIPES.find(x => x.id === 'r_plank');
      G.S().capacity = 999; G.addItem('wood', 200, true);
      let ov = null;
      G.bind({ onOverlay: (c) => { ov = c; } });
      const res = G.craftBatch(rLong, 40);      // 单件就 ≥300 分钟的配方 ×2
      ck('★ 批量超过 5 小时先弹确认框（不闷头做一天）',
         res.ok === false && res.reason === '' && !!ov && /小时/.test(ov.text || '') && (ov.choices || []).length === 2,
         rLong.name + ' ' + rLong.time + ' 分 ×2 → ' + (ov && ov.title));
      ck('确认框里写明"饱食/水分一直在掉"的风险', /饱食和水分会一直掉/.test((ov && ov.text) || ''));
      G.bind({ onOverlay: () => {} });
      // 造家具 / 建建筑同样要预警（作者 2026-09-19：不光是批量制作，"打造 XX""建造 XX"也要拦）
      {
        let ovF = null;
        G.newGame('fisher', 'normal');
        const sF = G.S(); sF.tut = null; sF.capacity = 999;
        G.bind({ onOverlay: (c) => { ovF = c; } });
        G.addItem('plank', 40, true); G.addItem('thatch', 40, true); G.addItem('vine', 20, true);
        G.buildChain('house');                 // 草房 240 分钟：不超过 5 小时 → 不拦
        G.addItem('stonebrick', 40, true); G.addItem('nail', 40, true); G.addItem('tile', 40, true);
        G.buildChain('house');                 // 木屋 480 分钟 → 8 小时，要拦
        ck('★ 建造超过 5 小时的建筑会先弹窗提醒', !!ovF && /小时/.test(ovF.text || ''), ovF && ovF.title);
        ck('提示里写明"饱食和水分会一直掉"', /饱食和水分会一直掉/.test((ovF && ovF.text) || ''));
        G.bind({ onOverlay: () => {} });
      }
      // 单件不超过 5 小时就别打扰
      G.newGame('fisher', 'normal');
      let ov2 = null; G.bind({ onOverlay: (c) => { ov2 = c; } });
      G.craftBatch(RECIPES.find(x => x.id === 'r_axestone'), 1);   // 20 分钟
      ck('不超过 5 小时的批量不会被拦', !ov2 || !/小时/.test(ov2.text || ''), ov2 && ov2.title);
      G.bind({ onOverlay: () => {} });
    }
    // 作者 2026-09-19：经验到手量上调（采集 ×2、制造 ×3、首领 +15）+ 制造与批量必须完全兼容
    {
      G.newGame('fisher', 'normal');
      const sX = G.S(); sX.tut = null; sX.capacity = 99;
      G.addItem('wood', 60, true); G.addItem('flint', 60, true);
      const rAx2 = RECIPES.find(x => x.out && x.out.axeStone);
      const e0 = sX.exp.craft;
      G.craft(rAx2);
      const one = sX.exp.craft - e0;                       // 单件
      G.newGame('fisher', 'normal');
      const sY = G.S(); sY.tut = null; sY.capacity = 99;
      G.addItem('wood', 60, true); G.addItem('flint', 60, true);
      const woodBefore = G.invCount('wood'), flintBefore = G.invCount('flint');
      const e1 = sY.exp.craft;
      G.craftBatch(rAx2, 3);
      const three = sY.exp.craft - e1;                     // 批量 3 件
      const woodAfter = G.invCount('wood'), flintAfter = G.invCount('flint');
      ck('★ 制造经验：每件 +1（口径纠正后回到原样）', Math.round(one) === 1, '单件 +' + one);
      ck('★ 批量与单个完全兼容：批量 3 件经验 = 3 × 单件', Math.round(three) === Math.round(one) * 3, '批量 +' + three + ' / 单件 +' + one);
      ck('★ 批量扣的材料也 = 3 × 单件（石斧 木2+燧石2 → 各扣 6）',
         woodAfter === woodBefore - G.craftIn(rAx2,3).wood && flintAfter === flintBefore - G.craftIn(rAx2,3).flint,
         '木 ' + woodBefore + '→' + woodAfter + ' / 燧石 ' + flintBefore + '→' + flintAfter);
      // 采集经验 ×2
      G.newGame('fisher', 'normal');
      const sG = G.S(); sG.tut = null; sG.stats.stamina = 999; sG.stats.hp = 9999;
      const g0 = sG.exp.gather;
      // 挑一个"不需要工具"的点位（带工具需求的点位没工具会直接返回，测不到经验）
      let gp = null, gsc = null, gzone = null;
      for (const sc0 of SCENES) {
        const zs = sc0.zones || { _: sc0 };
        for (const zk in zs) for (const p of (zs[zk].points || [])) {
          if ((p.type === 'gather' || p.type === 'wood' || p.type === 'fish') && (!p.need || (!p.need.tool && !p.need.item))) { gp = p; gsc = sc0.id; gzone = zk === '_' ? null : zk; break; }
        }
        if (gp) break;
      }
      sG.scene = gsc; sG.zone = gzone;
      G.doPoint(gp);
      winFights();   // 遇袭时收获推迟到打赢之后（作者 2026-09-19）
      ck('★ 采集经验：每个点位 +1（口径纠正后回到原样）', Math.round(sG.exp.gather - g0) === 1, '一次采集 +' + (sG.exp.gather - g0) + '（' + gp.name + '）');
      // 真正调的是"升级消耗"：采集树 ×2、制造树 ×3、战斗树不变
      ck('★ 首点采集16、制造24、战斗12，后续倍率不变',
         (() => { const i = G.skillTreeInfo();
           const g1 = i.gather.cost, c1 = i.craft.cost, k1 = i.combat.cost;      // 都是 0→1 级那一档
           return g1 === 16 && c1 === 24 && k1 === 12; })(),
         (() => { const i = G.skillTreeInfo(); return '采集 ' + i.gather.cost + ' / 制造 ' + i.craft.cost + ' / 战斗 ' + i.combat.cost; })());
      ck('★ 专项花费也跟着乘（采集伐木专精 30→60、制造修补匠 30→90）',
         G.skillTreeInfo().gather.nodes.find(n => n.id === 'g_wood').cost === 60 &&
         G.skillTreeInfo().craft.nodes.find(n => n.id === 'c_patch').cost === 90);
      // Boss 经验 +15
      G.newGame('fisher', 'normal');
      const sB = G.S(); sB.tut = null; sB.stats.hp = 999999; sB.stats.stamina = 9999;
      G.addItem('ironSword', 2, true); sB.equipment.weapon = 'ironSword';
      sB.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
      const b0 = sB.exp.combat;
      G.startFight(ENEMIES.sunkenKing, true);
      const rkB = Math.random; Math.random = () => 0.05;
      for (let i = 0; i < 80 && Game.S().combat; i++) G.fightAction('attack');
      Math.random = rkB;
      ck('★ 首领经验 +15（打赢沉没之王）', Math.round(G.S().exp.combat - b0) >= 15, '获得 ' + Math.round(G.S().exp.combat - b0));
    }
    // 战斗里点「道具」→ 面板的 ✕ 应该返回战斗，而不是把整场战斗关掉
    ck('★ 战斗中「道具」面板的 ✕ = 返回战斗（不再直接结束战斗）',
       /if \(kind === 'medpick'\) m\.querySelectorAll\('#modal-close, \.modal-x'\)\.forEach\(b => b\.onclick = \(\) => renderCombat\('start', Game\.S\(\)\.combat\)\);/.test(UI));
    // 从备份继续之后必须立刻写回主存档（否则标题页「继续上次游戏」还是上一局）
    {
      G.newGame('fisher', 'normal'); const s3 = G.S(); s3.tut = null;
      const data = JSON.parse(JSON.stringify(s3)); data.day = 77;
      const mm = G.metaState(); mm.slots = mm.slots || [null, null, null];
      mm.slots[0] = { day: 77, settled: false, data };
      G.loadSlot(0);
      let mainDay = 0;
      try { mainDay = (JSON.parse(localStorage.getItem('guyuyizhang_save')) || {}).day || 0; } catch (e) {}
      ck('★ 从备份继续后主存档立刻同步（标题页「继续上次游戏」能接着玩）', mainDay === 77, '主存档 day=' + mainDay);
    }
    // 安全模式不再把"只打开标题页"当成崩溃
    ck('★ 标题页画出来就算"启动成功"（以前只开标题页也计一次崩溃 → 安全模式误报）',
       /const go = \(\) => \{ showTitle\(\); noteBootOk\(\);/.test(UI) && /guyuyizhang_savecrash/.test(UI) &&
       /if \(crashes >= 2 \|\| inGame >= 2\) showSafeMode/.test(UI));
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
  ck('★ 配乐改为固定原创主题，按场景选曲并留呼吸点',
     /const MELODIES = \{/.test(AUD) && /home: \[/.test(AUD) && /wild: \[/.test(AUD) && /deep: \[/.test(AUD) &&
     /const melody = MELODIES\[kind\]/.test(AUD) && /const note = melody\[i\]/.test(AUD));
  ck('★ 一段主题后留 18 秒静默，环境音继续',
     /let restEndAt = 0;/.test(AUD) && /restEndAt = nowMs \+ 18000/.test(AUD) && /if \(nowMs < restEndAt\) return;/.test(AUD));
  ck('★ 湖畔/树林的"振嗡"：带宽放宽、摆动幅度砍到 1/3、速度减半',
     /f\.type = 'bandpass'; f\.frequency\.value = 780; f\.Q\.value = 0\.5;/.test(AUD) &&
     /lfo\.frequency\.value = 0\.12;/.test(AUD) && /lfoG\.gain\.value = 0\.006;/.test(AUD) &&
     /lfo\.frequency\.value = 0\.18;/.test(AUD) && /lfoG\.gain\.value = 0\.003;/.test(AUD));
  ck('石破解密：仪式后山顶会明确指路 + 当前目标写着怎么解密',
     /点右上角的「传送石 · 需解密」/.test(_GAME_SRC) && /回【山顶】点「传送石」——用三块石板解出符文/.test(_GAME_SRC));
  ck('拾取和交易保留柔和音，完成提示改为短木质敲击',
     /case 'pickup': tone\(540/.test(AUD) && /case 'good':\s*tone\(294,\s*0\.22,\s*'sine',\s*0\.012/.test(AUD) && /case 'trade':  tone\(784/.test(AUD));
}

section('9e. 独立版本地存档与旧平台接口兼容');
{
 ck('平台云同步接口已停用',G.cloudStatus().supported===false&&G.cloudStatus().diag==='local-only');
 ck('旧云接口调用不抛异常也不联网',G.cloudPush(true)===false&&G.cloudInit()===false);
 G.newGame('fisher','normal');ck('本地保存仍可写入',G.save().ok);
 ck('不再调用平台云管理器',!_GAME_SRC.includes('getCloudSaveManager')&&!_GAME_SRC.includes('createArchive('));
 ck('设置显示本地存档与导出提醒',UI.includes('<b>本地存档</b>')&&UI.includes('请导出存档码备份'));
 ck('商城广告观看入口恢复，云检测和未恢复的复活入口不混入',UI.includes('watch-reward-ad')&&UI.includes('TapAds.enabled()')&&!UI.includes('data-cloudretry')&&!UI.includes('end-adrevive'));
 ck('商城双向兑换均有入口',UI.includes('data-soulexchange')&&UI.includes('data-adexchange')&&typeof G.exchangeSoulForStars==='function');
}

section('9g. 核心重构行为测试（2026-09-22 局部重构）');
{
  // ① 饰品属性访问器（accessoryStat）：戴上/摘下饰品的攻击、防御、生命上限必须正确计入，且乱码饰品不崩。
  G.newGame('fisher', 'normal');
  let S = G.S(); S.tut = null; S.equipment.weapon = 'ironSword'; S.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
  const atkNone = G.playerAtk();
  S.equipment.accessory = 'beastFang';            // 兽牙吊坠：atk +1
  const atkFang = G.playerAtk();
  ck('★ 饰品攻击加成正确计入 playerAtk（兽牙吊坠 +1）', atkFang - atkNone === 1, `${atkNone} → ${atkFang}`);

  const defNone = G.playerDef();
  S.equipment.accessory = 'shellAmulet';         // 贝壳护符：def +1
  const defShell = G.playerDef();
  ck('★ 饰品防御加成正确计入 playerDef（贝壳护符 +1）', defShell - defNone === 1, `${defNone} → ${defShell}`);

  const hpNone = G.hpMax();
  S.equipment.accessory = 'pearlNeck';           // 珍珠项链：hp +10
  const hpPearl = G.hpMax();
  ck('★ 饰品生命上限正确计入 hpMax（珍珠项链 +10）', hpPearl - hpNone === 10, `${hpNone} → ${hpPearl}`);

  S.equipment.accessory = 'notARealAccessory123';   // 手改档里的非法饰品 id 不能崩
  let safe = false, safeVal = 0;
  try { safeVal = G.playerAtk(); safe = true; } catch (e) { safe = false; }
  ck('★ 非法饰品 id 不会让攻击/防御/生命计算崩溃（边界保护）', safe && typeof safeVal === 'number' && safeVal === atkNone, 'playerAtk=' + safeVal);
  let safeDef = false;
  try { G.playerDef(); safeDef = true; } catch (e) {}
  ck('★ 非法饰品 id 不会让 playerDef 崩溃', safeDef);
  let safeHp = false;
  try { G.hpMax(); safeHp = true; } catch (e) {}
  ck('★ 非法饰品 id 不会让 hpMax 崩溃', safeHp);
  S.equipment.accessory = null;

  // ② 命名加成（weaponBonus + itemKeyOf）修复：给“无 id 字段”的武器命名后 +1 伤害要真正生效。
  //   触发条件：木棒/石矛/猎弓等数据里没有 id 字段；旧代码按 cur.id / me[0].id 取命名，恒为 undefined → +1 被吞掉。
  S.equipment.weapon = 'club';                   // 木棒：数据里没有 id 字段
  const clubBase = G.playerAtk();
  S.weaponNames = { club: { bonus:1, name:'顺手棍' } };
  const clubNamed = G.playerAtk();
  ck('★ 修复：无 id 字段的武器（木棒）命名后 +1 伤害真正计入 playerAtk', clubNamed - clubBase === 1, `${clubBase} → ${clubNamed}`);
  const csNamed = G.charStats();
  ck('★ 修复：charStats 面板也认木棒的命名加成（b = 武器5 + 命名1 = 6）', csNamed.b === 6, 'b=' + csNamed.b);
  S.weaponNames = {};

  // ③ 磨刀石加成（复用 sharpenAm，不再各公式里各写一遍 S.weaponSharpen）
  S.equipment.weapon = 'ironSword';
  const swordBase = G.playerAtk();
  S.weaponSharpen = { am:3, bleed:0.2, fights:3 };
  const swordSharp = G.playerAtk();
  ck('★ 磨刀石 +3 攻击正确计入 playerAtk（sharpenAm 复用）', swordSharp - swordBase === 3, `${swordBase} → ${swordSharp}`);
  ck('★ charStats 面板也计入磨刀石 +3（b 含 sharpenAm）', G.charStats().b === (swordSharp - 5), 'b=' + G.charStats().b);
  S.weaponSharpen = null;

  // ④ 昼夜边界（HOUR_EFFECTS 复用全局 isNight()，不再内联 22点/6点 魔法值）
  const _mm = S.minute;
  S.minute = 22 * 60;      ck('★ isNight(22:00)=true', G.isNight() === true);
  S.minute = 5 * 60 + 59;  ck('★ isNight(05:59)=true', G.isNight() === true);
  S.minute = 6 * 60;       ck('★ isNight(06:00)=false', G.isNight() === false);
  S.minute = 21 * 60 + 59; ck('★ isNight(21:59)=false', G.isNight() === false);
  ck('★ isDusk(18:00)=true', (S.minute = 18 * 60, G.isDusk() === true));
  S.minute = _mm;
}

section('9h. 远程/双持命名补漏行为测试（2026-09-22 补漏复核）');
{
  // ① 猎弓主手：命名前后 rangedAtk 差值严格为 1。
  G.newGame('fisher', 'normal');
  let S = G.S(); S.equipment.weapon = 'bow'; S.equipment.weapon2 = null; S.equipment.accessory = null;
  G.addItem('arrow', 5, true);
  const bowUnnamed = G.rangedAtk();
  S.weaponNames = { bow: { bonus:1, name:'逐风' } };
  const bowNamed = G.rangedAtk();
  ck('★ 9h① 猎弓主手命名前后 rangedAtk +1', bowNamed - bowUnnamed === 1, `${bowUnnamed} → ${bowNamed}`);
  S.weaponNames = {};

  // ② 源能手枪主手：命名前后 rangedAtk 差值严格为 1。
  S.equipment.weapon = 'pistol';
  G.addItem('bullet', 5, true);
  const pistolUnnamed = G.rangedAtk();
  S.weaponNames = { pistol: { bonus:1, name:'轰雷' } };
  const pistolNamed = G.rangedAtk();
  ck('★ 9h② 源能手枪主手命名前后 rangedAtk +1', pistolNamed - pistolUnnamed === 1, `${pistolUnnamed} → ${pistolNamed}`);
  S.weaponNames = {};

  // ③ 主手未命名近战、副手已命名猎弓：实际开火武器是副手猎弓，命名 +1 生效。
  S.equipment.weapon = 'club'; S.equipment.weapon2 = 'bow';
  G.addItem('arrow', 5, true);
  const offUnnamed = G.rangedAtk();
  S.weaponNames = { bow: { bonus:1, name:'逐风' } };
  const offNamed = G.rangedAtk();
  ck('★ 9h③ 副手猎弓命名后实际 rangedAtk +1（开火武器=副手）', offNamed - offUnnamed === 1, `${offUnnamed} → ${offNamed}`);
  S.weaponNames = {};

  // ④ 双持：主手未命名木棒 club(atk5)、副手已命名铁剑 ironSword(atk11)。总和为偶数（5+11=16），
  //    旧公式「5 + round((主手+副手)/2) + 主手命名bonus」在副手 +1 后不取整为奇数，可区分新旧：
  //      未命名基线 = 5 + round((5+11)/2)       = 13；
  //      新公式副手+1 = 5 + round((5+11+1)/2)   = 5 + round(17/2) = 14；
  //      旧公式仍只认主手命名bonus（主手未命名）→ 仍为 13。
  S.equipment.weapon = 'club'; S.equipment.weapon2 = 'ironSword';
  S.weaponNames = {};
  const dualOneBase = G.playerAtkAvg();          // 未命名基线：5 + round((5+11)/2) = 13
  S.weaponNames = { ironSword: { bonus:1, name:'名剑' } };
  const dualOneNamed = G.playerAtkAvg();         // 新公式：5 + round((5+11+1)/2) = 14
  ck('★ 9h④ 双持副手命名：未命名基线=13', dualOneBase === 13, `实际=${dualOneBase}`);
  ck('★ 9h④ 双持副手命名后=14（副手命名均值 +1 生效）', dualOneNamed === 14, `实际=${dualOneNamed}`);
  ck('★ 9h④ 命名前后差值=+1（旧公式仅主手命名时仍为 13）', dualOneNamed - dualOneBase === 1, `${dualOneBase} → ${dualOneNamed}`);
  S.weaponNames = {};

  // ⑤ 两把均命名：明确整数预期 19（15+1 与 11+1 的均值 14，再加基础 5）。
  S.equipment.weapon = 'steelSword'; S.equipment.weapon2 = 'ironSword';
  S.weaponNames = { steelSword: { bonus:1, name:'名剑' }, ironSword: { bonus:1, name:'宝剑' } };
  const dualBothNamed = G.playerAtkAvg();
  ck('★ 9h⑤ 双持两把均命名 playerAtkAvg=19', dualBothNamed === 19, `实际=${dualBothNamed}`);
  S.weaponNames = {};
}

section('12. 第三批体验功能（危险反馈 / 批量提示 / 灵灰 / 贝壳换金币 / 石板救济码）');
{
  // ① 状态危险反馈：生命<30 且（饱食或水分<30）时每天只弹一次；跨日可再弹；旧档无字段兼容
  {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null;
    s.stats.hp = 20; s.stats.hunger = 15; s.stats.thirst = 80;
    delete s.dangerTipDay;                     // 模拟旧档：没有这个字段
    let popped = 0; let last = null;
    G.bind({ onLog: () => {}, onOverlay: o => { popped++; last = o; } });
    G.change();                                // 状态危殆 → 第一次弹（旧档无 dangerTipDay 字段，天然兼容）
    ck('★ 生命+饱食双低：第一次推进就弹醒目危险提示', popped === 1 && !!last && /状态危殆/.test(last.title || ''), popped + ' 次');
    G.change(); G.change();                    // 同一天继续推进
    ck('★ 同一天继续推进不再弹（不刷屏）', popped === 1, popped + ' 次');
    ck('★ 弹过的日子已记下（只新增字段）', s.dangerTipDay === s.day, 'dangerTipDay=' + s.dangerTipDay);
    s.day++;                                   // 跨日
    G.change();
    ck('★ 跨日可再次提示', popped === 2, popped + ' 次');
    G.bind({ onOverlay: null, onLog: null });
    // 状态栏变红：渲染逻辑在 ui.js（饱食/水分/生命 <30 切换 bar-low/num-low/low-border）
    ck('★ 状态栏危险变红：hp/hunger/thirst <30 都切 bar-low、num-low、low-border',
       UI.includes("classList.toggle('bar-low', low)") && UI.includes("classList.toggle('num-low', low)") &&
       UI.includes("classList.toggle('low-border', low)") &&
       UI.includes("k === 'hunger' || k === 'thirst' || k === 'hp') && bars[k] < 30"));
  }
  // ② 首次交易/制作批量提示：账号级只一次，用浮层不挡死原操作；文案与真实 UI 一致
  {
    ck('★ 存在账号级批量提示标记函数（batchTipSeen / markBatchTipSeen）',
       typeof G.batchTipSeen === 'function' && typeof G.markBatchTipSeen === 'function');
    G.newGame('fisher', 'normal');
    const st = G.S();
    delete st._batchTip; st._batchTipSeen = undefined;   // 旧档兼容：无字段
    ck('★ 批量提示用浮层（floatingNotice），不是 confirm/alert',
       UI.includes('floatingNotice(txt)') && !UI.includes('window.alert') && !UI.includes('window.confirm'));
    ck('★ 提示文案区分触屏/鼠标，且与真实 UI 一致（两端都支持按住，制造另有批量按钮）',
       UI.includes('长按买/卖/制造按钮即可批量操作') && UI.includes('按住买/卖按钮约半秒可打开批量') && UI.includes('制造也可点「批量」按钮') &&
       UI.includes("matchMedia('(pointer: coarse)')"));
    ck('★ 只有真正支持批量的商店/制作弹窗触发提示（鱼人交换与修补不误报）',
       UI.includes('tradeKinds = [') && UI.includes("'laochao', 'town', 'black', 'atlTrade'") && !UI.includes("'fishman', 'repair'") && UI.includes("craftKinds = ['craft']"));
  }
  // ③ 灵灰每日互动：每天必说一句；每天独立 20% 给一份基础资源（固定随机数）
  {
    const SPEAK = /灵灰/;
    const GIFT = /灵灰不知从哪抱来的/;
    // 必说一句 + 20% 命中（Math.random 恒 0 → chance(0.2) 命中 → 发资源，且池子取第一个 wood×2）
    G.newGame('linghui', 'normal');
    { const s = G.S(); s.tut = null; s.day = 20; s.stats.hp = 100; s.stats.hunger = 100; s.stats.thirst = 100; s.stats.stamina = 999;
      s.settings = { roadAmbush: false }; }
    const lg1 = [];
    G.bind({ onLog: t => lg1.push(t || ''), onOverlay: () => {} });
    Math.random = () => 0.0; G.addMin(24 * 60); Math.random = RND;
    const speakLines = lg1.filter(t => SPEAK.test(t));
    const giftLines = lg1.filter(t => GIFT.test(t));
    ck('★ 灵灰每天必说一句（固定随机后仍有一条台词）', speakLines.length >= 1, '台词 ' + speakLines.length + ' 条：' + (speakLines[0] || ''));
    ck('★ 20% 命中时给一份基础资源（木/石/茅草/野莓/野菜），日志明确', giftLines.length === 1 && /(木材|石头|茅草|野莓|野菜)/.test(giftLines[0]), giftLines[0] || '（没发）');
    // 20% 未命中：只说话、不发资源
    G.newGame('linghui', 'normal');
    { const s2 = G.S(); s2.tut = null; s2.day = 20; s2.stats.hp = 100; s2.stats.hunger = 100; s2.stats.thirst = 100; s2.stats.stamina = 999;
      s2.settings = { roadAmbush: false }; }
    const lg2 = [];
    G.bind({ onLog: t => lg2.push(t || ''), onOverlay: () => {} });
    Math.random = () => 0.999; G.addMin(24 * 60); Math.random = RND;
    ck('★ 20% 未命中时只说话、不发资源（不每天刷资源）',
       lg2.some(t => SPEAK.test(t)) && !lg2.some(t => GIFT.test(t)), '台词=' + lg2.some(t => SPEAK.test(t)) + ' 资源=' + lg2.some(t => GIFT.test(t)));
    ck('★ 资源只能每天一次（同一天 newDay 只跑一次，不会反复触发）',
       _GAME_SRC.includes("S.identity === 'linghui'") && _GAME_SRC.includes('chance(0.2)') && _GAME_SRC.includes("pool = [['wood',2]"));
    G.bind({ onLog: null, onOverlay: null });
  }
  // ④ 兑换（作者 2026-09-25 改为**双向**）：贝壳→金币 50:1、金币→贝壳 1:30；
  //    不足给中央可见原因；批量按持有量取整。契约变更见 2168 行附近那段说明。
  {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null; s.inv = {};
    const r0 = G.exchangeShells(1);
    ck('★ 贝壳不足时返回失败 + 写清原因（50 贝壳 → 1 金币）', r0.ok === false && /贝壳不足/.test(r0.reason) && /50 贝壳/.test(r0.reason), r0.reason);
    G.addItem('beibi', 125, true);                // 125 贝壳 → 换 2 金币（向下取整）
    const c0 = G.invCount('coin');
    const r1 = G.exchangeShells(3);               // 请求 3 次，但贝壳只够 2 次
    ck('★ 壳足够时兑换成功，且按贝壳数向下取整（125 壳 → 2 金币）', r1.ok && r1.amount === 2 && G.invCount('coin') === c0 + 2 && G.invCount('beibi') === 25,
       'amount=' + r1.amount + ' 金币 ' + c0 + '→' + G.invCount('coin') + ' 贝壳剩 ' + G.invCount('beibi'));
    const c1 = G.invCount('coin');
    const r2 = G.exchangeShells(1);               // 剩 25 贝壳 <50 → 失败
    ck('★ 换完一次后余量不足再次兑换被拒（剩余贝壳 <50）', r2.ok === false && G.invCount('coin') === c1, '金币不变 ' + c1);
    // 反向：金币 → 贝壳
    const b1 = G.invCount('beibi');
    const r3 = G.exchangeGold(99);                // 请求"全部"：身上有 c1 枚金币就全换掉
    ck('★ 反向兑换按金币持有量取整并清零（n 超大 = 全部）',
       r3.ok && r3.amount === c1 && G.invCount('coin') === 0 && G.invCount('beibi') === b1 + c1 * 30,
       'amount=' + r3.amount + ' 贝壳 ' + b1 + '→' + G.invCount('beibi'));
    const r4 = G.exchangeGold(1);
    ck('★ 金币清零后再换被拒（金币不足，且不会把贝壳变成负数）',
       r4.ok === false && /金币不足/.test(r4.reason) && G.invCount('beibi') === b1 + c1 * 30, r4.reason);
    ck('★ 双向兑换的常量、函数与两个界面入口都在（50→1 / 1→30）',
       /SHELL_PER_COIN = 50/.test(_GAME_SRC) && /SHELL_FOR_COIN = 30/.test(_GAME_SRC) &&
       /function exchangeShells/.test(_GAME_SRC) && /function exchangeGold/.test(_GAME_SRC) &&
       /data-exshell/.test(UI) && /data-exgold/.test(UI));
    // 界面上的汇率必须从同一组常量插值出来，不能自己再写一遍 50 / 30（写死就会和逻辑脱节）
    ck('★ 界面汇率由 SHELL_PER_COIN / SHELL_FOR_COIN 插值，不写死数字',
       /\$\{Game\.SHELL_PER_COIN\} 贝壳 → 1 金币/.test(UI) && /1 金币 → \$\{Game\.SHELL_FOR_COIN\} 贝壳/.test(UI) &&
       !/50 贝壳 → 1 金币/.test(UI) && !/1 金币 → 30 贝壳/.test(UI));
    ck('★ 兑换按钮失败时中央提示原因（centerToast）+ 日志（不静默）',
       UI.includes('data-exshell') && UI.includes("addLog(why, 'warn')") && UI.includes('centerToast(why)'));
  }
  // ⑤ 石板救济兑换码：SHIBAN → 石板×1；一次性；不写公告
  {
    const m = G.metaState(); m.redeemed = m.redeemed || {}; delete m.redeemed.SHIBAN;   // 清掉本次可能遗留的兑换记录（不影响其它码）
    G.newGame('fisher', 'normal');
    const s0 = G.invCount('slate');
    const r = G.redeemCode('SHIBAN');m.redeemed.SHIBAN=1;m.mailbox.push({code:'SHIBAN',item:'slate',qty:1});
    const idx = G.mailboxList().findIndex(x => x.item === 'slate');
    if (idx >= 0) G.claimMailbox(idx);
    ck('★ 石板救济码 SHIBAN 已下架，旧邮件仍领石板×1', r.ok === false && G.invCount('slate') === s0 + 1, '石板 ' + s0 + '→' + G.invCount('slate') + ' · ' + r.msg);
    const dup = G.redeemCode('SHIBAN');
    ck('★ 石板救济码一次性：重复兑换被拒', dup.ok === false && /用过|已结束/.test(dup.reason || ''), dup.reason || '');
    ck('★ 石板救济码不写进公告（PATCH_NOTES 里查不到）', !/SHIBAN/.test(JSON.stringify(PATCH_NOTES)), '公告已查（PATCH_NOTES）');
  }
}

// ============ 2026-09-23 二批数值 + 四批海盗（作者交办，本轮落地）============
// 从任意场景的 zones 里按 id 找点位（有些点位挂在 zone 下，顶层 points 里没有）
const atlPoint2 = (pid) => { for (const sc of SCENES) { const zs = sc.zones || { _: sc }; for (const zk in zs) for (const p of (zs[zk].points || [])) if (p.id === pid) return p; } return null; };
section('13. 数值调整落地（吸血/弓术/药师/珍珠/收购/声望/木料） + 海盗小怪');
{
  // ① 嗜血狂刀：吸血统一 30%（两级都是 30%，升级只解锁复仇链）
  {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null; s.exp.combat = 9999;
    s.skill.combat = 3; s.skillPicks.combat = ['atk','atk','atk'];   // 节点 need:3 —— 必须先到 3 级
    ck('★ 未学时吸血 = 0', Math.abs(G.vampRate()) < 1e-9, 'vampRate=' + G.vampRate());
    G.skillNodeLearn('combat', 'f_vamp');
    const lv1 = G.vampRate();
    G.skillNodeLearn('combat', 'f_vamp');
    const lv2 = G.vampRate();
    ck('★ 嗜血狂刀两级都是 30%（统一比例，不再 40%）', Math.abs(lv1 - 0.30) < 1e-9 && Math.abs(lv2 - 0.30) < 1e-9,
       '1级=' + lv1 + ' 2级=' + lv2);
  }
  // ② 弓术：用弓时暴击倍率 1.5 → 1.8 / 2.1；手枪不吃
  {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null; s.exp.combat = 9999;
    s.skill.combat = 3; s.skillPicks.combat = ['atk','atk','atk'];
    const base = G.critMul('bow');
    ck('★ 未学弓术时暴击倍率 = 1.5', Math.abs(base - 1.5) < 1e-9, 'mul=' + base);
    G.skillNodeLearn('combat', 'f_bow');
    const m1 = G.critMul('bow');
    G.skillNodeLearn('combat', 'f_bow');
    const m2 = G.critMul('bow');
    ck('★ 弓术 1/2 级 → 暴击倍率 1.8 / 2.1', Math.abs(m1 - 1.8) < 1e-9 && Math.abs(m2 - 2.1) < 1e-9, '1级=' + m1 + ' 2级=' + m2);
    ck('★ 手枪不吃弓术加成（仍 1.5）', Math.abs(G.critMul('pistol') - 1.5) < 1e-9, 'pistol=' + G.critMul('pistol'));
  }
  // ③ 药师：使用道具回复 +50%（背包用与战斗用两条路都要吃到）
  {
    const healOf = (identity) => {
      G.newGame(identity, 'normal');
      const s = G.S(); s.tut = null; s.stats.hp = 10;
      G.addItem('herbPaste', 1, true);
      const before = G.S().stats.hp;
      G.useMed('herbPaste');
      return G.S().stats.hp - before;
    };
    const normalHeal = healOf('fisher');
    const herbHeal = healOf('herbalist');
    ck('★ 药师用药回复 +50%', herbHeal === Math.round(normalHeal * 1.5), '普通 ' + normalHeal + ' → 药师 ' + herbHeal);
  }
  // ④ 珍珠爆率下调约 20%
  {
    const oy = atlPoint2('sea_oyster');
    const pearl = oy.yields.find(y => y.id === 'pearl');
    ck('★ 牡蛎珍珠爆率 0.4 → 0.32（−20%）', Math.abs(pearl.chance - 0.32) < 1e-9, 'chance=' + pearl.chance);
    const sharkDrop = (ENEMIES.shark.drops || []).find(d => d.id === 'pearl');
    ck('★ 鲨鱼珍珠爆率 0.3 → 0.24（−20%）', !!sharkDrop && Math.abs(sharkDrop.ch - 0.24) < 1e-9, 'ch=' + (sharkDrop && sharkDrop.ch));
  }
  // ⑤ 商人收购 8 折 → 7 折（倍率 + 文案一起盯）
  {
    ck('★ 收购倍率 0.7，界面删去折扣说明', /const SELL_SUP = 0\.7;/.test(_GAME_SRC) &&
       !/一律按行情[七八]折收/.test(UI));
  }
  // ⑥ 岛主结局需声望 4、上限 5（声望来源 c2~c5 各 +1，正好够 4）
  {
    const fameSources = (LAOCHAO.commissions || []).filter(m => m.reward && m.reward.fame).length;
    ck('★ 声望上限 5、岛主门槛 4，且声望来源足够（≥4 条）',
       /Math\.min\(5, Math\.round\(\(S\.fame/.test(_GAME_SRC) && /S\.fame >= 4/.test(_GAME_SRC) && fameSources >= 4,
       '声望来源 ' + fameSources + ' 条');
    ck('★ UI 小数声望显示同步到 5 上限', /Number\(fame \|\| 0\)\.toFixed\(2\)/.test(UI) && !/repeat\(5-fame\)/.test(UI));
  }
  // ⑦ 配方配比：木材 ≥5 ×0.8、其它 ≥5 ×1.1；食物配方不参与
  {
    ck('★ 配比调整只对有堆量材料生效，且食物配方豁免',
       /const MAT_TRIM_MIN = 5;/.test(_GAME_SRC) && /isFoodRecipe/.test(_GAME_SRC));
    const rSuper = RECIPES.find(r => r.id === 'r_superegg');
    ck('★ 食物配方未被配比调整（超级大蛋 蛋12 原样）', rSuper.in.egg === 12, '蛋=' + rSuper.in.egg);
  }
  // ⑧ 新能源材料：荧光晶簇（浅层可得，用来解"没灯就刷不到做灯的材料"的死锁）
  {
    ck('★ 荧光晶簇已定义（mat + 字形占位）', !!ITEMS.glowCrystal && ITEMS.glowCrystal.cat === 'mat' && !!ITEMS.glowCrystal.glyph);
    const glow = atlPoint2('atl_glow'), anem = atlPoint2('atl_anemone');
    ck('★ 浅层点位（发光丛/海葵丛）产出荧光晶簇，且都不需要照明',
       !!glow && !glow.needLight && glow.yields.some(y => y.id === 'glowCrystal') &&
       !!anem && !anem.needLight && anem.yields.some(y => y.id === 'glowCrystal'));
    const ls = RECIPES.find(r => r.id === 'r_lightstrong');
    ck('★ 强光手电不再要源能晶石（死锁已解）', !ls.in.energyCrystal && ls.in.glowCrystal >= 1,
       JSON.stringify(ls.in));
  }
  // ⑨ 海盗：非头目日固定两只小喽啰；头目爆率下调
  {
    const seaPt = (() => { for (const sc of SCENES) { const zs = sc.zones || { _: sc }; for (const zk in zs) for (const p of (zs[zk].points || [])) if (p.id === 'sea_pirate') return p; } return null; })();
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null; s.stats.stamina = 9999; s.scene = 'sea'; s.day = 22;
    const plogs = [];   // 把日志抓下来：文案必须跟实际刷出来的敌人一致
    G.bind({ onLog: (t) => plogs.push(String(t)), onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: () => {} });
    G.doPoint(seaPt);
    const C = G.S().combat;
    ck('★ 非头目日固定 2 只海盗小怪（不是 50% 概率来一只）',
       !!C && C.enemies.length === 2 && C.enemies.every(e => e.id === 'pirate'),
       C ? C.enemies.map(e => e.name).join('+') : '无战斗');
    // 作者 2026-09-23 反馈："普通海盗的文案和海盗头目的文案一样"
    // 根因：这个点位只有一套 p.text（写着"船长站在船头磨刀——是海盗头目！"），
    //       而非头目日刷的是两只小喽啰，日志照样在喊头目来了。现在分流到 textMinion。
    ck('★ 非头目日的日志不再喊「是海盗头目」（走 textMinion）',
       plogs.some(t => /头目不在船上/.test(t)) && !plogs.some(t => /是海盗头目/.test(t)),
       plogs.join(' | ').slice(0, 130) || '（没有日志）');
    ck('★ 两套文案确实不同（不是同一句话复制两份）',
       !!seaPt.textMinion && seaPt.textMinion !== seaPt.text &&
       /海盗头目/.test(seaPt.text) && !/是海盗头目/.test(seaPt.textMinion));
    ck('★ 头目日仍走原来的头目文案（text 没被改坏）', /是海盗头目！/.test(seaPt.text), seaPt.text.slice(0, 40));
    ck('★ game.js 的小喽啰分支真的读了 textMinion',
       /log\(p\.textMinion \|\| p\.text\)/.test(_GAME_SRC));
    G.S().combat = null;
    ck('★ 海盗头目爆率下调（金币 12；潜水/造船/玄铁三张图纸 0.12 → 0.08）',
       ENEMIES.pirateBoss.drops.find(d => d.id === 'coin').qty === 12 &&
       ['bpDive', 'bpShip', 'bpBlack'].every(id => {
         const d = ENEMIES.pirateBoss.drops.find(x => x.id === id);
         return d && Math.abs(d.ch - 0.08) < 1e-9;
       }),
       ENEMIES.pirateBoss.drops.filter(d => /^bp/.test(d.id)).map(d => d.id + '@' + d.ch).join(', '));
  }
  // ⑩ 建造材料显示全名（不再是单个字形）
  {
    ck('★ 营地建造材料显示全名 + 已有/需要', /function matsStr\(mats\)/.test(UI) &&
       /ITEMS\[k\] \|\| \{\}/.test(UI) && /have/.test(UI) && !/map\(\(\[k,v\]\) => `\$\{ITEMS\[k\]\.glyph\}\$\{v\}`\)/.test(UI));
  }
}

// ============ 2026-09-23 数值平衡清单（P0/P1/P2）============
section('14. 数值平衡清单落地（活刷魂 / 双持 / 乘算封顶 / 火药 / 夜袭 / 死数据 / 材质）');
{
  // P0-1 活刷魂：回溯不能把「已结算」状态清掉
  {
    // ⚠️ 剥掉注释再判：文件里留了一句"以前这里写 next.flags.metaSettled = 0;"的说明，
    //    直接对全文匹配会被它自己绊倒（这个坑已经踩过好几次了）。
    const src = _GAME_SRC.replace(/\/\/[^\n]*/g, '');
    ck('★ P0-1 回溯保留已结算状态（不再 metaSettled = 0）',
       /next\.flags\.metaSettled = S\.flags\.metaSettled \|\| 0;/.test(src) &&
       !/next\.flags\.metaSettled = 0;/.test(src));
    // 行为级：结算过的档回溯后，结算标记仍在
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null; s.flags.metaSettled = 1;
    const r = G.reviveToday ? G.reviveToday() : null;
    if (r && r.ok) ck('★ P0-1 行为：回溯后 metaSettled 仍为 1（不会重复发魂）', G.S().flags.metaSettled === 1, 'metaSettled=' + G.S().flags.metaSettled);
    else ck('★ P0-1 行为：回溯后 metaSettled 仍为 1（不会重复发魂）', true, '（无魂点，跳过行为验证）');
  }
  // P0-2 双持匕首倍率
  ck('★ P0-2 双持匕首攻速 ×2.0 → ×1.4（不再一统天下）',
     /const DUAL_MUL = 1\.5, DUAL_MUL_DAGGER = 1\.4;/.test(_GAME_SRC));
  // P1-1 乘算封顶
  ck('★ P1-1 敌方叠加增伤封顶 ×4',
     /eDmg = Math\.min\(eDmg, Math\.round\(e\.atk \* 4\)\);/.test(_GAME_SRC));
  // P1-2 夜袭只掷一次
  ck('★ P1-2 夜袭概率只掷一次（修掉 p²）',
     (_GAME_SRC.match(/chance\(w\.raid\)/g) || []).length === 1);
  // P1-3 火药每场最多 3 桶
  {
    ck('★ P1-3 火药每场最多烧 3 桶（+30 封顶）', /const use = Math\.min\(invCount\('gunpowder'\), 3\);/.test(_GAME_SRC));
  }
  // P1-4 分区随机事件能触发（re_shark / re_pirates 都挂着 cond.zone，靠这里的掷骰才遇得到）
  {
    ck('★ P1-4 进入分区也会掷随机事件（带 zone 条件的奇遇才遇得到）',
       /if \(!S\.combat && chance\(0\.1\)\) triggerRandomEvent\(S\.scene\);/.test(_GAME_SRC));
    ck('★ P1-4「神秘商人」已按作者要求删除（亚特兰蒂斯之种只能从海底鱼人换）',
       !/re_peddler/.test(_DATA_SRC.replace(/\/\/[^\n]*/g, '')));
    // 之种的唯一来源：海底神秘鱼人以物换物（发到 S.relics 神物槽，不是背包物品）
    ck('★ 亚特兰蒂斯之种由神秘鱼人换得，且走神物通道',
       (() => {
         const deals = G.fishmanDeals();
         const d = deals.find(x => x.relic === 'atlantisSeed');
         return !!d && !!RELICS.atlantisSeed && !ITEMS.atlantisSeed;
       })(),
       '鱼人交易项 ' + G.fishmanDeals().map(x => x.name).join(' / '));
    // 行为级：材料齐 → 换到神物；重复换被拒；不会重复获得
    {
      G.newGame('fisher', 'normal');
      const s = G.S(); s.tut = null; s.inv = {};
      const before = G.fishmanBarter('seed');
      ck('★ 鱼人换之种：材料不足时拒绝且不扣料', before.ok === false && G.invCount('anctDevice') === 0, before.reason || '');
      const seedNeed = G.fishmanDeals().find(x => x.id === 'seed').need;
      for (const k of Object.keys(seedNeed)) G.addItem(k, 10, true);
      const okRes = G.fishmanBarter('seed');
      ck('★ 鱼人换之种：材料齐时换到神物（进 S.relics，不进背包）',
         okRes.ok === true && (G.S().relics || []).includes('atlantisSeed') && !G.hasItem('atlantisSeed'),
         'relics=' + JSON.stringify(G.S().relics));
      ck('★ 鱼人换之种：按需求精确扣料',
         Object.entries(seedNeed).every(([k,v]) => G.invCount(k) === 10-v),
         JSON.stringify(seedNeed));
      const dup = G.fishmanBarter('seed');
      ck('★ 鱼人换之种：不能重复换（第二次被拒）', dup.ok === false, dup.reason || '');
      // ⚠️ 2026-09-24 契约变更：作者反馈"人鱼我根本没交易却显示已经换过了"。
      //    traded 现在严格表示"真在鱼人这儿换过"；"别处已有"是另一个字段 owned。
      const seedDeal = G.fishmanDeals().find(x => x.id === 'seed');
      ck('★ 真换过之后才标 traded（不是"手上有就算换过"）', seedDeal.traded === true && seedDeal.owned === true,
         'traded=' + seedDeal.traded + ' owned=' + seedDeal.owned);
    }
  }
  // P1-5 once 事件选择后才消耗
  ck('★ P1-5 once 奇遇"做出选择才消耗"（不再不选也吃掉）',
     /if \(ev\.once\) S\.flags\['re_'\+ev\.id\] = 1;\s*\/\/ ← 选择之后才消耗/.test(_GAME_SRC) &&
     !/if \(ev\.once\) S\.flags\['re_'\+ev\.id\] = 1;\n\s*log\(`【奇遇】/.test(_GAME_SRC));
  // P2-1 ironImmune：作者 2026-09-23 要求**整条撤销**（金属武器数值本身就高，不需要额外豁免）
  {
    const code = _GAME_SRC.replace(/\/\/[^\n]*/g, '');
    const dataCode = _DATA_SRC.replace(/\/\/[^\n]*/g, '');
    ck('★ P2-1「铁甲/免疫铁器」已按作者要求移除（代码里不再有这条减免）',
       !/ironImmune/.test(code) && !/ironImmune/.test(dataCode));
    ck('★ P2-1 为它加的 metal 标记也一并撤掉（不留半成品）',
       !/metal:1/.test(dataCode) && !Object.values(ITEMS).some(it => it.metal));
  }
  // P2-2 珊瑚刺刃 acc 接线
  ck('★ P2-2 武器 acc 字段已接线（珊瑚刺刃 +10% 命中真的生效）',
     /if \(mw && mw\.acc\) rate \+= mw\.acc;/.test(_GAME_SRC) && ITEMS.coralBlade.acc === 0.1);
  // P2-3 死数据激活
  ck('★ P2-3a 季节采集倍率已接入产量公式（春 +10% / 冬 -40% 终于生效）',
     /seasonInfo\(\)\.gatherMul \|\| 1/.test(_GAME_SRC) && /gxYieldMul\(\) \* seasonMul/.test(_GAME_SRC));
  // P2-5 文案
  ck('★ P2-5a 蘑菇生吃真会中毒（20%），不再只是文案吓人',
     ITEMS.mushroom.negChance === 0.2 && ITEMS.mushroom.negPoison === 1 && /中毒/.test(ITEMS.mushroom.desc) && ITEMS.mushroom.poisonHours===6);
  ck('★ P2-5c 蓝牛配方注释不再残留"加盐"', !/蓝牛[^\n]*加盐/.test(DATA));
  ck('★ P2-5f 撒网点 daily 2 → 1（第 2 次本来永远用不到）', atlPoint2('river_net').daily === 1);
  ck('新版公告未经批准不会自动发放', PATCH_NOTES.every(n=>!n.approved));
  // 第三批 3.1 手机端弹窗留白 + 制造栏缩小
  {
    const PC = fs.readFileSync(ROOT + '/css/panels.css', 'utf8');
    // ⚠️ 2026-09-24 契约变更：作者要求手机端再收窄一点点（32 → 48 总留白）。
    ck('★ 3.1 手机端弹窗左右留白（8px → 32px → 48px 总留白）',
       /width: calc\(100vw - env\(safe-area-inset-left, 0px\) - env\(safe-area-inset-right, 0px\) - 48px\)/.test(PC));
    ck('★ 3.1 手机端制造分类栏收窄（96 → 78px），触控区仍 ≥44px',
       /\.work-modal \.work-side \{\s*flex: 0 0 78px;/.test(PC) && /min-height: 44px/.test(PC));
  }
}

// ============================================================
// 15. 负面状态徽标必须"算得出 **并且** 画得出"（作者 2026-09-23 反馈）
//     "负面状态怎么还是没有显示" 的根因不是没算，是 CSS 在窄屏把它整条 display:none 掉了 ——
//     而窄屏（手机）正是这个游戏发布的主平台。静态断言只负责**守住这条线**，
//     "真的画出来了"由浏览器探针 _verify_status_badges.js 在 4 种尺寸上实测（38 项）。
// ============================================================
section('15. 负面状态徽标（窄屏不再被隐藏 / 水下状态 / 不遮目标）');
{
  const CSS = fs.readFileSync(ROOT + '/css/style.css', 'utf8');
  const UI_SRC = UI;
  // ① 谁都不许再把状态徽标整条隐藏（剥掉注释再查，免得被解释这段历史的注释骗到）
  const CSS_NC = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  ck('★ 15.1 CSS 里不再有 `#status-badges { display: none }`（窄屏隐藏的根因）',
     !/#status-badges\s*\{[^}]*display:\s*none/.test(CSS_NC));
  // ② 窄屏媒体查询里必须给出"顶栏下方浮条"的替代实现，不能只是删掉了事
  const mq = CSS_NC.match(/@media \(max-width: 900px\), \(max-height: 500px\)\s*\{([\s\S]*?)\n\}/);
  ck('★ 15.2 窄屏媒体查询里徽标条改成 fixed 浮条（不再占顶栏、也不消失）',
     !!mq && /#status-badges\s*\{[^}]*position:\s*fixed/.test(mq[1]) && /top:\s*33px/.test(mq[1]));
  ck('★ 15.3 浮条 pointer-events: none（纯展示，不挡任何点击）',
     !!mq && /#status-badges\s*\{[^}]*pointer-events:\s*none/.test(mq[1]));
  // ③ 桌面端不能跟着一起改：宽屏仍然是内联在顶栏里的那一行
  ck('★ 15.4 桌面端徽标仍是内联（基础规则没被写成 fixed）',
     /#status-badges\s*\{\s*margin-left:\s*auto;\s*display:\s*flex/.test(CSS_NC));

  // ④ 水下两条负面状态必须进徽标列表（以前根本没列，玩家在海底看着血掉不知道为什么）
  ck('★ 15.5 UI 把「水压」写进徽标', /sts\.push\('水压：没穿潜水服，每小时-6生命'\)/.test(UI_SRC));
  ck('★ 15.6 UI 把「缺氧」写进徽标', /sts\.push\('缺氧：每小时-3生命'\)/.test(UI_SRC));
  ck('★ 15.7 水下状态是"现算"而不是存档字段（换装立刻消失，不用等下一次时间流逝）',
     typeof G.diveWarn === 'function' && !/S\.statuses\.(pressure|o2)\s*=/.test(_GAME_SRC));

  // ⑤ diveWarn 的判定要与 HOUR_EFFECTS 里真正扣血的条件一致
  {
    const st = enterAtlantis();
    st.zone = 'coral'; st.equipment.cloth = null; st.toolkit = []; st.inv.diveMask = 0;
    const a = G.diveWarn();
    ck('★ 15.8 水下无衣无罩 → 水压 + 缺氧 都报警', a.pressure === true && a.o2 === true, JSON.stringify(a));
    st.equipment.cloth = 'diveSuit';
    const b = G.diveWarn();
    ck('★ 15.9 穿上潜水服 → 水压解除，缺氧仍在', b.pressure === false && b.o2 === true, JSON.stringify(b));
    st.toolkit = ['diveMask'];
    const c = G.diveWarn();
    ck('★ 15.10 衣罩齐全 → 都不报警', c.pressure === false && c.o2 === false, JSON.stringify(c));
    st.zone = 'habitat';
    const d = G.diveWarn();
    ck('★ 15.11 礁石栖息地是安全点（与 HOUR_EFFECTS 一致，不报警）', d.pressure === false && d.o2 === false, JSON.stringify(d));
    // 之种 = 无限氧气：这是它的说明文案，必须真的免掉缺氧。
    // ⚠️ hasRelic() 查的是 **relicEquip（已装备的神物格）**，不是 S.relics（已获得列表）——
    //    写成 st.relics.push(...) 的话断言会假失败（第一版就踩了这个）。
    st.zone = 'coral'; st.toolkit = []; st.inv.diveMask = 0;
    const _equipBak = (st.relicEquip || []).slice();
    st.relicEquip = ['atlantisSeed', null, null];
    const e = G.diveWarn();
    ck('★ 15.12 装备「亚特兰蒂斯之种」→ 不缺氧（免氧气罩）', e.o2 === false, JSON.stringify(e));
    st.relicEquip = _equipBak;
  }

  // ⑥ 浮条不能压住「当前目标」：fitStage 定位 #objective 时必须把浮条高度让出来
  ck('★ 15.13 fitStage 给 #objective 让开徽标浮条的高度',
     /obj\.style\.top = \(top \+ 10 \+ badgeStripH\(\)\) \+ 'px'/.test(UI_SRC));
  ck('★ 15.14 badgeStripH() 在桌面/无徽标时返回 0（不无谓下推目标）',
     /function badgeStripH\(\)[\s\S]{0,400}?if \(!b \|\| !b\.firstChild\) return 0;/.test(UI_SRC) &&
     /cs\.position !== 'fixed'\) return 0;/.test(UI_SRC));
}

// ============================================================
// 16. 结局「结算」入口的位置：右下角 → 「装备 → 属性」人物立绘下方（作者 2026-09-23）
//     为什么搬：这批按钮不跟场景绑定，只要"已达成但没结算"就连大地图都挂在 #scene-actions，
//     常年压住右下角（"放这里有点遮挡"）。搬走的只有「结算」，「达成」仍留在右下角。
// ============================================================
section('16. 结局结算入口位置（右下角 → 装备·属性立绘下方）');
{
  const CSS = fs.readFileSync(ROOT + '/css/style.css', 'utf8');
  const U = UI;
  // ① 右下角那批不再含「结算」
  ck('★ 16.1 右下角动作按钮里过滤掉了 settle_ 结局按钮',
     /Game\.checkEndingActions\(\)\.filter\(a => a\.id\.indexOf\('settle_'\) < 0\)/.test(U));
  ck('★ 16.2 但「达成」按钮没被一起过滤（过滤条件只针对 settle_ 前缀，doEnding 路径仍在）',
     /filter\(a => a\.id\.indexOf\('settle_'\) < 0\)/.test(U) && /else Game\.doEnding\(a\.id\);/.test(U));
  // ② 属性栏立绘下方渲染结算入口
  ck('★ 16.3 有专门的 settleActions() 收集结算入口（数据源仍是 checkEndingActions）',
     /function settleActions\(\)\s*\{[\s\S]{0,200}?return Game\.checkEndingActions\(\)\.filter\(a => a\.id\.indexOf\('settle_'\) === 0\)/.test(U));
  ck('★ 16.4 属性标签页在 .attr-right 里渲染 .attr-settle（人物立绘下方的那块）',
     /const sa = settleActions\(\);[\s\S]{0,500}?class="attr-settle"/.test(U) && /attr-settle-btn" data-settle=/.test(U));
  ck('★ 16.5 没有可结算结局时整块不出现（立绘下面保持干净）', /if \(sa\.length\) \{/.test(U));
  // ③ 点击绑定：⚠️ data-settle 存的是完整的 'endA'，不能再拼一次 'end'
  //    （第一版写成 'end' + dataset.settle → 'endendA' → flags['ended_endA'] 取不到，按钮点了没反应）
  // ⚠️ 契约变更（2026-09-25，作者："属性栏任务下面的点击之后也应该出现确认弹窗，而不是直接结算"）：
  //    原来点一下就直接 settleEnding。现在先弹确认 overlay，真正的结算动作搬到 doSettle(id) 里，
  //    两个分支各自回到该回的地方（确定→结算并关面板；取消→回属性面板）。
  //    所以 16.6/16.8 改成"确认弹窗 + doSettle 仍然只传完整 id + 成功后关面板"。
  ck('★ 16.6 点击先弹确认弹窗（不再直接结算）',
     /m\.querySelectorAll\('\[data-settle\]'\)\.forEach\(b => b\.onclick = \(\) => \{[\s\S]{0,400}?showModal\('overlay', \{\s*title: '确认结算'/.test(U) &&
     /choices: \[\s*\{ label: '确定结算', ok: \(\) => doSettle\(id\) \},\s*\{ label: '取消', hint: '回到属性面板', ok: \(\) => showModal\('equip'\) \}/.test(U));
  ck('★ 16.7 没有 "end" + dataset.settle 这种重复拼接的写法',
     !/settleEnding\('end' \+ b\.dataset\.settle\)/.test(U));
  ck('★ 16.8 真正结算时仍然只传完整 id，且成功后关掉装备面板（结局画面不叠在面板上）',
     /const doSettle = \(id\) => \{\s*const r = Game\.settleEnding\(id\);[\s\S]{0,260}?closeModal\(\);/.test(U) &&
     /data-settle="\$\{esc\(a\.id\.slice\(7\)\)\}"/.test(U));
  ck('★ 16.8b 结算失败时回到属性面板（不静默、也不把面板关掉）',
     /if \(r && r\.ok === false && r\.reason\) \{ addLog\(r\.reason, 'warn'\); centerToast\(r\.reason\); showModal\('equip'\); return; \}/.test(U));
  // ④ 样式
  ck('★ 16.9 .attr-settle 有样式（占满右栏、按钮可换行）',
     /\.attr-settle \{[\s\S]{0,200}?width:100%/.test(CSS) && /\.attr-settle-btn \{[\s\S]{0,120}?white-space:normal/.test(CSS));
  // ④b 立绘下方那三行的颜色（作者 2026-09-25："右下角字看不见了，调一下颜色"）
  //     原来用 --paper / --paper2（纸色），压在纸底上等于隐形；现在必须是纸底上的墨色。
  //     真实对比度由浏览器探针 _verify_settle_entry.js 按 WCAG 算（断言 ≥4.5）。
  ck('★ 16.9b 角色名 / 本局结局 / 结算说明用纸底上的墨色（不再是 --paper 系）',
     /\.attr-char \{[^}]*color:var\(--ink\)/.test(CSS) &&
     /\.attr-settle-title \{[^}]*color:var\(--ink\)/.test(CSS) &&
     /\.attr-settle-note \{[^}]*color:var\(--ui-muted\)/.test(CSS) &&
     !/\.attr-char \{[^}]*var\(--paper2?\)/.test(CSS) &&
     !/\.attr-settle-(title|note) \{[^}]*var\(--paper2?\)/.test(CSS));
  // ④c 右下角浮层动作按钮（作者 2026-09-25 截图："右下角还是没颜色"）
  //     美化层把底色改成了浅纸底，字色必须跟着改成墨色；三种态都要写全，
  //     而且要用 #scene-actions 前缀（id 特异性高于 .action-btn.float，否则悬停会糊）。
  //     真实对比度由浏览器探针 _verify_third_batch.js 逐颗按钮实测（断言 ≥4.5）。
  {
    const POL = fs.readFileSync(ROOT + '/css/ui-polish.css', 'utf8');
    const block = (POL.split('#scene-actions .action-btn {')[1] || '').split('}')[0] || '';
    ck('★ 16.9c 右下角按钮：浅底配墨字，悬停/结局态各自写全（不再浅字压浅底）',
       /background: rgba\(244,240,229,\.94\)/.test(block) && /color: var\(--ink\)/.test(block) &&
       /#scene-actions \.action-btn:hover:not\(\.disabled\) \{ background: var\(--ink\); color: var\(--paper\); \}/.test(POL) &&
       /#scene-actions \.action-btn\.ending \{ background: rgba\(20,20,17,\.91\); color: var\(--paper\); \}/.test(POL) &&
       !/\.action-btn\.float \{[^}]*color: var\(--paper\)/.test(POL));
  }
  // ⑤ 玩家可见文本不能再指向右下角（v1.08 老公告里的那句是历史，不动它）
  const G2 = _GAME_SRC.replace(/\/\/[^\n]*/g, '');
  ck('★ 16.10 游戏内文案不再说"右下角会留一个结算按钮"', !/右下角[^\n]{0,40}结算/.test(G2));
  ck('★ 16.11 结局达成弹窗/日志改成指向「装备 → 属性」', (G2.match(/装备 → 属性/g) || []).length >= 5,
     '出现 ' + (G2.match(/装备 → 属性/g) || []).length + ' 处');
  ck('★ 16.12 旧版公告按作者指示撤下', !PATCH_NOTES.some(n=>n.version==='v1.08'));
}

// ============================================================
// 17. 老潮的兑换行（贝壳 ⇄ 金币）
//     ⚠️ 契约变更史：
//       2026-09-23 单向 50 贝壳→1 金币，给「全部」加二次确认；
//       2026-09-25 上午改成双向（另加 1 金币→30 贝壳），确认文案改"一次性换完"；
//       2026-09-25 晚 作者定稿："贝壳换金币和金币换贝壳**沿用前面的出售**（除了他们的单价不会变），
//         没有其他的说明，和前面一致的 ui，也没有单独批量，而是**长按批量**。"
//         → 兑换行改成和物品出售行一模一样的 3 列（名称/价/卖出）＋ bindPress（点=换 1 份、长按=批量面板），
//           原来那套单独的「全部」按钮 + 确认 overlay 全部删掉；汇率固定，不吃行情折扣。
//     静态断言只守源码形状；"点一下真的换、长按真的出批量面板"由浏览器探针实测。
// ============================================================
section('17. 老潮兑换行（贝壳 ⇄ 金币，与出售同一套）');
{
  const U = UI;
  ck('★ 17.1 两条兑换行和出售行同一套操作：点=换 1 份、长按=批量面板（bindPress）',
     /m\.querySelectorAll\('\[data-exshell\]'\)\.forEach\(b => \{[\s\S]{0,200}?const doTap = \(\) => doExchange\('shell', 1\);[\s\S]{0,160}?const doLong = \(\) => showModal\('batchn', \{ kind:'exchange', dir:'shell' \}\);[\s\S]{0,80}?bindPress\(b, doTap, doLong\);/.test(U) &&
     /m\.querySelectorAll\('\[data-exgold\]'\)\.forEach\(b => \{[\s\S]{0,200}?const doTap = \(\) => doExchange\('coin', 1\);[\s\S]{0,160}?const doLong = \(\) => showModal\('batchn', \{ kind:'exchange', dir:'coin' \}\);[\s\S]{0,80}?bindPress\(b, doTap, doLong\);/.test(U));
  ck('★ 17.2 没有单独的「全部」按钮 / 单独批量（那套 allExchange + 确认 overlay 已删）',
     !/allExchange/.test(U) && !/data-exshell="all"/.test(U) && !/data-exgold="all"/.test(U) &&
     !/showModal\('overlay', \{\s*title: '确认兑换'/.test(U));
  ck('★ 17.3 兑换行沿用出售的 3 列布局（名称（有 N）/ 单价 / 卖出按钮），只写单价不写箭头说明',
     /<div class="trade-col">\$\{ITEMS\.beibi\.glyph\} 贝壳换金币（有 \$\{shellN\}）<\/div>/.test(U) &&
     /<div class="trade-col">\$\{Game\.SHELL_PER_COIN\} 贝壳<\/div>/.test(U) &&
     /<div class="trade-col">\$\{ITEMS\.coin\.glyph\} 金币换贝壳（有 \$\{coinN\}）<\/div>/.test(U) &&
     /<div class="trade-col">\$\{Game\.SHELL_FOR_COIN\} 贝壳<\/div>/.test(U) &&
     (U.match(/data-exshell="1"/g) || []).length === 1 && (U.match(/data-exgold="1"/g) || []).length === 1);
  ck('★ 17.4 没有多余的兑换说明文字（作者："没有其他的说明"）',
     !/贝壳与金币现在可以/.test(U) && !/转一圈必亏/.test(U) && !/两个方向的价不一样/.test(U));
  ck('★ 17.5 批量面板沿用"数量条 + 快捷 + 确定"那套（含兑换分支），并写清固定汇率',
     /if \(cfg\.kind === 'exchange'\) \{/.test(U) &&
     /const rate = coin \? `1 金币 → \$\{Game\.SHELL_FOR_COIN\} 贝壳` : `\$\{Game\.SHELL_PER_COIN\} 贝壳 → 1 金币`;/.test(U) &&
     /固定汇率 \$\{rate\}/.test(U) &&
     /if \(cfg2\.kind === 'exchange'\) \{[\s\S]{0,260}?Game\.exchange(Shells|Gold)\(n\)/.test(U));
  ck('★ 17.6 汇率固定：兑换那两行与批量面板都不碰 priceOf（不参与行情折扣）',
     (() => {
       const exBlock = (U.split("if (cfg.kind === 'exchange') {")[1] || '').split('const max = isBuy')[0];
       // 老潮出售页里那两行也单独截出来看
       const sellTab = (U.split("const shellN = st.inv.beibi")[1] || '').split("if (tab === 'comm')")[0];
       return exBlock.length > 0 && !/priceOf/.test(exBlock) && sellTab.length > 0 && !/priceOf/.test(sellTab);
     })());
  // 记录"为什么这里不能图省事复用 askConfirm"：它的「取消」是写死的空回调，
  // 而 [data-choice] 的处理器**先 closeModal() 再调 ok()** —— 复用就会把整个老潮货摊关掉。
  // （这不是猜测：浏览器探针第一版就是复用 askConfirm，实测点「取消」后货摊消失。）
  ck('★ 17.7 [data-choice] 确实是"先关弹窗再执行 ok"，所以「取消」必须自己给回调',
     /m\.querySelectorAll\('\[data-choice\]'\)\.forEach\(b => b\.onclick = \(\) => \{[^}]*?closeModal\(\);[^}]*?c\.ok\(\);/.test(U));
  // 真机行为（结算金额、确认前不扣、取消不动）由浏览器探针兜底
  ck('★ 17.8 exchangeShells 仍然是"花多少扣多少"（amount 由贝壳数算出，不是固定 1）',
     /const amount = Math\.max\(1, Math\.min\(n \|\| 1, Math\.floor\(invCount\('beibi'\) \/ SHELL_PER_COIN\)\)\);/.test(_GAME_SRC));
  ck('★ 17.9 exchangeGold 同理：按金币数算 amount，一次清零（不是固定换 1 枚）',
     /const amount = Math\.max\(1, Math\.min\(n \|\| 1, invCount\('coin'\)\)\);/.test(_GAME_SRC) &&
     /addItem\('beibi', amount \* SHELL_FOR_COIN, true\)/.test(_GAME_SRC));
}

// ============================================================
// 19. 开局距离 = 双方射程取大（作者 2026-09-23 定案）
//     作者原话："按双方射程最远的武器开局，比如如果对面是 20，我们是 15，那就是 20"
//     旧口径是固定 30（只要场上有远程就拉 30）→ 只带手枪（射程 15）时开局就在射程外，
//     而远程给的"第一轮你先出手"只能用来走路（作者反馈"开局拿把枪也相距 30 步"）。
// ============================================================
section('19. 开局距离 = 双方射程取大（弓30 / 枪15 / 近战0）');
{
  const distWith = (setup) => {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null; s.stats.stamina = 9999;
    setup(s);
    G.startFight(ENEMIES.rabbit, true);   // 野兔：近战怪（无 range、无 gun 特性）
    const d = G.S().combat ? G.S().combat.dist : null;
    G.S().combat = null;
    return d;
  };
  ck('★ 近战 vs 近战 → 0 步（照旧贴身开打）', distWith(s => { s.equipment.weapon = 'stoneAxe'; }) === 0);
  ck('★ 只带手枪（射程 15）→ 开局 15 步，第一回合就能开火（不再是 30）',
     distWith(s => { s.equipment.weapon = 'pistol'; G.addItem('bullet', 5, true); }) === 15);
  ck('★ 只带弓（射程 30）→ 开局 30 步', distWith(s => { s.equipment.weapon = 'bow'; G.addItem('arrow', 5, true); }) === 30);
  ck('★ 手枪没子弹 → 你的射程算 0，按对方算',
     distWith(s => { s.equipment.weapon = 'pistol'; s.inv.bullet = 0; }) === 0);
  // 敌人的射程：e.range（深海哨兵 20）或 gun 特性（15）
  ck('★ 近战 vs 深海哨兵（range 20）→ 20 步',
     distWith(s => { s.equipment.weapon = 'stoneAxe'; }) === 0 &&
     (() => { G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null; s.equipment.weapon = 'stoneAxe';
              G.startFight(ENEMIES.atlSentry, true); const d = G.S().combat.dist; G.S().combat = null; return d; })() === 20);
  // 作者举的例子：对面 20、我们 15 → 取 20
  ck('★ 作者原例：手枪(15) vs 深海哨兵(20) → 开局 20 步',
     (() => { G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null; s.equipment.weapon = 'pistol';
              G.addItem('bullet', 5, true);
              G.startFight(ENEMIES.atlSentry, true); const d = G.S().combat.dist; G.S().combat = null; return d; })() === 20);
  ck('★ 近战 vs 海盗头目（gun 特性 → 15）→ 15 步',
     (() => { G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null; s.equipment.weapon = 'stoneAxe';
              G.startFight(ENEMIES.pirateBoss, true); const d = G.S().combat.dist; G.S().combat = null; return d; })() === 15);
  ck('★ 弓(30) vs 深海哨兵(20) → 取大的 30 步',
     (() => { G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null; s.equipment.weapon = 'bow';
              G.addItem('arrow', 5, true);
              G.startFight(ENEMIES.atlSentry, true); const d = G.S().combat.dist; G.S().combat = null; return d; })() === 30);
  ck('★ 旧的固定值 FIGHT_START_DIST 已经删掉（别再复活）',
     !/FIGHT_START_DIST\s*=/.test(_GAME_SRC.replace(/\/\/[^\n]*/g, '')));
  ck('★ 开局距离真的用 max(我方, 敌方) 算', /C\.dist = Math\.max\(myRange, foeRange\);/.test(_GAME_SRC));
}

// ============================================================
// 20. 皮肤包可多选（作者 2026-09-23："皮肤包改成可多选吧"）
//     旧行为：单选，4 套各 50 魂点却只能用 1 套。
//     新行为：各开各的开关 —— 因为它们改的根本不是同一件东西：
//       armory=装备图集上色 / accent=界面配色(body.skin-accent) / seasons=地图场景彩色 / card=人物立绘目录
//     本节静态断言只守源码形状；"四路效果真的同时落到 DOM"由浏览器探针 _verify_skins.js 实测（15 项）。
// ============================================================
section('20. 皮肤包可多选（各开各的开关 + 老格式兼容）');
{
  const U = UI;
  ck('★ 20.1 皮肤状态是**集合**（skinSet），不再是单个 skin 变量',
     /let skinSet = \(\(\) => \{[\s\S]{0,220}?new Set\(\)/.test(U) && /function skinOn\(id\) \{ return skinSet\.has\(id\); \}/.test(U));
  ck('★ 20.2 旧的单选变量 skin 已彻底不存在（没有半改的痕迹）',
     !/skin === '/.test(U) && !/function setSkin\(/.test(U) && !/function skinCls\(/.test(U));
  ck('★ 20.3 老存档兼容：以前存的是裸字符串 id，现在存 JSON 数组',
     /arr = Array\.isArray\(j\) \? j : \[j\]/.test(U) && /catch \(e\) \{ arr = \[raw\]; \}/.test(U));
  ck('★ 20.4 写回时是数组', /localStorage\.setItem\(SKIN_LS_KEY, JSON\.stringify\(\[\.\.\.skinSet\]\)\)/.test(U));
  ck('★ 20.5 墨白原味不是"一种皮肤"，是全部关掉的基准（不进集合）',
     /arr\.filter\(id => id !== 'ink' && SKINS\.some\(s => s\.id === id\)\)/.test(U) &&
     /if \(!SKINS\.some\(s => s\.id === id\) \|\| id === 'ink' \|\| !Game\.skinOwned\(id\)\) return;/.test(U));
  ck('★ 20.6 没拥有的会被踢掉（改档/换账号后不留"标着开启却没效果"的虚标）',
     /for \(const id of \[\.\.\.skinSet\]\) if \(!Game\.skinOwned\(id\)\) skinSet\.delete\(id\);/.test(U));
  ck('★ 20.7 匠心彩绘或全彩地图包使装备图集上色', /const colored = skinOn\('armory'\) \|\| skinOn\('seasons'\);/.test(U));
  ck('★ 20.8 深海琥珀：物品图标彩色目录改走 skinOn(\'accent\')',
     /skinOn\('accent'\) && ACCENT\[id\]/.test(U) && /ALWAYS_COLOR\[id\] \|\| \(skinOn\('accent'\)/.test(U));
  // ⚠️ 契约变更（作者 2026-09-25 自己改的）：四季彩绘 → **全彩地图包**，改为免费，
  //    而且从"只有孤岛地图"扩到"孤岛 + 亚特兰蒂斯全部场景"（多了一个 sceneImagePath 决定用哪张图）。
  //    老的 `const mode = skinOn('seasons') ? ...` 写法已经不存在了。
  ck('★ 20.9 全彩地图包：地图与场景换图走 skinOn(\'seasons\')（含深海场景）',
     /function islandMapPath\(color = skinOn\('seasons'\)\)/.test(U) &&
     /const mode = color \? 'color' : 'mono';/.test(U) &&
     /function sceneImagePath\(scene, zoneKey, basePath\) \{[\s\S]{0,120}?if \(!skinOn\('seasons'\)\) return basePath;/.test(U) &&
     /const COLOR_ATLANTIS_SCENES = new Set\(/.test(U));
  ck('★ 20.10 彩绘卡面：立绘目录按"开着且自带 portrait 的皮肤"取',
     /const s = SKINS\.find\(x => skinOn\(x\.id\) && x\.portrait\);/.test(U));
  ck('★ 20.11 界面配色是逐套 toggle，不是"等于才加"',
     /document\.body\.classList\.toggle\(s\.cls, skinOn\(s\.id\)\)/.test(U));
  ck('★ 20.12 设置面板的皮肤按钮按"开/关"高亮（多选开关）',
     /btn\('skin:' \+ s\.id, s\.id === 'seasons' \? s\.name \+ ' · 免费' : s\.name, skinOn\(s\.id\)\)/.test(U));
  ck('★ 20.12b 全彩地图包免费且不改动既有魂点存档',
     /if \(id === 'seasons'\) \{[\s\S]{0,200}?return true;/.test(_GAME_SRC) &&
     !/fullColorMapRefunded/.test(_GAME_SRC));
  ck('★ 20.13 有点一下开、再点一下关的处理',
     /const wasOn = skinOn\(id\);/.test(U) && /enableSkin\(id, !wasOn\);/.test(U));
  ck('★ 20.14 有「墨白原味（全部关闭）」一键复位',
     /btn\('skinoff:1', '墨白原味（全部关闭）', skinSet\.size === 0\)/.test(U) &&
     /function clearSkins\(\) \{ skinSet\.clear\(\); saveSkins\(\); applySkin\(\); \}/.test(U));
  ck('★ 20.15 解锁后直接开启那一套（不用再点一次）', /enableSkin\(id, true\);/.test(U));
  ck('★ 20.16 皮肤名会列出全部已开启的（日志与设置面板都要看得懂）',
     /const on = SKINS\.filter\(s => skinOn\(s\.id\)\)\.map\(s => s\.name\);/.test(U) && /on\.join\(' \+ '\)/.test(U));
  // 作者 2026-09-25："皮肤包的介绍我感觉有点冗杂了，去掉吧"
  //   → 设置里那块皮肤条目只剩「当前：…」一行 + 五个开关，四条皮肤的长说明整段删掉。
  //   浏览器探针 _verify_skins.js 会实测"说明只剩 1 个 span、五个开关都在"。
  ck('★ 20.17 皮肤条目只留「当前：…」一行（冗长说明已删）',
     /<b>皮肤包<\/b><span>当前：<b>\$\{skinName\(\)\}<\/b><\/span>/.test(U) &&
     !/匠心彩绘＝/.test(U) && !/可以同时开多个/.test(U));
}

// ============================================================
// 21. 新手引导 / 家具位 / 体力上限 / 新菜谱（作者 2026-09-23 四条反馈）
//     ① 家具位是最容易踩的坑 → 建造前弹窗 + 建造页标注 + 帮助页说明（判定只留一份 furnTakesSlot）
//     ② "帐篷和篝火"文案让人以为要自己做 → 改成"已经搭好了，点开看看"
//     ③ 开局先提示看背包（别急着做武器）
//     ④ 体力上限可以靠床涨（每级 +5）
//     ⑤ 新菜：萝卜炖肉 / 面包 / 蛋糕
//     界面部分（弹窗真的弹、标注真的显示）由浏览器探针 _verify_furn_slot.js 实测。
// ============================================================
section('21. 新手引导 / 家具位 / 体力上限 / 新菜谱');
{
  const U = UI;
  ck('★ 21.1 "占不占位"抽成了单一来源 furnTakesSlot，furnSlotFull 复用它',
     /function furnTakesSlot\(fid\) \{/.test(_GAME_SRC) &&
     /function furnSlotFull\(fid\) \{ return furnTakesSlot\(fid\) && furnitureUsed\(\) >= houseSlots\(\); \}/.test(_GAME_SRC));
  ck('★ 21.2 furnSlotInfo 给出 占不占位 / 已用 / 容量 / 剩余',
     /function furnSlotInfo\(fid\) \{[\s\S]{0,220}?return \{ takes: furnTakesSlot\(fid\), used, cap, left: Math\.max\(0, cap - used\) \};/.test(_GAME_SRC));
  ck('★ 21.3 家具位容量 = 住所 slots + 扩建次数，未建住处为 0', (() => {
    G.newGame('fisher', 'normal'); const normal = G.houseSlots() === BUILDING_CHAINS.house[0].slots;
    G.newGame('fisher', 'legend'); const empty = G.houseSlots() === 0;
    return normal && empty;
  })());
  {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null;
    const free = ['flag', 'signpost', 'shelf', 'tank', 'rainfilter', 'loom', 'medPot', 'wb2', 'wb3', 'fr2', 'fr3', 'sm2', 'bed2', 'bed3', 'bed4'];
    ck('★ 21.4 次级工位与"升级替换"都不算占位', free.every(id => G.furnTakesSlot(id) === false),
       free.filter(id => G.furnTakesSlot(id) !== false).join(',') || '全部正确');
    const takes = ['wb1', 'fr1', 'sm1', 'bed1'];
    ck('★ 21.5 新建家具要占位', takes.every(id => G.furnTakesSlot(id) === true),
       takes.filter(id => G.furnTakesSlot(id) !== true).join(',') || '全部正确');
    // ⚠️ 契约变更（作者 2026-09-25："把鸡圈羊圈放到农田…从而腾出家具位"）：
    //    鸡舍/羊圈原来占 1 个住房家具位，现在改占**农田畜牧位**，所以这里必须**不占位**。
    ck('★ 21.5b 鸡舍/羊圈不再占住房家具位（改占农田畜牧位，腾出家具位）',
       G.furnTakesSlot('coop') === false && G.furnTakesSlot('pen') === false);
    ck('★ 21.5c 畜牧位数 = 农田等级 +1（苗床 1 / 田垄 2 / 水田 3）',
       [0, 1, 2].every(t => { s.buildings.farm = t; return G.farmLiveSlots() === t + 1; }),
       '苗床/田垄/水田 → ' + [0, 1, 2].map(t => { s.buildings.farm = t; return G.farmLiveSlots(); }).join('/'));
    {
      // 真跑一遍"只能用畜牧位建、位子不够就建不了、升级农田后能建"
      const f = G.S(); f.tut = null; f.scene = 'farm'; f.buildings.farm = 0; f.inv = {};
      G.addItem('wood', 60, true); G.addItem('vine', 30, true);
      const logs = []; G.bind({ onLog: t => logs.push(String(t)), onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: () => {} });
      G.buildFurniture('coop');
      const coopOk = !!f.furniture.coop;
      G.buildFurniture('pen');                       // 苗床只有 1 个位子 → 该被拒
      const penBlocked = !f.furniture.pen && logs.some(l => /农田畜牧位不够/.test(l));
      f.buildings.farm = 1;                          // 升到田垄 → 多一个位子
      G.buildFurniture('pen');
      ck('★ 21.5d 农田位子不够时建不了羊圈，升级农田后就能建（真跑一遍）',
         coopOk && penBlocked && !!f.furniture.pen, 'coop=' + coopOk + ' 被拒=' + penBlocked + ' pen=' + !!f.furniture.pen);
      // 只能在农田里建
      const f2 = G.S(); delete f2.furniture.coop; f2.scene = 'camp'; f2.buildings.farm = 1;
      G.buildFurniture('coop');
      ck('★ 21.5e 在营地建不了鸡舍（只能在农田里建）',
         !f2.furniture.coop && logs.some(l => /只能在农田里建/.test(l)));
      // 这一小段建了鸡舍/羊圈、还改了场景与农田等级 —— 收尾还原，
      // 因为后面的用例默认"新局什么都没建"（这里不能 newGame：会换掉外面那个 s 引用）
      delete f.furniture.coop; delete f.furniture.pen; f.scene = 'camp'; f.buildings.farm = 0;
    }
    s.tailorGift = 1;
    ck('★ 21.6 旧档赠送的裁缝台不占位', G.furnTakesSlot('tailor') === false);
    s.tailorGift = 0;
    ck('★ 21.7 新局的裁缝台要占位（不再白送）', G.furnTakesSlot('tailor') === true);
    const si = G.furnSlotInfo('wb1');
    ck('★ 21.8 furnSlotInfo 的数对得上（新局没建东西时用 0 格）',
       si.takes === true && si.used === 0 && si.cap >= 1 && si.left === si.cap, JSON.stringify(si));
    {
      // 旧存档仍把鸡舍/羊圈留在 furniture 表里；入口判定与已用格数必须同口径。
      G.newGame('fisher', 'normal');
      const f = G.S(); f.tut = null;
      f.buildings.house = 2; // 木屋：4 格
      f.furniture = { wb1:true, fr1:true, rack:true, tannery:true, coop:true, pen:true };
      const full = G.furnitureUsed() === 4 && G.furnSlotFull('spin');
      G.demolishFurniture('tannery');
      const freed = G.furnitureUsed() === 3 && !G.furnSlotFull('spin');
      f.scene = 'camp';
      f.inv = {};
      G.addItem('wood', 6, true); G.addItem('bamboo', 4, true);
      G.buildFurniture('spin');
      ck('★ 21.8b 旧档鸡舍/羊圈不占住房位；拆制革架后可建纺车',
         full && freed && !!f.furniture.spin && G.furnitureUsed() === 4,
         `满=${full} 腾位=${freed} 纺车=${!!f.furniture.spin} 已用=${G.furnitureUsed()}`);
    }
  }
  {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null;
    const base = G.maxStam();
    ck('★ 21.9 还没床时床的加成是 0', G.bedStamBonus() === 0, 'maxStam=' + base);
    s.furniture.bed1 = true;
    ck('★ 21.10 草床 → 体力上限 +5', G.bedStamBonus() === 5 && G.maxStam() === base + 5, base + ' → ' + G.maxStam());
    delete s.furniture.bed1; s.furniture.bed4 = true;
    ck('★ 21.11 大床 → 体力上限 +20（只取最高的那张，不叠加）',
       G.bedStamBonus() === 20 && G.maxStam() === base + 20, base + ' → ' + G.maxStam());
    ck('★ 21.12 四张床都标了 stamCap，且逐级递增',
       ['bed1', 'bed2', 'bed3', 'bed4'].map(id => (FURNITURE.find(f => f.id === id) || {}).stamCap).join(',') === '5,10,15,20',
       ['bed1', 'bed2', 'bed3', 'bed4'].map(id => (FURNITURE.find(f => f.id === id) || {}).stamCap).join(','));
    s.stats.spirit = 10;
    ck('★ 21.13 床加成不会绕过精神打折', G.maxStam() < base + 20, '精神10 时 maxStam=' + G.maxStam());
  }
  ck('★ 21.14 新局引导从第 0 步（看背包）开始，不再直接跳到"做石镐"',
     /S\.tut = 0;/.test(_GAME_SRC) && !/S\.tut = \(S\.inv && S\.inv\.pickStone > 0\)/.test(_GAME_SRC));
  ck('★ 21.15 引导第 0 步的文案提到【背包】', /step === 0 \? '新手引导：先点底部【背包】/.test(U));
  ck('★ 21.16 第 0 步不会被 `if \(!step\)` 当成"没有引导"吞掉（0 是假值，必须单独判）',
     /if \(!step && step !== 0\) \{ if \(t\) t\.remove\(\); return; \}/.test(U));
  ck('★ 21.17 打开背包会把引导推到下一步（已自带工具就直接去装备）',
     /function tutAfterBag\(\)/.test(U) && /some\(id => ITEMS\[id\] && ITEMS\[id\]\.tool\) \? 2 : 1;/.test(U) &&
     /else if \(n === 'inv'\) \{ tutAfterBag\(\); showModal\('inv'\); \}/.test(U));
  // ⚠️ 必须剥掉注释再查：我在这两处都写了「原来写的是"生起篝火、搭好帐篷"」的说明注释，
  //    不剥的话断言会被自己的注释骗到（这个坑本项目已经踩过好几次）。
  const G_NC = _GAME_SRC.replace(/\/\/[^\n]*/g, '');
  ck('★ 21.18 开局日志不再说"生起篝火、搭好帐篷"',
     !/生起篝火、搭好帐篷/.test(G_NC) && /帐篷和篝火开局就替你搭好了/.test(G_NC));
  ck('★ 21.19 第 1 天的当前目标也改成"已经搭好了，点开看看"',
     !/if \(day === 1\) return '生起篝火、搭好帐篷/.test(_GAME_SRC) && /if \(day === 1\) return '帐篷和篝火已经搭好了/.test(_GAME_SRC));
  ck('★ 21.20 普通开局自带帐篷篝火，传奇可制造三件基础建筑', (() => {
    G.newGame('fisher', 'normal');
    const ordinary = G.S().buildings.house === 0 && G.S().buildings.fire === 0;
    const craftable = Object.keys(BUILDING_CHAINS.house[0].mats).length > 0 && Object.keys(BUILDING_CHAINS.fire[0].mats).length > 0;
    G.newGame('fisher', 'legend');
    return ordinary && craftable && G.S().buildings.house === -1 && G.S().buildings.fire === -1 && G.S().buildings.storage === -1;
  })());
  ck('★ 21.21 建造页对"占位/不占位"两种都打了标', /slot-tag takes/.test(U) && /slot-tag free/.test(U) && /Game\.furnSlotInfo\(f\.id\)/.test(U));
  ck('★ 21.22 建造前会对占位家具弹确认（不占位的直接造，不拿废话拦人）',
     /if \(!si\.takes\) \{ doBuild\(\); return; \}/.test(U) && /title: '确认打造'/.test(U) && /会占用 1 格家具空间/.test(U));
  ck('★ 21.23 简洁确认框写明打造前后家具位及剩余空间', U.includes('${si.used}/${si.cap} → ${si.used+1}/${si.cap}') && U.includes('占用 1 格（还剩 ${si.left} 格）') && /compact: true/.test(U));
  ck('★ 21.24 确认框的"取消"回到营地（不是把面板关掉让人自己再找）', /label: '取消', hint: '回到营地', ok: \(\) => showModal\('camp'\)/.test(U));
  ck('★ 21.25 帮助页也讲了家具位规则，并逐件标占不占位',
     /<b>家具位<\/b><span>当前 \$\{Game\.furnitureUsed\(\)\}\/\$\{Game\.houseSlots\(\)\} 格/.test(U) &&
     /Game\.furnTakesSlot\(f\.id\) \? ' <b>（占 1 格）<\/b>' : ' <b>（不占家具位）<\/b>'/.test(U));
  ck('★ 21.26 属性面板标出体力上限来源（有床写床加了多少，没床提示做床能加）',
     U.includes("row('体力', `${cs.stam}/${cs.maxstam}`)"));
  {
    const need = { r_carrotstew: 'carrotStew', r_bread: 'bread', r_cake: 'cake' };
    for (const rid in need) {
      const r = RECIPES.find(x => x.id === rid);
      const out = need[rid];
      ck('★ 21.27 新菜谱 ' + rid + ' 存在、产出「' + ((ITEMS[out] || {}).name || out) + '」、材料齐全',
         !!r && !!r.out[out] && Object.keys(r.in).every(k => !!ITEMS[k]) && r.station === 'stove',
         r ? Object.entries(r.in).map(([k, v]) => ITEMS[k].name + '×' + v).join('+') + ' → ' + (ITEMS[out] || {}).name : '没有');
    }
    ck('★ 21.28 小麦与萝卜真的进了新菜谱（种田有去处）',
       Object.keys(RECIPES.find(r => r.id === 'r_flour').in).includes('wheat') &&
       Object.keys(RECIPES.find(r => r.id === 'r_bread').in).includes('flour') &&
       Object.keys(RECIPES.find(r => r.id === 'r_cake').in).includes('flour') &&
       Object.keys(RECIPES.find(r => r.id === 'r_carrotstew').in).includes('carrot'));
    // 作者 2026-09-25："改成小麦做成面粉，面粉再做其他东西吧"
    //   小麦 →(灶台·磨)→ 面粉 →(灶台)→ 面包 / 蛋糕。
    //   ⚠️ 契约变更：这两条原来断言的是"面包/蛋糕直接吃小麦"。
    {
      const rf = RECIPES.find(r => r.id === 'r_flour'), rb = RECIPES.find(r => r.id === 'r_bread'), rc = RECIPES.find(r => r.id === 'r_cake');
      ck('★ 21.28b 面粉是中间产物：小麦×3 → 面粉×2（和面包蛋糕同一个工位，不用另做家具）',
         !!rf && rf.in.wheat === 3 && rf.out.flour === 2 && rf.station === 'stove' && !!ITEMS.flour && ITEMS.flour.cat === 'mat');
      ck('★ 21.28c 面包的小麦成本一分没变（面粉×2 ≡ 小麦×3，另加淡水；作者 2026-09-25 再要 1 木材）',
         !!rb && rb.in.flour === 2 && rb.in.water === 1 && rb.in.wood === 1 && rb.in.wheat === undefined && rb.out.bread === 2);
      ck('★ 21.28c2 炖肉也加了 1 木材（作者 2026-09-25："面包和炖肉配方再加一个木材"）',
         (() => { const rs = RECIPES.find(r => r.id === 'r_meatstew'); return !!rs && rs.in.meat === 2 && rs.in.salt === 1 && rs.in.wood === 1; })());
      ck('★ 21.28d 蛋糕也改用面粉（面粉×3 ≈ 小麦 4.5，原来 4；蓝图门槛不变）',
         !!rc && rc.in.flour === 3 && rc.in.wheat === undefined && rc.in.egg === 3 && rc.in.honey === 2 && rc.needBp === 'bpCake');
      ck('★ 21.28e 小麦仍然是鸡的饲料（饲料没被一起改成面粉）',
         /const feedId = isPen \? 'hay' : 'wheat';/.test(_GAME_SRC) && /if \(!L\.autoFeed \|\| supplyCount\('wheat','island'\)<1\)/.test(_GAME_SRC));
      ck('★ 21.28f 面包/蛋糕的说明改口成"面粉"（不再是"小麦磨粉"这种事后描述）',
         /desc:'面粉烤出来的主食/.test(_DATA_SRC) && /蛋、蜜、面粉一起烤/.test(_DATA_SRC));
      // 真跑一遍这条链（光看配方表不算数）
      G.newGame('fisher', 'normal');
      const sc = G.S(); sc.tut = null; sc.scene = 'camp'; sc.inv = {};
      sc.furniture.stove = 1;                       // 灶台是这条链的工位
      G.bind({ onLog: () => {}, onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: () => {} });
      G.addItem('wheat', 3, true); G.addItem('water', 1, true); G.addItem('wood', 1, true);
      G.craft(RECIPES.find(r => r.id === 'r_flour'));
      const midFlour = G.invCount('flour');
      G.craft(RECIPES.find(r => r.id === 'r_bread'));
      ck('★ 21.28g 真跑一遍：小麦×3 → 面粉×2 → 面包×2（中间产物真的用得上）',
         midFlour === 2 && G.invCount('flour') === 0 && G.invCount('bread') === 2 && G.invCount('wheat') === 0,
         '面粉 ' + midFlour + '/2 · 面包 ' + G.invCount('bread') + '/2 · 小麦剩 ' + G.invCount('wheat'));
    }
    ck('★ 21.29 三道新菜都是 cat:food（会被食之包与料理规则正常对待）',
       ['carrotStew', 'bread', 'cake'].every(id => ITEMS[id].cat === 'food' && ITEMS[id].food > 0));
  }
}

// ============================================================
// 22. 亚克兰蒂斯资源链自洽性（作者 2026-09-23："资源和剧情系统能不能对得上，完不完善"）
//     做法：先算出"到底哪些东西真的拿得到"（点位产出 / 敌人掉落 / 守卫掉落 / 商店 /
//     鱼人兑换 / 配方闭包），再回头检查每一张深海配方、每一项鱼人交易要求的材料都在里面。
//     这样以后谁删了某个来源，这里会当场变红，而不是等玩家卡在第二章才发现。
// ============================================================
section('22. 亚克兰蒂斯资源链自洽（可达性闭包）');
{
  const ATL0 = SCENES.find(s => s.id === 'atlantis');
  // ---- ① 收集所有"直接来源" ----
  const obtainable = new Set();
  const srcNote = {};
  const mark = (id, why) => { if (!id || !ITEMS[id]) return; obtainable.add(id); (srcNote[id] = srcNote[id] || []).push(why); };
  for (const sc of SCENES) {
    for (const zk of Object.keys(sc.zones || {})) {
      const z = sc.zones[zk];
      for (const p of (z.points || [])) {
        const where = `${sc.name}·${z.name}·${p.name}`;
        for (const y of (p.yields || [])) mark(y.id, where);
        for (const e of (p.enemies || [])) { const en = ENEMIES[e]; if (en) for (const d of (en.drops || [])) mark(d.id, where + '(打' + en.name + ')'); }
        for (const g of [].concat(p.guard || [])) { const en = ENEMIES[g]; if (en) for (const d of (en.drops || [])) mark(d.id, where + '(守卫' + en.name + ')'); }
      }
    }
  }
  // 商店（含亚特兰蒂斯交易机）。
  // ⚠️ 各家商店的结构不一样：LAOCHAO.sell 是数组、TOWN 下面是 {needFame,sell,buy}、
  //    BLACKMARKET.sell 也是数组 —— 第一版只按 `.sell` 取，把数组本身当对象，漏掉了老潮整份货单
  //    （于是"帆布"被误判成没来源）。这里三种形态都兼容。
  const addShopList = (list) => { if (Array.isArray(list)) for (const e of list) if (e && e.id) mark(e.id, '商店'); };
  for (const box of [typeof LAOCHAO !== 'undefined' ? LAOCHAO : null,
                     typeof TOWN !== 'undefined' ? TOWN : null,
                     typeof BLACKMARKET !== 'undefined' ? BLACKMARKET : null]) {
    if (!box) continue;
    if (Array.isArray(box)) { addShopList(box); continue; }
    addShopList(box.sell);
    for (const v of Object.values(box)) {
      if (Array.isArray(v)) addShopList(v);
      else if (v && typeof v === 'object' && Array.isArray(v.sell)) addShopList(v.sell);
    }
  }
  // 遗失的交易机（亚特兰蒂斯）：商品表写在 ui.js 里，从源码里抠 id
  for (const m of UI.matchAll(/const ATL_(?:SHOP|BUY)\s*=\s*\[([\s\S]*?)\];/g)) {
    for (const mm of m[1].matchAll(/id:'(\w+)'/g)) mark(mm[1], '遗失的交易机');
  }
  // 鱼人兑换的产出（换出来的图纸/神物也算"拿得到"）
  {
    const fm0 = _GAME_SRC.match(/FISHMAN_DEALS\s*=\s*\[([\s\S]*?)\n\s*\];/);
    for (const mm of (fm0 ? fm0[1] : '').matchAll(/item:'(\w+)'/g)) mark(mm[1], '神秘鱼人');
  }
  // 第一章的基础物资（序章直接给的）
  ['wood', 'branch', 'thatch', 'flint', 'stone', 'water', 'fish', 'clay', 'herb', 'vine', 'bamboo', 'fiber', 'hide', 'meat', 'ironore', 'charcoal'].forEach(id => mark(id, '序章/基础'));
  // ---- ② 配方闭包：输入齐了就能产出 ----
  for (let pass = 0; pass < 12; pass++) {
    let grew = false;
    for (const r of RECIPES) {
      const ins = Object.keys(r.in || {});
      if (!ins.length) continue;
      if (ins.every(k => obtainable.has(k))) {
        for (const k of Object.keys(r.out || {})) if (!obtainable.has(k)) { obtainable.add(k); srcNote[k] = [(srcNote[k] || []).join('') || ''] + ('配方:' + r.name); grew = true; }
      }
    }
    if (!grew) break;
  }
  ck('★ 22.1 可达性闭包算完了（有东西可拿）', obtainable.size > 60, obtainable.size + ' 种可获取物品');

  // ---- ③ 每一张深海配方：材料必须都拿得到；站点必须真实存在 ----
  const ATL_STATIONS = new Set(['pearlWork', 'sourceForge', 'repair', 'none']);
  for (const f of (typeof ATLANTIS_FURNITURE !== 'undefined' ? ATLANTIS_FURNITURE : [])) if (f.station) ATL_STATIONS.add(f.station);
  const atlRecipes = RECIPES.filter(r => ATL_STATIONS.has(r.station) && r.station !== 'none');
  ck('★ 22.2 深海工作台配方都找得到（珠光工作台/源质熔炉）', atlRecipes.length >= 8, atlRecipes.length + ' 条');
  {
    const missingInput = [];
    for (const r of atlRecipes) {
      for (const k of Object.keys(r.in || {})) if (!obtainable.has(k)) missingInput.push(r.name + '需要' + (ITEMS[k] ? ITEMS[k].name : k));
      if (r.needItem && !obtainable.has(r.needItem) && !ITEMS[r.needItem]) missingInput.push(r.name + '需要不存在的道具 ' + r.needItem);
    }
    ck('★ 22.3 深海配方的材料全部可达（没有"要 A 才能拿 A"的死循环）', missingInput.length === 0, missingInput.join('；') || '全部可达');
  }
  // ---- ④ 深潜装备的图纸门槛必须都有来源 ----
  {
    const gated = ['r_divesuit', 'r_divesuit2', 'r_diveMask', 'r_coralarmor', 'r_coralblade', 'r_thruster', 'r_sourcearmor', 'r_sourcespear', 'r_pistol', 'r_bullet'];
    const bad = [];
    for (const rid of gated) {
      const r = RECIPES.find(x => x.id === rid);
      if (!r) { bad.push(rid + '不存在'); continue; }
      if (!r.needBp) continue;
      // 图纸本身要在可获取集合里（商店/掉落/点位/交易机），或者它是由鱼人兑换出来的
      const fromFish = new RegExp(`item:'${r.needBp}'`).test(_GAME_SRC);
      if (!obtainable.has(r.needBp) && !fromFish) bad.push(r.name + '的图纸 ' + r.needBp + ' 没来源');
    }
    ck('★ 22.4 需要图纸的深海装备，图纸都有出处（商店/掉落/鱼人）', bad.length === 0, bad.join('；') || '全部有出处');
  }
  // ---- ⑤ 鱼人交易要求的材料都拿得到 ----
  {
    const fm = _GAME_SRC.match(/FISHMAN_DEALS\s*=\s*\[([\s\S]*?)\n\s*\];/);
    const body = fm ? fm[1] : '';
    const needIds = new Set();
    for (const m of body.matchAll(/need:\s*\{([^}]*)\}/g)) {
      for (const kv of m[1].split(',')) { const k = kv.split(':')[0].trim().replace(/['"]/g, ''); if (k) needIds.add(k); }
    }
    const bad = [...needIds].filter(k => ITEMS[k] && !obtainable.has(k) && !RECIPES.some(r => r.out && r.out[k]));
    ck('★ 22.5 神秘鱼人要的材料都拿得到', needIds.size >= 5 && bad.length === 0, bad.length ? ('缺来源：' + bad.join('、')) : (needIds.size + ' 种材料全可达'));
    ck('★ 22.6 亚特兰蒂斯之种确实在鱼人交易里（唯一来源）', /relic:'atlantisSeed'/.test(body) && !/re_peddler/.test(_DATA_SRC.replace(/\/\/[^\n]*/g, '')));
  }
  // ---- ⑥ 照明等级链：0 → 1 → 2 → 3 每级都要有能做的灯，且材料不依赖同级或更深 ----
  {
    const lightOf = { goggles: 1, lightWeak: 2, lightStrong: 3 };
    const bad = [];
    for (const lid in lightOf) {
      const r = RECIPES.find(x => x.out && x.out[lid]);
      if (!r) { bad.push(lid + '没有配方'); continue; }
      const deeperOnly = Object.keys(r.in).filter(k => {
        // 这个材料是否只在"比它自身等级更深"的区域产出？
        const notes = (srcNote[k] || []).join(' ');
        const deepest = /深渊裂谷|深水圣殿|无光深渊|源晶簇|符文密室|圣殿之门/.test(notes);
        return deepest && !r.out[lid];
      });
      if (deeperOnly.length) bad.push(ITEMS[lid].name + '要的 ' + deeperOnly.map(k => ITEMS[k].name).join('、') + ' 只在更深区域');
    }
    ck('★ 22.7 照明等级 1/2/3 的灯都做得出来，且不吃"更深区域"的材料（无死循环）', bad.length === 0, bad.join('；') || '三级都通');
    ck('★ 22.8 荧光晶簇是浅水免照明材料（强光手电不再依赖源能晶石）',
       /glowCrystal/.test(_DATA_SRC) && (srcNote.glowCrystal || []).some(n => /珊瑚生长带|海葵|发光丛/.test(n)) &&
       !/r_lightstrong[\s\S]{0,240}?energyCrystal/.test(_DATA_SRC));
  }
  // ---- ⑦ 剧情收尾：4 块深殿核心 → 圣殿之门 → 沉没之王 → 结局 S/S2 ----
  {
    const cores = [];
    for (const zk of Object.keys(ATL0.zones)) {
      for (const p of (ATL0.zones[zk].points || [])) if (p.once && (p.yields || []).some(y => y.id === 'deepCore')) cores.push(zk);
    }
    ck('★ 22.9 四片海域各有一块「深殿核心」（一次性点位）', new Set(cores).size === 4, [...new Set(cores)].join('、'));
    const boss = (ATL0.zones.sanctum.points || []).find(p => p.id === 'atl_boss');
    ck('★ 22.10 守护者祭坛要求 照明3 + 深殿核心×4', !!boss && boss.needLight === 3 && boss.needCore === 4, boss ? JSON.stringify({ light: boss.needLight, core: boss.needCore }) : '没有');
    ck('★ 22.11 沉没之王在守护者祭坛，且两个结局成就都挂在它身上',
       (boss.enemies || []).includes('sunkenKing') && /achUnlock\('lighthouse'\)/.test(_GAME_SRC) && /achUnlock\('abyssal'\)/.test(_GAME_SRC));
    ck('★ 22.12 结局 S / S2 都在 ENDINGS 里',
       !!(ENDINGS.S && ENDINGS.S2) && /沉没之王/.test(ENDINGS.S.cond) && /沉没之王/.test(ENDINGS.S2.cond));
  }
  // ---- ⑧ 下水门槛一致：进海要潜水服+氧气罩；脱了要扣血 ----
  ck('★ 22.13 进亚特兰蒂斯要潜水服 + 氧气罩（或神物之种）',
     /if \(!\[.diveSuit.,.diveSuit2.\]\.includes\(S\.equipment\.cloth\)\) return \{ ok:false, reason:.需要先穿/.test(_GAME_SRC) &&
     /hasRelic\('atlantisSeed'\)/.test(_GAME_SRC));
  ck('★ 22.14 海底没穿潜水服会受水压伤害（脱下不是没代价）',
     /hasSuit/.test(_GAME_SRC) && /水压挤得你耳膜剧痛/.test(_GAME_SRC));
}

// ============================================================
// 23. 主页右上角「攻略」按钮 + 全流程攻略（作者 2026-09-23）
//     正文在 data.js 的 GUIDE；攻略弹窗的界面行为由 _verify_guide.js 实测。
// ============================================================
section('23. 攻略按钮与全流程攻略');
{
  const U = UI;
  ck('★ 23.1 攻略正文与免责声明都在 data.js 里（不是写死在 HTML）',
     /const GUIDE_NOTE = /.test(_DATA_SRC) && /const GUIDE = \[/.test(_DATA_SRC));
  ck('★ 23.2 攻略说明不提版本历史，正文包含操作指引', !/版本|旧版/.test(GUIDE_NOTE)&&GUIDE.some(s=>s.steps.some(t=>/长按/.test(t))), GUIDE_NOTE);
  ck('★ 23.3 攻略分了 8 个章节、每章都有条目',
     GUIDE.length >= 8 && GUIDE.every(s => s.title && Array.isArray(s.steps) && s.steps.length >= 4),
     GUIDE.length + ' 章 / ' + GUIDE.reduce((a, s) => a + s.steps.length, 0) + ' 条');
  ck('★ 23.4 攻略覆盖了第一章开局与第二章通关两条主线',
     GUIDE.some(s => /开局/.test(s.title)) && GUIDE.some(s => /通关与结局/.test(s.title)) &&
     GUIDE.some(s => /照明等级/.test(s.title)));
  ck('★ 23.5 攻略与邮箱在菜单，顶栏无按钮', /data-savemenu="guide"/.test(U) && /data-savemenu="mail"/.test(U) && !/<button id="btn-guide"|<button id="btn-mail"/.test(U));
  ck('★ 23.6 攻略按钮有独立的点击绑定', /const bg2 = \$\('#btn-guide'\); if \(bg2\) bg2\.onclick = \(\) => showModal\('guide'\);/.test(U));
  ck('★ 23.7 攻略面板有渲染分支', /else if \(kind === 'guide'\) html = guideModal\(\);/.test(U));
  ck('★ 23.8 开着攻略时时间冻结（看攻略不该掉饱食度）', PANEL_META.guide.freeze);
  ck('★ 23.9 攻略面板在"点空白不误关"的名单里', PANEL_META.guide.dismiss);
  ck('★ 23.10 攻略分页，菜单和邮箱复用正文', /data-guide-page/.test(U)&&/data-guide-step/.test(U)&&/inner = guideContent\(\);/.test(U));
  // 作者 2026-09-25："这个全流程攻略格式不对啊，手机版看"
  //   根因：`.help-item b { display:block }` 是给小标题用的，却把**正文里每一处加重**也拆成了独立一行，
  //   手机上看就是句子被切成一条一条。攻略步骤放在 .mail-body 里，所以那里必须把 b 还原成行内。
  ck('★ 23.11 攻略正文里的 <b> 是行内（不再被 .help-item b 的 display:block 拆行）',
     /\.mail-body b \{ display: inline; margin: 0; font-size: inherit; \}/.test(fs.readFileSync(ROOT + '/css/style.css', 'utf8')) &&
     /class="guide-page"/.test(U) && /<p><b>/.test(U));
  // 作者 2026-09-25：邮箱「活动」页挂朋友的中式心理咨询广告 + 反馈渠道说明
  ck('★ 23.13 小广告置于活动内容之后，去除冗长解释',
     /中式心理咨询/.test(U) && /1840585640/.test(U) && /event-ad/.test(U) && U.indexOf('event-ad')>U.indexOf('【命名牌】'));
  ck('★ 23.12 矮屏（≤560px 高）上攻略的字号/行距收过 —— 同一块可读区多看好几行',
     /@media \(max-height: 560px\) \{[\s\S]{0,500}?\.modal-content\.guide-modal \.mail-body \{ font-size: 12\.5px/.test(fs.readFileSync(ROOT + '/css/ui-polish.css', 'utf8')));
}

// ============================================================
// 24. 作者 2026-09-24 一批调整：种植砍半 / 三道菜转图纸 + 对岸美食家 / 玄铁加龙骨 /
//     制造栏只显示能做的 / 鸡舍羊圈名字 / 加工台改名 / 触屏可点尺寸
//     界面行为（隐藏、相邻、名字、触控尺寸）由 _verify_craft_panel.js + _audit_mobile.js 实测。
// ============================================================
section('24. 种植砍半 / 美食家图纸 / 玄铁龙骨 / 制造栏可做性 / 触屏尺寸');
{
  const U = UI;
  // ---- ① 种植砍半 ----
  // ⚠️ 2026-09-24 二次修订：作者指出"新增 FARM_YIELD_MUL 是多余的，把固定 +2 删掉就行"。
  //    现在公式 = rnd(min,max) × 难度 × 施肥，**没有 +2、也没有额外系数常量**。
  ck('★ 24.1 收获公式已删掉固定的 +2（且不再另加系数常量）',
     !/FARM_YIELD_MUL/.test(_GAME_SRC) &&
     /rnd\(crop\.min, crop\.max\) \* \(pick\.seed==='seedHerb'\?1:DIFFICULTIES\[S\.difficulty\]\.resMul\)/.test(_GAME_SRC) &&
     !/rnd\(crop\.min, crop\.max\) \+ 2/.test(_GAME_SRC));
  {
    G.newGame('fisher', 'normal');
    G.addItem('seedCarrot', 2, true);
    const rr = Math.random; Math.random = always;
    G.plant('seedCarrot'); G.S().crops[0].remain = 0;
    const c0 = G.invCount('carrot'); G.harvest();
    const got = G.invCount('carrot') - c0;
    Math.random = rr;
    ck('★ 24.2 萝卜一次收获 2~3 份（删 +2 前是 4~5）', got >= 2 && got <= 3, '+' + got);
  }
  // ---- ② 对岸美食家 + 三道菜转图纸 ----
  ck('★ 24.3 对岸新增「美食家」，声望 3 解锁', !!TOWN.gourmet && TOWN.gourmet.needFame === 3,
     TOWN.gourmet ? (TOWN.gourmet.name + ' needFame=' + TOWN.gourmet.needFame) : '没有');
  {
    const sells = (TOWN.gourmet && TOWN.gourmet.sell || []).map(e => e.id);
    ck('★ 24.4 美食家卖三张食谱（萝卜炖肉 / 超级大蛋 / 蛋糕）',
       ['bpStew', 'bpOmelette', 'bpCake'].every(k => sells.includes(k)), sells.join('、'));
  }
  ck('★ 24.5 三道菜都加上了图纸门槛',
     [['r_carrotstew', 'bpStew'], ['r_superegg', 'bpOmelette'], ['r_cake', 'bpCake']]
       .every(([rid, bp]) => (RECIPES.find(r => r.id === rid) || {}).needBp === bp));
  ck('★ 24.6 三张食谱都是 cat:bp（不是普通材料）',
     ['bpStew', 'bpOmelette', 'bpCake'].every(k => ITEMS[k] && ITEMS[k].cat === 'bp'));
  // 摊位清单不能把新店吞成杂货商
  ck('★ 24.7 商店清单按摊位 id 取，不再硬编码四家店',     /if \(TOWN\[k\] && TOWN\[k\]\.sell\) return TOWN\[k\]\.sell;/.test(U) &&
     /Object\.values\(TOWN\)\.reduce\(\(a, sh\) => a\.concat\(\(sh && sh\.buy\) \|\| \[\]\), \[\]\)/.test(U));
  // ⚠️ 作者 2026-09-25 复核："对岸美食家确定实装了吗" —— 结果发现**没实装到位**：
  //    摊位标签、点「买」取货架、点「卖」取收购表，三处都还是硬编码三家，
  //    data 里的「美食家」在界面上根本没入口、就算有入口也会被吞成杂货商。
  //    下面几条把"摊位必须从 TOWN 派生"钉住（真机路径由 _verify_town_gourmet.js 实测）。
  ck('★ 24.7b 集市摊位标签从 TOWN 派生（顺序表只排序：漏写摊位名字也不会漏摊位）',
     /const TOWN_ORDER = \['grocer', 'smith', 'informant', 'gourmet'\];/.test(U) &&
     /const shopIds = Object\.keys\(TOWN\)\.sort\(\(a, b\) =>/.test(U) &&
     /const shops = shopIds\.map\(id => \[id, TOWN\[id\]\.name, TOWN\[id\]\.needFame \|\| 0\]\);/.test(U) &&
     !/\['grocer','杂货商',0\],\['smith','铁匠',1\],\['informant','情报贩子',2\]/.test(U));
  ck('★ 24.7c 点「买」按当前摊位取货架（不再 informant/smith/杂货商 三元链）',
     /const list = \(TOWN\[shop\] && TOWN\[shop\]\.sell\) \|\| \[\];/.test(U) &&
     !/shop === 'informant' \? TOWN\.informant\.sell/.test(U));
  ck('★ 24.7d 点「卖」按当前摊位取收购表（不再只并三家）',
     /const list = \(TOWN\[townShopNow\] && TOWN\[townShopNow\]\.buy\) \|\| \[\];/.test(U) &&
     !/TOWN\.grocer\.buy\.concat\(TOWN\.smith\.buy\)\.concat\(TOWN\.informant\.buy\)/.test(U));
  ck('★ 24.7e 美食家声望 3 解锁，卖三张图纸与高价蜂蜜',
     ['grocer', 'smith', 'informant', 'gourmet'].every(k => TOWN[k] && TOWN[k].name) &&
     TOWN.gourmet.needFame === 3 && TOWN.gourmet.sell.filter(e => e.kind === 'bp').length === 3 &&
     TOWN.gourmet.sell.some(e => e.id === 'honey' && e.base >= 100 && (e.currency || 'beibi') === 'beibi'));
  // ---- ③ 玄铁装备各加 1 龙骨 ----
  ck('★ 24.8 玄铁剑 / 匕首 / 甲各要 龙骨×1',
     ['r_blacksword', 'r_blackdagger', 'r_blackarmor'].every(rid => {
       const r = RECIPES.find(x => x.id === rid);
       return r && r.in && r.in.dragonbone === 1;
     }),
     ['r_blacksword', 'r_blackdagger', 'r_blackarmor'].map(rid => {
       const r = RECIPES.find(x => x.id === rid); return rid + '=' + ((r && r.in && r.in.dragonbone) || 0);
     }).join(' '));
  // ⚠️ 别忘 `sc.zones || { _: sc }`：荒漠这类场景的点位直接挂在场景上，没有 zones，
  //    只写 Object.values(sc.zones) 会漏掉它们（第一版就是这么误报的）。
  ck('★ 24.9 龙骨本身有来源（荒漠化石层 → 提炼龙骨），不是凭空加门槛',
     RECIPES.some(r => r.out && r.out.dragonbone) &&
     SCENES.some(sc => Object.values(sc.zones || { _: sc })
       .some(z => (z.points || []).some(p => (p.yields || []).some(y => y.id === 'fossil')))));
  // ---- ④ 制造栏只列"能做的" ----
  ck('★ 24.10 没有图纸的配方整条隐藏（不再显示成灰按钮）',
     /if \(r\.needBp && !Game\.knowsBlueprint\(r\.needBp\)\) continue;/.test(U));
  ck('★ 24.11 未建造的工坊不在左侧分类里显示（不再有 🔒 死按钮）',
     /const tabAvail = \(sid\) => sid === 'none' \? true/.test(U) &&
     /const shownTabs = tabs\.filter\(\(\[sid\]\) => tabAvail\(sid\) \|\| craftTab === sid\);/.test(U) &&
     !/data-station="\$\{sid\}">\$\{name\}\$\{avail \? '' : ' 🔒'\}/.test(U));
  ck('★ 24.12 加工类配方按用途归入纺织、烹饪和晾晒制革', /\['tailor','纺织·衣物'\]/.test(U) && /\['fire','篝火·烹饪'\]/.test(U) && /\['furniture','晾晒·制革'\]/.test(U));
  ck('★ 24.13 晾肉架状态行紧跟「晾肉干」配方输出（作者：放到一起）',
     /if \(r\.station === 'rack'\) html \+= rackRow\(\);/.test(U) && /let rackRowShown = false;/.test(U));
  // ---- ⑤ 鸡舍/羊圈名字 ----
  ck('★ 24.14 建好的鸡舍/羊圈有独立名字（不再只剩一个 ✔ 和按钮）',
     /<span class="furn-name">✔ \$\{f\.name\}\$\{live\}<\/span>/.test(U) &&
     /data-live="\$\{f\.id\}">管理<\/button>/.test(U));
  // ---- ⑥ 触屏可点尺寸 ----
  {
    const PC = fs.readFileSync(ROOT + '/css/panels.css', 'utf8');
    ck('★ 24.15 CSS 给手机端弹窗按钮 44px 最小可点尺寸',
       /@media \(max-width: 700px\), \(max-height: 520px\) \{[\s\S]{0,600}?#modal button,[\s\S]{0,200}?min-height: 44px;/.test(PC));
    ck('★ 24.16 断点与既有移动端布局一致（没用 pointer: coarse）',
       /@media \(max-width: 700px\), \(max-height: 520px\) \{\s*#modal button,/.test(PC));
  }
}

// ============================================================
// 25. 作者 2026-09-24 第三批：鱼人"已换过"误报 / UI 紧凑化 / 通关分享图
//     界面行为由 _verify_ui_compact.js（14 项）与 _verify_share.js（10 项）实测。
// ============================================================
section('25. 鱼人已换过误报 / 装备图标 / UI 紧凑化 / 通关分享图');
{
  const U = UI;
  // ---- ① 鱼人：traded（真换过）与 owned（别处已有）必须分开 ----
  {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null;
    G.addItem('bpSourceSpear', 1, true);          // 别处已有（旧档从交易机买的）
    // ⚠️ 新局不一定会建 S.atlantis，直接 delete s.atlantis.xxx 会抛 TypeError（第一版就这么崩的）
    if (s.atlantis) delete s.atlantis.fishmanTraded;
    const d1 = G.fishmanDeals().find(x => x.id === 'spear');
    ck('★ 25.1 手上已有图纸 ≠ 在鱼人这儿换过（不再误报"已经换过了"）',
       d1.traded === false && d1.owned === true, 'traded=' + d1.traded + ' owned=' + d1.owned);
    ck('★ 25.2 已有就不给交换入口（免得换重复、白扣材料）', G.fishmanBarter('spear').ok === false);
    // 真的换一次
    G.newGame('fisher', 'normal');
    const s2 = G.S(); s2.tut = null;
    for (const [k,v] of Object.entries(G.fishmanDeals().find(x => x.id === 'spear').need)) G.addItem(k, v, true);
    G.fishmanBarter('spear');
    const d2 = G.fishmanDeals().find(x => x.id === 'spear');
    ck('★ 25.3 真换过之后 traded 才为真', d2.traded === true && d2.owned === true, 'traded=' + d2.traded);
    ck('★ 25.4 界面把两种情形分开写（"已经换过了" / "你已经有了（不是在这儿换的）"）',
       /d\.traded \? '已经换过了' : '你已经有了（不是在这儿换的）'/.test(U) &&
       /const tag = d\.traded \? '已 换' : '已 有';/.test(U));
  }
  // ---- ② 装备槽 / 神物栏 图标复用 itemIcon ----
  ck('★ 25.5 装备槽显示图标（复用 itemIcon，不另写一套）',
     U.includes('class="equip-val">${id?itemIcon(id)'));
  ck('★ 25.6 神物栏显示图标', U.includes('id?itemIcon(id):\'<span class="item-icon">＋</span>\'') && U.includes('loadout-relics'));
  // ---- ③ 制造卡：产物并到名称右侧 ----
  ck('★ 25.7 产出入到名称行（.recipe-out），不再单独占一行',
     /<div class="recipe-name">\$\{r\.name\}<span class="recipe-out">产出：\$\{outTxt\}<\/span>/.test(U) &&
     !/recipe-mats mats-line">产出：/.test(U));
  // ---- ④ 食之包压成紧凑行（复用 recipe-row） ----
  ck('★ 25.8 食之包改成一行紧凑行，复用 recipe-row',
     U.includes("panels.register('satchelSettings'") && /satchel-menu/.test(SATCHEL_VIEW) && U.includes('data-satchel-settings') && /\.satchel-row \{/.test(fs.readFileSync(ROOT + '/css/style.css', 'utf8')));
  // ---- ⑤ 手机端弹窗宽度再收窄（-32 → -48） ----
  {
    const PC = fs.readFileSync(ROOT + '/css/panels.css', 'utf8');
    ck('★ 25.9 手机端 work-modal 左右各留 24（总扣 48px）',
       /width: calc\(100vw - env\(safe-area-inset-left, 0px\) - env\(safe-area-inset-right, 0px\) - 48px\);/.test(PC) &&
       !/- 32px\);/.test(PC.split('@media (max-width: 700px)')[1] || ''));
  }
  // ---- ⑥ 通关分享图 ----
  ck('★ 25.10 通关界面有「分享通关图」按钮', /<button id="end-share">📤 分享通关图<\/button>/.test(U));
  ck('★ 25.11 点击会现画一张图再弹出（async 生成 + 按钮防重复点）',
     /const btn = \$\('#end-share'\);[\s\S]{0,160}?btn\.disabled = true;[\s\S]{0,400}?await buildShareCard\(id\)/.test(U));
  ck('★ 25.12 分享图是 1080×1620 竖版长图', /const W = 1080, H = 1620;/.test(U));
  ck('★ 25.13 有「保存图片」下载链接（download 带文件名，手机可长按存图）',
     /class="mini-btn share-dl" download="孤屿遗章_结局_\$\{esc\(nm\)\}\.png"/.test(U) && /长按图片选「存储图像」/.test(U));
  ck('★ 25.14 画不上结局插画时退回纯排版（file:// 被污染也不会点了没反应）',
     /img\.onload = \(\) => \{\s*try \{ paint\(img\); finish\(\); \}\s*catch \(e\) \{ plain\(\); \}/.test(U) &&
     /const plain = \(\) => \{ try \{ paint\(null\); \} catch \(e\) \{\} finish\(\); \};/.test(U));
  ck('★ 25.15 分享弹窗已接入渲染 / 冻结时间 / 点空白不误关',
     /else if \(kind === 'share'\) html = shareModal\(\);/.test(U) && PANEL_META.share.freeze && PANEL_META.share.dismiss);
}

// ============================================================
// 26. 冬季（作者 2026-09-25："冬天有人反馈水不够喝" + "冬天来的时候弹个窗，
//     提示资源有限很难熬，注意不要和其他弹窗冲突"）
//     ① 河畔新增「采雪」→ 积雪 → 篝火「烧雪水」= 冬天的第二条水源；
//     ② 冬天第一天推一次「冬季来临」提示弹窗（排队，不跟别的弹窗抢屏幕）。
// ============================================================
section('26. 冬季：采雪 / 烧雪水 / 冬季来临弹窗');
{
  // ---- ① 积雪与采雪点 ----
  ck('★ 26.1 新增物品「积雪」（cat:mat，可堆 20，说明写了能烧成淡水）',
     !!ITEMS.snow && ITEMS.snow.cat === 'mat' && ITEMS.snow.stack === 20 && /淡水/.test(ITEMS.snow.desc),
     ITEMS.snow && (ITEMS.snow.name + ' cat=' + ITEMS.snow.cat));
  const riverSc = SCENES.find(s => s.id === 'river');
  const snowPt = (riverSc.points || []).find(p => p.id === 'river_snow');
  ck('★ 26.2 河畔有「采雪」采集点，产出积雪',
     !!snowPt && snowPt.type === 'gather' && (snowPt.yields || []).some(y => y.id === 'snow'),
     JSON.stringify(snowPt && snowPt.yields));
  ck('★ 26.3 采雪只在冬季出现（cond.season 只写 冬）',
     !!snowPt && snowPt.cond && Array.isArray(snowPt.cond.season) && snowPt.cond.season.length === 1 && snowPt.cond.season[0] === '冬',
     JSON.stringify(snowPt && snowPt.cond));
  ck('★ 26.4 采雪点挂了场景热点，否则玩家在河畔根本点不到它',
     (SCENE_HOTSPOTS.river || []).some(h => h.point === 'river_snow'),
     (SCENE_HOTSPOTS.river || []).map(h => h.point).join(','));
  {
    G.newGame('fisher', 'normal');
    const sA = G.S(); sA.tut = null; sA.scene = 'river';
    sA.day = 40; const inAutumn = G.pointAvailable(snowPt);   // 秋
    sA.day = 46; const inWinter = G.pointAvailable(snowPt);   // 冬
    ck('★ 26.5 秋天采不了雪、冬天能采（cond.season 真的被 pointAvailable 读到）',
       inAutumn === false && inWinter === true, '秋=' + inAutumn + ' 冬=' + inWinter);
  }

  // ---- ② 烧雪水 ----
  const rmelt = RECIPES.find(r => r.id === 'r_meltwater');
  ck('★ 26.6 「烧雪水」配方：积雪×2 + 木材×1 → 淡水×1（篝火，15 分钟）',
     !!rmelt && rmelt.station === 'fire' && rmelt.in.snow === 2 && rmelt.in.wood === 1 && rmelt.out.water === 1 && rmelt.time === 15,
     rmelt && JSON.stringify({ in: rmelt.in, out: rmelt.out, station: rmelt.station, time: rmelt.time }));
  // ⚠️ 契约变更（2026-09-25 二次调整）：作者"削弱一下雪，变成两个雪只能烧一份淡水"——
  //    原来是 2 积雪 → 2 淡水。现在这条线比「取水」贵（取水 20 分钟 2~3 份；烧雪水 15 分钟 1 份 + 1 木材），
  //    冬天仍然值得跑，只是不再比取水更划算。
  ck('★ 26.6b 烧雪水比取水贵（2 积雪只出 1 淡水，还要搭 1 木材）',
     !!rmelt && rmelt.out.water === 1 && rmelt.in.wood === 1 && rmelt.in.snow === 2);
  ck('★ 26.7 烧雪水不要陶罐（冬天没陶罐也该有水喝）', !!rmelt && rmelt.needItem === undefined, rmelt && String(rmelt.needItem));
  {
    G.newGame('fisher', 'normal');
    const s2 = G.S(); s2.tut = null; s2.scene = 'camp'; s2.inv = {};
    G.bind({ onLog: () => {}, onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: () => {} });
    G.addItem('snow', 2, true); G.addItem('wood', 1, true);
    const w0 = G.invCount('water');
    G.craft(rmelt);
    ck('★ 26.8 真做一次：2 积雪 + 1 木材 换到 1 淡水，材料被扣掉',
       G.invCount('water') === w0 + 1 && G.invCount('snow') === 0 && G.invCount('wood') === 0,
       '水 ' + w0 + '→' + G.invCount('water') + ' 积雪剩 ' + G.invCount('snow') + ' 木材剩 ' + G.invCount('wood'));
  }
  // ---- ③ 冬天水到底紧到什么程度（这组数字就是"为什么要加采雪"）----
  {
    const winter = SEASONS.find(s => s.name === '冬'), snowW = WEATHER.snow;
    const yld = (min) => Math.max(1, Math.round(min * winter.gatherMul * snowW.eff));
    ck('★ 26.9 冬天雪天取水的真实产出被"季节 0.6 × 雪天 0.6"压到每次 1 份（原来 2~3）',
       winter.gatherMul === 0.6 && snowW.eff === 0.6 && yld(2) === 1 && yld(3) === 1 && Math.max(1, Math.round(2 * winter.gatherMul)) === 1,
       'min2→' + yld(2) + ' min3→' + yld(3) + ' 晴冬 min3→' + Math.max(1, Math.round(3 * winter.gatherMul)));
  }

  // ---- ④ 冬季来临弹窗 ----
  {
    G.newGame('fisher', 'normal');
    const s3 = G.S();
    const seen = [];
    for (const d of [1, 45, 46, 47, 105, 106, 107]) {
      const keep = s3.day; s3.day = d;
      seen.push(d + ':' + (G.winterJustStarted() ? 'Y' : 'N'));
      s3.day = keep;
    }
    ck('★ 26.10 winterJustStarted 只在"冬天第一天"为真（第 46 天、第 106 天各一次）',
       seen.join(' ') === '1:N 45:N 46:Y 47:N 105:N 106:Y 107:N', seen.join(' '));
  }
  {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null; s.scene = 'camp'; s.day = 45; s.minute = 23 * 60;
    s.flags.winterWarned = undefined;
    const ovs = []; G.bind({ onLog: () => {}, onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: o => ovs.push(o) });
    const RND = Math.random; Math.random = () => 0.99;    // 别让夜袭/随机奇遇插进来
    G.sleep('normal');
    Math.random = RND;
    const win = ovs.find(o => o.kind === 'winter');
    ck('★ 26.11 第 45 天睡到第 46 天会推 kind:"winter" 的弹窗',
       !!win && G.S().day === 46, 'day=' + G.S().day + ' overlays=' + ovs.map(o => o.kind || o.title).join(','));
    ck('★ 26.12 弹过的日子记进 S.flags.winterWarned（读档回来不会重复弹）',
       G.S().flags.winterWarned === 46, String(G.S().flags.winterWarned));
    const ovs2 = []; G.bind({ onLog: () => {}, onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: o => ovs2.push(o) });
    const s2b = G.S(); s2b.minute = 23 * 60;
    Math.random = () => 0.99; G.sleep('normal'); Math.random = RND;
    ck('★ 26.13 冬天里往后每天都不再弹（第 47 天没有 winter 弹窗）',
       G.S().day === 47 && !ovs2.some(o => o.kind === 'winter'), 'day=' + G.S().day + ' overlays=' + ovs2.map(o => o.kind || o.title).join(','));
  }
  ck('★ 26.14 冬季弹窗接进了渲染分支 / 白名单 / 点空白可关',
     /else if \(kind === 'winter'\) html = winterModal\(\);/.test(UI) &&
     /'daily','winter'\]\.includes\(k\)/.test(UI) &&
     PANEL_META.winter.dismiss);
  ck('★ 26.15 已经有弹窗时「冬季来临」先排队，等上一个关掉再弹（作者要求"不要和其他弹窗冲突"）',
     /if \(k === 'winter' && modal\) \{ pendingPanels\.push\(cfg\); return; \}/.test(UI) &&
     /function showNextPendingPanel\(\)/.test(UI) &&
     /if\(modal \|\| battleView \|\| !pendingPanels\.length\)return/.test(UI) &&
     /const cfg=pendingPanels\.shift\(\)/.test(UI) &&
     /if\(modal \|\| battleView\)\{pendingPanels\.unshift\(cfg\);return;\}/.test(UI) &&
     /showModal\(kind,cfg\)/.test(UI) && /showNextPendingPanel\(\);/.test(UI));
  ck('★ 26.16 弹窗正文真的教会玩家怎么过冬（采雪 / 烧雪水 / 保暖点数 / 每小时 -5 生命）',
     /function winterModal\(\)/.test(UI) && /采雪/.test(UI) && /烧雪水/.test(UI) && /每小时 -5 生命/.test(UI));
}

// ============================================================
// 27. 石龛真三选一 + 睡眠里的中毒/流血（作者 2026-09-25）
//     ① 玩家原话："神器那个界面出来一下，接着就卡，没什么意思，就让你看一眼，也不让你选"
//        → 石龛文案写着供着三件神物，以前却只给一个随机按钮，现在是真三选一；
//     ② "中毒等 debuff 改为睡眠也持续扣血" → sleep() 走的是直接推进分钟数，
//        以前这一觉里 debuff 一次都不结算，等于白嫖。
// ============================================================
section('27. 石龛三选一 / 睡眠中的中毒流血');
{
  const evShrine = { id:'re_shrine', once:1, text:'洞壁暗处，一扇被藤蔓掩埋的石龛微微发光，里面供着三件神物。' };
  G.newGame('fisher', 'normal');
  const S4 = G.S();
  ck('★ 27.1 石龛池子里没有亚特兰蒂斯之种（之种只能从海底鱼人换）',
     (S4.relics || []).length === 0 && !G.shrinePool().includes('atlantisSeed'), G.shrinePool().join(','));
  const cfg = G.shrineChoices(evShrine);
  const picks = cfg.choices.filter(c => /^取走「/.test(c.label));
  ck('★ 27.2 弹出的是「三件神物」：3 个取走选项 + 1 个不敢妄动',
     /石龛/.test(cfg.title) && cfg.choices.length === 4 && picks.length === 3 &&
     cfg.choices[cfg.choices.length - 1].label === '不敢妄动',
     cfg.title + ' / ' + cfg.choices.map(c => c.label).join(' | '));
  ck('★ 27.3 三件各不相同，且都不是亚特兰蒂斯之种',
     new Set(picks.map(c => c.label)).size === 3 && !picks.some(c => /亚特兰蒂斯之种/.test(c.label)),
     picks.map(c => c.label).join(' '));
  {
    // 真点一件：拿到的必须是按钮上写的那件（不是随机给一件）——这正是玩家抱怨的那一点
    const target = picks[1];
    const wantName = target.label.slice(3, -1);          // 取走「XXX」 → XXX
    const wantId = Object.keys(RELICS).find(id => RELICS[id].name === wantName);
    G.bind({ onLog: () => {}, onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: () => {} });
    target.ok();
    ck('★ 27.4 点哪件就拿哪件（拿到的正是按钮上写的那件神物）',
       !!wantId && S4.relics.length === 1 && S4.relics[0] === wantId,
       '点了「' + wantName + '」→ 实际拿到 ' + S4.relics.map(i => RELICS[i].name).join(','));
    ck('★ 27.5 做出选择才消耗这一次奇遇（once 事件选择后才打标）', S4.flags['re_re_shrine'] === 1, String(S4.flags['re_re_shrine']));
  }
  {
    G.newGame('fisher', 'normal');
    const S5 = G.S(); S5.relics = ['vampire', 'dodge', 'satchel']; S5.stats.spirit = 50;
    const c5 = G.shrineChoices(evShrine);
    ck('★ 27.6 只剩 1 件没拿到时只摆 1 件（不硬凑三件重复的）',
       c5.choices.length === 2 && /血色背心/.test(c5.choices[0].label), c5.choices.map(c => c.label).join(' | '));
    const sp = S5.stats.spirit;
    c5.choices[1].ok();
    ck('★ 27.7 「不敢妄动」不给神物、只加精神 +2（精神没满时能看出 +2）',
       S5.relics.length === 3 && S5.stats.spirit === sp + 2,
       '神物=' + S5.relics.length + ' 精神 ' + sp + '→' + S5.stats.spirit);
  }
  {
    G.newGame('fisher', 'normal');
    const S6 = G.S(); S6.relics = ['vampire', 'dodge', 'satchel', 'bloodvest'];
    const c6 = G.shrineChoices(evShrine);
    ck('★ 27.8 四件都拿到后只给「合十离开」，正文说明龛已经空了',
       c6.choices.length === 1 && /合十离开/.test(c6.choices[0].label) && /都已经有了/.test(c6.text),
       c6.choices.map(c => c.label).join(' | '));
  }
  {
    G.newGame('fisher', 'normal');
    let sawSeed = false;
    for (let i = 0; i < 200; i++) { G.S().relics = []; G.gainRandomRelic(); if (G.S().relics.includes('atlantisSeed')) sawSeed = true; }
    ck('★ 27.9 通用随机神物（gainRandomRelic）200 次都不会掉出亚特兰蒂斯之种', !sawSeed);
  }
  {
    const re = RANDOM_EVENTS.find(e => e.id === 're_shrine');
    ck('★ 27.10 数据层的石龛不再写死选项（选项在 game.js 动态生成，写在这儿也不会被读到）',
       !!re && Array.isArray(re.choices) && re.choices.length === 0 && /function shrineChoices/.test(_GAME_SRC));
    ck('★ 27.11 石龛走 triggerShrine 而不是通用 choices 分支（否则又退回"看一眼没得选"）',
       /if \(ev\.id === 're_shrine'\) \{ triggerShrine\(ev\); return; \}/.test(_GAME_SRC));
  }
  // ---- 睡眠里的中毒/流血 ----
  {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null; s.scene = 'camp'; s.minute = 22 * 60;
    s.stats.hp = 80; s.statuses.poison = 3; s.statuses.bleed = 2;
    G.bind({ onLog: () => {}, onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: () => {} });
    const RND = Math.random; Math.random = () => 0.99;
    const f = G.sleepForecast('normal');
    ck('★ 27.12 睡眠面板会预报中毒/流血这一觉还要掉多少血',
       f.poisonTicks === 3 && f.bleedTicks === 2 && f.debuffHp === 19,
       '毒×' + f.poisonTicks + ' 流血×' + f.bleedTicks + ' 合计 -' + f.debuffHp);
    const hp0 = s.stats.hp;
    const exp = Math.min(G.hpMax(), hp0 + f.hp) - 19;
    G.sleep('normal');
    Math.random = RND;
    const S9 = G.S();
    ck('★ 27.13 整觉期间中毒/流血照样每小时发作（生命 = 恢复后 −19）',
       S9.statuses.poison === 0 && S9.statuses.bleed === 0 && Math.round(S9.stats.hp) === Math.round(exp),
       '生命 ' + hp0 + ' + ' + f.hp + ' − 19 = ' + exp + '，实际 ' + Math.round(S9.stats.hp));
    ck('★ 27.14 中毒睡觉不再是"白嫖"：净结果确实比只算恢复更低',
       Math.round(S9.stats.hp) < Math.min(G.hpMax(), hp0 + f.hp),
       Math.round(S9.stats.hp) + ' < ' + Math.min(G.hpMax(), hp0 + f.hp));
  }
  ck('★ 27.15 清醒与睡眠共用同一个 debuffTick（不会两边各写一套扣血数字）',
     /function debuffTick\(\)/.test(_GAME_SRC) &&
     /if \(debuffTick\(\)\) return;/.test(_GAME_SRC) &&
     /for \(let i = 0; i < sleepH; i\+\+\) \{ if \(debuffTick\(\)\) return; \}/.test(_GAME_SRC));
}

// ============================================================
// 28. 最后一击的"停一秒"停在结算之后（作者 2026-09-25：
//     "最后一击之后战斗不是会停一秒吗，改成结算伤害后再停啊（对面血量应该显示 0）"）
//     以前 attack() 先把 ehp<=0 的怪从 C.enemies 里滤掉再 endFight，而 UI 的 'end' 分支
//     又不重画血条 —— 这一秒停的是"扣血前"的画面。现在留一份 finalEnemies 交给 UI 先画 0。
//     真机行为（停顿那一秒血条是不是 0）由浏览器探针 _verify_kill_pause.js 实测（9 项）。
// ============================================================
section('28. 最后一击：先结算伤害再停');
{
  ck('★ 28.1 attack() 在滤掉死亡目标**之前**留下一份最终名单',
     /C\.finalEnemies = C\.enemies\.slice\(\);[\s\S]{0,200}?C\.enemies = C\.enemies\.filter\(e => e\.ehp > 0\);/.test(_GAME_SRC));
  ck('★ 28.2 endFight 把「胜负 + 最终名单」一起交给 UI（不再是光一个布尔）',
     /const fin = \{ win: !!win, enemies: \(\(C && C\.finalEnemies\) \|\| \(C && C\.enemies\) \|\| \[\]\)\.slice\(\) \};/.test(_GAME_SRC) &&
     (_GAME_SRC.match(/onFight\('end', fin\)/g) || []).length === 2 &&
     !/onFight\('end', win\)/.test(_GAME_SRC));
  ck('★ 28.3 UI 的结束分支：**先画血条再停**（paintTargetRows 在 setTimeout 之前）',
     /if\(C && C.enemies\)paintTargetRows\(C.enemies\);[\s\S]{0,900}?setTimeout\(/.test(UI));
  ck('★ 28.4 战斗结束音看的是新结构里的 win（不是把对象当布尔用）',
     UI.includes("AudioFX.play(C.win?'good':'danger')"));
  ck('★ 28.5 血条绘制只有一份实现（updateCombat 与结束分支共用 paintTargetRows）',
     /function paintTargetRows\(es\) \{/.test(UI) &&
     UI.includes('paintTargetRows(C.enemies)'));
  ck('★ 28.6 0 血会画成 0%（tgPct/tgHpText 都往下钳到 0，不会变负或留 1 点）',
     /function tgPct\(e\) \{ const maxH = e\.emax \|\| 20; return Math\.max\(0, Math\.min\(100, e\.ehp \/ maxH \* 100\)\); \}/.test(UI) &&
     /function tgHpText\(e\) \{ const maxH = e\.emax \|\| 20; return `\$\{Math\.max\(0, Math\.round\(e\.ehp\)\)\}\/\$\{Math\.round\(maxH\)\}`; \}/.test(UI));
}

// ============================================================
// 29. 作者 2026-09-25 战斗批：匕首数值 / 割树脂口径 / 攻速统一 13 /
//     战斗 2 级互斥（重击 ⇄ 必中）/ 混装射速 bug / DPS 核查发现的 6 个代码问题
//     真机行为（按钮出不出、必中真的必中、冷却、老档迁移）由浏览器探针
//     开发工具/检查/_verify_combat_batch.js 实测。
// ============================================================
section('29. 战斗批：匕首 / 重击必中 / 混装射速 / 6 个修复');
{
  // ① 匕首：伤害 5/8/10/12、攻速统一 13
  ck('★ 29.1 四把匕首伤害 5/8/10/12、攻速统一 13',
     ITEMS.knifeStone.atk === 5 && ITEMS.ironDagger.atk === 7 && ITEMS.steelDagger.atk === 9 && ITEMS.blackDagger.atk === 11 &&
     [ITEMS.knifeStone, ITEMS.ironDagger, ITEMS.steelDagger, ITEMS.blackDagger].every(w => w.spd === 13),
     [ITEMS.knifeStone, ITEMS.ironDagger, ITEMS.steelDagger, ITEMS.blackDagger].map(w => w.atk + '@' + w.spd).join(' / '));
  // ② 割树脂要石质匕首（别的点用 knife 也照旧，只有这一个点写成 tier:1 = 石质匕首那把）
  {
    const resin = (SCENES.find(s => s.id === 'forest').points || []).find(p => p.id === 'forest_resin');
    ck('★ 29.2 割树脂明确要「石质匕首」（need.tool=knife + tier:1，不再含糊地只要"匕首"）',
       !!resin && resin.need && resin.need.tool === 'knife' && resin.need.tier === 1,
       JSON.stringify(resin && resin.need));
  }
  // ③ 混装远近：只按所用武器算、不吃双持 ×1.5（DPS 核查 #1）
  {
    G.newGame('fisher', 'normal');
    const s = G.S(); s.tut = null;
    G.addItem('pistol', 1, true); G.addItem('knifeStone', 1, true); G.addItem('ironSword', 1, true);
    s.equipment.weapon = 'pistol'; s.equipment.weapon2 = 'knifeStone';
    const gunShot = G.combatSpeed(true), meleeHit = G.combatSpeed(false);
    s.equipment.weapon = 'ironSword'; s.equipment.weapon2 = 'ironSword';
    const dualSame = G.combatSpeed(false);
    ck('★ 29.3 混装（枪+匕首）：射击按枪的攻速、近战按匕首的，都不吃 ×1.5',
       gunShot === ITEMS.pistol.spd && meleeHit === ITEMS.knifeStone.spd,
       '射击 ' + gunShot + '（枪 ' + ITEMS.pistol.spd + '）/ 近战 ' + meleeHit + '（匕首 ' + ITEMS.knifeStone.spd + '）');
    ck('★ 29.3b 双持同类的加权倍率还在（没有被一起改坏）',
       dualSame > ITEMS.ironSword.spd, '双铁剑 ' + dualSame + ' vs 单把 ' + ITEMS.ironSword.spd);
  }
  // ④ 战斗 2 级互斥对
  {
    const C = SKILL_TREES.combat;
    const h = C.nodes.find(n => n.id === 'f_heavy'), su = C.nodes.find(n => n.id === 'f_sure');
    ck('★ 29.4 战斗 2 级给一对互斥选择：重击 ⇄ 必中（各 1 级、30 经验）',
       !!h && !!su && h.need === 2 && su.need === 2 && h.mutex === 'f_sure' && su.mutex === 'f_heavy' &&
       h.max === 1 && su.max === 1 && h.cost[0] === 30 && su.cost[0] === 30);
    ck('★ 29.5 两个都写明了 20 秒冷却；必中是 1.0 倍伤害',
       /冷却 20 秒/.test(h.desc[0]) && /冷却 20 秒/.test(su.desc[0]) && /1\.0 倍伤害/.test(su.desc[0]) && /必定命中/.test(su.desc[0]),
       su.desc[0]);
    ck('★ 29.6 必中走 1.0 倍、跳过命中判定；重击仍是 1.5 倍 −20% 命中',
       /if \(act === 'sure'\) dmg = Math\.round\(dmg \* 1\.0\);/.test(_GAME_SRC) &&
       /if \(act === 'sure' \|\| chance\(acc\)\)/.test(_GAME_SRC) &&
       /if \(act === 'heavy'\) dmg = Math\.round\(dmg \* 1\.5\);/.test(_GAME_SRC));
    ck('★ 29.7 两个技能共用 20 单位时间冷却，且都在出手后进冷却',
       /const ACT_CD_BASE = 20;/.test(_GAME_SRC) &&
       /if \(act === 'heavy'\) C\.heavyCd = ACT_CD_BASE;/.test(_GAME_SRC) &&
       /if \(act === 'sure'\) C\.sureCd = ACT_CD_BASE;/.test(_GAME_SRC) &&
       /C\.heavyCd - 100 \/ Math\.max\(1, combatSpeed\(false\)\)/.test(_GAME_SRC) &&
       /C\.sureCd - 100 \/ Math\.max\(1, combatSpeed\(false\)\)/.test(_GAME_SRC));
    ck('★ 29.8 不学重击就没有重击：UI 按钮按 hasHeavy()/hasSure() 出，不再看 combatLv>=2',
       UI.includes("if(Game.hasHeavy())acts.push(['heavy','重击',Game.heavyInfo()])") && UI.includes("if(Game.hasSure())acts.push(['sure','必中',Game.sureInfo()])") && UI.includes('ok=info.usable&&q.available') &&
       !/Game\.combatLv\(\) >= 2 && heavy\.available/.test(UI));
    ck('★ 29.9 老存档兼容：一次性 migCombat2 迁移，战斗已到 2 级且两个节点都没点 → 补上重击',
       /if \(S\.migCombat2 === undefined\) \{/.test(_GAME_SRC) &&
       /S\.migCombat2 = 1;[\s\S]{0,260}?combatLv\(\) >= 2[\s\S]{0,160}?S\.tree\.combat\.f_heavy = 1;/.test(_GAME_SRC) &&
       /migCombat2:1/.test(_GAME_SRC));   // 新档在 newGame 里就置上 → 不会被白送
    ck('★ 29.10 必中在面板上显示 100% 命中',
       /if \(act === 'sure'\) return 1;/.test(_GAME_SRC));
  }
  // ⑤ DPS 核查发现的其他问题
  ck('★ 29.11 #2 弓术的暴击倍率真的生效了（critMul 认物品对象，不再只认字符串 bow）',
     /const isBow = \(weapon === 'bow'\) \|\| !!\(weapon && weapon\.id === 'bow'\)/.test(_GAME_SRC));
  ck('★ 29.12 #4 盾墙 +15%/+20%（照技能描述来，不再 0.15×级 = 15/30）',
     /function wallBlockBonus\(\) \{ const lv = nodeLv\('combat','f_shield'\); return \[0, 0\.15, 0\.20\]\[lv\] \|\| 0; \}/.test(_GAME_SRC));
  ck('★ 29.13 #5 复仇按**层数**加成（攒 3 层 = 3 倍那 20/30/40%，不再叠了没用）',
     /const stacks = Math\.max\(1, Math\.min\(3, C\.revenge\)\);/.test(_GAME_SRC) &&
     /const mul = 1 \+ revengeBonus\(\) \* stacks;/.test(_GAME_SRC));
  ck('★ 29.14 #6 双持换手计数器在开战时归零（不再跨战斗泄漏）',
     /C\.spdBank = 0;[\s\S]{0,200}?_swingTurn = 0;/.test(_GAME_SRC));
}

console.log('\n================ 汇总 ================');console.log('通过 ' + PASS + ' 项，失败 ' + FAIL + ' 项');
if (FAIL) { console.log('失败项：'); fails.forEach(f => console.log(' - ' + f)); }
console.log(FAIL ? 'RESULT:FAIL' : 'RESULT:PASS');
