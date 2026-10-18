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
  port = 9660;
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
        `Locale.set('zh');Game.newGame('fisher','normal');const s=Game.S();s.tut=null;s._testNoAmbush=true;s.capacity=999;s.inv.bamboo=9;s.inv.wood=65;s.skill.combat=4;s.skillPicks.combat=['def','def','def','def'];s.exp.combat=5000;UI.begin()`
      );
      await sleep(4500);
      await ev('UI.handleBack()');
      await ev(
        `[...document.querySelectorAll('#hotspots .hotspot')].find(b=>b.textContent.includes('仓库')).click()`
      );
      await sleep(500);
      const r = await ev(
        `document.querySelector('[data-item="bamboo"]').getBoundingClientRect().toJSON()`
      );
      await send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: r.x + r.width / 2,
        y: r.y + r.height / 2
      });
      await ev(`document.querySelector('[data-item="bamboo"]').focus()`);
      await check(
        '仓库选中物品名称数量与浅底保持对比 ' + w,
        `(()=>{const b=document.querySelector('[data-item="bamboo"]'),q=b.querySelector('.inv-qty'),n=b.querySelector('.inv-name'),a=getComputedStyle(q),bg=getComputedStyle(b).backgroundColor;return q.textContent==='9'&&a.opacity==='1'&&a.color!==bg&&getComputedStyle(n).color===a.color&&q.getBoundingClientRect().height>0;})()`
      );
      await shot('weapon-ui-warehouse-' + w + '.png');
      await ev(`document.querySelector('[data-item="bamboo"]').click()`);
      await sleep(500);
      await check(
        '存入后两边仍显示正确数量 ' + w,
        `document.querySelector('[data-item="bamboo"] .inv-qty').textContent==='8'&&document.querySelector('[data-warehouse-item="bamboo"] .inv-qty').textContent==='1'`
      );
      await ev(
        `Game.S().buildings.storage=3;Game.S().warehouse.items=Object.keys(ITEMS).filter(id=>ITEMS[id].cat==='mat'&&id!=='bamboo').slice(0,90).map(id=>({id,qty:1})).concat([{id:'bamboo',qty:1}],Array.from({length:40},()=>({id:'ironSword',qty:1,dur:70,maxDur:70})));Game.addItem('ironSword',85,true);UI.handleBack();[...document.querySelectorAll('#hotspots .hotspot')].find(b=>b.textContent.includes('仓库')).click()`
      );
      await sleep(400);
      await check(
        '首次打开仓库保留弹窗动画 ' + w,
        `getComputedStyle(document.querySelector('#modal .modal-content')).animationName==='modalin'`
      );
      await ev(
        `(()=>{const panes=[...document.querySelectorAll('.inventory-pane .work-scroll')];panes[0].scrollTop=10;panes[1].scrollTop=120;window.warehouseBefore=panes.map(p=>p.scrollTop);document.querySelector('[data-item="bamboo"]').click();window.warehouseFrames=[];const sample=()=>{const m=document.querySelector('#modal .modal-content');warehouseFrames.push({animation:getComputedStyle(m).animationName,opacity:getComputedStyle(m).opacity,scroll:[...document.querySelectorAll('.inventory-pane .work-scroll')].map(p=>p.scrollTop)});if(warehouseFrames.length<4)requestAnimationFrame(sample);};sample();})()`
      );
      await ev(
        `new Promise(resolve=>{const done=()=>warehouseFrames.length===4?resolve():requestAnimationFrame(done);done();})`
      );
      console.log(
        await ev(
          `JSON.stringify({before:warehouseBefore,frames:warehouseFrames,n:Game.warehouseState().inv.bamboo})`
        )
      );
      await check(
        '存入刷新不重播动画且两侧滚动首帧不跳 ' + w,
        `warehouseFrames.length===4&&warehouseBefore.every(n=>n>0)&&warehouseFrames.every(f=>f.animation==='none'&&f.opacity==='1'&&JSON.stringify(f.scroll)===JSON.stringify(warehouseBefore))`
      );
      await check(
        '连续存入数量守恒 ' + w,
        `Game.invCount('bamboo')===7&&Game.warehouseState().inv.bamboo===2`
      );
      await shot('weapon-ui-transfer-' + w + '.png');
      await ev(
        `UI.handleBack();document.querySelector('[data-nav="equip"]').click();document.querySelector('[data-equiptab="skill"]').click();document.querySelector('[data-skilltree="combat"]').click()`
      );
      await sleep(500);
      await check(
        '技能两排位置交换且刀刀暴击说明显示 ' + w,
        `(()=>{const row=lv=>[...document.querySelectorAll('.st-row')].find(r=>r.querySelector('.st-lvname').textContent.startsWith('Lv '+lv));return row(3).textContent.includes('盾墙')&&row(3).textContent.includes('刀刀暴击')&&row(4).textContent.includes('复仇')&&row(4).textContent.includes('处决')&&row(3).textContent.includes('会心一击率 +20 个百分点');})()`
      );
      await ev(
        `(()=>{const r=[...document.querySelectorAll('.st-row')].find(r=>r.querySelector('.st-lvname').textContent.startsWith('Lv 3'));r.scrollIntoView({block:'center'});})()`
      );
      await shot('weapon-ui-skill-' + w + '.png');
      await ev('UI.handleBack()');
      for (const id of ['river', 'forest', 'camp']) {
        await ev(`Game.travel('${id}')`);
        await sleep(120);
        await check(
          '移动到' + id + '保留原场景淡入 ' + w,
          `Game.S().scene==='${id}'&&getComputedStyle(document.querySelector('#scene-img')).animationName==='scenein'`
        );
        await sleep(500);
        await check(
          '移动场景图片正常解码 ' + id + ' ' + w,
          `document.querySelector('#scene-img').complete&&document.querySelector('#scene-img').naturalWidth>0`
        );
      }
      await shot('weapon-ui-scene-' + w + '.png');
      await ev(
        `Locale.set('en');document.querySelector('[data-nav="equip"]').click();document.querySelector('[data-equiptab="skill"]').click();document.querySelector('[data-skilltree="combat"]').click()`
      );
      await sleep(300);
      await check(
        '英文技能描述正确翻译 ' + w,
        `document.querySelector('#modal').textContent.includes('Critical hit chance +20 percentage points')&&!document.querySelector('#modal').textContent.includes('会心一击率 +20 个百分点')`
      );
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
