/* 探针：看看各场景当前会抽到哪些随机事件（排查"雾天漏雨"这类 cond 判定） */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');
const probe = `
function show(tag, patch) {
  Game.newGame('fisher', 'normal');
  const S = Game.S();
  Object.assign(S, patch.s || {});
  if (patch.w) S.weather = patch.w;
  if (patch.h !== undefined) S.buildings.house = patch.h;
  if (patch.z !== undefined) S.zone = patch.z;
  if (patch.day !== undefined) S.day = patch.day;
  console.log(tag, '→ 天气', S.weather, '房', S.buildings.house, '区', S.zone, ':', Game.randomEventPool(patch.scene).map(e => e.id).join(', ') || '（空）');
}
show('营地 · 雾天 · 帐篷', { scene:'camp', w:'fog', h:0 });
show('营地 · 晴天 · 帐篷', { scene:'camp', w:'clear', h:0 });
show('营地 · 雨天 · 帐篷', { scene:'camp', w:'rain', h:0 });
show('营地 · 雨天 · 草房', { scene:'camp', w:'rain', h:1 });
show('营地 · 雨天 · 木屋', { scene:'camp', w:'rain', h:2 });
show('河畔 · 雨天', { scene:'river', w:'rain' });
show('河畔 · 雾天', { scene:'river', w:'fog' });
show('海域 · 近海', { scene:'sea', z:'sea' });
`;
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console',
  DATA + '\n' + GAME + '\n' + probe)(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console);
