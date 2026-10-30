/* lottery：业务规则的唯一实现；Game 保留调用接口与装配。 */
const LotteryRules = (() => {
  function create(deps) {
    const adCurrencyName=(...args)=>deps.adCurrencyName(...args);
    const gameState=deps.gameState;
    const persistPair=(...args)=>deps.persistPair(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const invCount=(...args)=>deps.invCount(...args);
    const hasItem=(...args)=>deps.hasItem(...args);
    const addItem=(...args)=>deps.addItem(...args);
    const removeItem=(...args)=>deps.removeItem(...args);
    const syncToolkit=(...args)=>deps.syncToolkit(...args);
    const metaSave=(...args)=>deps.metaSave(...args);
    const updateMailCheckpoint=(...args)=>deps.updateMailCheckpoint(...args);
    const metaState=(...args)=>deps.metaState(...args);
    const todayKey=(...args)=>deps.todayKey(...args);
    const walletEntry=(...args)=>deps.walletEntry(...args);
const LOTTERY_ZONES = ['city','coral','shipwreck','coralForest','pearlCave','trench'];

function migrateRedeemReceipts(meta) {
    meta.adDelivered=meta.adDelivered || {};
    const pending=new Set();
    for(const mail of (meta.mailbox || [])) {
      const code=String(mail.code || '').toUpperCase(),entry=REDEEM_CODES[code];
      if(!entry)continue;
      const gifts=entry.mails || [entry];
      const i=gifts.findIndex(g=>(g.item || null)===(mail.item || null)&&(g.relic || null)===(mail.relic || null)&&(g.soul || 0)===(mail.soul || 0)&&(g.adCoins || 0)===(mail.adCoins || 0)&&(g.qty || 1)===(mail.qty || 1));
      if(i<0)continue;
      mail.shopReceipt=mail.shopReceipt || `redeem:${code}:${i}`;
      pending.add(mail.shopReceipt);
    }
    for(const code of Object.keys(meta.redeemed || {})) {
      if(!meta.redeemed[code] || !REDEEM_CODES[code])continue;
      (REDEEM_CODES[code].mails || [REDEEM_CODES[code]]).forEach((g,i)=>{
        const key=`redeem:${code}:${i}`;
        if(!pending.has(key))meta.adDelivered[key]=1;
      });
    }
  }

function mergeLotteryHistory(target,local) {
    target.challengeUnlocked = !!(target.challengeUnlocked || local.challengeUnlocked);
    target.nightmareRuns=target.nightmareRuns || {};
    for(const [id,track] of Object.entries(local.nightmareRuns || {})) {
      const prev=target.nightmareRuns[id];
      if(!prev)target.nightmareRuns[id]=JSON.parse(JSON.stringify(track));
      else {prev.consumed=Math.max(prev.consumed||0,track.consumed||0);prev.sequence=Math.max(prev.sequence||prev.consumed,track.sequence||track.consumed||0);prev.consumedByTier=prev.consumedByTier||{};for(const [tier,n]of Object.entries(track.consumedByTier||{}))prev.consumedByTier[tier]=Math.max(prev.consumedByTier[tier]||0,n);}
    }
    migrateRedeemReceipts(target);migrateRedeemReceipts(local);
    for (const [id,entry] of Object.entries(local.adWallet || {})) if (!(target.adWallet || {})[id] && entry.soul) target.soul = (target.soul || 0) + entry.soul;
    target.soul = Math.max(0, target.soul || 0);
    target.adWallet = Object.assign({}, target.adWallet || {}, local.adWallet || {});
    target.adDelivered = Object.assign({}, target.adDelivered || {}, local.adDelivered || {});
    const mail = target.mailbox || (target.mailbox = []);
    for (const gift of (local.mailbox || [])) if (gift.shopReceipt && !target.adDelivered[gift.shopReceipt] && !mail.some(x=>x.shopReceipt===gift.shopReceipt)) mail.push(JSON.parse(JSON.stringify(gift)));
    target.mailbox = mail.filter(x=>!x.shopReceipt || !target.adDelivered[x.shopReceipt]);
    target.adRewardDays = target.adRewardDays || {};
    for (const [day, uses] of Object.entries(local.adRewardDays || {})) {
      target.adRewardDays[day] = Math.max(Number(target.adRewardDays[day]) || 0, Number(uses) || 0);
    }
    target.lotteryRuns=target.lotteryRuns || {};
    for(const [id,track] of Object.entries(local.lotteryRuns || {})) {
      const incoming=target.lotteryRuns[id];
      if(!incoming || Math.max(track.revision || 0,track.nonce || 0)>=Math.max(incoming.revision || 0,incoming.nonce || 0)) target.lotteryRuns[id]=JSON.parse(JSON.stringify(track));
    }
    target.lotteryBowAwarded=target.lotteryBowAwarded || local.lotteryBowAwarded || 0;
    target.redeemed=Object.assign({},target.redeemed || {},local.redeemed || {});
    target.remoteRedeemOwners=Object.assign({},target.remoteRedeemOwners || {},local.remoteRedeemOwners || {});
  }

function lotteryHash(value) {
    let h = 2166136261;
    for (const ch of String(value)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

function lotteryAccount(m, create) {
    if (!gameState.run) return null;
    const all = m.lotteryRuns || (create ? (m.lotteryRuns = {}) : {});
    const key = gameState.run._runId || `legacy-${gameState.run.identity}-${gameState.run.day}`;
    if (create && !all[key]) all[key] = {meter:0,nonce:0,lastDay:0,uses:0,bow:0,relic:0};
    return all[key] || {meter:0,nonce:0,lastDay:0,uses:0,bow:0,relic:0};
  }

function lotteryValue(id) {
    const it = ITEMS[id]; if (!it) return 0;
    if (id === 'beibi') return 1;
    if (id === 'coin') return 50;
    if (Number(it.price) > 0) return Math.min(500, Math.max(1, Math.round(it.price)));
    const base = {food:12,drink:10,med:35,mat:12,special:45,seed:15,
      tool:75,weapon:110,armor:120,cloth:90,accessory:90,bp:150,currency:1};
    return base[it.cat] || 12;
  }

function lotteryChance() { return 0.10; }

const LOTTERY_COST = 100, LOTTERY_PITY_DRAWS = 10;

const LOTTERY_DAILY_LIMIT = 200, LOTTERY_BATCH_LIMIT = 50;

const LOTTERY_POOLS = [
    {id:'common',name:'普通',weight:70,items:['wood','honey','adCoins']},
    {id:'rare',name:'稀有',weight:25,items:['lotusPill','tideVitalPill','abyssBreathPill','bpBlack','bpLotus','bpDive','bpCoralBlade','bpPistol']},
    {id:'epic',name:'史诗',weight:5,items:['vampire','dodge','satchel','bloodvest','divineBow']}
  ];

function lotteryPools() { return LOTTERY_POOLS.map(p=>({...p,items:p.items.slice()})); }

function lotteryRandom(run, nonce, label) {
    let h=lotteryHash(`${run}:${nonce}:v2:${label}`);
    h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;
    return (h>>>0)/4294967296;
  }

function lotteryBalance(a) { return Math.max(0,Math.floor(Number(a.credit === undefined ? a.meter : a.credit) || 0)); }

function reconcileLotteryInputs() {
    if (!gameState.run) return false;
    const consumed=lotteryAccount(metaState(),false).consumed;
    if (!consumed || typeof consumed!=='object') return false;
    gameState.run.lottery=gameState.run.lottery || {};
    const paid=gameState.run.lottery.consumed=gameState.run.lottery.consumed || {};
    let outstanding=false;
    for (const [id,total] of Object.entries(consumed)) {
      if (!ITEMS[id] || !Number.isSafeInteger(total) || total<0) continue;
      const already=Math.max(0,Math.floor(Number(paid[id]) || 0)), owed=Math.max(0,total-already);
      const take=Math.min(owed,invCount(id));
      if (take && removeItem(id,take)) {
        paid[id]=already+take;
        if(!invCount(id) && gameState.run.equipment)for(const slot of Object.keys(gameState.run.equipment))if(gameState.run.equipment[slot]===id)gameState.run.equipment[slot]=null;
        syncToolkit();
      }
      if (owed>take) outstanding=true;
    }
    return outstanding;
  }

function lotteryState() {
    if (!gameState.run || gameState.run.scene !== 'atlantis') return {active:false};
    const roll=lotteryHash(`${gameState.run._runId || 'old'}:${gameState.run.day}:machine`), a=lotteryAccount(metaState(),false);
    return {active:roll%10<7,zone:LOTTERY_ZONES[roll%LOTTERY_ZONES.length],
      credit:lotteryBalance(a),misses:Math.max(0,Math.min(9,Number(a.misses) || 0)),
      meter:a.meter || 0,pity:a.pity || 0,
      uses:a.lastDay>gameState.run.day ? LOTTERY_DAILY_LIMIT : a.lastDay===gameState.run.day ? a.uses || 0 : 0,
      cost:LOTTERY_COST,pityLimit:LOTTERY_PITY_DRAWS,limit:LOTTERY_DAILY_LIMIT,batchLimit:LOTTERY_BATCH_LIMIT,baseChance:0.10};
  }

function lotteryOffer(id, qty, times=1) {
    times=Number(times);
    if (!Number.isSafeInteger(times) || times<1 || times>LOTTERY_BATCH_LIMIT) return {ok:false,reason:'每批请选择 1～50 抽。'};
    return lotteryPut(id,qty,times);
  }

function lotteryDeposit(id, qty) { return lotteryPut(id,qty,0); }

function lotteryPut(id, qty, times) {
    qty=Number(qty);
    if (!ITEMS[id] || !Number.isSafeInteger(qty) || qty<1 || !hasItem(id,qty)) return {ok:false,reason:'请选择有效的投入数量。'};
    const value=lotteryValue(id)*qty;
    if (!Number.isSafeInteger(value)) return {ok:false,reason:'投入数量过大。'};
    return lotteryTransact(id,qty,value,times);
  }

function lotteryDraw(times=1) { return lotteryTransact(null,0,0,Number(times)); }

function lotteryTransact(id,qty,value,times) {
    const info=lotteryState();
    if (!gameState.run || !info.active || gameState.run.zone!==info.zone) return {ok:false,reason:'交换机现在不在这里。'};
    if (!Number.isSafeInteger(times) || times<0 || (!id && times===0) || times>LOTTERY_BATCH_LIMIT) return {ok:false,reason:'每批请选择 1～50 抽。'};
    if (times>0 && info.uses>=LOTTERY_DAILY_LIMIT) return {ok:false,reason:'今天已抽满 200 次，剩余价值保留到以后。'};
    const credit=info.credit+value;
    if (!Number.isSafeInteger(credit)) return {ok:false,reason:'累计价值过大。'};
    const draws=Math.min(times,Math.floor(credit/LOTTERY_COST),LOTTERY_DAILY_LIMIT-info.uses);
    if (!id && !draws) return {ok:false,reason:'累计价值不足 100，请先投入物品。'};
    const oldS=gameState.run,next=JSON.parse(JSON.stringify(gameState.run)),meta=JSON.parse(JSON.stringify(metaState())),rewards=[];
    const failure=gameState.preview(next,meta,()=>{try {
      const track=lotteryAccount(meta,true);
      const outstanding=reconcileLotteryInputs();
      if(id && outstanding) throw new Error('旧档中有尚未补足的已投入物品，请先补齐后再充能。');
      track.credit=credit;track.misses=info.misses;track.lastDay=oldS.day;track.uses=info.uses;
      track.revision=Math.max(track.revision || 0,track.nonce || 0)+1;
      if (id && !removeItem(id,qty)) throw new Error('投入失败，物品没有扣除。');
      if(id) {
        track.consumed=track.consumed || {};
        track.consumed[id]=(track.consumed[id] || 0)+qty;
        next.lottery=next.lottery || {};
        next.lottery.consumed=next.lottery.consumed || {};
        next.lottery.consumed[id]=(next.lottery.consumed[id] || 0)+qty;
      }
      for(let draw=0;draw<draws;draw++) {
        const nonce=(track.nonce || 0)+1,guaranteed=track.misses>=9;
        const won=guaranteed || lotteryRandom(oldS._runId,nonce,'result')<0.10;
        track.nonce=nonce;track.credit-=LOTTERY_COST;track.uses++;
        if (!won) {track.misses++;continue;}
        track.misses=0;
        const roll=lotteryRandom(oldS._runId,nonce,'pool'),pool=LOTTERY_POOLS[roll<0.70?0:roll<0.95?1:2];
        const key=pool.items[Math.floor(lotteryRandom(oldS._runId,nonce,'item')*pool.items.length)];
        const reward={tier:pool.id,pity:guaranteed};
        if (key==='adCoins') {
          reward.adCoins=2+Math.floor(lotteryRandom(oldS._runId,nonce,'quantity')*2);
          walletEntry(meta,`lottery:${oldS._runId}:${nonce}`,reward.adCoins);
        } else if (RELICS[key]) {
          reward.relic=key;next.relics=next.relics || [];
          if(next.relics.includes(key)) {
            reward.mailed=true;
            meta.mailbox.push({relic:key,qty:1,title:'遗海抽奖',date:todayKey(),shopReceipt:`lottery-relic:${oldS._runId}:${nonce}`});
          } else { next.relics.push(key);updateMailCheckpoint(next,null,0,key); }
        } else {
          reward.item=key;
          reward.qty=key==='wood'?5+Math.floor(lotteryRandom(oldS._runId,nonce,'quantity')*6):key==='honey'?1+Math.floor(lotteryRandom(oldS._runId,nonce,'quantity')*2):1;
          if(!addItem(key,reward.qty,true))throw new Error('背包放不下奖品，本次操作已取消。');
        }
        rewards.push(reward);
      }
      if(id && !next.inv[id] && next.equipment)for(const slot of Object.keys(next.equipment))if(next.equipment[slot]===id)next.equipment[slot]=null;
      // 旧 meter/pity 字段保持原义；新玩法只使用 credit/misses。
      next.lottery=Object.assign({},next.lottery || {},{credit:track.credit,misses:track.misses,day:track.lastDay,uses:track.uses});
    } catch(e) {return {ok:false,reason:e.message};}
    });
    if(failure)return failure;
    const result=persistPair(next,meta,false);if(!result.ok)return result;
    const text=rewards.map(r=>r.adCoins?`${adCurrencyName()}×${r.adCoins}`:r.relic?RELICS[r.relic].name+(r.mailed?'（已存邮箱）':''):`${ITEMS[r.item].name}×${r.qty}`).join('、');
    const msg=!draws?`存入 ${value} 价值，当前余额 ${credit}；满 100 即可抽奖。`:
      `抽了 ${draws} 次，${rewards.length?`中奖 ${rewards.length} 次：${text}`:'本次未中奖'}。剩余 ${lotteryState().credit} 价值。`;
    log(msg,rewards.length?'good':'sys');change();
    return {ok:true,reward:rewards[0] || null,rewards,msg,value,times:draws,deposited:qty,chance:info.misses>=9?1:0.10};
  }

function batchTipSeen() { return !!(metaState().batchTipSeen); }

function markBatchTipSeen() { metaState().batchTipSeen = 1; metaSave(); }
    return Object.freeze({migrateRedeemReceipts,mergeLotteryHistory,lotteryHash,lotteryAccount,lotteryValue,lotteryChance,lotteryPools,lotteryRandom,lotteryBalance,reconcileLotteryInputs,lotteryState,lotteryOffer,lotteryDeposit,lotteryPut,lotteryDraw,lotteryTransact,batchTipSeen,markBatchTipSeen});
  }
  return Object.freeze({create});
})();
