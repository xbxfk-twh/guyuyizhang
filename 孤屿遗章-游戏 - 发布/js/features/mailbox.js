/* mailbox：业务规则的唯一实现；Game 保留调用接口与装配。 */
const MailboxRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const persistPair=(...args)=>deps.persistPair(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const addItem=(...args)=>deps.addItem(...args);
    const fitsInBag=(...args)=>deps.fitsInBag(...args);
    const metaLoad=(...args)=>deps.metaLoad(...args);
    const metaSave=(...args)=>deps.metaSave(...args);
    const walletEntry=(...args)=>deps.walletEntry(...args);
    const walletId=(...args)=>deps.walletId(...args);
function hasDivineBowAnywhere() {
    if (gameState.run && gameState.run.inv && (gameState.run.inv.divineBow || 0) > 0) return true;
    const m=metaState();
    return hasMailboxDivineBow() || (m.slots || []).some(sl=>sl && sl.data && sl.data.inv && sl.data.inv.divineBow > 0);
  }

function hasMailboxDivineBow() {
    const m = metaState();
    return !!((m.mailbox || []).some(x => x && x.item === 'divineBow'));
  }

function updateMailCheckpoint(state, item, qty, relic, durability) {
    const cp = state && state.dawnCheckpoint && state.dawnCheckpoint.state;
    if (!cp || !cp.inv || typeof cp.inv !== 'object' || cp.day !== state.day) return;
    if (relic) { cp.relics = cp.relics || []; if (!cp.relics.includes(relic)) cp.relics.push(relic); }
    if (item) {
      cp.inv[item] = Math.max(0, (cp.inv[item] || 0) + qty);
      if (!cp.inv[item]) {
        delete cp.inv[item]; if(cp.toolDurs) delete cp.toolDurs[item]; if(cp.dur) delete cp.dur[item];
        if(cp.equipment) for(const slot of Object.keys(cp.equipment)) if(cp.equipment[slot] === item) cp.equipment[slot] = null;
      } else if (DURA[item] !== undefined) {
        cp.toolDurs = cp.toolDurs || {}; cp.toolDurs[item] = (state.toolDurs[item] || []).slice();
        cp.dur = cp.dur || {}; cp.dur[item] = cp.toolDurs[item].length ? Math.min(...cp.toolDurs[item]) : (durability === undefined ? DURA[item] : durability);
      }
    }
    state._snap = state._snap || {}; state._snap.day = JSON.parse(JSON.stringify(cp));
  }

function storeDivineBow() {
    if (!gameState.run || !gameState.run.inv || !(gameState.run.inv.divineBow > 0)) return {ok:false,reason:'你身上没有神弓。'};
    const next = JSON.parse(JSON.stringify(gameState.run)), meta = JSON.parse(JSON.stringify(metaState()));
    const dur = next.toolDurs && next.toolDurs.divineBow ? next.toolDurs.divineBow[0] : DURA.divineBow;
    next.inv.divineBow--;
    if (next.toolDurs && next.toolDurs.divineBow) next.toolDurs.divineBow.splice(0,1);
    if (next.toolMaxDurs && next.toolMaxDurs.divineBow) next.toolMaxDurs.divineBow.splice(0,1);
    if (!next.inv.divineBow) { delete next.inv.divineBow; delete next.toolDurs.divineBow; delete next.dur.divineBow; }
    else next.dur.divineBow = Math.min(...next.toolDurs.divineBow);
    for (const slot of ['weapon','weapon2']) if (next.equipment[slot] === 'divineBow') {
      const idx = (next.equipIdx || {})[slot] || 0;
      if (idx === 0) next.equipment[slot] = null;
      else next.equipIdx[slot] = idx - 1;
    }
    updateMailCheckpoint(next,'divineBow',-1);
    meta.mailbox.push({item:'divineBow',qty:1,divineBow:true,dur,title:'限定 · 神弓',date:''});
    const result = persistPair(next,meta,false);
    if(!result.ok) return result;
    log(`你把神弓收进邮箱（剩余耐久 ${dur}）——它会在下一局等你。`, 'good');change();
    return {ok:true,dur};
  }

function syncPatchNotes() {
    const m = metaState();
    const keep=(m.mailbox || []).filter(x=>!x.notice || !/^v1\.(?:0?[0-9])(?:\D|$)/.test(String(x.notice)));
    if(keep.length!==(m.mailbox || []).length) { m.mailbox=keep;metaSave(); }
    if (typeof PATCH_NOTES === 'undefined' || !PATCH_NOTES || !PATCH_NOTES.length) return;
    m.patchSent = m.patchSent || {};
    let changed = false;
    for (const n of PATCH_NOTES) {
      if (!n || !n.approved || m.patchSent[n.version]) continue;
      m.mailbox = m.mailbox || [];
      // ⚠️ 公告正文在 data.js 里是按行写的数组；邮件里统一存成"带换行的纯文本"，
      //    否则界面那边 String(数组) 会变成用逗号拼成一整行（v1.06 那条公告就一直是这个毛病）。
      const bodyText = Array.isArray(n.body) ? n.body.join('\n') : (n.body || '');
      m.mailbox.push({ notice: n.version, title: n.title || (n.version + ' 更新公告'), body: bodyText, date: n.date || '' });
      m.patchSent[n.version] = 1;
      changed = true;
    }
    if (changed) metaSave();
  }

function mailboxList() {
    syncPatchNotes();
    return (metaState().mailbox || []).map((x,i) => ({ i, soul: x.soul || 0, adCoins:x.adCoins || 0, item: x.item || null, qty: x.qty || 1,
      divineBow: x.divineBow || false, dur: x.dur,      // 神弓：把耐久透出来，UI 才能显示"剩余耐久 N"
      relic: x.relic || null, notice: x.notice || null, title: x.title || '', body: x.body || '', date: x.date || '' }));
  }

function mailIsSupply(g) { return !!(g && !g.notice && (g.item || g.relic || g.soul || g.adCoins)); }

function claimMailbox(i) {
    const m=metaState(), g=(m.mailbox || [])[i];
    if(!g) return {ok:false,reason:'该邮件不存在'};
    if(gameState.run && gameState.run.difficulty === 'legend' && mailIsSupply(g)) return {ok:false,reason:'传奇模式下不能领取物资邮件，邮件会保留。',legendBlock:true};
    if((g.item || g.relic) && (!gameState.run || gameState.run.death || gameState.run.ending)) return {ok:false,reason:'请先进入一局存活的游戏再领取，邮件会保留。'};
    if(g.item && (!ITEMS[g.item] || !fitsInBag({[g.item]:g.qty || 1}))) return {ok:false,reason:'背包装不下，邮件已保留。'};
    if(g.relic && g.shopReceipt && (gameState.run.relics || []).includes(g.relic)) return {ok:false,reason:'本局已拥有该神物，邮件会保留供其他局领取。'};
    let next=gameState.run ? JSON.parse(JSON.stringify(gameState.run)) : null, meta=JSON.parse(JSON.stringify(m));
    const failure=gameState.preview(next,meta,()=>{
      if(g.relic) { next.relics=next.relics || [];if(!next.relics.includes(g.relic)) next.relics.push(g.relic); }
      if(g.soul) meta.soul += g.soul;
      if(g.adCoins)walletEntry(meta,g.shopReceipt || walletId(),g.adCoins);
      if(g.item) {
        if(!addItem(g.item,g.qty || 1,true)) return {ok:false,reason:'背包装不下，邮件已保留。'};
        if(g.divineBow && g.dur !== undefined) { next.toolDurs.divineBow[next.toolDurs.divineBow.length-1]=g.dur;next.dur.divineBow=Math.min(...next.toolDurs.divineBow); }
      }
      if(next) updateMailCheckpoint(next,g.item,g.qty || 1,g.relic,g.dur);
      meta.mailbox.splice(i,1);
      if (g.shopReceipt) { meta.adDelivered = meta.adDelivered || {}; meta.adDelivered[g.shopReceipt] = 1; }
    });
    if(failure)return failure;
    const result=persistPair(next,meta,false);if(!result.ok)return result;
    if(gameState.run) change();
    return {ok:true,msg:g.notice ? '公告已读' : g.adCoins ? `领取了 ${g.soul || 0} 魂点 + ${g.adCoins} 星之点` : g.relic ? `领取了神物【${RELICS[g.relic].name}】` : g.item ? `领取了 ${ITEMS[g.item].name}×${g.qty||1}` : `领取了 ${g.soul} 魂点`};
  }

function mailboxCount() { return (metaState().mailbox || []).length; }

function metaState() { if (!gameState.profile) metaLoad(); return gameState.profile; }
    return Object.freeze({hasDivineBowAnywhere,hasMailboxDivineBow,updateMailCheckpoint,storeDivineBow,syncPatchNotes,mailboxList,mailIsSupply,claimMailbox,mailboxCount,metaState});
  }
  return Object.freeze({create});
})();
