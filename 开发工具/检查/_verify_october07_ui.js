/* Independent browser checks for divine pack shop, code, art and outdoor deposits. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-mobile-')),port=9601;
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



 const ready=async()=>{for(let i=0;i<80;i++){if(await ev(`(()=>{const e=document.querySelector('#scene-img');return e?.complete&&e.naturalWidth>0&&!document.querySelector('#loading')?.classList.contains('show');})()`))return;await sleep(100);}throw Error('场景图未就绪');};


 const tap=async selector=>{await sleep(260);await ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest'})`);const q=await ev(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`),x=q.x+q.width/2,y=q.y+q.height/2;await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});await sleep(260);};
 const hold=async selector=>{await sleep(200);const q=await ev(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`),x=q.x+q.width/2,y=q.y+q.height/2;await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await sleep(620);await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});await sleep(250);};
 for(const [w,h]of (process.env.GUYU_UI_QUICK?[[667,375]]:[[667,375],[844,390],[1366,768]])){
  await ev(`try{localStorage.clear()}catch{}`);await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<1000});await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(4500);
  await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().relics=['satchel'];Game.S().relicEquip=['satchel'];Game.S().relicSlots=1;Game.addItem('berry',2,true);Game.addItem('water',2,true);UI.begin();document.querySelector('#modal .modal-x')?.click();`);await sleep(3000);
  await tap('[data-nav="equip"]');await hold('[data-satchel-settings]');
  await check('长按已装备食之包打开独立设置 '+w,`document.querySelector('.modal-title').textContent==='食之包'&&!!document.querySelector('[data-satchel="food"]')`);
  await tap('[data-satchel="food"]');await tap('#modal-back');await check('食物选择取消返回独立设置 '+w,`document.querySelector('.modal-title').textContent==='食之包'`);await tap('[data-satchel="food"]');await tap('[data-satchelpick="food:berry"]');
  await check('选择食物后回设置并保存偏好 '+w,`Game.satchelPref().food==='berry'&&document.querySelector('.modal-title').textContent==='食之包'`);
  await shot('october07-satchel-'+w+'.png');await tap('#modal .modal-x');await tap('[data-nav="equip"]');await tap('[data-eqpick="relic"]');
  await check('更换神物页没有吃喝设置行 '+w,`!document.querySelector('.satchel-row')&&!document.querySelector('[data-satchel="food"]')&&!!document.querySelector('[data-equiprelic="satchel"]')`);
  await hold('[data-equiprelic="satchel"]');await check('更换页长按食之包也可进入设置 '+w,`!!document.querySelector('[data-satchel="drink"]')`);await tap('#modal .modal-x');
  await ev(`Game.S().inv={reedPack:1,wood:40};Game.S().tick=100;Game.addItem('fish',3,true);Game.S().foodBatches.fish=[{qty:1,exp:160},{qty:2,exp:220}];Game.S().foodExp.fish=160;Game.S().warehouse={items:[]};UI.render();`);
  await tap('[data-nav="inv"]');await tap('[data-warehouse-open]');await tap('[data-warehouse-auto]');await tap('[data-auto-item="wood"]');await tap('[data-store-now]');
  await check('实际自动存入指定材料，保留已装备背包与食物 '+w,`Game.invCount('wood')===0&&Game.invCount('fish')===3&&Game.invCount('reedPack')===1&&!Game.warehouseState().inv.fish&&Game.warehouseState().inv.wood===40`);
  await ev("if(!Game.transferWarehouse('fish',3,true).ok)throw Error('手动存鱼失败');");await tap('[data-bag-open]');await tap('[data-warehouse-open]');
  await check('仓库保鲜批次保持原到期值 '+w,`Game.S().warehouse.items.some(x=>x.id==='fish'&&x.qty===1&&x.expiry===160)&&Game.S().warehouse.items.filter(x=>x.id==='fish'&&x.expiry===220).reduce((n,x)=>n+x.qty,0)===2`);await shot('october07-freshness-'+w+'.png');
  await hold('[data-warehouse-item="fish"]');
  await check('长按取出打开1到库存数量条 '+w,`document.querySelector('#batchn-n')?.max==='3'&&document.querySelector('#batchn-n')?.min==='1'`);
  await ev(`document.querySelector('#batchn-n').value=2;document.querySelector('#batchn-n').dispatchEvent(new Event('input'));`);await shot('october07-withdraw-'+w+'.png');await tap('#batchn-do');
  await check('实际自选取2份，数量与保鲜批次不重置 '+w,`Game.invCount('fish')===2&&Game.warehouseState().inv.fish===1&&Game.S().foodBatches.fish.some(x=>x.qty===1&&x.exp===160)&&Game.S().foodBatches.fish.some(x=>x.qty===1&&x.exp===220)`);
  await tap('#modal .modal-x');await ev(`Game.S().scene='forest';Game.S().backpack=null;Game.S().inv={ironSword:15};Math.random=()=>.99;Game.doPoint(SCENES.find(x=>x.id==='forest').points.find(x=>x.id==='forest_berry'));UI.render();`);await sleep(600);await ev(`document.querySelector('#modal .modal-x')?.click();`);await tap('[data-nav="inv"]');
  await check('满包采集后背包直接收入并显示超载 '+w,`Game.invCount('berry')>0&&!!document.querySelector('.inventory-overload')&&!document.querySelector('[data-loot-open]')`);await shot('october07-pending-'+w+'.png');
 }
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{try{ws?.close();ch?.kill();}catch{}console.log('通过 '+passed+' 项，失败 '+fail+' 项');console.log('RESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();
