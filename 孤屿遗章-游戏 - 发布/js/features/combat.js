/* combat：业务规则的唯一实现；Game 保留调用接口与装配。 */
const CombatRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const rnd=(...args)=>deps.rnd(...args);
    const chance=(...args)=>deps.chance(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const qtyParse=(...args)=>deps.qtyParse(...args);
    const invCount=(...args)=>deps.invCount(...args);
    const hasItem=(...args)=>deps.hasItem(...args);
    const removeItem=(...args)=>deps.removeItem(...args);
    const weaponTurnSlot=(...args)=>deps.weaponTurnSlot(...args);
    const drainWeapon=(...args)=>deps.drainWeapon(...args);
    const drainEquipSlot=(...args)=>deps.drainEquipSlot(...args);
    const drainById=(...args)=>deps.drainById(...args);
    const applyHarm=(...args)=>deps.applyHarm(...args);
    const restoreHealth=(...args)=>deps.restoreHealth(...args);
    const gainItem=(...args)=>deps.gainItem(...args);
    const isNight=(...args)=>deps.isNight(...args);
    const raidWolves=(...args)=>deps.raidWolves(...args);
    const save=(...args)=>deps.save(...args);
    const die=(...args)=>deps.die(...args);
    const sceneOf=(...args)=>deps.sceneOf(...args);
    const arriveAt=(...args)=>deps.arriveAt(...args);
    const pointsOf=(...args)=>deps.pointsOf(...args);
    const doPoint=(...args)=>deps.doPoint(...args);
    const showOverlay=(...args)=>deps.showOverlay(...args);
    const meleeWeapons=(...args)=>deps.meleeWeapons(...args);
    const buffV=(...args)=>deps.buffV(...args);
    const playerAtk=(...args)=>deps.playerAtk(...args);
    const rangedAtk=(...args)=>deps.rangedAtk(...args);
    const maxStam=(...args)=>deps.maxStam(...args);
    const playerDef=(...args)=>deps.playerDef(...args);
    const shieldBlock=(...args)=>deps.shieldBlock(...args);
    const enemyRange=(...args)=>deps.enemyRange(...args);
    const myAttackRange=(...args)=>deps.myAttackRange(...args);
    const myMoveSpeed=(...args)=>deps.myMoveSpeed(...args);
    const sweepInfo=(...args)=>deps.sweepInfo(...args);
    const hasHeavy=(...args)=>deps.hasHeavy(...args);
    const hasSure=(...args)=>deps.hasSure(...args);
    const heavyInfo=(...args)=>deps.heavyInfo(...args);
    const sureInfo=(...args)=>deps.sureInfo(...args);
    const coverReduceOf=(...args)=>deps.coverReduceOf(...args);
    const rollEnemyIntents=(...args)=>deps.rollEnemyIntents(...args);
    const combatSpeed=(...args)=>deps.combatSpeed(...args);
    const wNameOf=(...args)=>deps.wNameOf(...args);
    const temperatureInfo=(...args)=>deps.temperatureInfo(...args);
    const rangedWeapon=(...args)=>deps.rangedWeapon(...args);
    const hasRanged=(...args)=>deps.hasRanged(...args);
    const rangedKind=(...args)=>deps.rangedKind(...args);
    const rangedAcc=(...args)=>deps.rangedAcc(...args);
    const ammoConsume=(...args)=>deps.ammoConsume(...args);
    const cxCrit=(...args)=>deps.cxCrit(...args);
    const critMul=(...args)=>deps.critMul(...args);
    const sweepCdTotal=(...args)=>deps.sweepCdTotal(...args);
    const sweepMul=(...args)=>deps.sweepMul(...args);
    const medHeal=(...args)=>deps.medHeal(...args);
    const vampRate=(...args)=>deps.vampRate(...args);
    const execThreshold=(...args)=>deps.execThreshold(...args);
    const revengeBonus=(...args)=>deps.revengeBonus(...args);
    const hasDualDagger=(...args)=>deps.hasDualDagger(...args);
    const wallBlockBonus=(...args)=>deps.wallBlockBonus(...args);
    const wallDurMul=(...args)=>deps.wallDurMul(...args);
    const rageAtkMul=(...args)=>deps.rageAtkMul(...args);
    const rageTakenMul=(...args)=>deps.rageTakenMul(...args);
    const ironTakenMul=(...args)=>deps.ironTakenMul(...args);
    const ironAtkMul=(...args)=>deps.ironAtkMul(...args);
    const awardExperience=(...args)=>deps.awardExperience(...args);
    const diaryAdd=(...args)=>deps.diaryAdd(...args);
    const nightmareInfusionBonus=(...args)=>deps.nightmareInfusionBonus(...args);
    const metaSave=(...args)=>deps.metaSave(...args);
    const metaState=(...args)=>deps.metaState(...args);
    const noteMissStreak=(...args)=>deps.noteMissStreak(...args);
    const metaBonus=(...args)=>deps.metaBonus(...args);
    const metaSettle=(...args)=>deps.metaSettle(...args);
    const hasRelic=(...args)=>deps.hasRelic(...args);
    const hpMax=(...args)=>deps.hpMax(...args);
const ATTACK_ACTS = ['attack', 'heavy', 'sure', 'sweep', 'ranged', 'throw'];

const ENEMY_HEAVY_MUL = 1.3;

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
    const diff = DIFFICULTIES[gameState.run.difficulty].enemyMul;
    const ehp = Math.round(enemy.hp * diff);
    const atk = Math.round(enemy.atk * diff);
    // 群袭（pack）：出现时 50% 概率同时来两只；标了 packAlways 的（触手哨兵）必来两只
    // 首次夜袭触发前，普通狼遭遇只来一匹；按实际夜袭标记判断，熬过预定日期也仍受保护。
    // 夜袭使用独立的 startRaidFight，不受此保护影响。
    const singleWolf = enemy.id === 'wolf' && !gameState.run.flags.firstRaidDone;
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
    const foeRange = C.enemies.reduce((m, e) => Math.max(m, enemyRange(e)), deps.RANGE_MELEE);
    C.dist = Math.max(myRange, foeRange);
    if (C.dist > 0) C.log.push(`你们相距约 ${C.dist} 步（你的射程 ${myRange} 步、对方 ${foeRange} 步——手长的先开火，手短的先往前压）。`);
    if (enemy.nightBuff && isNight()) {
      C.atk = Math.round(C.atk * 1.3);
      for (const e of C.enemies) e.atk = Math.round(e.atk * 1.3);
      C.log.push('黑暗让它更加强大。');
    }
    C.spdP = combatSpeed(); C.spdE = enemy.spd; C.spdBank = 0;
    gameState.run.combat = C;
    if (deps.onFight) deps.onFight('start', C);
    change();
  }

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
    const streak = gameState.run.combat ? (gameState.run.missStreak || 0) : 0;
    const pity = (r) => r + (1 - r) * (1 - Math.pow(0.7, streak));
    if (ranged) return Math.max(0.2, Math.min(1, pity(rangedAcc(rangedKind(rangedWeapon())) + (gameState.run.identity === 'hunter' ? 0.1 : 0) + buffV('accuracy') - thermalPenalty)));
    let rate = (gameState.run.statuses.fear ? 0.7 : 0.9) + (gameState.run.identity === 'hunter' ? 0.1 : 0) + buffV('accuracy') - thermalPenalty;
    // 武器自带命中加成（数值平衡 P2-2）：珊瑚刺刃 data 里写着 acc:0.1、描述也写"提高命中率"，
    // 但以前**从来没人读这个字段** —— 死数据。这里接上，顺便让"二章武器有卖点"成立。
    if (!ranged) { const mw = ITEMS[gameState.run.equipment.weapon]; if (mw && mw.acc) rate += mw.acc; }
    if (act === 'heavy') rate -= 0.2;
    if (act === 'sweep') rate -= 0.15;
    if (act === 'throw') rate -= 0.1;
    if (target && (target.traits || []).includes('evade')) rate -= 0.2;
    return Math.max(0.2, Math.min(1, pity(rate)));
  }

