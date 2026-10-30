/* trading：业务规则的唯一实现；Game 保留调用接口与装配。 */
const TradingRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const invCount=(...args)=>deps.invCount(...args);
    const hasItem=(...args)=>deps.hasItem(...args);
    const notifyBagFull=(...args)=>deps.notifyBagFull(...args);
    const addItem=(...args)=>deps.addItem(...args);
    const removeItem=(...args)=>deps.removeItem(...args);
    const gainItem=(...args)=>deps.gainItem(...args);
    const seasonInfo=(...args)=>deps.seasonInfo(...args);
    const isNight=(...args)=>deps.isNight(...args);
    const diaryAdd=(...args)=>deps.diaryAdd(...args);
    const supplyCount=(...args)=>deps.supplyCount(...args);
    const takeSupply=(...args)=>deps.takeSupply(...args);
    const merchantSupplySites=(...args)=>deps.merchantSupplySites(...args);
    const merchantSellCount=(...args)=>deps.merchantSellCount(...args);
    const materialSupplySites=(...args)=>deps.materialSupplySites(...args);
    const matsOk=(...args)=>deps.matsOk(...args);
    const takeMats=(...args)=>deps.takeMats(...args);
    const fitsInBag=(...args)=>deps.fitsInBag(...args);
function seasonPriceMul() { const s = seasonInfo(); return s.name === '冬' ? 1.2 : (s.name === '秋' ? 1.0 : 0.9); }

function fameDisc() { return gameState.run.fame >= 2 ? 0.9 : (gameState.run.fame >= 1 ? 0.95 : 1); }

const SELL_SUP = 0.7;

function priceOf(base, isBuyFromPlayer, id, currency) {
    let p = base;
    if (!isBuyFromPlayer) p = Math.round(base * seasonPriceMul() * fameDisc());
    else {
      p = Math.round(base * seasonPriceMul() * SELL_SUP);
      // 冬季溢价：兽皮之类冬天行情好（数据里给物品标 winter 倍率，例：兽皮 ×1.5）
      if (ITEMS[id] && ITEMS[id].winter && seasonInfo().name === '冬') p = Math.round(p * ITEMS[id].winter);
    }
    return Math.round(p * priceJitter(id) / 100);
  }

function priceJitter(id) {
    let h = 0;
    const s = String(id || '') + '#' + (gameState.run.day || 1);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003;
    return 90 + (h % 21);   // 90 ~ 110
  }

function sellToMerchant(id, qty, list, isBlack, isTown) {
    // 剧情遗物可在旧档中补领；禁止出售，避免回祭坛反复领取刷贝壳币。
    if (id === 'relic') { log('遗物是祭坛仪式的关键物品，不能出售。', 'warn'); return; }
    const entry = list.find(e => e.id === id);
    if (!entry) return;
    if (merchantSellCount(id,list)<qty) { log('货物不够。', 'warn'); return; }
    const price = priceOf(entry.base, true, id);
    // ⚠️ 背包满了就别卖：否则货扣了、贝壳币却塞不进去 → 货凭空消失
    const gain = price * qty;
    if (!fitsInBag({ beibi: gain })) { log('背包塞不下货款——先腾出一格再卖。', 'warn'); notifyBagFull(); return; }
    if(!takeSupply(id,qty,merchantSupplySites(list)))return;
    gameState.run.sold[id] = (gameState.run.sold[id] || 0) + qty;   // 仅留存销量统计，当前不参与定价
    addItem('beibi', gain);
    log(`卖出 ${ITEMS[id].name}×${qty}，获得贝壳币×${gain}。`, 'good');
    if (id === 'anctDevice') {
      gameState.run.atlantis = gameState.run.atlantis || {}; gameState.run.atlantis.whispers = (gameState.run.atlantis.whispers || 0) + qty;
      const W = ['「这不是装饰……这是钥匙。城里还有同一套的锁。」','「刻文说，灯塔烧的不是油，是记忆。」','「有人已经下去过——而且没打算回来。」','「……你是来归还的，还是来搬空的？」'];
      log('情报贩子摩挲着装置，压低声音翻译：' + W[Math.min(gameState.run.atlantis.whispers - 1, W.length - 1)], 'blue');
    }
    change();
  }

