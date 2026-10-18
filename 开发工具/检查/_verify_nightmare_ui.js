/* Real independent Chrome checks: challenge selection, soul workshop and boss. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-nightmare-')),port=9588;
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
 const check=async(name,expr)=>{const ok=await ev(expr);if(!ok){await shot('nightmare-ui-failure.png');console.error(await ev(`JSON.stringify([...document.querySelectorAll('[data-separate], .room-sprite')].map(e=>({name:e.getAttribute('aria-label')||e.title,rect:e.getBoundingClientRect().toJSON(),hit:document.elementFromPoint(e.getBoundingClientRect().x+e.offsetWidth/2,e.getBoundingClientRect().y+e.offsetHeight/2)?.outerHTML.slice(0,180)})))`));}assert.ok(ok,name);passed++;console.log('OK '+name);};
 const shot=async(name)=>{const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name),Buffer.from(r.data,'base64'));};
 await send('Runtime.enable');await send('Page.enable');
 for(const [w,h]of [[667,375],[844,390],[1366,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<1000});
  await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(1300);
  await ev(`Game.newGame('fisher','normal');Game.S().tut=null;UI.begin();document.querySelector('#modal .modal-x')?.click();Game.metaState().challengeUnlocked=false;Game.S().flags={};Game.save();UI.showTitle();document.querySelector('#btn-new').click();`);await sleep(200);
  // Journey picker may offer backups; choose new character through its existing button.
  await ev(`document.querySelector('[data-slot="0"]')?.click();document.querySelector('[data-id="fisher"]')?.click();`);await sleep(150);
  await check('两难度锁定 '+w,`(()=>{const a=document.querySelector('.difficulty-legend'),b=document.querySelector('.difficulty-nightmare');return a?.disabled&&b?.disabled;})()`);
  await shot('nightmare-select-'+w+'.png');
  await ev(`Game.metaState().challengeUnlocked=true;document.querySelector('#sel-back').click();document.querySelector('[data-id="fisher"]').click();document.querySelector('[data-id="nightmare"]').click();`);await sleep(2500);
  await check('已解锁难度按钮实际开始噩梦 '+w,`Game.S().difficulty==='nightmare'&&document.body.classList.contains('nightmare-mode')`);
  await ev(`Game.metaState().challengeUnlocked=true;Game.newGame('fisher','nightmare');Game.S().tut=null;Game.S().capacity=999;Game.S().furniture.soulSeparator=true;Game.addItem('nightmareSoul',100,true);UI.begin();document.querySelector('#modal .modal-x')?.click();[...document.querySelectorAll('.hotspot')].find(e=>e.textContent.includes('进屋'))?.click();`);await sleep(2500);
  await check('房内解魂器素材与热点 '+w,`(()=>{const e=document.querySelector('[data-roomact="separator"]'),img=e?.querySelector('img');return e&&img?.complete&&img.naturalWidth>0;})()`);
  await ev(`Game.S().buildings.house=3;for(const f of FURNITURE)if(!f.farmOnly && !['flag','signpost','beehive'].includes(f.id))Game.S().furniture[f.id]=true;UI.render();`);await waitRoomLayout();
  await check('满家具房间解魂器不遮挡其他热点 '+w,`[...document.querySelectorAll('.room-sprite')].every(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.room-sprite')===e;})`);
  await ev(`document.querySelector('[data-roomact="separator"]').click()`);await sleep(200);
  await check('三阶各三档分解一屏可见可点 '+w,`[...document.querySelectorAll('[data-separate]')].length===9&&['nightmareSoul','nightmareSoul2','nightmareSoul3'].every(id=>document.querySelectorAll('[data-soul-id="'+id+'"]').length===3)&&[...document.querySelectorAll('[data-separate]')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})`);
  await shot('nightmare-separator-'+w+'.png');
  await ev(`document.querySelector('[data-separate="10"]').click()`);
  await check('实际扣十份并显示结果 '+w,`Game.invCount('nightmareSoul')===90&&!!document.querySelector('#separate-result')?.textContent`);
  await ev(`document.querySelector('#modal .modal-x').click();Game.addItem('nightmareSoul2',60,true);document.querySelector('[data-roomact="nightmareInfusion"]').click();`);await sleep(250);
  await check('汲取仪提问警告与三种意象，不泄露加成 '+w,`(()=>{const panel=document.querySelector('.infusion-sanctum');return panel?.textContent.includes('迷茫的人啊，你想成为什么？')&&panel.textContent.includes('此类选择不可撤回。')&&document.querySelectorAll('[data-infuse]').length===3&&!/护甲|攻击|闪避|5%/.test(panel.textContent);})()`);
  await ev(`document.querySelector('[data-infusion-tier="nightmareSoul2"]').click()`);
  await check('三种形状按钮一屏可点击 '+w,`[...document.querySelectorAll('[data-infuse]')].every(e=>{const r=e.getBoundingClientRect();return !e.disabled&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})`);
  await shot('nightmare-infusion-'+w+'.png');
  await ev(`document.querySelector('[data-infuse="blade"]').click()`);
  await check('选择一次扣30份且只增加攻击 '+w,`Game.invCount('nightmareSoul2')===30&&Game.nightmareInfusionBonus().atk===2&&Game.nightmareInfusionBonus().def===0`);
  await ev(`document.querySelector('[data-infuse="agile"]').click()`);
  await check('同阶两次后禁用，属性保存 '+w,`Game.invCount('nightmareSoul2')===0&&Game.nightmareInfusionBonus().dodge===.05&&[...document.querySelectorAll('[data-infuse]')].every(e=>e.disabled)`);
  await ev(`document.querySelector('#modal .modal-x')?.click();document.querySelector('#room-exit')?.click();Game.S().day=500;Game.S().scene='atlantis';Game.S().zone='sanctum';UI.begin();document.querySelector('#modal .modal-x')?.click();`);await sleep(2500);
  await check('未击败沉没之王时即使500天也无入口 '+w,`![...document.querySelectorAll('.hotspot')].some(e=>e.textContent.includes('噩梦之源'))`);
  await ev(`Game.S().day=1;Game.S().flags.boss_sunkenKing=1;UI.render();`);await sleep(250);
  await check('击败后第1天深水圣殿热点可见可点 '+w,`(()=>{const e=[...document.querySelectorAll('.hotspot')].find(e=>e.textContent.includes('噩梦之源')&&e.getBoundingClientRect().width>0);if(!e)return false;const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})()`);
  await shot('nightmare-sanctum-entry-'+w+'.png');
  await ev(`Game.S().scene='peak';Game.S().zone=null;UI.render();`);await sleep(250);
  await check('山顶不再显示噩梦首领入口 '+w,`![...document.querySelectorAll('.hotspot')].some(e=>e.textContent.includes('噩梦之源'))`);
  await ev(`Game.S().scene='atlantis';Game.S().zone='city';UI.render();`);await sleep(250);
  await check('其他海底区域不重复显示入口 '+w,`![...document.querySelectorAll('.hotspot')].some(e=>e.textContent.includes('噩梦之源'))`);
  await ev(`Game.S().zone='sanctum';UI.render();[...document.querySelectorAll('.hotspot')].find(e=>e.textContent.includes('噩梦之源')&&e.getBoundingClientRect().width>0).click();`);await sleep(200);
  await check('热点实际打开首领迎战确认 '+w,`!!document.querySelector('[data-choice="0"]')&&document.querySelector('.modal-title')?.textContent.includes('噩梦之源')&&!Game.S().combat`);
  await ev(`document.querySelector('[data-choice="0"]').click()`);await sleep(300);
  await check('首领图与战斗控件 '+w,`(()=>{const e=document.querySelector('.nightmare-fight'),img=e?.querySelector('.enemy-img');return e&&img.complete&&img.naturalWidth>0&&document.querySelector('#fight-btns button');})()`);
  await shot('nightmare-boss-'+w+'.png');
 }
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{try{ws?.close();ch?.kill();}catch{}console.log('通过 '+passed+' 项，失败 '+fail+' 项');console.log('RESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();
