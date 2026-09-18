/* 验证：热点完全锁定在地图上（随图移动、无独立位移、无突然消失） */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const PORT = 9411;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_lock_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });

let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };

(async () => {
  const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=932,430', 'about:blank'], { stdio: 'ignore' });
  let t = null;
  for (let i = 0; i < 60 && !t; i++) { await sleep(250); try { t = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(x => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (me, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => (m.error ? rej(new Error(me + ':' + JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method: me, params: p || {} })); });
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) }; return r.result && r.result.value; };

  await send('Emulation.setDeviceMetricsOverride', { width: 932, height: 430, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2800);
  await ev(`(async () => {
    const clk = s => { const e = document.querySelector(s); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(1600);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(250); }
    const S = Game.S(); S.tut = null; S.buildings.watch = 3; S.stats.stamina = 99999;
    document.querySelector('#nav [data-nav="map"]').click(); await w(1500);
    return 1;
  })()`);

  const SNAP = `(() => {
    const wrap = document.querySelector('#map-wrap');
    const wr = wrap.getBoundingClientRect();
    const img = document.querySelector('#map-img');
    const ir = img.getBoundingClientRect();
    const rows = {};
    document.querySelectorAll('#map-arrows .map-arrow').forEach(a => {
      const lab = (a.querySelector('.arrow-label') || {}).textContent || '';
      const key = lab.replace(/[●▼]/g,'').replace(/· 你在这里/,'').trim().slice(0,4);
      const r = a.getBoundingClientRect();
      rows[key] = {
        disp: getComputedStyle(a).display,
        // 相对"地图图片"的绝对百分比位置（这个必须恒定，才叫锁定在地图上）
        relX: +(((r.left + r.width / 2) - ir.left) / ir.width * 100).toFixed(2),
        relY: +((r.bottom - ir.top) / ir.height * 100).toFixed(2),
        // 相对"视口"的位置（随图移动而变化）
        vpY: Math.round(r.bottom - wr.top),
        ml: a.style.marginLeft || '0px',
        cls: a.className
      };
    });
    return { imgTop: Math.round(ir.top - wr.top), rows };
  })()`;

  const s0 = await ev(SNAP);
  console.log('初始：地图顶 ' + s0.imgTop + 'px，热点 ' + Object.keys(s0.rows).length + ' 个');
  ck('所有热点都可见（没有任何"突然隐藏"）',
     Object.values(s0.rows).every(r => r.disp !== 'none'),
     Object.entries(s0.rows).filter(([k, r]) => r.disp === 'none').map(([k]) => k).join(',') || '全部可见');
  ck('没有任何热点带独立位移（marginLeft 全为 0）',
     Object.values(s0.rows).every(r => r.ml === '0px'),
     [...new Set(Object.values(s0.rows).map(r => r.ml))].join(','));

  // 拖动地图，然后对比每个热点"相对地图"的位置是否恒定
  const b = await ev(`(() => { const r = document.querySelector('#map-wrap').getBoundingClientRect(); return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.8 }; })()`);
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: b.y, id: 1 }] });
  for (let i = 1; i <= 10; i++) { await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: b.x, y: b.y - 15 * i, id: 1 }] }); await sleep(35); }
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(700);
  const s1 = await ev(SNAP);
  console.log('');
  console.log('拖动后：地图顶 ' + s1.imgTop + 'px（移动了 ' + (s1.imgTop - s0.imgTop) + 'px）');
  ck('地图确实被拖动了', s1.imgTop !== s0.imgTop, s0.imgTop + ' → ' + s1.imgTop);

  // 核心断言：相对地图的位置必须完全不变
  let maxDrift = 0; const drifters = [];
  for (const k of Object.keys(s0.rows)) {
    if (!s1.rows[k]) continue;
    const dx = Math.abs(s1.rows[k].relX - s0.rows[k].relX);
    const dy = Math.abs(s1.rows[k].relY - s0.rows[k].relY);
    const d = Math.max(dx, dy);
    if (d > maxDrift) maxDrift = d;
    if (d > 0.6) drifters.push(k + '(' + d.toFixed(1) + '%)');
  }
  ck('★ 热点相对地图的位置完全不变（真·锁定在地图上）', maxDrift <= 0.6,
     '最大漂移 ' + maxDrift.toFixed(2) + '%' + (drifters.length ? '  漂移:' + drifters.join(',') : ''));
  // 相对视口的位置必须跟着地图一起动
  const movedInVp = Object.keys(s0.rows).filter(k => s1.rows[k] && s1.rows[k].vpY !== s0.rows[k].vpY);
  ck('热点在视口里的位置跟着地图一起移动', movedInVp.length > 0, movedInVp.length + ' 个热点随图移动');
  ck('拖动后依然没有任何热点被隐藏', Object.values(s1.rows).every(r => r.disp !== 'none'),
     Object.entries(s1.rows).filter(([k, r]) => r.disp === 'none').map(([k]) => k).join(',') || '全部可见');

  // 贴顶翻转：只在"热点锚点正好贴到画面顶边"时才有意义（已经滑出去的不用翻）。
  // 往【上】拖 62px，把山顶从 y=82 顶到约 20px（贴边），再检查方向是否翻转。
  {
    const bb = await ev(`(() => { const r = document.querySelector('#map-wrap').getBoundingClientRect(); return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.9 }; })()`);
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bb.x, y: bb.y, id: 1 }] });
    for (let i = 1; i <= 8; i++) { await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: bb.x, y: bb.y + 8 * i, id: 1 }] }); await sleep(30); }
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(600);
  }
  const s2 = await ev(SNAP);
  const pk = s2.rows['山顶'];
  ck('贴到画面顶边时箭头方向翻转（箭头在上、标签在下，不会被切）',
     pk && pk.cls.indexOf('arrow-below') >= 0, pk ? '视口 y=' + pk.vpY + '  class=' + pk.cls : '没找到');
  ck('翻转不改锚点位置（相对地图仍是 25%,14%）',
     pk && Math.abs(pk.relX - 25) < 0.6 && Math.abs(pk.relY - 14) < 0.6, pk ? pk.relX + '%,' + pk.relY + '%' : '');

  console.log('');
  console.log('  样品（山顶）: 相对地图 ' + s0.rows['山顶'].relX + '%,' + s0.rows['山顶'].relY + '% → ' + s1.rows['山顶'].relX + '%,' + s1.rows['山顶'].relY + '%');
  console.log('  样品（山顶）视口 y: ' + s0.rows['山顶'].vpY + ' → ' + s1.rows['山顶'].vpY);

  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('');
  console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  if (bad.length) { console.log('失败项：'); bad.forEach(x => console.log(' - ' + x)); }
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