function buyFromMerchant(id, qty, list, isBlack) {
    const entry = list.find(e => e.id === id);
    if (!entry) return;
    // 图纸是"学会"而不是囤货：每种图纸全局只卖一次，且不允许一次买多份
    const isBp = entry.kind === 'bp' || (ITEMS[id] && ITEMS[id].cat === 'bp');
    if (isBp && hasItem(id)) { log(`${ITEMS[id].name}只需要一份，你已经有了。`, 'warn'); return; }
    if (isBp) qty = 1;
    const currency = entry.currency || 'beibi';
    const price = priceOf(entry.base, false, id);
    const curName = currency === 'coin' ? '金币' : '贝壳币';
    let n = qty, cost = price * n;
    if (!hasItem(currency, cost)) {
      // 兜底：买不起这么多就自动降到买得起的最大数量，避免"点了没反应"
      n = Math.floor(invCount(currency) / Math.max(1, price));
      if (n <= 0) { log(`${curName}不够（每个 ${price}，需要 ${price * qty}）。`, 'warn'); return; }
      cost = price * n;
      log(`${curName}只够买 ${n} 个，已按 ${n} 个结算。`, 'warn');
    }
    // ⚠️ 背包满了就别扣钱：**在扣钱之前**先确认货装得下（把即将扣掉的货币一起算进去），
    //    免得钱花了、东西却没到手。（不要"先扣再退"——removeItem 会触发待收补发，数字会漂）
    if (!fitsInBag({ [id]: n }, { [currency]: cost })) {
      log(`背包塞不下 ${ITEMS[id].name}——先腾出空位再买。`, 'warn'); notifyBagFull(); return;
    }
    removeItem(currency, cost);
    gainItem(id, n);
    log(`购入 ${ITEMS[id].name}×${n}，花费${curName}×${cost}。`, 'good');
    if(id==='seachart')log('海图指向更远的海面；先确认船坞等级，再到地图选择航线。海图不会自动升级船只。','sys');
    change();
  }

const FISHMAN_DEALS = [
    { id:'spear', item:'bpSourceSpear', name:'源质长枪图纸', need:{ goldIngot:4, tideSteel:4 } },
    { id:'armor', item:'bpSourceArmor', name:'源质重甲图纸', need:{ goldIngot:5, shipPlate:3 } },
    // relic:1 表示换的是**神物**（发到 S.relics，不是背包物品）—— 亚特兰蒂斯之种的游戏内交换来源（商城也可购买）
    { id:'seed',  relic:'atlantisSeed', name:'神物 · 亚特兰蒂斯之种', need:{ goldIngot:8, anctDevice:3, deepCoral:6 } },
    { id:'storage', capacity:20, name:'海底储物箱扩容 · +20格', need:{ goldIngot:12, sourceBar:8, tideSteel:6 } },
  ];

function fishmanTraded() { return (gameState.run.atlantis && gameState.run.atlantis.fishmanTraded) || {}; }

function fishmanDeals() {
    // ⚠️ 作者 2026-09-24 反馈："为什么人鱼我根本没交易却显示已经换过了" ——
    //    以前把"我在这台鱼人这儿换过"和"我手上已经有这件东西"混成了一个 traded 字段：
    //      traded: !!fishmanTraded()[d.id] || (d.relic ? S.relics.includes(...) : hasItem(d.item))
    //    于是**从交易机买过图纸**、或**兑换码拿过之种**的档，都会显示成"已经换过了"（其实压根没换）。
    //    现在拆成两个：
    //      traded = 真的在鱼人这儿换过（S.atlantis.fishmanTraded）
    //      owned  = 从别的途径已经有了（图纸看背包，神物看 S.relics）
    //    两者都**不再提供交换入口**（免得换重复、白扣材料），但界面文案必须各说各的。
    return FISHMAN_DEALS.map(d => ({
      ...d,
      traded: !!fishmanTraded()[d.id],
      owned: d.capacity ? !!(gameState.run.atlantis && gameState.run.atlantis.fishmanStorage) : d.relic ? (gameState.run.relics || []).includes(d.relic) : hasItem(d.item),
      need: { ...d.need },
    }));
  }

