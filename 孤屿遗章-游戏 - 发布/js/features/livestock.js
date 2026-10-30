/* livestock：业务规则的唯一实现；Game 保留调用接口与装配。 */
const LivestockRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const rnd=(...args)=>deps.rnd(...args);
    const chance=(...args)=>deps.chance(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const hasItem=(...args)=>deps.hasItem(...args);
    const removeItem=(...args)=>deps.removeItem(...args);
    const warehouseCapacity=(...args)=>deps.warehouseCapacity(...args);
    const deliverToBag=(...args)=>deps.deliverToBag(...args);
    const supplyRecords=(...args)=>deps.supplyRecords(...args);
    const supplyCount=(...args)=>deps.supplyCount(...args);
    const takeSupply=(...args)=>deps.takeSupply(...args);
const LIVE_CAP = 3, CHICK_DAYS = 5, SHEEP_MEAT = 3, HEN_MEAT = 1;

function coopCap() { return LIVE_CAP + (gameState.run.coopExt || 0); }

function liveCap(kind) { return kind === 'coop' ? coopCap() : LIVE_CAP; }

function liveState() {
    if (!gameState.run.livestock || typeof gameState.run.livestock !== 'object') gameState.run.livestock = { pen: [], coop: [], autoFeed: true };
    const L = gameState.run.livestock;
    if (!Array.isArray(L.pen)) L.pen = [];
    if (!Array.isArray(L.coop)) L.coop = [];
    if (L.autoFeed === undefined) L.autoFeed = true;
    return L;
  }

function liveCount(kind) { return liveState()[kind].length; }

function liveFull(kind) { return liveCount(kind) >= liveCap(kind); }

function liveInfo(kind) {
    const L = liveState();
    const isPen = kind === 'pen';
    const feedId = isPen ? 'hay' : 'wheat';
    return {
      kind, isPen, built: !!gameState.run.furniture[kind], cap: liveCap(kind), count: L[kind].length, autoFeed: L.autoFeed,
      ext: (kind === 'coop' ? (gameState.run.coopExt || 0) : 0), extMax: deps.COOP_EXT_MAX,
      feedId, feedName: ITEMS[feedId].name, feedHave:supplyCount(feedId,'island'), feedBag:supplyCount(feedId), feedStore:warehouseCapacity('island')>0?supplyRecords(feedId,'island').reduce((n,x)=>n+x.qty,0):0, feedNeed:L[kind].length,
      list: L[kind].map(a => (isPen || a.type === 'hen')
        ? { label: isPen ? '羊' : '母鸡', text: `第 ${a.age} 天 / 寿终约 ${a.life} 天` }
        : { label: '小鸡', text: `小鸡 · 已喂 ${a.days}/${CHICK_DAYS} 天小麦` }),
    };
  }

function addSheep() {
    const L = liveState();
    if (!gameState.run.furniture.pen) return { ok:false, reason:'你还没有羊圈。' };
    if (liveFull('pen')) return { ok:false, reason:`羊圈已满（最多 ${LIVE_CAP} 只）。` };
    L.pen.push({ age: 0, life: rnd(40, 60) });
    change();
    return { ok:true, count: L.pen.length };
  }

function addChick() {
    const L = liveState();
    if (!gameState.run.furniture.coop) return { ok:false, reason:'你还没有鸡舍。' };
    if (liveFull('coop')) {
      const canExt = (gameState.run.coopExt || 0) < deps.COOP_EXT_MAX;
      return { ok:false, reason:`鸡舍已满（最多 ${coopCap()} 只）。` + (canExt ? '在鸡舍管理里「扩建」可以再多养一只。' : '') };
    }
    if (!hasItem('chick')) return { ok:false, reason:'背包里没有小鸡（外岛杂货商有卖）。' };
    removeItem('chick', 1);
    L.coop.push({ type:'chick', days:0, age:0, life: rnd(20, 30) });
    change();
    return { ok:true, count: L.coop.length };
  }

function toggleAutoFeed() { const L = liveState(); L.autoFeed = !L.autoFeed; change(); return L.autoFeed; }

function livestockNewDay() {
    const L = liveState();
    const o = { wool:0, egg:0, meat:0, grown:0, deadSheep:0, deadHen:0, lackHay:0, lackWheat:0, hayUsed:0, wheatUsed:0 };
    for (let i = L.pen.length - 1; i >= 0; i--) {
      const a = L.pen[i];
      if (!L.autoFeed || supplyCount('hay','island')<1) { o.lackHay++; continue; }
      takeSupply('hay',1,'island'); a.age++; o.wool++; o.hayUsed++;
      if (a.age >= a.life) { L.pen.splice(i, 1); o.deadSheep++; o.meat += SHEEP_MEAT; }
    }
    for (let i = L.coop.length - 1; i >= 0; i--) {
      const b = L.coop[i];
      if (!L.autoFeed || supplyCount('wheat','island')<1) { o.lackWheat++; continue; }
      takeSupply('wheat',1,'island');
      o.wheatUsed++;
      if (b.type === 'chick') { b.days++; if (b.days >= CHICK_DAYS) { b.type = 'hen'; b.age = 0; b.life = rnd(20, 30); o.grown++; } }
      else { b.age++; o.egg++; if (b.age >= b.life) { L.coop.splice(i, 1); o.deadHen++; o.meat += HEN_MEAT; } }
    }
    if (o.wool) deliverToBag('wool', o.wool);
    if (o.egg) deliverToBag('egg', o.egg);
    if (o.meat) deliverToBag('meat', o.meat);
    const parts = [];
    if (o.hayUsed) parts.push(`羊吃草 ${o.hayUsed}（羊毛+${o.wool}）`);
    if (o.wheatUsed) parts.push(`鸡吃小麦 ${o.wheatUsed}（鸡蛋+${o.egg}）`);
    if (o.grown) parts.push(`小鸡长大×${o.grown}`);
    if (o.meat) parts.push(`兽肉+${o.meat}`);
    if (parts.length) log('牧场日报：' + parts.join(' · ') + '。', 'good');
    if (o.deadSheep) log(`羊圈里有 ${o.deadSheep} 只羊寿终正寝，留下了兽肉。`, 'sys');
    if (o.deadHen) log(`鸡舍里有 ${o.deadHen} 只母鸡寿终，留下了兽肉。`, 'sys');
    if (!L.autoFeed) { if (liveCount('pen') + liveCount('coop')) log('牧场自动喂食已关闭：今天没消耗饲料，也没有产出。', 'warn'); }
    else {
      if (o.lackHay) log(`干草不足：${o.lackHay} 只羊今天没吃上，没有产毛（羊不会饿死，补上干草即可）。`, 'warn');
      if (o.lackWheat) log(`小麦不足：${o.lackWheat} 只鸡今天没吃上，没有下蛋（鸡不会饿死，补上小麦即可）。`, 'warn');
    }
    // 结构化返回：给"每日晨报"弹窗用（见 newDay 里的 collectDailyReport）
    return {
      enabled: true, autoFeed: !!L.autoFeed,
      pen: liveCount('pen'), coop: liveCount('coop'),
      hayUsed: o.hayUsed, wool: o.wool, lackHay: o.lackHay,
      wheatUsed: o.wheatUsed, egg: o.egg, lackWheat: o.lackWheat,
      grown: o.grown, meat: o.meat, deadSheep: o.deadSheep, deadHen: o.deadHen,
      parts,
    };
  }

function resolveTrapDaily() {
    if (!gameState.run.traps || !(gameState.run.traps.placed > 0)) return null;
    if (gameState.run.day <= (gameState.run.traps.day || 0)) return { waiting: true, placed: gameState.run.traps.placed };   // 当天布下的要等第二天
    if (!chance(0.5)) return { caught: false, placed: gameState.run.traps.placed };
    return { caught: true, placed: gameState.run.traps.placed };
  }

function claimDailyTrap(kind) {
    const r = gameState.run.dailyReport && gameState.run.dailyReport.trap;
    if (!r || !r.caught || r.done) return { ok:false, reason:'没有待处理的陷阱收获。' };
    r.done = true;
    if (kind === 'kill') {
      deliverToBag('meat', 2); deliverToBag('hide', 1);
      if (gameState.run.traps) gameState.run.traps.placed = Math.max(0, gameState.run.traps.placed - 1);
      log('你结束了它的挣扎，收获兽肉×2、兽皮×1。', 'good');
      change();
      return { ok:true, msg:'收获兽肉×2、兽皮×1' };
    }
    const a = addSheep();
    if (gameState.run.traps) gameState.run.traps.placed = Math.max(0, gameState.run.traps.placed - 1);
    if (a.ok) log(`羊羔被牵回羊圈，现在羊圈里有 ${a.count} 只羊。`, 'good');
    else log(`${a.reason}只能把它放了。`, 'warn');
    change();
    return { ok:true, msg: a.ok ? '羊羔进羊圈了' : a.reason };
  }

function collectDailyReport() {
    const rep = { day: gameState.run.day, ranch: null, trap: null };
    rep.ranch = livestockNewDay();          // 牧场（内部会写日志）
    rep.trap = resolveTrapDaily();
    gameState.run.dailyReport = rep;
    return rep;
  }
    return Object.freeze({coopCap,liveCap,liveState,liveCount,liveFull,liveInfo,addSheep,addChick,toggleAutoFeed,livestockNewDay,resolveTrapDaily,claimDailyTrap,collectDailyReport});
  }
  return Object.freeze({create});
})();
