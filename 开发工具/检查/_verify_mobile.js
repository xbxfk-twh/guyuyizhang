/* 手机尺寸复核：邮箱按钮位置 + 地图"必须拖着看" */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_out', 'mobile');
const PORT = 9471;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_mob_' + process.pid);
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
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 250) }; return r.result && r.result.value; };

  // 常见手机横屏尺寸
  const SIZES = [
    { n: 'iPhone 横屏', w: 844, h: 390 },
    { n: '小屏机横屏', w: 667, h: 375 },
    { n: '平板横屏', w: 1024, h: 768 },
  ];
  for (const s of SIZES) {
    await send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
    await sleep(2500);
    await ev(`(async () => {
      const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
      const w = ms => new Promise(r => setTimeout(r, ms));
      clk('#btn-new'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(1400);
      for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
      const S = Game.S(); if (S) { S.tut = null; S.buildings.watch = 3; S.stats.stamina = 99999; }
      return 1;
    })()`);
    const r = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const tb = document.querySelector('#topbar').getBoundingClientRect();
      const mb = document.querySelector('#btn-mail');
      const m = mb ? mb.getBoundingClientRect() : null;
      // 进地图看能看到几个热点
      const nav = document.querySelector('#nav [data-nav="map"]'); if (nav) nav.click();
      await w(1200);
      const wr = document.querySelector('#map-wrap').getBoundingClientRect();
      const ir = document.querySelector('#map-img').getBoundingClientRect();
      const arrows = [...document.querySelectorAll('#map-arrows .map-arrow')];
      const inView = arrows.filter(a => { const q = a.getBoundingClientRect(); return q.bottom > wr.top && q.top < wr.bottom && q.right > wr.left && q.left < wr.right; }).length;
      return {
        顶栏: { 右: Math.round(tb.right), 高: Math.round(tb.height) },
        邮箱: m ? { 左: Math.round(m.left), 右: Math.round(m.right), 宽: Math.round(m.width), 距顶栏右: Math.round(tb.right - m.right), 可见: m.right <= tb.right + 1 && m.left >= tb.left - 1 } : null,
        视口: Math.round(wr.width) + 'x' + Math.round(wr.height),
        地图: Math.round(ir.width) + 'x' + Math.round(ir.height),
        热点: arrows.length, 能看到的: inView,
      };
    })()`);
    console.log('\n【' + s.n + ' ' + s.w + 'x' + s.h + '】');
    console.log('   ' + JSON.stringify(r.邮箱));
    console.log('   视口 ' + r.视口 + '  地图 ' + r.地图 + '  视口内热点 ' + r.能看到的 + '/' + r.热点);
    ck(s.n + '：邮箱按钮完整贴在顶栏最右上', !!(r.邮箱 && r.邮箱.可见 && r.邮箱.距顶栏右 <= 14), r.邮箱 ? '距右 ' + r.邮箱.距顶栏右 + 'px' : '没找到');
    ck(s.n + '：地图大于视口，看不到全部热点（要拖）', r.能看到的 < r.热点 || (parseInt(r.地图) > parseInt(r.视口)), r.能看到的 + '/' + r.热点);
    await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'mob_' + s.w + '.png'), Buffer.from(x.data, 'base64')));
  }
  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');
  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('\n通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
})();
