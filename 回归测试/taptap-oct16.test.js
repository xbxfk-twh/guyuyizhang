// Manual tool slots must survive load, gathering and broken-tool replacement.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
let source=require('./helpers/runtime.js').logicFiles.map(f=>fs.readFileSync(path.join(__dirname,'../孤屿遗章-游戏 - 发布/js',f),'utf8')).join('\n');
source=source.replace('healthValue, pendingLootInfo','HOUR_EFFECTS, triggerRandomEvent, lanternRiskMul, arriveAt, fitsInBag, gainItem, healthValue, pendingLootInfo');
function fresh(){const store={},math=Object.create(Math);const control={random:.99,fail:false,autoNotify:true,overlays:[]};math.random=()=>control.random;
 const e=new Function('localStorage','window','document','console','Math','setTimeout','clearTimeout',source+'\nreturn {G:Game,ITEMS,RECIPES,DURA,RANDOM_EVENTS,ATLANTIS_FURNITURE,SEASONS,WEATHER,DIFFICULTIES,FURNITURE,BUILDING_CHAINS,ENEMIES,SKILL_TREES};')({getItem:k=>store[k]??null,setItem:(k,v)=>{if(control.fail){control.fail=false;throw Error('quota');}store[k]=String(v);},removeItem:k=>delete store[k]}, {},{cookie:''},{log(){},warn(){}},math,()=>1,()=>{});
 e.G.bind({onChange(){},onLog(){},onFight(){},onOverlay(cfg){control.overlays.push(cfg);if(control.autoNotify)cfg.onShown?.();},onEnding(){},onSaveFail(){}});e.G.newGame('fisher','normal');e.G.S().tut=null;return {...e,control};}
let passed=0,failed=0;function check(n,f){try{f();passed++;console.log('OK '+n);}catch(e){failed++;console.error('FAIL '+n+'\n'+e.stack);}}




