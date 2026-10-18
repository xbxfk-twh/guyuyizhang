/* 老潮兑换（贝壳 ⇄ 金币）真实浏览器复核 —— 桌面 + 手机横屏

   ⚠️ 契约变更（2026-09-25，作者原话："贝壳换金币和金币换贝壳沿用前面的出售（除了他们的
      单价不会变），没有其他的说明，和前面一致的 ui，也没有单独批量，而是长按批量"）：
      旧版本是「换 1 枚 + 单独的『全部』按钮 + 二次确认弹窗」，三个东西现在全部删掉了。
      所以本探针从 _verify_shell_confirm.js 改名成 _verify_exchange_flow.js，
      断言的也换成了新契约（这不是放宽，是把"确认拦截"换成"和出售同一套操作"）：

        ① 出售页里两个方向各一行，和出售行同一套 3 列网格（对象 / 单价 / 卖）
        ② 只写固定单价（50 贝壳 / 30 贝壳）—— 没有多余的箭头说明或提示文字
        ③ 轻点一下 = 换 1 份，一步到位、不弹任何确认
        ④ 长按 460ms = 弹批量面板（数量条 + 快捷 + 确定），此时一枚都还没扣
        ⑤ 批量面板取消不扣东西（和出售的批量窗一样直接关闭）
        ⑥ 批量面板「确定」才真的按数量换，换完仍留在老潮面板
        ⑦ 反向（金币→贝壳）同样：轻点换 1 枚、长按批量
        ⑧ 贝壳不足 50 / 金币为 0 时按钮置灰，长按也不会弹"换 0 枚"
        ⑨ 全程无 JS 报错，面板在手机横屏不横向溢出
*/
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = process.env.GUYU_GAME_ROOT || path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const OUT = path.join(__dirname, '_out', 'exchange');
const PORT = 9497;
const PROFILE = path.join(os.tmpdir(), 'guyu_exch_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });
let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };

// 开局 → 站到营地 → 老潮靠岸 → 指定贝壳/金币 → 打开老潮面板并切到「卖给他」
// 顺便把 __openShop() 挂到 window 上，后面重开老潮面板时复用（取消批量窗后会关掉面板）。
// ⚠️ bindPress 绑的是 pointerdown/pointerup：el.click() 不会触发，必须真派发指针事件。
const BOOT = (shells, coins) => `(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  Game.newGame('fisher', 'normal');
  const S0 = Game.S(); S0.tut = null; S0.capacity = 999;
  UI.begin(); await w(500);
  for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal [data-choice]'); if (!b) break; b.click(); await w(400); }
  const S = Game.S();
  S.tut = null; S.scene = 'camp'; S.zone = null; S.minute = 600;      // 10:00，老潮要求非夜晚
  S.laochao.arrived = true; S.laochao.nextVisit = 99;
  S.inv.beibi = ${shells}; S.inv.coin = ${coins};
  window.__openShop = async () => {
    // 底部导航没有 data-nav="scene"；点 map 一定会重绘 #scene-actions
    const n = document.querySelector('#nav [data-nav="map"]'); if (!n) return false;
    n.click(); await w(500);
    const trade = [...document.querySelectorAll('#scene-actions .action-btn')].find(b => /老潮/.test(b.textContent));
    if (!trade) return false;
    trade.click(); await w(600);
    const sell = document.querySelector('#modal [data-ttab="sell"]'); if (!sell) return false;
    sell.click(); await w(450);                                        // 默认是「买他的货」，必须切到「卖给他」
    return !!document.querySelector('#modal [data-exshell="1"]');
  };
  if (!await window.__openShop()) return { __err: '打不开老潮出售页' };
  const grids = [...document.querySelectorAll('#modal .trade-grid')].map(g => ({
    列数: g.children.length,
    文字: g.textContent.replace(/\\s+/g, ' ').trim(),
    按钮: g.querySelector('button') ? g.querySelector('button').textContent.trim() : null,
  }));
  const body = document.querySelector('#modal .modal-content');
  return {
    shells: Game.invCount('beibi'), coins: Game.invCount('coin'),
    有贝壳换金币: !!document.querySelector('#modal [data-exshell="1"]'),
    有金币换贝壳: !!document.querySelector('#modal [data-exgold="1"]'),
    残留全部按钮: !!document.querySelector('#modal [data-exshell="all"], #modal [data-exgold="all"]'),
    兑换行: grids.filter(g => /贝壳换金币|金币换贝壳/.test(g.文字)),
    说明文字: /单向|不能撤销|一次性换完|确认兑换/.test(document.querySelector('#modal').textContent),
    横向溢出: body ? body.scrollWidth > body.clientWidth + 1 : null,
  };
})()`;

