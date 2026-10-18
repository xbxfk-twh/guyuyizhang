# DeepSeek Dispatch 入口

独立任务入口脚本：`开发工具/检查/_deepseek_dispatch.py`。调用同目录 `_deepseek_worker.py`（参数 `--model deepseek-v4-pro --steps 65`）。

## Windows 运行方式

无需启动器，直接命令行运行：

```
python 开发工具/检查/_deepseek_dispatch.py
```

GUI 会在多行框填写任务描述，点“开始”。可双击 `.py`（若 pythonw 关联 `.pyw` 也可复制为 `.pyw`），但不建议依赖双击，命令更清晰。

CLI：

```
python 开发工具/检查/_deepseek_dispatch.py --task 我的任务.txt
python 开发工具/检查/_deepseek_dispatch.py --task 我的任务.txt --dry-run
python 开发工具/检查/_deepseek_dispatch.py --self-test
```

`--dry-run` 只验证流程与命令构造，不调用 API。`--self-test` 验证任务目录、命令构造、STEP_LIMIT 识别，无需 API。

## 行为要点

- 任务原文复制到 `ROOT/回归测试/_out/任务记录/run_*/task.txt`，日志 `run.log`，`result.json` 记录 status/returncode/run 目录。
- 子进程 UTF-8、windowsHide（CREATE_NO_WINDOW），cwd 为 ROOT。
- 若输出 `STEP_LIMIT <path>`，自动追加 `--resume <path>` 重跑，最多 3 轮。绝不把步数达到当完成。
- `FINISHED` 仅表示模型停止，需人工验收；不自动打包。失败保留完整日志。
- GUI“停止”仅 terminate 当前子进程，状态标为中断；工作区可能部分修改，需续接。
- 不查询额度、不热切换会话模型、不上传目录、不打包。默认每次全部走 DeepSeek，不依赖 Codex 额度。

## 交接

后续传话/继续沟通仍消耗 Codex。交接物为 task/log/result/snapshots。用户已授权 worker 可改游戏源码/回归测试/文档，runner 已有快照/固定测试/DPAPI 凭据。

## 限制

- 本入口不改配置、不上传、不打包。
- 不打印凭据；日志中 `sk-` 会被替换为 `[REDACTED]`。
- 本入口无需打开 Codex 会话，自己填写要求即可。
