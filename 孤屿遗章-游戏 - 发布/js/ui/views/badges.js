/* 叶子通知向上汇总；只更新红点，不重建页面或播放进场动画。 */
const NoticeBadges = (() => {
  function dot(key) { return `<span class="notice-dot" data-notice="${key}" role="img" aria-label="有新内容" hidden></span>`; }
  function refresh(root=document) {
    const state=Game.noticeState();
    let guide=false;
    try { guide=localStorage.getItem('guyuyizhang_guide_read')!=='1'; } catch(e) {}
    state.menu=state.menu||guide;state.mailbox=state.mailbox||guide;
    root.querySelectorAll('[data-notice]').forEach(node=>{node.hidden=!state[node.dataset.notice];});
  }
  return Object.freeze({dot,refresh});
})();
