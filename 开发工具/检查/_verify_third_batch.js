/* 第三批体验功能真实浏览器探针：独立 Chrome 配置，不碰玩家数据。 */
const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),assert=require('node:assert/strict');
const {spawn}=require('child_process');
const root=path.resolve(__dirname,'../..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-third-'));
const port=9497,out=path.join(root,'回归测试/_out');fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const json=url=>new Promise((resolve,reject)=>http.get(url,r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{resolve(JSON.parse(b));}catch(e){reject(e);}});}).on('error',reject));
let browser,ws,passed=0;const errors=[];
async function main(){
  browser=spawn(process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--allow-file-access-from-files','--remote-debugging-port='+port,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
  let tab;for(let i=0;i<60&&!tab;i++){await sleep(200);try{tab=(await json('http://127.0.0.1:'+port+'/json/list')).find(t=>t.type==='page');}catch{}}
  assert.ok(tab,'Chrome not ready');ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let next=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);};
  const send=(method,params={})=>new Promise((r,j)=>{const id=++next;pending.set(id,m=>m.error?j(Error(JSON.stringify(m.error))):r(m.result));ws.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
  const check=async(name,expression)=>{assert.ok(await ev(expression),name);passed++;console.log('OK '+name);};
  await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:926,height:428,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true});
  const url=require('url').pathToFileURL(path.join(process.env.GUYU_GAME_ROOT||path.join(root,'孤屿遗章-游戏 - 发布'),'index.html')).href;await send('Page.navigate',{url});await sleep(2200);
  await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().capacity=999;UI.begin();document.querySelector('#modal [data-choice]')?.click();`);await sleep(2700);
  // 已有弹窗时触发危险提醒，不能顶掉玩家正在看的内容。
  await ev(`document.querySelector('[data-nav="craft"]').click();Game.S().stats.hp=20;Game.S().stats.hunger=20;Game.change();`);await sleep(250);
  await check('危险提醒不会顶掉已打开的制造面板',`document.querySelector('#modal').classList.contains('open')&&!document.querySelector('#modal').textContent.includes('状态危殆')&&document.querySelector('#floating-notice').classList.contains('show')&&document.querySelector('#floating-notice').textContent.includes('生命只剩')`);
  await ev(`document.querySelector('#modal .modal-x')?.click();Game.metaState().batchTipSeen=0;Game.S().stats.hp=100;Game.S().stats.hunger=100;Game.S().scene='camp';Game.S().zone=null;Game.S().minute=480;Game.S().laochao.arrived=true;Game.S().inv.beibi=125;Game.S().inv.coin=0;UI.render();`);await sleep(300);
  await check('营地能看到与老潮交易入口',`Array.from(document.querySelectorAll('.action-btn')).some(e=>e.textContent.includes('与老潮交易'))`);
  await ev(`Array.from(document.querySelectorAll('.action-btn')).find(e=>e.textContent.includes('与老潮交易')).click()`);await sleep(250);
  await ev(`document.querySelector('[data-ttab="sell"]').click()`);await sleep(250);
  // ⚠️ 契约变更（2026-09-25）：原来断言"明确单向、金币不能换回贝壳"→ 现在双向；
  //    后来作者又定稿成"沿用出售那一套"（点一下换 1 份、长按批量、只写固定单价、没有说明文字），
  //    所以这里断言的是：两个方向各一行、都写明固定单价（50 贝壳 / 30 贝壳）。
  await check('兑换入口位于老潮出售页且两个方向都写明了固定单价',`document.querySelector('#modal').textContent.includes('贝壳换金币')&&document.querySelector('#modal').textContent.includes('50 贝壳')&&document.querySelector('#modal').textContent.includes('金币换贝壳')&&document.querySelector('#modal').textContent.includes('30 贝壳')`);
  await check('触屏首次商店提示与真实长按操作一致',`document.querySelector('#floating-notice').textContent.includes('长按买/卖/制造')`);
  // 作者 2026-09-25 截图反馈："右下角还是没颜色" ——
  //   美化层把 #scene-actions 的浮层按钮改成了**浅底**，但文字还是深底用的浅色（--paper），
  //   于是禁用态的「建一级瞭望台」整颗按钮就是个空白米色块（对比度实测 1.1）。
  //   这里按 WCAG 相对亮度量每一颗按钮：字色对按钮自己的底色必须 ≥4.5（启用态/禁用态都量）。
  await check('右下角动作按钮的字色和底色对比度 ≥4.5（不再出现浅字压浅底）',`(()=>{
    const lum=(c)=>{const m=String(c).match(/[\\d.]+/g)||[0,0,0];const f=m.slice(0,3).map(v=>{v=Number(v)/255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*f[0]+0.7152*f[1]+0.0722*f[2];};
    const ratio=(a,b)=>{const l1=lum(a),l2=lum(b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);};
    const btns=[...document.querySelectorAll('#scene-actions .action-btn')];
    if(!btns.length) return false;
    window.__btnContrast = btns.map(b=>{const cs=getComputedStyle(b);return {t:b.textContent.trim().slice(0,10), dis:b.classList.contains('disabled'), c:cs.color, bg:cs.backgroundColor, r:Math.round(ratio(cs.color,cs.backgroundColor)*100)/100};});
    return window.__btnContrast.every(x=>x.r>=4.5);
  })()`);
  // ⚠️ 2026-09-25 契约变更（作者定稿："沿用前面的出售，没有单独批量，而是长按批量"）：
  //    原来这里有"换 1 枚 + 单独的『全部』按钮（共 4 个）"，现在每个方向只剩一个「卖出」，
  //    轻点 = 换 1 份、长按 = 批量面板；「全部」和它的二次确认弹窗一起删了。
  await check('两个方向各一个「卖出」按钮、触控区都 ≥40px，且不再有单独的「全部」',`(()=>{const a=[...document.querySelectorAll('[data-exshell]')],b=[...document.querySelectorAll('[data-exgold]')];return a.length===1&&b.length===1&&a[0].dataset.exshell==='1'&&b[0].dataset.exgold==='1'&&[...a,...b].every(e=>e.getBoundingClientRect().height>=40);})()`);
  // bindPress 绑的是指针事件，el.click() 不触发 —— 必须真派发 pointerdown/pointerup。
  await ev(`(async()=>{const b=document.querySelector('[data-exshell="1"]'),r=b.getBoundingClientRect(),o={bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2};b.dispatchEvent(new PointerEvent('pointerdown',o));await new Promise(x=>setTimeout(x,520));b.dispatchEvent(new PointerEvent('pointerup',o));})()`);await sleep(450);
  await check('长按「卖出」弹批量面板、且此时还没扣贝壳',`!!document.querySelector('#batchn-n')&&document.querySelector('#batchn-n').max==='2'&&Game.invCount('beibi')===125&&Game.invCount('coin')===0`);
  await ev(`(()=>{const sl=document.querySelector('#batchn-n');sl.value=2;sl.dispatchEvent(new Event('input',{bubbles:true}));})()`);await sleep(200);
  await ev(`document.querySelector('#batchn-do').click()`);await sleep(350);
  await check('确定后按 125 贝壳换 2 金币并留下 25 贝壳',`Game.invCount('coin')===2&&Game.invCount('beibi')===25`);
  // 贝壳只剩 25（<50）时按钮直接置灰 —— 和出售行"有 0 就置灰"是同一套做法，行内已写「有 25」+单价 50。
  await check('贝壳不足一个单价时按钮置灰、且不弹任何确认',`(()=>{const b=document.querySelector('[data-exshell="1"]');return !!b&&b.disabled&&!document.querySelector('#modal [data-choice]');})()`);
  await check('老潮交易弹窗在手机横屏无横向溢出',`(()=>{const c=document.querySelector('#modal .modal-content');return c.scrollWidth<=c.clientWidth+1;})()`);
  await ev(`document.querySelector('#modal .modal-content').scrollTop=document.querySelector('#modal .modal-content').scrollHeight`);await sleep(100);
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,'third-batch-laochao-926x428.png'),Buffer.from(r.data,'base64')));
  assert.equal(errors.length,0,errors.join('\n'));console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
}
main().catch(e=>{console.error(e.stack);console.log('RESULT:FAIL');process.exitCode=1;}).finally(async()=>{if(ws)ws.close();if(browser){browser.kill();await sleep(700);}fs.rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200});});
