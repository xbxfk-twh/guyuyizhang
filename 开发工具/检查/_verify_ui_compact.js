/* UI 紧凑化 + 装备图标 复核（作者 2026-09-24）

   ① 装备槽（主手/副手/护甲/衣物/饰品）能看见装备图标
   ② 神物栏能看见神物图标
   ③ 制造卡：产出并到名称右侧（不再单独占一行），卡片变矮
   ④ 食之包压成一行紧凑行
   ⑤ 手机端弹窗宽度确实收窄了（视口 - 48px） */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = process.env.GUYU_GAME_ROOT || 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_out', 'uicompact');
const PORT = 9511;
const PROFILE = path.join(os.tmpdir(), 'guyu_uc_' + process.pid);
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
  const url = 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html');

  // ---------------- 桌面：图标与紧凑化 ----------------
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  await sleep(2600);
  await ev(`(async () => {
    const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(1600);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
    const S = Game.S(); S.tut = null; S.capacity = 999; S.stats.stamina = 9999;
    ['wood','stone','plank','ironingot','steelingot','blackingot','mithrilingot'].forEach(k => Game.addItem(k, 40, true));
    Game.addItem('spear', 1, true); Game.addItem('ironArmor', 1, true);
    // 神物：给一件并装备（食之包那条也顺便测到）
    S.relics = ['satchel', 'vampire']; S.relicSlots = 3; S.relicEquip = ['satchel', 'vampire', null];
    Game.equip('spear'); Game.equip('ironArmor');
    Game.change(); await w(500);
    return 1;
  })()`);

  // ① 装备槽图标
  const eq = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('#nav [data-nav="equip"]').click(); await w(700);
    const rows = [...document.querySelectorAll('#modal .loadout-row')].map(r => {
      const ic = r.querySelector('.equip-val .item-icon');
      const q = ic ? ic.getBoundingClientRect() : null;
      return { 槽: (r.querySelector('b') || {}).textContent, 有图标: !!ic, 尺寸: q ? Math.round(q.width) + 'x' + Math.round(q.height) : null,
               图标类型: ic ? (ic.classList.contains('equipment-icon') ? 'atlas' : (ic.tagName === 'IMG' ? 'img' : '?')) : null,
               文字: (r.querySelector('.equip-txt') || {}).textContent || '' };
    });
    return { 槽位: rows };
  })()`);
  console.log('\n① 装备槽：' + JSON.stringify(eq).slice(0, 460));
  const main = (eq.槽位 || []).find(r => r.槽 === '主手');
  const armor = (eq.槽位 || []).find(r => r.槽 === '护甲');
  const emptyOne = (eq.槽位 || []).find(r => r.槽 === '饰品');
  ck('① 主手槽显示了装备图标', !!main && main.有图标 === true && main.尺寸 === '26x26', main ? JSON.stringify(main) : '没找到');
  ck('① 护甲槽显示了装备图标', !!armor && armor.有图标 === true, armor ? JSON.stringify(armor) : '没找到');
  ck('① 未装备的槽位也不塌（占位方块还在）', !!emptyOne && emptyOne.有图标 === true, emptyOne ? JSON.stringify(emptyOne) : '没找到');
  ck('① 图标用的是装备图集（匠心彩绘那套），不是临时图', main && main.图标类型 === 'atlas', main ? main.图标类型 : '');

  // ② 神物栏图标 + 食之包紧凑行
  const relic = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    await w(700);
    const slots = [...document.querySelectorAll('#modal .loadout-relics>.loadout-slot')].map(s => {
      const ic = s.querySelector('.item-icon');
      const q = ic ? ic.getBoundingClientRect() : null;
      return { 类: s.className, 有图标: !!ic, 尺寸: q ? Math.round(q.width) + 'x' + Math.round(q.height) : null, 文本: s.textContent.trim().slice(0, 14) };
    });
    document.querySelector('[data-eqpick="relic"]')?.click();await w(300);const noInline=!document.querySelector('#modal .satchel-row');const b=document.querySelector('[data-equiprelic="satchel"]'),r=b.getBoundingClientRect();b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2}));await w(550);b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2}));await w(150);const sat = document.querySelector('#modal .satchel-row');
    return { 独立设置:noInline&&document.querySelector('.modal-title').textContent==='食之包', 神物槽: slots, 有食之包行: !!sat, 食之包行文本: sat ? sat.textContent.trim().slice(0, 60) : null,
             食之包行高: sat ? Math.round(sat.getBoundingClientRect().height) : null };
  })()`);
  console.log('② 神物栏/食之包：' + JSON.stringify(relic).slice(0, 460));
  const filled = (relic.神物槽 || []).filter(s => s.有图标);
  ck('② 已装备的神物显示了图标', filled.length >= 1 && filled.every(s => s.有图标 === true), JSON.stringify(filled.map(s => s.文本)));
  ck('② 长按食之包打开独立设置且吃喝仍为紧凑行', relic.独立设置&&relic.有食之包行 === true, relic.食之包行文本);
  ck('② 食之包行是单行（高度 < 70px）', relic.食之包行高 !== null && relic.食之包行高 < 70, '高 ' + relic.食之包行高 + 'px');

  // ③ 制造卡：产出在名称里，卡片变矮
  const rec = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    Game.S().furniture.stove = true; Game.change(); await w(300);
    document.querySelector('#modal .modal-x')?.click(); await w(250);
    document.querySelector('#nav [data-nav="craft"]').click(); await w(700);
    const t = [...document.querySelectorAll('#modal [data-station="furniture"]')][0]; if (t) t.click(); await w(700);
    const card = document.querySelector('#modal .recipe');
    const info = card ? card.querySelector('.recipe-info') : null;
    return {
      产出在名称里: !!(card && card.querySelector('.recipe-name .recipe-out')),
      还有独立产出行: !!(card && [...card.querySelectorAll('.recipe-mats')].some(x => /^产出：/.test(x.textContent))),
      名称行文本: card && card.querySelector('.recipe-name') ? card.querySelector('.recipe-name').textContent.trim() : null,
      名称行高: card && card.querySelector('.recipe-name') ? Math.round(card.querySelector('.recipe-name').getBoundingClientRect().height) : null,
      信息块子元素数: info ? info.children.length : null,
      信息块文本行: info ? info.textContent.trim().slice(0, 60) : null,
      卡片高: card ? Math.round(card.getBoundingClientRect().height) : null,
    };
  })()`);
  console.log('③ 制造卡：' + JSON.stringify(rec));
  ck('③ 产出并到了名称右侧（.recipe-name .recipe-out）', rec.产出在名称里 === true, rec.名称行文本);
  ck('③ 不再有独立的「产出：」那一行', rec.还有独立产出行 === false);
  // ⚠️ 别用绝对高度当判据：带"材料不足"提示行、或动作列两个按钮竖排的卡片本来就高。
  //    这里改成结构判据 —— 信息块只剩「名称（含产出）+ 材料」两行，就是"少了一行"的铁证。
  ck('③ 每张卡的信息块少了一行（只剩 名称+材料 两块）', rec.信息块子元素数 === 2, '子元素 ' + rec.信息块子元素数 + '：' + rec.信息块文本行);
  ck('③ 卡片高度没有失控（< 170px）', rec.卡片高 !== null && rec.卡片高 < 170, '卡高 ' + rec.卡片高 + 'px');
  await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'desktop.png'), Buffer.from(x.data, 'base64')));

  // ④ 手机端宽度收窄
  for (const s of [{ n: 'iPhone 竖屏', w: 390, h: 844 }, { n: '小屏横屏', w: 667, h: 375 }]) {
    await send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 1, mobile: true });
    await send('Page.navigate', { url });
    await sleep(2600);
    await ev(`(async () => {
      const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
      const w = ms => new Promise(r => setTimeout(r, ms));
      clk('#btn-new'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(1600);
      for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
      Game.S().tut = null; Game.change(); await w(300);
      return 1;
    })()`);
    const mw = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      document.querySelector('#nav [data-nav="inv"]').click(); await w(700);
      const mc = document.querySelector('#modal .modal-content.work-modal');
      return { 弹窗宽: Math.round(mc.getBoundingClientRect().width), 视口: innerWidth,
               左留白: Math.round(mc.getBoundingClientRect().left), 右留白: Math.round(innerWidth - mc.getBoundingClientRect().right) };
    })()`);
    console.log('④ ' + s.n + '：' + JSON.stringify(mw));
    const margin = s.h < s.w ? 28 : 48;
    ck('④ ' + s.n + ' 弹窗留白与横屏可用宽度符合布局',
       Math.abs((mw.视口 - mw.弹窗宽) - margin) <= 2 && mw.左留白 >= margin / 2 - 2 && mw.右留白 >= margin / 2 - 2,
       '视口 ' + mw.视口 + ' - 弹窗 ' + mw.弹窗宽 + ' = ' + (mw.视口 - mw.弹窗宽));
    await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'mobile-' + s.w + '.png'), Buffer.from(x.data, 'base64')));
  }

  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');
  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('\n通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
