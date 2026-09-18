/* 探针：数一数不同攻速对同一个敌人，几轮里各能打几下（含倍数连攻 + 攻速差蓄力） */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');
const probe = `
// 用一个"血厚、0 攻、0 防"的木桩，数玩家打出的伤害次数
function trial(weapon, enemySpd, rounds) {
  Game.newGame('fisher', 'normal');
  const S = Game.S();
  if (weapon) { Game.addItem(weapon, 2, true); S.equipment.weapon = weapon; }
  const myAtk = Game.playerAtk(), mySpd = Game.combatSpeed();
  S.combat = {
    enemy: { name:'木桩', traits: [], spd: enemySpd },
    ehp: 999999, atk: 0, def: 0, spd: enemySpd,
    enemies: [{ name:'木桩', id:'dummy', ehp: 999999, emax: 999999, atk: 0, def: 0, spd: enemySpd, traits: [], isBoss: 0 }],
    round: 1, defending: false, usedItems: 0, summonTick: 0, log: [], ranged: null,
    spdBank: 0, spdP: mySpd, spdE: enemySpd,   // 这两项必须给：蓄力系统靠它们（startFight 里会设）
  };
  const R0 = Math.random; Math.random = () => 0.5;      // 必中、不会心、无随机
  const hp0 = S.combat.enemies[0].ehp;
  const per = [], foe = [], order = [];
  S.stats.hp = 99999;
  for (let r = 0; r < rounds; r++) {
    const b = S.combat.enemies[0].ehp;
    const h = S.stats.hp;
    const logLen = (S.combat.log || []).length;
    Game.fightAction('attack');
    per.push(Math.round((b - S.combat.enemies[0].ehp) / Math.max(1, myAtk)));
    foe.push(h - S.stats.hp);   // 木桩攻击 0 → 每挨一下掉 1 点，正好当计数
    const line = (S.combat.log || [])[S.combat.log.length - 1] || '';
    order.push(line.replace(/木桩的攻击造成 1 点伤害。/g, 'E').replace(/你攻击木桩，造成 \d+ 点伤害。/g, 'P').replace(/\s+/g, ' ').trim().slice(0, 40));
  }
  Math.random = R0;
  return { weapon: weapon || '(空手)', mySpd, myAtk, per, foe, order, total: Math.round((hp0 - S.combat.enemies[0].ehp) / Math.max(1, myAtk)) };
}
const ROUNDS = 4;
console.log('敌人速度 6（遗迹守卫），打 ' + ROUNDS + ' 轮：');
for (const w of ['club', 'ironGreatSword', 'steelSword', 'ironSword', 'knifeStone', 'spear']) {
  const t = trial(w, 6, ROUNDS);
  console.log('  攻速 ' + String(t.mySpd).padStart(2) + ' (' + w + ')  每轮我打 ' + JSON.stringify(t.per) + ' ｜ 敌人打我 ' + JSON.stringify(t.foe) + '  → ' + ROUNDS + ' 轮我共 ' + t.total + ' 下');
}
console.log('\\n反过来：攻速 6 的铁大剑打速度 18 的雪豹（敌人会不会连攻我）：');
const slow = trial('ironGreatSword', 18, 4);
console.log('  我攻速 ' + slow.mySpd + '，每轮我打 ' + JSON.stringify(slow.per) + ' ｜ 雪豹打我 ' + JSON.stringify(slow.foe));
console.log('\\n你给的例子：我攻速 6、敌人攻速 7 →');
console.log('  这是临时用速度 6 的武器打速度 7 的木桩（验证出手次序）');
const ex = trial('ironGreatSword', 7, 8);
console.log('  每轮我打 ' + JSON.stringify(ex.per) + ' ｜ 敌人打我 ' + JSON.stringify(ex.foe));
ex.order.forEach((o, i) => console.log('   第' + (i + 1) + '轮：' + o));
`;
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console',
  DATA + '\n' + GAME + '\n' + probe)(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console);
