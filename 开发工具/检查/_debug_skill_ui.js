/* 技能树界面（真浏览器）：装备→技能 tab 的三张卡片 → 点开某棵树 → 主干选项 / 分支节点 / 学习按钮
   用法：node _debug_skill_ui.js */
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const OUT = path.join(__dirname, '_out');
const PORT = 9501, PROFILE = path.join(require('os').tmpdir(), 'guyu_skillui_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r => { let b = ''; r.on('data', c => b += c); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=1280,860', 'about:blank'], { stdio: 'ignore' });
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

  const a = await ev(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
    localStorage.clear();
    clk('#btn-new'); await wait(600); clk('.identity'); await wait(600); clk('.identity'); await wait(600); clk('.identity'); await wait(2600);
    for (let i = 0; i < 6 && document.querySelector('#modal.open'); i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close, #modal [data-choice]'); if (!b) break; b.click(); await wait(400); }
    const s = Game.S(); s.tut = null; s.exp.gather = 300; s.exp.craft = 300; s.exp.combat = 300;
    UI.render(); await wait(300);
    document.querySelector('#nav [data-nav="equip"]').click(); await wait(800);
    // 切到「技能」tab
    const tabBtn = [...document.querySelectorAll('#modal .tab, #modal [data-eqtab]')].find(b => /技能/.test(b.textContent));
    const out = { 找到技能tab: !!tabBtn };
    if (tabBtn) { tabBtn.click(); await wait(700); }
    out.三张卡片 = [...document.querySelectorAll('#modal .skill-col .skill-name')].map(x => x.textContent.trim());
    out.卡片按钮 = [...document.querySelectorAll('#modal [data-skilltree]')].map(b => b.textContent.trim() + '→' + b.dataset.skilltree);
    const open = document.querySelector('#modal [data-skilltree="gather"]');
    out.能点开采集树 = !!open;
    if (open) { open.click(); await wait(800); }
    out.树标题 = (document.querySelector('#modal .modal-title') || {}).textContent.trim().slice(0, 30);
    out.主干选项 = [...document.querySelectorAll('#modal [data-trunkup]')].map(b => b.textContent.replace(/\\s+/g, ' ').trim().slice(0, 18));
    out.主干选项可点 = [...document.querySelectorAll('#modal [data-trunkup]')].filter(b => !b.disabled).length;
    out.分支节点 = [...document.querySelectorAll('#modal .st-node .st-head b')].map(x => x.textContent.trim());
    out.锁定原因 = [...document.querySelectorAll('#modal .st-lock')].map(x => x.textContent.trim()).slice(0, 3);
    // 点一次主干升级（选"熟手"）
    const up = document.querySelector('#modal [data-trunkup="gather:yield"]');
    if (up && !up.disabled) { up.click(); await wait(800); }
    out.升完级 = (document.querySelector('#modal .modal-title') || {}).textContent.replace(/\\s+/g, ' ').trim().slice(0, 34);
    out.升完还能再点 = [...document.querySelectorAll('#modal [data-trunkup]')].filter(b => !b.disabled).length > 0;
    // 最后切到「战斗」树，截图留给战斗树（B2 那四个节点：两侧互斥 + 下游分支）
    const back = document.querySelector('#modal #st-back'); if (back) { back.click(); await wait(700); }
    const cb = document.querySelector('#modal [data-skilltree="combat"]'); if (cb) { cb.click(); await wait(800); }
    out.战斗树节点 = [...document.querySelectorAll('#modal .st-node .st-head b')].map(x => x.textContent.trim());
    out.左侧节点 = [...document.querySelectorAll('#modal .st-side.left .st-node .st-head b')].map(x => x.textContent.trim());
    out.右侧节点 = [...document.querySelectorAll('#modal .st-side.right .st-node .st-head b')].map(x => x.textContent.trim());
    out.互斥虚线 = document.querySelectorAll('#modal .st-mutex-line').length;
    return out;
  })()`);
  console.log(JSON.stringify(a, null, 1));
  try { const png = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, 'skill_tree.png'), Buffer.from(png.data, 'base64')); console.log('截图 → ' + path.join(OUT, 'skill_tree.png')); } catch (e) {}
  ws.close(); chrome.kill();
}
main();
