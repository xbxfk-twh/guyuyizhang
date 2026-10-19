// Manual tool slots must survive load, gathering and broken-tool replacement.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
let source=require('../../回归测试/helpers/runtime.js').logicFiles.map(f=>fs.readFileSync(path.join(__dirname,'../../孤屿遗章-游戏 - 发布/js',f),'utf8')).join('\n');
source=source.replace('healthValue, pendingLootInfo','HOUR_EFFECTS, triggerRandomEvent, lanternRiskMul, arriveAt, fitsInBag, gainItem, healthValue, pendingLootInfo');
function fresh(){const store={},math=Object.create(Math);const control={random:.99,fail:false,autoNotify:true,overlays:[]};math.random=()=>control.random;
 const e=new Function('localStorage','window','document','console','Math','setTimeout','clearTimeout',source+'\nreturn {G:Game,ITEMS,RECIPES,DURA,RANDOM_EVENTS,ATLANTIS_FURNITURE,SEASONS,WEATHER,DIFFICULTIES,FURNITURE,BUILDING_CHAINS,ENEMIES,SKILL_TREES};')({getItem:k=>store[k]??null,setItem:(k,v)=>{if(control.fail){control.fail=false;throw Error('quota');}store[k]=String(v);},removeItem:k=>delete store[k]}, {},{cookie:''},{log(){},warn(){}},math,()=>1,()=>{});
 e.G.bind({onChange(){},onLog(){},onFight(){},onOverlay(cfg){control.overlays.push(cfg);if(control.autoNotify)cfg.onShown?.();},onEnding(){},onSaveFail(){}});e.G.newGame('fisher','normal');e.G.S().tut=null;return {...e,control};}
let passed=0,failed=0;function check(n,f){try{f();passed++;console.log('OK '+n);}catch(e){failed++;console.error('FAIL '+n+'\n'+e.stack);}}




const result={tools:[],combat:[],talents:{},buildingMaterials:{}};
for(const tool of ['axeStone','axeIron','axeSteel']){
 const e=fresh(),g=e.G,s=g.S();s.capacity=999;s.scene='forest';s.inv={};s.weather='sun';g.addItem(tool,1,true);g.equipTool(tool);const p=g.pointsOf().find(p=>p.id==='forest_tree'),fixed={...p,yields:p.yields.map(y=>y.id==='wood'?{...y,min:3,max:3}:y)};const tick=s.tick,energy=s.stats.stamina;g.doPoint(fixed);result.tools.push({tool,wood:g.invCount('wood'),minutes:s.tick-tick,energy:energy-s.stats.stamina,durability:g.durOf(tool)});
}
for(const enemy of ['rabbit','wolf','ox'])for(const weapon of ['ironSword','ironGreatSword']){
 const e=fresh(),g=e.G,s=g.S();e.control.random=.5;s.inv={};s.capacity=999;s.scene='forest';s.minute=720;s.weather='sun';for(const id of [weapon,'leatherArmor'])g.addItem(id,1,true);s.equipment.weapon=weapon;s.equipment.armor='leatherArmor';g.startFight([e.ENEMIES[enemy]],true);const C=s.combat,spd=C.spdP,seq=[];let turns=0;while(s.combat&&!s.death&&turns<30){g.fightAction('attack',0);seq.push(g.takeCombatEvents(C).map(x=>({side:x.side,type:x.type,value:x.value})));turns++;}result.combat.push({enemy,weapon,speed:spd,interval:100/spd,turns,hpLeft:s.stats.hp,weaponWear:e.DURA[weapon]-(g.durOf(weapon)||0),armorWear:e.DURA.leatherArmor-(g.durOf('leatherArmor')||0),firstEvents:seq[0],outcome:s.death?'death':s.combat?'unfinished':'ended'});
}
for(const kind of ['gather','craft','combat']){const e=fresh(),g=e.G,t=g.skillTreeInfo()[kind];result.talents[kind]={cost:t.cost,trunk:t.trunk,nodes:t.nodes.slice(0,2)};}
const e=fresh();for(const [chain,steps] of Object.entries(e.BUILDING_CHAINS))result.buildingMaterials[chain]=steps.reduce((sum,x)=>{for(const [id,n]of Object.entries(x.mats||{}))sum[id]=(sum[id]||0)+n;return sum;},{});
fs.mkdirSync(path.join(__dirname,'../../回归测试/_out'),{recursive:true});fs.writeFileSync(path.join(__dirname,'../../回归测试/_out/oct16-balance-audit.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({tools:result.tools,combat:result.combat,firstTalentCosts:Object.fromEntries(Object.entries(result.talents).map(([k,v])=>[k,v.cost]))},null,2));console.log('RESULT:PASS');
