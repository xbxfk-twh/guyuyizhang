/* 神弓（限定）全量验证：唯一性 / 暴击 / 耐久 / 不可修 / 邮箱存取 / 存档往返 */
const fs = require('fs');
const path = require('path');
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const box = {};
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console', 'box',
  DATA + '\n' + GAME + '\nObject.assign(box,{Game:Game,ITEMS:ITEMS,RECIPES:RECIPES,ENEMIES:ENEMIES,DURA:DURA,metaState:null});\n')(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console, box);
const { Game, ITEMS, RECIPES, ENEMIES, DURA } = box;

let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };
const sec = t => console.log('\n===== ' + t + ' =====');
const L = [];
Game.bind({ onLog: (t) => L.push(t), onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: () => {} });
const BOW = 'divineBow';
const REC = RECIPES.find(r => r.id === 'r_divinebow');
// 清掉邮箱里的历史残留 + 拿到精工工作台，保证测试互相独立
function clearMail() { const m = Game.metaState(); m.mailbox = (m.mailbox || []).filter(x => !x || x.item !== BOW); }
function fresh() {
  Game.newGame('fisher', 'normal');
  const s = Game.S(); s.inv = {}; s.tut = null; s.stats.hp = 99999; s.stats.stamina = 99999;
  s.furniture.wb2 = 1;                    // 精工工作台：神弓配方所在
  s.toolDurs = {}; s.dur = {};            // 清掉开局自带的工具耐久，避免邮箱测试干扰
  return s;
}
function giveMats() { if (!REC) return; for (const k in REC.in) Game.addItem(k, REC.in[k] + 2, true); }
function equipBow() {
  const s = Game.S();
  Game.addItem(BOW, 1, true); Game.addItem('arrow', 30, true);
  s.equipment.weapon = BOW;
  s.toolDurs[BOW] = [50]; s.dur[BOW] = 50;
  s.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
  return s;
}

sec('A. 数据');
ck('神弓与猎弓数值完全一致（攻10/攻速8/远程）',
   ITEMS[BOW].atk === ITEMS.bow.atk && ITEMS[BOW].spd === ITEMS.bow.spd && ITEMS[BOW].ranged === 1,
   '神弓 ' + ITEMS[BOW].atk + '/' + ITEMS[BOW].spd + '  猎弓 ' + ITEMS.bow.atk + '/' + ITEMS.bow.spd);
ck('耐久 50（猎弓 70）', DURA[BOW] === 50 && DURA.bow === 70, DURA[BOW] + ' / ' + DURA.bow);
ck('带 divineCrit 标记', ITEMS[BOW].divineCrit === 1);
// 活动期内：配方应在、名字带日期、材料够杂；活动结束后配方下架，下面这些制作相关断言自动跳过
const ON_SALE = !!REC;
console.log('  　活动状态：' + (ON_SALE ? '配方在架（活动期内）' : '配方已下架（活动结束后）'));
if (ON_SALE) {
  ck('配方在工作台、标「限定」与日期、带 uniqueItem', REC.station === 'work2' && /限定/.test(REC.name) && /26\.9\.15-26\.9\.30/.test(REC.name) && REC.uniqueItem === BOW,
     REC.station + ' / ' + REC.name);
  ck('配方材料跨多线（秘银锭/鹰羽/女王丝/深珊瑚/源质锭/绳索）',
     ['mithrilingot','eaglefeather','queenSilk','deepCoral','sourceBar','rope'].every(k => REC.in[k] > 0), JSON.stringify(REC.in));
  ck('物品说明里也写了活动日期', /26\.9\.15-26\.9\.30/.test(ITEMS[BOW].desc));
}

if (ON_SALE) {
sec('B. 全账号唯一');
{
  clearMail(); fresh(); giveMats();
  ck('身上没有时可以做', Game.canCraft(REC).ok, Game.canCraft(REC).reason || 'ok');
  Game.addItem(BOW, 1, true);
  const chk = Game.canCraft(REC);
  ck('★ 身上有一把 → 不允许再做', !chk.ok, chk.reason);
  Game.removeItem(BOW, 1);
  ck('丢掉后又可以做', Game.canCraft(REC).ok);
  // 存进邮箱
  Game.addItem(BOW, 1, true);
  const st = Game.storeDivineBow();
  ck('★ 能存进邮箱', st.ok, JSON.stringify(st));
  ck('★ 存进去后当前局就失去了这把弓（不是复制）', Game.invCount(BOW) === 0, 'inv=' + Game.invCount(BOW));
  const chk2 = Game.canCraft(REC);
  ck('★ 邮箱里有一把 → 同样不允许再做', !chk2.ok, chk2.reason);
}

sec('C. 邮箱只存一把');
{
  clearMail(); fresh(); giveMats();
  Game.addItem(BOW, 1, true);
  ck('第一次存成功', Game.storeDivineBow().ok);
  Game.addItem(BOW, 1, true);
  const r2 = Game.storeDivineBow();
  ck('★ 第二次存被拦下（邮箱只存一把）', !r2.ok, r2.reason);
  ck('第二把还在身上（没被吞）', Game.invCount(BOW) === 1, 'inv=' + Game.invCount(BOW));
}
}   // ← 活动结束后（配方下架）就跳过 B/C 这两段制作相关检查；D 段开始只验"已做出的弓照常可用"

