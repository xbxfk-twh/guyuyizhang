/* Real independent Chrome checks: challenge selection, soul workshop and boss. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-battle-')),port=9593;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const json=url=>new Promise((res,rej)=>http.get(url,r=>{let s='';r.on('data',x=>s+=x);r.on('end',()=>{try{res(JSON.parse(s));}catch(e){rej(e);}});}).on('error',rej));
let passed=0,fail=0,ws,ch;const errors=[];
(async()=>{try{
 ch=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--allow-file-access-from-files','--remote-debugging-port='+port,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
 let tab;for(let i=0;i<80&&!tab;i++){await sleep(200);try{tab=(await json('http://127.0.0.1:'+port+'/json/list')).find(t=>t.type==='page');}catch{}}
 assert.ok(tab);ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let seq=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);};
 const send=(method,params={})=>new Promise((r,j)=>{const id=++seq;pending.set(id,m=>m.error?j(Error(JSON.stringify(m.error))):r(m.result));ws.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
 const check=async(name,expr)=>{const ok=await ev(expr);if(!ok){await shot('battle-ui-failure.png');}assert.ok(ok,name);passed++;console.log('OK '+name);};
 const shot=async(name)=>{const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name),Buffer.from(r.data,'base64'));};
 const until=async(expr)=>{for(let i=0;i<100;i++){if(await ev(expr))return;await sleep(100);}throw Error('timeout: '+expr);};
 const idle=()=>until(`!!document.querySelector('[data-fact="defend"]')&&!document.querySelector('[data-fact="defend"]').disabled`);
 await send('Runtime.enable');await send('Page.enable');
 for(const [w,h]of (process.env.BATTLE_PREVIEW_ONLY?[[667,375]]:[[667,375],[844,390],[1920,900],[390,844]])){
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<1000});
  await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(1500);
  await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().capacity=999;UI.begin();`);
  await ev(`new Promise((resolve,reject)=>{let n=0;const poll=()=>{if(!document.querySelector('#loading'))resolve(true);else if(++n>100)reject(Error('loading timeout'));else setTimeout(poll,100);};poll();})`);
  await ev(`document.querySelector('#modal .modal-x')?.click();Game.S().stats.hp=100;Game.startFight(ENEMIES.wolf,true);Game.S().combat.dist=0;`);await sleep(150);
  await check('常驻动作一屏可点击 '+w,`[...document.querySelectorAll('#fight-btns button')].every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=${h<=500||w<=480?32:44}&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})&&document.documentElement.scrollWidth<=innerWidth`);
  await check('无重复底部日志与装饰边框 '+w,`!document.querySelector('.battle-info')&&getComputedStyle(document.querySelector('.battle-field'),'::before').display==='none'&&getComputedStyle(document.querySelector('.battle-journal')).borderLeftWidth==='0px'&&document.querySelector('#battle-summary').closest('.battle-header')`);
  if(h<=500)await check('手机动作栏高度减半且上下贴边 '+w,`(()=>{const row=document.querySelector('#fight-btns').getBoundingClientRect();return row.height<=34&&[...document.querySelectorAll('#fight-btns button')].every(b=>{const r=b.getBoundingClientRect();return Math.abs(r.bottom-row.bottom)<=1&&r.top-row.top<=1;})&&document.querySelector('.battle-field').getBoundingClientRect().height>innerHeight*.73;})()`);
  await check('生命左上，日志左侧，敌人无卡片 '+w,`(()=>{const hp=document.querySelector('.player-health').getBoundingClientRect(),title=document.querySelector('.battle-header>b').getBoundingClientRect(),log=document.querySelector('.battle-journal').getBoundingClientRect(),enemy=document.querySelector('#fight-targets .target'),r=enemy.getBoundingClientRect(),c=getComputedStyle(enemy);return hp.left<title.left&&log.left<r.left&&c.backgroundColor==='rgba(0, 0, 0, 0)'&&c.borderTopWidth==='0px'&&getComputedStyle(enemy.querySelector('.enemy-img')).borderTopWidth==='0px';})()`);
  await shot('battle-single-'+w+'.png');
  if(w===667){
   await ev(`(()=>{const C=Game.S().combat;Game.S().stats.hp=10000;C.dist=60;C.enemy.spd=C.enemies[0].spd=Game.combatSpeed();Game.fightAction('defend');})()`);await sleep(400);
   await ev(`(()=>{window.scaleBefore=new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.enemy-img')).transform).a;document.querySelector('[data-fact="defend"]').click();})()`);await sleep(120);
   await check('敌人逼近过程连续放大',`(()=>{const a=new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.enemy-img')).transform).a,end=CombatStage.scale(Game.S().combat.dist);return a>scaleBefore&&a<end&&document.querySelector('#fight-status').textContent.includes('距离 '+Game.S().combat.dist+' 步');})()`);
   await shot('battle-approach-667.png');await idle();
   await ev(`(()=>{const C=Game.S().combat;C.dist=0;C.accE=0;C.enemy.spd=C.enemies[0].spd=Game.combatSpeed();C.enemies[0].ehp=10000;window.effects=[];window.playBefore=AudioFX.play;AudioFX.play=(name)=>effects.push({name,at:performance.now()});window.oldRandom=Math.random;Math.random=()=>.5;document.querySelector('[data-fact="attack"]').click();Math.random=oldRandom;})()`);await sleep(550);
   await check('受击使用半透明红色咬合特效',`!!document.querySelector('#battle-impact.bite.active .bite-upper')&&getComputedStyle(document.querySelector('.bite-upper')).backgroundImage.includes('rgba(')`);await shot('battle-impact-667.png');await idle();
   await check('双方伤害反馈实测间隔半秒',`effects.length===2&&['combatstrike','combatcritical'].includes(effects[0].name)&&effects[1].name==='combatbite'&&effects[1].at-effects[0].at>=450&&effects[1].at-effects[0].at<850`);
   await ev(`AudioFX.play=playBefore;Game.startFight(ENEMIES.wolf,true);Game.S().combat.dist=0;Game.S().stats.hp=10000;`);
  }

  await ev(`(()=>{const C=Game.S().combat;C.enemies=Array.from({length:5},()=>({...C.enemies[0],ehp:100,emax:100}));Game.fightAction('defend');})()`);await sleep(50);
  await check('五敌画像真实可选 '+w,`document.querySelectorAll('#fight-targets .target').length===5&&[...document.querySelectorAll('#fight-targets .target')].every(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})`);
  await check('五敌血条各在自己的目标内且互不重叠 '+w,`(()=>{const bars=[...document.querySelectorAll('#fight-targets .target .hp-bar')];return bars.every((e,i)=>{const r=e.getBoundingClientRect(),p=e.closest('.target').getBoundingClientRect(),next=bars[i+1]?.getBoundingClientRect();return r.left>=p.left&&r.right<=p.right&&r.width<=96&&(!next||r.right<next.left);});})()`);
  await ev(`window.roundBefore=Game.S().combat.round;document.querySelectorAll('#fight-targets .target')[1].click();`);
  await check('选择目标不推进结算 '+w,`Game.S().combat.round===roundBefore&&document.querySelectorAll('#fight-targets .target')[1].getAttribute('aria-pressed')==='true'`);
  await shot('battle-five-'+w+'.png');
  await ev(`Game.addItem('salve',4,true);document.querySelector('[data-fact="item"]').click();`);
  await check('道具子面板保留战场与目标 '+w,`document.querySelector('[data-med-id="salve"]')&&document.querySelector('#fight-targets .target.selected').dataset.eid==='3'&&Game.S().combat.round===roundBefore`);
  await ev(`document.querySelector('[data-med-id="salve"]').click();document.querySelector('[data-med-id="salve"]')?.click();window.breakBeforeUse=null;const card=document.querySelector('.battle-flying-card'),observer=new MutationObserver(()=>{if(card.classList.contains('shattering')){breakBeforeUse=Game.S().combat.usedItems===0&&Game.invCount('salve')===4;observer.disconnect();}});observer.observe(card,{attributes:true,attributeFilter:['class']});`);await sleep(200);
  await check('卡片飞行时尚未生效 '+w,`!!document.querySelector('.battle-flying-card')&&Game.S().combat.usedItems===0&&Game.invCount('salve')===4`);
  if(w===667)await shot('battle-card-flight-667.png');
  await idle();
  await check('碎裂开始时仍未提前扣道具 '+w,`breakBeforeUse===true`);
  await check('道具单次点击消耗一次 '+w,`Game.S().combat.usedItems===1&&Game.invCount('salve')===3`);
  await ev(`Game.S().stats.hp=10000;window.roundBefore=Game.S().combat.round;document.querySelector('[data-fact="defend"]').click();document.querySelector('[data-fact="defend"]').click();`);await idle();
  await check('双击只结算一次 '+w,`Game.S().combat.round===roundBefore+1`);
  await ev(`(()=>{Game.S().combat.enemies[1].ehp=1;window.survivor=document.querySelectorAll('#fight-targets .target')[2].dataset.eid;window.oldRandom=Math.random;Math.random=()=>0;document.querySelector('[data-fact="attack"]').click();Math.random=oldRandom;})()`);await idle();
  await check('第二目标击杀后稳定编号与自动切换 '+w,`Game.S().combat.enemies.length===4&&!!document.querySelector('[data-eid="'+survivor+'"]')&&document.querySelector('.target.selected').dataset.eid==='2'`);
  await ev(`Game.addItem('bow',1,true);Game.S().equipment.weapon2='bow';Game.S().tree.combat={f_sure:1};Game.fightAction('defend');document.querySelector('[data-fact="skills"]').click();`);
  await check('缺弹药仍显示原因，已学技能在子面板 '+w,`document.querySelector('[data-fact="ranged"]').disabled&&document.querySelector('[data-fact="ranged"]').textContent.includes('缺箭矢')&&document.querySelector('#battle-panel [data-fact="sure"]')&&!document.querySelector('#battle-panel [data-fact="heavy"]')`);
  await shot('battle-skills-'+w+'.png');
  await ev(`document.querySelector('[data-bpanel="close"]').click();Game.startFight(ENEMIES.shark,true);`);await sleep(300);
  await check('海底敌人图片匹配 '+w,`document.querySelector('.enemy-img').getAttribute('src')===CombatStage.cutout(ENEMIES.shark.img)&&document.querySelector('.enemy-img').naturalWidth>0`);
  await shot('battle-sea-'+w+'.png');
  await ev(`Game.startFight({id:'missing',name:'失图试炼',hp:40,atk:1,def:0,spd:1,traits:[],drops:[],desc:'无图'},true)`);await sleep(300);
  await check('缺图文字兜底可操作 '+w,`document.querySelector('.enemy-fallback').textContent==='失'&&document.querySelector('[data-fact="attack"]')`);
  await ev(`Game.startFight(ENEMIES.boar,true);Game.S().combat.dist=0;Game.S().combat.enemies[0].ehp=1;Game.S().stats.hp=100;window.oldRandom=Math.random;Math.random=()=>0;document.querySelector('[data-fact="attack"]').click();Math.random=oldRandom;`);
  await until(`!!document.querySelector('#fight-btns.over')`);
  await check('最后一击先归零且锁动作 '+w,`!Game.S().combat&&document.querySelector('.tg-hp').textContent.startsWith('0/')&&document.querySelector('#fight-btns.over')`);
  await ev(`Game.startFight(ENEMIES.nightmareBoss,true)`);await sleep(1100);
  await check('旧结束回调不关闭下一场 '+w,`Game.S().combat&&document.querySelector('.battle-board')`);
  await shot('battle-boss-'+w+'.png');

  await check('战况内部滚动且保留操作 '+w,`document.querySelector('.battle-journal #fight-log')&&document.querySelectorAll('.battle-journal header button').length===0&&document.querySelector('#fight-btns')`);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await ev(`Game.S().stats.hp=10000;window.roundBefore=Game.S().combat.round;document.querySelector('[data-fact="defend"]').click();`);await sleep(180);
  await check('减少动效恢复可操作 '+w,`Game.S().combat.round===roundBefore+1&&!document.querySelector('[data-fact="defend"]').disabled`);
  await check('键盘重复输入被阻止 '+w,`(()=>{const e=new KeyboardEvent('keydown',{key:'Enter',repeat:true,bubbles:true,cancelable:true});document.querySelector('[data-fact="defend"]').dispatchEvent(e);return e.defaultPrevented;})()`);
  await check('Tab焦点留在战场防止操作背景 '+w,`(()=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));return !!document.activeElement.closest('.battle-board');})()`);
  await send('Emulation.setEmulatedMedia',{features:[]});
 }
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{try{ws?.close();ch?.kill();}catch{}console.log('通过 '+passed+' 项，失败 '+fail+' 项');console.log('RESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();

