/* reports：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const ReportView = (() => {
  function create(deps) {
    const S=(...args)=>deps.S(...args);
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

function winterModal() {
    const st = S();
    const fur = st.equipment.cloth && ITEMS[st.equipment.cloth] ? (ITEMS[st.equipment.cloth].warm || 0) : 0;
    return `<div class="modal-title">❄ 冬季来临 · 第 ${st.day} 天</div>
      <div class="help-list">
        <div class="help-item"><b>① 采集只剩六成</b><span>野外产量 ×0.6，<strong>下雪天再 ×0.6</strong>。趁晴天囤木柴草药；兽皮反而 +50%。</span></div>
        <div class="help-item"><b>② 采雪烧水</b><span>河畔取水点结冰，请改点<strong>【采雪】（每天3次）</strong>。采雪不受雨雪天气减产；带回营地篝火，用积雪×2 + 木材×1 →【烧雪水】= 淡水×1。</span></div>
        <div class="help-item"><b>③ 冷会持续掉血</b><span>保暖不足<strong>每小时 -5 生命</strong>，营地也一样。${fur >= 2 ? '你这件衣服够暖。' : '草房+火塘或木屋，凑够 2 点即可。'}</span></div>
        <div class="help-item"><b>④ 中毒 / 流血睡觉不会停</b><span>每睡 1 小时照样发作；带伤过夜前先解毒、止血。</span></div>
      </div>
      <div class="modal-actions"><button id="winter-go">去河畔采雪</button><button id="modal-close">知道了</button></div>`;
  }
    return Object.freeze({dailyReportModal,winterModal});
  }
  return Object.freeze({create});
})();
