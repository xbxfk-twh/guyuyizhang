/* 把 anim 目录里几张"动作动画图"拼成一张对比图（深色底，模拟游戏里的黑底），
   方便一眼看出哪张有问题（比如带白底、抠图不干净、画面不是人物）。
   用法：node _preview_anim.js  */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const PORT = 9411;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_anim_' + process.pid);
const OUT = path.join(__dirname, '_out', 'anim');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = url => new Promise((resolve, reject) => {
  http.get(url, res => { let b = ''; res.on('data', c => (b += c)); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }).on('error', reject);
});

const names = process.argv.slice(2).length ? process.argv.slice(2)
  : ['sleep_night', 'sleep_nap', 'rest', 'gather', 'pot', 'fish', 'dive', 'sword', 'axe_icon', 'hammer_icon'];

const PAGE = (base) => `(async () => {
  const names = ${JSON.stringify(names)};
  const base = ${JSON.stringify(base)};
  document.body.style.cssText = 'margin:0;background:#0b0b09;color:#eae6da;font:13px system-ui;display:flex;flex-wrap:wrap;gap:10px;padding:12px';
  for (const n of names) {
    const box = document.createElement('div');
    box.style.cssText = 'width:250px;text-align:center';
    box.innerHTML = '<div style="font-size:12px;opacity:.8;margin-bottom:4px">' + n + '</div>';
    const im = new Image();
    im.src = base + n + '.png';
    im.style.cssText = 'width:240px;height:240px;object-fit:contain;background:#141412;border:1px solid #444';
    box.appendChild(im);
    document.body.appendChild(box);
  }
  await new Promise(r => setTimeout(r, 1200));
  return 1;
})()`;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=1060,1080', 'about:blank'], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(t => t.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params) => new Promise((res, rej) => { const i = ++id; pending.set(i, m => (m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 260)); return r.result && r.result.value; };
  await send('Page.enable'); await send('Runtime.enable');
  // 用一张静态预览页做拼图（直接从游戏目录引图，别加载游戏本体——标题界面会盖住预览）
  const pageName = process.argv[2] && process.argv[2].endsWith('.html') ? process.argv[2] : '_anim_preview.html';
  const page = path.join(__dirname, '..', '预览', pageName);
  await send('Page.navigate', { url: 'file:///' + encodeURI(page.replace(/\\/g, '/')) });
  await sleep(800);
  await sleep(1400);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const f = path.join(OUT, 'anim_sheet.png');
  fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
  console.log('shot ' + f);
  ws.close(); chrome.kill();
}
main();
