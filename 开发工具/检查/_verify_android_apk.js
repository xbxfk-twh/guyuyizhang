/* Requires an already booted, dedicated Android emulator. Never touches a real phone. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, '回归测试/_out');
const adbPath = path.join(
  os.homedir(),
  '.codex/android-sdk/platform-tools/adb.exe'
);
const serial = process.env.ANDROID_TEST_SERIAL || 'emulator-5554';
assert.match(serial, /^emulator-\d+$/, 'Only a dedicated emulator is allowed');
const app = 'top.guyuyizhang.game';
const port = 9223;
const apk = process.argv[2];
assert.ok(apk && fs.existsSync(apk), 'Pass the signed APK path');
const adb = (...args) =>
  execFileSync(adbPath, ['-s', serial, ...args], {
    windowsHide: true,
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024
  });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const json = (url) =>
  new Promise((resolve, reject) =>
    http
      .get(url, (response) => {
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject)
  );
let ws;
let sequence = 0;
const pending = new Map();
const errors = [];
let passed = 0;
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, (message) =>
      message.error
        ? reject(Error(JSON.stringify(message.error)))
        : resolve(message.result)
    );
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails)
    throw Error(JSON.stringify(result.exceptionDetails));
  return result.result?.value;
};
const check = async (name, expression) => {
  assert.ok(await evaluate(expression), name);
  passed++;
  console.log('OK ' + name);
};
const screenshot = (name) =>
  fs.writeFileSync(path.join(out, name), adb('exec-out', 'screencap', '-p'));

async function connect() {
  ws?.close();
  let tab;
  for (let i = 0; i < 60 && !tab; i++) {
    try {
      const sockets = adb('shell', 'cat', '/proc/net/unix').toString();
      const socket = sockets.match(/@(webview_devtools_remote_\d+)/)?.[1];
      if (socket) {
        adb('forward', 'tcp:' + port, 'localabstract:' + socket);
        tab = (await json('http://127.0.0.1:' + port + '/json/list')).find(
          (t) => t.type === 'page'
        );
      }
    } catch {}
    if (!tab) await sleep(500);
  }
  assert.ok(tab, 'WebView debugging page appears');
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
    if (message.method === 'Runtime.exceptionThrown')
      errors.push(message.params.exceptionDetails);
  };
  await send('Runtime.enable');
  for (let i = 0; i < 60; i++) {
    if (await evaluate("typeof Game!=='undefined' && typeof UI!=='undefined'"))
      return;
    await sleep(500);
  }
  throw Error('Game did not initialize');
}

(async () => {
  try {
    assert.equal(
      adb('shell', 'getprop', 'sys.boot_completed').toString().trim(),
      '1'
    );
    adb('install', '-r', path.resolve(apk));
    adb('shell', 'am', 'start', '-n', app + '/.MainActivity');
    await connect();
    await check(
      '本地HTTPS入口加载',
      "location.href==='https://appassets.androidplatform.net/assets/index.html'"
    );
    await evaluate(
      "Game.newGame('fisher','normal');Game.S().tut=null;UI.begin()"
    );
    await sleep(4500);
    await check(
      '游戏运行且图片已加载',
      "Game.S()?.scene==='camp' && document.querySelector('#scene-img')?.complete && document.querySelector('#scene-img')?.naturalWidth>0"
    );
    screenshot('android-apk-camp.png');
    await evaluate("document.querySelector('[data-nav=inv]').click()");
    await check(
      '背包可打开且暂停时间',
      "Game.timeFrozen()&&document.querySelector('#modal.open')"
    );
    await sleep(750); // Let the Android compositor paint the newly opened panel.
    screenshot('android-apk-inventory.png');
    adb('shell', 'input', 'keyevent', '4');
    await sleep(750);
    await check(
      '安卓返回键关闭背包',
      "!Game.timeFrozen()&&!document.querySelector('#modal.open')"
    );
    await evaluate(
      "Game.S().androidTestMarker='persist-check';Game.save();window.beforeBackground=Game.S().tick"
    );
    adb('shell', 'input', 'keyevent', '3');
    await sleep(1500);
    adb('shell', 'am', 'start', '-n', app + '/.MainActivity');
    await sleep(1000);
    await check(
      '后台暂停恢复不补算离开时间',
      '!Game.hostSuspended()&&Game.S().tick<=window.beforeBackground+1'
    );
    adb('shell', 'am', 'force-stop', app);
    adb('shell', 'am', 'start', '-n', app + '/.MainActivity');
    await connect();
    await check(
      '进程结束重启仍有本局存档',
      "Game.load()&&Game.S().androidTestMarker==='persist-check'"
    );
    adb('shell', 'am', 'force-stop', app);
    adb('install', '-r', path.resolve(apk));
    adb('shell', 'am', 'start', '-n', app + '/.MainActivity');
    await connect();
    await check(
      '同证书覆盖安装保留本局存档',
      "Game.load()&&Game.S().androidTestMarker==='persist-check'"
    );

    const releaseApk = process.argv[3];
    if (releaseApk) {
      assert.ok(fs.existsSync(releaseApk), 'Standalone release APK exists');
      const expectedWallet = await evaluate("(()=>{Game.metaState().soul=300;const before=Game.adCoinBalance(),r=Game.exchangeSoulForStars(4);Game.save();return {ok:r.ok,soul:Game.metaState().soul,coins:Game.adCoinBalance(),before};})()");
      assert.ok(expectedWallet.ok&&expectedWallet.soul===240&&expectedWallet.coins===expectedWallet.before+4,'Native exchange persists before update');
      console.log('EXPECTED '+JSON.stringify(expectedWallet));
      adb('shell', 'input', 'keyevent', '3');
      await sleep(1500); // WebView localStorage flush and the native onPause save callback.
      ws.close();
      adb('shell', 'am', 'force-stop', app);
      adb('install', '-r', path.resolve(releaseApk));
      adb('shell', 'am', 'start', '-n', app + '/.MainActivity');
      await sleep(4000);
      const pid = adb('shell', 'pidof', app).toString().trim();
      assert.ok(pid, 'Release app runs');
      const socket = adb('shell', 'cat', '/proc/net/unix').toString().match(new RegExp('@(webview_devtools_remote_' + pid + ')\\s'))?.[1];
      if (socket) {
        adb('forward', 'tcp:' + port, 'localabstract:' + socket);
        const targets = await json('http://127.0.0.1:' + port + '/json/list');
        const systemDebug = adb('shell', 'getprop', 'ro.debuggable').toString().trim() === '1';
        if (systemDebug) {
          // Chromium automatically enables DevTools on userdebug/eng system images.
          // See chromium/android_webview/docs/net-debugging.md. Still reject debug APP flags.
          const pkg = adb('shell','dumpsys','package',app).toString();
          assert.ok(!/pkgFlags=\[[^\]]*DEBUGGABLE/.test(pkg), 'Release APK has no DEBUGGABLE application flag');
          console.log('NOTE userdebug系统自动开放WebView调试；应用调试标记仍关闭');
        } else assert.ok(!targets.some(t => t.type === 'page'), 'Release exposes no debuggable WebView page');
      }
      passed++;console.log('OK 正式独立包启动且应用调试标记关闭');
      screenshot('android-standalone-title.png');
      adb('shell', 'input', 'keyevent', '3');
      await sleep(1000);
      adb('shell', 'am', 'force-stop', app);
      adb('shell', 'am', 'start', '-n', app + '/.MainActivity');
      await sleep(1500);
      // Inspect the storage written by the real release using the same signed diagnostic shell.
      adb('shell', 'am', 'force-stop', app);
      adb('install', '-r', path.resolve(apk));
      adb('shell', 'am', 'start', '-n', app + '/.MainActivity');
      await connect();
      await check('正式包后台、重启及同签名升级仍保留存档', "Game.load()&&Game.S().androidTestMarker==='persist-check'");
      console.log('ACTUAL '+JSON.stringify(await evaluate('({soul:Game.metaState().soul,coins:Game.adCoinBalance()})')));
      await check('正式包存储保留兑换钱包与魂点余额', `Game.metaState().soul===${expectedWallet.soul}&&Game.adCoinBalance()===${expectedWallet.coins}`);
      ws.close();
      adb('shell', 'am', 'force-stop', app);
      adb('install', '-r', path.resolve(releaseApk));
      adb('shell', 'am', 'start', '-n', app + '/.MainActivity');
    }
    assert.deepEqual(errors, []);
    passed++;
    console.log('OK 无WebView脚本异常');
    console.log('通过 ' + passed + ' 项，失败 0 项\nRESULT:PASS');
  } catch (e) {
    console.error(e.stack);
    try {
      screenshot('android-apk-failure.png');
    } catch {}
    console.log('通过 ' + passed + ' 项，失败 1 项\nRESULT:FAIL');
    process.exitCode = 1;
  } finally {
    ws?.close();
    try {
      adb('forward', '--remove', 'tcp:' + port);
    } catch {}
  }
})();
