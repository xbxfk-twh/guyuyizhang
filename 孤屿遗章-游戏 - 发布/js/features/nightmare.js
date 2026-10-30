/* nightmare：业务规则的唯一实现；Game 保留调用接口与装配。 */
const NightmareRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const persistPair=(...args)=>deps.persistPair(...args);
    const chance=(...args)=>deps.chance(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const invCount=(...args)=>deps.invCount(...args);
    const removeItem=(...args)=>deps.removeItem(...args);
    const lanternRiskMul=(...args)=>deps.lanternRiskMul(...args);
    const gainItem=(...args)=>deps.gainItem(...args);
    const startFight=(...args)=>deps.startFight(...args);
    const metaState=(...args)=>deps.metaState(...args);
    const lotteryRandom=(...args)=>deps.lotteryRandom(...args);
    const walletEntry=(...args)=>deps.walletEntry(...args);
function hardCompleted(st) {
    return !!(st && st.difficulty==='hard' && st.flags && (['A','B','S','S2'].some(k=>st.flags['ended_'+k]) || (st.ending && st.ending!=='D')));
  }

function difficultyUnlocked(id) {
    if(!['legend','nightmare'].includes(id)) return true;
    const m=metaState();
    if(m.challengeUnlocked || hardCompleted(gameState.run)) return true;
    // Old completed hard saves retain their qualification; deaths and chapter rituals do not qualify.
    let primary=null;try{primary=JSON.parse(localStorage.getItem('guyuyizhang_save') || 'null');}catch(_){}
    const qualified=hardCompleted(primary) || (m.slots || []).some(sl=>sl && hardCompleted(sl.data));
    if(qualified) m.challengeUnlocked=true;
    return qualified;
  }

function unlockChallenges() {
    if(!hardCompleted(gameState.run) || metaState().challengeUnlocked) return;
    const next=JSON.parse(JSON.stringify(gameState.run)),meta=JSON.parse(JSON.stringify(metaState()));meta.challengeUnlocked=true;
    if(persistPair(next,meta,false).ok) log('传奇与噩梦模式已解锁。','good');
  }

function nightmareInfo() {
    const day=gameState.run ? Math.max(1,gameState.run.day || 1) : 1,step=Math.min(10,Math.floor(day/20));
    const maxTier=[1,20,40,60,80,120].filter(d=>day>=d).length;
    const tiers=day>=200?[5,6]:Array.from({length:maxTier},(_,i)=>i+1);
    const weights=tiers.map(t=>Math.pow(t,1+step*.16));
    return {active:!!(gameState.run && gameState.run.difficulty==='nightmare' && !gameState.run.flags.ended_N),day,maxTier,tiers,weights,moveChance:.05+step*.02,gatherChance:.03+step*.01,bossReady:!!(gameState.run && (gameState.run.flags.boss_sunkenKing || (gameState.run.killCount.sunkenKing || 0)>0))};
  }

function nightmareEncounter(kind) {
    const n=nightmareInfo();
    if(!n.active || gameState.run.combat || gameState.run.death || gameState.run.ending || !chance((kind==='move'?n.moveChance:n.gatherChance) * lanternRiskMul()))return false;
    let roll=Math.random()*n.weights.reduce((a,b)=>a+b,0),tier=n.tiers[n.tiers.length-1];
    for(let i=0;i<n.tiers.length;i++){roll-=n.weights[i];if(roll<0){tier=n.tiers[i];break;}}
    log('空气忽然安静。一道不属于这里的影子挡住了你。','danger');startFight(ENEMIES['nightmare'+tier],true);return true;
  }

function challengeNightmareBoss() {
    if(!nightmareInfo().active || !nightmareInfo().bossReady || gameState.run.scene!=='atlantis' || gameState.run.zone!=='sanctum' || gameState.run.combat || gameState.run.death || gameState.run.ending)return {ok:false,reason:'击败沉没之王后，可在深水圣殿挑战噩梦之源。'};
    startFight(ENEMIES.nightmareBoss);return {ok:true};
  }

function reconcileNightmareSouls() {
    if(!gameState.run || !gameState.run._runId)return false;
    const track=(metaState().nightmareRuns||{})[gameState.run._runId];if(!track)return false;
    gameState.run.nightmare=gameState.run.nightmare||{};gameState.run.nightmare.consumedByTier=gameState.run.nightmare.consumedByTier||{};
    let blocked=false;
    for(const id of ['nightmareSoul','nightmareSoul2','nightmareSoul3']){
      const first=id==='nightmareSoul',already=first?(gameState.run.nightmare.consumed||0):(gameState.run.nightmare.consumedByTier[id]||0),total=first?(track.consumed||0):(track.consumedByTier?.[id]||0),owed=Math.max(0,total-already),take=Math.min(owed,invCount(id));
      if(take){removeItem(id,take);if(first)gameState.run.nightmare.consumed=already+take;else gameState.run.nightmare.consumedByTier[id]=already+take;}if(owed>take)blocked=true;
    }
    return blocked;
  }

const NIGHTMARE_SOULS = ['nightmareSoul','nightmareSoul2','nightmareSoul3'];

function nightmareInfusionBonus() {
    const choices=Object.values((gameState.run && gameState.run.nightmareInfusions) || {}).flat();
    return {def:choices.filter(x=>x==='hard').length,atk:choices.filter(x=>x==='blade').length*2,dodge:choices.filter(x=>x==='agile').length*.05};
  }

function infuseNightmare(id,choice) {
    if(!gameState.run || gameState.run.difficulty!=='nightmare' || gameState.run.scene!=='camp' || !gameState.run.furniture.nightmareExtractor || gameState.run.combat || gameState.run.death || gameState.run.ending)return {ok:false,reason:'需要在营地使用噩梦汲取仪。'};
    if(!NIGHTMARE_SOULS.includes(id) || !['hard','blade','agile'].includes(choice))return {ok:false,reason:'无效的选择。'};
    const next=JSON.parse(JSON.stringify(gameState.run)),meta=JSON.parse(JSON.stringify(metaState()));const failure=gameState.preview(next,meta,()=>{try {
      next.nightmareInfusions=next.nightmareInfusions || {};const choices=next.nightmareInfusions[id] || [];
      if(choices.length>=2)throw Error('此阶魂魄已完成两次选择。');
      if(invCount(id)<30 || !removeItem(id,30))throw Error('需要30份同阶魂魄。');
      next.nightmareInfusions[id]=[...choices,choice];
    } catch(e){return {ok:false,reason:e.message};}});
    if(failure)return failure;
    const result=persistPair(next,meta,false);if(!result.ok)return result;
    log('汲取仪回应了你的选择。你感到自身发生了变化。','good');change();return {ok:true};
  }

function separateSouls(qty=1,soulId='nightmareSoul') {
    if(!gameState.run || gameState.run.difficulty!=='nightmare' || gameState.run.scene!=='camp' || !gameState.run.furniture.soulSeparator || gameState.run.combat || gameState.run.death || gameState.run.ending)return {ok:false,reason:'需要在营地使用解魂器。'};
    if(!NIGHTMARE_SOULS.includes(soulId))return {ok:false,reason:'请选择魂魄等级。'};
    qty=Number(qty);if(![1,10,100].includes(qty))return {ok:false,reason:'请选择1、10或100份。'};
    const next=JSON.parse(JSON.stringify(gameState.run)),meta=JSON.parse(JSON.stringify(metaState()));let rewards={},soul=0,coins=0;
    const failure=gameState.preview(next,meta,()=>{try {
      if(reconcileNightmareSouls())throw Error('旧档中还有已分解魂魄待补足。');
      if(invCount(soulId)<qty || !removeItem(soulId,qty))throw Error('噩梦魂魄不足。');
      meta.nightmareRuns=meta.nightmareRuns || {};
      const track=meta.nightmareRuns[next._runId]=meta.nightmareRuns[next._runId] || {consumed:0};
      const tier=NIGHTMARE_SOULS.indexOf(soulId),basic=['wood','branch','stone','thatch','clay','flint','fiber'],rare=tier===2?['ironingot','steelingot','crystal','mithrilingot']:['ironingot','crystal'];
      track.sequence=track.sequence??track.consumed??0;track.consumedByTier=track.consumedByTier||{};
      for(let i=0;i<qty;i++) {
        const nonce=++track.sequence,rareDrop=lotteryRandom(next._runId,nonce,'soul-rare')<[0,.01,.02][tier],pool=rareDrop?rare:basic;
        const roll=lotteryRandom(next._runId,nonce,'soul-material'),id=rareDrop&&tier===2?(roll<.025?'mithrilingot':rare[Math.min(2,Math.floor((roll-.025)/.975*3))]):pool[Math.floor(roll*pool.length)],n=rareDrop?1:1+Math.floor(lotteryRandom(next._runId,nonce,'soul-qty')*3);
        rewards[id]=(rewards[id] || 0)+n;
        if(lotteryRandom(next._runId,nonce,'soul-point')<.2)soul++;
        if(lotteryRandom(next._runId,nonce,'soul-ad')<.03)coins++;
      }
      if(soulId==='nightmareSoul')track.consumed+=qty;else track.consumedByTier[soulId]=(track.consumedByTier[soulId]||0)+qty;
      next.nightmare=next.nightmare || {};next.nightmare.consumed=track.consumed;next.nightmare.consumedByTier={...track.consumedByTier};
      for(const [id,n]of Object.entries(rewards))gainItem(id,n);
      if(soul || coins){walletEntry(meta,`nightmare:${next._runId}:${track.sequence}`,coins,soul);meta.soul+=soul;}
    } catch(e){return {ok:false,reason:e.message};}});
    if(failure)return failure;
    const res=persistPair(next,meta,false);if(!res.ok)return res;
    log(`分解${qty}份魂魄：${Object.entries(rewards).map(([id,n])=>ITEMS[id].name+'×'+n).join('、')}${soul?'；魂点+'+soul:''}${coins?'；星之点+'+coins:''}。`,'good');change();
    return {ok:true,rewards,soul,coins};
  }
    return Object.freeze({hardCompleted,difficultyUnlocked,unlockChallenges,nightmareInfo,nightmareEncounter,challengeNightmareBoss,reconcileNightmareSouls,nightmareInfusionBonus,infuseNightmare,separateSouls});
  }
  return Object.freeze({create});
})();
