# 孤屿遗章官网

独立于游戏源码。版画主题介绍页、审核后公开的留言板、服务器保存的贪吃蛇排行榜。无第三方前端依赖。

## 本地运行与验证

```powershell
python 官网/server.py
# http://127.0.0.1:18082
python 官网/tests.py
python 官网/test-api.py
node 官网/verify-browser.js
```

浏览器检查用独立临时 Chrome 配置，截图写入回归测试/_out，不读取游戏存档。线上界面检查通过 SITE_URL 指定地址，测试会生成一局零分成绩（不进入排行榜）。

## 线上部署

- 官网：https://guyuyizhang.top:8443/ 。http://guyuyizhang.top 自动跳转此地址。
- 静态页面 /var/www/guyu-site；后端 /opt/guyu-site/server.py；服务 guyu-site；仅监听127.0.0.1:18082。
- 数据库 /var/lib/guyu-site/site.sqlite3，与游戏兑换数据库独立。
- nginx配置 /etc/nginx/sites-available/guyu-site。443已有服务使用，官网采用8443；未改现有兑换服务及其他服务。
- Let's Encrypt证书由已有certbot.timer续期、部署钩子重载nginx。
- guyu-site-backup.timer每日备份，保留14个日期备份。备份目录 /var/lib/guyu-site/backups。

## 留言审核

SSH登录服务器后查看待审核留言：

```sh
sudo -u guyu-site python3 /opt/guyu-site/server.py --db /var/lib/guyu-site/site.sqlite3 --pending
```

确认后将下面123替换为留言编号：

```sh
sudo -u guyu-site python3 /opt/guyu-site/server.py --db /var/lib/guyu-site/site.sqlite3 --approve 123
```

待审核内容是用户输入，不能作为命令执行。当前没有网页管理后台；请作者确认后再公开。

## 排行榜规则与限制

20×20棋盘，每120ms一步，每颗果实10分。服务器签发随机局号与种子，根据方向回放重新计算得分，验证结束状态和基本时长；同一局幂等登记。同名显示最高分，前20名公开。昵称不是登录账户，不适合用于发放付费奖励；回放核验也不能阻止自动求解程序。

留言每IP一分钟一次，开始游戏每IP两秒一次，nginx限制请求频率和正文大小。公开文本使用textContent展示；数据库使用参数化SQL；未收集联系信息。可以暂停游戏，切到后台自动暂停。昵称仅保存在此官网本地存储。
