/* 发布安全：故障注入均在内存存储；覆盖真实调用链，不修改玩家数据。 */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../孤屿遗章-游戏 - 发布/js');
const source=['data.js','game.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const clone=x=>JSON.parse(JSON.stringify(x));
const keys=['guyuyizhang_save','guyuyizhang_save_bak','guyuyizhang_savedAt','guyuyizhang_rev','guyuyizhang_meta','guyuyizhang_meta_bak'];
function engine(store={},window={}) {
  const control={fail:null,alerts:0};
  const ls={getItem:k=>store[k]??null,setItem(k,v){if(control.fail && control.fail(k)){const e=Error('injected quota');e.name='QuotaExceededError';throw e;}store[k]=String(v);},removeItem:k=>delete store[k]};
  const box=new Function('localStorage','window','document','console','setTimeout','clearTimeout',source+'\nreturn {G:Game,RECIPES,ITEMS};')(ls,window,{cookie:''},{log(){},warn(){}},()=>1,()=>{});
  box.G.bind({onLog(){},onChange(){},onFight(){},onEnding(){},onOverlay(){},onSaveFail(){control.alerts++;}});
  return {...box,store,control};
}
function fresh(){const e=engine();e.G.newGame('fisher','normal');e.G.S().capacity=999;e.G.S().tut=null;e.G.metaState().soul=500;e.G.save();return e;}
function seedHistoricalNationalMail(g){const m=g.metaState();m.redeemed.GUOQING2026=1;m.mailbox.push({code:'GUOQING2026',soul:200,qty:1},{code:'GUOQING2026',item:'namecard',qty:1});g.save();}
function failOnce(e,key){let left=1;e.control.fail=k=>k===key && left-->0;}
let pass=0,fail=0;
async function check(name,fn){try{await fn();pass++;console.log('OK '+name);}catch(e){fail++;console.error('FAIL '+name+'\n'+e.stack);}}
async function main(){
await check('职业各100魂点解锁，重复点击不扣款，旧码不退解锁和购买款',()=>{
  const e=fresh(),g=e.G,old=g.exportCode();g.metaState().soul=99;
  assert.equal(g.newGame('trainer','normal').ok,false);assert.equal(g.unlockIdentity('trainer').ok,false);
  g.metaState().soul=200;
  assert.equal(g.unlockIdentity('trainer').ok,true);assert.equal(g.metaState().soul,100);
  assert.equal(g.unlockIdentity('trainer').already,true);assert.equal(g.metaState().soul,100);
  assert.equal(g.unlockIdentity('beekeeper').ok,true);assert.equal(g.metaState().soul,0);
  assert.equal(g.importCode(old).ok,true);assert.equal(g.identityUnlocked('trainer'),true);assert.equal(g.identityUnlocked('beekeeper'),true);assert.equal(g.metaState().soul,0);
});
await check('职业解锁写盘失败原子回滚，未解锁旧角色存档仍可继续',()=>{
  const e=fresh(),g=e.G;failOnce(e,'guyuyizhang_meta');assert.equal(g.unlockIdentity('trainer').ok,false);
  assert.equal(g.identityUnlocked('trainer'),false);assert.equal(g.metaState().soul,500);
  g.S().identity='trainer';g.S().day=18;g.save();assert.equal(g.backupSlot(0,true).ok,true);
  assert.equal(g.load(),true);assert.equal(g.S().identity,'trainer');assert.equal(g.loadSlot(0).ok,true);
  assert.equal(g.S().day,18);assert.equal(g.identityUnlocked('trainer'),false);
});
await check('传奇全职业新局仅职业物品，其他难度补给及旧传奇档保留',()=>{
  const e=fresh(),g=e.G;
  const identities=new Function(source+'\nreturn IDENTITIES;')();
  for(const id of Object.keys(identities)){
    g.metaState().identityUnlocks={trainer:1,beekeeper:1};g.metaState().challengeUnlocked=true;g.newGame(id,'legend');assert.deepEqual(g.S().inv,identities[id].items);
    assert.equal(g.capacity(),15);assert.equal(g.S().buildings.house,-1);
  }
  g.addItem('wood',9,true);assert.equal(g.save().ok,true);assert.equal(g.load(),true);assert.equal(g.invCount('wood'),9);
  for(const diff of ['easy','normal','hard']){
    g.newGame('fisher',diff);assert.equal(g.invCount('wood'),6);assert.equal(g.invCount('water'),4);
    assert.ok(Object.keys(g.S().inv).length>0);
  }
});
await check('旧码保留满级遗章和六世记录，且不退回升级前魂点',()=>{
  const e=fresh(),g=e.G,old=g.exportCode();
  g.metaState().nodes={startG:3,startC:3};g.metaState().runs=6;g.metaState().totalSoul=900;g.metaState().soul=20;
  assert.equal(g.importCode(old).ok,true);
  assert.equal(g.metaNum('startG'),3);assert.equal(g.metaNum('startC'),3);
  assert.equal(g.metaState().runs,6);assert.equal(g.metaState().totalSoul,900);assert.equal(g.metaState().soul,20);
});
await check('第三槽续档后保存和重启不改变第一、第二槽和永久成长',()=>{
  const e=fresh(),g=e.G;
  for(let i=0;i<3;i++){g.newGame('fisher','normal');g.S().day=10+i;assert.equal(g.backupSlot(i,true).ok,true);}
  g.metaState().nodes={startG:3};g.metaState().runs=6;
  assert.equal(g.loadSlot(2).ok,true);const slots=JSON.stringify(g.metaState().slots);
  g.S().day=30;assert.equal(g.save().ok,true);
  const reload=engine(e.store).G;assert.equal(reload.load(),true);
  assert.equal(reload.S().day,30);assert.equal(reload.S()._fromBackupSlot,2);
  assert.equal(JSON.stringify(reload.metaState().slots),slots);assert.equal(reload.metaNum('startG'),3);assert.equal(reload.metaState().runs,6);
});
await check('标题页不因较新云时间戳替换本机当前局、三槽和遗章',async()=>{
  const b=fresh(),g=b.G;g.metaState().nodes={startG:3};g.metaState().runs=6;g.S().day=30;
  assert.equal(g.backupSlot(0,true).ok,true);
  const store=clone(b.store),save=store.guyuyizhang_save,meta=store.guyuyizhang_meta;let reply;
  const payload={savedAt:Date.now()+100000,save:save,meta:JSON.stringify({nodes:{startG:1},runs:2,slots:[null,null,null]})};
  const mgr={getArchiveList({success}){success({saves:[{name:'guyuyizhang_save',uuid:'x',fileId:'f'}]});},getArchiveData(a){reply=a.success;}};
  engine(store,{tap:{getCloudSaveManager:()=>mgr,getFileSystemManager:()=>({readFileSync:()=>JSON.stringify(payload)})}});
  assert.equal(reply,undefined);await new Promise(r=>setImmediate(r));
  assert.equal(store.guyuyizhang_save,save);assert.equal(store.guyuyizhang_meta,meta);
});
await check('主档缺失不接入旧平台云端，本机备份槽和传承保留',async()=>{
  const b=fresh(),g=b.G;g.metaState().nodes={startG:3};g.metaState().runs=6;g.metaState().soul=20;g.S().day=30;
  assert.equal(g.backupSlot(2,true).ok,true);
  const store=clone(b.store),slot=JSON.stringify(g.metaState().slots[2]);delete store.guyuyizhang_save;delete store.guyuyizhang_savedAt;
  let reply;const payload={savedAt:Date.now()+100000,save:JSON.stringify(g.S()),meta:JSON.stringify({nodes:{startG:1},runs:2,soul:500,slots:[null,null,null]})};
  const mgr={getArchiveList({success}){success({saves:[{name:'guyuyizhang_save',uuid:'x',fileId:'f'}]});},getArchiveData(a){reply=a.success;}};
  const e=engine(store,{tap:{getCloudSaveManager:()=>mgr,getFileSystemManager:()=>({readFileSync:()=>JSON.stringify(payload)})}});
  assert.equal(reply,undefined);await new Promise(r=>setImmediate(r));
  assert.equal(e.G.cloudPush(true),false);
  assert.equal(e.G.metaNum('startG'),3);assert.equal(e.G.metaState().runs,6);assert.equal(e.G.metaState().soul,20);
  assert.equal(JSON.stringify(e.G.metaState().slots[2]),slot);
});
await check('读兑换前旧码保留国庆两封待领邮件，领取后不从旧码复活',()=>{
  const e=fresh(),g=e.G,before=g.exportCode();
  seedHistoricalNationalMail(g);
  const pending=g.exportCode();
  assert.equal(g.importCode(before).ok,true);
  assert.equal(g.mailboxList().filter(x=>x.item==='namecard'||x.soul===200).length,2);
  assert.equal(g.redeemCode('GUOQING2026').ok,false);
  assert.equal(g.claimMailbox(g.mailboxList().find(x=>x.soul===200).i).ok,true);
  assert.equal(g.importCode(pending).ok,true);
  assert.equal(g.mailboxList().filter(x=>x.soul===200).length,0);
  assert.equal(g.mailboxList().filter(x=>x.item==='namecard').length,1);
  assert.equal(g.claimMailbox(g.mailboxList().find(x=>x.item==='namecard').i).ok,true);
  for(let i=0;i<2;i++){
    assert.equal(g.importCode(pending).ok,true);
    assert.equal(g.mailboxList().filter(x=>x.item==='namecard'||x.soul===200).length,0);
  }
});
await check('旧版无收据国庆待领邮件安全迁移，已领分项不会重复',()=>{
  const e=fresh(),g=e.G;
  seedHistoricalNationalMail(g);
  for(const mail of g.metaState().mailbox)delete mail.shopReceipt;
  g.metaState().adDelivered={};e.store.guyuyizhang_meta=JSON.stringify(g.metaState());g.metaReload();
  const pending=g.exportCode();
  assert.ok(g.metaState().mailbox.filter(x=>x.code==='GUOQING2026').every(x=>x.shopReceipt));
  assert.equal(g.claimMailbox(g.mailboxList().find(x=>x.item==='namecard').i).ok,true);
  assert.equal(g.importCode(pending).ok,true);
  assert.equal(g.mailboxList().filter(x=>x.item==='namecard').length,0);
  assert.equal(g.mailboxList().filter(x=>x.soul===200).length,1);
});
await check('兑换码账号写入失败不消耗兑换资格、不出现幽灵邮件',()=>{
  const e=fresh(),g=e.G,before=g.mailboxCount();failOnce(e,'guyuyizhang_meta');
  assert.equal(g.redeemCode('HAPPY2').ok,false);
  assert.equal(g.metaState().redeemed.HAPPY2,undefined);
  assert.equal(g.mailboxCount(),before);
  assert.equal(g.redeemCode('HAPPY2').ok,true);
});
await check('旧主档、备份槽、救援档补齐同一套字段',()=>{
  const e=fresh(),g=e.G;
  const old={v:1,identity:'fisher',difficulty:'normal',day:3,minute:480,stats:{hp:100}};
  for(const route of ['main','slot','rescue']){
    if(route==='main'){e.store.guyuyizhang_save=JSON.stringify(old);assert.equal(g.load(),true);}
    if(route==='slot'){g.metaState().slots[0]={day:3,data:clone(old)};assert.equal(g.loadSlot(0).ok,true);}
    if(route==='rescue'){e.store.guyuyizhang_rescue=JSON.stringify({day:3,save:JSON.stringify(old)});assert.equal(g.restoreLocalSave('rescue').ok,true);}
    for(const k of ['settings','livestock','traps','pointUses','laochao','foodExp','seen','killCount'])assert.ok(g.S()[k],route+' '+k);
    assert.equal(g.S().day,3);assert.equal(g.save().ok,true);
  }
});
await check('反复损坏主档仍可从滚动备份恢复，修订号对齐',()=>{
  const e=fresh(),g=e.G,raw=e.store.guyuyizhang_save;
  for(let i=0;i<2;i++){e.store.guyuyizhang_save='{broken';e.store.guyuyizhang_save_bak=raw;assert.equal(g.load(),true);assert.equal(g.save().ok,true);}
});
await check('连续两次日出回溯恢复相同状态且每次仅扣50魂',()=>{
  const {G:g}=fresh();const initial=clone(g.S().dawnCheckpoint.state.inv);
  for(let i=1;i<=2;i++){g.S().stats.hp=0;g.S().death='test';g.S().inv.blackSword=9;assert.equal(g.reviveToday().ok,true);assert.deepEqual(g.S().inv,initial);assert.equal(g.metaState().soul,500-i*50);}
});
for(const key of ['guyuyizhang_write_journal','guyuyizhang_save','guyuyizhang_meta']) await check('回溯写入失败不收费不丢原档：'+key,()=>{
  const e=fresh(),g=e.G;g.S().stats.hp=0;g.S().death='test';g.save();const raw=e.store.guyuyizhang_save;
  failOnce(e,key);assert.equal(g.reviveToday().ok,false);assert.equal(g.metaState().soul,500);assert.equal(g.S().stats.hp,0);assert.equal(e.store.guyuyizhang_save,raw);assert.ok(e.control.alerts>0);
});
await check('备份失败不扣备份点、不替换原槽',()=>{
  const e=fresh(),g=e.G,points=g.backupPoints();failOnce(e,'guyuyizhang_meta');assert.equal(g.backupSlot(0).ok,false);assert.equal(g.backupPoints(),points);assert.equal(g.slotList()[0],null);
});
await check('槽位读档写入失败保留当前局',()=>{
  const e=fresh(),g=e.G;g.S().day=30;assert.equal(g.backupSlot(0).ok,true);g.S().day=40;g.save();failOnce(e,'guyuyizhang_save');assert.equal(g.loadSlot(0).ok,false);assert.equal(g.S().day,40);
});
await check('同一局从多个备份槽、覆盖槽与旧导出码反复读档都只结算一次',()=>{
  const e=fresh(),g=e.G,initial=g.metaState().soul;
  const code=g.exportCode();
  assert.equal(g.backupSlot(0).ok,true);
  assert.equal(g.backupSlot(1).ok,true);
  g.metaState().backupPoints=10;
  const awarded=g.metaSettle();assert.ok(awarded && awarded.gain>0);
  for(const slot of [0,1,0]){
    assert.equal(g.loadSlot(slot).ok,true);
    assert.equal(g.metaSettle(),null);
    assert.equal(g.metaState().soul,initial+awarded.gain);
    assert.equal(g.backupSlot(slot).ok,true);
  }
  assert.equal(g.importCode(code).ok,true);
  assert.equal(g.metaSettle(),null);
  assert.equal(g.metaState().runs,1); // 旧码不回退已传世次数，且结算流水仍保留。
  g.newGame('fisher','normal');
  assert.ok(g.metaSettle());
});
await check('旧版无局 ID 的多个备份不能重复结算',()=>{
  const {G:g}=fresh();delete g.S()._runId;
  assert.equal(g.backupSlot(0).ok,true);
  const first=g.metaSettle();assert.ok(first);
  assert.equal(g.loadSlot(0).ok,true);
  assert.equal(g.metaSettle(),null);
});
await check('旧版主档已结算、旧备份未标记时也不能再领',()=>{
  const {G:g}=fresh();delete g.S()._runId;
  const old=clone(g.S());old.flags.metaSettled=0;
  g.metaState().slots[0]={day:old.day,settled:false,data:old};
  g.S().flags.metaSettled=1;
  assert.equal(g.loadSlot(0).ok,true);
  assert.equal(g.metaSettle(),null);
});
await check('结算写入中断时魂点、次数与局内标记一起回滚',()=>{
  for(const key of ['guyuyizhang_write_journal','guyuyizhang_save','guyuyizhang_meta']){
    const e=fresh(),g=e.G;failOnce(e,key);
    assert.equal(g.metaSettle(),null,key);
    assert.equal(g.metaState().soul,500,key);
    assert.equal(g.metaState().runs,0,key);
    assert.equal(!!g.S().flags.metaSettled,false,key);
    e.control.fail=null;
    assert.ok(g.metaSettle(),key);
  }
});
await check('中断的成对写入在重启时恢复两个原档',()=>{
  const e=fresh(),before=Object.fromEntries(keys.map(k=>[k,e.store[k]??null]));
  e.store.guyuyizhang_write_journal=JSON.stringify({version:1,before});e.store.guyuyizhang_save='partial';e.store.guyuyizhang_meta='partial';
  const restored=engine(e.store);assert.equal(restored.G.load(),true);
  for(const k of keys)assert.equal(e.store[k]??null,before[k]);assert.equal(e.store.guyuyizhang_write_journal,undefined);
});
await check('新版导出包含未自动保存的当前进度',()=>{
  const e=fresh();e.G.S().day=23;e.G.S().inv.blackDagger=2;
  const code=e.G.exportCode(),other=engine();assert.equal(other.G.importCode(code).ok,true);assert.equal(other.G.S().day,23);assert.equal(other.G.invCount('blackDagger'),2);assert.equal(other.G.metaState().soul,500);
});
await check('旧版仅meta存档码仍可导入，不改当前天数',()=>{
  const e=fresh();e.G.S().day=7;
  const code=Buffer.from(JSON.stringify({v:1,meta:{soul:321,slots:[null,null,null]}})).toString('base64');
  assert.equal(e.G.importCode(code).ok,true);assert.equal(e.G.metaState().soul,321);assert.equal(e.G.S().day,7);
});
await check('导入配额失败明确报错且原账号与当前局不变',()=>{
  const e=fresh(),other=fresh();other.G.S().day=99;other.G.metaState().soul=999;
  failOnce(e,'guyuyizhang_meta');assert.equal(e.G.importCode(other.G.exportCode()).ok,false);assert.equal(e.G.S().day,1);assert.equal(e.G.metaState().soul,500);
});
await check('死亡备份不会通过读档恢复为存活状态',()=>{
  const e=fresh(),g=e.G;g.S().stats.hp=0;g.S().death='test';g.S().ending='D';assert.equal(g.backupSlot(0).ok,true);
  g.newGame('fisher','normal');assert.equal(g.loadSlot(0).ok,true);assert.equal(g.S().ending,'D');assert.equal(g.S().stats.hp,0);
});
await check('背包满时晾晒成品留在架上',()=>{
  const {G:g}=fresh();g.S().capacity=20;g.S().inv={axeStone:20};g.S().drying={rack:{readyAt:0,out:{jerky:4}}};
  assert.equal(g.dryCollect('rack').ok,false);assert.equal(g.S().drying.rack.out.jerky,4);
  g.S().inv={};assert.equal(g.dryCollect('rack').ok,true);assert.equal(g.invCount('jerky'),4);assert.equal(g.S().drying.rack,undefined);
});
await check('背包满或未开局领取邮件不会消耗邮件',()=>{
  const e=fresh(),g=e.G;g.S().capacity=20;g.S().inv={axeStone:20};g.metaState().mailbox=[{item:'wood',qty:2}];
  assert.equal(g.claimMailbox(0).ok,false);assert.equal(g.metaState().mailbox.length,1);
  g.setS(null);assert.equal(g.claimMailbox(0).ok,false);assert.equal(g.metaState().mailbox.length,1);
});
await check('邮箱写入失败：邮件和物品都不改变',()=>{
  const e=fresh(),g=e.G;g.metaState().mailbox=[{item:'blackDagger',qty:1}];failOnce(e,'guyuyizhang_meta');
  assert.equal(g.claimMailbox(0).ok,false);assert.equal(g.invCount('blackDagger'),0);assert.equal(g.metaState().mailbox.length,1);
});
await check('神弓存邮箱后回溯不复制；领取后回溯不吞弓且耐久保留',()=>{
  const e=fresh(),g=e.G;g.addItem('divineBow',1,true);g.S().toolDurs.divineBow=[27];g.S().dur.divineBow=27;g.S().minute=1439;g.timePass(1);
  assert.equal(g.storeDivineBow().ok,true);g.S().stats.hp=0;g.S().death='test';assert.equal(g.reviveToday().ok,true);assert.equal(g.invCount('divineBow'),0);
  const i=g.metaState().mailbox.findIndex(x=>x.item==='divineBow');assert.equal(g.metaState().mailbox[i].dur,27);assert.equal(g.claimMailbox(i).ok,true);
  g.S().stats.hp=0;g.S().death='test';assert.equal(g.reviveToday().ok,true);assert.equal(g.invCount('divineBow'),1);assert.equal(g.S().toolDurs.divineBow[0],27);
});
await check('祭坛奖励与完成标记原子保存，写入失败不发魂也不解锁',()=>{
  for(const key of ['guyuyizhang_write_journal','guyuyizhang_save','guyuyizhang_meta']){
    const e=fresh(),g=e.G;g.S().scene='peak';g.addItem('relic',1,true);g.addItem('slate',3,true);g.addItem('dragonbone',1,true);
    const soul=g.metaState().soul;failOnce(e,key);const r=g.doPeakRitual();
    assert.equal(r.ok,false,key);assert.equal(g.metaState().soul,soul,key);assert.equal(!!g.S().flags.ended_C,false,key);
  }
});
await check('祭坛奖励不能靠日出回溯重复领取',()=>{
  const {G:g}=fresh();g.S().scene='peak';g.addItem('relic',1,true);g.addItem('slate',3,true);g.addItem('dragonbone',1,true);
  assert.equal(g.doPeakRitual().ok,true);assert.equal(g.metaState().soul,550);assert.equal(g.S().dawnCheckpoint.state.flags.ended_C,1);
  g.S().stats.hp=0;g.S().death='test';assert.equal(g.reviveToday().ok,true);assert.equal(g.S().flags.ended_C,1);
  assert.equal(g.doPeakRitual().ok,false);assert.equal(g.metaState().soul,500);
});
await check('旧档的 C 结局历史标记保留，但不再锁住真正结局',()=>{
  const {G:g}=fresh();g.S().flags.settled_C=1;g.S().flags.settledEnding='C';assert.equal(g.save().ok,true);assert.equal(g.load(),true);
  assert.equal(g.S().flags.settled_C,1);assert.equal(g.S().flags.settledEnding,undefined);
});
await check('账号写入失败会发出可见失败通知',()=>{
  const e=fresh();failOnce(e,'guyuyizhang_meta');e.G.dailySign();assert.ok(e.control.alerts>0);
});
await check('制造巧手在容量不足时不会把整批基础产物丢掉',()=>{
  const e=fresh(),g=e.G;g.S().capacity=12;g.S().inv={wood:4,flint:4,axeIron:10};g.nodeLv('craft','c_hand');
  g.S().skill.craft=1;g.S().skillPicks.craft=['extra'];
  const r=e.RECIPES.find(x=>x.id==='r_axestone');const keep=Math.random;Math.random=()=>0;
  try{assert.equal(g.craftBatch(r,2).ok,true);assert.equal(g.invCount('axeStone'),2);assert.ok(g.capUsed()<=g.capacity());}finally{Math.random=keep;}
});
await check('云端坏档不覆盖本地；异步返回不覆盖已开始的游戏',async()=>{
  for(const active of [false,true]){
    const baseline=fresh(),store=clone(baseline.store);let pending;
    const payload={v:1,savedAt:Date.now()+100000,save:JSON.stringify(active?baseline.G.S():{day:90}),meta:JSON.stringify(baseline.G.metaState())};
    const mgr={getArchiveList({success}){success({saves:[{name:'guyuyizhang_save',uuid:'x',fileId:'f'}]});},getArchiveData(args){pending=args.success;}};
    const e=engine(store,{tap:{getCloudSaveManager:()=>mgr,getFileSystemManager:()=>({readFileSync:()=>JSON.stringify(payload)})}});
    if(active){e.G.newGame('fisher','normal');e.G.S().day=22;}
    const raw=store.guyuyizhang_save;assert.equal(pending,undefined);assert.equal(e.G.cloudStatus().supported,false);await new Promise(r=>setImmediate(r));
    assert.equal(store.guyuyizhang_save,raw);if(active)assert.equal(e.G.S().day,22);
  }
});
await check('游戏代码不出现原生 confirm/alert/prompt（iPhone WKWebView 会卡死不返回）',()=>{
  const dir=path.resolve(__dirname,'../孤屿遗章-游戏 - 发布');
  const bad=[];
  for(const f of ['js/ui.js','js/game.js','js/data.js','js/audio.js','index.html']){
    let s=fs.readFileSync(path.join(dir,f),'utf8');
    s=s.replace(/\/\*[\s\S]*?\*\//g,'')            // 去块注释
       .replace(/^[ \t]*\/\/[^\n]*$/gm,'')         // 去整行注释
       .replace(/(^|[^:])\/\/[^\n]*/gm,'$1');      // 去行尾注释（保留 http://）
    const hit=s.match(/\b(confirm|alert|prompt)\s*\(/g);
    if(hit) bad.push(f+' → '+[...new Set(hit.map(x=>x.trim()))].join(', '));
  }
  assert.equal(bad.length,0,'发现原生弹窗调用：'+bad.join(' ｜ '));
});
console.log(`通过 ${pass} 项，失败 ${fail} 项\nRESULT:${fail?'FAIL':'PASS'}`);process.exitCode=fail?1:0;
}
main().catch(e=>{console.error(e);console.log('RESULT:CRASH');process.exitCode=1;});