function bag(e){const g=e.G,s=g.S();s.capacity=999;s.tick=3000;s.inv={};s.warehouse={items:[]};s.buildings.cellar=0;s.cellar={items:[]};s.relics=['satchel'];s.relicSlots=1;s.relicEquip=['satchel'];s.stats.hunger=10;s.stats.thirst=100;return s;}
check('三种优先食物依次使用，用完回到自动选择；每小时只吃一份',()=>{const e=fresh(),g=e.G,s=bag(e);for(const id of ['roastMeat','bread','berry','wheat'])g.addItem(id,1,true);g.setSatchelSelections('food',['roastMeat','bread','berry']);for(const id of ['roastMeat','bread','berry','wheat']){assert.equal(g.satchelStatus().food.id,id);s.stats.hunger=10;g.HOUR_EFFECTS(s.tick);assert.equal(g.invCount(id),0);assert.ok(s.stats.hunger<90);}assert.equal(g.satchelStatus().food,null);});
check('禁食优先于食物和饮料选择，缺货自动补选，完全禁食才提醒',()=>{const e=fresh(),g=e.G,s=bag(e);g.addItem('berry',2,true);g.addItem('wheat',2,true);g.setSatchelSelections('food',['berry']);g.setSatchelSelections('drink',['berry']);g.setSatchelSelections('blocked',['berry']);assert.equal(g.satchelStatus().food.id,'wheat');assert.equal(g.satchelStatus().drink,null);g.toggleSatchelSelection('blocked','wheat');g.HOUR_EFFECTS(s.tick);assert.equal(g.invCount('wheat'),2);assert.ok(s.satchelEmptyNotices.food);});
check('每组独立最多三种，第四种拒绝且不改已选，重复不占名额',()=>{const {G:g}=fresh();for(const kind of ['food','drink','blocked']){const ids=Object.keys(fresh().ITEMS).filter(id=>g.satchelEligible(id,kind)).slice(0,4);for(const id of ids.slice(0,3))assert.ok(g.toggleSatchelSelection(kind,id).ok);assert.equal(g.toggleSatchelSelection(kind,ids[3]).ok,false);assert.deepEqual(g.satchelSelections(kind),ids.slice(0,3));assert.ok(g.toggleSatchelSelection(kind,ids[1]).ok);assert.ok(g.toggleSatchelSelection(kind,ids[3]).ok);assert.deepEqual(g.satchelSelections(kind),[ids[0],ids[2],ids[3]]);}assert.equal(g.setSatchelSelections('food',['wheat','wheat']).ok,true);assert.deepEqual(g.satchelSelections('food'),['wheat']);});
check('选择保存重载、取消和只读副本互不干扰',()=>{const {G:g}=fresh();g.setSatchelSelections('food',['bread','wheat']);g.setSatchelSelections('drink',['water']);g.setSatchelSelections('blocked',['honey']);g.save();g.load();g.satchelSelections('food').push('berry');assert.deepEqual(g.satchelSelections('food'),['bread','wheat']);g.toggleSatchelSelection('food','bread');assert.deepEqual(g.satchelSelections('food'),['wheat']);assert.deepEqual(g.satchelSelections('drink'),['water']);assert.deepEqual(g.satchelSelections('blocked'),['honey']);});
check('旧单优先和禁食迁入新列表，保留量/最后吃/只吃指定不再暗中生效',()=>{const e=fresh(),g=e.G,s=bag(e);delete s.satchelChoices;s.satchelPref={food:'bread',drink:'water'};s.satchelRules={honey:{blocked:true},wheat:{keep:999,last:true}};s.satchelOnlySpecified=true;g.addItem('wheat',3,true);g.save();g.load();assert.deepEqual(g.satchelSelections('food'),['bread']);assert.deepEqual(g.satchelSelections('blocked'),['honey']);assert.equal(g.satchelStatus().food.id,'wheat');g.save();g.load();assert.deepEqual(g.satchelSelections('blocked'),['honey']);});
check('来源预览与实际扣除一致，海底不跨取岛仓地窖',()=>{const e=fresh(),g=e.G,s=bag(e);s.cellar.items=[{id:'roastMeat',qty:1,expiry:99999}];assert.equal(g.satchelStatus().food.site,'cellar');s.scene='atlantis';s.zone='habitat';g.atlantisCamp().furniture.seaStorage1=true;g.atlantisCamp().warehouse={items:[{id:'water',qty:2}]};s.stats.thirst=10;assert.equal(g.satchelStatus().food,null);assert.equal(g.satchelStatus().drink.site,'sea');g.HOUR_EFFECTS(s.tick);assert.equal(s.cellar.items[0].qty,1);assert.equal(g.atlantisCamp().warehouse.items[0].qty,1);s.relicEquip=[];assert.equal(g.satchelStatus().equipped,false);});
check('非法分类与危险/非食物被拒绝，存储失败回滚当前选择',()=>{const e=fresh(),g=e.G;for(const [kind,ids]of [['bad',[]],['food',['water']],['drink',['wood']],['blocked',['fish']],['food',null]])assert.equal(g.setSatchelSelections(kind,ids).ok,false);g.setSatchelSelections('food',['wheat']);g.S().satchelEmptyNotices={food:true,drink:true};e.control.fail=true;assert.equal(g.toggleSatchelSelection('food','bread').ok,false);assert.deepEqual(g.satchelSelections('food'),['wheat']);assert.deepEqual(g.S().satchelEmptyNotices,{food:true,drink:true});});
check('高炉取消图纸门槛，但仍需前置与材料',()=>{const {G:g}=fresh();g.S().inv={};g.S().warehouse={items:[]};let r=g.canBuildFurniture('fr3');assert.ok(r.reasons.some(x=>x.includes('先建造')));assert.ok(!r.reason.includes('图纸'));assert.ok(r.reason.includes('材料不足'));g.save();g.load();assert.equal(g.knowsBlueprint('bpFurnace'),false);assert.equal(g.canBuildFurniture('fr3').ok,false);});
check('图纸已学且背包仓库混合材料够时建造成功，仅扣一次',()=>{const e=fresh(),g=e.G,s=g.S();s.capacity=999;s.furniture.fr2=true;s.inv={stonebrick:5,bpFurnace:1};s.warehouse={items:[{id:'stonebrick',qty:7},{id:'ironpart',qty:4}]};g.learnBlueprint('bpFurnace');assert.equal(g.canBuildFurniture('fr3').ok,true);g.buildFurniture('fr3');e.control.overlays.at(-1).choices[0].ok();assert.ok(g.S().furniture.fr3);assert.equal(g.materialCount('stonebrick'),0);assert.equal(g.materialCount('ironpart'),0);assert.equal(g.canBuildFurniture('fr3').ok,false);});


