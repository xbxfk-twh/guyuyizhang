/* 验证"防点击穿透"：打开弹窗的那一下不能同时点到弹窗里的第一个按钮
   用法：node _debug_clickthrough.js  */
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const PORT = 9471, PROFILE = path.join(require('os').tmpdir(), 'guyu_ct_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r => { let b = ''; r.on('data', c => b += c); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });
async function main() {
  const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=1024,700', 'about:blank'], { stdio: 'ignore' });
  let t = null;
  for (let i = 0; i < 60 && !t; i++) { await sleep(250); try { t = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(x => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (me, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => (m.error ? rej(new Error(me)) : res(m.result))); ws.send(JSON.stringify({ id: i, method: me, params: p || {} })); });
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 250)); return r.result && r.result.value; };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2800);
  const r = await ev(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
    clk('#btn-new'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(1200);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close, #modal .modal-x'); if (!b) break; b.click(); await wait(200); }
    await wait(3400);
    const out = {};
    // ① 点开"背包"（打开弹窗），紧接着（同一帧、模拟穿透）就点弹窗里的第一个按钮
    const navInv = document.querySelector('#nav [data-nav="inv"]');
    navInv.click();                                   // 打开弹窗
    const m = document.getElementById('modal');
    const first = m.querySelector('.inv-item, .mini-btn, button');
    out.firstBtn = first ? first.textContent.trim().slice(0, 10) : '无';
    // 立刻派发一次 click（捕获阶段应该被吞掉）
    first.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await wait(60);
    out.stillOpenRightAfter = m.classList.contains('open');
    // ② 等过 350ms 再点同一颗按钮 —— 这次应该真的生效（这里用"关 闭"来验证）
    await wait(420);
    const closeBtn = m.querySelector('#modal-close');
    out.hasClose = !!closeBtn;
    if (closeBtn) { closeBtn.click(); await wait(200); }
    out.closedAfterWait = !m.classList.contains('open');
    return out;
  })()`);
  console.log(JSON.stringify(r, null, 1));
  const ok = r.stillOpenRightAfter === true && r.hasClose && r.closedAfterWait === true;
  console.log(ok ? '→ 防穿透生效：刚打开那一下被吞掉，350ms 后按钮正常 ✓' : '→ 有问题 ✗');
  ws.close(); chrome.kill();
}
main();
