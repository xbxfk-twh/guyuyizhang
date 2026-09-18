/* 用 CDP 真实鼠标事件验证：切到铁匠 → 买一件 → 是否还停在铁匠 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_town_shots');
const PORT = 9451;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_ts_' + process.pid);
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
  // 真实鼠标点击某元素中心
  const clickEl = async (sel) => {
    const box = await ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) }; })()`);
    if (!box) return false;
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
    await sleep(60);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
    return true;
  };

  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/')) + '/index.html' });
  await sleep(2800);
  await ev(`(async () => {
    const clk = s => { const e = document.querySelector(s); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(1600);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(250); }
    const S = Game.S();          // 现取，别用旧引用
    S.tut = null; S.fame = 3; S.inv = { beibi: 99999, coin: 9999 };
    S.scene = 'shore'; S.zone = 'saltTown';
    return 1;
  })()`);
  await sleep(400);
  await ev(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
    const p = Game.pointsOf().find(x => x.type === 'townTrade'); Game.doPoint(p); await w(900); return 1; })()`);

  const tabs = () => ev(`[...document.querySelectorAll('#modal [data-shop]')].map(b => b.dataset.shop + (b.classList.contains('active') ? '*' : ''))`);
  console.log('① 打开集市: ' + JSON.stringify(await tabs()));

  console.log('');
  console.log('② 点「铁匠」摊位');
  ck('找到铁匠 tab 并点到', await clickEl('#modal [data-shop="smith"]'));
  await sleep(700);
  let t1 = await tabs();
  console.log('   ' + JSON.stringify(t1));
  ck('已切到铁匠', t1 && t1.includes('smith*'), JSON.stringify(t1));

  console.log('');
  console.log('③ 在铁匠摊买一件东西');
  const btns = await ev(`[...document.querySelectorAll('#modal [data-tbuy]')].map(b => b.dataset.tbuy)`);
  console.log('   可买: ' + JSON.stringify(btns));
  const first = (btns || []).find(x => x.startsWith('smith:'));
  const itemId = first.split(':')[1];
  const q0 = await ev(`Game.invCount(${JSON.stringify(itemId)})`);
  ck('点到买按钮', await clickEl('#modal [data-tbuy="' + first + '"]'));
  await sleep(900);
  const q1 = await ev(`Game.invCount(${JSON.stringify(itemId)})`);
  let t2 = await tabs();
  console.log('   买 ' + itemId + ': ' + q0 + ' → ' + q1);
  console.log('   买完 tab: ' + JSON.stringify(t2));
  ck('★ 买成功了（说明真的走了购买流程）', q1 > q0, q0 + ' → ' + q1);
  ck('★ 买完仍然停在铁匠（不再跳回杂货商）', t2 && t2.includes('smith*'), JSON.stringify(t2));
  await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'after_buy_smith.png'), Buffer.from(x.data, 'base64')));

  console.log('');
  console.log('④ 情报贩子也试一次');
  if (await clickEl('#modal [data-shop="informant"]')) {
    await sleep(700);
    const t3 = await tabs();
    console.log('   切到情报贩子: ' + JSON.stringify(t3));
    const b3 = (await ev(`[...document.querySelectorAll('#modal [data-tbuy]')].map(b => b.dataset.tbuy)`)).find(x => x.startsWith('informant:'));
    if (b3) {
      const i3 = b3.split(':')[1];
      const p0 = await ev(`Game.invCount(${JSON.stringify(i3)})`);
      await clickEl('#modal [data-tbuy="' + b3 + '"]');
      await sleep(900);
      const p1 = await ev(`Game.invCount(${JSON.stringify(i3)})`);
      const t4 = await tabs();
      console.log('   买 ' + i3 + ': ' + p0 + ' → ' + p1 + '  买完 tab: ' + JSON.stringify(t4));
      ck('★ 情报贩子买完也停在情报贩子', p1 > p0 && t4 && t4.includes('informant*'), JSON.stringify(t4));
    }
  }
  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');

  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('');
  console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
