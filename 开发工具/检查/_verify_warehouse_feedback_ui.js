/* Real independent Chrome checks: challenge selection, soul workshop and boss. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-mobile-')),port=9596;
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


 for(const [w,h]of [[667,375],[844,390],[1366,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<1000});await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(4500);
  await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().capacity=999;Game.addItem('spear',1,true);Game.addItem('ironSword',1,true);Game.addItem('ironArmor',1,true);Game.equipToSlot('spear','weapon');UI.begin();document.querySelector('#modal .modal-x')?.click();document.querySelector('[data-nav="equip"]').click();`);await sleep(3500);
  await check('健康数值顶栏可见 '+w,`(()=>{const e=document.querySelector('#num-health'),r=e.getBoundingClientRect();return e.textContent==='100'&&r.top>=0&&r.right<=innerWidth&&r.bottom<60;})()`);
  await check('装备耐久与攻击真实显示 '+w,`(()=>{const e=document.querySelector('[data-equipped-slot="weapon"] .equip-dur');return e.textContent.includes('耐久')&&e.textContent.includes('攻')&&getComputedStyle(e).display!=='none';})()`);
  await check('苇编包图标存在且无缺图 '+w,`(()=>{const e=document.querySelector('.backpack-slot .item-icon');return e?.tagName==='IMG'&&e.complete&&e.naturalWidth>0&&getComputedStyle(e).display!=='none';})()`);
  await ev(`Game.S().stats.health=27;UI.render();`);
  await check('健康变化与低值警示 '+w,`document.querySelector('#num-health').textContent==='27'&&document.querySelector('#num-health').classList.contains('num-low')`);
  await shot('warehouse-feedback-equipment-'+w+'.png');
  await ev(`document.querySelector('[data-equipped-slot="weapon"] .equip-swap').click();`);
  await check('主手更换弹窗有候选与耐久 '+w,`!!document.querySelector('[data-equip="ironSword"][data-target-slot="weapon"]')&&document.querySelector('[data-equip="ironSword"]').textContent.includes('耐久')`);
  await ev(`document.querySelector('[data-equip="ironSword"]').click();`);
  await check('实际更换武器 '+w,`Game.S().equipment.weapon==='ironSword'&&!!document.querySelector('[data-equipped-slot="weapon"]')`);
  await ev(`document.querySelector('[data-equipped-slot="armor"] .equip-swap').click();document.querySelector('[data-equip="ironArmor"]').click();`);
  await check('空护甲槽实际换装 '+w,`Game.S().equipment.armor==='ironArmor'`);
  await ev(`document.querySelector('#modal .modal-x').click();document.querySelector('[data-nav="inv"]').click();document.querySelector('[data-item="wood"]').click();`);
  await check('全部存入替代存十 '+w,`!!document.querySelector('[data-ware-transfer][data-qty="all"]')&&!document.querySelector('[data-ware-transfer][data-qty="10"]')`);
  await ev(`document.querySelector('[data-ware-transfer][data-qty="all"]').click();document.querySelector('#modal .modal-x').click();document.querySelector('[data-nav="inv"]').click();document.querySelector('[data-warehouse-open]').click();document.querySelector('[data-warehouse-auto]').click();`);
  await check('自动存入候选界面可保存 '+w,`!!document.querySelector('[data-auto-item="wood"]')&&!!document.querySelector('[data-save-warehouse-auto]')`);
  await check('自动存入复选框有可见原生勾选状态 '+w,`(()=>{const e=document.querySelector('[data-auto-item="wood"]'),r=e.getBoundingClientRect();return getComputedStyle(e).appearance==='auto'&&r.width>=18&&r.height>=18;})()`);
  const tapAuto=async(selector)=>{await sleep(450); // 等待弹窗350ms防点击穿透期结束
const r=await ev(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`),x=r.x+r.width/2,y=r.y+r.height/2;assert.ok(x>0&&y>0&&x<w&&y<h);if(w<1000){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});}await sleep(300);};
  await tapAuto('[data-auto-item="wood"]');await check('实际触摸选择木头 '+w,`document.querySelector('[data-auto-item="wood"]').checked`);
  await tapAuto('[data-auto-item="wood"]');await check('再次点击取消木头 '+w,`!document.querySelector('[data-auto-item="wood"]').checked`);
  await tapAuto('[data-auto-item="wood"]');await shot('warehouse-feedback-auto-'+w+'.png');await tapAuto('[data-save-warehouse-auto]');
  await check('自动存入实际保存 '+w,`Game.warehouseAutoItems().includes('wood')`);
  await ev(`window.beforeTransfer=Game.warehouseState().inv.wood;document.querySelector('[data-warehouse-item="wood"]').click();`);
  await check('仓库轻点取一份且保持双栏 '+w,`Game.warehouseState().inv.wood===beforeTransfer-1&&document.querySelectorAll('.inventory-pane').length===2`);
  await ev(`document.querySelector('#modal .modal-x').click();Game.save();Game.load();Game.S().scene='forest';Game.addItem('wood',3,true);Game.addItem('stone',3,true);const oldRandom=Math.random;Math.random=()=>.99;try{Game.travel('camp');}finally{Math.random=oldRandom;}`);
  await check('保存读档后回营只自动存入所选木头 '+w,`Game.S().scene==='camp'&&Game.invCount('wood')===0&&Game.warehouseState().inv.wood===9&&Game.invCount('stone')>=3&&Game.warehouseAutoItems().includes('wood')`);
 }
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{try{ws?.close();ch?.kill();}catch{}console.log('通过 '+passed+' 项，失败 '+fail+' 项');console.log('RESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();
