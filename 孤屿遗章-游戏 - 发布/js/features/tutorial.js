/* 引导进度由规则层修改，界面只发送已完成的操作。 */
const TutorialRules = (() => {
  function create({getState,changed,items}) {
    function skip() {
      const state=getState(); if(!state)return false;
      state.tut=null; changed(); return true;
    }
    function bagViewed() {
      const state=getState(); if(!state || state.tut!==0)return false;
      state.tut=Object.keys(state.inv||{}).some(id=>items[id]?.tool)?2:1;
      changed(); return true;
    }
    return Object.freeze({skip,bagViewed});
  }
  return Object.freeze({create});
})();
