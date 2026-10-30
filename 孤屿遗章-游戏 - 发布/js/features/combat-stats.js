/* combat-stats：业务规则的唯一实现；Game 保留调用接口与装配。 */
const CombatStats = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const chance=(...args)=>deps.chance(...args);
    const log=(...args)=>deps.log(...args);
    const invCount=(...args)=>deps.invCount(...args);
    const removeItem=(...args)=>deps.removeItem(...args);
    const meleeWeaponNow=(...args)=>deps.meleeWeaponNow(...args);
    const drainEquipSlot=(...args)=>deps.drainEquipSlot(...args);
    const healthValue=(...args)=>deps.healthValue(...args);
    const seasonOnDay=(...args)=>deps.seasonOnDay(...args);
    const sharpenAm=(...args)=>deps.sharpenAm(...args);
    const nodeLv=(...args)=>deps.nodeLv(...args);
    const cxAtk=(...args)=>deps.cxAtk(...args);
    const cxDef=(...args)=>deps.cxDef(...args);
    const swiftBonus=(...args)=>deps.swiftBonus(...args);
    const gunNodeLv=(...args)=>deps.gunNodeLv(...args);
    const ammoSaveChance=(...args)=>deps.ammoSaveChance(...args);
    const bedStamBonus=(...args)=>deps.bedStamBonus(...args);
    const trainingAtk=(...args)=>deps.trainingAtk(...args);
    const nightmareInfusionBonus=(...args)=>deps.nightmareInfusionBonus(...args);
    const metaBonus=(...args)=>deps.metaBonus(...args);
    const hpMax=(...args)=>deps.hpMax(...args);
function meleeWeapons() {
    const arr = [];
    const w = gameState.run.equipment.weapon ? ITEMS[gameState.run.equipment.weapon] : null;
    const w2 = gameState.run.equipment.weapon2 ? ITEMS[gameState.run.equipment.weapon2] : null;
    if (w && !w.ranged) arr.push(w);
    if (w2 && !w2.ranged && w2.cat !== 'shield') arr.push(w2);
    return arr;
  }

function buffV(stat) { if (!gameState.run.buffs || !gameState.run.buffs[stat]) return 0; if ((gameState.run.buffs[stat].until || 0) <= (gameState.run.tick || 0)) return 0; return gameState.run.buffs[stat].v || 0; }

function accessoryStat(key) {
    return (gameState.run.equipment.accessory && ITEMS[gameState.run.equipment.accessory] && ITEMS[gameState.run.equipment.accessory][key]) || 0;
  }

function weaponBonus(id) {
    return (gameState.run.weaponNames && gameState.run.weaponNames[id] && gameState.run.weaponNames[id].bonus) || 0;
  }

function itemKeyOf(it) {
    if (!it) return null;
    for (const slot of ['weapon', 'weapon2']) {
      if (gameState.run.equipment[slot] && ITEMS[gameState.run.equipment[slot]] === it) return gameState.run.equipment[slot];
    }
    return it.id || null;
  }

function activeBuffs() {
    return Object.keys((gameState.run && gameState.run.buffs) || {}).filter(k => buffV(k) !== 0).map(k => ({
      stat:k, name:deps.BUFF_NAMES[k] || '强化', value:buffV(k), minutes:Math.max(0, Math.ceil(gameState.run.buffs[k].until - (gameState.run.tick || 0))),
    }));
  }

function playerAtk() {
    const ax = accessoryStat('atk');
    const cur = meleeWeaponNow();
    const wAtk = cur ? (cur.atk || 0) : 0;
    const wNames = (cur && weaponBonus(itemKeyOf(cur))) || 0;
    let base = 5 + wAtk + wNames + ax + sharpenAm() + cxAtk() + trainingAtk() + buffV('atk');
    return Math.round(base * (1 + metaBonus().atk)) + nightmareInfusionBonus().atk;
  }

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
    return { a, b, c, def: playerDef(), spd: Math.round(combatSpeed()), block: Math.round(shieldBlock() * 100), health:healthValue(), hp: gameState.run.stats.hp, maxhp: hpMax(), stam: gameState.run.stats.stamina, maxstam: maxStam(), armor: gameState.run.equipment.armor ? ITEMS[gameState.run.equipment.armor].name : '无', cloth: gameState.run.equipment.cloth ? ITEMS[gameState.run.equipment.cloth].name : '无', tank: !!gameState.run.furniture.tank };
  }

function spiritStamMul() {
    const sp = (gameState.run && gameState.run.stats && gameState.run.stats.spirit !== undefined) ? gameState.run.stats.spirit : 100;
    return sp >= 50 ? 1 : (sp >= 20 ? 0.9 : 0.8);
  }

function maxStam() { return Math.round((150 + (DIFFICULTIES[gameState.run.difficulty].stamina || 0) + metaBonus().stamina + bedStamBonus() + 3 * ((gameState.run.permUsed && gameState.run.permUsed.abyssBreathPill) || 0)) * spiritStamMul()); }

