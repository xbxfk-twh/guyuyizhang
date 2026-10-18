/* Real independent Chrome checks: challenge selection, soul workshop and boss. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-mobile-')),port=9608;
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
 await send('Runtime.enable');await send('Page.enable');


 for(const [w,h] of [[667,375],[1366,768]]){
 await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<1000});
 await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(4000);
 await ev("Game.newGame('fisher','normal');Game.S().tut=null;Game.S().capacity=999;Game.S().furniture.shelf=true;Game.addItem('spear',1,true);Game.equipToSlot('spear','weapon');UI.begin();Game.startFight(ENEMIES.wolf,true);Game.save();");
 await send('Page.reload');await sleep(4000);await ev("document.querySelector('#btn-load').click()");await sleep(3000);
 await check('营地战斗读档恢复战场 '+w,"!!Game.S().combat && !!document.querySelector('.battle-board') && !!document.querySelector('[data-fact=attack]')");
 await shot('combat-resume-'+w+'.png');
 await ev("document.querySelector('[data-nav=equip]').click();document.querySelector('[data-nav=inv]').click();document.querySelector('[data-nav=map]').click();");
 await check('底部入口不能覆盖活动战场 '+w,"!!document.querySelector('.battle-board') && !document.querySelector('[data-eqpick]') && !Game.warehouseAccessCheck(true).ok && !Game.setFocus('gather').ok && !Game.equipToSlot('spear','weapon').ok");
 await ev("Game.S().combat.smoke=true;document.querySelector('[data-fact=flee]').click()");await sleep(3200);
 await check('逃跑后清空战斗且营地三项操作恢复 '+w,"!Game.S().combat && !document.querySelector('.battle-board') && Game.warehouseAccessCheck(true).ok && Game.setFocus('gather').ok && Game.equipToSlot('spear','weapon').ok");
 await ev("document.querySelector('[data-nav=equip]').click();document.querySelector('[data-unequip-slot=weapon]').click();");
 await check('结束战斗后装备页实际卸下 '+w,"!Game.S().equipment.weapon && !!document.querySelector('[data-equipped-slot=weapon]')");
 await ev("document.querySelector('.modal-x').click();Game.equipToSlot('spear','weapon');Game.startFight(ENEMIES.wolf,true);Game.S().combat.enemies[0].ehp=1;Game.S().combat.enemies[0].atk=0;Math.random=()=>0;document.querySelector('[data-fact=attack]').click()");await sleep(3200);
 await check('胜利后清空且存档重载不复活旧战斗 '+w,"!Game.S().combat && Game.save().ok && Game.load() && !Game.S().combat && Game.setFocus('combat').ok && Game.warehouseAccessCheck(true).ok");
 await ev("Game.startFight(ENEMIES.wolf,true);document.querySelector('.battle-board').remove();UI.render()");
 await check('界面丢失时重新渲染恢复同一战斗 '+w,"!!Game.S().combat && !!document.querySelector('.battle-board')");
 }
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{ws?.close();ch?.kill();console.log('通过 '+passed+' 项，失败 '+fail+' 项\nRESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();
