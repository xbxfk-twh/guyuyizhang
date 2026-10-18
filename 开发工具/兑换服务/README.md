# 单次兑换服务

部署地址：`https://redeem.guyuyizhang.top:8443`。服务器已有443服务，因此使用独立8443 TLS端口。

## 已实现

- SQLite事务锁定同一码，同一时间只有一个领取资格可成功。256位随机资格由游戏在请求前落盘；数据库只保留资格和码的SHA256，不保留原文。
- 网络返回丢失或本地写盘失败，原资格可重试领取同一回执；邮箱/钱包流水按回执去重。已用码不能转给另一个资格。通用码保留既有逻辑。
- 仅发魂点及广告币，不支持任意物品脚本。签发工具支持数量、奖励与Unix到期时间；0表示无到期时间。
- 后端仅监听127.0.0.1:18081。Nginx提供HTTPS、2KB请求限制、每IP速率/连接限制。服务独立非root账号运行，开机启动。
- Let's Encrypt免费证书，certbot.timer自动续期；deploy hook检查并重载Nginx。
- guyu-redeem-backup.timer每天执行SQLite一致性备份（不直接复制正在写入的数据库）；位置 `/var/lib/guyu-redeem/backups/latest.sqlite3`。本地输出目录也保存了初次备份。

## 发码（服务器SSH中执行）

例如生成100个各300魂点+30广告币的码，输出文件名必须未使用：

```sh
runuser -u guyu-redeem -- python3 /opt/guyu-redeem/server.py issue --count 100 --soul 300 --coins 30 --output /var/lib/guyu-redeem/feedback-001.csv
systemctl start guyu-redeem-backup.service
```

CSV仅保存在服务器专用目录，通过SSH/SFTP取回，逐个分发。原码不要放进源码、活动页或公共日志；每行只能发给一人。没有对外管理端口或网页发码入口。

## 运行检查与备份

```sh
systemctl status guyu-redeem
systemctl list-timers certbot.timer guyu-redeem-backup.timer
curl --fail https://redeem.guyuyizhang.top:8443/health
systemctl start guyu-redeem-backup.service
```

恢复前停止guyu-redeem，另行备份现状，再通过SQLite备份API恢复，并检查数据完整性。不可把旧数据库直接覆盖在线库：旧记录会让已使用的码重新可用。日备份最多覆盖到上次运行时，服务器丢失后恢复可能缺当天兑换，因此售卖前需要安排独立备份与发放记录。

## 游戏端与平台验证

- GY-开头的35字符专属码调用HTTPS服务，其他码沿用本地REDEEM_CODES。输入长度64。
- 支持TapTap宿主tap.request和浏览器fetch；15秒超时，失败保留输入，按钮等待时禁用，结束时不强行重开已关闭弹窗。
- `remoteRedeemOwners`新增账号字段，参与旧账号合并；游戏奖励仍保存在原账号数据和钱包流水里。换机前需要导出账号存档；导出码也包含领取资格，应妥善保存。
- 全局单次消费已实现；当前游戏经济仍为本地存档，不承诺防止修改客户端/复制已领取存档。收费运营前还需要实际TapTap真机网络验证、支付/售后流程和可靠备份。
- 手机Chrome真实HTTPS/CORS兑换、邮箱触摸领取、不同资格拒绝、原资格回执重试及重载已验证。TapTap正式宿主及国内不同网络尚未实测；若后台要求服务器域名白名单，需要登记完整HTTPS域名/端口并上传测试。

## 本地验证

```powershell
python 开发工具/兑换服务/test_server.py
node 回归测试/remote-redeem.test.js
node 回归测试/run.js
node 回归测试/run.js --browser --only=activity_order_mobile
```

真实浏览器探针需另行生成未使用测试码，CSV放入已忽略的输出目录，不能复用已被其他资格消耗的码：

```powershell
$env:GUYU_REDEEM_TEST_CODES = 'C:/绝对路径/私有测试码.csv'
node 开发工具/检查/_verify_remote_redeem.js
```

服务文件不在游戏唯一源码目录，发布包不包含数据库、私有码表或服务器配置。
