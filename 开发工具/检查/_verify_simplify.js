/* 独立 Chrome 配置；验证界面精简、无滑动时全部热点可达与手机排版。 */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'../../孤屿遗章-游戏 - 发布'),out=path.resolve(__dirname,'../../回归测试/_out');
const CHROME=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',port=9664,profile=path.join(os.tmpdir(),'guyu_simplify_'+process.pid);
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
  await ev(`document.querySelector('#modal .modal-x')?.click();Game.metaState().batchTipSeen=1;UI.render();`);
  check('topbar no guide/mail, objectives hidden initially',await ev(`!document.querySelector('#topbar #btn-guide,#topbar #btn-mail')&&!document.querySelector('#objective').textContent.trim()`));
  await ev(`document.querySelector('#nav [data-nav="save"]').click();`);
  check('menu entries guide mail and no restart',await ev(`!!document.querySelector('[data-savemenu="guide"]')&&!!document.querySelector('[data-savemenu="mail"]')&&!document.querySelector('[data-savemenu="restart"]')`));
  await ev(`document.querySelector('[data-savemenu="settings"]').click();document.querySelector('[data-set="sceneScroll"]').click();document.querySelector('#modal-close').click();`);
  check('scroll setting persists off',await ev(`localStorage.getItem('guyuyizhang_scene_scroll')==='0'`));
  check('关闭小场景滑动后大地图仍可上下拖动',await ev(`(async()=>{document.querySelector('#btn-backmap').click();const img=document.querySelector('#map-img');if(!img.complete)await new Promise(r=>{img.addEventListener('load',r,{once:true})});await new Promise(r=>setTimeout(r,300));const before=img.getBoundingClientRect().top;document.querySelector('#map-wrap').dispatchEvent(new WheelEvent('wheel',{deltaY:80,bubbles:true,cancelable:true}));const first=img.getBoundingClientRect().top;document.querySelector('#map-wrap').dispatchEvent(new WheelEvent('wheel',{deltaY:-80,bubbles:true,cancelable:true}));const after=img.getBoundingClientRect().top;document.querySelector('#btn-backmap').click();return Math.max(Math.abs(after-before),Math.abs(first-before))>5;})()`));

  for(const [width,height,mobile] of [[844,390,true],[667,375,true],[1920,900,false]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
    const report=await ev(`(async()=>{
      const fail=[];let scenes=0,points=0;const s=Game.S();s.tut=null;s.equipment.cloth='diveSuit2';s.toolkit=['lightStrong','diveMask'];s.inv.lightStrong=1;s.inv.diveMask=1;
      for(const sc of Object.values(SCENES))for(const zone of sc.zones?Object.keys(sc.zones):[null]){
        s.scene=sc.id;s.zone=zone;s.day=70;s.minute=600;UI.render();await new Promise(r=>setTimeout(r,140));
        const img=document.querySelector('#scene-img');if(img&&!img.complete)await new Promise(r=>{img.addEventListener('load',r,{once:true});setTimeout(r,2000)});
        if(sc.id==='atlantis'){
          if([...document.querySelectorAll('.hotspot')].some(p=>p.textContent.includes('大地图')))fail.push(sc.id+'/'+zone+':duplicate map hotspot');
          const b=document.querySelector('#btn-backmap'),q=b?.getBoundingClientRect();
          if(!q||q.width<=0||q.top<0||q.bottom>innerHeight||!b.contains(document.elementFromPoint(q.left+q.width/2,q.top+q.height/2)))fail.push(sc.id+'/'+zone+':back button unreachable');
          if(b){b.click();if(!document.body.classList.contains('on-map')||!document.querySelector('#map-img'))fail.push(sc.id+'/'+zone+':back did not open map');b.click();if(document.body.classList.contains('on-map'))fail.push(sc.id+'/'+zone+':return did not restore scene');}
        }
        const stage=document.querySelector('#scene-wrap'),r=stage?.getBoundingClientRect();if(!r)continue;scenes++;
        if(document.querySelector('#crop-shortcuts'))fail.push(sc.id+'/'+zone+':extra shortcuts');
        const actualImg=document.querySelector('#scene-img');if(actualImg?.naturalWidth){const q=actualImg.getBoundingClientRect();if(Math.abs(q.width/q.height-actualImg.naturalWidth/actualImg.naturalHeight)>0.001)fail.push(sc.id+'/'+zone+':image stretched');if(q.width<r.width-2||q.height<r.height-2)fail.push(sc.id+'/'+zone+':image did not fill viewport');}

        for(const p of document.querySelectorAll('.hotspot')){
          const q=p.getBoundingClientRect();if(q.width===0||q.height===0)continue;points++;
          if(getComputedStyle(p).display==='none'||p.classList.contains('crop-hidden'))fail.push(sc.id+'/'+zone+':hotspot hidden');
          if(!p.closest('#hotspots'))fail.push(sc.id+'/'+zone+':hotspot relocated');

        }
        const title=document.querySelector('#scene-name'),grip=document.querySelector('#log-grip');
        if(title&&grip&&title.getBoundingClientRect().left<grip.getBoundingClientRect().right)fail.push(sc.id+':title overlap');
      }return {fail,scenes,points};})()`);
    console.log('FIT '+width,JSON.stringify(report));check('scene crop preserves aspect and original hotspots '+width,report.fail.length===0 && report.points>30);
    await ev(`Game.S().scene='camp';Game.S().zone=null;Game.S().statuses.bleed=3;Game.S().statuses.nauseaUntil=Game.S().tick+700;Game.S().buffs={atk:{v:3,until:Game.S().tick+700}};UI.render();`);
    check('all buffs share top-right container '+width,await ev(`(()=>{const b=document.querySelector('#status-badges'),r=b.getBoundingClientRect();return r.right<=innerWidth&&r.left>innerWidth/2&&b.textContent.includes('反胃')&&b.textContent.includes('攻击')&&!b.textContent.includes('+3');})()`));
    await shot('simplify-camp-'+width);
  }
  check('强化徽标点击显示数值与持续时间',await ev(`(()=>{const b=[...document.querySelectorAll('[data-buff-info]')].find(e=>e.textContent==='攻击');if(!b)return false;b.click();const t=document.querySelector('#modal').textContent,ok=t.includes('+3')&&t.includes('分');document.querySelector('#modal-close')?.click();return ok;})()`));
  await send('Emulation.setDeviceMetricsOverride',{width:667,height:375,deviceScaleFactor:1,mobile:true});await sleep(300);
  check('裁切只保留原位篝火且无左上角复制入口',await ev(`(()=>{Game.S().scene='camp';Game.S().zone=null;UI.render();const p=[...document.querySelectorAll('#hotspots>.hotspot')].find(e=>e.textContent.includes('篝火'));if(!p||document.querySelector('#crop-shortcuts')||getComputedStyle(p).display==='none')return false;p.click();const ok=!!document.querySelector('.work-modal');document.querySelector('#modal .modal-x')?.click();return ok;})()`));
  await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
  await ev(`document.querySelector('#nav [data-nav="save"]').click();document.querySelector('[data-savemenu="settings"]').click();document.querySelector('[data-set="sceneScroll"]').click();document.querySelector('#modal-close').click();`);
  check('scroll enabled still has no duplicate underwater map hotspot',await ev(`(async()=>{const s=Game.S();for(const zone of Object.keys(Game.sceneOf('atlantis').zones)){s.scene='atlantis';s.zone=zone;UI.render();await new Promise(r=>setTimeout(r,140));if([...document.querySelectorAll('.hotspot')].some(p=>p.textContent.includes('大地图')))return false;}return localStorage.getItem('guyuyizhang_scene_scroll')==='1';})()`));
  await shot('simplify-underwater-no-map-mobile');
  await ev(`Game.S().scene='camp';Game.S().zone=null;UI.render();`);
  await ev(`document.querySelector('#nav [data-nav="craft"]').click();`);
  check('mobile craft buttons reduced to 29px',await ev(`[...document.querySelectorAll('.recipe-actions .mini-btn')].filter(b=>b.offsetHeight>0).every(b=>b.getBoundingClientRect().height<=30)&&document.querySelectorAll('.recipe-actions .mini-btn').length>0`));
  await shot('simplify-craft-mobile');
  await ev(`document.querySelector('#modal .modal-x').click();document.querySelector('#nav [data-nav="save"]').click();document.querySelector('[data-savemenu="mail"]').click();document.querySelector('[data-mailtab="guide"]').click();`);
  check('mail guide no obsolete crop +2',await ev(`!document.querySelector('#modal').textContent.includes('统一 +2')&&document.querySelector('#modal').textContent.includes('2~3 个药草')`));
  await ev(`document.querySelector('[data-mailtab="event"]').click();`);
  check('event ad last and concise namecard',await ev(`(()=>{const m=document.querySelector('#modal'),t=m.textContent;return t.indexOf('小广告')>t.indexOf('命名牌')&&!t.includes('伤害永久+1');})()`));
  await ev(`document.querySelector('#modal-close').click();Game.S().scene='atlantis';Game.S().zone='shipwreck';UI.render();[...document.querySelectorAll('.hotspot')].find(b=>b.textContent.includes('神秘人鱼')).click();`);
  check('no listen button and portrait is accessible',await ev(`!document.querySelector('.voice-replay')&&!!document.querySelector('.merchant-portrait[role=button][tabindex="0"]')`));
  await ev(`window.voiceBefore=testVoices.length;document.querySelector('.merchant-portrait').click();`);
  check('portrait speaks merchant line',await ev(`testVoices.length===voiceBefore+1`));
  await shot('simplify-merchant-mobile');
  ws.close();console.log('通过 '+passed+' 项，失败 0 项\nRESULT:PASS');
 }finally{
  ch.kill();await sleep(400);
  const expected=path.resolve(os.tmpdir(),'guyu_simplify_'+process.pid);
  if(path.resolve(profile)===expected)try{fs.rmSync(expected,{recursive:true,force:true});}catch(_){}
 }
})().catch(e=>{console.error(e);console.log('RESULT:FAIL');process.exitCode=1;});
