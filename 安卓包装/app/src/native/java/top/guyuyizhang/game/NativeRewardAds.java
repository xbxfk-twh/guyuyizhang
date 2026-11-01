package top.guyuyizhang.game;

import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import com.tapsdk.tapad.*;
import java.util.UUID;

/** SDK-only adapter. The web game owns wallet transactions, limits and save persistence. */
final class NativeRewardAds implements MainActivity.AdEngine {
    private final MainActivity host;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final SharedPreferences preferences;
    private TapAdNative nativeAds;
    private AlertDialog consent;
    private Request pending;
    private boolean destroyed;
    private static final class Request {
        final String id;
        boolean shown, cached, closed, verified;
        Request(String id) { this.id = id; }
    }

    NativeRewardAds(MainActivity host) {
        this.host = host;
        preferences = host.getSharedPreferences("native-ads", 0);
    }

    @Override public void request(String id) {
        if (destroyed) return;
        if (pending != null) { host.adResult(id, false, "上次广告尚未结束，请稍后再试。"); return; }
        Request request = new Request(id); pending = request;
        handler.postDelayed(() -> finish(request, false, "广告响应超时，请稍后再试。"), 170000);
        if (preferences.getBoolean("consent-v1", false)) initialize(request);
        else {
            consent = new AlertDialog.Builder(host).setTitle("观看激励视频")
                .setMessage("广告由 TapADN 提供。仅在你同意后初始化广告服务，联网使用设备型号、系统信息、OAID及本应用的Android ID进行广告展示与奖励校验；不授权位置、电话、应用列表、传感器或外部存储采集。拒绝不会影响继续游戏。")
                .setNeutralButton("隐私政策", (d,w) -> {
                    finish(request, false, "请阅读隐私政策后重新选择观看广告。");
                    try { host.startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW,
                        android.net.Uri.parse("https://ssp.dirichlet.cn/docs/agreement/"))); }
                    catch (RuntimeException unavailable) { /* Cancellation already restored the game. */ }
                })
                .setNegativeButton("暂不观看", (d,w) -> finish(request, false, "已取消观看，本次没有领取奖励。"))
                .setPositiveButton("同意并观看", (d,w) -> {
                    preferences.edit().putBoolean("consent-v1", true).apply(); initialize(request);
                }).create();
            consent.setOnCancelListener(d -> finish(request, false, "已取消观看，本次没有领取奖励。"));
            consent.show();
        }
    }

    private boolean current(Request request) {
        return !destroyed && pending == request && !host.isFinishing() && !host.isDestroyed();
    }
    private void finish(Request request, boolean verified, String reason) {
        if (!current(request)) return;
        pending = null; handler.removeCallbacksAndMessages(null);
        host.adResult(request.id, verified, reason);
    }
    private void initialize(Request request) {
        if (!current(request)) return;
        try {
            if (!TapAdSdk.isInitialized()) TapAdSdk.init(host,
                new TapAdConfig.Builder().withMediaId(NativeAdConfig.MEDIA).withMediaName("孤屿遗章")
                    .withMediaKey(NativeAdConfig.KEY).enableDebug(false).shakeEnabled(false)
                    .withCustomController(new TapAdCustomController() {
                        @Override public boolean isCanUseLocation() { return false; }
                        @Override public boolean isCanUsePhoneState() { return false; }
                        @Override public boolean isCanUseWifiState() { return false; }
                        @Override public boolean isCanUsePhoneMacAddress() { return false; }
                        @Override public boolean isCanUseBssid() { return false; }
                        @Override public boolean isCanUseSsid() { return false; }
                        @Override public boolean isCanUseSensor() { return false; }
                        @Override public boolean isCanUseWriteExternal() { return false; }
                        @Override public boolean isCanUseOaid() { return true; }
                        @Override public boolean isCanUseAndroidId() { return true; }
                        @Override public boolean alist() { return false; }
                    }).build());
            waitForReady(request, 0);
        } catch (Throwable error) { finish(request, false, "广告初始化失败，请稍后再试。"); }
    }
    private void waitForReady(Request request, int attempt) {
        if (!current(request)) return;
        try {
            if (TapAdSdk.isInitialized()) {
                if (nativeAds == null) nativeAds = TapAdManager.get().createAdNative(host);
                load(request);
            } else if (attempt < 20) handler.postDelayed(() -> waitForReady(request, attempt+1), 500);
            else finish(request, false, "广告初始化超时，请稍后再试。");
        } catch (Throwable error) { finish(request, false, "广告暂不可用，请稍后再试。"); }
    }
    private void load(Request request) {
        try {
            String user = preferences.getString("ad-user", null);
            if (user == null) { user = UUID.randomUUID().toString(); preferences.edit().putString("ad-user", user).apply(); }
            AdRequest adRequest = new AdRequest.Builder().withSpaceId(NativeAdConfig.SPACE)
                .withRewardName("奖励机会").withRewardAmount(1).withUserId(user).withExtra1(request.id).build();
            nativeAds.loadRewardVideoAd(adRequest, new TapAdNative.RewardVideoAdListener() {
                @Override public void onError(int code, String message) {
                    handler.post(() -> { if (!request.shown) finish(request, false, "暂无可播放的广告，请稍后再试。"); });
                }
                @Override public void onRewardVideoAdLoad(TapRewardVideoAd ad) {}
                @Override public void onRewardVideoCached(TapRewardVideoAd ad) {
                    handler.post(() -> show(request, ad));
                }
            });
            handler.postDelayed(() -> {
                if (!request.cached) finish(request, false, "广告加载超时，请稍后再试。");
            }, 30000);
        } catch (Throwable error) { finish(request, false, "广告加载失败，请稍后再试。"); }
    }
    private void show(Request request, TapRewardVideoAd ad) {
        if (!current(request) || request.cached) return;
        request.cached = true;
        ad.setRewardAdInteractionListener(new TapRewardVideoAd.RewardAdInteractionListener() {
            @Override public void onAdShow(TapRewardVideoAd ad) { handler.post(() -> request.shown = true); }
            @Override public void onAdClose(TapRewardVideoAd ad) {
                handler.post(() -> {
                    if (!current(request)) return;
                    request.closed = true;
                    if (request.verified) finish(request, true, "");
                    else handler.postDelayed(() -> finish(request, request.verified,
                        "未收到有效奖励校验，本次没有领取奖励。"), 10000);
                });
            }
            @Override public void onRewardVerify(TapRewardVideoAd ad, boolean valid, int amount, String name, int code, String message) {
                handler.post(() -> {
                    if (!current(request) || !valid) return;
                    request.verified = true;
                    if (request.closed) finish(request, true, "");
                });
            }
            @Override public void onVideoComplete(TapRewardVideoAd ad) {}
            @Override public void onVideoError(TapRewardVideoAd ad) {
                handler.post(() -> { if (!request.verified) finish(request, false, "视频播放失败，本次没有领取奖励。"); });
            }
            @Override public void onSkippedVideo(TapRewardVideoAd ad) {}
            @Override public void onAdClick(TapRewardVideoAd ad) {}
            @Override public void onAdValidShow(TapRewardVideoAd ad) {}
        });
        try { ad.showRewardVideoAd(host); }
        catch (Throwable error) { finish(request, false, "广告展示失败，请稍后再试。"); }
    }
    @Override public void destroy() {
        destroyed = true; pending = null; handler.removeCallbacksAndMessages(null);
        if (consent != null) consent.dismiss();
        if (nativeAds != null) nativeAds.dispose();
    }
}
