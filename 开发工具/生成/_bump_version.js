/* 升版本号：改 index.html 的 BUILD_VER 与 5 个 ?v= 缓存参数，同时同步打包脚本里的 VER。
   用法：node 开发工具\生成\_bump_version.js v1.07
*/
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const ver = process.argv[2] || 'v1.07';
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

const pack = path.join(ROOT, '开发工具', '打包', '_pack.py');
let t = fs.readFileSync(pack, 'utf8');
const before = (t.match(/VER = '([^']+)'/) || [])[1];
t = t.replace(/VER = '[^']+'/, "VER = '" + ver + "'");
fs.writeFileSync(pack, t);
console.log('_pack.py：VER ' + before + ' → ' + ver);
