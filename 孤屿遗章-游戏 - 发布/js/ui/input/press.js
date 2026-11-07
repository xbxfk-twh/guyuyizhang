/* 单个节点只拥有一套手势监听；刷新仅替换动作，不中断正在进行的手势。 */
const PressInput = (() => {
  const states = new WeakMap();
  const clickGuards = new WeakMap();
  // 长按可能已经换走原节点；后续 click 会重定向到新窗口或空白层。
  // 由文档保留这一次手势的消费标记，直到松手后的 click 被吞掉。
  function install(doc) {
    if(!doc?.addEventListener)return null;
    if(clickGuards.has(doc))return clickGuards.get(doc);
    let pending=null, start=null;
    const guard={arm(pointerId){pending={pointerId,releasedAt:0};}};
    doc.addEventListener('pointerdown',event=>{
      if(event.isPrimary===false||event.button>0)return;
      pending=null;
      start={id:event.pointerId,x:event.clientX,y:event.clientY};
    },true);
    const track=event=>{
      if(!start||start.id!==event.pointerId||Math.hypot(event.clientX-start.x,event.clientY-start.y)<8)return;
      guard.arm(event.pointerId);
      start=null;
    };
    doc.addEventListener('pointermove',track,true);
    doc.addEventListener('pointerup',event=>{track(event);start=null;},true);
    doc.addEventListener('pointerup',event=>{if(pending&&(pending.pointerId===undefined||pending.pointerId===event.pointerId))pending.releasedAt=Date.now();},true);
    doc.addEventListener('pointercancel',()=>{pending=null;start=null;},true);
    doc.addEventListener('click',event=>{
      if(!pending||event.detail===0||event.isTrusted===false)return;
      const consume=!pending.releasedAt||Date.now()-pending.releasedAt<800;pending=null;
      if(consume){event.preventDefault();event.stopImmediatePropagation();}
    },true);
    clickGuards.set(doc,guard);return guard;
  }
  function dispose(node) {
    const state=states.get(node);if(!state)return;
    clearTimeout(state.timer);
    for(const [type,fn] of Object.entries(state.listeners))node.removeEventListener(type,fn);
    states.delete(node);
  }
  function bind(node,onTap,onLong) {
    let state=states.get(node);
    if(state){state.onTap=onTap;state.onLong=onLong;return;}
    state={onTap,onLong,timer:null,start:null,listeners:{}};
    const guard=install(node.ownerDocument);
    const dead=()=>node.disabled||node.classList.contains('lockedb');
    const clear=()=>{clearTimeout(state.timer);state.timer=null;};
    const abort=()=>{clear();state.start=null;};
    state.listeners={
      pointerdown:e=>{if(!state.onLong||dead()||e.isPrimary===false||e.button>0)return;clear();state.start={x:e.clientX,y:e.clientY};state.timer=setTimeout(()=>{state.timer=null;if(!node.isConnected||dead())return;guard?.arm(e.pointerId);state.onLong?.(state.start);},460);},
      pointermove:e=>{if(state.start&&Math.hypot(e.clientX-state.start.x,e.clientY-state.start.y)>=8)abort();},
      pointerup:abort,
      pointercancel:abort,pointerleave:abort,
      contextmenu:e=>e.preventDefault(),
      click:e=>{if(!dead())state.onTap?.();}
    };
    states.set(node,state);
    for(const [type,fn] of Object.entries(state.listeners))node.addEventListener(type,fn);
  }
  function adopt(target,proposal) {
    const next=states.get(proposal);
    if(next){bind(target,next.onTap,next.onLong);dispose(proposal);}else dispose(target);
  }
  return Object.freeze({install,bind,dispose,adopt});
})();
