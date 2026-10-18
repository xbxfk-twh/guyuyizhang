/* 独立 Chrome 配置；验证抽取幂等、可操作性与横屏双列货架。 */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'../../孤屿遗章-游戏 - 发布'),out=path.resolve(__dirname,'../../回归测试/_out');
const CHROME=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',port=9654,profile=path.join(os.tmpdir(),'guyu_trade_'+process.pid);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const json=u=>new Promise((resolve,reject)=>http.get(u,res=>{let s='';res.on('data',x=>s+=x);res.on('end',()=>{try{resolve(JSON.parse(s));}catch(e){reject(e);}});}).on('error',reject));
(async()=>{
 const ch=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run','--allow-file-access-from-files','--remote-debugging-port='+port,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
 try{
  let tab;for(let i=0;i<80&&!tab;i++){await sleep(250);try{tab=(await json(`http://127.0.0.1:${port}/json/list`)).find(x=>x.type==='page');}catch(_){}}
  assert.ok(tab,'Chrome started');const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let next=0;const waiters=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&waiters.has(m.id)){waiters.get(m.id)(m);waiters.delete(m.id);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;waiters.set(id,m=>m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result));ws.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const x=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(x.exceptionDetails)throw Error(JSON.stringify(x.exceptionDetails));return x.result?.value;};
  await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url:'file:///'+encodeURI(ROOT.replace(/\\/g,'/')+'/index.html')});await sleep(1100);
  await ev(`localStorage.setItem('guyuyizhang_skin',JSON.stringify(['seasons']));`);await send('Page.reload');await sleep(1100);
  await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().inv.beibi=10000;Game.S().inv.coin=100;Game.S().inv.honey=300;Game.S().capacity=999;UI.begin();window.testVoices=[];AudioFX.playVoice=(who,i)=>testVoices.push(who+'-'+i);`);
  fs.mkdirSync(out,{recursive:true});let passed=0;
  const check=(name,value)=>{assert.ok(value,name);passed++;console.log('OK '+name);};
  const shot=async name=>{await sleep(150);const x=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(x.data,'base64'));};
  await sleep(2600);
  await ev(`document.querySelector('#modal .modal-x')?.click();Game.metaState().batchTipSeen=1;Game.S().minute=480;Game.S().laochao.arrived=true;UI.render();[...document.querySelectorAll('.action-btn')].find(x=>x.textContent.includes('老潮'))?.click();`);
  const trade=await ev(`(()=>{const c=document.querySelector('.merchant-modal');return {exists:!!c,cols:getComputedStyle(document.querySelector('.trade-cards')).gridTemplateColumns,overflow:c.scrollWidth-c.clientWidth,body:document.querySelector('.merchant-layout').getBoundingClientRect().toJSON(),width:c.clientWidth,overflowElements:[...c.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>c.getBoundingClientRect().right+1).map(e=>[e.className,e.getBoundingClientRect().width]).slice(0,8)}})()`);
  console.log('TRADE',JSON.stringify(trade));await shot('trade-mobile');check('two columns, no horizontal overflow',trade.exists&&trade.cols.split(' ').length===2&&trade.overflow<=1);
  await ev(`document.querySelector('[data-ttab="sell"]').click()`);
  check('sell tab retains portrait and card layout',await ev(`!!document.querySelector('.merchant-person')&&!!document.querySelector('.trade-cards')`));
  await ev(`document.querySelector('#modal-close').click();const s=Game.S();s.scene='atlantis';for(let d=1;d<30;d++){s.day=d;if(Game.lotteryState().active)break;}s.zone=Game.lotteryState().zone;UI.render();[...document.querySelectorAll('.hotspot')].find(x=>x.textContent.includes('遗海交换机')).click();`);
  check('lottery uses no editable number fields',await ev(`!document.querySelector('#modal input[type=number]')&&!!document.querySelector('[data-lottery-pick]')`));
  await ev(`document.querySelector('[data-lottery-pick]').click();document.querySelector('[data-lottery-cat="food"]').click()`);
  check('inventory category filter',await ev(`[...document.querySelectorAll('[data-lottery-item]')].every(e=>ITEMS[e.dataset.lotteryItem].cat==='food')&&document.querySelectorAll('[data-lottery-item]').length>0`));
  await ev(`document.querySelector('[data-lottery-item="honey"]').click();document.querySelector('[data-lottery-change="qty:-1"]').click()`);
  check('zero and 25/50 presets removed, quantity clamps to one without consuming',await ev(`document.querySelector('#lottery-qty').textContent==='1'&&!document.querySelector('[data-lottery-set="qty:0"]')&&!document.querySelector('[data-lottery-set="times:0"],[data-lottery-set="times:25"],[data-lottery-set="times:50"]')&&Game.invCount('honey')===300`));
  await ev(`document.querySelector('#lottery-submit').click();document.querySelector('[data-choice="0"]').click();`);
  check('partial deposit stores 35 value without a draw or animation',await ev(`Game.lotteryState().credit===35&&Game.lotteryState().uses===0&&Game.invCount('honey')===299&&!!document.querySelector('#lottery-submit')`));
  await ev(`document.querySelector('[data-lottery-set="qty:100"]').click()`);
  check('charge and draw are separate; no step-size or count selector',await ev(`document.querySelector('#lottery-qty').textContent==='100'&&document.querySelectorAll('.lottery-split>section').length===2&&!document.querySelector('#lottery-times,[data-lottery-step]')&&document.querySelector('[data-lottery-draw="10"]').textContent.includes('十连抽')&&document.querySelector('[data-lottery-draw="10"]').disabled`));
  for(const [width,height,mobile] of [[844,390,true],[667,375,true],[1920,900,false]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});await sleep(300);
    const bad=await ev(`[...document.querySelectorAll('.lottery-split button,.lottery-split output,.lottery-modal .modal-actions button')].filter(b=>{const r=b.getBoundingClientRect(),h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return r.width<=0||r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight||!b.contains(h);}).map(b=>b.outerHTML)`);
    console.log('CONTROLS '+width,JSON.stringify(bad));check('all charge/draw controls visible, not overlapping '+width,bad.length===0);await shot('lottery-split-'+width);
  }
  await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
  await shot('lottery-mobile');
  check('submit fits the mobile viewport without scrolling',await ev(`(()=>{const b=document.querySelector('#lottery-submit'),r=b.getBoundingClientRect();return r.bottom<=innerHeight&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===b;})()`));
  await ev(`document.querySelector('[data-lottery-pool]').click()`);
  check('pool lists three equal-item tiers and tenth-draw guarantee',await ev(`document.querySelector('#modal').textContent.includes('第 10 抽')&&document.querySelectorAll('.lottery-pool section').length===3&&document.querySelector('.lottery-pool').textContent.includes('广告币')&&document.querySelector('.lottery-pool').textContent.includes('70%')`));
  await shot('lottery-pool-mobile');
  await ev(`document.querySelector('[data-lottery-back]').click();document.querySelector('#lottery-submit').click();window.oldConfirm=document.querySelector('[data-choice="0"]');oldConfirm.click();oldConfirm.click();`);
  check('large charge does not draw or double-consume',await ev(`Game.lotteryState().uses===0&&Game.invCount('honey')===199&&Game.lotteryState().credit===3535&&!!document.querySelector('#lottery-submit')`));
  await ev(`document.querySelector('[data-lottery-draw="10"]').click();`);
  check('confirmation commits exactly ten draws and preserves remainder',await ev(`Game.lotteryState().uses===10&&Game.invCount('honey')>=199&&Game.invCount('honey')<=239&&Game.lotteryState().credit===2535`));
  await shot('lottery-animation');await ev(`document.querySelector('[data-lottery-skip]')?.click();document.querySelector('[data-lottery-skip]')?.click()`);
  check('skip reveals without another transaction',await ev(`Game.lotteryState().uses===10&&!!document.querySelector('.is-revealed')&&Game.timeFrozen()`));await shot('lottery-result');
  await ev(`document.querySelector('[data-lottery-back]').click();document.querySelector('[data-lottery-last]').click()`);
  check('last result cannot reroll',await ev(`Game.lotteryState().uses===10&&!!document.querySelector('.is-revealed')`));
  await ev(`document.querySelector('[data-lottery-back]').click();window.preBalanceHoney=Game.invCount('honey');document.querySelector('[data-lottery-draw="10"]').click();document.querySelector('[data-lottery-skip]')?.click();`);
  check('balance-only draw spends credit without consuming more selected material',await ev(`Game.lotteryState().uses===20&&Game.lotteryState().credit===1535&&Game.invCount('honey')>=preBalanceHoney`));
  await ev(`document.querySelector('#modal-close').click();Game.S().zone='shipwreck';UI.render();[...document.querySelectorAll('.hotspot')].find(x=>x.textContent.includes('神秘人鱼')).click()`);
  check('masked female identity with voice',await ev(`document.querySelector('.merchant-person').textContent.includes('神秘人鱼')&&document.querySelector('.merchant-goods').textContent.includes('她坐')&&testVoices.includes('fishman-0')`));await shot('mermaid-mobile');
  for(const [width,height,mobile] of [[667,375,true],[1920,900,false]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
   const ok=await ev(`(()=>{const c=document.querySelector('.merchant-modal');return c.scrollWidth<=c.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth})()`);check('trade fits '+width,ok);await shot('mermaid-'+width);
  }
  check('local voice, foley and ambient MP3 decode in Chrome',await ev(`(async()=>{const paths=['voices/fishman-0','voices/linghui-0','sfx/hit','ambient/rain','ambient/surf'];const ok=await Promise.all(paths.map(p=>new Promise(resolve=>{const a=new Audio('assets/audio/'+p+'.mp3');const timer=setTimeout(()=>resolve(false),5000);a.onloadedmetadata=()=>{clearTimeout(timer);resolve(a.duration>0);};a.onerror=()=>{clearTimeout(timer);resolve(false);};a.load();})));return ok.every(Boolean);})()`));
  await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
  await ev(`document.querySelector('#modal-close').click();const saltState=Game.S();saltState.inv.salt=2;saltState.inv.seasalt=3;Game.save();Game.load();Game.S().scene='shore';Game.S().zone='saltTown';Game.S().fame=5;UI.render();[...document.querySelectorAll('.hotspot')].find(x=>x.textContent.includes('集市')).click();document.querySelector('[data-shop="grocer"]').click();`);
  check('old sea salt merges into salt and town offers both buy and sell',await ev(`Game.invCount('salt')===5&&!Game.invCount('seasalt')&&!!document.querySelector('[data-tbuy="grocer:salt"]')&&!!document.querySelector('[data-tsell="salt"]')&&!document.querySelector('[data-tsell="seasalt"]')&&!document.querySelector('#modal').textContent.includes('海盐')`));
  await shot('salt-town-mobile');
  const saltButton=await ev(`(()=>{const b=document.querySelector('[data-tsell="salt"]');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...saltButton});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...saltButton});
  check('merged salt can be sold through actual town button',await ev(`Game.invCount('salt')===4`));
  ws.close();console.log('通过 '+passed+' 项，失败 0 项\nRESULT:PASS');
 }finally{ch.kill();}
})().catch(e=>{console.error(e);console.log('RESULT:FAIL');process.exitCode=1;});
