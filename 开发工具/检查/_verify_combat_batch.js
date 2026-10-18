/* 2026-09-25 战斗批的界面复核：重击/必中的按钮与冷却、必中真的必中、老存档迁移、混装射速。
   静态形状由 回归测试/checks.js 第 29 节守着，这里管行为。 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = process.env.GUYU_GAME_ROOT || 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_out', 'combatbatch');
const PORT = 9523;
const PROFILE = path.join(os.tmpdir(), 'guyu_cb_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });
let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };

const BOOT = `(async () => {
  const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
  const w = ms => new Promise(r => setTimeout(r, ms));
  for (let step = 0; step < 12 && !Game.S(); step++) {
    const cf = [...document.querySelectorAll('#modal [data-choice], #modal .modal-actions button')].find(x => /开始新游戏/.test(x.textContent));
    if (cf) { cf.click(); await w(700); continue; }
    if (!document.querySelector('.identity')) { clk('#btn-new'); await w(700); continue; }
    document.querySelector('.identity').click(); await w(700);
  }
  for (let i = 0; i < 10; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
  for (let i = 0; i < 40 && document.documentElement.classList.contains('boot-pending'); i++) await w(250);
  const S = Game.S(); if (!S) return 'no-state';
  S.tut = null;
  return 'ok';
})()`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, 'about:blank'], { stdio: 'ignore' });
  let t = null;
  for (let i = 0; i < 60 && !t; i++) { await sleep(250); try { t = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(x => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map(); const errs = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') errs.push((((m.params.exceptionDetails || {}).exception) || {}).description || '');
  };
  const send = (me, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => (m.error ? rej(new Error(me + ':' + JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method: me, params: p || {} })); });
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 320) }; return r.result && r.result.value; };
  const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, n), Buffer.from(r.data, 'base64')); };

  // ===== A. 重击 / 必中的按钮与冷却（两个方向都测）=====
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2800);
  const boot = await ev(BOOT);
  console.log('\n开局：' + boot);
  if (boot !== 'ok') { ck('能开局', false, boot); }

  const A = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const S = Game.S();
    // 给他一把石质匕首 + 一只"打不死"的怪（血条只影响显示，这里把上限也抬高，方便反复试）
    S.inv = {}; Game.addItem('knifeStone', 1, true); S.equipment.weapon = 'knifeStone'; S.equipment.weapon2 = null;
    S.skill.combat = 2; S.tree.combat = {};          // 2 级但一个节点都没点
    Game.startFight(ENEMIES.boar, true); await w(500);
    S.stats.hp = 999999;
    S.combat.enemies[0].ehp = 9999; S.combat.enemies[0].emax = 9999;
    const 重渲染 = async () => { Game.fightAction('defend'); await w(350); };   // 战斗面板只在出手后重画
    await 重渲染();
    const 没学 = [...document.querySelectorAll('#fight-btns button, #battle-panel [data-fact]')].map(b => b.textContent.trim());
    const 面板 = (document.querySelector('#fight-status') || {}).textContent || '';
    S.tree.combat.f_sure = 1;
    await 重渲染();
    document.querySelector('[data-fact="skills"]').click();
    const 学必中 = [...document.querySelectorAll('#fight-btns button, #battle-panel [data-fact]')].map(b => b.textContent.trim());
    return { 没学, 面板, 学必中, 必中可用: Game.sureInfo().usable, 重击可用: Game.hasHeavy() };
  })()`);
  console.log('A 没学/学必中：' + JSON.stringify(A));
  if (A.__err) { ck('A 战斗按钮可测', false, JSON.stringify(A)); }
  else {
    ck('A1 2 级但没点节点时：既没有重击也没有必中（不学就没有）',
       !(A.没学 || []).some(t => /^重击/.test(t)) && !(A.没学 || []).some(t => /^必中/.test(t)), (A.没学 || []).join(' / '));
    ck('A2 学了必中：出现必中按钮、且重击仍然没有（互斥）',
       (A.学必中 || []).some(t => /^必中/.test(t)) && !(A.学必中 || []).some(t => /^重击/.test(t)), (A.学必中 || []).join(' / '));
    ck('A3 未学重击时状态行不写"重击命中"', !/重击命中/.test(A.面板 || ''), A.面板);
  }
  const B = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const S = Game.S();
    const RND = Math.random;
    Math.random = () => 0.99;                     // 0.99 > 命中率 → 普通攻击必空；必中必须仍然打中
    S.stats.hp = 999999;
    const e0 = Game.S().combat.enemies[0].ehp;
    Game.fightAction('sure'); await w(400);
    const e1 = Game.S().combat ? Game.S().combat.enemies[0].ehp : 0;
    const 冷却 = Game.sureInfo();
    Game.fightAction('defend'); await w(400);     // 重画一次，才看得到按钮的置灰状态
    document.querySelector('[data-fact="skills"]')?.click();
    const 按钮 = [...document.querySelectorAll('#fight-btns button, #battle-panel [data-fact]')].map(b => ({ t: b.textContent.trim(), dis: b.disabled }));
    const e2 = Game.S().combat ? Game.S().combat.enemies[0].ehp : 0;
    Game.fightAction('sure'); await w(300);       // 冷却中再点
    const e3 = Game.S().combat ? Game.S().combat.enemies[0].ehp : 0;
    Math.random = RND;
    return { 打中: e1 < e0, 掉了: e0 - e1, 冷却说明: 冷却.reason, 按钮: 按钮.filter(b => /必中/.test(b.t)), 冷却中再点: e3 === e2 };
  })()`);
  console.log('B 必中：' + JSON.stringify(B));
  if (B.__err) { ck('B 必中可测', false, JSON.stringify(B)); }
  else {
    ck('★ B1 必中在"必空"的随机数下依然打中（真的必中）', B.打中 === true && B.掉了 > 0, '掉血 ' + B.掉了);
    ck('★ B2 用完之后进冷却（按钮置灰 + 写明还需几秒）',
       /还需 \d+ 秒/.test(B.冷却说明 || '') && (B.按钮[0] || {}).dis === true, (B.按钮[0] || {}).t + ' / ' + B.冷却说明);
    ck('★ B3 冷却中再点没反应（伤害不再变）', B.冷却中再点 === true);
  }
  await shot('combat-sure.png');

  // ===== C. 重击：学了才有、1.5 倍、也进冷却 =====
  const C = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const S = Game.S();
    S.tree.combat = { f_heavy: 1 };               // 换成重击
    S.combat.heavyCd = 0; S.stats.hp = 999999;
    Game.fightAction('defend'); await w(400);     // 重画
    document.querySelector('[data-fact="skills"]')?.click();
    const 按钮 = [...document.querySelectorAll('#fight-btns button, #battle-panel [data-fact]')].map(b => b.textContent.trim());
    const RND = Math.random; Math.random = () => 0.0;   // 必中命中
    const e0 = Game.S().combat.enemies[0].ehp;
    Game.fightAction('heavy'); await w(400);
    const e1 = Game.S().combat ? Game.S().combat.enemies[0].ehp : 0;
    Game.fightAction('defend'); await w(350);
    const 重击按钮 = [...document.querySelectorAll('#fight-btns button, #battle-panel [data-fact]')].filter(b => /重击/.test(b.textContent)).map(b => ({ t: b.textContent.trim(), dis: b.disabled }));
    Math.random = RND;
    return { 按钮, 打中: e1 < e0, 冷却: Game.heavyInfo().reason, 重击按钮 };
  })()`);
  console.log('C 重击：' + JSON.stringify(C));
  if (C.__err) { ck('C 重击可测', false, JSON.stringify(C)); }
  else {
    ck('★ C1 学了重击才有重击按钮（必中按钮消失）',
       (C.按钮 || []).some(t => /^重击/.test(t)) && !(C.按钮 || []).some(t => /^必中/.test(t)), (C.按钮 || []).join(' / '));
    ck('★ C2 重击打中并进入冷却（按钮置灰 + 还需几秒）',
       C.打中 === true && /还需 \d+ 秒/.test(C.冷却 || '') && (C.重击按钮[0] || {}).dis === true, C.冷却);
  }

  // ===== D. 混装射速（枪 + 匕首）：射击不吃双持 ×1.5 =====
  const D = await ev(`(() => {
    const S = Game.S();
    Game.addItem('pistol', 1, true); Game.addItem('bullet', 5, true);
    S.equipment.weapon = 'pistol'; S.equipment.weapon2 = 'knifeStone';
    const 射击 = Game.combatSpeed(true), 近战 = Game.combatSpeed(false);
    S.equipment.weapon = 'knifeStone'; S.equipment.weapon2 = 'ironDagger';
    const 双匕 = Game.combatSpeed(false);
    return { 射击, 近战, 双匕, 枪速: ITEMS.pistol.spd, 匕速: ITEMS.knifeStone.spd };
  })()`);
  console.log('D 混装：' + JSON.stringify(D));
  ck('★ D1 枪+匕首：射击按枪速、近战按匕首速（都不吃 ×1.5）',
     D.射击 === D.枪速 && D.近战 === D.匕速, '射击 ' + D.射击 + ' / 近战 ' + D.近战);
  ck('★ D2 双匕首的 ×1.5 仍然生效（没被一起改坏）', D.双匕 > D.匕速, '双匕 ' + D.双匕);

  // ===== E. 老存档迁移：战斗 2 级、两个节点都没点 → 读档后自动补重击 =====
  const E = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const S = Game.S();
    S.skill.combat = 2; S.tree.combat = {}; delete S.migCombat2;      // 模拟"这一版之前的老档"
    Game.save(); await w(500);
    const before = { hasHeavy: Game.hasHeavy(), flag: S.migCombat2 };
    return { before };
  })()`);
  console.log('E 迁移前：' + JSON.stringify(E));
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(3000);
  const E2 = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
    // 标题页 →「继续上次游戏」（有存档时它会直接进游戏）
    const cont = [...document.querySelectorAll('button')].find(b => /继续|读取/.test(b.textContent));
    if (cont) { cont.click(); await w(1600); }
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
    if (!Game.S()) return { __err: '没读到档' };
    return { hasHeavy: Game.hasHeavy(), heavyLv: (Game.S().tree.combat || {}).f_heavy || 0, flag: Game.S().migCombat2 };
  })()`);
  console.log('E 迁移后：' + JSON.stringify(E2));
  if (E2.__err) { ck('E 老档迁移可测', false, JSON.stringify(E2)); }
  else {
    ck('★ E1 老存档（2 级、没点过节点）读档后自动补上重击', E2.hasHeavy === true && E2.heavyLv === 1, JSON.stringify(E2));
    ck('E2 迁移只做一次（读档后标记落下）', E2.flag === 1);
  }

  // 首次夜袭前普通狼只来一匹，夜袭标记落下后恢复群袭；核对真实战斗面板。
  const wolfPanel = async afterRaid => ev(`(async () => {
    for (let i=0; i<40 && document.querySelector('#loading'); i++) await new Promise(r=>setTimeout(r,250));
    const S = Game.S(); S.tut = null; S.flags.firstRaidDone = ${afterRaid ? 1 : 0};
    const rng = Math.random;
    try { Math.random = () => 0.1; Game.startFight(ENEMIES.wolf, true); }
    finally { Math.random = rng; }
    await new Promise(r => setTimeout(r, 400));
    return { count:S.combat.enemies.length, cards:document.querySelectorAll('#fight-targets .target').length, title:document.querySelector('.battle-header>b')?.textContent, loading:!!document.querySelector('#loading') };
  })()`);
  const wolfBefore = await wolfPanel(false);
  ck('首次夜袭前战斗面板只显示一匹狼', !wolfBefore.loading && wolfBefore.count === 1 && wolfBefore.cards===1 && /狼/.test(wolfBefore.title), JSON.stringify(wolfBefore));
  await shot('wolf-before-first-raid.png');
  const wolfAfter = await wolfPanel(true);
  ck('首次夜袭后战斗面板恢复两匹狼', !wolfAfter.loading && wolfAfter.count === 2 && wolfAfter.cards===2 && /狼/.test(wolfAfter.title), JSON.stringify(wolfAfter));
  await shot('wolf-after-first-raid.png');

  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');
  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('\n通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
