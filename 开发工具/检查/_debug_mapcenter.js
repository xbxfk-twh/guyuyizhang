/* 探针：进地图自动居中到"当前所在地"，并且不许突破地图边界（不出现黑边）。
   用法：node _debug_mapcenter.js
   对每个场景：回到场景视图 → 点"地图" → 量 锚点偏移 / 是否在画面里 / 地图是否仍盖满舞台。 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const PORT = 9351;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_mapcenter_' + process.pid);
const OUT = path.join(__dirname, '_out', 'mapcenter');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = url => new Promise((resolve, reject) => {
  http.get(url, res => { let b = ''; res.on('data', c => (b += c)); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }).on('error', reject);
});

const MEASURE = `(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = [];
  const scenes = Object.keys(MAP_ARROWS);
  for (const sc of scenes) {
    const S = Game.S(); if (!S) break;
    S.scene = sc; S.zone = null;
    UI.render();
    const here0 = document.querySelector('#map-arrows .map-arrow.here');
    if (here0) { here0.click(); await wait(60); }      // 回场景视图（保证"进地图"这一步真的是从场景进）
    UI.render();
    const navBtn = document.querySelector('#nav [data-nav="map"]') || document.querySelector('#btn-backmap');
    if (navBtn) { navBtn.click(); await wait(1300); }   // ⚠️ 进图有 1 秒的 map-in 缩放动画，量之前要等它跑完
    const wrap = document.querySelector('#map-wrap');
    const img = document.querySelector('#map-img');
    const here = document.querySelector('#map-arrows .map-arrow.here');
    if (!wrap || !img || !here) { out.push({ scene: sc, fail: '找不到舞台/箭头' }); continue; }
    const layer = document.querySelector('#map-arrows');
    const w = wrap.getBoundingClientRect(), b = img.getBoundingClientRect();
    const h = here.getBoundingClientRect();
    const lr = layer.getBoundingClientRect();
    const ax = h.left + h.width / 2, ay = h.bottom;      // 锚点 = 箭头元素底边中点（transform: translate(-50%,-100%)）
    out.push({
      scene: sc,
      pct: [here.dataset.pctL, here.dataset.pctT],
      dx: Math.round(ax - (w.left + w.width / 2)),       // 离画面中心还有多远（0 = 正好居中）
      dy: Math.round(ay - (w.top + w.height / 2)),
      inView: ax > w.left + 2 && ax < w.right - 2 && ay > w.top + 2 && ay < w.bottom - 2,
      // cover：图片左/上边有没有落在舞台内(>0 就是露出黑边)，右/下边有没有盖过舞台(>0 就是露出黑边)
      cover: [Math.round(b.left - w.left), Math.round(b.top - w.top), Math.round(w.right - b.right), Math.round(w.bottom - b.bottom)],
      layer: [Math.round(lr.left - w.left), Math.round(lr.top - w.top), Math.round(lr.width), Math.round(lr.height)],
      imgBox: [Math.round(b.left - w.left), Math.round(b.top - w.top), Math.round(b.width), Math.round(b.height)],
      nat: [img.naturalWidth, img.naturalHeight],
      stageW: Math.round(w.width), stageH: Math.round(w.height),
    });
  }
  return out;
})()`;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE,
    '--window-size=1280,800', 'about:blank',
  ], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try { target = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(t => t.type === 'page'); } catch (e) {}
  }
  if (!target) { chrome.kill(); throw new Error('Chrome 没起来'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params) => new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, m => (m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result)));
    ws.send(JSON.stringify({ id: i, method, params: params || {} }));
  });
  const evaluate = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
    return r.result && r.result.value;
  };
  const shot = async (name, w, h) => {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    await sleep(600);
    const r = await send('Page.captureScreenshot', { format: 'png' });
    const f = path.join(OUT, name + '.png');
    fs.writeFileSync(f, Buffer.from(r.data, 'base64'));
    console.log('shot ' + f);
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2500);
  await evaluate(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
    clk('#btn-new'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(1200);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close, #modal .modal-x'); if (!b) break; b.click(); await wait(200); }
    const S = Game.S();
    S.tut = null; S.buildings.watch = 3; S.buildings.dock = 5;   // 瞭望台+船坞拉满：所有场景都解锁（不然点到锁住的箭头不会切视图）
    S.inv.bow = 1; S.inv.arrow = 20;
    return 1;
  })()`);
  for (const [label, w, h] of [['desktop', 1280, 800], ['phone_land', 844, 390], ['wide', 2340, 1080]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    await sleep(500);
    await evaluate('window.dispatchEvent(new Event("resize"))');
    await sleep(300);
    const rows = await evaluate(MEASURE);
    console.log('\n== ' + label + ' ' + w + 'x' + h + ' ==');
    for (const r of rows) {
      if (r.fail) { console.log('  ' + r.scene + '  ' + r.fail); continue; }
      // 新规则：宽度必须等于屏幕宽度（左右不能有留白、也不能超出），上下允许有留白/超出
      const widthOK = Math.abs(r.cover[0]) <= 1 && Math.abs(r.cover[2]) <= 1;
      console.log('  ' + (r.scene + '        ').slice(0, 12) + ' 离中心 ' + String(r.dx).padStart(5) + ',' + String(r.dy).padStart(5) +
        '  在画面内 ' + (r.inView ? '是' : '否!!') + '  宽度贴合 ' + (widthOK ? '是' : '否!! ' + JSON.stringify(r.cover)) +
        '  pct=' + r.pct.join(',') + ' 层=' + r.layer.join(',') + ' 图=' + r.imgBox.join(',') + ' 原图=' + r.nat.join('x') + ' 舞台=' + r.stageW + 'x' + r.stageH);
    }
  }
  // 截图：营地进地图
  await evaluate(`(async () => { const S = Game.S(); S.scene = 'camp'; UI.render(); const h = document.querySelector('#map-arrows .map-arrow.here'); if (h) h.click(); UI.render(); document.querySelector('#nav [data-nav="map"]').click(); return 1; })()`);
  await shot('map_center_camp', 1280, 800);
  // 拖动之后不许再抢镜头：拖一下 → 再 render 几次，位置必须保持不变
  const drag = await evaluate(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    await wait(1300);
    const wrap = document.querySelector('#map-wrap');
    const r = wrap.getBoundingClientRect();
    const ev = (t, y) => new PointerEvent(t, { bubbles: true, clientX: r.left + 60, clientY: y, pointerId: 1 });
    const before = document.querySelector('#map-img').getBoundingClientRect().top;
    wrap.dispatchEvent(ev('pointerdown', r.top + 300));
    wrap.dispatchEvent(ev('pointermove', r.top + 360));
    wrap.dispatchEvent(ev('pointermove', r.top + 420));
    wrap.dispatchEvent(ev('pointerup', r.top + 420));
    await wait(200);
    const afterDrag = document.querySelector('#map-img').getBoundingClientRect().top;
    UI.render(); UI.render();                       // 再渲染两次（等于游戏里各种刷新）
    await wait(200);
    const afterRender = document.querySelector('#map-img').getBoundingClientRect().top;
    const overflow = Math.round(document.querySelector('#map-arrows').getBoundingClientRect().height - r.height);
    return { moved: Math.round(afterDrag - before), kept: Math.round(afterRender - afterDrag), overflow };
  })()`);
  // 新规则（宽度=屏幕宽）下：图比舞台高才有得拖；高度≈屏幕高时拖不动是正常的
  const dragOK = drag.overflow <= 1 ? true : (drag.moved !== 0 && drag.kept === 0);
  console.log('\n拖动保持 ' + JSON.stringify(drag) + (dragOK
    ? (drag.overflow <= 1 ? '  → 这张图没有纵向余量（高度≈屏幕高），拖不动属正常 ✓' : '  → 拖动生效且不被重渲染抢回 ✓')
    : '  → 有问题!!'));
  ws.close(); chrome.kill();
}
main();
