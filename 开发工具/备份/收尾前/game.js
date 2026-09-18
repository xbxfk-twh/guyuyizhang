/* ============================================================
   孤屿遗章 · 游戏引擎
   时间 / 生存 / 行动 / 战斗 / 建造 / 交易 / 事件 / 结局 / 存档
   ============================================================ */

const Game = (() => {
  let S = null;            // 全局状态
  let onLog = null;        // 文本回调（ui 注册）
  let onChange = null;     // 状态刷新回调（ui 注册）
  let onFight = null;      // 战斗界面回调
  let onEnding = null;     // 结局回调
  let onOverlay = null;    // 弹窗（选择/事件）回调

  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const chance = (p) => Math.random() < p;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const fmtTime = () => { const h = Math.floor(S.minute / 60), m = S.minute % 60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; };

  function log(text, cls) { if (onLog) onLog(text, cls); if (S && text) S.log.unshift({ t:`第${S.day}天 ${fmtTime()}`, text, cls }); }
  function change() { 
    if (S && S.stats && S.stats.hp <= 0 && !S.ending && !S.death) { S.stats.hp = 0; die('你伤势太重，倒在了荒野里。'); return; }   // 兜底：生命≤0必定死亡
    // 精神低落会压低体力上限，体力要跟着上限走（喝药透支后不该还能顶着一管超额的体力）
    if (S && S.stats) { const ms = maxStam(); if (S.stats.stamina > ms) S.stats.stamina = ms; }
    if (onChange) onChange();
    if (!S.death) achCheck();
  }
  function qtyParse(q) { if (typeof q === 'string' && q.includes('-')) { const [a,b] = q.split('-').map(Number); return rnd(a,b); } return q; }

  // ---------- 物品 ----------
  function invCount(id) { return S.inv[id] || 0; }
  function hasItem(id, n=1) { return invCount(id) >= n; }
  // 背包/仓库满了：红字日志容易被忽略，这里额外弹一个提醒（每次间隔至少 1 小时游戏时间，避免刷屏）
  function notifyBagFull() {
    if (S._bagFullAt !== undefined && (S.tick || 0) - S._bagFullAt < 60) return;
    S._bagFullAt = S.tick || 0;
    showOverlay({
      title: '背包已满',
      text: `背包（仓库）装不下了：${capUsed()}/${capacity()} 格。\n\n· 回营地卖掉或丢掉用不上的东西\n· 升级你的仓库，或用营地里新增的「扩建仓库」多扩几格\n· 背包里带着「竹篓」可以多装 10 格`,
      choices: [{ label: '知道了', ok: () => {} }],
    });
  }
  function addItem(id, qty, silent) {
    qty = Math.floor(qty);
    if (qty <= 0) return true;
    const it = ITEMS[id];
    if (!it) { console.warn('unknown item', id); return false; }
    const capNow = capacity();
    const used = Object.keys(S.inv).length;
    if (S.inv[id]) {
      S.inv[id] += qty;
    } else {
      if (used >= capNow) { if (!silent) { log('你的背包容量已达上限！', 'danger'); notifyBagFull(); } return false; }
      S.inv[id] = qty;
    }
    if (!S.seen[id]) { S.seen[id] = 1; const mm = metaState(); if (ITEMS[id].cat === 'mat' || ITEMS[id].cat === 'special' || ITEMS[id].cat === 'bp' || ITEMS[id].cat === 'seed') { mm.seenItems[id] = 1; metaSave(); } if (!silent) log(`「图鉴」发现了：${it.name}`, 'sys'); }
    // 保鲜系统：易腐食物记录到期时刻；晾肉架可让肉/鱼保鲜 +50%
    if (it.spoil) {
      S.foodExp = S.foodExp || {};
      let h = it.spoil * 2;   // 食物腐败速度减半（保质期翻倍）
      if (S.furniture && S.furniture.rack && (id === 'meat' || id === 'fish')) h = Math.round(h * 1.5);
      const newExp = (S.tick || 0) + h * 60;
      const oldExp = S.foodExp[id];
      if (oldExp !== undefined && oldExp > 0) {
        const oldQty = S.inv[id] - qty;
        S.foodExp[id] = oldQty > 0 ? Math.round((oldExp * oldQty + newExp * qty) / (oldQty + qty)) : newExp;
      } else S.foodExp[id] = newExp;
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
    S.toolDurs = S.toolDurs || {};
    let a = S.toolDurs[id];
    if (!Array.isArray(a)) a = S.toolDurs[id] = [];
    const n = invCount(id);
    if (!a.length && n > 0 && S.dur && S.dur[id] !== undefined) a.push(Math.max(1, Math.min(S.dur[id], DURA[id])));   // 老存档：把标量迁移成一条实例
    while (a.length < n) a.push(DURA[id]);
    if (a.length > n) a.length = n;
    return a;
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
    S.inv[id] -= qty;
    const a = S.toolDurs && S.toolDurs[id];
    if (a) {
      if (opts && opts.durIdx !== undefined) a.splice(opts.durIdx, 1);   // 指定实例（用坏的那件）
      else for (let n = 0; n < qty && a.length; n++) { let mi = 0; for (let i = 1; i < a.length; i++) if (a[i] < a[mi]) mi = i; a.splice(mi, 1); }   // 默认先消耗最快会坏的那件
      if (!a.length) delete S.toolDurs[id];
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
  function bestToolTier(kind) {
    if (!S.toolkit) autoToolkit();
    let best = 1;
    for (const id of S.toolkit) { const t = ITEMS[id] && ITEMS[id].tool; if (t && t.kind === kind) best = Math.max(best, t.tier || 1); }
    return best;
  }
  function autoToolkit() {
    if (!Array.isArray(S.toolkit)) S.toolkit = [null, null, null];
    const present = new Set(S.toolkit.filter(Boolean).map(id => ITEMS[id].tool.kind));
    for (let i = 0; i < S.toolkit.length; i++) {
      if (S.toolkit[i]) continue;
      for (const id in S.inv) { const t = ITEMS[id] && ITEMS[id].tool; if (t && invCount(id) > 0 && !present.has(t.kind)) { S.toolkit[i] = id; present.add(t.kind); break; } }
    }
  }
  function equipTool(id) {
    const t = ITEMS[id] && ITEMS[id].tool;
    if (!t) return { ok:false, reason:'这不是工具' };
    if (S.toolkit.includes(id)) return { ok:false, reason:'已在工具栏' };
    // 同 kind 占据的槽 → 换掉；否则用空槽
    let slot = S.toolkit.findIndex(k => k && ITEMS[k].tool.kind === t.kind);
    if (slot < 0) slot = S.toolkit.indexOf(null);
    if (slot < 0) return { ok:false, reason:'工具栏已满（3格），先卸下一件' };
    const old = S.toolkit[slot]; S.toolkit[slot] = id;
    log(`工具栏${old ? `${ITEMS[old].name}换为` : '装备了'}${ITEMS[id].name}。`, 'sys');
    if (S.tut === 2 && S.toolkit.some(t => t && ITEMS[t] && ITEMS[t].tool)) S.tut = null;   // 引导完成
    change(); return { ok:true };
  }
  function unequipTool(id) {
    const i = S.toolkit.indexOf(id);
    if (i < 0) return { ok:false, reason:'不在工具栏' };
    S.toolkit[i] = null; log(`把${ITEMS[id].name}收回了背包。`, 'sys'); change(); return { ok:true };
  }
  function drainTool(kind) {
    const ids = Object.keys(S.inv).filter(k => ITEMS[k] && ITEMS[k].tool && ITEMS[k].tool.kind === kind);
    if (!ids.length) return;
    ids.sort((a,b) => (ITEMS[b].tool.tier||1) - (ITEMS[a].tool.tier||1));
    drainById(ids[0]);   // 只消耗一件（按实例），不再整体扣耐久
  }
  let _swingTurn = 0;
  function drainWeapon() {
    const w = S.equipment.weapon ? ITEMS[S.equipment.weapon] : null;
    const w2 = S.equipment.weapon2 ? ITEMS[S.equipment.weapon2] : null;
    const me = meleeWeapons();
    let slot;
    if (me.length >= 2) { _swingTurn = (_swingTurn + 1) % 2; slot = _swingTurn === 1 ? 'weapon' : 'weapon2'; }   // 双近战：轮流掉耐久
    else if (w && !w.ranged) slot = 'weapon';
    else if (w2 && !w2.ranged) slot = 'weapon2';
    else slot = S.equipment.weapon ? 'weapon' : 'weapon2';
    const id = S.equipment[slot];
    if (!id || DURA[id] === undefined) return;
    const it = ITEMS[id];
    if (it.cat === 'shield' || it.ranged) return;
    const durs = durList(id);
    const ei = Math.min((S.equipIdx && S.equipIdx[slot]) || 0, Math.max(0, (durs || []).length - 1));   // 装备槽对应的实例索引
    const named = S.weaponNames && S.weaponNames[id];   // 已命名的武器：耐久归零不消失
    if (durs && durs.length) {
      const cur = durs[ei] !== undefined ? durs[ei] : durs[0];
      if (cur - 1 <= 0) {
        if (named) { durs[ei] = 0; S.dur[id] = 0; S.equipment[slot] = null; log(`${ITEMS[id].name}损坏了（你命名的武器，不会消失），用磨刀石修补后再用。`, 'orange'); diaryAdd(`我的${ITEMS[id].name}受损了。`); }
        else { removeItem(id, 1, { durIdx: ei }); S.equipment[slot] = null; log(`你的${ITEMS[id].name}在战斗中折断了！`, 'orange'); diaryAdd(`我的${ITEMS[id].name}断了。`); }
      }
      else { durs[ei] = cur - 1; durSync(id); }
    } else {
      const cur = S.dur[id] !== undefined ? S.dur[id] : DURA[id];
      if (cur - 1 <= 0) { if (named) { S.dur[id]=0; S.equipment[slot] = null; log(`${ITEMS[id].name}损坏了（你命名的武器，不会消失），用磨刀石修补。`, 'orange'); } else { removeItem(id, 1); S.equipment[slot] = null; log(`你的${ITEMS[id].name}在战斗中折断了！`, 'orange'); diaryAdd(`我的${ITEMS[id].name}断了。`); } }
      else S.dur[id] = cur - 1;
    }
    if (S.equipment[slot] === null) { const next = Object.keys(S.inv).filter(k => ITEMS[k] && ITEMS[k].cat === 'weapon').sort((a,b) => (ITEMS[b].atk||0) - (ITEMS[a].atk||0))[0]; if (next && !(S.equipment.weapon === next || S.equipment.weapon2 === next)) { S.equipment[slot] = next; log(`你迅速换上了${ITEMS[next].name}继续战斗。`, 'good'); } }
  }
  function drainById(id) {
    if (!invCount(id) || DURA[id] === undefined) return;
    const durs = durList(id);
    if (durs && durs.length) {   // 按实例：先用耐久最低的那件（让它先坏）
      let mi = 0; for (let i = 1; i < durs.length; i++) if (durs[i] < durs[mi]) mi = i;
      const cur = durs[mi];
      if (cur - 1 <= 0) { removeItem(id, 1, { durIdx: mi }); log(`你的${ITEMS[id].name}用坏了！`, 'orange'); }
      else { durs[mi] = cur - 1; durSync(id); }
      return;
    }
    const cur = S.dur[id] !== undefined ? S.dur[id] : DURA[id];
    if (cur - 1 <= 0) { removeItem(id, 1); log(`你的${ITEMS[id].name}用坏了！`, 'orange'); }
    else S.dur[id] = cur - 1;
  }
  function capUsed() { let n = 0; for (const id in S.inv) if (S.inv[id] > 0) n += (ITEMS[id] && ITEMS[id].cat === 'currency') ? 1 : (ITEMS[id] && ITEMS[id].stack === 1) ? S.inv[id] : Math.ceil(S.inv[id] / 20); return n; }   // 货币固定1格；工具/装备一件1格；可堆叠每20=1格
  function capacity() {
    const stCap = (BUILDING_CHAINS.storage[S.buildings.storage] || BUILDING_CHAINS.storage[0]).cap || 20;
    return Math.max(S.capacity || 20, stCap) + (invCount('basket') > 0 ? 10 : 0) + metaBonus().bag + (S.storeExt || 0) * STORE_EXT_CAP;
  }
  function hasTool(kind, tier=1) {
    if (!S.toolkit) autoToolkit();
    for (const id of S.toolkit) {
      if (id && ITEMS[id].tool && ITEMS[id].tool.kind === kind && ITEMS[id].tool.tier >= tier && invCount(id) > 0) return true;
    }
    return false;
  }

  // ---------- 时间 ----------
  const HOUR_EFFECTS = () => {
    const season = seasonInfo();
    const isNight = S.minute >= 22*60 || S.minute < 6*60;
    // 食之包：饱食/水分低于 50 自动进食饮水
    if (hasRelic('satchel')) {
      if (S.stats.hunger < 50) {
        const f = Object.keys(S.inv).find(k => ITEMS[k] && ITEMS[k].cat === 'food' && ITEMS[k].food > 0);
        if (f) { S.stats.hunger = Math.min(100, S.stats.hunger + (ITEMS[f].food||0)); removeItem(f, 1); log(`食之包自动喂了你：${ITEMS[f].name}。（饱食+${ITEMS[f].food||0}）`, 'good'); }
      }
      if (S.stats.thirst < 50) {
        const d = Object.keys(S.inv).find(k => ITEMS[k] && (ITEMS[k].cat === 'drink' || ITEMS[k].water > 0));
        if (d) { S.stats.thirst = Math.min(100, S.stats.thirst + (ITEMS[d].water||0)); removeItem(d, 1); log(`食之包自动喂了你：${ITEMS[d].name}。（饮水+${ITEMS[d].water||0}）`, 'good'); }
      }
    }
    const mb = metaBonus();
    const diffMul = (DIFFICULTIES[S.difficulty] && DIFFICULTIES[S.difficulty].drainMul) || 1;   // 简单/普通：饥渴消耗更慢
    S.stats.hunger = Math.max(0, S.stats.hunger - (S.difficulty === 'dev' ? 0 : 2 * (1 - mb.cons) * diffMul));
    S.stats.thirst = Math.max(0, S.stats.thirst - (S.difficulty === 'dev' ? 0 : 2 * (season.thirstMul || 1) * (S.furniture.tank ? 0.8 : 1) * (1 - mb.cons) * diffMul));
    if (S.stats.hunger <= 0 || S.stats.thirst <= 0) {
      S.stats.hp -= 10;
      log('饥渴正在侵蚀你的身体……（-10 生命）', 'danger');
      if (S.stats.hp <= 0) return die('你倒在荒野里，再也没能站起来。');
    }
    // 寒冷
    const sc = sceneOf(S.scene);
    const coldNeed = (sc && sc.id==='peak') ? 4 : (season.cold ? 2 : 0);
    const warm = warmth();
    if (coldNeed > 0 && warm < coldNeed) {
      S.statuses.cold = true;
      S.stats.hp -= 5;
      log('刺骨的寒冷让你浑身发抖。（-5 生命，请尽快保暖）', 'danger');
      if (S.stats.hp <= 0) return die('你在风雪中睡着了，再也没醒。');
    } else if (coldNeed === 0 || warm >= coldNeed) {
      if (S.statuses.cold && warm >= coldNeed) { S.statuses.cold = false; log('你渐渐暖和过来。'); }
    }
    // 中毒/流血
    if (S.statuses.poison > 0) { S.statuses.poison--; S.stats.hp -= 3; log('毒性发作（-3 生命）', 'danger'); if (S.stats.hp <= 0) return die('毒素流遍了全身……'); }
    if (S.statuses.bleed > 0) { S.statuses.bleed--; S.stats.hp -= 5; log('伤口还在渗血（-5 生命）', 'danger'); if (S.stats.hp <= 0) return die('你因失血过多而死。'); }
    // 食物变质
    if (S.foodExp) {
      for (const fid in S.foodExp) {
        if (S.foodExp[fid] < S.tick) {
          const q = invCount(fid);
          if (q > 0) { delete S.inv[fid]; addItem('rot', q, true); log(`${ITEMS[fid].name}×${q} 已经变质，变成了腐烂物（可当肥料）。`, 'warn'); }
          delete S.foodExp[fid];
        }
      }
    }
    // 精神：深夜野外
    if (isNight && S.scene !== 'camp' && S.scene !== 'shore') {
      S.stats.spirit = Math.max(0, S.stats.spirit - 2);
      if (S.stats.spirit < 30 && chance(0.3)) log('黑暗里似乎有眼睛在看你……（精神恍惚）', 'warn');
    }
    change();
  };

  function addMin(m) {
    S.tick = (S.tick || 0) + m;
    const startHour = Math.floor(S.minute / 60);
    S.minute += m;
    let crossed = 0;
    while (S.minute >= 1440) { S.minute -= 1440; S.day++; crossed++; }
    const endHour = Math.floor(S.minute / 60);
    const hoursPassed = crossed * 24 + (endHour - startHour);
    for (let i = 0; i < hoursPassed; i++) HOUR_EFFECTS();
    // 亚特兰蒂斯：潜水服/氧气罩耐久消耗（礁石栖息地减半）
    if (S.scene === 'atlantis' && hoursPassed > 0) {
      const step = (S.zone === 'habitat') ? 2 : 1;
      S._diveAcc = (S._diveAcc || 0) + hoursPassed;
      while (S._diveAcc >= step) {
        S._diveAcc -= step;
        if (['diveSuit','diveSuit2'].includes(S.equipment.cloth)) drainById(S.equipment.cloth);
        if (!hasRelic('atlantisSeed') && ((S.toolkit || []).includes('diveMask') || hasItem('diveMask'))) drainById('diveMask');
      }
      const hasO2 = (S.toolkit || []).includes('diveMask') || hasItem('diveMask') || hasRelic('atlantisSeed');
      if (!hasO2) { S.stats.hp -= 3 * hoursPassed; log(`缺氧！你眼前阵阵发黑（-${3 * hoursPassed} 生命）`, 'danger'); if (S.stats.hp <= 0) S.stats.hp = 0; }
      if (S.dur && S.dur.diveMask !== undefined && S.dur.diveMask > 0 && S.dur.diveMask < 10 && !S._o2warn) { S._o2warn = 1; log('氧气罩耐久不足 10，尽快回礁石栖息地修补！', 'danger'); }
    }
    if (S.buffs) { for (const k in S.buffs) if ((S.buffs[k].until||0) <= (S.tick||0)) delete S.buffs[k]; }
    if (crossed > 0) newDay();
    change();
  }

  // ---------- 待收：背包满时的产出暂存（不凭空消失） ----------
  function deliverToBag(id, n) {
    if (addItem(id, n, true)) return true;
    S.furnPending = S.furnPending || {};
    S.furnPending[id] = (S.furnPending[id] || 0) + n;
    log(`背包满了：${ITEMS[id].name}×${n} 先记在待收里，腾出空间后自动收下。`, 'warn');
    return false;
  }
  function flushPending() {
    if (!S.furnPending) return;
    for (const id of Object.keys(S.furnPending)) {
      while (S.furnPending[id] > 0) {
        if (!addItem(id, 1, true)) break;
        S.furnPending[id]--;
      }
      if (S.furnPending[id] <= 0) delete S.furnPending[id];
    }
  }

  // ---------- 牧场：鸡舍 / 羊圈（各最多 3 只） ----------
  // 羊：每天吃 1 干草 → 产 1 羊毛，40~60 天后寿终（留 3 兽肉）
  // 鸡：小鸡连喂 5 天小麦变母鸡；母鸡每天吃 1 小麦 → 下 1 蛋，20~30 天后寿终（留 1 兽肉）
  // 规则：没喂上就不产出也不长大（不会饿死）；背包满时产出进"待收"，次日补发。
  const LIVE_CAP = 3, CHICK_DAYS = 5, SHEEP_MEAT = 3, HEN_MEAT = 1;
  function liveState() {
    if (!S.livestock || typeof S.livestock !== 'object') S.livestock = { pen: [], coop: [], autoFeed: true };
    const L = S.livestock;
    if (!Array.isArray(L.pen)) L.pen = [];
    if (!Array.isArray(L.coop)) L.coop = [];
    if (L.autoFeed === undefined) L.autoFeed = true;
    return L;
  }
  function liveCount(kind) { return liveState()[kind].length; }
  function liveFull(kind) { return liveCount(kind) >= LIVE_CAP; }
  function liveInfo(kind) {
    const L = liveState();
    const isPen = kind === 'pen';
    const feedId = isPen ? 'hay' : 'wheat';
    return {
      kind, isPen, built: !!S.furniture[kind], cap: LIVE_CAP, count: L[kind].length, autoFeed: L.autoFeed,
      feedId, feedName: ITEMS[feedId].name, feedHave: invCount(feedId),
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
    if (liveFull('coop')) return { ok:false, reason:`鸡舍已满（最多 ${LIVE_CAP} 只）。` };
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
      if (!L.autoFeed || !hasItem('hay', 1)) { o.lackHay++; continue; }
      removeItem('hay', 1); a.age++; o.wool++; o.hayUsed++;
      if (a.age >= a.life) { L.pen.splice(i, 1); o.deadSheep++; o.meat += SHEEP_MEAT; }
    }
    for (let i = L.coop.length - 1; i >= 0; i--) {
      const b = L.coop[i];
      if (!L.autoFeed || !hasItem('wheat', 1)) { o.lackWheat++; continue; }
      removeItem('wheat', 1);
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
  }
  // 草地陷阱：布下陷阱后的次日去草地，50% 概率捕到羊羔
  function checkGrasslandTrap() {
    if (!S.traps || !(S.traps.placed > 0)) return false;
    if (S.day <= (S.traps.day || 0)) return false;   // 当天布下的要等第二天
    if (!chance(0.5)) { log('你检查了草地上的陷阱——还没被触发，明天再来看看。', 'sys'); return false; }
    S.traps.placed -= 1;
    showOverlay({ title:'陷阱有收获', text:'你拨开草丛：陷阱里困着一头羊羔，正咩咩地叫。', choices:[
      { label:'杀灭', hint:'收获兽肉×2、兽皮×1', ok:()=>{
        deliverToBag('meat', 2); deliverToBag('hide', 1);
        log('你结束了它的挣扎，收获兽肉×2、兽皮×1。', 'good');
        change();
      } },
      { label:'放回羊圈', hint:'羊圈未满就能留下它', ok:()=>{
        const r = addSheep();
        if (r.ok) log(`羊羔被牵回羊圈，现在羊圈里有 ${r.count} 只羊。`, 'good');
        else log(`${r.reason}只能把它放了。`, 'warn');
        change();
      } },
    ]});
    return true;
  }

  function seasonInfo() {
    const d = ((S.day - 1) % 60) + 1;
    return SEASONS.find(s => d >= s.days[0] && d <= s.days[1]) || SEASONS[0];
  }
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
    // 先补发昨天没收下的产出（背包满时暂存在"待收"里，不会凭空消失）
    flushPending();
    // 家具的每日产出（家具表里写了 dailyItems 的才会触发）
    const f = S.furniture;
    for (const fur of FURNITURE) {
      if (!fur.dailyItems || !f[fur.id]) continue;
      for (const id in fur.dailyItems) {
        const n = fur.dailyItems[id] || 1;
        if (deliverToBag(id, n)) log(`${fur.name}有产出：${ITEMS[id].name}×${n}。`, 'good');
      }
    }
    // 牧场：鸡舍 / 羊圈（喂食 → 产出 → 成长 → 寿终）
    livestockNewDay();
    if (f.rainfilter && (S.weather === 'rain' || S.weather === 'storm')) { const w = rnd(2, 4); addItem('water', w, true); log(`滤雨器替你接下了 ${w} 份雨水（淡水）。`, 'good'); }
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
    // 陷阱不再在清晨自动结算：改成"次日去草地才有 50% 触发羊羔事件"（见 checkGrasslandTrap）
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
    // 灵灰：清晨偶尔跟你说说话
    if (S.identity === 'linghui' && chance(0.5)) log(LINGHUI_LINES[Math.floor(Math.random()*LINGHUI_LINES.length)], 'blue');
    // 保存"昨日日出"快照（困难难度回退用）
    if (S._snap && S._snap.day) S._snap.prevday = JSON.parse(JSON.stringify(S._snap.day));
    snapshot('day');
    save();
  }

  // 夜袭剧情按难度推迟：越简单给越多发育时间（简单14 / 普通12 / 困难10 / 传奇7）
  const RAID_DAY = { easy: 14, normal: 12, hard: 10, legend: 7 };
  function raidDay() { return (S && RAID_DAY[S.difficulty]) || 7; }
  function storyDay(ev) { return ev.id === 'e_wolfraid' ? raidDay() : ev.day; }
  function triggerStory(ev) {
    if (ev.id === 'e_driftbottle') {
      addItem('driftbottle', 1, true);
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
  function snapshot(kind) {
    S._snap = S._snap || {};
    S._snap[kind] = JSON.parse(JSON.stringify({
      v:S.v, identity:S.identity, difficulty:S.difficulty,
      day:S.day, minute:S.minute, stats:S.stats, inv:S.inv, equipment:S.equipment,
      buildings:S.buildings, furniture:S.furniture, crops:S.crops, flags:S.flags,
      fame:S.fame, exp:S.exp, statuses:S.statuses, weather:S.weather, laochao:S.laochao,
      scene:S.scene, zone:S.zone, diary:S.diary, seen:S.seen, pointUses:S.pointUses,
      tick:S.tick, foodExp:S.foodExp, relics:S.relics, relicSlots:S.relicSlots, relicEquip:S.relicEquip, dur:S.dur, toolkit:S.toolkit, toolDurs:S.toolDurs, tut:S.tut, equipIdx:S.equipIdx, weaponNames:S.weaponNames,
    }));
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

  function save() {
    try {
      const copy = JSON.parse(JSON.stringify(S));
      copy._snap = undefined;   // 持久化存档不带快照；内存内快照保留，供死亡回退
      const prev = localStorage.getItem('guyuyizhang_save');
      if (prev) localStorage.setItem('guyuyizhang_save_bak', prev);   // 滚动备份：始终保留上一份
      localStorage.setItem('guyuyizhang_save', JSON.stringify(copy));
    } catch(e) { console.warn('save failed', e); }
  }
  function load() {
    try {
      let raw = localStorage.getItem('guyuyizhang_save');
      if (!raw) raw = localStorage.getItem('guyuyizhang_save_bak');   // 主档缺失则用备份
      if (!raw) return false;
      S = JSON.parse(raw);
      if (!S || typeof S !== 'object') throw new Error('bad save');
      // ---- 兼容旧存档：补全缺失字段，避免运行期崩溃被判为读档失败 ----
      if (!S.skill) S.skill = { craft:0, gather:0, combat:0 };
      if (!S.toolkit) S.toolkit = [null, null, null];
      if (!S.toolDurs) S.toolDurs = {};
      if (!S.equipIdx) S.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
      if (!S.flags) S.flags = {};
      if (!S.log) S.log = [];
      if (!S.seen) S.seen = {};
      if (!S.killCount) S.killCount = {};
      if (!S.sold) S.sold = {};
      if (!S.pointUses) S.pointUses = {};
      if (!S.livestock || typeof S.livestock !== 'object') S.livestock = { pen: [], coop: [], autoFeed: true };
      if (!Array.isArray(S.livestock.pen)) S.livestock.pen = [];
      if (!Array.isArray(S.livestock.coop)) S.livestock.coop = [];
      if (S.livestock.autoFeed === undefined) S.livestock.autoFeed = true;
      if (!S.traps || typeof S.traps !== 'object') S.traps = { placed: 0 };
      if (!S.crops) S.crops = [];
      if (S.farmExt === undefined) S.farmExt = 0;
      if (!S.diary) S.diary = [];
      if (!S.dur) S.dur = {};
      if (!S.inv) S.inv = {};
      if (!S.furniture) S.furniture = {};
      if (!S.exp) S.exp = { gather:0, craft:0, combat:0 };
      if (!S.buildings) S.buildings = { house:0, fire:0, storage:0, wall:0, watch:0, dock:0, farm:0 };
      if (!S.equipment) S.equipment = { weapon:null, weapon2:null, armor:null, cloth:null, accessory:null };
      if (!S.statuses) S.statuses = { bleed:0, poison:0, cold:false, fear:0 };
      if (!S.stats) S.stats = { hp:100, stamina:100, hunger:100, thirst:100, spirit:100 };
      if (!S.relicEquip) S.relicEquip = [null, null, null];
      if (!S.weaponNames) S.weaponNames = {};
      if (S.houseExt === undefined) S.houseExt = 0;
      if (S.storeExt === undefined) S.storeExt = 0;
      if (S.gatherCount === undefined) S.gatherCount = 0;
      if (S.craftCount === undefined) S.craftCount = 0;
      // ↑ 先补全所有字段，再动数据（顺序很重要：以前耐久整理跑在 S.inv 补全之前，缺字段的老档会抛异常被判读档失败）
      for (const id in ITEMS) if (DURA[id] !== undefined) durList(id);   // 老存档：把耐久对齐成"一件一条"的实例数组
      // 老存档修复：旧版守卫会把「深殿核心」点位顶掉（标记已用却没拿到核心），把多出来的标记退回去，避免结局被卡死
      {
        const DCORE_PTS = ['atl_dcore_coral','atl_dcore_trench','atl_dcore_wreck','atl_dcore_abyss'];
        const flagged = DCORE_PTS.filter(id => S.flags['pt_' + id]);
        const cores = Math.min(4, S.inv.deepCore || 0);
        let extra = flagged.length - cores;
        for (const id of flagged) { if (extra <= 0) break; delete S.flags['pt_' + id]; extra--; }
      }
      if (S.missStreak === undefined) S.missStreak = 0;
      if (S.atlantis === undefined) S.atlantis = null;
      autoToolkit();
      return true;
    } catch(e) {
      console.warn('load failed, try backup', e);
      // 主档解析失败时把原始串留底，别让后面的保存把它冲掉
      try { const broken = localStorage.getItem('guyuyizhang_save'); if (broken) localStorage.setItem('guyuyizhang_save_corrupt', broken); } catch (e0) {}
      try { const bak = localStorage.getItem('guyuyizhang_save_bak'); if (bak) { S = JSON.parse(bak); autoToolkit(); return true; } } catch(e2) {}
      return false;
    }
  }
  function hasSave() { try { return !!localStorage.getItem('guyuyizhang_save'); } catch(e){ return false; } }
  function wipeSave() { try { localStorage.removeItem('guyuyizhang_save'); } catch(e){} }

  // ---------- 新游戏 ----------
  function newGame(identity, difficulty) {
    S = {
      v:1, identity, difficulty,
      day:1, minute:8*60, tick:0, weather:'sun', weatherRolled:true,
      stats:{ hp:100, stamina: 100 + (DIFFICULTIES[difficulty].stamina || 0), hunger:100, thirst:100, spirit:100 },      statuses:{ bleed:0, poison:0, cold:false, fear:0 },
      inv:{}, capacity:20, foodExp:{}, relics:[], relicSlots:0, relicEquip:[null,null,null], dur:{}, toolDurs:{}, tut:null, equipIdx:{weapon:0, weapon2:0, armor:0, cloth:0, accessory:0}, weaponNames:{},
      equipment:{ weapon:null, weapon2:null, armor:null, cloth:null, accessory:null },
      buildings:{ house:0, fire:0, storage:0, wall:0, watch:0, dock:0, farm:0 },
      furniture:{}, crops:[], farmExt:0,
      scene:'camp', zone:null, weatherWarned:null, skill:{ craft:0, gather:0, combat:0 }, toolkit:[null, null, null],
      laochao:{ nextVisit:5, arrived:false, arrivedDay:0, done:{}, accepted:{} },
      fame:0,
      exp:{ gather:0, craft:0, combat:0 },
      flags:{}, diary:[], log:[], seen:{},
      pointUses:{}, killCount:{}, sold:{}, hpLostTotal:0,
      livestock:{ pen:[], coop:[], autoFeed:true }, traps:{ placed:0 },
      death:null, ending:null, combat:null,
    };
    const idn = IDENTITIES[identity];
    for (const k in idn.items) addItem(k, idn.items[k], true);
    // 首次引导：每局开始必触发一次（引导做石镐+装备）
    S.tut = (S.inv && S.inv.pickStone > 0) ? null : 1;
    // 序章物资
    addItem('wood', 6, true); addItem('branch', 6, true); addItem('thatch', 8, true);
    addItem('flint', 2, true); addItem('stone', 3, true); addItem('water', 4, true);
    addItem('fish', 2, true);
    // 难度开局物品（求生存者 10 随机食物+长矛；冒险家 5 随机食物；幸存者/传奇一无所有）
    const stStart = (DIFFICULTIES[difficulty] && DIFFICULTIES[difficulty].start) || {};
    if (stStart.food) {
      const pool = ['berry','wildveg','fish','meat','mushroom','bambooShoot','cactusfruit'];
      for (let i = 0; i < stStart.food; i++) addItem(pool[Math.floor(Math.random() * pool.length)], 1, true);
    }
    if (stStart.spear) addItem('spear', stStart.spear, true);
    // 历代遗章：家传补给
    const mbK = metaBonus();
    if (mbK.kit > 0) { addItem('torch', mbK.kit, true); addItem('herbPaste', mbK.kit, true); }
    // 隐藏的开发者难度：全资源×100、背包 200 格、全图鉴、全神器
    if (difficulty === 'dev') {
      S.capacity = 10000;   // 开发者背包锁 10000 格
      // 所有物品自带：工具/武器/装备(不可叠) 各1、可堆叠资源各100（盾牌等也一起给）
      for (const k in ITEMS) addItem(k, (ITEMS[k].stack === 1) ? 1 : 100, true);
      const mm = metaState();
      for (const k in ENEMIES) { S.seen['mon_'+k] = 1; mm.seenMon[k] = 1; }
      for (const k in ITEMS) if (['mat','special','bp','seed'].includes(ITEMS[k].cat)) { S.seen[k] = 1; mm.seenItems[k] = 1; }
      S.relics = Object.keys(RELICS);
      S.relicSlots = 3;
      S.relicEquip = Object.keys(RELICS);
      for (const f of FURNITURE) S.furniture[f.id] = true;                 // 全家具
      for (const f of ATLANTIS_FURNITURE) { S.atlantis = S.atlantis || { camp:{ furniture:{} } }; if (!S.atlantis.camp) S.atlantis.camp = { furniture:{} }; if (!S.atlantis.camp.furniture) S.atlantis.camp.furniture = {}; S.atlantis.camp.furniture[f.id] = true; }
      S.houseExt = 3;                                                      // 扩建满
      S.storeExt = 3;                                                      // 仓库扩建也拉满
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
    diaryAdd('海难之后，我在这片沙滩上醒来。天是灰的，海也是。');
    log('第 1 天。你从沙滩上醒来，海浪把船的残骸和你一起冲上了岸。', 'sys');
    log('教程：先在这里生起篝火、搭好帐篷，再出去看看。', 'sys');
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
    if (sc.needWarm && warmth() < sc.needWarm) return { ok:false, reason:`山顶严寒，需「穿着」保暖衣物（毛皮大衣保暖+6，请把它装备到衣物栏）；当前保暖 ${warmth()}<${sc.needWarm}` };
    return { ok:true };
  }
  function atlantisTeleport(dir) {
    if (dir === 'to') {
      if (S.flags.ended_C && !(S.atlantis && S.atlantis.stoneActive)) { log('山顶的传送石还没被激活——先回山顶，用三块石板解出它的符文。', 'warn'); return { ok:false }; }
      const chk = canTravel('atlantis');
      if (!chk.ok) { log(chk.reason, 'warn'); return { ok:false, reason:chk.reason }; }
      S.scene = 'atlantis'; S.zone = 'habitat';
      log('传送石亮起，你瞬间出现在礁石栖息地。', 'good');
      change(); return { ok:true };
    }
    S.scene = 'camp'; S.zone = null;
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
  function travelCost(id) {
    const dist = travelDist(S.scene, id);
    let mul = 1;
    if (S.weather === 'fog') mul *= 1.5;
    if (S.furniture.signpost) mul *= 0.9;
    if (S.flags.horse) mul *= 0.7;
    if (isNight() && !hasItem('torch')) mul *= 1.5;
    const time = Math.round(dist * mul * (1 - metaBonus().travel));
    const energy = Math.max(1, Math.round(time / 15) * 5);
    return { time, energy };
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
    S.scene = id; S.zone = (id === 'atlantis') ? 'habitat' : null;   // 海底默认落在礁石栖息地
    if (id === 'atlantis' && S.identity === 'linghui') log('灵灰贴着水面向下望，忽然安静下来：「我好像……见过这里。」', 'blue');
    const d = sceneDesc(sc);
    log(d);
    const trapFired = (id === 'grassland') ? checkGrasslandTrap() : false;   // 草地：看看昨天布下的陷阱
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
    // 亚特兰蒂斯：区域之间移动要游过去，消耗时间与体力
    const fromZone = S.zone;
    let swam = false;
    if (sc.id === 'atlantis' && S.zone && S.zone !== z) {
      const A = ATLANTIS_MAP_ARROWS[S.zone], B = ATLANTIS_MAP_ARROWS[z];
      let t = (A && B) ? Math.max(15, Math.round(Math.hypot(A.x - B.x, A.y - B.y) * 2.4)) : 30;
      let ec = Math.max(5, Math.round(t / 15) * 5);
      if (S.equipment.accessory === 'thruster') { t = Math.max(8, Math.round(t / 2)); ec = Math.max(3, Math.round(ec / 2)); }
      if (S.stats.stamina < ec) { log('你筋疲力尽，游不动了，先回礁石栖息地歇歇。', 'warn'); return; }
      S.stats.stamina -= ec;
      addMin(t);
      log(`你在海底游了 ${t} 分钟（消耗体力 ${ec}）。`, 'sys');
      swam = true;
    }
    S.zone = z;
    log(`你来到${sc.zones[z].name}。`);
    if (sc.zones[z].desc) log(sc.zones[z].desc);
    change();
    // 深海区移动：40% 被随机海底怪物拦截。
    // 关键：移动（时间/体力/区域）已经结算完毕，战斗不会取消或重来这次移动。
    if (swam && !S.combat && typeof ATLANTIS_DEEP_ZONES !== 'undefined' && (ATLANTIS_DEEP_ZONES.includes(z) || ATLANTIS_DEEP_ZONES.includes(fromZone))) {
      if (chance(0.4)) {
        const pool = ['deepGuard','tentacle','mechGuard'].filter(k => ENEMIES[k]);
        const en = ENEMIES[pool[Math.floor(Math.random() * pool.length)]];
        log(`深水里一道影子直冲你而来——${en.name}拦住了去路！`, 'danger');
        startFight(en);
      }
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
  function pointAvailable(p) {
    if (p.once && S.flags['pt_'+p.id]) return false;
    if (p.firstDays && S.day > p.firstDays) return false;   // 仅前N天有，过期不可用
    if (p.id === 'grass_horse' && S.flags.horse) return false;   // 野马已驯服则不再出现
    if (p.id === 'peak_slate' && S.flags.slateGuardDone) return false;   // 石板守卫已击败
    if (p.id === 'grass_wolfden' && S.flags.wolfKingDone) return false;   // 狼王已击败
    if (p.id === 'sea_pirate') { if (S.day < 20) return false; }   // 第20天起可反复讨伐（每天一次）
    if (p.daily) { const used = (S.pointUses[p.id] || 0); if (used >= p.daily) return false; }
    if (p.cond) {
      if (p.cond.rain && !(S.weather==='rain'||S.weather==='storm')) return false;
      if (p.cond.season && !p.cond.season.includes(seasonInfo().name)) return false;
      if (p.cond.day && S.day < p.cond.day) return false;
      if (p.cond.dayMod && (S.day % p.cond.dayMod) !== 0) return false;   // 例：海盗船长只在 5 的倍数天露面
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
    if (!pointAvailable(p)) {
      if (p.needLight && lightLevel() < p.needLight) return `太黑了，需要${['','潜水护目镜','弱光防水手电','防水强光潜水手电'][p.needLight] || '照明装备'}才能探索这里。`;
      if (p.needCore && invCount('deepCore') < p.needCore) return `圣殿之门需要 ${p.needCore} 块深殿核心（当前 ${invCount('deepCore')} 块）。去四片海域的遗迹里找齐吧。`;
      if (p.need && p.need.item && !hasItem(p.need.item)) {
        if (p.need.item === 'torch') return '洞里太黑，需要火把才能深入。先做一支火把吧。';
        if (p.need.item === 'rod') return '需要鱼竿才能垂钓。编一根竹鱼竿吧。';
        return `需要${ITEMS[p.need.item].name}。`;
      }
      if (p.need && p.need.tool && !hasTool(p.need.tool, p.need.tier||1)) {
        const tN = { axe:'斧', pick:'镐', knife:'刀', hoe:'锄', net:'渔网' }[p.need.tool] || '工具';
        if ((p.need.tier||1) === 1) return `需要一把${tN}。用燧石打一把石${tN}吧。`;
        return `需要${['','石','铁','钢','玄铁'][p.need.tier]||''}${tN}（${p.need.tier}级）才能凿动这里。`;
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
      if (p.once && S.flags['pt_'+p.id]) return '这里你早已搜刮过。';
      if (p.id === 'grass_horse' && S.flags.horse) return '这匹野马已被你驯服了。';
      return '现在还做不了这件事。';
    }
    return 'ok';
  }

  function pointReason(p) {
    if (!pointAvailable(p)) return '现在做不了这件事。';
    if (S.stats.stamina < (p.energy || 10)) return '体力不支，先休息吧。';
    return null;
  }
  function doPoint(p) {
    if (!S.toolkit || !S.toolkit.some(Boolean)) autoToolkit();
    if (!pointAvailable(p)) { const why = pointStatus(p); log(why && why !== 'ok' ? why : '现在做不了这件事。', 'warn'); return; }
    const st = S.stats;
    if (st.stamina < (p.energy || 10)) { log('体力不支，先休息吧。', 'warn'); return; }
    const tt = p.need && p.need.tool ? bestToolTier(p.need.tool) : 1;   // 当前用的最好工具等级
    const en = Math.max(2, Math.round((p.energy || 10) * (1 - (tt - 1) * 0.12)));   // 等级越高越省体力
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

    // 守卫已清（或本点无守卫）：这里才真正开始本次采集
    S.pointUses[p.id] = (S.pointUses[p.id] || 0) + 1;
    if (p.once) S.flags['pt_'+p.id] = 1;
    st.stamina -= en;
    const dm2 = (DIFFICULTIES[S.difficulty] && DIFFICULTIES[S.difficulty].drainMul) || 1;
    st.hunger = Math.max(0, st.hunger - Math.round(4 * dm2));
    st.thirst = Math.max(0, st.thirst - Math.round(5 * dm2));

    if (p.type === 'gather') {
      let got = [];
      // 遇袭判定（在本次采集结算"之前"决定；但战斗放到结算完成后触发，产出照拿）
      {
        const sc0 = sceneOf(S.scene);
        const danger = sc0 ? sc0.danger : 3;
        const pool = (typeof AMBUSH_MONSTERS !== 'undefined' ? AMBUSH_MONSTERS[S.scene] : []) || [];
        let amb = 0.10, rabbit = 0;
        if (danger <= 2) { amb = 0.05; rabbit = 0.10; }
        else if (danger >= 4) { amb = 0.20; }
        if (rabbit && chance(rabbit) && ENEMIES.rabbit) ambush = ENEMIES.rabbit;
        else if (pool.length && chance(amb)) ambush = ENEMIES[pool[Math.floor(Math.random() * pool.length)]];
        if (!ambush && p.risk && ENEMIES[p.risk] && chance(0.25)) ambush = ENEMIES[p.risk];
      }
      let weff = (S.scene === 'atlantis') ? 1 : WEATHER[S.weather].eff;
      if (p.cond && p.cond.rain && (S.weather === 'rain' || S.weather === 'storm')) weff = 1.0;   // 雨天专属资源(蘑菇等)雨天不扣收益
      if (weff < 1 && S.weatherWarned !== S.weather) { S.weatherWarned = S.weather; log(`【${WEATHER[S.weather].name}】干活收益会打折扣（-${Math.round((1 - weff) * 100)}%，雨天专属资源除外）。`, 'warn'); }
      for (const y of p.yields) {
        if (y.chance && !chance(y.chance)) continue;
        let q = qtyParse(y.min === undefined ? 1 : y.min);
        if (y.max !== undefined) q = rnd(y.min, y.max);
        q = Math.max(1, Math.round(q * diff * weff * (1 + (tt - 1) * 0.18 + gatherLv() * 0.1)));
        if (y.id === 'wood' && S.identity === 'woodcutter') q = Math.round(q * 1.5);
        if ((y.id === 'herb') && S.identity === 'herbalist') q = q * 2;
        addItem(y.id, q);
        got.push(`${ITEMS[y.id].name}×${q}`);
      }
      if (p.text) log(p.text);
      // 砍树彩蛋：所有身份通用，10% 概率遇到超大美人松，额外 +7 木材；连着两次遇上解锁紫成就
      if (p.need && p.need.tool === 'axe' && (p.yields || []).some(y => y.id === 'wood')) {
        if (chance(0.1)) {
          addItem('wood', 7);
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
        addItem(rid, 1); got.push(`${ITEMS[rid].name}×1`);
        log(`网里还兜着一条罕见的鱼：${ITEMS[rid].name}！`, 'good');
      }
      if (got.length) log(`获得：${got.join('、')}。`, 'good');
      else log('一无所获。', 'warn');
      S.exp.gather++;
      if (p.need) { if (p.need.tool) drainTool(p.need.tool); if (p.need.item && DURA[p.need.item] !== undefined) drainById(p.need.item); }
    } else if (p.type === 'fish') {
      let q = rnd(1,3) * diff;
      if (S.identity === 'fisher') q = Math.round(q * 1.5);
      q = Math.max(1, Math.round(q * (WEATHER[S.weather].eff)));
      addItem('fish', q);
      log(p.text || '鱼线一动，你提起一条银亮的鱼。');
      log(`获得：鱼×${q}。`, 'good');
      S.exp.gather++;
      if (p.need && p.need.item && DURA[p.need.item] !== undefined) drainById(p.need.item);
    } else if (p.type === 'hunt') {
      const pool = p.enemies.map(e => ENEMIES[e]).filter(e => !(e.nightOnly && !isNight()));
      if (!pool.length) { log('现在这里没有猎物。', 'warn'); return; }
      let e = pick(pool);
      // 白天荒漠白骨守卫不出现
      if (e.id === 'boneguard' && !isNight()) e = ENEMIES['scorpion'];
      log(p.text);
      startFight(e);
    } else if (p.type === 'trap') {
      if (!removeItem('trap', 1)) { log('没有陷阱了。', 'warn'); return; }
      S.traps = S.traps || { placed: 0 };
      S.traps.placed++;
      S.traps.day = S.day;
      log('你在兽径上布下陷阱，明天去草地上看看有没有收获。', 'good');
      S.exp.gather++;
    } else if (p.type === 'drift') {
      if (chance(0.6)) {
        const roll = Math.random();
        if (roll < 0.5) { const q = rnd(1,3); addItem('wood', q); log(`你捞起几根上游漂来的木头（木材×${q}）。`, 'good'); }
        else if (roll < 0.8) { addItem('plank', 1); log('你捞起一块完整的木板。', 'good'); }
        else if (roll < 0.9) { addItem('driftbottle', 1); log('一个漂流瓶！你把它捞了上来。', 'good'); triggerStory({ id:'e_driftbottle' }); }
        else { log('只有水草和泡沫。'); }
      } else { log('今天河里很干净，什么也没漂来。'); }
      S.exp.gather++;
    } else if (p.type === 'adventure') {
      adventure(p);
    } else if (p.type === 'atlantisGate') {
      const chk0 = canTravel('atlantis');
      if (!chk0.ok) { log(chk0.reason, 'warn'); return; }
      log('你朝沟底那点微光游去……');
      if (onOverlay) { onOverlay({ kind:'atlAnim' }); return; }
      travel('atlantis'); return;
    } else if (p.type === 'atlTrade') {
      if (onOverlay) onOverlay({ kind:'atlTrade', title:'遗失的交易机' });
      return;
    } else if (p.type === 'farm') {
      if (onOverlay) onOverlay({ kind:'farm', title:'耕地', p });
      return;
    } else if (p.type === 'trade') {
      if (p.id === 'cove_black') { if (onOverlay) onOverlay({ kind:'black', title:'黑市 · 独眼' }); }
      return;
    } else if (p.type === 'townTrade') { if (onOverlay) onOverlay({ kind:'town', title:'盐镇集市' }); return; }
    else if (p.type === 'townMission') { if (onOverlay) onOverlay({ kind:'mission', title:'告示板' }); return; }
    else if (p.type === 'townInfo') { if (onOverlay) onOverlay({ kind:'info', title:'酒馆情报' }); return; }

    // 精神见底（<20）时手会抖、脑子发木：采集类点位耗时 +10%
    const spiritLow = (st.spirit === undefined ? 100 : st.spirit) < 20;
    const spiritSlow = (spiritLow && ['gather','fish','trap','drift'].includes(p.type)) ? 1.1 : 1;
    addMin(Math.max(1, Math.round((p.time || 15) * (1 - (tt - 1) * 0.15) * spiritSlow)));
    if (['gather','fish','trap','drift'].includes(p.type)) S.gatherCount = (S.gatherCount || 0) + 1;
    // 采集已完整结算（产出入包、时间体力已扣）；若之前判定遇袭，此刻才进入战斗
    if (p.type === 'gather' && ambush) { log(`你正忙着采集，${ambush.name}突然窜了出来！`, 'danger'); startFight(ambush); return; }
    if (p.type === 'gather' && chance(0.05)) triggerRandomEvent(S.scene);
    change();
  }

  function adventure(p) {
    const id = p.id;
    const choices = [];
    if (id === 'forest_hive') {
      choices.push({ label:'冒险取蜜', hint:'得蜂蜜×1·可能被蜂蛰（-8 生命/中毒）', text:'你屏住呼吸，把手伸进蜂巢。', ok:()=>{ if (chance(0.6)) { addItem('honey',1); log('你抢到了一块滴着蜜的蜂房！获得：蜂蜜×1。','good'); } else { S.stats.hp -= 8; S.statuses.poison = Math.max(S.statuses.poison, 3); log('野蜂疯狂扑来！你被蛰得满头包。（-8 生命，中毒）','danger'); if (S.stats.hp<=0) die('野蜂的毒要了你的命。'); } addMin(20); } });
      choices.push({ label:'还是算了', hint:'无风险', ok:()=>{ log('你悄悄退开，蜂群没有发现你。'); } });
    } else if (id === 'quarry_pit') {
      choices.push({ label:'进去看看', hint:'可能遇蜘蛛，或得矿石', ok:()=>{ if (chance(0.35)) { log('蛛网后闪过黑影！'); startFight(ENEMIES.spider); } else { addItem('stone', rnd(2,4)); addItem('ironore', rnd(1,2)); log('你在废矿坑里敲下不少矿石。','good'); addMin(30);} } });
      choices.push({ label:'太黑了，退出来', hint:'无风险', ok:()=>{ log('你退回了阳光下。'); } });
    } else if (id === 'grass_horse') {
      choices.push({ label:'慢慢接近', hint:'消耗茅草×5 · 50%驯服(赶路-30%)，失败次日可再试', ok:()=>{
        if (!hasItem('thatch', 5)) { log('野马警觉地后退。你需要 5 根茅草(当草料)来慢慢接近它。', 'warn'); return; }
        removeItem('thatch', 5);
        if (chance(0.5)) { S.flags.horse = 1; log('野马接受了你的草料，从此营地有了马。赶路时间-30%！','good'); diaryAdd('我驯服了一匹野马。'); }
        else { S.stats.hp -= 10; log('野马受了惊，把你掀翻在地，草料也被它扬了。（-10 生命，明日可再试）','danger'); if (S.stats.hp<=0) die('野马的一蹄要了你的命。'); }
        addMin(30); } });
      choices.push({ label:'不打扰它', hint:'无风险', ok:()=>{ log('你远远看了一会儿，走开了（明日可再来）。'); } });
    } else if (id === 'desert_remains') {
      choices.push({ label:'搜刮包裹', hint:'可能得金币，或窜出沙蝎（-8 生命）', ok:()=>{ if (chance(0.5)) { const n = rnd(2,4); addItem('coin', n); log(`破包裹里竟有几枚古金币！获得：金币×${n}。`,'good'); } else { S.stats.hp -= 8; log('包裹里窜出一条沙蝎！（-8 生命）','danger'); if (S.stats.hp<=0) die('你倒在了白骨旁。'); } addMin(20);} });
      choices.push({ label:'合十离开', hint:'精神+2', ok:()=>{ S.stats.spirit = Math.min(100, S.stats.spirit+2); log('你为他掩上一点沙，心里平静了一些。'); } });
    } else if (id === 'cave_slate') {
      showOverlay({ title:'洞中遗迹', text:'岩壁上刻满了与荒漠白骨同源的古老文字。你在石缝里找到一块脱落的石板。', choices:[{ label:'带走石板', ok:()=>{ addItem('slate',1); log('获得：石板×1。','good'); diaryAdd('洞深处的古文字。这座岛比我想的更老。'); } }]});
      return;
    } else if (id === 'peak_altar') {
      showOverlay({ title:'远古祭坛', text:'祭坛中央的凹槽形状奇异，四周刻着与石板相同的文字。你搬开碎石，露出一件蒙尘的遗物。', choices:[{ label:'带走遗物', ok:()=>{ addItem('relic',1); log('获得：遗物×1。','good'); diaryAdd('山顶祭坛的遗物，冰凉得像在发烫。'); } }]});
      return;
    } else if (id === 'peak_eagle') {
      choices.push({ label:'攀上岩壁', hint:'60% 得鹰羽；失手会惊动雪羽鹰', ok:()=>{
        const ok60 = chance(0.6);
        if (ok60) { const n = rnd(1,2); addItem('eaglefeather', n); log(`鹰不在巢里。获得：鹰羽×${n}。`,'good'); }
        addMin(20);
        if (!ok60) { log('你刚摸到巢沿，一道白影尖啸着俯冲下来——是雪羽鹰！', 'danger'); startFight(ENEMIES.eagle); }
      } });
      choices.push({ label:'太危险了', hint:'无风险', ok:()=>{ log('你放弃了。'); } });
    } else if (id === 'sea_rescue') {
      showOverlay({ title:'求救信号', text:'礁石上绑着一面破布条，旁边有个奄奄一息的年轻人。他叫小满，是商船的船员，风暴里落了水。', choices:[
        { label:'救他上筏（需要淡水×2）', need:{ water:2 }, ok:()=>{ removeItem('water',2); S.flags.xiaoman = 1; log('小满成了营地的一员：采集+10%，夜袭前他会预警。','good'); diaryAdd('我救了一个叫小满的人。岛上不再只有我一个了。'); } },
        { label:'给他水，但不带他走', ok:()=>{ log('你把水留给了他，独自离开。'); } },
      ]});
      return;
    } else if (id === 'cove_chest') {
      choices.push({ label:'撬开它', hint:'70%得金币，或触发机关（-10 生命）', ok:()=>{ if (chance(0.7)) { const n = rnd(2,5); addItem('coin', n); log(`生锈的宝箱里滚出金币！获得：金币×${n}。`,'good'); } else { S.stats.hp -= 10; log('箱子里有机关！飞针擦过你的手臂。（-10 生命）','danger'); if (S.stats.hp<=0) die('锈箱里的机关要了你的命。'); } addMin(20);} });
      choices.push({ label:'不敢碰', hint:'无风险', ok:()=>{ log('你离开了宝箱。'); } });
    } else if (id === 'ruins_slate') {
      showOverlay({ title:'遗迹石板', text:'断柱之间，一块石板完整无缺，刻着与洞中相同的文字。', choices:[{ label:'带走石板', ok:()=>{ addItem('slate',1); log('获得：石板×1。','good'); } }]});
      return;
    } else if (id === 'ruins_explore') {
      choices.push({ label:'摸进废墟', hint:'可能得金币/遇守卫/迷路', ok:()=>{ const r = Math.random(); if (r < 0.4) { const n = rnd(2,5); addItem('coin', n); if (chance(0.3)) addItem('crystal',1); log(`你在废墟里找到古金币×${n}。`,'good'); } else if (r < 0.7) { log('石像的阴影动了！'); startFight(ENEMIES.guard); } else { S.stats.spirit = Math.max(0, S.stats.spirit-8); log('你在断壁间迷了路，许久才转出来。（精神-8）','warn'); } addMin(30);} });
      choices.push({ label:'只在边缘看看', hint:'无风险', ok:()=>{ log('你沿着外墙走了一圈。'); } });
    } else {
      log('你在这里转了一圈，没什么特别的。');
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
  function triggerRandomEvent(sceneId) {
    const pool = RANDOM_EVENTS.filter(e => e.scene === sceneId && !(e.once && S.flags['re_'+e.id]) && (!e.cond || (e.cond.rain ? (S.weather==='rain'||S.weather==='storm') : true) || (e.cond.zone ? S.zone === e.cond.zone : true) || (e.cond.day ? S.day >= e.cond.day : true) || (e.cond.houseBelow ? S.buildings.house < e.cond.houseBelow : true)) && (e.id !== 're_pirates' || (S.day % 5 === 0 && S.laochao.accepted && S.laochao.accepted.c4 !== undefined && S.day >= S.laochao.accepted.c4 && S.day <= S.laochao.accepted.c4 + 2 && !S.flags.boss_pirateBoss)));
    if (!pool.length) return;
    const total = pool.reduce((a,b)=>a+b.w,0);
    let r = Math.random() * total;
    let ev = pool[0];
    for (const e of pool) { r -= e.w; if (r <= 0) { ev = e; break; } }
    if (ev.once) S.flags['re_'+ev.id] = 1;
    log(`【奇遇】${ev.text}`, 'sys');
    showOverlay({ title:'遭遇', text: ev.text, choices: ev.choices.map(c => ({
      label: c.label,
      hint: hintOf(c),
      ok: () => {
        log(`你选择了：${c.label}。`, 'sys');
        if (c.need) { if (!Object.keys(c.need).every(k => hasItem(k, c.need[k]))) { log('材料不够。', 'warn'); return; } Object.keys(c.need).forEach(k => removeItem(k, c.need[k])); }
        if (c.fight) { log('一场遭遇战！'); startFight(ENEMIES[c.fight]); return; }
        if (c.relic) gainRandomRelic();
        if (c.dmg) { S.stats.hp -= c.dmg; log(`你受了伤（-${c.dmg} 生命）。`, 'danger'); if (S.stats.hp <= 0) { die('你没能挺过这次遭遇。'); return; } }
        if (c.status) { S.statuses[c.status] = Math.max(S.statuses[c.status]||0, 3); log('你中毒了。', 'danger'); }
        if (c.spirit) { S.stats.spirit = Math.max(0, Math.min(100, S.stats.spirit + c.spirit)); log(`精神${c.spirit > 0 ? '+' : ''}${c.spirit}。`, c.spirit < 0 ? 'warn' : 'good'); }
        if (c.items) for (const k in c.items) { if (c.chance === undefined || chance(c.chance)) { const q = typeof c.items[k] === 'number' ? c.items[k] : 1; addItem(k, q); log(`获得：${ITEMS[k].name}×${q}。`, 'good'); } }
        if (c.noop) log('你选择了稳妥。');
        if (c.time) { addMin(c.time); log(`（耗时 ${c.time} 分钟）`, 'sys'); }
        change();
      },
    }))});
  }

  function showOverlay(cfg) { if (onOverlay) onOverlay({ kind:'choice', ...cfg }); }

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
  function playerAtk() {   // 近战伤害：一把=该武器；两把=轮流使用，取两把平均（更稳）
    const ax = (S.equipment.accessory && ITEMS[S.equipment.accessory] && ITEMS[S.equipment.accessory].atk) || 0;
    const me = meleeWeapons();
    const wAtk = me.length ? Math.round(me.reduce((a,b)=>a+(b.atk||0),0) / me.length) : 0;
    const wNames = (me.length && S.weaponNames) ? ((S.weaponNames[me[0].id] && S.weaponNames[me[0].id].bonus) || 0) : 0;
    let base = 5 + wAtk + wNames + ax + (S.weaponSharpen && S.weaponSharpen.am ? S.weaponSharpen.am : 0) + (S.skill.combat || 0) + buffV('atk');
    return Math.round(base * (1 + metaBonus().atk));
  }
  function rangedAtk() {   // 射击伤害：弓攻击 + 箭加成
    const rw = (S.equipment.weapon ? ITEMS[S.equipment.weapon] : null);
    const rw2 = (S.equipment.weapon2 ? ITEMS[S.equipment.weapon2] : null);
    const b = (rw && rw.ranged) ? rw : (rw2 && rw2.ranged ? rw2 : null);
    const ax = (S.equipment.accessory && ITEMS[S.equipment.accessory] && ITEMS[S.equipment.accessory].atk) || 0;
    return Math.round((5 + (b ? b.atk || 0 : 0) + (hasRanged() || 0) + ax + (S.skill.combat || 0)) * (1 + metaBonus().atk));
  }
  function charStats() {
    const me = meleeWeapons();
    const wAtk = me.length ? Math.round(me.reduce((a,b)=>a+(b.atk||0),0) / me.length) : 0;
    const ax = (S.equipment.accessory && ITEMS[S.equipment.accessory] && ITEMS[S.equipment.accessory].atk) || 0;
    const a = 5 + (S.skill.combat || 0);                                        // 人物攻击
    const b = wAtk + ((me.length && S.weaponNames) ? ((S.weaponNames[me[0].id] && S.weaponNames[me[0].id].bonus) || 0) : 0) + ax + (S.weaponSharpen && S.weaponSharpen.am ? S.weaponSharpen.am : 0);   // 武器/加成
    const c = playerAtk();                                                      // 当前攻击（含 metaBonus）
    return { a, b, c, def: playerDef(), spd: Math.round(combatSpeed()), block: Math.round(shieldBlock() * 100), hp: S.stats.hp, maxhp: hpMax(), stam: S.stats.stamina, maxstam: maxStam(), armor: S.equipment.armor ? ITEMS[S.equipment.armor].name : '无', cloth: S.equipment.cloth ? ITEMS[S.equipment.cloth].name : '无', tank: !!S.furniture.tank };
  }
  // 精神影响体力上限（透支机制）：≥50 满额；20~49 −10%；<20 −20%（并且采集更慢，见 doPoint）
  function spiritStamMul() {
    const sp = (S && S.stats && S.stats.spirit !== undefined) ? S.stats.spirit : 100;
    return sp >= 50 ? 1 : (sp >= 20 ? 0.9 : 0.8);
  }
  function maxStam() { return Math.round((150 + (DIFFICULTIES[S.difficulty].stamina || 0) + metaBonus().stamina) * spiritStamMul()); }   // 基础 150（不含加成），再按精神打折
  function playerDef() { const a = S.equipment.armor ? ITEMS[S.equipment.armor] : null; const ax = (S.equipment.accessory && ITEMS[S.equipment.accessory] && ITEMS[S.equipment.accessory].def) || 0; const w2 = S.equipment.weapon2 ? ITEMS[S.equipment.weapon2] : null; const sh = w2 && w2.cat === 'shield' ? w2 : null; return 2 + (a ? a.def : 0) + ax + (sh ? sh.def : 0) + buffV('def'); }
  function shieldBlock() { const w2 = S.equipment.weapon2 ? ITEMS[S.equipment.weapon2] : null; return w2 && w2.cat === 'shield' ? (w2.block || 0) : 0; }
  function combatSpeed() {
    const w = S.equipment.weapon ? ITEMS[S.equipment.weapon] : null;
    const w2 = S.equipment.weapon2 ? ITEMS[S.equipment.weapon2] : null;
    let s = 10;
    if (w2 && w2.spd && !w2.ranged) s = Math.max(s, w2.spd);
    if (w && w.spd) s = w.spd;
    if (w && w.ranged) s = Math.min(s, w.spd || 8);
    if (meleeWeapons().length >= 2) { const dagger = /[dD]agger|双刀|短刀/.test((w && w.id || '') + (w2 && w2.id || '')); s = s * (dagger ? 2.0 : 1.5); }   // 双刀×2、双剑/刀+剑×1.5
    return s + (S.skill.combat || 0) * 0.5 + buffV('spd');
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
  function repairPistol() {
    const w = S.equipment.weapon;
    if (!w || ITEMS[w].id !== 'pistol') { log('需要把「源能手枪」装备到主手。', 'warn'); return { ok:false }; }
    const pa = durList('pistol');
    const pei = Math.min((S.equipIdx && S.equipIdx.weapon) || 0, Math.max(0, (pa || []).length - 1));
    const cur = (pa && pa.length) ? (pa[pei] !== undefined ? pa[pei] : pa[0]) : ((S.dur && S.dur.pistol !== undefined) ? S.dur.pistol : DURA.pistol);
    if (cur >= DURA.pistol) { log('源能手枪已经是完好状态。', 'warn'); return { ok:false }; }
    if (!hasItem('sourceOre', 1)) { log('修理源能手枪需要 源矿×1。', 'warn'); return { ok:false }; }
    removeItem('sourceOre', 1);
    if (pa && pa.length) pa[pei] = DURA.pistol; else { S.dur = S.dur || {}; S.dur.pistol = DURA.pistol; }
    durSync('pistol');
    log('你用源矿把源能手枪校准一新（耐久已满）。', 'good'); change(); return { ok:true };
  }
  function fixBrokenPistol() {
    if (!hasItem('brokenPistol')) { log('你身上没有破损的源能手枪。', 'warn'); return { ok:false }; }
    if (!hasItem('energyCrystal', 1) || !hasItem('sourceBar', 1)) { log('修复需要 源能晶石×1 + 源质锭×1。', 'warn'); return { ok:false }; }
    removeItem('brokenPistol', 1); removeItem('energyCrystal', 1); removeItem('sourceBar', 1); addItem('pistol', 1);
    log('你把破损的源能手枪修好了！', 'good'); change(); return { ok:true };
  }
  const REPAIR_MATS = { pistol:['sourceOre',1], bullet:null, knifeStone:['stone',2], club:['stone',2], spear:['stone',2], bow:['ironingot',1], arrow:null, eagleArrow:null, ironDagger:['ironingot',1], ironSword:['ironingot',1], ironGreatSword:['ironingot',2], steelSword:['steelingot',1], blackSword:['blackingot',1] };
  function repairMatOf(id) { return REPAIR_MATS[id] || ['stone', 2]; }
  function repairWeapon() {
    const w = S.equipment.weapon; if (!w) { log('需要先装备一把武器。', 'warn'); return; }
    if (!S.furniture.grindstone) { log('需要先建造「磨刀石」家具。', 'warn'); return; }
    if (DURA[w] === undefined) { log('这件武器没有耐久。', 'warn'); return; }
    const [mat, qty] = repairMatOf(w);
    if (!hasItem(mat, qty)) { log(`修补${ITEMS[w].name}需要 ${ITEMS[mat].name}×${qty}。`, 'warn'); return; }
    removeItem(mat, qty);
    const wa = durList(w);
    const ei = Math.min((S.equipIdx && S.equipIdx.weapon) || 0, Math.max(0, (wa || []).length - 1));
    if (wa && wa.length) wa[ei] = DURA[w]; else { S.dur = S.dur || {}; S.dur[w] = DURA[w]; }
    durSync(w);
    addMin(20);
    log(`你修补好了${ITEMS[w].name}，耐久恢复满。`, 'good');
    change();
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
  function wNameOf(id) { return (S.weaponNames && S.weaponNames[id] && S.weaponNames[id].name) || ITEMS[id].name; }
  function warmth() { const c = S.equipment.cloth ? ITEMS[S.equipment.cloth] : null; return (c ? c.warm : 0) + BUILDING_CHAINS.house[S.buildings.house].warm + BUILDING_CHAINS.fire[S.buildings.fire].warm; }
  // 当前装备里的远程武器（主手优先）；没装远程武器返回 null
  function rangedWeapon() {
    const w = S.equipment.weapon ? ITEMS[S.equipment.weapon] : null;
    const w2 = S.equipment.weapon2 ? ITEMS[S.equipment.weapon2] : null;
    return (w && w.ranged) ? w : ((w2 && w2.ranged) ? w2 : null);
  }
  function hasRanged() {
    const _rwA = S.equipment.weapon ? ITEMS[S.equipment.weapon] : (S.equipment.weapon2 ? ITEMS[S.equipment.weapon2] : null);
    if (_rwA && _rwA.ammoItem) return invCount(_rwA.ammoItem) > 0 ? 0 : null;
    const w = S.equipment.weapon ? ITEMS[S.equipment.weapon] : null;
    const w2 = S.equipment.weapon2 ? ITEMS[S.equipment.weapon2] : null;
    const rw = w && w.ranged ? w : (w2 && w2.ranged ? w2 : null);
    if (rw) {
      if (invCount('eagleArrow') > 0) return 8;
      if (invCount('arrow') > 0) return 0;
    }
    return null;
  }
  function ammoConsume() { const _r = (S.equipment.weapon && ITEMS[S.equipment.weapon] && ITEMS[S.equipment.weapon].ammoItem) ? S.equipment.weapon : ((S.equipment.weapon2 && ITEMS[S.equipment.weapon2] && ITEMS[S.equipment.weapon2].ammoItem) ? S.equipment.weapon2 : null); if (_r) { removeItem(ITEMS[_r].ammoItem, 1); return; } if (invCount('eagleArrow') > 0) removeItem('eagleArrow', 1); else removeItem('arrow', 1); }
  function combatLv() { return S.skill.combat; }
  function craftLv() { return S.skill.craft; }
  function gatherLv() { return S.skill.gather; }
  function skillCost(lv) { return [10,30,60,100,150][lv] || 999; }
  function skillUp(kind) {
    const lv = S.skill[kind];
    if (lv >= 5) return { ok:false, reason:'已满级' };
    const cost = skillCost(lv);
    if ((S.exp[kind] || 0) < cost) return { ok:false, reason:`经验不足（需 ${cost}）` };
    S.exp[kind] -= cost; S.skill[kind]++;
    log(`【技能】${kind === 'craft' ? '制造' : kind === 'gather' ? '采集' : '战斗'}升至 ${S.skill[kind]} 级。`, 'good');
    change();
    return { ok:true, lv: S.skill[kind] };
  }
  function skillInfo() {
    const nm = { craft:'制造', gather:'采集', combat:'战斗' };
    const desc = { craft:'每级制造时间 -8%（Lv3 以上 15% 额外多做 1 件）', gather:'每级采集/捕捞 +10% 收益', combat:'每级攻击 +1（Lv2 解锁重击）' };
    const ep = k => Math.round(((S.exp[k] || 0) * 10)) / 10;
    return { craft:{ lv:S.skill.craft, exp:ep('craft'), ct:skillCost(S.skill.craft), name:'制造', desc:desc.craft }, gather:{ lv:S.skill.gather, exp:ep('gather'), ct:skillCost(S.skill.gather), name:'采集', desc:desc.gather }, combat:{ lv:S.skill.combat, exp:ep('combat'), ct:skillCost(S.skill.combat), name:'战斗', desc:desc.combat } };
  }
  // 累计获得过的经验 = 当前剩余 + 升级技能已经花掉的
  // （以前只看"剩余经验"，导致玩家花经验把技能升上去后，反而因为剩余经验变少而"等级下降"，
  //   出现"我制造 4 级了却说我制造经验不够 2"的矛盾）
  function expEarned(kind) {
    const lv = Math.max(0, S.skill[kind] || 0);
    let spent = 0;
    for (let i = 0; i < lv && i < 5; i++) spent += [10, 30, 60, 100, 150][i];
    return (S.exp[kind] || 0) + spent;
  }
  function expLevel(kind) { const e = expEarned(kind); if (e >= 100) return 5; if (e >= 60) return 4; if (e >= 30) return 3; if (e >= 10) return 2; return 1; }

  function startFight(enemy, confirmed) {
    if (enemy.boss && !confirmed) {   // Boss 战前确认（异常强大）
      showOverlay({ title:'危险 · ' + enemy.name, text:'此怪物异常强大，需要做好充足准备。确定讨伐？', choices:[
        { label:'迎战', ok:() => startFight(enemy, true) },
        { label:'撤退', ok:() => log('你谨慎地退了回去，从长计议。', 'sys') },
      ]});
      return;
    }
    const diff = DIFFICULTIES[S.difficulty].enemyMul;
    const ehp = Math.round(enemy.hp * diff);
    const atk = Math.round(enemy.atk * diff);
    const C = {
      enemy: enemy, ehp, atk, def: enemy.def, spd: enemy.spd,
      enemies: [{ name:enemy.name, id:enemy.id, ehp, emax:ehp, atk, def:enemy.def, spd:enemy.spd, traits:enemy.traits, isBoss: enemy.boss ? 1 : 0, desc:enemy.desc }],
      round: 1, defending: false, usedItems: 0, summonTick: 0,
      log: [`遭遇了${enemy.name}！`, enemy.desc],
      ranged: null,
    };
    // 弓先手：装备了弓且带箭 → 开局先射（按速度±，默认2次），敌人还未靠近
    const rn = hasRanged();
    if (rn !== null) {
      const rw0 = rangedWeapon();
      const isGun = !!(rw0 && rw0.ammoItem);
      C.bowShots = isGun ? 1 : ((playerAtk() >= 8 || S.skill.combat >= 2) ? 3 : 2);   // 手枪只抢射 1 发，弓保持 2~3 发
      C.log.push(isGun ? '你抬枪就射，敌人还没靠近。' : '你搭弓就射，敌人还没靠近。');
    }
    if (enemy.nightBuff && isNight()) { C.atk = Math.round(C.atk * 1.3); C.log.push('黑暗让它更加强大。'); }
    C.spdP = combatSpeed(); C.spdE = enemy.spd; C.spdBank = 0;
    S.combat = C;
    if (onFight) onFight('start', C);
    change();
  }

  function fightAction(act, ti) {
    const C = S.combat;
    if (!C) return;
    const aliveNow = () => C.enemies.filter(e => e.ehp > 0);
    const aliveList = aliveNow();
    if (!aliveList.length) { endFight(true); return; }
    const target = (C.enemies[ti] && C.enemies[ti].ehp > 0) ? C.enemies[ti] : aliveList[0];
    const en = C.enemy;
    const myAtk = playerAtk(), myDef = playerDef(), mySpd = 10;
    let first = en.traits.includes('first') || en.spd > mySpd;
    const roundLines = [];
    let fled = false;

    // 敌人身上的持续伤害（磨刀石的血槽=流血；蝎毒淬刃=中毒）
    let dotDown = 0;
    for (const e of aliveNow()) {
      if (e.bleed > 0) { e.bleed--; e.ehp -= 5; roundLines.push(`${e.name}伤口血流不止（-5）。`); }
      if (e.poison > 0) { e.poison--; e.ehp -= 4; roundLines.push(`${e.name}被毒素侵蚀（-4）。`); }
      if (e.ehp <= 0) { e.ehp = 0; dotDown++; roundLines.push(`${e.name}倒下了！`); }
    }
    if (dotDown && !aliveNow().length) {
      C.enemies = C.enemies.filter(e => e.ehp > 0); C.ehp = 0;
      C.log.push(roundLines.join(' ')); if (C.log.length > 20) C.log.shift();
      endFight(true); return;
    }

    const doPlayerTurn = () => {
      const accBase = (S.statuses.fear ? 0.7 : 0.9) + (S.identity === 'hunter' ? 0.1 : 0);
      const tg = (target && target.ehp > 0) ? target : aliveNow()[0];
      if (!tg) return;
      if (act === 'throw') {
        C.thrown = true;
        if (chance(accBase - 0.1)) { S.missStreak = 0; let dmg = Math.max(1, Math.round(myAtk * 1.6) - tg.def); tg.ehp -= dmg; roundLines.push(`你奋力掷出长矛，命中${tg.name}，造成 ${dmg} 点伤害！`); }
        else { noteMissStreak(); roundLines.push('长矛擦着它飞过，落空了。'); }
      } else if (act === 'attack' || act === 'heavy' || act === 'ranged') {
        const noMelee = !meleeWeapons().length && hasRanged() !== null;
        let dmg = (act === 'ranged' || noMelee) ? rangedAtk() : myAtk;
        let acc = accBase;
        if (act === 'heavy') { dmg = Math.round(myAtk * 1.5); acc -= 0.2; }
        const anyRanged = (act === 'ranged' || noMelee);
        if (tg.traits.includes('evade')) acc -= 0.3;
        if (S.equipment.weapon && ITEMS[S.equipment.weapon] && ITEMS[S.equipment.weapon].id === 'pistol') acc = 0.6;
        if (tg.traits.includes('ironImmune') && myAtk < 22) dmg = Math.max(1, Math.floor(dmg * 0.7));
        if (chance(acc)) {
          S.missStreak = 0;
          let dealt = Math.max(1, dmg - tg.def);
          if (chance(0.1)) { dealt = Math.round(dealt * 1.5); roundLines.push(`会心一击！`); }
          if (tg.traits.includes('stoneGuard')) { dealt = Math.max(1, Math.round(dealt * 0.75)); const rc = Math.max(1, Math.round(dealt * 0.25)); S.stats.hp -= rc; roundLines.push(`石甲的符文把力道反噬回来（-${rc}）。`); if (S.stats.hp <= 0) S.stats.hp = 0; }
          tg.ehp -= dealt;
          roundLines.push(`你${anyRanged ? '拉弓射箭' : act==='heavy'?'奋力重击':'攻击'}${tg.name}，造成 ${dealt} 点伤害。`);
          if (!anyRanged && act !== 'throw') drainWeapon();
          if (hasRelic('vampire')) { const heal = Math.max(1, Math.round(dealt * 0.1)); S.stats.hp = Math.min(hpMax(), S.stats.hp + heal); roundLines.push(`吸血宝石吸回 ${heal} 点生命。`); }
          if (S.weaponSharpen && S.weaponSharpen.bleed && chance(S.weaponSharpen.bleed)) { tg.bleed = (tg.bleed || 0) + 3; roundLines.push('你的利刃划开了它的伤口，血流不止！'); }
          if (C.coat > 0) { C.coat--; tg.poison = Math.max(tg.poison || 0, 3); roundLines.push(`${tg.name}的伤口泛起青黑——蝎毒发作了！`); }
          if (anyRanged) ammoConsume();
          if (tg.ehp <= 0) { tg.ehp = 0; roundLines.push(`${tg.name}被击倒了！`); }
        } else { noteMissStreak(); roundLines.push(anyRanged ? '箭矢擦着它飞过。' : '你的攻击落空了。'); }
        if (en.traits.includes('flee') && C.round >= 2 && tg.ehp > 0 && tg.ehp / tg.emax <= 0.4 && chance(0.5)) { roundLines.push(`${en.name}受了惊，转身逃走了！`); C.fled = true; C.enemyFled = true; }
      } else if (act === 'defend') { C.defending = true; S.stats.stamina = Math.min(maxStam(), S.stats.stamina + 10); roundLines.push('你摆出防御姿态。'); }
      else if (act === 'item') { C.usedItems++; roundLines.push('你使用了物品。'); }
      else if (act === 'flee') { const p = C.smoke ? 1 : Math.min(0.9, 0.5 + (mySpd - en.spd) * 0.05); if (chance(p)) { roundLines.push(C.smoke ? '浓烟掩护下，你全身而退！' : '你成功逃走了！'); C.fled = true; fled = true; C.smoke = false; } else roundLines.push('逃跑失败，敌人扑了上来！'); }
    };

    const doEnemyTurn = () => {
      if (C.fled) return;
      for (const e of aliveNow()) {
        let eDmg = e.atk;
        if (e.traits.includes('charge') && C.round === 1) { eDmg = Math.round(eDmg * 2); roundLines.push(`${e.name}借着冲势撞向你！`); }
        if (e.traits.includes('pack')) eDmg = Math.round(eDmg * 1.2);
        if (e.traits.includes('enrage') && e.ehp / e.emax < 0.3) { eDmg = Math.round(eDmg * 1.5); roundLines.push(`${e.name}发狂了！`); }
        if (e.traits.includes('gun') && C.round === 1) { eDmg += 10; roundLines.push('枪声响起，火弹呼啸而来！'); }
        if (e.traits.includes('water') && C.defending) { roundLines.push('在水中你无法有效防御。'); C.defending = false; }
        if (hasRelic('dodge') && chance(0.10)) { roundLines.push('闪避护符一闪，你躲开了这次攻击！'); continue; }
        if (shieldBlock() && chance(shieldBlock())) { roundLines.push('盾牌结结实实地挡住了！'); continue; }
        let taken = Math.max(1, eDmg - (C.defending ? Math.round(myDef * 1.6) : myDef));
        taken = Math.max(1, Math.round(taken * (1 - metaBonus().armor)));
        S.stats.hp -= taken;
        roundLines.push(`${e.name}的攻击造成 ${taken} 点伤害。`);
        if (S.equipment.armor && DURA[S.equipment.armor] !== undefined) drainById(S.equipment.armor);
        if (S.equipment.weapon2 && ITEMS[S.equipment.weapon2] && ITEMS[S.equipment.weapon2].cat === 'shield' && DURA[S.equipment.weapon2] !== undefined) drainById(S.equipment.weapon2);
        if (e.traits.includes('poison') && chance(0.35)) { S.statuses.poison = Math.max(S.statuses.poison, 3); roundLines.push('你中毒了！'); }
        if (['wolf','cavebear','leopard','shark'].includes(e.id) && chance(0.25)) { S.statuses.bleed = Math.max(S.statuses.bleed, 2); roundLines.push('伤口开始流血！'); }
      }
      for (const sb of aliveNow().filter(e => e.isBoss && e.traits.includes('summon'))) {
        C.summonTick++;
        if (C.summonTick % 2 === 0) {
          const mn = sb.id === 'wolfKing' ? { name:'狼王之爪', id:'wolfMinion', ehp:26, emax:26, atk:8, def:2, spd:14, traits:[], isBoss:0 } : { name:'蛛网幼体', id:'spiderMinion', ehp:20, emax:20, atk:6, def:1, spd:13, traits:[], isBoss:0 };
          C.enemies.push(mn); roundLines.push(`${sb.name}发出嘶吼，召来了${mn.name}！`);
        }
      }
      if (S.stats.hp <= 0) S.stats.hp = 0;
      C.defending = false;
    };

    // 回合顺序
    if (C.bowShots > 0) {
      const rn = hasRanged();
      const rwNow = rangedWeapon();
      const ammoOk = rwNow ? (rwNow.ammoItem ? invCount(rwNow.ammoItem) > 0 : (invCount('eagleArrow') > 0 || invCount('arrow') > 0)) : false;
      if (rn !== null && ammoOk) {
        let dmg = Math.max(1, rangedAtk() - C.def);
        const t2 = C.enemies[0]; if (t2) t2.ehp -= dmg; C.bowShots--; ammoConsume();
        roundLines.push((rwNow && rwNow.ammoItem) ? `你抢先开枪，造成 ${dmg} 点伤害！` : `你抢先射出一箭，造成 ${dmg} 点伤害！`);
        if (t2 && t2.ehp <= 0) t2.ehp = 0;
        if (C.bowShots <= 0) roundLines.push(`${en.name}咆哮着逼近了！${meleeWeapons().length ? '你握紧手中武器迎击。' : ((rwNow && rwNow.ammoItem) ? '你再次给手枪上膛。' : '你再次搭上箭矢。')}`);
        C.log.push(roundLines.join(' ')); if (C.log.length > 20) C.log.shift(); C.round++;
        if (!C.enemies.some(e => e.ehp > 0)) { endFight(true); return; }
        if (onFight) onFight('update', C); change(); return;
      } else C.bowShots = 0;
    }
    if (act === 'ranged' && first) first = false;
    if (first) { doEnemyTurn(); if (!C.fled && aliveNow().length && S.stats.hp > 0) doPlayerTurn(); }
    else { doPlayerTurn(); if (!C.fled && aliveNow().length) doEnemyTurn(); }
    // 攻速差分
    C.spdBank += C.spdP - C.spdE;
    if (C.spdBank >= 10 && aliveNow().length && S.stats.hp > 0 && !C.fled) { C.spdBank -= 10; roundLines.push('你攻势如潮，追击而上！'); doPlayerTurn(); }
    else if (C.spdBank <= -10 && S.stats.hp > 0 && !C.fled) { C.spdBank += 10; roundLines.push(`${en.name}乘势猛攻！`); doEnemyTurn(); }
    C.spdBank = Math.max(-10, Math.min(10, C.spdBank));

    C.enemies = C.enemies.filter(e => e.ehp > 0);
    C.ehp = C.enemies.length ? C.enemies[0].ehp : 0;
    C.log.push(roundLines.join(' ')); if (C.log.length > 20) C.log.shift(); C.round++;

    if (C.fled) { endFight(false); return; }
    if (!C.enemies.length) { endFight(true); return; }
    if (S.stats.hp <= 0) { endFight(false); die('你在战斗中倒下了。'); return; }
    if (onFight) onFight('update', C);
    change();
  }

  function endFight(win) {
    const C = S.combat;
    if (S._raid) {
      const cb = S._raid; S._raid = null;
      S.combat = null;
      if (onFight) onFight('end', win);
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
        if (chance(Math.min(1, d.ch * (1 + metaBonus().luck)))) { const q = qtyParse(d.qty); addItem(d.id, q); got.push(`${ITEMS[d.id].name}×${q}`); }
      }
      log(`你击败了${en.name}！`, 'good');
      if (got.length) log(`战利品：${got.join('、')}。`, 'good');
      else log(`（${en.name}身上没留下什么可用的东西。）`, 'sys');
      // 战斗经验按怪强度分档：小怪+1 普通+2 精英+3 Boss+10
      const xg = en.boss ? 10 : (en.hp >= 100 ? 3 : en.hp >= 30 ? 2 : 1);
      S.exp.combat += xg;
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
    if (onFight) onFight('end', win);
    change();
    const _cb = S._onFightWin; S._onFightWin = null;
    if (win && _cb) _cb();
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
    if (it.heal) { S.stats.hp = Math.min(hpMax(), S.stats.hp + it.heal); C.log.push(`你使用${it.name}，生命+${it.heal}。`); }
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
    S.stats.hp -= 20;
    diaryAdd('夜袭让我损失惨重。围墙需要修。');
    if (S.stats.hp <= 0) die('你死在了夜袭里。');
  }
  function startRaidFight(cb) {
    const diff = DIFFICULTIES[S.difficulty].enemyMul;
    const base = ENEMIES.wolf;
    const mk = () => ({ name:base.name, id:base.id, ehp:Math.round(base.hp*diff), emax:Math.round(base.hp*diff), atk:Math.round(base.atk*diff), def:base.def, spd:base.spd, traits:base.traits, isBoss:0, desc:base.desc });
    const wolfCount = (DIFFICULTIES[S.difficulty] && DIFFICULTIES[S.difficulty].raidWolf) || 3;   // 简单/普通只有 2 匹
    const enemies = []; for (let i = 0; i < wolfCount; i++) enemies.push(mk());
    const C = {
      enemy: base, ehp: enemies[0].ehp, atk: enemies[0].atk, def: base.def, spd: base.spd,
      enemies, round:1, defending:false, usedItems:0, summonTick:0,
      log:['狼群趁夜来袭！', `${['', '一', '两', '三', '四'][wolfCount] || wolfCount}匹${base.name}的绿眼睛在夜色里盯着你。`], ranged:null, raid:true,
    };
    const rn = hasRanged();
    if (rn !== null) { const rw2 = rangedWeapon(); const isGun2 = !!(rw2 && rw2.ammoItem); C.bowShots = isGun2 ? 1 : ((playerAtk()>=8 || S.skill.combat>=2) ? 3 : 2); C.log.push(isGun2 ? '你抬枪就射，狼群还没扑近。' : '你搭弓就射，狼群还没扑近。'); }
    C.spdP = combatSpeed(); C.spdE = base.spd; C.spdBank = 0;
    S.combat = C;
    S._raid = cb;
    if (onFight) onFight('start', C);
    change();
  }
  function nightRaid(isStory) {
    const w = BUILDING_CHAINS.wall[S.buildings.wall];
    if (!isStory && !chance(w.raid)) return;
    if (S.flags.xiaoman) log('小满轻轻叫醒你："营外有动静……"', 'warn');
    const power = rnd(15, 60);
    let defense = w.def + playerAtk() * 2 + playerDef();
    if (invCount('gunpowder') > 0) {
      defense += invCount('gunpowder') * 10;
      removeItem('gunpowder', 1);
      log('你点燃一桶火药，爆炸声惊得野兽四散！（防御大幅提升）', 'good');
    }
    showOverlay({
      title:'夜 袭',
      text:`营外传来窸窸窣窣的脚步声——${power} 只野兽趁夜围了上来！（营地防御 ${defense}）`,
      choices:[
        { label:'殊死搏斗', hint:'连战3匹狼 · 赢了保住仓库', ok:()=>{
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
    const nap = mode === 'nap';
    const bed = ['bed1','bed2','bed3','bed4'].filter(b => S.furniture[b]).pop();
    const bf = bed ? FURNITURE.find(x => x.id === bed) : { spirit:15 };
    const sleepH = nap ? 2 : 8;   // 小睡 2 小时 / 正常 8 小时
    S.tick = (S.tick || 0) + sleepH * 60;
    const houseRest = BUILDING_CHAINS.house[S.buildings.house].rest;
    const hungry = S.stats.hunger, thirsty = S.stats.thirst;
    // 计算本次睡眠里落在 0点~6点 的小时数（0点后睡得差）
    const startHour = Math.floor(S.minute / 60);
    let afterMid = 0;
    for (let i = 0; i < sleepH; i++) { const hh = (startHour + i) % 24; if (hh < 6) afterMid++; }
    // 精力：小睡+20（按时间乘质量）；正常睡8小时恢复近满（按时间乘质量，22点后最赚）
    const sq = sleepQuality(mode);
    const penMul = nap ? 0.35 : 1;   // 惩罚系数：小睡只吃整觉的 35%（短睡不该按 8 小时强度扣血），但仍弱于整觉
    const staGain = nap ? Math.round(25 * sq) : Math.round(maxStam() * (0.55 + houseRest * 0.2) * sq);
    S.stats.stamina = Math.min(maxStam(), S.stats.stamina + staGain);
    // 血量：基础(小睡7/整觉30) 乘时段质量，再按饿/渴/精神惩罚（整觉照旧、小睡大幅减）
    // 定位：小睡主要补体力，回血很少（5~9），而且保底不倒扣——想真正回血得睡满 8 小时
    const hungPen = hungry < 20 ? 3 * (100 - hungry) / 10 : 1.5 * (100 - hungry) / 10;
    const thirsPen = thirsty < 20 ? 3 * (100 - thirsty) / 10 : 1.5 * (100 - thirsty) / 10;
    const spiritPen = 2 * Math.floor((100 - S.stats.spirit) / 10);
    let hpRec = Math.round((nap ? 7 : 30) * sq) - Math.round(hungPen * penMul) - Math.round(thirsPen * penMul) - Math.round(spiritPen * penMul);
    if (nap) hpRec = Math.max(0, hpRec);   // 午觉是短休息：最差也只是没恢复，不会倒扣生命（代价体现在饱食/口渴的消耗上）
    S.stats.hp = Math.min(hpMax(), S.stats.hp + hpRec);
    if (S.stats.hp <= 0) { log('你在睡梦中停止了呼吸……', 'danger'); die('你在睡梦中再也没能醒来。'); return; }
    S.stats.spirit = Math.min(100, S.stats.spirit + (nap ? 3 : (bf.spirit || 15)));   // 精神主要靠整觉恢复
    // 睡觉期间消耗（与醒着一致；小睡 2 小时只扣 5 点）
    const drain = nap ? 5 : 20;
    if (S.difficulty !== 'dev') { S.stats.hunger = Math.max(0, hungry - drain); S.stats.thirst = Math.max(0, thirsty - drain); }
    log(`你${nap ? '小睡' : '睡了'} ${sleepH} 小时。（体力+${staGain}，生命${hpRec >= 0 ? '+' : ''}${hpRec}）`, hpRec < 0 ? 'warn' : 'good');
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
    // 随机夜袭判定
    if (afterMid > 0 && chance(BUILDING_CHAINS.wall[S.buildings.wall].raid)) nightRaid(false);
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
  function matsOk(mats) { for (const k in mats) if (!hasItem(k, mats[k])) return false; return true; }
  function missingMats(mats) { const out=[]; for (const k in mats) if (!hasItem(k, mats[k])) out.push(`${ITEMS[k].name} ${invCount(k)}/${mats[k]}`); return out; }
  function takeMats(mats) { for (const k in mats) removeItem(k, mats[k]); }

  function buildChain(chainId) {
    const chain = BUILDING_CHAINS[chainId];
    const cur = S.buildings[chainId];
    const next = chain[cur + 1];
    if (!next) { log('已经升到顶了。', 'warn'); return; }
    if (next.needBp && !hasItem(next.needBp)) { log(`需要图纸：${ITEMS[next.needBp].name}。`, 'warn'); return; }
    if (!matsOk(next.mats)) { log(`材料不足：${missingMats(next.mats).join('、')}。`, 'warn'); return; }
    takeMats(next.mats);
    log(`开始建造${next.name}（需 ${next.time/60} 小时）……`, 'sys');
    addMin(Math.round(next.time * (1 - metaBonus().craft)));
    S.buildings[chainId]++;
    log(`建成了：${next.name}！`, 'good');
    diaryAdd(`我建起了${next.name}。`);
    S.exp.craft += 2;
    if (chainId === 'watch') {
      const unlocks = next.unlock || [];
      if (unlocks.length) log(`视野扩展！现在可以前往：${unlocks.map(u => sceneOf(u).name).join('、')}。`, 'good');
    }
    if (chainId === 'dock' && next.boat === 'raft') log('木筏下水！现在可以出海了。', 'good');
    if (chainId === 'dock' && next.boat === 'boat') log('小船下水！对岸的盐镇可以去了。', 'good');
    change();
  }

  function furnitureUsed() {   // 已占家具位（床系列算1；旗帜/路标/书架/水壶/滤雨器/织布机/药炉不占位）
    const g = { wb:0, fr:0, sm:0, bed:0, single:0 };
    for (const k in S.furniture) {
      if (['wb1','wb2','wb3'].includes(k)) g.wb = 1;
      else if (['fr1','fr2','fr3'].includes(k)) g.fr = 1;
      else if (['sm1','sm2'].includes(k)) g.sm = 1;
      else if (['bed1','bed2','bed3','bed4'].includes(k)) g.bed = 1;
      else if (!['flag','signpost','shelf','tank','rainfilter','loom','medPot'].includes(k)) g.single++;
    }
    return g.wb + g.fr + g.sm + g.bed + g.single;
  }
  function furnSlotFull(fid) {
    if (['wb2','wb3','fr2','fr3','sm2','bed2','bed3','bed4','rainfilter'].includes(fid)) return false;   // 升级替换不占新位
    if (['flag','signpost','shelf','tank','loom','medPot'].includes(fid)) return false;   // 在既有家具上加装的次级工位，不占家具位
    return furnitureUsed() >= ((BUILDING_CHAINS.house[S.buildings.house].slots || 1) + (S.houseExt || 0));
  }
  function buildFurniture(fid) {
    const f = FURNITURE.find(x => x.id === fid);
    if (!f) return;
    if (S.furniture[fid]) { log('已经建好了。', 'warn'); return; }
    if (f.needPrev && !S.furniture[f.needPrev]) { log(`需要先建造：${FURNITURE.find(x=>x.id===f.needPrev).name}。`, 'warn'); return; }
    if (f.needBp && !hasItem(f.needBp)) { log(`需要图纸：${ITEMS[f.needBp].name}。`, 'warn'); return; }
    if (f.needCraft && expLevel('craft') < f.needCraft) { log(`制造等级需达到 ${f.needCraft}（当前 ${expLevel('craft')}）。`, 'warn'); return; }
    const isUpgrade = (['wb2','wb3','fr2','fr3','sm2','bed2','bed3','bed4','rainfilter'].includes(fid));
    // 家具位判定统一走 furnSlotFull，避免这里再抄一份规则导致两边不一致
    if (furnSlotFull(fid)) { const slots = (BUILDING_CHAINS.house[S.buildings.house].slots || 1) + (S.houseExt || 0); log(`家具位已满（${furnitureUsed()}/${slots}），先升级住所。`, 'warn'); return; }
    if (!matsOk(f.mats)) { log(`材料不足：${missingMats(f.mats).join('、')}。`, 'warn'); return; }
    takeMats(f.mats);
    log(`开始打造${f.name}（需 ${f.time} 分钟）……`, 'sys');
    addMin(Math.round(f.time * (1 - metaBonus().craft)));
    if (isUpgrade) { const prev = f.needPrev; if (prev) delete S.furniture[prev]; }
    S.furniture[fid] = true;
    log(`完工了：${f.name}！`, 'good');
    diaryAdd(`我做好了${f.name}。`);
    S.exp.craft += 2;
    change();
  }

  // ---------- 扩建住处（住所每升一级获得 1 次扩建，家具位 +1） ----------
  function houseExtMax() { return (S.buildings.house || 0) + 1; }   // 帐篷即可扩建1次，之后每升一级 +1
  function houseExtMats(n) {
    const table = [ { wood:10, branch:5 }, { wood:15, branch:8, clay:4 }, { wood:22, branch:12, stonebrick:4 }, { wood:30, branch:16, stonebrick:8, ironpart:2 } ];
    return table[(n || 1) - 1] || table[table.length - 1];
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

  // ---------- 扩建仓库（仓库每升一级获得 1 次扩建，背包容量 +15） ----------
  const STORE_EXT_CAP = 15;
  function storeExtCap() { return STORE_EXT_CAP; }
  function storeExtMax() { return (S.buildings.storage || 0) + 1; }   // 储物箱即可扩建1次，之后每升一级 +1
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
    log(`你扩建了仓库，背包容量 +${STORE_EXT_CAP}！（当前扩建 ${S.storeExt}/${max}）`, 'good');
    diaryAdd('我把仓库又扩了一块。');
    change();
    return { ok:true };
  }

  // ---------- 制造 ----------
  const LOTUS_LIMIT = 3;   // 不死丹：单局最多炼制 3 颗
  function lotusLeft() { return Math.max(0, LOTUS_LIMIT - (S.lotusMade || 0)); }
  function canCraft(r) {
    if (r.needBp && !hasItem(r.needBp)) return { ok:false, reason:`需要图纸：${ITEMS[r.needBp].name}` };
    if (r.needItem && !hasItem(r.needItem)) return { ok:false, reason:`需要${ITEMS[r.needItem].name}` };
    // 不死丹：单局最多炼 3 颗（防止堆药把死亡机制抹平）
    if (r.out && r.out.lotusPill && lotusLeft() <= 0) return { ok:false, reason:`不死丹一局最多炼制 ${LOTUS_LIMIT} 颗（已炼 ${LOTUS_LIMIT}/${LOTUS_LIMIT}）` };
    if (r.needTool && !hasTool(r.needTool, 1)) return { ok:false, reason:`需要${ITEMS[{'knife':'knifeStone'}[r.needTool]] ? ITEMS['knifeStone'].name : '工具'}` };
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
        r.station === 'furn1' ? (S.furniture.fr1||S.furniture.fr2||S.furniture.fr3) :
        r.station === 'furn2' ? (S.furniture.fr2||S.furniture.fr3) :
        r.station === 'furn3' ? S.furniture.fr3 :
        r.station === 'smoke1' ? (S.furniture.sm1||S.furniture.sm2) :
        r.station === 'smoke2' ? S.furniture.sm2 :
        r.station === 'fire' ? true :
        S.furniture[{'spin':'spin','loom':'loom','mortar':'mortar','pot':'stove','medPot':'medPot','tannery':'tannery','rack':'rack','stove':'stove'}[r.station]];
      if (!ok) return { ok:false, reason:`需要建造${stationName}` };
      }
    }
    for (const k in r.in) if (!hasItem(k, r.in[k])) return { ok:false, reason:`材料不足：${ITEMS[k].name} ${invCount(k)}/${r.in[k]}` };
    return { ok:true };
  }
  function craft(r) {
    const chk = canCraft(r);
    if (!chk.ok) { log(chk.reason, 'warn'); return; }
    for (const k in r.in) removeItem(k, r.in[k]);
    if (r.out && r.out.lotusPill) S.lotusMade = (S.lotusMade || 0) + 1;
    const out = ITEMS[r.out ? Object.keys(r.out)[0] : ''];
    log(`你开始制作：${r.name}（${r.time} 分钟）……`, 'sys');
    let t = Math.round(r.time * (1 - metaBonus().craft));
    if (S.identity === 'smith') t = Math.round(t * 0.8);
    const clv = craftLv();   // 制造技能：每级制造时间 -8%（Lv5 -40%）
    if (clv > 0) t = Math.max(3, Math.round(t * (1 - clv * 0.08)));
    addMin(t);
    let bonus = false;
    for (const k in r.out) { const n = r.out[k]; addItem(k, n); }
    if (clv >= 3 && chance(0.15)) { bonus = true; Object.keys(r.out).forEach(k => addItem(k, 1)); }   // lv3+ 15% 额外+1
    S.exp.craft = Math.round((S.exp.craft + (S.furniture.shelf ? 1.1 : 1)) * 10) / 10;   // 书架：制造经验 +10%（取一位小数避免浮点尾巴）
    S.craftCount = (S.craftCount || 0) + 1;
    log(`完成：${Object.keys(r.out).map(k=>`${ITEMS[k].name}×${r.out[k]}`).join('、')}${bonus ? '（额外多做了 1 件！）' : ''}。`, 'good');
    if (S.tut === 1 && Object.keys(S.inv).some(id => ITEMS[id] && ITEMS[id].tool)) S.tut = 2;   // 已做出首件工具→去装备
    change();
  }
  function craftMax(r) {
    let m = 999;
    for (const k in r.in) m = Math.min(m, Math.floor(invCount(k) / r.in[k]));
    if (r.out && r.out.lotusPill) m = Math.min(m, lotusLeft());
    return Math.max(0, m);
  }
  function craftBatch(r, n) {
    if (n < 1) return { ok:false, reason:'至少要制作 1 个' };
    if (r.out && r.out.lotusPill && n > lotusLeft()) return { ok:false, reason:`不死丹一局最多炼制 ${LOTUS_LIMIT} 颗（还能炼 ${lotusLeft()} 颗）` };
    for (const k in r.in) if (!hasItem(k, r.in[k] * n)) return { ok:false, reason:'材料不足' };
    for (const k in r.in) removeItem(k, r.in[k] * n);
    if (r.out && r.out.lotusPill) S.lotusMade = (S.lotusMade || 0) + n;
    const clv = craftLv();
    let t = Math.round(r.time * (1 - metaBonus().craft));
    if (S.identity === 'smith') t = Math.round(t * 0.8);
    if (clv > 0) t = Math.max(3, Math.round(t * (1 - clv * 0.08)));
    addMin(t * n);
    for (const k in r.out) addItem(k, r.out[k] * n);
    S.exp.craft = Math.round((S.exp.craft + (S.furniture.shelf ? 1.1 : 1) * n) * 10) / 10;
    S.craftCount = (S.craftCount || 0) + n;
    log(`连续制作：${r.name}×${n}（耗时 ${t * n} 分钟）。`, 'good');
    change();
    return { ok:true, n };
  }
  function stationAvailable(station) {
    if (station === 'none' || station === 'fire') return true;
    if (station === 'pearlWork' || station === 'sourceForge' || station === 'repair') {
      return !!(S.atlantis && S.atlantis.camp && S.atlantis.camp.furniture && S.atlantis.camp.furniture[station]) && canCraft({ station, in:{} }).ok;
    }
    const f = FURNITURE.find(x => x.station === station);
    if (!f) return false;
    return canCraft({ station, in:{} }).ok;
  }

  // ---------- 礁石栖息地（亚特兰蒂斯营地，独立家具位） ----------
  function atlantisCamp() {
    if (!S.atlantis) S.atlantis = { unlocked:0, visited:0, camp:{ furniture:{}, buildings:{} }, quest:0 };
    if (!S.atlantis.camp) S.atlantis.camp = { furniture:{}, buildings:{} };
    if (!S.atlantis.camp.furniture) S.atlantis.camp.furniture = {};
    return S.atlantis.camp;
  }
  function atlantisFurnitureUsed() { return Object.keys(atlantisCamp().furniture).length; }
  function buildAtlantisFurniture(fid) {
    const f = ATLANTIS_FURNITURE.find(x => x.id === fid);
    if (!f) return { ok:false, reason:'没有这件家具。' };
    const camp = atlantisCamp();
    if (camp.furniture[fid]) return { ok:false, reason:'已经建好了。' };
    const MAX = 6;
    if (Object.keys(camp.furniture).length >= MAX) return { ok:false, reason:`礁石栖息地家具位已满（${MAX}）。` };
    if (!matsOk(f.mats)) return { ok:false, reason:`材料不足：${missingMats(f.mats).join('、')}` };
    takeMats(f.mats);
    log(`开始打造${f.name}（需 ${f.time} 分钟）……`, 'sys');
    addMin(Math.round(f.time * (1 - metaBonus().craft)));
    camp.furniture[fid] = true;
    log(`礁石栖息地建成了：${f.name}！`, 'good');
    diaryAdd(`我在礁石栖息地做好了${f.name}。`);
    S.exp.craft += 2;
    change();
    return { ok:true };
  }
  function repairDive() {
    const camp = atlantisCamp();
    if (!camp.furniture.repairBench) return { ok:false, reason:'需要先在礁石栖息地建造修补台。' };
    if (!hasItem('deepCoral', 2)) return { ok:false, reason:'需要深珊瑚×2 来修补。' };
    removeItem('deepCoral', 2);
    for (const did of ['diveSuit','diveSuit2','diveMask']) { const a = durList(did); if (a && a.length) { for (let i = 0; i < a.length; i++) a[i] = DURA[did]; durSync(did); } }
    log('你用深珊瑚修补了潜水装备，耐久已全部恢复。', 'good');
    change();
    return { ok:true };
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
    const q = Math.max(1, Math.round((rnd(crop.min, crop.max) + 2) * DIFFICULTIES[S.difficulty].resMul * (pick.fert ? 1.5 : 1)));   // 每次收获统一 +2
    addItem(crop.out, q);
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
    removeItem('wood', 2);
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
  // 收购价：商人一律按行情的八折收（固定折价，不再因为"卖得多"继续往下压）
  const SELL_SUP = 0.8;
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
    const entry = list.find(e => e.id === id);
    if (!entry) return;
    if (!hasItem(id, qty)) { log('货物不够。', 'warn'); return; }
    const price = priceOf(entry.base, true, id);
    removeItem(id, qty);
    S.sold[id] = (S.sold[id] || 0) + qty;   // 仅留存销量统计，当前不参与定价
    addItem('beibi', price * qty);
    log(`卖出 ${ITEMS[id].name}×${qty}，获得贝壳币×${price * qty}。`, 'good');
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
    removeItem(currency, cost);
    addItem(id, n);
    log(`购入 ${ITEMS[id].name}×${n}，花费${curName}×${cost}。`, 'good');
    change();
  }

  function laochaoAvailable() { return S.scene === 'camp' && S.laochao.arrived && !isNight(); }
  function signalFlag() {
    if (!S.furniture.flag) { log('需要先建信号旗。', 'warn'); return; }
    if (!matsOk({ wood:5 })) { log('需要木材×5 作为狼烟燃料。', 'warn'); return; }
    removeItem('wood', 5);
    S.laochao.nextVisit = S.day + 1;
    S.flags.flagSignal = 1;
    log('你升起信号旗，狼烟飘向海面。老潮明天就会靠岸（货少价高）。', 'good');
    change();
  }
  function doFirstTrade() {
    if (S.flags.firstTrade) { log('这笔生意已经做过了。', 'warn'); return; }
    if (!hasItem('smokedFish', 10)) { log('需要 10 条熏鱼。', 'warn'); return; }
    removeItem('smokedFish', 10);
    addItem('salt', 1); addItem('ironingot', 4); addItem('seedCarrot', 1);
    S.flags.firstTrade = 1;
    log('老潮掂了掂你的熏鱼，咧嘴一笑："爽快！以后常来照顾生意。"', 'good');
    log('获得：盐×1、铁锭×4、萝卜种子×1。', 'good');
    diaryAdd('第一笔生意：十条熏鱼，换来了盐、铁锭和种子。');
    change();
  }
  function acceptCommission(c) {
    S.laochao.accepted = S.laochao.accepted || {};
    if (S.laochao.done[c.id]) return { ok:false, reason:'委托已完成' };
    const a = S.laochao.accepted[c.id];
    if (a !== undefined && S.day <= a + 2) return { ok:false, reason:`委托进行中（第${a}~${a+2}天）` };
    S.laochao.accepted[c.id] = S.day;
    log(`你接下了委托「${c.name}」：${c.text}（持续 3 天）`, 'good');
    change();
    return { ok:true, day: S.day };
  }
  function completeCommission(c) {    if (S.laochao.done[c.id]) return;
    if (c.type === 'kill') {
      if (S.flags['boss_'+c.target]) {
        S.laochao.done[c.id] = 1;
        grantReward(c);
      } else log('任务目标还活着。', 'warn');
      return;
    }
    for (const k in c.need) if (!hasItem(k, c.need[k])) { log(`还差 ${ITEMS[k].name}。`, 'warn'); return; }
    for (const k in c.need) removeItem(k, c.need[k]);
    S.laochao.done[c.id] = 1;
    grantReward(c);
  }
  function grantReward(c) {
    for (const k in c.reward) {
      if (k === 'fame') { S.fame = Math.min(3, S.fame + c.reward[k]); log(`盐镇声望提升！`, 'good'); }
      else addItem(k, c.reward[k]);
    }
    const names = Object.entries(c.reward).map(([k,v]) => k==='fame' ? `声望+${v}` : `${ITEMS[k].name}×${v}`).join('、');
    log(`委托完成！获得：${names}。`, 'good');
    change();
  }

  // ---------- 吃喝 ----------
  function consume(id) {
    const it = ITEMS[id];
    if (!it || !hasItem(id)) return;
    if (it.cat !== 'food' && it.cat !== 'drink' && !(it.food || it.water || it.curePoison || it.stopBleed)) { log('这个不能吃。', 'warn'); return; }
    removeItem(id, 1);
    if (it.buffStat) { S.buffs = S.buffs || {}; if (it.buffStat === 'spirit') { S.stats.spirit = Math.max(0, Math.min(100, S.stats.spirit + (it.buffVal||0))); log('精神+' + it.buffVal + '。', 'good'); } else { S.buffs[it.buffStat] = { v: it.buffVal||0, until: (S.tick||0) + (it.buffH||24)*60 }; log('【' + it.name + '】' + (it.buffH||24) + ' 小时内 ' + it.buffStat + ' +' + it.buffVal + '。', 'good'); } }
    if (it.negChance && chance(it.negChance)) { if (it.negHp) { S.stats.hp = Math.max(1, S.stats.hp - it.negHp); log('鱼肉不太对劲……（-' + it.negHp + ' 生命）', 'danger'); } if (it.negPoison) { S.statuses.poison = Math.max(S.statuses.poison, 3); log('你中毒了！', 'danger'); } }

    if (it.food) S.stats.hunger = Math.min(100, S.stats.hunger + it.food);
    if (it.water) S.stats.thirst = Math.min(100, S.stats.thirst + it.water);
    if (it.heal) S.stats.hp = Math.min(hpMax(), S.stats.hp + it.heal);
    if (it.spirit) S.stats.spirit = Math.max(0, Math.min(100, S.stats.spirit + it.spirit));
    if (it.sta) { S.stats.stamina = Math.min(maxStam(), S.stats.stamina + it.sta); log(`体力+${it.sta}。`, 'good'); }
    if (it.curePoison && S.statuses.poison > 0) { S.statuses.poison = 0; log('蛇胆入喉，毒性被解了。', 'good'); }
    if (it.stopBleed && S.statuses.bleed > 0) { S.statuses.bleed = 0; log('血止住了。', 'good'); }
    log(`你吃/喝了${it.name}。`, 'sys');
    addMin(10);
    change();
  }
  function useMed(id) {
    const it = ITEMS[id];
    if (!it || it.cat !== 'med' || !hasItem(id)) return;
    removeItem(id, 1);
    if (it.heal) { S.stats.hp = Math.min(hpMax(), S.stats.hp + it.heal); log(`生命+${it.heal}。`, 'good'); }
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
  function equip(id, idx) {
    const it = ITEMS[id];
    if (!it || !hasItem(id)) return;
    S.equipIdx = S.equipIdx || { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
    // 实例索引：确保每个槽用"未被其它槽占用"的实例（两把同款各占不同实例）
    const q = S.inv[id] || 1;
    const used = [];
    for (const s of ['weapon','weapon2','armor','cloth','accessory']) if (S.equipment[s] === id) used.push(S.equipIdx[s] || 0);
    let useIdx = 0, k = 0;
    while (used.includes(k) && k < q) k++;
    useIdx = (idx !== undefined && !used.includes(idx)) ? idx : Math.min(k, Math.max(0, q - 1));
    if (it.cat === 'weapon') {
      const mainTwo = S.equipment.weapon && ITEMS[S.equipment.weapon].twoHand;
      if (it.twoHand) {   // 双手武器：占主手，副手清空
        const old = S.equipment.weapon;
        S.equipment.weapon = id; S.equipment.weapon2 = null; S.equipIdx.weapon = useIdx; S.equipIdx.weapon2 = 0;
        log(`双手握上了${it.name}${old ? `（换下${ITEMS[old].name}）` : ''}，副手空了出来。`, 'sys');
      } else if (mainTwo) {   // 主手是双手武器，再装单手 → 换主手
        const old = S.equipment.weapon; S.equipment.weapon = id; S.equipIdx.weapon = useIdx;
        log(`装备了${it.name}${old ? `（换下${ITEMS[old].name}）` : ''}。`, 'sys');
      } else {
        let slot = 'weapon';
        if (S.equipment.weapon) slot = S.equipment.weapon2 ? 'weapon' : 'weapon2';
        const old = S.equipment[slot];
        S.equipment[slot] = id; S.equipIdx[slot] = useIdx;
        log(`装备了${it.name}${old ? `（换下${ITEMS[old].name}）` : ''}${slot === 'weapon2' ? '（副手）' : ''}。`, 'sys');
      }
    } else if (it.cat === 'shield') {
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
    addMin(60 * h);
    S.stats.stamina = Math.min(maxStam(), S.stats.stamina + 10 * h);
    log(`你坐下歇了一会儿（${h} 小时，体力+${10 * h}）。`);
    change();
  }

  // ---------- 结局 ----------
  function checkEndingActions() {
    const acts = [];
    if (S.ending) return acts;
    if (S.scene === 'camp') {
      const dock = BUILDING_CHAINS.dock[S.buildings.dock];
      if (dock.boat === 'ocean' && hasItem('seachart') && invCount('supplybox') >= 3) acts.push({ id:'endA', name:'扬帆远航（结局·归乡）', desc:'远洋船、海图、三箱补给都已备齐。是时候回家了。' });
      if (S.flags['boss_pirateBoss'] && S.fame >= 2 && S.buildings.wall >= 3) acts.push({ id:'endB', name:'召集岛民（结局·岛主）', desc:'海盗已灭、声望已立、城墙已固。这座岛需要一个主人。' });
    }
    if (S.scene === 'peak') {
      if (hasItem('relic') && invCount('slate') >= 3 && hasItem('dragonbone')) acts.push({ id:'endC', name:'祭坛仪式（结局·秘辛）', desc:'遗物、三块石板、龙骨。祭坛在等你。' });
    }
    if (S.scene === 'atlantis' && (S.killCount.sunkenKing || 0) > 0) {
      acts.push({ id:'endS', name:'重启灯塔（结局·重燃文明）', desc:'沉没之王已伏诛，点亮灯塔，让文明重生。' });
      acts.push({ id:'endS2', name:'封存灯塔（结局·深海长眠）', desc:'按灭最后一盏灯，让这座城重新安眠。' });
    }
    // 已达成但未结算的结局：提供"结算"动作
    return acts;
  }
  function doEnding(id) {
    // 第二章：结局改为"可继续/可手动结算"，不再强制结束
    if (id === 'endA') {
      if (S.flags['ended_A']) { log('归乡的一切都已备齐。', 'sys'); return; }
      S.flags['ended_A'] = 1;
      log('万事俱备，可你的目光却落向了更远的深海——或许还能找到更多线索。（按"回营地"即可继续）', 'good');
      diaryAdd('海之尽头，仿佛还有一个世界在等我。');
    } else if (id === 'endB') {
      if (S.flags['ended_B']) { log('岛上的灯火已经亮起。', 'sys'); return; }
      S.flags['ended_B'] = 1;
      log('岛主之名落定，可你总觉得海的深处仍有未解的谜团……（按"回营地"即可继续）', 'good');
      diaryAdd('这座岛已经是我的了，可深海还在呼唤。');
    } else if (id === 'endC') {
      if (S.flags['ended_C']) { log('祭坛的光芒已经黯淡。', 'sys'); return; }
      S.flags['ended_C'] = 1;
      S.atlantis = S.atlantis || { unlocked:1, visited:0, camp:{ furniture:{}, buildings:{} }, quest:0 };
      S.atlantis.unlocked = 1;
      log('祭坛轰然点亮——这座岛，是失落文明最后的哨站！海的最深处传来低语：去找亚克兰蒂斯。山顶浮现出一枚传送石。', 'good');
      diaryAdd('亚克兰蒂斯……失落文明的灯塔，在海的尽头。');
    } else if (id === 'endS') {
      if (S.flags['ended_S']) { log('灯塔的长明之光已经亮起。', 'sys'); return; }
      S.flags['ended_S'] = 1;
      achUnlock('lighthouse');
      log('你重启了亚特兰蒂斯的灯塔——失落文明的灯火，重新亮起。（结局·重燃文明 已达成，可继续或结算）', 'good');
      diaryAdd('灯塔亮起，文明重新呼吸。');
    } else if (id === 'endS2') {
      if (S.flags['ended_S2']) { log('深海已经重归寂静。', 'sys'); return; }
      S.flags['ended_S2'] = 1;
      achUnlock('abyssal');
      log('你按灭了最后一盏灯，让亚克兰蒂斯重新长眠。（结局·深海长眠 已达成，可继续或结算）', 'good');
      diaryAdd('我选择让这座城安安静静地睡下去。');
    }
    save();
    change();
  }
  function settleEnding(id) {
    const key = String(id).replace('end', '');
    if (!S.flags['ended_' + key]) return { ok:false, reason:'该结局尚未达成。' };
    S.ending = key;
    save();
    const ms = metaSettle();
    if (ms) log(`你的一生化为 ${ms.gain} 魂点，汇入了《历代遗章》。`, 'good');
    if (onEnding) onEnding(S.ending, '');
    return { ok:true };
  }

  // ---------- 图鉴 ----------
  // 图鉴口径统一：总量与列表用同一份名单，避免"标题 25 条、列表 24 条"这种对不上
  function resIds() { return Object.keys(ITEMS).filter(k => ['mat','special','bp','seed'].includes(ITEMS[k].cat)); }
  function monIds() { return Object.keys(ENEMIES).filter(k => !ENEMIES[k].noDex); }   // noDex：同名变体不单独进图鉴
  function collection() {
    const mm = metaState();
    return {
      res: resIds().filter(k => S.seen[k] || mm.seenItems[k]).length,
      resTotal: resIds().length,
      mon: monIds().filter(k => S.seen['mon_' + k] || mm.seenMon[k]).length,
      monTotal: monIds().length,
    };
  }

  // ---------- 目标引导 ----------
  function currentObjective() {
    if (!S) return '';
    const day = S.day;
    if (day === 1) return '生起篝火、搭好帐篷，先摸清营地周边的物资。';
    if (!S.furniture.bed1 && !['bed2','bed3','bed4'].some(b => S.furniture[b])) return '铺一张草床（茅草×10、木材×4），今晚睡个好觉。';
    if (!S.furniture.wb1 && !S.furniture.wb2 && !S.furniture.wb3) return '造一张简易工作台（木板×4、石头×4），解锁制作。';
    if (S.buildings.watch === 0) return '建造一级瞭望台（木杆×8、木板×8、藤蔓×4），看清草地、荒漠与山洞。';
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
    return '集齐结局所需的遗物与图纸，这座岛的真相在等你。';
  }

  function demolishFurniture(fid) {
    if (!S.furniture[fid]) { log('没有这个家具。', 'warn'); return; }
    const f = FURNITURE.find(x => x.id === fid);
    if (!f) return;
    delete S.furniture[fid];
    // 拆掉鸡舍/羊圈：里面的牲畜会跑掉（提示清楚，别让玩家白白损失）
    if (fid === 'coop' || fid === 'pen') {
      const L = liveState();
      const n = L[fid].length;
      if (n) { L[fid] = []; log(`你拆掉了${f.name}，里面的 ${n} 只跑了。`, 'warn'); }
    }
    const refund = [];
    for (const k in f.mats) { const q = Math.max(1, Math.round(f.mats[k] * 0.5)); addItem(k, q, true); refund.push(`${ITEMS[k].name}×${q}`); }
    log(`你拆除了${f.name}，返还了部分材料：${refund.join('、')}。`, 'good');
    diaryAdd(`我拆掉了${f.name}。`);
    change();
  }

  // ---------- 出售/兑换 ----------
  function sellPrice(id) {
    const p = { coin:30, pearl:50, crystal:30, fossil:25, salt:5, smokedFish:8, roastFish:4, roastMeat:4, vegSoup:5, meatSoup:6, honeyWater:5, mushroomSoup:5, meat:3, fish:3, hide:6, leather:10, beastmeat:4, plank:3, board:4, wood:2, branch:1, stone:2, ironore:4, ironingot:10, steelingot:16, cloth:12, rope:3, gunpowder:6, herb:3, mushroom:2, berry:1, wildveg:1, bambooShoot:2, cactusfruit:2, beibi:0 }[id];
    return p === undefined ? 1 : p;
  }
  function sellItem(id) {
    const q = invCount(id);
    if (q <= 0) return;
    const p = sellPrice(id);
    if (p <= 0) { log('这东西不能卖。', 'warn'); return; }
    removeItem(id, q);
    addItem('beibi', q * p, true);
    log(`你卖掉了 ${ITEMS[id].name}×${q}，获得 ${q * p} 贝壳。`, 'good');
    change();
  }

  function exchangeCoins(n) {
    const q = invCount('coin');
    const amount = Math.max(1, Math.min(n || 1, q));
    if (q <= 0) { log('你没有金币。', 'warn'); return; }
    removeItem('coin', amount);
    addItem('beibi', amount * 30, true);
    log(`你用 ${amount} 枚金币兑换了 ${amount * 30} 贝壳。`, 'good');
    change();
  }

  // ---------- 局外成长：历代遗章 ----------
  let M = null;
  function metaLoad() {
    const read = (k) => { try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } };
    let rawPrimary = null;
    try { rawPrimary = localStorage.getItem('guyuyizhang_meta'); } catch (e) {}
    M = read('guyuyizhang_meta');
    if (!M && rawPrimary) {   // 主档坏了：先把原始串留底，别让它被后面的写入覆盖掉
      try { localStorage.setItem('guyuyizhang_meta_corrupt', rawPrimary); } catch (e) {}
    }
    if (!M) {
      M = read('guyuyizhang_meta_bak');   // 主档读不出来（换包/写入中断）时用备份
      if (M) { try { console.warn('meta 主档损坏，已从备份恢复'); } catch (e) {} }
    }
    if (!M) {
      M = {};
    }
    if (M.soul === undefined) M.soul = 0;
    if (!M.nodes) M.nodes = {};
    if (M.runs === undefined) M.runs = 0;
    if (M.totalSoul === undefined) M.totalSoul = 0;
    if (!(M.backupPoints >= 0)) M.backupPoints = 3;
    if (!M.slots || !Array.isArray(M.slots) || M.slots.length !== 3) M.slots = [null, null, null];
    if (!M.seenMon) M.seenMon = {};
    if (!M.seenItems) M.seenItems = {};
    if (!M.mailbox) M.mailbox = [];
    if (!M.redeemed) M.redeemed = {};
    if (!M.ach) M.ach = {};
    return M;
  }
  function metaSave() {
    try {
      const prev = localStorage.getItem('guyuyizhang_meta');
      if (prev) localStorage.setItem('guyuyizhang_meta_bak', prev);   // 滚动备份：永远留下上一份
      localStorage.setItem('guyuyizhang_meta', JSON.stringify(M));
    } catch (e) {}
  }
  function metaReload() { M = null; return metaLoad(); }   // 强制重新读盘（导入存档码 / 自检用）
  // 存档码：把「历代遗章 + 三个存档槽」打包成一段文本，方便玩家自己备份 / 换设备或换网址后恢复
  function exportCode() {
    try {
      if (!M) metaLoad();
      const payload = { v: 1, t: (typeof window !== 'undefined' && window.BUILD_VER) || '', meta: M };
      return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    } catch (e) { return ''; }
  }
  function importCode(code) {
    try {
      const s = String(code || '').replace(/\s+/g, '');
      if (!s) return { ok: false, reason: '请先粘贴存档码' };
      const data = JSON.parse(decodeURIComponent(escape(atob(s))));
      if (!data || !data.meta || typeof data.meta !== 'object') return { ok: false, reason: '存档码内容不认识' };
      try { const prev = localStorage.getItem('guyuyizhang_meta'); if (prev) localStorage.setItem('guyuyizhang_meta_bak', prev); } catch (e) {}
      M = data.meta;
      metaSave();
      metaLoad();
      return { ok: true, soul: M.soul || 0, runs: M.runs || 0, slots: (M.slots || []).filter(Boolean).length };
    } catch (e) { return { ok: false, reason: '存档码无法解析（可能复制不完整）' }; }
  }
  function redeemCode(code) {
    const m = metaState(); const c = (code || '').trim().toUpperCase();
    if (!c) return { ok:false, reason:'请输入兑换码' };
    if (!REDEEM_CODES[c]) return { ok:false, reason:'兑换码无效' };
    if (m.redeemed[c]) return { ok:false, reason:'这个兑换码你已经用过了' };
    const g = REDEEM_CODES[c];
    m.mailbox.push({ soul: g.soul || 0, item: g.item || null, qty: g.qty || 1, code:c });
    m.redeemed[c] = 1; metaSave();
    return { ok:true, msg: g.item ? `获得 ${ITEMS[g.item].name}×${g.qty || 1}（已存入邮箱）` : `获得 ${g.soul} 魂点（已存入邮箱）` };
  }
  function mailboxList() { return (metaState().mailbox || []).map((x,i) => ({ i, soul: x.soul || 0, item: x.item || null, qty: x.qty || 1 })); }
  function claimMailbox(i) {
    const m = metaState(); const g = (m.mailbox || [])[i];
    if (!g) return { ok:false, reason:'该邮件不存在' };
    if (g.soul) { m.soul += g.soul; }
    if (g.item) { if (S) addItem(g.item, g.qty || 1); }
    m.mailbox.splice(i, 1); metaSave();
    return { ok:true, msg: g.item ? `领取了 ${ITEMS[g.item].name}×${g.qty||1}` : `领取了 ${g.soul} 魂点` };
  }
  function mailboxCount() { return (metaState().mailbox || []).length; }
  function addMailItem(item, qty, soul) { const m = metaState(); m.mailbox.push({ item: item || null, qty: qty || 1, soul: soul || 0 }); metaSave(); }
  function metaState() { if (!M) metaLoad(); return M; }
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
      allBoss:    () => Object.keys(ENEMIES).filter(k => ENEMIES[k].boss).every(k => (c[k] || 0) > 0),
      endA:       () => S.ending === 'A',
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
  function metaAllowed() { return S && (S.difficulty === 'easy' || S.difficulty === 'normal' || S.difficulty === 'dev'); }
  function metaBonus() {
    const b = { stamina:0, cons:0, craft:0, travel:0, luck:0, bag:0, atk:0, armor:0, kit:0 };
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
  function metaLast() { return _lastSettle; }
  function reviveToday() {
    if (S.difficulty === 'legend') { log('传奇难度无法复活。', 'warn'); return; }
    const meta = metaState();
    if (meta.soul < 50) { log('魂点不足（需 50 魂点）。', 'warn'); return; }
    meta.soul -= 50; metaSave();
    if (!S._snap || !S._snap.day) { location.reload(); return; }
    const sn = S._snap.day;
    Object.assign(S, JSON.parse(JSON.stringify(sn)));
    S.stats = JSON.parse(JSON.stringify(sn.stats));
    S.statuses = { bleed:0, poison:0, cold:false, fear:0 };
    S.death = undefined;
    S.ending = undefined;
    S.flags.metaSettled = 0;   // 本局继续，下次死亡可再次结算
    log('你用 50 魂点换回了今天——从日出重新开始。', 'sys');
    change();
  }
  function metaSettle() {
    if (!S || !S.flags || S.flags.metaSettled) return null;
    S.flags.metaSettled = 1;
    // 防刷：从备份继续且该备份已结算过 → 不再给魂
    if (S._fromBackup && S._fromBackupSlot !== undefined) {
      const m0 = metaState();
      const sl = m0.slots && m0.slots[S._fromBackupSlot];
      if (sl && sl.settled) return null;
    }
    const seenN = S.seen ? Object.keys(S.seen).length : 0;
    const kills = Object.values(S.killCount || {}).reduce((a,b)=>a+b,0) || 0;
    let gain = S.day + seenN + Math.round(kills * 0.5);
    if (S.ending && S.ending !== 'D') gain += 200;
    const diffMul = { easy:0.6, normal:1, hard:1.4, legend:2.2 }[S.difficulty] || 1;
    gain = Math.max(1, Math.round(gain * diffMul));
    const meta = metaState();
    meta.soul += gain; meta.runs++; meta.totalSoul += gain; metaSave();
    if (S._fromBackup && S._fromBackupSlot !== undefined) { const m = metaState(); if (m.slots[S._fromBackupSlot]) m.slots[S._fromBackupSlot].settled = true; metaSave(); }
    _lastSettle = { gain, soul: meta.soul };
    return _lastSettle;
  }
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
  function hpMax() { return 100 + (hasRelic('bloodvest') ? 20 : 0) + ((S.equipment.accessory && ITEMS[S.equipment.accessory].hp) || 0) + buffV('hp'); }
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
    if (mode === 'nap') { if (h >= 12 && h <= 16) return 1.3; if (h >= 9 && h <= 18) return 1.1; return 0.8; }
    if (h === 22 || h === 23 || h === 0) return 1.35;
    if (h === 21 || h === 1) return 1.25;
    if (h === 20 || h === 2) return 1.12;
    if (h === 19 || h === 3) return 1.0;
    if (h === 18 || h === 4) return 0.9;
    if (h === 17 || h === 5) return 0.8;
    return 0.7;
  }
  function gainRandomRelic() {
    // 注意：判断"有没有"要看已获得（S.relics），不是看已装备，否则会刷出重复神物
    const pool = Object.keys(RELICS).filter(id => !(S.relics || []).includes(id));
    if (!pool.length) { log('你已集齐所有神物。', 'sys'); return; }
    const id = pool[Math.floor(Math.random() * pool.length)];
    S.relics.push(id);
    log(`你获得了神物【${RELICS[id].name}】——${RELICS[id].desc}`, 'good');
    change();
  }

  // ---------- 深海售卖机（遗失的交易机）：每天随机上架一件神物 ----------
  const RELIC_VENDOR_PRICE = 1200;
  function atlVendor() {
    if (!S.atlantis) S.atlantis = { unlocked:0, visited:0, camp:{ furniture:{}, buildings:{} }, quest:0 };
    const v = S.atlantis.vendor;
    if (v && v.rolled && v.day === S.day) return v;          // 同一天不重刷
    // 亚特兰蒂斯之种不进这台机器（走剧情/奇遇路线，属于特殊神物）
    const pool = Object.keys(RELICS).filter(id => id !== 'atlantisSeed' && !(S.relics || []).includes(id));
    const id = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    S.atlantis.vendor = { day: S.day, id, sold: false, rolled: true };
    return S.atlantis.vendor;
  }
  function atlVendorInfo() {
    const v = atlVendor();
    const it = v.id ? RELICS[v.id] : null;
    return { id: v.id, name: it ? it.name : '', desc: it ? it.desc : '', glyph: it ? it.glyph : '', sold: !!v.sold, price: RELIC_VENDOR_PRICE, day: v.day };
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
  function backupPoints() { const m = metaState(); return m.backupPoints === undefined ? 3 : m.backupPoints; }
  function slotList() { const m = metaState(); return (m.slots || [null, null, null]).map(s => s ? { day: s.day, settled: !!s.settled } : null); }
  function delSlot(i) {
    if (i < 0 || i > 2) return { ok:false, reason:'无效备份槽' };
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
    if (i < 0 || i > 2) return { ok:false, reason:'无效备份槽' };
    if (!S) return { ok:false, reason:'当前没有进行中的游戏' };
    if (backupPoints() <= 0) return { ok:false, reason:'没有备份点了（可用 20 魂点购买）' };
    const m = metaState();
    m.backupPoints--;
    m.slots[i] = { day: S.day, settled: false, data: JSON.parse(JSON.stringify(S)) };
    m.slots[i].data._snap = undefined;
    m.slots[i].data._fromBackup = false;
    metaSave();
    save();   // 同步当前自动存档
    return { ok:true, day: S.day };
  }
  function loadSlot(i) {
    const m = metaState();
    const sl = m.slots && m.slots[i];
    if (!sl) return { ok:false, reason:'该槽为空，先从新游戏开始' };
    const data = JSON.parse(JSON.stringify(sl.data));
    data._fromBackup = true; data._fromBackupSlot = i;
    S = data;
    return { ok:true, day: data.day };
  }

  // ---------- 导出 ----------
  return {
    S: () => S, setS: (s) => { S = s; },
    timePass: (m) => { if (S) addMin(m || 1); },
    bind: (o) => { if (o.onLog) onLog = o.onLog; if (o.onChange) onChange = o.onChange; if (o.onFight) onFight = o.onFight; if (o.onEnding) onEnding = o.onEnding; if (o.onOverlay) onOverlay = o.onOverlay; },
    newGame, load, hasSave, wipeSave, save,
    sceneOf, sceneUnlocked, canTravel, travel, atlantisTeleport, activatePortal, setZone, pointsOf, pointAvailable, pointStatus, doPoint,
    buildChain, buildFurniture, buildHouseExt, houseExtMax, houseExtMats, buildStoreExt, storeExtMax, storeExtMats, storeExtCap, atlantisCamp, atlantisFurnitureUsed, buildAtlantisFurniture, repairDive, demolishFurniture, canCraft, craft, stationAvailable, sellItem, sellPrice, exchangeCoins,
    liveInfo, addSheep, addChick, toggleAutoFeed, deliverToBag,
    plant, harvest, consume, useMed, equip, rest, sleep, farmPlots, farmExt, tillPlot, loosenPlot, FARM_EXTRA_MAX,
    startFight, fightAction, useItemInFight, pointReason, furnSlotFull, furnitureUsed,
    laochaoAvailable, signalFlag, doFirstTrade, completeCommission,
    sellToMerchant, buyFromMerchant, priceOf,
    checkEndingActions, doEnding, settleEnding, collection, currentObjective, metaState, metaBuy, metaBonus, metaSettle, metaNum, metaLast, reviveToday, redeemCode, mailboxList, claimMailbox, mailboxCount, addMailItem, devEnabled, unlockDev, hasRelic, hpMax, gainRandomRelic, durOf, sleepQuality, unlockRelicSlot, equipRelic, unequipRelic, relicSlotCost, atlVendorInfo, buyRelicFromVendor, lotusLeft, backupPoints, slotList, buyBackupPoint, backupSlot, loadSlot, delSlot, exportCode, importCode, metaReload, raidDay, acceptCommission, sharpen, repairWeapon, nameWeapon, repairMatOf, wNameOf, skillUp, skillInfo, craftMax, craftBatch, repairPistol, fixBrokenPistol, travelCost, equipTool, unequipTool, capUsed, unequip, newGame, achCheck, achClaim, achUnlocked, achState,
    hasItem, invCount, addItem, removeItem, capacity, fertilize,
    playerAtk, playerDef, warmth, maxStam, combatLv, expLevel, charStats,
    isNight, isDusk, seasonInfo, fmtTime,
    log, change, addMin, die, diaryAdd,
    resIds, monIds,   // 图鉴名单（总量与列表共用，保证对得上）
  };
})();
