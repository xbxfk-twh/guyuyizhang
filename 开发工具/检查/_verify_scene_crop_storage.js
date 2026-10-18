/* Independent browser checks for fixed scene cropping and storage art. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-mobile-')),port=9597;
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
 for(const [w,h]of [[667,375],[844,390],[1366,768]]){
  await ev(`try{localStorage.setItem('guyuyizhang_scene_scroll','1');localStorage.setItem('guyuyizhang_skin','[]')}catch{}`);
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<1000});await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(4500);
  await ev(`Game.newGame('fisher','normal');Game.S().tut=null;UI.begin();document.querySelector('#modal .modal-x')?.click();Game.S().scene='forest';UI.render();`);await ready();await sleep(3200);
  await check('原位热点无左上角复制入口 '+w,`!document.querySelector('#crop-shortcuts')&&[...document.querySelectorAll('#hotspots>.hotspot')].every(e=>getComputedStyle(e).display!=='none')`);
  await ev(`window.anchors=[...document.querySelectorAll('#hotspots>.hotspot')].map(e=>[e.style.left,e.style.top]);window.beforeY=document.querySelector('#scene-img').getBoundingClientRect().top;`);
  const r=await ev(`document.querySelector('#scene-wrap').getBoundingClientRect().toJSON()`),x=r.x+r.width*.5,y=r.y+r.height*.8;
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y:y+8,button:'left',buttons:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y:y+8,button:'left',clickCount:1});
  await check('轻拖8像素后热点不提前隐藏且锚点不变 '+w,`Math.abs(document.querySelector('#scene-img').getBoundingClientRect().top-beforeY)>1&&[...document.querySelectorAll('#hotspots>.hotspot')].every((e,i)=>getComputedStyle(e).display!=='none'&&e.style.left===anchors[i][0]&&e.style.top===anchors[i][1])`);
  await ev(`document.querySelector('[data-nav="save"]').click();document.querySelector('[data-savemenu="settings"]').click();document.querySelector('[data-set="sceneScroll"]').click();document.querySelector('#modal-close').click();window.fixedY=document.querySelector('#scene-img').getBoundingClientRect().top;document.querySelector('#scene-wrap').dispatchEvent(new WheelEvent('wheel',{deltaY:80,bubbles:true,cancelable:true}));`);
  await check('关闭滑动固定裁取画面，不伸缩且全覆盖 '+w,`(()=>{const i=document.querySelector('#scene-img'),q=i.getBoundingClientRect(),stage=document.querySelector('#scene-wrap'),outer=stage.getBoundingClientRect(),r={left:outer.left+stage.clientLeft,right:outer.left+stage.clientLeft+stage.clientWidth,top:outer.top+stage.clientTop,bottom:outer.top+stage.clientTop+stage.clientHeight},a=document.querySelector('#hotspots').getBoundingClientRect();return Math.abs(q.top-fixedY)<.01&&Math.abs(q.width/q.height-i.naturalWidth/i.naturalHeight)<.001&&q.left<=r.left+.1&&q.right>=r.right-.1&&q.top<=r.top+.1&&q.bottom>=r.bottom-.1&&Math.abs(a.left-q.left)<.1&&Math.abs(a.top-q.top)<.1&&Math.abs(a.width-q.width)<.1&&!document.querySelector('#crop-shortcuts');})()`);
  await shot('scene-crop-fixed-'+w+'.png');
  await ev(`document.querySelector('#btn-backmap').click();`);await sleep(1000);
  await check('大地图仍可滚动 '+w,`(()=>{const i=document.querySelector('#map-img'),q=i.getBoundingClientRect().top;document.querySelector('#map-wrap').dispatchEvent(new WheelEvent('wheel',{deltaY:70,bubbles:true,cancelable:true}));const a=i.getBoundingClientRect().top;document.querySelector('#map-wrap').dispatchEvent(new WheelEvent('wheel',{deltaY:-140,bubbles:true,cancelable:true}));return Math.max(Math.abs(a-q),Math.abs(i.getBoundingClientRect().top-q))>1;})()`);
  await ev(`document.querySelector('#btn-backmap').click();Game.S().scene='camp';Game.S().zone=null;Game.S().buildings.storage=2;UI.render();`);await ready();await sleep(500);
  await check('新增80格储物棚实际图片可加载 '+w,`Game.warehouseCapacity()===80&&[...document.querySelectorAll('.build-sprite')].some(e=>e.src.includes('storage-shed.png')&&e.complete&&e.naturalWidth>0)`);
  await shot('storage-shed-camp-'+w+'.png');
  await ev(`document.querySelector('[data-nav="save"]').click();document.querySelector('[data-savemenu="settings"]').click();document.querySelector('[data-set="skin:seasons"]').click();document.querySelector('#modal-close').click();`);await ready();await sleep(800);
  await check('免费全彩包使用储物棚独立彩图 '+w,`[...document.querySelectorAll('.build-sprite')].some(e=>e.src.includes('storage-shed-colored.png')&&e.complete&&e.naturalWidth>0)&&!document.querySelector('#crop-shortcuts')`);
  await shot('storage-shed-colored-camp-'+w+'.png');
 }
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{try{ws?.close();ch?.kill();}catch{}console.log('通过 '+passed+' 项，失败 '+fail+' 项');console.log('RESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();
