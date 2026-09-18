/* 结局·秘辛 → 传送石 → 符文解密 全链路实测（真浏览器）
   用法：node _debug_secret_ui.js */
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const OUT = path.join(__dirname, '_out');
const PORT = 9511, PROFILE = path.join(require('os').tmpdir(), 'guyu_secret_' + process.pid);
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
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result && r.result.value; };
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
    const s = Game.S(); s.tut = null; s.capacity = 99;
    if (s.settings) s.settings.roadAmbush = false;
    s.buildings.watch = 2; s.stats.stamina = 999;   // 山顶要 2 级瞭望台才看得见
    s.equipment.cloth = 'furCoat';                  // 山顶严寒（保暖≥4）才让上
    s._testNoAmbush = true;                         // 测试专用：关掉赶路拦路（玩家那边是关不掉的）
    Game.addItem('relic', 1, true); Game.addItem('slate', 3, true); Game.addItem('dragonbone', 1, true);
    Game.travel('peak'); s.tut = null;
    UI.render(); await wait(600);
    out.到山顶 = Game.S().scene;
    const labels = () => [...document.querySelectorAll('#hotspots .hotspot .hot-label')].map(x => x.textContent.trim());
    out.山顶热点 = labels();
    out.行动按钮 = [...document.querySelectorAll('#scene-actions button')].map(b => b.textContent.trim().slice(0, 16));
    // ① 点祭坛热点 → 弹窗 → 举行仪式
    const altar = [...document.querySelectorAll('#hotspots .hotspot')].find(h => /祭坛/.test(h.textContent));
    out.有祭坛热点 = !!altar;
    if (altar) { altar.click(); await wait(800); }
    out.祭坛弹窗 = (document.querySelector('#modal .modal-title') || {}).textContent || '（没有）';
    const rite = [...document.querySelectorAll('#modal button')].find(b => /举行祭坛仪式/.test(b.textContent));
    out.有举行仪式按钮 = !!rite;
    if (rite) { rite.click(); await wait(1200); }
    out.结局达成弹窗 = (document.querySelector('#modal .modal-title') || {}).textContent || '（没有）';
    out.ended_C = !!Game.S().flags.ended_C;
    // 关掉"结局达成"弹窗（选继续探索）
    const keep = [...document.querySelectorAll('#modal button')].find(b => /继续探索/.test(b.textContent));
    if (keep) { keep.click(); await wait(700); }
    else { const c = document.querySelector('#modal #modal-close'); if (c) { c.click(); await wait(500); } }
    UI.render(); await wait(600);
    // ② 山顶应该出现"传送石 · 需解密"
    out.仪式后热点 = labels();
    const portal = [...document.querySelectorAll('#hotspots .hotspot')].find(h => /传送石/.test(h.textContent));
    out.有传送石 = !!portal;
    // ③ 第一关：记录自动播放的顺序
    // ⚠️ 必须在点开之前就挂观察器：一打开就【自动播放】一遍，晚挂就漏掉开头几个音；
    //    也不要再点"再看一遍"，那会和自动播放交叠、记出一串错的顺序。
    const seq = [];
    const ob = new MutationObserver(list => {
      for (const m2 of list) {
        const el = m2.target;
        if (!el.classList || !el.classList.contains('rune-btn')) continue;
        const lit = el.classList.contains('lit');
        if (lit && el.dataset._lit !== '1') { el.dataset._lit = '1'; seq.push(+el.dataset.rune); }
        else if (!lit) el.dataset._lit = '';
      }
    });
    ob.observe(document.querySelector('#modal') || document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
    if (portal) { portal.click(); await wait(900); }
    out.解密弹窗 = (document.querySelector('#modal .modal-title') || {}).textContent || '（没有）';
    out.有符文盘 = !!document.querySelector('#modal .rune-grid');
    const btns = [...document.querySelectorAll('#modal .rune-btn')];
    for (let k = 0; k < 30 && seq.length < 6; k++) await wait(300);   // 等 6 个音放完
    // 放完之后还要等它进入"输入模式"（状态文案变成"轮到你了"）才接受点击
    for (let k = 0; k < 20; k++) { const st = document.querySelector('#modal #rune-status'); if (st && /轮到你了/.test(st.textContent)) break; await wait(250); }
    ob.disconnect();
    out.进入输入模式 = /轮到你了/.test((document.querySelector('#modal #rune-status') || {}).textContent || '');
    out.第一关顺序 = seq.join(',');
    for (const i of seq.slice(0, 6)) { if (btns[i]) btns[i].click(); await wait(150); }
    await wait(900);
    out.过第一关 = (document.querySelector('#modal .modal-title') || {}).textContent || '（没有）';
    // ④ 第二关（配对）：一张一张试，配上就继续
    { const doneCnt = () => document.querySelectorAll('#modal .pair-btn.done').length;
      for (let a = 0; a < 8 && doneCnt() < 8; a++) {
        let A = document.querySelectorAll('#modal .pair-btn')[a];
        if (!A || A.classList.contains('done')) continue;
        if (A.classList.contains('flip')) { await wait(800); A = document.querySelectorAll('#modal .pair-btn')[a]; }
        if (!A || A.classList.contains('done')) continue;
        A.click(); await wait(160);
        for (let b2 = a + 1; b2 < 8; b2++) {
          let B = document.querySelectorAll('#modal .pair-btn')[b2];
          if (!B || B.classList.contains('done') || B.classList.contains('flip')) continue;
          // 上一轮配对失败时 A 会被自动翻回去 —— 每次试新的一张之前，先把 A 重新翻开
          const A2 = document.querySelectorAll('#modal .pair-btn')[a];
          if (!A2 || A2.classList.contains('done')) break;
          if (!A2.classList.contains('flip')) { A2.click(); await wait(160); }
          B.click(); await wait(850);
          const A3 = document.querySelectorAll('#modal .pair-btn')[a];
          if (!A3 || A3.classList.contains('done')) break;   // 配齐 4 对后弹窗会换成第三关，这里要判空
        }
      }
      await wait(600);
    }
    out.过第二关 = (document.querySelector('#modal .modal-title') || {}).textContent || '（没有）';
    // ⑤ 第三关（点灯）：直接按"九宫翻转"解出来（爬山法会卡在局部最优，这里用 BFS 求精确解）
    { const bs = [...document.querySelectorAll('#modal .light-btn')];
      if (bs.length === 9) {
        let start = 0; bs.forEach((b, i) => { if (b.classList.contains('on')) start |= (1 << i); });
        const maskOf = (i) => { const r = Math.floor(i / 3), c = i % 3; let m = 0;
          [[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr, dc]) => { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 3 && cc >= 0 && cc < 3) m |= 1 << (rr * 3 + cc); });
          return m; };
        const goal = 511, prev = new Map([[start, null]]), q = [start];
        while (q.length) { const st = q.shift(); if (st === goal) break;
          for (let i = 0; i < 9; i++) { const nx = st ^ maskOf(i); if (!prev.has(nx)) { prev.set(nx, [st, i]); q.push(nx); } } }
        const moves = []; let cur = goal;
        while (prev.get(cur)) { const [p, i] = prev.get(cur); moves.push(i); cur = p; }
        moves.reverse();
        out.点灯解法步数 = moves.length;
        for (const i of moves) { const b = document.querySelectorAll('#modal .light-btn')[i]; if (b) b.click(); await wait(110); }
      }
      await wait(900);
    }
    out.过第三关 = (document.querySelector('#modal .modal-title') || {}).textContent || '（弹窗已关 = 通关）';
    out.传送石已激活 = !!(Game.S().atlantis && Game.S().atlantis.stoneActive);
    UI.render(); await wait(600);
    out.通关后热点 = [...document.querySelectorAll('#hotspots .hotspot .hot-label')].map(x => x.textContent.trim()).filter(x => /传送石/.test(x));
    return out;
  })()`);
  console.log(JSON.stringify(r, null, 1));
  try { const png = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, 'secret_flow.png'), Buffer.from(png.data, 'base64')); console.log('截图 → ' + path.join(OUT, 'secret_flow.png')); } catch (e) {}
  ws.close(); chrome.kill();
}
main();