function fishmanBarter(dealId) {
    const deal = FISHMAN_DEALS.find(d => d.id === dealId);
    if (!deal) return { ok:false, reason:'鱼人没有这样东西。' };
    if (fishmanTraded()[deal.id]) return { ok:false, reason:'这个已经换过了，没什么好换的了。' };
    // 神物：已获得就不给重复
    if (deal.capacity) { if (gameState.run.atlantis && gameState.run.atlantis.fishmanStorage) return {ok:false,reason:'你已获得这次海底储物箱扩容。'}; }
    else if (deal.relic) { if ((gameState.run.relics || []).includes(deal.relic)) return { ok:false, reason:'这个神物你早就有了。' }; }
    else if (hasItem(deal.item)) return { ok:false, reason:'你已经有了这张图纸，不需要再换。' };
    for (const id in deal.need) {
      if (!hasItem(id, deal.need[id])) return { ok:false, reason:`材料不足：${ITEMS[id].name}×${deal.need[id]}（你只有 ${invCount(id)}）。` };
    }
    for (const id in deal.need) removeItem(id, deal.need[id]);
    if (deal.capacity) {
      gameState.run.atlantis = gameState.run.atlantis || {};
      gameState.run.atlantis.fishmanStorage = deal.capacity;
      log('神秘人鱼为你的海底储物箱增加了20格容量，建好储物箱后生效。', 'good');
    } else if (deal.relic) {
      gameState.run.relics = gameState.run.relics || [];
      gameState.run.relics.push(deal.relic);
      log(`你获得了神物【${RELICS[deal.relic].name}】——${RELICS[deal.relic].desc}`, 'good');
    } else {
      gainItem(deal.item, 1);
    }
    gameState.run.atlantis = gameState.run.atlantis || {}; gameState.run.atlantis.fishmanTraded = gameState.run.atlantis.fishmanTraded || {};
    gameState.run.atlantis.fishmanTraded[deal.id] = 1;
    log(deal.capacity ? '人鱼接过材料，替你扩好了储物舱。' : `人鱼接过你的东西，把【${deal.name}】放进你手里。`, 'good');
    log('她轻声低语，鳞片在暗处闪了闪。', 'sys');
    change();
    return { ok:true };
  }

function laochaoAvailable() { return gameState.run.scene === 'camp' && gameState.run.laochao.arrived && !isNight(); }

function signalFlag() {
    if (!gameState.run.furniture.flag) { log('需要先建信号旗。', 'warn'); return; }
    if (!matsOk({ wood:5 })) { log('需要木材×5 作为狼烟燃料。', 'warn'); return; }
    takeMats({wood:5});
    gameState.run.laochao.nextVisit = gameState.run.day + 1;
    gameState.run.flags.flagSignal = 1;
    log('你升起信号旗，狼烟飘向海面。老潮明天就会靠岸（货少价高）。', 'good');
    change();
  }

function doFirstTrade() {
    if (gameState.run.flags.firstTrade) { log('这笔生意已经做过了。', 'warn'); return; }
    if (supplyCount('smokedFish',gameState.run.scene==='camp'?materialSupplySites():[])<10) { log('需要 10 条熏鱼。', 'warn'); return; }
    takeSupply('smokedFish',10,gameState.run.scene==='camp'?materialSupplySites():[]);
    gainItem('salt', 1); gainItem('ironingot', 4); gainItem('seedCarrot', 1);
    gameState.run.flags.firstTrade = 1;
    log('老潮掂了掂你的熏鱼，咧嘴一笑："爽快！以后常来照顾生意。"', 'good');
    log('获得：盐×1、铁锭×4、萝卜种子×1。', 'good');
    log('老潮指了指铁锭：先打把铁斧，木板能省下不少。往后修好船，去盐镇看看。','sys');
    diaryAdd('第一笔生意：十条熏鱼，换来了盐、铁锭和种子。');
    change();
  }

function acceptCommission(c) {
    if (!c || !commissions().some(x => commissionKey(x) === commissionKey(c))) return { ok:false, reason:'这份季度委托已经过期。' };
    gameState.run.laochao.accepted = gameState.run.laochao.accepted || {};
    const key = commissionKey(c);
    if (gameState.run.laochao.done[key]) return { ok:false, reason:'委托已完成' };
    const a = gameState.run.laochao.accepted[key];
    if (a !== undefined && gameState.run.day <= a + 2) return { ok:false, reason:`委托进行中（第${a}~${a+2}天）` };
    gameState.run.laochao.accepted[key] = gameState.run.day;
    log(`你接下了委托「${c.name}」：${c.text}（持续 3 天）`, 'good');
    change();
    return { ok:true, day: gameState.run.day };
  }

