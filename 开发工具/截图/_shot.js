/* 开发用截图工具：无头 Chrome + CDP（不依赖 puppeteer）
   用法：node _shot.js            截图到 _shots\ 目录
   只读取游戏、不改游戏文件；用来替代"我没法自己看画面"。 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\开发工具\\截图\\截图输出';
const PORT = 9333;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_shot_profile_' + process.pid);

const sleep = ms => new Promise(r => setTimeout(r, ms));

function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let b = '';
      res.on('data', c => (b += c));
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE,
    '--window-size=1600,900', 'about:blank',
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try {
      const list = await getJSON('http://127.0.0.1:' + PORT + '/json/list');
      target = list.find(t => t.type === 'page');
    } catch (e) { /* 还没起来 */ }
  }
  if (!target) { chrome.kill(); throw new Error('Chrome 没起来'); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const send = (method, params) => new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, m => (m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result)));
    ws.send(JSON.stringify({ id: i, method, params: params || {} }));
  });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(expr.slice(0, 60) + ' → ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
    return r.result && r.result.value;
  };
  const shot = async (name, w, h) => {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    await sleep(700);
    await evaluate('window.dispatchEvent(new Event("resize"))');
    await sleep(700);
    const r = await send('Page.captureScreenshot', { format: 'png' });
    const f = path.join(OUT, name + '.png');
    fs.writeFileSync(f, Buffer.from(r.data, 'base64'));
    console.log('shot', f);
  };

  await send('Page.enable');
  await send('Runtime.enable');
  const url = 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html');
  await send('Page.navigate', { url });
  await sleep(2500);

  // 开局：新的旅程 → 身份 → 难度
  await evaluate(`(async () => {
    const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
    const wait = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await wait(400);
    clk('.identity'); await wait(400);
    clk('.identity'); await wait(400);
    clk('.identity'); await wait(1200);
    return !!(window.Game && Game.S());
  })()`);
  await sleep(800);

  await evaluate(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const S = Game.S();
    S.weather = 'sun'; S.buildings.watch = 3; S.buildings.house = 2; S.furniture['bed2'] = 1;
    S.tut = null;                       // 新手引导条也关掉，别挡画面
    Game.travel('camp'); await wait(300);
    document.querySelector('#nav [data-nav="map"]').click(); await wait(300);
    document.querySelector('#nav [data-nav="map"]').click(); await wait(300);
    // 关掉序章/其它弹窗
    for (let i = 0; i < 8; i++) {
      const b = document.querySelector('#modal .modal-actions button, #modal #modal-close, #modal .modal-x');
      if (!b) break;
      b.click(); await wait(250);
    }
    S.tut = null;
    return 'ready';
  })()`);

  await shot('scene_clear_16x9', 1280, 720);
  await shot('scene_clear_wide', 2340, 1080);

  await evaluate(`(async () => { Game.S().weather = 'rain'; return 1; })()`);
  await evaluate(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('#nav [data-nav="map"]').click(); await wait(400);
    document.querySelector('#btn-backmap').click(); await wait(600);
    return 'scene-rain';
  })()`);
  await shot('scene_rain_16x9', 1280, 720);
  await shot('scene_rain_wide', 2340, 1080);

  await evaluate(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('#nav [data-nav="map"]').click(); await wait(800);
    return 'map-rain';
  })()`);
  await shot('map_island_rain_16x9', 1280, 720);
  await shot('map_island_rain_wide', 2340, 1080);
  // 探针：从营地上来的地图，营地那支箭头到底在哪？
  for (const [pw, ph] of [[1920, 1080], [1600, 900], [1280, 720], [2340, 1080]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: pw, height: ph, deviceScaleFactor: 1, mobile: false });
    await sleep(300);
    await evaluate('window.dispatchEvent(new Event("resize"))');
    await sleep(300);
    console.log('probe ' + pw + 'x' + ph, await evaluate(`(() => {
      const w = document.querySelector('#map-wrap').getBoundingClientRect();
      const a = [...document.querySelectorAll('#map-arrows .map-arrow')].map(e => {
        const r = e.getBoundingClientRect();
        const lab = (e.querySelector('.arrow-label') || {}).textContent || '';
        return lab.slice(0, 3) + (e.classList.contains('offscreen') ? '✗' : '✓') + '[' + Math.round(r.top - w.top) + '~' + Math.round(r.bottom - w.top) + ']';
      });
      return '舞台高' + Math.round(w.height) + ' ' + a.join(' ');
    })()`));
  }
  // 拖动地图：模拟按住空白处往上拖 → 看被藏起来的箭头会不会回来
  console.log('drag', await evaluate(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const wrap = document.querySelector('#map-wrap');
    const r = wrap.getBoundingClientRect();
    const ev = (t, y) => new PointerEvent(t, { bubbles: true, clientX: r.left + 40, clientY: y, pointerId: 1 });
    const hidden0 = document.querySelectorAll('#map-arrows .map-arrow.offscreen').length;
    wrap.dispatchEvent(ev('pointerdown', r.top + 500));
    wrap.dispatchEvent(ev('pointermove', r.top + 560));
    wrap.dispatchEvent(ev('pointermove', r.top + 640));
    wrap.dispatchEvent(ev('pointerup', r.top + 640));
    await wait(400);
    const hidden1 = document.querySelectorAll('#map-arrows .map-arrow.offscreen').length;
    return '拖动前隐藏 ' + hidden0 + ' 个 → 拖动后 ' + hidden1 + ' 个';
  })()`));
  await shot('map_island_dragged_wide', 2340, 1080);
  // 行进虚线：点"树林"→前往，抓动画中间那一帧（看线的起终点是否压在箭头上）
  console.log('travel', await evaluate(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const a = [...document.querySelectorAll('.map-arrow')].find(e => e.textContent.includes('树林'));
    if (!a) return 'no-arrow';
    a.click(); await wait(350);
    const go = [...document.querySelectorAll('#modal button')].find(b => b.textContent.replace(/\\s/g,'') === '前往');
    if (!go) return 'no-go';
    go.click(); await wait(120);
    const line = document.querySelector('.travel-layer line');
    if (!line) return 'no-line';
    const box = document.querySelector('#map-arrows').getBoundingClientRect();
    const t = [...document.querySelectorAll('.map-arrow')].find(e => e.textContent.includes('树林')).getBoundingClientRect();
    const ex = box.left + parseFloat(line.getAttribute('x2')), ey = box.top + parseFloat(line.getAttribute('y2'));
    return '箭头锚点=(' + Math.round(t.left + t.width / 2) + ',' + Math.round(t.bottom) + ')  线终点=(' + Math.round(ex) + ',' + Math.round(ey) + ')';
  })()`));
  await sleep(180);
  await shot('map_island_travel_wide', 2340, 1080);
  // 咔哒声：真派发 pointerdown（click() 不会触发 pointerdown 监听）
  console.log('sfx', await evaluate(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const calls = [];
    const orig = AudioFX.play;
    AudioFX.play = s => { calls.push(s); try { return orig(s); } catch (e) {} };
    const fire = sel => { const e = document.querySelector(sel); if (e) e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); };
    fire('#nav [data-nav="inv"]'); await wait(80);
    fire('#nav [data-nav="craft"]'); await wait(80);
    fire('#btn-backmap'); await wait(80);
    const hs = document.querySelector('.hotspot:not(.locked)');
    const info = hs ? (hs.className + '｜' + hs.textContent.slice(0, 8)) : '无热点';
    if (hs) { hs.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await wait(120); }
    AudioFX.play = orig;
    return calls.join(',') + '  (' + info + ')';
  })()`));
  // 日志：能滚 + 点日志上压着的热点会把这一下转发给热点
  console.log('log', await evaluate(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const body = document.querySelector('#logbody');
    const scrollable = body.scrollHeight > body.clientHeight + 2;
    body.scrollTop = body.scrollHeight; await wait(60);
    const atBottom = body.scrollTop > 0;
    body.scrollTop = 0; await wait(60);
    const scrolled = body.scrollTop >= 0 && body.scrollHeight > 0;
    const hs = [...document.querySelectorAll('.hotspot')].find(h => h.textContent.includes('储物箱'))
            || document.querySelector('.hotspot:not(.locked)');
    if (!hs) return '可滚=' + scrollable + ' 但场景里没热点';
    const r = hs.getBoundingClientRect();
    body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 7 }));
    await wait(300);
    const modal = document.querySelector('#modal');
    return '日志可滚=' + scrollable + ' 拖到底=' + atBottom + ' ｜ 转发热点「' + hs.textContent.trim().slice(0, 6) + '」→ 弹窗=' + (modal && modal.innerHTML.length > 40 ? '开了' : '没开');
  })()`));
  // 日志贴底 + 真的能滚（灌 45 行再量）
  console.log('log2', await evaluate(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const m = document.querySelector('#modal'); if (m) m.innerHTML = '';
    const body = document.querySelector('#logbody');
    for (let i = 0; i < 45; i++) {
      const d = document.createElement('div');
      d.className = 'logline'; d.textContent = '第10天 09:' + String(i % 60).padStart(2, '0') + ' 测试日志行 ' + i + '：用来量一量日志到底能不能滚、最新一行有没有贴底。';
      body.appendChild(d);
    }
    await wait(120);
    const overflow = body.scrollHeight > body.clientHeight + 2;
    body.scrollTop = body.scrollHeight; await wait(80);
    const lines = body.querySelectorAll('.logline');
    const last = lines[lines.length - 1].getBoundingClientRect();
    const bb = body.getBoundingClientRect();
    const gapBottom = Math.round(bb.bottom - last.bottom);
    body.scrollTop = 0; await wait(80);
    const atTop = body.scrollTop;
    const first = lines[0].getBoundingClientRect();
    const btn = document.querySelector('#btn-backmap').getBoundingClientRect();
    return '可滚=' + overflow + ' 最新一行离底=' + gapBottom + 'px ｜ 滚到顶scrollTop=' + Math.round(atTop) + ' 首行顶部=' + Math.round(first.top) + ' 返回按钮下沿=' + Math.round(btn.bottom);
  })()`));
  await shot('log_check_16x9', 1280, 720);
  // 亚克兰蒂斯大地图（直接给装备，走正常接口过去）
  await evaluate(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    Game.travel('camp'); await wait(400);   // 前面测试走到树林了，先回营地再下海
    Game.addItem('seachart', 1, true); Game.addItem('diveSuit', 1, true); Game.addItem('diveMask', 1, true);
    Game.equip('diveSuit'); Game.equipTool('diveMask');
    Game.travel('atlantis'); await wait(500);
    document.querySelector('#nav [data-nav="map"]').click(); await wait(800);
    return Game.S().scene;
  })()`);
  await shot('map_atlantis_16x9', 1280, 720);
  await shot('map_atlantis_wide', 2340, 1080);
  // 竖屏兜底：不应该只剩中间一条
  await evaluate(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); Game.travel('camp'); await w(500); document.querySelector('#nav [data-nav="map"]').click(); await w(500); return 1; })()`);
  await shot('map_island_portrait', 800, 1400);
  // 手机横屏（844×390）：底栏 20px 的实机样子
  await shot('map_island_phone', 844, 390);
  await evaluate(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); Game.S().weather = 'rain'; document.querySelector('#btn-backmap').click(); await w(700); return 1; })()`);
  await shot('scene_rain_phone', 844, 390);

  // ---------- 主界面菜单 / 设置面板 / 图鉴（账号级） / 日志隐藏 ----------
  await send('Page.navigate', { url });
  await sleep(2500);
  await shot('title', 1280, 720);
  await shot('title_phone', 390, 844);
  await shot('title_phone_landscape', 844, 390);
  await shot('title_tablet', 820, 1180);
  await shot('title', 1280, 720);
  console.log('title', await evaluate(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const hasSet = !!document.querySelector('#btn-set');
    document.querySelector('#btn-set').click(); await w(400);
    document.querySelector('#modal [data-open="collection"]').click(); await w(500);
    const colOpen = !!document.querySelector('#modal .col-body');
    return '设置按钮=' + hasSet + ' 不开局看图鉴=' + colOpen;
  })()`));
  await shot('title_collection', 1280, 720);
  await evaluate(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); document.querySelector('#modal #modal-close').click(); await w(300); document.querySelector('#btn-set').click(); await w(400); return 1; })()`);
  await shot('title_settings', 1280, 720);
  await evaluate(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); document.querySelector('[data-set="log:hidden"]').click(); await w(300); return localStorage.getItem('guyuyizhang_logmode'); })()`);
  await send('Page.navigate', { url });
  await sleep(2200);
  await evaluate(`(async () => {
    const clk = s => { const e = document.querySelector(s); if (e) e.click(); };
    const wait = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(1400);
    return 1;
  })()`);
  await shot('game_log_hidden', 1280, 720);
  console.log('logmode', await evaluate(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const log = document.querySelector('#log');
    const hiddenOk = getComputedStyle(log).display === 'none';
    return '隐藏模式生效=' + hiddenOk;
  })()`));
  await evaluate(`localStorage.setItem('guyuyizhang_logmode','fade')`);
  await sleep(200);
  await evaluate(`window.dispatchEvent(new Event('resize'))`);
  await sleep(3600);
  await shot('game_log_faded', 1280, 720);

  // ---------- v1.06 反馈项实测 ----------
  await send('Page.navigate', { url });
  await sleep(2200);
  await evaluate(`(async () => {
    const clk = s => { const e = document.querySelector(s); if (e) e.click(); };
    const wait = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(1400);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await wait(250); }
    const S = Game.S(); S.tut = null; S.buildings.watch = 3; S.weather = 'sun';
    document.querySelector('#nav [data-nav="map"]').click(); await wait(700);
    return 1;
  })()`);
  // 大地图：宽屏下把出界热点贴边显示
  await send('Emulation.setDeviceMetricsOverride', { width: 2340, height: 1080, deviceScaleFactor: 1, mobile: false });
  await sleep(500);
  await evaluate('window.dispatchEvent(new Event("resize"))');
  await sleep(700);
  console.log('pinned', await evaluate(`(() => {
    const all = [...document.querySelectorAll('#map-arrows .map-arrow')];
    const pin = all.filter(a => a.classList.contains('pinned'));
    return '共 ' + all.length + ' 个热点，贴边 ' + pin.length + ' 个：' + pin.map(a => a.textContent.trim().slice(0,6)).join('、');
  })()`));
  await shot('map_pinned_labels', 2340, 1080);
  // 日志栏收起按钮
  console.log('loggrip', await evaluate(`(() => {
    const g = document.getElementById('log-grip');
    if (!g) return '没有收起按钮 ✗';
    const before = document.body.classList.contains('log-collapsed');
    g.click();
    const after = document.body.classList.contains('log-collapsed');
    return '按钮存在 ✓ 点击后 collapsed: ' + before + ' → ' + after;
  })()`));
  await sleep(300);
  await shot('log_collapsed', 2340, 1080);
  await evaluate(`document.getElementById('log-grip').click()`);   // 展开回来
  // 多目标战斗：目标列表吸顶 + 白框
  console.log('battle', await evaluate(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    Game.addItem('ironSword', 1, true); Game.S().equipment.weapon = 'ironSword';
    Game.startFight(ENEMIES.tentacle);
    await wait(500);
    const tg = document.querySelector('#fight-targets');
    if (!tg) return '没进战斗';
    const n = tg.querySelectorAll('.target').length;
    const buttons = [...document.querySelectorAll('#fight-btns button')].map(b => b.textContent.trim());
    const atk = [...document.querySelectorAll('#fight-btns button')].find(b => /攻击/.test(b.textContent));
    if (atk) atk.click();
    await wait(400);
    const sel = tg.querySelectorAll('.target.selected').length;
    const sticky = getComputedStyle(tg).position;
    const second = tg.querySelectorAll('.target')[1];
    if (second) second.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await wait(200);
    return '目标数 ' + n + ' ｜ 按钮 ' + buttons.join('/') + ' ｜ 点攻击后 selected=' + sel + ' ｜ 血条列表 position=' + sticky;
  })()`));
  await shot('battle_multi_target', 1280, 720);

  // ---------- 山顶祭坛仪式按钮（iPad 尺寸实测） ----------
  await send('Page.navigate', { url });
  await sleep(2200);
  await evaluate(`(async () => {
    const clk = s => { const e = document.querySelector(s); if (e) e.click(); };
    const wait = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(1400);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await wait(250); }
    const st = Game.S(); st.tut = null;
    Game.addItem('relic', 1, true); Game.addItem('slate', 3, true); Game.addItem('dragonbone', 1, true);
    Game.addItem('furCoat', 1, true); st.equipment.cloth = 'furCoat';   // 山顶要保暖 ≥4 才让上去
    st.buildings.watch = 3; st.buildings.house = 3; st.stats.stamina = 900;
    Game.travel('peak'); await wait(800);
    return '场景=' + Game.S().scene + ' 保暖=' + Game.warmth();
  })()`);
  for (const [pw, ph, tag] of [[1280, 720, '16x9'], [1180, 820, 'ipad_air'], [1024, 768, 'ipad_old']]) {
    await send('Emulation.setDeviceMetricsOverride', { width: pw, height: ph, deviceScaleFactor: 1, mobile: false });
    await sleep(400);
    await evaluate('window.dispatchEvent(new Event("resize"))');
    await sleep(500);
    console.log('peak ' + tag, await evaluate(`(() => {
      const box = document.querySelector('#scene-actions');
      const btn = [...document.querySelectorAll('#scene-actions button')].map(b => {
        const r = b.getBoundingClientRect();
        return b.textContent.trim() + '@[' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ']';
      });
      const r2 = box ? box.getBoundingClientRect() : null;
      return '场景=' + Game.S().scene + ' 有按钮:' + (btn.length ? btn.join(' / ') : '（无）') +
        ' ｜ 容器=' + (r2 ? '[' + Math.round(r2.left) + ',' + Math.round(r2.top) + ']' : 'null') +
        ' ｜ 素材=' + JSON.stringify({ slate: Game.invCount('slate'), relic: Game.invCount('relic'), bone: Game.invCount('dragonbone') });
    })()`));
    await shot('peak_' + tag, pw, ph);
  }
  // 模拟"遗物早就在祭坛拿过了"的存档：热点应该重新亮起、并且能直接举行仪式
  console.log('altar', await evaluate(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const st = Game.S(); st.flags = st.flags || {}; st.flags['pt_peak_altar'] = 1;
    Game.travel('camp'); await wait(400); Game.travel('peak'); await wait(700);
    const hs = [...document.querySelectorAll('.hotspot')].map(h => h.textContent.trim() + (h.classList.contains('altar-ready') ? '★' : ''));
    return '山顶热点: ' + hs.join(' / ');
  })()`));
  await shot('peak_altar_ready', 1180, 820);
  console.log('altarClick', await evaluate(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const hs = [...document.querySelectorAll('.hotspot')].find(h => h.textContent.includes('祭坛'));
    if (!hs) return '没找到祭坛热点';
    hs.click(); await wait(500);
    const btns = [...document.querySelectorAll('#modal button')].map(b => b.textContent.trim());
    return '弹窗按钮: ' + btns.join(' / ');
  })()`));
  await shot('peak_altar_modal', 1180, 820);

  ws.close();
  chrome.kill();
  await sleep(400);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('done →', OUT);
}

main().catch(e => { console.error('ERR', e.message); process.exit(1); });
