/* lifecycle：业务规则的唯一实现；Game 保留调用接口与装配。 */
const RunLifecycle = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const persistPair=(...args)=>deps.persistPair(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const invCount=(...args)=>deps.invCount(...args);
    const removeItem=(...args)=>deps.removeItem(...args);
    const giveStart=(...args)=>deps.giveStart(...args);
    const ckGet=(...args)=>deps.ckGet(...args);
    const save=(...args)=>deps.save(...args);
    const maxStam=(...args)=>deps.maxStam(...args);
    const diaryAdd=(...args)=>deps.diaryAdd(...args);
    const difficultyUnlocked=(...args)=>deps.difficultyUnlocked(...args);
    const identityUnlocked=(...args)=>deps.identityUnlocked(...args);
    const metaSave=(...args)=>deps.metaSave(...args);
    const metaState=(...args)=>deps.metaState(...args);
    const metaBonus=(...args)=>deps.metaBonus(...args);
    const ensureRunId=(...args)=>deps.ensureRunId(...args);
    const rememberSettledRun=(...args)=>deps.rememberSettledRun(...args);
    const metaSettle=(...args)=>deps.metaSettle(...args);
    const validSave=(...args)=>deps.validSave(...args);
const RESCUE_KEY = 'guyuyizhang_rescue';

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
    try{const other=JSON.parse(localStorage.getItem('guyuyizhang_alternate_save')||'null');if(other)add('alternate','本机与云端冲突时保留的另一份进度',other.guyuyizhang_save,0);}catch(e){}
    add('bak', '上一次保存前的状态（回退一步）', localStorage.getItem('guyuyizhang_save_bak'),
      (function () { try { return parseInt(localStorage.getItem('guyuyizhang_savedAt') || '0', 10) || 0; } catch (e) { return 0; } })());
    try { const ck = ckGet(deps.CK.save); if (ck && ck !== localStorage.getItem('guyuyizhang_save')) add('cookie', 'cookie 镜像（平台清缓存前的最后一份）', ck, parseInt(ckGet(deps.CK.saveAt) || '0', 10) || 0); } catch (e) {}
    const m = metaState();
    (m.slots || []).forEach((sl, i) => { if (sl && sl.data) add('slot' + i, `备份槽 ${i + 1}`, JSON.stringify(sl.data), 0); });
    return out.sort((a, b) => (b.at || 0) - (a.at || 0));
  }

function restoreLocalSave(src) {
    let raw = '';
    if (src === 'main') raw = localStorage.getItem('guyuyizhang_save');
    else if (src === 'bak') raw = localStorage.getItem('guyuyizhang_save_bak');
    else if (src === 'cookie') { try { raw = ckGet(deps.CK.save); } catch (e) {} }
    else if (src === 'rescue') { const rs = rescueInfo(); raw = rs ? rs.save : ''; }
    else if (src === 'alternate') { try{raw=JSON.parse(localStorage.getItem('guyuyizhang_alternate_save')||'null')?.guyuyizhang_save;}catch(e){} }
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
    rememberSettledRun(gameState.run, nextM);
    ensureRunId(j, nextM);
    const result = persistPair(j, nextM, true);
    return result.ok ? {ok:true,day:j.day,identity:j.identity} : result;
  }

function checkpointState() {
    const state = {};
    for (const key of Object.keys(gameState.run)) {
      if (key[0] === '_' || ['dawnCheckpoint','combat','death','ending'].includes(key)) continue;
      state[key] = gameState.run[key];
    }
    return JSON.parse(JSON.stringify(state));
  }

function snapshot(kind) {
    const state = checkpointState();
    gameState.run._snap = gameState.run._snap || {};
    gameState.run._snap[kind] = state;
    if (kind === 'day' && state.stats.hp > 0) gameState.run.dawnCheckpoint = { version:1, state };
  }

