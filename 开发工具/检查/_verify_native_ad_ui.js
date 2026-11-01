/* 模拟原生SDK提供者，真实点击商城与存储；真实域名/请求回调另由native-ad-adapter.test覆盖。 */
const assert=require('node:assert/strict'),{openBrowser}=require('../../回归测试/helpers/browser');
let b,count=0;
const check=async(name,expr)=>{assert.ok(await b.ev(expr),name);count++;console.log('OK '+name);};
(async()=>{try{
 b=await openBrowser({width:667,height:375,init:`window.GUYU_CHANNEL='standalone';localStorage.setItem('guyuyizhang_language','zh');`});
 await b.ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.metaState().batchTipSeen=1;UI.begin();window.__native={busy:false,requests:0};NativeAds.enabled=NativeAds.supported=()=>true;NativeAds.busy=()=>__native.busy;NativeAds.onReward=f=>__native.reward=f;NativeAds.showRewardedVideo=f=>{__native.done=f;__native.busy=true;__native.requests++;return true;};__native.result=ok=>{if(!__native.busy)return;__native.busy=false;if(ok)__native.reward();__native.done({ok,reason:ok?'':'已取消观看'});};`);
 for(let n=0;n<80&&await b.ev(`!!document.querySelector('#loading')`);n++)await b.sleep(100);
 await b.ev('UI.handleBack()');await b.tap('[data-nav="save"]');await b.tap('[data-savemenu="adshop"]');
 await check('独立版原生广告按钮出现在标题栏且不占柜格',`!!document.querySelector('.shop-title #watch-reward-ad')&&document.querySelector('.shop-cabinet').children.length===12&&!document.querySelector('.shop-cabinet #watch-reward-ad')&&document.querySelector('#watch-reward-ad').textContent.includes('星之点')`);
 await b.tap('#watch-reward-ad');await check('点击选择原生提供者，观看中锁住界面且暂停时间',`__native.requests===1&&!TapAds.busy()&&document.querySelector('.modal-content').inert&&Game.timeFrozen()&&Game.adCoinBalance()===0`);
 await b.ev(`__native.result(false)`);await check('取消观看不消耗次数且恢复点击',`!document.querySelector('.modal-content').inert&&Game.adCoinBalance()===0&&Game.adRewardState().uses===0&&!document.querySelector('#watch-reward-ad').disabled`);
 await b.tap('#watch-reward-ad');await b.ev(`__native.result(true);window.__balance=Game.adCoinBalance()`);
 await check('有效观看写入钱包，次数增加且使用独立版币名',`__balance>=3&&__balance<=6&&Game.adRewardState().uses===1&&document.querySelector('#watch-reward-ad').textContent.includes('星之点')&&!document.querySelector('.modal-content').inert`);
 await b.ev(`__native.result(true)`);await check('重复提供者结果不重复入账',`Game.adCoinBalance()===__balance&&Game.adRewardState().uses===1`);
 for(let i=0;i<4;i++){await b.tap('#watch-reward-ad');await b.ev(`__native.result(true)`);}
 await check('原生同样遵守每天五次上限并禁用按钮',`Game.adRewardState().uses===5&&document.querySelector('#watch-reward-ad').disabled`);
 await b.shot('native-game-shop-667.png');
 assert.deepEqual(b.errors,[]);console.log(`通过 ${count} 项，失败 0 项\nRESULT:PASS`);
}catch(e){console.error(e.stack);await b?.shot('native-ad-ui-failure.png');process.exitCode=1;console.log('RESULT:FAIL');}finally{await b?.close();}})();
