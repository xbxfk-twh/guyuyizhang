/* scene：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const SceneView = (() => {
  function create(deps) {
    const $=(...args)=>deps.$(...args);
    const el=(...args)=>deps.el(...args);
    const S=(...args)=>deps.S(...args);
    const esc=(...args)=>deps.esc(...args);
    const bindPress=(...args)=>deps.bindPress(...args);
    const centerToast=(...args)=>deps.centerToast(...args);
    const addLog=(...args)=>deps.addLog(...args);
    const skinOn=(...args)=>deps.skinOn(...args);
    const sceneImagePath=(...args)=>deps.sceneImagePath(...args);
    const render=(...args)=>deps.render(...args);
    const withAnimation=(...args)=>deps.withAnimation(...args);
    const applyScenePan=(...args)=>deps.applyScenePan(...args);
    const fitSceneLayers=(...args)=>deps.fitSceneLayers(...args);
    const bindPan=(...args)=>deps.bindPan(...args);
    const renderCampBuildings=(...args)=>deps.renderCampBuildings(...args);
    const fitStage=(...args)=>deps.fitStage(...args);
    const diveGateThen=(...args)=>deps.diveGateThen(...args);
    const zoneTravelAnim=(...args)=>deps.zoneTravelAnim(...args);
    const startRunePuzzle=(...args)=>deps.startRunePuzzle(...args);
    const matsOk=(...args)=>deps.matsOk(...args);
    const renderRoomScene=(...args)=>deps.renderRoomScene(...args);
    const showModal=(...args)=>deps.showModal(...args);
const POINT_ICON = {
    river_net:'fish', sea_fish:'fish', sea_deep:'fish',   // 撒网/深水捕大鱼：是捕鱼，不是通用采集
    quarry_deep:'pick', cave_deep:'pick', peak_mithril:'pick',   // 深层矿脉/秘银矿脉：是矿，该用镐
  };

const _prefetched = {};

function prefetchScenes(curId) {
    try {
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
      if (navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''))) return;
      const idx = SCENES.findIndex(s => s.id === curId);
      const list = SCENES.map((s, i) => ({ img: s && s.img, far: Math.abs(i - idx) })).filter(x => x.img && x.far > 0);
      list.sort((a, b) => a.far - b.far);
      list.slice(0, 3).forEach((it, i) => {
        if (_prefetched[it.img]) return;
        _prefetched[it.img] = 1;
        setTimeout(() => { try { const im = new Image(); im.decoding = 'async'; im.src = it.img; } catch (e) {} }, 500 + i * 300);
      });
    } catch (e) {}
  }

function renderScene() {
    const st = S();
    if (deps.roomView && st.scene === 'camp') { renderRoomScene(st); return; }
    const sc = Game.sceneOf(st.scene);
    const zoneKey = sc.zones ? (st.zone || Object.keys(sc.zones)[0]) : '';
    const baseSceneImage = (sc.zones && sc.zones[zoneKey] && sc.zones[zoneKey].img) ? sc.zones[zoneKey].img : sc.img;
    const initialSceneImage = sceneImagePath(sc.id, zoneKey, baseSceneImage);
    const key = sc.id + '|' + zoneKey;
    const m = $('#main');
    if (key !== deps.lastSceneKey || !$('#scene-img')) {
      let zoneHtml = '';
      if (sc.zones && sc.id !== 'atlantis') {
        zoneHtml = `<div id="zones">` + Object.entries(sc.zones).map(([zid, z]) => {
          const active = (st.zone || Object.keys(sc.zones)[0]) === zid;
          const lock = (zid === 'ruins' && st.buildings.watch < 3);
          return `<button class="zone-btn ${active ? 'active' : ''} ${lock ? 'locked' : ''}" data-zone="${zid}">${z.name}${lock ? ' 🔒' : ''}</button>`;
        }).join('') + `</div>`;
      }
      deps.dom.dispose(m);m.innerHTML = `
        <div id="scene-wrap" class="stage">
          <div id="stage-inner">
            <img id="scene-img" src="${initialSceneImage}" data-art="${initialSceneImage}" data-base-art="${baseSceneImage}" alt="${sc.name}" draggable="false" loading="eager" fetchpriority="high">
            <div id="scene-load"><i>◈</i><span class="load-bar"><i></i></span><div class="load-tip">欢迎分享真实的游戏体验与建议</div></div>
            <div id="hotspots"></div>
            <div id="camp-buildings"></div>
          </div>
          <div id="weather-overlay"></div>
          <div id="scene-vignette"></div>
          <div id="scene-name"></div>
          ${zoneHtml}
        </div>`;
      fitStage();
      fitSceneLayers(true);   // 换场景：画面铺满 + 平移归零
      bindPan('#scene-wrap', () => deps.scenePanY, (v) => { deps.scenePanY = v; applyScenePan(); }, () => {});
      const img = $('#scene-img');
      if (img) {
        img.onerror = () => {
          if (img.dataset.baseArt && img.dataset.art !== img.dataset.baseArt) { img.dataset.art = img.dataset.baseArt; img.src = img.dataset.baseArt; return; }
          img.onerror = null;
          img.src = deps.PAPER_FALLBACK;
          addLog(`场景图片加载失败：${sc.name}。可返回地图再进入重试。`, 'warn');
        };
        img.onload = () => { const hs = $('#hotspots'); if (hs) hs.classList.add('ready'); const sl = $('#scene-load'); if (sl) sl.classList.remove('show'); fitStage(); fitSceneLayers(false); const s2 = S(); if (s2 && s2.scene === 'camp') renderCampBuildings(s2); if (s2 && s2.scene === 'atlantis' && s2.zone === 'habitat') renderAtlantisBuildings(s2); };
      }
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
      deps.lastSceneKey = key;
      prefetchScenes(sc.id);   // 空闲时预热相邻场景的底图（手机端切场景更快）
    }
    // 动态部分：名称（含昼夜符号与危险点）/ 昼夜滤镜 / 天气覆盖 / 营地热点
    const nameEl = $('#scene-name');
    if (nameEl) {
      const phase = Game.isNight() ? '☾' : Game.isDusk() ? '◐' : '☀';
      const sym = ['rain','snow','fog','storm'].includes(st.weather) ? WEATHER[st.weather].glyph : phase;
      const danger = Math.min(5, sc.danger + (Game.isNight() && sc.id !== 'camp' ? 1 : 0));
      deps.dom.html(nameEl,`${sym} ${esc(sc.name)}${sc.zones ? ' · ' + esc((sc.zones[zoneKey] || {}).name || '') : ''} <span class="name-danger">${'●'.repeat(danger)}</span>`);
    }
    const img = $('#scene-img');
    if (img) {
      const want = sceneImagePath(sc.id, zoneKey, baseSceneImage);
      if (img.dataset.art !== want) { img.dataset.art = want; img.dataset.baseArt = baseSceneImage; img.src = want; }
      const night = Game.isNight();
      const dusk = Game.isDusk();
      const sceneGray = skinOn('seasons') ? '' : 'grayscale(1) ';
      img.style.filter = sceneGray + (night ? 'brightness(0.52) contrast(1.1)' : dusk ? 'brightness(0.7) contrast(1.05)' : 'brightness(0.92) contrast(1.05)');
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
    const stage = $('#scene-wrap'); const stageW = Math.max(600, wrap.clientWidth || (stage ? stage.offsetWidth : 900));
    const sz = Math.round(stageW * 0.11);
    const camp = (st.atlantis && st.atlantis.camp && st.atlantis.camp.furniture) || {};
    const target=wrap, fragment=document.createDocumentFragment();
    for (const fid in ATLANTIS_BUILD_POS) {
      if (!camp[fid] || (fid==='seaStorage1' && camp.seaStorage2)) continue;
      const p = ATLANTIS_BUILD_POS[fid];
      const d = el('div', 'build-plate', '');d.dataset.building=fid;
      d.style.left = p.x + '%'; d.style.top = p.y + '%';
      const art = { seaStorage1:0, seaStorage2:1, pearlWork:12, sourceForge:13, repairBench:14 }[fid];
      d.innerHTML = `<img class="build-sprite${skinOn('seasons') ? '' : ' muted'}" src="assets/img/map-pack/buildings/facility-${art}.webp" style="width:${sz}px" onerror="this.style.display='none'">`;
      fragment.appendChild(d);
    }
    deps.dom.reconcile(target,fragment);
  }

function pointWorkSummary(p) {
    const tool=p.need?.tool ? Game.selectedTool(p.need.tool) : null;
    const output=(p.yields||[]).map(y=>`${ITEMS[y.id].name}×${y.min??1}${y.max!==undefined&&y.max!==y.min?'–'+y.max:''}${y.chance?'（'+Math.round(y.chance*100)+'%）':''}`).join('、');
    return [`使用工具：${tool?ITEMS[tool.id].name+(tool.source==='bag'?'':'（仓库）'):'徒手'}`,
      `预计耗时：${Game.pointMinutes(p)} 分钟 · 消耗体力：${Game.pointEnergy(p)}`,
      output?`基础产出：${output}`:'',p.daily?`今日剩余：${Math.max(0,p.daily-(S().pointUses?.[p.id]||0))} 次`:'',
      '实际产量受季节、天气、难度和工具影响。',Game.pointStatus(p)==='ok'?'':Game.pointStatus(p)].filter(Boolean).join('\n');
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
    if (sc.id === 'atlantis') {
      const machine = Game.lotteryState();
      const positions={city:[18,26],coral:[80,24],shipwreck:[82,25],coralForest:[78,25],pearlCave:[82,76],trench:[12,22]};
      if (machine.active && machine.zone === zk) {
        const [x,y]=positions[zk] || [73,72];
        list.push({id:'lottery',x,y,glyph:'◇',label:'遗海交换机'});
      }
    }
    if(sc.id==='atlantis' && zk==='sanctum' && Game.nightmareInfo().active && Game.nightmareInfo().bossReady) list.push({id:'nightmareBoss',x:78,y:37,glyph:'◉',label:'噩梦之源'});
    if (sc.id === 'peak' && st.flags.ended_C) { const act = st.atlantis && st.atlantis.stoneActive; list.push({ id: act ? 'portal_go' : 'portal_make', x:88, y:26, glyph:'◈', label: act ? '传送石 · 前往亚克兰蒂斯' : '传送石 · 需解密' }); }
    const target=wrap, fragment=document.createDocumentFragment();
    const pts = Game.pointsOf();
    for (const h of list) {
      if (sc.id === 'camp' && st.buildings.house >= 0 && ['sleep','craft','furn','smoke'].includes(h.id)) continue;
      // 建造后才显现的交互建筑
      if (h.needBuild && st.buildings[h.needBuild] < (h.lvl ?? 1)) continue;
      if (h.needFurn && !h.needFurn.some(f => st.furniture[f])) continue;
      if (h.needFlag && !st.flags[h.needFlag]) continue;
      if (sc.id === 'river' && ((h.point === 'river_water' && Game.seasonInfo().name === '冬') || (h.point === 'river_snow' && Game.seasonInfo().name !== '冬'))) continue;
      const d = el('div', 'hotspot ' + (h.point ? 'point' : ''), '');d.dataset.hotspot=h.id || h.point;
      // 房屋图的门随等级改变位置：草屋门偏左，帐篷、木屋和砖瓦房门偏右。
      const hx = sc.id === 'camp' && h.id === 'room' ? (CAMP_BUILD_POS.house[0]+(st.buildings.house===1?-3:1)) : h.x;
      const hy = h.y;
      d.style.left = hx + '%'; d.style.top = hy + '%';
      let onceTag = '';
      // ⚠️ 这两个必须声明在 if 外面：下面的 innerHTML 在块外拼装，写进块里会 ReferenceError → 整个场景渲染中断
      let ritualReady = false;      // 材料齐了：标签写"举行仪式"
      let rewardMissing = false;    // 老存档：标记打了但奖励没拿 → 标签写"取回遗物"
      if (h.point) {
        const p = pts.find(q => q.id === h.point);
        if (!p) continue;
        if(p.hideWhenDry&&!['rain','storm'].includes(st.weather))continue;
        // 特殊：山顶祭坛拿过遗物后本会消失，但凑齐"遗物+3石板+龙骨"时它要重新亮起来（结局 C 的入口，别再让玩家找不到）
        const altarRdy = (p.id === 'peak_altar' && !st.flags.ended_C && Game.hasItem('relic') && Game.invCount('slate') >= 3 && Game.hasItem('dragonbone'));
        rewardMissing = Game.onceRewardMissing ? Game.onceRewardMissing(p) : false;
        ritualReady = altarRdy;
        const visible = altarRdy || rewardMissing;    // 两种例外都让点位重新显示
        if (((p.once && st.flags['pt_'+p.id]) && !visible) || (p.firstDays && st.day > p.firstDays) || (p.id === 'grass_horse' && st.flags.horse) || (p.id === 'peak_slate' && st.flags.slateGuardDone) || (p.id === 'grass_wolfden' && st.flags.wolfKingDone)) continue;   // 一次性/已过期/已驯服/已击败 → 整体消失不显示
        if (visible) d.classList.add('altar-ready');
        if (p) {
          const status = Game.pointStatus(p);
          if (status !== 'ok') { d.classList.add('locked'); d.title = status; }
          if (p.once) onceTag = ' <i class="once-tag">一次性</i>';
        }
      }
      const spotLabel = h.id === 'honey' ? `蜂箱 ${Math.max(0, Number(st.hiveHoney) || 0)}/12 · 收蜜` : h.label;
      d.innerHTML = `<span class="hot-glyph">${h.glyph || '●'}</span><span class="hot-label">${ritualReady ? '祭坛 · 举行仪式' : (rewardMissing ? '祭坛 · 取回遗物' : spotLabel)}${(ritualReady || rewardMissing) ? '' : onceTag}</span>`;
      d.onclick = () => {
        if (h.id === 'room') { deps.roomView = true; deps.view = 'scene'; render(); }
        else if (h.id === 'honey') { const r = Game.collectHiveHoney(); if (!r.ok) centerToast(r.reason); }
        else if (h.id === 'nightmareBoss') {Game.challengeNightmareBoss();}
        else if (h.id === 'lottery') { showModal('lottery'); }
        else if (h.id === 'warehouse') {showModal('warehouse');}
        else if (h.id === 'cellar') {showModal('cellar');}
        else if (h.id === 'inv') { showModal('inv'); }
        else if (h.id === 'map') {  deps.view = 'map'; render(); }
        else if (h.id === 'fire') { AudioFX.play('fire'); deps.craftTab = 'fire'; showModal('craft'); }
        else if (h.id === 'craft') { deps.craftTab = 'work1'; showModal('craft'); }
        else if (h.id === 'furn') { deps.craftTab = 'furn1'; showModal('craft'); }
        else if (h.id === 'smoke') { deps.craftTab = 'fire'; deps.craftGroup = 'smoked'; showModal('craft'); }
        else if (h.id === 'farm') {  Game.travel('farm'); }
        else if (h.id === 'camp') { showModal('camp'); }
        else if (h.id === 'sleep') { showModal('sleeppick'); }
        else if (h.id === 'ranch') { showModal('farm'); }
        else if (h.id === 'repair') { showModal('repair'); }
        else if (h.id === 'stone') { Game.atlantisTeleport('from'); }
        else if (h.id === 'atlantis') { diveGateThen(() => Game.atlantisTeleport('to')); }
        else if (h.id === 'portal_make') { if (Game.invCount('slate') >= 3) startRunePuzzle(); else addLog('需要三块石板才能拼出传送石的符文（石板来自：山顶·石碑残迹的石板守卫、海岸遗迹、洞中遗迹）。', 'warn'); }
        else if (h.id === 'portal_go') { diveGateThen(() => Game.atlantisTeleport('to')); }
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
          else if (POINT_ICON[p.id]) { imgHint = POINT_ICON[p.id]; }                  // 点名表（撒网/深水/深层矿脉）
          else if (/(tree|bamboo_cut|wood)/.test(p.id)) { imgHint = 'axe_icon'; }
          else if (/(berry|bush)/.test(p.id)) { imgHint = 'berry_pick'; }              // 手摘浆果（先于石类判定，避免误配）
          else if (/water/.test(p.id)) { imgHint = 'water_ladle'; }                   // 取水/舀水
          else if (/(stone|ore|quarry|crystal|pit|iron|niter|sulfur|fossil|clay|copper)/.test(p.id)) { imgHint = 'pick'; }   // 采石/采矿用石镐，不再误用锤子
          const anim = ['gather','fish','hunt','drift','trap'].includes(p.type) ? { t: aT, l: p.name } : null;
          if (anim) withAnimation(anim.t, anim.l, () => Game.doPoint(p), imgHint); else Game.doPoint(p);
        }
      };
      if(h.point){const p=pts.find(q=>q.id===h.point);if(p?.type==='gather'){
        d.dataset.pointId=p.id;d.setAttribute('role','button');d.tabIndex=0;
        d.setAttribute('aria-label',p.name+' · 长按查看采集详情');
        if(!d.classList.contains('locked'))d.title=pointWorkSummary(p);
        const collect=d.onclick;d.onclick=null;
        const preview=()=>showModal('buffInfo',{title:p.name,text:pointWorkSummary(p)});
        bindPress(d,collect,preview);d.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(e.shiftKey)preview();else collect();}};
      }}
      fragment.appendChild(d);
    }
    deps.dom.reconcile(target,fragment);
  }

function settleActions() {
    return Game.checkEndingActions().filter(a => a.id.indexOf('settle_') === 0);
  }

function renderExtras() {
    const st = S();
    const box = $('#scene-actions');
    if (!box) return;
    const fragment=document.createDocumentFragment();
    const acts = [];
    if (st.scene === 'camp' && !deps.roomView) {
      if (Game.laochaoAvailable()) acts.push({ label:'与老潮交易', cls:'trade', fn:() => showModal('laochao') });
      if (st.furniture.flag && !Game.laochaoAvailable() && !st.laochao.arrived) acts.push({ label:'升起信号旗', fn:() => Game.signalFlag() });
      if (st.buildings.watch === 0) acts.push({ label:'建一级瞭望台', cls:'build', anim:{ t:'build', l:'建造一级瞭望台' }, fn:() => Game.buildChain('watch'), disabled: !matsOk(BUILDING_CHAINS.watch[1].mats), reason:'材料不足' });
      if (st.equipment.weapon) { /* 磨刀/修补/命名：已在「制造→磨刀石」 */ }
    }
    // 山顶祭坛仪式：章节目标，不是结局。单独挂一个按钮（以前混在结局按钮里，现在把它摘出来）。
    if (st.scene === 'peak' && !st.flags.ended_C && Game.hasItem('relic') && Game.invCount('slate') >= 3 && Game.hasItem('dragonbone')) {
      acts.push({ label:'祭坛仪式（章节目标 · +50 魂点）', cls:'objective', fn:() => { const r = Game.doPeakRitual(); if (r && r.ok === false && r.reason) { addLog(r.reason, 'warn'); centerToast(r.reason); } } });
    }
    // 结局「达成」按钮：留在右下角（跟当前场景相关，只在满足条件时出现，不算常年遮挡）。
    // 结局：达成（doEnding）与结算（settleEnding）分开走 —— id 带 settle_ 前缀的是"看结算画面"。
    // ⛔ 「结算 · 结局」按钮**不再挂在这里**：它们不跟场景绑定（连大地图都会挂出来），常年压住右下角，
    //    作者 2026-09-23 定"放这里有点遮挡，收进属性栏人物图片下方"。
    //    现在统一渲染在「装备 → 属性」的人物立绘下方（见下面的 settleActions() 与属性标签页）。
    //    这里保留 settle_ 分支只是为了防御：万一以后有人把过滤去掉，也不会变成静默失败。
    acts.push(...Game.checkEndingActions().filter(a => a.id.indexOf('settle_') < 0).map(a => ({ label:a.name, cls:'ending', fn:() => {
      if (a.id.indexOf('settle_') === 0) { const r = Game.settleEnding(a.id.slice(7)); if (r && r.ok === false && r.reason) addLog(r.reason, 'warn'); }
      else Game.doEnding(a.id);
    } })));
    for (const a of acts) {
      const b = el('button', 'action-btn float ' + (a.cls || ''), '');
      b.innerHTML = `<span class="act-name">${esc(a.label)}</span>`;
      if (a.disabled) b.classList.add('disabled');
      b.onclick = () => { if (a.disabled) { centerToast(a.reason || '条件不足'); return; } if (a.anim) withAnimation(a.anim.t, a.anim.l || a.label, a.fn); else a.fn(); };
      b.dataset.viewKey=a.label;fragment.appendChild(b);
    }
    box.style.display = acts.length ? '' : 'none';
    deps.dom.reconcile(box,fragment);
  }

