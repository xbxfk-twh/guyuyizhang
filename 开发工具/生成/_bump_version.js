/* 升版本号：index.html的BUILD_VER及runtime-manifest.json中所有静态入口缓存参数同步。
   用法：node 开发工具/生成/_bump_version.js v1.13
*/
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const ver = process.argv[2];
if (!/^v\d+\.\d+[a-z]?$/.test(ver || '')) {
  console.error('请明确提供版本号，例如：node 开发工具/生成/_bump_version.js v1.09');
  process.exit(1);
}
const now = new Date();
const p2 = (n) => String(n).padStart(2, '0');
const stamp = ver + '-' + now.getFullYear() + p2(now.getMonth() + 1) + p2(now.getDate()) + '-' + p2(now.getHours()) + p2(now.getMinutes()) + p2(now.getSeconds());

const idx = path.join(ROOT, '孤屿遗章-游戏 - 发布', 'index.html');
let s = fs.readFileSync(idx, 'utf8');
const old = (s.match(/window\.BUILD_VER = '([^']+)'/) || [])[1] || '';
const oldPrefix = old.split('-')[0];
if (!oldPrefix) { console.log('没找到 BUILD_VER'); process.exit(1); }
const n = (s.match(new RegExp(old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
s = s.split(old).join(stamp);
fs.writeFileSync(idx, s);
console.log('index.html：' + old + ' → ' + stamp + '（替换 ' + n + ' 处）');

console.log('打包工具将自动读取新版本。');
