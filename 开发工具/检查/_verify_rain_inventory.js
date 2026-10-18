/* Rain-only hotspots and inventory touch interactions in independent Chrome profiles. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-mobile-')),port=9628;
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
 const check=async(name,expr)=>{const ok=await ev(expr);if(!ok){await shot('mobile-ui-failure.png');console.error(await ev(`JSON.stringify([...document.querySelectorAll('[data-separate], .room-sprite')].map(e=>({name:e.getAttribute('aria-label')||e.title,rect:e.getBoundingClientRect().toJSON(),hit:document.elementFromPoint(e.getBoundingClientRect().x+e.offsetWidth/2,e.getBoundingClientRect().y+e.offsetHeight/2)?.outerHTML.slice(0,180)})))`));}assert.ok(ok,name);passed++;console.log('OK '+name);};
 const shot=async(name)=>{const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name),Buffer.from(r.data,'base64'));};
 await send('Runtime.enable');await send('Page.enable');



 const ready=async()=>{for(let i=0;i<80;i++){if(await ev(`(()=>{const e=document.querySelector('#scene-img');return e?.complete&&e.naturalWidth>0&&!document.querySelector('#loading');})()`))return;await sleep(100);}throw Error('场景图未就绪');};


 const tap=async selector=>{await sleep(260);await ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest'})`);const q=await ev(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`),x=q.x+q.width/2,y=q.y+q.height/2;await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});await sleep(260);};
 const hold=async selector=>{await sleep(200);const q=await ev(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`),x=q.x+q.width/2,y=q.y+q.height/2;await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await sleep(620);await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});await sleep(250);};


 await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 const touchTap=async selector=>{await ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest'})`);const r=await ev(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2,id:1}]});await sleep(80);await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(350);};
 const touchHold=async selector=>{await ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest'})`);const r=await ev(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2,id:1}]});await sleep(630);await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(200);};
 for(const [w,h]of [[568,320],[667,375],[1366,768]]){
 await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<1000});await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(3000);
 await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().capacity=999;Game.S().tick=100;Game.addItem('honey',7,true);Game.S().foodBatches.honey=[{qty:2,exp:200},{qty:3,exp:300},{qty:2,exp:400}];Game.S().foodExp.honey=200;Game.S().warehouse={items:[{id:'wood',qty:10},{id:'honey',qty:3,expiry:800}]};UI.begin();document.querySelector('#modal .modal-x')?.click();`);await sleep(1500);
 await ready();await tap('[data-nav="inv"]');await tap('[data-item="honey"]');await sleep(300);
 await check('详情仅右上角叉号，没有返回/丢弃按钮 '+w,`!!document.querySelector('.item-detail-modal .modal-x')&&!document.querySelector('[data-discard]')&&!document.querySelector('#modal-back')`);
 await check('同类食物按批次重复图标显示数量与保鲜 '+w,`document.querySelectorAll('.freshness-batch').length===3&&!!document.querySelector('.freshness-batch[data-qty="3"][data-minutes="200"]')&&[...document.querySelectorAll('.freshness-batch img')].every(x=>x.complete&&x.naturalWidth>0)`);await check('食用在操作区最右侧 '+w,`(()=>{const r=document.querySelector('[data-use]').getBoundingClientRect();return [...document.querySelectorAll('[data-ware-transfer]')].every(x=>x.getBoundingClientRect().right<=r.left);})()`);await shot('rain-food-batches-'+w+'.png');
 await tap('.item-detail-modal .modal-x');await touchHold('[data-item="honey"]');await check('背包图标长按打开批量丢弃 '+w,`document.querySelector('.modal-title').textContent.includes('批量丢弃')&&document.querySelector('#batchn-n').max==='7'`);await ev(`document.querySelector('#batchn-n').value=2;document.querySelector('#batchn-n').dispatchEvent(new Event('input'));`);await tap('#batchn-do');await check('丢弃实际2份且返回背包 '+w,`Game.invCount('honey')===5&&!!document.querySelector('[data-item="honey"]')`);
 await tap('[data-warehouse-open]');await check('自动存入固定在手机侧栏可见可点 '+w,`(()=>{const e=document.querySelector('[data-warehouse-auto]'),r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.width>0&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})()`);
 await ev(`Game.S().inv.ironSword=1;Game.S().inv.axeIron=1;Game.S().inv.bpBlack=1;Game.S().inv.reedPack=1;`);await shot('warehouse-auto-footer-'+w+'.png');await touchTap('[data-warehouse-auto]');await check('触摸打开自动存入有实际反馈 '+w,`document.querySelector('.modal-title').textContent==='自动存入'&&!!document.querySelector('[data-save-warehouse-auto]')`);await check('自动存入无装备武器工具图纸选项 '+w,`!['ironSword','axeIron','bpBlack','reedPack'].some(id=>document.querySelector('[data-auto-item="'+id+'"]'))`);await shot('warehouse-auto-filter-'+w+'.png');await tap('[data-auto-item="wood"]');await tap('[data-save-warehouse-auto]');await check('自动存入设置真实保存 '+w,`Game.warehouseAutoItems().includes('wood')`);
 await touchHold('[data-warehouse-item="wood"]');await ev(`document.querySelector('#batchn-n').value=3;document.querySelector('#batchn-n').dispatchEvent(new Event('input'));`);await tap('#batchn-do');await check('仓库图标长按实际丢弃而不先取出 '+w,`Game.warehouseState().inv.wood===7&&Game.invCount('wood')===6`);
 await tap('#modal .modal-x');
 for(const scene of ['forest','river','bamboo','grassland']){await ev(`Game.S().scene='${scene}';Game.S().weather='rain';UI.render();`);await check('雨天'+scene+'蘑菇热点可见 '+w,`[...document.querySelectorAll('#hotspots .hot-label')].some(x=>x.textContent==='蘑菇')`);await ev(`Game.S().weather='sun';UI.render();`);await check('晴天'+scene+'蘑菇热点直接消失 '+w,`![...document.querySelectorAll('#hotspots .hot-label')].some(x=>x.textContent==='蘑菇')`);}
 }
 assert.deepEqual(errors,[]);console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{try{ws?.close();ch?.kill();}catch{}console.log('通过 '+passed+' 项，失败 '+fail+' 项');console.log('RESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();
