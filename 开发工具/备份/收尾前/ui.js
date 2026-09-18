/* ============================================================
   孤屿遗章 · 界面层
   ============================================================ */
const UI = (() => {
  let view = 'scene';        // scene | map
  let craftTab = 'none';
  // 物品立绘雪碧图（4x4）：{ itemId:[列,行] }，无映射则用汉字字形
  const SPR = { water:1, wood:1, branch:1, thatch:1, flint:1, stone:1, fish:1, berry:1, herb:1, mushroom:1, meat:1, hide:1, resin:1, bamboo:1, clay:1, salt:1, carrot:1, wheat:1, honey:1, wildveg:1, cactusfruit:1, snowlotus:1, leather:1, cloth:1, plank:1, stonebrick:1, ironore:1, ironingot:1, steelingot:1, charcoal:1, silk:1, pearl:1, sinew:1, tusk:1, horn:1, snakegall:1, herbPaste:1, salve:1, blueBull:1, zhangLaoJi:1, antidote:1, vegSoup:1, vegFry:1, meatSoup:1, meatStew:1, roastFish:1, roastMeat:1, jerky:1, smokedFish:1, furCoat:1, grassArmor:1, woodShield:1, ironShield:1, axeStone:1, axeIron:1, pickStone:1, pickIron:1, hoe:1, rod:1, net:1, trap:1, club:1, spear:1, torch:1, rope:1, vine:1, bow:1, arrow:1, eagleArrow:1, ironSword:1, steelSword:1, blackSword:1, ironGreatSword:1, ironDagger:1, knifeStone:1, pickSteel:1, pickBlack:1, axeSteel:1, ironArmor:1, steelArmor:1, blackArmor:1, leatherArmor:1, grassCloth:1, hempCloth:1, leatherCloth:1, supplybox:1, driftbottle:1, namecard:1, beibi:1, coin:1, slate:1, relic:1, dragonbone:1, fossil:1, niter:1, sulfur:1, seasalt:1, gunpowder:1, blackingot:1, mithrilingot:1, spyglass:1, wool:1, felt:1, nail:1, ironpart:1, tile:1, claypot:1, basket:1, seedCarrot:1, seedWheat:1, seedHerb:1, honeyWater:1, tea:1, lotusPill:1, pearlNeck:1, shellAmulet:1, beastFang:1, fiber:1, bambooShoot:1, venom:1, poisonCoat:1, goldore:1, crystal:1, blackiron:1, mithril:1, eaglefeather:1, shipwood:1, sharkfin:1, wolfkingpelt:1, queenSilk:1, pole:1, canvas:1, smokedMeat:1, saltedMeat:1, mushroomSoup:1, tinder:1, steelShield:1, bandage:1, smokeBomb:1, diveSuit:1, diveSuit2:1, diveMask:1, goggles:1, lightWeak:1, lightStrong:1, sourceOre:1, sourceBar:1, deepCoral:1, anctDevice:1, pearlGranule:1, coralArmor:1, sourceArmor:1, coralBlade:1, sourceSpear:1, thruster:1, bpDive:1, bpGunpowder:1, bpFurnace:1, bpShip:1, bpBlack:1, bpLotus:1, rot:1, seachart:1 };
  function itemIcon(id) { const it = ITEMS[id]; if (!(id in SPR)) return `<span class="inv-glyph">${it.glyph}</span>`; return `<img class="item-icon" src="assets/img/items/${id}.png?v=${window.BUILD_VER || 'v1.09'}" alt="" onerror="this.style.display='none'">`; }
  // 牧场与蛋料理的新物品图标（单独挂载，避免改动上面那行长表出错）
  Object.assign(SPR, { hay:1, egg:1, friedEgg:1, bigOmelette:1, superEgg:1, chick:1,
    rareFishA:1, rareFishB:1, rareFishC:1, rareFishD:1, rareFishE:1 });
  let modal = null;          // 当前弹窗渲染函数
  let currentZone = null;

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const S = () => Game.S();

  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // ---------- 绑定 ----------
  Game.bind({
    onLog: (text, cls) => addLog(text, cls),
    onChange: () => render(),
    onFight: (kind, C) => renderCombat(kind, C),
    onEnding: (id, reason) => showEnding(id, reason),
    onOverlay: (cfg) => {
      const k = cfg && cfg.kind;
      if (k === 'atlAnim') { atlantisTravelAnim(() => Game.travel('atlantis')); return; }
      if (['farm','black','town','mission','info','atlTrade'].includes(k)) showModal(k, cfg);
      else showModal('overlay', cfg);
    },
  });

  // ---------- 日志 ----------
  let toastTimer = null;
  // 版本检测：换新包后进来自动提示"已更新"，存档不受影响
  (function(){ try {
    const v = window.BUILD_VER || 'v0';
    const old = localStorage.getItem('guyuyizhang_build');
    if (old && old !== v) setTimeout(() => centerToast('已更新到新版本(' + v + ')，存档保留，欢迎回来！'), 900);
    localStorage.setItem('guyuyizhang_build', v);
  } catch(e){} })();
  function bindPress(el2, onTap, onLong) {
    // 轻点 = 单次交易；长按 460ms = 批量。手机端要点：
    //  · 手指滑动超过 12px（其实是在滚列表）就取消长按，避免误弹批量窗
    //  · 系统打断（pointercancel，比如页面滚动被接管）不触发任何操作
    //  · 按钮禁用 / 置灰时不响应
    let timer = null, firedLong = false, startPt = null;
    const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };
    const dead = () => el2.disabled || el2.classList.contains('lockedb');
    const start = (e) => {
      if (dead()) return;
      firedLong = false; startPt = { x: e.clientX, y: e.clientY };
      clear();
      timer = setTimeout(() => { timer = null; firedLong = true; onLong && onLong(); }, 460);
    };
    const moved = (e) => {
      if (!timer || !startPt) return;
      if (Math.hypot(e.clientX - startPt.x, e.clientY - startPt.y) > 12) clear();
    };
    const end = (e) => {
      const wasLong = firedLong;
      clear();
      const far = startPt && Math.hypot(e.clientX - startPt.x, e.clientY - startPt.y) > 12;
      firedLong = false; startPt = null;
      if (!wasLong && !far && !dead()) onTap && onTap();
    };
    const abort = () => { clear(); firedLong = true; startPt = null; };   // 交给后来真正触发的事件去决定
    el2.addEventListener('pointerdown', start);
    el2.addEventListener('pointermove', moved);
    el2.addEventListener('pointerup', end);
    el2.addEventListener('pointercancel', abort);
    el2.addEventListener('pointerleave', abort);
    el2.addEventListener('contextmenu', e => e.preventDefault());
  }
  function centerToast(text) {
    let t = $('#center-toast');
    if (!t) { t = document.createElement('div'); t.id = 'center-toast'; document.body.appendChild(t); }
    t.textContent = text;
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1000);
  }
  function addLog(text, cls) {
    const box = $('#logbody');
    if (!box) return;
    const d = el('div', 'logline ' + (cls || ''), '');
    const st = Game.S();
    if (st) {
      const t = el('span', 'logtime', `第${st.day}天 ${Game.fmtTime()}`);
      d.appendChild(t);
    }
    d.appendChild(document.createTextNode(text));
    box.appendChild(d);
    while (box.children.length > 80) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
    AudioFX.notify(cls);
  }
  function renderObjective() {
    const o = $('#objective');
    if (!o) return;
    const st = S();
    if (!st || st.scene !== 'camp') { o.innerHTML = ''; return; }   // 只在营地显示当前目标
    const obj = Game.currentObjective();
    o.innerHTML = obj ? `<span class="obj-mark">◈</span> 当前目标：${esc(obj)}` : '';
  }

  // ---------- 主渲染 ----------
  function render() {
    const st = S();
    if (!st) return;
    if (!$('#top-day')) return;   // 游戏主界面尚未挂载（标题/选择画面阶段）
    if (view === 'map' && _lastView !== 'map') mapNeedCenter = true;   // 从场景回地图：对准"当前所在地"
    _lastView = view;
    document.body.classList.toggle('on-map', view === 'map');
    renderTut(st);
    renderTopbar();
    renderObjective();
    if (view === 'map') renderMap();
    else renderScene();
    renderExtras();
    fitStage();   // 面板渲染完再定位（否则首次布局未稳定→按钮/日志错位）
    // 音效环境随场景/昼夜/天气/篝火切换
    const night = Game.isNight();
    const fireBuilt = !!st.buildings.fire;
    if (!lastEnv || lastEnv.scene !== st.scene || lastEnv.night !== night || lastEnv.weather !== st.weather || lastEnv.fire !== fireBuilt) {
      AudioFX.setFire(fireBuilt);
      AudioFX.setEnv(night, st.weather);
      AudioFX.setScene(st.scene, st.scene === 'atlantis' && ['trench', 'abyss', 'sanctum'].includes(st.zone));
      AudioFX.setTension(st.stats.hp / Game.hpMax() < 0.35 ? 1 : 0);
    }
    lastEnv = { scene: st.scene, night, weather: st.weather, fire: fireBuilt };
  }
  let lastEnv = null;

  // ---------- 动作动画（采集/建造/制造/攻击）+ 二倍速 ----------
  let animFast = false;
  let animSpeed = (() => { try { const v = parseInt(localStorage.getItem('guyuyizhang_anim') || '1', 10); return (v >= 1 && v <= 3) ? v : 1; } catch (e) { return 1; } })();
  let restHours = (() => { try { const v = parseInt(localStorage.getItem('guyuyizhang_rest') || '1', 10); return (v >= 1 && v <= 3) ? v : 1; } catch (e) { return 1; } })();   // 休息时长：1→2→3 循环
  let uiBusy = false;
  let prevCampBuilds = new Set();
  let prevMapBuilds = new Set();
  const ANIM_MS = { gather: 3000, build: 3000, craft: 3000, fight: 1000 };
  const ANIM_GLYPH = { gather:'采', build:'建', craft:'制', fight:'战' };
  function showBusy(type, label, imgHint) {
    const b = $('#busy');
    if (!b) return;
    const im = imgHint || (type === 'fight' ? 'sword' : type === 'build' ? 'hammer_icon' : type === 'craft' ? 'pot' : 'axe_icon');
    const calm = (['pot','rest','dive','fish','gather'].includes(im));   // 这些不挥砍、也无刀光
    b.innerHTML = `<div class="busy-box">
      <div class="busy-scene ${type}"><img class="busy-img ${im} ${calm ? 'calm' : ''}" src="assets/img/anim/${im}.png" alt="" onerror="this.style.display='none'"><span class="busy-slash" ${calm ? 'style="display:none"' : ''}></span></div>
      <div class="busy-label">${esc(label)}</div>
      <div class="busy-dots"><i></i><i></i><i></i></div>
    </div>`;
    b.classList.add('open');
    AudioFX.play(type === 'fight' ? 'clash' : type === 'build' || type === 'craft' ? 'build' : 'work');
    clearInterval(b.__chop);
    if (type === 'gather' || type === 'build' || type === 'craft') b.__chop = setInterval(() => AudioFX.play('work'), 720);
  }
  function hideBusy() { const b = $('#busy'); if (b) { clearInterval(b.__chop); b.classList.remove('open'); } }
  function withAnimation(type, label, fn, imgHint) {
    if (uiBusy) return;
    uiBusy = true;
    const dur = Math.round((ANIM_MS[type] || 2500) / animSpeed);
    showBusy(type, label || '动作中…', imgHint);
    setTimeout(() => { hideBusy(); uiBusy = false; fn(); }, dur);
  }

  function renderTopbar() {
    const st = S();
    const w = WEATHER[st.weather].name;
    const se = Game.seasonInfo();
    $('#top-day').textContent = `第 ${st.day} 天`;
    $('#top-time').textContent = Game.fmtTime();
    $('#top-season').textContent = `${se.name}季`;
    $('#top-weather').textContent = `${WEATHER[st.weather].glyph || ''} ${w}`;
    const bars = { hp: st.stats.hp, stamina: st.stats.stamina, hunger: st.stats.hunger, thirst: st.stats.thirst, spirit: st.stats.spirit };
    const mSt = Game.maxStam();
    for (const k in bars) {
      const fill = $(`#bar-${k}`);
      if (fill) fill.style.width = (k === 'stamina' ? (bars[k] / mSt) : k === 'hp' ? (bars[k] / Game.hpMax()) : bars[k] / 100) * 100 + '%';
      const num = $(`#num-${k}`);
      if (num) num.textContent = k === 'hp' ? `${Math.round(bars[k])}/${Game.hpMax()}` : Math.round(bars[k]);
    }
    $('#cap').textContent = `${Game.capUsed()}/${Game.capacity()} 格`;
    const mcnt = $('#mail-count'); if (mcnt) mcnt.textContent = (Game.mailboxCount() > 0 ? Game.mailboxCount() : '');
    // 状态徽标
    const sts = [];
    if (st.statuses.bleed) sts.push('流血');
    if (st.statuses.poison) sts.push('中毒');
    if (st.statuses.cold) sts.push('寒冷');
    if (st.statuses.fear) sts.push('恐惧');
    // 精神低落会压低体力上限（蓝牛的代价就体现在这里）
    if (st.stats.spirit < 20) sts.push('精神恍惚：体力上限-20%、采集耗时+10%');
    else if (st.stats.spirit < 50) sts.push('精神低落：体力上限-10%');
    $('#status-badges').innerHTML = sts.map(s => `<span class="badge danger">${s}</span>`).join('');
  }

  // ---------- 地图视图（带缓存：底图只加载一次，箭头动态刷新） ----------
  let mapBuilt = false;
  let mapPanY = 0;            // 大地图上下平移（像素）
  let mapNeedCenter = false;  // 进入地图时是否自动对准"当前所在地"
  let _lastView = null;
  const MAP_ZOOM = 1.16;      // 地图放大一点，留出上下拖动的余量（部分热点要滑一下才看得到）
  function fitMapArrowsToImage() {
    const img = $('#map-img'), wrap = $('#map-wrap');
    if (!img || !wrap || !img.naturalWidth) return;
    const cw = wrap.clientWidth, ch = wrap.clientHeight;
    // 统一"铺满 + 放大"：宽度顶满（左右不留黑边），纵向留出可拖动余量
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * MAP_ZOOM;
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    const maxPan = Math.max(0, (h - ch) / 2);
    mapPanY = Math.max(-maxPan, Math.min(maxPan, mapPanY));
    const L = (cw - w) / 2, T = (ch - h) / 2 + mapPanY;
    img.style.position = 'absolute';
    img.style.left = L + 'px'; img.style.top = T + 'px';
    img.style.width = w + 'px'; img.style.height = h + 'px';
    img.style.maxWidth = 'none'; img.style.maxHeight = 'none';
    for (const sel of ['#map-arrows', '#map-buildings']) {
      const box = $(sel); if (!box) continue;
      box.style.left = L + 'px'; box.style.top = T + 'px'; box.style.width = w + 'px'; box.style.height = h + 'px';
      box.style.right = 'auto'; box.style.bottom = 'auto';
    }
    fitMapArrowsInView();
  }
  // 把地图的某个纵向百分比位置对到舞台中间（做不到就贴边）
  function centerMapOn(yPct) {
    const img = $('#map-img'), wrap = $('#map-wrap');
    if (!img || !wrap || !img.naturalWidth) return;
    const cw = wrap.clientWidth, ch = wrap.clientHeight;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * MAP_ZOOM;
    const h = img.naturalHeight * s;
    const maxPan = Math.max(0, (h - ch) / 2);
    mapPanY = Math.max(-maxPan, Math.min(maxPan, ch / 2 - h * (yPct || 50) / 100 - (ch - h) / 2));
    fitMapArrowsToImage();
  }
  function bindMapPan() {
    const wrap = $('#map-wrap');
    if (!wrap || wrap.dataset.panBound) return;
    wrap.dataset.panBound = '1';
    let dragging = false, startY = 0, startPan = 0;
    wrap.addEventListener('pointerdown', (e) => {
      if (e.target && e.target.closest && e.target.closest('.map-arrow, .hotspot')) return;   // 按热点不算拖动
      dragging = true; startY = e.clientY; startPan = mapPanY;
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      mapPanY = startPan + (e.clientY - startY);
      fitMapArrowsToImage();
    });
    const stop = () => { dragging = false; };
    wrap.addEventListener('pointerup', stop);
    wrap.addEventListener('pointercancel', stop);
    wrap.addEventListener('pointerleave', stop);
    wrap.addEventListener('wheel', (e) => { e.preventDefault(); mapPanY += e.deltaY; fitMapArrowsToImage(); }, { passive: false });
  }
  // 贴边的箭头会被舞台裁掉（典型的：「↑ 返回孤岛」「珍珠洞窟」在亚克兰蒂斯地图最上面，
  // 箭头默认往上方展开，小屏上正好被顶边切掉一半）。
  // 这里按实际渲染位置逐个修正：顶出上边缘的翻成"箭头在上、标签在下"；顶到左右的往内推。
  function fitMapArrowsInView() {
    const box = $('#map-arrows'), wrap = $('#map-wrap');
    if (!box || !wrap) return;
    const wr = wrap.getBoundingClientRect();
    box.querySelectorAll('.map-arrow').forEach(a => {
      a.classList.remove('arrow-below');
      a.style.transform = '';
      a.style.marginLeft = '';
      let r = a.getBoundingClientRect();
      // 留 6px 余量：字体晚一点加载完也不会刚好被切掉
      if (r.top < wr.top + 6) { a.classList.add('arrow-below'); r = a.getBoundingClientRect(); }
      const dx = Math.max(0, (wr.left + 2) - r.left) - Math.max(0, r.right - (wr.right - 2));
      if (Math.abs(dx) > 0.5) a.style.marginLeft = Math.round(dx) + 'px';
    });
  }
  function renderMap() {
    const st = S();
    const m = $('#main');
    if (!mapBuilt || !$('#map-img')) {
      m.innerHTML = `
        <div id="map-wrap" class="stage">
          <div id="stage-inner">
            <img id="map-img" src="assets/img/map.png" alt="全景地图" draggable="false" loading="lazy">
            <div id="map-buildings"></div>
            <div id="map-arrows"></div>
          </div>
          <div id="map-vignette"></div>
          <div id="weather-overlay"></div>
          <div id="map-caption"></div>
        </div>`;
      const img = $('#map-img');
      if (img) { img.onerror = () => { img.src = PAPER_FALLBACK; }; img.onload = () => { fitStage(); fitMapArrowsToImage(); }; }
      const mnight = Game.isNight(), mdusk = Game.isDusk();
      img.style.filter = mnight ? 'grayscale(1) brightness(0.5) contrast(1.1)' : mdusk ? 'grayscale(1) brightness(0.68) contrast(1.05)' : 'grayscale(1) brightness(0.92) contrast(1.05)';
      mapBuilt = true;
      fitStage();
      bindMapPan();
    }
    const wName = (WEATHER[st.weather] || {}).name || '';
    $('#map-caption').textContent = (st.scene === 'atlantis' ? '亚克兰蒂斯 · 失落文明的版图' : (st.buildings.watch > 0 ? `瞭望台：${BUILDING_CHAINS.watch[st.buildings.watch].name}` : '营地旁的小丘上，还没有瞭望台。')) + ` · ${(WEATHER[st.weather] || {}).glyph || ''}${wName}（可上下拖动地图）`;
    const mwo = $('#weather-overlay');
    if (mwo) mwo.className = st.scene === 'atlantis' ? '' : (st.weather === 'rain' ? 'rain' : st.weather === 'storm' ? 'storm' : st.weather === 'snow' ? 'snow' : st.weather === 'fog' ? 'fog' : '');
    $('#map-vignette').style.opacity = String(Math.max(0, 0.55 - st.buildings.watch * 0.18));
    const mimg = $('#map-img');
    if (mimg) {
      const want = st.scene === 'atlantis' ? 'assets/img/atlantis_map.png' : 'assets/img/map.png';
      if (mimg.dataset.world !== want) { mimg.dataset.world = want; mimg.src = want; }
      mimg.classList.toggle('cover', st.scene === 'atlantis');   // 海底图铺满，孤岛图保持完整显示
      const mn = Game.isNight(), md = Game.isDusk(); mimg.style.filter = (st.scene === 'atlantis') ? 'grayscale(1) brightness(0.92) contrast(1.05)' : (mn ? 'grayscale(1) brightness(0.5) contrast(1.1)' : md ? 'grayscale(1) brightness(0.68) contrast(1.05)' : 'grayscale(1) brightness(0.92) contrast(1.05)');
    }
    fitMapArrowsToImage();
    refreshMapArrows(st);
    if (mapNeedCenter) {
      // 进入地图：把"当前所在地"对到画面中间（海图看当前海域，孤岛图看当前场景）
      const y = (st.scene === 'atlantis')
        ? (((ATLANTIS_MAP_ARROWS[st.zone] || ATLANTIS_MAP_ARROWS.habitat) || {}).y || 50)
        : (((MAP_ARROWS[st.scene] || {}) || {}).y || 50);
      centerMapOn(y);
      mapNeedCenter = false;
    }
    if (st.scene === 'atlantis') { const w = $('#map-buildings'); if (w) w.innerHTML = ''; } else renderBuildings(st);
  }
  // 地图上的建筑精灵：建造了才出现，升级就换更高等级（mix-blend 混合进底图）
  function renderBuildings(st) {
    const wrap = $('#map-buildings');
    if (!wrap) return;
    wrap.innerHTML = '';
    const b = st.buildings;
    const rows = [];
    // 地图上的营地底图已画好帐篷+箱子：只额外叠加 瞭望台/船坞/耕地，避免重复
    if (b.watch >= 1) rows.push({ img:'build/watch' + b.watch, x:44, y:76, w:44, label: BUILDING_CHAINS.watch[b.watch].name });
    if (b.dock >= 1) rows.push({ img:'build/dock', x:70, y:84, w:54, label: BUILDING_CHAINS.dock[b.dock].name });
    // 耕地不在营地/地图上显示田块
    const cur = new Set(rows.map(r => r.img));
    for (const r of rows) {
      const p = el('div', 'build-plate', '');
      p.style.left = r.x + '%'; p.style.top = r.y + '%';
      const isNew = !prevMapBuilds.has(r.img);
      p.innerHTML = `<img class="build-sprite${isNew ? ' build-new' : ''}" style="width:${r.w}px" src="assets/img/${r.img}.png" alt="" draggable="false" onerror="this.style.display='none'"><span class="build-label">${r.label}</span>`;
      wrap.appendChild(p);
    }
    prevMapBuilds = cur;
  }
  // 营地场景：建造后显现的建筑精灵（尺寸按背景实际宽度百分比，随放大一起缩放）
  function renderCampBuildings(st) {
    const wrap = $('#camp-buildings');
    if (!wrap) return;
    const stage = $('#scene-wrap');
    const stageW = stage ? Math.max(600, stage.offsetWidth) : 900;
    wrap.innerHTML = '';
    const b = st.buildings, P = CAMP_BUILD_POS;
    const rows = [];
    // 住处：帐篷→草房→木屋→砖瓦房，升级时旧图自动消失
    const dwImg = ['build/tent', 'build/house', 'build/woodhouse', 'build/brickhouse'][b.house];
    const dwFrac = [0.30, 0.34, 0.37, 0.40][b.house];
    rows.push([dwImg, P.house, Math.round(stageW * dwFrac)]);
    // 篝火→壁炉
    if (b.fire >= 0) rows.push([b.fire >= 2 ? 'build/fireplace' : 'build/fire', P.fire, Math.round(stageW * 0.13)]);
    // 储物箱：小箱子→大木箱→仓库
    let storeImg = 'build/smallbox', storeFrac = 0.13;
    if (b.storage >= 2) { storeImg = 'build/warehouse'; storeFrac = 0.22; }
    else if (b.storage >= 1) { storeImg = 'build/crate'; storeFrac = 0.18; }
    rows.push([storeImg, P.store, Math.round(stageW * storeFrac)]);
    if (b.dock >= 1) rows.push(['build/dock', P.dock, Math.round(stageW * 0.15)]);
    // 耕地不再在营地场景显示田块（改由耕地弹窗管理）
    const cur = new Set(rows.map(r => r[0]));
    for (const [img, pos, w] of rows) {
      const p = el('div', 'build-plate', '');
      p.style.left = pos[0] + '%'; p.style.top = pos[1] + '%';
      const isNew = !prevCampBuilds.has(img);
      p.innerHTML = `<img class="build-sprite${isNew ? ' build-new' : ''}" style="width:${w}px" src="assets/img/${img}.png" alt="" draggable="false" onerror="this.style.display='none'">`;
      wrap.appendChild(p);
    }
    prevCampBuilds = cur;
  }
  // 营地场景：建造后显现的建筑精灵（尺寸按背景实际宽度百分比，随放大一起缩放）
  function refreshMapArrows(st) {
    const wrap = $('#map-arrows');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (st.scene === 'atlantis') {
      const sc = Game.sceneOf('atlantis');
      for (const [zid, pos] of Object.entries(ATLANTIS_MAP_ARROWS)) {
        if (zid === 'home') {
          const ha = el('div', 'map-arrow unlocked', '');
          ha.style.left = pos.x + '%'; ha.style.top = pos.y + '%';
          ha.innerHTML = `<span class="arrow-label">${pos.label}</span><span class="arrow-glyph">▲</span>`;
          ha.onclick = () => showModal('overlay', { title:'返回孤岛', text:'游回海面约 1.5 小时（需潜水服）。', choices:[
            { label:'出发', ok:() => { AudioFX.play('travel'); view = 'scene'; Game.travel('camp'); } },
            { label:'取 消', ok:() => { view = 'map'; render(); } },
          ]});
          wrap.appendChild(ha); continue;
        }
        const z = sc.zones[zid]; if (!z) continue;
        const here = (st.zone === zid);
        const a = el('div', 'map-arrow unlocked' + (here ? ' here' : ''), '');
        a.style.left = pos.x + '%'; a.style.top = pos.y + '%';
        a.innerHTML = `<span class="arrow-label">${pos.label || z.name}</span><span class="arrow-glyph">▼</span>`;
        a.onclick = () => { if (here) { view = 'scene'; render(); return; } startAtlantisTravel(zid); };
        wrap.appendChild(a);
      }
      fitMapArrowsInView();
      return;
    }
    const watch = st.buildings.watch;
    for (const [id, pos] of Object.entries(MAP_ARROWS)) {
      const sc = Game.sceneOf(id);
      const unlocked = Game.sceneUnlocked(id);
      const danger = sc.danger + (Game.isNight() && id !== 'camp' ? 1 : 0);
      const a = el('div', 'map-arrow' + (unlocked ? ' unlocked' : ' locked') + (id === st.scene && view === 'map' ? ' here' : ''), '');
      a.style.left = pos.x + '%';
      a.style.top = pos.y + '%';
      a.innerHTML = `<span class="arrow-label">${sc.name}<span class="arrow-danger">${'●'.repeat(Math.min(5, danger))}</span></span><span class="arrow-glyph">▼</span>`;
      if (unlocked) {
        a.onclick = () => {
          if (id === st.scene) { view = 'scene'; render(); return; }   // 点当前地点 = 进入该场景（从地图回场景）
          const c = Game.travelCost(id);
          showModal('overlay', { title:'前往 ' + sc.name, text:`耗时 ${c.time} 分钟 · 消耗体力 ${c.energy}。`, choices: [
            { label:'前往', ok:() => { AudioFX.play('travel'); startTravel(id); } },
            { label:'取 消', ok:() => {} },
          ]});
        };
      } else {
        a.onclick = () => addLog(`那里还被迷雾笼罩。${sc.unlockWatch > watch ? `需要更高等级的瞭望台。` : ''}${sc.needBoat ? `需要合适的船。` : ''}`, 'warn');
      }
      wrap.appendChild(a);
    }
    fitMapArrowsInView();
  }

  // ---------- 舞台自适应（16:9 完整显示 + 滚轮缩放平移） ----------
  function fitStage() {
    const m = $('#main');
    const stage = $('#scene-wrap') || $('#map-wrap');
    if (!m || !stage) return;
    const w = m.clientWidth, h = m.clientHeight;
    let W = w, H = Math.round(w * 9 / 16);
    if (H > h) { H = h; W = Math.round(h * 16 / 9); }
    stage.style.width = W + 'px';
    stage.style.height = H + 'px';
    // 把日志/返回地图/休息按钮定位到画面左侧/右下角
    const app = $('#app');
    if (!app) return;
    const sr = stage.getBoundingClientRect(), ar = app.getBoundingClientRect();
    const left = sr.left - ar.left, top = sr.top - ar.top;
    // 日志宽度贴合画面左缘（左侧黑边带宽度），高度全栏
    const log = $('#log');
    if (log) { const w = Math.max(150, Math.round(left)); log.style.width = w + 'px'; log.style.left = '0px'; log.style.top = '0px'; log.classList.toggle('overlap', left < 150); }
    const obj = $('#objective');
    if (obj) { obj.style.left = (left + sr.width - Math.min(460, sr.width * 0.5) - 12) + 'px'; obj.style.top = (top + 10) + 'px'; }
  }
  window.addEventListener('resize', () => { fitStage(); fitMapArrowsToImage(); });   // 窗口变化后箭头位置/贴边翻转都要重算

  // ---------- 大地图旅行动画（虚线连线 + 白点匀速移动，到达后落地） ----------
  let traveling = false;
  function atlantisTravelAnim(cb) {
    if (traveling) return;
    traveling = true;
    const l = el('div', 'atl-portal', '<img src="assets/img/anim/atlantis_gate.png" onerror="this.style.display=\'none\'"><div class="atl-portal-text">你穿过传送石，坠入深海的微光……</div>');
    document.body.appendChild(l);
    requestAnimationFrame(() => l.classList.add('show'));
    setTimeout(() => { try { AudioFX.motif('unlock'); } catch (e) {} l.classList.remove('show'); setTimeout(() => { l.remove(); traveling = false; cb && cb(); }, 450); }, 3000);
  }
  function zoneTravelAnim(zid) {
    if (traveling) return;
    const wrap = $('#scene-wrap'); if (!wrap) { Game.setZone(zid); return; }
    traveling = true;
    const layer = el('div', 'travel-layer', '<div class="travel-dot" style="left:50%;top:50%"></div>');
    layer.style.opacity = '0'; wrap.appendChild(layer);
    let p = 0;
    const step = () => {
      p += 0.08; layer.style.opacity = String(Math.min(1, p));
      if (p < 1) requestAnimationFrame(step);
      else { traveling = false; layer.remove(); Game.setZone(zid); }
    };
    requestAnimationFrame(step);
  }
  function startAtlantisTravel(zid) {
    if (traveling) return;
    const st = S();
    const A = ATLANTIS_MAP_ARROWS[st.zone] || ATLANTIS_MAP_ARROWS.habitat;
    const B = ATLANTIS_MAP_ARROWS[zid];
    if (!B) { Game.setZone(zid); return; }
    if (st.zone === zid) { view = 'scene'; render(); return; }
    const d = Math.hypot(A.x - B.x, A.y - B.y);
    const t = Math.max(15, Math.round(d * 2.4));
    const ec = Math.max(5, Math.round(t / 15) * 5);
    if (st.stats.stamina < ec) { addLog('你太累了，游不动了。', 'warn'); view = 'map'; render(); return; }
    showModal('overlay', { title:'前往 ' + (B.label || zid), text:`耗时 ${t} 分钟 · 消耗体力 ${ec}。`, choices:[
      { label:'前往', ok:() => { AudioFX.play('travel'); animAtlantis(A, B, zid); } },
      { label:'取 消', ok:() => { view = 'map'; render(); } },
    ]});
  }
  function animAtlantis(A, B, zid) {
    traveling = true; view = 'map'; render();
    const inner = $('#map-wrap') || $('#map-arrows');
    if (!inner) { traveling = false; view = 'scene'; Game.setZone(zid); return; }
    const W = Math.max(10, inner.clientWidth), H = Math.max(10, inner.clientHeight);
    const box = inner.getBoundingClientRect();
    const near = (e, p) => Math.abs(parseFloat(e.style.left) - p.x) < 0.8 && Math.abs(parseFloat(e.style.top) - p.y) < 0.8;
    const els = Array.from(inner.querySelectorAll('.map-arrow'));
    const ea = els.find(e => near(e, A)), eb = els.find(e => near(e, B));
    let fx, fy, tx, ty;
    if (ea && eb) {
      const ra = ea.getBoundingClientRect(), rb = eb.getBoundingClientRect();
      fx = ra.left - box.left + ra.width / 2; fy = ra.bottom - box.top;
      tx = rb.left - box.left + rb.width / 2; ty = rb.bottom - box.top;
    } else { fx = A.x / 100 * W; fy = A.y / 100 * H; tx = B.x / 100 * W; ty = B.y / 100 * H; }
    const dist = Math.hypot(tx - fx, ty - fy);
    const durMs = Math.round(Math.min(3000, Math.max(500, dist / Math.max(W, 1) * 3000)));
    const layer = el('div', 'travel-layer', '');
    layer.innerHTML = `<svg style="position:absolute;inset:0;width:${W}px;height:${H}px;overflow:visible;pointer-events:none"><line x1="${fx}" y1="${fy}" x2="${tx}" y2="${ty}" stroke="rgba(240,240,234,0.8)" stroke-width="2.5" stroke-dasharray="10 8"/></svg><div class="travel-dot" style="left:${fx}px;top:${fy}px"></div>`;
    inner.appendChild(layer);
    const dot = layer.querySelector('.travel-dot');
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / durMs);
      dot.style.left = (fx + (tx - fx) * p) + 'px'; dot.style.top = (fy + (ty - fy) * p) + 'px';
      if (p < 1) requestAnimationFrame(step);
      else { traveling = false; layer.remove(); view = 'scene'; Game.setZone(zid); }
    };
    requestAnimationFrame(step);
  }
  function startTravel(target) {
    const st2 = S();
    if (traveling) return;
    const chk = Game.canTravel(target);
    if (!chk.ok) { addLog(chk.reason, 'warn'); return; }
    const cost = Game.travelCost(target);
    if (st2.stats.stamina < cost.energy) { addLog('你太累了，走不动这么远。休息一下。', 'warn'); return; }
    if (target === st2.scene) { view = 'scene'; render(); return; }
    traveling = true;
    view = 'map';
    render();
    const inner = $('#map-wrap') || $('#map-arrows');
    if (!inner) { traveling = false; view = 'scene'; Game.travel(target); return; }
    const W = Math.max(10, inner.clientWidth), H = Math.max(10, inner.clientHeight);
    const f = MAP_ARROWS[st2.scene], t = MAP_ARROWS[target];
    const fx = f.x / 100 * W, fy = f.y / 100 * H, tx = t.x / 100 * W, ty = t.y / 100 * H;
    const dist = Math.hypot(tx - fx, ty - fy);
    const durMs = Math.round(Math.min(3000, Math.max(500, dist / Math.max(W, 1) * 3000)));
    const layer = el('div', 'travel-layer', '');
    layer.innerHTML = `<svg style="position:absolute;inset:0;width:${W}px;height:${H}px;overflow:visible;pointer-events:none"><line x1="${fx}" y1="${fy}" x2="${tx}" y2="${ty}" stroke="rgba(240,240,234,0.8)" stroke-width="2.5" stroke-dasharray="10 8"/></svg><div class="travel-dot" style="left:${fx}px;top:${fy}px"></div>`;
    inner.appendChild(layer);
    const dot = layer.querySelector('.travel-dot');
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / durMs);
      dot.style.left = (fx + (tx - fx) * p) + 'px';
      dot.style.top = (fy + (ty - fy) * p) + 'px';
      if (p < 1) requestAnimationFrame(step);
      else { traveling = false; layer.remove(); view = 'scene'; Game.travel(target); }
    };
    requestAnimationFrame(step);
  }

  // ---------- 场景视图（带缓存：同一场景不重建 DOM，避免图片反复解码闪烁） ----------
  let lastSceneKey = null;
  const PAPER_FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#d9d4c4"/><text x="640" y="360" font-size="120" text-anchor="middle" fill="#16150f">▚</text></svg>');
  function renderScene() {
    const st = S();
    const sc = Game.sceneOf(st.scene);
    const zoneKey = sc.zones ? (st.zone || Object.keys(sc.zones)[0]) : '';
    const key = sc.id + '|' + zoneKey;
    const m = $('#main');
    if (key !== lastSceneKey || !$('#scene-img')) {
      let zoneHtml = '';
      if (sc.zones && sc.id !== 'atlantis') {
        zoneHtml = `<div id="zones">` + Object.entries(sc.zones).map(([zid, z]) => {
          const active = (st.zone || Object.keys(sc.zones)[0]) === zid;
          const lock = (zid === 'ruins' && st.buildings.watch < 3);
          return `<button class="zone-btn ${active ? 'active' : ''} ${lock ? 'locked' : ''}" data-zone="${zid}">${z.name}${lock ? ' 🔒' : ''}</button>`;
        }).join('') + `</div>`;
      }
      m.innerHTML = `
        <div id="scene-wrap" class="stage">
          <div id="stage-inner">
            <img id="scene-img" src="${(sc.zones && sc.zones[zoneKey] && sc.zones[zoneKey].img) ? sc.zones[zoneKey].img : sc.img}" alt="${sc.name}" draggable="false" loading="lazy">
            <div id="scene-load"><i>◈</i><span class="load-bar"><i></i></span><div class="load-tip">喜欢的话就打个好评吧~</div></div>
            <div id="hotspots"></div>
            <div id="camp-buildings"></div>
          </div>
          <div id="weather-overlay"></div>
          <div id="scene-actions"></div>
          <div id="scene-vignette"></div>
          <div id="scene-name"></div>
          ${zoneHtml}
        </div>`;
      fitStage();
      const img = $('#scene-img');
      if (img) { img.onerror = () => { img.src = PAPER_FALLBACK; }; img.onload = () => { const hs = $('#hotspots'); if (hs) hs.classList.add('ready'); const sl = $('#scene-load'); if (sl) sl.classList.remove('show'); fitStage(); }; }
      const sl0 = $('#scene-load');
      if (sl0) { sl0.classList.add('show'); if (img && img.complete) sl0.classList.remove('show'); }
      const hs0 = $('#hotspots');
      if (hs0) { hs0.classList.remove('ready'); if (img && img.complete) hs0.classList.add('ready'); }
      const zoneEl = $('#zones');
      if (zoneEl) zoneEl.addEventListener('click', (e) => {
        const b = e.target.closest('.zone-btn');
        if (!b) return;
        if (b.classList.contains('locked')) { addLog('遗迹被海雾锁住，需要三级瞭望台。', 'warn'); return; }
        if (sc.id === 'atlantis') zoneTravelAnim(b.dataset.zone); else Game.setZone(b.dataset.zone);
      });
      lastSceneKey = key;
    }
    // 动态部分：名称（含昼夜符号与危险点）/ 昼夜滤镜 / 天气覆盖 / 营地热点
    const nameEl = $('#scene-name');
    if (nameEl) {
      const phase = Game.isNight() ? '☾' : Game.isDusk() ? '◐' : '☀';
      const sym = ['rain','snow','fog','storm'].includes(st.weather) ? WEATHER[st.weather].glyph : phase;
      const danger = Math.min(5, sc.danger + (Game.isNight() && sc.id !== 'camp' ? 1 : 0));
      nameEl.innerHTML = `${sym} ${esc(sc.name)}${sc.zones ? ' · ' + esc((sc.zones[zoneKey] || {}).name || '') : ''} <span class="name-danger">${'●'.repeat(danger)}</span>`;
    }
    const img = $('#scene-img');
    if (img) {
      const night = Game.isNight();
      const dusk = Game.isDusk();
      img.style.filter = (st.scene === 'atlantis') ? 'grayscale(1) brightness(0.92) contrast(1.05)' : (night ? 'grayscale(1) brightness(0.52) contrast(1.1)' : dusk ? 'grayscale(1) brightness(0.7) contrast(1.05)' : 'grayscale(1) brightness(0.92) contrast(1.05)');
    }
    const wo = $('#weather-overlay');
    if (wo) {
      const cls = st.scene === 'atlantis' ? '' : (st.weather === 'rain' ? 'rain' : st.weather === 'storm' ? 'storm' : st.weather === 'snow' ? 'snow' : st.weather === 'fog' ? 'fog' : '');
      wo.className = cls;
    }
    renderHotspots();
    if (sc.id === 'camp') renderCampBuildings(st);
    if (sc.id === 'atlantis' && (st.zone === 'habitat')) renderAtlantisBuildings(st);
  }
  function renderAtlantisBuildings(st) {
    const wrap = $('#camp-buildings'); if (!wrap) return;
    const stage = $('#scene-wrap'); const stageW = stage ? Math.max(600, stage.offsetWidth) : 900;
    const sz = Math.round(stageW * 0.11);
    const camp = (st.atlantis && st.atlantis.camp && st.atlantis.camp.furniture) || {};
    wrap.innerHTML = '';
    for (const fid in ATLANTIS_BUILD_POS) {
      if (!camp[fid]) continue;
      const p = ATLANTIS_BUILD_POS[fid];
      const d = el('div', 'build-plate', '');
      d.style.left = p.x + '%'; d.style.top = p.y + '%';
      d.innerHTML = `<img src="assets/img/build/${fid}.png" style="width:${sz}px" onerror="this.style.display='none'">`;
      wrap.appendChild(d);
    }
  }
  const ATL_SHOP = [ { id:'deepCoral', base:10 }, { id:'pearlGranule', base:6 }, { id:'sourceBar', base:30 }, { id:'anctDevice', base:120 }, { id:'atlantisCore', base:300 } ];
  // 遗失的交易机 · 售卖的亚特兰蒂斯装备图纸（按阶递增）
  const ATL_BUY = [
    { id:'bpCoralBlade', base:260, kind:'bp' },
    { id:'bpCoralArmor', base:320, kind:'bp' },
    { id:'bpThruster', base:480, kind:'bp' },
    { id:'bpSourceSpear', base:680, kind:'bp' },
    { id:'bpSourceArmor', base:820, kind:'bp' },
  ];
  function repairModal() {
    const st = S();
    const w = st.equipment.weapon;
    let html = '<div class="modal-title">修补台</div><div class="overlay-text">礁石栖息地的修补台：修补潜水装备，也能校准源能手枪。</div><div class="help-list">';
    html += `<div class="help-item"><b>修补潜水装备</b><span>潜水服 / 氧气罩耐久恢复满（耗 深珊瑚×2）</span><button class="mini-btn" data-rfix="dive">修 补</button></div>`;
    html += `<div class="help-item"><b>校准源能手枪</b><span>${(w && ITEMS[w].id === 'pistol') ? '主手已装备手枪（耗 源矿×1）' : '需先把源能手枪装备到主手'}</span><button class="mini-btn" data-rfix="pistol">校 准</button></div>`;
    const bp = Game.invCount('brokenPistol');
    html += `<div class="help-item"><b>修复破损的源能手枪${bp ? `（有${bp}）` : ''}</b><span>耗 源能晶石×1 + 源质锭×1</span><button class="mini-btn" data-rfix="broken">修 复</button></div>`;
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  function atlTradeModal() {
    let html = '<div class="modal-title">遗失的交易机</div><div class="overlay-text">一台还在运转的远古交易机，似乎认得亚克兰蒂斯的东西；它只认贝壳币，也只肯把本地的锻造图纸和神物交给你。</div>';
    html += '<div class="modal-title" style="margin-top:8px">卖出（换贝壳币）</div><div class="help-list">';
    let any = false;
    for (const e of ATL_SHOP) { const q = Game.invCount(e.id); if (q > 0) { any = true; html += `<div class="help-item"><b>${ITEMS[e.id].name}×${q}</b><span>${Game.priceOf(e.base, true, e.id)} 贝壳币 / 个</span><button class="mini-btn" data-asell="${e.id}">卖 1</button></div>`; } }
    if (!any) html += '<div class="hint">你身上没有它认得的东西。</div>';
    html += '</div><div class="modal-title" style="margin-top:8px">购买（装备图纸 · 长按可批量）</div><div class="help-list">';
    for (const e of ATL_BUY) {
      if (Game.hasItem(e.id)) { html += `<div class="help-item"><b>${ITEMS[e.id].name}</b><span>已录入机内，无需再买</span><button class="mini-btn" disabled>已 有</button></div>`; continue; }
      const cost = Game.priceOf(e.base, false, e.id);
      html += `<div class="help-item"><b>${ITEMS[e.id].name}</b><span>${cost} 贝壳币</span><button class="mini-btn" data-abuy="${e.id}">购 买</button></div>`;
    }
    // 神物：每天随机上架一件（深海售卖机）
    const rv = Game.atlVendorInfo();
    html += '</div><div class="modal-title" style="margin-top:8px">神物（每天随机上架一件）</div><div class="help-list">';
    if (!rv.id) html += '<div class="hint">机箱空空如也——你已经把神物收全了。</div>';
    else html += `<div class="help-item"><b>${rv.glyph} ${rv.name}</b><span>${rv.desc}<br>${rv.price} 贝壳币 · 每天只上架一件，买走就售罄</span>${rv.sold
      ? '<button class="mini-btn" disabled>今日已售出</button>'
      : `<button class="mini-btn" data-arelic="1" ${Game.invCount('beibi') >= rv.price ? '' : 'disabled'}>购 买</button>`}</div>`;
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  function atlantisCampModal() {
    const st = S();
    const camp = (st.atlantis && st.atlantis.camp && st.atlantis.camp.furniture) || {};
    let html = `<div class="modal-title">礁石栖息地 · 建造 <span style="font-size:11px">家具位 ${Game.atlantisFurnitureUsed()}/6</span></div><div class="furn-grid">`;
    for (const f of ATLANTIS_FURNITURE) {
      const built = !!camp[f.id];
      if (built) { html += `<div class="furn built">✔ ${f.name}</div>`; continue; }
      const ok = matsOk(f.mats);
      const reason = ok ? '' : missingReason(f.mats, '');
      html += `<div class="furn"><span class="furn-name">${f.name}</span><span class="furn-mats">${matsStr(f.mats)}</span><button class="mini-btn ${ok ? '' : 'lockedb'}" data-afid="${f.id}" ${reason ? `data-reason="${esc(reason)}"` : ''}>建造(${(f.time/60).toFixed(1)}h)</button></div>`;
    }
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  const RUNE_G = ['☀','☾','⛰','≈'];
  let runeStage = 1;
  let runeSeq = [], runeStep = 0, runeMode = 'idle';          // 关1 记忆
  let pairCards = [], pairOpen = [], pairDone = 0;            // 关2 配对
  let lights = [];                                            // 关3 点灯
  function startRunePuzzle() { runeStage = 1; initStage1(); showModal('rune'); }
  function nextStage() { runeStage++; if (runeStage > 3) return finishRune(); if (runeStage === 2) initStage2(); else if (runeStage === 3) initStage3(); showModal('rune'); }
  function finishRune() { runeMode = 'idle'; Game.activatePortal(); addLog('三块石板严丝合缝——传送石轰然亮起！', 'good'); closeModal(); }
  function initStage1() { runeSeq = Array.from({ length: 6 }, () => Math.floor(Math.random() * 4)); runeStep = 0; runeMode = 'idle'; }
  function initStage2() { const g = [0,1,2,3,0,1,2,3]; for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [g[i],g[j]] = [g[j],g[i]]; } pairCards = g; pairOpen = []; pairDone = 0; }
  function toggleLight(i) { const r = Math.floor(i/3), c = i%3; [[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => { const rr = r+dr, cc = c+dc; if (rr>=0&&rr<3&&cc>=0&&cc<3) { const j = rr*3+cc; lights[j] = lights[j] ? 0 : 1; } }); }
  function initStage3() { lights = Array(9).fill(1); for (let k = 0; k < 4; k++) toggleLight(Math.floor(Math.random() * 9)); if (lights.every(v => v)) toggleLight(4); }
  function renderRuneModal() {
    const t = `<div class="modal-title">石板 · ${['第一块 · 记忆','第二块 · 配对','第三块 · 点灯'][runeStage-1]}（${runeStage}/3）</div>`;
    if (runeStage === 1) return t + '<div class="overlay-text">第一块石板：记住符文亮起的顺序（6 步），再照着点回去——点错重来。</div><div id="rune-status" class="overlay-text">准备好了吗……</div><div class="rune-grid">' + RUNE_G.map((g,i) => `<button class="rune-btn" data-rune="${i}">${g}</button>`).join('') + '</div><div class="modal-actions"><button id="rune-replay">再看一遍</button><button id="rune-cancel">取 消</button></div>';
    if (runeStage === 2) return t + '<div class="overlay-text">第二块石板：符文成了两两配对的卡，把它们成对翻开——找回全部 4 对。</div><div id="rune-status" class="overlay-text">翻开两张相同的符文即可消除。</div><div class="pair-grid">' + pairCards.map((v,i) => `<button class="pair-btn" data-pair="${i}"><span class="pair-face">✦</span></button>`).join('') + '</div><div class="modal-actions"><button id="rune-cancel">取 消</button></div>';
    return t + '<div class="overlay-text">第三块石板：点亮全部符文。每点一格，它和上下左右一起翻转。</div><div id="rune-status" class="overlay-text">让九格全亮。</div><div class="light-grid">' + lights.map((v,i) => `<button class="light-btn ${v ? 'on' : ''}" data-light="${i}"></button>`).join('') + '</div><div class="modal-actions"><button id="rune-cancel">取 消</button></div>';
  }
  function playRuneSeq() {
    const m = $('#modal'); if (!m) return;
    const btns = Array.from(m.querySelectorAll('.rune-btn'));
    const status = m.querySelector('#rune-status');
    runeMode = 'showing'; if (status) status.textContent = '看好了……';
    let i = 0;
    const tick = () => {
      if (i >= runeSeq.length) { runeMode = 'input'; runeStep = 0; if (status) status.textContent = '轮到你了：照着顺序点。'; return; }
      const b = btns[runeSeq[i]]; if (b) { b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), 400); }
      i++; setTimeout(tick, 620);
    };
    setTimeout(tick, 450);
  }
  function bindRune() {
    const m = $('#modal'); if (!m) return;
    const cancel = m.querySelector('#rune-cancel'); if (cancel) cancel.onclick = closeModal;
    if (runeStage === 1) {
      m.querySelectorAll('.rune-btn').forEach(b => b.onclick = () => {
        if (runeMode !== 'input') return;
        const i = +b.dataset.rune;
        if (i === runeSeq[runeStep]) {
          runeStep++; b.classList.add('ok'); setTimeout(() => b.classList.remove('ok'), 200);
          if (runeStep >= runeSeq.length) { runeMode = 'idle'; addLog('第一块石板应和了。', 'good'); nextStage(); }
        } else {
          runeMode = 'idle'; runeStep = 0;
          const s = m.querySelector('#rune-status'); if (s) s.textContent = '符文错了……再看一遍。';
          addLog('第一块石板：顺序错了，重来。', 'warn'); setTimeout(playRuneSeq, 600);
        }
      });
      const rp = m.querySelector('#rune-replay'); if (rp) rp.onclick = () => { runeMode = 'idle'; playRuneSeq(); };
      playRuneSeq();
    } else if (runeStage === 2) {
      m.querySelectorAll('[data-pair]').forEach(b => b.onclick = () => {
        const i = +b.dataset.pair;
        if (b.classList.contains('flip') || b.classList.contains('done') || pairOpen.length >= 2) return;
        b.classList.add('flip'); b.querySelector('.pair-face').textContent = RUNE_G[pairCards[i]]; pairOpen.push(i);
        if (pairOpen.length === 2) {
          const [a, bb] = pairOpen;
          if (pairCards[a] === pairCards[bb]) { setTimeout(() => { [a,bb].forEach(k => { const e = m.querySelector(`[data-pair="${k}"]`); e.classList.remove('flip'); e.classList.add('done'); }); pairOpen = []; pairDone++; if (pairDone >= 4) { addLog('第二块石板应和了。', 'good'); nextStage(); } }, 380); }
          else { setTimeout(() => { pairOpen.forEach(k => { const e = m.querySelector(`[data-pair="${k}"]`); e.classList.remove('flip'); e.querySelector('.pair-face').textContent = '?'; }); pairOpen = []; }, 700); }
        }
      });
    } else {
      m.querySelectorAll('[data-light]').forEach(b => b.onclick = () => {
        toggleLight(+b.dataset.light);
        m.querySelectorAll('[data-light]').forEach((e, j) => e.classList.toggle('on', !!lights[j]));
        if (lights.every(v => v)) { addLog('第三块石板应和了。', 'good'); nextStage(); }
      });
    }
  }
  function renderHotspots() {
    const wrap = $('#hotspots');
    if (!wrap) return;
    const st = S();
    const sc = Game.sceneOf(st.scene);
    const zk = st.zone || (sc.zones ? Object.keys(sc.zones)[0] : '');
    let list = sc.id === 'camp' ? CAMP_HOTSPOTS
      : (sc.id === 'atlantis' && zk === 'habitat') ? ATLANTIS_HOTSPOTS
      : (sc.zones && zk && sc.zones[zk] && sc.zones[zk].hotspots && sc.zones[zk].hotspots.length ? sc.zones[zk].hotspots : (SCENE_HOTSPOTS[sc.id] || []));
    list = list.slice();
    if (sc.id === 'atlantis' && zk !== 'habitat') list.push({ id:'map', x:92, y:90, glyph:'▣', label:'大地图' });
    if (sc.id === 'peak' && st.flags.ended_C) { const act = st.atlantis && st.atlantis.stoneActive; list.push({ id: act ? 'portal_go' : 'portal_make', x:88, y:26, glyph:'◈', label: act ? '传送石 · 前往亚克兰蒂斯' : '传送石 · 需解密' }); }
    wrap.innerHTML = '';
    const pts = Game.pointsOf();
    for (const h of list) {
      // 建造后才显现的交互建筑
      if (h.needBuild && st.buildings[h.needBuild] < (h.lvl || 1)) continue;
      if (h.needFurn && !h.needFurn.some(f => st.furniture[f])) continue;
      if (h.needFlag && !st.flags[h.needFlag]) continue;
      const d = el('div', 'hotspot ' + (h.point ? 'point' : ''), '');
      d.style.left = h.x + '%'; d.style.top = h.y + '%';
      let onceTag = '';
      if (h.point) {
        const p = pts.find(q => q.id === h.point);
        if (!p) continue;
        if ((p.once && st.flags['pt_'+p.id]) || (p.firstDays && st.day > p.firstDays) || (p.id === 'grass_horse' && st.flags.horse) || (p.id === 'peak_slate' && st.flags.slateGuardDone) || (p.id === 'grass_wolfden' && st.flags.wolfKingDone)) continue;   // 一次性/已过期/已驯服/已击败 → 整体消失不显示
        if (p) {
          const status = Game.pointStatus(p);
          if (status !== 'ok') { d.classList.add('locked'); d.title = status; }
          if (p.once) onceTag = ' <i class="once-tag">一次性</i>';
        }
      }
      d.innerHTML = `<span class="hot-glyph">${h.glyph || '●'}</span><span class="hot-label">${h.label}${onceTag}</span>`;
      d.onclick = () => {
        if (h.id === 'inv') { AudioFX.play('pickup'); showModal('inv'); }
        else if (h.id === 'map') { AudioFX.play('travel'); view = 'map'; render(); }
        else if (h.id === 'fire') { AudioFX.play('fire'); craftTab = 'fire'; showModal('craft'); }
        else if (h.id === 'craft') { AudioFX.play('pickup'); craftTab = 'work1'; showModal('craft'); }
        else if (h.id === 'furn') { AudioFX.play('pickup'); craftTab = 'furn1'; showModal('craft'); }
        else if (h.id === 'smoke') { AudioFX.play('pickup'); craftTab = 'smoke1'; showModal('craft'); }
        else if (h.id === 'farm') { AudioFX.play('travel'); Game.travel('farm'); }
        else if (h.id === 'camp') { showModal('camp'); }
        else if (h.id === 'sleep') { showModal('sleeppick'); }
        else if (h.id === 'repair') { showModal('repair'); }
        else if (h.id === 'stone') { Game.atlantisTeleport('from'); }
        else if (h.id === 'atlantis') { atlantisTravelAnim(() => Game.atlantisTeleport('to')); }
        else if (h.id === 'portal_make') { if (Game.invCount('slate') >= 3) startRunePuzzle(); else addLog('需要三块石板才能拼出传送石的符文（石板来自洞中遗迹/山顶祭坛/遗迹）。', 'warn'); }
        else if (h.id === 'portal_go') { atlantisTravelAnim(() => Game.atlantisTeleport('to')); }
        else if (h.point) {
          const p = pts.find(q => q.id === h.point);
          if (!p) { addLog('这里现在做不了。', 'warn'); return; }
          const status = Game.pointStatus(p);
          if (status !== 'ok') { addLog(status, 'warn'); centerToast(status); return; }
          const pre = Game.pointReason(p);   // 失败先提示、不播动画
          if (pre) { addLog(pre, 'warn'); centerToast(pre); return; }
          let aT = 'gather', imgHint = 'gather';
          if (p.type === 'hunt') { aT = 'fight'; imgHint = 'sword'; }
          else if (p.type === 'fish') { imgHint = 'fish'; }
          else if (st.scene === 'atlantis') { imgHint = 'dive'; }
          else if (/(tree|bamboo_cut|wood)/.test(p.id)) { imgHint = 'axe_icon'; }
          else if (/(stone|ore|quarry|crystal|pit|iron|niter|sulfur|fossil|clay|copper)/.test(p.id)) { imgHint = 'hammer_icon'; }
          const anim = ['gather','fish','hunt','drift','trap'].includes(p.type) ? { t: aT, l: p.name } : null;
          if (anim) withAnimation(anim.t, anim.l, () => Game.doPoint(p), imgHint); else Game.doPoint(p);
        }
      };
      wrap.appendChild(d);
    }
  }

  // ---------- 行动面板 ----------
  function renderActions() {
    const st = S();
    const box = $('#actions');
    box.innerHTML = '';
    const acts = [];
    if (st.scene === 'camp') acts.push(...campActions());
    else acts.push(...sceneActions());
    // 结局行动（在场景/营地行动下方高亮）
    acts.push(...Game.checkEndingActions().map(a => ({ label:a.name, cls:a.settle ? 'settle' : 'ending', desc:a.desc, fn:() => a.settle ? Game.settleEnding(a.id.replace('settle_','')) : Game.doEnding(a.id) })));
    if (!acts.length) {
      box.innerHTML = '<div class="hint">这里没什么可做的。</div>';
      return;
    }
    for (const a of acts) {
      const b = el('button', 'action-btn ' + (a.cls || ''), '');
      b.innerHTML = `<span class="act-name">${esc(a.label)}</span>${a.desc ? `<span class="act-desc">${esc(a.desc)}</span>` : ''}`;
      if (a.disabled) { b.classList.add('disabled'); b.title = a.reason || ''; }
      b.onclick = () => {
        if (a.disabled) return;
        if (a.anim) withAnimation(a.anim.t, a.anim.l || a.label, a.fn);
        else a.fn();
      };
      box.appendChild(b);
    }
  }

  function renderExtras() {
    const st = S();
    const box = $('#scene-actions');
    if (!box) return;
    box.innerHTML = '';
    const acts = [];
    if (st.scene === 'camp') {
      if (Game.laochaoAvailable()) acts.push({ label:'与老潮交易', cls:'trade', fn:() => showModal('laochao') });
      if (st.furniture.flag && !Game.laochaoAvailable() && !st.laochao.arrived) acts.push({ label:'升起信号旗', fn:() => Game.signalFlag() });
      if (st.buildings.watch === 0) acts.push({ label:'建一级瞭望台', cls:'build', anim:{ t:'build', l:'建造一级瞭望台' }, fn:() => Game.buildChain('watch'), disabled: !matsOk(BUILDING_CHAINS.watch[1].mats), reason:'材料不足' });
      if (st.equipment.weapon) { /* 磨刀/修补/命名：已在「制造→磨刀石」 */ }
    }
    acts.push(...Game.checkEndingActions().map(a => ({ label:a.name, cls:'ending', fn:() => Game.doEnding(a.id) })));
    for (const a of acts) {
      const b = el('button', 'action-btn float ' + (a.cls || ''), '');
      b.innerHTML = `<span class="act-name">${esc(a.label)}</span>`;
      if (a.disabled) b.classList.add('disabled');
      b.onclick = () => { if (a.disabled) { centerToast(a.reason || '条件不足'); return; } if (a.anim) withAnimation(a.anim.t, a.anim.l || a.label, a.fn); else a.fn(); };
      box.appendChild(b);
    }
    box.style.display = acts.length ? '' : 'none';
  }

  function sceneActions() {
    const st = S();
    const sc = Game.sceneOf(st.scene);
    const out = [];
    out.push({ label:`返回地图`, cls:'nav', fn:() => { view = 'map'; render(); AudioFX.play('travel'); } });
    if (sc.id === 'peak' && Game.invCount('slate') >= 3 && Game.hasItem('relic') && Game.hasItem('dragonbone')) {
      // 祭坛仪式在 ending actions 已处理
    }
    for (const p of Game.pointsOf()) {
      const status = Game.pointStatus(p);
      const it = ITEMS;
      let label = p.name;
      if (p.need && p.need.item) label += `（需${it[p.need.item].name}）`;
      if (p.need && p.need.tool) label += `（需${p.need.tier > 1 ? ['','铁','钢','玄铁'][p.need.tier] : ''}${p.need.tool === 'axe' ? '斧' : p.need.tool === 'pick' ? '镐' : '刀'}）`;
      const a = {
        label, fn: () => Game.doPoint(p),
        disabled: status !== 'ok', reason: status,
      };
      const t = p.time ? `耗时${p.time}分钟` : '';
      const daily = p.daily ? `今日余${Math.max(0, p.daily - ((st.pointUses || {})[p.id] || 0))}次` : '';
      a.desc = [`体力-${p.energy || 10}`, t, daily].filter(Boolean).join(' · ');
      if (p.type === 'hunt') { a.cls = 'danger'; if (Game.playerAtk() <= 5) { label += '（赤手空拳，危险！）'; a.label = label; } }
      if (p.type === 'adventure') a.cls = 'adv';
      if (p.type === 'trade') a.cls = 'trade';
      if (['gather','fish','hunt','drift','trap'].includes(p.type)) a.anim = { t: p.type === 'hunt' ? 'fight' : 'gather', l: p.name };
      out.push(a);
    }
    out.push({ label:'休息 ' + restHours + ' 小时', fn:() => Game.rest(restHours), disabled: st.stats.stamina >= Game.maxStam(), reason:'体力充沛' });
    return out;
  }

  function sleepModal() {
    const st = S();
    const wu = st.day >= Game.raidDay();   // 守夜在第一次夜袭那天解锁（简单14/普通12/困难10/传奇7）
    const r = sleepRec();
    const nr = napRec();
    return `<div class="modal-title">睡眠方式</div>
      <div class="modal-actions">
        <button data-sleep="nap">😴 小睡一会 · 2小时<br><small>体力+${nr.sta} · 生命${nr.hp > 0 ? '+' + nr.hp : '不变'} · 精神+${nr.sp}</small></button>
        <button data-sleep="normal">🌙 安稳睡觉 · 8小时<br><small>体力+${r.sta} · 生命${r.hp >= 0 ? '+' : ''}${r.hp} · 精神+${r.sp}</small></button>
        ${wu ? `<button data-sleep="watch">🔥 守夜 · 防备夜袭</button>` : ''}
      </div>`;
  }
  function napRec() {
    const st = S();
    const sq = Game.sleepQuality('nap');
    const penMul = 0.35;
    const sta = Math.round(25 * sq);
    const hungry = st.stats.hunger, thirsty = st.stats.thirst;
    const hungPen = hungry < 20 ? 3 * (100 - hungry) / 10 : 1.5 * (100 - hungry) / 10;
    const thirsPen = thirsty < 20 ? 3 * (100 - thirsty) / 10 : 1.5 * (100 - thirsty) / 10;
    const spiritPen = 2 * Math.floor((100 - st.stats.spirit) / 10);
    const hp = Math.max(0, Math.round(7 * sq) - Math.round(hungPen * penMul) - Math.round(thirsPen * penMul) - Math.round(spiritPen * penMul));
    return { sta, hp, sp: 3 };
  }
  function renderHeirloom() {
    const meta = Game.metaState();
    let html = `<div class="modal-title">◈ 历代遗章 <span style="font-size:12px">魂点 ${meta.soul} · 已传世 ${meta.runs} 世</span></div>
      <div style="font-size:12px;color:#55523f;letter-spacing:0.04em;margin-bottom:8px">每一局结束（死亡/通关）都会化作魂点；魂点可永久点化下面的传承。注：幸存/传奇难度不享受传承加成。</div>
      <div class="help-list">`;
    for (const nd of META_NODES) {
      const lvl = Game.metaNum(nd.id);
      const maxed = lvl >= nd.max;
      const cost = maxed ? 0 : nd.cost[lvl];
      html += `<div class="help-item"><b>${nd.name} ${'✦'.repeat(lvl)}${'☆'.repeat(nd.max - lvl)}</b><span>${nd.desc}</span>
        ${maxed ? `<i style="color:#346">已满级</i>` : `<button class="mini-btn" data-meta-buy="${nd.id}" ${meta.soul < cost ? `data-reason="魂点不足（需 ${cost} 魂点）"` : ''}>升级（${cost} 魂点）</button>`}
      </div>`;
    }
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  function devpwModal() {
    return `<div class="modal-title">开发者模式</div>
      <div style="font-size:13px;color:#55523f;margin-bottom:8px">输入密码，进入开发者模式（测试用）。</div>
      <input id="devpw" type="password" placeholder="密码" autocomplete="off" maxlength="20" style="width:100%;padding:9px 10px;border:2px solid var(--ink);font-size:16px;background:var(--paper);color:var(--ink);box-sizing:border-box">
      <div class="modal-actions"><button id="devpw-ok">进入</button><button id="modal-close">取消</button></div>`;
  }
  function renderBackup() {
    const slots = Game.slotList();
    const bp = Game.backupPoints();
    let html = `<div class="modal-title">备份 · 读档 <span style="font-size:11px">备份点 ${bp}</span></div><div class="modal-actions"><button data-buybp="1">购买备份点（20 魂点）</button></div><div class="help-list">`;
    for (let i = 0; i < 3; i++) {
      const s = slots[i];
      html += `<div class="help-item"><b>槽 ${i + 1}${s ? ` · 第 ${s.day} 天${s.settled ? '（已结算）' : ''}` : '（空）'}</b><span>${s ? '第 ' + s.day + ' 天 · 点击从此继续' : '空槽'}</span>
        <button class="mini-btn" data-bk="${i}">${s ? '覆盖备份' : '备份到此'}</button>${s ? `<button class="mini-btn" data-ld="${i}">从此继续</button>` : ''}${s ? `<button class="mini-btn danger-btn" data-delslot="${i}">删除备份</button>` : ''}</div>`;
    }
    html += `<div class="hint">换设备 / 换网址后如果记录不见了，用「存档码」可以把魂点、成就与全部备份槽搬过去。</div>
      <div class="modal-actions"><button data-codex="export">导出存档码</button><button data-codex="import">导入存档码</button><button id="modal-close">关 闭</button></div>`;
    return html;
  }
  let comTab = 'p1';
  function comHelpModal() {
    const tabs = [['p1','基础规则'],['p2','连攻规则']];
    let html = `<div class="modal-title">战斗规则</div><div class="tabs">${tabs.map(([k,l]) => `<button class="tab ${comTab === k ? 'active' : ''}" data-commtab="${k}">${l}</button>`).join('')}</div><div class="overlay-text">`;
    if (comTab === 'p1') html += '· 主手/副手各持一件单手武器；副手可放武器或盾牌（防御+格挡率）。<br>· 弓先手：装备弓且带箭，开局先射约2次；敌人靠近后：有近战武器则切换近战还手，没有则继续用弓。<br>· 双近战：两把武器轮流使用（伤害取两把平均）；双剑/刀+剑攻速×1.5、双刀×2。<br>· <b>双持的耐久</b>：每次挥砍只磨损「当前挥出的那一把」，主副手每回合各挥一次（攻速快时还会追击连攻），所以一场战斗下来两把都会掉耐久——这是正常磨损，不是同步扣耐久。没装备在身上的同款武器不会掉耐久。<br>· 铁大剑：双手占主手、副手必须为空；伤害高、攻速慢、耐久好、造价昂贵。<br>· 匕首/快武器攻速快但伤害低；剑伤害中等攻速中。';
    else html += '· 攻速差分：每回合「攻速刻度 += 你武器攻速 − 敌人攻速」。<br>· 累计到 +10 → 你这一回合连攻两次；到 −10 → 敌人连攻两次。<br>· 你攻速 − 敌攻速 差越大，你连攻越勤；差为 0 不连攻；差为负则被敌人连攻。<br>· 例：匕首(速15)打野猪(速8)，约每2回合连攻；铁大剑(速6)打雪豹(速18)，雪豹几乎每回合连攻你。';
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  function skillBody() {
    const info = Game.skillInfo();
    return `<div class="skill-grid">${['craft','gather','combat'].map(k => {
      const i = info[k]; const maxed = i.lv >= 5;
      return `<div class="skill-col"><div class="skill-name">${i.name}</div><div class="skill-desc">${i.desc}</div><div class="skill-lv">Lv ${i.lv}${maxed ? '（满）' : ''}</div><div class="skill-exp">经验 ${i.exp}${maxed ? '' : ' / ' + i.ct}</div><div class="skill-bar"><i style="width:${maxed ? 100 : Math.min(100, i.exp / i.ct * 100)}%"></i></div>${maxed ? '<div class="skill-max">已满级</div>' : `<button class="mini-btn" data-skillup="${k}">升级（-${i.ct} 经验）</button>`}</div>`;
    }).join('')}</div>`;
  }
  function skillModal() {
    return `<div class="modal-title">技能 <span style="font-size:11px">制造／采集／战斗 · 消耗经验手动升级</span></div>${skillBody()}<div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
  }
  // 商店清单统一入口：批量弹窗和"确定"结算都用它，避免两处各写一份导致货架对不上
  function shopBuyList(key) {
    const k = String(key || '').split(':')[0];
    if (k === 'BLACK') return BLACKMARKET.sell;
    if (k === 'ATL') return ATL_BUY;
    if (k === 'LAOCHAO') return LAOCHAO.sell;
    if (k === 'informant') return TOWN.informant.sell;
    if (k === 'smith') return TOWN.smith.sell;
    return TOWN.grocer.sell;
  }
  function shopSellList(key) {
    const k = String(key || 'LAOCHAO').split(':')[0];
    if (k === 'TOWN') return TOWN.grocer.buy.concat(TOWN.smith.buy).concat(TOWN.informant.buy);
    if (k === 'BLACK') return BLACKMARKET.buy;
    if (k === 'ATL') return ATL_SHOP;
    return LAOCHAO.buy;
  }
  function batchnModal(cfg) {
    const isBuy = cfg.kind === 'buy';
    const max = isBuy ? Math.max(1, cfg.max || 1) : Math.max(1, Game.invCount(cfg.item));
    const isBp = isBuy && ITEMS[cfg.item].cat === 'bp';
    let priceLine = '';
    if (cfg.kind === 'sell') {
      const ls = shopSellList(cfg.list);
      const en = ls.find(x => x.id === cfg.item);
      if (en) priceLine = `<div class="batch-hint">当前收购价 ${Game.priceOf(en.base, true, cfg.item)} 贝壳 / 个</div>`;
    } else {
      const en = shopBuyList(cfg.shop).find(x => x.id === cfg.item);
      const unit = en ? Game.priceOf(en.base, false, cfg.item) : 0;
      const curName = (en && en.currency === 'coin') ? '金币' : '贝壳';
      cfg._unit = unit;
      priceLine = `<div class="batch-hint">单价 ${unit} ${curName} · 合计 <b id="batchn-total">${unit * max}</b> ${curName}${isBp ? '（图纸只需一份）' : ''}</div>`;
    }
    return `<div class="modal-title">${isBuy ? '批量购买' : (cfg.kind === 'discard' ? '连续丢弃' : '连续售卖')} · ${ITEMS[cfg.item].name} <span style="font-size:11px">拖动数量条</span></div>
      <div class="batch-row"><span>数量</span><input type="range" id="batchn-n" min="1" max="${max}" value="${max}"><span id="batchn-count" class="batch-count">${max}</span></div>
      <div class="batch-row"><span>快捷</span><button class="mini-btn" data-bset="1">1 个</button><button class="mini-btn" data-bset="half">一半</button><button class="mini-btn" data-bset="all">全部（${max}）</button></div>
      <div class="batch-hint">${isBuy ? '最多可买 ' + max + ' 个' : '当前持有 ' + max + ' 个'}</div>
      ${priceLine}
      <div class="modal-actions"><button id="batchn-do">确 定</button><button id="modal-close">取 消</button></div>`;
  }
  function batchModal(cfg) {
    const r = RECIPES.find(x => x.id === cfg.recipe);
    const max = Math.max(1, Math.min(Game.craftMax(r), 99));
    return `<div class="modal-title">批量制作 · ${r.name} <span style="font-size:11px">长按数量条拖动</span></div>
      <div class="batch-row"><span>数量</span><input type="range" id="batch-n" min="1" max="${max}" value="${max}"><span id="batch-count" class="batch-count">${max}</span></div>
      <div class="batch-hint">当前材料最多可做 ${max} 个</div>
      <div class="modal-actions"><button id="batch-do">制 作</button><button id="modal-close">取 消</button></div>`;
  }
  function campActions() {
    const st = S();
    const out = [];
    out.push({ label:'查看全景地图', cls:'nav', fn:() => { view = 'map'; render(); const mw = $('#map-wrap'); if (mw) { mw.classList.remove('map-in'); void mw.offsetWidth; mw.classList.add('map-in'); } AudioFX.play('travel'); } });
    out.push({ label:'睡觉', cls:'sleep', desc: bedDesc(), fn:() => showModal('sleeppick') });
    out.push({ label:'休息 ' + restHours + ' 小时', fn:() => Game.rest(restHours), disabled: st.stats.stamina >= Game.maxStam(), reason:'体力充沛' });
    if (Game.laochaoAvailable()) out.push({ label:'与老潮交易', cls:'trade', desc:'商船停在南岸（22 点前）', fn:() => { laoTab = 'buy'; showModal('laochao'); } });
    if (st.furniture.flag && !Game.laochaoAvailable() && !st.laochao.arrived) out.push({ label:'升起信号旗', desc:'消耗木材×5，商船明日必来', fn:() => Game.signalFlag() });
    if (st.buildings.watch === 0) out.push({ label:'建造一级瞭望台', cls:'build', desc:'木杆×8 · 木板×8 · 藤蔓×4 · 看清草地/荒漠/山洞', anim:{ t:'build', l:'建造一级瞭望台' }, fn:() => Game.buildChain('watch'), disabled: !matsOk(BUILDING_CHAINS.watch[1].mats), reason:'材料不足' });
    return out;
  }
  function sleepRec() {
    const st = S();
    const houseRest = BUILDING_CHAINS.house[st.buildings.house].rest;
    const sq = Game.sleepQuality('normal');
    const sta = Math.round(Math.min(Game.maxStam(), Game.maxStam() * (0.55 + houseRest * 0.2) * sq));
    const hungry = st.stats.hunger, thirsty = st.stats.thirst;
    const hungPen = hungry < 20 ? 3 * (100 - hungry) / 10 : 1.5 * (100 - hungry) / 10;
    const thirsPen = thirsty < 20 ? 3 * (100 - thirsty) / 10 : 1.5 * (100 - thirsty) / 10;
    const spiritPen = 2 * Math.floor((100 - st.stats.spirit) / 10);
    const hp = Math.round(30 * sq) - Math.round(hungPen) - Math.round(thirsPen) - spiritPen;
    const bed = ['bed1','bed2','bed3','bed4'].filter(b => st.furniture[b]).pop();
    const sp = bed ? (FURNITURE.find(x => x.id === bed).spirit || 15) : 15;
    return { sta, hp, sp };
  }
  function bedDesc() { const r = sleepRec(); return `睡 8 小时 · 体力+${r.sta} · 生命${r.hp >= 0 ? '+' : ''}${r.hp} · 精神+${r.sp}`; }
  function matsOk(mats) { for (const k in mats) if (!Game.hasItem(k, mats[k])) return false; return true; }

  // ---------- 营地管理（建造） ----------
  function renderCamp() {
    const st = S();
    showModal('camp');
  }
  function renderCampHelp(mode) {
    let html = `<div class="modal-title">${mode === 'furn' ? '家具作用' : '建筑作用'}</div><div class="help-list">`;
    if (mode === 'furn') {
      const noSlot = ['flag','signpost','shelf','tank'];
    for (const f of FURNITURE) html += `<div class="help-item"><b>${f.name}</b><span>${f.desc}${noSlot.includes(f.id) ? ' <b>（不占家具位）</b>' : ''}</span></div>`;
    } else {
      const bc = {
        house:['住所', c => `睡眠恢复 ${Math.round(c.rest*100)}% · 保暖 ${c.warm} · 家具位 ${c.slots}`],
        fire:['篝火', c => `烹饪炉位 ${c.cook} · 保暖 ${c.warm}`],
        storage:['储物', c => `背包容量 ${c.cap} 格`],
        wall:['围墙', c => `营地防御 ${c.def} · 夜袭率 ${(c.raid*100).toFixed(c.raid<0.01?2:1)}%`],
        watch:['瞭望台', c => c.unlock ? `解锁：${c.unlock.map(u => ((SCENES.find(s=>s.id===u)||{}).name)||u).join('、')}` : '（地基）' + (c.weather12 ? ' · 预判12h天气' : '') + (c.weather24 ? ' · 预判24h天气' : '') + (c.info ? ' · 显示全岛情报' : '')],
        dock:['船坞', c => c.boat === 'none' ? '河边的小码头（未下水）' : (c.boat === 'raft' ? '木筏·近海' : c.boat === 'boat' ? '小船·对岸盐镇' : c.boat === 'ship' ? '大船·载货更多' : c.boat === 'ocean' ? '远洋船·结局A' : '')],
        farm:['耕地', c => `耕地田块 ${c.plots} 块`],
      };
      for (const [cid, [cname, eff]] of Object.entries(bc)) {
        const chain = BUILDING_CHAINS[cid];
        const tiers = chain.map(t => t.name).join(' → ');
        const tip = eff(chain[chain.length - 1]);
        const grow = chain.map(t => eff(t)).join(' ｜ ');
        html += `<div class="help-item"><b>${cname}（${tiers}）</b><span>最高：${tip}</span><div class="help-sub">逐级：${grow}</div></div>`;
      }
    }
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  // 牧场面板：鸡舍 / 羊圈的牲畜、饲料与自动喂食
  function livestockModal(cfg) {
    const kind = (cfg && cfg.kind) || 'pen';
    const i = Game.liveInfo(kind);
    const name = kind === 'pen' ? '羊圈' : '鸡舍';
    let html = `<div class="modal-title">牧场 · ${name} <span style="font-size:11px">${i.count}/${i.cap} 只</span></div><div class="help-list">`;
    html += `<div class="help-item"><b>自动喂食</b><span>每天清晨自动消耗 ${i.feedName}（每只 1 份），并结算羊毛 / 鸡蛋</span><button class="mini-btn" data-livefeed="1">${i.autoFeed ? '已开启 · 关掉' : '已关闭 · 打开'}</button></div>`;
    html += `<div class="help-item"><b>饲料</b><span>${i.feedName} 库存 ×${i.feedHave}${i.autoFeed ? '' : '（自动喂食关闭中）'}</span></div>`;
    if (!i.count) html += `<div class="hint">圈里还空着。</div>`;
    for (const a of i.list) html += `<div class="help-item"><b>${a.label}</b><span>${a.text}</span></div>`;
    if (kind === 'coop') {
      const have = Game.invCount('chick');
      const canAdd = have > 0 && i.count < i.cap;
      html += `<div class="help-item"><b>装填小鸡</b><span>背包里有 ${have} 只（外岛·盐镇杂货商 80 贝壳一只）</span><button class="mini-btn" data-liveadd="1" ${canAdd ? '' : 'disabled'}>放 进 鸡 舍</button></div>`;
    }
    const pend = Game.S().furnPending || {};
    const pendKeys = Object.keys(pend);
    if (pendKeys.length) html += `<div class="help-item"><b>待收</b><span>${pendKeys.map(k => `${ITEMS[k].name}×${pend[k]}`).join('、')}（背包满了，腾出空间后每天自动收下）</span></div>`;
    html += '</div>';
    html += `<div class="overlay-text">${kind === 'pen'
      ? '羊每天吃 1 份干草、产 1 份羊毛；40~60 天后自然寿终，留下 3 份兽肉。干草可以在手工里用茅草晒（5 茅草=2 干草），盐镇杂货商也有卖。<br>想添羊：带上「陷阱」去草地布下，次日再到草地，50% 概率捕到羊羔——选「放回羊圈」就能留下它。'
      : '小鸡连喂 5 天小麦长成母鸡；母鸡每天吃 1 份小麦、下一颗蛋（鸡蛋能存一周），20~30 天后寿终，留下 1 份兽肉。小麦靠耕地种，小鸡在外岛（盐镇的杂货商）买。'}</div>`;
    html += '<div class="modal-actions"><button id="modal-back">返 回</button><button id="modal-close">关 闭</button></div>';
    return html;
  }
  function campModal() {
    if (S().scene === 'atlantis') return atlantisCampModal();
    const st = S();
    const chains = [
      ['house','住所'], ['fire','篝火'], ['storage','储物'], ['wall','围墙'], ['watch','瞭望台'], ['dock','船坞'], ['farm','耕地'],
    ];
    let html = '<div class="modal-title">营地建造 <button class="helpbtn" data-help="build">?</button></div><div class="camp-grid">';
    for (const [cid, cname] of chains) {
      const chain = BUILDING_CHAINS[cid];
      const cur = st.buildings[cid];
      const next = chain[cur + 1];
      let extra = '';
      if (cid === 'house') {
        const hExt = st.houseExt || 0, hMax = Game.houseExtMax();
        if (hExt < hMax) {
          const emats = Game.houseExtMats(hExt + 1);
          const okE = matsOk(emats);
          const rsn = okE ? '' : missingReason(emats, '');
          extra = `<div class="build-next">→ 扩建住处（${hExt + 1}/${hMax}）<span class="mats">${matsStr(emats)}</span><button class="mini-btn ${okE ? '' : 'lockedb'}" data-hsext="1" ${rsn ? `data-reason="${esc(rsn)}"` : ''}>扩建</button></div>`;
        } else {
          extra = '<div class="hint">扩建已达上限</div>';
        }
      }
      if (cid === 'storage') {
        const sExt = st.storeExt || 0, sMax = Game.storeExtMax();
        if (sExt < sMax) {
          const emats = Game.storeExtMats(sExt + 1);
          const okS = matsOk(emats);
          const rsnS = okS ? '' : missingReason(emats, '');
          extra = `<div class="build-next">→ 扩建仓库（${sExt + 1}/${sMax}）<span class="mats">${matsStr(emats)}</span><button class="mini-btn ${okS ? '' : 'lockedb'}" data-stext="1" ${rsnS ? `data-reason="${esc(rsnS)}"` : ''}>扩建（容量+${Game.storeExtCap()}）</button></div>`;
        } else {
          extra = '<div class="hint">扩建已达上限</div>';
        }
      }
      html += `<div class="camp-col"><div class="camp-col-title">${cname}</div>
        <div class="camp-cur">${chain[cur].name}</div>
        ${next ? buildBtn(cid, next) : '<div class="hint">已满级</div>'}${extra}</div>`;
    }
    html += '</div><div class="modal-title" style="margin-top:12px">家具（家具位 ' + furnitureCount() + '/' + ((BUILDING_CHAINS.house[st.buildings.house].slots || 1) + (st.houseExt || 0)) + '） <button class="helpbtn" data-help="furn">?</button></div><div class="furn-grid">';
    const CHAINS = [['wb1','wb2','wb3'],['fr1','fr2','fr3'],['sm1','sm2'],['bed1','bed2','bed3','bed4'],['tank','rainfilter']];
    const superseded = (fid) => { const ch = CHAINS.find(c => c.includes(fid)); if (!ch) return false; const idx = ch.indexOf(fid); for (let j = idx + 1; j < ch.length; j++) if (st.furniture[ch[j]]) return true; return false; };
    for (const f of FURNITURE) {
      if (superseded(f.id)) continue;   // 已被更高一级替代，隐藏
      const built = !!st.furniture[f.id];
      if (built) {
        // 鸡舍 / 羊圈：建好后点名字进牧场面板（看牲畜、装填、开关自动喂食）
        const live = (f.id === 'coop' || f.id === 'pen') ? (() => { const i = Game.liveInfo(f.id); return `（${i.count}/${i.cap}）`; })() : '';
        html += `<div class="furn built">✔ ${(f.id === 'coop' || f.id === 'pen') ? `<button class="mini-btn" data-live="${f.id}">${f.name}${live} 管理</button>` : f.name}<button class="mini-btn demolish" data-demolish="${f.id}">拆除</button></div>`;
        continue;
      }
      const canShow = !f.needPrev || st.furniture[f.needPrev];
      if (!canShow) continue;
      const okF = matsOk(f.mats) && (!f.needBp || Game.hasItem(f.needBp)) && (!f.needCraft || Game.expLevel('craft') >= f.needCraft);
      const reason = okF ? (Game.furnSlotFull(f.id) ? '家具位已满，先升级住所。' : '') : missingReason(f.mats, (f.needBp && !Game.hasItem(f.needBp)) ? `需要图纸：${ITEMS[f.needBp].name}` : ((f.needCraft && Game.expLevel('craft') < f.needCraft) ? `需要制造等级 ${f.needCraft}（当前 ${Game.expLevel('craft')}）` : ''));
      html += `<div class="furn"><span class="furn-name">${f.name}</span><span class="furn-mats">${matsStr(f.mats)}</span>
        <button class="mini-btn ${okF ? '' : 'lockedb'}" data-fid="${f.id}" ${reason ? `data-reason="${esc(reason)}"` : ''}>建造(${(f.time/60).toFixed(1)}h)</button></div>`;
    }
    html += `<div class="hint" style="margin-top:8px">声音：<button class="mini-btn" data-audm="1">音乐：${AudioFX.enabledState() ? '开' : '关'}</button> <button class="mini-btn" data-auda="1">环境音：${AudioFX.ambientState() ? '开' : '关'}</button>（环境音=海浪 / 风 / 鸟虫 / 雨声，音乐不受影响）</div>`;
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  function missingReason(mats, extra) {
    const miss = [];
    for (const k in mats) if (!Game.hasItem(k, mats[k])) miss.push(`${ITEMS[k].name} ${Game.invCount(k)}/${mats[k]}`);
    let s = miss.length ? `材料不足：${miss.join('、')}` : '';
    if (extra) s += (s ? '；' : '') + extra;
    return s;
  }
  function buildBtn(cid, next) {
    const ok = matsOk(next.mats) && (!next.needBp || Game.hasItem(next.needBp));
    const reason = ok ? '' : missingReason(next.mats, (next.needBp && !Game.hasItem(next.needBp)) ? `需要图纸：${ITEMS[next.needBp].name}` : '');
    const extra = next.needBp ? ` · 需${ITEMS[next.needBp].name}` : '';
    return `<div class="build-next">→ ${next.name}<span class="mats">${matsStr(next.mats)}${extra}</span>
      <button class="mini-btn ${ok ? '' : 'lockedb'}" data-chain="${cid}" ${reason ? `data-reason="${esc(reason)}"` : ''}>建造(${(next.time/60).toFixed(1)}h)</button></div>`;
  }
  function matsStr(mats) { return Object.entries(mats).map(([k,v]) => `${ITEMS[k].glyph}${v}`).join(' '); }
  function furnitureCount() { return Game.furnitureUsed(); }

  // ---------- 制造 ----------
  function renderCraft() {
    const st = S();
    const atCamp = st.scene === 'camp';   // 野外只能手工，其他工坊需回营地
    const atAtlantis = st.scene === 'atlantis';
    const tabs = [
      ['none','手工'], ['work1','工作台'], ['furn1','熔炉'], ['smoke1','烟熏炉'],
      ['med','药品'], ['fire','篝火·烹饪'], ['grind','磨刀石'], ['furniture','加工台'],
    ];
    if (atAtlantis) tabs.push(['pearlWork','珠光工作台'], ['sourceForge','源质熔炉']);
    let html = '<div class="modal-title">制 造 <button class="mini-btn" data-crafthelp="1" style="float:right">？长按批量</button></div><div class="tabs">';
    for (const [sid, name] of tabs) {
      const stationOk = atCamp || (atAtlantis && (sid === 'pearlWork' || sid === 'sourceForge'));
      const avail = sid === 'none' || (stationOk && (sid === 'fire' || (sid === 'grind' ? S().furniture.grindstone : stationBuilt(sid))));
      html += `<button class="tab ${craftTab === sid ? 'active' : ''} ${avail ? '' : 'locked'}" data-station="${sid}">${name}${avail ? '' : ' 🔒'}</button>`;
    }
    html += '</div><div class="recipe-list">';
    if (craftTab === 'grind') {
      const w = S().equipment.weapon;
      if (!atCamp) html += '<div class="hint">磨刀石在营地里，回营地才能使用。</div>';
      else if (!S().furniture.grindstone) html += '<div class="hint">请先建造「磨刀石」家具（石头×4+燧石×1）。</div>';
      else if (!w) html += '<div class="hint">请先装备一把武器（主手），才能用磨刀石。</div>';
      else {
        const named = (S().weaponNames || {})[w];
        const [rmat, rqty] = Game.repairMatOf(w);
        const rcost = (rmat === 'stone' || rmat === 'ironingot') ? `${ITEMS[rmat].name}×${rqty}` : `${ITEMS[rmat].name}×${rqty}`;
        html += `<div class="recipe-row"><b>${ITEMS[w].glyph} 磨刀</b><span class="rcost">+3攻击 · 20%流血 · 持续3场（耗 燧石×1）</span><button class="mini-btn" data-grind="sharpen">磨刀</button></div>`;
        html += `<div class="recipe-row"><b>${ITEMS[w].glyph} 修补</b><span class="rcost">${ITEMS[w].name} 耐久恢复满（耗 ${rcost}）</span><button class="mini-btn" data-grind="repair">修补</button></div>`;
        html += `<div class="recipe-row"><b>${ITEMS[w].glyph} 命名</b><span class="rcost">${named ? '已命名（+1生效）· 每把只能一次' : '武器伤害永久+1（耗 命名牌×1）'}</span><button class="mini-btn" data-grind="name">${named ? '已命名' : '命名'}</button></div>`;
      }
    } else if (craftTab !== 'none' && !(atCamp || (atAtlantis && (craftTab === 'pearlWork' || craftTab === 'sourceForge')))) {
      html += '<div class="hint">其他工坊都在营地里，回营地才能使用。</div>';
    } else if (!stationBuilt(craftTab) && craftTab !== 'none' && craftTab !== 'fire') {
      html += `<div class="hint">还没有${tabs.find(t => t[0] === craftTab)[1]}，去营地建造吧。</div>`;
    } else {
      let any = false;
      const list = [];
      for (const r of RECIPES) {
        const stations = stationFamily(craftTab);
        if (!stations.includes(r.station)) continue;
        if (craftTab === 'work1') {
          if (r.station !== 'work1' && r.station !== 'work2' && r.station !== 'work3') continue;
        }
        list.push(r);
      }
      const TOOLFIRST = { r_axestone: 30, r_pickstone: 29, r_knife: 28, r_pole: 27, r_rope: 26, r_stone: 25 };
      list.sort((a,b) => (TOOLFIRST[b.id]||0) - (TOOLFIRST[a.id]||0));
      for (const r of list) {
        any = true;
        const chk = Game.canCraft(r);
        const hasIt = Game.invCount(Object.keys(r.out)[0]) > 0;
        html += `<div class="recipe ${chk.ok ? '' : 'locked'}">
          <div class="recipe-name">${r.name} ${hasIt ? `<span class="owned">×${Game.invCount(Object.keys(r.out)[0])}</span>` : ''}</div>
          <div class="recipe-mats">${Object.entries(r.in).map(([k,v]) => `${ITEMS[k].name} ${Game.invCount(k)}/${v}`).join(' · ')}</div>
          ${r.out.lotusPill ? `<div class="recipe-mats">本局已炼 ${S().lotusMade || 0}/3</div>` : ''}
          <button class="mini-btn ${chk.ok ? '' : 'lockedb'}" data-recipe="${r.id}" ${chk.ok ? '' : `data-reason="${esc(chk.reason)}"`}>制作 ${r.time}分</button>
          ${chk.ok ? '' : `<div class="recipe-lock">${chk.reason}</div>`}
        </div>`;
      }
      if (!any) html += '<div class="hint">这里没有可做的配方。</div>';
    }
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  function stationBuilt(sid) {
    const st = S();
    if (sid === 'pearlWork' || sid === 'sourceForge' || sid === 'repair') return !!(st.atlantis && st.atlantis.camp && st.atlantis.camp.furniture && st.atlantis.camp.furniture[sid]);
    const map = {
      work1: ['wb1','wb2','wb3'], work2: ['wb2','wb3'], work3: ['wb3'],
      furn1: ['fr1','fr2','fr3'], furn2: ['fr2','fr3'], furn3: ['fr3'],
      smoke1: ['sm1','sm2'], smoke2: ['sm2'],
      spin: ['spin'], loom: ['loom'], mortar: ['mortar'], medPot: ['medPot'], rack: ['rack'], tannery: ['tannery'],
      stove: ['stove'], fire: ['fire'], none: ['none'], pot: ['stove'],
      med: ['mortar','medPot','stove'],   // 家具 id：研钵 / 药炉 / 灶台（提神茶在灶台）
      furniture: ['spin','loom','mortar','medPot','pot','stove','rack','tannery'],
    };
    const ids = map[sid] || [];
    return ids.includes('none') || ids.some(id => st.furniture[id]);
  }
  function stationFamily(sid) {
    if (sid === 'none') return ['none'];
    if (sid === 'work1') return ['work1','work2','work3'];
    if (sid === 'furn1') return ['furn1','furn2','furn3'];
    if (sid === 'smoke1') return ['smoke1','smoke2'];
    if (sid === 'fire') return ['fire'];
    if (sid === 'med') return ['mortar','medPot','pot'];   // 药品：草药膏/解毒剂/淬毒剂/不死丹/蓝牛/提神茶
    if (sid === 'furniture') return ['spin','loom','stove','rack','tannery'];
    return [sid];
  }

  // ---------- 背包 ----------
  let invCat = 'all';
  function catOf(cat) {
    if (cat === 'food' || cat === 'drink') return 'food';
    if (cat === 'bp') return 'bp';
    if (cat === 'mat' || cat === 'seed') return 'mat';
    if (cat === 'tool') return 'tool';
    if (cat === 'weapon' || cat === 'armor' || cat === 'cloth') return 'gear';
    if (cat === 'med') return 'med';
    return 'other';
  }
  function renderInventory() {
    const st = S();
    const CATS = [['all','全部'],['food','食物'],['mat','材料'],['tool','工具'],['gear','作战'],['med','药品'],['bp','图纸'],['other','特殊']];
    let ids = Object.keys(st.inv);
    if (invCat === 'tool') ids = ids.filter(id => catOf(ITEMS[id].cat) === 'tool' || !!(ITEMS[id] && ITEMS[id].tool));   // 匕首这类"能当工具使"的也归到工具页
    else if (invCat !== 'all') ids = ids.filter(id => catOf(ITEMS[id].cat) === invCat);
    let html = `<div class="modal-title">背包（${Game.capUsed()}/${Game.capacity()} 格）</div>`;
    html += `<div class="tabs">` + CATS.map(([k, n]) => `<button class="tab ${invCat === k ? 'active' : ''}" data-invcat="${k}">${n}</button>`).join('') + `<button class="tab equip-tab" data-invequip="1">装备</button></div><div class="inv-grid">`;
    if (!ids.length) html += '<div class="hint">这个分类下没有物品。</div>';
    for (const id of ids) {
      const it = ITEMS[id];
      const q = st.inv[id];
      const eq = (st.equipment.weapon === id || st.equipment.weapon2 === id || st.equipment.armor === id || st.equipment.cloth === id || st.equipment.accessory === id) ? ' equiped' : '';
      const dr = Game.durOf(id);
      let bar = '';
      if (dr !== null) bar = `<span class="inv-dur"><i style="width:${Math.round(dr / DURA[id] * 100)}%"></i></span>`;
      else if (it.spoil) { const exp = st.foodExp && st.foodExp[id]; const fr = exp !== undefined ? Math.max(0, Math.min(1, (exp - (st.tick || 0)) / (it.spoil * 60))) : 1; bar = `<span class="inv-dur"><i class="fresh" style="width:${Math.round(fr * 100)}%"></i></span>`; }
      const cur = it.cat === 'currency';   // 货币：固定1格、无边框变色
      const tierCls = cur ? '' : (q > 100 ? ' st-5' : q > 80 ? ' st-4' : q > 60 ? ' st-3' : q > 40 ? ' st-2' : q > 20 ? ' st-1' : '');
      const span = (cur || it.stack === 1) ? 1 : (q > 60 ? 2 : 1);   // 货币/工具装备不跨格；可堆叠仅60+占两格
      if (it.stack === 1 && q > 1) {
        // 不可堆叠（工具/武器/装备）：每件单独占一格，各显示耐久
        for (let i = 0; i < q; i++) {
          const d = Game.durOf(id, i);
          const db = DURA[id] !== undefined ? `<span class="inv-dur"><i style="width:${Math.round((d||0) / DURA[id] * 100)}%"></i></span>` : '';
          html += `<button class="inv-item${eq}" data-item="${id}">${itemIcon(id)}<span class="inv-name">${it.cat === 'weapon' ? Game.wNameOf(id) : it.name}</span>${db}<span class="inv-qty">1</span></button>`;
        }
      } else {
        html += `<button class="inv-item${eq}${tierCls}" data-item="${id}" ${span > 1 ? `style="grid-column:span ${span}"` : ''}>${itemIcon(id)}<span class="inv-name">${it.cat === 'weapon' ? Game.wNameOf(id) : it.name}</span>${bar}<span class="inv-qty">${q}</span></button>`;
      }
    }
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  let equipTab = 'p1';
  function renderEquip() {
    const st = S();
    const tabs = [['p1','装备'],['p2','工具栏'],['p3','神物'],['skill','技能'],['attr','属性']];
    let html = `<div class="modal-title">装备 <button class="mini-btn" data-helprules="1" style="float:right">？战斗规则</button></div><div class="tabs">${tabs.map(([k,l]) => `<button class="tab ${equipTab === k ? 'active' : ''}" data-equiptab="${k}">${l}</button>`).join('')}</div>`;
    if (equipTab === 'p1') {
      const slots = [['weapon','主手'],['weapon2','副手'],['armor','护甲'],['cloth','衣物'],['accessory','饰品']];
      html += '<div class="help-list">';
      for (const [k, n] of slots) {
        const cur = st.equipment[k];
        const _ei = (st.equipIdx && st.equipIdx[k]) || 0;
        const _tds = (cur && st.toolDurs && st.toolDurs[cur]) || [];
        const drr = cur ? Game.durOf(cur, _ei) : null;
        html += `<div class="help-item"><b>${n}</b><span>${cur ? `${ITEMS[cur].glyph} ${ITEMS[cur].cat === 'weapon' ? Game.wNameOf(cur) : ITEMS[cur].name}${ITEMS[cur].atk ? ` · 攻击 ${ITEMS[cur].atk}` : ''}${ITEMS[cur].def ? ` · 防御 ${ITEMS[cur].def}` : ''}${ITEMS[cur].spd ? ` · 攻速 ${ITEMS[cur].spd}` : ''}${ITEMS[cur].block ? ` · 格挡 ${Math.round(ITEMS[cur].block * 100)}%` : ''}${ITEMS[cur].warm ? ` · 保暖 ${ITEMS[cur].warm}` : ''}${ITEMS[cur].twoHand ? ' · 双手' : ''}${drr !== null ? ` · 耐久 ${drr}/${DURA[cur]}` : ''}` : '未装备'}</span>${cur ? `<button class="mini-btn" data-unequip-slot="${k}" style="margin-left:8px">卸下</button>` : ''}</div>`;
      }
      html += '</div><div class="modal-title" style="margin-top:10px">背包中的装备（点击切换）</div><div class="inv-grid">';
      const owned = Object.keys(st.inv).filter(id => ITEMS[id] && ['weapon','armor','cloth','accessory','shield'].includes(ITEMS[id].cat));
      for (const id of owned) {
        const it = ITEMS[id]; const q = st.inv[id] || 1;
        const on = (st.equipment.weapon === id || st.equipment.weapon2 === id || st.equipment.armor === id || st.equipment.cloth === id || st.equipment.accessory === id);
        if (it.stack === 1 && q > 1) {
          const durs = (st.toolDurs && st.toolDurs[id]) || [];
          const eqIdxs = [];
          if (st.equipment.weapon === id) eqIdxs.push((st.equipIdx||{})['weapon'] || 0);
          if (st.equipment.weapon2 === id) eqIdxs.push((st.equipIdx||{})['weapon2'] || 0);
          if (st.equipment.armor === id) eqIdxs.push((st.equipIdx||{})['armor'] || 0);
          if (st.equipment.cloth === id) eqIdxs.push((st.equipIdx||{})['cloth'] || 0);
          if (st.equipment.accessory === id) eqIdxs.push((st.equipIdx||{})['accessory'] || 0);
          for (let i = 0; i < q; i++) { const d = Game.durOf(id, i); const db = DURA[id] !== undefined ? `<span class="inv-dur"><i style="width:${Math.round((d || 0) / DURA[id] * 100)}%"></i></span>` : ''; const on2 = eqIdxs.includes(i); html += `<button class="inv-item${on2 ? ' equiped' : ''}" data-equip="${id}" data-idx="${i}">${itemIcon(id)}<span class="inv-name">${it.cat === 'weapon' ? Game.wNameOf(id) : it.name}</span>${db}${on2 ? '<span class="inv-qty">✓</span>' : ''}</button>`; }
        } else {
          const iDr = Game.durOf(id); const iBar = iDr !== null ? `<span class="inv-dur"><i style="width:${Math.round(iDr / DURA[id] * 100)}%"></i></span>` : '';
          html += `<button class="inv-item${on ? ' equiped' : ''}" data-equip="${id}">${itemIcon(id)}<span class="inv-name">${it.cat === 'weapon' ? Game.wNameOf(id) : it.name}</span>${iBar}${on ? `<span class="inv-qty">✓</span>` : ''}</button>`;
        }
      }
      html += '</div>';
    } else if (equipTab === 'p2') {
      html += '<div class="modal-title" style="margin-top:10px">工具栏（最多3件 · 采集用栏里的工具）</div><div class="relic-slots">';
      const tk = st.toolkit || [null, null, null];
      for (let i = 0; i < 3; i++) { const tid = tk[i]; if (tid) { const d = Game.durOf(tid); const db = DURA[tid] !== undefined ? `<span class="inv-dur"><i style="width:${Math.round((d || 0) / DURA[tid] * 100)}%"></i></span>` : ''; html += `<button class="relic-slot filled" data-toolslot="${i}">${ITEMS[tid].glyph}<small>${ITEMS[tid].name}</small>${db}</button>`; } else html += `<button class="relic-slot empty" data-toolslot="${i}">＋<small>空槽</small></button>`; }
      html += '</div>';
      const tools = Object.keys(st.inv).filter(id => ITEMS[id] && ITEMS[id].tool && !tk.includes(id));
      if (tools.length) {
        html += '<div class="modal-title" style="margin-top:8px">背包里的工具（点击上到工具栏）</div><div class="inv-grid">';
        for (const id of tools) {
          const q = st.inv[id] || 1;
          
          for (let i = 0; i < q; i++) { const d = Game.durOf(id, i); const db = DURA[id] !== undefined ? `<span class="inv-dur"><i style="width:${Math.round((d || 0) / DURA[id] * 100)}%"></i></span>` : ''; html += `<button class="inv-item" data-equiptool="${id}"><span class="inv-glyph">${ITEMS[id].glyph}</span><span class="inv-name">${ITEMS[id].name}</span>${db}<span class="inv-qty">1</span></button>`; }
        }
        html += '</div>';
      }
      else html += '<div class="hint">背包里没有别的工具。</div>';
    } else if (equipTab === 'p3') {
      html += '<div class="modal-title" style="margin-top:10px">神物栏（装备后生效 · 上限3）</div><div class="relic-slots">';
      const equip = st.relicEquip || [null, null, null];
      const rSlots = st.relicSlots || 0;
      for (let i = 0; i < 3; i++) {
        const v = equip[i];
        if (i >= rSlots) html += `<button class="relic-slot locked" data-unlockslot="${i}">🔒<small>${Game.relicSlotCost(i)}金币解锁</small></button>`;
        else if (v) html += `<button class="relic-slot filled" data-unequip="${v}">${RELICS[v].glyph}<small>${RELICS[v].name}</small></button>`;
        else html += `<button class="relic-slot empty" data-emptyslot="1">＋<small>空槽</small></button>`;
      }
      html += '</div>';
      const rOwned = st.relics || [];
      const canEquip = rOwned.filter(r => !equip.includes(r));
      if (canEquip.length) { html += '<div class="modal-title" style="margin-top:8px">已拥有（点击装备）</div><div class="help-list">'; for (const rid of canEquip) html += `<button class="mini-btn" data-equiprelic="${rid}" style="margin:3px">装备 ${RELICS[rid].glyph} ${RELICS[rid].name} · ${RELICS[rid].desc}</button>`; html += '</div>'; }
      else if (!rOwned.length) html += '<div class="hint">尚未获得神物（远古金币换取 / 小概率奇遇）。</div>';
    } else if (equipTab === 'skill') {
      html += '<div class="modal-title" style="margin-top:10px">技能 <span style="font-size:11px">制造／采集／战斗 · 消耗经验手动升级</span></div>' + skillBody();
    } else if (equipTab === 'attr') {
      const st = S();
      const cs = Game.charStats();
      const dw = st.equipment.weapon ? ITEMS[st.equipment.weapon] : null;
      const d2 = st.equipment.weapon2 ? ITEMS[st.equipment.weapon2] : null;
      const wline = (dw ? `${dw.glyph} ${Game.wNameOf(st.equipment.weapon)}` : '未装备') + (d2 && d2.cat !== 'shield' ? ` + ${d2.glyph} ${Game.wNameOf(st.equipment.weapon2)}` : '') + (d2 && d2.cat === 'shield' ? ` + ${d2.glyph} ${d2.name}(盾)` : '');
      html += '<div class="modal-title" style="margin-top:10px">人物属性 <span style="font-size:11px">c（a+b）· a 人物攻击 / b 武器加成 / c 当前攻击</span></div><div class="attr-wrap"><div class="attr-left"><div class="help-list">';
      const row = (k, v) => `<div class="help-item"><b>${k}</b><span>${v}</span></div>`;
      html += row('主手武器', wline);
      html += row('攻击力', `${cs.c}（${cs.a}+${cs.b}）`);
      html += row('防御力', cs.def);
      html += row('攻速', cs.spd);
      html += row('格挡率', cs.block + '%');
      html += row('生命值', `${cs.hp}/${cs.maxhp}`);
      html += row('体力', `${cs.stam}/${cs.maxstam}`);
      const spNow = Math.round(st.stats.spirit);
      const spNote = spNow >= 50 ? '体力上限 100%' : (spNow >= 20 ? '体力上限 -10%' : '体力上限 -20%，采集耗时 +10%');
      html += row('精神', `${spNow}/100（${spNote}）`);
      html += row('护甲', cs.armor);
      html += row('衣物·保暖', cs.cloth + `（暖${st.equipment.cloth && ITEMS[st.equipment.cloth].warm ? ITEMS[st.equipment.cloth].warm : 0}）`);
      html += row('战斗中', `磨刀 ${S().weaponSharpen ? '生效中(剩'+S().weaponSharpen.fights+'场)' : '无'} · 武器命名+${(S().weaponNames && S().weaponNames[st.equipment.weapon] && S().weaponNames[st.equipment.weapon].bonus) || 0}`);
      html += row('水壶', cs.tank ? '已建（口渴消耗-20%）' : '未建');
      html += '</div></div>';
      html += `<div class="attr-right"><img class="attr-portrait" src="assets/img/identities/${st.identity || ''}.png?v=${window.BUILD_VER || '1'}" alt="" onerror="this.style.display='none'"><div class="attr-char">${(IDENTITIES[st.identity] || {}).name || ''}</div></div>`;
      html += '</div>';
    }
    html += '<div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  function itemDetail(id) {
    const st = S();
    const it = ITEMS[id];
    let btns = [];
    if (it.food || it.water || it.cat === 'food' || it.cat === 'drink' || it.curePoison || it.stopBleed) btns.push(`<button data-use="${id}">${it.cat === 'drink' ? '饮用' : (it.curePoison ? '服用' : '食用')}（${it.food ? `+${it.food}饱 ` : ''}${it.water ? `+${it.water}水 ` : ''}${it.heal ? `+${it.heal}命 ` : ''}${it.spirit ? `+${it.spirit}神 ` : ''}${it.sta ? `+${it.sta}体力 ` : ''}${it.curePoison ? '解毒 ' : ''}）</button>`);
    if (it.cat === 'med') {
      const eff = [it.heal ? `+${it.heal}命` : null, it.sta ? `+${it.sta}体力` : null, it.water ? `+${it.water}水` : null,
        it.spirit ? `${it.spirit > 0 ? '+' : ''}${it.spirit}神` : null, it.stopBleed ? '止血' : null, it.curePoison ? '解毒' : null].filter(Boolean).join(' · ');
      btns.push(`<button data-med="${id}">使用${eff ? `（${eff}）` : ''}</button>`);
    }
    if (it.coatPoison) btns.push(`<button disabled>战斗中使用 · 淬毒</button>`);
    if (it.cat === 'weapon' || it.cat === 'armor' || it.cat === 'cloth') btns.push(`<button data-equip="${id}">${(st.equipment.weapon === id || st.equipment.armor === id || st.equipment.cloth === id) ? '已装备' : '装备'}</button>`);
    if (it.cat === 'seed') btns.push(`<button data-plant="${id}">去耕地播种</button>`);
    btns.push(`<button data-discard="${id}" class="danger-btn">丢弃 1 个</button>`);
    // 保鲜：显示真实剩余时间
    let spoilLine = '';
    const durNow = Game.durOf(id);
    if (durNow !== null) {
      const n = st.inv[id] || 1;
      if (n > 1) {   // 同名多件：逐件列出，避免"看起来都在掉"
        const shown = [];
        for (let i = 0; i < Math.min(n, 6); i++) shown.push(Game.durOf(id, i));
        spoilLine = `耐久（${n} 件）：${shown.join(' / ')}${n > 6 ? ' …' : ''} / ${DURA[id]}`;
      } else spoilLine = `耐久：${durNow} / ${DURA[id]}`;
    }
    if (it.spoil) {
      const exp = st.foodExp && st.foodExp[id];
      if (exp !== undefined) {
        const remain = Math.max(0, exp - (st.tick || 0));
        const d = Math.floor(remain / 1440), h = Math.floor((remain % 1440) / 60);
        spoilLine = d > 0 ? `${d} 天 ${h} 小时` : `${h} 小时`;
        spoilLine = `保鲜：还剩 ${spoilLine}`;
      } else {
        spoilLine = `保鲜：${it.spoil / 24} 天`;
      }
    }
    return `<div class="modal-title">${it.glyph} ${it.name} ×${st.inv[id]}</div>
      <div class="item-desc">${it.desc}</div>
      ${spoilLine ? `<div class="item-desc warn-text">${spoilLine}</div>` : ''}
      ${it.atk ? `<div class="item-desc">攻击 ${it.atk}</div>` : ''}
      ${it.def ? `<div class="item-desc">防御 ${it.def}</div>` : ''}
      ${it.warm ? `<div class="item-desc">保暖 ${it.warm}</div>` : ''}
      <div class="modal-actions">${btns.join('')}<button id="modal-back">返 回</button></div>`;
  }

  // ---------- 交易 ----------
  let laoTab = 'buy';
  function laochaoModal() {
    const st = S();
    let html = `<div class="modal-title">老潮的货摊 <span style="font-size:12px">（第${st.day}天，22 点离港）</span></div>
      <div class="trader-row"><img class="trader-img" src="assets/img/laochao.png" onerror="this.style.display='none'" alt="老潮">
      <div class="trader-talk">"带什么来啦？对岸最近什么都缺，好货不愁卖。"</div></div>
      <div class="tabs">
        <button class="tab ${laoTab === 'buy' ? 'active' : ''}" data-ttab="buy">买他的货</button>
        <button class="tab ${laoTab === 'sell' ? 'active' : ''}" data-ttab="sell">卖给他</button>
        <button class="tab ${laoTab === 'comm' ? 'active' : ''}" data-ttab="comm">委托</button>
      </div><div id="trade-body">${laochaoTab(laoTab || 'buy')}</div>
      <div class="trader-row"></div>
      <div class="modal-actions"><button id="modal-close">离 开</button></div>`;
    return html;
  }
  function laochaoTab(tab) {
    const st = S();
    const day = st.day;
    if (tab === 'buy') {
      let html = '';
      if (!st.flags.firstTrade) {
        const have = st.inv.smokedFish || 0;
        html += `<div class="mission"><div class="mission-name">老潮的提议（首单特惠）</div>
          <div class="mission-text">"你这熏鱼不错！十条换你一袋盐、四块铁锭、一包萝卜种子，怎么样？"</div>
          <div class="mission-need">你有熏鱼 ${have}/10</div>
          <button class="mini-btn" data-firsttrade="1" ${have >= 10 ? '' : 'disabled'}>交 换</button></div>`;
      }
      html += '<div class="trade-grid"><div class="trade-col"><b>货物</b></div><div class="trade-col"><b>价（贝壳）</b></div><div class="trade-col"><b>买</b></div></div>';
      html += '<div class="hint">长按「购买」可以批量买入。</div>';
      for (const e of LAOCHAO.sell) {
        if (e.from > day) continue;
        const p = Game.priceOf(e.base, false, e.id);
        const cur = e.currency || 'beibi';
        const curName = cur === 'coin' ? '金币' : '贝壳';
        const afford = st.inv[cur] >= p;
        html += `<div class="trade-grid">
          <div class="trade-col">${ITEMS[e.id].glyph} ${ITEMS[e.id].name}${e.kind === 'bp' && Game.invCount(e.id) > 0 ? '（已有）' : ''}</div>
          <div class="trade-col">${p} ${curName}</div>
          <div class="trade-col"><button class="mini-btn" data-buy="${e.id}" data-currency="${cur}" ${afford && !(e.kind === 'bp' && Game.invCount(e.id) > 0) ? '' : 'disabled'}>购买</button></div>
        </div>`;
      }
      return html;
    }
    if (tab === 'sell') {
      let html = '<div class="trade-grid"><div class="trade-col"><b>他收</b></div><div class="trade-col"><b>收购价</b></div><div class="trade-col"><b>卖</b></div></div>';
      html += '<div class="hint">商人一律按行情八折收。长按「卖出」可批量卖，卖多少都不会再压价。</div>';
      for (const e of LAOCHAO.buy) {
        const p = Game.priceOf(e.base, true, e.id);
        const have = st.inv[e.id] || 0;
        html += `<div class="trade-grid">
          <div class="trade-col">${ITEMS[e.id].glyph} ${ITEMS[e.id].name}（有 ${have}）</div>
          <div class="trade-col">${p} 贝壳</div>
          <div class="trade-col"><button class="mini-btn" data-sell="${e.id}" ${have > 0 ? '' : 'disabled'}>卖出</button></div>
        </div>`;
      }
      const coinN = st.inv.coin || 0;
      if (coinN > 0) html += `<div class="trade-grid">
        <div class="trade-col">币 金币兑贝壳</div>
        <div class="trade-col">1 金币 → 30 贝壳</div>
        <div class="trade-col"><button class="mini-btn" data-excoin="1">兑换</button></div>
      </div>`;
      return html;
    }
    if (tab === 'comm') {
      let html = '';
      for (const c of LAOCHAO.commissions) {
        if (c.from > day) continue;
        const done = st.laochao.done[c.id];
        const accepted = st.laochao.accepted && st.laochao.accepted[c.id];
        const inWin = accepted !== undefined && st.day >= accepted && st.day <= accepted + 2;
        const needStr = c.type === 'kill' ? `击败 ${ENEMIES[c.target].name}` : Object.entries(c.need).map(([k,v]) => `${ITEMS[k].name} ${st.inv[k] || 0}/${v}`).join('、');
        const rewardStr = Object.entries(c.reward).map(([k,v]) => k === 'fame' ? `声望+${v}` : `${ITEMS[k].name}×${v}`).join('、');
        html += `<div class="mission ${done ? 'done' : ''}">
          <div class="mission-name">${c.name} ${done ? '✔' : ''}</div>
          <div class="mission-text">${c.text}</div>
          <div class="mission-need">需求：${needStr}</div>
          <div class="mission-reward">报酬：${rewardStr}</div>
          ${done ? '' : c.type === 'kill' && accepted === undefined ? `<button class="mini-btn" data-acceptc="${c.id}">接取（持续3天）</button>` : c.type === 'kill' && !inWin ? `<button class="mini-btn" data-acceptc="${c.id}">重新接取（持续3天）</button>` : `<button class="mini-btn" data-comm="${c.id}">交任务</button>`}
        </div>`;
      }
      return html || '<div class="hint">暂无委托。</div>';
    }
    return '';
  }

  function townModal() {
    const st = S();
    const fame = st.fame;
    let html = `<div class="modal-title">盐镇集市 <span style="font-size:12px">（声望 ${'★'.repeat(fame)}${'☆'.repeat(3-fame)}）</span></div>
      <div class="tabs">
        <button class="tab active" data-shop="grocer">杂货商</button>
        <button class="tab ${fame >= 1 ? '' : 'locked'}" data-shop="smith">铁匠${fame >= 1 ? '' : ' 🔒'}</button>
        <button class="tab ${fame >= 2 ? '' : 'locked'}" data-shop="informant">情报贩子${fame >= 2 ? '' : ' 🔒'}</button>
      </div><div id="trade-body">${townShop('grocer')}</div>
      <div class="modal-actions"><button id="modal-close">离 开</button></div>`;
    return html;
  }
  function townShop(shop) {
    const st = S();
    const sh = TOWN[shop];
    if (!sh) return '';
    if (sh.needFame > st.fame) return `<div class="hint">需要盐镇声望 ${sh.needFame}。</div>`;
    let html = `<div class="trader-talk">${sh.name}的摊位。</div><div class="trade-grid"><div class="trade-col"><b>货</b></div><div class="trade-col"><b>价</b></div><div class="trade-col"><b>买</b></div></div>`;
    html += '<div class="hint">长按「买」/「卖」可以批量交易。</div>';
    for (const e of sh.sell) {
      if (e.kind === 'bp' && Game.invCount(e.id) > 0) continue;
      const p = Game.priceOf(e.base, false, e.id);
      const cur = e.currency || 'beibi';
      const curName = cur === 'coin' ? '金币' : '贝壳';
      html += `<div class="trade-grid"><div class="trade-col">${ITEMS[e.id].glyph} ${ITEMS[e.id].name}</div><div class="trade-col">${p} ${curName}</div>
        <div class="trade-col"><button class="mini-btn" data-tbuy="${shop}:${e.id}" ${(st.inv[cur] || 0) >= p ? '' : 'disabled'}>买</button></div></div>`;
    }
    html += `<div class="trade-grid" style="margin-top:10px"><div class="trade-col"><b>他收</b></div><div class="trade-col"><b>价</b></div><div class="trade-col"><b>卖</b></div></div>`;
    html += '<div class="hint">商人一律按行情八折收。长按「卖」可批量卖，卖多少都不会再压价。</div>';
    for (const e of sh.buy) {
      const p = Game.priceOf(e.base, true, e.id);
      html += `<div class="trade-grid"><div class="trade-col">${ITEMS[e.id].glyph} ${ITEMS[e.id].name}（有 ${st.inv[e.id] || 0}）</div><div class="trade-col">${p} 贝壳</div>
        <div class="trade-col"><button class="mini-btn" data-tsell="${e.id}" ${(st.inv[e.id] || 0) > 0 ? '' : 'disabled'}>卖</button></div></div>`;
    }
    return html;
  }

  function blackModal() {
    const st = S();
    let html = `<div class="modal-title">黑市 · 独眼 <span style="font-size:12px">（来路不明，货不退款）</span></div>
      <div class="trader-talk">"嘘。好东西只卖给夜里来的客人。玄铁图纸四百，别还价——盐镇那帮正经商人不碰这玩意儿。"</div>
      <div class="trade-grid"><div class="trade-col"><b>货</b></div><div class="trade-col"><b>价</b></div><div class="trade-col"><b>买</b></div></div>`;
    html += '<div class="hint">长按「买」/「卖」可以批量交易。</div>';
    for (const e of BLACKMARKET.sell) {
      if (e.kind === 'bp' && Game.invCount(e.id) > 0) continue;
      const p = Game.priceOf(e.base, false, e.id);
      html += `<div class="trade-grid"><div class="trade-col">${ITEMS[e.id].glyph} ${ITEMS[e.id].name}</div><div class="trade-col">${p} 贝壳</div>
        <div class="trade-col"><button class="mini-btn" data-bbuy="${e.id}" ${(st.inv.beibi || 0) >= p ? '' : 'disabled'}>买</button></div></div>`;
    }
    html += `<div class="trade-grid" style="margin-top:10px"><div class="trade-col"><b>他收</b></div><div class="trade-col"><b>价</b></div><div class="trade-col"><b>卖</b></div></div>`;
    html += '<div class="hint">一律按行情八折收；长按「卖」可批量卖。</div>';
    for (const e of BLACKMARKET.buy) {
      const p = Game.priceOf(e.base, true, e.id);
      html += `<div class="trade-grid"><div class="trade-col">${ITEMS[e.id].glyph} ${ITEMS[e.id].name}（有 ${st.inv[e.id] || 0}）</div><div class="trade-col">${p} 贝壳</div>
        <div class="trade-col"><button class="mini-btn" data-bsell="${e.id}" ${(st.inv[e.id] || 0) > 0 ? '' : 'disabled'}>卖</button></div></div>`;
    }
    html += `<div class="modal-actions"><button id="modal-close">离 开</button></div>`;
    return html;
  }

  function missionModal() {
    const st = S();
    let html = `<div class="modal-title">告示板（老潮也代收委托）</div>`;
    for (const c of LAOCHAO.commissions) {
      if (c.from > st.day) continue;
      const done = st.laochao.done[c.id];
      const needStr = c.type === 'kill' ? `击败 ${ENEMIES[c.target].name}` : Object.entries(c.need).map(([k,v]) => `${ITEMS[k].name} ${st.inv[k] || 0}/${v}`).join('、');
      const rewardStr = Object.entries(c.reward).map(([k,v]) => k === 'fame' ? `声望+${v}` : `${ITEMS[k].name}×${v}`).join('、');
      html += `<div class="mission ${done ? 'done' : ''}"><div class="mission-name">${c.name} ${done ? '✔' : ''}</div><div class="mission-text">${c.text}</div>
        <div class="mission-need">需求：${needStr}</div><div class="mission-reward">报酬：${rewardStr}</div>
        ${done ? '' : `<button class="mini-btn" data-comm="${c.id}">交任务</button>`}</div>`;
    }
    html += `<div class="modal-actions"><button id="modal-close">离 开</button></div>`;
    return html;
  }

  function infoModal() {
    const st = S();
    if (st.fame < 2) return `<div class="modal-title">酒馆</div>
      <div class="hint">情报贩子只跟有门路的人说话（需要盐镇声望 2，你现在是 ${st.fame}/3）。</div>
      <div class="hint">声望来自告示板的委托：兽皮订单（第 8 天）、珍珠委托（第 14 天）、剿灭海盗（第 20 天）、古生物收藏（第 22 天）。</div>
      <div class="modal-actions"><button id="modal-close">离 开</button></div>`;
    let html = `<div class="modal-title">酒馆 · 情报贩子</div>
      <div class="trader-talk">"回家的海图，一百五十金币。远洋船、还有下海那套装备的图纸，我这儿都有。玄铁那种脏东西？去沉船湾找独眼。"</div>
      <div class="trade-grid"><div class="trade-col"><b>情报</b></div><div class="trade-col"><b>价</b></div><div class="trade-col"><b>买</b></div></div>`;
    for (const e of TOWN.informant.sell) {
      if (e.kind === 'bp' && Game.invCount(e.id) > 0) continue;
      const p = Game.priceOf(e.base, false, e.id);
      const cur = e.currency || 'beibi';
      html += `<div class="trade-grid"><div class="trade-col">${ITEMS[e.id].name}${e.id === 'seachart' ? '（结局·归乡关键）' : ''}</div><div class="trade-col">${p} ${cur === 'coin' ? '金币' : '贝壳'}</div>
        <div class="trade-col"><button class="mini-btn" data-tbuy="informant:${e.id}" ${(st.inv[cur] || 0) >= p ? '' : 'disabled'}>买</button></div></div>`;
    }
    html += `<div class="hint">海图：能开往亚克兰蒂斯（需配潜水服与氧气罩），也是「结局·归乡」的必需品——远洋船 + 海图 + 3 箱补给。</div>`;
    html += `<div class="hint">金币从哪来？对岸遗迹的石门守卫、海域的海盗与海盗头目、山顶的石碑守卫都会掉；也可以用贝壳币跟老潮换些日用品周转。</div>`;
    html += `<div class="trader-talk warn-text">"听说……集齐三块石板，能读懂这座岛的过去。"</div>`;
    html += `<div class="modal-actions"><button id="modal-close">离 开</button></div>`;
    return html;
  }

  // ---------- 战斗 ----------
  function renderCombat(kind, C) {
    const m = $('#modal');
    if (kind === 'start') {
      const en = C.enemy;
      if (en && en.boss) try{ AudioFX.setBoss(true); }catch(e){}   // Boss战激昂音乐
      m.classList.add('open');
      m.innerHTML = `<div class="modal-content combat-modal">
        <div class="modal-title">⚔ 遭遇了${en.name}${en.boss ? ' <span class="badge danger">BOSS</span>' : ''}</div>
        ${en.img ? `<img class="enemy-img" src="${en.img}" onerror="this.style.display='none'" alt="${en.name}">` : `<div class="enemy-seal"><span>${esc(en.name[0])}</span></div>`}
        <div class="enemy-line">${esc(en.desc)}</div>
        <div class="hp-line"><span>你</span><div class="hp-bar"><div id="php" class="hp-fill me" style="width:100%"></div></div><span id="php-txt"></span></div>
        <div id="fight-targets"></div>
        <div id="fight-log" class="fight-log"></div>
        <div id="fight-btns" class="fight-btns"></div>
      </div>`;
      updateCombat(C);
      return;
    }
    if (kind === 'update') { updateCombat(C); return; }
    if (kind === 'end') { try{ AudioFX.setBoss(false); }catch(e){} const fb = $('#fight-btns'); if (fb) fb.classList.add('over');   // 结束：关Boss音乐+禁用攻击
      setTimeout(() => { try{ AudioFX.play(cfg ? 'good' : 'danger'); }catch(e){} m.classList.remove('open'); m.innerHTML = ''; render(); }, 1000); return; }   // 日志关闭时再响战斗结束音
  }
  let mailTab = 'mail';
  let PENDING_ACT = null;
  function mailboxModal() {
    const tabs = [['mail','邮箱'],['code','兑换码'],['event','活动']];
    const mbox = Game.mailboxList();
    let inner = '';
    if (mailTab === 'mail') {
      inner = mbox.length ? mbox.map(x => `<div class="help-item"><b>${x.item ? `${ITEMS[x.item].glyph} ${ITEMS[x.item].name}×${x.qty}` : `魂点 ×${x.soul}`}</b><span>来自官方邮件</span><button class="mini-btn" data-claimmail="${x.i}">领取</button></div>`).join('') : '<div class="hint">邮箱是空的。（兑换码/官方发放会送到这里）</div>';
    } else if (mailTab === 'code') {
      inner = `<div class="overlay-text">输入官方兑换码，领取魂点或道具（每人每个码可用一次）。</div><div class="batch-row"><span>兑换码</span><input id="redeem-code" style="flex:1" maxlength="24" placeholder="输入兑换码"></div><div class="modal-actions"><button id="redeem-do">兑 换</button></div>`;
    } else {
      inner = `<div class="overlay-text"><b>【命名武器】限时活动</b><br>兑换码 <code>QQ1014679931</code> 可兑换 1 张「命名牌」——在营地「磨刀石」里为你的武器「命名」，伤害永久+1。<br><br>官方码 <code>GUYU2026</code> 可兑换 50 魂点。<br><br><b>【神殿核心补偿】</b>若你曾遇到「深殿核心点位被守卫怪顶掉、核心拿不到」的问题，可在兑换码页输入 <code>CORE4</code> 领取 <b>深殿核心×4</b>（每人限一次，通过邮箱发放）。<br><br><b>有bug可以进群找群主或者在论坛里反馈，作者会第一时间听见并修改和补偿！</b><br><br><b>进入QQ群：1014679931 解锁更多玩法和福利～</b></div>`;
    }
    return `<div class="modal-title">邮箱 · 兑换 · 活动</div><div class="tabs">${tabs.map(([k,l]) => `<button class="tab ${mailTab===k?'active':''}" data-mailtab="${k}">${l}</button>`).join('')}</div><div class="overlay-text">内</div>`.replace('<div class="overlay-text">内</div>', `<div>${inner}</div>`) + `<div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
  }
  function updateCombat(C) {
    if (!$('#php')) return;
    const en = C.enemy;
    const tgBox = $('#fight-targets');
    if (tgBox) {
      tgBox.innerHTML = (C.enemies || []).map((e, i) => {
        const maxH = e.emax || 20;
        const pct = Math.max(0, Math.min(100, e.ehp / maxH * 100));
        return `<div class="hp-line target ${e.isBoss ? 'boss-line' : ''}" data-ti="${i}"><span class="tg-name">${esc(e.name)}${e.isBoss ? ' <b class="badge danger">BOSS</b>' : ''}</span><div class="hp-bar"><div class="hp-fill ${e.isBoss ? 'boss' : ''}" style="width:${pct}%"></div></div><span class="tg-hp">${Math.max(0, Math.round(e.ehp))}/${Math.round(maxH)}</span></div>`;
      }).join('');
      if (PENDING_ACT) tgBox.classList.add('selecting');
    }
    $('#php').style.width = Math.max(0, Math.min(100, Game.S().stats.hp / Game.hpMax() * 100)) + '%';
    $('#php-txt').textContent = `${Game.S().stats.hp}/${Game.hpMax()}`;
    const logBox = $('#fight-log');
    logBox.innerHTML = C.log.map(l => `<div class="fline">${esc(l)}</div>`).join('') + (PENDING_ACT ? '<div class="fline sel-line">—— 点击血条选择你要攻击的目标 ——</div>' : '');
    logBox.scrollTop = logBox.scrollHeight;
    const btns = $('#fight-btns');
    const canHeavy = Game.combatLv() >= 2;
    const w = Game.S().equipment.weapon;
    // 远程按钮：主/副手任意一把远程武器 + 它有弹药就能射（手枪吃源能子弹，弓吃箭矢/鹰羽箭）
    const rwId = [Game.S().equipment.weapon, Game.S().equipment.weapon2].find(id => id && ITEMS[id] && ITEMS[id].ranged);
    const rw = rwId ? ITEMS[rwId] : null;
    const ammoName = rw
      ? (rw.ammoItem
          ? (Game.invCount(rw.ammoItem) > 0 ? ITEMS[rw.ammoItem].name : '')
          : (Game.invCount('eagleArrow') > 0 ? '鹰羽箭' : (Game.invCount('arrow') > 0 ? '箭矢' : '')))
      : '';
    const ranged = !!rw && !!ammoName;
    const canThrow = w && ITEMS[w].throw && !C.thrown;
    const itemsLeft = Math.max(0, 2 - (C.usedItems || 0));   // 每场战斗最多 2 次道具
    btns.innerHTML = `
      <button data-fact="attack">攻击</button>
      ${canThrow ? '<button data-fact="throw" title="每场一次，威力1.6倍">投掷</button>' : ''}
      ${ranged ? `<button data-fact="ranged">射击（${ammoName}）</button>` : ''}
      <button data-fact="heavy" ${canHeavy ? '' : 'disabled'} title="${canHeavy ? '' : '战斗经验 Lv2 解锁'}">重击</button>
      <button data-fact="defend">防御</button>
      <button data-fact="item" ${itemsLeft > 0 ? '' : 'disabled'} title="每场战斗最多用 2 次道具">道具${itemsLeft > 0 ? `（${itemsLeft}）` : '（已用完）'}</button>
      <button data-fact="flee">逃跑</button>`;
    btns.querySelectorAll('button').forEach(b => b.onclick = () => {
      const f = b.dataset.fact;
    if (f === 'item') { showMedPicker(); return; }
      if (f === 'attack' || f === 'heavy' || f === 'ranged' || f === 'throw') {
        const lv = (C.enemies || []).filter(e => e.ehp > 0).length;
        if (lv <= 1) { withAnimation('fight', '战斗', () => Game.fightAction(f)); return; }   // 单个敌人：直接攻击
        PENDING_ACT = f; if (tgBox) tgBox.classList.add('selecting'); updateCombat(C); return;   // 多敌：选目标
      }
      withAnimation('fight', '战斗', () => Game.fightAction(f));
    });
    if (tgBox) tgBox.querySelectorAll('.target').forEach(el => el.onclick = () => {
      const ti = +el.dataset.ti;
      if (!PENDING_ACT) { addLog('先点 攻击/重击/射击，再点目标。', 'warn'); return; }
      const a = PENDING_ACT; PENDING_ACT = null; tgBox.classList.remove('selecting');
      withAnimation('fight', '战斗', () => Game.fightAction(a, ti));
    });
  }
  function showMedPicker() {
    const C = S().combat;
    const left = Math.max(0, 2 - ((C && C.usedItems) || 0));
    if (left <= 0) { addLog('本场战斗的道具次数已经用完了（每场最多 2 次）。', 'warn'); return; }
    // 药品（cat=med）自动进列表，新做的药不用再手改这个数组
    const pri = ['salve','herbPaste','bandage','antidote','blueBull','zhangLaoJi','tea','lotusPill','smokeBomb','poisonCoat'];
    const meds = Object.keys(ITEMS)
      .filter(id => (ITEMS[id].cat === 'med' || id === 'smokeBomb' || id === 'poisonCoat') && Game.invCount(id) > 0)
      .sort((a, b) => ((pri.indexOf(a) + 1) || 99) - ((pri.indexOf(b) + 1) || 99));
    if (!meds.length) { addLog('背包里没有能在战斗中使用的道具。', 'warn'); return; }
    showModal('medpick', { meds, left });
  }

  // ---------- 弹窗系统 ----------
  function showModal(kind, cfg) {
    const m = $('#modal');
    const wasOpen = m.classList.contains('open');
    const prevScroll = wasOpen ? Array.from(m.querySelectorAll('.modal-content, .recipe-list, #trade-body')).map(el => el.scrollTop) : [];
    modal = { kind, cfg };
    let html = '';
    if (kind === 'camp') html = campModal();
    else if (kind === 'livestock') html = livestockModal(cfg);
    else if (kind === 'camphelp') html = renderCampHelp((cfg && cfg.mode) || 'build');
    else if (kind === 'craft') html = renderCraft();
    else if (kind === 'inv') html = renderInventory();
    else if (kind === 'laochao') html = laochaoModal();
    else if (kind === 'mailbox') html = mailboxModal();
    else if (kind === 'naming') html = `<div class="modal-title">为武器命名 <span style="font-size:11px">${Game.S().weaponNames && Game.S().weaponNames[Game.S().equipment.weapon] ? '已命名' : '消耗 1 命名牌 · 伤害永久+1 · 最多8字'}</span></div><div class="overlay-text">你的主手武器：${Game.S().equipment.weapon ? `「${Game.wNameOf(Game.S().equipment.weapon)}」` : '未装备'}</div><div class="batch-row"><span>名字</span><input id="name-input" style="flex:1" maxlength="8" placeholder="输入武器名"></div><div class="modal-actions"><button id="name-do">确 定</button><button id="modal-close">取 消</button></div>`;
    else if (kind === 'grind') html = `<div class="modal-title">磨刀石 <span style="font-size:11px">${Game.S().furniture.grindstone ? '· 作用于当前主手武器' : '· 需先建造磨刀石家具'}</span></div><div class="overlay-text">${Game.S().furniture.grindstone ? '磨刀：+3攻击 · 20%流血 · 持续3场（耗 燧石×1）<br>修补：主手武器耐久恢复满（耗 石头×2）<br>命名：武器伤害永久+1（耗 命名牌×1）' : '请先在营地·家具建造「磨刀石」石台（石头×4+燧石×1）。'}</div><div class="modal-actions"><button data-grind="sharpen">磨 刀</button><button data-grind="repair">修 补</button><button data-grind="name">命 名</button><button id="modal-close">关 闭</button></div>`;
    else if (kind === 'town') html = townModal();
    else if (kind === 'black') html = blackModal();
    else if (kind === 'mission') html = missionModal();
    else if (kind === 'info') html = infoModal();
    else if (kind === 'farm') html = farmModal();
    else if (kind === 'diary') html = diaryModal();
    else if (kind === 'collection') html = collectionModal();
    else if (kind === 'rune') html = renderRuneModal();
    else if (kind === 'atlTrade') html = atlTradeModal();
    else if (kind === 'repair') html = repairModal();
    else if (kind === 'savemenu') html = `<div class="modal-title">菜单</div><div class="modal-actions save-menu"><button data-savemenu="diary">📖 日记</button><button data-savemenu="col">📜 图鉴</button><button data-savemenu="save">💾 保存进度</button><button data-savemenu="backup">📦 备份·读档</button><button data-savemenu="title">🏠 回到主菜单</button><button data-savemenu="restart" class="danger-btn">🔄 重新开始</button><button data-savemenu="close">关 闭</button></div>`;
    else if (kind === 'sleeppick') html = sleepModal();
    else if (kind === 'heirloom') html = renderHeirloom();
    else if (kind === 'equip') html = renderEquip();
    else if (kind === 'backup') html = renderBackup();
    else if (kind === 'skill') html = skillModal();
    else if (kind === 'batch') html = batchModal(cfg);
    else if (kind === 'batchn') html = batchnModal(cfg);
    else if (kind === 'comhelp') html = comHelpModal();
    else if (kind === 'crafthelp') html = `<div class="modal-title">制造说明</div><div class="overlay-text">· 制造工坊在营地里，回营地才能使用。<br>· 点配方 = 制作1个。<br>· <b>长按配方按钮</b> 弹出批量条，拖动数量从1到「当前材料最多可做数量」，一次做完多个。<br>· 批量时按数量×单个耗时（造越多耗时越长），经验也×N。<br>· 火堆·烹饪，以及各工坊（工作台/熔炉/烟熏炉/灶台/晾肉架/制革架/纺车…）按你建了哪些来。</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
    else if (kind === 'buybp') html = `<div class="modal-title">购买备份点</div><div class="overlay-text">是否用 20 魂点购买一个备份点？</div><div class="modal-actions"><button data-buybp-yes="1">是</button><button data-buybp-no="1">否</button></div>`;
    else if (kind === 'codex') {
      html = cfg && cfg.mode === 'export'
        ? `<div class="modal-title">导出存档码</div><div class="overlay-text">把下面这串文字整段复制保存（微信收藏、备忘录都行）。换设备或换网址后，用「导入存档码」粘贴回来，魂点、成就、图鉴进度和三个备份槽都会回来。</div>
           <textarea id="codex-text" readonly style="width:100%;height:120px;font-size:11px;line-height:1.4;padding:8px;box-sizing:border-box;background:var(--paper);color:var(--ink);border:2px solid var(--ink)">${esc(cfg.code || '')}</textarea>
           <div class="modal-actions"><button id="codex-copy">复 制</button><button id="modal-close">关 闭</button></div>`
        : `<div class="modal-title">导入存档码</div><div class="overlay-text">把之前导出的存档码整段粘贴进来。导入会覆盖当前的魂点/成就/备份槽，建议先导出一次当前进度。</div>
           <textarea id="codex-text" placeholder="在这里粘贴存档码" style="width:100%;height:120px;font-size:11px;line-height:1.4;padding:8px;box-sizing:border-box;background:var(--paper);color:var(--ink);border:2px solid var(--ink)"></textarea>
           <div class="modal-actions"><button id="codex-do">导 入</button><button id="modal-close">取 消</button></div>`;
    }
    else if (kind === 'devpw') html = devpwModal();
    else if (kind === 'overlay') {
      html = `<div class="modal-title">${esc(cfg.title || '')}</div><div class="overlay-text">${esc(cfg.text || '').replace(/\n/g, '<br>')}</div><div class="modal-actions">${(cfg.choices || []).map((c, i) => `<button data-choice="${i}"><span class="choice-label">${esc(c.label)}</span>${c.hint ? `<span class="choice-hint">${esc(c.hint)}</span>` : ''}</button>`).join('')}</div>`;
    }
    else if (kind === 'medpick') {
      const leftNow = Math.max(0, 2 - ((Game.S().combat && Game.S().combat.usedItems) || 0));
      html = `<div class="modal-title">使用道具 <span style="font-size:11px">本场还能用 ${leftNow} 次</span></div><div class="modal-actions">${cfg.meds.map(md => `<button data-med-id="${md}">${ITEMS[md].glyph} ${ITEMS[md].name}（有${Game.invCount(md)}）</button>`).join('')}<button id="modal-back">返 回</button></div>`;
    }
    m.innerHTML = `<div class="modal-content">${html}</div>`;
    const mcx = m.querySelector('.modal-content');
    mcx.insertAdjacentHTML('afterbegin', '<button class="modal-x" aria-label="关闭">×</button>');
    mcx.querySelector('.modal-x').onclick = closeModal;
    m.classList.add('open');
    if (wasOpen) { requestAnimationFrame(() => { Array.from(m.querySelectorAll('.modal-content, .recipe-list, #trade-body')).forEach((el, i) => { if (prevScroll[i] !== undefined) el.scrollTop = prevScroll[i]; }); }); }
    if (kind === 'rune') bindRune();
    bindModal(kind, cfg);
  }
  function bindModal(kind, cfg) {
    const m = $('#modal');
    m.querySelectorAll('#modal-close').forEach(b => b.onclick = closeModal);
    m.querySelectorAll('#modal-back').forEach(b => b.onclick = () => { if (kind === 'medpick') renderCombat('start', Game.S().combat); else if (modal && modal.kind) showModal(modal.kind, modal.cfg); });
    m.querySelectorAll('[data-chain]').forEach(b => b.onclick = () => { if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; } withAnimation('build', '建造', () => { Game.buildChain(b.dataset.chain); showModal('camp'); }); });
    m.querySelectorAll('[data-fid]').forEach(b => b.onclick = () => { if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; } withAnimation('build', '打造家具', () => { Game.buildFurniture(b.dataset.fid); showModal('camp'); }); });
    m.querySelectorAll('[data-live]').forEach(b => b.onclick = () => { AudioFX.play('pickup'); showModal('livestock', { kind: b.dataset.live }); });
    m.querySelectorAll('[data-audm]').forEach(b => b.onclick = () => { AudioFX.toggle(); showModal('camp'); });
    m.querySelectorAll('[data-auda]').forEach(b => b.onclick = () => { AudioFX.toggleAmbient(); showModal('camp'); });
    m.querySelectorAll('[data-livefeed]').forEach(b => b.onclick = () => { Game.toggleAutoFeed(); showModal('livestock', modal && modal.cfg); });
    m.querySelectorAll('[data-liveadd]').forEach(b => b.onclick = () => { const r = Game.addChick(); if (!r.ok) addLog(r.reason, 'warn'); showModal('livestock', modal && modal.cfg); });
    m.querySelectorAll('[data-hsext]').forEach(b => b.onclick = () => { if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; } const r = Game.buildHouseExt(); if (!r.ok) addLog(r.reason, 'warn'); showModal('camp'); });
    m.querySelectorAll('[data-stext]').forEach(b => b.onclick = () => { if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; } const r = Game.buildStoreExt(); if (!r.ok) addLog(r.reason, 'warn'); showModal('camp'); });
    m.querySelectorAll('[data-afid]').forEach(b => b.onclick = () => { if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; } const r = Game.buildAtlantisFurniture(b.dataset.afid); if (!r.ok) addLog(r.reason, 'warn'); showModal('camp'); });
    m.querySelectorAll('[data-asell]').forEach(b => { const id = b.dataset.asell; const doTap = () => { Game.sellToMerchant(id, 1, ATL_SHOP, false); showModal('atlTrade'); }; const doLong = () => showModal('batchn', { kind:'sell', item:id, list:'ATL' }); b.onclick = null; bindPress(b, doTap, doLong); });
    m.querySelectorAll('[data-rfix]').forEach(b => b.onclick = () => { const k = b.dataset.rfix; if (k === 'dive') { const r = Game.repairDive(); if (!r.ok) addLog(r.reason, 'warn'); } else if (k === 'pistol') { Game.repairPistol(); } else { Game.fixBrokenPistol(); } showModal('repair'); });
    m.querySelectorAll('[data-arelic]').forEach(b => b.onclick = () => { const r = Game.buyRelicFromVendor(); if (!r.ok) addLog(r.reason, 'warn'); showModal('atlTrade'); });
    m.querySelectorAll('[data-abuy]').forEach(b => { const entry = ATL_BUY.find(e => e.id === b.dataset.abuy); const list = entry ? [entry] : []; const doTap = () => { Game.buyFromMerchant(b.dataset.abuy, 1, list, false); showModal('atlTrade'); }; const doLong = () => { const unit = Game.priceOf(entry ? entry.base : 0, false, b.dataset.abuy); const isBp = ITEMS[b.dataset.abuy].cat === 'bp'; const mx = isBp ? 1 : Math.max(1, Math.min(99, Math.floor(Game.invCount('beibi') / Math.max(1, unit)))); showModal('batchn', { kind:'buy', item:b.dataset.abuy, shop:'ATL', max:mx }); }; b.onclick = null; bindPress(b, doTap, doLong); });
    m.querySelectorAll('[data-help]').forEach(b => b.onclick = () => { showModal('camphelp', { mode: b.dataset.help }); });
    m.querySelectorAll('[data-invcat]').forEach(b => b.onclick = () => { invCat = b.dataset.invcat; showModal('inv'); });
    m.querySelectorAll('[data-invequip]').forEach(b => b.onclick = () => showModal('equip'));
    m.querySelectorAll('[data-invback]').forEach(b => b.onclick = () => showModal('inv'));
    m.querySelectorAll('[data-equip]').forEach(b => b.onclick = () => { const id = b.dataset.equip; const cat = ITEMS[id].cat; const idx = b.dataset.idx !== undefined ? +b.dataset.idx : undefined; if (cat === 'weapon') { const eq = S().equipment; const ei = S().equipIdx||{}; const SL = ['weapon','weapon2','armor','cloth','accessory']; const slotWith = idx !== undefined ? SL.find(s => eq[s]===id && ei[s]===idx) : SL.find(s => eq[s]===id); if (slotWith) Game.unequip(id, idx); else Game.equip(id, idx); } else { const eq = S().equipment; const on = (eq.weapon===id||eq.weapon2===id||eq.armor===id||eq.cloth===id||eq.accessory===id); if (on) Game.unequip(id); else Game.equip(id, idx); } rerenderEquip(); });
    m.querySelectorAll('[data-buyrelic]').forEach(b => b.onclick = () => { if (Game.invCount('coin') >= 30) { Game.removeItem('coin', 30); Game.gainRandomRelic(); showModal('laochao'); } });
    m.querySelectorAll('[data-unlockslot]').forEach(b => b.onclick = () => { const r = Game.unlockRelicSlot(); if (!r.ok) addLog(r.reason, 'warn'); showModal('equip'); });
    m.querySelectorAll('[data-unequip]').forEach(b => b.onclick = () => { Game.unequipRelic(b.dataset.unequip); showModal('equip'); });
    m.querySelectorAll('[data-equiprelic]').forEach(b => b.onclick = () => { const r = Game.equipRelic(b.dataset.equiprelic); if (!r.ok) addLog(r.reason, 'warn'); rerenderEquip(); });
    m.querySelectorAll('[data-toolslot]').forEach(b => b.onclick = () => { const tk = (Game.S().toolkit || []); const id = tk[+b.dataset.toolslot]; if (id) { Game.unequipTool(id); showModal('equip'); } });
    m.querySelectorAll('[data-equiptool]').forEach(b => b.onclick = () => { const r = Game.equipTool(b.dataset.equiptool); if (!r.ok) addLog(r.reason, 'warn'); rerenderEquip(); });
    m.querySelectorAll('[data-emptyslot]').forEach(b => b.onclick = () => addLog('请从下方已拥有的神物中点击装备。', 'warn'));
    m.querySelectorAll('[data-bk]').forEach(b => b.onclick = () => { const r = Game.backupSlot(+b.dataset.bk); if (r.ok) { addLog(`已备份到备份槽 ${+b.dataset.bk + 1}（第 ${r.day} 天）。`, 'good'); centerToast(`已备份到槽 ${+b.dataset.bk + 1}`); } else { addLog(r.reason, 'warn'); centerToast(r.reason); } showModal('backup'); });
    m.querySelectorAll('[data-delslot]').forEach(b => b.onclick = () => { const r = Game.delSlot(+b.dataset.delslot); addLog(r.ok ? `已删除备份槽 ${+b.dataset.delslot + 1}。` : r.reason, r.ok ? 'good' : 'warn'); centerToast(r.ok ? `已删除槽 ${+b.dataset.delslot + 1}` : r.reason); showModal('backup'); });
    m.querySelectorAll('[data-ld]').forEach(b => b.onclick = () => { const r = Game.loadSlot(+b.dataset.ld); if (r.ok) { closeModal(); begin(); } else addLog(r.reason, 'warn'); });
    m.querySelectorAll('[data-buybp]').forEach(b => b.onclick = () => { const r = Game.buyBackupPoint(); if (r.ok) { addLog('购买了 1 个备份点。', 'good'); } else addLog(r.reason, 'warn'); showModal('backup'); });
    m.querySelectorAll('[data-codex]').forEach(b => b.onclick = () => showModal('codex', { mode: b.dataset.codex, code: b.dataset.codex === 'export' ? Game.exportCode() : '' }));
    const ccopy = m.querySelector('#codex-copy'); if (ccopy) ccopy.onclick = () => { const t = m.querySelector('#codex-text'); try { t.select(); document.execCommand('copy'); centerToast('已复制，快去粘贴保存吧'); } catch (e) { centerToast('复制失败，请长按文本框手动复制'); } };
    const cdo = m.querySelector('#codex-do'); if (cdo) cdo.onclick = () => { const t = m.querySelector('#codex-text'); const r = Game.importCode(t ? t.value : ''); if (r.ok) { centerToast(`导入成功：魂点 ${r.soul}、传世 ${r.runs} 世、备份槽 ${r.slots} 个`); closeModal(); showModal('backup'); } else { centerToast(r.reason); } };
    m.querySelectorAll('[data-titlebuybp]').forEach(b => b.onclick = () => showModal('buybp'));
    m.querySelectorAll('[data-buybp-yes]').forEach(b => b.onclick = () => { const r = Game.buyBackupPoint(); addLog(r.ok ? '购买了 1 个备份点。' : r.reason, r.ok ? 'good' : 'warn'); closeModal(); if ($('#select-screen') && $('.select-title') && $('#select-screen .identity-list').children.length) showJourneySelect(); });
    m.querySelectorAll('[data-buybp-no]').forEach(b => b.onclick = closeModal);
    m.querySelectorAll('[data-demolish]').forEach(b => b.onclick = () => { Game.demolishFurniture(b.dataset.demolish); showModal('camp'); });
    m.querySelectorAll('[data-savemenu]').forEach(b => b.onclick = () => {
      const v = b.dataset.savemenu;
      if (v === 'save') { Game.save(); addLog('已存档。', 'sys'); showModal('savemenu'); }
      else if (v === 'diary') showModal('diary');
      else if (v === 'col') showModal('collection');
      else if (v === 'skill') showModal('skill');
      else if (v === 'backup') showModal('backup');
      else if (v === 'title') { Game.save(); closeModal(); showTitle(); }
      else if (v === 'restart') { if (confirm('确定重新开始？当前进度将被覆盖。')) { closeModal(); showIdentity(); } }
      else closeModal();
    });
    m.querySelectorAll('[data-sleep]').forEach(b => b.onclick = () => { const k = b.dataset.sleep; closeModal(); Game.sleep(k); });
    m.querySelectorAll('[data-meta-buy]').forEach(b => b.onclick = () => {
      if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; }
      const nd = META_NODES.find(n => n.id === b.dataset.metaBuy);
      const r = Game.metaBuy(b.dataset.metaBuy);
      if (!r.ok) addLog(r.reason, 'warn');
      else { addLog(`${nd.name} 升至 Lv${r.level}！`, 'good'); AudioFX.play('good'); }
      showModal('heirloom');
    });
    const dp = $('#devpw'); if (dp) dp.focus();
    const doDev = (pw) => { const r = Game.unlockDev(pw); if (r.ok) { addLog('开发者模式已解锁！获得 10000 魂点。', 'good'); closeModal(); } else addLog(r.reason, 'warn'); };
    m.querySelectorAll('#devpw-ok').forEach(b => b.onclick = () => { const i = $('#devpw'); doDev(i ? i.value.trim() : ''); });
    m.querySelectorAll('#devpw').forEach(i => i.onkeydown = (e) => { if (e.key === 'Enter') doDev(i.value.trim()); });
    m.querySelectorAll('[data-sleeplock]').forEach(b => b.onclick = () => { addLog(`守夜将在第一次夜袭（第 ${Game.raidDay()} 天清晨）后解锁。`, 'warn'); });
    m.querySelectorAll('[data-recipe]').forEach(b => {
      const doTap = () => {
        if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; }
        const r = RECIPES.find(x => x.id === b.dataset.recipe); const cook = ['fire','pot','stove'].includes(r.station);
        withAnimation('craft', r.name, () => { Game.craft(r); rerenderCraft(); }, cook ? 'pot' : 'hammer_icon');
      };
      const doLong = () => {
        if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; }
        const r = RECIPES.find(x => x.id === b.dataset.recipe); showModal('batch', { recipe: r.id });
      };
      bindPress(b, doTap, doLong);
    });
    m.querySelectorAll('[data-item]').forEach(b => b.onclick = () => { m.innerHTML = `<div class="modal-content">${itemDetail(b.dataset.item)}</div>`; bindItemDetail(b.dataset.item); });
    m.querySelectorAll('[data-station]').forEach(b => b.onclick = () => {
      if (b.classList.contains('locked')) { addLog(b.dataset.station === 'fire' && S().scene === 'camp' ? '需要先建造篝火。' : S().scene !== 'camp' ? '这些工坊都在营地里，回营地才能使用。' : b.dataset.station === 'furniture' ? '需要先建造对应家具（纺车/织布机/研钵/药炉/灶台/晾肉架/制革架等）。' : '还没有这个工位，先去营地建造吧。', 'warn'); return; }
      craftTab = b.dataset.station;
      showModal('craft');
    });
    m.querySelectorAll('[data-ttab]').forEach(b => b.onclick = () => { laoTab = b.dataset.ttab; m.querySelectorAll('[data-ttab]').forEach(x => x.classList.remove('active')); b.classList.add('active');
      $('#trade-body').innerHTML = laochaoTab(b.dataset.ttab);
      bindModal('laochao');
    });
    m.querySelectorAll('[data-excoin]').forEach(b => b.onclick = () => { Game.exchangeCoins(1); showModal('laochao'); });
    m.querySelectorAll('[data-shop]').forEach(b => b.onclick = () => {
      m.querySelectorAll('[data-shop]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      if (b.classList.contains('locked')) { addLog('声望不够，摊主摆摆手。', 'warn'); return; }
      $('#trade-body').innerHTML = townShop(b.dataset.shop);
      bindModal('town');
    });
    m.querySelectorAll('[data-buy]').forEach(b => {
      const e = LAOCHAO.sell.find(x => x.id === b.dataset.buy) || {};
      const cur = b.dataset.currency || e.currency || 'beibi';
      const unit = Game.priceOf(e.base || 0, false, b.dataset.buy);
      const isBp = e.kind === 'bp';
      const doTap = () => {
        if (isBp && Game.invCount(b.dataset.buy) > 0) return;
        Game.buyFromMerchant(b.dataset.buy, 1, LAOCHAO.sell, false);
        showModal('laochao');
      };
      const doLong = () => {   // 长按 = 批量购买（图纸只能买一份，也照样弹批量条，避免"长按没反应"）
        if (isBp) { showModal('batchn', { kind:'buy', item:b.dataset.buy, shop:'LAOCHAO', max:1 }); return; }
        const mx = Math.max(1, Math.min(99, Math.floor(Game.invCount(cur) / Math.max(1, unit))));
        if (Game.invCount(cur) < unit) { doTap(); return; }
        showModal('batchn', { kind:'buy', item:b.dataset.buy, shop:'LAOCHAO', max:mx });
      };
      b.onclick = null; bindPress(b, doTap, doLong);
    });
    m.querySelectorAll('[data-sell]').forEach(b => {
      const id = b.dataset.sell;
      const doTap = () => { Game.sellToMerchant(id, 1, LAOCHAO.buy, false); showModal('laochao'); };
      const doLong = () => showModal('batchn', { kind:'sell', item:id, list:'LAOCHAO' });
      b.onclick = null; bindPress(b, doTap, doLong);
    });
    m.querySelectorAll('[data-comm]').forEach(b => b.onclick = () => {
      Game.completeCommission(LAOCHAO.commissions.find(c => c.id === b.dataset.comm));
      showModal('laochao');
    });
    m.querySelectorAll('[data-equiptab]').forEach(b => b.onclick = () => { equipTab = b.dataset.equiptab; showModal('equip'); });
    m.querySelectorAll('[data-unequip-slot]').forEach(b => b.onclick = () => { const k = b.dataset.unequipSlot; const id = S().equipment[k]; if (id) { Game.unequip(id); } rerenderEquip(); });
    m.querySelectorAll('[data-crafthelp]').forEach(b => b.onclick = () => showModal('crafthelp'));
    m.querySelectorAll('[data-grind]').forEach(b => b.onclick = () => { const a = b.dataset.grind; if (a === 'sharpen') Game.sharpen(); else if (a === 'repair') Game.repairWeapon(); else showModal('naming'); });
    m.querySelectorAll('[data-mailtab]').forEach(b => b.onclick = () => { mailTab = b.dataset.mailtab; showModal('mailbox'); });
    m.querySelectorAll('[data-claimmail]').forEach(b => b.onclick = () => { const r = Game.claimMailbox(+b.dataset.claimmail); centerToast(r.msg); change(); showModal('mailbox'); });
    const rd = m.querySelector('[data-revive2]') || null;
    const rdo = m.querySelector('#redeem-do'); if (rdo) rdo.onclick = () => { const inp = m.querySelector('#redeem-code'); const r = Game.redeemCode(inp ? inp.value : ''); centerToast(r.msg || r.reason); if (!r.ok) addLog(r.reason, 'warn'); else { mailTab = 'mail'; change(); } showModal('mailbox'); };
    const ndo = m.querySelector('#name-do'); if (ndo) ndo.onclick = () => { Game.nameWeapon(m.querySelector('#name-input').value); rerenderCraft(); };
    m.querySelectorAll('[data-helprules]').forEach(b => b.onclick = () => { comTab = 'p1'; showModal('comhelp'); });
    m.querySelectorAll('[data-commtab]').forEach(b => b.onclick = () => { comTab = b.dataset.commtab; showModal('comhelp'); });
    m.querySelectorAll('[data-skillup]').forEach(b => b.onclick = () => { const r = Game.skillUp(b.dataset.skillup); if (!r.ok) addLog(r.reason, 'warn'); showModal('skill'); });
    const bn = $('#batch-n');
    if (bn) { const bc = $('#batch-count'); const up = () => { if (bc) bc.textContent = bn.value; }; bn.addEventListener('input', up); bn.addEventListener('change', up); const bd = $('#batch-do'); if (bd) bd.onclick = () => { const r = RECIPES.find(x => x.id === modal.cfg.recipe); const res = Game.craftBatch(r, +bn.value); if (!res.ok) addLog(res.reason, 'warn'); closeModal(); rerenderCraft(); }; }
    // 数量快捷档（手机端不用精确拖滑块）：1 / 一半 / 全部
    m.querySelectorAll('[data-bset]').forEach(x => x.onclick = () => {
      const inp = $('#batchn-n'); if (!inp) return;
      const mx = +inp.max || 1;
      const v = x.dataset.bset === '1' ? 1 : (x.dataset.bset === 'half' ? Math.max(1, Math.round(mx / 2)) : mx);
      inp.value = v; inp.dispatchEvent(new Event('input'));
      const c = $('#batchn-count'); if (c) c.textContent = v;
    });
    // 批量条：数量/合计实时更新；确定后按商店类型回到正确的界面
    const bnn = $('#batchn-n');
    if (bnn) {
      const bc2 = $('#batchn-count');
      const up2 = () => {
        if (bc2) bc2.textContent = bnn.value;
        const tt = $('#batchn-total');
        if (tt && modal && modal.cfg && modal.cfg._unit) tt.textContent = modal.cfg._unit * (+bnn.value || 0);
      };
      bnn.addEventListener('input', up2); bnn.addEventListener('change', up2);
      const bd2 = $('#batchn-do');
      if (bd2) bd2.onclick = () => {
        const cfg2 = modal.cfg, n = +bnn.value;
        if (cfg2.kind === 'discard') {
          Game.removeItem(cfg2.item, n); addLog(`丢弃了${ITEMS[cfg2.item].name}×${n}。`, 'warn');
          closeModal(); showModal('inv'); return;
        }
        if (cfg2.kind === 'buy') {
          const key = String(cfg2.shop || '').split(':')[0];
          Game.buyFromMerchant(cfg2.item, n, shopBuyList(cfg2.shop), key === 'BLACK');
          closeModal();
          showModal(key === 'BLACK' ? 'black' : key === 'LAOCHAO' ? 'laochao' : key === 'ATL' ? 'atlTrade' : (cfg2.back || 'town'));
          return;
        }
        const lk = cfg2.list || 'LAOCHAO';
        Game.sellToMerchant(cfg2.item, n, shopSellList(lk), lk === 'BLACK');
        closeModal(); showModal(lk === 'TOWN' ? 'town' : lk === 'BLACK' ? 'black' : lk === 'ATL' ? 'atlTrade' : 'laochao');
      };
    }
    m.querySelectorAll('[data-ctab]').forEach(b => b.onclick = () => { colTab = b.dataset.ctab; showModal('collection'); });
    m.querySelectorAll('[data-acceptc]').forEach(b => b.onclick = () => {
      const r = Game.acceptCommission(LAOCHAO.commissions.find(c => c.id === b.dataset.acceptc));
      if (!r.ok) addLog(r.reason, 'warn'); else centerToast('已接取委托，3 天内去海域找海盗头目');
      showModal('laochao');
    });
    m.querySelectorAll('[data-firsttrade]').forEach(b => b.onclick = () => { Game.doFirstTrade(); showModal('laochao'); });
    m.querySelectorAll('[data-tbuy]').forEach(b => {
      const [shop, id] = b.dataset.tbuy.split(':');
      const list = shop === 'informant' ? TOWN.informant.sell : shop === 'smith' ? TOWN.smith.sell : TOWN.grocer.sell;
      const entry = list.find(x => x.id === id) || {};
      const cur = entry.currency || 'beibi';
      const unit = Game.priceOf(entry.base || 0, false, id);
      const back = (modal && modal.kind === 'info') ? 'info' : 'town';
      const doTap = () => { Game.buyFromMerchant(id, 1, list, false); showModal(back); };
      const doLong = () => {
        if (ITEMS[id].cat === 'bp') { showModal('batchn', { kind:'buy', item:id, shop:b.dataset.tbuy, back, max:1 }); return; }
        const mx = Math.max(1, Math.min(99, Math.floor(Game.invCount(cur) / Math.max(1, unit))));
        if (Game.invCount(cur) < unit) { doTap(); return; }
        showModal('batchn', { kind:'buy', item:id, shop:b.dataset.tbuy, back, max:mx });
      };
      b.onclick = null; bindPress(b, doTap, doLong);
    });
    m.querySelectorAll('[data-tsell]').forEach(b => {
      const id = b.dataset.tsell;
      const list = TOWN.grocer.buy.concat(TOWN.smith.buy).concat(TOWN.informant.buy);
      const doTap = () => { Game.sellToMerchant(id, 1, list, false); showModal('town'); };
      const doLong = () => showModal('batchn', { kind:'sell', item:id, list:'TOWN' });   // 长按 = 批量卖
      b.onclick = null; bindPress(b, doTap, doLong);
    });
    m.querySelectorAll('[data-bbuy]').forEach(b => { const e = BLACKMARKET.sell.find(x => x.id === b.dataset.bbuy) || {}; const unit = Game.priceOf(e.base || 0, false, b.dataset.bbuy); const doTap = () => { Game.buyFromMerchant(b.dataset.bbuy, 1, BLACKMARKET.sell, true); showModal('black'); }; const doLong = () => { if (ITEMS[b.dataset.bbuy].cat === 'bp') { showModal('batchn', { kind:'buy', item:b.dataset.bbuy, shop:'BLACK', max:1 }); return; } const mx = Math.max(1, Math.min(99, Math.floor(Game.invCount('beibi') / Math.max(1, unit)))); if (Game.invCount('beibi') < unit) { doTap(); return; } showModal('batchn', { kind:'buy', item:b.dataset.bbuy, shop:'BLACK', max:mx }); }; b.onclick = null; bindPress(b, doTap, doLong); });
    m.querySelectorAll('[data-bsell]').forEach(b => { const id = b.dataset.bsell; const doTap = () => { Game.sellToMerchant(id, 1, BLACKMARKET.buy, true); showModal('black'); }; const doLong = () => showModal('batchn', { kind:'sell', item:id, list:'BLACK' }); b.onclick = null; bindPress(b, doTap, doLong); });
    m.querySelectorAll('[data-choice]').forEach(b => b.onclick = () => {
      const c = cfg.choices[Number(b.dataset.choice)];
      closeModal();
      if (c && c.ok) c.ok();
    });
    m.querySelectorAll('[data-med-id]').forEach(b => b.onclick = () => { Game.useItemInFight(b.dataset.medId); if (Game.S().combat) renderCombat('start', Game.S().combat); else closeModal(); });
    m.querySelectorAll('[data-claim-ach]').forEach(b => b.onclick = () => { const r = Game.achClaim(b.dataset.claimAch); if (!r.ok) addLog(r.reason, 'warn'); showModal('collection'); });
    if (kind === 'farm') bindFarm();
  }
  function bindItemDetail(id) {
    const m = $('#modal');
    m.querySelectorAll('#modal-back').forEach(b => b.onclick = () => showModal('inv'));
    m.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { Game.consume(b.dataset.use); showModal('inv'); });
    m.querySelectorAll('[data-med]').forEach(b => b.onclick = () => { Game.useMed(b.dataset.med); showModal('inv'); });
    m.querySelectorAll('[data-equip]').forEach(b => b.onclick = () => { const id = b.dataset.equip; const idx = b.dataset.idx !== undefined ? +b.dataset.idx : undefined; const eq = S().equipment; const on = (eq.weapon===id||eq.weapon2===id||eq.armor===id||eq.cloth===id||eq.accessory===id); if (on) Game.unequip(id); else Game.equip(id, idx); showModal('inv'); });
    m.querySelectorAll('[data-discard]').forEach(b => { const did = b.dataset.discard || id; const doTap = () => { Game.removeItem(did, 1); addLog(`丢弃了${ITEMS[did].name}×1。`, 'warn'); showModal('inv'); }; const doLong = () => showModal('batchn', { kind:'discard', item:did }); b.onclick = null; bindPress(b, doTap, doLong); });
    m.querySelectorAll('[data-plant]').forEach(b => b.onclick = () => { closeModal(); Game.travel('farm'); });
  }
  function closeModal() { const m = $('#modal'); m.classList.remove('open'); m.innerHTML = ''; modal = null; render(); }
  function rerenderEquip() { const mc = $('#modal .modal-content'); const st = mc ? mc.scrollTop : 0; showModal('equip'); const mc2 = $('#modal .modal-content'); if (mc2) mc2.scrollTop = st; }
  function rerenderCraft() { const mc = $('#modal .recipe-list'); const st = mc ? mc.scrollTop : 0; showModal('craft'); const mc2 = $('#modal .recipe-list'); if (mc2) mc2.scrollTop = st; }
  function renderTut(st) {
    const step = st.tut;
    let t = document.getElementById('tut');
    if (!step) { if (t) t.remove(); return; }
    const hint = step === 1 ? '新手引导：点击底部【制造】→【手工】→ 制作【石镐】' : '新手引导：点【装备】→ 工具栏 → 点【石镐】上栏装备';
    if (!t) { t = document.createElement('div'); t.id = 'tut'; t.className = 'tut-banner'; document.body.appendChild(t); }
    t.innerHTML = `<span class="tut-text">${hint}</span><button class="mini-btn" data-tutskip="1">跳过</button>`;
    const sk = t.querySelector('[data-tutskip]'); if (sk) sk.onclick = () => { const s = Game.S(); if (s) s.tut = null; change(); };
  }

  // ---------- 耕地 ----------
  function farmModal() {
   const st = S();
   const farm = BUILDING_CHAINS.farm[st.buildings.farm];
    const plots = Game.farmPlots(), ext = Game.farmExt(), extMax = Game.FARM_EXTRA_MAX;
    const hasHoe = Game.invCount('hoe') > 0;
    let html = `<div class="modal-title">耕地（${farm.name}，${st.crops.length}/${plots} 块田）</div>`;
    html += `<div class="hint">${hasHoe ? '锄头在手：可以「松土」让作物早一天成熟' : '没有锄头：只能播种/施肥/收获（锄头=木材×2+石头×1，手工做）'}${ext < extMax ? '，还能「开垦」新田（木材×2）' : ''}。</div>`;
    st.crops.forEach((c, i) => {
      const name = (CROPS[c.seed] && CROPS[c.seed].name) || '作物';
      const canLoosen = hasHoe && c.remain > 0 && !c.tilled;
      html += `<div class="crop-row">${name}：${c.remain <= 0 ? '<b style="color:#111">成熟了！</b>' : `还有 ${c.remain} 天成熟`}
        ${canLoosen ? `<button class="mini-btn" data-loosen="${i}">松土（早1天）</button>` : (c.tilled ? '<span class="hint">（已松土）</span>' : '')}
        ${c.fert ? '<span class="hint">（已施肥）</span>' : (Game.invCount('rot') >= 2 ? `<button class="mini-btn" data-fert="${i}">施肥（腐烂物×2）</button>` : '')}
        ${c.remain <= 0 ? `<button class="mini-btn" data-harvest="${i}">收获</button>` : ''}</div>`;
    });
    if (Game.invCount('rot') > 0 && Game.invCount('rot') < 2) html += `<div class="hint">腐烂物 ${Game.invCount('rot')}/2 —— 攒够 2 个可以给一块地施肥（收获 +50%）。</div>`;
    if (ext < extMax) {
      const canTill = hasHoe && Game.invCount('wood') >= 2;
      html += `<div class="plant-row">开垦新田：${canTill ? '<button class="mini-btn" data-till="1">开垦（木材×2 · 1 小时）</button>' : `<span class="hint">${hasHoe ? '需要木材×2' : '需要一把锄头'}</span>`} <span class="hint">（还能开 ${extMax - ext} 块）</span></div>`;
    }
    if (st.crops.length < plots) {
      html += '<div class="plant-row">播种：';
      let seedAny = false;
      for (const sd in CROPS) {
        if (Game.invCount(sd) > 0) { seedAny = true; html += `<button class="mini-btn" data-plant="${sd}">${ITEMS[sd].name}（有${Game.invCount(sd)}）</button>`; }
      }
      if (!seedAny) html += '<span class="hint">背包里没有种子（盐镇杂货商有卖）。</span>';
      html += '</div>';
    }
    html += '<div class="hint">雨天作物会多长一天；施肥一次 +50% 收成。</div>';
    html += `<div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
    return html;
  }
  function bindFarm() {
    const m = $('#modal');
    m.querySelectorAll('[data-plant]').forEach(b => b.onclick = () => { Game.plant(b.dataset.plant); showModal('farm'); });
    m.querySelectorAll('[data-harvest]').forEach(b => b.onclick = () => { Game.harvest(+b.dataset.harvest); showModal('farm'); });
    m.querySelectorAll('[data-fert]').forEach(b => b.onclick = () => { const r = Game.fertilize(+b.dataset.fert); if (r && !r.ok) addLog(r.reason, 'warn'); showModal('farm'); });
    m.querySelectorAll('[data-loosen]').forEach(b => b.onclick = () => { const r = Game.loosenPlot(+b.dataset.loosen); if (r && !r.ok) addLog(r.reason, 'warn'); showModal('farm'); });
    m.querySelectorAll('[data-till]').forEach(b => b.onclick = () => { const r = Game.tillPlot(); if (r && !r.ok) addLog(r.reason, 'warn'); showModal('farm'); });
    m.querySelectorAll('#modal-close').forEach(b => b.onclick = closeModal);
  }

  // ---------- 日记 / 图鉴 ----------
  function diaryModal() {
    const st = S();
    let html = `<div class="modal-title">我的日记</div><div class="diary-list">`;
    if (!st.diary.length) html += '<div class="hint">日记还是空的。</div>';
    for (const d of st.diary.slice(-40).reverse()) {
      html += `<div class="diary-line"><span class="diary-day">第${d.day}天</span>${esc(d.line)}</div>`;
    }
    html += `</div><div class="modal-actions"><button id="modal-close">合 上</button></div>`;
    return html;
  }
  const COL_CAT_N = { mat:'材料', special:'特殊', bp:'元件', seed:'种子', food:'食物', drink:'饮品', med:'药品', weapon:'武器', armor:'防具', cloth:'衣物', tool:'工具', currency:'货币', accessory:'饰品' };
  const TRAIT_CN = { charge:'冲撞', poison:'剧毒', bleed:'流血', pack:'群袭', group:'群袭', enrage:'狂暴', ironImmune:'铁甲', evade:'闪避', dodge:'闪避', first:'先手', water:'水中', swim:'水中', summon:'召唤', gun:'持枪', flee:'逃跑', nightBuff:'夜战强化' };
  const COL_STATION_N = { none:'手工', work1:'工作台', work2:'工作台', work3:'工作台', furn1:'熔炉', furn2:'熔炉', furn3:'熔炉', smoke1:'烟熏炉', smoke2:'烟熏炉', fire:'篝火', pot:'药锅', spin:'纺车', loom:'织布机', mortar:'研钵', medPot:'药炉', stove:'灶台', rack:'晾肉架', tannery:'制革架' };
  let colTab = 'res';
  function collectionModal() {
    const st = S();
    const c = Game.collection();
    const tabs = [['res',`资源 ${c.res}/${c.resTotal}`],['tool','工具'],['mon',`怪物 ${c.mon}/${c.monTotal}`],['rec',`配方 ${RECIPES.length}`],['boss','首领'],['ach','成就']];
    let html = `<div class="modal-title">图 鉴</div><div class="tabs">${tabs.map(([k,l]) => `<button class="tab ${colTab === k ? 'active' : ''}" data-ctab="${k}">${l}</button>`).join('')}</div>`;
    html += '<div class="hint">标签上的数字是「已收录 / 图鉴总数」；显示 ？？？ 的是还没见过的东西。</div><div class="col-body">';
    if (colTab === 'res') html += colRes(st);
    else if (colTab === 'tool') html += colTool();
    else if (colTab === 'mon') html += colMon(st);
    else if (colTab === 'rec') html += colRec();
    else if (colTab === 'boss') html += colBoss(st);
    else html += colAch();
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  function colRes(st) {
    const mm = Game.metaState();
    const ids = Game.resIds();   // 和标题的总数用同一份名单
    let html = '<div class="col-list">';
    for (const id of ids) {
      const it = ITEMS[id];
      const seen = st.seen[id] || mm.seenItems[id];
      html += `<div class="col-item ${seen ? '' : 'unseen'}">${seen ? `${it.glyph} ${it.name}` : '？？？'}${seen && it.desc ? `<small>${it.desc}</small>` : ''}</div>`;
    }
    return html + '</div>';
  }
  function colTool() {
    const ids = Object.keys(ITEMS).filter(k => ['weapon','tool','armor','cloth'].includes(ITEMS[k].cat));
    let html = '<div class="col-list tools">';
    for (const id of ids) {
      const it = ITEMS[id];
      const parts = [];
      parts.push(COL_CAT_N[it.cat] || it.cat);
      if (it.tool && it.tool.kind) parts.push(`类型：${it.tool.kind === 'axe' ? '斧' : it.tool.kind === 'pick' ? '镐' : it.tool.kind === 'knife' ? '刀' : it.tool.kind === 'hoe' ? '锄' : it.tool.kind === 'net' ? '网' : it.tool.kind === 'rod' ? '钓竿' : it.tool.kind === 'bow' ? '弓' : it.tool.kind}`);
      if (it.atk) parts.push(`攻击 ${it.atk}`);
      if (it.def) parts.push(`防御 ${it.def}`);
      if (it.warm) parts.push(`保暖 ${it.warm}`);
      if (DURA[id] !== undefined) parts.push(`耐久 ${DURA[id]}`);
      if (it.ranged) parts.push('弓箭');
      if (it.throw) parts.push('可投掷');
      if (it.dur) parts.push('持续');
      html += `<div class="col-item"><b>${it.glyph} ${it.name}</b><small>${parts.join(' · ')}</small>${it.desc ? `<small>${it.desc}</small>` : ''}</div>`;
    }
    return html + '</div>';
  }
  function colMon(st) {
    const mm = Game.metaState();
    let html = '<div class="col-list">';
    for (const k of Game.monIds()) {   // 与标题总数同一份名单（自动排除 noDex 变体）
      const e = ENEMIES[k];
      const seen = st.seen['mon_' + k] || mm.seenMon[k];
      const killed = st.killCount[k] || 0;
      html += `<div class="col-item ${seen ? '' : 'unseen'}">${seen ? `<b>${e.name}</b><small>血量 ${e.hp} · 攻 ${e.atk} · 防 ${e.def} · 速 ${e.spd}${e.traits && e.traits.length ? ' · ' + e.traits.map(t => TRAIT_CN[t] || t).join('/') : ''}</small>${e.drops && e.drops.length ? `<small>掉落：${e.drops.map(d => d.ch ? `${ITEMS[d.id].name} ${Math.round(d.ch * 100)}%` : ITEMS[d.id].name).join('、')}</small>` : ''}${e.desc ? `<small>${e.desc}</small>` : ''}` : '？？？'}${killed ? `<small class="col-times">击败 ×${killed}</small>` : ''}</div>`;
    }
    return html + '</div>';
  }
  function colRec() {
    let html = '<div class="col-list">';
    for (const r of RECIPES) {
      const inS = Object.entries(r.in || {}).map(([k,v]) => `${ITEMS[k].name}×${v}`).join('、') || '—';
      const outS = Object.entries(r.out || {}).map(([k,v]) => `${ITEMS[k].name}×${v}`).join('、');
      html += `<div class="col-item"><b>${r.name}</b><small>工位：${COL_STATION_N[r.station] || r.station}${r.time ? ` · ${r.time}分` : ''}</small><small>材料：${inS}</small><small>产出：${outS}</small></div>`;
    }
    return html + '</div>';
  }
  function colBoss(st) {
    const mm = Game.metaState();
    let html = '<div class="col-list">';
    const bosses = Game.monIds().filter(k => ENEMIES[k].boss).map(k => [k, ENEMIES[k]]);
    for (const [k, e] of bosses) {
      const seen = st.seen['mon_' + k] || mm.seenMon[k];
      const killed = st.killCount[k] || 0;
      html += `<div class="col-item ${seen ? '' : 'unseen'}">${seen ? `<b>${e.name}</b><small>血量 ${e.hp} · 攻 ${e.atk} · 防 ${e.def} · 速 ${e.spd}${e.traits && e.traits.length ? ' · ' + e.traits.map(t => TRAIT_CN[t] || t).join('/') : ''}</small>${e.drops && e.drops.length ? `<small>掉落：${e.drops.map(d => `${ITEMS[d.id].name}${d.ch ? ' ' + Math.round(d.ch*100) + '%' : ''}`).join('、')}</small>` : ''}${e.desc ? `<small>${e.desc}</small>` : ''}` : '？？？'}${killed ? `<small class="col-times">击败 ×${killed}</small>` : ''}</div>`;
    }
    return html + '</div>';
  }
  function colAch() {
    const mm = Game.metaState();
    const ach = mm.ach || {};
    const tierCls = { '紫':'ach-purple', '金':'ach-gold', '红':'ach-red' };
    let html = '<div class="col-list">';
    for (const id in ACHIEVEMENTS) {
      const a = ACHIEVEMENTS[id];
      const st = ach[id];
      html += `<div class="col-item ach ${st ? 'done' : ''}"><span class="ach-glyph">${a.glyph}</span><b>${a.name}</b><span class="ach-tier ${tierCls[a.tier]||''}">${a.tier}</span><small>${a.desc}</small><small>奖励 ${a.reward} 魂点</small>${st === 'claimed' ? '<small class="col-times">已领取</small>' : (st === 'unlocked' ? `<button class="mini-btn" data-claim-ach="${id}">领取</button>` : '<small class="col-times">未达成</small>')}</div>`;
    }
    return html + '</div>';
  }

  // ---------- 结局 ----------
  function showEnding(id, reason) {
    const st = S();
    const end = ENDINGS[id] || ENDINGS.D;
    try { AudioFX.playEnding(id); } catch (e) {}
    let es = document.getElementById('ending-screen');
    if (!es) { es = document.createElement('div'); es.id = 'ending-screen'; document.body.appendChild(es); }
    const kills = Object.values(st.killCount || {}).reduce((a, b) => a + b, 0);
    const builds = Object.values(st.buildings || {}).reduce((a, b) => a + b, 0);
    let diary = st.diary.slice(-12).map(d => `<div class="diary-line"><span class="diary-day">第${d.day}天</span>${esc(d.line)}</div>`).join('');
    const ms = Game.metaLast();
    const metaSoul = Game.metaState().soul;
    es.innerHTML = `<div class="ending-wrap">
      <div class="ending-title">${id === 'D' ? '归途之外' : end.name}</div>
      <div class="ending-sub">${id === 'D' ? '第 ' + st.day + ' 天' : '第 ' + st.day + ' 天 · ' + Game.seasonInfo().name + '季'}</div>
      <img class="ending-img" src="${end.img || ''}" onerror="this.style.display='none'" alt="${end.name}">
      <div class="ending-text">${esc(id === 'D' ? (reason || '你死在了岛上。') : end.text)}</div>
      <div id="ending-lines" class="ending-lines"></div>
      ${ms ? `<div class="ending-sub soul-line">你的一生化作 <b>${ms.gain}</b> 魂点，汇入了《历代遗章》。</div>` : ''}
      ${id === 'D' ? '' : `<div class="ending-sub">达成条件：${end.cond}</div>`}
      <div class="ending-sub">一生战绩：战斗 ${kills} 场 · 击杀 ${Object.keys(st.killCount || {}).length} 种 · 建筑 ${builds} 级 · 声望 ${'★'.repeat(st.fame || 0)}${'☆'.repeat(3 - (st.fame || 0))}</div>
      <div class="ending-diary">${diary}</div>
      <div class="ending-actions">
        ${id === 'D' ? (
          (st.difficulty !== 'legend' ? (metaSoul >= 50 ? `<button id="end-revive">回到今天日出（-50 魂点）</button>` : `<button id="end-revive" data-lack="1">回到今天日出（需 50 魂点）</button>`) : '') +
          `<button id="end-retry">重新开始</button>`
        ) : `<button id="end-stay">留在岛上（自由模式）</button>`}
        <button id="end-title">回到标题</button>
      </div>
    </div>`;
    es.classList.add('open'); document.body.classList.add('no-scroll');
    const linesEl = document.getElementById('ending-lines');
    if (linesEl) { const ls = (end.lines || []); ls.forEach((ln, i) => setTimeout(() => { const d = document.createElement('div'); d.className = 'ending-line'; d.textContent = ln; linesEl.appendChild(d); d.classList.add('in'); }, 900 + i * 1500)); }
    const hide = () => { es.classList.remove('open'); es.innerHTML = ''; document.body.classList.remove('no-scroll'); };
    $('#end-stay') && ($('#end-stay').onclick = () => { hide(); addLog('你选择了留下来。海还在那里。', 'sys'); });
    $('#end-revive') && ($('#end-revive').onclick = (e) => {
      if (e.target.dataset.lack) { addLog('魂点不足（需 50 魂点）。', 'warn'); return; }
      hide(); Game.reviveToday();
    });
    $('#end-title') && ($('#end-title').onclick = () => { hide(); Game.save(); location.reload(); });
    $('#end-retry') && ($('#end-retry').onclick = () => { hide(); Game.newGame(lastIdentity, lastDifficulty); });
  }
  // 上一次选择：进游戏/读档时都会同步，重新开始时就不会莫名其妙变回渔夫
  let lastIdentity = (() => { try { return localStorage.getItem('guyuyizhang_identity') || 'fisher'; } catch (e) { return 'fisher'; } })();
  let lastDifficulty = (() => { try { return localStorage.getItem('guyuyizhang_difficulty') || 'normal'; } catch (e) { return 'normal'; } })();
  function rememberIdentity() {
    try {
      const st = S();
      if (st && st.identity) lastIdentity = st.identity;
      if (st && st.difficulty) lastDifficulty = st.difficulty;
      localStorage.setItem('guyuyizhang_identity', lastIdentity);
      localStorage.setItem('guyuyizhang_difficulty', lastDifficulty);
    } catch (e) {}
  }

  // ---------- 标题 / 开局 ----------
  function showTitle() {
    const app = $('#app');
    const has = Game.hasSave();
    app.innerHTML = `
      <div id="title-screen">
        <img src="assets/img/title.png" alt="">
        <div id="title-name"><span class="tt" data-ch="孤">孤</span><span class="tt" data-ch="屿">屿</span><span class="tt" data-ch="遗">遗</span><span class="tt" data-ch="章">章</span></div>
        <div id="title-sub">一座孤岛 · 一段余生 · 一本日记</div>
        <div id="title-btns">
          <button id="btn-new">新的旅程</button>
          ${has ? '<button id="btn-load">继续上次游戏</button>' : ''}
          <button id="btn-meta">◈ 历代遗章</button>
          <button id="btn-bak">📦 备份·读档</button>
          <button id="btn-music">音 乐：开</button>
          <button id="btn-amb">环境音：开</button>
        </div>
        <div id="title-tip">备份点 ${Game.backupPoints()}</div>
        <div id="modal"></div>
      </div>`;
    // 事件委托：标题按钮（防首次渲染/重渲染丢绑定）
    app.onclick = (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!btn) return;
      if (btn.id === 'btn-new') { AudioFX.init(); showJourneySelect(); }
      else if (btn.id === 'btn-load') { AudioFX.init(); if (Game.load()) { begin(); } }
      else if (btn.id === 'btn-meta') { AudioFX.init(); showModal('heirloom'); }
      else if (btn.id === 'btn-bak') { AudioFX.init(); showModal('backup'); }
      else if (btn.id === 'btn-music') { const on = AudioFX.toggle(); btn.textContent = '音 乐：' + (on ? '开' : '关'); }
      else if (btn.id === 'btn-amb') { const on = AudioFX.toggleAmbient(); btn.textContent = '环境音：' + (on ? '开' : '关'); }
    };
    // 隐藏开发者模式：连点"章"×4 → 输密码
    let devClicks = 0;
    app.querySelectorAll('.tt').forEach(sp => sp.onclick = () => {
      if (sp.dataset.ch !== '章') return;
      devClicks++;
      if (devClicks >= 4) { devClicks = 0; showModal('devpw'); }
    });
    // 现实 10 秒 = 游戏 1 分钟（紧迫感）；待机超过 10 分钟则暂停时间流逝（防挂机挂死）
    let lastActive = Date.now();
    const markActive = (e) => { if (e && e.isTrusted === false) return; lastActive = Date.now(); };
    ['pointerdown','touchstart','keydown','scroll'].forEach(ev => document.addEventListener(ev, markActive, { passive: true }));
    setInterval(() => {
      const stg = Game.S();
      if (!stg || uiBusy || traveling || stg.ending || stg.death) return;
      if (Date.now() - lastActive > 10 * 60 * 1000) return;   // 待机超 10 分钟 → 时间暂停
      Game.timePass(1);
    }, 10000);
    // 离开/切后台/刷新时自动存盘（防止 iPad/移动端刷新丢档）
    const autoSave = () => { try { const s = Game.S(); if (s && !s.ending && !s.death) Game.save(); } catch(e){} };
    window.addEventListener('pagehide', autoSave);
    window.addEventListener('beforeunload', autoSave);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') autoSave(); });
    AudioFX.setScene('title');
  }
  let lastSlot = -1;
  function showJourneySelect() {
    const app = $('#app');
    const slots = Game.slotList();
    const bp = Game.backupPoints();
    let html = `<div id="select-screen"><div class="select-title">开始新的旅程 <span style="font-weight:400;font-size:13px;letter-spacing:0.02em">｜ 备份点：${bp} <button class="mini-btn" data-titlebuybp="1">＋</button></span></div>
      <div class="identity-list">`;
    for (let i = 0; i < 3; i++) {
      const s = slots[i];
      html += `<button class="identity" data-slot="${i}"><b>备份槽 ${i + 1}${s ? ` · 第${s.day}天` : ' · 空白'}</b><span>${s ? `第 ${s.day} 天${s.settled ? '（已结算）' : ''} · 点击从此处继续` : '空白 · 点击开始新游戏'}</span></button>`;
    }
    html += `</div><button id="sel-back">返回</button><div id="modal"></div></div>`;
    app.innerHTML = html;
    app.querySelectorAll('.identity').forEach(b => b.onclick = () => { const i = +b.dataset.slot; const s = Game.slotList()[i]; if (s) { const r = Game.loadSlot(i); if (r.ok) begin(); else addLog(r.reason, 'warn'); } else { lastSlot = i; showIdentity(); } });
    app.querySelectorAll('[data-titlebuybp]').forEach(b => b.onclick = () => showModal('buybp'));
    $('#sel-back').onclick = showTitle;
  }
  function showIdentity() {
    const app = $('#app');
    let html = `<div id="select-screen"><div class="select-title">你是什么人？</div><div class="identity-list">`;
    for (const [id, idn] of Object.entries(IDENTITIES)) {
      html += `<button class="identity" data-id="${id}"><b>${idn.name}</b><span>${idn.desc}</span></button>`;
    }
    html += `</div><button id="sel-back">返回</button><div id="modal"></div></div>`;
    app.innerHTML = html;
    app.querySelectorAll('.identity').forEach(b => b.onclick = () => { lastIdentity = b.dataset.id; try { localStorage.setItem('guyuyizhang_identity', lastIdentity); } catch (e) {} showDifficulty(); });
    $('#sel-back').onclick = showTitle;
  }
  function showDifficulty() {
    const app = $('#app');
    let html = `<div id="select-screen"><div class="select-title">选择难度</div><div class="identity-list">`;
    for (const [id, d] of Object.entries(DIFFICULTIES)) {
      if (id === 'dev' && !Game.devEnabled()) continue;
      html += `<button class="identity" data-id="${id}"><b>${d.name}${d.recommend ? ' <i style="font-style:normal;font-size:11px;border:1px solid var(--ink);padding:0 4px;border-radius:3px">新手推荐</i>' : ''}</b><span>${d.desc}</span></button>`;
    }
    html += `</div><div class="hint" style="margin-top:6px">第一次玩？选「求生者」就行，之后随时可以换。</div><button id="sel-back">返回</button><div id="modal"></div></div>`;
    app.innerHTML = html;
    app.querySelectorAll('.identity').forEach(b => b.onclick = () => { lastDifficulty = b.dataset.id; try { localStorage.setItem('guyuyizhang_difficulty', lastDifficulty); } catch (e) {} Game.newGame(lastIdentity, lastDifficulty); begin(); });
    $('#sel-back').onclick = showIdentity;
  }
  function begin() {
    const app = $('#app');
    rememberIdentity();   // 记下本局的身份/难度，重开时沿用
    // 加载画面（约 2.2 秒）：鸟鸣 + 树叶沙沙 + 随机提示
    const TIPS = ['悄悄告诉你，游戏官方群号是 1014679931 哦☆', '规律作息可以回复更多体力和血量。', '晚上 10 点到 12 点睡觉，体力回得最满。', '吃饱喝足再睡，才不会睡到掉血。', '越远的地方越危险，也越稀有。', '工具和武器都有耐久，用坏了要重新做。', '古金币留着找老潮换神物，或是买传承。', '雨天去树林，蘑菇会更多。', '瞭望台能让你看见更远的地方。', '死亡不是终点，魂点会沉淀进《历代遗章》。'];
    const L = document.createElement('div');
    L.id = 'loading';
    L.innerHTML = `<div class="load-glyph">◈</div><div class="load-tip">${TIPS[Math.floor(Math.random() * TIPS.length)]}</div><div class="load-bar"><i></i></div>`;
    document.body.appendChild(L);
    AudioFX.setScene('forest');   // 加载时播清脆鸟叫+树叶沙沙
    setTimeout(() => { L.classList.add('done'); setTimeout(() => L.remove(), 500); }, 2200);
    app.innerHTML = `
      <div id="topbar">
        <span id="top-day">第 1 天</span>
        <span id="top-time">08:00</span>
        <span id="top-season">春季</span>
        <span id="top-weather">晴</span>
        <span class="stat"><span class="stat-name">命</span><div class="stat-bar"><div id="bar-hp" class="stat-fill hp"></div></div><span class="stat-num" id="num-hp"></span></span>
        <span class="stat"><span class="stat-name">体</span><div class="stat-bar"><div id="bar-stamina" class="stat-fill st"></div></div><span class="stat-num" id="num-stamina">100</span></span>
        <span class="stat"><span class="stat-name">饱</span><div class="stat-bar"><div id="bar-hunger" class="stat-fill hu"></div></div><span class="stat-num" id="num-hunger">100</span></span>
        <span class="stat"><span class="stat-name">水</span><div class="stat-bar"><div id="bar-thirst" class="stat-fill th"></div></div><span class="stat-num" id="num-thirst">100</span></span>
        <span class="stat"><span class="stat-name">神</span><div class="stat-bar"><div id="bar-spirit" class="stat-fill sp"></div></div><span class="stat-num" id="num-spirit">100</span></span>
        <span id="status-badges"></span>
        <span id="cap">0/20 格</span>
        <button id="btn-mail" class="top-mail-btn">✉ 邮箱 <b id="mail-count"></b></button>
      </div>
      <div id="main"></div>
      <div id="log"><div id="logbody"></div></div>
      <div id="objective"></div>
      <button id="btn-backmap">← 返回地图</button>
      <div id="rest-bar">
        <button id="btn-rest">休息 1 小时</button>
        <button id="btn-rest-h" title="切换休息时长（1 / 2 / 3 小时）">×1</button>
      </div>
      <div id="nav">
        <button data-nav="map">🗺 地图</button>
        <button data-nav="inv">🎒 背包</button>
        <button data-nav="equip">⚔ 装备</button>
        <button data-nav="craft">🔨 制造</button>
        <button data-nav="save">☰ 菜单</button>
      </div>
      <div id="modal"></div>
      <div id="busy"></div>
      <button id="anim-speed" title="采集/建造/攻击动画速度">动画×1</button>`;
    view = 'scene';
    const spd = $('#anim-speed');
    if (spd) { spd.textContent = '动画×' + animSpeed; spd.onclick = () => { animSpeed = (animSpeed % 3) + 1; spd.textContent = '动画×' + animSpeed; try { localStorage.setItem('guyuyizhang_anim', String(animSpeed)); } catch (e) {} AudioFX.play('pickup'); }; }
    const bb = $('#btn-backmap');
    if (bb) {
      // 在地图界面时它应该带你回场景，而不是重复打开地图
      bb.textContent = (view === 'map') ? '← 返回场景' : '← 返回地图';
      bb.onclick = () => {
        AudioFX.play('travel');
        if (view === 'map') { view = 'scene'; render(); return; }
        view = 'map'; render();
        const mw = $('#map-wrap'); if (mw) { mw.classList.remove('map-in'); void mw.offsetWidth; mw.classList.add('map-in'); }
      };
    }
    const br = $('#btn-rest');
    const brh = $('#btn-rest-h');
    if (br) {
      br.textContent = '休息 ' + restHours + ' 小时';
      br.onclick = () => { if (Game.S().stats.stamina >= Game.maxStam()) { addLog('体力充沛，不需要休息。', 'warn'); return; } withAnimation('gather', '休息 ' + restHours + ' 小时', () => Game.rest(restHours), 'rest'); };
    }
    if (brh) {
      brh.textContent = '×' + restHours;
      brh.onclick = () => {   // 1 → 2 → 3 → 1 循环
        restHours = (restHours % 3) + 1;
        brh.textContent = '×' + restHours;
        if (br) br.textContent = '休息 ' + restHours + ' 小时';
        try { localStorage.setItem('guyuyizhang_rest', String(restHours)); } catch (e) {}
        AudioFX.play('pickup');
      };
    }
    const bm = $('#btn-mail'); if (bm) bm.onclick = () => { mailTab = 'mail'; showModal('mailbox'); };
    document.querySelectorAll('#nav [data-nav]').forEach(b => b.onclick = () => {
      const n = b.dataset.nav;
      if (n === 'map') { view = 'map'; render(); }
      else if (n === 'inv') showModal('inv');
      else if (n === 'equip') { equipTab = (S().tut === 2) ? 'p2' : 'p1'; showModal('equip'); }
      else if (n === 'craft') showModal('craft');
      else if (n === 'save') showModal('savemenu');
    });
    // 点弹窗空白处 = 关闭（常规面板类；战斗/剧情选择除外）
    const modalEl = $('#modal');
    modalEl.addEventListener('click', (e) => {
      if (e.target !== modalEl) return;
      const k = modal && modal.kind;
      if (['inv','craft','camp','laochao','town','black','mission','info','farm','diary','collection','sleeppick','savemenu'].includes(k)) closeModal();
    });
    // 移动端：不预加载全部大图，改为按需加载（切换场景时才读取对应图），降低内存与首屏压力
    render();
    AudioFX.setScene(Game.S().scene);
    // 序章叙事
    showModal('overlay', {
      title: '第 1 天 · 海难',
      text: '风暴把船撕成了碎片。你被海浪冲上一片陌生的沙滩，浑身是伤，手里只剩半截缆绳。\n\n天是灰的，海也是灰的。身后有山的轮廓，脚下有河流入海，海平线上隐约有对岸的岛影。\n\n活下去。这是你接下来唯一要做的事。',
      choices: [{ label: '从沙滩上爬起来', ok: () => { addLog('你从沙滩上爬起来，把散落的物资收拢到一起。', 'sys'); } }],
    });
  }

  // ---------- 初始化 ----------
  // 全局"咔哒"声：所有按钮/标签/热点/地图箭头，按下就给一次交互反馈（45ms 内不叠音）
  let _lastClickAt = 0;
  document.addEventListener('pointerdown', (e) => {
    const t = (e.target && e.target.closest) ? e.target.closest('button, .mini-btn, .tab, .hotspot, .map-arrow, .action-btn, [data-choice]') : null;
    if (!t || t.disabled || t.classList.contains('lockedb') || t.classList.contains('locked')) return;
    const now = Date.now();
    if (now - _lastClickAt < 45) return;
    _lastClickAt = now;
    try { AudioFX.play('click'); } catch (err) {}
  }, true);

  function init() {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => showTitle());
    else showTitle();
  }
  return { init, showTitle, begin, render };
})();

UI.init();
