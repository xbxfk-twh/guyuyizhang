/* relics：业务规则的唯一实现；Game 保留调用接口与装配。 */
const RelicRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const chance=(...args)=>deps.chance(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const invCount=(...args)=>deps.invCount(...args);
    const removeItem=(...args)=>deps.removeItem(...args);
    const buffV=(...args)=>deps.buffV(...args);
    const accessoryStat=(...args)=>deps.accessoryStat(...args);
    const trainingHp=(...args)=>deps.trainingHp(...args);
    const metaSave=(...args)=>deps.metaSave(...args);
    const metaState=(...args)=>deps.metaState(...args);
function devEnabled() { try { return localStorage.getItem('guyuyizhang_dev') === '1'; } catch(e){ return false; } }

function unlockDev(pw) {
    if (pw !== '1014679931') return { ok:false, reason:'密码错误' };
    try { localStorage.setItem('guyuyizhang_dev','1'); } catch(e){}
    const meta = metaState();
    if (!meta.devBonus) { meta.soul += 10000; meta.devBonus = 1; metaSave(); }
    return { ok:true, soul: meta.soul };
  }

function hasRelic(id) { return (gameState.run.relicEquip || []).includes(id); }

function hpMax() { return 100 + (hasRelic('bloodvest') ? 20 : 0) + accessoryStat('hp') + buffV('hp') + 2 * ((gameState.run.permUsed && gameState.run.permUsed.tideVitalPill) || 0) + trainingHp(); }

function relicSlotCost(i) { return [1,3,7][i] || 0; }

function unlockRelicSlot() {
    const i = gameState.run.relicSlots || 0;
    if (i >= 3) return { ok: false, reason: '三格神物栏已全部开启' };
    const cost = relicSlotCost(i);
    if (invCount('coin') < cost) return { ok: false, reason: `需要 ${cost} 枚远古金币` };
    removeItem('coin', cost);
    gameState.run.relicSlots = i + 1;
    change();
    return { ok: true, cost };
  }

function equipRelic(id) {
    if (!gameState.run.relics.includes(id)) return { ok: false, reason: '尚未获得这间神物' };
    if (hasRelic(id)) return { ok: false, reason: '已装备' };
    const unlocked = gameState.run.relicSlots || 0;
    const idx = (gameState.run.relicEquip || []).slice(0, unlocked).indexOf(null);   // 只在已解锁的格子里找空位
    if (idx < 0) return { ok: false, reason: unlocked >= 3 ? '神物栏已满（三格）' : '神物格尚未开启，先用远古金币解锁' };
    gameState.run.relicEquip[idx] = id; change();
    return { ok: true };
  }

function unequipRelic(id) {
    const idx = (gameState.run.relicEquip || []).indexOf(id);
    if (idx >= 0) { gameState.run.relicEquip[idx] = null; change(); return { ok: true }; }
    return { ok: false, reason: '未装备' };
  }

function sleepQuality(mode) {
    const h = Math.floor(gameState.run.minute / 60);
    if (mode === 'nap') { if (h >= 12 && h <= 16) return 1.2; if (h >= 9 && h <= 18) return 1.1; return 0.8; }
    if (h === 22 || h === 23 || h === 0) return 1.20;
    if (h === 21 || h === 1) return 1.15;
    if (h === 20 || h === 2) return 1.12;
    if (h === 19 || h === 3) return 1.0;
    if (h === 18 || h === 4) return 0.9;
    if (h === 17 || h === 5) return 0.85;
    return 0.8;
  }

function gainRandomRelic() {
    // 注意：判断"有没有"要看已获得（S.relics），不是看已装备，否则会刷出重复神物
    // ⚠️ 和 shrinePool() / 深海售卖机保持同一口径：**亚特兰蒂斯之种不参加随机**
    //    （作者 2026-09-23：之种可从海底神秘鱼人交换或商城购买）。以前这里不排除，任何带 relic:1 的
    //    奇遇都可能把它随机掉出来——石龛改版时顺手把这条口子也堵上。
    const pool = Object.keys(RELICS).filter(id => id !== 'atlantisSeed' && !(gameState.run.relics || []).includes(id));
    if (!pool.length) { log('你已集齐所有神物。', 'sys'); return; }
    const id = pool[Math.floor(Math.random() * pool.length)];
    gameState.run.relics.push(id);
    log(`你获得了神物【${RELICS[id].name}】——${RELICS[id].desc}`, 'good');
    change();
  }

const RELIC_VENDOR_PRICE = 1200;

function atlVendor() {
    if (!gameState.run.atlantis) gameState.run.atlantis = { unlocked:0, visited:0, camp:{ furniture:{}, buildings:{} }, quest:0 };
    const v = gameState.run.atlantis.vendor;
    if (v && v.rolled && v.day === gameState.run.day) return v;          // 同一天不重刷
    // 亚特兰蒂斯之种不进这台机器（走剧情/奇遇路线，属于特殊神物）
    const pool = Object.keys(RELICS).filter(id => id !== 'atlantisSeed' && !(gameState.run.relics || []).includes(id));
    const hasStock = pool.length > 0 && chance(deps.VENDOR_RELIC_CHANCE);
    const id = hasStock ? pool[Math.floor(Math.random() * pool.length)] : null;
    gameState.run.atlantis.vendor = { day: gameState.run.day, id, sold: false, rolled: true, noStock: !hasStock && pool.length > 0 };
    return gameState.run.atlantis.vendor;
  }

function atlVendorInfo() {
    const v = atlVendor();
    const it = v.id ? RELICS[v.id] : null;
    return { id: v.id, name: it ? it.name : '', desc: it ? it.desc : '', glyph: it ? it.glyph : '',
             sold: !!v.sold, price: RELIC_VENDOR_PRICE, day: v.day, noStock: !!v.noStock, chance: deps.VENDOR_RELIC_CHANCE };
  }

function buyRelicFromVendor() {
    if (gameState.run.scene !== 'atlantis') return { ok:false, reason:'这台售卖机只在亚克兰蒂斯运转。' };
    const v = atlVendor();
    if (!v.id) return { ok:false, reason:'你已经集齐所有神物了。' };
    if (v.sold) return { ok:false, reason:'今天上架的神物已经被你买走了，明天再来看看。' };
    if (invCount('beibi') < RELIC_VENDOR_PRICE) return { ok:false, reason:`贝壳币不足（需 ${RELIC_VENDOR_PRICE}）` };
    removeItem('beibi', RELIC_VENDOR_PRICE);
    gameState.run.relics.push(v.id);
    v.sold = true;
    log(`售卖机吐出一件神物【${RELICS[v.id].name}】——${RELICS[v.id].desc}`, 'good');
    change();
    return { ok:true, id:v.id };
  }
    return Object.freeze({devEnabled,unlockDev,hasRelic,hpMax,relicSlotCost,unlockRelicSlot,equipRelic,unequipRelic,sleepQuality,gainRandomRelic,atlVendor,atlVendorInfo,buyRelicFromVendor});
  }
  return Object.freeze({create});
})();
