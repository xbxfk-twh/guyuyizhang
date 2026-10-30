/* 库存、食物批次、耐久实例与容器搬运的唯一实现。
   state 为实时状态端口；其余依赖在 Game 装配，模块不保存状态快照。 */
const InventoryRules = (() => {
  function create(deps) {
    const persistPair=(...args)=>deps.persistPair(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const save=(...args)=>deps.save(...args);
    const showOverlay=(...args)=>deps.showOverlay(...args);
    const meleeWeapons=(...args)=>deps.meleeWeapons(...args);
    const hasTwoHand=(...args)=>deps.hasTwoHand(...args);
    const wNameOf=(...args)=>deps.wNameOf(...args);
    const diaryAdd=(...args)=>deps.diaryAdd(...args);
    const supplyContainer=(...args)=>deps.supplyContainer(...args);
    const materialCount=(...args)=>deps.materialCount(...args);
    const nowTick=(...args)=>deps.nowTick(...args);
    const atlantisCamp=(...args)=>deps.atlantisCamp(...args);
    const metaSave=(...args)=>deps.metaSave(...args);
    const metaState=(...args)=>deps.metaState(...args);
    const metaBonus=(...args)=>deps.metaBonus(...args);
function invCount(id) { return deps.state.run.inv[id] || 0; }

function hasItem(id, n=1) { return invCount(id) >= n; }

function knowsBlueprint(id) { return !!deps.state.run.learnedBlueprints?.[id] || materialCount(id)>0; }

function learnBlueprint(id,fromWarehouse=false) {
    if(!ITEMS[id] || ITEMS[id].cat!=='bp' || deps.state.run.combat || deps.state.run.death || deps.state.run.ending)return {ok:false,reason:'现在无法学习。'};
    if(fromWarehouse?(!warehouseAccess() || !(warehouseState().inv[id]>0)):!hasItem(id))return {ok:false,reason:'请先取得这份图纸。'};
    if(deps.state.run.learnedBlueprints?.[id])return {ok:true,reason:'已经学会。'};
    const next=JSON.parse(JSON.stringify(deps.state.run));next.learnedBlueprints=next.learnedBlueprints||{};next.learnedBlueprints[id]=true;
    const r=persistPair(next,JSON.parse(JSON.stringify(metaState())),false);
    if(r.ok){log('学会了'+ITEMS[id].name+'，本存档中不再需要随身携带。','good');change();}return r;
  }

function notifyBagFull() {
    if (deps.state.run._bagFullAt !== undefined && (deps.state.run.tick || 0) - deps.state.run._bagFullAt < 60) return;
    deps.state.run._bagFullAt = deps.state.run.tick || 0;
    showOverlay({
      title: '背包已满',
      text: `背包装不下了：${capUsed()}/${capacity()} 格。\n\n· 回营地存进仓库，或丢弃不需要的东西\n· 更换容量更大的背包\n· 采集和战斗掉落仍可收入；超载会增加移动体力消耗`,
      choices: [{label:'整理背包',ok:()=>deps.onOverlay&&deps.onOverlay({kind:'inv'})},{ label: '知道了', ok: () => {} }],
    });
  }

function foodLots(id, count=invCount(id)) {
    deps.state.run.foodBatches = deps.state.run.foodBatches || {};
    let lots = (deps.state.run.foodBatches[id] || []).filter(x => Number.isSafeInteger(x.qty) && x.qty > 0 && Number.isFinite(x.exp)).map(x=>({...x}));
    lots.sort((a,b)=>a.exp-b.exp);
    const sum=lots.reduce((n,x)=>n+x.qty,0);
    if(sum < count) lots.push({qty:count-sum,exp:(deps.state.run.foodExp && deps.state.run.foodExp[id]) || (deps.state.run.tick||0)+(ITEMS[id].spoil||24)*120});
    if(sum > count) { let extra=sum-count; for(let i=lots.length-1;i>=0 && extra;i--) { const n=Math.min(extra,lots[i].qty);lots[i].qty-=n;extra-=n; } }
    return lots.filter(x=>x.qty>0).sort((a,b)=>a.exp-b.exp);
  }

function syncFood(id,lots) {
    deps.state.run.foodBatches=deps.state.run.foodBatches||{}; deps.state.run.foodExp=deps.state.run.foodExp||{};
    if(lots.length) { deps.state.run.foodBatches[id]=lots; deps.state.run.foodExp[id]=Math.min(...lots.map(x=>x.exp)); }
    else { delete deps.state.run.foodBatches[id];delete deps.state.run.foodExp[id]; }
  }

function foodFreshness(id) { return ITEMS[id] && ITEMS[id].spoil ? foodLots(id).map(x=>({qty:x.qty,minutes:Math.max(0,x.exp-(deps.state.run.tick||0))})) : []; }

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
    const before = deps.state.run.inv[id] || 0;
    const noSlot = it.cat === 'bp' || it.cat === 'currency' || it.alwaysFit;
    const slotsBefore = noSlot ? 0 : it.stack === 1 ? before : Math.ceil(before / stackSize(id));
    const slotsAfter = noSlot ? 0 : it.stack === 1 ? before + qty : Math.ceil((before + qty) / stackSize(id));
    if (!allowOverflow && !fits && usedSlots + slotsAfter - slotsBefore > capNow) {
      if (!silent) { log('你的背包容量已达上限！', 'danger'); notifyBagFull(); }
      return false;
    }
    if (deps.state.run.inv[id]) {
      deps.state.run.inv[id] += qty;
    } else {
      deps.state.run.inv[id] = qty;
    }
    if (!deps.state.run.seen[id]) { deps.state.run.seen[id] = 1; const mm = metaState(); if (ITEMS[id].cat === 'mat' || ITEMS[id].cat === 'special' || ITEMS[id].cat === 'bp' || ITEMS[id].cat === 'seed') { mm.seenItems[id] = 1; metaSave(); } if (!silent) log(`「图鉴」发现了：${it.name}`, 'sys'); }
    // 保鲜系统：易腐食物记录到期时刻；晾肉架可让肉/鱼保鲜 +50%
    if (it.spoil) {
      const lots=foodLots(id,deps.state.run.inv[id]-qty);
      let h=it.spoil*2;
      if(deps.state.run.furniture.rack && (id==='meat'||id==='fish')) h=Math.round(h*1.5);
      const exp=(deps.state.run.tick||0)+h*60;
      const same=lots.find(x=>x.exp===exp);
      if(same) same.qty+=qty; else lots.push({qty,exp});
      syncFood(id,lots.sort((a,b)=>a.exp-b.exp));
    }
    if (DURA[id] !== undefined) {
      deps.state.run.dur = deps.state.run.dur || {}; deps.state.run.toolDurs = deps.state.run.toolDurs || {};
      if (ITEMS[id] && ITEMS[id].stack === 1) { const a = deps.state.run.toolDurs[id] = deps.state.run.toolDurs[id] || []; for (let i = 0; i < qty; i++) a.push(DURA[id]); }   // 造几件就记几条实例耐久
      else deps.state.run.dur[id] = DURA[id];
      durSync(id);
    }
    return true;
  }

function durList(id) {
    if (DURA[id] === undefined) return null;
    if (!deps.state.run.inv) deps.state.run.inv = {};
    if (!deps.state.run.toolDurs) deps.state.run.toolDurs = {};
    let a = deps.state.run.toolDurs[id];
    if (!Array.isArray(a)) a = deps.state.run.toolDurs[id] = [];
    const n = invCount(id);
    if (!a.length && n > 0 && deps.state.run.dur && deps.state.run.dur[id] !== undefined) a.push(Math.max(keepsBroken(id) ? 0 : 1, Math.min(deps.state.run.dur[id], DURA[id])));   // 老存档保留收藏武器的 0 耐久
    while (a.length < n) a.push(DURA[id]);
    if (a.length > n) a.length = n;
    deps.state.run.toolMaxDurs = deps.state.run.toolMaxDurs || {};
    const maxima = deps.state.run.toolMaxDurs[id] = Array.isArray(deps.state.run.toolMaxDurs[id]) ? deps.state.run.toolMaxDurs[id] : [];
    while (maxima.length < n) maxima.push(DURA[id]);
    if (maxima.length > n) maxima.length = n;
    return a;
  }

function durMaxOf(id, idx) {
    if (DURA[id] === undefined) return null;
    durList(id);
    const a = deps.state.run.toolMaxDurs && deps.state.run.toolMaxDurs[id];
    return a && a.length ? (a[idx === undefined ? 0 : idx] || DURA[id]) : DURA[id];
  }

function durSync(id) {
    const a = durList(id);
    if (!a) return;
    deps.state.run.dur = deps.state.run.dur || {};
    if (a.length) deps.state.run.dur[id] = Math.min.apply(null, a); else delete deps.state.run.dur[id];
  }

function fixEquipIdx(id) {   // 卖掉/用坏一件后，把装备槽的实例索引收回有效范围
    if (!deps.state.run.equipment || !deps.state.run.equipIdx) return;
    const n = invCount(id);
    for (const s of ['weapon','weapon2','armor','cloth','accessory']) {
      if (deps.state.run.equipment[s] !== id) continue;
      if (n <= 0) { deps.state.run.equipment[s] = null; deps.state.run.equipIdx[s] = 0; }
      else if ((deps.state.run.equipIdx[s] || 0) > n - 1) deps.state.run.equipIdx[s] = n - 1;
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
    deps.state.run.inv[id] -= qty;
    const a = deps.state.run.toolDurs && deps.state.run.toolDurs[id];
    const maxa = deps.state.run.toolMaxDurs && deps.state.run.toolMaxDurs[id];
    if (a) {
      if (opts && opts.durIdx !== undefined) { a.splice(opts.durIdx, 1); if (maxa) maxa.splice(opts.durIdx, 1); }
      else for (let n = 0; n < qty && a.length; n++) { let mi = 0; for (let i = 1; i < a.length; i++) if (a[i] < a[mi]) mi = i; a.splice(mi, 1); if (maxa) maxa.splice(mi, 1); }   // 默认先消耗最快会坏的那件
      if (!a.length) delete deps.state.run.toolDurs[id];
      if (maxa && !maxa.length) delete deps.state.run.toolMaxDurs[id];
    }
    if (deps.state.run.inv[id] <= 0) { delete deps.state.run.inv[id]; if (DURA[id] !== undefined && deps.state.run.dur) delete deps.state.run.dur[id]; }
    if (DURA[id] !== undefined) { durSync(id); fixEquipIdx(id); }
    return true;
  }

function durOf(id, idx) {
    const a = durList(id);
    if (a && a.length) { if (idx !== undefined && a[idx] !== undefined) return a[idx]; return Math.min.apply(null, a); }
    return (deps.state.run.dur && deps.state.run.dur[id] !== undefined) ? deps.state.run.dur[id] : (DURA[id] !== undefined ? DURA[id] : null);
  }

function selectedTool(kind, automatic=!!deps.state.run?.settings?.autoTools) {
    if (!deps.state.run) return null;
    const equipped = (deps.state.run.toolkit || []).filter(Boolean), choices=[];
    const ids = automatic ? Object.keys(deps.state.run.inv || {}) : equipped;
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

function autoToolsEnabled() { return !!deps.state.run?.settings?.autoTools; }

function setAutoTools(enabled) {
    if(!deps.state.run || deps.state.run.combat || deps.state.run.death || deps.state.run.ending) return {ok:false,reason:'现在无法更改工具选择。'};
    const before=deps.state.run.settings;deps.state.run.settings={...(before||{}),autoTools:!!enabled};
    const result=save();if(!result.ok){deps.state.run.settings=before;return result;}
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
    if (!Array.isArray(deps.state.run.toolkit)) deps.state.run.toolkit = [null, null, null];
    const present = new Set(deps.state.run.toolkit.filter(Boolean).map(id => ITEMS[id].tool.kind));
    for (let i = 0; i < deps.state.run.toolkit.length; i++) {
      if (deps.state.run.toolkit[i] || deps.state.run.toolkitManualEmpty?.[i]) continue;
      for (const id in deps.state.run.inv) { const t = ITEMS[id] && ITEMS[id].tool; if (t && !deps.state.run.toolkitManualKinds?.[t.kind] && invCount(id) > 0 && (DURA[id] === undefined || (durList(id) || []).some(d => d > 0)) && !present.has(t.kind)) { deps.state.run.toolkit[i] = id; present.add(t.kind); break; } }
    }
  }

function syncToolkit() {
    if (!Array.isArray(deps.state.run.toolkit)) return;
    let cleared = false;
    for (let i = 0; i < deps.state.run.toolkit.length; i++) {
      const id = deps.state.run.toolkit[i];
      if (id && (!ITEMS[id] || !ITEMS[id].tool || invCount(id) <= 0 || (DURA[id] !== undefined && !(durList(id) || []).some(d => d > 0)))) { deps.state.run.toolkit[i] = null; cleared = true; }
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
    if (deps.state.run.toolkit.includes(id)) return { ok:false, reason:'已在工具栏' };
    // 同 kind 占据的槽 → 换掉；否则用空槽
    let slot = deps.state.run.toolkit.findIndex(k => k && ITEMS[k].tool.kind === t.kind);
    if (slot < 0) slot = deps.state.run.toolkit.indexOf(null);
    if (slot < 0) return { ok:false, reason:'工具栏已满（3格），先卸下一件' };
    const old = deps.state.run.toolkit[slot]; deps.state.run.toolkit[slot] = id;
    if (deps.state.run.toolkitManualEmpty) deps.state.run.toolkitManualEmpty[slot] = false;
    if (deps.state.run.toolkitManualKinds) delete deps.state.run.toolkitManualKinds[t.kind];
    log(`工具栏${old ? `${ITEMS[old].name}换为` : '装备了'}${ITEMS[id].name}。`, 'sys');
    if (deps.state.run.tut === 2 && deps.state.run.toolkit.some(t => t && ITEMS[t] && ITEMS[t].tool)) deps.state.run.tut = null;   // 引导完成
    change(); return { ok:true };
  }

function unequipTool(id) {
    const i = deps.state.run.toolkit.indexOf(id);
    if (i < 0) return { ok:false, reason:'不在工具栏' };
    deps.state.run.toolkit[i] = null;
    // 手动空位随存档保留，读档、采集和其他工具损坏补位时不自动装回来。
    if (!Array.isArray(deps.state.run.toolkitManualEmpty)) deps.state.run.toolkitManualEmpty = [];
    deps.state.run.toolkitManualEmpty[i] = true;
    deps.state.run.toolkitManualKinds = deps.state.run.toolkitManualKinds || {};
    deps.state.run.toolkitManualKinds[ITEMS[id].tool.kind] = true;
    log(`把${ITEMS[id].name}收回了背包。`, 'sys'); change(); return { ok:true };
  }

function drainTool(kind) {
    if(autoToolsEnabled()){wearSelectedTool(selectedTool(kind));return;}
    // ⚠️ 采集用的是【工具栏里的】工具：bestToolTier() 和 hasTool() 都只看 S.toolkit。
    //    所以磨损也必须扣工具栏里那把 —— 以前这里从整个背包挑等级最高的，
    //    于是"栏里装石斧、背包里放钢斧"时扣的是背包那把的耐久（玩家反馈"扣耐久扣的不是装备上去的"）。
    const inKit = (deps.state.run.toolkit || []).filter(id => id && ITEMS[id] && ITEMS[id].tool && ITEMS[id].tool.kind === kind && invCount(id) > 0);
    if (inKit.length) {
      inKit.sort((a, b) => (ITEMS[b].tool.tier || 1) - (ITEMS[a].tool.tier || 1));
      drainById(inKit[0]);   // 只消耗一件（按实例），坏了会自动从背包补同款（drainById 里已 syncToolkit）
      return;
    }
    // 兜底：栏里没有这种工具（刚做出来还没装、老存档）→ 还是按"背包里最好的那把"
    const ids = Object.keys(deps.state.run.inv).filter(k => ITEMS[k] && ITEMS[k].tool && ITEMS[k].tool.kind === kind);
    if (!ids.length) return;
    ids.sort((a,b) => (ITEMS[b].tool.tier||1) - (ITEMS[a].tool.tier||1));
    drainById(ids[0]);
  }

let _swingTurn = 0;

function weaponTurnSlot() {
    const w = deps.state.run.equipment.weapon ? ITEMS[deps.state.run.equipment.weapon] : null;
    const w2 = deps.state.run.equipment.weapon2 ? ITEMS[deps.state.run.equipment.weapon2] : null;
    if (meleeWeapons().length >= 2) return (_swingTurn % 2 === 0) ? 'weapon' : 'weapon2';
    if (w && !w.ranged) return 'weapon';
    if (w2 && !w2.ranged) return 'weapon2';
    return deps.state.run.equipment.weapon ? 'weapon' : 'weapon2';
  }

function meleeWeaponNow() {
    const id = deps.state.run.equipment[weaponTurnSlot()];
    const it = id ? ITEMS[id] : null;
    return (it && it.cat !== 'shield' && !it.ranged) ? it : null;
  }

function drainWeapon() {
    const me = meleeWeapons();
    const slot = weaponTurnSlot();
    if (me.length >= 2) _swingTurn = (_swingTurn + 1) % 2;   // 双近战：轮流出手（每挥一次换手）
    drainEquipSlot(slot);
  }

function recordBroken(id) {if(deps.state.run.combat){deps.state.run.combat.brokenItems=deps.state.run.combat.brokenItems || [];if(!deps.state.run.combat.brokenItems.includes(id))deps.state.run.combat.brokenItems.push(id);}}

function drainEquipSlot(slot) {
    const id = deps.state.run.equipment[slot];
    if (!id || DURA[id] === undefined) return;
    const it = ITEMS[id];
    if (it.cat === 'shield') return;   // 盾的耐久在格挡时单独扣
    const durs = durList(id);
    const ei = Math.min((deps.state.run.equipIdx && deps.state.run.equipIdx[slot]) || 0, Math.max(0, (durs || []).length - 1));   // 装备槽对应的实例索引
    const named = deps.state.run.weaponNames && deps.state.run.weaponNames[id];   // 已命名的武器：耐久归零不消失
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
        if (keep) { durs[ei] = 0; deps.state.run.dur[id] = 0; deps.state.run.equipment[slot] = null; log(keepMsg, 'orange'); diaryAdd(`我的${ITEMS[id].name}受损了。`); }
        else { removeItem(id, 1, { durIdx: ei }); deps.state.run.equipment[slot] = null; log(`你的${ITEMS[id].name}在战斗中折断了！`, 'orange'); diaryAdd(`我的${ITEMS[id].name}断了。`); }
      }
      else { durs[ei] = cur - 1; durSync(id); }
    } else {
      const cur = deps.state.run.dur[id] !== undefined ? deps.state.run.dur[id] : DURA[id];
      if (cur - 1 <= 0) {recordBroken(id); if (keep) { deps.state.run.dur[id]=0; deps.state.run.equipment[slot] = null; log(keepMsg, 'orange'); diaryAdd(`我的${ITEMS[id].name}受损了。`); } else { removeItem(id, 1); deps.state.run.equipment[slot] = null; log(`你的${ITEMS[id].name}在战斗中折断了！`, 'orange'); diaryAdd(`我的${ITEMS[id].name}断了。`); } }
      else deps.state.run.dur[id] = cur - 1;
    }
    // 自动顶上备用武器时，跳过那些已经打坏的（耐久 0 的会"一装备就又坏"，等于白骗玩家一次）
    // ⚠️ 还要跳过弹药：箭矢/鹰羽箭的 cat 也是 'weapon'，以前弓一打坏，系统会把背包里的
    //    「箭矢」当成备用武器给你装备上（日志写"你迅速换上了箭矢继续战斗"），主手就变成了一把箭。
    if ((slot === 'weapon' || slot === 'weapon2') && deps.state.run.equipment[slot] === null) { const next = Object.keys(deps.state.run.inv).filter(k => ITEMS[k] && ITEMS[k].cat === 'weapon' && !ITEMS[k].ammo && (DURA[k] === undefined || (durOf(k) || 0) > 0)).sort((a,b) => (ITEMS[b].atk||0) - (ITEMS[a].atk||0))[0]; if (next && !(deps.state.run.equipment.weapon === next || deps.state.run.equipment.weapon2 === next)) { deps.state.run.equipment[slot] = next; log(`你迅速换上了${ITEMS[next].name}继续战斗。`, 'good'); } }
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
          for (const slot of Object.keys(deps.state.run.equipment || {})) if (deps.state.run.equipment[slot] === id && ((deps.state.run.equipIdx || {})[slot] || 0) === mi) deps.state.run.equipment[slot] = null;
          log(`${wNameOf(id)}耐久耗尽，已保留在背包中${id === 'divineBow' ? '作收藏，无法修复' : '，可到磨刀石修补'}。`, 'orange');
        } else { removeItem(id, 1, { durIdx: mi }); log(`你的${ITEMS[id].name}用坏了！`, 'orange'); }
        syncToolkit();
      }
      else { durs[mi] = cur - 1; durSync(id); }
      return;
    }
    const cur = deps.state.run.dur[id] !== undefined ? deps.state.run.dur[id] : DURA[id];
    if (cur - 1 <= 0) {recordBroken(id); removeItem(id, 1); syncToolkit(); log(`你的${ITEMS[id].name}用坏了！`, 'orange'); }
    else deps.state.run.dur[id] = cur - 1;
  }

function keepsBroken(id) { return !!((ITEMS[id] && ITEMS[id].keepBroken) || (deps.state.run.weaponNames && deps.state.run.weaponNames[id])); }

let inventoryTransfer=false;

function capUsed() {
    let n = 0;
    for (const id in deps.state.run.inv) {
      if (!(deps.state.run.inv[id] > 0)) continue;
      const it = ITEMS[id];
      if (it && (it.cat === 'bp' || it.cat === 'currency' || it.alwaysFit)) continue;
      n += (it && it.stack === 1) ? deps.state.run.inv[id] : Math.ceil(deps.state.run.inv[id] / stackSize(id));
    }
    return n;
  }

function capacity() {
    const base=deps.state.run.capacity===20?(deps.state.run.inventoryBaseSlots||15):(deps.state.run.capacity||15);
    return base + metaBonus().bag + (invCount(deps.state.run.backpack)>0?(ITEMS[deps.state.run.backpack]?.packCapacity || 0):0);
  }

function settleStoredFood() {
    if (!deps.state.run) return;
    const tick = deps.state.run.tick || 0;
    for (const store of [deps.state.run.warehouse, deps.state.run.cellar, deps.state.run.atlantis?.camp?.warehouse]) {
      for (const rec of store?.items || []) {
        if (
          ITEMS[rec.id]?.spoil &&
          rec.expiry !== undefined &&
          rec.expiry <= tick
        ) {
          rec.id = 'rot';
          delete rec.expiry;
          deps.state.run._dirty = true;
        }
      }
    }
  }

function warehouseSite() {
    return deps.state.run.scene === 'atlantis' ? 'sea' : 'island';
  }

function stackSize(id) {
    return ITEMS[id]?.stack === 1 ? 1 : ITEMS[id]?.ammo === 1 ? 50 : 20;
  }

function warehouseAccess() {
    return deps.state.run.scene === 'camp' || (deps.state.run.scene === 'atlantis' && deps.state.run.zone === 'habitat');
  }

function warehouseDepositAccess() {
    return (
      warehouseAccess() ||
      (invCount(deps.state.run.backpack) > 0 && !!ITEMS[deps.state.run.backpack]?.remoteWarehouse)
    );
  }

function warehouseCapacity(site = warehouseSite()) {
    if (site === 'sea') {
      const f = atlantisCamp().furniture,
        base = f.seaStorage2 ? 40 : f.seaStorage1 ? 20 : 0;
      return base ? base + ((deps.state.run.atlantis && deps.state.run.atlantis.fishmanStorage) || 0) : 0;
    }
    return deps.state.run.buildings.storage < 0
      ? 0
      : (BUILDING_CHAINS.storage[deps.state.run.buildings.storage]?.cap || 15) +
          (deps.state.run.storeExt || 0) * deps.STORE_EXT_CAP;
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
    const place = site === 'sea' ? atlantisCamp() : deps.state.run;
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
      deps.state.run.combat ||
      deps.state.run.death ||
      deps.state.run.ending ||
      (id !== null && (!ITEMS[id]?.packCapacity || !hasItem(id)))
    )
      return { ok: false, reason: '现在无法更换背包。' };
    deps.state.run.backpack = id;
    log(id ? '换上' + ITEMS[id].name + '。' : '已卸下背包，原物品保留。', 'good');
    change();
    return { ok: true };
  }

