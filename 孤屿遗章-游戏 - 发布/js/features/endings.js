/* endings：业务规则的唯一实现；Game 保留调用接口与装配。 */
const EndingRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const persistPair=(...args)=>deps.persistPair(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const invCount=(...args)=>deps.invCount(...args);
    const hasItem=(...args)=>deps.hasItem(...args);
    const save=(...args)=>deps.save(...args);
    const showOverlay=(...args)=>deps.showOverlay(...args);
    const diaryAdd=(...args)=>deps.diaryAdd(...args);
    const unlockChallenges=(...args)=>deps.unlockChallenges(...args);
    const metaState=(...args)=>deps.metaState(...args);
    const achUnlock=(...args)=>deps.achUnlock(...args);
    const metaSettle=(...args)=>deps.metaSettle(...args);
function checkEndingActions() {
    const acts = [];
    if (gameState.run.ending || gameState.run.difficulty==='nightmare') return acts;
    if (gameState.run.scene === 'camp') {
      const dock = BUILDING_CHAINS.dock[gameState.run.buildings.dock];
      if (dock.boat === 'ocean' && hasItem('seachart') && invCount('supplybox') >= 3 && !gameState.run.flags.ended_A) acts.push({ id:'endA', name:'扬帆远航（结局·归乡）', desc:'远洋船、海图、三箱补给都已备齐。是时候回家了。' });
      // 岛主结局：作者 2026-09-22 要求加难度 —— 盐镇声望从 2 提到 **4**（声望上限同时 3→5）。
      // 声望来源是告示板 c2~c5 四条委托各 +1，所以「声望 4」= 四条委托全部完成，
      // 不再是刷两条就能拿结局。
      if (gameState.run.flags['boss_pirateBoss'] && gameState.run.fame >= 4 && gameState.run.buildings.wall >= 3 && !gameState.run.flags.ended_B) acts.push({ id:'endB', name:'召集岛民（结局·岛主）', desc:'海盗已灭、盐镇上下都认你、城墙已固。这座岛需要一个主人。' });
    }
    // 山顶祭坛仪式不再是结局（章节目标）：不在这里按「结局」列出，也不进结算流程。
    // 仪式照旧触发（山顶祭坛点位 / 右下角章节目标按钮），由 doPeakRitual 处理，只发一次 50 魂点。
    if (gameState.run.scene === 'atlantis' && (gameState.run.killCount.sunkenKing || 0) > 0) {
      if (!gameState.run.flags.ended_S)  acts.push({ id:'endS',  name:'重启灯塔（结局·重燃文明）', desc:'沉没之王已伏诛，点亮灯塔，让文明重生。' });
      if (!gameState.run.flags.ended_S2) acts.push({ id:'endS2', name:'封存灯塔（结局·深海长眠）', desc:'按灭最后一盏灯，让这座城重新安眠。' });
    }
    // 已达成、这一局还没结算的结局 → 给"看结算画面"的入口。
    // ⚠️ 以前缺的正是这一步：settleEnding() 全项目没有任何界面调用，
    //    玩家点了「祭坛仪式（结局·秘辛）」只写一行日志，结算画面与结算文字永远看不到。
    // ⛔ 一个存档只认一个结算结局（作者 2026-09-18 定）。收尾之后**不再列出**其余的「结算」按钮：
    //    作者 2026-09-23 反馈"结局按钮貌似只消失一个，其他还是不能取消" ——
    //    老做法是把它们留着、标成「本局已收尾」，本意是"藏起来玩家会以为坏了"，
    //    但实际效果是打完几个结局之后，右下角常年挂着两个点了只会弹"请开新的一局"的按钮。
    //    ⚠️ 只藏「结算」，**不动「达成」**：其他结局照样能达成（照进日记与成就），
    //       那条路径由上面的 endX 分支和 askSettleEnding 里的说明负责交代原因，界面不会静默失败。
    const lockKey = gameState.run.flags.settledEnding;
    for (const [key, id] of [['A','endA'], ['B','endB'], ['S','endS'], ['S2','endS2']]) {
      if (gameState.run.flags['ended_' + key] && !gameState.run.flags['settled_' + key]) {
        if (lockKey) continue;   // 本存档已收尾 → 这个按钮点了什么也做不了，直接不列
        const nm = (ENDINGS[key] || {}).name || key;
        acts.push({ id:'settle_' + id, name:`结算 · 结局「${nm}」`, desc:'看结局画面与结算文字（这一生折成魂点汇入《历代遗章》），看完还能继续玩。' });
      }
    }
    return acts;
  }

function doEnding(id) {
    if(gameState.run.difficulty==='nightmare') return {ok:false,reason:'击败噩梦之源才能从长夜醒来。'};
    // 第二章：结局改为"可继续/可手动结算"，不再强制结束
    // 兼容旧调用：C 已改为章节目标，任何遗留入口都统一走祭坛逻辑，不能再进入结局结算。
    if (id === 'endC') return doPeakRitual();
    if (id === 'endA') {
      if (gameState.run.flags['ended_A']) { log('归乡的一切都已备齐。', 'sys'); return; }
      gameState.run.flags['ended_A'] = 1;
      log('万事俱备，可你的目光却落向了更远的深海——或许还能找到更多线索。（按"回营地"即可继续；结算入口在「装备 → 属性」的人物立绘下方）', 'good');
      diaryAdd('海之尽头，仿佛还有一个世界在等我。');
    } else if (id === 'endB') {
      if (gameState.run.flags['ended_B']) { log('岛上的灯火已经亮起。', 'sys'); return; }
      gameState.run.flags['ended_B'] = 1;
      log('岛主之名落定，可你总觉得海的深处仍有未解的谜团……（按"回营地"即可继续；结算入口在「装备 → 属性」的人物立绘下方）', 'good');
      diaryAdd('这座岛已经是我的了，可深海还在呼唤。');
    } else if (id === 'endS') {
      if (gameState.run.flags['ended_S']) { log('灯塔的长明之光已经亮起。', 'sys'); return; }
      gameState.run.flags['ended_S'] = 1;
      achUnlock('lighthouse');
      log('你重启了亚特兰蒂斯的灯塔——失落文明的灯火，重新亮起。（结局·重燃文明 已达成，可继续；结算入口在「装备 → 属性」的人物立绘下方）', 'good');
      diaryAdd('灯塔亮起，文明重新呼吸。');
    } else if (id === 'endS2') {
      if (gameState.run.flags['ended_S2']) { log('深海已经重归寂静。', 'sys'); return; }
      gameState.run.flags['ended_S2'] = 1;
      achUnlock('abyssal');
      log('你按灭了最后一盏灯，让亚克兰蒂斯重新长眠。（结局·深海长眠 已达成，可继续；结算入口在「装备 → 属性」的人物立绘下方）', 'good');
      diaryAdd('我选择让这座城安安静静地睡下去。');
    }
    save();
    change();
    unlockChallenges();
    askSettleEnding(id);
    return { ok:true, key: String(id).replace('end', '') };
  }

function doPeakRitual() {
    if (gameState.run.flags.ended_C) {
      log('祭坛早已点亮，凹槽空空如也——这段往事你已经记下了。', 'sys');
      return { ok:false, reason:'祭坛仪式已经完成过了。' };
    }
    if (!hasItem('relic') || invCount('slate') < 3 || !hasItem('dragonbone')) {
      log('祭坛还缺东西：遗物、三块石板、龙骨，缺一不可。', 'warn');
      return { ok:false, reason:'材料不足：需要遗物 + 石板×3 + 龙骨。' };
    }
    // 局内完成标记与账号魂点必须一起落盘；任一写入失败就整体回滚，避免刷新后反复领 50 魂点。
    const next = JSON.parse(JSON.stringify(gameState.run));
    const meta = JSON.parse(JSON.stringify(metaState()));
    next.flags = next.flags || {};
    next.flags.ended_C = 1;
    next.atlantis = next.atlantis || { unlocked:1, visited:0, camp:{ furniture:{}, buildings:{} }, quest:0 };
    next.atlantis.unlocked = 1;
    next.diary = next.diary || [];
    next.diary.push({ day:next.day, line:'亚克兰蒂斯……失落文明的灯塔，在海的尽头。' });
    // 日出回溯也必须保留这个已发放账号奖励的标记，否则死亡后可重复领取。
    const cp = next.dawnCheckpoint && next.dawnCheckpoint.state;
    if (cp && cp.day === next.day) {
      cp.flags = cp.flags || {};
      cp.flags.ended_C = 1;
      cp.atlantis = cp.atlantis || { unlocked:1, visited:0, camp:{ furniture:{}, buildings:{} }, quest:0 };
      cp.atlantis.unlocked = 1;
      next._snap = next._snap || {};
      next._snap.day = JSON.parse(JSON.stringify(cp));
    }
    meta.soul = (meta.soul || 0) + 50;
    const result = persistPair(next, meta, false);
    if (!result.ok) return result;
    log('祭坛轰然点亮——这座岛，是失落文明最后的哨站！海的最深处传来低语：去找亚克兰蒂斯。山顶浮现出一枚传送石。（章节目标完成，获得 50 魂点）', 'good');
    change();
    return { ok:true, soul: 50 };
  }

function askSettleEnding(id) {
    const key = String(id).replace('end', '');
    const end = ENDINGS[key] || {};
    const name = end.name || key;
    const lockKey = gameState.run.flags.settledEnding;
    if (lockKey && lockKey !== key) {
      const lockName = (ENDINGS[lockKey] || {}).name || lockKey;
      showOverlay({
        title: '结局达成 · ' + name,
        text: `《${name}》达成了——不过这个存档已经用结局「${lockName}」收尾了。\n\n一个存档只能结算一个结局，所以《${name}》这一局不能再结算（达成记录、日记和成就照样算数）。\n\n复活不会解除这个定局，想换一个结局收尾只能开新的一局。`,
        choices: [ { label:'知道了', ok: () => {} } ],
      });
      return;
    }
    showOverlay({
      title: '结局达成 · ' + name,
      text: `这一生可以收尾了：《${name}》已经达成。\n\n⚠ 一个存档只能结算一个结局：确定结算《${name}》之后，这个存档就不能再结算其他结局了（其他结局仍然可以达成，只是收尾要开新的一局）。\n\n结算会把这一生折成魂点汇入《历代遗章》，看完可以按「留在岛上」接着玩，进度不会丢。\n\n不着急看也行——随时打开「装备 → 属性」，入口就在人物立绘下方（「结算 · 结局「${name}」」）。`,
      choices: [
        { label:'观看结算画面', hint:'还要再确认一次', ok: () => { confirmSettleEnding(id); } },
        { label:'继续探索', hint:'先接着玩，之后再结算', ok: () => { log(`《${name}》已达成，随时可以结算。`, 'sys'); } },
      ],
    });
  }

function confirmSettleEnding(id) {
    const key = String(id).replace('end', '');
    const end = ENDINGS[key] || {};
    const name = end.name || key;
    showOverlay({
      title: '结算前确认 · ' + name,
      text: `确认以《${name}》作为这个存档的结局吗？\n\n· 结算后本存档不能再结算其他结局（其他结局仍然可以达成）\n· 这一生照常可以接着玩，进度不会丢\n· 本局会折算成魂点汇入《历代遗章》`,
      choices: [
        { label:'确定结算', hint:'本存档只认这一个结局', ok: () => { settleEnding(id); } },
        { label:'再想想', hint:'先接着玩', ok: () => { log(`《${name}》先留着——「装备 → 属性」的人物立绘下方随时能结算。`, 'sys'); } },
      ],
    });
  }

function settleEnding(id) {
    const key = String(id).replace('end', '');
    if (!gameState.run.flags['ended_' + key]) return { ok:false, reason:'该结局尚未达成。' };
    const lockKey = gameState.run.flags.settledEnding;
    if (lockKey && lockKey !== key) {
      const lockName = (ENDINGS[lockKey] || {}).name || lockKey;
      return { ok:false, reason:`本存档已经用结局「${lockName}」收尾了——一个存档只能结算一个结局（其他结局仍可达成，收尾请开新的一局）。` };
    }
    gameState.run.flags['settled_' + key] = 1;   // 同一结局只结算一次（防"结算→留在岛上→再结算"刷魂点）
    gameState.run.flags.settledEnding = key;     // 本存档的唯一定局：此后不再结算别的结局
    gameState.run.ending = key;
    save();
    const ms = metaSettle();
    if (ms) log(`你的一生化为 ${ms.gain} 魂点，汇入了《历代遗章》。`, 'good');
    if (deps.onEnding) deps.onEnding(gameState.run.ending, '');
    return { ok:true };
  }

function resIds() { return Object.keys(ITEMS).filter(k => !ITEMS[k].retired && ['mat','special','bp','seed'].includes(ITEMS[k].cat)); }

function monIds() { return Object.keys(ENEMIES).filter(k => !ENEMIES[k].noDex && (!ENEMIES[k].nightmare || (gameState.run && ['nightmare','dev'].includes(gameState.run.difficulty)))); }

function collection() {
    const mm = metaState();
    const seen = (gameState.run && gameState.run.seen) || {};   // 主界面（没有存档）也要能看账号图鉴
    const seenItems = mm.seenItems || {}, seenMon = mm.seenMon || {};
    return {
      res: resIds().filter(k => seen[k] || seenItems[k]).length,
      resTotal: resIds().length,
      mon: monIds().filter(k => seen['mon_' + k] || seenMon[k]).length,
      monTotal: monIds().length,
    };
  }
    return Object.freeze({checkEndingActions,doEnding,doPeakRitual,askSettleEnding,confirmSettleEnding,settleEnding,resIds,monIds,collection});
  }
  return Object.freeze({create});
})();
