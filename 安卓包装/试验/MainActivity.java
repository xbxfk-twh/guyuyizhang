package top.guyuyizhang.adsprobe;

import android.app.Activity;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.widget.*;
import com.tapsdk.tapad.*;
import java.util.UUID;

/** Isolated SDK diagnostic. No game storage, game wallet or production reward endpoint. */
public final class MainActivity extends Activity {
    private TextView output;
    private Button initialize, load, show;
    private CheckBox consent;
    private volatile TapRewardVideoAd reward;
    private TapAdNative nativeAds;
    private boolean ready;
    private volatile int generation;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL); panel.setPadding(22, 20, 22, 20);
        panel.setBackgroundColor(0xfff4f0e4);
        TextView title = new TextView(this);
        title.setText("孤屿遗章 · 原生广告测试\n独立测试包，不读取游戏存档、不发放游戏货币。\n媒体与推广位均为测试状态。请勿点击广告或安装广告内应用。");
        title.setTextSize(16); panel.addView(title);
        consent = new CheckBox(this);
        consent.setText("同意本次测试联网调用TapADN，允许使用本机OAID和本测试应用的Android ID进行测试广告匹配；不授权位置、电话、应用列表或传感器采集。");
        panel.addView(consent);
        initialize = button(panel, "初始化SDK"); load = button(panel, "加载测试广告"); show = button(panel, "播放测试广告");
        load.setEnabled(false); show.setEnabled(false);
        output = new TextView(this); output.setTextSize(13);
        ScrollView scroll = new ScrollView(this); scroll.addView(output);
        panel.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1)); setContentView(panel);
        initialize.setOnClickListener(v -> initialize());
        load.setOnClickListener(v -> load());
        show.setOnClickListener(v -> {
            if (reward == null) return;
            show.setEnabled(false);
            try { reward.showRewardVideoAd(this); }
            catch (Throwable error) { log("展示失败："+error.getClass().getSimpleName()); load.setEnabled(true); }
        });
        log("仅限ARM安卓设备。请先在媒体平台测试工具登记测试设备。");
    }

    private Button button(LinearLayout parent, String text) {
        Button button = new Button(this); button.setText(text); parent.addView(button); return button;
    }
    private void log(String text) {
        runOnUiThread(() -> output.append(text.replace(ProbeConfig.KEY, "[redacted]")+"\n"));
    }
    private void initialize() {
        if (!consent.isChecked()) { log("请先阅读并同意本次测试的数据使用说明。"); return; }
        initialize.setEnabled(false);
        try {
            TapAdCustomController privacy = new TapAdCustomController() {
                @Override public boolean isCanUseLocation() { return false; }
                @Override public boolean isCanUsePhoneState() { return false; }
                @Override public boolean isCanUseWifiState() { return false; }
                @Override public boolean isCanUsePhoneMacAddress() { return false; }
                @Override public boolean isCanUseBssid() { return false; }
                @Override public boolean isCanUseSsid() { return false; }
                @Override public boolean isCanUseSensor() { return false; }
                @Override public boolean isCanUseWriteExternal() { return false; }
                @Override public boolean isCanUseOaid() { return true; }
                @Override public boolean alist() { return false; }
                @Override public boolean isCanUseAndroidId() { return true; }
            };
            TapAdSdk.init(this, new TapAdConfig.Builder().withMediaId(ProbeConfig.MEDIA)
                .withMediaName("孤屿遗章").withMediaKey(ProbeConfig.KEY).enableDebug(false)
                .shakeEnabled(false).withCustomController(privacy).build());
            waitForReady(0);
        } catch (Throwable error) {
            log("初始化失败："+error.getClass().getSimpleName()); initialize.setEnabled(true);
        }
    }
    private void waitForReady(int attempt) {
        if (isFinishing() || isDestroyed()) return;
        try {
            ready = TapAdSdk.isInitialized();
            if (ready) {
                nativeAds = TapAdManager.get().createAdNative(this);
                load.setEnabled(true); log("SDK已初始化。测试媒体："+ProbeConfig.MEDIA);
            } else if (attempt < 20) {
                handler.postDelayed(() -> waitForReady(attempt+1), 500);
            } else {
                initialize.setEnabled(true); log("SDK在10秒内未就绪，可重试初始化。");
            }
        } catch (Throwable error) {
            initialize.setEnabled(true); log("检查初始化失败："+error.getClass().getSimpleName());
        }
    }
    private void load() {
        if (!ready) return;
        final int current = ++generation;
        load.setEnabled(false); show.setEnabled(false); reward = null;
        log("请求测试激励视频位："+ProbeConfig.SPACE);
        AdRequest request = new AdRequest.Builder().withSpaceId(ProbeConfig.SPACE)
            .withRewardName("测试校验").withRewardAmount(1)
            .withUserId("isolated-sdk-probe").withExtra1(UUID.randomUUID().toString()).build();
        try {
            nativeAds.loadRewardVideoAd(request, new TapAdNative.RewardVideoAdListener() {
                @Override public void onError(int code, String message) {
                    if (current != generation) return;
                    log("加载失败 code="+code+" message="+message); runOnUiThread(() -> load.setEnabled(true));
                }
                @Override public void onRewardVideoAdLoad(TapRewardVideoAd ad) { log("广告信息已获取，等待素材缓存。"); }
                @Override public void onRewardVideoCached(TapRewardVideoAd ad) {
                    if (current != generation) return;
                    reward = ad; log("测试素材已缓存，可点击播放。");
                    ad.setRewardAdInteractionListener(new TapRewardVideoAd.RewardAdInteractionListener() {
                        @Override public void onAdShow(TapRewardVideoAd ad) { log("广告已展示。"); }
                        @Override public void onAdClose(TapRewardVideoAd ad) { log("广告已关闭。"); runOnUiThread(() -> load.setEnabled(true)); }
                        @Override public void onVideoComplete(TapRewardVideoAd ad) { log("视频播放结束，等待奖励校验。"); }
                        @Override public void onVideoError(TapRewardVideoAd ad) { log("视频播放失败。"); runOnUiThread(() -> load.setEnabled(true)); }
                        @Override public void onRewardVerify(TapRewardVideoAd ad, boolean valid, int amount, String name, int code, String message) {
                            log("原生奖励回调 valid="+valid+" code="+code+"；诊断包不发游戏货币。");
                        }
                        @Override public void onSkippedVideo(TapRewardVideoAd ad) { log("视频已跳过。"); }
                        @Override public void onAdClick(TapRewardVideoAd ad) { log("广告点击事件。"); }
                        @Override public void onAdValidShow(TapRewardVideoAd ad) { log("有效展示事件。"); }
                    });
                    runOnUiThread(() -> show.setEnabled(true));
                }
            });
            handler.postDelayed(() -> {
                if (current == generation && reward == null) {
                    generation++; log("加载超过30秒，可重新尝试。"); load.setEnabled(true);
                }
            }, 30000);
        } catch (Throwable error) { log("请求失败："+error.getClass().getSimpleName()); load.setEnabled(true); }
    }
    @Override public void onDestroy() { generation++; handler.removeCallbacksAndMessages(null);
        if (nativeAds != null) nativeAds.dispose();
        super.onDestroy(); }
}
