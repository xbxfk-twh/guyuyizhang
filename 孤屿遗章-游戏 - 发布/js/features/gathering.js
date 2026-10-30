/* gathering：业务规则的唯一实现；Game 保留调用接口与装配。 */
const GatheringRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const rnd=(...args)=>deps.rnd(...args);
    const chance=(...args)=>deps.chance(...args);
    const pick=(...args)=>deps.pick(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const qtyParse=(...args)=>deps.qtyParse(...args);
    const invCount=(...args)=>deps.invCount(...args);
    const hasItem=(...args)=>deps.hasItem(...args);
    const notifyBagFull=(...args)=>deps.notifyBagFull(...args);
    const addItem=(...args)=>deps.addItem(...args);
    const removeItem=(...args)=>deps.removeItem(...args);
    const selectedTool=(...args)=>deps.selectedTool(...args);
    const bestToolTier=(...args)=>deps.bestToolTier(...args);
    const autoToolsEnabled=(...args)=>deps.autoToolsEnabled(...args);
    const wearSelectedTool=(...args)=>deps.wearSelectedTool(...args);
    const autoToolkit=(...args)=>deps.autoToolkit(...args);
    const drainById=(...args)=>deps.drainById(...args);
    const hasTool=(...args)=>deps.hasTool(...args);
    const applyHarm=(...args)=>deps.applyHarm(...args);
    const lanternRiskMul=(...args)=>deps.lanternRiskMul(...args);
    const addMin=(...args)=>deps.addMin(...args);
    const gainItem=(...args)=>deps.gainItem(...args);
    const seasonInfo=(...args)=>deps.seasonInfo(...args);
    const isNight=(...args)=>deps.isNight(...args);
    const triggerStory=(...args)=>deps.triggerStory(...args);
    const die=(...args)=>deps.die(...args);
    const sceneOf=(...args)=>deps.sceneOf(...args);
    const canTravel=(...args)=>deps.canTravel(...args);
    const staminaCost=(...args)=>deps.staminaCost(...args);
    const travel=(...args)=>deps.travel(...args);
    const triggerRandomEvent=(...args)=>deps.triggerRandomEvent(...args);
    const showOverlay=(...args)=>deps.showOverlay(...args);
    const gxYieldMul=(...args)=>deps.gxYieldMul(...args);
    const gxTimeMul=(...args)=>deps.gxTimeMul(...args);
    const gxEnergyMul=(...args)=>deps.gxEnergyMul(...args);
    const gxPineBonus=(...args)=>deps.gxPineBonus(...args);
    const gxWoodExtra=(...args)=>deps.gxWoodExtra(...args);
    const awardExperience=(...args)=>deps.awardExperience(...args);
    const startFight=(...args)=>deps.startFight(...args);
    const diaryAdd=(...args)=>deps.diaryAdd(...args);
    const doPeakRitual=(...args)=>deps.doPeakRitual(...args);
    const nightmareEncounter=(...args)=>deps.nightmareEncounter(...args);
    const achUnlock=(...args)=>deps.achUnlock(...args);
function pointsOf() {
    const sc = sceneOf(gameState.run.scene);
    if (sc.zones) {
      const z = gameState.run.zone ? sc.zones[gameState.run.zone] : sc.zones[Object.keys(sc.zones)[0]];
      return (z && z.points) || [];
    }
    return sc.points || [];
  }

function lightLevel() { if (invCount('lightStrong') > 0) return 3; if (invCount('lightWeak') > 0) return 2; if (invCount('goggles') > 0) return 1; return 0; }

function altarReady(p) {
    return !!p && p.id === 'peak_altar' && !gameState.run.flags.ended_C && hasItem('relic') && invCount('slate') >= 3 && hasItem('dragonbone');
  }

function onceRewardMissing(p) {
    if (!p || !p.once || !gameState.run.flags['pt_' + p.id]) return false;
    if (p.id === 'peak_altar') return !hasItem('relic') && !gameState.run.flags.ended_C;   // 没遗物 = 当时没拿走
    return false;
  }

function pointAvailable(p) {
    if (!p) return false;                     // 兜底：坏点位（数据缺项/找不到 id）不该让整局崩掉
    if (riverNetBanned(p)) return false;
    // 山顶祭坛例外：遗物虽然拿过了，但凑齐"遗物+石板×3+龙骨"要能再点开举行仪式（结局 C 的入口）
    if (p.once && gameState.run.flags['pt_'+p.id] && !altarReady(p) && !onceRewardMissing(p)) return false;
    if (p.firstDays && gameState.run.day > p.firstDays) return false;   // 仅前N天有，过期不可用
    if (p.id === 'grass_horse' && gameState.run.flags.horse) return false;   // 野马已驯服则不再出现
    if (p.id === 'sea_rescue' && gameState.run.flags.xiaoman) return false;  // 小满已经在营地里了（老存档没打标记也能收口）
    if (p.id === 'peak_slate' && gameState.run.flags.slateGuardDone) return false;   // 石板守卫已击败
    if (p.id === 'grass_wolfden' && gameState.run.flags.wolfKingDone) return false;   // 狼王已击败
    if (p.id === 'sea_pirate') { if (gameState.run.day < 20) return false; }   // 第20天起可反复讨伐（每天一次）
    if (p.daily) { const used = (gameState.run.pointUses[p.id] || 0); if (used >= p.daily) return false; }
    if (p.cond) {
      if (p.cond.rain && !(gameState.run.weather==='rain'||gameState.run.weather==='storm')) return false;
      if (p.cond.season && !p.cond.season.includes(seasonInfo().name)) return false;
      if (p.cond.day && gameState.run.day < p.cond.day) return false;
      // ⚠️ 例外：「海盗出没」不吃 dayMod 的整点门槛 —— 头目每 5 天露面一次，但**其余日子船上有小喽啰**，
      //    所以点位每天都能来（作者 2026-09-22 定案）。谁出场由 doPoint 里按天分流决定。
      if (p.cond.dayMod && p.id !== 'sea_pirate' && (gameState.run.day % p.cond.dayMod) !== 0) return false;   // 例：海盗船长只在 5 的倍数天露面
      if (p.cond.boat) {
        const rank = { none:0, raft:1, boat:2, ship:3, ocean:4 };
        const dock = BUILDING_CHAINS.dock[gameState.run.buildings.dock];
        if (rank[dock.boat] < rank[p.cond.boat]) return false;
      }
      if (p.cond.houseBelow && gameState.run.buildings.house >= p.cond.houseBelow) return false;
    }
    if (p.nightOnly && !isNight()) return false;
    if (p.needLight && lightLevel() < p.needLight) return false;
    if (p.needCore && invCount('deepCore') < p.needCore) return false;
    if (p.need) {
      if (p.need.tool && !hasTool(p.need.tool, p.need.tier || 1)) return false;
      if (p.need.item && !hasItem(p.need.item)) return false;
    }
    return true;
  }

function shortPt(p) { return (p.name || '').replace(/[圈丛坡滩矿点露头层径点区场堆湾深处风带洞]/g, '') || '它'; }

function pointStatus(p) {
    if (!p) return '这里现在做不了这件事。';
    if (riverNetBanned(p)) return '先前竭泽而渔了，现在暂时看不到鱼的踪迹。';
    if (!pointAvailable(p)) {
      if (p.needLight && lightLevel() < p.needLight) return `太黑了，需要${['','潜水护目镜','弱光防水手电','防水强光潜水手电'][p.needLight] || '照明装备'}才能探索这里。`;
      if (p.needCore && invCount('deepCore') < p.needCore) return `圣殿之门需要 ${p.needCore} 块深殿核心（当前 ${invCount('deepCore')} 块）。去四片海域的遗迹里找齐吧。`;
      if (p.need && p.need.item && !hasItem(p.need.item)) {
        if (p.need.item === 'torch') return '洞里太黑，需要火把才能深入。先做一支火把吧。';
        if (p.need.item === 'rod') return '需要鱼竿才能垂钓。编一根竹鱼竿吧。';
        return `需要${ITEMS[p.need.item].name}。`;
      }
      if (p.need && p.need.tool && !hasTool(p.need.tool, p.need.tier||1)) {
        const tier = p.need.tier || 1;
        const available=selectedTool(p.need.tool,true);
        if(available && available.tier>=tier)return `已有${ITEMS[available.id].name}，请装备到工具栏，或在设置中开启「自动取用工具」。`;
        // ⚠️ 名字必须和物品表一致（作者 2026-09-25："割树脂显示改成需要石质匕首（命名一致防止玩家误解）"）：
        //    这里原来硬写「石刀」，可物品早就叫「石质匕首」了。现在按 tool.kind + tier 反查真名，
        //    斧/镐/锄/网的文案也跟着统一（石斧、铁镐…），不再出现对不上的旧名字。
        const tKey = Object.keys(ITEMS).find(k => ITEMS[k].tool && ITEMS[k].tool.kind === p.need.tool && (ITEMS[k].tool.tier || 1) === tier);
        const tN = tKey ? ITEMS[tKey].name : ({ axe:'斧', pick:'镐', knife:'匕首', hoe:'锄', net:'渔网' }[p.need.tool] || '工具');
        if (tier === 1) return `需要一把${tN}。用燧石打一把${tN}吧。`;
        return `需要${tN}（${tier} 级）才能凿动这里。`;
      }
      if (p.nightOnly && !isNight()) return `${p.name}只在夜里才有动静——天黑再来吧。`;
      if (p.cond && p.cond.rain && !(gameState.run.weather === 'rain' || gameState.run.weather === 'storm')) return `或许应该等雨天再来找${shortPt(p)}。`;
      if (p.cond && p.cond.season && !p.cond.season.includes(seasonInfo().name)) return `${shortPt(p)}只在${p.cond.season.join('、')}才有，现在不是时候。`;
      if (p.cond && p.cond.day && gameState.run.day < p.cond.day) return `要等到第${p.cond.day}天后才会有线索。`;
      if (p.cond && p.cond.dayMod && (gameState.run.day % p.cond.dayMod) !== 0) {
        const nextDay = gameState.run.day + (p.cond.dayMod - (gameState.run.day % p.cond.dayMod));
        return `海面上今天没有船影——${shortPt(p)}每 ${p.cond.dayMod} 天才会露面一次，下一次是第 ${nextDay} 天。`;
      }
      if (p.daily && (gameState.run.pointUses[p.id]||0) >= p.daily) return '今天这里已经采过了，明天再来吧。';
    if (p.once && gameState.run.flags['pt_'+p.id] && !altarReady(p)) return '这里你早已搜刮过。';
      if (p.id === 'grass_horse' && gameState.run.flags.horse) return '这匹野马已被你驯服了。';
      return '现在还做不了这件事。';
    }
    return 'ok';
  }

function riverNetBanned(p) {
    if (!p || p.id !== 'river_net') return false;
    return (gameState.run.flags.riverNetBan || 0) >= gameState.run.day;
  }

function pointMinutes(p, tier) {
    const tt=tier ?? (p.need?.tool ? bestToolTier(p.need.tool) : 1);
    const slow=(gameState.run.stats.spirit ?? 100)<20 && ['gather','fish','trap','drift'].includes(p.type) ? 1.1 : 1;
    return Math.max(1,Math.round((p.time||15)*(1-(tt-1)*0.2)*slow*gxTimeMul()));
  }

function pointEnergy(p) {
    const tt=p.need && p.need.tool ? bestToolTier(p.need.tool) : 1;
    return staminaCost(Math.max(2,Math.round((p.energy || 10)*(1-(tt-1)*0.12)*gxEnergyMul())));
  }

function pointReason(p) {
    if (!pointAvailable(p)) return '现在做不了这件事。';
    if (gameState.run.stats.stamina < pointEnergy(p)) return '体力不支，先休息吧。';
    return null;
  }

function doPoint(p) {
    if (!autoToolsEnabled() && (!gameState.run.toolkit || !gameState.run.toolkit.some(Boolean))) autoToolkit();
    if (!pointAvailable(p)) { const why = pointStatus(p); log(why && why !== 'ok' ? why : '现在做不了这件事。', 'warn'); return; }
    const st = gameState.run.stats;
    const usedTool = p.need?.tool ? selectedTool(p.need.tool) : null;
    const tt = usedTool?.tier || 1;   // 本次收益与磨损绑定同一件工具
    const en = pointEnergy(p);   // 工具等级越高越省体力；技能树的「耐劳/精细/粗放」也在这里生效
    if (st.stamina < en && !['farm','trade','townTrade','townMission','townInfo','atlTrade'].includes(p.type)) { log('体力不支，先休息吧。','warn'); return; }
    if (['gather','fish'].includes(p.type) && gameState.run._nightmareHarvestPass !== p.id) {
      if (nightmareEncounter('gather')) {
        gameState.run.nightmareHarvest={id:p.id,scene:gameState.run.scene,zone:gameState.run.zone};
        gameState.run._onFightWin=()=>{gameState.run.nightmareHarvest=null;gameState.run._nightmareHarvestPass=p.id;try{doPoint(p);}finally{gameState.run._nightmareHarvestPass=null;}};
        return;
      }
    }
    const diff = DIFFICULTIES[gameState.run.difficulty].resMul;
    let ambush = null;   // 本次采集的遇袭判定结果（先记下，采集结算完再开战）

    // 采集守护（雪羽鹰守矿脉 / 深殿核心的守卫）：必须先打倒守卫，打完再重新走一遍本函数真正采集。
    // 关键：这一判定要在「计次、打一次性标记、扣体力」之前——否则守卫会把这次采集机会顶掉，
    // 一次性点位（如深殿核心）会永久失去奖励。
    if (p.guard && gameState.run._guardPass !== p.id && chance(p.guardChance === undefined ? 0.8 : p.guardChance)) {
      const gid = Array.isArray(p.guard) ? p.guard[Math.floor(Math.random() * p.guard.length)] : p.guard;
      if (ENEMIES[gid]) {
        log(`你刚动手，${ENEMIES[gid].name}就扑了过来——先解决它！`, 'danger');
        gameState.run._guardPass = p.id;
        gameState.run._onFightWin = () => { doPoint(p); };
        startFight(ENEMIES[gid]);
        return;   // 不扣体力、不占次数、不消耗一次性点位
      }
    }
    // 山顶石像拦路（雪莲 / 秘银）：50% 概率触发，玩家可以跑，也可以殊死一搏。
    // 和守卫一样：先问、后算，选"打"就先开战，赢了再回来采（次数与体力都没被扣）。
    if (p.guardChoice && gameState.run._guardPass !== p.id && chance(p.guardChoice.chance)) {
      const gid = p.guardChoice.enemy;
      if (ENEMIES[gid]) {
        gameState.run._guardPass = p.id;
        gameState.run._onFightWin = () => { doPoint(p); };
        showOverlay({ title:'石像动了', text:`你刚要动手，碑前的石像轰然转过身——${ENEMIES[gid].name}踩着碎石朝你冲了过来！`, choices:[
          { label:'不采了，直接跑', hint:'放弃这次采集，不扣当日次数，只花 10 分钟脱身', ok:()=>{
            gameState.run._guardPass = null; gameState.run._onFightWin = null;
            addMin(10);
            log(`你把工具一丢，连滚带爬退下雪线——${ENEMIES[gid].name}停在碑前，没有追。`, 'warn');
            change();
          } },
          { label:'殊死一搏', hint:'打倒它再从容采摘', ok:()=>{
            log(`${ENEMIES[gid].name}的石拳砸在地上，碎石四溅！`, 'danger');
            startFight(ENEMIES[gid], true);
          } },
        ]});
        return;
      }
    }
    if (gameState.run._guardPass === p.id) gameState.run._guardPass = null;   // 打完了：清掉放行标记，继续这次采集

    // ⚠️ 弹窗类点位（耕地 / 交易 / 告示板 / 酒馆…）本身不"干活"，也不该动体力或当日次数：
    //    它们只是打开一个界面，真正的动作（开垦/播种/收获/买卖）由弹窗里的按钮各自结算。
    //    以前这判断放在类型分发里（很靠后），而通用扣体力在上面先执行了 ——
    //    结果【每打开一次耕地弹窗就白扣 10 体力】（farm_plant 带 energy:10 且 daily:3，一天能白烧 30）。
    //    必须在任何扣除之前就返回。
    const MODAL_TYPES = ['farm', 'trade', 'townTrade', 'townMission', 'townInfo', 'atlTrade'];
    if (MODAL_TYPES.includes(p.type)) {
      // ⚠️ 这里必须把"点位类型"映射成"弹窗 kind"：ui.js 的 onOverlay 认的是短名
      //    （town / mission / info / black / atlTrade），直接把 p.type 传出去的话
      //    盐镇集市、告示板、酒馆、黑市全都会渲染成空壳弹窗。
      const overlayKind = p.type === 'townTrade' ? 'town' : p.type === 'townMission' ? 'mission'
        : p.type === 'townInfo' ? 'info' : (p.type === 'trade' && p.id === 'cove_black') ? 'black'
        : (p.type === 'trade' && p.id === 'atl_fishman') ? 'fishman' : p.type;
      if (deps.onOverlay) deps.onOverlay({ kind: overlayKind, title: p.name, p });
      return;
    }

    // ⚠️ 扣体力/扣当日次数统一走这里 —— "确认这次真能干成"之后才调。
    //    玩家反馈"不满足条件点进不去、体力却照扣"，根子就是有些分支在下面扣完钱才 return。
    const pointCharge = () => {
      gameState.run.pointUses[p.id] = (gameState.run.pointUses[p.id] || 0) + 1;
      // ⚠️ 一次性点位**不能在这里**打标记：adventure 类点位是先弹窗、等玩家选完才给奖励，
      // 提前打标记会让 adventure() 读到"自己刚打上的 pt_ 标记"而直接跳到"这里已被搜刮"分支
      // （山顶祭坛就是这样永远拿不到遗物的）。adventure 类由 reward 回调里的 markDone() 负责打标记。
      if (p.once && p.type !== 'adventure') gameState.run.flags['pt_'+p.id] = 1;
      st.stamina -= en;
      const dm2 = (DIFFICULTIES[gameState.run.difficulty] && DIFFICULTIES[gameState.run.difficulty].drainMul) || 1;
      st.hunger = Math.max(0, st.hunger - Math.round(4 * dm2));
      st.thirst = Math.max(0, st.thirst - Math.round(5 * dm2));
    };

    // ---- 动手之前先确认"这次真的能进行"（不能干的事一律不扣体力、不占当日次数）----
    // 狩猎：猎物是随机抽的，可能抽不到（比如全是夜行猎物、白天来）；首领还要先弹"确定讨伐？"。
    //       以前这些都发生在扣费之后 → 玩家在蛛巢点开、看到蜘蛛女王、点撤退，体力就白没了，
    //       而且当日次数也被占掉，再点只会显示"今天这里已经来过了"。
    let huntTarget = null;
    if (p.type === 'hunt') {
      // 过滤器：夜行猎物白天不出现；带 minDay 的（洞穴熊=第30天起）没到日子也不出现
      // ⚠️ 山洞里的洞穴熊：作者 2026-09-17 定「山洞内一直有概率出现洞穴熊」——所以洞内狩猎点
      //    （p.id 以 cave_ 开头）不吃 minDay 门槛，洞外拦路那条还按第 30 天起算。
      const caveNow = /^cave_/.test(p.id || '');
      let pool = p.enemies.map(e => ENEMIES[e]).filter(e => e && !(e.nightOnly && !isNight()) && (caveNow || !e.minDay || gameState.run.day >= e.minDay));
      // 「海盗出没」作者 2026-09-22 定案：**海盗头目不是每次都在**。
      //   头目按 cond.dayMod（每 5 天）出现一次；其余日子船上只有小喽啰（海盗×2）。
      //   这样这个点位每天可刷、不会空转，玩家也能稳定练手/取材，而头目的稀有掉落不会被刷烂。
      if (p.id === 'sea_pirate') {
        const bossDay = !p.cond || !p.cond.dayMod || (gameState.run.day % p.cond.dayMod === 0);
        pool = bossDay ? pool.filter(e => e.boss) : pool.filter(e => !e.boss);
        if (!pool.length) pool = [ENEMIES.pirate].filter(Boolean);
        // 非头目日固定来两只小喽啰（作者要求"放上海盗小怪"，不是 50% 概率来一只——
        // 那样这个点位有时只剩一只杂兵，点起来很没意思）
        if (!bossDay) {
          const tg0 = pool[0];
          if (tg0 && !tg0.boss) {
            pointCharge();
            // ⚠️ 小喽啰日必须用 textMinion：以前这里直接 log(p.text)，而 p.text 写的是
            //    "船长站在船头磨刀——是海盗头目！"，于是打两只杂兵也在喊头目来了
            //    （作者 2026-09-23 反馈"普通海盗的文案和海盗头目的文案一样"）。
            log(p.textMinion || p.text);
            startFight([tg0, tg0], true);
            return;
          }
        }
      }
      if (!pool.length) { log('现在这里没有猎物。', 'warn'); return; }
      huntTarget = pick(pool);
      if (huntTarget.id === 'boneguard' && !isNight()) huntTarget = ENEMIES['scorpion'];
      if (huntTarget.boss) {
        const tgt = huntTarget;
        showOverlay({ title:'危险 · ' + tgt.name, text:'此怪物异常强大，需要做好充足准备。确定讨伐？', choices:[
          { label:'迎战', ok:() => { pointCharge(); log(p.text); startFight(tgt, true); } },
          { label:'撤退', ok:() => { log('你谨慎地退了回去，从长计议。', 'sys'); } },
        ]});
        return;
      }
    }
    // 海底闸门：船/装备不够就先说清楚，别扣了体力才告诉玩家进不去
    if (p.type === 'atlantisGate') {
      const chkPre = canTravel('atlantis');
      if (!chkPre.ok) { log(chkPre.reason, 'warn'); return; }
    }

    // 守卫已清（或无守卫）且确认能干：这里才真正开始本次采集
    pointCharge();
    // 采集类先扣时间（作者 2026-09-19：先花时间，再遇怪，打赢才收获）——末尾那次 addMin 会跳过它
    const timePaidEarly = (p.type === 'gather');
    if (timePaidEarly) {
      addMin(pointMinutes(p,tt));
    }

    if (p.type === 'gather') {
      // ⚠️ 作者 2026-09-19 定次序：**先花时间 → 可能遇到怪（打赢再继续）→ 才收获**。
      //    以前是先把产出算完、日志写"获得：…"，最后才扣时间；真遇到怪时东西也已经进包了，
      //    日志看着像"白拿到手之后才花时间"。现在遇袭就先去打，赢了（S._onFightWin）再回来收。
      {
        const sc0 = sceneOf(gameState.run.scene);
        const danger = sc0 ? sc0.danger : 3;
        const pool = (typeof AMBUSH_MONSTERS !== 'undefined' ? AMBUSH_MONSTERS[gameState.run.scene] : []) || [];
        let amb = 0.10, rabbit = 0;
        if (danger <= 2) { amb = 0.05; rabbit = 0.10; }
        else if (danger >= 4) { amb = 0.20; }
        const protection = lanternRiskMul();
        amb *= protection; rabbit *= protection;
        if (rabbit && chance(rabbit) && ENEMIES.rabbit) ambush = ENEMIES.rabbit;
        else if (pool.length && chance(amb)) ambush = ENEMIES[pool[Math.floor(Math.random() * pool.length)]];
        if (!ambush && p.risk && ENEMIES[p.risk] && chance(0.25 * protection)) ambush = ENEMIES[p.risk];
        // 海底远程精英（深海哨兵）：只在中层黑暗及以上（照明 ≥2）出没，作者 2026-09-19
        if (!ambush && gameState.run.scene === 'atlantis' && lightLevel() >= 2 && ENEMIES.atlSentry && chance(0.12)) ambush = ENEMIES.atlSentry;
      }
      const doHarvest = () => {
      let got = [];
      let weff = (gameState.run.scene === 'atlantis') ? 1 : WEATHER[gameState.run.weather].eff;
      if (p.id === 'river_snow') weff = 1; // 降雪不应反过来减少可收集的积雪；季节减产仍保留。
      if (p.cond && p.cond.rain && (gameState.run.weather === 'rain' || gameState.run.weather === 'storm')) weff = 1.0;   // 雨天专属资源(蘑菇等)雨天不扣收益
      if (weff < 1 && gameState.run.weatherWarned !== gameState.run.weather) { gameState.run.weatherWarned = gameState.run.weather; log(`【${WEATHER[gameState.run.weather].name}】干活收益会打折扣（-${Math.round((1 - weff) * 100)}%，雨天专属资源除外）。`, 'warn'); }
      let bagFull = 0;
      for (const y of p.yields) {
        if (y.chance && !chance(y.chance)) continue;
        let q = qtyParse(y.min === undefined ? 1 : y.min);
        if (y.max !== undefined) q = rnd(y.min, y.max);
        // 季节采集倍率（数值平衡 P2-3a）：SEASONS 里写着 gatherMul（春 1.1 / 冬 0.6），
        // 季节描述也写着"采集+10%""严寒采集-40%"，但产量公式**从来没读过这个字段** —— 死数据。
        // 接上之后，"冬天外出采集变少"这条设计才真正兑现。
        const seasonMul = seasonInfo().gatherMul || 1;
        const exact=q * diff * weff * (1 + (tt - 1) * 0.18) * gxYieldMul() * seasonMul;
        // 高级工具的零头跨次累计，不再每次独立取整抹掉收益。低于1的保底不欠债。
        const carryKey=`${p.id}:${y.id}:${tt}`;
        const carry=tt>1 && Number.isFinite(gameState.run.gatherRemainders?.[carryKey]) ? Math.max(-0.5,Math.min(0.5,gameState.run.gatherRemainders[carryKey])) : 0;
        q=Math.max(1,Math.round(exact+carry));
        if(tt>1 && exact>=1){gameState.run.gatherRemainders=gameState.run.gatherRemainders||{};gameState.run.gatherRemainders[carryKey]=exact+carry-q;}

        if (y.id === 'wood' && gameState.run.identity === 'woodcutter') q = Math.round(q * 1.5);
        if ((y.id === 'herb') && gameState.run.identity === 'herbalist') q = q * 2;
        // ⚠️ 装不下就不能算"获得"：以前无条件 push 到 got，背包满时日志喊"获得×N"其实没进包
        if (gainItem(y.id, q)) {
          const prefix = `${ITEMS[y.id].name}×`, existing = got.findIndex(v => v.startsWith(prefix));
          if (existing >= 0) got[existing] = prefix + (Number(got[existing].slice(prefix.length)) + q);
          else got.push(prefix + q);
        }
        else bagFull++;
      }
      // 伐木专精：每次砍树额外 +0.5 / +1 木材。0.5 这种零头攒够 1 份才给（日志写明是技能给的）
      if (gxWoodExtra() > 0 && p.need && p.need.tool === 'axe' && (p.yields || []).some(y => y.id === 'wood')) {
        gameState.run.woodBonus = (gameState.run.woodBonus || 0) + gxWoodExtra();
        const ex = Math.floor(gameState.run.woodBonus);
        if (ex > 0) {
          gameState.run.woodBonus -= ex;
          if (gainItem('wood', ex)) { got.push(`木材×${ex}`); log(`【伐木专精】额外多得 木材×${ex}。`, 'good'); }
        }
      }
      if (bagFull) { log('本次采集物资未能收入背包。', 'danger'); notifyBagFull(); }
      if (p.text) log(p.text);
      // 砍树彩蛋：所有身份通用，10% 概率遇到超大美人松，额外 +7 木材；连着两次遇上解锁紫成就
      if (p.need && p.need.tool === 'axe' && (p.yields || []).some(y => y.id === 'wood')) {
        if (chance(0.1 + gxPineBonus())) {
          gainItem('wood', 7);
          log('人品爆发，遇见一颗超大美人松~ 额外木材 +7', 'blue');
          // 别在"获得"清单里另起一个名字，免得玩家以为"美人松木材"是另一种材料——直接并进木材那一项
          const wi = got.findIndex(s => s.indexOf('木材×') === 0);
          if (wi >= 0) got[wi] = `木材×${parseInt(got[wi].slice(3), 10) + 7}`;
          else got.push('木材×7');
          gameState.run.pineStreak = (gameState.run.pineStreak || 0) + 1;
          if (gameState.run.pineStreak >= 2) achUnlock('bigPine');
        } else {
          gameState.run.pineStreak = 0;   // 断了一次就得重新连
        }
      }
      if (p.rareFishChance && chance(p.rareFishChance)) {
        const RF = ['rareFishA','rareFishB','rareFishC','rareFishD','rareFishE'];
        const rid = RF[Math.floor(Math.random() * RF.length)];
        if (gainItem(rid, 1)) got.push(`${ITEMS[rid].name}×1`);
        log(`网里还兜着一条罕见的鱼：${ITEMS[rid].name}！`, 'good');
      }
      if (got.length) log(`获得：${got.join('、')}。`, 'good');
      else log('一无所获。', 'warn');
      // 河畔撒网 = 竭泽而渔：这一网之后河湾要空几天
      if (p.id === 'river_net') {
        gameState.run.flags.riverNetBan = gameState.run.day + 1;
        log('这一网让河湾需要休整：明天不能再撒网，但仍可用鱼竿垂钓。', 'sys');
      }
      awardExperience('gather',deps.EXP_GATHER);
      if (p.need) { if (p.need.tool) wearSelectedTool(usedTool); if (p.need.item && DURA[p.need.item] !== undefined) drainById(p.need.item); }
      };
      // 真遇上怪：先去打，赢回来再收（打不过/跑掉就是白花这段时间）
      if (gameState.run._nightmareHarvestPass === p.id) ambush=null;
      if (ambush) { log(`你刚动手，${ambush.name}突然窜了出来！`, 'danger'); gameState.run._onFightWin = doHarvest; startFight(ambush); return; }
      doHarvest();
    } else if (p.type === 'fish') {
      let q = rnd(1,3) * diff;
      if (gameState.run.identity === 'fisher') q = Math.round(q * 1.5);
      q = Math.max(1, Math.round(q * (WEATHER[gameState.run.weather].eff)));
      const intoBag = gainItem('fish', q);
      log(p.text || '鱼线一动，你提起一条银亮的鱼。');
      if (intoBag) log(`获得：鱼×${q}。`, 'good');
      awardExperience('gather',deps.EXP_GATHER);
      if (p.need && p.need.item && DURA[p.need.item] !== undefined) drainById(p.need.item);
    } else if (p.type === 'hunt') {
      // 猎物已经在上面 pre-flight 里抽好（首领还得等玩家点"迎战"才会扣费开打）
      log(p.text);
      startFight(huntTarget);
    } else if (p.type === 'trap') {
      if (!removeItem('trap', 1)) { log('没有陷阱了。', 'warn'); return; }
      gameState.run.traps = gameState.run.traps || { placed: 0 };
      gameState.run.traps.placed++;
      gameState.run.traps.day = gameState.run.day;
      // 立刻更新晨报里的陷阱条目：让玩家在"每日晨报"里能看到"已经埋好了，等明天"
      gameState.run.dailyReport = gameState.run.dailyReport || { day: gameState.run.day, ranch: null, trap: null };
      gameState.run.dailyReport.trap = { waiting: true, placed: gameState.run.traps.placed };
      log('你在兽径上布下陷阱，明天去草地上看看有没有收获。', 'good');
      awardExperience('gather',deps.EXP_GATHER);
    } else if (p.type === 'drift') {
      if (chance(0.6)) {
        const roll = Math.random();
        if (roll < 0.5) { const q = rnd(1,3); gainItem('wood', q); log(`你捞起几根上游漂来的木头（木材×${q}）。`, 'good'); }
        else if (roll < 0.8) { gainItem('plank', 1); log('你捞起一块完整的木板。', 'good'); }
        else if (roll < 0.9) { gainItem('driftbottle', 1); log('一个漂流瓶！你把它捞了上来。', 'good'); triggerStory({ id:'e_driftbottle' }); }
        else { log('只有水草和泡沫。'); }
      } else { log('今天河里很干净，什么也没漂来。'); }
      awardExperience('gather',deps.EXP_GATHER);
    } else if (p.type === 'adventure') {
      adventure(p);
    } else if (p.type === 'atlantisGate') {
      const chk0 = canTravel('atlantis');
      if (!chk0.ok) { log(chk0.reason, 'warn'); return; }
      log('你朝沟底那点微光游去……');
      if (deps.onOverlay) { deps.onOverlay({ kind:'atlAnim' }); return; }
      travel('atlantis'); return;
    } else {
      // （farm / trade / townTrade / townMission / townInfo / atlTrade 这些弹窗类点位
      //   已在前面统一提前返回，不会走到这里，也不再扣体力/当日次数）
    }

    // 精神见底（<20）时手会抖、脑子发木：采集类点位耗时 +10%
    const spiritLow = (st.spirit === undefined ? 100 : st.spirit) < 20;
    const spiritSlow = (spiritLow && ['gather','fish','trap','drift'].includes(p.type)) ? 1.1 : 1;
    // 工具每高一级，干活快 20%（斧/镐/刀/网都一样）
    if (!timePaidEarly) addMin(Math.max(1, Math.round((p.time || 15) * (1 - (tt - 1) * 0.2) * spiritSlow * gxTimeMul())));
    if (['gather','fish','trap','drift'].includes(p.type)) gameState.run.gatherCount = (gameState.run.gatherCount || 0) + 1;
    if (p.type === 'gather' && chance(0.05)) triggerRandomEvent(gameState.run.scene);
    change();
  }

function adventure(p) {
    const id = p.id;
    // adventure 类点位是"先弹窗、玩家选完才给奖励"，所以一次性标记要等真正拿到东西才打。
    // 否则玩家关掉弹窗/选了"算了"，这个只该搜刮一次的点位就白白作废（山顶祭坛拿不到遗物就是这个坑）。
    const markDone = () => { if (p.once) gameState.run.flags['pt_' + p.id] = 1; };
    // 同上兜底，给"提前 return 的那几个弹窗"（求救信号 / 石碑 / 石板 / 祭坛）用：
    const showOnce = (opts) => {
      (opts.choices || []).forEach(c => {
        const orig = c && c.ok; if (typeof orig !== 'function') return;
        c.ok = function () {
          if (p.once && gameState.run.flags['pt_' + p.id] && !altarReady(p) && !onceRewardMissing(p)) { log(pointStatus(p) || '这里你早已搜刮过。', 'warn'); return; }
          return orig.apply(this, arguments);
        };
      });
      showOverlay(opts);
    };
    const choices = [];
    if (id === 'forest_hive') {
      // 养蜂人：蜂群认得他 —— 必定拿到蜂蜜，还额外多产（30% +1、10% 再 +2），也不会被蛰
      {
        const isBee = (gameState.run.identity === 'beekeeper');
        choices.push({ label:'冒险取蜜', hint: isBee ? '养蜂人：必定得蜂蜜，还有额外收获、不会被蛰' : '得蜂蜜×1·可能被蜂蛰（-8 生命/中毒）', text:'你屏住呼吸，把手伸进蜂巢。', ok:()=>{
          if (isBee) {
            let q = 1;
            if (chance(0.30)) q += 1;
            if (chance(0.10)) q += 2;
            if (gainItem('honey', q)) log(`蜂群认得你，乖乖让开了——获得：蜂蜜×${q}。`, 'good');
            addMin(20);
            return;
          }
          if (chance(0.6)) { if (gainItem('honey',1)) log('你抢到了一块滴着蜜的蜂房！获得：蜂蜜×1。','good'); }
          else { applyHarm(8); gameState.run.statuses.poison = Math.max(gameState.run.statuses.poison, 3); log('野蜂疯狂扑来！你被蛰得满头包。（-8 生命，中毒）','danger'); if (gameState.run.stats.hp<=0) die('野蜂的毒要了你的命。'); }
          addMin(20);
        } });
      }
      choices.push({ label:'还是算了', hint:'无风险', ok:()=>{ log('你悄悄退开，蜂群没有发现你。'); } });
    } else if (id === 'quarry_pit') {
      choices.push({ label:'进去看看', hint:'可能遇蜘蛛，或得矿石', ok:()=>{ if (chance(0.35)) { log('蛛网后闪过黑影！'); startFight(ENEMIES.spider); } else { gainItem('stone', rnd(2,4)); gainItem('ironore', rnd(1,2)); log('你在废矿坑里敲下不少矿石。','good'); addMin(30);} } });
      choices.push({ label:'太黑了，退出来', hint:'无风险', ok:()=>{ log('你退回了阳光下。'); } });
    } else if (id === 'grass_horse') {
      choices.push({ label:'慢慢接近', hint:'消耗茅草×5 · 50%驯服(赶路-30%)，失败次日可再试', ok:()=>{
        if (!hasItem('thatch', 5)) { log('野马警觉地后退。你需要 5 根茅草(当草料)来慢慢接近它。', 'warn'); return; }
        removeItem('thatch', 5);
        if (chance(0.5)) { gameState.run.flags.horse = 1; log('野马接受了你的草料，从此营地有了马。赶路时间-30%！','good'); diaryAdd('我驯服了一匹野马。'); }
        else { applyHarm(10); log('野马受了惊，把你掀翻在地，草料也被它扬了。（-10 生命，明日可再试）','danger'); if (gameState.run.stats.hp<=0) die('野马的一蹄要了你的命。'); }
        addMin(30); } });
      choices.push({ label:'不打扰它', hint:'无风险', ok:()=>{ log('你远远看了一会儿，走开了（明日可再来）。'); } });
    } else if (id === 'desert_remains') {
      // 白骨旁的破包裹只搜一次：翻过就没了（无论翻到金币还是被沙蝎咬）。
      // 以前没打标记 → 能反复翻，等于无限金币。选"合十离开"不打标记，后悔了还能回来翻。
      choices.push({ label:'搜刮包裹', hint:'可能得金币，或窜出沙蝎（-8 生命）', ok:()=>{ if (chance(0.5)) { const n = rnd(2,4); if (gainItem('coin', n)) log(`破包裹里竟有几枚古金币！获得：金币×${n}。`,'good'); } else { applyHarm(8); log('包裹里窜出一条沙蝎！（-8 生命）','danger'); if (gameState.run.stats.hp<=0) die('你倒在了白骨旁。'); } markDone(); addMin(20);} });
      choices.push({ label:'合十离开', hint:'精神+1', ok:()=>{ gameState.run.stats.spirit = Math.min(100, gameState.run.stats.spirit+1); log('你为他掩上一点沙，心里平静了一些。'); } });
    } else if (id === 'cave_slate') {
      showOnce({ title:'洞中遗迹', text:'岩壁上刻满了与荒漠白骨同源的古老文字。你在石缝里找到一块脱落的石板。', choices:[{ label:'带走石板', ok:()=>{ if (gainItem('slate',1)) { markDone(); log('获得：石板×1。','good'); } diaryAdd('洞深处的古文字。这座岛比我想的更老。'); } }]});
      return;
    } else if (id === 'peak_altar') {
      // 材料齐了就直接在这里开仪式（原来只有右下角那个小按钮，玩家极容易漏看）
      if (!gameState.run.flags.ended_C && hasItem('relic') && invCount('slate') >= 3 && hasItem('dragonbone')) {
        showOnce({ title:'远古祭坛', text:'凹槽的形状与三块石板严丝合缝，遗物在掌心发烫，龙骨也跟着共鸣——祭坛在等你把它们放上去。', choices:[
          { label:'举行祭坛仪式', hint:'遗物 + 石板×3 + 龙骨（记为章节目标，获得 50 魂点）', ok:()=>{ doPeakRitual(); } },
          { label:'再等等', hint:'先不举行', ok:()=>{ log('你把手收了回来。'); } },
        ]});
        return;
      }
      if (gameState.run.flags['pt_' + p.id] && !onceRewardMissing(p)) {
        showOnce({ title:'远古祭坛', text:'祭坛中央的凹槽还空着。这里似乎还缺些东西——遗物、三块石板、龙骨，缺一不可。', choices:[{ label:'知道了', ok:()=>{} }]});
        return;
      }
      showOnce({ title:'远古祭坛', text:'祭坛中央的凹槽形状奇异，四周刻着与石板相同的文字。你搬开碎石，露出一件蒙尘的遗物。', choices:[{ label:'带走遗物', ok:()=>{ if (gainItem('relic',1)) { markDone(); log('获得：遗物×1（章节目标·秘辛 需要的祭品之一）。','good'); } diaryAdd('山顶祭坛的遗物，冰凉得像在发烫。'); } }]});
      return;
    } else if (id === 'peak_eagle') {
      choices.push({ label:'攀上岩壁', hint:'60% 得鹰羽；失手会惊动雪羽鹰', ok:()=>{
        const ok60 = chance(0.6);
        if (ok60) { const n = rnd(1,2); if (gainItem('eaglefeather', n)) log(`鹰不在巢里。获得：鹰羽×${n}。`,'good'); }
        addMin(20);
        if (!ok60) { log('你刚摸到巢沿，一道白影尖啸着俯冲下来——是雪羽鹰！', 'danger'); startFight(ENEMIES.eagle); }
      } });
      choices.push({ label:'太危险了', hint:'无风险', ok:()=>{ log('你放弃了。'); } });
    } else if (id === 'sea_rescue') {
      showOnce({ title:'求救信号', text:'礁石上绑着一面破布条，旁边有个奄奄一息的年轻人。他叫小满，是商船的船员，风暴里落了水。', choices:[
        // ⚠️ 救成功必须 markDone()：这点位是 once:true，但 adventure 类不会自动打标记
        //    （doPoint 只给非 adventure 打），漏了就会像玩家反馈的那样"救了四个小满"。
        { label:'救他上筏（需要淡水×2）', need:{ water:2 }, ok:()=>{ removeItem('water',2); gameState.run.flags.xiaoman = 1; markDone(); log('小满成了营地的一员：采集+10%，夜袭前他会预警。','good'); diaryAdd('我救了一个叫小满的人。岛上不再只有我一个了。'); } },
        { label:'给他水，但不带他走', ok:()=>{ log('你把水留给了他，独自离开。'); } },
      ]});
      return;
    } else if (id === 'cove_chest') {
      choices.push({ label:'撬开它', hint:'70%得金币，或触发机关（-10 生命）', ok:()=>{ if (chance(0.7)) { const n = rnd(2,5); if (gainItem('coin', n)) log(`生锈的宝箱里滚出金币！获得：金币×${n}。`,'good'); } else { applyHarm(10); log('箱子里有机关！飞针擦过你的手臂。（-10 生命）','danger'); if (gameState.run.stats.hp<=0) die('锈箱里的机关要了你的命。'); } addMin(20);} });
      choices.push({ label:'不敢碰', hint:'无风险', ok:()=>{ log('你离开了宝箱。'); } });
    } else if (id === 'ruins_slate') {
      showOnce({ title:'遗迹石板', text:'断柱之间，一块石板完整无缺，刻着与洞中相同的文字。', choices:[{ label:'带走石板', ok:()=>{ if (gainItem('slate',1)) { markDone(); log('获得：石板×1。','good'); } } }]});
      return;
    } else if (id === 'ruins_explore') {
      choices.push({ label:'摸进废墟', hint:'可能得金币/遇守卫/迷路', ok:()=>{ const r = Math.random(); if (r < 0.4) { const n = rnd(2,5); addItem('coin', n); if (chance(0.3)) gainItem('crystal',1); log(`你在废墟里找到古金币×${n}。`,'good'); } else if (r < 0.7) { log('石像的阴影动了！'); startFight(ENEMIES.guard); } else { gameState.run.stats.spirit = Math.max(0, gameState.run.stats.spirit-8); log('你在断壁间迷了路，许久才转出来。（精神-8）','warn'); } addMin(30);} });
      choices.push({ label:'只在边缘看看', hint:'无风险', ok:()=>{ log('你沿着外墙走了一圈。'); } });
    } else {
      log('你在这里转了一圈，没什么特别的。');
    }
    // ⚠️ 通用兜底：一次性点位拿到奖励后，**同一个弹窗里**不许再点第二次。
    //    玩家反馈"救小海不退出界面能一直救""神秘骸骨能一直摸金币"就是这条：
    //    以前只有"关掉弹窗再点"才会被 pointAvailable 拦住，弹窗开着连点就一直发奖励。
    for (const c of choices) {
      const orig = c && c.ok;
      if (typeof orig !== 'function') continue;
      c.ok = function () {
        // ⚠️ 只拦"一次性点位已经拿过奖励"这一种情况。
        //    不能直接用 pointAvailable(p)：里面有每日次数/工具/天气等判定，
        //    而这些在 doPoint 阶段已经算过一遍了，再判一次会把"第一次点击"也误伤
        //    （鹰巢那种 daily 点位就是被这个坑到的）。
        if (p.once && gameState.run.flags['pt_' + p.id] && !altarReady(p) && !onceRewardMissing(p)) {
          log(pointStatus(p) || '这里你早已搜刮过。', 'warn'); return;
        }
        return orig.apply(this, arguments);
      };
    }
    if (choices.length) showOverlay({ title:p.name, text:p.text, choices });
  }
    return Object.freeze({pointsOf,lightLevel,altarReady,onceRewardMissing,pointAvailable,shortPt,pointStatus,riverNetBanned,pointMinutes,pointEnergy,pointReason,doPoint,adventure});
  }
  return Object.freeze({create});
})();
