/* rest：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const RestView = (() => {
  function create(deps) {
    const S=(...args)=>deps.S(...args);
function sleepModal() {
    const st = S();
    const wu = st.day >= Game.raidDay();   // 守夜在第一次夜袭那天解锁（简单14/普通12/困难10/传奇7）
    const r = sleepRec();
    const nr = napRec();
    // 作者 2026-09-21：会掉血就明确提示 —— 只写个小小的"生命-14"，玩家根本不会注意
    const tips = [];
    if (r.hp < 0) tips.push(`⚠️ 现在睡会<b>掉 ${Math.abs(r.hp)} 点生命</b>：这个时段睡眠质量差（22 点后最好），而且饱食 / 水分 / 精神越低扣得越狠。生命会从 ${r.hpNow} 变成 ${r.hpAfter}。`);
    // 中毒/流血不会因为睡觉就停下（作者 2026-09-25）：进睡眠面板前先把这笔账摊开说清楚
    if(Game.healthValue()<40)tips.push('⚠️ 健康过低，未治疗期间可能感染或恶化。先处理伤势再睡。');
    if (r.debuffHp > 0) tips.push(`⚠️ 身上还带着${S().statuses.infection?'感染 ':''}${r.poisonTicks ? `中毒 ×${r.poisonTicks}` : ''}${r.poisonTicks && r.bleedTicks ? '、' : ''}${r.bleedTicks ? `流血 ×${r.bleedTicks}` : ''}——<b>睡觉不会让它停</b>，这一觉还会再掉 <b>${r.debuffHp} 点生命</b>，醒来剩 ${r.hpAfter}。先吃解毒剂 / 敷止血药再睡更稳。`);
    if (r.starveRisk) tips.push(`⚠️ 睡醒（约 ${r.endClock}）时饱食或水分会<b>直接见底</b>，醒来就开始掉血——先吃点东西、喝口水再睡。`);
    else if (r.lowOnWake) tips.push(`⚠️ 睡醒（约 ${r.endClock}）时饱食或水分会掉到 ${r.hungerAfter}／${r.thirstAfter}，已经在危险线以下了——睡前先补一口更稳。`);
    return `<div class="modal-title">睡眠方式</div>
      ${tips.length ? `<div class="sleep-warn">${tips.join('<br>')}</div>` : ''}
      <div class="modal-actions">
        <button data-sleep="nap">😴 小睡一会 · 2小时<br><small>体力+${nr.sta} · 生命${nr.hp > 0 ? '+' + nr.hp : '不变'} · 精神+${nr.sp}</small></button>
        <button data-sleep="normal" class="${r.hp < 0 ? 'danger-btn' : ''}">🌙 安稳睡觉 · ${r.hours}小时<br><small>体力+${r.sta} · 生命${r.hp >= 0 ? '+' : ''}${r.hp} · 精神+${r.sp}</small></button>
        ${wu ? `<button data-sleep="watch">🔥 守夜 · 防备夜袭</button>` : ''}
      </div>
      <div class="overlay-text" style="font-size:12.5px;margin-top:10px">醒来约 ${r.endClock} · 届时饱食 ${r.hungerAfter} · 水分 ${r.thirstAfter}</div>`;
  }

function napRec() {
    return Game.sleepForecast('nap') || { sta:0, hp:0, sp:1, hours:2, endClock:'--:--', hungerAfter:0, thirstAfter:0, hpNow:0, hpAfter:0, starveRisk:false };
  }

function sleepRec() {
    // 公式只有 game.js 的 sleepMath 一份，这里不再抄一遍（抄的那份和真实恢复会差一两点）
    const f = Game.sleepForecast('normal');
    return f || { sta:0, hp:0, sp:5, hours:8, endClock:'--:--', hungerAfter:0, thirstAfter:0, hpNow:0, hpAfter:0, starveRisk:false };
  }

function bedDesc() { const r = sleepRec(); return `睡 ${r.hours} 小时 · 体力+${r.sta} · 生命${r.hp >= 0 ? '+' : ''}${r.hp} · 精神+${r.sp}`; }
    return Object.freeze({sleepModal,napRec,sleepRec,bedDesc});
  }
  return Object.freeze({create});
})();
