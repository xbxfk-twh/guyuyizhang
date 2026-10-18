/* 独立内存存储；测试内暴露只读随机函数，用于分布检查。 */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
let source=['data.js','game.js'].map(f=>fs.readFileSync(path.join(__dirname,'../孤屿遗章-游戏 - 发布/js',f),'utf8')).join('\n');
source=source.replace('lotteryState, lotteryValue, lotteryChance, lotteryOffer,','lotteryRandom, lotteryState, lotteryValue, lotteryChance, lotteryOffer,');
const memory={},storage={getItem:k=>memory[k] || null,setItem:(k,v)=>memory[k]=String(v),removeItem:k=>delete memory[k]};
const {Game:G,ITEMS,RECIPES}=new Function('localStorage','window','document',source+'\nreturn {Game,ITEMS,RECIPES};')(storage,{},{});
G.bind({onChange(){},onLog(){},onFight(){},onEnding(){},onOverlay(){}});
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('OK '+name);};
function fresh(run){G.newGame('fisher','normal');const s=G.S();s.tut=null;s.capacity=999;if(run)s._runId=run;s.scene='atlantis';while(!G.lotteryState().active)s.day++;s.zone=G.lotteryState().zone;s.inv.beibi=50000;return s;}
function track(s,extra={}){const m=G.metaState();m.lotteryRuns=m.lotteryRuns || {};return m.lotteryRuns[s._runId]={credit:0,misses:0,nonce:0,lastDay:s.day,uses:0,...extra};}

