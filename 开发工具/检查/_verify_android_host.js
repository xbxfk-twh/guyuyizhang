/* 独立浏览器验证Android宿主暂停、保存与返回键。 */
const { spawn } = require('child_process'),
  fs = require('fs'),
  path = require('path'),
  http = require('http'),
  os = require('os'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'),
  out = path.join(root, '回归测试/_out'),
  profile = fs.mkdtempSync(path.join(os.tmpdir(), 'guyu-mobile-')),
  port = 9612;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const json = (url) =>
  new Promise((res, rej) =>
    http
      .get(url, (r) => {
        let s = '';
        r.on('data', (x) => (s += x));
        r.on('end', () => {
          try {
            res(JSON.parse(s));
          } catch (e) {
            rej(e);
          }
        });
      })
      .on('error', rej)
  );
let passed = 0,
  fail = 0,
  ws,
  ch;
const errors = [];
(async () => {
  try {
    ch = spawn(
      process.env.CHROME_PATH ||
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
      [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--allow-file-access-from-files',
        '--remote-debugging-port=' + port,
        '--user-data-dir=' + profile,
        'about:blank'
      ],
      { stdio: 'ignore', windowsHide: true }
    );
    let tab;
    for (let i = 0; i < 80 && !tab; i++) {
      await sleep(200);
      try {
        tab = (await json('http://127.0.0.1:' + port + '/json/list')).find(
          (t) => t.type === 'page'
        );
      } catch {}
    }
    assert.ok(tab);
    ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((r, j) => {
      ws.onopen = r;
      ws.onerror = j;
    });
    let seq = 0;
    const pending = new Map();
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) {
        pending.get(m.id)(m);
        pending.delete(m.id);
      }
      if (m.method === 'Runtime.exceptionThrown')
        errors.push(
          m.params.exceptionDetails.exception?.description ||
            m.params.exceptionDetails.text
        );
    };
    const send = (method, params = {}) =>
      new Promise((r, j) => {
        const id = ++seq;
        pending.set(id, (m) =>
          m.error ? j(Error(JSON.stringify(m.error))) : r(m.result)
        );
        ws.send(JSON.stringify({ id, method, params }));
      });
    const ev = async (expression) => {
      const r = await send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true
      });
      if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
      return r.result?.value;
    };
    const check = async (name, expr) => {
      const ok = await ev(expr);
      if (!ok) {
        await shot('mobile-ui-failure.png');
        console.error(
          await ev('document.querySelector("#modal")?.textContent')
        );
      }
      assert.ok(ok, name);
      passed++;
      console.log('OK ' + name);
    };
    const shot = async (name) => {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(out, name), Buffer.from(r.data, 'base64'));
    };
    await send('Runtime.enable');
    await send('Page.enable');

    for (const [w, h] of [
      [667, 375],
      [1366, 768]
    ]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: w,
        height: h,
        deviceScaleFactor: 1,
        mobile: w < 1000
      });
      await send('Page.navigate', {
        url: require('url').pathToFileURL(
          path.join(root, '孤屿遗章-游戏 - 发布/index.html')
        ).href
      });
      await sleep(2500);
      await ev("Game.newGame('fisher','normal');Game.S().tut=null;UI.begin()");
      await sleep(4500);
      await ev(
        "document.querySelector('[data-nav=inv]').click();UI.setHostSuspended(true)"
      );
      await check(
        '宿主暂停不解除面板暂停且保存成功 ' + w,
        "Game.hostSuspended()&&Game.timeFrozen()&&localStorage.getItem('guyuyizhang_save')!==null"
      );
      await ev('UI.setHostSuspended(false)');
      await check(
        '恢复后面板依然暂停 ' + w,
        '!Game.hostSuspended()&&Game.timeFrozen()'
      );
      await ev('UI.handleBack()');
      await check(
        '返回键关闭普通面板 ' + w,
        "!document.querySelector('#modal.open')&&!Game.timeFrozen()"
      );
      await ev(
        'window.testTick=Game.S().tick;UI.setHostSuspended(true);Game.addMin(5)'
      );
      await check('后台不推进游戏时间 ' + w, 'Game.S().tick===window.testTick');
      await ev('UI.setHostSuspended(false);Game.addMin(1)');
      await check(
        '前台只推进明确的一分钟 ' + w,
        'Game.S().tick===window.testTick+1'
      );
      await check('场景返回交原生退出确认 ' + w, 'UI.handleBack()===false');
      await shot('android-host-' + w + '.png');
    }
    assert.deepEqual(errors, []);
    passed++;
    console.log('OK 无脚本异常');
  } catch (e) {
    fail++;
    console.error(e.stack);
  } finally {
    ws?.close();
    ch?.kill();
    console.log(
      '通过 ' +
        passed +
        ' 项，失败 ' +
        fail +
        ' 项\nRESULT:' +
        (fail ? 'FAIL' : 'PASS')
    );
    process.exitCode = fail ? 1 : 0;
  }
})();
