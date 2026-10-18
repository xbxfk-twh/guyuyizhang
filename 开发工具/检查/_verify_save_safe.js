/* 存档安全专项核对（交付前必跑）：老档能不能读、进度会不会丢、坏了救不救得回来。
   用法：node 开发工具\检查\_verify_save_safe.js        只读游戏代码，不碰真存档 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');

const store = {};
const jar = {};   // 极简 cookie 罐：够 ckSet/ckGet 用
const fakeLS = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};
const fakeDoc = {
  get cookie() { return Object.keys(jar).map(k => k + '=' + jar[k]).join('; '); },
  set cookie(v) { const kv = String(v).split(';')[0]; const i = kv.indexOf('='); if (i > 0) jar[kv.slice(0, i)] = kv.slice(i + 1); },
};

const box = {};
new Function('localStorage', 'window', 'document', 'console', 'box',
  DATA + '\n' + GAME + '\nbox.Game = Game; box.ITEMS = ITEMS; box.SKILL_TRUNK_COST = SKILL_TRUNK_COST;\n'
)(fakeLS, {}, fakeDoc, console, box);
const { Game, ITEMS, SKILL_TRUNK_COST } = box;
Game.bind({ onLog: () => {}, onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: () => {} });

let ok = 0; const bad = [];
const ck = (label, cond, extra) => { if (cond) { ok++; console.log('  OK   ' + label + (extra ? '  —— ' + extra : '')); } else { bad.push(label); console.log('  FAIL ' + label + (extra ? '  —— ' + extra : '')); } };
const sec = t => console.log('\n===== ' + t + ' =====');

// ---- 造一份"v1.06 时代的老档"：没有 tree / skillPicks / livestock / traps / settings / coopExt … ----
const OLD_SAVE = {
  v: 1, identity: 'woodcutter', difficulty: 'easy', day: 64, minute: 568, tick: 90808,
  weather: 'fog', weatherRolled: true,
  stats: { hp: 111, stamina: 150, hunger: 58.6, thirst: 39.6, spirit: 100 },
  statuses: { bleed: 0, poison: 0, cold: false, fear: 0 },
  inv: { branch: 121, wood: 190, jerky: 10, coin: 133, herb: 5, slate: 3, relic: 1, dragonbone: 1 },
  capacity: 20, foodExp: {}, relics: ['bloodvest'], relicSlots: 1, relicEquip: ['bloodvest', null, null],
  dur: {}, toolDurs: {}, equipIdx: { weapon: 0, weapon2: 0, armor: 0, cloth: 0, accessory: 0 }, weaponNames: {},
  equipment: { weapon: 'steelSword', weapon2: 'steelShield', armor: 'ironArmor', cloth: 'diveSuit', accessory: 'beastFang' },
  buildings: { house: 3, fire: 1, storage: 2, wall: 2, watch: 3, dock: 5, farm: 0 },
  furniture: { wb2: true, sm2: true, bed3: true, rack: true }, crops: [],
  scene: 'camp', zone: null, weatherWarned: 'cloud',
  skill: { craft: 5, gather: 5, combat: 4 },      // 旧版：数字等级（新版要折算成经验）
  toolkit: ['axeSteel', null, null],
  flags: { ended_C: 1, xiaoman: 1 }, diary: [], log: [], seen: { wood: 1, stone: 1 }, killCount: { boar: 3 },
};
const oldRaw = JSON.stringify(OLD_SAVE);
// ⚠️ cookie 也要一起清：save() 每次都会把存档镜像进 cookie（saveAt 是"刚刚"），
//    如果只清 localStorage，load() 会判定"cookie 更新"而走 cookie 兜底 —— 那样测的就不是本节要测的东西了。
const reset = () => {
  for (const k of Object.keys(store)) delete store[k];
  for (const k of Object.keys(jar)) delete jar[k];
};

// ---------------------------------------------------------------- 1. 老档能读、进度不丢
sec('1. 老存档读得进来，进度一个都不少');
reset();
store['guyuyizhang_save'] = oldRaw;
store['guyuyizhang_rev'] = '7';
const loaded = Game.load();
const S1 = Game.S();
ck('老档读档成功', loaded === true);
ck('天数 / 时间 / 天气没变', S1.day === 64 && S1.minute === 568 && S1.tick === 90808 && S1.weather === 'fog',
   `第${S1.day}天 ${S1.minute}分 ${S1.weather}`);
ck('属性 / 背包 / 装备没变',
   S1.stats.hp === 111 && S1.stats.stamina === 150 && S1.inv.wood === 190 && S1.inv.slate === 3 &&
   S1.equipment.weapon === 'steelSword' && S1.equipment.accessory === 'beastFang',
   `hp=${S1.stats.hp} 木=${S1.inv.wood} 主手=${S1.equipment.weapon}`);
ck('建筑等级 / 神物 / 图鉴 / 击杀记录没变',
   S1.buildings.dock === 5 && S1.buildings.watch === 3 && S1.relics.includes('bloodvest') &&
   S1.flags.ended_C === 1 && S1.seen.wood === 1 && S1.killCount.boar === 3);
ck('关键道具（通关要用的石板/遗物/龙骨）还在', S1.inv.slate === 3 && S1.inv.relic === 1 && S1.inv.dragonbone === 1);
ck('新字段补齐了（缺了会在运行期崩）',
   S1.tree && S1.skillPicks && S1.livestock && S1.traps && S1.settings && S1.pointUses &&
   S1.coopExt === 0 && S1.storeExt === 0 && S1.gatherCount === 0 && S1.craftCount === 0,
   `coopExt=${S1.coopExt} settings=${JSON.stringify(S1.settings)}`);

// ---------------------------------------------------------------- 2. 旧技能等级折算
sec('2. 旧版技能等级折算成经验（不白升）');
let want = 0;
// 升级消耗倍率（采集 ×2、制造 ×3、战斗 ×1）：从 game.js 里读，别写死
const _mMul = GAME.match(/const SKILL_COST_MUL = \{ gather: (\d+), craft: (\d+), combat: (\d+) \};/);
const COST_MUL = _mMul ? { gather: +_mMul[1], craft: +_mMul[2], combat: +_mMul[3] } : { gather:1, craft:1, combat:1 };
for (const k of ['gather', 'craft', 'combat']) {
  const lv = OLD_SAVE.skill[k];
  let sum = 0;
  for (let i = 0; i < Math.min(lv, SKILL_TRUNK_COST.length); i++) sum += SKILL_TRUNK_COST[i];
  want += Math.round(sum * (COST_MUL[k] || 1) * 2);
}
const gotExp = Math.round((S1.exp.gather + S1.exp.craft + S1.exp.combat) * 10) / 10;
ck('三级旧等级都折成了经验（2 倍主干成本 × 各树的消耗倍率）', gotExp === want, `${gotExp} / 期望 ${want}`);
ck('旧等级字段清零、技能树建好', S1.skill.gather === 0 && S1.skill.craft === 0 && S1.skill.combat === 0 && !!S1.tree.gather);

// ---------------------------------------------------------------- 3. 读档后能正常保存（版本号守卫不能误伤）
sec('3. 读档之后照样存得进去（"另一个标签页"守卫不能误伤自己）');
const rs1 = Game.save();
ck('save() 正常返回成功', rs1 && rs1.ok === true, JSON.stringify(rs1));
const back = JSON.parse(store['guyuyizhang_save']);
ck('写回去的主档还是第 64 天、东西没少', back.day === 64 && back.inv.wood === 190 && back.equipment.weapon === 'steelSword');
ck('滚动备份留下了"写入前那份"（出事了能退一步）', !!store['guyuyizhang_save_bak']);

// ---------------------------------------------------------------- 4. 老档里的结算标记 → 补成定局
sec('4. 老档已经结算过结局 → 补记成定局（不能借读档绕开"一局一个结局"）');
reset();
const old2 = JSON.parse(JSON.stringify(OLD_SAVE));
old2.flags = { settled_A: 1, ended_A: 1, ended_C: 1 };
store['guyuyizhang_save'] = JSON.stringify(old2);
ck('老档读档成功', Game.load() === true);
ck('自动补上 settledEnding = A', Game.S().flags.settledEnding === 'A', 'settledEnding=' + Game.S().flags.settledEnding);
ck('这一局已经不能再结算秘辛', Game.settleEnding('endC').ok === false);

// ---------------------------------------------------------------- 5. 主档损坏 → 从备份救回（且能继续存）
sec('5. 主档损坏 → 从滚动备份救回，并且还能继续保存');
reset();
const good = JSON.parse(JSON.stringify(OLD_SAVE));
good.day = 70;
store['guyuyizhang_save_bak'] = JSON.stringify(good);
store['guyuyizhang_save'] = '{"v":1,"day":64,"inv":{';   // 模拟写一半被打断
store['guyuyizhang_rev'] = '12';
store['guyuyizhang_savedAt'] = String(Date.now() - 90000);
const rl = Game.load();
ck('损坏的主档没有把玩家挡在门外', rl === true && Game.S().day === 70, 'load=' + rl + ' day=' + (Game.S() && Game.S().day));
ck('损坏的原始串留底了（不丢证据）', !!store['guyuyizhang_save_corrupt']);
ck('救回来后版本号对齐了（不然之后每次保存都会被拒）', Game.S()._rev === 12, '_rev=' + Game.S()._rev);
const rs2 = Game.save();
ck('★ 救回来之后还能正常保存', rs2 && rs2.ok === true, JSON.stringify(rs2));
ck('★ 保存后主档还是第 70 天（没有回退）', JSON.parse(store['guyuyizhang_save']).day === 70);

// 对照实验：证明上面那条修复不是多余的 —— 老写法（直接塞 S、不对齐 _rev）会被守卫拒掉
{
  reset();
  const g2 = JSON.parse(JSON.stringify(OLD_SAVE)); g2.day = 70;
  store['guyuyizhang_save'] = JSON.stringify(g2);
  store['guyuyizhang_rev'] = '12';
  const mimic = JSON.parse(store['guyuyizhang_save']);
  mimic._rev = 0;                       // ← 老写法就是这样：S._rev 是空的
  Game.setS(mimic);
  const oldWay = Game.save();
  ck('对照：不对齐版本号时 save() 确实会被"另一个标签页"守卫拒掉（这就是玩家反馈的"存不上/覆盖不了"）',
     oldWay && oldWay.ok === false && oldWay.reason === 'other-tab', JSON.stringify(oldWay));
}

// ---------------------------------------------------------------- 6. localStorage 被清 → cookie 兜底
sec('6. 平台清了 localStorage → cookie 镜像能救回来');
reset();
const ckSave = JSON.parse(JSON.stringify(OLD_SAVE)); ckSave.day = 88;
jar['guyu_save'] = encodeURIComponent(JSON.stringify(ckSave));
jar['guyu_saveAt'] = String(Date.now());
store['guyuyizhang_savedAt'] = String(Date.now() - 600000);
const rc = Game.load();
ck('只剩 cookie 也能读档', rc === true && Game.S().day === 88, 'load=' + rc + ' day=' + (Game.S() && Game.S().day));
ck('cookie 那份顺手写回了 localStorage', !!store['guyuyizhang_save']);

// ---------------------------------------------------------------- 7. 存档码导出 / 导入
sec('7. 存档码（魂点 / 历代遗章 / 备份槽）导得出去、导得回来');
reset();
Game.newGame('fisher', 'normal');
Game.metaState().soul = 321;
Game.save();
const code = Game.exportCode();
ck('能导出存档码', typeof code === 'string' && code.length > 50, '长度 ' + (code || '').length);
const soulBefore = Game.metaState().soul;
reset(); Game.metaState(); // 清空重来（模拟换设备）
const ri = Game.importCode(code);
ck('★ 导入后魂点一模一样', ri.ok === true && Game.metaState().soul === soulBefore, JSON.stringify(ri));
ck('存档码里不含当前局（导出的是账号数据，不会把别人的局覆盖掉）', !/steelSword/.test(code));

// ---------------------------------------------------------------- 8. 开新档不丢旧档（救援档）
sec('8. 误开新档 → 救援档能把上一局找回来');
reset();
const keep = JSON.parse(JSON.stringify(OLD_SAVE)); keep.day = 77;
store['guyuyizhang_save'] = JSON.stringify(keep);
store['guyuyizhang_rev'] = '3';
Game.load();
Game.newGame('fisher', 'normal');                 // ← 玩家手滑开新档
const list = Game.scanLocalSaves();
ck('扫描本机痕迹时能看到"开新游戏前的上一局"', list.some(x => x.src === 'rescue' && x.day === 77),
   list.map(x => x.src + ':' + x.day).join(' '));
const rr = Game.restoreLocalSave('rescue');
ck('★ 一键把第 77 天那局恢复成当前局', rr.ok === true && Game.S().day === 77, JSON.stringify(rr) + ' day=' + (Game.S() && Game.S().day));
ck('恢复后立刻写进主档（标题页「继续上次游戏」也对得上）', JSON.parse(store['guyuyizhang_save']).day === 77);

// ---------------------------------------------------------------- 9. 老字段一个都没被改写
sec('9. 读档 + 存回去，老字段逐项一致（只增不改）');
reset();
store['guyuyizhang_save'] = oldRaw;
Game.load();
Game.save();
const after = JSON.parse(store['guyuyizhang_save']);
const keepKeys = ['identity','difficulty','day','minute','tick','weather','stats','inv','capacity','relics',
                  'relicEquip','equipment','buildings','furniture','scene','flags','seen','killCount','slot','savedAt'];
const comparable = JSON.parse(JSON.stringify(after)); delete comparable.stats.health;
ck('旧终级仓库迁移到新终级且只迁移一次',after.buildings.storage===3 && after.storageChainVersion===2);
comparable.buildings.storage=OLD_SAVE.buildings.storage;
ck('旧档未建地窖新增建筑等级，不改变原建筑',after.buildings.cellar===-1);
delete comparable.buildings.cellar;
ck('旧档健康值补为100', after.stats.health === 100);
const diff = keepKeys.filter(k => JSON.stringify(comparable[k]) !== JSON.stringify(OLD_SAVE[k]));
ck('进度相关字段逐项一致', diff.length === 0, diff.length ? '被改动：' + diff.join(',') : keepKeys.length + ' 项全部一致');
ck('新增字段只在需要时补，不动老数据', after.settledEnding === undefined || after.settledEnding === null,
   'settledEnding=' + after.settledEnding);

console.log('\n================ 汇总 ================');
console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
if (bad.length) { console.log('失败项：'); bad.forEach(b => console.log(' - ' + b)); }
console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
process.exitCode = bad.length ? 1 : 0;

process.exitCode = bad.length ? 1 : 0;
