/* 本轮行为契约：独立内存存储，不读取玩家存档。 */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const source=require('./helpers/runtime.js').logicFiles.map(f=>fs.readFileSync(path.join(__dirname,'../孤屿遗章-游戏 - 发布/js',f),'utf8')).join('\n');
const store={},storage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};
const {Game:G,ITEMS,RECIPES,TOWN,PATCH_NOTES,DURA}=new Function('localStorage','window','document',source+'\nreturn {Game,ITEMS,RECIPES,TOWN,PATCH_NOTES,DURA};')(storage,{},{});
G.bind({onChange(){},onLog(){},onFight(){},onEnding(){},onOverlay(){}});
let passed=0;function test(n,fn){fn();passed++;console.log('OK '+n);}
function fresh(d='normal'){if(d==='legend')G.metaState().challengeUnlocked=true;G.newGame('fisher',d);const s=G.S();s.tut=null;s.capacity=999;s._testNoAmbush=true;return s;}
test('新鲜食品合堆保留各批到期时间，先吃旧批',()=>{
 const s=fresh();s.inv={};s.foodExp={};G.addItem('superEgg',2,true);const old=s.foodExp.superEgg;
 s.tick+=1440*3;G.addItem('superEgg',1,true);const f=G.foodFreshness('superEgg');assert.equal(f.length,2);assert.equal(f[1].minutes,ITEMS.superEgg.spoil*120);
 assert.equal(s.foodExp.superEgg,old);G.removeItem('superEgg',2);assert.equal(G.foodFreshness('superEgg').length,1);assert.equal(G.foodFreshness('superEgg')[0].minutes,ITEMS.superEgg.spoil*120);
 G.save();assert.ok(G.load());assert.equal(G.foodFreshness('superEgg').length,1);
});
test('老档只有 foodExp 时按原期限迁移，不延长也不丢食物',()=>{
 const s=fresh();s.inv={superEgg:4};s.foodExp={superEgg:s.tick+180};delete s.foodBatches;G.addItem('superEgg',1,true);
 assert.deepEqual(G.foodFreshness('superEgg').map(x=>x.qty),[4,1]);assert.equal(G.foodFreshness('superEgg')[0].minutes,180);
});
test('部分过期仅损失旧批，新批留在背包',()=>{
 const s=fresh();s.inv={};s.foodExp={};G.addItem('superEgg',2,true);s.foodExp.superEgg=s.tick+60;s.foodBatches.superEgg[0].exp=s.tick+60;
 s.tick+=10;G.addItem('superEgg',3,true);G.addMin(120);assert.equal(G.invCount('superEgg'),3);assert.equal(G.invCount('rot'),2);
});
for(const [node,cost] of [['c_line',6],['c_finework',13]]) test(node+'：一份材料十件按精确比例结算，单件与批量一致',()=>{
 const r={id:'test_round',name:'测试斧',in:{wood:1},out:{axeStone:1},station:'none',time:3};let s=fresh();s.inv={wood:100};s.tree.craft[node]=1;
 for(let i=0;i<10;i++)G.craft(r);assert.equal(G.invCount('wood'),100-cost);assert.equal(G.invCount('axeStone'),10);
 s=fresh();s.inv={wood:100};s.tree.craft[node]=1;assert.equal(G.craftBatch(r,10).ok,true);assert.equal(G.invCount('wood'),100-cost);assert.equal(G.invCount('axeStone'),10);
});
test('材料余额保存后保留；不足时无免费精工',()=>{
 const s=fresh(),r={id:'test_credit',name:'测试',in:{wood:1},out:{axeStone:1},station:'none',time:3};s.inv={wood:1};s.tree.craft.c_finework=1;
 assert.equal(G.canCraft(r).ok,false);assert.equal(G.invCount('wood'),1);s.inv.wood=20;G.craft(r);assert.equal(G.craftIn(r).wood,1);G.save();G.load();assert.equal(G.craftIn(r).wood,1);
});
test('流水线批量精算返还不超过实际扣料，不能净生成材料',()=>{
 const s=fresh(),r={id:'test_refund',name:'测试',in:{wood:1},out:{axeStone:1},station:'none',time:3};s.inv={wood:20};s.tree.craft.c_line=1;s.skill.craft=1;s.skillPicks.craft=['refund'];
 const rand=Math.random;Math.random=()=>0;try{assert.equal(G.craftBatch(r,10).ok,true);}finally{Math.random=rand;}
 assert.equal(G.invCount('wood'),20);assert.equal(G.invCount('axeStone'),10);
});
test('传奇基础15格，造箱子新增独立15格仓库，老档默认20也迁移但自定容量保留',()=>{
 let s=fresh('legend');s.capacity=15;assert.equal(G.capacity(),15);s.capacity=20;assert.equal(G.capacity(),15);s.capacity=777;assert.equal(G.capacity(),777);
 s.capacity=15;s.inv.wood=30;s.inv.branch=4;G.buildChain('storage');assert.equal(s.buildings.storage,0);assert.equal(G.capacity(),15);assert.equal(G.warehouseCapacity(),15);
});
test('生食20%反胃持续720分，赶路采集游泳与锻炼共享体耗倍率',()=>{
 const s=fresh();s.inv.meat=2;const rand=Math.random;Math.random=()=>0.1;try{G.consume('meat');}finally{Math.random=rand;}
 assert.ok(s.statuses.nauseaUntil>s.tick);assert.equal(G.staminaCost(30),45);const cost=G.travelCost('forest');s.statuses.nauseaUntil=0;assert.equal(cost.energy,Math.ceil(G.travelCost('forest').energy*1.5));
 s.statuses.nauseaUntil=s.tick+720;G.addMin(720);assert.equal(G.staminaCost(30),30);
});
test('神之甲仅兑换入邮箱，每账号一次；无制造和商店入口',()=>{
 const s=fresh();G.metaState().codes=G.metaState().codes||{};assert.equal(ITEMS.divineArmor.def,6);assert.equal(DURA.divineArmor,110);
 assert.ok(!RECIPES.some(r=>r.out.divineArmor));assert.ok(!Object.values(TOWN).some(x=>(x.sell||[]).concat(x.buy||[]).some(e=>e.id==='divineArmor')));
 assert.equal(G.redeemCode('SHENJIA2026').ok,false);G.metaState().redeemed.SHENJIA2026=1;G.metaState().mailbox.push({code:'SHENJIA2026',item:'divineArmor',qty:1});assert.equal(G.redeemCode('SHENJIA2026').ok,false);const mail=G.mailboxList().find(x=>x.item==='divineArmor');assert.ok(mail);G.claimMailbox(mail.i);assert.equal(G.invCount('divineArmor'),1);
});
test('神之甲受实际攻击回复2，致死伤害不能复活',()=>{
 let s=fresh();G.addItem('divineArmor',1,true);G.equip('divineArmor');s.stats.hp=80;G.startFight({id:'dummy',name:'测试',hp:9999,atk:20,def:0,spd:99,traits:[],drops:[]},true);s.combat.dist=0;
 const rand=Math.random;Math.random=()=>0.99;try{G.fightAction('defend');}finally{Math.random=rand;}assert.ok(s.combat.log.some(x=>String(x).includes('【神之甲】回复 2')));
 s.stats.hp=1;Math.random=()=>0.99;try{G.fightAction('defend');}finally{Math.random=rand;}assert.ok(s.stats.hp<=0 || s.death);
});
test('旧公告撤下且不动物资邮件；新版草稿保持未批准',()=>{
 fresh();const m=G.metaState();m.mailbox=[{notice:'v1.09',title:'旧'},{item:'namecard',qty:1},{notice:'v1.10',title:'新'}];const list=G.mailboxList();assert.equal(list.length,2);assert.ok(list.some(x=>x.item==='namecard'));assert.deepEqual(PATCH_NOTES.map(x=>x.version),['v1.10']);assert.equal(PATCH_NOTES[0].approved,false);
});
test('药草未施肥在所有难度收2到3，腐烂物无回收摊，烤鱼同价',()=>{
 for(const d of ['easy','normal','hard','legend']) {const s=fresh(d);s.crops=[{seed:'seedHerb',remain:0}];const r=G.harvest();assert.ok(r.qty>=2&&r.qty<=3);}
 assert.ok(!Object.values(TOWN).some(x=>(x.buy||[]).some(e=>e.id==='rot')));assert.equal(TOWN.gourmet.buy.find(x=>x.id==='roastFish').base,8);
});
test('第十抽保底出奖、清零连续未中；回旧码不倒退账号次数',()=>{
 const s=fresh();s.scene='atlantis';while(!G.lotteryState().active)s.day++;s.zone=G.lotteryState().zone;s.inv.beibi=10000;
 const m=G.metaState();m.lotteryRuns=m.lotteryRuns||{};m.lotteryRuns[s._runId]={credit:99,misses:9,meter:3000,pity:5999,nonce:0,lastDay:s.day,uses:0};
 const before=G.exportCode();const r=G.lotteryOffer('beibi',1,1);assert.equal(r.ok,true);assert.equal(r.chance,1);assert.ok(r.reward);assert.equal(r.reward.pity,true);assert.equal(G.lotteryState().misses,0);assert.equal(G.lotteryState().uses,1);
 assert.equal(G.importCode(before).ok,true);assert.equal(G.lotteryState().misses,0);assert.equal(G.lotteryState().credit,0);assert.equal(G.lotteryState().uses,1);assert.equal(G.metaState().lotteryRuns[G.S()._runId].nonce,1);
 assert.equal(G.lotteryOffer('beibi',0,1).ok,false);assert.equal(G.lotteryOffer('beibi',1,0).ok,false);
});
test('源质锭收购价覆盖原料价值，海底交易机与对岸报价一致',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../孤屿遗章-游戏 - 发布/js/ui.js'),'utf8');
 const shop=new Function('return '+ui.match(/const ATL_SHOP = (\[[^;\n]+\]);/)[1])();
 const town=TOWN.informant.buy;
 for(const id of ['sourceOre','sourceBar','anctDevice'])assert.equal(shop.find(x=>x.id===id).base,town.find(x=>x.id===id).base);
 assert.equal(ITEMS.sourceOre.price,40);assert.equal(ITEMS.sourceBar.price,260);assert.ok(ITEMS.sourceBar.price>=2*ITEMS.sourceOre.price+ITEMS.anctDevice.price);
});
console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
