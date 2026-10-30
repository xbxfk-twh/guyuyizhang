/* Real local Python service + isolated mobile Chrome; never touches production or player storage. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const {openBrowser}=require('../../回归测试/helpers/browser');
let b,python,count=0;const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-transfer-test-'));
const check=async(name,expr)=>{assert.ok(await b.ev(expr),name);count++;console.log('OK '+name);};
async function until(expr){for(let n=0;n<100;n++){if(await b.ev(expr))return;await b.sleep(100);}throw Error('等待界面失败：'+await b.ev('document.body.innerText.slice(0,600)'));}
async function openCode(mode){await b.tap('[data-nav="save"]');await b.tap('[data-savemenu="backup"]');await b.tap('[data-codex="'+mode+'"]');}
function unavailable(kind){return `
 Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (Linux; Android 15; ${kind==='oppo'?'OPPO Find X8':'Honor 400 Pro'}) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36 TapTap'});
 window.__cloudWrites=0;window.__deviceWrites=0;
 const fsm={readFile(o){o.fail(${kind==='disk'?"{errno:400100,errMsg:'设备接口尚未就绪'}":"{errno:'400101',errMsg:'文件不存在'}"});},writeFile(o){__deviceWrites++;o.success({});}};
 window.tap=${kind==='missing'?'{}':`{env:{USER_DATA_PATH:'tapfile://usr'},getFileSystemManager:()=>fsm,getCloudSaveManager:()=>({getArchiveList(o){o.fail({errMsg:'login unavailable'});},createArchive(){__cloudWrites++;}})}`};
 `;}
(async()=>{try{
 for(const kind of ['oppo','honor','missing','disk']){
  b=await openBrowser({width:800,height:360,init:unavailable(kind)});await until(`!!document.querySelector('#boot-local')`);
  await check(kind+'：启动异常可见本机入口且尚未创建空账号',`!GuyuSaveBridge.ready()&&!localStorage.getItem('guyuyizhang_meta')`);
  await check(kind+'：恢复界面文字有对比度、主入口在首屏',`(()=>{const p=document.querySelector('#boot-panel'),c=getComputedStyle(p),r=document.querySelector('#boot-local').getBoundingClientRect();return c.color==='rgb(23, 24, 17)'&&c.backgroundColor==='rgb(234, 230, 218)'&&r.top>=0&&r.bottom<=innerHeight&&document.querySelector('#boot-actions').firstElementChild.id==='boot-local'})()`);
  if(kind==='oppo'){
   await b.sleep(15500);
   await check('恢复入口出现后，15秒启动看门狗不再覆盖可读说明',`document.querySelector('#boot-status').textContent.startsWith('云存档暂时无法连接。')`);
   await b.shot('oct30-startup-local.png');
  }
  await b.tap('#boot-local');await until(`!!document.querySelector('#btn-new')`);
  await b.tap('#btn-new');await check(kind+'：触摸新旅程进入身份选择，云端及未知设备文件未被写入',`GuyuSaveBridge.ready()&&!!document.querySelector('.identity-list')&&__cloudWrites===0&&(${JSON.stringify(kind)}!=='disk'||__deviceWrites===0)`);
  assert.deepEqual(b.errors,[]);await b.close();b=null;
 }
 const serverScript=`import sys,pathlib;sys.path.insert(0,sys.argv[1]);from server import Store,Server;s=Server(('127.0.0.1',0),Store(sys.argv[2],{'account_key':'isolated-test'},verify=lambda c:'test'));print(s.server_port,flush=True);s.serve_forever()`;
 python=spawn('python',['-u','-c',serverScript,path.join(root,'开发工具/存档服务'),path.join(temp,'test.sqlite3')],{windowsHide:true,stdio:['ignore','pipe','pipe']});
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('测试后端未启动')),5000);python.stdout.once('data',d=>{clearTimeout(timer);resolve(Number(String(d).trim()));});python.once('error',reject);});assert.ok(port);
 const init=`Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (Linux; Android 15) Chrome/130 Mobile Safari/537.36',configurable:true});const originalFetch=window.fetch.bind(window);window.fetch=(url,opts)=>originalFetch(String(url).replace('https://guyuyizhang.top:8443','http://127.0.0.1:${port}'),opts);window.GuyuFileBackup={save:body=>window.__fileBackup=body};`;
 b=await openBrowser({init});await until(`!!document.querySelector('#btn-new')`);
 await b.ev(`Game.newGame('fisher','normal');Game.S().day=38;Game.S().tut=null;Game.S().inv.wood=47;Game.metaState().soul=456;Game.backupSlot(0);UI.begin();`);await b.sleep(2700);await b.ev(`UI.handleBack();`);await openCode('export');await b.ev(`window.__source=Game.exportCode();`);
 await check('导出界面没有巨型长码，完整备份文件可用',`document.querySelector('#codex-text').value===''&&!document.querySelector('#codex-download')`);
 await b.ev(`window.__write=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError')}`);
 await b.tap('#codex-generate');await until(`/^[A-Z0-9]{8}$/.test(document.querySelector('#codex-text').value)`);
 await check('本地写满时仍能通过真实HTTP生成应急取件码，没有递归弹出写入失败窗口',`!!document.querySelector('#codex-generate')&&/^[a-f0-9]{32}$/.test(Game.metaState().transferOwner)`);
 await b.ev(`Storage.prototype.setItem=window.__write`);
 await check('实际手机客户端经HTTP生成8位字母数字取件码，未丢失本局与账号',`document.querySelector('#codex-text').value.length===8&&Game.S().day===38&&Game.metaState().soul===456`);
 const short=await b.ev(`document.querySelector('#codex-text').value`);await b.shot('oct30-transfer-export.png');
 for(let i=0;i<2;i++){await b.tap('#codex-generate');await until(`!document.querySelector('#codex-generate').disabled`);}
 const third=await b.ev(`document.querySelector('#codex-text').value`);
 await b.tap('#codex-generate');await until(`!document.querySelector('#codex-generate').disabled`);
 await check('同一账号第四次由真实服务器拒绝，仍保留最后一个有效码',`document.querySelector('#transfer-status').textContent.includes('每账号每小时最多生成3次')&&document.querySelector('#codex-text').value===${JSON.stringify(third)}&&!document.querySelector('#codex-copy').disabled`);
 await b.ev(`Object.defineProperty(navigator,'userAgent',{value:'Desktop Chrome',configurable:true});`);await b.tap('#modal .modal-x');await openCode('export');await b.ev(`window.__desktopSource=Game.exportCode()`);await b.tap('#codex-download');await check('文件保存仍为可离线恢复的完整内容',`__fileBackup===__desktopSource&&Game.inspectCode(__fileBackup).day===38`);await b.close();b=null;
 b=await openBrowser({init});await until(`!!document.querySelector('#btn-new')`);await b.ev(`Game.newGame('fisher','normal');Game.S().day=2;Game.S().tut=null;Game.metaState().soul=10;UI.begin();`);await b.sleep(2700);await b.ev(`UI.handleBack();`);await openCode('import');await b.ev(`const t=document.querySelector('#codex-text');t.value=${JSON.stringify(short)};t.dispatchEvent(new Event('input'));`);
 await b.tap('#codex-do');await until(`document.querySelector('.modal-title')?.textContent==='确认导入备份'`);
 await check('另一隔离设备取档先预览，尚未覆盖当前局',`Game.S().day===2&&Game.metaState().soul===10&&document.querySelector('#modal').textContent.includes('第 38 天')`);await b.shot('oct30-transfer-preview.png');
 await b.tap('[data-choice="1"]');await check('取消确认不覆盖进度',`Game.S().day===2&&Game.metaState().soul===10`);
 await b.tap('#codex-do');await until(`document.querySelector('.modal-title')?.textContent==='确认导入备份'`);await b.tap('[data-choice="0"]');
 await check('确认后恢复天数、物品、魂点和备份槽',`Game.S().day===38&&Game.invCount('wood')===47&&Game.metaState().soul===456&&Game.metaState().slots[0].day===38`);
 await b.sleep(2700);await b.ev(`UI.handleBack();`);await openCode('import');await b.ev(`document.querySelector('#codex-text').value='22222222';`);await b.tap('#codex-do');
 await check('失效或错误短码明确提示，原存档保持',`document.querySelector('#codex-preview').textContent.includes('过期')&&Game.S().day===38`);
 await b.ev(`document.querySelector('#codex-text').value=Game.exportCode();`);await b.tap('#codex-do');await check('手机禁止旧长码输入，并去掉文件和备份按钮',`document.querySelector('#codex-text').maxLength===8&&!document.querySelector('#codex-file-pick')&&!document.querySelector('#codex-current-backup')&&document.querySelector('#codex-preview').textContent.includes('8位')&&Game.S().day===38`);
 assert.deepEqual(b.errors,[]);console.log('通过 '+count+' 项，失败 0 项\nRESULT:PASS');
}catch(e){console.error(e.stack);await b?.shot('oct30-transfer-failure.png');console.log('RESULT:FAIL');process.exitCode=1;}finally{await b?.close();python?.kill();}})();
