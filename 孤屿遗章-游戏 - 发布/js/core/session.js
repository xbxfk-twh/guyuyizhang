/* 运行时暂停原因独立于存档；关闭面板不能解除宿主后台暂停。 */
const GameSession = (() => {
  function create() {
    const paused=new Set();
    function setPaused(reason,on){
      if(!['panel','host'].includes(reason))throw Error('未知暂停原因：'+reason);
      if(on)paused.add(reason);else paused.delete(reason);
    }
    return Object.freeze({
      setPaused,isPaused:reason=>paused.has(reason),canAdvance:()=>paused.size===0,
      snapshot:()=>Object.freeze({panel:paused.has('panel'),host:paused.has('host')})
    });
  }
  return Object.freeze({create});
})();
