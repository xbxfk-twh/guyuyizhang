/* skills：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const SkillView = (() => {
  function create(deps) {
    const inlineHelp=(...args)=>deps.inlineHelp(...args);
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
      ${n.lv>0?`<div class="st-desc st-current">当前：${n.desc[Math.min(n.lv-1,n.desc.length-1)]}</div>`:''}
      ${n.lv<n.max?`<div class="st-desc st-preview">${n.lv?'升级后：':'学习后：'}${n.desc[Math.min(n.lv,n.desc.length-1)]}</div>`:''}
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
    return `<div class="modal-title">${t.glyph} ${t.name}技能树 <span style="font-size:11px">主干 ${t.lv}/${t.max} · ${t.expName} <b>${t.exp}</b>${maxed ? ' · 已满级' : ` · 下一级 ${t.cost}`}</span>${inlineHelp('主干同一方向可重复选择，效果叠加；红虚线表示互斥。遗忘只能从最末端开始，返还一半经验。首个主干点需采集16、制造24、战斗12经验；后续采集树消耗为基准2倍、制造树3倍。采集、制造和战斗可积累对应经验。')}</div>
      <div class="st-tree">${rows}</div>
      <div class="modal-actions">${(() => {
        const ti = Game.trunkForgetInfo(kind);
        return ti.ok ? `<button class="mini-btn" data-trunkforget="${kind}">遗忘主干「${ti.optName}」第 ${ti.lv} 级 · 返还 ${ti.gain}</button>` : '';
      })()}<button id="st-back">返 回</button><button id="modal-close">关 闭</button></div>`;
  }
    return Object.freeze({stNodeCard,skillTreeModal});
  }
  return Object.freeze({create});
})();
