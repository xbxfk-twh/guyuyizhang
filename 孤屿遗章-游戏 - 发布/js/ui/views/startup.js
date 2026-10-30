/* startup：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const StartupView = (() => {
  function create(deps) {
    const $=(...args)=>deps.$(...args);
    const centerToast=(...args)=>deps.centerToast(...args);
    const addLog=(...args)=>deps.addLog(...args);
    const replayLog=(...args)=>deps.replayLog(...args);
    const applySkin=(...args)=>deps.applySkin(...args);
    const applyLogMode=(...args)=>deps.applyLogMode(...args);
    const render=(...args)=>deps.render(...args);
    const noteBootStart=(...args)=>deps.noteBootStart(...args);
    const noteBootOk=(...args)=>deps.noteBootOk(...args);
    const inGameCrashes=(...args)=>deps.inGameCrashes(...args);
    const withAnimation=(...args)=>deps.withAnimation(...args);
    const restoreCombatView=(...args)=>deps.restoreCombatView(...args);
    const showModal=(...args)=>deps.showModal(...args);
    const closeModal=(...args)=>deps.closeModal(...args);
    const tutAfterBag=(...args)=>deps.tutAfterBag(...args);
    const showEnding=(...args)=>deps.showEnding(...args);
    const rememberIdentity=(...args)=>deps.rememberIdentity(...args);
    const showTitle=(...args)=>deps.showTitle(...args);
    const showComicIntro=(...args)=>deps.showComicIntro(...args);
function begin() {
    document.body.classList.remove('modal-open');
    const app = $('#app');
    deps.roomView = false;
    rememberIdentity();   // 记下本局的身份/难度，重开时沿用
    // 加载画面（约 2.2 秒）：鸟鸣 + 树叶沙沙 + 随机提示
    const TIPS = ['悄悄告诉你，游戏官方群号是 1014679931 哦☆', '缺树枝？手工劈柴可把2木材做成4树枝。', '规律作息可以回复更多体力和血量。', '晚上 10 点到 12 点睡觉，体力回得最满。', '吃饱喝足再睡，才不会睡到掉血。', '越远的地方越危险，也越稀有。', '工具和武器都有耐久，用坏了要重新做。', '远古金币能买稀有货；老潮那儿 50 贝壳换 1 金币，1 金币也能换回 30 贝壳。', '雨天去树林，蘑菇会更多。', '瞭望台能让你看见更远的地方。', '死亡不是终点，魂点会沉淀进《历代遗章》。'];
    const L = document.createElement('div');
    L.id = 'loading';
    L.innerHTML = `<div class="load-glyph">◈</div><div class="load-tip">${TIPS[Math.floor(Math.random() * TIPS.length)]}</div><div class="load-bar"><i></i></div>`;
    document.body.appendChild(L);
    AudioFX.setScene('forest');   // 加载时播清脆鸟叫+树叶沙沙
    setTimeout(() => { L.classList.add('done'); setTimeout(() => L.remove(), 500); }, 2200);
    deps.dom.dispose(app);app.innerHTML = `
      <div id="topbar">
        <!-- ⚠️ 邮箱按钮必须是顶栏最后一个、且不被裁掉：以前它排在状态条后面，窄屏下状态条把它挤到
             右边又被顶栏的 overflow:hidden 裁掉，看起来像"跑到格子栏右边"。
             现在拆成两层：状态区是 flex:1 且自身可横向滚动，邮箱 flex:none 永远钉在最右。 -->
        <div id="topstats">
        <span id="top-day">第 1 天</span>
        <span id="top-time">08:00</span>
        <span id="top-season">春季</span>
        <span id="top-weather">晴</span>
        <span id="top-temperature" class="top-temp" title="当前天气气温；所在地点的环境温度见装备·属性">20℃</span>
        <span class="stat"><span class="stat-name" title="生命" aria-label="生命">♥</span><div class="stat-bar"><div id="bar-hp" class="stat-fill hp"></div></div><span class="stat-num" id="num-hp"></span></span>
        <span class="stat"><span class="stat-name" title="体力" aria-label="体力">ϟ</span><div class="stat-bar"><div id="bar-stamina" class="stat-fill st"></div></div><span class="stat-num" id="num-stamina">100</span></span>
        <span class="stat"><span class="stat-name" title="饱食" aria-label="饱食">◒</span><div class="stat-bar"><div id="bar-hunger" class="stat-fill hu"></div></div><span class="stat-num" id="num-hunger">100</span></span>
        <span class="stat"><span class="stat-name" title="水分" aria-label="水分"><svg viewBox="0 0 16 20" width="12" height="14" aria-hidden="true"><path fill="currentColor" d="M8 0C6 5 0 10 0 14a8 6 0 0 0 16 0C16 10 10 5 8 0Z"/></svg></span><div class="stat-bar"><div id="bar-thirst" class="stat-fill th"></div></div><span class="stat-num" id="num-thirst">100</span></span>
        <span class="stat"><span class="stat-name" title="精神" aria-label="精神">✦</span><div class="stat-bar"><div id="bar-spirit" class="stat-fill sp"></div></div><span class="stat-num" id="num-spirit">100</span></span>
        <span class="stat"><span class="stat-name" title="健康" aria-label="健康">✚</span><div class="stat-bar"><div id="bar-health" class="stat-fill st"></div></div><span class="stat-num" id="num-health">100</span></span>
        <span id="cap">0/23 格</span>
        </div>
        <div id="status-badges" aria-live="polite"></div>
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
        <button data-nav="craft">🔨 制造</button>
        <button data-nav="equip">⚔ 装备</button>
        <button data-nav="inv">🎒 背包</button>
        <button data-nav="save">☰ 菜单${NoticeBadges.dot('menu')}</button>
      </div>
      <div id="modal"></div>
      <div id="busy"></div>
      <button id="anim-speed" title="采集/建造/攻击动画速度">动画×1</button>`;
    replayLog();      // 界面搭好就把存档里的日志历史补回来（开新局的第 1 条、读档前的记录都在这）
    deps.view = 'scene';
    const spd = $('#anim-speed');
    if (spd) { spd.textContent = '动画×' + deps.animSpeed; spd.onclick = () => { deps.animSpeed = (deps.animSpeed % 3) + 1; spd.textContent = '动画×' + deps.animSpeed; try { localStorage.setItem('guyuyizhang_anim', String(deps.animSpeed)); } catch (e) {} AudioFX.play('pickup'); }; }
    const bb = $('#btn-backmap');
    if (bb) {
      // 在地图界面时它应该带你回场景，而不是重复打开地图
      bb.textContent = (deps.view === 'map') ? '← 返回场景' : '← 返回地图';
      bb.onclick = () => {
        if (deps.roomView) { deps.roomView = false; render(); return; }
        if (deps.view === 'map') { deps.view = 'scene'; render(); return; }
        deps.view = 'map'; render();
        const mw = $('#map-wrap'); if (mw) { mw.classList.remove('map-in'); void mw.offsetWidth; mw.classList.add('map-in'); }
      };
    }
    const br = $('#btn-rest');
    const brh = $('#btn-rest-h');
    if (br) {
      br.textContent = '休息 ' + deps.restHours + ' 小时';
      br.onclick = () => { if (Game.S().stats.stamina >= Game.maxStam()) { addLog('体力充沛，不需要休息。', 'warn'); return; } withAnimation('rest', '休息 ' + deps.restHours + ' 小时', () => Game.rest(deps.restHours), 'rest'); };
    }
    if (brh) {
      brh.textContent = '×' + deps.restHours;
      brh.onclick = () => {   // 1 → 2 → 3 → 1 循环
        deps.restHours = (deps.restHours % 3) + 1;
        brh.textContent = '×' + deps.restHours;
        if (br) br.textContent = '休息 ' + deps.restHours + ' 小时';
        try { localStorage.setItem('guyuyizhang_rest', String(deps.restHours)); } catch (e) {}
        AudioFX.play('pickup');
      };
    }
    const bm = $('#btn-mail'); if (bm) bm.onclick = () => { deps.mailTab = 'mail'; showModal('mailbox'); };
    // 主页右上角「攻略」（作者 2026-09-23）：打开全流程攻略弹窗
    const bg2 = $('#btn-guide'); if (bg2) bg2.onclick = () => showModal('guide');
    document.querySelectorAll('#nav [data-nav]').forEach(b => b.onclick = () => {
      if(restoreCombatView())return;
      const n = b.dataset.nav;
      if (n === 'map') { closeModal(); deps.view = 'map'; render(); }
      else if (n === 'inv') { tutAfterBag(); showModal('inv'); }
      else if (n === 'equip') { deps.equipTab = 'p1'; showModal('equip'); }
      else if (n === 'craft') showModal('craft');
      else if (n === 'save') showModal('savemenu');
    });
    // 点弹窗空白处 = 关闭（常规面板类；战斗/剧情选择除外）
    const modalEl = $('#modal');
    modalEl.addEventListener('click', (e) => {
      if (e.target !== modalEl) return;
      const k = deps.modal && deps.modal.kind;
      // 面板类都支持"点外面关闭"（战斗、剧情选择、结局、命名输入、掷骰子这种不能误关的除外）
      if (deps.panels.get(k).dismiss) closeModal();
    });
    // 移动端：不预加载全部大图，改为按需加载（切换场景时才读取对应图），降低内存与首屏压力
    render();
    AudioFX.setScene(Game.S().scene);
    const s0 = Game.S();
    if (s0 && s0.ending === 'D') { deps.freshRun=false;showEnding('D',s0.death || '你在上一局倒下了。',{noRevive: !Game.reviveInfo().ok});return; }
    // 序章叙事
    const introCard = () => showModal('overlay', {
      title: '第 1 天 · 海难',
      text: '风暴把船撕成了碎片。你被海浪冲上一片陌生的沙滩，浑身是伤，手里只剩半截缆绳。\n\n天是灰的，海也是灰的。身后有山的轮廓，脚下有河流入海，海平线上隐约有对岸的岛影。\n\n活下去。这是你接下来唯一要做的事。',
      choices: [{ label: '从沙滩上爬起来', ok: () => { addLog('你从沙滩上爬起来，把散落的物资收拢到一起。', 'sys'); } }],
    });
    // 新存档：先播 5 格开场分镜，播完（或点跳过）再出上面这张「第 1 天 · 海难」卡
    if (deps.freshRun) {
      deps.freshRun = false;
      [0, 1].forEach(k => { if (deps.COMIC[k]) { const x = new Image(); x.src = deps.COMIC[k].img; } });   // 加载画面那 2.4 秒里先把前两格拉下来
      setTimeout(() => showComicIntro(introCard), 2400);   // 等加载画面收掉再开始，别和它叠在一起
    }
    // 读档 / 继续上次游戏 / 备份恢复：不再重复弹这张"海难"卡（开场分镜已经讲过一遍来历了），
    // 直接进游戏。（以前每次打开存档都要再点一次"从沙滩上爬起来"）
  }

function init() {
    applyLogMode();   // 开局先把上次选的日志显示方式套上
    const crashes = noteBootStart();   // 上次是不是"没走到渲染成功就没了"（=崩了）
    const inGame = inGameCrashes();
    // 标题页能画出来 = 启动成功（这一步以前漏了，导致"只开标题页"被算成崩溃）
    // 先恢复账号，再核对付费皮肤所有权；读取中不能把“尚未读到”当成未拥有。
    const finish = () => { Game.initializeStorage();applySkin();showTitle(); noteBootOk(); if (window.__guyuBoot) window.__guyuBoot.ready(); if (crashes >= 2 || inGame >= 2) showSafeMode(Math.max(crashes, inGame)); };
    const go = async () => {
      try{
        const bridge=window.GuyuSaveBridge,result=bridge?await bridge.initialize(Game.validSave):{ok:true};
        if(result.conflict){
          if(!$('#modal')){const modal=document.createElement('div');modal.id='modal';$('#app').appendChild(modal);}
          if(window.__guyuBoot)window.__guyuBoot.ready();
          const choose=which=>{try{bridge.choose(which);finish();}catch(e){window.__guyuBoot?.fail(e.message);}};
          const c=result.conflict;
          const source=c.kind==='device'?'设备备份':'云端';
          showModal('overlay',{title:'选择要继续的进度',text:`本机与${source}存在不同的进度，请选择要继续的一份。\n本机：${c.localSoul}魂点、${c.localSlots}个备份；${source}：${c.cloudSoul}魂点、${c.cloudSlots}个备份。\n另一份会保留为恢复记录。`,requiredChoice:true,choices:[
            {label:result.conflict.localDay?`本机进度 · 第${result.conflict.localDay}天`:'保留本机账号记录',ok:()=>choose('local')},
            {label:result.conflict.cloudDay?`${source}进度 · 第${result.conflict.cloudDay}天`:`使用${source}账号记录`,ok:()=>choose('cloud')}
          ]});return;
        }
        finish();
      }catch(e){
        if(window.__guyuBoot)window.__guyuBoot.fail(e.message||'存档服务暂时无法读取，请重试。');
        const bridge=window.GuyuSaveBridge,actions=$('#boot-actions');
        if(actions&&bridge?.canContinueLocally?.()&&!$('#boot-local')){
          const button=document.createElement('button');button.id='boot-local';button.className='boot-primary';button.textContent='使用本机模式进入游戏';
          button.onclick=()=>{try{bridge.continueLocally();finish();centerToast('当前仅保存在本机，云端原进度不会被覆盖。');}catch(err){window.__guyuBoot?.fail(err.message);}};
          actions.insertBefore(button,actions.firstChild);
          window.__guyuBoot?.recovery('云存档暂时无法连接。可以使用本机模式进入游戏，原云端进度会保留；也可以重新尝试。');
        }
      }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
  }

function showSafeMode(crashes) {
    const err = (function () { try { return localStorage.getItem('guyuyizhang_lasterr') || '（没记到具体报错）'; } catch (e) { return '（读不到）'; } })();
    showModal('overlay', {
      title: '启动异常 · 安全模式',
      text: '上次打开游戏时中途出错了（连续 ' + crashes + ' 次）。\n\n报错记录：' + String(err).slice(0, 160)
        + '\n\n建议先保存完整备份文件，再试「用备份存档打开」（备份是上一次保存前的状态，最多丢几步）。',
      choices: [
        { label: '用备份存档打开', hint: '回退到上次保存前的状态', ok: () => {
          const r = Game.restoreBackupSave ? Game.restoreBackupSave() : { ok:false, reason:'这个版本没有备份存档功能' };
          if (r && r.ok) { begin(); addLog('已用备份存档打开。', 'good'); }
          else { centerToast('打不开备份：' + ((r && r.reason) || '未知')); }
        } },
        { label: '备份与迁移', hint: '生成10分钟有效的取件码；电脑可保存备份文件', ok: () => showModal('codex', { mode: 'export', code: Game.exportCode() }) },
        { label: '继续进入游戏', hint: '我了解风险', ok: () => {} },
      ],
    });
  }

function setHostSuspended(on) {
    Game.setHostSuspended(on);
    AudioFX.setHostSuspended(on);
    if (on && Game.S()) {const saved=Game.save();if(saved.ok)window.GuyuSaveBridge?.flush();return saved.ok;}
    return true;
  }

function handleBack() {
    if (deps.uiBusy || deps.traveling) return true;
    if (deps.modal || deps.battleView) { closeModal(); return true; }
    if (deps.roomView) { deps.roomView = false; render(); return true; }
    if (deps.view === 'map' && Game.S()) { deps.view = 'scene'; render(); return true; }
    return false; // 由原生壳弹出保存并退出确认。
  }
    return Object.freeze({begin,init,showSafeMode,setHostSuspended,handleBack});
  }
  return Object.freeze({create});
})();
