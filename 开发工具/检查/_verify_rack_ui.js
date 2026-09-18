/* 浏览器里验证晾肉架界面（用 DOM 选择器判断，不靠长文本匹配） */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_rack_shots');
const PORT = 9419;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_rack2_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });

let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };

// 打开制造 → 切加工台 → 返回该 tab 的晾晒行信息
const ROW = `(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  document.querySelector('#nav [data-nav="craft"]').click(); await w(700);
  const tab = [...document.querySelectorAll('#modal [data-station]')].find(x => /加工台/.test(x.textContent));
  if (!tab) return { err: '没有加工台 tab' };
  tab.click(); await w(800);
  const btn = document.querySelector('#modal [data-dry]');
  const rows = [...document.querySelectorAll('#modal .recipe-row')].map(r => r.textContent.replace(/\\s+/g,' ').trim());
  return {
    hasDryBtn: !!btn,
    dryBtnText: btn ? btn.textContent.trim() : null,
    dryBtnDisabled: btn ? btn.classList.contains('lockedb') : null,
    rows,
    dry: Game.dryOf('rack'), left: Game.dryLeftMin('rack'), fmt: Game.fmtLeft(Game.dryLeftMin('rack'))
  };
})()`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=1600,900', 'about:blank'], { stdio: 'ignore' });
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
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) }; return r.result && r.result.value; };

  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2800);
  await ev(`(async () => {
    const clk = s => { const e = document.querySelector(s); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(1600);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(250); }
    const S = Game.S(); S.tut = null; S.buildings.watch = 3; S.furniture.rack = 1;
    S.scene = 'camp'; S.stats.stamina = 9999; S.inv = {}; Game.addItem('meat', 5, true);
    return 1;
  })()`);

  console.log('A) 空架子状态');
  let r = await ev(ROW);
  console.log('   rows: ' + JSON.stringify(r.rows));
  ck('空架子时提示"挂一批 30 分钟，晾满 20 小时"', r.rows.some(x => /空着/.test(x) && /20 小时/.test(x)));
  ck('空架子时没有收取按钮', r.hasDryBtn === false);

  console.log('');
  console.log('B) 挂上一批后');
  await ev(`(() => { Game.craft(RECIPES.find(x => x.id === 'r_rackmeat')); return 1; })()`);
  r = await ev(ROW);
  console.log('   rows: ' + JSON.stringify(r.rows));
  console.log('   dry=' + JSON.stringify(r.dry) + ' 剩余=' + r.fmt);
  ck('★ 显示"晾晒中"且带剩余时间', r.rows.some(x => /晾晒中/.test(x) && /20 小时/.test(x)), r.fmt);
  ck('★ 说明了"晾不了别的"', r.rows.some(x => /晾不了别的/.test(x)));
  ck('晾晒中按钮是禁用态', r.hasDryBtn && r.dryBtnDisabled === true, r.dryBtnText);
  ck('没到时间取不到肉干', await ev(`Game.invCount('jerky')`) === 0);
  await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'rack_drying.png'), Buffer.from(x.data, 'base64')));

  console.log('');
  console.log('C) 晾满 20 小时后');
  await ev(`(() => { Game.addMin(1200); return 1; })()`);
  r = await ev(ROW);
  console.log('   rows: ' + JSON.stringify(r.rows));
  ck('★ 显示"晾透了"和可点的"取下来"', r.rows.some(x => /晾透/.test(x)) && r.hasDryBtn && r.dryBtnDisabled === false, r.dryBtnText);
  await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'rack_ready.png'), Buffer.from(x.data, 'base64')));

  console.log('');
  console.log('D) 点「取下来」');
  const taken = await ev(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('#modal [data-dry]').click(); await w(900);
    const tab2 = [...document.querySelectorAll('#modal [data-station]')].find(x => /加工台/.test(x.textContent));
    if (tab2) { tab2.click(); await w(800); }
    return { jerky: Game.invCount('jerky'), 架子: !!Game.dryOf('rack'),
             hasDryBtn: !!document.querySelector('#modal [data-dry]'),
             rows: [...document.querySelectorAll('#modal .recipe-row')].map(r => r.textContent.replace(/\\s+/g,' ').trim()) }; })()`);
  console.log('   ' + JSON.stringify(taken));
  // 作者 2026-09-18：一批从"肉×1 → 肉干×3"改成"肉×2 → 肉干×6"
  ck('★ 拿到了 肉干×4，架子清空，界面回到空架子', taken.jerky === 4 && taken.架子 === false && taken.rows.some(x => /空着/.test(x)));
  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');

  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('');
  console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  if (bad.length) { console.log('失败项：'); bad.forEach(x => console.log(' - ' + x)); }
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  console.log('截图 → ' + OUT);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
