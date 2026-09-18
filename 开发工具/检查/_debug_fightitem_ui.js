/* 战斗里用道具 / 道具面板的 ✕（玩家反馈"点道具再点叉就直接结束战斗""点道具用不了"）
   用法：node _debug_fightitem_ui.js */
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const OUT = path.join(__dirname, '_out');
const PORT = 9521, PROFILE = path.join(require('os').tmpdir(), 'guyu_fi_' + process.pid);
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

  const r = await ev(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
    const out = {};
    localStorage.clear();
    clk('#btn-new'); await wait(600); clk('.identity'); await wait(600); clk('.identity'); await wait(600); clk('.identity'); await wait(2600);
    for (let i = 0; i < 6 && document.querySelector('#modal.open'); i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close, #modal [data-choice]'); if (!b) break; b.click(); await wait(400); }
    const s = Game.S(); s.tut = null; s._testNoAmbush = true; s.capacity = 99;
    Game.addItem('herbPaste', 3, true);          // 草药膏（回血）
    s.stats.hp = 40;
    Game.startFight({ id:'d', name:'木桩', hp:999999, atk:0, def:0, spd:1, traits:[], drops:[] }, true);
    await wait(500);
    out.开战 = !!Game.S().combat;
    out.开战血量 = Math.round(Game.S().stats.hp);
    // ① 点道具 → 面板出现
    const itemBtn = document.querySelector('#fight-btns [data-fact="item"]');
    out.有道具按钮 = !!itemBtn;
    if (itemBtn) { itemBtn.click(); await wait(700); }
    out.道具面板 = (document.querySelector('#modal .modal-title') || {}).textContent || '（没有）';
    const med = document.querySelector('#modal [data-med-id]');
    out.有可点道具 = !!med;
    if (med) { med.click(); await wait(800); }
    out.用药后血量 = Math.round(Game.S().stats.hp);
    out.用药后还在战斗 = !!Game.S().combat;
    out.用药后战斗界面 = !!document.querySelector('#fight-btns');
    // ② 再开道具面板 → 点右上角 ✕ → 应该回到战斗，而不是结束战斗
    const itemBtn2 = document.querySelector('#fight-btns [data-fact="item"]');
    if (itemBtn2) { itemBtn2.click(); await wait(700); }
    const x = document.querySelector('#modal .modal-x, #modal #modal-close');
    out.叉按钮 = !!x;
    if (x) { x.click(); await wait(700); }
    out.点叉后还在战斗 = !!Game.S().combat;
    out.点叉后战斗界面 = !!document.querySelector('#fight-btns');
    return out;
  })()`);
  console.log(JSON.stringify(r, null, 1));
  try { const png = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, 'fight_item.png'), Buffer.from(png.data, 'base64')); } catch (e) {}
  ws.close(); chrome.kill();
}
main();
