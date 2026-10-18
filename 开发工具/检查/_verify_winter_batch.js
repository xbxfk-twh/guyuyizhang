/* 2026-09-25 批次的界面复核：冬季弹窗（含"别和别的弹窗抢屏幕"）/ 石龛真三选一 /
   睡眠里的中毒流血 / 冬天河畔采雪。

   这四项里有两项**只有真界面才测得出来**：
     · 冬季弹窗和「每日晨报」都会在清晨推出来 —— 到底谁把谁顶掉，只有真跑一遍才知道；
     · 石龛"让你看一眼却不让你选"是玩家的原话，所以这里必须**真的点那个按钮**，
       再核对拿到的是不是按钮上写的那件神物。
   静态形状由 回归测试/checks.js 第 26、27 节守着，这里管行为。
   ⚠️ 随机数在这几段里钉成 0.99：不然夜袭（15%）或赶路奇遇（5%）会把状态搅乱，
      探针就变成看运气了。 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = process.env.GUYU_GAME_ROOT || 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_out', 'winterbatch');
const PORT = 9503;
const PROFILE = path.join(os.tmpdir(), 'guyu_winter_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });
let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };

// 开局 → 关掉所有开场弹窗 → 站回营地（第 45 天白天），**不动视图**（营地场景里的热点要留着）
// ⚠️ 开局的点击很吃状态：有新存档时点「空白备份槽」会先弹"开新游戏会覆盖存档"的确认框，
//    不点掉它，后面每一下都白点（第一版在第二次跑就卡在这里，报"no state"）。
//    所以这里写成一个"每次挑当前该点的那一下"的循环：有确认框就确认 → 没有身份按钮就先开新旅程 →
//    有身份按钮就点第一个，一直到 Game.S() 出现为止。
const BOOT = `(async () => {
  const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
  const w = ms => new Promise(r => setTimeout(r, ms));
  for (let step = 0; step < 12 && !Game.S(); step++) {
    const cf = [...document.querySelectorAll('#modal [data-choice], #modal .modal-actions button')]
      .find(x => /开始新游戏/.test(x.textContent));
    if (cf) { cf.click(); await w(700); continue; }
    if (!document.querySelector('.identity')) { clk('#btn-new'); await w(700); continue; }
    document.querySelector('.identity').click(); await w(700);
  }
  for (let i = 0; i < 10; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
  const S = Game.S();
  if (!S) return { __err: 'no state', 身份数: document.querySelectorAll('.identity').length,
                   有新建: !!document.querySelector('#btn-new'),
                   弹窗: (document.querySelector('#modal .modal-title') || {}).textContent || '',
                   屏幕: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 180) };
  S.tut = null; S.scene = 'camp'; S.minute = 600; S.day = 45;
  return { day: S.day, 季节: Game.seasonInfo().name,
           热点: [...document.querySelectorAll('.hotspot')].map(h => h.textContent.trim()),
           动作: [...document.querySelectorAll('#scene-actions .action-btn')].map(b => b.textContent.trim()) };
})()`;

// ⚠️ 本作是**横屏**设计（竖屏会被 css 的 "请横屏游玩 ⟳" 整屏盖住），
//    所以手机尺寸必须用横屏的 844x390 / 667x375，竖屏截图只能拍到那句提示。
const SIZES = [
  { n: '桌面', w: 1280, h: 720, mobile: false },
  { n: '手机横屏', w: 844, h: 390, mobile: true },
  { n: '小屏横屏', w: 667, h: 375, mobile: true },
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
    await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
    await sleep(2600);
    const boot = await ev(BOOT);
    console.log('\n【' + s.n + ' ' + s.w + 'x' + s.h + '】开局：' + JSON.stringify(boot));
    if (boot.__err) { ck(s.n + '：能开局', false, JSON.stringify(boot)); continue; }

    // ===== A. 冬季弹窗：先开着别的弹窗 → 必须排队，不抢屏幕 =====
    // 用「菜单」当那个"别的弹窗"：它的标题和关闭按钮在 ui.js 里是写死的，探针不用猜结构。
    const A = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const RND = Math.random; Math.random = () => 0.99;      // 免夜袭
      document.querySelector('#nav [data-nav="save"]').click(); await w(600);
      const 开着的 = (document.querySelector('#modal .modal-title') || {}).textContent || '';
      const S = Game.S(); S.minute = 23 * 60; S.day = 45; S.flags.winterWarned = undefined;
      Game.sleep('normal'); await w(700);                     // 睡到第 46 天 → newDay() 推冬季弹窗
      const 睡觉后标题 = (document.querySelector('#modal .modal-title') || {}).textContent || '';
      const 抢屏了吗 = /冬季来临/.test(睡觉后标题);
      const cl = document.querySelector('#modal .modal-x, #modal #modal-close');
      if (cl) cl.click();
      await w(800);
      const 标题2 = (document.querySelector('#modal .modal-title') || {}).textContent || '';
      const 条目 = [...document.querySelectorAll('#modal .help-item b')].map(b => b.textContent.trim());
      const 正文 = (document.querySelector('#modal .modal-content') || {}).textContent || '';
      const crop = document.querySelector('#modal .modal-content');
      const cr = crop ? crop.getBoundingClientRect() : null;
      // 横屏手机只有 390px 高：按钮必须**不用滚动**就在视口里（拿不到就等于玩家点不到）
      const acts = document.querySelector('#modal .modal-actions');
      const ar = acts ? acts.getBoundingClientRect() : null;
      // .help-list 自带 max-height + overflow-y:auto：第 4 条要是被藏进内滚动里，
      // 玩家只看到 3 条就关窗了 —— 所以内滚动也要量。
      const hl = document.querySelector('#modal .help-list');
      const 列表被截 = hl ? (hl.scrollHeight - hl.clientHeight) : null;
      const 第4条在视口里 = (() => { const it = document.querySelectorAll('#modal .help-item'); if (it.length < 4) return null; const r = it[3].getBoundingClientRect(); return r.bottom <= innerHeight + 1; })();
      Math.random = RND;
      return { 开着的, 睡觉后标题, 抢屏了吗, 标题2, 条目, 正文,
               有去采雪按钮: !!document.querySelector('#modal #winter-go'),
               弹窗在视口内: cr ? (cr.top >= -1 && cr.bottom <= innerHeight + 1 && cr.left >= -1 && cr.right <= innerWidth + 1) : null,
               按钮在视口内: ar ? (ar.top >= -1 && ar.bottom <= innerHeight + 1) : null,
               需要滚动: crop ? (crop.scrollHeight - crop.clientHeight) : null,
               列表被截: 列表被截, 第4条在视口里,
               day: Game.S().day, 季节: Game.seasonInfo().name };
    })()`);
    console.log('  冬季弹窗：' + JSON.stringify(A));
    if (A.__err) { ck(s.n + '：冬季弹窗流程可测', false, JSON.stringify(A)); }
    else {
      ck(s.n + '：睡觉前确实开着别的弹窗（菜单）', /菜单/.test(A.开着的), A.开着的);
      ck(s.n + '：⛔ 冬季弹窗不会把已经开着的弹窗顶掉（先排队）',
         A.抢屏了吗 === false && /菜单/.test(A.睡觉后标题), '睡着后屏幕上还是：' + A.睡觉后标题);
      ck(s.n + '：关掉旧弹窗后，排队的「冬季来临」才弹出来', /冬季来临/.test(A.标题2), A.标题2);
      ck(s.n + '：弹窗落在第 46 天（入冬当天）', A.day === 46 && A.季节 === '冬', 'day=' + A.day + ' ' + A.季节);
      ck(s.n + '：正文教会玩家怎么过冬（采雪 + 烧雪水）',
         /采雪/.test(A.正文) && /烧雪水/.test(A.正文) && /很难熬|漫长|变紧/.test(A.正文),
         (A.正文 || '').replace(/\s+/g, ' ').slice(0, 70));
      ck(s.n + '：提醒条目齐全（≥4 条，覆盖采集/水/寒冷/中毒）', (A.条目 || []).length >= 4, (A.条目 || []).join(' / '));
      ck(s.n + '：有「去河畔采雪」按钮', A.有去采雪按钮 === true);
      ck(s.n + '：弹窗完整落在视口内（手机上不溢出）', A.弹窗在视口内 === true);
      ck(s.n + '：★ 两个按钮不用滚动就能点到（横屏手机只有 390px 高）',
         A.按钮在视口内 === true, '按钮在视口内=' + A.按钮在视口内 + ' 尚需滚动 ' + A.需要滚动 + 'px');
      ck(s.n + '：★ 第 4 条提醒不会被内滚动藏起来（4 条都要看得见）',
         A.第4条在视口里 === true && A.列表被截 === 0,
         '第4条在视口里=' + A.第4条在视口里 + ' 列表被截 ' + A.列表被截 + 'px');
    }
    await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'winter_' + s.w + '.png'), Buffer.from(x.data, 'base64')));
    await ev(`(() => { const c = document.querySelector('#modal #modal-close'); if (c) c.click(); return 1; })()`);
    await sleep(400);

    // ===== B. 石龛：真的能从三件里挑一件 =====
    const B = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const S = Game.S(); S.relics = []; S.stats.spirit = 50;
      Game.triggerShrine({ id:'re_shrine', once:1, text:'洞壁暗处，一扇被藤蔓掩埋的石龛微微发光，里面供着三件神物。' });
      await w(700);
      const 标题 = (document.querySelector('#modal .modal-title') || {}).textContent || '';
      const 按钮 = [...document.querySelectorAll('#modal [data-choice]')].map(b => b.textContent.trim());
      const 取走 = [...document.querySelectorAll('#modal [data-choice]')].filter(b => /^取走/.test(b.textContent.trim()));
      if (取走.length < 2) return { __err: '取走按钮不足', 标题, 按钮 };
      const 第二件 = 取走[1];
      const 想拿的名字 = 第二件.textContent.trim().replace(/^取走「/, '').replace(/」.*$/, '');
      const 确认前 = Game.S().relics.slice();
      第二件.click(); await w(700);
      const 拿到 = Game.S().relics.slice();
      const 名字表 = { vampire:'吸血宝石', dodge:'闪避护符', satchel:'食之包', bloodvest:'血色背心', atlantisSeed:'亚特兰蒂斯之种' };
      return { 标题, 按钮, 想拿的名字, 确认前, 拿到名字: 拿到.map(x => 名字表[x] || x),
               弹窗关了吗: !document.querySelector('#modal.open'),
               过了这一次: Game.S().flags['re_re_shrine'] === 1 };
    })()`);
    console.log('  石龛：' + JSON.stringify(B));
    if (B.__err) { ck(s.n + '：石龛流程可测', false, JSON.stringify(B)); }
    else {
      ck(s.n + '：标题写明是石龛的三件神物', /石龛/.test(B.标题) && /三件神物/.test(B.标题), B.标题);
      ck(s.n + '：★ 三个「取走…」+「不敢妄动」，真的能选（不再是只看一眼）',
         (B.按钮 || []).filter(x => /^取走/.test(x)).length === 3 && (B.按钮 || []).some(x => /不敢妄动/.test(x)) && B.确认前.length === 0,
         (B.按钮 || []).join(' | '));
      ck(s.n + '：★ 点第二件，拿到的就是第二件（不是随机给一件）',
         B.拿到名字.length === 1 && B.拿到名字[0] === B.想拿的名字, '点「' + B.想拿的名字 + '」→ 实际拿到 ' + B.拿到名字.join(','));
      ck(s.n + '：选完弹窗关闭、这一次奇遇被消耗', B.弹窗关了吗 === true && B.过了这一次 === true);
      await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'shrine_' + s.w + '.png'), Buffer.from(x.data, 'base64')));
    }

    // ===== C. 冬天河畔采雪（真采一次）=====
    const C = await ev(`(() => {
      const RND = Math.random; Math.random = () => 0.99;   // 免奇遇/野兽
      const S = Game.S(); S.capacity = 999; S.scene = 'river'; S.day = 46; S.stats.stamina = 100;
      const p = Game.pointsOf().find(x => x.id === 'river_snow');
      if (!p) { Math.random = RND; return { __err: '河畔没有 river_snow 点' }; }
      const 冬天可采 = Game.pointAvailable(p), 冬天状态 = Game.pointStatus(p);
      const before = Game.invCount('snow');
      Game.doPoint(p);
      const after = Game.invCount('snow');
      S.day = 40;
      const 秋天可采 = Game.pointAvailable(p), 秋天说明 = Game.pointStatus(p);
      S.day = 46; S.scene = 'camp';   // 还原场景，免得后面找营地热点时看到的是河畔
      Math.random = RND;
      return { 冬天可采, 冬天状态, 秋天可采, 秋天说明, before, after,
               有热点: ((typeof SCENE_HOTSPOTS !== 'undefined' && SCENE_HOTSPOTS.river) || []).some(h => h.point === 'river_snow'),
               天气: S.weather, 季节: Game.seasonInfo().name };
    })()`);
    console.log('  采雪：' + JSON.stringify(C));
    if (C.__err) { ck(s.n + '：采雪点可测', false, JSON.stringify(C)); }
    else {
      ck(s.n + '：河畔冬天能采雪、秋天被拦住并说明原因',
         C.冬天可采 === true && C.秋天可采 === false && /冬/.test(C.秋天说明 || ''),
         '冬=' + C.冬天可采 + ' 秋=' + C.秋天可采 + ' 秋天说明=' + C.秋天说明);
      ck(s.n + '：★ 真采一次能拿到积雪（冬天的第二条水源）',
         C.after > C.before, '积雪 ' + C.before + '→' + C.after + '（' + C.天气 + '·' + C.季节 + '）');
      ck(s.n + '：河畔热点里有采雪（玩家点得到）', C.有热点 === true);
    }

    // ===== D. 睡眠面板会提前说清"中毒/流血睡觉也掉血"，并真的扣 =====
    const D = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const RND = Math.random; Math.random = () => 0.99;
      const S = Game.S(); S.scene = 'camp'; S.minute = 22 * 60; S.day = 50; S.stats.stamina = 10;
      S.statuses.poison = 3; S.statuses.bleed = 2; S.stats.hp = 80;
      UI.begin(); await w(2800);
      document.querySelector('#modal')?.classList.remove('open');
      const 按钮 = () => [...document.querySelectorAll('#scene-actions .action-btn')].find(b => /睡觉/.test(b.textContent));
      const 热点 = () => [...document.querySelectorAll('.hotspot')].find(h => /睡觉/.test(h.textContent));
      // 先逼一次重绘并回到场景视图：#btn-backmap 在地图↔场景之间切换，点两下必然回场景且重画过
      const bb = document.querySelector('#btn-backmap');
      if (bb) { bb.click(); await w(600); bb.click(); await w(700); }
      let el = 按钮() || 热点();
      if (!el) {
        const n = document.querySelector('#nav [data-nav="map"]'); if (n) { n.click(); await w(700); }
        el = 按钮() || 热点();
      }
      for (let i = 0; i < 3 && !document.querySelector('.hotspot'); i++) {
        document.querySelector('#btn-backmap')?.click(); await w(450);
      }
      if (!el) {
        const room = [...document.querySelectorAll('.hotspot')].find(b => /进屋/.test(b.textContent));
        if (room) { room.click(); await w(350); el = document.querySelector('.room-sprite[data-roomact="sleep"]'); }
      }
      if (!el) { Math.random = RND; return { __err: '找不到睡觉入口', 动作: [...document.querySelectorAll('#scene-actions .action-btn')].map(b => b.textContent.trim()), 热点: [...document.querySelectorAll('.hotspot')].map(h => h.textContent.trim()) }; }
      el.click(); await w(700);
      const 警告 = [...document.querySelectorAll('#modal .sleep-warn')].map(x => x.textContent.replace(/\\s+/g, ' ').trim());
      const f = Game.sleepForecast('normal');
      const hp0 = Game.S().stats.hp, hpMax = Game.hpMax();
      const 安稳 = document.querySelector('#modal [data-sleep="normal"]');
      if (!安稳) { Math.random = RND; return { __err: '睡眠面板没有安稳睡觉按钮', 警告 }; }
      安稳.click();
      // ⚠️ 睡觉会先播一段 2.6 秒的入睡动画，动画结束才真的调 Game.sleep() ——
      //    只等 1.8 秒会得到"点了但什么都没发生"的假失败（第一版就是这么栽的）。
      await w(4600);
      Math.random = RND;
      return { 警告, 预报: f, hp0, hpMax, hp1: Math.round(Game.S().stats.hp),
               毒剩: Game.S().statuses.poison, 血剩: Game.S().statuses.bleed,
               弹窗关了吗: !document.querySelector('#modal.open') };
    })()`);
    console.log('  睡眠：' + JSON.stringify(D));
    if (D.__err) { ck(s.n + '：睡眠面板可测', false, JSON.stringify(D)); }
    else {
      ck(s.n + '：睡眠面板提前警告"中毒/流血睡觉也掉血"',
         (D.警告 || []).some(t => /中毒/.test(t) && /睡觉不会让它停/.test(t)), (D.警告 || []).join(' ‖ ').slice(0, 150));
      ck(s.n + '：预报写明这一觉还要掉多少血（毒×3 + 流血×2 = 19）',
         D.预报 && D.预报.debuffHp === 19 && D.预报.poisonTicks === 3 && D.预报.bleedTicks === 2, JSON.stringify(D.预报));
      const exp = Math.min(D.hpMax, D.hp0 + (D.预报 ? D.预报.hp : 0)) - 19;
      ck(s.n + '：★ 真睡一觉后中毒/流血照常发作、醒来正好少 19 点',
         D.hp1 === Math.round(exp) && D.毒剩 === 0 && D.血剩 === 0,
         '生命 ' + D.hp0 + ' + ' + (D.预报 && D.预报.hp) + ' − 19 = ' + Math.round(exp) + '，实际 ' + D.hp1 + '；毒=' + D.毒剩 + ' 血=' + D.血剩);
      await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'sleep_' + s.w + '.png'), Buffer.from(x.data, 'base64')));
    }
  }

  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');
  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('\n通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
