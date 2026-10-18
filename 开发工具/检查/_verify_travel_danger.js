/* Independent Chrome check: travel victory, danger warning and arrival event ordering. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-battle-')),port=9594;
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
 const check=async(name,expr)=>{const ok=await ev(expr);if(!ok){await shot('battle-ui-failure.png');}assert.ok(ok,name);passed++;console.log('OK '+name);};
 const shot=async(name)=>{const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name),Buffer.from(r.data,'base64'));};
 const until=async(expr)=>{for(let i=0;i<100;i++){if(await ev(expr))return;await sleep(100);}throw Error('timeout: '+expr);};
 await send('Runtime.enable');await send('Page.enable');

 await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(1200);
 await ev(`Game.newGame('fisher','normal');Game.S().tut=null;UI.begin();`);
 await until(`!document.querySelector('#loading')`);
 await ev(`document.querySelector('#modal .modal-x')?.click();Game.S().scene='forest';Game.S().stats.hp=31;Game.S().stats.hunger=28;Game.S().stats.thirst=80;Game.rollTravelAmbush('quarry',true);`);await sleep(400);
 await ev(`document.querySelector('[data-choice="0"]').click();`);await sleep(400);
 await ev(`const C=Game.S().combat;C.enemies[0].ehp=1;C.enemies[0].atk=10;C.enemy.spd=C.enemies[0].spd=Game.combatSpeed()+1;C.dist=0;Math.random=()=>0;document.querySelector('[data-fact="attack"]').click();`);
 await check('低血量提醒和抵达事件不替换收尾中的战场',`Game.S().scene==='quarry'&&Game.S().stats.hp<30&&!!document.querySelector('.battle-board')&&!document.querySelector('[data-choice]')`);
 await until(`!!document.querySelector('#fight-btns.over')`);
 await check('战斗归零后仍保留一秒收尾',`!!document.querySelector('.battle-board')&&Game.S()._roadAmbush===null`);
 await until(`!!document.querySelector('[data-choice]')`);
 await check('收尾后才显示目的地事件且只抵达一次',`!document.querySelector('.battle-board')&&Game.S().scene==='quarry'&&Game.S().log.filter(x=>x.text.includes('路通了')).length===1`);
 await shot('travel-danger-fixed.png');
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{try{ws?.close();ch?.kill();}catch{}console.log('通过 '+passed+' 项，失败 '+fail+' 项');console.log('RESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();

