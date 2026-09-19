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
  let onSaveFail = null;      // 存档写不进去时通知界面（配额满 / 被浏览器限制）
  let onSaveConflict = null;  // 检测到别的标签页有更新进度时通知界面

  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const chance = (p) => Math.random() < p;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const fmtTime = () => { const h = Math.floor(S.minute / 60), m = S.minute % 60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; };

  // 界面上的日志是 DOM 里最近 80 条；S.log 只是为了存档留个尾巴，绝不能无限长
  // （曾经一天天攒到 4810 条 / 378KB，把存档码顶到 940KB，逼近 localStorage 上限有掉档风险）
  const LOG_KEEP = 200;
  function log(text, cls) {
    if (onLog) onLog(text, cls);
    if (S && text) {
      S.log.unshift({ t:`第${S.day}天 ${fmtTime()}`, text, cls });
      if (S.log.length > LOG_KEEP) S.log.length = LOG_KEEP;
    }
  }
function change() { 
    if (S) syncToolkit();   // 工具用坏了就从工具栏清掉、备用自动顶上（别让空壳一直挂在那）
    if (S && S.stats && S.stats.hp <= 0 && !S.ending && !S.death) { S.stats.hp = 0; die('你伤势太重，倒在了荒野里。'); return; }   // 兜底：生命≤0必定死亡
    // 精神低落会压低体力上限，体力要跟着上限走（喝药透支后不该还能顶着一管超额的体力）
    if (S && S.stats) { const ms = maxStam(); if (S.stats.stamina > ms) S.stats.stamina = ms; }
    if (S) S._dirty = true;      // 有改动 → 兜底自动存档（每 20 秒那次）才知道该不该写
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
    // ⚠️ 容量判定必须和界面显示的 capUsed() 用同一套算法：可堆叠每 20 个算 1 格、stack:1 一件 1 格、货币 1 格。
    //    旧写法用的是 Object.keys(S.inv).length（"物品种类数"），和 capUsed() 完全不是一回事：
    //    堆叠的格子没被算进去 → 背包早就超了、满格判定却还以为没满 → 新东西照收（背包无限膨胀），
    //    制作/购买时产物又因为"种类数满了"被拒 → 材料白扣、钱白花、东西凭空消失。
    const usedSlots = capUsed();
    // 卡主线的关键道具（石板/遗物/龙骨）不受容量限制，绝不会因为背包满而被卡住
    const fits = it.alwaysFit || it.cat === 'currency' || it.cat === 'bp';   // 图纸同样不占格子（背包满也收得下）
    if (S.inv[id]) {
      S.inv[id] += qty;
    } else {
      if (!fits && usedSlots >= capNow) { if (!silent) { log('你的背包容量已达上限！', 'danger'); notifyBagFull(); } return false; }
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
    // 腾出空位就把"待收"里的东西补进来（不用等到第二天）
    if (S.furnPending) flushPending();
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
  // 工具栏跟背包对齐：工具用坏被移出背包后，栏里不能还挂着它（玩家反馈"石斧耐久没了还挂在装备栏"）。
  // 清掉之后再把背包里同款的备用工具自动顶上 —— 就是玩家期望的"用完自动接着装"。
  function syncToolkit() {
    if (!Array.isArray(S.toolkit)) return;
    let cleared = false;
    for (let i = 0; i < S.toolkit.length; i++) {
      const id = S.toolkit[i];
      if (id && (!ITEMS[id] || !ITEMS[id].tool || invCount(id) <= 0)) { S.toolkit[i] = null; cleared = true; }
    }
    // ⚠️ 只有真的清掉坏工具时才去补位。平时别顺手 autoToolkit()：
    //    那会在开局就把空格填上第一件工具，之后新做出来的工具反而进不了栏
    //    （"斧头做了却砍不了树"就是这么来的）。
    if (cleared) autoToolkit();
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
    // 归零后保留在背包、自动卸下，回营地磨刀石修补（材料见 REPAIR_MATS）。
    const keep = !!(named || it.keepBroken);
    const keepMsg = named
      ? `${ITEMS[id].name}损坏了（你命名的武器，不会消失），用磨刀石修补后再用。`
      : `${ITEMS[id].name}损坏了（限时绝版物品不会消失），回营地用磨刀石修补后再用。`;
    if (durs && durs.length) {
      const cur = durs[ei] !== undefined ? durs[ei] : durs[0];
      if (cur - 1 <= 0) {
        if (keep) { durs[ei] = 0; S.dur[id] = 0; S.equipment[slot] = null; log(keepMsg, 'orange'); diaryAdd(`我的${ITEMS[id].name}受损了。`); }
        else { removeItem(id, 1, { durIdx: ei }); S.equipment[slot] = null; log(`你的${ITEMS[id].name}在战斗中折断了！`, 'orange'); diaryAdd(`我的${ITEMS[id].name}断了。`); }
      }
      else { durs[ei] = cur - 1; durSync(id); }
    } else {
      const cur = S.dur[id] !== undefined ? S.dur[id] : DURA[id];
      if (cur - 1 <= 0) { if (keep) { S.dur[id]=0; S.equipment[slot] = null; log(keepMsg, 'orange'); diaryAdd(`我的${ITEMS[id].name}受损了。`); } else { removeItem(id, 1); S.equipment[slot] = null; log(`你的${ITEMS[id].name}在战斗中折断了！`, 'orange'); diaryAdd(`我的${ITEMS[id].name}断了。`); } }
      else S.dur[id] = cur - 1;
    }
    // 自动顶上备用武器时，跳过那些已经打坏的（耐久 0 的会"一装备就又坏"，等于白骗玩家一次）
    // ⚠️ 还要跳过弹药：箭矢/鹰羽箭的 cat 也是 'weapon'，以前弓一打坏，系统会把背包里的
    //    「箭矢」当成备用武器给你装备上（日志写"你迅速换上了箭矢继续战斗"），主手就变成了一把箭。
    if (S.equipment[slot] === null) { const next = Object.keys(S.inv).filter(k => ITEMS[k] && ITEMS[k].cat === 'weapon' && !ITEMS[k].ammo && (DURA[k] === undefined || (durOf(k) || 0) > 0)).sort((a,b) => (ITEMS[b].atk||0) - (ITEMS[a].atk||0))[0]; if (next && !(S.equipment.weapon === next || S.equipment.weapon2 === next)) { S.equipment[slot] = next; log(`你迅速换上了${ITEMS[next].name}继续战斗。`, 'good'); } }
  }
  function drainById(id) {
    if (!invCount(id) || DURA[id] === undefined) return;
    const durs = durList(id);
    if (durs && durs.length) {   // 按实例：先用耐久最低的那件（让它先坏）
      let mi = 0; for (let i = 1; i < durs.length; i++) if (durs[i] < durs[mi]) mi = i;
      const cur = durs[mi];
      if (cur - 1 <= 0) { removeItem(id, 1, { durIdx: mi }); syncToolkit(); log(`你的${ITEMS[id].name}用坏了！`, 'orange'); }
      else { durs[mi] = cur - 1; durSync(id); }
      return;
    }
    const cur = S.dur[id] !== undefined ? S.dur[id] : DURA[id];
    if (cur - 1 <= 0) { removeItem(id, 1); syncToolkit(); log(`你的${ITEMS[id].name}用坏了！`, 'orange'); }
    else S.dur[id] = cur - 1;
  }
  // 货币固定1格；工具/装备一件1格；可堆叠每20=1格；⚠️ 图纸（bp）不占格子（玩家要求：学过的图纸不该挤仓库）
  function capUsed() {
    let n = 0;
    for (const id in S.inv) {
      if (!(S.inv[id] > 0)) continue;
      const it = ITEMS[id];
      if (it && it.cat === 'bp') continue;                                     // 图纸不占
      n += (it && it.cat === 'currency') ? 1 : (it && it.stack === 1) ? S.inv[id] : Math.ceil(S.inv[id] / 20);
    }
    return n;
  }
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
    // ⚠️ 作者 2026-09-19：自动吃的东西可以自己指定（玩家反馈"它总是吃超级大蛋，很心疼"）。
    //    没指定偏好时，改成"挑够用的里面最省的那份"，不再无脑拿第一件（背包顺序里超级大蛋常排前面）。
    const pickAuto = (kind) => {
      const has = (k) => !!(ITEMS[k] && invCount(k) > 0);
      const val = (k) => kind === 'food' ? (ITEMS[k].food || 0) : (ITEMS[k].water || 0);
      const okFood = (k) => has(k) && ITEMS[k].cat === 'food' && val(k) > 0;
      const okDrink = (k) => has(k) && (ITEMS[k].cat === 'drink' || val(k) > 0);
      const pref = ((S.satchelPref || {})[kind]) || '';
      if (pref && ((kind === 'food' && okFood(pref)) || (kind === 'drink' && okDrink(pref)))) return pref;
      const all = Object.keys(S.inv);
      // 吃：挑饱食最小的那份（浆果优先，别动超级大蛋）
      if (kind === 'food') {
        const foods = all.filter(okFood).sort((a, b) => val(a) - val(b));
        return foods[0] || null;
      }
      // 喝：有正经饮品（水/蜂蜜水/药）先喝水分最小的；只剩带水分的食物时挑水分最多的
      const drinks = all.filter(k => has(k) && ITEMS[k].cat === 'drink' && val(k) > 0).sort((a, b) => val(a) - val(b));
      if (drinks.length) return drinks[0];
      const juicy = all.filter(okDrink).sort((a, b) => val(b) - val(a));
      return juicy[0] || null;
    };
    if (hasRelic('satchel')) {
      if (S.stats.hunger < 50) {
        const f = pickAuto('food');
        if (f) { S.stats.hunger = Math.min(100, S.stats.hunger + (ITEMS[f].food||0)); removeItem(f, 1); log(`食之包自动喂了你：${ITEMS[f].name}。（饱食+${ITEMS[f].food||0}）`, 'good'); }
      }
      if (S.stats.thirst < 50) {
        const d = pickAuto('drink');
        if (d) { S.stats.thirst = Math.min(100, S.stats.thirst + (ITEMS[d].water||0)); removeItem(d, 1); log(`食之包自动喂了你：${ITEMS[d].name}。（饮水+${ITEMS[d].water||0}）`, 'good'); }
      }
    }
    const mb = metaBonus();
    const diffMul = (DIFFICULTIES[S.difficulty] && DIFFICULTIES[S.difficulty].drainMul) || 1;   // 简单/普通：饥渴消耗更慢
    S.stats.hunger = Math.max(0, S.stats.hunger - (S.difficulty === 'dev' ? 0 : 2 * (1 - mb.cons) * diffMul));
    // ⚠️ 滤雨器是"在水壶上加装滤网"（升级），必须一并算作有水壶 ——
    //    否则升完级 tank 被删掉、-20% 口渴效果直接失效（玩家反馈"升级后水壶不见了、效果还有吗"）。
    const hasTank = !!(S.furniture.tank || S.furniture.rainfilter);
    S.stats.thirst = Math.max(0, S.stats.thirst - (S.difficulty === 'dev' ? 0 : 2 * (season.thirstMul || 1) * (hasTank ? 0.8 : 1) * (1 - mb.cons) * diffMul));
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
    // 中暑：夏天穿太厚会捂出毛病（只看衣物保暖，屋里的保暖不算——在屋里避暑是合理的）
    const clothWarm = (S.equipment.cloth && ITEMS[S.equipment.cloth]) ? (ITEMS[S.equipment.cloth].warm || 0) : 0;
    if (season.heat && clothWarm >= 4) {
      S.statuses.heat = true;
      S.stats.hp -= 3;
      log('烈日当头，厚衣服捂得你头晕眼花。（-3 生命，夏天别穿棉袄）', 'danger');
      if (S.stats.hp <= 0) return die('你中暑倒在了太阳底下。');
    } else if (S.statuses.heat) {
      S.statuses.heat = false;
      log('你脱下厚衣服，凉快下来了。');
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

  // ---------- 弹窗暂停：开着"纯管理"弹窗时，时间不流逝 ----------
  // 看背包/装备/技能/图鉴这些界面时不该被时间推着走（也免得边翻东西边掉饱食度）。
  // 由 ui.js 在开关这些弹窗时调用 setTimeFreeze()；营地面板/制造/交易/耕地那些"要花时间的操作"
  // 不在此列（它们本身就是主动消耗时间的行为）。
  let _timeFrozen = false;
  function setTimeFreeze(on) { _timeFrozen = !!on; }
  function timeFrozen() { return _timeFrozen; }

  function addMin(m) {
    // 冻结期间不推进任何时间（连 tick 都不加，免得晾晒/保鲜的计时被偷偷推进）
    if (_timeFrozen) return false;
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
  // 给"野外捡到东西"用：装得下就进包；装不下就进待收，绝不凭空消失（返回是否直接进了包）
  function gainItem(id, n) {
    if (addItem(id, n, true)) return true;
    S.furnPending = S.furnPending || {};
    S.furnPending[id] = (S.furnPending[id] || 0) + n;
    log(`背包满了：${ITEMS[id].name}×${n} 先记在待收里，腾出空间后自动收下。`, 'warn');
    notifyBagFull();
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
    // 牧场：鸡舍 / 羊圈（喂食 → 产出 → 成长 → 寿终）+ 草地陷阱 → 一起汇总成"每日晨报"
    collectDailyReport();
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
    // 灵灰：清晨偶尔跟你说说话
    if (S.identity === 'linghui' && chance(0.5)) log(LINGHUI_LINES[Math.floor(Math.random()*LINGHUI_LINES.length)], 'blue');
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
  // 技能改版迁移（旧等级 → 经验返还，双倍）。
  // ⚠️ load() 和 loadSlot() 都要跑：备份槽里存的是"当时那份 S"，可能是技能改版前的老格式。
  //    以前只在 load() 里迁移，于是"从备份继续"会拿到"有等级、没有成长选项"的档 ——
  //    等级还在但一点属性都不给（玩家反馈"前面升的级属于加了没？打雪鹰才 10 点血"）。
  function migrateSkills() {
    if (S.tree) return;                       // 已经迁移过（新存档在 newGame 里就有 S.tree）→ 幂等
    const who = { gather:'采集', craft:'制造', combat:'战斗' };
    for (const k of ['gather','craft','combat']) {
      const old = Math.min(5, (S.skill && S.skill[k]) || 0);
      if (!old) continue;
      let newTo = 0;
      // 折算要按"这个技能树当前的消耗"来算（采集 ×2、制造 ×3），别用基准表，否则老玩家吃亏
      for (let i = 0; i < Math.min(old, SKILL_TRUNK_COST.length); i++) newTo += trunkCostOf(k, i);
      const back = Math.round(newTo * 2);
      S.exp = S.exp || {}; S.exp[k] = Math.round(((S.exp[k] || 0) + back) * 10) / 10;
      S.skill[k] = 0;
      log(`【技能改版】${who[k]}技能旧等级 ${old} 已折算成 ${back} 点${who[k]}经验——打开「技能」自己重新加点。`, 'good');
    }
    S.tree = { gather:{}, craft:{}, combat:{} };
    S.skillPicks = { gather:[], craft:[], combat:[] };
  }
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
    if (!j || !j.day) return { ok:false, reason:'这份内容不完整' };
    S = j;
    normalizeAfterLoad();
    return { ok:true, day: j.day, identity: j.identity };
  }
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

  // ---------- 存档多重落地：localStorage 之外再镜像一份 cookie ----------
  // 为什么：TapTap / 手机 WebView 里"清缓存、平台升级"有时只清 localStorage，
  // 而 cookie 往往能留下来（网页游戏最老牌的兜底）。两边都写，读的时候取"更新的那份"。
  // ⚠️ 单个 cookie 约 4KB 上限：只镜像主存档与账号数据，太长（比如带满三个备份槽的导出码）就跳过。
  const CK = { save: 'guyu_save', saveAt: 'guyu_saveAt', meta: 'guyu_meta', metaAt: 'guyu_metaAt' };
  function ckSet(k, v, days) {
    try { document.cookie = k + '=' + encodeURIComponent(v) + '; expires=' + new Date(Date.now() + days * 864e5).toUTCString() + '; path=/; SameSite=Lax'; } catch (e) {}
  }
  function ckGet(k) {
    try { const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + k + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; } catch (e) { return null; }
  }
  function ckMirror(k, atKey, json) {
    if (!json || json.length > 3600) return false;   // 超长就不写，免得整个 cookie 被浏览器丢掉
    ckSet(k, json, 180); ckSet(atKey, String(Date.now()), 180);
    return true;
  }
  function save() {
    try {
      const copy = JSON.parse(JSON.stringify(S));
      copy._snap = undefined;   // 持久化存档不带快照；内存内快照保留，供死亡回退
      copy._dirty = undefined; copy._savedAt = undefined;   // 这两个只是运行时状态，不写进存档
      if (copy.log && copy.log.length > LOG_KEEP) copy.log.length = LOG_KEEP;   // 老存档也会在下次保存时瘦下来
      // ---- 存档加固 ①：多标签页/被后台恢复的旧页面不许用旧进度覆盖更新的存档 ----
      try {
        const revNow = parseInt(localStorage.getItem('guyuyizhang_rev') || '0', 10) || 0;
        if (revNow > (S._rev || 0)) {
          if (typeof onSaveConflict === 'function') onSaveConflict(revNow);
          return { ok:false, reason:'other-tab' };
        }
      } catch (e) {}
      const prev = localStorage.getItem('guyuyizhang_save');
      if (prev) localStorage.setItem('guyuyizhang_save_bak', prev);   // 滚动备份：始终保留上一份
      const json = JSON.stringify(copy);
      localStorage.setItem('guyuyizhang_save', json);
      // ---- 存档加固 ②：写完读回来验一遍，确认真的落盘了（配额满/被系统限制时会写不进去） ----
      const back = localStorage.getItem('guyuyizhang_save');
      if (back !== json) throw new Error('verify failed');
      S._rev = (S._rev || 0) + 1;
      try { localStorage.setItem('guyuyizhang_rev', String(S._rev)); } catch (e) {}
      // ---- 存档加固 ③：留一份"上次保存时间"，面板里能看到，别再无声无息 ----
      try { localStorage.setItem('guyuyizhang_savedAt', String(Date.now())); } catch (e) {}
      S._savedAt = Date.now();
      ckMirror(CK.save, CK.saveAt, json);   // 再镜像一份到 cookie（localStorage 被清时靠它救回来）
      try { cloudPush(false); } catch (e) {}   // 再排一次云同步（内部有 60 秒节流，不会顶到官方频次上限）
      return { ok:true, size: json.length };
    } catch (e) {
      console.warn('save failed', e);
      if (typeof onSaveFail === 'function') onSaveFail(e);
      return { ok:false, reason:(e && e.name) || 'error' };
    }
  }
  // 安全模式用：把"上次保存前的滚动备份"当主档读回来
  // （save() 每次写入前都会把旧档滚到 guyuyizhang_save_bak，所以最多退回几步）
  function restoreBackupSave() {
    try {
      const bak = localStorage.getItem('guyuyizhang_save_bak');
      if (!bak) return { ok:false, reason:'本机没有备份存档' };
      localStorage.setItem('guyuyizhang_save', bak);
      return load() ? { ok:true } : { ok:false, reason:'备份存档读不出来' };
    } catch (e) { return { ok:false, reason:String((e && e.message) || e) }; }
  }
  let loadRetried = false;   // 主档坏掉时只允许"从 _bak 重走一遍读档"一次
  function load() {
    try {
      let raw = localStorage.getItem('guyuyizhang_save');
      // —— cookie 兜底①：localStorage 被清空（平台清缓存/WebView 换存储）时用 cookie 里那份 ——
      const ckRaw = ckGet(CK.save);
      const ckAt = parseInt(ckGet(CK.saveAt) || '0', 10) || 0;
      const localAt = parseInt(localStorage.getItem('guyuyizhang_savedAt') || '0', 10) || 0;
      if (ckRaw && (!raw || ckAt > localAt)) {
        raw = ckRaw;
        try { localStorage.setItem('guyuyizhang_save', ckRaw); } catch (e) {}   // 顺手写回本地
      }
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
      if (S.log.length > LOG_KEEP) S.log.length = LOG_KEEP;   // 老存档读进来先瘦一遍
      // 天气键必须是已知值：老存档/手改档里出现 'clear' 之类会让顶部状态栏直接抛异常（整屏不再刷新）
      if (!WEATHER[S.weather]) S.weather = 'sun';
      // 读档 = 玩家要接着玩：死亡/已结算的标记必须清掉，不然结局按钮和时间都会卡死
      if (S.ending) S.ending = undefined;
      if (S.death) S.death = undefined;
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
      if (S.coopExt === undefined) S.coopExt = 0;   // 老存档：鸡舍没扩建过
      migrateSkills();
      if (S.storeExt === undefined) S.storeExt = 0;
      if (S.gatherCount === undefined) S.gatherCount = 0;
      if (S.craftCount === undefined) S.craftCount = 0;
      if (!S.satchelPref) S.satchelPref = { food:'', drink:'' };   // 食之包：自动吃/喝优先用哪一件
      // 一局只认一个结算结局（作者 2026-09-18 定的规矩）：老存档如果在旧版本里已经结算过某个结局，
      // 把那一份补记成"本存档的定局"，免得它读进来之后还能接着结算别的结局。
      if (!S.flags.settledEnding) {
        for (const k of ['A','B','C','S','S2']) if (S.flags['settled_' + k]) { S.flags.settledEnding = k; break; }
      }
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
      if (S.pistolCalibrated === undefined) S.pistolCalibrated = false;   // 老档：默认未校准（命中 60%），不影响任何已有进度
      if (!S.settings) S.settings = { roadAmbush: true };                  // 老档：补上设置对象（赶路遇袭默认开）
      if (S.settings.roadAmbush === undefined) S.settings.roadAmbush = true;
      if (S.atlantis === undefined) S.atlantis = null;
      autoToolkit();
      S._rev = (() => { try { return parseInt(localStorage.getItem('guyuyizhang_rev') || '0', 10) || 0; } catch (e) { return 0; } })();
      return true;
    } catch(e) {
      console.warn('load failed, try backup', e);
      // 主档解析失败时把原始串留底，别让后面的保存把它冲掉
      try { const broken = localStorage.getItem('guyuyizhang_save'); if (broken) localStorage.setItem('guyuyizhang_save_corrupt', broken); } catch (e0) {}
      // 主档坏了 → 把 _bak 挪到主档位，再把**整条正常读档流程重走一遍**：这样救回来的这份能拿到
      // 和正常读档完全一样的待遇（补字段 / 技能迁移 / 耐久对齐 / 对齐存档版本号）。
      // ⚠️ 以前这里只 JSON.parse(bak) 就 return true，S._rev 是空的 → 之后每一次 save() 都会被
      //    "另一个标签页有更新进度"那道守卫拒掉，玩家看到的就是"进度存不进去 / 覆盖不上"。
      // 只重试一次，免得 _bak 也坏掉时反复递归。
      if (!loadRetried) {
        loadRetried = true;
        try {
          const bak = localStorage.getItem('guyuyizhang_save_bak');
          if (bak) { localStorage.setItem('guyuyizhang_save', bak); return load(); }
        } catch (e2) {}
      }
      return false;
    }
  }
  // 主档不在时也要看 cookie 里那份（平台清 localStorage 后靠它救回来）
  function hasSave() { try { return !!(localStorage.getItem('guyuyizhang_save') || ckGet(CK.save)); } catch(e){ return false; } }

  // ---------- 新游戏 ----------
  function newGame(identity, difficulty) {
    // ⚠️ 开新游戏之前，先把"正在玩的那一份"留一份救援档（玩家反馈：开新档把一直玩的档顶掉了，找不回来）
    rescueStash();
    S = {
      v:1, identity, difficulty,
      day:1, minute:8*60, tick:0, weather:'sun', weatherRolled:true,
      stats:{ hp:100, stamina: 100 + (DIFFICULTIES[difficulty].stamina || 0), hunger:100, thirst:100, spirit:100 },      statuses:{ bleed:0, poison:0, cold:false, fear:0 },
      inv:{}, capacity:20, foodExp:{}, relics:[], relicSlots:0, relicEquip:[null,null,null], dur:{}, toolDurs:{}, tut:null, equipIdx:{weapon:0, weapon2:0, armor:0, cloth:0, accessory:0}, weaponNames:{},
      equipment:{ weapon:null, weapon2:null, armor:null, cloth:null, accessory:null },
      buildings:{ house:0, fire:0, storage:0, wall:0, watch:0, dock:0, farm:0 },
      furniture:{}, crops:[], farmExt:0, coopExt:0,
      tree:{ gather:{}, craft:{}, combat:{} }, skillPicks:{ gather:[], craft:[], combat:[] },
      scene:'camp', zone:null, weatherWarned:null, skill:{ craft:0, gather:0, combat:0 }, toolkit:[null, null, null],
      laochao:{ nextVisit:5, arrived:false, arrivedDay:0, done:{}, accepted:{} },
      fame:0,
      exp:{ gather:0, craft:0, combat:0 },
      flags:{}, diary:[], log:[], seen:{},
      pointUses:{}, killCount:{}, sold:{}, hpLostTotal:0,
      livestock:{ pen:[], coop:[], autoFeed:true }, traps:{ placed:0 },
      death:null, ending:null, combat:null, pistolCalibrated:false,
     settings:{ roadAmbush:true },   // 赶路遇袭（危险度≥3 的区域会被狼/熊拦路）；玩家可在设置里关掉
     satchelPref:{ food:'', drink:'' },   // 食之包自动进食饮水优先用哪一件（空 = 自动挑最省的）
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
    // 《历代遗章》·各技能模块初始经验（作者 2026-09-17）：技能经验本身不跨局，改由传承给开局经验
    if (mbK.startG) S.exp.gather = Math.round(((S.exp.gather || 0) + mbK.startG) * 10) / 10;
    if (mbK.startC) S.exp.craft  = Math.round(((S.exp.craft  || 0) + mbK.startC) * 10) / 10;
    if (mbK.startF) S.exp.combat = Math.round(((S.exp.combat || 0) + mbK.startF) * 10) / 10;
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
    S._rev = (() => { try { return parseInt(localStorage.getItem('guyuyizhang_rev') || '0', 10) || 0; } catch (e) { return 0; } })();
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
    if (!force && !chance(roadAmbushChance(danger))) return false;
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
    if (rollTravelAmbush(id)) { change(); return; }
    arriveAt(id);
  }
  // 真正抵达目的地：切场景 + 场景描述 + 草地陷阱 + 随机事件
  function arriveAt(id) {
    const sc = sceneOf(id);
    S.scene = id; S.zone = (id === 'atlantis') ? 'habitat' : null;   // 海底默认落在礁石栖息地
    if (id === 'atlantis' && S.identity === 'linghui') log('灵灰贴着水面向下望，忽然安静下来：「我好像……见过这里。」', 'blue');
    const d = sceneDesc(sc);
    log(d);
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
    if (p.once && S.flags['pt_'+p.id] && !altarReady(p)) return '这里你早已搜刮过。';
      if (p.id === 'grass_horse' && S.flags.horse) return '这匹野马已被你驯服了。';
      return '现在还做不了这件事。';
    }
    return 'ok';
  }
  // 河畔撒网 = 竭泽而渔：下网当天算起 4 天里，河畔的垂钓点和撒网点都空着（第 4 天恢复）
  function riverNetBanned(p) {
    if (!p || (p.id !== 'river_fish' && p.id !== 'river_net')) return false;
    return (S.flags.riverNetBan || 0) >= S.day;
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
    const en = Math.max(2, Math.round((p.energy || 10) * (1 - (tt - 1) * 0.12) * gxEnergyMul()));   // 工具等级越高越省体力；技能树的「耐劳/精细/粗放」也在这里生效
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
        : p.type === 'townInfo' ? 'info' : (p.type === 'trade' && p.id === 'cove_black') ? 'black' : p.type;
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
      const pool = p.enemies.map(e => ENEMIES[e]).filter(e => e && !(e.nightOnly && !isNight()) && (caveNow || !e.minDay || S.day >= e.minDay));
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
      let bagFull = 0;
      for (const y of p.yields) {
        if (y.chance && !chance(y.chance)) continue;
        let q = qtyParse(y.min === undefined ? 1 : y.min);
        if (y.max !== undefined) q = rnd(y.min, y.max);
        q = Math.max(1, Math.round(q * diff * weff * (1 + (tt - 1) * 0.18) * gxYieldMul()));
        if (y.id === 'wood' && S.identity === 'woodcutter') q = Math.round(q * 1.5);
        if ((y.id === 'herb') && S.identity === 'herbalist') q = q * 2;
        // ⚠️ 装不下就不能算"获得"：以前无条件 push 到 got，背包满时日志喊"获得×N"其实没进包
        if (addItem(y.id, q)) got.push(`${ITEMS[y.id].name}×${q}`);
        else bagFull++;
      }
      // 伐木专精：每次砍树额外 +0.5 / +1 木材。0.5 这种零头攒够 1 份才给（日志写明是技能给的）
      if (gxWoodExtra() > 0 && p.need && p.need.tool === 'axe' && (p.yields || []).some(y => y.id === 'wood')) {
        S.woodBonus = (S.woodBonus || 0) + gxWoodExtra();
        const ex = Math.floor(S.woodBonus);
        if (ex > 0) {
          S.woodBonus -= ex;
          if (addItem('wood', ex)) { got.push(`木材×${ex}`); log(`【伐木专精】额外多得 木材×${ex}。`, 'good'); }
        }
      }
      if (bagFull) { log('背包满了，这次采到的东西没能装进去——腾出空位再来。', 'warn'); notifyBagFull(); }
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
        S.flags.riverNetBan = S.day + 3;
        log('这一网把河湾捞了个干净——接下来 4 天，这里既钓不到也网不到鱼了。', 'warn');
      }
      S.exp.gather += EXP_GATHER;
      if (p.need) { if (p.need.tool) drainTool(p.need.tool); if (p.need.item && DURA[p.need.item] !== undefined) drainById(p.need.item); }
    } else if (p.type === 'fish') {
      let q = rnd(1,3) * diff;
      if (S.identity === 'fisher') q = Math.round(q * 1.5);
      q = Math.max(1, Math.round(q * (WEATHER[S.weather].eff)));
      const intoBag = gainItem('fish', q);
      log(p.text || '鱼线一动，你提起一条银亮的鱼。');
      if (intoBag) log(`获得：鱼×${q}。`, 'good');
      S.exp.gather += EXP_GATHER;
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
      S.exp.gather += EXP_GATHER;
    } else if (p.type === 'drift') {
      if (chance(0.6)) {
        const roll = Math.random();
        if (roll < 0.5) { const q = rnd(1,3); addItem('wood', q); log(`你捞起几根上游漂来的木头（木材×${q}）。`, 'good'); }
        else if (roll < 0.8) { addItem('plank', 1); log('你捞起一块完整的木板。', 'good'); }
        else if (roll < 0.9) { addItem('driftbottle', 1); log('一个漂流瓶！你把它捞了上来。', 'good'); triggerStory({ id:'e_driftbottle' }); }
        else { log('只有水草和泡沫。'); }
      } else { log('今天河里很干净，什么也没漂来。'); }
      S.exp.gather += EXP_GATHER;
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
    addMin(Math.max(1, Math.round((p.time || 15) * (1 - (tt - 1) * 0.2) * spiritSlow * gxTimeMul())));
    if (['gather','fish','trap','drift'].includes(p.type)) S.gatherCount = (S.gatherCount || 0) + 1;
    // 采集已完整结算（产出入包、时间体力已扣）；若之前判定遇袭，此刻才进入战斗
    if (p.type === 'gather' && ambush) { log(`你正忙着采集，${ambush.name}突然窜了出来！`, 'danger'); startFight(ambush); return; }
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
          else { S.stats.hp -= 8; S.statuses.poison = Math.max(S.statuses.poison, 3); log('野蜂疯狂扑来！你被蛰得满头包。（-8 生命，中毒）','danger'); if (S.stats.hp<=0) die('野蜂的毒要了你的命。'); }
          addMin(20);
        } });
      }
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
      // 白骨旁的破包裹只搜一次：翻过就没了（无论翻到金币还是被沙蝎咬）。
      // 以前没打标记 → 能反复翻，等于无限金币。选"合十离开"不打标记，后悔了还能回来翻。
      choices.push({ label:'搜刮包裹', hint:'可能得金币，或窜出沙蝎（-8 生命）', ok:()=>{ if (chance(0.5)) { const n = rnd(2,4); if (gainItem('coin', n)) log(`破包裹里竟有几枚古金币！获得：金币×${n}。`,'good'); } else { S.stats.hp -= 8; log('包裹里窜出一条沙蝎！（-8 生命）','danger'); if (S.stats.hp<=0) die('你倒在了白骨旁。'); } markDone(); addMin(20);} });
      choices.push({ label:'合十离开', hint:'精神+1', ok:()=>{ S.stats.spirit = Math.min(100, S.stats.spirit+1); log('你为他掩上一点沙，心里平静了一些。'); } });
    } else if (id === 'cave_slate') {
      showOnce({ title:'洞中遗迹', text:'岩壁上刻满了与荒漠白骨同源的古老文字。你在石缝里找到一块脱落的石板。', choices:[{ label:'带走石板', ok:()=>{ if (gainItem('slate',1)) { markDone(); log('获得：石板×1。','good'); } diaryAdd('洞深处的古文字。这座岛比我想的更老。'); } }]});
      return;
    } else if (id === 'peak_altar') {
      // 材料齐了就直接在这里开仪式（原来只有右下角那个小按钮，玩家极容易漏看）
      if (!S.flags.ended_C && hasItem('relic') && invCount('slate') >= 3 && hasItem('dragonbone')) {
        showOnce({ title:'远古祭坛', text:'凹槽的形状与三块石板严丝合缝，遗物在掌心发烫，龙骨也跟着共鸣——祭坛在等你把它们放上去。', choices:[
          { label:'举行祭坛仪式（结局·秘辛）', hint:'遗物 + 石板×3 + 龙骨', ok:()=>{ doEnding('endC'); } },
          { label:'再等等', hint:'先不举行', ok:()=>{ log('你把手收了回来。'); } },
        ]});
        return;
      }
      if (S.flags['pt_' + p.id] && !onceRewardMissing(p)) {
        showOnce({ title:'远古祭坛', text:'祭坛中央的凹槽还空着。这里似乎还缺些东西——遗物、三块石板、龙骨，缺一不可。', choices:[{ label:'知道了', ok:()=>{} }]});
        return;
      }
      showOnce({ title:'远古祭坛', text:'祭坛中央的凹槽形状奇异，四周刻着与石板相同的文字。你搬开碎石，露出一件蒙尘的遗物。', choices:[{ label:'带走遗物', ok:()=>{ if (gainItem('relic',1)) { markDone(); log('获得：遗物×1（结局·秘辛 需要的祭品之一）。','good'); } diaryAdd('山顶祭坛的遗物，冰凉得像在发烫。'); } }]});
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
      choices.push({ label:'撬开它', hint:'70%得金币，或触发机关（-10 生命）', ok:()=>{ if (chance(0.7)) { const n = rnd(2,5); if (gainItem('coin', n)) log(`生锈的宝箱里滚出金币！获得：金币×${n}。`,'good'); } else { S.stats.hp -= 10; log('箱子里有机关！飞针擦过你的手臂。（-10 生命）','danger'); if (S.stats.hp<=0) die('锈箱里的机关要了你的命。'); } addMin(20);} });
      choices.push({ label:'不敢碰', hint:'无风险', ok:()=>{ log('你离开了宝箱。'); } });
    } else if (id === 'ruins_slate') {
      showOnce({ title:'遗迹石板', text:'断柱之间，一块石板完整无缺，刻着与洞中相同的文字。', choices:[{ label:'带走石板', ok:()=>{ if (gainItem('slate',1)) { markDone(); log('获得：石板×1。','good'); } } }]});
      return;
    } else if (id === 'ruins_explore') {
      choices.push({ label:'摸进废墟', hint:'可能得金币/遇守卫/迷路', ok:()=>{ const r = Math.random(); if (r < 0.4) { const n = rnd(2,5); addItem('coin', n); if (chance(0.3)) addItem('crystal',1); log(`你在废墟里找到古金币×${n}。`,'good'); } else if (r < 0.7) { log('石像的阴影动了！'); startFight(ENEMIES.guard); } else { S.stats.spirit = Math.max(0, S.stats.spirit-8); log('你在断壁间迷了路，许久才转出来。（精神-8）','warn'); } addMin(30);} });
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
        if (c.items) for (const k in c.items) { if (c.chance === undefined || chance(c.chance)) { const q = typeof c.items[k] === 'number' ? c.items[k] : 1; if (gainItem(k, q)) log(`获得：${ITEMS[k].name}×${q}。`, 'good'); } }
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
  // 近战伤害：双持时不再取两把平均，而是【轮流出手】——本轮轮到哪把就用哪把的伤害，
  // 每挥一次换手。所以快匕首配重武器是"一轻一重交替"，而不是"用匕首的攻速吃大剑的伤害"。
  function playerAtk() {
    const ax = (S.equipment.accessory && ITEMS[S.equipment.accessory] && ITEMS[S.equipment.accessory].atk) || 0;
    const cur = meleeWeaponNow();
    const wAtk = cur ? (cur.atk || 0) : 0;
    const wNames = (cur && S.weaponNames && S.weaponNames[cur.id] && S.weaponNames[cur.id].bonus) || 0;
    let base = 5 + wAtk + wNames + ax + (S.weaponSharpen && S.weaponSharpen.am ? S.weaponSharpen.am : 0) + cxAtk() + buffV('atk');
    return Math.round(base * (1 + metaBonus().atk));
  }
  // 面板用：双持时给两把伤害的均值（期望值），免得面板显示"下一刀"让人误以为攻击变弱了
  function playerAtkAvg() {
    const ax = (S.equipment.accessory && ITEMS[S.equipment.accessory] && ITEMS[S.equipment.accessory].atk) || 0;
    const me = meleeWeapons();
    const nm = (S.weaponNames && S.weaponNames[me[0] && me[0].id] && S.weaponNames[me[0].id].bonus) || 0;
    const wAtk = me.length ? Math.round(me.reduce((a,b)=>a+(b.atk||0),0) / me.length) : 0;
    let base = 5 + wAtk + nm + ax + (S.weaponSharpen && S.weaponSharpen.am ? S.weaponSharpen.am : 0) + cxAtk() + buffV('atk');
    return Math.round(base * (1 + metaBonus().atk));
  }
  function rangedAtk(weapon) {   // 射击伤害：射击的那把远程武器攻击 + 弹药加成
    const rw = weapon || rangedWeapon();
    const ax = (S.equipment.accessory && ITEMS[S.equipment.accessory] && ITEMS[S.equipment.accessory].atk) || 0;
    return Math.round((5 + (rw ? rw.atk || 0 : 0) + (hasRanged() || 0) + ax + cxAtk()) * (1 + metaBonus().atk));
  }
  function charStats() {
    const me = meleeWeapons();
    const wAtk = me.length ? Math.round(me.reduce((a,b)=>a+(b.atk||0),0) / me.length) : 0;
    const ax = (S.equipment.accessory && ITEMS[S.equipment.accessory] && ITEMS[S.equipment.accessory].atk) || 0;
    const a = 5 + cxAtk();                                                       // 人物攻击（技能树主干「攻」每次 +1）
    const b = wAtk + ((me.length && S.weaponNames) ? ((S.weaponNames[me[0].id] && S.weaponNames[me[0].id].bonus) || 0) : 0) + ax + (S.weaponSharpen && S.weaponSharpen.am ? S.weaponSharpen.am : 0);   // 武器/加成
    const c = playerAtkAvg();                                                   // 面板显示期望攻击（双持=两把均值）
    return { a, b, c, def: playerDef(), spd: Math.round(combatSpeed()), block: Math.round(shieldBlock() * 100), hp: S.stats.hp, maxhp: hpMax(), stam: S.stats.stamina, maxstam: maxStam(), armor: S.equipment.armor ? ITEMS[S.equipment.armor].name : '无', cloth: S.equipment.cloth ? ITEMS[S.equipment.cloth].name : '无', tank: !!S.furniture.tank };
  }
  // 精神影响体力上限（透支机制）：≥50 满额；20~49 −10%；<20 −20%（并且采集更慢，见 doPoint）
  function spiritStamMul() {
    const sp = (S && S.stats && S.stats.spirit !== undefined) ? S.stats.spirit : 100;
    return sp >= 50 ? 1 : (sp >= 20 ? 0.9 : 0.8);
  }
  function maxStam() { return Math.round((150 + (DIFFICULTIES[S.difficulty].stamina || 0) + metaBonus().stamina) * spiritStamMul()); }   // 基础 150（不含加成），再按精神打折
  // 防御 = 基础 2 + 护甲 + 饰品 + 盾 + 神物buff + 战斗技能（每级 +1：打多了皮糙肉厚）
  function playerDef() { const a = S.equipment.armor ? ITEMS[S.equipment.armor] : null; const ax = (S.equipment.accessory && ITEMS[S.equipment.accessory] && ITEMS[S.equipment.accessory].def) || 0; const w2 = S.equipment.weapon2 ? ITEMS[S.equipment.weapon2] : null; const sh = w2 && w2.cat === 'shield' ? w2 : null; return 2 + (a ? a.def : 0) + ax + (sh ? sh.def : 0) + buffV('def') + cxDef(); }
  function shieldBlock() { const w2 = S.equipment.weapon2 ? ITEMS[S.equipment.weapon2] : null; return w2 && w2.cat === 'shield' ? (w2.block || 0) : 0; }
  // ---------- 横扫（双手重武器专属）与多目标敌人行为 ----------
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
      e.cover = 0;                       // 掩护只维持一回合
      const r = Math.random();
      e.intent = (r < 0.20) ? 'charge' : (r < 0.40) ? 'cover' : (r < 0.70) ? 'heavy' : 'attack';
    }
  }
  const INTENT_CN = { charge:'蓄力', cover:'掩护', heavy:'猛击', attack:'攻击' };
  function intentOf(e) { return e && e.intent ? (INTENT_CN[e.intent] || e.intent) : ''; }

  // 出手速度（攻速）。历史 bug：旧版直接取"主手武器的 spd + 副手只垫一个下限 10"，  // 副手几乎不计入，于是「主手放快匕首 + 副手放高攻大剑」能同时吃到主手的快攻速和两把的平均伤害，
  // 互换主副手攻速差 150%（实测主手匕首 = 23、主手大剑 = 9）——玩家反馈"主手带匕首几乎无敌"。
  // 现在的主副手完全对称：只看装了哪两把，不看谁在主手；谁先出手另由 fightAction 的 enemyFirst 决定。
  // 双持加成：两把都是匕首（数据里标了 dual）→ ×2；其余双持 → ×1.5。
  // 旧版是按武器 id 正则判断的，所以"石质匕首"（knifeStone）从来吃不到 ×2 —— 改成数据标记后不再靠名字猜。
  const DUAL_MUL = 1.5, DUAL_MUL_DAGGER = 2.0;
  function combatSpeed() {
    const w = S.equipment.weapon ? ITEMS[S.equipment.weapon] : null;
    const w2 = S.equipment.weapon2 ? ITEMS[S.equipment.weapon2] : null;
    const sp = (it) => (it && it.spd !== undefined && it.spd !== null) ? it.spd : null;
    const a = sp(w), b = sp(w2);
    let s;
    if (a !== null && b !== null) {
      // 双持基础速度 = 两把攻速按"攻击力加权"平均：重武器分量大，会把速度拉下来，
      // 于是"拿把破匕首白嫖攻速"的搭配不再划算，而"快配快 / 重配重"依然合理。
      const wa = Math.max(1, w.atk || 1), wb = Math.max(1, w2.atk || 1);
      const bothDagger = !!(w.dual && w2.dual);
      s = ((a * wa + b * wb) / (wa + wb)) * (bothDagger ? DUAL_MUL_DAGGER : DUAL_MUL);
    } else if (a !== null) s = a;
    else if (b !== null) s = b;
    else s = 10;                       // 空手
    s = Math.round(s * 10) / 10;
    return s + buffV('spd') + swiftBonus();   // 技能树分支「疾风连击」：攻速 +1/+2/+3
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
    const needDur = cur < DURA.pistol;
    if (!needDur && pistolCalib()) { log('源能手枪已经校准过、耐久也是满的。', 'warn'); return { ok:false }; }
    if (!hasItem('sourceOre', 2)) { log('校准源能手枪需要 源矿×2。', 'warn'); return { ok:false }; }
    removeItem('sourceOre', 2);
    if (needDur) {
      if (pa && pa.length) pa[pei] = DURA.pistol; else { S.dur = S.dur || {}; S.dur.pistol = DURA.pistol; }
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
    removeItem('brokenPistol', 1); removeItem('energyCrystal', 1); removeItem('sourceBar', 1); addItem('pistol', 1);
    log('你把破损的源能手枪修好了！', 'good'); change(); return { ok:true };
  }
  // ⚠️ 没写在表里的武器走 ['stone',2] 兜底；神弓单独给一条（绝版物品，用秘银修）
  const REPAIR_MATS = { pistol:['sourceOre',1], bullet:null, knifeStone:['stone',2], club:['stone',2], spear:['stone',2], bow:['ironingot',1], divineBow:['mithrilingot',1], arrow:null, eagleArrow:null, ironDagger:['ironingot',1], ironSword:['ironingot',1], ironGreatSword:['ironingot',2], steelSword:['steelingot',1], blackSword:['blackingot',1] };
  function repairMatOf(id) { return REPAIR_MATS[id] || ['stone', 2]; }
  function repairWeapon() {
    const w = S.equipment.weapon; if (!w) { log('需要先装备一把武器。', 'warn'); return; }
    if (!S.furniture.grindstone) { log('需要先建造「磨刀石」家具。', 'warn'); return; }
    if (DURA[w] === undefined) { log('这件武器没有耐久。', 'warn'); return; }
    // 耐久是满的就别修 —— 以前会照收材料、白吃一份（石头×2 / 铁锭…）
    { const wa0 = durList(w); const ei0 = Math.min((S.equipIdx && S.equipIdx.weapon) || 0, Math.max(0, (wa0 || []).length - 1));
      const cur0 = (wa0 && wa0.length) ? (wa0[ei0] !== undefined ? wa0[ei0] : wa0[0]) : ((S.dur && S.dur[w] !== undefined) ? S.dur[w] : DURA[w]);
      if (cur0 >= DURA[w]) { log(`${ITEMS[w].name}的耐久已经是满的，不用修。`, 'sys'); return; } }
    const [mat, qty] = repairMatOf(w);
    if (!hasItem(mat, qty)) { log(`修补${ITEMS[w].name}需要 ${ITEMS[mat].name}×${qty}。`, 'warn'); return; }
    // 技能树「修补匠」：25% / 50% / 75% 概率不消耗修补材料（触发要写日志）
    if (chance(cxRepairFree())) log(`【修补匠】这次修补没消耗${ITEMS[mat].name}。`, 'good');
    else removeItem(mat, qty);
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
  function wNameOf(id) {
    if (!id || !ITEMS[id]) return '武器';   // 兜底：传进来的不是合法物品 id 时别让整场战斗崩掉
    return (S.weaponNames && S.weaponNames[id] && S.weaponNames[id].name) || ITEMS[id].name;
  }
  function warmth() { const c = S.equipment.cloth ? ITEMS[S.equipment.cloth] : null; return (c ? c.warm : 0) + BUILDING_CHAINS.house[S.buildings.house].warm + BUILDING_CHAINS.fire[S.buildings.fire].warm; }
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
    // 技能树：弓术 +5% 命中，枪械精通 +10% 命中（上限 95%）
    if (kind === 'gun') return Math.min(0.95, (pistolCalib() ? 0.7 : 0.6) + 0.10 * gunNodeLv());
    return Math.min(0.95, 0.9 + 0.05 * bowNodeLv());        // 弓（以及将来其它远程）
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
  function trunkCostOf(kind, lv) { return Math.round((SKILL_TRUNK_COST[lv] || 0) * costMul(kind)); }
  function nodeCostOf(kind, n, lv) { return Math.round((((n && n.cost) || [])[lv] || 0) * costMul(kind)); }
  function nodeSpentOf(kind, n, lv) { let s2 = 0; for (let i = 0; i < lv; i++) s2 += nodeCostOf(kind, n, i); return s2; }
  function gxYieldMul() { return 1 + TRUNK_STEP * trunkPicks('gather','yield') + (nodeLv('gather','g_fine') ? 0.20 : 0) - (nodeLv('gather','g_rough') ? 0.10 : 0); }
  function gxTimeMul() { return Math.max(0.40, 1 - TRUNK_STEP * trunkPicks('gather','speed')); }
  function gxEnergyMul() {
    const rough = nodeLv('gather','g_rough');
    return Math.max(0.25, 1 - TRUNK_STEP * trunkPicks('gather','stam') + (nodeLv('gather','g_fine') ? 0.15 : 0) - (rough === 1 ? 0.30 : rough >= 2 ? 0.40 : 0));
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
  function cxCrit() { return 0.10 + 0.05 * trunkPicks('combat','crit'); }
  // —— 战斗分支（B2 第一批）：阔刃横扫（时间制 CD）/ 处决、嗜血狂刀 / 复仇 ——
  // 攻速口径：每 100 时间单位出手「攻速」次 → 每出手一次推进 100/攻速 时间单位。
  // 横扫 CD 用同一套时间单位：基础 20「秒」，每级 -2（= 作者的"减到 1/10"一档）。
  const SWEEP_CD_BASE = 20;
  function sweepNodeLv() { return nodeLv('combat','f_sweep'); }
  function sweepCdTotal() { return Math.max(2, SWEEP_CD_BASE - 2 * sweepNodeLv()); }     // 20 / 18 / 16 / 14
  function sweepMul() { return Math.round((0.8 + 0.2 * sweepNodeLv()) * 10) / 10; }     // 0.8 / 1.0 / 1.2 / 1.4（取一位小数，别留浮点尾巴）
  function vampRate() { return [0, 0.30, 0.40, 0.50, 0.60][nodeLv('combat','f_vamp')] || 0; }
  function execThreshold() { return [0, 0.20, 0.25, 0.30][nodeLv('combat','f_exec')] || 0; }
  function revengeBonus() { return [0, 0.20, 0.30, 0.40][nodeLv('combat','f_revenge')] || 0; }
  // 「嗜血狂刀」只认**双持两把匕首**（作者 2026-09-19：以前任何双持单手都吃吸血，等于白送）
  // dual:1 = 匕首类（石质匕首 / 铁匕首）
  function hasDualDagger() { const w = meleeWeapons(); return w.length >= 2 && w.every(x => !!x.dual); }
  // B2b：盾墙 / 疾风连击 / 狂战 / 铁壁 / 弓术 / 枪械精通
  function wallBlockBonus() { return 0.15 * nodeLv('combat','f_shield'); }        // 盾墙：格挡率 +15/20/25%
  function wallDurMul() { return [1, 0.80, 0.65, 0.50][nodeLv('combat','f_shield')] || 1; }   // 盾耐久消耗
  function swiftBonus() { return nodeLv('combat','f_swift'); }                   // 疾风连击：攻速 +1/+2/+3
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
    S.skill[kind] = lv + 1;
    S.skillPicks[kind].push(optId);
    log(`【技能】${t.name}主干升到 ${lv + 1} 级：${opt.name}——${opt.desc}。`, 'good');
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
    // 群袭（pack）：出现时 50% 概率同时来两只；标了 packAlways 的（触手哨兵）必来两只
    const packN = (enemy.traits || []).includes('pack') ? (enemy.packAlways ? 2 : (chance(0.5) ? 2 : 1)) : 1;
    const mkEnemy = () => ({ name:enemy.name, id:enemy.id, ehp, emax:ehp, atk, def:enemy.def, baseDef:enemy.def, spd:enemy.spd, traits:enemy.traits, isBoss: enemy.boss ? 1 : 0, desc:enemy.desc, cover:0, charged:0, heavy:0, intent:null });
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
    // 弓先手：装备了弓且带箭 → 开局先射（按速度±，默认2次），敌人还未靠近
    const rn = hasRanged();
    if (rn !== null) {
      const rw0 = rangedWeapon();
      const isGun = !!(rw0 && rw0.ammoItem);
      const shots = isGun ? 1 : ((playerAtk() >= 8 || S.skill.combat >= 2) ? 3 : 2);   // 手枪只抢射 1 发，弓保持 2~3 发
      C.bowShots = 0;
      C.log.push(isGun ? '你抬枪就射，敌人还没靠近。' : '你搭弓就射，敌人还没靠近。');
      // ⚠️ 先手这几发必须【当场打完】，不能留到 fightAction 里"边射边 return"：
      //    老写法是每次点操作先射一箭然后直接 return，把玩家那一次操作整个吃掉 ——
      //    装备弓/神弓时"逃跑、防御、道具"点了全都没反应（玩家反馈"装备弓不给我逃跑""只能射箭"）。
      for (let k = 0; k < shots; k++) {
        const rw2 = rangedWeapon();
        const ammoOk = rw2 ? (rw2.ammoItem ? invCount(rw2.ammoItem) > 0 : (invCount('eagleArrow') > 0 || invCount('arrow') > 0)) : false;
        const tg0 = C.enemies.find(e => e.ehp > 0);
        if (!rw2 || !ammoOk || !tg0) break;
        let dmg = Math.max(1, rangedAtk(rw2) - C.def);
        const dCrit = divineCritRoll(C, rw2, dmg);          // 神弓特权：先手这几箭也算
        if (dCrit !== null) { dmg = dCrit; C.log.push('神弓的弦音一响，这一箭必中要害！'); }
        tg0.ehp -= dmg; ammoConsume(rw2);
        C.log.push((rw2.ammoItem ? `你抢先开枪，造成 ${dmg} 点伤害。` : `你抢先射出一箭，造成 ${dmg} 点伤害。`));
        if (tg0.ehp <= 0) { tg0.ehp = 0; C.log.push(`${tg0.name}被击倒了！`); }
      }
      C.log.push(`${enemy.name}咆哮着逼近了！${meleeWeapons().length ? '你握紧手中武器迎击。' : ((rw0 && rw0.ammoItem) ? '你再次给手枪上膛。' : '你再次搭上箭矢。')}`);
    }
    if (enemy.nightBuff && isNight()) {
      C.atk = Math.round(C.atk * 1.3);
      for (const e of C.enemies) e.atk = Math.round(e.atk * 1.3);
      C.log.push('黑暗让它更加强大。');
    }
    C.spdP = combatSpeed(); C.spdE = enemy.spd; C.spdBank = 0;
    S.combat = C;
    if (onFight) onFight('start', C);
    if (!C.enemies.some(e => e.ehp > 0)) { endFight(true); return; }   // 先手几箭就打死了：直接结算
    change();
  }

  // 神弓（限定）：每场战斗的第一次**命中**必定会心一击。
  // ⚠️ 必须两处都调：① 远程先手的那几箭（C.bowShots 分支）② fightAction 里的普通射击。
  //    只加在②的话，玩家开局那几箭走了先手分支，特权就永远不会触发。
  //    没打中不算（先手分支本来就没有命中判定，视为命中）。
  function divineCritRoll(C, weapon, dealt) {
    if (!weapon || !weapon.divineCrit || C.divineCritUsed) return null;
    C.divineCritUsed = 1;
    return Math.round(dealt * 1.5);
  }
  function fightAction(act, ti) {
    const C = S.combat;
    if (!C) return;
    const aliveNow = () => C.enemies.filter(e => e.ehp > 0);
    const aliveList = aliveNow();
    if (!aliveList.length) { endFight(true); return; }
    const target = (C.enemies[ti] && C.enemies[ti].ehp > 0) ? C.enemies[ti] : aliveList[0];
    const en = C.enemy;
    const myAtk = playerAtk(), myDef = playerDef(), mySpd = combatSpeed();   // 出手速度 = 武器/技能/增益（不再是写死的 10）
    const enSpd = (en && en.spd) || (C.enemies[0] && C.enemies[0].spd) || 10;   // 兜底：多敌/特殊战斗里 C.enemy 可能不全
    let first = en.traits.includes('first') || enSpd > mySpd;
    const defEff = (DIFFICULTIES[S.difficulty] && DIFFICULTIES[S.difficulty].defEff !== undefined) ? DIFFICULTIES[S.difficulty].defEff : 1;   // 防御效率：简单100%→传奇70%
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
      const isAttack = (act === 'attack' || act === 'heavy' || act === 'ranged');
      // 横扫（双手重武器专属）：对全部敌人各造成 1 倍伤害，命中略降；按"出手次数"走冷却
      if (act === 'sweep') {
        if (C.sweepCd > 0) { roundLines.push(`横扫还没缓过劲（还需 ${Math.ceil(C.sweepCd)} 秒）。`); return; }
        C.sweepCd = sweepCdTotal();
        const acc = Math.max(0.35, accBase - 0.15);
        let n = 0;
        for (const e of aliveNow()) {
          if (!chance(acc)) { roundLines.push(`${e.name}及时伏低，横扫从它头顶掠过。`); continue; }
          let dealt = Math.max(1, Math.round(myAtk * sweepMul() * rageAtkMul() * ironAtkMul()) - e.def);   // 「阔刃横扫」0.8→1.4 倍；狂战/铁壁也吃
          if (e.traits.includes('stoneGuard')) { dealt = Math.max(1, Math.round(dealt * 0.75)); const rc = Math.max(1, Math.round(dealt * 0.25)); S.stats.hp -= rc; roundLines.push(`石甲的符文把力道反噬回来（-${rc}）。`); if (S.stats.hp <= 0) S.stats.hp = 0; }
          e.ehp -= dealt; n++;
          roundLines.push(`${e.name}挨了一记横扫，受到 ${dealt} 点伤害。`);
          if (vampRate() > 0 && hasDualDagger()) { const heal = Math.max(1, Math.round(dealt * vampRate())); S.stats.hp = Math.min(hpMax(), S.stats.hp + heal); roundLines.push(`【嗜血狂刀】双刀饮血，回复 ${heal} 点生命。`); }
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
        if (chance(accBase - 0.1)) { S.missStreak = 0; let dmg = Math.max(1, Math.round(myAtk * 1.6) - tg.def); tg.ehp -= dmg; roundLines.push(`你奋力掷出长矛，命中${tg.name}，造成 ${dmg} 点伤害！`); }
        else { noteMissStreak(); roundLines.push('长矛擦着它飞过，落空了。'); }
      } else if (act === 'attack' || act === 'heavy' || act === 'ranged') {
        const noMelee = !meleeWeapons().length && hasRanged() !== null;
        // 技能树：狂战（攻击 +15/22/30%）/ 铁壁（攻击 -5%）在这里生效
        let dmg = Math.round(((act === 'ranged' || noMelee) ? rangedAtk() : myAtk) * rageAtkMul() * ironAtkMul());
        let acc = accBase;
        if (act === 'heavy') { dmg = Math.round(myAtk * 1.5); acc -= 0.2; }
        const anyRanged = (act === 'ranged' || noMelee);
        if (tg.traits.includes('evade')) acc -= 0.3;
        // 手枪命中固定（不吃猎人/恐惧加成，也不吃回避减免照常扣）：按"真开火的那把"取
        if (anyRanged) acc = rangedAcc(rangedKind(rangedWeapon()));
        if (tg.traits.includes('ironImmune') && myAtk < 22) dmg = Math.max(1, Math.floor(dmg * 0.7));
        if (chance(acc)) {
          S.missStreak = 0;
          let dealt = Math.max(1, dmg - tg.def);
          // 神弓（限定）：每场战斗的第一次**命中**必定会心一击。没打中不算，留到下一次命中。
          const divineDealt = divineCritRoll(C, anyRanged ? rangedWeapon() : null, dealt);
          if (divineDealt !== null) { dealt = divineDealt; roundLines.push('神弓的弦音一响，这一箭必中要害！'); }
          else if (chance(cxCrit())) { dealt = Math.round(dealt * 1.5); roundLines.push(`会心一击！`); }
          // 技能树「处决」：残血目标吃 +50%（触发写日志）
          if (execThreshold() > 0 && tg.emax > 0 && tg.ehp / tg.emax < execThreshold()) {
            dealt = Math.round(dealt * 1.5);
            roundLines.push(`【处决】${tg.name}已经撑不住了，这一击格外致命。`);
          }
          // 技能树「复仇」：每挨一次打，攒一层反击（下一击 +20/30/40%，用完清零）
          if (C.revenge > 0 && revengeBonus() > 0) {
            dealt = Math.round(dealt * (1 + revengeBonus()));
            roundLines.push(`【复仇】你把刚才那一下原样还了回去（+${Math.round(revengeBonus() * 100)}% 伤害）。`);
            C.revenge = 0;
          }
          if (tg.traits.includes('stoneGuard')) { dealt = Math.max(1, Math.round(dealt * 0.75)); const rc = Math.max(1, Math.round(dealt * 0.25)); S.stats.hp -= rc; roundLines.push(`石甲的符文把力道反噬回来（-${rc}）。`); if (S.stats.hp <= 0) S.stats.hp = 0; }
          // 敌人掩护：在场有敌人处于"掩护"状态时，受到的伤害 -30%（不叠加）
          const cr = coverReduceOf(C, tg);
          if (cr > 0) { dealt = Math.max(1, Math.round(dealt * (1 - cr))); roundLines.push(`同伴的掩护卸掉了部分力道（-${Math.round(cr*100)}%）。`); }
          tg.ehp -= dealt;
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
          roundLines.push(`你${anyRanged ? '拉弓射箭' : act==='heavy'?'奋力重击':'攻击'}${tg.name}${wTag}，造成 ${dealt} 点伤害。`);
          if (!anyRanged && act !== 'throw') drainWeapon();
          // 技能树「嗜血狂刀」：双持两把**匕首**时，造成伤害的 30~60% 回血（触发写日志）
          if (vampRate() > 0 && !anyRanged && hasDualDagger()) {
            const heal = Math.max(1, Math.round(dealt * vampRate()));
            S.stats.hp = Math.min(hpMax(), S.stats.hp + heal);
            roundLines.push(`【嗜血狂刀】双刀饮血，回复 ${heal} 点生命。`);
          }
          if (hasRelic('vampire')) { const heal = Math.max(1, Math.round(dealt * 0.1)); S.stats.hp = Math.min(hpMax(), S.stats.hp + heal); roundLines.push(`吸血宝石吸回 ${heal} 点生命。`); }
          if (S.weaponSharpen && S.weaponSharpen.bleed && chance(S.weaponSharpen.bleed)) { tg.bleed = (tg.bleed || 0) + 3; roundLines.push('你的利刃划开了它的伤口，血流不止！'); }
          if (C.coat > 0) { C.coat--; tg.poison = Math.max(tg.poison || 0, 3); roundLines.push(`${tg.name}的伤口泛起青黑——蝎毒发作了！`); }
          if (anyRanged) ammoConsume(rangedWeapon());
          if (tg.ehp <= 0) { tg.ehp = 0; roundLines.push(`${tg.name}被击倒了！`); }
        } else { noteMissStreak(); roundLines.push(anyRanged ? '箭矢擦着它飞过。' : '你的攻击落空了。'); }
        if (en.traits.includes('flee') && C.round >= 2 && tg.ehp > 0 && tg.ehp / tg.emax <= 0.4 && chance(0.5)) { roundLines.push(`${en.name}受了惊，转身逃走了！`); C.fled = true; C.enemyFled = true; }
      } else if (act === 'defend') { C.defending = true; S.stats.stamina = Math.min(maxStam(), S.stats.stamina + 10); roundLines.push('你摆出防御姿态。'); }
      else if (act === 'item') { C.usedItems++; roundLines.push('你使用了物品。'); }
      else if (act === 'flee') { const p = C.smoke ? 1 : Math.min(0.9, 0.5 + (mySpd - enSpd) * 0.05); if (chance(p)) { roundLines.push(C.smoke ? '浓烟掩护下，你全身而退！' : '你成功逃走了！'); C.fled = true; fled = true; C.smoke = false; } else roundLines.push('逃跑失败，敌人扑了上来！'); }
        if (isAttack && !aliveNow().length) return;   // 已经打死了，就不再补刀
      }
    };

    const doEnemyTurn = () => {
      if (C.fled) return;
      for (const e of aliveNow()) {
        // 蓄力：本回合不出手，下一击伤害翻倍
        if (e.intent === 'charge') { e.charged = 1; roundLines.push(`${e.name}压低身子开始蓄力……（下一击将造成双倍伤害）`); continue; }
        // 掩护：本回合不出手，为全体友方（含自己）提供 30% 减伤，不叠加
        if (e.intent === 'cover') { e.cover = 1; roundLines.push(`${e.name}横身挡在同伴身前——全体敌人受到的伤害降低 30%。`); continue; }
        let eDmg = e.atk;
        if (e.traits.includes('charge') && C.round === 1) { eDmg = Math.round(eDmg * 2); roundLines.push(`${e.name}借着冲势撞向你！`); }
        if (e.traits.includes('enrage') && e.ehp / e.emax < 0.3) { eDmg = Math.round(eDmg * 1.5); roundLines.push(`${e.name}发狂了！`); }
        if (e.traits.includes('gun') && C.round === 1) { eDmg += 10; roundLines.push('枪声响起，火弹呼啸而来！'); }
        if (e.intent === 'heavy') { eDmg = Math.round(eDmg * ENEMY_HEAVY_MUL); e.def = 0; roundLines.push(`${e.name}抡起全力猛击——这一下很重，但它露出了破绽（防御归零）。`); }
        if (e.charged) { eDmg *= 2; e.charged = 0; roundLines.push(`${e.name}蓄力完成，狠狠砸了下来！`); }
        if (e.traits.includes('water') && C.defending) { roundLines.push('在水中你无法有效防御。'); C.defending = false; }
        if (hasRelic('dodge') && chance(0.10)) { roundLines.push('闪避护符一闪，你躲开了这次攻击！'); continue; }
        // 盾墙（技能树）：格挡率 +15/20/25%（上限 95%）—— 挡住就是完全免伤，所以加成做在"挡得更勤"上
        const blk = Math.min(0.95, shieldBlock() + wallBlockBonus());
        if (blk > 0 && chance(blk)) { roundLines.push(blk > shieldBlock() && wallBlockBonus() > 0 ? `【盾墙】盾牌横在身前，${e.name}的攻击被稳稳卸掉！` : '盾牌结结实实地挡住了！'); continue; }
        // 防御效率按难度打折（简单 100% → 传奇 70%）；沉没之王的"穿透"再砍一半
        let defPart = myDef * defEff * (C.defending ? 1.6 : 1);
        if (e.traits.includes('pierce')) { defPart *= 0.5; roundLines.push(`${e.name}的巨力穿透了你的防御！`); }
        let taken = Math.max(1, eDmg - Math.round(defPart));
        taken = Math.max(1, Math.round(taken * (1 - metaBonus().armor) * rageTakenMul() * ironTakenMul()));
        S.stats.hp -= taken;
        roundLines.push(`${e.name}的攻击造成 ${taken} 点伤害。`);
        if (revengeBonus() > 0) { C.revenge = Math.min(3, (C.revenge || 0) + 1); roundLines.push('【复仇】你记住了这一下，下一击会更狠。'); }
        if (S.equipment.armor && DURA[S.equipment.armor] !== undefined) drainById(S.equipment.armor);
        // 盾墙：盾牌耐久消耗 -20/35/50%（用概率跳过磨损来体现）
        if (S.equipment.weapon2 && ITEMS[S.equipment.weapon2] && ITEMS[S.equipment.weapon2].cat === 'shield' && DURA[S.equipment.weapon2] !== undefined) {
          if (!chance(1 - wallDurMul())) drainById(S.equipment.weapon2);
        }
        if (e.traits.includes('poison') && chance(0.35)) { S.statuses.poison = Math.max(S.statuses.poison, 3); roundLines.push('你中毒了！'); }
        if (['wolf','cavebear','leopard','shark'].includes(e.id) && chance(0.25)) { S.statuses.bleed = Math.max(S.statuses.bleed, 2); roundLines.push('伤口开始流血！'); }
      }
      // 猛击"防御归零"只持续到它的下一回合开始 —— 这里按每只自己的基准防御复原（别用小怪的防御去套首领的）
      for (const e of aliveNow()) { const base = (e.baseDef !== undefined) ? e.baseDef : ((ENEMIES[e.id] && ENEMIES[e.id].def) || e.def); if (e.def !== base) e.def = base; }
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
      C.defending = false;
    };

    // 先手箭已经在 startFight 里一次性打完了（见那里的说明）：这里只做兜底清零，
    // 绝不能再 return —— 否则玩家点的这一次操作会被吃掉。
    C.bowShots = 0;
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
    const enemyFirst = (en.traits || []).includes('first') || _spdE > _spdP;   // 谁快谁先手（同速你先手；「先手」特性一定先）
    const twin = (nE >= 2);                    // 敌人这轮出手 ≥2 次 → 最后一次与你同时结算
    const before = enemyFirst ? (twin ? nE - 1 : nE) : 0;
    for (let i = 0; i < before; i++) { if (C.fled) break; if (!aliveNow().length) break; doEnemyTurn(); }
    if (twin) { doEnemyTurn(); doPlayerTurn(); }          // 同时结算：两边伤害都算完再判生死
    else if (enemyFirst) { if (!C.fled && aliveNow().length) doPlayerTurn(); }
    else {
      doPlayerTurn();
      for (let i = 0; i < nE; i++) { if (C.fled) break; if (!aliveNow().length) break; doEnemyTurn(); }
    }

    C.enemies = C.enemies.filter(e => e.ehp > 0);
    C.ehp = C.enemies.length ? C.enemies[0].ehp : 0;
    // 横扫冷却改成【时间制】（作者 2026-09-18）：每次出手推进 100/攻速 个时间单位。
    // 例：攻速 10 → 一次出手 10 秒 → CD 20 秒 = 两次出手后又能扫。
    if (act !== 'sweep' && C.sweepCd > 0) {
      C.sweepCd = Math.max(0, C.sweepCd - 100 / Math.max(1, combatSpeed()));
    }
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
        if (chance(Math.min(1, d.ch * (1 + metaBonus().luck)))) { const q = qtyParse(d.qty); if (gainItem(d.id, q)) got.push(`${ITEMS[d.id].name}×${q}`); }
      }
      log(`你击败了${en.name}！`, 'good');
      if (got.length) log(`战利品：${got.join('、')}。`, 'good');
      else log(`（${en.name}身上没留下什么可用的东西。）`, 'sys');
      // 战斗经验按怪强度分档：小怪+1 普通+2 精英+3 Boss+10
      const xg = en.boss ? 15 : (en.hp >= 100 ? 3 : en.hp >= 30 ? 2 : 1);
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
    const wolfCount = raidWolves();   // 夜袭强度随时间变强：第 50 天到顶（5 匹），难度差别体现在狼本身的属性上
    const enemies = []; for (let i = 0; i < wolfCount; i++) enemies.push(mk());
    const CN = ['', '一', '两', '三', '四', '五'];
    const C = {
      enemy: base, ehp: enemies[0].ehp, atk: enemies[0].atk, def: base.def, spd: base.spd,
      enemies, round:1, defending:false, usedItems:0, summonTick:0,
      accE: 0,
      log:['狼群趁夜来袭！', `${CN[wolfCount] || wolfCount}匹${base.name}的绿眼睛在夜色里盯着你。`], ranged:null, raid:true,
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
    S.flags.firstRaidDone = 1;      // 打过第一次夜袭之后，才允许"随机夜袭"
    const n = raidWolves();
    if (S.flags.xiaoman) log('小满轻轻叫醒你："营外有动静……"', 'warn');
    const power = n * rnd(8, 15);   // 来袭强度跟着狼数走：1 匹约 8~15，5 匹约 40~75
    let defense = w.def + playerAtk() * 2 + playerDef();
    if (invCount('gunpowder') > 0) {
      defense += invCount('gunpowder') * 10;
      removeItem('gunpowder', 1);
      log('你点燃一桶火药，爆炸声惊得野兽四散！（防御大幅提升）', 'good');
    }
    showOverlay({
      title:'夜 袭',
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
    const bf = bed ? FURNITURE.find(x => x.id === bed) : { spirit:5 };
    // 床真的有用：① 好床睡得短（5~8 小时，少扣饱食/水分）② 好床体力恢复比例高
    // 没床：9 小时翻来覆去，恢复也最差（玩家反馈"草床空占位置"——以前这两个字段根本没被用上）
    const bedRest = bed ? (bf.rest || 0.7) : 0.4;
    const sleepH = nap ? 2 : (bed ? (bf.sleepH || 8) : 8);   // 安稳睡觉统一 8 小时（没床也一样），小睡 2 小时
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
    // 床的比重从 0.25 提到 0.32：玩家反馈"草床空占一个家具位"——现在有床比没床
    // 明显睡得更饱（无床 62% → 草床 75%），好床睡得更短、少扣饱食水分，才值得占那个槽。
    const staGain = nap ? Math.round(25 * sq) : Math.round(maxStam() * (0.45 + houseRest * 0.12 + bedRest * 0.32) * sq);
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
    S.stats.spirit = Math.min(100, S.stats.spirit + (nap ? 1 : (bf.spirit || 5)));   // 精神恢复整体下调：主要靠整觉，且很有限
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
    // 随机夜袭判定：只在"首次（剧情）夜袭"之后才可能发生；老存档用天数兜底，避免永远不再触发
    if (afterMid > 0 && (S.flags.firstRaidDone || S.day > raidDay()) && chance(BUILDING_CHAINS.wall[S.buildings.wall].raid)) nightRaid(false);
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
    S.exp.craft += EXP_CRAFT * 2;
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
    // 身份专属家具（例：养蜂人的蜂箱）——别的身份造不了
    if (f.onlyIdentity && S.identity !== f.onlyIdentity) {
      const who = (IDENTITIES[f.onlyIdentity] && IDENTITIES[f.onlyIdentity].name) || f.onlyIdentity;
      log(`「${f.name}」是${who}的专属家具，你用不了。`, 'warn'); return;
    }
    if (f.needBp && !hasItem(f.needBp)) { log(`需要图纸：${ITEMS[f.needBp].name}。`, 'warn'); return; }
    if (f.needCraft && expLevel('craft') < f.needCraft) { log(`制造等级需达到 ${f.needCraft}（当前 ${expLevel('craft')}）。`, 'warn'); return; }
    const isUpgrade = (['wb2','wb3','fr2','fr3','sm2','bed2','bed3','bed4','rainfilter'].includes(fid));
    // 家具位判定统一走 furnSlotFull，避免这里再抄一份规则导致两边不一致
    if (furnSlotFull(fid)) { const slots = (BUILDING_CHAINS.house[S.buildings.house].slots || 1) + (S.houseExt || 0); log(`家具位已满（${furnitureUsed()}/${slots}），先升级住所。`, 'warn'); return; }
    if (!matsOk(f.mats)) { log(`材料不足：${missingMats(f.mats).join('、')}。`, 'warn'); return; }
    takeMats(f.mats);
    log(`开始打造${f.name}（需 ${f.time} 分钟）……`, 'sys');
    addMin(Math.round(f.time * (1 - metaBonus().craft)));
    // ⚠️ 滤雨器例外：它是"在水壶上加装滤网"，水壶本身要留着（-20% 口渴效果靠它，删了效果就没了）。
    if (isUpgrade) { const prev = f.needPrev; if (prev && fid !== 'rainfilter') delete S.furniture[prev]; }
    S.furniture[fid] = true;
    log(`完工了：${f.name}！`, 'good');
    diaryAdd(`我做好了${f.name}。`);
    S.exp.craft += EXP_CRAFT * 2;
    change();
  }

  // ---------- 扩建住处（住所每升一级获得 1 次扩建，家具位 +1） ----------
  function houseExtMax() { return (S.buildings.house || 0) + 1; }   // 帐篷即可扩建1次，之后每升一级 +1
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
  // 配方实际材料表：技能树「流水线（-50% 材料）/ 精工细作（+30% 材料）」在这里生效。
  // 全项目凡是要"扣 / 查 / 数"材料的地方都走这个函数，别再去读 r.in。
  // 「精工细作」的 +30% 材料只对**有耐久的成品**生效（作者 2026-09-19）：
  //    以前连烤肉、药剂、木板这种压根没有耐久的东西也一起涨价，技能点了纯亏，玩家反馈"不合理"。
  //    「流水线」的 -50% 材料照旧对所有配方生效 —— 那是折扣，不是代价，没有"白涨价"的问题。
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
  function craftIn(r) {
    const mul = cxMatMulFor(r);
    if (!r || !r.in || mul === 1) return (r && r.in) || {};
    const o = {};
    for (const k in r.in) o[k] = Math.max(1, Math.round(r.in[k] * mul));
    return o;
  }
  function canCraft(r) {
    const cin0 = craftIn(r);
    if (r.needBp && !hasItem(r.needBp)) return { ok:false, reason:`需要图纸：${ITEMS[r.needBp].name}` };
    if (r.needItem && !hasItem(r.needItem)) return { ok:false, reason:`需要${ITEMS[r.needItem].name}` };
    // 限定物（神弓）：全账号唯一 —— 当前局手里有、或邮箱里存着，都不允许再做
    if (r.uniqueItem && hasDivineBowAnywhere()) return { ok:false, reason:`「${r.name}」全服仅此一把：你身上或邮箱里已经有一把了。` };
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
    // 晾肉架：一副架子一次只晾一批。晾晒期间不能晾别的（作者明确要求），要先去把上一批取下来
    if (r.hang) {
      const d = dryOf(r.station);
      if (d) return { ok:false, reason: nowTick() >= d.readyAt
        ? '架子上那批已经晾透了，先去把它取下来。'
        : `架子上正晾着东西，还要 ${fmtLeft(d.readyAt - nowTick())}——晾晒期间晾不了别的。` };
    }
    for (const k in cin0) if (!hasItem(k, cin0[k])) return { ok:false, reason:`材料不足：${ITEMS[k].name} ${invCount(k)}/${cin0[k]}` };
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
    let slots = capUsed();
    const cap = capacity();
    const preview = {};
    for (const id in S.inv) preview[id] = S.inv[id];
    if (removeMap) for (const id in removeMap) {
      const it = ITEMS[id]; if (!it || it.cat === 'currency') continue;
      const per = it.stack === 1 ? 1 : 20;
      const before = preview[id] || 0;
      const after = Math.max(0, before - (removeMap[id] || 0));
      preview[id] = after;
      slots += Math.ceil(after / per) - Math.ceil(before / per);
    }
    for (const id in outMap) {
      const it = ITEMS[id];
      if (!it || it.cat === 'currency' || it.alwaysFit) continue;
      const per = it.stack === 1 ? 1 : 20;
      const before = preview[id] || 0;
      const after = before + (outMap[id] || 0);
      preview[id] = after;
      slots += Math.ceil(after / per) - Math.ceil(before / per);
    }
    return slots <= cap;
  }
  function craft(r) {
    const chk = canCraft(r);
    if (!chk.ok) { log(chk.reason, 'warn'); return; }
    if (r.hang) {
      // 晾晒：材料先收走、挂上去只花 r.time 分钟，成品等 hang 分钟后来取
      const cinH = craftIn(r);
      for (const k in cinH) removeItem(k, cinH[k]);
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
    if (!fitsInBag(r.out, r.in)) { log('背包塞不下了——先腾出空位再做，免得材料白费。', 'warn'); notifyBagFull(); return; }
    const cin = craftIn(r);                       // 材料：技能树「流水线 / 精工细作」会改这个
    for (const k in cin) removeItem(k, cin[k]);
    if (r.out && r.out.lotusPill) S.lotusMade = (S.lotusMade || 0) + 1;
    const out = ITEMS[r.out ? Object.keys(r.out)[0] : ''];
    log(`你开始制作：${r.name}（${r.time} 分钟）……`, 'sys');
    let t = Math.round(r.time * (1 - metaBonus().craft));
    if (S.identity === 'smith') t = Math.round(t * 0.8);
    t = Math.max(3, Math.round(t * cxTimeMul()));   // 制造主干「熟手」每次 -10%
    // 主干「精算」：10% 概率退还 1 份材料（日志写明是技能给的）
    if (chance(cxRefundChance())) {
      const keys = Object.keys(cin);
      const rk = keys[Math.floor(Math.random() * keys.length)];
      if (rk && addItem(rk, 1, true)) log(`【精算】这次下手省了点料，退回 ${ITEMS[rk].name}×1。`, 'good');
    }
    addMin(t);
    let bonus = false;
    // 兜底：万一还是塞不进去（例如 lv3+ 的"额外+1"把槽位多占一格），就把材料退回去、别让东西凭空消失
    let lost = false;
    for (const k in r.out) { const n = r.out[k]; if (!addItem(k, n)) lost = true; }
    if (lost) {
      for (const k in r.in) addItem(k, r.in[k], true);
      log('背包塞不下，这次没做成——材料已退回。', 'warn'); notifyBagFull();
      change();
      return;
    }
    // 主干「巧手」：10% 概率多产 1 件（塞不下就只当没触发）
    if (chance(cxExtraChance())) { bonus = true; Object.keys(r.out).forEach(k => addItem(k, 1)); log('【巧手】手底下多出来一件。', 'good'); }
    // 「精工细作 / 流水线」：成品耐久 ±（只对带耐久的武器/工具生效）
    {
      const oid = Object.keys(r.out)[0];
      if (oid && DURA[oid] !== undefined && cxDurMul() !== 1) {
        const nd = Math.max(1, Math.round(DURA[oid] * cxDurMul()));
        const arr = S.toolDurs && S.toolDurs[oid];
        if (arr && arr.length) arr[arr.length - 1] = nd; else { S.dur = S.dur || {}; S.dur[oid] = nd; }
        durSync(oid);
        log(`【${nodeLv('craft','c_line') ? '流水线' : '精工细作'}】这次成品的初始耐久是 ${nd}。`, 'sys');
      }
    }
    S.exp.craft = Math.round((S.exp.craft + EXP_CRAFT * (S.furniture.shelf ? 1.1 : 1)) * 10) / 10;   // 书架：制造经验 +10%（取一位小数避免浮点尾巴）
    S.craftCount = (S.craftCount || 0) + 1;
    log(`完成：${Object.keys(r.out).map(k=>`${ITEMS[k].name}×${r.out[k]}`).join('、')}${bonus ? '（额外多做了 1 件！）' : ''}。`, 'good');
    if (S.tut === 1 && Object.keys(S.inv).some(id => ITEMS[id] && ITEMS[id].tool)) S.tut = 2;   // 已做出首件工具→去装备
    change();
  }
  function craftMax(r) {
    let m = 999;
    const cin = craftIn(r);
    for (const k in cin) m = Math.min(m, Math.floor(invCount(k) / cin[k]));
    if (r.out && r.out.lotusPill) m = Math.min(m, lotusLeft());
    return Math.max(0, m);
  }
  function craftBatch(r, n) {
    if (!r) return { ok:false, reason:'没有这个配方' };
    // 作者 2026-09-19：有玩家"连着做太久，饿死在工坊里"，所以批量超过 5 小时要先弹窗提醒
    //   （时间在走 = 饱食/水分在掉，别让人埋头做一天）
    {
      const perOne = Math.max(3, Math.round(r.time * (1 - metaBonus().craft) * cxTimeMul() * (S.identity === 'smith' ? 0.8 : 1)));
      const totalMin = perOne * Math.max(1, n);
      if (!r.hang && totalMin > 300 && !craftBatchConfirmed) {
        const hrs = (totalMin / 60).toFixed(1);
        showOverlay({
          title: '⚠ 这批要花很久',
          text: `连续制作 ${n} 件「${r.name}」大约要花 <b>${hrs} 小时</b>——这段时间饱食和水分会一直掉，饿着肚子硬做会出事（已经有人这么做把自己做没了）。\n\n要不要先吃点东西、或者少做一些？`,
          choices: [
            { label:`仍然开工（${hrs} 小时）`, hint:'我知道风险', ok: () => { craftBatchConfirmed = true; try { craftBatch(r, n); } finally { craftBatchConfirmed = false; } } },
            { label:'再想想', hint:'先去吃东西 / 少做一点', ok: () => { log('你把材料先放下，打算准备准备再做。', 'sys'); } },
          ],
        });
        return { ok:false, reason:'' };   // 交给弹窗处理（空 reason = 界面不要当报错写日志）
      }
    }
    // ⚠️ 晾晒类配方（晾肉架）**不能走下面的批量流程**：一副架子一次只挂一批，
    //    而且下面那段是"扣材料 → 立刻 addItem 产出成品" —— 以前长按晾肉干就能
    //    **当场拿到肉干**，20 小时的晾晒被整个绕过去（玩家反馈"晾肉架不能一次晾很多块吧"）。
    //    这里直接转成单批：走 craft() 的晾晒分支（扣材料 → 挂上去 → 等 hang 分钟来取）。
    if (r.hang) {
      const d0 = dryOf(r.station);
      if (d0) return { ok:false, reason:'晾肉架上还晾着东西，先把它取下来。' };
      craft(r);
      return { ok:true, n:1, hanging:true, hung: !!dryOf(r.station) };
    }
    if (n < 1) return { ok:false, reason:'至少要制作 1 个' };
    if (r.out && r.out.lotusPill && n > lotusLeft()) return { ok:false, reason:`不死丹一局最多炼制 ${LOTUS_LIMIT} 颗（还能炼 ${lotusLeft()} 颗）` };
    const cinB = craftIn(r);
    for (const k in cinB) if (!hasItem(k, cinB[k] * n)) return { ok:false, reason:'材料不足' };
    // 批量制作最容易撑爆背包：先按"能装下几个"自动降到 n，一个都装不下就干脆别开工
    {
      let fit = 0;
      for (let i = 1; i <= n; i++) {
        const outMap = {}, inMap = {};
        for (const k in r.out) outMap[k] = r.out[k] * i;
        for (const k in cinB) inMap[k] = cinB[k] * i;      // 材料会腾出格子，算进去
        if (!fitsInBag(outMap, inMap)) break;
        fit = i;
      }
      if (fit === 0) { log('背包塞不下，先腾出空位再做。', 'warn'); notifyBagFull(); return { ok:false, reason:'背包塞不下' }; }
      if (fit < n) log(`背包只放得下 ${fit} 个，这次就先做 ${fit} 个。`, 'warn');
      n = fit;
    }
    for (const k in cinB) removeItem(k, cinB[k] * n);
    if (r.out && r.out.lotusPill) S.lotusMade = (S.lotusMade || 0) + n;
    // ⚠️ 批量制作以前是"另一条腿"：① 还在用旧版"每级 -8% 耗时"（技能改版后那套已经没了）
    //    ② **完全没应用「精工细作 +30% 耐久 / 流水线 -20% 耐久」**，也没算巧手/精算 ——
    //    玩家反馈"做装备点上（长按批量），做完取消，木板精不精加工都没耐久"就是这么来的。
    //    现在和单个制作走同一套加成。
    let t = Math.round(r.time * (1 - metaBonus().craft) * cxTimeMul());
    if (S.identity === 'smith') t = Math.round(t * 0.8);
    t = Math.max(3, t);
    addMin(t * n);
    // 巧手：每做一件都有机会多产 1 件；精算：每做一件都有机会退回 1 份材料
    let bonusN = 0, backN = 0;
    const cinKeys = Object.keys(cinB);
    for (let i = 0; i < n; i++) {
      if (chance(cxExtraChance())) bonusN++;
      if (cinKeys.length && chance(cxRefundChance())) {
        const rk = cinKeys[Math.floor(Math.random() * cinKeys.length)];
        if (addItem(rk, 1, true)) backN++;
      }
    }
    const outKeys = Object.keys(r.out);
    for (const k in r.out) addItem(k, r.out[k] * n + (k === outKeys[0] ? bonusN : 0));
    // 成品耐久：精工细作 +30% / 流水线 -20%（批量也一样生效）
    // ⚠️ 必须"这批里真有带耐久的成品"才动手：否则点了精工细作去烤肉干，会白写一行
    //    "这批成品的初始耐久按 130% 算"（东西压根没耐久，玩家看得莫名其妙）。
    if (outKeys.some(k => DURA[k] !== undefined) && cxDurMul() !== 1) {
      for (const k of outKeys) {
        if (DURA[k] === undefined) continue;
        const nd = Math.max(1, Math.round(DURA[k] * cxDurMul()));
        const arr = S.toolDurs && S.toolDurs[k];
        const made = r.out[k] * n + (k === outKeys[0] ? bonusN : 0);
        for (let i = 0; i < made; i++) if (arr && arr.length) arr[arr.length - 1 - i] = nd;
        durSync(k);
      }
      log(`【${nodeLv('craft','c_line') ? '流水线' : '精工细作'}】这批成品的初始耐久按 ${Math.round(cxDurMul() * 100)}% 算。`, 'sys');
    }
    S.exp.craft = Math.round((S.exp.craft + EXP_CRAFT * (S.furniture.shelf ? 1.1 : 1) * n) * 10) / 10;
    S.craftCount = (S.craftCount || 0) + n;
    log(`连续制作：${r.name}×${n}（耗时 ${t * n} 分钟）${bonusN ? `，其中【巧手】多做了 ${bonusN} 件` : ''}${backN ? `，【精算】退回 ${backN} 份材料` : ''}。`, 'good');
    change();
    return { ok:true, n };
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
    S.exp.craft += EXP_CRAFT * 2;
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
    // ⚠️ 背包满了就别卖：否则货扣了、贝壳币却塞不进去 → 货凭空消失
    const gain = price * qty;
    if (!fitsInBag({ beibi: gain })) { log('背包塞不下货款——先腾出一格再卖。', 'warn'); notifyBagFull(); return; }
    removeItem(id, qty);
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
    if (S.ending) return acts;
    if (S.scene === 'camp') {
      const dock = BUILDING_CHAINS.dock[S.buildings.dock];
      if (dock.boat === 'ocean' && hasItem('seachart') && invCount('supplybox') >= 3 && !S.flags.ended_A) acts.push({ id:'endA', name:'扬帆远航（结局·归乡）', desc:'远洋船、海图、三箱补给都已备齐。是时候回家了。' });
      if (S.flags['boss_pirateBoss'] && S.fame >= 2 && S.buildings.wall >= 3 && !S.flags.ended_B) acts.push({ id:'endB', name:'召集岛民（结局·岛主）', desc:'海盗已灭、声望已立、城墙已固。这座岛需要一个主人。' });
    }
    if (S.scene === 'peak' && !S.flags.ended_C) {
      if (hasItem('relic') && invCount('slate') >= 3 && hasItem('dragonbone')) acts.push({ id:'endC', name:'祭坛仪式（结局·秘辛）', desc:'遗物、三块石板、龙骨。祭坛在等你。' });
    }
    if (S.scene === 'atlantis' && (S.killCount.sunkenKing || 0) > 0) {
      if (!S.flags.ended_S)  acts.push({ id:'endS',  name:'重启灯塔（结局·重燃文明）', desc:'沉没之王已伏诛，点亮灯塔，让文明重生。' });
      if (!S.flags.ended_S2) acts.push({ id:'endS2', name:'封存灯塔（结局·深海长眠）', desc:'按灭最后一盏灯，让这座城重新安眠。' });
    }
    // 已达成、这一局还没结算的结局 → 给"看结算画面"的入口。
    // ⚠️ 以前缺的正是这一步：settleEnding() 全项目没有任何界面调用，
    //    玩家点了「祭坛仪式（结局·秘辛）」只写一行日志，结算画面与结算文字永远看不到。
    // ⚠️ 一个存档只认一个结算结局（作者要求：不能让一局把所有结局都结算了）：
    //    已经用别的结局收尾之后，剩下的按钮仍然留着（藏起来玩家会以为坏了），
    //    但点下去只会说明原因、不再结算。结算按钮的点击处理在 ui.js。
    const lockKey = S.flags.settledEnding;
    const lockName = lockKey ? ((ENDINGS[lockKey] || {}).name || lockKey) : '';
    for (const [key, id] of [['A','endA'], ['B','endB'], ['C','endC'], ['S','endS'], ['S2','endS2']]) {
      if (S.flags['ended_' + key] && !S.flags['settled_' + key]) {
        const nm = (ENDINGS[key] || {}).name || key;
        if (lockKey) {
          acts.push({ id:'settle_' + id, locked:true,
            name:`结算 · 结局「${nm}」（本局已收尾）`,
            desc:`本存档已经用结局「${lockName}」收尾了——一个存档只能结算一个结局，复活也不会解除。` });
        } else {
          acts.push({ id:'settle_' + id, name:`结算 · 结局「${nm}」`, desc:'看结局画面与结算文字（这一生折成魂点汇入《历代遗章》），看完还能继续玩。' });
        }
      }
    }
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
    askSettleEnding(id);
    return { ok:true, key: String(id).replace('end', '') };
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
      text: `这一生可以收尾了：《${name}》已经达成。\n\n⚠ 一个存档只能结算一个结局：确定结算《${name}》之后，这个存档就不能再结算其他结局了（其他结局仍然可以达成，只是收尾要开新的一局）。\n\n结算会把这一生折成魂点汇入《历代遗章》，看完可以按「留在岛上」接着玩，进度不会丢。\n\n不着急看也行——右下角会留一个「结算 · 结局「${name}」」按钮，随时能回来。`,
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
        { label:'再想想', hint:'先接着玩', ok: () => { log(`《${name}》先留着——右下角「结算 · 结局「${name}」」随时能回来。`, 'sys'); } },
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
  function resIds() { return Object.keys(ITEMS).filter(k => ['mat','special','bp','seed'].includes(ITEMS[k].cat)); }
  function monIds() { return Object.keys(ENEMIES).filter(k => !ENEMIES[k].noDex); }   // noDex：同名变体不单独进图鉴
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
  // （旧的"一键卖固定价表" sellPrice/sellItem 已删除：没有任何界面入口，属于遗留死代码）
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
    // cookie 兜底：平台清掉 localStorage 后，账号数据（魂点 / 历代遗章 / 图鉴）靠这一份救回来
    if (!M) {
      const ckMeta = ckGet(CK.meta);
      if (ckMeta) {
        try { M = JSON.parse(ckMeta); } catch (e) { M = null; }
        if (M) { try { localStorage.setItem('guyuyizhang_meta', ckMeta); } catch (e) {} }
      }
    }
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
      const json = JSON.stringify(M);
      localStorage.setItem('guyuyizhang_meta', json);
      ckMirror(CK.meta, CK.metaAt, json);   // 魂点/历代遗章/图鉴也镜像到 cookie
      try { cloudPush(false); } catch (e) {}   // 魂点/邮箱/备份槽也一起上云
    } catch (e) {}
  }
  function metaReload() { M = null; return metaLoad(); }   // 强制重新读盘（导入存档码 / 自检用）

  // ==================== 云存档（TapTap 小游戏云存档 v4）====================
  // 文档：developer.taptap.cn/minigameapidoc/dev/api/open-api/cloudsave/CloudSaveManager.*
  // 查证到的硬性限制（2026-09-18）：
  //   · 只有跑在 TapTap「小游戏」容器里才有 window.tap；用电脑浏览器 / 直接开 index.html 时这层自动关闭，
  //     原来的本地存档 + cookie 镜像照常工作，绝不受影响。
  //   · 存档文件 ≤10MB；单玩家单游戏 ≤100 个存档 / 100MB。
  //   · ⚠️ createArchive / updateArchive 一分钟最多一次（错误码 400001）→ 必须节流 + 只传最新的一份。
  //   · 上传前要先用 FileSystemManager 把内容写成本地文件；存档名不允许汉字。
  // 设计：本地（localStorage）+ cookie 镜像 + 云端，三份都留；读取时取"时间戳最新"的那一份，
  //       任何一步失败都只是记一行状态，绝不阻塞游戏、更不会覆盖更新的存档。
  const CLOUD_NAME = 'guyuyizhang_save';   // 存档名（英文；官方要求 60 字节内、不许汉字）
  const CLOUD_MIN_MS = 65 * 1000;          // 上传节流：官方 60 秒一次，我们留 5 秒余量
  const cloud = { ok:false, mgr:null, uuid:null, fileId:null, lastPush:0, timer:0, dirty:false, msg:'这台设备没有云存档', at:0, applied:0, diag:'' };
  function cloudTap() {
    try { return (typeof window !== 'undefined' && window.tap && window.tap.getCloudSaveManager) ? window.tap : null; } catch (e) { return null; }
  }
  function cloudReady() { return !!(cloud.ok && cloud.mgr); }
  function cloudStatus() { return { supported: cloud.ok, msg: cloud.msg, at: cloud.at, applied: cloud.applied, uuid: cloud.uuid, diag: cloud.diag }; }
  function cloudPayload() {
    return JSON.stringify({
      v: 1, savedAt: Date.now(),
      save: localStorage.getItem('guyuyizhang_save') || '',
      meta: localStorage.getItem('guyuyizhang_meta') || '',
    });
  }
  function cloudPath() { return cloudTap().env.USER_DATA_PATH + '/guyuyizhang_cloud.json'; }
  // ⚠️ TapTap 小游戏的文件系统是【回调风格】：writeFile({filePath, data, encoding, success, fail})，
  //    没有 writeFileSync（真机上第一版就是栽在这儿：fs2.writeFileSync is not a function）。
  //    这里两种都兼容：有同步用同步，没有就走回调。
  function cloudWriteFile(payload) {
    return new Promise((resolve, reject) => {
      let fs2 = null, p = '';
      try { fs2 = cloudTap().getFileSystemManager(); p = cloudPath(); } catch (e) { return reject(new Error('拿不到文件系统')); }
      if (!fs2) return reject(new Error('拿不到文件系统'));
      if (typeof fs2.writeFileSync === 'function') {
        try { fs2.writeFileSync(p, payload, 'utf8'); return resolve(p); } catch (e) { return reject(e); }
      }
      if (typeof fs2.writeFile === 'function') {
        try {
          fs2.writeFile({ filePath: p, data: payload, encoding: 'utf8',
            success: () => resolve(p),
            fail: (e) => reject(new Error((e && e.errMsg) || 'writeFile 失败')) });
        } catch (e) { reject(e); }
        return;
      }
      reject(new Error('文件系统不支持写文件'));
    });
  }
  function cloudReadFile(path) {
    return new Promise((resolve, reject) => {
      let fs2 = null;
      try { fs2 = cloudTap().getFileSystemManager(); } catch (e) { return reject(new Error('拿不到文件系统')); }
      if (!fs2) return reject(new Error('拿不到文件系统'));
      if (typeof fs2.readFileSync === 'function') {
        try { return resolve(String(fs2.readFileSync(path, 'utf8'))); } catch (e) { return reject(e); }
      }
      if (typeof fs2.readFile === 'function') {
        try {
          fs2.readFile({ filePath: path, encoding: 'utf8',
            success: (res) => resolve(String(res && res.data !== undefined ? res.data : '')),
            fail: (e) => reject(new Error((e && e.errMsg) || 'readFile 失败')) });
        } catch (e) { reject(e); }
        return;
      }
      reject(new Error('文件系统不支持读文件'));
    });
  }
  // 上传：节流窗内只记一个"待传"，到点自动补传（保证最后一次进度一定上云）
  function cloudPush(force) {
    if (!cloudReady()) return false;
    const now = Date.now();
    if (!force && now - cloud.lastPush < CLOUD_MIN_MS) {
      cloud.dirty = true;
      cloud.msg = '刚同步过（平台限制一分钟一次），这次的改动会排队，稍后自动补传';
      if (!cloud.timer) cloud.timer = setTimeout(() => { cloud.timer = 0; if (cloud.dirty) cloudPush(true); }, CLOUD_MIN_MS - (now - cloud.lastPush) + 50);
      return false;
    }
    let payload = '';
    try { payload = cloudPayload(); } catch (e) { return false; }
    // 还没有"这一局的进度"时不上传：空的云端档对恢复没用，还白白吃掉"一分钟一次"的配额
    try { if (!JSON.parse(payload).save) { cloud.dirty = true; cloud.msg = '还没有进度可上传'; return false; } } catch (e) {}
    cloud.dirty = false; cloud.lastPush = now; cloud.at = now;
    // 先写文件（异步）→ 再上传，顺序不能反：createArchive 读的是刚写好的那个文件
    cloudWriteFile(payload).then((path) => {
      const meta = { name: CLOUD_NAME, summary: '孤屿遗章 · 进度与魂点', extra: String(Date.now()), playtime: Math.round(((S && S.tick) || 0) / 60) };
      const args = { archiveMetaData: meta, archiveFilePath: path };
      const okCb = (res) => { if (res && res.uuid) { cloud.uuid = res.uuid; cloud.fileId = res.fileId || cloud.fileId; } cloud.msg = '已同步到云端'; cloud.diag = 'ok'; };
      const failCb = (e) => { cloud.msg = '云存档上传失败：' + ((e && e.errMsg) || '') + '（本地存档不受影响）'; cloud.dirty = true; };
      try {
        if (cloud.uuid) cloud.mgr.updateArchive(Object.assign({ archiveUUID: cloud.uuid }, args, { success: okCb, fail: failCb }));
        else cloud.mgr.createArchive(Object.assign({}, args, { success: okCb, fail: failCb }));
      } catch (e) { cloud.msg = '云存档调用异常：' + (e && e.message || ''); cloud.dirty = true; }
    }).catch((e) => {
      cloud.msg = '云存档写入本地文件失败：' + (e && e.message || '') + '（本地存档不受影响）';
      cloud.dirty = true;
    });
    return true;
  }
  // 下载：拿云端那份比一比，只有"确实更新"才覆盖本地
  function cloudPull(listItem) {
    if (!cloudReady() || !cloud.uuid) return;
    try {
      cloud.mgr.getArchiveData({ archiveUUID: cloud.uuid, archiveFileId: cloud.fileId, success: (res) => {
        // 读文件同样走"两种都兼容"的封装（TapTap 真机是回调风格）
        cloudReadFile(res.filePath).then((raw) => {
        let pack = null; try { pack = JSON.parse(raw); } catch (e) { return; }
        if (!pack || !pack.savedAt || !pack.save) return;
        const localAt = parseInt(localStorage.getItem('guyuyizhang_savedAt') || '0', 10) || 0;
        const cloudAt = parseInt(pack.savedAt, 10) || 0;
        if (cloudAt <= localAt) { cloud.msg = '云端与本地一致'; return; }
        // 云端更新 → 覆盖本地（先读回来验一遍，坏数据不覆盖）
        let j = null; try { j = JSON.parse(pack.save); } catch (e) { return; }
        if (!j || !j.day) { cloud.msg = '云端存档不完整，已忽略'; return; }
        localStorage.setItem('guyuyizhang_save', pack.save);
        try { localStorage.setItem('guyuyizhang_savedAt', String(cloudAt)); } catch (e) {}
        if (pack.meta) { try { localStorage.setItem('guyuyizhang_meta', pack.meta); M = null; } catch (e) {} }
        cloud.applied = j.day; cloud.at = Date.now();
        cloud.msg = `已从云端恢复进度（第 ${j.day} 天）`;
        log(`【云存档】${cloud.msg}。`, 'good');
        }).catch((e) => { cloud.msg = '云存档读取失败：' + (e && e.message || ''); });
      }, fail: (e) => { cloud.msg = '云存档下载失败：' + ((e && e.errMsg) || ''); } });
    } catch (e) { cloud.msg = '云存档下载异常'; }
  }
  function cloudInit() {
    const t = cloudTap();
    // 没检测到 TapTap 容器：不是小游戏形态 / 用浏览器直接打开的 → 云存档这一层不生效（本地存档照常）。
    // 这里把原因写清楚，玩家在「设置 → 云存档」里能直接看到，不用猜。
    if (!t) {
      cloud.diag = 'no-tap';
      cloud.msg = '没检测到 TapTap 容器（window.tap 不存在）——现在这份不是在小游戏里跑的，云存档不生效，本地存档照常。';
      return;
    }
    try {
      cloud.mgr = t.getCloudSaveManager();
      if (!cloud.mgr) { cloud.diag = 'no-manager'; cloud.msg = 'TapTap 容器在，但拿不到云存档管理器（基础库版本太低？）。'; return; }
      cloud.diag = 'ok';
      cloud.msg = '云存档已就绪';
      cloud.ok = true; cloud.msg = '云存档已就绪';
      cloud.mgr.getArchiveList({ success: (res) => {
        const s = ((res && res.saves) || []).find(x => x && x.name === CLOUD_NAME);
        if (s) { cloud.uuid = s.uuid; cloud.fileId = s.fileId; cloud.at = (s.modifiedTime || 0) * 1000; cloudPull(s); }
        else cloud.msg = '云端还没有存档，先玩一会儿就会自动上传';
      }, fail: (e) => { cloud.msg = '云存档列表读取失败：' + ((e && e.errMsg) || ''); } });
    } catch (e) { cloud.ok = false; cloud.msg = '云存档不可用'; }
  }
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
    // 传奇难度：不给物资（和邮箱领取同一道门槛）。
    // ⚠️ 这里**不消耗兑换码**——换低难度还能兑，不惩罚玩家。
    if (S && S.difficulty === 'legend' && (g.soul || g.item || g.relic)) {
      return { ok:false, reason:'传奇模式下不能兑换物资（物品 / 神物 / 魂点）。兑换码没有消耗掉——换一个低难度开局再来兑换。', legendBlock:true };
    }
    m.mailbox.push({ soul: g.soul || 0, item: g.item || null, qty: g.qty || 1, relic: g.relic || null, code:c });
    m.redeemed[c] = 1; metaSave();
    return { ok:true, msg: g.relic ? `获得神物【${RELICS[g.relic].name}】（已存入邮箱）`
      : (g.item ? `获得 ${ITEMS[g.item].name}×${g.qty || 1}（已存入邮箱）` : `获得 ${g.soul} 魂点（已存入邮箱）`) };
  }
  // ---------- 限定物：神弓（全账号唯一，可存邮箱跨局） ----------
  // 唯一性判定要同时看"当前局手里"和"邮箱里"：两处都没有才允许再次制作，
  // 否则限量就没意义（玩家会刷一堆）。
  function hasDivineBowAnywhere() {
    if (S && S.inv && (S.inv.divineBow || 0) > 0) return true;
    return hasMailboxDivineBow();
  }
  function hasMailboxDivineBow() {
    const m = metaState();
    return !!((m.mailbox || []).some(x => x && x.item === 'divineBow'));
  }
  // 存入邮箱：**当前局立刻失去这把弓**（不是复制），否则等于无中生有
  function storeDivineBow() {
    if (!S || !S.inv || !(S.inv.divineBow > 0)) return { ok:false, reason:'你身上没有神弓。' };
    const m = metaState();
    m.mailbox = m.mailbox || [];
    if (m.mailbox.some(x => x && x.item === 'divineBow')) return { ok:false, reason:'邮箱里已经存着一把神弓了（只能存一把）。' };
    // ⚠️ 耐久必须在 removeItem 之前读：removeItem 会把 S.toolDurs 里这条一起清掉（它以为物品没了），
    //    放在后面读就永远读到默认值，存进去的变成"全新一把"。
    const dur = (S.toolDurs && S.toolDurs.divineBow && S.toolDurs.divineBow[0] !== undefined) ? S.toolDurs.divineBow[0] : DURA.divineBow;
    removeItem('divineBow', 1);
    if (S.equipment.weapon === 'divineBow') S.equipment.weapon = null;
    if (S.equipment.weapon2 === 'divineBow') S.equipment.weapon2 = null;
    // 耐久一起带走（存的是"这一把"，不是全新的）
    if (S.toolDurs) delete S.toolDurs.divineBow;
    m.mailbox.push({ item:'divineBow', qty:1, divineBow:true, dur, title:'限定 · 神弓（26.9.15-26.9.30）', date:'' });
    metaSave();
    log(`你把神弓收进邮箱（剩余耐久 ${dur}）——它会在下一局等你。`, 'good');
    change();
    return { ok:true, dur };
  }
  // 内置更新公告：只有 approved 的才进邮箱，每个版本只发一次
  function syncPatchNotes() {
    if (typeof PATCH_NOTES === 'undefined' || !PATCH_NOTES || !PATCH_NOTES.length) return;
    const m = metaState();
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
    return (metaState().mailbox || []).map((x,i) => ({ i, soul: x.soul || 0, item: x.item || null, qty: x.qty || 1,
      divineBow: x.divineBow || false, dur: x.dur,      // 神弓：把耐久透出来，UI 才能显示"剩余耐久 N"
      relic: x.relic || null, notice: x.notice || null, title: x.title || '', body: x.body || '', date: x.date || '' }));
  }
  // 传奇难度不能靠邮箱白拿物资（物品 / 神物 / 魂点都算）——否则难度机制直接被抹平。
  // 公告（纯文本）不受影响，照常能读。
  // ⚠️ 只"拒绝领取"，**不消耗邮件**：留在邮箱里，换低难度还能领，不惩罚玩家。
  function mailIsSupply(g) { return !!(g && !g.notice && (g.item || g.relic || g.soul)); }
  function claimMailbox(i) {
    const m = metaState(); const g = (m.mailbox || [])[i];
    if (!g) return { ok:false, reason:'该邮件不存在' };
    if (g.notice) { m.mailbox.splice(i, 1); metaSave(); return { ok:true, msg:'公告已读' }; }
    if (S && S.difficulty === 'legend' && mailIsSupply(g)) {
      return { ok:false, reason:'传奇模式下不能领取物资邮件（物品 / 神物 / 魂点）。邮件会留在邮箱里——想领就换一个低难度开局。', legendBlock:true };
    }
    if (g.relic) {
      if (S) {
        S.relics = S.relics || [];
        if (!S.relics.includes(g.relic)) { S.relics.push(g.relic); log(`你获得了神物【${RELICS[g.relic].name}】——${RELICS[g.relic].desc}`, 'good'); }
        else log(`神物【${RELICS[g.relic].name}】你早就有了。`, 'sys');
      }
      m.mailbox.splice(i, 1); metaSave(); if (S) change();
      return { ok:true, msg:`领取了神物【${RELICS[g.relic].name}】` };
    }
    if (g.soul) { m.soul += g.soul; }
    if (g.item) {
      if (S) {
        addItem(g.item, g.qty || 1);
        // 神弓：把当初存进去的那把的耐久一起还回来（存的是"这一把"，不是全新的）
        if (g.divineBow && g.dur !== undefined) {
          S.toolDurs = S.toolDurs || {};
          S.toolDurs.divineBow = [g.dur];
          S.dur = S.dur || {}; S.dur.divineBow = g.dur;
          log(`你从邮箱取回了神弓（剩余耐久 ${g.dur}）。`, 'good');
        }
      }
    }
    m.mailbox.splice(i, 1); metaSave(); if (S) change();
    return { ok:true, msg: g.item ? `领取了 ${ITEMS[g.item].name}×${g.qty||1}` : `领取了 ${g.soul} 魂点` };
  }
  function mailboxCount() { return (metaState().mailbox || []).length; }
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
  function metaAllowed() { return S && (S.difficulty === 'easy' || S.difficulty === 'normal' || S.difficulty === 'dev'); }
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
  function metaLast() { return _lastSettle; }
  function reviveToday() {
    if (S.difficulty === 'legend') { log('传奇难度无法复活。', 'warn'); return; }
    const meta = metaState();
    if (meta.soul < 50) { log('魂点不足（需 50 魂点）。', 'warn'); return; }
    meta.soul -= 50; metaSave();
    if (!S._snap || !S._snap.day) { location.reload(); return; }
    const sn = S._snap.day;
    // ⚠️ 复活不能绕过"一局一个结局"（作者 2026-09-19 定死）：花 50 魂点回当天日出，
    //    settledEnding（本局定局）与 settled_*（某个结局已结算过）都必须原样保留。
    //    死亡本身不占名额（D 不写 settledEnding），所以"只死过"的存档照样能结算 A/B/C/S/S2。
    const settledKeep = {};
    for (const k in (S.flags || {})) if (k === 'settledEnding' || k.indexOf('settled_') === 0) settledKeep[k] = S.flags[k];
    Object.assign(S, JSON.parse(JSON.stringify(sn)));
    S.stats = JSON.parse(JSON.stringify(sn.stats));
    S.statuses = { bleed:0, poison:0, cold:false, fear:0 };
    S.death = undefined;
    S.ending = undefined;
    S.flags = S.flags || {};
    for (const k in settledKeep) S.flags[k] = settledKeep[k];
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
  cloudInit();   // TapTap 小游戏里会把云端那份拉下来对时（浏览器里自动跳过）

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
  // ---------- 皮肤包解锁（作者 2026-09-19）：深海琥珀 / 彩绘卡面各 50 魂点，账号级永久 ----------
  const SKIN_COST = 50;
  function skinCost() { return SKIN_COST; }
  function skinOwned(id) {
    if (id === 'ink') return true;                 // 墨白原味永远免费
    const m = metaState();
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
    if (data.ending) data.ending = undefined;   // 从备份继续 = 接着玩，别把结算状态带进来
    if (data.death) data.death = undefined;
    S = data;
    normalizeAfterLoad();
    return { ok:true, day: data.day };
  }
  // 读进来一份 S 之后要做的收尾（load() / loadSlot() / 救援恢复 共用）：
  // ① 补缺失字段（老格式/备份槽里的档可能缺）② 跑技能迁移 ③ 耐久对齐实例数组
  // ④ 对齐存档版本号并【立刻写回主存档】——不然标题页「继续上次游戏」还是上一局，
  //    而且 save() 会以为"另一个标签页有更新进度"拒绝写入（玩家反馈"覆盖不行"）。
  function normalizeAfterLoad() {
    if (!S.skill) S.skill = { craft:0, gather:0, combat:0 };
    if (!S.exp) S.exp = { gather:0, craft:0, combat:0 };
    if (!S.inv) S.inv = {};
    if (!S.toolDurs) S.toolDurs = {};
    if (!S.dur) S.dur = {};
    if (!S.equipIdx) S.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
    if (!S.equipment) S.equipment = { weapon:null, weapon2:null, armor:null, cloth:null, accessory:null };
    if (!S.statuses) S.statuses = { bleed:0, poison:0, cold:false, fear:0 };
    if (!S.stats) S.stats = { hp:100, stamina:100, hunger:100, thirst:100, spirit:100 };
    if (!S.toolkit) S.toolkit = [null, null, null];
    if (!S.flags) S.flags = {};
    if (!S.log) S.log = [];
    if (S.coopExt === undefined) S.coopExt = 0;
    if (S.storeExt === undefined) S.storeExt = 0;
    if (!S.satchelPref) S.satchelPref = { food:'', drink:'' };
    migrateSkills();
    for (const id in ITEMS) if (DURA[id] !== undefined) durList(id);
    // 同上：老备份槽里已经结算过某个结局 → 补记成定局，别让"一局一个结局"被读档绕过
    S.flags = S.flags || {};
    if (!S.flags.settledEnding) {
      for (const k of ['A','B','C','S','S2']) if (S.flags['settled_' + k]) { S.flags.settledEnding = k; break; }
    }
    try { S._rev = parseInt(localStorage.getItem('guyuyizhang_rev') || '0', 10) || 0; } catch (e) { S._rev = 0; }
    save();
  }

  // ---------- 导出 ----------
  return {
    S: () => S, setS: (s) => { S = s; },
    timePass: (m) => { if (S) addMin(m || 1); },
    bind: (o) => { if (o.onLog) onLog = o.onLog; if (o.onChange) onChange = o.onChange; if (o.onFight) onFight = o.onFight; if (o.onEnding) onEnding = o.onEnding; if (o.onOverlay) onOverlay = o.onOverlay; if (o.onSaveFail) onSaveFail = o.onSaveFail; if (o.onSaveConflict) onSaveConflict = o.onSaveConflict; },
    // 存档加固：给刚开的新局/刚读的档一个"当前存档版本号"基线，用来识别"另一个标签页有更新进度"
    saveRev: () => { try { return parseInt(localStorage.getItem('guyuyizhang_rev') || '0', 10) || 0; } catch (e) { return 0; } },
    savedAt: () => { try { return parseInt(localStorage.getItem('guyuyizhang_savedAt') || '0', 10) || 0; } catch (e) { return 0; } },
    forceSave: () => { if (S) { S._rev = 0; try { S._rev = parseInt(localStorage.getItem('guyuyizhang_rev') || '0', 10) || 0; } catch (e) {} } return save(); },
    newGame, load, hasSave, save,
    sceneOf, sceneUnlocked, canTravel, travel, atlantisTeleport, activatePortal, setZone, pointsOf, pointAvailable, pointStatus, doPoint, randomEventPool,
    onceRewardMissing,
    buildChain, buildFurniture, buildHouseExt, houseExtMax, houseExtMats, buildStoreExt, storeExtMax, storeExtMats, storeExtCap, atlantisCamp, atlantisFurnitureUsed, buildAtlantisFurniture, repairDive, demolishFurniture, canCraft, craft, exchangeCoins,
    liveInfo, liveCap, coopCap, coopExtMats, buildCoopExt, addSheep, addChick, toggleAutoFeed, deliverToBag,
    plant, harvest, consume, useMed, equip, rest, sleep, farmPlots, farmExt, tillPlot, loosenPlot, FARM_EXTRA_MAX, raidWolves, continueRun, syncToolkit, drainTool, drainById, restoreBackupSave, dailySign, dailySignState,
    dryOf, dryLeftMin, dryCollect, fmtLeft,
    hasDivineBowAnywhere, storeDivineBow, hasMailboxDivineBow,
    collectDailyReport, claimDailyTrap, resolveTrapDaily,
    setTimeFreeze, timeFrozen,
    rollTravelAmbush, roadAmbushChance, roadAmbushPool, ROAD_AMBUSH_MIN_DANGER,
    startFight, fightAction, useItemInFight, pointReason, furnSlotFull, furnitureUsed,
    laochaoAvailable, signalFlag, doFirstTrade, completeCommission,
    sellToMerchant, buyFromMerchant, priceOf,
    checkEndingActions, doEnding, settleEnding, collection, currentObjective, metaState, metaBuy, metaBonus, metaSettle, metaNum, metaLast, reviveToday, redeemCode, mailboxList, claimMailbox, mailboxCount, devEnabled, unlockDev, hasRelic, hpMax, gainRandomRelic, durOf, sleepQuality, unlockRelicSlot, equipRelic, unequipRelic, relicSlotCost, atlVendorInfo, buyRelicFromVendor, lotusLeft, backupPoints, slotList, buyBackupPoint, backupSlot, loadSlot, delSlot, exportCode, importCode, metaReload, raidDay, acceptCommission, sharpen, repairWeapon, nameWeapon, repairMatOf, wNameOf, craftMax, craftBatch, repairPistol, fixBrokenPistol, travelCost, equipTool, unequipTool, capUsed, unequip, newGame, achCheck, achClaim, achUnlocked, achState,
    // 技能树（B1）
    skillTreeInfo, skillUpTrunk, skillNodeLearn, skillNodeForget, nodeLv, trunkPicks, trunkLv, nodeCheck, nodeIsLeaf, nodeForgetGain, craftIn,
    trunkForgetInfo, skillTrunkForget,          // 主干遗忘（只能从末端退，返还一半）
    skinCost, skinOwned, unlockSkin,            // 皮肤包解锁（深海琥珀 / 彩绘卡面 各 50 魂点）
    satchelPref: () => (S && S.satchelPref) || { food:'', drink:'' },
    setSatchelPref: (kind, id) => {
      if (kind !== 'food' && kind !== 'drink') return { ok:false, reason:'只有食物 / 饮水两类' };
      S.satchelPref = S.satchelPref || { food:'', drink:'' };
      S.satchelPref[kind] = id || '';
      save(); change();
      return { ok:true, id: S.satchelPref[kind] };
    },
    vendorRelicChance: () => VENDOR_RELIC_CHANCE,
    scanLocalSaves, restoreLocalSave, rescueInfo,   // 存档救援：扫描本机痕迹 / 恢复某一份
    confirmSettleEnding,   // 结算前二次确认（一局只能结算一个结局，所以要单独再问一次）
    skillCritRate: cxCrit, gatherYieldMul: gxYieldMul, gatherTimeMul: gxTimeMul, gatherEnergyMul: gxEnergyMul,
    sweepCdTotal, sweepMul, vampRate, execThreshold, revengeBonus,
    wallBlockBonus, wallDurMul, swiftBonus, rageAtkMul, rageTakenMul, ironTakenMul, ironAtkMul, ammoSaveChance, rangedAcc,
    cloudStatus, cloudPush, cloudInit,   // 云存档（TapTap 小游戏）：状态查询 / 立即上传 / 手动初始化
    hasItem, invCount, addItem, removeItem, capacity, fertilize,
    sweepInfo,
    playerAtk, playerDef, warmth, maxStam, combatLv, expLevel, charStats, combatSpeed,
    isNight, isDusk, seasonInfo, fmtTime,
    log, change, addMin, die, diaryAdd,
    resIds, monIds,   // 图鉴名单（总量与列表共用，保证对得上）
  };
})();
