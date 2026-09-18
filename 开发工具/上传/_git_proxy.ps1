# git proxy switch for Windows / Clash Verge (default mixed port 7897).
#
# Why: git does NOT read the Windows system proxy. So even with Clash Verge running,
#      `git push` can fail with "Failed to connect to github.com port 443".
#      This script tells git to use the local proxy (or to go direct again).
#
# Usage (from the project root):
#   powershell -ExecutionPolicy Bypass -File 开发工具\上传\_git_proxy.ps1 on
#   powershell -ExecutionPolicy Bypass -File 开发工具\上传\_git_proxy.ps1 off
#   powershell -ExecutionPolicy Bypass -File 开发工具\上传\_git_proxy.ps1 test
#
# NOTE: keep every string in this file ASCII-only. PowerShell 5.1 reads .ps1 as ANSI
#       unless it has a UTF-8 BOM, and non-ASCII literals then break the parser.
param([string]$cmd = 'test', [string]$port = '7897')

$proxy = "http://127.0.0.1:$port"

switch ($cmd.ToLower()) {
  'on' {
    git config --global http.proxy $proxy
    git config --global https.proxy $proxy
    Write-Host "git now uses proxy $proxy"
    Write-Host "If Clash is off later and git says 'connection refused', run this script with 'off'."
  }
  'off' {
    git config --global --unset http.proxy 2>$null
    git config --global --unset https.proxy 2>$null
    Write-Host "git restored to direct connection (github.com may be unreachable without a proxy)."
  }
  default {
    $h = git config --global --get http.proxy
    if ($h) { Write-Host "current git proxy: $h" } else { Write-Host "current git proxy: (none, direct)" }
    $ok = $false
    try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1', [int]$port); $ok = $c.Connected; $c.Close() } catch { $ok = $false }
    if ($ok) { Write-Host "local proxy port $port : listening OK" } else { Write-Host "local proxy port $port : NOT listening (is Clash Verge running?)" }
    if ($ok) {
      Write-Host "GitHub reachability test:"
      git -c http.proxy=$proxy ls-remote https://github.com/xbxfk-twh/guyuyizhang.git 2>&1 | Select-Object -First 2
    }
  }
}
