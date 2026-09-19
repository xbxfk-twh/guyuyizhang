/* 验证：localStorage 被平台清掉后，能不能靠 cookie 里那份把存档/魂点救回来
   用法：node _debug_cookie_save.js  */
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const PORT = 9451, PROFILE = path.join(require('os').tmpdir(), 'guyu_ck_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// file:// 页面是写不了 cookie 的（Chrome 限制），所以起一个本地 http 服务来测（跟线上一样）
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404); res.end('no'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
});
const getJSON = u => new Promise((res, rej) => { http.get(u, r => { let b = ''; r.on('data', c => b += c); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });
async function main() {
  const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, 'about:blank'], { stdio: 'ignore' });
  let t = null;
  for (let i = 0; i < 60 && !t; i++) { await sleep(250); try { t = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(x => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (me, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => (m.error ? rej(new Error(me)) : res(m.result))); ws.send(JSON.stringify({ id: i, method: me, params: p || {} })); });
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 250)); return r.result && r.result.value; };
  await send('Page.enable'); await send('Runtime.enable');
  const HTTP_PORT = 8791;
  await new Promise(r => server.listen(HTTP_PORT, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + HTTP_PORT + '/index.html';
  await send('Page.navigate', { url });
  await sleep(2600);
  const r1 = await ev(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
    clk('#btn-new'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(1200);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close, #modal .modal-x'); if (!b) break; b.click(); await wait(200); }
    const S = Game.S(); S.tut = null; S.day = 7; S.inv.branch = 42; Game.save();
    const m = (() => { try { return JSON.parse(localStorage.getItem('guyuyizhang_meta')); } catch (e) { return {}; } })();
    // ⚠️ 魂点要走正式 API 写（会同时写 localStorage + cookie），直接改 localStorage 不会更新 cookie
    // ⚠️ 别写死 +30：签到奖励是 SIGN_SOUL（作者 2026-09-19 改成 10 了），这里从接口读
    const st0 = Game.dailySignState();
    const soulWant = (Game.metaState().soul || 0) + (st0.soul || 0);
    Game.dailySign();
    window.__soulWant = soulWant;
    return { day: S.day, soulWant: soulWant, saveCookie: (document.cookie.indexOf('guyu_save=') >= 0), metaCookie: (document.cookie.indexOf('guyu_meta=') >= 0), cookieLen: document.cookie.length };
  })()`);
  console.log('① 存档后：', JSON.stringify(r1));
  await ev(`(() => {   // 模拟"平台清掉 localStorage"（cookie 保留）
    ['guyuyizhang_save','guyuyizhang_save_bak','guyuyizhang_meta','guyuyizhang_meta_bak','guyuyizhang_savedAt'].forEach(k => localStorage.removeItem(k));
    return Object.keys(localStorage).filter(k => k.indexOf('guyuyizhang') === 0).length;
  })()`);
  // 不重载（重载会触发 pagehide 自动存档，把 localStorage 又写回来，测不出 cookie 兜底）
  const r2 = await ev(`(async () => {
    const has = Game.hasSave();
    const ok = Game.load();
    const S = Game.S() || {};
    let soul = null; try { soul = Game.metaReload() && Game.metaState().soul; } catch (e) {}
    return { hasSave: has, loadOk: ok, day: S.day, branch: S.inv ? S.inv.branch : null, soul: soul };
  })()`);
  const want = r1.soulWant;
  console.log('② 清掉 localStorage 后重新读档：', JSON.stringify(r2), '（期望魂点 ' + want + '）',
    (r2.day === 7 && r2.branch === 42 && r2.soul === want) ? '  → 进度与魂点都从 cookie 救回来了 ✓' : '  → 没救回来 ✗');
  server.close(); ws.close(); chrome.kill();
}
main();
