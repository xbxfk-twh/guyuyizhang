/* 验证每日签到界面：标题页入口 → 领取 → 变成"今天已领过" → 数值真的加上了
   用法：node _debug_sign.js  */
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const PORT = 9461, PROFILE = path.join(require('os').tmpdir(), 'guyu_sign_' + process.pid);
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
    const out = {};
    const b0 = document.getElementById('btn-set');       // 主界面只剩「设置」，签到在图鉴·签到那一行
    out.buttonExists = !!b0;
    out.soulBefore = Game.metaState().soul || 0; out.bpBefore = Game.backupPoints();
    b0.click(); await wait(500);
    const en = document.querySelector('#modal [data-open="sign"]');
    out.entryExists = !!en; out.entryText = en ? en.textContent.trim() : '';
    if (en) { en.click(); await wait(600); }   // 防点击穿透窗口，探针等久一点
    out.modalTitle = (document.querySelector('#modal .modal-title') || {}).textContent || '';
    const txt = () => { const e = document.querySelector('#modal .overlay-text'); return e ? e.textContent : ''; };
    out.canSignText = txt().indexOf('可以领取') >= 0;
    const go = document.querySelector('#modal [data-sign="go"]');
    out.hasClaimBtn = !!go;
    if (go) { go.click(); await wait(500); }
    out.soulAfter = Game.metaState().soul || 0; out.bpAfter = Game.backupPoints();
    out.modalAfter = txt().indexOf('已签到') >= 0;
    // 关掉再看设置里的入口是否变成"不可领"
    const c = document.querySelector('#modal #modal-close'); if (c) c.click(); await wait(300);
    b0.click(); await wait(500);
    const en2 = document.querySelector('#modal [data-open="sign"]');
    out.entryTextAfter = en2 ? en2.textContent.trim() : '';
    return out;
  })()`);
  console.log(JSON.stringify(r, null, 1));
  const ok = r.buttonExists && r.entryExists && r.hasClaimBtn && r.soulAfter === r.soulBefore + 30 && r.bpAfter === r.bpBefore + 2 && r.modalAfter && r.entryTextAfter.indexOf('可领') < 0;
  console.log(ok ? '→ 签到全流程正常 ✓' : '→ 有问题 ✗');
  ws.close(); chrome.kill();
}
main();
