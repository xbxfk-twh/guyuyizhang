/* 启动提示依据本次真实结果；旧计数不能推断丢档。使用隔离内存，不接触玩家数据。 */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root='孤屿遗章-游戏 - 发布/';
let passed=0;
async function check(name,fn){await fn();passed++;console.log('OK '+name);}
function startup({bridge,storageError}={}){
 const events=[],modals=[];
 const sandbox={window:{GuyuSaveBridge:bridge,__guyuBoot:{ready(){events.push('ready');},fail(e){events.push(['fail',e]);}}},document:{readyState:'complete'},Game:{validSave(){return true;},initializeStorage(){events.push('storage');if(storageError)throw Error(storageError);}},localStorage:{getItem(){throw Error('不得依靠历史计数');}}};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(root+'js/ui/views/startup.js','utf8')+';this.view=StartupView;',sandbox);
 const deps={$:()=>({}),applyLogMode(){},applySkin(){events.push('skin');},showTitle(){events.push('title');},showModal:(kind,cfg)=>modals.push(cfg)};
 return {view:sandbox.view.create(deps),events,modals};
}
function watchdog(){
 const html=fs.readFileSync(root+'index.html','utf8'),script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(x=>x.includes('var ready = false'));
 const nodes=Object.fromEntries(['boot-status','boot-actions','boot-diagnostic'].map(k=>[k,{textContent:'正在准备游戏……',hidden:true,focus(){},select(){}}])),timers=[];
 const data=new Map([['guyuyizhang_save','原始进度'],['unrelated','不应导出']]);
 const context={window:{BUILD_VER:'test',addEventListener(){}},document:{getElementById:k=>nodes[k],documentElement:{classList:{remove(){}}}},navigator:{userAgent:'test'},setTimeout:fn=>timers.push(fn),localStorage:{get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)}};
 vm.createContext(context);vm.runInContext(script,context);return {boot:context.window.__guyuBoot,nodes,timers,data};
}
(async()=>{try{
 await check('正常初始化不读历史崩溃计数，不弹恢复窗口',async()=>{const f=startup();f.view.init();await new Promise(setImmediate);assert.deepEqual(f.events,['storage','skin','title','ready']);assert.equal(f.modals.length,0);});
 await check('真正账号读取失败仍阻止进入，不把失败当成功',async()=>{const f=startup({storageError:'账号记录损坏'});f.view.init();await new Promise(setImmediate);assert.deepEqual(f.events,['storage',['fail','账号记录损坏']]);});
 await check('云端初始化失败仍保留诊断，不创建新账号',async()=>{const f=startup({bridge:{initialize:async()=>{throw Error('cloud unavailable');}}});f.view.init();await new Promise(setImmediate);assert.deepEqual(f.events,[['fail','cloud unavailable']]);});
 await check('两份进度冲突仍明确要求选择，不自动覆盖',async()=>{const f=startup({bridge:{initialize:async()=>({conflict:{kind:'device',localDay:5,cloudDay:9,localSoul:10,cloudSoul:20,localSlots:0,cloudSlots:1}})}});f.view.init();await new Promise(setImmediate);assert.deepEqual(f.events,['ready']);assert.equal(f.modals.length,1);assert.equal(f.modals[0].requiredChoice,true);assert.equal(f.modals[0].choices.length,2);assert.match(f.modals[0].text,/不同的进度/);});
 await check('界面异常只提示界面问题，保留真实诊断且不改存档',()=>{
  const data=new Map([['guyuyizhang_save','healthy-save']]),nodes=[];
  const sandbox={console:{error(){}},localStorage:{setItem:(k,v)=>data.set(k,v)},document:{getElementById:()=>null,createElement:()=>({style:{}}),body:{appendChild:n=>nodes.push(n)}},setTimeout(){}};
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync(root+'js/ui/views/render.js','utf8')+';this.view=GameRenderView;',sandbox);
  sandbox.view.create({}).onRenderCrash(Error('render test'));
  assert.equal(data.get('guyuyizhang_save'),'healthy-save');assert.match(data.get('guyuyizhang_lasterr'),/render test/);
  assert.match(nodes[0].textContent,/界面/);assert.doesNotMatch(nodes[0].textContent,/存档|回档|迁移/);
 });
 await check('加载超过30秒只说加载较慢，成功进入后不再提示',()=>{const f=watchdog();f.timers[0]();assert.match(f.nodes['boot-status'].textContent,/加载较慢/);assert.equal(f.nodes['boot-actions'].hidden,false);const g=watchdog();g.boot.ready();g.timers[0]();assert.equal(g.nodes['boot-actions'].hidden,true);});
 await check('真实启动错误仍可查看原因并导出原始进度，原文未改',()=>{const f=watchdog();f.boot.fail('quota exceeded');assert.match(f.nodes['boot-status'].textContent,/无法进入/);f.boot.diagnostic();assert.match(f.nodes['boot-diagnostic'].value,/quota exceeded/);f.boot.backup();assert.match(f.nodes['boot-diagnostic'].value,/原始进度/);assert.doesNotMatch(f.nodes['boot-diagnostic'].value,/不应导出/);assert.equal(f.data.get('guyuyizhang_save'),'原始进度');});
 console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
}catch(e){console.error(e.stack);console.log('RESULT:FAIL');process.exitCode=1;}})();
