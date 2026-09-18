/* ① 回主界面时日志收起按钮（#log-grip）会不会残留  ② 存档到底写在本机的哪些键里
   用法：node _debug_titlechrome.js  */
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const http = require('http');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const PORT = 9441, PROFILE = path.join(require('os').tmpdir(), 'guyu_title_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r => { let b = ''; r.on('data', c => b += c); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });
async function main() {
  const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=1024,700', 'about:blank'], { stdio: 'ignore' });
  let t = null;
  for (let i = 0; i < 60 && !t; i++) { await sleep(250); try { t = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(x => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (me, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => (m.error ? rej(new Error(me)) : res(m.result))); ws.send(JSON.stringify({ id: i, method: me, params: p || {} })); });
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 250)); return r.result && r.result.value; };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2600);
  const r1 = await ev(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const clk = s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; };
    clk('#btn-new'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(400); clk('.identity'); await wait(1200);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close, #modal .modal-x'); if (!b) break; b.click(); await wait(200); }
    await wait(3400);
    const g = document.getElementById('log-grip');
    return { inGame: !!document.querySelector('#top-day'), grip: g ? getComputedStyle(g).display : '不存在', text: g ? g.textContent : '' };
  })()`);
  console.log('① 进游戏后：', JSON.stringify(r1));
  const r2 = await ev(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    // 菜单 → 回到主菜单
    document.querySelector('#nav [data-nav="save"]').click(); await wait(600);   // 等过防穿透窗口
    const b = [...document.querySelectorAll('#modal .modal-actions button')].find(x => x.textContent.includes('回到主菜单'));
    if (b) { b.click(); await wait(800); }
    const g = document.getElementById('log-grip');
    return { titleShown: !!document.querySelector('#title-screen'), grip: g ? getComputedStyle(g).display : '不存在' };
  })()`);
  console.log('② 回主界面后：', JSON.stringify(r2), r2.titleShown && r2.grip === 'none' ? '  → 没有残留 ✓' : '  → 还有问题 ✗');
  const keys = await ev(`Object.keys(localStorage).filter(k => k.indexOf('guyuyizhang') === 0).map(k => k + ' = ' + (localStorage.getItem(k) || '').length + ' 字符')`);
  console.log('③ 本机存档相关键：'); for (const k of keys) console.log('   ' + k);
  // ④ 标题页版面体检：按钮实际尺寸、图鉴/签到收进设置没、底部「备份点」有没有被切掉
  const measure = `(() => {
    const btns = [...document.querySelectorAll('#title-btns button')];
    const b = btns[0], cs = b ? getComputedStyle(b) : null, br = b ? b.getBoundingClientRect() : null;
    const tip = document.getElementById('title-tip'), tr = tip ? tip.getBoundingClientRect() : null;
    return {
      按钮: btns.map(x => x.textContent.trim()).join(' / '),
      字号: cs ? cs.fontSize : '-',
      外框: br ? Math.round(br.width) + '×' + Math.round(br.height) : '-',
      底部那行: tr ? ('底边 ' + Math.round(tr.bottom) + ' / 视口高 ' + window.innerHeight +
        (tr.bottom > window.innerHeight - 2 ? ' ⚠ 被切' : ' ✓')) : '没有',
      底栏那行的定位父级: (() => { const t = document.getElementById('title-tip'); const p = t && t.offsetParent; return p ? (p.id || p.className || p.tagName) : '无'; })(),
      按钮排布: (() => { const rs = [...document.querySelectorAll('#title-btns button')].map(b => b.getBoundingClientRect());
        const rows = new Set(rs.map(r => Math.round(r.top))).size;
        const right = Math.max(...rs.map(r => r.right)), left = Math.min(...rs.map(r => r.left));
        return rows + ' 行 · 左' + Math.round(left) + '~右' + Math.round(right) + ' / 视口宽 ' + window.innerWidth + (right > window.innerWidth - 2 ? ' ⚠ 出界' : ' ✓'); })(),
      容器盒: ['#app', '#title-screen'].map(s => { const e = document.querySelector(s); if (!e) return s + ' 无'; const r = e.getBoundingClientRect(); return s + ' 顶' + Math.round(r.top) + ' 底' + Math.round(r.bottom) + ' 高' + Math.round(r.height); }).join(' ｜ '),
      文档高: document.documentElement.scrollHeight + ' / 可滚 ' + (document.documentElement.scrollHeight - window.innerHeight),
    };
  })()`;
  console.log('④ 标题页 1024×700：', JSON.stringify(await ev(measure)));
  for (const [w, h, tag] of [[844, 390, '横屏手机 iPhone 14'], [740, 360, '小屏安卓'], [568, 320, '横屏 iPhone SE 一代'], [1180, 820, 'iPad Air 横屏'], [1024, 768, 'iPad 老款']]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    await sleep(450); await ev('window.dispatchEvent(new Event("resize"))'); await sleep(450);
    console.log(`④ 标题页 ${w}×${h}（${tag}）：`, JSON.stringify(await ev(measure)));
  }
  await send('Emulation.clearDeviceMetricsOverride');
  ws.close(); chrome.kill();
}
main();
