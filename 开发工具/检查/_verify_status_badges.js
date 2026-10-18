/* 负面状态徽标复核（作者 2026-09-23 反馈"负面状态怎么还是没有显示"）

   根因是 CSS：窄屏媒体查询里写着 `#status-badges { display: none; }`，
   手机/平板（≤900px 宽 或 ≤500px 高）整条状态徽标被隐藏，
   中毒/流血/寒冷/中暑/恐惧/精神低落/水压/缺氧 在发布的主平台上一个都看不见。

   本探针在真实 Chrome 里按手机尺寸跑，断言"算得出来 **并且** 画得出来"：
   display 不是 none、徽标真在视口内、贴在顶栏下沿、不遮邮箱按钮、全程无 JS 报错。 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = process.env.GUYU_GAME_ROOT || 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_out', 'statusbadges');
const PORT = 9493;
const PROFILE = path.join(os.tmpdir(), 'guyu_badge_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });
let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };

// 竖屏手机是主平台，必须覆盖；横屏与桌面同时回归，防止"修好手机弄坏桌面"
const SIZES = [
  { n: 'iPhone 竖屏', w: 390, h: 844, mobile: true },
  { n: 'iPhone 横屏', w: 844, h: 390, mobile: true },
  { n: '小屏横屏', w: 667, h: 375, mobile: true },
  { n: '桌面', w: 1280, h: 720, mobile: false },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, 'about:blank'], { stdio: 'ignore' });
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

  for (const s of SIZES) {
    await send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 1, mobile: !!s.mobile });
    // 各视口独立开局；上一个视口的测试存档不能触发「覆盖旧档」确认弹窗。
    await ev(`try { localStorage.clear(); } catch (_) {}`);
    await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
    await sleep(2600);

    // 开新局并塞进"一整套负面状态"
    const boot = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      Game.newGame('fisher','normal'); UI.begin(); await w(700);
      for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
      const S = Game.S(); if (!S) return 'no-state';
      S.tut = null; S.buildings.watch = 3; S.stats.stamina = 99999;
      S.statuses.poison = 3; S.statuses.bleed = 2; S.statuses.fear = 1;
      S.day = 46; S.scene = 'peak'; S.equipment.cloth = null;
      S.stats.spirit = 10;
      return 'ok';
    })()`);
    if (boot !== 'ok') { ck(s.n + '：开局成功', false, String(boot)); continue; }

    // 触发一次重绘（切到背包再切回场景，renderAll 会重画顶栏）
    await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const n1 = document.querySelector('#nav [data-nav="bag"]'); if (n1) n1.click(); await w(350);
      const n2 = document.querySelector('#nav [data-nav="scene"]') || document.querySelector('#nav [data-nav="map"]'); if (n2) n2.click(); await w(900);
      return 1;
    })()`);

    const r = await ev(`(() => {
      const wrap = document.querySelector('#status-badges');
      if (!wrap) return { 没有容器: true };
      const weather = document.querySelector('#top-weather');
      const temp = document.querySelector('#top-temperature');
      const cs = getComputedStyle(wrap);
      const tb = document.querySelector('#topbar').getBoundingClientRect();
      const mb = document.querySelector('#btn-mail');
      const mr = mb ? mb.getBoundingClientRect() : null;
      const badges = [...wrap.querySelectorAll('.badge')];
      const rects = badges.map(b => { const q = b.getBoundingClientRect(); return { t: b.textContent, x: Math.round(q.left), y: Math.round(q.top), r: Math.round(q.right), b: Math.round(q.bottom), w: Math.round(q.width), h: Math.round(q.height) }; });
      const vw = innerWidth, vh = innerHeight;
      const 出界 = rects.filter(q => q.x < 0 || q.y < 0 || q.r > vw + 1 || q.b > vh + 1 || q.w === 0 || q.h === 0);
      const 遮邮箱 = mr ? rects.filter(q => q.x < mr.right && q.r > mr.left && q.y < mr.bottom && q.b > mr.top) : [];
      const wr = wrap.getBoundingClientRect();
      // 别把「当前目标」和左上角日志的第一行盖住（徽标条是浮层，压在它们上面就得不偿失）
      const hit = (q, o) => o && q.x < o.right && q.r > o.left && q.y < o.bottom && q.b > o.top;
      const ob = document.querySelector('#objective');
      const obr = (ob && ob.textContent.trim()) ? ob.getBoundingClientRect() : null;
      const 遮目标 = obr ? rects.filter(q => hit(q, obr)) : [];
      const l1 = document.querySelector('#logbody .logline');
      const l1r = l1 ? l1.getBoundingClientRect() : null;
      const 遮日志 = l1r ? rects.filter(q => hit(q, l1r)) : [];
      return {
        display: cs.display, visibility: cs.visibility, opacity: cs.opacity, pointerEvents: cs.pointerEvents,
        顶栏上沿: Math.round(tb.top), 顶栏下沿: Math.round(tb.bottom),
        徽标条上沿: Math.round(wr.top), 徽标条下沿: Math.round(wr.bottom), 徽标条高: Math.round(wr.height),
        视口: vw + 'x' + vh,
        数量: rects.length, 文本: rects.map(q => q.t), 出界: 出界.map(q => q.t), 遮邮箱: 遮邮箱.map(q => q.t),
        遮目标: 遮目标.map(q => q.t), 遮日志: 遮日志.map(q => q.t),
        气温:temp?.textContent, 气温位置正确:weather?.nextElementSibling === temp && !!temp?.nextElementSibling?.classList.contains('stat'),
      };
    })()`);

    // 手机与桌面统一将所有 buff 放在状态栏下方的场景右上角。
    const narrow = s.w <= 900 || s.h <= 500;

    console.log('\n【' + s.n + ' ' + s.w + 'x' + s.h + '】' + (narrow ? '（窄屏布局）' : '（桌面布局）') + ' ' + JSON.stringify(r));
    if (r.没有容器) { ck(s.n + '：#status-badges 容器存在', false); continue; }

    ck(s.n + '：状态徽标没被 CSS 隐藏', r.display !== 'none' && r.visibility !== 'hidden' && r.opacity !== '0', 'display=' + r.display);
    ck(s.n + '：冷热统一徽标与其他负面状态全部渲染', r.数量 >= 4 &&
      ['流血', '中毒', '寒冷', '恐惧'].every(k => r.文本.some(t => t.indexOf(k) === 0)), r.文本.join(' / '));
    ck(s.n + '：天气与生命之间显示摄氏气温', r.气温位置正确 && /^-?\d+℃$/.test(r.气温 || ''), r.气温);
    ck(s.n + '：精神恍惚也显示出来', r.文本.some(t => t.indexOf('精神恍惚') === 0));
    ck(s.n + '：每个徽标都完整落在视口内', r.出界.length === 0, r.出界.join(',') || '无出界');
    if (narrow) {
      ck(s.n + '：徽标条贴在顶栏下沿（不压住状态条）', r.徽标条上沿 >= r.顶栏下沿 - 1, '顶栏底 ' + r.顶栏下沿 + ' → 徽标顶 ' + r.徽标条上沿);
    } else {
      ck(s.n + '：徽标位于顶栏下方场景内', r.徽标条上沿 >= r.顶栏下沿 - 1,
        '顶栏 ' + r.顶栏上沿 + '~' + r.顶栏下沿 + ' / 徽标 ' + r.徽标条上沿 + '~' + r.徽标条下沿);
    }
    ck(s.n + '：徽标不遮邮箱按钮', r.遮邮箱.length === 0, r.遮邮箱.join(',') || '无遮挡');
    ck(s.n + '：徽标不遮「当前目标」', r.遮目标.length === 0, r.遮目标.join(',') || '无遮挡');
    ck(s.n + '：徽标不遮左上角日志', r.遮日志.length === 0, r.遮日志.join(',') || '无遮挡');

    // 截图用于检查实际排版；加载提示与竖屏旋转提示会盖住 DOM，截图时临时隐藏它们。
    await ev(`(() => { const loading=document.querySelector('#loading'); if(loading) loading.style.display='none';
      const style=document.createElement('style'); style.textContent='html::after{display:none!important}'; document.head.appendChild(style); return true; })()`);
    await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'badge_' + s.w + 'x' + s.h + '.png'), Buffer.from(x.data, 'base64')));
  }

  // ---- 水下负面状态（水压 / 缺氧）：以前根本不在徽标列表里 ----
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await ev(`try { localStorage.clear(); } catch (_) {}`);
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2600);
  // ⚠️ 必须先真的开一局 —— 上一次这里是直接 Game.S()，标题页还没有 state，拿到 null 报 'no state'
  const dboot = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    Game.newGame('fisher','normal'); UI.begin(); await w(700);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
    const S = Game.S(); if (!S) return 'no-state';
    S.tut = null;
    return 'ok';
  })()`);
  const dive = dboot === 'ok' ? await ev(`(() => {
    const out = {};
    const S = Game.S(); if (!S) return { __err: 'no state' };
    S.equipment.cloth = null; S.toolkit = []; S.inv.diveMask = 0;
    S.scene = 'atlantis'; S.zone = 'coral';
    out.无衣无罩 = Game.diveWarn();
    S.equipment.cloth = 'diveSuit';
    out.有衣无罩 = Game.diveWarn();
    S.toolkit = ['diveMask'];
    out.衣罩齐全 = Game.diveWarn();
    S.zone = 'habitat';
    out.栖息地 = Game.diveWarn();
    out.导出存在 = typeof Game.diveWarn === 'function';
    return out;
  })()`) : { __err: 'dive 开局失败:' + dboot };
  console.log('\n【水下状态 diveWarn()】 ' + JSON.stringify(dive));
  if (dive && !dive.__err) {
    ck('diveWarn 已导出到 UI 层', dive.导出存在 === true);
    ck('水下·无衣无罩 → 水压 + 缺氧 都报警', dive.无衣无罩.pressure === true && dive.无衣无罩.o2 === true, JSON.stringify(dive.无衣无罩));
    ck('水下·穿上潜水服 → 水压解除，缺氧仍在', dive.有衣无罩.pressure === false && dive.有衣无罩.o2 === true, JSON.stringify(dive.有衣无罩));
    ck('水下·衣罩齐全 → 都不报警', dive.衣罩齐全.pressure === false && dive.衣罩齐全.o2 === false, JSON.stringify(dive.衣罩齐全));
    ck('礁石栖息地是安全点，不报警', dive.栖息地.pressure === false && dive.栖息地.o2 === false, JSON.stringify(dive.栖息地));
  } else {
    ck('diveWarn 可调用', false, JSON.stringify(dive));
  }

  const attrTemperature = await ev(`(async () => {
    const w=ms=>new Promise(r=>setTimeout(r,ms));
    const S=Game.S();S.scene='camp';S.zone=null;S.day=1;S.weather='sun';Game.change();await w(250);
    document.querySelector('#modal .modal-x')?.click();
    document.querySelector('#nav [data-nav="equip"]')?.click();await w(300);
    document.querySelector('#modal [data-equiptab="attr"]')?.click();await w(350);
    return [...document.querySelectorAll('#modal .attr-left .help-item')].map(x=>x.textContent.trim()).filter(x=>/环境温度|自身温度/.test(x));
  })()`);
  ck('装备属性页列出环境温度与随环境变化的自身温度',
    attrTemperature.some(x=>/环境温度.*℃/.test(x)) && attrTemperature.some(x=>/自身温度.*℃/.test(x)), JSON.stringify(attrTemperature));

  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');
  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('\n通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
