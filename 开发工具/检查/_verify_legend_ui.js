/* 浏览器验证：传奇档邮箱/兑换码界面是否置灰并写明原因 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_legend_shots');
const PORT = 9441;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_lg_' + process.pid);
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

  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2800);
  // 用传奇难度开局（难度按钮在开局流程里）
  const start = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('#btn-new').click(); await w(500);
    for (let i = 0; i < 3; i++) { const b = document.querySelector('.identity'); if (b) b.click(); await w(450); }
    await w(1500);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
    return Game.S() ? Game.S().difficulty : 'no-state';
  })()`);
  console.log('开局难度: ' + start);
  // 直接改成传奇 + 塞邮件，再看界面（比走开局 UI 稳定）
  const r = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const S = Game.S(); S.tut = null; S.difficulty = 'legend';
    const m = Game.metaState();
    m.mailbox = [ { item:'beibi', qty:100 }, { relic:'vampire' }, { soul:100 }, { notice:'vT', title:'测试公告', body:'正文' } ];
    // 打开邮箱
    // 打开邮箱：顶栏那个「✉ 邮箱」按钮
    const mb = document.querySelector('#btn-mail');
    if (mb) mb.click();
    await w(900);
    const items = [...document.querySelectorAll('#modal .help-item')].map(x => ({
      文本: x.textContent.replace(/\\s+/g,' ').trim().slice(0, 60),
      按钮: [...x.querySelectorAll('button')].map(b => ({ t: b.textContent.trim(), disabled: b.disabled }))
    }));
    return { 难度: Game.S().difficulty, items };
  })()`);
  console.log('');
  (r.items || []).forEach(x => console.log('  · ' + x.文本 + '  → ' + JSON.stringify(x.按钮)));
  const supplyBtns = (r.items || []).filter(x => !/公告/.test(x.文本));
  ck('★ 传奇档物资邮件的按钮是禁用态且写着"传奇档不可领"',
     supplyBtns.length > 0 && supplyBtns.every(x => x.按钮.some(b => b.disabled && /传奇档不可领/.test(b.t))),
     supplyBtns.length + ' 封物资邮件');
  ck('★ 界面上写明了原因（换低难度再来领）',
     (r.items || []).some(x => /传奇难度下不能领取物资邮件/.test(x.文本)));
  const noticeItem = (r.items || []).find(x => /公告/.test(x.文本));
  ck('公告邮件仍可读（按钮不是禁用）', noticeItem && noticeItem.按钮.some(b => !b.disabled && /知道了/.test(b.t)),
     noticeItem ? JSON.stringify(noticeItem.按钮) : '没找到公告');
  await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'legend_mail.png'), Buffer.from(x.data, 'base64')));

  // 兑换码页
  const r2 = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const tabInfo = () => [...document.querySelectorAll('#modal [data-mailtab]')].map(b => b.dataset.mailtab + (b.classList.contains('active') ? '(激活)' : ''));
    const before = tabInfo();
    const tab = [...document.querySelectorAll('#modal [data-mailtab]')].find(b => /兑换码/.test(b.textContent));
    const tabFound = !!tab;
    if (tab) tab.click();
    await w(900);
    const after1 = tabInfo();
    const t2 = [...document.querySelectorAll('#modal [data-mailtab]')].find(b => /兑换码/.test(b.textContent));
    if (t2) t2.click();
    await w(900);
    const after2 = tabInfo();
    const inp = document.querySelector('#modal #redeem-code');
    const btn = document.querySelector('#modal #redeem-do');
    return { tabFound, before, after1, after2, 模态框存在: !!document.querySelector('#modal'),
             按钮: btn ? btn.textContent.trim() : null, 输入框禁用: inp ? inp.disabled : null, 按钮禁用: btn ? btn.disabled : null,
             文本片段: ((document.querySelector('#modal')||{}).textContent||'').replace(/\s+/g,' ').slice(0,110),
             有说明: /传奇难度下不能兑换物资/.test((document.querySelector('#modal')||{}).textContent || '') };
  })()`);
  console.log('');
  console.log('兑换码页: ' + JSON.stringify(r2));
  ck('★ 传奇档兑换码输入框与按钮都禁用', r2.输入框禁用 === true && r2.按钮禁用 === true, r2.按钮文字);
  ck('★ 写明了"兑换码不会被消耗，换低难度再来"', r2.有说明 === true);
  await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'legend_code.png'), Buffer.from(x.data, 'base64')));
  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');

  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('');
  console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  console.log('截图 → ' + OUT);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
