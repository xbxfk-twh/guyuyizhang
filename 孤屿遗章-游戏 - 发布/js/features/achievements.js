/* achievements：业务规则的唯一实现；Game 保留调用接口与装配。 */
const AchievementRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const log=(...args)=>deps.log(...args);
    const metaSave=(...args)=>deps.metaSave(...args);
    const metaState=(...args)=>deps.metaState(...args);
function achState() { const m = metaState(); if (!m.ach) m.ach = {}; return m.ach; }

function achUnlocked(id) { return !!achState()[id]; }

function noteMissStreak() {
    gameState.run.missStreak = (gameState.run.missStreak || 0) + 1;
    if (gameState.run.missStreak >= 3) achUnlock('humanDraw');
    if (gameState.run.missStreak >= 4) achUnlock('drawDragon');
    if (gameState.run.missStreak >= 6) achUnlock('neverHurt');
    return gameState.run.missStreak;
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
    if (!gameState.run || typeof ACHIEVEMENTS === 'undefined') return;
    const c = gameState.run.killCount || {};
    const tests = {
      initCraft:  () => (gameState.run.craftCount || 0) >= 10,
      initGather: () => (gameState.run.gatherCount || 0) >= 30,
      initKill:   () => Object.keys(c).reduce((a,k)=>a+(c[k]||0),0) >= 8,
      firstNight: () => gameState.run.day >= 5,
      craftLv3:   () => gameState.run.skill.craft >= 3,
      gather50:   () => (gameState.run.gatherCount || 0) >= 50,
      bossFirst:  () => Object.keys(c).some(k => ENEMIES[k] && ENEMIES[k].boss),
      stoneWall:  () => (gameState.run.buildings.wall || 0) >= 3,
      raftBuilt:  () => (gameState.run.buildings.dock || 0) >= 2,
      allBoss:    () => Object.keys(ENEMIES).filter(k => ENEMIES[k].boss && !ENEMIES[k].nightmare).every(k => (c[k] || 0) > 0),
      endA:       () => gameState.run.ending === 'A' || !!(gameState.run.flags && gameState.run.flags.ended_A),   // 结算状态会被"继续游戏"清掉，所以也认持久标记
      survive100: () => gameState.run.day >= 100,
      relicAll:   () => Object.keys(RELICS).every(id => (gameState.run.relics || []).includes(id)),
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
    return Object.freeze({achState,achUnlocked,noteMissStreak,achUnlock,achCheck,achClaim});
  }
  return Object.freeze({create});
})();
