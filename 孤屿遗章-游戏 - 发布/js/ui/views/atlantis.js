/* atlantis：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const AtlantisView = (() => {
  function create(deps) {
    const S=(...args)=>deps.S(...args);
    const esc=(...args)=>deps.esc(...args);
    const matsOk=(...args)=>deps.matsOk(...args);
    const missingReason=(...args)=>deps.missingReason(...args);
    const matsStr=(...args)=>deps.matsStr(...args);
    const walletBar=(...args)=>deps.walletBar(...args);
function repairModal() {
    const st = S();
    const w = st.equipment.weapon;
    const w2 = st.equipment.weapon2;
    const hasGun = (w && ITEMS[w] && ITEMS[w].id === 'pistol') || (w2 && ITEMS[w2] && ITEMS[w2].id === 'pistol');   // 主手副手都算（副手也能开火）
    let html = '<div class="modal-title">修补台</div><div class="overlay-text">礁石栖息地的修补台：修补潜水装备，也能校准源能手枪。</div><div class="help-list">';
    for (const id of ['diveSuit','diveSuit2','diveMask']) {
      const mats=Game.repairDiveCost(id), owned=Game.invCount(id)>0;
      const cost=Object.entries(mats).map(([k,v])=>`${ITEMS[k].name}×${v}`).join(' + ');
      const can=owned && Object.entries(mats).every(([k,v])=>Game.materialCount(k)>=v);
      html += `<div class="help-item"><b>修补${ITEMS[id].name}</b><span>${owned ? `当前最低耐久 ${Game.durOf(id)}/${Game.durMaxOf(id)} · ` : '背包里没有 · '}耗 ${cost}（每次只修一件）</span><button class="mini-btn ${can ? '' : 'lockedb'}" data-rfix="dive:${id}">修 补</button></div>`;
    }
    html += `<div class="help-item"><b>校准源能手枪</b><span>${hasGun ? (st.pistolCalibrated ? '已校准 · 命中 70% · 可继续修耐久（耗 源矿×2）' : '未校准 · 命中 60% → 校准后 70%（耗 源矿×2）') : '需先把源能手枪装备到主手或副手'}</span><button class="mini-btn" data-rfix="pistol">校 准</button></div>`;
    const bp = Game.invCount('brokenPistol');
    html += `<div class="help-item"><b>修复破损的源能手枪${bp ? `（有${bp}）` : ''}</b><span>耗 源能晶石×1 + 源质锭×1</span><button class="mini-btn" data-rfix="broken">修 复</button></div>`;
    html += '</div></div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }

function atlTradeModal() {
    let html = `<div class="modal-title">遗失的交易机</div>${walletBar()}`;
    html += '<div class="modal-title" style="margin-top:8px">卖出（换贝壳币）</div><div class="help-list">';
    let any = false;
    for (const e of deps.ATL_SHOP) { const q = Game.invCount(e.id); if (q > 0) { any = true; html += `<div class="help-item"><b>${ITEMS[e.id].name}×${q}</b><span>${Game.priceOf(e.base, true, e.id)} 贝壳币 / 个</span><button class="mini-btn" data-asell="${e.id}">卖 1</button></div>`; } }
    if (!any) html += '<div class="hint">你身上没有它认得的东西。</div>';
    html += '</div><div class="modal-title" style="margin-top:8px">购买（装备图纸 · 长按可批量）</div><div class="help-list">';
    for (const e of deps.ATL_BUY) {
      if (Game.hasItem(e.id)) { html += `<div class="help-item"><b>${ITEMS[e.id].name}</b><span>已录入机内，无需再买</span><button class="mini-btn" disabled>已 有</button></div>`; continue; }
      const cost = Game.priceOf(e.base, false, e.id);
      html += `<div class="help-item"><b>${ITEMS[e.id].name}</b><span>${cost} 贝壳币</span><button class="mini-btn" data-abuy="${e.id}">购 买</button></div>`;
    }
    // 神物：每天随机上架一件（深海售卖机）
    const rv = Game.atlVendorInfo();
    html += `</div><div class="modal-title" style="margin-top:8px">神物（每天 ${Math.round(Game.vendorRelicChance() * 100)}% 概率上架一件）</div><div class="help-list">`;
    if (!rv.id) html += rv.noStock
      ? '<div class="hint">机箱空空如也——今天没有上架神物，明天再来碰碰运气。</div>'
      : '<div class="hint">机箱空空如也——你已经把神物收全了。</div>';
    else html += `<div class="help-item"><b>${rv.glyph} ${rv.name}</b><span>${rv.desc}<br>${rv.price} 贝壳币 · 每天只上架一件，买走就售罄</span>${rv.sold
      ? '<button class="mini-btn" disabled>今日已售出</button>'
      : `<button class="mini-btn" data-arelic="1" ${Game.invCount('beibi') >= rv.price ? '' : 'disabled'}>购 买</button>`}</div>`;
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }

function fishmanModal() {
    let html = `<div class="modal-title">神秘人鱼</div><div class="overlay-text">她坐在沉船龙骨旁，银发垂落，薄纱遮住容颜。<br>“贝壳？海底用不上。拿金锭和海里的材料来。”</div><div class="help-list">`;
    const deals = Game.fishmanDeals();
    let any = false;
    for (const d of deals) {
      // ⚠️ 作者 2026-09-24："为什么人鱼我根本没交易却显示已经换过了"。
      //    traded = 真在这儿换过；owned = 从别处已经有了。两者都不给交换入口，但文案要分开 ——
      //    以前只看 d.traded（而它把 owned 也算进去了），所以永远显示"已经换过了"。
      if (d.traded || d.owned) {
        const why = d.traded ? '已经换过了' : '你已经有了（不是在这儿换的）';
        const tag = d.traded ? '已 换' : '已 有';
        html += `<div class="help-item"><b>${d.name}</b><span>${why}</span><button class="mini-btn lockedb" disabled>${tag}</button></div>`;
        continue;
      }
      any = true;
      const need = Object.keys(d.need).map(id => `${ITEMS[id].name}×${d.need[id]}（${Game.invCount(id)}）`).join(' + ');
      const can = Object.keys(d.need).every(id => Game.invCount(id) >= d.need[id]);
      html += `<div class="help-item"><b>${d.name}</b><span>${need}</span><button class="mini-btn ${can ? '' : 'lockedb'}" data-fishman="${d.id}">交 换</button></div>`;
    }
    if (!any) html += '<div class="hint">她轻轻摇头，示意这次没有新的交换。</div>';
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }

function atlantisCampModal() {
    const st = S();
    const camp = (st.atlantis && st.atlantis.camp && st.atlantis.camp.furniture) || {};
    let html = `<div class="modal-title">礁石栖息地 · 建造 <span style="font-size:11px">家具位 ${Game.atlantisFurnitureUsed()}/6</span></div><div class="furn-grid">`;
    for (const f of ATLANTIS_FURNITURE) {
      if(f.id==='seaStorage1'&&camp.seaStorage2)continue;
      if(f.upgradeFrom&&!camp[f.upgradeFrom]&&!camp[f.id])continue;
      const built = !!camp[f.id];
      if (built) { html += `<div class="furn built"><span class="furn-name">✔ ${f.name} · 已建成</span><span>${f.desc}</span>${f.capacity?'<button data-warehouse-open="1">存取物品</button>':''}</div>`; continue; }
      const ok = matsOk(f.mats);
      const reason = ok ? '' : missingReason(f.mats, '');
      html += `<div class="furn"><span class="furn-name">${f.name}</span><span class="furn-mats">${matsStr(f.mats)}</span><button class="mini-btn ${ok ? '' : 'lockedb'}" data-afid="${f.id}" ${reason ? `data-reason="${esc(reason)}"` : ''}>建造(${(f.time/60).toFixed(1)}h)</button></div>`;
    }
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
    return Object.freeze({repairModal,atlTradeModal,fishmanModal,atlantisCampModal});
  }
  return Object.freeze({create});
})();
