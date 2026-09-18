/* 浏览器验证：开管理面板 → 时间冻结（顶栏 ⏸），关掉 → 恢复；开营地面板 → 不冻结 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_freeze_shots');
const PORT = 9447;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_fz_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });
let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };
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
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 250) }; return r.result && r.result.value; };

  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/')) + '/index.html' });
  await sleep(2800);
  await ev(`(async () => {
    const clk = s => { const e = document.querySelector(s); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(1600);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(250); }
    Game.S().tut = null; Game.S().stats.stamina = 99999;
    return 1;
  })()`);

  const probe = () => ev(`(() => ({ 冻结: Game.timeFrozen ? Game.timeFrozen() : 'no-api',
      分钟: Game.S().minute, tick: Game.S().tick || 0,
      时间文本: (document.querySelector('#top-time')||{}).textContent || '',
      弹窗: (document.querySelector('#modal')||{}).classList ? document.querySelector('#modal').classList.contains('open') : false }))()`);

  console.log('① 平时（无弹窗）');
  let r = await probe();
  console.log('   ' + JSON.stringify(r));
  ck('平时不冻结', r.冻结 === false, String(r.冻结));

  console.log('');
  console.log('② 打开背包');
  await ev(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); document.querySelector('#nav [data-nav="inv"]').click(); await w(700); return 1; })()`);
  r = await probe();
  console.log('   ' + JSON.stringify(r));
  ck('★ 开背包后时间冻结', r.冻结 === true, String(r.冻结));
  ck('★ 顶栏时间显示 ⏸', /⏸/.test(r.时间文本), JSON.stringify(r.时间文本));
  const t1 = r.minute, tick1 = r.tick;
  await ev(`(() => { Game.addMin(120); return 1; })()`);
  r = await probe();
  ck('★ 冻结中推进 2 小时无效', r.minute === t1 && r.tick === tick1, t1 + '→' + r.minute + ' / tick ' + tick1 + '→' + r.tick);
  await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'frozen_inv.png'), Buffer.from(x.data, 'base64')));

  console.log('');
  console.log('③ 关掉背包');
  await ev(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); const b = document.querySelector('#modal #modal-close'); if (b) b.click(); await w(700); return 1; })()`);
  r = await probe();
  console.log('   ' + JSON.stringify(r));
  ck('★ 关掉后恢复', r.冻结 === false, String(r.冻结));
  ck('★ ⏸ 标记消失', !/⏸/.test(r.时间文本), JSON.stringify(r.时间文本));
  const addRes = await ev(`(() => { const before = Game.S().minute; const ret = Game.addMin(120); return { 返回: ret, 前: before, 后: Game.S().minute, 冻结: Game.timeFrozen() }; })()`);
  console.log('   addMin 细节: ' + JSON.stringify(addRes));
  // 直接读回并用 addMin 自己记录的前值做比较（probe 偶尔返回 undefined，别拿它当基准）
  const afterMin = await ev(`Game.S().minute`);
  const afterText = await ev(`document.querySelector('#top-time').textContent`);
  ck('★ 恢复后推进 2 小时生效',
     addRes && addRes.后 === addRes.前 + 120 && afterMin === addRes.后,
     addRes.前 + ' → ' + afterMin + '（顶栏 ' + afterText + '）');

  console.log('');
  console.log('④ 打开营地面板（该面板里有睡觉/休息，不能冻结）');
  await ev(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); const c = document.querySelector('#modal #modal-close'); if (c) c.click(); await w(400);
    Game.travel('camp'); await w(800); document.querySelector('#nav [data-nav="camp"]').click(); await w(800); return 1; })()`);
  r = await probe();
  console.log('   ' + JSON.stringify(r));
  ck('★ 营地面板不冻结（否则睡觉/休息就用不了）', r.冻结 === false, String(r.冻结));

  console.log('');
  console.log('⑤ 打开装备面板');
  await ev(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); const c = document.querySelector('#modal #modal-close'); if (c) c.click(); await w(400);
    document.querySelector('#nav [data-nav="equip"]').click(); await w(700); return 1; })()`);
  r = await probe();
  ck('★ 装备面板冻结', r.冻结 === true, String(r.冻结));
  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');

  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('');
  console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  console.log('截图 → ' + OUT);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
