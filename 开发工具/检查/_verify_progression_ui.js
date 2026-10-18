/* Real independent Chrome checks: challenge selection, soul workshop and boss. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-mobile-')),port=9666;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const json=url=>new Promise((res,rej)=>http.get(url,r=>{let s='';r.on('data',x=>s+=x);r.on('end',()=>{try{res(JSON.parse(s));}catch(e){rej(e);}});}).on('error',rej));
let passed=0,fail=0,ws,ch;const errors=[];
(async()=>{try{
 ch=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--allow-file-access-from-files','--remote-debugging-port='+port,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
 let tab;for(let i=0;i<80&&!tab;i++){await sleep(200);try{tab=(await json('http://127.0.0.1:'+port+'/json/list')).find(t=>t.type==='page');}catch{}}
 assert.ok(tab);ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let seq=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);};
 const send=(method,params={})=>new Promise((r,j)=>{const id=++seq;pending.set(id,m=>m.error?j(Error(JSON.stringify(m.error))):r(m.result));ws.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
 const waitRoomLayout=async()=>{let last='',stable=0;for(let i=0;i<40;i++){const state=await ev(`(()=>{const imgs=[...document.querySelectorAll('.room-stage img')],sprites=[...document.querySelectorAll('.room-sprite')];if(!imgs.length||sprites.length<=10||imgs.some(e=>!e.complete||!e.naturalWidth))return '';return JSON.stringify(sprites.map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));})()`);stable=state&&state===last?stable+1:0;last=state;if(stable>=2)return;await sleep(100);}throw Error('房间图片或布局未稳定');};
 const check=async(name,expr)=>{const ok=await ev(expr);if(!ok){await shot('mobile-ui-failure.png');console.error(await ev(`JSON.stringify([...document.querySelectorAll('[data-separate], .room-sprite')].map(e=>({name:e.getAttribute('aria-label')||e.title,rect:e.getBoundingClientRect().toJSON(),hit:document.elementFromPoint(e.getBoundingClientRect().x+e.offsetWidth/2,e.getBoundingClientRect().y+e.offsetHeight/2)?.outerHTML.slice(0,180)})))`));}assert.ok(ok,name);passed++;console.log('OK '+name);};
 const shot=async(name)=>{const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name),Buffer.from(r.data,'base64'));};
 await send('Runtime.enable');await send('Page.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('guyuyizhang_logw','tiny');localStorage.setItem('guyuyizhang_language','zh');"});


 const downloads=fs.mkdtempSync(path.join(out,'progression-files-'));
 await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
 const tap=async selector=>{if(!await ev(`!!document.querySelector(${JSON.stringify(selector)})`)){await shot('progression-missing.png');console.error(await ev(`document.querySelector('#modal')?.textContent`));throw Error('Missing '+selector);}await sleep(400);await ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'});`);const r=await ev(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(450);};
 for(const [w,h] of [[667,375],[926,428]]) {
 await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(1400);
 await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().capacity=999;Game.S().inv={wood:40};Game.S().toolkit=[null,null,null];Game.markBatchTipSeen();UI.begin();`);await sleep(2200);
 await ev(`document.querySelector('#modal [data-choice]')?.click();`);await sleep(300);
 await tap('[data-nav="save"]');await tap('[data-savemenu="settings"]');
 await check('默认手动工具 '+w,`!Game.autoToolsEnabled() && document.querySelector('[data-set="autoTools"]').textContent.includes('关')`);
 await tap('[data-set="autoTools"]');await check('实际触摸开启自动工具 '+w,`Game.autoToolsEnabled()&&document.querySelector('[data-set="autoTools"]').classList.contains('active')`);
 await ev(`document.querySelector('[data-set="autoTools"]').closest('.help-item').scrollIntoView({block:'start'});`);await sleep(100);await shot('progression-tools-'+w+'.png');
 await ev(`Locale.set('en');`);await sleep(200);await check('新增工具设置英文完整 '+w,`!/[\u4e00-\u9fff]/.test(document.querySelector('[data-set="autoTools"]').closest('.help-item').textContent)`);
 await ev(`Locale.set('zh');`);await tap('[data-codex="export"]');
 await check('导出预览完整性校验 '+w,`document.querySelector('#modal').textContent.includes('完整性校验通过')`);
 const code=await ev(`document.querySelector('#codex-text').value`);await tap('#codex-download');
 let saved;for(let i=0;i<30&&!saved;i++){await sleep(100);saved=fs.readdirSync(downloads).filter(x=>x.endsWith('.txt')).find(x=>fs.readFileSync(path.join(downloads,x),'utf8')===code);}
 assert.ok(saved,'下载文件内容与完整导出码一致');passed++;console.log('OK 实际下载完整备份 '+w);
 await shot('progression-export-'+w+'.png');
 await tap('#modal-close');await tap('[data-nav="save"]');await tap('[data-savemenu="settings"]');await tap('[data-codex="import"]');
 await ev(`document.querySelector('#codex-text').value='https://example.com';document.querySelector('#codex-text').dispatchEvent(new Event('input'));`);
 await check('错误类型在覆盖前显示原因 '+w,`document.querySelector('#codex-preview').textContent.includes('网址或兑换码')`);
 const importCode=await ev(`(()=>{const day=Game.S().day;Game.S().day=23;const code=Game.exportCode();Game.S().day=day;return code;})()`);
 const file=path.join(downloads,'import-'+w+'.txt');fs.writeFileSync(file,importCode);
 const dom=await send('DOM.getDocument');const node=await send('DOM.querySelector',{nodeId:dom.root.nodeId,selector:'#codex-file'});await send('DOM.setFileInputFiles',{nodeId:node.nodeId,files:[file]});await sleep(350);
 await check('真实文件读取后显示导入天数 '+w,`document.querySelector('#codex-preview').textContent.includes('23')&&Game.S().day===1`);
 await ev(`Locale.set('en');`);await sleep(150);await check('文件导入界面英文完整 '+w,`!/[\u4e00-\u9fff]/.test(document.querySelector('#modal').textContent)`);await check('英文导入按钮不被屏幕下沿裁切 '+w,`document.querySelector('#codex-do').getBoundingClientRect().bottom<=innerHeight-2`);await shot('progression-import-en-'+w+'.png');
 await tap('#codex-do');await check('确认前不覆盖并展示23天 '+w,`Game.S().day===1&&document.querySelector('#modal').textContent.includes('23')`);
 await shot('progression-confirm-en-'+w+'.png');
 await tap('[data-choice="1"]');await check('取消保留输入和当前档 '+w,`Game.S().day===1&&document.querySelector('#codex-text').value===${JSON.stringify(importCode)}`);
 // Native route uses only two fixed backup commands, not Blob downloads or file/content access.
 await ev(`window.__backupCalls=[];window.GuyuFileBackup={open:()=>window.__backupCalls.push(['guyu-backup:import']),save:code=>window.__backupCalls.push(['guyu-backup:export',code])};`);
 await tap('#codex-file-pick');await tap('#codex-current-backup');await check('安卓宿主导入导出接线 '+w,`window.__backupCalls[0][0]==='guyu-backup:import'&&window.__backupCalls[1][0]==='guyu-backup:export'&&Game.inspectCode(window.__backupCalls[1][1]).ok`);
 await ev(`window.GuyuFileBackup=null;`);
 await tap('#codex-do');await tap('[data-choice="0"]');await sleep(250);await check('确认后实际恢复进度与自动工具设置 '+w,`Game.S().day===23&&Game.autoToolsEnabled()`);
 for(let i=0;i<60 && await ev(`!!document.querySelector('#loading')`);i++)await sleep(100);
 await ev(`Game.S().scene='forest';Game.S().zone=null;Game.S().weather='sun';Game.addItem('axeSteel',1,true);UI.render();`);await sleep(400);
 const spot=await ev(`document.querySelector('[data-point-id="forest_tree"]').getBoundingClientRect().toJSON()`);
 const wood=await ev(`Game.invCount('wood')`);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:spot.x+spot.width/2,y:spot.y+spot.height/2}]});await sleep(600);await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(250);
 await check('真实长按显示工具与实际耗时，未误采集 '+w,`document.querySelector('#modal').classList.contains('open')&&/steel axe/i.test(document.querySelector('#modal').textContent)&&document.querySelector('#modal').textContent.includes('15')&&Game.invCount('wood')===${wood}`);
 await check('采集预览英文完整 '+w,`!/[\u4e00-\u9fff]/.test(document.querySelector('#modal').textContent)`);
 await shot('progression-gather-en-'+w+'.png');
 await tap('#modal .modal-x');await ev(`window.__rng=Math.random;Math.random=()=>.99;`);await tap('[data-point-id="forest_tree"]');for(let i=0;i<60 && await ev(`document.querySelector('#busy').classList.contains('open')`);i++)await sleep(100);await ev(`Math.random=window.__rng;`);
 await check('短按仍采集一次且磨损对应钢斧 '+w,`Game.S().pointUses.forest_tree===1&&Game.durOf('axeSteel')===89&&Game.invCount('wood')>${wood}`);


 }
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{ws?.close();ch?.kill();console.log('通过 '+passed+' 项，失败 '+fail+' 项\nRESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();
