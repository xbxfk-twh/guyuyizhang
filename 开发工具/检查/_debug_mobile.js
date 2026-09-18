/* 手机端体检：① 显示有没有溢出/错位 ② 有没有明显卡顿（渲染耗时 / 长任务 / 动画数量）
   用法：node _debug_mobile.js  */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const PORT = 9371;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_mobperf_' + process.pid);
const OUT = path.join(__dirname, '_mobile_check_out');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = url => new Promise((resolve, reject) => {
  http.get(url, res => { let b = ''; res.on('data', c => (b += c)); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }).on('error', reject);
});

// 一屏一屏地量：溢出元素、可点区域尺寸、关键 UI 是否都在画面里
const DISPLAY = `(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const vw = innerWidth, vh = innerHeight;
  out.viewport = vw + 'x' + vh;
  // 横向滚动条（手机端不该出现）
  out.hScroll = document.documentElement.scrollWidth - vw;
  // 越界元素：不在画面内、又不是刻意藏起来的
  const strays = [];
  document.querySelectorAll('#main *, #topbar *, #nav *').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const over = Math.max(0, -r.left, r.right - vw, -r.top, r.bottom - vh);
    if (over > 3) strays.push((el.id ? '#' + el.id : el.className || el.tagName) .toString().slice(0, 26) + ':' + Math.round(over) + 'px');
  });
  out.strays = strays.slice(0, 8);
  out.strayCount = strays.length;
  // 可点区域尺寸（手机建议 ≥ 32px）
  const sizeOf = sel => { const a = [...document.querySelectorAll(sel)].map(e => { const r = e.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); }).filter(v => v > 0); return a.length ? Math.min.apply(null, a) : null; };
  out.tap = {
    nav: sizeOf('#nav button'),
    action: sizeOf('#scene-actions .action-btn'),
    hotspot: sizeOf('.hotspot'),
    arrow: sizeOf('.map-arrow'),
    mini: sizeOf('.mini-btn'),
  };
  const rect = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), h: Math.round(r.height) }; };
  out.topbar = rect('#topbar'); out.nav = rect('#nav'); out.log = rect('#log');
  out.actions = rect('#scene-actions');
  out.actionsInner = (document.querySelector('#scene-actions') || {}).scrollHeight || 0;
  out.actionCount = document.querySelectorAll('.action-btn').length;
  out.topbarIn = !!out.topbar && out.topbar.t >= -2;
  out.navIn = !!out.nav && out.nav.b <= vh + 2;
  return out;
})()`;

