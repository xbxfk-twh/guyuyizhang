const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../孤屿遗章-游戏 - 发布');
const Session=new Function(fs.readFileSync(path.join(root,'js/core/session.js'),'utf8')+';return GameSession;')();
const Migrations=new Function(fs.readFileSync(path.join(root,'js/storage/migrations.js'),'utf8')+';return StateMigrations;')();
let passed=0;const check=(name,fn)=>{fn();passed++;console.log('OK '+name);};
check('面板与宿主暂停互不覆盖，重复开关幂等，不进玩家存档',()=>{
 const session=Session.create();assert.ok(session.canAdvance());session.setPaused('panel',true);session.setPaused('host',true);session.setPaused('host',true);session.setPaused('panel',false);assert.equal(session.canAdvance(),false);assert.deepEqual(session.snapshot(),{panel:false,host:true});session.setPaused('host',false);assert.ok(session.canAdvance());assert.throws(()=>session.setPaused('other',true));const copy=session.snapshot();assert.ok(Object.isFrozen(copy));
});
function fresh(){
 let state={day:2,difficulty:'normal',stats:{hp:100},tree:{gather:{},craft:{},combat:{}},skillPicks:{gather:[],craft:[],combat:[]},balanceMigrationVersion:1,blueprintKnowledgeVersion:1,storageChainVersion:2};
 const calls=[],items={wood:{cat:'mat'},salt:{cat:'mat'},oldTool:{cat:'tool'}};
 const migrations=Migrations.create({getState:()=>state,ITEMS:items,DIFFICULTIES:{normal:{}},WEATHER:{sun:{}},DURA:{oldTool:10},LOG_KEEP:2,SKILL_TRUNK_COST:[10],costMul:()=>1,log:message=>calls.push(message),combatLv:()=>0,nodeLv:()=>0,trainingCount:()=>0,durList:id=>calls.push('durability:'+id),autoToolkit:()=>calls.push('toolkit'),reconcileLotteryInputs:()=>calls.push('lottery'),reconcileNightmareSouls:()=>calls.push('nightmare'),settleStoredFood:()=>calls.push('expiry'),supplyRecordsAll:()=>[],addItem:(id,n)=>state.inv[id]=(state.inv[id]||0)+n,migrateFoodChoices:()=>calls.push('satchel')});
 return {get state(){return state;},set state(value){state=value;},calls,migrations};
}
check('归一化步骤有稳定顺序，旧迁移在耐久/工具/收据/腐坏之前',()=>{
 const f=fresh();assert.deepEqual(f.migrations.steps,['defaults','legacy','session','durability','toolkit','lottery-ledger','nightmare-ledger','pending-loot','food-expiry','balance']);f.migrations.normalize();assert.deepEqual(f.calls,['satchel','durability:oldTool','toolkit','lottery','nightmare','expiry']);assert.equal(f.state.inventoryBaseSlots,15);assert.equal(f.state.stats.health,100);assert.equal(f.state.weather,'sun');
});
check('所有迁移读取当前局，替换状态后不会继续修改上一局',()=>{const f=fresh(),first=f.state;f.migrations.normalize();f.state={day:8,difficulty:'normal',stats:{hp:0},inv:{wood:9}};f.migrations.normalize();assert.equal(first.day,2);assert.equal(first.death,undefined);assert.equal(f.state.day,8);assert.equal(f.state.ending,'D');assert.equal(f.state.stats.hp,0);});
check('海盐迁移覆盖账号/槽位/检查点/旧快照和邮件，重复执行不增殖',()=>{
 const f=fresh(),checkpoint={inv:{seasalt:2,salt:1}},slot={inv:{seasalt:3,salt:4},seen:{seasalt:1},dawnCheckpoint:{state:checkpoint},_snap:{day:{inv:{seasalt:5}}}};const meta={seenItems:{seasalt:1},slots:[{data:slot}],mailbox:[{item:'seasalt',qty:6}]};f.migrations.migrateMeta(meta);const before=JSON.stringify(meta);f.migrations.migrateMeta(meta);assert.equal(JSON.stringify(meta),before);assert.equal(slot.inv.salt,7);assert.equal(checkpoint.inv.salt,3);assert.equal(slot._snap.day.inv.salt,5);assert.equal(meta.mailbox[0].item,'salt');assert.equal(meta.seenItems.salt,1);assert.equal(slot.inv.seasalt,undefined);
});
check('旧待收合并取最大数，归一化重跑不重复发物资',()=>{const f=fresh();f.state.inv={wood:2};f.state.furnPending={wood:3};f.state.pendingLootBatches=[{id:'wood',qty:5}];f.migrations.normalize();assert.equal(f.state.inv.wood,7);f.migrations.normalize();assert.equal(f.state.inv.wood,7);assert.deepEqual(f.state.furnPending,{});assert.deepEqual(f.state.pendingLootBatches,[]);});
check('格式校验拒绝非法主档，死亡状态不因迁移复活',()=>{const f=fresh();for(const state of [null,[],{day:0,stats:{hp:3},difficulty:'normal'},{day:1,stats:{hp:Infinity},difficulty:'normal'},{day:1,stats:{hp:3},inv:[],difficulty:'normal'},{day:1,stats:{hp:3},difficulty:'unknown'}])assert.equal(f.migrations.validSave(state),false);assert.ok(f.migrations.validSave({day:1,stats:{hp:0},difficulty:'normal'}));f.state.death='旧死亡';f.migrations.normalize();assert.equal(f.state.death,'旧死亡');assert.equal(f.state.ending,'D');assert.equal(f.state.stats.hp,0);});
console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
