/* 开场分镜探针：
   ① 新存档（新的旅程 → 槽 → 身份 → 难度）会播 5 格分镜，翻到最后一格出「第 1 天 · 海难」卡；
   ② 「跳过」真的能跳过去；
   ③ 继续上次游戏 / 读档【不该】再播分镜。
   顺便把第 1 格和第 3 格截图到 开发工具\检查\_out\。
   用法：node _debug_comic.js */
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const OUT = path.join(__dirname, '_out');
const PORT = 9481, PROFILE = path.join(require('os').tmpdir(), 'guyu_comic_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r => { let b = ''; r.on('data', c => b += c); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
  let t = null;
  for (let i = 0; i < 60 && !t; i++) { await sleep(250); try { t = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(x => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (me, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => (m.error ? rej(new Error(me)) : res(m.result))); ws.send(JSON.stringify({ id: i, method: me, params: p || {} })); });
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result && r.result.value; };
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    const f = path.join(OUT, name + '.png');
    fs.writeFileSync(f, Buffer.from(r.data, 'base64'));
    console.log('截图 → ' + f);
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2800);
  await ev('localStorage.clear()');
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2600);

  // ---- ① 开新局：加载画面期间不该有分镜，2.4 秒后第 1 格出现 ----
  // 探针是程序化点击（isTrusted === false），默认会被"真人点击才播"那道门挡掉 —— 这里强制打开分镜
  await ev('window.__guyuForceComic = 1');
  const a = await ev(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
    clk('#btn-new'); await wait(600); clk('.identity'); await wait(600); clk('.identity'); await wait(600); clk('.identity');
    await wait(1000);
    const out = { 加载时就有分镜: !!document.querySelector('#comic-screen') };
    await wait(2600);
    out.分镜出现 = !!document.querySelector('#comic-screen');
    out.标题 = (document.querySelector('.comic-title') || {}).textContent || '';
    out.进度 = (document.querySelector('.comic-step') || {}).textContent || '';
    out.图 = (document.querySelector('#comic-img') || {}).getAttribute ? document.querySelector('#comic-img').getAttribute('src') : '';
    out.图真的是这张 = await new Promise(res => { const i = document.querySelector('#comic-img'); if (!i || !i.complete) { if (i) i.onload = () => res('异步加载完成 ' + i.naturalWidth + '×' + i.naturalHeight); else res('没有图元素'); } else res(i.naturalWidth + '×' + i.naturalHeight); });
    out.按钮 = [...document.querySelectorAll('.comic-bar button')].map(b => b.textContent.trim());
    out.点数 = document.querySelectorAll('.comic-dots i').length;
    return out;
  })()`);
  console.log('① 新存档：', JSON.stringify(a, null, 1));
  await shot('comic_frame1');

  // ---- ② 翻页到第 3 格 ----
  const b = await ev(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('#comic-next').click(); await wait(900);
    document.querySelector('#comic-next').click(); await wait(1300);
    return { 标题: (document.querySelector('.comic-title') || {}).textContent || '', 进度: (document.querySelector('.comic-step') || {}).textContent || '',
      正文: (document.querySelector('.comic-text') || {}).textContent.slice(0, 30) };
  })()`);
  console.log('② 翻到第 3 格：', JSON.stringify(b));
  await shot('comic_frame3');

  // ---- ③ 走到最后：出「第 1 天 · 海难」卡；然后回主菜单测「继续上次游戏」不该再播 ----
  const c = await ev(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('#comic-next').click(); await wait(700);
    document.querySelector('#comic-next').click(); await wait(700);
    const last = { 最后一格: (document.querySelector('.comic-title') || {}).textContent || '', 按钮: (document.querySelector('#comic-next') || {}).textContent || '' };
    document.querySelector('#comic-next').click(); await wait(1000);
    const out = Object.assign(last, {
      分镜收掉: !document.querySelector('#comic-screen'),
      序章卡: (document.querySelector('#modal .modal-title') || {}).textContent || '（没有）',
    });
    // 关掉序章卡，回主菜单，再「继续上次游戏」
    for (let i = 0; i < 6 && document.querySelector('#modal.open'); i++) { const x = document.querySelector('#modal [data-choice], #modal .modal-actions button'); if (!x) break; x.click(); await wait(500); }
    document.querySelector('#nav [data-nav="save"]').click(); await wait(700);
    const home = [...document.querySelectorAll('#modal button')].find(x => /回到主菜单/.test(x.textContent));
    if (home) { home.click(); await wait(1200); }
    out.回到标题 = !!document.querySelector('#title-screen');
    const loadBtn = document.querySelector('#btn-load');
    out.有继续按钮 = !!loadBtn;
    if (loadBtn) { loadBtn.click(); await wait(3200); }
    out.继续时不播分镜 = !document.querySelector('#comic-screen');
    out.继续后在哪 = (document.querySelector('#modal .modal-title') || {}).textContent || '（无弹窗）';
    return out;
  })()`);
  console.log('③ 播完 + 继续上次游戏：', JSON.stringify(c, null, 1));

  // ---- ④ 再开一局，测「跳过」 ----
  const d = await ev(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
    for (let i = 0; i < 6 && document.querySelector('#modal.open'); i++) { const x = document.querySelector('#modal [data-choice], #modal .modal-actions button'); if (!x) break; x.click(); await wait(400); }
    clk('#nav [data-nav="save"]'); await wait(700);
    const home = [...document.querySelectorAll('#modal button')].find(x => /回到主菜单/.test(x.textContent));
    if (home) { home.click(); await wait(1200); }
    clk('#btn-new'); await wait(700);
    // 存档槽：点第一个空的（空的会进身份选择）
    clk('.identity'); await wait(700); clk('.identity'); await wait(700); clk('.identity'); await wait(3800);
    const out = { 分镜出现: !!document.querySelector('#comic-screen') };
    const sk = document.querySelector('#comic-skip');
    out.有跳过 = !!sk;
    if (sk) { sk.click(); await wait(1000); }
    out.跳过后分镜没了 = !document.querySelector('#comic-screen');
    out.跳过后弹的是 = (document.querySelector('#modal .modal-title') || {}).textContent || '（没有）';
    out.日志 = [...document.querySelectorAll('#logbody div')].slice(-2).map(x => x.textContent.slice(0, 26));
    return out;
  })()`);
  console.log('④ 跳过：', JSON.stringify(d, null, 1));
  ws.close(); chrome.kill();
}
main();
