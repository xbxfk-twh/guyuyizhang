/* 孤屿遗章 · 回归测试
   用法：node audit.js
   作用：在 Node 里加载真实的 data.js + game.js（用假的 localStorage/DOM），
        跑一遍 checks.js 里的断言，输出 PASS/FAIL。不修改游戏文件。 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '孤屿遗章-游戏 - 发布');
const store = {};
const fakeLS = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = require('./helpers/runtime.js').engineSource(path.join(ROOT, 'js', 'game.js'));
const CHECKS = fs.readFileSync(path.join(__dirname, 'checks.js'), 'utf8');
try {
  const failures = new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console',
    DATA + '\n' + GAME + '\n' + CHECKS + '\nreturn FAIL;')(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console);
  if (failures) process.exitCode = 1;
} catch (e) {
  console.log('\n!! 运行异常: ' + e.message);
  console.log((e.stack || '').split('\n').slice(0, 6).join('\n'));
  console.log('RESULT:CRASH');
  process.exitCode = 1;
}
