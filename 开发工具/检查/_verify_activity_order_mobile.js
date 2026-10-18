/* Rain-only hotspots and inventory touch interactions in independent Chrome profiles. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-mobile-')),port=9634;
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

 for(const [w,h]of [[568,320],[844,390]]){
 await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(3000);
 await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().difficulty='nightmare';UI.begin();document.querySelector('#modal .modal-x')?.click();`);await ready();
 await touchTap('[data-nav="save"]');await touchTap('[data-savemenu="mail"]');await touchTap('[data-mailtab="event"]');
 await check('征集活动最上方且奖励与评价无关 '+w,`(()=>{const a=document.querySelector('.event-feedback');return a&&a.parentElement.firstElementChild===a&&a.textContent.includes('300 魂点 + 30 广告币')&&a.textContent.includes('无需提交评价截图或链接');})()`);
 await check('真实评价邀请独立，保留原广告和兑换码 '+w,`!!document.querySelector('.event-review')&&document.querySelector('.event-ad').textContent.includes('1840585640')&&document.querySelector('#modal').textContent.includes('QQ1014679931')`);await shot('activity-feedback-'+w+'.png');await tap('#modal .modal-x');
 await ev(`[...document.querySelectorAll('#hotspots .hotspot')].find(e=>e.textContent.includes('营地建造')).id='test-camp';`);await touchTap('#test-camp');
 await check('噩梦家具在营地家具末尾 '+w,`(()=>{const a=[...document.querySelectorAll('.furn-grid .furn')].map(e=>e.textContent);return a.slice(-2).some(x=>x.includes('噩梦汲取仪'))&&a.slice(-2).some(x=>x.includes('解魂器'));})()`);await touchTap('[data-help="furn"]');
 await check('噩梦家具说明排在末尾 '+w,`(()=>{const a=[...document.querySelectorAll('.camp-help-list .help-item')].map(e=>e.textContent);return a.slice(-2).some(x=>x.includes('噩梦汲取仪'))&&a.slice(-2).some(x=>x.includes('解魂器'));})()`);await tap('#modal .modal-x');
 await touchTap('[data-nav="craft"]');await check('手工常用工具优先，背包配方靠后 '+w,`(()=>{const a=[...document.querySelectorAll('[data-recipe]')].map(e=>e.dataset.recipe);return a[0]==='r_axestone'&&a.indexOf('r_reedpack')>a.indexOf('r_arrow');})()`);await tap('#modal .modal-x');
 if(w===568){for(const [code,soul,coins]of [['laobandaqi',10000,1000],['ganxiepingjia',300,30]]){
 await ev(`Game.S().difficulty='normal';`);const before=await ev(`({soul:Game.metaState().soul,coins:Game.adCoinBalance()})`);
 await touchTap('[data-nav="save"]');await touchTap('[data-savemenu="mail"]');await touchTap('[data-mailtab="code"]');await ev(`document.querySelector('#redeem-code').value='${code}';`);await touchTap('#redeem-do');await touchTap('[data-mailtab="mail"]');
 await check('兑换邮件同时显示魂点和广告币 '+code,`document.querySelector('#modal').textContent.includes('魂点 ×${soul} + 广告币 ×${coins}')`);await touchTap('[data-claimmail]');await check('手机领取双币实际入账 '+code,`Game.metaState().soul===${before.soul+soul}&&Game.adCoinBalance()===${before.coins+coins}`);await tap('#modal .modal-x');
 }}
 await ev('UI.showTitle()');await touchTap('#btn-new');await touchTap('.identity');await check('付费解锁角色排在免费角色后 '+w,`JSON.stringify([...document.querySelectorAll('.identity[data-id]')].slice(-2).map(e=>e.dataset.id))===JSON.stringify(['trainer','beekeeper'])`);
 }
 assert.deepEqual(errors,[]);console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{try{ws?.close();ch?.kill();}catch{}console.log('通过 '+passed+' 项，失败 '+fail+' 项');console.log('RESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();
