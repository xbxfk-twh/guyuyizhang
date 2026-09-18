# git 代理开关（Windows / Clash Verge 默认端口 7897）
#
# 背景：git 默认【不读】Windows 的系统代理设置，所以 Clash 开着也可能出现
#       "Failed to connect to github.com port 443" —— 得单独告诉 git 走代理。
#
# 用法（在项目根目录）：
#   powershell -ExecutionPolicy Bypass -File 开发工具\上传\_git_proxy.ps1 on     # 让 git 走 Clash
#   powershell -ExecutionPolicy Bypass -File 开发工具\上传\_git_proxy.ps1 off    # 还原成直连
#   powershell -ExecutionPolicy Bypass -File 开发工具\上传\_git_proxy.ps1 test   # 测一下通不通
param([string]$cmd = 'test', [string]$port = '7897')

$proxy = "http://127.0.0.1:$port"

switch ($cmd.ToLower()) {
  'on' {
    git config --global http.proxy $proxy
    git config --global https.proxy $proxy
    Write-Host "已让 git 走代理 $proxy"
    Write-Host "（如果哪天 Clash 关了、git 报连接被拒绝，就跑一次 ... off）"
  }
  'off' {
    git config --global --unset http.proxy 2>$null
    git config --global --unset https.proxy 2>$null
    Write-Host "已还原：git 直连（国内访问 GitHub 可能失败，属于正常）"
  }
  default {
    $h = git config --global --get http.proxy
    Write-Host ("当前 git 代理：" + $(if ($h) { $h } else { "（没设，直连）" }))
    $ok = $false
    try { $t = Test-NetConnection -ComputerName 127.0.0.1 -Port $port -WarningAction SilentlyContinue; $ok = $t.TcpTestSucceeded } catch {}
    if (-not $ok) { try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1', [int]$port); $ok = $c.Connected; $c.Close() } catch { $ok = $false } }
    Write-Host ("本地代理端口 $port：" + $(if ($ok) { "在监听 ✓" } else { "没在监听 ✗（Clash Verge 没开？）" }))
    if ($ok) {
      Write-Host "测一下 GitHub："
      git -c http.proxy=$proxy ls-remote https://github.com/xbxfk-twh/guyuyizhang.git 2>&1 | Select-Object -First 2
    }
  }
}
