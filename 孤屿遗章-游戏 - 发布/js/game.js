/* ============================================================
   孤屿遗章 · 游戏引擎
   时间 / 生存 / 行动 / 战斗 / 建造 / 交易 / 事件 / 结局 / 存档
   ============================================================ */

const Game = (() => {
  const LOG_KEEP = 200;
  let S = null;            // 全局状态
  const foodSatchel=FoodSatchel.create({getState:()=>S,ITEMS,warehouseSite,cellarBuilt,supplyCount,foodLots,nowTick,supplyRecords,supplyRecordsAll,supplyContainer,supplySites,invCount,hasRelic,save,change,log,takeSupply,applyFoodEffects});
  const migrations=StateMigrations.create({getState:()=>S,ITEMS,DIFFICULTIES,WEATHER,DURA,LOG_KEEP,SKILL_TRUNK_COST,costMul,log,combatLv,nodeLv,trainingCount,durList,autoToolkit,reconcileLotteryInputs,reconcileNightmareSouls,settleStoredFood,supplyRecordsAll,addItem,
    migrateFoodChoices:()=>foodSatchel.migrateSatchelChoices()});
  let staging = false;
  const saveTransactions=SaveTransactions.create({
    storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)},
    getPair:()=>({save:S,meta:M}),setPair:(save,meta)=>{S=save;M=meta;},
    migrateMeta:()=>migrateSaltMeta(M),normalize:revision=>{normalizeState();S._rev=revision;},
    reconcile:()=>{reconcileLotteryInputs();reconcileNightmareSouls();},saveRun:()=>save(),saveMeta:()=>metaSave(),
    mirror:()=>{if(S)ckMirror(CK.save,CK.saveAt,localStorage.getItem('guyuyizhang_save'));ckMirror(CK.meta,CK.metaAt,localStorage.getItem('guyuyizhang_meta'));},
    push:()=>cloudPush(false),onFailure:error=>{if(typeof onSaveFail==='function')onSaveFail(error);}
  });
  const repository=SaveRepository.create({
    storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)},
    cookies:{get text(){return document.cookie;},set text(value){document.cookie=value;}},
    getState:()=>S,setState:value=>{S=value;},getMeta:()=>M,setMeta:value=>{M=value;},isStaging:()=>staging,
    transactions:saveTransactions,LOG_KEEP,validSave,normalizeState,migrateSaltMeta,migrateRedeemReceipts,
    onConflict:revision=>{if(typeof onSaveConflict==='function')onSaveConflict(revision);},
    onFailure:error=>{if(typeof onSaveFail==='function')onSaveFail(error);},push:()=>cloudPush(false)
  });
  function recoverPendingWrite(){saveTransactions.recover();}
  function persistPair(nextS,nextM,normalize){return saveTransactions.commit(nextS,nextM,normalize);}
  let onLog = null;        // 文本回调（ui 注册）
  let onChange = null;     // 状态刷新回调（ui 注册）
  let onFight = null;      // 战斗界面回调
  let onEnding = null;     // 结局回调
  let onOverlay = null;    // 弹窗（选择/事件）回调
  let onSaveFail = null;      // 存档写不进去时通知界面（配额满 / 被浏览器限制）
  let onSaveConflict = null;  // 检测到别的标签页有更新进度时通知界面

  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const chance = (p) => Math.random() < p;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const fmtTime = () => { const h = Math.floor(S.minute / 60), m = S.minute % 60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; };

  // 界面上的日志是 DOM 里最近 80 条；S.log 只是为了存档留个尾巴，绝不能无限长
  // （曾经一天天攒到 4810 条 / 378KB，把存档码顶到 940KB，逼近 localStorage 上限有掉档风险）

  function log(text, cls) {
    if (onLog) onLog(text, cls);
    if (S && text) {
      S.log.unshift({ t:`第${S.day}天 ${fmtTime()}`, text, cls });
      if (S.log.length > LOG_KEEP) S.log.length = LOG_KEEP;
    }
  }
function change() { 
    settleStoredFood();
    if(S?.relics?.includes('satchel')&&!S.flags.satchelHelpSeen){S.flags.satchelHelpSeen=true;log('长按食之包卡面，可选最多3种优先食物、饮料或禁食物品。','sys');}
    if (S) syncToolkit();   // 工具用坏了就从工具栏清掉、备用自动顶上（别让空壳一直挂在那）
    if (S && S.stats && S.stats.hp <= 0 && !S.ending && !S.death) { S.stats.hp = 0; die('你伤势太重，倒在了荒野里。'); return; }   // 兜底：生命≤0必定死亡
    // 精神低落会压低体力上限，体力要跟着上限走（喝药透支后不该还能顶着一管超额的体力）
    if (S && S.stats) { const ms = maxStam(); if (S.stats.stamina > ms) S.stats.stamina = ms; }
    if (S) S._dirty = true;      // 有改动 → 兜底自动存档（每 20 秒那次）才知道该不该写
    if (onChange) onChange();
    if (!S.death) achCheck();
    if (!S.death && !S.ending) dangerTip();
  }
  function qtyParse(q) { if (typeof q === 'string' && q.includes('-')) { const [a,b] = q.split('-').map(Number); return rnd(a,b); } return q; }

  // ---------- 物品 ----------
  function invCount(id) { return S.inv[id] || 0; }
  function hasItem(id, n=1) { return invCount(id) >= n; }
  function knowsBlueprint(id) { return !!S.learnedBlueprints?.[id] || materialCount(id)>0; }
  function learnBlueprint(id,fromWarehouse=false) {
    if(!ITEMS[id] || ITEMS[id].cat!=='bp' || S.combat || S.death || S.ending)return {ok:false,reason:'现在无法学习。'};
    if(fromWarehouse?(!warehouseAccess() || !(warehouseState().inv[id]>0)):!hasItem(id))return {ok:false,reason:'请先取得这份图纸。'};
    if(S.learnedBlueprints?.[id])return {ok:true,reason:'已经学会。'};
    const next=JSON.parse(JSON.stringify(S));next.learnedBlueprints=next.learnedBlueprints||{};next.learnedBlueprints[id]=true;
    const r=persistPair(next,JSON.parse(JSON.stringify(metaState())),false);
    if(r.ok){log('学会了'+ITEMS[id].name+'，本存档中不再需要随身携带。','good');change();}return r;
  }
  // 背包/仓库满了：红字日志容易被忽略，这里额外弹一个提醒（每次间隔至少 1 小时游戏时间，避免刷屏）
  function notifyBagFull() {
    if (S._bagFullAt !== undefined && (S.tick || 0) - S._bagFullAt < 60) return;
    S._bagFullAt = S.tick || 0;
    showOverlay({
      title: '背包已满',
      text: `背包装不下了：${capUsed()}/${capacity()} 格。\n\n· 回营地存进仓库，或丢弃不需要的东西\n· 更换容量更大的背包\n· 采集和战斗掉落仍可收入；超载会增加移动体力消耗`,
      choices: [{label:'整理背包',ok:()=>onOverlay&&onOverlay({kind:'inv'})},{ label: '知道了', ok: () => {} }],
    });
  }
  // 危险状态醒目提示：生命 <30 且（饱食 <30 或水分 <30）时，每个游戏日只弹一次（跨日可再弹）。
  // 旧档没有 S.dangerTipDay 字段 → undefined，天然兼容（只新增字段，不迁移旧数据）。
  function dangerTip() {
    if (!S || S.death || S.ending) return;
    const hp = S.stats && S.stats.hp, hu = S.stats && S.stats.hunger, th = S.stats && S.stats.thirst;
    if (!(hp < 30) || !(hu < 30 || th < 30)) return;
    if (S.dangerTipDay === S.day) return;   // 今天已经弹过 → 不刷屏
    S.dangerTipDay = S.day;
    const parts = [];
    if (hu < 30) parts.push(`饱食仅 ${Math.round(hu)}`);
    if (th < 30) parts.push(`水分仅 ${Math.round(th)}`);
    showOverlay({
      kind: 'danger',
      title: '⚠ 状态危殆',
      text: `你的生命只剩 ${Math.round(hp)}，${parts.join('、')}——又饿/又渴又带伤，继续硬撑会出事。\n\n先吃点东西、喝口水、敷点药，把命稳住再动。`,
      choices: [{ label: '我这就去补充', ok: () => {} }],
    });
    log(`警告：生命 ${Math.round(hp)}、${parts.join('、')}，状态危殆。`, 'warn');
  }
  function foodLots(id, count=invCount(id)) {
    S.foodBatches = S.foodBatches || {};
    let lots = (S.foodBatches[id] || []).filter(x => Number.isSafeInteger(x.qty) && x.qty > 0 && Number.isFinite(x.exp)).map(x=>({...x}));
    lots.sort((a,b)=>a.exp-b.exp);
    const sum=lots.reduce((n,x)=>n+x.qty,0);
    if(sum < count) lots.push({qty:count-sum,exp:(S.foodExp && S.foodExp[id]) || (S.tick||0)+(ITEMS[id].spoil||24)*120});
    if(sum > count) { let extra=sum-count; for(let i=lots.length-1;i>=0 && extra;i--) { const n=Math.min(extra,lots[i].qty);lots[i].qty-=n;extra-=n; } }
    return lots.filter(x=>x.qty>0).sort((a,b)=>a.exp-b.exp);
  }
  function syncFood(id,lots) {
    S.foodBatches=S.foodBatches||{}; S.foodExp=S.foodExp||{};
    if(lots.length) { S.foodBatches[id]=lots; S.foodExp[id]=Math.min(...lots.map(x=>x.exp)); }
    else { delete S.foodBatches[id];delete S.foodExp[id]; }
  }
  function foodFreshness(id) { return ITEMS[id] && ITEMS[id].spoil ? foodLots(id).map(x=>({qty:x.qty,minutes:Math.max(0,x.exp-(S.tick||0))})) : []; }
  function addItem(id, qty, silent, allowOverflow=false) {
    qty = Math.floor(qty);
    if (qty <= 0) return true;
    const it = ITEMS[id];
    if (!it) { console.warn('unknown item', id); return false; }
    const capNow = capacity();
    // ⚠️ 容量判定必须和界面显示的 capUsed() 用同一套算法：箭矢/弹药每50个算1格，其余可堆叠每20个算1格，stack:1一件1格；货币/图纸/主线物品不占格。
    //    旧写法用的是 Object.keys(S.inv).length（"物品种类数"），和 capUsed() 完全不是一回事：
    //    堆叠的格子没被算进去 → 背包早就超了、满格判定却还以为没满 → 新东西照收（背包无限膨胀），
    //    制作/购买时产物又因为"种类数满了"被拒 → 材料白扣、钱白花、东西凭空消失。
    const usedSlots = capUsed();
    // 卡主线的关键道具（石板/遗物/龙骨）不受容量限制，绝不会因为背包满而被卡住
    const fits = it.alwaysFit || it.cat === 'currency' || it.cat === 'bp';   // 图纸同样不占格子（背包满也收得下）
    const before = S.inv[id] || 0;
    const noSlot = it.cat === 'bp' || it.cat === 'currency' || it.alwaysFit;
    const slotsBefore = noSlot ? 0 : it.stack === 1 ? before : Math.ceil(before / stackSize(id));
    const slotsAfter = noSlot ? 0 : it.stack === 1 ? before + qty : Math.ceil((before + qty) / stackSize(id));
    if (!allowOverflow && !fits && usedSlots + slotsAfter - slotsBefore > capNow) {
      if (!silent) { log('你的背包容量已达上限！', 'danger'); notifyBagFull(); }
      return false;
    }
    if (S.inv[id]) {
      S.inv[id] += qty;
    } else {
      S.inv[id] = qty;
    }
    if (!S.seen[id]) { S.seen[id] = 1; const mm = metaState(); if (ITEMS[id].cat === 'mat' || ITEMS[id].cat === 'special' || ITEMS[id].cat === 'bp' || ITEMS[id].cat === 'seed') { mm.seenItems[id] = 1; metaSave(); } if (!silent) log(`「图鉴」发现了：${it.name}`, 'sys'); }
    // 保鲜系统：易腐食物记录到期时刻；晾肉架可让肉/鱼保鲜 +50%
    if (it.spoil) {
      const lots=foodLots(id,S.inv[id]-qty);
      let h=it.spoil*2;
      if(S.furniture.rack && (id==='meat'||id==='fish')) h=Math.round(h*1.5);
      const exp=(S.tick||0)+h*60;
      const same=lots.find(x=>x.exp===exp);
      if(same) same.qty+=qty; else lots.push({qty,exp});
      syncFood(id,lots.sort((a,b)=>a.exp-b.exp));
    }
    if (DURA[id] !== undefined) {
      S.dur = S.dur || {}; S.toolDurs = S.toolDurs || {};
      if (ITEMS[id] && ITEMS[id].stack === 1) { const a = S.toolDurs[id] = S.toolDurs[id] || []; for (let i = 0; i < qty; i++) a.push(DURA[id]); }   // 造几件就记几条实例耐久
      else S.dur[id] = DURA[id];
      durSync(id);
    }
    return true;
  }
  // ---- 同名多件的耐久：每件单独记在 toolDurs 数组里；S.dur 只作旧代码兼容，取"最快会坏的那件" ----
  function durList(id) {
    if (DURA[id] === undefined) return null;
    if (!S.inv) S.inv = {};
    if (!S.toolDurs) S.toolDurs = {};
    let a = S.toolDurs[id];
    if (!Array.isArray(a)) a = S.toolDurs[id] = [];
    const n = invCount(id);
    if (!a.length && n > 0 && S.dur && S.dur[id] !== undefined) a.push(Math.max(keepsBroken(id) ? 0 : 1, Math.min(S.dur[id], DURA[id])));   // 老存档保留收藏武器的 0 耐久
    while (a.length < n) a.push(DURA[id]);
    if (a.length > n) a.length = n;
    S.toolMaxDurs = S.toolMaxDurs || {};
    const maxima = S.toolMaxDurs[id] = Array.isArray(S.toolMaxDurs[id]) ? S.toolMaxDurs[id] : [];
    while (maxima.length < n) maxima.push(DURA[id]);
    if (maxima.length > n) maxima.length = n;
    return a;
  }
  function durMaxOf(id, idx) {
    if (DURA[id] === undefined) return null;
    durList(id);
    const a = S.toolMaxDurs && S.toolMaxDurs[id];
    return a && a.length ? (a[idx === undefined ? 0 : idx] || DURA[id]) : DURA[id];
  }
  function durSync(id) {
    const a = durList(id);
    if (!a) return;
    S.dur = S.dur || {};
    if (a.length) S.dur[id] = Math.min.apply(null, a); else delete S.dur[id];
  }
  function fixEquipIdx(id) {   // 卖掉/用坏一件后，把装备槽的实例索引收回有效范围
    if (!S.equipment || !S.equipIdx) return;
    const n = invCount(id);
    for (const s of ['weapon','weapon2','armor','cloth','accessory']) {
      if (S.equipment[s] !== id) continue;
      if (n <= 0) { S.equipment[s] = null; S.equipIdx[s] = 0; }
      else if ((S.equipIdx[s] || 0) > n - 1) S.equipIdx[s] = n - 1;
    }
  }
  function removeItem(id, qty, opts) {
    if (!hasItem(id, qty)) return false;
    if (DURA[id] !== undefined) durList(id); // 删除前对齐旧档的实例与上限索引
    if(ITEMS[id] && ITEMS[id].spoil) {
      const lots=foodLots(id); let left=qty;
      for(const lot of lots) { const n=Math.min(left,lot.qty);lot.qty-=n;left-=n; }
      syncFood(id,lots.filter(x=>x.qty>0));
    }
    S.inv[id] -= qty;
    const a = S.toolDurs && S.toolDurs[id];
    const maxa = S.toolMaxDurs && S.toolMaxDurs[id];
    if (a) {
      if (opts && opts.durIdx !== undefined) { a.splice(opts.durIdx, 1); if (maxa) maxa.splice(opts.durIdx, 1); }
      else for (let n = 0; n < qty && a.length; n++) { let mi = 0; for (let i = 1; i < a.length; i++) if (a[i] < a[mi]) mi = i; a.splice(mi, 1); if (maxa) maxa.splice(mi, 1); }   // 默认先消耗最快会坏的那件
      if (!a.length) delete S.toolDurs[id];
      if (maxa && !maxa.length) delete S.toolMaxDurs[id];
    }
    if (S.inv[id] <= 0) { delete S.inv[id]; if (DURA[id] !== undefined && S.dur) delete S.dur[id]; }
    if (DURA[id] !== undefined) { durSync(id); fixEquipIdx(id); }
    return true;
  }
  function durOf(id, idx) {
    const a = durList(id);
    if (a && a.length) { if (idx !== undefined && a[idx] !== undefined) return a[idx]; return Math.min.apply(null, a); }
    return (S.dur && S.dur[id] !== undefined) ? S.dur[id] : (DURA[id] !== undefined ? DURA[id] : null);
  }
  // 损耗指定工具/武器：id 见 DURA；kind 用于"用最好的那把"（axe/pick/knife/hoe/rod/net）
  // 只决定本次使用哪一件，不改手动工具槽；默认手动，自动模式由设置明确开启。
  function selectedTool(kind, automatic=!!S?.settings?.autoTools) {
    if (!S) return null;
    const equipped = (S.toolkit || []).filter(Boolean), choices=[];
    const ids = automatic ? Object.keys(S.inv || {}) : equipped;
    for (const id of ids) {
      const t=ITEMS[id]?.tool;
      if(t?.kind!==kind || invCount(id)<1 || (DURA[id]!==undefined && !(durList(id)||[]).some(d=>d>0))) continue;
      choices.push({id,tier:t.tier||1,source:'bag',priority:equipped.includes(id)?0:1});
    }
    if(automatic && warehouseAccess() && warehouseCapacity()>0) {
      const site=warehouseSite();
      for(const record of supplyContainer(site)?.items || []) {
        const t=ITEMS[record.id]?.tool;
        if(t?.kind!==kind || !(record.qty>0) || (DURA[record.id]!==undefined && !((record.dur ?? DURA[record.id])>0))) continue;
        choices.push({id:record.id,tier:t.tier||1,source:site,priority:2,record});
      }
    }
    choices.sort((a,b)=>b.tier-a.tier || a.priority-b.priority);
    return choices[0] || null;
  }
  function bestToolTier(kind) { return selectedTool(kind)?.tier || 1; }
  function autoToolsEnabled() { return !!S?.settings?.autoTools; }
  function setAutoTools(enabled) {
    if(!S || S.combat || S.death || S.ending) return {ok:false,reason:'现在无法更改工具选择。'};
    const before=S.settings;S.settings={...(before||{}),autoTools:!!enabled};
    const result=save();if(!result.ok){S.settings=before;return result;}
    change();return {ok:true};
  }
  function wearSelectedTool(tool) {
    if(!tool)return;
    if(tool.source==='bag'){drainById(tool.id);return;}
    const rows=supplyContainer(tool.source)?.items,rec=tool.record;
    if(!rows?.includes(rec) || DURA[tool.id]===undefined || !(rec.qty>0))return;
    const dur=rec.dur ?? DURA[tool.id];if(dur<=0)return;
    // 仓库耐久品逐实例记录；保留损坏收藏/命名品，其余按原工具规则损坏消耗。
    if(rec.qty>1){rec.qty--;const one={...rec,qty:1};rows.push(one);tool={...tool,record:one};wearSelectedTool(tool);return;}
    rec.dur=dur-1;
    if(rec.dur<=0){recordBroken(tool.id);if(!keepsBroken(tool.id))rows.splice(rows.indexOf(rec),1);log(`仓库中的${ITEMS[tool.id].name}用坏了！`,'orange');}
  }
  function autoToolkit() {
    if (!Array.isArray(S.toolkit)) S.toolkit = [null, null, null];
    const present = new Set(S.toolkit.filter(Boolean).map(id => ITEMS[id].tool.kind));
    for (let i = 0; i < S.toolkit.length; i++) {
      if (S.toolkit[i] || S.toolkitManualEmpty?.[i]) continue;
      for (const id in S.inv) { const t = ITEMS[id] && ITEMS[id].tool; if (t && !S.toolkitManualKinds?.[t.kind] && invCount(id) > 0 && (DURA[id] === undefined || (durList(id) || []).some(d => d > 0)) && !present.has(t.kind)) { S.toolkit[i] = id; present.add(t.kind); break; } }
    }
  }
  // 工具栏跟背包对齐：工具用坏被移出背包后，栏里不能还挂着它（玩家反馈"石斧耐久没了还挂在装备栏"）。
  // 清掉之后再把背包里同款的备用工具自动顶上 —— 就是玩家期望的"用完自动接着装"。
  function syncToolkit() {
    if (!Array.isArray(S.toolkit)) return;
    let cleared = false;
    for (let i = 0; i < S.toolkit.length; i++) {
      const id = S.toolkit[i];
      if (id && (!ITEMS[id] || !ITEMS[id].tool || invCount(id) <= 0 || (DURA[id] !== undefined && !(durList(id) || []).some(d => d > 0)))) { S.toolkit[i] = null; cleared = true; }
    }
    // ⚠️ 只有真的清掉坏工具时才去补位。平时别顺手 autoToolkit()：
    //    那会在开局就把空格填上第一件工具，之后新做出来的工具反而进不了栏
    //    （"斧头做了却砍不了树"就是这么来的）。
    if (cleared) autoToolkit();
  }
  function equipTool(id) {
    const t = ITEMS[id] && ITEMS[id].tool;
    if (!t) return { ok:false, reason:'这不是工具' };
    if (!hasItem(id) || (DURA[id] !== undefined && !(durList(id) || []).some(d => d > 0))) return {ok:false,reason:'工具已损坏，请先修补'};
    if (S.toolkit.includes(id)) return { ok:false, reason:'已在工具栏' };
    // 同 kind 占据的槽 → 换掉；否则用空槽
    let slot = S.toolkit.findIndex(k => k && ITEMS[k].tool.kind === t.kind);
    if (slot < 0) slot = S.toolkit.indexOf(null);
    if (slot < 0) return { ok:false, reason:'工具栏已满（3格），先卸下一件' };
    const old = S.toolkit[slot]; S.toolkit[slot] = id;
    if (S.toolkitManualEmpty) S.toolkitManualEmpty[slot] = false;
    if (S.toolkitManualKinds) delete S.toolkitManualKinds[t.kind];
    log(`工具栏${old ? `${ITEMS[old].name}换为` : '装备了'}${ITEMS[id].name}。`, 'sys');
    if (S.tut === 2 && S.toolkit.some(t => t && ITEMS[t] && ITEMS[t].tool)) S.tut = null;   // 引导完成
    change(); return { ok:true };
  }
  function unequipTool(id) {
    const i = S.toolkit.indexOf(id);
    if (i < 0) return { ok:false, reason:'不在工具栏' };
    S.toolkit[i] = null;
    // 手动空位随存档保留，读档、采集和其他工具损坏补位时不自动装回来。
    if (!Array.isArray(S.toolkitManualEmpty)) S.toolkitManualEmpty = [];
    S.toolkitManualEmpty[i] = true;
    S.toolkitManualKinds = S.toolkitManualKinds || {};
    S.toolkitManualKinds[ITEMS[id].tool.kind] = true;
    log(`把${ITEMS[id].name}收回了背包。`, 'sys'); change(); return { ok:true };
  }
  function drainTool(kind) {
    if(autoToolsEnabled()){wearSelectedTool(selectedTool(kind));return;}
    // ⚠️ 采集用的是【工具栏里的】工具：bestToolTier() 和 hasTool() 都只看 S.toolkit。
    //    所以磨损也必须扣工具栏里那把 —— 以前这里从整个背包挑等级最高的，
    //    于是"栏里装石斧、背包里放钢斧"时扣的是背包那把的耐久（玩家反馈"扣耐久扣的不是装备上去的"）。
    const inKit = (S.toolkit || []).filter(id => id && ITEMS[id] && ITEMS[id].tool && ITEMS[id].tool.kind === kind && invCount(id) > 0);
    if (inKit.length) {
      inKit.sort((a, b) => (ITEMS[b].tool.tier || 1) - (ITEMS[a].tool.tier || 1));
      drainById(inKit[0]);   // 只消耗一件（按实例），坏了会自动从背包补同款（drainById 里已 syncToolkit）
      return;
    }
    // 兜底：栏里没有这种工具（刚做出来还没装、老存档）→ 还是按"背包里最好的那把"
    const ids = Object.keys(S.inv).filter(k => ITEMS[k] && ITEMS[k].tool && ITEMS[k].tool.kind === kind);
    if (!ids.length) return;
    ids.sort((a,b) => (ITEMS[b].tool.tier||1) - (ITEMS[a].tool.tier||1));
    drainById(ids[0]);
  }
  let _swingTurn = 0;
  // 双持近战时，"本轮轮到哪把武器出手"。伤害、耐久磨损、日志标注三处都读这里，
  // 保证"用哪把打 → 扣哪把耐久 → 日志写哪把"永远一致。
  function weaponTurnSlot() {
    const w = S.equipment.weapon ? ITEMS[S.equipment.weapon] : null;
    const w2 = S.equipment.weapon2 ? ITEMS[S.equipment.weapon2] : null;
    if (meleeWeapons().length >= 2) return (_swingTurn % 2 === 0) ? 'weapon' : 'weapon2';
    if (w && !w.ranged) return 'weapon';
    if (w2 && !w2.ranged) return 'weapon2';
    return S.equipment.weapon ? 'weapon' : 'weapon2';
  }
  function meleeWeaponNow() {
    const id = S.equipment[weaponTurnSlot()];
    const it = id ? ITEMS[id] : null;
    return (it && it.cat !== 'shield' && !it.ranged) ? it : null;
  }
  function drainWeapon() {
    const me = meleeWeapons();
    const slot = weaponTurnSlot();
    if (me.length >= 2) _swingTurn = (_swingTurn + 1) % 2;   // 双近战：轮流出手（每挥一次换手）
    drainEquipSlot(slot);
  }
  // 磨损"某个装备槽里那把"——近战挥砍和远程开火共用这一份逻辑。
  // ⚠️ 以前只有近战会调这里：弓/手枪开火只扣弹药、本体永远不坏
  //    （玩家反馈"神弓怎么不掉耐久"，而且邮件里那把是带着剩余耐久流转的）。
  function recordBroken(id) {if(S.combat){S.combat.brokenItems=S.combat.brokenItems || [];if(!S.combat.brokenItems.includes(id))S.combat.brokenItems.push(id);}}
  function drainEquipSlot(slot) {
    const id = S.equipment[slot];
    if (!id || DURA[id] === undefined) return;
    const it = ITEMS[id];
    if (it.cat === 'shield') return;   // 盾的耐久在格挡时单独扣
    const durs = durList(id);
    const ei = Math.min((S.equipIdx && S.equipIdx[slot]) || 0, Math.max(0, (durs || []).length - 1));   // 装备槽对应的实例索引
    const named = S.weaponNames && S.weaponNames[id];   // 已命名的武器：耐久归零不消失
    // 限定/绝版物品（神弓 keepBroken）同样不许"用坏就永久消失"：
    // 活动 26.9.30 结束后再也造不出来，直接删掉等于玩家白玩一场。
    // 归零后保留在背包、自动卸下；神弓作为收藏保留，但不能修复。
    const keep = !!(named || it.keepBroken);
    const keepMsg = named && id !== 'divineBow'
      ? `${ITEMS[id].name}损坏了（你命名的武器，不会消失），用磨刀石修补后再用。`
      : `${ITEMS[id].name}耐久耗尽，已自动卸下；它会留在背包中作收藏，无法修复。`;
    if (durs && durs.length) {
      const cur = durs[ei] !== undefined ? durs[ei] : durs[0];
      if (cur - 1 <= 0) {recordBroken(id);
        if (keep) { durs[ei] = 0; S.dur[id] = 0; S.equipment[slot] = null; log(keepMsg, 'orange'); diaryAdd(`我的${ITEMS[id].name}受损了。`); }
        else { removeItem(id, 1, { durIdx: ei }); S.equipment[slot] = null; log(`你的${ITEMS[id].name}在战斗中折断了！`, 'orange'); diaryAdd(`我的${ITEMS[id].name}断了。`); }
      }
      else { durs[ei] = cur - 1; durSync(id); }
    } else {
      const cur = S.dur[id] !== undefined ? S.dur[id] : DURA[id];
      if (cur - 1 <= 0) {recordBroken(id); if (keep) { S.dur[id]=0; S.equipment[slot] = null; log(keepMsg, 'orange'); diaryAdd(`我的${ITEMS[id].name}受损了。`); } else { removeItem(id, 1); S.equipment[slot] = null; log(`你的${ITEMS[id].name}在战斗中折断了！`, 'orange'); diaryAdd(`我的${ITEMS[id].name}断了。`); } }
      else S.dur[id] = cur - 1;
    }
    // 自动顶上备用武器时，跳过那些已经打坏的（耐久 0 的会"一装备就又坏"，等于白骗玩家一次）
    // ⚠️ 还要跳过弹药：箭矢/鹰羽箭的 cat 也是 'weapon'，以前弓一打坏，系统会把背包里的
    //    「箭矢」当成备用武器给你装备上（日志写"你迅速换上了箭矢继续战斗"），主手就变成了一把箭。
    if ((slot === 'weapon' || slot === 'weapon2') && S.equipment[slot] === null) { const next = Object.keys(S.inv).filter(k => ITEMS[k] && ITEMS[k].cat === 'weapon' && !ITEMS[k].ammo && (DURA[k] === undefined || (durOf(k) || 0) > 0)).sort((a,b) => (ITEMS[b].atk||0) - (ITEMS[a].atk||0))[0]; if (next && !(S.equipment.weapon === next || S.equipment.weapon2 === next)) { S.equipment[slot] = next; log(`你迅速换上了${ITEMS[next].name}继续战斗。`, 'good'); } }
  }
  function drainById(id) {
    if (!invCount(id) || DURA[id] === undefined) return;
    const durs = durList(id);
    if (durs && durs.length) {   // 按实例：先用耐久最低的那件（让它先坏）
      let mi = -1; for (let i = 0; i < durs.length; i++) if (durs[i] > 0 && (mi < 0 || durs[i] < durs[mi])) mi = i;
      if (mi < 0) return;
      const cur = durs[mi];
      if (cur - 1 <= 0) {recordBroken(id);
        if (keepsBroken(id)) {
          durs[mi] = 0; durSync(id);
          for (const slot of Object.keys(S.equipment || {})) if (S.equipment[slot] === id && ((S.equipIdx || {})[slot] || 0) === mi) S.equipment[slot] = null;
          log(`${wNameOf(id)}耐久耗尽，已保留在背包中${id === 'divineBow' ? '作收藏，无法修复' : '，可到磨刀石修补'}。`, 'orange');
        } else { removeItem(id, 1, { durIdx: mi }); log(`你的${ITEMS[id].name}用坏了！`, 'orange'); }
        syncToolkit();
      }
      else { durs[mi] = cur - 1; durSync(id); }
      return;
    }
    const cur = S.dur[id] !== undefined ? S.dur[id] : DURA[id];
    if (cur - 1 <= 0) {recordBroken(id); removeItem(id, 1); syncToolkit(); log(`你的${ITEMS[id].name}用坏了！`, 'orange'); }
    else S.dur[id] = cur - 1;
  }
  function keepsBroken(id) { return !!((ITEMS[id] && ITEMS[id].keepBroken) || (S.weaponNames && S.weaponNames[id])); }
  // 货币/图纸/主线物品不占容量；工具装备一件 1 格；普通堆叠每 20 件 1 格。
  let inventoryTransfer=false;
  function capUsed() {
    let n = 0;
    for (const id in S.inv) {
      if (!(S.inv[id] > 0)) continue;
      const it = ITEMS[id];
      if (it && (it.cat === 'bp' || it.cat === 'currency' || it.alwaysFit)) continue;
      n += (it && it.stack === 1) ? S.inv[id] : Math.ceil(S.inv[id] / stackSize(id));
    }
    return n;
  }
  function capacity() {
    const base=S.capacity===20?(S.inventoryBaseSlots||15):(S.capacity||15);
    return base + metaBonus().bag + (invCount(S.backpack)>0?(ITEMS[S.backpack]?.packCapacity || 0):0);
  }
  // 存储中的到期食物也原地腐坏，不等取出才转换；不创建未解锁的仓库。
  function settleStoredFood() {
    if (!S) return;
    const tick = S.tick || 0;
    for (const store of [S.warehouse, S.cellar, S.atlantis?.camp?.warehouse]) {
      for (const rec of store?.items || []) {
        if (
          ITEMS[rec.id]?.spoil &&
          rec.expiry !== undefined &&
          rec.expiry <= tick
        ) {
          rec.id = 'rot';
          delete rec.expiry;
          S._dirty = true;
        }
      }
    }
  }
  function warehouseSite() {
    return S.scene === 'atlantis' ? 'sea' : 'island';
  }
  function stackSize(id) {
    return ITEMS[id]?.stack === 1 ? 1 : ITEMS[id]?.ammo === 1 ? 50 : 20;
  }
  function warehouseAccess() {
    return S.scene === 'camp' || (S.scene === 'atlantis' && S.zone === 'habitat');
  }
  function warehouseDepositAccess() {
    return (
      warehouseAccess() ||
      (invCount(S.backpack) > 0 && !!ITEMS[S.backpack]?.remoteWarehouse)
    );
  }
  function warehouseCapacity(site = warehouseSite()) {
    if (site === 'sea') {
      const f = atlantisCamp().furniture,
        base = f.seaStorage2 ? 40 : f.seaStorage1 ? 20 : 0;
      return base ? base + ((S.atlantis && S.atlantis.fishmanStorage) || 0) : 0;
    }
    return S.buildings.storage < 0
      ? 0
      : (BUILDING_CHAINS.storage[S.buildings.storage]?.cap || 15) +
          (S.storeExt || 0) * STORE_EXT_CAP;
  }
  function storedCounts(items) {
    const inv = {};
    for (const record of items)
      inv[record.id] = (inv[record.id] || 0) + record.qty;
    return inv;
  }
  function storedSlots(inv) {
    return Object.entries(inv).reduce((used, [id, count]) => {
      const item = ITEMS[id];
      if (item.cat === 'bp' || item.cat === 'currency' || item.alwaysFit)
        return used;
      return used + (item.stack === 1 ? count : Math.ceil(count / stackSize(id)));
    }, 0);
  }
  function warehouseState() {
    settleStoredFood();
    const site = warehouseSite();
    const place = site === 'sea' ? atlantisCamp() : S;
    const inv = storedCounts(place.warehouse?.items || []);
    return {
      inv,
      used: storedSlots(inv),
      capacity: warehouseCapacity(),
      site,
      accessible: warehouseAccess()
    };
  }
  function equipBackpack(id) {
    if (
      S.combat ||
      S.death ||
      S.ending ||
      (id !== null && (!ITEMS[id]?.packCapacity || !hasItem(id)))
    )
      return { ok: false, reason: '现在无法更换背包。' };
    S.backpack = id;
    log(id ? '换上' + ITEMS[id].name + '。' : '已卸下背包，原物品保留。', 'good');
    change();
    return { ok: true };
  }
  // 存仓保护实际占用的实例，不把所有同名备用件一起锁住。
  function warehouseReservedIndices(id) {
    const reserved = new Set(),
      n = invCount(id);
    for (const [slot, item] of Object.entries(S.equipment || {}))
      if (item === id && n > 0)
        reserved.add(Math.min(S.equipIdx?.[slot] || 0, n - 1));
    if ((S.toolkit || []).includes(id) && n > 0) {
      const durs = DURA[id] !== undefined ? durList(id) : null;
      let idx = 0;
      if (durs) {
        idx = -1;
        for (let i = 0; i < durs.length; i++)
          if (durs[i] > 0 && (idx < 0 || durs[i] < durs[idx])) idx = i;
      }
      if (idx >= 0) reserved.add(idx);
    }
    if (S.backpack === id && n > 0) reserved.add(0);
    return reserved;
  }
  function warehouseDepositCount(id) {
    return Math.max(0, invCount(id) - warehouseReservedIndices(id).size);
  }
  function warehouseAccessCheck(toStore = false) {
    if (S.death || S.ending || S.stats.hp <= 0)
      return { ok: false, reason: '这一局已经结束，无法存取。' };
    if (S.combat) return { ok: false, reason: '请先结束战斗再存取。' };
    if (warehouseCapacity() <= 0)
      return { ok: false, reason: '请先在当地营地建造储物箱。' };
    if (!(toStore ? warehouseDepositAccess() : warehouseAccess()))
      return {
        ok: false,
        reason: toStore ? '请回到营地存入。' : '请回到营地取出。'
      };
    return { ok: true };
  }
  function warehouseTransferMax(id, toStore) {
    const it = ITEMS[id];
    if (!it || !warehouseAccessCheck(toStore).ok) return 0;
    const w = warehouseState(),
      n = toStore ? warehouseDepositCount(id) : w.inv[id] || 0;
    if (toStore) {
      const cur = w.inv[id] || 0,
        free = Math.max(0, w.capacity - w.used);
      return Math.min(
        n,
        it.cat === 'bp' || it.cat === 'currency' || it.alwaysFit
          ? n
          : it.stack === 1
            ? free
            : free * stackSize(id) +
              (cur % stackSize(id) ? stackSize(id) - (cur % stackSize(id)) : 0)
      );
    }
    const free = Math.max(0, capacity() - capUsed()),
      counts = { ...S.inv };
    let fit = 0,
      used = 0;
    const rows =
      (warehouseSite() === 'sea' ? atlantisCamp() : S).warehouse?.items || [];
    for (const rec of rows.filter((x) => x.id === id)) {
      const out =
          rec.expiry !== undefined && rec.expiry <= nowTick() ? 'rot' : id,
        oi = ITEMS[out];
      for (let i = 0; i < rec.qty; i++) {
        const before = counts[out] || 0,
          delta =
            oi.cat === 'bp' || oi.cat === 'currency' || oi.alwaysFit
              ? 0
              : oi.stack === 1
                ? 1
                : Math.ceil((before + 1) / stackSize(out)) -
                  Math.ceil(before / stackSize(out));
        if (delta > free - used) return fit;
        counts[out] = before + 1;
        fit++;
        used += delta;
      }
    }
    return fit;
  }
  // 所有手动库存搬运使用同一事务边界：先在副本上操作，写盘成功才提交。
  // 玩法函数只负责校验与搬运，不各自维护回滚标志。
  function commitInventoryTransfer(move) {
    const originalState = S,
      originalMeta = M;
    const next = JSON.parse(JSON.stringify(S));
    const meta = JSON.parse(JSON.stringify(metaState()));
    const previousStaging = staging,
      previousTransfer = inventoryTransfer;
    S = next;
    M = meta;
    staging = true;
    inventoryTransfer = true;
    try {
      move(next);
    } catch (error) {
      return { ok: false, reason: error.message };
    } finally {
      S = originalState;
      M = originalMeta;
      staging = previousStaging;
      inventoryTransfer = previousTransfer;
    }
    return persistPair(next, meta, false);
  }

  function transferWarehouse(id, qty, toStore) {
    const access = warehouseAccessCheck(toStore);
    if (!access.ok) return access;
    if (
      !ITEMS[id] ||
      !Number.isInteger(qty) ||
      qty < 1 ||
      !Number.isSafeInteger(qty)
    )
      return { ok: false, reason: '数量无效。' };
    if (toStore && qty > warehouseDepositCount(id))
      return {
        ok: false,
        reason: '正在装备的那件需保留，仅可存入同款备用物品。'
      };
    const max = warehouseTransferMax(id, toStore);
    if (qty > max)
      return {
        ok: false,
        max,
        reason:
          '最多还能' +
          (toStore ? '存入' : '取出') +
          max +
          '份；' +
          (toStore ? '仓库' : '背包') +
          '空间不足。'
      };
    const r = commitInventoryTransfer((next) => {
      const place = warehouseSite() === 'sea' ? atlantisCamp() : next;
      place.warehouse = place.warehouse || { items: [] };
      const items = place.warehouse.items;
      const count = toStore
        ? invCount(id)
        : items.filter((x) => x.id === id).reduce((n, x) => n + x.qty, 0);
      if (count < qty) throw Error('物品不足。');
      for (let i = 0; i < qty; i++) {
        if (toStore) {
          const reserved = warehouseReservedIndices(id);
          let idx = 0;
          while (reserved.has(idx)) idx++;
          const equipIndices = Object.fromEntries(
            Object.entries(S.equipment || {})
              .filter(([, item]) => item === id)
              .map(([slot]) => [slot, S.equipIdx?.[slot] || 0])
          );
          const rec = { id, qty: 1 };
          if (DURA[id] !== undefined) {
            rec.dur = durOf(id, idx);
            rec.maxDur = durMaxOf(id, idx);
          }
          if (ITEMS[id].spoil) rec.expiry = foodLots(id)[0]?.exp;
          removeItem(id, 1, { durIdx: idx });
          for (const [slot, oldIdx] of Object.entries(equipIndices)) {
            S.equipIdx = S.equipIdx || {};
            S.equipIdx[slot] = oldIdx > idx ? oldIdx - 1 : oldIdx;
          }
          items.push(rec);
          if (warehouseState().used > warehouseCapacity())
            throw Error('仓库装不下了。');
        } else {
          const index = items.findIndex((x) => x.id === id),
            rec = items[index],
            out =
              rec.expiry !== undefined && rec.expiry <= (S.tick || 0)
                ? 'rot'
                : id;
          const lots = ITEMS[out].spoil
            ? JSON.parse(JSON.stringify(foodLots(out)))
            : null;
          if (!addItem(out, 1, true)) throw Error('背包装不下了。');
          if (rec.dur !== undefined) {
            const n = invCount(out) - 1;
            S.toolDurs[out][n] = rec.dur;
            S.toolMaxDurs[out][n] = rec.maxDur;
            durSync(out);
          }
          if (lots) {
            lots.push({ qty: 1, exp: rec.expiry });
            syncFood(
              out,
              lots.sort((a, b) => a.exp - b.exp)
            );
          }
          rec.qty--;
          if (!rec.qty) items.splice(index, 1);
        }
      }
    });
    if (r.ok) {
      r.moved = qty;
      log(`${toStore ? '存入仓库' : '取出'}：${ITEMS[id].name}×${qty}。`, 'good');
      change();
    }
    return r;
  }
  function cellarBuilt() {
    return (S.buildings.cellar ?? -1) >= 0 || !!S.furniture.cellar;
  }
  function cellarAccess() {
    return (
      cellarBuilt() && S.scene === 'camp' && !S.combat && !S.death && !S.ending
    );
  }
  function cellarState() {
    settleStoredFood();
    const items = S.cellar?.items || [],
      inv = storedCounts(items);
    const used = Object.values(inv).reduce(
      (total, count) => total + Math.ceil(count / 20),
      0
    );
    return {
      inv,
      used,
      capacity: cellarBuilt() ? 20 : 0,
      items,
      accessible: cellarAccess()
    };
  }
  function cellarTransferMax(id, toStore) {
    if (
      !cellarAccess() ||
      !(['food', 'drink'].includes(ITEMS[id]?.cat) || (!toStore && id === 'rot'))
    )
      return 0;
    const c = cellarState();
    if (toStore) {
      const n = c.inv[id] || 0;
      return Math.min(
        invCount(id),
        (20 - c.used) * 20 + (n % 20 ? 20 - (n % 20) : 0)
      );
    }
    const counts = { ...S.inv };
    let free = Math.max(0, capacity() - capUsed()),
      fit = 0;
    for (const r of c.items.filter((x) => x.id === id))
      for (let i = 0; i < r.qty; i++) {
        const out = r.expiry !== undefined && r.expiry <= nowTick() ? 'rot' : id,
          n = counts[out] || 0,
          delta = Math.ceil((n + 1) / 20) - Math.ceil(n / stackSize(id));
        if (delta > free) return fit;
        free -= delta;
        counts[out] = n + 1;
        fit++;
      }
    return fit;
  }
  function transferCellar(id, qty, toStore) {
    if (!cellarAccess())
      return { ok: false, reason: '请在营地使用已建好的地窖。' };
    if (
      !ITEMS[id] ||
      !(['food', 'drink'].includes(ITEMS[id].cat) || (!toStore && id === 'rot'))
    )
      return { ok: false, reason: '地窖只能存放食物和饮品。' };
    const count = toStore ? invCount(id) : cellarState().inv[id] || 0;
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > count)
      return { ok: false, reason: '物品数量不足。' };
    const max = cellarTransferMax(id, toStore);
    if (qty > max)
      return {
        ok: false,
        reason: '最多还能' + (toStore ? '存入' : '取出') + max + '份。'
      };
    const r = commitInventoryTransfer((next) => {
      S.cellar = S.cellar || { items: [] };
      const rows = S.cellar.items;
      for (let i = 0; i < qty; i++) {
        if (toStore) {
          const exp = ITEMS[id].spoil ? foodLots(id)[0]?.exp : undefined;
          if (exp !== undefined && exp <= nowTick())
            throw Error('腐坏食物不能放入地窖。');
          const expiry =
            exp === undefined ? undefined : nowTick() + (exp - nowTick()) * 3;
          removeItem(id, 1);
          const rec = rows.find((x) => x.id === id && x.expiry === expiry);
          if (rec) rec.qty++;
          else
            rows.push(
              expiry === undefined ? { id, qty: 1 } : { id, qty: 1, expiry }
            );
          if (cellarState().used > 20) throw Error('地窖最多20格，空间不足。');
        } else {
          const rec = rows
              .filter((x) => x.id === id)
              .sort((a, b) => (a.expiry ?? Infinity) - (b.expiry ?? Infinity))[0],
            out =
              rec.expiry !== undefined && rec.expiry <= nowTick() ? 'rot' : id,
            lots = ITEMS[out].spoil
              ? JSON.parse(JSON.stringify(foodLots(out)))
              : null;
          if (!addItem(out, 1, true)) throw Error('背包装不下了。');
          if (lots) {
            lots.push({
              qty: 1,
              exp:
                rec.expiry === undefined
                  ? foodLots(out).at(-1).exp
                  : nowTick() + (rec.expiry - nowTick()) / 3
            });
            syncFood(
              out,
              lots.sort((a, b) => a.exp - b.exp)
            );
          }
          rec.qty--;
          if (!rec.qty) rows.splice(rows.indexOf(rec), 1);
        }
      }
    });
    if (r.ok) {
      r.moved = qty;
      log(
        (toStore ? '存入地窖' : '取出地窖') +
          '：' +
          ITEMS[id].name +
          '×' +
          qty +
          '。',
        'good'
      );
      change();
    }
    return r;
  }
  function satchelEligible(id,kind) { return foodSatchel.satchelEligible(id,kind); }
  function satchelSelections(kind) { return foodSatchel.satchelSelections(kind); }
  function setSatchelSelections(kind,ids) { return foodSatchel.setSatchelSelections(kind,ids); }
  function toggleSatchelSelection(kind,id) { return foodSatchel.toggleSatchelSelection(kind,id); }
  function satchelStatus() { return foodSatchel.satchelStatus(); }
  function satchelAvailable() { return foodSatchel.satchelAvailable(); }
  function discardItems(id, qty, fromWarehouse = false) {
    if (S.combat || S.death || S.ending)
      return { ok: false, reason: '现在不能丢弃物品。' };
    if (fromWarehouse === 'cellar') {
      if (!cellarAccess()) return { ok: false, reason: '请回营地使用地窖。' };
    } else if (fromWarehouse) {
      const a = warehouseAccessCheck(false);
      if (!a.ok) return a;
    }
    const count =
      fromWarehouse === 'cellar'
        ? cellarState().inv[id] || 0
        : fromWarehouse
          ? warehouseState().inv[id] || 0
          : warehouseDepositCount(id);
    if (!ITEMS[id] || !Number.isSafeInteger(qty) || qty < 1 || qty > count)
      return { ok: false, reason: '数量不足，或需要保留正在装备的物品。' };
    const r = commitInventoryTransfer((next) => {
      if (fromWarehouse) {
        const rows =
          fromWarehouse === 'cellar'
            ? S.cellar.items
            : (warehouseSite() === 'sea' ? atlantisCamp() : S).warehouse.items;
        let left = qty;
        for (const r of rows
          .filter((x) => x.id === id)
          .sort((a, b) => (a.expiry ?? Infinity) - (b.expiry ?? Infinity))) {
          const n = Math.min(left, r.qty);
          r.qty -= n;
          left -= n;
          if (!r.qty) rows.splice(rows.indexOf(r), 1);
          if (!left) break;
        }
      } else
        for (let i = 0; i < qty; i++) {
          const reserved = warehouseReservedIndices(id);
          let idx = 0;
          while (reserved.has(idx)) idx++;
          const indices = Object.fromEntries(
            Object.entries(S.equipment || {})
              .filter(([, item]) => item === id)
              .map(([slot]) => [slot, S.equipIdx?.[slot] || 0])
          );
          if (!removeItem(id, 1, { durIdx: idx }))
            throw Error('物品数量已变化。');
          for (const [slot, oldIdx] of Object.entries(indices))
            S.equipIdx[slot] = oldIdx > idx ? oldIdx - 1 : oldIdx;
        }
    });
    if (r.ok) {
      r.moved = qty;
      log('丢弃了' + ITEMS[id].name + '×' + qty + '。', 'warn');
      change();
    }
    return r;
  }
  function storeAllWarehouse() {
    if (
      !warehouseDepositAccess() ||
      warehouseCapacity() <= 0 ||
      S.combat ||
      S.death ||
      S.ending
    )
      return { ok: false, moved: 0, reason: '现在无法存入仓库。' };
    let moved = 0;
    for (const id of Object.keys(S.inv)) {
      const it = ITEMS[id];
      if (
        ['currency', 'bp', 'food', 'drink', 'med'].includes(it.cat) ||
        it.alwaysFit
      )
        continue;
      const w = warehouseState(),
        current = w.inv[id] || 0,
        free = Math.max(0, w.capacity - w.used),
        per = stackSize(id);
      const room =
        it.cat === 'bp' || it.cat === 'currency' || it.alwaysFit
          ? invCount(id)
          : free * per + (current % per ? per - (current % per) : 0);
      const qty = Math.min(warehouseDepositCount(id), room);
      if (!qty) continue;
      const r = transferWarehouse(id, qty, true);
      if (!r.ok)
        return {
          ok: false,
          moved,
          reason: (moved ? '已存入' + moved + '份；' : '') + r.reason
        };
      moved += qty;
    }
    return {
      ok: true,
      moved,
      reason: moved
        ? '已存入' + moved + '份物品，食物、饮品、药品及正在使用的装备留在背包。'
        : '没有可存物品或仓库已满（食物、饮品和药品保留）。'
    };
  }
  function warehouseAutoEligible(id) {
    return (
      !!ITEMS[id] &&
      (['mat', 'food', 'drink', 'med', 'seed', 'ammo'].includes(ITEMS[id].cat) ||
        ITEMS[id].ammo === 1) &&
      !ITEMS[id].packCapacity
    );
  }
  function warehouseAutoItems() {
    const place = warehouseSite() === 'sea' ? atlantisCamp() : S;
    return (place.warehouse?.autoItems || []).filter(warehouseAutoEligible);
  }
  function setWarehouseAutoItems(ids) {
    if (
      !warehouseAccess() ||
      S.combat ||
      S.death ||
      S.ending ||
      !Array.isArray(ids)
    )
      return { ok: false, reason: '现在无法设置自动存入。' };
    const next = JSON.parse(JSON.stringify(S)),
      place = warehouseSite() === 'sea' ? next.atlantis.camp : next;
    place.warehouse = place.warehouse || { items: [] };
    place.warehouse.autoItems = [...new Set(ids.filter(warehouseAutoEligible))];
    return persistPair(next, JSON.parse(JSON.stringify(metaState())), false);
  }
  function autoStoreWarehouse() {
    if (
      !warehouseAccess() ||
      S.combat ||
      S.death ||
      S.ending ||
      warehouseCapacity() <= 0
    )
      return;
    let moved = 0;
    for (const id of warehouseAutoItems()) {
      const it = ITEMS[id],
        w = warehouseState(),
        current = w.inv[id] || 0,
        free = Math.max(0, w.capacity - w.used),
        per = stackSize(id);
      const room =
        it.cat === 'bp' || it.cat === 'currency' || it.alwaysFit
          ? invCount(id)
          : free * per + (current % per ? per - (current % per) : 0);
      const qty = Math.min(warehouseDepositCount(id), room);
      if (qty > 0) {
        const r = transferWarehouse(id, qty, true);
        if (!r.ok) return { ok: false, moved, reason: r.reason };
        moved += r.moved;
      }
    }
    return { ok: true, moved };
  }
  function replacePending() { return {ok:false,reason:'战利品已直接收入背包，无需替换。'}; }

  function hasTool(kind, tier=1) {
    if (!S.toolkit) autoToolkit();
    return (selectedTool(kind)?.tier || 0) >= tier;
  }

  // ---------- 时间 ----------
  // 中毒 / 流血：**每过 1 小时**结算一次。抽成函数的唯一原因是 sleep()：
  // 睡觉走的是"直接推进 S.minute"，不经过 addMin()，所以以前这一觉里 debuff 一次都不结算 ——
  // 等于"睡一觉把中毒/流血白嫖过去"（作者 2026-09-25 反馈：中毒等 debuff 睡眠也要持续扣血）。
  // 返回 true = 人已经死了，调用方要立刻收工（保持和原来 `return die(...)` 一样的短路语义）。
  function healthValue() {return Math.max(0,Math.min(100,Number(S.stats.health ?? 100)));}
  function applyHarm(amount) {amount=Math.max(0,Number(amount)||0);S.stats.hp-=amount;if(amount)S.stats.health=Math.max(0,healthValue()-1);}
  function healthTick() {
    if(S.death || S.ending)return false;
    const bad=S.statuses.poison>0 || S.statuses.bleed>0 || S.statuses.fear>0 || (S.statuses.nauseaUntil||0)>(S.tick||0);
    if(bad)S.stats.health=Math.max(0,healthValue()-1);
    S.healthNeglect=healthValue()<40?(S.healthNeglect||0)+1:0;
    if(!S.statuses.infection && S.healthNeglect>=6 && chance(.08)){S.statuses.infection=1;S.infectionHours=0;log('伤势久未处理，伤口出现感染。请使用草药膏治疗感染。','danger');}
    if(S.statuses.infection){S.infectionHours=(S.infectionHours||0)+1;applyHarm(S.statuses.infection>=2?4:2);if(S.infectionHours>=24 && S.infectionHours%6===0 && S.statuses.infection===1 && chance(.15)){S.statuses.infection=2;log('感染恶化了！尽快处理伤口。','danger');}if(S.stats.hp<=0){die('感染耗尽了你的生命。');return true;}}
    return false;
  }
  function restoreHealth(it) {if(!it.healthRestore)return;S.stats.health=Math.min(100,healthValue()+it.healthRestore);if(it.cureInfection){S.statuses.infection=0;S.infectionHours=0;S.healthNeglect=0;}log(`健康+${it.healthRestore}${it.cureInfection?'，感染已处理':''}。`,'good');}
  function debuffTick() {
    if(healthTick())return true;
    if (S.statuses.poison > 0) { S.statuses.poison--; applyHarm(3); log('毒性发作（-3 生命）', 'danger'); if (S.stats.hp <= 0) { die('毒素流遍了全身……'); return true; } }
    if (S.statuses.bleed > 0) { S.statuses.bleed--; applyHarm(5); log('伤口还在渗血（-5 生命）', 'danger'); if (S.stats.hp <= 0) { die('你因失血过多而死。'); return true; } }
    return false;
  }

  const HOUR_EFFECTS = (effectTick) => {
    const season = seasonInfo();
    const nightNow = isNight();   // 与全局 isNight() 同一份判定，避免 22点/6点 边界散落两处
    // 食之包：饱食/水分低于 50 自动进食饮水
    // ⚠️ 作者 2026-09-19：自动吃的东西可以自己指定（玩家反馈"它总是吃超级大蛋，很心疼"）。
    //    没指定偏好时，改成"挑够用的里面最省的那份"，不再无脑拿第一件（背包顺序里超级大蛋常排前面）。

    foodSatchel.hourly();
    const mb = metaBonus();
    const diffMul = (DIFFICULTIES[S.difficulty] && DIFFICULTIES[S.difficulty].drainMul) || 1;   // 简单/普通：饥渴消耗更慢
    S.stats.hunger = Math.max(0, S.stats.hunger - (S.difficulty === 'dev' ? 0 : 2 * (1 - mb.cons) * diffMul));
    // ⚠️ 滤雨器是"在水壶上加装滤网"（升级），必须一并算作有水壶 ——
    //    否则升完级 tank 被删掉、-20% 口渴效果直接失效（玩家反馈"升级后水壶不见了、效果还有吗"）。
    const hasTank = !!(S.furniture.tank || S.furniture.rainfilter);
    S.stats.thirst = Math.max(0, S.stats.thirst - (S.difficulty === 'dev' ? 0 : 2 * (season.thirstMul || 1) * (hasTank ? 0.8 : 1) * (1 - mb.cons) * diffMul));
    if (S.stats.hunger <= 0 || S.stats.thirst <= 0) {
      applyHarm(10);
      log('饥渴正在侵蚀你的身体……（-10 生命）', 'danger');
      if (S.stats.hp <= 0) return die('你倒在荒野里，再也没能站起来。');
    }
    // 所有冷热来源合为同一体感值；跨区域的 30 分钟内只提醒、不伤血。
    const temp = temperatureInfo(S.scene, S.zone, effectTick);
    const oldTemp = S.statuses.cold ? 'cold' : (S.statuses.heat ? 'heat' : 'normal');
    S.statuses.cold = temp.state === 'cold';
    S.statuses.heat = temp.state === 'heat';
    if (temp.state !== 'normal' && temp.grace > 0) {
      if (oldTemp !== temp.state) log(`这里${temp.state === 'cold' ? '太冷' : '太热'}，你有 ${temp.grace} 分钟换衣缓冲。`, 'warn');
    } else if (temp.state !== 'normal') {
      const dmg = temp.state === 'cold' ? 5 : 3;
      applyHarm(dmg);
      log(`体感温度${temp.state === 'cold' ? '过低' : '过高'}（-${dmg} 生命）。调整衣物，或回到安全区域。`, 'danger');
      if (S.stats.hp <= 0) return die(temp.state === 'cold' ? '你在严寒中倒下了。' : '你在酷热中倒下了。');
    } else if (oldTemp !== 'normal') log('体感温度恢复舒适。', 'good');
    // 中毒/流血
    if (debuffTick()) return;
    // 食物变质
    for(const fid of Object.keys(S.foodExp || {})) {
      if(!ITEMS[fid] || !ITEMS[fid].spoil) continue;
      const lots=foodLots(fid), expired=lots.filter(x=>x.exp<=effectTick).reduce((n,x)=>n+x.qty,0);
      if(expired) {
        S.inv[fid]-=expired; if(!S.inv[fid]) delete S.inv[fid];
        syncFood(fid,lots.filter(x=>x.exp>effectTick));
        gainItem('rot',expired);
        log(`${ITEMS[fid].name}×${expired} 已经变质。`, 'warn');
      }
    }

    // 精神：深夜野外
    if (nightNow && S.scene !== 'camp' && S.scene !== 'shore') {
      S.stats.spirit = Math.max(0, S.stats.spirit - 2);
      if (S.stats.spirit < 30 && chance(0.3)) log('黑暗里似乎有眼睛在看你……（精神恍惚）', 'warn');
    }
    change();
  };

  // ---------- 弹窗暂停：开着"纯管理"弹窗时，时间不流逝 ----------
  // 看背包/装备/技能/图鉴这些界面时不该被时间推着走（也免得边翻东西边掉饱食度）。
  // 由 ui.js 在开关这些弹窗时调用 setTimeFreeze()；营地面板/制造/交易/耕地那些"要花时间的操作"
  // 不在此列（它们本身就是主动消耗时间的行为）。
  const session=GameSession.create();
  function setHostSuspended(on){session.setPaused('host',on);}
  function hostSuspended(){return session.isPaused('host');}
  function setTimeFreeze(on){session.setPaused('panel',on);}
  function timeFrozen(){return session.isPaused('panel');}

  function lanternActive(scene = S && S.scene) {
    return !!S && scene !== 'sea' && scene !== 'atlantis' && (S.toolkit || []).includes('lantern') && hasItem('lantern');
  }
  function lanternRiskMul(scene) { return lanternActive(scene) ? 0.5 : 1; }
  function wearLantern(minutes) {
    if (!lanternActive() || !(minutes > 0)) return;
    const saved = Number(S.lanternWearMinutes);
    let elapsed = (Number.isFinite(saved) && saved >= 0 ? saved % 60 : 0) + minutes;
    while (elapsed >= 60 && lanternActive()) { elapsed -= 60; drainById('lantern'); }
    S.lanternWearMinutes = elapsed % 60;
  }

  function addMin(m) {
    // 冻结期间不推进任何时间（连 tick 都不加，免得晾晒/保鲜的计时被偷偷推进）
    if (timeFrozen()) return false;
    if (hostSuspended()) return false;
    const startTick = S.tick || 0;
    wearLantern(m);
    S.tick = startTick + m;
    const startHour = Math.floor(S.minute / 60);
    const firstHourAfter = 60 - (S.minute % 60);
    S.minute += m;
    let crossed = 0;
    while (S.minute >= 1440) { S.minute -= 1440; S.day++; crossed++; }
    const endHour = Math.floor(S.minute / 60);
    const hoursPassed = crossed * 24 + (endHour - startHour);
    for (let i = 0; i < hoursPassed; i++) HOUR_EFFECTS(startTick + firstHourAfter + i * 60);
    // 亚特兰蒂斯：潜水服/氧气罩耐久消耗（礁石栖息地减半）
    if (S.scene === 'atlantis' && hoursPassed > 0) {
      const step = (S.zone === 'habitat') ? 2 : 1;
      S._diveAcc = (S._diveAcc || 0) + hoursPassed;
      while (S._diveAcc >= step) {
        S._diveAcc -= step;
        if (['diveSuit','diveSuit2'].includes(S.equipment.cloth)) drainById(S.equipment.cloth);
        if (!hasRelic('atlantisSeed') && ((S.toolkit || []).includes('diveMask') || hasItem('diveMask'))) drainById('diveMask');
      }
      // ⛔ 以前这里**只查氧气罩，不查潜水服** —— 于是玩家在海底把潜水服脱掉，唯一的后果只是"不再掉耐久"，
      //    照样自由行动。现在补上水压伤害（作者 2026-09-22 反馈）。礁石栖息地是安全点，不判。
      const hasSuit = ['diveSuit','diveSuit2'].includes(S.equipment.cloth);
      const hasO2 = (S.toolkit || []).includes('diveMask') || hasItem('diveMask') || hasRelic('atlantisSeed');
      if (S.zone !== 'habitat') {
        if (!hasSuit && hoursPassed > 0) {
          const dmg = 6 * hoursPassed;
          applyHarm(dmg);
          log(`没穿潜水服！水压挤得你耳膜剧痛（-${dmg} 生命）——快回礁石栖息地把衣服穿回去。`, 'danger');
        }
        if (!hasO2 && hoursPassed > 0) {
          const dmg = 3 * hoursPassed;
          applyHarm(dmg);
          log(`缺氧！你眼前阵阵发黑（-${dmg} 生命）`, 'danger');
        }
        if (!hasSuit || !hasO2) { if (S.stats.hp <= 0) S.stats.hp = 0; }
      }
      if (S.dur && S.dur.diveMask !== undefined && S.dur.diveMask > 0 && S.dur.diveMask < 10 && !S._o2warn) { S._o2warn = 1; log('氧气罩耐久不足 10，尽快回礁石栖息地修补！', 'danger'); }
    }
    if (S.buffs) { for (const k in S.buffs) if ((S.buffs[k].until||0) <= (S.tick||0)) delete S.buffs[k]; }
    if (crossed > 0) newDay();
    change();
  }

  // ---------- 水下负面状态（顶栏徽标用）----------
  // 与上面 HOUR_EFFECTS 里的判定共用同一套条件（礁石栖息地是安全点，不判）。
  // ⚠️ 做成"每次渲染现算"而不是存进 S.statuses：玩家当场换上潜水服 / 氧气罩就该立刻消失，
  //    存字段的话要等下一次时间流逝才更新，中间那段时间徽标是骗人的。
  function diveWarn() {
    if (!S || S.scene !== 'atlantis' || S.zone === 'habitat') return { pressure: false, o2: false };
    const hasSuit = ['diveSuit', 'diveSuit2'].includes(S.equipment.cloth);
    const hasO2 = (S.toolkit || []).includes('diveMask') || hasItem('diveMask') || hasRelic('atlantisSeed');
    return { pressure: !hasSuit, o2: !hasO2 };
  }

  function pendingLootInfo() {return [];}
  function deliverToBag(id,n) {
    const before=capUsed(),ok=addItem(id,n,true,true),load=loadPenalty();
    if(ok&&load.excess>0&&capUsed()>before)log(`带了过多的物品（${capUsed()}/${capacity()}格），移动体力消耗增加${load.percent}%。`,'danger');
    return ok;
  }
  function gainItem(id,n) {return deliverToBag(id,n);}
  function giveStart(id,n,silent=true) {return addItem(id,n,silent,true);}
  function collectPending() {return {ok:false,reason:'战利品已直接收入背包。'};}

  // ---------- 牧场：鸡舍 / 羊圈（各最多 3 只） ----------
  // 羊：每天吃 1 干草 → 产 1 羊毛，40~60 天后寿终（留 3 兽肉）
  // 鸡：小鸡连喂 5 天小麦变母鸡；母鸡每天吃 1 小麦 → 下 1 蛋，20~30 天后寿终（留 1 兽肉）
  // 规则：没喂上就不产出也不长大（不会饿死）；产出直接进背包，满包时允许超载。
  const LIVE_CAP = 3, CHICK_DAYS = 5, SHEEP_MEAT = 3, HEN_MEAT = 1;
  const COOP_EXT_MAX = 2;                 // 鸡舍可扩建两次：3 只 → 4 只 → 5 只（羊圈不扩建）
  function coopCap() { return LIVE_CAP + (S.coopExt || 0); }
  function liveCap(kind) { return kind === 'coop' ? coopCap() : LIVE_CAP; }
  function liveState() {
    if (!S.livestock || typeof S.livestock !== 'object') S.livestock = { pen: [], coop: [], autoFeed: true };
    const L = S.livestock;
    if (!Array.isArray(L.pen)) L.pen = [];
    if (!Array.isArray(L.coop)) L.coop = [];
    if (L.autoFeed === undefined) L.autoFeed = true;
    return L;
  }
  function liveCount(kind) { return liveState()[kind].length; }
  function liveFull(kind) { return liveCount(kind) >= liveCap(kind); }
  function liveInfo(kind) {
    const L = liveState();
    const isPen = kind === 'pen';
    const feedId = isPen ? 'hay' : 'wheat';
    return {
      kind, isPen, built: !!S.furniture[kind], cap: liveCap(kind), count: L[kind].length, autoFeed: L.autoFeed,
      ext: (kind === 'coop' ? (S.coopExt || 0) : 0), extMax: COOP_EXT_MAX,
      feedId, feedName: ITEMS[feedId].name, feedHave:supplyCount(feedId,'island'), feedBag:supplyCount(feedId), feedStore:warehouseCapacity('island')>0?supplyRecords(feedId,'island').reduce((n,x)=>n+x.qty,0):0, feedNeed:L[kind].length,
      list: L[kind].map(a => (isPen || a.type === 'hen')
        ? { label: isPen ? '羊' : '母鸡', text: `第 ${a.age} 天 / 寿终约 ${a.life} 天` }
        : { label: '小鸡', text: `小鸡 · 已喂 ${a.days}/${CHICK_DAYS} 天小麦` }),
    };
  }
  function addSheep() {
    const L = liveState();
    if (!S.furniture.pen) return { ok:false, reason:'你还没有羊圈。' };
    if (liveFull('pen')) return { ok:false, reason:`羊圈已满（最多 ${LIVE_CAP} 只）。` };
    L.pen.push({ age: 0, life: rnd(40, 60) });
    change();
    return { ok:true, count: L.pen.length };
  }
  function addChick() {
    const L = liveState();
    if (!S.furniture.coop) return { ok:false, reason:'你还没有鸡舍。' };
    if (liveFull('coop')) {
      const canExt = (S.coopExt || 0) < COOP_EXT_MAX;
      return { ok:false, reason:`鸡舍已满（最多 ${coopCap()} 只）。` + (canExt ? '在鸡舍管理里「扩建」可以再多养一只。' : '') };
    }
    if (!hasItem('chick')) return { ok:false, reason:'背包里没有小鸡（外岛杂货商有卖）。' };
    removeItem('chick', 1);
    L.coop.push({ type:'chick', days:0, age:0, life: rnd(20, 30) });
    change();
    return { ok:true, count: L.coop.length };
  }
  function toggleAutoFeed() { const L = liveState(); L.autoFeed = !L.autoFeed; change(); return L.autoFeed; }
  function livestockNewDay() {
    const L = liveState();
    const o = { wool:0, egg:0, meat:0, grown:0, deadSheep:0, deadHen:0, lackHay:0, lackWheat:0, hayUsed:0, wheatUsed:0 };
    for (let i = L.pen.length - 1; i >= 0; i--) {
      const a = L.pen[i];
      if (!L.autoFeed || supplyCount('hay','island')<1) { o.lackHay++; continue; }
      takeSupply('hay',1,'island'); a.age++; o.wool++; o.hayUsed++;
      if (a.age >= a.life) { L.pen.splice(i, 1); o.deadSheep++; o.meat += SHEEP_MEAT; }
    }
    for (let i = L.coop.length - 1; i >= 0; i--) {
      const b = L.coop[i];
      if (!L.autoFeed || supplyCount('wheat','island')<1) { o.lackWheat++; continue; }
      takeSupply('wheat',1,'island');
      o.wheatUsed++;
      if (b.type === 'chick') { b.days++; if (b.days >= CHICK_DAYS) { b.type = 'hen'; b.age = 0; b.life = rnd(20, 30); o.grown++; } }
      else { b.age++; o.egg++; if (b.age >= b.life) { L.coop.splice(i, 1); o.deadHen++; o.meat += HEN_MEAT; } }
    }
    if (o.wool) deliverToBag('wool', o.wool);
    if (o.egg) deliverToBag('egg', o.egg);
    if (o.meat) deliverToBag('meat', o.meat);
    const parts = [];
    if (o.hayUsed) parts.push(`羊吃草 ${o.hayUsed}（羊毛+${o.wool}）`);
    if (o.wheatUsed) parts.push(`鸡吃小麦 ${o.wheatUsed}（鸡蛋+${o.egg}）`);
    if (o.grown) parts.push(`小鸡长大×${o.grown}`);
    if (o.meat) parts.push(`兽肉+${o.meat}`);
    if (parts.length) log('牧场日报：' + parts.join(' · ') + '。', 'good');
    if (o.deadSheep) log(`羊圈里有 ${o.deadSheep} 只羊寿终正寝，留下了兽肉。`, 'sys');
    if (o.deadHen) log(`鸡舍里有 ${o.deadHen} 只母鸡寿终，留下了兽肉。`, 'sys');
    if (!L.autoFeed) { if (liveCount('pen') + liveCount('coop')) log('牧场自动喂食已关闭：今天没消耗饲料，也没有产出。', 'warn'); }
    else {
      if (o.lackHay) log(`干草不足：${o.lackHay} 只羊今天没吃上，没有产毛（羊不会饿死，补上干草即可）。`, 'warn');
      if (o.lackWheat) log(`小麦不足：${o.lackWheat} 只鸡今天没吃上，没有下蛋（鸡不会饿死，补上小麦即可）。`, 'warn');
    }
    // 结构化返回：给"每日晨报"弹窗用（见 newDay 里的 collectDailyReport）
    return {
      enabled: true, autoFeed: !!L.autoFeed,
      pen: liveCount('pen'), coop: liveCount('coop'),
      hayUsed: o.hayUsed, wool: o.wool, lackHay: o.lackHay,
      wheatUsed: o.wheatUsed, egg: o.egg, lackWheat: o.lackWheat,
      grown: o.grown, meat: o.meat, deadSheep: o.deadSheep, deadHen: o.deadHen,
      parts,
    };
  }
  // 草地陷阱：**每天清晨结算**，结果进"每日晨报"；选项由弹窗给（见 claimDailyTrap）。
  // 以前是"次日去草地才掷骰"，玩家经常不知道到底触发没有 —— 现在每天固定汇报。
  function resolveTrapDaily() {
    if (!S.traps || !(S.traps.placed > 0)) return null;
    if (S.day <= (S.traps.day || 0)) return { waiting: true, placed: S.traps.placed };   // 当天布下的要等第二天
    if (!chance(0.5)) return { caught: false, placed: S.traps.placed };
    return { caught: true, placed: S.traps.placed };
  }
  // 领取陷阱收获（弹窗里点了按钮才真正结算）
  function claimDailyTrap(kind) {
    const r = S.dailyReport && S.dailyReport.trap;
    if (!r || !r.caught || r.done) return { ok:false, reason:'没有待处理的陷阱收获。' };
    r.done = true;
    if (kind === 'kill') {
      deliverToBag('meat', 2); deliverToBag('hide', 1);
      if (S.traps) S.traps.placed = Math.max(0, S.traps.placed - 1);
      log('你结束了它的挣扎，收获兽肉×2、兽皮×1。', 'good');
      change();
      return { ok:true, msg:'收获兽肉×2、兽皮×1' };
    }
    const a = addSheep();
    if (S.traps) S.traps.placed = Math.max(0, S.traps.placed - 1);
    if (a.ok) log(`羊羔被牵回羊圈，现在羊圈里有 ${a.count} 只羊。`, 'good');
    else log(`${a.reason}只能把它放了。`, 'warn');
    change();
    return { ok:true, msg: a.ok ? '羊羔进羊圈了' : a.reason };
  }
  // 每日晨报：牧场消耗与产量 + 陷阱情况（供 ui 弹窗展示）
  function collectDailyReport() {
    const rep = { day: S.day, ranch: null, trap: null };
    rep.ranch = livestockNewDay();          // 牧场（内部会写日志）
    rep.trap = resolveTrapDaily();
    S.dailyReport = rep;
    return rep;
  }
  // 陷阱已全部并入"每日晨报"（collectDailyReport 每日清晨结算 + claimDailyTrap 领取）

  // 某一天属于哪个季节（seasonInfo 的直接来源）。抽出来是为了能问"昨天是什么季节"——
  // 判断"冬天是不是今天刚来"必须比前一天，不能只看 seasonInfo().name === '冬'
  // （那样第 46~60 天每天都会判成"冬天来了"）。day <= 0 落回春季。
  function seasonOnDay(day) {
    const d = ((day - 1) % 60) + 1;
    return SEASONS.find(s => d >= s.days[0] && d <= s.days[1]) || SEASONS[0];
  }
  function seasonInfo() { return seasonOnDay(S.day); }
  // 冬天是不是**今天**刚来（冬天第一天）。60 天一轮，所以第 46 天、第 106 天…都会命中一次。
  function winterJustStarted() { return seasonInfo().name === '冬' && seasonOnDay(S.day - 1).name !== '冬'; }
  function isNight() { return S.minute >= 22*60 || S.minute < 6*60; }
  function isDusk() { return S.minute >= 18*60 && S.minute < 22*60; }

  function rollWeather() {
    const s = seasonInfo();
    const pool = ['sun','sun','sun','cloud','rain','fog'];   // 晴天概率提高（原来 2/5，现在 3/6）
    if (s.name === '冬') pool.push('snow','snow');
    if (s.name === '夏' && chance(0.15)) { S.weather = 'storm'; }
    else S.weather = pick(pool);
    if (chance(0.06)) S.weather = 'storm';
    log(`今天是${seasonInfo().name}季，天气：${WEATHER[S.weather].name}。`, 'sys');
  }

  function newDay() {
    S.pointUses = {};
    rollWeather();
    // 作物生长：雨天（含暴雨）田里等于浇了水，长得快一天
    const rainGrow = (S.weather === 'rain' || S.weather === 'storm') ? 1 : 0;
    S.crops.forEach(c => { c.remain -= (1 + rainGrow); });
    if (rainGrow && S.crops.length) log('雨下了一夜，田里的作物喝饱了水——长得比平时快。', 'good');
    // 家具的每日产出（家具表里写了 dailyItems 的才会触发）
    const f = S.furniture;
    for (const fur of FURNITURE) {
      if (!fur.dailyItems || !f[fur.id]) continue;
      for (const id in fur.dailyItems) {
        const n = fur.dailyItems[id] || 1;
        if (deliverToBag(id, n)) log(`${fur.name}有产出：${ITEMS[id].name}×${n}。`, 'good');
      }
    }
    if (f.beehive) {
      const before = Math.max(0, Math.min(12, Math.floor(Number(S.hiveHoney) || 0)));
      S.hiveHoney = Math.min(12, before + 1);
      log(S.hiveHoney > before ? `蜂箱新酿出蜂蜜，已储存 ${S.hiveHoney}/12 份。` : '蜂箱已满（12/12），记得收蜜。', S.hiveHoney > before ? 'good' : 'sys');
    }
    // 牧场：鸡舍 / 羊圈（喂食 → 产出 → 成长 → 寿终）+ 草地陷阱 → 一起汇总成"每日晨报"
    collectDailyReport();
    if (f.rainfilter && (S.weather === 'rain' || S.weather === 'storm')) {
      const before = Math.max(0, Math.min(20, Number(S.rainWater) || 0));
      const w = Math.min(rnd(2, 4), 20 - before);
      S.rainWater = before + w;
      log(w ? `滤雨器储存了 ${w} 份淡水（现有 ${S.rainWater}/20），可在营地点击取水。` : '滤雨器已满（20/20），请到营地取水。', w ? 'good' : 'sys');
    }
    // 老潮到访判定
    if (S.day >= S.laochao.nextVisit && (S.day >= 5 || S.flags.flagSignal)) {
      if (S.weather !== 'storm' && S.weather !== 'rain') {
        S.laochao.arrived = true; S.laochao.arrivedDay = S.day; S.flags.flagSignal = 0;
        log('海面上出现一面帆——老潮的商船靠岸了！今天 6~22 点可以在营地交易。', 'good');
      } else {
        S.laochao.nextVisit = S.day + 2;
        log('天气太差，商船没有出现。', 'warn');
      }
    }
    if (S.laochao.arrived && S.laochao.arrivedDay !== S.day) S.laochao.arrived = false;
    // 陷阱已并入"每日晨报"：每天清晨结算（collectDailyReport），弹窗里领取（claimDailyTrap）
    // 剧情事件
    STORY_EVENTS.forEach(ev => {
      if (storyDay(ev) === S.day) {
        if (ev.once && S.flags['story_'+ev.id]) return;
        S.flags['story_'+ev.id] = 1;
        log(`【剧情】第${S.day}天，一段往事浮上心头……`, 'sys');
        triggerStory(ev);
      }
    });
    // （已移除寿命/老死设定——本作没有寿命上限）
    // 灵灰：每天必说一句话；另有 20% 概率带一份基础资源回来（数量克制，只在这一天发一次）
    if (S.identity === 'linghui') {
      log(LINGHUI_LINES[Math.floor(Math.random()*LINGHUI_LINES.length)], 'blue');
      if (chance(0.2)) {
        const pool = [['wood',2],['stone',2],['thatch',3],['berry',2],['wildveg',2]];
        const g = pool[Math.floor(Math.random()*pool.length)];
        if (gainItem(g[0], g[1])) log(`灵灰不知从哪抱来的，递给你：${ITEMS[g[0]].name}×${g[1]}。`, 'good');
      }
    }
    // 保存"昨日日出"快照（困难难度回退用）
    if (S._snap && S._snap.day) S._snap.prevday = JSON.parse(JSON.stringify(S._snap.day));
    snapshot('day');
    save();
    // 每日晨报：牧场消耗/产量 + 陷阱情况。
    // ⚠️ 只在"确实有内容"时才弹：没养牲畜、没饲料缺口、没陷阱就不打扰玩家。
    // ⚠️ 跳过第 1 天（刚开局没必要弹）；读档不会走到这里（读档不调 newDay）
    if (S.day > 1 && S.dailyReport && onOverlay) {
      const rep = S.dailyReport;
      const r = rep.ranch;
      const ranchHasNews = !!(r && (r.hayUsed || r.wool || r.wheatUsed || r.egg || r.grown || r.meat || r.lackHay || r.lackWheat));
      const tp = rep.trap;
      const trapHasNews = !!(tp && (tp.caught || tp.waiting));
      if (ranchHasNews || trapHasNews) onOverlay({ kind:'daily', title:`第 ${S.day} 天 · 晨报` });
    }
    if (((S.day - 1) % 60) + 1 === 43) log('三天后入冬：河畔取水点会结冰。提前储水；冬季可每天采雪3次，在营地篝火用积雪×2、木材×1烧成淡水×1。', 'warn');
    // 冬季来临（作者 2026-09-25）："冬天来的时候弹个窗，提示资源有限、很难熬。注意不要和其他弹窗冲突。"
    //   ① 只在**冬天第一天**弹（winterJustStarted），每轮冬天各弹一次：flags.winterWarned 记的是"哪一天弹过"。
    //   ② 不抢屏幕：走 kind:'winter'，ui.js 会给它**排队** —— 当时要是正开着别的弹窗
    //      （最典型的就是上面刚推出去的「晨报」），就先揣着，等那个弹窗关掉再弹。
    if (S.day > 1 && onOverlay && winterJustStarted() && S.flags.winterWarned !== S.day) {
      S.flags.winterWarned = S.day;
      onOverlay({ kind:'winter' });
    }
  }

  // 夜袭剧情按难度推迟：越简单给越多发育时间（简单14 / 普通12 / 困难10 / 传奇7）
  const RAID_DAY = { easy: 14, normal: 12, hard: 10, legend: 7 };
  function raidDay() { return (S && RAID_DAY[S.difficulty]) || 7; }
  // 夜袭强度：随时间水涨船高，第 50 天到顶（5 匹狼）。与难度无关（难度只改狼的属性）。
  function raidWolves() {
    const d = Math.max(1, Math.min(50, (S && S.day) || 1));
    return Math.max(1, Math.min(5, 1 + Math.floor(d / 12.5)));
  }
  function storyDay(ev) { return ev.id === 'e_wolfraid' ? raidDay() : ev.day; }
  function triggerStory(ev) {
    if (ev.id === 'e_driftbottle') {
      gainItem('driftbottle', 1);
      showOverlay({
        title:'漂流瓶', text:'你在漂流物里找到一个用蜡封口的瓶子。里面的信写着：\n\n"落难的朋友，每月商船会路过南岸。看到炊烟就靠岸。带上鱼干，换什么都行。——老潮"',
        choices:[{ label:'把瓶子收好', ok:()=>{ log('你记下了这个名字：老潮。'); } }]
      });
    } else if (ev.id === 'e_laochao') {
      S.laochao.arrived = true; S.laochao.arrivedDay = S.day; S.flags.flagSignal = 0;   // 剧情说老潮来了 → 确保交易按钮出现
      showOverlay({
        title:'商船靠岸', text:'一个戴斗笠的老头跳下船，嗓门洪亮："嚯！真有活人！我是老潮，走南闯北的小买卖人。有货换货，没货聊聊也成！"',
        choices:[{ label:'欢迎，老潮', ok:()=>{ log('老潮在营地南岸支起了小摊。（今天 22 点前可交易）', 'good'); } }]
      });
    } else if (ev.id === 'e_wolfraid') {
      S.flags.wolfRaidPending = 1;
      showOverlay({ title:'不祥的预感', text:'入夜后，营地外的黑暗里似乎亮起了几双绿眼睛。今晚恐怕不太平。', choices:[
        { label:'今晚提高警惕', ok:()=>{ log('今晚睡觉时可能遭遇夜袭。可以选择守夜，或靠围墙硬撑。', 'warn'); } }
      ]});
    } else if (ev.id === 'e_caveTip' || ev.id === 'e_storm' || ev.id === 'e_pirate' || ev.id === 'e_altar' || ev.id === 'e_bell' || ev.id === 'e_winter' || ev.id === 'e_newyear') {
      showOverlay({ title:'消息', text: ev.text, choices:[{ label:'记在日记里', ok:()=>{} }] });
      diaryAdd(ev.text);
    }
  }

  // ---------- 存档 ----------
  // 技能改版迁移（旧等级 → 经验返还，双倍）。
  // ⚠️ load() 和 loadSlot() 都要跑：备份槽里存的是"当时那份 S"，可能是技能改版前的老格式。
  //    以前只在 load() 里迁移，于是"从备份继续"会拿到"有等级、没有成长选项"的档 ——
  //    等级还在但一点属性都不给（玩家反馈"前面升的级属于加了没？打雪鹰才 10 点血"）。
  // ---------- 存档救援：开新档自动保留上一局 + 扫描本机所有存档痕迹 ----------
  // 玩家反馈："开新档的时候选的三档，现在调1档覆盖不行……我那档能恢复吗，我一直玩这个档的"
  // —— 他当时那份存档没有任何备份，被新档直接顶掉了。
  const RESCUE_KEY = 'guyuyizhang_rescue';
  // 开新游戏之前，把"正在玩的那一份"原样留一份（只在 day>1 时留，且始终保留最新一条）
  function rescueStash() {
    try {
      const raw = localStorage.getItem('guyuyizhang_save');
      if (!raw) return false;
      const j = JSON.parse(raw);
      if (!j || !(j.day > 1)) return false;
      if (j.setted) {}
      const st = { at: Date.now(), day: j.day, identity: j.identity, save: raw };
      localStorage.setItem(RESCUE_KEY, JSON.stringify(st));
      return true;
    } catch (e) { return false; }
  }
  function rescueInfo() {
    try { const st = JSON.parse(localStorage.getItem(RESCUE_KEY) || 'null'); return (st && st.save) ? st : null; } catch (e) { return null; }
  }
  // 扫描本机所有还能读出来的存档痕迹（按时间从新到旧），给"救援"面板用
  function scanLocalSaves() {
    const out = [];
    const add = (src, label, raw, atHint) => {
      if (!raw) return;
      let j = null; try { j = JSON.parse(raw); } catch (e) { return; }
      if (!j || !j.day) return;
      out.push({ src, label, day: j.day, identity: j.identity, at: atHint || 0, size: String(raw).length });
    };
    add('main', '当前存档（新开的那局）', localStorage.getItem('guyuyizhang_save'), parseInt(localStorage.getItem('guyuyizhang_savedAt') || '0', 10) || 0);
    const rs = rescueInfo(); if (rs) add('rescue', '开新游戏前的上一局（自动保留）', rs.save, rs.at);
    add('bak', '上一次保存前的状态（回退一步）', localStorage.getItem('guyuyizhang_save_bak'),
      (function () { try { return parseInt(localStorage.getItem('guyuyizhang_savedAt') || '0', 10) || 0; } catch (e) { return 0; } })());
    try { const ck = ckGet(CK.save); if (ck && ck !== localStorage.getItem('guyuyizhang_save')) add('cookie', 'cookie 镜像（平台清缓存前的最后一份）', ck, parseInt(ckGet(CK.saveAt) || '0', 10) || 0); } catch (e) {}
    const m = metaState();
    (m.slots || []).forEach((sl, i) => { if (sl && sl.data) add('slot' + i, `备份槽 ${i + 1}`, JSON.stringify(sl.data), 0); });
    return out.sort((a, b) => (b.at || 0) - (a.at || 0));
  }
  // 把某一份痕迹恢复成"当前这一局"（和从备份槽继续一样：补字段 + 迁移 + 立刻写主存档）
  function restoreLocalSave(src) {
    let raw = '';
    if (src === 'main') raw = localStorage.getItem('guyuyizhang_save');
    else if (src === 'bak') raw = localStorage.getItem('guyuyizhang_save_bak');
    else if (src === 'cookie') { try { raw = ckGet(CK.save); } catch (e) {} }
    else if (src === 'rescue') { const rs = rescueInfo(); raw = rs ? rs.save : ''; }
    else if (/^slot\d$/.test(String(src))) {
      const i = parseInt(String(src).slice(4), 10);
      const m = metaState(); const sl = m.slots && m.slots[i];
      if (!sl || !sl.data) return { ok:false, reason:'这个备份槽是空的' };
      raw = JSON.stringify(sl.data);
    }
    if (!raw) return { ok:false, reason:'这份存档痕迹已经找不到了' };
    let j = null; try { j = JSON.parse(raw); } catch (e) { return { ok:false, reason:'这份内容已经损坏' }; }
    if (!validSave(j)) return { ok:false, reason:'这份内容不完整' };
    const nextM = JSON.parse(JSON.stringify(metaState()));
    rememberSettledRun(S, nextM);
    ensureRunId(j, nextM);
    const result = persistPair(j, nextM, true);
    return result.ok ? {ok:true,day:j.day,identity:j.identity} : result;
  }
  // 快照记录完整局内数据；排除递归检查点和仅用于本次行动的临时字段。
  function checkpointState() {
    const state = {};
    for (const key of Object.keys(S)) {
      if (key[0] === '_' || ['dawnCheckpoint','combat','death','ending'].includes(key)) continue;
      state[key] = S[key];
    }
    return JSON.parse(JSON.stringify(state));
  }
  function snapshot(kind) {
    const state = checkpointState();
    S._snap = S._snap || {};
    S._snap[kind] = state;
    if (kind === 'day' && state.stats.hp > 0) S.dawnCheckpoint = { version:1, state };
  }
  function reviveInfo() {
    if (!S || S.difficulty === 'legend') return {ok:false, reason:'传奇难度无法回溯。'};
    const point = S.dawnCheckpoint;
    const state = (point && point.version === 1 && point.state) || (S._snap && S._snap.day);
    if (!state || !state.stats || state.stats.hp <= 0 || !state.inv || state.day !== S.day)
      return {ok:false, reason:'当前存档没有有效的当天日出记录。旧存档继续到下一次日出后会自动建立；可尝试读取备份。'};
    if (metaState().soul < 50) return {ok:false, reason:'魂点不足（需 50 魂点）。'};
    return {ok:true, state};
  }
  function rollback(kind) {
    if (!S._snap || !S._snap[kind]) { location.reload(); return; }
    const sn = S._snap[kind];
    Object.assign(S, JSON.parse(JSON.stringify(sn)));
    S.stats = sn.stats;
    S.statuses = { bleed:0, poison:0, cold:false, fear:0 };
    log('你从昏暗中醒来，时间回到了过去……', 'sys');
    change();
  }

  // ---------- 存档多重落地：localStorage 之外再镜像一份 cookie ----------
  // 为什么：手机 WebView 里"清缓存、平台升级"有时只清 localStorage，
  // 而 cookie 往往能留下来（网页游戏最老牌的兜底）。两边都写，读的时候取"更新的那份"。
  // ⚠️ 单个 cookie 约 4KB 上限：只镜像主存档与账号数据，太长（比如带满三个备份槽的导出码）就跳过。
  const CK=SaveRepository.keys;
  function ckGet(key){return repository.cookieGet(key);}
  function ckMirror(key,atKey,json){return repository.mirror(key,atKey,json);}
  function save(){return repository.save();}
  function load(retried=false){return repository.load(retried);}
  function hasSave(){return repository.hasSave();}
  // 安全模式用：把"上次保存前的滚动备份"当主档读回来
  // （save() 每次写入前都会把旧档滚到 guyuyizhang_save_bak，所以最多退回几步）
  function restoreBackupSave() {
    try { return restoreLocalSave('bak'); }
    catch (e) { return {ok:false,reason:'备份存档暂时无法读取'}; }
  }
  // ---------- 新游戏 ----------
  function newGame(identity, difficulty) {
    if (!DIFFICULTIES[difficulty] || !IDENTITIES[identity]) return {ok:false,reason:'无效职业或难度。'};
    if (!identityUnlocked(identity)) return {ok:false,reason:'请先用 100 魂点永久解锁该角色。'};
    if (!difficultyUnlocked(difficulty)) return {ok:false,reason:'先在幸存者模式完成任一通关结局。'};
    if(['legend','nightmare'].includes(difficulty) && !metaSave().ok) return {ok:false,reason:'解锁记录未能保存，请检查存储后重试。'};
    // ⚠️ 开新游戏之前，先把"正在玩的那一份"留一份救援档（玩家反馈：开新档把一直玩的档顶掉了，找不回来）
    rescueStash();
    S = {
      v:1, identity, difficulty, balanceMigrationVersion:1,
      _runId: 'run-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2),
      day:1, minute:8*60, tick:0, weather:'sun', weatherRolled:true,
      stats:{ hp:100, health:100, stamina: 100 + (DIFFICULTIES[difficulty].stamina || 0), hunger:100, thirst:100, spirit:100 },      statuses:{ bleed:0, poison:0, cold:false, fear:0 },
      storageChainVersion:2, inv:{}, capacity:15, foodExp:{}, foodBatches:{}, furnPending:{}, pendingLootBatches:[], relics:[], relicSlots:0, relicEquip:[null,null,null], dur:{}, toolDurs:{}, toolMaxDurs:{}, tut:null, equipIdx:{weapon:0, weapon2:0, armor:0, cloth:0, accessory:0}, weaponNames:{},
      equipment:{ weapon:null, weapon2:null, armor:null, cloth:null, accessory:null },
      buildings:{ house:difficulty === 'legend' ? -1 : 0, fire:difficulty === 'legend' ? -1 : 0, cellar:-1, storage:difficulty === 'legend' ? -1 : 0, wall:0, watch:0, dock:0, farm:0 },
      furniture:{}, rainWater:0, hiveHoney:0, lottery:{meter:0,day:0,uses:0}, permMade:{}, permUsed:{}, training:{run:0,lift:0,lastDay:0}, crops:[], farmExt:0, coopExt:0, migCombat2:1,
      tree:{ gather:{}, craft:{}, combat:{} }, skillPicks:{ gather:[], craft:[], combat:[] },
      scene:'camp', zone:null, weatherWarned:null, skill:{ craft:0, gather:0, combat:0 }, toolkit:[null, null, null],
      laochao:{ nextVisit:5, arrived:false, arrivedDay:0, done:{}, accepted:{} },
      fame:0,
      exp:{ gather:0, craft:0, combat:0 },
      flags:{}, diary:[], log:[], seen:{},   // tailorGift 是顶层字段（见 newGame 尾部）：新局不赠送裁缝台
      pointUses:{}, killCount:{}, sold:{}, hpLostTotal:0,
      livestock:{ pen:[], coop:[], autoFeed:true }, traps:{ placed:0 },
      death:null, ending:null, combat:null, pistolCalibrated:false,
     settings:{ roadAmbush:true },   // 赶路遇袭（危险度≥3 的区域会被狼/熊拦路）；玩家可在设置里关掉
     bookFocus:'', cellar:{items:[]}, learnedBlueprints:{}, blueprintKnowledgeVersion:1, satchelPref:{ food:'', drink:'' }, satchelChoices:{food:[],drink:[],blocked:[]},   // 食之包自动进食饮水优先用哪一件（空 = 自动挑最省的）
    };
    if (difficulty === 'nightmare') log('岛上不知何时出现了不可名状的怪物……击败沉没之王后，深水圣殿将显露噩梦之源。','danger');
    if(difficulty!=='legend'){giveStart('reedPack',1,true);S.backpack='reedPack';}
    const idn = IDENTITIES[identity];
    for (const k in idn.items) giveStart(k, idn.items[k], true);
    // 首次引导：作者 2026-09-23 反馈"上来就自己做了武器，完了才发现初始包裹就有" ——
    // 所以第一步改成「先看背包」（tut=0），看完再进入"做石镐 → 装备"两步。
    // 由 ui.js 在玩家打开【背包】时把 0 推进到 1/2（已经自带工具就直接跳到装备那步）。
    S.tut = 0;
    // 新局：裁缝台不赠送（tailorGift=0），必须自己建；旧档兼容见 normalizeState 里的迁移。
    S.tailorGift = 0;
    // 传奇仅保留职业物品；其他难度另有序章基础补给。
    if (difficulty !== 'legend') {
      giveStart('wood', 6, true); giveStart('branch', 6, true); giveStart('thatch', 8, true);
      giveStart('flint', 2, true); giveStart('stone', 3, true); giveStart('water', 4, true);
      giveStart('fish', 2, true);
    }
    // 难度额外补给：求生者 12 份随机食物+长矛，冒险家 6 份。
    const stStart = (DIFFICULTIES[difficulty] && DIFFICULTIES[difficulty].start) || {};
    if (stStart.food) {
      const pool = ['berry','wildveg','fish','meat','mushroom','bambooShoot','cactusfruit'];
      for (let i = 0; i < stStart.food; i++) giveStart(pool[Math.floor(Math.random() * pool.length)], 1, true);
    }
    if (stStart.spear) giveStart('spear', stStart.spear, true);
    // 历代遗章：家传补给
    const mbK = metaBonus();
    if (mbK.kit > 0) { giveStart('torch', mbK.kit, true); giveStart('herbPaste', mbK.kit, true); }
    // 《历代遗章》·各技能模块初始经验（作者 2026-09-17）：技能经验本身不跨局，改由传承给开局经验
    if (mbK.startG) S.exp.gather = Math.round(((S.exp.gather || 0) + mbK.startG) * 10) / 10;
    if (mbK.startC) S.exp.craft  = Math.round(((S.exp.craft  || 0) + mbK.startC) * 10) / 10;
    if (mbK.startF) S.exp.combat = Math.round(((S.exp.combat || 0) + mbK.startF) * 10) / 10;
    // 隐藏的开发者难度：全资源×100、背包 200 格、全图鉴、全神器
    if (difficulty === 'dev') {
      S.capacity = 10000;   // 开发者背包锁 10000 格
      // 所有物品自带：工具/武器/装备(不可叠) 各1、可堆叠资源各100（盾牌等也一起给）
      for (const k in ITEMS) giveStart(k, (ITEMS[k].stack === 1) ? 1 : 100, true);
      const mm = metaState();
      for (const k in ENEMIES) { S.seen['mon_'+k] = 1; mm.seenMon[k] = 1; }
      for (const k in ITEMS) if (['mat','special','bp','seed'].includes(ITEMS[k].cat)) { S.seen[k] = 1; mm.seenItems[k] = 1; }
      S.relics = Object.keys(RELICS);
      S.relicSlots = 3;
      S.relicEquip = Object.keys(RELICS);
      for (const f of FURNITURE) S.furniture[f.id] = true;                 // 全家具
      for (const f of ATLANTIS_FURNITURE) { S.atlantis = S.atlantis || { camp:{ furniture:{} } }; if (!S.atlantis.camp) S.atlantis.camp = { furniture:{} }; if (!S.atlantis.camp.furniture) S.atlantis.camp.furniture = {}; S.atlantis.camp.furniture[f.id] = true; }
      S.houseExt = 3;                                                      // 扩建满
      S.storeExt = 4;                                                      // 仓库扩建也拉满
      S.buildings.house = BUILDING_CHAINS.house.length - 1;                // 营地全满级
      S.buildings.fire = BUILDING_CHAINS.fire.length - 1;
      S.buildings.storage = BUILDING_CHAINS.storage.length - 1;
      S.buildings.wall = BUILDING_CHAINS.wall.length - 1;
      S.buildings.watch = BUILDING_CHAINS.watch.length - 1;
      S.buildings.dock = BUILDING_CHAINS.dock.length - 1;
      S.buildings.farm = BUILDING_CHAINS.farm.length - 1;
      S.atlantis = S.atlantis || { camp:{ furniture:{}, buildings:{} } };
      S.atlantis.unlocked = 1; S.atlantis.stoneActive = 1;
      metaSave();
    }
    S.stats.stamina = maxStam();   // 开局体力=满上限（含传承加成）
    S.seen = {};
    S._rev = (() => { try { return parseInt(localStorage.getItem('guyuyizhang_rev') || '0', 10) || 0; } catch (e) { return 0; } })();
    diaryAdd('海难之后，我在这片沙滩上醒来。天是灰的，海也是。');
    log('第 1 天。你从沙滩上醒来，海浪把船的残骸和你一起冲上了岸。', 'sys');
    // 普通开局自带三件套；传奇难度刻意从空地开始，提示也必须区别。
    log(difficulty === 'legend'
      ? '传奇开局：营地空无一物。先收集木材、树枝、茅草、石头与燧石，在「营地建造」造帐篷、储物箱和篝火。'
      : '教程：帐篷和篝火开局就替你搭好了——先点开看看（营地里的「帐篷」和「篝火」），再出去转转。', 'sys');
    snapshot('day');
    snapshot('sleep');
    save();
    change();
  }

  // ---------- 死亡 ----------
  function die(reason) {
    // 不死丹：起死回生（只保住 reviveHp 点生命，不是满血）
    if (invCount('lotusPill') > 0) {
      removeItem('lotusPill', 1);
      const rv = Math.max(1, ITEMS.lotusPill.reviveHp || 30);
      S.stats.hp = rv;
      log(`不死丹在体内化开，把你从鬼门关拉了回来。（生命 ${rv}）`, 'good');
      diaryAdd('不死丹救了我一命。');
      change();
      return true;
    }
    S.death = reason;
    S.ending = 'D';
    // 真·死亡：结算魂点并结束本局（弹死亡结算窗）
    const ms = metaSettle();
    if (ms) log(`你的一生化为 ${ms.gain} 魂点，汇入了《历代遗章》。`, 'good');
    if (onEnding) onEnding('D', reason);
    return false;
  }
  function endingD(reason) { S.ending = 'D'; const ms = metaSettle(); if (ms) log(`你的一生化为 ${ms.gain} 魂点，汇入了《历代遗章》。`, 'good'); if (onEnding) onEnding('D', reason); }
  // 继续游戏（"留在岛上"/死亡后回到标题再来/读档接着玩）时必须清掉本局的结算状态。
  // 否则 S.ending 一直挂着 → checkEndingActions 直接返回空（A/B/C/S 按钮全消失）、
  // 时间流逝与自动存档也会跟着停摆（ui.js 里用 ending/death 当暂停条件）。
  function continueRun() {
    if (!S) return;
    if (S.ending) S.ending = undefined;
    if (S.death) S.death = undefined;
    change();
  }

  // ---------- 场景与赶路 ----------
  function sceneOf(id) { return SCENES.find(s => s.id === id); }
  function sceneUnlocked(id) {
    const sc = sceneOf(id);
    if (!sc) return false;
    if (S.buildings.watch < sc.unlockWatch) return false;
    if (sc.needBoat) {
      const rank = { none:0, raft:1, boat:2, ship:3, ocean:4 };
      const dock = BUILDING_CHAINS.dock[S.buildings.dock];
      if (rank[dock.boat] < rank[sc.needBoat]) return false;
    }
    return true;
  }
  function canTravel(id) {
    if (id === 'atlantis') {
      if (!hasItem('seachart') && !(S.atlantis && S.atlantis.unlocked)) return { ok:false, reason:'还没有通往亚克兰蒂斯的路——需要海图，或完成「秘辛」祭坛仪式。' };
      if (!['diveSuit','diveSuit2'].includes(S.equipment.cloth)) return { ok:false, reason:'需要先穿「潜水服」（衣物栏）才能潜入海底。' };
      const o2 = (S.toolkit||[]).includes('diveMask') || hasItem('diveMask') || hasRelic('atlantisSeed');
      if (!o2) return { ok:false, reason:'海底太深，需要「氧气罩」（工具栏）或神物「亚特兰蒂斯之种」。' };
      return { ok:true };
    }
    if (!sceneUnlocked(id)) {
      const sc = sceneOf(id);
      if (S.buildings.watch < (sc.unlockWatch || 1)) return { ok:false, reason:`需要在营地建好 ${sc.unlockWatch} 级瞭望台才能看见这里` };
      if (sc.needBoat) { const dock = BUILDING_CHAINS.dock[S.buildings.dock]; const rank = { none:0, raft:2, boat:3, ship:4, ocean:5 }; if (rank[dock.boat] < rank[sc.needBoat]) return { ok:false, reason:`海雾太重，你现在的船（${dock.name}）渡不过去——需要${sc.needBoat === 'raft' ? '木筏' : sc.needBoat === 'boat' ? '小船' : sc.needBoat === 'ship' ? '大船' : '远洋船'}才行` }; }
      return { ok:false, reason:'尚未解锁' };
    }
    const sc = sceneOf(id);
    const w = WEATHER[S.weather];
    if (w.block && w.block.includes(id)) return { ok:false, reason:`雷暴天气，无法前往${sc.name}` };
    // 温度进入缓冲允许先抵达，再给 30 分钟换衣服。
    return { ok:true };
  }
  function atlantisTeleport(dir) {
    const previousTemp = temperatureInfo();
    if (dir === 'to') {
      if (S.flags.ended_C && !(S.atlantis && S.atlantis.stoneActive)) { log('山顶的传送石还没被激活——先回山顶，用三块石板解出它的符文。', 'warn'); return { ok:false }; }
      const chk = canTravel('atlantis');
      if (!chk.ok) { log(chk.reason, 'warn'); return { ok:false, reason:chk.reason }; }
      S.scene = 'atlantis'; S.zone = 'habitat'; temperatureEntered(previousTemp);
      log('传送石亮起，你瞬间出现在礁石栖息地。', 'good');
      change(); return { ok:true };
    }
    S.scene = 'camp'; S.zone = null; temperatureEntered(previousTemp);
    log('传送石把你送回了营地。', 'sys');
    change(); return { ok:true };
  }
  function activatePortal() {
    if (!S.atlantis) S.atlantis = { unlocked:1, visited:0, camp:{ furniture:{}, buildings:{} }, quest:0 };
    S.atlantis.unlocked = 1; S.atlantis.stoneActive = 1;
    if (invCount('slate') >= 3) removeItem('slate', 3);
    log('三块石板严丝合缝地拼合起来——传送石轰然亮起！从此营地与亚克兰蒂斯之间，一步之遥。', 'good');
    diaryAdd('石板的秘密解开了，传送石亮了。');
    change();
    return { ok:true };
  }
  // 主岛上的场景（同岛之间走直路，不必绕回营地）
  const LAND_SCENES = { camp:1, farm:1, river:1, forest:1, bamboo:1, quarry:1, grassland:1, desert:1, cave:1, peak:1 };
  // 赶路距离模型：
  // · 营地↔任意场景：就是那个场景到营地的距离（和以前一致）
  // · 主岛内部两点：按"到营地的距离差"走直路（最少 10 分钟），不再把两段相加
  // · 跨海（对岸/海域/海底）：海路那段为主，登陆后往内陆只加 25%，避免"去岛上别处比回家还贵"
  function travelDist(fromId, toId) {
    if (fromId === 'atlantis' || toId === 'atlantis') return 90;   // 海底往返都是游泳 1.5 小时
    const a = sceneOf(fromId), b = sceneOf(toId);
    if (!a || !b) return 0;
    if (fromId === 'camp') return b.distMin;
    if (toId === 'camp') return a.distMin;
    if (LAND_SCENES[fromId] && LAND_SCENES[toId]) return Math.max(10, Math.abs(a.distMin - b.distMin));
    return Math.round(Math.max(a.distMin, b.distMin) + Math.min(a.distMin, b.distMin) * 0.25);
  }
  function staminaCost(value) { return Math.ceil(value * ((S.statuses.nauseaUntil || 0) > (S.tick || 0) ? 1.5 : 1)); }
  function loadPenalty() {
    const excess=Math.max(0,capUsed()-capacity()),percent=Math.min(200,excess*10);
    return {excess,percent,multiplier:1+percent/100};
  }
  function travelCost(id) {
    const dist = travelDist(S.scene, id);
    let mul = 1;
    if (S.weather === 'fog') mul *= 1.5;
    if (S.furniture.signpost) mul *= 0.9;
    if (S.flags.horse) mul *= 0.7;
    if (isNight() && !hasItem('torch')) mul *= 1.5;
    const time = Math.round(dist * mul * (1 - metaBonus().travel));
    const energy = Math.max(1, Math.round(time / 15) * 5);
    return { time, energy:Math.ceil(staminaCost(energy)*loadPenalty().multiplier) };
  }
  // 亚特兰蒂斯**区域内**游动的消耗（时间/体力）。推进器（饰品）在这里统一减半。
  // ⚠️ 玩家反馈"推进器装上之后体力消耗显示不变，实际是变的"：
  //    以前 setZone() 里减半了，而界面的「前往」确认框自己又抄了一遍公式（没减半）——
  //    于是显示的是没折扣的数、实际扣的是折后数。现在只有这一份公式，两边都读它。
  function zoneSwimCost(from, to) {
    const A = ATLANTIS_MAP_ARROWS[from], B = ATLANTIS_MAP_ARROWS[to];
    let t = (A && B) ? Math.max(15, Math.round(Math.hypot(A.x - B.x, A.y - B.y) * 2.4)) : 30;
    let ec = Math.max(5, Math.round(t / 15) * 5);
    const thruster = S.equipment.accessory === 'thruster';
    if (thruster) { t = Math.max(8, Math.round(t / 2)); ec = Math.max(3, Math.round(ec / 2)); }
    return { time: t, energy: Math.ceil(staminaCost(ec)*loadPenalty().multiplier), thruster };
  }
  // ---------- 赶路遇袭：危险度 ≥3 的区域，路上会被狼 / 熊拦路 ----------
  // 设置里可关（默认开）。为什么给"迎战/退回"两个选择而不是强制开战：
  // 危险度 5 的山顶走过去就撞上 120 血的洞穴熊，没得选太惩罚；退回的代价是白花体力与时间。
  const ROAD_AMBUSH_MIN_DANGER = 3;
  function roadAmbushChance(danger) { return Math.min(0.30, 0.05 * danger); }   // 3→15% 4→20% 5→25%
  function roadAmbushPool(danger) {
    // 狼随时可能成群（它的 pack 特性自带"50% 两只"，正好对应"1~2 条狼"）；熊只在危险度 ≥4 出现。
    // 洞穴熊还带 minDay:30 —— 前 30 天不出现（玩家反馈"有点强了"），统一在这里按门槛过滤。
    const pool = ['wolf', 'wolf', 'wolf'];
    if (danger >= 4 && chance(0.35)) pool.push('cavebear');
    return pool.filter(id => ENEMIES[id] && (!ENEMIES[id].minDay || S.day >= ENEMIES[id].minDay));
  }
  // 返回 true 表示"拦路了，这次移动先不落地"（等玩家在弹窗里选）
  // force=true 供测试用：跳过概率判定直接触发（不要去固定 Math.random，否则连"选哪种怪"也会被定死）
  function rollTravelAmbush(id, force) {
    // 作者 2026-09-17：设置里不再允许关闭赶路遇袭 —— 老存档里 settings.roadAmbush=false 也忽略
    if (S._testNoAmbush) return false;   // ⚠️ 只给回归测试用（checks.js 会设它），玩家存档里不存在这个字段
    if (id === 'atlantis' || S.scene === 'atlantis') return false;   // 海底有自己那套，这里只管第一章陆地
    const sc = sceneOf(id);
    const danger = sc.danger || 1;
    if (danger < ROAD_AMBUSH_MIN_DANGER) return false;
    if (!force && !chance(roadAmbushChance(danger) * ((id === 'sea' || S.scene === 'sea') ? 1 : lanternRiskMul()))) return false;
    const pool = roadAmbushPool(danger);
    if (!pool.length) return false;
    const eid = pool[Math.floor(Math.random() * pool.length)];
    const en = ENEMIES[eid];
    const isWolf = eid === 'wolf';
    S._roadAmbush = { id, enemy: eid };
    const where = isWolf ? '前方的石堆后传来低沉的呼噜声——一条狼压着身子绕了出来' : '灌木丛轰然裂开，一头洞穴熊立起身子，比你高出一个头';
    showOverlay({ title: isWolf ? '路被狼拦住了' : '路被熊拦住了',
      text: `${where}，挡住了去${sc.name}的路。`,
      choices: [
        { label:'迎战', hint:'打倒它才能过去', ok:() => {
          S._onFightWin = () => {
            const pend = S._roadAmbush;
            S._roadAmbush = null;
            if (pend && pend.id === id) { log(`${en.name}倒下了，路通了。`, 'good'); arriveAt(id); }
          };
          log(`${en.name}朝你扑了过来！`, 'danger');
          startFight(en, true);
        } },
        { label:'退回去', hint:'这次没走成，体力与时间照常消耗', ok:() => {
          S._roadAmbush = null;
          addMin(15);
          log(`你慢慢后退，绕开了${en.name}——这一趟白跑了。`, 'warn');
          change();
        } },
      ] });
    return true;
  }

  function travel(id) {
    if (id === S.scene) { log('你已经在这里了。', 'warn'); return; }
    const chk = canTravel(id);
    if (!chk.ok) { log(chk.reason, 'warn'); return; }
    const sc = sceneOf(id);
    const { time: t, energy: energyCost } = travelCost(id);
    if (S.stats.stamina < energyCost) { log('你太累了，走不动这么远。休息一下。', 'warn'); return; }
    S.stats.stamina -= energyCost;
    log(`你向${sc.name}出发（${t} 分钟）。`, 'sys');
    if (sc.travelFrom) log(sc.travelFrom);
    if (isNight() && !hasItem('torch') && id !== 'camp') {
      log('夜色吞没了小路，你走得很慢，总感觉身后有脚步声。', 'warn');
    }
    addMin(t);
    // ⚠️ 拦路判定必须在"真正落地"之前：玩家选"退回"时就该留在原地，不该先到再退
    if (S.death || S.ending) return;
    if(S.difficulty==='nightmare') {
      const previous=temperatureInfo(),from=S.scene,fromZone=S.zone;
      S.scene=id;S.zone=id==='atlantis'?'habitat':null;
      if(nightmareEncounter('move')){temperatureEntered(previous);change();return;}
      S.scene=from;S.zone=fromZone;
    }
    if (rollTravelAmbush(id)) { change(); return; }
    arriveAt(id);
  }
  // 真正抵达目的地：切场景 + 场景描述 + 草地陷阱 + 随机事件
  function arriveAt(id) {
    const sc = sceneOf(id);
    const previousTemp = temperatureInfo();
    S.scene = id; S.zone = (id === 'atlantis') ? 'habitat' : null;   // 海底默认落在礁石栖息地
    temperatureEntered(previousTemp);
    S.tempActiveUntil = (S.tick || 0) + 30;
    autoStoreWarehouse();
    if (id === 'atlantis' && S.identity === 'linghui') log('灵灰贴着水面向下望，忽然安静下来：「我好像……见过这里。」', 'blue');
    const d = sceneDesc(sc);
    log(d);
    // 照明不够，进门就说（作者 2026-09-22：以前是玩家走进来、点到点位才发现"太黑了"，白跑一趟）
    // ⚠️ 必须用 pointsOf() 而不是 sc.points：needLight 是海底专属机制，海底点位挂在 sc.zones[zone] 下，
    //    sc.points 是空数组 —— 用错取数这条提醒永远不会触发（我第一版就写错了）。
    const darkPts = (pointsOf() || []).filter(p => p.needLight && lightLevel() < p.needLight);
    if (darkPts.length) {
      log(`这一带太暗，你只能看清轮廓——有 ${darkPts.length} 处得换上更强的照明才能探索（点位是暗的）。`, 'warn');
    }
    // 凑齐结局 C 的材料回到山顶：明确告诉玩家下一步（祭坛热点会重新亮起）
    if (id === 'peak' && !S.flags.ended_C && hasItem('relic') && invCount('slate') >= 3 && hasItem('dragonbone')) {
      log('祭坛的凹槽与三块石板严丝合缝——去点山顶的「祭坛 · 举行仪式」（或右下角的「祭坛仪式」按钮）。', 'good');
    }
    // 仪式做完、传送石还没激活：明确告诉玩家"下一步在哪、点什么"（很多人以为仪式做完就没事了）
    if (id === 'peak' && S.flags.ended_C && !(S.atlantis && S.atlantis.stoneActive)) {
      log('山顶的传送石已经浮现——点右上角的「传送石 · 需解密」，把三块石板拼上去解开符文。', 'good');
    }
    const trapFired = false;   // 陷阱已并入"每日晨报"（collectDailyReport），到草地不再单独结算
    if (!trapFired && chance(0.1)) triggerRandomEvent(id);
    change();
  }
  function sceneDesc(sc) {
    const w = S.weather;
    if (sc.id === 'sea' || sc.id === 'shore') {
      if (S.zone && sc.zones[S.zone]) return sc.zones[S.zone].name + '：' + (sc.zones[S.zone].desc || sc.desc.intro);
    }
    if (isNight() && sc.desc.night) return sc.desc.night;
    if ((w === 'rain' || w === 'snow' || w === 'storm') && sc.desc.rain) return sc.desc.rain;
    return sc.desc.intro;
  }
  function setZone(z) {
    const sc = sceneOf(S.scene);
    if (!sc.zones || !sc.zones[z]) return;
    if (sc.id === 'shore' && z === 'ruins' && S.buildings.watch < 3) { log('遗迹的方向被海雾锁住。三级瞭望台也许能看清路。', 'warn'); return; }
    if (sc.id === 'shore' && z === 'saltTown' && !sceneUnlocked('shore')) { log('你还没有能渡海的船。', 'warn'); return; }
    if (sc.id === 'sea' && z === 'cove' && S.buildings.watch < 2) { log('沉船湾被礁石遮挡，你找不到入口。', 'warn'); return; }
    // ⛔ 照明不够**直接进不去**（作者 2026-09-22）：以前能游进去，到了才发现整片区域的点位全是暗的 ——
    //    白跑一趟体力与时间，而且点得动却什么也做不了。区域门槛由 zone.needLight 明确声明；
    //    混合区域不按最深点位误锁整区，内部黑暗热点仍由 pointAvailable 单独拦截。
    const needLv = sc.zones[z].needLight || 0;
    if (needLv > lightLevel()) {
      const gear = ['', '潜水护目镜', '弱光防水手电', '防水强光潜水手电'][needLv] || '更强的照明装备';
      log(`前面黑得什么也看不见——需要「${gear}」才能进去。`, 'warn');
      return;
    }
    // 亚特兰蒂斯：区域之间移动要游过去，消耗时间与体力
    const fromZone = S.zone;
    let swam = false;
    if (sc.id === 'atlantis' && S.zone && S.zone !== z) {
      const c = zoneSwimCost(S.zone, z);
      const t = c.time, ec = c.energy;
      if (S.stats.stamina < ec) { log('你筋疲力尽，游不动了，先回礁石栖息地歇歇。', 'warn'); return; }
      S.stats.stamina -= ec;
      addMin(t);
      log(`你在海底游了 ${t} 分钟（消耗体力 ${ec}）${c.thruster ? '——推进器让消耗减半' : ''}。`, 'sys');
      swam = true;
    }
    const previousTemp = temperatureInfo();
    S.zone = z;
    autoStoreWarehouse();
    temperatureEntered(previousTemp);
    S.tempActiveUntil = (S.tick || 0) + 30;
    log(`你来到${sc.zones[z].name}。`);
    if (sc.zones[z].desc) log(sc.zones[z].desc);
    change();
    // 深海区移动：40% 被随机海底怪物拦截。
    // 关键：移动（时间/体力/区域）已经结算完毕，战斗不会取消或重来这次移动。
    if (fromZone !== z && nightmareEncounter('move')) return;
    if (swam && !S.combat && typeof ATLANTIS_DEEP_ZONES !== 'undefined' && (ATLANTIS_DEEP_ZONES.includes(z) || ATLANTIS_DEEP_ZONES.includes(fromZone))) {
      if (chance(0.4)) {
        const pool = ['deepGuard','tentacle','mechGuard'].filter(k => ENEMIES[k]);
        const en = ENEMIES[pool[Math.floor(Math.random() * pool.length)]];
        log(`深水里一道影子直冲你而来——${en.name}拦住了去路！`, 'danger');
        startFight(en);
      }
    }
    // ⚠️ 分区随机事件必须在这里掷（数值平衡 P1-4 的通用修法）。
    //    抵达场景那一步（arriveAt）会把 S.zone 重置成 null，所以带 `cond:{zone:...}` 的事件
    //    在"抵达"时条件恒假、永远不会触发 —— `re_shark`(沉船湾) 和 `re_pirates`(沉船湾)
    //    就属于这种情况。进入分区时补一次掷骰（概率与抵达时一致 10%）才能真正遇到它们。
    //    （注：曾经还有一条 re_peddler「神秘商人/亚特兰蒂斯之种」，已按作者要求删除；
    //      之种可从海底「神秘鱼人」换，或在商城购买。）
    if (swam || sc.id !== 'atlantis') {
      if (!S.combat && chance(0.1)) triggerRandomEvent(S.scene);
    }
  }

  // ---------- 交互点 ----------
  function pointsOf() {
    const sc = sceneOf(S.scene);
    if (sc.zones) {
      const z = S.zone ? sc.zones[S.zone] : sc.zones[Object.keys(sc.zones)[0]];
      return (z && z.points) || [];
    }
    return sc.points || [];
  }
  function lightLevel() { if (invCount('lightStrong') > 0) return 3; if (invCount('lightWeak') > 0) return 2; if (invCount('goggles') > 0) return 1; return 0; }
  // 山顶祭坛：材料齐了就算"拿过遗物"也重新可用（用来举行结局 C 的仪式）
  function altarReady(p) {
    return !!p && p.id === 'peak_altar' && !S.flags.ended_C && hasItem('relic') && invCount('slate') >= 3 && hasItem('dragonbone');
  }
  // 老存档抢救：旧版本在"点开弹窗"时就打了 pt_ 标记，玩家没拿走奖励的话这个一次性点位会永久消失
  // （山顶祭坛拿不到遗物就是这么来的）。这里判定"标记打了、奖励却没拿到"，把点位放出来让他再拿一次。
  function onceRewardMissing(p) {
    if (!p || !p.once || !S.flags['pt_' + p.id]) return false;
    if (p.id === 'peak_altar') return !hasItem('relic') && !S.flags.ended_C;   // 没遗物 = 当时没拿走
    return false;
  }
  function pointAvailable(p) {
    if (!p) return false;                     // 兜底：坏点位（数据缺项/找不到 id）不该让整局崩掉
    if (riverNetBanned(p)) return false;
    // 山顶祭坛例外：遗物虽然拿过了，但凑齐"遗物+石板×3+龙骨"要能再点开举行仪式（结局 C 的入口）
    if (p.once && S.flags['pt_'+p.id] && !altarReady(p) && !onceRewardMissing(p)) return false;
    if (p.firstDays && S.day > p.firstDays) return false;   // 仅前N天有，过期不可用
    if (p.id === 'grass_horse' && S.flags.horse) return false;   // 野马已驯服则不再出现
    if (p.id === 'sea_rescue' && S.flags.xiaoman) return false;  // 小满已经在营地里了（老存档没打标记也能收口）
    if (p.id === 'peak_slate' && S.flags.slateGuardDone) return false;   // 石板守卫已击败
    if (p.id === 'grass_wolfden' && S.flags.wolfKingDone) return false;   // 狼王已击败
    if (p.id === 'sea_pirate') { if (S.day < 20) return false; }   // 第20天起可反复讨伐（每天一次）
    if (p.daily) { const used = (S.pointUses[p.id] || 0); if (used >= p.daily) return false; }
    if (p.cond) {
      if (p.cond.rain && !(S.weather==='rain'||S.weather==='storm')) return false;
      if (p.cond.season && !p.cond.season.includes(seasonInfo().name)) return false;
      if (p.cond.day && S.day < p.cond.day) return false;
      // ⚠️ 例外：「海盗出没」不吃 dayMod 的整点门槛 —— 头目每 5 天露面一次，但**其余日子船上有小喽啰**，
      //    所以点位每天都能来（作者 2026-09-22 定案）。谁出场由 doPoint 里按天分流决定。
      if (p.cond.dayMod && p.id !== 'sea_pirate' && (S.day % p.cond.dayMod) !== 0) return false;   // 例：海盗船长只在 5 的倍数天露面
      if (p.cond.boat) {
        const rank = { none:0, raft:1, boat:2, ship:3, ocean:4 };
        const dock = BUILDING_CHAINS.dock[S.buildings.dock];
        if (rank[dock.boat] < rank[p.cond.boat]) return false;
      }
      if (p.cond.houseBelow && S.buildings.house >= p.cond.houseBelow) return false;
    }
    if (p.nightOnly && !isNight()) return false;
    if (p.needLight && lightLevel() < p.needLight) return false;
    if (p.needCore && invCount('deepCore') < p.needCore) return false;
    if (p.need) {
      if (p.need.tool && !hasTool(p.need.tool, p.need.tier || 1)) return false;
      if (p.need.item && !hasItem(p.need.item)) return false;
    }
    return true;
  }
  function shortPt(p) { return (p.name || '').replace(/[圈丛坡滩矿点露头层径点区场堆湾深处风带洞]/g, '') || '它'; }
  function pointStatus(p) {
    if (!p) return '这里现在做不了这件事。';
    if (riverNetBanned(p)) return '先前竭泽而渔了，现在暂时看不到鱼的踪迹。';
    if (!pointAvailable(p)) {
      if (p.needLight && lightLevel() < p.needLight) return `太黑了，需要${['','潜水护目镜','弱光防水手电','防水强光潜水手电'][p.needLight] || '照明装备'}才能探索这里。`;
      if (p.needCore && invCount('deepCore') < p.needCore) return `圣殿之门需要 ${p.needCore} 块深殿核心（当前 ${invCount('deepCore')} 块）。去四片海域的遗迹里找齐吧。`;
      if (p.need && p.need.item && !hasItem(p.need.item)) {
        if (p.need.item === 'torch') return '洞里太黑，需要火把才能深入。先做一支火把吧。';
        if (p.need.item === 'rod') return '需要鱼竿才能垂钓。编一根竹鱼竿吧。';
        return `需要${ITEMS[p.need.item].name}。`;
      }
      if (p.need && p.need.tool && !hasTool(p.need.tool, p.need.tier||1)) {
        const tier = p.need.tier || 1;
        const available=selectedTool(p.need.tool,true);
        if(available && available.tier>=tier)return `已有${ITEMS[available.id].name}，请装备到工具栏，或在设置中开启「自动取用工具」。`;
        // ⚠️ 名字必须和物品表一致（作者 2026-09-25："割树脂显示改成需要石质匕首（命名一致防止玩家误解）"）：
        //    这里原来硬写「石刀」，可物品早就叫「石质匕首」了。现在按 tool.kind + tier 反查真名，
        //    斧/镐/锄/网的文案也跟着统一（石斧、铁镐…），不再出现对不上的旧名字。
        const tKey = Object.keys(ITEMS).find(k => ITEMS[k].tool && ITEMS[k].tool.kind === p.need.tool && (ITEMS[k].tool.tier || 1) === tier);
        const tN = tKey ? ITEMS[tKey].name : ({ axe:'斧', pick:'镐', knife:'匕首', hoe:'锄', net:'渔网' }[p.need.tool] || '工具');
        if (tier === 1) return `需要一把${tN}。用燧石打一把${tN}吧。`;
        return `需要${tN}（${tier} 级）才能凿动这里。`;
      }
      if (p.nightOnly && !isNight()) return `${p.name}只在夜里才有动静——天黑再来吧。`;
      if (p.cond && p.cond.rain && !(S.weather === 'rain' || S.weather === 'storm')) return `或许应该等雨天再来找${shortPt(p)}。`;
      if (p.cond && p.cond.season && !p.cond.season.includes(seasonInfo().name)) return `${shortPt(p)}只在${p.cond.season.join('、')}才有，现在不是时候。`;
      if (p.cond && p.cond.day && S.day < p.cond.day) return `要等到第${p.cond.day}天后才会有线索。`;
      if (p.cond && p.cond.dayMod && (S.day % p.cond.dayMod) !== 0) {
        const nextDay = S.day + (p.cond.dayMod - (S.day % p.cond.dayMod));
        return `海面上今天没有船影——${shortPt(p)}每 ${p.cond.dayMod} 天才会露面一次，下一次是第 ${nextDay} 天。`;
      }
      if (p.daily && (S.pointUses[p.id]||0) >= p.daily) return '今天这里已经采过了，明天再来吧。';
    if (p.once && S.flags['pt_'+p.id] && !altarReady(p)) return '这里你早已搜刮过。';
      if (p.id === 'grass_horse' && S.flags.horse) return '这匹野马已被你驯服了。';
      return '现在还做不了这件事。';
    }
    return 'ok';
  }
  // 撒网后的河湾次日需休整，鱼竿仍可垂钓。
  function riverNetBanned(p) {
    if (!p || p.id !== 'river_net') return false;
    return (S.flags.riverNetBan || 0) >= S.day;
  }

  function pointMinutes(p, tier) {
    const tt=tier ?? (p.need?.tool ? bestToolTier(p.need.tool) : 1);
    const slow=(S.stats.spirit ?? 100)<20 && ['gather','fish','trap','drift'].includes(p.type) ? 1.1 : 1;
    return Math.max(1,Math.round((p.time||15)*(1-(tt-1)*0.2)*slow*gxTimeMul()));
  }
  function pointEnergy(p) {
    const tt=p.need && p.need.tool ? bestToolTier(p.need.tool) : 1;
    return staminaCost(Math.max(2,Math.round((p.energy || 10)*(1-(tt-1)*0.12)*gxEnergyMul())));
  }
  function pointReason(p) {
    if (!pointAvailable(p)) return '现在做不了这件事。';
    if (S.stats.stamina < pointEnergy(p)) return '体力不支，先休息吧。';
    return null;
  }
  function doPoint(p) {
    if (!autoToolsEnabled() && (!S.toolkit || !S.toolkit.some(Boolean))) autoToolkit();
    if (!pointAvailable(p)) { const why = pointStatus(p); log(why && why !== 'ok' ? why : '现在做不了这件事。', 'warn'); return; }
    const st = S.stats;
    const usedTool = p.need?.tool ? selectedTool(p.need.tool) : null;
    const tt = usedTool?.tier || 1;   // 本次收益与磨损绑定同一件工具
    const en = pointEnergy(p);   // 工具等级越高越省体力；技能树的「耐劳/精细/粗放」也在这里生效
    if (st.stamina < en && !['farm','trade','townTrade','townMission','townInfo','atlTrade'].includes(p.type)) { log('体力不支，先休息吧。','warn'); return; }
    if (['gather','fish'].includes(p.type) && S._nightmareHarvestPass !== p.id) {
      if (nightmareEncounter('gather')) {
        S.nightmareHarvest={id:p.id,scene:S.scene,zone:S.zone};
        S._onFightWin=()=>{S.nightmareHarvest=null;S._nightmareHarvestPass=p.id;try{doPoint(p);}finally{S._nightmareHarvestPass=null;}};
        return;
      }
    }
    const diff = DIFFICULTIES[S.difficulty].resMul;
    let ambush = null;   // 本次采集的遇袭判定结果（先记下，采集结算完再开战）

    // 采集守护（雪羽鹰守矿脉 / 深殿核心的守卫）：必须先打倒守卫，打完再重新走一遍本函数真正采集。
    // 关键：这一判定要在「计次、打一次性标记、扣体力」之前——否则守卫会把这次采集机会顶掉，
    // 一次性点位（如深殿核心）会永久失去奖励。
    if (p.guard && S._guardPass !== p.id && chance(p.guardChance === undefined ? 0.8 : p.guardChance)) {
      const gid = Array.isArray(p.guard) ? p.guard[Math.floor(Math.random() * p.guard.length)] : p.guard;
      if (ENEMIES[gid]) {
        log(`你刚动手，${ENEMIES[gid].name}就扑了过来——先解决它！`, 'danger');
        S._guardPass = p.id;
        S._onFightWin = () => { doPoint(p); };
        startFight(ENEMIES[gid]);
        return;   // 不扣体力、不占次数、不消耗一次性点位
      }
    }
    // 山顶石像拦路（雪莲 / 秘银）：50% 概率触发，玩家可以跑，也可以殊死一搏。
    // 和守卫一样：先问、后算，选"打"就先开战，赢了再回来采（次数与体力都没被扣）。
    if (p.guardChoice && S._guardPass !== p.id && chance(p.guardChoice.chance)) {
      const gid = p.guardChoice.enemy;
      if (ENEMIES[gid]) {
        S._guardPass = p.id;
        S._onFightWin = () => { doPoint(p); };
        showOverlay({ title:'石像动了', text:`你刚要动手，碑前的石像轰然转过身——${ENEMIES[gid].name}踩着碎石朝你冲了过来！`, choices:[
          { label:'不采了，直接跑', hint:'放弃这次采集，不扣当日次数，只花 10 分钟脱身', ok:()=>{
            S._guardPass = null; S._onFightWin = null;
            addMin(10);
            log(`你把工具一丢，连滚带爬退下雪线——${ENEMIES[gid].name}停在碑前，没有追。`, 'warn');
            change();
          } },
          { label:'殊死一搏', hint:'打倒它再从容采摘', ok:()=>{
            log(`${ENEMIES[gid].name}的石拳砸在地上，碎石四溅！`, 'danger');
            startFight(ENEMIES[gid], true);
          } },
        ]});
        return;
      }
    }
    if (S._guardPass === p.id) S._guardPass = null;   // 打完了：清掉放行标记，继续这次采集

    // ⚠️ 弹窗类点位（耕地 / 交易 / 告示板 / 酒馆…）本身不"干活"，也不该动体力或当日次数：
    //    它们只是打开一个界面，真正的动作（开垦/播种/收获/买卖）由弹窗里的按钮各自结算。
    //    以前这判断放在类型分发里（很靠后），而通用扣体力在上面先执行了 ——
    //    结果【每打开一次耕地弹窗就白扣 10 体力】（farm_plant 带 energy:10 且 daily:3，一天能白烧 30）。
    //    必须在任何扣除之前就返回。
    const MODAL_TYPES = ['farm', 'trade', 'townTrade', 'townMission', 'townInfo', 'atlTrade'];
    if (MODAL_TYPES.includes(p.type)) {
      // ⚠️ 这里必须把"点位类型"映射成"弹窗 kind"：ui.js 的 onOverlay 认的是短名
      //    （town / mission / info / black / atlTrade），直接把 p.type 传出去的话
      //    盐镇集市、告示板、酒馆、黑市全都会渲染成空壳弹窗。
      const overlayKind = p.type === 'townTrade' ? 'town' : p.type === 'townMission' ? 'mission'
        : p.type === 'townInfo' ? 'info' : (p.type === 'trade' && p.id === 'cove_black') ? 'black'
        : (p.type === 'trade' && p.id === 'atl_fishman') ? 'fishman' : p.type;
      if (onOverlay) onOverlay({ kind: overlayKind, title: p.name, p });
      return;
    }

    // ⚠️ 扣体力/扣当日次数统一走这里 —— "确认这次真能干成"之后才调。
    //    玩家反馈"不满足条件点进不去、体力却照扣"，根子就是有些分支在下面扣完钱才 return。
    const pointCharge = () => {
      S.pointUses[p.id] = (S.pointUses[p.id] || 0) + 1;
      // ⚠️ 一次性点位**不能在这里**打标记：adventure 类点位是先弹窗、等玩家选完才给奖励，
      // 提前打标记会让 adventure() 读到"自己刚打上的 pt_ 标记"而直接跳到"这里已被搜刮"分支
      // （山顶祭坛就是这样永远拿不到遗物的）。adventure 类由 reward 回调里的 markDone() 负责打标记。
      if (p.once && p.type !== 'adventure') S.flags['pt_'+p.id] = 1;
      st.stamina -= en;
      const dm2 = (DIFFICULTIES[S.difficulty] && DIFFICULTIES[S.difficulty].drainMul) || 1;
      st.hunger = Math.max(0, st.hunger - Math.round(4 * dm2));
      st.thirst = Math.max(0, st.thirst - Math.round(5 * dm2));
    };

    // ---- 动手之前先确认"这次真的能进行"（不能干的事一律不扣体力、不占当日次数）----
    // 狩猎：猎物是随机抽的，可能抽不到（比如全是夜行猎物、白天来）；首领还要先弹"确定讨伐？"。
    //       以前这些都发生在扣费之后 → 玩家在蛛巢点开、看到蜘蛛女王、点撤退，体力就白没了，
    //       而且当日次数也被占掉，再点只会显示"今天这里已经来过了"。
    let huntTarget = null;
    if (p.type === 'hunt') {
      // 过滤器：夜行猎物白天不出现；带 minDay 的（洞穴熊=第30天起）没到日子也不出现
      // ⚠️ 山洞里的洞穴熊：作者 2026-09-17 定「山洞内一直有概率出现洞穴熊」——所以洞内狩猎点
      //    （p.id 以 cave_ 开头）不吃 minDay 门槛，洞外拦路那条还按第 30 天起算。
      const caveNow = /^cave_/.test(p.id || '');
      let pool = p.enemies.map(e => ENEMIES[e]).filter(e => e && !(e.nightOnly && !isNight()) && (caveNow || !e.minDay || S.day >= e.minDay));
      // 「海盗出没」作者 2026-09-22 定案：**海盗头目不是每次都在**。
      //   头目按 cond.dayMod（每 5 天）出现一次；其余日子船上只有小喽啰（海盗×2）。
      //   这样这个点位每天可刷、不会空转，玩家也能稳定练手/取材，而头目的稀有掉落不会被刷烂。
      if (p.id === 'sea_pirate') {
        const bossDay = !p.cond || !p.cond.dayMod || (S.day % p.cond.dayMod === 0);
        pool = bossDay ? pool.filter(e => e.boss) : pool.filter(e => !e.boss);
        if (!pool.length) pool = [ENEMIES.pirate].filter(Boolean);
        // 非头目日固定来两只小喽啰（作者要求"放上海盗小怪"，不是 50% 概率来一只——
        // 那样这个点位有时只剩一只杂兵，点起来很没意思）
        if (!bossDay) {
          const tg0 = pool[0];
          if (tg0 && !tg0.boss) {
            pointCharge();
            // ⚠️ 小喽啰日必须用 textMinion：以前这里直接 log(p.text)，而 p.text 写的是
            //    "船长站在船头磨刀——是海盗头目！"，于是打两只杂兵也在喊头目来了
            //    （作者 2026-09-23 反馈"普通海盗的文案和海盗头目的文案一样"）。
            log(p.textMinion || p.text);
            startFight([tg0, tg0], true);
            return;
          }
        }
      }
      if (!pool.length) { log('现在这里没有猎物。', 'warn'); return; }
      huntTarget = pick(pool);
      if (huntTarget.id === 'boneguard' && !isNight()) huntTarget = ENEMIES['scorpion'];
      if (huntTarget.boss) {
        const tgt = huntTarget;
        showOverlay({ title:'危险 · ' + tgt.name, text:'此怪物异常强大，需要做好充足准备。确定讨伐？', choices:[
          { label:'迎战', ok:() => { pointCharge(); log(p.text); startFight(tgt, true); } },
          { label:'撤退', ok:() => { log('你谨慎地退了回去，从长计议。', 'sys'); } },
        ]});
        return;
      }
    }
    // 海底闸门：船/装备不够就先说清楚，别扣了体力才告诉玩家进不去
    if (p.type === 'atlantisGate') {
      const chkPre = canTravel('atlantis');
      if (!chkPre.ok) { log(chkPre.reason, 'warn'); return; }
    }

    // 守卫已清（或无守卫）且确认能干：这里才真正开始本次采集
    pointCharge();
    // 采集类先扣时间（作者 2026-09-19：先花时间，再遇怪，打赢才收获）——末尾那次 addMin 会跳过它
    const timePaidEarly = (p.type === 'gather');
    if (timePaidEarly) {
      addMin(pointMinutes(p,tt));
    }

    if (p.type === 'gather') {
      // ⚠️ 作者 2026-09-19 定次序：**先花时间 → 可能遇到怪（打赢再继续）→ 才收获**。
      //    以前是先把产出算完、日志写"获得：…"，最后才扣时间；真遇到怪时东西也已经进包了，
      //    日志看着像"白拿到手之后才花时间"。现在遇袭就先去打，赢了（S._onFightWin）再回来收。
      {
        const sc0 = sceneOf(S.scene);
        const danger = sc0 ? sc0.danger : 3;
        const pool = (typeof AMBUSH_MONSTERS !== 'undefined' ? AMBUSH_MONSTERS[S.scene] : []) || [];
        let amb = 0.10, rabbit = 0;
        if (danger <= 2) { amb = 0.05; rabbit = 0.10; }
        else if (danger >= 4) { amb = 0.20; }
        const protection = lanternRiskMul();
        amb *= protection; rabbit *= protection;
        if (rabbit && chance(rabbit) && ENEMIES.rabbit) ambush = ENEMIES.rabbit;
        else if (pool.length && chance(amb)) ambush = ENEMIES[pool[Math.floor(Math.random() * pool.length)]];
        if (!ambush && p.risk && ENEMIES[p.risk] && chance(0.25 * protection)) ambush = ENEMIES[p.risk];
        // 海底远程精英（深海哨兵）：只在中层黑暗及以上（照明 ≥2）出没，作者 2026-09-19
        if (!ambush && S.scene === 'atlantis' && lightLevel() >= 2 && ENEMIES.atlSentry && chance(0.12)) ambush = ENEMIES.atlSentry;
      }
      const doHarvest = () => {
      let got = [];
      let weff = (S.scene === 'atlantis') ? 1 : WEATHER[S.weather].eff;
      if (p.id === 'river_snow') weff = 1; // 降雪不应反过来减少可收集的积雪；季节减产仍保留。
      if (p.cond && p.cond.rain && (S.weather === 'rain' || S.weather === 'storm')) weff = 1.0;   // 雨天专属资源(蘑菇等)雨天不扣收益
      if (weff < 1 && S.weatherWarned !== S.weather) { S.weatherWarned = S.weather; log(`【${WEATHER[S.weather].name}】干活收益会打折扣（-${Math.round((1 - weff) * 100)}%，雨天专属资源除外）。`, 'warn'); }
      let bagFull = 0;
      for (const y of p.yields) {
        if (y.chance && !chance(y.chance)) continue;
        let q = qtyParse(y.min === undefined ? 1 : y.min);
        if (y.max !== undefined) q = rnd(y.min, y.max);
        // 季节采集倍率（数值平衡 P2-3a）：SEASONS 里写着 gatherMul（春 1.1 / 冬 0.6），
        // 季节描述也写着"采集+10%""严寒采集-40%"，但产量公式**从来没读过这个字段** —— 死数据。
        // 接上之后，"冬天外出采集变少"这条设计才真正兑现。
        const seasonMul = seasonInfo().gatherMul || 1;
        const exact=q * diff * weff * (1 + (tt - 1) * 0.18) * gxYieldMul() * seasonMul;
        // 高级工具的零头跨次累计，不再每次独立取整抹掉收益。低于1的保底不欠债。
        const carryKey=`${p.id}:${y.id}:${tt}`;
        const carry=tt>1 && Number.isFinite(S.gatherRemainders?.[carryKey]) ? Math.max(-0.5,Math.min(0.5,S.gatherRemainders[carryKey])) : 0;
        q=Math.max(1,Math.round(exact+carry));
        if(tt>1 && exact>=1){S.gatherRemainders=S.gatherRemainders||{};S.gatherRemainders[carryKey]=exact+carry-q;}

        if (y.id === 'wood' && S.identity === 'woodcutter') q = Math.round(q * 1.5);
        if ((y.id === 'herb') && S.identity === 'herbalist') q = q * 2;
        // ⚠️ 装不下就不能算"获得"：以前无条件 push 到 got，背包满时日志喊"获得×N"其实没进包
        if (gainItem(y.id, q)) {
          const prefix = `${ITEMS[y.id].name}×`, existing = got.findIndex(v => v.startsWith(prefix));
          if (existing >= 0) got[existing] = prefix + (Number(got[existing].slice(prefix.length)) + q);
          else got.push(prefix + q);
        }
        else bagFull++;
      }
      // 伐木专精：每次砍树额外 +0.5 / +1 木材。0.5 这种零头攒够 1 份才给（日志写明是技能给的）
      if (gxWoodExtra() > 0 && p.need && p.need.tool === 'axe' && (p.yields || []).some(y => y.id === 'wood')) {
        S.woodBonus = (S.woodBonus || 0) + gxWoodExtra();
        const ex = Math.floor(S.woodBonus);
        if (ex > 0) {
          S.woodBonus -= ex;
          if (gainItem('wood', ex)) { got.push(`木材×${ex}`); log(`【伐木专精】额外多得 木材×${ex}。`, 'good'); }
        }
      }
      if (bagFull) { log('本次采集物资未能收入背包。', 'danger'); notifyBagFull(); }
      if (p.text) log(p.text);
      // 砍树彩蛋：所有身份通用，10% 概率遇到超大美人松，额外 +7 木材；连着两次遇上解锁紫成就
      if (p.need && p.need.tool === 'axe' && (p.yields || []).some(y => y.id === 'wood')) {
        if (chance(0.1 + gxPineBonus())) {
          gainItem('wood', 7);
          log('人品爆发，遇见一颗超大美人松~ 额外木材 +7', 'blue');
          // 别在"获得"清单里另起一个名字，免得玩家以为"美人松木材"是另一种材料——直接并进木材那一项
          const wi = got.findIndex(s => s.indexOf('木材×') === 0);
          if (wi >= 0) got[wi] = `木材×${parseInt(got[wi].slice(3), 10) + 7}`;
          else got.push('木材×7');
          S.pineStreak = (S.pineStreak || 0) + 1;
          if (S.pineStreak >= 2) achUnlock('bigPine');
        } else {
          S.pineStreak = 0;   // 断了一次就得重新连
        }
      }
      if (p.rareFishChance && chance(p.rareFishChance)) {
        const RF = ['rareFishA','rareFishB','rareFishC','rareFishD','rareFishE'];
        const rid = RF[Math.floor(Math.random() * RF.length)];
        if (gainItem(rid, 1)) got.push(`${ITEMS[rid].name}×1`);
        log(`网里还兜着一条罕见的鱼：${ITEMS[rid].name}！`, 'good');
      }
      if (got.length) log(`获得：${got.join('、')}。`, 'good');
      else log('一无所获。', 'warn');
      // 河畔撒网 = 竭泽而渔：这一网之后河湾要空几天
      if (p.id === 'river_net') {
        S.flags.riverNetBan = S.day + 1;
        log('这一网让河湾需要休整：明天不能再撒网，但仍可用鱼竿垂钓。', 'sys');
      }
      awardExperience('gather',EXP_GATHER);
      if (p.need) { if (p.need.tool) wearSelectedTool(usedTool); if (p.need.item && DURA[p.need.item] !== undefined) drainById(p.need.item); }
      };
      // 真遇上怪：先去打，赢回来再收（打不过/跑掉就是白花这段时间）
      if (S._nightmareHarvestPass === p.id) ambush=null;
      if (ambush) { log(`你刚动手，${ambush.name}突然窜了出来！`, 'danger'); S._onFightWin = doHarvest; startFight(ambush); return; }
      doHarvest();
    } else if (p.type === 'fish') {
      let q = rnd(1,3) * diff;
      if (S.identity === 'fisher') q = Math.round(q * 1.5);
      q = Math.max(1, Math.round(q * (WEATHER[S.weather].eff)));
      const intoBag = gainItem('fish', q);
      log(p.text || '鱼线一动，你提起一条银亮的鱼。');
      if (intoBag) log(`获得：鱼×${q}。`, 'good');
      awardExperience('gather',EXP_GATHER);
      if (p.need && p.need.item && DURA[p.need.item] !== undefined) drainById(p.need.item);
    } else if (p.type === 'hunt') {
      // 猎物已经在上面 pre-flight 里抽好（首领还得等玩家点"迎战"才会扣费开打）
      log(p.text);
      startFight(huntTarget);
    } else if (p.type === 'trap') {
      if (!removeItem('trap', 1)) { log('没有陷阱了。', 'warn'); return; }
      S.traps = S.traps || { placed: 0 };
      S.traps.placed++;
      S.traps.day = S.day;
      // 立刻更新晨报里的陷阱条目：让玩家在"每日晨报"里能看到"已经埋好了，等明天"
      S.dailyReport = S.dailyReport || { day: S.day, ranch: null, trap: null };
      S.dailyReport.trap = { waiting: true, placed: S.traps.placed };
      log('你在兽径上布下陷阱，明天去草地上看看有没有收获。', 'good');
      awardExperience('gather',EXP_GATHER);
    } else if (p.type === 'drift') {
      if (chance(0.6)) {
        const roll = Math.random();
        if (roll < 0.5) { const q = rnd(1,3); gainItem('wood', q); log(`你捞起几根上游漂来的木头（木材×${q}）。`, 'good'); }
        else if (roll < 0.8) { gainItem('plank', 1); log('你捞起一块完整的木板。', 'good'); }
        else if (roll < 0.9) { gainItem('driftbottle', 1); log('一个漂流瓶！你把它捞了上来。', 'good'); triggerStory({ id:'e_driftbottle' }); }
        else { log('只有水草和泡沫。'); }
      } else { log('今天河里很干净，什么也没漂来。'); }
      awardExperience('gather',EXP_GATHER);
    } else if (p.type === 'adventure') {
      adventure(p);
    } else if (p.type === 'atlantisGate') {
      const chk0 = canTravel('atlantis');
      if (!chk0.ok) { log(chk0.reason, 'warn'); return; }
      log('你朝沟底那点微光游去……');
      if (onOverlay) { onOverlay({ kind:'atlAnim' }); return; }
      travel('atlantis'); return;
    } else {
      // （farm / trade / townTrade / townMission / townInfo / atlTrade 这些弹窗类点位
      //   已在前面统一提前返回，不会走到这里，也不再扣体力/当日次数）
    }

    // 精神见底（<20）时手会抖、脑子发木：采集类点位耗时 +10%
    const spiritLow = (st.spirit === undefined ? 100 : st.spirit) < 20;
    const spiritSlow = (spiritLow && ['gather','fish','trap','drift'].includes(p.type)) ? 1.1 : 1;
    // 工具每高一级，干活快 20%（斧/镐/刀/网都一样）
    if (!timePaidEarly) addMin(Math.max(1, Math.round((p.time || 15) * (1 - (tt - 1) * 0.2) * spiritSlow * gxTimeMul())));
    if (['gather','fish','trap','drift'].includes(p.type)) S.gatherCount = (S.gatherCount || 0) + 1;
    if (p.type === 'gather' && chance(0.05)) triggerRandomEvent(S.scene);
    change();
  }

  function adventure(p) {
    const id = p.id;
    // adventure 类点位是"先弹窗、玩家选完才给奖励"，所以一次性标记要等真正拿到东西才打。
    // 否则玩家关掉弹窗/选了"算了"，这个只该搜刮一次的点位就白白作废（山顶祭坛拿不到遗物就是这个坑）。
    const markDone = () => { if (p.once) S.flags['pt_' + p.id] = 1; };
    // 同上兜底，给"提前 return 的那几个弹窗"（求救信号 / 石碑 / 石板 / 祭坛）用：
    const showOnce = (opts) => {
      (opts.choices || []).forEach(c => {
        const orig = c && c.ok; if (typeof orig !== 'function') return;
        c.ok = function () {
          if (p.once && S.flags['pt_' + p.id] && !altarReady(p) && !onceRewardMissing(p)) { log(pointStatus(p) || '这里你早已搜刮过。', 'warn'); return; }
          return orig.apply(this, arguments);
        };
      });
      showOverlay(opts);
    };
    const choices = [];
    if (id === 'forest_hive') {
      // 养蜂人：蜂群认得他 —— 必定拿到蜂蜜，还额外多产（30% +1、10% 再 +2），也不会被蛰
      {
        const isBee = (S.identity === 'beekeeper');
        choices.push({ label:'冒险取蜜', hint: isBee ? '养蜂人：必定得蜂蜜，还有额外收获、不会被蛰' : '得蜂蜜×1·可能被蜂蛰（-8 生命/中毒）', text:'你屏住呼吸，把手伸进蜂巢。', ok:()=>{
          if (isBee) {
            let q = 1;
            if (chance(0.30)) q += 1;
            if (chance(0.10)) q += 2;
            if (gainItem('honey', q)) log(`蜂群认得你，乖乖让开了——获得：蜂蜜×${q}。`, 'good');
            addMin(20);
            return;
          }
          if (chance(0.6)) { if (gainItem('honey',1)) log('你抢到了一块滴着蜜的蜂房！获得：蜂蜜×1。','good'); }
          else { applyHarm(8); S.statuses.poison = Math.max(S.statuses.poison, 3); log('野蜂疯狂扑来！你被蛰得满头包。（-8 生命，中毒）','danger'); if (S.stats.hp<=0) die('野蜂的毒要了你的命。'); }
          addMin(20);
        } });
      }
      choices.push({ label:'还是算了', hint:'无风险', ok:()=>{ log('你悄悄退开，蜂群没有发现你。'); } });
    } else if (id === 'quarry_pit') {
      choices.push({ label:'进去看看', hint:'可能遇蜘蛛，或得矿石', ok:()=>{ if (chance(0.35)) { log('蛛网后闪过黑影！'); startFight(ENEMIES.spider); } else { gainItem('stone', rnd(2,4)); gainItem('ironore', rnd(1,2)); log('你在废矿坑里敲下不少矿石。','good'); addMin(30);} } });
      choices.push({ label:'太黑了，退出来', hint:'无风险', ok:()=>{ log('你退回了阳光下。'); } });
    } else if (id === 'grass_horse') {
      choices.push({ label:'慢慢接近', hint:'消耗茅草×5 · 50%驯服(赶路-30%)，失败次日可再试', ok:()=>{
        if (!hasItem('thatch', 5)) { log('野马警觉地后退。你需要 5 根茅草(当草料)来慢慢接近它。', 'warn'); return; }
        removeItem('thatch', 5);
        if (chance(0.5)) { S.flags.horse = 1; log('野马接受了你的草料，从此营地有了马。赶路时间-30%！','good'); diaryAdd('我驯服了一匹野马。'); }
        else { applyHarm(10); log('野马受了惊，把你掀翻在地，草料也被它扬了。（-10 生命，明日可再试）','danger'); if (S.stats.hp<=0) die('野马的一蹄要了你的命。'); }
        addMin(30); } });
      choices.push({ label:'不打扰它', hint:'无风险', ok:()=>{ log('你远远看了一会儿，走开了（明日可再来）。'); } });
    } else if (id === 'desert_remains') {
      // 白骨旁的破包裹只搜一次：翻过就没了（无论翻到金币还是被沙蝎咬）。
      // 以前没打标记 → 能反复翻，等于无限金币。选"合十离开"不打标记，后悔了还能回来翻。
      choices.push({ label:'搜刮包裹', hint:'可能得金币，或窜出沙蝎（-8 生命）', ok:()=>{ if (chance(0.5)) { const n = rnd(2,4); if (gainItem('coin', n)) log(`破包裹里竟有几枚古金币！获得：金币×${n}。`,'good'); } else { applyHarm(8); log('包裹里窜出一条沙蝎！（-8 生命）','danger'); if (S.stats.hp<=0) die('你倒在了白骨旁。'); } markDone(); addMin(20);} });
      choices.push({ label:'合十离开', hint:'精神+1', ok:()=>{ S.stats.spirit = Math.min(100, S.stats.spirit+1); log('你为他掩上一点沙，心里平静了一些。'); } });
    } else if (id === 'cave_slate') {
      showOnce({ title:'洞中遗迹', text:'岩壁上刻满了与荒漠白骨同源的古老文字。你在石缝里找到一块脱落的石板。', choices:[{ label:'带走石板', ok:()=>{ if (gainItem('slate',1)) { markDone(); log('获得：石板×1。','good'); } diaryAdd('洞深处的古文字。这座岛比我想的更老。'); } }]});
      return;
    } else if (id === 'peak_altar') {
      // 材料齐了就直接在这里开仪式（原来只有右下角那个小按钮，玩家极容易漏看）
      if (!S.flags.ended_C && hasItem('relic') && invCount('slate') >= 3 && hasItem('dragonbone')) {
        showOnce({ title:'远古祭坛', text:'凹槽的形状与三块石板严丝合缝，遗物在掌心发烫，龙骨也跟着共鸣——祭坛在等你把它们放上去。', choices:[
          { label:'举行祭坛仪式', hint:'遗物 + 石板×3 + 龙骨（记为章节目标，获得 50 魂点）', ok:()=>{ doPeakRitual(); } },
          { label:'再等等', hint:'先不举行', ok:()=>{ log('你把手收了回来。'); } },
        ]});
        return;
      }
      if (S.flags['pt_' + p.id] && !onceRewardMissing(p)) {
        showOnce({ title:'远古祭坛', text:'祭坛中央的凹槽还空着。这里似乎还缺些东西——遗物、三块石板、龙骨，缺一不可。', choices:[{ label:'知道了', ok:()=>{} }]});
        return;
      }
      showOnce({ title:'远古祭坛', text:'祭坛中央的凹槽形状奇异，四周刻着与石板相同的文字。你搬开碎石，露出一件蒙尘的遗物。', choices:[{ label:'带走遗物', ok:()=>{ if (gainItem('relic',1)) { markDone(); log('获得：遗物×1（章节目标·秘辛 需要的祭品之一）。','good'); } diaryAdd('山顶祭坛的遗物，冰凉得像在发烫。'); } }]});
      return;
    } else if (id === 'peak_eagle') {
      choices.push({ label:'攀上岩壁', hint:'60% 得鹰羽；失手会惊动雪羽鹰', ok:()=>{
        const ok60 = chance(0.6);
        if (ok60) { const n = rnd(1,2); if (gainItem('eaglefeather', n)) log(`鹰不在巢里。获得：鹰羽×${n}。`,'good'); }
        addMin(20);
        if (!ok60) { log('你刚摸到巢沿，一道白影尖啸着俯冲下来——是雪羽鹰！', 'danger'); startFight(ENEMIES.eagle); }
      } });
      choices.push({ label:'太危险了', hint:'无风险', ok:()=>{ log('你放弃了。'); } });
    } else if (id === 'sea_rescue') {
      showOnce({ title:'求救信号', text:'礁石上绑着一面破布条，旁边有个奄奄一息的年轻人。他叫小满，是商船的船员，风暴里落了水。', choices:[
        // ⚠️ 救成功必须 markDone()：这点位是 once:true，但 adventure 类不会自动打标记
        //    （doPoint 只给非 adventure 打），漏了就会像玩家反馈的那样"救了四个小满"。
        { label:'救他上筏（需要淡水×2）', need:{ water:2 }, ok:()=>{ removeItem('water',2); S.flags.xiaoman = 1; markDone(); log('小满成了营地的一员：采集+10%，夜袭前他会预警。','good'); diaryAdd('我救了一个叫小满的人。岛上不再只有我一个了。'); } },
        { label:'给他水，但不带他走', ok:()=>{ log('你把水留给了他，独自离开。'); } },
      ]});
      return;
    } else if (id === 'cove_chest') {
      choices.push({ label:'撬开它', hint:'70%得金币，或触发机关（-10 生命）', ok:()=>{ if (chance(0.7)) { const n = rnd(2,5); if (gainItem('coin', n)) log(`生锈的宝箱里滚出金币！获得：金币×${n}。`,'good'); } else { applyHarm(10); log('箱子里有机关！飞针擦过你的手臂。（-10 生命）','danger'); if (S.stats.hp<=0) die('锈箱里的机关要了你的命。'); } addMin(20);} });
      choices.push({ label:'不敢碰', hint:'无风险', ok:()=>{ log('你离开了宝箱。'); } });
    } else if (id === 'ruins_slate') {
      showOnce({ title:'遗迹石板', text:'断柱之间，一块石板完整无缺，刻着与洞中相同的文字。', choices:[{ label:'带走石板', ok:()=>{ if (gainItem('slate',1)) { markDone(); log('获得：石板×1。','good'); } } }]});
      return;
    } else if (id === 'ruins_explore') {
      choices.push({ label:'摸进废墟', hint:'可能得金币/遇守卫/迷路', ok:()=>{ const r = Math.random(); if (r < 0.4) { const n = rnd(2,5); addItem('coin', n); if (chance(0.3)) gainItem('crystal',1); log(`你在废墟里找到古金币×${n}。`,'good'); } else if (r < 0.7) { log('石像的阴影动了！'); startFight(ENEMIES.guard); } else { S.stats.spirit = Math.max(0, S.stats.spirit-8); log('你在断壁间迷了路，许久才转出来。（精神-8）','warn'); } addMin(30);} });
      choices.push({ label:'只在边缘看看', hint:'无风险', ok:()=>{ log('你沿着外墙走了一圈。'); } });
    } else {
      log('你在这里转了一圈，没什么特别的。');
    }
    // ⚠️ 通用兜底：一次性点位拿到奖励后，**同一个弹窗里**不许再点第二次。
    //    玩家反馈"救小海不退出界面能一直救""神秘骸骨能一直摸金币"就是这条：
    //    以前只有"关掉弹窗再点"才会被 pointAvailable 拦住，弹窗开着连点就一直发奖励。
    for (const c of choices) {
      const orig = c && c.ok;
      if (typeof orig !== 'function') continue;
      c.ok = function () {
        // ⚠️ 只拦"一次性点位已经拿过奖励"这一种情况。
        //    不能直接用 pointAvailable(p)：里面有每日次数/工具/天气等判定，
        //    而这些在 doPoint 阶段已经算过一遍了，再判一次会把"第一次点击"也误伤
        //    （鹰巢那种 daily 点位就是被这个坑到的）。
        if (p.once && S.flags['pt_' + p.id] && !altarReady(p) && !onceRewardMissing(p)) {
          log(pointStatus(p) || '这里你早已搜刮过。', 'warn'); return;
        }
        return orig.apply(this, arguments);
      };
    }
    if (choices.length) showOverlay({ title:p.name, text:p.text, choices });
  }

  // ---------- 随机事件 ----------
  function hintOf(c) {
    const parts = [];
    if (c.need) parts.push('需' + Object.entries(c.need).map(([k,v]) => `${ITEMS[k].name}×${v}`).join('、'));
    if (c.items) parts.push('得' + Object.entries(c.items).map(([k,v]) => `${ITEMS[k].name}×${typeof v === 'number' ? v : 1}`).join('、') + (c.chance !== undefined ? '（概率）' : ''));
    if (c.dmg) parts.push(`-${c.dmg}生命`);
    if (c.status === 'poison') parts.push('可能中毒');
    if (c.spirit) parts.push(`精神${c.spirit > 0 ? '+' : ''}${c.spirit}`);
    if (c.time) parts.push(`耗时${c.time}分`);
    if (c.fight) parts.push(`遭遇${ENEMIES[c.fight].name}`);
    if (c.noop) parts.push('无风险');
    return parts.join(' · ');
  }
  // 当前场景/天气/营地等级下，可能触发的随机事件有哪些（cond 里的每一条都必须同时满足）
  // 以前这里写成 ||，结果"雾天也漏雨""砖瓦房还漏雨"——只要有一个 cond 字段没用到就整条判成 true。
  function randomEventPool(sceneId) {
    const condOk = (e) => {
      if (!e.cond) return true;
      const c = e.cond;
      if (c.rain && !(S.weather === 'rain' || S.weather === 'storm')) return false;
      if (c.zone && S.zone !== c.zone) return false;
      if (c.day && S.day < c.day) return false;
      if (c.houseBelow && !(S.buildings.house < c.houseBelow)) return false;
      return true;
    };
    return RANDOM_EVENTS.filter(e => e.scene === sceneId && !(e.once && S.flags['re_'+e.id]) && condOk(e)
      && (e.id !== 're_pirates' || (S.day % 5 === 0 && S.laochao.accepted && S.laochao.accepted.c4 !== undefined && S.day >= S.laochao.accepted.c4 && S.day <= S.laochao.accepted.c4 + 2 && !S.flags.boss_pirateBoss)));
  }
  function triggerRandomEvent(sceneId) {
    const pool = randomEventPool(sceneId);
    if (!pool.length) return;
    const total = pool.reduce((a,b)=>a+b.w,0);
    let r = Math.random() * total;
    let ev = pool[0];
    for (const e of pool) { r -= e.w; if (r <= 0) { ev = e; break; } }
    // 石龛：选项要按"你还没拿到哪些神物"现场生成，走不了下面那套通用 choices → 单独一条路
    if (ev.id === 're_shrine') { triggerShrine(ev); return; }
    // ⚠️ 数值平衡 P1-5：**once 事件"不选也消耗"**。
    //    以前这一行在弹窗之前就把标记打上，玩家看到弹窗但没选（或选了"不敢妄动"）也算消耗掉，
    //    于是「石龛」这类唯一神物事件错过即永失。改为**真正做出选择时才打标**，
    //    和 playPoint 那侧 "一次性点位在领奖时才 markDone" 的写法保持一致。
    log(`【奇遇】${ev.text}`, 'sys');
    const beeSafe = ev.id === 're_hive' && S.identity === 'beekeeper';
    showOverlay({ title:'遭遇', text: ev.text, choices: ev.choices.map(c => ({
      label: c.label,
      hint: beeSafe && c.dmg ? hintOf({...c, dmg:0, status:null}) + ' · 养蜂人免蜇' : hintOf(c),
      ok: () => {
        if (ev.once) S.flags['re_'+ev.id] = 1;   // ← 选择之后才消耗
        log(`你选择了：${c.label}。`, 'sys');
        if (c.need) { if (!Object.keys(c.need).every(k => hasItem(k, c.need[k]))) { log('材料不够。', 'warn'); return; } Object.keys(c.need).forEach(k => removeItem(k, c.need[k])); }
        if (c.fight) { log('一场遭遇战！'); startFight(ENEMIES[c.fight]); return; }
        if (c.relic) gainRandomRelic();
        if (beeSafe && c.dmg) log('你熟练地避开蜂群，取走蜂蜜，没有被蜇。', 'good');
        if (c.dmg && !beeSafe) { applyHarm(c.dmg); log(`你受了伤（-${c.dmg} 生命）。`, 'danger'); if (S.stats.hp <= 0) { die('你没能挺过这次遭遇。'); return; } }
        if (c.status && !beeSafe) { S.statuses[c.status] = Math.max(S.statuses[c.status]||0, 3); log('你中毒了。', 'danger'); }
        if (c.spirit) { S.stats.spirit = Math.max(0, Math.min(100, S.stats.spirit + c.spirit)); log(`精神${c.spirit > 0 ? '+' : ''}${c.spirit}。`, c.spirit < 0 ? 'warn' : 'good'); }
        if (c.items) for (const k in c.items) { if (c.chance === undefined || chance(c.chance)) { const q = typeof c.items[k] === 'number' ? c.items[k] : 1; if (gainItem(k, q)) log(`获得：${ITEMS[k].name}×${q}。`, 'good'); } }
        if (c.noop) log('你选择了稳妥。');
        if (c.time) { addMin(c.time); log(`（耗时 ${c.time} 分钟）`, 'sys'); }
        change();
      },
    }))});
  }

  function showOverlay(cfg) { if (onOverlay) onOverlay({ kind:'choice', ...cfg }); }

  // ---------- 石龛（洞穴奇遇）· 三件神物三选一 ----------
  // 作者 2026-09-25：玩家反馈"神器那个界面出来一下，接着就卡，没什么意思，就让你看一眼，也不让你选"。
  // 起因就是这里——文案写着"里面供着三件神物"，但以前只有一个「取走神物」按钮，点下去**随机**给一件。
  // 现在把还没拿到过的神物抽三件摆出来，由玩家自己挑一件（不够三件就摆几件）。
  // ⚠️ 池子里**没有**亚特兰蒂斯之种：作者 2026-09-23 定案"之种可从海底神秘鱼人交换或商城购买"，
  //    所以石龛和深海售卖机一样都要把它排除掉（以前 gainRandomRelic() 是全表随机，会漏出来）。
  function shrinePool() {
    return Object.keys(RELICS).filter(id => id !== 'atlantisSeed' && !(S.relics || []).includes(id));
  }
  // 石龛弹窗的**内容**（标题 / 正文 / 选项）。抽成独立函数有两个好处：
  //   ① triggerShrine 只管"记日志 + 弹窗"，逻辑一眼看得完；
  //   ② 回归测试可以直接把这个配置拿出来，把每个选项的 ok() 真的执行一遍
  //      （"点这件拿到的是不是这件"这种问题，只有真跑 ok() 才测得出来）。
  function shrineChoices(ev) {
    const mark = () => { if (ev.once) S.flags['re_'+ev.id] = 1; };   // once 事件：**做选择之后**才消耗（P1-5）
    const calm = () => { mark(); S.stats.spirit = Math.min(100, S.stats.spirit + 2); log('你退后一步，没有惊动这处供奉。（精神+2）', 'sys'); change(); };
    const pool = shrinePool();
    if (!pool.length) {
      return { title:'石龛', text: ev.text + '\n\n龛里那三件神物，你都已经有了。', choices:[{ label:'合十离开', hint:'精神 +2', ok: calm }] };
    }
    // 抽三件：在"事件触发的这一刻"抽定，之后弹窗重绘也不会换人
    const bag = pool.slice(), show = [];
    while (bag.length && show.length < 3) show.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
    const choices = show.map(id => ({
      label: `取走「${RELICS[id].name}」`,
      hint: RELICS[id].desc,
      ok: () => {
        mark();
        log(`你选择了：取走「${RELICS[id].name}」。`, 'sys');
        S.relics.push(id);
        log(`你获得了神物【${RELICS[id].name}】——${RELICS[id].desc}`, 'good');
        change();
      },
    }));
    choices.push({ label:'不敢妄动', hint:'精神 +2', ok: calm });
    return { title:'石龛 · 三件神物', text: ev.text + '\n\n石龛只认一次供奉——拿了就再也不会有了，挑一件带走吧。', choices };
  }
  function triggerShrine(ev) {
    log(`【奇遇】${ev.text}`, 'sys');
    showOverlay(shrineChoices(ev));
  }

  // ---------- 战斗 ----------
  function meleeWeapons() {
    const arr = [];
    const w = S.equipment.weapon ? ITEMS[S.equipment.weapon] : null;
    const w2 = S.equipment.weapon2 ? ITEMS[S.equipment.weapon2] : null;
    if (w && !w.ranged) arr.push(w);
    if (w2 && !w2.ranged && w2.cat !== 'shield') arr.push(w2);
    return arr;
  }
  function buffV(stat) { if (!S.buffs || !S.buffs[stat]) return 0; if ((S.buffs[stat].until || 0) <= (S.tick || 0)) return 0; return S.buffs[stat].v || 0; }
  // 饰品属性访问器：集中兜住\"饰品没戴 / 物品表里没有\"两种空态，避免各公式各自写一遍易失配的取数。
  function accessoryStat(key) {
    return (S.equipment.accessory && ITEMS[S.equipment.accessory] && ITEMS[S.equipment.accessory][key]) || 0;
  }
  // 已命名武器的额外攻击加成（S.weaponNames[id].bonus）；没命名/没这件就 0。
  function weaponBonus(id) {
    return (S.weaponNames && S.weaponNames[id] && S.weaponNames[id].bonus) || 0;
  }
  // 由 ITEMS 条目反查它的键（装备槽里存的正是这个键；对象自带的 .id 并非所有武器都有：木棒/石矛/猎弓等没有）。
  // 命名加成按键存取，必须用键去读，否则\"给无 id 字段的武器命名后 +1 伤害不生效\"。
  function itemKeyOf(it) {
    if (!it) return null;
    for (const slot of ['weapon', 'weapon2']) {
      if (S.equipment[slot] && ITEMS[S.equipment[slot]] === it) return S.equipment[slot];
    }
    return it.id || null;
  }
  const BUFF_NAMES = {atk:'攻击',def:'防御',spd:'攻速',hp:'生命上限',accuracy:'命中'};
  function activeBuffs() {
    return Object.keys((S && S.buffs) || {}).filter(k => buffV(k) !== 0).map(k => ({
      stat:k, name:BUFF_NAMES[k] || '强化', value:buffV(k), minutes:Math.max(0, Math.ceil(S.buffs[k].until - (S.tick || 0))),
    }));
  }
  // 近战伤害：双持时不再取两把平均，而是【轮流出手】——本轮轮到哪把就用哪把的伤害，
  // 每挥一次换手。所以快匕首配重武器是"一轻一重交替"，而不是"用匕首的攻速吃大剑的伤害"。
  function playerAtk() {
    const ax = accessoryStat('atk');
    const cur = meleeWeaponNow();
    const wAtk = cur ? (cur.atk || 0) : 0;
    const wNames = (cur && weaponBonus(itemKeyOf(cur))) || 0;
    let base = 5 + wAtk + wNames + ax + sharpenAm() + cxAtk() + trainingAtk() + buffV('atk');
    return Math.round(base * (1 + metaBonus().atk)) + nightmareInfusionBonus().atk;
  }
  // 面板用：双持时给两把伤害的均值（期望值），免得面板显示"下一刀"让人误以为攻击变弱了
  function playerAtkAvg() {
    const ax = accessoryStat('atk');
    const me = meleeWeapons();
    // 双持逐刀轮换，命名加成跟各自武器走：均值 = 每把\"攻击 + 各自命名加成\"的平均，不能只读 me[0]。
    const wAtk = me.length ? Math.round(me.reduce((a,b)=>a+(b.atk||0)+weaponBonus(itemKeyOf(b)),0) / me.length) : 0;
    let base = 5 + wAtk + ax + sharpenAm() + cxAtk() + trainingAtk() + buffV('atk');
    return Math.round(base * (1 + metaBonus().atk)) + nightmareInfusionBonus().atk;
  }
  function rangedAtk(weapon) {   // 射击伤害：射击的那把远程武器攻击 + 弹药加成 + 该枪/弓自身的命名加成
    const rw = weapon || rangedWeapon();
    const ax = accessoryStat('atk');
    const nm = weaponBonus(itemKeyOf(rw));   // 命名加成跟\"真正开火的那把\"走，副手远程命名后同样生效
    return Math.round((5 + (rw ? rw.atk || 0 : 0) + nm + (hasRanged() || 0) + ax + cxAtk() + trainingAtk() + buffV('atk')) * (1 + metaBonus().atk)) + nightmareInfusionBonus().atk;
  }
  function charStats() {
    const me = meleeWeapons();
    const wAtk = me.length ? Math.round(me.reduce((a,b)=>a+(b.atk||0)+weaponBonus(itemKeyOf(b)),0) / me.length) : 0;
    const ax = accessoryStat('atk');
    const a = 5 + cxAtk() + trainingAtk();                                       // 人物攻击（含健身加成）
    const b = wAtk + ax + sharpenAm();                                           // 武器/加成（两把的命名加成已并入 wAtk 均值）
    const c = playerAtkAvg();                                                   // 面板显示期望攻击（双持=两把均值）
    return { a, b, c, def: playerDef(), spd: Math.round(combatSpeed()), block: Math.round(shieldBlock() * 100), health:healthValue(), hp: S.stats.hp, maxhp: hpMax(), stam: S.stats.stamina, maxstam: maxStam(), armor: S.equipment.armor ? ITEMS[S.equipment.armor].name : '无', cloth: S.equipment.cloth ? ITEMS[S.equipment.cloth].name : '无', tank: !!S.furniture.tank };
  }
  // 精神影响体力上限（透支机制）：≥50 满额；20~49 −10%；<20 −20%（并且采集更慢，见 doPoint）
  function spiritStamMul() {
    const sp = (S && S.stats && S.stats.spirit !== undefined) ? S.stats.spirit : 100;
    return sp >= 50 ? 1 : (sp >= 20 ? 0.9 : 0.8);
  }
  // 基础 150 + 难度加成 + 局外成长 + **床给的体力上限**（作者 2026-09-23），再按精神打折
  function maxStam() { return Math.round((150 + (DIFFICULTIES[S.difficulty].stamina || 0) + metaBonus().stamina + bedStamBonus() + 3 * ((S.permUsed && S.permUsed.abyssBreathPill) || 0)) * spiritStamMul()); }
  // 防御 = 基础 2 + 护甲 + 饰品 + 盾 + 神物buff + 战斗技能（每级 +1：打多了皮糙肉厚）
  function playerDef() { const a = S.equipment.armor ? ITEMS[S.equipment.armor] : null; const ax = accessoryStat('def'); const w2 = S.equipment.weapon2 ? ITEMS[S.equipment.weapon2] : null; const sh = w2 && w2.cat === 'shield' ? w2 : null; return 2 + (a ? a.def : 0) + ax + (sh ? sh.def : 0) + buffV('def') + cxDef() + nightmareInfusionBonus().def; }
  function shieldBlock() { const w2 = S.equipment.weapon2 ? ITEMS[S.equipment.weapon2] : null; return w2 && w2.cat === 'shield' ? (w2.block || 0) : 0; }
  // ---------- 横扫（双手重武器专属）与多目标敌人行为 ----------
  // ---------- 距离制战斗（作者 2026-09-19）----------
  // 原有"时间追赶"不变（出手次数、同时结算），上面再加一层**距离**：
  //   · 速度同时代表"每 100 时间单位（= 一个回合）前进的距离"，敌我平等；
  //   · 近战攻击距离 0（要贴到脸上），弓 30、手枪 15，远程怪各自带 range；
  //   · 距离不够时这一回合用来**逼近**（日志写明还差多少），不是白点。
  //   → 带弓的人可以在敌人冲到近身前先射好几轮，这就是"弓的额外回合"。
  // ⛔ 这里原来是 `RANGE_BOW = 30, RANGE_GUN = 15, RANGE_MELEE = 0, FIGHT_START_DIST = 30`。
  //    FIGHT_START_DIST 已删除：开局距离不再是一个固定值，改成"双方射程取大"（见 startFight）。
  const RANGE_BOW = 30, RANGE_GUN = 15, RANGE_MELEE = 0;
  const ATTACK_ACTS = ['attack', 'heavy', 'sure', 'sweep', 'ranged', 'throw'];
  function rangedRangeOf(it) { if (!it) return 0; return it.ammoItem ? RANGE_GUN : RANGE_BOW; }   // 手枪 15 / 弓 30
  function enemyRange(e) {
    if (!e) return RANGE_MELEE;
    if (typeof e.range === 'number') return e.range;
    return (e.traits || []).includes('gun') ? RANGE_GUN : RANGE_MELEE;
  }
  function myAttackRange() {
    const rw = rangedWeapon();
    if (rw) {
      const ammoOk = rw.ammoItem ? invCount(rw.ammoItem) > 0 : (invCount('eagleArrow') > 0 || invCount('arrow') > 0);
      if (ammoOk) return rangedRangeOf(rw);
    }
    return RANGE_MELEE;
  }
  function myMoveSpeed() { return Math.max(1, Math.round(combatSpeed(false))); }
  const ENEMY_COVER_REDUCE = 0.30;  // 掩护：全体友方受到的伤害 -30%（不叠加，取最大值）
  const ENEMY_HEAVY_MUL = 1.3;      // 猛击：攻击 ×1.3，但自身防御归零
  function hasTwoHand() { return !!(S.equipment.weapon && ITEMS[S.equipment.weapon] && ITEMS[S.equipment.weapon].twoHand); }
  // 横扫是否可用（战斗中由 UI 读这个来显示按钮）
  function sweepInfo() {
    const C = S && S.combat;
    if (!C) return { usable:false, reason:'不在战斗中' };
    if (!hasTwoHand()) return { usable:false, reason:'需要双手重武器' };
    if (C.sweepCd > 0) return { usable:false, reason:`还需 ${Math.ceil(C.sweepCd)} 秒` };
    const alive = C.enemies.filter(e => e.ehp > 0).length;
    return { usable:true, alive, reason:'' };
  }
  // ---------- 战斗 2 级的互斥选择：重击 / 必中（作者 2026-09-25）----------
  //   重击以前是"主干 2 级白送"（UI 里写死 combatLv()>=2 就给按钮、且没有冷却，是事实上的最优解），
  //   现在两个都要在技能树里点（互斥），**不学重击就没有重击**；两个共用 20 单位时间的冷却
  //   （与横扫同一套时间单位：每次出手推进 100/攻速）。
  //   老存档兼容见 load 时的 migCombat2 迁移。
  const ACT_CD_BASE = 20;
  function heavyNodeLv() { return nodeLv('combat', 'f_heavy'); }
  function sureNodeLv() { return nodeLv('combat', 'f_sure'); }
  function hasHeavy() { return heavyNodeLv() > 0; }
  function hasSure() { return sureNodeLv() > 0; }
  function heavyInfo() {
    const C = S && S.combat;
    if (!hasHeavy()) return { usable:false, reason:'未学「重击」' };
    if (!meleeWeapons().length) return { usable:false, reason:'需要近战武器' };
    if (!C) return { usable:false, reason:'不在战斗中' };
    if ((C.heavyCd || 0) > 0) return { usable:false, reason:`还需 ${Math.ceil(C.heavyCd)} 秒` };
    return { usable:true, reason:'' };
  }
  function sureInfo() {
    const C = S && S.combat;
    if (!hasSure()) return { usable:false, reason:'未学「必中」' };
    if (!meleeWeapons().length) return { usable:false, reason:'需要近战武器' };
    if (!C) return { usable:false, reason:'不在战斗中' };
    if ((C.sureCd || 0) > 0) return { usable:false, reason:`还需 ${Math.ceil(C.sureCd)} 秒` };
    return { usable:true, reason:'' };
  }
  // 敌人是否该做"蓄力/掩护/猛击"：当前**活着**的敌人 ≥2 只时才会用（单挑保持原样）
  function enemyMultiActing(C) {
    if (!C || !C.enemies) return false;
    return C.enemies.filter(e => e.ehp > 0).length >= 2;
  }
  // 敌人身上的掩护减伤（取最大值，不叠加）
  function coverReduceOf(C, e) { const al = C.enemies.filter(x => x.ehp > 0 && x.cover > 0); return al.length ? ENEMY_COVER_REDUCE : 0; }
  // 回合末重掷敌人意图：20% 蓄力（本回合不出手，下回合双倍）／20% 掩护（不出手，全体友方 -30% 伤害）／30% 猛击（×1.3 但防御归零）
  function rollEnemyIntents(C) {
    if (!enemyMultiActing(C)) { C.enemies.forEach(e => { e.intent = null; e.cover = 0; }); return; }
    for (const e of C.enemies) {
      if (e.ehp <= 0) { e.intent = null; continue; }
      if (e.isBoss) { e.intent = null; e.cover = 0; e.charged = 0; continue; }
      // 已执行的掩护保留到该敌人的下一次行动，不能在重掷意图时提前取消。
      const r = Math.random();
      e.intent = (r < 0.20) ? 'charge' : (r < 0.40) ? 'cover' : (r < 0.70) ? 'heavy' : 'attack';
    }
  }
  const INTENT_CN = { charge:'蓄力', cover:'掩护', heavy:'猛击', attack:'攻击' };
  function intentOf(e) { return e && e.intent ? (INTENT_CN[e.intent] || e.intent) : ''; }

  // 出手速度（攻速）。历史 bug：旧版直接取"主手武器的 spd + 副手只垫一个下限 10"，  // 副手几乎不计入，于是「主手放快匕首 + 副手放高攻大剑」能同时吃到主手的快攻速和两把的平均伤害，
  // 互换主副手攻速差 150%（实测主手匕首 = 23、主手大剑 = 9）——玩家反馈"主手带匕首几乎无敌"。
  // 现在的主副手完全对称：只看装了哪两把，不看谁在主手；谁先出手另由 fightAction 的 enemyFirst 决定。
  // 双持加成：两把都是匕首（数据里标了 dual）→ ×1.4；其余双持 → ×1.5。
  // 旧版是按武器 id 正则判断的，所以"石质匕首"（knifeStone）从来吃不到加成 —— 改成数据标记后不再靠名字猜。
  // ⚠️ 数值平衡 P0-2：**双持匕首单极化**。原来 DUAL_MUL_DAGGER = 2.0，配上嗜血狂刀吸血后，
  //    双持玄铁匕首战力（423）是源质长枪（187）的 2.3 倍，成了全游戏唯一最优解，
  //    敌方出手率被压到 39%，"贴脸互秒"。
  //    改法（作者 2026-09-22 定案，二选一取"倍率"这条）：匕首倍率 2.0 → **1.4**。
  //    为什么改倍率而不是再砍吸血：吸血那 30% 已经是统一后的值、也是双匕首流的**唯一特色**，
  //    再砍就把流派砍死了；倍率才是"白送的那个额外收益"（匕首本身 spd 已经最高）。
  //    ⛔ 不要两个都砍（会矫枉过正——双持牺牲了盾牌格挡，需要保留速度特色）。
  const DUAL_MUL = 1.5, DUAL_MUL_DAGGER = 1.4;
  function combatSpeed(forRanged) {
    const w = S.equipment.weapon ? ITEMS[S.equipment.weapon] : null;
    const w2 = S.equipment.weapon2 ? ITEMS[S.equipment.weapon2] : null;
    const sp = (it) => (it && it.spd !== undefined && it.spd !== null) ? it.spd : null;
    const a = sp(w), b = sp(w2);
    let s;
    // ⚠️ 混装（一手远程 + 一手近战）**不能**按双持加权算：那样射击也会吃到 ×1.5，
    //    手枪单拿攻速 5 → 配一把玄铁匕首变成 12.45（2.5 倍），远程强度直接失控
    //    （DPS 核查发现的 #1）。混装时只按"这一下实际用的是哪把"算，而且不乘双持倍率。
    const ranged = (it) => !!(it && it.ranged);
    const mixed = a !== null && b !== null && (ranged(w) !== ranged(w2));
    if (mixed) {
      s = forRanged ? (ranged(w) ? a : b) : (ranged(w) ? b : a);
    } else if (a !== null && b !== null) {
      // 双持基础速度 = 两把攻速按"攻击力加权"平均：重武器分量大，会把速度拉下来，
      // 于是"拿把破匕首白嫖攻速"的搭配不再划算，而"快配快 / 重配重"依然合理。
      const wa = Math.max(1, w.atk || 1), wb = Math.max(1, w2.atk || 1);
      const bothDagger = !!(w.dual && w2.dual);
      s = ((a * wa + b * wb) / (wa + wb)) * (bothDagger ? DUAL_MUL_DAGGER : DUAL_MUL);
    } else if (a !== null) s = a;
    else if (b !== null) s = b;
    else s = 10;                       // 空手
    s = Math.round(s * 10) / 10;
    return s + buffV('spd') + swiftBonus();   // swiftBonus保留兼容入口，刀刀暴击不增加攻速。
  }
  function sharpenAm() { return (S.weaponSharpen && S.weaponSharpen.am) ? S.weaponSharpen.am : 0; }
  function sharpen() {
    if (!S.equipment.weapon) { log('需要先装备一把武器。', 'warn'); return; }
    if (!S.furniture.grindstone) { log('需要先建造「磨刀石」家具。', 'warn'); return; }
    if (!hasItem('flint', 1)) { log('磨刀需要消耗 1 燧石。', 'warn'); return; }
    removeItem('flint', 1);
    S.weaponSharpen = { am:3, bleed:0.2, fights:3 };
    addMin(30);
    log(`你用磨刀石把${ITEMS[S.equipment.weapon].name}打磨得又光又利（+3 攻击，20% 几率让敌人流血，持续 3 场战斗）。`, 'good');
    change();
  }
  // 校准手枪：既修耐久，也把命中从 60% 提到 70%（一次性、永久）。
  // 旧版叫"校准"却只修耐久 —— 名字名不副实，而且副手也能开火，却要求"装备到主手"。
  function repairPistol() {
    const w = S.equipment.weapon;
    const w2 = S.equipment.weapon2;
    const id = (w && ITEMS[w] && ITEMS[w].id === 'pistol') ? w : ((w2 && ITEMS[w2] && ITEMS[w2].id === 'pistol') ? w2 : null);
    if (!id) { log('需要先把「源能手枪」装备到主手或副手。', 'warn'); return { ok:false }; }
    const slot = (id === w) ? 'weapon' : 'weapon2';
    const pa = durList('pistol');
    const pei = Math.min((S.equipIdx && S.equipIdx[slot]) || 0, Math.max(0, (pa || []).length - 1));
    const cur = (pa && pa.length) ? (pa[pei] !== undefined ? pa[pei] : pa[0]) : ((S.dur && S.dur.pistol !== undefined) ? S.dur.pistol : DURA.pistol);
    const needDur = cur < durMaxOf('pistol', pei);
    if (!needDur && pistolCalib()) { log('源能手枪已经校准过、耐久也是满的。', 'warn'); return { ok:false }; }
    if (!hasItem('sourceOre', 2)) { log('校准源能手枪需要 源矿×2。', 'warn'); return { ok:false }; }
    removeItem('sourceOre', 2);
    if (needDur) {
      if (pa && pa.length) pa[pei] = durMaxOf('pistol', pei); else { S.dur = S.dur || {}; S.dur.pistol = DURA.pistol; }
      durSync('pistol');
    }
    const first = !pistolCalib();
    S.pistolCalibrated = true;
    log(first
      ? '你用源矿重新校准了手枪的源能膛线——命中率从 60% 提到 70%（耐久' + (needDur ? '也已恢复满' : '本来就是满的') + '）。'
      : '你用源矿把手枪校准一新（耐久已满）。', 'good');
    change(); return { ok:true };
  }
  function fixBrokenPistol() {
    if (!hasItem('brokenPistol')) { log('你身上没有破损的源能手枪。', 'warn'); return { ok:false }; }
    if (!hasItem('energyCrystal', 1) || !hasItem('sourceBar', 1)) { log('修复需要 源能晶石×1 + 源质锭×1。', 'warn'); return { ok:false }; }
    removeItem('brokenPistol', 1); removeItem('energyCrystal', 1); removeItem('sourceBar', 1); gainItem('pistol', 1);
    log('你把破损的源能手枪修好了！', 'good'); change(); return { ok:true };
  }
  // 高阶武器维修成本随材料档次提高；神弓不可修复。
  const REPAIR_MATS = { pistol:['sourceBar',2], bullet:null, knifeStone:['stone',2], club:['stone',2], spear:['stone',2], bow:['ironingot',1], divineBow:null, arrow:null, eagleArrow:null, ironDagger:['ironingot',1], steelDagger:['steelingot',1], blackDagger:['blackingot',2], ironSword:['ironingot',1], ironGreatSword:['ironingot',3], steelSword:['steelingot',2], blackSword:['blackingot',2], blackGreatSword:['blackingot',4], coralBlade:['deepCoral',4], sourceSpear:['sourceBar',3] };
  function repairMatOf(id) { return Object.prototype.hasOwnProperty.call(REPAIR_MATS,id) ? REPAIR_MATS[id] : ['stone', 2]; }
  function repairWeapon(id) {
    const w = id || S.equipment.weapon; if (!w) { log('需要先装备或选择一把武器。', 'warn'); return {ok:false}; }
    if (!hasItem(w) || !ITEMS[w] || ITEMS[w].cat !== 'weapon' || (id && !keepsBroken(w))) return {ok:false};
    if (w === 'divineBow') { log('神弓无法修复；耐久归零后会留在背包中作收藏。', 'warn'); return {ok:false,reason:'神弓无法修复。'}; }
    if (!S.furniture.grindstone || S.scene !== 'camp') { log('需要回营地使用磨刀石。', 'warn'); return {ok:false}; }
    if (DURA[w] === undefined) { log('这件武器没有耐久。', 'warn'); return {ok:false}; }
    // 耐久是满的就别修 —— 以前会照收材料、白吃一份（石头×2 / 铁锭…）
    const wa0 = durList(w);
    const repairIdx = id ? wa0.indexOf(Math.min(...wa0)) : Math.min((S.equipIdx && S.equipIdx.weapon) || 0, Math.max(0, (wa0 || []).length - 1));
    { const ei0 = repairIdx;
      const cur0 = (wa0 && wa0.length) ? (wa0[ei0] !== undefined ? wa0[ei0] : wa0[0]) : ((S.dur && S.dur[w] !== undefined) ? S.dur[w] : DURA[w]);
      if (cur0 >= durMaxOf(w, ei0)) { log(`${ITEMS[w].name}的耐久已经是满的，不用修。`, 'sys'); return {ok:false}; } }
    const [mat, qty] = repairMatOf(w);
    if (!hasItem(mat, qty)) { log(`修补${ITEMS[w].name}需要 ${ITEMS[mat].name}×${qty}。`, 'warn'); return {ok:false}; }
    // 技能树「修补匠」：25% / 50% / 75% 概率不消耗修补材料（触发要写日志）
    if (chance(cxRepairFree())) log(`【修补匠】这次修补没消耗${ITEMS[mat].name}。`, 'good');
    else removeItem(mat, qty);
    const wa = durList(w);
    const ei = repairIdx;
    if (wa && wa.length) wa[ei] = durMaxOf(w, ei); else { S.dur = S.dur || {}; S.dur[w] = DURA[w]; }
    durSync(w);
    addMin(20);
    log(`你修补好了${ITEMS[w].name}，耐久恢复满。`, 'good');
    change();
    return {ok:true};
  }
  function nameWeapon(nm) {
    const w = S.equipment.weapon; if (!w) { log('需要先装备一把武器。', 'warn'); return; }
    if (!S.furniture.grindstone) { log('需要先建造「磨刀石」家具。', 'warn'); return; }
    S.weaponNames = S.weaponNames || {};
    if (S.weaponNames[w]) { log(`${ITEMS[w].name}已经命名过了，每把武器只能命名一次。`, 'warn'); return; }
    if (!hasItem('namecard')) { log('需要消耗 1 张命名牌。', 'warn'); return; }
    const name = (nm || '').trim().slice(0, 8);
    if (!name) { log('请输入一个名字。', 'warn'); return; }
    removeItem('namecard', 1);
    S.weaponNames[w] = { bonus: 1, name };
    addMin(30);
    log(`你为${ITEMS[w].name}刻下名号「${name}」，它从此更顺手（伤害永久 +1）。`, 'good');
    change();
  }
  function wNameOf(id) {
    if (!id || !ITEMS[id]) return '武器';   // 兜底：传进来的不是合法物品 id 时别让整场战斗崩掉
    return (S.weaponNames && S.weaponNames[id] && S.weaponNames[id].name) || ITEMS[id].name;
  }
  // ⚠️ 建筑链必须按"实际存在的最高级"夹一下：以前直接 BUILDING_CHAINS.fire[S.buildings.fire].warm，
  //    存档里等级越界（老版本层数更多、或改过的档）就会在**每次时间推进**时抛
  //    "Cannot read properties of undefined (reading 'warm')"，整局卡死。存档是红线，这里不能省兜底。
  function chainTier(chainId, lv) {
    const chain = BUILDING_CHAINS[chainId] || [];
    if (Number(lv) < 0) return { warm:0, rest:0, slots:0, def:0, raid:0.15, cook:0, cap:20 };
    const i = Math.max(0, Math.min(chain.length - 1, Number(lv) || 0));
    return chain[i] || { warm:0, rest:0, slots:1, def:0, raid:0.15, cook:0, cap:20 };
  }
  function warmth() {
    const c = S.equipment.cloth ? ITEMS[S.equipment.cloth] : null;
    return c ? (c.warm || 0) : 0;
  }
  // 气温只由游戏时间与天气决定：同一时刻反复打开面板不会随机跳数。
  function weatherTemperature(atTick = S.tick || 0) {
    const elapsed = Math.max(0, (S.tick || 0) - atTick);
    const absolute = Math.max(0, (S.day - 1) * 1440 + S.minute - elapsed);
    const day = Math.floor(absolute / 1440) + 1;
    const hour = Math.floor((absolute % 1440) / 60);
    const season = seasonOnDay(day).name;
    const seasonal = { 春:18, 夏:30, 秋:19, 冬:5 }[season] || 18;
    const weather = { sun:2, cloud:0, rain:-3, fog:-2, storm:-5, snow:-4 }[S.weather] || 0;
    const daylight = Math.round(4 * Math.cos((hour - 14) * Math.PI / 12));
    const daily = (day * 11 % 5) - 2;
    const hourly = ((day * 7 + hour * 13) % 3) - 1;
    return seasonal + weather + daylight + daily + hourly;
  }
  function environmentTemperature(scene = S.scene, zone = S.zone, atTick = S.tick || 0) {
    const air = weatherTemperature(atTick);
    if (scene === 'cave') return Math.round(16 + (air - 20) * 0.45);
    // 深水升降温比陆地缓慢，但仍随外界季节和天气同向变化。
    if (scene === 'atlantis') {
      const depth = { habitat:0, city:-2, coral:-2, coralForest:-3, shipwreck:-3,
        pearlCave:-4, trench:-7, sanctum:-8, abyss:-10 }[zone] || 0;
      return Math.round(13 + (air - 20) * 0.25 + depth);
    }
    const offset = { camp:0, farm:1, river:-2, forest:-2, bamboo:-2, quarry:2,
      grassland:1, desert:8, peak:-12, sea:-3, shore:1 }[scene] || 0;
    return air + offset;
  }
  function temperatureInfo(scene = S.scene, zone = S.zone, atTick = S.tick || 0) {
    const weather = weatherTemperature(atTick);
    const ambient = environmentTemperature(scene, zone, atTick);
    const cloth = warmth();
    // 36.6℃ 是未穿衣时的基准体温；环境传热、衣物和住所改变的是体温，不是室外气温。
    let shelter = scene === 'camp' ? (ambient < 20 ? Math.min(2, chainTier('house', S.buildings.house).warm) * 0.42 : (S.buildings.house > 0 ? -0.25 : 0)) : 0;
    let fire = scene === 'camp' && ambient < 20 ? Math.min(2, chainTier('fire', S.buildings.fire).warm) * 0.42 : 0;
    const active = S.tempActiveUntil > atTick ? 0.12 : 0;
    const suit = scene === 'atlantis' ? S.equipment.cloth : null;
    const suitThermal = ambient < 20 && (suit === 'diveSuit' || suit === 'diveSuit2')
      ? (suit === 'diveSuit2' ? 0.6 : zone === 'abyss' ? 0 : zone === 'trench' || zone === 'sanctum' ? 0.2 : 0.6) : 0;
    const baseBody = 36.6 + (ambient - 22) * 0.08 + cloth * 0.40 + active + suitThermal;
    // 营地保暖只补足舒适所需：升级住所/火源不会把穿衣正常的玩家烤到过热。
    // 衣物和户外高温本身的过热仍保留，室外与海底规则不变。
    if (shelter > 0) shelter = Math.min(shelter, Math.max(0, 37.5 - baseBody));
    if (fire > 0) fire = Math.min(fire, Math.max(0, 37.5 - baseBody - shelter));
    const body = Math.round((baseBody + shelter + fire) * 10) / 10;
    const state = body <= 35.5 ? 'cold' : (body >= 38.8 ? 'heat' : 'normal');
    return { value:body, body, weather, environment:ambient, state, ambient, cloth, shelter, fire, active, suitThermal,
      grace: Math.max(0, Math.ceil((S.tempGraceUntil || 0) - atTick)) };
  }
  function temperatureEntered(previous) {
    const next = temperatureInfo();
    if (next.state !== 'normal' && (next.state !== previous.state || next.ambient !== previous.ambient)) {
      S.tempGraceUntil = (S.tick || 0) + 30;
      log(`${next.state === 'cold' ? '寒意' : '热浪'}袭来：环境 ${next.environment}℃、体温 ${next.body.toFixed(1)}℃；有 30 分钟换衣缓冲。`, 'warn');
    }
  }
  // 当前装备里的远程武器（主手优先）；没装远程武器返回 null
  function rangedWeapon() {
    const w = S.equipment.weapon ? ITEMS[S.equipment.weapon] : null;
    const w2 = S.equipment.weapon2 ? ITEMS[S.equipment.weapon2] : null;
    return (w && w.ranged) ? w : ((w2 && w2.ranged) ? w2 : null);
  }
  // 有没有可开火的远程武器。口径与 rangedWeapon() 一致：主手优先，主手不是远程就看副手。
  // 返回 0（普通箭矢）/ 8（鹰羽箭 +8 攻击）/ null（没弹药或没远程武器）。
  // 旧版这里只看主手，于是「主手弓 + 副手手枪」会漏判。
  function hasRanged() {
    const rw = rangedWeapon();
    if (!rw) return null;
    if (rw.ammoItem) return invCount(rw.ammoItem) > 0 ? 0 : null;   // 手枪：源能子弹
    if (invCount('eagleArrow') > 0) return 8;
    if (invCount('arrow') > 0) return 0;
    return null;
  }
  // 扣弹药：必须扣"真正开火的那把武器"的弹药。
  // 旧版只按主手优先取带 ammoItem 的那把，导致「主手弓 + 副手手枪」时弓射一箭却扣掉一颗源能子弹。
  // 开火的那把远程武器 + 它的命中判定。
  // 旧版命中写死成"主手是手枪才 60%" → 把手枪挂副手就能用 ~90% 命中打出 50 伤害（弓才 10 伤害却吃 90%），
  // 而且"主手铁剑+副手手枪"时枪的命中根本不参与判定。现在命中跟伤害/弹药一样，都认"真正开火的那把"。
  // 返回 { gun: 手枪 / bow: 弓 / other: 其它远程 }
  function rangedKind(w) {
    if (!w) return null;
    if (w.ammoItem) return 'gun';
    return w.ranged ? 'bow' : 'other';
  }
  function pistolCalib() { return !!(S && S.pistolCalibrated); }
  function rangedAcc(kind) {
    // ⚠️ 弓术早先就改成"加暴击、不加命中"了（v1.09 公告写得很清楚），但这里 +5%/级 的命中一直没删，
    //    于是"弓术给命中、暴击又因为 critMul 的 bug 失效"，和文案完全错位（DPS 核查发现的 #3）。
    //    现在枪械精通仍然 +10%/级 命中；弓术不再给命中，只走暴击（见 critMul）。
    if (kind === 'gun') return Math.min(0.95, (pistolCalib() ? 0.7 : 0.6) + 0.10 * gunNodeLv());
    return Math.min(0.95, 0.9);        // 弓（以及将来其它远程）
  }
  function ammoConsume(weapon) {
    const rw = (weapon && weapon.ammoItem) ? weapon : rangedWeapon();
    // 远程武器也要磨损：每开一次火磨损一点（近战走 drainWeapon，远程走这里）
    const slot = equippedRangedSlot();
    if (slot) drainEquipSlot(slot);
    // 技能树「枪械精通 / 弓术」：按概率不消耗弹药（触发写日志）
    const isGun = !!(rw && rw.ammoItem);
    if (chance(ammoSaveChance(isGun ? 'gun' : 'bow'))) {
      log(isGun ? '【枪械精通】这一发没吃子弹。' : '【弓术】这一箭省下了箭矢。', 'good');
      return;
    }
    if (isGun) { removeItem(rw.ammoItem, 1); return; }               // 手枪：源能子弹
    if (invCount('eagleArrow') > 0) removeItem('eagleArrow', 1); else removeItem('arrow', 1);   // 弓：鹰羽箭优先
  }
  // 现在握着的远程武器在哪个槽（口径与 rangedWeapon() 一致：主手优先）
  function equippedRangedSlot() {
    const w = S.equipment.weapon, w2 = S.equipment.weapon2;
    if (w && ITEMS[w] && ITEMS[w].ranged) return 'weapon';
    if (w2 && ITEMS[w2] && ITEMS[w2].ranged) return 'weapon2';
    return null;
  }
  function combatLv() { return S.skill.combat; }
  function gatherLv() { return S.skill.gather; }
  // ⚠️ 旧版的 skillUp()/skillInfo()/skillCost() 已随技能树（B1）删除：
  //    它们只会"等级 +1"，不记录 S.skillPicks，会把主干和成长选项搞脱节。新入口是 skillUpTrunk()。

  // ==================== 技能树（B1：框架 + 主干三选一 + 遗忘 + 采集/制造分支）====================
  // 设计见 文档\技能树_设计规划.md §10（v2 定稿）。这里只放"数据查询 + 加点/遗忘"这些纯逻辑，
  // 具体数值钩子集中在下面 skillFx* 一小撮函数里，采集/制造/战斗各处只调它们，方便以后调平衡。
  function treeState() {
    if (!S.tree || typeof S.tree !== 'object') S.tree = {};
    if (!S.skillPicks || typeof S.skillPicks !== 'object') S.skillPicks = {};
    for (const k in SKILL_TREES) {
      if (!S.tree[k] || typeof S.tree[k] !== 'object') S.tree[k] = {};
      if (!Array.isArray(S.skillPicks[k])) S.skillPicks[k] = [];
      // ⚠️ 自愈：主干等级和"已投的点"必须一一对应（N 级 = 投过 N 点）。
      //    从旧版备份槽读进来的档会出现"等级是旧系统留下的、picks 是空的"，
      //    那几级就白升了（玩家反馈"前面升的级属于加了没？打雪鹰才 10 点血"）。
      //    这里按旧系统的效果补齐：采集补「熟手」、制造补「熟手（省时）」、战斗一半「攻」一半「防」。
      const lv = S.skill[k] || 0, pk = S.skillPicks[k];
      if (pk.length < lv) {
        const fill = ({ gather: ['yield'], craft: ['speed'], combat: ['atk', 'def'] })[k] || ['yield'];
        while (pk.length < lv) pk.push(fill[pk.length % fill.length]);
        if (!S.flags) S.flags = {};
        if (!S.flags._treeHealed) {
          S.flags._treeHealed = 1;
          log(`【技能】这份存档的技能等级缺少成长选项，已按旧效果自动补齐（${SKILL_TREES[k].name}主干 ${lv} 级）。`, 'good');
        }
      } else if (pk.length > lv) pk.length = lv;
    }
    return S.tree;
  }
  function nodeLv(kind, id) { treeState(); return (S.tree[kind] && S.tree[kind][id]) || 0; }
  function trunkPicks(kind, optId) { treeState(); const a = S.skillPicks[kind] || []; return optId ? a.filter(x => x === optId).length : a.length; }
  function trunkLv(kind) { return S.skill[kind] || 0; }
  function trunkCostNow(kind) { const lv = trunkLv(kind); return lv >= SKILL_TRUNK_MAX ? null : trunkCostOf(kind, lv); }
  function treeDef(kind) { return SKILL_TREES[kind]; }
  function nodeDef(kind, id) { const t = treeDef(kind); return t ? (t.nodes || []).find(n => n.id === id) : null; }
  function nodeSpent(kind, n, lv) { return nodeSpentOf(kind, n, lv); }
  // —— 数值钩子：采集 ——
  // ⚠️ 主干每级的加成在 2026-09-19 统一从 10% 削到 7%（作者要求，采集/制造都削）：
  //    主干 7 级满时是 +49%（原来是 +70%），专项节点数值没动。
  const TRUNK_STEP = 0.07;
  // 经验到手量：每次采集/每件制造都是 +1（**不要**改这里，作者 2026-09-19 澄清过口径），
  // 只有首领从 +10 提到 +15（见战斗结算里的 xg）。
  const EXP_GATHER = 1, EXP_CRAFT = 1;
  // 升级消耗的倍率（作者 2026-09-19 真正要的是这个）：采集树 ×2、制造树 ×3、战斗树不变。
  // data.js 里存的仍是基准数字，这里统一乘；显示 / 扣除 / 遗忘返还全走下面这几个函数，不会两处对不上。
  const SKILL_COST_MUL = { gather: 2, craft: 3, combat: 1 };
  function costMul(kind) { return SKILL_COST_MUL[kind] || 1; }
  function trunkCostOf(kind, lv) {
    const firstCosts={gather:16,craft:24};
    if(lv===0 && firstCosts[kind]!==undefined)return firstCosts[kind];
    return Math.round((SKILL_TRUNK_COST[lv] || 0) * costMul(kind));
  }
  function nodeCostOf(kind, n, lv) { return Math.round((((n && n.cost) || [])[lv] || 0) * costMul(kind)); }
  function nodeSpentOf(kind, n, lv) { let s2 = 0; for (let i = 0; i < lv; i++) s2 += nodeCostOf(kind, n, i); return s2; }
  function gxYieldMul() { const fine = nodeLv('gather','g_fine'); return 1 + TRUNK_STEP * trunkPicks('gather','yield') + (fine >= 2 ? 0.30 : fine ? 0.20 : 0) - (nodeLv('gather','g_rough') ? 0.10 : 0); }
  function gxTimeMul() { return Math.max(0.40, 1 - TRUNK_STEP * trunkPicks('gather','speed')); }
  function gxEnergyMul() {
    const rough = nodeLv('gather','g_rough');
    return Math.max(0.25, 1 - TRUNK_STEP * trunkPicks('gather','stam') + (nodeLv('gather','g_fine') ? 0.15 : 0) - (rough === 1 ? 0.20 : rough >= 2 ? 0.30 : 0));
  }
  function gxPineBonus() { return 0.07 * nodeLv('gather','g_nature'); }      // 美人松概率加成
  function gxWoodExtra() { return 0.5 * nodeLv('gather','g_wood'); }         // 每次砍树额外木材（攒够 1 份给）
  // —— 数值钩子：制造 ——
  function cxTimeMul() { return Math.max(0.40, 1 - TRUNK_STEP * trunkPicks('craft','speed')); }
  function cxRefundChance() { return TRUNK_STEP * trunkPicks('craft','refund'); }   // 制作返还材料
  function cxExtraChance() { return TRUNK_STEP * trunkPicks('craft','extra'); }     // 制作多产 1 件
  function cxRepairFree() { return [0, 0.25, 0.50, 0.75][nodeLv('craft','c_patch')] || 0; }   // 修补匠：修补不消耗材料
  // ⚠️ 材料倍率现在按配方算（「精工细作 +30%」只对有耐久的成品生效）→ 见 cxMatMulFor()
  function cxDurMul() { return (nodeLv('craft','c_line') ? 0.8 : 1) * (nodeLv('craft','c_finework') ? 1.3 : 1); }
  // —— 数值钩子：战斗主干（攻/防/暴击；武器组合技在 B2 批次）——
  function cxAtk() { return trunkPicks('combat','atk'); }
  function cxDef() { return 0.5 * trunkPicks('combat','def'); }
  function cxCrit() { return Math.min(1, 0.10 + 0.05 * trunkPicks('combat','crit') + (S.identity === 'hunter' ? 0.05 : 0) + accessoryStat('crit') + bladeCritBonus()); }
  // 会心一击倍率：基础 1.5。
  // 「弓术」作者 2026-09-22 改版 —— 不再是"弓命中 +5%"（命中在命中保底 + 0.9 基础值下已经很高，
  // 再加命中几乎摸不到收益），改成**用弓时暴击效果 +30%/+60%**，即倍率 1.5 → 1.8 / 2.1。
  // 只在使用弓时生效（手枪不吃这个加成）。
  // 会心倍率。⚠️ 弓术那档原来判的是 `weapon === 'bow'`（字符串），而调用点传的是**物品对象**，
  //    所以「弓术 +30%/+60% 暴击」实际上永远不生效（DPS 核查发现的 #2）。现在对象/键名都认。
  function critMul(weapon) {
    let mul = 1.5;
    const isBow = (weapon === 'bow') || !!(weapon && weapon.id === 'bow') || !!(weapon && weapon.ranged && !weapon.ammoItem);
    if (isBow && bowNodeLv() > 0) mul = [1.5, 1.8, 2.1][bowNodeLv()] || 1.5;
    return mul;
  }
  // —— 战斗分支（B2 第一批）：阔刃横扫（时间制 CD）/ 处决、嗜血狂刀 / 复仇 ——
  // 攻速口径：每 100 时间单位出手「攻速」次 → 每出手一次推进 100/攻速 时间单位。
  // 横扫 CD 用同一套时间单位：基础 20「秒」，每级 -2（= 作者的"减到 1/10"一档）。
  const SWEEP_CD_BASE = 20;
  function sweepNodeLv() { return nodeLv('combat','f_sweep'); }
  function sweepCdTotal() { return Math.max(2, SWEEP_CD_BASE - 2 * sweepNodeLv()); }     // 20 / 18 / 16 / 14
  function sweepMul() { return Math.round((0.8 + 0.2 * sweepNodeLv()) * 10) / 10; }     // 0.8 / 1.0 / 1.2 / 1.4（取一位小数，别留浮点尾巴）
  // 作者 2026-09-22 定案：默认不吸 → 1 级 30% → 2 级 40%，**第三级删除**（原来 30/40/50/60 太强）。
  //   技能树节点 f_vamp 的 max 已同步改成 2，所以这里只会有 0/1/2 三种取值。
  // 药师（作者 2026-09-22 定案）：使用道具的**回复量 +50%**（先算基础值再 ×1.5）。
  // 只放大正面回复，毒/负面不放大。所有用药路径都必须走这里，否则会出现
  // "背包里吃药管用、战斗里吃药不管用"这种半成品。
  function medHealMul() { return S && S.identity === 'herbalist' ? 1.5 : 1; }
  function medHeal(base) {
    if (!base) return 0;
    const v = Math.round(base * medHealMul());
    return base > 0 ? Math.max(base, v) : v;   // 正面回复至少不低于原值，免得四舍五入反而变小
  }
  // 嗜血狂刀：作者 2026-09-22 定案 —— **吸血统一 30%**，升级不再提高比例（原 30/40/50/60%）。
  // 理由：双匕首配合高攻速与命中保底几乎不会断档，比例越高越难平衡；
  // 升级的价值改为解锁【复仇】链，而不是继续放大回血。
  function vampRate() { return nodeLv('combat','f_vamp') > 0 ? 0.30 : 0; }

  // ---------- 配方材料配比调整（作者 2026-09-22 定案）----------
  // 玩家反馈"后期建造消耗太多木头"。规则：**木材类 ×0.8，其它材料 ×1.1**（只调配方，不动掉落）。
  // 为什么写成规则而不是手改数字：
  //   ① 配方有一百多条，手改容易漏、也无法一眼看出改过哪些；
  //   ② 想回退或换比例时只改这一处；
  //   ③ 断言可以直接对"规则是否生效"下判断，而不是逐条对常量。
  // 取整用 Math.round 且**保底 1**：材料不能变成 0 份，否则配方会凭空少一味。
  // ⚠️ 这几个用 var：adjustRecipeMats() 在文件靠前处就被调用，const/let 会撞暂时性死区
  var WOOD_MATS = { wood:1, plank:1, branch:1, bamboo:1, shipwood:1, pole:1 };
  var WOOD_MUL = 0.8, OTHER_MUL = 1.1;
  // 为什么加"堆量门槛"：配方里大量是 1~3 份的小数目，直接 ×0.8/×1.1 再四舍五入会
  // 把小配方砍得比大配方还狠（木材4→3、藤蔓8→9），手感很怪。只对**堆量大的材料**生效：
  //   木材类 ≥5 份才减 20%（4 份以内原样不动）
  //   其它材料 ≥5 份才加 10%
  // 这样"后期造大件省木头"的诉求达到了，早期小配方一点没动（也不影响食物配方的手感）。
  const MAT_TRIM_MIN = 5;
  var _recipeMatsAdjusted = false;
  function adjustRecipeMats() {
    if (_recipeMatsAdjusted) return;   // 幂等：重复调用会二次打折
    _recipeMatsAdjusted = true;
    // ⚠️ **食物/料理配方不参与**：这一轮要解决的是"后期建造太吃木头"，
    //    料理的配方是 2026-09-22「加料不加数值」那轮专门定过的门槛（盐/野菜/蜂蜜），
    //    再乘一遍会把那套设计整个推翻（大煎蛋 蛋5→6、超级大蛋 蛋12→13）。
    const isFoodRecipe = (r) => Object.keys(r.out || {}).some(id => {
      const it = ITEMS[id];
      return !!(it && (it.cat === 'food' || it.cat === 'drink'));
    });
    for (const r of RECIPES) {
      if (!r || !r.in || r.fixedMats) continue;
      if (isFoodRecipe(r)) continue;
      for (const k in r.in) {
        if (r.in[k] < MAT_TRIM_MIN) continue;
        const mul = WOOD_MATS[k] ? WOOD_MUL : OTHER_MUL;
        r.in[k] = Math.max(1, Math.round(r.in[k] * mul));
      }
    }
  }
  function execThreshold() { return [0, 0.20, 0.25, 0.30][nodeLv('combat','f_exec')] || 0; }
  function revengeBonus() { return [0, 0.20, 0.30, 0.40][nodeLv('combat','f_revenge')] || 0; }
  // 「嗜血狂刀」只认**双持两把匕首**（作者 2026-09-19：以前任何双持单手都吃吸血，等于白送）
  // dual:1 = 匕首类（石质匕首 / 铁匕首）
  function hasDualDagger() { const w = meleeWeapons(); return w.length >= 2 && w.every(x => !!x.dual); }
  // B2b：盾墙 / 疾风连击 / 狂战 / 铁壁 / 弓术 / 枪械精通
  // 盾墙：格挡率 +15% / +20%（技能描述写的就是这两档；代码原来是 0.15×级 = 15%/30%，
  // 二级比文案强 50% —— DPS 核查发现的 #4，改成照文案来）
  function wallBlockBonus() { const lv = nodeLv('combat','f_shield'); return [0, 0.15, 0.20][lv] || 0; }
  function wallDurMul() { return [1, 0.80, 0.65, 0.50][nodeLv('combat','f_shield')] || 1; }   // 盾耐久消耗
  function swiftBonus() { return 0; } // Legacy public API: 刀刀暴击不提供攻速。
  function bladeCritBonus() { return [0, 0.20, 0.30][Math.min(2, nodeLv('combat','f_swift'))] || 0; }
  function rageAtkMul() { return [1, 1.15, 1.22, 1.30][nodeLv('combat','f_rage')] || 1; }    // 狂战：攻击 +15/22/30%
  function rageTakenMul() { return nodeLv('combat','f_rage') > 0 ? 1.10 : 1; }               // 狂战：受伤 +10%
  function ironTakenMul() { return [1, 0.88, 0.82, 0.75][nodeLv('combat','f_iron')] || 1; }  // 铁壁：受伤 -12/18/25%
  function ironAtkMul() { return nodeLv('combat','f_iron') > 0 ? 0.95 : 1; }                 // 铁壁：攻击 -5%
  // 狂战/铁壁 对"打出去 / 挨下来"的最终修正（两棵互斥，同时只会有一个生效）
  function rageAtkFinal(mul) { return mul * rageAtkMul() * ironAtkMul(); }
  function rageTakenFinal(mul) { return mul * rageTakenMul() * ironTakenMul(); }
  function bowNodeLv() { return nodeLv('combat','f_bow'); }
  function gunNodeLv() { return nodeLv('combat','f_gun'); }
  function ammoSaveChance(kind) {   // 弓术 / 枪械精通：不消耗弹药的概率
    if (kind === 'gun') return [0, 0.20, 0.30, 0.40][gunNodeLv()] || 0;
    return [0, 0.15, 0.25, 0.35][bowNodeLv()] || 0;
  }
  // —— 加点 ——
  function skillUpTrunk(kind, optId) {
    const t = treeDef(kind);
    if (!t) return { ok:false, reason:'没有这棵技能树' };
    treeState();
    const opt = t.trunk.find(o => o.id === optId);
    if (!opt) return { ok:false, reason:'没有这个成长选项' };
    const lv = trunkLv(kind);
    if (lv >= SKILL_TRUNK_MAX) return { ok:false, reason:'主干已满级' };
    const cost = trunkCostOf(kind, lv);
    if ((S.exp[kind] || 0) < cost) return { ok:false, reason:`${t.expName}不足（需 ${cost}）` };
    S.exp[kind] = Math.round(((S.exp[kind] || 0) - cost) * 10) / 10;
    const measure=kind==='gather'?{yield:gxYieldMul,speed:gxTimeMul,stam:gxEnergyMul}[optId]:kind==='craft'?{speed:cxTimeMul,refund:cxRefundChance,extra:cxExtraChance}[optId]:null;
    const beforeEffect=measure?Math.round(measure()*100):null;
    S.skill[kind] = lv + 1;
    S.skillPicks[kind].push(optId);
    log(`【技能】${t.name}主干升到 ${lv + 1} 级：${opt.name}——${opt.desc}${measure?'（'+beforeEffect+'% → '+Math.round(measure()*100)+'%）':''}。`, 'good');
    save(); change();
    return { ok:true, lv: lv + 1 };
  }
  // 某个节点现在能不能学（返回 { ok, reason }）
  function nodeCheck(kind, id) {
    const t = treeDef(kind); const n = nodeDef(kind, id);
    if (!t || !n) return { ok:false, reason:'没有这个技能' };
    treeState();
    const lv = nodeLv(kind, id);
    // 提示里带上"现在有多少" —— 玩家反馈"这里怎么不能继续往下学了"，光说"需要 N"不够
    const have = Math.floor((S.exp[kind] || 0));
    if (lv >= n.max) return { ok:false, reason:'已经满级' };
    if (trunkLv(kind) < (n.need || 0)) return { ok:false, reason:`需要${t.name}主干 ${n.need} 级（现在 ${trunkLv(kind)} 级）` };
    if (n.needNode && nodeLv(kind, n.needNode) <= 0) return { ok:false, reason:`需要先学会「${(nodeDef(kind, n.needNode) || {}).name || n.needNode}」` };
    if (n.mutex && nodeLv(kind, n.mutex) > 0) return { ok:false, reason:`与「${(nodeDef(kind, n.mutex) || {}).name}」互斥` };
    const cost = nodeCostOf(kind, n, lv);
    if ((S.exp[kind] || 0) < cost) return { ok:false, reason:`${t.expName}不足（需 ${cost}，现有 ${have}）` };
    return { ok:true, cost };
  }
  function skillNodeLearn(kind, id) {
    const chk = nodeCheck(kind, id);
    if (!chk.ok) return chk;
    const n = nodeDef(kind, id);
    S.exp[kind] = Math.round(((S.exp[kind] || 0) - chk.cost) * 10) / 10;
    S.tree[kind][id] = nodeLv(kind, id) + 1;
    log(`【技能】学会「${n.name}」${S.tree[kind][id]} 级：${n.desc[S.tree[kind][id] - 1] || n.desc[n.desc.length - 1]}。`, 'good');
    save(); change();
    return { ok:true, lv: S.tree[kind][id], cost: chk.cost };
  }
  // 末端判定：没有任何"已经学会"的节点挂在它下面，才允许遗忘（作者要求：只能从最末端往外剥）
  function nodeIsLeaf(kind, id) {
    const t = treeDef(kind); if (!t) return false;
    if (nodeLv(kind, id) <= 0) return false;
    return !(t.nodes || []).some(n => n.needNode === id && nodeLv(kind, n.id) > 0);
  }
  function nodeForgetGain(kind, id) {
    const n = nodeDef(kind, id); const lv = nodeLv(kind, id);
    if (!n || lv <= 0) return 0;
    return Math.floor(nodeSpent(kind, n, lv) / 2);     // 返还 1/2 经验
  }
  function skillNodeForget(kind, id) {
    const t = treeDef(kind); const n = nodeDef(kind, id);
    if (!t || !n) return { ok:false, reason:'没有这个技能' };
    if (nodeLv(kind, id) <= 0) return { ok:false, reason:'还没学过这个技能' };
    if (!nodeIsLeaf(kind, id)) return { ok:false, reason:'只能遗忘最末端的技能——先把挂在它下面的技能忘掉' };
    const gain = nodeForgetGain(kind, id);
    delete S.tree[kind][id];
    S.exp[kind] = Math.round(((S.exp[kind] || 0) + gain) * 10) / 10;
    log(`【技能】你遗忘了「${n.name}」，返还 ${gain} 点${t.expName}。`, 'sys');
    save(); change();
    return { ok:true, gain };
  }
  // ---------- 主干遗忘（作者 2026-09-19）：想换流派时，主干也得能退 ----------
  // 规矩和专项一样：只能从**最末端往外剥**（先退最后加的那一级），返还那一级的一半经验。
  // 额外一条：主干这一级如果正撑着某个已学会的专项（专项的 need 门槛），得先把专项忘掉。
  function trunkForgetInfo(kind) {
    const t = treeDef(kind);
    if (!t) return { ok:false, reason:'没有这棵技能树' };
    treeState();
    const lv = trunkLv(kind);
    if (lv <= 0) return { ok:false, reason:'主干还没升过级' };
    const blockers = (t.nodes || []).filter(n => nodeLv(kind, n.id) > 0 && (n.need || 0) >= lv);
    if (blockers.length) {
      return { ok:false, reason:`主干 ${lv} 级正撑着「${blockers.map(n => n.name).join('、')}」，先把它们忘掉再退主干` };
    }
    const cost = trunkCostOf(kind, lv - 1);
    const optId = (S.skillPicks[kind] || [])[lv - 1];
    const opt = (t.trunk || []).find(o => o.id === optId) || {};
    return { ok:true, lv, optId, optName: opt.name || optId || '主干', cost, gain: Math.floor(cost / 2) };
  }
  function skillTrunkForget(kind) {
    const info = trunkForgetInfo(kind);
    if (!info.ok) return info;
    S.skillPicks[kind] = (S.skillPicks[kind] || []).slice(0, info.lv - 1);
    S.skill[kind] = info.lv - 1;
    S.exp[kind] = Math.round(((S.exp[kind] || 0) + info.gain) * 10) / 10;
    log(`【技能】你遗忘了主干「${info.optName}」那一级，返还 ${info.gain} 点${treeDef(kind).expName}（主干 ${info.lv} → ${info.lv - 1}）。`, 'sys');
    save(); change();
    return { ok:true, gain: info.gain, lv: S.skill[kind] };
  }
  // UI 用的一份完整快照
  function skillTreeInfo() {
    treeState();
    const out = {};
    for (const kind in SKILL_TREES) {
      const t = SKILL_TREES[kind];
      const nodes = (t.nodes || []).map(n => {
        const lv = nodeLv(kind, n.id);
        const chk = nodeCheck(kind, n.id);
        return {
          id:n.id, name:n.name, icon:n.icon, lv, max:n.max, desc:n.desc, cost:(lv < n.max ? nodeCostOf(kind, n, lv) : null), side:(n.side || 'r'),
          need:n.need || 0, needNode:n.needNode || null, mutex:n.mutex || null,
          mutexName: n.mutex ? ((nodeDef(kind, n.mutex) || {}).name || '') : '',
          needName: n.needNode ? ((nodeDef(kind, n.needNode) || {}).name || '') : '',
          canLearn: !!chk.ok, reason: chk.ok ? '' : chk.reason,
          canForget: nodeIsLeaf(kind, n.id), forgetGain: nodeForgetGain(kind, n.id),
        };
      });
      out[kind] = {
        kind, name:t.name, glyph:t.glyph, expName:t.expName,
        lv: trunkLv(kind), max: SKILL_TRUNK_MAX, cost: trunkCostNow(kind),
        exp: Math.round((S.exp[kind] || 0) * 10) / 10,
        picks: S.skillPicks[kind].slice(), trunk: t.trunk, nodes,
      };
    }
    return out;
  }
  // 累计获得过的经验 = 当前剩余 + 升级技能已经花掉的
  // （以前只看"剩余经验"，导致玩家花经验把技能升上去后，反而因为剩余经验变少而"等级下降"，
  //   出现"我制造 4 级了却说我制造经验不够 2"的矛盾）
  function setFocus(kind) {
    if(!S.furniture.shelf||S.scene!=='camp'||S.combat||S.death||S.ending||!['craft','gather','combat'].includes(kind))return {ok:false,reason:'请在营地使用书架选择集中方向。'};
    const next=JSON.parse(JSON.stringify(S));next.bookFocus=kind;const r=persistPair(next,JSON.parse(JSON.stringify(metaState())),false);
    if(r.ok){log('已选择'+({craft:'制造',gather:'采集',combat:'战斗'}[kind])+'集中：对应经验有50%概率翻倍。','good');change();}return r;
  }
  function awardExperience(kind,amount,events=1) {
    let total=0,doubles=0;for(let i=0;i<events;i++){const doubled=!!S.furniture.shelf&&S.bookFocus===kind&&chance(.5);total+=amount*(doubled?2:1);if(doubled)doubles++;}
    S.exp[kind]=Math.round(((S.exp[kind]||0)+total)*10)/10;
    if(doubles)log(({craft:'制造',gather:'采集',combat:'战斗'}[kind])+'集中生效：'+doubles+'次经验翻倍。','good');
    return total;
  }
  function expEarned(kind) {
    const lv = Math.max(0, S.skill[kind] || 0);
    let spent = 0;
    for (let i = 0; i < lv && i < 5; i++) spent += [10, 30, 60, 100, 150][i];
    return (S.exp[kind] || 0) + spent;
  }
  function expLevel(kind) { const e = expEarned(kind); if (e >= 100) return 5; if (e >= 60) return 4; if (e >= 30) return 3; if (e >= 10) return 2; return 1; }

  function startFight(enemy, confirmed) {
    // 允许传数组："固定来两只"这种需要精确控制数量，不能靠 pack 的 50% 概率
    // （作者 2026-09-22：海盗出没的非头目日固定两只小喽啰）
    let group = null;
    if (Array.isArray(enemy)) { group = enemy.filter(Boolean); enemy = group[0]; }
    if (!enemy) return;
    if (!group && enemy.boss && !confirmed) {   // Boss 战前确认（异常强大）
      showOverlay({ title:'危险 · ' + enemy.name, text:'此怪物异常强大，需要做好充足准备。确定讨伐？', choices:[
        { label:'迎战', ok:() => startFight(enemy, true) },
        { label:'撤退', ok:() => log('你谨慎地退了回去，从长计议。', 'sys') },
      ]});
      return;
    }
    const diff = DIFFICULTIES[S.difficulty].enemyMul;
    const ehp = Math.round(enemy.hp * diff);
    const atk = Math.round(enemy.atk * diff);
    // 群袭（pack）：出现时 50% 概率同时来两只；标了 packAlways 的（触手哨兵）必来两只
    // 首次夜袭触发前，普通狼遭遇只来一匹；按实际夜袭标记判断，熬过预定日期也仍受保护。
    // 夜袭使用独立的 startRaidFight，不受此保护影响。
    const singleWolf = enemy.id === 'wolf' && !S.flags.firstRaidDone;
    // 显式传数组时按数组来（数量精确，不走概率），普通狼仍遵守新手保护。
    const packN = singleWolf ? 1 : group ? group.length
      : ((enemy.traits || []).includes('pack') ? (enemy.packAlways ? 2 : (chance(0.5) ? 2 : 1)) : 1);
    const mkEnemy = () => ({ name:enemy.name, id:enemy.id, ehp, emax:ehp, atk, def:enemy.def, baseDef:enemy.def, spd:enemy.spd, range:enemy.range, traits:enemy.traits, isBoss: enemy.boss ? 1 : 0, desc:enemy.desc, cover:0, charged:0, heavy:0, intent:null });
    const enemies = []; for (let i = 0; i < packN; i++) enemies.push(mkEnemy());
    const C = {
      enemy: enemy, ehp, atk, def: enemy.def, spd: enemy.spd,
      enemies,
      round: 1, defending: false, usedItems: 0, summonTick: 0,
      accE: 0,   // 出手时间表：敌人攒了多少次出手没结算（速度 6 打 7 用它做出"第七轮连打两下"）
      log: [packN > 1 ? `遭遇了${enemy.name}×${packN}！` : `遭遇了${enemy.name}！`, enemy.desc],
      ranged: null,
      sweepCd: 0,        // 横扫冷却（时间单位/秒：每次出手推进 100/攻速）
      revenge: 0,        // 技能树「复仇」攒的反击层数
      multi: packN > 1,  // 开场是否多目标 —— 决定敌人会不会用蓄力/掩护/猛击
    };
    // ⚠️ 作者 2026-09-19：**取消了"进战斗自动射箭"**。
    //    以前装备弓/枪时一进战斗就自动先射 2~3 发（本来是"先手"的意思），玩家反馈"这不算先手，
    //    这是入场自动战斗"，而且那几发还可能抢掉神弓"第一次命中必会心"的特权。
    //    现在改成：带弓/枪（且有弹药）时 **第一轮你先出手**（先手 = 抢在敌人前面，而不是替你打），
    //    要不要射、要不要跑、要不要防御，全都由你点。
    const rn = hasRanged();
    if(enemy.id==='nightmareBoss') C.log.push('王座正在蓄势：下一轮撕裂攻击；随后恐吓、晕眩、分裂。');
    C.bowShots = 0;
    if (rn !== null) {
      const rw0 = rangedWeapon();
      const isGun = !!(rw0 && rw0.ammoItem);
      const ammoOk = rw0 ? (rw0.ammoItem ? invCount(rw0.ammoItem) > 0 : (invCount('eagleArrow') > 0 || invCount('arrow') > 0)) : false;
      if (ammoOk) {
        C.bowFirst = 1;   // 第一轮你先出手（enemyFirst 会被它压掉）
        C.log.push(isGun ? '你抬枪在手，抢在它扑过来之前——这一轮你先出手。' : '你搭弓在手，抢在它扑过来之前——这一轮你先出手。');
      }
    }
    // 距离制（作者 2026-09-19 起；开局距离口径 2026-09-23 由作者重新定案）：
    //   · 双方都近战 → 直接贴身开打（不然每场都要空走两回合，闷）；
    //   · 有远程 → **开局距离 = 双方射程的较大者**（作者原话："按双方射程最远的武器开局，
    //     比如如果对面是 20，我们是 15，那就是 20"）。
    //     谁手长谁第一回合就能开火，手短的一方先往前压；对射时双方都够得着。
    //   ⛔ 以前是一个固定值 30（只要场上有远程就拉 30）。后果：只带手枪时（射程 15）
    //      开局就在自己射程之外，而远程又给了"第一轮你先出手"（C.bowFirst），
    //      那一轮先手只能用来走路 —— 作者 2026-09-23 反馈"开局拿把枪也相距 30 步"。
    //   · 射程表：弓 30 / 手枪 15 / 近战 0；敌人用 e.range（如深海哨兵 20）或 gun 特性（15）。
    const myRange = myAttackRange();                                     // 已含"有没有弹药"的判断
    const foeRange = C.enemies.reduce((m, e) => Math.max(m, enemyRange(e)), RANGE_MELEE);
    C.dist = Math.max(myRange, foeRange);
    if (C.dist > 0) C.log.push(`你们相距约 ${C.dist} 步（你的射程 ${myRange} 步、对方 ${foeRange} 步——手长的先开火，手短的先往前压）。`);
    if (enemy.nightBuff && isNight()) {
      C.atk = Math.round(C.atk * 1.3);
      for (const e of C.enemies) e.atk = Math.round(e.atk * 1.3);
      C.log.push('黑暗让它更加强大。');
    }
    C.spdP = combatSpeed(); C.spdE = enemy.spd; C.spdBank = 0;
    S.combat = C;
    if (onFight) onFight('start', C);
    change();
  }

  // 神弓（限定）：每场战斗的第一次**命中**必定会心一击。
  // ⚠️ 必须两处都调：① 远程先手的那几箭（C.bowShots 分支）② fightAction 里的普通射击。
  //    只加在②的话，玩家开局那几箭走了先手分支，特权就永远不会触发。
  //    没打中不算（先手分支本来就没有命中判定，视为命中）。
  function divineCritRoll(C, weapon, dealt) {
    if (!weapon || !weapon.divineCrit || C.divineCritUsed) return null;
    C.divineCritUsed = 1;
    // 神弓属于弓：同样吃「弓术」的暴击倍率加成（1.5 / 1.8 / 2.1）
    return Math.round(dealt * critMul('bow'));
  }
  function combatAccuracy(act, target) {
    if (act === 'sure') return 1;        // 必中：面板显示 100%，实际也跳过掷骰（见 fightAction）
    const ranged = act === 'ranged' || (act === 'attack' && !meleeWeapons().length && hasRanged() !== null);
    const temp = temperatureInfo();
    const thermalPenalty = temp.grace > 0 || temp.state === 'normal' ? 0 : 0.10;
    // 命中保底（作者 2026-09-22）：连续未命中时，未命中率每层 ×0.7。
    //   写成「命中率 = 1 − 未命中率 × 0.7^连空次数」，1 次没打中下次未命中率就降到 70%，
    //   2 次降到 49%……打多了总能打中，不至于出现"十打九空"的观感。命中即清零（missStreak 已有）。
    // ⚠️ 只在一场战斗进行中生效：missStreak 是"本场连续落空"，战斗外残留的旧计数不该影响命中面板
    const streak = S.combat ? (S.missStreak || 0) : 0;
    const pity = (r) => r + (1 - r) * (1 - Math.pow(0.7, streak));
    if (ranged) return Math.max(0.2, Math.min(1, pity(rangedAcc(rangedKind(rangedWeapon())) + (S.identity === 'hunter' ? 0.1 : 0) + buffV('accuracy') - thermalPenalty)));
    let rate = (S.statuses.fear ? 0.7 : 0.9) + (S.identity === 'hunter' ? 0.1 : 0) + buffV('accuracy') - thermalPenalty;
    // 武器自带命中加成（数值平衡 P2-2）：珊瑚刺刃 data 里写着 acc:0.1、描述也写"提高命中率"，
    // 但以前**从来没人读这个字段** —— 死数据。这里接上，顺便让"二章武器有卖点"成立。
    if (!ranged) { const mw = ITEMS[S.equipment.weapon]; if (mw && mw.acc) rate += mw.acc; }
    if (act === 'heavy') rate -= 0.2;
    if (act === 'sweep') rate -= 0.15;
    if (act === 'throw') rate -= 0.1;
    if (target && (target.traits || []).includes('evade')) rate -= 0.2;
    return Math.max(0.2, Math.min(1, pity(rate)));
  }
  function combatActionInfo(act, target) {
    const ranged = act === 'ranged' || (act === 'attack' && !meleeWeapons().length && hasRanged() !== null);
    const range = ranged ? myAttackRange() : RANGE_MELEE;
    // 重击 / 必中：都是近战动作，且要先在技能树里学过（老存档由 migCombat2 补上重击）
    const available = (act === 'heavy') ? (hasHeavy() && (meleeWeapons().length > 0 || !rangedWeapon()))
                    : (act === 'sure')  ? (hasSure() && (meleeWeapons().length > 0 || !rangedWeapon()))
                    : true;
    return { available, accuracy:combatAccuracy(act, target), range, approaching:!!(S.combat && S.combat.dist > range) };
  }
  // Presentation only: weak runtime storage, never serialized with combat/save snapshots.
  const combatEvents = new WeakMap();
  function takeCombatEvents(C) {const events=combatEvents.get(C)||[];combatEvents.delete(C);return events;}
  function fightAction(act, ti) {
    const C = S.combat;
    if (!C || S.death || S.ending) return;
    if (!['attack','heavy','sure','ranged','sweep','throw','defend','item','flee'].includes(act)) return;
    if (act === 'sweep' && !sweepInfo().usable) return;
    if (act === 'heavy' && !heavyInfo().usable) return;
    if (act === 'sure' && !sureInfo().usable) return;
    if (act === 'ranged' && hasRanged() === null) return;
    if (!combatActionInfo(act).available) return;
    if (act === 'throw' && (C.thrown || !(ITEMS[S.equipment.weapon] || {}).throw)) return;
    const events=[];combatEvents.set(C,events);
    const fx=(target,type,value=0,extra={})=>events.push({target,type,value,side:target?'player':'enemy',hpAfter:target?Math.max(0,target.ehp):Math.max(0,S.stats.hp),...extra});
    const aliveNow = () => C.enemies.filter(e => e.ehp > 0);
    const aliveList = aliveNow();
    if (!aliveList.length) { endFight(true); return; }
    const target = (C.enemies[ti] && C.enemies[ti].ehp > 0) ? C.enemies[ti] : aliveList[0];
    const en = C.enemy;
    // 出手速度 = 这一下**实际用的那把武器**（混装远近时按用哪把算，不吃双持倍率；
    // 见 combatSpeed 里那条说明）。行动是射击就按远程算，其余按近战算。
    const myAtk = playerAtk(), myDef = playerDef(), mySpd = combatSpeed(act === 'ranged');
    const enSpd = (en && en.spd) || (C.enemies[0] && C.enemies[0].spd) || 10;   // 兜底：多敌/特殊战斗里 C.enemy 可能不全
    let first = en.traits.includes('first') || enSpd > mySpd;
    const defEff = (DIFFICULTIES[S.difficulty] && DIFFICULTIES[S.difficulty].defEff !== undefined) ? DIFFICULTIES[S.difficulty].defEff : 1;   // 防御效率：简单100%→传奇70%
    const roundLines = [];
    C.defending = act === 'defend';   // 防御在敌人先手前生效，保护本次行动的全部来袭。
    let fled = false;

    // 敌人身上的持续伤害（磨刀石的血槽=流血；蝎毒淬刃=中毒）
    let dotDown = 0;
    for (const e of aliveNow()) {
      if (e.bleed > 0) { e.bleed--; e.ehp -= 5; fx(e,'bleed',5); roundLines.push(`${e.name}伤口血流不止（-5）。`); }
      if (e.poison > 0) { e.poison--; e.ehp -= 4; fx(e,'poison',4); roundLines.push(`${e.name}被毒素侵蚀（-4）。`); }
      if (e.ehp <= 0) { e.ehp = 0; dotDown++; roundLines.push(`${e.name}倒下了！`); }
    }
    if (dotDown && !aliveNow().length) {
      C.finalEnemies = C.enemies.slice(); // Keep the real zero-HP targets for the final feedback frame.
      C.enemies = C.enemies.filter(e => e.ehp > 0); C.ehp = 0;
      C.log.push(roundLines.join(' ')); if (C.log.length > 20) C.log.shift();
      endFight(true); return;
    }

    const doPlayerTurn = () => {
      if (C.nightStun>0 && C.nightStunRound!==C.round) {C.nightStun--;roundLines.push('晕眩使你错失这次行动。');return;}
      const accBase = (S.statuses.fear ? 0.7 : 0.9) + (S.identity === 'hunter' ? 0.1 : 0);
      const isAttack = (act === 'attack' || act === 'heavy' || act === 'ranged');
      // 距离不够 → 这一回合用来逼近（近战要贴身、远程要进射程）；不是白点，日志写清还差多少。
      // 需要多远才算够：明确点「射击」用远程距离；点「攻击」时——手里没近战武器就用远程距离
      // （和下面"没有近战就继续用弓/枪"的攻击逻辑一致），有近战就得贴身。
      const need = combatActionInfo(act, target).range;
      if (ATTACK_ACTS.includes(act) && C.dist > need) {
        const mv = myMoveSpeed(), d0 = C.dist;
        C.dist = Math.max(0, C.dist - mv);fx(null,'approach',0,{side:'player',from:d0,to:C.dist});
        roundLines.push(`你向它逼近（距离 ${d0} → ${C.dist}${C.dist > need ? '，还没进到攻击距离' : '，已经能打到它了'}）。`);
        return;
      }
      // 横扫（双手重武器专属）：对全部敌人各造成 1 倍伤害，命中略降；按"出手次数"走冷却
      if (act === 'sweep') {
        if (C.sweepCd > 0) { roundLines.push(`横扫还没缓过劲（还需 ${Math.ceil(C.sweepCd)} 秒）。`); return; }
        C.sweepCd = sweepCdTotal();
        const acc = combatAccuracy('sweep', null);
        let n = 0;
        for (const e of aliveNow()) {
          if (!chance(combatAccuracy('sweep', e))) { fx(e,'miss');roundLines.push(`${e.name}及时伏低，横扫从它头顶掠过。`); continue; }
          let dealt = Math.max(1, Math.round(myAtk * sweepMul() * rageAtkMul() * ironAtkMul()) - e.def);   // 「阔刃横扫」0.8→1.4 倍；狂战/铁壁也吃
          if (e.traits.includes('stoneGuard')) { dealt = Math.max(1, Math.round(dealt * 0.75)); const rc = Math.max(1, Math.round(dealt * 0.25)); applyHarm(rc); roundLines.push(`石甲的符文把力道反噬回来（-${rc}）。`); if (S.stats.hp <= 0) S.stats.hp = 0; }
          const actualDamage=Math.min(Math.max(0,e.ehp),dealt);
          e.ehp -= dealt;fx(e,'hit',dealt); n++;
          roundLines.push(`${e.name}挨了一记横扫，受到 ${dealt} 点伤害。`);
          if (S.stats.hp>0 && actualDamage>0 && vampRate()>0 && hasDualDagger()) {const heal=Math.min(hpMax()-S.stats.hp,Math.max(1,Math.round(actualDamage*vampRate())));if(heal>0){S.stats.hp+=heal;roundLines.push(`【嗜血狂刀】双刀饮血，回复 ${heal} 点生命。`);}}
          if (e.ehp <= 0) { e.ehp = 0; roundLines.push(`${e.name}被击倒了！`); }
        }
        roundLines.unshift(n ? `你抡起武器横扫一圈，扫中 ${n} 个目标！` : '你横扫一圈，却谁也没扫中。');
        drainWeapon();
        return;
      }
      // 出手权由上面那张"时间表"分配：你点一次就出手一次，多打的那几次会以"敌人不还手"的形式体现
      const strikes = 1;
      for (let si = 0; si < strikes; si++) {
        if (C.fled) return;
        const tg = (target && target.ehp > 0) ? target : aliveNow()[0];
        if (!tg) return;
      if (act === 'throw') {
        C.thrown = true;
        if (chance(combatAccuracy('throw', tg))) { S.missStreak = 0; let dmg = Math.max(1, Math.round(myAtk * 1.6) - tg.def); tg.ehp -= dmg; fx(tg,'hit',dmg);roundLines.push(`你奋力掷出长矛，命中${tg.name}，造成 ${dmg} 点伤害！`); }
        else { fx(tg,'miss');noteMissStreak(); roundLines.push('长矛擦着它飞过，落空了。'); }
      } else if (act === 'attack' || act === 'heavy' || act === 'sure' || act === 'ranged') {
        const noMelee = !meleeWeapons().length && hasRanged() !== null;
        // 技能树：狂战（攻击 +15/22/30%）/ 铁壁（攻击 -5%）在这里生效
        let dmg = Math.round(((act === 'ranged' || noMelee) ? rangedAtk() : myAtk) * rageAtkMul() * ironAtkMul());
        if (act === 'heavy') dmg = Math.round(dmg * 1.5);
        if (act === 'sure') dmg = Math.round(dmg * 1.0);   // 必中：不加倍，只保证命中
        // 两个技能各自的冷却（20 单位时间，与横扫同一套口径）：用了就进冷却
        if (act === 'heavy') C.heavyCd = ACT_CD_BASE;
        if (act === 'sure') C.sureCd = ACT_CD_BASE;
        const anyRanged = (act === 'ranged' || noMelee);
        const acc = combatAccuracy(act, tg);
        const firedWeapon = anyRanged ? rangedWeapon() : null;
        // ⛔ 「铁甲/免疫铁器」(ironImmune) 这条减免已按作者 2026-09-23 要求**移除**：
        //    金属武器数值本身就高，再给它们豁免减免等于双重优势，没必要。
        //    现在这条特性对所有武器一视同仁（不再有 7 折）。
        //    ⚠️ 别把它加回来（data.js 里 boneguard/guard/mechGuard 仍写着 ironImmune 这个 name，
        //       但代码里已不读它；如果将来要用，请重新设计而不是恢复旧阈值写法）。
        // 必中 = 跳过命中判定（1.0 倍伤害的代价就是不额外加成）；其余按命中率掷骰
        if (act === 'sure' || chance(acc)) {
          S.missStreak = 0;
          if (act === 'sure') roundLines.push('【必中】你盯死了它的破绽，这一下避无可避。');
          let critical=false;let dealt = Math.max(1, dmg - tg.def);
          // 神弓（限定）：每场战斗的第一次**命中**必定会心一击。没打中不算，留到下一次命中。
          const divineDealt = divineCritRoll(C, anyRanged ? rangedWeapon() : null, dealt);
          if (divineDealt !== null) { critical=true;dealt = divineDealt; roundLines.push('神弓的弦音一响，这一箭必中要害！'); }
          else if (chance(cxCrit())) { critical=true;const cm = critMul(anyRanged ? rangedWeapon() : null); dealt = Math.round(dealt * cm); roundLines.push(cm > 1.5 ? `会心一击！（弓术加持 ×${cm}）` : `会心一击！`); }
          // 技能树「处决」：残血目标吃 +50%（触发写日志）
          if (execThreshold() > 0 && tg.emax > 0 && tg.ehp / tg.emax < execThreshold()) {
            dealt = Math.round(dealt * 1.5);
            roundLines.push(`【处决】${tg.name}已经撑不住了，这一击格外致命。`);
          }
          // 技能树「复仇」：每挨一次打攒一层（最多 3 层），下一次攻击按**层数**加成、用完清零。
          // ⚠️ 以前层数只是"跨回合保留"，加成恒为 revengeBonus() 一层 —— 攒 3 层和攒 1 层伤害一样，
          //    和"攒 3 层反击"的说法不符（DPS 核查发现的 #5）。现在按层数乘上去，并把层数写进日志。
          if (C.revenge > 0 && revengeBonus() > 0) {
            const stacks = Math.max(1, Math.min(3, C.revenge));
            const mul = 1 + revengeBonus() * stacks;
            dealt = Math.round(dealt * mul);
            roundLines.push(`【复仇】你把刚才挨的那几下一起还了回去（${stacks} 层 · +${Math.round((mul - 1) * 100)}% 伤害）。`);
            C.revenge = 0;
          }
          if (tg.traits.includes('stoneGuard')) { dealt = Math.max(1, Math.round(dealt * 0.75)); const rc = Math.max(1, Math.round(dealt * 0.25)); applyHarm(rc); roundLines.push(`石甲的符文把力道反噬回来（-${rc}）。`); if (S.stats.hp <= 0) S.stats.hp = 0; }
          // 敌人掩护：在场有敌人处于"掩护"状态时，受到的伤害 -30%（不叠加）
          const cr = coverReduceOf(C, tg);
          if (cr > 0) { dealt = Math.max(1, Math.round(dealt * (1 - cr))); roundLines.push(`同伴的掩护卸掉了部分力道（-${Math.round(cr*100)}%）。`); }
          const actualDamage=Math.min(Math.max(0,tg.ehp),dealt);
          const daggerVamp=!anyRanged && act!=='throw' && hasDualDagger() ? vampRate() : 0;
          tg.ehp -= dealt;fx(tg,critical?'critical':'hit',dealt);
          // 双持时在日志里标出"这一刀用的是哪把"（伤害与耐久都跟着这把走）
          // ⚠️ 这里以前传的是 meleeWeaponNow() 返回的**物品对象**，又去取它的 .id ——
          //    可绝大多数物品条目（石矛/石匕/铁剑…）根本没有 id 字段，于是 id=undefined →
          //    wNameOf(undefined) 抛异常。而这一行在"伤害已经结算(tg.ehp 已经扣了)、界面还没刷新"的中间，
          //    双持两把近战武器时每次命中都会炸，于是出现三个看起来无关的怪现象：
          //      ① 怪掉血了但血条/日志都不动（updateCombat 根本没被调到）
          //      ② 武器耐久永远不掉（drainWeapon 在抛异常那行之后，压根没执行）
          //      ③ 战斗卡住（endFight 也走不到，敌人血量为负也不会结束）
          //    现在直接取"这一挥用的是哪个装备槽"的 id（drainWeapon 之后才换手，所以这里仍是当前这把）。
          const usedW = (!anyRanged && !C.thrown && meleeWeapons().length > 1) ? S.equipment[weaponTurnSlot()] : null;
          const wTag = usedW ? `〔${wNameOf(usedW)}〕` : '';
          roundLines.push(`你${anyRanged ? (firedWeapon && firedWeapon.ammoItem ? '开枪射击' : '拉弓射箭') : act === 'heavy' ? '奋力重击' : act === 'sure' ? '稳稳命中' : '攻击'}${tg.name}${wTag}，造成 ${dealt} 点伤害。`);
          if (!anyRanged && act !== 'throw') drainWeapon();
          // 只按实际削掉的生命吸血，溢出伤害不回血；反伤致死也不能靠吸血复活。
          const healFromHit=(rate,label)=>{
            if(!(rate>0) || actualDamage<=0 || S.stats.hp<=0)return;
            const heal=Math.min(hpMax()-S.stats.hp,Math.max(1,Math.round(actualDamage*rate)));
            if(heal>0){S.stats.hp+=heal;roundLines.push(`${label}${heal} 点生命。`);}
          };
          healFromHit(daggerVamp,'【嗜血狂刀】双刀饮血，回复 ');
          if(hasRelic('vampire'))healFromHit(0.1,'吸血宝石吸回 ');
          if (S.weaponSharpen && S.weaponSharpen.bleed && chance(S.weaponSharpen.bleed)) { tg.bleed = (tg.bleed || 0) + 3; roundLines.push('你的利刃划开了它的伤口，血流不止！'); }
          if (C.coat > 0) { C.coat--; tg.poison = Math.max(tg.poison || 0, 3); roundLines.push(`${tg.name}的伤口泛起青黑——蝎毒发作了！`); }

          if (tg.ehp <= 0) { tg.ehp = 0; roundLines.push(`${tg.name}被击倒了！`); }
        } else { fx(tg,'miss');noteMissStreak(); roundLines.push(anyRanged ? '弹药擦着它飞过。' : '你的攻击落空了。'); }
        if (anyRanged) ammoConsume(firedWeapon);
        if (en.traits.includes('flee') && C.round >= 2 && tg.ehp > 0 && tg.ehp / tg.emax <= 0.4 && chance(0.5)) { roundLines.push(`${en.name}受了惊，转身逃走了！`); C.fled = true; C.enemyFled = true; }
      // ⛔ 防御**不回体力**（作者 2026-09-22 修复）：以前这里是「体力 +10」且没有上限，
      //    于是找个怪硬拖 15 回合就能刷满一管 150 体力 —— 体力系统形同失效，
      //    「回营地休息」这个决策也被删掉了。防御的收益只应该是"少挨打"（1.6 倍防御）。
      } else if (act === 'defend') { C.defending = true; roundLines.push('你摆出防御姿态。'); }
      else if (act === 'item') { C.usedItems++; roundLines.push('你使用了物品。'); }
      else if (act === 'flee') { const p = C.smoke ? 1 : Math.min(0.9, 0.5 + (mySpd - enSpd) * 0.05); if (chance(p)) { roundLines.push(C.smoke ? '浓烟掩护下，你全身而退！' : '你成功逃走了！'); C.fled = true; fled = true; C.smoke = false; } else roundLines.push('逃跑失败，敌人扑了上来！'); }
        if (isAttack && !aliveNow().length) return;   // 已经打死了，就不再补刀
      }
    };

    const doEnemyTurn = () => {
      if (C.fled) return;
      for (const e of aliveNow()) {
        if(e.isBoss){e.intent=null;e.charged=0;}
        e.cover = 0;
        if (e.heavy) { e.def = (e.baseDef !== undefined) ? e.baseDef : ((ENEMIES[e.id] && ENEMIES[e.id].def) || 0); e.heavy = 0; }
        // 距离制：还没进它的攻击距离 → 这轮它先靠近（远程怪到 20 步就能开火）
        const er = enemyRange(e);
        if (C.dist > er) {
          const mv = Math.max(1, Math.round(e.spd || 1)), d0 = C.dist;
          C.dist = Math.max(0, C.dist - mv);
          fx(e,'move',0,{side:'enemy',from:d0,to:C.dist,attacker:e});
          roundLines.push(`${e.name}正在逼近（距离 ${d0} → ${C.dist}）。`);
          if (C.dist > er) continue;      // 还没进它的射程，这轮出不了手
        }
        if(e.id==='nightmareBoss' && e._nightSkillRound!==C.round) {
          e._nightSkillRound=C.round;
          const skill=C.round%4;
          if(skill===0 && C.enemies.length<3) {
            const hp=Math.round(e.emax*0.09);
            C.enemies.push({id:'nightmareEcho',name:'裂梦残像',ehp:hp,emax:hp,atk:Math.round(e.atk*.35),def:3,baseDef:3,spd:10,traits:[],cover:0,charged:0,heavy:0,intent:null});
            C.multi=true;roundLines.push('【分裂】王座裂开，一具残像爬了出来！');continue;
          }
          if(skill===2) {
            if(C.defending) roundLines.push('你稳住呼吸，抵住了【恐吓】。');
            else {S.statuses.fear=Math.max(S.statuses.fear || 0,2);S.stats.spirit=Math.max(0,S.stats.spirit-8);roundLines.push('【恐吓】精神-8，命中降低。');}
            continue;
          }
          if(skill===3) {
            if(C.defending) roundLines.push('你护住头部，抵住了【晕眩】。');
            else {C.nightStun=1;C.nightStunRound=C.round;roundLines.push('【晕眩】下一次行动将被打断！');}
            continue;
          }
        } else if(!e.isBoss && e.traits.includes('dread') && C.round%4===0 && !C.defending) {
          S.stats.spirit=Math.max(0,S.stats.spirit-3);roundLines.push('梦魇的低语侵蚀心神（精神-3）。');
        }
        if(!e.isBoss && e.traits.includes('nightStun') && C.round%6===0 && !C.defending) {C.nightStun=1;C.nightStunRound=C.round;roundLines.push('梦魇的尖啸击晕了你，下一次行动被打断。');}
        // 蓄力：本回合不出手，下一击伤害翻倍
        if (e.intent === 'charge') { e.charged = 1; roundLines.push(`${e.name}压低身子开始蓄力……（下一击将造成双倍伤害）`); continue; }
        // 掩护：本回合不出手，为全体友方（含自己）提供 30% 减伤，不叠加
        if (e.intent === 'cover') { e.cover = 1; roundLines.push(`${e.name}横身挡在同伴身前——全体敌人受到的伤害降低 30%。`); continue; }
        let eDmg = e.atk;
        if (e.traits.includes('charge') && C.round === 1) { eDmg = Math.round(eDmg * 2); roundLines.push(`${e.name}借着冲势撞向你！`); }
        if (e.traits.includes('enrage') && e.ehp / e.emax < 0.3) { eDmg = Math.round(eDmg * 1.5); roundLines.push(`${e.name}发狂了！`); }
        if (e.traits.includes('gun') && C.round === 1) { eDmg += 10; roundLines.push('枪声响起，火弹呼啸而来！'); }
        if (e.intent === 'heavy') { eDmg = Math.round(eDmg * ENEMY_HEAVY_MUL); e.def = 0; e.heavy = 1; roundLines.push(`${e.name}抡起全力猛击——这一下很重，但它露出了破绽（防御归零）。`); }
        if (e.charged) { eDmg *= 2; e.charged = 0; roundLines.push(`${e.name}蓄力完成，狠狠砸了下来！`); }
        // ⚠️ 数值平衡 P1-1：**乘算封顶**。上面这几条（charge ×2 × enrage ×1.5 × heavy ×1.5 × charged ×2）
        //    全乘算且无上限，理论最高 ×7.8 —— 轻装玩家会被一击秒杀，而且看不出是哪条叠出来的。
        //    封顶 ×4：仍然"很痛"（洞穴熊极限一击从 200+ 收到 ≤80），但不再秒杀。
        //    放在枪的 +10 之后统一生效，所以 gun 那条的固定加成不会把封顶顶穿太多。
        eDmg = Math.min(eDmg, Math.round(e.atk * 4));
        if (e.traits.includes('water') && C.defending) { roundLines.push('在水中你无法有效防御。'); C.defending = false; }
        const armor = ITEMS[S.equipment.armor];
        // 盾墙（技能树）：格挡率 +15/20/25%（上限 95%）—— 挡住就是完全免伤，所以加成做在"挡得更勤"上
        const blk = Math.min(0.95, shieldBlock() + wallBlockBonus());
        if (blk > 0 && chance(blk)) { fx(null,'guard',0,{attacker:e});roundLines.push(blk > shieldBlock() && wallBlockBonus() > 0 ? `【盾墙】盾牌横在身前，${e.name}的攻击被稳稳卸掉！` : '盾牌结结实实地挡住了！'); continue; }
        if (armor && armor.dodge && chance(armor.dodge)) { fx(null,'dodge',0,{attacker:e});roundLines.push('护甲让你灵巧地避开了攻击！'); continue; }
        if (hasRelic('dodge') && chance(0.10)) { fx(null,'dodge',0,{attacker:e});roundLines.push('闪避护符一闪，你躲开了这次攻击！'); continue; }
        if (nightmareInfusionBonus().dodge > 0 && chance(nightmareInfusionBonus().dodge)) { fx(null,'dodge',0,{attacker:e});roundLines.push('你的身影掠过裂隙，闪避了攻击！'); continue; }
        // 防御效率按难度打折（简单 100% → 传奇 70%）；沉没之王的"穿透"再砍一半
        let defPart = myDef * defEff * (C.defending ? 1.6 : 1);
        if (e.traits.includes('pierce')) { defPart *= 0.5; roundLines.push(`${e.name}的巨力穿透了你的防御！`); }
        let taken = Math.max(1, eDmg - Math.round(defPart));
        taken = Math.max(1, Math.round(taken * (1 - metaBonus().armor) * rageTakenMul() * ironTakenMul()));
        applyHarm(taken);fx(null,'taken',taken,{attacker:e});
        roundLines.push(`${e.name}的攻击造成 ${taken} 点伤害。`);
        if(armor && armor.hitHeal && S.stats.hp>0) { const heal=Math.min(armor.hitHeal,hpMax()-S.stats.hp); S.stats.hp+=heal; roundLines.push(`【神之甲】回复 ${heal} 点生命。`); }
        if (revengeBonus() > 0) { C.revenge = Math.min(3, (C.revenge || 0) + 1); roundLines.push('【复仇】你记住了这一下，下一击会更狠。'); }
        if (S.equipment.armor && DURA[S.equipment.armor] !== undefined) drainById(S.equipment.armor);
        if (S.equipment.accessory && DURA[S.equipment.accessory] !== undefined) drainEquipSlot('accessory');
        // 盾墙：盾牌耐久消耗 -20/35/50%（用概率跳过磨损来体现）
        if (S.equipment.weapon2 && ITEMS[S.equipment.weapon2] && ITEMS[S.equipment.weapon2].cat === 'shield' && DURA[S.equipment.weapon2] !== undefined) {
          if (!chance(1 - wallDurMul())) drainById(S.equipment.weapon2);
        }
        if (e.traits.includes('poison') && chance(0.35)) { S.statuses.poison = Math.max(S.statuses.poison, 3); roundLines.push('你中毒了！'); }
        if (['wolf','cavebear','leopard','shark'].includes(e.id) && chance(0.25)) { S.statuses.bleed = Math.max(S.statuses.bleed, 2); roundLines.push('伤口开始流血！'); }
      }
      for (const sb of aliveNow().filter(e => e.isBoss && e.traits.includes('summon'))) {
        // 按"回合"结算召唤：原来按 enemy 的出手次数，攻速高的敌人会疯狂刷小怪
        if (C.round % 3 !== 0 || C._summonedRound === C.round) continue;
        C._summonedRound = C.round;
        const mn = sb.id === 'wolfKing'
          ? { name:'狼王之爪', id:'wolfMinion', ehp:34, emax:34, atk:11, def:3, baseDef:3, spd:14, traits:[], isBoss:0, cover:0, charged:0, heavy:0, intent:null }
          : { name:'蛛网幼体', id:'spiderMinion', ehp:26, emax:26, atk:8, def:2, baseDef:2, spd:13, traits:[], isBoss:0, cover:0, charged:0, heavy:0, intent:null };
        C.enemies.push(mn); roundLines.push(`${sb.name}发出嘶吼，召来了${mn.name}！`);
      }
      if (S.stats.hp <= 0) S.stats.hp = 0;
    };

    // 先手箭已经取消（作者 2026-09-19）：这里只做兜底清零，
    // 绝不能再 return —— 否则玩家点的这一次操作会被吃掉。
    C.bowShots = 0;
    // 带弓/枪且有弹药 → 第一轮你先出手（先手 = 抢在敌人前面，不替你打）
    const bowFirstNow = (C.bowFirst && C.round === 1);
    if (act === 'ranged' && first) first = false;
    // ---------- 出手时间表（时间追赶）：速度 = 每单位时间的出手次数 ----------
    // 你点一次 = 你出手一次；这期间敌人按 敌速/我速 的比例积累出手次数。
    // 例：你 6、敌人 7 → 每轮它积累 7/6：前 6 轮各出手 1 次（都比你先出手），
    //     第 6 轮积累到 2 次 → 它先打你一下，第 2 下与你这一击"同时结算"（你死了它也照样挨这一下）。
    const _spdP = Math.max(1, mySpd), _spdE = Math.max(1, enSpd);
    C.accE = Math.max(0, Math.min(3, (C.accE || 0) + _spdE / _spdP));
    let nE = Math.floor(C.accE + 1e-9);
    if (nE > 3) nE = 3;
    C.accE = Math.max(0, Math.min(2, C.accE - nE));
    const enemyFirst = !bowFirstNow && ((en.traits || []).includes('first') || _spdE > _spdP);   // 谁快谁先手（同速你先手；「先手」特性一定先；带弓第一轮你先）
    const twin = (nE >= 2);                    // 敌人这轮出手 ≥2 次 → 最后一次与你同时结算
    const before = enemyFirst ? (twin ? nE - 1 : nE) : 0;
    const openingSweep=act==='sweep'&&C.round===1&&C.dist<=RANGE_MELEE&&aliveNow().every(e=>!e.isBoss);
    if(openingSweep){
      doPlayerTurn();
      for(let i=0;i<nE;i++){if(C.fled||S.stats.hp<=0||!aliveNow().length)break;doEnemyTurn();}
    } else {
    for (let i = 0; i < before; i++) { if (C.fled || S.stats.hp <= 0) break; if (!aliveNow().length) break; doEnemyTurn(); }
    if (twin) { if (!C.fled && S.stats.hp > 0 && aliveNow().length) { doEnemyTurn(); doPlayerTurn(); } } // 仅最后一击同时结算；此前已死亡不能靠吸血复起。
    else if (enemyFirst) { if (!C.fled && S.stats.hp > 0 && aliveNow().length) doPlayerTurn(); }
    else {
      doPlayerTurn();
      for (let i = 0; i < nE; i++) { if (C.fled) break; if (!aliveNow().length) break; doEnemyTurn(); }
    }
    }

    C.defending = false;
    // 击杀后的"最终名单"：**先留一份**（含刚被打倒、ehp 已经是 0 的那只），再滤掉死的。
    // 作者 2026-09-25："最后一击之后……改成结算伤害后再停啊（对面血量应该显示 0）" ——
    //   UI 现在拿这份名单在停的那一秒里把血条画成 0；以前先滤掉再 endFight，
    //   界面上只能停着"扣血前"的画面。
    C.finalEnemies = C.enemies.slice();
    C.enemies = C.enemies.filter(e => e.ehp > 0);
    C.ehp = C.enemies.length ? C.enemies[0].ehp : 0;
    // 横扫冷却改成【时间制】（作者 2026-09-18）：每次出手推进 100/攻速 个时间单位。
    // 例：攻速 10 → 一次出手 10 秒 → CD 20 秒 = 两次出手后又能扫。
    if (act !== 'sweep' && C.sweepCd > 0) {
      C.sweepCd = Math.max(0, C.sweepCd - 100 / Math.max(1, combatSpeed(false)));
    }
    // 重击 / 必中 的冷却（与横扫同一套时间单位，基础 20）：这一下不是它、且还在转，就往前推一格
    if (act !== 'heavy' && (C.heavyCd || 0) > 0) C.heavyCd = Math.max(0, C.heavyCd - 100 / Math.max(1, combatSpeed(false)));
    if (act !== 'sure' && (C.sureCd || 0) > 0) C.sureCd = Math.max(0, C.sureCd - 100 / Math.max(1, combatSpeed(false)));
    if(en.id==='nightmareBoss' && aliveNow().some(e=>e.id==='nightmareBoss')) roundLines.push('它正在准备：'+['分裂（最多两具残像）','撕裂攻击','恐吓（防御可抵挡）','晕眩（防御可抵挡）'][(C.round+1)%4]+'。');
    rollEnemyIntents(C);                          // 重掷敌人下回合意图（蓄力/掩护/猛击）
    C.log.push(roundLines.join(' ')); if (C.log.length > 20) C.log.shift(); C.round++;

    if (C.fled) { endFight(false); return; }
    if (!C.enemies.length) { endFight(true); return; }
    if (S.stats.hp <= 0) { endFight(false); die('你在战斗中倒下了。'); return; }
    if (onFight) onFight('update', C);
    change();
  }

  function endFight(win) {
    const C = S.combat;
    // 交给 UI 的收尾状态：win + **最终名单**（含刚被打倒的 0 血目标），
    // 让战斗结束停的那一秒里血条显示的是"这一击结算之后"的样子（作者 2026-09-25）。
    const broken=(C?.brokenItems || []).slice();
    const fin = { win: !!win, enemies: ((C && C.finalEnemies) || (C && C.enemies) || []).slice() };
    if (S._raid) {
      const cb = S._raid; S._raid = null;
      S.combat = null;
      if (onFight) onFight('end', fin);
      if(broken.length && S.stats.hp>0)showOverlay({title:'装备损坏',text:broken.map(id=>'你的'+ITEMS[id].name+'已损坏').join('\n'),choices:[{label:'知道了',ok:()=>{}}]});
      if (win) { if (cb.win) cb.win(); } else { if (cb.lose) cb.lose(); }
      change();
      return;
    }
    const en = C.enemy;
    if (win) {
      if (S.weaponSharpen) { S.weaponSharpen.fights = (S.weaponSharpen.fights || 1) - 1; if (S.weaponSharpen.fights <= 0) { S.weaponSharpen = null; log('打磨的锋利劲头过去了。', 'warn'); } }
      S.killCount[en.id] = (S.killCount[en.id] || 0) + 1;
      if (!S.seen['mon_'+en.id]) { S.seen['mon_'+en.id] = 1; const mm = metaState(); mm.seenMon[en.id] = 1; metaSave(); log(`「图鉴」击败了：${en.name}`, 'sys'); }
      let got = [];
      for (const d of en.drops) {
        if (chance(Math.min(1, d.ch * (1 + metaBonus().luck)))) { const q = qtyParse(d.qty); if (gainItem(d.id, q)) got.push(`${ITEMS[d.id].name}×${q}`); }
      }
      log(`你击败了${en.name}！`, 'good');
      if (got.length) log(`战利品：${got.join('、')}。`, 'good');
      else log(`（${en.name}身上没留下什么可用的东西。）`, 'sys');
      // 战斗经验按怪强度分档：小怪+1 普通+2 精英+3 Boss+10
      // 经验：怪可以自带 exp（例：海底远程精英 +5），否则按强度分档；首领 15
      const xg = (en.exp !== undefined) ? en.exp : (en.boss ? 15 : (en.hp >= 100 ? 3 : en.hp >= 30 ? 2 : 1));
      awardExperience('combat',xg);
      log(`战斗经验 +${xg}。`, 'sys');
      if (en.boss) { S.flags['boss_'+en.id] = 1; diaryAdd(`我击败了${en.name}。`); }
      if (en.id === 'slateGuard') S.flags.slateGuardDone = 1;
      if (en.id === 'wolfKing') S.flags.wolfKingDone = 1;
      if (en.id === 'pirateBoss' && S.flags['boss_pirateBoss']) log('海盗的威胁解除了。盐镇的悬赏可以领取。', 'good');
      if (S.stats.hp < 20) diaryAdd('险胜一场，差点回不来。');
    } else if (C.enemyFled) {
      // 是"它"跑了，不是"你"跑了——以前两种情况共用一句话，容易误会成打死却没掉落
      log(`${en.name}受了伤，一溜烟跑掉了——什么都没留下。`, 'warn');
    } else {
      log(`你从${en.name}面前逃开了。`, 'warn');
    }
    S.combat = null;
    // 先取出续程回调；提示与刷新不能成为完成赶路的前置条件。
    const _cb = S._onFightWin; S._onFightWin = null;
    const road = S._roadAmbush;
    const continued = win && S.stats.hp>0 && !S.death && !S.ending;
    if (onFight) onFight('end', fin);
      if(broken.length && S.stats.hp>0)showOverlay({title:'装备损坏',text:broken.map(id=>'你的'+ITEMS[id].name+'已损坏').join('\n'),choices:[{label:'知道了',ok:()=>{}}]});
    if (continued && _cb) _cb();
    else if(continued && road && road.enemy===en.id && sceneOf(road.id)) {
      // 函数不写入JSON；旧/当前存档中的赶路记录可恢复胜后抵达。
      S._roadAmbush=null;
      if(S.scene!==road.id){log(`${en.name}倒下了，路通了。`,'good');arriveAt(road.id);}
    }
    else if(S.nightmareHarvest) {
      const pending=S.nightmareHarvest;S.nightmareHarvest=null;
      const p=continued && pending.scene===S.scene && pending.zone===S.zone && pointsOf().find(p=>p.id===pending.id);
      if(p){S._nightmareHarvestPass=p.id;try{doPoint(p);}finally{S._nightmareHarvestPass=null;}}
    }
    if(!continued && road && road.enemy===en.id)S._roadAmbush=null;
    change();
    if (win && en.id==='nightmareBoss' && S.difficulty==='nightmare') {
      S.flags.ended_N=1;S.flags.settled_N=1;S.flags.settledEnding='N';S.ending='N';
      metaSettle();save();if(onEnding)onEnding('N','');
    }
  }

  function useItemInFight(id) {
    const C = S.combat;
    if (!C || C.usedItems >= 2) return false;
    const it = ITEMS[id];
    if (!it || !hasItem(id)) return false;
    if (it.cat !== 'med' && id !== 'smokeBomb' && id !== 'poisonCoat') return false;
    removeItem(id, 1);
    C.usedItems = (C.usedItems || 0) + 1;   // 每场战斗最多 2 次道具：以前只检查不计数，等于可以无限用
    const leftTip = () => `（本场道具 ${C.usedItems}/2）`;
    if (id === 'smokeBomb') { C.smoke = true; C.log.push(`你掷出简易烟雾弹，浓烟弥漫——下一次逃跑必定成功！${leftTip()}`); if (onFight) onFight('update', C); return true; }
    if (id === 'poisonCoat') { C.coat = 3; C.log.push(`你把淬毒剂抹在武器上——接下来 3 次命中会让敌人中毒。${leftTip()}`); if (onFight) onFight('update', C); return true; }
    restoreHealth(it);
    if(it.healthRestore)C.log.push(`你使用${it.name}，健康+${it.healthRestore}${it.cureInfection?'，感染已处理':''}。`);
    if (it.heal) { const h = medHeal(it.heal); S.stats.hp = Math.min(hpMax(), S.stats.hp + h); C.log.push(`你使用${it.name}，生命+${h}。`); }
    if (it.stopBleed) { S.statuses.bleed = 0; C.log.push('血止住了。'); }
    if (it.curePoison) { S.statuses.poison = 0; C.log.push('毒解了。'); }
    if (it.sta) { S.stats.stamina = Math.min(maxStam(), S.stats.stamina + it.sta); C.log.push(`你灌下${it.name}，体力+${it.sta}。`); }
    if (it.water) { S.stats.thirst = Math.min(100, S.stats.thirst + it.water); C.log.push(`水分+${it.water}。`); }
    if (it.spirit) {
      S.stats.spirit = Math.max(0, Math.min(100, S.stats.spirit + it.spirit));
      C.log.push(it.spirit > 0 ? `精神+${it.spirit}。` : `精神${it.spirit}——眼前一阵发黑。`);
    }
    C.log.push(`你使用了${it.name}。${leftTip()}`);
    if (onFight) onFight('update', C);
    return true;
  }

  // ---------- 夜袭 ----------
  function raidLose(power, defense) {
    log(`夜袭！营地失守了，你损失了一些物资。（防御 ${defense} vs 来袭 ${power}）`, 'danger');
    const ids = Object.keys(S.inv);
    let lost = 0;
    for (const id of ids) {
      if (chance(0.15) && ITEMS[id].cat !== 'currency') { const q = Math.ceil(invCount(id) * 0.2); removeItem(id, q); lost++; }
      if (lost >= 2) break;
    }
    S.buildings.wall = Math.max(0, S.buildings.wall - 1);
    applyHarm(20);
    diaryAdd('夜袭让我损失惨重。围墙需要修。');
    if (S.stats.hp <= 0) die('你死在了夜袭里。');
  }
  function startRaidFight(cb) {
    const diff = DIFFICULTIES[S.difficulty].enemyMul;
    const base = ENEMIES.wolf;
    const mk = () => ({ name:base.name, id:base.id, ehp:Math.round(base.hp*diff), emax:Math.round(base.hp*diff), atk:Math.round(base.atk*diff), def:base.def, spd:base.spd, traits:base.traits, isBoss:0, desc:base.desc });
    const wolfCount = raidWolves();   // 夜袭强度随时间变强：第 50 天到顶（5 匹），难度差别体现在狼本身的属性上
    const enemies = []; for (let i = 0; i < wolfCount; i++) enemies.push(mk());
    const CN = ['', '一', '两', '三', '四', '五'];
    const C = {
      enemy: base, ehp: enemies[0].ehp, atk: enemies[0].atk, def: base.def, spd: base.spd,
      enemies, round:1, defending:false, usedItems:0, summonTick:0,
      accE: 0,
      log:['狼群趁夜来袭！', `${CN[wolfCount] || wolfCount}匹${base.name}的绿眼睛在夜色里盯着你。`], ranged:null, raid:true,
      dist: 0,   // 狼群扑上来就是贴身（远程先手那条在上面按需处理）
    };
    const rn = hasRanged();
    // 夜袭同样不再"入场自动射"：带弓/枪且有弹药 → 第一轮你先出手（作者 2026-09-19）
    if (rn !== null) {
      const rw2 = rangedWeapon();
      const isGun2 = !!(rw2 && rw2.ammoItem);
      const ammoOk2 = rw2 ? (rw2.ammoItem ? invCount(rw2.ammoItem) > 0 : (invCount('eagleArrow') > 0 || invCount('arrow') > 0)) : false;
      if (ammoOk2) { C.bowFirst = 1; C.log.push(isGun2 ? '你抬枪在手，抢在狼群扑近之前——这一轮你先出手。' : '你搭弓在手，抢在狼群扑近之前——这一轮你先出手。'); }
    }
    C.spdP = combatSpeed(); C.spdE = base.spd; C.spdBank = 0;
    _swingTurn = 0;   // 双持换手从主手重新开始（DPS 核查 #6：这计数器以前跨战斗留着，新战斗第一刀用哪把要看上一场）
    S.combat = C;
    S._raid = cb;
    if (onFight) onFight('start', C);
    change();
  }
  function nightRaid(isStory) {
    const w = BUILDING_CHAINS.wall[S.buildings.wall];
    if (!isStory && !chance(w.raid)) return;
    S.flags.firstRaidDone = 1;      // 打过第一次夜袭之后，才允许"随机夜袭"
    const n = raidWolves();
    if (S.flags.xiaoman) log('小满轻轻叫醒你："营外有动静……"', 'warn');
    const power = n * rnd(8, 15);   // 来袭强度跟着狼数走：1 匹约 8~15，5 匹约 40~75
    let defense = w.def + playerAtk() * 2 + playerDef();
    if (invCount('gunpowder') > 0) {
      // ⚠️ 数值平衡 P1-3：**火药囤积漏洞**。原来写的是 `defense += invCount('gunpowder') * 10;`
      //    但只 `removeItem('gunpowder', 1)` —— 囤 10 桶能白拿 +100 防却只烧 1 桶，
      //    与文案"点燃一桶火药"完全不符，而且越囤越离谱。
      //    改成每场最多烧 3 桶（+30 封顶），扣减与实际消耗一致。
      const use = Math.min(invCount('gunpowder'), 3);
      defense += use * 10;
      removeItem('gunpowder', use);
      log(`你点燃 ${use} 桶火药，爆炸声惊得野兽四散！（防御 +${use * 10}）`, 'good');
    }
    showOverlay({
      title:'夜 袭',
      requiredChoice:true,
      text:`营外传来窸窸窣窣的脚步声——${n} 匹狼趁夜围了上来！（营地防御 ${defense}）`,
      choices:[
        { label:'殊死搏斗', hint:`连战${n}匹狼 · 赢了保住仓库`, ok:()=>{
          startRaidFight({
            win: () => { log(`夜袭！你击退了狼群，守住了营地。（营地防御 ${defense} vs 来袭 ${power}）`, 'good'); diaryAdd('夜里出没的恶狼被我打退了。'); },
            lose: () => { raidLose(power, defense); },
          });
        } },
        { label:'远远观望', hint:'承受损失', ok:()=>{
          if (defense >= power) { log(`夜袭！你守在营地，野兽没占到便宜。（防御 ${defense} vs 来袭 ${power}）`, 'good'); diaryAdd('夜里来了不速之客，被我挡在门外。'); }
          else raidLose(power, defense);
          change();
        } },
      ],
    });
  }

  // ---------- 营地：睡觉 ----------
  // 睡眠结算的**纯计算**部分：sleep() 和 sleepForecast() 共用同一份公式。
  // 以前 ui.js 的 sleepRec()/napRec() 把公式又抄了一遍，面板上的数字和真实恢复会差一两点；
  // 现在只有一个来源。这个函数不修改任何状态。
  function sleepMath(mode) {
    const nap = mode === 'nap';
    const bed = ['bed1','bed2','bed3','bed4'].filter(b => S.furniture[b]).pop();
    const bf = bed ? FURNITURE.find(x => x.id === bed) : { spirit:5 };
    // 床提升体力与精神恢复；安稳睡眠仍统一8小时。
    // 没床：翻来覆去，恢复也最差（玩家反馈"草床空占位置"——以前这两个字段根本没被用上）
    const bedRest = bed ? (bf.rest || 0.7) : 0.4;
    const sleepH = nap ? 2 : (bed ? (bf.sleepH || 8) : 8);   // 安稳睡觉统一 8 小时（没床也一样），小睡 2 小时
    const houseRest = chainTier('house', S.buildings.house).rest;
    const hungerBefore = S.stats.hunger, thirstBefore = S.stats.thirst;
    // 本次睡眠里落在 0点~6点 的小时数（0点后睡得差）
    const startHour = Math.floor(S.minute / 60);
    let afterMid = 0;
    for (let i = 0; i < sleepH; i++) { const hh = (startHour + i) % 24; if (hh < 6) afterMid++; }
    const sq = sleepQuality(mode);
    const penMul = nap ? 0.35 : 1;   // 小睡只吃整觉的 35%，但仍弱于整觉
    const staGain = nap ? Math.round(25 * sq) : Math.round(maxStam() * (0.45 + houseRest * 0.12 + bedRest * 0.32) * sq);
    // 血量：基础(小睡7/整觉30) 乘时段质量，再按饿/渴/精神惩罚
    const hungPen = hungerBefore < 20 ? 3 * (100 - hungerBefore) / 10 : 1.5 * (100 - hungerBefore) / 10;
    const thirsPen = thirstBefore < 20 ? 3 * (100 - thirstBefore) / 10 : 1.5 * (100 - thirstBefore) / 10;
    const spiritPen = 2 * Math.floor((100 - S.stats.spirit) / 10);
    let hpRec = Math.round((nap ? 7 : 30) * sq) - Math.round(hungPen * penMul) - Math.round(thirsPen * penMul) - Math.round(spiritPen * penMul);
    if (nap) hpRec = Math.max(0, hpRec);   // 午觉最差只是没恢复，不会倒扣生命
    // 中毒/流血在睡眠期间照常发作（作者 2026-09-25）：
    // 一次睡眠最多发作 sleepH 次，每次照样扣 3（毒）/ 5（血）——毒性/流血层数一般只有 2~3，
    // 所以这一觉最多再掉十来点生命。纯计算，不改状态，sleep() 和面板共用同一份数字。
    const poisonTicks = Math.min(S.statuses.poison || 0, sleepH);
    const bleedTicks = Math.min(S.statuses.bleed || 0, sleepH);
    const debuffHp = poisonTicks * 3 + bleedTicks * 5 + (S.statuses.infection?(S.statuses.infection>=2?4:2)*sleepH:0);
    return { nap, sleepH, sq, staGain, hpRec, afterMid, hungerBefore, thirstBefore,
             drain: nap ? 5 : 20, spiritGain: nap ? 1 : (bf.spirit || 5), bed: !!bed,
             poisonTicks, bleedTicks, debuffHp };
  }
  // 给睡觉面板用：现在睡这一觉会怎么变（不改任何状态）。作者 2026-09-21 要求"会扣血就提示"。
  function sleepForecast(mode) {
    if (!S || S.scene !== 'camp') return null;
    if (mode === 'watch') return { watch:true };
    const m = sleepMath(mode);
    const endMin = (S.minute + m.sleepH * 60) % 1440;
    const hh = Math.floor(endMin / 60), mm = endMin % 60;
    return {
      hours:m.sleepH, sta:Math.max(0, Math.min(maxStam(), S.stats.stamina + m.staGain) - S.stats.stamina), hp:m.hpRec, sp:m.spiritGain,
      // hpAfter 里要**扣掉睡眠期间的中毒/流血**，否则面板写的"醒来还剩多少血"是骗人的
      hpNow:Math.round(S.stats.hp), hpAfter:Math.max(0, Math.min(hpMax(), S.stats.hp + m.hpRec - m.debuffHp)),
      poisonTicks:m.poisonTicks, bleedTicks:m.bleedTicks, debuffHp:m.debuffHp,
      hungerAfter:Math.max(0, Math.round(m.hungerBefore - m.drain)),
      thirstAfter:Math.max(0, Math.round(m.thirstBefore - m.drain)),
      endClock:`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`,
      // 会饿死：醒来直接见底（<=0）。会掉到危险线以下：醒来 <20（game 的严惩分支就在 20 以下）。
      // 以前只判 <=0，所以"醒来只剩 6 点饱食"这种明明会出事的情况，面板一个字都不提。
      starveRisk:m.hungerBefore - m.drain <= 0 || m.thirstBefore - m.drain <= 0,
      lowOnWake:m.hungerBefore - m.drain < 20 || m.thirstBefore - m.drain < 20,
    };
  }
  function sleep(mode) {
    if (S.scene !== 'camp') { log('只能在营地睡觉。', 'warn'); return; }
    if (mode === 'watch') {
      // 守夜
      S.stats.stamina = Math.min(maxStam(), S.stats.stamina + 50);
      S.stats.spirit = Math.max(0, S.stats.spirit - 15);
      log('你抱着武器在篝火旁守了一夜。营地安然无恙。（体力+50，精神-15）');
      addMin(8 * 60);
      return;
    }
    const M = sleepMath(mode);
    const { nap, sleepH, staGain, hpRec, afterMid } = M;
    S.tick = (S.tick || 0) + sleepH * 60;
    const staminaBefore = S.stats.stamina;
    S.stats.stamina = Math.min(maxStam(), S.stats.stamina + staGain);
    if(hpRec<0)applyHarm(-hpRec);else S.stats.hp = Math.min(hpMax(), S.stats.hp + hpRec);
    if (S.stats.hp <= 0) { log('你在睡梦中停止了呼吸……', 'danger'); die('你在睡梦中再也没能醒来。'); return; }
    S.stats.spirit = Math.min(100, S.stats.spirit + M.spiritGain);   // 精神恢复整体下调：主要靠整觉，且很有限
    // 睡觉期间消耗（与醒着一致；小睡 2 小时只扣 5 点）
    if (S.difficulty !== 'dev') { S.stats.hunger = Math.max(0, M.hungerBefore - M.drain); S.stats.thirst = Math.max(0, M.thirstBefore - M.drain); }
    log(`你${nap ? '小睡' : '睡了'} ${sleepH} 小时。（体力+${Math.max(0, S.stats.stamina - staminaBefore)}，生命${hpRec >= 0 ? '+' : ''}${hpRec}）`, hpRec < 0 ? 'warn' : 'good');
    // 中毒 / 流血**睡一觉不会自己好**：整觉按小时照常发作（作者 2026-09-25）。
    // 放在回血与总结日志之后：先报"这一觉恢复了多少"，再逐小时报毒/血扣了多少；
    // 毒/血层数最多 2~3，所以最多几行，不会刷屏。debuffTick() 返回 true = 已经死了。
    for (let i = 0; i < sleepH; i++) { if (debuffTick()) return; }
    S.statuses.bleed = 0;
    S.statuses.fear = 0;
    diary();
    // 醒来 = 入睡时间 + 8 小时（跨午夜则进入新的一天）
    const min0 = S.minute;
    S.minute = min0 + sleepH * 60;
    let dayUp = Math.floor(S.minute / 1440);
    S.minute %= 1440;
    S.day += dayUp;
    snapshot('sleep');
    // 剧情夜袭（第 7 天狼群）
    if (S.flags.wolfRaidPending) { S.flags.wolfRaidPending = 0; nightRaid(true); }
    // 随机夜袭判定：只在"首次（剧情）夜袭"之后才可能发生；老存档用天数兜底，避免永远不再触发
    if (afterMid > 0 && (S.flags.firstRaidDone || S.day > raidDay()) && chance(chainTier('wall', S.buildings.wall).raid)) nightRaid(false);
    if (dayUp > 0) {
      for (let i = 0; i < dayUp; i++) newDay();
      log(`—— 第 ${S.day} 天，${seasonInfo().name}季 ——`, 'sys');
      log('黎明。你醒了过来。', 'sys');
    } else {
      log('你睡了一觉，醒来时天还亮着。', 'sys');
    }
    if (S.laochao.arrived) log('老潮的船还停在岸边，22 点前可以交易。', 'good');
    change();
  }

  // ---------- 日记 ----------
  function diaryAdd(line) { S.diary.push({ day:S.day, line }); }
  function diary() {
    const h = Math.floor(S.minute/60);
    let entry = '';
    const w = WEATHER[S.weather].name;
    const kills = Object.keys(S.killCount).reduce((a,k)=>a+S.killCount[k],0);
    entry = `第${S.day}天，${w}。`;
    if (S.flags.xiaoman) entry += '小满在营地帮忙。';
    diaryAdd(entry);
    if (S.diary.length > 200) S.diary.splice(0, S.diary.length - 200);
  }

  // ---------- 建造 ----------
  function supplyContainer(site){return site==='cellar'?S.cellar:(site==='sea'?S.atlantis?.camp:S)?.warehouse;}
  function supplySites(site){return (Array.isArray(site)?site:site?[site]:[]).filter(x=>x==='cellar'?cellarBuilt():warehouseCapacity(x)>0);}
  function supplyRecordsAll(site) {settleStoredFood();return supplySites(site).flatMap(x=>supplyContainer(x)?.items||[]).filter(x=>x.expiry===undefined||x.expiry>nowTick());}
  function supplyRecords(id,site) {return supplyRecordsAll(site).filter(x=>x.id===id);}
  function supplyCount(id,site=null) {
    const bag=ITEMS[id]?.spoil?foodLots(id).filter(x=>x.exp>nowTick()).reduce((n,x)=>n+x.qty,0):invCount(id);
    return bag+supplyRecords(id,site).reduce((n,x)=>n+x.qty,0);
  }
  function takeSupply(id,n,site=null) {
    if(supplyCount(id,site)<n)return false;
    for(let i=0;i<n;i++){
      const lots=ITEMS[id]?.spoil?foodLots(id):null,bi=lots?lots.findIndex(x=>x.exp>nowTick()):-1;
      const bagExp=lots?(bi>=0?lots[bi].exp:Infinity):(invCount(id)>0?-Infinity:Infinity);
      const rows=supplyRecords(id,site),rec=rows.sort((a,b)=>(a.expiry??Infinity)-(b.expiry??Infinity))[0];
      if(rec && (bagExp===Infinity || (rec.expiry??Infinity)<bagExp)) {rec.qty--;const items=supplySites(site).map(x=>supplyContainer(x)?.items).find(x=>x?.includes(rec));if(!rec.qty)items.splice(items.indexOf(rec),1);}
      else if(lots){S.inv[id]--;if(!S.inv[id])delete S.inv[id];lots[bi].qty--;syncFood(id,lots.filter(x=>x.qty>0));}
      else removeItem(id,1);
    }
    return true;
  }
  function itemUseCount(id,source=false) {
    if(!source)return invCount(id);
    if(S.combat||S.death||S.ending)return 0;
    if(source==='cellar'?!cellarAccess():!warehouseAccess())return 0;
    return supplyRecords(id,source==='cellar'?'cellar':warehouseSite()).reduce((n,r)=>n+r.qty,0);
  }
  function takeUseItem(id,source=false) {
    if(itemUseCount(id,source)<1)return false;
    if(!source)return removeItem(id,1);
    const site=source==='cellar'?'cellar':warehouseSite(),rows=supplyContainer(site).items;
    const rec=supplyRecords(id,site).sort((a,b)=>(a.expiry??Infinity)-(b.expiry??Infinity))[0];
    if(!rec)return false;rec.qty--;if(!rec.qty)rows.splice(rows.indexOf(rec),1);return true;
  }
  function merchantSupplySites(list) {return list===LAOCHAO.buy&&S.scene==='camp'?materialSupplySites():[];}
  function merchantSellCount(id,list) {return supplyCount(id,merchantSupplySites(list));}
  function materialSupplySites(){return warehouseAccess()?[warehouseSite(),...(S.scene==='camp'&&cellarBuilt()?['cellar']:[])]:[];}
  function materialCount(id) {
    return supplyCount(id,materialSupplySites());
  }
  function matsOk(mats) {return Object.keys(mats).every(k=>materialCount(k)>=mats[k]);}
  function missingMats(mats) {return Object.keys(mats).filter(k=>materialCount(k)<mats[k]).map(k=>`${ITEMS[k].name} ${materialCount(k)}/${mats[k]}`);}
  function takeMats(mats) {
    if(!matsOk(mats))return false;
    for(const k in mats) {
      takeSupply(k,mats[k],materialSupplySites());
    }
    return true;
  }

  function buildChain(chainId) {
    if(chainId==='cellar'&&S.scene!=='camp'){log('地窖只能在孤岛营地建造。','warn');return;}
    if(chainId==='cellar'&&cellarBuilt()){log('地窖已经建好了。','warn');return;}
    const chain = BUILDING_CHAINS[chainId];
    const cur = S.buildings[chainId];
    const next = chain[cur + 1];
    if (!next) { log('已经升到顶了。', 'warn'); return; }
    if (next.needBp && !knowsBlueprint(next.needBp)) { log(`需要图纸：${ITEMS[next.needBp].name}。`, 'warn'); return; }
    if (!matsOk(next.mats)) { log(`材料不足：${missingMats(next.mats).join('、')}。`, 'warn'); return; }
    // 建建筑动辄几小时（草房 4 小时、远洋船 12 小时）：超过 5 小时先提醒一次（作者 2026-09-19）
    if (longActWarn(Math.round(next.time * (1 - metaBonus().craft)), `建造${next.name}`, () => buildChain(chainId))) return;
    takeMats(next.mats);
    log(`开始建造${next.name}（需 ${next.time/60} 小时）……`, 'sys');
    addMin(Math.round(next.time * (1 - metaBonus().craft)));
    S.buildings[chainId]++;
    log(`建成了：${next.name}！`, 'good');
    diaryAdd(`我建起了${next.name}。`);
    awardExperience('craft',EXP_CRAFT*2);
    if (chainId === 'watch') {
      const unlocks = next.unlock || [];
      if (unlocks.length) log(`视野扩展！现在可以前往：${unlocks.map(u => sceneOf(u).name).join('、')}。`, 'good');
    }
    if (chainId === 'dock' && next.boat === 'raft') {log('木筏下水！现在可以出海了。', 'good');log('打开地图前往近海；营地的船坞用于继续升级，小船造好后才能到盐镇。','sys');}
    if (chainId === 'dock' && next.boat === 'boat') log('小船下水！对岸的盐镇可以去了。', 'good');
    change();
  }

  // 裁缝台是否可用：真正建好的 S.furniture.tailor，或旧档一次性赠送（S.tailorGift===1）。
  // 赠送是一次性落定的顶层布尔，不进 furniture / flags，也不占家具位。
  function tailorGifted() { return !!(S.furniture && S.furniture.tailor) || S.tailorGift === 1; }
  function furnitureUsed() {   // 已占家具位（床系列算1；旗帜/路标/书架/水壶/滤雨器/织布机/药炉不占位）
    const g = { wb:0, fr:0, sm:0, bed:0, single:0 };
    for (const k in S.furniture) {
      if (!S.furniture[k]) continue; // 旧档未建造/已拆除的 false 键不占位
      // 工具台（wb1/2/3）算一组；裁缝台（tailor）是**独立**家具，新造时单独占一槽。
      // 旧档赠送（S.tailorGift=1）不写进 S.furniture，所以天然不占位。
      if (['wb1','wb2','wb3'].includes(k)) g.wb = 1;
      else if (['fr1','fr2','fr3'].includes(k)) g.fr = 1;
      else if (['sm1','sm2'].includes(k)) g.sm = 1;
      else if (['bed1','bed2','bed3','bed4'].includes(k)) g.bed = 1;
      else if (!['flag','signpost','shelf','cellar','tank','rainfilter','loom','medPot','coop','pen'].includes(k)) g.single++;
    }
    return g.wb + g.fr + g.sm + g.bed + g.single;
  }
  // 作者 2026-09-23 反馈："最大的坑是家具限制，新手一般注意不到"。
  // 把"这件家具到底占不占位"单独抽出来，给【建造页标注 / 建造前确认 / 帮助页】共用，
  // 免得三处各抄一份名单、日子久了一定跑偏（原先这个判断只藏在 furnSlotFull 的返回值里）。
  function furnTakesSlot(fid) {
    if (['wb2','wb3','fr2','fr3','sm2','bed2','bed3','bed4','rainfilter'].includes(fid)) return false;   // 升级替换不占新位
    // 旧档赠送的裁缝台（S.tailorGift=1）不占位、也不重复建造（buildFurniture 有“已经可以用了”分支兜底）
    if (fid === 'tailor' && S.tailorGift === 1) return false;
    if (['flag','signpost','shelf','cellar','tank','loom','medPot'].includes(fid)) return false;   // 在既有家具上加装的次级工位，不占家具位
    // 鸡舍/羊圈（作者 2026-09-25）：搬到**农田**去建，占的是"农田畜牧位"，不再吃住房的家具位。
    if (FARM_LIVESTOCK_IDS.includes(fid)) return false;
    return true;   // 上面都没命中 → 这件要占一格
  }
  // 农田畜牧位：农田每升一级 +1 个（苗床 1 / 田垄 2 / 水田 3）。
  // 鸡舍、羊圈只能建在这里，也只能在农田的「农场管理」里建（营地的家具列表已经不列它们了）。
  const FARM_LIVESTOCK_IDS = ['coop', 'pen'];
  function farmLiveSlots() { return (S.buildings.farm || 0) + 1; }
  function farmLiveUsed() { return FARM_LIVESTOCK_IDS.filter(id => S.furniture[id]).length; }
  function farmLiveFree() { return Math.max(0, farmLiveSlots() - farmLiveUsed()); }
  // 给界面用：畜牧位够不够、还差几级
  function farmLiveInfo(fid) {
    const used = farmLiveUsed(), cap = farmLiveSlots();
    return { used, cap, free: Math.max(0, cap - used), onlyFarm: FARM_LIVESTOCK_IDS.includes(fid), built: !!(fid && S.furniture[fid]) };
  }
  // 家具位容量 = 住所等级给的 slots + 扩建次数
  function houseSlots() { return (S.buildings.house < 0 ? 0 : (BUILDING_CHAINS.house[S.buildings.house].slots || 1)) + (S.houseExt || 0); }
  function furnSlotFull(fid) { return furnTakesSlot(fid) && furnitureUsed() >= houseSlots(); }
  // 给界面用：这一件占不占位、现在用了几格、还剩几格。
  // 建造页标注 + 建造前弹窗 + 帮助页说明，全部读这里，保证三处说法一致。
  function furnSlotInfo(fid) {
    const cap = houseSlots(), used = furnitureUsed();
    return { takes: furnTakesSlot(fid), used, cap, left: Math.max(0, cap - used) };
  }
  // 体力上限加成：取当前拥有的**最高级**那张床（作者的"做高级床，每级 +5 体力上限"）。
  // 不叠加：床是升级替换关系（bed1→bed2 时 bed1 会被删掉），所以只会有一张。
  function bedStamBonus() {
    for (const b of ['bed4','bed3','bed2','bed1']) {
      if (S.furniture[b]) { const f = FURNITURE.find(x => x.id === b); return (f && f.stamCap) || 0; }
    }
    return 0;
  }
  function trainingCount(kind) {
    const n = Number(S.training && S.training[kind]);
    return Number.isFinite(n) ? Math.max(0, Math.min(16, Math.floor(n))) : 0;
  }
  function trainingHp() { const n = trainingCount('run'); return Math.min(n, 6) * 5 + Math.max(0, n - 6) * 2; }
  function trainingAtk() { const n = trainingCount('lift'); return Math.round((Math.min(n, 6) * 0.5 + Math.max(0, n - 6) * 0.2) * 10) / 10; }
  // 永久收益只从次数推导，绝不在存档的基础攻击/生命字段上累加；恢复旧备份也不能叠加刷属性。
  function train(kind) {
    if (!['run','lift'].includes(kind) || S.identity !== 'trainer') return {ok:false,reason:'只有健身教练可以使用器材。'};
    if (S.scene !== 'camp') return {ok:false,reason:'请回营地锻炼。'};
    const fid = kind === 'run' ? 'treadmill' : 'dumbbell';
    if (!S.furniture[fid]) return {ok:false,reason:'还没建好对应的器材。'};
    if (trainingCount(kind) >= 16) return {ok:false,reason:'这项训练已完成 16 次。'};
    if (S.training && S.training.lastDay === S.day) return {ok:false,reason:'今天已经练过一种器材，明天再来。'};
    const energy=staminaCost(30);
    if (S.stats.stamina < energy) return {ok:false,reason:`锻炼需消耗 ${energy} 体力，先休息。`};
    if (longActWarn(360, kind === 'run' ? '跑步训练' : '哑铃训练', () => train(kind))) return {ok:false,reason:'等待确认'};
    const day = S.day, previous = kind === 'run' ? trainingHp() : trainingAtk();
    S.stats.stamina -= energy;
    addMin(360);
    if (S.death || S.ending) { change(); return {ok:false,reason:'训练中断'}; }
    S.training = S.training || {run:0,lift:0,lastDay:0};
    S.training[kind] = trainingCount(kind) + 1;
    S.training.lastDay = day;
    const gain = (kind === 'run' ? trainingHp() : trainingAtk()) - previous;
    if (kind === 'run') S.stats.hp = Math.min(hpMax(), S.stats.hp + gain);
    log(`${kind === 'run' ? '跑步' : '哑铃'}训练完成（第 ${S.training[kind]}/16 次）：${kind === 'run' ? '生命上限' : '攻击'} +${gain}。`, 'good');
    change(); return {ok:true,gain,count:S.training[kind]};
  }
  function canBuildFurniture(fid) {
    const f=FURNITURE.find(x=>x.id===fid),reasons=[];
    if(!S||!f)return {ok:false,reasons:['该家具不存在。'],reason:'该家具不存在。'};
    if(f.onlyDifficulty&&S.difficulty!==f.onlyDifficulty)reasons.push('仅限对应难度建造');
    if(S.furniture[fid]||(fid==='tailor'&&S.tailorGift===1))reasons.push('已经建好或已赠送');
    if(f.needPrev&&!S.furniture[f.needPrev])reasons.push('需要先建造：'+FURNITURE.find(x=>x.id===f.needPrev)?.name);
    if (f.onlyIdentity && S.identity !== f.onlyIdentity)reasons.push('需要身份：'+(IDENTITIES[f.onlyIdentity]?.name||f.onlyIdentity));
    if(f.needBp&&!knowsBlueprint(f.needBp))reasons.push('缺少图纸：'+ITEMS[f.needBp].name);
    if(f.needCraft&&expLevel('craft')<f.needCraft)reasons.push(`需要制造等级 ${f.needCraft}（当前 ${expLevel('craft')}）`);
    if(FARM_LIVESTOCK_IDS.includes(fid)){if(S.scene!=='farm')reasons.push(f.name+'只能在农田里建——去农田点「农场管理」。');if(farmLiveFree()<1)reasons.push(`农田畜牧位不够了（${farmLiveUsed()}/${farmLiveSlots()}），请升级农田。`);}
    if(furnSlotFull(fid))reasons.push(`家具位已满（${furnitureUsed()}/${houseSlots()}），先升级住所。`);
    if(!matsOk(f.mats))reasons.push('材料不足：'+missingMats(f.mats).join('、'));
    return {ok:!reasons.length,reasons,reason:reasons.join('；')};
  }
  function buildFurniture(fid) {
    if(fid==='cellar')return buildChain('cellar');
    const f = FURNITURE.find(x => x.id === fid);
    if (!f) return;
    const check=canBuildFurniture(fid);
    if(!check.ok){log(check.reason,'warn');return check;}
    const isUpgrade=['wb2','wb3','fr2','fr3','sm2','bed2','bed3','bed4','rainfilter'].includes(fid);
    // 「别把自己做没了」：耗时超过 5 小时的家具/建造先弹窗提醒（作者 2026-09-19）
    if (longActWarn(Math.round(f.time * (1 - metaBonus().craft)), `打造${f.name}`, () => buildFurniture(fid))) return;
    takeMats(f.mats);
    log(`开始打造${f.name}（需 ${f.time} 分钟）……`, 'sys');
    addMin(Math.round(f.time * (1 - metaBonus().craft)));
    // ⚠️ 滤雨器例外：它是"在水壶上加装滤网"，水壶本身要留着（-20% 口渴效果靠它，删了效果就没了）。
    if (isUpgrade) { const prev = f.needPrev; if (prev && fid !== 'rainfilter') delete S.furniture[prev]; }
    S.furniture[fid] = true;
    log(`完工了：${f.name}！`, 'good');
    diaryAdd(`我做好了${f.name}。`);
    awardExperience('craft',EXP_CRAFT*2);
    change();
  }

  // ---------- 扩建住处（住所每升一级获得 1 次扩建，家具位 +1） ----------
  function houseExtMax() { return Math.max(0, (S.buildings.house || 0) + 1); }   // 帐篷即可扩建1次，之后每升一级 +1
  function houseExtMats(n) {
    const table = [ { wood:10, branch:5 }, { wood:15, branch:8, clay:4 }, { wood:22, branch:12, stonebrick:4 }, { wood:30, branch:16, stonebrick:8, ironpart:2 } ];
    return table[(n || 1) - 1] || table[table.length - 1];
  }
  // ---------- 扩建鸡舍（3 只 → 4 只 → 5 只）----------
  // 作者 2026-09-17 要求：鸡舍能花材料扩建到 4 只，再花更多材料扩建到 5 只。
  function coopExtMats(n) {
    const table = [
      { plank:8,  nail:10, thatch:20 },                    // 第 1 次：扩到 4 只
      { plank:16, nail:20, thatch:40, ironpart:3 },        // 第 2 次：扩到 5 只（贵一截）
    ];
    return table[(n || 1) - 1] || null;
  }
  function buildCoopExt() {
    if (!S.furniture || !S.furniture.coop) return { ok:false, reason:'你还没有鸡舍。' };
    const ex = S.coopExt || 0;
    if (ex >= COOP_EXT_MAX) return { ok:false, reason:'鸡舍已经扩建到极限了（最多 5 只）。' };
    const mats = coopExtMats(ex + 1);
    if (!mats) return { ok:false, reason:'无法再次扩建。' };
    if (!matsOk(mats)) return { ok:false, reason:`材料不足：${missingMats(mats).join('、')}` };
    takeMats(mats);
    S.coopExt = ex + 1;
    addMin(60);
    log(`你扩建了鸡舍，能多养一只鸡了！（现在最多 ${coopCap()} 只）`, 'good');
    diaryAdd('我把鸡舍往旁边又搭了一间。');
    change();
    return { ok:true, cap: coopCap() };
  }
  function buildHouseExt() {
    const ex = S.houseExt || 0;
    const max = houseExtMax();
    if (ex >= max) return { ok:false, reason:'这次住处已扩建到极限，升级住所可获得更多扩建次数。' };
    const mats = houseExtMats(ex + 1);
    if (!mats) return { ok:false, reason:'无法再次扩建。' };
    if (!matsOk(mats)) return { ok:false, reason:`材料不足：${missingMats(mats).join('、')}` };
    takeMats(mats);
    S.houseExt = ex + 1;
    log(`你扩建了住处，家具位 +1！（当前扩建 ${S.houseExt}/${max}）`, 'good');
    diaryAdd('我把住处又往外扩了一格。');
    change();
    return { ok:true };
  }

  // ---------- 扩建仓库（仓库每升一级获得 1 次扩建，仓库容量 +15） ----------
  const STORE_EXT_CAP = 15;
  function storeExtCap() { return STORE_EXT_CAP; }
  function storeExtMax() { return Math.max(0, (S.buildings.storage || 0) + 1); }   // 储物箱即可扩建1次，之后每升一级 +1，四阶最多4次
  function storeExtMats(n) {
    const table = [
      { wood:10, branch:6 },
      { wood:16, branch:10, nail:4 },
      { plank:14, nail:8, ironpart:2 },
      { plank:20, nail:12, ironpart:4 },
    ];
    return table[(n || 1) - 1] || table[table.length - 1];
  }
  function buildStoreExt() {
    const ex = S.storeExt || 0;
    const max = storeExtMax();
    if (ex >= max) return { ok:false, reason:'这次仓库已扩建到极限，升级仓库可获得更多扩建次数。' };
    const mats = storeExtMats(ex + 1);
    if (!mats) return { ok:false, reason:'无法再次扩建。' };
    if (!matsOk(mats)) return { ok:false, reason:`材料不足：${missingMats(mats).join('、')}` };
    takeMats(mats);
    S.storeExt = ex + 1;
    log(`你扩建了仓库，仓库容量 +${STORE_EXT_CAP}！（当前扩建 ${S.storeExt}/${max}）`, 'good');
    diaryAdd('我把仓库又扩了一块。');
    change();
    return { ok:true };
  }

  // ---------- 制造 ----------
  const LOTUS_LIMIT = 3;   // 不死丹：单局最多炼制 3 颗
  function lotusLeft() { return Math.max(0, LOTUS_LIMIT - (S.lotusMade || 0)); }
  // 耐久物品的实际材料表：流水线 -40%，精工细作 +30%；不足一件材料的余量记账。
  // 全项目凡是要"扣 / 查 / 数"材料的地方都走这个函数，别再去读 r.in。
  // 「精工细作」的 +30% 材料只对**有耐久的成品**生效（作者 2026-09-19）：
  //    以前连烤肉、药剂、木板这种压根没有耐久的东西也一起涨价，技能点了纯亏，玩家反馈"不合理"。
  //    两个技能仅影响有耐久的产物，比例见下方 cxMatMulFor。
  function cxMatMulFor(r) {
    const outKey = Object.keys((r && r.out) || {})[0];
    const hasDur = !!(outKey && DURA[outKey] !== undefined);
    // 作者 2026-09-19 追加：**没有耐久的配方两个技能都不动**（以前流水线的 -50% 连烤肉/药剂/木板都减，
    // 等于凭空放大产能），流水线本身也从 -50% 削到 -40%。
    if (!hasDur) return 1;
    const line = nodeLv('craft','c_line') ? 0.6 : 1;
    const fine = nodeLv('craft','c_finework') ? 1.3 : 1;
    return line * fine;
  }
  // 只替换木板加工；保留历史配方 ID，避免旧入口重新使用旧比例。
  // 不改变玩家装备，也不把仓库里未装备的斧头视作已装备工具。
  function craftRecipe(r) {
    if (!r || !['r_plank','r_plank_iron','r_plank_steel'].includes(r.id)) return r;
    const axe=selectedTool('axe');
    const tool = axe?.tier>=2 ? axe.id : null;
    return {...r, id:'r_plank', name:'削木板', in:{wood:4}, out:{plank:tool ? 3 : 2},
      station:'none', time:tool ? 20 : 30, needTool:undefined, needToolTier:undefined,
      processingTool:tool};
  }
  function craftIn(r, n=1) {
    r=craftRecipe(r);
    const mul=cxMatMulFor(r), out={};
    for(const k in (r && r.in) || {}) {
      const key=`${r.id}:${mul}:${k}`, credit=(S.craftRemainders || {})[key] || 0;
      out[k]=Math.max(0,Math.ceil((Math.round(r.in[k]*mul*10)*n-credit)/10));
    }
    return out;
  }
  function commitCraftMaterials(r,n=1) {
    const mul=cxMatMulFor(r); if(mul===1) return;
    const paid=craftIn(r,n); S.craftRemainders=S.craftRemainders || {};
    for(const k in paid) { const key=`${r.id}:${mul}:${k}`; S.craftRemainders[key]=((S.craftRemainders[key] || 0)+paid[k]*10-Math.round(r.in[k]*mul*10)*n); }
  }
  function canCraft(r) {
    r=craftRecipe(r);
    const cin0 = craftIn(r);
    if (r.needBp && !knowsBlueprint(r.needBp)) return { ok:false, reason:`需要图纸：${ITEMS[r.needBp].name}` };
    if (r.needItem && materialCount(r.needItem)<1) return { ok:false, reason:`需要${ITEMS[r.needItem].name}` };
    // 不死丹：单局最多炼 3 颗（防止堆药把死亡机制抹平）
    if (r.out && r.out.lotusPill && lotusLeft() <= 0) return { ok:false, reason:`不死丹一局最多炼制 ${LOTUS_LIMIT} 颗（已炼 ${LOTUS_LIMIT}/${LOTUS_LIMIT}）` };
    if (r.permLimit) {
      const key = Object.keys(r.out)[0];
      if (((S.permMade && S.permMade[key]) || 0) >= r.permLimit) return { ok:false, reason:`${r.name}本局最多炼制 ${r.permLimit} 颗。` };
    }
    if (r.needTool && !hasTool(r.needTool, r.needToolTier || 1)) return { ok:false, reason:r.needTool==='axe' ? `需要装备${r.needToolTier>=3?'钢斧':'铁斧或更高级斧头'}` : `需要${r.needTool==='knife'?ITEMS.knifeStone.name:'工具'}` };
    if (r.station !== 'none') {
      if (r.station === 'pearlWork' || r.station === 'sourceForge' || r.station === 'repair') {
        const af = ATLANTIS_FURNITURE.find(x => x.station === r.station);
        const nm = af ? af.name : '亚特兰蒂斯工位';
        if (!(S.atlantis && S.atlantis.camp && S.atlantis.camp.furniture && S.atlantis.camp.furniture[r.station])) return { ok:false, reason:`需要先在礁石栖息地建造「${nm}」` };
      } else {
      const f = FURNITURE.find(x => x.station === r.station);
      const stationName = f ? f.name : ({ fire:'篝火', pot:'灶台' }[r.station] || '对应建筑');
      if (!f && r.station !== 'pot' && r.station !== 'fire') return { ok:false, reason:`需要建造${stationName}` };
      const ok = r.station === 'work1' ? (S.furniture.wb1||S.furniture.wb2||S.furniture.wb3) :
        r.station === 'work2' ? (S.furniture.wb2||S.furniture.wb3) :
        r.station === 'work3' ? S.furniture.wb3 :
        r.station === 'tailor' ? tailorGifted() :
        r.station === 'furn1' ? (S.furniture.fr1||S.furniture.fr2||S.furniture.fr3) :
        r.station === 'furn2' ? (S.furniture.fr2||S.furniture.fr3) :
        r.station === 'furn3' ? S.furniture.fr3 :
        r.station === 'smoke1' ? (S.furniture.sm1||S.furniture.sm2) :
        r.station === 'smoke2' ? S.furniture.sm2 :
        r.station === 'fire' ? S.buildings.fire >= 0 :
        S.furniture[{'spin':'spin','loom':'loom','mortar':'mortar','pot':'stove','medPot':'medPot','tannery':'tannery','rack':'rack','stove':'stove'}[r.station]];
      if (!ok) return { ok:false, reason:`需要建造${stationName}` };
      }
    }
    // 晾肉架：一副架子一次只晾一批。晾晒期间不能晾别的（作者明确要求），要先去把上一批取下来
    if (r.hang) {
      const d = dryOf(r.station);
      if (d) return { ok:false, reason: nowTick() >= d.readyAt
        ? '架子上那批已经晾透了，先去把它取下来。'
        : `架子上正晾着东西，还要 ${fmtLeft(d.readyAt - nowTick())}——晾晒期间晾不了别的。` };
    }
    for (const k in cin0) if (materialCount(k)<cin0[k]) return { ok:false, reason:`材料不足：${ITEMS[k].name} ${materialCount(k)}/${cin0[k]}` };
    return { ok:true };
  }
  // ---------- 晾晒（晾肉架）：挂 30 分钟，晾满 20 小时才能取 ----------
  // 晾晒期间这副架子被占住，不能晾别的东西、也不能批量。
  // 用 S.tick（addMin 累加的绝对时间计数器）记"什么时候能取"。
  function nowTick() { return S.tick || (S.day || 1) * 1440 + (S.minute || 0); }
  function dryOf(station) { S.drying = S.drying || {}; return S.drying[station] || null; }
  function dryLeftMin(station) {
    const d = dryOf(station);
    if (!d) return 0;
    return Math.max(0, (d.readyAt || 0) - nowTick());
  }
  function dryCollect(station) {
    const d = dryOf(station);
    if (!d) return { ok:false, reason:'架子上没有晾着东西。' };
    if (nowTick() < d.readyAt) return { ok:false, reason:`还没晾透，还要 ${fmtLeft(d.readyAt - nowTick())}。` };
    if (!fitsInBag(d.out)) return {ok:false, reason:'背包装不下，成品仍留在架子上。'};
    delete S.drying[station];
    for (const k in d.out) addItem(k, d.out[k]);
    log(`晾晒完成：${Object.keys(d.out).map(k => `${ITEMS[k].name}×${d.out[k]}`).join('、')}。`, 'good');
    change();
    return { ok:true };
  }
  // 剩余时间说人话（快到用分钟，久了用小时）
  function fmtLeft(min) {
    if (min <= 0) return '好了';
    if (min < 60) return min + ' 分钟';
    const h = Math.floor(min / 60), m = min % 60;
    return h + ' 小时' + (m ? m + ' 分' : '');
  }
  // 背包能装下这些产出吗？（按 capUsed 同一套算法，逐件模拟）
  // ⚠️ 1) 关键道具（alwaysFit，如石板/遗物/龙骨）不占容量，直接跳过
  //    2) 还要管"往已有堆叠里塞会不会撑破那一格"：已有 19 个再加 3 个 = 溢出 2 个，多占 1 格
  //    3) removeMap 是"这次操作会顺带扣掉的东西"（比如买东西要先付钱）：不先减掉会把钱那一格白算
  function fitsInBag(outMap, removeMap) {
    if(Object.keys(outMap).every(id=>{const it=ITEMS[id];return it&&(it.cat==='bp'||it.cat==='currency'||it.alwaysFit);}))return true;
    let slots = capUsed();
    const cap = capacity();
    const preview = {};
    for (const id in S.inv) preview[id] = S.inv[id];
    if (removeMap) for (const id in removeMap) {
      const it = ITEMS[id]; if (!it || it.cat === 'bp' || it.cat === 'currency' || it.alwaysFit) continue;
      const per = stackSize(id);
      const before = preview[id] || 0;
      const after = Math.max(0, before - (removeMap[id] || 0));
      preview[id] = after;
      slots += Math.ceil(after / per) - Math.ceil(before / per);
    }
    for (const id in outMap) {
      const it = ITEMS[id];
      if (!it || it.cat === 'bp' || it.cat === 'currency' || it.alwaysFit) continue;
      const per = stackSize(id);
      const before = preview[id] || 0;
      const after = before + (outMap[id] || 0);
      preview[id] = after;
      slots += Math.ceil(after / per) - Math.ceil(before / per);
    }
    return slots <= cap;
  }
  function craftMinutes(r) {
    r=craftRecipe(r);
    let t = Math.round(r.time * (1 - metaBonus().craft));
    if (r.hang) return t;
    if (S.identity === 'smith') t = Math.round(t * 0.8);
    return Math.max(3, Math.round(t * cxTimeMul()));
  }
  function craft(r) {
    r=craftRecipe(r);
    const chk = canCraft(r);
    if (!chk.ok) { log(chk.reason, 'warn'); return; }
    if (r.hang) {
      // 晾晒：材料先收走、挂上去只花 r.time 分钟，成品等 hang 分钟后来取
      const cinH = craftIn(r);
      takeMats(cinH);
      const t = Math.round(r.time * (1 - metaBonus().craft));
      addMin(t);
      // 一批的量：按配方 r.out 的倍数（晾肉干一批晾出 hangQty 份）
      const q = Math.max(1, r.hangQty || 1);
      const out = {};
      for (const k in r.out) out[k] = r.out[k] * q;
      S.drying = S.drying || {};
      S.drying[r.station] = { readyAt: nowTick() + r.hang, out };
      const names = Object.keys(out).map(k => `${ITEMS[k].name}×${out[k]}`).join('、');
      log(`你把肉挂上了晾肉架——${fmtLeft(r.hang)}后来取（晾好能得 ${names}；这期间架子占着，晾不了别的）。`, 'sys');
      change();
      return;
    }
    // ⚠️ 背包装不下就别开工：否则材料白扣、时间白花，产物被 addItem 拒掉 → 东西凭空消失
    //    （要把即将扣掉的材料算进去：材料腾出来的格子当然能放产物）
    if (!fitsInBag(r.out, craftIn(r))) { log('背包塞不下了——先腾出空位再做，免得材料白费。', 'warn'); notifyBagFull(); return; }
    if (longActWarn(craftMinutes(r), `制作${r.name}`, () => craft(r))) return {pending:true};
    const cin = craftIn(r);                       // 材料：技能树「流水线 / 精工细作」会改这个
    takeMats(cin);
    if (r.out && r.out.lotusPill) S.lotusMade = (S.lotusMade || 0) + 1;
    if (r.permLimit) { const key = Object.keys(r.out)[0]; S.permMade = S.permMade || {}; S.permMade[key] = (S.permMade[key] || 0) + 1; }
    const out = ITEMS[r.out ? Object.keys(r.out)[0] : ''];
    log(`你开始制作：${r.name}（${r.time} 分钟）……`, 'sys');
    const t = craftMinutes(r);
    const refundKeys = Object.keys(cin).filter(k=>cin[k]>0);
    const refund = chance(cxRefundChance()) && refundKeys.length ? refundKeys[Math.floor(Math.random()*refundKeys.length)] : null;
    addMin(t);
    // 跨日的家具产出可能占满背包：重新校验全部产物，失败按实际扣料返还，不能部分发货。
    if (!fitsInBag(r.out)) {
      for(const k in cin) gainItem(k,cin[k]);
      if(r.out.lotusPill) S.lotusMade--;
      if(r.permLimit) { const key = Object.keys(r.out)[0]; S.permMade[key]--; }
      log('制作期间背包装满了，材料已退回背包或待收；本次耗时已发生。','warn');change();return;
    }
    commitCraftMaterials(r);
    const made = {}; let bonus = false;
    for(const k in r.out) { addItem(k,r.out[k]);made[k]=r.out[k]; }
    if(!r.permLimit && chance(cxExtraChance())) {
      const k=Object.keys(r.out)[0];
      if(fitsInBag({[k]:1}) && addItem(k,1,true)) {made[k]++;bonus=true;log('【巧手】手底下多出来一件。','good');}
    }
    for(const k in made) if(DURA[k] !== undefined && cxDurMul() !== 1) {
      const nd=Math.max(1,Math.round(DURA[k]*cxDurMul())), arr=S.toolDurs && S.toolDurs[k];
      if(arr) for(let i=0;i<made[k];i++) { arr[arr.length-1-i]=nd; S.toolMaxDurs[k][arr.length-1-i]=nd; }
      durSync(k);
      log(`【${nodeLv('craft','c_line') ? '流水线' : '精工细作'}】这次成品的耐久上限是 ${nd}。`,'sys');
    }
    if(refund) {gainItem(refund,1);log(`【精算】退回 ${ITEMS[refund].name}×1。`,'good');}
    awardExperience('craft',EXP_CRAFT);
    S.craftCount = (S.craftCount || 0) + 1;
    log(`完成：${Object.keys(r.out).map(k=>`${ITEMS[k].name}×${r.out[k]}`).join('、')}${bonus ? '（额外多做了 1 件！）' : ''}。`, 'good');
    if (S.tut === 1 && Object.keys(S.inv).some(id => ITEMS[id] && ITEMS[id].tool)) S.tut = 2;   // 已做出首件工具→去装备
    change();
  }
  function craftMax(r) {
    r=craftRecipe(r);
    let m = 999;
    let lo=0,hi=m;
    while(lo<hi) { const n=Math.ceil((lo+hi)/2), costs=craftIn(r,n); if(Object.keys(costs).every(k=>materialCount(k)>=costs[k])) lo=n; else hi=n-1; }
    m=lo;
    if (r.out && r.out.lotusPill) m = Math.min(m, lotusLeft());
    if (r.permLimit) m = Math.min(m, r.permLimit - ((S.permMade && S.permMade[Object.keys(r.out)[0]]) || 0));
    return Math.max(0, m);
  }
  function craftBatch(r, n, onReady) {
    if (!r) return { ok:false, reason:'没有这个配方' };
    r=craftRecipe(r);
    if (!Number.isSafeInteger(n) || n < 1 || n > 999) return {ok:false, reason:'制作数量需为 1 到 999 的整数'};
    const check = canCraft(r);
    if (!check.ok) return check;
    if (r.uniqueItem && n !== 1) return {ok:false, reason:'限定物每次只能制作一件'};
    if (r.permLimit) return {ok:false, reason:'永久属性丹药请逐颗炼制。'};
    // ⚠️ 晾晒类配方（晾肉架）**不能走下面的批量流程**：一副架子一次只挂一批，
    //    而且下面那段是"扣材料 → 立刻 addItem 产出成品" —— 以前长按晾肉干就能
    //    **当场拿到肉干**，20 小时的晾晒被整个绕过去（玩家反馈"晾肉架不能一次晾很多块吧"）。
    //    这里直接转成单批：走 craft() 的晾晒分支（扣材料 → 挂上去 → 等 hang 分钟来取）。
    if (r.hang) {
      if(typeof onReady==='function'){onReady(()=>craftBatch(r,1),1);return {pending:true};}
      const d0 = dryOf(r.station);
      if (d0) return { ok:false, reason:'晾肉架上还晾着东西，先把它取下来。' };
      craft(r);
      return { ok:true, n:1, hanging:true, hung: !!dryOf(r.station) };
    }
    if (n < 1) return { ok:false, reason:'至少要制作 1 个' };
    if (r.out && r.out.lotusPill && n > lotusLeft()) return { ok:false, reason:`不死丹一局最多炼制 ${LOTUS_LIMIT} 颗（还能炼 ${lotusLeft()} 颗）` };
    let cinB = craftIn(r,n);
    for (const k in cinB) if (materialCount(k)<cinB[k]) return { ok:false, reason:'材料不足' };
    // 批量制作最容易撑爆背包：先按"能装下几个"自动降到 n，一个都装不下就干脆别开工
    {
      let fit = 0;
      for (let i = 1; i <= n; i++) {
        const outMap = {}, inMap = {};
        for (const k in r.out) outMap[k] = r.out[k] * i;
        Object.assign(inMap,craftIn(r,i));      // 材料会腾出格子，算进去
        // 消耗整堆材料会释放格子；1件放不下不代表2件也放不下。
        if (fitsInBag(outMap, inMap)) fit = i;
      }
      if (fit === 0) { log('背包塞不下，先腾出空位再做。', 'warn'); notifyBagFull(); return { ok:false, reason:'背包塞不下' }; }
      if (fit < n) log(`背包只放得下 ${fit} 个，这次就先做 ${fit} 个。`, 'warn');
      n = fit;
    }
    if (longActWarn(craftMinutes(r) * n, `连续制作 ${n} 件「${r.name}」`, () => craftBatch(r,n,onReady))) return {ok:false, pending:true, reason:''};
    // 界面先确认长耗时，再播放动画；执行时重新验料和容量。
    if(typeof onReady==='function'){onReady(()=>{const previous=craftBatchConfirmed;craftBatchConfirmed=true;try{return craftBatch(r,n);}finally{craftBatchConfirmed=previous;}},n);return {pending:true};}
    cinB=craftIn(r,n);
    takeMats(cinB);
    if (r.out && r.out.lotusPill) S.lotusMade = (S.lotusMade || 0) + n;
    // ⚠️ 批量制作以前是"另一条腿"：① 还在用旧版"每级 -8% 耗时"（技能改版后那套已经没了）
    //    ② **完全没应用「精工细作 +30% 耐久 / 流水线 -20% 耐久」**，也没算巧手/精算 ——
    //    玩家反馈"做装备点上（长按批量），做完取消，木板精不精加工都没耐久"就是这么来的。
    //    现在和单个制作走同一套加成。
    const t = craftMinutes(r);
    addMin(t * n);
    // 巧手：每做一件都有机会多产 1 件；精算：每做一件都有机会退回 1 份材料
    let bonusN = 0, backN = 0;
    const refunds = [], cinKeys = Object.keys(cinB).filter(k=>cinB[k]>0);
    for(let i=0;i<n;i++) {
      if(chance(cxExtraChance())) bonusN++;
      if(cinKeys.length && chance(cxRefundChance())) refunds.push(cinKeys[Math.floor(Math.random()*cinKeys.length)]);
    }
    const outKeys=Object.keys(r.out), baseOut={};
    for(const k of outKeys) baseOut[k]=r.out[k]*n;
    if(!fitsInBag(baseOut)) {
      for(const k in cinB) gainItem(k,cinB[k]);
      if(r.out.lotusPill) S.lotusMade-=n;
      log('制作期间背包装满了，材料已退回背包或待收；本次耗时已发生。','warn');change();
      return {ok:false,reason:'背包已满，材料已退回背包或待收'};
    }
    commitCraftMaterials(r,n);
    for(const k of outKeys) addItem(k,baseOut[k]);
    let extraMade=0;
    for(let i=0;i<bonusN;i++) {
      const k=outKeys[0];if(!fitsInBag({[k]:1}) || !addItem(k,1,true)) break;extraMade++;
    }
    bonusN=extraMade;
    // 成品耐久：精工细作 +30% / 流水线 -20%（批量也一样生效）
    // ⚠️ 必须"这批里真有带耐久的成品"才动手：否则点了精工细作去烤肉干，会白写一行
    //    "这批成品的初始耐久按 130% 算"（东西压根没耐久，玩家看得莫名其妙）。
    if (outKeys.some(k => DURA[k] !== undefined) && cxDurMul() !== 1) {
      for (const k of outKeys) {
        if (DURA[k] === undefined) continue;
        const nd = Math.max(1, Math.round(DURA[k] * cxDurMul()));
        const arr = S.toolDurs && S.toolDurs[k];
        const made = r.out[k] * n + (k === outKeys[0] ? bonusN : 0);
        for (let i = 0; i < made; i++) if (arr && arr.length) { arr[arr.length - 1 - i] = nd; S.toolMaxDurs[k][arr.length - 1 - i] = nd; }
        durSync(k);
      }
      log(`【${nodeLv('craft','c_line') ? '流水线' : '精工细作'}】这批成品的耐久上限按 ${Math.round(cxDurMul() * 100)}% 算。`, 'sys');
    }
    const refunded={};
    for(const k of refunds) {
      if((refunded[k] || 0)>=cinB[k]) continue;
      gainItem(k,1); refunded[k]=(refunded[k] || 0)+1; backN++;
    }
    awardExperience('craft',EXP_CRAFT,n);
    S.craftCount = (S.craftCount || 0) + n;
    log(`连续制作：${r.name}×${n}${r.id==='r_plank' ? `批，木板×${baseOut.plank}` : ''}（耗时 ${t * n} 分钟）${bonusN ? `，其中【巧手】多做了 ${bonusN} 件` : ''}${backN ? `，【精算】退回 ${backN} 份材料` : ''}。`, 'good');
    change();
    return { ok:true, n };
  }

  // ---------- 礁石栖息地（亚特兰蒂斯营地，独立家具位） ----------
  function atlantisCamp() {
    if (!S.atlantis) S.atlantis = { unlocked:0, visited:0, camp:{ furniture:{}, buildings:{} }, quest:0 };
    if (!S.atlantis.camp) S.atlantis.camp = { furniture:{}, buildings:{} };
    if (!S.atlantis.camp.furniture) S.atlantis.camp.furniture = {};
    if(S.atlantis.camp.furniture.seaStorage2)delete S.atlantis.camp.furniture.seaStorage1;
    return S.atlantis.camp;
  }
  function atlantisFurnitureUsed() { return Object.keys(atlantisCamp().furniture).length; }
  function buildAtlantisFurniture(fid) {
    const f = ATLANTIS_FURNITURE.find(x => x.id === fid);
    if (!f) return { ok:false, reason:'没有这件家具。' };
    if(S.scene!=='atlantis'||S.zone!=='habitat'||S.combat||S.death||S.ending)return {ok:false,reason:'只能在礁石栖息地建造。'};
    const camp = atlantisCamp();
    if (camp.furniture[fid]) return { ok:false, reason:'已经建好了。' };
    if(f.upgradeFrom&&!camp.furniture[f.upgradeFrom])return {ok:false,reason:'请先建造海底储物箱。'};
    if(fid==='seaStorage1'&&camp.furniture.seaStorage2)return {ok:false,reason:'已有加固海底储物箱。'};
    const MAX = 6;
    if (!f.upgradeFrom && Object.keys(camp.furniture).length >= MAX) return { ok:false, reason:`礁石栖息地家具位已满（${MAX}）。` };
    if (!matsOk(f.mats)) return { ok:false, reason:`材料不足：${missingMats(f.mats).join('、')}` };
    takeMats(f.mats);
    log(`开始打造${f.name}（需 ${f.time} 分钟）……`, 'sys');
    addMin(Math.round(f.time * (1 - metaBonus().craft)));
    if(S.death||S.ending||S.combat)return {ok:false,reason:'建造未完成。'};
    if(f.upgradeFrom)delete camp.furniture[f.upgradeFrom];
    camp.furniture[fid] = true;
    log(`礁石栖息地建成了：${f.name}！`, 'good');
    diaryAdd(`我在礁石栖息地做好了${f.name}。`);
    awardExperience('craft',EXP_CRAFT*2);
    change();
    return { ok:true };
  }
  const DIVE_REPAIR_MATS = {
    diveSuit:{deepCoral:4,resin:3},
    diveSuit2:{deepCoral:4,sourceBar:1,tideSteel:1},
    diveMask:{deepCoral:2,sourceOre:2},
  };
  function repairDiveCost(id) { return DIVE_REPAIR_MATS[id] ? {...DIVE_REPAIR_MATS[id]} : null; }
  function repairDive(id) {
    const camp = atlantisCamp();
    if (!camp.furniture.repairBench) return { ok:false, reason:'需要先在礁石栖息地建造修补台。' };
    const mats=repairDiveCost(id);
    if (!mats) return {ok:false,reason:'请选择要修补的潜水装备。'};
    if (!hasItem(id)) return {ok:false,reason:`背包里没有${ITEMS[id].name}。`};
    const a=durList(id);
    let idx=0;
    for(let i=1;i<a.length;i++) if(a[i]<a[idx]) idx=i;
    if(a[idx]>=durMaxOf(id,idx)) return {ok:false,reason:`${ITEMS[id].name}的耐久已经是满的。`};
    if (!matsOk(mats)) return {ok:false,reason:`材料不足：${missingMats(mats).join('、')}`};
    takeMats(mats);
    a[idx]=durMaxOf(id,idx); durSync(id);
    log(`${ITEMS[id].name}耐久已恢复。`, 'good');
    change();
    return { ok:true,id,index:idx };
  }

  // ---------- 种植 ----------
  const FARM_EXTRA_MAX = 2;   // 锄头最多能多开垦 2 块田
  function farmExt() { return S.farmExt || 0; }
  function farmPlots() { return (BUILDING_CHAINS.farm[S.buildings.farm].plots || 1) + farmExt(); }
  function plant(seedId) {
    const crop = CROPS[seedId];
    if (!crop) { log('这个不能种。', 'warn'); return { ok:false, reason:'这个不能种。' }; }
    if (S.crops.length >= farmPlots()) { log('没有空闲的田了——用锄头可以在耕地里开垦新田。', 'warn'); return { ok:false, reason:'没有空闲的田。' }; }
    if (!hasItem(seedId)) { log('没有种子。', 'warn'); return { ok:false, reason:'没有种子。' }; }
    removeItem(seedId, 1);
    S.crops.push({ seed:seedId, remain:crop.days });
    log(`你种下了${ITEMS[seedId].name}，预计 ${crop.days} 天后收获。`, 'good');
    change();
    return { ok:true };
  }
  function harvest(idx) {
    const ready = S.crops.map((c, i) => ({ c, i })).filter(x => x.c.remain <= 0);
    if (!ready.length) { log('作物还没成熟。', 'warn'); return { ok:false, reason:'作物还没成熟。' }; }
    // 点哪块收哪块（以前不管点哪个都收第一块成熟的）
    const pick = (idx !== undefined && idx !== null && ready.some(x => x.i === +idx)) ? ready.find(x => x.i === +idx).c : ready[0].c;
    S.crops = S.crops.filter(x => x !== pick);
    const crop = CROPS[pick.seed];
    // ⛔ 这里原来写的是 `Math.round((rnd(min,max) + 2) * 难度 * 施肥)` —— 那个固定 "+2" 等于每收一次白送两份，
    //    三块地一轮就吃不完。作者 2026-09-24 定的口径就是**直接把 +2 删掉**（不要另加系数常量）：
    //    删掉之后萝卜 4~5 → 2~3、小麦 5~6 → 3~4，收成自然落到合理区间。
    const q = Math.max(1, Math.round(rnd(crop.min, crop.max) * (pick.seed==='seedHerb'?1:DIFFICULTIES[S.difficulty].resMul) * (pick.fert ? 1.5 : 1)));
    gainItem(crop.out, q);
    log(`收获：${ITEMS[crop.out].name}×${q}。${pick.fert ? '（施过肥，收成格外好）' : ''}`, 'good');
    change();
    return { ok:true, qty:q, item:crop.out };
  }
  // 锄头的两个正式用途：开垦新田、松土催熟
  function canHoe() { return hasItem('hoe'); }
  function tillPlot() {
    if (farmExt() >= FARM_EXTRA_MAX) return { ok:false, reason:`这块地已经全开出来了（最多再开 ${FARM_EXTRA_MAX} 块）。` };
    if (!canHoe()) return { ok:false, reason:'需要一把锄头（手工：木材×2 + 石头×1）。' };
    if (!matsOk({ wood:2 })) return { ok:false, reason:'需要木材×2。' };
    takeMats({wood:2});
    S.farmExt = farmExt() + 1;
    drainTool('hoe');
    addMin(60);
    log(`你挥锄开出一块新田（现在共 ${farmPlots()} 块）。`, 'good');
    change();
    return { ok:true, plots:farmPlots() };
  }
  function loosenPlot(idx) {
    const c = S.crops[idx];
    if (!c) return { ok:false, reason:'这块地没有作物。' };
    if (c.remain <= 0) return { ok:false, reason:'已经成熟了，不用松土。' };
    if (c.tilled) return { ok:false, reason:'这块地已经松过土了。' };
    if (!canHoe()) return { ok:false, reason:'需要一把锄头（手工：木材×2 + 石头×1）。' };
    c.tilled = 1;
    c.remain = Math.max(0, c.remain - 1);
    drainTool('hoe');
    addMin(15);
    log(c.remain <= 0 ? '你给这块地松了土——作物已经熟透了！' : `你给这块地松了土，还能提前 ${c.remain} 天成熟。`, 'good');
    change();
    return { ok:true, remain:c.remain };
  }
  function fertilize(idx) {
    const c = S.crops[idx];
    if (!c) return { ok:false, reason:'这块地没有作物。' };
    if (c.fert) return { ok:false, reason:'这块地已经施过肥了。' };
    if (!hasItem('rot', 2)) return { ok:false, reason:'需要腐烂物×2。' };
    removeItem('rot', 2);
    c.fert = 1;
    addMin(20);
    log('你把腐烂物翻进土里——这块地的收成会好一些。', 'good');
    change();
    return { ok:true };
  }

  // ---------- 交易 ----------
  function seasonPriceMul() { const s = seasonInfo(); return s.name === '冬' ? 1.2 : (s.name === '秋' ? 1.0 : 0.9); }
  function fameDisc() { return S.fame >= 2 ? 0.9 : (S.fame >= 1 ? 0.95 : 1); }
  // 收购价：商人一律按行情的**七折**收（作者 2026-09-22 定案，原八折）。
  // 固定折价，不会因为"卖得多"继续往下压。
  // ⚠️ 上一轮改这个撞过 audit 的「跨天也不会继续跌（恒定八折）」失败 —— 那条断言本身是
  //    "卖 1 件不掉价"的行为断言（前后取同一个 priceOf 比较），不是数值断言；它报错是因为
  //    当时 UI 文案里写死了"八折"。所以改倍率时**必须同步改 UI 文案**，否则文案与行为对不上。
  const SELL_SUP = 0.7;
  function priceOf(base, isBuyFromPlayer, id, currency) {
    let p = base;
    if (!isBuyFromPlayer) p = Math.round(base * seasonPriceMul() * fameDisc());
    else {
      p = Math.round(base * seasonPriceMul() * SELL_SUP);
      // 冬季溢价：兽皮之类冬天行情好（数据里给物品标 winter 倍率，例：兽皮 ×1.5）
      if (ITEMS[id] && ITEMS[id].winter && seasonInfo().name === '冬') p = Math.round(p * ITEMS[id].winter);
    }
    return Math.round(p * priceJitter(id) / 100);
  }
  // 价格浮动改成"按天+物品"固定：同一天同一件货，看多少就是多少
  // （以前每次取价都重新随机，导致"批量框写着最多买 6 个、点确定却因涨价买不起"）
  function priceJitter(id) {
    let h = 0;
    const s = String(id || '') + '#' + (S.day || 1);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003;
    return 90 + (h % 21);   // 90 ~ 110
  }
  function sellToMerchant(id, qty, list, isBlack, isTown) {
    // 剧情遗物可在旧档中补领；禁止出售，避免回祭坛反复领取刷贝壳币。
    if (id === 'relic') { log('遗物是祭坛仪式的关键物品，不能出售。', 'warn'); return; }
    const entry = list.find(e => e.id === id);
    if (!entry) return;
    if (merchantSellCount(id,list)<qty) { log('货物不够。', 'warn'); return; }
    const price = priceOf(entry.base, true, id);
    // ⚠️ 背包满了就别卖：否则货扣了、贝壳币却塞不进去 → 货凭空消失
    const gain = price * qty;
    if (!fitsInBag({ beibi: gain })) { log('背包塞不下货款——先腾出一格再卖。', 'warn'); notifyBagFull(); return; }
    if(!takeSupply(id,qty,merchantSupplySites(list)))return;
    S.sold[id] = (S.sold[id] || 0) + qty;   // 仅留存销量统计，当前不参与定价
    addItem('beibi', gain);
    log(`卖出 ${ITEMS[id].name}×${qty}，获得贝壳币×${gain}。`, 'good');
    if (id === 'anctDevice') {
      S.atlantis = S.atlantis || {}; S.atlantis.whispers = (S.atlantis.whispers || 0) + qty;
      const W = ['「这不是装饰……这是钥匙。城里还有同一套的锁。」','「刻文说，灯塔烧的不是油，是记忆。」','「有人已经下去过——而且没打算回来。」','「……你是来归还的，还是来搬空的？」'];
      log('情报贩子摩挲着装置，压低声音翻译：' + W[Math.min(S.atlantis.whispers - 1, W.length - 1)], 'blue');
    }
    change();
  }
  function buyFromMerchant(id, qty, list, isBlack) {
    const entry = list.find(e => e.id === id);
    if (!entry) return;
    // 图纸是"学会"而不是囤货：每种图纸全局只卖一次，且不允许一次买多份
    const isBp = entry.kind === 'bp' || (ITEMS[id] && ITEMS[id].cat === 'bp');
    if (isBp && hasItem(id)) { log(`${ITEMS[id].name}只需要一份，你已经有了。`, 'warn'); return; }
    if (isBp) qty = 1;
    const currency = entry.currency || 'beibi';
    const price = priceOf(entry.base, false, id);
    const curName = currency === 'coin' ? '金币' : '贝壳币';
    let n = qty, cost = price * n;
    if (!hasItem(currency, cost)) {
      // 兜底：买不起这么多就自动降到买得起的最大数量，避免"点了没反应"
      n = Math.floor(invCount(currency) / Math.max(1, price));
      if (n <= 0) { log(`${curName}不够（每个 ${price}，需要 ${price * qty}）。`, 'warn'); return; }
      cost = price * n;
      log(`${curName}只够买 ${n} 个，已按 ${n} 个结算。`, 'warn');
    }
    // ⚠️ 背包满了就别扣钱：**在扣钱之前**先确认货装得下（把即将扣掉的货币一起算进去），
    //    免得钱花了、东西却没到手。（不要"先扣再退"——removeItem 会触发待收补发，数字会漂）
    if (!fitsInBag({ [id]: n }, { [currency]: cost })) {
      log(`背包塞不下 ${ITEMS[id].name}——先腾出空位再买。`, 'warn'); notifyBagFull(); return;
    }
    removeItem(currency, cost);
    gainItem(id, n);
    log(`购入 ${ITEMS[id].name}×${n}，花费${curName}×${cost}。`, 'good');
    if(id==='seachart')log('海图指向更远的海面；先确认船坞等级，再到地图选择航线。海图不会自动升级船只。','sys');
    change();
  }

  // ---------- 神秘鱼人：只以物换物，不收贝壳 ----------
  // 两张源质装备图纸、神物「亚特兰蒂斯之种」与一次仓库扩容，各只能换一次；
  // 交换状态只新增字段 S.atlantis.fishmanTraded（不删改既有字段）。
  // ⚠️ 之种不进随机奖池；原「神秘商人」事件已删除，2026-10-04 新增商城购买。
  //    那条已按要求整个删除（见 data.js RANDOM_EVENTS 的说明），所以这里必须给出口，
  //    否则红成就「传世遗物」会变成不可达。
  //    图纸/神物的金锭门槛为 4/5/8，另需深海材料；旧存档已交换记录照旧有效。
  const FISHMAN_DEALS = [
    { id:'spear', item:'bpSourceSpear', name:'源质长枪图纸', need:{ goldIngot:4, tideSteel:4 } },
    { id:'armor', item:'bpSourceArmor', name:'源质重甲图纸', need:{ goldIngot:5, shipPlate:3 } },
    // relic:1 表示换的是**神物**（发到 S.relics，不是背包物品）—— 亚特兰蒂斯之种的游戏内交换来源（商城也可购买）
    { id:'seed',  relic:'atlantisSeed', name:'神物 · 亚特兰蒂斯之种', need:{ goldIngot:8, anctDevice:3, deepCoral:6 } },
    { id:'storage', capacity:20, name:'海底储物箱扩容 · +20格', need:{ goldIngot:12, sourceBar:8, tideSteel:6 } },
  ];
  function fishmanTraded() { return (S.atlantis && S.atlantis.fishmanTraded) || {}; }
  function fishmanDeals() {
    // ⚠️ 作者 2026-09-24 反馈："为什么人鱼我根本没交易却显示已经换过了" ——
    //    以前把"我在这台鱼人这儿换过"和"我手上已经有这件东西"混成了一个 traded 字段：
    //      traded: !!fishmanTraded()[d.id] || (d.relic ? S.relics.includes(...) : hasItem(d.item))
    //    于是**从交易机买过图纸**、或**兑换码拿过之种**的档，都会显示成"已经换过了"（其实压根没换）。
    //    现在拆成两个：
    //      traded = 真的在鱼人这儿换过（S.atlantis.fishmanTraded）
    //      owned  = 从别的途径已经有了（图纸看背包，神物看 S.relics）
    //    两者都**不再提供交换入口**（免得换重复、白扣材料），但界面文案必须各说各的。
    return FISHMAN_DEALS.map(d => ({
      ...d,
      traded: !!fishmanTraded()[d.id],
      owned: d.capacity ? !!(S.atlantis && S.atlantis.fishmanStorage) : d.relic ? (S.relics || []).includes(d.relic) : hasItem(d.item),
      need: { ...d.need },
    }));
  }
  function fishmanBarter(dealId) {
    const deal = FISHMAN_DEALS.find(d => d.id === dealId);
    if (!deal) return { ok:false, reason:'鱼人没有这样东西。' };
    if (fishmanTraded()[deal.id]) return { ok:false, reason:'这个已经换过了，没什么好换的了。' };
    // 神物：已获得就不给重复
    if (deal.capacity) { if (S.atlantis && S.atlantis.fishmanStorage) return {ok:false,reason:'你已获得这次海底储物箱扩容。'}; }
    else if (deal.relic) { if ((S.relics || []).includes(deal.relic)) return { ok:false, reason:'这个神物你早就有了。' }; }
    else if (hasItem(deal.item)) return { ok:false, reason:'你已经有了这张图纸，不需要再换。' };
    for (const id in deal.need) {
      if (!hasItem(id, deal.need[id])) return { ok:false, reason:`材料不足：${ITEMS[id].name}×${deal.need[id]}（你只有 ${invCount(id)}）。` };
    }
    for (const id in deal.need) removeItem(id, deal.need[id]);
    if (deal.capacity) {
      S.atlantis = S.atlantis || {};
      S.atlantis.fishmanStorage = deal.capacity;
      log('神秘人鱼为你的海底储物箱增加了20格容量，建好储物箱后生效。', 'good');
    } else if (deal.relic) {
      S.relics = S.relics || [];
      S.relics.push(deal.relic);
      log(`你获得了神物【${RELICS[deal.relic].name}】——${RELICS[deal.relic].desc}`, 'good');
    } else {
      gainItem(deal.item, 1);
    }
    S.atlantis = S.atlantis || {}; S.atlantis.fishmanTraded = S.atlantis.fishmanTraded || {};
    S.atlantis.fishmanTraded[deal.id] = 1;
    log(deal.capacity ? '人鱼接过材料，替你扩好了储物舱。' : `人鱼接过你的东西，把【${deal.name}】放进你手里。`, 'good');
    log('她轻声低语，鳞片在暗处闪了闪。', 'sys');
    change();
    return { ok:true };
  }

  function laochaoAvailable() { return S.scene === 'camp' && S.laochao.arrived && !isNight(); }
  function signalFlag() {
    if (!S.furniture.flag) { log('需要先建信号旗。', 'warn'); return; }
    if (!matsOk({ wood:5 })) { log('需要木材×5 作为狼烟燃料。', 'warn'); return; }
    takeMats({wood:5});
    S.laochao.nextVisit = S.day + 1;
    S.flags.flagSignal = 1;
    log('你升起信号旗，狼烟飘向海面。老潮明天就会靠岸（货少价高）。', 'good');
    change();
  }
  function doFirstTrade() {
    if (S.flags.firstTrade) { log('这笔生意已经做过了。', 'warn'); return; }
    if (supplyCount('smokedFish',S.scene==='camp'?materialSupplySites():[])<10) { log('需要 10 条熏鱼。', 'warn'); return; }
    takeSupply('smokedFish',10,S.scene==='camp'?materialSupplySites():[]);
    gainItem('salt', 1); gainItem('ironingot', 4); gainItem('seedCarrot', 1);
    S.flags.firstTrade = 1;
    log('老潮掂了掂你的熏鱼，咧嘴一笑："爽快！以后常来照顾生意。"', 'good');
    log('获得：盐×1、铁锭×4、萝卜种子×1。', 'good');
    log('老潮指了指铁锭：先打把铁斧，木板能省下不少。往后修好船，去盐镇看看。','sys');
    diaryAdd('第一笔生意：十条熏鱼，换来了盐、铁锭和种子。');
    change();
  }
  function acceptCommission(c) {
    if (!c || !commissions().some(x => commissionKey(x) === commissionKey(c))) return { ok:false, reason:'这份季度委托已经过期。' };
    S.laochao.accepted = S.laochao.accepted || {};
    const key = commissionKey(c);
    if (S.laochao.done[key]) return { ok:false, reason:'委托已完成' };
    const a = S.laochao.accepted[key];
    if (a !== undefined && S.day <= a + 2) return { ok:false, reason:`委托进行中（第${a}~${a+2}天）` };
    S.laochao.accepted[key] = S.day;
    log(`你接下了委托「${c.name}」：${c.text}（持续 3 天）`, 'good');
    change();
    return { ok:true, day: S.day };
  }
  function commissions() {
    const season = seasonInfo().name;
    const pool = SEASONAL_COMMISSIONS[season] || [];
    const quarter = Math.floor((S.day - 1) / 15);
    const seed = String(S._runId || '') + ':' + quarter;
    let hash = 2166136261;
    for (const ch of seed) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
    const seasonal = pool.length ? [{ ...pool[(hash >>> 0) % pool.length], seasonal:true, quarter }] : [];
    return LAOCHAO.commissions.concat(seasonal);
  }
  function commissionKey(c) { return c.seasonal ? `${c.id}@${c.quarter}` : c.id; }
  function commissionDone(c) { return !!(S.laochao.done || {})[commissionKey(c)]; }
  function commissionAccepted(c) { return (S.laochao.accepted || {})[commissionKey(c)]; }
  function completeCommission(c) {
    if (!c || !commissions().some(x => commissionKey(x) === commissionKey(c))) { log('这份季度委托已经过期。', 'warn'); return; }
    const key = commissionKey(c);
    if (S.laochao.done[key]) return;
    if (c.type === 'kill') {
      if (S.flags['boss_'+c.target]) {
        S.laochao.done[key] = 1;
        grantReward(c);
      } else log('任务目标还活着。', 'warn');
      return;
    }
    const sites=S.scene==='camp'?materialSupplySites():[];
    for (const k in c.need) if (supplyCount(k,sites)<c.need[k]) { log(`还差 ${ITEMS[k].name}。`, 'warn'); return; }
    for (const k in c.need) takeSupply(k,c.need[k],sites);
    S.laochao.done[key] = 1;
    grantReward(c);
  }
  function grantReward(c) {
    for (const k in c.reward) {
      if (k === 'fame') { S.fame = Math.min(5, Math.round((S.fame + c.reward[k]) * 100) / 100); log(`盐镇声望提升！`, 'good'); }
      else gainItem(k, c.reward[k]);
    }
    const names = Object.entries(c.reward).map(([k,v]) => k==='fame' ? `声望+${v}` : `${ITEMS[k].name}×${v}`).join('、');
    log(`委托完成！获得：${names}。`, 'good');
    change();
  }

  // ---------- 吃喝 ----------
  function consume(id,source=false) {
    const it = ITEMS[id];
    if (!it || itemUseCount(id,source)<1 || S.death || S.ending || S.stats.hp<=0) return;
    if (it.cat !== 'food' && it.cat !== 'drink' && !(it.food || it.water || it.curePoison || it.stopBleed)) { log('这个不能吃。', 'warn'); return; }
    if(!takeUseItem(id,source))return;
    applyFoodEffects(id);
    log(`你吃/喝了${it.name}。`, 'sys');
    addMin(it.cat === 'drink' ? 1 : 5);
    change();
  }
  // 手动和自动食用共用全部效果；自动触发不递归推进时间。
  function applyFoodEffects(id) {
    const it=ITEMS[id];
    if(['fish','meat'].includes(id) && chance(0.2)) { S.statuses.nauseaUntil=(S.tick||0)+720; log('反胃：12 小时内体力消耗 +50%。','warn'); }
    if (it.buffStat) { S.buffs = S.buffs || {}; if (it.buffStat === 'spirit') { S.stats.spirit = Math.max(0, Math.min(100, S.stats.spirit + (it.buffVal||0))); log('精神+' + it.buffVal + '。', 'good'); } else { S.buffs[it.buffStat] = { v: it.buffVal||0, until: (S.tick||0) + (it.buffH||24)*60 }; log('【' + it.name + '】' + (it.buffH||24) + ' 小时内 ' + (BUFF_NAMES[it.buffStat] || '属性') + ' +' + it.buffVal + '。', 'good'); } }
    if (it.negChance && chance(it.negChance)) { if (it.negHp) { applyHarm(Math.min(it.negHp,Math.max(0,S.stats.hp-1))); log('鱼肉不太对劲……（-' + it.negHp + ' 生命）', 'danger'); } if (it.negPoison) { S.statuses.poison = Math.max(S.statuses.poison, it.poisonHours||6); log('你中毒了！持续'+(it.poisonHours||6)+'小时。', 'danger'); } }

    if (it.food) S.stats.hunger = Math.min(100, S.stats.hunger + it.food);
    if (it.water) S.stats.thirst = Math.min(100, S.stats.thirst + it.water);
    if (it.heal) { const h = medHeal(it.heal); S.stats.hp = Math.min(hpMax(), S.stats.hp + h); log(`生命+${h}。${h > it.heal ? '（药师手艺，回复 +50%）' : ''}`, 'good'); }
    if (it.spirit) S.stats.spirit = Math.max(0, Math.min(100, S.stats.spirit + it.spirit));
    if (it.sta) { S.stats.stamina = Math.min(maxStam(), S.stats.stamina + it.sta); log(`体力+${it.sta}。`, 'good'); }
    if (it.curePoison && S.statuses.poison > 0) { S.statuses.poison = 0; log('蛇胆入喉，毒性被解了。', 'good'); }
    if (it.stopBleed && S.statuses.bleed > 0) { S.statuses.bleed = 0; log('血止住了。', 'good'); }
  }
  function useMed(id,source=false) {
    // ⚠️ 本局已经结束（死亡结算中）就不许再吃药：以前"回标题 → 继续上次游戏 → 吃口药又活了"
    //    等于死亡没代价（玩家反馈）。真正的复活只有结局画面那条 50 魂点的路。
    if (S.ending === 'D' || S.death || S.stats.hp <= 0) { log('这一局已经结束了。', 'warn'); return; }
    const it = ITEMS[id];
    if (!it || it.cat !== 'med' || itemUseCount(id,source)<1) return;
    if (id === 'tideVitalPill' || id === 'abyssBreathPill') {
      S.permUsed = S.permUsed || {};
      if(!takeUseItem(id,source))return;
      S.permUsed[id] = (S.permUsed[id] || 0) + 1;
      if (id === 'tideVitalPill') { S.stats.hp += 2; log('潮生丹生效：本局生命上限永久 +2。', 'good'); }
      else { S.stats.stamina = Math.min(maxStam(), S.stats.stamina + 3); log('渊息丹生效：本局体力上限永久 +3。', 'good'); }
      addMin(10); change(); return;
    }
    if(!takeUseItem(id,source))return;
    restoreHealth(it);
    if (it.heal) { const h = medHeal(it.heal); S.stats.hp = Math.min(hpMax(), S.stats.hp + h); log(`生命+${h}。${h > it.heal ? '（药师手艺，回复 +50%）' : ''}`, 'good'); }
    if (it.stopBleed) { S.statuses.bleed = 0; log('血止住了。', 'good'); }
    if (it.curePoison) { S.statuses.poison = 0; log('毒解了。', 'good'); }
    if (it.water) { S.stats.thirst = Math.min(100, S.stats.thirst + it.water); log(`水分+${it.water}。`, 'good'); }
    if (it.sta) { S.stats.stamina = Math.min(maxStam(), S.stats.stamina + it.sta); log(`体力+${it.sta}。`, 'good'); }
    if (it.spirit) {
      S.stats.spirit = Math.max(0, Math.min(100, S.stats.spirit + it.spirit));
      if (it.spirit > 0) log(`精神+${it.spirit}。`, 'good');
      else {
        log(`精神${it.spirit}——一股腥甜窜上头顶，太阳穴突突直跳。`, 'warn');
        const cap = maxStam();
        if (S.stats.stamina > cap) { S.stats.stamina = cap; log(`精神太低，体力上限被压到 ${cap}。`, 'warn'); }
      }
    }
    change();
  }
  function equipToSlot(id,slot,idx=0) {
    if(!S||S.combat||S.death||S.ending||!ITEMS[id]||!hasItem(id))return {ok:false,reason:'现在无法更换装备。'};
    S.equipIdx=S.equipIdx||{weapon:0,weapon2:0,armor:0,cloth:0,accessory:0};if(!['weapon','weapon2','armor','cloth','accessory'].includes(slot))return {ok:false,reason:'没有这个装备槽位。'};const it=ITEMS[id];if(slot==='weapon2'&&(it.twoHand||hasTwoHand()))return {ok:false,reason:'双手武器占用主副手，不能装备到副手。'};
    const valid=slot==='weapon'?it.cat==='weapon':slot==='weapon2'?['weapon','shield'].includes(it.cat):it.cat===slot;
    if(!valid||it.ammo)return {ok:false,reason:'这件物品不适合这个槽位。'};
    if(!Number.isInteger(idx)||idx<0||idx>=invCount(id)||DURA[id]!==undefined&&durOf(id,idx)<=0)return {ok:false,reason:'装备已损坏或数量不足。'};
    for(const other of ['weapon','weapon2','armor','cloth','accessory'])if(other!==slot&&S.equipment[other]===id&&(S.equipIdx?.[other]||0)===idx)return {ok:false,reason:'这件物品已装备在另一个槽位。'};
    if(it.twoHand){S.equipment.weapon2=null;S.equipIdx.weapon2=0;}S.equipment[slot]=id;S.equipIdx[slot]=idx;log('装备了'+it.name+'。','good');change();return {ok:true};
  }
  function equip(id, idx) {
    const it = ITEMS[id];
    if (!it || !hasItem(id)) return;
    // 弹药（源能子弹 / 箭矢 / 鹰羽箭）是给远程武器吃的，不是能握在手里的武器。
    // 它们的 cat 写成 weapon 只是为了进"武器"分类，这里挡掉，避免占用主手副手。
    if (it.ammo) { log(`${it.name}是弹药，要配合远程武器使用，没法握在手里。`, 'warn'); return; }
    S.equipIdx = S.equipIdx || { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
    // 实例索引：确保每个槽用"未被其它槽占用"的实例（两把同款各占不同实例）
    const q = S.inv[id] || 1;
    const used = [];
    for (const s of ['weapon','weapon2','armor','cloth','accessory']) if (S.equipment[s] === id) used.push(S.equipIdx[s] || 0);
    let useIdx = 0, k = 0;
    while (used.includes(k) && k < q) k++;
    useIdx = (idx !== undefined && !used.includes(idx)) ? idx : Math.min(k, Math.max(0, q - 1));
    if (DURA[id] !== undefined && durOf(id,useIdx) <= 0) { log(`${it.name}耐久已耗尽，无法装备。`, 'warn'); return; }
    if (it.cat === 'weapon') {
      const mainTwo = S.equipment.weapon && ITEMS[S.equipment.weapon].twoHand;
      // 双手武器已经握在手上时，不允许再装副手武器 —— 双持 = 两只手各一把单手武器。
      // （旧版这里会直接把双手武器顶掉，玩家会以为武器凭空消失了）
      if (mainTwo && !it.twoHand) {
        log(`手里正握着双手武器${ITEMS[S.equipment.weapon].name}，两只手都占着——想换单手武器，请先把它卸下。`, 'warn');
        return;
      }
      if (it.twoHand) {   // 双手武器：占主手，副手清空
        const old = S.equipment.weapon;
        S.equipment.weapon = id; S.equipment.weapon2 = null; S.equipIdx.weapon = useIdx; S.equipIdx.weapon2 = 0;
        log(`双手握上了${it.name}${old ? `（换下${ITEMS[old].name}）` : ''}，副手空了出来。`, 'sys');
      } else {
        let slot = 'weapon';
        if (S.equipment.weapon) slot = S.equipment.weapon2 ? 'weapon' : 'weapon2';
        const old = S.equipment[slot];
        S.equipment[slot] = id; S.equipIdx[slot] = useIdx;
        log(`装备了${it.name}${old ? `（换下${ITEMS[old].name}）` : ''}${slot === 'weapon2' ? '（副手）' : ''}。`, 'sys');
      }
    } else if (it.cat === 'shield') {
      if (S.equipment.weapon && ITEMS[S.equipment.weapon] && ITEMS[S.equipment.weapon].twoHand) {
        log(`手里正握着双手武器${ITEMS[S.equipment.weapon].name}，腾不出手拿盾——请先把它卸下。`, 'warn');
        return;
      }
      if (S.equipment.weapon2 && ITEMS[S.equipment.weapon2] && ITEMS[S.equipment.weapon2].cat !== 'shield') { log('副手已有武器，先卸下。', 'warn'); return; }
      const old = S.equipment.weapon2;
      S.equipment.weapon2 = id; S.equipIdx.weapon2 = useIdx;
      log(`副手举起了${it.name}${old ? `（换下${ITEMS[old].name}）` : ''}。`, 'sys');
    } else if (it.cat === 'armor') {
      const old = S.equipment.armor;
      S.equipment.armor = id; S.equipIdx.armor = useIdx;
      log(`穿上了${it.name}${old ? `（换下${ITEMS[old].name}）` : ''}。`, 'sys');
    } else if (it.cat === 'cloth') {
      const old = S.equipment.cloth;
      S.equipment.cloth = id; S.equipIdx.cloth = useIdx;
      log(`穿上了${it.name}${old ? `（换下${ITEMS[old].name}）` : ''}。`, 'sys');
    } else if (it.cat === 'accessory') {
      const old = S.equipment.accessory;
      S.equipment.accessory = id; S.equipIdx.accessory = useIdx;
      log(`佩戴了${it.name}${old ? `（换下${ITEMS[old].name}）` : ''}。`, 'sys');
    } else { log('这个不能装备。', 'warn'); return; }
    change();
  }
  function unequip(id, idx) {
    for (const k of ['weapon','weapon2','armor','cloth','accessory']) {
      if (S.equipment[k] === id && (idx === undefined || (S.equipIdx||{})[k] === idx)) { S.equipment[k] = null; if (S.equipIdx) S.equipIdx[k] = 0; log(`你卸下了${ITEMS[id].name}。`, 'sys'); change(); return; }
    }
    log('这件没在装备。', 'warn');
  }
  function rest(hours) {
    const h = Math.max(1, Math.min(3, Math.round(hours || 1)));
    if (S.stats.stamina >= maxStam()) { log('体力充沛，不需要休息。', 'warn'); return; }
    // ⚠️ 顺序要紧（玩家反馈"21:55 休息到 23:55，体力消失了"）：
    //    以前是【先走时间、再加体力】。如果这段时间跨过午夜，addMin() 里的 newDay() 会顺手 save()，
    //    存进去的是**加体力之前**的状态；而 rest() 自己从来不 save() → 之后一旦读档/切后台回来，
    //    这 +体力 就没了（看着就像"休息白休了"）。
    //    现在和 sleep() 一致：先把恢复结算进 S，再推进时间（这样跨天那次 save 一定带上它），末尾再补一次 save。
    S.stats.stamina = Math.min(maxStam(), S.stats.stamina + 10 * h);
    addMin(60 * h);
    log(`你坐下歇了一会儿（${h} 小时，体力+${10 * h}）。`);
    save();
    change();
  }

  // ---------- 结局 ----------
  function checkEndingActions() {
    const acts = [];
    if (S.ending || S.difficulty==='nightmare') return acts;
    if (S.scene === 'camp') {
      const dock = BUILDING_CHAINS.dock[S.buildings.dock];
      if (dock.boat === 'ocean' && hasItem('seachart') && invCount('supplybox') >= 3 && !S.flags.ended_A) acts.push({ id:'endA', name:'扬帆远航（结局·归乡）', desc:'远洋船、海图、三箱补给都已备齐。是时候回家了。' });
      // 岛主结局：作者 2026-09-22 要求加难度 —— 盐镇声望从 2 提到 **4**（声望上限同时 3→5）。
      // 声望来源是告示板 c2~c5 四条委托各 +1，所以「声望 4」= 四条委托全部完成，
      // 不再是刷两条就能拿结局。
      if (S.flags['boss_pirateBoss'] && S.fame >= 4 && S.buildings.wall >= 3 && !S.flags.ended_B) acts.push({ id:'endB', name:'召集岛民（结局·岛主）', desc:'海盗已灭、盐镇上下都认你、城墙已固。这座岛需要一个主人。' });
    }
    // 山顶祭坛仪式不再是结局（章节目标）：不在这里按「结局」列出，也不进结算流程。
    // 仪式照旧触发（山顶祭坛点位 / 右下角章节目标按钮），由 doPeakRitual 处理，只发一次 50 魂点。
    if (S.scene === 'atlantis' && (S.killCount.sunkenKing || 0) > 0) {
      if (!S.flags.ended_S)  acts.push({ id:'endS',  name:'重启灯塔（结局·重燃文明）', desc:'沉没之王已伏诛，点亮灯塔，让文明重生。' });
      if (!S.flags.ended_S2) acts.push({ id:'endS2', name:'封存灯塔（结局·深海长眠）', desc:'按灭最后一盏灯，让这座城重新安眠。' });
    }
    // 已达成、这一局还没结算的结局 → 给"看结算画面"的入口。
    // ⚠️ 以前缺的正是这一步：settleEnding() 全项目没有任何界面调用，
    //    玩家点了「祭坛仪式（结局·秘辛）」只写一行日志，结算画面与结算文字永远看不到。
    // ⛔ 一个存档只认一个结算结局（作者 2026-09-18 定）。收尾之后**不再列出**其余的「结算」按钮：
    //    作者 2026-09-23 反馈"结局按钮貌似只消失一个，其他还是不能取消" ——
    //    老做法是把它们留着、标成「本局已收尾」，本意是"藏起来玩家会以为坏了"，
    //    但实际效果是打完几个结局之后，右下角常年挂着两个点了只会弹"请开新的一局"的按钮。
    //    ⚠️ 只藏「结算」，**不动「达成」**：其他结局照样能达成（照进日记与成就），
    //       那条路径由上面的 endX 分支和 askSettleEnding 里的说明负责交代原因，界面不会静默失败。
    const lockKey = S.flags.settledEnding;
    for (const [key, id] of [['A','endA'], ['B','endB'], ['S','endS'], ['S2','endS2']]) {
      if (S.flags['ended_' + key] && !S.flags['settled_' + key]) {
        if (lockKey) continue;   // 本存档已收尾 → 这个按钮点了什么也做不了，直接不列
        const nm = (ENDINGS[key] || {}).name || key;
        acts.push({ id:'settle_' + id, name:`结算 · 结局「${nm}」`, desc:'看结局画面与结算文字（这一生折成魂点汇入《历代遗章》），看完还能继续玩。' });
      }
    }
    return acts;
  }
  function doEnding(id) {
    if(S.difficulty==='nightmare') return {ok:false,reason:'击败噩梦之源才能从长夜醒来。'};
    // 第二章：结局改为"可继续/可手动结算"，不再强制结束
    // 兼容旧调用：C 已改为章节目标，任何遗留入口都统一走祭坛逻辑，不能再进入结局结算。
    if (id === 'endC') return doPeakRitual();
    if (id === 'endA') {
      if (S.flags['ended_A']) { log('归乡的一切都已备齐。', 'sys'); return; }
      S.flags['ended_A'] = 1;
      log('万事俱备，可你的目光却落向了更远的深海——或许还能找到更多线索。（按"回营地"即可继续；结算入口在「装备 → 属性」的人物立绘下方）', 'good');
      diaryAdd('海之尽头，仿佛还有一个世界在等我。');
    } else if (id === 'endB') {
      if (S.flags['ended_B']) { log('岛上的灯火已经亮起。', 'sys'); return; }
      S.flags['ended_B'] = 1;
      log('岛主之名落定，可你总觉得海的深处仍有未解的谜团……（按"回营地"即可继续；结算入口在「装备 → 属性」的人物立绘下方）', 'good');
      diaryAdd('这座岛已经是我的了，可深海还在呼唤。');
    } else if (id === 'endS') {
      if (S.flags['ended_S']) { log('灯塔的长明之光已经亮起。', 'sys'); return; }
      S.flags['ended_S'] = 1;
      achUnlock('lighthouse');
      log('你重启了亚特兰蒂斯的灯塔——失落文明的灯火，重新亮起。（结局·重燃文明 已达成，可继续；结算入口在「装备 → 属性」的人物立绘下方）', 'good');
      diaryAdd('灯塔亮起，文明重新呼吸。');
    } else if (id === 'endS2') {
      if (S.flags['ended_S2']) { log('深海已经重归寂静。', 'sys'); return; }
      S.flags['ended_S2'] = 1;
      achUnlock('abyssal');
      log('你按灭了最后一盏灯，让亚克兰蒂斯重新长眠。（结局·深海长眠 已达成，可继续；结算入口在「装备 → 属性」的人物立绘下方）', 'good');
      diaryAdd('我选择让这座城安安静静地睡下去。');
    }
    save();
    change();
    unlockChallenges();
    askSettleEnding(id);
    return { ok:true, key: String(id).replace('end', '') };
  }
  // 山顶祭坛仪式（章节目标，不是结局）：不结算、不算结局列表，只发一次 50 魂点。
  // 老档已经用 ended_C=1 记了「仪式做过」→ 直接挡住，不能再领魂点。
  // 保留 S.flags.ended_C 与 atlantis 解锁链，不破坏传送石/亚特兰蒂斯，也不改老存档其它 flag。
  function doPeakRitual() {
    if (S.flags.ended_C) {
      log('祭坛早已点亮，凹槽空空如也——这段往事你已经记下了。', 'sys');
      return { ok:false, reason:'祭坛仪式已经完成过了。' };
    }
    if (!hasItem('relic') || invCount('slate') < 3 || !hasItem('dragonbone')) {
      log('祭坛还缺东西：遗物、三块石板、龙骨，缺一不可。', 'warn');
      return { ok:false, reason:'材料不足：需要遗物 + 石板×3 + 龙骨。' };
    }
    // 局内完成标记与账号魂点必须一起落盘；任一写入失败就整体回滚，避免刷新后反复领 50 魂点。
    const next = JSON.parse(JSON.stringify(S));
    const meta = JSON.parse(JSON.stringify(metaState()));
    next.flags = next.flags || {};
    next.flags.ended_C = 1;
    next.atlantis = next.atlantis || { unlocked:1, visited:0, camp:{ furniture:{}, buildings:{} }, quest:0 };
    next.atlantis.unlocked = 1;
    next.diary = next.diary || [];
    next.diary.push({ day:next.day, line:'亚克兰蒂斯……失落文明的灯塔，在海的尽头。' });
    // 日出回溯也必须保留这个已发放账号奖励的标记，否则死亡后可重复领取。
    const cp = next.dawnCheckpoint && next.dawnCheckpoint.state;
    if (cp && cp.day === next.day) {
      cp.flags = cp.flags || {};
      cp.flags.ended_C = 1;
      cp.atlantis = cp.atlantis || { unlocked:1, visited:0, camp:{ furniture:{}, buildings:{} }, quest:0 };
      cp.atlantis.unlocked = 1;
      next._snap = next._snap || {};
      next._snap.day = JSON.parse(JSON.stringify(cp));
    }
    meta.soul = (meta.soul || 0) + 50;
    const result = persistPair(next, meta, false);
    if (!result.ok) return result;
    log('祭坛轰然点亮——这座岛，是失落文明最后的哨站！海的最深处传来低语：去找亚克兰蒂斯。山顶浮现出一枚传送石。（章节目标完成，获得 50 魂点）', 'good');
    change();
    return { ok:true, soul: 50 };
  }
  // 结局达成之后，当面问一句"要不要现在看结算画面"（以前没有这一步，玩家以为按钮点坏了）
  // 话里必须讲清：一个存档只能结算一个结局（作者 2026-09-18 定的规矩）。
  function askSettleEnding(id) {
    const key = String(id).replace('end', '');
    const end = ENDINGS[key] || {};
    const name = end.name || key;
    const lockKey = S.flags.settledEnding;
    if (lockKey && lockKey !== key) {
      const lockName = (ENDINGS[lockKey] || {}).name || lockKey;
      showOverlay({
        title: '结局达成 · ' + name,
        text: `《${name}》达成了——不过这个存档已经用结局「${lockName}」收尾了。\n\n一个存档只能结算一个结局，所以《${name}》这一局不能再结算（达成记录、日记和成就照样算数）。\n\n复活不会解除这个定局，想换一个结局收尾只能开新的一局。`,
        choices: [ { label:'知道了', ok: () => {} } ],
      });
      return;
    }
    showOverlay({
      title: '结局达成 · ' + name,
      text: `这一生可以收尾了：《${name}》已经达成。\n\n⚠ 一个存档只能结算一个结局：确定结算《${name}》之后，这个存档就不能再结算其他结局了（其他结局仍然可以达成，只是收尾要开新的一局）。\n\n结算会把这一生折成魂点汇入《历代遗章》，看完可以按「留在岛上」接着玩，进度不会丢。\n\n不着急看也行——随时打开「装备 → 属性」，入口就在人物立绘下方（「结算 · 结局「${name}」」）。`,
      choices: [
        { label:'观看结算画面', hint:'还要再确认一次', ok: () => { confirmSettleEnding(id); } },
        { label:'继续探索', hint:'先接着玩，之后再结算', ok: () => { log(`《${name}》已达成，随时可以结算。`, 'sys'); } },
      ],
    });
  }
  // 结算 = 本存档从此只认这一个结局，不可逆，所以单独再确认一次（别让手滑点掉）
  function confirmSettleEnding(id) {
    const key = String(id).replace('end', '');
    const end = ENDINGS[key] || {};
    const name = end.name || key;
    showOverlay({
      title: '结算前确认 · ' + name,
      text: `确认以《${name}》作为这个存档的结局吗？\n\n· 结算后本存档不能再结算其他结局（其他结局仍然可以达成）\n· 这一生照常可以接着玩，进度不会丢\n· 本局会折算成魂点汇入《历代遗章》`,
      choices: [
        { label:'确定结算', hint:'本存档只认这一个结局', ok: () => { settleEnding(id); } },
        { label:'再想想', hint:'先接着玩', ok: () => { log(`《${name}》先留着——「装备 → 属性」的人物立绘下方随时能结算。`, 'sys'); } },
      ],
    });
  }
  function settleEnding(id) {
    const key = String(id).replace('end', '');
    if (!S.flags['ended_' + key]) return { ok:false, reason:'该结局尚未达成。' };
    const lockKey = S.flags.settledEnding;
    if (lockKey && lockKey !== key) {
      const lockName = (ENDINGS[lockKey] || {}).name || lockKey;
      return { ok:false, reason:`本存档已经用结局「${lockName}」收尾了——一个存档只能结算一个结局（其他结局仍可达成，收尾请开新的一局）。` };
    }
    S.flags['settled_' + key] = 1;   // 同一结局只结算一次（防"结算→留在岛上→再结算"刷魂点）
    S.flags.settledEnding = key;     // 本存档的唯一定局：此后不再结算别的结局
    S.ending = key;
    save();
    const ms = metaSettle();
    if (ms) log(`你的一生化为 ${ms.gain} 魂点，汇入了《历代遗章》。`, 'good');
    if (onEnding) onEnding(S.ending, '');
    return { ok:true };
  }

  // ---------- 图鉴 ----------
  // 图鉴口径统一：总量与列表用同一份名单，避免"标题 25 条、列表 24 条"这种对不上
  function resIds() { return Object.keys(ITEMS).filter(k => !ITEMS[k].retired && ['mat','special','bp','seed'].includes(ITEMS[k].cat)); }
  function monIds() { return Object.keys(ENEMIES).filter(k => !ENEMIES[k].noDex && (!ENEMIES[k].nightmare || (S && ['nightmare','dev'].includes(S.difficulty)))); }   // 梦魇仅在专属模式计入图鉴
  function collection() {
    const mm = metaState();
    const seen = (S && S.seen) || {};   // 主界面（没有存档）也要能看账号图鉴
    const seenItems = mm.seenItems || {}, seenMon = mm.seenMon || {};
    return {
      res: resIds().filter(k => seen[k] || seenItems[k]).length,
      resTotal: resIds().length,
      mon: monIds().filter(k => seen['mon_' + k] || seenMon[k]).length,
      monTotal: monIds().length,
    };
  }

  // ---------- 目标引导 ----------
  function currentObjective() {
    if (!S) return '';
    const day = S.day;
    // 凑齐结局 C 材料后，直接指路山顶祭坛（传送石/亚克兰蒂斯的入口）
    if (!S.flags.ended_C && hasItem('relic') && invCount('slate') >= 3 && hasItem('dragonbone')) return '遗物、三块石板、龙骨都齐了——回【山顶】举行祭坛仪式。';
    if (S.flags.ended_C && !(S.atlantis && S.atlantis.stoneActive)) return '回【山顶】点「传送石」——用三块石板解出符文（三小关：记忆顺序 / 成对翻牌 / 点亮九格），解开就能去亚克兰蒂斯。';
    // ⚠️ 同上：帐篷/篝火开局就有，别写"生起篝火、搭好帐篷"让人以为要自己做（作者 2026-09-23）
    if (S.difficulty === 'legend' && (S.buildings.house < 0 || S.buildings.storage < 0 || S.buildings.fire < 0)) return '传奇求生：去「营地建造」亲手搭帐篷、储物箱和篝火；材料可在周边采集。';
    // 顺序（作者 2026-09-21）：先食水危急 → 缺斧镐 → 工具台 → 床。
    // ⚠️ 食水与工具提示**不看床**——已有床也一样要提醒急需吃喝/缺工具。
    if (S.stats.hunger < 30 || S.stats.thirst < 30) return seasonInfo().name === '冬'
      ? '先解决吃喝：采点野莓/野菜、去河畔采雪并烧成淡水，别把自己耗垮了。'
      : '先解决吃喝：采点野莓/野菜、到河边取水，别把自己耗垮了。';
    if (day === 1) return '帐篷和篝火已经搭好了——先点开看看，再摸清营地周边的物资。';
    if(S.atlantis?.unlocked)return '前往礁石栖息地整备潜水装备与照明，逐步探索各片海域的遗迹。';
    const hasAxe = hasItem('axeStone') || hasItem('axeIron') || hasItem('axeSteel');
    const hasPick = hasItem('pickStone') || hasItem('pickIron') || hasItem('pickSteel') || hasItem('pickBlack');
    if (!hasAxe && !hasPick) return '做一把石斧或石镐（各需木材×2、燧石×2）。';
    if (!S.furniture.wb1 && !S.furniture.wb2 && !S.furniture.wb3) return '先造一张工具台（木板×4、石头×4），解锁制作。';
    if(S.buildings.watch===0 && materialCount('plank')<8)return '先在制作页削木板、制木杆，为一级瞭望台备料；削木板每批4木材出2木板，装备铁斧或钢斧后自动出3木板。';
    if (S.buildings.watch === 0) return '下一步建一级瞭望台（木杆×8、木板×8、藤蔓×4），开出草地、荒漠与山洞；草床可按需再造。';
    if (!S.flags.firstTrade && day < 5) return '囤积 10 条熏鱼（烟熏炉制作），第 5 天老潮会靠岸收货。';
    if (S.laochao.arrived && !S.flags.firstTrade) return '老潮就在岸边！用 10 条熏鱼完成首笔交易。';
    if (!S.furniture.fr1 && !S.furniture.fr2 && !S.furniture.fr3) return '造简易熔炉（黏土×6、石头×6），把铁矿石炼成铁锭。';
    if (!hasItem('axeIron') && !hasItem('pickIron')) return '打造铁斧与铁镐，去采石场深层挖铁矿。';
    if (S.buildings.wall === 0 && day >= 5) return '建一圈栅栏（木材×20），夜里会有野兽。';
    if (S.buildings.watch === 1) return '升级二级瞭望台（木板×16、铁钉×8、绳索×2），望向山顶与大海。';
    if (S.buildings.dock < 2) return '建船坞并造木筏（竹子×20、藤蔓×10、木材×10），出海看看。';
    if (S.buildings.watch === 2 && !hasItem('spyglass')) return '凑齐望远镜（水晶×1+鹰羽×1），升级三级瞭望台。';
    if (!hasItem('seachart')) {
      if (S.fame < 2) return '盐镇酒馆的情报贩子只跟有声望的人做生意——先做告示板的委托，把盐镇声望刷到 2。';
      return `攒够约 ${priceOf(150, false, 'seachart')} 金币，去盐镇酒馆找情报贩子买「海图」（归乡结局的关键）。金币来自遗迹守卫、海盗/海盗头目与山顶的石碑守卫。`;
    }
    if(S.buildings.dock>=2&&!knowsBlueprint('bpDive'))return '乘船前往盐镇，完成委托提升声望；查看商店的潜水服图纸，为水下探索准备潜水装备和照明。';
    return '集齐结局所需的遗物与图纸，这座岛的真相在等你。';
  }

  function demolishFurniture(fid) {
    if (!S.furniture[fid]) { log('没有这个家具。', 'warn'); return; }
    const f = FURNITURE.find(x => x.id === fid);
    if (!f) return;
    if(fid==='cellar'&&S.cellar?.items?.length){log('请先取出地窖中的食物再拆除。','warn');return;}
    if(fid==='shelf')S.bookFocus='';
    delete S.furniture[fid];
    // 拆掉鸡舍/羊圈：里面的牲畜会跑掉（提示清楚，别让玩家白白损失）
    if (fid === 'coop' || fid === 'pen') {
      const L = liveState();
      const n = L[fid].length;
      if (n) { L[fid] = []; log(`你拆掉了${f.name}，里面的 ${n} 只跑了。`, 'warn'); }
    }
    const refund = [];
    for (const k in f.mats) { const q = Math.max(1, Math.round(f.mats[k] * 0.5)); gainItem(k, q); refund.push(`${ITEMS[k].name}×${q}`); }
    log(`你拆除了${f.name}，返还了部分材料：${refund.join('、')}。`, 'good');
    diaryAdd(`我拆掉了${f.name}。`);
    change();
  }

  function collectRainWater() {
    if (!S.furniture.rainfilter) return { ok:false, reason:'还没有建造滤雨器。' };
    let stored = Math.max(0, Math.min(20, Math.floor(Number(S.rainWater) || 0)));
    if (!stored) return { ok:false, reason:'滤雨器里还没有水，下雨后再来看看。' };
    let taken = 0;
    while (stored > 0 && addItem('water', 1, true)) { stored--; taken++; }
    if (!taken) return { ok:false, reason:'背包已满，先腾出一个位置再取水。' };
    S.rainWater = stored;
    log(`从滤雨器取出淡水×${taken}（剩余 ${stored}/20）。`, 'good');
    change();
    return { ok:true, taken, stored };
  }
  function collectHiveHoney() {
    if (!S.furniture.beehive) return { ok:false, reason:'还没有建造蜂箱。' };
    let stored = Math.max(0, Math.min(12, Math.floor(Number(S.hiveHoney) || 0)));
    if (!stored) return { ok:false, reason:'蜂箱里还没有蜂蜜，明天再来看看。' };
    let taken = 0;
    while (stored > 0 && addItem('honey', 1, true)) { stored--; taken++; }
    if (!taken) return { ok:false, reason:'背包已满，先腾出一个位置再收蜜。' };
    S.hiveHoney = stored;
    log(`从蜂箱收取蜂蜜×${taken}（剩余 ${stored}/12）。`, 'good');
    change();
    return { ok:true, taken, stored };
  }

  // ---------- 出售/兑换 ----------
  // （旧的"一键卖固定价表" sellPrice/sellItem 已删除：没有任何界面入口，属于遗留死代码）
  // 老潮的兑换：**双向**（作者 2026-09-25 定案）。两个方向各走各的价，中间留一道价差就套不了利：
  //   50 贝壳 → 1 金币      1 金币 → 30 贝壳
  // 于是「贝壳→金币→贝壳」走一圈 50 变 30（亏），「金币→贝壳→金币」走一圈 30 贝壳换不到 1 枚金币（也亏）。
  const SHELL_PER_COIN = 50;    // 换 1 枚金币要多少贝壳
  const SHELL_FOR_COIN = 30;    // 1 枚金币能换回多少贝壳
  function exchangeShells(n) {
    const amount = Math.max(1, Math.min(n || 1, Math.floor(invCount('beibi') / SHELL_PER_COIN)));
    if (amount < 1 || invCount('beibi') < SHELL_PER_COIN) return { ok:false, reason:`贝壳不足：${SHELL_PER_COIN} 贝壳才能换 1 金币。` };
    removeItem('beibi', amount * SHELL_PER_COIN);
    addItem('coin', amount, true);
    log(`你用 ${amount * SHELL_PER_COIN} 贝壳向老潮兑换了 ${amount} 枚金币。`, 'good');
    change();
    return { ok:true, amount };
  }
  function exchangeGold(n) {
    const amount = Math.max(1, Math.min(n || 1, invCount('coin')));
    if (amount < 1 || invCount('coin') < 1) return { ok:false, reason:'金币不足：至少要 1 枚金币才能换贝壳。' };
    removeItem('coin', amount);
    addItem('beibi', amount * SHELL_FOR_COIN, true);
    log(`你用 ${amount} 枚金币向老潮换了 ${amount * SHELL_FOR_COIN} 枚贝壳。`, 'good');
    change();
    return { ok:true, amount };
  }

  function hardCompleted(st) {
    return !!(st && st.difficulty==='hard' && st.flags && (['A','B','S','S2'].some(k=>st.flags['ended_'+k]) || (st.ending && st.ending!=='D')));
  }
  function difficultyUnlocked(id) {
    if(!['legend','nightmare'].includes(id)) return true;
    const m=metaState();
    if(m.challengeUnlocked || hardCompleted(S)) return true;
    // Old completed hard saves retain their qualification; deaths and chapter rituals do not qualify.
    let primary=null;try{primary=JSON.parse(localStorage.getItem('guyuyizhang_save') || 'null');}catch(_){}
    const qualified=hardCompleted(primary) || (m.slots || []).some(sl=>sl && hardCompleted(sl.data));
    if(qualified) m.challengeUnlocked=true;
    return qualified;
  }
  function unlockChallenges() {
    if(!hardCompleted(S) || metaState().challengeUnlocked) return;
    const next=JSON.parse(JSON.stringify(S)),meta=JSON.parse(JSON.stringify(metaState()));meta.challengeUnlocked=true;
    if(persistPair(next,meta,false).ok) log('传奇与噩梦模式已解锁。','good');
  }
  function nightmareInfo() {
    const day=S ? Math.max(1,S.day || 1) : 1,step=Math.min(10,Math.floor(day/20));
    const maxTier=[1,20,40,60,80,120].filter(d=>day>=d).length;
    const tiers=day>=200?[5,6]:Array.from({length:maxTier},(_,i)=>i+1);
    const weights=tiers.map(t=>Math.pow(t,1+step*.16));
    return {active:!!(S && S.difficulty==='nightmare' && !S.flags.ended_N),day,maxTier,tiers,weights,moveChance:.05+step*.02,gatherChance:.03+step*.01,bossReady:!!(S && (S.flags.boss_sunkenKing || (S.killCount.sunkenKing || 0)>0))};
  }
  function nightmareEncounter(kind) {
    const n=nightmareInfo();
    if(!n.active || S.combat || S.death || S.ending || !chance((kind==='move'?n.moveChance:n.gatherChance) * lanternRiskMul()))return false;
    let roll=Math.random()*n.weights.reduce((a,b)=>a+b,0),tier=n.tiers[n.tiers.length-1];
    for(let i=0;i<n.tiers.length;i++){roll-=n.weights[i];if(roll<0){tier=n.tiers[i];break;}}
    log('空气忽然安静。一道不属于这里的影子挡住了你。','danger');startFight(ENEMIES['nightmare'+tier],true);return true;
  }
  function challengeNightmareBoss() {
    if(!nightmareInfo().active || !nightmareInfo().bossReady || S.scene!=='atlantis' || S.zone!=='sanctum' || S.combat || S.death || S.ending)return {ok:false,reason:'击败沉没之王后，可在深水圣殿挑战噩梦之源。'};
    startFight(ENEMIES.nightmareBoss);return {ok:true};
  }
  function reconcileNightmareSouls() {
    if(!S || !S._runId)return false;
    const track=(metaState().nightmareRuns||{})[S._runId];if(!track)return false;
    S.nightmare=S.nightmare||{};S.nightmare.consumedByTier=S.nightmare.consumedByTier||{};
    let blocked=false;
    for(const id of ['nightmareSoul','nightmareSoul2','nightmareSoul3']){
      const first=id==='nightmareSoul',already=first?(S.nightmare.consumed||0):(S.nightmare.consumedByTier[id]||0),total=first?(track.consumed||0):(track.consumedByTier?.[id]||0),owed=Math.max(0,total-already),take=Math.min(owed,invCount(id));
      if(take){removeItem(id,take);if(first)S.nightmare.consumed=already+take;else S.nightmare.consumedByTier[id]=already+take;}if(owed>take)blocked=true;
    }
    return blocked;
  }
  const NIGHTMARE_SOULS = ['nightmareSoul','nightmareSoul2','nightmareSoul3'];
  function nightmareInfusionBonus() {
    const choices=Object.values((S && S.nightmareInfusions) || {}).flat();
    return {def:choices.filter(x=>x==='hard').length,atk:choices.filter(x=>x==='blade').length*2,dodge:choices.filter(x=>x==='agile').length*.05};
  }
  function infuseNightmare(id,choice) {
    if(!S || S.difficulty!=='nightmare' || S.scene!=='camp' || !S.furniture.nightmareExtractor || S.combat || S.death || S.ending)return {ok:false,reason:'需要在营地使用噩梦汲取仪。'};
    if(!NIGHTMARE_SOULS.includes(id) || !['hard','blade','agile'].includes(choice))return {ok:false,reason:'无效的选择。'};
    const oldS=S,oldM=M,next=JSON.parse(JSON.stringify(S)),meta=JSON.parse(JSON.stringify(metaState()));S=next;M=meta;staging=true;
    try {
      next.nightmareInfusions=next.nightmareInfusions || {};const choices=next.nightmareInfusions[id] || [];
      if(choices.length>=2)throw Error('此阶魂魄已完成两次选择。');
      if(invCount(id)<30 || !removeItem(id,30))throw Error('需要30份同阶魂魄。');
      next.nightmareInfusions[id]=[...choices,choice];
    } catch(e){return {ok:false,reason:e.message};}finally{S=oldS;M=oldM;staging=false;}
    const result=persistPair(next,meta,false);if(!result.ok)return result;
    log('汲取仪回应了你的选择。你感到自身发生了变化。','good');change();return {ok:true};
  }
  function separateSouls(qty=1,soulId='nightmareSoul') {
    if(!S || S.difficulty!=='nightmare' || S.scene!=='camp' || !S.furniture.soulSeparator || S.combat || S.death || S.ending)return {ok:false,reason:'需要在营地使用解魂器。'};
    if(!NIGHTMARE_SOULS.includes(soulId))return {ok:false,reason:'请选择魂魄等级。'};
    qty=Number(qty);if(![1,10,100].includes(qty))return {ok:false,reason:'请选择1、10或100份。'};
    const oldS=S,oldM=M,next=JSON.parse(JSON.stringify(S)),meta=JSON.parse(JSON.stringify(metaState()));let rewards={},soul=0,coins=0;
    S=next;M=meta;staging=true;
    try {
      if(reconcileNightmareSouls())throw Error('旧档中还有已分解魂魄待补足。');
      if(invCount(soulId)<qty || !removeItem(soulId,qty))throw Error('噩梦魂魄不足。');
      meta.nightmareRuns=meta.nightmareRuns || {};
      const track=meta.nightmareRuns[next._runId]=meta.nightmareRuns[next._runId] || {consumed:0};
      const tier=NIGHTMARE_SOULS.indexOf(soulId),basic=['wood','branch','stone','thatch','clay','flint','fiber'],rare=tier===2?['ironingot','steelingot','crystal','mithrilingot']:['ironingot','crystal'];
      track.sequence=track.sequence??track.consumed??0;track.consumedByTier=track.consumedByTier||{};
      for(let i=0;i<qty;i++) {
        const nonce=++track.sequence,rareDrop=lotteryRandom(next._runId,nonce,'soul-rare')<[0,.01,.02][tier],pool=rareDrop?rare:basic;
        const roll=lotteryRandom(next._runId,nonce,'soul-material'),id=rareDrop&&tier===2?(roll<.025?'mithrilingot':rare[Math.min(2,Math.floor((roll-.025)/.975*3))]):pool[Math.floor(roll*pool.length)],n=rareDrop?1:1+Math.floor(lotteryRandom(next._runId,nonce,'soul-qty')*3);
        rewards[id]=(rewards[id] || 0)+n;
        if(lotteryRandom(next._runId,nonce,'soul-point')<.2)soul++;
        if(lotteryRandom(next._runId,nonce,'soul-ad')<.03)coins++;
      }
      if(soulId==='nightmareSoul')track.consumed+=qty;else track.consumedByTier[soulId]=(track.consumedByTier[soulId]||0)+qty;
      next.nightmare=next.nightmare || {};next.nightmare.consumed=track.consumed;next.nightmare.consumedByTier={...track.consumedByTier};
      for(const [id,n]of Object.entries(rewards))gainItem(id,n);
      if(soul || coins){walletEntry(meta,`nightmare:${next._runId}:${track.sequence}`,coins,soul);meta.soul+=soul;}
    } catch(e){return {ok:false,reason:e.message};}finally{S=oldS;M=oldM;staging=false;}
    const res=persistPair(next,meta,false);if(!res.ok)return res;
    log(`分解${qty}份魂魄：${Object.entries(rewards).map(([id,n])=>ITEMS[id].name+'×'+n).join('、')}${soul?'；魂点+'+soul:''}${coins?'；星之点+'+coins:''}。`,'good');change();
    return {ok:true,rewards,soul,coins};
  }

  // ---------- 局外成长：历代遗章 ----------
  let M = null;
  const PAID_IDENTITIES = ['trainer','beekeeper'];
  function identityUnlocked(id) {
    return !!IDENTITIES[id] && (!PAID_IDENTITIES.includes(id) || !!(metaState().identityUnlocks || {})[id]);
  }
  function unlockIdentity(id) {
    if (!PAID_IDENTITIES.includes(id)) return {ok:false,reason:'该角色无需购买解锁。'};
    if (identityUnlocked(id)) return {ok:true,already:true};
    const meta=JSON.parse(JSON.stringify(metaState()));
    if ((meta.soul || 0)<100) return {ok:false,reason:'魂点不足，解锁需要 100 魂点。'};
    meta.soul-=100;meta.identityUnlocks=meta.identityUnlocks || {};meta.identityUnlocks[id]=1;
    return persistPair(S ? JSON.parse(JSON.stringify(S)) : null,meta,false);
  }
  function preserveMetaGrowth(incoming, local) {
    incoming.challengeUnlocked = !!(incoming.challengeUnlocked || local.challengeUnlocked);
    incoming.nodes = incoming.nodes || {};
    let retainedUpgrade = false;
    for (const id of PAID_IDENTITIES) if ((local.identityUnlocks || {})[id]) {
      incoming.identityUnlocks=incoming.identityUnlocks || {};
      if (!incoming.identityUnlocks[id]) retainedUpgrade=true;
      incoming.identityUnlocks[id]=1;
    }
    for (const node of META_NODES) {
      const before = Math.max(0,Math.min(node.max,Number(incoming.nodes[node.id]) || 0));
      const owned = Math.max(0,Math.min(node.max,Number((local.nodes || {})[node.id]) || 0));
      if (owned > before) { incoming.nodes[node.id] = owned; retainedUpgrade = true; }
    }
    // 保留永久升级时，不同时退回旧码中购买前的魂点余额。
    if (retainedUpgrade) incoming.soul = Math.min(Number(incoming.soul) || 0,Number(local.soul) || 0);
    for (const key of ['runs','totalSoul']) incoming[key] = Math.max(Number(incoming[key]) || 0,Number(local[key]) || 0);
  }
  function metaLoad(){return repository.metaLoad();}
  function metaSave(){return repository.metaSave();}
  function metaReload(){return repository.metaReload();}

  // Retired platform methods remain inert for old tooling; saves stay local.
  function cloudStatus() { return {supported:false,msg:'本地存档已启用；请导出存档码作设备外备份。',at:0,applied:0,uuid:null,diag:'local-only',pending:false}; }
  function cloudPush() { return false; }
  function cloudInit() { return false; }
  // 存档码：把「历代遗章 + 已解锁存档槽」打包，兼容旧版三个槽。
  function readSaveCode(code){return SaveCodec.read(code,validSave);}
  function inspectCode(code) {
    const parsed=readSaveCode(code);if(!parsed.ok)return parsed;
    const d=parsed.data;return {ok:true,currentGame:!!d.save,day:d.save?.day||0,difficulty:d.save?.difficulty||'',
      version:d.t||'',checked:d.checksum!==undefined,soul:d.meta.soul||0,slots:(d.meta.slots||[]).filter(Boolean).length};
  }
  function exportCode() {
    try {
      if (!M) metaLoad();
      const current = S ? JSON.parse(JSON.stringify(S)) : JSON.parse(localStorage.getItem('guyuyizhang_save') || 'null');
      if (current) { delete current._snap; delete current._dirty; delete current._savedAt; }
      const payload = { v: 1, t: (typeof window !== 'undefined' && window.BUILD_VER) || '', meta: M, save:current };
      return SaveCodec.encode(payload);
    } catch (e) { return ''; }
  }
  function importCode(code) {
    try {
      const parsed=readSaveCode(code);if(!parsed.ok)return parsed;
      const data=parsed.data;
      const nextS = data.save || (S ? JSON.parse(JSON.stringify(S)) : null);
      const nextM = JSON.parse(JSON.stringify(data.meta));
      // 导入旧三槽码时保留本机已付费解锁的第四槽及其内容，避免降级吞档。
      const localM = metaState();
      preserveMetaGrowth(nextM,localM);
      mergeLotteryHistory(nextM,localM);
      if (localM.extraSlotUnlocked || (localM.slots || []).length >= 4) {
        nextM.extraSlotUnlocked = 1;
        if (!Array.isArray(nextM.slots)) nextM.slots = [null, null, null];
        if (nextM.slots.length === 3) {
          nextM.slots.push((localM.slots || [])[3] || null);
          // 旧三槽码拍于购买之前；保留付费槽时不可顺便退回购买前的魂点余额。
          nextM.soul = Math.min(Number(nextM.soul) || 0, Number(localM.soul) || 0);
        }
      }
      // 导入旧导出码可以恢复进度，但不能抹掉本机已经结算的局 ID。
      nextM.settledRuns = Object.assign({}, metaState().settledRuns || {}, nextM.settledRuns || {});
      if (metaState().legacyRunId && !nextM.legacyRunId) nextM.legacyRunId = metaState().legacyRunId;
      rememberSettledRun(S, nextM);
      if (nextS) ensureRunId(nextS, nextM);
      const result = persistPair(nextS, nextM, !!nextS);
      if (!result.ok) return result;
      metaLoad();
      return { ok: true, currentGame:!!data.save, soul: M.soul || 0, runs: M.runs || 0, slots: (M.slots || []).filter(Boolean).length };
    } catch (e) { return { ok: false, reason: '存档码无法解析（可能复制不完整）' }; }
  }
  function redeemCode(code) {
    const m = metaState(); const c = (code || '').trim().toUpperCase();
    if (!c) return { ok:false, reason:'请输入兑换码' };
    if (/^GY-[A-F0-9]{32}$/.test(c)) return redeemOnlineCode(c);
    if (!REDEEM_CODES[c]) return { ok:false, reason:'兑换码无效' };
    if (REDEEM_CODES[c].retired) return {ok:false,reason:'该兑换活动已结束'};
    if (m.redeemed[c]) return { ok:false, reason:'这个兑换码你已经用过了' };
    const g = REDEEM_CODES[c];
    // 传奇难度：不给物资（和邮箱领取同一道门槛）。
    // ⚠️ 这里**不消耗兑换码**——换低难度还能兑，不惩罚玩家。
    if (S && S.difficulty === 'legend' && (g.soul || g.item || g.relic || (g.mails && g.mails.length))) {
      return { ok:false, reason:'传奇模式下不能兑换物资（物品 / 神物 / 魂点）。兑换码没有消耗掉——换一个低难度开局再来兑换。', legendBlock:true };
    }
    const meta=JSON.parse(JSON.stringify(m));
    (g.mails || [g]).forEach((gift,i)=>meta.mailbox.push({ soul:gift.soul || 0, ...(gift.adCoins ? {adCoins:gift.adCoins} : {}), item:gift.item || null, qty:gift.qty || 1, relic:gift.relic || null, code:c, shopReceipt:`redeem:${c}:${i}` }));
    meta.redeemed[c]=1;
    const result=persistPair(S,meta,false);if(!result.ok)return result;
    return { ok:true, msg: g.adCoins ? `兑换成功：${g.soul || 0} 魂点 + ${g.adCoins} 星之点已放入邮箱。` : g.mails ? '兑换成功：魂点和命名牌已分别放入邮箱。' : g.relic ? `获得神物【${RELICS[g.relic].name}】（已存入邮箱）`
      : (g.item ? `获得 ${ITEMS[g.item].name}×${g.qty || 1}（已存入邮箱）` : `获得 ${g.soul} 魂点（已存入邮箱）`) };
  }
  const remoteRedeemBusy = new Set();
  async function redeemOnlineCode(code) {
    if (remoteRedeemBusy.has(code)) return {ok:false,reason:'正在兑换，请稍候'};
    if (metaState().redeemed[code]) return {ok:false,reason:'这个兑换码你已经用过了'};
    if (S && S.difficulty === 'legend') return {ok:false,reason:'传奇模式下不能兑换物资，兑换码没有消耗',legendBlock:true};
    remoteRedeemBusy.add(code);
    try {
      let owner = (metaState().remoteRedeemOwners || {})[code];
      if (!owner) {
        if (!window.crypto || !window.crypto.getRandomValues) return {ok:false,reason:'当前环境不支持安全兑换，请更新浏览器'};
        const bytes = new Uint8Array(32); window.crypto.getRandomValues(bytes);
        owner = Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
        const next = JSON.parse(JSON.stringify(metaState()));
        next.remoteRedeemOwners = next.remoteRedeemOwners || {};
        next.remoteRedeemOwners[code] = owner;
        const saved = persistPair(S,next,false); if (!saved.ok) return saved;
      }
      const url = 'https://redeem.guyuyizhang.top:8443/v1/redeem';
      const reply = await new Promise((resolve,reject)=>{
        let finished = false, controller;
        const done = (error,value) => { if (finished) return; finished=true; clearTimeout(timer); error?reject(error):resolve(value); };
        const timer = setTimeout(()=>{done(Error('timeout'));controller?.abort();},15000);
        if (typeof window.fetch === 'function') {
          controller = window.AbortController ? new window.AbortController() : null;
          window.fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,owner}),credentials:'omit',signal:controller?.signal})
            .then(async r=>done(null,{status:r.status,data:await r.json()})).catch(e=>done(e));
        } else done(Error('unsupported'));
      });
      const data = reply.data;
      if (reply.status !== 200 || !data || !data.ok) return {ok:false,reason:reply.status===429?'操作太频繁，请稍后再试':(data && typeof data.reason==='string'?data.reason:'兑换服务暂不可用，请稍后重试')};
      const gift = data.gift || {};
      if (!/^remote:[a-f0-9]{32}$/.test(data.receipt) || !Number.isInteger(gift.soul) || !Number.isInteger(gift.adCoins) || gift.soul<0 || gift.soul>1000000 || gift.adCoins<0 || gift.adCoins>100000 || gift.soul+gift.adCoins===0) return {ok:false,reason:'兑换服务返回异常，请保留兑换码并重试'};
      const meta = JSON.parse(JSON.stringify(metaState()));
      // A lost reply/local write can be retried; receipt-based delivery stays exactly once.
      if (!(meta.adDelivered || {})[data.receipt] && !meta.mailbox.some(x=>x.shopReceipt===data.receipt)) meta.mailbox.push({soul:gift.soul,adCoins:gift.adCoins,qty:1,code,shopReceipt:data.receipt});
      meta.redeemed[code]=1;
      const result = persistPair(S,meta,false);
      if (!result.ok) return {ok:false,reason:'奖励暂未保存，请保留兑换码并重试；不会再次消耗兑换码'};
      return {ok:true,msg:`兑换成功：${gift.soul} 魂点 + ${gift.adCoins} 星之点已放入邮箱。`};
    } catch (_) {
      return {ok:false,reason:'连接兑换服务失败，请保留兑换码并稍后重试'};
    } finally { remoteRedeemBusy.delete(code); }
  }
  // ---------- 神弓：可持有多把，每次存入一把，逐件保留耐久 ----------
  function hasDivineBowAnywhere() {
    if (S && S.inv && (S.inv.divineBow || 0) > 0) return true;
    const m=metaState();
    return hasMailboxDivineBow() || (m.slots || []).some(sl=>sl && sl.data && sl.data.inv && sl.data.inv.divineBow > 0);
  }
  function hasMailboxDivineBow() {
    const m = metaState();
    return !!((m.mailbox || []).some(x => x && x.item === 'divineBow'));
  }
  // 存入邮箱：**当前局立刻失去这把弓**（不是复制），否则等于无中生有
  function updateMailCheckpoint(state, item, qty, relic, durability) {
    const cp = state && state.dawnCheckpoint && state.dawnCheckpoint.state;
    if (!cp || !cp.inv || typeof cp.inv !== 'object' || cp.day !== state.day) return;
    if (relic) { cp.relics = cp.relics || []; if (!cp.relics.includes(relic)) cp.relics.push(relic); }
    if (item) {
      cp.inv[item] = Math.max(0, (cp.inv[item] || 0) + qty);
      if (!cp.inv[item]) {
        delete cp.inv[item]; if(cp.toolDurs) delete cp.toolDurs[item]; if(cp.dur) delete cp.dur[item];
        if(cp.equipment) for(const slot of Object.keys(cp.equipment)) if(cp.equipment[slot] === item) cp.equipment[slot] = null;
      } else if (DURA[item] !== undefined) {
        cp.toolDurs = cp.toolDurs || {}; cp.toolDurs[item] = (state.toolDurs[item] || []).slice();
        cp.dur = cp.dur || {}; cp.dur[item] = cp.toolDurs[item].length ? Math.min(...cp.toolDurs[item]) : (durability === undefined ? DURA[item] : durability);
      }
    }
    state._snap = state._snap || {}; state._snap.day = JSON.parse(JSON.stringify(cp));
  }
  function storeDivineBow() {
    if (!S || !S.inv || !(S.inv.divineBow > 0)) return {ok:false,reason:'你身上没有神弓。'};
    const next = JSON.parse(JSON.stringify(S)), meta = JSON.parse(JSON.stringify(metaState()));
    const dur = next.toolDurs && next.toolDurs.divineBow ? next.toolDurs.divineBow[0] : DURA.divineBow;
    next.inv.divineBow--;
    if (next.toolDurs && next.toolDurs.divineBow) next.toolDurs.divineBow.splice(0,1);
    if (next.toolMaxDurs && next.toolMaxDurs.divineBow) next.toolMaxDurs.divineBow.splice(0,1);
    if (!next.inv.divineBow) { delete next.inv.divineBow; delete next.toolDurs.divineBow; delete next.dur.divineBow; }
    else next.dur.divineBow = Math.min(...next.toolDurs.divineBow);
    for (const slot of ['weapon','weapon2']) if (next.equipment[slot] === 'divineBow') {
      const idx = (next.equipIdx || {})[slot] || 0;
      if (idx === 0) next.equipment[slot] = null;
      else next.equipIdx[slot] = idx - 1;
    }
    updateMailCheckpoint(next,'divineBow',-1);
    meta.mailbox.push({item:'divineBow',qty:1,divineBow:true,dur,title:'限定 · 神弓',date:''});
    const result = persistPair(next,meta,false);
    if(!result.ok) return result;
    log(`你把神弓收进邮箱（剩余耐久 ${dur}）——它会在下一局等你。`, 'good');change();
    return {ok:true,dur};
  }
  // 内置更新公告：只有 approved 的才进邮箱，每个版本只发一次
  function syncPatchNotes() {
    const m = metaState();
    const keep=(m.mailbox || []).filter(x=>!x.notice || !/^v1\.(?:0?[0-9])(?:\D|$)/.test(String(x.notice)));
    if(keep.length!==(m.mailbox || []).length) { m.mailbox=keep;metaSave(); }
    if (typeof PATCH_NOTES === 'undefined' || !PATCH_NOTES || !PATCH_NOTES.length) return;
    m.patchSent = m.patchSent || {};
    let changed = false;
    for (const n of PATCH_NOTES) {
      if (!n || !n.approved || m.patchSent[n.version]) continue;
      m.mailbox = m.mailbox || [];
      // ⚠️ 公告正文在 data.js 里是按行写的数组；邮件里统一存成"带换行的纯文本"，
      //    否则界面那边 String(数组) 会变成用逗号拼成一整行（v1.06 那条公告就一直是这个毛病）。
      const bodyText = Array.isArray(n.body) ? n.body.join('\n') : (n.body || '');
      m.mailbox.push({ notice: n.version, title: n.title || (n.version + ' 更新公告'), body: bodyText, date: n.date || '' });
      m.patchSent[n.version] = 1;
      changed = true;
    }
    if (changed) metaSave();
  }
  function mailboxList() {
    syncPatchNotes();
    return (metaState().mailbox || []).map((x,i) => ({ i, soul: x.soul || 0, adCoins:x.adCoins || 0, item: x.item || null, qty: x.qty || 1,
      divineBow: x.divineBow || false, dur: x.dur,      // 神弓：把耐久透出来，UI 才能显示"剩余耐久 N"
      relic: x.relic || null, notice: x.notice || null, title: x.title || '', body: x.body || '', date: x.date || '' }));
  }
  // 传奇难度不能靠邮箱白拿物资（物品 / 神物 / 魂点都算）——否则难度机制直接被抹平。
  // 公告（纯文本）不受影响，照常能读。
  // ⚠️ 只"拒绝领取"，**不消耗邮件**：留在邮箱里，换低难度还能领，不惩罚玩家。
  function mailIsSupply(g) { return !!(g && !g.notice && (g.item || g.relic || g.soul || g.adCoins)); }
  function claimMailbox(i) {
    const m=metaState(), g=(m.mailbox || [])[i];
    if(!g) return {ok:false,reason:'该邮件不存在'};
    if(S && S.difficulty === 'legend' && mailIsSupply(g)) return {ok:false,reason:'传奇模式下不能领取物资邮件，邮件会保留。',legendBlock:true};
    if((g.item || g.relic) && (!S || S.death || S.ending)) return {ok:false,reason:'请先进入一局存活的游戏再领取，邮件会保留。'};
    if(g.item && (!ITEMS[g.item] || !fitsInBag({[g.item]:g.qty || 1}))) return {ok:false,reason:'背包装不下，邮件已保留。'};
    if(g.relic && g.shopReceipt && (S.relics || []).includes(g.relic)) return {ok:false,reason:'本局已拥有该神物，邮件会保留供其他局领取。'};
    const oldS=S, oldM=M;
    let next=S ? JSON.parse(JSON.stringify(S)) : null, meta=JSON.parse(JSON.stringify(m));
    S=next; M=meta; staging=true;
    try {
      if(g.relic) { next.relics=next.relics || [];if(!next.relics.includes(g.relic)) next.relics.push(g.relic); }
      if(g.soul) meta.soul += g.soul;
      if(g.adCoins)walletEntry(meta,g.shopReceipt || walletId(),g.adCoins);
      if(g.item) {
        if(!addItem(g.item,g.qty || 1,true)) return {ok:false,reason:'背包装不下，邮件已保留。'};
        if(g.divineBow && g.dur !== undefined) { next.toolDurs.divineBow[next.toolDurs.divineBow.length-1]=g.dur;next.dur.divineBow=Math.min(...next.toolDurs.divineBow); }
      }
      if(next) updateMailCheckpoint(next,g.item,g.qty || 1,g.relic,g.dur);
      meta.mailbox.splice(i,1);
      if (g.shopReceipt) { meta.adDelivered = meta.adDelivered || {}; meta.adDelivered[g.shopReceipt] = 1; }
    } finally { S=oldS;M=oldM;staging=false; }
    const result=persistPair(next,meta,false);if(!result.ok)return result;
    if(S) change();
    return {ok:true,msg:g.notice ? '公告已读' : g.adCoins ? `领取了 ${g.soul || 0} 魂点 + ${g.adCoins} 星之点` : g.relic ? `领取了神物【${RELICS[g.relic].name}】` : g.item ? `领取了 ${ITEMS[g.item].name}×${g.qty||1}` : `领取了 ${g.soul} 魂点`};
  }
  function mailboxCount() { return (metaState().mailbox || []).length; }
  function metaState() { if (!M) metaLoad(); return M; }
  // 海底遗物交换机：位置和抽奖序列由局号、日期及账号级序号决定。
  // 进度放在账号档，读取较早的本局备份也不会倒退投入/每日次数或重抽同一结果。
  const LOTTERY_ZONES = ['city','coral','shipwreck','coralForest','pearlCave','trench'];
  // 读旧导出码/云档也保留较新的抽取序号；不能用 max(pity)，因为出奖会清零。
  // 旧兑换邮件补上稳定收据；旧档中已兑换但不再待领的分项视为已领取，防止回读复制。
  function migrateRedeemReceipts(meta) {
    meta.adDelivered=meta.adDelivered || {};
    const pending=new Set();
    for(const mail of (meta.mailbox || [])) {
      const code=String(mail.code || '').toUpperCase(),entry=REDEEM_CODES[code];
      if(!entry)continue;
      const gifts=entry.mails || [entry];
      const i=gifts.findIndex(g=>(g.item || null)===(mail.item || null)&&(g.relic || null)===(mail.relic || null)&&(g.soul || 0)===(mail.soul || 0)&&(g.adCoins || 0)===(mail.adCoins || 0)&&(g.qty || 1)===(mail.qty || 1));
      if(i<0)continue;
      mail.shopReceipt=mail.shopReceipt || `redeem:${code}:${i}`;
      pending.add(mail.shopReceipt);
    }
    for(const code of Object.keys(meta.redeemed || {})) {
      if(!meta.redeemed[code] || !REDEEM_CODES[code])continue;
      (REDEEM_CODES[code].mails || [REDEEM_CODES[code]]).forEach((g,i)=>{
        const key=`redeem:${code}:${i}`;
        if(!pending.has(key))meta.adDelivered[key]=1;
      });
    }
  }
  function mergeLotteryHistory(target,local) {
    target.challengeUnlocked = !!(target.challengeUnlocked || local.challengeUnlocked);
    target.nightmareRuns=target.nightmareRuns || {};
    for(const [id,track] of Object.entries(local.nightmareRuns || {})) {
      const prev=target.nightmareRuns[id];
      if(!prev)target.nightmareRuns[id]=JSON.parse(JSON.stringify(track));
      else {prev.consumed=Math.max(prev.consumed||0,track.consumed||0);prev.sequence=Math.max(prev.sequence||prev.consumed,track.sequence||track.consumed||0);prev.consumedByTier=prev.consumedByTier||{};for(const [tier,n]of Object.entries(track.consumedByTier||{}))prev.consumedByTier[tier]=Math.max(prev.consumedByTier[tier]||0,n);}
    }
    migrateRedeemReceipts(target);migrateRedeemReceipts(local);
    for (const [id,entry] of Object.entries(local.adWallet || {})) if (!(target.adWallet || {})[id] && entry.soul) target.soul = (target.soul || 0) + entry.soul;
    target.soul = Math.max(0, target.soul || 0);
    target.adWallet = Object.assign({}, target.adWallet || {}, local.adWallet || {});
    target.adDelivered = Object.assign({}, target.adDelivered || {}, local.adDelivered || {});
    const mail = target.mailbox || (target.mailbox = []);
    for (const gift of (local.mailbox || [])) if (gift.shopReceipt && !target.adDelivered[gift.shopReceipt] && !mail.some(x=>x.shopReceipt===gift.shopReceipt)) mail.push(JSON.parse(JSON.stringify(gift)));
    target.mailbox = mail.filter(x=>!x.shopReceipt || !target.adDelivered[x.shopReceipt]);
    target.adRewardDays = target.adRewardDays || {};
    for (const [day, uses] of Object.entries(local.adRewardDays || {})) {
      target.adRewardDays[day] = Math.max(Number(target.adRewardDays[day]) || 0, Number(uses) || 0);
    }
    target.lotteryRuns=target.lotteryRuns || {};
    for(const [id,track] of Object.entries(local.lotteryRuns || {})) {
      const incoming=target.lotteryRuns[id];
      if(!incoming || Math.max(track.revision || 0,track.nonce || 0)>=Math.max(incoming.revision || 0,incoming.nonce || 0)) target.lotteryRuns[id]=JSON.parse(JSON.stringify(track));
    }
    target.lotteryBowAwarded=target.lotteryBowAwarded || local.lotteryBowAwarded || 0;
    target.redeemed=Object.assign({},target.redeemed || {},local.redeemed || {});
    target.remoteRedeemOwners=Object.assign({},target.remoteRedeemOwners || {},local.remoteRedeemOwners || {});
  }
  function lotteryHash(value) {
    let h = 2166136261;
    for (const ch of String(value)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function lotteryAccount(m, create) {
    if (!S) return null;
    const all = m.lotteryRuns || (create ? (m.lotteryRuns = {}) : {});
    const key = S._runId || `legacy-${S.identity}-${S.day}`;
    if (create && !all[key]) all[key] = {meter:0,nonce:0,lastDay:0,uses:0,bow:0,relic:0};
    return all[key] || {meter:0,nonce:0,lastDay:0,uses:0,bow:0,relic:0};
  }
  function lotteryValue(id) {
    const it = ITEMS[id]; if (!it) return 0;
    if (id === 'beibi') return 1;
    if (id === 'coin') return 50;
    if (Number(it.price) > 0) return Math.min(500, Math.max(1, Math.round(it.price)));
    const base = {food:12,drink:10,med:35,mat:12,special:45,seed:15,
      tool:75,weapon:110,armor:120,cloth:90,accessory:90,bp:150,currency:1};
    return base[it.cat] || 12;
  }
  function lotteryChance() { return 0.10; }
  const LOTTERY_COST = 100, LOTTERY_PITY_DRAWS = 10;
  const LOTTERY_DAILY_LIMIT = 200, LOTTERY_BATCH_LIMIT = 50;
  const LOTTERY_POOLS = [
    {id:'common',name:'普通',weight:70,items:['wood','honey','adCoins']},
    {id:'rare',name:'稀有',weight:25,items:['lotusPill','tideVitalPill','abyssBreathPill','bpBlack','bpLotus','bpDive','bpCoralBlade','bpPistol']},
    {id:'epic',name:'史诗',weight:5,items:['vampire','dodge','satchel','bloodvest','divineBow']}
  ];
  function lotteryPools() { return LOTTERY_POOLS.map(p=>({...p,items:p.items.slice()})); }
  // 独立用途的混合序列；结果与账号抽取序号绑定，读旧档不能重抽。
  function lotteryRandom(run, nonce, label) {
    let h=lotteryHash(`${run}:${nonce}:v2:${label}`);
    h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;
    return (h>>>0)/4294967296;
  }
  function lotteryBalance(a) { return Math.max(0,Math.floor(Number(a.credit === undefined ? a.meter : a.credit) || 0)); }
  // 账号投入累计与局内已扣累计对齐，旧码/备份不能同时恢复物品并保留充能。
  function reconcileLotteryInputs() {
    if (!S) return false;
    const consumed=lotteryAccount(metaState(),false).consumed;
    if (!consumed || typeof consumed!=='object') return false;
    S.lottery=S.lottery || {};
    const paid=S.lottery.consumed=S.lottery.consumed || {};
    let outstanding=false;
    for (const [id,total] of Object.entries(consumed)) {
      if (!ITEMS[id] || !Number.isSafeInteger(total) || total<0) continue;
      const already=Math.max(0,Math.floor(Number(paid[id]) || 0)), owed=Math.max(0,total-already);
      const take=Math.min(owed,invCount(id));
      if (take && removeItem(id,take)) {
        paid[id]=already+take;
        if(!invCount(id) && S.equipment)for(const slot of Object.keys(S.equipment))if(S.equipment[slot]===id)S.equipment[slot]=null;
        syncToolkit();
      }
      if (owed>take) outstanding=true;
    }
    return outstanding;
  }
  function lotteryState() {
    if (!S || S.scene !== 'atlantis') return {active:false};
    const roll=lotteryHash(`${S._runId || 'old'}:${S.day}:machine`), a=lotteryAccount(metaState(),false);
    return {active:roll%10<7,zone:LOTTERY_ZONES[roll%LOTTERY_ZONES.length],
      credit:lotteryBalance(a),misses:Math.max(0,Math.min(9,Number(a.misses) || 0)),
      meter:a.meter || 0,pity:a.pity || 0,
      uses:a.lastDay>S.day ? LOTTERY_DAILY_LIMIT : a.lastDay===S.day ? a.uses || 0 : 0,
      cost:LOTTERY_COST,pityLimit:LOTTERY_PITY_DRAWS,limit:LOTTERY_DAILY_LIMIT,batchLimit:LOTTERY_BATCH_LIMIT,baseChance:0.10};
  }
  function lotteryOffer(id, qty, times=1) {
    times=Number(times);
    if (!Number.isSafeInteger(times) || times<1 || times>LOTTERY_BATCH_LIMIT) return {ok:false,reason:'每批请选择 1～50 抽。'};
    return lotteryPut(id,qty,times);
  }
  function lotteryDeposit(id, qty) { return lotteryPut(id,qty,0); }
  function lotteryPut(id, qty, times) {
    qty=Number(qty);
    if (!ITEMS[id] || !Number.isSafeInteger(qty) || qty<1 || !hasItem(id,qty)) return {ok:false,reason:'请选择有效的投入数量。'};
    const value=lotteryValue(id)*qty;
    if (!Number.isSafeInteger(value)) return {ok:false,reason:'投入数量过大。'};
    return lotteryTransact(id,qty,value,times);
  }
  function lotteryDraw(times=1) { return lotteryTransact(null,0,0,Number(times)); }
  function lotteryTransact(id,qty,value,times) {
    const info=lotteryState();
    if (!S || !info.active || S.zone!==info.zone) return {ok:false,reason:'交换机现在不在这里。'};
    if (!Number.isSafeInteger(times) || times<0 || (!id && times===0) || times>LOTTERY_BATCH_LIMIT) return {ok:false,reason:'每批请选择 1～50 抽。'};
    if (times>0 && info.uses>=LOTTERY_DAILY_LIMIT) return {ok:false,reason:'今天已抽满 200 次，剩余价值保留到以后。'};
    const credit=info.credit+value;
    if (!Number.isSafeInteger(credit)) return {ok:false,reason:'累计价值过大。'};
    const draws=Math.min(times,Math.floor(credit/LOTTERY_COST),LOTTERY_DAILY_LIMIT-info.uses);
    if (!id && !draws) return {ok:false,reason:'累计价值不足 100，请先投入物品。'};
    const oldS=S,oldM=M,next=JSON.parse(JSON.stringify(S)),meta=JSON.parse(JSON.stringify(metaState())),rewards=[];
    S=next;M=meta;staging=true;
    try {
      const track=lotteryAccount(meta,true);
      const outstanding=reconcileLotteryInputs();
      if(id && outstanding) throw new Error('旧档中有尚未补足的已投入物品，请先补齐后再充能。');
      track.credit=credit;track.misses=info.misses;track.lastDay=oldS.day;track.uses=info.uses;
      track.revision=Math.max(track.revision || 0,track.nonce || 0)+1;
      if (id && !removeItem(id,qty)) throw new Error('投入失败，物品没有扣除。');
      if(id) {
        track.consumed=track.consumed || {};
        track.consumed[id]=(track.consumed[id] || 0)+qty;
        next.lottery=next.lottery || {};
        next.lottery.consumed=next.lottery.consumed || {};
        next.lottery.consumed[id]=(next.lottery.consumed[id] || 0)+qty;
      }
      for(let draw=0;draw<draws;draw++) {
        const nonce=(track.nonce || 0)+1,guaranteed=track.misses>=9;
        const won=guaranteed || lotteryRandom(oldS._runId,nonce,'result')<0.10;
        track.nonce=nonce;track.credit-=LOTTERY_COST;track.uses++;
        if (!won) {track.misses++;continue;}
        track.misses=0;
        const roll=lotteryRandom(oldS._runId,nonce,'pool'),pool=LOTTERY_POOLS[roll<0.70?0:roll<0.95?1:2];
        const key=pool.items[Math.floor(lotteryRandom(oldS._runId,nonce,'item')*pool.items.length)];
        const reward={tier:pool.id,pity:guaranteed};
        if (key==='adCoins') {
          reward.adCoins=2+Math.floor(lotteryRandom(oldS._runId,nonce,'quantity')*2);
          walletEntry(meta,`lottery:${oldS._runId}:${nonce}`,reward.adCoins);
        } else if (RELICS[key]) {
          reward.relic=key;next.relics=next.relics || [];
          if(next.relics.includes(key)) {
            reward.mailed=true;
            meta.mailbox.push({relic:key,qty:1,title:'遗海抽奖',date:todayKey(),shopReceipt:`lottery-relic:${oldS._runId}:${nonce}`});
          } else { next.relics.push(key);updateMailCheckpoint(next,null,0,key); }
        } else {
          reward.item=key;
          reward.qty=key==='wood'?5+Math.floor(lotteryRandom(oldS._runId,nonce,'quantity')*6):key==='honey'?1+Math.floor(lotteryRandom(oldS._runId,nonce,'quantity')*2):1;
          if(!addItem(key,reward.qty,true))throw new Error('背包放不下奖品，本次操作已取消。');
        }
        rewards.push(reward);
      }
      if(id && !next.inv[id] && next.equipment)for(const slot of Object.keys(next.equipment))if(next.equipment[slot]===id)next.equipment[slot]=null;
      // 旧 meter/pity 字段保持原义；新玩法只使用 credit/misses。
      next.lottery=Object.assign({},next.lottery || {},{credit:track.credit,misses:track.misses,day:track.lastDay,uses:track.uses});
    } catch(e) {return {ok:false,reason:e.message};}
    finally {S=oldS;M=oldM;staging=false;}
    const result=persistPair(next,meta,false);if(!result.ok)return result;
    const text=rewards.map(r=>r.adCoins?`星之点×${r.adCoins}`:r.relic?RELICS[r.relic].name+(r.mailed?'（已存邮箱）':''):`${ITEMS[r.item].name}×${r.qty}`).join('、');
    const msg=!draws?`存入 ${value} 价值，当前余额 ${credit}；满 100 即可抽奖。`:
      `抽了 ${draws} 次，${rewards.length?`中奖 ${rewards.length} 次：${text}`:'本次未中奖'}。剩余 ${lotteryState().credit} 价值。`;
    log(msg,rewards.length?'good':'sys');change();
    return {ok:true,reward:rewards[0] || null,rewards,msg,value,times:draws,deposited:qty,chance:info.misses>=9?1:0.10};
  }
  // 账号级一次性提示（首次交易/制作批量说明）：只新增 M.batchTipSeen 字段，旧元存档无此字段天然兼容。
  function batchTipSeen() { return !!(metaState().batchTipSeen); }
  function markBatchTipSeen() { metaState().batchTipSeen = 1; metaSave(); }
  // ---------- 成就 ----------
  function achState() { const m = metaState(); if (!m.ach) m.ach = {}; return m.ach; }
  function achUnlocked(id) { return !!achState()[id]; }
  // 攻击连续落空计数：3 次紫、4 次金、6 次红（命中即清零）
  function noteMissStreak() {
    S.missStreak = (S.missStreak || 0) + 1;
    if (S.missStreak >= 3) achUnlock('humanDraw');
    if (S.missStreak >= 4) achUnlock('drawDragon');
    if (S.missStreak >= 6) achUnlock('neverHurt');
    return S.missStreak;
  }
  function achUnlock(id) {
    const a = ACHIEVEMENTS[id];
    if (!a || achUnlocked(id)) return false;
    achState()[id] = 'unlocked';
    metaSave();
    log(`【成就】${a.name}（${a.tier}）达成，可在图鉴领取 ${a.reward} 魂点。`, 'good');
    return true;
  }
  function achCheck() {
    if (!S || typeof ACHIEVEMENTS === 'undefined') return;
    const c = S.killCount || {};
    const tests = {
      initCraft:  () => (S.craftCount || 0) >= 10,
      initGather: () => (S.gatherCount || 0) >= 30,
      initKill:   () => Object.keys(c).reduce((a,k)=>a+(c[k]||0),0) >= 8,
      firstNight: () => S.day >= 5,
      craftLv3:   () => S.skill.craft >= 3,
      gather50:   () => (S.gatherCount || 0) >= 50,
      bossFirst:  () => Object.keys(c).some(k => ENEMIES[k] && ENEMIES[k].boss),
      stoneWall:  () => (S.buildings.wall || 0) >= 3,
      raftBuilt:  () => (S.buildings.dock || 0) >= 2,
      allBoss:    () => Object.keys(ENEMIES).filter(k => ENEMIES[k].boss && !ENEMIES[k].nightmare).every(k => (c[k] || 0) > 0),
      endA:       () => S.ending === 'A' || !!(S.flags && S.flags.ended_A),   // 结算状态会被"继续游戏"清掉，所以也认持久标记
      survive100: () => S.day >= 100,
      relicAll:   () => Object.keys(RELICS).every(id => (S.relics || []).includes(id)),
    };
    for (const id in tests) if (!achUnlocked(id) && tests[id]()) achUnlock(id);
  }
  function achClaim(id) {
    const a = ACHIEVEMENTS[id];
    const s = achState();
    if (!a || s[id] !== 'unlocked') return { ok:false, reason:'该成就尚未达成。' };
    s[id] = 'claimed';
    metaState().soul += a.reward;
    metaSave();
    log(`领取了成就「${a.name}」的 ${a.reward} 魂点。`, 'good');
    return { ok:true, reward: a.reward };
  }
  function metaNum(id) { return (metaState().nodes[id] || 0); }
  function metaAllowed() { return S && (S.difficulty === 'easy' || S.difficulty === 'normal' || S.difficulty === 'hard' || S.difficulty === 'nightmare' || S.difficulty === 'dev'); }
  function metaBonus() {
    const b = { stamina:0, cons:0, craft:0, travel:0, luck:0, bag:0, atk:0, armor:0, kit:0, startG:0, startC:0, startF:0 };
    if (!metaAllowed()) return b;
    b.stamina = [0,5,10,15][metaNum('vital')];
    b.cons = [0,0.05,0.08,0.12][metaNum('feast')];
    b.craft = [0,0.05,0.10,0.15][metaNum('hands')];
    b.travel = [0,0.05,0.10,0.15][metaNum('stride')];
    b.luck = [0,0.05,0.10,0.15][metaNum('luck')];
    b.bag = [0,5,10,15][metaNum('pack')];
    b.atk = [0,0.03,0.06,0.10][metaNum('whet')];
    b.armor = [0,0.05,0.10,0.15][metaNum('tough')];
    b.kit = metaNum('kit');
    // 《历代遗章》新增：各技能模块的开局初始经验（技能经验本身不跨局）
    b.startG = [0,30,60,100][metaNum('startG')];
    b.startC = [0,30,60,100][metaNum('startC')];
    b.startF = [0,30,60,100][metaNum('startF')];
    return b;
  }
  function metaBuy(id) {
    const meta = metaState();
    const nd = META_NODES.find(n => n.id === id);
    if (!nd) return { ok:false, reason:'未知节点' };
    const lvl = metaNum(id);
    if (lvl >= nd.max) return { ok:false, reason:'已满级' };
    const cost = nd.cost[lvl];
    if (meta.soul < cost) return { ok:false, reason:`魂点不足（需 ${cost} 魂点）` };
    meta.soul -= cost; meta.nodes[id] = lvl + 1; metaSave();
    return { ok:true, cost, level: lvl + 1 };
  }
  let _lastSettle = null;
  let craftBatchConfirmed = false;   // 批量制作"超过 5 小时"的二次确认：确认过这一次就不再拦
  // 统一的"长时间动手"预警（作者 2026-09-19）：批量制作、造家具、建建筑只要预计超过 5 小时，
  // 都先弹一次确认——这段时间饱食和水分一直在掉，已经有人把自己做没了。
  function longActWarn(minutes, what, retry) {
    const total = Math.max(0, Math.round(minutes || 0));
    if (total <= 300 || craftBatchConfirmed) return false;
    const hrs = (total / 60).toFixed(1);
    showOverlay({
      title: '⚠ 这活儿要花很久',
      text: `「${what}」大约要花 ${hrs} 小时——这段时间饱食和水分会一直掉，饿着肚子硬干会出事（已经有人这么做把自己做没了）。\n\n要不要先吃点东西、喝口水再来？`,
      choices: [
        { label:`仍然开工（${hrs} 小时）`, hint:'我知道风险', ok: () => { craftBatchConfirmed = true; try { if (typeof retry === 'function') retry(); } finally { craftBatchConfirmed = false; } } },
        { label:'再想想', hint:'先去吃东西 / 喝水', ok: () => { log('你把材料先放下，打算准备准备再动手。', 'sys'); } },
      ],
    });
    return true;
  }
  function metaLast() { return _lastSettle; }
  function reviveToday() {
    const info = reviveInfo();
    if (!info.ok) { log(info.reason, 'warn'); return info; }
    const next = JSON.parse(JSON.stringify(info.state));
    next._rev = S._rev; next._runId = S._runId; next._fromBackup = S._fromBackup; next._fromBackupSlot = S._fromBackupSlot;
    next.dawnCheckpoint = S.dawnCheckpoint || {version:1,state:JSON.parse(JSON.stringify(info.state))};
    next._snap = {day:JSON.parse(JSON.stringify(info.state))};
    next.combat = null; next.death = undefined; next.ending = undefined;
    next.statuses = {bleed:0,poison:0,cold:false,fear:0}; next.flags = next.flags || {};
    // 已结算状态不能随回溯撤销。
    for (const k in (S.flags || {})) if (k === 'settledEnding' || k.indexOf('settled_') === 0) next.flags[k] = S.flags[k];
    // ⚠️ 数值平衡 P0-1：**活刷魂**。以前这里写 `next.flags.metaSettled = 0;`，
    //    意思是"回溯后可以再结算一次魂点"——于是 50 魂换一次复活、再死一次又能全额结算（100+ 魂），
    //    净赚，可以无限刷。改为**结算状态随档保留**（和上面 settled_* 同样的处理）：
    //    一局只结算一次，复活只是"多一条命"，不是"多一份魂"。
    next.flags.metaSettled = S.flags.metaSettled || 0;
    const meta = JSON.parse(JSON.stringify(metaState())); meta.soul -= 50;
    // 旧日出快照与主档/备份槽走同一迁移，避免复活后退回旧仓库结构或缺少技能字段。
    const result = persistPair(next, meta, true);
    if (!result.ok) return result;
    log('你用 50 魂点换回了今天——从日出重新开始。', 'sys'); change();
    return {ok:true};
  }
  function ensureRunId(state, meta) {
    meta.settledRuns = meta.settledRuns || {};
    // 旧档及其旧备份共用迁移 ID，避免从不同槽反复领取同一局的魂点。
    if (!state._runId) {
      meta.legacyRunId = meta.legacyRunId || ('legacy-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
      state._runId = meta.legacyRunId;
    }
  }
  function legacySlotSettled(meta) {
    return (meta.slots || []).some(sl => sl && sl.settled && sl.data && !sl.data._runId);
  }
  function rememberSettledRun(state, meta) {
    if (!state || !state.flags || !state.flags.metaSettled) return;
    const copy = JSON.parse(JSON.stringify(state));
    ensureRunId(copy, meta);
    meta.settledRuns[copy._runId] = 1;
  }
  function metaSettle() {
    if (!S || !S.flags) return null;
    if (S.flags.metaSettled) {
      const m = JSON.parse(JSON.stringify(metaState()));
      rememberSettledRun(S, m);
      if (!metaState().settledRuns[S._runId || m.legacyRunId]) persistPair(JSON.parse(JSON.stringify(S)), m, false);
      return null;
    }
    const nextS = JSON.parse(JSON.stringify(S));
    const meta = JSON.parse(JSON.stringify(metaState()));
    if(hardCompleted(nextS)) meta.challengeUnlocked=true;
    ensureRunId(nextS, meta);
    if (nextS._runId === meta.legacyRunId && legacySlotSettled(meta)) meta.settledRuns[nextS._runId] = 1;
    nextS.flags.metaSettled = 1;
    if (meta.settledRuns[nextS._runId]) {
      persistPair(nextS, meta, false);
      return null;
    }
    const seenN = S.seen ? Object.keys(S.seen).length : 0;
    const kills = Object.values(S.killCount || {}).reduce((a,b)=>a+b,0) || 0;
    let gain = S.day + seenN + Math.round(kills * 0.5);
    if (S.ending && S.ending !== 'D') gain += 200;
    const diffMul = { easy:0.6, normal:1, hard:1.4, legend:2.2, nightmare:2 }[S.difficulty] || 1;
    gain = Math.max(1, Math.round(gain * diffMul));
    meta.soul += gain; meta.runs++; meta.totalSoul += gain;
    meta.settledRuns[nextS._runId] = 1;
    for (const sl of meta.slots) if (sl && sl.data && (sl.data._runId === nextS._runId || (!sl.data._runId && nextS._runId === meta.legacyRunId))) sl.settled = true;
    if (!persistPair(nextS, meta, false).ok) return null;
    _lastSettle = { gain, soul: meta.soul };
    return _lastSettle;
  }
  recoverPendingWrite();
  metaLoad();


  // ---------- 隐藏：开发者模式（点击"章"×4 → 输入密码解锁） ----------
  function devEnabled() { try { return localStorage.getItem('guyuyizhang_dev') === '1'; } catch(e){ return false; } }
  function unlockDev(pw) {
    if (pw !== '1014679931') return { ok:false, reason:'密码错误' };
    try { localStorage.setItem('guyuyizhang_dev','1'); } catch(e){}
    const meta = metaState();
    if (!meta.devBonus) { meta.soul += 10000; meta.devBonus = 1; metaSave(); }
    return { ok:true, soul: meta.soul };
  }

  function hasRelic(id) { return (S.relicEquip || []).includes(id); }
  function hpMax() { return 100 + (hasRelic('bloodvest') ? 20 : 0) + accessoryStat('hp') + buffV('hp') + 2 * ((S.permUsed && S.permUsed.tideVitalPill) || 0) + trainingHp(); }
  // 神物栏：三格，分别用 1/3/7 远古金币解锁
  function relicSlotCost(i) { return [1,3,7][i] || 0; }
  function unlockRelicSlot() {
    const i = S.relicSlots || 0;
    if (i >= 3) return { ok: false, reason: '三格神物栏已全部开启' };
    const cost = relicSlotCost(i);
    if (invCount('coin') < cost) return { ok: false, reason: `需要 ${cost} 枚远古金币` };
    removeItem('coin', cost);
    S.relicSlots = i + 1;
    change();
    return { ok: true, cost };
  }
  function equipRelic(id) {
    if (!S.relics.includes(id)) return { ok: false, reason: '尚未获得这间神物' };
    if (hasRelic(id)) return { ok: false, reason: '已装备' };
    const unlocked = S.relicSlots || 0;
    const idx = (S.relicEquip || []).slice(0, unlocked).indexOf(null);   // 只在已解锁的格子里找空位
    if (idx < 0) return { ok: false, reason: unlocked >= 3 ? '神物栏已满（三格）' : '神物格尚未开启，先用远古金币解锁' };
    S.relicEquip[idx] = id; change();
    return { ok: true };
  }
  function unequipRelic(id) {
    const idx = (S.relicEquip || []).indexOf(id);
    if (idx >= 0) { S.relicEquip[idx] = null; change(); return { ok: true }; }
    return { ok: false, reason: '未装备' };
  }
  // 睡眠质量系数：按"入睡时刻"算（22-0点睡8h最赚；白天睡大觉打折扣；中午午休最好）
  function sleepQuality(mode) {
    const h = Math.floor(S.minute / 60);
    if (mode === 'nap') { if (h >= 12 && h <= 16) return 1.2; if (h >= 9 && h <= 18) return 1.1; return 0.8; }
    if (h === 22 || h === 23 || h === 0) return 1.20;
    if (h === 21 || h === 1) return 1.15;
    if (h === 20 || h === 2) return 1.12;
    if (h === 19 || h === 3) return 1.0;
    if (h === 18 || h === 4) return 0.9;
    if (h === 17 || h === 5) return 0.85;
    return 0.8;
  }
  function gainRandomRelic() {
    // 注意：判断"有没有"要看已获得（S.relics），不是看已装备，否则会刷出重复神物
    // ⚠️ 和 shrinePool() / 深海售卖机保持同一口径：**亚特兰蒂斯之种不参加随机**
    //    （作者 2026-09-23：之种可从海底神秘鱼人交换或商城购买）。以前这里不排除，任何带 relic:1 的
    //    奇遇都可能把它随机掉出来——石龛改版时顺手把这条口子也堵上。
    const pool = Object.keys(RELICS).filter(id => id !== 'atlantisSeed' && !(S.relics || []).includes(id));
    if (!pool.length) { log('你已集齐所有神物。', 'sys'); return; }
    const id = pool[Math.floor(Math.random() * pool.length)];
    S.relics.push(id);
    log(`你获得了神物【${RELICS[id].name}】——${RELICS[id].desc}`, 'good');
    change();
  }

  // ---------- 深海售卖机（遗失的交易机）：每天随机上架一件神物 ----------
  const RELIC_VENDOR_PRICE = 1200;
  // 作者 2026-09-19：以前这台机器**每天必上架**一件神物，等于稳定白拿；现在改成每天 30% 概率有货
  const VENDOR_RELIC_CHANCE = 0.30;
  function atlVendor() {
    if (!S.atlantis) S.atlantis = { unlocked:0, visited:0, camp:{ furniture:{}, buildings:{} }, quest:0 };
    const v = S.atlantis.vendor;
    if (v && v.rolled && v.day === S.day) return v;          // 同一天不重刷
    // 亚特兰蒂斯之种不进这台机器（走剧情/奇遇路线，属于特殊神物）
    const pool = Object.keys(RELICS).filter(id => id !== 'atlantisSeed' && !(S.relics || []).includes(id));
    const hasStock = pool.length > 0 && chance(VENDOR_RELIC_CHANCE);
    const id = hasStock ? pool[Math.floor(Math.random() * pool.length)] : null;
    S.atlantis.vendor = { day: S.day, id, sold: false, rolled: true, noStock: !hasStock && pool.length > 0 };
    return S.atlantis.vendor;
  }
  function atlVendorInfo() {
    const v = atlVendor();
    const it = v.id ? RELICS[v.id] : null;
    return { id: v.id, name: it ? it.name : '', desc: it ? it.desc : '', glyph: it ? it.glyph : '',
             sold: !!v.sold, price: RELIC_VENDOR_PRICE, day: v.day, noStock: !!v.noStock, chance: VENDOR_RELIC_CHANCE };
  }
  function buyRelicFromVendor() {
    if (S.scene !== 'atlantis') return { ok:false, reason:'这台售卖机只在亚克兰蒂斯运转。' };
    const v = atlVendor();
    if (!v.id) return { ok:false, reason:'你已经集齐所有神物了。' };
    if (v.sold) return { ok:false, reason:'今天上架的神物已经被你买走了，明天再来看看。' };
    if (invCount('beibi') < RELIC_VENDOR_PRICE) return { ok:false, reason:`贝壳币不足（需 ${RELIC_VENDOR_PRICE}）` };
    removeItem('beibi', RELIC_VENDOR_PRICE);
    S.relics.push(v.id);
    v.sold = true;
    log(`售卖机吐出一件神物【${RELICS[v.id].name}】——${RELICS[v.id].desc}`, 'good');
    change();
    return { ok:true, id:v.id };
  }

  // ---------- 备份系统（3 备份槽 + 备份点；防刷魂点） ----------
  // ---------- 每日签到（账号级，每天一次：30 魂点 + 2 备份点） ----------
  // 作者 2026-09-19：每日签到奖励下调为 魂点 ×10 + 备份点 ×1
  const SIGN_SOUL = 10, SIGN_BACKUP = 1;
  function todayKey() {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function dailySignState() {
    const m = metaState();
    const today = todayKey();
    return { canSign: m.lastSign !== today, lastSign: m.lastSign || '', today, soul: SIGN_SOUL, backup: SIGN_BACKUP, total: m.soul || 0, bp: backupPoints() };
  }
  // 星之点为账号钱包，流水合并保留领取与消费，读旧码不能恢复已花余额。
  function walletEntry(meta, id, coins, soul = 0) {
    meta.adWallet = meta.adWallet || {};
    if (!meta.adWallet[id]) meta.adWallet[id] = {coins, soul};
  }
  function adCoinBalance() {
    return Math.max(0, Object.values(metaState().adWallet || {}).reduce((sum,x)=>sum+(Number(x.coins) || 0),0));
  }
  let walletSerial = 0;
  function walletId() { return 'wallet:' + Date.now().toString(36) + ':' + (++walletSerial).toString(36) + ':' + Math.random().toString(36).slice(2); }
  const AD_SHOP = [
    {id:'divineBow',item:'divineBow',cost:15}, {id:'divineArmor',item:'divineArmor',cost:15},
    {id:'divinePack',item:'divinePack',cost:15},
    {id:'namecard',item:'namecard',cost:3},
    {id:'satchel',relic:'satchel',cost:7}, {id:'atlantisSeed',relic:'atlantisSeed',cost:7}
  ];
  function adCurrencyName() {
    const channel=typeof window!=='undefined'&&window.GUYU_CHANNEL;
    const standalone=channel?channel!=='taptap':typeof location!=='undefined'&&location.hostname==='appassets.androidplatform.net';
    return standalone?'星之点':'广告币';
  }
  function adShopState() { return {coins:adCoinBalance(), goods:AD_SHOP.map(x=>({...x}))}; }
  function buyAdShop(id) {
    const goods=AD_SHOP.find(x=>x.id===id);
    if (!goods) return {ok:false,reason:'该商品不存在。'};
    if (adCoinBalance()<goods.cost) return {ok:false,reason:`${adCurrencyName()}不足（需 ${goods.cost}）。`};
    const meta=JSON.parse(JSON.stringify(metaState())), receipt=walletId();
    walletEntry(meta,receipt,-goods.cost);
    meta.mailbox.push({item:goods.item || null,relic:goods.relic || null,qty:1,shopReceipt:receipt,title:'商城购买',date:todayKey()});
    const result=persistPair(S ? JSON.parse(JSON.stringify(S)) : null,meta,false);
    if (!result.ok) return result;
    if (S) change();
    return {ok:true,msg:`${(ITEMS[id] || RELICS[id]).name}已存入邮箱。`};
  }
  function exchangeAdCoins(qty) {
    if (!Number.isSafeInteger(qty) || qty<1 || qty>adCoinBalance() || !Number.isSafeInteger(qty*15) || !Number.isSafeInteger((metaState().soul || 0)+qty*15)) return {ok:false,reason:`请选择有效的${adCurrencyName()}数量。`};
    const meta=JSON.parse(JSON.stringify(metaState()));
    walletEntry(meta,walletId(),-qty,qty*15); meta.soul=(meta.soul || 0)+qty*15;
    const result=persistPair(S ? JSON.parse(JSON.stringify(S)) : null,meta,false);
    if (!result.ok) return result;
    if (S) change();
    return {ok:true,msg:`${qty} ${adCurrencyName()}已兑换 ${qty*15} 魂点。`};
  }
  function exchangeSoulForStars(qty) {
    if (!Number.isSafeInteger(qty) || qty < 1 || !Number.isSafeInteger(qty * 15)) return {ok:false,reason:'请选择有效的兑换数量。'};
    const cost = qty * 15, current = metaState();
    if (!Number.isSafeInteger(current.soul) || current.soul < cost) return {ok:false,reason:`魂点不足（需 ${cost} 魂点）。`};
    const meta = JSON.parse(JSON.stringify(current));
    // Soul debit is part of the existing wallet journal: old exports cannot undo payment.
    walletEntry(meta,walletId(),qty,-cost); meta.soul -= cost;
    const result = persistPair(S ? JSON.parse(JSON.stringify(S)) : null,meta,false);
    if (!result.ok) return result;
    if (S) change();
    return {ok:true,msg:`${cost} 魂点已兑换 ${qty} ${adCurrencyName()}。`};
  }
  function adRewardState() {
    const today = todayKey(), m = metaState();
    const uses = Math.max(0, Math.min(5, Math.floor(Number((m.adRewardDays || {})[today]) || 0)));
    const reason = adCurrencyName() !== '广告币' ? '当前渠道不支持广告奖励。' : !S || S.death || S.ending ? '请在正在进行的游戏中领取。'
      : S.difficulty === 'legend' ? '传奇难度不领取广告物资。' : uses >= 5 ? '今天已领取 5 次，明天再来。' : '';
    return {today, uses, limit:5, min:3, max:6, canClaim:!reason, reason};
  }
  function claimAdReward(runId, requestDay) {
    const info = adRewardState();
    if (!info.canClaim) return {ok:false, reason:info.reason};
    if (S._runId !== runId || info.today !== requestDay) return {ok:false, reason:'游戏或日期已变化，请重新观看后领取。'};
    const next = JSON.parse(JSON.stringify(S)), meta = JSON.parse(JSON.stringify(metaState()));
    const amount=rnd(info.min,info.max);
    meta.adRewardDays = meta.adRewardDays || {};
    meta.adRewardDays[info.today] = info.uses + 1;
    walletEntry(meta,`video:${info.today}:${info.uses+1}`,amount);
    const result = persistPair(next, meta, false);
    if (!result.ok) return result;
    log(`完整观看视频，获得 ${amount} 广告币。`, 'good'); change();
    return {ok:true, amount};
  }
  function dailySign() {
    const m = metaState();
    const today = todayKey();
    if (m.lastSign === today) return { ok:false, reason:'今天已经签到过了，明天再来～' };
    m.lastSign = today;
    m.soul = (m.soul || 0) + SIGN_SOUL;
    m.backupPoints = backupPoints() + SIGN_BACKUP;
    metaSave();
    return { ok:true, soul: SIGN_SOUL, backup: SIGN_BACKUP, total: m.soul, bp: m.backupPoints };
  }
  function backupPoints() { const m = metaState(); return m.backupPoints === undefined ? 3 : m.backupPoints; }
  // ---------- 皮肤包解锁：全彩地图包免费；装备/界面/立绘包 50 魂点，账号级永久 ----------
  const SKIN_COST = 50;
  function skinCost() { return SKIN_COST; }
  function skinOwned(id) {
    if (id === 'ink') return true;                 // 墨白原味永远免费
    const m = metaState();
    if (id === 'seasons') {
      // 全彩地图包永久免费；旧版已解锁的玩家照常保留，无需改动账号或魂点存档。
      return true;
    }
    return !!(m.skins && m.skins[id]);
  }
  function unlockSkin(id) {
    if (!id || id === 'ink' || skinOwned(id)) return { ok:true, already:true, cost:0 };
    const m = metaState();
    if ((m.soul || 0) < SKIN_COST) return { ok:false, reason:`魂点不足（需要 ${SKIN_COST}，现有 ${m.soul || 0}）` };
    m.soul -= SKIN_COST;
    m.skins = m.skins || {};
    m.skins[id] = 1;
    metaSave();
    return { ok:true, cost:SKIN_COST, soul:m.soul };
  }
  const EXTRA_SLOT_COST = 100;
  function extraSlotUnlocked() { const m = metaState(); return !!(m.extraSlotUnlocked || (m.slots || []).length >= 4); }
  function slotList() { const m = metaState(); return Array.from({length:4}, (_, i) => { const s = m.slots && m.slots[i]; return s ? { day:s.day, settled:!!s.settled } : null; }); }
  function buyExtraSlot() {
    const m = metaState();
    if (extraSlotUnlocked()) return {ok:false,reason:'第四存档位已经解锁'};
    if ((m.soul || 0) < EXTRA_SLOT_COST) return {ok:false,reason:`魂点不足（需要 ${EXTRA_SLOT_COST}，现有 ${m.soul || 0}）`};
    const nextM = JSON.parse(JSON.stringify(m));
    nextM.soul -= EXTRA_SLOT_COST;
    nextM.extraSlotUnlocked = 1;
    nextM.slots.push(null);
    const nextS = S ? JSON.parse(JSON.stringify(S)) : null;
    const result = persistPair(nextS, nextM, false);
    return result.ok ? {ok:true,soul:nextM.soul} : result;
  }
  function delSlot(i) {
    if (!Number.isInteger(i) || i < 0 || i > 3 || (i === 3 && !extraSlotUnlocked())) return { ok:false, reason:'无效备份槽' };
    const m = metaState();
    if (!(m.slots || [])[i]) return { ok:false, reason:'这个槽本来就是空的。' };
    m.slots[i] = null; metaSave();
    return { ok:true };
  }
  function buyBackupPoint() {
    const m = metaState();
    if (m.soul < 20) return { ok:false, reason:'魂点不足（需 20 魂点）' };
    m.soul -= 20; m.backupPoints = backupPoints() + 1; metaSave();
    return { ok:true };
  }
  function backupSlot(i) {
    if (!Number.isInteger(i) || i < 0 || i > 3 || (i === 3 && !extraSlotUnlocked())) return {ok:false,reason:'请先用 100 魂点解锁第四存档位'};
    if (!S) return {ok:false,reason:'当前没有进行中的游戏'};
    if (backupPoints() <= 0) return {ok:false,reason:'没有备份点了（可用 20 魂点购买）'};
    const nextM = JSON.parse(JSON.stringify(metaState()));
    const nextS = JSON.parse(JSON.stringify(S));
    ensureRunId(nextS, nextM);
    if (nextS.flags && nextS.flags.metaSettled) nextM.settledRuns[nextS._runId] = 1;
    nextM.backupPoints--;
    nextM.slots[i] = {day:S.day, settled:!!nextM.settledRuns[nextS._runId], data:JSON.parse(JSON.stringify(nextS))};
    nextM.slots[i].data._snap = undefined; nextM.slots[i].data._fromBackup = false;
    const result = persistPair(nextS, nextM, false);
    return result.ok ? {ok:true,day:S.day} : result;
  }
  function loadSlot(i) {
    if (!Number.isInteger(i) || i < 0 || i > 3 || (i === 3 && !extraSlotUnlocked())) return {ok:false,reason:'无效备份槽'};
    const m = metaState();
    const sl = m.slots && m.slots[i];
    if (!sl) return { ok:false, reason:'该槽为空，先从新游戏开始' };
    if (!validSave(sl.data)) return {ok:false, reason:'备份存档不完整，未覆盖当前进度'};
    const data = JSON.parse(JSON.stringify(sl.data));
    const nextM = JSON.parse(JSON.stringify(m));
    rememberSettledRun(S, nextM);
    ensureRunId(data, nextM);
    if (sl.settled) nextM.settledRuns[data._runId] = 1;
    data._fromBackup = true; data._fromBackupSlot = i;
    const result = persistPair(data, nextM, true);
    return result.ok ? {ok:true,day:data.day} : result;
  }
  // 读进来一份 S 之后要做的收尾（load() / loadSlot() / 救援恢复 共用）：
  // ① 补缺失字段（老格式/备份槽里的档可能缺）② 跑技能迁移 ③ 耐久对齐实例数组
  // ④ 对齐存档版本号并【立刻写回主存档】——不然标题页「继续上次游戏」还是上一局，
  //    而且 save() 会以为"另一个标签页有更新进度"拒绝写入（玩家反馈"覆盖不行"）。
  function validSave(data){return migrations.validSave(data);}
  function migrateSaltMeta(meta){return migrations.migrateMeta(meta);}
  function normalizeState(){return migrations.normalize();}

  // 配方材料配比调整（木材 ×0.8 / 其它 ×1.1）：放在模块末尾执行 —— 必须等 RECIPES 与
  // WOOD_MATS 等声明都初始化完；函数内部有幂等保护，重复调用不会二次打折。
  adjustRecipeMats();

  // ---------- 导出 ----------
  return {
    S: () => S, setS: (s) => { S = s; },
    timePass: (m) => { if (S) addMin(m || 1); },
    bind: (o) => { if (o.onLog) onLog = o.onLog; if (o.onChange) onChange = o.onChange; if (o.onFight) onFight = o.onFight; if (o.onEnding) onEnding = o.onEnding; if (o.onOverlay) onOverlay = o.onOverlay; if (o.onSaveFail) onSaveFail = o.onSaveFail; if (o.onSaveConflict) onSaveConflict = o.onSaveConflict; },
    // 存档加固：给刚开的新局/刚读的档一个"当前存档版本号"基线，用来识别"另一个标签页有更新进度"
    saveRev: () => { try { return parseInt(localStorage.getItem('guyuyizhang_rev') || '0', 10) || 0; } catch (e) { return 0; } },
    savedAt: () => { try { return parseInt(localStorage.getItem('guyuyizhang_savedAt') || '0', 10) || 0; } catch (e) { return 0; } },
    forceSave: () => { if (S) { S._rev = 0; try { S._rev = parseInt(localStorage.getItem('guyuyizhang_rev') || '0', 10) || 0; } catch (e) {} } return save(); },
    difficultyUnlocked, nightmareInfo, nightmareEncounter, challengeNightmareBoss, separateSouls, infuseNightmare, nightmareInfusionBonus, loadPenalty, healthValue, pendingLootInfo, collectPending, setFocus, awardExperience, satchelAvailable, satchelEligible, satchelSelections, setSatchelSelections, toggleSatchelSelection, satchelStatus, cellarBuilt, cellarTransferMax, cellarState, cellarAccess, transferCellar, stackSize, itemUseCount, merchantSellCount, warehouseSite, warehouseAccess, warehouseDepositAccess, warehouseDepositCount, warehouseTransferMax, discardItems, warehouseAccessCheck, learnBlueprint, knowsBlueprint, storeAllWarehouse, warehouseCapacity, warehouseState, transferWarehouse, materialCount, warehouseAutoEligible, warehouseAutoItems, setWarehouseAutoItems, autoStoreWarehouse, equipBackpack, replacePending,
    newGame, load, hasSave, save,
    sceneOf, sceneUnlocked, canTravel, travel, atlantisTeleport, activatePortal, setZone, lightLevel, pointsOf, pointAvailable, pointStatus, doPoint, randomEventPool,
    onceRewardMissing,
    buildChain, canBuildFurniture, buildFurniture, buildHouseExt, houseExtMax, houseExtMats, buildStoreExt, storeExtMax, storeExtMats, storeExtCap, atlantisCamp, atlantisFurnitureUsed, buildAtlantisFurniture, repairDive, repairDiveCost, demolishFurniture, collectRainWater, collectHiveHoney, canCraft, craft, exchangeShells, exchangeGold, SHELL_PER_COIN, SHELL_FOR_COIN, shrinePool, shrineChoices, triggerShrine,
    liveInfo, liveCap, coopCap, coopExtMats, buildCoopExt, addSheep, addChick, toggleAutoFeed, deliverToBag,
    plant, harvest, consume, useMed, equipToSlot, equip, rest, sleep, farmPlots, farmExt, tillPlot, loosenPlot, FARM_EXTRA_MAX, raidWolves, continueRun, syncToolkit, drainTool, drainById, restoreBackupSave, dailySign, dailySignState,
    dryOf, dryLeftMin, dryCollect, fmtLeft,
    hasDivineBowAnywhere, storeDivineBow, hasMailboxDivineBow,
    collectDailyReport, claimDailyTrap, resolveTrapDaily,
    setTimeFreeze, timeFrozen, setHostSuspended, hostSuspended,
    rollTravelAmbush, roadAmbushChance, roadAmbushPool, ROAD_AMBUSH_MIN_DANGER,
    startFight, fightAction, useItemInFight, pointReason, furnSlotFull, furnSlotInfo, furnTakesSlot, houseSlots, bedStamBonus, furnitureUsed, tailorGifted, farmLiveSlots, farmLiveUsed, farmLiveFree, farmLiveInfo, FARM_LIVESTOCK_IDS,
    laochaoAvailable, signalFlag, doFirstTrade, completeCommission, commissions, commissionDone, commissionAccepted,
    sellToMerchant, buyFromMerchant, priceOf, fishmanDeals, fishmanBarter, fishmanTraded,
    checkEndingActions, doEnding, doPeakRitual, settleEnding, collection, currentObjective, metaState, identityUnlocked, unlockIdentity, metaBuy, metaBonus, metaSettle, metaNum, metaLast, reviveInfo, reviveToday, redeemCode, mailboxList, claimMailbox, mailboxCount, batchTipSeen, markBatchTipSeen, devEnabled, unlockDev, hasRelic, hpMax, gainRandomRelic, durOf, durMaxOf, sleepQuality, sleepForecast, unlockRelicSlot, equipRelic, unequipRelic, relicSlotCost, atlVendorInfo, buyRelicFromVendor, lotusLeft, backupPoints, slotList, extraSlotUnlocked, buyExtraSlot, buyBackupPoint, backupSlot, loadSlot, delSlot, exportCode, inspectCode, importCode, metaReload, raidDay, acceptCommission, sharpen, repairWeapon, nameWeapon, repairMatOf, wNameOf, selectedTool, autoToolsEnabled, setAutoTools, pointMinutes, craftRecipe, craftMax, craftMinutes, craftBatch, repairPistol, fixBrokenPistol, travelCost, zoneSwimCost, equipTool, unequipTool, capUsed, unequip, newGame, achCheck, achClaim, achUnlocked, achState,
    // 技能树（B1）
    skillTreeInfo, skillUpTrunk, skillNodeLearn, skillNodeForget, nodeLv, trunkPicks, trunkLv, nodeCheck, nodeIsLeaf, nodeForgetGain, craftIn,
    trunkForgetInfo, skillTrunkForget,          // 主干遗忘（只能从末端退，返还一半）
    skinCost, skinOwned, unlockSkin,            // 皮肤包解锁（深海琥珀 / 彩绘卡面 各 50 魂点）
    enemyRangeOf: enemyRange, myAttackRange, myMoveSpeed,   // 距离制：战斗面板要显示"还差多少步"
    satchelPref: () => ({food:satchelSelections('food')[0]||'',drink:satchelSelections('drink')[0]||''}),
    setSatchelPref: (kind,id) => setSatchelSelections(kind,id?[id]:[]),
    vendorRelicChance: () => VENDOR_RELIC_CHANCE,
    scanLocalSaves, restoreLocalSave, rescueInfo,   // 存档救援：扫描本机痕迹 / 恢复某一份
    confirmSettleEnding,   // 结算前二次确认（一局只能结算一个结局，所以要单独再问一次）
    skillCritRate: cxCrit, gatherYieldMul: gxYieldMul, gatherTimeMul: gxTimeMul, gatherEnergyMul: gxEnergyMul,
    sweepCdTotal, sweepMul, vampRate, execThreshold, revengeBonus, critMul, bowNodeLv, gunNodeLv, heavyInfo, sureInfo, hasHeavy, hasSure, ACT_CD_BASE,
    diveWarn,   // 水下负面状态（水压 / 缺氧）给顶栏徽标用
    takeCombatEvents, wallBlockBonus, wallDurMul, swiftBonus, rageAtkMul, rageTakenMul, ironTakenMul, ironAtkMul, ammoSaveChance, rangedAcc, combatAccuracy, combatActionInfo,
    cloudStatus, cloudPush, cloudInit,   // 旧平台接口兼容：本地版本始终返回未启用
    hasItem, invCount, addItem, removeItem, capacity, fertilize,
    lotteryState, lotteryValue, lotteryChance, lotteryOffer, lotteryDeposit, lotteryDraw, lotteryPools, adCoinBalance, adCurrencyName, adRewardState, claimAdReward, adShopState, buyAdShop, exchangeAdCoins, exchangeSoulForStars,
    sweepInfo, activeBuffs, pointEnergy, staminaCost, foodFreshness,
    playerAtk, playerAtkAvg, rangedAtk, playerDef, warmth, weatherTemperature, environmentTemperature, temperatureInfo, maxStam, combatLv, expLevel, charStats, combatSpeed, train, trainingHp, trainingAtk,
    isNight, isDusk, seasonInfo, seasonOnDay, winterJustStarted, fmtTime,
    log, change, addMin, die, diaryAdd,
    resIds, monIds,   // 图鉴名单（总量与列表共用，保证对得上）
  };
})();
