/* 实测旅行轨迹：起点必须是"当前所在地箭头"的位置，不能是左上角(0,0)
   玩家反馈："无论从哪里出发，行动轨迹都是从左上角（返回孤岛）的位置过来的" */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_travel_shots');
const PORT = 9421;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_tv_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });

let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };

// 读出行进线的起终点 + 当前所在地箭头的位置
const PROBE = `(() => {
  const layer = document.querySelector('.travel-layer');
  const dot = document.querySelector('.travel-dot');
  const wrap = document.querySelector('#map-wrap');
  if (!wrap) return { err: '没在地图' };
  const wr = wrap.getBoundingClientRect();
  const line = layer ? layer.querySelector('line') : null;
  // 行进层自己带 left/top 偏移（对齐到屏幕坐标系），所以要把它加回去才能和箭头屏幕坐标比较
  const lx = layer ? parseFloat(layer.style.left) || 0 : 0;
  const ly = layer ? parseFloat(layer.style.top) || 0 : 0;
  const arrow = (function () {
    return [...document.querySelectorAll('#map-arrows .map-arrow')].map(a => {
      const r = a.getBoundingClientRect();
      return { label: (a.querySelector('.arrow-label')||{}).textContent.replace(/[●▼]/g,'').trim().slice(0,4),
               cls: a.className, x: Math.round(r.left - wr.left + r.width/2), y: Math.round(r.bottom - wr.top) };
    });
  })();
  return {
    hasLayer: !!layer,
    layerOffset: { l: Math.round(lx), t: Math.round(ly), wrapT: Math.round(wr.top) },
    // 换算成"相对地图容器"的屏幕坐标
    line: line ? { x1: Math.round(+line.getAttribute('x1') + lx - wr.left), y1: Math.round(+line.getAttribute('y1') + ly - wr.top),
                   x2: Math.round(+line.getAttribute('x2') + lx - wr.left), y2: Math.round(+line.getAttribute('y2') + ly - wr.top) } : null,
    dot: dot ? { left: dot.style.left, top: dot.style.top } : null,
    arrows: arrow,
    scene: Game.S().scene, zone: Game.S().zone
  };
})()`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=1600,900', 'about:blank'], { stdio: 'ignore' });
  let t = null;
  for (let i = 0; i < 60 && !t; i++) { await sleep(250); try { t = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(x => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map(); const errs = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') errs.push((((m.params.exceptionDetails || {}).exception) || {}).description || '');
  };
  const send = (me, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => (m.error ? rej(new Error(me + ':' + JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method: me, params: p || {} })); });
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 250) }; return r.result && r.result.value; };

  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2800);
  await ev(`(async () => {
    const clk = s => { const e = document.querySelector(s); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(1600);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(250); }
    const S = Game.S(); S.tut = null; S.buildings.watch = 3; S.stats.stamina = 99999;
    return 1;
  })()`);

  console.log('=== 第一章地图：从营地出发去树林 ===');
  await ev(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); Game.S().scene='camp'; Game.S().zone=null; document.querySelector('#nav [data-nav="map"]').click(); await w(900); return 1; })()`);
  const before = await ev(PROBE);
  console.log('  当前 scene=' + before.scene + '  地图上有 ' + before.arrows.length + ' 个箭头');
  // 点"树林" → 前往
  await ev(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
    const a = [...document.querySelectorAll('#map-arrows .map-arrow')].find(x => /树林/.test(x.textContent));
    a.click(); await w(600);
    const go = [...document.querySelectorAll('#modal button')].find(b => /前往/.test(b.textContent));
    go.click(); await w(120); return 1; })()`);
  const during = await ev(PROBE);
  console.log('  行进线: ' + JSON.stringify(during.line) + '   起点圆点: ' + JSON.stringify(during.dot));
  const campArrow = (during.arrows || []).find(a => /营地/.test(a.label));
  const forestArrow = (during.arrows || []).find(a => /树林/.test(a.label));
  console.log('  营地箭头在 (' + (campArrow && campArrow.x) + ',' + (campArrow && campArrow.y) + ')   树林箭头在 (' + (forestArrow && forestArrow.x) + ',' + (forestArrow && forestArrow.y) + ')');
  ck('★ 起点不是左上角 (0,0)', during.line && !(during.line.x1 <= 1 && during.line.y1 <= 1), JSON.stringify(during.line));
  ck('★ 起点对上了"当前所在地"（营地）箭头', during.line && campArrow &&
     Math.abs(during.line.x1 - campArrow.x) <= 3 && Math.abs(during.line.y1 - campArrow.y) <= 3,
     '线起点(' + (during.line && during.line.x1) + ',' + (during.line && during.line.y1) + ') vs 营地箭头(' + (campArrow && campArrow.x) + ',' + (campArrow && campArrow.y) + ')');
  ck('★ 终点对上了目的地（树林）箭头', during.line && forestArrow &&
     Math.abs(during.line.x2 - forestArrow.x) <= 3 && Math.abs(during.line.y2 - forestArrow.y) <= 3,
     '线终点(' + (during.line && during.line.x2) + ',' + (during.line && during.line.y2) + ') vs 树林箭头(' + (forestArrow && forestArrow.x) + ',' + (forestArrow && forestArrow.y) + ')');
  await send('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(OUT, 'travel_ch1.png'), Buffer.from(r.data, 'base64')));

  // 换一个出发地再测（验证"无论从哪里出发"都对）
  await sleep(2000);
  console.log('');
  console.log('=== 换出发点：从荒漠出发去草地 ===');
  await ev(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); Game.S().scene='desert'; Game.S().zone=null; document.querySelector('#nav [data-nav="map"]').click(); await w(900); return 1; })()`);
  await ev(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
    const a = [...document.querySelectorAll('#map-arrows .map-arrow')].find(x => /草地/.test(x.textContent));
    a.click(); await w(600);
    const go = [...document.querySelectorAll('#modal button')].find(b => /前往/.test(b.textContent));
    go.click(); await w(120); return 1; })()`);
  const d2 = await ev(PROBE);
  const desArrow = (d2.arrows || []).find(a => /荒漠/.test(a.label));
  console.log('  行进线: ' + JSON.stringify(d2.line));
  console.log('  荒漠箭头在 (' + (desArrow && desArrow.x) + ',' + (desArrow && desArrow.y) + ')');
  ck('★ 从荒漠出发时起点也正确（不是左上角）', d2.line && desArrow &&
     Math.abs(d2.line.x1 - desArrow.x) <= 3 && Math.abs(d2.line.y1 - desArrow.y) <= 3,
     '线起点(' + (d2.line && d2.line.x1) + ',' + (d2.line && d2.line.y1) + ') vs 荒漠箭头(' + (desArrow && desArrow.x) + ',' + (desArrow && desArrow.y) + ')');
  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');

  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('');
  console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  if (bad.length) { console.log('失败项：'); bad.forEach(x => console.log(' - ' + x)); }
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  console.log('截图 → ' + OUT);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
