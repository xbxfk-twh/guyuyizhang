/* trading：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const TradingView = (() => {
  function create(deps) {
    const S=(...args)=>deps.S(...args);
function shopBuyList(key) {
    const k = String(key || '').split(':')[0];
    if (k === 'BLACK') return BLACKMARKET.sell;
    if (k === 'ATL') return deps.ATL_BUY;
    if (k === 'LAOCHAO') return LAOCHAO.sell;
    if (TOWN[k] && TOWN[k].sell) return TOWN[k].sell;
    return TOWN.grocer.sell;
  }

function shopSellList(key) {
    const k = String(key || 'LAOCHAO').split(':')[0];
    // 盐镇：把所有摊位的收购单并起来（原来也是硬编码三家，同样会把新店漏掉）
    if (k === 'TOWN') return Object.values(TOWN).reduce((a, sh) => a.concat((sh && sh.buy) || []), []);
    if (k === 'BLACK') return BLACKMARKET.buy;
    if (k === 'ATL') return deps.ATL_SHOP;
    return LAOCHAO.buy;
  }

function walletBar() {
    const s = S(); if (!s) return '';
    return `<div class="wallet-bar">贝壳币 <b>${Game.invCount('beibi')}</b> · 金币 <b>${Game.invCount('coin')}</b></div>`;
  }

function laochaoModal() {
    const st = S();
    let html = `<div class="modal-title">老潮的货摊 <span style="font-size:12px">（第${st.day}天，22 点离港）</span></div>
     ${walletBar()}
     <div class="trader-row"><img class="trader-img" src="assets/img/laochao.png" onerror="this.style.display='none'" alt="老潮">
      <div class="trader-talk">"带什么来啦？对岸最近什么都缺，好货不愁卖。"</div></div>
      <div class="tabs">
        <button class="tab ${deps.laoTab === 'buy' ? 'active' : ''}" data-ttab="buy">买他的货</button>
        <button class="tab ${deps.laoTab === 'sell' ? 'active' : ''}" data-ttab="sell">卖给他</button>
        <button class="tab ${deps.laoTab === 'comm' ? 'active' : ''}" data-ttab="comm">委托</button>
      </div><div id="trade-body">${laochaoTab(deps.laoTab || 'buy')}</div>
      <div class="trader-row"></div>
      <div class="modal-actions"><button id="modal-close">离 开</button></div>`;
    return html;
  }

function laochaoTab(tab) {
    const st = S();
    const day = st.day;
    if (tab === 'buy') {
      let html = '';
      if (!st.flags.firstTrade) {
        const have = Game.materialCount('smokedFish');
        html += `<div class="first-trade"><div><b>首单交换</b><small>熏鱼 ${have}/10</small></div>
          <span>盐×1 · 铁锭×4 · 萝卜种子×1</span>
          <button class="mini-btn" data-firsttrade="1" ${have >= 10 ? '' : 'disabled'}>交 换</button></div>`;
      }
      html += '<div class="trade-grid"><div class="trade-col"><b>货物</b></div><div class="trade-col"><b>价（贝壳）</b></div><div class="trade-col"><b>买</b></div></div>';

      for (const e of LAOCHAO.sell) {
        if (e.from > day) continue;
        const p = Game.priceOf(e.base, false, e.id);
        const cur = e.currency || 'beibi';
        const curName = cur === 'coin' ? '金币' : '贝壳';
        const afford = st.inv[cur] >= p;
        html += `<div class="trade-grid">
          <div class="trade-col">${ITEMS[e.id].glyph} ${ITEMS[e.id].name}${e.kind === 'bp' && Game.invCount(e.id) > 0 ? '（已有）' : ''}</div>
          <div class="trade-col">${p} ${curName}</div>
          <div class="trade-col"><button class="mini-btn" data-buy="${e.id}" data-currency="${cur}" ${afford && !(e.kind === 'bp' && Game.invCount(e.id) > 0) ? '' : 'disabled'}>购买</button></div>
        </div>`;
      }
      return html;
    }
    if (tab === 'sell') {
      let html = '<div class="trade-grid"><div class="trade-col"><b>他收</b></div><div class="trade-col"><b>收购价</b></div><div class="trade-col"><b>卖</b></div></div>';

      for (const e of LAOCHAO.buy) {
        const p = Game.priceOf(e.base, true, e.id);
        const have = Game.merchantSellCount(e.id,LAOCHAO.buy);
        html += `<div class="trade-grid">
          <div class="trade-col">${ITEMS[e.id].glyph} ${ITEMS[e.id].name}（有 ${have}）</div>
          <div class="trade-col">${p} 贝壳</div>
          <div class="trade-col"><button class="mini-btn" data-sell="${e.id}" ${have > 0 ? '' : 'disabled'}>卖出</button></div>
        </div>`;
      }
      // 兑换（贝壳 ⇄ 金币）：**和上面的出售行同一套样式/同一套操作**——点一下换 1 份、长按批量。
      //   作者 2026-09-25："贝壳换金币和金币换贝壳沿用前面的出售（除了他们的单价不会变），
      //   没有其他的说明，和前面一致的 ui，也没有单独批量，而是长按批量。"
      //   所以这里不再有说明文字、也没有单独的「全部」按钮（那套确认弹窗一起去掉了）。
      //   单价固定：汇率不吃行情七折，也不会随季节/声望变。
      const shellN = st.inv.beibi || 0, coinN = st.inv.coin || 0;
      html += `<div class="trade-grid">
        <div class="trade-col">${ITEMS.beibi.glyph} 贝壳换金币（有 ${shellN}）</div>
        <div class="trade-col">${Game.SHELL_PER_COIN} 贝壳</div>
        <div class="trade-col"><button class="mini-btn" data-exshell="1" ${shellN >= Game.SHELL_PER_COIN ? '' : 'disabled'}>卖出</button></div>
      </div>`;
      html += `<div class="trade-grid">
        <div class="trade-col">${ITEMS.coin.glyph} 金币换贝壳（有 ${coinN}）</div>
        <div class="trade-col">${Game.SHELL_FOR_COIN} 贝壳</div>
        <div class="trade-col"><button class="mini-btn" data-exgold="1" ${coinN >= 1 ? '' : 'disabled'}>卖出</button></div>
      </div>`;
      return html;
    }
    if (tab === 'comm') {
      let html = '';
      for (const c of Game.commissions()) {
        if (c.from > day) continue;
        const done = Game.commissionDone(c);
        const accepted = Game.commissionAccepted(c);
        const inWin = accepted !== undefined && st.day >= accepted && st.day <= accepted + 2;
        const needStr = c.type === 'kill' ? `击败 ${ENEMIES[c.target].name}` : Object.entries(c.need).map(([k,v]) => `${ITEMS[k].name} ${Game.materialCount(k)}/${v}`).join('、');
        const rewardStr = Object.entries(c.reward).map(([k,v]) => k === 'fame' ? `声望+${v}` : `${ITEMS[k].name}×${v}`).join('、');
        html += `<div class="mission ${done ? 'done' : ''}">
          <div class="mission-name">${c.name} ${done ? '✔' : ''}</div>
          <div class="mission-text">${c.text}</div>
          <div class="mission-need">需求：${needStr}</div>
          <div class="mission-reward">报酬：${rewardStr}</div>
          ${done ? '' : c.type === 'kill' && accepted === undefined ? `<button class="mini-btn" data-acceptc="${c.id}">接取（持续3天）</button>` : c.type === 'kill' && !inWin ? `<button class="mini-btn" data-acceptc="${c.id}">重新接取（持续3天）</button>` : `<button class="mini-btn" data-comm="${c.id}">交任务</button>`}
        </div>`;
      }
      return html || '<div class="hint">暂无委托。</div>';
    }
    return '';
  }

function townModal() {
    const st = S();
    const fame = st.fame;
    // ⚠️ 摊位标签必须从 TOWN **派生**（作者 2026-09-25 问"对岸美食家确定实装了吗"）：
    //    这里原来硬编码三家 grocer/smith/informant —— 于是 2026-09-24 加进 data 的「美食家」
    //    在界面上**根本没有入口**（数据、图纸、配方全都在，玩家就是打不开这个摊子）。
    //    TOWN_ORDER 现在只决定**排队顺序**（和战斗道具那个 pri 列表同一个用法）：
    //    没写进这里的新摊位照样会出现，只是排在后面 —— 少写一个名字不会再有"数据在、玩家摸不到"。
    const TOWN_ORDER = ['grocer', 'smith', 'informant', 'gourmet'];
    const shopIds = Object.keys(TOWN).sort((a, b) =>
      ((TOWN_ORDER.indexOf(a) + 1) || 99) - ((TOWN_ORDER.indexOf(b) + 1) || 99));
    const shops = shopIds.map(id => [id, TOWN[id].name, TOWN[id].needFame || 0]);
    // 声望掉下去（读档/换档）时别停在锁着的摊位上
    if ((TOWN[deps.townShopNow] || {}).needFame > fame) deps.townShopNow = 'grocer';
    const tabHtml = shops.map(([id, name, need]) =>
      `<button class="tab ${id === deps.townShopNow ? 'active' : ''} ${fame >= need ? '' : 'locked'}" data-shop="${id}">${name}${fame >= need ? '' : ' 🔒'}</button>`).join('');
    let html = `<div class="modal-title">盐镇集市 <span style="font-size:12px">（声望 ${Number(fame || 0).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}/5）</span></div>
      ${walletBar()}
      <div class="tabs">${tabHtml}</div><div id="trade-body">${townShop(deps.townShopNow)}</div>
      <div class="modal-actions"><button id="modal-close">离 开</button></div>`;
    return html;
  }

function townShop(shop) {
    const st = S();
    const sh = TOWN[shop];
    if (!sh) return '';
    if (sh.needFame > st.fame) return `<div class="hint">需要盐镇声望 ${sh.needFame}。</div>`;
    let html = `<div class="trade-grid"><div class="trade-col"><b>货</b></div><div class="trade-col"><b>价</b></div><div class="trade-col"><b>买</b></div></div>`;

    for (const e of sh.sell) {
      if (e.kind === 'bp' && Game.invCount(e.id) > 0) continue;
      const p = Game.priceOf(e.base, false, e.id);
      const cur = e.currency || 'beibi';
      const curName = cur === 'coin' ? '金币' : '贝壳';
      html += `<div class="trade-grid"><div class="trade-col">${ITEMS[e.id].glyph} ${ITEMS[e.id].name}</div><div class="trade-col">${p} ${curName}</div>
        <div class="trade-col"><button class="mini-btn" data-tbuy="${shop}:${e.id}" ${(st.inv[cur] || 0) >= p ? '' : 'disabled'}>买</button></div></div>`;
    }
    html += `<div class="trade-grid" style="margin-top:10px"><div class="trade-col"><b>他收</b></div><div class="trade-col"><b>价</b></div><div class="trade-col"><b>卖</b></div></div>`;
    for (const e of sh.buy) {
      const p = Game.priceOf(e.base, true, e.id);
      html += `<div class="trade-grid"><div class="trade-col">${ITEMS[e.id].glyph} ${ITEMS[e.id].name}（有 ${st.inv[e.id] || 0}）</div><div class="trade-col">${p} 贝壳</div>
        <div class="trade-col"><button class="mini-btn" data-tsell="${e.id}" ${(st.inv[e.id] || 0) > 0 ? '' : 'disabled'}>卖</button></div></div>`;
    }
    return html;
  }

function blackModal() {
    const st = S();
    let html = `<div class="modal-title">黑市 · 独眼</div>
    ${walletBar()}

      <div class="trade-grid"><div class="trade-col"><b>货</b></div><div class="trade-col"><b>价</b></div><div class="trade-col"><b>买</b></div></div>`;

    for (const e of BLACKMARKET.sell) {
      if (e.kind === 'bp' && Game.invCount(e.id) > 0) continue;
      const p = Game.priceOf(e.base, false, e.id);
      html += `<div class="trade-grid"><div class="trade-col">${ITEMS[e.id].glyph} ${ITEMS[e.id].name}</div><div class="trade-col">${p} 贝壳</div>
        <div class="trade-col"><button class="mini-btn" data-bbuy="${e.id}" ${(st.inv.beibi || 0) >= p ? '' : 'disabled'}>买</button></div></div>`;
    }
    html += `<div class="trade-grid" style="margin-top:10px"><div class="trade-col"><b>他收</b></div><div class="trade-col"><b>价</b></div><div class="trade-col"><b>卖</b></div></div>`;
    for (const e of BLACKMARKET.buy) {
      const p = Game.priceOf(e.base, true, e.id);
      html += `<div class="trade-grid"><div class="trade-col">${ITEMS[e.id].glyph} ${ITEMS[e.id].name}（有 ${st.inv[e.id] || 0}）</div><div class="trade-col">${p} 贝壳</div>
        <div class="trade-col"><button class="mini-btn" data-bsell="${e.id}" ${(st.inv[e.id] || 0) > 0 ? '' : 'disabled'}>卖</button></div></div>`;
    }
    html += `<div class="modal-actions"><button id="modal-close">离 开</button></div>`;
    return html;
  }

function missionModal() {
    const st = S();
    let html = `<div class="modal-title">告示板（老潮也代收委托）</div>`;
    for (const c of Game.commissions()) {
      if (c.from > st.day) continue;
      const done = Game.commissionDone(c);
      const needStr = c.type === 'kill' ? `击败 ${ENEMIES[c.target].name}` : Object.entries(c.need).map(([k,v]) => `${ITEMS[k].name} ${Game.materialCount(k)}/${v}`).join('、');
      const rewardStr = Object.entries(c.reward).map(([k,v]) => k === 'fame' ? `声望+${v}` : `${ITEMS[k].name}×${v}`).join('、');
      html += `<div class="mission ${done ? 'done' : ''}"><div class="mission-name">${c.name} ${done ? '✔' : ''}</div><div class="mission-text">${c.text}</div>
        <div class="mission-need">需求：${needStr}</div><div class="mission-reward">报酬：${rewardStr}</div>
        ${done ? '' : `<button class="mini-btn" data-comm="${c.id}">交任务</button>`}</div>`;
    }
    html += `<div class="modal-actions"><button id="modal-close">离 开</button></div>`;
    return html;
  }

function infoModal() {
    const st = S();
    if (st.fame < 2) return `<div class="modal-title">酒馆</div>
      <div class="hint">情报贩子只跟有门路的人说话（需要盐镇声望 2，你现在是 ${st.fame}/5）。</div>
      <div class="hint">声望来自告示板的委托：兽皮订单（第 8 天）、珍珠委托（第 14 天）、剿灭海盗（第 20 天）、古生物收藏（第 22 天）。</div>
      <div class="modal-actions"><button id="modal-close">离 开</button></div>`;
    let html = `<div class="modal-title">酒馆 · 情报贩子</div>
      <div class="trader-talk">"回家的海图，一百五十金币。远洋船、还有下海那套装备的图纸，我这儿都有。玄铁那种脏东西？去沉船湾找独眼。"</div>
      <div class="trade-grid"><div class="trade-col"><b>情报</b></div><div class="trade-col"><b>价</b></div><div class="trade-col"><b>买</b></div></div>`;
    for (const e of TOWN.informant.sell) {
      if (e.kind === 'bp' && Game.invCount(e.id) > 0) continue;
      const p = Game.priceOf(e.base, false, e.id);
      const cur = e.currency || 'beibi';
      html += `<div class="trade-grid"><div class="trade-col">${ITEMS[e.id].name}${e.id === 'seachart' ? '（结局·归乡关键）' : ''}</div><div class="trade-col">${p} ${cur === 'coin' ? '金币' : '贝壳'}</div>
        <div class="trade-col"><button class="mini-btn" data-tbuy="informant:${e.id}" ${(st.inv[cur] || 0) >= p ? '' : 'disabled'}>买</button></div></div>`;
    }
    html += `<div class="hint">海图：能开往亚克兰蒂斯（需配潜水服与氧气罩），也是「结局·归乡」的必需品——远洋船 + 海图 + 3 箱补给。</div>`;
    html += `<div class="hint">金币从哪来？对岸遗迹的石门守卫、海域的海盗与海盗头目、山顶的石碑守卫都会掉；也可以用贝壳币跟老潮换些日用品周转。</div>`;
    html += `<div class="trader-talk warn-text">"听说……集齐三块石板，能读懂这座岛的过去。"</div>`;
    html += `<div class="modal-actions"><button id="modal-close">离 开</button></div>`;
    return html;
  }
    return Object.freeze({shopBuyList,shopSellList,walletBar,laochaoModal,laochaoTab,townModal,townShop,blackModal,missionModal,infoModal});
  }
  return Object.freeze({create});
})();
