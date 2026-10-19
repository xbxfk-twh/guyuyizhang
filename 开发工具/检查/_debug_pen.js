const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/34297/Desktop/孤屿遗章/孤屿遗章-游戏 - 发布';
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = require('../../回归测试/helpers/runtime.js').engineSource(path.join(ROOT, 'js', 'game.js'));
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'console',
  DATA + '\n' + GAME + `
  Game.newGame('fisher','normal');
  const S = Game.S();
  S.day = 30; S.stats.hunger = 100; S.stats.thirst = 100;
  S.buildings.house = 3;                 // 砖瓦房：7 个家具位，够建鸡舍+羊圈
  Game.addItem('wood', 50, true); Game.addItem('vine', 20, true);
  console.log('建鸡舍:', JSON.stringify(Game.buildFurniture('coop')));
  console.log('建羊圈:', JSON.stringify(Game.buildFurniture('pen')));
  console.log('furniture =', JSON.stringify(S.furniture));
  const logs = []; Game.bind({ onLog: t => logs.push(t) });
  Game.addMin(24 * 60);      // 跨天 → newDay
  console.log('正常一天后 meat/wool =', Game.invCount('meat'), Game.invCount('wool'));
  console.log('相关日志 =', logs.filter(l => /鸡舍|羊圈/.test(l)));
  // 模拟背包塞满
  S.inv = {}; for (let i = 0; i < 40; i++) S.inv['junk' + i] = 1;
  Game.addMin(24 * 60);
  console.log('满包跨天后 meat/wool =', Game.invCount('meat'), Game.invCount('wool'), ' 待收 =', JSON.stringify(S.furnPending));
  S.inv = {};
  Game.addMin(24 * 60);
  console.log('清包再跨天 meat/wool =', Game.invCount('meat'), Game.invCount('wool'), ' 待收 =', JSON.stringify(S.furnPending));
  `)(fakeLS, {}, {}, fs, ROOT, console);
