# 安卓包装工程

这是供独立渠道直接下载安装的安卓包装；尚未完成应用商店审核。包名 `top.guyuyizhang.game`，Android 8.0及以上，横屏。

## 唯一源码与构建

游戏仍只修改 `../孤屿遗章-游戏 - 发布/`。本工程只实现Android生命周期、WebView本地资源和返回键，不复制维护第二套玩法。构建脚本自动同步全部游戏文件到临时目录，签名后逐文件比较APK与当前源码。

```powershell
python -X utf8 安卓包装/build.py
python -X utf8 安卓包装/build.py --verify "发行产物/实际文件名.apk"
```

需要JDK、Android SDK platform 36、build-tools 36.0.0。默认SDK位于用户 `.codex/android-sdk`，可用 `--sdk` 和 `--java` 指定。使用官方aapt2、javac、D8、zipalign、apksigner，游戏没有新增构建依赖。Windows原生工具使用英文临时路径，带中文名称的旧素材由Python写入ZIP。产物及SHA256在 `发行产物/`。

版本名称读取游戏 `index.html` 的BUILD_VER；Android覆盖安装还要求config.json中的versionCode递增。以后不要改包名、本地资源域名或签名证书。

测试签名密钥及密码记录在用户 `.codex/signing/guyuyizhang-test/`，不在仓库和APK内。必须备份整个目录；丢失签名将不能覆盖安装此测试版。正式上架前另确定发行证书、渠道与隐私说明。独立发行包关闭WebView调试。--debug-test只在临时原生源码启用调试，输出另一个“仅模拟器调试”APK，不得上传此包。userdebug系统镜像可自动开启WebView调试，和应用调试标记不同。

## 已实现

- 本地HTTPS资源域名，关闭任意file/content文件访问。外链离开游戏WebView，不提供任意原生JS桥。
- 横屏、沉浸显示和刘海安全边距。界面使用原HTML/CSS响应式布局。
- 后台先保存，暂停页面计时与音频；恢复时不补算现实离开时间，不覆盖玩家面板暂停和音量设置。
- 安卓返回键优先关闭普通弹窗/返回场景；忙碌和战斗时保留必要界面。最后弹出保存并退出确认，保存失败不强制退出。
- 固定应用存储，覆盖安装保留本局进度。卸载或系统清除应用数据会删除本地存档；请先导出存档码。

## 不能直接继承的功能

- TapTap H5广告和平台云接口已移除。星之点保留原账号钱包，商城支持15魂点兑换1星之点，也可反向兑换。旧钱包、邮件和兑换码字段保持兼容；不存在看广告奖励、免费广告备份或广告复活入口。
- H5旧存档属于另一个存储环境，不会自动进入APK。通过游戏菜单的存档码导出/导入迁移，先确认导出包含当前本局。
- 在线兑换码依赖网络和服务端跨域设置。2026-10-10使用测试源 `https://appassets.androidplatform.net` 做OPTIONS预检，返回200及允许来源*；未消耗真实兑换码，兑换全过程仍需验收。
- WebView版本由手机系统提供，旧系统需要更新Android System WebView。首次播放音乐仍需要玩家操作。

## 验收

检查安装启动、新游戏、继续、离线、皮肤、仓库/地窖、长按、战斗、输入法、声音、切后台、进程结束重启、同证书覆盖更新保档。模拟器验证不替代实际手机的触摸、扬声器、刘海与厂商省电策略检查。

独立浏览器接口检查：`node 回归测试/run.js --browser --only=android_host`。实际APK探针只接受已启动的专用模拟器（默认emulator-5554），会创建测试局并覆盖安装，不能用于玩家手机：

```powershell
node 开发工具/检查/_verify_android_apk.js "发行产物/实际文件名.apk"
```

截图写入回归测试/_out；原生探针不纳入默认回归，避免没有模拟器时阻断网页检查。

实现参考：[Android本地WebView资源加载](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content)、[Android官方SDK工具](https://developer.android.com/studio#command-tools)。本工程用仅处理本地资源域名的shouldInterceptRequest实现同一HTTPS加载方式，未引入AndroidX或Capacitor依赖。

## 2026-10-13 独立版验收

v1.12-20261013-003121、versionCode112005；628游戏资源逐字节匹配，zipalign和v2/v3签名通过。专用模拟器原生11项通过，包含正式独立APK安装、后台、进程结束与同签名覆盖保档、魂点/星点兑换余额保留。后台检查先等待onPause保存及WebView存储写入完成；不承诺刚写入就强制杀进程的极端情况。发行源码和DEX明确传false，应用无DEBUGGABLE标记；userdebug镜像系统自动开启调试，不用于断言普通手机的调试端口状态。

```powershell
python -X utf8 安卓包装/build.py --debug-test
node 开发工具/检查/_verify_android_apk.js "发行产物/对应_仅模拟器调试.apk" "发行产物/对应_安卓独立版.apk"
```


## 2026-10-18 v1.13打包校验

当前本地产物：v1.13-20261018-004416、versionCode113001，沿用原签名，629游戏资源逐字节匹配；zipalign/v2/v3签名、非调试标记与版本字段检查通过。核心38组、安卓宿主浏览器13项、食之包专项39项、提灯UI11项通过。本次没有可用已启动专用模拟器，未重做原生安装或覆盖保档验收；上节1.12原生结果不代表本次已验收。详见文档/发布记录/v1.13_发布验收记录.md。未上传发布。


## 2026-10-18 存档文件接口（源码完成，未打包）

- 网页使用文件下载/文件输入；安卓通过宿主注入的`GuyuFileBackup.save/open`调用系统创建/打开文档，仅限固定本地HTTPS主页和两种存档命令，不开放任意原生接口，也未打开file/content通用访问或增加存储权限。
- 导出选择目标文件后写UTF-8存档码；导入只读取用户选择的文本，20MiB上限，工作线程处理，回到游戏仍须预览和确认。取消、读写失败不会导入进度。宿主保存成功才通知“备份文件已保存”。
- 保留原包名、资源域名和签名配置。Java源码对Android36编译通过；独立浏览器验证宿主命令接线，不能替代安卓系统选择器/真实设备验收。当前v1.13 APK尚不含这次宿主修改。
