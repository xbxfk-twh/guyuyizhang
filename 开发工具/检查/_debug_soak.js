/* 长局压力测试：模拟"玩一早上"，看存档体积 / 各字段是不是无限涨、有没有抛异常。
   用法：node _debug_soak.js [天数]
   每"天"：睡一觉 → 跑几个场景采集/钓鱼 → 打一场架 → 存档一次，记录体积与字段大小。 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');
const days = parseInt(process.argv[2] || '30', 10);

const probe = `
const days = ${days};
const S = () => Game.S();
Game.bind({ onLog: () => {}, onOverlay: (o) => { const c = o && o.choices && o.choices[0]; if (c && c.ok) { try { c.ok(); } catch (e) {} } }, onFight: () => {} });
Game.newGame('woodcutter', 'normal');
const st = S(); st.tut = null;
// 给点家底，别因为饿/渴死掉
Game.addItem('water', 200, true); Game.addItem('smokedFish', 200, true);
Game.addItem('axeSteel', 1, true); Game.addItem('pickSteel', 1, true); Game.addItem('knifeStone', 1, true); Game.addItem('rod', 1, true); Game.addItem('net', 1, true); Game.addItem('bow', 1, true); Game.addItem('arrow', 999, true);
st.toolkit = ['axeSteel', 'pickSteel', 'knifeStone'];

const errs = [];
const sizeOf = (o) => { try { return JSON.stringify(o).length; } catch (e) { return -1; } };
const fields = ['log', 'diary', 'pointUses', 'seen', 'killCount', 'foodExp', 'buildings', 'furniture', 'flags', 'craftCount', 'gatherCount'];
const rows = [];
const scenes = ['forest', 'bamboo', 'quarry', 'river', 'grassland', 'desert', 'cave', 'peak', 'sea', 'shore'];

for (let d = 1; d <= days; d++) {
  try {
    // 睡觉（8 小时）→ 白天干活
    st.stats.hp = Game.hpMax(); st.stats.hunger = 100; st.stats.thirst = 100;
    Game.sleep('normal');
    for (let k = 0; k < 6; k++) {
      const sc = scenes[(d + k) % scenes.length];
      st.scene = sc; st.zone = null;
      const pts = Game.pointsOf().slice(0, 3);
      for (const p of pts) { st.stats.stamina = Game.maxStam(); st.stats.hp = Game.hpMax(); try { Game.doPoint(p); } catch (e) { errs.push('doPoint ' + p.id + ': ' + e.message); } }
    }
    // 打一场架
    st.stats.hp = Game.hpMax();
    try { Game.startFight(ENEMIES.wolf, true); for (let i = 0; i < 6 && S().combat; i++) { st.stats.hp = Game.hpMax(); Game.fightAction('attack', 0); } } catch (e) { errs.push('fight day' + d + ': ' + e.message); }
    if (S().combat) S().combat = null;
    Game.addMin(24 * 60);          // 过一天
  } catch (e) { errs.push('day' + d + ': ' + e.message); }
  const r = Game.save();
  if (d % 5 === 0 || d === 1 || d === days) {
    const c = {};
    for (const f of fields) c[f] = st[f] === undefined ? '-' : sizeOf(st[f]);
    rows.push({ day: d, save: r && r.size, whole: sizeOf(st), log: st.log ? st.log.length : 0, diary: st.diary ? st.diary.length : 0, ...c });
  }
}
console.log('天数 | 存档字节 | 整个S | log条数 | diary条数 | ' + ['log', 'diary', 'pointUses', 'seen', 'killCount', 'foodExp', 'flags'].join(' | '));
for (const r of rows) console.log([r.day, r.save, r.whole, r.log, r.diary, r.log, r.diary, r.pointUses, r.seen, r.killCount, r.foodExp, r.flags].join(' | '));
const last = rows[rows.length - 1];
console.log('\\n最后一天存档体积: ' + last.save + ' 字节 (' + (last.save / 1024).toFixed(1) + ' KB)');
console.log('localStorage 里实际占的字节: ' + Object.keys(store).filter(k => k.startsWith('guyuyizhang')).map(k => k + '=' + store[k].length).join(' , '));
console.log('异常 ' + errs.length + ' 个' + (errs.length ? '：\\n  ' + errs.slice(0, 12).join('\\n  ') : ''));
`;
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'console', DATA + '\n' + GAME + '\n' + probe)(fakeLS, {}, {}, fs, ROOT, console);
