/* 主档与账号的写入事务。持久化键/恢复日志格式保持不变，不拥有玩法状态。 */
const SaveTransactions = (() => {
  const JOURNAL='guyuyizhang_write_journal';
  const KEYS=['guyuyizhang_save','guyuyizhang_save_bak','guyuyizhang_savedAt','guyuyizhang_rev','guyuyizhang_meta','guyuyizhang_meta_bak'];
  function create({storage,getPair,setPair,migrateMeta,normalize,reconcile,saveRun,saveMeta,mirror,push,onFailure,warn=console.warn}) {
    let active=false;
    function restore(values){for(const key of KEYS){if(values[key]===null)storage.removeItem(key);else if(typeof values[key]==='string')storage.setItem(key,values[key]);}}
    function pending(){return !!storage.getItem(JOURNAL);}
    function recover(){
      try{const raw=storage.getItem(JOURNAL);if(!raw)return;const journal=JSON.parse(raw);if(journal&&journal.version===1&&journal.before)restore(journal.before);storage.removeItem(JOURNAL);}
      catch(error){warn('未完成的存档写入尚未恢复',error);}
    }
    function commit(nextS,nextM,normalizeRequested){
      const previous=getPair(),before={};let started=false;
      try{
        if(pending())throw Error('上次存储恢复尚未完成');
        for(const key of KEYS)before[key]=storage.getItem(key);
        storage.setItem(JOURNAL,JSON.stringify({version:1,before}));started=true;
        active=true;setPair(nextS,nextM);migrateMeta();
        if(normalizeRequested&&nextS)normalize(parseInt(before.guyuyizhang_rev||'0',10)||0);
        if(!normalizeRequested&&nextS)reconcile();
        const run=nextS?saveRun():{ok:true};if(!run.ok)throw Error(run.reason);
        if(!saveMeta().ok)throw Error('账号数据写入失败');
        storage.removeItem(JOURNAL);active=false;
        mirror();push();return {ok:true};
      }catch(error){
        setPair(previous.save,previous.meta);active=false;
        if(started){try{restore(before);storage.removeItem(JOURNAL);}catch(restoreError){warn('保留恢复日志供下次启动恢复',restoreError);}}
        onFailure(error);return {ok:false,reason:'存储写入失败，未完成操作；请先导出备份，再重试。'};
      }
    }
    return Object.freeze({commit,recover,pending,active:()=>active});
  }
  return Object.freeze({create});
})();
