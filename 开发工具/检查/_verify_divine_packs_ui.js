/* Independent browser checks for divine pack shop, code, art and outdoor deposits. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-mobile-')),port=9599;
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
 for(const [w,h]of [[667,375],[844,390],[1366,768]]){
  await ev(`try{localStorage.clear()}catch{}`);await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<1000});await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(4500);
  await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.metaState().adWallet={test:{coins:30}};UI.begin();document.querySelector('#modal .modal-x')?.click();`);await sleep(3200);
  await tap('[data-nav="save"]');await tap('[data-savemenu="adshop"]');
  await check('神之包商品15币独立彩图，超级大包不出售 '+w,`(()=>{const e=document.querySelector('[data-adbuy="divinePack"]'),i=e?.querySelector('img');return e?.textContent.includes('15')&&i?.complete&&i.naturalWidth>0&&i.src.includes('items-accent/divinePack.png')&&!document.querySelector('[data-adbuy="divineSuperPack"]');})()`);await check('新增商品后售物柜仍为三排四列 '+w,`(()=>{const e=[...document.querySelectorAll('.shop-cabinet>.cabinet-cell')],ys=new Set(e.map(x=>Math.round(x.getBoundingClientRect().top))),xs=new Set(e.map(x=>Math.round(x.getBoundingClientRect().left)));return e.length===12&&ys.size===3&&xs.size===4;})()`);await shot('divine-pack-shop-'+w+'.png');
  await tap('[data-adbuy="divinePack"]');await check('实际购买扣15币且送邮箱 '+w,`Game.adCoinBalance()===15&&Game.mailboxList().some(m=>m.item==='divinePack')`);
  await tap('#modal .modal-x');await tap('[data-nav="save"]');await tap('[data-savemenu="mail"]');let idx=await ev(`Game.mailboxList().find(m=>m.item==='divinePack').i`);await tap('[data-claimmail="'+idx+'"]');
  await tap('[data-mailtab="code"]');await ev(`document.querySelector('#redeem-code').value='xiexielaoban'`);await tap('#redeem-do');idx=await ev(`Game.mailboxList().find(m=>m.item==='divineSuperPack').i`);await tap('[data-claimmail="'+idx+'"]');
  await check('实际兑换领取超级大包且不能重复兑 '+w,`Game.invCount('divineSuperPack')===1&&!Game.redeemCode('xiexielaoban').ok`);
  await tap('#modal .modal-x');await tap('[data-nav="equip"]');await tap('[data-eqpick="pack"]');
  await check('选择页两种包彩色图及容量/外出存仓说明 '+w,`['divinePack','divineSuperPack'].every(id=>{const e=document.querySelector('[data-pack="'+id+'"]'),i=e?.querySelector('img');return i?.complete&&i.naturalWidth>0&&e.textContent.includes('外出存仓')&&e.textContent.includes(id==='divinePack'?'15':'100');})`);await shot('divine-pack-select-'+w+'.png');
  await tap('[data-pack="divinePack"]');await check('实际装备神之包容量30 '+w,`Game.S().backpack==='divinePack'&&Game.capacity()===30`);
  await tap('#modal .modal-x');await ev(`Game.S().scene='forest';Game.S().inv.wood=12;UI.render();`);await tap('[data-nav="inv"]');await tap('[data-item="wood"]');
  await check('外出物品详情有存入与全部存入 '+w,`!!document.querySelector('[data-ware-transfer="wood"][data-dir="in"][data-qty="all"]')&&!Game.warehouseAccess()`);await shot('divine-pack-deposit-'+w+'.png');
  await tap('[data-ware-transfer="wood"][data-dir="in"][data-qty="all"]');await check('外出真实点击全部存入成功 '+w,`Game.invCount('wood')===0&&Game.warehouseState().inv.wood===12&&!Game.transferWarehouse('wood',1,false).ok`);
  await tap('#modal .modal-x');await tap('[data-nav="equip"]');await tap('[data-eqpick="pack"]');await tap('[data-pack="divineSuperPack"]');
  await check('实际换超级大包容量115，关闭皮肤仍显示彩图 '+w,`Game.S().backpack==='divineSuperPack'&&Game.capacity()===115&&document.querySelector('.backpack-slot img').src.includes('items-accent/divineSuperPack.png')`);
  await tap('#modal .modal-x');await ev(`Game.S().scene='camp';Game.addItem('ironSword',4,true);Game.S().toolDurs.ironSword=[11,22,33,44];Game.S().toolMaxDurs.ironSword=[110,120,130,140];Game.equipToSlot('ironSword','weapon',2);UI.render();`);
  await tap('[data-nav="inv"]');await tap('[data-item="ironSword"]');
  await check('装备同款多件时显示存入与全部存入 '+w,`Game.warehouseDepositCount('ironSword')===3&&!!document.querySelector('[data-ware-transfer="ironSword"][data-qty="all"]')`);
  await shot('warehouse-equipped-spares-'+w+'.png');
  await tap('[data-ware-transfer="ironSword"][data-qty="1"]');
  await check('真实点击存1件保留原装备耐久与索引 '+w,`Game.invCount('ironSword')===3&&Game.S().equipIdx.weapon===1&&Game.durOf('ironSword',1)===33&&Game.warehouseState().inv.ironSword===1`);
  await tap('[data-ware-transfer="ironSword"][data-qty="all"]');
  await check('真实点击全部存入仅存备用件 '+w,`Game.invCount('ironSword')===1&&Game.warehouseState().inv.ironSword===3&&Game.S().equipment.weapon==='ironSword'&&Game.S().equipIdx.weapon===0&&Game.durOf('ironSword',0)===33&&Game.durMaxOf('ironSword',0)===130&&!document.querySelector('[data-ware-transfer="ironSword"]')`);
  await tap('#modal-back');await tap('#modal .modal-x');await ev(`Game.addItem('axeIron',3,true);Game.S().toolDurs.axeIron=[35,7,50];Game.equipTool('axeIron');UI.render();`);await tap('[data-nav="inv"]');await tap('[data-item="axeIron"]');await tap('[data-ware-transfer="axeIron"][data-qty="all"]');
  await check('真实点击工具全部存入保留正在使用的一件 '+w,`Game.invCount('axeIron')===1&&Game.durOf('axeIron',0)===7&&Game.S().toolkit.includes('axeIron')&&Game.warehouseState().inv.axeIron===2`);
  await tap('#modal-back');await tap('#modal .modal-x');await tap('[data-nav="equip"]');
  await check('存备用后装备页仍显示武器和工具实际耐久 '+w,`document.querySelector('[data-equipped-slot="weapon"]').textContent.includes('33/130')&&[...document.querySelectorAll('.loadout-slot[data-eqpick="tool"]')].some(e=>e.textContent.includes('铁斧')&&e.textContent.includes('7/50'))`);
  await shot('warehouse-equipped-kept-'+w+'.png');
  await ev(`Game.save();Game.load();`);
  await check('存备用后保存重载不丢装备或耐久 '+w,`Game.S().equipment.weapon==='ironSword'&&Game.S().equipIdx.weapon===0&&Game.durOf('ironSword',0)===33&&Game.S().toolkit.includes('axeIron')&&Game.durOf('axeIron',0)===7`);

 }
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{try{ws?.close();ch?.kill();}catch{}console.log('通过 '+passed+' 项，失败 '+fail+' 项');console.log('RESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();
