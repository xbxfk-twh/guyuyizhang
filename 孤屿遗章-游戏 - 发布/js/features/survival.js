/* survival：业务规则的唯一实现；Game 保留调用接口与装配。 */
const SurvivalRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const rnd=(...args)=>deps.rnd(...args);
    const chance=(...args)=>deps.chance(...args);
    const pick=(...args)=>deps.pick(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const hasItem=(...args)=>deps.hasItem(...args);
    const drainById=(...args)=>deps.drainById(...args);
    const HOUR_EFFECTS=(...args)=>deps.HOUR_EFFECTS(...args);
    const deliverToBag=(...args)=>deps.deliverToBag(...args);
    const gainItem=(...args)=>deps.gainItem(...args);
    const collectDailyReport=(...args)=>deps.collectDailyReport(...args);
    const raidDay=(...args)=>deps.raidDay(...args);
    const storyDay=(...args)=>deps.storyDay(...args);
    const triggerStory=(...args)=>deps.triggerStory(...args);
    const snapshot=(...args)=>deps.snapshot(...args);
    const save=(...args)=>deps.save(...args);
    const die=(...args)=>deps.die(...args);
    const maxStam=(...args)=>deps.maxStam(...args);
    const chainTier=(...args)=>deps.chainTier(...args);
    const nightRaid=(...args)=>deps.nightRaid(...args);
    const diary=(...args)=>deps.diary(...args);
    const hasRelic=(...args)=>deps.hasRelic(...args);
    const hpMax=(...args)=>deps.hpMax(...args);
    const sleepQuality=(...args)=>deps.sleepQuality(...args);
function healthValue() {return Math.max(0,Math.min(100,Number(gameState.run.stats.health ?? 100)));}

function applyHarm(amount) {amount=Math.max(0,Number(amount)||0);gameState.run.stats.hp-=amount;if(amount)gameState.run.stats.health=Math.max(0,healthValue()-1);}

function healthTick() {
    if(gameState.run.death || gameState.run.ending)return false;
    const bad=gameState.run.statuses.poison>0 || gameState.run.statuses.bleed>0 || gameState.run.statuses.fear>0 || (gameState.run.statuses.nauseaUntil||0)>(gameState.run.tick||0);
    if(bad)gameState.run.stats.health=Math.max(0,healthValue()-1);
    gameState.run.healthNeglect=healthValue()<40?(gameState.run.healthNeglect||0)+1:0;
    if(!gameState.run.statuses.infection && gameState.run.healthNeglect>=6 && chance(.08)){gameState.run.statuses.infection=1;gameState.run.infectionHours=0;log('伤势久未处理，伤口出现感染。请使用草药膏治疗感染。','danger');}
    if(gameState.run.statuses.infection){gameState.run.infectionHours=(gameState.run.infectionHours||0)+1;applyHarm(gameState.run.statuses.infection>=2?4:2);if(gameState.run.infectionHours>=24 && gameState.run.infectionHours%6===0 && gameState.run.statuses.infection===1 && chance(.15)){gameState.run.statuses.infection=2;log('感染恶化了！尽快处理伤口。','danger');}if(gameState.run.stats.hp<=0){die('感染耗尽了你的生命。');return true;}}
    return false;
  }

function restoreHealth(it) {if(!it.healthRestore)return;gameState.run.stats.health=Math.min(100,healthValue()+it.healthRestore);if(it.cureInfection){gameState.run.statuses.infection=0;gameState.run.infectionHours=0;gameState.run.healthNeglect=0;}log(`健康+${it.healthRestore}${it.cureInfection?'，感染已处理':''}。`,'good');}

function debuffTick() {
    if(healthTick())return true;
    if (gameState.run.statuses.poison > 0) { gameState.run.statuses.poison--; applyHarm(3); log('毒性发作（-3 生命）', 'danger'); if (gameState.run.stats.hp <= 0) { die('毒素流遍了全身……'); return true; } }
    if (gameState.run.statuses.bleed > 0) { gameState.run.statuses.bleed--; applyHarm(5); log('伤口还在渗血（-5 生命）', 'danger'); if (gameState.run.stats.hp <= 0) { die('你因失血过多而死。'); return true; } }
    return false;
  }

function setHostSuspended(on){deps.session.setPaused('host',on);}

function hostSuspended(){return deps.session.isPaused('host');}

function setTimeFreeze(on){deps.session.setPaused('panel',on);}

function timeFrozen(){return deps.session.isPaused('panel');}

function lanternActive(scene = gameState.run && gameState.run.scene) {
    return !!gameState.run && scene !== 'sea' && scene !== 'atlantis' && (gameState.run.toolkit || []).includes('lantern') && hasItem('lantern');
  }

function lanternRiskMul(scene) { return lanternActive(scene) ? 0.5 : 1; }

function wearLantern(minutes) {
    if (!lanternActive() || !(minutes > 0)) return;
    const saved = Number(gameState.run.lanternWearMinutes);
    let elapsed = (Number.isFinite(saved) && saved >= 0 ? saved % 60 : 0) + minutes;
    while (elapsed >= 60 && lanternActive()) { elapsed -= 60; drainById('lantern'); }
    gameState.run.lanternWearMinutes = elapsed % 60;
  }

function addMin(m) {
    // 冻结期间不推进任何时间（连 tick 都不加，免得晾晒/保鲜的计时被偷偷推进）
    if (timeFrozen()) return false;
    if (hostSuspended()) return false;
    const startTick = gameState.run.tick || 0;
    wearLantern(m);
    gameState.run.tick = startTick + m;
    const startHour = Math.floor(gameState.run.minute / 60);
    const firstHourAfter = 60 - (gameState.run.minute % 60);
    gameState.run.minute += m;
    let crossed = 0;
    while (gameState.run.minute >= 1440) { gameState.run.minute -= 1440; gameState.run.day++; crossed++; }
    const endHour = Math.floor(gameState.run.minute / 60);
    const hoursPassed = crossed * 24 + (endHour - startHour);
    for (let i = 0; i < hoursPassed; i++) HOUR_EFFECTS(startTick + firstHourAfter + i * 60);
    // 亚特兰蒂斯：潜水服/氧气罩耐久消耗（礁石栖息地减半）
    if (gameState.run.scene === 'atlantis' && hoursPassed > 0) {
      const step = (gameState.run.zone === 'habitat') ? 2 : 1;
      gameState.run._diveAcc = (gameState.run._diveAcc || 0) + hoursPassed;
      while (gameState.run._diveAcc >= step) {
        gameState.run._diveAcc -= step;
        if (['diveSuit','diveSuit2'].includes(gameState.run.equipment.cloth)) drainById(gameState.run.equipment.cloth);
        if (!hasRelic('atlantisSeed') && ((gameState.run.toolkit || []).includes('diveMask') || hasItem('diveMask'))) drainById('diveMask');
      }
      // ⛔ 以前这里**只查氧气罩，不查潜水服** —— 于是玩家在海底把潜水服脱掉，唯一的后果只是"不再掉耐久"，
      //    照样自由行动。现在补上水压伤害（作者 2026-09-22 反馈）。礁石栖息地是安全点，不判。
      const hasSuit = ['diveSuit','diveSuit2'].includes(gameState.run.equipment.cloth);
      const hasO2 = (gameState.run.toolkit || []).includes('diveMask') || hasItem('diveMask') || hasRelic('atlantisSeed');
      if (gameState.run.zone !== 'habitat') {
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
        if (!hasSuit || !hasO2) { if (gameState.run.stats.hp <= 0) gameState.run.stats.hp = 0; }
      }
      if (gameState.run.dur && gameState.run.dur.diveMask !== undefined && gameState.run.dur.diveMask > 0 && gameState.run.dur.diveMask < 10 && !gameState.run._o2warn) { gameState.run._o2warn = 1; log('氧气罩耐久不足 10，尽快回礁石栖息地修补！', 'danger'); }
    }
    if (gameState.run.buffs) { for (const k in gameState.run.buffs) if ((gameState.run.buffs[k].until||0) <= (gameState.run.tick||0)) delete gameState.run.buffs[k]; }
    if (crossed > 0) newDay();
    change();
  }

function seasonOnDay(day) {
    const d = ((day - 1) % 60) + 1;
    return SEASONS.find(s => d >= s.days[0] && d <= s.days[1]) || SEASONS[0];
  }

function seasonInfo() { return seasonOnDay(gameState.run.day); }

function winterJustStarted() { return seasonInfo().name === '冬' && seasonOnDay(gameState.run.day - 1).name !== '冬'; }

function isNight() { return gameState.run.minute >= 22*60 || gameState.run.minute < 6*60; }

function isDusk() { return gameState.run.minute >= 18*60 && gameState.run.minute < 22*60; }

function rollWeather() {
    const s = seasonInfo();
    const pool = ['sun','sun','sun','cloud','rain','fog'];   // 晴天概率提高（原来 2/5，现在 3/6）
    if (s.name === '冬') pool.push('snow','snow');
    if (s.name === '夏' && chance(0.15)) { gameState.run.weather = 'storm'; }
    else gameState.run.weather = pick(pool);
    if (chance(0.06)) gameState.run.weather = 'storm';
    log(`今天是${seasonInfo().name}季，天气：${WEATHER[gameState.run.weather].name}。`, 'sys');
  }

function newDay() {
    gameState.run.pointUses = {};
    rollWeather();
    // 作物生长：雨天（含暴雨）田里等于浇了水，长得快一天
    const rainGrow = (gameState.run.weather === 'rain' || gameState.run.weather === 'storm') ? 1 : 0;
    gameState.run.crops.forEach(c => { c.remain -= (1 + rainGrow); });
    if (rainGrow && gameState.run.crops.length) log('雨下了一夜，田里的作物喝饱了水——长得比平时快。', 'good');
    // 家具的每日产出（家具表里写了 dailyItems 的才会触发）
    const f = gameState.run.furniture;
    for (const fur of FURNITURE) {
      if (!fur.dailyItems || !f[fur.id]) continue;
      for (const id in fur.dailyItems) {
        const n = fur.dailyItems[id] || 1;
        if (deliverToBag(id, n)) log(`${fur.name}有产出：${ITEMS[id].name}×${n}。`, 'good');
      }
    }
    if (f.beehive) {
      const before = Math.max(0, Math.min(12, Math.floor(Number(gameState.run.hiveHoney) || 0)));
      gameState.run.hiveHoney = Math.min(12, before + 1);
      log(gameState.run.hiveHoney > before ? `蜂箱新酿出蜂蜜，已储存 ${gameState.run.hiveHoney}/12 份。` : '蜂箱已满（12/12），记得收蜜。', gameState.run.hiveHoney > before ? 'good' : 'sys');
    }
    // 牧场：鸡舍 / 羊圈（喂食 → 产出 → 成长 → 寿终）+ 草地陷阱 → 一起汇总成"每日晨报"
    collectDailyReport();
    if (f.rainfilter && (gameState.run.weather === 'rain' || gameState.run.weather === 'storm')) {
      const before = Math.max(0, Math.min(20, Number(gameState.run.rainWater) || 0));
      const w = Math.min(rnd(2, 4), 20 - before);
      gameState.run.rainWater = before + w;
      log(w ? `滤雨器储存了 ${w} 份淡水（现有 ${gameState.run.rainWater}/20），可在营地点击取水。` : '滤雨器已满（20/20），请到营地取水。', w ? 'good' : 'sys');
    }
    // 老潮到访判定
    if (gameState.run.day >= gameState.run.laochao.nextVisit && (gameState.run.day >= 5 || gameState.run.flags.flagSignal)) {
      if (gameState.run.weather !== 'storm' && gameState.run.weather !== 'rain') {
        gameState.run.laochao.arrived = true; gameState.run.laochao.arrivedDay = gameState.run.day; gameState.run.flags.flagSignal = 0;
        log('海面上出现一面帆——老潮的商船靠岸了！今天 6~22 点可以在营地交易。', 'good');
      } else {
        gameState.run.laochao.nextVisit = gameState.run.day + 2;
        log('天气太差，商船没有出现。', 'warn');
      }
    }
    if (gameState.run.laochao.arrived && gameState.run.laochao.arrivedDay !== gameState.run.day) gameState.run.laochao.arrived = false;
    // 陷阱已并入"每日晨报"：每天清晨结算（collectDailyReport），弹窗里领取（claimDailyTrap）
    // 剧情事件
    STORY_EVENTS.forEach(ev => {
      if (storyDay(ev) === gameState.run.day) {
        if (ev.once && gameState.run.flags['story_'+ev.id]) return;
        gameState.run.flags['story_'+ev.id] = 1;
        log(`【剧情】第${gameState.run.day}天，一段往事浮上心头……`, 'sys');
        triggerStory(ev);
      }
    });
    // （已移除寿命/老死设定——本作没有寿命上限）
    // 灵灰：每天必说一句话；另有 20% 概率带一份基础资源回来（数量克制，只在这一天发一次）
    if (gameState.run.identity === 'linghui') {
      log(LINGHUI_LINES[Math.floor(Math.random()*LINGHUI_LINES.length)], 'blue');
      if (chance(0.2)) {
        const pool = [['wood',2],['stone',2],['thatch',3],['berry',2],['wildveg',2]];
        const g = pool[Math.floor(Math.random()*pool.length)];
        if (gainItem(g[0], g[1])) log(`灵灰不知从哪抱来的，递给你：${ITEMS[g[0]].name}×${g[1]}。`, 'good');
      }
    }
    // 保存"昨日日出"快照（困难难度回退用）
    if (gameState.run._snap && gameState.run._snap.day) gameState.run._snap.prevday = JSON.parse(JSON.stringify(gameState.run._snap.day));
    snapshot('day');
    save();
    // 每日晨报：牧场消耗/产量 + 陷阱情况。
    // ⚠️ 只在"确实有内容"时才弹：没养牲畜、没饲料缺口、没陷阱就不打扰玩家。
    // ⚠️ 跳过第 1 天（刚开局没必要弹）；读档不会走到这里（读档不调 newDay）
    if (gameState.run.day > 1 && gameState.run.dailyReport && deps.onOverlay) {
      const rep = gameState.run.dailyReport;
      const r = rep.ranch;
      const ranchHasNews = !!(r && (r.hayUsed || r.wool || r.wheatUsed || r.egg || r.grown || r.meat || r.lackHay || r.lackWheat));
      const tp = rep.trap;
      const trapHasNews = !!(tp && (tp.caught || tp.waiting));
      if (ranchHasNews || trapHasNews) deps.onOverlay({ kind:'daily', title:`第 ${gameState.run.day} 天 · 晨报` });
    }
    if (((gameState.run.day - 1) % 60) + 1 === 43) log('三天后入冬：河畔取水点会结冰。提前储水；冬季可每天采雪3次，在营地篝火用积雪×2、木材×1烧成淡水×1。', 'warn');
    // 冬季来临（作者 2026-09-25）："冬天来的时候弹个窗，提示资源有限、很难熬。注意不要和其他弹窗冲突。"
    //   ① 只在**冬天第一天**弹（winterJustStarted），每轮冬天各弹一次：flags.winterWarned 记的是"哪一天弹过"。
    //   ② 不抢屏幕：走 kind:'winter'，ui.js 会给它**排队** —— 当时要是正开着别的弹窗
    //      （最典型的就是上面刚推出去的「晨报」），就先揣着，等那个弹窗关掉再弹。
    if (gameState.run.day > 1 && deps.onOverlay && winterJustStarted() && gameState.run.flags.winterWarned !== gameState.run.day) {
      gameState.run.flags.winterWarned = gameState.run.day;
      deps.onOverlay({ kind:'winter' });
    }
  }

function sleepMath(mode) {
    const nap = mode === 'nap';
    const bed = ['bed1','bed2','bed3','bed4'].filter(b => gameState.run.furniture[b]).pop();
    const bf = bed ? FURNITURE.find(x => x.id === bed) : { spirit:5 };
    // 床提升体力与精神恢复；安稳睡眠仍统一8小时。
    // 没床：翻来覆去，恢复也最差（玩家反馈"草床空占位置"——以前这两个字段根本没被用上）
    const bedRest = bed ? (bf.rest || 0.7) : 0.4;
    const sleepH = nap ? 2 : (bed ? (bf.sleepH || 8) : 8);   // 安稳睡觉统一 8 小时（没床也一样），小睡 2 小时
    const houseRest = chainTier('house', gameState.run.buildings.house).rest;
    const hungerBefore = gameState.run.stats.hunger, thirstBefore = gameState.run.stats.thirst;
    // 本次睡眠里落在 0点~6点 的小时数（0点后睡得差）
    const startHour = Math.floor(gameState.run.minute / 60);
    let afterMid = 0;
    for (let i = 0; i < sleepH; i++) { const hh = (startHour + i) % 24; if (hh < 6) afterMid++; }
    const sq = sleepQuality(mode);
    const penMul = nap ? 0.35 : 1;   // 小睡只吃整觉的 35%，但仍弱于整觉
    const staGain = nap ? Math.round(25 * sq) : Math.round(maxStam() * (0.45 + houseRest * 0.12 + bedRest * 0.32) * sq);
    // 血量：基础(小睡7/整觉30) 乘时段质量，再按饿/渴/精神惩罚
    const hungPen = hungerBefore < 20 ? 3 * (100 - hungerBefore) / 10 : 1.5 * (100 - hungerBefore) / 10;
    const thirsPen = thirstBefore < 20 ? 3 * (100 - thirstBefore) / 10 : 1.5 * (100 - thirstBefore) / 10;
    const spiritPen = 2 * Math.floor((100 - gameState.run.stats.spirit) / 10);
    let hpRec = Math.round((nap ? 7 : 30) * sq) - Math.round(hungPen * penMul) - Math.round(thirsPen * penMul) - Math.round(spiritPen * penMul);
    if (nap) hpRec = Math.max(0, hpRec);   // 午觉最差只是没恢复，不会倒扣生命
    // 中毒/流血在睡眠期间照常发作（作者 2026-09-25）：
    // 一次睡眠最多发作 sleepH 次，每次照样扣 3（毒）/ 5（血）——毒性/流血层数一般只有 2~3，
    // 所以这一觉最多再掉十来点生命。纯计算，不改状态，sleep() 和面板共用同一份数字。
    const poisonTicks = Math.min(gameState.run.statuses.poison || 0, sleepH);
    const bleedTicks = Math.min(gameState.run.statuses.bleed || 0, sleepH);
    const debuffHp = poisonTicks * 3 + bleedTicks * 5 + (gameState.run.statuses.infection?(gameState.run.statuses.infection>=2?4:2)*sleepH:0);
    return { nap, sleepH, sq, staGain, hpRec, afterMid, hungerBefore, thirstBefore,
             drain: nap ? 5 : 20, spiritGain: nap ? 1 : (bf.spirit || 5), bed: !!bed,
             poisonTicks, bleedTicks, debuffHp };
  }

function sleepForecast(mode) {
    if (!gameState.run || gameState.run.scene !== 'camp') return null;
    if (mode === 'watch') return { watch:true };
    const m = sleepMath(mode);
    const endMin = (gameState.run.minute + m.sleepH * 60) % 1440;
    const hh = Math.floor(endMin / 60), mm = endMin % 60;
    return {
      hours:m.sleepH, sta:Math.max(0, Math.min(maxStam(), gameState.run.stats.stamina + m.staGain) - gameState.run.stats.stamina), hp:m.hpRec, sp:m.spiritGain,
      // hpAfter 里要**扣掉睡眠期间的中毒/流血**，否则面板写的"醒来还剩多少血"是骗人的
      hpNow:Math.round(gameState.run.stats.hp), hpAfter:Math.max(0, Math.min(hpMax(), gameState.run.stats.hp + m.hpRec - m.debuffHp)),
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
    if (gameState.run.scene !== 'camp') { log('只能在营地睡觉。', 'warn'); return; }
    if (mode === 'watch') {
      // 守夜
      gameState.run.stats.stamina = Math.min(maxStam(), gameState.run.stats.stamina + 50);
      gameState.run.stats.spirit = Math.max(0, gameState.run.stats.spirit - 15);
      log('你抱着武器在篝火旁守了一夜。营地安然无恙。（体力+50，精神-15）');
      addMin(8 * 60);
      return;
    }
    const M = sleepMath(mode);
    const { nap, sleepH, staGain, hpRec, afterMid } = M;
    gameState.run.tick = (gameState.run.tick || 0) + sleepH * 60;
    const staminaBefore = gameState.run.stats.stamina;
    gameState.run.stats.stamina = Math.min(maxStam(), gameState.run.stats.stamina + staGain);
    if(hpRec<0)applyHarm(-hpRec);else gameState.run.stats.hp = Math.min(hpMax(), gameState.run.stats.hp + hpRec);
    if (gameState.run.stats.hp <= 0) { log('你在睡梦中停止了呼吸……', 'danger'); die('你在睡梦中再也没能醒来。'); return; }
    gameState.run.stats.spirit = Math.min(100, gameState.run.stats.spirit + M.spiritGain);   // 精神恢复整体下调：主要靠整觉，且很有限
    // 睡觉期间消耗（与醒着一致；小睡 2 小时只扣 5 点）
    if (gameState.run.difficulty !== 'dev') { gameState.run.stats.hunger = Math.max(0, M.hungerBefore - M.drain); gameState.run.stats.thirst = Math.max(0, M.thirstBefore - M.drain); }
    log(`你${nap ? '小睡' : '睡了'} ${sleepH} 小时。（体力+${Math.max(0, gameState.run.stats.stamina - staminaBefore)}，生命${hpRec >= 0 ? '+' : ''}${hpRec}）`, hpRec < 0 ? 'warn' : 'good');
    // 中毒 / 流血**睡一觉不会自己好**：整觉按小时照常发作（作者 2026-09-25）。
    // 放在回血与总结日志之后：先报"这一觉恢复了多少"，再逐小时报毒/血扣了多少；
    // 毒/血层数最多 2~3，所以最多几行，不会刷屏。debuffTick() 返回 true = 已经死了。
    for (let i = 0; i < sleepH; i++) { if (debuffTick()) return; }
    gameState.run.statuses.bleed = 0;
    gameState.run.statuses.fear = 0;
    diary();
    // 醒来 = 入睡时间 + 8 小时（跨午夜则进入新的一天）
    const min0 = gameState.run.minute;
    gameState.run.minute = min0 + sleepH * 60;
    let dayUp = Math.floor(gameState.run.minute / 1440);
    gameState.run.minute %= 1440;
    gameState.run.day += dayUp;
    snapshot('sleep');
    // 剧情夜袭（第 7 天狼群）
    if (gameState.run.flags.wolfRaidPending) { gameState.run.flags.wolfRaidPending = 0; nightRaid(true); }
    // 随机夜袭判定：只在"首次（剧情）夜袭"之后才可能发生；老存档用天数兜底，避免永远不再触发
    if (afterMid > 0 && (gameState.run.flags.firstRaidDone || gameState.run.day > raidDay()) && chance(chainTier('wall', gameState.run.buildings.wall).raid)) nightRaid(false);
    if (dayUp > 0) {
      for (let i = 0; i < dayUp; i++) newDay();
      log(`—— 第 ${gameState.run.day} 天，${seasonInfo().name}季 ——`, 'sys');
      log('黎明。你醒了过来。', 'sys');
    } else {
      log('你睡了一觉，醒来时天还亮着。', 'sys');
    }
    if (gameState.run.laochao.arrived) log('老潮的船还停在岸边，22 点前可以交易。', 'good');
    change();
  }

function rest(hours) {
    const h = Math.max(1, Math.min(3, Math.round(hours || 1)));
    if (gameState.run.stats.stamina >= maxStam()) { log('体力充沛，不需要休息。', 'warn'); return; }
    // ⚠️ 顺序要紧（玩家反馈"21:55 休息到 23:55，体力消失了"）：
    //    以前是【先走时间、再加体力】。如果这段时间跨过午夜，addMin() 里的 newDay() 会顺手 save()，
    //    存进去的是**加体力之前**的状态；而 rest() 自己从来不 save() → 之后一旦读档/切后台回来，
    //    这 +体力 就没了（看着就像"休息白休了"）。
    //    现在和 sleep() 一致：先把恢复结算进 S，再推进时间（这样跨天那次 save 一定带上它），末尾再补一次 save。
    gameState.run.stats.stamina = Math.min(maxStam(), gameState.run.stats.stamina + 10 * h);
    addMin(60 * h);
    log(`你坐下歇了一会儿（${h} 小时，体力+${10 * h}）。`);
    save();
    change();
  }
    return Object.freeze({healthValue,applyHarm,healthTick,restoreHealth,debuffTick,setHostSuspended,hostSuspended,setTimeFreeze,timeFrozen,lanternActive,lanternRiskMul,wearLantern,addMin,seasonOnDay,seasonInfo,winterJustStarted,isNight,isDusk,rollWeather,newDay,sleepMath,sleepForecast,sleep,rest});
  }
  return Object.freeze({create});
})();
