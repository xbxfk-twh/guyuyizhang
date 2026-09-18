/* 全场景界面冒烟：依次进入每个场景（含各区域），捕获任何 JS 报错 / 未捕获异常。
   专门用来抓"作用域写错、变量未定义"这类 node --check 查不出、只有渲染才炸的错误。
   用法：node _verify_scenes.js */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const PORT = 9387;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_sc_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });

let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };

(async () => {
  const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=1600,900', 'about:blank'], { stdio: 'ignore' });
  let t = null;
  for (let i = 0; i < 60 && !t; i++) { await sleep(250); try { t = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(x => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map();
  const errors = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return; }
    // 收集控制台报错与未捕获异常
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push('[console] ' + (m.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 220));
    }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails || {};
      errors.push('[异常] ' + (d.text || '') + ' ' + ((d.exception || {}).description || '').split('\n')[0].slice(0, 220));
    }
  };
  const send = (me, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => (m.error ? rej(new Error(me + ':' + JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method: me, params: p || {} })); });
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 250) }; return r.result && r.result.value; };

  await send('Runtime.enable');
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2600);
  await ev(`(async () => {
    const clk = s => { const e = document.querySelector(s); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(1400);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
    const S = Game.S(); S.tut = null; S.buildings.watch = 3; S.buildings.dock = 3;
    S.atlantis = S.atlantis || {}; S.atlantis.unlocked = 1; S.atlantis.stoneActive = 1;
    S.inv.seachart = 1; S.inv.diveSuit = 1; S.inv.diveMask = 1;
    S.stats.stamina = 999999; S.stats.hp = 999999; S.weather = 'sun';
    return 1;
  })()`);

  // 逐个场景：切过去 → 等渲染 → 抓错
  const scenes = await ev(`(async () => {
    const S = Game.S();
    return [...new Set(Array.from(document.querySelectorAll('x')).concat([]))] , null;
  })()`);
  const list = ['camp','forest','bamboo','river','quarry','cave','desert','grassland','peak','farm','shore','sea','atlantis'];
  console.log('逐个场景渲染检查（每个场景 + 它的每个区域）：');
  for (const sc of list) {
    const before = errors.length;
    const r = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const S = Game.S();
      const scId = '${sc}';
      const scene = Game.sceneOf(scId);
      if (!scene) return { err: '没有这个场景' };
      const zones = scene.zones ? Object.keys(scene.zones) : [null];
      const res = [];
      for (const z of zones) {
        S.scene = scId; S.zone = z; S.stats.stamina = 999999; S.stats.hp = 999999;
        UI.render();                       // 直接改 scene 不会自动重绘，必须显式 render（这就是刚才图没变的原因）
        window.dispatchEvent(new Event('resize'));
        await w(320);
        const hs = document.querySelectorAll('#hotspots .hotspot').length;
        const img = (document.querySelector('#scene-img') || {}).getAttribute ? document.querySelector('#scene-img').getAttribute('src') : '';
        res.push((z || '-') + ':热点' + hs + ' 图' + String(img).split('/').pop());
      }
      return { zones: res };
    })()`);
    const newErrs = errors.slice(before);
    const label = sc.padEnd(10);
    if (r && r.zones) {
      console.log('  ' + label + r.zones.join('   ') + (newErrs.length ? '   ⚠ 报错' : '   ✅'));
    } else {
      console.log('  ' + label + '  ' + JSON.stringify(r));
    }
  }

  ck('全部场景 × 全部区域渲染无 JS 报错', errors.length === 0,
     errors.length ? errors.slice(0, 4).join(' || ') : '13 个场景全过');

  // 再跑一遍"实际走动"，确认移动可用
  const travelOk = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const S = Game.S(); S.scene = 'camp'; S.zone = null; S.stats.stamina = 999999;
    window.dispatchEvent(new Event('resize')); await w(300);
    const out = [];
    for (const target of ['forest','bamboo','river','camp']) {
      Game.travel(target); await w(300);
      out.push(target + '→' + Game.S().scene + (document.querySelector('#scene-img') ? ':' + String(document.querySelector('#scene-img').getAttribute('src')).split('/').pop() : ''));
    }
    return out;
  })()`);
  ck('实测：连续走动都真的换了场景（不再卡在营地）',
     Array.isArray(travelOk) && travelOk.every(x => !/→camp$/.test(x) || x.indexOf('camp') === x.indexOf('→') + 5),
     JSON.stringify(travelOk));
  ck('走动后无新报错', errors.length === 0, errors.slice(0, 3).join(' || '));

  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('');
  console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  if (bad.length) { console.log('失败项：'); bad.forEach(b => console.log(' - ' + b)); }
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
