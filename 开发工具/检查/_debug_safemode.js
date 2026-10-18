/* 验证"崩溃自检 + 安全模式"：
   ① 正常启动 → 记 ok；
   ② 伪造"上一次启动没走到渲染成功" → 重载 → 应该自动弹安全模式，并显示留存的报错；
   ③ 点"用备份存档打开" → 能恢复。
   用法：node _debug_safemode.js  */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const PORT = 9421;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_safe_' + process.pid);
const OUT = path.join(__dirname, '_out', 'safemode');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = url => new Promise((resolve, reject) => {
  http.get(url, res => { let b = ''; res.on('data', c => (b += c)); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }).on('error', reject);
});

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=1024,700', 'about:blank'], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(t => t.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params) => new Promise((res, rej) => { const i = ++id; pending.set(i, m => (m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result && r.result.value; };
  const url = 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html');
  await send('Page.enable'); await send('Runtime.enable');

  // ① 正常开一局，存两次档（第二次会生成 _bak 备份）
  await send('Page.navigate', { url });
  await sleep(2600);
  await ev(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
    clk('#btn-new'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(1200);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close, #modal .modal-x'); if (!b) break; b.click(); await wait(200); }
    Game.S().tut = null; Game.save(); Game.save();
    return { boot: localStorage.getItem('guyuyizhang_boot'), crashes: localStorage.getItem('guyuyizhang_crashes'), bak: !!(localStorage.getItem('guyuyizhang_save_bak')) };
  })()`).then(r => console.log('① 正常启动后：', JSON.stringify(r)));

  // ② 伪造"上次没走到渲染成功" + 两条崩溃记录 + 一条报错，然后重载
  await ev(`(() => {
    localStorage.setItem('guyuyizhang_boot', JSON.stringify({ at: Date.now() - 5000, ok: false }));
    localStorage.setItem('guyuyizhang_crashes', '2');
    localStorage.setItem('guyuyizhang_lasterr', 'TypeError: fake boom at renderInner');
    return 1;
  })()`);
  await send('Page.reload', {});
  await sleep(2800);
  const safe = await ev(`(() => {
    const m = document.querySelector('#modal');
    const open = m && m.classList.contains('open');
    const title = (m && m.querySelector('.modal-title') || {}).textContent || '';
    const txt = (m && m.querySelector('.overlay-text') || {}).textContent || '';
    const btns = [...(m ? m.querySelectorAll('.modal-actions button') : [])].map(b => b.textContent.slice(0, 12));
    return { open, title, hasErr: txt.indexOf('fake boom') >= 0, btns };
  })()`);
  console.log('② 伪造崩溃后重载：', JSON.stringify(safe));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, 'safemode.png'), Buffer.from(shot.data, 'base64'));

  // ③ 点"用备份存档打开"
  const restored = await ev(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const btns = [...document.querySelectorAll('#modal .modal-actions button')];
    const b = btns.find(x => x.textContent.indexOf('备份') >= 0);
    if (!b) return { clicked: false };
    b.click(); await wait(900);
    return { clicked: true, inGame: !!document.querySelector('#top-day'), log: (document.querySelector('#logbody') || {}).textContent ? 'has-log' : '' };
  })()`);
  console.log('③ 点「用备份存档打开」：', JSON.stringify(restored));
  ws.close(); chrome.kill();
}
main();
