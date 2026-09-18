/* 神弓耐久专项探针（在 Node 里直接跑真实 data.js + game.js，不用浏览器）
   查的是玩家反馈的"神弓有耐久丢失问题"到底存不存在：
   打一场架掉多少、存邮箱再取回、存读档、存档码、老存档迁移、折断、修补……
   用法：node _debug_bow.js */
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
const GAME = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');

const PROBE = `
const G = Game;
const P = (k, v) => console.log('  ' + k + ' → ' + v);
const durs = () => JSON.stringify(G.S().toolDurs && G.S().toolDurs.divineBow);
const newRun = () => { G.newGame('fisher', 'normal'); const s = G.S(); s.tut = null; s.settings.roadAmbush = false; return s; };
const dummy = () => ({ id:'dummy', name:'木桩', hp:999999, atk:0, def:0, spd:1, traits:[], drops:[] });
const swing = (n) => { for (let i = 0; i < n; i++) { const s = G.S(); if (!s.combat) break; s.stats.hp = 9999; G.fightAction('attack'); } };

console.log('【A】刚拿到神弓（造出来的）');
{
  const s = newRun();
  G.addItem('divineBow', 1, true);
  P('DURA 定义', DURA.divineBow);
  P('durOf', G.durOf('divineBow'));
  P('toolDurs.divineBow', durs());
  P('S.dur.divineBow', s.dur && s.dur.divineBow);
  P('装备栏能装吗', (G.equip('divineBow'), s.equipment.weapon));
}

console.log('【B】单手持神弓，打 10 次攻击（每次应该只掉 1）');
{
  const s = newRun();
  G.addItem('divineBow', 1, true); G.equip('divineBow');
  G.startFight(dummy(), true);
  P('开打前', G.durOf('divineBow') + ' ' + durs());
  for (let i = 1; i <= 10; i++) { s.stats.hp = 9999; G.fightAction('attack'); }
  P('10 次攻击后', G.durOf('divineBow') + ' ' + durs());
  s.combat = null;
}

console.log('【C】双持：主手神弓 + 副手石剑，打 6 次');
{
  const s = newRun();
  G.addItem('divineBow', 1, true); G.addItem('ironSword', 1, true);
  G.equip('divineBow'); G.equip('ironSword', 0, 'weapon2');
  G.startFight(dummy(), true);
  P('开打前', '弓=' + G.durOf('divineBow') + ' 剑=' + G.durOf('ironSword') + ' 双持=' + !!(s.equipment.weapon && s.equipment.weapon2));
  for (let i = 1; i <= 6; i++) { s.stats.hp = 9999; G.fightAction('attack'); }
  P('6 次后', '弓=' + G.durOf('divineBow') + ' 剑=' + G.durOf('ironSword'));
  s.combat = null;
}

console.log('【D】存邮箱（耐久 50）→ 换一局 → 领回来');
{
  const s = newRun();
  G.addItem('divineBow', 1, true);
  s.toolDurs.divineBow = [50]; s.dur.divineBow = 50;
  const r = G.storeDivineBow();
  const mail = G.metaState().mailbox.filter(x => x && x.item === 'divineBow');
  P('存进去的返回值', JSON.stringify(r));
  P('邮件里的 dur', JSON.stringify(mail[0] && mail[0].dur));
  P('身上还有弓吗', G.invCount('divineBow'));
  const s2 = newRun();
  const i = G.metaState().mailbox.findIndex(x => x && x.item === 'divineBow');
  const c = G.claimMailbox(i);
  P('领回', JSON.stringify(c));
  P('领回后耐久', G.durOf('divineBow'));
  P('领回后 toolDurs', durs());
  P('领回后 S.dur', s2.dur && s2.dur.divineBow);
}

console.log('【E】磨损 → 存档 → 读档');
{
  const s = newRun();
  G.addItem('divineBow', 1, true); G.equip('divineBow');
  G.startFight(dummy(), true); for (let i = 0; i < 7; i++) { s.stats.hp = 9999; G.fightAction('attack'); } s.combat = null;
  P('打 7 次后', G.durOf('divineBow') + ' ' + durs());
  G.save();
  const raw = localStorage.getItem('guyuyizhang_save');
  P('存档 JSON 里存的', 'inv.divineBow=' + JSON.parse(raw).inv.divineBow + ' toolDurs=' + JSON.stringify(JSON.parse(raw).toolDurs.divineBow) + ' dur=' + JSON.stringify(JSON.parse(raw).dur.divineBow));
  G.newGame('fisher', 'normal');                 // 清内存（newGame 自己会写档）
  localStorage.setItem('guyuyizhang_save', raw);  // 把刚才那份放回去 = 模拟"关掉游戏再打开"
  P('load 返回', G.load());
  P('读档后', G.durOf('divineBow') + ' ' + durs());
}

console.log('【F】备份槽：存一份 → 磨损 → 从备份读回');
{
  const s = newRun();
  G.addItem('divineBow', 1, true); s.toolDurs.divineBow = [33]; s.dur.divineBow = 33;
  P('备份前', G.durOf('divineBow'));
  G.backupSlot(0);
  s.toolDurs.divineBow = [5]; s.dur.divineBow = 5;      // 后来磨损到 5
  const r = G.loadSlot(0);
  P('从备份读回', JSON.stringify(r && r.ok));
  P('读回后耐久（应该是 33）', G.durOf('divineBow') + ' ' + durs());
}

console.log('【F2】存档码：邮箱里的神弓耐久跟着走吗（导出码只带账号数据 + 备份槽）');
{
  const s = newRun();
  G.addItem('divineBow', 1, true); s.toolDurs.divineBow = [42]; s.dur.divineBow = 42;
  G.storeDivineBow();
  const code = G.exportCode();
  P('导出码长度', code.length);
  const dec = JSON.parse(decodeURIComponent(escape(Buffer.from(code, 'base64').toString('binary'))));
  const mb = (dec.meta.mailbox || []).filter(x => x && x.item === 'divineBow');
  P('码里的邮箱神弓 dur', JSON.stringify(mb[0] && mb[0].dur));
  G.newGame('fisher', 'normal');
  const r = G.importCode(code);
  P('导入结果', JSON.stringify(r && r.ok));
  const i = G.metaState().mailbox.findIndex(x => x && x.item === 'divineBow');
  const c = G.claimMailbox(i);
  P('导入后从邮箱领回', JSON.stringify(c) + ' 耐久=' + G.durOf('divineBow'));
}

console.log('【G】老存档：只有标量 S.dur（没有 toolDurs）');
{
  const s = newRun();
  s.inv.divineBow = 1; s.toolDurs = {}; s.dur = { divineBow: 30 };
  P('durOf', G.durOf('divineBow'));
  P('迁移后 toolDurs', durs());
}

console.log('【H】打到 0：会不会直接消失 / 能不能修');
{
  const s = newRun();
  G.addItem('divineBow', 1, true); G.equip('divineBow');
  s.toolDurs.divineBow = [2]; s.dur.divineBow = 2;
  G.startFight(dummy(), true);
  for (let i = 0; i < 3; i++) { if (!s.combat) break; s.stats.hp = 9999; G.fightAction('attack'); }
  s.combat = null;
  P('打 3 次后 身上还剩几把', G.invCount('divineBow'));
  P('装备槽', s.equipment.weapon);
  P('日志尾 3 条', (s.log || []).slice(0, 3).map(x => x.text).join(' | '));
  P('修补材料 repairMatOf', JSON.stringify(G.repairMatOf ? G.repairMatOf('divineBow') : null));
}

console.log('【I】装备栏显示 vs 实际（装备槽对应的那条实例）');
{
  const s = newRun();
  G.addItem('divineBow', 1, true); G.equip('divineBow');
  s.toolDurs.divineBow = [77]; s.dur.divineBow = 77;
  P('durOf(无 idx)', G.durOf('divineBow'));
  P('durOf(idx=equipIdx)', G.durOf('divineBow', s.equipIdx.weapon || 0));
  P('装完再读一次', (G.unequip('divineBow'), G.durOf('divineBow')));
}

console.log('【J】打断之后：自动换手会不会又换上坏的 + 能不能修回来');
{
  const s = newRun();
  G.addItem('divineBow', 1, true); G.addItem('ironSword', 1, true); G.addItem('mithrilingot', 2, true);
  s.furniture.grindstone = true;
  G.equip('divineBow');
  s.toolDurs.divineBow = [1]; s.dur.divineBow = 1;
  G.startFight(dummy(), true);
  s.stats.hp = 9999; G.fightAction('attack');
  P('打断后 弓还在吗', G.invCount('divineBow') + ' 把，耐久 ' + G.durOf('divineBow'));
  P('自动换上的武器（不该是坏的弓）', s.equipment.weapon);
  s.combat = null;
  G.unequip('ironSword');   // 修补只作用于主手：先把副手那把坏的顶上去（真实玩家也是这么点）
  G.equip('divineBow');
  P('现在主手是', s.equipment.weapon + '（耐久 ' + G.durOf(s.equipment.weapon) + '）');
  G.repairWeapon();
  P('磨刀石修补后耐久', G.durOf('divineBow'));
  P('秘银锭消耗', '2 → ' + G.invCount('mithrilingot'));
  G.repairWeapon();   // 再点一次：满耐久不该再吃材料
  P('满耐久再修一次后 秘银锭', G.invCount('mithrilingot'));
}
`;

new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console',
  DATA + '\n' + GAME + '\n' + PROBE)(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console);
