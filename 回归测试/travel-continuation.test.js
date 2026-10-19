/* Nightmare progression, real encounters, boss skills and transactional rewards; memory storage only. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const source=require('./helpers/runtime.js').logicFiles.map(f=>fs.readFileSync(path.join(__dirname,'../孤屿遗章-游戏 - 发布/js',f),'utf8')).join('\n');
let passed=0,failed=0;
function engine(store={}){
 const control={random:.99,fail:false,ending:null},math=Object.create(Math);math.random=()=>control.random;
 const ls={getItem:k=>store[k]??null,setItem:(k,v)=>{if(control.fail && k==='guyuyizhang_meta'){control.fail=false;throw Error('quota');}store[k]=String(v);},removeItem:k=>delete store[k]};
 const e=new Function('localStorage','window','document','console','Math','setTimeout','clearTimeout',source+'\nreturn {G:Game,ENEMIES,SCENES,ITEMS};')(ls,{}, {cookie:''},{log(){},warn(){}},math,()=>1,()=>{});
 e.G.bind({onChange(){},onLog(){},onFight(){},onOverlay(){},onEnding:id=>control.ending=id,onSaveFail(){}});
 return {...e,control,store};
}

function fresh(){const e=engine();e.G.newGame('fisher','normal');const s=e.G.S();s.tut=null;s.day=11;s.minute=14*60;s.scene='forest';s.buildings.watch=3;s.capacity=999;s.stats.hp=31;s.stats.hunger=28;s.stats.thirst=80;s.stats.stamina=100;e.control.random=0;e.overlays=[];e.G.bind({onOverlay:cfg=>e.overlays.push(cfg)});return e;}
function check(name,fn){try{fn();passed++;console.log('OK '+name);}catch(e){failed++;console.error('FAIL '+name+'\n'+e.stack);}}
function begin(e){const g=e.G,cost=g.travelCost('quarry'),before=g.S().stats.stamina;g.travel('quarry');assert.equal(g.S().scene,'forest');assert.equal(g.S().stats.stamina,before-cost.energy);const cfg=e.overlays.find(x=>x.title==='路被狼拦住了');assert.ok(cfg);cfg.choices[0].ok();return {cost,before};}
function finish(e){const g=e.G,c=g.S().combat;c.dist=0;c.enemies[0].ehp=1;c.enemies[0].atk=10;c.enemy.spd=c.enemies[0].spd=g.combatSpeed()+1;g.fightAction('attack');}
check('赶路遇狼、低生命警告和抵达事件并发，胜利后抵达一次',()=>{const e=fresh(),{cost,before}=begin(e);finish(e);assert.equal(e.G.S().scene,'quarry');assert.ok(e.G.S().stats.hp>0&&e.G.S().stats.hp<30);assert.equal(e.G.S()._roadAmbush,null);assert.equal(e.G.S().combat,null);assert.equal(e.G.S().log.filter(x=>x.text.includes('路通了')).length,1);assert.equal(e.G.S().stats.stamina,before-cost.energy);assert.ok(e.overlays.some(x=>x.kind==='danger'));});
check('战斗中存档重载，函数丢失仍从旧赶路记录恢复一次抵达',()=>{const e=fresh();begin(e);e.G.save();const f=engine(e.store);assert.equal(f.G.load(),true);assert.equal(f.G.S()._onFightWin,undefined);f.control.random=0;finish(f);assert.equal(f.G.S().scene,'quarry');assert.equal(f.G.S()._roadAmbush,null);assert.equal(f.G.S().log.filter(x=>x.text.includes('路通了')).length,1);f.G.save();assert.equal(f.G.load(),true);assert.equal(f.G.S().scene,'quarry');assert.equal(f.G.S()._roadAmbush,null);});
check('玩家逃跑留在出发地，清除待续程记录',()=>{const e=fresh();begin(e);e.G.S().combat.smoke=true;e.G.fightAction('flee');assert.equal(e.G.S().scene,'forest');assert.equal(e.G.S().combat,null);assert.equal(e.G.S()._roadAmbush,null);assert.equal(e.G.S()._onFightWin,null);});
check('退回不误抵达，之后普通战斗不续旧程',()=>{const e=fresh();e.G.travel('quarry');e.overlays.find(x=>x.title==='路被狼拦住了').choices[1].ok();assert.equal(e.G.S().scene,'forest');assert.equal(e.G.S()._roadAmbush,null);e.G.S().stats.hp=80;e.G.startFight(e.ENEMIES.wolf,true);finish(e);assert.equal(e.G.S().scene,'forest');});
check('没有抵达记录的旧战斗照常结算，不推测目的地',()=>{const e=fresh();e.G.startFight(e.ENEMIES.wolf,true);delete e.G.S()._roadAmbush;e.G.save();assert.equal(e.G.load(),true);finish(e);assert.equal(e.G.S().scene,'forest');assert.equal(e.G.S().combat,null);});
check('败亡不能抵达，清空旧回调及赶路记录',()=>{const e=fresh();begin(e);const c=e.G.S().combat;e.G.S().stats.hp=1;c.enemies[0].atk=100;c.enemy.spd=c.enemies[0].spd=e.G.combatSpeed()+1;e.G.fightAction('attack');assert.ok(e.G.S().death);assert.equal(e.G.S().scene,'forest');assert.equal(e.G.S()._roadAmbush,null);assert.equal(e.G.S()._onFightWin,null);});
console.log(`通过 ${passed} 项，失败 ${failed} 项`);console.log('RESULT:'+(failed?'FAIL':'PASS'));process.exitCode=failed?1:0;