function warehouseReservedIndices(id) {
    const reserved = new Set(),
      n = invCount(id);
    for (const [slot, item] of Object.entries(deps.state.run.equipment || {}))
      if (item === id && n > 0)
        reserved.add(Math.min(deps.state.run.equipIdx?.[slot] || 0, n - 1));
    if ((deps.state.run.toolkit || []).includes(id) && n > 0) {
      const durs = DURA[id] !== undefined ? durList(id) : null;
      let idx = 0;
      if (durs) {
        idx = -1;
        for (let i = 0; i < durs.length; i++)
          if (durs[i] > 0 && (idx < 0 || durs[i] < durs[idx])) idx = i;
      }
      if (idx >= 0) reserved.add(idx);
    }
    if (deps.state.run.backpack === id && n > 0) reserved.add(0);
    return reserved;
  }

function warehouseDepositCount(id) {
    return Math.max(0, invCount(id) - warehouseReservedIndices(id).size);
  }

function warehouseAccessCheck(toStore = false) {
    if (deps.state.run.death || deps.state.run.ending || deps.state.run.stats.hp <= 0)
      return { ok: false, reason: '这一局已经结束，无法存取。' };
    if (deps.state.run.combat) return { ok: false, reason: '请先结束战斗再存取。' };
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
      counts = { ...deps.state.run.inv };
    let fit = 0,
      used = 0;
    const rows =
      (warehouseSite() === 'sea' ? atlantisCamp() : deps.state.run).warehouse?.items || [];
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

function commitInventoryTransfer(move) {
    const next = JSON.parse(JSON.stringify(deps.state.run));
    const meta = JSON.parse(JSON.stringify(metaState()));
    const previousTransfer = inventoryTransfer;
    inventoryTransfer = true;
    try {
      deps.state.preview(next,meta,()=>move(next));
    } catch (error) {
      return { ok: false, reason: error.message };
    } finally {
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
            Object.entries(deps.state.run.equipment || {})
              .filter(([, item]) => item === id)
              .map(([slot]) => [slot, deps.state.run.equipIdx?.[slot] || 0])
          );
          const rec = { id, qty: 1 };
          if (DURA[id] !== undefined) {
            rec.dur = durOf(id, idx);
            rec.maxDur = durMaxOf(id, idx);
          }
          if (ITEMS[id].spoil) rec.expiry = foodLots(id)[0]?.exp;
          removeItem(id, 1, { durIdx: idx });
          for (const [slot, oldIdx] of Object.entries(equipIndices)) {
            deps.state.run.equipIdx = deps.state.run.equipIdx || {};
            deps.state.run.equipIdx[slot] = oldIdx > idx ? oldIdx - 1 : oldIdx;
          }
          items.push(rec);
          if (warehouseState().used > warehouseCapacity())
            throw Error('仓库装不下了。');
        } else {
          const index = items.findIndex((x) => x.id === id),
            rec = items[index],
            out =
              rec.expiry !== undefined && rec.expiry <= (deps.state.run.tick || 0)
                ? 'rot'
                : id;
          const lots = ITEMS[out].spoil
            ? JSON.parse(JSON.stringify(foodLots(out)))
            : null;
          if (!addItem(out, 1, true)) throw Error('背包装不下了。');
          if (rec.dur !== undefined) {
            const n = invCount(out) - 1;
            deps.state.run.toolDurs[out][n] = rec.dur;
            deps.state.run.toolMaxDurs[out][n] = rec.maxDur;
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
    return (deps.state.run.buildings.cellar ?? -1) >= 0 || !!deps.state.run.furniture.cellar;
  }

function cellarAccess() {
    return (
      cellarBuilt() && deps.state.run.scene === 'camp' && !deps.state.run.combat && !deps.state.run.death && !deps.state.run.ending
    );
  }

function cellarState() {
    settleStoredFood();
    const items = deps.state.run.cellar?.items || [],
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
    const counts = { ...deps.state.run.inv };
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
      deps.state.run.cellar = deps.state.run.cellar || { items: [] };
      const rows = deps.state.run.cellar.items;
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

function satchelEligible(id,kind) { return deps.foodSatchel.satchelEligible(id,kind); }

function satchelSelections(kind) { return deps.foodSatchel.satchelSelections(kind); }

function setSatchelSelections(kind,ids) { return deps.foodSatchel.setSatchelSelections(kind,ids); }

function toggleSatchelSelection(kind,id) { return deps.foodSatchel.toggleSatchelSelection(kind,id); }

function satchelStatus() { return deps.foodSatchel.satchelStatus(); }

function satchelAvailable() { return deps.foodSatchel.satchelAvailable(); }

function discardItems(id, qty, fromWarehouse = false) {
    if (deps.state.run.combat || deps.state.run.death || deps.state.run.ending)
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
            ? deps.state.run.cellar.items
            : (warehouseSite() === 'sea' ? atlantisCamp() : deps.state.run).warehouse.items;
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
            Object.entries(deps.state.run.equipment || {})
              .filter(([, item]) => item === id)
              .map(([slot]) => [slot, deps.state.run.equipIdx?.[slot] || 0])
          );
          if (!removeItem(id, 1, { durIdx: idx }))
            throw Error('物品数量已变化。');
          for (const [slot, oldIdx] of Object.entries(indices))
            deps.state.run.equipIdx[slot] = oldIdx > idx ? oldIdx - 1 : oldIdx;
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
      deps.state.run.combat ||
      deps.state.run.death ||
      deps.state.run.ending
    )
      return { ok: false, moved: 0, reason: '现在无法存入仓库。' };
    let moved = 0;
    for (const id of Object.keys(deps.state.run.inv)) {
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
    const place = warehouseSite() === 'sea' ? atlantisCamp() : deps.state.run;
    return (place.warehouse?.autoItems || []).filter(warehouseAutoEligible);
  }

function setWarehouseAutoItems(ids) {
    if (
      !warehouseAccess() ||
      deps.state.run.combat ||
      deps.state.run.death ||
      deps.state.run.ending ||
      !Array.isArray(ids)
    )
      return { ok: false, reason: '现在无法设置自动存入。' };
    const next = JSON.parse(JSON.stringify(deps.state.run)),
      place = warehouseSite() === 'sea' ? next.atlantis.camp : next;
    place.warehouse = place.warehouse || { items: [] };
    place.warehouse.autoItems = [...new Set(ids.filter(warehouseAutoEligible))];
    return persistPair(next, JSON.parse(JSON.stringify(metaState())), false);
  }

function autoStoreWarehouse() {
    if (
      !warehouseAccess() ||
      deps.state.run.combat ||
      deps.state.run.death ||
      deps.state.run.ending ||
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
    if (!deps.state.run.toolkit) autoToolkit();
    return (selectedTool(kind)?.tier || 0) >= tier;
  }

function equipToSlot(id,slot,idx=0) {
    if(!deps.state.run||deps.state.run.combat||deps.state.run.death||deps.state.run.ending||!ITEMS[id]||!hasItem(id))return {ok:false,reason:'现在无法更换装备。'};
    deps.state.run.equipIdx=deps.state.run.equipIdx||{weapon:0,weapon2:0,armor:0,cloth:0,accessory:0};if(!['weapon','weapon2','armor','cloth','accessory'].includes(slot))return {ok:false,reason:'没有这个装备槽位。'};const it=ITEMS[id];if(slot==='weapon2'&&(it.twoHand||hasTwoHand()))return {ok:false,reason:'双手武器占用主副手，不能装备到副手。'};
    const valid=slot==='weapon'?it.cat==='weapon':slot==='weapon2'?['weapon','shield'].includes(it.cat):it.cat===slot;
    if(!valid||it.ammo)return {ok:false,reason:'这件物品不适合这个槽位。'};
    if(!Number.isInteger(idx)||idx<0||idx>=invCount(id)||DURA[id]!==undefined&&durOf(id,idx)<=0)return {ok:false,reason:'装备已损坏或数量不足。'};
    for(const other of ['weapon','weapon2','armor','cloth','accessory'])if(other!==slot&&deps.state.run.equipment[other]===id&&(deps.state.run.equipIdx?.[other]||0)===idx)return {ok:false,reason:'这件物品已装备在另一个槽位。'};
    if(it.twoHand){deps.state.run.equipment.weapon2=null;deps.state.run.equipIdx.weapon2=0;}deps.state.run.equipment[slot]=id;deps.state.run.equipIdx[slot]=idx;log('装备了'+it.name+'。','good');change();return {ok:true};
  }

function equip(id, idx) {
    const it = ITEMS[id];
    if (!it || !hasItem(id)) return;
    // 弹药（源能子弹 / 箭矢 / 鹰羽箭）是给远程武器吃的，不是能握在手里的武器。
    // 它们的 cat 写成 weapon 只是为了进"武器"分类，这里挡掉，避免占用主手副手。
    if (it.ammo) { log(`${it.name}是弹药，要配合远程武器使用，没法握在手里。`, 'warn'); return; }
    deps.state.run.equipIdx = deps.state.run.equipIdx || { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
    // 实例索引：确保每个槽用"未被其它槽占用"的实例（两把同款各占不同实例）
    const q = deps.state.run.inv[id] || 1;
    const used = [];
    for (const s of ['weapon','weapon2','armor','cloth','accessory']) if (deps.state.run.equipment[s] === id) used.push(deps.state.run.equipIdx[s] || 0);
    let useIdx = 0, k = 0;
    while (used.includes(k) && k < q) k++;
    useIdx = (idx !== undefined && !used.includes(idx)) ? idx : Math.min(k, Math.max(0, q - 1));
    if (DURA[id] !== undefined && durOf(id,useIdx) <= 0) { log(`${it.name}耐久已耗尽，无法装备。`, 'warn'); return; }
    if (it.cat === 'weapon') {
      const mainTwo = deps.state.run.equipment.weapon && ITEMS[deps.state.run.equipment.weapon].twoHand;
      // 双手武器已经握在手上时，不允许再装副手武器 —— 双持 = 两只手各一把单手武器。
      // （旧版这里会直接把双手武器顶掉，玩家会以为武器凭空消失了）
      if (mainTwo && !it.twoHand) {
        log(`手里正握着双手武器${ITEMS[deps.state.run.equipment.weapon].name}，两只手都占着——想换单手武器，请先把它卸下。`, 'warn');
        return;
      }
      if (it.twoHand) {   // 双手武器：占主手，副手清空
        const old = deps.state.run.equipment.weapon;
        deps.state.run.equipment.weapon = id; deps.state.run.equipment.weapon2 = null; deps.state.run.equipIdx.weapon = useIdx; deps.state.run.equipIdx.weapon2 = 0;
        log(`双手握上了${it.name}${old ? `（换下${ITEMS[old].name}）` : ''}，副手空了出来。`, 'sys');
      } else {
        let slot = 'weapon';
        if (deps.state.run.equipment.weapon) slot = deps.state.run.equipment.weapon2 ? 'weapon' : 'weapon2';
        const old = deps.state.run.equipment[slot];
        deps.state.run.equipment[slot] = id; deps.state.run.equipIdx[slot] = useIdx;
        log(`装备了${it.name}${old ? `（换下${ITEMS[old].name}）` : ''}${slot === 'weapon2' ? '（副手）' : ''}。`, 'sys');
      }
    } else if (it.cat === 'shield') {
      if (deps.state.run.equipment.weapon && ITEMS[deps.state.run.equipment.weapon] && ITEMS[deps.state.run.equipment.weapon].twoHand) {
        log(`手里正握着双手武器${ITEMS[deps.state.run.equipment.weapon].name}，腾不出手拿盾——请先把它卸下。`, 'warn');
        return;
      }
      if (deps.state.run.equipment.weapon2 && ITEMS[deps.state.run.equipment.weapon2] && ITEMS[deps.state.run.equipment.weapon2].cat !== 'shield') { log('副手已有武器，先卸下。', 'warn'); return; }
      const old = deps.state.run.equipment.weapon2;
      deps.state.run.equipment.weapon2 = id; deps.state.run.equipIdx.weapon2 = useIdx;
      log(`副手举起了${it.name}${old ? `（换下${ITEMS[old].name}）` : ''}。`, 'sys');
    } else if (it.cat === 'armor') {
      const old = deps.state.run.equipment.armor;
      deps.state.run.equipment.armor = id; deps.state.run.equipIdx.armor = useIdx;
      log(`穿上了${it.name}${old ? `（换下${ITEMS[old].name}）` : ''}。`, 'sys');
    } else if (it.cat === 'cloth') {
      const old = deps.state.run.equipment.cloth;
      deps.state.run.equipment.cloth = id; deps.state.run.equipIdx.cloth = useIdx;
      log(`穿上了${it.name}${old ? `（换下${ITEMS[old].name}）` : ''}。`, 'sys');
    } else if (it.cat === 'accessory') {
      const old = deps.state.run.equipment.accessory;
      deps.state.run.equipment.accessory = id; deps.state.run.equipIdx.accessory = useIdx;
      log(`佩戴了${it.name}${old ? `（换下${ITEMS[old].name}）` : ''}。`, 'sys');
    } else { log('这个不能装备。', 'warn'); return; }
    change();
  }

function unequip(id, idx) {
    for (const k of ['weapon','weapon2','armor','cloth','accessory']) {
      if (deps.state.run.equipment[k] === id && (idx === undefined || (deps.state.run.equipIdx||{})[k] === idx)) { deps.state.run.equipment[k] = null; if (deps.state.run.equipIdx) deps.state.run.equipIdx[k] = 0; log(`你卸下了${ITEMS[id].name}。`, 'sys'); change(); return; }
    }
    log('这件没在装备。', 'warn');
  }
    return Object.freeze({resetSwingTurn:()=>{_swingTurn=0;},invCount,hasItem,knowsBlueprint,learnBlueprint,notifyBagFull,foodLots,syncFood,foodFreshness,addItem,durList,durMaxOf,durSync,fixEquipIdx,removeItem,durOf,selectedTool,bestToolTier,autoToolsEnabled,setAutoTools,wearSelectedTool,autoToolkit,syncToolkit,equipTool,unequipTool,drainTool,weaponTurnSlot,meleeWeaponNow,drainWeapon,recordBroken,drainEquipSlot,drainById,keepsBroken,capUsed,capacity,settleStoredFood,warehouseSite,stackSize,warehouseAccess,warehouseDepositAccess,warehouseCapacity,storedCounts,storedSlots,warehouseState,equipBackpack,warehouseReservedIndices,warehouseDepositCount,warehouseAccessCheck,warehouseTransferMax,commitInventoryTransfer,transferWarehouse,cellarBuilt,cellarAccess,cellarState,cellarTransferMax,transferCellar,satchelEligible,satchelSelections,setSatchelSelections,toggleSatchelSelection,satchelStatus,satchelAvailable,discardItems,storeAllWarehouse,warehouseAutoEligible,warehouseAutoItems,setWarehouseAutoItems,autoStoreWarehouse,replacePending,hasTool,equipToSlot,equip,unequip});
  }
  return Object.freeze({create});
})();
