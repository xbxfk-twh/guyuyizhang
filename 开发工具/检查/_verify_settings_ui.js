/* 真浏览器验证设置面板：三合一声音行 / 日志行 / 皮肤解锁 / 关闭当前目标
   重点量"有没有重叠、有没有溢出"（作者 2026-09-19 要求） */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const PORT = 9421;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_set_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });

let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };

// 量一行里的按钮：两两不重叠、整行不溢出、都在弹窗里
const MEASURE = `(rows => {
  const out = [];
  const lists = [...document.querySelectorAll('#modal .set-inline')];
  for (const idx of rows) {
    const row = lists[idx];
    if (!row) { out.push({ idx, err: '没有这一行' }); continue; }
    const btns = [...row.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), l: r.left, r: r.right, tp: r.top, bt: r.bottom, w: r.width }; });
    let overlap = null;
    for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) {
      const a = btns[i], b = btns[j];
      if (a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.tp < b.bt - 0.5 && b.tp < a.bt - 0.5) overlap = a.t + ' ↔ ' + b.t;
    }
    const modal = document.querySelector('#modal');
    const mr = modal ? modal.getBoundingClientRect() : null;
    const overflowRow = row.scrollWidth > row.clientWidth + 2;
    const outOfCard = mr ? btns.some(b => b.l < mr.left - 1 || b.r > mr.right + 1) : false;
    const tops = [...new Set(btns.map(b => Math.round(b.tp)))];
    out.push({ idx, n: btns.length, texts: btns.map(b => b.t), overlap, overflowRow, outOfCard, lines: tops.length, tops,
      rowW: row.clientWidth, scrollW: row.scrollWidth });
  }
  return out;
})([0, 1])`;

