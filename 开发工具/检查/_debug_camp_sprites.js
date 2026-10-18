/* 探针：营地建筑精灵（帐篷/篝火/储物箱/船坞）的实际位置与互相遮挡情况
   用法：node _debug_camp_sprites.js  */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const PORT = 9403;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_camp_' + process.pid);
const OUT = path.join(__dirname, '_out', 'camp');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = url => new Promise((resolve, reject) => {
  http.get(url, res => { let b = ''; res.on('data', c => (b += c)); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }).on('error', reject);
});

const MEASURE = `(() => {
  const wrap = document.querySelector('#camp-buildings');
  const st = document.querySelector('#scene-wrap').getBoundingClientRect();
  const items = [...wrap.querySelectorAll('.build-plate')].map(p => {
    const img = p.querySelector('img');
    const r = p.getBoundingClientRect();
    const ri = img ? img.getBoundingClientRect() : r;
    return { src: (img ? img.getAttribute('src') : '').split('/').pop(), x: p.style.left, y: p.style.top,
             z: getComputedStyle(p).zIndex,
             box: [Math.round(ri.left - st.left), Math.round(ri.top - st.top), Math.round(ri.width), Math.round(ri.height)] };
  });
  // 两两重叠（谁盖住谁按 DOM 顺序 + z-index）
  const clash = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i].box, b = items[j].box;
    const ox = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
    const oy = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
    if (ox > 2 && oy > 2) {
      // 谁在前由 z-index 决定（现在按 y 深度排序），不再看 DOM 顺序
      const zi = +items[i].z, zj = +items[j].z;
      const front = zi === zj ? (items[j].src + '(DOM 靠后)') : ((zi > zj ? items[i].src : items[j].src) + '(z=' + Math.max(zi, zj) + ')');
      const back = zi === zj ? items[i].src : ((zi > zj ? items[j].src : items[i].src) + '(z=' + Math.min(zi, zj) + ')');
      clash.push({ pair: items[i].src + ' × ' + items[j].src, ox: Math.round(ox), oy: Math.round(oy), front: front, back: back });
    }
  }
  return { stage: [Math.round(st.width), Math.round(st.height)], items, clash };
})()`;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(t => t.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params) => new Promise((res, rej) => { const i = ++id; pending.set(i, m => (m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result && r.result.value; };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2600);
  await ev(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
    clk('#btn-new'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(1200);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close, #modal .modal-x'); if (!b) break; b.click(); await wait(200); }
    const S = Game.S(); S.tut = null;
    S.buildings.house = 3; S.buildings.fire = 2; S.buildings.storage = 2; S.buildings.dock = 5; S.buildings.watch = 3;
    S.scene = 'camp'; UI.render();
    await wait(900);
    return 1;
  })()`);
  for (const [label, w, h] of [['desktop', 1280, 800], ['wide', 2340, 1080], ['phone', 844, 390]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 1100 });
    await sleep(400);
    await ev('UI.render()');      // 换了尺寸要重画，精灵宽度是按舞台宽算的
    await sleep(600);
    const r = await ev(MEASURE);
    console.log('\\n=== ' + label + ' 舞台 ' + r.stage.join('x') + ' ===');
    for (const it of r.items) console.log('  ' + it.src.padEnd(14) + ' 位置(' + it.x + ',' + it.y + ') z=' + it.z + ' 屏幕盒=' + JSON.stringify(it.box));
    console.log('  重叠：' + (r.clash.length ? r.clash.map(c => c.pair + ' ' + c.ox + 'x' + c.oy + 'px（前=' + c.front + ' 后=' + c.back + '）').join(' ; ') : '无'));
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await sleep(400); await ev('UI.render()'); await sleep(600);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, 'camp_now.png'), Buffer.from(shot.data, 'base64'));
  console.log('shot ' + path.join(OUT, 'camp_now.png'));
  ws.close(); chrome.kill();
}
main();
