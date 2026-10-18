/* Rain-only hotspots and inventory touch interactions in independent Chrome profiles. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-mobile-')),port=9648;
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

 const codeFile=process.env.GUYU_REDEEM_TEST_CODES;if(!codeFile)throw Error('Set GUYU_REDEEM_TEST_CODES to an ignored CSV containing an unused test code');
 const code=fs.readFileSync(codeFile,'utf8').trim().split(/\r?\n/)[Number(process.env.GUYU_REDEEM_TEST_ROW||1)].split(',')[0];
 await send('Emulation.setDeviceMetricsOverride',{width:568,height:320,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(3000);
 await ev(`Game.newGame('fisher','normal');Game.S().tut=null;UI.begin();document.querySelector('#modal .modal-x')?.click();`);await ready();
 const before=await ev(`({soul:Game.metaState().soul,coins:Game.adCoinBalance()})`);
 await touchTap('[data-nav="save"]');await touchTap('[data-savemenu="mail"]');await touchTap('[data-mailtab="code"]');
 await check('专属码输入长度足够',`document.querySelector('#redeem-code').maxLength>=35`);
 await ev(`document.querySelector('#redeem-code').value=${JSON.stringify(code)};`);await touchTap('#redeem-do');
 for(let i=0;i<80;i++){if(await ev(`Game.metaState().redeemed[${JSON.stringify(code)}]===1`))break;await sleep(250);}
 await check('真实HTTPS请求返回并成功保存邮件',`Game.metaState().redeemed[${JSON.stringify(code)}]===1&&Game.mailboxList().some(x=>x.soul===300&&x.adCoins===30)`);
 await check('手机邮件显示双币',`document.querySelector('#modal').textContent.includes('魂点 ×300 + 广告币 ×30')`);
 await sleep(700);await touchTap('[data-claimmail]');await sleep(500);
 await check('真实触摸领取邮件准确到账',`Game.metaState().soul===${before.soul+300}&&Game.adCoinBalance()===${before.coins+30}`);
 await shot('remote-redeem-mobile-claimed.png');
 await check('不同领取资格再次请求被服务端拒绝',`(async()=>{const r=await fetch('https://redeem.guyuyizhang.top:8443/v1/redeem',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:${JSON.stringify(code)},owner:'f'.repeat(64)})});const d=await r.json();return r.status===409&&!d.ok;})()`);
 await check('原资格重试返回同回执且本地不重复到账',`(async()=>{const code=${JSON.stringify(code)},owner=Game.metaState().remoteRedeemOwners[code];const r=await fetch('https://redeem.guyuyizhang.top:8443/v1/redeem',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,owner})});const d=await r.json();return r.status===200&&d.ok&&!!Game.metaState().adDelivered[d.receipt]&&!(await Game.redeemCode(code)).ok&&Game.adCoinBalance()===${before.coins+30};})()`);
 await send('Page.reload');await sleep(3000);
 await check('重新打开游戏保留专属码和钱包流水',`Game.metaState().redeemed[${JSON.stringify(code)}]===1&&Game.adCoinBalance()===${before.coins+30}`);
 assert.deepEqual(errors,[]);console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{try{ws?.close();ch?.kill();}catch{}console.log('通过 '+passed+' 项，失败 '+fail+' 项');console.log('RESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();
