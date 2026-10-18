/* Independent browser checks for divine pack shop, code, art and outdoor deposits. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-mobile-')),port=9624;
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
 const hold=async selector=>{await sleep(200);await ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest'})`);const q=await ev(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`),x=q.x+q.width/2,y=q.y+q.height/2;await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await sleep(620);await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});await sleep(250);};

 await send('Emulation.setDeviceMetricsOverride',{width:667,height:375,deviceScaleFactor:1,mobile:true});
 await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(5000);
 await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().capacity=999;Game.addItem('wood',80,true);Game.addItem('flint',60,true);UI.begin();document.querySelector('#modal .modal-x')?.click();`);await sleep(3000);
 const touch=async(type,x,y)=>send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1,radiusX:2,radiusY:2,force:1}]});
 const dragHold=async selector=>{const p=await ev(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`);await touch('touchStart',p.x+p.width/2,p.y+p.height/2);await sleep(650);assert.ok(await ev(`!!document.querySelector('#batchn-n')`),'触摸长按打开数量');const r=await ev(`document.querySelector('#batchn-n').getBoundingClientRect().toJSON()`);await touch('touchMove',r.x+r.width*.65,r.y+r.height/2);await sleep(120);await touch('touchEnd',0,0);await sleep(200);};
 await tap('[data-nav="inv"]');await tap('[data-item="wood"]');
 await check('轻点物品打开详情，移除丢弃和返回按钮',`!document.querySelector('[data-discard]')&&!document.querySelector('#modal-back')&&!!document.querySelector('.item-detail-modal .modal-x')&&Game.invCount('wood')>80`);
 await dragHold('[data-ware-transfer="wood"][data-qty="1"]');
 await check('手机同一手指长按存入后拖动选量',`+document.querySelector('#batchn-n').value>20&&Game.timeFrozen()`);const qty=await ev(`+document.querySelector('#batchn-n').value`);await shot('storage-touch-deposit.png');await tap('#batchn-do');
 await check('存入实际数量一致',`Game.warehouseState().inv.wood===${qty}`);
 await tap('#modal .modal-x');await tap('[data-nav="inv"]');await tap('[data-warehouse-open]');await tap('[data-warehouse-item="wood"]');await dragHold('[data-ware-transfer="wood"][data-qty="1"]');
 const outQty=await ev(`+document.querySelector('#batchn-n').value`);await check('手机同一手指长按取出后拖动选量',`+document.querySelector('#batchn-n').value>10`);await tap('#batchn-do');await check('取出实际数量一致',`Game.warehouseState().inv.wood===${qty-outQty}`);
 await tap('#modal .modal-x');await tap('[data-nav="craft"]');await sleep(600);
 await check('制作行成品贴图加载并排在文字左侧',`(()=>{const r=document.querySelector('[data-recipe="r_axestone"]').closest('.recipe'),i=r.querySelector('.recipe-artwork img'),t=r.querySelector('.recipe-info');return i?.complete&&i.naturalWidth>0&&i.getBoundingClientRect().right<=t.getBoundingClientRect().left;})()`);await shot('craft-output-mobile.png');
 await hold('[data-recipe="r_axestone"]');await tap('[data-cset="half"]');await tap('#batch-do');
 await check('批量制作显示动作动画',`document.querySelector('#busy').classList.contains('open')`);await sleep(3500);await check('动画结束批量产物实际入包',`Game.invCount('axeStone')>1`);
 await tap('#modal .modal-x');
 await check('野猪黑白和彩色贴图均能加载',`(async()=>{for(const colored of [false,true]){const i=new Image();i.src=CombatStage.cutout('assets/img/boar.png',colored);await new Promise(r=>{i.onload=r;i.onerror=r});if(!i.naturalWidth)return false;}return true;})()`);
 await ev(`Game.S().relics=['satchel'];Game.S().relicEquip=['satchel'];Game.S().relicSlots=1;UI.render();`);await tap('[data-nav="equip"]');await hold('[data-satchel-settings]');await tap('[data-satchel-only]');await check('仅指定开关保存设置',`Game.S().satchelOnlySpecified===true`);await shot('satchel-safe-settings-mobile.png');

 await tap('#modal .modal-x');await ev(`Game.addItem('bpOmelette',1,true);UI.render();`);await tap('[data-nav="inv"]');await tap('[data-item="bpOmelette"]');await tap('[data-learn="bpOmelette"]');await check('手机图纸详情学习按钮实际生效',`Game.S().learnedBlueprints.bpOmelette===true&&document.querySelector('[data-learn="bpOmelette"]').disabled`);
 await tap('.item-detail-modal .modal-x');await hold('[data-item="bpOmelette"]');await tap('#batchn-do');await check('长按丢弃后食谱仍然学会',`Game.invCount('bpOmelette')===0&&Game.knowsBlueprint('bpOmelette')`);
 await tap('#modal .modal-x');await ev(`Game.startFight(ENEMIES.boar,true);`);await sleep(1000);await check('实际野猪战斗显示贴图而不是野字占位',`(()=>{const i=document.querySelector('.enemy-img');return i?.complete&&i.naturalWidth>0&&!i.hidden&&!i.parentElement.classList.contains('missing-art');})()`);await shot('boar-art-restored-mobile.png');
 assert.deepEqual(errors,[]);console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{try{ws?.close();ch?.kill();}catch{}console.log('通过 '+passed+' 项，失败 '+fail+' 项');console.log('RESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();
