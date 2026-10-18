/* 独立 Chrome 手机触控/弹窗/启动故障测试；不访问玩家浏览器配置。 */
const fs=require('fs'), path=require('path'), os=require('os'), http=require('http'), assert=require('node:assert/strict');
const {spawn}=require('child_process');
const root=path.resolve(__dirname,'../..'), profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-feedback-'));
const port=9493, out=path.join(root,'回归测试/_out'); fs.mkdirSync(out,{recursive:true});
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
  // 长按：制造页的「批量」按钮已删（作者 2026-09-22），改为长按「制作」进批量 —— 这才是玩家的真实操作
  const longPress=async selector=>{
    const rect=await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}); if(!e)throw Error('Missing '+${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await sleep(400); await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[rect]});
    await sleep(700); await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await sleep(500);
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
  // 关闭新局提示，用实际触控打开营地家具帮助。
  await ev(`document.querySelector('#modal [data-choice]')?.click();`);await sleep(450);
  await ev(`Game.S().scene='camp';UI.render();`);
  const camp=await ev(`Array.from(document.querySelectorAll('.hotspot')).map(e=>({text:e.textContent,id:e.dataset.id,html:e.outerHTML.slice(0,250)}))`);
  fs.writeFileSync(path.join(out,'feedback-hotspots.json'),JSON.stringify(camp,null,2));
  await tap('.hotspot:first-child');
  await check('家具问号44像素触控目标',`(()=>{const e=document.querySelector('[data-help="furn"]');return e && e.getBoundingClientRect().width>=44 && e.getBoundingClientRect().height>=44;})()`);
  await tap('[data-help="furn"]');
  fs.writeFileSync(path.join(out,'feedback-help.txt'),await ev(`document.querySelector('#modal').textContent`));
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'mobile-help-debug.png'),Buffer.from(r.data,'base64')));
  await check('触控家具问号显示家具说明',`document.querySelector('#modal').textContent.includes('家具') && document.querySelector('#modal').textContent.includes('滤雨器')`);
  await check('非养蜂人也能在家具帮助看到蜂箱用途与身份限制',`document.querySelector('#modal').textContent.includes('蜂箱') && document.querySelector('#modal').textContent.includes('当前身份不可造') && document.querySelector('#modal').textContent.includes('每天清晨储存蜂蜜')`);
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'mobile-furniture.png'),Buffer.from(r.data,'base64')));
  await tap('#modal .modal-x'); await tap('[data-nav="craft"]');   // 说明面板底部关闭已移除，改点右上角 ×
  // 触屏批量操作仍可在圆形问号中查到，配方区无需常驻提示。
  await check('触屏隐藏「批量」按钮（改走长按「制作」）',
    `(()=>{const b=document.querySelector('[data-craftbatch]');return !!b && getComputedStyle(b).display==='none';})()`);
  await tap('[data-crafthelp="1"]');
  await check('圆形制作说明仍提示长按批量',
    `document.querySelector('#modal').textContent.includes('长按') && document.querySelector('#modal').textContent.includes('批量')`);
  await tap('#modal .modal-x'); await tap('[data-nav="craft"]');
  await check('制造显示树枝来源',`document.querySelector('#modal').textContent.includes('树枝')`);
  await longPress('[data-recipe="r_plank"]'); await tap('[data-cset="max"]');
  const old=await ev('JSON.stringify(Game.S().inv)'); await tap('#batch-do');
  await check('长批量确认弹窗保留且未扣材料',`!!document.querySelector('[data-choice="0"]') && JSON.stringify(Game.S().inv)===${JSON.stringify(old)}`);
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'mobile-batch-warning.png'),Buffer.from(r.data,'base64')));
  await tap('[data-choice="1"]'); await check('取消不消耗材料',`JSON.stringify(Game.S().inv)===${JSON.stringify(old)}`);
  await tap('[data-nav="craft"]');await longPress('[data-recipe="r_plank"]');
  await ev(`document.querySelector('#batch-n').value=40;document.querySelector('#batch-n').dispatchEvent(new Event('input'));`);
  const batchTick=await ev('Game.S().tick');const batchCost=await ev("Game.craftMinutes(RECIPES.find(r=>r.id==='r_plank'))*40");await tap('#batch-do');await tap('[data-choice="0"]');await check('确认长批量后播放制作动画',`document.querySelector('#busy').classList.contains('open')`);await sleep(3000);
  await check('手机批量制作实际扣除完整耗时',`Game.S().tick>=${batchTick}+${batchCost}`);
  await check('手机确认后实际完成批量制作',`Game.invCount('plank')>=40 && Game.invCount('wood')<200`);
  for(const [width,height] of [[667,375],[428,926]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await sleep(300);
    await check('视口不横向溢出 '+width+'x'+height,`document.documentElement.scrollWidth<=innerWidth+1`);
  }
  assert.equal(errors.length,0,errors.join('\n'));passed++;console.log('OK 手机交互无JS异常');
  await send('Emulation.setDeviceMetricsOverride',{width:926,height:428,deviceScaleFactor:1,mobile:true});
  await ev(`document.querySelector('#modal-close')?.click();Game.S().stats.hp=100;Game.S().death=undefined;Game.S().ending=undefined;Game.addItem('blackSword',1,true);Game.equip('blackSword');Game.S().buffs={atk:{v:3,until:(Game.S().tick||0)+100}};Game.startFight(ENEMIES.eagle,true);`);
  await sleep(500);await check('战斗显示距离且点击增益可查剩余时间',`(()=>{const b=[...document.querySelectorAll('[data-combat-buff]')].find(e=>e.textContent.includes('攻击'));if(!b)return false;b.click();const p=document.querySelector('#battle-buff-info'),ok=document.querySelector('#fight-status').textContent.includes('距离')&&p?.textContent.includes('100');p?.querySelector('button').click();return ok;})()`);
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'mobile-combat.png'),Buffer.from(r.data,'base64')));
  await ev(`Game.S().combat=null;Game.S().day=77;Game.S()._dirty=true;localStorage.setItem('guyuyizhang_rev',String(Game.S()._rev+1));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));`);
  await check('后台恢复冲突时保留本页未保存的进度',`Game.S().day===77 && document.querySelector('#modal').textContent.includes('另一个标签页')`);
  await ev(`localStorage.setItem('guyuyizhang_rev',String(Game.S()._rev));Game.newGame('fisher','normal');Game.S().stats.hp=0;Game.S().death='测试死亡备份';Game.S().ending='D';Game.backupSlot(0);Game.newGame('fisher','normal');Game.loadSlot(0);UI.begin();`);
  await check('死亡备份恢复显示结局和回溯入口',`!!document.querySelector('#ending-screen') && Game.S().ending==='D'`);
  assert.equal(errors.length,0,errors.join('\n'));
  // 真正阻断一个必需脚本，验证白屏情况下仍有诊断和原始备份入口。
  await send('Network.enable'); await send('Network.setBlockedURLs',{urls:['*js/game.js*']});
  await send('Emulation.setDeviceMetricsOverride',{width:428,height:926,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url});await sleep(2000);
  await check('启动脚本失败仍展示恢复入口',`!!document.querySelector('#boot-actions') && !document.querySelector('#boot-actions').hidden`);
  await ev('window.__guyuBoot.diagnostic()');
  await check('启动诊断包含错误和版本',`document.querySelector('#boot-diagnostic').value.includes(window.BUILD_VER) && document.querySelector('#boot-diagnostic').value.includes('错误')`);
  await check('竖屏横屏提示不遮挡启动抢救入口',`getComputedStyle(document.documentElement,'::after').display==='none'`);
  console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
}
main().catch(e=>{console.error(e.stack);console.log('RESULT:FAIL');process.exitCode=1;}).finally(async()=>{
  if(ws)ws.close(); if(browser){browser.kill();await sleep(800);}
  assert.equal(path.dirname(profile),os.tmpdir());fs.rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});
});
