/* 手机/桌面状态、库存和房间入口；公共隔离 Chrome 驱动。 */
const assert=require('node:assert/strict'),path=require('node:path'),{openBrowser}=require('../../回归测试/helpers/browser');
const root=path.resolve(__dirname,'../..');let b,passed=0,fail=0;
(async()=>{try{
 b=await openBrowser({width:667,height:375});const {send,ev,sleep}=b,errors=b.errors,shot=name=>b.shot(name);
 const check=async(name,expr)=>{assert.ok(await ev(expr),name);passed++;console.log('OK '+name);};
 for(const [w,h]of [[667,375],[1366,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<1000});await send('Emulation.setTouchEmulationEnabled',{enabled:w<1000,maxTouchPoints:1});await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(4500);
  await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().capacity=999;Game.S().inv={};Game.S().warehouse={items:[]};for(const id of ['wood','stone','water','berry','axeStone','ironSword','flint','branch','herb','thatch','hide','vine'])Game.addItem(id,ITEMS[id].stack===1?1:8,true);Game.S().warehouse.items=[{id:'wood',qty:8},{id:'water',qty:20},{id:'honey',qty:3,expiry:99999},{id:'stone',qty:20}];UI.begin();document.querySelector('#modal .modal-x')?.click();`);await sleep(3000);
  const tap=async selector=>{await sleep(380);await ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest'})`);await sleep(70);const r=await ev(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`),x=r.x+r.width/2,y=r.y+r.height/2;assert.ok(x>0&&y>0&&x<w&&y<h,selector+' visible');if(w<1000){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});}await sleep(380);};

  await ev(`Game.S().stats.health=30;Game.S().statuses.poison=6;Game.S().buffs={atk:{v:3,until:Game.S().tick+120}};UI.render();`);
  await check('状态移至顶栏且入口可见 '+w,`(()=>{const b=document.querySelector('[data-buff-info="all"]'),r=b.getBoundingClientRect();return !!b.closest('#topbar')&&r.right<=innerWidth&&r.left>=0&&r.bottom<50;})()`);
  await check('生命图标及全部属性可访问 '+w,`document.querySelector('[data-stat-info=hp]').getAttribute('aria-label')==='生命'&&document.querySelectorAll('[data-stat-info]').length===6&&document.querySelectorAll('.stat-name svg').length===6`);
  await shot('mobile-refresh-hud-'+w+'.png');await tap('[data-buff-info="all"]');
  await check('状态详情保留中毒与增益效果 '+w,`document.querySelector('#modal').textContent.includes('每小时失去3生命')&&document.querySelector('#modal').textContent.includes('攻击+3')`);
  await tap('#modal .modal-x');
  await tap('[data-stat-info=health]');await check('健康说明可通过图标独立打开 '+w,`document.querySelector('#modal').textContent.includes('30/100')&&document.querySelector('#modal').textContent.includes('药膏')`);await tap('#modal .modal-x');
  await check('日志时间不重复天数 '+w,`[...document.querySelectorAll('.logtime')].every(e=>!e.textContent.includes('天'))`);
  await tap('[data-nav="inv"]');await shot('mobile-refresh-bag-'+w+'.png');await tap('#modal .modal-x');await tap('[data-hotspot=warehouse]');await shot('mobile-refresh-warehouse-'+w+'.png');await tap('#modal .modal-x');
  await ev(`(()=>{const b=[...document.querySelectorAll('.hotspot')].find(e=>e.textContent.includes('进屋'));b?.click();})()`);await sleep(500);
  await check('室内无无效摆放入口 '+w,`!document.querySelector('#room-arrange,#room-reset')`);
 }
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);await b?.shot('mobile-ui-failure.png');}finally{await b?.close();console.log('通过 '+passed+' 项，失败 '+fail+' 项\nRESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();
