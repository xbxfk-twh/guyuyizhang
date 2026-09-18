/* 探针：引导"跳过"是否真的生效 / 手机端底栏高度 / 工具栏耐久显示
   用法：node _debug_uicheck.js  */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const PORT = 9357;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_uicheck_' + process.pid);
const OUT = path.join(__dirname, '_uicheck_out');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = url => new Promise((resolve, reject) => {
  http.get(url, res => { let b = ''; res.on('data', c => (b += c)); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }).on('error', reject);
});

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=844,390', 'about:blank'], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(t => t.type === 'page'); } catch (e) {} }
  if (!target) { chrome.kill(); throw new Error('Chrome 没起来'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params) => new Promise((res, rej) => { const i = ++id; pending.set(i, m => (m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const evaluate = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result && r.result.value; };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2500);
  // 开局
  await evaluate(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
    clk('#btn-new'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(1200);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close, #modal .modal-x'); if (!b) break; b.click(); await wait(200); }
    return 1;
  })()`);
  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: false });
  await sleep(400);
  const r = await evaluate(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    const S = Game.S(); S.tut = 1; S.weather = 'sun'; Game.change(); await wait(120);
    out.bannerBefore = !!document.getElementById('tut');
    const sk = document.querySelector('#tut [data-tutskip]');
    if (sk) sk.click();
    await wait(200);
    out.tutAfterClick = S.tut;
    out.bannerAfter = !!document.getElementById('tut');
    out.navH = Math.round(document.getElementById('nav').getBoundingClientRect().height);
    // 工具栏耐久显示
    Game.addItem('axeStone', 1, true); S.toolDurs.axeStone = [9]; S.dur.axeStone = 9;
    S.toolkit = ['axeStone', null, null];
    UI.render();
    const eq = document.querySelector('#nav [data-nav="equip"]');
    if (eq) eq.click(); await wait(300);
    const tab = document.querySelector('#modal [data-equiptab="p2"]');
    if (tab) tab.click(); await wait(300);
    out.toolkitText = (document.querySelector('#modal .relic-slot.filled') || {}).textContent || '';
    return out;
  })()`);
  console.log(JSON.stringify(r, null, 2));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, 'toolkit_mobile.png'), Buffer.from(shot.data, 'base64'));
  console.log('shot ' + path.join(OUT, 'toolkit_mobile.png'));
  ws.close(); chrome.kill();
}
main();
