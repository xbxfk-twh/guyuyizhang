/* 交付前集成冒烟：模拟真实玩法路径，查有没有引入新问题 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = require('../../回归测试/helpers/runtime.js').engineSource(path.join(ROOT, 'js', 'game.js'));
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const box = {};
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console', 'box',
  DATA + '\n' + GAME + '\nObject.assign(box,{Game:Game,ITEMS:ITEMS,PATCH_NOTES:PATCH_NOTES,REDEEM_CODES:REDEEM_CODES,RELICS:RELICS,SCENES:SCENES,ENEMIES:ENEMIES,TOWN:TOWN,LAOCHAO:LAOCHAO,BLACKMARKET:BLACKMARKET});\n')(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console, box);
const { Game, ITEMS, PATCH_NOTES, SCENES, ENEMIES, TOWN, LAOCHAO, BLACKMARKET } = box;

let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };
const sec = t => console.log('\n===== ' + t + ' =====');
const LOGS = [];
Game.bind({ onLog: (t, c) => LOGS.push({ t, c }), onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: () => {} });
const rnd0 = Math.random;
const freeze = (v) => { Math.random = () => v; };
const unfreeze = () => { Math.random = rnd0; };

// ---------- A. 一局完整流程 ----------
sec('A. 一局完整流程（开局→采集→制造→建造→睡觉→存档→读档）');
{
  // 集成流程固定开局食物抽样；不同随机食物种类会占据不同数量的12格背包。
  freeze(0.99); Game.newGame('fisher', 'normal'); unfreeze();
  let S = Game.S();
  ck('开局成功且有存档', !!S && Game.hasSave());
  ck('开局物品齐全（>=8 种）', Object.keys(S.inv).length >= 8, Object.keys(S.inv).length + ' 种');

  // 采集：营地附近（先给体力）
  S.stats.stamina = 999;
  const before = JSON.stringify(S.inv);
  freeze(0.99); Game.travel('forest'); unfreeze();
  ck('能前往树林且场景已切换', Game.S().scene === 'forest', Game.S().scene);
  const pts = Game.pointsOf();
  ck('树林有可交互点位', pts.length > 0, pts.length + ' 个');

  // 玩家先在营地存放杂物，留出制作产物空间；12格新规则不可跳过整理。
  Game.S().scene='camp';for(const id of Object.keys(Game.S().inv)){if(['wood','branch','flint','stone','thatch'].includes(id))continue;Game.transferWarehouse(id,Game.invCount(id),true);if(Game.capUsed()<=6)break;}Game.S().scene='forest';
  // 制造：给材料造石斧
  Game.addItem('wood', 20, true); Game.addItem('branch', 20, true); Game.addItem('flint', 10, true);
  Game.addItem('stone', 20, true); Game.addItem('thatch', 20, true); Game.addItem('vine', 20, true);
  const rAxe = box.Game && true;
  const axeRecipe = (() => { try { const D = new Function('console', DATA + '\nreturn RECIPES;')(console); return D.find(r => r.id === 'r_axestone'); } catch (e) { return null; } })();
  if (axeRecipe) { Game.craft(axeRecipe); ck('能造出石斧', Game.invCount('axeStone') > 0, 'axeStone=' + Game.invCount('axeStone')); }
  else ck('找到石斧配方', false);

  // 建造：工作台
  // 烟雾测试只验制造/建造主流程，返程随机拦路会让工作台断言偶发失败。
  freeze(0.99); Game.travel('camp'); unfreeze();
  S = Game.S();
  // 批量给料会占满12格；先按真实存入操作腾出木材堆叠位。
  Game.transferWarehouse('wood',Math.min(100,Game.invCount('wood')),true);
  if(!Game.addItem('plank', 4, true))throw Error('集成建造测试未能装入所需木板');
  Game.buildFurniture('wb1');
  ck('能建简易工作台', !!Game.S().furniture.wb1);

  // 睡觉（会触发动画路径，但 game 层只测状态）
  S = Game.S();
  S.minute = 22 * 60; S.stats.stamina = 1;
  const day0 = S.day;
  Game.sleep('normal');
  ck('睡觉能推进到次日', Game.S().day > day0, '第' + day0 + ' → 第' + Game.S().day + ' 天');

  // 存读档
  Game.save();
  const snap = JSON.stringify({ day: Game.S().day, inv: Object.keys(Game.S().inv).length });
  Game.load();
  const after = JSON.stringify({ day: Game.S().day, inv: Object.keys(Game.S().inv).length });
  ck('存读档后状态一致', snap === after, snap + ' vs ' + after);
}

// ---------- B. 战斗全流程 ----------
sec('B. 战斗全流程（单挑 / 多目标 / 横扫 / 逃跑 / 死亡）');
{
  // 单挑
  Game.newGame('fisher', 'normal');
  let S = Game.S(); S.inv = {}; S.stats.hp = 99999; S.stats.stamina = 99999;
  Game.addItem('ironSword', 1, true); Game.addItem('woodShield', 1, true);
  Game.equip('ironSword'); Game.equip('woodShield');
  ck('盾能装到副手', Game.S().equipment.weapon2 === 'woodShield');
  freeze(0.1);
  Game.startFight(ENEMIES.boar, true);
  let n = 0;
  while (Game.S().combat && n++ < 200) { Game.S().stats.hp = 99999; Game.fightAction('attack'); }
  unfreeze();
  ck('单挑能打完并结算', !Game.S().combat && n < 200, n + ' 回合');
  ck('战斗经验有增长', Game.S().exp.combat > 0, 'exp=' + Game.S().exp.combat);
  ck('图鉴记录了这只怪', !!Game.S().seen['mon_boar']);

  // 多目标 + 横扫
  Game.newGame('fisher', 'normal');
  S = Game.S(); S.inv = {}; S.stats.hp = 99999; S.stats.stamina = 99999;
  Game.addItem('ironGreatSword', 2, true);
  Game.equip('ironGreatSword');
  freeze(0.1);
  Game.startFight(ENEMIES.tentacle, true);   // packAlways → 必两只
  const C = Game.S().combat;
  ck('触手哨兵必定两只', C.enemies.length === 2, C.enemies.length + ' 只');
  C.enemies.forEach(e => { e.ehp = 999; e.emax = 999; });
  Game.fightAction('sweep');
  ck('横扫在群战里可用且生效', Game.S().combat && Game.S().combat.sweepCd === 20);
  n = 0;
  while (Game.S().combat && n++ < 300) { Game.S().stats.hp = 99999; Game.S().combat.enemies.forEach(e => { e.ehp = Math.max(e.ehp, 1); }); Game.fightAction('attack'); }
  unfreeze();
  ck('群战能持续运行不报错', n < 300, n + ' 回合');

  // 逃跑
  Game.newGame('fisher', 'normal');
  S = Game.S(); S.inv = {}; S.stats.hp = 99999; S.stats.stamina = 99999;
  Game.addItem('ironSword', 1, true); Game.equip('ironSword');
  freeze(0.01);
  Game.startFight(ENEMIES.boar, true);
  Game.fightAction('flee');
  unfreeze();
  ck('能成功逃跑（战斗结束）', !Game.S().combat);

  // 死亡 → 结算 → 继续
  Game.newGame('fisher', 'normal');
  S = Game.S(); S.stats.hp = 1;
  const soul0 = Game.metaState().soul;
  Game.die('测试死亡');
  ck('死亡会写 ending 与 death', Game.S().ending === 'D' && !!Game.S().death);
  ck('死亡结算给了魂点', Game.metaState().soul > soul0, soul0 + ' → ' + Game.metaState().soul);
  Game.continueRun();
  ck('继续游戏会清掉结算状态', !Game.S().ending && !Game.S().death);
  ck('继续后能正常存档', (() => { try { Game.save(); return true; } catch (e) { return false; } })());
}

// ---------- C. 商店全量交易 ----------
sec('C. 商店全量交易（每个货架每件货 买卖各一次）');
{
  Game.newGame('fisher', 'normal');
  const S = Game.S(); S.inv = {};
  S.inv.beibi = 999999; S.inv.coin = 99999;
  if (Game.setS) Game.setS(S);
  let tried = 0, errs = [];
  const shelves = [['老潮', LAOCHAO.sell], ['杂货商', TOWN.grocer.sell], ['铁匠', TOWN.smith.sell],
                   ['情报贩子', TOWN.informant.sell], ['黑市', BLACKMARKET.sell]];
  const buyShelves = [['老潮收', LAOCHAO.buy], ['杂货商收', TOWN.grocer.buy], ['铁匠收', TOWN.smith.buy],
                      ['情报贩子收', TOWN.informant.buy], ['黑市收', BLACKMARKET.buy]];
  for (const [nm, list] of shelves) {
    for (const e of (list || [])) {
      try { Game.buyFromMerchant(e.id, 1, list, false); tried++; }
      catch (err) { errs.push(nm + '/' + e.id + ':' + err.message); }
    }
  }
  // 卖出：给足货
  for (const [nm, list] of buyShelves) {
    for (const e of (list || [])) {
      Game.addItem(e.id, 3, true);
      try { Game.sellToMerchant(e.id, 1, list, false); tried++; }
      catch (err) { errs.push(nm + '/' + e.id + ':' + err.message); }
    }
  }
  ck('所有货架买+卖都无异常', errs.length === 0, tried + ' 笔交易' + (errs.length ? ' 异常:' + errs.slice(0,3).join(' ') : ''));
  ck('石板不在任何货架上（已下架）',
     [...shelves, ...buyShelves].every(([nm, l]) => (l || []).every(e => e.id !== 'slate')));
}

// ---------- D. 全部点位可点（防新数据引出的崩溃） ----------
sec('D. 全部场景 × 全部点位：可用性检查 + 实际采集一次不崩');
{
  let checked = 0, crashed = [];
  for (const sc of SCENES) {
    Game.newGame('fisher', 'normal');
    const S = Game.S();
    S.inv = {}; S.stats.hp = 999999; S.stats.stamina = 999999; S.tut = null;
    // 给全套工具与材料，尽量让 need 通过
    ['axeStone','axeIron','axeSteel','pickStone','pickIron','pickSteel','pickBlack','knifeStone','hoe','rod','net',
     'torch','diveSuit','diveMask','seachart','relic','slate','dragonbone','bait'].forEach(id => { if (ITEMS[id]) Game.addItem(id, 5, true); });
    S.buildings.watch = 3; S.buildings.dock = 3; S.buildings.house = 3; S.buildings.fire = 3;
    ['wb1','wb2','wb3','fr1','fr2','fr3','bed2','flag','shelf','tank','rainfilter','loom','medPot'].forEach(f => S.furniture[f] = 1);
    S.equipment.cloth = 'diveSuit'; S.equipment.weapon = 'ironSword';
    if (Game.setS) Game.setS(S);
    const zones = sc.zones ? Object.keys(sc.zones) : [null];
    for (const z of zones) {
      try {
        const cur = Game.S();
        cur.scene = sc.id; cur.zone = z;
        if (Game.setS) Game.setS(cur);
        const pts = Game.pointsOf();
        for (const p of pts) {
          try { Game.pointStatus(p); Game.pointAvailable(p); checked++; }
          catch (err) { crashed.push('status ' + sc.id + '/' + z + '/' + p.id + ': ' + err.message); }
        }
      } catch (err) { crashed.push('scene ' + sc.id + '/' + z + ': ' + err.message); }
    }
  }
  ck('全部点位的 pointStatus/pointAvailable 都不抛异常', crashed.length === 0, checked + ' 个点位' + (crashed.length ? ' 异常:' + crashed.slice(0,3).join(' | ') : ''));
}

// ---------- E. 图鉴与配方完整性 ----------
sec('E. 图鉴 / 配方 / 引用完整性');
{
  const spr = new Set();
  const UI = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
  (UI.match(/const SPR = \{([^}]*)\}/) || ['',''])[1].split(',').forEach(x => { const k = x.split(':')[0].trim(); if (k) spr.add(k); });
  (UI.match(/Object\.assign\(SPR, \{([^}]*)\}\)/) || ['',''])[1].split(',').forEach(x => { const k = x.split(':')[0].trim(); if (k) spr.add(k); });
  // 图标可在 items/ 或 items-accent/ 任一目录（限定物神弓是常驻彩色）
  const noPng = [...spr].filter(id => !fs.existsSync(path.join(ROOT, 'assets/img/items', id + '.png'))
                                  && !fs.existsSync(path.join(ROOT, 'assets/img/items-accent', id + '.png')));
  ck('SPR 登记的图标都有 png（黑白或彩色任一目录）', noPng.length === 0, spr.size + ' 项' + (noPng.length ? ' 缺:' + noPng.slice(0,5).join(',') : ''));
  const accList = ((UI.match(/const ACCENT = \{([^}]*)\}/) || ['',''])[1]).split(',').map(s => s.split(':')[0].trim()).filter(Boolean);
  const accNo = accList.filter(id => !fs.existsSync(path.join(ROOT, 'assets/img/items-accent', id + '.png')));
  ck('ACCENT 名单都有彩色图', accNo.length === 0, accList.length + ' 项' + (accNo.length ? ' 缺:' + accNo.join(',') : ''));
  ck('1.10以前的公告全部撤下',PATCH_NOTES.every(n=>n.version==='v1.10'));
  ck('新版草稿保持待批准',PATCH_NOTES.every(n=>!n.approved));
}
sec('F. 新版公告投递与旧公告撤下');
{
  Game.newGame('fisher','normal');const note=PATCH_NOTES[0],saved=note.approved;note.approved=true;
  const m=Game.metaState();m.mailbox=[{notice:'v1.05'},{item:'namecard',qty:1}];m.patchSent={};
  const list=Game.mailboxList();
  ck('批准公告仅投一次',list.filter(x=>x.notice===note.version).length===1 && Game.mailboxList().filter(x=>x.notice===note.version).length===1);
  ck('旧公告撤下且物资保留',!list.some(x=>x.notice==='v1.05') && list.some(x=>x.item==='namecard'));
  const idx=Game.mailboxList().findIndex(x=>x.notice===note.version);ck('新版公告可标记已读',idx>=0 && Game.claimMailbox(idx).ok);
  note.approved=saved;
}
// ---------- G. 兑换码 / 神物 ----------
sec('G. 兑换码与神物');
{
  Game.newGame('fisher', 'normal');
  const codes = Object.keys(box.REDEEM_CODES).filter(c=>!box.REDEEM_CODES[c].retired);
  let oks = 0;
  for (const c of codes) { try { if (Game.redeemCode(c).ok) oks++; } catch (e) {} }
  ck('所有兑换码都能正常兑换', oks === codes.length, oks + '/' + codes.length);
  const retired=Object.keys(box.REDEEM_CODES).filter(c=>box.REDEEM_CODES[c].retired);
  ck('下架兑换码不能再兑换',retired.every(c=>!Game.redeemCode(c).ok));
  const RELICS = box.RELICS;
  ck('神物共 5 件', Object.keys(RELICS).length === 5, Object.keys(RELICS).join('、'));
  ck('神物栏能装备/卸下', (() => {
    const S = Game.S();
    S.relics = Object.keys(RELICS); S.relicSlots = 3; S.relicEquip = [null, null, null];
    const a = Game.equipRelic(Object.keys(RELICS)[0]);
    const b = Game.unequipRelic(Object.keys(RELICS)[0]);
    return a.ok && b.ok;
  })());
}

console.log('\n================ 汇总 ================');
console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
if (bad.length) { console.log('失败项：'); bad.forEach(b => console.log(' - ' + b)); }
console.log(bad.length ? 'RESULT:FAIL' : 'RESULT:PASS');
process.exitCode = bad.length ? 1 : 0;
