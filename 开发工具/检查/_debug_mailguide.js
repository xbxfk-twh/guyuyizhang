/* 验证：① 邮箱出现「攻略」页且内容渲染正常 ② 交易面板顶部显示钱包
   用法：node _debug_mailguide.js  */
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const PORT = 9481, PROFILE = path.join(require('os').tmpdir(), 'guyu_guide_' + process.pid);
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
    // ① 邮箱 → 攻略
    document.querySelector('#btn-mail').click(); await wait(600);   // ⚠️ 防点击穿透：刚打开 350ms 内的点击会被吞，探针要等够
    const tabs = [...document.querySelectorAll('#modal [data-mailtab]')].map(b => b.textContent.trim());
    out.tabs = tabs;
    const g = [...document.querySelectorAll('#modal [data-mailtab]')].find(b => b.dataset.mailtab === 'guide');
    if (g) { g.click(); await wait(300); }
    const body = document.querySelector('#modal') ? document.querySelector('#modal').textContent : '';
    out.hasPortal = body.indexOf('第二章传送门') >= 0;
    out.hasCore = body.indexOf('深殿核心') >= 0;
    out.hasBlueprint = body.indexOf('图纸去哪儿买') >= 0;
    out.debugText = body.replace(/\s+/g, ' ').slice(0, 260);
    const c = document.querySelector('#modal #modal-close'); if (c) c.click(); await wait(200);
    // ② 老潮交易面板的钱包行
    const S = Game.S(); S.scene = 'camp'; S.day = 5; S.laochao.arrived = true; Game.addItem('beibi', 123, true); Game.addItem('coin', 7, true);
    UI.render(); await wait(300);
    const act = [...document.querySelectorAll('#scene-actions .action-btn')].find(b => b.textContent.indexOf('老潮') >= 0);
    out.foundLaochaoBtn = !!act;
    if (act) { act.click(); await wait(400); }
    const mtxt = document.querySelector('#modal') ? document.querySelector('#modal').textContent : '';
    out.wallet = /你身上：.*贝壳币\s*123/.test(mtxt.replace(/\s+/g, ' ')) ? '贝壳币 123 可见' : mtxt.slice(0, 80);
    return out;
  })()`);
  console.log(JSON.stringify(r, null, 1));
  const ok = r.tabs && r.tabs.indexOf('攻略') >= 0 && r.hasPortal && r.hasCore && r.hasBlueprint && r.foundLaochaoBtn && /123/.test(r.wallet);
  console.log(ok ? '→ 攻略页与钱包行都正常 ✓' : '→ 有问题 ✗');
  ws.close(); chrome.kill();
}
main();
