/* Real independent Chrome checks: challenge selection, soul workshop and boss. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-mobile-')),port=9663;
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
 await send('Runtime.enable');await send('Page.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('guyuyizhang_logw','tiny');localStorage.setItem('guyuyizhang_language','zh');"});


 for(const [w,h] of [[667,375],[1366,768]]) {
 await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<1000});await send('Emulation.setTouchEmulationEnabled',{enabled:w<1000,maxTouchPoints:1});
 await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(2200);
 await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.metaState().batchTipSeen=1;Game.S().capacity=999;Game.S().inv={};Game.S().foodBatches={};Game.S().foodExp={};Game.S().tick=3000;Game.S().relics=['satchel'];Game.S().relicSlots=1;Game.S().relicEquip=['satchel'];Game.S().buildings.cellar=0;Game.S().cellar={items:[{id:'roastMeat',qty:2,expiry:6000}]};Game.addItem('wheat',8,true);UI.begin();`);await sleep(2900);await ev(`document.querySelector('#modal .modal-x')?.click();document.querySelector('[data-nav="equip"]').click();`);await sleep(450);
 const hold=async()=>{await ev(`document.querySelector('[data-eqpick][data-satchel-settings]').scrollIntoView({block:'center'})`);await sleep(200);const r=await ev(`document.querySelector('[data-eqpick][data-satchel-settings]').getBoundingClientRect().toJSON()`),x=r.x+r.width/2,y=r.y+r.height/2;if(w<1000){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await sleep(650);await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await sleep(650);await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});}await sleep(500);};
 const tap=async selector=>{await ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest'})`);await sleep(450);const r=await ev(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`),x=r.x+r.width/2,y=r.y+r.height/2;assert.ok(x>0&&x<w&&y>0&&y<h,selector+' visible');if(w<1000){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});}await sleep(450);};
 await hold();await check('长按入口仅三个选择按钮 '+w,`document.querySelectorAll('.satchel-menu button').length===3&&!document.querySelector('.satchel-menu input,.satchel-menu select,[data-satchel="clear"]')`);await shot('satchel-menu-'+w+'.png');
 for(const [kind,ids]of [['food',['wheat','bread','roastMeat']],['drink',['water','honeyWater','vegSoup']],['blocked',['wheat','bread','honey']]]){
   await tap('[data-satchel="'+kind+'"]');
   await check('图标选择页简洁且有多列 '+kind+' '+w,`(()=>{const cards=[...document.querySelectorAll('.satchel-choice')];return cards.length>3&&cards.every(e=>e.querySelector('.item-icon'))&&cards[0].getBoundingClientRect().y===cards[1].getBoundingClientRect().y&&!document.querySelector('.satchel-picker .hint,.satchel-picker input,.satchel-picker select');})()`);
   for(const id of ids)await tap('[data-satchelpick="'+kind+':'+id+'"]');
   await check('三项选满并禁止第四项 '+kind+' '+w,`Game.satchelSelections('${kind}').length===3&&document.querySelectorAll('.satchel-choice.is-selected').length===3&&[...document.querySelectorAll('.satchel-choice:not(.is-selected)')].every(e=>e.disabled)`);
   await tap('[data-satchelpick="'+kind+':'+ids[0]+'"]');
   await check('点选中项可取消并恢复候选 '+kind+' '+w,`Game.satchelSelections('${kind}').length===2&&[...document.querySelectorAll('.satchel-choice')].every(e=>!e.disabled)`);
   await tap('[data-satchelpick="'+kind+':'+ids[0]+'"]');
   await ev(`document.querySelector('.satchel-choices').scrollTop=0;document.querySelector('#modal .modal-content').scrollTop=0`);await sleep(250);await check('物品图片实际解码 '+kind+' '+w,`[...document.querySelectorAll('.satchel-choice img')].every(e=>e.complete&&e.naturalWidth>0)`);await shot('satchel-picker-'+kind+'-'+w+'.png');
   await tap('#modal-back');
 }
 await check('三组选项相互独立 '+w,`['food','drink','blocked'].every(k=>Game.satchelSelections(k).length===3)`);
 await ev(`Game.save();Game.load();document.querySelector('#modal .modal-x').click();document.querySelector('[data-nav="equip"]').click();`);await sleep(400);await hold();await tap('[data-satchel="blocked"]');
 await check('保存重载保留勾选 '+w,`document.querySelectorAll('.satchel-choice.is-selected').length===3&&document.querySelector('[data-satchelpick="blocked:wheat"]').getAttribute('aria-pressed')==='true'`);
 await check('手机选择页无横向溢出 '+w,`document.querySelector('#modal .modal-content').scrollWidth<=document.querySelector('#modal .modal-content').clientWidth+1`);
 await ev(`Locale.set('en');`);await sleep(600);await check('选择标题英文正常 '+w,`!/[\u4e00-\u9fff]/.test(document.querySelector('.satchel-picker .modal-title').textContent)`);
 await ev(`Locale.set('zh');document.querySelector('#modal .modal-x').click();Game.S().furniture.fr2=true;Game.S().inv={stonebrick:12,ironpart:4};Game.S().warehouse={items:[]};Game.S().learnedBlueprints={};[...document.querySelectorAll('#hotspots .hotspot')].find(b=>b.textContent.includes('营地建造')).click();`);await sleep(500);
 await ev(`document.querySelector('[data-fid="fr3"]').scrollIntoView({block:'center'})`);await check('高炉材料齐全无图纸也可建造 '+w,`!document.querySelector('[data-fid="fr3"]').classList.contains('lockedb')&&Game.canBuildFurniture('fr3').ok`);await shot('oct16-furnace-'+w+'.png');
 await ev(`document.querySelector('#modal .modal-x').click();Game.S().skill.combat=3;Game.S().tree.combat.f_swift=1;document.querySelector('[data-nav="equip"]').click();document.querySelector('[data-equiptab="skill"]').click();document.querySelector('[data-skilltree="combat"]').click();`);await sleep(500);
 await check('技能升级前同时显示当前与升级后效果 '+w,`(()=>{const n=[...document.querySelectorAll('.st-node')].find(e=>e.querySelector('.st-head b')?.textContent.includes('刀刀暴击'));return n.querySelector('.st-current').textContent.includes('20')&&n.querySelector('.st-preview').textContent.includes('30');})()`);
 await ev(`[...document.querySelectorAll('.st-node')].find(e=>e.querySelector('.st-head b')?.textContent.includes('刀刀暴击')).scrollIntoView({block:'center'})`);await shot('oct16-skill-preview-'+w+'.png');

 }
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{ws?.close();ch?.kill();console.log('通过 '+passed+' 项，失败 '+fail+' 项\nRESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();

