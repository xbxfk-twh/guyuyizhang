/* 地窖误丢保护、攻略未读状态、存档重启与老潮触摸滚动；隔离玩家存储。 */
const assert=require('node:assert/strict');
const {openBrowser}=require('../../回归测试/helpers/browser');
let count=0,b;
(async()=>{try{
for(const [width,height] of [[568,320],[844,390],[1366,768]]){
 b=await openBrowser({width,height});const {ev,tap,send,sleep}=b;
 const check=async(name,expr)=>{assert.ok(await ev(expr),name);count++;console.log('OK '+width+' '+name);};
 await ev(`Locale.set('zh');Game.newGame('fisher','normal');Game.S().tut=null;Game.S().capacity=999;Game.S().buildings.cellar=0;Game.S().cellar={items:[{id:'water',qty:20}]};Game.S().laochao.arrived=true;Game.S().day=1;Game.S().tick=480;Game.S().inv.beibi=10000;Game.S().inv.coin=1000;UI.begin();`);
 for(let i=0;i<150 && await ev(`!!document.querySelector('#loading')`);i++)await sleep(100);
 await check('启动遮罩已退出',`!document.querySelector('#loading')`);await ev('UI.handleBack()');
 await check('默认隐藏日志和开关，旧返回入口已移除',`getComputedStyle(document.querySelector('#log')).display==='none'&&getComputedStyle(document.querySelector('#log-grip')).display==='none'&&!document.querySelector('#btn-backmap')`);
 await tap('[data-buff-info="all"]');
 await check('正常状态只显示体温舒适',`document.querySelector('.overlay-text')?.textContent.trim()==='体温舒适'`);
 await b.shot('nov07-status-'+width+'.png');
 await ev('UI.handleBack()');
 await tap('[data-stat-info="stamina"]');
 await check('点体力显示用途',`document.querySelector('#modal').textContent.includes('休息可以恢复')`);
 await ev('UI.handleBack()');
 await tap('[data-nav="save"]');
 await tap('[data-savemenu="settings"]');
 await tap('[data-set="log:always"]');
 await ev(`while(document.querySelector('#modal.open'))UI.handleBack()`);
 await check('常驻显示小日志开关',`document.querySelector('#log-grip').offsetWidth<=24&&document.querySelector('#log-grip').offsetWidth>0&&!document.querySelector('#log').classList.contains('dim')`);
 await tap('[data-nav="save"]');
 await tap('[data-savemenu="settings"]');
 await tap('[data-set="log:fade"]');
 await ev(`while(document.querySelector('#modal.open'))UI.handleBack()`);
 await sleep(3100);
 await check('三秒后日志淡出，小开关仍能点',`document.querySelector('#log').classList.contains('dim')&&document.querySelector('#log-grip').offsetWidth>0`);
 await check('两枚休息按钮同高',`document.querySelector('#btn-rest').offsetHeight===document.querySelector('#btn-rest-h').offsetHeight`);
 await tap('[data-nav="map"]');
 await check('地图的底栏按钮显示返回场景',`document.body.classList.contains('on-map')&&document.querySelector('[data-nav="map"]').textContent.includes('返回场景')`);
 await b.shot('nov07-map-'+width+'.png');
 await tap('[data-nav="map"]');
 await check('底栏返回原场景',`!document.body.classList.contains('on-map')`);
 if(width<1000){
   await tap('[data-nav="inv"]');
   const selector='.inv-item[data-item],.inv-item';
   const pos=await ev(`(()=>{const e=document.querySelector('${selector}'),r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
   await ev(`window.__clicks=0;const playSound=AudioFX.play;AudioFX.play=(name,...args)=>{if(name==='click')window.__clicks++;return playSound(name,...args);};window.__inventory=JSON.stringify(Game.S().inv)`);
   await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pos]});
   for(let dx=5;dx<=45;dx+=5)await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:pos.x+dx,y:pos.y}]});
   await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await check('从物品上拖动无点击声、不关闭背包、不扣物品',`window.__clicks===0&&!!document.querySelector('#modal.open .inventory-modal')&&window.__inventory===JSON.stringify(Game.S().inv)`);
   await ev('UI.handleBack()');
 }
 await ev('Game.S().day=60;Game.S().tick=60*1440+480;UI.render()');
 await tap('[data-nav="save"]');await check('攻略未读红点存在',`!!document.querySelector('[data-savemenu="guide"] .guide-unread-dot')`);
 await tap('[data-savemenu="mail"]');await check('只看邮箱不会标记已读',`!!document.querySelector('[data-mailtab="guide"] .guide-unread-dot')&&!localStorage.getItem('guyuyizhang_guide_read')`);
 await tap('[data-mailtab="guide"]');await check('进入基础知识即消点且持久化',`document.querySelector('.guide-page h3').textContent==='基础知识'&&!document.querySelector('.guide-unread-dot')&&localStorage.getItem('guyuyizhang_guide_read')==='1'`);
 await check('地窖丢弃及长按操作提示齐全',`['地窖丢弃还需再次确认','长按制作','长按食之包','图鉴'].every(t=>document.querySelector('.guide-page').textContent.includes(t))`);
 await b.shot('oct27-guide-'+width+'.png');await ev('UI.handleBack()');
 await ev(`document.querySelector('#scene-actions .trade').click()`);await sleep(300);
 if(width<1000)await check('手机批量提示没有鼠标或右键说明',`document.querySelector('#floating-notice').textContent.includes('长按')&&!/鼠标|右键|左键|滚轮/.test(document.querySelector('#floating-notice').textContent)`);
 // 从商品列表空白/文字区域真实滑动，不用修改scrollTop充当触摸验证。
 await ev(`document.querySelector('.merchant-goods').scrollTop=0`);
 const r=await ev(`document.querySelector('.merchant-goods').getBoundingClientRect().toJSON()`);
 const x=r.x+r.width*.55,y0=Math.min(height-45,r.bottom-30),y1=Math.max(45,r.top+40);
 for(let n=0;n<2;n++){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y0}]});for(let i=1;i<=10;i++){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y0+(y1-y0)*i/10}]});await sleep(25);}await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(300);}
 await check('老潮商品可访问，溢出时真实触摸能够下滑',`(()=>{const e=document.querySelector('.merchant-goods');return e.scrollHeight<=e.clientHeight+1||e.scrollTop>30;})()`);
 assert.equal(await ev(`Game.addItem('smokedFish',20,true,true);Game.materialCount('smokedFish')`),20,'测试委托材料应为新鲜可用物资');await tap('[data-ttab="comm"]');await check('委托页可显示多项任务',`document.querySelectorAll('[data-acceptc],[data-comm]').length>1`);
 await tap('[data-comm="c1"]');await check('首个委托能实际提交',`[...document.querySelectorAll('.mission.done')].some(e=>e.textContent.includes('熏鱼订单'))`);
 for(let n=0;n<2;n++){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y0}]});for(let i=1;i<=10;i++){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y0+(y1-y0)*i/10}]});await sleep(25);}await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(300);}
 await check('完成首个委托后仍能触摸下滑查看后续',`(()=>{const e=document.querySelector('.merchant-goods');return e.scrollHeight<=e.clientHeight+1||e.scrollTop>30;})()`);
 await b.shot('oct27-trade-'+width+'.png');await ev('UI.handleBack()');
 await ev(`[...document.querySelectorAll('#hotspots .hotspot')].find(e=>e.textContent.includes('地窖')).click()`);await tap('[data-cellar-item="water"]',{long:true});
 await check('长按只选数量，不丢地窖淡水',`Game.cellarState().inv.water===20&&document.querySelector('#batchn-do').textContent==='丢弃'&&getComputedStyle(document.querySelector('#batchn-do')).color==='rgb(165, 43, 37)'`);
 await ev(`document.querySelector('#batchn-n').value=20;document.querySelector('#batchn-n').dispatchEvent(new Event('input'))`);
 await tap('#batchn-do');await check('二次确认明确物品数量且尚未扣除',`document.querySelector('.modal-title').textContent==='确认丢弃'&&document.querySelector('.overlay-text').textContent.includes('淡水 ×20')&&Game.cellarState().inv.water===20&&document.querySelector('[data-choice="1"]').classList.contains('discard-danger')`);
 await b.shot('oct27-discard-'+width+'.png');await tap('[data-choice="0"]');await check('取消返回地窖数量不变',`Game.cellarState().inv.water===20&&!!document.querySelector('[data-cellar-item="water"]')`);
 await tap('[data-cellar-item="water"]');await tap('[data-cellar-take="water"]');await check('轻点取出正常',`Game.cellarState().inv.water===19&&Game.invCount('water')>0`);await ev('UI.handleBack()');
 await ev(`[...document.querySelectorAll('#hotspots .hotspot')].find(e=>e.textContent.includes('地窖')).click()`);await tap('[data-cellar-item="water"]',{long:true});await ev(`document.querySelector('#batchn-n').value=3;document.querySelector('#batchn-n').dispatchEvent(new Event('input'))`);await tap('#batchn-do');await tap('[data-choice="1"]');await check('确认后只扣选中数量',`Game.cellarState().inv.water===16`);
 await ev(`UI.handleBack();Game.S().day=73;Game.S().inv.wood=37;Game.save();`);
 await b.navigate(require('node:url').pathToFileURL(require('node:path').join(b.root,'孤屿遗章-游戏 - 发布/index.html')).href);await sleep(400);
 await check('重启后继续游戏入口存在',`!!document.querySelector('#btn-load')`);await tap('#btn-load');await sleep(400);await ev('UI.handleBack()');
 await check('保存重启保留进度与地窖数量',`Game.S().day===73&&Game.invCount('wood')===37&&Game.cellarState().inv.water===16`);
 await tap('[data-nav="save"]');await check('重启后攻略红点不再出现',`!document.querySelector('[data-savemenu="guide"] .guide-unread-dot')`);
 assert.deepEqual(b.errors,[]);await b.close();b=null;
}
console.log('通过 '+count+' 项，失败 0 项\nRESULT:PASS');
}catch(e){console.error(e.stack);await b?.shot('oct27-feedback-failure.png');process.exitCode=1;console.log('RESULT:FAIL');}finally{await b?.close();}})();