(async () => {
  const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
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
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) }; return r.result && r.result.value; };

  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2800);

  async function openSettings() {
    await ev(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
      const b = document.querySelector('#btn-set'); if (b) b.click(); await w(600); return 1; })()`);
  }
  async function checkRows(tag) {
    const rows = await ev(MEASURE);
    console.log('  ' + tag + ' → ' + JSON.stringify(rows));
    const sound = rows[0] || {}, logs = rows[1] || {};
    ck(tag + '：声音行三个开关放同一行、互不重叠',
       sound.n === 3 && !sound.overlap && sound.texts.every(x => /音乐|音效|环境音/.test(x)), JSON.stringify(sound.texts));
    ck(tag + '：日志行（显示 + 宽度）同一行、互不重叠',
       logs.n >= 6 && !logs.overlap, logs.overlap || ('按钮 ' + (logs.n || 0) + ' 个'));
    ck(tag + '：两行都真的只占一行（没有换行折下去）',
       sound.lines === 1 && logs.lines === 1, '声音 ' + sound.lines + ' 行 / 日志 ' + logs.lines + ' 行');
    ck(tag + '：两行都没有横向溢出、也没跑出弹窗',
       sound.overflowRow !== true && logs.overflowRow !== true && sound.outOfCard !== true && logs.outOfCard !== true,
       '声音 溢出=' + sound.overflowRow + ' 出框=' + sound.outOfCard + ' / 日志 溢出=' + logs.overflowRow + ' 出框=' + logs.outOfCard);
  }

  console.log('A) 桌面 1280×800');
  await openSettings();
  await checkRows('桌面');
  const desk = await ev(`({ askin: document.querySelectorAll('#modal [data-askin]').length,
    hasObj: !!document.querySelector('#modal [data-set="obj:off"]'), hasObjOn: !!document.querySelector('#modal [data-set="obj:on"]'),
    cloudLine: (() => { const it = [...document.querySelectorAll('#modal .help-item')].find(x => /云存档/.test(x.textContent)); return it ? it.textContent.replace(/\\s+/g,' ').trim().slice(0, 80) : null; })() })`);
  console.log('   ' + JSON.stringify(desk));
  ck('皮肤包里两个要花魂点解锁的皮肤都是"🔒 … 50 魂点"按钮', desk.askin === 2, '锁定按钮 ' + desk.askin + ' 个');
  ck('有「关闭当前目标」开关', desk.hasObj && desk.hasObjOn);
  ck('云存档只剩一句状态 + 最近时间（+一行小字版本）',
     /未启用|已同步|已就绪/.test(desk.cloudLine || '') && /版本 v?1\./.test(desk.cloudLine || '') &&
     !/存档同时留在本地/.test(desk.cloudLine || ''), desk.cloudLine);

  console.log('B) 点一下开关：声音 / 关闭当前目标');
  const toggled = await ev(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
    const before = AudioFX.sfxState();
    document.querySelector('#modal [data-set="audio:sfx"]').click(); await w(400);
    const after = AudioFX.sfxState();
    const s2 = [...document.querySelectorAll('#modal .set-inline')][0];
    const txt = s2 ? s2.textContent.replace(/\\s+/g,' ').trim() : '';
    document.querySelector('#modal [data-set="obj:off"]').click(); await w(400);
    return { before, after, txt, obj: localStorage.getItem('guyuyizhang_obj') }; })()`);
  console.log('   ' + JSON.stringify(toggled));
  ck('点「音效」真的翻转开关（状态变了、按钮文案跟着变）',
     toggled.before !== toggled.after && /音效 (开|关)/.test(toggled.txt || ''), JSON.stringify(toggled));
  ck('点「关闭当前目标」写进本机偏好（guyuyizhang_obj=0）', toggled.obj === '0', String(toggled.obj));

  console.log('C) 手机竖屏 390×844（容易挤的地方）');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await openSettings();
  const geo = await ev(`(() => { const m = document.querySelector('#modal .modal-content'); const r = m ? m.getBoundingClientRect() : null;
    return { win: window.innerWidth + '×' + window.innerHeight, dpr: window.devicePixelRatio,
      modal: r ? Math.round(r.width) + '×' + Math.round(r.height) : null }; })()`);
  console.log('   几何: ' + JSON.stringify(geo));
  await checkRows('手机');

  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');

  console.log('D) 更窄的手机 360×640');
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 2, mobile: true });
  await openSettings();
  await checkRows('窄屏');

  console.log('E) 制造面板：工位分类在左侧竖栏（作者 2026-09-19 美化）');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  const craft = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const close = document.querySelector('#modal .modal-x, #modal #modal-close'); if (close) { close.click(); await w(400); }
    // 先进一局（制造面板只在游戏里）
    const clk = s => { const e = document.querySelector(s); if (e) e.click(); };
    if (document.querySelector('#btn-new')) {
      clk('#btn-new'); await w(500);
      clk('.identity'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(1600);
      for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(250); }
    }
    const go = document.querySelector('#nav [data-nav="craft"]') || [...document.querySelectorAll('#scene-actions button')].find(b => /制造/.test(b.textContent));
    if (go) { go.click(); await w(800); }
    const rail = document.querySelector('#modal .craft-rail');
    const list = document.querySelector('#modal .craft-body > .recipe-list');
    if (!rail || !list) return { err: '没有竖栏结构' };
    const rr = rail.getBoundingClientRect(), lr = list.getBoundingClientRect();
    const tabs = [...rail.querySelectorAll('.tab')];
    const tops = [...new Set(tabs.map(t => Math.round(t.getBoundingClientRect().top)))];
    const modal = document.querySelector('#modal .modal-content').getBoundingClientRect();
    return { tabs: tabs.length, railW: Math.round(rr.width), railLeft: Math.round(rr.left), listLeft: Math.round(lr.left),
      listW: Math.round(lr.width), railLines: tops.length, overflow: list.scrollWidth > list.clientWidth + 2,
      inModal: rr.left >= modal.left - 1 && lr.right <= modal.right + 1 };
  })()`);
  console.log('   ' + JSON.stringify(craft));
  ck('工位分类是竖栏、配方列表在它右边',
     !craft.err && craft.tabs >= 8 && craft.railLeft < craft.listLeft && craft.railW < craft.listW,
     craft.err || `竖栏宽 ${craft.railW} / 列表宽 ${craft.listW}`);
  ck('竖栏是竖向排列（每个工位一行）、整体不溢出弹窗',
     !craft.err && craft.railLines === craft.tabs && craft.overflow === false && craft.inModal === true,
     craft.err || `行数 ${craft.railLines}/${craft.tabs} 溢出=${craft.overflow} 在框内=${craft.inModal}`);

  console.log('\n================ 汇总 ================');
  console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  if (bad.length) { console.log('失败项：'); bad.forEach(b => console.log(' - ' + b)); }
  console.log(bad.length ? 'RESULT:FAIL' : 'RESULT:PASS');
  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  process.exitCode = bad.length ? 1 : 0;
})();
