/* 临时探针：为什么"帐篷 1 格家具位建纺织线"偶尔会红一次？
   用法：node 开发工具\检查\_debug_loom_flake.js
   做法：反复重放 checks.js 里那一段（newGame → buildFurniture('spin') → buildFurniture('loom')），
        一旦复现就把那一次的日志整段打出来。 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const store = {};
const fakeLS = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = require('../../回归测试/helpers/runtime.js').engineSource(path.join(ROOT, 'js', 'game.js'));
const PROBE = `
let bad = 0, firstBad = null;
for (let i = 0; i < 4000; i++) {
  Game.newGame('fisher', 'normal');
  const Sx = Game.S();
  const bag0 = { cap: Game.capacity(), used: Game.capUsed(), inv: JSON.stringify(Sx.inv) };
  Game.addItem('wood', 60, true); Game.addItem('bamboo', 60, true); Game.addItem('ironpart', 60, true);
  const bag1 = { cap: Game.capacity(), used: Game.capUsed(), iron: Game.invCount('ironpart') };
  Game.buildFurniture('spin'); const a = !!Sx.furniture.spin;
  Game.buildFurniture('loom'); const b = !!Sx.furniture.loom;
  if (!(a && b && Game.furnitureUsed() === 1)) {
    bad++;
    if (!firstBad) firstBad = { i, a, b, bag0, bag1, used: Game.furnitureUsed(), wood: Game.invCount('wood'), bamboo: Game.invCount('bamboo'),
      log: Sx.log.slice(0, 24).map(l => l.text) };
  }
}
console.log('失败 ' + bad + ' / 4000');
if (firstBad) { console.log('首次复现：第 ' + firstBad.i + ' 次 纺车=' + firstBad.a + ' 织布机=' + firstBad.b + ' 家具位=' + firstBad.used);
  console.log('开局背包：' + JSON.stringify(firstBad.bag0));
  console.log('加完材料：' + JSON.stringify(firstBad.bag1));
  console.log('那段日志：'); for (const t of firstBad.log) console.log('  ' + t); }
`;
new Function('localStorage', 'window', 'document', 'console', DATA + '\n' + GAME + '\n' + PROBE)(fakeLS, {}, {}, console);
