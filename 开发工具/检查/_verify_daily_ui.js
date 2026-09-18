/* 浏览器验证：① 晨报弹窗渲染 ② 从哪个场景出来，那格就在地图中间 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_daily_shots');
const PORT = 9453;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_dr_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });
let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };
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

  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/')) + '/index.html' });
  await sleep(2800);
  await ev(`(async () => {
    const clk = s => { const e = document.querySelector(s); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(500); clk('.identity'); await w(1600);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(250); }
    const S = Game.S();
    S.tut = null; S.stats.stamina = 99999; S.buildings.watch = 3;
    S.settings = { roadAmbush: false };
    S.inv = { wood: 80, vine: 60, hay: 10, wheat: 10 };
    Game.buildFurniture('pen'); Game.buildFurniture('coop');
    Game.addSheep(); Game.addChick();
    S.traps = { placed: 1, day: 1 };
    // 手造一份"有收获"的晨报，直接看弹窗长什么样
    S.day = 9;
    S.dailyReport = { day: 9, ranch: { enabled:true, autoFeed:true, pen:1, coop:1, hayUsed:1, wool:1, lackHay:0, wheatUsed:1, egg:1, lackWheat:0, grown:0, meat:0, deadSheep:0, deadHen:0, parts:['羊吃草 1（羊毛+1）','鸡吃小麦 1（鸡蛋+1）'] }, trap: { caught: true, placed: 1, done: false } };
    return 1;
  })()`);
  // 打开晨报弹窗：直接改 S.dailyReport 后调 newDay 太重，用 Game 提供的入口不可行（私有）。
  // 改为：让一天自然过去（牧场有产出 → 会弹）
  const shown = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    // 陷阱是 50% 概率，这里固定随机数让"捕到羊羔"必定发生（否则这条断言会时好时坏）
    const R = Math.random; Math.random = () => 0.01;
    Game.addMin(24 * 60);
    Math.random = R;
    await w(700);
    const m = document.querySelector('#modal');
    const S = Game.S();
    return { 开着: m ? m.classList.contains('open') : false, 内容: (m ? m.textContent.replace(/\\s+/g,' ') : ''), 按钮: [...document.querySelectorAll('#modal button')].map(b => b.textContent.trim().slice(0,22)),
             打点: { 有report: !!S.dailyReport, rep: JSON.stringify(S.dailyReport || null).slice(0, 220), 天数: S.day },
             原始HTML: (m ? m.innerHTML.replace(/\\s+/g,' ') : '').slice(0, 400) };
  })()`);
  console.log('① 晨报弹窗');
  console.log('   打点=' + JSON.stringify(shown.打点));
  console.log('   原始HTML=' + shown.原始HTML);
  console.log('   开着=' + shown.开着 + '  按钮=' + JSON.stringify(shown.按钮));
  console.log('   全文=' + shown.内容);
  ck('★ 过一天后弹出晨报', shown.开着 && /晨报/.test(shown.内容), shown.内容.slice(0, 40));
  ck('★ 弹窗里列出了牧场消耗与产量', /吃干草/.test(shown.内容) && /产羊毛/.test(shown.内容));
  ck('★ 弹窗里有陷阱情况与两个选择', /草地陷阱/.test(shown.内容) && /杀灭/.test(shown.内容) && /放回羊圈/.test(shown.内容));
  await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'daily_report.png'), Buffer.from(x.data, 'base64')));
  // 点"杀灭"
  const killed = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const b = [...document.querySelectorAll('#modal button')].find(x => /杀灭/.test(x.textContent));
    if (!b) return { err: '没有杀灭按钮' };
    const m0 = Game.invCount('meat'), h0 = Game.invCount('hide');
    b.click(); await w(800);
    return { 肉: Game.invCount('meat') - m0, 皮: Game.invCount('hide') - h0, 弹窗还开着: (document.querySelector('#modal')||{}).classList.contains('open') };
  })()`);
  console.log('   点「杀灭」: ' + JSON.stringify(killed));
  ck('★ 点杀灭后拿到兽肉×2、兽皮×1', killed.肉 === 2 && killed.皮 === 1, JSON.stringify(killed));

  console.log('');
  console.log('② 地图：进地图不做自动居中，热点严格钉在地图坐标上（整张岛靠拖）');
  const cen = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const c = document.querySelector('#modal #modal-close'); if (c) c.click(); await w(400);
    const out = [];
    for (const sc of ['forest','desert','peak','camp','cave','quarry']) {
      Game.S().stats.stamina = 99999;
      Game.S().settings = { roadAmbush: false };
      if (sc === 'peak') { Game.addItem('furCoat', 1, true); Game.S().equipment.cloth = 'furCoat'; }
      Game.S().scene = sc; Game.S().zone = null;
      const nav = document.querySelector('#nav [data-nav="map"]'); if (nav) nav.click();
      await w(900);
      const img = document.querySelector('#map-img');
      const ir = img.getBoundingClientRect();
      const el = document.querySelector('#map-arrows .map-arrow[data-scene="' + sc + '"]');
      // 反推"地图内 y%"：热点必须始终落在它自己在地图上的百分比位置（不因切场景被搬动）
      let pctFromTop = null;
      if (el && ir.height) { const r = el.getBoundingClientRect(); pctFromTop = +(((r.bottom - ir.top) / ir.height) * 100).toFixed(1); }
      out.push({ 场景: sc, 反推地图内y: pctFromTop,
                 地图高: Math.round(ir.height),
                 地图在不在原位: Math.abs(parseFloat(img.style.top) - (document.querySelector('#map-wrap').clientHeight - ir.height) / 2) <= 1 });
    }
    return out;
  })()`);
  (cen || []).forEach(x => console.log('   ' + x.场景 + ' 地图内 y=' + x.反推地图内y + '%  地图高=' + x.地图高 + '  未平移=' + x.地图在不在原位));
  // 期望值（与 data.js 的 MAP_ARROWS 一致）
  const WANT = { forest: 44, desert: 44, peak: 14, camp: 88, cave: 32, quarry: 84 };
  const wrongSpot = (cen || []).filter(x => x.反推地图内y === null || Math.abs(x.反推地图内y - WANT[x.场景]) > 2);
  ck('★ 热点严格钉在自己的地图坐标上（切场景不会被搬到画面中间）',
     wrongSpot.length === 0,
     wrongSpot.length ? wrongSpot.map(x => x.场景 + ' 期望' + WANT[x.场景] + '% 实际' + x.反推地图内y + '%').join(', ') : '6 个全部符合');
  ck('★ 进地图不做自动居中（地图停在中立位置，谁都不送）',
     (cen || []).every(x => x.地图在不在原位 === true),
     (cen || []).filter(x => !x.地图在不在原位).map(x => x.场景).join(',') || '全部未平移');
  ck('★ 地图比视口高（要拖才看得全）', (cen || []).every(x => x.地图高 > 400), '地图高 ' + ((cen[0] || {}).地图高 || '?'));
  await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'map_no_center.png'), Buffer.from(x.data, 'base64')));
  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');

  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('');
  console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  console.log('截图 → ' + OUT);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
