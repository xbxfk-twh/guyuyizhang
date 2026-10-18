/* Real independent Chrome checks: challenge selection, soul workshop and boss. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-mobile-')),port=9607;
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

 for(const [w,h]of [[568,320],[667,375],[1366,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<1000});await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(4500);
  await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().capacity=999;Game.S().inv={};Game.S().warehouse={items:[]};for(const id of ['berry','wood','water'])Game.addItem(id,id==='wood'?20:2,true);UI.begin();document.querySelector('#modal .modal-x')?.click();`);await sleep(3000);
  const tap=async selector=>{await sleep(450);await ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:"nearest"})`);await sleep(150);const r=await ev(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`),x=r.x+r.width/2,y=r.y+r.height/2;assert.ok(x>0&&y>0&&x<w&&y<h,selector+'在视口内');if(w<1000){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});}await sleep(450);};
  await tap('[data-nav="inv"]');
  await check('双页签容量独立且手机完整显示 '+w,`(()=>{const a=[...document.querySelectorAll('.inventory-view-tabs button')];return a.length===2&&a.every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;});})()`);
  await tap('[data-item="berry"]');await check('真实触摸食物后详情不被补发点击关闭 '+w,`document.querySelector('#modal').classList.contains('open')&&!!document.querySelector('[data-use="berry"]')`);
  await ev(`Game.S().stats.hunger=30;window.eatTick=Game.S().tick;`);await tap('[data-use="berry"]');await check('食用实际扣物品和时间，剩余继续显示 '+w,`Game.invCount('berry')===1&&Game.S().stats.hunger>30&&Game.S().tick===eatTick+5&&!!document.querySelector('[data-use="berry"]')`);
  await tap('[data-use="berry"]');await check('吃完返回背包仍显示页签 '+w,`Game.invCount('berry')===0&&!!document.querySelector('.inventory-view-tabs')`);
  await tap('[data-warehouse-open]');await check('回营自动存入名称不截断 '+w,`(()=>{const b=document.querySelector('[data-warehouse-auto]');return getComputedStyle(b).whiteSpace==='normal'&&b.scrollWidth<=b.clientWidth;})()`);await tap('[data-warehouse-auto]');await tap('[data-auto-item="wood"]');await tap('[data-save-warehouse-auto]:not([data-store-now])');
  await check('保存回营规则不立即搬运 '+w,`Game.invCount('wood')===20&&!Game.warehouseState().inv.wood&&Game.warehouseAutoItems().includes('wood')`);
  await tap('[data-warehouse-auto]');await tap('[data-store-now]');await check('保存并立即存入实际搬运 '+w,`Game.invCount('wood')===0&&Game.warehouseState().inv.wood===20`);
  await ev(`Game.S().warehouse.items.push({id:'honey',qty:2,expiry:99999},{id:'herbPaste',qty:2});Game.S().stats.hunger=30;Game.S().stats.hp=30;document.querySelector('[data-bag-open]').click();`);await tap('[data-warehouse-open]');
  await ev(`Game.consume('honey',true);`);await check('仓库直接吃食物不占背包且只扣仓库 '+w,`Game.invCount('honey')===0&&Game.warehouseState().inv.honey===1&&Game.S().stats.hunger>30`);
  await ev(`Game.useMed('herbPaste',true);`);await check('仓库直接用药 '+w,`Game.warehouseState().inv.herbPaste===1&&Game.S().stats.hp>30&&Game.invCount('herbPaste')===0`);
  await tap('.modal-x');await shot('camp-inventory-tabs-'+w+'.png');
  await ev(`Game.S().laochao.arrived=true;Game.S().minute=600;Game.S().warehouse.items.push({id:'honey',qty:4,expiry:99999});UI.render();`);
  await ev("[...document.querySelectorAll('.action-btn')].find(e=>e.textContent.includes('与老潮交易')).click()");await tap('[data-ttab="sell"]');await tap('[data-sell="honey"]');await check('老潮实际出售仓库物品 '+w,`Game.warehouseState().inv.honey===4&&Game.invCount('beibi')>0`);
  await ev(`document.querySelector('#modal .modal-x').click();Game.S().buildings.cellar=0;Game.S().cellar={items:[{id:'honey',qty:2,expiry:99999}]};Game.S().stats.hunger=30;UI.render();`);
  await ev(`[...document.querySelectorAll('#hotspots .hotspot')].find(e=>e.textContent.includes('地窖')).click();`);await tap('[data-cellar-item="honey"]');await tap('[data-use="honey"]');await check('地窖直接食用只扣地窖 '+w,`Game.cellarState().inv.honey===1&&Game.warehouseState().inv.honey===4&&Game.S().stats.hunger>30`);
  await ev(`document.querySelector('#modal .modal-x').click();document.querySelector('#modal .modal-x').click();Game.S().scene='farm';Game.S().buildings.farm=0;Game.S().furniture.pen=true;Game.S().furniture.coop=true;Game.S().livestock={pen:[{age:0,life:30}],coop:[{type:'hen',age:0,life:30}],autoFeed:true};Game.S().warehouse.items.push({id:'hay',qty:2},{id:'wheat',qty:2,expiry:99999});UI.render();`);
  await ev(`[...document.querySelectorAll('#hotspots .hotspot')].find(e=>e.textContent.includes('农场管理')).click();`);await tap('[data-live="pen"]');await check('羊圈管理显示岛仓饲料且自动喂养开启 '+w,`document.querySelector('.modal-content').textContent.includes('背包0＋岛仓2')&&document.querySelector('[data-livefeed]').textContent.includes('已开启')`);
  await tap('[data-livefeed]');await check('实际点击切换喂养状态 '+w,`!Game.liveInfo('pen').autoFeed&&document.querySelector('[data-livefeed]').textContent.includes('已关闭')`);

 }
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{ws?.close();ch?.kill();console.log('通过 '+passed+' 项，失败 '+fail+' 项\nRESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();