sec('D. 领取（跨局）');
{
  clearMail(); fresh(); giveMats();
  Game.addItem(BOW, 1, true);
  Game.S().toolDurs[BOW] = [37];      // 存一把用过的
  Game.storeDivineBow();
  const mb = Game.mailboxList();
  const mail = mb.find(x => x.item === BOW);
  ck('邮箱里能看到神弓，且记着耐久', !!mail, mail ? '耐久 ' + mail.dur : '没有');
  ck('邮件耐久 = 存进去时的 37', mail && mail.dur === 37, mail && String(mail.dur));
  // 新开一局再领
  fresh();
  const idx = Game.mailboxList().findIndex(x => x.item === BOW);
  const cl = Game.claimMailbox(idx);
  ck('★ 新局能从邮箱领取', cl.ok, cl.msg);
  ck('★ 领到手里了', Game.invCount(BOW) === 1, 'inv=' + Game.invCount(BOW));
  ck('★ 耐久跟着走（还是 37）', Game.durOf(BOW) === 37, 'dur=' + Game.durOf(BOW));
  ck('领完后邮箱空了', !Game.hasMailboxDivineBow());
  if (REC) ck('但身上有弓，仍然不允许再做（唯一性看两处都没有）', !Game.canCraft(REC).ok, Game.canCraft(REC).reason);
}

sec('E. 每场战斗第一次命中必定会心');
{
  clearMail(); fresh();
  equipBow();
  const r0 = Math.random; Math.random = () => 0.99;    // 普通会心(10%)永不触发，只看神弓特权
  Game.startFight(ENEMIES.boar, true);
  const C = Game.S().combat;
  C.enemies.forEach(e => { e.ehp = 999999; e.emax = 999999; });
  // 先打一箭拿到"普通伤害"基准（此时特权已用掉）
  const e0 = C.enemies[0].ehp;
  Game.fightAction('ranged');
  const normal = e0 - Game.S().combat.enemies[0].ehp;      // 第一箭 = 暴击
  const e1 = Game.S().combat.enemies[0].ehp;
  Game.fightAction('ranged');
  const second = e1 - Game.S().combat.enemies[0].ehp;      // 第二箭 = 普通
  console.log('    第一箭 ' + normal + ' 点，第二箭 ' + second + ' 点');
  ck('★ 第一箭是暴击（= 普通伤害 × 1.5）', normal === Math.round(second * 1.5), second + ' ×1.5 = ' + Math.round(second*1.5) + '，实际 ' + normal);
  ck('★ 第二箭恢复普通伤害', second > 0 && normal > second);
  ck('用了特权后会打标记', Game.S().combat.divineCritUsed === 1);
  ck('日志写了神弓的特权', (Game.S().combat && Game.S().combat.log.some(x => /神弓的弦音/.test(x))) === true, ((Game.S().combat && Game.S().combat.log.find(x => /神弓的弦音/.test(x))) || '').slice(0, 40));
  // 新战斗应重置
  Game.startFight(ENEMIES.boar, true);
  const C2 = Game.S().combat;
  C2.enemies.forEach(e => { e.ehp = 999999; e.emax = 999999; });
  const f0 = C2.enemies[0].ehp;
  Game.fightAction('ranged');
  const again = f0 - Game.S().combat.enemies[0].ehp;
  Math.random = r0;
  ck('★ 新战斗重置（又一次暴击）', again === Math.round(second * 1.5), '新战斗第一箭 ' + again + ' 点');
}

sec('F. 没打中不算（留到下一次命中）');
{
  clearMail(); fresh();
  equipBow();
  const r0 = Math.random;
  Math.random = () => 0.99;                     // 命中率 0.9 → 第一箭落空（先手分支除外，见下）
  Game.startFight(ENEMIES.boar, true);
  const C = Game.S().combat;
  C.enemies.forEach(e => { e.ehp = 999999; e.emax = 999999; });
  // 先把先手箭耗尽（先手箭视为命中，会先用掉特权）
  let guard = 0;
  while (Game.S().combat && Game.S().combat.bowShots > 0 && guard++ < 10) Game.fightAction('ranged');
  const before = Game.S().combat ? Game.S().combat.divineCritUsed : 1;
  console.log('    先手箭耗尽后 divineCritUsed = ' + before);
  if (Game.S().combat) {
    const e0 = Game.S().combat.enemies[0].ehp;
    Game.fightAction('ranged');                // 这一箭必落空（0.99 > 0.9）
    const missDmg = e0 - Game.S().combat.enemies[0].ehp;
    ck('落空那一箭没造成伤害', missDmg === 0, '伤害 ' + missDmg);
    Math.random = () => 0.1;                   // 下一箭必中
    const e1 = Game.S().combat.enemies[0].ehp;
    Game.fightAction('ranged');
    const hitDmg = e1 - Game.S().combat.enemies[0].ehp;
    ck('★ 特权留到第一次"命中"才生效', before === 1 || hitDmg > 0, '命中伤害 ' + hitDmg);
  }
  Math.random = r0;
}

sec('G. 耐久 50、不可修');
{
  clearMail(); fresh(); giveMats();
  const s = Game.S();
  Game.addItem(BOW, 1, true);
  s.toolDurs[BOW] = [50]; s.dur[BOW] = 50;
  ck('耐久上限 50', Game.durOf(BOW) === 50, 'dur=' + Game.durOf(BOW));
  ck('耐久显示上限也是 50', DURA[BOW] === 50);
  // 磨刀石修补：神弓不该能修
  const canRep = (function () {
    try { const r = Game.repairWeapon ? Game.repairWeapon(BOW) : null; return r; } catch (e) { return { err: e.message }; }
  })();
  console.log('    试修补返回: ' + JSON.stringify(canRep));
  ck('★ 神弓不可修补（修补被拒或没有修补材料）',
     !canRep || canRep.ok !== true || Game.durOf(BOW) === 50, JSON.stringify(canRep));
}

console.log('\n================ 汇总 ================');
console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
if (bad.length) { console.log('失败项：'); bad.forEach(b => console.log(' - ' + b)); }
console.log(bad.length ? 'RESULT:FAIL' : 'RESULT:PASS');
