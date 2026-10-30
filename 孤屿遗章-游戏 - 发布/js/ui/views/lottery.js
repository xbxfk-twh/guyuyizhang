/* lottery：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const LotteryView = (() => {
  function create(deps) {
    const itemIcon=(...args)=>deps.itemIcon(...args);
    const S=(...args)=>deps.S(...args);
    const esc=(...args)=>deps.esc(...args);
    const centerToast=(...args)=>deps.centerToast(...args);
    const askConfirm=(...args)=>deps.askConfirm(...args);
    const showModal=(...args)=>deps.showModal(...args);
let lotteryChoice={id:null,qty:1,cat:'all',run:null};

function lotteryIds() { return Object.keys(S().inv||{}).filter(id=>ITEMS[id] && Game.invCount(id)>0); }

function lotteryNormalize() {
    if(lotteryChoice.run!==S()._runId) { lotteryChoice={id:null,qty:1,cat:'all',run:S()._runId}; deps.lotteryLast=null; }
    const ids=lotteryIds();
    if(!ids.includes(lotteryChoice.id)) lotteryChoice.id=ids[0]||null;
    const have=Game.invCount(lotteryChoice.id);
    lotteryChoice.qty=Math.max(1,Math.min(have,Math.floor(lotteryChoice.qty)));
  }

function lotteryModal() {
    lotteryNormalize(); const c=lotteryChoice, state=Game.lotteryState(), have=Game.invCount(c.id);
    const value=c.id ? Game.lotteryValue(c.id)*c.qty:0;
    const remaining=Math.max(0,state.limit-state.uses), draws=Math.min(Math.floor(state.credit/state.cost),remaining);
    return `<div class="modal-title">◇ 遗海交换机 <button class="help-dot" data-lottery-pool aria-label="查看奖池">?</button></div>
      <div class="lottery-split"><section class="lottery-charge"><h3>抽奖机充能</h3>
      <button class="lottery-chosen" data-lottery-pick>${c.id?itemIcon(c.id):'＋'}<span>${c.id?esc(ITEMS[c.id].name):'选择投入物品'}<small>背包 ${have} 件 · 点击换物品</small></span></button>
      <div class="lottery-charge-row"><label>数量</label><div class="number-stepper"><button data-lottery-change="qty:-1" aria-label="减少数量">−</button><output id="lottery-qty">${c.qty}</output><button data-lottery-change="qty:1" aria-label="增加数量">＋</button></div></div>
      <div class="lottery-presets">${[1,10,100].map(n=>`<button data-lottery-set="qty:${n}">${n}</button>`).join('')}${have>0?`<button data-lottery-set="qty:${have}">全部</button>`:''}</div>
      <div id="lottery-preview">本次充能 +${value}</div><button id="lottery-submit" ${!c.id||have<c.qty?'disabled':''}>确认充能</button></section>
      <section class="lottery-draw-panel"><h3>抽奖</h3><div class="lottery-energy">能量 <b>${state.credit}</b><small>可抽 ${draws} 次 · 今日 ${state.uses}/${state.limit}</small></div>
      <div class="lottery-draw-buttons">${[1,10].map(n=>`<button data-lottery-draw="${n}" ${draws<n?'disabled':''}><b>${n===1?'单抽':'十连抽'}</b><small>${state.cost*n} 能量</small></button>`).join('')}</div>
      <div class="lottery-guarantee">${state.misses>=9?'下一抽必中奖':`保底进度 ${state.misses}/9`}</div></section></div>
      <div class="modal-actions"><button data-lottery-pool>查看奖池</button>${deps.lotteryLast?'<button data-lottery-last>上次结果</button>':''}<button id="modal-close">关闭</button></div>`;
  }

function lotteryPickModal() {
    lotteryNormalize(); const cats={all:'全部',food:'食物',mat:'材料',tool:'工具',weapon:'武器',armor:'防具',bp:'图纸',other:'其他'};
    const ids=lotteryIds().filter(id=>lotteryChoice.cat==='all'||ITEMS[id].cat===lotteryChoice.cat||(lotteryChoice.cat==='other'&&!Object.keys(cats).includes(ITEMS[id].cat)));
    return `<div class="modal-title">选择投入物品</div><div class="lottery-inventory"><nav class="lottery-categories">${Object.entries(cats).map(([id,name])=>`<button data-lottery-cat="${id}" class="${id===lotteryChoice.cat?'active':''}">${name}</button>`).join('')}</nav><div class="lottery-items">${ids.map(id=>`<button class="lottery-item" data-lottery-item="${id}">${itemIcon(id)}<b>${esc((ITEMS[id]||RELICS[id]).name)}</b><small>×${Game.invCount(id)}</small><small>价值 ${Game.lotteryValue(id)}/件</small></button>`).join('')||'<div class="hint">没有这类物品。</div>'}</div></div><div class="modal-actions"><button data-lottery-back>返回交换机</button></div>`;
  }

function lotteryPoolModal() {
    const pools=Game.lotteryPools();
    return `<div class="modal-title">遗海奖池</div><div class="lottery-warning">100 价值/抽 · 常规中奖率 10% · 连续 9 抽未中，第 10 抽保底。各池内奖品等概率；重复神物寄邮箱。</div><div class="lottery-pool">${pools.map(p=>`<section><b>${p.name} · ${p.weight}%</b><small>池内每种奖品各占 ${p.items.length===3?'1/3':p.items.length===8?'1/8':'1/5'}</small><div class="pool-items">${p.items.map(id=>id==='adCoins'?'<span>◇ 星之点 ×2–3</span>':`<span>${itemIcon(id)}${esc((ITEMS[id]||RELICS[id]).name)}${id==='wood'?' ×5–10':id==='honey'?' ×1–2':' ×1'}</span>`).join('')}</div></section>`).join('')}</div><div class="modal-actions"><button data-lottery-back>返回交换机</button></div>`;
  }

function lotteryResultModal(cfg) {
    const r=deps.lotteryLast; if(!r) return lotteryModal();
    const revealing=!!(cfg&&cfg.animate), rewards=r.rewards||[];
    return `<div class="modal-title">◇ 潮汐回响</div><div class="lottery-stage ${revealing?'is-spinning':'is-revealed'} ${rewards.length?'has-prize':'no-prize'}" aria-busy="${revealing}"><div class="astrolabe"><i class="orbit orbit-a"></i><i class="orbit orbit-b"></i><i class="orbit orbit-c"></i><span class="tide-orb">◇</span>${Array.from({length:12},(_,i)=>`<i class="tide-spark" style="--i:${i}"></i>`).join('')}</div><div class="lottery-outcome" role="status">${revealing?'星环正在归位……':esc(r.msg)}<div class="lottery-rewards">${rewards.map(p=>{if(p.adCoins)return `<span>◇ 星之点 ×${p.adCoins}</span>`;const id=p.item||p.relic; return `<span>${itemIcon(id)}${esc((ITEMS[id]||RELICS[id]).name)}${p.qty?' ×'+p.qty:''}</span>`;}).join('')}</div></div></div><div class="modal-actions">${revealing?'<button data-lottery-skip>跳过动画</button>':'<button data-lottery-back>继续投入</button><button id="modal-close">关闭</button>'}</div>`;
  }

function revealLottery() {
    clearTimeout(deps.lotteryTimer); deps.lotteryTimer=null;
    if (!deps.modal || deps.modal.kind!=='lotteryResult' || !deps.lotteryLast) return;
    showModal('lotteryResult',{animate:false}); AudioFX.play(deps.lotteryLast.rewards.length?'lotteryWin':'lotteryEmpty');
  }

function bindLottery(m,kind,cfg) {
    m.querySelectorAll('[data-lottery-pick]').forEach(b=>b.onclick=()=>showModal('lotteryPick'));
    m.querySelectorAll('[data-lottery-pool]').forEach(b=>b.onclick=()=>showModal('lotteryPool'));
    m.querySelectorAll('[data-lottery-back]').forEach(b=>b.onclick=()=>showModal('lottery'));
    m.querySelectorAll('[data-lottery-last]').forEach(b=>b.onclick=()=>showModal('lotteryResult',{animate:false}));
    m.querySelectorAll('[data-lottery-cat]').forEach(b=>b.onclick=()=>{lotteryChoice.cat=b.dataset.lotteryCat;showModal('lotteryPick');});
    m.querySelectorAll('[data-lottery-item]').forEach(b=>b.onclick=()=>{lotteryChoice.id=b.dataset.lotteryItem;lotteryChoice.qty=1;showModal('lottery');});
    m.querySelectorAll('[data-lottery-change],[data-lottery-set]').forEach(b=>b.onclick=()=>{
      const [key,num]=(b.dataset.lotteryChange||b.dataset.lotterySet).split(':');
      if(key!=='qty')return;
      lotteryChoice.qty=b.dataset.lotteryChange?lotteryChoice.qty+Number(num):Number(num);showModal('lottery');
    });
    m.querySelectorAll('[data-lottery-skip]').forEach(b=>b.onclick=revealLottery);
    m.querySelectorAll('[data-lottery-draw]').forEach(b=>b.onclick=()=>{if(b.disabled)return;b.disabled=true;const n=Number(b.dataset.lotteryDraw),state=Game.lotteryState();if(![1,10].includes(n)||state.credit<state.cost*n||state.limit-state.uses<n){centerToast('能量或今日剩余次数不足。');showModal('lottery');return;}const r=Game.lotteryDraw(n);if(!r.ok){centerToast(r.reason);showModal('lottery');return;}deps.lotteryLast=r;showModal('lotteryResult',{animate:true});});
    const submit=m.querySelector('#lottery-submit');
    if(submit) submit.onclick=()=>{
      if(submit.disabled) return; submit.disabled=true;
      const c={...lotteryChoice};
      askConfirm(`消耗 ${ITEMS[c.id].name}×${c.qty}，充能 +${Game.lotteryValue(c.id)*c.qty}。充能不会自动抽奖，能量会保留。`,()=>{
        const r=Game.lotteryDeposit(c.id,c.qty);
        if(!r.ok) {centerToast(r.reason);showModal('lottery');return;}
        centerToast(`充能成功，当前能量 ${Game.lotteryState().credit}`);showModal('lottery');
      },'确认充能');
    };
    if(kind==='lotteryResult' && cfg && cfg.animate) {
      AudioFX.play('lotteryStart');
      const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      deps.lotteryTimer=setTimeout(revealLottery,reduced?0:2200/deps.animSpeed);
    }
  }
    return Object.freeze({lotteryIds,lotteryNormalize,lotteryModal,lotteryPickModal,lotteryPoolModal,lotteryResultModal,revealLottery,bindLottery});
  }
  return Object.freeze({create});
})();
