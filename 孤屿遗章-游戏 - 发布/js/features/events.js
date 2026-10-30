/* events：业务规则的唯一实现；Game 保留调用接口与装配。 */
const WorldEventRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const chance=(...args)=>deps.chance(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const hasItem=(...args)=>deps.hasItem(...args);
    const removeItem=(...args)=>deps.removeItem(...args);
    const applyHarm=(...args)=>deps.applyHarm(...args);
    const addMin=(...args)=>deps.addMin(...args);
    const gainItem=(...args)=>deps.gainItem(...args);
    const raidDay=(...args)=>deps.raidDay(...args);
    const die=(...args)=>deps.die(...args);
    const startFight=(...args)=>deps.startFight(...args);
    const diaryAdd=(...args)=>deps.diaryAdd(...args);
    const gainRandomRelic=(...args)=>deps.gainRandomRelic(...args);
function raidWolves() {
    const d = Math.max(1, Math.min(50, (gameState.run && gameState.run.day) || 1));
    return Math.max(1, Math.min(5, 1 + Math.floor(d / 12.5)));
  }

function storyDay(ev) { return ev.id === 'e_wolfraid' ? raidDay() : ev.day; }

function triggerStory(ev) {
    if (ev.id === 'e_driftbottle') {
      gainItem('driftbottle', 1);
      showOverlay({
        title:'漂流瓶', text:'你在漂流物里找到一个用蜡封口的瓶子。里面的信写着：\n\n"落难的朋友，每月商船会路过南岸。看到炊烟就靠岸。带上鱼干，换什么都行。——老潮"',
        choices:[{ label:'把瓶子收好', ok:()=>{ log('你记下了这个名字：老潮。'); } }]
      });
    } else if (ev.id === 'e_laochao') {
      gameState.run.laochao.arrived = true; gameState.run.laochao.arrivedDay = gameState.run.day; gameState.run.flags.flagSignal = 0;   // 剧情说老潮来了 → 确保交易按钮出现
      showOverlay({
        title:'商船靠岸', text:'一个戴斗笠的老头跳下船，嗓门洪亮："嚯！真有活人！我是老潮，走南闯北的小买卖人。有货换货，没货聊聊也成！"',
        choices:[{ label:'欢迎，老潮', ok:()=>{ log('老潮在营地南岸支起了小摊。（今天 22 点前可交易）', 'good'); } }]
      });
    } else if (ev.id === 'e_wolfraid') {
      gameState.run.flags.wolfRaidPending = 1;
      showOverlay({ title:'不祥的预感', text:'入夜后，营地外的黑暗里似乎亮起了几双绿眼睛。今晚恐怕不太平。', choices:[
        { label:'今晚提高警惕', ok:()=>{ log('今晚睡觉时可能遭遇夜袭。可以选择守夜，或靠围墙硬撑。', 'warn'); } }
      ]});
    } else if (ev.id === 'e_caveTip' || ev.id === 'e_storm' || ev.id === 'e_pirate' || ev.id === 'e_altar' || ev.id === 'e_bell' || ev.id === 'e_winter' || ev.id === 'e_newyear') {
      showOverlay({ title:'消息', text: ev.text, choices:[{ label:'记在日记里', ok:()=>{} }] });
      diaryAdd(ev.text);
    }
  }

function hintOf(c) {
    const parts = [];
    if (c.need) parts.push('需' + Object.entries(c.need).map(([k,v]) => `${ITEMS[k].name}×${v}`).join('、'));
    if (c.items) parts.push('得' + Object.entries(c.items).map(([k,v]) => `${ITEMS[k].name}×${typeof v === 'number' ? v : 1}`).join('、') + (c.chance !== undefined ? '（概率）' : ''));
    if (c.dmg) parts.push(`-${c.dmg}生命`);
    if (c.status === 'poison') parts.push('可能中毒');
    if (c.spirit) parts.push(`精神${c.spirit > 0 ? '+' : ''}${c.spirit}`);
    if (c.time) parts.push(`耗时${c.time}分`);
    if (c.fight) parts.push(`遭遇${ENEMIES[c.fight].name}`);
    if (c.noop) parts.push('无风险');
    return parts.join(' · ');
  }

function randomEventPool(sceneId) {
    const condOk = (e) => {
      if (!e.cond) return true;
      const c = e.cond;
      if (c.rain && !(gameState.run.weather === 'rain' || gameState.run.weather === 'storm')) return false;
      if (c.zone && gameState.run.zone !== c.zone) return false;
      if (c.day && gameState.run.day < c.day) return false;
      if (c.houseBelow && !(gameState.run.buildings.house < c.houseBelow)) return false;
      return true;
    };
    return RANDOM_EVENTS.filter(e => e.scene === sceneId && !(e.once && gameState.run.flags['re_'+e.id]) && condOk(e)
      && (e.id !== 're_pirates' || (gameState.run.day % 5 === 0 && gameState.run.laochao.accepted && gameState.run.laochao.accepted.c4 !== undefined && gameState.run.day >= gameState.run.laochao.accepted.c4 && gameState.run.day <= gameState.run.laochao.accepted.c4 + 2 && !gameState.run.flags.boss_pirateBoss)));
  }

function triggerRandomEvent(sceneId) {
    const pool = randomEventPool(sceneId);
    if (!pool.length) return;
    const total = pool.reduce((a,b)=>a+b.w,0);
    let r = Math.random() * total;
    let ev = pool[0];
    for (const e of pool) { r -= e.w; if (r <= 0) { ev = e; break; } }
    // 石龛：选项要按"你还没拿到哪些神物"现场生成，走不了下面那套通用 choices → 单独一条路
    if (ev.id === 're_shrine') { triggerShrine(ev); return; }
    // ⚠️ 数值平衡 P1-5：**once 事件"不选也消耗"**。
    //    以前这一行在弹窗之前就把标记打上，玩家看到弹窗但没选（或选了"不敢妄动"）也算消耗掉，
    //    于是「石龛」这类唯一神物事件错过即永失。改为**真正做出选择时才打标**，
    //    和 playPoint 那侧 "一次性点位在领奖时才 markDone" 的写法保持一致。
    log(`【奇遇】${ev.text}`, 'sys');
    const beeSafe = ev.id === 're_hive' && gameState.run.identity === 'beekeeper';
    showOverlay({ title:'遭遇', text: ev.text, choices: ev.choices.map(c => ({
      label: c.label,
      hint: beeSafe && c.dmg ? hintOf({...c, dmg:0, status:null}) + ' · 养蜂人免蜇' : hintOf(c),
      ok: () => {
        if (ev.once) gameState.run.flags['re_'+ev.id] = 1;   // ← 选择之后才消耗
        log(`你选择了：${c.label}。`, 'sys');
        if (c.need) { if (!Object.keys(c.need).every(k => hasItem(k, c.need[k]))) { log('材料不够。', 'warn'); return; } Object.keys(c.need).forEach(k => removeItem(k, c.need[k])); }
        if (c.fight) { log('一场遭遇战！'); startFight(ENEMIES[c.fight]); return; }
        if (c.relic) gainRandomRelic();
        if (beeSafe && c.dmg) log('你熟练地避开蜂群，取走蜂蜜，没有被蜇。', 'good');
        if (c.dmg && !beeSafe) { applyHarm(c.dmg); log(`你受了伤（-${c.dmg} 生命）。`, 'danger'); if (gameState.run.stats.hp <= 0) { die('你没能挺过这次遭遇。'); return; } }
        if (c.status && !beeSafe) { gameState.run.statuses[c.status] = Math.max(gameState.run.statuses[c.status]||0, 3); log('你中毒了。', 'danger'); }
        if (c.spirit) { gameState.run.stats.spirit = Math.max(0, Math.min(100, gameState.run.stats.spirit + c.spirit)); log(`精神${c.spirit > 0 ? '+' : ''}${c.spirit}。`, c.spirit < 0 ? 'warn' : 'good'); }
        if (c.items) for (const k in c.items) { if (c.chance === undefined || chance(c.chance)) { const q = typeof c.items[k] === 'number' ? c.items[k] : 1; if (gainItem(k, q)) log(`获得：${ITEMS[k].name}×${q}。`, 'good'); } }
        if (c.noop) log('你选择了稳妥。');
        if (c.time) { addMin(c.time); log(`（耗时 ${c.time} 分钟）`, 'sys'); }
        change();
      },
    }))});
  }

function showOverlay(cfg) { if (deps.onOverlay) deps.onOverlay({ kind:'choice', ...cfg }); }

function shrinePool() {
    return Object.keys(RELICS).filter(id => id !== 'atlantisSeed' && !(gameState.run.relics || []).includes(id));
  }

function shrineChoices(ev) {
    const mark = () => { if (ev.once) gameState.run.flags['re_'+ev.id] = 1; };   // once 事件：**做选择之后**才消耗（P1-5）
    const calm = () => { mark(); gameState.run.stats.spirit = Math.min(100, gameState.run.stats.spirit + 2); log('你退后一步，没有惊动这处供奉。（精神+2）', 'sys'); change(); };
    const pool = shrinePool();
    if (!pool.length) {
      return { title:'石龛', text: ev.text + '\n\n龛里那三件神物，你都已经有了。', choices:[{ label:'合十离开', hint:'精神 +2', ok: calm }] };
    }
    // 抽三件：在"事件触发的这一刻"抽定，之后弹窗重绘也不会换人
    const bag = pool.slice(), show = [];
    while (bag.length && show.length < 3) show.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
    const choices = show.map(id => ({
      label: `取走「${RELICS[id].name}」`,
      hint: RELICS[id].desc,
      ok: () => {
        mark();
        log(`你选择了：取走「${RELICS[id].name}」。`, 'sys');
        gameState.run.relics.push(id);
        log(`你获得了神物【${RELICS[id].name}】——${RELICS[id].desc}`, 'good');
        change();
      },
    }));
    choices.push({ label:'不敢妄动', hint:'精神 +2', ok: calm });
    return { title:'石龛 · 三件神物', text: ev.text + '\n\n石龛只认一次供奉——拿了就再也不会有了，挑一件带走吧。', choices };
  }

function triggerShrine(ev) {
    log(`【奇遇】${ev.text}`, 'sys');
    showOverlay(shrineChoices(ev));
  }
    return Object.freeze({raidWolves,storyDay,triggerStory,hintOf,randomEventPool,triggerRandomEvent,showOverlay,shrinePool,shrineChoices,triggerShrine});
  }
  return Object.freeze({create});
})();
