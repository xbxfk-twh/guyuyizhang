/* 与本次隔离基线逐小时比较；固定随机源/现实时间，不使用玩家档。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'回归测试/_out/refactor-baseline-20261019');
const old=['data.js','game.js'].map(name=>fs.readFileSync(path.join(base,'js',name),'utf8')).join('\n');
const runtime=require('../../回归测试/helpers/runtime');
const current=runtime.logicFiles.map(name=>fs.readFileSync(path.join(root,'孤屿遗章-游戏 - 发布/js',name),'utf8')).join('\n');
function fresh(source,seed){
 const memory={},math=Object.create(Math);let n=seed;math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 class Clock extends Date{constructor(...args){super(...(args.length?args:[1792382400000]));}static now(){return 1792382400000;}}
 const storage={getItem:k=>memory[k]??null,setItem:(k,v)=>memory[k]=String(v),removeItem:k=>delete memory[k]};
 const sourceWithHook=source.replace('healthValue, pendingLootInfo','HOUR_EFFECTS, healthValue, pendingLootInfo');
 const g=new Function('localStorage','window','document','Math','Date',sourceWithHook+';return Game;')(storage,{}, {},math,Clock);
 g.bind({onLog(){},onChange(){},onFight(){},onEnding(){},onOverlay(){}});g.newGame('fisher','normal');return g;
}
let passed=0;
for(let seed=1;seed<=12;seed++)for(let variant=0;variant<8;variant++){
 const engines=[fresh(old,seed),fresh(current,seed)];
 for(const g of engines){const s=g.S();s.tut=null;s.capacity=999;s.tick=3000;s.inv={};s.warehouse={items:[]};s.buildings.cellar=0;s.cellar={items:[]};s.relics=['satchel'];s.relicSlots=1;s.relicEquip=['satchel'];
  for(const id of ['roastMeat','bread','berry','wheat','honey','water','meatStew'])g.addItem(id,3,true);
  if(variant&1){g.setSatchelSelections('food',['bread','berry']);g.setSatchelSelections('drink',['water']);}
  if(variant&2)g.setSatchelSelections('blocked',['wheat','water']);
  if(variant&4){s.cellar.items=[{id:'roastFish',qty:2,expiry:99999}];s.warehouse.items=[{id:'meatStew',qty:2,expiry:99999}];}
  if(variant===6){s.scene='atlantis';s.zone='habitat';g.atlantisCamp().furniture.seaStorage1=true;g.atlantisCamp().warehouse={items:[{id:'water',qty:3},{id:'bread',qty:2,expiry:99999}]};}
  if(variant===7){delete s.satchelChoices;s.satchelPref={food:'bread',drink:'water'};s.satchelRules={honey:{blocked:true}};g.save();g.load();}
 }
 for(let hour=0;hour<10;hour++){
  for(const g of engines){g.S().stats.hunger=10;g.S().stats.thirst=10;g.satchelStatus();g.HOUR_EFFECTS(g.S().tick);g.S().tick+=60;}
  assert.deepEqual(JSON.parse(JSON.stringify(engines[1].S())),JSON.parse(JSON.stringify(engines[0].S())),`seed ${seed} variant ${variant} hour ${hour}`);
  assert.equal(engines[1].exportCode(),engines[0].exportCode(),`save bytes seed ${seed} variant ${variant} hour ${hour}`);
 }
 passed++;
}
fs.writeFileSync(path.join(base,'satchel-equivalence.json'),JSON.stringify({seeds:12,scenarios:8,hours:10,cases:passed,stateEqual:true,saveCodeEqual:true},null,2));
console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
