/* 第四存档位的真实浏览器入口：独立 Chrome 配置，不接触玩家存档。 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');
const assert = require('assert');
const ROOT = process.env.GUYU_GAME_ROOT || path.resolve(__dirname, '../../孤屿遗章-游戏 - 发布');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9517, profile = path.join(os.tmpdir(), 'guyu_fourth_slot_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const json = u => new Promise((resolve, reject) => http.get(u, res => {
  let body = ''; res.on('data', x => body += x); res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
}).on('error', reject));
let passed = 0;
const check = (ok, label) => { assert.ok(ok, label); passed++; };
(async () => {
  const ch = spawn(CHROME, ['--headless=new','--disable-gpu','--no-first-run','--allow-file-access-from-files',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'], {stdio:'ignore',windowsHide:true});
  try {
    let tab;
    for (let i = 0; i < 60 && !tab; i++) { await sleep(250); try { tab = (await json(`http://127.0.0.1:${port}/json/list`)).find(x => x.type === 'page'); } catch (_) {} }
    assert.ok(tab, 'Chrome 未启动');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0; const pending = new Map();
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
    const send = (method, params={}) => new Promise((resolve, reject) => {
      const n = ++id; pending.set(n, m => m.error ? reject(Error(JSON.stringify(m.error))) : resolve(m.result));
      ws.send(JSON.stringify({id:n,method,params}));
    });
    const ev = async expression => {
      const r = await send('Runtime.evaluate', {expression,awaitPromise:true,returnByValue:true});
      if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
      return r.result?.value;
    };
    await send('Emulation.setDeviceMetricsOverride', {width:844,height:390,deviceScaleFactor:1,mobile:true});
    await send('Page.navigate', {url:'file:///' + encodeURI(ROOT.replace(/\\/g,'/') + '/index.html')});
    await sleep(2600);
    const result = await ev(`(async () => {
      const wait = ms => new Promise(r => setTimeout(r,ms));
      Game.metaState().soul = 120;
      document.querySelector('#btn-new')?.click(); await wait(400);
      const before = [...document.querySelectorAll('#select-screen [data-slot]')].map(x => x.textContent.trim());
      document.querySelector('#select-screen [data-slot="3"]')?.click(); await wait(250);
      const confirm = document.querySelector('#modal [data-buyslot-yes]');
      confirm?.click(); await wait(350);
      const after = [...document.querySelectorAll('#select-screen [data-slot]')].map(x => x.textContent.trim());
      return {before,after,hadConfirm:!!confirm,unlocked:Game.extraSlotUnlocked(),soul:Game.metaState().soul};
    })()`);
    check(result.before.length === 4 && /未解锁/.test(result.before[3]), '标题页显示锁住的第四槽');
    check(result.hadConfirm, '点击锁住的第四槽先展示 100 魂点确认');
    check(result.unlocked && result.soul === 20 && /空白/.test(result.after[3]), '购买后显示可用第四槽并准确扣费');
    ws.close();
    console.log(`通过 ${passed} 项，失败 0 项`); console.log('RESULT:PASS');
  } finally { ch.kill(); }
})().catch(e => { console.error(e); console.log('RESULT:FAIL'); process.exitCode = 1; });
