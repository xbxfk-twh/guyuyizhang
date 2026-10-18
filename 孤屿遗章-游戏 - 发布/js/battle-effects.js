/* Combat presentation only. No random rolls, inventory writes or save fields. */
const CombatStage = (() => {
  const $ = s => document.querySelector(s);
  const escape = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
  function cutout(src, colored=false) {
    if(src && colored)return 'assets/img/battle-colored/' + (src.split('/').pop()==='boar.png'?'boar-v2.png':src.split('/').pop());
    if (!src || /nightmare\d/.test(src)) return src;
    return 'assets/img/battle-cutouts/' + src.split('/').pop();
  }
  function scale(dist) { return .46 + .54 / (1 + Math.max(0,dist || 0)/24); }
  function snapshot(C) {
    return {hp:Game.S().stats.hp,dist:C.dist || 0,enemies:new Map(C.enemies.map(e=>[e,e.ehp])),log:C.log.slice()};
  }
  function logHtml(lines) {
    return lines.map(line=>{
      const safe=escape(line);
      const marked=safe.replace(/【[^】]+】|暴击|会心|恐吓|晕眩|分裂|掩护|蓄力|流血|中毒|倒下了|击败|生命[+＋]\d+|\d+\s*点伤害/g,word=>{
        const cls=/掩护|生命|击败/.test(word)?'log-good':/暴击|会心/.test(word)?'log-critical':'log-danger';
        return '<strong class="'+cls+'">'+word+'</strong>';
      });
      return '<div class="fline">'+marked+'</div>';
    }).join('');
  }
  function weaponEffect(enemy) {
    const id=enemy?.id || '',traits=enemy?.traits || [];
    return traits.includes('gun')?'shot':/pirate|bone|Guard|guard|King/.test(id)?'slash':/tentacle|nightmare/.test(id)?'rift':/spider|scorpion|eagle|bat/.test(id)?'claw':'bite';
  }
  function strike(kind) {
    const stage=$('#battle-impact');if(!stage)return;
    stage.className='battle-impact '+kind;
    stage.innerHTML=kind==='bite'?'<i class="bite-upper"></i><i class="bite-lower"></i>':kind==='shot'?'<i class="shot-ring"></i><i class="shot-line"></i>':'<i class="cut cut-a"></i><i class="cut cut-b"></i><i class="cut cut-c"></i>';
    void stage.offsetWidth;stage.classList.add('active');
  }
  function frame(v, idOf) {
    const state=v.visual;if(!state)return;
    const hp=$('#php'),txt=$('#php-txt');
    if(hp)hp.style.width=Math.max(0,Math.min(100,state.hp/Game.hpMax()*100))+'%';
    if(txt)txt.textContent=Math.max(0,Math.round(state.hp))+'/'+Game.hpMax();
    $('.battle-header')?.classList.toggle('critical-health',state.hp/Game.hpMax()<.25);
    const status=$('#fight-status');if(status)status.textContent=status.textContent.replace(/距离 \d+ 步/,'距离 '+state.dist+' 步');
    $('#fight-targets')?.querySelectorAll('[data-eid]').forEach(row=>{
      const e=[...state.enemies.keys()].find(e=>idOf(e)===Number(row.dataset.eid));
      if(!e)return;
      const health=state.enemies.get(e);
      row.querySelector('.hp-fill').style.width=Math.max(0,health/e.emax*100)+'%';
      row.querySelector('.tg-hp').textContent=Math.max(0,Math.round(health))+'/'+e.emax;
      row.classList.toggle('fallen',health<=0);
      row.style.setProperty('--distance-scale',scale(state.dist));
    });
  }
  // Side changes are separated by half a second. Movement takes place before
  // the same enemy's strike and uses the engine's recorded distance endpoints.
  function timeline(events, reduce=false) {
    let time=0,side=null;
    return events.map((event,i)=>{
      if(i)time+=reduce?0:event.side!==side?500:230;
      const at=time;side=event.side;
      if(event.type==='move'||event.type==='approach')time+=reduce?0:360;
      return {event,at};
    });
  }
  async function present(events,v,idOf,valid) {
    const reduce=reduced(),plan=timeline(events,reduce),start=performance.now();
    for(const {event:f,at} of plan) {
      const remaining=at-(performance.now()-start);if(remaining>0)await sleep(remaining);
      if(!valid())return;
      const row=f.target?$('#fight-targets [data-eid="'+idOf(f.target)+'"]'):null;
      if(f.type==='move'||f.type==='approach'){
        v.visual.dist=f.to;
        frame(v,idOf);
        const mover=f.attacker?$('#fight-targets [data-eid="'+idOf(f.attacker)+'"]'):null;
        if(mover){mover.classList.remove('advancing');void mover.offsetWidth;mover.classList.add('advancing');}
      } else {
        if(f.target)v.visual.enemies.set(f.target,f.hpAfter);
        else if(f.hpAfter!==undefined)v.visual.hp=f.hpAfter;
        frame(v,idOf);
        if(row && ['hit','critical','bleed','poison'].includes(f.type)){
          row.classList.remove('struck');void row.offsetWidth;row.classList.add('struck');
        }
        if(f.type==='taken')strike(weaponEffect(f.attacker));
      }
      const labels={hit:'命中',critical:'暴击',miss:'未命中',dodge:'闪避',guard:'格挡',taken:'受伤',bleed:'流血',poison:'中毒',approach:'你正在靠近',move:'敌人正在逼近'};
      const journal=$('.battle-journal #fight-log');
      if(journal){
        const name=f.target?.name || '敌人',attacker=f.attacker?.name || '敌人';
        const text=f.type==='taken'?attacker+'对你造成'+f.value+'点伤害。'
          :f.type==='hit'||f.type==='critical'?'你'+(f.type==='critical'?'暴击':'击中')+'了'+name+'，造成'+f.value+'点伤害。'
          :f.type==='miss'?'你对'+name+'的攻击未命中。'
          :f.type==='guard'||f.type==='dodge'?'你'+(f.type==='guard'?'格挡':'闪避')+'了'+attacker+'的攻击。'
          :f.type==='bleed'||f.type==='poison'?name+'受到'+labels[f.type]+'，损失'+f.value+'点生命。'
          :f.type==='move'?attacker+'正在逼近（距离 '+f.from+' → '+f.to+'）。'
          :f.type==='approach'?'你正在靠近目标（距离 '+f.from+' → '+f.to+'）。':labels[f.type]||f.type;
        v.visual.log.push(text);journal.innerHTML=logHtml(v.visual.log);journal.scrollTop=journal.scrollHeight;
      }
      const floats=$('#battle-floats');
      if(floats)floats.innerHTML='<span class="battle-float '+escape(f.type)+'">'+escape((f.target?f.target.name+' · ':'')+(labels[f.type]||f.type)+(f.value?' −'+f.value:''))+'</span>';
      const sound=f.type==='critical'?'combatcritical':['guard','dodge','miss'].includes(f.type)?(f.type==='miss'?'dodge':f.type):f.type==='taken'?'combat'+weaponEffect(f.attacker):f.type==='hit'?'combatstrike':null;
      if(sound)try{AudioFX.play(sound);}catch(e){}
    }
    await sleep(reduce?80:420);
    if(valid())$('#battle-impact')?.classList.remove('active');
  }
  async function itemFlight(source,icon,name,valid) {
    if(reduced())return valid();
    const board=$('.battle-board');if(!board)return false;
    const origin=source.getBoundingClientRect(),bounds=board.getBoundingClientRect();
    const card=document.createElement('div');card.className='battle-flying-card';
    card.innerHTML=icon+'<b>'+escape(name)+'</b>';
    card.style.setProperty('--from-x',(origin.x+origin.width/2-bounds.x-bounds.width/2)+'px');
    card.style.setProperty('--from-y',(origin.y+origin.height/2-bounds.y-bounds.height/2)+'px');
    board.appendChild(card);
    await sleep(520);
    if(!valid()){card.remove();return false;}
    card.classList.add('shattering');
    for(let i=0;i<8;i++){const shard=document.createElement('i');shard.className='card-shard';shard.style.setProperty('--angle',i*45+'deg');card.appendChild(shard);}
    try{AudioFX.play('cardBreak');}catch(e){}
    await sleep(200);card.remove();return valid();
  }
  return {cutout,scale,snapshot,logHtml,timeline,frame,present,itemFlight};
})();
