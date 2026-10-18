/* Real independent Chrome checks: challenge selection, soul workshop and boss. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-mobile-')),port=9662;
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


 for(const [w,h] of [[667,375],[1366,768]]) {
 await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<1000});
 await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(3500);
 await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().capacity=999;Game.S().furniture.wb2=true;for(const id of ['ironpart','wood','resin','cloth'])Game.addItem(id,20,true);Game.addItem('lantern',1,true);UI.begin();document.querySelector('#modal .modal-x')?.click();document.querySelector('[data-nav="equip"]').click();document.querySelector('[data-eqpick="tool"]').click();`);await sleep(500);
 await check('提灯工具图标加载 '+w,`(()=>{const b=document.querySelector('[data-equiptool="lantern"]'),img=b?.querySelector('img');return !!b&&img.complete&&img.naturalWidth>0&&img.getAttribute('src').includes('lantern-woodcut.png')&&b.textContent.includes('50/50');})()`);
 await sleep(2800);await check('加载遮罩已结束 '+w,`!document.querySelector('#loading')`);await shot('lantern-tool-'+w+'.png');
 await ev(`document.querySelector('[data-equiptool="lantern"]').click();`);await sleep(350);
 await check('装备槽显示提灯插画 '+w,`[...document.querySelectorAll('[data-eqpick="tool"] img')].some(img=>img.src.includes('lantern-woodcut.png')&&img.complete&&img.naturalWidth>0)`);
 await ev(`document.querySelector('[data-nav="inv"]').click();`);await sleep(500);
 await check('背包显示提灯插画 '+w,`(()=>{const b=document.querySelector('[data-item="lantern"]'),img=b?.querySelector('img');return !!img&&img.complete&&img.naturalWidth>0&&img.src.includes('lantern-woodcut.png');})()`);await shot('lantern-bag-'+w+'.png');
 await ev(`document.querySelector('[data-nav="craft"]').click();document.querySelector('[data-station="work1"]')?.click();`);await sleep(500);
 await check('提灯配方可制作且靠后 '+w,`(()=>{const bs=[...document.querySelectorAll('[data-recipe]')];const index=bs.findIndex(b=>b.dataset.recipe==='r_lantern');return index>0&&!bs[index].hasAttribute('data-reason')&&index===bs.length-1;})()`);
 await ev(`document.querySelector('[data-recipe="r_lantern"]').scrollIntoView({block:'center'})`);await shot('lantern-recipe-'+w+'.png');
 }
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{ws?.close();ch?.kill();console.log('通过 '+passed+' 项，失败 '+fail+' 项\nRESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();

