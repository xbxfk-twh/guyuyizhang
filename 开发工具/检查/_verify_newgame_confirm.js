/* 真机同类路径回归：点「空白备份槽」必须能开新游戏。
   2026-09-21 iPhone/Taptap 反馈"点空白槽没反应" —— 根因是那条分支调了原生 confirm()，
   WKWebView 宿主不实现 runJavaScriptConfirmPanel 时 confirm 不返回，回调整段卡死。
   这里用独立 Chrome 配置跑真实触控，并**主动把原生 confirm 变成陷阱**：
   只要还有代码走原生弹窗，陷阱就会记到并让流程失败。 */
const fs=require('fs'), path=require('path'), os=require('os'), http=require('http'), assert=require('node:assert/strict');
const {spawn}=require('child_process');
const root=path.resolve(__dirname,'../..'), profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-newgame-'));
const port=9494, out=path.join(root,'回归测试/_out'); fs.mkdirSync(out,{recursive:true});
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
  await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true});
  const url=require('url').pathToFileURL(path.join(process.env.GUYU_GAME_ROOT || path.join(root,'孤屿遗章-游戏 - 发布'),'index.html')).href;
  await send('Page.navigate',{url});await sleep(2200);
  // 从标题页进入备份槽页（showJourneySelect 由标题上的「开始新的旅程」按钮触发）
  const toJourney=async()=>{ await ev('UI.showTitle();'); await sleep(300); await tap('#btn-new'); };
  // 原生弹窗陷阱：真被调用就记下来并返回 false（旧代码会因此直接 return，什么也不发生）。
  await ev(`window.__nativeDialog=0; for (const k of ['confirm','alert','prompt']) window[k]=function(){ window.__nativeDialog++; return false; };`);

  // ① 页面里存着一份第 5 天的进行中存档 → 点空白槽应该弹"自己的"确认窗，而不是原生 confirm
  await ev(`localStorage.setItem('guyuyizhang_save', JSON.stringify({v:1,identity:'fisher',difficulty:'normal',day:5,minute:480,stats:{hp:100,stamina:100,hunger:80,thirst:80,spirit:80}}));`);
  await toJourney();
  await check('空白槽渲染为"点击开始新游戏"',`/空白/.test(document.querySelector('.identity').textContent)`);
  await tap('.identity');
  await check('点空白槽弹的是游戏自己的确认窗',`!!document.querySelector('#modal [data-choice]')`);
  await check('没有调用原生 confirm/alert/prompt',`window.__nativeDialog===0`);
  await check('确认窗文案说明了会覆盖进行中的存档',`/第 5 天/.test(document.querySelector('#modal').textContent)`);
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'newgame-confirm-dialog.png'),Buffer.from(r.data,'base64')));

  // ② 点「取消」→ 什么都不做，仍停在备份槽页
  await tap('#modal [data-choice="1"]');
  await check('取消后仍停在备份槽页',`!!document.querySelector('.identity-list') && /开始新的旅程/.test(document.body.textContent)`);

  // ③ 再点一次并确认 → 必须真的进入"你是什么人？"身份选择
  await tap('.identity');
  await tap('#modal [data-choice="0"]');
  await check('确认后进入身份选择（新游戏真的开始了）',`/你是什么人/.test(document.body.textContent)`);
  await check('全程仍未调用原生弹窗',`window.__nativeDialog===0`);

  // ④ 没有进行中存档时，点空白槽不该弹任何确认，直接进身份选择
  await ev(`localStorage.removeItem('guyuyizhang_save');`);
  await toJourney(); await tap('.identity');
  await check('无进行中存档时直接进入身份选择',`/你是什么人/.test(document.body.textContent)`);
  await check('无进行中存档时不弹确认窗',`!document.querySelector('#modal [data-choice]')`);

  await check('健身教练和养蜂人显示100魂点永久解锁',`['trainer','beekeeper'].every(id=>document.querySelector('[data-id="'+id+'"]')?.textContent.includes('100 魂点解锁'))`);
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'identity-unlock.png'),Buffer.from(r.data,'base64')));
  await ev(`Game.metaState().soul=200`);
  await tap('[data-id="trainer"]');
  await check('角色购买先显示确认且尚未扣费',`!!document.querySelector('#modal [data-choice]')&&Game.metaState().soul===200`);
  await tap('#modal [data-choice="0"]');
  await check('购买教练扣100魂点并刷新已解锁卡面',`Game.identityUnlocked('trainer')&&Game.metaState().soul===100&&!document.querySelector('[data-id="trainer"]').textContent.includes('100 魂点解锁')`);
  await tap('[data-id="beekeeper"]');await tap('#modal [data-choice="0"]');
  await check('养蜂人独立再扣100魂点',`Game.identityUnlocked('beekeeper')&&Game.metaState().soul===0`);
  await tap('[data-id="trainer"]');
  await check('已解锁教练进入难度页而不再扣费',`document.body.textContent.includes('选择难度')&&Game.metaState().soul===0`);
  await tap('#sel-back');

  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'newgame-confirm.png'),Buffer.from(r.data,'base64')));
  console.log(`通过 ${passed} 项，失败 0 项`);
  console.log('RESULT:PASS');
  ws.close(); browser.kill();
  try{fs.rmSync(profile,{recursive:true,force:true});}catch(e){}
}
main().catch(e=>{console.error('FAIL '+e.message);console.log('RESULT:FAIL');try{browser&&browser.kill();}catch(_){}process.exitCode=1;});
