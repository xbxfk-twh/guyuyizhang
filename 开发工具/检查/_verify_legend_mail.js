/* 传奇模式限制验证：不能领物资邮件（物品/神物/魂点），公告照常可读，邮件不消耗，兑换码也不消耗 */
const fs = require('fs');
const path = require('path');
const ROOT = 'E:\\灵灰工作区\\孤屿遗章-游戏';
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const box = {};
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console', 'box',
  DATA + '\n' + GAME + '\nObject.assign(box,{Game:Game,ITEMS:ITEMS,RELICS:RELICS,REDEEM_CODES:REDEEM_CODES});\n')(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console, box);
const { Game, ITEMS, RELICS, REDEEM_CODES } = box;

let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };
const sec = t => console.log('\n===== ' + t + ' =====');

Game.bind({ onLog: () => {}, onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: () => {} });

// 造一个干净的邮箱，塞进各类邮件，然后用指定难度开局
function setup(diff) {
  Game.newGame('fisher', diff);
  const m = Game.metaState();
  m.mailbox = [
    { notice: 'vTEST', title: '测试公告', body: '正文' },          // 0 公告
    { item: 'beibi', qty: 100 },                                   // 1 物品（贝壳=钱）
    { item: 'coin', qty: 50 },                                     // 2 物品（金币）
    { relic: 'vampire' },                                          // 3 神物
    { soul: 100 },                                                 // 4 魂点
    { item: 'divineBow', qty: 1, divineBow: true, dur: 37 },       // 5 限定神弓
  ];
  m.redeemed = {};
  return Game.S();
}

sec('A. 传奇难度：物资邮件一律领不了');
{
  setup('legend');
  const inBag0 = Game.invCount('beibi');
  const soul0 = Game.metaState().soul;
  const list0 = Game.mailboxList().length;
  for (const target of [
    { i: 1, 名: '物品·贝壳', check: () => Game.invCount('beibi') === inBag0 },
    { i: 2, 名: '物品·金币', check: () => !Game.invCount('coin') },
    { i: 3, 名: '神物',      check: () => !(Game.S().relics || []).includes('vampire') },
    { i: 4, 名: '魂点',      check: () => Game.metaState().soul === soul0 },
    { i: 5, 名: '限定神弓',  check: () => Game.invCount('divineBow') === 0 },
  ]) {
    const r = Game.claimMailbox(target.i);
    ck('★ 传奇档领「' + target.名 + '」被拦下', !r.ok, r.reason ? r.reason.slice(0, 34) : '竟然成功了');
    ck('　 而且没真的拿到东西', target.check());
    ck('　 邮件还留在邮箱里（没被消耗）', Game.mailboxList().length === list0, '邮件数 ' + Game.mailboxList().length + '/' + list0);
  }
  const rn = Game.claimMailbox(0);
  ck('★ 传奇档仍然能读「公告」（纯文本不算物资）', rn.ok, rn.msg);
  ck('　 公告读完会被移除', Game.mailboxList().length === list0 - 1, '邮件数 ' + Game.mailboxList().length);
}

sec('B. 非传奇难度：照常能领（限制只针对传奇）');
{
  for (const diff of ['easy', 'normal', 'hard']) {
    setup(diff);
    // 从后往前领：claimMailbox 会 splice 掉领过的邮件，正着领下标会移位
    const idx = (pred) => Game.mailboxList().findIndex(pred);
    const r5 = Game.claimMailbox(idx(x => x.item === 'divineBow'));
    const r3 = Game.claimMailbox(idx(x => x.relic === 'vampire'));
    const r4 = Game.claimMailbox(idx(x => x.soul > 0));
    const r1 = Game.claimMailbox(idx(x => x.item === 'beibi'));
    ck(diff + ' 档能领物品/神物/魂点/神弓',
       r1.ok && r3.ok && r4.ok && r5.ok && Game.invCount('beibi') > 0 && (Game.S().relics || []).includes('vampire') && Game.invCount('divineBow') === 1,
       [r1.ok, r3.ok, r4.ok, r5.ok].join(','));
  }
}

sec('C. 传奇档兑换码：也不给，且不消耗兑换码');
{
  setup('legend');
  const code = 'HAPPY9';    // 神物兑换码
  console.log('    用 ' + code + ' 试：');
  const r = Game.redeemCode(code);
  ck('★ 传奇档兑换被拦下', !r.ok, r.reason ? r.reason.slice(0, 34) : '竟然成功了');
  ck('★ 兑换码没被消耗（换低难度还能兑）', !Game.metaState().redeemed[code]);
  ck('　 邮箱里也没多出东西', Game.mailboxList().length === 6, '邮件数 ' + Game.mailboxList().length);
  // 换低难度就能兑
  Game.newGame('fisher', 'normal');
  const r2 = Game.redeemCode(code);
  ck('★ 换普通难度后能正常兑换', r2.ok, r2.msg);
  ck('　 兑换后邮箱里出现了神物邮件', Game.mailboxList().some(x => x.relic === 'vampire'));
}

sec('D. 传奇档边界：普通材料也领不了');
{
  setup('legend');
  const m = Game.metaState();
  m.mailbox.push({ item: 'wood', qty: 5 });     // 末尾追加一封普通材料邮件
  const w0 = Game.invCount('wood');            // 开局自带木材，所以按增量判断
  const gi = Game.mailboxList().findIndex(x => x.item === 'wood');
  const r = Game.claimMailbox(gi);
  ck('★ 传奇档普通材料也领不了', !r.ok, r.reason ? r.reason.slice(0, 30) : '竟然成功了');
  ck('木材数量没变（没拿到）', Game.invCount('wood') === w0, w0 + ' → ' + Game.invCount('wood'));
  ck('那封邮件还在', Game.mailboxList().some(x => x.item === 'wood'));
}

console.log('\n================ 汇总 ================');
console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
if (bad.length) { console.log('失败项：'); bad.forEach(b => console.log(' - ' + b)); }
console.log(bad.length ? 'RESULT:FAIL' : 'RESULT:PASS');
