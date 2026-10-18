/* Real independent Chrome checks: challenge selection, soul workshop and boss. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-mobile-')),port=9665;
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


 for(const [w,h] of [[667,375],[926,428]]) {
 await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(1400);
 await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().capacity=999;Game.S().inv={wood:40};Game.S().toolkit=[null,null,null];Game.markBatchTipSeen();UI.begin();`);await sleep(2200);
 await ev(`document.querySelector('#modal [data-choice]')?.click();`);await sleep(200);
 await ev(`document.querySelector('[data-nav="craft"]').click();`);await sleep(300);
 await check('只显示一张木板配方 '+w,`document.querySelectorAll('[data-recipe="r_plank"]').length===1&&!document.querySelector('[data-recipe="r_plank_iron"], [data-recipe="r_plank_steel"]')`);
 await check('基础产量与耗时 '+w,`(()=>{const e=document.querySelector('[data-recipe="r_plank"]').closest('.recipe');return e.textContent.includes('木板×2')&&e.textContent.includes('30分')&&e.textContent.includes('40/4');})()`);
 await ev(`document.querySelector('[data-craftbatch="r_plank"]').click();`);await sleep(200);
 await check('基础批量显示实际材料和总产量 '+w,`document.querySelector('#batch-n').max==='10'&&document.querySelector('#batch-output').textContent.includes('木板×20')&&document.querySelector('#batch-output').textContent.includes('木材×40')`);
 await ev(`document.querySelector('[data-cset="1"]').click();`);
 await check('拖动数量同步总产量 '+w,`document.querySelector('#batch-output').textContent.includes('木板×2')&&document.querySelector('#batch-output').textContent.includes('木材×4')`);
 await shot('plank-basic-'+w+'.png');
 await ev(`document.querySelector('#modal-close').click();Game.addItem('axeIron',1,true);Game.equipTool('axeIron');document.querySelector('[data-nav="craft"]').click();`);await sleep(250);
 await check('铁斧产量时间自动更新 '+w,`(()=>{const e=document.querySelector('[data-recipe="r_plank"]').closest('.recipe');return e.textContent.includes('木板×3')&&e.textContent.includes('20分')&&e.textContent.includes('铁斧');})()`);
 await ev(`document.querySelector('[data-recipe="r_plank"]').scrollIntoView({block:'center'});`);await sleep(150);
 await shot('plank-iron-'+w+'.png');
 await ev(`document.querySelector('[data-craftbatch="r_plank"]').click();`);await sleep(150);
 await check('铁斧十批显示三十木板 '+w,`document.querySelector('#batch-output').textContent.includes('木板×30')&&document.querySelector('#batch-output').textContent.includes('木材×40')`);
 await shot('plank-batch-'+w+'.png');
 await ev(`Locale.set('en');`);await sleep(200);
 await check('英文批量窗口不遗留中文 '+w,`!/[\u4e00-\u9fff]/.test(document.querySelector('#modal').textContent)`);
 await shot('plank-batch-en-'+w+'.png');
 }
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{ws?.close();ch?.kill();console.log('通过 '+passed+' 项，失败 '+fail+' 项\nRESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();
