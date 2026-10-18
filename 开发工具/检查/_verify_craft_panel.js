/* 制造栏可做性 + 鸡舍羊圈名字 复核（作者 2026-09-24 反馈）

   ① 未建造的工坊不在左侧分类里显示（也没有 🔒 死按钮）
   ② 「加工台」改名「其他家具」
   ③ 需要图纸的配方：没图纸不显示，拿到图纸才显示
   ④ 晾肉干与晾肉架挨在一起
   ⑤ 建好的鸡舍/羊圈有独立名字（不是只剩一个 ✔ 和按钮） */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = process.env.GUYU_GAME_ROOT || 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_out', 'craftpanel');
const PORT = 9509;
const PROFILE = path.join(os.tmpdir(), 'guyu_cp_' + process.pid);
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

  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2600);

  await ev(`(async () => {
    const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(1600);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
    const S = Game.S(); S.tut = null; S.stats.stamina = 9999;
    ['wood','stone','plank','thatch','meat','salt'].forEach(k => Game.addItem(k, 60, true));
    return 1;
  })()`);

  const sideTabs = async () => ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    if (!document.querySelector('#modal [data-station]')) { document.querySelector('#modal .modal-x')?.click(); await w(250); document.querySelector('#nav [data-nav="craft"]').click(); await w(700); }
    return [...document.querySelectorAll('#modal [data-station]')].map(b => b.textContent.trim());
  })()`);

  // ---- ① 什么都没建：左侧只该有「手工 / 篝火·烹饪」 ----
  const t0 = await sideTabs();
  console.log('\n① 新局（没建工坊）左侧分类：' + JSON.stringify(t0));
  ck('① 没建工坊时，工具台/熔炉/烟熏炉/裁缝台/其他家具/磨刀石都不显示',
     ['工具台', '熔炉', '烟熏炉', '裁缝台', '其他家具', '磨刀石'].every(n => !t0.includes(n)), t0.join(' / '));
  ck('① 手工与篝火·烹饪始终显示', t0.includes('手工') && t0.includes('篝火·烹饪'), t0.join(' / '));
  ck('① 左侧不再出现 🔒 死按钮', !t0.some(x => /🔒/.test(x)), t0.join(' / '));
  ck('① 分类名是「其他家具」而不是「加工台」', !t0.includes('加工台'));

  // ---- 建工坊后再看 ----
  const t1 = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const S = Game.S();
    ['wb1','fr1','sm1','stove','rack','mortar','grindstone'].forEach(id => { S.furniture[id] = true; });
    Game.change(); await w(400);
    document.querySelector('#modal .modal-x')?.click(); await w(250);
    document.querySelector('#nav [data-nav="craft"]').click(); await w(800);
    return [...document.querySelectorAll('#modal [data-station]')].map(b => b.textContent.trim());
  })()`);
  console.log('② 建好工坊后左侧分类：' + JSON.stringify(t1));
  ck('② 建好的工坊才出现在分类里，烟熏归入烹饪',
     ['工具台', '熔炉', '晾晒·制革', '磨刀石'].every(n => t1.includes(n)) && !t1.includes('烟熏炉'), t1.join(' / '));
  ck('② 仍然没有「加工台」这个名字', !t1.includes('加工台'));

  // ---- ③ 图纸门槛：没食谱不显示，给了就显示 ----
  const bpBefore = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = [...document.querySelectorAll('#modal [data-station="fire"]')][0]; if (t) t.click(); await w(700);
    const names = [...document.querySelectorAll('#modal .recipe .recipe-name')].map(x => x.textContent.trim());
    return names;
  })()`);
  console.log('③ 没有食谱时「篝火·烹饪」里的配方：' + JSON.stringify(bpBefore).slice(0, 260));
  ck('③ 没有食谱 → 蛋糕 / 萝卜炖肉 / 超级大蛋 都不显示',
     !bpBefore.some(n => /蛋糕/.test(n)) && !bpBefore.some(n => /萝卜炖肉/.test(n)) && !bpBefore.some(n => /超级大蛋/.test(n)),
     bpBefore.join(' / ').slice(0, 160));

  const bpAfter = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    Game.addItem('bpCake', 1, true); Game.addItem('bpStew', 1, true); Game.addItem('bpOmelette', 1, true);
    Game.change(); await w(300);
    document.querySelector('#modal .modal-x')?.click(); await w(250);
    document.querySelector('#nav [data-nav="craft"]').click(); await w(700);
    const t = [...document.querySelectorAll('#modal [data-station="fire"]')][0]; if (t) t.click(); await w(700);
    return [...document.querySelectorAll('#modal .recipe .recipe-name')].map(x => x.textContent.trim());
  })()`);
  console.log('③ 拿到食谱后：' + JSON.stringify(bpAfter).slice(0, 260));
  ck('③ 拿到食谱 → 三道菜都出现了',
     bpAfter.some(n => /蛋糕/.test(n)) && bpAfter.some(n => /萝卜炖肉/.test(n)) && bpAfter.some(n => /超级大蛋/.test(n)),
     bpAfter.join(' / ').slice(0, 160));

  const groups = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const names = [...document.querySelectorAll('#modal [data-craftgroup]')].map(b => b.textContent.trim());
    const food = [...document.querySelectorAll('#modal [data-craftgroup]')].find(b => b.textContent.trim() === '饮食');
    food?.click(); await w(350);
    const filtered = [...document.querySelectorAll('#modal .recipe .recipe-name')].map(x => x.textContent.trim());
    return { names, filtered };
  })()`);
  ck('③ 第二列显示实际配方分类，点击「饮食」会筛掉面粉等原料',
    groups.names.includes('全部') && groups.names.includes('原料') && groups.names.includes('饮食') && groups.names.includes('烟熏') &&
    groups.filtered.some(n => /蛋糕/.test(n)) && !groups.filtered.some(n => /面粉/.test(n)), JSON.stringify(groups).slice(0, 260));

  // ---- ④ 晾肉干与晾肉架相邻 ----
  const rack = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('#modal [data-station="furniture"]')?.click(); await w(350);
    const list = document.querySelector('#modal .recipe-list');
    if (!list) return { __err: '没有配方列表' };
    const kids = [...list.children];
    const iMeat = kids.findIndex(k => k.classList.contains('recipe') && /晾肉干/.test(k.textContent));
    const iRack = kids.findIndex(k => k.classList.contains('recipe-row') && /晾肉架|晾晒中|晾透了/.test(k.textContent));
    return { 晾肉干行: iMeat, 晾肉架行: iRack, 总行数: kids.length,
             相邻: iMeat >= 0 && iRack === iMeat + 1,
             那两行: [iMeat, iRack].map(i => i >= 0 ? kids[i].textContent.trim().slice(0, 26) : null) };
  })()`);
  console.log('④ 晾肉干/晾肉架：' + JSON.stringify(rack));
  ck('④ 晾肉架状态行紧跟「晾肉干」（作者：放到一起）', rack.相邻 === true, JSON.stringify(rack.那两行));

  await send('Emulation.setDeviceMetricsOverride', { width: 926, height: 428, deviceScaleFactor: 1, mobile: true });
  const mobile = await ev(`(() => {
    const root = document.querySelector('#modal .work-body');
    const side = root?.querySelector('.work-side');
    const groups = root?.querySelector('.work-groups');
    const content = root?.querySelector('.work-content');
    const recipe = root?.querySelector('.recipe');
    return { outer:root?.getBoundingClientRect().width, side:side?.getBoundingClientRect().width,
      groups:groups?.getBoundingClientRect().width, content:content?.getBoundingClientRect().width,
      recipe:recipe?.getBoundingClientRect().width, overflow:content?.scrollWidth > content?.clientWidth + 2 };
  })()`);
  ck('④ 横屏手机第二列与配方仍有可用宽度且无横向溢出',
    mobile.groups >= 55 && mobile.content >= 400 && !mobile.overflow, JSON.stringify(mobile));
  await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'craft-mobile.png'), Buffer.from(x.data, 'base64')));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const portrait = await ev(`(() => {
    const root=document.querySelector('#modal .work-body');const c=root?.querySelector('.work-content');
    const r=root?.querySelector('.recipe');
    return {body:root?.clientWidth,content:c?.clientWidth,recipe:r?.clientWidth,
      horizontalOverflow:c?.scrollWidth > c?.clientWidth + 2};
  })()`);
  ck('④ 竖屏手机分类列不会引起配方横向溢出',portrait.content >= 160 && !portrait.horizontalOverflow,JSON.stringify(portrait));
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

  const trainerOnly = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const S = Game.S();S.scene='camp';S.identity='hunter';Game.change();await w(200);
    document.querySelector('#modal .modal-x')?.click();await w(200);
    [...document.querySelectorAll('.hotspot')].find(x => /营地建造|营地升级/.test(x.textContent))?.click();await w(350);
    const hunter=document.querySelector('#modal')?.textContent || '';
    S.identity='trainer';Game.change();await w(250);
    document.querySelector('#modal .modal-x')?.click();await w(200);
    [...document.querySelectorAll('.hotspot')].find(x => /营地建造|营地升级/.test(x.textContent))?.click();await w(350);
    const trainer=document.querySelector('#modal')?.textContent || '';
    return {hunter:!/跑步机|哑铃架/.test(hunter),trainer:/跑步机/.test(trainer)&&/哑铃架/.test(trainer)};
  })()`);
  ck('④ 健身器材仅在健身教练的建造页显示', trainerOnly.hunter && trainerOnly.trainer, JSON.stringify(trainerOnly));

  // ---- ⑤ 鸡舍/羊圈名字 ----
  // ⚠️ 契约变更（作者 2026-09-25："把鸡圈羊圈放到农田…从而腾出家具位"）：
  //    这两件已经不在营地的家具列表里了，卡片搬到**农田 →「农场管理」**面板里。
  //    所以这里改成两条：① 营地面板里不该再出现它们；② 农田面板里名字 + 「管理」按钮都还在。
  const coop = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const S = Game.S(); S.furniture.coop = true; S.furniture.pen = true;
    S.scene = 'camp'; Game.change(); await w(400);
    document.querySelector('#modal .modal-x')?.click(); await w(250);
    const h = [...document.querySelectorAll('.hotspot')].find(x => /营地建造|营地升级/.test(x.textContent));
    if (!h) return { __err: '找不到营地热点' };
    h.click(); await w(800);
    const 营地卡片 = [...document.querySelectorAll('#modal .furn.built')].map(c => (c.querySelector('.furn-name') || {}).textContent || '');
    // 换到农田，走真实入口：农场管理热点
    document.querySelector('#modal .modal-x')?.click(); await w(250);
    S.scene = 'farm'; UI.render(); await w(400);
    for (let i = 0; i < 3 && !document.querySelector('.hotspot'); i++) { const bb = document.querySelector('#btn-backmap'); if (bb) { bb.click(); await w(500); } }
    S.scene = 'farm'; UI.render(); await w(300);
    const rh = [...document.querySelectorAll('.hotspot')].find(x => /农场管理/.test(x.textContent));
    if (!rh) return { __err: '农田没有农场管理热点', 营地卡片 };
    rh.click(); await w(700);
    const cards = [...document.querySelectorAll('#modal .furn.built')].map(c => ({
      名字: (c.querySelector('.furn-name') || {}).textContent || null,
      有管理按钮: !!c.querySelector('[data-live]'),
      整卡文本: c.textContent.trim().slice(0, 30),
    }));
    return { 已建卡片: cards, 营地卡片 };
  })()`);
  console.log('⑤ 鸡舍/羊圈卡片：' + JSON.stringify(coop).slice(0, 500));
  if (coop.__err) { ck('⑤ 农田「农场管理」里能看到鸡舍/羊圈卡片', false, JSON.stringify(coop)); }
  else {
    ck('⑤ 营地的家具列表里已经不再出现鸡舍/羊圈（搬到农田了）',
       !(coop.营地卡片 || []).some(t => /鸡舍|羊圈/.test(t || '')), (coop.营地卡片 || []).join(' / '));
    const coopCard = (coop.已建卡片 || []).find(c => /鸡舍/.test(c.名字 || ''));
    const penCard = (coop.已建卡片 || []).find(c => /羊圈/.test(c.名字 || ''));
    ck('⑤ 鸡舍卡片有独立名字（在农田面板里）', !!coopCard && /鸡舍/.test(coopCard.名字), coopCard ? coopCard.名字 : '没找到');
    ck('⑤ 羊圈卡片有独立名字（在农田面板里）', !!penCard && /羊圈/.test(penCard.名字), penCard ? penCard.名字 : '没找到');
    ck('⑤ 名字旁边有「管理」按钮（功能没丢）', !!coopCard && coopCard.有管理按钮 === true);
  }

  await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'craft-panel.png'), Buffer.from(x.data, 'base64')));
  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');
  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('\n通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
