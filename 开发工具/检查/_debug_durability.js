/* 探针：战斗里双持武器到底扣不扣耐久？
   玩家反馈"石矛主手、石匕副手，只有石匕掉耐久"。用法：node _debug_durability.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = require('../../回归测试/helpers/runtime.js').engineSource(path.join(ROOT, 'js', 'game.js'));

new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'console',
  DATA + '\n' + GAME + `
  const S = () => Game.S();
  Game.newGame('fisher', 'normal');
  const st = S();
  st.tut = null;
  Game.addItem('spear', 1, true);         // 石矛（主手）
  Game.addItem('knifeStone', 1, true);    // 石匕（副手要是武器才吃战斗耐久）
  st.equipment.weapon = 'spear'; st.equipment.weapon2 = 'knifeStone';
  console.log('开打前：石矛', Game.durOf('spear'), '/', 12, '  石匕', Game.durOf('knifeStone'), '/', 18);

  // 找一只血厚的敌人，别两下打死
  const tanky = { name:'训练木桩', id:'dummy', hp:9999, atk:1, def:0, spd:1, traits:[], drops:[], desc:'木桩' };
  Game.startFight(tanky, true);
  const hits = [];
  for (let i = 0; i < 8; i++) {
    st.stats.hp = Game.hpMax();                       // 别死
    Game.fightAction('attack', 0);
    hits.push('第' + (i+1) + '击 矛=' + Game.durOf('spear') + ' 匕=' + Game.durOf('knifeStone'));
  }
  console.log('战斗中每击后的耐久：');
  console.log('  ' + hits.join('\\n  '));

  // 副手换成盾（只有一把近战武器）时也要扣
  Game.S().combat = null;
  st.equipment.weapon2 = null;
  Game.addItem('spear', 1, true);
  st.dur.spear = 12;
  console.log('\\n单持石矛再打 3 下：');
  Game.startFight(tanky, true);
  for (let i = 0; i < 3; i++) { st.stats.hp = Game.hpMax(); Game.fightAction('attack', 0); }
  console.log('  石矛耐久 = ' + Game.durOf('spear'));

  // ---- 蛛巢（cave_queen）：点进去弹出讨伐确认、玩家取消，体力/当日次数该不该扣？----
  Game.S().combat = null;
  Game.newGame('fisher', 'normal');
  const s2 = S();
  s2.tut = null; s2.day = 5; s2.scene = 'cave'; s2.inv.torch = 3; s2.stats.stamina = 100;
  const cave = Game.sceneOf('cave');
  const queen = cave.points.find(p => p.id === 'cave_queen');
  const before = { sta: s2.stats.stamina, uses: s2.pointUses.cave_queen || 0, hunger: s2.stats.hunger };
  let overlay = null;
  Game.bind({ onOverlay: (o) => { overlay = o; } });
  Game.doPoint(queen);
  const after = { sta: s2.stats.stamina, uses: s2.pointUses.cave_queen || 0, hunger: s2.stats.hunger };
  console.log('\\n蛛巢：点了但只弹出讨伐确认（不真打）');
  console.log('  体力 ' + before.sta + ' → ' + after.sta + '   当日次数 ' + before.uses + ' → ' + after.uses +
              '   弹窗=' + (overlay ? overlay.title : '无'));
  console.log('  → ' + (after.sta === before.sta && after.uses === before.uses ? '没有白扣 ✓' : '白扣了体力/次数 ✗'));
  `)(fakeLS, {}, {}, fs, ROOT, console);
