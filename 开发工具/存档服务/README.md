# 自有服务器备用存档

此服务只备份客户端进度，不是服务器权威战斗、经济或防作弊系统。Tap云正常时不会持续轮询自有服务器；Tap读取/上传失败时接管。全新设备遇到Tap空列表时也核对已有备用，避免把暂不可见当成新账号。

## 当前部署

- HTTPS入口：`https://guyuyizhang.top:8443/backup/v1/`。沿用官网nginx与证书，不改443现有服务或兑换服务。
- `guyu-save.service`，Python标准库、SQLite、zlib；监听127.0.0.1:18083，4个并发工作线程，服务内存上限96MiB、CPU上限20%。本次空闲实测约14MiB，不加载游戏美术或音频。
- 程序 `/opt/guyu-save/server.py`；数据库 `/var/lib/guyu-save/saves.sqlite3`；仅服务用户可写。私有配置 `/etc/guyu-save.json`，root:guyu-save、0640，包含MiniApp Secret与稳定的account_key。不要公开、重新生成或放入客户端；account_key变化会改变账号索引，必须与数据库一起保留。
- 每账号最近3份压缩快照，每份正文小于2MiB；全局压缩数据配额512MiB，最多10000账号。保存最短45秒，客户端正常重试间隔至少61秒。超过配额、读写失败或冲突均保留旧记录。
- `guyu-save-backup.timer` 每日使用SQLite一致性备份，目录 `/var/lib/guyu-save/backups`，保留7日。仍属于同一台服务器，不能称异地灾备。

## 身份与协议

1. 客户端 `tap.login` 取得一次性code，发送POST `/auth`。服务端只向固定Tap官方code2Session接口换取openid；不信任客户端自报账号ID，不下发session_key，不记录code、Authorization或存档正文。
2. 服务端用稳定account_key对openid作HMAC索引，签发256位随机令牌，仅在数据库存其SHA256；有效期30日，每账号最多3个有效设备会话。
3. GET `/latest` 携带Bearer令牌，返回found、版本与原始快照正文。校验最新快照失败时尝试前一份，仍返回当前写入版本，便于后续CAS。
4. POST `/save` 提交baseVersion与快照。SQLite事务核对版本，409表示另一设备已推进；重复同一正文幂等，不新增快照。磁盘异常、配额或节流不覆盖旧进度。
5. 客户端在恢复/上传前还验证快照完整性、当前局与账号，必要时明确选择。备用凭据单独保存在本机及Tap用户目录，不进入普通进度镜像或游戏内导出码。原始紧急备份可能包含凭据，应当私下保存。

H5使用Tap提供的身份接口；独立APK不自带Tap登录，仍按本地模式运行，通过完整存档文件/码迁移，不宣称自动跨端同步。Tap登录和自有服务器同时不可用时，已有本机记录仍保留；没有任何可核对记录时拒绝开空档覆盖。

## 验证与更新

```powershell
node 回归测试/server-save.test.js
node 回归测试/platform-save.test.js
node 开发工具/检查/_verify_oct29_saves.js
```

公开仓库仅包含服务源码与隔离测试，不携带作者机器上的 SSH 部署脚本或生产凭据。自建部署时需配置专用服务用户、私有配置文件、HTTPS 反向代理、systemd 资源限制和每日 SQLite 一致性备份。服务启动参数见 `python server.py --help`；不能将开发服务器端口直接暴露到公网。变更稳定 account_key 前须先制定账号数据迁移，不能随更新随机重置。

```sh
python3 server.py --db /var/lib/guyu-save/saves.sqlite3 --config /etc/guyu-save.json --port 18083
```

普通测试不运行部署、不连接生产数据库。下载文件与静态页面由 Web 服务直接分发，不使用存档进程传输 APK。

发布APK前须完成源文件逐字节比对、原签名检查与专用模拟器覆盖安装测试。下载文件由nginx直接发送，支持HTTP Range，不经过Python存档进程。当前源码构建号以游戏index.html为准。

官方接口依据：[tap.login](https://developer.taptap.cn/minigameapidoc/dev/api/open-api/login/tap.login/)、[code2Session](https://developer.taptap.cn/minigameapidoc/dev/server/login/code2Session/)。

## 临时取档（手动迁移）

此处描述本轮待部署的源码协议；线上服务尚未随本轮修改部署。自动账号备份保持原有协议。

- 新客户端 POST `/backup/v1/transfer/create`：`{format:"short8",owner:32位本机随机身份,requestId:32位随机请求号,body:完整导出内容,session?:已验证会话}`。返回8位字母和数字组合、`expiresAt`。去除易混字符，保证同时含字母与数字；正文仍用原完整校验格式，输入框不再显示长载荷。
- Tap身份可用时以服务器验证的账号计次，多设备共用配额。本设备匿名应急通道会关联到已验证身份；Tap不可用时以稳定本机迁移身份计次。匿名身份不能等同于跨设备实名账号，也不作为防作弊系统。
- 服务器时钟滚动1小时最多成功生成3次。SQLite `BEGIN IMMEDIATE` 串行核对配额，网络重试使用同一请求号取回同一码，不重复扣次数；服务重启保留小时配额。
- SQLite只记身份哈希、请求号、时间、码和正文哈希等小型配额收据，不存迁移正文；过小时清理，收据与身份映射各最多30000条。自动云备份的快照表不变。
- POST `/backup/v1/transfer/read`：`{code}`，返回完整正文及到期时间。读取不消耗码；预览取消不覆盖客户端进度。旧已发布客户端仍可生成及读取原SAVE格式，避免只更新后端使在线玩家失去迁移入口。
- 600秒到期不可读取；每10秒清理内存。迁移正文仅在内存压缩保留，最多500项、总额16MiB；不进入数据库或每日备份。重启会清空临时正文。原96MiB进程上限和IP节流保留。
- 手机导入只呈现取件码输入、预览与取消。桌面仍能保存、选择完整备份文件；文件正文走隐藏载荷而非8位输入框。移除手动粘贴旧长码入口，内部文件编解码及旧存档字段保持兼容。

隔离检查：`node 回归测试/temporary-save.test.js`、`node 开发工具/检查/_verify_oct30_transfer.js`、`node 开发工具/检查/_verify_progression_ui.js`。普通检查不连接生产服务。
