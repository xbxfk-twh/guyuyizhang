/* 探针：每个场景的每个热点，会不会被左侧日志栏盖住？
   用法：node _debug_hotspots.js
   对每个场景 × 每种屏幕尺寸：量 .hotspot 的实际矩形 vs #log 的矩形，报重叠了多少像素。 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const PORT = 9383;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_hotspot_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = url => new Promise((resolve, reject) => {
  http.get(url, res => { let b = ''; res.on('data', c => (b += c)); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }).on('error', reject);
});

const MEASURE = `(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = [];
  const scenes = SCENES.map(s => s.id);
  for (const sid of scenes) {
    const sc = Game.sceneOf(sid);
    const zones = sc.zones ? Object.keys(sc.zones) : [null];
    for (const zk of zones) {
      const S = Game.S();
      S.scene = sid; S.zone = zk; S.world = sid;
      S.tut = null;
      UI.render();
      await wait(420);
      const log = document.querySelector('#log');
      if (!log || getComputedStyle(log).display === 'none') continue;
      const lr = log.getBoundingClientRect();
      const img = document.querySelector('#scene-img');
      const ir = img ? img.getBoundingClientRect() : null;
      const boxLeft = ir ? ir.left - document.querySelector('#scene-wrap').getBoundingClientRect().left : 0;
      const boxW = ir ? ir.width : 1;
      const rows = [];
      document.querySelectorAll('#hotspots .hotspot').forEach(h => {
        const r = h.getBoundingClientRect();
        // 横向重叠（只有横向才可能被日志压住：日志是左侧一整条）
        const ov = Math.min(r.right, lr.right) - Math.max(r.left, lr.left);
        // 要让这个热点整体让开日志栏，它的"点"至少要在多少百分比上
        const half = (r.right - r.left) / 2;
        const needPct = ((lr.right + 6 + half) - boxLeft) / boxW * 100;
        if (ov > 0) rows.push({ label: (h.querySelector('.hot-label') || {}).textContent.slice(0, 10), x: h.style.left, y: h.style.top, ov: Math.round(ov), need: Math.ceil(needPct * 2) / 2, right: Math.round(r.right) });
      });
      if (rows.length) out.push({ scene: sid + (zk ? ':' + zk : ''), logW: Math.round(lr.width), logRight: Math.round(lr.right), hot: rows });
      // 同一屏里两个热点互相压住（重新排位置时最容易踩的坑）
      const hs = [...document.querySelectorAll('#hotspots .hotspot')].map(h => ({ r: h.getBoundingClientRect(), t: (h.querySelector('.hot-label') || {}).textContent.slice(0, 8) }));
      for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) {
        const a = hs[i].r, b = hs[j].r;
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 1 && oy > 1) out.push({ scene: sid + (zk ? ':' + zk : ''), clash: hs[i].t + ' × ' + hs[j].t, px: Math.round(Math.min(ox, oy)) });
      }
      // 被日志压住的热点，还能不能点到？（z-index 有没有抬到日志之上）
      for (const h of document.querySelectorAll('#hotspots .hotspot')) {
        const r = h.getBoundingClientRect();
        if (r.left + r.width / 2 < lr.right) {
          const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          const ok = el && (el.closest ? !!el.closest('.hotspot') : false);
          out.push({ scene: sid + (zk ? ':' + zk : ''), clickable: (h.querySelector('.hot-label') || {}).textContent.slice(0, 8), ok: !!ok, hit: ok ? '' : (el ? (el.id || el.className) : 'null') });
          break;
        }
      }
    }
  }
  return out;
})()`;

async function main() {
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(t => t.type === 'page'); } catch (e) {} }
  if (!target) { chrome.kill(); throw new Error('Chrome 没起来'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params) => new Promise((res, rej) => { const i = ++id; pending.set(i, m => (m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 260)); return r.result && r.result.value; };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(4200);
  await ev(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
    clk('#btn-new'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(1200);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close, #modal .modal-x'); if (!b) break; b.click(); await wait(200); }
    const S = Game.S(); S.tut = null; S.buildings.watch = 3; S.buildings.dock = 5; S.flags.ended_C = 1; S.atlantis = { stoneActive: 1 };
    return 1;
  })()`);
  const all = {};
  for (const [label, w, h] of [['desktop', 1280, 800], ['wide', 2340, 1080], ['phone', 844, 390], ['ipad', 1024, 768]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 1100 });
    await sleep(500);
    const rows = await ev(MEASURE);
    console.log('\\n=== ' + label + ' ' + w + 'x' + h + ' : ' + rows.length + ' 处被日志栏压住 ===');
    for (const r of rows) {
      if (r.clash) { console.log('  ⚠ 热点互压 ' + r.scene.padEnd(18) + r.clash + ' 重叠 ' + r.px + 'px'); continue; }
      if (r.clickable) { if (!r.ok) console.log('  ✗ 点不到 ' + r.scene.padEnd(18) + r.clickable + '（被 ' + r.hit + ' 挡住）'); continue; }
      console.log('  ' + r.scene.padEnd(18) + ' 日志右缘 ' + String(r.logRight).padStart(4) + ' → ' + r.hot.map(x => x.label + '(' + x.x + ',' + x.y + ')压' + x.ov + 'px,需x≥' + x.need + '%').join(' , '));
    }
    all[label] = rows;
  }
  // 汇总：哪些 hotspot 在任何一档都被压住
  console.log('\\n=== 汇总（被压住的热点，取最严重的一档）===');
  const worst = {};
  for (const [label, rows] of Object.entries(all)) for (const r of rows) if (r.hot) for (const x of r.hot) {
    const k = r.scene + ' | ' + x.label + ' | ' + x.x + ',' + x.y;
    if (!worst[k] || worst[k].ov < x.ov) worst[k] = { ov: x.ov, at: label };
  }
  Object.entries(worst).sort((a, b) => b[1].ov - a[1].ov).forEach(([k, v]) => console.log('  ' + k.padEnd(46) + ' 最大重叠 ' + String(v.ov).padStart(4) + 'px @' + v.at));
  // 截图：手机上海底「沉船墓地」（左侧热点最挤的一格之一）
  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
  await sleep(400);
  await ev(`(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const S = Game.S(); S.scene = 'shore'; S.zone = 'ruins'; UI.render(); await wait(700); return 1; })()`);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outDir = path.join(__dirname, '_out', 'hotspot');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'ruins_phone.png'), Buffer.from(shot.data, 'base64'));
  console.log('shot ' + path.join(outDir, 'ruins_phone.png'));
  ws.close(); chrome.kill();
}
main();
