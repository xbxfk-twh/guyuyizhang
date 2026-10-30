const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../孤屿遗章-游戏 - 发布');
const load=(file,name)=>new Function(fs.readFileSync(path.join(root,file),'utf8')+';return '+name+';')();
const Store=load('js/core/state-store.js','StateStore'),Tutorial=load('js/features/tutorial.js','TutorialRules');
let passed=0;function check(name,fn){fn();passed++;console.log('OK '+name);}
check('状态替换只保留一个当前局，账号独立，端口不能被调用者覆盖',()=>{
 const store=Store.create(),a={inv:{wood:2}},b={inv:{wood:7}},meta={soul:3};
 store.replace(a,meta);assert.equal(store.run,a);store.run=b;assert.equal(store.run,b);assert.equal(store.profile,meta);assert.deepEqual(store.pair(),{save:b,meta});assert.ok(Object.isFrozen(store));store.replace=null;assert.equal(typeof store.replace,'function');
});
check('嵌套预演和异常退出恢复准确对象与进入前标志，不修改原状态',()=>{
 const store=Store.create(),run={inv:{wood:2}},meta={soul:3},draft={inv:{wood:1}},draftMeta={soul:2};store.replace(run,meta);
 store.preview(draft,draftMeta,()=>{assert.equal(store.run,draft);assert.ok(store.staging);assert.throws(()=>store.preview({inv:{}},{},()=>{throw Error('inner');}),/inner/);assert.equal(store.run,draft);assert.equal(store.profile,draftMeta);assert.ok(store.staging);});
 assert.equal(store.run,run);assert.equal(store.profile,meta);assert.equal(store.staging,false);assert.equal(run.inv.wood,2);
 store.staging=true;assert.throws(()=>store.preview(draft,draftMeta,()=>{throw Error('outer');}),/outer/);assert.ok(store.staging);assert.equal(store.run,run);
});
check('引导只响应真实操作一次，使用读档后的状态，跳过触发刷新',()=>{
 let state=null,calls=0;const tutorial=Tutorial.create({getState:()=>state,changed:()=>calls++,items:{pick:{tool:{}}}});
 assert.equal(tutorial.skip(),false);state={tut:0,inv:{wood:1}};assert.ok(tutorial.bagViewed());assert.equal(state.tut,1);assert.equal(tutorial.bagViewed(),false);assert.equal(calls,1);
 const old=state;state={tut:0,inv:{pick:1}};tutorial.bagViewed();assert.equal(state.tut,2);assert.equal(old.tut,1);tutorial.skip();assert.equal(state.tut,null);assert.equal(calls,3);
});
check('模块加载清单包含业务和视图，核心规则不依赖界面或音频对象',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'runtime-manifest.json'),'utf8'));
 const modules=manifest.logic.filter(f=>f.startsWith('js/features/')||f.startsWith('js/inventory/'));
 assert.ok(modules.length>=25);assert.ok(manifest.scripts.filter(f=>f.startsWith('js/ui/views/')).length>=28);
 for(const file of modules){const source=fs.readFileSync(path.join(root,file),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');assert.equal(/\b(?:document|AudioFX|UI|CombatStage)\s*\./.test(source),false,file+' 不得依赖表现对象');}
});
console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
