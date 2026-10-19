/* 单个节点只拥有一套手势监听；刷新仅替换动作，不中断正在进行的手势。 */
const PressInput = (() => {
  const states = new WeakMap();
  function dispose(node) {
    const state=states.get(node);if(!state)return;
    clearTimeout(state.timer);
    for(const [type,fn] of Object.entries(state.listeners))node.removeEventListener(type,fn);
    states.delete(node);
  }
  function bind(node,onTap,onLong) {
    let state=states.get(node);
    if(state){state.onTap=onTap;state.onLong=onLong;return;}
    state={onTap,onLong,timer:null,start:null,long:false,listeners:{}};
    const dead=()=>node.disabled||node.classList.contains('lockedb');
    const clear=()=>{clearTimeout(state.timer);state.timer=null;};
    const abort=()=>{clear();state.start=null;state.long=true;};
    state.listeners={
      pointerdown:e=>{if(dead()||e.isPrimary===false||e.button>0)return;clear();state.long=false;state.start={x:e.clientX,y:e.clientY};state.timer=setTimeout(()=>{state.timer=null;if(!node.isConnected||dead())return;state.long=true;state.onLong?.(state.start);},460);},
      pointermove:e=>{if(state.timer&&state.start&&Math.hypot(e.clientX-state.start.x,e.clientY-state.start.y)>12)clear();},
      pointerup:e=>{if(!state.start)return;const far=Math.hypot(e.clientX-state.start.x,e.clientY-state.start.y)>12,wasLong=state.long;clear();state.start=null;state.long=false;if(!far&&!wasLong&&!dead())state.onTap?.();},
      pointercancel:abort,pointerleave:abort,
      contextmenu:e=>e.preventDefault(),
      click:e=>{if(e.detail===0&&!dead())state.onTap?.();}
    };
    states.set(node,state);
    for(const [type,fn] of Object.entries(state.listeners))node.addEventListener(type,fn);
  }
  function adopt(target,proposal) {
    const next=states.get(proposal);
    if(next){bind(target,next.onTap,next.onLong);dispose(proposal);}else dispose(target);
  }
  return Object.freeze({bind,dispose,adopt});
})();
