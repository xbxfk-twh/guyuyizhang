/* combat：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const CombatView = (() => {
  function create(deps) {
    const itemIcon=(...args)=>deps.itemIcon(...args);
    const $=(...args)=>deps.$(...args);
    const S=(...args)=>deps.S(...args);
    const esc=(...args)=>deps.esc(...args);
    const skinOn=(...args)=>deps.skinOn(...args);
    const render=(...args)=>deps.render(...args);
    const showBuffInfo=(...args)=>deps.showBuffInfo(...args);
    const showModal=(...args)=>deps.showModal(...args);
    const showNextPendingPanel=(...args)=>deps.showNextPendingPanel(...args);
    const showEnding=(...args)=>deps.showEnding(...args);
function restoreCombatView() {
    const st=S();
    if(!st?.combat || st.death || st.ending)return false;
    if(!deps.battleView || deps.battleView.C!==st.combat || !$('.battle-board'))renderCombat('start',st.combat);
    return true;
  }

function renderCombat(kind, C) {
    const m = $('#modal');
    if (kind === 'start') {
      deps.fightSeq++;
      deps.modal=null;
      deps.modalOpenedAt=Date.now();
      Game.setTimeFreeze(false);
      deps.battleView = { C, ids:new WeakMap(), next:0, selected:null, phase:'idle', panel:null,visual:null,pendingEnd:null };
      const en=C.enemy;
      if (en && en.boss) try{ AudioFX.setBoss(true); }catch(e){}
      else try{AudioFX.setCombat(true);}catch(e){}
      const art=$('#scene-img') || $('#map-img');
      m.classList.add('open'); document.body.classList.add('modal-open');
      deps.dom.dispose(m);m.innerHTML=`<section class="modal-content combat-modal battle-board ${en.nightmare?'nightmare-fight':''}" style="--night-depth:${en.nightmare||0}" role="dialog" aria-modal="true" aria-label="战斗">
        <header class="battle-header"><div class="hp-line player-health"><span>生命</span><div class="hp-bar"><div id="php" class="hp-fill me"></div></div><span id="php-txt"></span></div><span id="battle-stamina"></span><b>${esc(en.name)}${en.boss?' · 首领':''}</b><span id="battle-round"></span><span id="battle-buffs"></span><span id="fight-status"></span><span id="battle-summary" role="status"></span></header>
        <div class="battle-field">${art?`<img class="battle-backdrop" src="${esc(art.currentSrc||art.src)}" alt="">`:''}<aside class="battle-journal"><header><b>战斗日志</b></header><div id="fight-log" class="fight-log" role="log"></div></aside><div id="fight-targets"></div><div id="battle-floats" aria-live="polite"></div><div id="battle-impact" class="battle-impact" aria-hidden="true"></div></div>
        <div id="fight-btns" class="fight-btns"></div><aside id="battle-panel" hidden></aside>
      </section>`;
      m.querySelector('.battle-board').addEventListener('click',battleClick);
      m.querySelector('.battle-board').addEventListener('keydown',e=>{if(e.repeat && (e.key==='Enter'||e.key===' '))e.preventDefault();});
      m.querySelector('.battle-board').tabIndex=-1;
      m.querySelector('.battle-board').focus({preventScroll:true});
      updateCombat(C); return;
    }
    if(kind==='update'){updateCombat(C);return;}
    if (kind === 'end') {
      if(!deps.battleView)return;
      if(['resolving','presenting'].includes(deps.battleView.phase)){deps.battleView.pendingEnd=C;return;}
      try{ AudioFX.setBoss(false); }catch(e){}
      try{AudioFX.setCombat(false);}catch(e){}
      const finishedView=deps.battleView;
      deps.battleView.phase='ended';
      if(C && C.enemies)paintTargetRows(C.enemies);
      $('#php').style.width=Math.max(0,S().stats.hp/Game.hpMax()*100)+'%';
      $('#php-txt').textContent=`${S().stats.hp}/${Game.hpMax()}`;
      $('#battle-summary').textContent=C.win?'击败敌人':S().stats.hp<=0?'你倒下了':'战斗结束';
      $('#fight-btns').classList.add('over');
      $('#fight-btns').querySelectorAll('button').forEach(b=>b.disabled=true);
      const seq=deps.fightSeq;
      setTimeout(()=>{if(seq!==deps.fightSeq)return;try{AudioFX.play(C.win?'good':'danger');}catch(e){}
        document.querySelector('#battle-buff-info')?.remove();deps.battleView=null;m.classList.remove('open');document.body.classList.remove('modal-open');deps.dom.dispose(m);m.innerHTML='';render();
        if(finishedView.ending){deps.pendingPanels=[];showEnding(finishedView.ending.id,finishedView.ending.reason);}
        else showNextPendingPanel();
      },1000);
    }
  }

function tgNameHtml(e) {
    const it = e.intent;
    const tag = it === 'charge' ? '<i class="intent-tag charge">蓄力</i>'
              : it === 'cover' ? '<i class="intent-tag cover">掩护</i>'
              : it === 'heavy' ? '<i class="intent-tag heavy">猛击</i>' : '';
    const charged = e.charged ? '<i class="intent-tag charge">下一击双倍</i>' : '';
    const coverOn = (e.cover && it !== 'cover') ? '<i class="intent-tag cover-on">被掩护</i>' : '';
    const effects = `${e.heavy ? ' · 破绽（防御0）' : ''}${e.bleed ? ' · 流血'+e.bleed : ''}${e.poison ? ' · 中毒'+e.poison : ''}`;
    return `${esc(e.name)}${e.isBoss ? ' <b class="badge danger">BOSS</b>' : ''}${tag}${charged}${coverOn}${effects}`;
  }

function tgPct(e) { const maxH = e.emax || 20; return Math.max(0, Math.min(100, e.ehp / maxH * 100)); }

function tgHpText(e) { const maxH = e.emax || 20; return `${Math.max(0, Math.round(e.ehp))}/${Math.round(maxH)}`; }

function battleId(e) {
    const v=deps.battleView;if(!v.ids.has(e))v.ids.set(e,++v.next);return v.ids.get(e);
  }

function battleName(e) {return e.name+' '+battleId(e);}

function battleTarget() {
    const v=deps.battleView;if(!v)return null;
    return (v.C.enemies||[]).find(e=>e.ehp>0 && battleId(e)===v.selected)||null;
  }

function paintTargetRows(es) {
    const box=$('#fight-targets');if(!box||!deps.battleView)return;
    const ids=new Set(es.map(battleId));
    box.querySelectorAll('.target').forEach(n=>{if(!ids.has(+n.dataset.eid))n.remove();});
    box.style.setProperty('--enemy-count',Math.max(1,es.length));box.classList.toggle('compact',es.length>5);
    es.forEach((e,i)=>{
      const id=battleId(e);let row=box.querySelector(`[data-eid="${id}"]`);
      if(!row){row=document.createElement('button');row.className='hp-line target';row.dataset.eid=id;
        const en=ENEMIES[e.id] || (e.id==='nightmareEcho'?ENEMIES.nightmare6:e.id==='wolfMinion'?ENEMIES.wolf: e.id==='spiderMinion'?ENEMIES.spider:null);
        row.innerHTML=`<span class="enemy-picture">${en?.img?`<img class="enemy-img" src="${esc(CombatStage.cutout(en.img,skinOn('seasons')))}" alt="${esc(e.name)}" onerror="this.hidden=true;this.parentNode.classList.add('missing-art')">`:''}<span class="enemy-fallback">${esc(e.name[0])}</span></span><span class="tg-name"></span><span class="hp-bar"><span class="hp-fill"></span></span><span class="tg-hp"></span><span class="enemy-intent"></span><span class="target-marker">▼ 目标</span>`;
        box.appendChild(row);
      }
      row.dataset.ti=i;row.disabled=e.ehp<=0;row.classList.toggle('selected',id===deps.battleView.selected);row.classList.toggle('boss-line',!!e.isBoss);
      row.setAttribute('aria-pressed',String(id===deps.battleView.selected));
      row.querySelector('.tg-name').textContent=battleName(e)+(e.isBoss?' · 首领':'');
      row.querySelector('.hp-fill').style.width=tgPct(e)+'%';row.querySelector('.tg-hp').textContent=tgHpText(e);
      row.querySelector('.enemy-intent').innerHTML=tgNameHtml(e).replace(esc(e.name),'').replace(/<b class="badge danger">BOSS<\/b>/,'');
      row.style.setProperty('--distance-scale',CombatStage.scale(deps.battleView.visual?.dist??deps.battleView.C.dist));
    });
  }

let soundCombat=null, soundCombatLength=0, soundCombatRound=0, soundCombatLast='';

function updateCombat(C) {
    if(!deps.battleView||deps.battleView.C!==C||!$('#php'))return;
    if(['resolving','presenting'].includes(deps.battleView.phase))return;
    if (soundCombat!==C) { soundCombat=C; soundCombatLength=C.log.length; soundCombatRound=C.round; soundCombatLast=C.log[C.log.length-1]; }
    const newLines=C.log.slice(soundCombatLength);
    if(!newLines.length&&(C.round!==soundCombatRound||C.log[C.log.length-1]!==soundCombatLast))newLines.push(C.log[C.log.length-1]||'');
    soundCombatLength=C.log.length;soundCombatRound=C.round;soundCombatLast=C.log[C.log.length-1];
    const actionSound=newLines.some(l=>/暴击|会心|要害/.test(l))?'critical':newLines.some(l=>/格挡|挡住/.test(l))?'guard':newLines.some(l=>/落空|闪避|躲开|未命中/.test(l))?'dodge':newLines.some(l=>/造成|伤害|击中/.test(l))?'hit':null;
    if(actionSound && !deps.battleView.silentUpdate)AudioFX.play(actionSound);
    const previous=deps.battleView.selected;
    if(!battleTarget() && deps.battleView.phase==='idle')deps.battleView.selected=C.enemies.find(e=>e.ehp>0)?battleId(C.enemies.find(e=>e.ehp>0)):null;
    paintTargetRows(deps.battleView.phase==='resolving'||deps.battleView.phase==='presenting' ? (C.finalEnemies||C.enemies) : C.enemies);
    const enemy=battleTarget() || (C.finalEnemies||[]).find(e=>battleId(e)===deps.battleView.selected), attack=Game.combatActionInfo('attack',enemy);
    $('#php').style.width=Math.max(0,Math.min(100,S().stats.hp/Game.hpMax()*100))+'%';
    $('#php-txt').textContent=`${S().stats.hp}/${Game.hpMax()}`;
    $('.battle-header').classList.toggle('critical-health',S().stats.hp/Game.hpMax()<.25);
    $('#battle-round').textContent='回合 '+C.round;
    $('#battle-stamina').textContent='体力 '+Math.round(S().stats.stamina);
    const combatBuffs=[S().statuses.fear?{name:'恐惧',text:'恐惧降低命中。防御可抵挡梦魇恐吓。'}:null,S().statuses.bleed?{name:'流血',text:'每小时失去5生命，并降低健康。止血绷带可以止血。'}:null,S().statuses.poison?{name:'中毒',text:'每小时失去3生命，并降低健康。解毒剂可以解毒。'}:null,C.nightStun?{name:'晕眩',text:'下一次行动会被晕眩打断。防御可抵挡梦魇施加晕眩。'}:null,...Game.activeBuffs().map(b=>({name:b.name,text:b.name+' +'+(b.stat==='accuracy'?Math.round(b.value*100)+'%':b.value)+'，剩余'+b.minutes+'分钟。'}))].filter(Boolean);
    $('#battle-buffs').innerHTML=combatBuffs.map((b,i)=>'<button class="battle-buff-name" data-combat-buff="'+i+'">'+esc(b.name)+'</button>').join('');
    $('#battle-buffs').querySelectorAll('[data-combat-buff]').forEach(b=>b.onclick=()=>{const v=combatBuffs[+b.dataset.combatBuff];showBuffInfo(v.name,v.text);});
    $('#fight-status').textContent=`${enemy?battleName(enemy):'无目标'} · 距离 ${C.dist||0} 步 · ${attack.approaching?'本次攻击先靠近':'命中 '+Math.round(attack.accuracy*100)+'%'}`;
    $('#battle-summary').textContent=previous&&previous!==deps.battleView.selected&&enemy?'目标已切换：'+battleName(enemy):'';
    const journal=$('.battle-journal #fight-log');if(journal){journal.innerHTML=CombatStage.logHtml(C.log);journal.scrollTop=journal.scrollHeight;}
    const rwId=[S().equipment.weapon,S().equipment.weapon2].find(id=>ITEMS[id]?.ranged),rw=ITEMS[rwId];
    const ammo=rw?(rw.ammoItem|| (Game.invCount('eagleArrow')?'eagleArrow':'arrow')):null;
    const skill=Game.hasHeavy()||Game.hasSure()||ITEMS[S().equipment.weapon]?.throw||Game.sweepInfo().alive>1||Game.sweepInfo().usable;
    const left=Math.max(0,2-(C.usedItems||0));
    const button=(a,name,sub,disabled=false)=>`<button data-fact="${a}" ${disabled?'disabled':''}><b>${name}</b><small>${esc(sub)}</small></button>`;
    $('#fight-btns').innerHTML=button('attack',attack.approaching?'靠近目标':'攻击',attack.approaching?'本次先靠近':'命中 '+Math.round(attack.accuracy*100)+'%')
      +(rw?button('ranged','射击',Game.invCount(ammo)?ITEMS[ammo].name+' ×'+Game.invCount(ammo):'缺'+ITEMS[ammo].name,!Game.invCount(ammo)):'')
      +button('defend','防御','防护本次全部来袭')+(skill?button('skills','战技','技能与冷却'):'')+button('item','道具','剩余 '+left+'/2',!left)+button('flee','逃跑','脱离战斗');
    if(deps.battleView.phase!=='idle')$('#fight-btns').querySelectorAll('button').forEach(b=>b.disabled=true);
    if(deps.battleView.panel)battlePanel(deps.battleView.panel);
  }

function battlePanel(kind) {
    const v=deps.battleView,box=$('#battle-panel');if(!v||!box)return;v.panel=kind;box.hidden=!kind;if(!kind)return;
    const C=v.C,enemy=battleTarget();
    let content='';
    if(kind==='log')content=`<div class="fight-log expanded-log">${CombatStage.logHtml(C.log)}</div>`;
    if(kind==='detail')content=`<p>${esc(enemy?(ENEMIES[enemy.id]?.desc||enemy.name):'没有目标')}</p><p>${enemy?tgNameHtml(enemy):''}</p>`;
    if(kind==='item'){
      const meds=Object.keys(ITEMS).filter(id=>(ITEMS[id].cat==='med'||id==='smokeBomb'||id==='poisonCoat')&&Game.invCount(id)>0);
      content=`<p>本场还可使用 ${Math.max(0,2-(C.usedItems||0))} 次</p><div class="battle-choices battle-item-cards">${meds.map(id=>`<button class="battle-item-card" data-med-id="${id}" ${(C.usedItems||0)>=2?'disabled':''}>${itemIcon(id)}<b>${esc(ITEMS[id].name)}</b><small>×${Game.invCount(id)}</small></button>`).join('')||'没有可用的战斗道具'}</div>`;
    }
    if(kind==='skills'){
      const acts=[];if(Game.hasHeavy())acts.push(['heavy','重击',Game.heavyInfo()]);if(Game.hasSure())acts.push(['sure','必中',Game.sureInfo()]);
      const sw=Game.sweepInfo();if(sw.alive>1||sw.usable)acts.push(['sweep','横扫 · 全体',sw]);
      if(ITEMS[S().equipment.weapon]?.throw)acts.push(['throw','投掷',{usable:!C.thrown,reason:C.thrown?'本场已使用':'每场一次'}]);
      content='<div class="battle-choices">'+acts.map(([a,n,info])=>{const q=Game.combatActionInfo(a,enemy),ok=info.usable&&q.available;return `<button data-fact="${a}" ${ok?'':'disabled'}><b>${n}</b><small>${esc(!q.available?'需要近战武器':!info.usable?info.reason:q.approaching?'本次先靠近':a==='sweep'?'全部目标':a==='throw'?'每场一次':'命中 '+Math.round(q.accuracy*100)+'%')}</small></button>`;}).join('')+'</div>';
    }
    box.innerHTML=`<header><b>${({log:'完整战况',detail:'敌人详情',item:'战斗道具',skills:'战技'})[kind]}</b><button data-bpanel="close">返回战场</button></header><div class="battle-panel-body">${content}</div>`;
    const log=box.querySelector('#fight-log');if(log)log.scrollTop=log.scrollHeight;
  }

async function battleClick(event) {
    const v=deps.battleView;if(!v||v.phase!=='idle')return;
    const target=event.target.closest('[data-eid]');
    if(target&&!target.disabled){v.selected=+target.dataset.eid;updateCombat(v.C);return;}
    const panel=event.target.closest('[data-bpanel]');if(panel){battlePanel(panel.dataset.bpanel==='close'?null:panel.dataset.bpanel);return;}
    const b=event.target.closest('[data-fact],[data-med-id]');if(!b||b.disabled)return;
    const act=b.dataset.fact;
    if(act==='skills'||act==='item'){battlePanel(act==='item'?'item':'skills');return;}
    const C=v.C,seq=deps.fightSeq,round=C.round;
    const ti=C.enemies.indexOf(battleTarget());if(ti<0 && !['defend','flee'].includes(act)&&!b.dataset.medId)return;
    const valid=()=>seq===deps.fightSeq&&deps.battleView===v;
    Game.takeCombatEvents(C);v.visual=CombatStage.snapshot(C);v.phase='resolving';
    $('#fight-btns').querySelectorAll('button').forEach(button=>button.disabled=true);
    if(b.dataset.medId){
      const flying=CombatStage.itemFlight(b,itemIcon(b.dataset.medId),ITEMS[b.dataset.medId].name,valid);
      battlePanel(null);
      if(!await flying || !valid())return;
      if(S().combat!==C){v.phase='idle';v.visual=null;return;}
    } else battlePanel(null);
    let used=true;
    try{if(b.dataset.medId)used=Game.useItemInFight(b.dataset.medId);else Game.fightAction(act,ti);}
    catch(e){v.phase='idle';v.visual=null;if(valid()){updateCombat(C);$('#battle-summary').textContent='行动未完成，请重试';}console.error(e);return;}
    if(seq!==deps.fightSeq)return;
    if(used===false || (!b.dataset.medId && S().combat===C && C.round===round)){
      v.phase='idle';v.visual=null;updateCombat(C);$('#battle-summary').textContent='当前行动不可用，请检查弹药、冷却或道具';return;
    }
    const events=Game.takeCombatEvents(C);
    v.phase='presenting';
    for(const enemy of C.finalEnemies||C.enemies)if(!v.visual.enemies.has(enemy))v.visual.enemies.set(enemy,enemy.emax);
    paintTargetRows(C.finalEnemies||C.enemies);CombatStage.frame(v,battleId);
    try{await CombatStage.present(events,v,battleId,valid);}
    catch(error){console.error(error);}
    if(!valid())return;
    v.visual=null;v.phase='idle';v.silentUpdate=true;
    $('#battle-floats').innerHTML='';
    if(v.pendingEnd){
      const fin=v.pendingEnd;v.pendingEnd=null;renderCombat('end',fin);
    }else{updateCombat(C);v.silentUpdate=false;}
  }

function showMedPicker(){if(deps.battleView)battlePanel('item');}

function askConfirm(text, onOk, okLabel) {
    showModal('overlay', {
      title: '确认',
      text: text,
      choices: [
        { label: okLabel || '确定', ok: () => { if (typeof onOk === 'function') onOk(); } },
        { label: '取消', hint: '什么都不做', ok: () => {} },
      ],
    });
  }
    return Object.freeze({restoreCombatView,renderCombat,tgNameHtml,tgPct,tgHpText,battleId,battleName,battleTarget,paintTargetRows,updateCombat,battlePanel,battleClick,showMedPicker,askConfirm});
  }
  return Object.freeze({create});
})();
