const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../孤屿遗章-游戏 - 发布');
const Transactions=new Function(fs.readFileSync(path.join(root,'js/storage/transactions.js'),'utf8')+';return SaveTransactions;')();
const Codec=new Function(fs.readFileSync(path.join(root,'js/storage/codec.js'),'utf8')+';return SaveCodec;')();
const journal='guyuyizhang_write_journal',keys=['save','save_bak','savedAt','rev','meta','meta_bak'].map(k=>'guyuyizhang_'+k);
let passed=0;const check=(name,fn)=>{fn();passed++;console.log('OK '+name);};
function fixture(){
 const data=new Map(keys.map((key,i)=>[key,String(i)])),events=[];let writes=0,failAt=0,restoreFail=false,pair={save:{old:'save'},meta:{old:'meta'}};
 const storage={getItem:key=>data.get(key)??null,setItem(key,value){writes++;if(writes===failAt||restoreFail)throw Error('quota');data.set(key,value);},removeItem(key){writes++;if(writes===failAt||restoreFail)throw Error('quota');data.delete(key);}};
 const tx=Transactions.create({storage,getPair:()=>pair,setPair:(save,meta)=>{pair={save,meta};},migrateMeta:()=>events.push('migrate'),normalize:rev=>events.push('normalize:'+rev),reconcile:()=>events.push('reconcile'),saveRun:()=>{assert.ok(tx.active());for(const key of keys.slice(0,4))storage.setItem(key,'new');events.push('run');return {ok:true};},saveMeta:()=>{assert.ok(tx.active());for(const key of keys.slice(4))storage.setItem(key,'new');events.push('meta');return {ok:true};},mirror:()=>{assert.ok(!tx.active());events.push('mirror');},push:()=>events.push('push'),onFailure:()=>events.push('failure'),warn:()=>{}});
 return {data,storage,tx,events,pair:()=>pair,failAt:n=>failAt=n,restoreFail:on=>restoreFail=on};
}
check('主档和账号同一事务提交，顺序与既有流程一致',()=>{const f=fixture(),s={},m={};assert.ok(f.tx.commit(s,m,false).ok);assert.equal(f.pair().save,s);assert.equal(f.pair().meta,m);assert.deepEqual(f.events,['migrate','reconcile','run','meta','mirror','push']);assert.ok(!f.tx.pending());});
check('导入走归一化并恢复原版本计数，账号单独更新不写主档',()=>{const f=fixture();assert.ok(f.tx.commit({}, {},true).ok);assert.equal(f.events[1],'normalize:3');const g=fixture();assert.ok(g.tx.commit(null,{},false).ok);assert.deepEqual(g.events,['migrate','meta','mirror','push']);assert.equal(g.data.get(keys[0]),'0');});
check('逐一注入八个写入阶段失败，磁盘和内存均回滚，不发送成功通知',()=>{
 for(let step=1;step<=8;step++){const f=fixture(),before=[...f.data],old=f.pair();f.failAt(step);assert.equal(f.tx.commit({}, {},false).ok,false,'stage '+step);assert.deepEqual([...f.data].sort(),before.sort());assert.equal(f.pair().save,old.save);assert.equal(f.pair().meta,old.meta);assert.ok(!f.tx.active());assert.ok(!f.events.includes('mirror')&&!f.events.includes('push'));}
});
check('已有恢复日志时拒绝新事务，恢复完整旧值后才允许写入',()=>{const f=fixture(),before=Object.fromEntries(f.data);before[keys[1]]=null;f.data.set(journal,JSON.stringify({version:1,before}));f.data.set(keys[0],'partial');assert.equal(f.tx.commit({}, {},false).ok,false);assert.equal(f.data.get(keys[0]),'partial');f.tx.recover();assert.ok(!f.tx.pending());assert.equal(f.data.get(keys[0]),'0');assert.equal(f.data.has(keys[1]),false);assert.ok(f.tx.commit({}, {},false).ok);});
check('恢复途中仍不可写时保留日志，下次恢复可重试',()=>{const f=fixture(),before=Object.fromEntries(f.data);f.data.set(journal,JSON.stringify({version:1,before}));f.data.set(keys[0],'partial');f.restoreFail(true);f.tx.recover();assert.ok(f.tx.pending());assert.equal(f.data.get(keys[0]),'partial');f.restoreFail(false);f.tx.recover();assert.ok(!f.tx.pending());assert.equal(f.data.get(keys[0]),'0');});
check('存档码中文往返与校验，解析不改变原载荷或写存储',()=>{const payload={v:1,t:'构建甲',meta:{soul:3,slots:[null,null,null]},save:{day:8,name:'灵灰'}};const code=Codec.encode(payload),snapshot=JSON.stringify(payload);let called=0;const parsed=Codec.read(code,s=>{called++;return s.day===8;});assert.ok(parsed.ok);assert.deepEqual(parsed.data,payload);assert.equal(called,1);assert.equal(JSON.stringify(payload),snapshot);assert.ok(Codec.read(code.replace(/(.{30})/g,'$1\n'),()=>true).ok);});
check('截断、网址、异版、校验错误及非法结构拒绝，旧码可只读预览',()=>{
 const pack=d=>btoa(unescape(encodeURIComponent(JSON.stringify(d))));
 for(const code of ['', 'https://example.com','GY-EXAMPLE','<html>', 'broken',pack({v:2,meta:{}}),pack({v:1,meta:[],checksum:'bad'}),pack({meta:{slots:[null]}}),Codec.encode({v:1,meta:{},save:{bad:true}})])assert.equal(Codec.read(code,()=>false).ok,false,code);
 const d={v:1,meta:{},save:null};const code=Codec.encode(d);d.meta.soul=999;assert.equal(Codec.read(pack(d),()=>true).ok,false);assert.ok(Codec.read(pack({meta:{slots:[null,null,null]}}),()=>false).ok);assert.ok(Codec.read(code,()=>true).ok);
});
console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