function reviveInfo() {
    if (!gameState.run || gameState.run.difficulty === 'legend') return {ok:false, reason:'传奇难度无法回溯。'};
    const point = gameState.run.dawnCheckpoint;
    const state = (point && point.version === 1 && point.state) || (gameState.run._snap && gameState.run._snap.day);
    if (!state || !state.stats || state.stats.hp <= 0 || !state.inv || state.day !== gameState.run.day)
      return {ok:false, reason:'当前存档没有有效的当天日出记录。旧存档继续到下一次日出后会自动建立；可尝试读取备份。'};
    if (metaState().soul < 50) return {ok:false, reason:'魂点不足（需 50 魂点）。'};
    return {ok:true, state};
  }

function rollback(kind) {
    if (!gameState.run._snap || !gameState.run._snap[kind]) { location.reload(); return; }
    const sn = gameState.run._snap[kind];
    Object.assign(gameState.run, JSON.parse(JSON.stringify(sn)));
    gameState.run.stats = sn.stats;
    gameState.run.statuses = { bleed:0, poison:0, cold:false, fear:0 };
    log('你从昏暗中醒来，时间回到了过去……', 'sys');
    change();
  }

function newGame(identity, difficulty) {
    if (!DIFFICULTIES[difficulty] || !IDENTITIES[identity]) return {ok:false,reason:'无效职业或难度。'};
    if (!identityUnlocked(identity)) return {ok:false,reason:'请先用 100 魂点永久解锁该角色。'};
    if (!difficultyUnlocked(difficulty)) return {ok:false,reason:'先在幸存者模式完成任一通关结局。'};
    if(['legend','nightmare'].includes(difficulty) && !metaSave().ok) return {ok:false,reason:'解锁记录未能保存，请检查存储后重试。'};
    // ⚠️ 开新游戏之前，先把"正在玩的那一份"留一份救援档（玩家反馈：开新档把一直玩的档顶掉了，找不回来）
    rescueStash();
    gameState.run = {
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
      flags:{}, diary:[], diaryReadCount:0, log:[], seen:{},   // tailorGift 是顶层字段（见 newGame 尾部）：新局不赠送裁缝台
      pointUses:{}, killCount:{}, sold:{}, hpLostTotal:0,
      livestock:{ pen:[], coop:[], autoFeed:true }, traps:{ placed:0 },
      death:null, ending:null, combat:null, pistolCalibrated:false,
     settings:{ roadAmbush:true },   // 赶路遇袭（危险度≥3 的区域会被狼/熊拦路）；玩家可在设置里关掉
     bookFocus:'', cellar:{items:[]}, learnedBlueprints:{}, blueprintKnowledgeVersion:1, satchelPref:{ food:'', drink:'' }, satchelChoices:{food:[],drink:[],blocked:[]},   // 食之包自动进食饮水优先用哪一件（空 = 自动挑最省的）
    };
    if (difficulty === 'nightmare') log('岛上不知何时出现了不可名状的怪物……击败沉没之王后，深水圣殿将显露噩梦之源。','danger');
    if(difficulty!=='legend'){giveStart('reedPack',1,true);gameState.run.backpack='reedPack';}
    const idn = IDENTITIES[identity];
    for (const k in idn.items) giveStart(k, idn.items[k], true);
    // 首次引导：作者 2026-09-23 反馈"上来就自己做了武器，完了才发现初始包裹就有" ——
    // 所以第一步改成「先看背包」（tut=0），看完再进入"做石镐 → 装备"两步。
    // 由 ui.js 在玩家打开【背包】时把 0 推进到 1/2（已经自带工具就直接跳到装备那步）。
    gameState.run.tut = 0;
    // 新局：裁缝台不赠送（tailorGift=0），必须自己建；旧档兼容见 normalizeState 里的迁移。
    gameState.run.tailorGift = 0;
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
    if (mbK.startG) gameState.run.exp.gather = Math.round(((gameState.run.exp.gather || 0) + mbK.startG) * 10) / 10;
    if (mbK.startC) gameState.run.exp.craft  = Math.round(((gameState.run.exp.craft  || 0) + mbK.startC) * 10) / 10;
    if (mbK.startF) gameState.run.exp.combat = Math.round(((gameState.run.exp.combat || 0) + mbK.startF) * 10) / 10;
    // 隐藏的开发者难度：全资源×100、背包 200 格、全图鉴、全神器
    if (difficulty === 'dev') {
      gameState.run.capacity = 10000;   // 开发者背包锁 10000 格
      // 所有物品自带：工具/武器/装备(不可叠) 各1、可堆叠资源各100（盾牌等也一起给）
      for (const k in ITEMS) giveStart(k, (ITEMS[k].stack === 1) ? 1 : 100, true);
      const mm = metaState();
      for (const k in ENEMIES) { gameState.run.seen['mon_'+k] = 1; mm.seenMon[k] = 1; }
      for (const k in ITEMS) if (['mat','special','bp','seed'].includes(ITEMS[k].cat)) { gameState.run.seen[k] = 1; mm.seenItems[k] = 1; }
      gameState.run.relics = Object.keys(RELICS);
      gameState.run.relicSlots = 3;
      gameState.run.relicEquip = Object.keys(RELICS);
      for (const f of FURNITURE) gameState.run.furniture[f.id] = true;                 // 全家具
      for (const f of ATLANTIS_FURNITURE) { gameState.run.atlantis = gameState.run.atlantis || { camp:{ furniture:{} } }; if (!gameState.run.atlantis.camp) gameState.run.atlantis.camp = { furniture:{} }; if (!gameState.run.atlantis.camp.furniture) gameState.run.atlantis.camp.furniture = {}; gameState.run.atlantis.camp.furniture[f.id] = true; }
      gameState.run.houseExt = 3;                                                      // 扩建满
      gameState.run.storeExt = 4;                                                      // 仓库扩建也拉满
      gameState.run.buildings.house = BUILDING_CHAINS.house.length - 1;                // 营地全满级
      gameState.run.buildings.fire = BUILDING_CHAINS.fire.length - 1;
      gameState.run.buildings.storage = BUILDING_CHAINS.storage.length - 1;
      gameState.run.buildings.wall = BUILDING_CHAINS.wall.length - 1;
      gameState.run.buildings.watch = BUILDING_CHAINS.watch.length - 1;
      gameState.run.buildings.dock = BUILDING_CHAINS.dock.length - 1;
      gameState.run.buildings.farm = BUILDING_CHAINS.farm.length - 1;
      gameState.run.atlantis = gameState.run.atlantis || { camp:{ furniture:{}, buildings:{} } };
      gameState.run.atlantis.unlocked = 1; gameState.run.atlantis.stoneActive = 1;
      metaSave();
    }
    gameState.run.stats.stamina = maxStam();   // 开局体力=满上限（含传承加成）
    gameState.run.seen = {};
    gameState.run._rev = (() => { try { return parseInt(localStorage.getItem('guyuyizhang_rev') || '0', 10) || 0; } catch (e) { return 0; } })();
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

function die(reason) {
    // 不死丹：起死回生（只保住 reviveHp 点生命，不是满血）
    if (invCount('lotusPill') > 0) {
      removeItem('lotusPill', 1);
      const rv = Math.max(1, ITEMS.lotusPill.reviveHp || 30);
      gameState.run.stats.hp = rv;
      log(`不死丹在体内化开，把你从鬼门关拉了回来。（生命 ${rv}）`, 'good');
      diaryAdd('不死丹救了我一命。');
      change();
      return true;
    }
    gameState.run.death = reason;
    gameState.run.ending = 'D';
    // 真·死亡：结算魂点并结束本局（弹死亡结算窗）
    const ms = metaSettle();
    if (ms) log(`你的一生化为 ${ms.gain} 魂点，汇入了《历代遗章》。`, 'good');
    if (deps.onEnding) deps.onEnding('D', reason);
    return false;
  }

function endingD(reason) { gameState.run.ending = 'D'; const ms = metaSettle(); if (ms) log(`你的一生化为 ${ms.gain} 魂点，汇入了《历代遗章》。`, 'good'); if (deps.onEnding) deps.onEnding('D', reason); }

function continueRun() {
    if (!gameState.run) return;
    if (gameState.run.ending) gameState.run.ending = undefined;
    if (gameState.run.death) gameState.run.death = undefined;
    change();
  }
    return Object.freeze({rescueStash,rescueInfo,scanLocalSaves,restoreLocalSave,checkpointState,snapshot,reviveInfo,rollback,newGame,die,endingD,continueRun});
  }
  return Object.freeze({create});
})();
