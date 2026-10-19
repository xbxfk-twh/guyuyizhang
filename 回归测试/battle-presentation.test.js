/* Same-seed paired engines: runtime effects must not change combat or saves. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../孤屿遗章-游戏 - 发布/js');
const data=fs.readFileSync(path.join(dir,'data.js'),'utf8'),game=require('./helpers/runtime.js').engineSource(path.join(dir,'game.js'));
// Control is the exact current engine with only presentation bookkeeping removed.
const control=game.replace('const events=[];combatEvents.set(C,events);','const events=[];')
 .replace(/fx\((?:e|tg|null),[^;]+\);/g,'');
let passed=0;
function engine(source){let seed=81233,calls=0;const math=Object.create(Math);math.random=()=>{calls++;seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const store={};
 const G=new Function('localStorage','window','document','console','Math','setTimeout','clearTimeout',data+'\n'+source+'\nreturn Game;')({getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]}, {},{cookie:''},{log(){},warn(){}},math,()=>1,()=>{});
 G.bind({onChange(){},onLog(){},onFight(){},onOverlay(){},onEnding(){}});G.newGame('hunter','normal');G.S().tut=null;
 for(const [id,n] of [['ironSword',2],['bow',1],['arrow',40],['salve',4]])G.addItem(id,n,true);
 G.S().equipment.weapon='ironSword';G.S().equipment.weapon2='bow';G.S().tree.combat={f_heavy:1,f_sure:1};G.S().stats.hp=10000;G.S().stats.stamina=10000;
 G.startFight({id:'probe',name:'试炼',hp:1000,atk:8,def:3,spd:12,traits:[],drops:[],desc:''},true);G.S().combat.dist=30;
 return {G,calls:()=>calls,store};
}
const a=engine(game),b=engine(control);
function state(g){const s=g.S();return JSON.stringify({stats:s.stats,inv:s.inv,dur:s.dur,toolDurs:s.toolDurs,toolMaxDurs:s.toolMaxDurs,statuses:s.statuses,combat:s.combat,miss:s.missStreak});}
for(const act of ['attack','ranged','defend','heavy','sure','ranged','attack','defend','heavy','sure','ranged']){
 a.G.fightAction(act);b.G.fightAction(act);assert.equal(state(a.G),state(b.G),act+' state');assert.equal(a.calls(),b.calls(),act+' random calls');passed++;
 const C=a.G.S().combat,events=a.G.takeCombatEvents(C);assert.ok(Array.isArray(events));assert.deepEqual(a.G.takeCombatEvents(C),[]);assert.ok(!JSON.stringify(C).includes('combatEvents'));passed++;
}
const C=a.G.S().combat;a.G.fightAction('ranged');a.G.save();const raw=Object.values(a.store).join('');assert.ok(!raw.includes('combatEvents')&&!raw.includes('target-marker'));passed++;
a.G.useItemInFight('salve');assert.equal(a.G.S().combat,C);passed++;
const stage=new Function('window','document',fs.readFileSync(path.join(dir,'battle-effects.js'),'utf8')+';return CombatStage;')({matchMedia:()=>({matches:false})},{querySelector:()=>null});
const plan=stage.timeline([{side:'player',type:'hit'},{side:'enemy',type:'move'},{side:'enemy',type:'taken'},{side:'player',type:'critical'}]);
assert.deepEqual(plan.map(p=>p.at),[0,500,1090,1590]);passed++;
assert.deepEqual(stage.timeline(plan.map(p=>p.event),true).map(p=>p.at),[0,0,0,0]);passed++;
assert.ok(stage.scale(0)>stage.scale(20)&&stage.scale(20)>stage.scale(80));passed++;
assert.ok(stage.logHtml(['<script>暴击 10点伤害</script>']).includes('&lt;script&gt;')&&!stage.logHtml(['<script>']).includes('<script>'));passed++;
for(const cls of ['log-danger','log-critical','log-good'])assert.ok(stage.logHtml(['暴击 10点伤害 掩护']).includes(cls));passed++;
assert.equal(stage.cutout('assets/img/enemies/wolf.png'),'assets/img/battle-cutouts/wolf.png');assert.equal(stage.cutout('assets/img/enemies/nightmare7.png'),'assets/img/enemies/nightmare7.png');passed++;
console.log(`通过 ${passed} 项，失败 0 项`);console.log('RESULT:PASS');
