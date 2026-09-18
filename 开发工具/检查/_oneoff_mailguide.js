/* 一次性修复：把误插到"石板配对关"里的常用攻略代码块挪到邮箱弹窗的正确位置。
   用法：node _oneoff_mailguide.js  */
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布', 'js', 'ui.js');
const L = fs.readFileSync(p, 'utf8').split(/\r?\n/);

// ① 找到误插的块：从 "} else if (mailTab === 'guide') {" 到后面第一行恰好是 "    } else {"
const start = L.findIndex(l => l.trim() === "} else if (mailTab === 'guide') {");
if (start < 0) { console.log('没找到误插的 guide 块'); process.exit(1); }
let end = -1;
for (let i = start + 1; i < L.length; i++) { if (L[i] === '    } else {') { end = i; break; } }
if (end < 0) { console.log('没找到 guide 块后面的 } else {'); process.exit(1); }
const block = L.slice(start, end);           // 含 "} else if (mailTab === 'guide') {" 到 "} else {" 之前
console.log('误插块行数：' + block.length + '（第 ' + (start + 1) + '~' + end + ' 行），已取出');

// ② 从原处删掉（保留那一行 "    } else {"）
L.splice(start, end - start);

// ③ 插到邮箱弹窗里：找到 "} else {" 后面紧跟"核心补偿那段文案已撤下"的那处
const anchor = L.findIndex((l, i) => l === '    } else {' && L[i + 1] && L[i + 1].indexOf('核心补偿那段文案已撤下') >= 0);
if (anchor < 0) { console.log('没找到邮箱里的 event 分支'); process.exit(1); }
L.splice(anchor, 0, ...block);
console.log('已插到邮箱弹窗第 ' + (anchor + 1) + ' 行前（event 分支之前）');
fs.writeFileSync(p, L.join('\r\n'));