function playerDef() { const a = gameState.run.equipment.armor ? ITEMS[gameState.run.equipment.armor] : null; const ax = accessoryStat('def'); const w2 = gameState.run.equipment.weapon2 ? ITEMS[gameState.run.equipment.weapon2] : null; const sh = w2 && w2.cat === 'shield' ? w2 : null; return 2 + (a ? a.def : 0) + ax + (sh ? sh.def : 0) + buffV('def') + cxDef() + nightmareInfusionBonus().def; }

function shieldBlock() { const w2 = gameState.run.equipment.weapon2 ? ITEMS[gameState.run.equipment.weapon2] : null; return w2 && w2.cat === 'shield' ? (w2.block || 0) : 0; }

function rangedRangeOf(it) { if (!it) return 0; return it.ammoItem ? deps.RANGE_GUN : deps.RANGE_BOW; }

function enemyRange(e) {
    if (!e) return deps.RANGE_MELEE;
    if (typeof e.range === 'number') return e.range;
    return (e.traits || []).includes('gun') ? deps.RANGE_GUN : deps.RANGE_MELEE;
  }

function myAttackRange() {
    const rw = rangedWeapon();
    if (rw) {
      const ammoOk = rw.ammoItem ? invCount(rw.ammoItem) > 0 : (invCount('eagleArrow') > 0 || invCount('arrow') > 0);
      if (ammoOk) return rangedRangeOf(rw);
    }
    return deps.RANGE_MELEE;
  }

function myMoveSpeed() { return Math.max(1, Math.round(combatSpeed(false))); }

const ENEMY_COVER_REDUCE = 0.30;

function hasTwoHand() { return !!(gameState.run.equipment.weapon && ITEMS[gameState.run.equipment.weapon] && ITEMS[gameState.run.equipment.weapon].twoHand); }

function sweepInfo() {
    const C = gameState.run && gameState.run.combat;
    if (!C) return { usable:false, reason:'不在战斗中' };
    if (!hasTwoHand()) return { usable:false, reason:'需要双手重武器' };
    if (C.sweepCd > 0) return { usable:false, reason:`还需 ${Math.ceil(C.sweepCd)} 秒` };
    const alive = C.enemies.filter(e => e.ehp > 0).length;
    return { usable:true, alive, reason:'' };
  }

function heavyNodeLv() { return nodeLv('combat', 'f_heavy'); }

function sureNodeLv() { return nodeLv('combat', 'f_sure'); }

function hasHeavy() { return heavyNodeLv() > 0; }

function hasSure() { return sureNodeLv() > 0; }

function heavyInfo() {
    const C = gameState.run && gameState.run.combat;
    if (!hasHeavy()) return { usable:false, reason:'未学「重击」' };
    if (!meleeWeapons().length) return { usable:false, reason:'需要近战武器' };
    if (!C) return { usable:false, reason:'不在战斗中' };
    if ((C.heavyCd || 0) > 0) return { usable:false, reason:`还需 ${Math.ceil(C.heavyCd)} 秒` };
    return { usable:true, reason:'' };
  }

function sureInfo() {
    const C = gameState.run && gameState.run.combat;
    if (!hasSure()) return { usable:false, reason:'未学「必中」' };
    if (!meleeWeapons().length) return { usable:false, reason:'需要近战武器' };
    if (!C) return { usable:false, reason:'不在战斗中' };
    if ((C.sureCd || 0) > 0) return { usable:false, reason:`还需 ${Math.ceil(C.sureCd)} 秒` };
    return { usable:true, reason:'' };
  }

function enemyMultiActing(C) {
    if (!C || !C.enemies) return false;
    return C.enemies.filter(e => e.ehp > 0).length >= 2;
  }

function coverReduceOf(C, e) { const al = C.enemies.filter(x => x.ehp > 0 && x.cover > 0); return al.length ? ENEMY_COVER_REDUCE : 0; }

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

const DUAL_MUL = 1.5, DUAL_MUL_DAGGER = 1.4;

