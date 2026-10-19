/* 死代码扫描：找出「导出了但没有任何界面入口」的函数
   用法：node 开发工具\检查\_dead_code.js
   判定：Game.xxx 在 ui.js 里 0 次引用 = 没有界面入口；再看测试有没有覆盖它。 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const GAME = require('../../回归测试/helpers/runtime.js').engineSource(path.join(ROOT, 'js', 'game.js'));
const UI = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
const CHECKS = fs.readFileSync(path.join(__dirname, '..', '..', '回归测试', 'checks.js'), 'utf8');
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
// 开发工具里也算"有人用"（比如 setS 是存档体检工具在用）
const TOOLS = (() => {
  const base = path.join(__dirname, '..');
  let s = '';
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p); else if (/\.(js|py)$/.test(f.name) && p !== __filename) s += fs.readFileSync(p, 'utf8');
  } };
  walk(base); return s;
})();

// 抓 return { ... } 里的导出名（最后那个大 return 块）
const tail = GAME.slice(GAME.lastIndexOf('return {'));
const names = [...tail.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*(?::|,|\n|\})/g)].map(m => m[1]);
const uniq = [...new Set(names)].filter(n => !['return', 'if', 'S', 'M'].includes(n));

const GAME_BODY = GAME.slice(0, GAME.lastIndexOf('return {'));
const count = (src, n) => (src.match(new RegExp('\\b' + n + '\\b', 'g')) || []).length;
const trulyDead = [], internalOnly = [], toolOnly = [];
for (const n of uniq) {
  const inBody = count(GAME_BODY, n);            // 定义 + 内部调用
  const inUi = count(UI, n);
  const inChecks = count(CHECKS, n);
  const inTools = count(TOOLS, n);
  if (inBody <= 1 && inUi === 0 && inChecks === 0 && inTools === 0) trulyDead.push(n);
  else if (inBody > 1 && inUi === 0 && inChecks === 0) internalOnly.push(n);
  else if (inUi === 0 && inChecks === 0) toolOnly.push(n + '（开发工具在用 ' + inTools + ' 次）');
  else if (inUi === 0) toolOnly.push(n + '（测试 ' + inChecks + ' 次）');
}
console.log('=== ① 真·死代码：游戏里没人调用、界面也没有 ===');
console.log(trulyDead.length ? trulyDead.map(n => '  · ' + n).join('\n') : '  （没有）');
console.log('\n=== ② 只在 game.js 内部用（导出是给测试/工具留的口子，不算死）===');
console.log(internalOnly.length ? internalOnly.map(n => '  · ' + n).join('\n') : '  （没有）');
console.log('\n=== ③ 界面没用、测试在用 ===');
console.log(toolOnly.length ? toolOnly.map(n => '  · ' + n).join('\n') : '  （没有）');

// 数据表里定义了却没人用的物品
const items = [...DATA.matchAll(/^\s{2}([A-Za-z_][A-Za-z0-9_]*):\s*\{/gm)].map(m => m[1]);
const unusedItems = items.filter(id => {
  const n = count(DATA, id) + count(GAME, id) + count(UI, id);
  return n <= 2;   // 定义行本身会命中 2 次（`bamboo:` 和 `id:'bamboo'`）
});
console.log('\n=== ④ 定义了但全项目没人引用的物品 id ===');
console.log(unusedItems.length ? unusedItems.map(n => '  · ' + n).join('\n') : '  （没有）');
