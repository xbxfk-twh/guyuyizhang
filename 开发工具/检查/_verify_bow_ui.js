/* 浏览器验证：神弓配方在精工工作台可见、物品图标是彩色的、详情页有"存入邮箱" */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_out', 'bow');
const PORT = 9439;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_bow_' + process.pid);
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
    const S = Game.S(); S.tut = null; S.furniture.wb2 = 1;
    S.inv = {};                       // 清空背包：材料才有地方放、神弓才装得下
    const m = Game.metaState(); m.mailbox = (m.mailbox || []).filter(x => !x || x.item !== 'divineBow');
    return 1;
  })()`);

  // ① 工作台配方：材料不足时应该显示为锁定 + 名称带「限定」
  const rec = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('#nav [data-nav="craft"]').click(); await w(700);
    const tab = [...document.querySelectorAll('#modal [data-station]')].find(b => /精工|工作台/.test(b.textContent));
    if (tab) { tab.click(); await w(700); }
    const rows = [...document.querySelectorAll('#modal .recipe, #modal .recipe-row')].map(r => r.textContent.replace(/\\s+/g,' ').trim());
    return { tab: tab ? tab.textContent.trim() : '无', rows: rows.filter(r => /神弓|限定/.test(r)) };
  })()`);
  console.log('① 工作台: ' + JSON.stringify(rec.tab));
  rec.rows.forEach(r => console.log('    ' + r.slice(0, 100)));
  ck('★ 配方出现在工作台里，名字标了「限定」', rec.rows.some(r => /限定 · 神弓/.test(r)));
  ck('材料不足时显示为锁定（列出缺什么）', rec.rows.some(r => /材料不足|秘银锭/.test(r)));

  // ② 给全材料 → 做出神弓 → 看背包里图标是彩色的
  const inv = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const REC = RECIPES.find(r => r.id === 'r_divinebow');
    for (const k in REC.in) Game.addItem(k, REC.in[k], true);
    Game.craft(REC);
    await w(400);
    document.querySelector('#modal #modal-close').click(); await w(300);
    document.querySelector('#nav [data-nav="inv"]').click(); await w(800);
    const imgs = [...document.querySelectorAll('#modal img.item-icon')].map(i => ({ src: i.getAttribute('src'), w: i.getBoundingClientRect().width }));
    const bowImg = imgs.find(x => /divineBow/.test(x.src));
    return { 有神弓: Game.invCount('divineBow'), 图标: bowImg || null, 全部彩色数: imgs.filter(x => /items-accent/.test(x.src)).length };
  })()`);
  console.log('');
  console.log('② 做出神弓: ' + JSON.stringify(inv));
  ck('★ 能做出来并进背包', inv.有神弓 === 1, 'invCount=' + inv.有神弓);
  ck('★ 图标走彩色目录（items-accent/divineBow.png）', inv.图标 && /items-accent\/divineBow\.png/.test(inv.图标.src), inv.图标 && inv.图标.src);
  ck('★ 彩色图标尺寸正常（32px，不会糊脸）', inv.图标 && Math.round(inv.图标.w) === 32, inv.图标 && inv.图标.w + 'px');
  await send('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(OUT, 'bow_in_bag.png'), Buffer.from(r.data, 'base64')));

  // ③ 详情页有"存入邮箱"按钮
  const det = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const b = [...document.querySelectorAll('#modal [data-item]')].find(x => /data-item="divineBow"/.test(x.outerHTML));
    if (!b) return { err: '背包里找不到神弓格子' };
    b.click(); await w(700);
    return { 按钮: [...document.querySelectorAll('#modal button')].map(x => x.textContent.trim()).filter(x => /邮箱|装备|丢弃/.test(x)) };
  })()`);
  console.log('');
  console.log('③ 详情页按钮: ' + JSON.stringify(det));
  ck('★ 详情页有「存入邮箱（跨局）」按钮', (det.按钮 || []).some(x => /存入邮箱/.test(x)));
  await send('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(OUT, 'bow_detail.png'), Buffer.from(r.data, 'base64')));

  // ④ 点存入 → 邮箱里出现神弓
  const stored = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const b = [...document.querySelectorAll('#modal button')].find(x => /存入邮箱/.test(x.textContent));
    if (!b) return { err: '没有存入按钮' };
    b.click(); await w(900);
    const mbox = [...document.querySelectorAll('#modal .help-item')].map(x => x.textContent.replace(/\\s+/g,' ').trim().slice(0, 90));
    return { 背包还有没有: Game.invCount('divineBow'), 邮箱: mbox.filter(x => /神弓/.test(x)) };
  })()`);
  console.log('');
  console.log('④ 点存入邮箱: ' + JSON.stringify(stored));
  ck('★ 存入后当前局失去这把弓', stored.背包还有没有 === 0, 'inv=' + stored.背包还有没有);
  ck('★ 邮箱里出现神弓（带耐久）', (stored.邮箱 || []).some(x => /神弓/.test(x) && /耐久/.test(x)), (stored.邮箱 || []).join(' | ').slice(0, 80));
  await send('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(OUT, 'bow_mail.png'), Buffer.from(r.data, 'base64')));
  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');

  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('');
  console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  console.log('截图 → ' + OUT);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
