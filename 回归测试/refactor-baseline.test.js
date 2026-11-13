/* 结构重构前记录的行为摘要；--record 仅人工建立基线，不由统一测试/CI调用。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{createEngine}=require('./helpers/engine');
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const digest=x=>createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');
const actual=[],details=[];
for(const seed of [17,982451653]){
 const e=createEngine({seed}),g=e.G;
 const record=(name,result)=>{const payload={run:g.S(),meta:g.metaState(),storage:Object.fromEntries(e.data),cookies:Object.fromEntries(e.jar),events:e.events,result:result??null,randomCalls:e.calls()};actual.push({seed,name,hash:digest(payload),randomCalls:e.calls()});details.push({seed,name,...JSON.parse(JSON.stringify(payload))});};
 g.newGame('fisher','normal');g.S().tut=null;g.S().capacity=999;record('新开局');
 g.S().scene='farm';g.S().zone=null;const point=g.pointsOf().find(p=>p.id==='farm_veg');assert.ok(point);const veg=g.invCount('wildveg');g.doPoint(point);assert.ok(g.invCount('wildveg')>veg);record('采集与耗时');
 g.S().scene='camp';g.addItem('wood',20,true);const branch=g.invCount('branch');g.craft(e.RECIPES.find(r=>r.id==='r_split'));assert.equal(g.invCount('branch'),branch+4);record('手工配方');
 const mats=e.BUILDING_CHAINS.storage[0].mats;for(const [id,n] of Object.entries(mats))g.addItem(id,n,true);g.S().buildings.storage=-1;g.buildChain('storage');assert.equal(g.S().buildings.storage,0);record('建造储物');
 g.addItem('beibi',1000,true);const list=[{id:'wood',base:3}];g.buyFromMerchant('wood',2,list,false);g.sellToMerchant('wood',1,list,false);record('交易买卖');
 g.startFight({id:'baseline',name:'试炼',hp:500,atk:1,def:0,spd:1,traits:[],drops:[{id:'wood',qty:2,ch:1}]},true);g.fightAction('defend');g.endFight(true);record('战斗与战利品');
 g.S().scene='atlantis';while(!g.lotteryState().active)g.S().day++;g.S().zone=g.lotteryState().zone;assert.ok(g.lotteryDeposit('beibi',500).ok);record('抽奖投入');record('抽奖结果',g.lotteryDraw(3));
 g.S().scene='camp';g.addMin(120);record('时间推进');g.sleep('rest');record('休息');
 assert.ok(g.save().ok);const code=g.exportCode();assert.ok(g.load());record('保存并读取');assert.ok(g.importCode(code).ok);record('存档码往返');
 g.S().flags.ended_A=1;assert.ok(g.settleEnding('A').ok);record('结局结算');
}
const file=path.join(__dirname,'fixtures/refactor-baseline.json'),out=path.join(__dirname,'_out/refactor-baseline');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'actual.json'),JSON.stringify(details,null,2));
if(process.argv.includes('--record')){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify({baseline:'dfe4de5',cases:actual},null,2)+'\n');console.log('基线已记录；必须在业务修改前建立并复核。');}
else{const expected=JSON.parse(fs.readFileSync(file,'utf8'));assert.deepEqual(actual,expected.cases,'行为或随机调用顺序改变，完整状态见 _out/refactor-baseline/actual.json');console.log(`通过 ${actual.length} 项，失败 0 项\nRESULT:PASS`);}
