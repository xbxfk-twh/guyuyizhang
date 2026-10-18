// 装备图集真实浏览器专项：独立配置目录，不访问玩家存档。
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = process.env.GUYU_GAME_ROOT || 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_out', 'equipment-art');
const PORT = 9499;
const PROFILE = path.join(os.tmpdir(), 'guyu_badge_' + process.pid);
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
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) }; return r.result && r.result.value; };

  await send('Page.navigate',{url:'file:///'+encodeURI(ROOT.replace(/\\/g,'/')+'/index.html')});await sleep(2200);
  const ids=['spear','ironSword','steelSword','blackSword','ironDagger','steelDagger','blackDagger','ironGreatSword','bow','grassArmor','leatherArmor','ironArmor','blackArmor','woodShield','ironShield','steelShield'];
  await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().capacity=999;${JSON.stringify(ids)}.forEach(id=>Game.addItem(id,1,true));UI.begin()`);await sleep(1600);
  await ev(`document.querySelector('#nav [data-nav="inv"]').click()`);await sleep(400);
  const info=await ev(`Array.from(document.querySelectorAll('[data-equipment]')).map(e=>({id:e.dataset.equipment,bg:getComputedStyle(e).backgroundImage,pos:getComputedStyle(e).backgroundPosition,w:e.getBoundingClientRect().width,filter:getComputedStyle(e).filter}))`);
  ck('all 16 icons in inventory',ids.every(id=>info.some(x=>x.id===id)));
  ck('16 distinct atlas cells',new Set(info.map(x=>x.pos)).size===16);
  ck('monochrome visible',info.every(x=>x.w>=32&&x.bg.includes('engraved-mono.png')&&x.filter.includes('grayscale')));
  ck('atlas images load',await ev(`Promise.all(['mono','color'].map(m=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i.naturalWidth===1254&&i.naturalHeight===1254);i.onerror=()=>resolve(false);i.src='assets/img/equipment/engraved-'+m+'.png'}))).then(a=>a.every(Boolean))`));
  ck('insufficient funds protected',await ev(`(()=>{Game.metaState().soul=49;return !Game.unlockSkin('armory').ok&&Game.metaState().soul===49})()`));
  await ev(`Game.metaState().soul=100;document.querySelector('#nav [data-nav="save"]').click();document.querySelector('[data-savemenu=settings]').click()`);
  ck('price shown as 50',await ev(`document.querySelector('[data-askin=armory]').textContent.includes('50')`));
  await ev(`document.querySelector('[data-askin=armory]').click()`);
  // 2026-09-23 契约变更：皮肤改多选后本机存的是 JSON 数组（以前是裸字符串 id）
ck('purchase and activation',await ev(`Game.skinOwned('armory')&&Game.metaState().soul===50&&(JSON.parse(localStorage.getItem('guyuyizhang_skin')||'[]')||[]).includes('armory')`));
  ck('repeat purchase free',await ev(`Game.unlockSkin('armory').cost===0&&Game.metaState().soul===50`));
  await ev(`document.querySelector('#modal-close')?.click();document.querySelector('#nav [data-nav="inv"]').click()`);await sleep(400);
  ck('all inventory icons colored',await ev(`Array.from(document.querySelectorAll('[data-equipment]')).every(e=>getComputedStyle(e).backgroundImage.includes('engraved-color.png')&&getComputedStyle(e).filter==='none')`));
  for(const size of [{w:1280,h:720},{w:844,h:390}]){
    await send('Emulation.setDeviceMetricsOverride',{width:size.w,height:size.h,deviceScaleFactor:1,mobile:false});await sleep(500);
    const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(OUT,'inventory-'+size.w+'.png'),Buffer.from(shot.data,'base64'));
  }
  await ev(`document.querySelector('#nav [data-nav="equip"]').click();document.querySelector('[data-eqpick="weapon"]').click()`);await sleep(300);
  ck('equipment panel uses new icons',await ev(`document.querySelectorAll('[data-equipment]').length>0&&!!document.querySelector('.equipment-colored')`));
  await send('Page.reload');await sleep(2200);
  ck('ownership persists',await ev(`Game.skinOwned('armory')&&Game.metaState().soul===50&&(JSON.parse(localStorage.getItem('guyuyizhang_skin')||'[]')||[]).includes('armory')`));
  ck('no runtime errors',errs.length===0,errs.join(' | '));ws.close();ch.kill();
  console.log('RESULT:'+(bad.length?'FAIL':'PASS'));process.exit(bad.length?1:0);
})();
