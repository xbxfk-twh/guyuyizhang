/* 10 月改动：内存存档，不接触玩家真实进度。 */
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const source = require('./helpers/runtime.js').logicFiles.map(f => fs.readFileSync(path.resolve(__dirname, '../孤屿遗章-游戏 - 发布/js', f), 'utf8')).join('\n');
const memory = {};
const storage = {getItem:k=>memory[k] || null,setItem:(k,v)=>{memory[k]=String(v);},removeItem:k=>{delete memory[k];}};
const {Game:G, ITEMS, RECIPES, DURA, TOWN, SCENES, SEASONAL_COMMISSIONS} = new Function('localStorage','window','document',source+'\nreturn {Game,ITEMS,RECIPES,DURA,TOWN,SCENES,SEASONAL_COMMISSIONS};')(storage,{},{});
G.bind({onChange(){},onLog(){},onFight(){},onEnding(){},onOverlay(){}});
let passed = 0;
function check(label, fn) { fn(); passed++; console.log('OK '+label); }
function fresh(diff='normal') { if(diff==='legend')G.metaState().challengeUnlocked=true;G.newGame('fisher',diff); const s=G.S(); s.tut=null; return s; }

check('已有堆叠跨格时阻止背包超容', () => {
  const s=fresh(); s.inv={wood:19,ironSword:19}; s.capacity=20;
  const before=G.capUsed();
  assert.equal(before,20);
  assert.equal(G.addItem('wood',2,true),false);
  assert.equal(s.inv.wood,19);
  assert.equal(G.capUsed(),20);
  assert.equal(G.addItem('beibi',50,true),true);
  assert.equal(G.capUsed(),20);
});
check('传奇三件套须自行建造，普通难度沿用旧开局', () => {
  assert.equal(fresh().buildings.house,0);
  const s=fresh('legend');
  assert.deepEqual([s.buildings.house,s.buildings.storage,s.buildings.fire],[-1,-1,-1]);
  assert.equal(G.houseSlots(),0);
  s.inv.wood=20; s.inv.branch=20; s.inv.thatch=20; s.inv.stone=20; s.inv.flint=20;
  G.buildChain('house'); G.buildChain('storage'); G.buildChain('fire');
  assert.deepEqual([s.buildings.house,s.buildings.storage,s.buildings.fire],[0,0,0]);
});
check('精工上限写入每件实例，修补和重载均保留', () => {
  const s=fresh(); s.capacity=999; s.furniture.wb1=true; s.furniture.grindstone=true;
  s.tree.craft.c_finework=1; s.inv.ironingot=10; s.inv.wood=10;
  G.craft(RECIPES.find(r=>r.id==='r_ironsword'));
  const max=Math.round(DURA.ironSword*1.3);
  assert.equal(G.durMaxOf('ironSword'),max);
  G.equip('ironSword'); G.drainById('ironSword');
  G.repairWeapon();
  assert.equal(G.durOf('ironSword'),max);
  G.save(); assert.equal(G.load(),true);
  assert.equal(G.durMaxOf('ironSword'),max);
  assert.equal(G.durOf('ironSword'),max);
});
check('流水线降低上限，旧档没有上限字段时仍按原值迁移', () => {
  let s=fresh(); s.capacity=999; s.tree.craft.c_line=1;
  G.craft(RECIPES.find(r=>r.id==='r_axestone'));
  assert.equal(G.durMaxOf('axeStone'),Math.round(DURA.axeStone*0.8));
  G.save(); assert.equal(G.load(),true);
  assert.equal(G.durMaxOf('axeStone'),Math.round(DURA.axeStone*0.8));
  s=fresh(); s.capacity=999; G.addItem('axeStone',1,true);
  delete s.toolMaxDurs;
  G.save(); assert.equal(G.load(),true);
  assert.equal(G.durMaxOf('axeStone'),DURA.axeStone);
});
check('季度委托当季稳定、换季刷新、旧季度不可再交', () => {
  const s=fresh(); s.capacity=999; s.day=1;
  const spring=G.commissions().find(c=>c.seasonal);
  assert.ok(spring && G.commissions().find(c=>c.seasonal).id===spring.id);
  for(const [id,n] of Object.entries(spring.need)) s.inv[id]=n;
  G.completeCommission(spring);
  assert.equal(G.commissionDone(spring),true);
  assert.equal(s.fame,0.5);
  G.completeCommission(spring); assert.equal(s.fame,0.5);
  s.day=16;
  const summer=G.commissions().find(c=>c.seasonal);
  assert.ok(summer && summer.id!==spring.id);
  assert.equal(G.acceptCommission(spring).ok,false);
  s.day=61;
  const nextSpring=G.commissions().find(c=>c.seasonal);
  assert.equal(G.commissionDone(nextSpring),false);
});
check('鱼人价格提升，金锭能出售给盐镇铁匠', () => {
  const deals=G.fishmanDeals();
  assert.deepEqual(deals.map(x=>x.need.goldIngot),[4,5,8,12]);
  assert.ok(TOWN.smith.buy.some(x=>x.id==='goldIngot'));
  assert.ok(TOWN.informant.buy.some(x=>x.id==='sourceOre'));
  assert.ok(TOWN.informant.buy.some(x=>x.id==='sourceBar'));
  assert.ok(TOWN.informant.buy.some(x=>x.id==='tideSteel'));
});
check('铁匠学徒获得额外木材，铁斧说明不再误称翻倍', () => {
  const base=fresh().inv.wood;
  G.newGame('smith','normal');
  assert.equal(G.invCount('wood'),base+4);
  assert.equal(G.invCount('flint'),5);
  assert.ok(!ITEMS.axeIron.desc.includes('翻倍'));
});
check('蜂箱按日储蜜，满包不丢，旧档补默认值', () => {
  G.metaState().identityUnlocks={...(G.metaState().identityUnlocks || {}),beekeeper:1};G.newGame('beekeeper','normal');
  let s=G.S(); s.tut=null; s.furniture.beehive=true;
  s.minute=1439; G.addMin(1);
  assert.equal(s.hiveHoney,1);
  s.inv={ironSword:100}; s.capacity=0;
  assert.equal(G.collectHiveHoney().ok,false);
  assert.equal(s.hiveHoney,1);
  s.inv={}; s.capacity=20;
  assert.equal(G.collectHiveHoney().taken,1);
  assert.equal(s.hiveHoney,0);
  s.hiveHoney=12; s.minute=1439; G.addMin(1);
  assert.equal(s.hiveHoney,12);
  delete s.hiveHoney; G.save(); assert.equal(G.load(),true);
  assert.equal(G.S().hiveHoney,0);
});
check('全彩包图集覆盖全部物品且资源文件齐全', () => {
  const root=path.resolve(__dirname,'../孤屿遗章-游戏 - 发布');
  const ui=fs.readFileSync(path.join(root,'js/ui.js'),'utf8');
  const parse=name=>new Function('return '+ui.match(new RegExp('const '+name+' = ([\\s\\S]*?);'))[1])();
  const sheets=parse('COLOR_INVENTORY_SHEETS');
  assert.ok(fs.existsSync(path.join(root,'assets/img/items/blackGreatSword.png')),'玄铁大剑独立版画素材存在');
  const covered=new Set([...Object.values(sheets).flat(),...parse('EQUIPMENT_ATLAS'),...parse('COLOR_ITEM_ATLAS'),...Object.keys(parse('ALWAYS_COLOR')),'divineArmor','nightmareSoul','nightmareSoul2','nightmareSoul3','reedPack','leatherPack','expeditionPack','blackGreatSword','lantern']); // 三级魂魄共用独立版画素材，名称区分阶数。
  assert.ok(fs.statSync(path.join(root,'assets/img/items/lantern-woodcut.png')).size>1000);
  assert.deepEqual(Object.keys(ITEMS).filter(id=>!covered.has(id)),[]);
  for(const id of ['reedPack','leatherPack','expeditionPack'])assert.ok(fs.statSync(path.join(root,'assets/img/items',id+'.png')).size>100, id+'独立背包图标存在');
  for(const id of ['divinePack','divineSuperPack'])assert.ok(fs.statSync(path.join(root,'assets/img/items-accent',id+'.png')).size>1000,id+'独立彩图存在');
  assert.ok(ui.includes("['nightmareSoul','nightmareSoul2','nightmareSoul3'].includes(id)"));
  assert.ok(fs.statSync(path.join(root,'assets/img/items/nightmareSoul.png')).size>1000);
  assert.ok(fs.statSync(path.join(root,'assets/img/items/divineArmor.png')).size>1000);
  for(const [name,ids] of Object.entries(sheets)) {
    assert.equal(ids.length,16,name);
    assert.ok(fs.statSync(path.join(root,'assets/img/map-pack/items',name+'.webp')).size>1000,name);
  }
});
check('海底交换机每日位置稳定、概率保守并限两百次', () => {
  const s=fresh(); s.scene='atlantis'; s.capacity=999; s.inv.beibi=20000;
  for(let day=1;day<20;day++) { s.day=day; if(G.lotteryState().active) break; }
  const first=G.lotteryState(); assert.equal(first.active,true);
  assert.deepEqual(G.lotteryState(),first);
  assert.equal(G.lotteryChance(0,1),0.10);
  assert.equal(G.lotteryChance(1800,5000),0.10);
  assert.equal(G.lotteryChance(900,100),0.10);
  s.zone=first.zone;
  G.save(); const beforeMachine=memory.guyuyizhang_save;
  for(let i=0;i<4;i++) assert.equal(G.lotteryOffer('beibi',5000,50).ok,true);
  assert.equal(G.lotteryOffer('beibi',1).ok,false);
  assert.equal(G.lotteryState().uses,200);
  assert.equal(G.metaState().lotteryRuns[s._runId].nonce,200);
  memory.guyuyizhang_save_bak=beforeMachine;
  assert.equal(G.restoreLocalSave('bak').ok,true);
  assert.equal(G.lotteryState().uses,200);
  assert.equal(G.lotteryOffer('beibi',1).ok,false);
});
check('交换机校验投入，写盘失败不吞物', () => {
  const s=fresh(); s.scene='atlantis'; s.capacity=999; s.inv.beibi=1000;
  for(let day=1;day<20;day++) { s.day=day; if(G.lotteryState().active) break; }
  s.zone=G.lotteryState().zone;
  assert.equal(G.lotteryOffer('beibi',0).ok,false);
  assert.equal(G.lotteryOffer('beibi',1001).ok,false);
  assert.equal(G.lotteryOffer('beibi',1,51).ok,false);
  assert.equal(G.lotteryOffer('beibi',1000,10).ok,true);
  assert.equal(G.lotteryState().uses,10);
  const original=storage.setItem;
  storage.setItem=(k,v)=>{if(k==='guyuyizhang_write_journal') throw Error('simulated storage failure'); original(k,v);};
  const before=G.invCount('beibi');
  try { assert.equal(G.lotteryOffer('beibi',1).ok,false); }
  finally { storage.setItem=original; }
  assert.equal(G.invCount('beibi'),before);
  assert.equal(G.lotteryState().uses,10);
});
check('旧档无交换机字段时可继续读取', () => {
  const s=fresh(); delete s.lottery;
  G.save(); assert.equal(G.load(),true);
  assert.deepEqual(G.S().lottery,{meter:0,day:0,uses:0});
});
check('第十抽保证出奖，中奖后余额仍保留', () => {
  const s=fresh();s.scene='atlantis';s.capacity=999;s.inv.beibi=5000;
  for(let d=1;d<30;d++){s.day=d;if(G.lotteryState().active)break;}s.zone=G.lotteryState().zone;
  G.metaState().lotteryRuns=G.metaState().lotteryRuns || {};
  G.metaState().lotteryRuns[s._runId]={credit:0,misses:9,nonce:0,lastDay:s.day,uses:0};
  const r=G.lotteryOffer('beibi',5000);
  assert.equal(r.ok,true);assert.ok(r.reward);assert.equal(r.reward.pity,true);
  assert.equal(G.lotteryState().credit,4900);assert.equal(G.lotteryState().misses,0);assert.equal(G.invCount('beibi'),0);
});
check('鱼人昂贵仓库交易只扩容一次并随存档保留', () => {
  const s=fresh(); s.capacity=999;
  const deal=G.fishmanDeals().find(d=>d.id==='storage');
  assert.deepEqual(deal.need,{goldIngot:12,sourceBar:8,tideSteel:6});
  s.scene='atlantis';s.zone='habitat';G.atlantisCamp().furniture.seaStorage1=true;const islandBefore=G.warehouseCapacity('island');
  const before=G.warehouseCapacity();
  for(const [id,n] of Object.entries(deal.need)) s.inv[id]=n;
  assert.equal(G.fishmanBarter('storage').ok,true);
  assert.equal(G.warehouseCapacity(),before+20);assert.equal(G.warehouseCapacity('island'),islandBefore);
  assert.equal(G.fishmanBarter('storage').ok,false);
  assert.equal(G.warehouseCapacity(),before+20);assert.equal(G.warehouseCapacity('island'),islandBefore);
  G.save(); assert.equal(G.load(),true); assert.equal(G.warehouseCapacity(),before+20);assert.equal(G.warehouseCapacity('island'),islandBefore);
});
check('潜水装备逐件修理，高级装备材料更贵，满耐久不扣料', () => {
  const s=fresh(); s.capacity=999; G.atlantisCamp().furniture.repairBench=true;
  G.addItem('diveSuit',2,true); G.addItem('diveSuit2',1,true);
  s.toolDurs.diveSuit=[10,20]; s.toolDurs.diveSuit2=[30];
  assert.deepEqual(G.repairDiveCost('diveSuit2'),{deepCoral:4,sourceBar:1,tideSteel:1});
  assert.equal(G.repairDive('diveSuit2').ok,false);
  for(const [id,n] of Object.entries(G.repairDiveCost('diveSuit2'))) s.inv[id]=n;
  assert.equal(G.repairDive('diveSuit2').ok,true);
  assert.equal(G.durOf('diveSuit2'),G.durMaxOf('diveSuit2'));
  assert.equal(s.inv.deepCoral||0,0);
  assert.equal(G.repairDive('diveSuit2').ok,false);
  for(const [id,n] of Object.entries(G.repairDiveCost('diveSuit'))) s.inv[id]=n;
  assert.equal(G.repairDive('diveSuit').ok,true);
  assert.deepEqual(s.toolDurs.diveSuit,[G.durMaxOf('diveSuit'),20]);
});
check('神弓不可修复，耗尽后仍保留但不能装备', () => {
  const s=fresh(); s.capacity=999; s.furniture.grindstone=true;
  G.addItem('divineBow',1,true); G.addItem('mithrilingot',2,true);
  G.equip('divineBow'); s.toolDurs.divineBow=[1]; s.dur.divineBow=1;
  assert.equal(G.repairMatOf('divineBow'),null);
  assert.equal(G.repairWeapon().ok,false);
  assert.equal(G.durOf('divineBow'),1); assert.equal(G.invCount('mithrilingot'),2);
  G.unequip('divineBow'); s.toolDurs.divineBow=[0]; s.dur.divineBow=0;
  G.equip('divineBow'); assert.equal(s.equipment.weapon,null);
  G.save(); assert.equal(G.load(),true); assert.equal(G.durOf('divineBow'),0);
  assert.equal(G.invCount('divineBow'),1);
  delete G.S().toolDurs.divineBow; G.S().dur.divineBow=0;
  G.save(); assert.equal(G.load(),true); assert.equal(G.durOf('divineBow'),0);
});
check('命名匕首直接损耗保留损坏实例与名字，重载后可选择修复', () => {
  let s=fresh(); s.capacity=999; s.furniture.grindstone=true;
  G.addItem('ironDagger',2,true); G.addItem('ironingot',5,true);
  s.weaponNames={ironDagger:{bonus:1,name:'潮痕'}};
  s.toolDurs.ironDagger=[1,2]; s.dur.ironDagger=1;
  G.drainById('ironDagger');
  assert.equal(G.invCount('ironDagger'),2); assert.deepEqual(s.toolDurs.ironDagger,[0,2]);
  G.drainById('ironDagger'); G.drainById('ironDagger');
  assert.deepEqual(s.toolDurs.ironDagger,[0,0]); assert.equal(G.invCount('ironDagger'),2);
  G.equipTool('ironDagger'); assert.equal(s.toolkit.includes('ironDagger'),false);
  G.save(); assert.equal(G.load(),true); s=G.S();
  assert.equal(s.weaponNames.ironDagger.name,'潮痕'); assert.deepEqual(s.toolDurs.ironDagger,[0,0]);
  delete s.toolDurs.ironDagger; s.inv.ironDagger=1; s.dur.ironDagger=0;
  G.save(); assert.equal(G.load(),true); assert.equal(G.durOf('ironDagger'),0);
  assert.equal(G.repairWeapon('ironDagger').ok,true);
  assert.equal(G.durOf('ironDagger'),G.durMaxOf('ironDagger'));
});
check('旧家具 false 残留、羊圈与鸡舍不占室内位', () => {
  const s=fresh(); s.furniture={wb1:true,coop:true,pen:true,smoker:false,stove:false};
  assert.equal(G.furnitureUsed(),1);
  G.save(); assert.equal(G.load(),true); assert.equal(G.furnitureUsed(),1);
});
check('蜂蜜售价小幅下调且仍高于回购价', () => {
  const e=TOWN.gourmet.sell.find(e=>e.id==='honey');assert.equal(e.base,120);
  const b=TOWN.gourmet.buy.find(e=>e.id==='honey'); if(b) assert.ok(b.base<e.base);
});
check('盐与海盐合并：当前档、待收、回溯点和发现记录无损且幂等', () => {
  const s=fresh(); s.inv={salt:19,seasalt:20}; s.capacity=1;
  s.furnPending={salt:3,seasalt:4}; s.sold={salt:2,seasalt:5}; s.seen={seasalt:1};
  s.dawnCheckpoint={version:1,state:{inv:{salt:1,seasalt:2},seen:{seasalt:1}}};
  s._snap={day:{inv:{seasalt:6}}};
  G.save();
  // 当前 save 会裁掉临时 _snap；注入旧版保留的字段以验证旧快照兼容。
  const legacy=JSON.parse(memory.guyuyizhang_save); legacy._snap=s._snap;
  memory.guyuyizhang_save=JSON.stringify(legacy);
  assert.equal(G.load(),true);
  const migrated=G.S();
  assert.deepEqual(migrated.inv,{salt:46});
  assert.deepEqual(migrated.furnPending,{});
  assert.deepEqual(migrated.sold,{salt:7});
  assert.deepEqual(migrated.seen,{salt:1});
  assert.equal(migrated.dawnCheckpoint.state.inv.salt,3);
  assert.equal(migrated._snap.day.inv.salt,6);
  G.save(); assert.equal(G.load(),true); assert.equal(G.S().inv.salt,46);
});
check('旧账号海盐图鉴、邮箱及备份槽迁移后可正常领取和读取', () => {
  const s=fresh(), slot=JSON.parse(JSON.stringify(s)); slot.inv={salt:2,seasalt:8};
  const meta=JSON.parse(JSON.stringify(G.metaState()));
  meta.seenItems={seasalt:1}; meta.mailbox=[{item:'seasalt',qty:4}];
  meta.slots=[{data:slot,day:slot.day},null,null];
  memory.guyuyizhang_meta=JSON.stringify(meta); G.metaReload();
  assert.deepEqual(G.metaState().seenItems,{salt:1});
  assert.equal(G.metaState().mailbox[0].item,'salt');
  assert.deepEqual(G.metaState().slots[0].data.inv,{salt:10});
  assert.equal(G.loadSlot(0).ok,true); assert.equal(G.S().inv.salt,10);
  assert.equal(G.claimMailbox(0).ok,true); assert.equal(G.S().inv.salt,14);
  G.metaReload(); assert.equal(G.metaState().mailbox.length,0);
  assert.equal(G.resIds().includes('seasalt'),false);
});
check('旧存档码导入同样合并盐，统一晒盐、委托、交易和烹饪用途', () => {
  const s=fresh(); s.inv={seasalt:10,meat:5};
  const meta=JSON.parse(JSON.stringify(G.metaState())); meta.mailbox=[{item:'seasalt',qty:3}];
  const code=Buffer.from(JSON.stringify({v:1,save:s,meta}),'utf8').toString('base64');
  assert.equal(G.importCode(code).ok,true); assert.equal(G.S().inv.salt,10);
  assert.equal(G.metaState().mailbox[0].item,'salt'); assert.equal(ITEMS.seasalt,undefined);
  const point=SCENES.find(s=>s.id==='sea').zones.sea.points.find(p=>p.id==='sea_salt');
  assert.ok(point.yields.every(y=>y.id==='salt')); assert.equal(point.yields[1].chance,0.35);
  assert.equal(SEASONAL_COMMISSIONS['夏'].find(c=>c.id==='s_summer_fish').need.salt,4);
  assert.ok(Object.values(TOWN).some(sh=>sh.buy.some(e=>e.id==='salt'&&e.base===15)));
  const recipe=RECIPES.find(r=>r.id==='r_saltedmeat');
  G.craft(recipe); assert.equal(G.invCount('saltedMeat'),1);
});
console.log(`通过 ${passed} 项，失败 0 项`);
console.log('RESULT:PASS');
