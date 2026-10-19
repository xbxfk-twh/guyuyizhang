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
  S.day = 30; S.buildings.house = 3; S.stats.hunger = 100; S.stats.thirst = 100;
  Game.addItem('wood', 60, true); Game.addItem('vine', 30, true);
  Game.buildFurniture('coop'); Game.buildFurniture('pen');
  Game.addSheep(); Game.addSheep();
  Game.addItem('hay', 10, true);
  console.log('起始 羊=', Game.liveInfo('pen').count, ' 干草=', Game.invCount('hay'));
  Game.addMin(24*60);
  console.log('第1天 羊毛=', Game.invCount('wool'), ' 干草=', Game.invCount('hay'));
  const logs = []; Game.bind({ onLog: (t, c) => logs.push(t) });
  Game.addMin(24*60);
  console.log('第2天 羊毛=', Game.invCount('wool'), ' 干草=', Game.invCount('hay'));
  console.log('捕获到的日志:', JSON.stringify(logs));
  `)(fakeLS, {}, {}, fs, ROOT, console);