// 派发一次真实的「轻点」：按下 → 80ms 后抬起（远小于 460ms 长按阈值）
const TAP = sel => `(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const b = document.querySelector('${sel}'); if (!b) return { __err: '找不到 ${sel}' };
  const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const opt = { bubbles: true, clientX: x, clientY: y };
  b.dispatchEvent(new PointerEvent('pointerdown', opt));
  await w(80);
  b.dispatchEvent(new PointerEvent('pointerup', opt));
  await w(500);
  const t = document.querySelector('#modal .modal-title');
  return { 标题: t ? t.textContent.trim() : null, shells: Game.invCount('beibi'), coins: Game.invCount('coin'),
           面板还在: !!(document.querySelector('#modal [data-exshell="1"]') || document.querySelector('#modal [data-exgold="1"]')) };
})()`;

// 派发一次真实的「长按」：按下 → 520ms（>460ms 阈值）→ 抬起
const LONG = sel => `(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const b = document.querySelector('${sel}'); if (!b) return { __err: '找不到 ${sel}' };
  const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const opt = { bubbles: true, clientX: x, clientY: y };
  b.dispatchEvent(new PointerEvent('pointerdown', opt));
  await w(520);
  b.dispatchEvent(new PointerEvent('pointerup', opt));
  await w(400);
  const t = document.querySelector('#modal .modal-title');
  const sl = document.querySelector('#batchn-n');
  return { 标题: t ? t.textContent.trim() : null,
           批量面板: !!sl, 最大: sl ? String(sl.max) : null,
           有确定: !!document.querySelector('#batchn-do'),
           快捷数: document.querySelectorAll('#modal [data-bset]').length,
           提示: (document.querySelector('#modal .batch-hint') || {}).textContent || '',
           shells: Game.invCount('beibi'), coins: Game.invCount('coin') };
})()`;

