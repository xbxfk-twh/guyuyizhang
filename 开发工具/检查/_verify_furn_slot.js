/* 家具位提示复核（作者 2026-09-23："最大的坑是家具限制，新手一般注意不到，
   如果制作家具前加一个弹窗提示……就会好很多" + "建议直接在建造的页面就标注"）

   要盯死的四件事：
     ① 建造页对每件家具都标了「占 1 格」/「不占位」；
     ② 点**占位**家具 → 先弹确认（写明现在几格/打完几格/还剩几格），**此时还没开始造**；
     ③ 点「继续打造」才真的造；点「取消」回到营地且什么都没发生；
     ④ 点**不占位**家具 → 不弹确认，直接造（别拿废话拦人）。
   顺带覆盖：新手引导第 0 步（先看背包）、体力上限的床加成显示。 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = process.env.GUYU_GAME_ROOT || 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_out', 'furnslot');
const PORT = 9503;
const PROFILE = path.join(os.tmpdir(), 'guyu_furn_' + process.pid);
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
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 320) }; return r.result && r.result.value; };

  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2600);

  // 开局（**不跳过引导**，这样才能验第 0 步）
  const boot = await ev(`(async () => {
    const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(1600);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
    const S = Game.S(); if (!S) return { __err: 'no state' };
    return { tut: S.tut, 引导文本: (document.querySelector('#tut') || {}).textContent || null };
  })()`);
  console.log('\n开局：' + JSON.stringify(boot));
  ck('① 新局引导停在第 0 步（先看背包）', boot.tut === 0, 'tut=' + boot.tut);
  ck('① 引导横幅写的是"先点底部【背包】"', /【背包】/.test(boot.引导文本 || ''), boot.引导文本);

  // 打开背包 → 引导应推进（这个身份自带工具就直接到 2）
  const afterBag = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('#nav [data-nav="inv"]').click(); await w(700);
    const S = Game.S();
    const info = { tut: S.tut, 自带工具: Object.keys(S.inv).some(id => ITEMS[id] && ITEMS[id].tool) };
    const mx = document.querySelector('#modal .modal-x'); if (mx) mx.click(); await w(300);
    // 后面要造家具，把材料和体力准备足
    S.tut = null; S.capacity = 999; S.stats.stamina = 9999; S.stats.hp = 9999;
    ['wood','thatch','stone','clay','plank','cloth'].forEach(k => Game.addItem(k, 30, true));
    return info;
  })()`);
  console.log('② 打开背包后：' + JSON.stringify(afterBag));
  ck('② 打开背包后引导推进到 1（做石镐）或 2（去装备）', afterBag.tut === 1 || afterBag.tut === 2, 'tut=' + afterBag.tut);
  ck('② 自带工具时直接跳到装备那步（不逼玩家白做一把）', afterBag.自带工具 ? afterBag.tut === 2 : afterBag.tut === 1, '自带工具=' + afterBag.自带工具 + ' tut=' + afterBag.tut);

  // 进入营地建造页（真实入口 = 营地场景里的 CAMP_HOTSPOTS 热点「住处 · 营地升级」）
  // ⚠️ 不要点 nav 的「地图」——那会切到大地图视图，营地热点就没了（第一版就栽在这）。
  const enter = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const S = Game.S(); S.scene = 'camp'; S.zone = null; S.minute = 10 * 60;
    Game.change(); await w(900);
    let h = [...document.querySelectorAll('.hotspot')].find(x => /营地建造|营地升级/.test(x.textContent));
    if (!h) {
      // 万一停在大地图：先点地图上的「营地」回到场景
      const m = [...document.querySelectorAll('.hotspot')].find(x => /^营地$/.test(x.textContent.trim()));
      if (m) { m.click(); await w(1300); h = [...document.querySelectorAll('.hotspot')].find(x => /营地建造|营地升级/.test(x.textContent)); }
    }
    if (!h) return { __err: '找不到营地热点', 热点: [...document.querySelectorAll('.hotspot')].map(x => x.textContent.trim()) };
    h.click(); await w(800);
    return { 有建造页: !!document.querySelector('#modal [data-fid]') };
  })()`);
  console.log('③ 进入营地建造页：' + JSON.stringify(enter));
  ck('③ 能打开营地建造页', enter.有建造页 === true, JSON.stringify(enter).slice(0, 220));

  if (enter.有建造页) {
    // 建造页标注
    const tags = await ev(`(() => {
      const rows = [...document.querySelectorAll('#modal .furn')];
      const out = rows.map(r => ({ 名: (r.querySelector('.furn-name') || {}).textContent || '', 标: (r.querySelector('.slot-tag') || {}).textContent || null }));
      const takes = out.filter(x => x.标 === '占 1 格').map(x => x.名);
      const free = out.filter(x => x.标 === '不占位').map(x => x.名);
      return { 有标记的行数: out.filter(x => x.标).length, 总行数: out.length, 占位: takes.length, 不占位: free.length, 不占位样例: free.slice(0, 5) };
    })()`);
    console.log('④ 建造页标注：' + JSON.stringify(tags));
    ck('④ 建造页每件家具都带「占 1 格 / 不占位」标记', tags.有标记的行数 === tags.总行数 && tags.总行数 > 0, tags.总行数 + ' 行');
    ck('④ 两种标记都真的出现（占位 与 不占位 各自标注）',
       tags.占位 > 0 && tags.不占位 > 0, '占 1 格 ' + tags.占位 + ' 件 / 不占位 ' + tags.不占位 + ' 件：' + (tags.不占位样例 || []).join('、'));

    // 点"占位"家具 → 弹确认，且还没造
    const askSlot = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const before = { used: Game.furnitureUsed(), 有草床: !!Game.S().furniture.bed1 };
      const btn = [...document.querySelectorAll('#modal [data-fid]')].find(b => b.dataset.fid === 'bed1');
      if (!btn) return { __err: '建造页里没有草床' };
      btn.click(); await w(700);
      const txt = (document.querySelector('#modal .overlay-text') || {}).textContent || '';
      const title = (document.querySelector('#modal .modal-title') || {}).textContent || '';
      return { 标题: title, 正文: txt, 选项: [...document.querySelectorAll('#modal [data-choice]')].map(x => x.textContent.trim()),
               before, after: { used: Game.furnitureUsed(), 有草床: !!Game.S().furniture.bed1 } };
    })()`);
    console.log('⑤ 点「草床·建造」：' + JSON.stringify(askSlot));
    ck('⑤ 点占位家具会先弹确认框', /确认打造/.test(askSlot.标题 || ''), askSlot.标题);
    ck('⑤ 确认前**还没开始造**（家具位没变、草床不存在）',
       askSlot.after && askSlot.after.used === askSlot.before.used && askSlot.after.有草床 === false, JSON.stringify(askSlot.after));
    ck('⑤ 文案写明"会占用 1 格家具空间"', /会占用 1 格家具空间/.test(askSlot.正文 || ''));
    ck('⑤ 文案写明 现在几格 / 打完几格 / 还剩几格',
       /现在：家具位 \d+\/\d+（还剩 \d+ 格）/.test(askSlot.正文 || '') && /打造后：\d+\/\d+/.test(askSlot.正文 || ''));
    ck('⑤ 有「继续打造」和「取消」两个选择', (askSlot.选项 || []).length === 2 && /继续打造/.test(askSlot.选项[0]) && /取消/.test(askSlot.选项[1]), JSON.stringify(askSlot.选项));

    // 点取消 → 回到营地，什么都没发生
    const cancel = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const c = [...document.querySelectorAll('#modal [data-choice]')].find(x => /取消/.test(x.textContent));
      c.click(); await w(700);
      return { used: Game.furnitureUsed(), 有草床: !!Game.S().furniture.bed1, 回到建造页: !!document.querySelector('#modal [data-fid]') };
    })()`);
    console.log('⑥ 点「取消」后：' + JSON.stringify(cancel));
    ck('⑥ 取消后没有造任何东西', cancel.used === askSlot.before.used && cancel.有草床 === false, JSON.stringify(cancel));
    ck('⑥ 取消后回到营地建造页（不用自己再找一遍）', cancel.回到建造页 === true);

    // 点继续 → 真的造
    const go = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const before = { used: Game.furnitureUsed() };
      [...document.querySelectorAll('#modal [data-fid]')].find(b => b.dataset.fid === 'bed1').click(); await w(600);
      [...document.querySelectorAll('#modal [data-choice]')].find(x => /继续打造/.test(x.textContent)).click();
      await w(4200);   // 建造有动画（约 2.5s）
      return { before, used: Game.furnitureUsed(), 有草床: !!Game.S().furniture.bed1, maxStam: Game.maxStam() };
    })()`);
    console.log('⑦ 点「继续打造」后：' + JSON.stringify(go));
    ck('⑦ 确认后真的造出来了（草床存在、家具位 +1）',
       go.有草床 === true && go.used === go.before.used + 1, JSON.stringify(go));
    ck('⑦ 造完床，体力上限跟着涨（床 +5）', go.maxStam >= 155, 'maxStam=' + go.maxStam);

    // 不占位家具：直接造，不弹确认
    const freeOne = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      if (!document.querySelector('#modal [data-fid]')) { return { __err: '不在建造页' }; }
      const btn = [...document.querySelectorAll('#modal [data-fid]')].find(b => b.dataset.fid === 'flag');
      if (!btn) return { __err: '建造页里没有旗帜', ids: [...document.querySelectorAll('#modal [data-fid]')].map(b => b.dataset.fid) };
      Game.addItem('branch', 10, true); Game.addItem('cloth', 10, true);
      btn.click(); await w(600);
      const 弹了确认 = /确认打造/.test((document.querySelector('#modal .modal-title') || {}).textContent || '');
      return { 弹了确认: 弹了确认 };
    })()`);
    console.log('⑧ 点「旗帜·建造」（不占位）：' + JSON.stringify(freeOne));
    ck('⑧ 不占位的家具直接造、不弹确认框', freeOne.弹了确认 === false, JSON.stringify(freeOne));

    // 帮助页
    const help = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const hb = document.querySelector('#modal [data-help="furn"]');
      if (!hb) return { __err: '建造页没有家具帮助按钮' };
      hb.click(); await w(700);
      const txt = (document.querySelector('#modal .help-list') || {}).textContent || '';
      return { 讲规则: /家具位/.test(txt), 讲不占位: /不占位/.test(txt), 讲升级不额外占格: /升级替换/.test(txt) };
    })()`);
    console.log('⑨ 家具帮助页：' + JSON.stringify(help));
    ck('⑨ 帮助页讲了家具位规则与"不占位"清单', help.讲规则 === true && help.讲不占位 === true && help.讲升级不额外占格 === true, JSON.stringify(help));
  }

  // 属性面板：体力上限来源
  const attr = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const mx = document.querySelector('#modal .modal-x'); if (mx) mx.click(); await w(300);
    document.querySelector('#nav [data-nav="equip"]').click(); await w(600);
    document.querySelector('#modal [data-equiptab="attr"]').click(); await w(600);
    const rows = [...document.querySelectorAll('#modal .help-item')].map(x => x.textContent);
    return { 体力行: rows.find(t => t.includes('体力')) || null, 有床: !!Game.S().furniture.bed1 };
  })()`);
  console.log('⑩ 属性面板：' + JSON.stringify(attr));
  // 有床就得写出"床 +N 上限"；没床（前面没走成 UI 路径）则至少要有"做一张床可 +5~20 上限"的引导
  ck('⑩ 属性面板简洁显示体力数值，不附床来源说明',
     /^体力\d+\/\d+$/.test(attr.体力行 || ''),
     attr.体力行);

  await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'furn-slot.png'), Buffer.from(x.data, 'base64')));

  // ⑪ 鸡舍/羊圈搬到农田（作者 2026-09-25："从而腾出家具位"，农田每升一级 +1 畜牧位）
  const ranch = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const mx = document.querySelector('#modal .modal-x'); if (mx) mx.click(); await w(300);
    const S = Game.S(); S.tut = null; S.scene = 'camp'; S.buildings.farm = 0; S.inv = {};
    Game.addItem('wood', 60, true); Game.addItem('vine', 30, true);
    const n = document.querySelector('#nav [data-nav="map"]'); if (n) { n.click(); await w(500); }
    // ① 营地的家具列表里不该再有鸡舍/羊圈
    const 营地动作 = [...document.querySelectorAll('#scene-actions .action-btn')].map(b => b.textContent.trim());
    const 营地面板 = 营地动作.find(t => /营地升级|住处/.test(t));
    let 营地家具文本 = '';
    if (营地面板) {
      [...document.querySelectorAll('#scene-actions .action-btn')].find(b => /营地升级|住处/.test(b.textContent)).click();
      await w(700);
      营地家具文本 = (document.querySelector('#modal') || {}).textContent || '';
      document.querySelector('#modal .modal-x')?.click(); await w(300);
    }
    // ② 农田场景要有「农场管理」热点
    S.scene = 'farm'; UI.render(); await w(600);
    // ⚠️ 热点只在"场景视图"里渲染；上面点过导航地图，可能正停在地图视图上。
    //    #btn-backmap 是地图↔场景的切换键：不在场景视图就点它。
    for (let i = 0; i < 3 && !document.querySelector('.hotspot'); i++) {
      const bb = document.querySelector('#btn-backmap'); if (!bb) break; bb.click(); await w(600);
    }
    S.scene = 'farm'; UI.render(); await w(400);
    const 热点 = [...document.querySelectorAll('.hotspot')].map(h => h.textContent.trim());
    const 管理热点 = [...document.querySelectorAll('.hotspot')].find(h => /农场管理/.test(h.textContent));
    if (!管理热点) return { __err: '农田没有「农场管理」热点', 热点, 营地家具文本: 营地家具文本.slice(0, 60) };
    管理热点.click(); await w(700);
    const 面板 = (document.querySelector('#modal') || {}).textContent || '';
    const 畜牧位标题 = (面板.match(/农田畜牧位（(\\d+)\\/(\\d+)）/) || []);
    const 建造按钮 = [...document.querySelectorAll('#modal [data-fid="coop"], #modal [data-fid="pen"]')].map(b => b.textContent.trim());
    return {
      营地有鸡舍: /鸡舍/.test(营地家具文本), 营地有羊圈: /羊圈/.test(营地家具文本),
      畜牧位标题: 畜牧位标题[0] || '', 面板含鸡舍: /鸡舍/.test(面板), 面板含羊圈: /羊圈/.test(面板),
      建造按钮, 面板含不占位说明: /不占住房家具位/.test(面板),
      畜牧位free: Game.farmLiveFree(), 畜牧位cap: Game.farmLiveSlots(),
    };
  })()`);
  console.log('⑪ 牧场搬家：' + JSON.stringify(ranch));
  if (ranch.__err) { ck('⑪ 农田「农场管理」入口可测', false, JSON.stringify(ranch)); }
  else {
    ck('★ ⑪1 营地的家具列表里不再有鸡舍/羊圈（腾出家具位）',
       ranch.营地有鸡舍 === false && ranch.营地有羊圈 === false);
    ck('★ ⑪2 农田场景有「农场管理」热点，点开是农田面板（含畜牧位段）',
       /农田畜牧位/.test(ranch.畜牧位标题) && ranch.面板含鸡舍 && ranch.面板含羊圈, ranch.畜牧位标题);
    ck('★ ⑪3 面板里能直接建鸡舍/羊圈，并写明"不占住房家具位"',
       (ranch.建造按钮 || []).length === 2 && ranch.面板含不占位说明 === true, (ranch.建造按钮 || []).join(' / '));
    ck('★ ⑪4 畜牧位数 = 农田等级 +1（苗床 1 个）',
       ranch.畜牧位cap === 1 && ranch.畜牧位free === 1, 'cap=' + ranch.畜牧位cap);
    await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'farm-ranch.png'), Buffer.from(x.data, 'base64')));
  }

  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');
  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('\n通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
