/* endings-share：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const EndingShareView = (() => {
  function create(deps) {
    const $=(...args)=>deps.$(...args);
    const S=(...args)=>deps.S(...args);
    const esc=(...args)=>deps.esc(...args);
    const centerToast=(...args)=>deps.centerToast(...args);
    const addLog=(...args)=>deps.addLog(...args);
    const showModal=(...args)=>deps.showModal(...args);
    const showIdentity=(...args)=>deps.showIdentity(...args);
let shareImgUrl = null;

function _wrapLines(ctx, text, maxW) {
    const out = [];
    for (const para of String(text == null ? '' : text).split('\n')) {
      let line = '';
      for (const ch of para) {
        if (line && ctx.measureText(line + ch).width > maxW) { out.push(line); line = ch; }
        else line += ch;
      }
      out.push(line);
    }
    return out;
  }

function buildShareCard(id) {
    return new Promise((resolve) => {
      const st = S() || {};
      const end = ENDINGS[id] || ENDINGS.D;
      const W = 1080, H = 1620;
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d');
      let INK = '#16150f', PAPER = '#ece7d9', SUB = '#5a564a', ACC = '#8a7346';
      const F = (w, s) => `${w} ${s}px "Noto Serif SC","Songti SC","SimSun",serif`;

      // 底纹：assets/img/share/poster.png —— 风暴晨光、孤岛和沉没文明的电影感海报。
      // 中央为深色留白，文字由画布叠加；图片不含文字。
      // 拿不到底纹就退回"全部用画布生成"的纸底 + 墨框，保证任何情况下都能出图。
      // SAFE_TOP/SAFE_BOT：中央文字安全区边界。上方场景约到 y≈330，底部海面从 y≈1140 起。
      const SAFE_TOP = 300, SAFE_BOT = 1264;
      const paint = (poster) => {
        ctx.clearRect(0, 0, W, H);
        // 深底用暖白与浅金；底纹失效时恢复纸底墨字，仍能读清。
        INK = poster ? '#f5efe2' : '#16150f';
        PAPER = poster ? '#fff8e8' : '#ece7d9';
        SUB = poster ? '#d2d8d6' : '#5a564a';
        ACC = poster ? '#dcb879' : '#8a7346';
        if (poster && poster.naturalWidth) {
          ctx.drawImage(poster, 0, 0, W, H);
        } else {
          // —— 退路：纸底 + 中心提亮 + 四周暗角 + 木刻颗粒 + 双层墨框（全部画布生成）——
          ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
          const g = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.10, W / 2, H * 0.52, H * 0.80);
          g.addColorStop(0, 'rgba(255,255,255,0.52)');
          g.addColorStop(1, 'rgba(120,112,92,0.20)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          ctx.save(); ctx.globalAlpha = 0.05; ctx.fillStyle = INK;
          for (let i = 0; i < 2400; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
          ctx.restore();
          ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.strokeRect(46, 46, W - 92, H - 92);
          ctx.strokeStyle = 'rgba(22,21,15,0.32)'; ctx.lineWidth = 2; ctx.strokeRect(66, 66, W - 132, H - 132);
        }

        ctx.textAlign = 'center';
        let y = SAFE_TOP + 48;

        // 页眉
        ctx.fillStyle = SUB; ctx.font = F('500', 30);
        ctx.fillText('孤 屿 遗 章', W / 2, y); y += 34;
        ctx.strokeStyle = poster ? 'rgba(220,184,121,0.7)' : 'rgba(22,21,15,0.45)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(W / 2 - 78, y); ctx.lineTo(W / 2 + 78, y); ctx.stroke();
        y += 100;

        // 结局名
        ctx.fillStyle = INK; ctx.font = F('bold', 80);
        ctx.fillText(`结局「${end.name}」`, W / 2, y); y += 62;

        // 一行元信息
        const diff = (DIFFICULTIES[st.difficulty] || {}).name || '';
        const idn = (IDENTITIES[st.identity] || {}).name || '';
        ctx.fillStyle = SUB; ctx.font = F('400', 30);
        ctx.fillText(`第 ${st.day} 天 · ${Game.seasonInfo().name}季${diff ? ' · ' + diff : ''}${idn ? ' · ' + idn : ''}`, W / 2, y);
        y += 74;

        // 结局正文
        ctx.fillStyle = INK; ctx.font = F('400', 33);
        const body = id === 'D' ? '归途之外。' : (end.text || '');
        for (const ln of _wrapLines(ctx, body, W - 280)) { ctx.fillText(ln, W / 2, y); y += 47; }
        y += 42;

        // 战绩
        const kills = Object.values(st.killCount || {}).reduce((a, b) => a + b, 0);
        const kinds = Object.keys(st.killCount || {}).length;
        const builds = Object.values(st.buildings || {}).reduce((a, b) => a + b, 0);
        ctx.strokeStyle = poster ? 'rgba(220,184,121,0.38)' : 'rgba(22,21,15,0.3)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(150, y - 50); ctx.lineTo(W - 150, y - 50); ctx.stroke();
        ctx.fillStyle = SUB; ctx.font = F('400', 30);
        ctx.fillText(`战斗 ${kills} 场 · 击杀 ${kinds} 种 · 建筑 ${builds} 级`, W / 2, y); y += 46;
        y += 20;

        // 日记摘录（最近几行）
        const dlines = (st.diary || []).slice(-4);
        if (dlines.length) {
          ctx.fillStyle = ACC; ctx.font = F('500', 26);
          ctx.fillText('· 日 记 ·', W / 2, y); y += 44;
          ctx.fillStyle = SUB; ctx.font = F('400', 26);
          for (const d of dlines) {
            for (const ln of _wrapLines(ctx, `第${d.day}天　${d.line}`, W - 300)) { ctx.fillText(ln, W / 2, y); y += 38; }
          }
          y += 18;
        }

        // 魂点
        const ms2 = Game.metaLast();
        if (ms2 && ms2.gain) {
          ctx.fillStyle = INK; ctx.font = F('500', 30);
          ctx.fillText(`这一生化作 ${ms2.gain} 魂点，汇入《历代遗章》`, W / 2, y); y += 52;
        }

        // 朱印：收尾，同时把内容压在安全区内（底纹下方还有枯枝/水纹装饰，别压上去）
        {
          const s = 100;
          const sy = Math.min(SAFE_BOT - s - 86, y + 50);   // 下界保证朱印落在页脚之上
          const x0 = W / 2 - s / 2, r = 10;
          ctx.save();
          ctx.fillStyle = '#a8382a';
          ctx.beginPath();
          ctx.moveTo(x0 + r, sy); ctx.lineTo(x0 + s - r, sy); ctx.quadraticCurveTo(x0 + s, sy, x0 + s, sy + r);
          ctx.lineTo(x0 + s, sy + s - r); ctx.quadraticCurveTo(x0 + s, sy + s, x0 + s - r, sy + s);
          ctx.lineTo(x0 + r, sy + s); ctx.quadraticCurveTo(x0, sy + s, x0, sy + s - r);
          ctx.lineTo(x0, sy + r); ctx.quadraticCurveTo(x0, sy, x0 + r, sy);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = PAPER; ctx.font = F('bold', 35);
          ctx.textBaseline = 'middle';
          ctx.fillText('孤屿', W / 2, sy + s / 2 - 18);
          ctx.fillText('遗章', W / 2, sy + s / 2 + 18);
          ctx.restore();
          ctx.textBaseline = 'alphabetic';
        }

        // 联系方式与版本信息放在右下角，离开结局正文的阅读动线。
        const ver = (typeof window !== 'undefined' && window.BUILD_VER) || '';
        ctx.save();
        ctx.textAlign = 'right';
        ctx.fillStyle = poster ? 'rgba(240,232,217,0.88)' : 'rgba(90,86,74,0.85)';
        ctx.shadowColor = poster ? 'rgba(0,0,0,0.95)' : 'transparent';
        ctx.shadowBlur = poster ? 6 : 0;
        ctx.font = F('400', 21);
        ctx.fillText('QQ 群 1014679931', W - 78, H - 136);
        if (ver) { ctx.font = F('400', 18); ctx.fillText(ver, W - 78, H - 108); }
        ctx.restore();
        // 给回归探针留个读数：正文最低点 vs 安全区下界
        try { window.__shareContentBottom = y; window.__shareSafeBottom = SAFE_BOT; } catch (e) {}
      };

      const finish = () => {
        try {
          if (cv.toBlob) { cv.toBlob(b => b ? resolve(URL.createObjectURL(b)) : resolve(cv.toDataURL('image/png')), 'image/png'); return; }
          resolve(cv.toDataURL('image/png'));
        } catch (e) { resolve(null); }
      };
      const plain = () => { try { paint(null); } catch (e) {} finish(); };

      const img = new Image();
      img.onload = () => {
        try { paint(img); finish(); }
        catch (e) { plain(); }   // 画不上底纹（多半是 canvas 被污染）→ 退回纯代码版
      };
      img.onerror = plain;
      // 底纹是版画海报框（不含任何文字），文字全部由这里叠上去
      img.src = `assets/img/share/poster.png?v=${window.BUILD_VER || 'v1.09'}`;
    });
  }

function shareModal() {
    if (!shareImgUrl) {
      return `<div class="modal-title">通关分享图</div><div class="hint">图片还没生成好，关掉重试一次。</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
    }
    const st = S() || {};
    const nm = (ENDINGS[st.ending] || {}).name || '通关';
    return `<div class="modal-title">通关分享图</div>
      <div class="overlay-text">可下载图片发到论坛或评论区。手机上可用系统分享菜单保存；若浏览器不支持，长按图片选「存储图像」。</div>
      <img class="share-img" src="${shareImgUrl}" alt="通关分享图">
      <div class="modal-actions">
        <button id="share-native" type="button">分享到系统 / 保存到相册</button>
        <a class="mini-btn share-dl" download="孤屿遗章_结局_${esc(nm)}.png" href="${shareImgUrl}">⬇ 保存图片</a>
        <button id="modal-close">关 闭</button>
      </div>`;
  }

function showEnding(id, reason, opts) {
    const revive = Game.reviveInfo();
    const noRevive = !revive.ok;
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
      <div class="ending-sub">一生战绩：战斗 ${kills} 场 · 击杀 ${Object.keys(st.killCount || {}).length} 种 · 建筑 ${builds} 级 · 声望 ${st.fame || 0}/5</div>
      <div class="ending-diary">${diary}</div>
      ${id === 'D' && noRevive ? `<div class="ending-sub">无法回溯：${esc(revive.reason || '没有日出记录')}</div>` : ''}
      <div class="ending-actions">
        ${id === 'D' ? (
          (noRevive ? `<button disabled>回到今天日出（不可用）</button>`
            : (st.difficulty !== 'legend' ? (metaSoul >= 50 ? `<button id="end-revive">回到今天日出（-50 魂点）</button>` : `<button id="end-revive" data-lack="1">回到今天日出（需 50 魂点）</button>`) : '')) +
          `<button id="end-retry">重新开始</button>`
        ) : `<button id="end-stay">留在岛上（自由模式）</button>`}
        <button id="end-share">📤 分享通关图</button>
        <button id="end-title">回到标题</button>
      </div>
    </div>`;
    es.classList.add('open'); document.body.classList.add('no-scroll');
    const linesEl = document.getElementById('ending-lines');
    if (linesEl) { const ls = (end.lines || []); ls.forEach((ln, i) => setTimeout(() => { const d = document.createElement('div'); d.className = 'ending-line'; d.textContent = ln; linesEl.appendChild(d); d.classList.add('in'); }, 900 + i * 1500)); }
    const hide = () => { es.classList.remove('open'); es.innerHTML = ''; document.body.classList.remove('no-scroll'); };
    $('#end-stay') && ($('#end-stay').onclick = () => { hide(); Game.continueRun(); addLog('你选择了留下来。海还在那里。', 'sys'); });
    $('#end-revive') && ($('#end-revive').onclick = (e) => {
      const result = Game.reviveToday();
      if (!result.ok) { centerToast(result.reason); return; }
      hide();
    });
    $('#end-title') && ($('#end-title').onclick = () => { hide(); Game.continueRun(); Game.save(); location.reload(); });
    $('#end-retry') && ($('#end-retry').onclick = () => {
      if (!Game.identityUnlocked(deps.lastIdentity)) { hide();showIdentity();centerToast('重新开始前，请先解锁角色或选择其他角色。');return; }
      hide();const r=Game.newGame(deps.lastIdentity,deps.lastDifficulty);if(r && !r.ok){centerToast(r.reason);showIdentity();}
    });
    // 分享通关图：现画一张 1080×1620 的竖版图，再弹出来让玩家保存/长按
    $('#end-share') && ($('#end-share').onclick = async () => {
      const btn = $('#end-share');
      if (btn) { btn.disabled = true; btn.textContent = '正在生成…'; }
      try { centerToast('正在生成分享图…'); } catch (e) {}
      try { shareImgUrl = await buildShareCard(id); } catch (e) { shareImgUrl = null; }
      if (btn) { btn.disabled = false; btn.textContent = '📤 分享通关图'; }
      showModal('share');
      const nativeBtn = $('#share-native');
      if (nativeBtn) {
        if (typeof navigator.share !== 'function') nativeBtn.style.display = 'none';
        else nativeBtn.onclick = async () => {
          try {
            const blob = await (await fetch(shareImgUrl)).blob();
            const file = new File([blob], `孤屿遗章_结局_${(ENDINGS[id] || {}).name || '通关'}.png`, { type:'image/png' });
            if (navigator.canShare && !navigator.canShare({ files:[file] })) { centerToast('请点保存图片，或长按图片存储到相册。'); return; }
            await navigator.share({ files:[file], title:'孤屿遗章 · 通关分享图' });
          } catch (e) {
            if (e && e.name !== 'AbortError') centerToast('系统分享不可用，请点保存图片或长按存储。');
          }
        };
      }
    });
  }
    return Object.freeze({_wrapLines,buildShareCard,shareModal,showEnding});
  }
  return Object.freeze({create});
})();
