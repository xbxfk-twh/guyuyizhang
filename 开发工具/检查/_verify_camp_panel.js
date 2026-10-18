/* 营地建造/家具面板：底部「关闭」已移除，只留右上角 ×（作者 2026-09-21）。
   独立 Chrome 配置 + 真实触控，不碰玩家浏览器数据。 */
const fs=require('fs'), path=require('path'), os=require('os'), http=require('http'), assert=require('node:assert/strict');
const {spawn}=require('child_process');
const root=path.resolve(__dirname,'../..'), profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-camp-'));
const port=9495, out=path.join(root,'回归测试/_out'); fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const json=url=>new Promise((resolve,reject)=>http.get(url,r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{resolve(JSON.parse(b));}catch(e){reject(e);}});}).on('error',reject));
let browser,ws,passed=0;
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
  const check=async(name,expression)=>{assert.ok(await ev(expression),name);passed++;console.log('OK '+name);};
  const tap=async selector=>{
    const rect=await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}); if(!e)throw Error('Missing '+${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await sleep(400); await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[rect]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await sleep(500);
  };
  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:926,height:428,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true});
  const url=require('url').pathToFileURL(path.join(process.env.GUYU_GAME_ROOT || path.join(root,'孤屿遗章-游戏 - 发布'),'index.html')).href;
  await send('Page.navigate',{url});await sleep(2200);
  await ev(`Game.newGame('fisher','normal'); Game.S().tut=null; Game.S().capacity=999; UI.begin();`); await sleep(2900);
  await ev(`document.querySelector('#modal [data-choice]')?.click();`);await sleep(450);
  await ev(`Game.S().scene='atlantis';Game.S().zone='habitat';UI.render();`);await sleep(300);
  await check('非营地空目标不会留下小方块', `getComputedStyle(document.querySelector('#objective')).display==='none'`);
  await ev(`Game.S().scene='camp';Game.S().zone=null;UI.render();`);await sleep(300);
  await tap('.hotspot:first-child');
  await check('营地面板已打开',`/营地建造/.test(document.querySelector('#modal').textContent)`);
  await check('右上角 × 还在',`!!document.querySelector('#modal .modal-x')`);
  await check('底部「关闭」按钮已移除',`!document.querySelector('#modal #modal-close')`);
  await check('底部没有多余的按钮行',`!document.querySelector('#modal .modal-actions')`);
  await check('面板内没有横向溢出',`(()=>{const c=document.querySelector('#modal .modal-content');return c && c.scrollWidth<=c.clientWidth+1;})()`);
  await check('右上角 × 为 32 像素紧凑按钮',`(()=>{const e=document.querySelector('#modal .modal-x');const r=e.getBoundingClientRect();return r.width===32&&r.height===32;})()`);
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'camp-panel-926x428.png'),Buffer.from(r.data,'base64')));
  // × 仍然能关掉面板
  await tap('#modal .modal-x');
  await check('点右上角 × 能关掉面板',`!document.querySelector('#modal').classList.contains('open')`);
  // 作者真正点名的是「问号点出来的说明面板」：底部关闭也该去掉
  await tap('.hotspot:first-child');
  await tap('[data-help="build"]');
  await check('建筑说明面板已打开',`/建筑作用/.test(document.querySelector('#modal').textContent)`);
  await check('说明面板右上角 × 还在',`!!document.querySelector('#modal .modal-x')`);
  await check('说明面板底部「关闭」已移除',`!document.querySelector('#modal #modal-close') && !document.querySelector('#modal .modal-actions')`);
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'camp-help-panel-926x428.png'),Buffer.from(r.data,'base64')));
  await tap('#modal .modal-x');
  await check('说明面板点 × 能关掉',`!document.querySelector('#modal').classList.contains('open')`);
  await ev(`Game.S().scene='atlantis'; Game.S().zone='habitat'; Game.S().atlantis={camp:{furniture:{pearlWork:true,sourceForge:true,repairBench:true}}}; UI.render();`);
  await sleep(400);
  await tap('#hotspots .hotspot:first-child');
  await check('礁石栖息地已建家具显示名称和说明', `(()=>{const cards=[...document.querySelectorAll('#modal .furn.built')]; return cards.length===3&&cards.every(c=>c.textContent.includes('已建成')&&c.querySelector('.furn-name')&&c.querySelector('span:last-child').textContent.length>3);})()`);
  await check('已建家具文字与卡片底色不同', `(()=>{const c=document.querySelector('#modal .furn.built'); return c&&getComputedStyle(c).color!==getComputedStyle(c).backgroundColor&&getComputedStyle(c.querySelector('.furn-name')).color!==getComputedStyle(c).backgroundColor;})()`);
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'atlantis-built-panel-926x428.png'),Buffer.from(r.data,'base64')));
  await tap('#modal .modal-x');
  await ev(`Game.S().scene='camp';Game.S().zone=null;Game.S().identity='trainer';Game.S().furniture.treadmill=true;Game.S().furniture.dumbbell=true;UI.render();`);
  await tap('.hotspot:first-child');
  await check('健身器材在营地有可点击的锻炼入口',`document.querySelectorAll('#modal [data-train]').length===2`);
  await ev(`document.querySelector('#modal [data-train]').scrollIntoView({block:'center'});`);await sleep(250);
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'trainer-panel-926x428.png'),Buffer.from(r.data,'base64')));
  await tap('#modal .modal-x');
  await ev(`Game.S().scene='camp'; Game.S().zone=''; Game.S().minute=22*60; Game.S().flags.wolfRaidPending=1; UI.render(); Game.sleep('normal');`);
  await check('夜袭选择弹窗不显示关闭叉', `(()=>{const m=document.querySelector('#modal.open');return m&&m.textContent.includes('夜 袭')&&!m.querySelector('.modal-x')&&m.querySelectorAll('[data-choice]').length===2;})()`);
  console.log(`通过 ${passed} 项，失败 0 项`);
  console.log('RESULT:PASS');
  ws.close(); browser.kill();
  try{fs.rmSync(profile,{recursive:true,force:true});}catch(e){}
}
main().catch(e=>{console.error('FAIL '+e.message);console.log('RESULT:FAIL');try{browser&&browser.kill();}catch(_){}process.exitCode=1;});
