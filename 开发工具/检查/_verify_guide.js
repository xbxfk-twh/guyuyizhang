/* Inventory contrast, reordered skill rows and travel opacity on two viewports. */
const { spawn } = require('child_process'),
  fs = require('fs'),
  path = require('path'),
  http = require('http'),
  os = require('os'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'),
  out = path.join(root, '回归测试/_out'),
  profile = fs.mkdtempSync(path.join(os.tmpdir(), 'guyu-mobile-')),
  port = 9661;
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
    const waitRoomLayout = async () => {
      let last = '',
        stable = 0;
      for (let i = 0; i < 40; i++) {
        const state = await ev(
          `(()=>{const imgs=[...document.querySelectorAll('.room-stage img')],sprites=[...document.querySelectorAll('.room-sprite')];if(!imgs.length||sprites.length<=10||imgs.some(e=>!e.complete||!e.naturalWidth))return '';return JSON.stringify(sprites.map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));})()`
        );
        stable = state && state === last ? stable + 1 : 0;
        last = state;
        if (stable >= 2) return;
        await sleep(100);
      }
      throw Error('房间图片或布局未稳定');
    };
    const check = async (name, expr) => {
      const ok = await ev(expr);
      if (!ok) {
        await shot('mobile-ui-failure.png');
        console.error(
          await ev(
            `JSON.stringify([...document.querySelectorAll('[data-separate], .room-sprite')].map(e=>({name:e.getAttribute('aria-label')||e.title,rect:e.getBoundingClientRect().toJSON(),hit:document.elementFromPoint(e.getBoundingClientRect().x+e.offsetWidth/2,e.getBoundingClientRect().y+e.offsetHeight/2)?.outerHTML.slice(0,180)})))`
          )
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
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: "localStorage.setItem('guyuyizhang_logw','tiny');"
    });

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
      await ev(
        `Locale.set('zh');Game.newGame('fisher','normal');Game.S().tut=null;Game.S().furniture.medPot=true;Game.S().furniture.mortar=true;UI.begin()`
      );
      await sleep(4500);
      await ev('UI.handleBack()');
      await ev(
        `document.querySelector('[data-nav="save"]').click();document.querySelector('[data-savemenu="guide"]').click()`
      );
      await check(
        '攻略打开并暂停时间 ' + w,
        `Game.timeFrozen()&&document.querySelectorAll('[data-guide-page] option').length===9`
      );
      await ev(
        `var select=document.querySelector('[data-guide-page]');select.value='0';select.dispatchEvent(new Event('change',{bubbles:true}))`
      );
      await check(
        '第一页不能向前翻 ' + w,
        `document.querySelector('[data-guide-step="-1"]').disabled`
      );
      for (let i = 0; i < 9; i++) {
        await ev(
          `var select=document.querySelector('[data-guide-page]');select.value='${i}';select.dispatchEvent(new Event('change',{bubbles:true}))`
        );
        await check(
          '第' + (i + 1) + '页标题正文一致无旧版本或特殊模式 ' + w,
          `document.querySelector('.guide-page h3').textContent===GUIDE[${i}].title&&document.querySelectorAll('.guide-page p').length===GUIDE[${i}].steps.length&&!/旧版|版本|噩梦|梦魇|传奇/.test(document.querySelector('.guide-page').textContent)`
        );
        if ([1, 3, 4, 8].includes(i)) {
          await sleep(350);
          await shot('guide-page-' + i + '-' + w + '.png');
        }
      }
      await check(
        '最后一页不能向后翻 ' + w,
        `document.querySelector('[data-guide-step="1"]').disabled`
      );
      await ev(`document.querySelector('[data-guide-step="-1"]').click()`);
      await check(
        '上一页操作生效 ' + w,
        `document.querySelector('[data-guide-page]').value==='7'`
      );
      await ev(
        `window.guideText=document.querySelector('.guide-page').textContent;UI.handleBack();document.querySelector('[data-nav="save"]').click();document.querySelector('[data-savemenu="mail"]').click();document.querySelector('[data-mailtab="guide"]').click()`
      );
      await check(
        '邮箱和菜单共用攻略当前页 ' + w,
        `document.querySelector('.guide-page').textContent===guideText&&document.querySelector('[data-guide-page]').value==='7'`
      );
      await ev(
        `var select=document.querySelector('[data-guide-page]');select.value='1';select.dispatchEvent(new Event('change',{bubbles:true}));Locale.set('en')`
      );
      await sleep(200);
      await check(
        '英文分页和操作说明已翻译 ' + w,
        `document.querySelector('.guide-page').textContent.includes('Inventory and Storage')&&!/[\u3400-\u9fff]/.test(document.querySelector('.guide-page').textContent)`
      );
      await ev(
        `Locale.set('zh');UI.handleBack();document.querySelector('[data-nav="craft"]').click();document.querySelector('[data-station="med"]').click()`
      );
      await check(
        '制药说明不再误写服用上限 ' + w,
        `document.querySelector('#modal').textContent.includes('服用不限次数')&&!/最多服用/.test(document.querySelector('#modal').textContent)`
      );
      await shot('guide-pill-copy-' + w + '.png');
    }
    assert.deepEqual(errors, []);
    passed++;
    console.log('OK 无脚本异常');
  } catch (e) {
    fail++;
    console.error(e.stack);
    console.error(JSON.stringify(errors));
    if (ws) {
      try {
        ws.send(
          JSON.stringify({
            id: 9999,
            method: 'Page.captureScreenshot',
            params: { format: 'png' }
          })
        );
      } catch {}
    }
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
