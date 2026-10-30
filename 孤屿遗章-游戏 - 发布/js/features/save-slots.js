/* save-slots：业务规则的唯一实现；Game 保留调用接口与装配。 */
const SaveSlotRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const persistPair=(...args)=>deps.persistPair(...args);
    const metaSave=(...args)=>deps.metaSave(...args);
    const metaState=(...args)=>deps.metaState(...args);
    const ensureRunId=(...args)=>deps.ensureRunId(...args);
    const rememberSettledRun=(...args)=>deps.rememberSettledRun(...args);
    const backupPoints=(...args)=>deps.backupPoints(...args);
    const validSave=(...args)=>deps.validSave(...args);
const EXTRA_SLOT_COST = 100;

function extraSlotUnlocked() { const m = metaState(); return !!(m.extraSlotUnlocked || (m.slots || []).length >= 4); }

function slotList() { const m = metaState(); return Array.from({length:4}, (_, i) => { const s = m.slots && m.slots[i]; return s ? { day:s.day, settled:!!s.settled } : null; }); }

function buyExtraSlot() {
    const m = metaState();
    if (extraSlotUnlocked()) return {ok:false,reason:'第四存档位已经解锁'};
    if ((m.soul || 0) < EXTRA_SLOT_COST) return {ok:false,reason:`魂点不足（需要 ${EXTRA_SLOT_COST}，现有 ${m.soul || 0}）`};
    const nextM = JSON.parse(JSON.stringify(m));
    nextM.soul -= EXTRA_SLOT_COST;
    nextM.extraSlotUnlocked = 1;
    nextM.slots.push(null);
    const nextS = gameState.run ? JSON.parse(JSON.stringify(gameState.run)) : null;
    const result = persistPair(nextS, nextM, false);
    return result.ok ? {ok:true,soul:nextM.soul} : result;
  }

function delSlot(i) {
    if (!Number.isInteger(i) || i < 0 || i > 3 || (i === 3 && !extraSlotUnlocked())) return { ok:false, reason:'无效备份槽' };
    const m = metaState();
    if (!(m.slots || [])[i]) return { ok:false, reason:'这个槽本来就是空的。' };
    const nextM=JSON.parse(JSON.stringify(m));nextM.slots[i]=null;
    return persistPair(gameState.run?JSON.parse(JSON.stringify(gameState.run)):null,nextM,false);
  }

function buyBackupPoint() {
    const m = metaState();
    if (m.soul < 20) return { ok:false, reason:'魂点不足（需 20 魂点）' };
    const nextM=JSON.parse(JSON.stringify(m));nextM.soul-=20;nextM.backupPoints=backupPoints()+1;
    return persistPair(gameState.run?JSON.parse(JSON.stringify(gameState.run)):null,nextM,false);
  }

function backupSlot(i) {
    if (!Number.isInteger(i) || i < 0 || i > 3 || (i === 3 && !extraSlotUnlocked())) return {ok:false,reason:'请先用 100 魂点解锁第四存档位'};
    if (!gameState.run) return {ok:false,reason:'当前没有进行中的游戏'};
    if (backupPoints() <= 0) return {ok:false,reason:'没有备份点了（可用 20 魂点购买）'};
    const nextM = JSON.parse(JSON.stringify(metaState()));
    const nextS = JSON.parse(JSON.stringify(gameState.run));
    ensureRunId(nextS, nextM);
    if (nextS.flags && nextS.flags.metaSettled) nextM.settledRuns[nextS._runId] = 1;
    nextM.backupPoints--;
    nextM.slots[i] = {day:gameState.run.day, settled:!!nextM.settledRuns[nextS._runId], data:JSON.parse(JSON.stringify(nextS))};
    nextM.slots[i].data._snap = undefined; nextM.slots[i].data._fromBackup = false;
    const result = persistPair(nextS, nextM, false);
    return result.ok ? {ok:true,day:gameState.run.day} : result;
  }

function loadSlot(i) {
    if (!Number.isInteger(i) || i < 0 || i > 3 || (i === 3 && !extraSlotUnlocked())) return {ok:false,reason:'无效备份槽'};
    const m = metaState();
    const sl = m.slots && m.slots[i];
    if (!sl) return { ok:false, reason:'该槽为空，先从新游戏开始' };
    if (!validSave(sl.data)) return {ok:false, reason:'备份存档不完整，未覆盖当前进度'};
    const data = JSON.parse(JSON.stringify(sl.data));
    const nextM = JSON.parse(JSON.stringify(m));
    rememberSettledRun(gameState.run, nextM);
    ensureRunId(data, nextM);
    if (sl.settled) nextM.settledRuns[data._runId] = 1;
    data._fromBackup = true; data._fromBackupSlot = i;
    const result = persistPair(data, nextM, true);
    return result.ok ? {ok:true,day:data.day} : result;
  }
    return Object.freeze({extraSlotUnlocked,slotList,buyExtraSlot,delSlot,buyBackupPoint,backupSlot,loadSlot});
  }
  return Object.freeze({create});
})();
