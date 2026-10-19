/* 独立 Chrome 配置 + 模拟 Tap 宿主；不连接广告网络、不动玩家存档。 */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'../../孤屿遗章-游戏 - 发布'),out=path.resolve(__dirname,'../../回归测试/_out');
const {navigateGame}=require('../../回归测试/helpers/browser');
const CHROME=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-ads-'));
let port=Number(process.env.GUYU_ADS_DEBUG_PORT||0);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const json=u=>new Promise((resolve,reject)=>http.get(u,res=>{let s='';res.on('data',x=>s+=x);res.on('end',()=>{try{resolve(JSON.parse(s));}catch(e){reject(e);}});}).on('error',reject));
(async()=>{
 const ch=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run','--allow-file-access-from-files','--remote-debugging-port='+port,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
 try{
  let tab;for(let i=0;i<80&&!tab;i++){await sleep(250);try{if(!port)port=Number(fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);tab=(await json(`http://127.0.0.1:${port}/json/list`)).find(x=>x.type==='page');}catch(_){}}
  assert.ok(tab);const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let next=0,passed=0;const waiters=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&waiters.has(m.id)){waiters.get(m.id)(m);waiters.delete(m.id);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;waiters.set(id,m=>m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result));ws.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const x=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(x.exceptionDetails)throw Error(JSON.stringify(x.exceptionDetails));return x.result?.value;};
  const check=(name,value)=>{assert.ok(value,name);passed++;console.log('OK '+name);};

  await send('Page.enable');
  const standaloneHook=await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.GUYU_CHANNEL='standalone';window.sdkCalls=0;window.tap={createRewardedVideoAd:()=>{sdkCalls++;throw Error('removed SDK')},cloud:{save:()=>{sdkCalls++},load:()=>{sdkCalls++}}};`});
  await send('Emulation.setDeviceMetricsOverride',{width:667,height:375,deviceScaleFactor:1,mobile:true});
  await navigateGame(send,ev,'Page.navigate',{url:'file:///'+encodeURI(ROOT.replace(/\\/g,'/')+'/index.html')});
  console.log('独立版启动状态 '+JSON.stringify(await ev(`({ready:document.readyState,language:document.documentElement.lang,channel:window.GUYU_CHANNEL,preference:localStorage.getItem('guyuyizhang_language')})`)));
  check('独立版首次启动默认英文',await ev(`document.documentElement.lang==='en'`));
  await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.metaState().batchTipSeen=1;Game.metaState().soul=300;Game.metaState().adWallet={};UI.begin();`);await sleep(2800);
  const openShop=()=>ev(`document.querySelector('#modal .modal-x')?.click();document.querySelector('#nav [data-nav="save"]').click();document.querySelector('[data-savemenu="adshop"]').click();`);
  await openShop();
  check('商城两种兑换方向及六商品、十二柜格',await ev(`document.querySelectorAll('[data-adbuy]').length===6&&document.querySelector('.shop-cabinet').children.length===12&&!!document.querySelector('[data-soulexchange]')&&!!document.querySelector('[data-adexchange]')&&!document.querySelector('#watch-reward-ad')`));
  check('命名牌商品价格为3点且图片可显示',await ev(`(()=>{const b=document.querySelector('[data-adbuy="namecard"]');return !!b&&b.querySelector('.cabinet-price').textContent.trim()==='◇ 3'&&!!b.querySelector('.item-icon');})()`));
  fs.mkdirSync(out,{recursive:true});
  const tap=async sel=>{await sleep(400);await ev(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({block:'center',behavior:'instant'})`);await sleep(100);const p=await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}),r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;return{x,y,hit:e.contains(document.elementFromPoint(x,y))}})()`);check('实际可点击 '+sel,p.hit);await send('Input.dispatchMouseEvent',{type:'mousePressed',x:p.x,y:p.y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x,y:p.y,button:'left',clickCount:1});await sleep(400);};
  await ev(`document.querySelector('#star-exchange-qty').value='4'`);await tap('[data-soulexchange]');
  check('界面批量兑换扣60魂点加4星点',await ev(`Game.metaState().soul===240&&Game.adCoinBalance()===4`));
  await ev(`document.querySelector('#star-exchange-qty').value='2'`);await tap('[data-adexchange]');
  check('反向兑换加30魂点扣2星点',await ev(`Game.metaState().soul===270&&Game.adCoinBalance()===2`));
  for(const [width,height,mobile] of [[667,375,true],[844,390,true],[1366,768,false]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});await openShop();await sleep(2600);
   const report=await ev(`(()=>{const fail=[];for(const e of document.querySelectorAll('.cabinet-product,#star-exchange-qty,[data-soulexchange],[data-adexchange],.shop-title summary,#modal .modal-x')){const r=e.getBoundingClientRect(),h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);if(!r.width||r.left<0||r.top<0||r.right>innerWidth||r.bottom>innerHeight||!e.contains(h))fail.push(e.outerHTML);}return fail;})()`);
   if(report.length)console.log(JSON.stringify(report));
   check('全部商城操作一屏可见且可点 '+width,report.length===0);
   check('弹窗刷新场景不穿透 '+width,await ev(`(()=>{for(let i=0;i<5;i++)UI.render();return getComputedStyle(document.querySelector('#scene-img')).visibility==='hidden';})()`));
   await ev(`Promise.all([...document.querySelectorAll('.cabinet-product img')].map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=i.onerror=r})))`);
   const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(out,'standalone-shop-'+width+'.png'),Buffer.from(shot.data,'base64'));
  }
  await ev(`document.querySelector('#star-exchange-qty').value='13'`);await tap('[data-soulexchange]');await tap('[data-adbuy="divinePack"]');
  check('兑换后的星点可以购买并寄到邮箱',await ev(`Game.metaState().soul===75&&Game.adCoinBalance()===0&&Game.mailboxList().some(x=>x.item==='divinePack')`));
  await ev(`document.querySelector('#modal .modal-x').click();document.querySelector('#nav [data-nav="save"]').click();document.querySelector('[data-savemenu="backup"]').click();`);
  check('备份页无广告免费备份入口',await ev(`!document.querySelector('[data-adbackup]')&&!document.querySelector('#watch-reward-ad')`));
  await ev(`document.querySelector('#modal .modal-x').click();Game.S().stats.hp=0;Game.die('test');`);
  check('死亡页无广告复活入口',await ev(`!document.querySelector('#end-adrevive')`));
  check('全过程不调用Tap SDK',await ev(`sdkCalls===0&&typeof TapAds==='object'&&!TapAds.enabled()&&!Game.adRewardState().canClaim&&Game.cloudStatus().supported===false`));
  await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:standaloneHook.identifier});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.GUYU_CHANNEL='taptap';localStorage.removeItem('guyuyizhang_language');window.sdkCalls=0;window.adShows=0;window.tap={createRewardedVideoAd:()=>{sdkCalls++;return {onLoad:()=>{},onError:f=>window.adError=f,onClose:f=>window.adClose=f,load:()=>Promise.resolve(),show:()=>{adShows++;return Promise.resolve()}}}};`});
  await navigateGame(send,ev,'Page.reload');
  check('Tap首次默认中文',await ev(`document.documentElement.lang==='zh-CN'`));
  await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.metaState().batchTipSeen=1;Game.metaState().adWallet={};Game.metaState().adRewardDays={};UI.begin();`);await sleep(2800);
  await openShop();await sleep(500);
  check('Tap商城显示广告币及真实帮助文字',await ev(`Game.adCurrencyName()==='广告币'&&document.querySelector('[data-soulexchange]').textContent==='换广告币'&&document.querySelector('.shop-title').textContent.includes('15 魂点兑换 1 广告币')&&!document.querySelector('.shop-title').textContent.includes('currency')`));
  for(const [width,height,mobile] of [[667,375,true],[844,390,true],[1366,768,false]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});await openShop();await sleep(700);
   check('Tap广告入口与全部商品一屏可见 '+width,await ev(`(()=>{const es=[...document.querySelectorAll('#watch-reward-ad,[data-adbuy]')];return es.length===7&&es.every(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&e.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))})})()`));
   const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(out,'tap-shop-'+width+'.png'),Buffer.from(shot.data,'base64'));
  }
  await tap('#watch-reward-ad');
  check('播放期间暂停且禁止弹窗操作',await ev(`adShows===1&&Game.timeFrozen()&&document.querySelector('#modal .modal-content').inert`));
  await ev(`adClose({isEnded:false})`);await sleep(600);
  check('提前关闭不发奖且解除操作锁',await ev(`Game.adCoinBalance()===0&&Game.adRewardState().uses===0&&!document.querySelector('#modal .modal-content').inert`));
  await tap('#watch-reward-ad');await ev(`adClose({isEnded:true});adClose({isEnded:true})`);await sleep(600);
  check('完整观看仅发一份3至6币并更新次数',await ev(`Game.adCoinBalance()>=3&&Game.adCoinBalance()<=6&&Game.adRewardState().uses===1&&document.querySelector('#watch-reward-ad').textContent.includes('1/5')&&!document.querySelector('#modal .modal-content').inert`));
  check('Tap全过程只创建一个SDK实例',await ev(`sdkCalls===1&&adShows===2`));
  ws.close();console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
 }finally{ch.kill();}
})().catch(e=>{console.error(e);console.log('RESULT:FAIL');process.exitCode=1;});
