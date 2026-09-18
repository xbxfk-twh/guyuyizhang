/* 对主线（打包来源）实测地图热点：确认包里的行为正确 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const PORT = 9369;
const PROFILE = path.join(require('os').tmpdir(), 'guyu_mapfin_' + process.pid);
const sleepMs = ms => new Promise(r => setTimeout(r, ms));
const getJSON = url => new Promise((res, rej) => { http.get(url, r2 => { let b = ''; r2.on('data', c => (b += c)); r2.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });

let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };

(async () => {
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--window-size=2340,1080', 'about:blank'], { stdio: 'ignore' });
  let t = null;
  for (let i = 0; i < 60 && !t; i++) { await sleepMs(250); try { t = (await getJSON('http://127.0.0.1:' + PORT + '/json/list')).find(x => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (me, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => (m.error ? rej(new Error(me + ':' + JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method: me, params: p || {} })); });
  const ev = async (x) => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 250) }; return r.result && r.result.value; };

  await send('Emulation.setDeviceMetricsOverride', { width: 2340, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file:///' + encodeURI(ROOT.replace(/\\/g, '/') + '/index.html') });
  await sleepMs(2600);
  const bv = await ev(`window.BUILD_VER`);
  ck('包内 BUILD_VER 已是新构建', String(bv).indexOf('v1.06-20260914') === 0, String(bv));

  await ev(`(async () => {
    const clk = s => { const e = document.querySelector(s); if (e) e.click(); };
    const w = ms => new Promise(r => setTimeout(r, ms));
    clk('#btn-new'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(400); clk('.identity'); await w(1400);
    for (let i = 0; i < 8; i++) { const b = document.querySelector('#modal .modal-actions button, #modal #modal-close'); if (!b) break; b.click(); await w(200); }
    const S = Game.S(); S.tut = null; S.buildings.watch = 3; S.stats.stamina = 99999;
    document.querySelector('#nav [data-nav="map"]').click(); await w(1000);
    return 1;
  })()`);

  const INSPECT = `(() => {
    const wr = document.querySelector('#map-wrap').getBoundingClientRect();
    const rows = [...document.querySelectorAll('#map-arrows .map-arrow')].map(a => {
      const r = a.getBoundingClientRect();
      const vis = getComputedStyle(a).display !== 'none';
      return { label: (a.textContent||'').replace(/[●▼]/g,'').trim().slice(0,6),
        cls: a.className, same: a.style.left === a.dataset.pctL && a.style.top === a.dataset.pctT,
        ml: a.style.marginLeft || '0px', y: Math.round(r.top - wr.top), vis };
    });
    return { total: rows.length, visible: rows.filter(r=>r.vis).length,
      hidden: rows.filter(r=>!r.vis).length, pinned: rows.filter(r=>/pinned/.test(r.cls)).length,
      moved: rows.filter(r=>!r.same).length, rows };
  })()`;

  let s = await ev(INSPECT);
  ck('没有"浮动标签"（pinned）残留', s.pinned === 0, 'pinned=' + s.pinned);
  // ⚠️ 这条要在"任何拖动/滚轮之前"测：刚进地图时平移量必须是 0，
  //    证明没有自动把某个场景送到画面中间（玩家明确不要）。
  {
    const init = await ev(`(() => {
      const im = document.querySelector('#map-img'), wr = document.querySelector('#map-wrap');
      const top = parseFloat(im.style.top), left = parseFloat(im.style.left);
      // 未平移时的位置 = 内容盒居中：top = (wrapH - imgH)/2
      const newo = (wr.clientHeight - im.getBoundingClientRect().height) / 2;
      return { top, left, 未平移top: Math.round(newo), 视口宽: wr.clientWidth, 地图宽: Math.round(im.getBoundingClientRect().width) };
    })()`);
    console.log('    初始 style.top=' + init.top + '（未平移应为 ' + init.未平移top + '）  style.left=' + init.left);
    ck('★ 刚进地图时没有自动居中（平移量为 0）',
       Number.isFinite(init.top) && Math.abs(init.top - init.未平移top) <= 1,
       'top=' + init.top + ' vs 未平移 ' + init.未平移top);
  }
  ck('所有热点都保持地图坐标（没被搬走）', s.moved === 0, '被搬走 ' + s.moved + ' 个');
  // 主人要求：热点像印在地图上，滑出画面就跟着一起滑出去，不许突然消失、不许独立位移
  ck('没有热点被隐藏（不做显隐判定）', s.hidden === 0, '隐藏 ' + s.hidden + ' / 共 ' + s.total);
  ck('全部热点都在渲染（含已滑出画面的）', s.visible === s.total, '可见 ' + s.visible + ' / 共 ' + s.total);
  const mlDrift = s.rows.filter(r => r.ml && r.ml !== '0px').length;
  ck('没有任何热点带独立位移（marginLeft 全为 0）', mlDrift === 0, mlDrift + ' 个有位移');

  // 地图移动后：热点相对地图的坐标必须完全不变（真·锁定），但在视口里的位置要跟着一起动。
  //
  // ⚠️ 这段踩过的坑（都记下来，别再踩）：
  //   ① bindPan 监听的是 pointerdown / pointermove / pointerup，而 CDP 的
  //      Input.dispatchTouchEvent【不会】合成 pointer 事件 —— 用触摸派发永远拖不动地图。
  //      这条测试长期"没报错"只是因为断言的是"没动"，恰好蒙对。
  //   ② CDP 的 Input.dispatchMouseEvent 在这套 headless 里同样驱动不了 pointer 流
  //      （实测 pointer 事件确实到了 wrap、clientY 也每次 -12，但游戏那侧的 setPan 始终没被调到）。
  //   ③ 起点不能压在热点箭头上：bindPan 里有 `if (e.target.closest('.map-arrow, ...')) return;`
  //      —— 按在热点上是"点击"，本来就不该拖图（这是正确行为，不是 bug）。
  //   ④ 所以位移改用**滚轮**验证：滚轮走的是同一个 setPan → applyMapPan 通道，
  //      一样能证明"底图移动时热点跟着一起动"。
  const beforeY = {}; s.rows.forEach(r => { beforeY[r.label] = r.y; });
  {
    const b = await ev(`(() => {
      const r = document.querySelector('#map-wrap').getBoundingClientRect();
      const ir = document.querySelector('#map-img').getBoundingClientRect();
      const top = Math.max(r.top, ir.top), bot = Math.min(r.bottom, ir.bottom);
      for (let f = 0.8; f >= 0.2; f -= 0.05) {
        for (const fx of [0.12, 0.3, 0.5, 0.7, 0.88]) {
          const x = r.left + r.width * fx, y = top + (bot - top) * f;
          const e = document.elementFromPoint(x, y);
          if (e && e.closest && !e.closest('.map-arrow, .hotspot, .target, .zone-btn, button') && document.querySelector('#map-wrap').contains(e)) return { x, y };
        }
      }
      return { x: r.left + r.width * 0.5, y: top + (bot - top) * 0.5 };
    })()`);
    const topBefore = await ev(`Math.round(document.querySelector('#map-img').getBoundingClientRect().top)`);
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: b.x, y: b.y, deltaX: 0, deltaY: 150 });
    await sleepMs(500);
    const topAfter = await ev(`Math.round(document.querySelector('#map-img').getBoundingClientRect().top)`);
    ck('地图能被滚动/拖动（底图位置真的变了）', topAfter !== topBefore, '位移 ' + (topAfter - topBefore) + 'px');
  }
  s = await ev(INSPECT);
  const movedInVp = s.rows.filter(r => beforeY[r.label] !== undefined && beforeY[r.label] !== r.y).length;
  ck('地图移动后，热点在视口里的位置跟着一起动', movedInVp > 0, '随图移动 ' + movedInVp + ' 个热点');
  ck('地图移动后热点相对地图坐标仍完全不变（真锁定）', s.moved === 0 && s.pinned === 0, 'moved=' + s.moved + ' pinned=' + s.pinned);
  ck('地图移动后依然没有热点被隐藏', s.hidden === 0, '隐藏 ' + s.hidden);
  ck('绑定了拖动/滚轮（bindMapPan + bindPan，且监听 pointer 事件）',
     /function bindMapPan\(\)/.test(fs.readFileSync(ROOT + '/js/ui.js', 'utf8')) &&
     /addEventListener\('pointerdown'/.test(fs.readFileSync(ROOT + '/js/ui.js', 'utf8')) &&
     /addEventListener\('wheel'/.test(fs.readFileSync(ROOT + '/js/ui.js', 'utf8')));

  // 玩家明确要求：**整张岛必须拖着看**，一进地图不能把所有场景热点都送到眼前。
  // 所以这里反着验：地图必须比视口高/宽出可观的一块，且不能有任何自动居中。
  {
    const geo = await ev(`(() => {
      const wr = document.querySelector('#map-wrap').getBoundingClientRect();
      const ir = document.querySelector('#map-img').getBoundingClientRect();
      const arrows = [...document.querySelectorAll('#map-arrows .map-arrow')];
      const inView = arrows.filter(a => { const r = a.getBoundingClientRect(); return r.bottom > wr.top && r.top < wr.bottom; }).length;
      return { vh: Math.round(wr.height), mh: Math.round(ir.height), vw: Math.round(wr.width), mw: Math.round(ir.width),
               hotspots: arrows.length, inView, panY: document.querySelector('#map-img').style.top, panX: document.querySelector('#map-img').style.left };
    })()`);
    console.log('    视口 ' + geo.vw + 'x' + geo.vh + '  地图 ' + geo.mw + 'x' + geo.mh + '  视口内热点 ' + geo.inView + '/' + geo.hotspots);
    ck('★ 地图大于视口（整张岛要拖才看得全）', (geo.mh > geo.vh + 4 || geo.mw > geo.vw + 4),
       '地图 ' + geo.mw + 'x' + geo.mh + ' vs 视口 ' + geo.vw + 'x' + geo.vh);
    ck('★ 一进地图看不到全部场景热点（必须拖）', geo.inView < geo.hotspots, '看得到 ' + geo.inView + '/' + geo.hotspots + ' 个');
  }
  // 所有热点都必须能靠拖动看到（含山顶、珍珠洞窟——没有任何自动送达）
  {
    const reach = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const wrap = document.querySelector('#map-wrap');
      const names = [...document.querySelectorAll('#map-arrows .map-arrow')].map(a => a.dataset.scene || a.dataset.zone || a.textContent.replace(/[●▼]/g,'').trim());
      const seen = new Set();
      // 模拟玩家一路拖到底：纵向分 12 档扫一遍，看每个热点是否至少出现过一次
      const wr = wrap.getBoundingClientRect();
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        const img = document.querySelector('#map-img');
        const ir = img.getBoundingClientRect();
        const maxPan = Math.max(0, (ir.height - wr.height) / 2);
        const target = -maxPan + (2 * maxPan) * (i / steps);
        // 直接派发滚轮，让游戏自己的 setPan 处理
        const evt = new WheelEvent('wheel', { deltaY: (i === 0 ? -99999 : (2 * maxPan) / steps), bubbles: true, cancelable: true });
        wrap.dispatchEvent(evt);
        await w(60);
        const ir2 = document.querySelector('#map-img').getBoundingClientRect();
        document.querySelectorAll('#map-arrows .map-arrow').forEach((a, k) => {
          const r = a.getBoundingClientRect();
          if (r.bottom > wr.top && r.top < wr.bottom) seen.add(names[k]);
        });
      }
      return { total: names.length, seen: seen.size, missing: names.filter(n => !seen.has(n)) };
    })()`);
    console.log('    拖遍全图后能看到 ' + reach.seen + '/' + reach.total + ' 个热点');
    ck('★ 拖着看能把每个热点都看到（没有够不着的）', reach.seen === reach.total, reach.missing.length ? '够不到: ' + reach.missing.join(',') : '全部可达');
  }
  // 热点不许有任何"换朝向/位移"类 class 或行内位移
  {
    const clean = await ev(`(() => {
      const as = [...document.querySelectorAll('#map-arrows .map-arrow')];
      return { below: as.filter(a => a.classList.contains('arrow-below')).length,
               pinned: as.filter(a => a.classList.contains('pinned')).length,
               offscreen: as.filter(a => a.classList.contains('offscreen')).length,
               ml: as.filter(a => (a.style.marginLeft || '') !== '').length,
               transform: as.filter(a => { const t = getComputedStyle(a).transform; return t && t !== 'none' && !/matrix\\(1, 0, 0, 1, -?[\\d.]+, -?[\\d.]+\\)/.test(t); }).length };
    })()`);
    ck('★ 热点没有任何换朝向（arrow-below 全为 0）', clean.below === 0, 'below=' + clean.below);
    ck('热点没有 pinned / offscreen / 行内位移', clean.pinned === 0 && clean.offscreen === 0 && clean.ml === 0,
       'pinned=' + clean.pinned + ' offscreen=' + clean.offscreen + ' ml=' + clean.ml);
  }
  // 顶栏邮箱按钮：必须贴在最右上角，不能被状态条挤出画面
  {
    const probe = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const out = [];
      for (const [vw, vh] of [[2340,1080],[900,420],[740,360],[1280,600]]) {
        // 用 CSS 缩放模拟窄屏：直接把 topbar 宽度限制到 vw
        const tb = document.querySelector('#topbar');
        tb.style.maxWidth = vw + 'px';
        await w(120);
        const r = tb.getBoundingClientRect(), m = document.querySelector('#btn-mail').getBoundingClientRect();
        out.push({ vw, 顶栏宽: Math.round(r.width), 邮箱左: Math.round(m.left), 邮箱右: Math.round(m.right),
                   距右边: Math.round(r.right - m.right), 完整可见: m.right <= r.right + 1 && m.left >= r.left - 1 && m.width > 0 });
      }
      document.querySelector('#topbar').style.maxWidth = '';
      return out;
    })()`);
    (probe || []).forEach(x => console.log('    顶栏' + x.顶栏宽 + 'px: 邮箱 ' + x.邮箱左 + '~' + x.邮箱右 + '，距右边 ' + x.距右边 + 'px，完整可见=' + x.完整可见));
    ck('★ 各种宽度下邮箱按钮都完整贴在顶栏最右（不会被状态条挤出画面）',
       (probe || []).every(x => x.完整可见 && x.距右边 <= 12),
       (probe || []).map(x => x.顶栏宽 + 'px→距右' + x.距右边).join(' '));
  }

  ws.close(); chrome.kill(); await sleepMs(300);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  console.log('');
  console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
  if (bad.length) { console.log('失败项：'); bad.forEach(b => console.log(' - ' + b)); }
  console.log('RESULT:' + (bad.length ? 'FAIL' : 'PASS'));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
