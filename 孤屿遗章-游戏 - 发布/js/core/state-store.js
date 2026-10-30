/* 当前局与账号只有这一处持有；规则模块每次通过实时端口取值。
   draft 是同步预演作用域，嵌套预演退出时精确恢复进入前的状态与标志。
   写盘提交归 SaveTransactions，StateStore 不访问任何持久化介质。 */
const StateStore = (() => {
  function create() {
    let run = null, profile = null, staging = false;
    function pair() { return {save:run, meta:profile}; }
    function replace(save, meta) { run=save; profile=meta; }
    function preview(save, meta, action) {
      const previous = {run,profile,staging};
      run=save; profile=meta; staging=true;
      try { return action(); }
      finally { run=previous.run; profile=previous.profile; staging=previous.staging; }
    }
    return Object.freeze({
      get run(){return run;}, set run(value){run=value;},
      get profile(){return profile;}, set profile(value){profile=value;},
      get staging(){return staging;}, set staging(value){staging=!!value;},
      pair,replace,preview
    });
  }
  return Object.freeze({create});
})();
