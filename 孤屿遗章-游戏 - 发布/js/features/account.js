/* account：业务规则的唯一实现；Game 保留调用接口与装配。 */
const AccountRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const persistPair=(...args)=>deps.persistPair(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const reviveInfo=(...args)=>deps.reviveInfo(...args);
    const showOverlay=(...args)=>deps.showOverlay(...args);
    const hardCompleted=(...args)=>deps.hardCompleted(...args);
    const metaState=(...args)=>deps.metaState(...args);
    const mergeLotteryHistory=(...args)=>deps.mergeLotteryHistory(...args);
    const validSave=(...args)=>deps.validSave(...args);
    const adCurrencyName=(...args)=>deps.adCurrencyName(...args);
const PAID_IDENTITIES = ['trainer','beekeeper'];

function identityUnlocked(id) {
    return !!IDENTITIES[id] && (!PAID_IDENTITIES.includes(id) || !!(metaState().identityUnlocks || {})[id]);
  }

function unlockIdentity(id) {
    if (!PAID_IDENTITIES.includes(id)) return {ok:false,reason:'该角色无需购买解锁。'};
    if (identityUnlocked(id)) return {ok:true,already:true};
    const meta=JSON.parse(JSON.stringify(metaState()));
    if ((meta.soul || 0)<100) return {ok:false,reason:'魂点不足，解锁需要 100 魂点。'};
    meta.soul-=100;meta.identityUnlocks=meta.identityUnlocks || {};meta.identityUnlocks[id]=1;
    return persistPair(gameState.run ? JSON.parse(JSON.stringify(gameState.run)) : null,meta,false);
  }

function preserveMetaGrowth(incoming, local) {
    incoming.challengeUnlocked = !!(incoming.challengeUnlocked || local.challengeUnlocked);
    incoming.nodes = incoming.nodes || {};
    let retainedUpgrade = false;
    for (const id of PAID_IDENTITIES) if ((local.identityUnlocks || {})[id]) {
      incoming.identityUnlocks=incoming.identityUnlocks || {};
      if (!incoming.identityUnlocks[id]) retainedUpgrade=true;
      incoming.identityUnlocks[id]=1;
    }
    for (const node of META_NODES) {
      const before = Math.max(0,Math.min(node.max,Number(incoming.nodes[node.id]) || 0));
      const owned = Math.max(0,Math.min(node.max,Number((local.nodes || {})[node.id]) || 0));
      if (owned > before) { incoming.nodes[node.id] = owned; retainedUpgrade = true; }
    }
    // 保留永久升级时，不同时退回旧码中购买前的魂点余额。
    if (retainedUpgrade) incoming.soul = Math.min(Number(incoming.soul) || 0,Number(local.soul) || 0);
    for (const key of ['runs','totalSoul']) incoming[key] = Math.max(Number(incoming[key]) || 0,Number(local[key]) || 0);
  }

function metaLoad(){return deps.repository.metaLoad();}

function metaSave(){return deps.repository.metaSave();}

function metaReload(){return deps.repository.metaReload();}

function cloudStatus() { return typeof window!=='undefined'&&window.GuyuSaveBridge ? window.GuyuSaveBridge.status() : {supported:false,msg:'本地存档已启用；请导出存档码作设备外备份。',at:0,applied:0,uuid:null,diag:'local-only',pending:false}; }

function cloudPush() { return typeof window!=='undefined'&&window.GuyuSaveBridge ? window.GuyuSaveBridge.schedule() : false; }

function cloudInit() { return typeof window!=='undefined'&&window.GuyuSaveBridge ? window.GuyuSaveBridge.initialize(validSave) : false; }

function readSaveCode(code){return SaveCodec.read(code,validSave);}

function inspectCode(code) {
    const parsed=readSaveCode(code);if(!parsed.ok)return parsed;
    const d=parsed.data;return {ok:true,currentGame:!!d.save,day:d.save?.day||0,difficulty:d.save?.difficulty||'',
      version:d.t||'',checked:d.checksum!==undefined,soul:d.meta.soul||0,slots:(d.meta.slots||[]).filter(Boolean).length};
  }

function exportCode() {
    try {
      if (!gameState.profile) metaLoad();
      const current = gameState.run ? JSON.parse(JSON.stringify(gameState.run)) : JSON.parse(localStorage.getItem('guyuyizhang_save') || 'null');
      if (current) { delete current._snap; delete current._dirty; delete current._savedAt; }
      const payload = { v: 1, t: (typeof window !== 'undefined' && window.BUILD_VER) || '', meta: gameState.profile, save:current };
      return SaveCodec.encode(payload);
    } catch (e) { return ''; }
  }

function importCode(code) {
    try {
      const parsed=readSaveCode(code);if(!parsed.ok)return parsed;
      const data=parsed.data;
      const nextS = data.save || (gameState.run ? JSON.parse(JSON.stringify(gameState.run)) : null);
      const nextM = JSON.parse(JSON.stringify(data.meta));
      // 导入旧三槽码时保留本机已付费解锁的第四槽及其内容，避免降级吞档。
      const localM = metaState();
      preserveMetaGrowth(nextM,localM);
      mergeLotteryHistory(nextM,localM);
      if (localM.extraSlotUnlocked || (localM.slots || []).length >= 4) {
        nextM.extraSlotUnlocked = 1;
        if (!Array.isArray(nextM.slots)) nextM.slots = [null, null, null];
        if (nextM.slots.length === 3) {
          nextM.slots.push((localM.slots || [])[3] || null);
          // 旧三槽码拍于购买之前；保留付费槽时不可顺便退回购买前的魂点余额。
          nextM.soul = Math.min(Number(nextM.soul) || 0, Number(localM.soul) || 0);
        }
      }
      // 导入旧导出码可以恢复进度，但不能抹掉本机已经结算的局 ID。
      nextM.settledRuns = Object.assign({}, metaState().settledRuns || {}, nextM.settledRuns || {});
      if (metaState().legacyRunId && !nextM.legacyRunId) nextM.legacyRunId = metaState().legacyRunId;
      rememberSettledRun(gameState.run, nextM);
      if (nextS) ensureRunId(nextS, nextM);
      const result = persistPair(nextS, nextM, !!nextS);
      if (!result.ok) return result;
      metaLoad();
      return { ok: true, currentGame:!!data.save, soul: gameState.profile.soul || 0, runs: gameState.profile.runs || 0, slots: (gameState.profile.slots || []).filter(Boolean).length };
    } catch (e) { return { ok: false, reason: '存档码无法解析（可能复制不完整）' }; }
  }

function redeemCode(code) {
    const m = metaState(); const c = typeof code==='string' ? code.normalize('NFKC').trim().toUpperCase() : '';
    if(c.length>64 || /[\p{C}]/u.test(c)) return {ok:false,reason:'兑换码格式无效'};
    if (!c) return { ok:false, reason:'请输入兑换码' };
    if (!Object.prototype.hasOwnProperty.call(REDEEM_CODES,c) || REDEEM_CODES[c].online) return redeemOnlineCode(c);
    if (REDEEM_CODES[c].retired) return {ok:false,reason:'该兑换活动已结束'};
    if (m.redeemed[c]) return { ok:false, reason:'这个兑换码你已经用过了' };
    const g = REDEEM_CODES[c];
    // 传奇难度：不给物资（和邮箱领取同一道门槛）。
    // ⚠️ 这里**不消耗兑换码**——换低难度还能兑，不惩罚玩家。
    if (gameState.run && gameState.run.difficulty === 'legend' && (g.soul || g.item || g.relic || g.adCoins || (g.mails && g.mails.length))) {
      return { ok:false, reason:'传奇模式下不能兑换物资（物品 / 神物 / 魂点）。兑换码没有消耗掉——换一个低难度开局再来兑换。', legendBlock:true };
    }
    const meta=JSON.parse(JSON.stringify(m));
    (g.mails || [g]).forEach((gift,i)=>meta.mailbox.push({ soul:gift.soul || 0, ...(gift.adCoins ? {adCoins:gift.adCoins} : {}), item:gift.item || null, qty:gift.qty || 1, relic:gift.relic || null, code:c, shopReceipt:`redeem:${c}:${i}` }));
    meta.redeemed[c]=1;
    const result=persistPair(gameState.run,meta,false);if(!result.ok)return result;
    return { ok:true, msg: g.adCoins ? `兑换成功：${g.soul ? g.soul+' 魂点 + ' : ''}${g.adCoins} ${adCurrencyName()}已放入邮箱。` : g.mails ? '兑换成功：魂点和命名牌已分别放入邮箱。' : g.relic ? `获得神物【${RELICS[g.relic].name}】（已存入邮箱）`
      : (g.item ? `获得 ${ITEMS[g.item].name}×${g.qty || 1}（已存入邮箱）` : `获得 ${g.soul} 魂点（已存入邮箱）`) };
  }

const remoteRedeemBusy = new Set();

async function redeemOnlineCode(code) {
    if (remoteRedeemBusy.has(code)) return {ok:false,reason:'正在兑换，请稍候'};
    if (metaState().redeemed[code]) return {ok:false,reason:'这个兑换码你已经用过了'};
    if (gameState.run && gameState.run.difficulty === 'legend') return {ok:false,reason:'传奇模式下不能兑换物资，兑换码没有消耗',legendBlock:true};
    remoteRedeemBusy.add(code);
    try {
      let owner = (metaState().remoteRedeemOwners || {})[code];
      if (!owner) {
        if (!window.crypto || !window.crypto.getRandomValues) return {ok:false,reason:'当前环境不支持安全兑换，请更新浏览器'};
        const bytes = new Uint8Array(32); window.crypto.getRandomValues(bytes);
        owner = Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
        const next = JSON.parse(JSON.stringify(metaState()));
        next.remoteRedeemOwners = next.remoteRedeemOwners || {};
        next.remoteRedeemOwners[code] = owner;
        const saved = persistPair(gameState.run,next,false); if (!saved.ok) return saved;
      }
      const url = 'https://redeem.guyuyizhang.top:8443/v1/redeem';
      const reply = await RedeemTransport.send(window,url,{code,owner,capabilities:['item-mail-v1']});
      const data = reply.data;
      if (reply.status !== 200 || !data || !data.ok) return {ok:false,reason:reply.status===429?'操作太频繁，请稍后再试':(data && typeof data.reason==='string'?data.reason:'兑换服务暂不可用，请稍后重试')};
      const gift = data.gift || {};
      const itemGift = typeof gift.item==='string' && Object.prototype.hasOwnProperty.call(ITEMS,gift.item) && Number.isInteger(gift.qty) && gift.qty>=1 && gift.qty<=999;
      if (!/^remote:[a-f0-9]{32}$/.test(data.receipt) || !Number.isInteger(gift.soul) || !Number.isInteger(gift.adCoins) || gift.soul<0 || gift.soul>1000000 || gift.adCoins<0 || gift.adCoins>100000 || (gift.item != null && !itemGift) || (!gift.item && gift.qty != null) || (gift.soul+gift.adCoins===0 && !itemGift)) return {ok:false,reason:'兑换服务返回异常，请保留兑换码并重试'};
      const meta = JSON.parse(JSON.stringify(metaState()));
      // A lost reply/local write can be retried; receipt-based delivery stays exactly once.
      if (!(meta.adDelivered || {})[data.receipt] && !meta.mailbox.some(x=>x.shopReceipt===data.receipt)) meta.mailbox.push({soul:gift.soul,adCoins:gift.adCoins,...(itemGift?{item:gift.item,qty:gift.qty}:{qty:1}),code,shopReceipt:data.receipt});
      meta.redeemed[code]=1;
      const result = persistPair(gameState.run,meta,false);
      if (!result.ok) return {ok:false,reason:'奖励暂未保存，请保留兑换码并重试；不会再次消耗兑换码'};
      const rewards = [gift.soul ? `${gift.soul} 魂点` : '',gift.adCoins ? `${gift.adCoins} ${adCurrencyName()}` : '',itemGift ? `${ITEMS[gift.item].name}×${gift.qty}` : ''].filter(Boolean).join(' + ');
      return {ok:true,msg:`兑换成功：${rewards}已放入邮箱。`};
    } catch (error) {
      const reason = error?.redeemError==='timeout' ? '兑换连接超时，请保留兑换码并重试（TIMEOUT）'
        : error?.redeemError==='unsupported' ? '当前环境不支持联网兑换，请更新客户端（NO_TRANSPORT）'
        : error?.redeemError==='response' ? `兑换服务返回异常，请保留兑换码并重试（HTTP_${Number.isInteger(error.status)?error.status:0}）`
        : window.navigator?.onLine===false ? '网络已断开，请联网后重试（OFFLINE）'
        : '无法连接兑换服务器，请保留兑换码并检查网络（NETWORK）';
      return {ok:false,reason};
    } finally { remoteRedeemBusy.delete(code); }
  }

function metaNum(id) { return (metaState().nodes[id] || 0); }

function metaAllowed() { return gameState.run && (gameState.run.difficulty === 'easy' || gameState.run.difficulty === 'normal' || gameState.run.difficulty === 'hard' || gameState.run.difficulty === 'nightmare' || gameState.run.difficulty === 'dev'); }

function metaBonus() {
    const b = { stamina:0, cons:0, craft:0, travel:0, luck:0, bag:0, atk:0, armor:0, kit:0, startG:0, startC:0, startF:0 };
    if (!metaAllowed()) return b;
    b.stamina = [0,5,10,15][metaNum('vital')];
    b.cons = [0,0.05,0.08,0.12][metaNum('feast')];
    b.craft = [0,0.05,0.10,0.15][metaNum('hands')];
    b.travel = [0,0.05,0.10,0.15][metaNum('stride')];
    b.luck = [0,0.05,0.10,0.15][metaNum('luck')];
    b.bag = [0,5,10,15][metaNum('pack')];
    b.atk = [0,0.03,0.06,0.10][metaNum('whet')];
    b.armor = [0,0.05,0.10,0.15][metaNum('tough')];
    b.kit = metaNum('kit');
    // 《历代遗章》新增：各技能模块的开局初始经验（技能经验本身不跨局）
    b.startG = [0,30,60,100][metaNum('startG')];
    b.startC = [0,30,60,100][metaNum('startC')];
    b.startF = [0,30,60,100][metaNum('startF')];
    return b;
  }

function metaBuy(id) {
    const meta = metaState();
    const nd = META_NODES.find(n => n.id === id);
    if (!nd) return { ok:false, reason:'未知节点' };
    const lvl = metaNum(id);
    if (lvl >= nd.max) return { ok:false, reason:'已满级' };
    const cost = nd.cost[lvl];
    if (meta.soul < cost) return { ok:false, reason:`魂点不足（需 ${cost} 魂点）` };
    meta.soul -= cost; meta.nodes[id] = lvl + 1; metaSave();
    return { ok:true, cost, level: lvl + 1 };
  }

let _lastSettle = null;

function longActWarn(minutes, what, retry) {
    const total = Math.max(0, Math.round(minutes || 0));
    if (total <= 300 || deps.craftBatchConfirmed) return false;
    const hrs = (total / 60).toFixed(1);
    showOverlay({
      title: '⚠ 这活儿要花很久',
      text: `「${what}」大约要花 ${hrs} 小时——这段时间饱食和水分会一直掉，饿着肚子硬干会出事（已经有人这么做把自己做没了）。\n\n要不要先吃点东西、喝口水再来？`,
      choices: [
        { label:`仍然开工（${hrs} 小时）`, hint:'我知道风险', ok: () => { deps.craftBatchConfirmed = true; try { if (typeof retry === 'function') retry(); } finally { deps.craftBatchConfirmed = false; } } },
        { label:'再想想', hint:'先去吃东西 / 喝水', ok: () => { log('你把材料先放下，打算准备准备再动手。', 'sys'); } },
      ],
    });
    return true;
  }

function metaLast() { return _lastSettle; }

function reviveToday() {
    const info = reviveInfo();
    if (!info.ok) { log(info.reason, 'warn'); return info; }
    const next = JSON.parse(JSON.stringify(info.state));
    next._rev = gameState.run._rev; next._runId = gameState.run._runId; next._fromBackup = gameState.run._fromBackup; next._fromBackupSlot = gameState.run._fromBackupSlot;
    next.dawnCheckpoint = gameState.run.dawnCheckpoint || {version:1,state:JSON.parse(JSON.stringify(info.state))};
    next._snap = {day:JSON.parse(JSON.stringify(info.state))};
    next.combat = null; next.death = undefined; next.ending = undefined;
    next.statuses = {bleed:0,poison:0,cold:false,fear:0}; next.flags = next.flags || {};
    // 已结算状态不能随回溯撤销。
    for (const k in (gameState.run.flags || {})) if (k === 'settledEnding' || k.indexOf('settled_') === 0) next.flags[k] = gameState.run.flags[k];
    // ⚠️ 数值平衡 P0-1：**活刷魂**。以前这里写 `next.flags.metaSettled = 0;`，
    //    意思是"回溯后可以再结算一次魂点"——于是 50 魂换一次复活、再死一次又能全额结算（100+ 魂），
    //    净赚，可以无限刷。改为**结算状态随档保留**（和上面 settled_* 同样的处理）：
    //    一局只结算一次，复活只是"多一条命"，不是"多一份魂"。
    next.flags.metaSettled = gameState.run.flags.metaSettled || 0;
    const meta = JSON.parse(JSON.stringify(metaState())); meta.soul -= 50;
    // 旧日出快照与主档/备份槽走同一迁移，避免复活后退回旧仓库结构或缺少技能字段。
    const result = persistPair(next, meta, true);
    if (!result.ok) return result;
    log('你用 50 魂点换回了今天——从日出重新开始。', 'sys'); change();
    return {ok:true};
  }

function ensureRunId(state, meta) {
    meta.settledRuns = meta.settledRuns || {};
    // 旧档及其旧备份共用迁移 ID，避免从不同槽反复领取同一局的魂点。
    if (!state._runId) {
      meta.legacyRunId = meta.legacyRunId || ('legacy-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
      state._runId = meta.legacyRunId;
    }
  }

function legacySlotSettled(meta) {
    return (meta.slots || []).some(sl => sl && sl.settled && sl.data && !sl.data._runId);
  }

function rememberSettledRun(state, meta) {
    if (!state || !state.flags || !state.flags.metaSettled) return;
    const copy = JSON.parse(JSON.stringify(state));
    ensureRunId(copy, meta);
    meta.settledRuns[copy._runId] = 1;
  }

function metaSettle() {
    if (!gameState.run || !gameState.run.flags) return null;
    if (gameState.run.flags.metaSettled) {
      const m = JSON.parse(JSON.stringify(metaState()));
      rememberSettledRun(gameState.run, m);
      if (!metaState().settledRuns[gameState.run._runId || m.legacyRunId]) persistPair(JSON.parse(JSON.stringify(gameState.run)), m, false);
      return null;
    }
    const nextS = JSON.parse(JSON.stringify(gameState.run));
    const meta = JSON.parse(JSON.stringify(metaState()));
    if(hardCompleted(nextS)) meta.challengeUnlocked=true;
    ensureRunId(nextS, meta);
    if (nextS._runId === meta.legacyRunId && legacySlotSettled(meta)) meta.settledRuns[nextS._runId] = 1;
    nextS.flags.metaSettled = 1;
    if (meta.settledRuns[nextS._runId]) {
      persistPair(nextS, meta, false);
      return null;
    }
    const seenN = gameState.run.seen ? Object.keys(gameState.run.seen).length : 0;
    const kills = Object.values(gameState.run.killCount || {}).reduce((a,b)=>a+b,0) || 0;
    let gain = gameState.run.day + seenN + Math.round(kills * 0.5);
    if (gameState.run.ending && gameState.run.ending !== 'D') gain += 200;
    const diffMul = { easy:0.6, normal:1, hard:1.4, legend:2.2, nightmare:2 }[gameState.run.difficulty] || 1;
    gain = Math.max(1, Math.round(gain * diffMul));
    meta.soul += gain; meta.runs++; meta.totalSoul += gain;
    meta.settledRuns[nextS._runId] = 1;
    for (const sl of meta.slots) if (sl && sl.data && (sl.data._runId === nextS._runId || (!sl.data._runId && nextS._runId === meta.legacyRunId))) sl.settled = true;
    if (!persistPair(nextS, meta, false).ok) return null;
    _lastSettle = { gain, soul: meta.soul };
    return _lastSettle;
  }
    return Object.freeze({identityUnlocked,unlockIdentity,preserveMetaGrowth,metaLoad,metaSave,metaReload,cloudStatus,cloudPush,cloudInit,readSaveCode,inspectCode,exportCode,importCode,redeemCode,redeemOnlineCode,metaNum,metaAllowed,metaBonus,metaBuy,longActWarn,metaLast,reviveToday,ensureRunId,legacySlotSettled,rememberSettledRun,metaSettle});
  }
  return Object.freeze({create});
})();
