/* 「对岸美食家」实装复核（作者 2026-09-25："对岸美食家确定实装了吗"）
   查出来是**没实装到位**：data.js 里 TOWN.gourmet、三张图纸、三道菜的 needBp 全都在，
   但界面上根本进不去 —— 盐镇集市的摊位标签硬编码了三家（杂货商/铁匠/情报贩子），
   而且点「买」的处理器又把新摊位吞成杂货商。这个探针走**玩家真实路径**：
   对岸盐镇 → 集市点 → 摊位标签 → 买图纸 → 制造栏里那道菜出现。 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = process.env.GUYU_GAME_ROOT || 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_out', 'town');
const PORT = 9525;
const PROFILE = path.join(os.tmpdir(), 'guyu_town_' + process.pid);
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
  const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, n), Buffer.from(r.data, 'base64')); };

  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2800);
  const boot = await ev(`(async () => {
    const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    for (let step = 0; step < 12 && !Game.S(); step++) {
      const cf = [...document.querySelectorAll('#modal [data-choice], #modal .modal-actions button')].find(x => /开始新游戏/.test(x.textContent));
      if (cf) { cf.click(); await w(700); continue; }
      if (!document.querySelector('.identity')) { clk('#btn-new'); await w(700); continue; }
      document.querySelector('.identity').click(); await w(700);
    }
    for (let i = 0; i < 10; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
    for (let i = 0; i < 40 && document.documentElement.classList.contains('boot-pending'); i++) await w(250);
    const S = Game.S(); if (!S) return 'no-state';
    S.tut = null; S.capacity = 999;
    return 'ok';
  })()`);
  console.log('开局：' + boot);
  ck('能开局', boot === 'ok', String(boot));

  // ① 数据层：美食家 + 三张图纸 + 三道菜的图纸门槛（这部分本来就在）
  const data = await ev(`(() => {
    const g = TOWN.gourmet;
    return {
      有摊位: !!g, 名: g && g.name, 门槛: g && g.needFame,
      卖: g ? g.sell.map(x => x.id + '@' + x.base + (x.kind ? ':' + x.kind : '')) : [],
      收: g ? g.buy.map(x => x.id) : [],
      菜: RECIPES.filter(r => r.needBp).map(r => r.id + '←' + r.needBp),
    };
  })()`);
  console.log('① 数据：' + JSON.stringify(data));
  ck('①1 美食家声望 3 解锁，卖 3 张图纸及高价蜂蜜',
     data.有摊位 === true && data.门槛 === 3 && (data.卖 || []).filter(x => /:bp$/.test(x)).length === 3 && (data.卖 || []).some(x => /^honey@1[0-9]{2}$/.test(x)),
     (data.卖 || []).join(' / '));
  ck('①2 三道进阶菜挂的都是美食家那三张图纸',
     ['r_carrotstew', 'r_cake', 'r_superegg'].every((id, i) => {
       const r = (data.菜 || []).find(x => x.indexOf(id + '←') === 0);
       return r === id + '←' + ['bpStew', 'bpCake', 'bpOmelette'][i];
     }),
     (data.菜 || []).filter(x => /r_carrotstew|r_cake|r_superegg/.test(x)).join(' / '));

  // ② 玩家路径：对岸盐镇 → 集市点 → 摊位标签里有「美食家」
  const town = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const S = Game.S();
    S.fame = 3;                                   // 声望 3（四条委托各 +1）
    S.scene = 'shore'; S.zone = 'saltTown';
    S.stats.stamina = 500; S.stats.hp = 500;
    Game.addItem('beibi', 2000, true);
    const p = Game.pointsOf().find(x => x.id === 'town_market');
    if (!p) return { __err: '盐镇里没有集市点', 点: Game.pointsOf().map(x => x.id) };
    Game.doPoint(p); await w(900);
    const tabs = [...document.querySelectorAll('#modal [data-shop]')].map(b => b.textContent.trim());
    const 标题 = (document.querySelector('#modal .modal-title') || {}).textContent || '';
    return { 标题, tabs, 开着的: !!document.querySelector('#modal.open') };
  })()`);
  console.log('② 集市：' + JSON.stringify(town));
  if (town.__err) { ck('② 能走到集市摊位', false, JSON.stringify(town)); }
  else {
    ck('②1 从盐镇集市点能打开集市面板', /盐镇集市/.test(town.标题) && town.开着的 === true, town.标题);
    ck('★ ②2 摊位标签里有「美食家」（以前硬编码三家，根本没有这个入口）',
       (town.tabs || []).some(t => /美食家/.test(t)), (town.tabs || []).join(' / '));
    ck('②3 声望 3 时美食家标签解锁（不带锁）', (town.tabs || []).some(t => /美食家/.test(t) && !/🔒/.test(t)));
  }

  // ③ 点进美食家，买一张图纸 —— 买完钱要真扣、图纸要真进包（以前会被当成杂货商）
  const buy = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    // ⚠️ 买/卖按钮是 bindPress（pointerdown/up）绑的，**click() 不触发**。
    //    探针里必须像真手指那样发 pointer 事件（第一版就是栽在这儿：点了没反应，误判成"买不到"）。
    const tap = (el) => {
      const o = { bubbles:true, cancelable:true, clientX:0, clientY:0, pointerId:1, pointerType:'mouse', isPrimary:true, button:0, buttons:1 };
      el.dispatchEvent(new PointerEvent('pointerdown', o));
      el.dispatchEvent(new PointerEvent('pointerup', Object.assign({}, o, { buttons:0 })));
    };
    const b = [...document.querySelectorAll('#modal [data-shop]')].find(x => /美食家/.test(x.textContent));
    if (!b) return { __err: '没有美食家标签' };
    b.click(); await w(600);
    const 货 = [...document.querySelectorAll('#modal [data-tbuy]')].map(x => ({ 键: x.dataset.tbuy, 文: x.parentElement.parentElement.textContent.replace(/\\s+/g, ' ').trim() }));
    const before = { 贝壳: Game.invCount('beibi'), 图纸: Game.invCount('bpStew') };
    const btn = document.querySelector('#modal [data-tbuy="gourmet:bpStew"]');
    if (!btn) return { __err: '美食家摊位里没有萝卜炖肉食谱的购买按钮', 货 };
    tap(btn); await w(900);
    const honeyBefore = Game.invCount('honey');
    const shellBeforeHoney = Game.invCount('beibi');
    const honeyBtn = document.querySelector('#modal [data-tbuy="gourmet:honey"]');
    if (honeyBtn) { tap(honeyBtn); await w(600); }
    return { 货, before, 贝壳: Game.invCount('beibi'), 图纸: Game.invCount('bpStew'),
             蜂蜜按钮: !!honeyBtn, 蜂蜜前: honeyBefore, 蜂蜜后: Game.invCount('honey'),
             买蜜前贝壳: shellBeforeHoney,
             还在美食家: !!document.querySelector('#modal [data-tbuy="gourmet:bpOmelette"]') };
  })()`);
  console.log('③ 购买：' + JSON.stringify(buy));
  if (buy.__err) { ck('③ 能进美食家摊位买图纸', false, JSON.stringify(buy)); }
  else {
    const 货文 = (buy.货 || []).map(x => x.文).join(' ');
    // 价目按"行情"打折显示（base 260 → 界面 203 左右），所以这里只认"有这三张图纸 + 价格是贝壳"
    ck('★ ③1 美食家摊位列出三张图纸（价格按行情折后显示、按贝壳计价）',
       /萝卜炖肉食谱/.test(货文) && /超级大蛋食谱/.test(货文) && /蛋糕食谱/.test(货文) && /贝壳/.test(货文),
       货文);
    const 扣了 = buy.before.贝壳 - buy.贝壳;
    ck('★ ③2 点「买」真的买到萝卜炖肉食谱、贝壳也真扣了（以前会被当成杂货商，什么都买不到）',
       buy.图纸 === 1 && 扣了 > 0, '贝壳 -' + 扣了 + ' · 图纸 ×' + buy.图纸);
    ck('③3 买完还留在美食家摊位（没跳回杂货商）', buy.还在美食家 === true);
    ck('③4 蜂蜜可从美食家实际购买并扣贝壳', buy.蜂蜜按钮 && buy.蜂蜜后 === buy.蜂蜜前 + 1 && buy.贝壳 < buy.买蜜前贝壳);
  }
  await shot('town-gourmet.png');

  // ④ 图纸 → 制造栏：没图纸时那道菜不显示，买了之后出现
  const craft = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const S = Game.S();
    // 先把图纸拿掉，看"没图纸"的制造栏
    const keep = S.inv.bpStew; delete S.inv.bpStew;
    S.furniture.stove = 1; S.scene = 'camp'; S.inv.meat = 9; S.inv.carrot = 9; S.inv.water = 9; S.inv.salt = 9;
    document.querySelector('#modal .modal-x')?.click(); await w(300);
    Game.change(); await w(300);
    const 没图纸 = (() => {
      // 直接问渲染函数的口径：needBp 没拿到 → 整条隐藏
      const r = RECIPES.find(x => x.id === 'r_carrotstew');
      return { needBp: r.needBp, 持有: Game.hasItem('bpStew') };
    })();
    const 有图纸 = (() => { S.inv.bpStew = 1; return { 持有: Game.hasItem('bpStew') }; })();
    Game.change(); await w(300);
    return { 没图纸, 有图纸 };
  })()`);
  console.log('④ 图纸门槛：' + JSON.stringify(craft));
  const craftUi = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const S = Game.S();
    S.inv.meat = 9; S.inv.carrot = 9; S.inv.water = 9; S.inv.salt = 9; S.inv.claypot = 1;
    S.buildings.house = 2; S.furniture.wb1 = 1; S.furniture.stove = 1;
    S.scene = 'camp';
    const 开灶台 = async () => {
      document.querySelector('#modal .modal-x')?.click(); await w(200);
      document.querySelector('#nav [data-nav="craft"]').click(); await w(600);
      // 灶台菜谱已合并进「篝火·烹饪」；图纸门槛仍要按当前分组实测。
      const t = document.querySelector('#modal [data-station="fire"]');
      if (t) { t.click(); await w(600); }
      return /萝卜炖肉/.test(document.querySelector('#modal').textContent);
    };
    S.inv.bpStew = 1; Game.change(); await w(300);
    const 有图纸时显示 = await 开灶台();
    delete S.inv.bpStew; Game.change(); await w(300);
    const 没图纸时显示 = await 开灶台();
    S.inv.bpStew = 1; Game.change(); await w(300);
    const 重新买回后显示 = await 开灶台();
    return { 有图纸时显示, 没图纸时显示, 重新买回后显示,
             分类: [...document.querySelectorAll('#modal [data-station]')].map(x => x.textContent.trim()) };
  })()`);
  console.log('④ 制造栏：' + JSON.stringify(craftUi));
  ck('★ ④1 买了图纸后，制造栏里出现「萝卜炖肉」', craftUi.有图纸时显示 === true, JSON.stringify(craftUi));
  ck('★ ④2 没有图纸时整条隐藏（不是灰按钮）', craftUi.没图纸时显示 === false);
  ck('★ ④3 再把图纸拿回来又会出现（过滤器没把状态弄脏）', craftUi.重新买回后显示 === true);

  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');
  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('\n通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