function commissions() {
    const season = seasonInfo().name;
    const pool = SEASONAL_COMMISSIONS[season] || [];
    const quarter = Math.floor((gameState.run.day - 1) / 15);
    const seed = String(gameState.run._runId || '') + ':' + quarter;
    let hash = 2166136261;
    for (const ch of seed) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
    const seasonal = pool.length ? [{ ...pool[(hash >>> 0) % pool.length], seasonal:true, quarter }] : [];
    return LAOCHAO.commissions.concat(seasonal);
  }

function commissionKey(c) { return c.seasonal ? `${c.id}@${c.quarter}` : c.id; }

function commissionDone(c) { return !!(gameState.run.laochao.done || {})[commissionKey(c)]; }

function commissionAccepted(c) { return (gameState.run.laochao.accepted || {})[commissionKey(c)]; }

function completeCommission(c) {
    if (!c || !commissions().some(x => commissionKey(x) === commissionKey(c))) { log('这份季度委托已经过期。', 'warn'); return; }
    const key = commissionKey(c);
    if (gameState.run.laochao.done[key]) return;
    if (c.type === 'kill') {
      if (gameState.run.flags['boss_'+c.target]) {
        gameState.run.laochao.done[key] = 1;
        grantReward(c);
      } else log('任务目标还活着。', 'warn');
      return;
    }
    const sites=gameState.run.scene==='camp'?materialSupplySites():[];
    for (const k in c.need) if (supplyCount(k,sites)<c.need[k]) { log(`还差 ${ITEMS[k].name}。`, 'warn'); return; }
    for (const k in c.need) takeSupply(k,c.need[k],sites);
    gameState.run.laochao.done[key] = 1;
    grantReward(c);
  }

function grantReward(c) {
    for (const k in c.reward) {
      if (k === 'fame') { gameState.run.fame = Math.min(5, Math.round((gameState.run.fame + c.reward[k]) * 100) / 100); log(`盐镇声望提升！`, 'good'); }
      else gainItem(k, c.reward[k]);
    }
    const names = Object.entries(c.reward).map(([k,v]) => k==='fame' ? `声望+${v}` : `${ITEMS[k].name}×${v}`).join('、');
    log(`委托完成！获得：${names}。`, 'good');
    change();
  }

function exchangeShells(n) {
    const amount = Math.max(1, Math.min(n || 1, Math.floor(invCount('beibi') / deps.SHELL_PER_COIN)));
    if (amount < 1 || invCount('beibi') < deps.SHELL_PER_COIN) return { ok:false, reason:`贝壳不足：${deps.SHELL_PER_COIN} 贝壳才能换 1 金币。` };
    removeItem('beibi', amount * deps.SHELL_PER_COIN);
    addItem('coin', amount, true);
    log(`你用 ${amount * deps.SHELL_PER_COIN} 贝壳向老潮兑换了 ${amount} 枚金币。`, 'good');
    change();
    return { ok:true, amount };
  }

function exchangeGold(n) {
    const amount = Math.max(1, Math.min(n || 1, invCount('coin')));
    if (amount < 1 || invCount('coin') < 1) return { ok:false, reason:'金币不足：至少要 1 枚金币才能换贝壳。' };
    removeItem('coin', amount);
    addItem('beibi', amount * deps.SHELL_FOR_COIN, true);
    log(`你用 ${amount} 枚金币向老潮换了 ${amount * deps.SHELL_FOR_COIN} 枚贝壳。`, 'good');
    change();
    return { ok:true, amount };
  }
    return Object.freeze({seasonPriceMul,fameDisc,priceOf,priceJitter,sellToMerchant,buyFromMerchant,fishmanTraded,fishmanDeals,fishmanBarter,laochaoAvailable,signalFlag,doFirstTrade,acceptCommission,commissions,commissionKey,commissionDone,commissionAccepted,completeCommission,grantReward,exchangeShells,exchangeGold});
  }
  return Object.freeze({create});
})();
