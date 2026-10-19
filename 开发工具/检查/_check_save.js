/* 存档体检：把玩家发来的存档码解开，打印关键状态（不掉档、不修改任何东西）
   用法：node _check_save.js <存档码>
        存档码也可以写在文件里：node _check_save.js @save.txt */
const fs = require('fs');
const raw = (process.argv[2] || '').trim();
if (!raw) { console.log('用法：node _check_save.js <存档码>   或   node _check_save.js @存档码.txt'); process.exit(1); }
const code = raw.startsWith('@') ? fs.readFileSync(raw.slice(1), 'utf8').trim() : raw;

let json = null, warn = '';
try { json = JSON.parse(Buffer.from(code, 'base64').toString('utf8')); }
catch (e) {
  // 存档码被截断时：尽量把能读的 JSON 片段补回来（只用于诊断，不改档）
  const txt = Buffer.from(code, 'base64').toString('utf8');
  const head = txt.slice(0, txt.lastIndexOf('"'));   // 砍掉最后那个不完整的字段
  for (const tail of ['"}}}]}}', '"}}]}', '"]}}}]}}', '}}]}', '"}}', '}])}}']) {
    try { json = JSON.parse(head + tail); break; } catch (err) {}
  }
  warn = '（存档码不完整，已按截断处尽力解析——末尾的字段可能缺失）';
}
if (!json) { console.log('解析失败：这份存档码不是完整的 base64 JSON。请重新导出一次再发。'); process.exit(2); }

const d = json.meta && json.meta.slots && json.meta.slots[0];
const S = (d && d.data) || {};
const F = S.flags || {};
console.log('=== 存档体检 ===' + (warn ? '\n' + warn : ''));
console.log('存档版本 :', json.t, '｜ v', json.v);
console.log('账号     : 魂点', json.meta.soul, '｜ 传世', json.meta.runs, '｜ 备份槽', (json.meta.slots || []).length);
console.log('存档     : 第', d && d.day, '天 ｜', S.identity, '/', S.difficulty, '｜ 当前场景', S.scene, S.zone ? '(' + S.zone + ')' : '');
console.log('关键物品 : 石板', (S.inv || {}).slate || 0, '｜ 遗物', (S.inv || {}).relic || 0, '｜ 龙骨', (S.inv || {}).dragonbone || 0);
console.log('结局标记 : A', !!F.ended_A, '｜ B', !!F.ended_B, '｜ C(秘辛)', !!F.ended_C, '｜ S(灯塔)', !!F.ended_S, '｜ S2', !!F.ended_S2);
console.log('亚特兰蒂斯: ', S.atlantis ? JSON.stringify({ unlocked: S.atlantis.unlocked, visited: S.atlantis.visited, stoneActive: S.atlantis.stoneActive, quest: S.atlantis.quest }) : '（还没解锁）');
console.log('其它旗标 :', Object.keys(F).length ? Object.keys(F).join('、') : '（空）');

console.log('\n=== 传送门诊断 ===');
const hasMats = ((S.inv || {}).slate || 0) >= 3 && ((S.inv || {}).relic || 0) >= 1 && ((S.inv || {}).dragonbone || 0) >= 1;
if (!F.ended_C) {
  console.log('❌ 还没达成结局 C（秘辛）→ 传送石不会出现。');
  console.log(hasMats ? '　 材料是齐的：去【山顶】，点画面右侧的浮动按钮「祭坛仪式（结局·秘辛）」。' : '　 材料也不齐：需要 遗物×1 + 石板×3 + 龙骨×1，而且要在【山顶】场景才会出现那个按钮。');
} else if (!(S.atlantis && S.atlantis.stoneActive)) {
  console.log('🔸 结局 C 已达成，但传送石还没激活。');
  console.log('　 去【山顶】，点热点「传送石 · 需解密」解符文（这一步会消耗 3 块石板）。');
} else {
  console.log('✅ 传送石已激活，可以直接传送去亚克兰蒂斯了。');
  const cloth = S.equipment && S.equipment.cloth;
  const o2 = ((S.toolkit || []).includes('diveMask')) || ((S.inv || {}).diveMask > 0) || ((S.relics || []).includes('atlantisSeed'));
  console.log('　 传送装备检查：潜水服', ['diveSuit', 'diveSuit2'].includes(cloth) ? '已穿' : '❌ 没穿（衣物栏）', '｜ 氧气罩/种子', o2 ? '有' : '❌ 没有');
}

// ---------- 真引擎跑一遍：这份存档现在能不能触发结局 ----------
console.log('\n=== 引擎实测（读档后能点出哪些结局） ===');
try {
  const path = require('path');
  const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
  const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
  const GAME = require('../../回归测试/helpers/runtime.js').engineSource(path.join(ROOT, 'js', 'game.js'));
  const store = {};
  const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const probe = `
    Game.setS(JSON.parse(JSON.stringify(SLOT)));
    Game.bind({ onLog: () => {}, onOverlay: () => {}, onEnding: () => {}, onFight: () => {}, onChange: () => {} });
    const at = (scene) => { const cur = Game.S().scene; Game.S().scene = scene; const r = Game.checkEndingActions().map(a => a.id); Game.S().scene = cur; return r; };
    const before = at('peak');
    const wasEnding = Game.S().ending, wasDeath = Game.S().death;
    Game.continueRun();                       // 相当于"结局界面选了继续游戏 / 读档接着玩"
    const after = at('peak');
    RESULT = { before, after, wasEnding, wasDeath, scene: Game.S().scene };
  `;
  const box = {};
  new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console', 'SLOT', 'box',
    DATA + '\n' + GAME + '\nvar RESULT=null;\n' + probe + '\nbox.RESULT=RESULT;')(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console, S, box);
  const r = box.RESULT;
  console.log('存档所在地点：' + r.scene + '（下面是"假设人站在山顶"时的可触发结局）');
  console.log('读档前：ending =', JSON.stringify(r.wasEnding), '｜ 山顶可点的结局按钮 =', r.before.length ? r.before.join('/') : '（一个都没有）');
  console.log('按"继续游戏"清掉结算状态后：山顶可点的结局按钮 =', r.after.length ? r.after.join('/') : '（一个都没有）');
  if (r.before.length === 0 && r.after.length > 0) console.log('　 → 确认：就是被"结局已结算（ending）"卡住了。新版读档会自动清掉；旧版请在结局界面点「留在岛上」，或干脆读一次档再继续。');
} catch (e) {
  console.log('（引擎实测跳过：' + e.message + '）');
}
