// Read-only analysis. All saves stay in memory, never in player storage.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const source = require('../../回归测试/helpers/runtime.js').logicFiles.map(name => fs.readFileSync(path.join(root, '孤屿遗章-游戏 - 发布/js', name), 'utf8')).join('\n');
const store = {};
const math = Object.create(Math);
let random = 0.5;
math.random = () => random;
const { G, ITEMS, DURA, RECIPES, ENEMIES } = new Function('localStorage', 'window', 'document', 'console', 'Math', 'setTimeout', 'clearTimeout', source + '\nreturn {G:Game,ITEMS,DURA,RECIPES,ENEMIES};')({
  getItem: key => store[key] ?? null,
  setItem: (key, value) => { store[key] = String(value); },
  removeItem: key => { delete store[key]; }
}, {}, { cookie: '' }, { log() {}, warn() {} }, math, () => 1, () => {});
G.bind({ onChange() {}, onLog() {}, onFight() {}, onOverlay() {}, onEnding() {} });
function setup(main, off, eagle = false) {
  G.newGame('fisher', 'normal');
  const s = G.S();
  s.stats.hp = 100000;
  s.inv[main] = 2;
  if (off) s.inv[off] = 2;
  s.inv.arrow = 500;
  s.inv.bullet = 500;
  if (eagle) s.inv.eagleArrow = 500;
  s.equipment = { weapon: main, weapon2: off || null, armor: null, cloth: null, accessory: null };
  s.equipIdx = { weapon: 0, weapon2: off === main ? 1 : 0, armor: 0, cloth: 0, accessory: 0 };
  s.toolDurs = {};
  s.toolMaxDurs = {};
  for (const id of [main, off].filter(Boolean)) {
    s.toolDurs[id] = [DURA[id], DURA[id]];
    s.toolMaxDurs[id] = [DURA[id], DURA[id]];
    s.dur[id] = DURA[id];
  }
  return s;
}
function effectiveAccuracy(p) {
  let survival = 1, attempts = 1;
  for (let n = 0; n < 50; n++) {
    survival *= (1 - p) * Math.pow(0.7, n);
    attempts += survival;
  }
  return 1 / attempts;
}
function output(attack, speed, p, def) {
  const hit = Math.max(1, attack - def);
  // Base 10% crit; round each critical strike exactly as the engine does.
  return +(speed * effectiveAccuracy(p) * (hit * 0.9 + Math.round(hit * 1.5) * 0.1)).toFixed(1);
}
const rows = Object.entries(ITEMS).filter(([, it]) => it.cat === 'weapon' && !it.ammo).map(([id, it]) => {
  setup(id);
  const attack = it.ranged ? G.rangedAtk() : G.playerAtk();
  const speed = G.combatSpeed(!!it.ranged);
  const p = G.combatAccuracy(it.ranged ? 'ranged' : 'attack', { traits: [] });
  return { id, name: it.name, atk: it.atk, attack, speed, durability: DURA[id], accuracy: p,
    output: [0, 5, 10].map(def => output(attack, speed, p, def)),
    recipes: RECIPES.filter(r => r.out?.[id]).map(r => ({ id: r.id, materials: r.in, time: r.time, station: r.station, blueprint: r.needBp || null })),
    repair: G.repairMatOf(id) };
});
const combos = [['ironSword', 'ironSword'], ['blackSword', 'blackSword'], ['steelDagger', 'steelDagger'], ['blackDagger', 'blackDagger'], ['blackSword', 'blackDagger'], ['sourceSpear', 'sourceSpear'], ['coralBlade', 'sourceSpear'], ['bow', 'bow'], ['pistol', 'pistol'], ['pistol', 'bow'], ['blackSword', 'pistol']].map(([main, off]) => {
  setup(main, off);
  const ranged = ITEMS[main].ranged && ITEMS[off].ranged;
  const p = G.combatAccuracy(ranged ? 'ranged' : 'attack', { traits: [] });
  const speed = G.combatSpeed(!!ranged);
  const attacks = ranged ? [G.rangedAtk()] : [main, off].filter(id => !ITEMS[id].ranged).map(id => 5 + ITEMS[id].atk);
  return { main, off, meleeAttack: G.playerAtkAvg(), rangedAttack: G.rangedAtk(), meleeSpeed: G.combatSpeed(false), rangedSpeed: G.combatSpeed(true), accuracy: p,
    output: [0, 5, 10].map(def => +(attacks.reduce((sum, atk) => sum + output(atk, speed, p, def), 0) / attacks.length).toFixed(1)) };
});
const findings = [];
function verify(name, predicate) {
  if (!predicate) throw Error(name);
  findings.push(name);
}
function enemy() { return { ...ENEMIES.boar, id: 'analysisDummy', hp: 100000, atk: 0, def: 0, spd: 1, traits: [] }; }
setup('coralBlade', 'sourceSpear');
verify('珊瑚刺刃主手给予100%命中', G.combatAccuracy('attack', { traits: [] }) === 1);
setup('sourceSpear', 'coralBlade');
verify('珊瑚刺刃副手不给命中加成', G.combatAccuracy('attack', { traits: [] }) === 0.9);
setup('bow');
G.S().statuses.fear = true;
verify('远程忽略恐惧及敌人闪避特性', G.combatAccuracy('ranged', { traits: ['evade'] }) === 0.9);
setup('ironDagger', 'ironSword');
G.startFight(enemy());
random = 0.999;
const beforeMiss = G.playerAtk();
G.fightAction('attack', 0);
verify('近战落空不扣耐久且不换手', G.durOf('ironDagger', 0) === DURA.ironDagger && G.playerAtk() === beforeMiss);
setup('spear');
G.startFight(enemy());
random = 0.5;
G.fightAction('throw', 0);
verify('投矛不消耗武器及耐久且仍可普通攻击', G.S().equipment.weapon === 'spear' && G.durOf('spear', 0) === DURA.spear && G.playerAtk() === 11);
setup('pistol');
G.startFight(enemy());
random = 0.999;
G.fightAction('ranged', 0);
verify('远程落空仍扣一份弹药和一点耐久', G.invCount('bullet') === 499 && G.durOf('pistol', 0) === DURA.pistol - 1);
setup('pistol', 'bow');
verify('双远程组合会加速主手开火', G.combatSpeed(true) === 8.3 && G.rangedAtk() === 55);
G.startFight(enemy());
random = 0.5;
G.fightAction('ranged', 0);
verify('双远程只消耗主手武器耐久与主手弹药', G.durOf('bow', 0) === DURA.bow && G.invCount('arrow') === 500 && G.invCount('bullet') === 499);
const out = { date: '2026-10-12', assumptions: 'normal/fisher/no meta/no skills/no buffs; expected damage per 100 combat time, stationary miss pity; divine first crit excluded', rows, combos, findings };
fs.writeFileSync(path.join(root, '回归测试/_out/weapon-comparison.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
