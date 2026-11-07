/* dialogs：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const DialogView = (() => {
  function create(deps) {
    const itemIcon=(...args)=>deps.itemIcon(...args);
    const $=(...args)=>deps.$(...args);
    const S=(...args)=>deps.S(...args);
    const esc=(...args)=>deps.esc(...args);
    const inlineHelp=(...args)=>deps.inlineHelp(...args);
    const bindPress=(...args)=>deps.bindPress(...args);
    const bindWarehouseCard=(...args)=>deps.bindWarehouseCard(...args);
    const dragTransferQuantity=(...args)=>deps.dragTransferQuantity(...args);
    const centerToast=(...args)=>deps.centerToast(...args);
    const maybeBatchTip=(...args)=>deps.maybeBatchTip(...args);
    const addLog=(...args)=>deps.addLog(...args);
    const skinOn=(...args)=>deps.skinOn(...args);
    const enableSkin=(...args)=>deps.enableSkin(...args);
    const clearSkins=(...args)=>deps.clearSkins(...args);
    const skinName=(...args)=>deps.skinName(...args);
    const setLogMode=(...args)=>deps.setLogMode(...args);
    const setShowObjective=(...args)=>deps.setShowObjective(...args);
    const setLogSize=(...args)=>deps.setLogSize(...args);
    const render=(...args)=>deps.render(...args);
    const withAnimation=(...args)=>deps.withAnimation(...args);
    const fitStage=(...args)=>deps.fitStage(...args);
    const repairModal=(...args)=>deps.repairModal(...args);
    const atlTradeModal=(...args)=>deps.atlTradeModal(...args);
    const fishmanModal=(...args)=>deps.fishmanModal(...args);
    const renderRuneModal=(...args)=>deps.renderRuneModal(...args);
    const bindRune=(...args)=>deps.bindRune(...args);
    const sleepModal=(...args)=>deps.sleepModal(...args);
    const renderHeirloom=(...args)=>deps.renderHeirloom(...args);
    const devpwModal=(...args)=>deps.devpwModal(...args);
    const rescueModal=(...args)=>deps.rescueModal(...args);
    const renderBackup=(...args)=>deps.renderBackup(...args);
    const comHelpModal=(...args)=>deps.comHelpModal(...args);
    const skillModal=(...args)=>deps.skillModal(...args);
    const skillTreeModal=(...args)=>deps.skillTreeModal(...args);
    const shopBuyList=(...args)=>deps.shopBuyList(...args);
    const shopSellList=(...args)=>deps.shopSellList(...args);
    const batchnModal=(...args)=>deps.batchnModal(...args);
    const batchModal=(...args)=>deps.batchModal(...args);
    const renderCampHelp=(...args)=>deps.renderCampHelp(...args);
    const livestockModal=(...args)=>deps.livestockModal(...args);
    const campModal=(...args)=>deps.campModal(...args);
    const renderCraft=(...args)=>deps.renderCraft(...args);
    const renderInventory=(...args)=>deps.renderInventory(...args);
    const warehouseModal=(...args)=>deps.warehouseModal(...args);
    const buffInfoModal=(...args)=>deps.buffInfoModal(...args);
    const equipmentPickModal=(...args)=>deps.equipmentPickModal(...args);
    const renderEquip=(...args)=>deps.renderEquip(...args);
    const bindCellarControls=(...args)=>deps.bindCellarControls(...args);
    const itemDetail=(...args)=>deps.itemDetail(...args);
    const laochaoModal=(...args)=>deps.laochaoModal(...args);
    const townModal=(...args)=>deps.townModal(...args);
    const blackModal=(...args)=>deps.blackModal(...args);
    const missionModal=(...args)=>deps.missionModal(...args);
    const infoModal=(...args)=>deps.infoModal(...args);
    const restoreCombatView=(...args)=>deps.restoreCombatView(...args);
    const renderCombat=(...args)=>deps.renderCombat(...args);
    const backupSummary=(...args)=>deps.backupSummary(...args);
    const downloadBackup=(...args)=>deps.downloadBackup(...args);
    const settingsModal=(...args)=>deps.settingsModal(...args);
    const dailyReportModal=(...args)=>deps.dailyReportModal(...args);
    const winterModal=(...args)=>deps.winterModal(...args);
    const signModal=(...args)=>deps.signModal(...args);
    const guideModal=(...args)=>deps.guideModal(...args);
    const watchAd=(...args)=>deps.watchAd(...args);
    const adShopModal=(...args)=>deps.adShopModal(...args);
    const mailboxModal=(...args)=>deps.mailboxModal(...args);
    const askConfirm=(...args)=>deps.askConfirm(...args);
    const farmModal=(...args)=>deps.farmModal(...args);
    const bindFarm=(...args)=>deps.bindFarm(...args);
    const diaryModal=(...args)=>deps.diaryModal(...args);
    const collectionModal=(...args)=>deps.collectionModal(...args);
    const itemInfoModal=(...args)=>deps.itemInfoModal(...args);
    const lotteryModal=(...args)=>deps.lotteryModal(...args);
    const lotteryPickModal=(...args)=>deps.lotteryPickModal(...args);
    const lotteryPoolModal=(...args)=>deps.lotteryPoolModal(...args);
    const lotteryResultModal=(...args)=>deps.lotteryResultModal(...args);
    const bindLottery=(...args)=>deps.bindLottery(...args);
    const shareModal=(...args)=>deps.shareModal(...args);
    const showTitle=(...args)=>deps.showTitle(...args);
    const showJourneySelect=(...args)=>deps.showJourneySelect(...args);
    const begin=(...args)=>deps.begin(...args);
const transferIdentity=ServerSaveStore.create({storage:localStorage,getHost:()=>window.tap});
let comTab = 'p1';
const modalHistory=[];
let restoringParent=false;
const scrollSnapshot=()=>[...$('#modal').querySelectorAll('.modal-content,.col-body,.work-scroll,.recipe-list,.help-list')].map(e=>e.scrollTop);
function backModal() {
    if(deps.modal?.cfg?.requiredChoice)return;
    if(restoreCombatView()){modalHistory.length=0;return;}
    const previous=modalHistory.pop();
    if(!previous){closeModal();return;}
    restoringParent=true;
    try{showModal(previous.kind,previous.cfg);}finally{restoringParent=false;}
    $('#modal').querySelectorAll('.modal-content,.col-body,.work-scroll,.recipe-list,.help-list').forEach((e,i)=>{e.scrollTop=previous.scroll[i] || 0;});
  }


function brokenWeaponRows() {
    if (!S().furniture.grindstone || S().scene!=='camp') return '';
    const ids=Object.keys(S().weaponNames||{}).filter(id=>Game.invCount(id)>0&&ITEMS[id]&&ITEMS[id].cat==='weapon'&&id!=='divineBow'&&Game.durOf(id)===0);
    return ids.map(id=>{ const cost=Game.repairMatOf(id); return cost?`<div class="recipe-row"><b>${esc(Game.wNameOf(id))} · 已损坏</b><span class="rcost">修复到上限 · ${ITEMS[cost[0]].name}×${cost[1]}</span><button class="mini-btn" data-repair-broken="${id}">修复</button></div>`:''; }).join('');
  }

function prepareMerchant(root) {
      // 交易数据与按钮保持原有绑定；仅将同一货架的相邻行编排成双列卡片。
      root.querySelectorAll('.trade-grid,.merchant-goods .help-item').forEach(row=>{
        if (!row.querySelector('button')) { if(row.classList.contains('trade-grid')) row.classList.add('trade-heading'); return; }
        let grid=row.previousElementSibling;
        if (!grid || !grid.classList.contains('trade-cards')) { grid=document.createElement('div'); grid.className='trade-cards'; row.before(grid); }
        grid.appendChild(row); row.classList.add('trade-card');
        const button=row.querySelector('button');row.dataset.viewKey=[...button.attributes].filter(a=>a.name.startsWith('data-')&&!['data-reason','data-count','data-qty'].includes(a.name)).map(a=>a.name+'='+a.value).join('|');
      });
  }

function showModal(kind, cfg) {
    if(kind==='loot')kind='inv';
    if(restoreCombatView())return;
    const m = $('#modal');
    const openedNow = Date.now();   // 记下"刚打开"的时刻，配合防点击穿透（见文件末尾的捕获监听）
    const wasOpen = m.classList.contains('open');
    const samePanel = wasOpen && deps.modal && deps.modal.kind === kind;
    if(!wasOpen)modalHistory.length=0;
    if(wasOpen && deps.modal && !samePanel && !restoringParent){
      const ancestor=modalHistory.findIndex(p=>p.kind===kind);
      const siblings=['inv','warehouse','equip','craft'];
      if(ancestor>=0)modalHistory.splice(ancestor);
      else if(!(siblings.includes(kind) && siblings.includes(deps.modal.kind)))modalHistory.push({...deps.modal,scroll:scrollSnapshot()});
    }
    if(!samePanel)deps.modalOpenedAt=openedNow;
    const previousCategory=m.dataset.category || '';
    const category=kind==='warehouse'?deps.warehouseCat:kind==='craft'?deps.craftTab:kind==='inv'?deps.invCat:kind==='equip'?deps.equipTab:'';
    m.dataset.category = category;
    clearTimeout(deps.lotteryTimer); deps.lotteryTimer=null;
    if(!samePanel)deps.panels.get(deps.modal?.kind).dispose?.();
    deps.modal = { kind, cfg };
    if(kind==='lootExpiry'){deps.lootExpiryQueued=false;cfg.onShown?.();}
    if(kind==='diary' || kind==='collection')Game.markNoticeRead(kind,deps.colTab);
    if(kind==='mailbox' && deps.mailTab==='event')Game.markNoticeRead('event');
    maybeBatchTip(kind);
    // 开管理面板 → 冻结时间；并重绘一次顶栏，让时间前的 ⏸ 标记立刻出现（否则要等下次渲染才看得到）
    if (Game.setTimeFreeze) {
      const wasFrozen = Game.timeFrozen && Game.timeFrozen();
      Game.setTimeFreeze(!!deps.panels.get(kind).freeze);
      if (wasFrozen !== Game.timeFrozen() && document.getElementById('top-time')) render();
    }
    let html = '';
    if(deps.panels.get(kind).render)html=deps.panels.get(kind).render(cfg);
    else if (kind === 'camp') html = campModal(cfg?.building);
    else if (kind === 'livestock') html = livestockModal(cfg);
    else if (kind === 'camphelp') html = renderCampHelp((cfg && cfg.mode) || 'build');
    else if (kind === 'craft') html = renderCraft();
    else if (kind === 'warehouse') html=warehouseModal();
    else if (kind === 'cellar') html=renderInventory('cellar');
    else if (kind === 'cellarDeposit') html='<div class="modal-title">存入地窖</div><p>选择随身食物或饮品，长按可批量存入。</p><div class="inv-grid">'+Object.keys(S().inv).filter(id=>['food','drink'].includes(ITEMS[id]?.cat)).map(id=>'<button class="inv-item" data-cellar-store="'+id+'">'+itemIcon(id)+'<span>'+esc(ITEMS[id].name)+'</span><b>×'+Game.invCount(id)+'</b></button>').join('')+'</div>';
    else if (kind === 'transferHelp')html='<div class="modal-title">仓库存取</div><p>轻点物品：向对面存入或取出1份。</p><p>长按物品，继续左右拖动选择数量，松开后确认批量存取。</p><div class="modal-actions"><button data-warehouse-open>返回仓库</button></div>';
    else if (kind === 'bookFocus') html='<div class="modal-title">书架 · 集中</div><p>选择一个集中方向。每次获得对应经验时，有50%概率获得双倍经验；可随时切换。</p><div class="focus-options">'+[['craft','制造集中'],['gather','采集集中'],['combat','战斗集中']].map(([id,name])=>'<button data-book-focus="'+id+'" class="'+(S().bookFocus===id?'active':'')+'">'+name+(S().bookFocus===id?' · 已选择':'')+'</button>').join('')+'</div>';
    else if (kind === 'inv') html = renderInventory();
    else if (kind === 'laochao') html = laochaoModal();
    else if (kind === 'guide') html = guideModal();
    else if (kind === 'share') html = shareModal();
    else if (kind === 'mailbox') html = mailboxModal();
    else if (kind === 'adshop') html = adShopModal();
    else if (kind === 'shopExchange') html = deps.shopExchangeModal();
    else if (kind === 'naming') html = `<div class="modal-title">为武器命名 <span style="font-size:11px">${Game.S().weaponNames && Game.S().weaponNames[Game.S().equipment.weapon] ? '已命名' : '消耗 1 命名牌 · 伤害永久+1 · 最多8字'}</span></div><div class="overlay-text">你的主手武器：${Game.S().equipment.weapon ? `「${Game.wNameOf(Game.S().equipment.weapon)}」` : '未装备'}</div><div class="batch-row"><span>名字</span><input id="name-input" style="flex:1" maxlength="8" placeholder="输入武器名"></div><div class="modal-actions"><button id="name-do">确 定</button><button id="modal-close">取 消</button></div>`;
    else if (kind === 'grind') {
      // 修补材料按当前主手武器实时显示；神弓不提供修补入口。
      const w0 = Game.S().equipment.weapon;
      const rm = (w0 && DURA[w0] !== undefined) ? Game.repairMatOf(w0) : null;
      const rmTxt = (rm && ITEMS[rm[0]]) ? `${ITEMS[rm[0]].name}×${rm[1]}` : '不可修复';
      html = `<div class="modal-title">磨刀石 <span style="font-size:11px">${Game.S().furniture.grindstone ? '· 只作用于当前主手武器' : '· 需先建造磨刀石家具'}</span></div><div class="overlay-text">${Game.S().furniture.grindstone ? `<b>作用于当前主手武器</b>：<br>磨刀：+3攻击 · 20%流血 · 持续3场（耗 燧石×1）<br>${w0 === 'divineBow' ? '神弓不可修复，耐久耗尽后仅作收藏' : `修补：耐久恢复满（耗 ${rmTxt}）`}<br>命名：武器伤害永久+1（耗 命名牌×1）` : '请先在营地·家具建造「磨刀石」石台（石头×4+燧石×1）。'}</div><div class="modal-actions"><button data-grind="sharpen">磨 刀</button>${w0 === 'divineBow' ? '' : '<button data-grind="repair">修 补</button>'}<button data-grind="name">命 名</button><button id="modal-close">关 闭</button></div>`;
    }
    else if (kind === 'town') html = townModal();
    else if (kind === 'black') html = blackModal();
    else if (kind === 'mission') html = missionModal();
    else if (kind === 'info') html = infoModal();
    else if (kind === 'farm') html = farmModal();
    else if (kind === 'diary') html = diaryModal();
    else if (kind === 'collection') html = collectionModal();
    else if (kind === 'itemInfo') html = itemInfoModal(cfg && cfg.id);
    else if (kind === 'nightmareInfusion') {
      const ids=['nightmareSoul','nightmareSoul2','nightmareSoul3'],selected=ids.includes(cfg?.soul)?cfg.soul:ids[0],used=(S().nightmareInfusions?.[selected] || []).length,ready=used<2&&Game.invCount(selected)>=30;
      const emblems={hard:'<path d="M50 8 83 27 77 69 50 92 23 69 17 27Z M50 18 50 80 M28 32 72 32 M28 32 50 55 72 32"/>',blade:'<path d="M70 8 65 42 38 70 30 62 58 35Z M22 54 46 78 M33 67 18 82 M14 78 23 87"/>',agile:'<path d="M15 62Q55 4 84 31Q47 24 23 78 M27 57Q65 38 85 52Q51 49 30 75 M36 68Q67 63 76 75Q49 67 38 84"/>'};
      html=`<div class="infusion-sanctum"><small class="infusion-warning">此类选择不可撤回。</small><h2>迷茫的人啊，你想成为什么？</h2><div class="infusion-tiers">${ids.map(id=>`<button data-infusion-tier="${id}" class="${id===selected?'active':''}">${ITEMS[id].name} · ${Game.invCount(id)}份 · ${Math.min(2,(S().nightmareInfusions?.[id] || []).length)}/2</button>`).join('')}</div><p class="infusion-cost">献上30份${ITEMS[selected].name}</p><div class="infusion-choices">${[['hard','坚硬','UNYIELDING'],['blade','利刃','BLADE'],['agile','灵活','AGILE']].map(([id,cn,en])=>`<button class="infusion-choice infusion-${id}" data-infuse="${id}" data-soul="${selected}" ${ready?'':'disabled'}><svg viewBox="0 0 100 100" aria-hidden="true">${emblems[id]}</svg><b>${cn}</b><span>${en}</span></button>`).join('')}</div><p role="status">${used>=2?'此阶魂魄的选择已经完成。':!ready?'同阶魂魄不足。':'选择之后，命运将不再回头。'}</p></div>`;
    }
    else if(kind==='separator') html=`<div class="modal-title">解魂器 ${inlineHelp('一阶只产初等物资；二阶1%、三阶2%产高等物资。秘银仅三阶掉落，总概率0.05%。每份独立20%获得1魂点、3%获得1星之点。')}</div><div class="soul-separator"><img src="assets/img/build/soulSeparator.png" alt="解魂器"><div>${['nightmareSoul','nightmareSoul2','nightmareSoul3'].map(id=>`<section><b>${ITEMS[id].name} · ${Game.invCount(id)}份</b><div class="modal-actions">${[1,10,100].map(n=>`<button data-separate="${n}" data-soul-id="${id}" ${Game.invCount(id)<n?'disabled':''}>分解${n}份</button>`).join('')}</div></section>`).join('')}<div id="separate-result" role="status"></div></div></div>`;
    else if (kind === 'autoHelp')html='<div class="modal-title">自动存入</div><p>选择需要自动存入的消耗品与材料，保存后在回到对应营地时自动搬到当地仓库。装备、武器和图纸不在自动存入列表中。</p><p>仓库装不下的部分会留在背包；海底仓库与岛上仓库分别存放。</p><p>“保存并立即存入”会立即按当前选择存放，普通“保存”只修改设置。</p><div class="modal-actions"><button data-warehouse-open>返回仓库</button></div>';
    else if (kind === 'warehouseAuto') {const selected=Game.warehouseAutoItems(),ids=[...new Set([...Object.keys(S().inv),...Object.keys(Game.warehouseState().inv),...selected])].filter(Game.warehouseAutoEligible);html='<div class="modal-title">自动存入</div><p class="hint">回到对应营地时存入所选消耗品和材料。仓库满时保留在背包。</p><div class="warehouse-auto-grid">'+ids.map(id=>`<label><input type="checkbox" data-auto-item="${id}" ${selected.includes(id)?'checked':''}>${itemIcon(id)}${esc(ITEMS[id].name)}</label>`).join('')+'</div><div class="modal-actions"><button data-save-warehouse-auto>保存</button><button data-save-warehouse-auto data-store-now>保存并立即存入</button><button data-warehouse-open>返回仓库</button></div>';}

    else if (kind === 'lottery') html = lotteryModal();
    else if (kind === 'lotteryPick') html = lotteryPickModal();
    else if (kind === 'lotteryPool') html = lotteryPoolModal();
    else if (kind === 'lotteryResult') html = lotteryResultModal(cfg);
    else if (kind === 'rune') html = renderRuneModal();
    else if (kind === 'atlTrade') html = atlTradeModal();
    else if (kind === 'fishman') html = fishmanModal();
    else if (kind === 'repair') html = repairModal();
    else if (kind === 'savemenu') html = `<div class="modal-title">菜单</div><div class="modal-actions save-menu"><button data-savemenu="guide">📖 攻略${deps.guideBadge()}</button><button data-savemenu="mail">✉ 邮箱${NoticeBadges.dot('mailbox')} ${Game.mailboxCount() || ''}</button><button data-savemenu="adshop">◇ 商城${NoticeBadges.dot('adshop')}</button><button data-savemenu="sign">📅 每日签到${NoticeBadges.dot('sign')}</button><button data-savemenu="diary" ${!S()?'disabled':''}>📖 日记${NoticeBadges.dot('diary')}</button><button data-savemenu="col">📜 图鉴${NoticeBadges.dot('collection')}</button><button data-savemenu="settings">⚙ 设置</button><button data-savemenu="save" ${!S()?'disabled':''}>💾 保存进度</button><button data-savemenu="backup">📦 备份·读档</button><button data-savemenu="title" ${!S()?'disabled':''}>🏠 回到主菜单</button></div>`;
    else if (kind === 'settings') html = settingsModal();
    else if (kind === 'sleeppick') html = sleepModal();
    else if (kind === 'heirloom') html = renderHeirloom();
    else if (kind === 'equip') html = renderEquip();
    else if (kind === 'equipPick') html = equipmentPickModal(cfg);
    else if (kind === 'backup') html = renderBackup();
    else if (kind === 'rescue') html = rescueModal();
    else if (kind === 'skill') html = skillModal();
    else if (kind === 'skilltree') html = skillTreeModal(cfg && cfg.kind);
    else if (kind === 'batch') html = batchModal(cfg);
    else if (kind === 'batchn') html = batchnModal(cfg);
    else if (kind === 'comhelp') html = comHelpModal();
    else if (kind === 'crafthelp') html = `<div class="modal-title">制造说明</div><div class="overlay-text">· 制造工坊在营地里，回营地才能使用。<br>· 点配方 = 制作1个。<br>· <b>长按配方按钮</b> 弹出批量条，拖动数量从1到「当前材料最多可做数量」，一次做完多个。<br>· 批量时按数量×单个耗时（造越多耗时越长），经验也×N。<br>· <b>晾肉架例外</b>：它要挂上去等晾透，一副架子一次只能挂一批（肉×2），晾好取下来才能挂下一批。<br>· 火堆·烹饪，以及各工坊（工作台/熔炉/烟熏炉/灶台/晾肉架/制革架/纺车…）按你建了哪些来。</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
    else if (kind === 'buybp') html = `<div class="modal-title">购买备份点</div><div class="overlay-text">是否用 20 魂点购买一个备份点？</div><div class="modal-actions"><button data-buybp-yes="1">是</button><button data-buybp-no="1">否</button></div>`;
    else if (kind === 'buyslot') html = `<div class="modal-title">解锁第四存档位</div><div class="overlay-text">支付 100 魂点，永久解锁一个新的备份槽。购买后可消耗备份点向槽内备份。</div><div class="modal-actions"><button data-buyslot-yes="1">确认解锁</button><button data-buyslot-no="1">取消</button></div>`;
    else if (kind === 'codex') {
      const mobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)||matchMedia('(pointer:coarse)').matches;
      html = cfg && cfg.mode === 'export'
        ? `<div class="modal-title">临时取件码</div><div class="overlay-text">8位字母和数字，10分钟有效；每账号每小时最多生成3次。</div>
           <input id="codex-text" readonly aria-label="临时取件码" placeholder="点击生成取件码" style="width:100%;padding:10px;box-sizing:border-box;background:var(--paper);color:var(--ink);border:2px solid var(--ink);font-size:18px;text-align:center">
           <div class="batch-hint" id="transfer-status" role="status">${esc(backupSummary(Game.inspectCode(cfg.code || '')))}</div><div class="modal-actions"><button id="codex-generate">生成取件码</button><button id="codex-copy" disabled>复制取件码</button>${mobile?'':'<button id="codex-download">保存备份文件</button>'}<button id="modal-close">关 闭</button></div>`
        : `<div class="modal-title">导入存档</div><div class="overlay-text">输入8位取件码，预览后确认导入。</div>
           <input id="codex-text" aria-label="取件码" maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="8位字母和数字" style="width:100%;font-size:20px;letter-spacing:3px;padding:10px;box-sizing:border-box;background:var(--paper);color:var(--ink);border:2px solid var(--ink)">
           <div class="batch-hint" id="codex-preview" aria-live="polite">请先输入取件码</div>${mobile?'':'<input id="codex-file" type="file" accept=".txt,text/plain" hidden>'}<div class="modal-actions">${mobile?'':'<button id="codex-file-pick">选择备份文件</button><button id="codex-current-backup">备份当前进度</button>'}<button id="codex-do">预览并导入</button><button id="modal-close">取 消</button></div>`;
    }
    else if (kind === 'devpw') html = devpwModal();
    else if (kind === 'daily') html = dailyReportModal();
    else if (kind === 'winter') html = winterModal();
    else if (kind === 'sign') html = signModal();
    else if (kind === 'buffInfo') html = buffInfoModal(cfg);
    else if (kind === 'overlay' || kind === 'lootExpiry') {
      html = `<div class="modal-title">${esc(cfg.title || '')}</div><div class="overlay-text">${esc(cfg.text || '').replace(/\n/g, '<br>')}</div><div class="modal-actions">${(cfg.choices || []).map((c, i) => `<button data-choice="${i}"${c.danger?' class="discard-danger"':''}><span class="choice-label">${esc(c.label)}</span>${c.hint ? `<span class="choice-hint">${esc(c.hint)}</span>` : ''}</button>`).join('')}</div>`;
    }
    else if (kind === 'medpick') {
      const leftNow = Math.max(0, 2 - ((Game.S().combat && Game.S().combat.usedItems) || 0));
      html = `<div class="modal-title">使用道具 <span style="font-size:11px">本场还能用 ${leftNow} 次</span></div><div class="modal-actions">${cfg.meds.map(md => `<button data-med-id="${md}">${ITEMS[md].glyph} ${ITEMS[md].name}（有${Game.invCount(md)}）</button>`).join('')}<button id="modal-back">返 回</button></div>`;
    }
    if(kind==='grind') html += brokenWeaponRows();
    const merchantId = kind==='town' ? deps.townShopNow : ({laochao:'laochao',black:'black',fishman:'fishman',atlTrade:'atlTrade',info:'informant'})[kind];
    if (merchantId && MERCHANTS[merchantId]) {
      const changed=deps.activeMerchant!==merchantId;
      if(changed) { deps.activeMerchant=merchantId; deps.merchantLine=0; deps.merchantTrades=0; AudioFX.playVoice(merchantId,0); }
      const person=MERCHANTS[merchantId], col=person.cell%3, row=Math.floor(person.cell/3);
      html=`<div class="merchant-layout"><aside class="merchant-person"><div class="merchant-portrait${skinOn('seasons')?' art-colored':''}" style="background-position:${col*50}% ${row*50}%" role="button" tabindex="0" data-voice="${merchantId}" aria-label="听${esc(person.name)}说话"></div><b>${esc(person.name)}</b><p id="merchant-line" aria-live="polite">${esc(person.lines[deps.merchantLine])}</p></aside><section class="merchant-goods">${html}</section></div>`;
    } else if (kind!=='batchn' && kind!=='overlay') { deps.activeMerchant=null; AudioFX.stopVoice(); }
    const workPanel = !!deps.panels.get(kind).work;
    m.classList.toggle('work-open', workPanel);
    // winter-modal 这个类只用来给「冬季来临」在横屏手机上压紧排版（见 css/ui-polish.css）：
    // 4 条提醒 + 两个按钮要塞进 375px 高，默认的 .help-item 内边距会让第 4 条藏进内滚动里。
    const panelMarkup = `<div class="modal-content${workPanel ? ' work-modal' : ''}${kind==='overlay' && (cfg?.compact || (cfg?.text?.length<160 && cfg?.choices?.length<=2))?' compact-prompt':''}${['inv','warehouse','cellar'].includes(kind)?' inventory-modal':''}${kind==='warehouse'?' warehouse-dual-modal':''}${['inv','equip','craft'].includes(kind)?' player-panel-modal':''}${merchantId ? ' merchant-modal' : ''}${['lottery','lotteryPick','lotteryPool','lotteryResult'].includes(kind) ? ' lottery-modal' : ''}${kind === 'equipPick' ? ' equipment-pick-modal' : ''}${kind === 'settings' ? ' set-wide' : ''}${kind === 'nightmareInfusion' ? ' infusion-modal' : ''}${kind === 'adshop' ? ' cabinet-modal' : ''}${kind === 'winter' ? ' winter-modal' : ''}${kind === 'guide' ? ' guide-modal' : ''}${kind === 'collection' ? ' collection-modal' : ''}" role="dialog" aria-modal="true">${html}</div>`;
    // 关闭按钮属于面板外壳，必须在比较之前加入，避免每次重建。
    const withClose=(!cfg || !cfg.requiredChoice)?panelMarkup.replace('aria-modal="true">','aria-modal="true"><button class="modal-x" aria-label="关闭">×</button>'):panelMarkup;
    if(samePanel)deps.dom.html(m,withClose,merchantId?prepareMerchant:undefined);
    else {deps.dom.dispose(m);m.innerHTML=withClose;if(merchantId)prepareMerchant(m);}
    const mcx = m.querySelector('.modal-content');
    // A transfer updates this open window; it must not replay the opening animation.

    if (merchantId) {
      m.querySelectorAll('.merchant-portrait[data-voice]').forEach(b=>b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();b.click();}});
    m.querySelectorAll('[data-voice]').forEach(b=>b.onclick=()=>AudioFX.playVoice(b.dataset.voice,deps.merchantLine));
    }
    if (!cfg || !cfg.requiredChoice) {
      mcx.querySelector('.modal-x').onclick = backModal;
      mcx.querySelector('.modal-x').setAttribute('aria-label',modalHistory.length?'返回上一级':'关闭');
    }
    m.classList.add('open'); document.body.classList.add('modal-open');
    if(samePanel && previousCategory!==category)m.querySelectorAll('.work-scroll').forEach(node=>{node.scrollTop=0;});
    if (kind === 'rune') bindRune();
    if (kind === 'winter') {
      // 「去河畔采雪」：顺手把玩家送到河畔（能不能去由 travel 自己判，失败会 toast 说明原因）
      const wg = m.querySelector('#winter-go');
      if (wg) wg.onclick = () => { closeModal(); Game.travel('river'); };
    }
    if(kind==='guide' || (kind==='mailbox' && deps.mailTab==='guide')) deps.markGuideRead();
    bindModal(kind, cfg);
    NoticeBadges.refresh();
  }

function bindModal(kind, cfg) {
    const m = $('#modal');deps.panels.get(kind).bind?.(m,cfg);
    const watch=m.querySelector('#watch-reward-ad');
    if(watch)watch.onclick=()=>{
      const info=Game.adRewardState(),run=S()?._runId;
      if(!info.canClaim){centerToast(info.reason);return;}
      watchAd(()=>Game.claimAdReward(run,info.today),r=>{showModal('adshop');centerToast(r.ok?`获得 ${r.amount} ${Game.adCurrencyName()}。`:r.reason);});
    };
    m.querySelectorAll('[data-adbuy]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.adbuy,goods=Game.adShopState().goods.find(g=>g.id===id);if(!goods)return;
      showModal('overlay',{title:'确认购买',text:`${(ITEMS[id]||RELICS[id]).name} · ${goods.cost} ${Game.adCurrencyName()}\n是否确认购买？`,choices:[
        {label:'确认购买',ok:()=>{const r=Game.buyAdShop(id);showModal('adshop');centerToast(r.msg||r.reason);}},
        {label:'取消',ok:()=>showModal('adshop')}
      ]});
    });
    const gift=m.querySelector('[data-shop-gift]');if(gift)gift.onclick=()=>{if(gift.disabled)return;gift.disabled=true;const r=Game.claimDailyGift();showModal('adshop');centerToast(r.msg||r.reason);};
    m.querySelectorAll('[data-shop-exchange]').forEach(b=>b.onclick=()=>showModal('shopExchange'));
    m.querySelectorAll('[data-adexchange]').forEach(b=>b.onclick=()=>{const r=Game.exchangeAdCoins(Number(m.querySelector('#star-exchange-qty').value));centerToast(r.msg || r.reason);showModal('adshop');});
    m.querySelectorAll('[data-soulexchange]').forEach(b=>b.onclick=()=>{const r=Game.exchangeSoulForStars(Number(m.querySelector('#star-exchange-qty').value));centerToast(r.msg || r.reason);showModal('adshop');});
    m.querySelectorAll('#modal-close').forEach(b => b.onclick = backModal);
    m.querySelectorAll('#modal-back').forEach(b => b.onclick = () => { if (kind === 'medpick') renderCombat('start', Game.S().combat); else backModal(); });
    m.querySelectorAll('[data-player-panel]').forEach(b=>b.onclick=()=>{if(b.dataset.playerPanel==='equip')deps.equipTab='p1';showModal(b.dataset.playerPanel);});
    m.querySelectorAll('[data-building-detail]').forEach(b=>b.onclick=()=>showModal('camp',{building:b.dataset.buildingDetail}));
    m.querySelectorAll('[data-camp-back]').forEach(b=>b.onclick=()=>showModal('camp'));
    m.querySelectorAll('[data-chain]').forEach(b => b.onclick = () => { if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; } withAnimation('build', '建造', () => { const previous = deps.modal; Game.buildChain(b.dataset.chain); if (deps.modal === previous && !S().death) showModal('camp'); }); });
    m.querySelectorAll('[data-fid]').forEach(b => b.onclick = () => {
      if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; }
      const fid = b.dataset.fid;
      const f = FURNITURE.find(x => x.id === fid) || {};
      const si = Game.furnSlotInfo(fid);
      const fromFarm = (deps.modal && deps.modal.kind) === 'farm';
      const doBuild = () => withAnimation('build', '打造家具', () => { const previous = deps.modal; Game.buildFurniture(fid); if (deps.modal === previous && !S().death) showModal(fromFarm ? 'farm' : 'camp'); });
      // 作者 2026-09-23："最大的坑是家具限制，新手一般注意不到，如果制作家具前加一个弹窗提示……就会好很多"
      // 只有**会占位**的家具才问；不占位的（旗帜/书架/水壶/升级替换…）直接造，别拿废话拦人。
      if (!si.takes) { doBuild(); return; }
      showModal('overlay', {
        title: '确认打造',
        compact: true,
        text: `打造「${f.name}」占1格家具位：${si.used}/${si.cap} → ${si.used+1}/${si.cap}。`,
        choices: [
          { label: '继续打造', hint: `占用 1 格（还剩 ${Math.max(0,si.left-1)} 格）`, ok: () => doBuild() },
          { label: '取消', hint: '回到营地', ok: () => showModal('camp') },
        ],
      });
    });
    m.querySelectorAll('[data-live]').forEach(b => b.onclick = () => { showModal('livestock', { kind: b.dataset.live }); });
    m.querySelectorAll('[data-livefeed]').forEach(b => b.onclick = () => { Game.toggleAutoFeed(); showModal('livestock', deps.modal && deps.modal.cfg); });
    m.querySelectorAll('[data-liveadd]').forEach(b => b.onclick = () => { const r = Game.addChick(); if (!r.ok) addLog(r.reason, 'warn'); showModal('livestock', deps.modal && deps.modal.cfg); });
    m.querySelectorAll('[data-hsext]').forEach(b => b.onclick = () => { if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; } const r = Game.buildHouseExt(); if (!r.ok) addLog(r.reason, 'warn'); showModal('camp'); });
    m.querySelectorAll('[data-coopext]').forEach(b => b.onclick = () => { if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; } const r = Game.buildCoopExt(); if (!r.ok) addLog(r.reason, 'warn'); showModal('coop'); });
    m.querySelectorAll('[data-stext]').forEach(b => b.onclick = () => { if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; } const r = Game.buildStoreExt(); if (!r.ok) addLog(r.reason, 'warn'); showModal('camp'); });
    m.querySelectorAll('[data-afid]').forEach(b => b.onclick = () => { if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; } const r = Game.buildAtlantisFurniture(b.dataset.afid); if (!r.ok) addLog(r.reason, 'warn'); showModal('camp'); });
    m.querySelectorAll('[data-asell]').forEach(b => { const id = b.dataset.asell; const doTap = () => { Game.sellToMerchant(id, 1, deps.ATL_SHOP, false); showModal('atlTrade'); }; const doLong = () => showModal('batchn', { kind:'sell', item:id, list:'ATL' }); b.onclick = null; bindPress(b, doTap, doLong); });
    m.querySelectorAll('[data-rfix]').forEach(b => b.onclick = () => { const k = b.dataset.rfix; if (k.startsWith('dive:')) { const r = Game.repairDive(k.slice(5)); if (!r.ok) addLog(r.reason, 'warn'); } else if (k === 'pistol') { Game.repairPistol(); } else { Game.fixBrokenPistol(); } showModal('repair'); });
    m.querySelectorAll('[data-fishman]').forEach(b => b.onclick = () => { const r = Game.fishmanBarter(b.dataset.fishman); if (!r.ok) { addLog(r.reason, 'warn'); centerToast(r.reason); } else { deps.merchantLine=1+Math.floor(Math.random()*2); AudioFX.play('trade'); AudioFX.playVoice('fishman',deps.merchantLine); } showModal('fishman'); });
    m.querySelectorAll('[data-arelic]').forEach(b => b.onclick = () => { const r = Game.buyRelicFromVendor(); if (!r.ok) addLog(r.reason, 'warn'); showModal('atlTrade'); });
    m.querySelectorAll('[data-abuy]').forEach(b => { const entry = deps.ATL_BUY.find(e => e.id === b.dataset.abuy); const list = entry ? [entry] : []; const doTap = () => { Game.buyFromMerchant(b.dataset.abuy, 1, list, false); showModal('atlTrade'); }; const doLong = () => { const unit = Game.priceOf(entry ? entry.base : 0, false, b.dataset.abuy); const isBp = ITEMS[b.dataset.abuy].cat === 'bp'; const mx = isBp ? 1 : Math.max(1, Math.min(99, Math.floor(Game.invCount('beibi') / Math.max(1, unit)))); showModal('batchn', { kind:'buy', item:b.dataset.abuy, shop:'ATL', max:mx }); }; b.onclick = null; bindPress(b, doTap, doLong); });
    m.querySelectorAll('[data-help]').forEach(b => b.onclick = () => { showModal('camphelp', { mode: b.dataset.help }); });
    m.querySelectorAll('[data-invcat]').forEach(b=>b.onclick=()=>{if(b.dataset.invsource==='warehouse')deps.warehouseCat=b.dataset.invcat;else deps.invCat=b.dataset.invcat;showModal(deps.modal?.kind==='warehouse'?'warehouse':'inv');});
    m.querySelectorAll('[data-auto-help]').forEach(b=>b.onclick=()=>showModal('autoHelp'));

    m.querySelectorAll('[data-invback]').forEach(b => b.onclick = () => showModal('inv'));
    m.querySelectorAll('[data-equip]').forEach(b => b.onclick = () => { const id = b.dataset.equip; const cat = ITEMS[id].cat; const idx = b.dataset.idx !== undefined ? +b.dataset.idx : undefined; if(b.dataset.targetSlot){const r=Game.equipToSlot(id,b.dataset.targetSlot,idx);if(!r.ok)centerToast(r.reason);showModal('equip');return;} if (cat === 'weapon') { const eq = S().equipment; const ei = S().equipIdx||{}; const SL = ['weapon','weapon2','armor','cloth','accessory']; const slotWith = idx !== undefined ? SL.find(s => eq[s]===id && ei[s]===idx) : SL.find(s => eq[s]===id); if (slotWith) Game.unequip(id, idx); else Game.equip(id, idx); } else { const eq = S().equipment; const on = (eq.weapon===id||eq.weapon2===id||eq.armor===id||eq.cloth===id||eq.accessory===id); if (on) Game.unequip(id); else Game.equip(id, idx); } rerenderEquip(); });
    m.querySelectorAll('[data-unlockslot]').forEach(b => b.onclick = () => { const r = Game.unlockRelicSlot(); if (!r.ok) addLog(r.reason, 'warn'); showModal('equip'); });
    m.querySelectorAll('[data-unequip]').forEach(b => b.onclick = () => { Game.unequipRelic(b.dataset.unequip); showModal('equip'); });
    m.querySelectorAll('[data-equiprelic]').forEach(b => {const equip=()=>{const r=Game.equipRelic(b.dataset.equiprelic);if(!r.ok)addLog(r.reason,'warn');rerenderEquip();};if(b.hasAttribute('data-satchel-settings')){b.onclick=null;bindPress(b,equip,()=>showModal('satchelSettings'));}else b.onclick=equip;});
    m.querySelectorAll('[data-toolslot]').forEach(b => b.onclick = () => { const tk = (Game.S().toolkit || []); const id = tk[+b.dataset.toolslot]; if (id) { Game.unequipTool(id); showModal('equip'); } });
    m.querySelectorAll('[data-equiptool]').forEach(b => b.onclick = () => { const r = Game.equipTool(b.dataset.equiptool); if (!r.ok) addLog(r.reason, 'warn'); rerenderEquip(); });
    m.querySelectorAll('[data-unequiptool]').forEach(b => b.onclick = () => { const r = Game.unequipTool(b.dataset.unequiptool); if (!r.ok) centerToast(r.reason); showModal('equip'); });
    m.querySelectorAll('[data-emptyslot]').forEach(b => b.onclick = () => addLog('请从下方已拥有的神物中点击装备。', 'warn'));
    // 食之包：三个分类各自最多选择三种，点击即保存。
    m.querySelectorAll('[data-bk]').forEach(b => b.onclick = () => {
      const r = Game.backupSlot(+b.dataset.bk);
      if (r.ok) {
        const cs = Game.cloudStatus();   // 备份也会顺带排一次云同步
        addLog(`已备份到备份槽 ${+b.dataset.bk + 1}（第 ${r.day} 天）。` + (cs.supported ? `云存档：${cs.msg}` : '（这台设备没有云存档，备份存在本机）'), 'good');
        centerToast(`已备份到槽 ${+b.dataset.bk + 1}`);
      } else { addLog(r.reason, 'warn'); centerToast(r.reason); }
      showModal('backup');
    });
    m.querySelectorAll('[data-delslot]').forEach(b => b.onclick = () => { const r = Game.delSlot(+b.dataset.delslot); addLog(r.ok ? `已删除备份槽 ${+b.dataset.delslot + 1}。` : r.reason, r.ok ? 'good' : 'warn'); centerToast(r.ok ? `已删除槽 ${+b.dataset.delslot + 1}` : r.reason); showModal('backup'); });
    // 救援：扫描本机所有存档痕迹 → 挑一份恢复
    m.querySelectorAll('[data-rescue="scan"]').forEach(b => b.onclick = () => showModal('rescue'));
    m.querySelectorAll('[data-rescue-go]').forEach(b => b.onclick = () => {
      const src = b.dataset.rescueGo;
      askConfirm('恢复这一份会替换掉当前这一局（当前这份会先自动滚进"上一次保存"里，还能再退回来）。确定吗？', () => {
        const r = Game.restoreLocalSave(src);
        if (!r.ok) { addLog('【救援】' + r.reason, 'warn'); centerToast(r.reason); return; }
        addLog(`【救援】已恢复到第 ${r.day} 天（来源：${src}）。`, 'good');
        centerToast(`已恢复到第 ${r.day} 天`);
        closeModal();
        if (document.querySelector('#title-screen')) showTitle(); else begin();
      }, '恢复这一份');
    });
    m.querySelectorAll('[data-ld]').forEach(b => b.onclick = () => {
      // 「从此继续」= 用备份槽这份覆盖当前这一局，先说清再动
      const cur = S();
      const doLoad = () => {
        const r = Game.loadSlot(+b.dataset.ld);
        if (r.ok) { closeModal(); begin(); } else addLog(r.reason, 'warn');
      };
      if (cur && cur.day > 1) {
        askConfirm(`「从此继续」会用这份备份覆盖你当前这一局（第 ${cur.day} 天）。确定吗？`, doLoad, '从这份继续');
        return;
      }
      doLoad();
    });
    m.querySelectorAll('[data-buybp]').forEach(b => b.onclick = () => { const r = Game.buyBackupPoint(); if (r.ok) { addLog('购买了 1 个备份点。', 'good'); } else addLog(r.reason, 'warn'); showModal('backup'); });
    m.querySelectorAll('[data-codex]').forEach(b => b.onclick = () => showModal('codex', { mode: b.dataset.codex, code: b.dataset.codex === 'export' ? Game.exportCode() : '' }));
    const transfer=TemporarySaveTransfer.create({owner:()=>Game.transferOwner(),authorize:force=>transferIdentity.authorize(force),send:(url,data)=>RedeemTransport.send(window,url,data,{timeoutMs:12000}),inspect:code=>Game.inspectCode(code)});
    const ccopy = m.querySelector('#codex-copy'); if (ccopy) ccopy.onclick = () => { const t = m.querySelector('#codex-text'); try { t.select(); if(!document.execCommand('copy'))throw Error('copy');centerToast('已复制取件码，请在10分钟内使用。'); } catch (e) { centerToast('复制失败，请长按文本框手动复制'); } };
    const cd=m.querySelector('#codex-download');if(cd)cd.onclick=()=>downloadBackup(cfg.code||Game.exportCode());
    const cb=m.querySelector('#codex-current-backup');if(cb)cb.onclick=()=>downloadBackup(Game.exportCode());
    const codeText=m.querySelector('#codex-text'),preview=m.querySelector('#codex-preview');
    const generate=m.querySelector('#codex-generate');
    if(generate)generate.onclick=async()=>{
      const status=m.querySelector('#transfer-status');generate.disabled=true;status.textContent='正在生成……';
      try{const result=await transfer.upload(cfg.code||Game.exportCode());if(!codeText.isConnected)return;codeText.value=result.code;codeText.dataset.expires=String(result.expiresAt);ccopy.disabled=false;status.textContent='10分钟内有效，请只发给自己。';}
      catch(e){if(codeText.isConnected)status.textContent=e.message;}
      finally{if(generate.isConnected)generate.disabled=false;}
    };
    const updatePreview=()=>{if(preview){preview.textContent=codeText.dataset.fileBody?backupSummary(Game.inspectCode(codeText.dataset.fileBody)):TemporarySaveTransfer.isCode(codeText.value)?'点击「预览并导入」取档，确认后才会覆盖进度。':'请输入8位字母和数字取件码。';window.Locale?.apply();}};
    if(preview)codeText.onchange=updatePreview;
    if(preview)codeText.oninput=()=>{delete codeText.dataset.fileBody;updatePreview();};
    const file=m.querySelector('#codex-file');
    if(file){m.querySelector('#codex-file-pick').onclick=()=>{if(window.GuyuFileBackup?.open)window.GuyuFileBackup.open();else file.click();};file.onchange=async()=>{
      const picked=file.files?.[0];if(!picked)return;
      if(picked.size>20*1024*1024){centerToast('备份文件过大，请确认选择的是存档文本文件。');return;}
      try{const text=await picked.text();if(!codeText.isConnected)return;codeText.dataset.fileBody=text;codeText.value='';updatePreview();}catch(e){centerToast('无法读取文件，请重新选择或粘贴存档码。');}
    };}
    const cdo=m.querySelector('#codex-do');if(cdo)cdo.onclick=async()=>{
      if(cdo.disabled)return;cdo.disabled=true;
      const inputCode=codeText.value, fileBody=codeText.dataset.fileBody;
      let code=fileBody||inputCode;
      try{if(!fileBody){preview.textContent='正在取档……';code=await transfer.download(inputCode);}if(!codeText.isConnected)return;}
      catch(e){if(codeText.isConnected){preview.textContent=e.message;centerToast(e.message);}return;}
      finally{if(cdo.isConnected)cdo.disabled=false;}
      const info=Game.inspectCode(code);if(!info.ok){preview.textContent=info.reason;centerToast(info.reason);return;}
      showModal('overlay',{title:'确认导入备份',text:backupSummary(info)+'\n导入会覆盖对应进度。需要保留当前档时，请先备份。',choices:[
        {label:'确认导入',ok:()=>{const r=Game.importCode(code);if(!r.ok){showModal('codex',{mode:'import'});centerToast(r.reason);return;}centerToast(`导入成功：魂点 ${r.soul}、传世 ${r.runs} 世、备份槽 ${r.slots} 个`);if(r.currentGame)begin();else showModal('backup');}},
        {label:'返回',ok:()=>{showModal('codex',{mode:'import'});const t=document.querySelector('#codex-text');t.value=inputCode;if(fileBody)t.dataset.fileBody=fileBody;t.dispatchEvent(new Event('change'));}}
      ]});
    };
    m.querySelectorAll('[data-titlebuybp]').forEach(b => b.onclick = () => showModal('buybp'));
    m.querySelectorAll('[data-buybp-yes]').forEach(b => b.onclick = () => { const r = Game.buyBackupPoint(); addLog(r.ok ? '购买了 1 个备份点。' : r.reason, r.ok ? 'good' : 'warn'); closeModal(); if ($('#select-screen') && $('.select-title') && $('#select-screen .identity-list').children.length) showJourneySelect(); });
    m.querySelectorAll('[data-buybp-no]').forEach(b => b.onclick = closeModal);
    m.querySelectorAll('[data-buyslot]').forEach(b => b.onclick = () => showModal('buyslot'));
    m.querySelectorAll('[data-buyslot-yes]').forEach(b => b.onclick = () => {
      const r = Game.buyExtraSlot();
      centerToast(r.ok ? '第四存档位已解锁' : r.reason);
      if (r.ok) addLog('用 100 魂点解锁了第四存档位。', 'good');
      if ($('#select-screen')) { closeModal(); showJourneySelect(); } else showModal('backup');
    });
    m.querySelectorAll('[data-buyslot-no]').forEach(b => b.onclick = () => { if ($('#select-screen')) closeModal(); else showModal('backup'); });
    m.querySelectorAll('[data-collectrain]').forEach(b => b.onclick = () => { const r = Game.collectRainWater(); if (!r.ok) addLog(r.reason, 'warn'); showModal('camp'); });
    m.querySelectorAll('[data-collecthoney]').forEach(b => b.onclick = () => { const r = Game.collectHiveHoney(); if (!r.ok) addLog(r.reason, 'warn'); showModal('camp'); });
    m.querySelectorAll('[data-train]').forEach(b => b.onclick = () => { const r = Game.train(b.dataset.train); if (!r.ok && r.reason !== '等待确认') addLog(r.reason, 'warn'); else if (r.ok) showModal('camp'); });
    m.querySelectorAll('[data-demolish]').forEach(b => b.onclick = () => {
      const fid = b.dataset.demolish;
      const furn = FURNITURE.find(f => f.id === fid);
      askConfirm(`确定拆除${furn ? furn.name : '这件家具'}吗？只返还部分材料，拆除后无法撤销。`, () => { Game.demolishFurniture(fid); showModal('camp'); }, '确认拆除');
    });
    m.querySelectorAll('[data-savemenu]').forEach(b => b.onclick = async () => {
      const v = b.dataset.savemenu;
    if (v === 'save') {
      b.disabled=true;
      const saved=await Game.saveAndFlush();
      if(!saved.ok){b.disabled=false;centerToast(saved.reason==='other-tab'?'检测到另一处有更新进度，未覆盖。':saved.reason||'保存失败，请重试。');return;}
      const cs = Game.cloudStatus();                       // 保存 = 本地 + cookie + 尝试云同步（平台限制一分钟一次）
      addLog('已保存。' + (cs.supported ? `云存档：${cs.msg}` : '进度已保存在本机。'), 'sys');
      showModal('savemenu');
    }
    else if (v === 'sign') showModal('sign');
    else if (v === 'diary') showModal('diary');
      else if (v === 'col') showModal('collection');
      else if (v === 'skill') showModal('skill');
      else if (v === 'backup') showModal('backup');
      else if (v === 'settings') showModal('settings');
    else if (v === 'title') { b.disabled=true;const saved=await Game.saveAndFlush();if(!saved.ok){b.disabled=false;centerToast(saved.reason||'保存失败，请重试。');return;}closeModal(); showTitle(); }
    else if (v === 'guide') showModal('guide');
    else if (v === 'mail') {deps.mailTab='mail';showModal('mailbox');}
    else if (v === 'adshop') showModal('adshop');
    else closeModal();
  });
  // 每日签到：奖励从 Game.dailySignState() 获取（每天一次，账号级）
  m.querySelectorAll('[data-sign]').forEach(b => b.onclick = () => {
    const r = Game.dailySign();
    if (r.ok) {
      centerToast(`签到成功：魂点 +${r.soul} · 备份点 +${r.backup}`);
      addLog(`每日签到：魂点 +${r.soul}，备份点 +${r.backup}。`, 'good');
      try { AudioFX.play('good'); } catch (e) {}
    } else centerToast(r.reason || '今天已经签过了');
    showModal('sign');   // 重渲染，按钮变成"今天已领过"
  });
    // 设置面板里的「图鉴 · 每日签到」入口（标题页与游戏内共用这一块）
    m.querySelectorAll('[data-open]').forEach(b => b.onclick = () => {
      AudioFX.init();
      showModal(b.dataset.open === 'sign' ? 'sign' : 'collection');
    });
    // 设置面板
    m.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
      const v = b.dataset.set;
      const settingsScroll=m.querySelector('.help-list')?.scrollTop||0;
      AudioFX.init();
      // 声音三件套：现在是一行里的单按钮开关（点一下翻转）
      if (v === 'audio:music') AudioFX.toggle();
      else if (v === 'audio:sfx') AudioFX.toggleSfx();
      else if (v === 'audio:voice') AudioFX.toggleVoice();
      else if (v === 'audio:amb') AudioFX.toggleAmbient();
      // 「试听／停止首领曲」按钮已按作者 2026-09-25 要求删除。
      // ⚠️ 删的**只是这个试听入口**（和 previewBoss）：首领战本身照旧会切首领主题（见 renderCombat 里的 setBoss）。
      else if (v === 'music:on' && !AudioFX.enabledState()) AudioFX.toggle();
      else if (v === 'music:off' && AudioFX.enabledState()) AudioFX.toggle();
      else if (v === 'sfx:on' && !AudioFX.sfxState()) AudioFX.toggleSfx();
      else if (v === 'sfx:off' && AudioFX.sfxState()) AudioFX.toggleSfx();
      else if (v === 'amb:on' && !AudioFX.ambientState()) AudioFX.toggleAmbient();
      else if (v === 'amb:off' && AudioFX.ambientState()) AudioFX.toggleAmbient();
      else if (v==='autoTools') {const r=Game.setAutoTools(!Game.autoToolsEnabled());if(!r.ok)centerToast(r.reason);}
      else if (v==='sceneScroll') { deps.sceneScroll=!deps.sceneScroll;try{localStorage.setItem('guyuyizhang_scene_scroll',deps.sceneScroll?'1':'0');}catch(e){} deps.scenePanY=0;deps.mapPanY=0;fitStage();render(); }
      else if (v === 'obj:on') setShowObjective(true);
      else if (v === 'obj:off') setShowObjective(false);
      else if (v.startsWith('log:')) setLogMode(v.slice(4));
      else if (v.startsWith('logw:')) setLogSize(v.slice(5));
      else if (v.startsWith('skin:')) {
        // 多选：同一个按钮点一下开、再点一下关（作者 2026-09-23）
        const id = v.slice(5);
        const wasOn = skinOn(id);
        enableSkin(id, !wasOn);
        const nm = (deps.SKINS.find(s => s.id === id) || {}).name || id;
        addLog(wasOn ? `已关闭皮肤包「${nm}」——当前：${skinName()}。` : `已开启皮肤包「${nm}」——当前：${skinName()}。`, 'sys');
      }
      else if (v === 'skinoff:1') {
        clearSkins();
        addLog('已切回墨白原味（皮肤包全部关闭）。', 'sys');
      }
      showModal('settings');
      if(m.querySelector('.help-list'))m.querySelector('.help-list').scrollTop=settingsScroll;
    });
    // 付费皮肤各 50 魂点（账号级，永久解锁）；免费全彩地图包可直接切换。
    m.querySelectorAll('[data-askin]').forEach(b => b.onclick = () => {
      const id = b.dataset.askin;
      const r = Game.unlockSkin(id);
      if (r.ok) {
        enableSkin(id, true);
        const nm = (deps.SKINS.find(s => s.id === id) || {}).name || id;
        addLog(`已解锁皮肤包「${nm}」（消耗 ${r.cost} 魂点，现有 ${Game.metaState().soul}）。`, 'good');
        try { centerToast(`解锁成功：${nm}`); } catch (e) {}
        try { AudioFX.play('good'); } catch (e) {}
      } else {
        addLog(r.reason, 'warn');
        try { centerToast(r.reason); } catch (e) {}
      }
      showModal('settings');
    });
    m.querySelectorAll('[data-sleep]').forEach(b => b.onclick = () => {
      const k = b.dataset.sleep;
      closeModal();
      if (k === 'watch') { Game.sleep(k); return; }          // 守夜是清醒的，不放睡觉动画
      const lbl = { nap:'小睡 2 小时', normal:'安稳睡觉 8 小时' }[k] || '睡觉';
      withAnimation('sleep', lbl, () => Game.sleep(k), k === 'nap' ? 'sleep_nap' : 'sleep_night');
    });
    m.querySelectorAll('[data-meta-buy]').forEach(b => b.onclick = () => {
      if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; }
      const nd = META_NODES.find(n => n.id === b.dataset.metaBuy);
      const r = Game.metaBuy(b.dataset.metaBuy);
      if (!r.ok) addLog(r.reason, 'warn');
      else { addLog(`${nd.name} 升至 Lv${r.level}！`, 'good'); AudioFX.play('good'); }
      showModal('heirloom');
    });
    const dp = $('#devpw'); if (dp) dp.focus();
    const doDev = (pw) => { const r = Game.unlockDev(pw); if (r.ok) { addLog('开发者模式已解锁！获得 10000 魂点。', 'good'); closeModal(); } else addLog(r.reason, 'warn'); };
    m.querySelectorAll('#devpw-ok').forEach(b => b.onclick = () => { const i = $('#devpw'); doDev(i ? i.value.trim() : ''); });
    m.querySelectorAll('#devpw').forEach(i => i.onkeydown = (e) => { if (e.key === 'Enter') doDev(i.value.trim()); });
    m.querySelectorAll('[data-sleeplock]').forEach(b => b.onclick = () => { addLog(`守夜将在第一次夜袭（第 ${Game.raidDay()} 天清晨）后解锁。`, 'warn'); });
    m.querySelectorAll('[data-craftbatch]').forEach(b => b.onclick = () => showModal('batch', {recipe:b.dataset.craftbatch}));
    m.querySelectorAll('[data-recipe]').forEach(b => {
      const doTap = () => {
        if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; }
        const r = Game.craftRecipe(RECIPES.find(x => x.id === b.dataset.recipe)); const cook = ['fire','pot','stove'].includes(r.station);
        withAnimation('craft', r.name, () => { const previous = deps.modal; Game.craft(r); if (deps.modal === previous && !S().death) rerenderCraft(); }, cook ? 'pot' : 'hammer_icon');
      };
      const doLong = () => {
        if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; }
        const r = Game.craftRecipe(RECIPES.find(x => x.id === b.dataset.recipe));
        // 晾肉架这类"挂上去等时间"的配方没有批量：一副架子一次只挂一批，长按只提醒一句
        if (r && r.hang) {
          addLog(`${r.name}一次只能挂一批（${Object.entries(Game.craftIn(r)).map(([k, v]) => `${ITEMS[k].name}×${v}`).join('、')}），晾好取下来再挂。`, 'sys');
          return;
        }
        showModal('batch', { recipe: r.id });
      };
      bindPress(b, doTap, doLong);
    });
    m.querySelectorAll('[data-item]').forEach(b=>{b.onclick=null;if(kind==='warehouse'){bindWarehouseCard(b,b.dataset.item,'in');return;}bindPress(b,()=>{const mc=m.querySelector('.work-scroll');invScroll=mc?mc.scrollTop:0;openItemDetail(b.dataset.item);},()=>showModal('batchn',{kind:'discard',item:b.dataset.item,fromWarehouse:false,returnKind:deps.modal?.kind}));});
    m.querySelectorAll('[data-station]').forEach(b => b.onclick = () => {
      if (b.classList.contains('locked')) { addLog(b.dataset.station === 'fire' && S().scene === 'camp' ? '需要先建造篝火。' : S().scene !== 'camp' ? '这些工坊都在营地里，回营地才能使用。' : b.dataset.station === 'furniture' ? '需要先建造对应家具（纺车/织布机/研钵/药炉/灶台/晾肉架/制革架等）。' : '还没有这个工位，先去营地建造吧。', 'warn'); return; }
      deps.craftTab = b.dataset.station;
      deps.craftGroup = 'all';
      showModal('craft');
    });
    m.querySelectorAll('[data-craftgroup]').forEach(b => b.onclick = () => {
      deps.craftGroup = b.dataset.craftgroup;
      showModal('craft');
    });
    m.querySelectorAll('[data-ttab]').forEach(b => b.onclick = () => { deps.laoTab = b.dataset.ttab; m.querySelectorAll('[data-ttab]').forEach(x => x.classList.remove('active')); b.classList.add('active');
      showModal('laochao');
    });
    m.querySelectorAll('[data-shop]').forEach(b => b.onclick = () => {
      m.querySelectorAll('[data-shop]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      if (b.classList.contains('locked')) { addLog('声望不够，摊主摆摆手。', 'warn'); return; }
      deps.townShopNow = b.dataset.shop;                 // 记住选的摊位：买完重建后还停在这家
      showModal('town');
    });
    m.querySelectorAll('[data-buy]').forEach(b => {
      const e = LAOCHAO.sell.find(x => x.id === b.dataset.buy) || {};
      const cur = b.dataset.currency || e.currency || 'beibi';
      const unit = Game.priceOf(e.base || 0, false, b.dataset.buy);
      const isBp = e.kind === 'bp';
      const doTap = () => {
        if (isBp && Game.invCount(b.dataset.buy) > 0) return;
        Game.buyFromMerchant(b.dataset.buy, 1, LAOCHAO.sell, false);
        showModal('laochao');
      };
      const doLong = () => {   // 长按 = 批量购买（图纸只能买一份，也照样弹批量条，避免"长按没反应"）
        if (isBp) { showModal('batchn', { kind:'buy', item:b.dataset.buy, shop:'LAOCHAO', max:1 }); return; }
        const mx = Math.max(1, Math.min(99, Math.floor(Game.invCount(cur) / Math.max(1, unit))));
        if (Game.invCount(cur) < unit) { doTap(); return; }
        showModal('batchn', { kind:'buy', item:b.dataset.buy, shop:'LAOCHAO', max:mx });
      };
      b.onclick = null; bindPress(b, doTap, doLong);
    });
    m.querySelectorAll('[data-sell]').forEach(b => {
      const id = b.dataset.sell;
      const doTap = () => { Game.sellToMerchant(id, 1, LAOCHAO.buy, false); showModal('laochao'); };
      const doLong = () => showModal('batchn', { kind:'sell', item:id, list:'LAOCHAO' });
      b.onclick = null; bindPress(b, doTap, doLong);
    });
    // 兑换（双向）：dir = 'shell' 贝壳→金币 / 'coin' 金币→贝壳。
    // 作者 2026-09-25：**和上面的出售完全一样** —— 点一下换 1 份、长按走批量面板，
    // 不再有单独的「全部」按钮，也没有那段兑换说明（原来那套确认弹窗一起去掉了）。
    const doExchange = (dir, want) => {
      const r = dir === 'coin' ? Game.exchangeGold(want) : Game.exchangeShells(want);
      if (!r || !r.ok) { const why = (r && r.reason) || '兑换失败。'; addLog(why, 'warn'); centerToast(why); }
      showModal('laochao');
    };
    m.querySelectorAll('[data-exshell]').forEach(b => {
      const doTap = () => doExchange('shell', 1);
      const doLong = () => showModal('batchn', { kind:'exchange', dir:'shell' });
      b.onclick = null; bindPress(b, doTap, doLong);
    });
    m.querySelectorAll('[data-exgold]').forEach(b => {
      const doTap = () => doExchange('coin', 1);
      const doLong = () => showModal('batchn', { kind:'exchange', dir:'coin' });
      b.onclick = null; bindPress(b, doTap, doLong);
    });
    m.querySelectorAll('[data-comm]').forEach(b => b.onclick = () => {
      Game.completeCommission(Game.commissions().find(c => c.id === b.dataset.comm));
      showModal('laochao');
    });
    bindCellarControls(m);
    m.querySelectorAll('[data-book-open]').forEach(b=>b.onclick=()=>showModal('bookFocus'));
    m.querySelectorAll('[data-cellar-open]').forEach(b=>b.onclick=()=>showModal('cellar'));
    m.querySelectorAll('[data-book-focus]').forEach(b=>b.onclick=()=>{const r=Game.setFocus(b.dataset.bookFocus);centerToast(r.ok?'集中方向已更新':r.reason);if(r.ok)showModal('bookFocus');});
    m.querySelectorAll('[data-cellar-deposit]').forEach(b=>b.onclick=()=>showModal('cellarDeposit'));
    m.querySelectorAll('[data-cellar-item]').forEach(b=>bindPress(b,()=>openItemDetail(b.dataset.cellarItem,'cellar'),()=>showModal('batchn',{kind:'discard',item:b.dataset.cellarItem,fromWarehouse:'cellar'})));
    m.querySelectorAll('[data-transfer-help]').forEach(b=>bindPress(b,()=>showModal('transferHelp')));
    m.querySelectorAll('[data-warehouse-auto]').forEach(b=>{b.onclick=null;bindPress(b,()=>{const a=Game.warehouseAccessCheck(false);if(!a.ok){centerToast(a.reason);return;}showModal('warehouseAuto');});});
    m.querySelectorAll('[data-save-warehouse-auto]').forEach(b=>b.onclick=()=>{const ids=[...m.querySelectorAll('[data-auto-item]:checked')].map(e=>e.dataset.autoItem),r=Game.setWarehouseAutoItems(ids);if(r.ok){if(b.hasAttribute('data-store-now')){const stored=Game.autoStoreWarehouse();centerToast(stored?.ok?(stored.moved?'已存入'+stored.moved+'份物品。':'暂无可存物资或仓库已满。'):(stored?.reason||'现在无法存入仓库。'));}else centerToast('已保存，下次回营时自动存入。');showModal('warehouse');}else centerToast(r.reason);});
    m.querySelectorAll('[data-eqpick]').forEach(b=>{const open=e=>{if(e?.target?.closest('[data-unequip-slot]'))return;e?.stopPropagation();showModal('equipPick',{kind:b.dataset.eqpick});};if(b.hasAttribute('data-satchel-settings')){b.onclick=null;bindPress(b,open,()=>showModal('satchelSettings'));}else b.onclick=open;b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(e);}};});
    m.querySelectorAll('[data-loadout-back]').forEach(b=>b.onclick=()=>showModal('equip'));
    m.querySelectorAll('[data-unpack]').forEach(b=>b.onclick=()=>{Game.equipBackpack(null);showModal('equip');});
    m.querySelectorAll('[data-equiptab]').forEach(b => b.onclick = () => { deps.equipTab = b.dataset.equiptab; showModal('equip'); });
    // 「装备 → 属性」里的结局结算按钮（作者 2026-09-23 从右下角搬来）。
    // ⚠️ 结算成功会走 onEnding → showEnding 铺一层全屏 #ending-screen；
    //    不先关掉装备面板的话，结局画面会盖在面板上、面板还留着（时间被冻结看不出，但视觉是叠的）。
    // ⚠️ data-settle 存的是 **'endA' 这种完整 id**（a.id 是 'settle_endA'，slice(7) 正好切掉 'settle_'），
    //    所以这里直接把它交给 settleEnding —— 别再拼一次 'end'，那会变成 'endendA'，
    //    settleEnding 里取 flags['ended_endA'] 拿不到东西，按钮点了毫无反应（第一版就这么错的）。
    // 作者 2026-09-25："属性栏任务下面的点击之后也应该出现确认弹窗，而不是直接结算。"
    //   —— 结算**一局只能做一次、做完不能撤销**，手滑点一下就把这一生的收尾方式定死了，值得问一句。
    //   ⚠️ 这里不能图省事用 askConfirm()：它的「取消」是写死的空回调，而 [data-choice] 的处理器
    //      会**先 closeModal() 再调 ok()** —— 那样点「取消」会把整个装备面板关掉。
    //      所以自己写 overlay，两个分支各自回到该回的地方。
    const doSettle = (id) => {
      const r = Game.settleEnding(id);
      if (r && r.ok === false && r.reason) { addLog(r.reason, 'warn'); centerToast(r.reason); showModal('equip'); return; }
      closeModal();
    };
    m.querySelectorAll('[data-settle]').forEach(b => b.onclick = () => {
      const id = b.dataset.settle;
      const label = b.textContent.trim();
      showModal('overlay', {
        title: '确认结算',
        text: `确定要「${label}」吗？\n\n`
          + `· 一个存档只能结算一个结局：结算之后，别的结局不会再出现在这里（本局照样能继续玩）。\n`
          + `· 这一生的战绩会折算成魂点，汇入《历代遗章》。\n`
          + `· 结算不能撤销，请再确认一次。`,
        choices: [
          { label: '确定结算', ok: () => doSettle(id) },
          { label: '取消', hint: '回到属性面板', ok: () => showModal('equip') },
        ],
      });
    });
    m.querySelectorAll('[data-pack]').forEach(b=>b.onclick=()=>{const r=Game.equipBackpack(b.dataset.pack);if(!r.ok)centerToast(r.reason);showModal(deps.modal?.kind==='equipPick'?'equip':'inv');});
    m.querySelectorAll('[data-bag-open]').forEach(b=>b.onclick=()=>showModal('inv'));
    m.querySelectorAll('[data-warehouse-item]').forEach(b=>{b.onclick=null;bindWarehouseCard(b,b.dataset.warehouseItem,'out');});
    m.querySelectorAll('[data-warehouse-open]').forEach(b=>b.onclick=()=>showModal('warehouse'));
    m.querySelectorAll('[data-infusion-open]').forEach(b=>b.onclick=()=>showModal('nightmareInfusion'));
    m.querySelectorAll('[data-infusion-tier]').forEach(b=>b.onclick=()=>showModal('nightmareInfusion',{soul:b.dataset.infusionTier}));
    m.querySelectorAll('[data-infuse]').forEach(b=>b.onclick=()=>{b.disabled=true;const r=Game.infuseNightmare(b.dataset.soul,b.dataset.infuse);showModal('nightmareInfusion',{soul:b.dataset.soul});centerToast(r.ok?'你的选择已被铭刻。':r.reason);});
    m.querySelectorAll('[data-separator-open]').forEach(b=>b.onclick=()=>showModal('separator'));
    m.querySelectorAll('[data-separate]').forEach(b=>b.onclick=()=>{const r=Game.separateSouls(+b.dataset.separate,b.dataset.soulId);showModal('separator');const out=document.getElementById('separate-result');if(out)out.textContent=r.ok?Object.entries(r.rewards).map(([id,n])=>ITEMS[id].name+'×'+n).join('、')+(r.soul?' · 魂点+'+r.soul:'')+(r.coins?' · 星之点+'+r.coins:''):r.reason;});
    m.querySelectorAll('[data-unequip-slot]').forEach(b => b.onclick = () => { const k = b.dataset.unequipSlot; const id = S().equipment[k]; if (id) { Game.unequip(id, (S().equipIdx || {})[k] || 0); } rerenderEquip(); });
    m.querySelectorAll('[data-crafthelp]').forEach(b => b.onclick = () => showModal('crafthelp'));
    m.querySelectorAll('[data-dry]').forEach(b => b.onclick = () => {
      const r = Game.dryCollect('rack');
      if (r && !r.ok) addLog(r.reason, 'warn');
      rerenderCraft();
    });
    m.querySelectorAll('[data-repair-broken]').forEach(b=>b.onclick=()=>{const r=Game.repairWeapon(b.dataset.repairBroken);if(!r.ok) centerToast('材料不足，或当前无法修复。');showModal(kind,cfg);});
    m.querySelectorAll('[data-grind]').forEach(b => b.onclick = () => { const a = b.dataset.grind; if (a === 'sharpen') Game.sharpen(); else if (a === 'repair') Game.repairWeapon(); else showModal('naming'); });
    m.querySelectorAll('[data-mailtab]').forEach(b => b.onclick = () => { deps.mailTab = b.dataset.mailtab; showModal('mailbox'); });
    const changeGuidePage = page => {
      deps.guidePage = Math.max(0, Math.min(GUIDE.length - 1, page));
      const host = kind === 'mailbox' ? 'mailbox' : 'guide';
      showModal(host, {guidePageChange:true});
      const content = $('#modal .modal-content'); if (content) content.scrollTop = 0;
    };
    m.querySelectorAll('[data-guide-step]').forEach(b => b.onclick = () => changeGuidePage(deps.guidePage + Number(b.dataset.guideStep)));
    m.querySelectorAll('[data-guide-page]').forEach(b => b.onchange = () => changeGuidePage(Number(b.value)));
    // ⚠️ 这里以前写的是一个裸的 change 调用 —— 但 ui.js 的作用域里根本没有这个函数（那是 game.js 内部的），
    //    一调用就 ReferenceError：领邮件不会刷新、兑换码不切页、新手引导点"跳过"没反应。
    //    统一改成公开 API Game.change()（它会走到界面绑定的 onChange → render()）。
    m.querySelectorAll('[data-claimmail]').forEach(b => b.onclick = () => { const r = Game.claimMailbox(+b.dataset.claimmail); centerToast(r.msg || r.reason); Game.change(); showModal('mailbox'); });
    // 每日晨报里的陷阱选择
    m.querySelectorAll('[data-dailytrap]').forEach(b => b.onclick = () => {
      const r = Game.claimDailyTrap(b.dataset.dailytrap);
      if (r && !r.ok) addLog(r.reason, 'warn');
      closeModal();
    });
    const rd = m.querySelector('[data-revive2]') || null;
    const rdo = m.querySelector('#redeem-do'); if (rdo) rdo.onclick = async () => {
      if (rdo.disabled) return;
      const inp = m.querySelector('#redeem-code'), code = inp ? inp.value : '';
      rdo.disabled = true; rdo.textContent = '正在兑换…';
      let r;
      try { r = await Game.redeemCode(code); }
      catch (_) { r = {ok:false,reason:'兑换暂未完成，请保留兑换码并重试'}; }
      centerToast(r.msg || r.reason);
      if (!r.ok) addLog(r.reason, 'warn'); else { deps.mailTab = 'mail'; Game.change(); }
      // A player may close this modal while waiting for the network.
      if (m.contains(rdo)) {
        if (r.ok) showModal('mailbox');
        else { rdo.disabled = false; rdo.textContent = '兑 换'; }
      }
    };
    const ndo = m.querySelector('#name-do'); if (ndo) ndo.onclick = () => { Game.nameWeapon(m.querySelector('#name-input').value); rerenderCraft(); };
    m.querySelectorAll('[data-helprules]').forEach(b => b.onclick = () => { comTab = 'p1'; showModal('comhelp'); });
    m.querySelectorAll('[data-commtab]').forEach(b => b.onclick = () => { comTab = b.dataset.commtab; showModal('comhelp'); });
    // ---- 技能树（B1）----
    m.querySelectorAll('[data-skilltree]').forEach(b => b.onclick = () => showModal('skilltree', { kind: b.dataset.skilltree }));
    m.querySelectorAll('[data-trunkup]').forEach(b => b.onclick = () => {
      const [k, o] = String(b.dataset.trunkup).split(':');
      const r = Game.skillUpTrunk(k, o);
      if (!r.ok) addLog(r.reason, 'warn');
      showModal('skilltree', { kind: k });
    });
    m.querySelectorAll('[data-nodelearn]').forEach(b => b.onclick = () => {
      const [k, id] = String(b.dataset.nodelearn).split(':');
      const r = Game.skillNodeLearn(k, id);
      if (!r.ok) addLog(r.reason, 'warn');
      showModal('skilltree', { kind: k });
    });
    m.querySelectorAll('[data-nodeforget]').forEach(b => b.onclick = () => {
      const [k, id] = String(b.dataset.nodeforget).split(':');
      const r = Game.skillNodeForget(k, id);
      if (!r.ok) addLog(r.reason, 'warn');
      showModal('skilltree', { kind: k });
    });
    // 主干遗忘：想换流派时把主干也退回去（只能从最末端退，返还一半）
    m.querySelectorAll('[data-trunkforget]').forEach(b => b.onclick = () => {
      const k = String(b.dataset.trunkforget);
      const r = Game.skillTrunkForget(k);
      if (!r.ok) addLog(r.reason, 'warn');
      else try { centerToast(`主干退到 ${r.lv} 级 · 返还 ${r.gain}`); } catch (e) {}
      showModal('skilltree', { kind: k });
    });
    { const stb = m.querySelector('#st-back'); if (stb) stb.onclick = () => showModal('skill'); }
    // 云存档：手动上传一次（内部仍受 60 秒节流保护，顶多提示"等一会儿"）
    const bn = $('#batch-n');
    if (bn) {
      const recipe = Game.craftRecipe(RECIPES.find(x => x.id === cfg.recipe));
      const up = () => { $('#batch-count').textContent = bn.value; $('#batch-time').textContent = Game.craftMinutes(recipe) * Number(bn.value); $('#batch-output').textContent = '产出：' + Object.entries(recipe.out).map(([k,v]) => `${ITEMS[k].name}×${v * Number(bn.value)}`).join('、') + ' · 材料：' + Object.entries(Game.craftIn(recipe,Number(bn.value))).map(([k,v]) => `${ITEMS[k].name}×${v}`).join('、'); };
      bn.oninput=up; bn.onchange=up;
      m.querySelectorAll('[data-cset]').forEach(b => b.onclick = () => {
        bn.value = b.dataset.cset === '1' ? 1 : b.dataset.cset === 'half' ? Math.max(1, Math.floor(+bn.max / 2)) : bn.max; up();
      });
      $('#batch-do').onclick = () => {
        const n=+bn.value,cook=['fire','pot','stove'].includes(recipe.station);
        const res=Game.craftBatch(recipe,n,(run,actual)=>{
          const previous=deps.modal;
          withAnimation('craft',recipe.name+' ×'+actual,()=>{
            // 数量选择暂停被动时间；确认的制作仍须结算实际耗时。
            const frozen=Game.timeFrozen();let result;
            Game.setTimeFreeze(false);
            try{result=run();}finally{Game.setTimeFreeze(frozen);}
            if(result.pending||deps.modal!==previous||S().death)return;
            if(!result.ok){centerToast(result.reason||'无法制作');return;}rerenderCraft();
          },cook?'pot':'hammer_icon');
        });
        if(!res.pending&&!res.ok)centerToast(res.reason||'无法制作');
      };
    }
    // 数量快捷档（手机端不用精确拖滑块）：1 / 一半 / 全部
    m.querySelectorAll('[data-bset]').forEach(x => x.onclick = () => {
      const inp = $('#batchn-n'); if (!inp) return;
      const mx = +inp.max || 1;
      const v = x.dataset.bset === '1' ? 1 : x.dataset.bset==='10'?Math.min(10,mx):(x.dataset.bset === 'half' ? Math.max(1, Math.round(mx / 2)) : mx);
      inp.value = v; inp.dispatchEvent(new Event('input'));
      const c = $('#batchn-count'); if (c) c.textContent = v;
    });
    // 批量条：数量/合计实时更新；确定后按商店类型回到正确的界面
    const bnn = $('#batchn-n');
    m.querySelectorAll('#modal-transfer-back').forEach(b=>b.onclick=()=>{if(cfg.returnKind==='warehouse'){showModal('warehouse');restoreInvScroll();}else openItemDetail(cfg.item,cfg.dir!=='in');});
    if (bnn) {
      const bc2 = $('#batchn-count');
      const up2 = () => {
        if (bc2) bc2.textContent = bnn.value;
        const tt = $('#batchn-total');
        if (tt && deps.modal && deps.modal.cfg) {
          const n2 = +bnn.value || 0;
          if (deps.modal.cfg.kind === 'exchange') tt.textContent = deps.modal.cfg.dir === 'coin' ? `${n2 * Game.SHELL_FOR_COIN} 贝壳` : `${n2} 金币`;
          else if (deps.modal.cfg._unit) tt.textContent = deps.modal.cfg._unit * n2;
        }
      };
      bnn.oninput=up2; bnn.onchange=up2;
      const bd2 = $('#batchn-do');
      if (bd2) bd2.onclick = () => {
        const cfg2 = deps.modal.cfg, n = +bnn.value;
        if(cfg2.kind==='cellar'){const r=Game.transferCellar(cfg2.item,n,cfg2.dir==='in');if(!r.ok){centerToast(r.reason);return;}centerToast((cfg2.dir==='in'?'存入':'取出')+ITEMS[cfg2.item].name+'×'+r.moved);showModal('cellar');return;}
        if(cfg2.kind==='warehouse'){const deposit=cfg2.dir==='in',r=Game.transferWarehouse(cfg2.item,n,deposit);if(!r.ok){centerToast(r.reason);return;}centerToast((deposit?'存入':'取出')+ITEMS[cfg2.item].name+'×'+r.moved);showModal(cfg2.returnKind||(deposit?'inv':'warehouse'));return;}
        if(cfg2.kind==='discard'){
          const discard=()=>{const r=Game.discardItems(cfg2.item,n,cfg2.fromWarehouse||false);if(!r.ok)centerToast(r.reason);else centerToast('丢弃'+ITEMS[cfg2.item].name+'×'+r.moved);showModal(cfg2.returnKind||(cfg2.fromWarehouse==='cellar'?'cellar':cfg2.fromWarehouse?'warehouse':'inv'));};
          if(cfg2.fromWarehouse==='cellar') showModal('overlay',{
            title:'确认丢弃',text:`丢弃地窖中的${ITEMS[cfg2.item].name} ×${n}？\n丢弃后无法找回。`,
            choices:[{label:'取消',ok:()=>showModal('cellar')},{label:'丢弃',danger:true,ok:discard}]
          });
          else discard();
          return;
        }
        if (cfg2.kind === 'exchange') {
          const r = cfg2.dir === 'coin' ? Game.exchangeGold(n) : Game.exchangeShells(n);
          if (!r || !r.ok) { const why = (r && r.reason) || '兑换失败。'; addLog(why, 'warn'); centerToast(why); }
          closeModal(); showModal('laochao'); return;
        }
        if (cfg2.kind === 'buy') {
          const key = String(cfg2.shop || '').split(':')[0];
          Game.buyFromMerchant(cfg2.item, n, shopBuyList(cfg2.shop), key === 'BLACK');
          closeModal();
          showModal(key === 'BLACK' ? 'black' : key === 'LAOCHAO' ? 'laochao' : key === 'ATL' ? 'atlTrade' : (cfg2.back || 'town'));
          return;
        }
        const lk = cfg2.list || 'LAOCHAO';
        Game.sellToMerchant(cfg2.item, n, shopSellList(lk), lk === 'BLACK');
        closeModal(); showModal(lk === 'TOWN' ? 'town' : lk === 'BLACK' ? 'black' : lk === 'ATL' ? 'atlTrade' : 'laochao');
      };
    }
    m.querySelectorAll('[data-ctab]').forEach(b => b.onclick = () => {
      if (deps.colTab === b.dataset.ctab) return;
      deps.colTab = b.dataset.ctab; showModal('collection');
      const body=document.querySelector('#modal .col-body'); if (body) body.scrollTop=0;
    });
    m.querySelectorAll('[data-iteminfo]').forEach(b => b.onclick = () => showModal('itemInfo',{id:b.dataset.iteminfo}));

    bindLottery(m,kind,cfg);
    m.querySelectorAll('[data-acceptc]').forEach(b => b.onclick = () => {
      const r = Game.acceptCommission(Game.commissions().find(c => c.id === b.dataset.acceptc));
      if (!r.ok) addLog(r.reason, 'warn'); else centerToast('已接取委托，3 天内去海域找海盗头目');
      showModal('laochao');
    });
    m.querySelectorAll('[data-firsttrade]').forEach(b => b.onclick = () => { Game.doFirstTrade(); showModal('laochao'); });
    m.querySelectorAll('[data-tbuy]').forEach(b => {
      const [shop, id] = b.dataset.tbuy.split(':');
      // ⚠️ 货架必须按**这个摊位**取：以前写成"informant ? … : smith ? … : 杂货商"的三元链，
      //    任何新摊位（美食家）都会掉进最后的杂货商分支 —— 点「买」会拿杂货商的价格去买，
      //    图纸根本买不到（作者 2026-09-25 复核时发现的第二处硬编码）。
      const list = (TOWN[shop] && TOWN[shop].sell) || [];
      const entry = list.find(x => x.id === id) || {};
      const cur = entry.currency || 'beibi';
      const unit = Game.priceOf(entry.base || 0, false, id);
      const back = (deps.modal && deps.modal.kind === 'info') ? 'info' : 'town';
      const doTap = () => { Game.buyFromMerchant(id, 1, list, false); showModal(back); };
      const doLong = () => {
        if (TOWN[shop]) deps.townShopNow = shop;   // 批量面板确认后回集市，也要停在原摊位（任意摊位，不再写死三家）
        if (ITEMS[id].cat === 'bp') { showModal('batchn', { kind:'buy', item:id, shop:b.dataset.tbuy, back, max:1 }); return; }
        const mx = Math.max(1, Math.min(99, Math.floor(Game.invCount(cur) / Math.max(1, unit))));
        if (Game.invCount(cur) < unit) { doTap(); return; }
        showModal('batchn', { kind:'buy', item:id, shop:b.dataset.tbuy, back, max:mx });
      };
      b.onclick = null; bindPress(b, doTap, doLong);
    });
    m.querySelectorAll('[data-tsell]').forEach(b => {
      const id = b.dataset.tsell;
      // ⚠️ 同样别写死三家：按**当前摊位**的收购表算价（美食家收蛋糕/炖肉的价格和杂货商不同）。
      const list = (TOWN[deps.townShopNow] && TOWN[deps.townShopNow].buy) || [];
      const doTap = () => { Game.sellToMerchant(id, 1, list, false); showModal('town'); };
      const doLong = () => showModal('batchn', { kind:'sell', item:id, list:'TOWN' });   // 长按 = 批量卖
      b.onclick = null; bindPress(b, doTap, doLong);
    });
    m.querySelectorAll('[data-bbuy]').forEach(b => { const e = BLACKMARKET.sell.find(x => x.id === b.dataset.bbuy) || {}; const unit = Game.priceOf(e.base || 0, false, b.dataset.bbuy); const doTap = () => { Game.buyFromMerchant(b.dataset.bbuy, 1, BLACKMARKET.sell, true); showModal('black'); }; const doLong = () => { if (ITEMS[b.dataset.bbuy].cat === 'bp') { showModal('batchn', { kind:'buy', item:b.dataset.bbuy, shop:'BLACK', max:1 }); return; } const mx = Math.max(1, Math.min(99, Math.floor(Game.invCount('beibi') / Math.max(1, unit)))); if (Game.invCount('beibi') < unit) { doTap(); return; } showModal('batchn', { kind:'buy', item:b.dataset.bbuy, shop:'BLACK', max:mx }); }; b.onclick = null; bindPress(b, doTap, doLong); });
    m.querySelectorAll('[data-bsell]').forEach(b => { const id = b.dataset.bsell; const doTap = () => { Game.sellToMerchant(id, 1, BLACKMARKET.buy, true); showModal('black'); }; const doLong = () => showModal('batchn', { kind:'sell', item:id, list:'BLACK' }); b.onclick = null; bindPress(b, doTap, doLong); });
    m.querySelectorAll('[data-choice]').forEach(b => b.onclick = () => {
      if (b.disabled || !deps.modal || deps.modal.cfg !== cfg) return;
      m.querySelectorAll('[data-choice]').forEach(x=>x.disabled=true);
      const c = cfg.choices[Number(b.dataset.choice)];
      if (deps.modal && deps.modal.cfg && deps.modal.cfg.requiredChoice) deps.modal.cfg.requiredChoice = false;
      closeModal();
      if (c && c.ok) c.ok();
    });
    m.querySelectorAll('[data-med-id]').forEach(b => b.onclick = () => { Game.useItemInFight(b.dataset.medId); if (Game.S().combat) renderCombat('start', Game.S().combat); else closeModal(); });
    // ⚠️ 战斗中点「道具」→ 这里右上角的 ✕ 原本是"关闭整个弹窗"= 直接把战斗界面关掉，
    //    玩家反馈"点道具再点叉就直接结束本次战斗了"。道具面板的 ✕ 应该 = 返回战斗。
    if (kind === 'medpick') m.querySelectorAll('#modal-close, .modal-x').forEach(b => b.onclick = () => renderCombat('start', Game.S().combat));
    m.querySelectorAll('[data-claim-ach]').forEach(b => b.onclick = () => { const r = Game.achClaim(b.dataset.claimAch); if (!r.ok) addLog(r.reason, 'warn'); showModal('collection'); });
    if (kind === 'farm') bindFarm();
  }

let invScroll = 0;

function openItemDetail(id,fromWarehouse=false) {
    if(['inv','warehouse','cellar'].includes(deps.modal?.kind))deps.inventoryReturn=deps.modal.kind;
    const panes=$('#modal').querySelectorAll('.inventory-pane .work-scroll');
    if(panes.length===2)deps.inventoryDualScroll=[...panes].map(e=>e.scrollTop);
    const m = $('#modal');
    deps.modalOpenedAt=Date.now(); // pointerup切页后的补发click不得关闭详情
    deps.dom.dispose(m);m.innerHTML = `<div class="modal-content item-detail-modal"><button class="modal-x" aria-label="返回${fromWarehouse==='cellar'?'地窖':fromWarehouse?'仓库':'背包'}">×</button>${itemDetail(id,fromWarehouse)}</div>`;
    m.querySelector('.modal-x').onclick=()=>{showModal(deps.inventoryReturn);restoreInvScroll();};
    const mc = m.querySelector('.modal-content'); if (mc) mc.scrollTop = 0;
    bindItemDetail(id,fromWarehouse);
  }

function restoreInvScroll() {
    const panes=$('#modal').querySelectorAll('.inventory-pane .work-scroll');
    if(panes.length===2){panes.forEach((e,i)=>e.scrollTop=deps.inventoryDualScroll[i]||0);return;}
    const mc = $('#modal .work-scroll')||$('#modal .modal-content');
    if (mc && invScroll) mc.scrollTop = invScroll;
  }

function afterItemUse(id,source=false) {
    if(S().death||S().ending)return;
    if (Game.itemUseCount(id,source) > 0) openItemDetail(id,source);
    else { showModal(deps.inventoryReturn); restoreInvScroll(); }
  }

function bindItemDetail(id,fromWarehouse=false) {
    const m = $('#modal');
    bindCellarControls(m);
    m.querySelectorAll('[data-ware-transfer]').forEach(b=>{const transfer=()=>{const r=Game.transferWarehouse(b.dataset.wareTransfer,b.dataset.qty==='all'?(b.dataset.dir==='in'?Game.warehouseDepositCount(b.dataset.wareTransfer):Game.warehouseState().inv[b.dataset.wareTransfer]||0):+b.dataset.qty,b.dataset.dir==='in');if(!r.ok){centerToast(r.reason);return;}centerToast((b.dataset.dir==='in'?'存入':'取出')+ITEMS[id].name+'×'+r.moved);const n=fromWarehouse?Game.warehouseState().inv[id]:Game.invCount(id);if(n>0)openItemDetail(id,fromWarehouse);else showModal(deps.inventoryReturn);};b.onclick=null;b.style.touchAction='pan-y';bindPress(b,transfer,start=>{showModal('batchn',{kind:'warehouse',item:b.dataset.wareTransfer,dir:b.dataset.dir});dragTransferQuantity(start);});});
    m.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { const id = b.dataset.use; const frozen=Game.timeFrozen();Game.setTimeFreeze(false);try{Game.consume(id,fromWarehouse);}finally{Game.setTimeFreeze(frozen);}afterItemUse(id,fromWarehouse); });
    m.querySelectorAll('[data-med]').forEach(b => b.onclick = () => { const id = b.dataset.med; Game.useMed(id,fromWarehouse); afterItemUse(id,fromWarehouse); });
    m.querySelectorAll('[data-equip]').forEach(b => b.onclick = () => { const id = b.dataset.equip; const idx = b.dataset.idx !== undefined ? +b.dataset.idx : undefined; const eq = S().equipment; const on = (eq.weapon===id||eq.weapon2===id||eq.armor===id||eq.cloth===id||eq.accessory===id); if (on) Game.unequip(id); else Game.equip(id, idx); showModal('inv'); restoreInvScroll(); });
    m.querySelectorAll('[data-learn]').forEach(b=>b.onclick=()=>{const r=Game.learnBlueprint(b.dataset.learn,fromWarehouse);centerToast(r.ok?'已学会'+ITEMS[b.dataset.learn].name:r.reason);if(r.ok)openItemDetail(b.dataset.learn,fromWarehouse);});
    // 限定 · 神弓：存入邮箱（跨局）
    m.querySelectorAll('[data-storebow]').forEach(b => b.onclick = () => {
      const r = Game.storeDivineBow();
      if (r && !r.ok) { addLog(r.reason, 'warn'); showModal('inv'); return; }
      showModal('mailbox'); deps.mailTab = 'mail';
    });
    m.querySelectorAll('[data-plant]').forEach(b => b.onclick = () => { closeModal(); Game.travel('farm'); });
  }

function closeModal() {
    if(restoreCombatView())return;
    if (deps.modal && deps.modal.cfg && deps.modal.cfg.requiredChoice) return;
    modalHistory.length=0;
    clearTimeout(deps.lotteryTimer); deps.lotteryTimer=null; deps.activeMerchant=null; AudioFX.stopVoice();
    const m = $('#modal');deps.dom.dispose(m); m.classList.remove('open'); document.body.classList.remove('modal-open'); m.innerHTML = ''; deps.modal = null;
    if (Game.setTimeFreeze) Game.setTimeFreeze(false); render();   // 关弹窗 → 恢复时间
    // 排队的提示性弹窗：等这个关掉再弹（作者 2026-09-25 要求"不要和其他弹窗冲突"）。
    // 用 setTimeout(0) 而不是直接 showModal：先让上面这轮 render() 跑完，弹窗换得干净。
    showNextPendingPanel();
  }

function showNextPendingPanel() {
    if(deps.modal || deps.battleView || !deps.pendingPanels.length)return;
    const cfg=deps.pendingPanels.shift();
    setTimeout(()=>{
      if(deps.modal || deps.battleView){deps.pendingPanels.unshift(cfg);return;}
      const kind=['lootExpiry','farm','black','town','mission','info','atlTrade','fishman','daily','winter'].includes(cfg.kind)?cfg.kind:'overlay';
      showModal(kind,cfg);
    },0);
  }

function rerenderEquip() { const mc = $('#modal .modal-content'); const st = mc ? mc.scrollTop : 0; showModal('equip'); const mc2 = $('#modal .modal-content'); if (mc2) mc2.scrollTop = st; }

function rerenderCraft() { const mc = $('#modal .recipe-list'); const st = mc ? mc.scrollTop : 0; showModal('craft'); const mc2 = $('#modal .recipe-list'); if (mc2) mc2.scrollTop = st; }
    return Object.freeze({brokenWeaponRows,prepareMerchant,showModal,bindModal,openItemDetail,restoreInvScroll,afterItemUse,bindItemDetail,closeModal,backModal,showNextPendingPanel,rerenderEquip,rerenderCraft});
  }
  return Object.freeze({create});
})();
