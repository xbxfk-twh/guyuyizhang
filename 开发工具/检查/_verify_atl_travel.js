/* 亚特兰蒂斯 + 电脑宽屏：旅行动画两端是否精确落在箭头上 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_out', 'atl');
const PORT = 9437;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_atl_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });
let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('    OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('    FAIL ' + l + (e ? '  —— ' + e : '')); } };

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
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) }; return r.result && r.result.value; };

  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2800);
  await ev(`(async () => {
    const clk = s => { const e = document.querySelector(s); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(1600);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(250); }
    const S = Game.S(); S.tut = null; S.buildings.watch = 3; S.stats.stamina = 99999; S.stats.hp = 99999;
    // 解锁亚特兰蒂斯 + 装备潜水三件套
    S.atlantis = S.atlantis || {}; S.atlantis.unlocked = 1; S.atlantis.stoneActive = 1;
    Game.addItem('diveSuit', 1, true); Game.addItem('diveMask', 1, true);
    S.equipment.cloth = 'diveSuit'; S.toolkit = ['diveMask', null, null];
    return 1;
  })()`);

  // 进入亚特兰蒂斯地图
  const enter = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    Game.travel('atlantis'); await w(900);
    document.querySelector('#nav [data-nav="map"]').click(); await w(1200);
    const S = Game.S();
    return { scene: S.scene, zone: S.zone, 箭头数: document.querySelectorAll('#map-arrows .map-arrow').length,
             标签: [...document.querySelectorAll('#map-arrows .map-arrow')].map(a => a.querySelector('.arrow-label').textContent.trim()).join('/') };
  })()`);
  console.log('进入亚特兰蒂斯: ' + JSON.stringify(enter));
  ck('已在亚特兰蒂斯地图上', enter.scene === 'atlantis');

  // 逐对测：从当前区域去每个区域
  const zones = await ev(`(() => [...document.querySelectorAll('#map-arrows .map-arrow')].map(a => ({ zone: a.dataset.zone || null, 标签: a.querySelector('.arrow-label').textContent.trim() })))()`);
  console.log('');
  console.log('地图上的箭头: ' + zones.map(z => z.标签 + '(' + z.zone + ')').join(', '));
  ck('所有区域箭头都带 data-zone', zones.filter(z => z.zone).length >= 5, zones.filter(z => z.zone).length + ' 个');

  const MEASURE = `(() => {
    const wrap = document.querySelector('#map-wrap'); const wr = wrap.getBoundingClientRect();
    const layer = document.querySelector('.travel-layer');
    if (!layer) return { err: '没有行进层' };
    const line = layer.querySelector('line');
    // ⚠️ 不要用 layer.style.left 推算屏幕位置：layer 挂在 #map-arrows 里，
    //    它的定位基准是父元素的内边距盒，父元素自己还有位移 —— 那样算出来会整体偏移
    //    （这正是"行进线偏成那样"的根因）。用 getBoundingClientRect 实测才准。
    const lb = layer.getBoundingClientRect();
    const tip = (attr, key) => {
      const el = document.querySelector('#map-arrows .map-arrow[data-' + attr + '="' + key + '"]');
      if (!el) return null;
      const g = el.querySelector('.arrow-glyph'); const gr = g.getBoundingClientRect();
      const up = (g.textContent||'').indexOf('▲') >= 0;
      return [Math.round(gr.left + gr.width/2), Math.round(up ? gr.top : gr.bottom)];
    };
    return { 线起: [Math.round(lb.left + (+line.getAttribute('x1'))), Math.round(lb.top + (+line.getAttribute('y1')))],
             线终: [Math.round(lb.left + (+line.getAttribute('x2'))), Math.round(lb.top + (+line.getAttribute('y2')))],
             起点区: Game.S().zone };
  })()`;

  // 从 habitat 依次去几个区域
  for (const target of ['shipwreck', 'coralForest', 'trench', 'pearlCave', 'abyss']) {
    const r = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      Game.setZone('habitat'); document.querySelector('#nav [data-nav="map"]').click(); await w(900);
      const a = document.querySelector('#map-arrows .map-arrow[data-zone="${target}"]');
      if (!a) return { err: '找不到 ' + '${target}' };
      a.click(); await w(700);
      const go = [...document.querySelectorAll('#modal button')].find(b => /前往/.test(b.textContent));
      if (!go) return { err: '没有前往按钮' };
      go.click(); await w(140);
      return { ok: 1 };
    })()`);
    if (r.err) { console.log('  [' + target + '] ' + r.err); continue; }
    const mm = await ev(MEASURE);
    const from = await ev(`(() => { const el = document.querySelector('#map-arrows .map-arrow[data-zone="habitat"]'); const g = el.querySelector('.arrow-glyph'); const gr = g.getBoundingClientRect(); const wr = document.querySelector('#map-wrap').getBoundingClientRect(); return [Math.round(gr.left-wr.left+gr.width/2), Math.round(gr.bottom-wr.top)]; })()`);
    const to = await ev(`(() => { const el = document.querySelector('#map-arrows .map-arrow[data-zone="${target}"]'); if(!el) return null; const g = el.querySelector('.arrow-glyph'); const gr = g.getBoundingClientRect(); const wr = document.querySelector('#map-wrap').getBoundingClientRect(); return [Math.round(gr.left-wr.left+gr.width/2), Math.round(gr.bottom-wr.top)]; })()`);
    const d1 = from ? Math.round(Math.hypot(mm.线起[0]-from[0], mm.线起[1]-from[1])) : -1;
    const d2 = to ? Math.round(Math.hypot(mm.线终[0]-to[0], mm.线终[1]-to[1])) : -1;
    console.log('  habitat → ' + target + ': 线起' + JSON.stringify(mm.线起) + ' 珊瑚栖息地尖' + JSON.stringify(from) + ' 偏差' + d1 +
                ' | 线终' + JSON.stringify(mm.线终) + ' 目标尖' + JSON.stringify(to) + ' 偏差' + d2);
    ck('亚特兰蒂斯 habitat→' + target + ' 两端都落在箭头上', d1 >= 0 && d1 < 6 && d2 >= 0 && d2 < 6, '起' + d1 + 'px 终' + d2 + 'px');
    await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'atl_' + target + '.png'), Buffer.from(x.data, 'base64')));
    await sleep(3200);
  }

  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('');
  console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  console.log('截图 → ' + OUT);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
