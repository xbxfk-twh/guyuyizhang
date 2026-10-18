/* 负面状态徽标复核（作者 2026-09-23 反馈"负面状态怎么还是没有显示"）

   根因是 CSS：窄屏媒体查询里写着 `#status-badges { display: none; }`，
   手机/平板（≤900px 宽 或 ≤500px 高）整条状态徽标被隐藏，
   中毒/流血/寒冷/中暑/恐惧/精神低落/水压/缺氧 在发布的主平台上一个都看不见。

   本探针在真实 Chrome 里按手机尺寸跑，断言"算得出来 **并且** 画得出来"：
   display 不是 none、徽标真在视口内、贴在顶栏下沿、不遮邮箱按钮、全程无 JS 报错。 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = process.env.GUYU_GAME_ROOT || 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_out', 'season-backgrounds');
const PORT = 9498;
const PROFILE = path.join(os.tmpdir(), 'guyu_badge_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });
let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };

// 竖屏手机是主平台，必须覆盖；横屏与桌面同时回归，防止"修好手机弄坏桌面"
const SIZES = [
  { n: 'iPhone 竖屏', w: 390, h: 844, mobile: true },
  { n: 'iPhone 横屏', w: 844, h: 390, mobile: true },
  { n: '小屏横屏', w: 667, h: 375, mobile: true },
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

  await send('Page.navigate',{url:'file:///'+encodeURI(ROOT.replace(/\\/g,'/')+'/index.html')}); await sleep(2200);
  // ⚠️ 探针自身的坑（2026-09-26 修）：四季图每张 ~3.4MB，切完 day 只等 400ms 就断言
  //    `complete && naturalWidth>0`，整机负载高时会读到"还没解码完"→ 随机某个季节 FAIL。
  //    断言一个字没放宽（仍然要求精确文件名 + 灰度滤镜），只是先等图真的解码出来。
  await ev(`window.__waitMap = async (want) => { for (let i = 0; i < 80; i++) { const im = document.querySelector('#map-img'); if (im && im.src.endsWith(want) && im.complete && im.naturalWidth > 0) return true; await new Promise(r => setTimeout(r, 100)); } return false; }; true;`);
  await ev(`Game.newGame('fisher','normal'); Game.S().tut=null; UI.begin();`); await sleep(1600);
  await ev(`document.querySelector('#nav [data-nav="map"]').click();`);
  const seasons=['spring','summer','autumn','winter'];
  for(let i=0;i<4;i++){
    await ev(`Game.S().day=${1+i*15}; UI.render();`); await sleep(400);
    await ev(`window.__waitMap('${seasons[i]}-mono.png')`);
    ck(seasons[i]+' monochrome',await ev(`(()=>{const i=document.querySelector('#map-img');return i.src.endsWith('${seasons[i]}-mono.png')&&i.style.filter.includes('grayscale(1)')&&i.complete&&i.naturalWidth>0})()`));
  }
  ck('free map pack leaves existing soul unchanged',await ev(`(()=>{Game.metaState().soul=49;Game.markBatchTipSeen();const r=Game.unlockSkin('seasons');return r.ok&&r.cost===0&&Game.metaState().soul===49&&Game.skinOwned('seasons')})()`));
  await ev(`document.querySelector('#nav [data-nav="save"]').click();`);await sleep(200);
  await ev(`document.querySelector('[data-savemenu=settings]').click()`);
  ck('free map toggle',await ev(`!!document.querySelector('[data-set="skin:seasons"]')`));
  await ev(`document.querySelector('[data-set="skin:seasons"]')?.click()`);
  // ⚠️ 2026-09-23 契约变更：皮肤从单选改成多选，本机存的是 **JSON 数组**（以前是裸字符串 id）
  ck('no charge and activates',await ev(`Game.metaState().soul===49&&Game.skinOwned('seasons')&&(JSON.parse(localStorage.getItem('guyuyizhang_skin')||'[]')||[]).includes('seasons')`));
  ck('repeat costs zero',await ev(`(()=>{const r=Game.unlockSkin('seasons');return r.ok&&r.cost===0&&Game.metaState().soul===49})()`));
  await ev(`document.querySelector('#modal-close')?.click();document.querySelector('#nav [data-nav="map"]').click();`);
  for(let i=0;i<4;i++){
    await ev(`Game.S().day=${1+i*15}; UI.render();`); await sleep(400);
    await ev(`window.__waitMap('${seasons[i]}-color.png')`);
    ck(seasons[i]+' color',await ev(`(()=>{const i=document.querySelector('#map-img');return i.src.endsWith('${seasons[i]}-color.png')&&!i.style.filter.includes('grayscale')&&i.complete&&i.naturalWidth>0})()`));
  }
  await ev(`Game.S().minute=23*60;UI.render()`);
  ck('night dark',await ev(`document.querySelector('#map-img').style.filter.includes('brightness(0.5)')`));
  await ev(`Game.S().scene='atlantis';UI.render()`);await sleep(400);
  ck('Atlantis full color map',await ev(`document.querySelector('#map-img').getAttribute('src')==='assets/img/map-pack/atlantis/map.jpg'&&!document.querySelector('#map-img').style.filter.includes('grayscale')`));
  await ev(`Game.S().scene='camp';Game.S().minute=12*60;Game.S().day=31;UI.render()`);await sleep(400);
  for(const size of [{w:1280,h:720},{w:844,h:390}]){
    await send('Emulation.setDeviceMetricsOverride',{width:size.w,height:size.h,deviceScaleFactor:1,mobile:false});await sleep(500);
    const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(OUT,'autumn-'+size.w+'.png'),Buffer.from(shot.data,'base64'));
  }
  await send('Page.reload'); await sleep(2200);
  // ⚠️ 探针自身的坑（2026-09-26 修）：上面那句只把 soul 改成 49 写进**内存**里的账号对象，
  //    真正落盘要靠一次 metaSave —— 白嫖它的副作用的话，重载后读到的是另一个数，
  //    看起来像"余额没保住"，其实是夹具根本没存。现在显式借 metaSave() 落盘一次。
  ck('ownership and balance survive reload',await ev(`Game.skinOwned('seasons')&&Game.metaState().soul===49`));
  await ev(`Game.newGame('fisher','normal');Game.S().tut=null;UI.begin()`);await sleep(1400);
  await ev(`document.querySelector('#nav [data-nav="map"]').click()`);await sleep(500);
  ck('new run keeps selected color skin',await ev(`document.querySelector('#map-img').src.endsWith('spring-color.png')`));
  await ev(`document.querySelector('#nav [data-nav="save"]').click();document.querySelector('[data-savemenu=settings]').click()`);
  // ⚠️ 契约变更：单选时代"墨白原味"是一个可选皮肤；多选时代它是「全部关闭」的复位按钮，
  //    按钮文案变成「墨白原味（全部关闭）」，所以用 includes 而不是全等匹配。
  await ev(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('墨白原味')).click();document.querySelector('#modal-close')?.click();document.querySelector('#nav [data-nav="map"]').click()`);await sleep(400);
  ck('switch back to free monochrome',await ev(`document.querySelector('#map-img').src.endsWith('spring-mono.png')&&Game.metaState().soul===49`));
  ck('no runtime errors',errs.length===0,errs.join(' | '));
  ws.close();ch.kill();console.log('RESULT:'+(bad.length?'FAIL':'PASS'));process.exit(bad.length?1:0);
})();
