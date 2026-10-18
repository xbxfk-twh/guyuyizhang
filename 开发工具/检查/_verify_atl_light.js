/* 亚特兰蒂斯：照明不足不能进入深渊裂谷 —— UI 与逻辑一致性（作者 2026-09-22 交办 C）
   覆盖真实调用路径：地图箭头（refreshMapArrows 的 zLock）→ 点击被拦（不播动画/不扣时间/不移动）
   → 装上强光手电后解锁 → 能进入。底层 Game.setZone 的 needLight 兜底由 checks.js 的 core 断言覆盖。 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = process.env.GUYU_GAME_ROOT || path.resolve(__dirname, '../..', '孤屿遗章-游戏 - 发布');
const OUT = path.join(__dirname, '_out', 'atllight');
const PORT = 9443;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_atllight_' + process.pid);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r2 => { let b = ''; r2.on('data', c => b += c); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });
let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('    OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('    FAIL ' + l + (e ? '  —— ' + e : '')); } };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=1600,900', 'about:blank'], { stdio: 'ignore' });
  let t = null;
  for (let i = 0; i < 60 && !t; i++) { await sleep(250); try { t = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(x => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (me, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => (m.error ? rej(new Error(me + ':' + JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method: me, params: p || {} })); });
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) }; return r.result && r.result.value; };

  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleep(2800);
  await ev(`localStorage.setItem('guyuyizhang_skin', '["seasons"]')`);
  await send('Page.reload', { ignoreCache: true });
  await sleep(1200);

  // 开局 + 解锁亚特兰蒂斯 + 装备潜水三件套，但不给任何照明
  await ev(`(async () => {
    const clk = s => { const e = document.querySelector(s); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(1400);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
    const S = Game.S(); S.tut = null; S.buildings.watch = 3; S.stats.stamina = 99999; S.stats.hp = 99999;
    S.atlantis = S.atlantis || {}; S.atlantis.unlocked = 1; S.atlantis.stoneActive = 1;
    Game.addItem('seachart', 1, true); Game.addItem('diveSuit', 1, true); Game.addItem('diveMask', 1, true);
    S.equipment.cloth = 'diveSuit'; S.toolkit = ['diveMask', null, null];
    return { light: Game.lightLevel() };
  })()`);

  // 进入海底并打开地图
  const mapState = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    Game.travel('atlantis'); await w(900);
    document.querySelector('#nav [data-nav="map"]').click(); await w(1200);
    const S = Game.S();
    const arrow = (z) => document.querySelector('#map-arrows .map-arrow[data-zone="' + z + '"]');
    return {
      scene: S.scene, zone: S.zone,
      colorMap: (document.querySelector('#map-img') || {}).src?.includes('/map-pack/atlantis/map.jpg') || false,
      habitatX: arrow('habitat') ? parseFloat(arrow('habitat').style.left) : null,
      abyssLocked: arrow('abyss') ? arrow('abyss').classList.contains('locked') : null,
      abyssUnlocked: arrow('abyss') ? arrow('abyss').classList.contains('unlocked') : null,
      trenchLocked: arrow('trench') ? arrow('trench').classList.contains('locked') : null,
      cityUnlocked: arrow('city') ? arrow('city').classList.contains('unlocked') : null,
      shipwreckUnlocked: arrow('shipwreck') ? arrow('shipwreck').classList.contains('unlocked') : null,
      coralForestUnlocked: arrow('coralForest') ? arrow('coralForest').classList.contains('unlocked') : null,
    };
  })()`);
  console.log('地图状态: ' + JSON.stringify(mapState));
  await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'map-hotspots.png'), Buffer.from(x.data, 'base64')));
  ck('已在亚特兰蒂斯地图（zone=habitat）', mapState.scene === 'atlantis' && mapState.zone === 'habitat');
  ck('全彩地图的礁石栖息地热点对准右侧发光入口', mapState.colorMap && mapState.habitatX >= 90 && mapState.habitatX <= 94);
  ck('照明不足时，深渊裂谷箭头为 locked（禁用）', mapState.abyssLocked === true, 'locked=' + mapState.abyssLocked);
  ck('照明不足时，海沟箭头也 locked（needLight 2）', mapState.trenchLocked === true, 'locked=' + mapState.trenchLocked);
  ck('不需要照明的沉没之城箭头仍 unlocked', mapState.cityUnlocked === true, 'unlocked=' + mapState.cityUnlocked);
  ck('沉船墓地不会因一个黑暗船舱误锁整区', mapState.shipwreckUnlocked === true, 'unlocked=' + mapState.shipwreckUnlocked);
  ck('珊瑚森林不会因一个幽光花点位误锁整区', mapState.coralForestUnlocked === true, 'unlocked=' + mapState.coralForestUnlocked);

  // 点击被锁的 abyss 箭头：不许弹「前往」确认框、不播动画、不扣时间/体力、不移动
  const clickLocked = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const S = Game.S();
    const t0 = S.tick, st0 = S.stats.stamina, z0 = S.zone;
    const a = document.querySelector('#map-arrows .map-arrow[data-zone="abyss"]');
    a.click(); await w(600);
    const toast = document.querySelector('#center-toast');
    const modalGo = [...document.querySelectorAll('#modal button')].some(b => /前往/.test(b.textContent));
    const animLayer = !!document.querySelector('.travel-layer, .atl-portal');
    return {
      zoneBefore: z0, zoneAfter: S.zone,
      tickBefore: t0, tickAfter: S.tick,
      stamBefore: st0, stamAfter: S.stats.stamina,
      modalGo, animLayer,
      toast: toast ? toast.textContent : '',
    };
  })()`);
  console.log('点击锁定箭头: ' + JSON.stringify(clickLocked));
  ck('点击锁定箭头没有移动到 abyss（仍在 ' + clickLocked.zoneAfter + '）', clickLocked.zoneBefore === clickLocked.zoneAfter && clickLocked.zoneAfter !== 'abyss');
  ck('点击锁定箭头不扣时间', clickLocked.tickBefore === clickLocked.tickAfter, 'tick ' + clickLocked.tickBefore + '→' + clickLocked.tickAfter);
  ck('点击锁定箭头不扣体力', clickLocked.stamBefore === clickLocked.stamAfter, '体力 ' + clickLocked.stamBefore + '→' + clickLocked.stamAfter);
  ck('点击锁定箭头不弹「前往」确认框', clickLocked.modalGo === false);
  ck('点击锁定箭头不播放行进/下潜动画', clickLocked.animLayer === false);
  ck('点击锁定箭头给出清晰原因（点名下潜强光手电）', /看不见|照明|手电|护目镜/.test(clickLocked.toast), clickLocked.toast.slice(0, 60));

  // 装上强光手电（照明 3）→ 重新进地图 → abyss 解锁 → 点击能弹出「前往」
  const unlock = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const S = Game.S();
    S.capacity = 999;
    if (!Game.addItem('lightStrong', 1, true)) throw Error('照明测试物品未成功装入背包');
    (S.toolkit = S.toolkit || [])[0] = 'lightStrong';
    document.querySelector('#nav [data-nav="map"]').click(); await w(900);
    const a = document.querySelector('#map-arrows .map-arrow[data-zone="abyss"]');
    return { light: Game.lightLevel(), abyssLocked: a ? a.classList.contains('locked') : null, abyssUnlocked: a ? a.classList.contains('unlocked') : null };
  })()`);
  console.log('装上强光手电后: ' + JSON.stringify(unlock));
  ck('装上强光手电后照明=3', unlock.light === 3, 'light=' + unlock.light);
  ck('装上强光手电后 abyss 箭头解锁', unlock.abyssUnlocked === true && unlock.abyssLocked === false);

  // 点击已解锁的 abyss 箭头 → 弹「前往」确认 → 点前往 → 真正进入 abyss
  const goAbyss = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const S = Game.S();
    const a = document.querySelector('#map-arrows .map-arrow[data-zone="abyss"]');
    a.click(); await w(700);
    const go = [...document.querySelectorAll('#modal button')].find(b => /前往/.test(b.textContent));
    if (!go) return { err: '没有「前往」按钮', zone: S.zone };
    go.click(); await w(3200);   // 等行进动画 + setZone 落地
    return { zone: S.zone };
  })()`);
  console.log('前往 abyss: ' + JSON.stringify(goAbyss));
  ck('照明充足时能真正进入深渊裂谷（zone=abyss）', goAbyss.zone === 'abyss', 'zone=' + goAbyss.zone);

  await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, 'abyss_unlocked.png'), Buffer.from(x.data, 'base64')));
  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('');
  console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
