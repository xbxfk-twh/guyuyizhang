/* 鸡舍扩建专项探针：3 → 4 → 5，材料、上限、老存档兜底
   用法：node _debug_coop.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = require('../../回归测试/helpers/runtime.js').engineSource(path.join(ROOT, 'js', 'game.js'));

const PROBE = `
const G = Game;
const P = (k, v) => console.log('  ' + k + ' → ' + v);
G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null;
s.buildings.house = 3;
G.addItem('wood', 60, true); G.addItem('vine', 30, true);
G.buildFurniture('coop');
P('鸡舍建好', 'cap=' + G.liveInfo('coop').cap + ' ext=' + G.liveInfo('coop').ext + '/' + G.liveInfo('coop').extMax);
P('背包占用', G.capUsed() + '/' + s.capacity + '  ' + JSON.stringify(s.inv));
// 第一次扩建
for (const [k, v] of Object.entries(G.coopExtMats(1))) G.addItem(k, v, true);
P('补足一档材料后', JSON.stringify(G.coopExtMats(1)) + ' 背包=' + G.capUsed() + '/' + s.capacity);
P('材料齐了吗', JSON.stringify(G.coopExtMats(1)) );
P('扩建1 返回', JSON.stringify(G.buildCoopExt()));
P('扩完 cap', G.liveInfo('coop').cap);
G.addItem('chick', 4, true);
for (let i = 0; i < 4; i++) P(' 放鸡 ' + (i + 1), JSON.stringify(G.addChick()));
P('现在鸡数', G.liveInfo('coop').count + '/' + G.liveInfo('coop').cap);
// 第二次扩建
for (const [k, v] of Object.entries(G.coopExtMats(2))) { const r = G.addItem(k, v, true); P(' 补 ' + k + '×' + v, r + ' 现在有 ' + G.invCount(k)); }
P('扩建2 返回', JSON.stringify(G.buildCoopExt()));
P('扩完 cap', G.liveInfo('coop').cap);
G.addItem('chick', 1, true);
P('放第 5 只', JSON.stringify(G.addChick()));
P('再放第 6 只', JSON.stringify(G.addChick()));
P('再扩建', JSON.stringify(G.buildCoopExt()));
P('羊圈 cap', G.liveInfo('pen').cap + ' ext=' + G.liveInfo('pen').ext);
`;
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console',
  DATA + '\n' + GAME + '\n' + PROBE)(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console);
