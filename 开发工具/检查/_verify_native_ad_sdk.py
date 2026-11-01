"""Compile the native ad API contract against a verified vendor AAR. Never runs ads."""
import argparse
import hashlib
from pathlib import Path
import subprocess
import tempfile
import zipfile


SOURCE = r'''
import android.app.Activity;
import android.content.Context;
import com.tapsdk.tapad.*;

// Compile-only contract, not a game bridge and never initialized by this checker.
final class NativeAdSdkContract {
    static void initializeAfterConsent(Context context, long mediaId, String name, String key,
                                       TapAdCustomController privacy) {
        TapAdConfig config = new TapAdConfig.Builder()
            .withMediaId(mediaId).withMediaName(name).withMediaKey(key)
            .enableDebug(false).shakeEnabled(false).withCustomController(privacy).build();
        TapAdSdk.init(context, config);
    }
    static void request(Activity activity, long space, String account, String nonce, int amount,
                        TapAdNative.RewardVideoAdListener listener) {
        AdRequest request = new AdRequest.Builder().withSpaceId(space)
            .withRewardName("星之点").withRewardAmount(amount)
            .withUserId(account).withExtra1(nonce).build();
        TapAdManager.get().createAdNative(activity).loadRewardVideoAd(request, listener);
    }
    interface Events {
        void closed();
        void verified(boolean valid, int code);
    }
    // Current AAR callbacks take an ad parameter, unlike some documentation examples.
    static abstract class Listener implements TapRewardVideoAd.RewardAdInteractionListener {
        final Events events;
        Listener(Events events) { this.events = events; }
        @Override public void onAdShow(TapRewardVideoAd ad) {}
        @Override public void onAdClose(TapRewardVideoAd ad) { events.closed(); }
        @Override public void onVideoComplete(TapRewardVideoAd ad) {}
        @Override public void onVideoError(TapRewardVideoAd ad) {}
        @Override public void onRewardVerify(TapRewardVideoAd ad, boolean valid, int amount,
                                             String name, int code, String message) {
            events.verified(valid, code);
        }
        @Override public void onSkippedVideo(TapRewardVideoAd ad) {}
        @Override public void onAdClick(TapRewardVideoAd ad) {}
        @Override public void onAdValidShow(TapRewardVideoAd ad) {}
    }
}
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--aar', required=True, type=Path)
    parser.add_argument('--android-jar', required=True, type=Path)
    parser.add_argument('--javac', default='javac')
    args = parser.parse_args()
    data = args.aar.read_bytes()
    expected = '9a66dee30c334583de94cac2fba8b4a1'
    if hashlib.md5(data).hexdigest() != expected:
        raise RuntimeError('AAR differs from the verified official 5.3.1.8 download')
    print('OK official AAR digest')
    with zipfile.ZipFile(args.aar) as archive, tempfile.TemporaryDirectory(prefix='guyu-ad-api-') as folder:
        work = Path(folder)
        jar = work / 'classes.jar'
        jar.write_bytes(archive.read('classes.jar'))
        abis = sorted({name.split('/')[1] for name in archive.namelist()
                       if name.startswith('jni/') and name.endswith('.so')})
        if abis != ['arm64-v8a', 'armeabi-v7a']:
            raise RuntimeError('Unexpected ABI set; audit runtime support before continuing')
        print('OK native libraries: ' + ', '.join(abis))
        source = work / 'NativeAdSdkContract.java'
        source.write_text(SOURCE, encoding='utf-8')
        result = subprocess.run([
            args.javac, '-encoding', 'UTF-8', '-source', '8', '-target', '8',
            '-bootclasspath', str(args.android_jar), '-cp', str(jar),
            '-d', str(work / 'classes'), str(source)
        ], capture_output=True, text=True, encoding='utf-8', errors='replace')
        if result.returncode:
            raise RuntimeError(result.stdout + result.stderr)
        if not (work / 'classes/NativeAdSdkContract$Listener.class').is_file():
            raise RuntimeError('Compiler did not produce the callback contract')
        print('OK SDK initialization, reward request and all callback signatures compile')
    print('AAR SHA256: ' + hashlib.sha256(data).hexdigest())
    print('Compile-only: no SDK initialization, ad request, device access or game package.')
    print('RESULT:PASS')


if __name__ == '__main__':
    main()
