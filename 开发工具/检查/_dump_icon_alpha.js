/* 细看某几张图的边缘像素（抠图到底干不干净）：node _dump_icon_alpha.js divineBow hornAmulet
   不传参就默认看这几张。 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const PORT = 9397;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_dump_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = url => new Promise((resolve, reject) => {
  http.get(url, res => { let b = ''; res.on('data', c => (b += c)); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }).on('error', reject);
});
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['divineBow', 'hornAmulet', 'bow', 'horn'];
// 图标分散在 items / items2 / items-accent 三个目录，按名字找一遍
const DIRS = ['items', 'items2', 'items-accent', 'build', 'ui'];
const files = [];
for (const n of names) {
  const rel = n.indexOf('/') >= 0 ? n : null;
  if (rel) { if (fs.existsSync(path.join(ROOT, rel))) files.push(rel); continue; }
  for (const d of DIRS) {
    const f = 'assets/img/' + d + '/' + n + '.png';
    if (fs.existsSync(path.join(ROOT, f))) { files.push(f); break; }
  }
}

const PAGE = (files) => `(async () => {
  const load = (src) => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  const out = [];
  for (const f of ${JSON.stringify(files)}) {
    const im = await load(f);
    if (!im) { out.push({ f: f, err: 'load fail' }); continue; }
    const w = im.naturalWidth, h = im.naturalHeight;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, w, h); ctx.drawImage(im, 0, 0);
    const d = ctx.getImageData(0, 0, w, h).data;
    const at = (x, y) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
    const named = { '左上': [0, 0], '右上': [w - 1, 0], '左下': [0, h - 1], '右下': [w - 1, h - 1], '上中': [(w / 2) | 0, 0], '下中': [(w / 2) | 0, h - 1], '左中': [0, (h / 2) | 0], '右中': [w - 1, (h / 2) | 0] };
    const corner = {};
    for (const k in named) { const c = at(named[k][0], named[k][1]); corner[k] = 'rgba(' + c.join(',') + ')'; }
    // 上边缘那一行的 alpha 分布（看是不是"整条边"都不透明）
    let topOpaque = 0; for (let x = 0; x < w; x++) if (at(x, 0)[3] > 24) topOpaque++;
    let leftOpaque = 0; for (let y = 0; y < h; y++) if (at(0, y)[3] > 24) leftOpaque++;
    out.push({ f: f, w: w, h: h, corner: corner, topRowOpaque: topOpaque + '/' + w, leftColOpaque: leftOpaque + '/' + h });
  }
  return out;
})()`;

async function main() {
  const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, 'about:blank'], { stdio: 'ignore' });
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
  await sleep(2200);
  for (const r of await ev(PAGE(files))) {
    console.log('=== ' + r.f + '  ' + r.w + 'x' + r.h);
    if (r.err) { console.log('   ' + r.err); continue; }
    console.log('   上边缘不透明像素 ' + r.topRowOpaque + ' ｜ 左边缘不透明 ' + r.leftColOpaque);
    console.log('   四角/边中: ' + JSON.stringify(r.corner));
  }
  ws.close(); chrome.kill();
}
main();
