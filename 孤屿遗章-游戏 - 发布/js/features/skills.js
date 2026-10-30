/* skills：业务规则的唯一实现；Game 保留调用接口与装配。 */
const SkillRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const persistPair=(...args)=>deps.persistPair(...args);
    const chance=(...args)=>deps.chance(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const save=(...args)=>deps.save(...args);
    const meleeWeapons=(...args)=>deps.meleeWeapons(...args);
    const accessoryStat=(...args)=>deps.accessoryStat(...args);
    const metaState=(...args)=>deps.metaState(...args);
function combatLv() { return gameState.run.skill.combat; }

function gatherLv() { return gameState.run.skill.gather; }

function treeState() {
    if (!gameState.run.tree || typeof gameState.run.tree !== 'object') gameState.run.tree = {};
    if (!gameState.run.skillPicks || typeof gameState.run.skillPicks !== 'object') gameState.run.skillPicks = {};
    for (const k in SKILL_TREES) {
      if (!gameState.run.tree[k] || typeof gameState.run.tree[k] !== 'object') gameState.run.tree[k] = {};
      if (!Array.isArray(gameState.run.skillPicks[k])) gameState.run.skillPicks[k] = [];
      // ⚠️ 自愈：主干等级和"已投的点"必须一一对应（N 级 = 投过 N 点）。
      //    从旧版备份槽读进来的档会出现"等级是旧系统留下的、picks 是空的"，
      //    那几级就白升了（玩家反馈"前面升的级属于加了没？打雪鹰才 10 点血"）。
      //    这里按旧系统的效果补齐：采集补「熟手」、制造补「熟手（省时）」、战斗一半「攻」一半「防」。
      const lv = gameState.run.skill[k] || 0, pk = gameState.run.skillPicks[k];
      if (pk.length < lv) {
        const fill = ({ gather: ['yield'], craft: ['speed'], combat: ['atk', 'def'] })[k] || ['yield'];
        while (pk.length < lv) pk.push(fill[pk.length % fill.length]);
        if (!gameState.run.flags) gameState.run.flags = {};
        if (!gameState.run.flags._treeHealed) {
          gameState.run.flags._treeHealed = 1;
          log(`【技能】这份存档的技能等级缺少成长选项，已按旧效果自动补齐（${SKILL_TREES[k].name}主干 ${lv} 级）。`, 'good');
        }
      } else if (pk.length > lv) pk.length = lv;
    }
    return gameState.run.tree;
  }

function nodeLv(kind, id) { treeState(); return (gameState.run.tree[kind] && gameState.run.tree[kind][id]) || 0; }

function trunkPicks(kind, optId) { treeState(); const a = gameState.run.skillPicks[kind] || []; return optId ? a.filter(x => x === optId).length : a.length; }

function trunkLv(kind) { return gameState.run.skill[kind] || 0; }

function trunkCostNow(kind) { const lv = trunkLv(kind); return lv >= SKILL_TRUNK_MAX ? null : trunkCostOf(kind, lv); }

function treeDef(kind) { return SKILL_TREES[kind]; }

function nodeDef(kind, id) { const t = treeDef(kind); return t ? (t.nodes || []).find(n => n.id === id) : null; }

function nodeSpent(kind, n, lv) { return nodeSpentOf(kind, n, lv); }

const TRUNK_STEP = 0.07;

const SKILL_COST_MUL = { gather: 2, craft: 3, combat: 1 };

function costMul(kind) { return SKILL_COST_MUL[kind] || 1; }

function trunkCostOf(kind, lv) {
    const firstCosts={gather:16,craft:24};
    if(lv===0 && firstCosts[kind]!==undefined)return firstCosts[kind];
    return Math.round((SKILL_TRUNK_COST[lv] || 0) * costMul(kind));
  }

function nodeCostOf(kind, n, lv) { return Math.round((((n && n.cost) || [])[lv] || 0) * costMul(kind)); }

function nodeSpentOf(kind, n, lv) { let s2 = 0; for (let i = 0; i < lv; i++) s2 += nodeCostOf(kind, n, i); return s2; }

function gxYieldMul() { const fine = nodeLv('gather','g_fine'); return 1 + TRUNK_STEP * trunkPicks('gather','yield') + (fine >= 2 ? 0.30 : fine ? 0.20 : 0) - (nodeLv('gather','g_rough') ? 0.10 : 0); }

function gxTimeMul() { return Math.max(0.40, 1 - TRUNK_STEP * trunkPicks('gather','speed')); }

function gxEnergyMul() {
    const rough = nodeLv('gather','g_rough');
    return Math.max(0.25, 1 - TRUNK_STEP * trunkPicks('gather','stam') + (nodeLv('gather','g_fine') ? 0.15 : 0) - (rough === 1 ? 0.20 : rough >= 2 ? 0.30 : 0));
  }

function gxPineBonus() { return 0.07 * nodeLv('gather','g_nature'); }

function gxWoodExtra() { return 0.5 * nodeLv('gather','g_wood'); }

function cxTimeMul() { return Math.max(0.40, 1 - TRUNK_STEP * trunkPicks('craft','speed')); }

function cxRefundChance() { return TRUNK_STEP * trunkPicks('craft','refund'); }

function cxExtraChance() { return TRUNK_STEP * trunkPicks('craft','extra'); }

function cxRepairFree() { return [0, 0.25, 0.50, 0.75][nodeLv('craft','c_patch')] || 0; }

function cxDurMul() { return (nodeLv('craft','c_line') ? 0.8 : 1) * (nodeLv('craft','c_finework') ? 1.3 : 1); }

function cxAtk() { return trunkPicks('combat','atk'); }

function cxDef() { return 0.5 * trunkPicks('combat','def'); }

function cxCrit() { return Math.min(1, 0.10 + 0.05 * trunkPicks('combat','crit') + (gameState.run.identity === 'hunter' ? 0.05 : 0) + accessoryStat('crit') + bladeCritBonus()); }

function critMul(weapon) {
    let mul = 1.5;
    const isBow = (weapon === 'bow') || !!(weapon && weapon.id === 'bow') || !!(weapon && weapon.ranged && !weapon.ammoItem);
    if (isBow && bowNodeLv() > 0) mul = [1.5, 1.8, 2.1][bowNodeLv()] || 1.5;
    return mul;
  }

const SWEEP_CD_BASE = 20;

function sweepNodeLv() { return nodeLv('combat','f_sweep'); }

function sweepCdTotal() { return Math.max(2, SWEEP_CD_BASE - 2 * sweepNodeLv()); }

function sweepMul() { return Math.round((0.8 + 0.2 * sweepNodeLv()) * 10) / 10; }

function medHealMul() { return gameState.run && gameState.run.identity === 'herbalist' ? 1.5 : 1; }

function medHeal(base) {
    if (!base) return 0;
    const v = Math.round(base * medHealMul());
    return base > 0 ? Math.max(base, v) : v;   // 正面回复至少不低于原值，免得四舍五入反而变小
  }

function vampRate() { return nodeLv('combat','f_vamp') > 0 ? 0.30 : 0; }

function execThreshold() { return [0, 0.20, 0.25, 0.30][nodeLv('combat','f_exec')] || 0; }

function revengeBonus() { return [0, 0.20, 0.30, 0.40][nodeLv('combat','f_revenge')] || 0; }

function hasDualDagger() { const w = meleeWeapons(); return w.length >= 2 && w.every(x => !!x.dual); }

function wallBlockBonus() { const lv = nodeLv('combat','f_shield'); return [0, 0.15, 0.20][lv] || 0; }

function wallDurMul() { return [1, 0.80, 0.65, 0.50][nodeLv('combat','f_shield')] || 1; }

function swiftBonus() { return 0; }

function bladeCritBonus() { return [0, 0.20, 0.30][Math.min(2, nodeLv('combat','f_swift'))] || 0; }

function rageAtkMul() { return [1, 1.15, 1.22, 1.30][nodeLv('combat','f_rage')] || 1; }

function rageTakenMul() { return nodeLv('combat','f_rage') > 0 ? 1.10 : 1; }

function ironTakenMul() { return [1, 0.88, 0.82, 0.75][nodeLv('combat','f_iron')] || 1; }

function ironAtkMul() { return nodeLv('combat','f_iron') > 0 ? 0.95 : 1; }

function rageAtkFinal(mul) { return mul * rageAtkMul() * ironAtkMul(); }

function rageTakenFinal(mul) { return mul * rageTakenMul() * ironTakenMul(); }

function bowNodeLv() { return nodeLv('combat','f_bow'); }

function gunNodeLv() { return nodeLv('combat','f_gun'); }

function ammoSaveChance(kind) {   // 弓术 / 枪械精通：不消耗弹药的概率
    if (kind === 'gun') return [0, 0.20, 0.30, 0.40][gunNodeLv()] || 0;
    return [0, 0.15, 0.25, 0.35][bowNodeLv()] || 0;
  }

function skillUpTrunk(kind, optId) {
    const t = treeDef(kind);
    if (!t) return { ok:false, reason:'没有这棵技能树' };
    treeState();
    const opt = t.trunk.find(o => o.id === optId);
    if (!opt) return { ok:false, reason:'没有这个成长选项' };
    const lv = trunkLv(kind);
    if (lv >= SKILL_TRUNK_MAX) return { ok:false, reason:'主干已满级' };
    const cost = trunkCostOf(kind, lv);
    if ((gameState.run.exp[kind] || 0) < cost) return { ok:false, reason:`${t.expName}不足（需 ${cost}）` };
    gameState.run.exp[kind] = Math.round(((gameState.run.exp[kind] || 0) - cost) * 10) / 10;
    const measure=kind==='gather'?{yield:gxYieldMul,speed:gxTimeMul,stam:gxEnergyMul}[optId]:kind==='craft'?{speed:cxTimeMul,refund:cxRefundChance,extra:cxExtraChance}[optId]:null;
    const beforeEffect=measure?Math.round(measure()*100):null;
    gameState.run.skill[kind] = lv + 1;
    gameState.run.skillPicks[kind].push(optId);
    log(`【技能】${t.name}主干升到 ${lv + 1} 级：${opt.name}——${opt.desc}${measure?'（'+beforeEffect+'% → '+Math.round(measure()*100)+'%）':''}。`, 'good');
    save(); change();
    return { ok:true, lv: lv + 1 };
  }

function nodeCheck(kind, id) {
    const t = treeDef(kind); const n = nodeDef(kind, id);
    if (!t || !n) return { ok:false, reason:'没有这个技能' };
    treeState();
    const lv = nodeLv(kind, id);
    // 提示里带上"现在有多少" —— 玩家反馈"这里怎么不能继续往下学了"，光说"需要 N"不够
    const have = Math.floor((gameState.run.exp[kind] || 0));
    if (lv >= n.max) return { ok:false, reason:'已经满级' };
    if (trunkLv(kind) < (n.need || 0)) return { ok:false, reason:`需要${t.name}主干 ${n.need} 级（现在 ${trunkLv(kind)} 级）` };
    if (n.needNode && nodeLv(kind, n.needNode) <= 0) return { ok:false, reason:`需要先学会「${(nodeDef(kind, n.needNode) || {}).name || n.needNode}」` };
    if (n.mutex && nodeLv(kind, n.mutex) > 0) return { ok:false, reason:`与「${(nodeDef(kind, n.mutex) || {}).name}」互斥` };
    const cost = nodeCostOf(kind, n, lv);
    if ((gameState.run.exp[kind] || 0) < cost) return { ok:false, reason:`${t.expName}不足（需 ${cost}，现有 ${have}）` };
    return { ok:true, cost };
  }

function skillNodeLearn(kind, id) {
    const chk = nodeCheck(kind, id);
    if (!chk.ok) return chk;
    const n = nodeDef(kind, id);
    gameState.run.exp[kind] = Math.round(((gameState.run.exp[kind] || 0) - chk.cost) * 10) / 10;
    gameState.run.tree[kind][id] = nodeLv(kind, id) + 1;
    log(`【技能】学会「${n.name}」${gameState.run.tree[kind][id]} 级：${n.desc[gameState.run.tree[kind][id] - 1] || n.desc[n.desc.length - 1]}。`, 'good');
    save(); change();
    return { ok:true, lv: gameState.run.tree[kind][id], cost: chk.cost };
  }

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
    delete gameState.run.tree[kind][id];
    gameState.run.exp[kind] = Math.round(((gameState.run.exp[kind] || 0) + gain) * 10) / 10;
    log(`【技能】你遗忘了「${n.name}」，返还 ${gain} 点${t.expName}。`, 'sys');
    save(); change();
    return { ok:true, gain };
  }

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
    const optId = (gameState.run.skillPicks[kind] || [])[lv - 1];
    const opt = (t.trunk || []).find(o => o.id === optId) || {};
    return { ok:true, lv, optId, optName: opt.name || optId || '主干', cost, gain: Math.floor(cost / 2) };
  }

