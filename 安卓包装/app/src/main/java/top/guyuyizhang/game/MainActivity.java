package top.guyuyizhang.game;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.ConsoleMessage;
import android.webkit.JsPromptResult;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import android.webkit.MimeTypeMap;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;
import java.util.Locale;

/** Android shell only. All game rules and assets come from the single web source. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String ENTRY = "https://" + HOST + "/assets/index.html";
    private WebView web;
    private boolean suspended;
    private boolean exitDialogOpen;
    private static final int EXPORT_BACKUP = 4101, IMPORT_BACKUP = 4102;
    private static final int BACKUP_LIMIT = 20 * 1024 * 1024;
    private String pendingBackup;
    private boolean backupPickerOpen;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
        web = new WebView(this);
        WebView.setWebContentsDebuggingEnabled(false);
        web.setBackgroundColor(Color.rgb(16, 16, 12));
        setContentView(web);
        web.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets safe = insets.getInsets(WindowInsets.Type.displayCutout()
                    | WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
            } else if (Build.VERSION.SDK_INT >= 28 && insets.getDisplayCutout() != null) {
                android.view.DisplayCutout cutout = insets.getDisplayCutout();
                view.setPadding(cutout.getSafeInsetLeft(), cutout.getSafeInsetTop(),
                    cutout.getSafeInsetRight(), cutout.getSafeInsetBottom());
            } else view.setPadding(0, 0, 0, 0);
            return insets;
        });
        configureWebView();
        hideSystemBars();
        // Stable origin is essential: never change it between updates or local saves disappear.
        web.loadUrl(ENTRY);
    }

    private void configureWebView() {
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setTextZoom(100);
        web.setWebChromeClient(new WebChromeClient() {
            // Fixed commands from our exact local entry page only. No generic JS/native bridge.
            @Override public boolean onJsPrompt(WebView view, String url, String message,
                                                 String value, JsPromptResult result) {
                if (!message.startsWith("guyu-backup:")) return false;
                if (!ENTRY.equals(url) || !ENTRY.equals(view.getUrl()) || backupPickerOpen) {
                    result.cancel(); return true;
                }
                boolean exporting = "guyu-backup:export".equals(message);
                if (!exporting && !"guyu-backup:import".equals(message)) {
                    result.cancel(); return true;
                }
                if (exporting && (value == null || value.length() == 0 || value.length() > BACKUP_LIMIT
                    || !value.matches("[A-Za-z0-9+/=\\s]+"))) {
                    result.cancel(); return true;
                }
                Intent pick = new Intent(exporting ? Intent.ACTION_CREATE_DOCUMENT : Intent.ACTION_OPEN_DOCUMENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE); pick.setType("text/plain");
                if (exporting) pick.putExtra(Intent.EXTRA_TITLE, "Isle-of-Lost-Chapters-save-" + System.currentTimeMillis() + ".txt");
                pendingBackup = exporting ? value : null;
                try {
                    backupPickerOpen = true;
                    startActivityForResult(pick, exporting ? EXPORT_BACKUP : IMPORT_BACKUP);
                    result.confirm("pending");
                } catch (RuntimeException unavailable) {
                    pendingBackup = null; backupPickerOpen = false; result.cancel();
                    backupNotice("无法打开系统文件选择器，请使用存档码复制备份。");
                }
                return true;
            }
            @Override public boolean onConsoleMessage(ConsoleMessage message) {
                if (message.messageLevel() == ConsoleMessage.MessageLevel.ERROR)
                    Log.e("GuyuWeb", message.message() + " at " + message.sourceId() + ":" + message.lineNumber());
                return true;
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!HOST.equals(uri.getHost())) return null;
                String path = uri.getPath();
                if (!"https".equals(uri.getScheme()) || path == null || !path.startsWith("/assets/")
                    || path.contains("..") || path.contains("\\")) return notFound();
                String asset = path.substring("/assets/".length());
                try {
                    // Asset names may contain Chinese; the URL helper rejects such names.
                    int dot = asset.lastIndexOf('.');
                    String extension = dot < 0 ? "" : asset.substring(dot + 1).toLowerCase(Locale.ROOT);
                    String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
                    if (asset.endsWith(".js")) mime = "application/javascript";
                    if (asset.endsWith(".json")) mime = "application/json";
                    if (mime == null) mime = "application/octet-stream";
                    return new WebResourceResponse(mime,
                        mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json") ? "UTF-8" : null,
                        200, "OK", Collections.singletonMap("Cache-Control", "no-cache"),
                        getAssets().open("web/" + asset));
                } catch (IOException missing) { return notFound(); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (HOST.equals(uri.getHost()) && "https".equals(uri.getScheme())) return false;
                // Remote pages never enter the game WebView. API fetches are unaffected.
                if (request.isForMainFrame() && "https".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (RuntimeException unavailable) { Log.w("GuyuWeb", "No external browser"); }
                }
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (ENTRY.equals(url)) {
                    view.evaluateJavascript("window.GuyuFileBackup={save:code=>window.prompt('guyu-backup:export',code),"
                        + "open:()=>window.prompt('guyu-backup:import','')};", null);
                    setWebSuspended(suspended);
                }
            }
        });
    }

    private void backupNotice(String text) {
        if (web != null) web.evaluateJavascript("document.dispatchEvent(new CustomEvent('guyu-backup-notice',{detail:"
            + JSONObject.quote(text) + "}));", null);
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != EXPORT_BACKUP && request != IMPORT_BACKUP) return;
        backupPickerOpen = false;
        final String code = pendingBackup; pendingBackup = null;
        if (result != RESULT_OK || data == null || data.getData() == null) {
            backupNotice("已取消文件操作，当前进度未变。"); return;
        }
        final Uri uri = data.getData();
        new Thread(() -> {
            try {
                if (request == EXPORT_BACKUP) {
                    if (code == null) throw new IOException("Missing pending backup");
                    try (OutputStream stream = getContentResolver().openOutputStream(uri, "wt")) {
                        if (stream == null) throw new IOException("No output stream");
                        stream.write(code.getBytes(StandardCharsets.UTF_8)); stream.flush();
                    }
                    runOnUiThread(() -> backupNotice("备份文件已保存。"));
                } else {
                    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                    try (InputStream stream = getContentResolver().openInputStream(uri)) {
                        if (stream == null) throw new IOException("No input stream");
                        byte[] buffer = new byte[8192]; int count;
                        while ((count = stream.read(buffer)) != -1) {
                            if (bytes.size() + count > BACKUP_LIMIT) throw new IOException("Backup too large");
                            bytes.write(buffer, 0, count);
                        }
                    }
                    final String text = new String(bytes.toByteArray(), StandardCharsets.UTF_8);
                    runOnUiThread(() -> {
                        if (web == null || !ENTRY.equals(web.getUrl())) return;
                        web.evaluateJavascript("(()=>{const t=document.getElementById('codex-text');"
                            + "if(!t||t.readOnly||!document.getElementById('codex-preview'))return false;"
                            + "t.value=" + JSONObject.quote(text) + ";t.dispatchEvent(new Event('input'));return true;})()",
                            applied -> { if (!"true".equals(applied)) backupNotice("请重新打开导入存档窗口，再选择备份文件。"); });
                    });
                }
            } catch (Exception error) {
                runOnUiThread(() -> backupNotice("文件操作失败，请重试或使用存档码复制备份。"));
            }
        }, "GuyuBackupFile").start();
    }

    private WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
            Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    private void setWebSuspended(boolean value) {
        web.evaluateJavascript("if(typeof UI!=='undefined')UI.setHostSuspended(" + value + ");", null);
    }

    @Override protected void onPause() {
        suspended = true;
        // Pause only after the save callback returns. A watchdog prevents lost callbacks from leaving timers running.
        final WebView current = web;
        web.evaluateJavascript("if(typeof UI!=='undefined')UI.setHostSuspended(true);", result -> {
            if (suspended && current == web) { web.onPause(); web.pauseTimers(); }
        });
        web.postDelayed(() -> { if (suspended && current == web) { web.onPause(); web.pauseTimers(); } }, 750);
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        suspended = false;
        if (web != null) {
            web.resumeTimers(); web.onResume(); setWebSuspended(false);
            hideSystemBars();
        }
    }

    @Override public void onWindowFocusChanged(boolean focused) {
        super.onWindowFocusChanged(focused);
        if (focused) hideSystemBars();
    }

    private void hideSystemBars() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    @Override public void onBackPressed() {
        if (exitDialogOpen) return;
        web.evaluateJavascript("typeof UI!=='undefined' && UI.handleBack()", handled -> {
            if (!"true".equals(handled) && !isFinishing() && !suspended) {
                exitDialogOpen = true;
                AlertDialog dialog = new AlertDialog.Builder(this).setTitle("退出游戏")
                    .setMessage("保存进度并退出？")
                    .setNegativeButton("继续玩", (d, w) -> {})
                    .setPositiveButton("保存并退出", (d, w) ->
                        web.evaluateJavascript("typeof UI==='undefined' || UI.setHostSuspended(true)", saved -> {
                            if (!"false".equals(saved)) finish();
                            else {
                                setWebSuspended(false);
                                new AlertDialog.Builder(this).setTitle("进度未保存")
                                    .setMessage("请继续游戏并导出存档码，再退出。")
                                    .setPositiveButton("知道了", null).show();
                            }
                        }))
                    .create();
                dialog.setOnDismissListener(d -> exitDialogOpen = false);
                dialog.show();
            }
        });
    }

    @Override protected void onDestroy() {
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }
}
