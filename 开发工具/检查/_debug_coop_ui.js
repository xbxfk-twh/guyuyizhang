/* 鸡舍管理弹窗：扩建那一行在界面上长什么样、按钮能不能点（真浏览器）
   用法：node _debug_coop_ui.js */
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const OUT = path.join(__dirname, '_out');
const PORT = 9491, PROFILE = path.join(require('os').tmpdir(), 'guyu_coopui_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r => { let b = ''; r.on('data', c => b += c); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
  let t = null;
  for (let i = 0; i < 60 && !t; i++) { await sleep(250); try { t = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(x => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (me, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => (m.error ? rej(new Error(me)) : res(m.result))); ws.send(JSON.stringify({ id: i, method: me, params: p || {} })); });
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result && r.result.value; };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2600);

  const out = await ev(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
    localStorage.clear();
    clk('#btn-new'); await wait(600); clk('.identity'); await wait(600); clk('.identity'); await wait(600); clk('.identity'); await wait(2600);
    for (let i = 0; i < 6 && document.querySelector('#modal.open'); i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close, #modal [data-choice]'); if (!b) break; b.click(); await wait(400); }
    const s = Game.S(); s.tut = null; s.capacity = 99;
    Game.addItem('wood', 60, true); Game.addItem('vine', 30, true);
    Game.buildFurniture('coop');
    s.scene = 'camp';
    UI.render(); await wait(300);
    // 走玩家路径：营地热点 → 营地面板 → 鸡舍「管理」
    const hot = [...document.querySelectorAll('#hotspots .hotspot')].find(h => /营地升级/.test(h.textContent));
    const r1 = { 找到营地热点: !!hot };
    if (hot) { hot.click(); await wait(800); }
    const liveBtn = document.querySelector('#modal [data-live="coop"]');
    r1.找到鸡舍管理按钮 = !!liveBtn;
    if (liveBtn) { liveBtn.click(); await wait(800); }
    const rows = [...document.querySelectorAll('#modal .help-item, #modal .build-next, #modal .hint')].map(x => x.textContent.replace(/\\s+/g, ' ').trim().slice(0, 46));
    const btn = document.querySelector('#modal [data-coopext]');
    const res = Object.assign(r1, { 面板: (document.querySelector('#modal .modal-title') || {}).textContent || '', 行: rows, 有扩建按钮: !!btn, 按钮文字: btn ? btn.textContent.trim() : '', 按钮被锁: btn ? btn.classList.contains('lockedb') : null });
    if (btn) { btn.click(); await wait(900); }
    res.点完cap = Game.liveInfo('coop').cap;
    res.点后提示 = [...document.querySelectorAll('#modal .build-next, #modal .hint')].map(x => x.textContent.replace(/\\s+/g, ' ').trim().slice(0, 46));
    return res;
  })()`);
  console.log(JSON.stringify(out, null, 1));
  try { const png = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, 'coop_modal.png'), Buffer.from(png.data, 'base64')); console.log('截图 → ' + path.join(OUT, 'coop_modal.png')); } catch (e) {}
  ws.close(); chrome.kill();
}
main();
