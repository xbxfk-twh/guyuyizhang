/* 两个问题的实测探针：
   ① 点「结局」按钮（祭坛仪式 / 扬帆远航…）到底会不会出结算画面、有没有结算文字；
   ② 「去山顶」点不点得进去：大地图上山顶箭头能不能点到、点了之后会发生什么
      （瞭望台不够 / 雷暴 / 保暖不够 / 正常四种情况分别看玩家能看到什么）。
   用法：node _debug_peak.js */
const { spawn } = require('child_process');
const path = require('path'); const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const PORT = 9471, PROFILE = path.join(require('os').tmpdir(), 'guyu_peak_' + process.pid);
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
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result && r.result.value; };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2800);

  const r = await ev(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
    const out = {};
    localStorage.clear();
    // ---- 正常开局（跟玩家一样点按钮进游戏），再直接给自己配齐"能上山"的条件 ----
    // 「新的旅程」→ 选存档槽 → 选身份 → 选难度（三下 .identity），和玩家点的一样
    clk('#btn-new'); await wait(600);
    clk('.identity'); await wait(600);
    clk('.identity'); await wait(600);
    clk('.identity'); await wait(1600);
    for (let i = 0; i < 10 && !document.querySelector('#nav'); i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await wait(400); }
    out.进游戏 = !!document.querySelector('#nav');
    // 序章那层叙事弹窗要关掉，否则下面 elementFromPoint 量到的全是遮罩层，量不出"热点被谁挡住"
    for (let i = 0; i < 6 && document.querySelector('#modal.open'); i++) {
      const b = document.querySelector('#modal .modal-actions button, #modal #modal-close, #modal [data-choice]');
      if (!b) break; b.click(); await wait(500);
    }
    out.弹窗清干净 = !document.querySelector('#modal.open');
    const st = Game.S(); st.tut = null;
    st.buildings.watch = 2;                       // 山顶 unlockWatch = 2
    st.buildings.dock = 1; st.buildings.house = 2; st.buildings.fire = 1; st.buildings.storage = 1;
    st.equipment.cloth = 'furCoat';                // 保暖 +6（山顶需要 4）
    UI.render(); await wait(600);
    document.querySelector('#nav [data-nav="map"]').click(); await wait(1400);   // 进大地图

    // ---- ① 山顶箭头：在不在、能不能点到（elementFromPoint 命中谁）----
    const arrow = document.querySelector('#map-arrows .map-arrow[data-scene="peak"]');
    out.箭头存在 = !!arrow;
    if (arrow) {
      const r0 = arrow.getBoundingClientRect();
      out.箭头盒子 = Math.round(r0.left) + ',' + Math.round(r0.top) + ' ' + Math.round(r0.width) + '×' + Math.round(r0.height);
      out.箭头类名 = arrow.className;
      const wrap = document.querySelector('#map-wrap').getBoundingClientRect();
      out.在画面里 = (r0.top >= wrap.top - 1 && r0.bottom <= wrap.bottom + 1 && r0.left >= wrap.left - 1 && r0.right <= wrap.right + 1);
      const hit = document.elementFromPoint(r0.left + r0.width / 2, r0.top + r0.height / 2);
      out.正中命中 = hit ? (hit.closest && hit.closest('.map-arrow') ? '箭头本身 ✓' : (hit.id || hit.className)) : 'null';
      const label = arrow.querySelector('.arrow-label'); const lr = label ? label.getBoundingClientRect() : null;
      if (lr) { const h2 = document.elementFromPoint(lr.left + lr.width / 2, lr.top + lr.height / 2); out.标签命中 = h2 ? (h2.closest && h2.closest('.map-arrow') ? '标签 ✓' : (h2.id || h2.className)) : 'null'; }
    }
    // ---- ② 正常情况：点箭头 → 确认框 → 前往 → 到没到山顶 ----
    if (arrow) {
      arrow.click(); await wait(700);
      const mt = document.querySelector('#modal .modal-title');
      out.确认框 = mt ? mt.textContent.trim() : '（没有弹出确认框）';
      const go = [...document.querySelectorAll('#modal button')].find(b => /前往/.test(b.textContent));
      if (go) { go.click(); await wait(2600); }
      out.到达场景 = Game.S().scene;
      out.结果 = Game.S().scene === 'peak' ? '正常上山 ✓' : '❌ 没上去';
    }
    // ---- ③ 山顶场景里，结局 C 的入口（祭坛 / 右下角按钮）在不在 ----
    const st2 = Game.S(); st2.scene = 'peak';
    st2.inv.relic = 1; st2.inv.slate = 3; st2.inv.dragonbone = 1;   // 结局 C 的材料
    UI.render(); await wait(900);
    out.山顶结局按钮 = [...document.querySelectorAll('#scene-actions button')].map(b => b.textContent.trim().slice(0, 14));
    const altar = [...document.querySelectorAll('#hotspots .hotspot')].map(h => (h.querySelector('.hot-label') || {}).textContent);
    out.山顶热点 = altar;
    // ---- ④ 点结局按钮：有没有结算画面 / 结算文字 ----
    const endBtn = [...document.querySelectorAll('#scene-actions button')].find(b => /祭坛仪式/.test(b.textContent));
    out.结局按钮存在 = !!endBtn;
    if (endBtn) {
      endBtn.click(); await wait(1500);
      out.点完的弹窗 = (document.querySelector('#modal .modal-title') || {}).textContent || '（没有弹窗）';
      out.弹窗选项 = [...document.querySelectorAll('#modal [data-choice], #modal button')].map(b => b.textContent.trim().slice(0, 12)).filter(x => x);
      // 先走"观看结算画面"这条路：点了应该出现结局画面 + 结算文字
      const b2 = [...document.querySelectorAll('#modal button')].find(b => /观看结算画面/.test(b.textContent));
      if (b2) { b2.click(); await wait(2500); }
      out.弹窗关了没 = !document.querySelector('#modal.open');
      out.结算画面 = !!document.querySelector('#ending-screen');
      out.结算画面文字 = document.querySelector('#ending-screen') ? document.querySelector('#ending-screen').textContent.replace(/\s+/g, ' ').slice(0, 90) : '（没有结算画面）';
      out.结算画面按钮 = [...document.querySelectorAll('#ending-screen button')].map(b => b.textContent.trim().slice(0, 12));
      if (document.querySelector('#ending-screen')) { document.querySelector('#end-stay').click(); await wait(800); }
      out.ended_C = !!Game.S().flags.ended_C;
      out.settled_C = !!Game.S().flags.settled_C;
      out.日志尾巴 = [...document.querySelectorAll('#logbody div')].slice(-3).map(d => d.textContent.slice(0, 40));
      // 结算过之后：献祭按钮和结算按钮都不该再留着
      out.结算后按钮 = [...document.querySelectorAll('#scene-actions button')].map(b => b.textContent.trim().slice(0, 16));
      // 再点一次"祭坛仪式"（如果还在）：不应该重复达成
      out.再点一次祭坛 = (() => { const b = [...document.querySelectorAll('#scene-actions button')].find(x => /祭坛仪式/.test(x.textContent)); if (!b) return '按钮已消失 ✓'; b.click(); return '按钮还在（会重复触发）'; })();
    }
    // ---- ⑤ 三种"上不了山"的情况，玩家到底看得到什么提示 ----
    const tries = {};
    const tryGo = async (label, setup) => {
      Game.newGame('fisher', 'normal'); const s = Game.S(); s.tut = null;
      s.buildings.watch = 2; s.equipment.cloth = 'furCoat'; s.stats.stamina = 150;
      setup(s);
      UI.render(); await wait(500);
      document.querySelector('#nav [data-nav="map"]').click(); await wait(1200);
      const a = document.querySelector('#map-arrows .map-arrow[data-scene="peak"]');
      a.click(); await wait(700);
      const hasModal = !!document.querySelector('#modal.open');
      const go = hasModal ? [...document.querySelectorAll('#modal button')].find(b => /前往/.test(b.textContent)) : null;
      if (go) { go.click(); await wait(1800); }
      const toast = document.querySelector('#center-toast');
      tries[label] = {
        弹了确认框: hasModal,
        弹窗标题: hasModal ? ((document.querySelector('#modal .modal-title') || {}).textContent || '').trim() : '—',
        中央提示: toast ? toast.textContent.slice(0, 50) : '（没有中央提示）',
        日志最后一条: (([...document.querySelectorAll('#logbody div')].slice(-1)[0]) || {}).textContent || '—',
        到了哪: Game.S().scene,
      };
      if (document.querySelector('#modal.open')) { const c = document.querySelector('#modal #modal-close'); if (c) c.click(); await wait(400); }
    };
    await tryGo('瞭望台只有1级', s => { s.buildings.watch = 1; });
    await tryGo('雷暴天', s => { s.weather = 'storm'; });
    await tryGo('没穿保暖衣', s => { s.equipment.cloth = null; });
    out.三种失败情况 = tries;
    // 最后把"结算画面"留在屏幕上，Node 侧截一张图（主人要看结算画面长什么样）
    Game.newGame('fisher', 'normal'); const sp = Game.S(); sp.tut = null;
    sp.day = 64; sp.flags.ended_C = 1;
    sp.diary = (sp.diary || []).concat([{ day:60, line:'山顶的祭坛亮了。' }, { day:64, line:'该记下的都记下了。' }]);
    Game.settleEnding('endC'); await wait(1500);
    out.留屏截图 = document.querySelector('#ending-screen') ? '已打开 ✓' : '没打开 ✗';
    return out;
  })()`);
  console.log(JSON.stringify(r, null, 1));
  try {
    const png = await send('Page.captureScreenshot', { format: 'png' });
    const dir = path.join(__dirname, '_out'); require('fs').mkdirSync(dir, { recursive: true });
    const f = path.join(dir, 'ending_screen.png');
    require('fs').writeFileSync(f, Buffer.from(png.data, 'base64'));
    console.log('结算画面截图 → ' + f);
  } catch (e) { console.log('截图失败：' + e.message); }
  ws.close(); chrome.kill();
}
main();
