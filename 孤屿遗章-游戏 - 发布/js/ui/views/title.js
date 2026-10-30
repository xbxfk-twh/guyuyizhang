/* title：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const TitleView = (() => {
  function create(deps) {
    const $=(...args)=>deps.$(...args);
    const el=(...args)=>deps.el(...args);
    const S=(...args)=>deps.S(...args);
    const centerToast=(...args)=>deps.centerToast(...args);
    const addLog=(...args)=>deps.addLog(...args);
    const portraitPath=(...args)=>deps.portraitPath(...args);
    const render=(...args)=>deps.render(...args);
    const askConfirm=(...args)=>deps.askConfirm(...args);
    const showModal=(...args)=>deps.showModal(...args);
    const begin=(...args)=>deps.begin(...args);
function rememberIdentity() {
    try {
      const st = S();
      if (st && st.identity) deps.lastIdentity = st.identity;
      if (st && st.difficulty) deps.lastDifficulty = st.difficulty;
      localStorage.setItem('guyuyizhang_identity', deps.lastIdentity);
      localStorage.setItem('guyuyizhang_difficulty', deps.lastDifficulty);
    } catch (e) {}
  }

function showTitle() {
    const app = $('#app');
    const has = Game.hasSave();
    // ⚠️ 日志栏收起按钮（#log-grip）是挂在 body 上的，不属于 #app，
    //    所以回到标题页时它不会被 app.innerHTML 清掉 —— 会孤零零留在左上角（玩家截图反馈过）。
    //    标题页/选择身份页都把它藏起来，只有真正进游戏后才显示。
    const grip = document.getElementById('log-grip');
    if (grip) grip.style.display = 'none';
    deps.dom.dispose(app);app.innerHTML = `
      <div id="title-screen">
        <div class="title-language">${window.Locale?Locale.control():''}</div>
        <img src="assets/img/title.png" alt="">
        <div id="title-name"><span class="tt" data-ch="孤">孤</span><span class="tt" data-ch="屿">屿</span><span class="tt" data-ch="遗">遗</span><span class="tt" data-ch="章">章</span></div>
        <div id="title-sub">一座孤岛 · 一段余生 · 一本日记</div>
        <div id="title-btns">
          <button id="btn-new">新的旅程</button>
          ${has ? '<button id="btn-load">继续上次游戏</button>' : ''}
        <button id="btn-meta">◈ 历代遗章</button>
        <button id="btn-bak">📦 备份·读档</button>
        <button id="btn-set">☰ 大菜单${NoticeBadges.dot('menu')}</button>
        </div>
        <div id="title-tip">备份点 ${Game.backupPoints()}</div>
        <div id="modal"></div>
      </div>`;
    NoticeBadges.refresh(app);
    // 事件委托：标题按钮（防首次渲染/重渲染丢绑定）
    app.onclick = (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!btn) return;
      if (btn.id === 'btn-new') { AudioFX.init(); showJourneySelect(); }
      else if (btn.id === 'btn-load') {
        AudioFX.init();
        if (Game.load()) {
          // 上一局已经死了（生命归零 / 带着死亡记录）：别直接放进营地，
          // 先把结局画面弹出来——复活要花 50 魂点，吃口药复活是不算数的（作者 2026-09-19）
          const s0 = Game.S();
          begin();
        } else centerToast('存档暂时无法读取，原记录已保留。请重试或从备份中恢复。');
      }
      else if (btn.id === 'btn-meta') { AudioFX.init(); showModal('heirloom'); }
      else if (btn.id === 'btn-bak') { AudioFX.init(); showModal('backup'); }
      else if (btn.id === 'btn-set') { AudioFX.init(); showModal('savemenu'); }
    };
    // 隐藏开发者模式：连点"章"×4 → 输密码
    let devClicks = 0;
    app.querySelectorAll('.tt').forEach(sp => sp.onclick = () => {
      if (sp.dataset.ch !== '章') return;
      devClicks++;
      if (devClicks >= 4) { devClicks = 0; showModal('devpw'); }
    });
    // 现实 10 秒 = 游戏 1 分钟（紧迫感）；待机超过 10 分钟则暂停时间流逝（防挂机挂死）
    if (!window.__guyuLifecycleBound) {
    window.__guyuLifecycleBound = true;
    let lastActive = Date.now();
    const markActive = (e) => { if (e && e.isTrusted === false) return; lastActive = Date.now(); };
    ['pointerdown','touchstart','keydown','scroll'].forEach(ev => document.addEventListener(ev, markActive, { passive: true }));
    setInterval(() => {
      const stg = Game.S();
      if (!stg || !document.getElementById('top-day') || document.hidden || deps.uiBusy || deps.traveling || stg.ending || stg.death) return;
      if (Date.now() - lastActive > 10 * 60 * 1000) return;   // 待机超 10 分钟 → 时间暂停
      Game.timePass(1);
    }, 10000);
    // 离开/切后台/刷新时自动存盘（防止 iPad/移动端刷新丢档）
    const autoSave = () => { try { const s = Game.S(); if (s && !s.ending && !s.death) {const saved=Game.save();if(saved.ok)window.GuyuSaveBridge?.flush();} } catch(e){} };
    window.addEventListener('pagehide', autoSave);
    window.addEventListener('beforeunload', autoSave);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') autoSave(); });
    // ---- 存档加固（玩家反馈"退后台回来存档没了"）----
    // ① 每 20 秒兜底自动存一次：手机上被系统直接杀掉页面时，pagehide 不一定来得及跑
    if (!window.__guyuAutoSaveTimer) {
      window.__guyuAutoSaveTimer = setInterval(() => {
        const s = Game.S();
        if (!s || s.ending || s.death) return;
        if (!s._dirty) {if(Game.cloudStatus().pendingLocal)window.GuyuSaveBridge?.flush();return;}
        Game.saveAndFlush();
      }, 20000);
    }
    // ② 从后台/bfcache 回来时，如果别的标签页写过更新的存档，就用那份重新同步，避免拿旧进度覆盖
    window.addEventListener('pageshow', (e) => {
      const s = Game.S();
      if (!s || (!e.persisted && !s._dirty)) return;
      if (Game.saveRev() > (s._rev || 0)) {
        if (s._dirty) { Game.save(); return; } // 触发冲突提示，保留本页尚未保存的改动
        try { if (Game.load()) { render(); addLog('检测到另一处有更新的进度，已为你同步。', 'sys'); } } catch (err) {}
      }
    });
    } // 生命周期监听和计时器整页只注册一次
    AudioFX.setScene('title');
  }

let lastSlot = -1;

function showJourneySelect() {
    const app = $('#app');
    const slots = Game.slotList();
    const bp = Game.backupPoints();
    let html = `<div id="select-screen"><div class="select-title">开始新的旅程 <span style="font-weight:400;font-size:13px;letter-spacing:0.02em">｜ 备份点：${bp} <button class="mini-btn" data-titlebuybp="1">＋</button></span></div>
      <div class="identity-list">`;
    for (let i = 0; i < 4; i++) {
      const s = slots[i];
      if (i === 3 && !Game.extraSlotUnlocked()) {
        html += '<button class="identity" data-slot="3"><b>备份槽 4 · 未解锁</b><span>100 魂点永久解锁</span></button>';
        continue;
      }
      html += `<button class="identity" data-slot="${i}"><b>备份槽 ${i + 1}${s ? ` · 第${s.day}天` : ' · 空白'}</b><span>${s ? `第 ${s.day} 天${s.settled ? '（已结算）' : ''} · 点击从此处继续` : '空白 · 点击开始新游戏'}</span></button>`;
    }
    html += `</div><button id="sel-back">返回</button><div id="modal"></div></div>`;
    deps.dom.dispose(app);app.innerHTML = html;
    app.querySelectorAll('.identity').forEach(b => b.onclick = () => {
      const i = +b.dataset.slot;
      if (i === 3 && !Game.extraSlotUnlocked()) { showModal('buyslot'); return; }
      const s = Game.slotList()[i];
      if (s) { const r = Game.loadSlot(i); if (r.ok) begin(); else addLog(r.reason, 'warn'); return; }
      // ⚠️ 开新游戏会覆盖"当前进行中的那一份"（备份槽不受影响）——先说清再动，
      //    玩家反馈"我新开了游戏，在读以前的档，没跳出来覆盖咋办"。
      let d = 0;
      try { const j = JSON.parse(localStorage.getItem('guyuyizhang_save') || 'null'); d = (j && j.day) || 0; } catch (e) {}
      const startNew = () => { lastSlot = i; showIdentity(); };
      // ⛔ 这里原来用原生 confirm()：iPhone / Taptap 的 WKWebView 里 confirm 不返回，
      //    点空白槽等于点了没反应，玩家根本开不了新游戏。改用游戏自己的确认弹窗。
      if (d > 1) {
        askConfirm(`你有一份进行中的存档（第 ${d} 天）——开新游戏会覆盖它（「备份 · 读档」里的备份槽不受影响）。确定开始新游戏吗？`, startNew, '开始新游戏');
        return;
      }
      startNew();
    });
    app.querySelectorAll('[data-titlebuybp]').forEach(b => b.onclick = () => showModal('buybp'));
    $('#sel-back').onclick = showTitle;
  }

function showIdentity() {
    const app = $('#app');
    const grip0 = document.getElementById('log-grip');   // 同上：选择身份页也不该出现它
    if (grip0) grip0.style.display = 'none';
    let html = `<div id="select-screen"><div class="select-title">你是什么人？ <small>魂点 ${Game.metaState().soul || 0}</small></div><div class="identity-list">`;
    for (const [id, idn] of Object.entries(IDENTITIES).sort(([a],[b])=>Number(['trainer','beekeeper'].includes(a))-Number(['trainer','beekeeper'].includes(b)))) {
      // 立绘卡面：受皮肤包控制（"彩绘卡面"皮肤会整套换掉），缺图自动回退到默认立绘
      const locked=!Game.identityUnlocked(id);
      html += `<button class="identity" data-id="${id}"><span class="id-card"><img src="${portraitPath(id)}" alt="" onerror="__portraitFail(this,'${id}')"></span><span class="id-body"><b>${idn.name}${locked?' · 100 魂点解锁':''}</b><span class="id-desc">${idn.desc}${locked?' · 永久解锁，已有存档可继续。':''}</span></span></button>`;
    }
    html += `</div><button id="sel-back">返回</button><div id="modal"></div></div>`;
    deps.dom.dispose(app);app.innerHTML = html;
    app.querySelectorAll('.identity').forEach(b => b.onclick = () => {
      const id=b.dataset.id;
      if (!Game.identityUnlocked(id)) {
        askConfirm(`花费 100 魂点永久解锁${IDENTITIES[id].name}？当前魂点 ${Game.metaState().soul || 0}。`,()=>{
          const r=Game.unlockIdentity(id);centerToast(r.ok?'角色已永久解锁':r.reason);showIdentity();
        },'解锁角色');return;
      }
      deps.lastIdentity = id; try { localStorage.setItem('guyuyizhang_identity', deps.lastIdentity); } catch (e) {} showDifficulty();
    });
    $('#sel-back').onclick = showTitle;
  }

function showDifficulty() {
    const app = $('#app');
    let html = `<div id="select-screen"><div class="select-title">选择难度</div><div class="identity-list">`;
    for (const [id, d] of Object.entries(DIFFICULTIES)) {
      if (id === 'dev' && !Game.devEnabled()) continue;
      const unlocked=Game.difficultyUnlocked(id);
      html += `<button class="identity difficulty-${id}" data-id="${id}" ${unlocked?'':'disabled'}><span class="id-body"><b>${d.name}${unlocked?'':' · 未解锁'}${d.recommend ? ' <i style="font-style:normal;font-size:11px;border:1px solid var(--ink);padding:0 4px;border-radius:3px">新手推荐</i>' : ''}</b><span>${unlocked?d.desc:'幸存者模式完成任一通关结局解锁。'}</span></span></button>`;
    }
    html += `</div><div class="hint" style="margin-top:6px">第一次玩？选「求生者」就行，按喜欢的体验选择。</div><button id="sel-back">返回</button><div id="modal"></div></div>`;
    deps.dom.dispose(app);app.innerHTML = html;
    // 开场分镜只在"真人点了难度"时播：程序化 click（探针/自动化，isTrusted === false）自动跳过，
    // 免得每次截图/回归都要先手动关掉分镜。探针想看分镜就设 window.__guyuForceComic = 1。
    app.querySelectorAll('.identity').forEach(b => b.onclick = (e) => {
      deps.lastDifficulty = b.dataset.id;
      try { localStorage.setItem('guyuyizhang_difficulty', deps.lastDifficulty); } catch (err) {}
      const result=Game.newGame(deps.lastIdentity,deps.lastDifficulty);
      if(result && result.ok===false){centerToast(result.reason);return;}
      deps.freshRun = (e && e.isTrusted === false) ? !!window.__guyuForceComic : true;
      begin();
    });
    $('#sel-back').onclick = showIdentity;
  }

function showComicIntro(done) {
    const st = S();
    const lk = !!(st && st.identity === 'linghui');   // 灵灰：冷蓝调，跟她在游戏里的表现一致
    const scr = el('div', '');
    scr.id = 'comic-screen';
    if (lk) scr.classList.add('lk');
    scr.innerHTML = `<img id="comic-img" alt="" draggable="false">
      <div class="comic-shade"></div>
      <div class="comic-cap"><div class="comic-step"></div><div class="comic-title"></div><div class="comic-text"></div></div>
      <div class="comic-bar"><div class="comic-dots">${deps.COMIC.map(() => '<i></i>').join('')}</div>
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
    const preload = (k) => { if (deps.COMIC[k]) { const x = new Image(); x.src = deps.COMIC[k].img; } };
    const draw = () => {
      const c = deps.COMIC[i];
      img.onerror = () => { if (img.src.indexOf(c.fb) < 0) img.src = c.fb; };   // 缺图 → 回退，绝不空白
      img.src = c.img;
      img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';   // 每格都重新"淡入 + 慢慢推近"
      stepEl.textContent = `开场 · 第 ${i + 1} / ${deps.COMIC.length} 格`;
      titleEl.textContent = c.t;
      textEl.textContent = c.s;
      textEl.style.animation = 'none'; void textEl.offsetWidth; textEl.style.animation = '';   // 文字重新淡入
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
      nextBtn.textContent = (i === deps.COMIC.length - 1) ? '爬上沙滩 ▶' : '继续 ▶';
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
      if (i < deps.COMIC.length - 1) { i++; try { AudioFX.play('click'); } catch (e) {} draw(); }
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
    return Object.freeze({rememberIdentity,showTitle,showJourneySelect,showIdentity,showDifficulty,showComicIntro});
  }
  return Object.freeze({create});
})();
