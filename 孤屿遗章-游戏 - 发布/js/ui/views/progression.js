/* progression：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const ProgressionView = (() => {
  function create(deps) {
    const esc=(...args)=>deps.esc(...args);
    const inlineHelp=(...args)=>deps.inlineHelp(...args);
function renderHeirloom() {
    const meta = Game.metaState();
    let html = `<div class="modal-title">◈ 历代遗章 <span style="font-size:12px">魂点 ${meta.soul} · 已传世 ${meta.runs} 世</span>${inlineHelp('结束一局可获得魂点，升级传承后永久保留。传奇不享受传承；开局物资与心得在新局发放。')}</div>
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
    for (let i = 0; i < 4; i++) {
      const s = slots[i];
      if (i === 3 && !Game.extraSlotUnlocked()) {
        html += '<div class="help-item"><b>槽 4（未解锁）</b><span>支付 100 魂点，永久增加一个备份槽。</span><button class="mini-btn" data-buyslot="1">解锁存档位</button></div>';
        continue;
      }
      html += `<div class="help-item"><b>槽 ${i + 1}${s ? ` · 第 ${s.day} 天${s.settled ? '（已结算）' : ''}` : '（空）'}</b><span>${s ? '第 ' + s.day + ' 天 · 点击从此继续' : '空槽'}</span>
        <button class="mini-btn" data-bk="${i}">${s ? '覆盖备份' : '备份到此'}</button>${s ? `<button class="mini-btn" data-ld="${i}">从此继续</button>` : ''}${s ? `<button class="mini-btn danger-btn" data-delslot="${i}">删除备份</button>` : ''}</div>`;
    }
    const rs = Game.rescueInfo();
    html += `<div class="help-item"><b>🛟 救援 · 找回被覆盖的存档</b><span>可扫描本机存档，选择进度恢复。${rs ? `<br>已自动保留：<b>第 ${rs.day} 天</b>（${new Date(rs.at).toLocaleString('zh-CN', { hour12: false }).slice(0, 16)}）` : ''}</span>
      <div class="modal-actions"><button class="mini-btn" data-rescue="scan">扫描本机存档</button></div></div>`;
    html += `<div class="hint">换设备可生成8位取件码，10分钟有效，每账号每小时最多3次；电脑可保存备份文件。</div>
      <div class="modal-actions"><button data-codex="export">取件码 / 文件备份</button><button data-codex="import">导入存档</button><button id="modal-close">关 闭</button></div>`;
    return html;
  }

function comHelpModal() {
    return `<div class="modal-title">战斗说明</div><div class="help-list"><div class="help-item"><b>攻击</b><span>先点目标，再选行动；距离不够会先靠近。</span></div><div class="help-item"><b>防御</b><span>本次行动防御提升60%，可抵挡梦魇恐吓与晕眩。</span></div><div class="help-item"><b>速度</b><span>速度快的一方先出手，也能出手更多次。双持武器轮流攻击。</span></div><div class="help-item"><b>远程</b><span>弓和枪需要对应弹药，可在敌人靠近前攻击。</span></div><div class="help-item"><b>生存</b><span>留意技能预告、体力和耐久。格挡失败后才判闪避；药品有每场使用限制，危险时可以逃跑。</span></div></div>`;
  }

function skillBody() {
    const info = Game.skillTreeInfo();
    return `<div class="skill-grid">${['gather','craft','combat'].map(k => {
      const i = info[k]; const maxed = i.lv >= i.max;
      const pct = maxed ? 100 : Math.min(100, i.cost ? i.exp / i.cost * 100 : 100);
      return `<div class="skill-col" data-skill-kind="${k}">
        <div class="skill-name">${i.glyph} ${i.name}</div>
        <div class="skill-desc">主干 ${i.lv}/${i.max} · 已投 ${i.picks.length} 点</div>
        <div class="skill-lv">${i.expName} ${i.exp}${maxed ? ' · 已满级' : ` / 下一级 ${i.cost}`}</div>
        <div class="skill-bar"><i style="width:${pct}%"></i></div>
        <button class="mini-btn" data-skilltree="${k}">展开技能树 ▶</button>
      </div>`;
    }).join('')}</div>`;
  }

function skillModal() {
    return `<div class="modal-title">技能${inlineHelp('主干升级时选择成长方向；专项有门槛与互斥。遗忘最末端技能，返还一半经验。')}</div>${skillBody()}<div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
  }
    return Object.freeze({renderHeirloom,devpwModal,rescueModal,renderBackup,comHelpModal,skillBody,skillModal});
  }
  return Object.freeze({create});
})();