const SIZES = [
  { n: '桌面', w: 1280, h: 720, mobile: false },
  { n: '手机横屏', w: 844, h: 390, mobile: true },   // 本游戏只支持横屏
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
    await send('Emulation.setTouchEmulationEnabled', { enabled: !!s.mobile });
    await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
    await sleep(2400);

    // 开局身上带 125 贝壳 / 0 金币：够换 2 枚金币，且换完还能剩下零头
    const boot = await ev(BOOT(125, 0));
    console.log('\n【' + s.n + ' ' + s.w + 'x' + s.h + '】开局：' + JSON.stringify(boot));
    if (boot.__err) { ck(s.n + '：能打开老潮出售页', false, JSON.stringify(boot)); continue; }

    ck(s.n + '：出售页里贝壳换金币、金币换贝壳各一行',
      boot.有贝壳换金币 === true && boot.有金币换贝壳 === true, JSON.stringify(boot));
    ck(s.n + '：⛔ 没有单独的「全部」按钮（已改成和出售一样的长按批量）',
      boot.残留全部按钮 === false);
    ck(s.n + '：两行都是和出售一样的 3 列网格、第三列是「卖出」',
      boot.兑换行.length === 2 && boot.兑换行.every(g => g.列数 === 3 && g.按钮 === '卖出'),
      JSON.stringify(boot.兑换行));
    ck(s.n + '：只写固定单价（50 贝壳 / 30 贝壳），没有多余的兑换说明',
      boot.兑换行.some(g => /50 贝壳/.test(g.文字)) && boot.兑换行.some(g => /30 贝壳/.test(g.文字)) && boot.说明文字 === false,
      JSON.stringify(boot.兑换行.map(g => g.文字)));
    if (s.mobile) {
      ck(s.n + '：兑换按钮触控区 ≥40px 高',
        (await ev(`(()=>{const a=[...document.querySelectorAll('#modal [data-exshell],[data-exgold]')];return a.length===2&&a.every(e=>e.getBoundingClientRect().height>=40);})()`)) === true);
    }
    ck(s.n + '：面板在' + s.n + '不横向溢出', boot.横向溢出 === false);

    // ① 轻点「贝壳换金币」= 立刻换 1 份，不弹确认
    const tap1 = await ev(TAP('#modal [data-exshell="1"]'));
    console.log('  轻点贝壳换金币：' + JSON.stringify(tap1));
    ck(s.n + '：轻点一下贝壳 125→75、金币 0→1，且不弹确认框',
      tap1.shells === 75 && tap1.coins === 1 && !/确认/.test(tap1.标题 || '') && tap1.面板还在 === true, JSON.stringify(tap1));

    // ② 长按 = 批量面板，且此时一枚都还没扣
    const long1 = await ev(LONG('#modal [data-exshell="1"]'));
    console.log('  长按贝壳换金币：' + JSON.stringify(long1));
    ck(s.n + '：长按弹批量面板（数量条 + 快捷 + 确定）',
      long1.批量面板 === true && long1.有确定 === true && long1.快捷数 === 3 && /兑换/.test(long1.标题 || ''), JSON.stringify(long1));
    ck(s.n + '：批量面板上限 = 现有贝壳能换的枚数（75 贝壳 → 1 枚）', long1.最大 === '1', long1.最大);
    ck(s.n + '：⛔ 弹批量面板本身不扣东西', long1.shells === 75 && long1.coins === 1, JSON.stringify(long1));
    ck(s.n + '：批量面板写明固定汇率', /50 贝壳 → 1 金币/.test(long1.提示 || ''), long1.提示);

    // ③ 批量面板「取消」不扣东西（和出售的批量窗一样：直接关掉面板）
    const cancel = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const b = document.querySelector('#modal #modal-close'); if (!b) return { __err: 'no cancel' };
      b.click(); await w(400);
      return { shells: Game.invCount('beibi'), coins: Game.invCount('coin'),
               批量面板已关: !document.querySelector('#batchn-n') };
    })()`);
    console.log('  批量面板取消：' + JSON.stringify(cancel));
    ck(s.n + '：批量面板取消后贝壳/金币一个没动、面板关闭',
      cancel.shells === 75 && cancel.coins === 1 && cancel.批量面板已关 === true, JSON.stringify(cancel));

    // ④ 重开面板、补足贝壳后再长按 → 拖到 2 份 → 确定 → 真的换 2 枚
    const batch2 = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      if (!await window.__openShop()) return { __err: '重开老潮面板失败' };
      Game.addItem('beibi', 105, true);        // 75 + 105 = 180 → 能换 3 枚
      const b = document.querySelector('#modal [data-exshell="1"]'); if (!b) return { __err: 'no exshell' };
      const r = b.getBoundingClientRect(); const opt = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
      b.dispatchEvent(new PointerEvent('pointerdown', opt)); await w(520);
      b.dispatchEvent(new PointerEvent('pointerup', opt)); await w(400);
      const sl = document.querySelector('#batchn-n'); if (!sl) return { __err: '没有批量面板' };
      sl.value = 2; sl.dispatchEvent(new Event('input', { bubbles: true })); await w(150);
      const 合计 = (document.querySelector('#batchn-total') || {}).textContent;
      document.querySelector('#batchn-do').click(); await w(600);
      return { 最大: String(sl.max), 合计, s: Game.invCount('beibi'), c: Game.invCount('coin'),
               回到老潮面板: !!document.querySelector('#modal [data-exshell="1"]') };
    })()`);
    console.log('  长按批量换 2 份：' + JSON.stringify(batch2));
    ck(s.n + '：批量面板上限 = 180 贝壳能换的 3 枚', batch2.最大 === '3', String(batch2.最大));
    ck(s.n + '：拖到 2 份时预计换得 2 金币（合计随数量变）', batch2.合计 === '2 金币', String(batch2.合计));
    ck(s.n + '：确定后贝壳 180→80、金币 1→3', batch2.s === 80 && batch2.c === 3, JSON.stringify({ s: batch2.s, c: batch2.c }));
    ck(s.n + '：换完仍留在老潮面板', batch2.回到老潮面板 === true);

    // ⑤ 反向：轻点「金币换贝壳」→ 金币 -1、贝壳 +30
    const tap2 = await ev(TAP('#modal [data-exgold="1"]'));
    console.log('  轻点金币换贝壳：' + JSON.stringify(tap2));
    ck(s.n + '：轻点一下金币 3→2、贝壳 80→110，且不弹确认框',
      tap2.coins === 2 && tap2.shells === 110 && !/确认/.test(tap2.标题 || '') && tap2.面板还在 === true, JSON.stringify(tap2));

    // ⑥ 反向长按：批量面板汇率是 1→30，上限 = 现有金币
    const long2 = await ev(LONG('#modal [data-exgold="1"]'));
    console.log('  长按金币换贝壳：' + JSON.stringify(long2));
    ck(s.n + '：长按金币行也是批量面板、上限 = 现有 2 枚金币、汇率 1 金币 → 30 贝壳',
      long2.批量面板 === true && long2.最大 === '2' && /1 金币 → 30 贝壳/.test(long2.提示 || ''), JSON.stringify(long2));
    ck(s.n + '：反向批量面板同样先不扣东西', long2.coins === 2 && long2.shells === 110, JSON.stringify(long2));
    await ev(`document.querySelector('#modal #modal-close').click()`); await sleep(300);

    await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'exchange_' + s.w + '.png'), Buffer.from(x.data, 'base64')));
  }

  // ⑦ 钱不够时：按钮置灰，长按也不会弹"换 0 枚"
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2400);
  const poor = await ev(BOOT(20, 0));
  console.log('\n【钱不够（20 贝壳 / 0 金币）】开局：' + JSON.stringify(poor));
  if (poor.__err) {
    ck('钱不够的场景可测', false, JSON.stringify(poor));
  } else {
    const step = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const b = document.querySelector('#modal [data-exshell="1"]');
      const g = document.querySelector('#modal [data-exgold="1"]');
      const before = { s: Game.invCount('beibi'), c: Game.invCount('coin') };
      if (b) { const r = b.getBoundingClientRect(); const opt = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
        b.dispatchEvent(new PointerEvent('pointerdown', opt)); await w(520); b.dispatchEvent(new PointerEvent('pointerup', opt)); await w(400); }
      const t = document.querySelector('#modal .modal-title');
      return { 贝壳按钮置灰: !!b && b.disabled, 金币按钮置灰: !!g && g.disabled,
               标题: t ? t.textContent.trim() : null, 批量面板: !!document.querySelector('#batchn-n'),
               s: Game.invCount('beibi'), c: Game.invCount('coin'), before };
    })()`);
    console.log('【钱不够】结果：' + JSON.stringify(step));
    ck('贝壳不足 50 时按钮置灰、金币为 0 时按钮置灰', step.贝壳按钮置灰 === true && step.金币按钮置灰 === true, JSON.stringify(step));
    ck('钱不够时长按也不会弹"换 0 枚"的批量面板，且一分钱没动',
      step.批量面板 === false && step.s === step.before.s && step.c === step.before.c, JSON.stringify(step));
  }

  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');
  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('\n通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  if (bad.length) console.log('失败项：\n- ' + bad.join('\n- '));
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
