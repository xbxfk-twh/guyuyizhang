/* 手机端 UI 体检（作者 2026-09-24："手机端ui着重改善"）
   逐面板量：①内容有没有横向溢出 ②有没有元素超出弹窗右边界 ③可点区域够不够大(≥36px)
   ④关键容器的实际尺寸。只报告，不改游戏文件。 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = process.env.GUYU_GAME_ROOT || 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_out', 'mobileaudit');
const PORT = 9507;
const PROFILE = path.join(os.tmpdir(), 'guyu_ma_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });

const SIZES = [
  { n: 'iPhone 竖屏', w: 390, h: 844 },
  { n: '手机横屏', w: 844, h: 390 },
  { n: '小屏横屏', w: 667, h: 375 },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, 'about:blank'], { stdio: 'ignore' });
  let t = null;
  for (let i = 0; i < 60 && !t; i++) { await sleep(250); try { t = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(x => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (me, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => (m.error ? rej(new Error(me + ':' + JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method: me, params: p || {} })); });
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 260) }; return r.result && r.result.value; };
  const url = 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html');

  // 在页面里装一个通用的"量面板"函数
  const AUDIT_FN = `window.__ma = (name) => {
    const m = document.querySelector('#modal');
    if (!m || !m.classList.contains('open')) return { 面板: name, 打开: false };
    const mc = m.querySelector('.modal-content');
    const r = mc.getBoundingClientRect();
    const out = { 面板: name, 打开: true,
      弹窗: Math.round(r.width) + 'x' + Math.round(r.height),
      横向溢出: mc.scrollWidth - mc.clientWidth,
      纵向可滚: mc.scrollHeight - mc.clientHeight };
    // 超出右边界 / 左边界 的元素
    const over = [];
    mc.querySelectorAll('*').forEach(el => {
      const q = el.getBoundingClientRect();
      if (q.width === 0 && q.height === 0) return;
      if (q.right > r.right + 1.5 || q.left < r.left - 1.5) {
        const t = (el.textContent || '').trim().slice(0, 14);
        over.push((el.className || el.tagName) + (t ? '[' + t + ']' : ''));
      }
    });
    out.越界元素 = over.slice(0, 6); out.越界数 = over.length;
    // 可点区域太小的
    const small = [];
    mc.querySelectorAll('button, .tab, [data-recipe], [data-uid], [data-fid], [data-buy], [data-sell]').forEach(b => {
      const q = b.getBoundingClientRect();
      if (q.width === 0 && q.height === 0) return;
      if (q.height < 36 || q.width < 30) small.push((b.textContent || '').trim().slice(0, 12) + ' ' + Math.round(q.width) + 'x' + Math.round(q.height));
    });
    out.小触控 = small.slice(0, 6); out.小触控数 = small.length;
    const side = mc.querySelector('.work-side');
    if (side) out.左栏 = Math.round(side.getBoundingClientRect().width);
    const note = mc.querySelector('.work-note');
    if (note) out.提示 = (note.textContent || '').trim().slice(0, 20);
    return out;
  }; 1;`;

  for (const s of SIZES) {
    await send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 1, mobile: true });
    await send('Page.navigate', { url });
    await sleep(2600);
    await ev(`(async () => {
      const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
      const w = ms => new Promise(r => setTimeout(r, ms));
      clk('#btn-new'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(1600);
      for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
      const S = Game.S(); if (!S) return;
      S.tut = null; S.stats.stamina = 9999; S.minute = 600;
      S.laochao = { arrived: true, arrivedDay: S.day, nextVisit: 99 };
      // 把工坊都建出来，才能量到全部制造分类
      ['wb1','fr1','sm1','bed1','grindstone','rack','stove','mortar','medPot','loom','spin','tannery'].forEach(id => { S.furniture[id] = true; });
      Game.addItem('wood', 99, true); Game.addItem('stone', 99, true); Game.addItem('plank', 99, true);
      Game.addItem('meat', 20, true); Game.addItem('salt', 20, true); Game.addItem('bpStew', 1, true);
      Game.addItem('bpOmelette', 1, true); Game.addItem('bpCake', 1, true);
      S.fame = 5;
      Game.change(); await w(500);
      return 1;
    })()`);
    await ev(AUDIT_FN);

    const panels = [
      ['制造·手工', `(()=>{document.querySelector('#nav [data-nav="craft"]').click()})()`, 700],
      ['制造·篝火', `(()=>{const t=[...document.querySelectorAll('#modal [data-station="fire"]')][0];if(t)t.click()})()`, 600],
      ['制造·其他家具', `(()=>{const t=[...document.querySelectorAll('#modal [data-station="furniture"]')][0];if(t)t.click()})()`, 600],
      ['制造·工具台', `(()=>{const t=[...document.querySelectorAll('#modal [data-station="work1"]')][0];if(t)t.click()})()`, 600],
      ['背包', `(()=>{document.querySelector('#modal .modal-x')?.click();document.querySelector('#nav [data-nav="inv"]').click()})()`, 700],
      ['装备', `(()=>{document.querySelector('#modal .modal-x')?.click();document.querySelector('#nav [data-nav="equip"]').click()})()`, 700],
      ['营地建造', `(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.querySelector('#modal .modal-x')?.click();await w(300);Game.S().scene='camp';Game.change();await w(600);const h=[...document.querySelectorAll('.hotspot')].find(x=>/营地升级/.test(x.textContent));if(h)h.click()})()`, 900],
      ['老潮摊', `(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.querySelector('#modal .modal-x')?.click();await w(300);Game.S().scene='camp';Game.change();await w(600);const a=[...document.querySelectorAll('#scene-actions .action-btn')].find(b=>/老潮/.test(b.textContent));if(a)a.click();await w(300);const t=document.querySelector('#modal [data-ttab="sell"]');if(t)t.click()})()`, 900],
      ['牧场', `(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.querySelector('#modal .modal-x')?.click();await w(300);Game.S().scene='camp';Game.S().furniture.coop=true;Game.S().furniture.pen=true;Game.change();await w(500);const h=[...document.querySelectorAll('.hotspot')].find(x=>/营地升级/.test(x.textContent));if(h)h.click();await w(700);const b=document.querySelector('#modal [data-live]');if(b)b.click()})()`, 900],
      ['攻略', `(()=>{document.querySelector('#modal .modal-x')?.click();document.querySelector('#btn-guide').click()})()`, 700],
      ['设置', `(()=>{document.querySelector('#modal .modal-x')?.click();document.querySelector('#nav [data-nav="save"]').click()})()`, 500],
    ];
    console.log('\n============================ 【' + s.n + ' ' + s.w + 'x' + s.h + '】 ============================');
    for (const [name, openExpr, wait] of panels) {
      await ev(openExpr); await sleep(wait);
      if (name === '设置') { await ev(`(()=>{const b=document.querySelector('#modal [data-savemenu="settings"]');if(b)b.click()})()`); await sleep(600); }
      const r = await ev(`window.__ma(${JSON.stringify(name)})`);
      if (!r || r.打开 === false) { console.log('  ' + name + '  —— 没打开'); continue; }
      const flag = (r.横向溢出 > 1 || r.越界数 > 0 || r.小触控数 > 0) ? ' ⚠' : '  ';
      console.log(flag + ' ' + name.padEnd(12) + ' 弹窗 ' + r.弹窗 + '  横向溢出 ' + r.横向溢出 + '  越界 ' + r.越界数 + '  小触控 ' + r.小触控数 + (r.左栏 ? '  左栏 ' + r.左栏 + 'px' : ''));
      if (r.越界数) console.log('        越界：' + r.越界元素.join(' / '));
      if (r.小触控数) console.log('        小触控：' + r.小触控.join(' / '));
    }
    await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'ma-' + s.w + 'x' + s.h + '.png'), Buffer.from(x.data, 'base64')));
  }
  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
})();
