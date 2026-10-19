const fs = require('fs');
const ROOT = 'C:/Users/34297/Desktop/孤屿遗章/孤屿遗章-游戏 - 发布';
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const DATA = fs.readFileSync(ROOT + '/js/data.js', 'utf8');
const GAME = require('../../回归测试/helpers/runtime.js').engineSource(ROOT + '/js/game.js');
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'console',
  DATA + '\n' + GAME + `
  Game.newGame('fisher','normal');
  const c = Game.collection();
  console.log('资源：已收录', c.res, '/ 总数', c.resTotal, '（列表长度', Game.resIds().length, '）');
  console.log('怪物：已收录', c.mon, '/ 总数', c.monTotal, '（列表长度', Game.monIds().length, '，敌人表', Object.keys(ENEMIES).length, '）');
  `)(fakeLS, {}, {}, fs, ROOT, console);
