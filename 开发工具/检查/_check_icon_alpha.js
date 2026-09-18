/* 图标"抠图"体检（用浏览器解码 PNG，避免自己写解码器出错）：
   ① 有没有透明通道 ② 四边是不是透明（没抠干净就会有白/灰底）③ 填充率/留白（是否居中、是否太小）
   用法：node _check_icon_alpha.js  */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const PORT = 9391;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_alpha_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = url => new Promise((resolve, reject) => {
  http.get(url, res => { let b = ''; res.on('data', c => (b += c)); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }).on('error', reject);
});

function listPngs() {
  const out = [];
  for (const d of ['items', 'items2', 'build', 'enemies', 'ui', 'anim', 'atlantis']) {
    const p = path.join(ROOT, 'assets', 'img', d);
    if (!fs.existsSync(p)) continue;
    for (const f of fs.readdirSync(p)) if (/\.png$/i.test(f)) out.push('assets/img/' + d + '/' + f);
  }
  return out;
}

const PAGE = (files) => `(async () => {
  const files = ${JSON.stringify(files)};
  const out = [];
  const load = (src) => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  for (const f of files) {
    const im = await load(f);
    if (!im) { out.push({ f: f, err: 'load fail' }); continue; }
    const w = im.naturalWidth, h = im.naturalHeight;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, w, h); ctx.drawImage(im, 0, 0);
    const d = ctx.getImageData(0, 0, w, h).data;
    const at = (x, y) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
    const pts = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1], [(w / 2) | 0, 0], [(w / 2) | 0, h - 1], [0, (h / 2) | 0], [w - 1, (h / 2) | 0],
                 [(w * 0.05) | 0, (h * 0.05) | 0], [(w * 0.95) | 0, (h * 0.05) | 0], [(w * 0.05) | 0, (h * 0.95) | 0], [(w * 0.95) | 0, (h * 0.95) | 0]];
    let opaque = 0, alphaSum = 0, bright = 0;
    for (const p of pts) { const c = at(p[0], p[1]); alphaSum += c[3]; if (c[3] > 24) { opaque++; if (c[0] > 200 && c[1] > 200 && c[2] > 200) bright++; } }
    let minX = w, maxX = -1, minY = h, maxY = -1, solid = 0, total = 0, anyAlpha = false;
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
      const a = at(x, y)[3]; total++;
      if (a < 250) anyAlpha = true;
      if (a > 24) { solid++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    out.push({ f: f, w: w, h: h, anyAlpha: anyAlpha, edgeOpaque: opaque, edgeBright: bright, edgeAlphaAvg: Math.round(alphaSum / pts.length),
               fill: Math.round(solid / total * 1000) / 1000, margins: [minX, minY, w - 1 - maxX, h - 1 - maxY] });
  }
  return out;
})()`;

async function main() {
  const files = listPngs();
  const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=800,600', 'about:blank'], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(t => t.type === 'page'); } catch (e) {} }
  if (!target) { chrome.kill(); throw new Error('Chrome 没起来'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params) => new Promise((res, rej) => { const i = ++id; pending.set(i, m => (m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result && r.result.value; };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2500);
  const res = await ev(PAGE(files));
  console.log('检查了 ' + res.length + ' 张图');
  console.log('\n=== 疑似没抠干净（没有透明像素，或边框有 >=3 个不透明采样点）===');
  const bad = res.filter(r => r.err || !r.anyAlpha || r.edgeOpaque >= 3);
  if (!bad.length) console.log('  （没有）');
  for (const r of bad) console.log(r.err ? ('  X ' + r.f + ' ' + r.err)
    : ('  ! ' + r.f.padEnd(34) + r.w + 'x' + r.h + ' 透明像素=' + r.anyAlpha + ' 边上不透明=' + r.edgeOpaque + '/12（亮色 ' + r.edgeBright + '）'));
  console.log('\n=== 你问的两张 + 同类饰品 ===');
  for (const r of res.filter(r => /divineBow|hornAmulet|horn\.png|bow\.png|pearlNeck|beastFang|shellAmulet/.test(r.f)))
    console.log('  ' + r.f.padEnd(34) + r.w + 'x' + r.h + ' 透明=' + r.anyAlpha + ' 边缘不透明=' + r.edgeOpaque + '/12（亮色 ' + r.edgeBright + '）填充率=' + r.fill + ' 四周留白=' + JSON.stringify(r.margins));
  console.log('\n=== 填充率异常（<0.08 太小 / >0.97 贴边）===');
  const odd = res.filter(r => !r.err && (r.fill < 0.08 || r.fill > 0.97));
  if (!odd.length) console.log('  （没有）');
  for (const r of odd) console.log('  ' + r.f.padEnd(34) + ' 填充率=' + r.fill + ' ' + r.w + 'x' + r.h);
  ws.close(); chrome.kill();
}
main();