function skillTrunkForget(kind) {
    const info = trunkForgetInfo(kind);
    if (!info.ok) return info;
    gameState.run.skillPicks[kind] = (gameState.run.skillPicks[kind] || []).slice(0, info.lv - 1);
    gameState.run.skill[kind] = info.lv - 1;
    gameState.run.exp[kind] = Math.round(((gameState.run.exp[kind] || 0) + info.gain) * 10) / 10;
    log(`【技能】你遗忘了主干「${info.optName}」那一级，返还 ${info.gain} 点${treeDef(kind).expName}（主干 ${info.lv} → ${info.lv - 1}）。`, 'sys');
    save(); change();
    return { ok:true, gain: info.gain, lv: gameState.run.skill[kind] };
  }

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
        exp: Math.round((gameState.run.exp[kind] || 0) * 10) / 10,
        picks: gameState.run.skillPicks[kind].slice(), trunk: t.trunk, nodes,
      };
    }
    return out;
  }

function setFocus(kind) {
    if(!gameState.run.furniture.shelf||gameState.run.scene!=='camp'||gameState.run.combat||gameState.run.death||gameState.run.ending||!['craft','gather','combat'].includes(kind))return {ok:false,reason:'请在营地使用书架选择集中方向。'};
    const next=JSON.parse(JSON.stringify(gameState.run));next.bookFocus=kind;const r=persistPair(next,JSON.parse(JSON.stringify(metaState())),false);
    if(r.ok){log('已选择'+({craft:'制造',gather:'采集',combat:'战斗'}[kind])+'集中：对应经验有50%概率翻倍。','good');change();}return r;
  }