// 性能：渲染耗时 / 长任务 / 动画数量 / DOM 规模 / 图片解码量
const PERF = `(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  // ① UI.render() 本身多久（测 12 次取平均/最大）
  const ts = [];
  for (let i = 0; i < 12; i++) { const t0 = performance.now(); UI.render(); t0 && ts.push(performance.now() - t0); }
  out.renderAvg = +(ts.reduce((a, b) => a + b, 0) / ts.length).toFixed(2);
  out.renderMax = +Math.max.apply(null, ts).toFixed(2);
  // ② 强制一次完整布局要多久
  const t1 = performance.now(); document.body.offsetHeight; document.body.getBoundingClientRect(); out.layoutMs = +(performance.now() - t1).toFixed(2);
  // ③ 帧率：空地静置 1.5 秒（动画在跑的时候才有意义）
  const fps = (ms) => new Promise(res => {
    let n = 0; const t0 = performance.now();
    const step = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(step); else res(Math.round(n / ((performance.now() - t0) / 1000))); };
    requestAnimationFrame(step);
  });
  out.fpsScene = await fps(1200);
  // ④ DOM 规模 / 图片
  out.nodes = document.querySelectorAll('*').length;
  const imgs = [...document.querySelectorAll('img')];
  out.imgCount = imgs.length;
  out.imgPixels = imgs.reduce((a, i) => a + (i.naturalWidth * i.naturalHeight), 0);
  out.bigImgs = imgs.filter(i => i.naturalWidth * i.naturalHeight > 1200 * 800).map(i => (i.getAttribute('src') || '').split('/').pop() + '(' + i.naturalWidth + 'x' + i.naturalHeight + ')').slice(0, 8);
  // ⑤ 正在跑的 CSS 动画（数量 × 名字）
  const anims = (document.getAnimations ? document.getAnimations() : []);
  out.animCount = anims.length;
  const names = {};
  anims.forEach(a => { const n = (a.animationName || (a.effect && a.effect.getKeyframes && 'js')) + ''; names[n] = (names[n] || 0) + 1; });
  out.anims = names;
  // ⑥ 模糊层（backdrop-filter）有多少
  out.blurs = [...document.querySelectorAll('*')].filter(e => { const cs = getComputedStyle(e); return (cs.backdropFilter && cs.backdropFilter !== 'none') || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== 'none'); }).map(e => e.id || e.className).slice(0, 8);
  // ⑦ 长任务：跑一段"开地图→拖→关→开背包→关"的循环
  const longTasks = [];
  try { new PerformanceObserver(l => l.getEntries().forEach(e => longTasks.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); } catch (e) {}
  for (let i = 0; i < 3; i++) {
    document.querySelector('#nav [data-nav="map"]').click(); await wait(220);
    const wrap = document.querySelector('#map-wrap');
    if (wrap) { const r = wrap.getBoundingClientRect(); const ev2 = (t, y) => new PointerEvent(t, { bubbles: true, clientX: r.left + 40, clientY: y, pointerId: 1 });
      wrap.dispatchEvent(ev2('pointerdown', r.top + 150)); for (let k = 0; k < 8; k++) wrap.dispatchEvent(ev2('pointermove', r.top + 150 + k * 12)); wrap.dispatchEvent(ev2('pointerup', r.top + 240)); }
    await wait(150);
    document.querySelector('#nav [data-nav="equip"]').click(); await wait(200);
    const x = document.querySelector('#modal .modal-x'); if (x) x.click(); await wait(150);
  }
  await wait(400);
  out.longTasks = longTasks;
  out.longTaskMax = longTasks.length ? Math.max.apply(null, longTasks) : 0;
  out.fpsLoop = await fps(1200);
  // ⑧ 干活动画（全屏 busy 覆盖层）跑起来时的帧率
  const act = [...document.querySelectorAll('.action-btn')].find(b => !b.classList.contains('disabled'));
  if (act) { act.click(); out.fpsBusy = await fps(1600); } else out.fpsBusy = null;
  // ⑨ 弹窗（背包/制造）尺寸是否放得下
  const modals = {};
  for (const [name, nav] of [['背包', 'inv'], ['制造', 'craft'], ['装备', 'equip']]) {
    const b = document.querySelector('#nav [data-nav="' + nav + '"]');
    if (!b) continue;
    b.click(); await wait(260);
    const mc = document.querySelector('#modal .modal-content');
    if (mc) { const r = mc.getBoundingClientRect(); modals[name] = { w: Math.round(r.width), h: Math.round(r.height), inner: mc.scrollHeight, fitsW: r.width <= innerWidth + 1, fitsH: r.height <= innerHeight + 1 }; }
    const x = document.querySelector('#modal .modal-x'); if (x) x.click(); await wait(160);
  }
  out.modals = modals;
  return out;
})()`;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=844,390', 'about:blank'], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(t => t.type === 'page'); } catch (e) {} }
  if (!target) { chrome.kill(); throw new Error('Chrome 没起来'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params) => new Promise((res, rej) => { const i = ++id; pending.set(i, m => (m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 260)); return r.result && r.result.value; };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });   // 让 pointer:coarse 生效（真机才是这样）
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2500);
  await ev(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
    clk('#btn-new'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(1200);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close, #modal .modal-x'); if (!b) break; b.click(); await wait(200); }
    const S = Game.S(); S.tut = null; S.buildings.watch = 3; S.buildings.dock = 5; S.weather = 'rain';
    return 1;
  })()`);
  for (const [label, w, h, mob] of [['phone_land', 844, 390, true], ['phone_small', 812, 375, true], ['tablet', 1024, 768, true]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: mob });
    await sleep(700);
    const d = await ev(DISPLAY);
    console.log('\\n=== ' + label + ' ' + d.viewport + ' ===');
    console.log('  横向溢出 ' + d.hScroll + 'px ｜ 越界元素 ' + d.strayCount + (d.strays.length ? ' → ' + d.strays.join(' , ') : ''));
    console.log('  可点最小边: 底栏 ' + d.tap.nav + ' ｜ 动作键 ' + d.tap.action + ' ｜ 热点 ' + d.tap.hotspot + ' ｜ 地图箭头 ' + d.tap.arrow + ' ｜ 小按钮 ' + d.tap.mini);
    console.log('  顶栏 ' + JSON.stringify(d.topbar) + ' 底栏 ' + JSON.stringify(d.nav) + ' 日志 ' + JSON.stringify(d.log) + ' 动作区 ' + JSON.stringify(d.actions) + '（' + d.actionCount + ' 个按钮，最小边 ' + d.tap.action + '）');
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
  await sleep(500);
  const p = await ev(PERF);
  console.log('\\n=== 性能（844×390 手机） ===');
  console.log('  UI.render() 平均 ' + p.renderAvg + 'ms（最慢 ' + p.renderMax + 'ms）｜ 强制布局 ' + p.layoutMs + 'ms');
  console.log('  DOM 节点 ' + p.nodes + ' ｜ <img> ' + p.imgCount + ' 张，解码总量 ' + (p.imgPixels / 1e6).toFixed(1) + ' 百万像素');
  console.log('  大图: ' + (p.bigImgs.length ? p.bigImgs.join(' , ') : '无'));
  console.log('  正在跑的 CSS 动画 ' + p.animCount + ' → ' + JSON.stringify(p.anims));
  console.log('  backdrop-filter 模糊层: ' + (p.blurs.length ? p.blurs.join(' , ') : '无'));
  console.log('  长任务(ms) ' + JSON.stringify(p.longTasks) + ' ｜ 最长 ' + p.longTaskMax + 'ms');
  console.log('  FPS: 静置(下雨) ' + p.fpsScene + ' ｜ 开合循环中 ' + p.fpsLoop + ' ｜ 干活动画中 ' + p.fpsBusy);
  console.log('  弹窗尺寸: ' + JSON.stringify(p.modals));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, 'mobile_now.png'), Buffer.from(shot.data, 'base64'));
  console.log('shot ' + path.join(OUT, 'mobile_now.png'));
  ws.close(); chrome.kill();
}
main();
