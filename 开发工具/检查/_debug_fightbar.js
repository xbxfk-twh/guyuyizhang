/* 探针：战斗血条到底有没有跟上引擎里的血量？
   玩家反馈"怪实际上扣血了但是不掉血条"，这个脚本在真实浏览器里跑真实战斗，
   每打一下都把「引擎里 C.enemies[].ehp」和「DOM 里 .hp-fill 的 width%」对一遍。
   只读不改游戏文件。用法：node _debug_fightbar.js  */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const PORT = 9347;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_fightbar_' + process.pid);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = url => new Promise((resolve, reject) => {
  http.get(url, res => { let b = ''; res.on('data', c => (b += c)); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }).on('error', reject);
});

const PAGE_TEST = `(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
  clk('#btn-new'); await wait(400);
  clk('.identity'); await wait(400);
  clk('.identity'); await wait(400);
  clk('.identity'); await wait(1200);
  ['.modal-actions button', '.modal-x', '#modal-close'].forEach(s => { for (let i = 0; i < 6; i++) clk(s); });
  await wait(300);
  const S = Game.S();
  if (!S) return { fatal: '没开出局' };
  S.tut = null;
  S.difficulty = 'normal';
  S.skill.combat = 5;
  S.inv.blackSword = 1; S.equipment.weapon = 'blackSword';
  S.inv.steelShield = 1; S.equipment.weapon2 = 'steelShield';
  S.inv.arrow = 60; S.inv.bow = 1;
  S.inv.smokeBomb = 9; S.inv.antidote = 9;
  S.inv.poisonCoat = 9;
  Game.equipTool && 0;

  const problems = [];
  const runTrial = (enemyId, acts, maxSteps) => {
    const en = ENEMIES[enemyId];
    if (!en) { problems.push({ enemyId, exc: '没有这个敌人' }); return; }
    let steps = 0;
    for (let restart = 0; restart < 4; restart++) {
      if (steps >= maxSteps) return;
      S.stats.hp = Game.hpMax(); S.stats.stamina = Game.maxStam();
      S.statuses.poison = 0; S.statuses.bleed = 0;
      Game.startFight(en, true);
      if (!S.combat) { problems.push({ enemyId, exc: 'startFight 没进战斗' }); return; }
      for (let k = 0; k < 40 && steps < maxSteps; k++) {
        const C = S.combat; if (!C) break;
        S.stats.hp = Game.hpMax();                    // 别让玩家先死，尽量多打几轮
        const act = acts[steps % acts.length];
        const aliveN = C.enemies.filter(e => e.ehp > 0).length;
        const ti = (aliveN > 1 && (act === 'attack' || act === 'heavy' || act === 'ranged')) ? Math.floor(Math.random() * C.enemies.length) : 0;
        let exc = null;
        try { Game.fightAction(act, ti); } catch (e) { exc = String((e && e.message) || e); }
        steps++;
        if (exc) { problems.push({ enemyId, step: steps, act, exc, kind: 'throw' }); break; }
        const C2 = S.combat;
        if (!C2) break;                               // 战斗结束 → 重开一局
        if (S.stats.hp <= 0) S.stats.hp = Game.hpMax();   // 别让这一局真的倒下（倒下会进结局）
        const rows = [...document.querySelectorAll('#fight-targets .hp-line')];
        const dom = rows.map(r => {
          const f = r.querySelector('.hp-fill');
          return { pct: f ? Math.round(parseFloat(f.style.width) || 0) : -1, txt: (r.querySelector('.tg-hp') || {}).textContent || '' };
        });
        const eng = C2.enemies.map(e => ({ pct: Math.max(0, Math.min(100, Math.round(e.ehp / e.emax * 100))), ehp: Math.round(e.ehp), emax: e.emax }));
        const bad = dom.length !== eng.length || dom.some((d, i) => Math.abs(d.pct - eng[i].pct) > 1);
        if (bad) {
          problems.push({ enemyId, step: steps, act, kind: 'bar', dom, eng });
          if (problems.length >= 6) return;
        }
      }
    }
  };

  const ids = Object.keys(ENEMIES);
  const picks = ['wolf', 'pirate', 'tentacle', 'bear', 'cavebear', 'spiderQueen', 'wolfKing', 'sunkenKing', 'banditChief']
    .filter(id => ids.indexOf(id) >= 0);
  let stepsRun = 0, reused = 0;
  for (const id of (picks.length ? picks : ids.slice(0, 6))) {
    runTrial(id, ['attack', 'attack', 'heavy', 'attack', 'defend', 'attack', 'sweep', 'attack', 'item', 'attack'], 260);
  }
  // CSS 自检：选目标的黄框 / 已选定的白框现在到底生效没有（原来选择器写成 .fight-targets 是死的）
  S.stats.hp = Game.hpMax();
  Game.startFight(ENEMIES[picks[0]], true);
  const row = document.querySelector('#fight-targets .target');
  let css = null;
  if (row) {
    const before = getComputedStyle(row).borderTopWidth;
    row.classList.add('selected');
    const after = getComputedStyle(row).borderTopColor;
    row.classList.remove('selected');
    const tg = document.querySelector('#fight-targets .tg-hp');
    css = { borderTopWidth: before, selectedBorderColor: after, hpColor: tg ? getComputedStyle(tg).color : null };
  }
  return { ok: true, problems, enemyCount: ids.length, picks, css };
})()`;

