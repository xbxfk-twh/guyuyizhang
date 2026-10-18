/* 巡场截图：按玩家的实际路径走一遍主要界面，把每屏存成 PNG，供人工过目。
   用法：node 开发工具/预览/_tour_shots.js   →  回归测试/_out/tour-*.png
   不改任何游戏数据；独立 Chrome 配置。 */
const fs=require('fs'), path=require('path'), os=require('os'), http=require('http'), assert=require('node:assert/strict');
const {spawn}=require('child_process');
const root=path.resolve(__dirname,'../..'), profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-tour-'));
const port=9496, out=path.join(root,'回归测试/_out'); fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const json=url=>new Promise((resolve,reject)=>http.get(url,r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{resolve(JSON.parse(b));}catch(e){reject(e);}});}).on('error',reject));
let browser,ws;
async function main(){
  browser=spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
    '--headless=new','--disable-gpu','--no-first-run','--allow-file-access-from-files','--remote-debugging-port='+port,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
  let tab; for(let i=0;i<60&&!tab;i++){await sleep(200);try{tab=(await json('http://127.0.0.1:'+port+'/json/list')).find(t=>t.type==='page');}catch{}}
  assert.ok(tab,'Chrome not ready'); ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let next=0; const pending=new Map();
  ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}};
  const send=(method,params={})=>new Promise((r,j)=>{const id=++next;pending.set(id,m=>m.error?j(Error(JSON.stringify(m.error))):r(m.result));ws.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
  const tap=async selector=>{
    const rect=await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}); if(!e)throw Error('Missing '+${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await sleep(360); await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[rect]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await sleep(520);
  };
  let n=0;
  const shot=async name=>{ n++; await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,`tour-${String(n).padStart(2,'0')}-${name}.png`),Buffer.from(r.data,'base64'))); console.log('shot',n,name); };
  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:926,height:428,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true});
  const url=require('url').pathToFileURL(path.join(process.env.GUYU_GAME_ROOT || path.join(root,'孤屿遗章-游戏 - 发布'),'index.html')).href;
  await send('Page.navigate',{url});await sleep(2400); await shot('title');
  await tap('#btn-new');                                   // 备份槽页
  await tap('.identity');                                  // 空白槽 → 身份选择
  await shot('identity');
  await tap('.identity[data-id="fisher"]');
  await sleep(600); await shot('difficulty');
  await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().capacity=999;
    ['wood','branch','thatch','stone','flint','vine','herb','berry','fiber','ironingot','ironpart','leather','cloth','plank','stonebrick','nail','wool','felt','clay','bamboo','charcoal','peanut'].forEach(k=>{if(ITEMS[k])Game.addItem(k,6,true);});
    ['axeStone','pickStone','knifeStone','spear','rod','net','ironSword','ironArmor','hempCloth'].forEach(k=>{if(ITEMS[k])Game.addItem(k,1,true);});
    Game.S().furniture.wb1=true; UI.begin();`); await sleep(3000);
  await ev(`document.querySelector('#modal [data-choice]')?.click();`); await sleep(500);
  await ev(`Game.S().scene='camp';Game.S().minute=620;UI.render();`); await sleep(700); await shot('camp');
  await tap('.hotspot:first-child'); await sleep(300); await shot('camp-build');
  await tap('[data-help="build"]'); await sleep(300); await shot('camp-help-build');
  // ⚠️ 弹窗一开就盖住底部导航：每次切页前必须先关掉弹窗，否则点的是弹窗而不是导航。
  await tap('#modal .modal-x'); await sleep(400);
  await tap('[data-nav="craft"]'); await sleep(400); await shot('craft');
  await tap('#modal .modal-x'); await sleep(400);
  await tap('[data-nav="inv"]'); await sleep(400); await shot('inventory');
  await tap('#modal .modal-x'); await sleep(400);
  await tap('[data-nav="equip"]'); await sleep(400); await shot('equip');
  await tap('#modal .modal-x'); await sleep(400);
  await tap('[data-nav="save"]'); await sleep(500); await shot('menu');
  await tap('[data-savemenu="settings"]'); await sleep(500); await shot('settings');
  await tap('#modal .modal-x'); await sleep(400);
  await tap('[data-nav="map"]'); await sleep(700); await shot('map');
  // 文本快照：不看图也能核对日志、热点、各面板标题
  const texts={};
  texts.log = await ev(`(function(){const l=document.querySelector('#log');return l?{hidden:getComputedStyle(l).display==='none',cls:l.className,lines:l.innerText.split('\\n').slice(-6)}:null;})()`);
  texts.campHotspots = await ev(`Array.from(document.querySelectorAll('.hotspot,.action-btn,.mini-btn')).map(e=>e.innerText.trim()).filter(Boolean).slice(0,30)`);
  texts.scene = await ev(`Game.S().scene`);
  texts.logDebug = await ev(`({len:(Game.S().log||[]).length, tail:(Game.S().log||[]).slice(-4), logEl:!!document.querySelector('#log'), logHtml:(document.querySelector('#log')||{}).innerHTML?.slice(0,200)})`);
  fs.writeFileSync(path.join(out,'tour-texts.json'),JSON.stringify(texts,null,2));
  console.log(JSON.stringify(texts,null,1).slice(0,1200));
  console.log('done');
  ws.close(); browser.kill();
  try{fs.rmSync(profile,{recursive:true,force:true});}catch(e){}
}
main().catch(e=>{console.error('FAIL '+e.message);try{browser&&browser.kill();}catch(_){}process.exitCode=1;});
