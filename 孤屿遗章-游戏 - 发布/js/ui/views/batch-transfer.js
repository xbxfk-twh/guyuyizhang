/* batch-transfer：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const BatchTransferView = (() => {
  function create(deps) {
    const shopBuyList=(...args)=>deps.shopBuyList(...args);
    const shopSellList=(...args)=>deps.shopSellList(...args);
function batchnModal(cfg) {
    if(cfg.kind==='cellar'){const deposit=cfg.dir==='in',max=deposit?Game.invCount(cfg.item):Game.cellarState().inv[cfg.item],label=deposit?'存入地窖':'取出地窖';return `<div class="modal-title">${label} · ${ITEMS[cfg.item].name}</div><div class="batch-row"><span>数量</span><input type="range" id="batchn-n" min="1" max="${max}" value="1"><span id="batchn-count">1</span></div><div class="batch-row"><button data-bset="1">1份</button><button data-bset="10">10份</button><button data-bset="half">一半</button><button data-bset="all">全部</button></div><p>最多还能${label}${Game.cellarTransferMax(cfg.item,deposit)}份。</p><div class="modal-actions"><button id="batchn-do">${label}</button></div>`;}
    if(cfg.kind==='warehouse'){const deposit=cfg.dir==='in',max=(deposit?Game.warehouseDepositCount(cfg.item):Game.warehouseState().inv[cfg.item])||1,label=deposit?'存入':'取出';return `<div class="modal-title">${label} · ${ITEMS[cfg.item].name}</div><div class="batch-row"><span>数量</span><input type="range" id="batchn-n" min="1" max="${max}" value="1"><span id="batchn-count">1</span></div><div class="batch-row"><button class="mini-btn" data-bset="1">1份</button><button class="mini-btn" data-bset="10">10份</button><button class="mini-btn" data-bset="half">一半</button><button class="mini-btn" data-bset="all">全部</button></div><p class="hint">最多还能${label}${Game.warehouseTransferMax(cfg.item,deposit)}份。拖动数量条后确认。</p><div class="modal-actions transfer-actions"><button id="modal-transfer-back" ${cfg.returnKind==='warehouse'?'data-warehouse-open':'data-item="'+cfg.item+'"'}>返回</button><button id="batchn-do">${label}</button></div>`;}
    const isBuy = cfg.kind === 'buy';
    // 兑换（作者 2026-09-25）：长按出售行弹的就是这套批量面板，兑换沿用同一套 ——
    // 数量条 + 快捷 + 确定，没有单独的「全部」按钮。**汇率固定**，不参与行情折扣。
    if (cfg.kind === 'exchange') {
      const coin = cfg.dir === 'coin';
      const max = coin ? Math.max(1, Game.invCount('coin')) : Math.max(1, Math.floor(Game.invCount('beibi') / Game.SHELL_PER_COIN));
      const rate = coin ? `1 金币 → ${Game.SHELL_FOR_COIN} 贝壳` : `${Game.SHELL_PER_COIN} 贝壳 → 1 金币`;
      const 得 = (n) => coin ? `${n * Game.SHELL_FOR_COIN} 贝壳` : `${n} 金币`;
      cfg._unit = 0;
      return `<div class="modal-title">兑换 · ${coin ? '金币换贝壳' : '贝壳换金币'} <span style="font-size:11px">拖动数量条</span></div>
        <div class="batch-row"><span>数量</span><input type="range" id="batchn-n" min="1" max="${max}" value="${max}"><span id="batchn-count" class="batch-count">${max}</span></div>
        <div class="batch-row"><span>快捷</span><button class="mini-btn" data-bset="1">1 份</button><button class="mini-btn" data-bset="half">一半</button><button class="mini-btn" data-bset="all">全部（${max}）</button></div>
        <div class="batch-hint">固定汇率 ${rate} · 预计换得 <b id="batchn-total">${得(max)}</b></div>
        <div class="modal-actions"><button id="batchn-do">确 定</button><button id="modal-close">取 消</button></div>`;
    }
    const max = isBuy ? Math.max(1,cfg.max||1) : cfg.kind==='discard'?Math.max(1,cfg.fromWarehouse==='cellar'?(Game.cellarState().inv[cfg.item]||0):cfg.fromWarehouse?(Game.warehouseState().inv[cfg.item]||0):Game.warehouseDepositCount(cfg.item)):Math.max(1,Game.merchantSellCount(cfg.item,shopSellList(cfg.list)));
    const isBp = isBuy && ITEMS[cfg.item].cat === 'bp';
    let priceLine = '';
    if (cfg.kind === 'sell') {
      const ls = shopSellList(cfg.list);
      const en = ls.find(x => x.id === cfg.item);
      if (en) priceLine = `<div class="batch-hint">当前收购价 ${Game.priceOf(en.base, true, cfg.item)} 贝壳 / 个</div>`;
    } else if(isBuy) {
      const en = shopBuyList(cfg.shop).find(x => x.id === cfg.item);
      const unit = en ? Game.priceOf(en.base, false, cfg.item) : 0;
      const curName = (en && en.currency === 'coin') ? '金币' : '贝壳';
      cfg._unit = unit;
      priceLine = `<div class="batch-hint">单价 ${unit} ${curName} · 合计 <b id="batchn-total">${unit * max}</b> ${curName}${isBp ? '（图纸只需一份）' : ''}</div>`;
    }
    return `<div class="modal-title">${isBuy ? '批量购买' : (cfg.kind === 'discard' ? '批量丢弃' : '连续售卖')} · ${ITEMS[cfg.item].name} <span style="font-size:11px">拖动数量条</span></div>
      <div class="batch-row"><span>数量</span><input type="range" id="batchn-n" min="1" max="${max}" value="${max}"><span id="batchn-count" class="batch-count">${max}</span></div>
      <div class="batch-row"><span>快捷</span><button class="mini-btn" data-bset="1">1 个</button><button class="mini-btn" data-bset="half">一半</button><button class="mini-btn" data-bset="all">全部（${max}）</button></div>
      <div class="batch-hint">${isBuy ? '最多可买 ' + max + ' 个' : '当前持有 ' + max + ' 个'}</div>
      ${priceLine}
      <div class="modal-actions"><button id="batchn-do"${cfg.kind==='discard'?' class="discard-danger"':''}>${cfg.kind==='discard'?'丢弃':'确 定'}</button><button id="modal-close">取 消</button></div>`;
  }

function batchModal(cfg) {
    const r = Game.craftRecipe(RECIPES.find(x => x.id === cfg.recipe));
    const max = Math.max(1, Math.min(Game.craftMax(r), 99));
    return `<div class="modal-title">批量制作 · ${r.name}</div><div class="batch-hint">拖动选择数量</div>
      <div class="batch-row"><span>数量</span><input type="range" id="batch-n" min="1" max="${max}" value="${max}"><span id="batch-count" class="batch-count">${max}</span></div>
      <div class="batch-hint">当前材料最多可做 ${max} 批 · 预计 <b id="batch-time">${Game.craftMinutes(r) * max}</b> 分钟（超过5小时先确认）</div>
      <div class="batch-hint" id="batch-output">产出：${Object.entries(r.out).map(([k,v]) => `${ITEMS[k].name}×${v * max}`).join('、')} · 材料：${Object.entries(Game.craftIn(r,max)).map(([k,v]) => `${ITEMS[k].name}×${v}`).join('、')}</div>
      <div class="batch-quick"><button data-cset="1">1 批</button><button data-cset="half">一半</button><button data-cset="max">全部</button></div>
      <div class="modal-actions"><button id="batch-do">制 作</button><button id="modal-close">取 消</button></div>`;
  }
    return Object.freeze({batchnModal,batchModal});
  }
  return Object.freeze({create});
})();
