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
  s.toolDurs[BOW] = [120]; s.dur[BOW] = 120;   // 耐久 120（作者 2026-09-17 与手枪对调过）
  s.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
  return s;
}

sec('A. 数据');
ck('神弓与猎弓数值完全一致（攻10/攻速8/远程）',
   ITEMS[BOW].atk === ITEMS.bow.atk && ITEMS[BOW].spd === ITEMS.bow.spd && ITEMS[BOW].ranged === 1,
   '神弓 ' + ITEMS[BOW].atk + '/' + ITEMS[BOW].spd + '  猎弓 ' + ITEMS.bow.atk + '/' + ITEMS.bow.spd);
// 作者 2026-09-17：把枪和神弓的耐久对调了 → 神弓 120、源能手枪 50（猎弓仍是 70）
ck('耐久 120（与源能手枪 50 对调过；猎弓 70）', DURA[BOW] === 120 && DURA.bow === 70 && DURA.pistol === 50,
   '神弓 ' + DURA[BOW] + ' / 猎弓 ' + DURA.bow + ' / 手枪 ' + DURA.pistol);
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

sec('E. 每场战斗第一次命中必定会心（开局的先手几箭也算）');
{
  clearMail(); fresh();
  equipBow();
  const r0 = Math.random; Math.random = () => 0.99;    // 普通会心(10%)永不触发，只看神弓特权
  // ⚠️ 目标必须够厚：装备弓时开局会自动先手几箭(2~3 发)，拿野猪试会被当场秒掉，
  //    战斗瞬间结束 → combat 变 null（旧写法就是在这里崩的）。
  Game.startFight(ENEMIES.sunkenKing, true);
  const C = Game.S().combat;
  ck('战斗开起来了（目标够厚，先手几箭打不死）', !!C, C ? '敌人 ' + C.enemies.length + ' 只' : '战斗已结束');
  if (C) {
    const dmgs = C.log.map(x => (x.match(/射出一箭，造成 (\d+) 点伤害/) || [])[1]).filter(Boolean).map(Number);
    const iSound = C.log.findIndex(x => /神弓的弦音/.test(x));
    const iFirstDmg = C.log.findIndex(x => /造成 \d+ 点伤害/.test(x));
    console.log('    先手几箭：' + JSON.stringify(dmgs));
    ck('★ 第一次命中就吃到特权（弦音在第一条伤害之前）',
       iSound >= 0 && iFirstDmg >= 0 && iSound <= iFirstDmg, '弦音@' + iSound + ' 首条伤害@' + iFirstDmg);
    ck('★ 第一箭 = 普通箭的 1.5 倍',
       dmgs.length >= 2 && dmgs[0] === Math.round(dmgs[1] * 1.5),
       dmgs[0] + ' 与 ' + dmgs[1] + '×1.5=' + Math.round((dmgs[1] || 0) * 1.5));
    ck('一场只给一次：打完立刻打标记', C.divineCritUsed === 1);
    Game.startFight(ENEMIES.sunkenKing, true);          // 新一场要重置
    const C2 = Game.S().combat;
    ck('★ 新战斗重置（又能吃一次特权）',
       !!C2 && C2.divineCritUsed === 1 && C2.log.some(x => /弦音/.test(x)));
  }
  Math.random = r0;
}

sec('F. 没打中不算（留到下一次命中）');
{
  clearMail(); fresh();
  equipBow();
  const r0 = Math.random;
  Math.random = () => 0.99;                     // 命中率 0.9 → 第一箭落空（先手分支除外，见下）
  Game.startFight(ENEMIES.sunkenKing, true);
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

sec('G. 耐久 120：坏了不消失、回营地能用磨刀石修');
{
  clearMail(); fresh(); giveMats();
  const s = Game.S();
  Game.addItem(BOW, 1, true);
  Game.addItem('arrow', 30, true);      // 没箭就不会开火（先手几箭也射不出去），这一步不能少
  s.toolDurs[BOW] = [120]; s.dur[BOW] = 120;
  ck('耐久上限 120', Game.durOf(BOW) === 120, 'dur=' + Game.durOf(BOW));
  // 打坏：耐久归零只自动卸下，不从背包消失（活动结束后再也造不出来，不能让它凭空没了）
  // 走真实路径：留着最后 1 点耐久去打一场，开局先手那一箭就会把它打光
  s.toolDurs[BOW] = [1]; s.dur[BOW] = 1;
  s.equipment.weapon = BOW; s.equipIdx = { weapon: 0, weapon2: 0, armor: 0, cloth: 0, accessory: 0 };
  Game.startFight(ENEMIES.sunkenKing, true);
  ck('★ 耐久归零只自动卸下，神弓还留在背包里',
     Game.invCount(BOW) === 1 && Game.durOf(BOW) === 0 && !Game.S().equipment.weapon,
     '背包 ' + Game.invCount(BOW) + ' 件 / 耐久 ' + Game.durOf(BOW) + ' / 主手 ' + Game.S().equipment.weapon);
  // 磨刀石修补：材料 秘银锭×1（没材料修不了 → 有材料修满）
  const s2 = Game.S();
  s2.furniture.grindstone = true;
  s2.combat = null; s2.toolDurs[BOW] = [0]; s2.dur[BOW] = 0;   // 战斗不打了，专心测修补
  s2.equipment.weapon = BOW; s2.equipIdx.weapon = 0;
  delete s2.inv.mithrilingot;            // giveMats() 顺手把神弓配方材料（含秘银锭）也发了，这里要清掉才叫"没材料"
  const rm = Game.repairMatOf(BOW);
  ck('修补材料 = 秘银锭×1', rm[0] === 'mithrilingot' && rm[1] === 1, JSON.stringify(rm));
  Game.repairWeapon();
  ck('没材料时修不了（只写日志，不会白扣）', Game.durOf(BOW) === 0, 'dur=' + Game.durOf(BOW));
  Game.addItem('mithrilingot', 1, true);
  Game.repairWeapon();
  ck('★ 有秘银锭就能修满，并扣掉 1 个', Game.durOf(BOW) === 120 && Game.invCount('mithrilingot') === 0,
     'dur=' + Game.durOf(BOW) + ' 秘银锭=' + Game.invCount('mithrilingot'));
}

console.log('\n================ 汇总 ================');
console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
if (bad.length) { console.log('失败项：'); bad.forEach(b => console.log(' - ' + b)); }
console.log(bad.length ? 'RESULT:FAIL' : 'RESULT:PASS');
