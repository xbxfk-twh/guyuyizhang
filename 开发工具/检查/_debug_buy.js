const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/34297/Desktop/孤屿遗章/孤屿遗章-游戏 - 发布';
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'console',
  DATA + '\n' + GAME + `
  Game.newGame('fisher','normal');
  const S = Game.S();
  S.day = 40; S.fame = 3;
  console.log('开局背包:', JSON.stringify(S.inv));
  const entry = LAOCHAO.sell.find(e => e.id === 'wood');
  const unit = Game.priceOf(entry.base, false, 'wood');
  console.log('木材单价 =', unit, '基础价 =', entry.base);
  Game.addItem('beibi', unit * 12, true);
  console.log('给 12 份的钱后 beibi =', Game.invCount('beibi'));
  const mx = Math.max(1, Math.min(99, Math.floor(Game.invCount('beibi') / Math.max(1, unit))));
  console.log('界面算出的 mx =', mx);
  Game.buyFromMerchant('wood', mx, LAOCHAO.sell, false);
  console.log('买完 木材 =', Game.invCount('wood'), ' beibi =', Game.invCount('beibi'));
  `)(fakeLS, {}, {}, fs, ROOT, console);
