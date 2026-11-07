/* hud：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const HudView = (() => {
  function create(deps) {
    const $=(...args)=>deps.$(...args);
    const el=(...args)=>deps.el(...args);
    const S=(...args)=>deps.S(...args);
    const esc=(...args)=>deps.esc(...args);
    const bindPress=(...args)=>deps.bindPress(...args);
    const fitStage=(...args)=>deps.fitStage(...args);
    const showBuffInfo=(...args)=>deps.showBuffInfo(...args);
function applyLogMode() {
    const l = $('#log');
    document.body.classList.toggle('log-hidden', deps.logMode === 'hidden');
    document.body.classList.toggle('log-fade', deps.logMode === 'fade');
    if (!l) return;
    l.style.display = (deps.logMode === 'hidden') ? 'none' : '';
    clearTimeout(deps.logFadeTimer);
    l.classList.remove('dim');
    if (deps.logMode === 'fade') deps.logFadeTimer = setTimeout(() => l.classList.add('dim'), 3000);
    alignLogGrip();
  }

function setLogMode(m) {
    deps.logMode = ['always', 'fade', 'hidden'].includes(m) ? m : 'always';
    try { localStorage.setItem('guyuyizhang_logmode', deps.logMode); } catch (e) {}
    applyLogMode();
  }

function setShowObjective(on) {
    deps.showObjective = !!on;
    try { localStorage.setItem('guyuyizhang_obj', deps.showObjective ? '1' : '0'); } catch (e) {}
    renderObjective();
  }

function logWidthFor(w) {
    const mobile=w<900;
    const base=(deps.LOG_WIDTHS[deps.logSize] || 250)*(mobile?.62:1);
    return Math.round(Math.min(w*(mobile?.32:.5),Math.max(mobile?64:(deps.logSize==='tiny'?88:150),Math.min(380,base))));
  }

function setLogSize(s) {
    deps.logSize = deps.LOG_WIDTHS[s] ? s : 'mid';
    document.body.classList.toggle('log-tiny',deps.logSize==='tiny');
    try { localStorage.setItem('guyuyizhang_logw', deps.logSize); } catch (e) {}
    fitStage();
  }

function applyLogCollapse() {
    document.body.classList.toggle('log-collapsed', deps.logCollapsed);
    const g = document.getElementById('log-grip');
    if (g) { g.textContent = deps.logCollapsed ? '▶' : '◀'; g.title = deps.logCollapsed ? '展开日志栏' : '收起日志栏'; }
  }

function bindLogCollapseBtn() {
    if (document.getElementById('log-grip')) return;
    const b = el('button', '', '◀');
    b.id = 'log-grip';
    b.onclick = () => {
      deps.logCollapsed = !deps.logCollapsed;
      try { localStorage.setItem('guyuyizhang_logcollapse', deps.logCollapsed ? '1' : '0'); } catch (e) {}
      applyLogCollapse(); applyLogMode();
    };
    document.body.appendChild(b);
    applyLogCollapse();
  }

function alignLogGrip(rect = $('#main')?.getBoundingClientRect()) {
    const grip = $('#log-grip');
    if (!grip) return;
    grip.style.display = rect && deps.logMode !== 'hidden' ? 'flex' : 'none';
    if (rect) {
      grip.style.left = Math.round(rect.left + 4) + 'px';
      grip.style.top = Math.round(rect.top + 5) + 'px';
    }
  }

function renderObjective() {
    const o = $('#objective');
    if (!o) return;
    const st = S();
    // 只在营地显示当前目标；设置里可以整个关掉（作者 2026-09-19）
    if (!st || st.scene !== 'camp' || !deps.showObjective) { deps.dom.html(o,''); return; }
    const obj = Game.currentObjective();
    deps.dom.html(o,obj ? `<span class="obj-mark">◈</span> 当前目标：${esc(obj)}` : '');
  }

function renderTopbar() {
    const st = S();
    const w = WEATHER[st.weather].name;
    const se = Game.seasonInfo();
    deps.dom.text($('#top-day'),`第 ${st.day} 天`);
    // 冻结期间在时间前标个 ⏸：让玩家知道"不是卡住了，是看面板时时间停住了"
    deps.dom.text($('#top-time'),(Game.timeFrozen && Game.timeFrozen() ? '⏸ ' : '') + Game.fmtTime());
    deps.dom.text($('#top-season'),`${se.name}季`);
    deps.dom.text($('#top-weather'),`${WEATHER[st.weather].glyph || ''} ${w}`);
    deps.dom.text($('#top-temperature'),`${Game.weatherTemperature()}℃`);
    const bars = { health: Game.healthValue(), hp: st.stats.hp, stamina: st.stats.stamina, hunger: st.stats.hunger, thirst: st.stats.thirst, spirit: st.stats.spirit };
    const mSt = Game.maxStam();
    for (const k in bars) {
      const fill = $(`#bar-${k}`);
      if (fill) fill.style.width = (k === 'stamina' ? (bars[k] / mSt) : k === 'hp' ? (bars[k] / Game.hpMax()) : bars[k] / 100) * 100 + '%';
      const control = $(`[data-stat-info="${k}"]`);
      if (control) control.onclick = () => {
        const details = {
          hp: ['生命', '生命耗尽时会倒下。'],
          stamina: ['体力', '移动、采集和制造会消耗体力，休息可以恢复。'],
          hunger: ['饱食', '进食可以恢复饱食。长期饥饿会损害生命。'],
          thirst: ['水分', '饮水可以补充水分。缺水会损害生命。'],
          spirit: ['精神', '精神低落会降低体力上限，严重时还会拖慢采集。'],
          health: ['健康', '受伤或持续负面状态会降低健康，低于40且久未治疗可能感染。可用药膏恢复。']
        };
        const [name, description] = details[k];
        const max = k === 'hp' ? Game.hpMax() : k === 'stamina' ? mSt : 100;
        showBuffInfo(name, `${Math.round(bars[k])}/${max}。 ${description}`);
      };
      const num = $(`#num-${k}`);
      if (num) deps.dom.text(num,k === 'hp' ? `${Math.round(bars[k])}/${Game.hpMax()}` : Math.round(bars[k]));
      // 饱食 / 水分 / 生命 严格 <30 → 变红（数值与进度条都变红）；恢复 ≥30 自动复原。两套皮肤都可读。
      const low = (k === 'hunger' || k === 'thirst' || k === 'hp') && bars[k] < 30 || k==='health' && bars[k]<40;
      if (fill) { fill.classList.toggle('bar-low', low); if (fill.parentElement) fill.parentElement.classList.toggle('low-border', low); }
      if (num) num.classList.toggle('num-low', low);
    }
    const capEl = $('#cap');
    if (capEl) {
      const over = Game.capUsed() > Game.capacity();
      deps.dom.text(capEl,`${Game.capUsed()}/${Game.capacity()} 格${over ? ' ⚠' : ''}`);
      capEl.classList.toggle('num-low', over);
      capEl.title = over ? `带了过多的物品，移动体力消耗增加${Game.loadPenalty().percent}%。物品仍保留，可存入仓库或丢弃以减轻负重。` : '';
    }
    const mcnt = $('#mail-count'); if (mcnt) deps.dom.text(mcnt,(Game.mailboxCount() > 0 ? Game.mailboxCount() : ''));
    // 状态徽标
    const sts = [];
    if (st.statuses.bleed) sts.push('流血');
    if (st.statuses.poison) sts.push('中毒');
    sts.push(`健康：${Game.healthValue()}/100`);
    if(st.statuses.infection)sts.push(st.statuses.infection>=2?'感染恶化：每小时-4生命':'感染：每小时-2生命');
    const temp = Game.temperatureInfo();
    sts.push(`温度：${temp.state === 'cold' ? '寒冷' : temp.state === 'heat' ? '炎热' : '适宜'}${temp.state !== 'normal' && temp.grace ? `（缓冲 ${temp.grace} 分）` : ''}`);
    if (st.statuses.fear) sts.push('恐惧');
    // 水下：不穿潜水服（水压 -6/小时）/ 没有氧气来源（缺氧 -3/小时）。
    // 这两条每小时真掉血，但以前**根本不在徽标列表里**，加上窄屏整条被 CSS 隐藏，
    // 玩家在海底就是"看着血往下掉、不知道为什么"（作者 2026-09-23 反馈）。现算，换装立刻消失。
    const dw = Game.diveWarn ? Game.diveWarn() : null;
    if (dw && dw.pressure) sts.push('水压：没穿潜水服，每小时-6生命');
    if (dw && dw.o2) sts.push('缺氧：每小时-3生命');
    // 精神低落会压低体力上限（蓝牛的代价就体现在这里）
    if (st.stats.spirit < 20) sts.push('精神恍惚：体力上限-20%、采集耗时+10%');
    else if (st.stats.spirit < 50) sts.push('精神低落：体力上限-10%');
    if((st.statuses.nauseaUntil || 0)>(st.tick||0)) sts.push(`反胃：体耗+50%（${Math.ceil((st.statuses.nauseaUntil-st.tick)/60)}小时）`);
    for(const b of Game.activeBuffs()) sts.push(`${b.name}+${b.stat==='accuracy'?Math.round(b.value*100)+'%':b.value}（${b.minutes}分）`);
    const tempHint = temp.state === 'normal' ? '体温舒适' : temp.grace ? `还有 ${temp.grace} 分钟换衣缓冲` : `命中 -10 个百分点，每小时 -${temp.state === 'cold' ? 5 : 3} 生命`;
    const brief={流血:'每小时失去5生命，并降低健康。止血绷带可以止血。',中毒:'每小时失去3生命，并降低健康。解毒剂可以解毒。',恐惧:'降低命中。持续恐惧会降低健康，防御可抵挡梦魇恐吓。'};
    const badges=sts.map(full=>{let name=full.split('：')[0].split('+')[0],text=full;if(full.startsWith('温度：')){name=temp.state==='cold'?'寒冷':temp.state==='heat'?'炎热':'适宜';text=tempHint;}if(brief[name])text=brief[name];return {name,text,danger:/流血|中毒|寒冷|炎热|恐惧|水压|缺氧|精神|反胃|感染/.test(name)};});
    deps.dom.html($('#status-badges'),badges.slice().sort((a,b)=>Number(b.danger)-Number(a.danger)).slice(0,window.innerWidth<900?1:2).map((b,i)=>`<button type="button" class="badge ${b.danger?'danger':''}" data-buff-info="${i}">${esc(b.name)}</button>`).join('')+'<button type="button" class="badge" data-buff-info="all">状态</button>');
    $('#status-badges').querySelectorAll('[data-buff-info]').forEach(b=>bindPress(b,()=>{deps.modalOpenedAt=Date.now();showBuffInfo(b.dataset.buffInfo !== 'all' && b.textContent === '健康' ? '健康' : '当前状态', b.dataset.buffInfo !== 'all' && b.textContent === '健康' ? `${Game.healthValue()}/100` : badges.filter(v=>v.name!=='健康').map(v=>v.name==='适宜'?v.text:v.name+'：'+v.text).join('\n'));}));

  }
    return Object.freeze({applyLogMode,setLogMode,setShowObjective,logWidthFor,setLogSize,applyLogCollapse,bindLogCollapseBtn,alignLogGrip,renderObjective,renderTopbar});
  }
  return Object.freeze({create});
})();