test('充能独立于抽奖，足够十连也不自动抽；十连仅扣能量',()=>{
 const s=fresh();track(s);const before=G.invCount('beibi');assert.equal(G.lotteryDeposit('beibi',1500).ok,true);
 assert.equal(G.invCount('beibi'),before-1500);assert.equal(G.lotteryState().credit,1500);assert.equal(G.lotteryState().uses,0);
 assert.equal(G.lotteryDraw(10).times,10);assert.equal(G.lotteryState().credit,500);assert.equal(G.invCount('beibi'),before-1500);
});
test('抽满当天次数仍可充能，充能保留保底且旧码不能返还物品',()=>{
 const s=fresh();track(s,{uses:200,misses:9});const before=G.exportCode(),coins=G.invCount('beibi');
 assert.equal(G.lotteryDeposit('beibi',250).ok,true);assert.equal(G.lotteryState().uses,200);assert.equal(G.lotteryState().misses,9);assert.equal(G.lotteryState().credit,250);
 assert.equal(G.importCode(before).ok,true);assert.equal(G.invCount('beibi'),coins-250);assert.equal(G.lotteryState().credit,250);assert.equal(G.lotteryDraw(1).ok,false);
});
test('读旧码对齐已投入武器，不遗留装备属性；重复导入不多扣',()=>{
 const s=fresh();track(s);G.addItem('ironSword',1,true);G.equip('ironSword');const old=G.exportCode();
 assert.equal(G.lotteryDeposit('ironSword',1).ok,true);assert.equal(G.importCode(old).ok,true);
 assert.equal(G.invCount('ironSword'),0);assert.equal(G.S().equipment.weapon,null);const credit=G.lotteryState().credit;
 assert.equal(G.importCode(old).ok,true);assert.equal(G.invCount('ironSword'),0);assert.equal(G.lotteryState().credit,credit);
});
test('备份及日出回溯保留充能，已投入物品不返还',()=>{
 const s=fresh();track(s);const coins=G.invCount('beibi');G.metaState().backupPoints=1;
 s.dawnCheckpoint={version:1,state:JSON.parse(JSON.stringify(s))};assert.equal(G.backupSlot(0).ok,true);
 assert.equal(G.lotteryDeposit('beibi',200).ok,true);assert.equal(G.loadSlot(0).ok,true);
 assert.equal(G.invCount('beibi'),coins-200);assert.equal(G.lotteryState().credit,200);
 G.metaState().soul=50;assert.equal(G.reviveToday().ok,true);assert.equal(G.invCount('beibi'),coins-200);assert.equal(G.lotteryState().credit,200);
});
test('不足100可存，混合物品凑够100才消耗一次抽奖',()=>{
 const s=fresh();s.inv.wood=10;assert.equal(G.lotteryOffer('wood',10).times,0);assert.equal(G.lotteryState().credit,20);assert.equal(G.lotteryState().uses,0);
 assert.equal(G.lotteryOffer('beibi',79).times,0);assert.equal(G.lotteryState().credit,99);assert.equal(G.lotteryState().uses,0);
 assert.equal(G.lotteryOffer('beibi',1).times,1);assert.equal(G.lotteryState().credit,0);assert.equal(G.lotteryState().uses,1);
});
test('仅抽选定次数，余额不会随中奖清空，也不会被5000截断',()=>{
 const s=fresh();track(s,{misses:9});const r=G.lotteryOffer('beibi',6000,1);
 assert.equal(r.times,1);assert.ok(r.reward);assert.equal(G.lotteryState().credit,5900);
 const before=G.invCount('beibi');assert.equal(G.lotteryDraw(10).times,10);assert.equal(G.lotteryState().credit,4900);assert.equal(G.invCount('beibi'),before);
});
test('旧储能一次迁入余额，旧字段保留；旧码不能恢复已经花掉的余额',()=>{
 const s=fresh();track(s,{credit:undefined,meter:350,pity:500,nonce:10});const old=G.exportCode();
 assert.equal(G.lotteryState().credit,350);assert.equal(G.lotteryDraw(3).times,3);assert.equal(G.lotteryState().credit,50);
 assert.equal(G.metaState().lotteryRuns[s._runId].meter,350);assert.equal(G.metaState().lotteryRuns[s._runId].pity,500);
 assert.equal(G.importCode(old).ok,true);assert.equal(G.lotteryState().credit,50);assert.equal(G.lotteryState().uses,3);
});
test('没有抽取时的存入也有版本号，读旧码不吞后来存入的价值',()=>{
 const s=fresh();track(s);const code=G.exportCode();G.lotteryOffer('beibi',70);G.lotteryOffer('beibi',20);
 assert.equal(G.importCode(code).ok,true);assert.equal(G.lotteryState().credit,90);assert.equal(G.lotteryState().uses,0);
});
test('常规10%，第十抽必中奖；保底也能出史诗',()=>{
 let checked=false;
 for(let i=0;i<200;i++){
  const run='miss-streak-'+i;let valid=true;for(let n=1;n<=9;n++)if(G.lotteryRandom(run,n,'result')<0.1)valid=false;
  if(!valid)continue;const s=fresh(run);track(s);const r=G.lotteryOffer('beibi',1000,10);
  assert.equal(r.rewards.length,1);assert.equal(r.rewards[0].pity,true);assert.equal(G.lotteryState().misses,0);checked=true;break;
 }
 assert.ok(checked);
 let run;for(let i=0;i<1000;i++)if(G.lotteryRandom('epic-'+i,1,'pool')>=0.95){run='epic-'+i;break;}
 assert.ok(run);const s=fresh(run);track(s,{misses:9});assert.equal(G.lotteryOffer('beibi',100).reward.tier,'epic');
});
test('16种奖品第一抽均可获得，已有神物重复抽到入邮箱',()=>{
 const pools=G.lotteryPools(),found={};for(let i=0;i<20000 && Object.keys(found).length<16;i++){
  const run='first-prize-'+i,r=G.lotteryRandom(run,1,'pool'),pool=pools[r<0.7?0:r<0.95?1:2];
  const id=pool.items[Math.floor(G.lotteryRandom(run,1,'item')*pool.items.length)];found[id] ||= run;
 }
 assert.equal(Object.keys(found).length,16);
 for(const [id,run] of Object.entries(found)){
  const s=fresh(run);s.relics=['vampire','dodge','satchel','bloodvest'];const mails=G.mailboxList().length;
  track(s,{misses:9,bow:1,relic:1});G.metaState().lotteryBowAwarded=1;
  const r=G.lotteryOffer('beibi',100).reward;assert.equal(r.item || r.relic || 'adCoins',id);
  if(r.relic){assert.equal(r.mailed,true);assert.equal(G.mailboxList().length,mails+1);}
 }
});
test('抽取每日200、每批50；跨日保留余额与连续未中次数',()=>{
 const s=fresh();track(s,{credit:22000});for(let i=0;i<4;i++)assert.equal(G.lotteryDraw(50).times,50);
 assert.equal(G.lotteryState().uses,200);assert.equal(G.lotteryState().credit,2000);assert.equal(G.lotteryDraw().ok,false);
 const misses=G.lotteryState().misses,live=G.S();do{live.day++;}while(!G.lotteryState().active);live.zone=G.lotteryState().zone;
 assert.equal(G.lotteryState().credit,2000);assert.equal(G.lotteryState().misses,misses);assert.equal(G.lotteryState().uses,0);assert.equal(G.lotteryDraw(51).ok,false);
});
test('存入和抽奖写盘失败整次回滚，无吞物、扣余额或消耗保底',()=>{
 const s=fresh();track(s,{credit:70,misses:9});const before=G.exportCode(),original=storage.setItem;
 for(const act of [()=>G.lotteryOffer('beibi',100),()=>G.lotteryDeposit('beibi',100)]){
  let failed=false;storage.setItem=(k,v)=>{if(k==='guyuyizhang_meta' && !failed){failed=true;throw Error('disk full');}original(k,v);};
  try{assert.equal(act().ok,false);}finally{storage.setItem=original;}
  assert.equal(G.exportCode(),before);assert.equal(G.lotteryState().credit,70);assert.equal(G.lotteryState().misses,9);
 }
});
test('百万抽序列：基础10%、池70/25/5且同池各项分布相近',()=>{
 const pools=G.lotteryPools(),count={};let wins=0;const total=1000000;
 for(let n=1;n<=total;n++)if(G.lotteryRandom('distribution',n,'result')<0.1){wins++;
  const v=G.lotteryRandom('distribution',n,'pool'),p=pools[v<0.7?0:v<0.95?1:2],id=p.items[Math.floor(G.lotteryRandom('distribution',n,'item')*p.items.length)];count[id]=(count[id] || 0)+1;
 }
 assert.ok(Math.abs(wins/total-0.10)<0.002);
 for(const p of pools){let subtotal=0;for(const id of p.items)subtotal+=count[id] || 0;assert.ok(Math.abs(subtotal/wins-p.weight/100)<0.005);
  for(const id of p.items)assert.ok(Math.abs(count[id]/subtotal-1/p.items.length)<0.025);
 }
 console.log('基础命中率 '+(wins/total*100).toFixed(3)+'%，奖品计数 '+JSON.stringify(count));
});
test('超过五次服药仍增长，旧已用数继续累计，制作限制依然存在',()=>{
 const s=fresh();s.permUsed={tideVitalPill:5,abyssBreathPill:5};const hp=G.hpMax(),stam=G.maxStam();
 G.addItem('tideVitalPill',3,true);G.addItem('abyssBreathPill',3,true);for(let i=0;i<3;i++){G.useMed('tideVitalPill');G.useMed('abyssBreathPill');}
 assert.equal(G.hpMax(),hp+6);assert.equal(G.maxStam(),stam+9);assert.equal(G.S().permUsed.tideVitalPill,8);
 G.S().permMade={tideVitalPill:5,abyssBreathPill:5};G.S().furniture.medPot=true;
 for(const id of ['r_tidevital','r_abyssbreath'])assert.equal(G.canCraft(RECIPES.find(x=>x.id===id)).ok,false);
});
console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
