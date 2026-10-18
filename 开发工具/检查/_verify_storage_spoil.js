/* 独立浏览器验证存储腐坏的实际列表与取出按钮。 */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-mobile-')),port=9611;
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
 const check=async(name,expr)=>{const ok=await ev(expr);if(!ok){await shot('mobile-ui-failure.png');console.error(await ev('document.querySelector("#modal")?.textContent'));}assert.ok(ok,name);passed++;console.log('OK '+name);};
 const shot=async(name)=>{const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name),Buffer.from(r.data,'base64'));};
 await send('Runtime.enable');await send('Page.enable');



 for(const [w,h] of [[667,375],[1366,768]]){
 await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<1000});await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(2500);
 await ev("Game.newGame('fisher','normal');Game.S().tut=null;Game.S().tick=100;Game.S().inv={};Game.S().warehouse={items:[{id:'fish',qty:2,expiry:99},{id:'meat',qty:3,expiry:200}]};UI.begin()");await sleep(4500);
 await ev("document.querySelector('[data-nav=inv]').click();document.querySelector('[data-warehouse-open]').click()");await sleep(300);
 await check('仓库腐物直接显示且新鲜批次保留 '+w,"!!document.querySelector('[data-warehouse-item=rot]')&&!document.querySelector('[data-warehouse-item=fish]')&&!!document.querySelector('[data-warehouse-item=meat]')");await shot('storage-spoil-'+w+'.png');
 await ev("document.querySelector('[data-warehouse-item=rot]').click()");await check('腐物无食用入口 '+w,"!document.querySelector('[data-use=rot]')&&!!document.querySelector('[data-ware-transfer=rot]')");
 await ev("document.querySelector('[data-ware-transfer=rot]').click()");await check('实际取出腐物数量无损 '+w,"Game.invCount('rot')===1&&Game.warehouseState().inv.rot===1");
 await ev("document.querySelector('#modal .modal-x').click();document.querySelector('#modal .modal-x')?.click();Game.S().buildings.cellar=0;Game.S().cellar={items:[{id:'berry',qty:2,expiry:99}]};UI.render();[...document.querySelectorAll('#hotspots .hotspot')].find(e=>e.textContent.includes('地窖')).click()");await sleep(300);
 await check('地窖过期批次显示腐物 '+w,"!!document.querySelector('[data-cellar-item=rot]')&&!document.querySelector('[data-cellar-item=berry]')");
 await ev("document.querySelector('[data-cellar-item=rot]').click();document.querySelector('[data-cellar-take=rot]').click()");await check('地窖腐物实际可取出 '+w,"Game.invCount('rot')===2&&Game.cellarState().inv.rot===1");
 }
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{ws?.close();ch?.kill();console.log('通过 '+passed+' 项，失败 '+fail+' 项\nRESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();
