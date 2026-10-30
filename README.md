# 孤屿遗章

黑白版画风的文字生存游戏，支持中英文切换。第一章探索孤岛，第二章进入失落的海底文明；灵灰与既有彩色皮肤、限定物保留彩色表现。纯 HTML / CSS / JavaScript，无框架、无编译步骤。

## 本地运行

需要 Python 3 和现代浏览器，在仓库根目录执行：

```powershell
python -m http.server 8000 --bind 127.0.0.1 --directory "孤屿遗章-游戏 - 发布"
```

打开 http://127.0.0.1:8000 。游戏只维护一份源码，官网和安卓包装不会成为另一套实现。

## 目录入口

| 目录 | 职责 |
| --- | --- |
| [孤屿遗章-游戏 - 发布/](孤屿遗章-游戏%20-%20发布/) | 唯一游戏源码及运行资源 |
| [回归测试/](回归测试/) | 自动回归、隔离存储与测试夹具 |
| [开发工具/](开发工具/) | 检查、清单同步、预览、打包及独立存档服务 |
| [安卓包装/](安卓包装/README.md) | 从同一份网页源码构建原生外壳 |
| [官网/](官网/README.md) | 独立官网、下载页与轻量后端 |
| [文档/](文档/README.md) | 当前维护状态、开发计划、验收与发布记录 |
| 荒岛日记-设计文档/、亚克兰蒂斯-设计文档/ | 历史设计参考，现行规则须与代码核对 |

详细职责、工具副作用与产物边界见 [目录说明](README_目录说明.md)。APK/ZIP、玩家存档、凭据、私人档案和测试输出不进入 Git。

## 开发与验证

使用 Node.js 22、Python 3.12 和 Chrome 复现 CI：

```powershell
python -X utf8 开发工具/检查/_verify_repository.py
node 回归测试/run.js
python -X utf8 回归测试/test_release.py
python -X utf8 开发工具/打包/_pack.py --check
# 界面专项使用隔离 Chrome；可用 CHROME_PATH 指定路径
node 回归测试/run.js --browser --only=_verify_oct29_saves
```

全套界面检查命令为 `node 回归测试/run.js --browser`。日志位于忽略目录 `回归测试/_out/`。[GitHub Actions](https://github.com/xbxfk-twh/guyuyizhang/actions/workflows/verify.yml) 执行核心、仓库边界、打包只读校验和重点浏览器检查；不会打包、部署或写入真实玩家存档。

`runtime-manifest.json` 是脚本加载顺序的单一清单。新增脚本后运行 `node 开发工具/生成/_sync_runtime.js` 同步静态 HTML。存档模块在 `js/storage/`，已迁功能规则在 `js/features/`，界面输入、提交和功能视图在 `js/ui/`。`game.js` 与 `ui.js` 仍有待迁移职责，整体重构尚未全部完成。

开始修改前阅读 [开发约定](AGENTS.md)、[参与维护](CONTRIBUTING.md) 和 [维护现状](文档/维护现状.md)。当前已知问题和完整测试边界以维护现状为准，不能把重点检查通过理解为全套界面通过。

## 运行版本与下载

当前源码版本只在游戏 `index.html` 定义，缓存参数由工具同步；不在多份文档手工维护版本号。[官网安卓下载页](https://guyuyizhang.top:8443/download.html) 提供独立测试 APK。独立 APK 使用本地存档，迁移方式及平台能力限制见 [安卓说明](安卓包装/README.md)。

## 版权

许可证尚未确定。代码与美术资源版权归作者所有；未经作者许可，请勿商用或二次分发。保留各素材自带的第三方许可和来源说明。
