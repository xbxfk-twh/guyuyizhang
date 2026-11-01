/* 真正点击商城广告入口；仅模拟宿主事件，使用隔离浏览器和真实游戏存储事务。 */
const assert=require('node:assert/strict');
const {openBrowser,pressElement}=require('../../回归测试/helpers/browser');
const init=`
window.GUYU_CHANNEL='taptap';
window.__ad={handlers:{},shows:0,loads:0,failShows:0};
const realSetTimeout=window.setTimeout;
window.setTimeout=(fn,ms,...args)=>{if(ms===180000)__ad.timeout=fn;return realSetTimeout(fn,ms,...args);};
window.tap={createRewardedVideoAd(){return {
  onLoad:f=>__ad.handlers.load=f,onError:f=>__ad.handlers.error=f,onClose:f=>__ad.handlers.close=f,
  load:()=>{__ad.loads++;return Promise.resolve();},
  show:()=>{__ad.shows++;return __ad.failShows-->0?Promise.reject(Error('not ready')):Promise.resolve();}
};}};`;
let b,count=0;
const check=async(name,expr)=>{assert.ok(await b.ev(expr),name);count++;console.log('OK '+name);};
const tap=selector=>pressElement(b.send,b.ev,selector);
async function start(){
  b=await openBrowser({width:844,height:390,init});
  await b.ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.metaState().batchTipSeen=1;UI.begin()`);
  for(let n=0;n<80&&await b.ev(`!!document.querySelector('#loading')`);n++)await b.sleep(100);
  await b.ev('UI.handleBack()');await tap('[data-nav="save"]');await tap('[data-savemenu="adshop"]');
}
const usable=`!TapAds.busy()&&!document.querySelector('#modal .modal-content').inert&&!document.querySelector('#watch-reward-ad').disabled`;
(async()=>{try{
  await start();
  await tap('#watch-reward-ad');
  await check('观看中锁住重复点击且不预先发奖',`TapAds.busy()&&document.querySelector('#modal .modal-content').inert&&Game.adCoinBalance()===0&&Game.adRewardState().uses===0`);
  await b.ev(`__ad.handlers.close({isEnded:true});window.__first=Game.adCoinBalance()`);
  await check('完整观看到账3至6币，恢复商城点击与剩余次数',`__first>=3&&__first<=6&&Game.adRewardState().uses===1&&${usable}`);
  await b.ev(`__ad.handlers.close({isEnded:true})`);
  await check('同一关闭回调重复送达不能多发奖励',`Game.adCoinBalance()===__first&&Game.adRewardState().uses===1`);
  await tap('#watch-reward-ad');await b.ev(`__ad.handlers.error({errMsg:'next creative load failed'})`);
  await check('素材错误不能冒充当前视频播放失败',`TapAds.busy()&&Game.adCoinBalance()===__first&&Game.adRewardState().uses===1`);
  await b.ev(`__ad.handlers.close({isEnded:true});window.__second=Game.adCoinBalance()`);
  await check('素材错误后完整关闭仍到账并可再次点击',`__second-__first>=3&&__second-__first<=6&&Game.adRewardState().uses===2&&${usable}`);
  await tap('#watch-reward-ad');await b.ev(`__ad.handlers.error({});__ad.handlers.close({isEnded:false})`);
  await check('报错后提前关闭不发奖、不占次数、不锁商城',`Game.adCoinBalance()===__second&&Game.adRewardState().uses===2&&${usable}`);
  await b.ev(`__ad.failShows=2;window.__shows=__ad.shows`);await tap('#watch-reward-ad');
  await check('展示失败仅恢复一次，两次失败后入口可重试',`__ad.shows===__shows+2&&Game.adCoinBalance()===__second&&Game.adRewardState().uses===2&&${usable}`);
  await tap('#watch-reward-ad');
  await b.ev(`(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('test storage full')};try{__ad.handlers.close({isEnded:true})}finally{Storage.prototype.setItem=original}})()`);
  await check('真实写盘失败不虚增余额和次数，关闭后仍可操作',`Game.adCoinBalance()===__second&&Game.adRewardState().uses===2&&${usable}`);
  for(let n=3;n<=5;n++){
    await tap('#watch-reward-ad');await b.ev(`__ad.handlers.close({isEnded:true})`);
    await check('第'+n+'次观看实际到账且次数准确',`Game.adRewardState().uses===${n}&&Game.adCoinBalance()-__second>=${(n-2)*3}&&Game.adCoinBalance()-__second<=${(n-2)*6}`);
  }
  await check('五次上限明确显示且按钮禁用，商城其他按钮仍可点击',`document.querySelector('#watch-reward-ad').disabled&&document.querySelector('#watch-reward-ad').textContent.includes('今天已领取 5 次')&&!document.querySelector('#modal .modal-content').inert`);
  await b.shot('ad-reward-five.png');const coins=await b.ev('Game.adCoinBalance()');
  await b.send('Page.reload');await b.sleep(1200);
  await check('重新加载游戏保留奖励钱包与每日五次上限',`Game.adCoinBalance()===${coins}&&Game.adRewardState().uses===5`);
  assert.deepEqual(b.errors,[]);await b.close();b=null;
  await start();await tap('#watch-reward-ad');await b.ev(`__ad.timeout()`);
  await check('宿主缺失关闭回调时超时解开界面且不发奖',`!TapAds.busy()&&!document.querySelector('#modal .modal-content').inert&&Game.adCoinBalance()===0&&Game.adRewardState().uses===0`);
  await b.ev(`window.__shows=__ad.shows`);await tap('#watch-reward-ad');
  await check('旧广告未关闭时禁止新一轮，避免迟到回调串奖',`__ad.shows===__shows&&Game.adCoinBalance()===0&&!document.querySelector('#modal .modal-content').inert`);
  await b.ev(`__ad.handlers.close({isEnded:true})`);await tap('#watch-reward-ad');await b.ev(`__ad.handlers.close({isEnded:true})`);
  await check('迟到旧回调不发奖，实际重新观看后恢复领取',`Game.adRewardState().uses===1&&Game.adCoinBalance()>=3&&Game.adCoinBalance()<=6&&${usable}`);
  assert.deepEqual(b.errors,[]);console.log(`通过 ${count} 项，失败 0 项\nRESULT:PASS`);
}catch(e){console.error(e.stack);await b?.shot('ad-reward-failure.png');process.exitCode=1;console.log('RESULT:FAIL');}finally{await b?.close();}})();