check('优先饮料按选择顺序使用，缺货先喝水再选含水食物',()=>{const e=fresh(),g=e.G;bag(e);for(const id of ['honeyWater','vegSoup','water','berry'])g.addItem(id,1,true);g.setSatchelSelections('drink',['honeyWater','vegSoup']);for(const id of ['honeyWater','vegSoup','water','berry']){assert.equal(g.satchelStatus().drink.id,id);g.removeItem(id,1);}});
check('三种禁食均不被睡眠/移动耗时自动吃喝；手动仍能食用',()=>{const e=fresh(),g=e.G,s=bag(e);g.addItem('wheat',4,true);g.addItem('water',4,true);g.setSatchelSelections('blocked',['wheat','water']);s.stats.hunger=20;s.stats.thirst=20;g.addMin(180);assert.equal(g.invCount('wheat'),4);assert.equal(g.invCount('water'),4);g.consume('wheat');assert.equal(g.invCount('wheat'),3);});
check('旧档超过三个禁食时保持上限并给出一次重新确认提醒',()=>{const e=fresh(),g=e.G,s=g.S();delete s.satchelChoices;s.satchelRules=Object.fromEntries(['wheat','bread','berry','honey'].map(id=>[id,{blocked:true}]));g.save();g.load();assert.deepEqual(g.satchelSelections('blocked'),['wheat','bread','berry']);const n=g.S().log.filter(x=>JSON.stringify(x).includes('请长按卡面确认禁食选择')).length;assert.equal(n,1);g.save();g.load();assert.equal(g.S().log.filter(x=>JSON.stringify(x).includes('请长按卡面确认禁食选择')).length,1);});
check('老档一次性返还首点经验和高炉图纸基准价，重载不重复',()=>{const e=fresh(),g=e.G,s=g.S();delete s.balanceMigrationVersion;s.skill.gather=2;s.skill.craft=1;s.skillPicks.gather=['yield','speed'];s.skillPicks.craft=['speed'];s.exp.gather=3;s.exp.craft=5;s.learnedBlueprints.bpFurnace=true;const old=g.invCount('beibi');g.save();assert.ok(g.load());assert.equal(g.S().exp.gather,11);assert.equal(g.S().exp.craft,17);assert.equal(g.invCount('beibi'),old+200);g.save();g.load();assert.equal(g.S().exp.gather,11);assert.equal(g.invCount('beibi'),old+200);assert.equal(g.S().skill.gather,2);});
check('新档首点价格正确、后续不降价，不发老档补偿',()=>{const {G:g}=fresh();assert.equal(g.skillTreeInfo().gather.cost,16);assert.equal(g.skillTreeInfo().craft.cost,24);assert.equal(g.skillTreeInfo().combat.cost,12);g.S().exp.gather=16;assert.equal(g.skillUpTrunk('gather','speed').ok,true);assert.equal(g.S().exp.gather,0);assert.equal(g.skillTreeInfo().gather.cost,56);g.save();g.load();assert.equal(g.S().exp.gather,0);});
check('技能树出现前的老档仍按历史费用转换，不叠发首点退款',()=>{const {G:g}=fresh(),s=g.S();delete s.balanceMigrationVersion;delete s.tree;delete s.skillPicks;s.skill.gather=1;s.skill.craft=1;s.exp.gather=0;s.exp.craft=0;g.save();g.load();assert.equal(g.S().skill.gather,0);assert.equal(g.S().skill.craft,0);assert.equal(g.S().exp.gather,48);assert.equal(g.S().exp.craft,72);});
check('含水食物禁食同时约束解渴，取消后可重新优先使用',()=>{const e=fresh(),g=e.G,s=bag(e);g.addItem('berry',3,true);g.addItem('water',2,true);g.setSatchelSelections('drink',['berry']);g.setSatchelSelections('blocked',['berry']);assert.equal(g.satchelStatus().drink.id,'water');g.toggleSatchelSelection('blocked','berry');assert.equal(g.satchelStatus().drink.id,'berry');});
check('木板统一配方：基础4出2，铁钢4出3；旧入口不绕过装备条件',()=>{
 const e=fresh(),g=e.G,s=g.S();s.capacity=999;s.inv={};s.toolkit=[null,null,null];
 for(const [id,n]of [['wood',40],['axeIron',1],['axeSteel',1]])g.addItem(id,n,true);
 const base=e.RECIPES.find(r=>r.id==='r_plank'),iron=e.RECIPES.find(r=>r.id==='r_plank_iron'),steel=e.RECIPES.find(r=>r.id==='r_plank_steel');
 assert.equal(e.RECIPES.filter(r=>r.out.plank&&!r.legacyPlank).length,1);
 assert.equal(g.craftRecipe(base).out.plank,2);assert.equal(g.craftMinutes(base),30);
 let t=s.tick;g.craft(iron);assert.equal(g.invCount('wood'),36);assert.equal(g.invCount('plank'),2);assert.equal(s.tick-t,30);
 g.equipTool('axeIron');assert.equal(g.craftRecipe(base).out.plank,3);assert.equal(g.craftMinutes(base),20);
 t=s.tick;g.craft(base);assert.equal(g.invCount('wood'),32);assert.equal(g.invCount('plank'),5);assert.equal(s.tick-t,20);
 g.equipTool('axeSteel');t=s.tick;g.craft(steel);assert.equal(g.invCount('wood'),28);assert.equal(g.invCount('plank'),8);assert.equal(s.tick-t,20);
 const brick=e.RECIPES.find(r=>r.id==='r_brick_bulk');g.addItem('stone',4,true);g.addItem('clay',2,true);assert.equal(g.canCraft(brick).ok,false);s.furniture.fr2=true;t=s.tick;g.craft(brick);assert.equal(g.invCount('stonebrick'),5);assert.equal(s.tick-t,45);
});
check('木板批量与单做一致，余料不足不扣料，天赋不改变基础材料比例',()=>{
 for(const tool of [null,'axeStone','axeIron','axeSteel']){
  const e=fresh(),g=e.G,s=g.S();s.capacity=999;s.inv={};s.toolkit=[null,null,null];g.addItem('wood',15,true);if(tool){g.addItem(tool,1,true);g.equipTool(tool);}
  s.tree.craft.c_line=1;s.tree.craft.c_finework=1;
  const r=e.RECIPES.find(x=>x.id==='r_plank'),out=tool==='axeIron'||tool==='axeSteel'?3:2;
  assert.deepEqual(g.craftIn(r,3),{wood:12});assert.equal(g.craftMax(r),3);
  const t=s.tick,minutes=g.craftMinutes(r);assert.equal(g.craftBatch(r,3).ok,true);assert.equal(g.invCount('wood'),3);assert.equal(g.invCount('plank'),out*3);assert.equal(s.tick-t,minutes*3);
  const before=JSON.stringify(s.inv);g.craft(r);assert.equal(g.craftBatch(r,1).ok,false);assert.equal(JSON.stringify(s.inv),before);
 }
});
check('木板延迟确认时重新读取装备；不能使用旧预览多领产物',()=>{
 const e=fresh(),g=e.G,s=g.S();s.capacity=999;s.inv={};s.toolkit=[null,null,null];g.addItem('wood',8,true);g.addItem('axeIron',1,true);g.equipTool('axeIron');
 const r=g.craftRecipe(e.RECIPES.find(x=>x.id==='r_plank'));let run;g.craftBatch(r,2,f=>{run=f;});s.toolkit=[null,null,null];assert.equal(run().ok,true);assert.equal(g.invCount('plank'),4);assert.equal(g.invCount('wood'),0);
});
function sweepScenario({boss=false,round=1,dist=0,action='sweep',hp=9999}={}){const e=fresh(),g=e.G,s=g.S();s.capacity=999;g.addItem('ironGreatSword',1,true);s.equipment.weapon='ironGreatSword';s.tree.combat.f_sweep=1;s.stats.hp=100;s.stats.stamina=100;g.startFight({id:'probe',name:'靶子',boss,hp,atk:1,def:0,spd:15,traits:[],drops:[],desc:''},boss);const C=s.combat;C.round=round;C.dist=dist;e.control.random=.1;g.fightAction(action);return {e,g,s,C,events:g.takeCombatEvents(C)};}
check('横扫开局先于高速普通敌人，击杀不挨打',()=>{const {s,events}=sweepScenario({hp:1});assert.equal(s.stats.hp,100);assert.equal(events.find(x=>['hit','taken','critical','miss'].includes(x.type)).side,'player');});
check('横扫保留速度追赶，首领、后续回合和普通攻击顺序不变',()=>{let f=sweepScenario();assert.equal(f.events[0].side,'player');assert.ok(f.events.some(x=>x.type==='taken'));assert.equal(f.C.sweepCd,18);for(const cfg of [{boss:true},{round:2},{action:'attack'},{dist:25}]){f=sweepScenario(cfg);assert.equal(f.events[0].side,'enemy',JSON.stringify(cfg));}});
const winterLedger=[];
function winterRun(difficulty, oldWeatherPenalty=false){
 const saved=source;if(oldWeatherPenalty)source=source.replace("if (p.id === 'river_snow') weff = 1;",'');
 const e=fresh();source=saved;const g=e.G;g.newGame('fisher',difficulty);let s=g.S();s.tut=null;s.capacity=999;s.day=46;s.minute=480;s.tick=45*1440+480;s.inv={};s.foodBatches={};s.foodExp={};s.warehouse={items:[]};s.relicEquip=[];s.weather='snow';s.weatherRolled=true;s.flags.firstRaidDone=true;
 for(const [id,n]of [['water',4],['wood',100],['wheat',150],['furCoat',1]])g.addItem(id,n,true);s.equipment.cloth='furCoat';
 const recipe=e.RECIPES.find(r=>r.id==='r_meltwater'),rows=[];let died=false;
 const refill=()=>{for(let i=0;i<4&&s.stats.thirst<75&&g.invCount('water');i++)g.consume('water');for(let i=0;i<10&&s.stats.hunger<75&&g.invCount('wheat');i++)g.consume('wheat');};
 for(let day=0;day<7;day++){
  const start=s.tick,target=start+1440,before={water:g.invCount('water'),snow:g.invCount('snow'),wood:g.invCount('wood')};s.weather='snow';refill();g.travel('river');
  const p=g.pointsOf().find(x=>x.id==='river_snow');assert.ok(p);const minimum={...p,yields:p.yields.map(y=>({...y,max:y.min}))};
  for(let i=0;i<3;i++){g.doPoint(minimum);assert.equal(s.combat,null);}
  assert.equal(s.pointUses.river_snow,3);if(day===0){g.save();g.load();s=g.S();assert.equal(g.pointAvailable(minimum),false);}const snow=g.invCount('snow')-before.snow;g.travel('camp');let made=0;
  while(g.invCount('snow')>=2&&g.canCraft(recipe).ok){g.craft(recipe);made++;}
  const waterRoutineMinutes=s.tick-start;
  while(s.tick<target&&!s.death){refill();s.weather='snow';const minutes=Math.min(60,target-s.tick);if(s.stats.stamina<g.maxStam()&&minutes===60)g.rest(1);else g.addMin(minutes);}
  rows.push({day:46+day,snow,made,waterLeft:g.invCount('water'),woodUsed:before.wood-g.invCount('wood'),thirst:Number(s.stats.thirst.toFixed(2)),waterRoutineMinutes});
  if(s.death){died=true;break;}
 }
 return {difficulty,oldWeatherPenalty,died,rows};
}
check('连续7个雪天低产采雪与融雪，可在无高级设备时维持饮水',()=>{
 for(const difficulty of ['easy','normal','hard']){
  const before=winterRun(difficulty,true),after=winterRun(difficulty,false);winterLedger.push({before,after});assert.equal(after.died,false);assert.equal(after.rows.length,7);assert.ok(after.rows.every(x=>x.snow>=6&&x.thirst>0));assert.ok(after.rows.every(x=>x.woodUsed<=5));
 }
 fs.mkdirSync(path.join(__dirname,'_out'),{recursive:true});fs.writeFileSync(path.join(__dirname,'_out/oct16-winter-water.json'),JSON.stringify(winterLedger,null,2));
});
console.log(`通过 ${passed} 项，失败 ${failed} 项\nRESULT:${failed?'FAIL':'PASS'}`);process.exitCode=failed?1:0;