function combatActionInfo(act, target) {
    const ranged = act === 'ranged' || (act === 'attack' && !meleeWeapons().length && hasRanged() !== null);
    const range = ranged ? myAttackRange() : deps.RANGE_MELEE;
    // 重击 / 必中：都是近战动作，且要先在技能树里学过（老存档由 migCombat2 补上重击）
    const available = (act === 'heavy') ? (hasHeavy() && (meleeWeapons().length > 0 || !rangedWeapon()))
                    : (act === 'sure')  ? (hasSure() && (meleeWeapons().length > 0 || !rangedWeapon()))
                    : true;
    return { available, accuracy:combatAccuracy(act, target), range, approaching:!!(gameState.run.combat && gameState.run.combat.dist > range) };
  }

const combatEvents = new WeakMap();

function takeCombatEvents(C) {const events=combatEvents.get(C)||[];combatEvents.delete(C);return events;}

function fightAction(act, ti) {
    const C = gameState.run.combat;
    if (!C || gameState.run.death || gameState.run.ending) return;
    if (!['attack','heavy','sure','ranged','sweep','throw','defend','item','flee'].includes(act)) return;
    if (act === 'sweep' && !sweepInfo().usable) return;
    if (act === 'heavy' && !heavyInfo().usable) return;
    if (act === 'sure' && !sureInfo().usable) return;
    if (act === 'ranged' && hasRanged() === null) return;
    if (!combatActionInfo(act).available) return;
    if (act === 'throw' && (C.thrown || !(ITEMS[gameState.run.equipment.weapon] || {}).throw)) return;
    const events=[];combatEvents.set(C,events);
    const fx=(target,type,value=0,extra={})=>events.push({target,type,value,side:target?'player':'enemy',hpAfter:target?Math.max(0,target.ehp):Math.max(0,gameState.run.stats.hp),...extra});
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
    const defEff = (DIFFICULTIES[gameState.run.difficulty] && DIFFICULTIES[gameState.run.difficulty].defEff !== undefined) ? DIFFICULTIES[gameState.run.difficulty].defEff : 1;   // 防御效率：简单100%→传奇70%
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
      const accBase = (gameState.run.statuses.fear ? 0.7 : 0.9) + (gameState.run.identity === 'hunter' ? 0.1 : 0);
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
          if (e.traits.includes('stoneGuard')) { dealt = Math.max(1, Math.round(dealt * 0.75)); const rc = Math.max(1, Math.round(dealt * 0.25)); applyHarm(rc); roundLines.push(`石甲的符文把力道反噬回来（-${rc}）。`); if (gameState.run.stats.hp <= 0) gameState.run.stats.hp = 0; }
          const actualDamage=Math.min(Math.max(0,e.ehp),dealt);
          e.ehp -= dealt;fx(e,'hit',dealt); n++;
          roundLines.push(`${e.name}挨了一记横扫，受到 ${dealt} 点伤害。`);
          if (gameState.run.stats.hp>0 && actualDamage>0 && vampRate()>0 && hasDualDagger()) {const heal=Math.min(hpMax()-gameState.run.stats.hp,Math.max(1,Math.round(actualDamage*vampRate())));if(heal>0){gameState.run.stats.hp+=heal;roundLines.push(`【嗜血狂刀】双刀饮血，回复 ${heal} 点生命。`);}}
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
        if (chance(combatAccuracy('throw', tg))) { gameState.run.missStreak = 0; let dmg = Math.max(1, Math.round(myAtk * 1.6) - tg.def); tg.ehp -= dmg; fx(tg,'hit',dmg);roundLines.push(`你奋力掷出长矛，命中${tg.name}，造成 ${dmg} 点伤害！`); }
        else { fx(tg,'miss');noteMissStreak(); roundLines.push('长矛擦着它飞过，落空了。'); }
      } else if (act === 'attack' || act === 'heavy' || act === 'sure' || act === 'ranged') {
        const noMelee = !meleeWeapons().length && hasRanged() !== null;
        // 技能树：狂战（攻击 +15/22/30%）/ 铁壁（攻击 -5%）在这里生效
        let dmg = Math.round(((act === 'ranged' || noMelee) ? rangedAtk() : myAtk) * rageAtkMul() * ironAtkMul());
        if (act === 'heavy') dmg = Math.round(dmg * 1.5);
        if (act === 'sure') dmg = Math.round(dmg * 1.0);   // 必中：不加倍，只保证命中
        // 两个技能各自的冷却（20 单位时间，与横扫同一套口径）：用了就进冷却
        if (act === 'heavy') C.heavyCd = deps.ACT_CD_BASE;
        if (act === 'sure') C.sureCd = deps.ACT_CD_BASE;
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
          gameState.run.missStreak = 0;
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
          if (tg.traits.includes('stoneGuard')) { dealt = Math.max(1, Math.round(dealt * 0.75)); const rc = Math.max(1, Math.round(dealt * 0.25)); applyHarm(rc); roundLines.push(`石甲的符文把力道反噬回来（-${rc}）。`); if (gameState.run.stats.hp <= 0) gameState.run.stats.hp = 0; }
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
          const usedW = (!anyRanged && !C.thrown && meleeWeapons().length > 1) ? gameState.run.equipment[weaponTurnSlot()] : null;
          const wTag = usedW ? `〔${wNameOf(usedW)}〕` : '';
          roundLines.push(`你${anyRanged ? (firedWeapon && firedWeapon.ammoItem ? '开枪射击' : '拉弓射箭') : act === 'heavy' ? '奋力重击' : act === 'sure' ? '稳稳命中' : '攻击'}${tg.name}${wTag}，造成 ${dealt} 点伤害。`);
          if (!anyRanged && act !== 'throw') drainWeapon();
          // 只按实际削掉的生命吸血，溢出伤害不回血；反伤致死也不能靠吸血复活。
          const healFromHit=(rate,label)=>{
            if(!(rate>0) || actualDamage<=0 || gameState.run.stats.hp<=0)return;
            const heal=Math.min(hpMax()-gameState.run.stats.hp,Math.max(1,Math.round(actualDamage*rate)));
            if(heal>0){gameState.run.stats.hp+=heal;roundLines.push(`${label}${heal} 点生命。`);}
          };
          healFromHit(daggerVamp,'【嗜血狂刀】双刀饮血，回复 ');
          if(hasRelic('vampire'))healFromHit(0.1,'吸血宝石吸回 ');
          if (gameState.run.weaponSharpen && gameState.run.weaponSharpen.bleed && chance(gameState.run.weaponSharpen.bleed)) { tg.bleed = (tg.bleed || 0) + 3; roundLines.push('你的利刃划开了它的伤口，血流不止！'); }
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
            else {gameState.run.statuses.fear=Math.max(gameState.run.statuses.fear || 0,2);gameState.run.stats.spirit=Math.max(0,gameState.run.stats.spirit-8);roundLines.push('【恐吓】精神-8，命中降低。');}
            continue;
          }
          if(skill===3) {
            if(C.defending) roundLines.push('你护住头部，抵住了【晕眩】。');
            else {C.nightStun=1;C.nightStunRound=C.round;roundLines.push('【晕眩】下一次行动将被打断！');}
            continue;
          }
        } else if(!e.isBoss && e.traits.includes('dread') && C.round%4===0 && !C.defending) {
          gameState.run.stats.spirit=Math.max(0,gameState.run.stats.spirit-3);roundLines.push('梦魇的低语侵蚀心神（精神-3）。');
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
        const armor = ITEMS[gameState.run.equipment.armor];
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
        if(armor && armor.hitHeal && gameState.run.stats.hp>0) { const heal=Math.min(armor.hitHeal,hpMax()-gameState.run.stats.hp); gameState.run.stats.hp+=heal; roundLines.push(`【神之甲】回复 ${heal} 点生命。`); }
        if (revengeBonus() > 0) { C.revenge = Math.min(3, (C.revenge || 0) + 1); roundLines.push('【复仇】你记住了这一下，下一击会更狠。'); }
        if (gameState.run.equipment.armor && DURA[gameState.run.equipment.armor] !== undefined) drainById(gameState.run.equipment.armor);
        if (gameState.run.equipment.accessory && DURA[gameState.run.equipment.accessory] !== undefined) drainEquipSlot('accessory');
        // 盾墙：盾牌耐久消耗 -20/35/50%（用概率跳过磨损来体现）
        if (gameState.run.equipment.weapon2 && ITEMS[gameState.run.equipment.weapon2] && ITEMS[gameState.run.equipment.weapon2].cat === 'shield' && DURA[gameState.run.equipment.weapon2] !== undefined) {
          if (!chance(1 - wallDurMul())) drainById(gameState.run.equipment.weapon2);
        }
        if (e.traits.includes('poison') && chance(0.35)) { gameState.run.statuses.poison = Math.max(gameState.run.statuses.poison, 3); roundLines.push('你中毒了！'); }
        if (['wolf','cavebear','leopard','shark'].includes(e.id) && chance(0.25)) { gameState.run.statuses.bleed = Math.max(gameState.run.statuses.bleed, 2); roundLines.push('伤口开始流血！'); }
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
      if (gameState.run.stats.hp <= 0) gameState.run.stats.hp = 0;
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
    const openingSweep=act==='sweep'&&C.round===1&&C.dist<=deps.RANGE_MELEE&&aliveNow().every(e=>!e.isBoss);
    if(openingSweep){
      doPlayerTurn();
      for(let i=0;i<nE;i++){if(C.fled||gameState.run.stats.hp<=0||!aliveNow().length)break;doEnemyTurn();}
    } else {
    for (let i = 0; i < before; i++) { if (C.fled || gameState.run.stats.hp <= 0) break; if (!aliveNow().length) break; doEnemyTurn(); }
    if (twin) { if (!C.fled && gameState.run.stats.hp > 0 && aliveNow().length) { doEnemyTurn(); doPlayerTurn(); } } // 仅最后一击同时结算；此前已死亡不能靠吸血复起。
    else if (enemyFirst) { if (!C.fled && gameState.run.stats.hp > 0 && aliveNow().length) doPlayerTurn(); }
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
    if (gameState.run.stats.hp <= 0) { endFight(false); die('你在战斗中倒下了。'); return; }
    if (deps.onFight) deps.onFight('update', C);
    change();
  }

function endFight(win) {
    const C = gameState.run.combat;
    // 交给 UI 的收尾状态：win + **最终名单**（含刚被打倒的 0 血目标），
    // 让战斗结束停的那一秒里血条显示的是"这一击结算之后"的样子（作者 2026-09-25）。
    const broken=(C?.brokenItems || []).slice();
    const fin = { win: !!win, enemies: ((C && C.finalEnemies) || (C && C.enemies) || []).slice() };
    if (gameState.run._raid) {
      const cb = gameState.run._raid; gameState.run._raid = null;
      gameState.run.combat = null;
      if (deps.onFight) deps.onFight('end', fin);
      if(broken.length && gameState.run.stats.hp>0)showOverlay({title:'装备损坏',text:broken.map(id=>'你的'+ITEMS[id].name+'已损坏').join('\n'),choices:[{label:'知道了',ok:()=>{}}]});
      if (win) { if (cb.win) cb.win(); } else { if (cb.lose) cb.lose(); }
      change();
      return;
    }
    const en = C.enemy;
    if (win) {
      if (gameState.run.weaponSharpen) { gameState.run.weaponSharpen.fights = (gameState.run.weaponSharpen.fights || 1) - 1; if (gameState.run.weaponSharpen.fights <= 0) { gameState.run.weaponSharpen = null; log('打磨的锋利劲头过去了。', 'warn'); } }
      gameState.run.killCount[en.id] = (gameState.run.killCount[en.id] || 0) + 1;
      if (!gameState.run.seen['mon_'+en.id]) { gameState.run.seen['mon_'+en.id] = 1; const mm = metaState(); mm.seenMon[en.id] = 1; metaSave(); log(`「图鉴」击败了：${en.name}`, 'sys'); }
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
      if (en.boss) { gameState.run.flags['boss_'+en.id] = 1; diaryAdd(`我击败了${en.name}。`); }
      if (en.id === 'slateGuard') gameState.run.flags.slateGuardDone = 1;
      if (en.id === 'wolfKing') gameState.run.flags.wolfKingDone = 1;
      if (en.id === 'pirateBoss' && gameState.run.flags['boss_pirateBoss']) log('海盗的威胁解除了。盐镇的悬赏可以领取。', 'good');
      if (gameState.run.stats.hp < 20) diaryAdd('险胜一场，差点回不来。');
    } else if (C.enemyFled) {
      // 是"它"跑了，不是"你"跑了——以前两种情况共用一句话，容易误会成打死却没掉落
      log(`${en.name}受了伤，一溜烟跑掉了——什么都没留下。`, 'warn');
    } else {
      log(`你从${en.name}面前逃开了。`, 'warn');
    }
    gameState.run.combat = null;
    // 先取出续程回调；提示与刷新不能成为完成赶路的前置条件。
    const _cb = gameState.run._onFightWin; gameState.run._onFightWin = null;
    const road = gameState.run._roadAmbush;
    const continued = win && gameState.run.stats.hp>0 && !gameState.run.death && !gameState.run.ending;
    if (deps.onFight) deps.onFight('end', fin);
      if(broken.length && gameState.run.stats.hp>0)showOverlay({title:'装备损坏',text:broken.map(id=>'你的'+ITEMS[id].name+'已损坏').join('\n'),choices:[{label:'知道了',ok:()=>{}}]});
    if (continued && _cb) _cb();
    else if(continued && road && road.enemy===en.id && sceneOf(road.id)) {
      // 函数不写入JSON；旧/当前存档中的赶路记录可恢复胜后抵达。
      gameState.run._roadAmbush=null;
      if(gameState.run.scene!==road.id){log(`${en.name}倒下了，路通了。`,'good');arriveAt(road.id);}
    }
    else if(gameState.run.nightmareHarvest) {
      const pending=gameState.run.nightmareHarvest;gameState.run.nightmareHarvest=null;
      const p=continued && pending.scene===gameState.run.scene && pending.zone===gameState.run.zone && pointsOf().find(p=>p.id===pending.id);
      if(p){gameState.run._nightmareHarvestPass=p.id;try{doPoint(p);}finally{gameState.run._nightmareHarvestPass=null;}}
    }
    if(!continued && road && road.enemy===en.id)gameState.run._roadAmbush=null;
    change();
    if (win && en.id==='nightmareBoss' && gameState.run.difficulty==='nightmare') {
      gameState.run.flags.ended_N=1;gameState.run.flags.settled_N=1;gameState.run.flags.settledEnding='N';gameState.run.ending='N';
      metaSettle();save();if(deps.onEnding)deps.onEnding('N','');
    }
  }

function useItemInFight(id) {
    const C = gameState.run.combat;
    if (!C || C.usedItems >= 2) return false;
    const it = ITEMS[id];
    if (!it || !hasItem(id)) return false;
    if (it.cat !== 'med' && id !== 'smokeBomb' && id !== 'poisonCoat') return false;
    removeItem(id, 1);
    C.usedItems = (C.usedItems || 0) + 1;   // 每场战斗最多 2 次道具：以前只检查不计数，等于可以无限用
    const leftTip = () => `（本场道具 ${C.usedItems}/2）`;
    if (id === 'smokeBomb') { C.smoke = true; C.log.push(`你掷出简易烟雾弹，浓烟弥漫——下一次逃跑必定成功！${leftTip()}`); if (deps.onFight) deps.onFight('update', C); return true; }
    if (id === 'poisonCoat') { C.coat = 3; C.log.push(`你把淬毒剂抹在武器上——接下来 3 次命中会让敌人中毒。${leftTip()}`); if (deps.onFight) deps.onFight('update', C); return true; }
    restoreHealth(it);
    if(it.healthRestore)C.log.push(`你使用${it.name}，健康+${it.healthRestore}${it.cureInfection?'，感染已处理':''}。`);
    if (it.heal) { const h = medHeal(it.heal); gameState.run.stats.hp = Math.min(hpMax(), gameState.run.stats.hp + h); C.log.push(`你使用${it.name}，生命+${h}。`); }
    if (it.stopBleed) { gameState.run.statuses.bleed = 0; C.log.push('血止住了。'); }
    if (it.curePoison) { gameState.run.statuses.poison = 0; C.log.push('毒解了。'); }
    if (it.sta) { gameState.run.stats.stamina = Math.min(maxStam(), gameState.run.stats.stamina + it.sta); C.log.push(`你灌下${it.name}，体力+${it.sta}。`); }
    if (it.water) { gameState.run.stats.thirst = Math.min(100, gameState.run.stats.thirst + it.water); C.log.push(`水分+${it.water}。`); }
    if (it.spirit) {
      gameState.run.stats.spirit = Math.max(0, Math.min(100, gameState.run.stats.spirit + it.spirit));
      C.log.push(it.spirit > 0 ? `精神+${it.spirit}。` : `精神${it.spirit}——眼前一阵发黑。`);
    }
    C.log.push(`你使用了${it.name}。${leftTip()}`);
    if (deps.onFight) deps.onFight('update', C);
    return true;
  }

function raidLose(power, defense) {
    log(`夜袭！营地失守了，你损失了一些物资。（防御 ${defense} vs 来袭 ${power}）`, 'danger');
    const ids = Object.keys(gameState.run.inv);
    let lost = 0;
    for (const id of ids) {
      if (chance(0.15) && ITEMS[id].cat !== 'currency') { const q = Math.ceil(invCount(id) * 0.2); removeItem(id, q); lost++; }
      if (lost >= 2) break;
    }
    gameState.run.buildings.wall = Math.max(0, gameState.run.buildings.wall - 1);
    applyHarm(20);
    diaryAdd('夜袭让我损失惨重。围墙需要修。');
    if (gameState.run.stats.hp <= 0) die('你死在了夜袭里。');
  }

function startRaidFight(cb) {
    const diff = DIFFICULTIES[gameState.run.difficulty].enemyMul;
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
    deps.inventory.resetSwingTurn();   // 双持换手从主手重新开始（DPS 核查 #6：这计数器以前跨战斗留着，新战斗第一刀用哪把要看上一场）
    gameState.run.combat = C;
    gameState.run._raid = cb;
    if (deps.onFight) deps.onFight('start', C);
    change();
  }

function nightRaid(isStory) {
    const w = BUILDING_CHAINS.wall[gameState.run.buildings.wall];
    if (!isStory && !chance(w.raid)) return;
    gameState.run.flags.firstRaidDone = 1;      // 打过第一次夜袭之后，才允许"随机夜袭"
    const n = raidWolves();
    if (gameState.run.flags.xiaoman) log('小满轻轻叫醒你："营外有动静……"', 'warn');
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
    return Object.freeze({startFight,divineCritRoll,combatAccuracy,combatActionInfo,takeCombatEvents,fightAction,endFight,useItemInFight,raidLose,startRaidFight,nightRaid});
  }
  return Object.freeze({create});
})();
