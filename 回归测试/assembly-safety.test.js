const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createEngine}=require('./helpers/engine');
let pass=0;const check=(name,fn)=>{fn();pass++;console.log('OK '+name);};
check('标题页无当前局时刷新仍通知界面，不能访问空局的死亡字段',()=>{const e=createEngine({exposeChange:true});assert.equal(e.G.S(),null);assert.doesNotThrow(()=>e.G.change());assert.deepEqual(e.events,[['change']]);assert.equal(e.G.S(),null);});
check('拥有神物提示可先展示，效果只在装备后生效，往返不合并字段',()=>{
 const e=createEngine({exposeChange:true}),g=e.G;g.newGame('fisher','normal');g.S().tut=null;g.S().relics=['satchel'];g.S().relicEquip=[null,null,null];delete g.S().flags.satchelHelpSeen;
 g.change();assert.equal(g.S().flags.satchelHelpSeen,true);assert.equal(g.hasRelic('satchel'),false);assert.equal(g.satchelStatus().equipped,false);
 assert.ok(g.save().ok);assert.ok(g.load());assert.deepEqual(g.S().relics,['satchel']);assert.ok(!g.S().relicEquip.includes('satchel'));
 g.S().relicSlots=1;assert.ok(g.equipRelic('satchel').ok);assert.equal(g.hasRelic('satchel'),true);
});
check('桥接存储与网页存储分离时，事务镜像必须读取桥接提交的账号',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
 const e=createEngine({bridge:{storage},initial:{guyuyizhang_meta:'{"soul":9999}',guyuyizhang_rev:'9999',guyuyizhang_savedAt:'1'}}),g=e.G;g.initializeStorage();g.newGame('fisher','normal');
 assert.ok(data.has('guyuyizhang_meta'));assert.notEqual(data.get('guyuyizhang_meta'),e.data.get('guyuyizhang_meta'));
 assert.equal(decodeURIComponent(e.jar.get('guyu_meta')),data.get('guyuyizhang_meta'));assert.equal(e.data.get('guyuyizhang_meta'),'{"soul":9999}');
 assert.equal(g.saveRev(),Number(data.get('guyuyizhang_rev')));assert.equal(g.savedAt(),Number(data.get('guyuyizhang_savedAt')));const revision=g.saveRev();assert.ok(g.forceSave().ok);assert.equal(g.saveRev(),revision+1);
 g.S().day=8;assert.ok(g.save().ok);const old=data.get('guyuyizhang_save');g.newGame('fisher','normal');assert.equal(JSON.parse(data.get('guyuyizhang_rescue')).save,old);assert.ok(g.scanLocalSaves().some(x=>x.src==='rescue'&&x.day===8));assert.equal(e.data.has('guyuyizhang_rescue'),false);
});
check('桥接核对完成前不读取账号或恢复事务，完成后才能初始化',()=>{let ready=false,reads=0;const data=new Map([['guyuyizhang_meta','{"soul":81}']]),storage={getItem:k=>{reads++;if(!ready)throw Error('not ready');return data.get(k)??null;},setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)},e=createEngine({bridge:{storage}});assert.equal(reads,0);ready=true;e.G.initializeStorage();assert.equal(e.G.metaState().soul,81);});
check('随机端口可单独注入，创建时不消耗随机数，保持整数及概率边界',()=>{
 const Random=new Function(fs.readFileSync(path.join(__dirname,'../孤屿遗章-游戏 - 发布/js/core/random.js'),'utf8')+';return GameRandom;')();let calls=0;const values=[0,0.999999,0.5,0.5,0.75],r=Random.create({random:()=>{calls++;return values.shift();}});assert.equal(calls,0);assert.equal(r.rnd(2,5),2);assert.equal(r.rnd(2,5),5);assert.equal(r.chance(0.5),false);assert.equal(r.pick(['a','b']), 'b');assert.equal(r.random(),0.75);assert.equal(calls,5);
});
check('规则中的全局随机仅保留三处身份标识生成，玩法不得绕开随机端口',()=>{
 const root=path.join(__dirname,'../孤屿遗章-游戏 - 发布/js'),found=[];
 for(const dir of ['features','inventory'])for(const name of fs.readdirSync(path.join(root,dir))){if(!name.endsWith('.js'))continue;for(const line of fs.readFileSync(path.join(root,dir,name),'utf8').split('\n'))if(line.includes('Math.random()'))found.push([name,line.trim()]);}
 assert.deepEqual(found.map(([file])=>file).sort(),['account.js','lifecycle.js','shop.js']);assert.ok(found.every(([,line])=>line.includes('legacyRunId')||line.includes('_runId:')||line.includes('function walletId()')));
});
console.log(`通过 ${pass} 项，失败 0 项\nRESULT:PASS`);
