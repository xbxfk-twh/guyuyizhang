/* 通关分享图 复核（作者 2026-09-24）

   ① 通关界面有「分享通关图」按钮
   ② 点了会生成一张图（blob/dataURL，非空）
   ③ 图的尺寸是 1080×1620（竖版长图）
   ④ 图**不是空白的**：抽样像素要有足够颜色多样性（防止"生成了但全同色"）
   ⑤ 弹窗里有图 + 「保存图片」下载链接（download 属性带文件名）
   ⑥ 结局插画加载失败/被污染时也要能出图（退回纯排版，不能点了没反应） */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = process.env.GUYU_GAME_ROOT || 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const OUT = path.join(__dirname, '_out', 'share');
const PORT = 9513;
const PROFILE = path.join(os.tmpdir(), 'guyu_sh_' + process.pid);
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

  // 开局 → 造一份"有内容"的存档 → 触发结局画面
  const boot = await ev(`(async () => {
    const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(1600);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
    const S = Game.S(); if (!S) return { __err: 'no state' };
    S.tut = null; S.day = 72; S.fame = 4;
    S.killCount = { wolf: 12, boar: 5, pirateBoss: 1, sunkenKing: 1 };
    S.buildings = { house: 3, fire: 3, storage: 2, wall: 3, watch: 3, dock: 2, farm: 2 };
    S.diary = [
      { day: 3, line: '我在河边捡到一块燧石，做了第一把斧头。' },
      { day: 20, line: '老潮的船靠岸了，我用熏鱼换了铁锭。' },
      { day: 55, line: '灯塔的光穿过深海，照回了海面。' },
      { day: 72, line: '沉没之王倒下了。这座城重新开始呼吸。' },
    ];
    S.flags.ended_S = 1;
    // ⚠️ doEnding 只弹「结局达成」提示；真正铺出结局画面（#ending-screen）的是 settleEnding
    //    → onEnding → showEnding。第一版用 doEnding，结果 #end-share 根本不存在。
    document.querySelector('#modal .modal-x')?.click(); await w(250);
    Game.settleEnding('endS');
    await w(1500);
    for (let i = 0; i < 10; i++) { const x = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!x) break; x.click(); await w(200); }
    return { 有按钮: !!document.querySelector('#end-share'), 结局屏: !!document.querySelector('#ending-screen.open') };
  })()`);
  console.log('\n开局并触发结局：' + JSON.stringify(boot));
  ck('① 通关界面出现「分享通关图」按钮', boot.有按钮 === true, JSON.stringify(boot));

  // ② 点它 → 生成图
  const gen = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const b = document.querySelector('#end-share');
    if (!b) return { __err: 'no button' };
    b.click();
    // 等图片生成（最多 8 秒）。
    // ⚠️ 只等"元素出现"不够：元素一渲染就有，但 blob 还没解码完时 naturalWidth 是 0，
    //    整机跑 30 组探针时磁盘/CPU 抢得厉害，这里曾经偶发 0x0 假失败。
    //    所以等到"真的解码出尺寸"为止（断言没放宽，还是要求 1080x1620）。
    for (let i = 0; i < 40; i++) { await w(200); const im = document.querySelector('#modal .share-img'); if (im && im.complete && im.naturalWidth > 0) break; }
    const img = document.querySelector('#modal .share-img');
    if (!img) return { __err: '分享图没出现', 弹窗文本: (document.querySelector('#modal') || {}).textContent ? document.querySelector('#modal').textContent.slice(0, 80) : '' };
    return { src: (img.getAttribute('src') || '').slice(0, 40), 有图: true,
             有下载: !!document.querySelector('#modal .share-dl'),
             下载名: (document.querySelector('#modal .share-dl') || {}).getAttribute ? document.querySelector('#modal .share-dl').getAttribute('download') : null,
             长边: img.naturalWidth, 短边: img.naturalHeight };
  })()`);
  console.log('② 生成分享图：' + JSON.stringify(gen));
  ck('② 点「分享通关图」会生成并弹出图片', gen.有图 === true, gen.__err || gen.src);
  ck('③ 图片尺寸是 1080×1620（竖版长图）', gen.长边 === 1080 && gen.短边 === 1620, gen.长边 + 'x' + gen.短边);
  ck('⑤ 有「保存图片」下载链接且带文件名', gen.有下载 === true && /孤屿遗章_结局_/.test(gen.下载名 || ''), gen.下载名);

  // ④ 不是空白：把图重新画到小画布上抽样，数颜色多样性
  const pix = await ev(`(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const img = document.querySelector('#modal .share-img');
    if (!img) return { __err: '没有图' };
    if (!img.complete) await new Promise(r => { img.onload = r; img.onerror = r; });
    const c = document.createElement('canvas'); c.width = 120; c.height = 180;
    const x = c.getContext('2d');
    try { x.drawImage(img, 0, 0, 120, 180); } catch (e) { return { __err: 'drawImage 失败: ' + e.message }; }
    let dark = 0, light = 0, mid = 0, red = 0; const seen = new Set();
    const d = x.getImageData(0, 0, 120, 180).data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
      if (lum < 80) dark++; else if (lum > 200) light++; else mid++;
      if (d[i] > 120 && d[i] - d[i + 1] > 45 && d[i] - d[i + 2] > 45) red++;
      seen.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4));
    }
    const total = d.length / 4;
    return { 深色占比: +(dark / total).toFixed(3), 浅色占比: +(light / total).toFixed(3), 中间色占比: +(mid / total).toFixed(3),
             颜色种类: seen.size, 有朱红: red > 3, 朱红数: red };
  })()`);
  console.log('④ 像素抽样：' + JSON.stringify(pix));
  ck('④ 图不是空白（深色海景与亮色文字并存）',
     pix.深色占比 > 0.35 && pix.浅色占比 > 0.002 && pix.中间色占比 > 0.05, JSON.stringify(pix));
  ck('④ 图有足够颜色层次（不是纯色块）', pix.颜色种类 >= 12, '颜色种类 ' + pix.颜色种类);
  ck('④ 有朱印那抹朱红（不是纯黑白）', pix.有朱红 === true, '朱红像素 ' + pix.朱红数);

  // ④b 底纹真的被用上了：顶部那片山峦/海浪装饰带（y≈90~170）必须有成片墨色 ——
  //     那一段是底纹画的，我的文字不在那儿，所以能证明"海报框确实贴上了"。
  const deco = await ev(`(async () => {
    const img = document.querySelector('#modal .share-img');
    if (!img) return { __err: '没有图' };
    if (!img.complete) await new Promise(r => { img.onload = r; img.onerror = r; });
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1620;
    const x = c.getContext('2d');
    try { x.drawImage(img, 0, 0, 1080, 1620); } catch (e) { return { __err: 'drawImage 失败' }; }
    const band = (y0, h) => {
      const d = x.getImageData(150, y0, 780, h).data; let dark = 0;
      for (let i = 0; i < d.length; i += 4) if ((d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) < 120) dark++;
      return +(dark / (d.length / 4)).toFixed(4);
    };
    return { 顶部装饰带墨色占比: band(92, 72), 正文带墨色占比: band(600, 60) };
  })()`);
  console.log('④b 底纹检查：' + JSON.stringify(deco));
  ck('④b 顶部装饰带是底纹画的（有山峦/海浪墨色）', deco.顶部装饰带墨色占比 > 0.03, JSON.stringify(deco));

  // ④c 排版守卫：正文最低点必须落在底纹的中央留白区内
  const fit = await ev(`({ bottom: window.__shareContentBottom, safe: window.__shareSafeBottom })`);
  console.log('④c 安全区：' + JSON.stringify(fit));
  ck('④c 正文没有越过中央留白区（不会压到底部枯枝/水纹上）',
     typeof fit.bottom === 'number' && typeof fit.safe === 'number' && fit.bottom <= fit.safe + 120,
     '正文底 ' + fit.bottom + ' / 页脚线 ' + fit.safe);

  // 保存一份到磁盘，人工也能看
  await ev(`(async () => {
    const img = document.querySelector('#modal .share-img');
    if (!img) return 0;
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1620;
    const x = c.getContext('2d');
    try { x.drawImage(img, 0, 0, 1080, 1620); } catch (e) { return 0; }
    window.__shareData = c.toDataURL('image/png');
    return 1;
  })()`);
  const dataUrl = await ev(`window.__shareData || ''`);
  if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/png;base64,')) {
    fs.writeFileSync(path.join(OUT, 'share-card.png'), Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('   （已保存样本：' + path.join(OUT, 'share-card.png') + '）');
  }

  // ⑥ 底纹缺失也要能出图（临时把它挪走，测完立刻还原）
  //    ⚠️ 这条是**故意**破坏的：底纹读不到时若直接 resolve(null)，玩家点了就是"没反应"。
  const posterPath = path.join(ROOT, 'assets', 'img', 'share', 'poster.png');
  const posterBak = posterPath + '.probetmp';
  let fallback = { __err: '未执行' };
  try {
    fs.renameSync(posterPath, posterBak);
    await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
    await sleep(2600);
    fallback = await ev(`(async () => {
      const clk = x => { const e = document.querySelector(x); if (e) e.click(); };
      const w = ms => new Promise(r => setTimeout(r, ms));
      // ⚠️ 重载后再开一局：身份/难度那三下偶尔会点空，所以带一次重试 + Game.S() 守卫
      //    （第一版没守卫，直接在 null 上写 S.tut 就抛了）
      for (let attempt = 0; attempt < 3 && !Game.S(); attempt++) {
        clk('#btn-new'); await w(500);
        clk('.identity'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(1600);
        for (let i = 0; i < 10; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
        if (!Game.S()) await w(900);
      }
      const S = Game.S();
      if (!S) return { __err: '重载后没能开成局' };
      S.tut = null; S.day = 30; S.flags.ended_S = 1;
      document.querySelector('#modal .modal-x')?.click(); await w(250);
      Game.settleEnding('endS'); await w(1500);
      for (let i = 0; i < 10; i++) { const x = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!x) break; x.click(); await w(200); }
      const b = document.querySelector('#end-share'); if (!b) return { __err: '没有分享按钮' };
      b.click();
      // 同上：等到图片真的解码出尺寸，而不是只等元素出现（整机跑时这里曾经偶发 0x0）
      for (let i = 0; i < 40; i++) { await w(200); const im = document.querySelector('#modal .share-img'); if (im && im.complete && im.naturalWidth > 0) break; }
      const img = document.querySelector('#modal .share-img');
      return { 出图了: !!img, 宽: img ? img.naturalWidth : 0, 高: img ? img.naturalHeight : 0 };
    })()`);
  } finally {
    try { fs.renameSync(posterBak, posterPath); } catch (e) {}
  }
  console.log('⑥ 底纹缺失时：' + JSON.stringify(fallback));
  ck('⑥ 底纹读不到也能出图（退回纯代码版，不会点了没反应）',
     fallback.出图了 === true && fallback.宽 === 1080 && fallback.高 === 1620, JSON.stringify(fallback));
  ck('⑥ 测完底纹已还原', fs.existsSync(posterPath) === true);

  ck('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | ') || '无');
  ws.close(); ch.kill(); await sleep(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('\n通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
