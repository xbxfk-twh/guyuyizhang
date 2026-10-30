/* weapon-care：业务规则的唯一实现；Game 保留调用接口与装配。 */
const WeaponCare = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const chance=(...args)=>deps.chance(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const hasItem=(...args)=>deps.hasItem(...args);
    const durList=(...args)=>deps.durList(...args);
    const durMaxOf=(...args)=>deps.durMaxOf(...args);
    const durSync=(...args)=>deps.durSync(...args);
    const removeItem=(...args)=>deps.removeItem(...args);
    const keepsBroken=(...args)=>deps.keepsBroken(...args);
    const addMin=(...args)=>deps.addMin(...args);
    const gainItem=(...args)=>deps.gainItem(...args);
    const pistolCalib=(...args)=>deps.pistolCalib(...args);
    const cxRepairFree=(...args)=>deps.cxRepairFree(...args);
function sharpenAm() { return (gameState.run.weaponSharpen && gameState.run.weaponSharpen.am) ? gameState.run.weaponSharpen.am : 0; }

function sharpen() {
    if (!gameState.run.equipment.weapon) { log('需要先装备一把武器。', 'warn'); return; }
    if (!gameState.run.furniture.grindstone) { log('需要先建造「磨刀石」家具。', 'warn'); return; }
    if (!hasItem('flint', 1)) { log('磨刀需要消耗 1 燧石。', 'warn'); return; }
    removeItem('flint', 1);
    gameState.run.weaponSharpen = { am:3, bleed:0.2, fights:3 };
    addMin(30);
    log(`你用磨刀石把${ITEMS[gameState.run.equipment.weapon].name}打磨得又光又利（+3 攻击，20% 几率让敌人流血，持续 3 场战斗）。`, 'good');
    change();
  }

function repairPistol() {
    const w = gameState.run.equipment.weapon;
    const w2 = gameState.run.equipment.weapon2;
    const id = (w && ITEMS[w] && ITEMS[w].id === 'pistol') ? w : ((w2 && ITEMS[w2] && ITEMS[w2].id === 'pistol') ? w2 : null);
    if (!id) { log('需要先把「源能手枪」装备到主手或副手。', 'warn'); return { ok:false }; }
    const slot = (id === w) ? 'weapon' : 'weapon2';
    const pa = durList('pistol');
    const pei = Math.min((gameState.run.equipIdx && gameState.run.equipIdx[slot]) || 0, Math.max(0, (pa || []).length - 1));
    const cur = (pa && pa.length) ? (pa[pei] !== undefined ? pa[pei] : pa[0]) : ((gameState.run.dur && gameState.run.dur.pistol !== undefined) ? gameState.run.dur.pistol : DURA.pistol);
    const needDur = cur < durMaxOf('pistol', pei);
    if (!needDur && pistolCalib()) { log('源能手枪已经校准过、耐久也是满的。', 'warn'); return { ok:false }; }
    if (!hasItem('sourceOre', 2)) { log('校准源能手枪需要 源矿×2。', 'warn'); return { ok:false }; }
    removeItem('sourceOre', 2);
    if (needDur) {
      if (pa && pa.length) pa[pei] = durMaxOf('pistol', pei); else { gameState.run.dur = gameState.run.dur || {}; gameState.run.dur.pistol = DURA.pistol; }
      durSync('pistol');
    }
    const first = !pistolCalib();
    gameState.run.pistolCalibrated = true;
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

const REPAIR_MATS = { pistol:['sourceBar',2], bullet:null, knifeStone:['stone',2], club:['stone',2], spear:['stone',2], bow:['ironingot',1], divineBow:null, arrow:null, eagleArrow:null, ironDagger:['ironingot',1], steelDagger:['steelingot',1], blackDagger:['blackingot',2], ironSword:['ironingot',1], ironGreatSword:['ironingot',3], steelSword:['steelingot',2], blackSword:['blackingot',2], blackGreatSword:['blackingot',4], coralBlade:['deepCoral',4], sourceSpear:['sourceBar',3] };

function repairMatOf(id) { return Object.prototype.hasOwnProperty.call(REPAIR_MATS,id) ? REPAIR_MATS[id] : ['stone', 2]; }

function repairWeapon(id) {
    const w = id || gameState.run.equipment.weapon; if (!w) { log('需要先装备或选择一把武器。', 'warn'); return {ok:false}; }
    if (!hasItem(w) || !ITEMS[w] || ITEMS[w].cat !== 'weapon' || (id && !keepsBroken(w))) return {ok:false};
    if (w === 'divineBow') { log('神弓无法修复；耐久归零后会留在背包中作收藏。', 'warn'); return {ok:false,reason:'神弓无法修复。'}; }
    if (!gameState.run.furniture.grindstone || gameState.run.scene !== 'camp') { log('需要回营地使用磨刀石。', 'warn'); return {ok:false}; }
    if (DURA[w] === undefined) { log('这件武器没有耐久。', 'warn'); return {ok:false}; }
    // 耐久是满的就别修 —— 以前会照收材料、白吃一份（石头×2 / 铁锭…）
    const wa0 = durList(w);
    const repairIdx = id ? wa0.indexOf(Math.min(...wa0)) : Math.min((gameState.run.equipIdx && gameState.run.equipIdx.weapon) || 0, Math.max(0, (wa0 || []).length - 1));
    { const ei0 = repairIdx;
      const cur0 = (wa0 && wa0.length) ? (wa0[ei0] !== undefined ? wa0[ei0] : wa0[0]) : ((gameState.run.dur && gameState.run.dur[w] !== undefined) ? gameState.run.dur[w] : DURA[w]);
      if (cur0 >= durMaxOf(w, ei0)) { log(`${ITEMS[w].name}的耐久已经是满的，不用修。`, 'sys'); return {ok:false}; } }
    const [mat, qty] = repairMatOf(w);
    if (!hasItem(mat, qty)) { log(`修补${ITEMS[w].name}需要 ${ITEMS[mat].name}×${qty}。`, 'warn'); return {ok:false}; }
    // 技能树「修补匠」：25% / 50% / 75% 概率不消耗修补材料（触发要写日志）
    if (chance(cxRepairFree())) log(`【修补匠】这次修补没消耗${ITEMS[mat].name}。`, 'good');
    else removeItem(mat, qty);
    const wa = durList(w);
    const ei = repairIdx;
    if (wa && wa.length) wa[ei] = durMaxOf(w, ei); else { gameState.run.dur = gameState.run.dur || {}; gameState.run.dur[w] = DURA[w]; }
    durSync(w);
    addMin(20);
    log(`你修补好了${ITEMS[w].name}，耐久恢复满。`, 'good');
    change();
    return {ok:true};
  }

function nameWeapon(nm) {
    const w = gameState.run.equipment.weapon; if (!w) { log('需要先装备一把武器。', 'warn'); return; }
    if (!gameState.run.furniture.grindstone) { log('需要先建造「磨刀石」家具。', 'warn'); return; }
    gameState.run.weaponNames = gameState.run.weaponNames || {};
    if (gameState.run.weaponNames[w]) { log(`${ITEMS[w].name}已经命名过了，每把武器只能命名一次。`, 'warn'); return; }
    if (!hasItem('namecard')) { log('需要消耗 1 张命名牌。', 'warn'); return; }
    const name = (nm || '').trim().slice(0, 8);
    if (!name) { log('请输入一个名字。', 'warn'); return; }
    removeItem('namecard', 1);
    gameState.run.weaponNames[w] = { bonus: 1, name };
    addMin(30);
    log(`你为${ITEMS[w].name}刻下名号「${name}」，它从此更顺手（伤害永久 +1）。`, 'good');
    change();
  }

function wNameOf(id) {
    if (!id || !ITEMS[id]) return '武器';   // 兜底：传进来的不是合法物品 id 时别让整场战斗崩掉
    return (gameState.run.weaponNames && gameState.run.weaponNames[id] && gameState.run.weaponNames[id].name) || ITEMS[id].name;
  }
    return Object.freeze({sharpenAm,sharpen,repairPistol,fixBrokenPistol,repairMatOf,repairWeapon,nameWeapon,wNameOf});
  }
  return Object.freeze({create});
})();
