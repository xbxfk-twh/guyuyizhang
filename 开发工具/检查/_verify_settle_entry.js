/* 结局「结算」入口位置复核（作者 2026-09-23：从右下角搬进「装备 → 属性」人物立绘下方）

   背景：这批按钮不跟场景绑定，只要"已达成但没结算"就连大地图都挂在右下角 #scene-actions 里，
   常年压住画面（"放这里有点遮挡"）。现在统一渲染在属性标签页人物立绘下方。
   搬走的只有「结算」，「达成」按钮仍留在右下角 —— 本探针两个方向都要盯住。 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = process.env.GUYU_GAME_ROOT || 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_out', 'settleentry');
const PORT = 9495;
const PROFILE = path.join(os.tmpdir(), 'guyu_settle_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });
let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };

const SIZES = [
  { n: 'iPhone 竖屏', w: 390, h: 844, mobile: true },
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
    await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
    await sleep(2600);

    // 开局 → 造出"结局 A 已达成、还没结算"的局面（这正是以前右下角会挂按钮的状态）
    const boot = await ev(`(async () => {
      const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
      const w = ms => new Promise(r => setTimeout(r, ms));
      clk('#btn-new'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(1600);
      for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
      const S = Game.S(); if (!S) return 'no-state';
      S.tut = null; S.flags.ended_A = 1;
      return 'ok';
    })()`);
    if (boot !== 'ok') { ck(s.n + '：开局成功', false, String(boot)); continue; }

    // ① 右下角：不该再有「结算」按钮
    const hud = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const n = document.querySelector('#nav [data-nav="bag"]'); if (n) n.click(); await w(300);
      const n2 = document.querySelector('#nav [data-nav="scene"]') || document.querySelector('#nav [data-nav="map"]'); if (n2) n2.click(); await w(700);
      const btns = [...document.querySelectorAll('#scene-actions .action-btn')];
      return { 全部: btns.map(b => b.textContent.trim()), 结算类: btns.filter(b => /结算/.test(b.textContent)).length };
    })()`);
    console.log('\n【' + s.n + ' ' + s.w + 'x' + s.h + '】右下角按钮：' + JSON.stringify(hud.全部));
    ck(s.n + '：右下角不再挂「结算 · 结局」按钮', hud.结算类 === 0, '结算类 ' + hud.结算类 + ' 个');

    // ①b 反向保护：满足条件时「达成」按钮**必须还在右下角** —— 别把整个结局入口都收走了
    const achieve = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const S = Game.S();
      S.scene = 'camp'; S.fame = 4; S.buildings.wall = 3;
      S.flags.boss_pirateBoss = 1; S.flags.ended_B = 0;
      const n = document.querySelector('#nav [data-nav="bag"]'); if (n) n.click(); await w(300);
      const n2 = document.querySelector('#nav [data-nav="scene"]') || document.querySelector('#nav [data-nav="map"]'); if (n2) n2.click(); await w(700);
      const btns = [...document.querySelectorAll('#scene-actions .action-btn')].map(b => b.textContent.trim());
      return { 全部: btns, 有岛主: btns.some(t => /岛主/.test(t)), 有结算: btns.some(t => /结算/.test(t)) };
    })()`);
    console.log('  达成按钮：' + JSON.stringify(achieve.全部));
    ck(s.n + '：满足条件时「达成」按钮仍在右下角（没被一起收走）', achieve.有岛主 === true, achieve.全部.join(' / '));
    ck(s.n + '：此时右下角依然不含「结算」按钮', achieve.有结算 === false);

    // ② 装备 → 属性：结算入口在人物立绘下方
    const attr = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const n = document.querySelector('#nav [data-nav="equip"]'); if (!n) return { __err: 'no equip nav' };
      n.click(); await w(700);
      const tab = document.querySelector('#modal [data-equiptab="attr"]'); if (!tab) return { __err: 'no attr tab' };
      tab.click(); await w(700);
      const box = document.querySelector('#modal .attr-settle');
      const img = document.querySelector('#modal .attr-portrait');
      const right = document.querySelector('#modal .attr-right');
      if (!box) return { 没有结算块: true, 右下角已清空: true };
      const b = box.getBoundingClientRect(), i = img ? img.getBoundingClientRect() : null, rr = right.getBoundingClientRect();
      const btns = [...box.querySelectorAll('.attr-settle-btn')];
      const br = btns.map(x => { const q = x.getBoundingClientRect(); return { t: x.textContent.trim(), top: Math.round(q.top), bottom: Math.round(q.bottom), w: Math.round(q.width), h: Math.round(q.height) }; });
      // ⚠️ 属性面板是**可滚动的**（.work-scroll），所以"必须落在视口内"是个错误的标准 ——
      //    立绘本身就是长图，手机上它自己也在首屏之下。这里改判"在滚动容器里、可滚到、没被裁掉"。
      const sc = document.querySelector('#modal .work-scroll');
      const scr = sc ? sc.getBoundingClientRect() : null;
      // 滚到底，看结算块能不能真正露出来（这是"够不够得到"的硬标准）
      let 滚到底后可见 = null, 滚到底后顶 = null;
      if (sc) {
        sc.scrollTop = sc.scrollHeight;
        await new Promise(r => setTimeout(r, 260));
        const b2 = box.getBoundingClientRect(), s2 = sc.getBoundingClientRect();
        const q = btns[0] ? btns[0].getBoundingClientRect() : null;
        滚到底后可见 = !!(q && q.top >= s2.top - 1 && q.bottom <= s2.bottom + 1);
        滚到底后顶 = q ? Math.round(q.top) : null;
      }
      return {
        按钮: br.map(x => x.t), 数量: br.length,
        立绘底: i ? Math.round(i.bottom) : null,
        立绘高: i ? Math.round(i.height) : null,
        结算块顶: Math.round(b.top), 结算块底: Math.round(b.bottom),
        滚动区高: scr ? Math.round(scr.height) : null, 滚动内容高: sc ? sc.scrollHeight : null,
        滚到底后可见: 滚到底后可见, 滚到底后按钮顶: 滚到底后顶,
        在右栏内: b.left >= rr.left - 1 && b.right <= rr.right + 1,
        按钮高都够点: br.every(x => x.h >= 24),
        对比度: (() => {
          // ⚠️ 作者 2026-09-25："右下角字看不见了，调一下颜色" ——
          //    立绘下面这三行原来用的是 --paper/--paper2（浅纸色），压在同样浅的纸底上几乎看不见。
          //    这里按 WCAG 相对亮度算真实对比度，断言 ≥4.5（小字的 AA 线）。
          // 注意：这段是塞进模板字符串里的，正则里的 \d \s 必须写成 \\d \\s，否则会被模板字符串吃掉。
          const lum = (c) => { const m = String(c).match(/[\\d.]+/g) || [0, 0, 0]; const f = m.slice(0, 3).map(v => { v = Number(v) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
          const ratio = (a, b2) => { const l1 = lum(a), l2 = lum(b2); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
          const bgOf = (el) => {
            // 往上找最近一层"真的画了底"的祖先；都透明就用主题的 --paper
            // （面板底色来自变量，逐层 getComputedStyle 常常拿到 rgba(0,0,0,0)）
            let n = el;
            while (n && n !== document.documentElement) {
              const c = getComputedStyle(n).backgroundColor;
              const 透明 = !c || c === 'transparent' || /rgba?\\([^)]*,\\s*0\\s*\\)/.test(c);
              if (!透明) return c;
              n = n.parentElement;
            }
            const paper = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
            return paper || '#eae6da';
          };
          const rows = [['角色名', document.querySelector('#modal .attr-char')], ['本局结局', document.querySelector('#modal .attr-settle-title')], ['结算说明', document.querySelector('#modal .attr-settle-note')]];
          return rows.map(([n, el]) => {
            if (!el) return { 名: n, 缺: true };
            const cs = getComputedStyle(el);
            const bg = bgOf(el);
            return { 名: n, 字色: cs.color, 底: bg, 对比度: Math.round(ratio(cs.color, bg) * 100) / 100 };
          });
        })(),
      };
    })()`);
    console.log('  属性栏：' + JSON.stringify(attr));
    if (attr.__err || attr.没有结算块) { ck(s.n + '：属性栏立绘下方出现结算入口', false, JSON.stringify(attr)); }
    else {
      ck(s.n + '：属性栏立绘下方出现结算入口', attr.数量 >= 1, attr.按钮.join(' / '));
      ck(s.n + '：确实在人物立绘【下方】（不压住立绘）', attr.结算块顶 >= attr.立绘底 - 1, '立绘底 ' + attr.立绘底 + ' → 结算块顶 ' + attr.结算块顶);
      ck(s.n + '：结算块在右栏宽度内', attr.在右栏内);
      ck(s.n + '：面板滚到底能完整看到结算按钮（够得到）', attr.滚到底后可见 === true, '滚到底后按钮顶 y=' + attr.滚到底后按钮顶 + ' / 滚动区高 ' + attr.滚动区高);
      ck(s.n + '：按钮高度 ≥24px（手机点得准）', attr.按钮高都够点);
      // 立绘下面那三行的可读性（作者 2026-09-25："右下角字看不见了"）
      const low = (attr.对比度 || []).filter(r => !r.缺 && r.对比度 < 4.5);
      ck(s.n + '：★ 立绘下方的角色名 / 本局结局 / 结算说明都看得清（对比度 ≥4.5）',
         (attr.对比度 || []).length === 3 && (attr.对比度 || []).every(r => !r.缺) && low.length === 0,
         (attr.对比度 || []).map(r => r.名 + ' ' + (r.缺 ? '缺' : r.对比度)).join(' · '));
    }

    // ③ 点下去先弹确认；取消回到属性面板，确定才真的结算（作者 2026-09-25 要求加确认）
    const ask = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const b = document.querySelector('#modal .attr-settle-btn'); if (!b) return { __err: 'no btn' };
      b.click(); await w(700);
      const title = (document.querySelector('#modal .modal-title') || {}).textContent || '';
      const txt = (document.querySelector('#modal .overlay-text') || {}).textContent || '';
      const choices = [...document.querySelectorAll('#modal [data-choice]')].map(x => x.textContent.trim());
      return { 标题: title, 正文: txt, 选项: choices,
               还没结算: Game.S().ending == null && Game.S().flags.settledEnding == null,
               结局画面出现: !!document.querySelector('#ending-screen') };
    })()`);
    console.log('  点结算后：' + JSON.stringify(ask));
    if (ask.__err) { ck(s.n + '：结算前会弹确认框', false, JSON.stringify(ask)); }
    else {
      ck(s.n + '：★ 点「结算」先弹确认框（不再直接结算）', /确认结算/.test(ask.标题) && (ask.选项 || []).length === 2, ask.标题 + ' / ' + (ask.选项 || []).join(' | '));
      ck(s.n + '：确认框里写清了"一局只能结算一个、不能撤销"',
         /只能结算一个/.test(ask.正文) && /不能撤销|请再确认/.test(ask.正文), (ask.正文 || '').replace(/\s+/g, ' ').slice(0, 90));
      ck(s.n + '：⛔ 确认之前一点都没动（还没结算、也没弹结局画面）', ask.还没结算 === true && ask.结局画面出现 === false, JSON.stringify(ask));
    }
    const cancel = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const c = [...document.querySelectorAll('#modal [data-choice]')].find(x => /取消/.test(x.textContent));
      if (!c) return { __err: '没有取消按钮' };
      c.click(); await w(700);
      return { 回到属性面板: !!document.querySelector('#modal .attr-settle-btn'),
               还没结算: Game.S().ending == null,
               结局画面出现: !!document.querySelector('#ending-screen') };
    })()`);
    console.log('  点取消后：' + JSON.stringify(cancel));
    ck(s.n + '：取消后回到属性面板、什么都没变',
       cancel.回到属性面板 === true && cancel.还没结算 === true && cancel.结局画面出现 === false, JSON.stringify(cancel));

    const did = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      document.querySelector('#modal .attr-settle-btn').click(); await w(600);
      const ok2 = [...document.querySelectorAll('#modal [data-choice]')].find(x => /确定结算/.test(x.textContent));
      if (!ok2) return { __err: '没有"确定结算"按钮', 选项: [...document.querySelectorAll('#modal [data-choice]')].map(x => x.textContent.trim()) };
      ok2.click(); await w(1100);
      return { ending: Game.S().ending, settled: Game.S().flags.settledEnding,
               装备面板还开着: !!document.querySelector('#modal.open'),
               结局画面出现: !!document.querySelector('#ending-screen') };
    })()`);
    console.log('  点确定后：' + JSON.stringify(did));
    ck(s.n + '：点「确定结算」才真的结算（ending=A）', did.ending === 'A' && did.settled === 'A', JSON.stringify(did));
    ck(s.n + '：结算后装备面板已关闭（结局画面不叠在上面）', did.装备面板还开着 === false);
    ck(s.n + '：结算后出现结局画面', did.结局画面出现 === true);

    await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'settle_' + s.w + 'x' + s.h + '.png'), Buffer.from(x.data, 'base64')));
  }

  // ④ 已经收尾过的存档：属性栏里也不该再出现结算入口
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2600);
  const done = await ev(`(async () => {
    const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(1600);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
    const S = Game.S(); S.tut = null;
    S.flags.ended_A = 1; S.flags.ended_B = 1;
    S.flags.settled_A = 1; S.flags.settledEnding = 'A';   // 本局已经用「归乡」收尾
    const n = document.querySelector('#nav [data-nav="equip"]'); n.click(); await w(700);
    const tab = document.querySelector('#modal [data-equiptab="attr"]'); tab.click(); await w(700);
    return { 还有结算块: !!document.querySelector('#modal .attr-settle'),
             该显示的入口: Game.checkEndingActions().map(a => a.id) };
  })()`);
  console.log('\n【已收尾的存档】 ' + JSON.stringify(done));
  ck('已收尾的存档：属性栏里不再出现结算入口', done.还有结算块 === false, JSON.stringify(done.该显示的入口));
  ck('已收尾的存档：checkEndingActions 不再给任何结算入口',
     (done.该显示的入口 || []).every(x => String(x).indexOf('settle_') < 0), (done.该显示的入口 || []).join('/') || '（空）');

  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');
  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('\n通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
