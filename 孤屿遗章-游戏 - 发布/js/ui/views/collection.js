/* collection：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const CollectionView = (() => {
  function create(deps) {
    const S=(...args)=>deps.S(...args);
    const esc=(...args)=>deps.esc(...args);
    const itemIcon=(...args)=>deps.itemIcon(...args);
function diaryModal() {
    const st = S();
    let html = `<div class="modal-title">我的日记</div><div class="diary-list">`;
    if (!st.diary.length) html += '<div class="hint">日记还是空的。</div>';
    for (const d of st.diary.slice(-40).reverse()) {
      html += `<div class="diary-line"><span class="diary-day">第${d.day}天</span>${esc(d.line)}</div>`;
    }
    html += `</div><div class="modal-actions"><button id="modal-close">合 上</button></div>`;
    return html;
  }

const COL_CAT_N = { mat:'材料', special:'特殊', bp:'元件', seed:'种子', food:'食物', drink:'饮品', med:'药品', weapon:'武器', armor:'防具', cloth:'衣物', tool:'工具', currency:'货币', accessory:'饰品' };

const TRAIT_CN = { charge:'冲撞', poison:'剧毒', bleed:'流血', pack:'群袭', group:'群袭', enrage:'狂暴', ironImmune:'铁甲', evade:'闪避', dodge:'闪避', first:'先手', water:'水中', swim:'水中', summon:'召唤', gun:'持枪', flee:'逃跑', nightBuff:'夜战强化', stoneGuard:'石甲反噬', pierce:'穿透', dread:'恐吓', nightStun:'晕眩', nightSplit:'分裂' };

const COL_STATION_N = { none:'手工', work1:'工具台', work2:'工具台', work3:'工具台', tailor:'裁缝台', furn1:'熔炉', furn2:'熔炉', furn3:'熔炉', smoke1:'烟熏炉', smoke2:'烟熏炉', fire:'篝火', pot:'药锅', spin:'纺车', loom:'织布机', mortar:'研钵', medPot:'药炉', stove:'灶台', rack:'晾肉架', tannery:'制革架' };

function collectionModal() {
    // 没在游戏里（主界面）也能看：账号级图鉴 = 历代存档解锁过的内容
    const st = S() || { seen: {}, killCount: {}, flags: {} };
    const c = Game.collection();
    const tabs = [['res',`资源 ${c.res}/${c.resTotal}`],['tool','工具'],['items','物品'],['mon',`怪物 ${c.mon}/${c.monTotal}`],['rec',`配方 ${RECIPES.filter(r=>!r.legacyPlank).length}`],['boss','首领'],['ach','成就']];
    let html = `<div class="modal-title">图 鉴</div><div class="tabs">${tabs.map(([k,l]) => `<button class="tab ${deps.colTab === k ? 'active' : ''}" data-ctab="${k}">${l}${NoticeBadges.dot(k)}</button>`).join('')}</div>`;
    // （原来这里有一行"标签上的数字是「已收录 / 图鉴总数」……"的说明，玩家要求删掉。
    //   标签上的 "已收录/总数" 本身就够直观，不用再解释一遍。）
    html += `<div class="col-body">`;
    if (deps.colTab === 'res') html += colRes(st);
    else if (deps.colTab === 'tool') html += colTool();
    else if (deps.colTab === 'items') html += colItems(st);
    else if (deps.colTab === 'mon') html += colMon(st);
    else if (deps.colTab === 'rec') html += colRec();
    else if (deps.colTab === 'boss') html += colBoss(st);
    else html += colAch();
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }

function itemTile(id) {
    return `<button class="col-item col-item-button col-item-tile" data-iteminfo="${esc(id)}">${itemIcon(id)}<b>${esc(ITEMS[id].name)}</b></button>`;
  }

function colRes(st) {
    const seen=Game.metaState().seenItems;
    return `<div class="col-list col-item-grid">${Game.resIds().map(id=>(st.seen[id] || seen[id])?itemTile(id):'<div class="col-item unseen">未发现</div>').join('')}</div>`;
  }

function colTool() {
    return `<div class="col-list col-item-grid">${Object.keys(ITEMS).filter(id=>['weapon','tool','armor','cloth'].includes(ITEMS[id].cat)).map(itemTile).join('')}</div>`;
  }

function colItems(st) {
    const seen=Game.metaState().seenItems || {};
    const ids=Object.keys(ITEMS).filter(id=>st.seen[id] || seen[id]);
    return ids.length?`<div class="col-list col-item-grid">${ids.map(itemTile).join('')}</div>`:'<div class="hint">尚未发现物品。</div>';
  }

function itemInfoModal(id) {
    const it=ITEMS[id];
    if (!it) return '<div class="modal-title">物品不存在</div><div class="modal-actions"><button id="modal-close">关闭</button></div>';
    const stats=[];
    const keys={atk:'攻击',atkBonus:'额外攻击',def:'防御',spd:'速度',warm:'保暖',food:'饱食',water:'水分',sta:'体力',spirit:'精神',heal:'生命回复',healthRestore:'健康回复',packCapacity:'装备后背包容量',crit:'暴击',acc:'命中',dodge:'闪避',block:'格挡',dive:'耐压等级',diveO2:'供氧',light:'照明等级',spoil:'保鲜时长（小时）',stack:'堆叠上限',price:'基础价值'};
    for (const [key,label] of Object.entries(keys)) if (it[key] !== undefined && it[key] !== null && (key !== 'price' || it[key]>0)) stats.push(`${label}：${['acc','dodge','crit','block'].includes(key) && Math.abs(it[key])<1 ? Math.round(it[key]*100)+'%' : it[key]}`);
    if (DURA[id] !== undefined) stats.push(`基础耐久：${DURA[id]}`);
    if (it.ranged) stats.push('远程武器');
    if(it.twoHand)stats.push('双手武器，占用主副手');
    if(it.hitHeal) stats.push(`受击回复 ${it.hitHeal} 生命`);
    if (it.tool && it.tool.kind) stats.push(`工具：${({axe:'斧',pick:'镐',knife:'刀',hoe:'锄',net:'渔网',rod:'鱼竿',bow:'弓',lantern:'提灯'})[it.tool.kind] || '特殊工具'}${it.tool.tier ? ' · 等阶 '+it.tool.tier : ''}`);
    const recipes=RECIPES.filter(r=>!r.legacyPlank && r.out && r.out[id]).slice(0,4);
    const made=recipes.map(r=>`${esc(r.name)}（${COL_STATION_N[r.station] || r.station}）`).join('、');
    return `<div class="modal-title">${it.glyph} ${esc(it.name)}</div><div class="overlay-text">${esc(it.desc || '暂无额外说明。')}</div><div class="help-list"><b>数值</b><div>${stats.length ? stats.join(' · ') : '无直接属性；可作材料、交易品或任务物品。'}</div>${made ? `<div>制造：${made}</div>` : ''}</div><div class="modal-actions"><button id="modal-close">关闭</button></div>`;
  }

function monsterTile(k,st,mm) {
    const e=ENEMIES[k],seen=st.seen['mon_'+k] || mm.seenMon[k];
    if(!seen)return '<div class="col-item unseen">未发现</div>';
    const killed=st.killCount[k] || 0;
    const art=e.img?`<img class="col-mon-art" src="${esc(CombatStage.cutout(e.img))}" alt="" loading="lazy" aria-hidden="true">`:'';
    return `<div class="col-item col-mon-card" data-monster="${esc(k)}">${art}<div class="col-mon-content"><b>${esc(e.name)}</b><small>生命 ${e.hp} · 攻击 ${e.atk} · 防御 ${e.def} · 速度 ${e.spd}${e.traits?.length?' · '+e.traits.map(t=>TRAIT_CN[t] || '特殊能力').join('/') : ''}</small>${e.drops?.length?`<small>掉落：${e.drops.map(d=>`${esc(ITEMS[d.id]?.name || '未知物品')}${d.ch?' '+Math.round(d.ch*100)+'%':''}`).join('、')}</small>`:''}${e.desc?`<small>${esc(e.desc)}</small>`:''}${killed?`<small class="col-times">击败 ×${killed}</small>`:''}</div></div>`;
  }

function colMon(st) {
    const mm=Game.metaState();
    return `<div class="col-list col-mon-grid">${Game.monIds().map(k=>monsterTile(k,st,mm)).join('')}</div>`;
  }

function colRec() {
    let html = '<div class="col-list">';
    for (const raw of RECIPES) {
        if (raw.legacyPlank) continue;
        const r = Game.craftRecipe(raw);
      const inS = Object.entries(r.in || {}).map(([k,v]) => `${ITEMS[k].name}×${v}`).join('、') || '—';
      const outS = Object.entries(r.out || {}).map(([k,v]) => `${ITEMS[k].name}×${v}`).join('、');
      html += `<div class="col-item"><b>${r.name}</b><small>工位：${COL_STATION_N[r.station] || r.station}${r.time ? ` · ${r.time}分` : ''}</small><small>材料：${inS}</small><small>产出：${outS}</small></div>`;
    }
    return html + '</div>';
  }

function colBoss(st) {
    const mm=Game.metaState();
    return `<div class="col-list col-mon-grid">${Game.monIds().filter(k=>ENEMIES[k].boss).map(k=>monsterTile(k,st,mm)).join('')}</div>`;
  }

function colAch() {
    const mm = Game.metaState();
    const ach = mm.ach || {};
    const tierCls = { '紫':'ach-purple', '金':'ach-gold', '红':'ach-red' };
    let html = '<div class="col-list">';
    for (const id in ACHIEVEMENTS) {
      const a = ACHIEVEMENTS[id];
      const st = ach[id];
      html += `<div class="col-item ach ${st ? 'done' : ''}"><span class="ach-glyph">${a.glyph}</span><b>${a.name}</b><span class="ach-tier ${tierCls[a.tier]||''}">${a.tier}</span><small>${a.desc}</small><small>奖励 ${a.reward} 魂点</small>${st === 'claimed' ? '<small class="col-times">已领取</small>' : (st === 'unlocked' ? `<button class="mini-btn" data-claim-ach="${id}">领取</button>` : '<small class="col-times">未达成</small>')}</div>`;
    }
    return html + '</div>';
  }
    return Object.freeze({diaryModal,collectionModal,colRes,colTool,colItems,itemInfoModal,colMon,colRec,colBoss,colAch});
  }
  return Object.freeze({create});
})();
