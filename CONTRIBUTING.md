# 参与维护

先阅读 [README](README.md)、[开发约定](AGENTS.md) 和 [维护现状](文档/维护现状.md)。唯一游戏源码是 `孤屿遗章-游戏 - 发布/`；官网、安卓外壳、服务器和工具各自独立，不复制出第二套游戏实现。

## Git 工作方式

1. 从最新 `origin/main` 新建 `codex/<任务>` 或功能分支。已有未提交工作时使用独立 worktree，避免混入另一项任务。
2. 提交围绕一个可验证的结果，说明问题、最终行为与验证；避免仅为排版重写大文件。新增或移动脚本须核对动态引用和运行清单。
3. 提交前查看 `git diff --check`、`git diff --stat` 和 `git diff --cached`，只暂存本次工作。不得提交凭据、玩家存档、个人资料、测试输出或发行包。
4. 推送分支并查看 GitHub Actions。主线合并须基于最新主线，禁止强推覆盖；正式版本号只在游戏 `index.html` 定义。打包与部署必须另有作者指示。

## 验证

```powershell
python -X utf8 开发工具/检查/_verify_repository.py
node 回归测试/run.js
python -X utf8 回归测试/test_release.py
python -X utf8 开发工具/打包/_pack.py --check
# 界面变更
node 回归测试/run.js --browser
# 存档专项（模拟平台、临时存储与隔离 Chrome）
node 回归测试/run.js --browser --only=_verify_oct29_saves
```

日志写入忽略目录 `回归测试/_out/`，不得拿真实玩家存档做破坏性测试。全套历史界面检查仍有未解决失败，详见维护现状；不能用重点检查通过来宣称全套通过，也不能为变绿而删除断言。

## 目录与产物

源码与运行资源进入 Git；APK/ZIP、签名密钥、SQLite 数据库与备份、`.env`、本地配置、私人交接和截图日志留在仓库外。可再生成的日志通过 CI artifact 查看，发行包使用独立下载服务。历史设计文档仅供参考，当前规则以代码和实际验证为准。

后端仅依赖 Python 标准库，不需要为游戏安装 Node 依赖。请勿在普通检查或 CI 中调用 SSH、部署工具、生产广告或生产存档写入接口。
