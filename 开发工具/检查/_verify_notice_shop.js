/* 通知树、每日赠礼与购买确认：隔离浏览器、可信触摸、真实存储事务。 */
const assert=require('node:assert/strict'),{openBrowser}=require('../../回归测试/helpers/browser');
let b,count=0;
async function check(name,expr){assert.ok(await b.ev(expr),name);count++;console.log('OK '+name);}
async function menu(){await b.ev(`for(let i=0;i<12&&document.querySelector('#modal.open');i++)UI.handleBack()`);assert.equal(await b.ev(`!!document.querySelector('#modal.open')`),false,'测试准备须逐级退出旧菜单');await b.tap('[data-nav="save"]');}
(async()=>{try{
 b=await openBrowser({init:`window.GUYU_CHANNEL='taptap';localStorage.setItem('guyuyizhang_language','zh-CN');`});await b.sleep(600);
 await check('标题右侧改为大菜单且有汇总红点',`document.querySelector('#btn-set').textContent.includes('大菜单')&&!document.querySelector('#btn-set [data-notice]').hidden`);
 await b.tap('#btn-set');await check('不开局可打开大菜单，日记与保存不能误操作',`!!document.querySelector('[data-savemenu="sign"]')&&document.querySelector('[data-savemenu="diary"]').disabled&&document.querySelector('[data-savemenu="save"]').disabled`);
 await b.ev(`document.querySelector('#modal .modal-x').click();Game.newGame('fisher','normal');Game.S().tut=null;Game.metaState().batchTipSeen=1;Game.metaState().adWallet={test:{coins:100,soul:0}};Game.markNoticeRead('diary');UI.begin();`);await b.sleep(2800);
 await b.ev(`for(let i=0;i<10;i++)Game.diaryAdd('新日记');UI.render();`);await menu();
 await check('日记十条、签到未领、商城赠礼三个叶子亮点',`['diary','sign','adshop'].every(k=>!document.querySelector('[data-savemenu="'+k+'"] [data-notice]').hidden)`);
 await b.tap('[data-savemenu="diary"]');await check('打开日记后该项红点消除',`!Game.noticeState().diary`);
 await menu();await b.tap('[data-savemenu="mail"]');
 await check('邮箱活动页有一次提醒，外层邮箱也继承',`!document.querySelector('[data-mailtab="event"] [data-notice]').hidden&&Game.noticeState().mailbox`);
 await b.tap('[data-mailtab="event"]');await check('看过活动后标记持久化并仍提供APK下载',`!Game.noticeState().event&&document.querySelector('[data-mailtab="event"] [data-notice]').hidden&&!!document.querySelector('.event-download [data-copy-apk-url]')`);
 await menu();await b.ev(`delete Game.S().seen.ironore;delete Game.metaState().seenItems.ironore;for(const t of ['res','tool','items','mon','boss','ach'])Game.markNoticeRead('collection',t);Game.S().seen.ironore=1;UI.render();`);
 await check('新收录物品向图鉴及菜单传播',`Game.noticeState().res&&Game.noticeState().items&&Game.noticeState().collection&&!document.querySelector('[data-nav="save"] [data-notice]').hidden`);
 await b.tap('[data-savemenu="col"]');await check('只消除已打开页的提示，物品页仍亮点',`!Game.noticeState().res&&!document.querySelector('[data-ctab="items"] [data-notice]').hidden`);
 await b.tap('[data-ctab="items"]');await check('内层都已读后图鉴父级红点消除',`!Game.noticeState().collection`);
 await menu();await b.tap('[data-savemenu="adshop"]');
 await check('广告领币在标题栏有标识、不占柜格，免费赠礼末格仍十二格',`document.querySelector('.shop-cabinet').children.length===12&&!!document.querySelector('.shop-title #watch-reward-ad')&&!document.querySelector('.shop-cabinet #watch-reward-ad')&&!!document.querySelector('.shop-video-seal')&&document.querySelector('.shop-cabinet').lastElementChild.hasAttribute('data-shop-gift')`);
 for(const [w,h] of [[568,320],[667,375],[844,390],[1366,768]]){
  await b.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<1000});await b.sleep(450);
  for(const lang of ['zh','en']){
   await b.ev(`Locale.set('${lang}')`);await b.sleep(100);
   await check('标题广告、关闭、兑换与全部商品可见可点 '+w+' '+lang,`[...document.querySelectorAll('.shop-cabinet>button,.shop-title button,#modal .modal-x')].every(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth&&e.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))})`);
   await check('商品图标与名称完整留在柜格内 '+w+' '+lang,`[...document.querySelectorAll('.cabinet-product')].every(e=>{const r=e.getBoundingClientRect();return [...e.querySelectorAll('img,b')].every(c=>{const t=c.getBoundingClientRect();return t.left>=r.left+3&&t.right<=r.right-3&&t.top>=r.top+3&&t.bottom<=r.bottom-3})})`);
   await check('标题广告中英文字完整 '+w+' '+lang,lang==='en'?`![...document.querySelectorAll('#watch-reward-ad,[data-soulexchange]')].some(e=>/[\u3400-\u9fff]/.test(e.textContent))`:`document.querySelector('#watch-reward-ad').textContent.includes('看广告领币')`);
   await b.shot('notice-shop-'+w+'-'+lang+'.png');
  }
  await b.ev(`Locale.set('zh')`);
 }
 await b.tap('[data-adbuy="namecard"]');await check('购买先确认，未扣币也未寄信',`document.querySelector('.modal-title').textContent==='确认购买'&&Game.adCoinBalance()===100&&!Game.mailboxList().some(x=>x.shopReceipt)`);
 await b.tap('[data-choice="1"]');await check('取消后返回商城且余额不变',`!!document.querySelector('.shop-cabinet')&&Game.adCoinBalance()===100`);
 await b.tap('[data-adbuy="namecard"]');await b.tap('[data-choice="0"]');await check('确认只扣三点、寄一封新邮件并提示邮箱',`Game.adCoinBalance()===97&&Game.mailboxList().filter(x=>x.item==='namecard').length===1&&Game.noticeState().mail`);
 await b.ev(`Math.random=()=>0.9`);await b.tap('[data-shop-gift]');await check('赠礼发一点后红点消除且按钮禁用',`Game.adCoinBalance()===98&&!Game.noticeState().adshop&&document.querySelector('[data-shop-gift]').disabled`);
 await b.ev(`document.querySelector('[data-shop-gift]').click()`);await check('重复点击不会重复领取',`Game.adCoinBalance()===98`);
 assert.deepEqual(b.errors,[]);console.log(`通过 ${count} 项，失败 0 项\nRESULT:PASS`);
}catch(e){console.error(e.stack);await b?.shot('notice-shop-failure.png');console.log('RESULT:FAIL');process.exitCode=1;}finally{await b?.close();}})();
