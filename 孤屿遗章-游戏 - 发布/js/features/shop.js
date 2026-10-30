/* shop：业务规则的唯一实现；Game 保留调用接口与装配。 */
const ShopRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const persistPair=(...args)=>deps.persistPair(...args);
    const rnd=(...args)=>deps.rnd(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const metaSave=(...args)=>deps.metaSave(...args);
    const metaState=(...args)=>deps.metaState(...args);
const SIGN_SOUL = 10, SIGN_BACKUP = 1;

function todayKey() {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

function dailySignState() {
    const m = metaState();
    const today = todayKey();
    return { canSign: m.lastSign !== today, lastSign: m.lastSign || '', today, soul: SIGN_SOUL, backup: SIGN_BACKUP, total: m.soul || 0, bp: backupPoints() };
  }

function walletEntry(meta, id, coins, soul = 0) {
    meta.adWallet = meta.adWallet || {};
    if (!meta.adWallet[id]) meta.adWallet[id] = {coins, soul};
  }

function adCoinBalance() {
    return Math.max(0, Object.values(metaState().adWallet || {}).reduce((sum,x)=>sum+(Number(x.coins) || 0),0));
  }

let walletSerial = 0;

function walletId() { return 'wallet:' + Date.now().toString(36) + ':' + (++walletSerial).toString(36) + ':' + Math.random().toString(36).slice(2); }

const AD_SHOP = [
    {id:'divineBow',item:'divineBow',cost:15}, {id:'divineArmor',item:'divineArmor',cost:15},
    {id:'divinePack',item:'divinePack',cost:15},
    {id:'namecard',item:'namecard',cost:3},
    {id:'satchel',relic:'satchel',cost:7}, {id:'atlantisSeed',relic:'atlantisSeed',cost:7}
  ];

function adCurrencyName() {
    const channel=typeof window!=='undefined'&&window.GUYU_CHANNEL;
    const standalone=channel?channel!=='taptap':typeof location!=='undefined'&&location.hostname==='appassets.androidplatform.net';
    return standalone?'星之点':'广告币';
  }

function adShopState() { return {coins:adCoinBalance(), goods:AD_SHOP.map(x=>({...x}))}; }

function buyAdShop(id) {
    const goods=AD_SHOP.find(x=>x.id===id);
    if (!goods) return {ok:false,reason:'该商品不存在。'};
    if (adCoinBalance()<goods.cost) return {ok:false,reason:`${adCurrencyName()}不足（需 ${goods.cost}）。`};
    const meta=JSON.parse(JSON.stringify(metaState())), receipt=walletId();
    walletEntry(meta,receipt,-goods.cost);
    meta.mailbox.push({item:goods.item || null,relic:goods.relic || null,qty:1,shopReceipt:receipt,title:'商城购买',date:todayKey()});
    const result=persistPair(gameState.run ? JSON.parse(JSON.stringify(gameState.run)) : null,meta,false);
    if (!result.ok) return result;
    if (gameState.run) change();
    return {ok:true,msg:`${(ITEMS[id] || RELICS[id]).name}已存入邮箱。`};
  }

function exchangeAdCoins(qty) {
    if (!Number.isSafeInteger(qty) || qty<1 || qty>adCoinBalance() || !Number.isSafeInteger(qty*15) || !Number.isSafeInteger((metaState().soul || 0)+qty*15)) return {ok:false,reason:`请选择有效的${adCurrencyName()}数量。`};
    const meta=JSON.parse(JSON.stringify(metaState()));
    walletEntry(meta,walletId(),-qty,qty*15); meta.soul=(meta.soul || 0)+qty*15;
    const result=persistPair(gameState.run ? JSON.parse(JSON.stringify(gameState.run)) : null,meta,false);
    if (!result.ok) return result;
    if (gameState.run) change();
    return {ok:true,msg:`${qty} ${adCurrencyName()}已兑换 ${qty*15} 魂点。`};
  }

function exchangeSoulForStars(qty) {
    if (!Number.isSafeInteger(qty) || qty < 1 || !Number.isSafeInteger(qty * 15)) return {ok:false,reason:'请选择有效的兑换数量。'};
    const cost = qty * 15, current = metaState();
    if (!Number.isSafeInteger(current.soul) || current.soul < cost) return {ok:false,reason:`魂点不足（需 ${cost} 魂点）。`};
    const meta = JSON.parse(JSON.stringify(current));
    // Soul debit is part of the existing wallet journal: old exports cannot undo payment.
    walletEntry(meta,walletId(),qty,-cost); meta.soul -= cost;
    const result = persistPair(gameState.run ? JSON.parse(JSON.stringify(gameState.run)) : null,meta,false);
    if (!result.ok) return result;
    if (gameState.run) change();
    return {ok:true,msg:`${cost} 魂点已兑换 ${qty} ${adCurrencyName()}。`};
  }

function adRewardState() {
    const today = todayKey(), m = metaState();
    const uses = Math.max(0, Math.min(5, Math.floor(Number((m.adRewardDays || {})[today]) || 0)));
    const reason = adCurrencyName() !== '广告币' ? '当前渠道不支持广告奖励。' : !gameState.run || gameState.run.death || gameState.run.ending ? '请在正在进行的游戏中领取。'
      : gameState.run.difficulty === 'legend' ? '传奇难度不领取广告物资。' : uses >= 5 ? '今天已领取 5 次，明天再来。' : '';
    return {today, uses, limit:5, min:3, max:6, canClaim:!reason, reason};
  }

function claimAdReward(runId, requestDay) {
    const info = adRewardState();
    if (!info.canClaim) return {ok:false, reason:info.reason};
    if (gameState.run._runId !== runId || info.today !== requestDay) return {ok:false, reason:'游戏或日期已变化，请重新观看后领取。'};
    const next = JSON.parse(JSON.stringify(gameState.run)), meta = JSON.parse(JSON.stringify(metaState()));
    const amount=rnd(info.min,info.max);
    meta.adRewardDays = meta.adRewardDays || {};
    meta.adRewardDays[info.today] = info.uses + 1;
    walletEntry(meta,`video:${info.today}:${info.uses+1}`,amount);
    const result = persistPair(next, meta, false);
    if (!result.ok) return result;
    log(`完整观看视频，获得 ${amount} 广告币。`, 'good'); change();
    return {ok:true, amount};
  }

function dailySign() {
    const m = metaState();
    const today = todayKey();
    if (m.lastSign === today) return { ok:false, reason:'今天已经签到过了，明天再来～' };
    m.lastSign = today;
    m.soul = (m.soul || 0) + SIGN_SOUL;
    m.backupPoints = backupPoints() + SIGN_BACKUP;
    metaSave();
    return { ok:true, soul: SIGN_SOUL, backup: SIGN_BACKUP, total: m.soul, bp: m.backupPoints };
  }

function backupPoints() { const m = metaState(); return m.backupPoints === undefined ? 3 : m.backupPoints; }

const SKIN_COST = 50;

function skinCost() { return SKIN_COST; }

function skinOwned(id) {
    if (id === 'ink') return true;                 // 墨白原味永远免费
    const m = metaState();
    if (id === 'seasons') {
      // 全彩地图包永久免费；旧版已解锁的玩家照常保留，无需改动账号或魂点存档。
      return true;
    }
    return !!(m.skins && m.skins[id]);
  }

function unlockSkin(id) {
    if (!id || id === 'ink' || skinOwned(id)) return { ok:true, already:true, cost:0 };
    const m = metaState();
    if ((m.soul || 0) < SKIN_COST) return { ok:false, reason:`魂点不足（需要 ${SKIN_COST}，现有 ${m.soul || 0}）` };
    m.soul -= SKIN_COST;
    m.skins = m.skins || {};
    m.skins[id] = 1;
    metaSave();
    return { ok:true, cost:SKIN_COST, soul:m.soul };
  }
    return Object.freeze({todayKey,dailySignState,walletEntry,adCoinBalance,walletId,adCurrencyName,adShopState,buyAdShop,exchangeAdCoins,exchangeSoulForStars,adRewardState,claimAdReward,dailySign,backupPoints,skinCost,skinOwned,unlockSkin});
  }
  return Object.freeze({create});
})();
