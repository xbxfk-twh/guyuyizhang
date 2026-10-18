const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const source = ['data.js', 'game.js']
  .map((file) =>
    fs.readFileSync(
      path.join(__dirname, '../孤屿遗章-游戏 - 发布/js', file),
      'utf8'
    )
  )
  .join('\n');
function fresh() {
  const store = {},
    math = Object.create(Math);
  let rolls = [];
  math.random = () => (rolls.length ? rolls.shift() : 0.9);
  const e = new Function(
    'localStorage',
    'window',
    'document',
    'console',
    'Math',
    'setTimeout',
    'clearTimeout',
    source + '\nreturn {G:Game,ITEMS,SKILL_TREES};'
  )(
    {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => (store[k] = String(v)),
      removeItem: (k) => delete store[k]
    },
    {},
    { cookie: '' },
    { log() {}, warn() {} },
    math,
    () => 1,
    () => {}
  );
  e.G.bind({ onChange() {}, onLog() {}, onFight() {}, onOverlay() {} });
  return {
    ...e,
    roll: (r) => {
      rolls = r.slice();
    }
  };
}
let passed = 0,
  failed = 0;
function check(name, f) {
  try {
    f();
    passed++;
    console.log('OK ' + name);
  } catch (e) {
    failed++;
    console.error('FAIL ' + name + '\n' + e.stack);
  }
}
function fight(main = 'ironSword', off = 'steelSword', rank = 1) {
  const e = fresh(),
    g = e.G;
  g.newGame('fisher', 'normal');
  const s = g.S();
  s.tree.combat.f_swift = rank;
  s.skill.combat = 3;
  // Controlled RNG proves base crit and independent Unity rolls without attack bonuses.
  s.skillPicks.combat = ['def', 'def', 'def'];
  g.addItem(main, 2, true);
  if (off) g.addItem(off, 2, true);
  s.equipment.weapon = main;
  s.equipment.weapon2 = off;
  s.equipIdx.weapon = 0;
  s.equipIdx.weapon2 = main === off ? 1 : 0;
  g.startFight({
    id: 'dummy',
    name: '试验靶',
    hp: 9999,
    atk: 0,
    def: 5,
    spd: 1,
    traits: [],
    drops: [],
    desc: ''
  });
  const target = s.combat.enemies[0],
    hp = target.ehp;
  return { ...e, g, s, target, hp };
}
check('作者指定的全部武器数值', () => {
  const { ITEMS: i } = fresh();
  for (const [id, atk, spd] of [
    ['blackGreatSword', 40, 5],
    ['ironGreatSword', 25, 6],
    ['ironDagger', 7, 13],
    ['steelDagger', 9, 13],
    ['blackDagger', 11, 13],
    ['steelSword', 15, 10],
    ['blackSword', 18, 10]
  ]) {
    assert.equal(i[id].atk, atk);
    assert.equal(i[id].spd, spd);
  }
});
check('盾墙刀刀暴击到3级，复仇处决到4级，前置和互斥不变', () => {
  const ns = fresh().SKILL_TREES.combat.nodes;
  for (const id of ['f_shield', 'f_swift'])
    assert.equal(ns.find((n) => n.id === id).need, 3);
  for (const id of ['f_revenge', 'f_exec'])
    assert.equal(ns.find((n) => n.id === id).need, 4);
  assert.equal(ns.find((n) => n.id === 'f_exec').needNode, 'f_sweep');
  assert.equal(ns.find((n) => n.id === 'f_swift').mutex, 'f_shield');
});
check('未学习/一级/二级会心率为10%/30%/40%，不把两级累加', () => {
  for (const [rank, rate] of [
    [0, 0.1],
    [1, 0.3],
    [2, 0.4]
  ]) {
    const e = fight('ironSword', null, rank);
    assert.ok(Math.abs(e.g.skillCritRate() - rate) < 1e-9);
    assert.equal(e.g.swiftBonus(), 0);
  }
});
check('普通会心取整，不残留双剑翻倍，耐久只扣一次', () => {
  const e = fight();
  const dur = e.g.durOf('ironSword', 0);
  e.roll([0.5, 0.29]);
  e.g.fightAction('attack', 0);
  assert.equal(e.hp - e.target.ehp, 17);
  assert.equal(e.g.durOf('ironSword', 0), dur - 1);
  assert.doesNotMatch(e.s.combat.log.join(' '), /双剑合璧/);
  assert.match(e.s.combat.log.join(' '), /会心一击/);
});
check('两级最终会心率边界分别按30%/40%判断', () => {
  for (const [rank, roll, damage] of [
    [1, 0.2999, 17],
    [1, 0.3001, 11],
    [2, 0.3999, 17],
    [2, 0.4001, 11]
  ]) {
    const e = fight('ironSword', null, rank);
    e.roll([0.5, roll]);
    e.g.fightAction('attack', 0);
    assert.equal(e.hp - e.target.ehp, damage);
  }
});
check('匕首、单剑、大剑及剑匕混装均享受加成', () => {
  for (const [main, off] of [
    ['ironDagger', null],
    ['ironSword', null],
    ['ironGreatSword', null],
    ['ironSword', 'ironDagger']
  ]) {
    const e = fight(main, off);
    assert.ok(Math.abs(e.g.skillCritRate() - 0.3) < 1e-9);
    e.roll([0.5, 0.29]);
    e.g.fightAction('attack', 0);
    assert.match(e.s.combat.log.join(' '), /会心一击/);
  }
});
check('手枪和弓同样提高会心率，弓术暴击倍率保持有效', () => {
  for (const main of ['bow', 'pistol']) {
    const e = fight(main, null);
    e.s.inv.arrow = 10;
    e.s.inv.bullet = 10;
    e.s.combat.dist = 0;
    if (main === 'bow') e.s.tree.combat.f_bow = 2;
    e.roll([0.1, 0.29]);
    e.g.fightAction('ranged', 0);
    assert.equal(e.hp - e.target.ehp, main === 'bow' ? 21 : 75);
  }
});
check('与猎人、护符、主干会心叠加并封顶100%', () => {
  const e = fight('ironSword', null, 2);
  e.s.identity = 'hunter';
  e.s.equipment.accessory = 'hornAmulet';
  e.s.skillPicks.combat = ['crit', 'crit', 'crit'];
  assert.ok(Math.abs(e.g.skillCritRate() - 0.7) < 1e-9);
  e.s.skillPicks.combat = Array(20).fill('crit');
  e.s.skill.combat = 20;
  assert.equal(e.g.skillCritRate(), 1);
});
check('落空不判会心也不造成伤害', () => {
  const e = fight();
  e.roll([0.99, 0.01]);
  e.g.fightAction('attack', 0);
  assert.equal(e.hp, e.target.ehp);
  assert.doesNotMatch(e.s.combat.log.join(' '), /会心一击/);
});
check('老档已学二级旧技能和3级复仇保留，不清掉经验或装备', () => {
  const e = fight('ironSword', 'steelSword', 2);
  e.s.combat = null;
  e.s.tree.combat.f_revenge = 1;
  e.s.exp.combat = 123;
  assert.equal(e.g.save().ok, true);
  assert.equal(e.g.load(), true);
  assert.equal(e.g.S().tree.combat.f_swift, 2);
  assert.equal(e.g.S().tree.combat.f_revenge, 1);
  assert.equal(e.g.S().exp.combat, 123);
  assert.equal(e.g.S().equipment.weapon, 'ironSword');
  assert.equal(e.g.combatSpeed(), 15);
});
console.log(
  `通过 ${passed} 项，失败 ${failed} 项\nRESULT:${failed ? 'FAIL' : 'PASS'}`
);
process.exitCode = failed ? 1 : 0;
