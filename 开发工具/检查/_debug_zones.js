/* 探针：场景内分区域按钮（海域→沉船湾、对岸→盐镇/遗迹）能不能点到、能不能切过去
   用法：node _debug_zones.js  */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const PORT = 9431;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_zone_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = url => new Promise((resolve, reject) => {
  http.get(url, res => { let b = ''; res.on('data', c => (b += c)); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }).on('error', reject);
});

const TEST = `(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = [];
  const P = () => Game.S();
  const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
  for (const [scene, want] of [['sea', 'cove'], ['shore', 'ruins']]) {
    P().scene = scene; P().zone = null; P().tut = null; P().buildings.watch = 3;
    UI.render(); await wait(500);
    const btns = [...document.querySelectorAll('#zones .zone-btn')];
    const info = { scene, buttons: btns.map(b => b.textContent.trim() + (b.classList.contains('locked') ? '(锁)' : '')), zoneBefore: P().zone };
    const target = btns.find(b => b.dataset.zone === want);
    if (!target) { info.result = '没找到目标分区按钮'; out.push(info); continue; }
    const r = target.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    info.topElementAtButton = top ? (top.id || top.className || top.tagName) : 'null';
    info.buttonRect = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
    // ① 直接 .click()
    target.click(); await wait(400);
    info.afterDirectClick = P().zone;
    // ② 模拟"手指点在按钮位置上"（真机行为：命中的是最上层元素）
    P().zone = null; UI.render(); await wait(400);
    const b2 = [...document.querySelectorAll('#zones .zone-btn')].find(b => b.dataset.zone === want);
    const r2 = b2.getBoundingClientRect();
    const pt = { x: r2.left + r2.width / 2, y: r2.top + r2.height / 2 };
    const ev = (t) => new PointerEvent(t, { bubbles: true, cancelable: true, clientX: pt.x, clientY: pt.y, pointerId: 1 });
    document.elementFromPoint(pt.x, pt.y).dispatchEvent(ev('pointerdown'));
    document.elementFromPoint(pt.x, pt.y).dispatchEvent(ev('pointerup'));
    await wait(400);
    info.afterRealTap = P().zone;
    info.ok = (info.afterRealTap === want);
    out.push(info);
  }
  return out;
})()`;

async function main() {
  const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=1024,700', 'about:blank'], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(t => t.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params) => new Promise((res, rej) => { const i = ++id; pending.set(i, m => (m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result && r.result.value; };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2600);
  await ev(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
    clk('#btn-new'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(1200);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close, #modal .modal-x'); if (!b) break; b.click(); await wait(200); }
    await wait(3400);   // 等 #loading（2.7 秒）彻底移除，否则它会把点击全吃掉（探针假报）
    return 1;
  })()`);
  for (const r of await ev(TEST)) console.log(JSON.stringify(r, null, 1));
  ws.close(); chrome.kill();
}
main();
