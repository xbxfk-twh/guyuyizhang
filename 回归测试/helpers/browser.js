/* 隔离的浏览器测试驱动；不连接作者正在使用的Chrome/Edge或玩家存储。 */
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const json=url=>new Promise((resolve,reject)=>http.get(url,r=>{let body='';r.on('data',x=>body+=x);r.on('end',()=>{try{resolve(JSON.parse(body));}catch(e){reject(e);}});}).on('error',reject));
async function waitForGame(ev,{timeout=15000,interval=100,previousDocument}={}){
 const deadline=Date.now()+timeout;
 const currentDocument=previousDocument===undefined?'true':`window.__guyuTestNavigation!==${JSON.stringify(previousDocument)}`;
 while(Date.now()<deadline){
  try{if(await ev(`document.readyState==='complete'&&typeof Game==='object'&&typeof UI==='object'&&typeof Locale==='object'&&(${currentDocument})`))return;}catch{}
  await sleep(interval);
 }
 let state;try{state=await ev("({ready:document.readyState,url:location.href,game:typeof Game,ui:typeof UI,locale:typeof Locale})");}catch(error){state=error.message;}
 throw Error('游戏初始化未在时限内完成：'+JSON.stringify(state));
}
async function navigateGame(send,ev,method,params={}){
 const previousDocument='nav-'+Date.now()+'-'+Math.random();
 await ev(`window.__guyuTestNavigation=${JSON.stringify(previousDocument)}`);
 await send(method,params);await waitForGame(ev,{previousDocument});
}
async function openBrowser({width=667,height=375,init=''}={}){
 const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out');fs.mkdirSync(out,{recursive:true});
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-refactor-'));
 const ch=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--allow-file-access-from-files','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
 let ws;try{
  let port;for(let i=0;i<80&&!port;i++){await sleep(100);try{port=Number(fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);}catch{}}
  if(!port)throw Error('隔离Chrome未启动');const tab=(await json(`http://127.0.0.1:${port}/json/list`)).find(t=>t.type==='page');
  ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let id=0;const pending=new Map(),errors=[];ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);};
  const send=(method,params={})=>new Promise((r,j)=>{const n=++id;pending.set(n,m=>m.error?j(Error(JSON.stringify(m.error))):r(m.result));ws.send(JSON.stringify({id:n,method,params}));});
  const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
  await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1000});
  if(init)await send('Page.addScriptToEvaluateOnNewDocument',{source:init});
  const navigate=async url=>navigateGame(send,ev,'Page.navigate',{url});
  await navigate(pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href);
  return {root,out,send,ev,errors,sleep,navigate,
   async tap(selector,{long=false,touch=width<1000,scroll=true}={}){await sleep(400);const p=await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(${scroll})e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);if(touch)await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});else await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});if(long)await sleep(520);if(touch)await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await sleep(120);},
   async shot(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(out,name),Buffer.from(r.data,'base64'));},
   async close(){ws.close();ch.kill();}
  };
 }catch(e){ws?.close();ch.kill();throw e;}
}
module.exports={openBrowser,waitForGame,navigateGame};
