/* 存储装配边界：同一端口连接事务、仓库及 cookie 镜像；不拥有或改名持久化字段。 */
const SaveService = (() => {
  function port({storage,bridge}) { return bridge ? bridge.storage : storage; }
  function create({storage,cookies,state,getBridge,LOG_KEEP,validSave,normalizeState,migrateSaltMeta,migrateRedeemReceipts,migrateNotices,reconcile,onFailure,onConflict,push}) {
    const keys=SaveRepository.keys;
    const transactions=SaveTransactions.create({
      storage,getPair:()=>state.pair(),setPair:(save,meta)=>state.replace(save,meta),
      migrateMeta:()=>migrateSaltMeta(state.profile),normalize:revision=>{normalizeState();state.run._rev=revision;},reconcile,
      saveRun:()=>repository.save(),saveMeta:()=>repository.metaSave(),
      mirror:()=>{if(state.run)repository.mirror(keys.save,keys.saveAt,storage.getItem('guyuyizhang_save'));repository.mirror(keys.meta,keys.metaAt,storage.getItem('guyuyizhang_meta'));},
      push,onFailure
    });
    const repository=SaveRepository.create({
      storage,cookies,getState:()=>state.run,setState:value=>{state.run=value;},getMeta:()=>state.profile,setMeta:value=>{state.profile=value;},isStaging:()=>state.staging,
      transactions,LOG_KEEP,validSave,normalizeState,migrateSaltMeta,migrateRedeemReceipts,migrateNotices,onConflict,onFailure,push
    });
    async function saveAndFlush(){const result=repository.save();if(!result.ok)return result;const bridge=getBridge();return bridge?bridge.flush():result;}
    function initializeStorage(){transactions.recover();return repository.metaReload();}
    // 保持原时机：Game 装配结束后调用；宿主桥接存在时必须等异步核对后再初始化。
    function initializeLegacy(){if(!getBridge()){transactions.recover();repository.metaLoad();}}
    return Object.freeze({storage,keys,...repository,persistPair:transactions.commit,recoverPendingWrite:transactions.recover,saveAndFlush,initializeStorage,initializeLegacy});
  }
  return Object.freeze({port,create,get keys(){return SaveRepository.keys;}});
})();
