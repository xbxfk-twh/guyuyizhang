/* 验证物品图标在各面板里的尺寸（玩家反馈"大面具糊脸"） */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_icon_shots');
const PORT = 9425;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_ico_' + process.pid);
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
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (me, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => (m.error ? rej(new Error(me + ':' + JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method: me, params: p || {} })); });
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 250) }; return r.result && r.result.value; };

  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2800);
  await ev(`(async () => {
    const clk = s => { const e = document.querySelector(s); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(1600);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(250); }
    const S = Game.S(); S.tut = null; S.buildings.watch = 3;
    // 给一堆物品，让各面板都有图标
    ['diveMask','pickStone','axeSteel','ironSword','ironArmor','basket','pistol','bullet','relic','slate','dragonbone'].forEach(x => Game.addItem(x, 1, true));
    return 1;
  })()`);

  const SIZES = `(() => {
    const out = [];
    document.querySelectorAll('#modal img.item-icon').forEach(img => {
      const r = img.getBoundingClientRect();
      out.push({ w: Math.round(r.width), h: Math.round(r.height), src: img.getAttribute('src').split('/').pop() });
    });
    const vw = window.innerWidth, vh = window.innerHeight;
    return { count: out.length, maxW: Math.max(0, ...out.map(x => x.w)), maxH: Math.max(0, ...out.map(x => x.h)), over: out.filter(x => x.w > 64 || x.h > 64), vw, vh };
  })()`;

  // ① 装备·工具栏
  await ev(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); document.querySelector('#nav [data-nav="equip"]').click(); await w(600);
    const tab = [...document.querySelectorAll('#modal [data-equiptab]')].find(b => /工具栏/.test(b.textContent)); if (tab) { tab.click(); await w(600); } return 1; })()`);
  let r = await ev(SIZES);
  console.log('① 装备·工具栏: ' + r.count + ' 个图标, 最大 ' + r.maxW + 'x' + r.maxH);
  ck('工具栏图标不超过 64px', r.over.length === 0, r.over.length ? JSON.stringify(r.over.slice(0,2)) : '都正常');
  await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'equip_tools.png'), Buffer.from(x.data, 'base64')));

  // ② 背包
  await ev(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); document.querySelector('#nav [data-nav="inv"]').click(); await w(700); return 1; })()`);
  r = await ev(SIZES);
  console.log('② 背包: ' + r.count + ' 个图标, 最大 ' + r.maxW + 'x' + r.maxH);
  ck('背包图标不超过 64px', r.over.length === 0, r.over.length ? JSON.stringify(r.over.slice(0,2)) : '都正常');

  // ③ 图鉴
  await ev(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); closeModal && closeModal(); await w(300);
    const sb = document.querySelector('#btn-set'); if (sb) { sb.click(); await w(400); }
    const btn = document.querySelector('#modal [data-open="collection"]');
    if (btn) btn.click(); else { const c = [...document.querySelectorAll('#modal button')].find(b => /图鉴/.test(b.textContent)); if (c) c.click(); }
    await w(800); return 1; })()`);
  r = await ev(SIZES);
  console.log('③ 图鉴: ' + r.count + ' 个图标, 最大 ' + r.maxW + 'x' + r.maxH);
  ck('图鉴图标不超过 64px', r.over.length === 0, r.over.length ? JSON.stringify(r.over.slice(0,2)) : '都正常');
  await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'codex.png'), Buffer.from(x.data, 'base64')));

  // ④ 物品详情
  await ev(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); closeModal && closeModal(); await w(300);
    document.querySelector('#nav [data-nav="inv"]').click(); await w(700);
    const it = document.querySelector('#modal [data-item]'); if (it) { it.click(); await w(600); } return 1; })()`);
  r = await ev(SIZES);
  console.log('④ 物品详情: ' + r.count + ' 个图标, 最大 ' + r.maxW + 'x' + r.maxH);
  ck('物品详情图标不超过 64px', r.over.length === 0, r.over.length ? JSON.stringify(r.over.slice(0,2)) : '都正常');
  await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'itemdetail.png'), Buffer.from(x.data, 'base64')));

  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('');
  console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  console.log('截图 → ' + OUT);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
