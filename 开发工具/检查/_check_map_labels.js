/* 检查地图热点标签是否互相重叠（多尺寸） */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const PORT = 9377;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_ov_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });

(async () => {
  const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=1600,900', 'about:blank'], { stdio: 'ignore' });
  let t = null;
  for (let i = 0; i < 60 && !t; i++) { await sleep(250); try { t = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(x => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (me, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => (m.error ? rej(new Error(me + ':' + JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method: me, params: p || {} })); });
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 200) }; return r.result && r.result.value; };

  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2600);
  await ev(`(async () => {
    const clk = s => { const e = document.querySelector(s); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(1400);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
    const S = Game.S(); S.tut = null; S.buildings.watch = 3; S.stats.stamina = 99999;
    document.querySelector('#nav [data-nav="map"]').click(); await w(1200);
    return 1;
  })()`);

  for (const [W, H] of [[1600, 900], [1280, 720], [890, 830], [872, 733], [1024, 640]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await sleep(400);
    await ev('window.dispatchEvent(new Event("resize"))');
    await sleep(800);
    const r = await ev(`(() => {
      const wr = document.querySelector('#map-wrap').getBoundingClientRect();
      const labs = [];
      document.querySelectorAll('#map-arrows .map-arrow').forEach(a => {
        if (getComputedStyle(a).display === 'none') return;
        const lr = (a.querySelector('.arrow-label') || a).getBoundingClientRect();
        labs.push({ t: ((a.querySelector('.arrow-label') || {}).textContent || '').replace(/[●▼]/g, '').replace(/· 你在这里/, '').trim().slice(0, 4),
          l: lr.left - wr.left, r: lr.right - wr.left, tp: lr.top - wr.top, b: lr.bottom - wr.top });
      });
      const hits = [];
      for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) {
        const A = labs[i], B = labs[j];
        const ox = Math.min(A.r, B.r) - Math.max(A.l, B.l), oy = Math.min(A.b, B.b) - Math.max(A.tp, B.tp);
        if (ox > 6 && oy > 3) hits.push(A.t + '×' + B.t + '(' + Math.round(ox) + 'x' + Math.round(oy) + ')');
      }
      return { n: labs.length, hits };
    })()`);
    console.log('  ' + (W + 'x' + H).padEnd(11) + '可见标签 ' + r.n + ' 个   重叠: ' + (r.hits.length ? r.hits.join('  ') : '无 ✅'));
  }

  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
