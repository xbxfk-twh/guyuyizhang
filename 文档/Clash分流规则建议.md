# Clash 分流规则建议（给开发工作用）

> 目的：**只让"必须翻墙的那几个域名"走代理**，其余全部直连。
> 好处：机场节点波动/晚高峰只影响这几个站点，国内网站和 TapTap 后台照常快；
> 也降低"所有流量都过第三方服务器"的隐私面。

## 一、你现在的状态（2026-09-18 体检）

- Clash Verge + verge-mihomo 正常，系统代理 `127.0.0.1:7897` 已开
- `mode: rule`（已经是规则模式 ✓）、`allow-lan: false`（局域网别人用不了 ✓）
- 订阅：一元机场，21 个节点，100GB/月，已用 5.88GB，到期 2027-07-06
- **唯一的坑**：git 默认不读系统代理 → 已用 `开发工具\上传\_git_proxy.ps1 on` 修好

## 二、要保证走代理的域名（贴到规则最上面）

Clash Verge → 「订阅」页 → 右键你的订阅 → **编辑规则 / 规则（Rules）**，
或者用「配置 → 全局扩展脚本」；把下面这段放到 `rules:` 的**最前面**（顺序很重要，先匹配先生效）。

⚠️ 把 `🚀 节点选择` 换成你订阅里**实际存在的代理组名**（你当前订阅里有「自动选择」这类组，
打开 Clash Verge 的「代理」页能看到真实组名；不确定就用「自动选择」）。

```yaml
rules:
  # —— 开发/工作刚需：走代理 ——
  - DOMAIN-SUFFIX,github.com,🚀 节点选择
  - DOMAIN-SUFFIX,githubusercontent.com,🚀 节点选择
  - DOMAIN-SUFFIX,github.io,🚀 节点选择
  - DOMAIN-SUFFIX,ghcr.io,🚀 节点选择
  - DOMAIN-SUFFIX,npmjs.org,🚀 节点选择
  - DOMAIN-SUFFIX,nodejs.org,🚀 节点选择
  - DOMAIN-SUFFIX,vercel.app,🚀 节点选择
  # —— 出图接口（DashScope / 百炼）：国内直连其实也能用，卡的时候再走代理 ——
  # - DOMAIN-SUFFIX,dashscope.aliyuncs.com,🚀 节点选择

  # 后面保留你订阅自带的规则（GEOIP,CN,DIRECT 之类），不要删
```

## 三、顺手把 git 也接上（已做过，记下来免得忘）

```powershell
& "开发工具\上传\_git_proxy.ps1" on     # git 走 Clash
& "开发工具\上传\_git_proxy.ps1 off"    # Clash 关了的时候还原成直连
& "开发工具\上传\_git_proxy.ps1 test"   # 看端口在不在、GitHub 通不通
```

## 四、判断"机场是不是不行了"的三步（别急着换机场）

1. 在 Clash Verge 里点**更新订阅**（节点被墙是常态，更新一次往往就好）
2. 「代理」页看延迟测试：整组超时 = 机场问题；只有几个节点超时 = 换节点就行
3. 还不行就**换一个节点/换一个协议**（Trojan / Hysteria2 通常比 VMess 抗封锁）

## 五、如果真要换机场，只看三条

1. **按月或按量付费** —— 年付跑路是这类服务最常见的坑，"充一年送一年"一律别碰
2. 有**香港 / 日本 / 新加坡**低延迟节点（GitHub、TapTap 后台、百炼都吃得开）
3. 订阅链接是 **HTTPS**，并且提供 **Clash / Mihomo 格式**

试新机场时只用**月付**，跑一周，专门测这四个：GitHub 网页、`git push`、
TapTap 开发者后台、百炼出图接口。四个都稳再考虑长期。