function sceneActions() {
    const st = S();
    const sc = Game.sceneOf(st.scene);
    const out = [];
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
      const t = p.time ? `耗时${Game.pointMinutes(p)}分钟` : '';
      const tool=p.need?.tool ? Game.selectedTool(p.need.tool) : null;
      const daily = p.daily ? `今日余${Math.max(0, p.daily - ((st.pointUses || {})[p.id] || 0))}次` : '';
      a.desc = [`体力-${Game.pointEnergy(p)}`, t, daily,tool ? ITEMS[tool.id].name+(tool.source==='bag'?'':'（仓库）') : ''].filter(Boolean).join(' · ');
      if (p.type === 'hunt') { a.cls = 'danger'; if (Game.playerAtk() <= 5) { label += '（赤手空拳，危险！）'; a.label = label; } }
      if (p.type === 'adventure') a.cls = 'adv';
      if (p.type === 'trade') a.cls = 'trade';
      if (['gather','fish','hunt','drift','trap'].includes(p.type)) a.anim = { t: p.type === 'hunt' ? 'fight' : 'gather', l: p.name };
      out.push(a);
    }
    out.push({ label:'休息 ' + deps.restHours + ' 小时', fn:() => Game.rest(deps.restHours), disabled: st.stats.stamina >= Game.maxStam(), reason:'体力充沛' });
    return out;
  }
    return Object.freeze({prefetchScenes,renderScene,renderAtlantisBuildings,pointWorkSummary,renderHotspots,settleActions,renderExtras,sceneActions});
  }
  return Object.freeze({create});
})();
