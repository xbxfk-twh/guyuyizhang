/* 皮肤包「可多选」复核（作者 2026-09-23："皮肤包改成可多选吧"）

   旧行为是单选：4 套各 50 魂点，花 200 点却只能用 1 套。
   新行为是各开各的开关，因为它们改的根本不是同一件东西：
     · armory   → 装备图集那 16 件加 equipment-colored 类
     · accent   → body.skin-accent（界面配色）
     · seasons  → 孤岛地图/场景去掉 grayscale
     · card     → 人物立绘走 identities-card 目录
   本探针在真实 Chrome 里把这四路效果**逐个落到 DOM 上验证**，而不是只信源码字符串。 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = process.env.GUYU_GAME_ROOT || 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_out', 'skins');
const PORT = 9501;
const PROFILE = path.join(os.tmpdir(), 'guyu_skin_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });
let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };

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
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 320) }; return r.result && r.result.value; };
  const url = 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html');

  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  await sleep(2600);

  // ---- 开局 + 解锁全部 4 套皮肤，然后把 localStorage 写成**老格式的单字符串**，重载看迁移 ----
  const boot = await ev(`(async () => {
    const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(1600);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
    const S = Game.S(); if (!S) return 'no-state';
    S.tut = null; S.capacity = 999;
    Game.metaState().soul = 999;
    ['armory','seasons','accent','card'].forEach(id => Game.unlockSkin(id));
    Game.addItem('spear', 1, true);          // 装备图集里的一件，用来看 armory 上色
    localStorage.setItem('guyuyizhang_skin', 'accent');   // ← 老格式：裸字符串
    return { owned: ['armory','seasons','accent','card'].map(id => Game.skinOwned(id)) };
  })()`);
  console.log('\n开局/解锁：' + JSON.stringify(boot));
  ck('四套皮肤都已解锁', Array.isArray(boot.owned) && boot.owned.every(Boolean), JSON.stringify(boot));

  await send('Page.navigate', { url });
  await sleep(2600);

  // ---- ① 老格式迁移：'accent' 应被当成"只开了深海琥珀" ----
  const mig = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
    clk('#btn-new'); await w(300); clk('.identity'); await w(300); clk('.identity'); await w(300); clk('.identity'); await w(1500);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(180); }
    Game.S().tut = null; Game.S().capacity = 999; Game.addItem('spear', 1, true);
    return { accent: document.body.classList.contains('skin-accent'),
             存档值: localStorage.getItem('guyuyizhang_skin') };
  })()`);
  console.log('① 老格式迁移：' + JSON.stringify(mig));
  ck('① 老格式（裸字符串 accent）被读成"开了深海琥珀"', mig.accent === true, JSON.stringify(mig));

  // ---- ② 打开设置（游戏内路径：☰菜单 → ⚙设置），多选：把另外三套也一起点亮 ----
  const multi = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
    // ⚠️ #btn-set 只在**标题页**；游戏内进设置要 菜单(nav=save) → [data-savemenu=settings]
    clk('#nav [data-nav="save"]'); await w(600);
    const sm = document.querySelector('#modal [data-savemenu="settings"]');
    if (!sm) return { __err: '菜单里没有设置入口' };
    sm.click(); await w(700);
    const pick = (label) => [...document.querySelectorAll('#modal [data-set^="skin:"]')].find(b => b.textContent.includes(label));
    if (!pick('深海琥珀')) return { __err: '设置面板里找不到皮肤开关', 面板文本: (document.querySelector('#modal') || {}).textContent ? document.querySelector('#modal').textContent.slice(0, 80) : '' };
    const before = ['匠心彩绘','全彩地图包','深海琥珀','彩绘卡面'].map(n => { const b = pick(n); return b ? b.classList.contains('active') : null; });
    for (const n of ['匠心彩绘','全彩地图包','彩绘卡面']) { const b = pick(n); if (b && !b.classList.contains('active')) { b.click(); await w(400); } }
    const after = ['匠心彩绘','全彩地图包','深海琥珀','彩绘卡面'].map(n => { const b = pick(n); return b ? b.classList.contains('active') : null; });
    const 存档值 = localStorage.getItem('guyuyizhang_skin');
    // 作者 2026-09-25："皮肤包的介绍我感觉有点冗杂了，去掉吧" ——
    // 那一整段"匠心彩绘＝…；四季彩绘＝…；深海琥珀＝…；彩绘卡面＝…"的说明已经删掉。
    // 这里盯住"删的是说明、不是功能"：四个开关 + 墨白原味必须还在，而说明文字不许回来。
    const item = [...document.querySelectorAll('#modal .help-item')].find(x => /皮肤包/.test(x.textContent));
    // 旧结构是"两个 span"：第一行状态 + 第二段那是四条皮肤的说明。现在只该剩一个 span（状态行）。
    const 说明段数 = item ? item.querySelectorAll(':scope > span').length : -1;
    const skinBtns = [...document.querySelectorAll('#modal [data-set^="skin:"], #modal [data-set="skinoff:1"]')].map(b => b.textContent.trim());
    const 还有旧说明 = /匠心彩绘＝|全彩地图包＝|可以同时开多个/.test(item ? item.textContent : '');
    const mx = document.querySelector('#modal .modal-x'); if (mx) mx.click(); await w(400);
    return { 点前: before, 点后: after, 存档值: 存档值, 说明段数: 说明段数, 状态行: item ? (item.querySelector(':scope > span') || {}).textContent : '', 皮肤按钮: skinBtns, 还有旧说明: 还有旧说明 };
  })()`);
  console.log('② 设置面板多选：' + JSON.stringify(multi));
  ck('② 能进到游戏内设置面板', !multi.__err, multi.__err || '');
  ck('② 设置面板是"多选开关"而不是单选（可以同时 active）',
     Array.isArray(multi.点后) && multi.点后.filter(Boolean).length >= 4, JSON.stringify(multi.点后));
  ck('② 四套同时开启后存档里是数组', /^\[/.test(multi.存档值 || ''), multi.存档值);
  // 皮肤包说明已按作者要求精简：只留"当前：X" + 开关
  ck('★ ② 皮肤条目只剩「当前：…」+ 开关（冗杂说明已删：只剩 1 个说明 span）',
     multi.还有旧说明 === false && multi.说明段数 === 1 && /当前：/.test(multi.状态行 || ''),
     '说明段数 ' + multi.说明段数 + ' / 状态行「' + (multi.状态行 || '') + '」/ 旧说明残留=' + multi.还有旧说明);
  ck('★ ② 删的是说明、不是功能：4 套皮肤开关 + 墨白原味都还在',
     (multi.皮肤按钮 || []).length === 5 && (multi.皮肤按钮 || []).some(t => /墨白原味/.test(t)),
     (multi.皮肤按钮 || []).join(' / '));

  // ---- ③ 四路效果同时落到 DOM ----
  const eff = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
    const out = {};
    out.body类 = document.body.classList.contains('skin-accent');
    // 装备图集上色
    clk('#nav [data-nav="inv"]'); await w(700);
    out.装备上色 = !!document.querySelector('#modal .equipment-icon.equipment-colored');
    // 人物立绘走彩绘卡面目录
    clk('#nav [data-nav="equip"]'); await w(600);
    clk('#modal [data-equiptab="attr"]'); await w(600);
    const p = document.querySelector('#modal .attr-portrait');
    out.立绘 = p ? (p.getAttribute('src') || '') : null;
    // 孤岛地图彩色
    clk('#nav [data-nav="map"]'); await w(1300);
    const mi = document.querySelector('#map-img');
    out.地图 = mi ? (mi.getAttribute('src') || '') : null;
    out.地图灰度 = mi ? getComputedStyle(mi).filter : null;
    return out;
  })()`);
  console.log('③ 四路效果：' + JSON.stringify(eff));
  ck('③ 深海琥珀：body 上有 skin-accent', eff.body类 === true);
  ck('③ 匠心彩绘：装备图集带 equipment-colored', eff.装备上色 === true);
  ck('③ 彩绘卡面：立绘走 identities-card 目录', /identities-card\//.test(eff.立绘 || ''), eff.立绘);
  ck('③ 全彩地图包：孤岛地图用当前季节彩绘版（-color.png）', /-color\.png/.test(eff.地图 || ''), eff.地图);

  await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'skins-multi.png'), Buffer.from(x.data, 'base64')));

  // ---- ④ 关掉其中一个（再点一下），其余不受影响 ----
  const off = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
    clk('#nav [data-nav="save"]'); await w(600);
    document.querySelector('#modal [data-savemenu="settings"]').click(); await w(700);
    const pick = (label) => [...document.querySelectorAll('#modal [data-set^="skin:"]')].find(b => b.textContent.includes(label));
    pick('深海琥珀').click(); await w(400);
    const after = ['匠心彩绘','全彩地图包','深海琥珀','彩绘卡面'].map(n => { const b = pick(n); return b ? b.classList.contains('active') : null; });
    const mx = document.querySelector('#modal .modal-x'); if (mx) mx.click(); await w(400);
    return { 关掉深海琥珀后: after, body类: document.body.classList.contains('skin-accent') };
  })()`);
  console.log('④ 关掉其中一个：' + JSON.stringify(off));
  ck('④ 关闭「深海琥珀」后它自己灭掉、其余三套照旧开着',
     off.body类 === false && off.关掉深海琥珀后[0] === true && off.关掉深海琥珀后[1] === true && off.关掉深海琥珀后[2] === false && off.关掉深海琥珀后[3] === true,
     JSON.stringify(off.关掉深海琥珀后));

  // ---- ⑤ 墨白原味 = 全部关闭 ----
  const alloff = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
    clk('#nav [data-nav="save"]'); await w(600);
    document.querySelector('#modal [data-savemenu="settings"]').click(); await w(700);
    const reset = document.querySelector('#modal [data-set="skinoff:1"]');
    if (!reset) return { __err: '没有「全部关闭」按钮' };
    reset.click(); await w(400);
    const after = ['匠心彩绘','全彩地图包','深海琥珀','彩绘卡面'].map(n => {
      const b = [...document.querySelectorAll('#modal [data-set^="skin:"]')].find(x => x.textContent.includes(n));
      return b ? b.classList.contains('active') : null; });
    const mx = document.querySelector('#modal .modal-x'); if (mx) mx.click(); await w(400);
    clk('#nav [data-nav="map"]'); await w(1200);
    const mi = document.querySelector('#map-img');
    return { 全关后: after, body类: document.body.classList.contains('skin-accent'),
             地图: mi ? (mi.getAttribute('src') || '') : null, 存档值: localStorage.getItem('guyuyizhang_skin') };
  })()`);
  console.log('⑤ 全部关闭：' + JSON.stringify(alloff));
  ck('⑤ 「墨白原味（全部关闭）」把四套一起关掉',
     Array.isArray(alloff.全关后) && alloff.全关后.every(v => v === false), JSON.stringify(alloff.全关后));
  ck('⑤ 全关后界面回到无皮肤状态', alloff.body类 === false && /-mono\.png/.test(alloff.地图 || ''), JSON.stringify({ body: alloff.body类, 地图: alloff.地图 }));

  // ---- ⑥ 刷新后仍然记得多选组合 ----
  const persist = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    localStorage.setItem('guyuyizhang_skin', JSON.stringify(['armory','seasons','card']));
    return 1;
  })()`);
  await send('Page.navigate', { url });
  await sleep(2600);
  const after = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
    clk('#btn-new'); await w(300); clk('.identity'); await w(300); clk('.identity'); await w(300); clk('.identity'); await w(1500);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(180); }
    Game.S().tut = null;
    clk('#nav [data-nav="map"]'); await w(1200);
    const mi = document.querySelector('#map-img');
    return { 地图: mi ? (mi.getAttribute('src') || '') : null, body类: document.body.classList.contains('skin-accent') };
  })()`);
  console.log('⑥ 重载后：' + JSON.stringify(after));
  ck('⑥ 重载后多选组合仍然生效（全彩地图包还在）', /-color\.png/.test(after.地图 || ''), after.地图);
  ck('⑥ 重载后没开的深海琥珀不会自己冒出来', after.body类 === false);

  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');
  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('\n通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