async function main() {
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE,
    '--window-size=1280,900', 'about:blank',
  ], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try { target = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(t => t.type === 'page'); } catch (e) {}
  }
  if (!target) { chrome.kill(); throw new Error('Chrome 没起来'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params) => new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, m => (m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result)));
    ws.send(JSON.stringify({ id: i, method, params: params || {} }));
  });
  const evaluate = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result && r.result.value;
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2500);
  const shot = async (name, w, h, mobile) => {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile });
    await sleep(500);
    const outDir = path.join(__dirname, '_fightbar_out');
    fs.mkdirSync(outDir, { recursive: true });
    const r = await send('Page.captureScreenshot', { format: 'png' });
    const f = path.join(outDir, name + '.png');
    fs.writeFileSync(f, Buffer.from(r.data, 'base64'));
    console.log('shot ' + f);
  };
  try {
    const rep = await evaluate(PAGE_TEST);
    console.log(JSON.stringify(rep, null, 2));
  } catch (e) {
    console.log('运行异常: ' + e.message);
  }
  // 视觉确认：两怪战斗（触手哨兵必定两只），手机竖屏尺寸
  await evaluate(`(() => {
    Game.newGame('woodcutter', 'normal');
    const S = Game.S();
    document.querySelectorAll('#ending-screen, #ending, .ending-wrap').forEach(e => e.remove());
    S.tut = null; S.inv.blackSword = 1; S.equipment.weapon = 'blackSword'; S.skill.combat = 5;
    S.stats.hp = Game.hpMax(); S.stats.stamina = Game.maxStam();
    Game.startFight(ENEMIES.tentacle, true);
    Game.fightAction('attack', 0);
    return 1;
  })()`);
  await shot('fight_2enemy_mobile', 844, 390, true);   // 手机是横屏游玩（竖屏会被"请横屏游玩"挡住）
  console.log('手机布局测量 ' + JSON.stringify(await evaluate(`(() => {
    const mc = document.querySelector('#modal .modal-content');
    const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); const m = mc.getBoundingClientRect(); return { top: Math.round(b.top - m.top), bottom: Math.round(b.bottom - m.top), h: Math.round(b.height) }; };
    return { modal: { client: mc.clientHeight, scroll: mc.scrollHeight, scrolled: mc.scrollTop }, img: r('.enemy-img'), targets: r('#fight-targets'), log: r('#fight-log'), btns: r('#fight-btns') };
  })()`)));
  await shot('fight_2enemy_desktop', 1280, 800, false);
  ws.close(); chrome.kill();
}
main();
