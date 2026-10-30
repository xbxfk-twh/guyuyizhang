/* journey：业务规则的唯一实现；Game 保留调用接口与装配。 */
const JourneyRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const chance=(...args)=>deps.chance(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const invCount=(...args)=>deps.invCount(...args);
    const hasItem=(...args)=>deps.hasItem(...args);
    const removeItem=(...args)=>deps.removeItem(...args);
    const capUsed=(...args)=>deps.capUsed(...args);
    const capacity=(...args)=>deps.capacity(...args);
    const autoStoreWarehouse=(...args)=>deps.autoStoreWarehouse(...args);
    const lanternRiskMul=(...args)=>deps.lanternRiskMul(...args);
    const addMin=(...args)=>deps.addMin(...args);
    const isNight=(...args)=>deps.isNight(...args);
    const pointsOf=(...args)=>deps.pointsOf(...args);
    const lightLevel=(...args)=>deps.lightLevel(...args);
    const triggerRandomEvent=(...args)=>deps.triggerRandomEvent(...args);
    const showOverlay=(...args)=>deps.showOverlay(...args);
    const temperatureInfo=(...args)=>deps.temperatureInfo(...args);
    const temperatureEntered=(...args)=>deps.temperatureEntered(...args);
    const startFight=(...args)=>deps.startFight(...args);
    const diaryAdd=(...args)=>deps.diaryAdd(...args);
    const nightmareEncounter=(...args)=>deps.nightmareEncounter(...args);
    const metaBonus=(...args)=>deps.metaBonus(...args);
    const hasRelic=(...args)=>deps.hasRelic(...args);
function sceneOf(id) { return SCENES.find(s => s.id === id); }

function sceneUnlocked(id) {
    const sc = sceneOf(id);
    if (!sc) return false;
    if (gameState.run.buildings.watch < sc.unlockWatch) return false;
    if (sc.needBoat) {
      const rank = { none:0, raft:1, boat:2, ship:3, ocean:4 };
      const dock = BUILDING_CHAINS.dock[gameState.run.buildings.dock];
      if (rank[dock.boat] < rank[sc.needBoat]) return false;
    }
    return true;
  }

function canTravel(id) {
    if (id === 'atlantis') {
      if (!hasItem('seachart') && !(gameState.run.atlantis && gameState.run.atlantis.unlocked)) return { ok:false, reason:'还没有通往亚克兰蒂斯的路——需要海图，或完成「秘辛」祭坛仪式。' };
      if (!['diveSuit','diveSuit2'].includes(gameState.run.equipment.cloth)) return { ok:false, reason:'需要先穿「潜水服」（衣物栏）才能潜入海底。' };
      const o2 = (gameState.run.toolkit||[]).includes('diveMask') || hasItem('diveMask') || hasRelic('atlantisSeed');
      if (!o2) return { ok:false, reason:'海底太深，需要「氧气罩」（工具栏）或神物「亚特兰蒂斯之种」。' };
      return { ok:true };
    }
    if (!sceneUnlocked(id)) {
      const sc = sceneOf(id);
      if (gameState.run.buildings.watch < (sc.unlockWatch || 1)) return { ok:false, reason:`需要在营地建好 ${sc.unlockWatch} 级瞭望台才能看见这里` };
      if (sc.needBoat) { const dock = BUILDING_CHAINS.dock[gameState.run.buildings.dock]; const rank = { none:0, raft:2, boat:3, ship:4, ocean:5 }; if (rank[dock.boat] < rank[sc.needBoat]) return { ok:false, reason:`海雾太重，你现在的船（${dock.name}）渡不过去——需要${sc.needBoat === 'raft' ? '木筏' : sc.needBoat === 'boat' ? '小船' : sc.needBoat === 'ship' ? '大船' : '远洋船'}才行` }; }
      return { ok:false, reason:'尚未解锁' };
    }
    const sc = sceneOf(id);
    const w = WEATHER[gameState.run.weather];
    if (w.block && w.block.includes(id)) return { ok:false, reason:`雷暴天气，无法前往${sc.name}` };
    // 温度进入缓冲允许先抵达，再给 30 分钟换衣服。
    return { ok:true };
  }

function atlantisTeleport(dir) {
    const previousTemp = temperatureInfo();
    if (dir === 'to') {
      if (gameState.run.flags.ended_C && !(gameState.run.atlantis && gameState.run.atlantis.stoneActive)) { log('山顶的传送石还没被激活——先回山顶，用三块石板解出它的符文。', 'warn'); return { ok:false }; }
      const chk = canTravel('atlantis');
      if (!chk.ok) { log(chk.reason, 'warn'); return { ok:false, reason:chk.reason }; }
      gameState.run.scene = 'atlantis'; gameState.run.zone = 'habitat'; temperatureEntered(previousTemp);
      log('传送石亮起，你瞬间出现在礁石栖息地。', 'good');
      change(); return { ok:true };
    }
    gameState.run.scene = 'camp'; gameState.run.zone = null; temperatureEntered(previousTemp);
    log('传送石把你送回了营地。', 'sys');
    change(); return { ok:true };
  }

function activatePortal() {
    if (!gameState.run.atlantis) gameState.run.atlantis = { unlocked:1, visited:0, camp:{ furniture:{}, buildings:{} }, quest:0 };
    gameState.run.atlantis.unlocked = 1; gameState.run.atlantis.stoneActive = 1;
    if (invCount('slate') >= 3) removeItem('slate', 3);
    log('三块石板严丝合缝地拼合起来——传送石轰然亮起！从此营地与亚克兰蒂斯之间，一步之遥。', 'good');
    diaryAdd('石板的秘密解开了，传送石亮了。');
    change();
    return { ok:true };
  }

const LAND_SCENES = { camp:1, farm:1, river:1, forest:1, bamboo:1, quarry:1, grassland:1, desert:1, cave:1, peak:1 };

function travelDist(fromId, toId) {
    if (fromId === 'atlantis' || toId === 'atlantis') return 90;   // 海底往返都是游泳 1.5 小时
    const a = sceneOf(fromId), b = sceneOf(toId);
    if (!a || !b) return 0;
    if (fromId === 'camp') return b.distMin;
    if (toId === 'camp') return a.distMin;
    if (LAND_SCENES[fromId] && LAND_SCENES[toId]) return Math.max(10, Math.abs(a.distMin - b.distMin));
    return Math.round(Math.max(a.distMin, b.distMin) + Math.min(a.distMin, b.distMin) * 0.25);
  }

function staminaCost(value) { return Math.ceil(value * ((gameState.run.statuses.nauseaUntil || 0) > (gameState.run.tick || 0) ? 1.5 : 1)); }

function loadPenalty() {
    const excess=Math.max(0,capUsed()-capacity()),percent=Math.min(200,excess*10);
    return {excess,percent,multiplier:1+percent/100};
  }

function travelCost(id) {
    const dist = travelDist(gameState.run.scene, id);
    let mul = 1;
    if (gameState.run.weather === 'fog') mul *= 1.5;
    if (gameState.run.furniture.signpost) mul *= 0.9;
    if (gameState.run.flags.horse) mul *= 0.7;
    if (isNight() && !hasItem('torch')) mul *= 1.5;
    const time = Math.round(dist * mul * (1 - metaBonus().travel));
    const energy = Math.max(1, Math.round(time / 15) * 5);
    return { time, energy:Math.ceil(staminaCost(energy)*loadPenalty().multiplier) };
  }

function zoneSwimCost(from, to) {
    const A = ATLANTIS_MAP_ARROWS[from], B = ATLANTIS_MAP_ARROWS[to];
    let t = (A && B) ? Math.max(15, Math.round(Math.hypot(A.x - B.x, A.y - B.y) * 2.4)) : 30;
    let ec = Math.max(5, Math.round(t / 15) * 5);
    const thruster = gameState.run.equipment.accessory === 'thruster';
    if (thruster) { t = Math.max(8, Math.round(t / 2)); ec = Math.max(3, Math.round(ec / 2)); }
    return { time: t, energy: Math.ceil(staminaCost(ec)*loadPenalty().multiplier), thruster };
  }

function roadAmbushChance(danger) { return Math.min(0.30, 0.05 * danger); }

function roadAmbushPool(danger) {
    // 狼随时可能成群（它的 pack 特性自带"50% 两只"，正好对应"1~2 条狼"）；熊只在危险度 ≥4 出现。
    // 洞穴熊还带 minDay:30 —— 前 30 天不出现（玩家反馈"有点强了"），统一在这里按门槛过滤。
    const pool = ['wolf', 'wolf', 'wolf'];
    if (danger >= 4 && chance(0.35)) pool.push('cavebear');
    return pool.filter(id => ENEMIES[id] && (!ENEMIES[id].minDay || gameState.run.day >= ENEMIES[id].minDay));
  }

function rollTravelAmbush(id, force) {
    // 作者 2026-09-17：设置里不再允许关闭赶路遇袭 —— 老存档里 settings.roadAmbush=false 也忽略
    if (gameState.run._testNoAmbush) return false;   // ⚠️ 只给回归测试用（checks.js 会设它），玩家存档里不存在这个字段
    if (id === 'atlantis' || gameState.run.scene === 'atlantis') return false;   // 海底有自己那套，这里只管第一章陆地
    const sc = sceneOf(id);
    const danger = sc.danger || 1;
    if (danger < deps.ROAD_AMBUSH_MIN_DANGER) return false;
    if (!force && !chance(roadAmbushChance(danger) * ((id === 'sea' || gameState.run.scene === 'sea') ? 1 : lanternRiskMul()))) return false;
    const pool = roadAmbushPool(danger);
    if (!pool.length) return false;
    const eid = pool[Math.floor(Math.random() * pool.length)];
    const en = ENEMIES[eid];
    const isWolf = eid === 'wolf';
    gameState.run._roadAmbush = { id, enemy: eid };
    const where = isWolf ? '前方的石堆后传来低沉的呼噜声——一条狼压着身子绕了出来' : '灌木丛轰然裂开，一头洞穴熊立起身子，比你高出一个头';
    showOverlay({ title: isWolf ? '路被狼拦住了' : '路被熊拦住了',
      text: `${where}，挡住了去${sc.name}的路。`,
      choices: [
        { label:'迎战', hint:'打倒它才能过去', ok:() => {
          gameState.run._onFightWin = () => {
            const pend = gameState.run._roadAmbush;
            gameState.run._roadAmbush = null;
            if (pend && pend.id === id) { log(`${en.name}倒下了，路通了。`, 'good'); arriveAt(id); }
          };
          log(`${en.name}朝你扑了过来！`, 'danger');
          startFight(en, true);
        } },
        { label:'退回去', hint:'这次没走成，体力与时间照常消耗', ok:() => {
          gameState.run._roadAmbush = null;
          addMin(15);
          log(`你慢慢后退，绕开了${en.name}——这一趟白跑了。`, 'warn');
          change();
        } },
      ] });
    return true;
  }

function travel(id) {
    if (id === gameState.run.scene) { log('你已经在这里了。', 'warn'); return; }
    const chk = canTravel(id);
    if (!chk.ok) { log(chk.reason, 'warn'); return; }
    const sc = sceneOf(id);
    const { time: t, energy: energyCost } = travelCost(id);
    if (gameState.run.stats.stamina < energyCost) { log('你太累了，走不动这么远。休息一下。', 'warn'); return; }
    gameState.run.stats.stamina -= energyCost;
    log(`你向${sc.name}出发（${t} 分钟）。`, 'sys');
    if (sc.travelFrom) log(sc.travelFrom);
    if (isNight() && !hasItem('torch') && id !== 'camp') {
      log('夜色吞没了小路，你走得很慢，总感觉身后有脚步声。', 'warn');
    }
    addMin(t);
    // ⚠️ 拦路判定必须在"真正落地"之前：玩家选"退回"时就该留在原地，不该先到再退
    if (gameState.run.death || gameState.run.ending) return;
    if(gameState.run.difficulty==='nightmare') {
      const previous=temperatureInfo(),from=gameState.run.scene,fromZone=gameState.run.zone;
      gameState.run.scene=id;gameState.run.zone=id==='atlantis'?'habitat':null;
      if(nightmareEncounter('move')){temperatureEntered(previous);change();return;}
      gameState.run.scene=from;gameState.run.zone=fromZone;
    }
    if (rollTravelAmbush(id)) { change(); return; }
    arriveAt(id);
  }

function arriveAt(id) {
    const sc = sceneOf(id);
    const previousTemp = temperatureInfo();
    gameState.run.scene = id; gameState.run.zone = (id === 'atlantis') ? 'habitat' : null;   // 海底默认落在礁石栖息地
    temperatureEntered(previousTemp);
    gameState.run.tempActiveUntil = (gameState.run.tick || 0) + 30;
    autoStoreWarehouse();
    if (id === 'atlantis' && gameState.run.identity === 'linghui') log('灵灰贴着水面向下望，忽然安静下来：「我好像……见过这里。」', 'blue');
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
    if (id === 'peak' && !gameState.run.flags.ended_C && hasItem('relic') && invCount('slate') >= 3 && hasItem('dragonbone')) {
      log('祭坛的凹槽与三块石板严丝合缝——去点山顶的「祭坛 · 举行仪式」（或右下角的「祭坛仪式」按钮）。', 'good');
    }
    // 仪式做完、传送石还没激活：明确告诉玩家"下一步在哪、点什么"（很多人以为仪式做完就没事了）
    if (id === 'peak' && gameState.run.flags.ended_C && !(gameState.run.atlantis && gameState.run.atlantis.stoneActive)) {
      log('山顶的传送石已经浮现——点右上角的「传送石 · 需解密」，把三块石板拼上去解开符文。', 'good');
    }
    const trapFired = false;   // 陷阱已并入"每日晨报"（collectDailyReport），到草地不再单独结算
    if (!trapFired && chance(0.1)) triggerRandomEvent(id);
    change();
  }

function sceneDesc(sc) {
    const w = gameState.run.weather;
    if (sc.id === 'sea' || sc.id === 'shore') {
      if (gameState.run.zone && sc.zones[gameState.run.zone]) return sc.zones[gameState.run.zone].name + '：' + (sc.zones[gameState.run.zone].desc || sc.desc.intro);
    }
    if (isNight() && sc.desc.night) return sc.desc.night;
    if ((w === 'rain' || w === 'snow' || w === 'storm') && sc.desc.rain) return sc.desc.rain;
    return sc.desc.intro;
  }

function setZone(z) {
    const sc = sceneOf(gameState.run.scene);
    if (!sc.zones || !sc.zones[z]) return;
    if (sc.id === 'shore' && z === 'ruins' && gameState.run.buildings.watch < 3) { log('遗迹的方向被海雾锁住。三级瞭望台也许能看清路。', 'warn'); return; }
    if (sc.id === 'shore' && z === 'saltTown' && !sceneUnlocked('shore')) { log('你还没有能渡海的船。', 'warn'); return; }
    if (sc.id === 'sea' && z === 'cove' && gameState.run.buildings.watch < 2) { log('沉船湾被礁石遮挡，你找不到入口。', 'warn'); return; }
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
    const fromZone = gameState.run.zone;
    let swam = false;
    if (sc.id === 'atlantis' && gameState.run.zone && gameState.run.zone !== z) {
      const c = zoneSwimCost(gameState.run.zone, z);
      const t = c.time, ec = c.energy;
      if (gameState.run.stats.stamina < ec) { log('你筋疲力尽，游不动了，先回礁石栖息地歇歇。', 'warn'); return; }
      gameState.run.stats.stamina -= ec;
      addMin(t);
      log(`你在海底游了 ${t} 分钟（消耗体力 ${ec}）${c.thruster ? '——推进器让消耗减半' : ''}。`, 'sys');
      swam = true;
    }
    const previousTemp = temperatureInfo();
    gameState.run.zone = z;
    autoStoreWarehouse();
    temperatureEntered(previousTemp);
    gameState.run.tempActiveUntil = (gameState.run.tick || 0) + 30;
    log(`你来到${sc.zones[z].name}。`);
    if (sc.zones[z].desc) log(sc.zones[z].desc);
    change();
    // 深海区移动：40% 被随机海底怪物拦截。
    // 关键：移动（时间/体力/区域）已经结算完毕，战斗不会取消或重来这次移动。
    if (fromZone !== z && nightmareEncounter('move')) return;
    if (swam && !gameState.run.combat && typeof ATLANTIS_DEEP_ZONES !== 'undefined' && (ATLANTIS_DEEP_ZONES.includes(z) || ATLANTIS_DEEP_ZONES.includes(fromZone))) {
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
      if (!gameState.run.combat && chance(0.1)) triggerRandomEvent(gameState.run.scene);
    }
  }
    return Object.freeze({sceneOf,sceneUnlocked,canTravel,atlantisTeleport,activatePortal,travelDist,staminaCost,loadPenalty,travelCost,zoneSwimCost,roadAmbushChance,roadAmbushPool,rollTravelAmbush,travel,arriveAt,sceneDesc,setZone});
  }
  return Object.freeze({create});
})();
