/* render：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const GameRenderView = (() => {
  function create(deps) {
    const $=(...args)=>deps.$(...args);
    const S=(...args)=>deps.S(...args);
    const skinOn=(...args)=>deps.skinOn(...args);
    const bindLogCollapseBtn=(...args)=>deps.bindLogCollapseBtn(...args);
    const renderObjective=(...args)=>deps.renderObjective(...args);
    const renderTopbar=(...args)=>deps.renderTopbar(...args);
    const bindLogGrip=(...args)=>deps.bindLogGrip(...args);
    const renderMap=(...args)=>deps.renderMap(...args);
    const fitStage=(...args)=>deps.fitStage(...args);
    const renderScene=(...args)=>deps.renderScene(...args);
    const renderExtras=(...args)=>deps.renderExtras(...args);
    const restoreCombatView=(...args)=>deps.restoreCombatView(...args);
    const renderTut=(...args)=>deps.renderTut(...args);
function render() {
    try { renderInner(); restoreCombatView(); }
    catch (e) { onRenderCrash(e); }
    finally { document.body.classList.toggle('modal-open', !!$('#modal.open')); NoticeBadges.refresh(); }
  }

// 只记录本次实际错误，不以历史退出次数推断存档损坏。
function recordError(msg) { try { localStorage.setItem('guyuyizhang_lasterr', String(msg === undefined ? 'unknown' : msg).slice(0, 300)); } catch (e) {} }

function onRenderCrash(e) {
    const msg = (e && (e.message || e)) + ' @ ' + ((e && e.stack) ? String(e.stack).split('\n')[1] || '' : '');
    recordError(msg);
    try { console.error('[孤屿遗章] 渲染出错：', e); } catch (err) {}
    const t = document.getElementById('crash-toast');
    if (!t) {
      const d = document.createElement('div');
      d.id = 'crash-toast';
      d.style.cssText = 'position:fixed;left:50%;bottom:calc(var(--navh,30px) + 8px);transform:translateX(-50%);z-index:3000;'
        + 'background:rgba(24,21,12,0.96);border:1px solid #c9b98a;color:#efe9d6;padding:6px 12px;border-radius:8px;font-size:12px;max-width:92vw';
      d.textContent = '界面暂时未显示，请重试操作；详情已记录。';
      document.body.appendChild(d);
      setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 8000);
    }
  }

function renderInner() {
    const st = S();
    if (!st) return;
    document.body.classList.toggle('nightmare-mode',st.difficulty==='nightmare' && !st.flags.ended_N);
    document.body.classList.toggle('legend-mode',st.difficulty==='legend');
    document.body.style.setProperty('--night-red',`hsl(354 70% ${Math.max(50,70-Math.floor(st.day/20)*2)}%)`);
    if (st.scene !== 'camp' || deps.view === 'map') deps.roomView = false;
    if (!$('#top-day')) return;   // 游戏主界面尚未挂载（标题/选择画面阶段）
    // 进入地图（从场景回到地图）→ 自动把"你所在的地方"对到画面中央，但不许拖出地图边界
    const wasMap = _lastView === 'map';
    _lastView = deps.view;
    document.body.classList.toggle('on-map', deps.view === 'map');
    document.body.classList.toggle('in-room', deps.roomView);
    document.body.classList.toggle('room-fullcolor', deps.roomView && skinOn('seasons'));
    const mapNav = $('#nav [data-nav="map"]');
    if (mapNav) deps.dom.text(mapNav, deps.roomView ? '← 返回营地' : deps.view === 'map' ? '← 返回场景' : '🗺 地图');
    renderTut(st);
    renderTopbar();
    renderObjective();
    if (deps.view === 'map') renderMap(!wasMap);
    else renderScene();
    renderExtras();
    bindLogGrip();   // 日志可上下滑（热点/箭头优先）；只挂一次
    bindLogCollapseBtn();   // 日志栏收起/展开按钮；只挂一次
    fitStage();   // 面板渲染完再定位（否则首次布局未稳定→按钮/日志错位）
    // 音效环境随场景/昼夜/天气/篝火切换
    const night = Game.isNight();
    const fireBuilt = st.buildings.fire >= 0;
    if (!lastEnv || lastEnv.scene !== st.scene || lastEnv.night !== night || lastEnv.weather !== st.weather || lastEnv.fire !== fireBuilt) {
      AudioFX.setFire(fireBuilt);
      AudioFX.setEnv(night, st.weather);
      AudioFX.setScene(st.scene, st.scene === 'atlantis' && ['trench', 'abyss', 'sanctum'].includes(st.zone));
      AudioFX.setTension(st.stats.hp / Game.hpMax() < 0.35 ? 1 : 0);
    }
    lastEnv = { scene: st.scene, night, weather: st.weather, fire: fireBuilt };
  }

let lastEnv = null;

let _lastView = null;
    return Object.freeze({render,recordError,onRenderCrash,renderInner});
  }
  return Object.freeze({create});
})();
