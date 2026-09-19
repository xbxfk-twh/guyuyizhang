/* ============================================================
   孤屿遗章 · 界面层
   ============================================================ */
const UI = (() => {
  let view = 'scene';        // scene | map
  let craftTab = 'none';
  // 物品立绘雪碧图（4x4）：{ itemId:[列,行] }，无映射则用汉字字形
  const SPR = { water:1, wood:1, branch:1, thatch:1, flint:1, stone:1, fish:1, berry:1, herb:1, mushroom:1, meat:1, hide:1, resin:1, bamboo:1, clay:1, salt:1, carrot:1, wheat:1, honey:1, wildveg:1, cactusfruit:1, snowlotus:1, leather:1, cloth:1, plank:1, stonebrick:1, ironore:1, ironingot:1, steelingot:1, charcoal:1, silk:1, pearl:1, sinew:1, tusk:1, horn:1, snakegall:1, herbPaste:1, salve:1, blueBull:1, zhangLaoJi:1, antidote:1, vegSoup:1, vegFry:1, meatSoup:1, meatStew:1, roastFish:1, roastMeat:1, jerky:1, smokedFish:1, furCoat:1, grassArmor:1, woodShield:1, ironShield:1, axeStone:1, axeIron:1, pickStone:1, pickIron:1, hoe:1, rod:1, net:1, trap:1, club:1, spear:1, torch:1, rope:1, vine:1, bow:1, arrow:1, eagleArrow:1, ironSword:1, steelSword:1, blackSword:1, ironGreatSword:1, ironDagger:1, knifeStone:1, pickSteel:1, pickBlack:1, axeSteel:1, ironArmor:1, steelArmor:1, blackArmor:1, leatherArmor:1, grassCloth:1, hempCloth:1, leatherCloth:1, supplybox:1, driftbottle:1, namecard:1, beibi:1, coin:1, slate:1, relic:1, dragonbone:1, fossil:1, niter:1, sulfur:1, seasalt:1, gunpowder:1, blackingot:1, mithrilingot:1, spyglass:1, wool:1, felt:1, nail:1, ironpart:1, tile:1, claypot:1, basket:1, seedCarrot:1, seedWheat:1, seedHerb:1, honeyWater:1, tea:1, lotusPill:1, pearlNeck:1, shellAmulet:1, beastFang:1, fiber:1, bambooShoot:1, venom:1, poisonCoat:1, goldore:1, crystal:1, blackiron:1, mithril:1, eaglefeather:1, shipwood:1, sharkfin:1, wolfkingpelt:1, queenSilk:1, pole:1, canvas:1, smokedMeat:1, saltedMeat:1, mushroomSoup:1, tinder:1, steelShield:1, bandage:1, smokeBomb:1, diveSuit:1, diveSuit2:1, diveMask:1, goggles:1, lightWeak:1, lightStrong:1, sourceOre:1, sourceBar:1, deepCoral:1, anctDevice:1, pearlGranule:1, coralArmor:1, sourceArmor:1, coralBlade:1, sourceSpear:1, thruster:1, bpDive:1, bpGunpowder:1, bpFurnace:1, bpShip:1, bpBlack:1, bpLotus:1, rot:1, seachart:1 };
  // 有「深海琥珀」彩色图标的物品（放在 assets/img/items-accent/）。
  // 没做彩色版的物品会自动回退用黑白版，所以这个名单可以一项项慢慢补。
  // 有「深海琥珀」彩色图标的物品（放在 assets/img/items-accent/）。没彩色版的会自动回退黑白。
  const ACCENT = { pistol:1, bullet:1, brokenPistol:1, deepCore:1, divineBow:1 };
  // 常驻彩色的物品（不受皮肤影响）：限定物只有彩色版，选了墨白皮肤也要保持彩色。
  // 不这么分的话，墨白皮肤下会去 items/ 找一个不存在的文件，图标直接裂掉。
  const ALWAYS_COLOR = { divineBow:1 };
  function itemIcon(id) {
    const it = ITEMS[id];
    if (!(id in SPR)) return `<span class="inv-glyph">${it.glyph}</span>`;
    const dir = (ALWAYS_COLOR[id] || (skin === 'accent' && ACCENT[id])) ? 'items-accent' : 'items';
    return `<img class="item-icon" src="assets/img/${dir}/${id}.png?v=${window.BUILD_VER || 'v1.09'}" alt="" onerror="this.style.display='none'">`;
  }
  // 牧场与蛋料理的新物品图标（单独挂载，避免改动上面那行长表出错）
  Object.assign(SPR, { hay:1, egg:1, friedEgg:1, bigOmelette:1, superEgg:1, chick:1,
    rareFishA:1, rareFishB:1, rareFishC:1, rareFishD:1, rareFishE:1, pistol:1, bullet:1, brokenPistol:1, deepCore:1, atlantisCore:1, energyCrystal:1, hornAmulet:1, bpPistol:1, bpBullet:1, bpCoralBlade:1, bpCoralArmor:1, bpThruster:1, bpSourceSpear:1, bpSourceArmor:1, vampire:1, dodge:1, satchel:1, bloodvest:1, atlantisSeed:1,
    divineBow:1 });
let modal = null;          // 当前弹窗渲染函数
let modalOpenedAt = 0;     // 弹窗打开的毫秒时间戳（防"点击穿透"，见 showModal 附近的说明）
  let currentZone = null;

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const S = () => Game.S();

  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // ---------- 绑定 ----------
  Game.bind({
    onLog: (text, cls) => addLog(text, cls),
    onChange: () => render(),
    // 存档写不进去（配额满 / 浏览器限制）时，必须让玩家知道，并马上引导他导出存档码
    onSaveFail: (err) => {
      addLog('⚠ 存档写入失败！请立刻到「菜单 → 备份·读档」导出存档码备份，然后刷新页面重试。', 'danger');
      try { centerToast('存档写入失败！'); } catch (e) {}
      showModal('overlay', { title:'存档写入失败', text:`浏览器没能把存档写进本地存储（${(err && err.name) || '未知原因'}）。\n\n这通常是存储空间满了或被浏览器限制。\n\n请现在就去「菜单 → 备份·读档」导出存档码（复制到微信/备忘录都行），然后刷新页面；在修复前请不要再继续玩。`, choices:[
        { label:'知道了', ok:()=>{} },
        { label:'去导出存档码', ok:()=>showModal('codex', { mode:'export', code: Game.exportCode() }) },
      ]});
    },
    // 另一个标签页/窗口写入了更新的进度：默认不覆盖，交给玩家决定
    onSaveConflict: () => {
      if (window.__guyuSaveConflictShown) return;
      window.__guyuSaveConflictShown = true;
      addLog('⚠ 检测到另一个标签页有更新的进度，本页没有覆盖它（避免丢档）。', 'warn');
      showModal('overlay', { title:'检测到另一个标签页', text:'这个游戏在另一个标签页/窗口里有更新的进度。\n\n为了避免用旧进度覆盖新进度，本页暂时不会自动存档。\n\n最稳的做法：关掉多余的标签页，只留最新在玩的那一个；如果你确定本页才是最新的，再选「用本页覆盖」。', choices:[
        { label:'用本页覆盖', ok:()=>{ window.__guyuSaveConflictShown = false; Game.forceSave(); addLog('已用本页进度覆盖存档。', 'good'); } },
        { label:'我知道了（不覆盖）', ok:()=>{} },
      ]});
    },
    onFight: (kind, C) => renderCombat(kind, C),
    onEnding: (id, reason) => showEnding(id, reason),
    onOverlay: (cfg) => {
      const k = cfg && cfg.kind;
      if (k === 'atlAnim') { atlantisTravelAnim(() => Game.travel('atlantis')); return; }
      // ⚠️ 这张白名单要和 showModal 里支持的 kind 对齐：kind 不在这里就会落到最后的通用
      //    'overlay' 分支、渲染成一个空壳窗口（只剩标题）。新加弹窗时务必往这里补。
      if (['farm','black','town','mission','info','atlTrade','daily'].includes(k)) showModal(k, cfg);
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
    if (logMode === 'fade') { const l = $('#log'); if (l) { l.classList.remove('dim'); clearTimeout(logFadeTimer); logFadeTimer = setTimeout(() => l.classList.add('dim'), 3000); } }
    AudioFX.notify(cls);
  }
  // ---------- 皮肤包（设置里可改，存在本机、跨存档） ----------
  // 默认纯黑白（木刻原味）；skin-accent = 深海琥珀上色版
  const SKINS = [
    { id: 'ink',    name: '墨白原味', desc: '纯黑白木刻，默认皮肤',        cls: '' },
    { id: 'accent', name: '深海琥珀', desc: '深海navy + 琥珀金手绘上色',   cls: 'skin-accent' },
    // 「彩绘卡面」：界面配色不变，只把人物立绘整套换成全彩卡面
    //   放图位置：assets/img/identities-card/<身份id>.png（缺哪张就自动回退到默认立绘，不会裂图）
    { id: 'card',   name: '彩绘卡面', desc: '人物立绘换成全彩卡面（界面配色不变）', cls: '', portrait: 'identities-card' },
  ];
  let skin = (() => {
    try { const v = localStorage.getItem('guyuyizhang_skin'); return SKINS.some(s => s.id === v) ? v : 'ink'; }
    catch (e) { return 'ink'; }
  })();
  function skinCls(id) { const s = SKINS.find(x => x.id === id); return s ? s.cls : ''; }
  function applySkin() {
    for (const s of SKINS) if (s.cls) document.body.classList.toggle(s.cls, s.id === skin);
    if (document.getElementById('top-day')) render();   // 已进游戏：立刻重绘，让物品图标换成对应皮肤那套（items / items-accent）
  }
  function setSkin(id) {
    if (!SKINS.some(s => s.id === id)) return;
    skin = id;
    try { localStorage.setItem('guyuyizhang_skin', skin); } catch (e) {}
    applySkin();
  }
  function skinName() { const s = SKINS.find(x => x.id === skin); return s ? s.name : '墨白原味'; }
  // ---------- 人物立绘（受皮肤包控制）----------
  function portraitPath(id) {
    const s = SKINS.find(x => x.id === skin);
    const dir = (s && s.portrait) || 'identities';
    return `assets/img/${dir}/${id}.png?v=${(typeof window !== 'undefined' && window.BUILD_VER) || '1'}`;
  }
  // 皮肤包里缺这张图 → 自动退回默认那套；默认也没有 → 直接隐藏（避免裂图）
  window.__portraitFail = function (img, id) {
    if (img.dataset.fb) { img.style.display = 'none'; return; }
    img.dataset.fb = '1';
    img.src = `assets/img/identities/${id}.png?v=${(typeof window !== 'undefined' && window.BUILD_VER) || '1'}`;
  };

  // ---------- 日志栏显示方式（设置里可改，存在本机、跨存档） ----------
  let logMode = (() => { try { const v = localStorage.getItem('guyuyizhang_logmode'); return ['always', 'fade', 'hidden'].includes(v) ? v : 'always'; } catch (e) { return 'always'; } })();
  let logFadeTimer = null;
  function applyLogMode() {
    const l = $('#log');
    document.body.classList.toggle('log-hidden', logMode === 'hidden');
    document.body.classList.toggle('log-fade', logMode === 'fade');
    if (!l) return;
    l.style.display = (logMode === 'hidden') ? 'none' : '';
    clearTimeout(logFadeTimer);
    if (logMode === 'fade') logFadeTimer = setTimeout(() => l.classList.add('dim'), 3000);
    else l.classList.remove('dim');
  }
  function setLogMode(m) {
    logMode = ['always', 'fade', 'hidden'].includes(m) ? m : 'always';
    try { localStorage.setItem('guyuyizhang_logmode', logMode); } catch (e) {}
    applyLogMode();
  }
  // 日志栏：尺寸三档 + 收起/展开（都记在本机）
  const LOG_WIDTHS = { narrow: 190, mid: 250, wide: 330 };
  let logSize = (() => { try { const v = localStorage.getItem('guyuyizhang_logw'); return LOG_WIDTHS[v] ? v : 'mid'; } catch (e) { return 'mid'; } })();
  let logCollapsed = (() => { try { return localStorage.getItem('guyuyizhang_logcollapse') === '1'; } catch (e) { return false; } })();
  // 营地里的「当前目标」提示：作者 2026-09-19 加开关（本机偏好，存 localStorage）
  let showObjective = (() => { try { return localStorage.getItem('guyuyizhang_obj') !== '0'; } catch (e) { return true; } })();
  function setShowObjective(on) {
    showObjective = !!on;
    try { localStorage.setItem('guyuyizhang_obj', showObjective ? '1' : '0'); } catch (e) {}
    renderObjective();
  }
  function logWidthFor(w) {
    const base = LOG_WIDTHS[logSize] || 250;
    return Math.round(Math.min(w * 0.5, Math.max(150, Math.min(380, base * (w < 700 ? 0.8 : 1)))));
  }
  function setLogSize(s) {
    logSize = LOG_WIDTHS[s] ? s : 'mid';
    try { localStorage.setItem('guyuyizhang_logw', logSize); } catch (e) {}
    fitStage();
  }
  function applyLogCollapse() {
    document.body.classList.toggle('log-collapsed', logCollapsed);
    const g = document.getElementById('log-grip');
    if (g) { g.textContent = logCollapsed ? '▶' : '◀'; g.title = logCollapsed ? '展开日志栏' : '收起日志栏'; }
  }
  function bindLogCollapseBtn() {
    if (document.getElementById('log-grip')) return;
    const b = el('button', '', '◀');
    b.id = 'log-grip';
    b.onclick = () => {
      logCollapsed = !logCollapsed;
      try { localStorage.setItem('guyuyizhang_logcollapse', logCollapsed ? '1' : '0'); } catch (e) {}
      applyLogCollapse(); fitStage();
    };
    document.body.appendChild(b);
    applyLogCollapse();
  }
  function alignLogGrip() {
    const g = document.getElementById('log-grip');
    const bb = document.getElementById('btn-backmap');
    if (!g) return;
    if (!bb || !bb.offsetHeight) { g.style.display = 'none'; return; }   // 标题页等没有「返回地图」的场合，整个隐藏
    g.style.display = 'flex';
    const r = bb.getBoundingClientRect();
    g.style.left = Math.round(r.right + 8) + 'px';
    g.style.top = Math.round(r.top) + 'px';
    g.style.height = Math.round(r.height) + 'px';   // 高度跟「返回地图」一致
    g.style.minHeight = Math.round(r.height) + 'px';
  }
  function renderObjective() {
    const o = $('#objective');
    if (!o) return;
    const st = S();
    // 只在营地显示当前目标；设置里可以整个关掉（作者 2026-09-19）
    if (!st || st.scene !== 'camp' || !showObjective) { o.innerHTML = ''; return; }
    const obj = Game.currentObjective();
    o.innerHTML = obj ? `<span class="obj-mark">◈</span> 当前目标：${esc(obj)}` : '';
  }

  // ---------- 主渲染 ----------
  function render() {
    try { renderInner(); }
    catch (e) { onRenderCrash(e); }
  }
  // ⚠️ 玩家反馈"上午还好好的，下午一开就一直闪退"。手机 WebView 里的"闪退"通常是页面抛异常
  //    或者被系统判定内存吃紧后杀掉。纯前端游戏最怕的是：读档后某一步抛异常 → **每次打开都崩**，
  //    玩家再也进不去、还没法导出存档。所以这里加一道自检：
  //    ① 把最后一次报错留在本机  ② 数"连续几次启动没走到渲染成功"  ③ 连着崩就把玩家放进安全模式。
  const BOOT_KEY = 'guyuyizhang_boot', CRASH_KEY = 'guyuyizhang_crashes', ERR_KEY = 'guyuyizhang_lasterr';
  const SVCRASH_KEY = 'guyuyizhang_savecrash';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function recordError(msg) { lsSet(ERR_KEY, String(msg === undefined ? 'unknown' : msg).slice(0, 300)); }
  function bootCrashes() { return parseInt(lsGet(CRASH_KEY) || '0', 10) || 0; }
  function noteBootStart() {
    let prevOk = false;
    try { const p = lsGet(BOOT_KEY); prevOk = !!(p && JSON.parse(p).ok); } catch (e) {}
    const n = prevOk ? 0 : bootCrashes() + (lsGet(BOOT_KEY) ? 1 : 0);
    lsSet(CRASH_KEY, String(n));
    lsSet(BOOT_KEY, JSON.stringify({ at: Date.now(), ok: false }));
    return n;
  }
  function noteBootOk() { lsSet(BOOT_KEY, JSON.stringify({ at: Date.now(), ok: true })); lsSet(CRASH_KEY, '0'); }
  // ⚠️ 以前 noteBootOk() 只在"进入游戏主界面"时才调，于是"只打开标题页就退出"也被当成崩溃 ——
  //    玩家反馈"什么叫刷新一次就启动异常，太频繁了"（安全模式误报）。
  //    现在分成两个计数：① 启动崩溃（连标题页都没出来）② 进游戏后崩溃（读档就崩那种）。
  function inGameCrashes() { return parseInt(lsGet(SVCRASH_KEY) || '0', 10) || 0; }
  function noteInGameCrash() { const n = inGameCrashes() + 1; lsSet(SVCRASH_KEY, String(n)); return n; }
  function clearInGameCrash() { lsSet(SVCRASH_KEY, '0'); }
  function onRenderCrash(e) {
    const msg = (e && (e.message || e)) + ' @ ' + ((e && e.stack) ? String(e.stack).split('\n')[1] || '' : '');
    recordError(msg);
    noteInGameCrash();   // 这一崩发生在"已经进游戏"之后（启动本身成功的）→ 记到另一个计数里
    try { console.error('[孤屿遗章] 渲染出错：', e); } catch (err) {}
    const t = document.getElementById('crash-toast');
    if (!t) {
      const d = document.createElement('div');
      d.id = 'crash-toast';
      d.style.cssText = 'position:fixed;left:50%;bottom:calc(var(--navh,30px) + 8px);transform:translateX(-50%);z-index:3000;'
        + 'background:rgba(24,21,12,0.96);border:1px solid #c9b98a;color:#efe9d6;padding:6px 12px;border-radius:8px;font-size:12px;max-width:92vw';
      d.textContent = '界面出错了（已记录，可在菜单→备份里导出存档码）：' + String(msg).slice(0, 90);
      document.body.appendChild(d);
      setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 8000);
    }
  }
  window.addEventListener('error', (e) => { recordError((e && (e.message || (e.error && e.error.message))) || 'error'); });
  window.addEventListener('unhandledrejection', (e) => { recordError((e && e.reason && (e.reason.message || e.reason)) || 'rejection'); });
  function renderInner() {
    const st = S();
    if (!st) return;
    if (!$('#top-day')) return;   // 游戏主界面尚未挂载（标题/选择画面阶段）
    // 进入地图（从场景回到地图）→ 自动把"你所在的地方"对到画面中央，但不许拖出地图边界
    const wasMap = _lastView === 'map';
    _lastView = view;
    document.body.classList.toggle('on-map', view === 'map');
    renderTut(st);
    renderTopbar();
    renderObjective();
    if (view === 'map') renderMap(!wasMap);
    else renderScene();
    renderExtras();
    bindLogGrip();   // 日志可上下滑（热点/箭头优先）；只挂一次
    bindLogCollapseBtn();   // 日志栏收起/展开按钮；只挂一次
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
    noteBootOk();        // 这一帧渲染完了 = 这次启动没崩，清掉崩溃计数
    clearInGameCrash();  // 游戏界面正常渲染 = 上次"读档就崩"的状态已经好了
  }
  let lastEnv = null;

  // ---------- 动作动画（采集/建造/制造/攻击）+ 二倍速 ----------
  let animFast = false;
  let animSpeed = (() => { try { const v = parseInt(localStorage.getItem('guyuyizhang_anim') || '1', 10); return (v >= 1 && v <= 3) ? v : 1; } catch (e) { return 1; } })();
  let restHours = (() => { try { const v = parseInt(localStorage.getItem('guyuyizhang_rest') || '1', 10); return (v >= 1 && v <= 3) ? v : 1; } catch (e) { return 1; } })();   // 休息时长：1→2→3 循环
  let uiBusy = false;
  let prevCampBuilds = new Set();
  let prevMapBuilds = new Set();
  const ANIM_MS = { gather: 3000, build: 3000, craft: 3000, fight: 1000, sleep: 2600, rest: 2000 };
  const ANIM_GLYPH = { gather:'采', build:'建', craft:'制', fight:'战', sleep:'眠', rest:'歇' };
  function showBusy(type, label, imgHint) {
    const b = $('#busy');
    if (!b) return;
    const im = imgHint || (type === 'fight' ? 'sword' : type === 'build' ? 'hammer_icon' : type === 'craft' ? 'pot' : type === 'sleep' ? 'sleep_night' : 'axe_icon');
    const calm = (['pot','rest','dive','fish','gather','sleep_nap','sleep_night'].includes(im));   // 这些不挥砍、也无刀光
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
    // 冻结期间在时间前标个 ⏸：让玩家知道"不是卡住了，是看面板时时间停住了"
    $('#top-time').textContent = (Game.timeFrozen && Game.timeFrozen() ? '⏸ ' : '') + Game.fmtTime();
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
    if (st.statuses.heat) sts.push('中暑：夏天穿太厚，每小时-3生命');
    if (st.statuses.fear) sts.push('恐惧');
    // 精神低落会压低体力上限（蓝牛的代价就体现在这里）
    if (st.stats.spirit < 20) sts.push('精神恍惚：体力上限-20%、采集耗时+10%');
    else if (st.stats.spirit < 50) sts.push('精神低落：体力上限-10%');
    $('#status-badges').innerHTML = sts.map(s => `<span class="badge danger">${s}</span>`).join('');
  }

  // ---------- 地图视图（带缓存：底图只加载一次，箭头动态刷新） ----------
  let mapBuilt = false;
  let mapPanY = 0;            // 大地图上下平移（像素）
  let mapPanX = 0;            // 大地图左右平移（恒为 0：宽度已经和屏幕一致，横向锁死）
  let _lastView = null;
  // ---------- 大地图的尺寸规则（作者 2026-09-15 最终定调）----------
  // 【宽度 = 屏幕宽度】（手机 / 平板 / 电脑一视同仁），高度按原图比例算出来，
  //  多出来的部分靠上下拖动看。横向锁死（不留横向拖动，也不会左右裁掉内容）。
  //  ⛔ 以前用的是 cover（等比放大到"盖住整屏"）：为了让高度也铺满，图片被放得比屏幕宽，
  //     左右两边就被裁掉了 —— 玩家看到的正是"地图没显示完全"。现在不用那套了。
  function mapBox(iw, ih, bw, bh) {
    if (!iw || !ih || !bw || !bh) return null;
    const w = bw, h = ih * (bw / iw);
    return { w, h, left: 0, top: (bh - h) / 2, maxPan: Math.max(0, (h - bh) / 2) };
  }
  // ---------- 铺满（cover）：图片铺满舞台，热点层跟着同一套坐标缩放 ----------
  // 舞台现在吃满整个画面区（不再固定 16:9），所以图片一律按"铺满 + 可上下拖"来摆：
  // 图片内容盒 = 等比缩放到盖住舞台，多出来的纵向部分靠拖动看，热点/箭头始终贴在画面上。
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
  // 只更新位置（拖动时每帧走这里，不做昂贵的贴边重排）
  function applyMapPan() {
    const img = $('#map-img'), wrap = $('#map-wrap');
    if (!img || !wrap || !img.naturalWidth) return null;
    const box = mapBox(img.naturalWidth, img.naturalHeight, wrap.clientWidth, wrap.clientHeight);
    if (!box) return null;
    mapPanY = Math.max(-box.maxPan, Math.min(box.maxPan, mapPanY));
    mapPanX = 0;          // 宽度已经和屏幕一致：横向没有可拖的余量，也不允许左右裁切
    applyBox('#map-img', box, mapPanY, 0);
    applyBox('#map-arrows', box, mapPanY, 0);
    applyBox('#map-buildings', box, mapPanY, 0);
    return box;
  }
  function fitMapArrowsToImage(reset) {
    const img = $('#map-img'), wrap = $('#map-wrap');
    if (!img || !wrap || !img.naturalWidth) return;
    if (reset) { mapPanY = 0; mapPanX = 0; }
    if (!applyMapPan()) return;
    fitMapArrowsInView();
  }
  // 场景同样铺满：热点/建筑精灵跟着图片内容一起走，太宽的画面可以上下拖看
  let scenePanY = 0;
  function applyScenePan() {
    const img = $('#scene-img'), wrap = $('#scene-wrap');
    if (!img || !wrap || !img.naturalWidth) return null;
    const box = coverBox(img.naturalWidth, img.naturalHeight, wrap.clientWidth, wrap.clientHeight, 1);
    if (!box) return null;
    scenePanY = Math.max(-box.maxPan, Math.min(box.maxPan, scenePanY));
    applyBox('#scene-img', box, scenePanY);
    applyBox('#hotspots', box, scenePanY);
    applyBox('#camp-buildings', box, scenePanY);
    return box;
  }
  function fitSceneLayers(reset) {
    if (reset) scenePanY = 0;
    applyScenePan();
  }
  // 上下拖动（地图 / 场景共用）：按住画面空白处拖，按热点和按钮不算拖动
  function bindPan(sel, getPan, setPan, settle) {
    const wrap = $(sel);
    if (!wrap || wrap.dataset.panBound) return;
    wrap.dataset.panBound = '1';
    let dragging = false, startY = 0, startPan = 0, moved = false;
    wrap.addEventListener('pointerdown', (e) => {
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
      setPan(getPan() + e.deltaY);
      clearTimeout(wheelT); wheelT = setTimeout(settle, 140);   // 滚轮停下再重排贴边标签，省性能
    }, { passive: false });
  }
  function bindMapPan() {
    bindPan('#map-wrap', () => mapPanY, (v) => { mapPanY = v; applyMapPan(); }, fitMapArrowsInView);
  }
  // 日志：可以上下滑看历史，但优先级低于热点/箭头
  //   1) 按到"日志下面的热点/箭头"→ 把这一下转发给它
  //   2) 日志自己有内容可滚 → 交给浏览器原生滚动
  //   3) 没得滚 → 拖着直接带动地图/场景平移（等于以前"日志不挡地图"）
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
      dragging = true; moved = false; startY = e.clientY;
      startPan = (view === 'map') ? mapPanY : scenePanY;
      if (log.setPointerCapture) { try { log.setPointerCapture(e.pointerId); } catch (err) {} }
    });
    log.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dy = e.clientY - startY;
      if (!moved && Math.abs(dy) < 4) return;
      moved = true;
      e.preventDefault();
      if (view === 'map') { mapPanY = startPan + dy; applyMapPan(); }
      else { scenePanY = startPan + dy; applyScenePan(); }
    });
    const stop = () => { if (!dragging) return; dragging = false; if (moved && view === 'map') fitMapArrowsInView(); };
    log.addEventListener('pointerup', stop);
    log.addEventListener('pointercancel', stop);
    log.addEventListener('pointerleave', stop);
  }
  // 贴边的箭头会被舞台裁掉（典型的：「↑ 返回孤岛」「珍珠洞窟」在亚克兰蒂斯地图最上面，
  // 箭头默认往上方展开，小屏上正好被顶边切掉一半）。
  // 这里按实际渲染位置逐个修正：顶出上边缘的翻成"箭头在上、标签在下"；顶到左右的往内推。
  // 地图热点：**完全锁定在地图上** —— 位置只由"地图百分比 + 地图自身的位移/缩放"决定。
  // 不做显示/隐藏判定、不做任何独立位移（曾经用 display:none 藏滑出画面的热点、
  // 用 marginLeft 把压边的标签推回画面，结果热点看起来"乱飘、还会突然消失"，作者明确要求拆掉）。
  // 现在滑出画面的热点就跟着地图一起滑出画面（被 #map-wrap 的 overflow:hidden 裁掉），拖回来自然重现。
  // 热点完全固定：位置只由地图坐标决定，不做任何显隐判定、不做任何独立位移。
  // ⚠️ 这里以前还有一条"贴顶时把箭头换到标签上方"的做法，拖动时会在阈值附近来回切换、
  //    还带 CSS transform 过渡 —— 看起来就是"热点自己有位移和动画"。玩家明确不要，已彻底删掉。
  //    所有场景一视同仁（山顶、珍珠洞窟和别的热点没有任何区别）。
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
  // ---------- 进地图：自动居中到"你现在所在的地方" ----------
  // 作者要求：进地图一定要自动居中（从营地出来就该看到营地），但**不许突破地图边界**——
  //   拖出黑边那种事不能干。所以：先算出"把锚点放到舞台正中"需要的平移量，
  //   再夹到"整张图仍然盖满舞台"的范围里。地图本身不够大时（宽屏上纵向常常只多几十像素），
  //   就居中到能居中的极限，锚点保证在画面里，绝不会出现空白。
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
    mapPanY = Math.max(-limY, Math.min(limY, wrap.clientHeight / 2 - ay));
    applyMapPan();
    return true;
  }
  function tryCenterMap() { if (mapPendingCenter && centerMapOnHere()) mapPendingCenter = false; }
  function renderMap(justEntered) {
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
      if (img) {
        img.onerror = () => { img.src = PAPER_FALLBACK; };
        img.onload = () => { fitStage(); fitMapArrowsToImage(); tryCenterMap(); };
        const mnight = Game.isNight(), mdusk = Game.isDusk();
        img.style.filter = mnight ? 'grayscale(1) brightness(0.5) contrast(1.1)' : mdusk ? 'grayscale(1) brightness(0.68) contrast(1.05)' : 'grayscale(1) brightness(0.92) contrast(1.05)';
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
      const want = st.scene === 'atlantis' ? 'assets/img/atlantis_map.png' : 'assets/img/map.png';
      if (mimg.dataset.world !== want) {   // 孤岛 ⇄ 海底换图：平移量归零，避免停在上一次的位置
        mimg.dataset.world = want; mimg.src = want;
        mapPanY = 0; mapPanX = 0;
      }
      mimg.classList.add('cover');   // 两张图都铺满舞台（左右不留黑边），纵向余量靠上下拖
      const mn = Game.isNight(), md = Game.isDusk(); mimg.style.filter = (st.scene === 'atlantis') ? 'grayscale(1) brightness(0.92) contrast(1.05)' : (mn ? 'grayscale(1) brightness(0.5) contrast(1.1)' : md ? 'grayscale(1) brightness(0.68) contrast(1.05)' : 'grayscale(1) brightness(0.92) contrast(1.05)');
    }
    fitMapArrowsToImage();
    refreshMapArrows(st);
    // 刚进地图（或刚落地）→ 居中一次；之后玩家自己拖，不再抢镜头。
    // 热点位置始终只由地图坐标决定，这里只动"地图停在哪儿"。
    if (justEntered) mapPendingCenter = true;
    tryCenterMap();
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
    const stageW = Math.max(600, wrap.clientWidth || (stage ? stage.offsetWidth : 900));
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
      // 按"深度"排叠放次序：y 越大 = 站得越靠画面下方 = 越近，画在越前面。
      // 玩家反馈"篝火被仓库挡住"——原来大家都用 CSS 的 z-index:4，谁在 DOM 里靠后谁就盖住别人，
      // 仓库排在篝火后面，于是把篝火压掉了。现在按 y 排序，篝火在仓库前面。
      // 数值压在 10 以内：热点/箭头层是 10，标签要永远在最上面。
      p.style.zIndex = String(Math.max(1, Math.min(9, Math.round(pos[1] / 10))));
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
          ha.dataset.zone = 'home';   // 同样打标签：它是 ▲，锚点取 glyph 顶边中点
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
        a.dataset.zone = zid;   // 给箭头打上区域 id：旅行动画据此精确取"箭头尖"，不再用坐标模糊匹配
        a.innerHTML = `<span class="arrow-label">${pos.label || z.name}</span><span class="arrow-glyph">▼</span>`;
        a.onclick = () => {
          if (here) { view = 'scene'; render(); return; }
          startAtlantisTravel(zid);
        };
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
      a.dataset.scene = id;   // 给箭头打上场景 id：旅行动画据此精确取"箭头尖"
      a.innerHTML = `<span class="arrow-label">${sc.name}<span class="arrow-danger">${'●'.repeat(Math.min(5, danger))}</span></span><span class="arrow-glyph">▼</span>`;
      if (unlocked) {
        a.onclick = () => {
          if (id === st.scene) { view = 'scene'; render(); return; }   // 点当前地点 = 进入该场景（从地图回场景）
          // ⚠️ 提前拦一道：雷暴 / 保暖不够 / 体力不够时，原来会先弹「前往」确认框，
          //    点了才在左侧日志里写一行就算失败 —— 玩家反馈的"点不了去山顶"多半是这么来的。
          //    现在当场在屏幕中央说清原因，连确认框都不弹（省一次白点的交互）。
          const chk = Game.canTravel(id);
          if (!chk.ok) { addLog(chk.reason, 'warn'); centerToast(chk.reason); return; }
          const c = Game.travelCost(id);
          if (st.stats.stamina < c.energy) { const why = `体力不够，走不动这么远（需要 ${c.energy}，当前 ${Math.floor(st.stats.stamina)}）。`; addLog(why, 'warn'); centerToast(why); return; }
          showModal('overlay', { title:'前往 ' + sc.name, text:`耗时 ${c.time} 分钟 · 消耗体力 ${c.energy}。`, choices: [
            { label:'前往', ok:() => { AudioFX.play('travel'); startTravel(id); } },
            { label:'取 消', ok:() => {} },
          ]});
        };
      } else {
        a.onclick = () => {
          const why = `那里还被迷雾笼罩。${sc.unlockWatch > watch ? `需要更高等级的瞭望台（${sc.unlockWatch} 级）。` : ''}${sc.needBoat ? `需要合适的船。` : ''}`;
          addLog(why, 'warn'); centerToast(why);
        };
      }
      wrap.appendChild(a);
    }
    fitMapArrowsInView();
  }

  // ---------- 舞台自适应：画面区多大，舞台就多大（铺满整个红框，左右不留黑边） ----------
  function fitStage() {
    const m = $('#main');
    const stage = $('#scene-wrap') || $('#map-wrap');
    if (!m || !stage) return;
    const w = m.clientWidth, h = m.clientHeight;
    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
    // 把日志/返回地图/休息按钮定位到画面左侧/右下角
    const app = $('#app');
    if (!app) return;
    const sr = stage.getBoundingClientRect(), ar = app.getBoundingClientRect();
    const left = sr.left - ar.left, top = sr.top - ar.top;
    // 画面铺满后日志就压在图上：给一个读得舒服的宽度，并交给 .overlap 那层淡渐隐兜底
    const log = $('#log');
    if (log) {
      const lw = logWidthFor(w);
      log.style.width = lw + 'px'; log.style.left = '0px'; log.style.top = '0px';
      log.classList.add('overlap');
    }
    alignLogGrip();   // 无条件跑：没有「返回地图」按钮（标题页等）时它自己会隐藏
    const obj = $('#objective');
    if (obj) { obj.style.left = (left + sr.width - Math.min(460, sr.width * 0.5) - 12) + 'px'; obj.style.top = (top + 10) + 'px'; }
    fitSceneLayers(false);
    fitMapArrowsToImage(false);
  }
  window.addEventListener('resize', () => { fitStage(); });   // 窗口变化后：舞台 + 场景热点 + 地图箭头位置全部重算

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
  // 行进动画期间把日志淡出：地图左下角（含行进线的起点）会被日志盖住，
  // 盖住就看不出"从一个热点走到另一个热点"。动画结束自动恢复。
  function beginTravelFx() { document.body.classList.add('traveling'); }
  function endTravelFx() { document.body.classList.remove('traveling'); }
  // 取某个箭头"glyph 尖端"的容器内坐标（向下 ▼ 的底边中点；返回孤岛那个是 ▲，取顶边中点）。
  // 用 data-zone / data-scene 精确定位，不再靠坐标模糊匹配——模糊匹配一旦对不上就会静默退回
  // "按百分比估算"，线就从箭头旁边出发，看起来"差一段"。
  function tipAnchor(inner, box, key, attr) {
    const sel = attr === 'zone' ? `[data-zone="${key}"]` : `[data-scene="${key}"]`;
    const el = inner.querySelector('.map-arrow' + sel);
    if (!el) return null;
    const g = el.querySelector('.arrow-glyph');
    if (!g) return null;
    const gr = g.getBoundingClientRect();
    const up = (g.textContent || '').indexOf('▲') >= 0;
    return { x: gr.left - box.left + gr.width / 2, y: (up ? gr.top : gr.bottom) - box.top };
  }
  function animAtlantis(A, B, zid) {
    traveling = true; view = 'map'; render();
    const inner = $('#map-arrows') || $('#map-wrap');   // 用"图片内容盒"当坐标系：箭头在哪，线就从哪起（原来用舞台会偏）
    if (!inner) { traveling = false; view = 'scene'; Game.setZone(zid); return; }
    const W = Math.max(10, inner.clientWidth), H = Math.max(10, inner.clientHeight);
    const box = inner.getBoundingClientRect();
    const pa = tipAnchor(inner, box, S().zone || 'habitat', 'zone');
    const pb = tipAnchor(inner, box, zid, 'zone');
    const fx = pa ? pa.x : A.x / 100 * W, fy = pa ? pa.y : A.y / 100 * H;
    const tx = pb ? pb.x : B.x / 100 * W, ty = pb ? pb.y : B.y / 100 * H;
    const dist = Math.hypot(tx - fx, ty - fy);
    const durMs = Math.round(Math.min(3000, Math.max(500, dist / Math.max(W, 1) * 3000)));
    beginTravelFx();
    const layer = makeTravelLayer(inner, W, H, fx, fy, tx, ty, S().zone || 'habitat', zid, 'zone');
    const dot = layer.querySelector('.travel-dot');
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / durMs);
      dot.style.left = (fx + (tx - fx) * p) + 'px'; dot.style.top = (fy + (ty - fy) * p) + 'px';
      if (p < 1) requestAnimationFrame(step);
      else { traveling = false; layer.remove(); endTravelFx(); view = 'scene'; Game.setZone(zid); }
    };
    requestAnimationFrame(step);
  }
  // 建行进层：坐标必须用【屏幕坐标系】，不能直接用箭头的容器坐标。
  // 因为地图比画面宽/高时，#map-arrows 会伸出画面外（left/top 为负），
  // 而 SVG 是按元素盒渲染的 —— 直接塞进去线会整体偏移（手机竖屏能偏几百像素），
  // 看起来就像"行进轨迹从别的地方过来的"。加上容器的偏移就对齐了。
  // fromKey/toKey 用来做闭环校正：实测"线端点 vs 箭头尖"的偏差并整体平移（保持线的方向不变）
  function makeTravelLayer(inner, W, H, fx, fy, tx, ty, fromKey, toKey, attr) {
    const layer = el('div', 'travel-layer', '');
    layer.innerHTML = `<svg style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:visible;pointer-events:none"><line x1="${fx}" y1="${fy}" x2="${tx}" y2="${ty}" stroke="rgba(240,240,234,0.8)" stroke-width="2.5" stroke-dasharray="10 8"/></svg><div class="travel-dot" style="left:${fx}px;top:${fy}px"></div>`;
    inner.appendChild(layer);
    // ⚠️ 闭环校正（这条线以前整体偏 136px、竖向还额外差 30px）：
    //    layer appendChild 到 inner 之后，定位基准是 inner 的**内边距盒**，而 inner 自己可能
    //    已经被平移/缩放 —— 按屏幕矩形直接放会重复计入一次偏移。
    //    所以不猜基准：先按 inner 的屏幕矩形放，再**实测**"线端点 vs 箭头尖"的差，整体补掉。
    const ib = inner.getBoundingClientRect();
    const lb = layer.getBoundingClientRect();
    layer.style.left = (parseFloat(layer.style.left || '0') + (ib.left - lb.left)) + 'px';
    layer.style.top = (parseFloat(layer.style.top || '0') + (ib.top - lb.top)) + 'px';
    const gTip = (key) => {
      if (!key) return null;
      const el2 = inner.querySelector('.map-arrow[data-' + (attr || 'scene') + '="' + key + '"]');
      const g = el2 && el2.querySelector('.arrow-glyph');
      if (!g) return null;
      const r = g.getBoundingClientRect();
      const up = (g.textContent || '').indexOf('▲') >= 0;
      return { x: r.left + r.width / 2, y: up ? r.top : r.bottom };
    };
    const pF = gTip(fromKey), pT = gTip(toKey);
    if (pF && pT) {
      const lb2 = layer.getBoundingClientRect();
      const svg = layer.querySelector('line');
      const lF = { x: lb2.left + parseFloat(svg.getAttribute('x1')), y: lb2.top + parseFloat(svg.getAttribute('y1')) };
      const lT = { x: lb2.left + parseFloat(svg.getAttribute('x2')), y: lb2.top + parseFloat(svg.getAttribute('y2')) };
      // 取两端偏差的平均做整体平移：这样线不会变形，只挪位置
      const ddx = ((pF.x - lF.x) + (pT.x - lT.x)) / 2, ddy = ((pF.y - lF.y) + (pT.y - lT.y)) / 2;
      if (Math.abs(ddx) > 0.5 || Math.abs(ddy) > 0.5) {
        layer.style.left = (parseFloat(layer.style.left) + ddx) + 'px';
        layer.style.top = (parseFloat(layer.style.top) + ddy) + 'px';
      }
    }
    return layer;
  }
  function startTravel(target) {
    const st2 = S();
    if (traveling) return;
    const chk = Game.canTravel(target);
    if (!chk.ok) { addLog(chk.reason, 'warn'); centerToast(chk.reason); return; }
    const cost = Game.travelCost(target);
    if (st2.stats.stamina < cost.energy) { addLog('你太累了，走不动这么远。休息一下。', 'warn'); centerToast('体力不够，走不动这么远。'); return; }
    if (target === st2.scene) { view = 'scene'; render(); return; }
    // 亚特兰蒂斯（海底）的旅行动画走专门那套：它的区域坐标在 ATLANTIS_MAP_ARROWS 里，
    // 用第一章地图的 MAP_ARROWS 会取到 undefined → 行进线从画面左上角窜出来。
    if (st2.scene === 'atlantis' || target === 'atlantis') {
      if (target === 'atlantis') { Game.travel('atlantis'); return; }   // 上浮/下潜：直接切，不做区域动画
      startAtlantisTravel(target); return;
    }
    traveling = true;
    view = 'map';
    render();
    const inner = $('#map-arrows') || $('#map-wrap');   // 同上：行进线的起终点与箭头严格同一套坐标
    if (!inner) { traveling = false; view = 'scene'; Game.travel(target); return; }
    const W = Math.max(10, inner.clientWidth), H = Math.max(10, inner.clientHeight);
    const f = MAP_ARROWS[st2.scene], t = MAP_ARROWS[target];
    // 坐标查不到就跳过动画直接过去，绝不让行进线从 (0,0) 左上角乱跑
    if (!f || !t || typeof f.x !== 'number' || typeof t.x !== 'number') {
      traveling = false; view = 'scene'; Game.travel(target); return;
    }
    // 锚点用【箭头 glyph 的尖端】，按 data-scene 精确取——不用百分比估算，也不用坐标模糊匹配
    const box0 = inner.getBoundingClientRect();
    const pa = tipAnchor(inner, box0, st2.scene, 'scene'), pb = tipAnchor(inner, box0, target, 'scene');
    const fx = pa ? pa.x : f.x / 100 * W, fy = pa ? pa.y : f.y / 100 * H;
    const tx = pb ? pb.x : t.x / 100 * W, ty = pb ? pb.y : t.y / 100 * H;
    const dist = Math.hypot(tx - fx, ty - fy);
    const durMs = Math.round(Math.min(3000, Math.max(500, dist / Math.max(W, 1) * 3000)));
    beginTravelFx();
    const layer = makeTravelLayer(inner, W, H, fx, fy, tx, ty, st2.scene, target, 'scene');
    const dot = layer.querySelector('.travel-dot');
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / durMs);
      dot.style.left = (fx + (tx - fx) * p) + 'px';
      dot.style.top = (fy + (ty - fy) * p) + 'px';
      if (p < 1) requestAnimationFrame(step);
      else { traveling = false; layer.remove(); endTravelFx(); view = 'scene'; Game.travel(target); }
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
          <div id="scene-vignette"></div>
          <div id="scene-name"></div>
          ${zoneHtml}
        </div>`;
      fitStage();
      fitSceneLayers(true);   // 换场景：画面铺满 + 平移归零
      bindPan('#scene-wrap', () => scenePanY, (v) => { scenePanY = v; applyScenePan(); }, () => {});
      const img = $('#scene-img');
      if (img) { img.onerror = () => { img.src = PAPER_FALLBACK; }; img.onload = () => { const hs = $('#hotspots'); if (hs) hs.classList.add('ready'); const sl = $('#scene-load'); if (sl) sl.classList.remove('show'); fitStage(); fitSceneLayers(false); const s2 = S(); if (s2 && s2.scene === 'camp') renderCampBuildings(s2); if (s2 && s2.scene === 'atlantis' && s2.zone === 'habitat') renderAtlantisBuildings(s2); }; }
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
    const stage = $('#scene-wrap'); const stageW = Math.max(600, wrap.clientWidth || (stage ? stage.offsetWidth : 900));
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
    const w2 = st.equipment.weapon2;
    const hasGun = (w && ITEMS[w] && ITEMS[w].id === 'pistol') || (w2 && ITEMS[w2] && ITEMS[w2].id === 'pistol');   // 主手副手都算（副手也能开火）
    let html = '<div class="modal-title">修补台</div><div class="overlay-text">礁石栖息地的修补台：修补潜水装备，也能校准源能手枪。</div><div class="help-list">';
    html += `<div class="help-item"><b>修补潜水装备</b><span>潜水服 / 氧气罩耐久恢复满（耗 深珊瑚×2）</span><button class="mini-btn" data-rfix="dive">修 补</button></div>`;
    html += `<div class="help-item"><b>校准源能手枪</b><span>${hasGun ? (st.pistolCalibrated ? '已校准 · 命中 70% · 可继续修耐久（耗 源矿×2）' : '未校准 · 命中 60% → 校准后 70%（耗 源矿×2）') : '需先把源能手枪装备到主手或副手'}</span><button class="mini-btn" data-rfix="pistol">校 准</button></div>`;
    const bp = Game.invCount('brokenPistol');
    html += `<div class="help-item"><b>修复破损的源能手枪${bp ? `（有${bp}）` : ''}</b><span>耗 源能晶石×1 + 源质锭×1</span><button class="mini-btn" data-rfix="broken">修 复</button></div>`;
    html += '</div></div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  function atlTradeModal() {
    let html = `<div class="modal-title">遗失的交易机</div>${walletBar()}<div class="overlay-text">一台还在运转的远古交易机，似乎认得亚克兰蒂斯的东西；它只认贝壳币，也只肯把本地的锻造图纸和神物交给你。</div>`;
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
    html += `</div><div class="modal-title" style="margin-top:8px">神物（每天 ${Math.round(Game.vendorRelicChance() * 100)}% 概率上架一件）</div><div class="help-list">`;
    if (!rv.id) html += rv.noStock
      ? '<div class="hint">机箱空空如也——今天没有上架神物，明天再来碰碰运气。</div>'
      : '<div class="hint">机箱空空如也——你已经把神物收全了。</div>';
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
    return t + '<div class="overlay-text">第三块石板：点亮全部九格。点一格，它自己和上下左右一起翻转。<br>点亮的格子会 <b style="color:#8a7346">亮起暖光 ✦</b>，目标是九格全亮。</div><div id="rune-status" class="overlay-text">已点亮 ' + lights.filter(v => v).length + '/9</div><div class="light-grid">' + lights.map((v,i) => `<button class="light-btn ${v ? 'on' : ''}" data-light="${i}"></button>`).join('') + '</div><div class="modal-actions"><button id="rune-cancel">取 消</button></div>';
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
    const rs = m.querySelector('#rune-status');   // 实时显示"已点亮 N/9"，别让玩家猜
    if (rs) rs.textContent = '已点亮 ' + lights.filter(v => v).length + '/9' + (lights.every(v => v) ? ' · 全亮了！' : '');
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
      // ⚠️ 这两个必须声明在 if 外面：下面的 innerHTML 在块外拼装，写进块里会 ReferenceError → 整个场景渲染中断
      let ritualReady = false;      // 材料齐了：标签写"举行仪式"
      let rewardMissing = false;    // 老存档：标记打了但奖励没拿 → 标签写"取回遗物"
      if (h.point) {
        const p = pts.find(q => q.id === h.point);
        if (!p) continue;
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
      d.innerHTML = `<span class="hot-glyph">${h.glyph || '●'}</span><span class="hot-label">${ritualReady ? '祭坛 · 举行仪式' : (rewardMissing ? '祭坛 · 取回遗物' : h.label)}${(ritualReady || rewardMissing) ? '' : onceTag}</span>`;
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
        else if (h.id === 'portal_make') { if (Game.invCount('slate') >= 3) startRunePuzzle(); else addLog('需要三块石板才能拼出传送石的符文（石板来自：山顶·石碑残迹的石板守卫、海岸遗迹、洞中遗迹）。', 'warn'); }
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
  // ⚠️ 这里原来有个 renderActions()，往 $('#actions') 里塞按钮 —— 但页面里根本没有 #actions 这个元素
  //    （真实容器是 #scene-actions，由下面的 renderExtras() 负责），而且这个函数从来没有被调用过。
  //    属于纯死代码（调用即报错），已删除。
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
    // 结局：达成（doEnding）与结算（settleEnding）分开走 —— id 带 settle_ 前缀的是"看结算画面"。
    // 结算被拒（比如本存档已经用别的结局收尾了）时必须把原因写进日志，别让按钮看着像坏的。
    acts.push(...Game.checkEndingActions().map(a => ({ label:a.name, cls:'ending', fn:() => {
      if (a.id.indexOf('settle_') === 0) { const r = Game.settleEnding(a.id.slice(7)); if (r && r.ok === false && r.reason) addLog(r.reason, 'warn'); }
      else Game.doEnding(a.id);
    } })));
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
        <button data-sleep="normal">🌙 安稳睡觉 · ${r.hours}小时<br><small>体力+${r.sta} · 生命${r.hp >= 0 ? '+' : ''}${r.hp} · 精神+${r.sp}</small></button>
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
    return { sta, hp, sp: 1 };
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
  // 救援面板：把本机所有还能读出来的存档痕迹列出来，挑一份恢复
  function rescueModal() {
    const list = Game.scanLocalSaves();
    let html = `<div class="modal-title">🛟 救援 · 找回被覆盖的存档</div>
      <div class="hint">下面是这台设备上还能读出来的所有进度痕迹，按时间从新到旧排。挑一份「恢复这一份」，它会立刻变成当前存档（并写回主存档）。</div><div class="help-list">`;
    if (!list.length) html += '<div class="help-item"><b>什么都没扫到</b><span>说明这台设备上已经没有可恢复的痕迹了——如果以前导出过「存档码」，用存档码还能把魂点、成就和备份槽搬回来。</span></div>';
    for (const it of list) {
      const when = it.at ? new Date(it.at).toLocaleString('zh-CN', { hour12: false }).slice(0, 16) : '时间未知';
      html += `<div class="help-item"><b>第 ${it.day} 天 · ${esc(it.identity || '')}</b>
        <span>${esc(it.label)}${it.at ? ` · ${when}` : ''}</span>
        <button class="mini-btn" data-rescue-go="${it.src}">恢复这一份</button></div>`;
    }
    html += '</div><div class="modal-actions"><button id="modal-back">返 回</button><button id="modal-close">关 闭</button></div>';
    return html;
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
    const rs = Game.rescueInfo();
    html += `<div class="help-item"><b>🛟 救援 · 找回被覆盖的存档</b><span>不小心开了新游戏、或被别的进度顶掉时，这里可以扫描本机还留着的所有存档痕迹（当前存档 / 开新档前自动保留的那一份 / 上一次自动保存 / cookie 镜像 / 三个备份槽），挑一份恢复。${rs ? `<br>已自动保留：<b>第 ${rs.day} 天</b>（${new Date(rs.at).toLocaleString('zh-CN', { hour12: false }).slice(0, 16)}）` : ''}</span>
      <div class="modal-actions"><button class="mini-btn" data-rescue="scan">扫描本机存档</button></div></div>`;
    html += `<div class="hint">换设备 / 换网址后如果记录不见了，用「存档码」可以把魂点、成就与全部备份槽搬过去。</div>
      <div class="modal-actions"><button data-codex="export">导出存档码</button><button data-codex="import">导入存档码</button><button id="modal-close">关 闭</button></div>`;
    return html;
  }
  let comTab = 'p1';
  function comHelpModal() {
    const tabs = [['p1','基础规则'],['p2','连攻规则']];
    let html = `<div class="modal-title">战斗规则</div><div class="tabs">${tabs.map(([k,l]) => `<button class="tab ${comTab === k ? 'active' : ''}" data-commtab="${k}">${l}</button>`).join('')}</div><div class="overlay-text">`;
    if (comTab === 'p1') html += '· 主手/副手各持一件单手武器；副手可放武器或盾牌（防御+格挡率）。<br>· 弓/枪先手：装备弓或手枪、且身上有弹药时，<b>战斗第一轮你先出手</b>（不会替你自动开火，射/跑/防全由你点）。<br>· 双持：伤害取两把平均；<b>攻速按"两把攻击力加权"平均</b>——快武器配重武器会被重武器拖慢，不再是"主手塞把匕首就白嫖攻速"（主副手完全等价，谁在主手都一样）。两把匕首 ×2，其余双持 ×1.5。<br>· 弹药：源能子弹只喂手枪、箭矢/鹰羽箭只喂弓，各扣各的。弹药不能装备到手上。<br>· <b>双持的耐久</b>：每次挥砍只磨损「当前挥出的那一把」，主副手每回合各挥一次（攻速快时还会追击连攻），所以一场战斗下来两把都会掉耐久——这是正常磨损，不是同步扣耐久。没装备在身上的同款武器不会掉耐久。<br>· 铁大剑：双手占主手、副手必须为空；伤害高、攻速慢、耐久好、造价昂贵。<br>· 匕首/快武器攻速快但伤害低；剑伤害中等攻速中。';
    else html += '· <b>攻速 = 出手频率</b>：按时间轴排出手权，谁快谁出手多。你点一次行动算你出手一次，这期间敌人按 <b>敌速 ÷ 我速</b> 的比例攒出手次数。<br>' +
      '· <b>你 6 打它 7 会是这样</b>：前几轮它先出手（你还手在后），它每轮攒 7/6 次——攒满第 2 次的那一轮，它先打你一下，第二下和你这一击<b>同时结算</b>（你这一下照样打出去，就算你被打倒也算）。<br>' +
      '· <b>你比它快就反过来了</b>：你 15 打速度 6 的遗迹守卫，它每轮只攒 0.4 次，平均每 2.5 轮才能还你一次手——你打 15 下，它大概只还 6 下。<br>' +
      '· 速度 6 打 18 的雪豹：它每轮攒 3 次，也就是你每出手一次都会被咬三口，先掂量一下。<br>' +
      '· 敌人带「先手」特性（雪羽鹰、雪豹）时永远先出手，不受这条影响。<br>' +
      '· 双持加成算进攻速：双刀 ×2、刀+剑/双剑 ×1.5。装备栏「人物属性 → 攻速」会写出你出手 N 次的时间里敌人能还几次手。';
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  function skillBody() {
    const info = Game.skillTreeInfo();
    return `<div class="skill-grid">${['gather','craft','combat'].map(k => {
      const i = info[k]; const maxed = i.lv >= i.max;
      const pct = maxed ? 100 : Math.min(100, i.cost ? i.exp / i.cost * 100 : 100);
      return `<div class="skill-col">
        <div class="skill-name">${i.glyph} ${i.name}</div>
        <div class="skill-desc">主干 ${i.lv}/${i.max} · 已投 ${i.picks.length} 点</div>
        <div class="skill-lv">${i.expName} ${i.exp}${maxed ? ' · 已满级' : ` / 下一级 ${i.cost}`}</div>
        <div class="skill-bar"><i style="width:${pct}%"></i></div>
        <button class="mini-btn" data-skilltree="${k}">展开技能树 ▶</button>
      </div>`;
    }).join('')}</div>
    <div class="hint">主干每升一级，从几个成长方向里选一个；分支技能有门槛和互斥。学错了可以「遗忘最末端」的技能，返还一半经验。</div>`;
  }
  function skillModal() {
    return `<div class="modal-title">技能 <span style="font-size:11px">采集／制造／战斗 · 点卡片展开技能树</span></div>${skillBody()}<div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
  }
  // ---------- 技能树（树状图：主干竖着一串，专项从两侧伸出来）----------
  // 作者 2026-09-18：要的就是"从上往下一串基础升级，两侧延伸专项升级，大量互斥"的树状图。
  // 布局：每一级一行（三栏：左侧专项 | 中间主干节点 | 右侧专项），主干用一条竖线串起来，
  //       专项节点按 need（需要主干几级）挂到对应行，互斥的一对强制分居左右、中间画红色虚线。
  function stNodeCard(kind, n) {
    const dots = '●'.repeat(n.lv) + '○'.repeat(Math.max(0, n.max - n.lv));
    const reqTag = n.req ? ` <span class="st-req">需${n.req}</span>` : '';
    const ico = n.icon ? `<img class="st-icon" src="assets/img/skills/${n.icon}.png" alt="" onerror="this.style.display='none'">` : '';
    // 学习按钮：**不管能不能点，都把要花的经验写上**（作者 2026-09-18：按钮上要有消耗）
    const act = n.canLearn
      ? `<button class="mini-btn" data-nodelearn="${kind}:${n.id}">学习（花 ${n.cost} 经验）</button>`
      : `<button class="mini-btn lockedb" disabled>学习（需 ${n.cost === null ? '—' : n.cost} 经验）</button>`;
    return `<div class="st-node ${n.lv > 0 ? 'on' : ''} ${n.canLearn ? 'can' : ''}">
      <div class="st-head"><b>${ico}${n.name}</b><span class="st-lv">${dots}</span></div>
      ${reqTag ? `<div class="st-reqline">${reqTag}</div>` : ''}
      <div class="st-desc">${n.desc[Math.min(n.lv, n.desc.length - 1)]}</div>
      <div class="st-foot">
        ${act}
        ${n.canForget ? `<button class="mini-btn st-forget" data-nodeforget="${kind}:${n.id}">遗忘（返 ${n.forgetGain}）</button>` : ''}
      </div>
      ${n.canLearn ? '' : `<div class="st-lock">${n.reason}</div>`}
    </div>`;
  }
  function skillTreeModal(kind) {
    const info = Game.skillTreeInfo();
    const t = info[kind];
    if (!t) return '<div class="modal-title">技能树</div><div class="hint">没有这棵树。</div>';
    const maxed = t.lv >= t.max, canUp = !maxed && t.exp >= t.cost;
    const byLevel = {};
    for (const n of (t.nodes || [])) { const k = n.need || 1; (byLevel[k] = byLevel[k] || []).push(n); }
    // 主干每一级一行：左侧专项 / 中间主干节点 / 右侧专项
    let rows = '';
    for (let lv = 1; lv <= t.max; lv++) {
      const list = byLevel[lv] || [];
      const left = list.filter(n => (n.side || 'r') === 'l'), right = list.filter(n => (n.side || 'r') !== 'l');
      const hasMutex = list.some(n => n.mutex && list.some(m => m.id === n.mutex));
      const done = lv <= t.lv;
      const isNext = (lv === t.lv + 1) && !maxed;
      // 这一级选过哪些方向
      const picked = (() => {
        if (!done) return '';
        const map = {};
        for (const p of t.picks.slice(0, lv)) map[p] = (map[p] || 0) + 1;
        return Object.keys(map).map(id => { const o = t.trunk.find(x => x.id === id) || {}; return `${o.name || id}×${map[id]}`; }).join('、');
      })();
      rows += `<div class="st-row ${done ? 'done' : ''} ${isNext ? 'next' : ''}">
        <div class="st-side left">${left.map(n => stNodeCard(kind, n)).join('')}</div>
        <div class="st-mid">
          ${hasMutex ? '<span class="st-mutex-line"></span>' : ''}
          <i class="st-dot ${done ? 'on' : (isNext ? 'next' : '')}"></i>
          <div class="st-lvname">Lv ${lv}${isNext ? '（下一级）' : ''}</div>
          <div class="st-picks">${done ? picked : (isNext ? '选一个方向 →' : '未解锁')}</div>
        </div>
        <div class="st-side right">${right.map(n => stNodeCard(kind, n)).join('')}</div>
        ${isNext ? `<div class="st-next-opts">${t.trunk.map(o => {
          const have = t.picks.filter(x => x === o.id).length;
          // 每个按钮都写明"要花多少经验"；不够时把"现有多少"也写出来，别让玩家猜为什么点不动
          const costLine = canUp
            ? `<span class="st-cost">花 ${t.cost} 点${t.expName}</span>`
            : `<span class="st-cost lack">花 ${t.cost} 点${t.expName} · 现有 ${Math.floor(t.exp)}（还差 ${Math.ceil(t.cost - t.exp)}）</span>`;
          const ico2 = o.icon ? `<img class="st-icon" src="assets/img/skills/${o.icon}.png" alt="" onerror="this.style.display='none'">` : '';
          return `<button class="st-opt ${canUp ? '' : 'lockedb'}" data-trunkup="${kind}:${o.id}" ${canUp ? '' : 'disabled'}>
            <b>${ico2}${o.name}</b>${have ? ` <span class="st-have">已选 ${have}</span>` : ''}<span>${o.desc}</span>${costLine}</button>`;
        }).join('')}</div>` : ''}
      </div>`;
    }
    return `<div class="modal-title">${t.glyph} ${t.name}技能树 <span style="font-size:11px">主干 ${t.lv}/${t.max} · ${t.expName} <b>${t.exp}</b>${maxed ? ' · 已满级' : ` · 下一级 ${t.cost}`}</span></div>
      <div class="st-tree">${rows}</div>
      <div class="hint">主干每升一级从三个方向里选一个（同一个可以重复选，效果叠加）；专项挂在对应等级的两侧，互斥的一对分居左右（中间红虚线）。<b>遗忘只能从最末端往外剥</b>（专项和主干都一样），返还一半经验——想换流派就一层层退回去。<br>
      经验不够就去采集 / 钓鱼 / 砍树 / 打怪攒（采集每次 +1、制造每件 +1、战斗按怪强度 +1/+2/+3、首领 +15）——注意<b>采集树的经验消耗是 2 倍、制造树是 3 倍</b>（战斗树不变），所以是"慢慢磨"的三条线。也可以靠《历代遗章》里的「采集/制造/战斗心得」每局开局送经验。</div>
      <div class="modal-actions">${(() => {
        const ti = Game.trunkForgetInfo(kind);
        return ti.ok ? `<button class="mini-btn" data-trunkforget="${kind}">遗忘主干「${ti.optName}」第 ${ti.lv} 级 · 返还 ${ti.gain}</button>` : '';
      })()}<button id="st-back">返 回</button><button id="modal-close">关 闭</button></div>`;
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
    const bedId = ['bed1','bed2','bed3','bed4'].filter(b => st.furniture[b]).pop();
    const bf = bedId ? FURNITURE.find(x => x.id === bedId) : null;
    const bedRest = bf ? (bf.rest || 0.7) : 0.4;
    const hours = bf ? (bf.sleepH || 8) : 8;   // 安稳睡觉统一 8 小时
    const sta = Math.round(Math.min(Game.maxStam(), Game.maxStam() * (0.45 + houseRest * 0.12 + bedRest * 0.32) * sq));
    const hungry = st.stats.hunger, thirsty = st.stats.thirst;
    const hungPen = hungry < 20 ? 3 * (100 - hungry) / 10 : 1.5 * (100 - hungry) / 10;
    const thirsPen = thirsty < 20 ? 3 * (100 - thirsty) / 10 : 1.5 * (100 - thirsty) / 10;
    const spiritPen = 2 * Math.floor((100 - st.stats.spirit) / 10);
    const hp = Math.round(30 * sq) - Math.round(hungPen) - Math.round(thirsPen) - spiritPen;
    const sp = bf ? (bf.spirit || 5) : 5;
    return { sta, hp, sp, hours };
  }
  function bedDesc() { const r = sleepRec(); return `睡 ${r.hours} 小时 · 体力+${r.sta} · 生命${r.hp >= 0 ? '+' : ''}${r.hp} · 精神+${r.sp}`; }
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
    for (const f of FURNITURE) { if (f.onlyIdentity && st.identity !== f.onlyIdentity) continue; html += `<div class="help-item"><b>${f.name}</b><span>${f.desc}${noSlot.includes(f.id) ? ' <b>（不占家具位）</b>' : ''}</span></div>`; }
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
      // 扩建：3 只 → 4 只 → 5 只（作者 2026-09-17 要求）
      const ex = i.ext || 0, exMax = i.extMax || 2;
      if (ex < exMax) {
        const emats = Game.coopExtMats(ex + 1) || {};
        const okE = matsOk(emats);
        const rsn = okE ? '' : missingReason(emats, '');
        html += `<div class="build-next">→ 扩建鸡舍（${i.cap} 只 → ${i.cap + 1} 只）<span class="mats">${matsStr(emats)}</span><button class="mini-btn ${okE ? '' : 'lockedb'}" data-coopext="1" ${rsn ? `data-reason="${esc(rsn)}"` : ''}>扩 建</button></div>`;
      } else {
        html += '<div class="hint">鸡舍已扩建到极限（最多 5 只）。</div>';
      }
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
      if (f.onlyIdentity && st.identity !== f.onlyIdentity) continue;   // 身份专属家具（例：养蜂人的蜂箱）
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
  // 建造/升级需要的材料：**写全名**（以前只显示一个字 + 数量，例如"板4 石4"，玩家看不出是什么）。
  // 顺带带上"已有/需要"，材料够不够一眼就看得出来。
  function matsStr(mats) {
    return Object.entries(mats).map(([k, v]) => {
      const have = Game.invCount(k);
      const it = ITEMS[k] || {};
      const nm = it.name || k;
      const enough = have >= v;
      return `${nm} ${enough ? have : `<b class="lack">${have}</b>`}/${v}`;
    }).join(' · ');
  }
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
    // 作者 2026-09-19（玩家建议）：工位分类从"顶上横着两行"改成**左侧竖栏**，右侧留给配方列表，
    // 面板一下子清爽很多；窄屏（手机竖屏）自动退回横排，免得竖栏把配方挤没。
    let html = '<div class="modal-title">制 造 <button class="mini-btn" data-crafthelp="1" style="float:right">？长按批量</button></div><div class="craft-body"><div class="craft-rail">';
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
        // 玩家反馈"磨刀磨的是哪把"——明确写出作用于主手武器（作者 2026-09-19）
        html += `<div class="recipe-row"><b>${ITEMS[w].glyph} 磨刀</b><span class="rcost">磨的是<b>主手武器</b>（${ITEMS[w].name}）· +3攻击 · 20%流血 · 持续3场（耗 燧石×1）</span><button class="mini-btn" data-grind="sharpen">磨刀</button></div>`;
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
          <div class="recipe-mats">${Object.entries(Game.craftIn(r)).map(([k,v]) => `${ITEMS[k].name} ${Game.invCount(k)}/${v}`).join(' · ')}</div>
          ${r.out.lotusPill ? `<div class="recipe-mats">本局已炼 ${S().lotusMade || 0}/3</div>` : ''}
          ${r.uniqueItem ? `<div class="recipe-mats">限时活动 26.9.15-26.9.30 · 活动结束后不能再造（已做出的永久可用）</div>` : ''}
          <button class="mini-btn ${chk.ok ? '' : 'lockedb'}" data-recipe="${r.id}" ${chk.ok ? '' : `data-reason="${esc(chk.reason)}"`}>制作${r.hang ? `（挂 ${r.time} 分）` : ` ${r.time}分`}</button>
          ${chk.ok ? '' : `<div class="recipe-lock">${chk.reason}</div>`}
        </div>`;
      }
      if (!any) html += '<div class="hint">这里没有可做的配方。</div>';
      // 晾肉架：显示"晾晒中（还剩多久）/ 晾透了可以取"
      // 注意：晾肉架归在「加工台」tab 下（stationFamily('furniture') 含 rack），不是独立 tab
      if (craftTab === 'furniture' && stationBuilt('rack')) {
        const d = Game.dryOf('rack');
        if (!d) {
          html += '<div class="recipe-row"><b>晾肉架</b><span class="rcost">空着 · 一次挂肉×2，只花 30 分钟，晾满 20 小时来取（一批得 肉干×4）</span></div>';
        } else {
          const left = Game.dryLeftMin('rack');
          if (left > 0) {
            html += `<div class="recipe-row"><b>晾晒中</b><span class="rcost">还要 ${Game.fmtLeft(left)}（这期间架子占着，晾不了别的）</span><button class="mini-btn lockedb" data-dry="1" data-reason="还没晾透，还要 ${Game.fmtLeft(left)}">晾晒中</button></div>`;
          } else {
            html += `<div class="recipe-row"><b>晾透了！</b><span class="rcost">${Object.keys(d.out).map(k => `${ITEMS[k].name}×${d.out[k]}`).join('、')}</span><button class="mini-btn" data-dry="1">取下来</button></div>`;
          }
        }
      }
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
      const owned = Object.keys(st.inv).filter(id => ITEMS[id] && ['weapon','armor','cloth','accessory','shield'].includes(ITEMS[id].cat) && !ITEMS[id].ammo);   // 弹药不进装备栏（它只给远程武器吃）
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
      // 工具栏格子直接写耐久数字（玩家反馈：不点开就看不到耐久、用坏了也不知道）
      for (let i = 0; i < 3; i++) {
        const tid = tk[i];
        if (tid) {
          const d = Game.durOf(tid);
          const hasDura = DURA[tid] !== undefined;
          const dur = hasDura ? (d === null ? DURA[tid] : Math.max(0, Math.round(d))) : null;
          const db = hasDura ? `<span class="inv-dur"><i style="width:${Math.round(dur / DURA[tid] * 100)}%"></i></span>` : '';
          const dtx = hasDura ? `<br><span class="slot-dur${dur <= 0 ? ' broken' : ''}">耐久 ${dur}/${DURA[tid]}${dur <= 0 ? ' · 已用坏' : ''}</span>` : '';
          html += `<button class="relic-slot filled" data-toolslot="${i}">${itemIcon(tid)}<small>${ITEMS[tid].name}${dtx}</small>${db}</button>`;
        } else html += `<button class="relic-slot empty" data-toolslot="${i}">＋<small>空槽</small></button>`;
      }
      html += '</div>';
      const tools = Object.keys(st.inv).filter(id => ITEMS[id] && ITEMS[id].tool && !tk.includes(id));
      if (tools.length) {
        html += '<div class="modal-title" style="margin-top:8px">背包里的工具（点击上到工具栏）</div><div class="inv-grid">';
        for (const id of tools) {
          const q = st.inv[id] || 1;
          
          for (let i = 0; i < q; i++) { const d = Game.durOf(id, i); const dur = (d === null ? DURA[id] : Math.max(0, Math.round(d))); const db = DURA[id] !== undefined ? `<span class="inv-dur"><i style="width:${Math.round(dur / DURA[id] * 100)}%"></i></span>` : ''; html += `<button class="inv-item" data-equiptool="${id}"><span class="inv-glyph">${ITEMS[id].glyph}</span><span class="inv-name">${ITEMS[id].name}</span>${db}<span class="inv-qty">${DURA[id] !== undefined ? `${dur}/${DURA[id]}` : '1'}</span></button>`; }
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
      else if (!rOwned.length) html += '<div class="hint">尚未获得神物（对岸盐镇的货郎 30 金币、深海售卖机 1200 贝壳，或洞穴神龛之类的奇遇）。</div>';
      // 食之包：自动进食/饮水用哪一件，可以自己指定（作者 2026-09-19，玩家反馈"总吃超级大蛋很心疼"）
      if (rOwned.includes('satchel') && equip.includes('satchel')) {
        const pref = Game.satchelPref();
        const nm = (id) => (id && ITEMS[id]) ? ITEMS[id].name : '自动挑最省的那份';
        html += `<div class="modal-title" style="margin-top:10px">食之包 · 自动吃喝</div>
          <div class="help-item"><b>优先用</b><span>饱食低于 50 时先吃：<b>${esc(nm(pref.food))}</b><br>水分低于 50 时先喝：<b>${esc(nm(pref.drink))}</b></span>
            <div class="set-inline">
              <button class="mini-btn" data-satchel="food">选食物</button>
              <button class="mini-btn" data-satchel="drink">选饮料</button>
              <button class="mini-btn" data-satchel="clear">回到"挑最省的"</button>
            </div></div>`;
      }
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
      // 攻速直接写清"对多快的东西能打几下"，玩家就不用来问了
      {
        const s = cs.spd;
        html += row('攻速', `${s}　·　你出手 ${s} 次的时间里，速度 6 的敌人大概能还手 6 次；比它慢就先挨一下`);
      }
      html += row('格挡率', cs.block + '%');
      html += row('生命值', `${cs.hp}/${cs.maxhp}`);
      html += row('体力', `${cs.stam}/${cs.maxstam}`);
      const spNow = Math.round(st.stats.spirit);
      const spNote = spNow >= 50 ? '体力上限 100%' : (spNow >= 20 ? '体力上限 -10%' : '体力上限 -20%，采集耗时 +10%');
      html += row('精神', `${spNow}/100（${spNote}）`);
      html += row('护甲', cs.armor);
      html += row('衣物·保暖', cs.cloth + `（暖${st.equipment.cloth && ITEMS[st.equipment.cloth].warm ? ITEMS[st.equipment.cloth].warm : 0}）`);
      html += row('战斗中', `磨刀 ${S().weaponSharpen ? '生效中(剩'+S().weaponSharpen.fights+'场)' : '无'} · 武器命名+${(S().weaponNames && S().weaponNames[st.equipment.weapon] && S().weaponNames[st.equipment.weapon].bonus) || 0}`);
      // 水壶系：没建就**整条不显示**（玩家反馈"未装备水壶"这行看不懂，以为是装备格）；
      // 建了就写清楚效果；加装滤雨器也照样算有水壶（-20% 一直在）。
      if (cs.tank || st.furniture.rainfilter) {
        html += row('水壶', st.furniture.rainfilter ? '已建 + 滤雨器（口渴 -20%，雨天自动接水）' : '已建（口渴消耗 -20%）');
      }
      html += '</div></div>';
      html += `<div class="attr-right"><img class="attr-portrait" src="${portraitPath(st.identity || '')}" alt="" onerror="__portraitFail(this,'${st.identity || ''}')"><div class="attr-char">${(IDENTITIES[st.identity] || {}).name || ''}</div></div>`;
      html += '</div>';
    }
    html += '<div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  function itemDetail(id) {
    const st = S();
    const it = ITEMS[id];
    let btns = [];
    // 药品只留「使用」那一个按钮（以前 cat=med 又带 curePoison/stopBleed 的会冒出两个一模一样的按钮）
    if (it.cat !== 'med' && (it.food || it.water || it.cat === 'food' || it.cat === 'drink' || it.curePoison || it.stopBleed)) btns.push(`<button data-use="${id}">${it.cat === 'drink' ? '饮用' : (it.curePoison ? '服用' : '食用')}（${it.food ? `+${it.food}饱 ` : ''}${it.water ? `+${it.water}水 ` : ''}${it.heal ? `+${it.heal}命 ` : ''}${it.spirit ? `+${it.spirit}神 ` : ''}${it.sta ? `+${it.sta}体力 ` : ''}${it.curePoison ? '解毒 ' : ''}）</button>`);
    if (it.cat === 'med') {
      const eff = [it.heal ? `+${it.heal}命` : null, it.sta ? `+${it.sta}体力` : null, it.water ? `+${it.water}水` : null,
        it.spirit ? `${it.spirit > 0 ? '+' : ''}${it.spirit}神` : null, it.stopBleed ? '止血' : null, it.curePoison ? '解毒' : null].filter(Boolean).join(' · ');
      btns.push(`<button data-med="${id}">使用${eff ? `（${eff}）` : ''}</button>`);
    }
    if (it.coatPoison) btns.push(`<button disabled>战斗中使用 · 淬毒</button>`);
    if (it.cat === 'weapon' || it.cat === 'armor' || it.cat === 'cloth') btns.push(`<button data-equip="${id}">${(st.equipment.weapon === id || st.equipment.armor === id || st.equipment.cloth === id) ? '已装备' : '装备'}</button>`);
    if (it.cat === 'seed') btns.push(`<button data-plant="${id}">去耕地播种</button>`);
    btns.push(`<button data-discard="${id}" class="danger-btn">丢弃 1 个</button>`);
    // 限定 · 神弓：详情页里给一个"存入邮箱（跨局）"的入口
    if (id === 'divineBow') {
      btns.push(Game.hasMailboxDivineBow && Game.hasMailboxDivineBow()
        ? `<button disabled title="邮箱里已经存着一把了">邮箱已有一把</button>`
        : `<button data-storebow="1">存入邮箱（跨局）</button>`);
    }
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
  // 交易面板顶部的"钱包"：玩家反馈买卖时看不到自己身上有多少钱（老潮是最常被问的）
  function walletBar() {
    const s = S(); if (!s) return '';
    return `<div class="wallet-bar">你身上：${ITEMS.beibi.glyph} 贝壳币 <b>${Game.invCount('beibi')}</b> · ${ITEMS.coin.glyph} 金币 <b>${Game.invCount('coin')}</b></div>`;
  }
  function laochaoModal() {
    const st = S();
    let html = `<div class="modal-title">老潮的货摊 <span style="font-size:12px">（第${st.day}天，22 点离港）</span></div>
     ${walletBar()}
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

  // ⚠️ 记住当前在哪个摊位：买/卖之后 UI 会整块重建（showModal('town')），
  //    如果这里不记住，玩家在铁匠/情报贩子买一件东西就被弹回杂货商，得重新点一次摊位。
  let townShopNow = 'grocer';
  function townModal() {
    const st = S();
    const fame = st.fame;
    const shops = [['grocer','杂货商',0],['smith','铁匠',1],['informant','情报贩子',2]];
    // 声望掉下去（读档/换档）时别停在锁着的摊位上
    if ((TOWN[townShopNow] || {}).needFame > fame) townShopNow = 'grocer';
    const tabHtml = shops.map(([id, name, need]) =>
      `<button class="tab ${id === townShopNow ? 'active' : ''} ${fame >= need ? '' : 'locked'}" data-shop="${id}">${name}${fame >= need ? '' : ' 🔒'}</button>`).join('');
    let html = `<div class="modal-title">盐镇集市 <span style="font-size:12px">（声望 ${'★'.repeat(fame)}${'☆'.repeat(3-fame)}）</span></div>
      ${walletBar()}
      <div class="tabs">${tabHtml}</div><div id="trade-body">${townShop(townShopNow)}</div>
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
    ${walletBar()}
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
  let fightSeq = 0;          // 每开一场新战斗 +1：用来识别"上一场结束后那个 1 秒的关窗定时器"
  function renderCombat(kind, C) {
    const m = $('#modal');
    if (kind === 'start') {
      const en = C.enemy;
      // 新战斗开始：清掉上一场残留的"待选目标"，否则开局就带着黄框、并且会误触发一次攻击
      PENDING_ACT = null; fightSeq++;
      if (en && en.boss) try{ AudioFX.setBoss(true); }catch(e){}   // Boss战激昂音乐
      m.classList.add('open');
      m.innerHTML = `<div class="modal-content combat-modal">
        <div class="modal-title">⚔ 遭遇了${en.name}${(C.enemies && C.enemies.length > 1) ? ` ×${C.enemies.length}` : ''}${en.boss ? ' <span class="badge danger">BOSS</span>' : ''}</div>
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
      const seq = fightSeq;
      setTimeout(() => {
        // 这 1 秒里如果又打了起来（连续遇袭/多波夜袭），别把新战斗的窗口一起清掉
        if (seq !== fightSeq) return;
        try{ AudioFX.play(cfg ? 'good' : 'danger'); }catch(e){}
        m.classList.remove('open'); m.innerHTML = ''; render();
      }, 1000); return; }   // 日志关闭时再响战斗结束音
  }
  let mailTab = 'mail';
  let PENDING_ACT = null;
  // ---------- 设置面板（主界面和游戏内菜单共用） ----------
  // 赶路遇袭开关：读当前存档的设置（没开局默认开）
  function roadAmbushOn() {
    const st = S();
    return !st || !st.settings || st.settings.roadAmbush !== false;
  }
  function settingsModal() {
    const btn = (v, label, on) => `<button class="mini-btn ${on ? 'active' : ''}" data-set="${v}">${label}</button>`;
    const tgl = (v, label, on) => `<button class="mini-btn ${on ? 'active' : ''}" data-set="${v}">${label} ${on ? '开' : '关'}</button>`;
    return `<div class="modal-title">设 置</div>
      <div class="help-list">
        <div class="help-item"><b>图鉴 · 每日签到</b><span>图鉴是账号级的，不开局也能翻；签到每天可领 魂点 ×${Game.dailySignState().soul} + 备份点 ×${Game.dailySignState().backup}。</span>
          <div class="modal-actions"><button class="mini-btn" data-open="collection">📜 图 鉴</button><button class="mini-btn" data-open="sign">📅 每日签到${Game.dailySignState().canSign ? ' <b style="color:#e8c66a">· 可领</b>' : ''}</button></div></div>
        <div class="help-item"><b>声音</b><span>音乐（配乐与氛围）/ 音效（咔哒、采集、战斗）/ 环境音（海浪、风、鸟虫、雨）</span>
          <div class="set-inline">${tgl('audio:music', '音乐', AudioFX.enabledState())}${tgl('audio:sfx', '音效', AudioFX.sfxState())}${tgl('audio:amb', '环境音', AudioFX.ambientState())}</div></div>
        <div class="help-item"><b>日志栏</b><span>怎么显示 / 多宽（窄一点能多看画面，宽一点看得清文字）</span>
          <div class="set-inline">
            <span class="set-lbl">显示</span>${btn('log:always', '常驻', logMode === 'always')}${btn('log:fade', '淡出', logMode === 'fade')}${btn('log:hidden', '隐藏', logMode === 'hidden')}
            <span class="set-lbl">宽度</span>${btn('logw:narrow', '窄', logSize === 'narrow')}${btn('logw:mid', '中', logSize === 'mid')}${btn('logw:wide', '宽', logSize === 'wide')}
          </div></div>
        <div class="help-item"><b>当前目标</b><span>营地顶部那行「当前目标：…」提示；嫌它占地方可以关掉</span>
          <div class="set-inline"><button class="mini-btn ${showObjective ? 'active' : ''}" data-set="obj:on">显示</button><button class="mini-btn ${!showObjective ? 'active' : ''}" data-set="obj:off">关闭</button></div></div>
        <div class="help-item"><b>皮肤包</b><span>当前：<b>${skinName()}</b>${skin === 'ink' ? ' · 纯黑白木刻' : ' · 深海navy + 琥珀金'}</span>
          <div class="set-inline">${SKINS.map(s => Game.skinOwned(s.id)
            ? btn('skin:' + s.id, s.name, skin === s.id)
            : `<button class="mini-btn" data-askin="${s.id}">🔒 ${s.name} · ${Game.skinCost()} 魂点</button>`).join('')}</div></div>
        <div class="help-item"><b>云存档</b><span>${(() => {
          const cs = Game.cloudStatus();
          // 作者 2026-09-19：这段别写太长，一句状态 + 最近时间就够（版本号留一行小字，方便玩家反馈时对版本）
          const ver = (typeof window !== 'undefined' && window.BUILD_VER) || '（未知版本）';
          const note = `<span class="help-sub">版本 ${ver}</span>`;
          if (!cs.supported) return (cs.diag === 'no-tap' ? '未启用（不在 TapTap 小游戏里跑）· 本地存档照常' : (cs.msg || '未启用')) + note;
          const t = cs.at ? new Date(cs.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '';
          return (t ? `已同步 · 最近 ${t}` : '已就绪 · 还没同步过') + note;
        })()}</span>
          <div class="modal-actions">${Game.cloudStatus().supported ? '<button class="mini-btn" data-cloudpush="1">立刻传到云端</button>' : ''}<button class="mini-btn" data-cloudretry="1">重新检测</button></div></div>
      </div>
      <div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
  }
  // ---------- 每日晨报：牧场消耗/产量 + 陷阱情况 ----------
  function dailyReportModal() {
    const st = S() || {};
    const rep = st.dailyReport || null;
    if (!rep) {
      return `<div class="modal-title">第 ${st.day || '?'} 天 · 晨报</div>
        <div class="overlay-text">今天没有什么新消息。</div>
        <div class="modal-actions"><button id="modal-close">知 道 了</button></div>`;
    }
    let html = `<div class="modal-title">第 ${rep.day} 天 · 晨报</div>`;
    // —— 牧场 ——
    const r = rep.ranch;
    if (r) {
      html += '<div class="help-list">';
      const line = (b, span) => `<div class="help-item"><b>${b}</b><span>${span}</span></div>`;
      html += line('牧场', `羊 ${r.pen} 只 · 鸡 ${r.coop} 只` + (r.autoFeed ? '（自动喂食：开）' : '（自动喂食：<b>关</b>）'));
      if (r.hayUsed || r.wool) html += line('羊圈', `吃干草 ${r.hayUsed || 0} · 产羊毛 <b>+${r.wool || 0}</b>`);
      if (r.wheatUsed || r.egg) html += line('鸡舍', `吃小麦 ${r.wheatUsed || 0} · 产鸡蛋 <b>+${r.egg || 0}</b>`);
      if (r.grown) html += line('成长', `小鸡长成了母鸡 ×${r.grown}`);
      if (r.meat) html += line('寿终', `留下兽肉 ×${r.meat}`);
      if (r.lackHay) html += line('⚠ 干草不足', `<b>${r.lackHay}</b> 只羊今天没吃上，没产毛（羊不会饿死，补上干草即可）`);
      if (r.lackWheat) html += line('⚠ 小麦不足', `<b>${r.lackWheat}</b> 只鸡今天没吃上，没下蛋（鸡不会饿死，补上小麦即可）`);
      if (!r.parts.length && !r.lackHay && !r.lackWheat) html += line('产出', '今天牧场没有变化。');
      html += '</div>';
    } else {
      html += `<div class="overlay-text">还没有鸡舍 / 羊圈。</div>`;
    }
    // —— 陷阱 ——
    const tp = rep.trap;
    html += '<div class="help-list" style="margin-top:8px">';
    if (!tp) {
      html += `<div class="help-item"><b>草地陷阱</b><span>没布陷阱。用「陷阱」道具去草地布一个，次日起每天清晨会汇报。</span></div>`;
    } else if (tp.waiting) {
      html += `<div class="help-item"><b>草地陷阱</b><span>昨天刚布下（共 ${tp.placed} 处），还没到收获的时候——明天清晨再看。</span></div>`;
    } else if (tp.caught && !tp.done) {
      html += `<div class="help-item"><b>草地陷阱 · 有收获！</b><span>你拨开草丛：陷阱里困着一头羊羔，正咩咩地叫。怎么处置？</span></div>`;
    } else {
      html += `<div class="help-item"><b>草地陷阱</b><span>还没被触发（共 ${tp.placed} 处），明天再来看看。</span></div>`;
    }
    html += '</div>';
    // 按钮：抢到羊羔时给两个选择，否则"知道了"
    const btns = (tp && tp.caught && !tp.done)
      ? `<button data-dailytrap="kill">杀灭<span class="choice-hint">收获兽肉×2、兽皮×1</span></button><button data-dailytrap="pen">放回羊圈<span class="choice-hint">羊圈未满就能留下它</span></button>`
      : `<button id="modal-close">知 道 了</button>`;
    return html + `<div class="modal-actions">${btns}</div>`;
  }

  // ---------- 每日签到 ----------
  function signModal() {
    const st = Game.dailySignState();
    return `<div class="modal-title">📅 每日签到</div>
      <div class="overlay-text">每天可领一次：<b>魂点 ×${st.soul}</b> + <b>备份点 ×${st.backup}</b>。<br>
      魂点用于《历代遗章》里的继承加成与购买；备份点用来把当前进度存进备份槽（每个 20 魂点也能买一个）。<br><br>
      今天的状态：${st.canSign ? '<b style="color:#9c6b1f">还没签到 · 可以领取</b>' : `已签到（上次：${st.lastSign}）`}<br>
      当前：魂点 ${st.total} · 备份点 ${st.bp}</div>
      <div class="modal-actions">
        ${st.canSign ? '<button data-sign="go">领 取</button>' : '<button disabled>今天已领过</button>'}
        <button id="modal-close">关 闭</button>
      </div>`;
  }
  function mailboxModal() {
    const tabs = [['mail','邮箱'],['code','兑换码'],['event','活动'],['guide','攻略']];
    const mbox = Game.mailboxList();
    const st = S() || {};      // 当前存档（传奇难度判定要用；没开局时为 {}）
    // ⚠️ isLegend 必须声明在 if 外面：下面"兑换码"和"活动"两个分支都要用它。
    //    写进 if (mailTab === 'mail') 块里的话，切到兑换码页就 ReferenceError → 整个弹窗渲染中断、tab 永远切不过去。
    const isLegend = st.difficulty === 'legend';
    let inner = '';
    if (mailTab === 'mail') {
      // 传奇难度不能领物资邮件（物品/神物/魂点）——按钮直接置灰并写明原因，别让玩家点了才发现
      const supplyMail = (x) => !!(x && !x.notice && (x.item || x.relic || x.soul));
      inner = mbox.length ? mbox.map(x => {
        const blocked = isLegend && supplyMail(x);
        const btn = blocked
          ? `<button class="mini-btn lockedb" disabled title="传奇模式下不能领取物资邮件">传奇档不可领</button>`
          : `<button class="mini-btn" data-claimmail="${x.i}">${x.notice ? '知道了' : '领取'}</button>`;
        const why = blocked ? `<div class="mail-body" style="color:#a8382a">传奇难度下不能领取物资邮件——邮件会留着，换低难度开局再来领。</div>` : '';
        return x.notice
        // ⚠️ 兼容老存档：以前发出去的公告邮件里 body 可能是数组（没归一化），
        //    直接 String(数组) 会变成逗号拼成一整行 —— 这里统一按行拆。
        ? `<div class="help-item"><b>📣 ${esc(x.title)}${x.date ? ` <small>（${esc(x.date)}）</small>` : ''}</b><div class="mail-body">${(Array.isArray(x.body) ? x.body.join('\n') : String(x.body || '')).split('\n').map(t => `<div>${esc(t)}</div>`).join('')}</div>${btn}</div>`
        : `<div class="help-item"><b>${x.item === 'divineBow' ? '◈ 限定 · ' : ''}${x.relic ? `◈ 神物 · ${esc(RELICS[x.relic].name)}` : (x.item ? `${ITEMS[x.item].glyph} ${esc(ITEMS[x.item].name)}×${x.qty}` : `魂点 ×${x.soul}`)}</b><span>${x.item === 'divineBow' ? esc(ITEMS.divineBow.desc) + (x.dur !== undefined ? `（剩余耐久 ${x.dur}）` : '') : (x.relic ? esc(RELICS[x.relic].desc) : '来自官方邮件')}</span>${why}${btn}</div>`;
      }).join('') : '<div class="hint">邮箱是空的。（兑换码/官方发放会送到这里）</div>';
    } else if (mailTab === 'code') {
      inner = isLegend
        ? `<div class="overlay-text">输入官方兑换码，领取魂点或道具（每人每个码可用一次）。</div><div class="mail-body" style="color:#a8382a"><b>传奇难度下不能兑换物资</b>（物品 / 神物 / 魂点）——兑换码不会被消耗，换一个低难度开局再来兑换。</div><div class="batch-row"><span>兑换码</span><input id="redeem-code" style="flex:1" maxlength="24" placeholder="传奇档不可兑换" disabled></div><div class="modal-actions"><button id="redeem-do" disabled>不可兑换</button></div>`
        : `<div class="overlay-text">输入官方兑换码，领取魂点或道具（每人每个码可用一次）。</div><div class="batch-row"><span>兑换码</span><input id="redeem-code" style="flex:1" maxlength="24" placeholder="输入兑换码"></div><div class="modal-actions"><button id="redeem-do">兑 换</button></div>`;
    } else if (mailTab === 'guide') {
      // 常用攻略：玩家群里问得最多的"这东西到底去哪弄"
      const G = (t, lines) => `<div class="help-item"><b>${t}</b><div class="mail-body">${lines.map(l => `<div>· ${l}</div>`).join('')}</div></div>`;
      inner = '<div class="overlay-text">群里问得最多的几条。更细的数值可以看论坛的《稀有物品攻略》，或者直接在群里问。</div>'
        + G('第二章传送门（山顶祭坛）', [
            '需要：遗物 ×1 + 石板 ×3 + 龙骨 ×1，四样凑齐后去<strong>山顶·祭坛</strong>举行仪式。',
            '石板：山洞（岩壁遗迹）、对岸·遗迹（遗迹石板）、山顶（石碑残迹，要先打倒守碑的石像）。',
            '遗物：山顶祭坛第一次上去就能拿到。',
            '龙骨：荒漠的骨化石敲出来（化石 → 龙骨），山顶也有线索。',
          ])
        + G('深殿核心 ×4（圣殿之门要用）', [
            '海底四片海域各有一块「深殿核心」（珊瑚生长带 / 海沟 / 沉船墓地 / 深渊裂谷），都是一次性点位。',
            '每处都有守卫（深海守卫 / 触手 / 机械守卫），打倒守卫才能拿到。',
            '集满 4 块，去深水圣殿的「圣殿之门」开启，才能挑战沉没之王。',
          ])
        + G('蜂蜜 / 淡水 / 干草', [
            '蜂蜜：树林·蜂巢（60% 拿到，失手会被蛰）；<b>养蜂人</b>取蜜必定成功还能多拿，并可造「蜂箱」每天产 1 份。',
            '淡水：河畔取水点直接取；造了「水壶」口渴消耗 -20%，再装「滤雨器」雨天自动接水；老潮也卖。',
            '干草：工匠「晒干草」把茅草变成干草；盐镇杂货商（第 5 天起）有卖；羊圈靠它喂羊。',
          ])
        + G('雪莲 / 秘银（山顶）', [
            '都在山顶雪线以上，需要保暖（皮衣/毛皮大衣一类），走到雪线附近可能有石像拦路——可以选择绕开或打倒它。',
          ])
        + G('图纸去哪儿买', [
            '老潮（船上）：药炉等；盐镇铁匠：高炉图纸；盐镇情报贩子：船坞、潜水图纸。',
            '黑市：玄铁图纸；海底交易机：珊瑚刀甲、推进器、源质枪甲图纸。',
            '图纸<b>不占背包格子</b>，买到就永久记住，不会挤仓库。',
          ])
        + G('魂点怎么来', [
            '死亡后按这一局的表现沉淀进《历代遗章》；每天<b>邮箱 → 邮箱页的「每日签到」</b>（在主界面/菜单里）给 10 魂点 + 1 备份点。',
            '成就解锁、兑换码也会给；魂点用来买《历代遗章》里的继承加成与备份点。',
          ])
        + G('夜里被袭击 / 赶路被拦路', [
            '夜袭：先来一次剧情夜袭，之后按围墙等级的概率发生；狼数随天数增长，第 50 天到顶 5 匹。',
            '赶路遇袭：去危险度 ≥3 的区域（采石场/草地/荒漠/山洞/山顶/海域/对岸）路上可能被狼或熊拦路，能打也能退（<b>不能关闭</b>）；洞外拦路的洞穴熊第 30 天起才出现，<b>山洞里的洞穴熊随时可能撞上</b>。',
          ])
        + G('工具与武器耐久', [
            '所有工具、武器、远程武器都有耐久，用坏了要重做或用「磨刀石」修补；命名的武器、以及限时绝版的「神弓」，耐久归零都不会消失。',
            '工具栏最多 3 件，用坏的会自动从背包里换同款备用。',
          ]);
    } else {
      // 核心补偿那段文案已撤下（CORE4 这个码本身还在，可以私下发给受影响的玩家）
      inner = `<div class="overlay-text"><b>【命名武器】限时活动</b><br>兑换码 <code>QQ1014679931</code> 可兑换 1 张「命名牌」——在营地「磨刀石」里为你的武器「命名」，伤害永久+1。<br><br>官方码 <code>GUYU2026</code> 可兑换 50 魂点。<br><br><b>有bug可以进群找群主或者在论坛里反馈，作者会第一时间听见并修改和补偿！</b><br><br><b>进入QQ群：1014679931 解锁更多玩法和福利～</b></div>`;
    }
    return `<div class="modal-title">邮箱 · 兑换 · 活动 · 攻略</div><div class="tabs">${tabs.map(([k,l]) => `<button class="tab ${mailTab===k?'active':''}" data-mailtab="${k}">${l}</button>`).join('')}</div><div class="overlay-text">内</div>`.replace('<div class="overlay-text">内</div>', `<div>${inner}</div>`) + `<div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
  }
  // 敌人一条血条该显示什么：名字 + 意图标签 + 血量数字（抽出来给"首建"和"原地更新"共用）
  function tgNameHtml(e) {
    const it = e.intent;
    const tag = it === 'charge' ? '<i class="intent-tag charge">蓄力</i>'
              : it === 'cover' ? '<i class="intent-tag cover">掩护</i>'
              : it === 'heavy' ? '<i class="intent-tag heavy">猛击</i>' : '';
    const charged = e.charged ? '<i class="intent-tag charge">下一击双倍</i>' : '';
    const coverOn = (e.cover && it !== 'cover') ? '<i class="intent-tag cover-on">被掩护</i>' : '';
    return `${esc(e.name)}${e.isBoss ? ' <b class="badge danger">BOSS</b>' : ''}${tag}${charged}${coverOn}`;
  }
  function tgPct(e) { const maxH = e.emax || 20; return Math.max(0, Math.min(100, e.ehp / maxH * 100)); }
  function tgHpText(e) { const maxH = e.emax || 20; return `${Math.max(0, Math.round(e.ehp))}/${Math.round(maxH)}`; }
  function tgRowHtml(e, i) {
    return `<div class="hp-line target ${e.isBoss ? 'boss-line' : ''}" data-ti="${i}"><span class="tg-name">${tgNameHtml(e)}</span><div class="hp-bar"><div class="hp-fill ${e.isBoss ? 'boss' : ''}" style="width:${tgPct(e)}%"></div></div><span class="tg-hp">${tgHpText(e)}</span></div>`;
  }
  function updateCombat(C) {
    if (!$('#php')) return;
    const en = C.enemy;
    const tgBox = $('#fight-targets');
    if (tgBox) {
      const es = C.enemies || [];
      const rows = tgBox.querySelectorAll('.hp-line.target');
      // ⚠️ 血条只在"数量变了"的时候重建，平时**原地改数值**。
      //    以前每回合都 innerHTML 重建整段：#fight-targets 是 position:sticky 的独立合成层，
      //    iPad/iPhone Safari 上"重建 sticky 层里的子树"有时会漏重绘 —— 玩家反馈的
      //    「怪实际扣血了、血条却不动」就是这么来的。而且元素被重建时 CSS 的
      //    width 过渡根本来不及跑，玩家看不到血条"掉下去"的过程；原地改就能看到。
      if (rows.length !== es.length) {
        tgBox.innerHTML = es.map((e, i) => tgRowHtml(e, i)).join('');
      } else {
        es.forEach((e, i) => {
          const row = rows[i];
          row.dataset.ti = i;
          row.classList.toggle('boss-line', !!e.isBoss);
          const nm = row.querySelector('.tg-name'); if (nm) nm.innerHTML = tgNameHtml(e);
          const fill = row.querySelector('.hp-fill');
          if (fill) { fill.classList.toggle('boss', !!e.isBoss); fill.style.width = tgPct(e) + '%'; }
          const hp = row.querySelector('.tg-hp'); if (hp) hp.textContent = tgHpText(e);
        });
      }
      if (PENDING_ACT) {
        tgBox.classList.add('selecting');
        // 点了攻击/射击要选目标时，把血条列表滚进视野 ——
        // 横屏手机上怪物大图会把血条顶到屏幕外，不滚一下玩家根本不知道自己该点哪
        try { tgBox.scrollIntoView({ block:'nearest' }); } catch (e) {}
      }
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
      ${(() => { const sw = Game.sweepInfo(); return (sw.alive > 1 || sw.usable) ? `<button data-fact="sweep" ${sw.usable ? '' : 'disabled'} title="${sw.usable ? '对全部敌人各造成 1 倍伤害（双手重武器）' : sw.reason}">横扫${sw.usable ? `（${sw.alive}目标）` : `（${sw.reason}）`}</button>` : ''; })()}
      <button data-fact="heavy" ${canHeavy ? '' : 'disabled'} title="${canHeavy ? '' : '战斗经验 Lv2 解锁'}">重击</button>
      <button data-fact="defend">防御</button>
      <button data-fact="item" ${itemsLeft > 0 ? '' : 'disabled'} title="每场战斗最多用 2 次道具">道具${itemsLeft > 0 ? `（${itemsLeft}）` : '（已用完）'}</button>
      <button data-fact="flee">逃跑</button>`;
    btns.querySelectorAll('button').forEach(b => b.onclick = () => {
      const f = b.dataset.fact;
    if (f === 'item') { showMedPicker(); return; }
      if (f === 'sweep') { withAnimation('fight', '横扫', () => Game.fightAction('sweep')); return; }   // 横扫打全体，不用选目标
      if (f === 'attack' || f === 'heavy' || f === 'ranged' || f === 'throw') {
        const lv = (C.enemies || []).filter(e => e.ehp > 0).length;
        if (lv <= 1) { withAnimation('fight', '战斗', () => Game.fightAction(f)); return; }   // 单个敌人：直接攻击
        PENDING_ACT = f; if (tgBox) tgBox.classList.add('selecting'); updateCombat(C); return;   // 多敌：选目标
      }
      withAnimation('fight', '战斗', () => Game.fightAction(f));
    });
    if (tgBox) tgBox.querySelectorAll('.target').forEach(el => {
      // 手指/鼠标点到哪一条，哪一条就亮白框（手机也能看清自己点了谁）
      const mark = () => { tgBox.querySelectorAll('.target').forEach(x => x.classList.remove('selected')); el.classList.add('selected'); };
      el.onmouseenter = mark; el.ontouchstart = mark; el.onpointerdown = mark;
      el.onclick = () => {
        const ti = +el.dataset.ti;
        if (!PENDING_ACT) { addLog('先点 攻击/重击/射击，再点目标。', 'warn'); return; }
        const a = PENDING_ACT; PENDING_ACT = null; tgBox.classList.remove('selecting');
        mark();
        addLog(`目标已选定：${(C.enemies && C.enemies[ti] ? C.enemies[ti].name : '')}`, 'sys');
        withAnimation('fight', '战斗', () => Game.fightAction(a, ti));
      };
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
  // 这些弹窗是"纯管理界面"（看东西/翻页面），开着时时间不流逝：
  // 边翻背包边掉饱食度、或者看技能面板时天自己黑了，都不合理。
  // ⚠️ 刻意【不包含】：camp（营地里有睡觉/休息，本来就该花时间）、craft（制造要耗时间）、
  //    laochao/town/black/atlTrade（买卖）、farm（种收）、sleeppick、grind、repair、naming 等
  //    —— 这些面板里的操作本身就是"主动消耗时间"，冻住它们等于把功能关掉。
  const TIME_FREEZE_PANELS = ['inv', 'equip', 'skill', 'skilltree', 'collection', 'diary', 'mailbox', 'settings',
    'savemenu', 'backup', 'rescue', 'heirloom', 'codex', 'crafthelp', 'comhelp', 'devpw'];
  function showModal(kind, cfg) {
    const m = $('#modal');
    modalOpenedAt = Date.now();   // 记下"刚打开"的时刻，配合防点击穿透（见文件末尾的捕获监听）
    const wasOpen = m.classList.contains('open');
    const prevScroll = wasOpen ? Array.from(m.querySelectorAll('.modal-content, .recipe-list, #trade-body')).map(el => el.scrollTop) : [];
    modal = { kind, cfg };
    // 开管理面板 → 冻结时间；并重绘一次顶栏，让时间前的 ⏸ 标记立刻出现（否则要等下次渲染才看得到）
    if (Game.setTimeFreeze) {
      const wasFrozen = Game.timeFrozen && Game.timeFrozen();
      Game.setTimeFreeze(TIME_FREEZE_PANELS.indexOf(kind) >= 0);
      if (wasFrozen !== Game.timeFrozen() && document.getElementById('top-time')) render();
    }
    let html = '';
    if (kind === 'camp') html = campModal();
    else if (kind === 'livestock') html = livestockModal(cfg);
    else if (kind === 'camphelp') html = renderCampHelp((cfg && cfg.mode) || 'build');
    else if (kind === 'craft') html = renderCraft();
    else if (kind === 'inv') html = renderInventory();
    else if (kind === 'laochao') html = laochaoModal();
    else if (kind === 'mailbox') html = mailboxModal();
    else if (kind === 'naming') html = `<div class="modal-title">为武器命名 <span style="font-size:11px">${Game.S().weaponNames && Game.S().weaponNames[Game.S().equipment.weapon] ? '已命名' : '消耗 1 命名牌 · 伤害永久+1 · 最多8字'}</span></div><div class="overlay-text">你的主手武器：${Game.S().equipment.weapon ? `「${Game.wNameOf(Game.S().equipment.weapon)}」` : '未装备'}</div><div class="batch-row"><span>名字</span><input id="name-input" style="flex:1" maxlength="8" placeholder="输入武器名"></div><div class="modal-actions"><button id="name-do">确 定</button><button id="modal-close">取 消</button></div>`;
    else if (kind === 'grind') {
      // 修补材料按"当前主手武器"实时显示（神弓要秘银锭，别一律写石头×2）
      const w0 = Game.S().equipment.weapon;
      const rm = (w0 && DURA[w0] !== undefined) ? Game.repairMatOf(w0) : null;
      const rmTxt = (rm && ITEMS[rm[0]]) ? `${ITEMS[rm[0]].name}×${rm[1]}` : '石头×2';
      html = `<div class="modal-title">磨刀石 <span style="font-size:11px">${Game.S().furniture.grindstone ? '· 只作用于当前主手武器' : '· 需先建造磨刀石家具'}</span></div><div class="overlay-text">${Game.S().furniture.grindstone ? `<b>下面三项都只作用于你装备的主手武器</b>：<br>磨刀：+3攻击 · 20%流血 · 持续3场（耗 燧石×1）<br>修补：主手武器耐久恢复满（耗 ${rmTxt}）<br>命名：武器伤害永久+1（耗 命名牌×1）` : '请先在营地·家具建造「磨刀石」石台（石头×4+燧石×1）。'}</div><div class="modal-actions"><button data-grind="sharpen">磨 刀</button><button data-grind="repair">修 补</button><button data-grind="name">命 名</button><button id="modal-close">关 闭</button></div>`;
    }
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
    else if (kind === 'savemenu') html = `<div class="modal-title">菜单</div><div class="modal-actions save-menu"><button data-savemenu="sign">📅 每日签到</button><button data-savemenu="diary">📖 日记</button><button data-savemenu="col">📜 图鉴</button><button data-savemenu="settings">⚙ 设置</button><button data-savemenu="save">💾 保存进度</button><button data-savemenu="backup">📦 备份·读档</button><button data-savemenu="title">🏠 回到主菜单</button><button data-savemenu="restart" class="danger-btn">🔄 重新开始</button><button data-savemenu="close">关 闭</button></div>`;
    else if (kind === 'settings') html = settingsModal();
    else if (kind === 'sleeppick') html = sleepModal();
    else if (kind === 'heirloom') html = renderHeirloom();
    else if (kind === 'equip') html = renderEquip();
    else if (kind === 'backup') html = renderBackup();
    else if (kind === 'rescue') html = rescueModal();
    else if (kind === 'skill') html = skillModal();
    else if (kind === 'skilltree') html = skillTreeModal(cfg && cfg.kind);
    else if (kind === 'satchelfood') {
      const pick = (cfg && cfg.pick) === 'drink' ? 'drink' : 'food';
      const inv = S().inv || {};
      const list = Object.keys(inv).filter(id => ITEMS[id] && inv[id] > 0 &&
        (pick === 'food' ? (ITEMS[id].cat === 'food' && (ITEMS[id].food || 0) > 0)
                         : (ITEMS[id].cat === 'drink' || (ITEMS[id].water || 0) > 0)));
      html = `<div class="modal-title">食之包 · 优先${pick === 'food' ? '吃' : '喝'}</div>
        <div class="overlay-text">饱食 / 水分低于 50 时，食之包会自动用你选的这一件；<b>选中那件用完了会自动退回"挑最省的那份"</b>，不会卡住不吃。</div>
        <div class="help-list">${list.length
          ? list.map(id => `<button class="mini-btn" data-satchelpick="${pick}:${id}" style="margin:3px">${ITEMS[id].glyph} ${esc(ITEMS[id].name)}（${pick === 'food' ? '饱食+' + (ITEMS[id].food || 0) : '水分+' + (ITEMS[id].water || 0)}，有 ${inv[id]}）</button>`).join('')
          : `<div class="hint">背包里没有可用的${pick === 'food' ? '食物' : '饮水'}。</div>`}</div>
        <div class="modal-actions"><button id="modal-back">返 回</button><button id="modal-close">关 闭</button></div>`;
    }
    else if (kind === 'batch') html = batchModal(cfg);
    else if (kind === 'batchn') html = batchnModal(cfg);
    else if (kind === 'comhelp') html = comHelpModal();
    else if (kind === 'crafthelp') html = `<div class="modal-title">制造说明</div><div class="overlay-text">· 制造工坊在营地里，回营地才能使用。<br>· 点配方 = 制作1个。<br>· <b>长按配方按钮</b> 弹出批量条，拖动数量从1到「当前材料最多可做数量」，一次做完多个。<br>· 批量时按数量×单个耗时（造越多耗时越长），经验也×N。<br>· <b>晾肉架例外</b>：它要挂上去等晾透，一副架子一次只能挂一批（肉×2），晾好取下来才能挂下一批。<br>· 火堆·烹饪，以及各工坊（工作台/熔炉/烟熏炉/灶台/晾肉架/制革架/纺车…）按你建了哪些来。</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
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
    else if (kind === 'daily') html = dailyReportModal();
    else if (kind === 'sign') html = signModal();
    else if (kind === 'overlay') {
      html = `<div class="modal-title">${esc(cfg.title || '')}</div><div class="overlay-text">${esc(cfg.text || '').replace(/\n/g, '<br>')}</div><div class="modal-actions">${(cfg.choices || []).map((c, i) => `<button data-choice="${i}"><span class="choice-label">${esc(c.label)}</span>${c.hint ? `<span class="choice-hint">${esc(c.hint)}</span>` : ''}</button>`).join('')}</div>`;
    }
    else if (kind === 'medpick') {
      const leftNow = Math.max(0, 2 - ((Game.S().combat && Game.S().combat.usedItems) || 0));
      html = `<div class="modal-title">使用道具 <span style="font-size:11px">本场还能用 ${leftNow} 次</span></div><div class="modal-actions">${cfg.meds.map(md => `<button data-med-id="${md}">${ITEMS[md].glyph} ${ITEMS[md].name}（有${Game.invCount(md)}）</button>`).join('')}<button id="modal-back">返 回</button></div>`;
    }
    // 设置面板在窄屏上要多占一点宽度（.set-wide）：里面有几行"多个开关排一行"，
    // 沿用手机端默认的 64vw 会挤到换行（作者 2026-09-19）
    m.innerHTML = `<div class="modal-content${kind === 'settings' ? ' set-wide' : ''}">${html}</div>`;
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
    m.querySelectorAll('[data-livefeed]').forEach(b => b.onclick = () => { Game.toggleAutoFeed(); showModal('livestock', modal && modal.cfg); });
    m.querySelectorAll('[data-liveadd]').forEach(b => b.onclick = () => { const r = Game.addChick(); if (!r.ok) addLog(r.reason, 'warn'); showModal('livestock', modal && modal.cfg); });
    m.querySelectorAll('[data-hsext]').forEach(b => b.onclick = () => { if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; } const r = Game.buildHouseExt(); if (!r.ok) addLog(r.reason, 'warn'); showModal('camp'); });
    m.querySelectorAll('[data-coopext]').forEach(b => b.onclick = () => { if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; } const r = Game.buildCoopExt(); if (!r.ok) addLog(r.reason, 'warn'); showModal('coop'); });
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
    m.querySelectorAll('[data-unlockslot]').forEach(b => b.onclick = () => { const r = Game.unlockRelicSlot(); if (!r.ok) addLog(r.reason, 'warn'); showModal('equip'); });
    m.querySelectorAll('[data-unequip]').forEach(b => b.onclick = () => { Game.unequipRelic(b.dataset.unequip); showModal('equip'); });
    m.querySelectorAll('[data-equiprelic]').forEach(b => b.onclick = () => { const r = Game.equipRelic(b.dataset.equiprelic); if (!r.ok) addLog(r.reason, 'warn'); rerenderEquip(); });
    m.querySelectorAll('[data-toolslot]').forEach(b => b.onclick = () => { const tk = (Game.S().toolkit || []); const id = tk[+b.dataset.toolslot]; if (id) { Game.unequipTool(id); showModal('equip'); } });
    m.querySelectorAll('[data-equiptool]').forEach(b => b.onclick = () => { const r = Game.equipTool(b.dataset.equiptool); if (!r.ok) addLog(r.reason, 'warn'); rerenderEquip(); });
    m.querySelectorAll('[data-emptyslot]').forEach(b => b.onclick = () => addLog('请从下方已拥有的神物中点击装备。', 'warn'));
    // 食之包：挑自动吃喝优先用的那一件
    m.querySelectorAll('[data-satchel]').forEach(b => b.onclick = () => {
      const k = b.dataset.satchel;
      if (k === 'clear') {
        Game.setSatchelPref('food', ''); Game.setSatchelPref('drink', '');
        addLog('食之包：改回"自动挑最省的那份"。', 'sys');
        showModal('equip'); return;
      }
      showModal('satchelfood', { pick: k });
    });
    m.querySelectorAll('[data-satchelpick]').forEach(b => b.onclick = () => {
      const [k, id] = String(b.dataset.satchelpick).split(':');
      Game.setSatchelPref(k, id);
      addLog(`食之包：优先${k === 'food' ? '吃' : '喝'}「${ITEMS[id].name}」。`, 'sys');
      showModal('equip');
    });
    m.querySelectorAll('[data-bk]').forEach(b => b.onclick = () => {
      const r = Game.backupSlot(+b.dataset.bk);
      if (r.ok) {
        const cs = Game.cloudStatus();   // 备份也会顺带排一次云同步
        addLog(`已备份到备份槽 ${+b.dataset.bk + 1}（第 ${r.day} 天）。` + (cs.supported ? `云存档：${cs.msg}` : '（这台设备没有云存档，备份存在本机）'), 'good');
        centerToast(`已备份到槽 ${+b.dataset.bk + 1}`);
      } else { addLog(r.reason, 'warn'); centerToast(r.reason); }
      showModal('backup');
    });
    m.querySelectorAll('[data-delslot]').forEach(b => b.onclick = () => { const r = Game.delSlot(+b.dataset.delslot); addLog(r.ok ? `已删除备份槽 ${+b.dataset.delslot + 1}。` : r.reason, r.ok ? 'good' : 'warn'); centerToast(r.ok ? `已删除槽 ${+b.dataset.delslot + 1}` : r.reason); showModal('backup'); });
    // 救援：扫描本机所有存档痕迹 → 挑一份恢复
    m.querySelectorAll('[data-rescue="scan"]').forEach(b => b.onclick = () => showModal('rescue'));
    m.querySelectorAll('[data-rescue-go]').forEach(b => b.onclick = () => {
      const src = b.dataset.rescueGo;
      if (!confirm('恢复这一份会替换掉当前这一局（当前这份会先自动滚进"上一次保存"里，还能再退回来）。确定吗？')) return;
      const r = Game.restoreLocalSave(src);
      if (!r.ok) { addLog('【救援】' + r.reason, 'warn'); centerToast(r.reason); return; }
      addLog(`【救援】已恢复到第 ${r.day} 天（来源：${src}）。`, 'good');
      centerToast(`已恢复到第 ${r.day} 天`);
      closeModal();
      if (document.querySelector('#title-screen')) showTitle(); else render();
    });
    m.querySelectorAll('[data-ld]').forEach(b => b.onclick = () => {
      // 「从此继续」= 用备份槽这份覆盖当前这一局，先说清再动
      const cur = S();
      if (cur && cur.day > 1 && !confirm(`「从此继续」会用这份备份覆盖你当前这一局（第 ${cur.day} 天）。确定吗？`)) return;
      const r = Game.loadSlot(+b.dataset.ld);
      if (r.ok) { closeModal(); begin(); } else addLog(r.reason, 'warn');
    });
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
    if (v === 'save') {
      Game.save();
      const cs = Game.cloudStatus();                       // 保存 = 本地 + cookie + 尝试云同步（平台限制一分钟一次）
      addLog('已保存。' + (cs.supported ? `云存档：${cs.msg}` : '（这台设备没有云存档，已存到本地 + cookie）'), 'sys');
      showModal('savemenu');
    }
    else if (v === 'sign') showModal('sign');
    else if (v === 'diary') showModal('diary');
      else if (v === 'col') showModal('collection');
      else if (v === 'skill') showModal('skill');
      else if (v === 'backup') showModal('backup');
      else if (v === 'settings') showModal('settings');
      else if (v === 'title') { Game.save(); closeModal(); showTitle(); }
    else if (v === 'restart') { if (confirm('确定重新开始？当前进度将被覆盖。')) { closeModal(); showIdentity(); } }
    else closeModal();
  });
  // 每日签到：领 30 魂点 + 2 备份点（每天一次，账号级）
  m.querySelectorAll('[data-sign]').forEach(b => b.onclick = () => {
    const r = Game.dailySign();
    if (r.ok) {
      centerToast(`签到成功：魂点 +${r.soul} · 备份点 +${r.backup}`);
      addLog(`每日签到：魂点 +${r.soul}，备份点 +${r.backup}。`, 'good');
      try { AudioFX.play('good'); } catch (e) {}
    } else centerToast(r.reason || '今天已经签过了');
    showModal('sign');   // 重渲染，按钮变成"今天已领过"
  });
    // 设置面板里的「图鉴 · 每日签到」入口（标题页与游戏内共用这一块）
    m.querySelectorAll('[data-open]').forEach(b => b.onclick = () => {
      AudioFX.init();
      showModal(b.dataset.open === 'sign' ? 'sign' : 'collection');
    });
    // 设置面板
    m.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
      const v = b.dataset.set;
      AudioFX.init();
      // 声音三件套：现在是一行里的单按钮开关（点一下翻转）
      if (v === 'audio:music') AudioFX.toggle();
      else if (v === 'audio:sfx') AudioFX.toggleSfx();
      else if (v === 'audio:amb') AudioFX.toggleAmbient();
      else if (v === 'music:on' && !AudioFX.enabledState()) AudioFX.toggle();
      else if (v === 'music:off' && AudioFX.enabledState()) AudioFX.toggle();
      else if (v === 'sfx:on' && !AudioFX.sfxState()) AudioFX.toggleSfx();
      else if (v === 'sfx:off' && AudioFX.sfxState()) AudioFX.toggleSfx();
      else if (v === 'amb:on' && !AudioFX.ambientState()) AudioFX.toggleAmbient();
      else if (v === 'amb:off' && AudioFX.ambientState()) AudioFX.toggleAmbient();
      else if (v === 'obj:on') setShowObjective(true);
      else if (v === 'obj:off') setShowObjective(false);
      else if (v.startsWith('log:')) setLogMode(v.slice(4));
      else if (v.startsWith('logw:')) setLogSize(v.slice(5));
      else if (v.startsWith('skin:')) {
        setSkin(v.slice(5));
        addLog(`已切换皮肤包：${skinName()}。`, 'sys');
        AudioFX.play('good');
      }
      showModal('settings');
    });
    // 皮肤解锁：深海琥珀 / 彩绘卡面 各 50 魂点（账号级，解锁后永久）
    m.querySelectorAll('[data-askin]').forEach(b => b.onclick = () => {
      const id = b.dataset.askin;
      const r = Game.unlockSkin(id);
      if (r.ok) {
        const nm = (SKINS.find(s => s.id === id) || {}).name || id;
        addLog(`已解锁皮肤包「${nm}」（消耗 ${r.cost} 魂点，现有 ${Game.metaState().soul}）。`, 'good');
        try { centerToast(`解锁成功：${nm}`); } catch (e) {}
        try { AudioFX.play('good'); } catch (e) {}
      } else {
        addLog(r.reason, 'warn');
        try { centerToast(r.reason); } catch (e) {}
      }
      showModal('settings');
    });
    m.querySelectorAll('[data-sleep]').forEach(b => b.onclick = () => {
      const k = b.dataset.sleep;
      closeModal();
      if (k === 'watch') { Game.sleep(k); return; }          // 守夜是清醒的，不放睡觉动画
      const lbl = { nap:'小睡 2 小时', normal:'安稳睡觉 8 小时' }[k] || '睡觉';
      withAnimation('sleep', lbl, () => Game.sleep(k), k === 'nap' ? 'sleep_nap' : 'sleep_night');
    });
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
        const r = RECIPES.find(x => x.id === b.dataset.recipe);
        // 晾肉架这类"挂上去等时间"的配方没有批量：一副架子一次只挂一批，长按只提醒一句
        if (r && r.hang) {
          addLog(`${r.name}一次只能挂一批（${Object.entries(Game.craftIn(r)).map(([k, v]) => `${ITEMS[k].name}×${v}`).join('、')}），晾好取下来再挂。`, 'sys');
          return;
        }
        showModal('batch', { recipe: r.id });
      };
      bindPress(b, doTap, doLong);
    });
    m.querySelectorAll('[data-item]').forEach(b => b.onclick = () => { const mc = m.querySelector('.modal-content'); invScroll = mc ? mc.scrollTop : 0; openItemDetail(b.dataset.item); });
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
      townShopNow = b.dataset.shop;                 // 记住选的摊位：买完重建后还停在这家
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
    m.querySelectorAll('[data-dry]').forEach(b => b.onclick = () => {
      const r = Game.dryCollect('rack');
      if (r && !r.ok) addLog(r.reason, 'warn');
      rerenderCraft();
    });
    m.querySelectorAll('[data-grind]').forEach(b => b.onclick = () => { const a = b.dataset.grind; if (a === 'sharpen') Game.sharpen(); else if (a === 'repair') Game.repairWeapon(); else showModal('naming'); });
    m.querySelectorAll('[data-mailtab]').forEach(b => b.onclick = () => { mailTab = b.dataset.mailtab; showModal('mailbox'); });
    // ⚠️ 这里以前写的是一个裸的 change 调用 —— 但 ui.js 的作用域里根本没有这个函数（那是 game.js 内部的），
    //    一调用就 ReferenceError：领邮件不会刷新、兑换码不切页、新手引导点"跳过"没反应。
    //    统一改成公开 API Game.change()（它会走到界面绑定的 onChange → render()）。
    m.querySelectorAll('[data-claimmail]').forEach(b => b.onclick = () => { const r = Game.claimMailbox(+b.dataset.claimmail); centerToast(r.msg); Game.change(); showModal('mailbox'); });
    // 每日晨报里的陷阱选择
    m.querySelectorAll('[data-dailytrap]').forEach(b => b.onclick = () => {
      const r = Game.claimDailyTrap(b.dataset.dailytrap);
      if (r && !r.ok) addLog(r.reason, 'warn');
      closeModal();
    });
    const rd = m.querySelector('[data-revive2]') || null;
    const rdo = m.querySelector('#redeem-do'); if (rdo) rdo.onclick = () => { const inp = m.querySelector('#redeem-code'); const r = Game.redeemCode(inp ? inp.value : ''); centerToast(r.msg || r.reason); if (!r.ok) addLog(r.reason, 'warn'); else { mailTab = 'mail'; Game.change(); } showModal('mailbox'); };
    const ndo = m.querySelector('#name-do'); if (ndo) ndo.onclick = () => { Game.nameWeapon(m.querySelector('#name-input').value); rerenderCraft(); };
    m.querySelectorAll('[data-helprules]').forEach(b => b.onclick = () => { comTab = 'p1'; showModal('comhelp'); });
    m.querySelectorAll('[data-commtab]').forEach(b => b.onclick = () => { comTab = b.dataset.commtab; showModal('comhelp'); });
    // ---- 技能树（B1）----
    m.querySelectorAll('[data-skilltree]').forEach(b => b.onclick = () => showModal('skilltree', { kind: b.dataset.skilltree }));
    m.querySelectorAll('[data-trunkup]').forEach(b => b.onclick = () => {
      const [k, o] = String(b.dataset.trunkup).split(':');
      const r = Game.skillUpTrunk(k, o);
      if (!r.ok) addLog(r.reason, 'warn');
      showModal('skilltree', { kind: k });
    });
    m.querySelectorAll('[data-nodelearn]').forEach(b => b.onclick = () => {
      const [k, id] = String(b.dataset.nodelearn).split(':');
      const r = Game.skillNodeLearn(k, id);
      if (!r.ok) addLog(r.reason, 'warn');
      showModal('skilltree', { kind: k });
    });
    m.querySelectorAll('[data-nodeforget]').forEach(b => b.onclick = () => {
      const [k, id] = String(b.dataset.nodeforget).split(':');
      const r = Game.skillNodeForget(k, id);
      if (!r.ok) addLog(r.reason, 'warn');
      showModal('skilltree', { kind: k });
    });
    // 主干遗忘：想换流派时把主干也退回去（只能从最末端退，返还一半）
    m.querySelectorAll('[data-trunkforget]').forEach(b => b.onclick = () => {
      const k = String(b.dataset.trunkforget);
      const r = Game.skillTrunkForget(k);
      if (!r.ok) addLog(r.reason, 'warn');
      else try { centerToast(`主干退到 ${r.lv} 级 · 返还 ${r.gain}`); } catch (e) {}
      showModal('skilltree', { kind: k });
    });
    { const stb = m.querySelector('#st-back'); if (stb) stb.onclick = () => showModal('skill'); }
    // 云存档：手动上传一次（内部仍受 60 秒节流保护，顶多提示"等一会儿"）
    m.querySelectorAll('[data-cloudpush]').forEach(b => b.onclick = () => {
      const r = Game.cloudPush(true);
      addLog(r ? '【云存档】已提交上传，稍后会自动完成。' : `【云存档】${Game.cloudStatus().msg}`, r ? 'sys' : 'warn');
      showModal('settings');
    });
    m.querySelectorAll('[data-cloudretry]').forEach(b => b.onclick = () => {
      Game.cloudInit();                       // 重新检测一次（刚装进小游戏、或刚开通服务时用得上）
      const cs = Game.cloudStatus();
      addLog(`【云存档】重新检测：${cs.supported ? '已就绪' : cs.msg}`, cs.supported ? 'good' : 'warn');
      showModal('settings');
    });
    const bn = $('#batch-n');
    if (bn) { const bc = $('#batch-count'); const up = () => { if (bc) bc.textContent = bn.value; }; bn.addEventListener('input', up); bn.addEventListener('change', up); const bd = $('#batch-do'); if (bd) bd.onclick = () => { const r = RECIPES.find(x => x.id === modal.cfg.recipe); const res = Game.craftBatch(r, +bn.value);
      // reason 为空 = 只是弹了"这批要花很久"的确认框，别当报错写日志（作者 2026-09-19）
      if (!res.ok && res.reason) addLog(res.reason, 'warn');
      closeModal(); rerenderCraft(); }; }
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
        if (shop === 'smith' || shop === 'informant' || shop === 'grocer') townShopNow = shop;   // 批量面板确认后回集市，也要停在原摊位
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
    // ⚠️ 战斗中点「道具」→ 这里右上角的 ✕ 原本是"关闭整个弹窗"= 直接把战斗界面关掉，
    //    玩家反馈"点道具再点叉就直接结束本次战斗了"。道具面板的 ✕ 应该 = 返回战斗。
    if (kind === 'medpick') m.querySelectorAll('#modal-close, .modal-x').forEach(b => b.onclick = () => renderCombat('start', Game.S().combat));
    m.querySelectorAll('[data-claim-ach]').forEach(b => b.onclick = () => { const r = Game.achClaim(b.dataset.claimAch); if (!r.ok) addLog(r.reason, 'warn'); showModal('collection'); });
    if (kind === 'farm') bindFarm();
  }
  let invScroll = 0;   // 背包列表的滚动位置：用完/看完东西回来时保留，不用重新翻
  function openItemDetail(id) {
    const m = $('#modal');
    m.innerHTML = `<div class="modal-content">${itemDetail(id)}</div>`;
    const mc = m.querySelector('.modal-content'); if (mc) mc.scrollTop = 0;
    bindItemDetail(id);
  }
  function restoreInvScroll() {
    const mc = $('#modal .modal-content');
    if (mc && invScroll) mc.scrollTop = invScroll;
  }
  // 用掉一个之后：还有就留在这一页接着用（不重新翻背包），没了才回列表
  function afterItemUse(id) {
    if (Game.invCount(id) > 0) openItemDetail(id);
    else { showModal('inv'); restoreInvScroll(); }
  }
  function bindItemDetail(id) {
    const m = $('#modal');
    m.querySelectorAll('#modal-back').forEach(b => b.onclick = () => { showModal('inv'); restoreInvScroll(); });
    m.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { const id = b.dataset.use; Game.consume(id); afterItemUse(id); });
    m.querySelectorAll('[data-med]').forEach(b => b.onclick = () => { const id = b.dataset.med; Game.useMed(id); afterItemUse(id); });
    m.querySelectorAll('[data-equip]').forEach(b => b.onclick = () => { const id = b.dataset.equip; const idx = b.dataset.idx !== undefined ? +b.dataset.idx : undefined; const eq = S().equipment; const on = (eq.weapon===id||eq.weapon2===id||eq.armor===id||eq.cloth===id||eq.accessory===id); if (on) Game.unequip(id); else Game.equip(id, idx); showModal('inv'); restoreInvScroll(); });
    m.querySelectorAll('[data-discard]').forEach(b => { const did = b.dataset.discard || id; const doTap = () => { Game.removeItem(did, 1); addLog(`丢弃了${ITEMS[did].name}×1。`, 'warn'); afterItemUse(did); }; const doLong = () => showModal('batchn', { kind:'discard', item:did }); b.onclick = null; bindPress(b, doTap, doLong); });
    // 限定 · 神弓：存入邮箱（跨局）
    m.querySelectorAll('[data-storebow]').forEach(b => b.onclick = () => {
      const r = Game.storeDivineBow();
      if (r && !r.ok) { addLog(r.reason, 'warn'); showModal('inv'); return; }
      showModal('mailbox'); mailTab = 'mail';
    });
    m.querySelectorAll('[data-plant]').forEach(b => b.onclick = () => { closeModal(); Game.travel('farm'); });
  }
  function closeModal() { const m = $('#modal'); m.classList.remove('open'); m.innerHTML = ''; modal = null; if (Game.setTimeFreeze) Game.setTimeFreeze(false); render(); }   // 关弹窗 → 恢复时间
  function rerenderEquip() { const mc = $('#modal .modal-content'); const st = mc ? mc.scrollTop : 0; showModal('equip'); const mc2 = $('#modal .modal-content'); if (mc2) mc2.scrollTop = st; }
  function rerenderCraft() { const mc = $('#modal .recipe-list'); const st = mc ? mc.scrollTop : 0; showModal('craft'); const mc2 = $('#modal .recipe-list'); if (mc2) mc2.scrollTop = st; }
  function renderTut(st) {
    const step = st.tut;
    let t = document.getElementById('tut');
    if (!step) { if (t) t.remove(); return; }
    const hint = step === 1 ? '新手引导：点击底部【制造】→【手工】→ 制作【石镐】' : '新手引导：点【装备】→ 工具栏 → 点【石镐】上栏装备';
    if (!t) { t = document.createElement('div'); t.id = 'tut'; t.className = 'tut-banner'; document.body.appendChild(t); }
    t.innerHTML = `<span class="tut-text">${hint}</span><button class="mini-btn" data-tutskip="1">跳过</button>`;
    const sk = t.querySelector('[data-tutskip]'); if (sk) sk.onclick = () => { const s = Game.S(); if (s) s.tut = null; Game.change(); };
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
  const TRAIT_CN = { charge:'冲撞', poison:'剧毒', bleed:'流血', pack:'群袭', group:'群袭', enrage:'狂暴', ironImmune:'铁甲', evade:'闪避', dodge:'闪避', first:'先手', water:'水中', swim:'水中', summon:'召唤', gun:'持枪', flee:'逃跑', nightBuff:'夜战强化', stoneGuard:'石甲反噬', pierce:'穿透' };
  const COL_STATION_N = { none:'手工', work1:'工作台', work2:'工作台', work3:'工作台', furn1:'熔炉', furn2:'熔炉', furn3:'熔炉', smoke1:'烟熏炉', smoke2:'烟熏炉', fire:'篝火', pot:'药锅', spin:'纺车', loom:'织布机', mortar:'研钵', medPot:'药炉', stove:'灶台', rack:'晾肉架', tannery:'制革架' };
  let colTab = 'res';
  function collectionModal() {
    // 没在游戏里（主界面）也能看：账号级图鉴 = 历代存档解锁过的内容
    const st = S() || { seen: {}, killCount: {}, flags: {} };
    const c = Game.collection();
    const tabs = [['res',`资源 ${c.res}/${c.resTotal}`],['tool','工具'],['mon',`怪物 ${c.mon}/${c.monTotal}`],['rec',`配方 ${RECIPES.length}`],['boss','首领'],['ach','成就']];
    let html = `<div class="modal-title">图 鉴</div><div class="tabs">${tabs.map(([k,l]) => `<button class="tab ${colTab === k ? 'active' : ''}" data-ctab="${k}">${l}</button>`).join('')}</div>`;
    // （原来这里有一行"标签上的数字是「已收录 / 图鉴总数」……"的说明，玩家要求删掉。
    //   标签上的 "已收录/总数" 本身就够直观，不用再解释一遍。）
    html += `<div class="col-body">`;
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
    $('#end-stay') && ($('#end-stay').onclick = () => { hide(); Game.continueRun(); addLog('你选择了留下来。海还在那里。', 'sys'); });
    $('#end-revive') && ($('#end-revive').onclick = (e) => {
      if (e.target.dataset.lack) { addLog('魂点不足（需 50 魂点）。', 'warn'); return; }
      hide(); Game.reviveToday();
    });
    $('#end-title') && ($('#end-title').onclick = () => { hide(); Game.continueRun(); Game.save(); location.reload(); });
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
    // ⚠️ 日志栏收起按钮（#log-grip）是挂在 body 上的，不属于 #app，
    //    所以回到标题页时它不会被 app.innerHTML 清掉 —— 会孤零零留在左上角（玩家截图反馈过）。
    //    标题页/选择身份页都把它藏起来，只有真正进游戏后才显示。
    const grip = document.getElementById('log-grip');
    if (grip) grip.style.display = 'none';
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
        <button id="btn-set">⚙ 设 置</button>
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
      else if (btn.id === 'btn-set') { AudioFX.init(); showModal('settings'); }
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
    // ---- 存档加固（玩家反馈"退后台回来存档没了"）----
    // ① 每 20 秒兜底自动存一次：手机上被系统直接杀掉页面时，pagehide 不一定来得及跑
    if (!window.__guyuAutoSaveTimer) {
      window.__guyuAutoSaveTimer = setInterval(() => {
        const s = Game.S();
        if (!s || s.ending || s.death) return;
        if (!s._dirty) return;             // 没动过就不写，省得反复占用存储
        s._dirty = false;
        Game.save();
      }, 20000);
    }
    // ② 从后台/bfcache 回来时，如果别的标签页写过更新的存档，就用那份重新同步，避免拿旧进度覆盖
    window.addEventListener('pageshow', (e) => {
      const s = Game.S();
      if (!s || (!e.persisted && !s._dirty)) return;
      if (Game.saveRev() > (s._rev || 0)) { try { if (Game.load()) { render(); addLog('检测到另一处有更新的进度，已为你同步。', 'sys'); } } catch (err) {} }
    });
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
    app.querySelectorAll('.identity').forEach(b => b.onclick = () => {
      const i = +b.dataset.slot;
      const s = Game.slotList()[i];
      if (s) { const r = Game.loadSlot(i); if (r.ok) begin(); else addLog(r.reason, 'warn'); return; }
      // ⚠️ 开新游戏会覆盖"当前进行中的那一份"（备份槽不受影响）——先说清再动，
      //    玩家反馈"我新开了游戏，在读以前的档，没跳出来覆盖咋办"。
      let d = 0;
      try { const j = JSON.parse(localStorage.getItem('guyuyizhang_save') || 'null'); d = (j && j.day) || 0; } catch (e) {}
      if (d > 1 && !confirm(`你有一份进行中的存档（第 ${d} 天）——开新游戏会覆盖它（「备份 · 读档」里的备份槽不受影响）。确定开始新游戏吗？`)) return;
      lastSlot = i; showIdentity();
    });
    app.querySelectorAll('[data-titlebuybp]').forEach(b => b.onclick = () => showModal('buybp'));
    $('#sel-back').onclick = showTitle;
  }
  function showIdentity() {
    const app = $('#app');
    const grip0 = document.getElementById('log-grip');   // 同上：选择身份页也不该出现它
    if (grip0) grip0.style.display = 'none';
    let html = `<div id="select-screen"><div class="select-title">你是什么人？</div><div class="identity-list">`;
    for (const [id, idn] of Object.entries(IDENTITIES)) {
      // 立绘卡面：受皮肤包控制（"彩绘卡面"皮肤会整套换掉），缺图自动回退到默认立绘
      html += `<button class="identity" data-id="${id}"><span class="id-card"><img src="${portraitPath(id)}" alt="" onerror="__portraitFail(this,'${id}')"></span><span class="id-body"><b>${idn.name}</b><span class="id-desc">${idn.desc}</span></span></button>`;
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
      html += `<button class="identity" data-id="${id}"><span class="id-body"><b>${d.name}${d.recommend ? ' <i style="font-style:normal;font-size:11px;border:1px solid var(--ink);padding:0 4px;border-radius:3px">新手推荐</i>' : ''}</b><span>${d.desc}</span></span></button>`;
    }
    html += `</div><div class="hint" style="margin-top:6px">第一次玩？选「求生者」就行，之后随时可以换。</div><button id="sel-back">返回</button><div id="modal"></div></div>`;
    app.innerHTML = html;
    // 开场分镜只在"真人点了难度"时播：程序化 click（探针/自动化，isTrusted === false）自动跳过，
    // 免得每次截图/回归都要先手动关掉分镜。探针想看分镜就设 window.__guyuForceComic = 1。
    app.querySelectorAll('.identity').forEach(b => b.onclick = (e) => {
      lastDifficulty = b.dataset.id;
      try { localStorage.setItem('guyuyizhang_difficulty', lastDifficulty); } catch (err) {}
      Game.newGame(lastIdentity, lastDifficulty);
      freshRun = (e && e.isTrusted === false) ? !!window.__guyuForceComic : true;
      begin();
    });
    $('#sel-back').onclick = showIdentity;
  }
  // ---------- 开场分镜（只在"新的旅程"开新存档时播一次）----------
  // 作者 2026-09-17：新存档开头要有几格漫画交代来历 ——
  //   听说亚克兰蒂斯遗址的传说 → 出海 → 特大风暴 → 被海水淹没晕过去 → 醒来就在这座荒岛。
  // 图在 assets/img/comic/（黑白木刻版画，跟游戏同一套视觉）；缺图自动回退到已有的场景图，绝不空白。
  // 只在新存档播：读档 / 继续上次游戏 / 备份恢复 / 死后重新开始 都走不到这里（freshRun 只在选难度那一下置位）。
  const COMIC = [
    { t:'传闻', img:'assets/img/comic/1_legend.png', fb:'assets/img/laochao.png',
      s:'港口的酒馆里，那个老水手把杯底一磕：\n「小子，海底下埋着一座城。」\n\n他说那叫亚克兰蒂斯——沉了一千年，塔尖上的灯还亮着。\n我把这句话记了很多年。' },
    { t:'出海', img:'assets/img/comic/2_setsail.png', fb:'assets/img/endings/ending_a.png',
      s:'终于有一天，我用攒下的全部家当，换了一条小船、一张旧海图，和半个月的干粮。\n\n船离港的时候天刚亮，风是顺的。\n「我会回来的。」' },
    { t:'风暴', img:'assets/img/comic/3_storm.png', fb:'assets/img/sea.png',
      s:'第三天夜里，海翻了脸。\n\n浪头比桅杆还高，一道白线从黑暗里压下来。\n我听见木头断裂的声音——就在我头顶。' },
    { t:'沉没', img:'assets/img/comic/4_sink.png', fb:'assets/img/anim/dive.png',
      s:'冰冷的海水灌满了肺。\n\n我伸手去够最后那点光，光越来越远。\n然后，什么都没有了。' },
    { t:'醒来', img:'assets/img/comic/5_wake.png', fb:'assets/img/shore.png',
      s:'不知道过了多久，我被沙子磨醒了脸。\n\n船没了，海图也没了，手里只剩半截缆绳。\n天是灰的，海也是灰的——一座陌生的岛立在雾里。\n\n活下去，是我现在唯一要做的事。' },
  ];
  let freshRun = false;      // 选完难度、真正开一局新存档时置 true；begin() 消费一次就清掉
  function showComicIntro(done) {
    const st = S();
    const lk = !!(st && st.identity === 'linghui');   // 灵灰：冷蓝调，跟她在游戏里的表现一致
    const scr = el('div', '');
    scr.id = 'comic-screen';
    if (lk) scr.classList.add('lk');
    scr.innerHTML = `<img id="comic-img" alt="" draggable="false">
      <div class="comic-shade"></div>
      <div class="comic-cap"><div class="comic-step"></div><div class="comic-title"></div><div class="comic-text"></div></div>
      <div class="comic-bar"><div class="comic-dots">${COMIC.map(() => '<i></i>').join('')}</div>
        <button class="comic-skip" id="comic-skip">跳 过</button><button class="comic-next" id="comic-next">继续 ▶</button></div>`;
    document.body.appendChild(scr);
    const img = scr.querySelector('#comic-img');
    const stepEl = scr.querySelector('.comic-step');
    const titleEl = scr.querySelector('.comic-title');
    const textEl = scr.querySelector('.comic-text');
    const dots = [...scr.querySelectorAll('.comic-dots i')];
    const nextBtn = scr.querySelector('#comic-next');
    const openedAt = Date.now();
    let i = 0, ended = false;
    // 只预加载"下一格"：5 张全解码要白吃十几 MB 内存（玩家反馈过内存被杀），这样最多两张活着
    const preload = (k) => { if (COMIC[k]) { const x = new Image(); x.src = COMIC[k].img; } };
    const draw = () => {
      const c = COMIC[i];
      img.onerror = () => { if (img.src.indexOf(c.fb) < 0) img.src = c.fb; };   // 缺图 → 回退，绝不空白
      img.src = c.img;
      img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';   // 每格都重新"淡入 + 慢慢推近"
      stepEl.textContent = `开场 · 第 ${i + 1} / ${COMIC.length} 格`;
      titleEl.textContent = c.t;
      textEl.textContent = c.s;
      textEl.style.animation = 'none'; void textEl.offsetWidth; textEl.style.animation = '';   // 文字重新淡入
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
      nextBtn.textContent = (i === COMIC.length - 1) ? '爬上沙滩 ▶' : '继续 ▶';
      preload(i + 1);
    };
    const finish = () => {
      if (ended) return;
      ended = true;
      document.removeEventListener('keydown', onKey, true);
      scr.classList.add('out');
      setTimeout(() => scr.remove(), 440);
      if (done) done();
    };
    const next = () => {
      if (ended) return;
      if (i < COMIC.length - 1) { i++; try { AudioFX.play('click'); } catch (e) {} draw(); }
      else finish();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { finish(); return; }
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); next(); }
    };
    nextBtn.onclick = next;
    scr.querySelector('#comic-skip').onclick = () => { addLog('（开场分镜已跳过）', 'sys'); finish(); };
    scr.addEventListener('click', (e) => {
      if (e.target && e.target.closest && e.target.closest('button')) return;   // 按钮自己处理
      if (Date.now() - openedAt < 350) return;   // 防"开这一页的那一下顺手又翻一格"（同 #modal 那套防穿透）
      next();
    });
    document.addEventListener('keydown', onKey, true);
    draw();
  }
  function begin() {
    const app = $('#app');
    rememberIdentity();   // 记下本局的身份/难度，重开时沿用
    // 加载画面（约 2.2 秒）：鸟鸣 + 树叶沙沙 + 随机提示
    const TIPS = ['悄悄告诉你，游戏官方群号是 1014679931 哦☆', '规律作息可以回复更多体力和血量。', '晚上 10 点到 12 点睡觉，体力回得最满。', '吃饱喝足再睡，才不会睡到掉血。', '越远的地方越危险，也越稀有。', '工具和武器都有耐久，用坏了要重新做。', '远古金币能找老潮兑成贝壳，路上还可能碰上用 30 金币换神物的货郎。', '雨天去树林，蘑菇会更多。', '瞭望台能让你看见更远的地方。', '死亡不是终点，魂点会沉淀进《历代遗章》。'];
    const L = document.createElement('div');
    L.id = 'loading';
    L.innerHTML = `<div class="load-glyph">◈</div><div class="load-tip">${TIPS[Math.floor(Math.random() * TIPS.length)]}</div><div class="load-bar"><i></i></div>`;
    document.body.appendChild(L);
    AudioFX.setScene('forest');   // 加载时播清脆鸟叫+树叶沙沙
    setTimeout(() => { L.classList.add('done'); setTimeout(() => L.remove(), 500); }, 2200);
    app.innerHTML = `
      <div id="topbar">
        <!-- ⚠️ 邮箱按钮必须是顶栏最后一个、且不被裁掉：以前它排在状态条后面，窄屏下状态条把它挤到
             右边又被顶栏的 overflow:hidden 裁掉，看起来像"跑到格子栏右边"。
             现在拆成两层：状态区是 flex:1 且自身可横向滚动，邮箱 flex:none 永远钉在最右。 -->
        <div id="topstats">
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
        </div>
        <button id="btn-mail" class="top-mail-btn">✉ 邮箱 <b id="mail-count"></b></button>
      </div>
      <div id="main"></div>
      <div id="log"><div id="logbody"></div></div>
      <div id="objective"></div>
      <button id="btn-backmap">← 返回地图</button>
      <div id="hud-bottomright">
        <div id="scene-actions"></div>
        <div id="rest-bar">
          <button id="btn-rest">休息 1 小时</button>
          <button id="btn-rest-h" title="切换休息时长（1 / 2 / 3 小时）">×1</button>
        </div>
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
      br.onclick = () => { if (Game.S().stats.stamina >= Game.maxStam()) { addLog('体力充沛，不需要休息。', 'warn'); return; } withAnimation('rest', '休息 ' + restHours + ' 小时', () => Game.rest(restHours), 'rest'); };
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
      // 面板类都支持"点外面关闭"（战斗、剧情选择、结局、命名输入、掷骰子这种不能误关的除外）
      const PANEL_KINDS = ['inv','craft','equip','skill','skilltree','satchelfood','camp','laochao','town','black','atlTrade','repair','livestock','mission','info','farm','diary','collection','sleeppick','savemenu','backup','rescue','settings','mailbox','crafthelp','comhelp','codex','heirloom','naming','devpw','rune'];
      if (PANEL_KINDS.includes(k)) closeModal();
    });
    // 移动端：不预加载全部大图，改为按需加载（切换场景时才读取对应图），降低内存与首屏压力
    render();
    AudioFX.setScene(Game.S().scene);
    // 序章叙事
    const introCard = () => showModal('overlay', {
      title: '第 1 天 · 海难',
      text: '风暴把船撕成了碎片。你被海浪冲上一片陌生的沙滩，浑身是伤，手里只剩半截缆绳。\n\n天是灰的，海也是灰的。身后有山的轮廓，脚下有河流入海，海平线上隐约有对岸的岛影。\n\n活下去。这是你接下来唯一要做的事。',
      choices: [{ label: '从沙滩上爬起来', ok: () => { addLog('你从沙滩上爬起来，把散落的物资收拢到一起。', 'sys'); } }],
    });
    // 新存档：先播 5 格开场分镜，播完（或点跳过）再出上面这张「第 1 天 · 海难」卡
    if (freshRun) {
      freshRun = false;
      [0, 1].forEach(k => { if (COMIC[k]) { const x = new Image(); x.src = COMIC[k].img; } });   // 加载画面那 2.4 秒里先把前两格拉下来
      setTimeout(() => showComicIntro(introCard), 2400);   // 等加载画面收掉再开始，别和它叠在一起
    }
    // 读档 / 继续上次游戏 / 备份恢复：不再重复弹这张"海难"卡（开场分镜已经讲过一遍来历了），
    // 直接进游戏。（以前每次打开存档都要再点一次"从沙滩上爬起来"）
  }

  // ---------- 初始化 ----------
  // 全局"咔哒"声：所有按钮/标签/热点/地图箭头，按下就给一次交互反馈（45ms 内不叠音）
  let _lastClickAt = 0;
  // ⚠️ 防"点击穿透"：打开弹窗的那一次点击，它的 click 事件要等弹窗渲染完之后才派发，
  //    于是经常正好落在弹窗里的**第一个按钮**上（玩家反馈"单击直接睡俩小时"—— 睡觉面板第一个按钮就是小睡）。
  //    弹窗刚打开的头 350ms 内，忽略落在 #modal 里的点击（捕获阶段拦，先于按钮自己的 onclick）。
  //    350ms 覆盖了老 iPad 那个"触摸后约 300ms 才补一发 click"的老毛病，人手正常点击快不过它。
  //    程序化点击（e.isTrusted === false，自动化探针用）不拦，避免探针被这层防护吞掉。
  document.addEventListener('click', (e) => {
    const mm = document.getElementById('modal');
    if (!mm || !mm.classList.contains('open')) return;
    if (e.isTrusted !== false && Date.now() - modalOpenedAt < 350 && mm.contains(e.target)) { e.stopPropagation(); e.preventDefault(); }
  }, true);
  document.addEventListener('pointerdown', (e) => {
    const t = (e.target && e.target.closest) ? e.target.closest('button, .mini-btn, .tab, .hotspot, .map-arrow, .action-btn, [data-choice]') : null;
    if (!t || t.disabled || t.classList.contains('lockedb') || t.classList.contains('locked')) return;
    const now = Date.now();
    if (now - _lastClickAt < 45) return;
    _lastClickAt = now;
    try { AudioFX.play('click'); } catch (err) {}
  }, true);

  function init() {
    applySkin();      // 开局先套上上次选的皮肤包
    applyLogMode();   // 开局先把上次选的日志显示方式套上
    const crashes = noteBootStart();   // 上次是不是"没走到渲染成功就没了"（=崩了）
    const inGame = inGameCrashes();
    // 标题页能画出来 = 启动成功（这一步以前漏了，导致"只开标题页"被算成崩溃）
    const go = () => { showTitle(); noteBootOk(); if (crashes >= 2 || inGame >= 2) showSafeMode(Math.max(crashes, inGame)); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
  }
  // 安全模式：连着两次启动都没成功 → 大概率是"某份存档/某个状态一进来就崩"。
  // 给玩家一个出口：看到报错、救出存档码、用上一次的备份存档继续。
  function showSafeMode(crashes) {
    const err = (function () { try { return localStorage.getItem('guyuyizhang_lasterr') || '（没记到具体报错）'; } catch (e) { return '（读不到）'; } })();
    showModal('overlay', {
      title: '启动异常 · 安全模式',
      text: '上次打开游戏时中途出错了（连续 ' + crashes + ' 次）。\n\n报错记录：' + String(err).slice(0, 160)
        + '\n\n建议先「导出存档码」保命，再试「用备份存档打开」（备份是上一次保存前的状态，最多丢几步）。',
      choices: [
        { label: '用备份存档打开', hint: '回退到上次保存前的状态', ok: () => {
          const r = Game.restoreBackupSave ? Game.restoreBackupSave() : { ok:false, reason:'这个版本没有备份存档功能' };
          if (r && r.ok) { begin(); addLog('已用备份存档打开。', 'good'); }
          else { centerToast('打不开备份：' + ((r && r.reason) || '未知')); }
        } },
        { label: '导出存档码', hint: '复制保存，换设备/找作者都能恢复', ok: () => showModal('codex', { mode: 'export', code: Game.exportCode() }) },
        { label: '继续进入游戏', hint: '我了解风险', ok: () => {} },
      ],
    });
  }
  return { init, showTitle, begin, render };
})();

UI.init();
