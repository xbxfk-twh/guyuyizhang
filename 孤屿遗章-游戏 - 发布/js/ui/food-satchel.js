/* 食之包界面：只读取资格/数量并发送操作，不重算吃喝规则或修改存档。 */
const FoodSatchelView = (() => {
  function create({Game,ITEMS,itemIcon,esc,open,toast}) {
    const names={food:'选食物',drink:'选饮料',blocked:'选禁食'};
    const pickOf=cfg=>Object.hasOwn(names,cfg?.pick)?cfg.pick:'food';
    const menu={
      render:()=>'<div class="satchel-menu">'+Object.entries(names).map(([kind,name])=>`<button data-satchel="${kind}">${name}</button>`).join('')+'</div>',
      bind(root){root.querySelectorAll('[data-satchel]').forEach(button=>button.onclick=()=>open('satchelfood',{pick:button.dataset.satchel}));}
    };
    const picker={
      back:'satchelSettings',
      render(cfg){
        const kind=pickOf(cfg),selected=Game.satchelSelections(kind),available=Game.satchelAvailable();
        const ids=Object.keys(ITEMS).filter(id=>Game.satchelEligible(id,kind));
        ids.sort((a,b)=>Number((available[b]||0)>0)-Number((available[a]||0)>0));
        return `<div class="satchel-picker"><div class="modal-title">${names[kind]} <span class="satchel-count">${selected.length}/3</span></div>
          <div class="satchel-choices">${ids.map(id=>{const picked=selected.includes(id);return `<button class="satchel-choice ${picked?'is-selected':''}" data-satchelpick="${kind}:${id}" aria-pressed="${picked}" ${!picked&&selected.length===3?'disabled':''}>${itemIcon(id)}<span>${esc(ITEMS[id].name)}</span><small>×${available[id]||0}</small></button>`;}).join('')}</div>
          <div class="modal-actions"><button id="modal-back">返 回</button></div></div>`;
      },
      bind(root,cfg){root.querySelectorAll('[data-satchelpick]').forEach(button=>button.onclick=()=>{
        const [pick,id]=button.dataset.satchelpick.split(':'),result=Game.toggleSatchelSelection(pick,id);
        if(!result.ok){toast(result.reason);return;}
        open('satchelfood',{pick:pickOf(cfg)});
      });}
    };
    return Object.freeze({menu,picker});
  }
  return Object.freeze({create});
})();
