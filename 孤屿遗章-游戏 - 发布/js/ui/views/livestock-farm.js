/* livestock-farm：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const FarmView = (() => {
  function create(deps) {
    const $=(...args)=>deps.$(...args);
    const S=(...args)=>deps.S(...args);
    const esc=(...args)=>deps.esc(...args);
    const addLog=(...args)=>deps.addLog(...args);
    const matsOk=(...args)=>deps.matsOk(...args);
    const missingReason=(...args)=>deps.missingReason(...args);
    const matsStr=(...args)=>deps.matsStr(...args);
    const showModal=(...args)=>deps.showModal(...args);
    const closeModal=(...args)=>deps.closeModal(...args);
function livestockModal(cfg) {
    const kind = (cfg && cfg.kind) || 'pen';
    const i = Game.liveInfo(kind);
    const name = kind === 'pen' ? '羊圈' : '鸡舍';
    let html = `<div class="modal-title">牧场 · ${name} <span style="font-size:11px">${i.count}/${i.cap} 只</span></div><div class="help-list">`;
    html += `<div class="help-item"><b>自动喂食</b><span>每天清晨自动消耗 ${i.feedName}（每只 1 份），并结算羊毛 / 鸡蛋</span><button class="mini-btn" data-livefeed="1">${i.autoFeed ? '已开启 · 关掉' : '已关闭 · 打开'}</button></div>`;
    html += `<div class="help-item"><b>饲料</b><span>${i.feedName} 总量 ×${i.feedHave}（背包${i.feedBag}＋岛仓${i.feedStore}） · 每日需要${i.feedNeed} · 缺口${Math.max(0,i.feedNeed-i.feedHave)}${i.autoFeed ? '' : '（自动喂食关闭中）'}</span></div>`;
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
    html += '</div>';
    html += `<div class="overlay-text">${kind === 'pen'
      ? '羊每天吃 1 份干草、产 1 份羊毛；40~60 天后自然寿终，留下 3 份兽肉。干草可以在手工里用茅草晒（5 茅草=2 干草），盐镇杂货商也有卖。<br>想添羊：带上「陷阱」去草地布下，次日再到草地，50% 概率捕到羊羔——选「放回羊圈」就能留下它。'
      : '小鸡连喂 5 天小麦长成母鸡；母鸡每天吃 1 份小麦、下一颗蛋（鸡蛋能存一周），20~30 天后寿终，留下 1 份兽肉。小麦靠耕地种，小鸡在外岛（盐镇的杂货商）买。'}</div>`;
    html += '<div class="modal-actions"><button id="modal-back">返 回</button><button id="modal-close">关 闭</button></div>';
    return html;
  }

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
    // ---------- 农田畜牧位（作者 2026-09-25：鸡舍/羊圈搬到农田）----------
    // 农田每升一级 +1 个畜牧位；鸡舍、羊圈只能用这里的位子建，且**不占住房家具位**。
    {
      const cap = Game.farmLiveSlots(), used = Game.farmLiveUsed();
      const liveIds = Game.FARM_LIVESTOCK_IDS;
      html += `<div class="modal-title" style="margin-top:12px">农田畜牧位（${used}/${cap}）</div>`;
      html += `<div class="hint">鸡舍 / 羊圈建在这里，<b>不占住房家具位</b>。农田每升一级 +1 个畜牧位（水田 3 个）。</div>`;
      html += '<div class="furn-grid">';
      for (const id of liveIds) {
        const f = FURNITURE.find(x => x.id === id);
        if (!f) continue;
        const built = !!st.furniture[id];
        if (built) {
          const i = Game.liveInfo(id);
          html += `<div class="furn built">✔ <span class="furn-name">${f.name}（${i.count}/${i.cap}）</span>`
            + `<button class="mini-btn" data-live="${id}">管理</button>`
            + `<button class="mini-btn demolish" data-demolish="${id}">拆除</button></div>`;
          continue;
        }
        const free = used < cap;
        const okF = matsOk(f.mats) && free;
        const reason = !free ? `农田畜牧位满了（${used}/${cap}）——升级农田（营地·农田）会多一个位子。`
                             : (matsOk(f.mats) ? '' : missingReason(f.mats));
        html += `<div class="furn"><span class="furn-name">${f.name}<span class="slot-tag free" title="不占住房家具位，占 1 个农田畜牧位">农田 1 格</span></span><span class="furn-mats">${matsStr(f.mats)}</span>
          <button class="mini-btn ${okF ? '' : 'lockedb'}" data-fid="${f.id}" ${reason ? `data-reason="${esc(reason)}"` : ''}>建造(${(f.time/60).toFixed(1)}h)</button></div>`;
      }
      html += '</div>';
    }
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
    return Object.freeze({livestockModal,farmModal,bindFarm});
  }
  return Object.freeze({create});
})();
