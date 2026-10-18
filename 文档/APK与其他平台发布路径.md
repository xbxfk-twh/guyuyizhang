# APK与其他平台发布路径

核对日期：2026-10-07。当前源码：孤屿遗章-游戏 - 发布/，纯HTML/CSS/JavaScript。下述为实施方案，尚未制作APK/EXE、注册平台或支付费用。

## 建议顺序

1. 保持TapTap现有H5版本。
2. Capacitor包装Android离线测试版，先验证手机画面、触摸、音频和存档，不迁移Unity。
3. itch.io发布浏览器试玩及APK下载；要售卖完整包时设置Downloadable。
4. Electron制作Windows独立版本，把广告经济改为正常游戏获取或买断附赠，然后准备Steam。先验证桌面包和收款资料，再交100美元。

## 项目检查结果

- 当前正式ZIP：248.72MiB；解压251.90MiB；633文件；最大文件3.71MiB、最长路径65字符。符合itch.io公布的1000文件、500MB解压总量、200MB单文件和240字符路径限额，但仍需真实上传预览，不能据此承诺平台审核通过。
- 当前包有guyuyizhang/顶层目录。浏览器发布时建议另做index.html直接位于ZIP入口层的发行包，避免平台入口解析差异；不要覆盖TapTap交付包。
- js/ads.js依赖window.tap.createRewardedVideoAd。普通浏览器和独立Android WebView不会自动提供该接口，当前未支持环境会提示广告不可用；包装APK不会继承TapTap广告资格。
- 本局及账号存档采用localStorage等本地存储。平台域名、APK和桌面壳属于不同存储环境，不能自动共享旧档。现有账号导出码不能当作完整本局迁移功能；另需完整存档导入导出，并校验版本和异常输入。
- 本机有Node/Python和JDK25；默认Android Studio与Android SDK路径未发现，ANDROID_HOME/ANDROID_SDK_ROOT未设置。未安装工具或改系统环境；若Unity已有SDK，可在实施阶段另定位。

## 路径A：Capacitor → 签名APK

采用独立包装工程，唯一游戏源码保持原目录；包装工程只从源码同步生成web资源，禁止两套游戏代码分头修改。

实施步骤：

1. 安装Android Studio和对应SDK，使用与所选Capacitor版本兼容的JDK/Gradle，优先IDE配套环境。包名确定后长期保持。
2. 在独立发行工程初始化npm，安装同一主版本的@capacitor/core、@capacitor/cli、@capacitor/android。配置webDir为复制源码生成的www目录。
3. 同步完整HTML/CSS/JS/美术音频资源，执行npx cap add android、npx cap sync android，使用Android Studio或Gradle构建。
4. Android设横屏与安全区、适配返回键；暂停/恢复时正确处理音频和时间；防止重复后台计时。补应用专属存储备份、完整存档迁移入口。
5. 外部链接只打开允许的页面，包装壳禁止任意远程页面获得原生桥。网络断开时应仍可正常玩核心游戏。
6. 跨平台版本单独配置广告入口：测试版不模拟观看成功；正式版若接Android广告，须申请原生广告位并通过桥调用SDK，完整观看才发奖励。不能只用TapTap H5广告位。
7. 使用独立模拟器/测试手机验证新开局、重启、覆盖更新保档、冬季/战斗、触摸长按数量、仓库和地窖、音频、离线、广告取消/完成/超时。
8. 生成正式签名APK，妥善保存签名密钥；之后所有更新保持包名和签名，否则无法覆盖安装。可先给测试玩家下载安装，之后再按具体应用商店要求提交。

Capacitor文档：
- https://capacitorjs.com/docs/getting-started
- https://capacitorjs.com/docs/getting-started/environment-setup
- https://capacitorjs.com/docs/android

## 路径B：itch.io → 浏览器试玩/独立包下载

平台可免费创建游戏页和上传；这属于自助发布，不等于没有内容规则、搜索收录审核或版权要求。网页免费游玩/捐赠是最快尝试；下载包可设最低售价。

操作路径：注册账号 → Create new project → 填标题/简介/截图 → HTML Game上传网页ZIP并勾选浏览器运行 → 设置全屏启动/手机支持 → 先Draft或Restricted预览 → 测试手机与PC、存档重开、音乐启动 → 再公开。

APK/EXE作为下载文件上传并标明对应系统；卖完整下载版设置Downloadable和最低售价，完成收款渠道/税务资料。官方当前说明HTML5嵌入版收款为捐赠，不能默认以为能直接付费解锁网页试玩。中文游戏可以发布，但曝光、当地网络可用性、支付实际支持需另测。

官方资料：
- https://itch.io/docs/creators/faq
- https://itch.io/docs/creators/html5
- https://itch.io/docs/creators/payments

## 路径C：Electron → Windows版本 → Steam

技术上可保留现有网页游戏，用Electron/Chromium包装成可启动的Windows程序，不需先改成Unity。把浏览器数据固定在应用用户目录，打包资源与存档分离；禁用renderer的Node权限、开启contextIsolation，外链离开游戏窗口。先验证全屏/窗口、键鼠、长按替代、字体、音频、更新保档和离线。

Steam发行分支需做的产品调整：

- 移除所有观看广告领奖、广告复活和广告存档入口；Steam明确不支持奖励广告。
- 广告币相关商城保留商品但重新设计货币与获取途径；旧余额可迁移，不应清零。可考虑买断版获得完整核心功能，稀有物品改游戏内获取。
- 复活与备份改游戏内条件或既有资源获取；魂点解锁角色可以作为游戏进度机制保留。
- 第三方服务广告与所有活动在Steam版本重新检查，不能沿用当前H5页面直接提交。
- 准备Windows可执行构建、商店图/截图/预告、描述、价格和真实内容问卷；AI生成的画面、音频等玩家可见内容按问卷如实披露，并确认素材使用权。AI工具本身不意味着必然被拒。
- Steam成就/云存档可后续接入；声明支持的功能必须实际可用。云存档同步应用存档文件，不能仅声明一个localStorage域名就视作完成。

Steam账号及费用：

- 允许以个人身份入驻；完成法律姓名/身份、同名银行账户及税务信息，不是必须先开公司。
- 每款游戏Steam Direct费100美元（适用税费另算）；不能使用Steam钱包余额支付。100美元不能替代审核或保证推荐曝光。
- 费用不可直接退款；达到1000美元Adjusted Gross Revenue后，按官方规则随结算返还。
- 当前官方入驻页写首次几款游戏付款后至少21天等待，Coming Soon至少公开两周；以实际后台为准，其他旧教程写30天可能不同。页面与游戏构建均要审核。
- 上传步骤：Steamworks入驻 → 获得AppID → 建商店页 → 内容问卷和定价 → 配置Windows Depot/启动EXE → SteamPipe上传 → Steam测试分支验证 → 商店页/构建审核 → 满足等待期后发布。

官方资料：
- https://www.electronjs.org/docs/latest/tutorial/distribution-overview
- https://partner.steamgames.com/doc/gettingstarted/onboarding
- https://partner.steamgames.com/doc/gettingstarted/appfee
- https://partner.steamgames.com/doc/store/review_process
- https://partner.steamgames.com/doc/marketing/advertising
- https://partner.steamgames.com/doc/gettingstarted/contentsurvey

## 当前决策

最合适的下一步是Android离线测试包，然后itch.io试玩；Steam作为独立买断发行版准备。现阶段无需购买Unity插件或先支付Steam费。签名/银行/税务和账户操作在实施时由作者提供必要资料；不在公开仓库记录凭据。