function awardExperience(kind,amount,events=1) {
    let total=0,doubles=0;for(let i=0;i<events;i++){const doubled=!!gameState.run.furniture.shelf&&gameState.run.bookFocus===kind&&chance(.5);total+=amount*(doubled?2:1);if(doubled)doubles++;}
    gameState.run.exp[kind]=Math.round(((gameState.run.exp[kind]||0)+total)*10)/10;
    if(doubles)log(({craft:'制造',gather:'采集',combat:'战斗'}[kind])+'集中生效：'+doubles+'次经验翻倍。','good');
    return total;
  }

function expEarned(kind) {
    const lv = Math.max(0, gameState.run.skill[kind] || 0);
    let spent = 0;
    for (let i = 0; i < lv && i < 5; i++) spent += [10, 30, 60, 100, 150][i];
    return (gameState.run.exp[kind] || 0) + spent;
  }

function expLevel(kind) { const e = expEarned(kind); if (e >= 100) return 5; if (e >= 60) return 4; if (e >= 30) return 3; if (e >= 10) return 2; return 1; }
    return Object.freeze({combatLv,gatherLv,treeState,nodeLv,trunkPicks,trunkLv,trunkCostNow,treeDef,nodeDef,nodeSpent,costMul,trunkCostOf,nodeCostOf,nodeSpentOf,gxYieldMul,gxTimeMul,gxEnergyMul,gxPineBonus,gxWoodExtra,cxTimeMul,cxRefundChance,cxExtraChance,cxRepairFree,cxDurMul,cxAtk,cxDef,cxCrit,critMul,sweepNodeLv,sweepCdTotal,sweepMul,medHealMul,medHeal,vampRate,execThreshold,revengeBonus,hasDualDagger,wallBlockBonus,wallDurMul,swiftBonus,bladeCritBonus,rageAtkMul,rageTakenMul,ironTakenMul,ironAtkMul,rageAtkFinal,rageTakenFinal,bowNodeLv,gunNodeLv,ammoSaveChance,skillUpTrunk,nodeCheck,skillNodeLearn,nodeIsLeaf,nodeForgetGain,skillNodeForget,trunkForgetInfo,skillTrunkForget,skillTreeInfo,setFocus,awardExperience,expEarned,expLevel});
  }
  return Object.freeze({create});
})();
