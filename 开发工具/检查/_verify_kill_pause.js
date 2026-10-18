/* 最后一击的"停一秒"要停在**结算之后**（作者 2026-09-25：
   "最后一击之后战斗不是会停一秒吗，改成结算伤害后再停啊（对面血量应该显示 0）"）

   以前：attack() 先把 ehp<=0 的怪从 C.enemies 里滤掉，再 endFight → onFight('end')，
        而 UI 的 'end' 分支**不重画血条**，所以这一秒停的是"扣血前"的画面（看着像打空了）。
   现在：game.js 留一份 finalEnemies（含刚被打倒、ehp 已为 0 的）交给 UI，
        UI 先 paintTargetRows(最终名单) 再开始停这一秒。
   本探针打一只 1 血的怪，在**那一秒之内**读血条文字，必须已经是 0；一秒后窗口才关。 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = process.env.GUYU_GAME_ROOT || 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_out', 'killpause');
const PORT = 9507;
const PROFILE = path.join(os.tmpdir(), 'guyu_kill_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });
let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };

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

  for (const s of [{ n: '桌面', w: 1280, h: 720, mobile: false }, { n: '手机横屏', w: 844, h: 390, mobile: true }]) {
    await send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 1, mobile: !!s.mobile });
    await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
    await sleep(2800);
    const boot = await ev(`(async () => {
      const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
      const w = ms => new Promise(r => setTimeout(r, ms));
      for (let step = 0; step < 12 && !Game.S(); step++) {
        const cf = [...document.querySelectorAll('#modal [data-choice], #modal .modal-actions button')].find(x => /开始新游戏/.test(x.textContent));
        if (cf) { cf.click(); await w(700); continue; }
        if (!document.querySelector('.identity')) { clk('#btn-new'); await w(700); continue; }
        document.querySelector('.identity').click(); await w(700);
      }
      for (let i = 0; i < 10; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
      return Game.S() ? 'ok' : 'no-state';
    })()`);
    console.log('\n【' + s.n + ' ' + s.w + 'x' + s.h + '】开局：' + boot);
    if (boot !== 'ok') { ck(s.n + '：能开局', false, String(boot)); continue; }

    // 打一只 1 血的怪，击杀后**立刻**读血条（窗口还要再停一秒才关）
    const r = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const S = Game.S(); S.tut = null;
      Game.startFight(ENEMIES.boar, true); await w(500);
      const C = Game.S().combat; if (!C) return { __err: '没进战斗' };
      C.enemies[0].ehp = 1; C.ehp = 1;      // 保证一击必杀
      const 攻击前血条 = [...document.querySelectorAll('#fight-targets .tg-hp')].map(x => x.textContent.trim());
      let 回合 = 0;
      for (let i = 0; i < 8 && Game.S().combat; i++) { Game.fightAction('attack'); 回合++; if (!Game.S().combat) break; await w(150); }
      const 击杀 = !Game.S().combat;
      // ⚠️ 这里必须**立刻**读（不 await 任何东西）：UI 的 'end' 分支只停 1 秒
      const 停顿时血条 = [...document.querySelectorAll('#fight-targets .tg-hp')].map(x => x.textContent.trim());
      const 停顿名单 = [...document.querySelectorAll('#fight-targets .hp-line.target')].map(x => x.textContent.replace(/\\s+/g, ' ').trim());
      const 攻击键禁用 = !!document.querySelector('#fight-btns.over');
      const 窗口还开着 = !!document.querySelector('#modal.open');
      await w(1500);
      // 满包时战斗结束后会显示代收说明，只检查战斗本身是否已退出。
      const 一秒后窗口还开着 = !!document.querySelector('#modal.open #fight-btns');
      return { 攻击前血条, 击杀, 回合, 停顿时血条, 停顿名单, 攻击键禁用, 窗口还开着, 一秒后窗口还开着 };
    })()`);
    console.log('  ' + JSON.stringify(r));
    if (r.__err) { ck(s.n + '：能打一场并击杀', false, JSON.stringify(r)); continue; }
    ck(s.n + '：确实打死了（一次或几次攻击内）', r.击杀 === true, '用了 ' + r.回合 + ' 次攻击');
    ck(s.n + '：★ 停的那一秒里，对面血量显示 0（不再是扣血前的数值）',
       (r.停顿时血条 || []).length >= 1 && (r.停顿时血条 || []).every(t => /^0\//.test(t)),
       '攻击前 ' + JSON.stringify(r.攻击前血条) + ' → 停顿时 ' + JSON.stringify(r.停顿时血条));
    ck(s.n + '：停顿期间窗口还开着、攻击键已禁用（先看清结果再收窗口）',
       r.窗口还开着 === true && r.攻击键禁用 === true, JSON.stringify({ 窗口: r.窗口还开着, 禁用: r.攻击键禁用 }));
    ck(s.n + '：一秒之后战斗窗口才关掉', r.一秒后窗口还开着 === false);
    await shot('kill_' + s.w + '.png');
  }

  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');
  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('\n通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
