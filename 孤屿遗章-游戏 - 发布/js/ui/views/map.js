/* map：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const MapView = (() => {
  function create(deps) {
    const $=(...args)=>deps.$(...args);
    const el=(...args)=>deps.el(...args);
    const S=(...args)=>deps.S(...args);
    const centerToast=(...args)=>deps.centerToast(...args);
    const addLog=(...args)=>deps.addLog(...args);
    const skinOn=(...args)=>deps.skinOn(...args);
    const mapImagePath=(...args)=>deps.mapImagePath(...args);
    const baseMapImagePath=(...args)=>deps.baseMapImagePath(...args);
    const atlantisVisualArrows=(...args)=>deps.atlantisVisualArrows(...args);
    const logWidthFor=(...args)=>deps.logWidthFor(...args);
    const alignLogGrip=(...args)=>deps.alignLogGrip(...args);
    const render=(...args)=>deps.render(...args);
    const startAtlantisTravel=(...args)=>deps.startAtlantisTravel(...args);
    const startTravel=(...args)=>deps.startTravel(...args);
    const showModal=(...args)=>deps.showModal(...args);
let prevCampBuilds = new Set();

let prevMapBuilds = new Set();

let mapBuilt = false;

let mapPanX = 0;

function mapBox(iw, ih, bw, bh) {
    if (!iw || !ih || !bw || !bh) return null;
    const w = bw, h = ih * (bw / iw);
    return { w, h, left: 0, top: (bh - h) / 2, maxPan: Math.max(0, (h - bh) / 2) };
  }

function coverBox(iw, ih, bw, bh, zoom) {
    if (!iw || !ih || !bw || !bh) return null;
    const sCover = Math.max(bw / iw, bh / ih) * (zoom || 1);
    // 竖屏兜底：手机竖屏下"铺满高度"会把图横着裁掉一大半（只剩中间一条），所以改成"至少铺满宽度"，能拖动看右边。
    // ⚠️ 这个下界必须是【抬高】而不是 min 的钳制：以前写成 min(max(bw/iw*1.10, bh/ih), sCover)，
    //    结果 zoom 完全被吃掉——横版地图(iw/ih≈1.78)在宽屏(bw/bh≈2.16)上，「铺满宽度」只比「铺满高度」
    //    大一点点，s 被钉死在 bh/ih 上，放多少倍高度都不变；于是 maxPan 长期只有 116px，
    //    "把当前场景对到画面中间"根本做不到（营地在地图 88% 处，需要约 195px）。
    //    现在 zoom 是真正的下界，只有"竖屏会被裁掉一大半"时才用下界把 s 抬上去。
    const sFloor = Math.max(bw / iw * 1.10, bh / ih);
    // 两种来源取大者：① zoom 倍铺满；② 真正的竖屏兜底（铺满宽度比铺满高度大很多时，才用它把图抬上去）
    const s = Math.max(sCover, sFloor > (bh / ih) * 1.02 ? sFloor : 0);
    const w = iw * s, h = ih * s;
    return { w: w, h: h, left: (bw - w) / 2, top: (bh - h) / 2, maxPan: Math.max(0, (h - bh) / 2) };
  }

function applyBox(sel, box, panY, panX) {
    const e = $(sel); if (!e || !box) return;
    e.style.position = 'absolute';
    e.style.left = (box.left + (panX || 0)) + 'px';
    e.style.top = (box.top + (panY || 0)) + 'px';
    e.style.width = box.w + 'px';
    e.style.height = box.h + 'px';
    e.style.right = 'auto'; e.style.bottom = 'auto';
    e.style.maxWidth = 'none'; e.style.maxHeight = 'none';
  }

function applyMapPan() {
    const img = $('#map-img'), wrap = $('#map-wrap');
    if (!img || !wrap || !img.naturalWidth) return null;
    const box = mapBox(img.naturalWidth, img.naturalHeight, wrap.clientWidth, wrap.clientHeight);
    if (!box) return null;
    deps.mapPanY = Math.max(-box.maxPan, Math.min(box.maxPan, deps.mapPanY));
    mapPanX = 0;          // 宽度已经和屏幕一致：横向没有可拖的余量，也不允许左右裁切
    applyBox('#map-img', box, deps.mapPanY, 0);
    applyBox('#map-arrows', box, deps.mapPanY, 0);
    applyBox('#map-buildings', box, deps.mapPanY, 0);
    return box;
  }

function fitMapArrowsToImage(reset) {
    const img = $('#map-img'), wrap = $('#map-wrap');
    if (!img || !wrap || !img.naturalWidth) return;
    if (reset) { deps.mapPanY = 0; mapPanX = 0; }
    if (!applyMapPan()) return;
    fitMapArrowsInView();
  }

function applyScenePan() {
    if (deps.roomView) { deps.scenePanY = 0; return null; }
    const img = $('#scene-img'), wrap = $('#scene-wrap');
    if (!img || !wrap || !img.naturalWidth) return null;
    const scale=Math.max(wrap.clientWidth/img.naturalWidth,wrap.clientHeight/img.naturalHeight);
    const focus = S()?.scene === 'camp' ? .64 : .5;
    const scaledW = img.naturalWidth * scale, scaledH = img.naturalHeight * scale;
    const box = deps.sceneScroll ? mapBox(img.naturalWidth, img.naturalHeight, wrap.clientWidth, wrap.clientHeight) : {w:scaledW,h:scaledH,left:(wrap.clientWidth-scaledW)/2,top:Math.max(wrap.clientHeight-scaledH,Math.min(0,wrap.clientHeight/2-scaledH*focus)),maxPan:0};
    img.style.objectFit='fill';
    if (!box) return null;
    deps.scenePanY = Math.max(-box.maxPan, Math.min(box.maxPan, deps.scenePanY));
    applyBox('#scene-img', box, deps.scenePanY);
    applyBox('#hotspots', box, deps.scenePanY);
    applyBox('#camp-buildings', box, deps.scenePanY);
    return box;
  }

function fitSceneLayers(reset) {
    if (reset) deps.scenePanY = 0;
    applyScenePan();
  }

function bindPan(sel, getPan, setPan, settle) {
    const wrap = $(sel);
    if (!wrap || wrap.dataset.panBound) return;
    wrap.dataset.panBound = '1';
    let dragging = false, startY = 0, startPan = 0, moved = false;
    wrap.addEventListener('pointerdown', (e) => {
      if(!deps.sceneScroll && sel!=='#map-wrap') return;
      if (e.target && e.target.closest && e.target.closest('.map-arrow, .hotspot, .target, .target-pick, button, .zone-btn')) return;
      dragging = true; moved = false; startY = e.clientY; startPan = getPan();
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dy = e.clientY - startY;
      if (!moved && Math.abs(dy) < 4) return;    // 抖动 4px 以内当点击，画面不跟着晃
      moved = true;
      setPan(startPan + dy);
    });
    const stop = () => { if (!dragging) return; dragging = false; if (moved) settle(); };
    wrap.addEventListener('pointerup', stop);
    wrap.addEventListener('pointercancel', stop);
    wrap.addEventListener('pointerleave', stop);
    let wheelT = 0;
    wrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      if(!deps.sceneScroll && sel!=='#map-wrap') return;
      setPan(getPan() + e.deltaY);
      clearTimeout(wheelT); wheelT = setTimeout(settle, 140);   // 滚轮停下再重排贴边标签，省性能
    }, { passive: false });
  }

function bindMapPan() {
    bindPan('#map-wrap', () => deps.mapPanY, (v) => { deps.mapPanY = v; applyMapPan(); }, fitMapArrowsInView);
  }

function bindLogGrip() {
    const log = $('#log'), body = $('#logbody');
    if (!log || log.dataset.gripBound) return;
    log.dataset.gripBound = '1';
    const UNDER = '.hotspot, .map-arrow, .zone-btn, .target, [data-choice]';
    let dragging = false, startY = 0, startPan = 0, moved = false;
    log.addEventListener('pointerdown', (e) => {
      if (e.target && e.target.closest && e.target.closest('button, a, input, select')) return;
      if (document.elementsFromPoint) {
        const under = document.elementsFromPoint(e.clientX, e.clientY).filter(el => el !== log && !log.contains(el));
        const hit = under.map(el => (el.closest ? el.closest(UNDER) : null)).find(Boolean);
        if (hit) { e.preventDefault(); e.stopPropagation(); hit.click(); return; }
      }
      if (body && body.scrollHeight > body.clientHeight + 2) return;   // 有历史可翻 → 原生滚动
      if(!deps.sceneScroll && deps.view!=='map') return;
      dragging = true; moved = false; startY = e.clientY;
      startPan = (deps.view === 'map') ? deps.mapPanY : deps.scenePanY;
      if (log.setPointerCapture) { try { log.setPointerCapture(e.pointerId); } catch (err) {} }
    });
    log.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dy = e.clientY - startY;
      if (!moved && Math.abs(dy) < 4) return;
      moved = true;
      e.preventDefault();
      if (deps.view === 'map') { deps.mapPanY = startPan + dy; applyMapPan(); }
      else { deps.scenePanY = startPan + dy; applyScenePan(); }
    });
    const stop = () => { if (!dragging) return; dragging = false; if (moved && deps.view === 'map') fitMapArrowsInView(); };
    log.addEventListener('pointerup', stop);
    log.addEventListener('pointercancel', stop);
    log.addEventListener('pointerleave', stop);
  }

function fitMapArrowsInView() {
    const box = $('#map-arrows');
    if (!box) return;
    box.querySelectorAll('.map-arrow').forEach(a => {
      if (!a.dataset.pctL) { a.dataset.pctL = a.style.left; a.dataset.pctT = a.style.top; }
      a.style.left = a.dataset.pctL; a.style.top = a.dataset.pctT;
      a.classList.remove('offscreen');
      a.style.marginLeft = '';      // 不许有任何独立位移
      a.classList.remove('arrow-below');   // 不许换朝向（那也是一种独立位移 + 动画）
    });
  }

let mapPendingCenter = false;

function centerMapOnHere() {
    const img = $('#map-img'), wrap = $('#map-wrap'), layer = $('#map-arrows');
    if (!img || !wrap || !layer || !img.naturalWidth || !wrap.clientWidth || !wrap.clientHeight) return false;
    const here = layer.querySelector('.map-arrow.here') || layer.querySelector('.map-arrow');
    if (!here) return false;
    const box = mapBox(img.naturalWidth, img.naturalHeight, wrap.clientWidth, wrap.clientHeight);
    if (!box) return false;
    const fy = parseFloat(here.dataset.pctT || here.style.top) / 100;
    if (!isFinite(fy)) return false;
    const ay = box.top + box.h * fy;         // 没平移时锚点相对舞台的纵向位置
    // 宽度已经贴合屏幕 → 横向不用（也不许）平移；纵向把"你在这里"对到画面中间，超出边界的部分夹住。
    const limY = Math.max(0, (box.h - wrap.clientHeight) / 2);
    mapPanX = 0;
    deps.mapPanY = Math.max(-limY, Math.min(limY, wrap.clientHeight / 2 - ay));
    applyMapPan();
    return true;
  }

function tryCenterMap() { if (mapPendingCenter && centerMapOnHere()) mapPendingCenter = false; }

function renderMap(justEntered) {
    const st = S();
    const m = $('#main');
    if (!mapBuilt || !$('#map-img')) {
      deps.dom.dispose(m);m.innerHTML = `
        <div id="map-wrap" class="stage">
          <div id="stage-inner">
            <img id="map-img" src="${mapImagePath(st.scene)}" data-art="${mapImagePath(st.scene)}" data-base-art="${baseMapImagePath(st.scene)}" alt="全景地图" draggable="false" loading="eager" fetchpriority="high">
            <div id="map-buildings"></div>
            <div id="map-arrows"></div>
          </div>
          <div id="map-vignette"></div>
          <div id="weather-overlay"></div>
          <div id="map-caption"></div>
        </div>`;
      const img = $('#map-img');
      if (img) {
        img.onerror = () => {
          if (img.dataset.baseArt && img.dataset.art !== img.dataset.baseArt) { img.dataset.art = img.dataset.baseArt; img.src = img.dataset.baseArt; return; }
          img.onerror = null;
          img.src = deps.PAPER_FALLBACK;
          addLog('地图图片加载失败，可切换场景后重试；其他操作仍可继续。', 'warn');
        };
        img.onload = () => { fitStage(); fitMapArrowsToImage(); refreshMapArrows(S()); tryCenterMap(); };
        const mnight = Game.isNight(), mdusk = Game.isDusk();
        const mapGray = skinOn('seasons') ? '' : 'grayscale(1) ';
        img.style.filter = mapGray + (mnight ? 'brightness(0.5) contrast(1.1)' : mdusk ? 'brightness(0.68) contrast(1.05)' : 'brightness(0.92) contrast(1.05)');
      }
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
      const want = mapImagePath(st.scene);
      if (mimg.dataset.world !== want) {   // 孤岛 ⇄ 海底换图：平移量归零，避免停在上一次的位置
        mimg.dataset.world = want; mimg.dataset.art = want; mimg.src = want;
        mimg.dataset.baseArt = baseMapImagePath(st.scene);
        if (mimg.dataset.scene !== st.scene) { deps.mapPanY = 0; mapPanX = 0; }
        mimg.dataset.scene = st.scene;
      }
      mimg.classList.add('cover');   // 两张图都铺满舞台（左右不留黑边），纵向余量靠上下拖
      const mn = Game.isNight(), md = Game.isDusk();
      const gray = skinOn('seasons') ? '' : 'grayscale(1) ';
      mimg.style.filter = gray + (st.scene === 'atlantis' ? 'brightness(0.97) contrast(1.04)' : mn ? 'brightness(0.5) contrast(1.1)' : md ? 'brightness(0.68) contrast(1.05)' : 'brightness(0.92) contrast(1.05)');
    }
    fitMapArrowsToImage();
    refreshMapArrows(st);
    // 刚进地图（或刚落地）→ 居中一次；之后玩家自己拖，不再抢镜头。
    // 热点位置始终只由地图坐标决定，这里只动"地图停在哪儿"。
    if (justEntered) mapPendingCenter = true;
    tryCenterMap();
    if (st.scene === 'atlantis') { const w = $('#map-buildings'); if (w) w.innerHTML = ''; } else renderBuildings(st);
  }

function renderBuildings(st) {
    const wrap = $('#map-buildings');
    if (!wrap) return;
    const target=wrap, fragment=document.createDocumentFragment();
    const b = st.buildings;
    const rows = [];
    // 地图上的营地底图已画好帐篷+箱子：只额外叠加 瞭望台/船坞/耕地，避免重复
    if (b.watch >= 1) rows.push({ img:'build/watch' + b.watch, x:44, y:76, w:44, label: BUILDING_CHAINS.watch[b.watch].name });
    if (b.dock >= 1) rows.push({ img:'build/dock', x:70, y:84, w:54, label: BUILDING_CHAINS.dock[b.dock].name });
    // 耕地不在营地/地图上显示田块
    const cur = new Set(rows.map(r => r.img));
    for (const r of rows) {
      const p = el('div', 'build-plate', '');p.dataset.building=r.img;
      p.style.left = r.x + '%'; p.style.top = r.y + '%';
      const isNew = !prevMapBuilds.has(r.img);
      p.innerHTML = `<img class="build-sprite${isNew ? ' build-new' : ''}" style="width:${r.w}px" src="assets/img/${r.img}.png" alt="" draggable="false" onerror="this.style.display='none'"><span class="build-label">${r.label}</span>`;
      fragment.appendChild(p);
    }
    prevMapBuilds = cur;
    deps.dom.reconcile(target,fragment);
  }

function renderCampBuildings(st) {
    if (deps.roomView) return;
    const wrap = $('#camp-buildings');
    if (!wrap) return;
    const stage = $('#scene-wrap');
    const stageW = Math.max(600, wrap.clientWidth || (stage ? stage.offsetWidth : 900));
    const target=wrap, fragment=document.createDocumentFragment();
    const b = st.buildings, P = CAMP_BUILD_POS;
    const rows = [];
    // 住处：帐篷→草房→木屋→砖瓦房，升级时旧图自动消失
    const dwImg = ['build/tent', 'build/house', 'build/woodhouse', 'build/brickhouse'][b.house];
    const dwFrac = [0.26, 0.28, 0.30, 0.32][b.house];
    if (dwImg) rows.push([dwImg, P.house, Math.round(stageW * dwFrac)]);
    // 篝火→壁炉
    if (b.fire >= 0) rows.push([b.fire >= 2 ? 'build/fireplace' : 'build/fire', P.fire, Math.round(stageW * (b.fire>=2?0.14:0.13))]);
    // 储物箱：小箱子→大木箱→仓库
    let storeImg = 'build/smallbox', storeFrac = 0.13;
    if (b.storage >= 3) { storeImg = 'build/warehouse'; storeFrac = 0.19; }
    else if (b.storage >= 2) { storeImg = 'build/storage-shed'; storeFrac = 0.18; }
    else if (b.storage >= 1) { storeImg = 'build/crate'; storeFrac = 0.15; }
    if (b.storage >= 0) rows.push([storeImg, P.store, Math.round(stageW * storeFrac)]);
    if (st.furniture.beehive) rows.push(['build/beehive', P.hive, Math.round(stageW * 0.08)]);
    if (b.dock >= 1) rows.push(['build/dock', P.dock, Math.round(stageW * 0.15)]);
    // 耕地不再在营地场景显示田块（改由耕地弹窗管理）
    if(Game.cellarBuilt())rows.push(['build/cellar-v2',P.cellar,Math.round(stageW*.14)]);
    if(b.wall>0){const perimeter=el('img','camp-perimeter'+(skinOn('seasons')?'':' muted'),'');perimeter.src=`assets/img/build/camp-wall-${b.wall}-v2.png`;perimeter.alt=BUILDING_CHAINS.wall[b.wall].name;perimeter.dataset.wallTier=b.wall;perimeter.dataset.building='perimeter';fragment.appendChild(perimeter);}
    const cur = new Set(rows.map(r => r[0]));
    for (const [img, pos, w] of rows) {
      const p = el('div', 'build-plate', '');p.dataset.building=img;
      p.style.left = pos[0] + '%'; p.style.top = pos[1] + '%';
      // 按"深度"排叠放次序：y 越大 = 站得越靠画面下方 = 越近，画在越前面。
      // 玩家反馈"篝火被仓库挡住"——原来大家都用 CSS 的 z-index:4，谁在 DOM 里靠后谁就盖住别人，
      // 仓库排在篝火后面，于是把篝火压掉了。现在按 y 排序，篝火在仓库前面。
      // 数值压在 10 以内：热点/箭头层是 10，标签要永远在最上面。
      p.style.zIndex = String(Math.max(1, Math.min(9, Math.round(pos[1] / 10))));
      const isNew = !prevCampBuilds.has(img);
      const art = { 'build/tent':'home-0', 'build/house':'home-1', 'build/woodhouse':'home-2', 'build/brickhouse':'home-3',
        'build/smallbox':'facility-0', 'build/crate':'facility-1', 'build/warehouse':'facility-2', 'build/beehive':'facility-3',
        'build/fire':'facility-4', 'build/fireplace':'facility-6' }[img];
      const refined = {'build/tent':'tent-v3','build/fire':'campfire-v3','build/fireplace':'fireplace-v3','build/warehouse':'warehouse-v3'}[img];
      if(refined)p.classList.add('camp-art-refined');
      const src = refined ? `assets/img/map-pack/buildings/${refined}.webp` : img==='build/storage-shed'?`assets/img/build/storage-shed${skinOn('seasons')?'-colored':''}.png`:art ? `assets/img/map-pack/buildings/${art}.webp` : `assets/img/${img}.png`;
      p.innerHTML = `<img class="build-sprite${skinOn('seasons') ? '' : ' muted'}${isNew ? ' build-new' : ''}" style="width:${w}px" src="${src}" alt="" draggable="false" onerror="this.style.display='none'">`;
      fragment.appendChild(p);
    }
    prevCampBuilds = cur;
    deps.dom.reconcile(target,fragment);
  }

function refreshMapArrows(st) {
    const wrap = $('#map-arrows');
    if (!wrap) return;
    const target=wrap, fragment=document.createDocumentFragment();
    if (st.scene === 'atlantis') {
      const sc = Game.sceneOf('atlantis');
      for (const [zid, pos] of Object.entries(atlantisVisualArrows())) {
        if (zid === 'home') {
          const ha = el('div', 'map-arrow unlocked', '');
          ha.style.left = pos.x + '%'; ha.style.top = pos.y + '%';
          ha.dataset.zone = 'home';   // 同样打标签：它是 ▲，锚点取 glyph 顶边中点
          ha.innerHTML = `<span class="arrow-label">${pos.label}</span><span class="arrow-glyph">▲</span>`;
          ha.onclick = () => showModal('overlay', { title:'返回孤岛', text:'游回海面约 1.5 小时（需潜水服）。', choices:[
            { label:'出发', ok:() => {  deps.view = 'scene'; Game.travel('camp'); } },
            { label:'取 消', ok:() => { deps.view = 'map'; render(); } },
          ]});
          ha.dataset.arrow=ha.dataset.zone || pos.label;fragment.appendChild(ha); continue;
        }
        const z = sc.zones[zid]; if (!z) continue;
        const here = (st.zone === zid);
        // 复用孤岛地图（图一）那套判定（作者 2026-09-22）：
        //   ① 渲染时就判该区域去不去得成；② 去不成 → locked（变灰）；③ 点击先拦、return，绝不先播动画。
        //   以前这里写死 'unlocked'，点击直接 startAtlantisTravel()，玩家得看完下潜动画才知道进不去。
        const zNeed = z.needLight || 0;
        const zLock = !here && zNeed > Game.lightLevel();
        const a = el('div', 'map-arrow' + (zLock ? ' locked' : ' unlocked') + (here ? ' here' : ''), '');
        a.style.left = pos.x + '%'; a.style.top = pos.y + '%';
        a.dataset.zone = zid;   // 给箭头打上区域 id：旅行动画据此精确取"箭头尖"，不再用坐标模糊匹配
        a.innerHTML = `<span class="arrow-label">${pos.label || z.name}</span><span class="arrow-glyph">▼</span>`;
        a.onclick = () => {
          if (here) { deps.view = 'scene'; render(); return; }
          if (zLock) {
            const gear = ['', '潜水护目镜', '弱光防水手电', '防水强光潜水手电'][zNeed] || '更强的照明装备';
            const why = `前面黑得什么也看不见——需要「${gear}」才能进去。`;
            addLog(why, 'warn'); centerToast(why); return;
          }
          startAtlantisTravel(zid);
        };
        a.dataset.arrow=a.dataset.zone || a.dataset.scene || a.textContent;fragment.appendChild(a);
      }
      deps.dom.reconcile(target,fragment);fitMapArrowsInView(); return;
    }
    const watch = st.buildings.watch;
    for (const [id, pos] of Object.entries(MAP_ARROWS)) {
      const sc = Game.sceneOf(id);
      const unlocked = Game.sceneUnlocked(id);
      const danger = sc.danger + (Game.isNight() && id !== 'camp' ? 1 : 0);
      const a = el('div', 'map-arrow' + (unlocked ? ' unlocked' : ' locked') + (id === st.scene && deps.view === 'map' ? ' here' : ''), '');
      a.style.left = pos.x + '%';
      a.style.top = pos.y + '%';
      a.dataset.scene = id;   // 给箭头打上场景 id：旅行动画据此精确取"箭头尖"
      a.innerHTML = `<span class="arrow-label">${sc.name}<span class="arrow-danger">${'●'.repeat(Math.min(5, danger))}</span></span><span class="arrow-glyph">▼</span>`;
      if (unlocked) {
        a.onclick = () => {
          if (id === st.scene) { deps.view = 'scene'; render(); return; }   // 点当前地点 = 进入该场景（从地图回场景）
          // ⚠️ 提前拦一道：雷暴 / 保暖不够 / 体力不够时，原来会先弹「前往」确认框，
          //    点了才在左侧日志里写一行就算失败 —— 玩家反馈的"点不了去山顶"多半是这么来的。
          //    现在当场在屏幕中央说清原因，连确认框都不弹（省一次白点的交互）。
          const chk = Game.canTravel(id);
          if (!chk.ok) { addLog(chk.reason, 'warn'); centerToast(chk.reason); return; }
          const c = Game.travelCost(id);
          if (st.stats.stamina < c.energy) { const why = `体力不够，走不动这么远（需要 ${c.energy}，当前 ${Math.floor(st.stats.stamina)}）。`; addLog(why, 'warn'); centerToast(why); return; }
          showModal('overlay', { title:'前往 ' + sc.name, text:`耗时 ${c.time} 分钟 · 消耗体力 ${c.energy}。`, choices: [
            { label:'前往', ok:() => {  startTravel(id); } },
            { label:'取 消', ok:() => {} },
          ]});
        };
      } else {
        a.onclick = () => {
          const why = `那里还被迷雾笼罩。${sc.unlockWatch > watch ? `需要更高等级的瞭望台（${sc.unlockWatch} 级）。` : ''}${sc.needBoat ? `需要合适的船。` : ''}`;
          addLog(why, 'warn'); centerToast(why);
        };
      }
      a.dataset.arrow=a.dataset.zone || a.dataset.scene || a.textContent;fragment.appendChild(a);
    }
    deps.dom.reconcile(target,fragment);fitMapArrowsInView();
  }

function badgeStripH() {
    const b = $('#status-badges');
    if (!b || !b.firstChild) return 0;
    const cs = getComputedStyle(b);
    if (cs.display === 'none' || cs.position !== 'fixed') return 0;
    return Math.round(b.getBoundingClientRect().height) || 0;
  }

function fitStage() {
    const m = $('#main');
    const stage = $('#scene-wrap') || $('#map-wrap');
    if (!m || !stage) return;
    const w = m.clientWidth, h = m.clientHeight;
    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
    // 把日志/返回地图/休息按钮定位到画面左侧/右下角
    document.body.classList.toggle('log-tiny',deps.logSize==='tiny');
    const app = $('#app');
    if (!app) return;
    const sr = stage.getBoundingClientRect(), ar = app.getBoundingClientRect();
    const left = sr.left - ar.left, top = sr.top - ar.top;
    const back=$('#btn-backmap');
    if(back) { back.style.top=(top+5)+'px';back.style.left=(left+6)+'px'; }
    // 画面铺满后日志就压在图上：给一个读得舒服的宽度，并交给 .overlap 那层淡渐隐兜底
    const log = $('#log');
    if (log) {
      const lw = logWidthFor(w);
      log.style.width = lw + 'px'; log.style.left = '0px'; log.style.top = '0px';
      log.classList.add('overlap');
    }
    const badges=$('#status-badges'); if(badges) badges.style.top=(top+6)+'px';
    alignLogGrip();   // 无条件跑：没有「返回地图」按钮（标题页等）时它自己会隐藏
    const obj = $('#objective');
    if (obj) { obj.style.left = (left + sr.width - Math.min(460, sr.width * 0.5) - 12) + 'px'; obj.style.top = (top + 10 + badgeStripH()) + 'px'; }
    fitSceneLayers(false);
    fitMapArrowsToImage(false);
  }
    return Object.freeze({mapBox,coverBox,applyBox,applyMapPan,fitMapArrowsToImage,applyScenePan,fitSceneLayers,bindPan,bindMapPan,bindLogGrip,fitMapArrowsInView,centerMapOnHere,tryCenterMap,renderMap,renderBuildings,renderCampBuildings,refreshMapArrows,badgeStripH,fitStage});
  }
  return Object.freeze({create});
})();
