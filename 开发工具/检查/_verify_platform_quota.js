/* 真实 Chrome 网页配额下启动选择与失败重试；独立配置，不接触玩家存储。 */
const assert=require('node:assert/strict'),{openBrowser,pressElement}=require('../../回归测试/helpers/browser');
let b,count=0;
const check=async(name,expr)=>{assert.ok(await b.ev(expr),name);console.log('OK '+name);count++;};
(async()=>{try{
 b=await openBrowser({width:844,height:390});
 const seed=await b.ev(`(()=>{Game.newGame('fisher','normal');const save=JSON.parse(JSON.stringify(Game.S())),meta=JSON.parse(JSON.stringify(Game.metaState()));save._runId='quota-local';save.day=8;save._rev=3;meta._accountRev=4;meta.soul=321;meta._quotaPadding='存'.repeat(450000);return {save,meta}})()`);await b.close();b=null;
 for(const which of ['local','cloud','full']){
  const init=`(()=>{
   const seed=${JSON.stringify(seed)},save=JSON.stringify(seed.save),meta=JSON.stringify(seed.meta),remote={...seed.save,day:35,_runId:'quota-cloud',_rev:20};
   localStorage.setItem('guyuyizhang_save',save);localStorage.setItem('guyuyizhang_meta',meta);localStorage.setItem('guyuyizhang_rev','3');
   window.__quotaOriginal={save,meta};window.__quotaFiles=new Map();
   const body=JSON.stringify({save:remote,meta:seed.meta}),files=window.__quotaFiles;
   const fs={readFile(o){files.has(o.filePath)?o.success({data:files.get(o.filePath)}):o.fail({errno:400101,errMsg:'no such file'});},writeFile(o){files.set(o.filePath,o.data);o.success({});}};
   window.tap={env:{USER_DATA_PATH:'tapfile://quota'},getFileSystemManager:()=>fs,getCloudSaveManager:()=>({getArchiveList(o){o.success({saves:[{uuid:'quota',fileId:'f',name:'guyuyizhang_main'}]});},getArchiveData(o){files.set(o.targetFilePath,body);o.success({filePath:o.targetFilePath});}})};
   let filler='';for(let n=0;n<200;n++){try{const next=filler+'x'.repeat(32768);localStorage.setItem('test_quota_filler',next);filler=next;}catch(e){if(e.name!=='QuotaExceededError')throw e;break;}}
   localStorage.setItem('test_quota_filler',filler.slice(0,Math.max(0,filler.length-${which==='full'?'0':'2*(meta.length+save.length)+65536'})));
  })();`;
  b=await openBrowser({width:844,height:390,init});await b.sleep(300);
  await check('真实启动要求选择两份进度 '+which,`!!document.querySelector('[data-choice="1"]')&&!GuyuSaveBridge.ready()`);
  if(which!=='full'){
   await check('相同实际配额重演旧全量日志和备用双写必失败 '+which,`(()=>{const before=Object.fromEntries(PlatformSaveStore.keys.map(k=>[k,localStorage.getItem(k)])),other={...before};delete other.guyuyizhang_alternate_save;let quota=false;try{localStorage.setItem('guyuyizhang_platform_import',JSON.stringify({before}));localStorage.setItem('guyuyizhang_alternate_save',JSON.stringify(other));}catch(e){quota=e.name==='QuotaExceededError';}finally{localStorage.removeItem('guyuyizhang_platform_import');localStorage.removeItem('guyuyizhang_alternate_save');}return quota;})()`);
   await pressElement(b.send,b.ev,`[data-choice="${which==='local'?0:1}"]`);
   await check('新写法在相同配额进入标题，保留账号和另一局 '+which,`GuyuSaveBridge.ready()&&!!document.querySelector('#btn-load')&&Game.metaState().soul===321&&JSON.parse(localStorage.getItem('guyuyizhang_save')).day===${which==='local'?8:35}&&JSON.parse(JSON.parse(localStorage.getItem('guyuyizhang_alternate_save')).guyuyizhang_save).day===${which==='local'?35:8}&&!localStorage.getItem('guyuyizhang_platform_import')`);
   await b.shot('nov11-quota-'+which+'.png');
  }else{
   await pressElement(b.send,b.ev,'[data-choice="1"]');
   await check('真实满额不关闭选择，中文提示并提供诊断备份',`!GuyuSaveBridge.ready()&&document.querySelector('#modal').textContent.includes('存储空间不足')&&!!document.querySelector('[data-choice="2"]')&&localStorage.getItem('guyuyizhang_save')===window.__quotaOriginal.save&&localStorage.getItem('guyuyizhang_meta')===window.__quotaOriginal.meta&&!localStorage.getItem('guyuyizhang_platform_import')`);
   await b.shot('nov11-quota-full.png');
   await pressElement(b.send,b.ev,'[data-choice="2"]');
   await check('可进入原始备份与诊断入口',`!document.querySelector('#boot-actions').hidden`);
   await pressElement(b.send,b.ev,'#boot-actions button:nth-child(2)');
   await check('诊断包含真实失败原因',`document.querySelector('#boot-diagnostic').value.includes('存储空间不足')`);
   await pressElement(b.send,b.ev,'#boot-actions button:nth-child(3)');
   await check('满额时仍可读出完整原始存档备份',`(()=>{const v=JSON.parse(document.querySelector('#boot-diagnostic').value);return v.type==='guyu-emergency-backup'&&v.data.guyuyizhang_save===window.__quotaOriginal.save&&v.data.guyuyizhang_meta===window.__quotaOriginal.meta;})()`);
   await b.navigate(await b.ev('location.href'));await b.sleep(250);
   await b.ev(`localStorage.removeItem('test_quota_filler')`);await pressElement(b.send,b.ev,'[data-choice="0"]');
   await check('空间恢复后能够重新选择，账号及当前局保持',`GuyuSaveBridge.ready()&&Game.metaState().soul===321&&JSON.parse(localStorage.getItem('guyuyizhang_save')).day===8`);
  }
  assert.deepEqual(b.errors,[]);await b.close();b=null;
 }
 console.log('通过 '+count+' 项，失败 0 项\nRESULT:PASS');
}catch(e){console.error(e.stack);await b?.shot('nov11-quota-failure.png');console.log('RESULT:FAIL');process.exitCode=1;}finally{await b?.close();}})();