function combatSpeed(forRanged) {
    const w = gameState.run.equipment.weapon ? ITEMS[gameState.run.equipment.weapon] : null;
    const w2 = gameState.run.equipment.weapon2 ? ITEMS[gameState.run.equipment.weapon2] : null;
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

function chainTier(chainId, lv) {
    const chain = BUILDING_CHAINS[chainId] || [];
    if (Number(lv) < 0) return { warm:0, rest:0, slots:0, def:0, raid:0.15, cook:0, cap:20 };
    const i = Math.max(0, Math.min(chain.length - 1, Number(lv) || 0));
    return chain[i] || { warm:0, rest:0, slots:1, def:0, raid:0.15, cook:0, cap:20 };
  }

function warmth() {
    const c = gameState.run.equipment.cloth ? ITEMS[gameState.run.equipment.cloth] : null;
    return c ? (c.warm || 0) : 0;
  }

function weatherTemperature(atTick = gameState.run.tick || 0) {
    const elapsed = Math.max(0, (gameState.run.tick || 0) - atTick);
    const absolute = Math.max(0, (gameState.run.day - 1) * 1440 + gameState.run.minute - elapsed);
    const day = Math.floor(absolute / 1440) + 1;
    const hour = Math.floor((absolute % 1440) / 60);
    const season = seasonOnDay(day).name;
    const seasonal = { 春:18, 夏:30, 秋:19, 冬:5 }[season] || 18;
    const weather = { sun:2, cloud:0, rain:-3, fog:-2, storm:-5, snow:-4 }[gameState.run.weather] || 0;
    const daylight = Math.round(4 * Math.cos((hour - 14) * Math.PI / 12));
    const daily = (day * 11 % 5) - 2;
    const hourly = ((day * 7 + hour * 13) % 3) - 1;
    return seasonal + weather + daylight + daily + hourly;
  }

function environmentTemperature(scene = gameState.run.scene, zone = gameState.run.zone, atTick = gameState.run.tick || 0) {
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

function temperatureInfo(scene = gameState.run.scene, zone = gameState.run.zone, atTick = gameState.run.tick || 0) {
    const weather = weatherTemperature(atTick);
    const ambient = environmentTemperature(scene, zone, atTick);
    const cloth = warmth();
    // 36.6℃ 是未穿衣时的基准体温；环境传热、衣物和住所改变的是体温，不是室外气温。
    let shelter = scene === 'camp' ? (ambient < 20 ? Math.min(2, chainTier('house', gameState.run.buildings.house).warm) * 0.42 : (gameState.run.buildings.house > 0 ? -0.25 : 0)) : 0;
    let fire = scene === 'camp' && ambient < 20 ? Math.min(2, chainTier('fire', gameState.run.buildings.fire).warm) * 0.42 : 0;
    const active = gameState.run.tempActiveUntil > atTick ? 0.12 : 0;
    const suit = scene === 'atlantis' ? gameState.run.equipment.cloth : null;
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
      grace: Math.max(0, Math.ceil((gameState.run.tempGraceUntil || 0) - atTick)) };
  }

function temperatureEntered(previous) {
    const next = temperatureInfo();
    if (next.state !== 'normal' && (next.state !== previous.state || next.ambient !== previous.ambient)) {
      gameState.run.tempGraceUntil = (gameState.run.tick || 0) + 30;
      log(`${next.state === 'cold' ? '寒意' : '热浪'}袭来：环境 ${next.environment}℃、体温 ${next.body.toFixed(1)}℃；有 30 分钟换衣缓冲。`, 'warn');
    }
  }

function rangedWeapon() {
    const w = gameState.run.equipment.weapon ? ITEMS[gameState.run.equipment.weapon] : null;
    const w2 = gameState.run.equipment.weapon2 ? ITEMS[gameState.run.equipment.weapon2] : null;
    return (w && w.ranged) ? w : ((w2 && w2.ranged) ? w2 : null);
  }

function hasRanged() {
    const rw = rangedWeapon();
    if (!rw) return null;
    if (rw.ammoItem) return invCount(rw.ammoItem) > 0 ? 0 : null;   // 手枪：源能子弹
    if (invCount('eagleArrow') > 0) return 8;
    if (invCount('arrow') > 0) return 0;
    return null;
  }

function rangedKind(w) {
    if (!w) return null;
    if (w.ammoItem) return 'gun';
    return w.ranged ? 'bow' : 'other';
  }

function pistolCalib() { return !!(gameState.run && gameState.run.pistolCalibrated); }

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

function equippedRangedSlot() {
    const w = gameState.run.equipment.weapon, w2 = gameState.run.equipment.weapon2;
    if (w && ITEMS[w] && ITEMS[w].ranged) return 'weapon';
    if (w2 && ITEMS[w2] && ITEMS[w2].ranged) return 'weapon2';
    return null;
  }
    return Object.freeze({meleeWeapons,buffV,accessoryStat,weaponBonus,itemKeyOf,activeBuffs,playerAtk,playerAtkAvg,rangedAtk,charStats,spiritStamMul,maxStam,playerDef,shieldBlock,rangedRangeOf,enemyRange,myAttackRange,myMoveSpeed,hasTwoHand,sweepInfo,heavyNodeLv,sureNodeLv,hasHeavy,hasSure,heavyInfo,sureInfo,enemyMultiActing,coverReduceOf,rollEnemyIntents,intentOf,combatSpeed,chainTier,warmth,weatherTemperature,environmentTemperature,temperatureInfo,temperatureEntered,rangedWeapon,hasRanged,rangedKind,pistolCalib,rangedAcc,ammoConsume,equippedRangedSlot});
  }
  return Object.freeze({create});
})();
