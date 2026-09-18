/* 用 GitHub 的 Git Data API 把本地提交推上去 —— 给"github.com:443 连不上"的网络用。

   背景（2026-09-18 实测）：
     · github.com:443        → 超时（被墙，git push 直接失败）
     · api.github.com:443    → 通
     · ssh.github.com:443    → 通（但要先配 SSH key）
   所以直连 push 不通时，就走这个脚本：它把每个文件当 blob 传上去，再拼成 tree/commit/ref，
   效果和 git push 一样（提交信息、分支都一致）。

   用法：
     $env:GH_TOKEN = 'github_pat_...'      # 或从 GCM 取（见文档里的命令），别写进文件
     node 开发工具\上传\_push_via_api.js
   可选：
     $env:GH_BRANCH='main'  $env:GH_MSG='提交说明'  $env:GH_REPO='owner/repo'
*/
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TOKEN = process.env.GH_TOKEN || '';
const REPO = process.env.GH_REPO || 'xbxfk-twh/guyuyizhang';
const BRANCH = process.env.GH_BRANCH || 'main';
const MSG = process.env.GH_MSG || '孤屿遗章：通过 API 推送（github.com 直连不通时的备选路径）';
const API = 'https://api.github.com';
const ROOT = path.join(__dirname, '..', '..');
const CONC = 4;                       // 并发上传几个 blob（别太高，免得被限流）

if (!TOKEN) { console.log("没有 GH_TOKEN。先取 token：$env:GH_TOKEN = (\"protocol=https`nhost=github.com`n`n\" | git credential fill | Select-String 'password=') 那一行去掉前缀"); process.exit(1); }

const H = { Authorization: 'Bearer ' + TOKEN, 'User-Agent': 'guyuyizhang-uploader', Accept: 'application/vnd.github+json' };

async function api(url, method, body, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(API + url, { method, headers: Object.assign({}, H, { 'Content-Type': 'application/json' }), body: body ? JSON.stringify(body) : undefined });
      const t = await r.text();
      if (r.status === 403 || r.status === 429) { await new Promise(z => setTimeout(z, 3000 * i)); continue; }   // 限流：等会儿再试
      if (!r.ok) throw new Error(method + ' ' + url + ' → HTTP ' + r.status + ' ' + t.slice(0, 200));
      return t ? JSON.parse(t) : {};
    } catch (e) { if (i === tries) throw e; await new Promise(z => setTimeout(z, 1200 * i)); }
  }
}

async function main() {
  // 1) 用 git 列出"该进仓库的文件"（尊重 .gitignore 和已跟踪状态），再读内容
  // ⚠️ 必须用 -z（NUL 分隔）：默认输出会给含空格/中文的文件名加引号并转义，解析出来就打不开文件
  const list = execSync('git ls-files -z', { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString().split('\0').filter(Boolean);
  console.log('要上传 ' + list.length + ' 个文件 → ' + REPO + '@' + BRANCH);

  // 2) 先看看远端是不是已经有这个分支（有就在它之上提交，没有就从零开始）
  let parent = null;
  try { const ref = await api('/repos/' + REPO + '/git/ref/heads/' + BRANCH, 'GET'); parent = ref.object.sha; console.log('远端已有分支，父提交 ' + parent.slice(0, 8)); }
  catch (e) {
    // ⚠️ 空仓库不能直接建 blob（会 409 Git Repository is empty）：
    //    先用 Contents API 丢一个占位文件把仓库"点着"，再照常上传。
    console.log('远端还没有 ' + BRANCH + ' 分支 → 先建一个初始提交把空仓库点着');
    await api('/repos/' + REPO + '/contents/.gitkeep', 'PUT', { message: 'init', content: Buffer.from('').toString('base64') });
    const ref2 = await api('/repos/' + REPO + '/git/ref/heads/' + BRANCH, 'GET');
    parent = ref2.object.sha;
    console.log('初始提交 ' + parent.slice(0, 8));
  }

  // 3) 逐个传 blob（带进度）
  const entries = [];
  let done = 0, idx = 0;
  async function worker() {
    while (idx < list.length) {
      const rel = list[idx++];
      const buf = fs.readFileSync(path.join(ROOT, rel));
      const blob = await api('/repos/' + REPO + '/git/blobs', 'POST', { content: buf.toString('base64'), encoding: 'base64' });
      entries.push({ path: rel.split(path.sep).join('/'), mode: '100644', type: 'blob', sha: blob.sha });
      done++;
      if (done % 25 === 0 || done === list.length) console.log('  上传 ' + done + '/' + list.length);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));

  // 4) tree → commit → 更新分支
  const tree = await api('/repos/' + REPO + '/git/trees', 'POST', { tree: entries });
  const commit = await api('/repos/' + REPO + '/git/commits', 'POST', { message: MSG, tree: tree.sha, parents: parent ? [parent] : [] });
  if (parent) await api('/repos/' + REPO + '/git/refs/heads/' + BRANCH, 'PATCH', { sha: commit.sha, force: false });
  else await api('/repos/' + REPO + '/git/refs', 'POST', { ref: 'refs/heads/' + BRANCH, sha: commit.sha });

  console.log('✓ 上传完成：' + commit.sha.slice(0, 8) + '（' + entries.length + ' 个文件）');
  console.log('  仓库：https://github.com/' + REPO);
}
main().catch(e => { console.log('✗ 失败：' + e.message); process.exit(1); });
