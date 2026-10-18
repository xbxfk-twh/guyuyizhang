/* 独立 Chrome 手机触控/弹窗/启动故障测试；不访问玩家浏览器配置。 */
const fs=require('fs'), path=require('path'), os=require('os'), http=require('http'), assert=require('node:assert/strict');
const {spawn}=require('child_process');
const root=path.resolve(__dirname,'../..'), profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-feedback-'));
const port=9495, out=path.join(root,'回归测试/_out'); fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const json=url=>new Promise((resolve,reject)=>http.get(url,r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{resolve(JSON.parse(b));}catch(e){reject(e);}});}).on('error',reject));
let browser,ws,passed=0;
const errors=[];
async function main(){
  browser=spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
    '--headless=new','--disable-gpu','--no-first-run','--allow-file-access-from-files','--remote-debugging-port='+port,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
  let tab; for(let i=0;i<60&&!tab;i++){await sleep(200);try{tab=(await json('http://127.0.0.1:'+port+'/json/list')).find(t=>t.type==='page');}catch{}}
  assert.ok(tab,'Chrome not ready'); ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let next=0; const pending=new Map();
  ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}
    if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  };
  const send=(method,params={})=>new Promise((r,j)=>{const id=++next;pending.set(id,m=>m.error?j(Error(JSON.stringify(m.error))):r(m.result));ws.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
  const check=async(name,expression)=>{assert.ok(await ev(expression),name);passed++;console.log('OK '+name);};
  const tap=async selector=>{
    const rect=await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}); if(!e)throw Error('Missing '+${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await sleep(400); await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[rect]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await sleep(450);
  };
  await send('Runtime.enable');await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__testIntervals=[];const originalSetInterval=window.setInterval;window.setInterval=function(fn,ms,...args){window.__testIntervals.push(ms);return originalSetInterval(fn,ms,...args);};`});
  await send('Emulation.setDeviceMetricsOverride',{width:926,height:428,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true});
  const url=require('url').pathToFileURL(path.join(process.env.GUYU_GAME_ROOT || path.join(root,'孤屿遗章-游戏 - 发布'),'index.html')).href;
  await send('Page.navigate',{url});await sleep(2200);
  await ev('UI.showTitle();UI.showTitle();UI.showTitle();');
  await check('反复回标题不会增加时间与自动保存计时器',`window.__testIntervals.filter(n=>n===10000).length===1 && window.__testIntervals.filter(n=>n===20000).length===1`);
  await ev(`Game.newGame('fisher','normal'); Game.S().tut=null; Game.S().capacity=999; Game.S().inv.wood=200; UI.begin();`); await sleep(2900);
  await ev(`document.querySelector('#modal [data-choice]')?.click();`);await sleep(450);
  await ev(`Game.S().stats.hunger=29;Game.S().stats.thirst=29;UI.render();`);
  const red=await ev(`['hunger','thirst'].map(k=>({n:getComputedStyle(document.querySelector('#num-'+k)).color,b:getComputedStyle(document.querySelector('#bar-'+k)).backgroundColor}))`);
  assert.ok(red.every(v=>v.n!== 'rgb(234, 230, 218)' && v.n===red[0].n));
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'latest-low-needs.png'),Buffer.from(r.data,'base64')));
  await ev(`Game.S().stats.hunger=30;Game.S().stats.thirst=30;UI.render();`);
  await check('饥渴30时红色恢复',`getComputedStyle(document.querySelector('#num-hunger')).color!==${JSON.stringify(red[0].n)}`);
  for(const [scene,label,icon] of [['forest','野莓','berry_pick'],['river','取水','water_ladle'],['river','找石头','pick']]) {
    await ev(`Game.S().scene=${JSON.stringify(scene)};Game.S().zone=null;Game.S().combat=null;Game.S().stats.stamina=150;Game.S().stats.hunger=90;Game.S().stats.thirst=90;UI.render();`);await sleep(600);
    const found=await ev(`(()=>{const e=[...document.querySelectorAll('.hotspot')].find(e=>e.textContent.includes(${JSON.stringify(label)}));if(!e)return false;e.click();return true;})()`);
    assert.ok(found,'热点存在 '+scene);await sleep(180);
    await check('动画图案 '+icon,`!!document.querySelector('#busy.open svg.${icon}')`);
    await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'latest-'+icon+'.png'),Buffer.from(r.data,'base64')));
    await sleep(3100);await ev(`document.querySelector('#modal [data-choice]')?.click();`);await sleep(400);
  }
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
}
main().catch(e=>{console.error(e.stack);console.log('RESULT:FAIL');process.exitCode=1;}).finally(async()=>{
  if(ws)ws.close(); if(browser){browser.kill();await sleep(800);}
  assert.equal(path.dirname(profile),os.tmpdir());fs.rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});
});
