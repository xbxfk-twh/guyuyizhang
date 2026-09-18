# 《孤屿遗章》工作目录说明

> 2026-09-13 整理；2026-09-14 发布 v1.06。根目录只留"要经常碰的东西"，工具、文档、历史都归了类。

```
孤屿遗章\
├─ 孤屿遗章-游戏 - 发布\     ← 游戏本体（改代码只改这里）
│   ├─ index.html            版本号（BUILD_VER）在这里，每次打包前改
│   ├─ js\  data.js / game.js / ui.js / audio.js
│   ├─ css\ style.css
│   └─ assets\img\
│       ├─ items\            物品图标（黑白，193 张）
│       ├─ items-accent\     物品图标（「深海琥珀」皮肤用的手绘上色版，现有 4 张）
│       └─ anim\             动作动画图（采集/建造/攻击/休息/睡觉）
├─ 回归测试\                 ← checks.js + audit.js（打包前必跑）
├─ 文档\
│   ├─ 更新公告\             各版本公告（v1.06 是最新的，已进游戏邮箱）
│   ├─ 道具与治疗一览.md      物品/效果/造价总表（自动生成）
│   ├─ 武器与敌人对照.md      各阶段武器 vs 敌人 + 回合数（自动生成）
│   ├─ 武器DPS对照.md         全武器单位时间 DPS（自动生成）
│   ├─ 商店价格表.md          所有货架价 + 浮动区间 + 影响因素（自动生成）
│   ├─ 敌人技能说明.md        每个 trait 的真实效果 + 多目标行为 + 横扫
│   └─ 稀有物品攻略.md
├─ 开发工具\
│   ├─ 打包\_pack.py         打包（版本号在文件头部 VER 改；输出到根目录）
│   ├─ 生成\                 图标/地图生成 + 数据表生成脚本
│   ├─ 检查\                 存档体检、公告自检、发版前核对
│   │   ├─ _verify_all.js     ★ 反馈问题逐项自动核对（发版前必跑）
│   │   ├─ _smoke_test.js     ★ 集成冒烟（完整流程/战斗/商店/全点位遍历）
│   │   ├─ _verify_zip.py     ★ 发布包终检（确认 zip 里是新版内容）
│   │   └─ _audit_announcement.js / _audit_sources.js
│   ├─ 预览\                 地图/雨效预览
│   ├─ 截图\_shot.js         无头浏览器截图（输出到 截图\截图输出\）
│   └─ 备份\收尾前\          上一轮大改前的 ui/game/audio/style 备份
├─ 归档\
│   ├─ 发布包\               历史 zip（v1.08 ~ v1.28）
│   └─ 素材实验\             加宽地图、图标生成的中间产物
├─ 亚克兰蒂斯-设计文档\       第二张图的设计文档
├─ 软著申请\
├─ _主开发线档案\            老线交接档案（00/01/02）
└─ 孤屿遗章_发布版_v1.06.zip 当前版本包
```

## 常用命令（在根目录执行）

```powershell
# ① 打包前必跑：全量回归（现在 500 项）
node 回归测试\audit.js

# ② ★最重要★ 场景渲染冒烟：逐个进入 13 个场景 × 22 个区域，抓任何 JS 报错
#    （专抓"变量作用域写错"这类 node --check 查不出、但会让整个界面渲染中断的错误——
#      曾经因为 rewardMissing 声明在 if 块内、块外模板里引用，导致"去哪都显示在营地"）
node 开发工具\检查\_verify_scenes.js

# ③ 发版前：把玩家反馈逐项自动核对（77 项）
node 开发工具\检查\_verify_all.js

# ④ 发版前：集成冒烟（完整流程 / 战斗 / 商店 / 全点位遍历）
node 开发工具\检查\_smoke_test.js

# ⑤ 改过地图坐标就必跑：热点标签是否互相重叠（多尺寸）
node 开发工具\检查\_check_map_labels.js
#   以及：热点是否固定在地图上、滑出画面整条隐藏
node 开发工具\检查\_verify_map.js

# 公告逐条自检（确认公告写的都真的生效了）
node 开发工具\检查\_audit_announcement.js

# 资源来源体检（找"图鉴里有、但游戏里拿不到"的死条目）
node 开发工具\检查\_audit_sources.js

# 玩家存档体检（把存档码粘贴进去，或存成 txt 用 @文件名）
node 开发工具\检查\_check_save.js "<存档码>"

# 重新生成数据表（改完 data.js 后跑）
node 开发工具\生成\_gen_itemdoc.js
node 开发工具\生成\_gen_balance.js
node 开发工具\生成\_gen_shops.js
node 开发工具\生成\_gen_dps_doc.js

# 打包（版本号要在两处同步改：index.html 的 BUILD_VER + _pack.py 头部的 VER）
# 输出 孤屿遗章_发布版_v1.06.zip 到根目录
python 开发工具\打包\_pack.py

# ⑥ 打包后：确认 zip 里装的是新版内容（27 项）
python 开发工具\检查\_verify_zip.py
```

## 血泪教训（别再踩）

| 现象 | 根因 | 该做什么 |
|---|---|---|
| **去哪都显示在营地、界面卡死不动** | `rewardMissing` 声明在 `if` 块内，块外的 `innerHTML` 模板里引用它 → `ReferenceError` → `renderHotspots` 抛异常 → 整个渲染中断 | **改完 UI 必须跑 `_verify_scenes.js`**；`node --check` 查不出作用域错误 |
| **物品图标只显示一个汉字** | 图标 png 加了但没登记进 `ui.js` 的 `SPR` 表 | 跑 `_verify_all.js`（会检查 SPR ↔ png 一一对应） |
| **热点乱飘 / 屏幕拥挤** | 曾把滚出画面的热点做成"贴边浮动标签" | 正确行为是**位置钉死在地图上、滑出画面整条隐藏**，靠拖动看；跑 `_verify_map.js` |
| **山顶祭坛拿不到遗物** | `doPoint` 在 `adventure()` 之前就打了 `pt_` 标记，`adventure()` 读到自己刚打的标记 | 一次性 adventure 点位由领奖回调 `markDone()` 打标记；跑 `_verify_all.js` |
| **改坐标后标签叠在一起** | 只挪了一个热点、没检查相邻的 | 跑 `_check_map_labels.js` |

## 注意

- **存档安全**：`_pack.py` 只打包 `孤屿遗章-游戏 - 发布\`，不会碰玩家存档；归档 zip 只是历史备份。
- **版本号必须两处一致**：`index.html` 的 `BUILD_VER` 与 `_pack.py` 的 `VER`。`index.html` 里 5 处 `?v=` 缓存参数也要跟着改，否则玩家浏览器会拿旧 js/css（回归里有断言盯着这件事）。
- **物品图标三处要对齐**：`assets/img/items/`（黑白）、`assets/img/items-accent/`（彩色）、`js/ui.js` 的 `SPR` 与 `ACCENT` 名单。`_verify_all.js` 会检查它们一一对应——**只加了图没登记 SPR，游戏里就只显示一个汉字**。
- 所有脚本里的路径都写成绝对路径或按新位置调整过，移动整个 `孤屿遗章\` 文件夹后，只有 `_pack.py` 需要改 SRC/OUT 里的盘符路径。
