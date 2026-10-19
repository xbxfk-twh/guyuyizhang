const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../孤屿遗章-游戏 - 发布/js/ads.js'),'utf8');
let passed=0;
const tick=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
function mock(channel='taptap',hostname='localhost'){
 let calls=0,shows=0,loads=0,failShows=0,timer;
 const handlers={}, sdk={onLoad:f=>handlers.load=f,onError:f=>handlers.error=f,onClose:f=>handlers.close=f,
  load(){loads++;return Promise.resolve();},show(){shows++;return failShows-->0?Promise.reject(Error('not ready')):Promise.resolve();}};
 const window={GUYU_CHANNEL:channel,tap:{createRewardedVideoAd(options){calls++;assert.equal(options.adUnitId,'1054323');return sdk;}}};
 const api=new Function('window','location','setTimeout','clearTimeout',source+';return TapAds;')(window,{hostname},f=>{timer=f;return 1;},()=>{timer=null;});
 return {api,handlers,window,timeout:()=>timer(),failShows:n=>failShows=n,counts:()=>({calls,shows,loads})};
}
async function check(name,fn){await fn();passed++;console.log('OK '+name);}
(async()=>{
 await check('独立渠道和原生宿主即使有tap也不创建广告',()=>{for(const [c,h] of [['standalone','localhost'],['web','localhost'],[undefined,'appassets.androidplatform.net']]){const m=mock(c,h);assert.equal(m.api.supported(),false);assert.equal(m.counts().calls,0);}});
 await check('完整观看只发一次，提前关闭不发奖，重复点击被拦截',async()=>{
  const m=mock();let rewards=0,done=[];m.api.onReward(()=>rewards++);assert.equal(m.api.showRewardedVideo(r=>done.push(r)),true);assert.equal(m.api.showRewardedVideo(()=>assert.fail('duplicate')),false);
  await tick();m.handlers.close({isEnded:true});m.handlers.close({isEnded:true});assert.equal(rewards,1);assert.equal(done.length,1);assert.equal(done[0].ok,true);
  m.api.onReward(()=>rewards++);m.api.showRewardedVideo(r=>done.push(r));await tick();m.handlers.close({isEnded:false});assert.equal(rewards,1);assert.equal(done[1].ok,false);
 });
 await check('首次展示失败重新加载一次，连续失败不发奖且解除忙碌',async()=>{
  const m=mock();let result,rewards=0;m.api.onReward(()=>rewards++);m.failShows(1);m.api.showRewardedVideo(r=>result=r);await tick();assert.equal(m.counts().shows,2);assert.equal(m.counts().loads,2);m.handlers.close({isEnded:true});assert.equal(result.ok,true);assert.equal(rewards,1);
  m.failShows(2);m.api.onReward(()=>rewards++);m.api.showRewardedVideo(r=>result=r);await tick();assert.equal(result.ok,false);assert.equal(rewards,1);assert.equal(m.api.busy(),false);
 });
 await check('播放中断和超时的迟到关闭不发奖或串到下一次',async()=>{
  for(const cause of ['error','timeout']){const m=mock();let rewards=0,result;m.api.onReward(()=>rewards++);m.api.showRewardedVideo(r=>result=r);await tick();if(cause==='error')m.handlers.error({});else m.timeout();assert.equal(result.ok,false);assert.equal(rewards,0);assert.equal(m.api.showRewardedVideo(()=>{}),false);m.handlers.close({isEnded:true});assert.equal(rewards,0);m.api.onReward(()=>rewards++);m.api.showRewardedVideo(()=>{});await tick();m.handlers.close({isEnded:true});assert.equal(rewards,1);}
 });
 await check('没有SDK正常启动并返回不可用，不模拟发奖',()=>{const window={GUYU_CHANNEL:'taptap'};const api=new Function('window','location',source+';return TapAds;')(window,{hostname:'localhost'});assert.equal(api.supported(),false);let result;api.showRewardedVideo(r=>result=r);assert.equal(result.ok,false);});
 console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
})().catch(e=>{console.error(e);console.log('RESULT:FAIL');process.exitCode=1;});
