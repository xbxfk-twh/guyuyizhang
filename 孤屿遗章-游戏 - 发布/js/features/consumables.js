/* consumables：业务规则的唯一实现；Game 保留调用接口与装配。 */
const ConsumableRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const chance=(...args)=>deps.chance(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const applyHarm=(...args)=>deps.applyHarm(...args);
    const restoreHealth=(...args)=>deps.restoreHealth(...args);
    const addMin=(...args)=>deps.addMin(...args);
    const maxStam=(...args)=>deps.maxStam(...args);
    const medHeal=(...args)=>deps.medHeal(...args);
    const itemUseCount=(...args)=>deps.itemUseCount(...args);
    const takeUseItem=(...args)=>deps.takeUseItem(...args);
    const hpMax=(...args)=>deps.hpMax(...args);
function consume(id,source=false) {
    const it = ITEMS[id];
    if (!it || itemUseCount(id,source)<1 || gameState.run.death || gameState.run.ending || gameState.run.stats.hp<=0) return;
    if (it.cat !== 'food' && it.cat !== 'drink' && !(it.food || it.water || it.curePoison || it.stopBleed)) { log('这个不能吃。', 'warn'); return; }
    if(!takeUseItem(id,source))return;
    applyFoodEffects(id);
    log(`你吃/喝了${it.name}。`, 'sys');
    addMin(it.cat === 'drink' ? 1 : 5);
    change();
  }

function applyFoodEffects(id) {
    const it=ITEMS[id];
    if(['fish','meat'].includes(id) && chance(0.2)) { gameState.run.statuses.nauseaUntil=(gameState.run.tick||0)+720; log('反胃：12 小时内体力消耗 +50%。','warn'); }
    if (it.buffStat) { gameState.run.buffs = gameState.run.buffs || {}; if (it.buffStat === 'spirit') { gameState.run.stats.spirit = Math.max(0, Math.min(100, gameState.run.stats.spirit + (it.buffVal||0))); log('精神+' + it.buffVal + '。', 'good'); } else { gameState.run.buffs[it.buffStat] = { v: it.buffVal||0, until: (gameState.run.tick||0) + (it.buffH||24)*60 }; log('【' + it.name + '】' + (it.buffH||24) + ' 小时内 ' + (deps.BUFF_NAMES[it.buffStat] || '属性') + ' +' + it.buffVal + '。', 'good'); } }
    if (it.negChance && chance(it.negChance)) { if (it.negHp) { applyHarm(Math.min(it.negHp,Math.max(0,gameState.run.stats.hp-1))); log('鱼肉不太对劲……（-' + it.negHp + ' 生命）', 'danger'); } if (it.negPoison) { gameState.run.statuses.poison = Math.max(gameState.run.statuses.poison, it.poisonHours||6); log('你中毒了！持续'+(it.poisonHours||6)+'小时。', 'danger'); } }

    if (it.food) gameState.run.stats.hunger = Math.min(100, gameState.run.stats.hunger + it.food);
    if (it.water) gameState.run.stats.thirst = Math.min(100, gameState.run.stats.thirst + it.water);
    if (it.heal) { const h = medHeal(it.heal); gameState.run.stats.hp = Math.min(hpMax(), gameState.run.stats.hp + h); log(`生命+${h}。${h > it.heal ? '（药师手艺，回复 +50%）' : ''}`, 'good'); }
    if (it.spirit) gameState.run.stats.spirit = Math.max(0, Math.min(100, gameState.run.stats.spirit + it.spirit));
    if (it.sta) { gameState.run.stats.stamina = Math.min(maxStam(), gameState.run.stats.stamina + it.sta); log(`体力+${it.sta}。`, 'good'); }
    if (it.curePoison && gameState.run.statuses.poison > 0) { gameState.run.statuses.poison = 0; log('蛇胆入喉，毒性被解了。', 'good'); }
    if (it.stopBleed && gameState.run.statuses.bleed > 0) { gameState.run.statuses.bleed = 0; log('血止住了。', 'good'); }
  }

function useMed(id,source=false) {
    // ⚠️ 本局已经结束（死亡结算中）就不许再吃药：以前"回标题 → 继续上次游戏 → 吃口药又活了"
    //    等于死亡没代价（玩家反馈）。真正的复活只有结局画面那条 50 魂点的路。
    if (gameState.run.ending === 'D' || gameState.run.death || gameState.run.stats.hp <= 0) { log('这一局已经结束了。', 'warn'); return; }
    const it = ITEMS[id];
    if (!it || it.cat !== 'med' || itemUseCount(id,source)<1) return;
    if (id === 'tideVitalPill' || id === 'abyssBreathPill') {
      gameState.run.permUsed = gameState.run.permUsed || {};
      if(!takeUseItem(id,source))return;
      gameState.run.permUsed[id] = (gameState.run.permUsed[id] || 0) + 1;
      if (id === 'tideVitalPill') { gameState.run.stats.hp += 2; log('潮生丹生效：本局生命上限永久 +2。', 'good'); }
      else { gameState.run.stats.stamina = Math.min(maxStam(), gameState.run.stats.stamina + 3); log('渊息丹生效：本局体力上限永久 +3。', 'good'); }
      addMin(10); change(); return;
    }
    if(!takeUseItem(id,source))return;
    restoreHealth(it);
    if (it.heal) { const h = medHeal(it.heal); gameState.run.stats.hp = Math.min(hpMax(), gameState.run.stats.hp + h); log(`生命+${h}。${h > it.heal ? '（药师手艺，回复 +50%）' : ''}`, 'good'); }
    if (it.stopBleed) { gameState.run.statuses.bleed = 0; log('血止住了。', 'good'); }
    if (it.curePoison) { gameState.run.statuses.poison = 0; log('毒解了。', 'good'); }
    if (it.water) { gameState.run.stats.thirst = Math.min(100, gameState.run.stats.thirst + it.water); log(`水分+${it.water}。`, 'good'); }
    if (it.sta) { gameState.run.stats.stamina = Math.min(maxStam(), gameState.run.stats.stamina + it.sta); log(`体力+${it.sta}。`, 'good'); }
    if (it.spirit) {
      gameState.run.stats.spirit = Math.max(0, Math.min(100, gameState.run.stats.spirit + it.spirit));
      if (it.spirit > 0) log(`精神+${it.spirit}。`, 'good');
      else {
        log(`精神${it.spirit}——一股腥甜窜上头顶，太阳穴突突直跳。`, 'warn');
        const cap = maxStam();
        if (gameState.run.stats.stamina > cap) { gameState.run.stats.stamina = cap; log(`精神太低，体力上限被压到 ${cap}。`, 'warn'); }
      }
    }
    change();
  }
    return Object.freeze({consume,applyFoodEffects,useMed});
  }
  return Object.freeze({create});
})();
