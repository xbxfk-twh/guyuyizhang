# ARM原生广告诊断

这是独立诊断应用，包名`top.guyuyizhang.adsprobe`，与正式游戏`top.guyuyizhang.game`不同，不读取游戏数据、不包含网页资源、不发放游戏货币。普通`安卓包装/build.py`不包含本目录，正式游戏APK仍没有原生广告SDK。

本次真实测试配置：媒体1113829、横屏激励视频位1073933，均由作者已登录的TapADN账号创建，保持测试状态，暂未启用服务端奖励验证。不得将诊断包或测试回调当作商业发奖已上线。

使用的官方SDK为5.3.1.8（非聚合版），下载及完整性校验来源：[官方资源页](https://ssp.dirichlet.cn/docs/resource-download/)。SDK及依赖放在仓库外的开发环境；源码只记录摘要，不包含二进制或实际媒体密钥。媒体配置需独立私有JSON，字段为`mediaId`、`spaceId`、`mediaKey`、`testMode:true`、`ssvEnabled:false`。

构建入口：

```powershell
python -X utf8 安卓包装/试验/build_probe.py --config <私有配置文件> --vendor-dir <SDK及依赖目录> --output <新的诊断APK路径>
```

工具只支持锁定摘要的这个AAR，合并其固定资源/组件，并使用已有本地测试签名；拒绝覆盖现有输出。正式接入应使用常规依赖/Manifest合并流程，不能将这个针对固定AAR的诊断构建器扩成未经审核的通用合并工具。

设备要求及步骤：

1. SDK只带`arm64-v8a`、`armeabi-v7a`原生库。本机GuyuTest是x86_64，编译成功不等于已在模拟器播放；需要ARM安卓手机实测。
2. 媒体平台“测试工具”只支持OAID/IMEI登记，当前没有登记手机。不请求电话/IMEI权限，应在作者同意后用真实手机OAID登记；页面提示预计5分钟后生效。不得伪造OAID、用Android ID冒充OAID或重复点击正式广告。
3. 安装诊断包，先阅读并勾选联网/OAID/Android ID测试说明，再初始化SDK、加载和播放。其余位置、电话、应用列表、传感器开关关闭。允许OAID不保证所有机型都能取得标识。
4. 查看SDK是否初始化、素材是否缓存、`onRewardVerify`及关闭回调，保留错误码。诊断中不要点击广告或安装广告里的应用。该应用不提供真实奖励或自动上传日志。
5. 播放验证后，再对接本地验奖模块与经过验证的账号、启用平台S2S并测试断网/重复回调，最后才集成正式游戏APK。

原生回调签名以AAR实际Java接口为准：当前多个事件会额外传入`TapRewardVideoAd`，与部分文档示例不同。`开发工具/检查/_verify_native_ad_sdk.py`可独立编译校验这个接口契约，不初始化SDK或请求广告。
