/* 探针：亚克兰蒂斯（图二）大地图为什么显得小 / 能不能上下滑
   用法：node _debug_atlmap.js  */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const PORT = 9361;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_atlmap_' + process.pid);
const OUT = path.join(__dirname, '_atlmap_out');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = url => new Promise((resolve, reject) => {
  http.get(url, res => { let b = ''; res.on('data', c => (b += c)); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }).on('error', reject);
});

const MEASURE = `(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const res = {};
  const measure = (label) => {
    const w = document.querySelector('#map-wrap');
    const img = document.querySelector('#map-img');
    const layer = document.querySelector('#map-arrows');
    if (!w || !img) return null;
    const wr = w.getBoundingClientRect(), b = img.getBoundingClientRect();
    const cs = getComputedStyle(img);
    return {
      label,
      stage: Math.round(wr.width) + 'x' + Math.round(wr.height),
      img: Math.round(b.width) + 'x' + Math.round(b.height),
      natural: img.naturalWidth + 'x' + img.naturalHeight,
      fit: cs.objectFit,
      cls: img.className,
      src: (img.getAttribute('src') || '').split('/').pop(),
      inline: [img.style.left, img.style.top, img.style.width, img.style.height].join(','),
      // 四边留白：>0 就是露出黑边（没铺满）
      gaps: [Math.round(b.left - wr.left), Math.round(b.top - wr.top), Math.round(wr.right - b.right), Math.round(wr.bottom - b.bottom)],
      layer: layer ? Math.round(layer.getBoundingClientRect().height) : null,
    };
  };
  const S = Game.S();
  // 先进孤岛地图看一眼（图一）
  S.scene = 'camp'; S.zone = null; UI.render();
  const h0 = document.querySelector('#map-arrows .map-arrow.here'); if (h0) h0.click();
  UI.render();
  document.querySelector('#nav [data-nav="map"]').click(); await wait(1300);
  res.island = measure('孤岛');
  // 海底的"场景视图"（亚特兰蒂斯这一格本身就是拿大地图当背景的）
  const measureScene = (label) => {
    const w = document.querySelector('#scene-wrap');
    const img = document.querySelector('#scene-img');
    if (!w || !img) return null;
    const wr = w.getBoundingClientRect(), b = img.getBoundingClientRect();
    const cs = getComputedStyle(img);
    return { label, stage: Math.round(wr.width) + 'x' + Math.round(wr.height), img: Math.round(b.width) + 'x' + Math.round(b.height),
      natural: img.naturalWidth + 'x' + img.naturalHeight, fit: cs.objectFit, src: (img.getAttribute('src') || '').split('/').pop(),
      gaps: [Math.round(b.left - wr.left), Math.round(b.top - wr.top), Math.round(wr.right - b.right), Math.round(wr.bottom - b.bottom)] };
  };
  S.scene = 'atlantis'; S.zone = null; S.world = 'atlantis'; UI.render(); await wait(1200);
  res.atlScene = measureScene('海底场景');
  S.zone = 'coral'; UI.render(); await wait(800);
  res.atlZoneScene = measureScene('海底区域场景');
  // 再进海底地图（图二）
  document.querySelector('#nav [data-nav="map"]').click(); await wait(1200);
  S.scene = 'atlantis'; S.zone = 'coral'; S.world = 'atlantis';
  UI.render(); await wait(1600);
  res.atlantis = measure('海底');
  // 试上下拖：拖完看还能不能动（可拖范围）
  const wrap = document.querySelector('#map-wrap');
  const r = wrap.getBoundingClientRect();
  const ev = (t, y) => new PointerEvent(t, { bubbles: true, clientX: r.left + 60, clientY: y, pointerId: 1 });
  const before = document.querySelector('#map-img').getBoundingClientRect().top;
  wrap.dispatchEvent(ev('pointerdown', r.top + 200));
  wrap.dispatchEvent(ev('pointermove', r.top + 260));
  wrap.dispatchEvent(ev('pointermove', r.top + 340));
  wrap.dispatchEvent(ev('pointerup', r.top + 340));
  await wait(300);
  res.atlDrag = Math.round(document.querySelector('#map-img').getBoundingClientRect().top - before);
  return res;
})()`;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=2340,1080', 'about:blank'], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(t => t.type === 'page'); } catch (e) {} }
  if (!target) { chrome.kill(); throw new Error('Chrome 没起来'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params) => new Promise((res, rej) => { const i = ++id; pending.set(i, m => (m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const evaluate = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result && r.result.value; };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2500);
  await evaluate(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
    clk('#btn-new'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(1200);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close, #modal .modal-x'); if (!b) break; b.click(); await wait(200); }
    const S = Game.S(); S.tut = null; S.buildings.watch = 3; S.buildings.dock = 5;
    return 1;
  })()`);
  for (const [label, w, h] of [['wide', 2340, 1080], ['desktop', 1280, 800], ['phone_land', 844, 390]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    await sleep(400);
    const res = await evaluate(MEASURE);
    console.log('\\n== ' + label + ' ' + w + 'x' + h + ' ==');
    for (const k of ['island', 'atlScene', 'atlZoneScene', 'atlantis']) {
      const m = res[k]; if (!m) { console.log(' ' + k + ': 没量到'); continue; }
      const blank = m.gaps.some(v => v > 1);
      console.log('  ' + k.padEnd(12) + ' 舞台 ' + m.stage.padEnd(10) + ' 图 ' + m.img.padEnd(10) + ' 原图 ' + m.natural +
        ' fit=' + m.fit + ' src=' + m.src + ' 留白=' + JSON.stringify(m.gaps) + (blank ? ' ★没铺满' : ' 铺满') + (m.cls ? ' cls=' + m.cls : ''));
    }
    console.log('  海底上下拖动位移: ' + res.atlDrag + 'px');
  }
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, 'atl_map_phone.png'), Buffer.from(shot.data, 'base64'));
  console.log('shot ' + path.join(OUT, 'atl_map_phone.png'));
  ws.close(); chrome.kill();
}
main();
