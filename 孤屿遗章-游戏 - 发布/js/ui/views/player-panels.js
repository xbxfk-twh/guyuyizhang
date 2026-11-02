/* player-panels：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const PlayerPanelView = (() => {
  function create(deps) {
    const itemIcon=(...args)=>deps.itemIcon(...args);
    const el=(...args)=>deps.el(...args);
    const S=(...args)=>deps.S(...args);
    const esc=(...args)=>deps.esc(...args);
    const bindPress=(...args)=>deps.bindPress(...args);
    const dragTransferQuantity=(...args)=>deps.dragTransferQuantity(...args);
    const centerToast=(...args)=>deps.centerToast(...args);
    const portraitPath=(...args)=>deps.portraitPath(...args);
    const settleActions=(...args)=>deps.settleActions(...args);
    const skillBody=(...args)=>deps.skillBody(...args);
    const brokenWeaponRows=(...args)=>deps.brokenWeaponRows(...args);
    const showModal=(...args)=>deps.showModal(...args);
function playerPanelTabs(active){return `<nav class="inventory-view-tabs player-panel-tabs" aria-label="随身管理">${[['inv','背包 '+Game.capUsed()+'/'+Game.capacity()],['equip','装备'],['craft','制作']].map(([k,n])=>`<button data-player-panel="${k}" class="${active===k?'active':''}">${n}</button>`).join('')}</nav>`;}

function layoutWorkModal(titleHtml, bodyHtml, rightHtml) {
    return `<div class="work-head"><div class="work-title">${titleHtml}</div>${rightHtml || ''}</div><div class="work-body">${bodyHtml}</div>`;
  }

const CRAFT_GROUP_NAMES = { all:'全部', material:'原料', textile:'织布', tool:'工具', weapon:'武器', armor:'防具', clothing:'衣物', food:'饮食', smoked:'烟熏', medicine:'药品', accessory:'饰品', device:'器具', other:'其他' };

function craftGroupOf(r) {
    if (r.station === 'spin' || r.station === 'loom') return 'textile';
    if (r.station === 'smoke1' || r.station === 'smoke2') return 'smoked';
    const id = Object.keys(r.out)[0];
    const cat = ITEMS[id] && ITEMS[id].cat;
    if (id === 'flour') return 'material';
    if (cat === 'mat' || cat === 'seed') return 'material';
    if (cat === 'tool') return 'tool';
    if (cat === 'weapon') return 'weapon';
    if (cat === 'armor' || cat === 'shield') return 'armor';
    if (cat === 'cloth') return 'clothing';
    if (cat === 'food' || cat === 'drink') return 'food';
    if (cat === 'med') return 'medicine';
    if (cat === 'accessory') return 'accessory';
    if (cat === 'special') return 'device';
    return 'other';
  }

function renderCraft() {
    const st = S();
    const atCamp = st.scene === 'camp';   // 野外只能手工，其他工坊需回营地
    const atAtlantis = st.scene === 'atlantis';
    const tabs = [
      ['none','手工'], ['work1','工具台'], ['tailor','纺织·衣物'], ['furn1','熔炉'],
      ['med','药品'], ['fire','篝火·烹饪'], ['grind','磨刀石'], ['furniture','晾晒·制革'],
    ];
    if (atAtlantis) tabs.push(['pearlWork','珠光工作台'], ['sourceForge','源质熔炉']);
    // 作者 2026-09-24："未解锁（未建造）的家具也不在制造栏左侧显示"
    // → 没造的工坊**整个分类藏起来**，不再摆一个带 🔒 的死按钮。想知道还能造什么，去营地建造页看。
    // ⚠️ 末尾 `|| craftTab === sid`：当前选中的分类即使暂时不可用也留在列表里，
    //    否则会出现"左边没有任何高亮项、右边却是它的内容"的怪状态。
    const tabAvail = (sid) => sid === 'none' ? true
      : sid === 'fire' ? st.buildings.fire >= 0
      : sid === 'grind' ? !!S().furniture.grindstone
      : stationBuilt(sid);
    const shownTabs = tabs.filter(([sid]) => tabAvail(sid) || deps.craftTab === sid);
    let body = '<div class="work-side craft-stations">';
    for (const [sid, name] of shownTabs) {
      body += `<button class="tab ${deps.craftTab === sid ? 'active' : ''}" data-station="${sid}">${name}</button>`;
    }
    // 制造面板不再挂攻略条（作者 2026-09-22：攻略统一收进邮箱「攻略」页，面板保持干净）
    body += '</div><div class="work-content"><div class="work-scroll"><div class="recipe-list">';
    let html = '';
    let groupHtml = '';
    if (deps.craftTab === 'grind') {
      const w = S().equipment.weapon;
      if (!atCamp) html += '<div class="hint">磨刀石在营地里，回营地才能使用。</div>';
      else if (!S().furniture.grindstone) html += '<div class="hint">请先建造「磨刀石」家具（石头×4+燧石×1）。</div>';
      else if (!w) html += '<div class="hint">请先装备一把武器（主手），才能用磨刀石。</div>';
      else {
        const named = (S().weaponNames || {})[w];
        const repairMat = Game.repairMatOf(w);
        const rcost = repairMat ? `${ITEMS[repairMat[0]].name}×${repairMat[1]}` : '不可修复';
        // 玩家反馈"磨刀磨的是哪把"——明确写出作用于主手武器（作者 2026-09-19）
        html += `<div class="recipe-row"><b>${ITEMS[w].glyph} 磨刀</b><span class="rcost">磨的是<b>主手武器</b>（${ITEMS[w].name}）· +3攻击 · 20%流血 · 持续3场（耗 燧石×1）</span><button class="mini-btn" data-grind="sharpen">磨刀</button></div>`;
        html += repairMat ? `<div class="recipe-row"><b>${ITEMS[w].glyph} 修补</b><span class="rcost">${ITEMS[w].name} 耐久恢复满（耗 ${rcost}）</span><button class="mini-btn" data-grind="repair">修补</button></div>` : `<div class="hint">神弓不可修复；耐久耗尽后留在背包中作收藏。</div>`;
        html += `<div class="recipe-row"><b>${ITEMS[w].glyph} 命名</b><span class="rcost">${named ? '已命名（+1生效）· 每把只能一次' : '武器伤害永久+1（耗 命名牌×1）'}</span><button class="mini-btn" data-grind="name">${named ? '已命名' : '命名'}</button></div>`;
      }
      html += brokenWeaponRows();
    } else if (deps.craftTab !== 'none' && !(atCamp || (atAtlantis && (deps.craftTab === 'pearlWork' || deps.craftTab === 'sourceForge')))) {
      html += '<div class="hint">其他工坊都在营地里，回营地才能使用。</div>';
    } else if (!stationBuilt(deps.craftTab) && deps.craftTab !== 'none' && deps.craftTab !== 'fire') {
      html += `<div class="hint">还没有${tabs.find(t => t[0] === deps.craftTab)[1]}，去营地建造吧。</div>`;
    } else {
      let any = false;
      const list = [];
      if (deps.craftTab === 'work1' && !Game.knowsBlueprint('bpBlack')) html += '<div class="hint">玄铁镐及玄铁装备：先到沉船湾黑市找独眼购买「玄铁武器图纸」，再建造三级「高级工具坊」。拿到图纸后配方才会显示。</div>';
      for (const raw of RECIPES) {
        if (raw.legacyPlank) continue;
        const r = Game.craftRecipe(raw);
        const stations = stationFamily(deps.craftTab);
        if (!stations.includes(r.station)) continue;
        if (deps.craftTab === 'work1') {
          if (r.station !== 'work1' && r.station !== 'work2' && r.station !== 'work3') continue;
        }
        // 作者 2026-09-24："需要图纸的制作改为直接不显示，拿到图纸之后才显示"
        // → 没有图纸的配方整条隐藏（以前是显示成灰色 locked + 一行"需要图纸"，看着像坏了）。
        if (r.needBp && !Game.knowsBlueprint(r.needBp)) continue;
        list.push(r);
      }
      const TOOLFIRST = { r_axestone: 30, r_pickstone: 29, r_knife: 28, r_pole: 27, r_rope: 26, r_stone: 25 };
      // 常用工具和消耗品靠前，背包装备、永久强化与限次配方靠后；同类保持原顺序。
      const recipePriority=r=>r.sortPriority ?? ((TOOLFIRST[r.id]||0)|| (r.permLimit||r.uniqueItem?-10:Object.keys(r.out).every(id=>(['food','drink','mat','med','ammo'].includes(ITEMS[id]?.cat)||ITEMS[id]?.ammo===1))?10:r.needBp?-2:0));
      list.sort((a,b)=>recipePriority(b)-recipePriority(a));
      const groups = [...new Set(list.map(craftGroupOf))];
      if (deps.craftGroup !== 'all' && !groups.includes(deps.craftGroup)) deps.craftGroup = 'all';
      groupHtml = `<nav class="work-groups" aria-label="配方分类"><span class="work-groups-title">分类</span>${['all', ...groups].map(g => `<button class="work-group ${deps.craftGroup === g ? 'active' : ''}" data-craftgroup="${g}">${CRAFT_GROUP_NAMES[g]}</button>`).join('')}</nav>`;
      const visibleList = deps.craftGroup === 'all' ? list : list.filter(r => craftGroupOf(r) === deps.craftGroup);
      // 晾肉架的状态行（空着 / 晾晒中 / 晾透了）
      // 作者 2026-09-24："把晾肉干和晾肉架显示放到一起" —— 以前它固定挂在列表最下面，
      // 跟「晾肉干」那条配方隔着好几行。现在紧跟在那条配方后面输出。
      let rackRowShown = false;
      const rackRow = () => {
        if (!(deps.craftTab === 'furniture' && stationBuilt('rack'))) return '';
        rackRowShown = true;
        const d = Game.dryOf('rack');
        if (!d) {
          const r = Game.craftRecipe(RECIPES.find(x => x.id === 'r_rackmeat'));
          const chk = Game.canCraft(r);
          return `<div class="recipe-row"><b>晾肉架</b><span class="rcost">空着 · 放入兽肉×2、盐×2，晾满 20 小时得肉干×4</span><button class="mini-btn ${chk.ok ? '' : 'lockedb'}" data-recipe="r_rackmeat" ${chk.ok ? '' : `data-reason="${esc(chk.reason)}"`}>开始晾肉</button></div>`;
        }
        const left = Game.dryLeftMin('rack');
        if (left > 0) return `<div class="recipe-row"><b>晾晒中</b><span class="rcost">还要 ${Game.fmtLeft(left)}（这期间架子占着，晾不了别的）</span><button class="mini-btn lockedb" data-dry="1" data-reason="还没晾透，还要 ${Game.fmtLeft(left)}">晾晒中</button></div>`;
        return `<div class="recipe-row"><b>晾透了！</b><span class="rcost">${Object.keys(d.out).map(k => `${ITEMS[k].name}×${d.out[k]}`).join('、')}</span><button class="mini-btn" data-dry="1">取下来</button></div>`;
      };
      for (const r of visibleList) {
        any = true;
        const chk = Game.canCraft(r);
        const hasIt = Game.materialCount(Object.keys(r.out)[0]) > 0;
        // 作者 2026-09-24："制造中每个物品的框也缩小一点点，比如把产物放到名称右侧"
        // → 原来「产出」单独占一行，现在并到名称右边，每张卡少一行（手机上尤其明显）。
        const outTxt = Object.entries(r.out).map(([k,v]) => `${ITEMS[k].name}×${v}`).join('、');
        html += `<div class="recipe ${chk.ok ? '' : 'locked'}">
          <span class="recipe-artwork">${Object.keys(r.out).map(id=>itemIcon(id)).join('')}</span><div class="recipe-info"><div class="recipe-name">${r.name}<span class="recipe-out">产出：${outTxt}</span>${hasIt ? `<span class="owned">×${Game.materialCount(Object.keys(r.out)[0])}</span>` : ''}</div>
          <div class="recipe-mats mats-line">材料：${Object.entries(Game.craftIn(r)).map(([k,v]) => `${ITEMS[k].name} ${Game.materialCount(k)}/${v}`).join(' · ')}</div>
          ${r.id === 'r_plank' ? `<div class="recipe-mats">${r.processingTool ? ITEMS[r.processingTool].name : '基础加工'} · 4 → ${r.out.plank}</div>` : ''}
          ${r.out.lotusPill ? `<div class="recipe-mats mats-line">本局已炼 ${S().lotusMade || 0}/3</div>` : ''}
          ${r.permLimit ? `<div class="recipe-mats mats-line">本局已炼 ${(S().permMade && S().permMade[Object.keys(r.out)[0]]) || 0}/${r.permLimit}；服用不限次数</div>` : ''}
          ${r.uniqueItem ? `<div class="recipe-mats mats-line">限时活动 26.9.15-26.9.30 · 活动结束后不能再造（已做出的永久可用）</div>` : ''}
          </div><div class="recipe-actions">
            <button class="mini-btn ${chk.ok ? '' : 'lockedb'}" data-recipe="${r.id}" ${chk.ok ? '' : `data-reason="${esc(chk.reason)}"`}>制作${r.hang ? `（挂 ${r.time} 分）` : ` ${Game.craftMinutes(r)}分`}</button>
            ${!r.hang && !r.uniqueItem && !r.permLimit ? `<button class="mini-btn" data-craftbatch="${r.id}" ${chk.ok ? "" : "disabled"}>批量</button>` : ""}
          </div>
          ${chk.ok ? '' : `<div class="recipe-lock">${chk.reason}</div>`}
        </div>`;
        if (r.station === 'rack') html += rackRow();
      }
      if (!any) html += '<div class="hint">这里没有可做的配方。</div>';
      // 兜底：如果这个分类下没有 rack 配方（比如配方被图纸门槛挡掉了），架子状态仍然要显示
      if (!rackRowShown && (deps.craftGroup === 'all' || deps.craftGroup === 'food')) html += rackRow();
    }
    html += '</div></div></div>';
    const title = '制 造 <button class="helpbtn work-help" data-crafthelp="1" aria-label="制作说明" title="制作说明">?</button>';
    body = body.replace('<div class="work-content">', groupHtml + '<div class="work-content">');
    return layoutWorkModal(playerPanelTabs('craft'), body + html, '<button class="helpbtn work-help" data-crafthelp="1">?</button>');
  }

function stationBuilt(sid) {
    const st = S();
    if (sid === 'pearlWork' || sid === 'sourceForge' || sid === 'repair') return !!(st.atlantis && st.atlantis.camp && st.atlantis.camp.furniture && st.atlantis.camp.furniture[sid]);
    const map = {
      work1: ['wb1','wb2','wb3'], work2: ['wb2','wb3'], work3: ['wb3'],
      tailor: ['tailor','spin','loom'],
      furn1: ['fr1','fr2','fr3'], furn2: ['fr2','fr3'], furn3: ['fr3'],
      smoke1: ['sm1','sm2'], smoke2: ['sm2'],
      spin: ['spin'], loom: ['loom'], mortar: ['mortar'], medPot: ['medPot'], rack: ['rack'], tannery: ['tannery'],
      stove: ['stove'], fire: ['fire'], none: ['none'], pot: ['stove'],
      med: ['mortar','medPot','stove'],   // 家具 id：研钵 / 药炉 / 灶台（提神茶在灶台）
      furniture: ['rack','tannery'],
    };
    if (sid === 'tailor') return Game.tailorGifted() || !!st.furniture.spin || !!st.furniture.loom;   // 含旧档赠送（flags.tailorGift）
    const ids = map[sid] || [];
    return ids.includes('none') || ids.some(id => st.furniture[id]);
  }

function stationFamily(sid) {
    if (sid === 'none') return ['none'];
    if (sid === 'work1') return ['work1','work2','work3'];
    if (sid === 'tailor') return ['tailor','spin','loom'];
    if (sid === 'furn1') return ['furn1','furn2','furn3'];
    if (sid === 'smoke1') return ['smoke1','smoke2'];
    if (sid === 'fire') return ['fire','stove','smoke1','smoke2'];
    if (sid === 'med') return ['mortar','medPot','pot'];   // 药品：草药膏/解毒剂/淬毒剂/不死丹/蓝牛/提神茶
    if (sid === 'furniture') return ['rack','tannery'];
    return [sid];
  }

function catOf(cat) {
    if (cat === 'food' || cat === 'drink') return 'food';
    if (cat === 'bp') return 'bp';
    if (cat === 'mat' || cat === 'seed') return 'mat';
    if (cat === 'tool') return 'tool';
    if (cat === 'weapon' || cat === 'armor' || cat === 'cloth') return 'gear';
    if (cat === 'med') return 'med';
    return 'other';
  }

function renderInventory(isWarehouse=false, paneOnly=false) {
    const isCellar=isWarehouse==='cellar';
    const st = S();
    const CATS = [['all','全部'],['food','食物'],['mat','材料'],['tool','工具'],['gear','作战'],['med','药品'],['bp','图纸'],['other','特殊']];
    const w=isCellar?Game.cellarState():isWarehouse?Game.warehouseState():null,inventory=w?w.inv:st.inv,category=isCellar?'all':isWarehouse?deps.warehouseCat:deps.invCat;
    const records=id=>w?(isCellar?S().cellar:Game.atlantisCamp&&w.site==='sea'?Game.atlantisCamp().warehouse:S().warehouse)?.items.filter(x=>x.id===id)||[]:[];
    const durAt=(id,i=0)=>w?(records(id)[i]?.dur??null):Game.durOf(id,i),maxAt=(id,i=0)=>w?(records(id)[i]?.maxDur||DURA[id]):Game.durMaxOf(id,i);
    let ids=Object.keys(inventory);
    if (category === 'tool') ids = ids.filter(id => catOf(ITEMS[id].cat) === 'tool' || !!(ITEMS[id] && ITEMS[id].tool));   // 匕首这类"能当工具使"的也归到工具页
    else if (category !== 'all') ids = ids.filter(id => catOf(ITEMS[id].cat) === category);
    let html = `<div class="work-side inventory-side"><div class="inventory-categories">` + (isCellar?[['all','食物储藏']]:CATS).map(([k,n])=>`<button class="tab ${category===k?'active':''}" data-invcat="${k}" data-invsource="${isWarehouse?'warehouse':'bag'}">${n}</button>`).join('') + `</div>${isCellar?'<div class="inventory-actions"><button class="tab" data-cellar-deposit>存入食物</button><button class="tab" data-bag-open>背包</button></div>':isWarehouse?'<div class="inventory-actions"><button class="tab" data-warehouse-auto><span>自动</span><span>存入</span></button></div>':''}</div><div class="work-content"><div class="work-scroll"><div class="inv-grid">`;
    if (!isWarehouse && Game.loadPenalty().excess>0) html += `<div class="inventory-overload" style="grid-column:1/-1">带了过多的物品，移动体力消耗增加${Game.loadPenalty().percent}%。</div>`;
    if (!ids.length) html += '<div class="hint">这个分类下没有物品。</div>';
    for (const id of ids) {
      const it = ITEMS[id];
      const q = inventory[id];
      const eq = (!isWarehouse && (st.equipment.weapon === id || st.equipment.weapon2 === id || st.equipment.armor === id || st.equipment.cloth === id || st.equipment.accessory === id)) ? ' equiped' : '';
      const dr = durAt(id);
      let bar = '';
      if (dr !== null) bar = `<span class="inv-dur"><i style="width:${Math.round(dr / maxAt(id) * 100)}%"></i></span>`;
      else if (it.spoil) { const exp = isWarehouse?Math.min(...records(id).map(x=>x.expiry??Infinity)):st.foodExp && st.foodExp[id]; const shelf = it.spoil * 2 * (isCellar?3:1) * (st.furniture && st.furniture.rack && (id === 'meat' || id === 'fish') ? 1.5 : 1); const fr = exp !== undefined ? Math.max(0, Math.min(1, (exp - (st.tick || 0)) / (shelf * 60))) : 1; bar = `<span class="inv-dur"><i class="fresh" style="width:${Math.round(fr * 100)}%"></i></span>`; }
      const cur = it.cat === 'currency';   // 货币单独显示卡片，不计背包容量
      const tierCls = cur ? '' : (q > 100 ? ' st-5' : q > 80 ? ' st-4' : q > 60 ? ' st-3' : q > 40 ? ' st-2' : q > 20 ? ' st-1' : '');
      const span = 1;   // 货币/工具装备不跨格；可堆叠仅60+占两格
      if (it.stack === 1 && q > 1) {
        // 不可堆叠（工具/武器/装备）：每件单独占一格，各显示耐久
        for (let i = 0; i < q; i++) {
          const d = durAt(id,i);
          const db = DURA[id] !== undefined ? `<span class="inv-dur"><i style="width:${Math.round((d||0) / maxAt(id,i) * 100)}%"></i></span>` : '';
          html += `<button class="inv-item${eq}" ${isCellar?'data-cellar-item':isWarehouse?'data-warehouse-item':'data-item'}="${id}">${itemIcon(id)}<span class="inv-name">${it.cat === 'weapon' ? Game.wNameOf(id) : it.name}</span>${db}<span class="inv-qty">1</span></button>`;
        }
      } else {
        html += `<button class="inv-item${eq}${tierCls}" ${isCellar?'data-cellar-item':isWarehouse?'data-warehouse-item':'data-item'}="${id}" ${span > 1 ? `style="grid-column:span ${span}"` : ''}>${itemIcon(id)}<span class="inv-name">${it.cat === 'weapon' ? Game.wNameOf(id) : it.name}</span>${bar}<span class="inv-qty">${q}</span></button>`;
      }
    }
    html += '</div></div></div>';
    if(isCellar)html=html.replace('<div class="inv-grid">','<p class="hint">独立20格 · 腐坏速度为三分之一</p><div class="inv-grid">');
    if(paneOnly)return html;
    if(isWarehouse&&!isCellar) {
      const head=`<div class="inventory-dual-head"><div class="warehouse-heading"><button data-bag-open>背包 ${Game.capUsed()}/${Game.capacity()}</button><button data-transfer-help aria-label="存取操作说明">↔</button></div><div class="warehouse-heading"><b>仓库 ${w.used}/${w.capacity}</b><span class="warehouse-heading-actions"><button data-auto-help aria-label="自动存入说明">?</button></span></div></div>`;
      const body=`<div class="inventory-dual"><section class="inventory-pane" aria-label="背包"><div class="inventory-pane-body">${renderInventory(false,true)}</div></section><section class="inventory-pane" aria-label="${w.site==='sea'?'海底':'营地'}仓库"><div class="inventory-pane-body">${!w.capacity?'<p class="hint">请先建造储物箱。</p>':''}${html}</div></section></div>`;
      return layoutWorkModal(head,body);
    }
    const title=isCellar?`地窖（${w.used}/20格）`:playerPanelTabs('inv');
    return layoutWorkModal(title,html);
  }

function warehouseModal() {return renderInventory(true);}

function showBuffInfo(title,text) {
    if(!deps.battleView){showModal('buffInfo',{title,text});return;}
    document.querySelector('#battle-buff-info')?.remove();
    const panel=el('div','battle-buff-popup','');panel.id='battle-buff-info';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',title);
    panel.innerHTML='<div class="battle-buff-card">'+buffInfoModal({title,text})+'</div>';const previousFocus=document.activeElement;const close=()=>{panel.remove();previousFocus?.focus();};panel.querySelector('button').onclick=close;panel.onclick=e=>{if(e.target===panel)close();};panel.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape')close();if(e.key==='Tab'){e.preventDefault();panel.querySelector('button').focus();}};document.body.appendChild(panel);panel.querySelector('button').focus();
  }

function buffInfoModal(cfg) {return `<div class="modal-title">${esc(cfg.title)}</div><div class="overlay-text">${esc(cfg.text).replace(/\n/g,'<br>')}</div><div class="modal-actions"><button id="modal-close">知道了</button></div>`;}

function equipmentNumbers(id,idx=0) {
    const it=ITEMS[id];if(!it)return '';
    const parts=[];if(it.atk)parts.push('攻'+it.atk);if(it.def)parts.push('防'+it.def);if(it.spd)parts.push('速'+it.spd);if(it.warm)parts.push('暖'+it.warm);if(it.block)parts.push('格挡'+Math.round(it.block*100)+'%');if(it.hitHeal)parts.push('受击回血'+it.hitHeal);if(it.hp)parts.push('生命上限+'+it.hp);for(const [k,n]of [['crit','暴击'],['dodge','闪避'],['acc','命中']])if(it[k])parts.push(n+'+'+Math.round(it[k]*100)+'%');if(id==='thruster')parts.push('海底移动消耗减半');
    if(DURA[id]!==undefined)parts.push('耐久 '+Game.durOf(id,idx)+'/'+Game.durMaxOf(id,idx));
    return parts.join(' · ');
  }

function loadoutOverview(st) {
    let html='<div class="loadout-overview"><div class="loadout-upper"><div class="loadout-gear">';
    for(const [k,n]of [['weapon','主手'],['weapon2','副手'],['armor','护甲'],['cloth','衣物'],['accessory','饰品']]) {
      const id=st.equipment[k],idx=st.equipIdx?.[k]||0,d=id?Game.durOf(id,idx):null;
      html+=`<div class="equip-slot-row loadout-row" data-equipped-slot="${k}" data-eqpick="${k}" role="button" tabindex="0"><b>${n}</b><span class="equip-val">${id?itemIcon(id):'<span class="item-icon slot-empty-icon"></span>'}<span class="equip-txt">${id?esc(Game.wNameOf(id)):k==='weapon2'&&ITEMS[st.equipment.weapon]?.twoHand?'双手占用':'未装备'}</span>${id?`<small class="equip-dur">${equipmentNumbers(id,idx)}</small>`:''}${id?`<button class="mini-btn" data-unequip-slot="${k}">卸下</button>`:''}<button class="mini-btn equip-swap" data-eqpick="${k}">更换</button></span></div>`;
    }
    html+=`</div><div class="equip-card-space loadout-card"><figure class="equip-portrait"><img src="${portraitPath(st.identity)}" alt="人物头像" data-portrait="${st.identity}" onerror="__portraitFail(this,'${st.identity}')"></figure></div></div><div class="loadout-label">工具与背包 <small>点击槽位更换</small></div><div class="loadout-tools">`;
    for(let i=0;i<3;i++){const id=st.toolkit?.[i],d=id?Game.durOf(id):null;html+=`<button class="loadout-slot" data-eqpick="tool">${id?itemIcon(id):'<span class="item-icon">＋</span>'}<b>${id?ITEMS[id].name:'工具槽'}</b><small>${d===null?'未装备':d+'/'+Game.durMaxOf(id)}</small></button>`;}
    const pack=st.backpack&&Game.invCount(st.backpack)>0?st.backpack:null;
    html+=`<button class="loadout-slot backpack-slot" data-eqpick="pack">${pack?itemIcon(pack):'<span class="item-icon">＋</span>'}<b>${pack?ITEMS[pack].name:'背包槽'}</b><small>${pack?'容量 +'+ITEMS[pack].packCapacity:'装上才生效'}</small></button></div><div class="loadout-label">神物</div><div class="loadout-relics">`;
    for(let i=0;i<3;i++){const id=st.relicEquip?.[i],locked=i>=(st.relicSlots||0);html+=`<button class="loadout-slot ${locked?'locked':''}" ${locked?`data-unlockslot="${i}"`:'data-eqpick="relic"'} ${id==='satchel'?'data-satchel-settings':''}>${locked?'<span class="item-icon">◇</span>':id?itemIcon(id):'<span class="item-icon">＋</span>'}<b>${locked?'未解锁':id?RELICS[id].name:'神物槽'}</b><small>${locked?Game.relicSlotCost(i)+'金币':''}</small></button>`;}
    html+='</div></div>';return html;
  }

function equipmentPickModal(cfg={}) {
    const kind=cfg.kind||'weapon',st=S(),names={weapon:'主手武器',weapon2:'副手武器',armor:'护甲',cloth:'衣物',accessory:'饰品',tool:'工具',pack:'背包',relic:'神物'};
    let html=`<div class="modal-title">更换${names[kind]||'装备'}</div><div class="inv-grid equipment-picker">`;
    const ids=kind==='relic'?st.relics||[]:Object.keys(st.inv).filter(id=>{const it=ITEMS[id];if(!it)return false;if(kind==='pack')return !!it.packCapacity;if(kind==='tool')return !!it.tool;return kind==='weapon'?it.cat==='weapon'&&!it.ammo:kind==='weapon2'?['weapon','shield'].includes(it.cat)&&!it.ammo&&!it.twoHand:it.cat===kind;});
    for(const id of ids){const it=ITEMS[id]||RELICS[id],qty=kind==='relic'?1:st.inv[id];for(let i=0;i<(kind==='weapon'||kind==='weapon2'||['armor','cloth','accessory'].includes(kind)?qty:1);i++){const action=kind==='pack'?`data-pack="${id}"`:kind==='tool'?`data-equiptool="${id}"`:kind==='relic'?`data-equiprelic="${id}" ${id==='satchel'?'data-satchel-settings':''}`:`data-equip="${id}" data-idx="${i}" data-target-slot="${kind}"`;html+=`<button class="inv-item" ${action}>${itemIcon(id)}<span class="inv-name">${esc(it.name)}</span><small>${kind==='pack'?'容量 +'+it.packCapacity+(it.remoteWarehouse?' · 外出存仓':''):kind==='relic'?esc(it.desc||''):equipmentNumbers(id,i)}</small></button>`;}}
    if(!ids.length)html+='<div class="hint">背包里没有适合此槽位的物品。</div>';
    html+=`</div><div class="modal-actions ${kind==='tool'||kind==='pack'?'equipment-picker-actions':''}">`;
    if(kind==='pack'&&st.backpack)html+='<button data-unpack>卸下背包</button>';
    if(kind==='tool')for(const id of (st.toolkit||[]).filter(Boolean))html+=`<button data-unequiptool="${id}">卸下${ITEMS[id].name}</button>`;
    if(kind==='relic')for(const id of (st.relicEquip||[]).filter(Boolean))html+=`<button data-unequip="${id}">卸下${RELICS[id].name}</button>`;
    return html+'<button data-loadout-back>返回装备</button></div>';
  }

function renderEquip() {
    const st = S();
    const tabs = [['p1','装备'],['skill','技能'],['attr','属性']];
    let html = `<div class="work-side">${tabs.map(([k,l]) => `<button class="tab ${deps.equipTab === k ? 'active' : ''}" data-equiptab="${k}">${l}</button>`).join('')}</div><div class="work-content"><div class="work-scroll">`;
    if (deps.equipTab === 'p1') {
      html += loadoutOverview(st);
    } else if (deps.equipTab === 'skill') {
      html += '<div class="modal-title" style="margin-top:10px">技能 <span style="font-size:11px">制造／采集／战斗 · 消耗经验手动升级</span></div>' + skillBody();
    } else if (deps.equipTab === 'attr') {
      const st = S();
      const cs = Game.charStats();
      const dw = st.equipment.weapon ? ITEMS[st.equipment.weapon] : null;
      const d2 = st.equipment.weapon2 ? ITEMS[st.equipment.weapon2] : null;
      const wline = (dw ? `${dw.glyph} ${Game.wNameOf(st.equipment.weapon)}` : '未装备') + (d2 && d2.cat !== 'shield' ? ` + ${d2.glyph} ${Game.wNameOf(st.equipment.weapon2)}` : '') + (d2 && d2.cat === 'shield' ? ` + ${d2.glyph} ${d2.name}(盾)` : '');
      html += '<div class="modal-title" style="margin-top:10px">人物属性 <span style="font-size:11px">c（a+b）· a 人物攻击 / b 武器加成 / c 当前攻击</span></div>';
      const sa=settleActions(), settled=st.flags.settledEnding;
      if (sa.length || settled) {
        html += '<section class="attr-settle"><div class="attr-settle-title">本局结局</div>';
        if (settled) html += `<div class="attr-settle-note">本局已以「${esc((ENDINGS[settled] || {}).name || settled)}」结算；每个存档只能结算一次。其他结局的达成记录仍会保留，可继续探索。</div>`;
        else html += sa.map(a=>`<button class="mini-btn attr-settle-btn" data-settle="${esc(a.id.slice(7))}" title="${esc(a.desc)}">${esc(a.name)}</button>`).join('')+'<div class="attr-settle-note">每个存档只能结算一次；结算后仍可继续探索。</div>';
        html += '</section>';
      }
      html += '<div class="attr-wrap"><div class="attr-left"><div class="help-list">';
      const row = (k, v) => `<div class="help-item"><b>${k}</b><span>${v}</span></div>`;
      html += row('主手武器', wline);
      html += row('攻击力', `${cs.c}（${cs.a}+${cs.b}）`);
      html += row('防御力', cs.def);
      // 属性页只展示攻速数值；规则集中在简化后的战斗帮助。
      {
        const s = cs.spd;
        html += row('攻速', s);
      }
      html += row('格挡率', cs.block + '%');
      html += row('生命值', `${cs.hp}/${cs.maxhp}`);
      html += row('健康值', `${Game.healthValue()}/100${st.statuses.infection?' · 感染':''}`);
      // 作者2026-10-06要求移除体力括号说明，仅保留当前值与上限。
      html += row('体力', `${cs.stam}/${cs.maxstam}`);
      const spNow = Math.round(st.stats.spirit);
      const spNote = spNow >= 50 ? '体力上限 100%' : (spNow >= 20 ? '体力上限 -10%' : '体力上限 -20%，采集耗时 +10%');
      html += row('精神', `${spNow}/100（${spNote}）`);
      html += row('护甲', cs.armor);
      html += row('衣物·保暖', cs.cloth + `（暖${st.equipment.cloth && ITEMS[st.equipment.cloth].warm ? ITEMS[st.equipment.cloth].warm : 0}）`);
      const t = Game.temperatureInfo();
      html += row('环境温度', `${t.environment}℃（天气 ${t.weather}℃，因地点而变化）`);
      html += row('自身温度', `${t.body.toFixed(1)}℃（${t.state === 'cold' ? '过冷' : t.state === 'heat' ? '过热' : '舒适'}${t.suitThermal ? `，潜水服隔温 +${t.suitThermal.toFixed(1)}℃` : ''}${t.grace && t.state !== 'normal' ? `，换衣缓冲 ${t.grace} 分` : t.state !== 'normal' ? `，命中 -10%，每小时 -${t.state === 'cold' ? 5 : 3} 生命` : ''}）`);
      html += row('战斗中', `磨刀 ${S().weaponSharpen ? '生效中(剩'+S().weaponSharpen.fights+'场)' : '无'} · 武器命名+${(S().weaponNames && S().weaponNames[st.equipment.weapon] && S().weaponNames[st.equipment.weapon].bonus) || 0}`);
      // 水壶系：没建就**整条不显示**（玩家反馈"未装备水壶"这行看不懂，以为是装备格）；
      // 建了就写清楚效果；加装滤雨器也照样算有水壶（-20% 一直在）。
      if (cs.tank || st.furniture.rainfilter) {
        html += row('水壶', st.furniture.rainfilter ? `已建 + 滤雨器（口渴 -20%，储水 ${Math.max(0, Number(st.rainWater) || 0)}/20；营地手动取水）` : '已建（口渴消耗 -20%）');
      }
      html += '</div></div>';
      html += `<div class="attr-right"><img class="attr-portrait" src="${portraitPath(st.identity || '')}" alt="" onerror="__portraitFail(this,'${st.identity || ''}')"><div class="attr-char">${(IDENTITIES[st.identity] || {}).name || ''}</div>`;
      html += '</div>';
      html += '</div>';
    }
    html += '</div></div>';
    const title = '装备 <button class="helpbtn work-help" data-helprules="1" aria-label="战斗规则" title="战斗规则">?</button>';
    return layoutWorkModal(playerPanelTabs('equip'), html, '<button class="helpbtn work-help" data-helprules="1">?</button>');
  }

function bindCellarControls(m){for(const dir of ['store','take'])m.querySelectorAll('[data-cellar-'+dir+']').forEach(b=>{const id=b.dataset[dir==='store'?'cellarStore':'cellarTake'],deposit=dir==='store';bindPress(b,()=>{const n=b.dataset.all?Game.cellarState().inv[id]:1,r=Game.transferCellar(id,n,deposit);centerToast(r.ok?(deposit?'存入':'取出')+ITEMS[id].name+'×'+r.moved:r.reason);if(r.ok)showModal('cellar');},start=>{showModal('batchn',{kind:'cellar',item:id,dir:deposit?'in':'out'});dragTransferQuantity(start);});});}

function freshnessCards(id,fromWarehouse=false) {
    if(!ITEMS[id].spoil)return '';
    const rows=fromWarehouse?((fromWarehouse==='cellar'?S().cellar:(Game.warehouseSite()==='sea'?Game.atlantisCamp():S()).warehouse)?.items||[]).filter(x=>x.id===id).map(x=>({qty:x.qty,minutes:Number.isFinite(x.expiry)?Math.max(0,x.expiry-(S().tick||0)):null})):Game.foodFreshness(id);
    const groups=new Map();for(const r of rows)groups.set(r.minutes,(groups.get(r.minutes)||0)+r.qty);
    const fmt=m=>m===null?'保鲜时间未知':m<=0?'已腐坏':m>=1440?Math.floor(m/1440)+'天'+Math.floor(m%1440/60)+'小时':m>=60?Math.floor(m/60)+'小时'+Math.ceil(m%60)+'分钟':Math.ceil(m)+'分钟';
    return '<div class="freshness-batches" aria-label="保鲜批次">'+[...groups].sort((a,b)=>(a[0]??Infinity)-(b[0]??Infinity)).map(([m,n])=>'<div class="freshness-batch" data-qty="'+n+'" data-minutes="'+m+'">'+itemIcon(id)+'<b>×'+n+'</b><small>'+fmt(m)+'</small></div>').join('')+'</div><p class="hint">先使用最早腐坏的批次。</p>';
  }

function itemUseButtons(id,source=false) {
    if(Game.itemUseCount(id,source)<1)return '';
    const it=ITEMS[id],btns=[];
    if (it.cat !== 'med' && (it.food || it.water || it.cat === 'food' || it.cat === 'drink' || it.curePoison || it.stopBleed)) btns.push(`<button data-use="${id}">${it.cat === 'drink' ? '饮用' : (it.curePoison ? '服用' : '食用')}（${it.food ? `+${it.food}饱 ` : ''}${it.water ? `+${it.water}水 ` : ''}${it.heal ? `+${it.heal}命 ` : ''}${it.spirit ? `+${it.spirit}神 ` : ''}${it.sta ? `+${it.sta}体力 ` : ''}${it.curePoison ? '解毒 ' : ''}）</button>`);
    if (it.cat === 'med') {
      const eff = [it.healthRestore ? `+${it.healthRestore}健康` : null, it.cureInfection ? '治疗感染' : null, it.heal ? `+${it.heal}命` : null, it.sta ? `+${it.sta}体力` : null, it.water ? `+${it.water}水` : null,
        it.spirit ? `${it.spirit > 0 ? '+' : ''}${it.spirit}神` : null, it.stopBleed ? '止血' : null, it.curePoison ? '解毒' : null].filter(Boolean).join(' · ');
      btns.push(`<button data-med="${id}">使用${eff ? `（${eff}）` : ''}</button>`);
    }

    return btns.join('');
  }

function itemDetail(id,fromWarehouse=false) {
    const st = S();
    const it = ITEMS[id];
    if(fromWarehouse==='cellar'){const n=Game.cellarState().inv[id]||0;return '<div class="modal-title">'+itemIcon(id)+esc(it.name)+' ×'+n+'</div><p>'+esc(it.desc||'')+'</p>'+freshnessCards(id,'cellar')+'<p class="hint">显示在地窖中可保存的时间，取出后恢复普通腐坏速度。</p><div class="modal-actions item-actions">'+itemUseButtons(id,'cellar')+'<button data-cellar-take="'+id+'">取出</button><button data-cellar-take="'+id+'" data-all="1">全部取出</button></div>';}
    if(fromWarehouse){const w=Game.warehouseState(),n=w.inv[id]||0,rows=(w.site==='sea'?Game.atlantisCamp().warehouse:S().warehouse)?.items.filter(x=>x.id===id)||[];return '<div class="modal-title">'+itemIcon(id)+esc(it.name)+' ×'+n+'</div><p>'+esc(it.desc||'')+'</p>'+freshnessCards(id,true)+(rows[0]?.dur!==undefined?'<p>耐久 '+rows[0].dur+'/'+rows[0].maxDur+'</p>':'')+'<div class="modal-actions item-actions">'+itemUseButtons(id,true)+(it.cat==='bp'?'<button data-learn="'+id+'" '+(st.learnedBlueprints?.[id]?'disabled':'')+'>'+(st.learnedBlueprints?.[id]?'已学会':'学习')+'</button>':'')+'<button data-ware-transfer="'+id+'" data-dir="out" data-qty="1">取出</button>'+(n>1?'<button data-ware-transfer="'+id+'" data-dir="out" data-qty="all">全部取出</button>':'')+'</div>';}

    let btns = [];
    if(Game.cellarAccess()&&['food','drink'].includes(it.cat))btns.push('<button data-cellar-store="'+id+'">存入地窖</button>');
    if(Game.warehouseDepositAccess()&&Game.warehouseCapacity()>0&&Game.warehouseDepositCount(id)>0)btns.push('<button data-ware-transfer="'+id+'" data-dir="in" data-qty="1">存入</button>'+(Game.warehouseDepositCount(id)>1?'<button data-ware-transfer="'+id+'" data-dir="in" data-qty="all">全部存入</button>':''));
    btns.push(itemUseButtons(id));
    if (it.coatPoison) btns.push(`<button disabled>战斗中使用 · 淬毒</button>`);
    if (it.cat === 'weapon' || it.cat === 'armor' || it.cat === 'cloth') btns.push(`<button data-equip="${id}">${(st.equipment.weapon === id || st.equipment.armor === id || st.equipment.cloth === id) ? '已装备' : '装备'}</button>`);
    if (it.cat === 'seed') btns.push(`<button data-plant="${id}">去耕地播种</button>`);
    if(it.cat==='bp')btns.push(`<button data-learn="${id}" ${st.learnedBlueprints?.[id]?'disabled':''}>${st.learnedBlueprints?.[id]?'已学会':'学习'}</button>`);

    // 限定 · 神弓：详情页里给一个"存入邮箱（跨局）"的入口
    if (id === 'divineBow') {
      btns.push(`<button data-storebow="1">存入一把到邮箱（跨局）</button>`);
    }
    // 保鲜：显示真实剩余时间
    let spoilLine = '';
    const durNow = Game.durOf(id);
    if (durNow !== null) {
      const n = st.inv[id] || 1;
      if (n > 1) {   // 同名多件：逐件列出，避免"看起来都在掉"
        const shown = [];
        for (let i = 0; i < Math.min(n, 6); i++) shown.push(`${Game.durOf(id, i)}/${Game.durMaxOf(id, i)}`);
        spoilLine = `耐久（${n} 件）：${shown.join('、')}${n > 6 ? ' …' : ''}`;
      } else spoilLine = `耐久：${durNow} / ${Game.durMaxOf(id)}`;
    }
    return `<div class="modal-title">${it.glyph} ${it.name} ×${st.inv[id]}</div>
      <div class="item-desc">${it.desc}</div>
      ${it.spoil?freshnessCards(id):spoilLine?`<div class="item-desc warn-text">${spoilLine}</div>`:''}
      ${it.cat === 'accessory' && DURA[id] !== undefined ? '<div class="item-desc">佩戴时属性生效；战斗中受伤会损耗 1 点耐久。</div>' : ''}
      ${it.atk ? `<div class="item-desc">攻击 ${it.atk}</div>` : ''}
      ${it.def ? `<div class="item-desc">防御 ${it.def}</div>` : ''}
      ${it.warm ? `<div class="item-desc">保暖 ${it.warm}</div>` : ''}
      <div class="modal-actions item-actions">${btns.join('')}</div>`;
  }
    return Object.freeze({playerPanelTabs,layoutWorkModal,craftGroupOf,renderCraft,stationBuilt,stationFamily,catOf,renderInventory,warehouseModal,showBuffInfo,buffInfoModal,equipmentNumbers,loadoutOverview,equipmentPickModal,renderEquip,bindCellarControls,freshnessCards,itemUseButtons,itemDetail});
  }
  return Object.freeze({create});
})();
