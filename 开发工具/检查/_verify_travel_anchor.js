/* 精确量：线的两端落点 vs 热点元素的各个可视锚点（标签中心 / 箭头尖 / 整块中心） */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const PORT = 9429;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_t3_' + process.pid);
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
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) }; return r.result && r.result.value; };

  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2800);
  await ev(`(async () => {
    const clk = s => { const e = document.querySelector(s); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(1600);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(250); }
    const S = Game.S(); S.tut = null; S.buildings.watch = 3; S.stats.stamina = 99999;
    return 1;
  })()`);

  // 先在地图上停一下，把每个箭头的"你在这里"状态也摆出来
  await ev(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
    Game.S().scene='camp'; Game.S().zone=null;
    document.querySelector('#nav [data-nav="map"]').click(); await w(1200);
    // 触发去"树林"
    const a = [...document.querySelectorAll('#map-arrows .map-arrow')].find(x => /树林/.test(x.textContent));
    a.click(); await w(700);
    const go = [...document.querySelectorAll('#modal button')].find(b => /前往/.test(b.textContent));
    go.click(); await w(120);
    return 1; })()`);

  const r = await ev(`(() => {
    const wrap = document.querySelector('#map-wrap'); const wr = wrap.getBoundingClientRect();
    const layer = document.querySelector('.travel-layer');
    const line = layer.querySelector('line');
    const lx = parseFloat(layer.style.left)||0, ly = parseFloat(layer.style.top)||0;
    const sx = v => Math.round(v + lx - wr.left), sy = v => Math.round(v + ly - wr.top);
    const info = (a) => {
      const lab = a.querySelector('.arrow-label'), g = a.querySelector('.arrow-glyph');
      const lr = lab.getBoundingClientRect(), gr = g.getBoundingClientRect(), ar = a.getBoundingClientRect();
      return { 名: (lab.textContent||'').replace(/[●▼]/g,'').replace(/· 你在这里/,'').trim().slice(0,6),
        有在这里: /你在这里/.test(lab.textContent),
        cls: a.className,
        标签中心: [Math.round(lr.left - wr.left + lr.width/2), Math.round(lr.top - wr.top + lr.height/2)],
        标签底: [Math.round(lr.left - wr.left + lr.width/2), Math.round(lr.bottom - wr.top)],
        箭头尖: [Math.round(gr.left - wr.left + gr.width/2), Math.round(gr.bottom - wr.top)],
        整块中心: [Math.round(ar.left - wr.left + ar.width/2), Math.round(ar.top - wr.top + ar.height/2)],
        整块底: [Math.round(ar.left - wr.left + ar.width/2), Math.round(ar.bottom - wr.top)] };
    };
    return {
      线: { 起: [sx(+line.getAttribute('x1')), sy(+line.getAttribute('y1'))], 终: [sx(+line.getAttribute('x2')), sy(+line.getAttribute('y2'))] },
      箭头: [...document.querySelectorAll('#map-arrows .map-arrow')].map(info)
    };
  })()`);
  console.log('线起点 ' + JSON.stringify(r.线.起) + '   线终点 ' + JSON.stringify(r.线.终));
  console.log('');
  const dist = (a, b) => Math.round(Math.hypot(a[0]-b[0], a[1]-b[1]));
  for (const a of r.箭头) {
    if (!['营地','树林','山顶','山洞'].includes(a.名)) continue;
    console.log(a.名 + (a.有在这里 ? '（你在这里）' : '') + '  class=' + a.cls);
    console.log('   标签中心 ' + JSON.stringify(a.标签中心) + '  箭头尖 ' + JSON.stringify(a.箭头尖) + '  整块中心 ' + JSON.stringify(a.整块中心) + '  整块底 ' + JSON.stringify(a.整块底));
    console.log('   到线起点 ' + dist(a.整块中心, r.线.起) + 'px   到线终点 ' + dist(a.整块中心, r.线.终) + 'px');
  }

  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
