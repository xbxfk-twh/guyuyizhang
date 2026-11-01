/* TapTap H5 激励视频：配置来自当前应用 check_ads_status（2026-10-19）。 */
const TapAds = (() => {
  const SPACE_ID = '1054323';
  let ad = null, pending = null, rewardCallback = null, awaitingLateClose = false;
  function enabled() { return !(window.GUYU_CHANNEL && window.GUYU_CHANNEL !== 'taptap') && !(typeof location !== 'undefined' && location.hostname === 'appassets.androidplatform.net'); }
  function supported() { return enabled() && !!(typeof window !== 'undefined' && window.tap && typeof window.tap.createRewardedVideoAd === 'function'); }
  function finish(result) {
    const request = pending;
    if (!request) return;
    pending = null;
    clearTimeout(request.timer);
    if (result.ok && request.reward) {
      try { request.reward(); }
      catch (e) { result = {ok:false, reason:'奖励处理失败，请保留当前存档并联系作者。'}; }
    }
    request.done(result);
  }
  function init() {
    if (ad) return true;
    if (!supported()) return false;
    try {
      ad = window.tap.createRewardedVideoAd({adUnitId:SPACE_ID});
      ad.onLoad(() => {});
      // onError 是素材拉取失败，也可能来自下一条广告的预加载。
      // 不能据此否定当前观看；发奖只认 onClose，展示失败由 show/load 恢复链收尾。
      ad.onError(() => {});
      ad.onClose(res => {
        if (awaitingLateClose) { awaitingLateClose = false; return; }
        finish(res && res.isEnded === true
          ? {ok:true} : {ok:false, reason:'未完整观看视频，本次没有领取奖励。'});
      });
      Promise.resolve(ad.load()).catch(() => {});
      return true;
    } catch (e) { ad = null; return false; }
  }
  function onReward(callback) { rewardCallback = typeof callback === 'function' ? callback : null; }
  function showRewardedVideo(done) {
    if (pending) return false;
    if (awaitingLateClose) { done({ok:false, reason:'上次广告尚未返回，请关闭广告或重新打开游戏。'}); return false; }
    if (!init()) { done({ok:false, reason:'广告暂不可用，请在 TapTap 内打开游戏后重试。'}); return false; }
    const request = {done, reward:rewardCallback, timer:null};
    rewardCallback = null;
    pending = request;
    // 防止宿主丢失关闭回调后永远锁住入口；超时不发奖励，迟到回调无效。
    request.timer = setTimeout(() => {
      awaitingLateClose = true;
      finish({ok:false, reason:'广告响应超时，未领取奖励，请关闭广告或重新打开游戏。'});
    }, 180000);
    const fail = () => { if (pending === request) finish({ok:false, reason:'暂无可播放的广告，请稍后再试。'}); };
    try {
      Promise.resolve(ad.show()).catch(() => {
        if (pending !== request) return;
        return Promise.resolve(ad.load()).then(() => {
          if (pending === request) return ad.show();
        }).catch(fail);
      }).catch(fail);
    } catch (e) { fail(); }
    return true;
  }
  init();
  return {enabled, init, supported, onReward, showRewardedVideo, busy:() => !!pending};
})();

/* 独立安卓激励视频：宿主只向本地游戏页注入固定命令，不接受网页提供的奖励数额。 */
const NativeAds = (() => {
  let pending=null, rewardCallback=null;
  function supported() {
    return typeof location!=='undefined' && location.hostname==='appassets.androidplatform.net'
      && !!window.GuyuNativeAds && typeof window.GuyuNativeAds.show==='function';
  }
  function finish(result) {
    const request=pending;
    if (!request) return;
    pending=null; clearTimeout(request.timer);
    if (result.ok && request.reward) {
      try { request.reward(); }
      catch (e) { result={ok:false,reason:'奖励处理失败，请保留当前存档并联系作者。'}; }
    }
    request.done(result);
  }
  if (typeof window.addEventListener==='function') window.addEventListener('guyu-native-ad-result',event=>{
    const detail=event.detail;
    if (!pending || !detail || detail.id!==pending.id) return;
    finish(detail.verified===true ? {ok:true} : {ok:false,reason:detail.reason || '未完整观看视频，本次没有领取奖励。'});
  });
  function showRewardedVideo(done) {
    if (pending) return false;
    if (!supported()) { done({ok:false,reason:'广告暂不可用，请稍后再试。'}); return false; }
    const bytes=new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    const request={id:Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join(''),done,reward:rewardCallback,timer:null};
    rewardCallback=null; pending=request;
    request.timer=setTimeout(()=>finish({ok:false,reason:'广告响应超时，未领取奖励，请稍后再试。'}),180000);
    try {
      if (window.GuyuNativeAds.show(request.id)!=='pending') finish({ok:false,reason:'广告暂不可用，请稍后再试。'});
    } catch (e) { finish({ok:false,reason:'广告暂不可用，请稍后再试。'}); }
    return true;
  }
  return {supported,enabled:supported,busy:()=>!!pending,onReward:callback=>{rewardCallback=typeof callback==='function'?callback:null;},showRewardedVideo};
})();
