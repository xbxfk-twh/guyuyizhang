/* Real independent Chrome checks: challenge selection, soul workshop and boss. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'发行产物/itch.io英文发布素材/screenshots'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-mobile-')),port=9662;
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
 const shot=async(name)=>{await ev(`document.querySelector('#logbody')?.replaceChildren();`);const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name),Buffer.from(r.data,'base64'));};
 await send('Runtime.enable');await send('Page.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.removeItem('guyuyizhang_language');"});


 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(3500);await ev(`Locale.set('en');`);await shot('01-title.png');
 await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.markBatchTipSeen();Game.S().capacity=30;Game.S().inv={};for(const id of ['wood','plank','stone','flint','water','berry','axeStone','ironSword'])Game.addItem(id,ITEMS[id].stack===1?1:10,true);UI.begin();document.querySelector('#modal .modal-x')?.click();`);await sleep(1800);
 await ev(`document.querySelector('#modal .modal-x')?.click();Object.assign(Game.S().buildings,{house:2,fire:2,storage:2,wall:2,watch:1});UI.render();`);await sleep(1300);await shot('02-camp.png');
 await ev(`document.querySelector('[data-nav="craft"]').click();`);await sleep(600);await shot('03-crafting.png');await ev(`document.querySelector('#modal .modal-x').click();Game.S().scene='forest';UI.render();`);await sleep(1200);await shot('04-forest.png');
 await ev(`Game.S().equipment.weapon='ironSword';Game.startFight(ENEMIES.wolf,true);`);await sleep(1600);await shot('05-combat.png');
 await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().flags.ended_C=true;Game.S().scene='atlantis';Game.S().zone='habitat';Object.assign(Game.atlantisCamp().furniture,{seaStorage1:true,pearlWork:true,repairBench:true});UI.begin();document.querySelector('#modal .modal-x')?.click();UI.render();`);await sleep(6000);await shot('06-underwater.png');
 await ev(`document.querySelector('#modal .modal-x')?.click();Game.S().zone='sanctum';UI.render();`);await sleep(1200);await shot('07-ruins.png');
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);console.error(JSON.stringify(errors));if(ws){try{ws.send(JSON.stringify({id:9999,method:'Page.captureScreenshot',params:{format:'png'}}));}catch{}}}finally{ws?.close();ch?.kill();console.log('通过 '+passed+' 项，失败 '+fail+' 项\nRESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();

