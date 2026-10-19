/* ============================================================
   孤屿遗章 · 界面层
   ============================================================ */
const UI = (() => {
  let view = 'scene';        // scene | map
  let roomView = false;      // 临时室内场景；不写入玩家存档
  let craftTab = 'none';
  let craftGroup = 'all';
  // 物品立绘雪碧图（4x4）：{ itemId:[列,行] }，无映射则用汉字字形
  const SPR = { water:1, wood:1, branch:1, thatch:1, flint:1, stone:1, fish:1, berry:1, herb:1, mushroom:1, meat:1, hide:1, resin:1, bamboo:1, clay:1, salt:1, carrot:1, wheat:1, honey:1, wildveg:1, cactusfruit:1, snowlotus:1, leather:1, cloth:1, plank:1, stonebrick:1, ironore:1, ironingot:1, steelingot:1, charcoal:1, silk:1, pearl:1, sinew:1, tusk:1, horn:1, snakegall:1, herbPaste:1, salve:1, blueBull:1, zhangLaoJi:1, antidote:1, vegSoup:1, vegFry:1, meatSoup:1, meatStew:1, roastFish:1, roastMeat:1, jerky:1, smokedFish:1, furCoat:1, grassArmor:1, woodShield:1, ironShield:1, axeStone:1, axeIron:1, pickStone:1, pickIron:1, hoe:1, rod:1, net:1, trap:1, club:1, spear:1, torch:1, rope:1, vine:1, bow:1, arrow:1, eagleArrow:1, ironSword:1, steelSword:1, blackSword:1, ironGreatSword:1, ironDagger:1, steelDagger:1, blackDagger:1, knifeStone:1, pickSteel:1, pickBlack:1, axeSteel:1, ironArmor:1, steelArmor:1, blackArmor:1, leatherArmor:1, grassCloth:1, hempCloth:1, leatherCloth:1, supplybox:1, driftbottle:1, namecard:1, beibi:1, coin:1, slate:1, relic:1, dragonbone:1, fossil:1, niter:1, sulfur:1, gunpowder:1, blackingot:1, mithrilingot:1, spyglass:1, wool:1, felt:1, nail:1, ironpart:1, tile:1, claypot:1, basket:1, seedCarrot:1, seedWheat:1, seedHerb:1, honeyWater:1, tea:1, lotusPill:1, pearlNeck:1, shellAmulet:1, beastFang:1, fiber:1, bambooShoot:1, venom:1, poisonCoat:1, goldore:1, crystal:1, blackiron:1, mithril:1, eaglefeather:1, shipwood:1, sharkfin:1, wolfkingpelt:1, queenSilk:1, pole:1, canvas:1, smokedMeat:1, saltedMeat:1, mushroomSoup:1, tinder:1, steelShield:1, bandage:1, smokeBomb:1, diveSuit:1, diveSuit2:1, diveMask:1, goggles:1, lightWeak:1, lightStrong:1, sourceOre:1, sourceBar:1, deepCoral:1, anctDevice:1, pearlGranule:1, coralArmor:1, sourceArmor:1, coralBlade:1, sourceSpear:1, thruster:1, bpDive:1, bpGunpowder:1, bpFurnace:1, bpShip:1, bpBlack:1, bpLotus:1, rot:1, seachart:1 };
  // 独立彩色图标名单；未登记的物品沿用黑白图。
  const ACCENT = { pistol:1, bullet:1, brokenPistol:1, deepCore:1, divineBow:1, divineArmor:1, divinePack:1, divineSuperPack:1 };
  // 神弓、神之甲默认彩色，不受皮肤选择影响。
  const ALWAYS_COLOR = { divineBow:1, divineArmor:1, divinePack:1, divineSuperPack:1 };
  const EQUIPMENT_ATLAS = ['spear','ironSword','steelSword','blackSword',
    'ironDagger','steelDagger','blackDagger','ironGreatSword',
    'bow','grassArmor','leatherArmor','ironArmor',
    'blackArmor','woodShield','ironShield','steelShield'];
  const COLOR_ITEM_ATLAS = ['bread','cake','meatStew','flour',
    'pearl','atlantisCore','roastMeat','roastFish',
    'mushroomSoup','goldIngot','tideSteel','deepCoral',
    'energyCrystal','anctDevice','diveMask','pearlNeck'];
  const COLOR_INVENTORY_SHEETS = {
    tools: ['axeStone','axeIron','axeSteel','pickStone','pickIron','pickSteel','pickBlack','knifeStone','ironDagger','steelDagger','blackDagger','rod','net','trap','hoe','torch'],
    food: ['fish','berry','herb','mushroom','honey','bread','cake','roastFish','roastMeat','jerky','meatStew','mushroomSoup','wildveg','carrot','wheat','snowlotus'],
    materials: ['wood','branch','thatch','flint','stone','clay','rope','cloth','ironore','ironingot','steelingot','blackingot','goldore','goldIngot','pearl','crystal'],
    natural: ['bamboo','fiber','vine','snow','hide','meat','sinew','wool','resin','bambooShoot','niter','sulfur','snakegall','tusk','horn','venom'],
    // 第五格是旧海盐图案，留空以保持后续物品在图集中的坐标；统一的盐使用 craft 图集。
    rare: ['silk','blackiron','mithril','eaglefeather',null,'fossil','shipwood','sharkfin','wolfkingpelt','queenSilk','plank','pole','stonebrick','tile','charcoal','mithrilingot'],
    craft: ['nail','ironpart','felt','canvas','claypot','leather','basket','salt','gunpowder','flour','hay','egg','chick','seedCarrot','seedWheat','seedHerb'],
    food2: ['cactusfruit','water','vegSoup','vegFry','meatSoup','carrotStew','honeyWater','smokedFish','friedEgg','bigOmelette','superEgg','smokedMeat','saltedMeat','tea','rareFishA','rareFishB'],
    armor: ['grassCloth','hempCloth','leatherCloth','furCoat','shellAmulet','beastFang','hornAmulet','woodShield','ironShield','steelShield','grassArmor','leatherArmor','ironArmor','blackArmor','coralArmor','sourceArmor'],
    medicine: ['herbPaste','bandage','antidote','lotusPill','tideVitalPill','abyssBreathPill','salve','blueBull','zhangLaoJi','smokeBomb','tinder','spyglass','club','arrow','eagleArrow','namecard'],
    records: ['bpGunpowder','bpFurnace','bpShip','bpBlack','bpLotus','slate','relic','rot','dragonbone','seachart','supplybox','driftbottle','bpDive','bpPistol','bpBullet','bpStew'],
    sea: ['sourceOre','sourceBar','shipPlate','pearlGranule','coralBlade','sourceSpear','thruster','energyCrystal','glowCrystal','pistol','bullet','brokenPistol','rareFishC','rareFishD','rareFishE','deepCore'],
    final: ['beibi','coin','poisonCoat','divineBow','diveSuit','diveSuit2','goggles','lightWeak','lightStrong','bpCoralBlade','bpCoralArmor','bpThruster','bpSourceSpear','bpSourceArmor','bpOmelette','bpCake']
  };
  function itemIcon(id) {
    if(id==='lantern')return '<img class="item-icon" src="assets/img/items/lantern-woodcut.png" alt="">';
    if(['bread','flour'].includes(id))return `<img class="item-icon" src="assets/img/items/${id}-cut-v2.webp" alt="">`;
    if(id==='blackGreatSword')return '<img class="item-icon" src="assets/img/items/blackGreatSword.png" alt="">';
    if(['nightmareSoul','nightmareSoul2','nightmareSoul3'].includes(id)) return '<img class="item-icon" src="assets/img/items/nightmareSoul.png" alt="">';
    const recipeCell = ['bpStew','bpOmelette','bpCake'].indexOf(id);
    if (recipeCell >= 0 && skinOn('seasons')) return `<span class="item-icon recipe-art art-colored" aria-hidden="true" style="background-position:${recipeCell*50}% 0%"></span>`;
    if (skinOn('seasons')) {
      if(['ironore','roastMeat'].includes(id))return `<span class="item-icon clean-item-icon" style="background-position:${id==='ironore'?'0':'100'}% 50%" aria-hidden="true"></span>`;
      for (const [sheet, ids] of Object.entries(COLOR_INVENTORY_SHEETS)) {
        const index = ids.indexOf(id);
        if (index >= 0) return `<span class="item-icon color-inventory-icon" aria-hidden="true" style="background-image:url('assets/img/map-pack/items/${sheet}.webp');background-position:${(index % 4) * 100 / 3}% ${Math.floor(index / 4) * 100 / 3}%"></span>`;
      }
    }
    const cell = EQUIPMENT_ATLAS.indexOf(id);
    if (cell >= 0 && !(skinOn('accent') && ACCENT[id])) {
      const colored = skinOn('armory') || skinOn('seasons');
      return `<span class="item-icon equipment-icon${colored ? ' equipment-colored' : ''}" aria-hidden="true" data-equipment="${id}" style="background-position:${(cell % 4) * 100 / 3}% ${Math.floor(cell / 4) * 100 / 3}%"></span>`;
    }
    const colorCell = skinOn('seasons') ? COLOR_ITEM_ATLAS.indexOf(id) : -1;
    if (colorCell >= 0) return `<span class="item-icon item-color-atlas" aria-hidden="true" style="background-position:${(colorCell % 4) * 100 / 3}% ${Math.floor(colorCell / 4) * 100 / 3}%"></span>`;
    const it = ITEMS[id];
    if (!(id in SPR)) return `<span class="inv-glyph">${it.glyph}</span>`;
    const dir = (ALWAYS_COLOR[id] || (skinOn('accent') && ACCENT[id])) ? 'items-accent' : 'items';
    return `<img class="item-icon${ALWAYS_COLOR[id] ? ' always-color' : ''}" src="assets/img/${dir}/${id}.png?v=${window.BUILD_VER || 'v1.09'}" alt="" onerror="this.style.display='none'">`;
  }
  // 牧场与蛋料理的新物品图标（单独挂载，避免改动上面那行长表出错）
  Object.assign(SPR, { bread:1, cake:1, carrotStew:1, flour:1, tideVitalPill:1, abyssBreathPill:1,
    reedPack:1, leatherPack:1, expeditionPack:1, snow:1, goldIngot:1, tideSteel:1, shipPlate:1, glowCrystal:1, bpStew:1, bpOmelette:1, bpCake:1,
    hay:1, egg:1, friedEgg:1, bigOmelette:1, superEgg:1, chick:1,
    rareFishA:1, rareFishB:1, rareFishC:1, rareFishD:1, rareFishE:1, pistol:1, bullet:1, brokenPistol:1, deepCore:1, atlantisCore:1, energyCrystal:1, hornAmulet:1, bpPistol:1, bpBullet:1, bpCoralBlade:1, bpCoralArmor:1, bpThruster:1, bpSourceSpear:1, bpSourceArmor:1, vampire:1, dodge:1, satchel:1, bloodvest:1, atlantisSeed:1,
    divineBow:1, divineArmor:1, divinePack:1, divineSuperPack:1 });
let modal = null;          // 当前弹窗渲染函数
// 冬季提示和战斗收尾期间的抵达事件依次排队，待当前界面结束再显示。
let pendingPanels = [];
let lootExpiryQueued=false;
let modalOpenedAt = 0;     // 弹窗打开的毫秒时间戳（防"点击穿透"，见 showModal 附近的说明）
  let currentZone = null;

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const S = () => Game.S();
  const dom=StableDOM.create({locale:Locale,onAdopt:PressInput.adopt,onDispose:PressInput.dispose});
  const panels=GamePanels.create();
  const satchelPanels=FoodSatchelView.create({Game,ITEMS,itemIcon,esc,open:showModal,toast:centerToast});
  panels.register('satchelSettings',satchelPanels.menu);panels.register('satchelfood',satchelPanels.picker);

  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function inlineHelp(text) {
    return `<details class="ui-help"><summary class="help-dot" aria-label="查看说明">?</summary><div class="ui-help-text">${esc(text)}</div></details>`;
  }

  // ---------- 绑定 ----------
  Game.bind({
    onLog: (text, cls) => addLog(text, cls),
    onChange: () => render(),
    // 存档写不进去（配额满 / 浏览器限制）时，必须让玩家知道，并马上引导他导出存档码
    onSaveFail: (err) => {
      addLog('⚠ 存档写入失败！请立刻到「菜单 → 备份·读档」导出存档码备份，然后刷新页面重试。', 'danger');
      try { centerToast('存档写入失败！'); } catch (e) {}
      showModal('overlay', { title:'存档写入失败', text:`浏览器没能把存档写进本地存储（${(err && err.name) || '未知原因'}）。\n\n这通常是存储空间满了或被浏览器限制。\n\n请现在就去「菜单 → 备份·读档」导出存档码（复制到微信/备忘录都行），然后刷新页面；在修复前请不要再继续玩。`, choices:[
        { label:'知道了', ok:()=>{} },
        { label:'去导出存档码', ok:()=>showModal('codex', { mode:'export', code: Game.exportCode() }) },
      ]});
    },
    // 另一个标签页/窗口写入了更新的进度：默认不覆盖，交给玩家决定
    onSaveConflict: () => {
      if (window.__guyuSaveConflictShown) return;
      window.__guyuSaveConflictShown = true;
      addLog('⚠ 检测到另一个标签页有更新的进度，本页没有覆盖它（避免丢档）。', 'warn');
      showModal('overlay', { title:'检测到另一个标签页', text:'这个游戏在另一个标签页/窗口里有更新的进度。\n\n为了避免用旧进度覆盖新进度，本页暂时不会自动存档。\n\n最稳的做法：关掉多余的标签页，只留最新在玩的那一个；如果你确定本页才是最新的，再选「用本页覆盖」。', choices:[
        { label:'用本页覆盖', ok:()=>{ window.__guyuSaveConflictShown = false; Game.forceSave(); addLog('已用本页进度覆盖存档。', 'good'); } },
        { label:'我知道了（不覆盖）', ok:()=>{} },
      ]});
    },
    onFight: (kind, C) => renderCombat(kind, C),
    onEnding: (id, reason) => {if(battleView){battleView.ending={id,reason};}else showEnding(id,reason);},
    onOverlay: (cfg) => {
      const k = cfg && cfg.kind;
      if(k==='lootExpiry'){
        if(lootExpiryQueued)return;lootExpiryQueued=true;
        setTimeout(()=>{if(battleView||modal?.cfg?.requiredChoice){pendingPanels.push(cfg);return;}showModal('lootExpiry',cfg);},0);return;
      }
      if (k === 'atlAnim') { diveGateThen(() => Game.travel('atlantis')); return; }
      // 危险提醒不能顶掉正在处理的剧情/选择弹窗；已有弹窗时降级成醒目横幅。
      if (k === 'danger' && (modal || battleView)) { floatingNotice(String(cfg.text || '').replace(/\n+/g, ' '), 'danger'); return; }
      // 战斗结束事件先完成动画与一秒停顿；抵达事件不能替换战场DOM。
      if (battleView) { pendingPanels.push(cfg); return; }
      // 「冬季来临」是**提示性**弹窗，不跟任何界面抢屏幕（作者 2026-09-25："注意不要和其他弹窗冲突"）：
      //   正开着别的弹窗（最典型的是同一天清晨的「每日晨报」）就先排队，等那个关掉再弹出来。
      if (k === 'winter' && modal) { pendingPanels.push(cfg); return; }
      // ⚠️ 这张白名单要和 showModal 里支持的 kind 对齐：kind 不在这里就会落到最后的通用
      //    'overlay' 分支、渲染成一个空壳窗口（只剩标题）。新加弹窗时务必往这里补。
      if (['lootExpiry','warehouse','loot','farm','black','town','mission','info','atlTrade','fishman','daily','winter'].includes(k)) showModal(k, cfg);
      else showModal('overlay', cfg);
    },
  });

  // ---------- 日志 ----------
  let toastTimer = null;
  // 版本检测：换新包后进来自动提示"已更新"，存档不受影响
  (function(){ try {
    const v = window.BUILD_VER || 'v0';
    const old = localStorage.getItem('guyuyizhang_build');
    if (old && old !== v) setTimeout(() => centerToast('已更新到新版本(' + v + ')，存档保留，欢迎回来！'), 900);
    localStorage.setItem('guyuyizhang_build', v);
  } catch(e){} })();
  function bindPress(el2,onTap,onLong) { PressInput.bind(el2,onTap,onLong); }
  function bindWarehouseCard(button,id,dir) {
    button.style.touchAction='none';
    const remember=()=>{inventoryDualScroll=[...document.querySelectorAll('.inventory-pane .work-scroll')].map(e=>e.scrollTop);};
    bindPress(button,()=>{remember();const r=Game.transferWarehouse(id,1,dir==='in');centerToast(r.ok?(dir==='in'?'存入':'取出')+ITEMS[id].name+'×'+r.moved:r.reason);if(r.ok)showModal('warehouse');},start=>{remember();showModal('batchn',{kind:'warehouse',item:id,dir,returnKind:'warehouse'});dragTransferQuantity(start);});
  }
  function dragTransferQuantity(start) {
    const input=$('#batchn-n');if(!input||!start)return;
    const move=e=>{e.preventDefault();const r=input.getBoundingClientRect(),v=Math.round(+input.min+(+input.max-+input.min)*Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)));input.value=v;input.dispatchEvent(new Event('input'));};
    const end=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',end);};
    document.addEventListener('pointermove',move,{passive:false});document.addEventListener('pointerup',end,{once:true});document.addEventListener('pointercancel',end,{once:true});
  }
  function centerToast(text) {
    let t = $('#center-toast');
    if (!t) { t = document.createElement('div'); t.id = 'center-toast'; document.body.appendChild(t); }
    t.textContent = text;
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1000);
  }
  // 顶部小横幅：不挡死当前弹窗的醒目提示（自动消失，比 centerToast 停留更久、更明显）
  let noticeTimer = null;
  function floatingNotice(text, className) {
    let n = $('#floating-notice');
    if (!n) { n = document.createElement('div'); n.id = 'floating-notice'; document.body.appendChild(n); }
    n.textContent = text;
    n.className = (className || '') + ' show';
    void n.offsetWidth;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { n.className = ''; n.textContent = ''; }, 4200);
  }
  // 首次交易/制作批量说明：账号级只提示一次；用 floatingNotice 不挡死原操作。
  function maybeBatchTip(kind) {
    if (Game.batchTipSeen && Game.batchTipSeen()) return;
    const tradeKinds = ['laochao', 'town', 'black', 'atlTrade'];
    const craftKinds = ['craft'];
    if (!tradeKinds.includes(kind) && !craftKinds.includes(kind)) return;
    const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const txt = isTouch
      ? '触屏：长按买/卖/制造按钮即可批量操作。'
      : '鼠标：单击操作 1 个，按住买/卖按钮约半秒可打开批量；制造也可点「批量」按钮。';
    floatingNotice(txt);
    if (Game.markBatchTipSeen) Game.markBatchTipSeen();
  }
  function addLog(text, cls) {
    const box = $('#logbody');
    if (!box) return;
    const d = el('div', 'logline ' + (cls || ''), '');
    const st = Game.S();
    if (st) {
      const t = el('span', 'logtime', `${Game.fmtTime()}`);
      d.appendChild(t);
    }
    d.appendChild(document.createTextNode(String(text).replace(/第\s*\d+\s*天[。]?\s*/g,'')));
    box.appendChild(d);
    while (box.children.length > 80) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
    if (logMode === 'fade') { const l = $('#log'); if (l) { l.classList.remove('dim'); clearTimeout(logFadeTimer); logFadeTimer = setTimeout(() => l.classList.add('dim'), 3000); } }
    AudioFX.notify(cls);
    const speech = typeof LINGHUI_LINES !== 'undefined' ? LINGHUI_LINES.findIndex(l=>l===text) : -1;
    if (speech >= 0) AudioFX.playVoice('linghui', speech);
    else if (cls==='blue' && /我好像.*见过这里/.test(text)) AudioFX.playVoice('linghui',8);
    else if (/^灵灰/.test(text)) AudioFX.play('linghuiCue');
    if (activeMerchant && /^(购入|卖出|交换成功)/.test(text)) {
      AudioFX.play('trade'); merchantTrades++;
      if (merchantTrades % 3 === 0) {
        merchantLine=1+Math.floor(Math.random()*2);
        const line=$('#merchant-line'); if(line) line.textContent=MERCHANTS[activeMerchant].lines[merchantLine];
        AudioFX.playVoice(activeMerchant,merchantLine);
      }
    }
  }
  // ⚠️ 日志栏只靠 onLog 事件往里追加，而"建界面之前"发生的日志（开新局的第 1 条、读档前发生的一切）
  //    会因为 #logbody 还不存在而被直接丢掉（addLog 里 `if (!box) return`）。
  //    结果就是：开新局/读档进来，日志栏是空的，可 S.log 里明明存着 200 条历史。
  //    这里在界面搭好之后，把 S.log 倒着（它是最新在前）补画一遍，和 addLog 的追加顺序一致。
  function replayLog() {
    const box = $('#logbody');
    if (!box) return;
    const hist = (Game.S() && Game.S().log) || [];
    for (const it of hist.slice(0, 80).reverse()) {
      const d = el('div', 'logline ' + (it.cls || ''), '');
      if (it.t) d.appendChild(el('span', 'logtime', String(it.t).replace(/^第\s*\d+\s*天\s*/,'')));
      d.appendChild(document.createTextNode(String(it.text || '').replace(/第\s*\d+\s*天[。]?\s*/g,'')));
      box.appendChild(d);
    }
    box.scrollTop = box.scrollHeight;
  }
  // ---------- 皮肤包（设置里可改，存在本机、跨存档） ----------
  // 默认纯黑白（木刻原味）；skin-accent = 深海琥珀上色版
  const SKINS = [
    { id: 'armory', name: '匠心彩绘', desc: '16 件常用武器、护甲与盾牌的材质彩绘，50 魂点永久解锁整套', cls: '' },
    { id: 'seasons', name: '全彩地图包', desc: '孤岛与亚特兰蒂斯场景彩绘、四季全景地图、房间家具和精选物品彩绘，免费使用', cls: '' },
    { id: 'ink',    name: '墨白原味', desc: '纯黑白木刻，默认皮肤',        cls: '' },
    { id: 'accent', name: '深海琥珀', desc: '深海navy + 琥珀金手绘上色',   cls: 'skin-accent' },
    // 「彩绘卡面」：界面配色不变，只把人物立绘整套换成全彩卡面
    //   放图位置：assets/img/identities-card/<身份id>.png（缺哪张就自动回退到默认立绘，不会裂图）
    { id: 'card',   name: '彩绘卡面', desc: '人物立绘换成全彩卡面（界面配色不变）', cls: '', portrait: 'identities-card' },
  ];
  // 皮肤包 = **可同时开多个**（作者 2026-09-23："皮肤包改成可多选吧"）。
  // 为什么能叠：这四个包改的根本不是同一件东西，彼此不抢 ——
  //   · armory  只改「装备图集」那 16 件的材质上色（equipment-colored）
  //   · accent  只改界面配色（body.skin-accent 里的 CSS 变量与物品边框），不碰场景图
  //   · seasons（沿用旧存档 ID）控制免费全彩地图包：四季地图、孤岛地点与亚特兰蒂斯场景
  //   · card    只改人物立绘的目录（identities → identities-card）
  //   · ink     不是"其中一种皮肤"，是**全部关掉**的基准，所以它不进这个集合
  // 地图包免费；其余付费包各 50 魂点，彼此独立且可同时开启。
  const SKIN_LS_KEY = 'guyuyizhang_skin';
  // ⚠️ 兼容老存档：以前这个 key 存的是**单个 id 字符串**（'accent' / 'ink' / …），现在存 JSON 数组。
  //    读到老格式就当成"只开了那一个"；'ink' 解析成空集（等于全关）。
  //    直接用 JSON.parse 会抛（裸字符串 'accent' 不是合法 JSON），所以里面还有一层 try。
  let skinSet = (() => {
    try {
      const raw = localStorage.getItem(SKIN_LS_KEY);
      if (!raw) return new Set();
      let arr;
      try { const j = JSON.parse(raw); arr = Array.isArray(j) ? j : [j]; }
      catch (e) { arr = [raw]; }
      return new Set(arr.filter(id => id !== 'ink' && SKINS.some(s => s.id === id)));
    } catch (e) { return new Set(); }
  })();
  function skinOn(id) { return skinSet.has(id); }
  function saveSkins() { try { localStorage.setItem(SKIN_LS_KEY, JSON.stringify([...skinSet])); } catch (e) {} }
  function applySkin() {
    // 没拥有的（改档 / 换账号 / 云端回滚）直接踢掉，别让界面标着"已开启"却什么都没变
    for (const id of [...skinSet]) if (!Game.skinOwned(id)) skinSet.delete(id);
    for (const s of SKINS) if (s.cls) document.body.classList.toggle(s.cls, skinOn(s.id));
    if (document.getElementById('top-day')) render();   // 已进游戏：立刻重绘，让物品图标换成对应皮肤那套（items / items-accent）
  }
  function enableSkin(id, on) {
    if (!SKINS.some(s => s.id === id) || id === 'ink' || !Game.skinOwned(id)) return;
    if (on) skinSet.add(id); else skinSet.delete(id);
    saveSkins(); applySkin();
  }
  function clearSkins() { skinSet.clear(); saveSkins(); applySkin(); }
  function skinName() {
    const on = SKINS.filter(s => skinOn(s.id)).map(s => s.name);
    return on.length ? on.join(' + ') : '墨白原味';
  }
  function islandMapPath(color = skinOn('seasons')) {
    const season = ({ '春':'spring', '夏':'summer', '秋':'autumn', '冬':'winter' })[Game.seasonInfo().name] || 'spring';
    const mode = color ? 'color' : 'mono';
    return `assets/img/seasons/${season}-${mode}.png`;
  }
  const COLOR_ISLAND_SCENES = new Set(['camp','farm','river','forest','bamboo','quarry','grassland','desert','cave','peak','sea','shore']);
  const COLOR_ATLANTIS_SCENES = new Set(['map','habitat','city','coral','trench','sanctum','shipwreck','coralForest','pearlCave','abyss']);
  function sceneImagePath(scene, zoneKey, basePath) {
    if(scene==='camp')return `assets/img/build/camp-ground-${skinOn('seasons')?'colored':'bw'}-v2.png`;
    if (!skinOn('seasons')) return basePath;
    if (scene === 'atlantis') {
      const key = zoneKey || 'map';
      if (COLOR_ATLANTIS_SCENES.has(key)) return `assets/img/map-pack/atlantis/${key}.jpg`;
      return basePath;
    }
    if (COLOR_ISLAND_SCENES.has(scene)) return `assets/img/map-pack/island/${scene}.jpg`;
    return basePath;
  }
  function mapImagePath(scene) {
    return scene === 'atlantis'
      ? (skinOn('seasons') ? 'assets/img/map-pack/atlantis/map.jpg' : 'assets/img/atlantis_map.png')
      : islandMapPath();
  }
  function baseMapImagePath(scene) {
    return scene === 'atlantis' ? 'assets/img/atlantis_map.png' : islandMapPath(false);
  }
  function atlantisVisualArrows() {
    const img = $('#map-img');
    return skinOn('seasons') && (!img || img.dataset.art !== img.dataset.baseArt)
      ? ATLANTIS_MAP_ARROWS_COLOR : ATLANTIS_MAP_ARROWS;
  }
  // ---------- 人物立绘（受皮肤包控制）----------
  // 取"第一个开着、且自带 portrait 目录"的皮肤；一个都没开就用默认那套。
  function portraitPath(id) {
    const s = SKINS.find(x => skinOn(x.id) && x.portrait);
    const dir = (s && s.portrait) || 'identities';
    return `assets/img/${dir}/${id}.png?v=${(typeof window !== 'undefined' && window.BUILD_VER) || '1'}`;
  }
  // 皮肤包里缺这张图 → 自动退回默认那套；默认也没有 → 直接隐藏（避免裂图）
  window.__portraitFail = function (img, id) {
    if (img.dataset.fb) { img.style.display = 'none'; return; }
    img.dataset.fb = '1';
    img.src = `assets/img/identities/${id}.png?v=${(typeof window !== 'undefined' && window.BUILD_VER) || '1'}`;
  };

  // ---------- 日志栏显示方式（设置里可改，存在本机、跨存档） ----------
  let logMode = (() => { try { const v = localStorage.getItem('guyuyizhang_logmode'); return ['always', 'fade', 'hidden'].includes(v) ? v : 'always'; } catch (e) { return 'always'; } })();
  let logFadeTimer = null;
  function applyLogMode() {
    const l = $('#log');
    document.body.classList.toggle('log-hidden', logMode === 'hidden');
    document.body.classList.toggle('log-fade', logMode === 'fade');
    if (!l) return;
    l.style.display = (logMode === 'hidden') ? 'none' : '';
    clearTimeout(logFadeTimer);
    if (logMode === 'fade') logFadeTimer = setTimeout(() => l.classList.add('dim'), 3000);
    else l.classList.remove('dim');
  }
  function setLogMode(m) {
    logMode = ['always', 'fade', 'hidden'].includes(m) ? m : 'always';
    try { localStorage.setItem('guyuyizhang_logmode', logMode); } catch (e) {}
    applyLogMode();
  }
  // 日志栏：尺寸三档 + 收起/展开（都记在本机）
  const LOG_WIDTHS = { tiny:110, narrow: 190, mid: 250, wide: 330 };
  // 日志栏宽度三档：默认「窄」（作者 2026-09-21）。**只在没设置过时**用窄，
  // 玩家已经选过 wide/mid 的偏好照旧（不能被这次改默认覆盖）。
  let logSize = (() => { try { const v = localStorage.getItem('guyuyizhang_logw'); return LOG_WIDTHS[v] ? v : 'narrow'; } catch (e) { return 'narrow'; } })();
  let logCollapsed = (() => { try { return localStorage.getItem('guyuyizhang_logcollapse') === '1'; } catch (e) { return false; } })();
  // 营地里的「当前目标」提示：作者 2026-09-19 加开关（本机偏好，存 localStorage）
  let showObjective = (() => { try { return localStorage.getItem('guyuyizhang_obj') === '1'; } catch (e) { return false; } })();
  let sceneScroll=(()=>{try{return localStorage.getItem('guyuyizhang_scene_scroll')!=='0';}catch(e){return true;}})();
  function setShowObjective(on) {
    showObjective = !!on;
    try { localStorage.setItem('guyuyizhang_obj', showObjective ? '1' : '0'); } catch (e) {}
    renderObjective();
  }
  function logWidthFor(w) {
    const mobile=w<900;
    const base=(LOG_WIDTHS[logSize] || 250)*(mobile?.62:1);
    return Math.round(Math.min(w*(mobile?.32:.5),Math.max(mobile?64:(logSize==='tiny'?88:150),Math.min(380,base))));
  }
  function setLogSize(s) {
    logSize = LOG_WIDTHS[s] ? s : 'mid';
    document.body.classList.toggle('log-tiny',logSize==='tiny');
    try { localStorage.setItem('guyuyizhang_logw', logSize); } catch (e) {}
    fitStage();
  }
  function applyLogCollapse() {
    document.body.classList.toggle('log-collapsed', logCollapsed);
    const g = document.getElementById('log-grip');
    if (g) { g.textContent = logCollapsed ? '▶' : '◀'; g.title = logCollapsed ? '展开日志栏' : '收起日志栏'; }
  }
  function bindLogCollapseBtn() {
    if (document.getElementById('log-grip')) return;
    const b = el('button', '', '◀');
    b.id = 'log-grip';
    b.onclick = () => {
      logCollapsed = !logCollapsed;
      try { localStorage.setItem('guyuyizhang_logcollapse', logCollapsed ? '1' : '0'); } catch (e) {}
      applyLogCollapse(); fitStage();
    };
    document.body.appendChild(b);
    applyLogCollapse();
  }
  function alignLogGrip() {
    const g = document.getElementById('log-grip');
    const bb = document.getElementById('btn-backmap');
    if (!g) return;
    if (!bb || !bb.offsetHeight) { g.style.display = 'none'; return; }   // 标题页等没有「返回地图」的场合，整个隐藏
    g.style.display = 'flex';
    const r = bb.getBoundingClientRect();
    g.style.left = Math.round(r.right + 8) + 'px';
    g.style.top = Math.round(r.top) + 'px';
    g.style.height = Math.round(r.height) + 'px';   // 高度跟「返回地图」一致
    g.style.minHeight = Math.round(r.height) + 'px';
    const name=$('#scene-name'),stage=$('#scene-wrap');
    if(name && stage) { const sr=stage.getBoundingClientRect(); name.style.left=Math.round(r.right+g.getBoundingClientRect().width+16-sr.left)+'px';name.style.top=Math.round(r.top-sr.top)+'px'; }
  }
  function renderObjective() {
    const o = $('#objective');
    if (!o) return;
    const st = S();
    // 只在营地显示当前目标；设置里可以整个关掉（作者 2026-09-19）
    if (!st || st.scene !== 'camp' || !showObjective) { dom.html(o,''); return; }
    const obj = Game.currentObjective();
    dom.html(o,obj ? `<span class="obj-mark">◈</span> 当前目标：${esc(obj)}` : '');
  }

  // ---------- 主渲染 ----------
  function render() {
    try { renderInner(); restoreCombatView(); }
    catch (e) { onRenderCrash(e); }
    finally { document.body.classList.toggle('modal-open', !!$('#modal.open')); }
  }
  // ⚠️ 玩家反馈"上午还好好的，下午一开就一直闪退"。手机 WebView 里的"闪退"通常是页面抛异常
  //    或者被系统判定内存吃紧后杀掉。纯前端游戏最怕的是：读档后某一步抛异常 → **每次打开都崩**，
  //    玩家再也进不去、还没法导出存档。所以这里加一道自检：
  //    ① 把最后一次报错留在本机  ② 数"连续几次启动没走到渲染成功"  ③ 连着崩就把玩家放进安全模式。
  const BOOT_KEY = 'guyuyizhang_boot', CRASH_KEY = 'guyuyizhang_crashes', ERR_KEY = 'guyuyizhang_lasterr';
  const SVCRASH_KEY = 'guyuyizhang_savecrash';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function recordError(msg) { lsSet(ERR_KEY, String(msg === undefined ? 'unknown' : msg).slice(0, 300)); }
  function bootCrashes() { return parseInt(lsGet(CRASH_KEY) || '0', 10) || 0; }
  function noteBootStart() {
    let prevOk = false;
    try { const p = lsGet(BOOT_KEY); prevOk = !!(p && JSON.parse(p).ok); } catch (e) {}
    const n = prevOk ? 0 : bootCrashes() + (lsGet(BOOT_KEY) ? 1 : 0);
    lsSet(CRASH_KEY, String(n));
    lsSet(BOOT_KEY, JSON.stringify({ at: Date.now(), ok: false }));
    return n;
  }
  function noteBootOk() { lsSet(BOOT_KEY, JSON.stringify({ at: Date.now(), ok: true })); lsSet(CRASH_KEY, '0'); }
  // ⚠️ 以前 noteBootOk() 只在"进入游戏主界面"时才调，于是"只打开标题页就退出"也被当成崩溃 ——
  //    玩家反馈"什么叫刷新一次就启动异常，太频繁了"（安全模式误报）。
  //    现在分成两个计数：① 启动崩溃（连标题页都没出来）② 进游戏后崩溃（读档就崩那种）。
  function inGameCrashes() { return parseInt(lsGet(SVCRASH_KEY) || '0', 10) || 0; }
  function noteInGameCrash() { const n = inGameCrashes() + 1; lsSet(SVCRASH_KEY, String(n)); return n; }
  function clearInGameCrash() { lsSet(SVCRASH_KEY, '0'); }
  function onRenderCrash(e) {
    const msg = (e && (e.message || e)) + ' @ ' + ((e && e.stack) ? String(e.stack).split('\n')[1] || '' : '');
    recordError(msg);
    noteInGameCrash();   // 这一崩发生在"已经进游戏"之后（启动本身成功的）→ 记到另一个计数里
    try { console.error('[孤屿遗章] 渲染出错：', e); } catch (err) {}
    const t = document.getElementById('crash-toast');
    if (!t) {
      const d = document.createElement('div');
      d.id = 'crash-toast';
      d.style.cssText = 'position:fixed;left:50%;bottom:calc(var(--navh,30px) + 8px);transform:translateX(-50%);z-index:3000;'
        + 'background:rgba(24,21,12,0.96);border:1px solid #c9b98a;color:#efe9d6;padding:6px 12px;border-radius:8px;font-size:12px;max-width:92vw';
      d.textContent = '界面出错了（已记录，可在菜单→备份里导出存档码）：' + String(msg).slice(0, 90);
      document.body.appendChild(d);
      setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 8000);
    }
  }
  window.addEventListener('error', (e) => { recordError((e && (e.message || (e.error && e.error.message))) || 'error'); });
  window.addEventListener('unhandledrejection', (e) => { recordError((e && e.reason && (e.reason.message || e.reason)) || 'rejection'); });
  function renderInner() {
    const st = S();
    if (!st) return;
    document.body.classList.toggle('nightmare-mode',st.difficulty==='nightmare' && !st.flags.ended_N);
    document.body.classList.toggle('legend-mode',st.difficulty==='legend');
    document.body.style.setProperty('--night-red',`hsl(354 70% ${Math.max(50,70-Math.floor(st.day/20)*2)}%)`);
    if (st.scene !== 'camp' || view === 'map') roomView = false;
    if (!$('#top-day')) return;   // 游戏主界面尚未挂载（标题/选择画面阶段）
    // 进入地图（从场景回到地图）→ 自动把"你所在的地方"对到画面中央，但不许拖出地图边界
    const wasMap = _lastView === 'map';
    _lastView = view;
    document.body.classList.toggle('on-map', view === 'map');
    document.body.classList.toggle('in-room', roomView);
    document.body.classList.toggle('room-fullcolor', roomView && skinOn('seasons'));
    const back = $('#btn-backmap');
    if (back) dom.text(back,roomView ? '← 返回营地' : view === 'map' ? '← 返回场景' : '← 返回地图');
    renderTut(st);
    renderTopbar();
    renderObjective();
    if (view === 'map') renderMap(!wasMap);
    else renderScene();
    renderExtras();
    bindLogGrip();   // 日志可上下滑（热点/箭头优先）；只挂一次
    bindLogCollapseBtn();   // 日志栏收起/展开按钮；只挂一次
    fitStage();   // 面板渲染完再定位（否则首次布局未稳定→按钮/日志错位）
    // 音效环境随场景/昼夜/天气/篝火切换
    const night = Game.isNight();
    const fireBuilt = st.buildings.fire >= 0;
    if (!lastEnv || lastEnv.scene !== st.scene || lastEnv.night !== night || lastEnv.weather !== st.weather || lastEnv.fire !== fireBuilt) {
      AudioFX.setFire(fireBuilt);
      AudioFX.setEnv(night, st.weather);
      AudioFX.setScene(st.scene, st.scene === 'atlantis' && ['trench', 'abyss', 'sanctum'].includes(st.zone));
      AudioFX.setTension(st.stats.hp / Game.hpMax() < 0.35 ? 1 : 0);
    }
    lastEnv = { scene: st.scene, night, weather: st.weather, fire: fireBuilt };
    noteBootOk();        // 这一帧渲染完了 = 这次启动没崩，清掉崩溃计数
    clearInGameCrash();  // 游戏界面正常渲染 = 上次"读档就崩"的状态已经好了
  }
  let lastEnv = null;

  // ---------- 动作动画（采集/建造/制造/攻击）+ 二倍速 ----------
  let animFast = false;
  let animSpeed = (() => { try { const v = parseInt(localStorage.getItem('guyuyizhang_anim') || '1', 10); return (v >= 1 && v <= 3) ? v : 1; } catch (e) { return 1; } })();
  let restHours = (() => { try { const v = parseInt(localStorage.getItem('guyuyizhang_rest') || '1', 10); return (v >= 1 && v <= 3) ? v : 1; } catch (e) { return 1; } })();   // 休息时长：1→2→3 循环
  let uiBusy = false;
  let prevCampBuilds = new Set();
  let prevMapBuilds = new Set();
  const ANIM_MS = { gather: 3000, build: 3000, craft: 3000, fight: 1000, sleep: 2600, rest: 2000 };
  const ANIM_GLYPH = { gather:'采', build:'建', craft:'制', fight:'战', sleep:'眠', rest:'歇' };
  // ---------- 内联 SVG 动画图案（可选兜底）----------
  // 采集三件套（石镐 pick / 手摘浆果 berry_pick / 木勺舀水 water_ladle）已改为正式 PNG 素材，
  // 走下面的 assets/img/anim/<name>.png 通道，与斧/锤/剑同一套画风，不再内联自绘。
  // 这个表保留为空：将来某个图案暂时没有 PNG 时，可以临时在这里塞一段 data-URI 顶上。
  const ANIM_SVG = {};
  // 少数点位名和图标不是字面匹配（既不是"石/矿"也不是"网"），正则兜不住，这里点名指定。
  // 其余点位仍走下面的关键词判定，别把这张表越写越大。
  const POINT_ICON = {
    river_net:'fish', sea_fish:'fish', sea_deep:'fish',   // 撒网/深水捕大鱼：是捕鱼，不是通用采集
    quarry_deep:'pick', cave_deep:'pick', peak_mithril:'pick',   // 深层矿脉/秘银矿脉：是矿，该用镐
  };
  function showBusy(type, label, imgHint) {
    const b = $('#busy');
    if (!b) return;
    const im = imgHint || (type === 'fight' ? 'sword' : type === 'build' ? 'hammer_icon' : type === 'craft' ? 'pot' : type === 'sleep' ? 'sleep_night' : 'axe_icon');
    // 不挥砍、无刀光的图案：石镐（pick）照旧挥动，像斧子那样；手摘/舀水只轻轻动，不该"劈"
    const calm = (['pot','rest','dive','fish','gather','sleep_nap','sleep_night','berry_pick','water_ladle'].includes(im));
    // 有自绘 SVG 的图案直接用内联图（不需要 PNG 资源）；其余仍走 assets/img/anim/*.png
    const svg = ANIM_SVG[im];
    const inner = svg
      ? `<svg class="busy-img ${im} ${calm ? 'calm' : ''}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${svg.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>`
      : `<img class="busy-img ${im} ${calm ? 'calm' : ''} ${skinOn('seasons')?'art-colored':''}" src="assets/img/${skinOn('seasons')?'anim-colored':'anim-clean'}/${im}.png" alt="" onerror="this.onerror=null;this.src='assets/img/anim/${im}.png'">`;
    b.innerHTML = `<div class="busy-box">
      <div class="busy-scene ${type}">${inner}<span class="busy-slash" ${calm ? 'style="display:none"' : ''}></span></div>
      <div class="busy-label">${esc(label)}</div>
      <div class="busy-dots"><i></i><i></i><i></i></div>
    </div>`;
    b.classList.add('open');
    const workSound = im==='axe_icon'?'woodwork':im==='pick'?'stonework':im==='berry_pick'||im==='gather'?'forage':im==='water_ladle'?'waterwork':im==='fish'||im==='dive'?'fishing':im==='pot'?'cooking':type==='build'?'construction':type==='craft'?'metalwork':null;
    if (workSound) AudioFX.play(workSound);
    clearInterval(b.__chop);
    if (workSound && ['gather','build','craft'].includes(type)) b.__chop = setInterval(() => AudioFX.play(workSound), im==='pot'?1100:im==='fish'?1250:im==='gather'||im==='berry_pick'?950:820);
  }
  function hideBusy() { const b = $('#busy'); if (b) { clearInterval(b.__chop); b.classList.remove('open'); } }
  function withAnimation(type, label, fn, imgHint) {
    if (uiBusy) return;
    uiBusy = true;
    const dur = Math.round((ANIM_MS[type] || 2500) / animSpeed);
    showBusy(type, label || '动作中…', imgHint);
    setTimeout(() => { hideBusy(); uiBusy = false; fn(); }, dur);
  }

  function renderTopbar() {
    const st = S();
    const w = WEATHER[st.weather].name;
    const se = Game.seasonInfo();
    dom.text($('#top-day'),`第 ${st.day} 天`);
    // 冻结期间在时间前标个 ⏸：让玩家知道"不是卡住了，是看面板时时间停住了"
    dom.text($('#top-time'),(Game.timeFrozen && Game.timeFrozen() ? '⏸ ' : '') + Game.fmtTime());
    dom.text($('#top-season'),`${se.name}季`);
    dom.text($('#top-weather'),`${WEATHER[st.weather].glyph || ''} ${w}`);
    dom.text($('#top-temperature'),`${Game.weatherTemperature()}℃`);
    const bars = { health: Game.healthValue(), hp: st.stats.hp, stamina: st.stats.stamina, hunger: st.stats.hunger, thirst: st.stats.thirst, spirit: st.stats.spirit };
    const mSt = Game.maxStam();
    for (const k in bars) {
      const fill = $(`#bar-${k}`);
      if (fill) fill.style.width = (k === 'stamina' ? (bars[k] / mSt) : k === 'hp' ? (bars[k] / Game.hpMax()) : bars[k] / 100) * 100 + '%';
      const num = $(`#num-${k}`);
      if (num) dom.text(num,k === 'hp' ? `${Math.round(bars[k])}/${Game.hpMax()}` : Math.round(bars[k]));
      // 饱食 / 水分 / 生命 严格 <30 → 变红（数值与进度条都变红）；恢复 ≥30 自动复原。两套皮肤都可读。
      const low = (k === 'hunger' || k === 'thirst' || k === 'hp') && bars[k] < 30 || k==='health' && bars[k]<40;
      if (fill) { fill.classList.toggle('bar-low', low); if (fill.parentElement) fill.parentElement.classList.toggle('low-border', low); }
      if (num) num.classList.toggle('num-low', low);
    }
    const capEl = $('#cap');
    if (capEl) {
      const over = Game.capUsed() > Game.capacity();
      dom.text(capEl,`${Game.capUsed()}/${Game.capacity()} 格${over ? ' ⚠' : ''}`);
      capEl.classList.toggle('num-low', over);
      capEl.title = over ? `带了过多的物品，移动体力消耗增加${Game.loadPenalty().percent}%。物品仍保留，可存入仓库或丢弃以减轻负重。` : '';
    }
    const mcnt = $('#mail-count'); if (mcnt) dom.text(mcnt,(Game.mailboxCount() > 0 ? Game.mailboxCount() : ''));
    // 状态徽标
    const sts = [];
    if (st.statuses.bleed) sts.push('流血');
    if (st.statuses.poison) sts.push('中毒');
    sts.push(`健康：${Game.healthValue()}/100`);
    if(st.statuses.infection)sts.push(st.statuses.infection>=2?'感染恶化：每小时-4生命':'感染：每小时-2生命');
    const temp = Game.temperatureInfo();
    sts.push(`温度：${temp.state === 'cold' ? '寒冷' : temp.state === 'heat' ? '炎热' : '适宜'}${temp.state !== 'normal' && temp.grace ? `（缓冲 ${temp.grace} 分）` : ''}`);
    if (st.statuses.fear) sts.push('恐惧');
    // 水下：不穿潜水服（水压 -6/小时）/ 没有氧气来源（缺氧 -3/小时）。
    // 这两条每小时真掉血，但以前**根本不在徽标列表里**，加上窄屏整条被 CSS 隐藏，
    // 玩家在海底就是"看着血往下掉、不知道为什么"（作者 2026-09-23 反馈）。现算，换装立刻消失。
    const dw = Game.diveWarn ? Game.diveWarn() : null;
    if (dw && dw.pressure) sts.push('水压：没穿潜水服，每小时-6生命');
    if (dw && dw.o2) sts.push('缺氧：每小时-3生命');
    // 精神低落会压低体力上限（蓝牛的代价就体现在这里）
    if (st.stats.spirit < 20) sts.push('精神恍惚：体力上限-20%、采集耗时+10%');
    else if (st.stats.spirit < 50) sts.push('精神低落：体力上限-10%');
    if((st.statuses.nauseaUntil || 0)>(st.tick||0)) sts.push(`反胃：体耗+50%（${Math.ceil((st.statuses.nauseaUntil-st.tick)/60)}小时）`);
    for(const b of Game.activeBuffs()) sts.push(`${b.name}+${b.stat==='accuracy'?Math.round(b.value*100)+'%':b.value}（${b.minutes}分）`);
    const tempHint = temp.state === 'normal' ? '体温舒适' : temp.grace ? `还有 ${temp.grace} 分钟换衣缓冲` : `命中 -10 个百分点，每小时 -${temp.state === 'cold' ? 5 : 3} 生命`;
    const brief={流血:'每小时失去5生命，并降低健康。止血绷带可以止血。',中毒:'每小时失去3生命，并降低健康。解毒剂可以解毒。',恐惧:'降低命中。持续恐惧会降低健康，防御可抵挡梦魇恐吓。'};
    const badges=sts.map(full=>{let name=full.split('：')[0].split('+')[0],text=full;if(full.startsWith('温度：')){name=temp.state==='cold'?'寒冷':temp.state==='heat'?'炎热':'适宜';text=tempHint;}if(name==='健康')text=`健康${Game.healthValue()}/100。实际受伤或持续负面状态降低健康；低于40且久未治疗可能感染。简易药膏+20健康；草药膏+15健康并治疗感染；解毒剂+10健康并解毒。`;if(brief[name])text=brief[name];return {name,text,danger:/流血|中毒|寒冷|炎热|恐惧|水压|缺氧|精神|反胃|感染/.test(name)};});
    dom.html($('#status-badges'),badges.slice().sort((a,b)=>Number(b.danger)-Number(a.danger)).slice(0,window.innerWidth<900?1:2).map((b,i)=>`<button type="button" class="badge ${b.danger?'danger':''}" data-buff-info="${i}">${esc(b.name)}</button>`).join('')+'<button type="button" class="badge" data-buff-info="all">状态</button>');
    $('#status-badges').querySelectorAll('[data-buff-info]').forEach(b=>bindPress(b,()=>{modalOpenedAt=Date.now();showBuffInfo('当前状态',badges.map(v=>v.name+'：'+v.text).join('\n\n'));}));

  }

  // ---------- 地图视图（带缓存：底图只加载一次，箭头动态刷新） ----------
  let mapBuilt = false;
  let mapPanY = 0;            // 大地图上下平移（像素）
  let mapPanX = 0;            // 大地图左右平移（恒为 0：宽度已经和屏幕一致，横向锁死）
  let _lastView = null;
  // ---------- 大地图的尺寸规则（作者 2026-09-15 最终定调）----------
  // 【宽度 = 屏幕宽度】（手机 / 平板 / 电脑一视同仁），高度按原图比例算出来，
  //  多出来的部分靠上下拖动看。横向锁死（不留横向拖动，也不会左右裁掉内容）。
  //  ⛔ 以前用的是 cover（等比放大到"盖住整屏"）：为了让高度也铺满，图片被放得比屏幕宽，
  //     左右两边就被裁掉了 —— 玩家看到的正是"地图没显示完全"。现在不用那套了。
  function mapBox(iw, ih, bw, bh) {
    if (!iw || !ih || !bw || !bh) return null;
    const w = bw, h = ih * (bw / iw);
    return { w, h, left: 0, top: (bh - h) / 2, maxPan: Math.max(0, (h - bh) / 2) };
  }
  // ---------- 铺满（cover）：图片铺满舞台，热点层跟着同一套坐标缩放 ----------
  // 舞台现在吃满整个画面区（不再固定 16:9），所以图片一律按"铺满 + 可上下拖"来摆：
  // 图片内容盒 = 等比缩放到盖住舞台，多出来的纵向部分靠拖动看，热点/箭头始终贴在画面上。
  function coverBox(iw, ih, bw, bh, zoom) {
    if (!iw || !ih || !bw || !bh) return null;
    const sCover = Math.max(bw / iw, bh / ih) * (zoom || 1);
    // 竖屏兜底：手机竖屏下"铺满高度"会把图横着裁掉一大半（只剩中间一条），所以改成"至少铺满宽度"，能拖动看右边。
    // ⚠️ 这个下界必须是【抬高】而不是 min 的钳制：以前写成 min(max(bw/iw*1.10, bh/ih), sCover)，
    //    结果 zoom 完全被吃掉——横版地图(iw/ih≈1.78)在宽屏(bw/bh≈2.16)上，「铺满宽度」只比「铺满高度」
    //    大一点点，s 被钉死在 bh/ih 上，放多少倍高度都不变；于是 maxPan 长期只有 116px，
    //    "把当前场景对到画面中间"根本做不到（营地在地图 88% 处，需要约 195px）。
    //    现在 zoom 是真正的下界，只有"竖屏会被裁掉一大半"时才用下界把 s 抬上去。
    const sFloor = Math.max(bw / iw * 1.10, bh / ih);
    // 两种来源取大者：① zoom 倍铺满；② 真正的竖屏兜底（铺满宽度比铺满高度大很多时，才用它把图抬上去）
    const s = Math.max(sCover, sFloor > (bh / ih) * 1.02 ? sFloor : 0);
    const w = iw * s, h = ih * s;
    return { w: w, h: h, left: (bw - w) / 2, top: (bh - h) / 2, maxPan: Math.max(0, (h - bh) / 2) };
  }
  function applyBox(sel, box, panY, panX) {
    const e = $(sel); if (!e || !box) return;
    e.style.position = 'absolute';
    e.style.left = (box.left + (panX || 0)) + 'px';
    e.style.top = (box.top + (panY || 0)) + 'px';
    e.style.width = box.w + 'px';
    e.style.height = box.h + 'px';
    e.style.right = 'auto'; e.style.bottom = 'auto';
    e.style.maxWidth = 'none'; e.style.maxHeight = 'none';
  }
  // 只更新位置（拖动时每帧走这里，不做昂贵的贴边重排）
  function applyMapPan() {
    const img = $('#map-img'), wrap = $('#map-wrap');
    if (!img || !wrap || !img.naturalWidth) return null;
    const box = mapBox(img.naturalWidth, img.naturalHeight, wrap.clientWidth, wrap.clientHeight);
    if (!box) return null;
    mapPanY = Math.max(-box.maxPan, Math.min(box.maxPan, mapPanY));
    mapPanX = 0;          // 宽度已经和屏幕一致：横向没有可拖的余量，也不允许左右裁切
    applyBox('#map-img', box, mapPanY, 0);
    applyBox('#map-arrows', box, mapPanY, 0);
    applyBox('#map-buildings', box, mapPanY, 0);
    return box;
  }
  function fitMapArrowsToImage(reset) {
    const img = $('#map-img'), wrap = $('#map-wrap');
    if (!img || !wrap || !img.naturalWidth) return;
    if (reset) { mapPanY = 0; mapPanX = 0; }
    if (!applyMapPan()) return;
    fitMapArrowsInView();
  }
  // 热点和建筑始终使用原图坐标。关闭滑动仅等比裁切，营地取偏下的建筑区域。
  let scenePanY = 0;
  function applyScenePan() {
    if (roomView) { scenePanY = 0; return null; }
    const img = $('#scene-img'), wrap = $('#scene-wrap');
    if (!img || !wrap || !img.naturalWidth) return null;
    const scale=Math.max(wrap.clientWidth/img.naturalWidth,wrap.clientHeight/img.naturalHeight);
    const focus = S()?.scene === 'camp' ? .64 : .5;
    const scaledW = img.naturalWidth * scale, scaledH = img.naturalHeight * scale;
    const box = sceneScroll ? mapBox(img.naturalWidth, img.naturalHeight, wrap.clientWidth, wrap.clientHeight) : {w:scaledW,h:scaledH,left:(wrap.clientWidth-scaledW)/2,top:Math.max(wrap.clientHeight-scaledH,Math.min(0,wrap.clientHeight/2-scaledH*focus)),maxPan:0};
    img.style.objectFit='fill';
    if (!box) return null;
    scenePanY = Math.max(-box.maxPan, Math.min(box.maxPan, scenePanY));
    applyBox('#scene-img', box, scenePanY);
    applyBox('#hotspots', box, scenePanY);
    applyBox('#camp-buildings', box, scenePanY);
    return box;
  }
  function fitSceneLayers(reset) {
    if (reset) scenePanY = 0;
    applyScenePan();
  }
  // 上下拖动（地图 / 场景共用）：按住画面空白处拖，按热点和按钮不算拖动
  function bindPan(sel, getPan, setPan, settle) {
    const wrap = $(sel);
    if (!wrap || wrap.dataset.panBound) return;
    wrap.dataset.panBound = '1';
    let dragging = false, startY = 0, startPan = 0, moved = false;
    wrap.addEventListener('pointerdown', (e) => {
      if(!sceneScroll && sel!=='#map-wrap') return;
      if (e.target && e.target.closest && e.target.closest('.map-arrow, .hotspot, .target, .target-pick, button, .zone-btn')) return;
      dragging = true; moved = false; startY = e.clientY; startPan = getPan();
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dy = e.clientY - startY;
      if (!moved && Math.abs(dy) < 4) return;    // 抖动 4px 以内当点击，画面不跟着晃
      moved = true;
      setPan(startPan + dy);
    });
    const stop = () => { if (!dragging) return; dragging = false; if (moved) settle(); };
    wrap.addEventListener('pointerup', stop);
    wrap.addEventListener('pointercancel', stop);
    wrap.addEventListener('pointerleave', stop);
    let wheelT = 0;
    wrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      if(!sceneScroll && sel!=='#map-wrap') return;
      setPan(getPan() + e.deltaY);
      clearTimeout(wheelT); wheelT = setTimeout(settle, 140);   // 滚轮停下再重排贴边标签，省性能
    }, { passive: false });
  }
  function bindMapPan() {
    bindPan('#map-wrap', () => mapPanY, (v) => { mapPanY = v; applyMapPan(); }, fitMapArrowsInView);
  }
  // 日志：可以上下滑看历史，但优先级低于热点/箭头
  //   1) 按到"日志下面的热点/箭头"→ 把这一下转发给它
  //   2) 日志自己有内容可滚 → 交给浏览器原生滚动
  //   3) 没得滚 → 拖着直接带动地图/场景平移（等于以前"日志不挡地图"）
  function bindLogGrip() {
    const log = $('#log'), body = $('#logbody');
    if (!log || log.dataset.gripBound) return;
    log.dataset.gripBound = '1';
    const UNDER = '.hotspot, .map-arrow, .zone-btn, .target, [data-choice]';
    let dragging = false, startY = 0, startPan = 0, moved = false;
    log.addEventListener('pointerdown', (e) => {
      if (e.target && e.target.closest && e.target.closest('button, a, input, select')) return;
      if (document.elementsFromPoint) {
        const under = document.elementsFromPoint(e.clientX, e.clientY).filter(el => el !== log && !log.contains(el));
        const hit = under.map(el => (el.closest ? el.closest(UNDER) : null)).find(Boolean);
        if (hit) { e.preventDefault(); e.stopPropagation(); hit.click(); return; }
      }
      if (body && body.scrollHeight > body.clientHeight + 2) return;   // 有历史可翻 → 原生滚动
      if(!sceneScroll && view!=='map') return;
      dragging = true; moved = false; startY = e.clientY;
      startPan = (view === 'map') ? mapPanY : scenePanY;
      if (log.setPointerCapture) { try { log.setPointerCapture(e.pointerId); } catch (err) {} }
    });
    log.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dy = e.clientY - startY;
      if (!moved && Math.abs(dy) < 4) return;
      moved = true;
      e.preventDefault();
      if (view === 'map') { mapPanY = startPan + dy; applyMapPan(); }
      else { scenePanY = startPan + dy; applyScenePan(); }
    });
    const stop = () => { if (!dragging) return; dragging = false; if (moved && view === 'map') fitMapArrowsInView(); };
    log.addEventListener('pointerup', stop);
    log.addEventListener('pointercancel', stop);
    log.addEventListener('pointerleave', stop);
  }
  // 贴边的箭头会被舞台裁掉（典型的：「↑ 返回孤岛」「珍珠洞窟」在亚克兰蒂斯地图最上面，
  // 箭头默认往上方展开，小屏上正好被顶边切掉一半）。
  // 这里按实际渲染位置逐个修正：顶出上边缘的翻成"箭头在上、标签在下"；顶到左右的往内推。
  // 地图热点：**完全锁定在地图上** —— 位置只由"地图百分比 + 地图自身的位移/缩放"决定。
  // 不做显示/隐藏判定、不做任何独立位移（曾经用 display:none 藏滑出画面的热点、
  // 用 marginLeft 把压边的标签推回画面，结果热点看起来"乱飘、还会突然消失"，作者明确要求拆掉）。
  // 现在滑出画面的热点就跟着地图一起滑出画面（被 #map-wrap 的 overflow:hidden 裁掉），拖回来自然重现。
  // 热点完全固定：位置只由地图坐标决定，不做任何显隐判定、不做任何独立位移。
  // ⚠️ 这里以前还有一条"贴顶时把箭头换到标签上方"的做法，拖动时会在阈值附近来回切换、
  //    还带 CSS transform 过渡 —— 看起来就是"热点自己有位移和动画"。玩家明确不要，已彻底删掉。
  //    所有场景一视同仁（山顶、珍珠洞窟和别的热点没有任何区别）。
  function fitMapArrowsInView() {
    const box = $('#map-arrows');
    if (!box) return;
    box.querySelectorAll('.map-arrow').forEach(a => {
      if (!a.dataset.pctL) { a.dataset.pctL = a.style.left; a.dataset.pctT = a.style.top; }
      a.style.left = a.dataset.pctL; a.style.top = a.dataset.pctT;
      a.classList.remove('offscreen');
      a.style.marginLeft = '';      // 不许有任何独立位移
      a.classList.remove('arrow-below');   // 不许换朝向（那也是一种独立位移 + 动画）
    });
  }
  // ---------- 进地图：自动居中到"你现在所在的地方" ----------
  // 作者要求：进地图一定要自动居中（从营地出来就该看到营地），但**不许突破地图边界**——
  //   拖出黑边那种事不能干。所以：先算出"把锚点放到舞台正中"需要的平移量，
  //   再夹到"整张图仍然盖满舞台"的范围里。地图本身不够大时（宽屏上纵向常常只多几十像素），
  //   就居中到能居中的极限，锚点保证在画面里，绝不会出现空白。
  let mapPendingCenter = false;
  function centerMapOnHere() {
    const img = $('#map-img'), wrap = $('#map-wrap'), layer = $('#map-arrows');
    if (!img || !wrap || !layer || !img.naturalWidth || !wrap.clientWidth || !wrap.clientHeight) return false;
    const here = layer.querySelector('.map-arrow.here') || layer.querySelector('.map-arrow');
    if (!here) return false;
    const box = mapBox(img.naturalWidth, img.naturalHeight, wrap.clientWidth, wrap.clientHeight);
    if (!box) return false;
    const fy = parseFloat(here.dataset.pctT || here.style.top) / 100;
    if (!isFinite(fy)) return false;
    const ay = box.top + box.h * fy;         // 没平移时锚点相对舞台的纵向位置
    // 宽度已经贴合屏幕 → 横向不用（也不许）平移；纵向把"你在这里"对到画面中间，超出边界的部分夹住。
    const limY = Math.max(0, (box.h - wrap.clientHeight) / 2);
    mapPanX = 0;
    mapPanY = Math.max(-limY, Math.min(limY, wrap.clientHeight / 2 - ay));
    applyMapPan();
    return true;
  }
  function tryCenterMap() { if (mapPendingCenter && centerMapOnHere()) mapPendingCenter = false; }
  function renderMap(justEntered) {
    const st = S();
    const m = $('#main');
    if (!mapBuilt || !$('#map-img')) {
      dom.dispose(m);m.innerHTML = `
        <div id="map-wrap" class="stage">
          <div id="stage-inner">
            <img id="map-img" src="${mapImagePath(st.scene)}" data-art="${mapImagePath(st.scene)}" data-base-art="${baseMapImagePath(st.scene)}" alt="全景地图" draggable="false" loading="eager" fetchpriority="high">
            <div id="map-buildings"></div>
            <div id="map-arrows"></div>
          </div>
          <div id="map-vignette"></div>
          <div id="weather-overlay"></div>
          <div id="map-caption"></div>
        </div>`;
      const img = $('#map-img');
      if (img) {
        img.onerror = () => {
          if (img.dataset.baseArt && img.dataset.art !== img.dataset.baseArt) { img.dataset.art = img.dataset.baseArt; img.src = img.dataset.baseArt; return; }
          img.onerror = null;
          img.src = PAPER_FALLBACK;
          addLog('地图图片加载失败，可切换场景后重试；其他操作仍可继续。', 'warn');
        };
        img.onload = () => { fitStage(); fitMapArrowsToImage(); refreshMapArrows(S()); tryCenterMap(); };
        const mnight = Game.isNight(), mdusk = Game.isDusk();
        const mapGray = skinOn('seasons') ? '' : 'grayscale(1) ';
        img.style.filter = mapGray + (mnight ? 'brightness(0.5) contrast(1.1)' : mdusk ? 'brightness(0.68) contrast(1.05)' : 'brightness(0.92) contrast(1.05)');
      }
      mapBuilt = true;
      fitStage();
      bindMapPan();
    }
    const wName = (WEATHER[st.weather] || {}).name || '';
    $('#map-caption').textContent = (st.scene === 'atlantis' ? '亚克兰蒂斯 · 失落文明的版图' : (st.buildings.watch > 0 ? `瞭望台：${BUILDING_CHAINS.watch[st.buildings.watch].name}` : '营地旁的小丘上，还没有瞭望台。')) + ` · ${(WEATHER[st.weather] || {}).glyph || ''}${wName}（可上下拖动地图）`;
    const mwo = $('#weather-overlay');
    if (mwo) mwo.className = st.scene === 'atlantis' ? '' : (st.weather === 'rain' ? 'rain' : st.weather === 'storm' ? 'storm' : st.weather === 'snow' ? 'snow' : st.weather === 'fog' ? 'fog' : '');
    $('#map-vignette').style.opacity = String(Math.max(0, 0.55 - st.buildings.watch * 0.18));
    const mimg = $('#map-img');
    if (mimg) {
      const want = mapImagePath(st.scene);
      if (mimg.dataset.world !== want) {   // 孤岛 ⇄ 海底换图：平移量归零，避免停在上一次的位置
        mimg.dataset.world = want; mimg.dataset.art = want; mimg.src = want;
        mimg.dataset.baseArt = baseMapImagePath(st.scene);
        if (mimg.dataset.scene !== st.scene) { mapPanY = 0; mapPanX = 0; }
        mimg.dataset.scene = st.scene;
      }
      mimg.classList.add('cover');   // 两张图都铺满舞台（左右不留黑边），纵向余量靠上下拖
      const mn = Game.isNight(), md = Game.isDusk();
      const gray = skinOn('seasons') ? '' : 'grayscale(1) ';
      mimg.style.filter = gray + (st.scene === 'atlantis' ? 'brightness(0.97) contrast(1.04)' : mn ? 'brightness(0.5) contrast(1.1)' : md ? 'brightness(0.68) contrast(1.05)' : 'brightness(0.92) contrast(1.05)');
    }
    fitMapArrowsToImage();
    refreshMapArrows(st);
    // 刚进地图（或刚落地）→ 居中一次；之后玩家自己拖，不再抢镜头。
    // 热点位置始终只由地图坐标决定，这里只动"地图停在哪儿"。
    if (justEntered) mapPendingCenter = true;
    tryCenterMap();
    if (st.scene === 'atlantis') { const w = $('#map-buildings'); if (w) w.innerHTML = ''; } else renderBuildings(st);
  }
  // 地图上的建筑精灵：建造了才出现，升级就换更高等级（mix-blend 混合进底图）
  function renderBuildings(st) {
    const wrap = $('#map-buildings');
    if (!wrap) return;
    const target=wrap, fragment=document.createDocumentFragment();
    const b = st.buildings;
    const rows = [];
    // 地图上的营地底图已画好帐篷+箱子：只额外叠加 瞭望台/船坞/耕地，避免重复
    if (b.watch >= 1) rows.push({ img:'build/watch' + b.watch, x:44, y:76, w:44, label: BUILDING_CHAINS.watch[b.watch].name });
    if (b.dock >= 1) rows.push({ img:'build/dock', x:70, y:84, w:54, label: BUILDING_CHAINS.dock[b.dock].name });
    // 耕地不在营地/地图上显示田块
    const cur = new Set(rows.map(r => r.img));
    for (const r of rows) {
      const p = el('div', 'build-plate', '');p.dataset.building=r.img;
      p.style.left = r.x + '%'; p.style.top = r.y + '%';
      const isNew = !prevMapBuilds.has(r.img);
      p.innerHTML = `<img class="build-sprite${isNew ? ' build-new' : ''}" style="width:${r.w}px" src="assets/img/${r.img}.png" alt="" draggable="false" onerror="this.style.display='none'"><span class="build-label">${r.label}</span>`;
      fragment.appendChild(p);
    }
    prevMapBuilds = cur;
    dom.reconcile(target,fragment);
  }
  // 营地场景：建造后显现的建筑精灵（尺寸按背景实际宽度百分比，随放大一起缩放）
  function renderCampBuildings(st) {
    if (roomView) return;
    const wrap = $('#camp-buildings');
    if (!wrap) return;
    const stage = $('#scene-wrap');
    const stageW = Math.max(600, wrap.clientWidth || (stage ? stage.offsetWidth : 900));
    const target=wrap, fragment=document.createDocumentFragment();
    const b = st.buildings, P = CAMP_BUILD_POS;
    const rows = [];
    // 住处：帐篷→草房→木屋→砖瓦房，升级时旧图自动消失
    const dwImg = ['build/tent', 'build/house', 'build/woodhouse', 'build/brickhouse'][b.house];
    const dwFrac = [0.26, 0.28, 0.30, 0.32][b.house];
    if (dwImg) rows.push([dwImg, P.house, Math.round(stageW * dwFrac)]);
    // 篝火→壁炉
    if (b.fire >= 0) rows.push([b.fire >= 2 ? 'build/fireplace' : 'build/fire', P.fire, Math.round(stageW * (b.fire>=2?0.14:0.13))]);
    // 储物箱：小箱子→大木箱→仓库
    let storeImg = 'build/smallbox', storeFrac = 0.13;
    if (b.storage >= 3) { storeImg = 'build/warehouse'; storeFrac = 0.19; }
    else if (b.storage >= 2) { storeImg = 'build/storage-shed'; storeFrac = 0.18; }
    else if (b.storage >= 1) { storeImg = 'build/crate'; storeFrac = 0.15; }
    if (b.storage >= 0) rows.push([storeImg, P.store, Math.round(stageW * storeFrac)]);
    if (st.furniture.beehive) rows.push(['build/beehive', P.hive, Math.round(stageW * 0.08)]);
    if (b.dock >= 1) rows.push(['build/dock', P.dock, Math.round(stageW * 0.15)]);
    // 耕地不再在营地场景显示田块（改由耕地弹窗管理）
    if(Game.cellarBuilt())rows.push(['build/cellar-v2',P.cellar,Math.round(stageW*.14)]);
    if(b.wall>0){const perimeter=el('img','camp-perimeter'+(skinOn('seasons')?'':' muted'),'');perimeter.src=`assets/img/build/camp-wall-${b.wall}-v2.png`;perimeter.alt=BUILDING_CHAINS.wall[b.wall].name;perimeter.dataset.wallTier=b.wall;perimeter.dataset.building='perimeter';fragment.appendChild(perimeter);}
    const cur = new Set(rows.map(r => r[0]));
    for (const [img, pos, w] of rows) {
      const p = el('div', 'build-plate', '');p.dataset.building=img;
      p.style.left = pos[0] + '%'; p.style.top = pos[1] + '%';
      // 按"深度"排叠放次序：y 越大 = 站得越靠画面下方 = 越近，画在越前面。
      // 玩家反馈"篝火被仓库挡住"——原来大家都用 CSS 的 z-index:4，谁在 DOM 里靠后谁就盖住别人，
      // 仓库排在篝火后面，于是把篝火压掉了。现在按 y 排序，篝火在仓库前面。
      // 数值压在 10 以内：热点/箭头层是 10，标签要永远在最上面。
      p.style.zIndex = String(Math.max(1, Math.min(9, Math.round(pos[1] / 10))));
      const isNew = !prevCampBuilds.has(img);
      const art = { 'build/tent':'home-0', 'build/house':'home-1', 'build/woodhouse':'home-2', 'build/brickhouse':'home-3',
        'build/smallbox':'facility-0', 'build/crate':'facility-1', 'build/warehouse':'facility-2', 'build/beehive':'facility-3',
        'build/fire':'facility-4', 'build/fireplace':'facility-6' }[img];
      const refined = {'build/tent':'tent-v3','build/fire':'campfire-v3','build/fireplace':'fireplace-v3','build/warehouse':'warehouse-v3'}[img];
      if(refined)p.classList.add('camp-art-refined');
      const src = refined ? `assets/img/map-pack/buildings/${refined}.webp` : img==='build/storage-shed'?`assets/img/build/storage-shed${skinOn('seasons')?'-colored':''}.png`:art ? `assets/img/map-pack/buildings/${art}.webp` : `assets/img/${img}.png`;
      p.innerHTML = `<img class="build-sprite${skinOn('seasons') ? '' : ' muted'}${isNew ? ' build-new' : ''}" style="width:${w}px" src="${src}" alt="" draggable="false" onerror="this.style.display='none'">`;
      fragment.appendChild(p);
    }
    prevCampBuilds = cur;
    dom.reconcile(target,fragment);
  }
  // 营地场景：建造后显现的建筑精灵（尺寸按背景实际宽度百分比，随放大一起缩放）
  function refreshMapArrows(st) {
    const wrap = $('#map-arrows');
    if (!wrap) return;
    const target=wrap, fragment=document.createDocumentFragment();
    if (st.scene === 'atlantis') {
      const sc = Game.sceneOf('atlantis');
      for (const [zid, pos] of Object.entries(atlantisVisualArrows())) {
        if (zid === 'home') {
          const ha = el('div', 'map-arrow unlocked', '');
          ha.style.left = pos.x + '%'; ha.style.top = pos.y + '%';
          ha.dataset.zone = 'home';   // 同样打标签：它是 ▲，锚点取 glyph 顶边中点
          ha.innerHTML = `<span class="arrow-label">${pos.label}</span><span class="arrow-glyph">▲</span>`;
          ha.onclick = () => showModal('overlay', { title:'返回孤岛', text:'游回海面约 1.5 小时（需潜水服）。', choices:[
            { label:'出发', ok:() => {  view = 'scene'; Game.travel('camp'); } },
            { label:'取 消', ok:() => { view = 'map'; render(); } },
          ]});
          ha.dataset.arrow=ha.dataset.zone || pos.label;fragment.appendChild(ha); continue;
        }
        const z = sc.zones[zid]; if (!z) continue;
        const here = (st.zone === zid);
        // 复用孤岛地图（图一）那套判定（作者 2026-09-22）：
        //   ① 渲染时就判该区域去不去得成；② 去不成 → locked（变灰）；③ 点击先拦、return，绝不先播动画。
        //   以前这里写死 'unlocked'，点击直接 startAtlantisTravel()，玩家得看完下潜动画才知道进不去。
        const zNeed = z.needLight || 0;
        const zLock = !here && zNeed > Game.lightLevel();
        const a = el('div', 'map-arrow' + (zLock ? ' locked' : ' unlocked') + (here ? ' here' : ''), '');
        a.style.left = pos.x + '%'; a.style.top = pos.y + '%';
        a.dataset.zone = zid;   // 给箭头打上区域 id：旅行动画据此精确取"箭头尖"，不再用坐标模糊匹配
        a.innerHTML = `<span class="arrow-label">${pos.label || z.name}</span><span class="arrow-glyph">▼</span>`;
        a.onclick = () => {
          if (here) { view = 'scene'; render(); return; }
          if (zLock) {
            const gear = ['', '潜水护目镜', '弱光防水手电', '防水强光潜水手电'][zNeed] || '更强的照明装备';
            const why = `前面黑得什么也看不见——需要「${gear}」才能进去。`;
            addLog(why, 'warn'); centerToast(why); return;
          }
          startAtlantisTravel(zid);
        };
        a.dataset.arrow=a.dataset.zone || a.dataset.scene || a.textContent;fragment.appendChild(a);
      }
      dom.reconcile(target,fragment);fitMapArrowsInView(); return;
    }
    const watch = st.buildings.watch;
    for (const [id, pos] of Object.entries(MAP_ARROWS)) {
      const sc = Game.sceneOf(id);
      const unlocked = Game.sceneUnlocked(id);
      const danger = sc.danger + (Game.isNight() && id !== 'camp' ? 1 : 0);
      const a = el('div', 'map-arrow' + (unlocked ? ' unlocked' : ' locked') + (id === st.scene && view === 'map' ? ' here' : ''), '');
      a.style.left = pos.x + '%';
      a.style.top = pos.y + '%';
      a.dataset.scene = id;   // 给箭头打上场景 id：旅行动画据此精确取"箭头尖"
      a.innerHTML = `<span class="arrow-label">${sc.name}<span class="arrow-danger">${'●'.repeat(Math.min(5, danger))}</span></span><span class="arrow-glyph">▼</span>`;
      if (unlocked) {
        a.onclick = () => {
          if (id === st.scene) { view = 'scene'; render(); return; }   // 点当前地点 = 进入该场景（从地图回场景）
          // ⚠️ 提前拦一道：雷暴 / 保暖不够 / 体力不够时，原来会先弹「前往」确认框，
          //    点了才在左侧日志里写一行就算失败 —— 玩家反馈的"点不了去山顶"多半是这么来的。
          //    现在当场在屏幕中央说清原因，连确认框都不弹（省一次白点的交互）。
          const chk = Game.canTravel(id);
          if (!chk.ok) { addLog(chk.reason, 'warn'); centerToast(chk.reason); return; }
          const c = Game.travelCost(id);
          if (st.stats.stamina < c.energy) { const why = `体力不够，走不动这么远（需要 ${c.energy}，当前 ${Math.floor(st.stats.stamina)}）。`; addLog(why, 'warn'); centerToast(why); return; }
          showModal('overlay', { title:'前往 ' + sc.name, text:`耗时 ${c.time} 分钟 · 消耗体力 ${c.energy}。`, choices: [
            { label:'前往', ok:() => {  startTravel(id); } },
            { label:'取 消', ok:() => {} },
          ]});
        };
      } else {
        a.onclick = () => {
          const why = `那里还被迷雾笼罩。${sc.unlockWatch > watch ? `需要更高等级的瞭望台（${sc.unlockWatch} 级）。` : ''}${sc.needBoat ? `需要合适的船。` : ''}`;
          addLog(why, 'warn'); centerToast(why);
        };
      }
      a.dataset.arrow=a.dataset.zone || a.dataset.scene || a.textContent;fragment.appendChild(a);
    }
    dom.reconcile(target,fragment);fitMapArrowsInView();
  }

  // ---------- 舞台自适应：画面区多大，舞台就多大（铺满整个红框，左右不留黑边） ----------
  // 窄屏下「负面状态徽标条」是顶栏下方的浮层（style.css 里 position:fixed + top:33px），
  // 而 #objective（当前目标）也是绝对定位、默认贴在舞台左上角 10px 处 —— 徽标多的时候
  // 正好把「当前目标」那一行压住（实测 667×375 上「精神恍惚」就压在上面）。
  // 这里量一下浮条的实际高度，把目标整体往下让开：
  //   · 桌面端徽标内联在顶栏里（position 不是 fixed）→ 返回 0，布局与改动前完全一致；
  //   · 没有徽标时返回 0 → 目标不会被无谓地推下去。
  function badgeStripH() {
    const b = $('#status-badges');
    if (!b || !b.firstChild) return 0;
    const cs = getComputedStyle(b);
    if (cs.display === 'none' || cs.position !== 'fixed') return 0;
    return Math.round(b.getBoundingClientRect().height) || 0;
  }

  function fitStage() {
    const m = $('#main');
    const stage = $('#scene-wrap') || $('#map-wrap');
    if (!m || !stage) return;
    const w = m.clientWidth, h = m.clientHeight;
    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
    // 把日志/返回地图/休息按钮定位到画面左侧/右下角
    document.body.classList.toggle('log-tiny',logSize==='tiny');
    const app = $('#app');
    if (!app) return;
    const sr = stage.getBoundingClientRect(), ar = app.getBoundingClientRect();
    const left = sr.left - ar.left, top = sr.top - ar.top;
    const back=$('#btn-backmap');
    if(back) { back.style.top=(top+5)+'px';back.style.left=(left+6)+'px'; }
    // 画面铺满后日志就压在图上：给一个读得舒服的宽度，并交给 .overlap 那层淡渐隐兜底
    const log = $('#log');
    if (log) {
      const lw = logWidthFor(w);
      log.style.width = lw + 'px'; log.style.left = '0px'; log.style.top = '0px';
      log.classList.add('overlap');
    }
    const badges=$('#status-badges'); if(badges) badges.style.top=(top+6)+'px';
    alignLogGrip();   // 无条件跑：没有「返回地图」按钮（标题页等）时它自己会隐藏
    const obj = $('#objective');
    if (obj) { obj.style.left = (left + sr.width - Math.min(460, sr.width * 0.5) - 12) + 'px'; obj.style.top = (top + 10 + badgeStripH()) + 'px'; }
    fitSceneLayers(false);
    fitMapArrowsToImage(false);
  }
  window.addEventListener('resize', () => { fitStage(); if (roomView && S()) renderRoomScene(S()); });   // 房间底图保持原节点，窗口变化时只校准家具尺寸

  // ---------- 大地图旅行动画（虚线连线 + 白点匀速移动，到达后落地） ----------
  let traveling = false;
  // 下潜/传送前先判定，别"播完动画才说下不去"（作者 2026-09-22）：
  // 以前 UI 先跑 atlantisTravelAnim()，Game.travel() 的检查在动画回调里才执行，
  // 于是没穿潜水服的玩家要看完整段下潜动画，才被告知上不去。
  function diveGateThen(go) {
    const ck = Game.canTravel('atlantis');
    if (ck && ck.ok === false) { addLog(ck.reason, 'warn'); centerToast(ck.reason); return; }
    atlantisTravelAnim(go);
  }
  function atlantisTravelAnim(cb) {
    if (traveling) return;
    traveling = true;
    const l = el('div', 'atl-portal', `<img src="assets/img/${skinOn('seasons')?'anim-colored':'anim-clean'}/atlantis_gate.png" onerror="this.onerror=null;this.src='assets/img/anim/atlantis_gate.png'"><div class="atl-portal-text">你穿过传送石，坠入深海的微光……</div>`);
    document.body.appendChild(l);
    requestAnimationFrame(() => l.classList.add('show'));
    setTimeout(() => { try { AudioFX.motif('unlock'); } catch (e) {} l.classList.remove('show'); setTimeout(() => { l.remove(); traveling = false; cb && cb(); }, 450); }, 3000);
  }
  function zoneTravelAnim(zid) {
    if (traveling) return;
    const wrap = $('#scene-wrap'); if (!wrap) { Game.setZone(zid); return; }
    traveling = true;
    const layer = el('div', 'travel-layer', '<div class="travel-dot" style="left:50%;top:50%"></div>');
    layer.style.opacity = '0'; wrap.appendChild(layer);
    let p = 0;
    const step = () => {
      p += 0.08; layer.style.opacity = String(Math.min(1, p));
      if (p < 1) requestAnimationFrame(step);
      else { traveling = false; layer.remove(); Game.setZone(zid); }
    };
    requestAnimationFrame(step);
  }
  function startAtlantisTravel(zid) {
    if (traveling) return;
    const st = S();
    const arrows = atlantisVisualArrows();
    const A = arrows[st.zone] || arrows.habitat;
    const B = arrows[zid];
    if (!B) { Game.setZone(zid); return; }
    if (st.zone === zid) { view = 'scene'; render(); return; }
    // ⚠️ 这里必须读 Game.zoneSwimCost（和 setZone 结算用的是同一份公式）：
    //    以前界面自己抄了一遍、漏掉了推进器的减半 —— 玩家反馈"装上推进器显示不变、实际是变的"。
    const c = Game.zoneSwimCost(st.zone, zid);
    const t = c.time, ec = c.energy;
    if (st.stats.stamina < ec) { addLog('你太累了，游不动了。', 'warn'); view = 'map'; render(); return; }
    showModal('overlay', { title:'前往 ' + (B.label || zid), text:`耗时 ${t} 分钟 · 消耗体力 ${ec}${c.thruster ? '（推进器已减半）' : ''}。`, choices:[
      { label:'前往', ok:() => {  animAtlantis(A, B, zid); } },
      { label:'取 消', ok:() => { view = 'map'; render(); } },
    ]});
  }
  // 行进动画期间把日志淡出：地图左下角（含行进线的起点）会被日志盖住，
  // 盖住就看不出"从一个热点走到另一个热点"。动画结束自动恢复。
  function beginTravelFx() { document.body.classList.add('traveling'); }
  function endTravelFx() { document.body.classList.remove('traveling'); }
  // 取某个箭头"glyph 尖端"的容器内坐标（向下 ▼ 的底边中点；返回孤岛那个是 ▲，取顶边中点）。
  // 用 data-zone / data-scene 精确定位，不再靠坐标模糊匹配——模糊匹配一旦对不上就会静默退回
  // "按百分比估算"，线就从箭头旁边出发，看起来"差一段"。
  function tipAnchor(inner, box, key, attr) {
    const sel = attr === 'zone' ? `[data-zone="${key}"]` : `[data-scene="${key}"]`;
    const el = inner.querySelector('.map-arrow' + sel);
    if (!el) return null;
    const g = el.querySelector('.arrow-glyph');
    if (!g) return null;
    const gr = g.getBoundingClientRect();
    const up = (g.textContent || '').indexOf('▲') >= 0;
    return { x: gr.left - box.left + gr.width / 2, y: (up ? gr.top : gr.bottom) - box.top };
  }
  function animAtlantis(A, B, zid) {
    traveling = true; view = 'map'; render();
    const inner = $('#map-arrows') || $('#map-wrap');   // 用"图片内容盒"当坐标系：箭头在哪，线就从哪起（原来用舞台会偏）
    if (!inner) { traveling = false; view = 'scene'; Game.setZone(zid); return; }
    const W = Math.max(10, inner.clientWidth), H = Math.max(10, inner.clientHeight);
    const box = inner.getBoundingClientRect();
    const pa = tipAnchor(inner, box, S().zone || 'habitat', 'zone');
    const pb = tipAnchor(inner, box, zid, 'zone');
    const fx = pa ? pa.x : A.x / 100 * W, fy = pa ? pa.y : A.y / 100 * H;
    const tx = pb ? pb.x : B.x / 100 * W, ty = pb ? pb.y : B.y / 100 * H;
    const dist = Math.hypot(tx - fx, ty - fy);
    const durMs = Math.round(Math.min(3000, Math.max(500, dist / Math.max(W, 1) * 3000)));
    beginTravelFx();
    const layer = makeTravelLayer(inner, W, H, fx, fy, tx, ty, S().zone || 'habitat', zid, 'zone');
    const dot = layer.querySelector('.travel-dot');
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / durMs);
      dot.style.left = (fx + (tx - fx) * p) + 'px'; dot.style.top = (fy + (ty - fy) * p) + 'px';
      if (p < 1) requestAnimationFrame(step);
      else { traveling = false; layer.remove(); endTravelFx(); view = 'scene'; Game.setZone(zid); }
    };
    requestAnimationFrame(step);
  }
  // 建行进层：坐标必须用【屏幕坐标系】，不能直接用箭头的容器坐标。
  // 因为地图比画面宽/高时，#map-arrows 会伸出画面外（left/top 为负），
  // 而 SVG 是按元素盒渲染的 —— 直接塞进去线会整体偏移（手机竖屏能偏几百像素），
  // 看起来就像"行进轨迹从别的地方过来的"。加上容器的偏移就对齐了。
  // fromKey/toKey 用来做闭环校正：实测"线端点 vs 箭头尖"的偏差并整体平移（保持线的方向不变）
  function makeTravelLayer(inner, W, H, fx, fy, tx, ty, fromKey, toKey, attr) {
    const layer = el('div', 'travel-layer', '');
    layer.innerHTML = `<svg style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:visible;pointer-events:none"><line x1="${fx}" y1="${fy}" x2="${tx}" y2="${ty}" stroke="rgba(240,240,234,0.8)" stroke-width="2.5" stroke-dasharray="10 8"/></svg><div class="travel-dot" style="left:${fx}px;top:${fy}px"></div>`;
    inner.appendChild(layer);
    // ⚠️ 闭环校正（这条线以前整体偏 136px、竖向还额外差 30px）：
    //    layer appendChild 到 inner 之后，定位基准是 inner 的**内边距盒**，而 inner 自己可能
    //    已经被平移/缩放 —— 按屏幕矩形直接放会重复计入一次偏移。
    //    所以不猜基准：先按 inner 的屏幕矩形放，再**实测**"线端点 vs 箭头尖"的差，整体补掉。
    const ib = inner.getBoundingClientRect();
    const lb = layer.getBoundingClientRect();
    layer.style.left = (parseFloat(layer.style.left || '0') + (ib.left - lb.left)) + 'px';
    layer.style.top = (parseFloat(layer.style.top || '0') + (ib.top - lb.top)) + 'px';
    const gTip = (key) => {
      if (!key) return null;
      const el2 = inner.querySelector('.map-arrow[data-' + (attr || 'scene') + '="' + key + '"]');
      const g = el2 && el2.querySelector('.arrow-glyph');
      if (!g) return null;
      const r = g.getBoundingClientRect();
      const up = (g.textContent || '').indexOf('▲') >= 0;
      return { x: r.left + r.width / 2, y: up ? r.top : r.bottom };
    };
    const pF = gTip(fromKey), pT = gTip(toKey);
    if (pF && pT) {
      const lb2 = layer.getBoundingClientRect();
      const svg = layer.querySelector('line');
      const lF = { x: lb2.left + parseFloat(svg.getAttribute('x1')), y: lb2.top + parseFloat(svg.getAttribute('y1')) };
      const lT = { x: lb2.left + parseFloat(svg.getAttribute('x2')), y: lb2.top + parseFloat(svg.getAttribute('y2')) };
      // 取两端偏差的平均做整体平移：这样线不会变形，只挪位置
      const ddx = ((pF.x - lF.x) + (pT.x - lT.x)) / 2, ddy = ((pF.y - lF.y) + (pT.y - lT.y)) / 2;
      if (Math.abs(ddx) > 0.5 || Math.abs(ddy) > 0.5) {
        layer.style.left = (parseFloat(layer.style.left) + ddx) + 'px';
        layer.style.top = (parseFloat(layer.style.top) + ddy) + 'px';
      }
    }
    return layer;
  }
  function startTravel(target) {
    const st2 = S();
    if (traveling) return;
    const chk = Game.canTravel(target);
    if (!chk.ok) { addLog(chk.reason, 'warn'); centerToast(chk.reason); return; }
    const cost = Game.travelCost(target);
    if (st2.stats.stamina < cost.energy) { addLog('你太累了，走不动这么远。休息一下。', 'warn'); centerToast('体力不够，走不动这么远。'); return; }
    if (target === st2.scene) { view = 'scene'; render(); return; }
    // 亚特兰蒂斯（海底）的旅行动画走专门那套：它的区域坐标在 ATLANTIS_MAP_ARROWS 里，
    // 用第一章地图的 MAP_ARROWS 会取到 undefined → 行进线从画面左上角窜出来。
    if (st2.scene === 'atlantis' || target === 'atlantis') {
      if (target === 'atlantis') { Game.travel('atlantis'); return; }   // 上浮/下潜：直接切，不做区域动画
      startAtlantisTravel(target); return;
    }
    traveling = true;
    view = 'map';
    render();
    const inner = $('#map-arrows') || $('#map-wrap');   // 同上：行进线的起终点与箭头严格同一套坐标
    if (!inner) { traveling = false; view = 'scene'; Game.travel(target); return; }
    const W = Math.max(10, inner.clientWidth), H = Math.max(10, inner.clientHeight);
    const f = MAP_ARROWS[st2.scene], t = MAP_ARROWS[target];
    // 坐标查不到就跳过动画直接过去，绝不让行进线从 (0,0) 左上角乱跑
    if (!f || !t || typeof f.x !== 'number' || typeof t.x !== 'number') {
      traveling = false; view = 'scene'; Game.travel(target); return;
    }
    // 锚点用【箭头 glyph 的尖端】，按 data-scene 精确取——不用百分比估算，也不用坐标模糊匹配
    const box0 = inner.getBoundingClientRect();
    const pa = tipAnchor(inner, box0, st2.scene, 'scene'), pb = tipAnchor(inner, box0, target, 'scene');
    const fx = pa ? pa.x : f.x / 100 * W, fy = pa ? pa.y : f.y / 100 * H;
    const tx = pb ? pb.x : t.x / 100 * W, ty = pb ? pb.y : t.y / 100 * H;
    const dist = Math.hypot(tx - fx, ty - fy);
    const durMs = Math.round(Math.min(3000, Math.max(500, dist / Math.max(W, 1) * 3000)));
    beginTravelFx();
    const layer = makeTravelLayer(inner, W, H, fx, fy, tx, ty, st2.scene, target, 'scene');
    const dot = layer.querySelector('.travel-dot');
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / durMs);
      dot.style.left = (fx + (tx - fx) * p) + 'px';
      dot.style.top = (fy + (ty - fy) * p) + 'px';
      if (p < 1) requestAnimationFrame(step);
      else { traveling = false; layer.remove(); endTravelFx(); view = 'scene'; Game.travel(target); }
    };
    requestAnimationFrame(step);
  }

  // ---------- 场景视图（带缓存：同一场景不重建 DOM，避免图片反复解码闪烁） ----------
  let lastSceneKey = null;
  // 场景图预取：手机端切场景"等图"最明显。当前场景稳定后，用空闲时间把**相邻几个场景**的图先读进
  // 浏览器的缓存/解码表（只取少数邻居，不把 20 张图全塞内存——之前"内存被杀"的教训）。
  const _prefetched = {};
  function prefetchScenes(curId) {
    try {
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
      if (navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''))) return;
      const idx = SCENES.findIndex(s => s.id === curId);
      const list = SCENES.map((s, i) => ({ img: s && s.img, far: Math.abs(i - idx) })).filter(x => x.img && x.far > 0);
      list.sort((a, b) => a.far - b.far);
      list.slice(0, 3).forEach((it, i) => {
        if (_prefetched[it.img]) return;
        _prefetched[it.img] = 1;
        setTimeout(() => { try { const im = new Image(); im.decoding = 'async'; im.src = it.img; } catch (e) {} }, 500 + i * 300);
      });
    } catch (e) {}
  }
  const PAPER_FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#d9d4c4"/><text x="640" y="340" font-size="38" text-anchor="middle" fill="#343126">场景图片暂时无法载入</text><text x="640" y="400" font-size="23" text-anchor="middle" fill="#555044">仍可使用地图与场景按钮，重新进入此场景可重试</text></svg>');
  function renderScene() {
    const st = S();
    if (roomView && st.scene === 'camp') { renderRoomScene(st); return; }
    const sc = Game.sceneOf(st.scene);
    const zoneKey = sc.zones ? (st.zone || Object.keys(sc.zones)[0]) : '';
    const baseSceneImage = (sc.zones && sc.zones[zoneKey] && sc.zones[zoneKey].img) ? sc.zones[zoneKey].img : sc.img;
    const initialSceneImage = sceneImagePath(sc.id, zoneKey, baseSceneImage);
    const key = sc.id + '|' + zoneKey;
    const m = $('#main');
    if (key !== lastSceneKey || !$('#scene-img')) {
      let zoneHtml = '';
      if (sc.zones && sc.id !== 'atlantis') {
        zoneHtml = `<div id="zones">` + Object.entries(sc.zones).map(([zid, z]) => {
          const active = (st.zone || Object.keys(sc.zones)[0]) === zid;
          const lock = (zid === 'ruins' && st.buildings.watch < 3);
          return `<button class="zone-btn ${active ? 'active' : ''} ${lock ? 'locked' : ''}" data-zone="${zid}">${z.name}${lock ? ' 🔒' : ''}</button>`;
        }).join('') + `</div>`;
      }
      dom.dispose(m);m.innerHTML = `
        <div id="scene-wrap" class="stage">
          <div id="stage-inner">
            <img id="scene-img" src="${initialSceneImage}" data-art="${initialSceneImage}" data-base-art="${baseSceneImage}" alt="${sc.name}" draggable="false" loading="eager" fetchpriority="high">
            <div id="scene-load"><i>◈</i><span class="load-bar"><i></i></span><div class="load-tip">欢迎分享真实的游戏体验与建议</div></div>
            <div id="hotspots"></div>
            <div id="camp-buildings"></div>
          </div>
          <div id="weather-overlay"></div>
          <div id="scene-vignette"></div>
          <div id="scene-name"></div>
          ${zoneHtml}
        </div>`;
      fitStage();
      fitSceneLayers(true);   // 换场景：画面铺满 + 平移归零
      bindPan('#scene-wrap', () => scenePanY, (v) => { scenePanY = v; applyScenePan(); }, () => {});
      const img = $('#scene-img');
      if (img) {
        img.onerror = () => {
          if (img.dataset.baseArt && img.dataset.art !== img.dataset.baseArt) { img.dataset.art = img.dataset.baseArt; img.src = img.dataset.baseArt; return; }
          img.onerror = null;
          img.src = PAPER_FALLBACK;
          addLog(`场景图片加载失败：${sc.name}。可返回地图再进入重试。`, 'warn');
        };
        img.onload = () => { const hs = $('#hotspots'); if (hs) hs.classList.add('ready'); const sl = $('#scene-load'); if (sl) sl.classList.remove('show'); fitStage(); fitSceneLayers(false); const s2 = S(); if (s2 && s2.scene === 'camp') renderCampBuildings(s2); if (s2 && s2.scene === 'atlantis' && s2.zone === 'habitat') renderAtlantisBuildings(s2); };
      }
      const sl0 = $('#scene-load');
      if (sl0) { sl0.classList.add('show'); if (img && img.complete) sl0.classList.remove('show'); }
      const hs0 = $('#hotspots');
      if (hs0) { hs0.classList.remove('ready'); if (img && img.complete) hs0.classList.add('ready'); }
      const zoneEl = $('#zones');
      if (zoneEl) zoneEl.addEventListener('click', (e) => {
        const b = e.target.closest('.zone-btn');
        if (!b) return;
        if (b.classList.contains('locked')) { addLog('遗迹被海雾锁住，需要三级瞭望台。', 'warn'); return; }
        if (sc.id === 'atlantis') zoneTravelAnim(b.dataset.zone); else Game.setZone(b.dataset.zone);
      });
      lastSceneKey = key;
      prefetchScenes(sc.id);   // 空闲时预热相邻场景的底图（手机端切场景更快）
    }
    // 动态部分：名称（含昼夜符号与危险点）/ 昼夜滤镜 / 天气覆盖 / 营地热点
    const nameEl = $('#scene-name');
    if (nameEl) {
      const phase = Game.isNight() ? '☾' : Game.isDusk() ? '◐' : '☀';
      const sym = ['rain','snow','fog','storm'].includes(st.weather) ? WEATHER[st.weather].glyph : phase;
      const danger = Math.min(5, sc.danger + (Game.isNight() && sc.id !== 'camp' ? 1 : 0));
      dom.html(nameEl,`${sym} ${esc(sc.name)}${sc.zones ? ' · ' + esc((sc.zones[zoneKey] || {}).name || '') : ''} <span class="name-danger">${'●'.repeat(danger)}</span>`);
    }
    const img = $('#scene-img');
    if (img) {
      const want = sceneImagePath(sc.id, zoneKey, baseSceneImage);
      if (img.dataset.art !== want) { img.dataset.art = want; img.dataset.baseArt = baseSceneImage; img.src = want; }
      const night = Game.isNight();
      const dusk = Game.isDusk();
      const sceneGray = skinOn('seasons') ? '' : 'grayscale(1) ';
      img.style.filter = sceneGray + (night ? 'brightness(0.52) contrast(1.1)' : dusk ? 'brightness(0.7) contrast(1.05)' : 'brightness(0.92) contrast(1.05)');
    }
    const wo = $('#weather-overlay');
    if (wo) {
      const cls = st.scene === 'atlantis' ? '' : (st.weather === 'rain' ? 'rain' : st.weather === 'storm' ? 'storm' : st.weather === 'snow' ? 'snow' : st.weather === 'fog' ? 'fog' : '');
      wo.className = cls;
    }
    renderHotspots();
    if (sc.id === 'camp') renderCampBuildings(st);
    if (sc.id === 'atlantis' && (st.zone === 'habitat')) renderAtlantisBuildings(st);
  }
  function renderAtlantisBuildings(st) {
    const wrap = $('#camp-buildings'); if (!wrap) return;
    const stage = $('#scene-wrap'); const stageW = Math.max(600, wrap.clientWidth || (stage ? stage.offsetWidth : 900));
    const sz = Math.round(stageW * 0.11);
    const camp = (st.atlantis && st.atlantis.camp && st.atlantis.camp.furniture) || {};
    const target=wrap, fragment=document.createDocumentFragment();
    for (const fid in ATLANTIS_BUILD_POS) {
      if (!camp[fid] || (fid==='seaStorage1' && camp.seaStorage2)) continue;
      const p = ATLANTIS_BUILD_POS[fid];
      const d = el('div', 'build-plate', '');d.dataset.building=fid;
      d.style.left = p.x + '%'; d.style.top = p.y + '%';
      const art = { seaStorage1:0, seaStorage2:1, pearlWork:12, sourceForge:13, repairBench:14 }[fid];
      d.innerHTML = `<img class="build-sprite${skinOn('seasons') ? '' : ' muted'}" src="assets/img/map-pack/buildings/facility-${art}.webp" style="width:${sz}px" onerror="this.style.display='none'">`;
      fragment.appendChild(d);
    }
    dom.reconcile(target,fragment);
  }
  const ATL_SHOP = [ { id:'deepCoral', base:10 }, { id:'pearlGranule', base:6 }, { id:'sourceOre', base:40 }, { id:'sourceBar', base:260 }, { id:'anctDevice', base:120 }, { id:'atlantisCore', base:300 } ];
  // 遗失的交易机 · 售卖的亚特兰蒂斯装备图纸（按阶递增）
  const ATL_BUY = [
    { id:'bpCoralBlade', base:260, kind:'bp' },
    { id:'bpCoralArmor', base:320, kind:'bp' },
    { id:'bpThruster', base:480, kind:'bp' },
  ];
  function repairModal() {
    const st = S();
    const w = st.equipment.weapon;
    const w2 = st.equipment.weapon2;
    const hasGun = (w && ITEMS[w] && ITEMS[w].id === 'pistol') || (w2 && ITEMS[w2] && ITEMS[w2].id === 'pistol');   // 主手副手都算（副手也能开火）
    let html = '<div class="modal-title">修补台</div><div class="overlay-text">礁石栖息地的修补台：修补潜水装备，也能校准源能手枪。</div><div class="help-list">';
    for (const id of ['diveSuit','diveSuit2','diveMask']) {
      const mats=Game.repairDiveCost(id), owned=Game.invCount(id)>0;
      const cost=Object.entries(mats).map(([k,v])=>`${ITEMS[k].name}×${v}`).join(' + ');
      const can=owned && Object.entries(mats).every(([k,v])=>Game.materialCount(k)>=v);
      html += `<div class="help-item"><b>修补${ITEMS[id].name}</b><span>${owned ? `当前最低耐久 ${Game.durOf(id)}/${Game.durMaxOf(id)} · ` : '背包里没有 · '}耗 ${cost}（每次只修一件）</span><button class="mini-btn ${can ? '' : 'lockedb'}" data-rfix="dive:${id}">修 补</button></div>`;
    }
    html += `<div class="help-item"><b>校准源能手枪</b><span>${hasGun ? (st.pistolCalibrated ? '已校准 · 命中 70% · 可继续修耐久（耗 源矿×2）' : '未校准 · 命中 60% → 校准后 70%（耗 源矿×2）') : '需先把源能手枪装备到主手或副手'}</span><button class="mini-btn" data-rfix="pistol">校 准</button></div>`;
    const bp = Game.invCount('brokenPistol');
    html += `<div class="help-item"><b>修复破损的源能手枪${bp ? `（有${bp}）` : ''}</b><span>耗 源能晶石×1 + 源质锭×1</span><button class="mini-btn" data-rfix="broken">修 复</button></div>`;
    html += '</div></div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  function atlTradeModal() {
    let html = `<div class="modal-title">遗失的交易机</div>${walletBar()}`;
    html += '<div class="modal-title" style="margin-top:8px">卖出（换贝壳币）</div><div class="help-list">';
    let any = false;
    for (const e of ATL_SHOP) { const q = Game.invCount(e.id); if (q > 0) { any = true; html += `<div class="help-item"><b>${ITEMS[e.id].name}×${q}</b><span>${Game.priceOf(e.base, true, e.id)} 贝壳币 / 个</span><button class="mini-btn" data-asell="${e.id}">卖 1</button></div>`; } }
    if (!any) html += '<div class="hint">你身上没有它认得的东西。</div>';
    html += '</div><div class="modal-title" style="margin-top:8px">购买（装备图纸 · 长按可批量）</div><div class="help-list">';
    for (const e of ATL_BUY) {
      if (Game.hasItem(e.id)) { html += `<div class="help-item"><b>${ITEMS[e.id].name}</b><span>已录入机内，无需再买</span><button class="mini-btn" disabled>已 有</button></div>`; continue; }
      const cost = Game.priceOf(e.base, false, e.id);
      html += `<div class="help-item"><b>${ITEMS[e.id].name}</b><span>${cost} 贝壳币</span><button class="mini-btn" data-abuy="${e.id}">购 买</button></div>`;
    }
    // 神物：每天随机上架一件（深海售卖机）
    const rv = Game.atlVendorInfo();
    html += `</div><div class="modal-title" style="margin-top:8px">神物（每天 ${Math.round(Game.vendorRelicChance() * 100)}% 概率上架一件）</div><div class="help-list">`;
    if (!rv.id) html += rv.noStock
      ? '<div class="hint">机箱空空如也——今天没有上架神物，明天再来碰碰运气。</div>'
      : '<div class="hint">机箱空空如也——你已经把神物收全了。</div>';
    else html += `<div class="help-item"><b>${rv.glyph} ${rv.name}</b><span>${rv.desc}<br>${rv.price} 贝壳币 · 每天只上架一件，买走就售罄</span>${rv.sold
      ? '<button class="mini-btn" disabled>今日已售出</button>'
      : `<button class="mini-btn" data-arelic="1" ${Game.invCount('beibi') >= rv.price ? '' : 'disabled'}>购 买</button>`}</div>`;
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  // 神秘鱼人 · 只以物换物（不收贝壳），复用 help-list / help-item / mini-btn 版画风弹窗
  function fishmanModal() {
    let html = `<div class="modal-title">神秘人鱼</div><div class="overlay-text">她坐在沉船龙骨旁，银发垂落，薄纱遮住容颜。<br>“贝壳？海底用不上。拿金锭和海里的材料来。”</div><div class="help-list">`;
    const deals = Game.fishmanDeals();
    let any = false;
    for (const d of deals) {
      // ⚠️ 作者 2026-09-24："为什么人鱼我根本没交易却显示已经换过了"。
      //    traded = 真在这儿换过；owned = 从别处已经有了。两者都不给交换入口，但文案要分开 ——
      //    以前只看 d.traded（而它把 owned 也算进去了），所以永远显示"已经换过了"。
      if (d.traded || d.owned) {
        const why = d.traded ? '已经换过了' : '你已经有了（不是在这儿换的）';
        const tag = d.traded ? '已 换' : '已 有';
        html += `<div class="help-item"><b>${d.name}</b><span>${why}</span><button class="mini-btn lockedb" disabled>${tag}</button></div>`;
        continue;
      }
      any = true;
      const need = Object.keys(d.need).map(id => `${ITEMS[id].name}×${d.need[id]}（${Game.invCount(id)}）`).join(' + ');
      const can = Object.keys(d.need).every(id => Game.invCount(id) >= d.need[id]);
      html += `<div class="help-item"><b>${d.name}</b><span>${need}</span><button class="mini-btn ${can ? '' : 'lockedb'}" data-fishman="${d.id}">交 换</button></div>`;
    }
    if (!any) html += '<div class="hint">她轻轻摇头，示意这次没有新的交换。</div>';
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  function atlantisCampModal() {
    const st = S();
    const camp = (st.atlantis && st.atlantis.camp && st.atlantis.camp.furniture) || {};
    let html = `<div class="modal-title">礁石栖息地 · 建造 <span style="font-size:11px">家具位 ${Game.atlantisFurnitureUsed()}/6</span></div><div class="furn-grid">`;
    for (const f of ATLANTIS_FURNITURE) {
      if(f.id==='seaStorage1'&&camp.seaStorage2)continue;
      if(f.upgradeFrom&&!camp[f.upgradeFrom]&&!camp[f.id])continue;
      const built = !!camp[f.id];
      if (built) { html += `<div class="furn built"><span class="furn-name">✔ ${f.name} · 已建成</span><span>${f.desc}</span>${f.capacity?'<button data-warehouse-open="1">存取物品</button>':''}</div>`; continue; }
      const ok = matsOk(f.mats);
      const reason = ok ? '' : missingReason(f.mats, '');
      html += `<div class="furn"><span class="furn-name">${f.name}</span><span class="furn-mats">${matsStr(f.mats)}</span><button class="mini-btn ${ok ? '' : 'lockedb'}" data-afid="${f.id}" ${reason ? `data-reason="${esc(reason)}"` : ''}>建造(${(f.time/60).toFixed(1)}h)</button></div>`;
    }
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  const RUNE_G = ['☀','☾','⛰','≈'];
  let runeStage = 1;
  let runeSeq = [], runeStep = 0, runeMode = 'idle';          // 关1 记忆
  let pairCards = [], pairOpen = [], pairDone = 0;            // 关2 配对
  let lights = [];                                            // 关3 点灯
  function startRunePuzzle() { runeStage = 1; initStage1(); showModal('rune'); }
  function nextStage() { runeStage++; if (runeStage > 3) return finishRune(); if (runeStage === 2) initStage2(); else if (runeStage === 3) initStage3(); showModal('rune'); }
  function finishRune() { runeMode = 'idle'; Game.activatePortal(); addLog('三块石板严丝合缝——传送石轰然亮起！', 'good'); closeModal(); }
  function initStage1() { runeSeq = Array.from({ length: 6 }, () => Math.floor(Math.random() * 4)); runeStep = 0; runeMode = 'idle'; }
  function initStage2() { const g = [0,1,2,3,0,1,2,3]; for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [g[i],g[j]] = [g[j],g[i]]; } pairCards = g; pairOpen = []; pairDone = 0; }
  function toggleLight(i) { const r = Math.floor(i/3), c = i%3; [[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => { const rr = r+dr, cc = c+dc; if (rr>=0&&rr<3&&cc>=0&&cc<3) { const j = rr*3+cc; lights[j] = lights[j] ? 0 : 1; } }); }
  function initStage3() { lights = Array(9).fill(1); for (let k = 0; k < 4; k++) toggleLight(Math.floor(Math.random() * 9)); if (lights.every(v => v)) toggleLight(4); }
  function renderRuneModal() {
    const t = `<div class="modal-title">石板 · ${['第一块 · 记忆','第二块 · 配对','第三块 · 点灯'][runeStage-1]}（${runeStage}/3）</div>`;
    if (runeStage === 1) return t + '<div class="overlay-text">第一块石板：记住符文亮起的顺序（6 步），再照着点回去——点错重来。</div><div id="rune-status" class="overlay-text">准备好了吗……</div><div class="rune-grid">' + RUNE_G.map((g,i) => `<button class="rune-btn" data-rune="${i}">${g}</button>`).join('') + '</div><div class="modal-actions"><button id="rune-replay">再看一遍</button><button id="rune-cancel">取 消</button></div>';
    if (runeStage === 2) return t + '<div class="overlay-text">第二块石板：符文成了两两配对的卡，把它们成对翻开——找回全部 4 对。</div><div id="rune-status" class="overlay-text">翻开两张相同的符文即可消除。</div><div class="pair-grid">' + pairCards.map((v,i) => `<button class="pair-btn" data-pair="${i}"><span class="pair-face">✦</span></button>`).join('') + '</div><div class="modal-actions"><button id="rune-cancel">取 消</button></div>';
    return t + '<div class="overlay-text">第三块石板：点亮全部九格。点一格，它自己和上下左右一起翻转。<br>点亮的格子会 <b style="color:#8a7346">亮起暖光 ✦</b>，目标是九格全亮。</div><div id="rune-status" class="overlay-text">已点亮 ' + lights.filter(v => v).length + '/9</div><div class="light-grid">' + lights.map((v,i) => `<button class="light-btn ${v ? 'on' : ''}" data-light="${i}"></button>`).join('') + '</div><div class="modal-actions"><button id="rune-cancel">取 消</button></div>';
  }
  function playRuneSeq() {
    const m = $('#modal'); if (!m) return;
    const btns = Array.from(m.querySelectorAll('.rune-btn'));
    const status = m.querySelector('#rune-status');
    runeMode = 'showing'; if (status) status.textContent = '看好了……';
    let i = 0;
    const tick = () => {
      if (i >= runeSeq.length) { runeMode = 'input'; runeStep = 0; if (status) status.textContent = '轮到你了：照着顺序点。'; return; }
      const b = btns[runeSeq[i]]; if (b) { b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), 400); }
      i++; setTimeout(tick, 620);
    };
    setTimeout(tick, 450);
  }
  function bindRune() {
    const m = $('#modal'); if (!m) return;
    const cancel = m.querySelector('#rune-cancel'); if (cancel) cancel.onclick = closeModal;
    if (runeStage === 1) {
      m.querySelectorAll('.rune-btn').forEach(b => b.onclick = () => {
        if (runeMode !== 'input') return;
        const i = +b.dataset.rune;
        if (i === runeSeq[runeStep]) {
          runeStep++; b.classList.add('ok'); setTimeout(() => b.classList.remove('ok'), 200);
          if (runeStep >= runeSeq.length) { runeMode = 'idle'; addLog('第一块石板应和了。', 'good'); nextStage(); }
        } else {
          runeMode = 'idle'; runeStep = 0;
          const s = m.querySelector('#rune-status'); if (s) s.textContent = '符文错了……再看一遍。';
          addLog('第一块石板：顺序错了，重来。', 'warn'); setTimeout(playRuneSeq, 600);
        }
      });
      const rp = m.querySelector('#rune-replay'); if (rp) rp.onclick = () => { runeMode = 'idle'; playRuneSeq(); };
      playRuneSeq();
    } else if (runeStage === 2) {
      m.querySelectorAll('[data-pair]').forEach(b => b.onclick = () => {
        const i = +b.dataset.pair;
        if (b.classList.contains('flip') || b.classList.contains('done') || pairOpen.length >= 2) return;
        b.classList.add('flip'); b.querySelector('.pair-face').textContent = RUNE_G[pairCards[i]]; pairOpen.push(i);
        if (pairOpen.length === 2) {
          const [a, bb] = pairOpen;
          if (pairCards[a] === pairCards[bb]) { setTimeout(() => { [a,bb].forEach(k => { const e = m.querySelector(`[data-pair="${k}"]`); e.classList.remove('flip'); e.classList.add('done'); }); pairOpen = []; pairDone++; if (pairDone >= 4) { addLog('第二块石板应和了。', 'good'); nextStage(); } }, 380); }
          else { setTimeout(() => { pairOpen.forEach(k => { const e = m.querySelector(`[data-pair="${k}"]`); e.classList.remove('flip'); e.querySelector('.pair-face').textContent = '?'; }); pairOpen = []; }, 700); }
        }
      });
    } else {
      m.querySelectorAll('[data-light]').forEach(b => b.onclick = () => {
        toggleLight(+b.dataset.light);
    m.querySelectorAll('[data-light]').forEach((e, j) => e.classList.toggle('on', !!lights[j]));
    const rs = m.querySelector('#rune-status');   // 实时显示"已点亮 N/9"，别让玩家猜
    if (rs) rs.textContent = '已点亮 ' + lights.filter(v => v).length + '/9' + (lights.every(v => v) ? ' · 全亮了！' : '');
    if (lights.every(v => v)) { addLog('第三块石板应和了。', 'good'); nextStage(); }
      });
    }
  }
  function pointWorkSummary(p) {
    const tool=p.need?.tool ? Game.selectedTool(p.need.tool) : null;
    const output=(p.yields||[]).map(y=>`${ITEMS[y.id].name}×${y.min??1}${y.max!==undefined&&y.max!==y.min?'–'+y.max:''}${y.chance?'（'+Math.round(y.chance*100)+'%）':''}`).join('、');
    return [`使用工具：${tool?ITEMS[tool.id].name+(tool.source==='bag'?'':'（仓库）'):'徒手'}`,
      `预计耗时：${Game.pointMinutes(p)} 分钟 · 消耗体力：${Game.pointEnergy(p)}`,
      output?`基础产出：${output}`:'',p.daily?`今日剩余：${Math.max(0,p.daily-(S().pointUses?.[p.id]||0))} 次`:'',
      '实际产量受季节、天气、难度和工具影响。',Game.pointStatus(p)==='ok'?'':Game.pointStatus(p)].filter(Boolean).join('\n');
  }
  function renderHotspots() {
    const wrap = $('#hotspots');
    if (!wrap) return;
    const st = S();
    const sc = Game.sceneOf(st.scene);
    const zk = st.zone || (sc.zones ? Object.keys(sc.zones)[0] : '');
    let list = sc.id === 'camp' ? CAMP_HOTSPOTS
      : (sc.id === 'atlantis' && zk === 'habitat') ? ATLANTIS_HOTSPOTS
      : (sc.zones && zk && sc.zones[zk] && sc.zones[zk].hotspots && sc.zones[zk].hotspots.length ? sc.zones[zk].hotspots : (SCENE_HOTSPOTS[sc.id] || []));
    list = list.slice();
    if (sc.id === 'atlantis') {
      const machine = Game.lotteryState();
      const positions={city:[18,26],coral:[80,24],shipwreck:[82,25],coralForest:[78,25],pearlCave:[82,76],trench:[12,22]};
      if (machine.active && machine.zone === zk) {
        const [x,y]=positions[zk] || [73,72];
        list.push({id:'lottery',x,y,glyph:'◇',label:'遗海交换机'});
      }
    }
    if(sc.id==='atlantis' && zk==='sanctum' && Game.nightmareInfo().active && Game.nightmareInfo().bossReady) list.push({id:'nightmareBoss',x:78,y:37,glyph:'◉',label:'噩梦之源'});
    if (sc.id === 'peak' && st.flags.ended_C) { const act = st.atlantis && st.atlantis.stoneActive; list.push({ id: act ? 'portal_go' : 'portal_make', x:88, y:26, glyph:'◈', label: act ? '传送石 · 前往亚克兰蒂斯' : '传送石 · 需解密' }); }
    const target=wrap, fragment=document.createDocumentFragment();
    const pts = Game.pointsOf();
    for (const h of list) {
      if (sc.id === 'camp' && st.buildings.house >= 0 && ['sleep','craft','furn','smoke'].includes(h.id)) continue;
      // 建造后才显现的交互建筑
      if (h.needBuild && st.buildings[h.needBuild] < (h.lvl ?? 1)) continue;
      if (h.needFurn && !h.needFurn.some(f => st.furniture[f])) continue;
      if (h.needFlag && !st.flags[h.needFlag]) continue;
      if (sc.id === 'river' && ((h.point === 'river_water' && Game.seasonInfo().name === '冬') || (h.point === 'river_snow' && Game.seasonInfo().name !== '冬'))) continue;
      const d = el('div', 'hotspot ' + (h.point ? 'point' : ''), '');d.dataset.hotspot=h.id || h.point;
      // 房屋图的门随等级改变位置：草屋门偏左，帐篷、木屋和砖瓦房门偏右。
      const hx = sc.id === 'camp' && h.id === 'room' ? (CAMP_BUILD_POS.house[0]+(st.buildings.house===1?-3:1)) : h.x;
      const hy = h.y;
      d.style.left = hx + '%'; d.style.top = hy + '%';
      let onceTag = '';
      // ⚠️ 这两个必须声明在 if 外面：下面的 innerHTML 在块外拼装，写进块里会 ReferenceError → 整个场景渲染中断
      let ritualReady = false;      // 材料齐了：标签写"举行仪式"
      let rewardMissing = false;    // 老存档：标记打了但奖励没拿 → 标签写"取回遗物"
      if (h.point) {
        const p = pts.find(q => q.id === h.point);
        if (!p) continue;
        if(p.hideWhenDry&&!['rain','storm'].includes(st.weather))continue;
        // 特殊：山顶祭坛拿过遗物后本会消失，但凑齐"遗物+3石板+龙骨"时它要重新亮起来（结局 C 的入口，别再让玩家找不到）
        const altarRdy = (p.id === 'peak_altar' && !st.flags.ended_C && Game.hasItem('relic') && Game.invCount('slate') >= 3 && Game.hasItem('dragonbone'));
        rewardMissing = Game.onceRewardMissing ? Game.onceRewardMissing(p) : false;
        ritualReady = altarRdy;
        const visible = altarRdy || rewardMissing;    // 两种例外都让点位重新显示
        if (((p.once && st.flags['pt_'+p.id]) && !visible) || (p.firstDays && st.day > p.firstDays) || (p.id === 'grass_horse' && st.flags.horse) || (p.id === 'peak_slate' && st.flags.slateGuardDone) || (p.id === 'grass_wolfden' && st.flags.wolfKingDone)) continue;   // 一次性/已过期/已驯服/已击败 → 整体消失不显示
        if (visible) d.classList.add('altar-ready');
        if (p) {
          const status = Game.pointStatus(p);
          if (status !== 'ok') { d.classList.add('locked'); d.title = status; }
          if (p.once) onceTag = ' <i class="once-tag">一次性</i>';
        }
      }
      const spotLabel = h.id === 'honey' ? `蜂箱 ${Math.max(0, Number(st.hiveHoney) || 0)}/12 · 收蜜` : h.label;
      d.innerHTML = `<span class="hot-glyph">${h.glyph || '●'}</span><span class="hot-label">${ritualReady ? '祭坛 · 举行仪式' : (rewardMissing ? '祭坛 · 取回遗物' : spotLabel)}${(ritualReady || rewardMissing) ? '' : onceTag}</span>`;
      d.onclick = () => {
        if (h.id === 'room') { roomView = true; view = 'scene'; render(); }
        else if (h.id === 'honey') { const r = Game.collectHiveHoney(); if (!r.ok) centerToast(r.reason); }
        else if (h.id === 'nightmareBoss') {Game.challengeNightmareBoss();}
        else if (h.id === 'lottery') { showModal('lottery'); }
        else if (h.id === 'warehouse') {showModal('warehouse');}
        else if (h.id === 'cellar') {showModal('cellar');}
        else if (h.id === 'inv') { showModal('inv'); }
        else if (h.id === 'map') {  view = 'map'; render(); }
        else if (h.id === 'fire') { AudioFX.play('fire'); craftTab = 'fire'; showModal('craft'); }
        else if (h.id === 'craft') { craftTab = 'work1'; showModal('craft'); }
        else if (h.id === 'furn') { craftTab = 'furn1'; showModal('craft'); }
        else if (h.id === 'smoke') { craftTab = 'fire'; craftGroup = 'smoked'; showModal('craft'); }
        else if (h.id === 'farm') {  Game.travel('farm'); }
        else if (h.id === 'camp') { showModal('camp'); }
        else if (h.id === 'sleep') { showModal('sleeppick'); }
        else if (h.id === 'ranch') { showModal('farm'); }
        else if (h.id === 'repair') { showModal('repair'); }
        else if (h.id === 'stone') { Game.atlantisTeleport('from'); }
        else if (h.id === 'atlantis') { diveGateThen(() => Game.atlantisTeleport('to')); }
        else if (h.id === 'portal_make') { if (Game.invCount('slate') >= 3) startRunePuzzle(); else addLog('需要三块石板才能拼出传送石的符文（石板来自：山顶·石碑残迹的石板守卫、海岸遗迹、洞中遗迹）。', 'warn'); }
        else if (h.id === 'portal_go') { diveGateThen(() => Game.atlantisTeleport('to')); }
        else if (h.point) {
          const p = pts.find(q => q.id === h.point);
          if (!p) { addLog('这里现在做不了。', 'warn'); return; }
          const status = Game.pointStatus(p);
          if (status !== 'ok') { addLog(status, 'warn'); centerToast(status); return; }
          const pre = Game.pointReason(p);   // 失败先提示、不播动画
          if (pre) { addLog(pre, 'warn'); centerToast(pre); return; }
          let aT = 'gather', imgHint = 'gather';
          if (p.type === 'hunt') { aT = 'fight'; imgHint = 'sword'; }
          else if (p.type === 'fish') { imgHint = 'fish'; }
          else if (st.scene === 'atlantis') { imgHint = 'dive'; }
          else if (POINT_ICON[p.id]) { imgHint = POINT_ICON[p.id]; }                  // 点名表（撒网/深水/深层矿脉）
          else if (/(tree|bamboo_cut|wood)/.test(p.id)) { imgHint = 'axe_icon'; }
          else if (/(berry|bush)/.test(p.id)) { imgHint = 'berry_pick'; }              // 手摘浆果（先于石类判定，避免误配）
          else if (/water/.test(p.id)) { imgHint = 'water_ladle'; }                   // 取水/舀水
          else if (/(stone|ore|quarry|crystal|pit|iron|niter|sulfur|fossil|clay|copper)/.test(p.id)) { imgHint = 'pick'; }   // 采石/采矿用石镐，不再误用锤子
          const anim = ['gather','fish','hunt','drift','trap'].includes(p.type) ? { t: aT, l: p.name } : null;
          if (anim) withAnimation(anim.t, anim.l, () => Game.doPoint(p), imgHint); else Game.doPoint(p);
        }
      };
      if(h.point){const p=pts.find(q=>q.id===h.point);if(p?.type==='gather'){
        d.dataset.pointId=p.id;d.setAttribute('role','button');d.tabIndex=0;
        d.setAttribute('aria-label',p.name+' · 长按查看采集详情');
        if(!d.classList.contains('locked'))d.title=pointWorkSummary(p);
        const collect=d.onclick;d.onclick=null;
        const preview=()=>showModal('buffInfo',{title:p.name,text:pointWorkSummary(p)});
        bindPress(d,collect,preview);d.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(e.shiftKey)preview();else collect();}};
      }}
      fragment.appendChild(d);
    }
    dom.reconcile(target,fragment);
  }

  // ---------- 行动面板 ----------
  // 结局「结算」按钮（作者 2026-09-23 从右下角搬进「装备 → 属性」的人物立绘下方）。
  // 为什么搬：这批按钮**不跟场景绑定** —— 只要某个结局"已达成但没结算"，它连大地图都会挂出来，
  // 常年压住右下角画面（作者原话："放这里有点遮挡"）。
  // 搬走的只有「结算」；「达成」按钮仍留在右下角，因为它跟当前场景相关、且只在满足条件时出现。
  // ⚠️ 数据源仍然是 Game.checkEndingActions()（那是"本存档该显示哪些结局入口"的唯一真相），
  //    这里只做一次前缀过滤，避免在 game.js 里多养一份会跑的名单。
  function settleActions() {
    return Game.checkEndingActions().filter(a => a.id.indexOf('settle_') === 0);
  }

  // ⚠️ 这里原来有个 renderActions()，往 $('#actions') 里塞按钮 —— 但页面里根本没有 #actions 这个元素
  //    （真实容器是 #scene-actions，由下面的 renderExtras() 负责），而且这个函数从来没有被调用过。
  //    属于纯死代码（调用即报错），已删除。
  function renderExtras() {
    const st = S();
    const box = $('#scene-actions');
    if (!box) return;
    const fragment=document.createDocumentFragment();
    const acts = [];
    if (st.scene === 'camp' && !roomView) {
      if (Game.laochaoAvailable()) acts.push({ label:'与老潮交易', cls:'trade', fn:() => showModal('laochao') });
      if (st.furniture.flag && !Game.laochaoAvailable() && !st.laochao.arrived) acts.push({ label:'升起信号旗', fn:() => Game.signalFlag() });
      if (st.buildings.watch === 0) acts.push({ label:'建一级瞭望台', cls:'build', anim:{ t:'build', l:'建造一级瞭望台' }, fn:() => Game.buildChain('watch'), disabled: !matsOk(BUILDING_CHAINS.watch[1].mats), reason:'材料不足' });
      if (st.equipment.weapon) { /* 磨刀/修补/命名：已在「制造→磨刀石」 */ }
    }
    // 山顶祭坛仪式：章节目标，不是结局。单独挂一个按钮（以前混在结局按钮里，现在把它摘出来）。
    if (st.scene === 'peak' && !st.flags.ended_C && Game.hasItem('relic') && Game.invCount('slate') >= 3 && Game.hasItem('dragonbone')) {
      acts.push({ label:'祭坛仪式（章节目标 · +50 魂点）', cls:'objective', fn:() => { const r = Game.doPeakRitual(); if (r && r.ok === false && r.reason) { addLog(r.reason, 'warn'); centerToast(r.reason); } } });
    }
    // 结局「达成」按钮：留在右下角（跟当前场景相关，只在满足条件时出现，不算常年遮挡）。
    // 结局：达成（doEnding）与结算（settleEnding）分开走 —— id 带 settle_ 前缀的是"看结算画面"。
    // ⛔ 「结算 · 结局」按钮**不再挂在这里**：它们不跟场景绑定（连大地图都会挂出来），常年压住右下角，
    //    作者 2026-09-23 定"放这里有点遮挡，收进属性栏人物图片下方"。
    //    现在统一渲染在「装备 → 属性」的人物立绘下方（见下面的 settleActions() 与属性标签页）。
    //    这里保留 settle_ 分支只是为了防御：万一以后有人把过滤去掉，也不会变成静默失败。
    acts.push(...Game.checkEndingActions().filter(a => a.id.indexOf('settle_') < 0).map(a => ({ label:a.name, cls:'ending', fn:() => {
      if (a.id.indexOf('settle_') === 0) { const r = Game.settleEnding(a.id.slice(7)); if (r && r.ok === false && r.reason) addLog(r.reason, 'warn'); }
      else Game.doEnding(a.id);
    } })));
    for (const a of acts) {
      const b = el('button', 'action-btn float ' + (a.cls || ''), '');
      b.innerHTML = `<span class="act-name">${esc(a.label)}</span>`;
      if (a.disabled) b.classList.add('disabled');
      b.onclick = () => { if (a.disabled) { centerToast(a.reason || '条件不足'); return; } if (a.anim) withAnimation(a.anim.t, a.anim.l || a.label, a.fn); else a.fn(); };
      b.dataset.viewKey=a.label;fragment.appendChild(b);
    }
    box.style.display = acts.length ? '' : 'none';
    dom.reconcile(box,fragment);
  }

  function sceneActions() {
    const st = S();
    const sc = Game.sceneOf(st.scene);
    const out = [];
    out.push({ label:`返回地图`, cls:'nav', fn:() => { view = 'map'; render();  } });
    if (sc.id === 'peak' && Game.invCount('slate') >= 3 && Game.hasItem('relic') && Game.hasItem('dragonbone')) {
      // 祭坛仪式在 ending actions 已处理
    }
    for (const p of Game.pointsOf()) {
      const status = Game.pointStatus(p);
      const it = ITEMS;
      let label = p.name;
      if (p.need && p.need.item) label += `（需${it[p.need.item].name}）`;
      if (p.need && p.need.tool) label += `（需${p.need.tier > 1 ? ['','铁','钢','玄铁'][p.need.tier] : ''}${p.need.tool === 'axe' ? '斧' : p.need.tool === 'pick' ? '镐' : '刀'}）`;
      const a = {
        label, fn: () => Game.doPoint(p),
        disabled: status !== 'ok', reason: status,
      };
      const t = p.time ? `耗时${Game.pointMinutes(p)}分钟` : '';
      const tool=p.need?.tool ? Game.selectedTool(p.need.tool) : null;
      const daily = p.daily ? `今日余${Math.max(0, p.daily - ((st.pointUses || {})[p.id] || 0))}次` : '';
      a.desc = [`体力-${Game.pointEnergy(p)}`, t, daily,tool ? ITEMS[tool.id].name+(tool.source==='bag'?'':'（仓库）') : ''].filter(Boolean).join(' · ');
      if (p.type === 'hunt') { a.cls = 'danger'; if (Game.playerAtk() <= 5) { label += '（赤手空拳，危险！）'; a.label = label; } }
      if (p.type === 'adventure') a.cls = 'adv';
      if (p.type === 'trade') a.cls = 'trade';
      if (['gather','fish','hunt','drift','trap'].includes(p.type)) a.anim = { t: p.type === 'hunt' ? 'fight' : 'gather', l: p.name };
      out.push(a);
    }
    out.push({ label:'休息 ' + restHours + ' 小时', fn:() => Game.rest(restHours), disabled: st.stats.stamina >= Game.maxStam(), reason:'体力充沛' });
    return out;
  }

  function sleepModal() {
    const st = S();
    const wu = st.day >= Game.raidDay();   // 守夜在第一次夜袭那天解锁（简单14/普通12/困难10/传奇7）
    const r = sleepRec();
    const nr = napRec();
    // 作者 2026-09-21：会掉血就明确提示 —— 只写个小小的"生命-14"，玩家根本不会注意
    const tips = [];
    if (r.hp < 0) tips.push(`⚠️ 现在睡会<b>掉 ${Math.abs(r.hp)} 点生命</b>：这个时段睡眠质量差（22 点后最好），而且饱食 / 水分 / 精神越低扣得越狠。生命会从 ${r.hpNow} 变成 ${r.hpAfter}。`);
    // 中毒/流血不会因为睡觉就停下（作者 2026-09-25）：进睡眠面板前先把这笔账摊开说清楚
    if(Game.healthValue()<40)tips.push('⚠️ 健康过低，未治疗期间可能感染或恶化。先处理伤势再睡。');
    if (r.debuffHp > 0) tips.push(`⚠️ 身上还带着${S().statuses.infection?'感染 ':''}${r.poisonTicks ? `中毒 ×${r.poisonTicks}` : ''}${r.poisonTicks && r.bleedTicks ? '、' : ''}${r.bleedTicks ? `流血 ×${r.bleedTicks}` : ''}——<b>睡觉不会让它停</b>，这一觉还会再掉 <b>${r.debuffHp} 点生命</b>，醒来剩 ${r.hpAfter}。先吃解毒剂 / 敷止血药再睡更稳。`);
    if (r.starveRisk) tips.push(`⚠️ 睡醒（约 ${r.endClock}）时饱食或水分会<b>直接见底</b>，醒来就开始掉血——先吃点东西、喝口水再睡。`);
    else if (r.lowOnWake) tips.push(`⚠️ 睡醒（约 ${r.endClock}）时饱食或水分会掉到 ${r.hungerAfter}／${r.thirstAfter}，已经在危险线以下了——睡前先补一口更稳。`);
    return `<div class="modal-title">睡眠方式</div>
      ${tips.length ? `<div class="sleep-warn">${tips.join('<br>')}</div>` : ''}
      <div class="modal-actions">
        <button data-sleep="nap">😴 小睡一会 · 2小时<br><small>体力+${nr.sta} · 生命${nr.hp > 0 ? '+' + nr.hp : '不变'} · 精神+${nr.sp}</small></button>
        <button data-sleep="normal" class="${r.hp < 0 ? 'danger-btn' : ''}">🌙 安稳睡觉 · ${r.hours}小时<br><small>体力+${r.sta} · 生命${r.hp >= 0 ? '+' : ''}${r.hp} · 精神+${r.sp}</small></button>
        ${wu ? `<button data-sleep="watch">🔥 守夜 · 防备夜袭</button>` : ''}
      </div>
      <div class="overlay-text" style="font-size:12.5px;margin-top:10px">醒来约 ${r.endClock} · 届时饱食 ${r.hungerAfter} · 水分 ${r.thirstAfter}</div>`;
  }
  function napRec() {
    return Game.sleepForecast('nap') || { sta:0, hp:0, sp:1, hours:2, endClock:'--:--', hungerAfter:0, thirstAfter:0, hpNow:0, hpAfter:0, starveRisk:false };
  }
  function renderHeirloom() {
    const meta = Game.metaState();
    let html = `<div class="modal-title">◈ 历代遗章 <span style="font-size:12px">魂点 ${meta.soul} · 已传世 ${meta.runs} 世</span>${inlineHelp('结束一局可获得魂点，升级传承后永久保留。传奇不享受传承；开局物资与心得在新局发放。')}</div>
      <div class="help-list">`;
    for (const nd of META_NODES) {
      const lvl = Game.metaNum(nd.id);
      const maxed = lvl >= nd.max;
      const cost = maxed ? 0 : nd.cost[lvl];
      html += `<div class="help-item"><b>${nd.name} ${'✦'.repeat(lvl)}${'☆'.repeat(nd.max - lvl)}</b><span>${nd.desc}</span>
        ${maxed ? `<i style="color:#346">已满级</i>` : `<button class="mini-btn" data-meta-buy="${nd.id}" ${meta.soul < cost ? `data-reason="魂点不足（需 ${cost} 魂点）"` : ''}>升级（${cost} 魂点）</button>`}
      </div>`;
    }
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  function devpwModal() {
    return `<div class="modal-title">开发者模式</div>
      <div style="font-size:13px;color:#55523f;margin-bottom:8px">输入密码，进入开发者模式（测试用）。</div>
      <input id="devpw" type="password" placeholder="密码" autocomplete="off" maxlength="20" style="width:100%;padding:9px 10px;border:2px solid var(--ink);font-size:16px;background:var(--paper);color:var(--ink);box-sizing:border-box">
      <div class="modal-actions"><button id="devpw-ok">进入</button><button id="modal-close">取消</button></div>`;
  }
  // 救援面板：把本机所有还能读出来的存档痕迹列出来，挑一份恢复
  function rescueModal() {
    const list = Game.scanLocalSaves();
    let html = `<div class="modal-title">🛟 救援 · 找回被覆盖的存档</div>
      <div class="hint">下面是这台设备上还能读出来的所有进度痕迹，按时间从新到旧排。挑一份「恢复这一份」，它会立刻变成当前存档（并写回主存档）。</div><div class="help-list">`;
    if (!list.length) html += '<div class="help-item"><b>什么都没扫到</b><span>说明这台设备上已经没有可恢复的痕迹了——如果以前导出过「存档码」，用存档码还能把魂点、成就和备份槽搬回来。</span></div>';
    for (const it of list) {
      const when = it.at ? new Date(it.at).toLocaleString('zh-CN', { hour12: false }).slice(0, 16) : '时间未知';
      html += `<div class="help-item"><b>第 ${it.day} 天 · ${esc(it.identity || '')}</b>
        <span>${esc(it.label)}${it.at ? ` · ${when}` : ''}</span>
        <button class="mini-btn" data-rescue-go="${it.src}">恢复这一份</button></div>`;
    }
    html += '</div><div class="modal-actions"><button id="modal-back">返 回</button><button id="modal-close">关 闭</button></div>';
    return html;
  }
  function renderBackup() {
    const slots = Game.slotList();
    const bp = Game.backupPoints();
    let html = `<div class="modal-title">备份 · 读档 <span style="font-size:11px">备份点 ${bp}</span></div><div class="modal-actions"><button data-buybp="1">购买备份点（20 魂点）</button></div><div class="help-list">`;
    for (let i = 0; i < 4; i++) {
      const s = slots[i];
      if (i === 3 && !Game.extraSlotUnlocked()) {
        html += '<div class="help-item"><b>槽 4（未解锁）</b><span>支付 100 魂点，永久增加一个备份槽。</span><button class="mini-btn" data-buyslot="1">解锁存档位</button></div>';
        continue;
      }
      html += `<div class="help-item"><b>槽 ${i + 1}${s ? ` · 第 ${s.day} 天${s.settled ? '（已结算）' : ''}` : '（空）'}</b><span>${s ? '第 ' + s.day + ' 天 · 点击从此继续' : '空槽'}</span>
        <button class="mini-btn" data-bk="${i}">${s ? '覆盖备份' : '备份到此'}</button>${s ? `<button class="mini-btn" data-ld="${i}">从此继续</button>` : ''}${s ? `<button class="mini-btn danger-btn" data-delslot="${i}">删除备份</button>` : ''}</div>`;
    }
    const rs = Game.rescueInfo();
    html += `<div class="help-item"><b>🛟 救援 · 找回被覆盖的存档</b><span>可扫描本机存档，选择进度恢复。${rs ? `<br>已自动保留：<b>第 ${rs.day} 天</b>（${new Date(rs.at).toLocaleString('zh-CN', { hour12: false }).slice(0, 16)}）` : ''}</span>
      <div class="modal-actions"><button class="mini-btn" data-rescue="scan">扫描本机存档</button></div></div>`;
    html += `<div class="hint">换设备前请导出存档码。</div>
      <div class="modal-actions"><button data-codex="export">导出存档码</button><button data-codex="import">导入存档码</button><button id="modal-close">关 闭</button></div>`;
    return html;
  }
  let comTab = 'p1';
  function comHelpModal() {
    return `<div class="modal-title">战斗说明</div><div class="help-list"><div class="help-item"><b>攻击</b><span>先点目标，再选行动；距离不够会先靠近。</span></div><div class="help-item"><b>防御</b><span>本次行动防御提升60%，可抵挡梦魇恐吓与晕眩。</span></div><div class="help-item"><b>速度</b><span>速度快的一方先出手，也能出手更多次。双持武器轮流攻击。</span></div><div class="help-item"><b>远程</b><span>弓和枪需要对应弹药，可在敌人靠近前攻击。</span></div><div class="help-item"><b>生存</b><span>留意技能预告、体力和耐久。格挡失败后才判闪避；药品有每场使用限制，危险时可以逃跑。</span></div></div>`;
  }
  function skillBody() {
    const info = Game.skillTreeInfo();
    return `<div class="skill-grid">${['gather','craft','combat'].map(k => {
      const i = info[k]; const maxed = i.lv >= i.max;
      const pct = maxed ? 100 : Math.min(100, i.cost ? i.exp / i.cost * 100 : 100);
      return `<div class="skill-col" data-skill-kind="${k}">
        <div class="skill-name">${i.glyph} ${i.name}</div>
        <div class="skill-desc">主干 ${i.lv}/${i.max} · 已投 ${i.picks.length} 点</div>
        <div class="skill-lv">${i.expName} ${i.exp}${maxed ? ' · 已满级' : ` / 下一级 ${i.cost}`}</div>
        <div class="skill-bar"><i style="width:${pct}%"></i></div>
        <button class="mini-btn" data-skilltree="${k}">展开技能树 ▶</button>
      </div>`;
    }).join('')}</div>`;
  }
  function skillModal() {
    return `<div class="modal-title">技能${inlineHelp('主干升级时选择成长方向；专项有门槛与互斥。遗忘最末端技能，返还一半经验。')}</div>${skillBody()}<div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
  }
  // ---------- 技能树（树状图：主干竖着一串，专项从两侧伸出来）----------
  // 作者 2026-09-18：要的就是"从上往下一串基础升级，两侧延伸专项升级，大量互斥"的树状图。
  // 布局：每一级一行（三栏：左侧专项 | 中间主干节点 | 右侧专项），主干用一条竖线串起来，
  //       专项节点按 need（需要主干几级）挂到对应行，互斥的一对强制分居左右、中间画红色虚线。
  function stNodeCard(kind, n) {
    const dots = '●'.repeat(n.lv) + '○'.repeat(Math.max(0, n.max - n.lv));
    const reqTag = n.req ? ` <span class="st-req">需${n.req}</span>` : '';
    const ico = n.icon ? `<img class="st-icon" src="assets/img/skills/${n.icon}.png" alt="" onerror="this.style.display='none'">` : '';
    // 学习按钮：**不管能不能点，都把要花的经验写上**（作者 2026-09-18：按钮上要有消耗）
    const act = n.canLearn
      ? `<button class="mini-btn" data-nodelearn="${kind}:${n.id}">学习（花 ${n.cost} 经验）</button>`
      : `<button class="mini-btn lockedb" disabled>学习（需 ${n.cost === null ? '—' : n.cost} 经验）</button>`;
    return `<div class="st-node ${n.lv > 0 ? 'on' : ''} ${n.canLearn ? 'can' : ''}">
      <div class="st-head"><b>${ico}${n.name}</b><span class="st-lv">${dots}</span></div>
      ${reqTag ? `<div class="st-reqline">${reqTag}</div>` : ''}
      ${n.lv>0?`<div class="st-desc st-current">当前：${n.desc[Math.min(n.lv-1,n.desc.length-1)]}</div>`:''}
      ${n.lv<n.max?`<div class="st-desc st-preview">${n.lv?'升级后：':'学习后：'}${n.desc[Math.min(n.lv,n.desc.length-1)]}</div>`:''}
      <div class="st-foot">
        ${act}
        ${n.canForget ? `<button class="mini-btn st-forget" data-nodeforget="${kind}:${n.id}">遗忘（返 ${n.forgetGain}）</button>` : ''}
      </div>
      ${n.canLearn ? '' : `<div class="st-lock">${n.reason}</div>`}
    </div>`;
  }
  function skillTreeModal(kind) {
    const info = Game.skillTreeInfo();
    const t = info[kind];
    if (!t) return '<div class="modal-title">技能树</div><div class="hint">没有这棵树。</div>';
    const maxed = t.lv >= t.max, canUp = !maxed && t.exp >= t.cost;
    const byLevel = {};
    for (const n of (t.nodes || [])) { const k = n.need || 1; (byLevel[k] = byLevel[k] || []).push(n); }
    // 主干每一级一行：左侧专项 / 中间主干节点 / 右侧专项
    let rows = '';
    for (let lv = 1; lv <= t.max; lv++) {
      const list = byLevel[lv] || [];
      const left = list.filter(n => (n.side || 'r') === 'l'), right = list.filter(n => (n.side || 'r') !== 'l');
      const hasMutex = list.some(n => n.mutex && list.some(m => m.id === n.mutex));
      const done = lv <= t.lv;
      const isNext = (lv === t.lv + 1) && !maxed;
      // 这一级选过哪些方向
      const picked = (() => {
        if (!done) return '';
        const map = {};
        for (const p of t.picks.slice(0, lv)) map[p] = (map[p] || 0) + 1;
        return Object.keys(map).map(id => { const o = t.trunk.find(x => x.id === id) || {}; return `${o.name || id}×${map[id]}`; }).join('、');
      })();
      rows += `<div class="st-row ${done ? 'done' : ''} ${isNext ? 'next' : ''}">
        <div class="st-side left">${left.map(n => stNodeCard(kind, n)).join('')}</div>
        <div class="st-mid">
          ${hasMutex ? '<span class="st-mutex-line"></span>' : ''}
          <i class="st-dot ${done ? 'on' : (isNext ? 'next' : '')}"></i>
          <div class="st-lvname">Lv ${lv}${isNext ? '（下一级）' : ''}</div>
          <div class="st-picks">${done ? picked : (isNext ? '选一个方向 →' : '未解锁')}</div>
        </div>
        <div class="st-side right">${right.map(n => stNodeCard(kind, n)).join('')}</div>
        ${isNext ? `<div class="st-next-opts">${t.trunk.map(o => {
          const have = t.picks.filter(x => x === o.id).length;
          // 每个按钮都写明"要花多少经验"；不够时把"现有多少"也写出来，别让玩家猜为什么点不动
          const costLine = canUp
            ? `<span class="st-cost">花 ${t.cost} 点${t.expName}</span>`
            : `<span class="st-cost lack">花 ${t.cost} 点${t.expName} · 现有 ${Math.floor(t.exp)}（还差 ${Math.ceil(t.cost - t.exp)}）</span>`;
          const ico2 = o.icon ? `<img class="st-icon" src="assets/img/skills/${o.icon}.png" alt="" onerror="this.style.display='none'">` : '';
          return `<button class="st-opt ${canUp ? '' : 'lockedb'}" data-trunkup="${kind}:${o.id}" ${canUp ? '' : 'disabled'}>
            <b>${ico2}${o.name}</b>${have ? ` <span class="st-have">已选 ${have}</span>` : ''}<span>${o.desc}</span>${costLine}</button>`;
        }).join('')}</div>` : ''}
      </div>`;
    }
    return `<div class="modal-title">${t.glyph} ${t.name}技能树 <span style="font-size:11px">主干 ${t.lv}/${t.max} · ${t.expName} <b>${t.exp}</b>${maxed ? ' · 已满级' : ` · 下一级 ${t.cost}`}</span>${inlineHelp('主干同一方向可重复选择，效果叠加；红虚线表示互斥。遗忘只能从最末端开始，返还一半经验。首个主干点需采集16、制造24、战斗12经验；后续采集树消耗为基准2倍、制造树3倍。采集、制造和战斗可积累对应经验。')}</div>
      <div class="st-tree">${rows}</div>
      <div class="modal-actions">${(() => {
        const ti = Game.trunkForgetInfo(kind);
        return ti.ok ? `<button class="mini-btn" data-trunkforget="${kind}">遗忘主干「${ti.optName}」第 ${ti.lv} 级 · 返还 ${ti.gain}</button>` : '';
      })()}<button id="st-back">返 回</button><button id="modal-close">关 闭</button></div>`;
  }
  // 商店清单统一入口：批量弹窗和"确定"结算都用它，避免两处各写一份导致货架对不上
  // ⚠️ 这里原来把四家店硬编码成 if/else，加了「美食家」之后默认分支会把它吞成杂货商 ——
  //    改成"TOWN 里有就直接按摊位 id 取"，以后再加店铺不用回来改这里。
  function shopBuyList(key) {
    const k = String(key || '').split(':')[0];
    if (k === 'BLACK') return BLACKMARKET.sell;
    if (k === 'ATL') return ATL_BUY;
    if (k === 'LAOCHAO') return LAOCHAO.sell;
    if (TOWN[k] && TOWN[k].sell) return TOWN[k].sell;
    return TOWN.grocer.sell;
  }
  function shopSellList(key) {
    const k = String(key || 'LAOCHAO').split(':')[0];
    // 盐镇：把所有摊位的收购单并起来（原来也是硬编码三家，同样会把新店漏掉）
    if (k === 'TOWN') return Object.values(TOWN).reduce((a, sh) => a.concat((sh && sh.buy) || []), []);
    if (k === 'BLACK') return BLACKMARKET.buy;
    if (k === 'ATL') return ATL_SHOP;
    return LAOCHAO.buy;
  }
  function batchnModal(cfg) {
    if(cfg.kind==='cellar'){const deposit=cfg.dir==='in',max=deposit?Game.invCount(cfg.item):Game.cellarState().inv[cfg.item],label=deposit?'存入地窖':'取出地窖';return `<div class="modal-title">${label} · ${ITEMS[cfg.item].name}</div><div class="batch-row"><span>数量</span><input type="range" id="batchn-n" min="1" max="${max}" value="1"><span id="batchn-count">1</span></div><div class="batch-row"><button data-bset="1">1份</button><button data-bset="10">10份</button><button data-bset="half">一半</button><button data-bset="all">全部</button></div><p>最多还能${label}${Game.cellarTransferMax(cfg.item,deposit)}份。</p><div class="modal-actions"><button id="batchn-do">${label}</button></div>`;}
    if(cfg.kind==='warehouse'){const deposit=cfg.dir==='in',max=(deposit?Game.warehouseDepositCount(cfg.item):Game.warehouseState().inv[cfg.item])||1,label=deposit?'存入':'取出';return `<div class="modal-title">${label} · ${ITEMS[cfg.item].name}</div><div class="batch-row"><span>数量</span><input type="range" id="batchn-n" min="1" max="${max}" value="1"><span id="batchn-count">1</span></div><div class="batch-row"><button class="mini-btn" data-bset="1">1份</button><button class="mini-btn" data-bset="10">10份</button><button class="mini-btn" data-bset="half">一半</button><button class="mini-btn" data-bset="all">全部</button></div><p class="hint">最多还能${label}${Game.warehouseTransferMax(cfg.item,deposit)}份。拖动数量条后确认。</p><div class="modal-actions transfer-actions"><button id="modal-transfer-back" ${cfg.returnKind==='warehouse'?'data-warehouse-open':'data-item="'+cfg.item+'"'}>返回</button><button id="batchn-do">${label}</button></div>`;}
    const isBuy = cfg.kind === 'buy';
    // 兑换（作者 2026-09-25）：长按出售行弹的就是这套批量面板，兑换沿用同一套 ——
    // 数量条 + 快捷 + 确定，没有单独的「全部」按钮。**汇率固定**，不参与行情折扣。
    if (cfg.kind === 'exchange') {
      const coin = cfg.dir === 'coin';
      const max = coin ? Math.max(1, Game.invCount('coin')) : Math.max(1, Math.floor(Game.invCount('beibi') / Game.SHELL_PER_COIN));
      const rate = coin ? `1 金币 → ${Game.SHELL_FOR_COIN} 贝壳` : `${Game.SHELL_PER_COIN} 贝壳 → 1 金币`;
      const 得 = (n) => coin ? `${n * Game.SHELL_FOR_COIN} 贝壳` : `${n} 金币`;
      cfg._unit = 0;
      return `<div class="modal-title">兑换 · ${coin ? '金币换贝壳' : '贝壳换金币'} <span style="font-size:11px">拖动数量条</span></div>
        <div class="batch-row"><span>数量</span><input type="range" id="batchn-n" min="1" max="${max}" value="${max}"><span id="batchn-count" class="batch-count">${max}</span></div>
        <div class="batch-row"><span>快捷</span><button class="mini-btn" data-bset="1">1 份</button><button class="mini-btn" data-bset="half">一半</button><button class="mini-btn" data-bset="all">全部（${max}）</button></div>
        <div class="batch-hint">固定汇率 ${rate} · 预计换得 <b id="batchn-total">${得(max)}</b></div>
        <div class="modal-actions"><button id="batchn-do">确 定</button><button id="modal-close">取 消</button></div>`;
    }
    const max = isBuy ? Math.max(1,cfg.max||1) : cfg.kind==='discard'?Math.max(1,cfg.fromWarehouse==='cellar'?(Game.cellarState().inv[cfg.item]||0):cfg.fromWarehouse?(Game.warehouseState().inv[cfg.item]||0):Game.warehouseDepositCount(cfg.item)):Math.max(1,Game.merchantSellCount(cfg.item,shopSellList(cfg.list)));
    const isBp = isBuy && ITEMS[cfg.item].cat === 'bp';
    let priceLine = '';
    if (cfg.kind === 'sell') {
      const ls = shopSellList(cfg.list);
      const en = ls.find(x => x.id === cfg.item);
      if (en) priceLine = `<div class="batch-hint">当前收购价 ${Game.priceOf(en.base, true, cfg.item)} 贝壳 / 个</div>`;
    } else if(isBuy) {
      const en = shopBuyList(cfg.shop).find(x => x.id === cfg.item);
      const unit = en ? Game.priceOf(en.base, false, cfg.item) : 0;
      const curName = (en && en.currency === 'coin') ? '金币' : '贝壳';
      cfg._unit = unit;
      priceLine = `<div class="batch-hint">单价 ${unit} ${curName} · 合计 <b id="batchn-total">${unit * max}</b> ${curName}${isBp ? '（图纸只需一份）' : ''}</div>`;
    }
    return `<div class="modal-title">${isBuy ? '批量购买' : (cfg.kind === 'discard' ? '批量丢弃' : '连续售卖')} · ${ITEMS[cfg.item].name} <span style="font-size:11px">拖动数量条</span></div>
      <div class="batch-row"><span>数量</span><input type="range" id="batchn-n" min="1" max="${max}" value="${max}"><span id="batchn-count" class="batch-count">${max}</span></div>
      <div class="batch-row"><span>快捷</span><button class="mini-btn" data-bset="1">1 个</button><button class="mini-btn" data-bset="half">一半</button><button class="mini-btn" data-bset="all">全部（${max}）</button></div>
      <div class="batch-hint">${isBuy ? '最多可买 ' + max + ' 个' : '当前持有 ' + max + ' 个'}</div>
      ${priceLine}
      <div class="modal-actions"><button id="batchn-do">确 定</button><button id="modal-close">取 消</button></div>`;
  }
  function batchModal(cfg) {
    const r = Game.craftRecipe(RECIPES.find(x => x.id === cfg.recipe));
    const max = Math.max(1, Math.min(Game.craftMax(r), 99));
    return `<div class="modal-title">批量制作 · ${r.name}</div><div class="batch-hint">拖动选择数量</div>
      <div class="batch-row"><span>数量</span><input type="range" id="batch-n" min="1" max="${max}" value="${max}"><span id="batch-count" class="batch-count">${max}</span></div>
      <div class="batch-hint">当前材料最多可做 ${max} 批 · 预计 <b id="batch-time">${Game.craftMinutes(r) * max}</b> 分钟（超过5小时先确认）</div>
      <div class="batch-hint" id="batch-output">产出：${Object.entries(r.out).map(([k,v]) => `${ITEMS[k].name}×${v * max}`).join('、')} · 材料：${Object.entries(Game.craftIn(r,max)).map(([k,v]) => `${ITEMS[k].name}×${v}`).join('、')}</div>
      <div class="batch-quick"><button data-cset="1">1 批</button><button data-cset="half">一半</button><button data-cset="max">全部</button></div>
      <div class="modal-actions"><button id="batch-do">制 作</button><button id="modal-close">取 消</button></div>`;
  }
  function campActions() {
    const st = S();
    const out = [];

    out.push({ label:'睡觉', cls:'sleep', desc: bedDesc(), fn:() => showModal('sleeppick') });
    out.push({ label:'休息 ' + restHours + ' 小时', fn:() => Game.rest(restHours), disabled: st.stats.stamina >= Game.maxStam(), reason:'体力充沛' });
    if (Game.laochaoAvailable()) out.push({ label:'与老潮交易', cls:'trade', desc:'商船停在南岸（22 点前）', fn:() => { laoTab = 'buy'; showModal('laochao'); } });
    if (st.furniture.flag && !Game.laochaoAvailable() && !st.laochao.arrived) out.push({ label:'升起信号旗', desc:'消耗木材×5，商船明日必来', fn:() => Game.signalFlag() });
    if (st.buildings.watch === 0) out.push({ label:'建造一级瞭望台', cls:'build', desc:'木杆×8 · 木板×8 · 藤蔓×4 · 看清草地/荒漠/山洞', anim:{ t:'build', l:'建造一级瞭望台' }, fn:() => Game.buildChain('watch'), disabled: !matsOk(BUILDING_CHAINS.watch[1].mats), reason:'材料不足' });
    return out;
  }
  function sleepRec() {
    // 公式只有 game.js 的 sleepMath 一份，这里不再抄一遍（抄的那份和真实恢复会差一两点）
    const f = Game.sleepForecast('normal');
    return f || { sta:0, hp:0, sp:5, hours:8, endClock:'--:--', hungerAfter:0, thirstAfter:0, hpNow:0, hpAfter:0, starveRisk:false };
  }
  function bedDesc() { const r = sleepRec(); return `睡 ${r.hours} 小时 · 体力+${r.sta} · 生命${r.hp >= 0 ? '+' : ''}${r.hp} · 精神+${r.sp}`; }
  function matsOk(mats) { for (const k in mats) if (Game.materialCount(k)<mats[k]) return false; return true; }

  // ---------- 营地管理（建造） ----------
  function renderCamp() {
    const st = S();
    showModal('camp');
  }
  function renderCampHelp(mode) {
    const st = S() || {};
    let html = `<div class="modal-title">${mode === 'furn' ? '家具作用' : '建筑作用'}</div><div class="help-list camp-help-list">`;
    if (mode === 'furn') {
      // 作者 2026-09-23：家具位是新手最容易踩的坑 —— 帮助页先把规则讲清楚，再逐件标"占不占位"。
      // 判定统一走 Game.furnTakesSlot（和建造页标注、建造前弹窗**同一份规则**，不会三处说法不一致）。
      html += `<div class="help-item"><b>家具位</b><span>当前 ${Game.furnitureUsed()}/${Game.houseSlots()} 格。`
        + `多数家具占 1 格，满了就造不了新的——升级住所、或用营地的「扩建住处」都能 +1 格。</span><details class="furniture-slot-details"><summary>哪些家具不占位？</summary>`
        + `<b>不占位</b>的有：旗帜、路标、书架、水壶、滤雨器、织布机、药炉；`
        + `以及工具台 / 熔炉 / 烟熏炉 / 床的<b>升级替换</b>（往上升一级不额外占格）。</details></div>`;
      for (const f of [...FURNITURE].sort((a,b)=>Number(a.onlyDifficulty==='nightmare')-Number(b.onlyDifficulty==='nightmare'))) {
        // 身份专属家具也照常展示（养蜂人之外的玩家要能看到「蜂箱」是做什么的、为什么造不了），
        // 只是额外注明「当前身份不可造」，别让玩家以为哪里坏了。
        const isMine = !f.onlyIdentity || st.identity === f.onlyIdentity;
        const lockNote = (!isMine && f.onlyIdentity) ? ` <b style="color:#a8382a">（${(IDENTITIES[f.onlyIdentity]||{}).name||f.onlyIdentity}专属，当前身份不可造）</b>` : '';
        const slotNote = Game.furnTakesSlot(f.id) ? ' <b>（占 1 格）</b>' : ' <b>（不占家具位）</b>';
        html += `<div class="help-item"><b>${f.name}</b><span>${f.desc}${slotNote}${lockNote}</span></div>`;
      }
    } else {
      const bc = {
        house:['住所', c => `睡眠恢复 ${Math.round(c.rest*100)}% · 保暖 ${c.warm} · 家具位 ${c.slots}`],
        fire:['篝火', c => `可烹饪 · 保暖等级 ${c.warm}（升级提高保暖，不增加制作份数）`],
        storage:['储物', c => `仓库容量 ${c.cap} 格`],
        wall:['围墙', c => `营地防御 ${c.def} · 夜袭率 ${(c.raid*100).toFixed(c.raid<0.01?2:1)}%`],
        watch:['瞭望台', c => c.unlock ? `解锁：${c.unlock.map(u => ((SCENES.find(s=>s.id===u)||{}).name)||u).join('、')}` : '（地基）' + (c.weather12 ? ' · 预判12h天气' : '') + (c.weather24 ? ' · 预判24h天气' : '') + (c.info ? ' · 显示全岛情报' : '')],
        dock:['船坞', c => c.boat === 'none' ? '河边的小码头（未下水）' : (c.boat === 'raft' ? '木筏·近海' : c.boat === 'boat' ? '小船·对岸盐镇' : c.boat === 'ship' ? '大船·载货更多' : c.boat === 'ocean' ? '远洋船·结局A' : '')],
        farm:['耕地', c => `耕地田块 ${c.plots} 块`],
      };
      for (const [cid, [cname, eff]] of Object.entries(bc)) {
        const chain = BUILDING_CHAINS[cid];
        const tiers = chain.map(t => t.name).join(' → ');
        const tip = eff(chain[chain.length - 1]);
        const grow = chain.map(t => eff(t)).join(' ｜ ');
        html += `<div class="help-item"><b>${cname}（${tiers}）</b><span>最高：${tip}</span><div class="help-sub">逐级：${grow}</div></div>`;
      }
    }
    // 底部「关闭」去掉：右上角已经有 × 了（作者 2026-09-21 点名的是这个说明面板）
    html += '</div>';
    return html;
  }
  // 牧场面板：鸡舍 / 羊圈的牲畜、饲料与自动喂食
  function livestockModal(cfg) {
    const kind = (cfg && cfg.kind) || 'pen';
    const i = Game.liveInfo(kind);
    const name = kind === 'pen' ? '羊圈' : '鸡舍';
    let html = `<div class="modal-title">牧场 · ${name} <span style="font-size:11px">${i.count}/${i.cap} 只</span></div><div class="help-list">`;
    html += `<div class="help-item"><b>自动喂食</b><span>每天清晨自动消耗 ${i.feedName}（每只 1 份），并结算羊毛 / 鸡蛋</span><button class="mini-btn" data-livefeed="1">${i.autoFeed ? '已开启 · 关掉' : '已关闭 · 打开'}</button></div>`;
    html += `<div class="help-item"><b>饲料</b><span>${i.feedName} 总量 ×${i.feedHave}（背包${i.feedBag}＋岛仓${i.feedStore}） · 每日需要${i.feedNeed} · 缺口${Math.max(0,i.feedNeed-i.feedHave)}${i.autoFeed ? '' : '（自动喂食关闭中）'}</span></div>`;
    if (!i.count) html += `<div class="hint">圈里还空着。</div>`;
    for (const a of i.list) html += `<div class="help-item"><b>${a.label}</b><span>${a.text}</span></div>`;
    if (kind === 'coop') {
      const have = Game.invCount('chick');
      const canAdd = have > 0 && i.count < i.cap;
      html += `<div class="help-item"><b>装填小鸡</b><span>背包里有 ${have} 只（外岛·盐镇杂货商 80 贝壳一只）</span><button class="mini-btn" data-liveadd="1" ${canAdd ? '' : 'disabled'}>放 进 鸡 舍</button></div>`;
      // 扩建：3 只 → 4 只 → 5 只（作者 2026-09-17 要求）
      const ex = i.ext || 0, exMax = i.extMax || 2;
      if (ex < exMax) {
        const emats = Game.coopExtMats(ex + 1) || {};
        const okE = matsOk(emats);
        const rsn = okE ? '' : missingReason(emats, '');
        html += `<div class="build-next">→ 扩建鸡舍（${i.cap} 只 → ${i.cap + 1} 只）<span class="mats">${matsStr(emats)}</span><button class="mini-btn ${okE ? '' : 'lockedb'}" data-coopext="1" ${rsn ? `data-reason="${esc(rsn)}"` : ''}>扩 建</button></div>`;
      } else {
        html += '<div class="hint">鸡舍已扩建到极限（最多 5 只）。</div>';
      }
    }
    html += '</div>';
    html += `<div class="overlay-text">${kind === 'pen'
      ? '羊每天吃 1 份干草、产 1 份羊毛；40~60 天后自然寿终，留下 3 份兽肉。干草可以在手工里用茅草晒（5 茅草=2 干草），盐镇杂货商也有卖。<br>想添羊：带上「陷阱」去草地布下，次日再到草地，50% 概率捕到羊羔——选「放回羊圈」就能留下它。'
      : '小鸡连喂 5 天小麦长成母鸡；母鸡每天吃 1 份小麦、下一颗蛋（鸡蛋能存一周），20~30 天后寿终，留下 1 份兽肉。小麦靠耕地种，小鸡在外岛（盐镇的杂货商）买。'}</div>`;
    html += '<div class="modal-actions"><button id="modal-back">返 回</button><button id="modal-close">关 闭</button></div>';
    return html;
  }
  const ROOM_FURNITURE_ATLAS = {
    wb1:0, wb2:1, wb3:1, fr1:2, fr2:3, fr3:3,
    bed1:4, bed2:5, bed3:6, bed4:6, floorRest:4, stove:7,
    rack:8, tannery:9, spin:10, loom:11,
    mortar:12, medPot:13, rainfilter:14, shelf:15,
    tailor:16, sm1:17, sm2:18, grindstone:19, beehive:20,
    treadmill:21, dumbbell:22, tank:23, flag:24, signpost:25,
  };
  function roomFurniture(st) {
    const chains = [['wb1','wb2','wb3'],['fr1','fr2','fr3'],['sm1','sm2'],['bed1','bed2','bed3','bed4'],['tank','rainfilter']];
    const superseded = fid => { const chain = chains.find(c => c.includes(fid)); return chain && chain.slice(chain.indexOf(fid) + 1).some(id => st.furniture[id]); };
    const visible = FURNITURE.filter(f => !f.farmOnly && (!f.onlyDifficulty || f.onlyDifficulty===st.difficulty) && !['beehive','flag','signpost','cellar'].includes(f.id) && st.furniture[f.id] && !superseded(f.id)).sort((a,b)=>Number(a.onlyDifficulty==='nightmare')-Number(b.onlyDifficulty==='nightmare'));
    if (st.tailorGift === 1 && !st.furniture.tailor) visible.push(FURNITURE.find(f => f.id === 'tailor'));
    if (!visible.some(f => f.id.startsWith('bed'))) visible.push({ id:'floorRest', name:'铺地休息' });
    return visible;
  }
  function roomAction(f) {
    if (f.id.startsWith('bed') || f.id === 'floorRest') return 'sleep';
    if (f.id === 'tank' || f.id === 'rainfilter') return 'water';
    if (f.id === 'treadmill') return 'train:run';
    if (f.id === 'dumbbell') return 'train:lift';
    if (f.id === 'nightmareExtractor') return 'nightmareInfusion';
    if (f.id === 'soulSeparator') return 'separator';
    if (f.id === 'grindstone') return 'grind';
    if (f.id === 'shelf') return 'bookFocus';
    if (f.id.startsWith('wb')) return 'craft:work1';
    if (f.id.startsWith('fr')) return 'craft:furn1';
    if (f.id.startsWith('sm')) return 'craft:fire:smoked';
    if (['spin','loom','tailor'].includes(f.id)) return 'craft:tailor';
    if (['medPot','mortar'].includes(f.id)) return 'craft:med';
    if (['rack','tannery'].includes(f.id)) return 'craft:furniture';
    if (f.id === 'stove') return 'craft:fire';
    if (f.id === 'flag') return 'flag';
    return `info:${f.id}`;
  }
  function runRoomAction(value) {
    const [kind, arg, group] = value.split(':');
    if (kind === 'craft') { craftTab = arg; craftGroup = group || 'all'; showModal('craft'); }
    else if (kind === 'sleep') showModal('sleeppick');
    else if (kind === 'nightmareInfusion') showModal('nightmareInfusion');
    else if (kind === 'separator') showModal('separator');
    else if (kind === 'grind') showModal('grind');
    else if (kind === 'transferHelp')html='<div class="modal-title">仓库存取</div><p>轻点物品：向对面存入或取出1份。</p><p>长按物品，继续左右拖动选择数量，松开后确认批量存取。</p><div class="modal-actions"><button data-warehouse-open>返回仓库</button></div>';
    else if (kind === 'bookFocus') showModal('bookFocus');
    else if (kind === 'train') { const r = Game.train(arg); if (r && !r.ok && r.reason !== '等待确认') centerToast(r.reason); }
    else if (kind === 'water') { const r = Game.collectRainWater(); if (r && !r.ok) centerToast(r.reason); }
    else if (kind === 'flag') Game.signalFlag();
    else if (kind === 'info') { const f = FURNITURE.find(x => x.id === arg); showModal('overlay', {title:f ? f.name : '家具', text:f ? f.desc : '这件家具已经在房间里。', choices:[{label:'返回房间',ok:()=>{}}]}); }
  }
  let roomPlacing=false;
  function renderRoomScene(st) {
    const main = $('#main');
    const house = BUILDING_CHAINS.house[st.buildings.house] || BUILDING_CHAINS.house[0];
    const roomStyle = st.buildings.house === 0 ? 'tent' : st.buildings.house === 3 ? 'stone' : 'wood';
    const src = `assets/img/map-pack/interior/room-${roomStyle}.webp`;
    // 家具沿四面墙落位：中央约 30%~70% × 35%~65% 留成活动区，门前也不放东西。
    // 百分比坐标跟着房间底图缩放，旧档已有的家具也会自然落到对应位置。
    const roomPlaces = {
      wb1:[17,17], wb2:[17,17], wb3:[17,17],
      tailor:[30,16], spin:[10,47], loom:[46,83],
      fr1:[44,16], fr2:[44,16], fr3:[44,16],
      sm1:[56,16], sm2:[56,16], stove:[69,16], rack:[9,68],
      bed1:[86,24], bed2:[86,24], bed3:[86,24], bed4:[86,24], floorRest:[86,24],
      tannery:[21,83], shelf:[34,83], grindstone:[57,83],
      mortar:[68,83], medPot:[77,83], soulSeparator:[5,30], nightmareExtractor:[48,48],
      tank:[89,84], rainfilter:[89,84],
      treadmill:[89,64], dumbbell:[76,64],
    };
    const sparePlaces = [[10,37],[90,48],[27,78],[72,20],[90,68],[40,20]];
    const furniture = roomFurniture(st);
    let spareIndex = 0;
    const sprites = furniture.map(f => {
      const saved=st.roomLayout?.[f.id];
      const pos = Array.isArray(saved)&&saved.length===2?saved:roomPlaces[f.id] || sparePlaces[(spareIndex++) % sparePlaces.length];
      const baseSize = f.id === 'soulSeparator' ? 70 : f.id.startsWith('bed') || f.id === 'floorRest' ? 190
        : f.id.startsWith('wb') ? 148
        : ['tailor','loom','treadmill'].includes(f.id) ? 130
        : /^(fr|sm)/.test(f.id) || f.id === 'stove' ? 110
        : ['rack','tannery','spin','shelf'].includes(f.id) ? 112
        : ['tank','rainfilter'].includes(f.id) ? 96
        : ['mortar','medPot','grindstone','flag','signpost'].includes(f.id) ? 82 : 100;
      const desktopScale = Math.min(2, Math.max(1, (main ? main.clientWidth : 1200) / 1200));
      const densityScale = main && main.clientWidth >= 1100 ? 1 : furniture.length > 10 ? 0.82 : furniture.length > 6 ? 0.9 : 1;
      const size = Math.round(baseSize * densityScale * desktopScale);
      const atlas = ROOM_FURNITURE_ATLAS[f.id];
      const icon = f.id==='nightmareExtractor' ? '<svg class="room-furn-image" viewBox="0 0 100 110" aria-hidden="true"><g fill="#37352e" stroke="#d2cdbd" stroke-width="1.5"><path d="M18 91 50 76 84 91 50 106Z M25 89V35L35 25V85 M75 89V35L65 25V85 M18 38 50 17 82 38 50 53Z M35 36 50 27 65 36 50 45Z"/><ellipse cx="50" cy="83" rx="22" ry="9"/><path d="M42 79Q24 58 48 51Q62 60 54 73Q75 56 55 48Q83 63 61 81Z" fill="#ece8da" stroke="#39372d"/><path d="M15 39 15 80 M85 39 85 80 M20 49 30 53 M70 53 80 49 M20 60 30 64 M70 64 80 60"/></g></svg>' : f.id==='soulSeparator' ? '<img class="room-furn-image" src="assets/img/build/soulSeparator.png" alt="">' : atlas === undefined ? `<span class="room-furn-glyph">${esc(f.name.slice(0,1))}</span>`
        : `<span class="room-furn-icon${atlas >= 16 ? ' second' : ''}${skinOn('seasons') ? ' colored' : ''}" style="background-position:${(atlas % 4) * 100 / 3}% ${Math.floor((atlas % 16) / 4) * 100 / 3}%"></span>`;
      return `<button class="room-sprite" data-furniture="${f.id}" data-roomact="${roomAction(f)}" title="${esc(f.name)}" aria-label="使用${esc(f.name)}" style="left:${pos[0]}%;top:${pos[1]}%;--sprite-size:${size}px">${icon}</button>`;
    }).join('');
    let stage = main.querySelector('.room-stage');
    if (!stage || stage.dataset.roomStyle !== roomStyle) {
      dom.dispose(main);main.innerHTML = `<div id="scene-wrap" class="stage room-stage" data-room-style="${roomStyle}"><div id="stage-inner"><img id="scene-img" class="room-scene-art" src="${src}" alt="${esc(house.name)}室内" draggable="false"><div id="hotspots" class="ready"></div><div id="camp-buildings"></div></div><div id="scene-name"></div></div>`;
      stage = main.querySelector('.room-stage');
      fitStage();
    }
    const hotspots = stage.querySelector('#hotspots');
    if (hotspots.dataset.sprites !== sprites) {
      dom.html(hotspots,`${sprites}<button id="room-exit" title="返回营地" aria-label="返回营地" type="button">⌂ 出门</button>`);
      hotspots.dataset.sprites = sprites;
      hotspots.querySelectorAll('.room-sprite').forEach(b=>b.onclick=()=>runRoomAction(b.dataset.roomact));

      hotspots.querySelector('#room-reset')?.addEventListener('click',()=>{S().roomLayout={};Game.save();delete hotspots.dataset.sprites;renderRoomScene(S());});
      for(const sprite of hotspots.querySelectorAll('[data-furniture]')) {
        if(!roomPlacing)continue;
        sprite.onclick=e=>{e.stopPropagation();};let drag=null;
        sprite.onpointerdown=e=>{e.preventDefault();e.stopPropagation();const r=hotspots.getBoundingClientRect();drag={r};sprite.setPointerCapture(e.pointerId);};
        sprite.onpointermove=e=>{if(!drag)return;const r=drag.r,marginX=(sprite.offsetWidth/2+5)/r.width*100,marginY=(sprite.offsetHeight/2+5)/r.height*100;const x=Math.max(marginX,Math.min(100-marginX,(e.clientX-r.left)/r.width*100)),y=Math.max(marginY,Math.min(85-marginY,(e.clientY-r.top)/r.height*100));sprite.style.left=x+'%';sprite.style.top=y+'%';S().roomLayout=S().roomLayout || {};S().roomLayout[sprite.dataset.furniture]=[x,y];};
        sprite.onpointerup=e=>{if(drag){drag=null;Game.save();try{sprite.releasePointerCapture(e.pointerId);}catch{}}};sprite.onpointercancel=()=>{drag=null;};
      }
      hotspots.querySelector('#room-exit').onclick = () => { roomView = false; roomPlacing=false;render(); };
    }
    const nameEl = stage.querySelector('#scene-name');
    const roomName = `${house.name} · 室内`;
    if (nameEl.textContent !== roomName) nameEl.textContent = roomName;
    lastSceneKey = 'room|' + roomStyle;
  }
  function campModal(selected) {
    if (S().scene === 'atlantis') return atlantisCampModal();
    const st = S();
    const chains = [
      ['house','住所'], ['fire','篝火'], ['storage','储物'], ['wall','围墙'], ['watch','瞭望台'], ['dock','船坞'], ['farm','耕地'], ['cellar','地窖'],
    ];
    let html = '<div class="modal-title">营地建造 <button class="helpbtn" data-help="build">?</button></div>';
    html += '<div class="'+(selected?'camp-building-detail':'camp-building-buttons')+'">';
    for (const [cid, cname] of chains) {
      const chain = BUILDING_CHAINS[cid];
      const cur = st.buildings[cid];
      const next = chain[cur + 1];
      if(selected && selected!==cid)continue;
      if(!selected){
        const ext=cid==='house' && (st.houseExt||0)<Game.houseExtMax()?Game.houseExtMats((st.houseExt||0)+1):cid==='storage' && (st.storeExt||0)<Game.storeExtMax()?Game.storeExtMats((st.storeExt||0)+1):null;
        const ready=!!((next&&matsOk(next.mats))||(ext&&matsOk(ext)));
        html+=`<button class="camp-building-button ${ready?'materials-ready':''}" data-building-detail="${cid}"><b>${cname}</b><span>${cur<0?'尚未建造':chain[cur].name}</span></button>`;
        continue;
      }
      let extra = '';
      if (cid === 'house') {
        const hExt = st.houseExt || 0, hMax = Game.houseExtMax();
        if (hExt < hMax) {
          const emats = Game.houseExtMats(hExt + 1);
          const okE = matsOk(emats);
          const rsn = okE ? '' : missingReason(emats, '');
          extra = `<div class="build-next">→ 扩建住处（${hExt + 1}/${hMax}）<span class="mats">${matsStr(emats)}</span><button class="mini-btn ${okE ? '' : 'lockedb'}" data-hsext="1" ${rsn ? `data-reason="${esc(rsn)}"` : ''}>扩建</button></div>`;
        } else {
          extra = '<div class="hint">扩建已达上限</div>';
        }
      }
      if(cid==='cellar'&&cur>=0)extra='<div class="hint">20格食物储藏 · 腐坏速度降至三分之一</div><button class="mini-btn" data-cellar-open>存取食物</button>';
      if (cid === 'storage') {
        const sExt = st.storeExt || 0, sMax = Game.storeExtMax();
        if (sExt < sMax) {
          const emats = Game.storeExtMats(sExt + 1);
          const okS = matsOk(emats);
          const rsnS = okS ? '' : missingReason(emats, '');
          extra = `<div class="build-next">→ 扩建仓库（${sExt + 1}/${sMax}）<span class="mats">${matsStr(emats)}</span><button class="mini-btn ${okS ? '' : 'lockedb'}" data-stext="1" ${rsnS ? `data-reason="${esc(rsnS)}"` : ''}>扩建（容量+${Game.storeExtCap()}）</button></div>`;
        } else {
          extra = '<div class="hint">扩建已达上限</div>';
        }
      }
      html += `<div class="camp-col"><div class="camp-col-title">${cname}</div>
        <div class="camp-cur">${cur < 0 ? '尚未建造' : chain[cur].name}</div>
        <p class="hint">${esc((next||chain[cur]||{}).desc||({house:'居住与恢复，升级住所可增加家具位。',fire:'烹饪食物，升级改善营地生活。',storage:'存放物品，升级与扩建增加容量。',wall:'保护营地，减少袭击损失。',watch:'观察周围环境与危险。',dock:'造船与出海探索。',farm:'开垦耕地，种植作物。',cellar:'储存20格食物，腐坏速度降至三分之一。'}[cid]))}</p>${next ? buildBtn(cid, next) : '<div class="hint">已满级</div>'}${extra}</div>`;
    }
    if(selected)return html+'</div><div class="modal-actions"><button data-camp-back>返回营地建造</button></div>';
    html += '</div><div class="modal-title" style="margin-top:12px">家具（家具位 ' + furnitureCount() + '/' + Game.furnSlotInfo().cap + '） <button class="helpbtn" data-help="furn">?</button></div><div class="furn-grid">';
    const CHAINS = [['wb1','wb2','wb3'],['fr1','fr2','fr3'],['sm1','sm2'],['bed1','bed2','bed3','bed4'],['tank','rainfilter']];
    const superseded = (fid) => { const ch = CHAINS.find(c => c.includes(fid)); if (!ch) return false; const idx = ch.indexOf(fid); for (let j = idx + 1; j < ch.length; j++) if (st.furniture[ch[j]]) return true; return false; };
    for (const f of [...FURNITURE].sort((a,b)=>Number(a.onlyDifficulty==='nightmare')-Number(b.onlyDifficulty==='nightmare'))) {
      // 鸡舍/羊圈已经搬到农田（作者 2026-09-25）：营地的家具列表不再列它们，
      // 想去建/去管理 → 农田场景的「农场管理」。老存档里已建好的也照样在那边管。
      if (f.farmOnly) continue;
      if (f.onlyDifficulty && st.difficulty!==f.onlyDifficulty) continue;
      if (superseded(f.id)) continue;   // 已被更高一级替代，隐藏
      if (f.onlyIdentity && st.identity !== f.onlyIdentity) continue;   // 身份专属家具（例：养蜂人的蜂箱）
      // 裁缝台若来自旧档赠送（S.tailorGift=1）：显示"已可用（附赠）"，不显示拆除按钮、也不允许重复建造
      const gifted = f.id === 'tailor' && Game.tailorGifted() && !st.furniture.tailor;
      const built = !!st.furniture[f.id];
      if (gifted) {
        html += `<div class="furn built">✔ ${f.name}<span class="hint">旧工坊附赠，无须重造（不占家具位）</span></div>`;
        continue;
      }
      if (built) {
        // 作者 2026-09-24："鸡舍跟羊圈名字怎么看不见" —— 以前这两件把名字塞进「管理」按钮里，
        // 结果卡片上只剩一个 ✔ 和两个按钮，看不出这是鸡舍还是羊圈。现在**名字照常当标题**，
        // 「管理 / 拆除」退到按钮行。
        const live = (f.id === 'coop' || f.id === 'pen') ? (() => { const i = Game.liveInfo(f.id); return `（${i.count}/${i.cap}）`; })() : '';
        html += `<div class="furn built"><span class="furn-name">✔ ${f.name}${live}</span>`
          + ((f.id === 'coop' || f.id === 'pen') ? `<button class="mini-btn" data-live="${f.id}">管理</button>` : '')
          + (f.id === 'rainfilter' ? `<span class="hint">储水 ${Math.max(0, Number(st.rainWater) || 0)}/20</span><button class="mini-btn" data-collectrain="1">取水</button>` : '')
          + (f.id === 'nightmareExtractor' ? `<button class="mini-btn" data-infusion-open="1">汲取魂魄</button>` : '')
          + (f.id === 'soulSeparator' ? `<button class="mini-btn" data-separator-open="1">分解魂魄</button>` : '')
          + (f.id === 'shelf' ? `<button class="mini-btn" data-book-open>选择集中</button>` : '')
          + (f.id === 'cellar' ? `<button class="mini-btn" data-cellar-open>存取食物</button>` : '')
          + (f.id === 'beehive' ? `<span class="hint">蜂蜜 ${Math.max(0, Number(st.hiveHoney) || 0)}/12</span><button class="mini-btn" data-collecthoney="1">收蜜</button>` : '')
          + (f.id === 'treadmill' || f.id === 'dumbbell' ? `<span class="hint">已练 ${Math.min(16, Number(st.training && st.training[f.id === 'treadmill' ? 'run' : 'lift']) || 0)}/16 次；每日限一器材，每次 6 小时</span><button class="mini-btn" data-train="${f.id === 'treadmill' ? 'run' : 'lift'}">锻炼</button>` : '')
          + `<button class="mini-btn demolish" data-demolish="${f.id}">拆除</button></div>`;
        continue;
      }
      const canShow = !f.needPrev || st.furniture[f.needPrev];
      if (!canShow) continue;
      const buildCheck = Game.canBuildFurniture(f.id);
      const okF = buildCheck.ok;
      const reason = buildCheck.reason;
      // 作者 2026-09-23："家具有的是不占用家具格的……建议直接在建造的页面就标注"。
      // 所以两种都标出来，玩家不用去翻帮助页：占位的写「占 1 格」，不占的写「不占位」。
      const si = Game.furnSlotInfo(f.id);
      const slotTag = si.takes
        ? `<span class="slot-tag takes" title="打造后会占用 1 格家具空间">占 1 格</span>`
        : `<span class="slot-tag free" title="这件不占用家具空间">不占位</span>`;
      html += `<div class="furn"><span class="furn-name">${f.name}${slotTag}</span><span class="furn-mats">${matsStr(f.mats)}</span>${!okF ? `<span class="hint furn-requirements">${buildCheck.reasons.map(esc).join('<br>')}</span>` : ''}
        <button class="mini-btn ${okF ? '' : 'lockedb'}" data-fid="${f.id}" ${reason ? `data-reason="${esc(reason)}"` : ''}>建造(${(f.time/60).toFixed(1)}h)</button></div>`;
    }
    // 底部的「关闭」按钮去掉：右上角已经有 × 了，白占一行高度（作者 2026-09-21）。
    html += '</div>';
    return html;
  }
  function missingReason(mats, extra) {
    const miss = [];
    for (const k in mats) if (Game.materialCount(k)<mats[k]) miss.push(`${ITEMS[k].name} ${Game.materialCount(k)}/${mats[k]}`);
    let s = miss.length ? `材料不足：${miss.join('、')}` : '';
    if (extra) s += (s ? '；' : '') + extra;
    return s;
  }
  function buildBtn(cid, next) {
    const ok = matsOk(next.mats) && (!next.needBp || Game.knowsBlueprint(next.needBp));
    const reason = ok ? '' : missingReason(next.mats, (next.needBp && !Game.knowsBlueprint(next.needBp)) ? `需要图纸：${ITEMS[next.needBp].name}` : '');
    const extra = next.needBp ? ` · 需${ITEMS[next.needBp].name}` : '';
    return `<div class="build-next">→ ${next.name}<span class="mats">${matsStr(next.mats)}${extra}</span>
      <button class="mini-btn ${ok ? '' : 'lockedb'}" data-chain="${cid}" ${reason ? `data-reason="${esc(reason)}"` : ''}>建造(${(next.time/60).toFixed(1)}h)</button></div>`;
  }
  // 建造/升级需要的材料：**写全名**（以前只显示一个字 + 数量，例如"板4 石4"，玩家看不出是什么）。
  // 顺带带上"已有/需要"，材料够不够一眼就看得出来。
  function matsStr(mats) {
    return Object.entries(mats).map(([k, v]) => {
      const have = Game.materialCount(k);
      const it = ITEMS[k] || {};
      const nm = it.name || k;
      const enough = have >= v;
      return `${nm} ${enough ? have : `<b class="lack">${have}</b>`}/${v}`;
    }).join(' · ');
  }
  function furnitureCount() { return Game.furnitureUsed(); }

  // ---------- 共用管理面板：结构与玩法渲染分离 ----------
  function playerPanelTabs(active){return `<nav class="inventory-view-tabs player-panel-tabs" aria-label="随身管理">${[['inv','背包 '+Game.capUsed()+'/'+Game.capacity()],['equip','装备'],['craft','制作']].map(([k,n])=>`<button data-player-panel="${k}" class="${active===k?'active':''}">${n}</button>`).join('')}</nav>`;}
  function layoutWorkModal(titleHtml, bodyHtml, rightHtml) {
    return `<div class="work-head"><div class="work-title">${titleHtml}</div>${rightHtml || ''}</div><div class="work-body">${bodyHtml}</div>`;
  }
  const CRAFT_GROUP_NAMES = { all:'全部', material:'原料', textile:'织布', tool:'工具', weapon:'武器', armor:'防具', clothing:'衣物', food:'饮食', smoked:'烟熏', medicine:'药品', accessory:'饰品', device:'器具', other:'其他' };
  function craftGroupOf(r) {
    if (r.station === 'spin' || r.station === 'loom') return 'textile';
    if (r.station === 'smoke1' || r.station === 'smoke2') return 'smoked';
    const id = Object.keys(r.out)[0];
    const cat = ITEMS[id] && ITEMS[id].cat;
    if (id === 'flour') return 'material';
    if (cat === 'mat' || cat === 'seed') return 'material';
    if (cat === 'tool') return 'tool';
    if (cat === 'weapon') return 'weapon';
    if (cat === 'armor' || cat === 'shield') return 'armor';
    if (cat === 'cloth') return 'clothing';
    if (cat === 'food' || cat === 'drink') return 'food';
    if (cat === 'med') return 'medicine';
    if (cat === 'accessory') return 'accessory';
    if (cat === 'special') return 'device';
    return 'other';
  }
  // ---------- 制造 ----------
  function renderCraft() {
    const st = S();
    const atCamp = st.scene === 'camp';   // 野外只能手工，其他工坊需回营地
    const atAtlantis = st.scene === 'atlantis';
    const tabs = [
      ['none','手工'], ['work1','工具台'], ['tailor','纺织·衣物'], ['furn1','熔炉'],
      ['med','药品'], ['fire','篝火·烹饪'], ['grind','磨刀石'], ['furniture','晾晒·制革'],
    ];
    if (atAtlantis) tabs.push(['pearlWork','珠光工作台'], ['sourceForge','源质熔炉']);
    // 作者 2026-09-24："未解锁（未建造）的家具也不在制造栏左侧显示"
    // → 没造的工坊**整个分类藏起来**，不再摆一个带 🔒 的死按钮。想知道还能造什么，去营地建造页看。
    // ⚠️ 末尾 `|| craftTab === sid`：当前选中的分类即使暂时不可用也留在列表里，
    //    否则会出现"左边没有任何高亮项、右边却是它的内容"的怪状态。
    const tabAvail = (sid) => sid === 'none' ? true
      : sid === 'fire' ? st.buildings.fire >= 0
      : sid === 'grind' ? !!S().furniture.grindstone
      : stationBuilt(sid);
    const shownTabs = tabs.filter(([sid]) => tabAvail(sid) || craftTab === sid);
    let body = '<div class="work-side craft-stations">';
    for (const [sid, name] of shownTabs) {
      body += `<button class="tab ${craftTab === sid ? 'active' : ''}" data-station="${sid}">${name}</button>`;
    }
    // 制造面板不再挂攻略条（作者 2026-09-22：攻略统一收进邮箱「攻略」页，面板保持干净）
    body += '</div><div class="work-content"><div class="work-scroll"><div class="recipe-list">';
    let html = '';
    let groupHtml = '';
    if (craftTab === 'grind') {
      const w = S().equipment.weapon;
      if (!atCamp) html += '<div class="hint">磨刀石在营地里，回营地才能使用。</div>';
      else if (!S().furniture.grindstone) html += '<div class="hint">请先建造「磨刀石」家具（石头×4+燧石×1）。</div>';
      else if (!w) html += '<div class="hint">请先装备一把武器（主手），才能用磨刀石。</div>';
      else {
        const named = (S().weaponNames || {})[w];
        const repairMat = Game.repairMatOf(w);
        const rcost = repairMat ? `${ITEMS[repairMat[0]].name}×${repairMat[1]}` : '不可修复';
        // 玩家反馈"磨刀磨的是哪把"——明确写出作用于主手武器（作者 2026-09-19）
        html += `<div class="recipe-row"><b>${ITEMS[w].glyph} 磨刀</b><span class="rcost">磨的是<b>主手武器</b>（${ITEMS[w].name}）· +3攻击 · 20%流血 · 持续3场（耗 燧石×1）</span><button class="mini-btn" data-grind="sharpen">磨刀</button></div>`;
        html += repairMat ? `<div class="recipe-row"><b>${ITEMS[w].glyph} 修补</b><span class="rcost">${ITEMS[w].name} 耐久恢复满（耗 ${rcost}）</span><button class="mini-btn" data-grind="repair">修补</button></div>` : `<div class="hint">神弓不可修复；耐久耗尽后留在背包中作收藏。</div>`;
        html += `<div class="recipe-row"><b>${ITEMS[w].glyph} 命名</b><span class="rcost">${named ? '已命名（+1生效）· 每把只能一次' : '武器伤害永久+1（耗 命名牌×1）'}</span><button class="mini-btn" data-grind="name">${named ? '已命名' : '命名'}</button></div>`;
      }
      html += brokenWeaponRows();
    } else if (craftTab !== 'none' && !(atCamp || (atAtlantis && (craftTab === 'pearlWork' || craftTab === 'sourceForge')))) {
      html += '<div class="hint">其他工坊都在营地里，回营地才能使用。</div>';
    } else if (!stationBuilt(craftTab) && craftTab !== 'none' && craftTab !== 'fire') {
      html += `<div class="hint">还没有${tabs.find(t => t[0] === craftTab)[1]}，去营地建造吧。</div>`;
    } else {
      let any = false;
      const list = [];
      if (craftTab === 'work1' && !Game.knowsBlueprint('bpBlack')) html += '<div class="hint">玄铁镐及玄铁装备：先到沉船湾黑市找独眼购买「玄铁武器图纸」，再建造三级「高级工具坊」。拿到图纸后配方才会显示。</div>';
      for (const raw of RECIPES) {
        if (raw.legacyPlank) continue;
        const r = Game.craftRecipe(raw);
        const stations = stationFamily(craftTab);
        if (!stations.includes(r.station)) continue;
        if (craftTab === 'work1') {
          if (r.station !== 'work1' && r.station !== 'work2' && r.station !== 'work3') continue;
        }
        // 作者 2026-09-24："需要图纸的制作改为直接不显示，拿到图纸之后才显示"
        // → 没有图纸的配方整条隐藏（以前是显示成灰色 locked + 一行"需要图纸"，看着像坏了）。
        if (r.needBp && !Game.knowsBlueprint(r.needBp)) continue;
        list.push(r);
      }
      const TOOLFIRST = { r_axestone: 30, r_pickstone: 29, r_knife: 28, r_pole: 27, r_rope: 26, r_stone: 25 };
      // 常用工具和消耗品靠前，背包装备、永久强化与限次配方靠后；同类保持原顺序。
      const recipePriority=r=>r.sortPriority ?? ((TOOLFIRST[r.id]||0)|| (r.permLimit||r.uniqueItem?-10:Object.keys(r.out).every(id=>(['food','drink','mat','med','ammo'].includes(ITEMS[id]?.cat)||ITEMS[id]?.ammo===1))?10:r.needBp?-2:0));
      list.sort((a,b)=>recipePriority(b)-recipePriority(a));
      const groups = [...new Set(list.map(craftGroupOf))];
      if (craftGroup !== 'all' && !groups.includes(craftGroup)) craftGroup = 'all';
      groupHtml = `<nav class="work-groups" aria-label="配方分类"><span class="work-groups-title">分类</span>${['all', ...groups].map(g => `<button class="work-group ${craftGroup === g ? 'active' : ''}" data-craftgroup="${g}">${CRAFT_GROUP_NAMES[g]}</button>`).join('')}</nav>`;
      const visibleList = craftGroup === 'all' ? list : list.filter(r => craftGroupOf(r) === craftGroup);
      // 晾肉架的状态行（空着 / 晾晒中 / 晾透了）
      // 作者 2026-09-24："把晾肉干和晾肉架显示放到一起" —— 以前它固定挂在列表最下面，
      // 跟「晾肉干」那条配方隔着好几行。现在紧跟在那条配方后面输出。
      let rackRowShown = false;
      const rackRow = () => {
        if (!(craftTab === 'furniture' && stationBuilt('rack'))) return '';
        rackRowShown = true;
        const d = Game.dryOf('rack');
        if (!d) {
          const r = Game.craftRecipe(RECIPES.find(x => x.id === 'r_rackmeat'));
          const chk = Game.canCraft(r);
          return `<div class="recipe-row"><b>晾肉架</b><span class="rcost">空着 · 放入兽肉×2、盐×2，晾满 20 小时得肉干×4</span><button class="mini-btn ${chk.ok ? '' : 'lockedb'}" data-recipe="r_rackmeat" ${chk.ok ? '' : `data-reason="${esc(chk.reason)}"`}>开始晾肉</button></div>`;
        }
        const left = Game.dryLeftMin('rack');
        if (left > 0) return `<div class="recipe-row"><b>晾晒中</b><span class="rcost">还要 ${Game.fmtLeft(left)}（这期间架子占着，晾不了别的）</span><button class="mini-btn lockedb" data-dry="1" data-reason="还没晾透，还要 ${Game.fmtLeft(left)}">晾晒中</button></div>`;
        return `<div class="recipe-row"><b>晾透了！</b><span class="rcost">${Object.keys(d.out).map(k => `${ITEMS[k].name}×${d.out[k]}`).join('、')}</span><button class="mini-btn" data-dry="1">取下来</button></div>`;
      };
      for (const r of visibleList) {
        any = true;
        const chk = Game.canCraft(r);
        const hasIt = Game.materialCount(Object.keys(r.out)[0]) > 0;
        // 作者 2026-09-24："制造中每个物品的框也缩小一点点，比如把产物放到名称右侧"
        // → 原来「产出」单独占一行，现在并到名称右边，每张卡少一行（手机上尤其明显）。
        const outTxt = Object.entries(r.out).map(([k,v]) => `${ITEMS[k].name}×${v}`).join('、');
        html += `<div class="recipe ${chk.ok ? '' : 'locked'}">
          <span class="recipe-artwork">${Object.keys(r.out).map(id=>itemIcon(id)).join('')}</span><div class="recipe-info"><div class="recipe-name">${r.name}<span class="recipe-out">产出：${outTxt}</span>${hasIt ? `<span class="owned">×${Game.materialCount(Object.keys(r.out)[0])}</span>` : ''}</div>
          <div class="recipe-mats mats-line">材料：${Object.entries(Game.craftIn(r)).map(([k,v]) => `${ITEMS[k].name} ${Game.materialCount(k)}/${v}`).join(' · ')}</div>
          ${r.id === 'r_plank' ? `<div class="recipe-mats">${r.processingTool ? ITEMS[r.processingTool].name : '基础加工'} · 4 → ${r.out.plank}</div>` : ''}
          ${r.out.lotusPill ? `<div class="recipe-mats mats-line">本局已炼 ${S().lotusMade || 0}/3</div>` : ''}
          ${r.permLimit ? `<div class="recipe-mats mats-line">本局已炼 ${(S().permMade && S().permMade[Object.keys(r.out)[0]]) || 0}/${r.permLimit}；服用不限次数</div>` : ''}
          ${r.uniqueItem ? `<div class="recipe-mats mats-line">限时活动 26.9.15-26.9.30 · 活动结束后不能再造（已做出的永久可用）</div>` : ''}
          </div><div class="recipe-actions">
            <button class="mini-btn ${chk.ok ? '' : 'lockedb'}" data-recipe="${r.id}" ${chk.ok ? '' : `data-reason="${esc(chk.reason)}"`}>制作${r.hang ? `（挂 ${r.time} 分）` : ` ${Game.craftMinutes(r)}分`}</button>
            ${!r.hang && !r.uniqueItem && !r.permLimit ? `<button class="mini-btn" data-craftbatch="${r.id}" ${chk.ok ? "" : "disabled"}>批量</button>` : ""}
          </div>
          ${chk.ok ? '' : `<div class="recipe-lock">${chk.reason}</div>`}
        </div>`;
        if (r.station === 'rack') html += rackRow();
      }
      if (!any) html += '<div class="hint">这里没有可做的配方。</div>';
      // 兜底：如果这个分类下没有 rack 配方（比如配方被图纸门槛挡掉了），架子状态仍然要显示
      if (!rackRowShown && (craftGroup === 'all' || craftGroup === 'food')) html += rackRow();
    }
    html += '</div></div></div>';
    const title = '制 造 <button class="helpbtn work-help" data-crafthelp="1" aria-label="制作说明" title="制作说明">?</button>';
    body = body.replace('<div class="work-content">', groupHtml + '<div class="work-content">');
    return layoutWorkModal(playerPanelTabs('craft'), body + html, '<button class="helpbtn work-help" data-crafthelp="1">?</button>');
  }
  function stationBuilt(sid) {
    const st = S();
    if (sid === 'pearlWork' || sid === 'sourceForge' || sid === 'repair') return !!(st.atlantis && st.atlantis.camp && st.atlantis.camp.furniture && st.atlantis.camp.furniture[sid]);
    const map = {
      work1: ['wb1','wb2','wb3'], work2: ['wb2','wb3'], work3: ['wb3'],
      tailor: ['tailor','spin','loom'],
      furn1: ['fr1','fr2','fr3'], furn2: ['fr2','fr3'], furn3: ['fr3'],
      smoke1: ['sm1','sm2'], smoke2: ['sm2'],
      spin: ['spin'], loom: ['loom'], mortar: ['mortar'], medPot: ['medPot'], rack: ['rack'], tannery: ['tannery'],
      stove: ['stove'], fire: ['fire'], none: ['none'], pot: ['stove'],
      med: ['mortar','medPot','stove'],   // 家具 id：研钵 / 药炉 / 灶台（提神茶在灶台）
      furniture: ['rack','tannery'],
    };
    if (sid === 'tailor') return Game.tailorGifted() || !!st.furniture.spin || !!st.furniture.loom;   // 含旧档赠送（flags.tailorGift）
    const ids = map[sid] || [];
    return ids.includes('none') || ids.some(id => st.furniture[id]);
  }
  function stationFamily(sid) {
    if (sid === 'none') return ['none'];
    if (sid === 'work1') return ['work1','work2','work3'];
    if (sid === 'tailor') return ['tailor','spin','loom'];
    if (sid === 'furn1') return ['furn1','furn2','furn3'];
    if (sid === 'smoke1') return ['smoke1','smoke2'];
    if (sid === 'fire') return ['fire','stove','smoke1','smoke2'];
    if (sid === 'med') return ['mortar','medPot','pot'];   // 药品：草药膏/解毒剂/淬毒剂/不死丹/蓝牛/提神茶
    if (sid === 'furniture') return ['rack','tannery'];
    return [sid];
  }

  // ---------- 背包 ----------
  let invCat = 'all', warehouseCat='all';
  function catOf(cat) {
    if (cat === 'food' || cat === 'drink') return 'food';
    if (cat === 'bp') return 'bp';
    if (cat === 'mat' || cat === 'seed') return 'mat';
    if (cat === 'tool') return 'tool';
    if (cat === 'weapon' || cat === 'armor' || cat === 'cloth') return 'gear';
    if (cat === 'med') return 'med';
    return 'other';
  }
  function renderInventory(isWarehouse=false, paneOnly=false) {
    const isCellar=isWarehouse==='cellar';
    const st = S();
    const CATS = [['all','全部'],['food','食物'],['mat','材料'],['tool','工具'],['gear','作战'],['med','药品'],['bp','图纸'],['other','特殊']];
    const w=isCellar?Game.cellarState():isWarehouse?Game.warehouseState():null,inventory=w?w.inv:st.inv,category=isCellar?'all':isWarehouse?warehouseCat:invCat;
    const records=id=>w?(isCellar?S().cellar:Game.atlantisCamp&&w.site==='sea'?Game.atlantisCamp().warehouse:S().warehouse)?.items.filter(x=>x.id===id)||[]:[];
    const durAt=(id,i=0)=>w?(records(id)[i]?.dur??null):Game.durOf(id,i),maxAt=(id,i=0)=>w?(records(id)[i]?.maxDur||DURA[id]):Game.durMaxOf(id,i);
    let ids=Object.keys(inventory);
    if (category === 'tool') ids = ids.filter(id => catOf(ITEMS[id].cat) === 'tool' || !!(ITEMS[id] && ITEMS[id].tool));   // 匕首这类"能当工具使"的也归到工具页
    else if (category !== 'all') ids = ids.filter(id => catOf(ITEMS[id].cat) === category);
    let html = `<div class="work-side inventory-side"><div class="inventory-categories">` + (isCellar?[['all','食物储藏']]:CATS).map(([k,n])=>`<button class="tab ${category===k?'active':''}" data-invcat="${k}" data-invsource="${isWarehouse?'warehouse':'bag'}">${n}</button>`).join('') + `</div>${isCellar?'<div class="inventory-actions"><button class="tab" data-cellar-deposit>存入食物</button><button class="tab" data-bag-open>背包</button></div>':isWarehouse?'<div class="inventory-actions"><button class="tab" data-warehouse-auto><span>自动</span><span>存入</span></button></div>':''}</div><div class="work-content"><div class="work-scroll"><div class="inv-grid">`;
    if (!isWarehouse && Game.loadPenalty().excess>0) html += `<div class="inventory-overload" style="grid-column:1/-1">带了过多的物品，移动体力消耗增加${Game.loadPenalty().percent}%。</div>`;
    if (!ids.length) html += '<div class="hint">这个分类下没有物品。</div>';
    for (const id of ids) {
      const it = ITEMS[id];
      const q = inventory[id];
      const eq = (!isWarehouse && (st.equipment.weapon === id || st.equipment.weapon2 === id || st.equipment.armor === id || st.equipment.cloth === id || st.equipment.accessory === id)) ? ' equiped' : '';
      const dr = durAt(id);
      let bar = '';
      if (dr !== null) bar = `<span class="inv-dur"><i style="width:${Math.round(dr / maxAt(id) * 100)}%"></i></span>`;
      else if (it.spoil) { const exp = isWarehouse?Math.min(...records(id).map(x=>x.expiry??Infinity)):st.foodExp && st.foodExp[id]; const shelf = it.spoil * 2 * (isCellar?3:1) * (st.furniture && st.furniture.rack && (id === 'meat' || id === 'fish') ? 1.5 : 1); const fr = exp !== undefined ? Math.max(0, Math.min(1, (exp - (st.tick || 0)) / (shelf * 60))) : 1; bar = `<span class="inv-dur"><i class="fresh" style="width:${Math.round(fr * 100)}%"></i></span>`; }
      const cur = it.cat === 'currency';   // 货币单独显示卡片，不计背包容量
      const tierCls = cur ? '' : (q > 100 ? ' st-5' : q > 80 ? ' st-4' : q > 60 ? ' st-3' : q > 40 ? ' st-2' : q > 20 ? ' st-1' : '');
      const span = 1;   // 货币/工具装备不跨格；可堆叠仅60+占两格
      if (it.stack === 1 && q > 1) {
        // 不可堆叠（工具/武器/装备）：每件单独占一格，各显示耐久
        for (let i = 0; i < q; i++) {
          const d = durAt(id,i);
          const db = DURA[id] !== undefined ? `<span class="inv-dur"><i style="width:${Math.round((d||0) / maxAt(id,i) * 100)}%"></i></span>` : '';
          html += `<button class="inv-item${eq}" ${isCellar?'data-cellar-item':isWarehouse?'data-warehouse-item':'data-item'}="${id}">${itemIcon(id)}<span class="inv-name">${it.cat === 'weapon' ? Game.wNameOf(id) : it.name}</span>${db}<span class="inv-qty">1</span></button>`;
        }
      } else {
        html += `<button class="inv-item${eq}${tierCls}" ${isCellar?'data-cellar-item':isWarehouse?'data-warehouse-item':'data-item'}="${id}" ${span > 1 ? `style="grid-column:span ${span}"` : ''}>${itemIcon(id)}<span class="inv-name">${it.cat === 'weapon' ? Game.wNameOf(id) : it.name}</span>${bar}<span class="inv-qty">${q}</span></button>`;
      }
    }
    html += '</div></div></div>';
    if(isCellar)html=html.replace('<div class="inv-grid">','<p class="hint">独立20格 · 腐坏速度为三分之一</p><div class="inv-grid">');
    if(paneOnly)return html;
    if(isWarehouse&&!isCellar) {
      const head=`<div class="inventory-dual-head"><div class="warehouse-heading"><button data-bag-open>背包 ${Game.capUsed()}/${Game.capacity()}</button><button data-transfer-help aria-label="存取操作说明">↔</button></div><div class="warehouse-heading"><b>仓库 ${w.used}/${w.capacity}</b><span class="warehouse-heading-actions"><button data-auto-help aria-label="自动存入说明">?</button></span></div></div>`;
      const body=`<div class="inventory-dual"><section class="inventory-pane" aria-label="背包"><div class="inventory-pane-body">${renderInventory(false,true)}</div></section><section class="inventory-pane" aria-label="${w.site==='sea'?'海底':'营地'}仓库"><div class="inventory-pane-body">${!w.capacity?'<p class="hint">请先建造储物箱。</p>':''}${html}</div></section></div>`;
      return layoutWorkModal(head,body);
    }
    const title=isCellar?`地窖（${w.used}/20格）`:playerPanelTabs('inv');
    return layoutWorkModal(title,html);
  }
  let equipTab = 'p1';
  function warehouseModal() {return renderInventory(true);}
  function showBuffInfo(title,text) {
    if(!battleView){showModal('buffInfo',{title,text});return;}
    document.querySelector('#battle-buff-info')?.remove();
    const panel=el('div','battle-buff-popup','');panel.id='battle-buff-info';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',title);
    panel.innerHTML='<div class="battle-buff-card">'+buffInfoModal({title,text})+'</div>';const previousFocus=document.activeElement;const close=()=>{panel.remove();previousFocus?.focus();};panel.querySelector('button').onclick=close;panel.onclick=e=>{if(e.target===panel)close();};panel.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape')close();if(e.key==='Tab'){e.preventDefault();panel.querySelector('button').focus();}};document.body.appendChild(panel);panel.querySelector('button').focus();
  }
  function buffInfoModal(cfg) {return `<div class="modal-title">${esc(cfg.title)}</div><div class="overlay-text">${esc(cfg.text).replace(/\n/g,'<br>')}</div><div class="modal-actions"><button id="modal-close">知道了</button></div>`;}
  function equipmentNumbers(id,idx=0) {
    const it=ITEMS[id];if(!it)return '';
    const parts=[];if(it.atk)parts.push('攻'+it.atk);if(it.def)parts.push('防'+it.def);if(it.spd)parts.push('速'+it.spd);if(it.warm)parts.push('暖'+it.warm);if(it.block)parts.push('格挡'+Math.round(it.block*100)+'%');if(it.hitHeal)parts.push('受击回血'+it.hitHeal);if(it.hp)parts.push('生命上限+'+it.hp);for(const [k,n]of [['crit','暴击'],['dodge','闪避'],['acc','命中']])if(it[k])parts.push(n+'+'+Math.round(it[k]*100)+'%');if(id==='thruster')parts.push('海底移动消耗减半');
    if(DURA[id]!==undefined)parts.push('耐久 '+Game.durOf(id,idx)+'/'+Game.durMaxOf(id,idx));
    return parts.join(' · ');
  }
  function loadoutOverview(st) {
    let html='<div class="loadout-overview"><div class="loadout-upper"><div class="loadout-gear">';
    for(const [k,n]of [['weapon','主手'],['weapon2','副手'],['armor','护甲'],['cloth','衣物'],['accessory','饰品']]) {
      const id=st.equipment[k],idx=st.equipIdx?.[k]||0,d=id?Game.durOf(id,idx):null;
      html+=`<div class="equip-slot-row loadout-row" data-equipped-slot="${k}" data-eqpick="${k}" role="button" tabindex="0"><b>${n}</b><span class="equip-val">${id?itemIcon(id):'<span class="item-icon slot-empty-icon"></span>'}<span class="equip-txt">${id?esc(Game.wNameOf(id)):k==='weapon2'&&ITEMS[st.equipment.weapon]?.twoHand?'双手占用':'未装备'}</span>${id?`<small class="equip-dur">${equipmentNumbers(id,idx)}</small>`:''}${id?`<button class="mini-btn" data-unequip-slot="${k}">卸下</button>`:''}<button class="mini-btn equip-swap" data-eqpick="${k}">更换</button></span></div>`;
    }
    html+=`</div><div class="equip-card-space loadout-card"><figure class="equip-portrait"><img src="${portraitPath(st.identity)}" alt="人物头像" data-portrait="${st.identity}" onerror="__portraitFail(this,'${st.identity}')"></figure></div></div><div class="loadout-label">工具与背包 <small>点击槽位更换</small></div><div class="loadout-tools">`;
    for(let i=0;i<3;i++){const id=st.toolkit?.[i],d=id?Game.durOf(id):null;html+=`<button class="loadout-slot" data-eqpick="tool">${id?itemIcon(id):'<span class="item-icon">＋</span>'}<b>${id?ITEMS[id].name:'工具槽'}</b><small>${d===null?'未装备':d+'/'+Game.durMaxOf(id)}</small></button>`;}
    const pack=st.backpack&&Game.invCount(st.backpack)>0?st.backpack:null;
    html+=`<button class="loadout-slot backpack-slot" data-eqpick="pack">${pack?itemIcon(pack):'<span class="item-icon">＋</span>'}<b>${pack?ITEMS[pack].name:'背包槽'}</b><small>${pack?'容量 +'+ITEMS[pack].packCapacity:'装上才生效'}</small></button></div><div class="loadout-label">神物</div><div class="loadout-relics">`;
    for(let i=0;i<3;i++){const id=st.relicEquip?.[i],locked=i>=(st.relicSlots||0);html+=`<button class="loadout-slot ${locked?'locked':''}" ${locked?`data-unlockslot="${i}"`:'data-eqpick="relic"'} ${id==='satchel'?'data-satchel-settings':''}>${locked?'<span class="item-icon">◇</span>':id?itemIcon(id):'<span class="item-icon">＋</span>'}<b>${locked?'未解锁':id?RELICS[id].name:'神物槽'}</b><small>${locked?Game.relicSlotCost(i)+'金币':''}</small></button>`;}
    html+='</div></div>';return html;
  }
  function equipmentPickModal(cfg={}) {
    const kind=cfg.kind||'weapon',st=S(),names={weapon:'主手武器',weapon2:'副手武器',armor:'护甲',cloth:'衣物',accessory:'饰品',tool:'工具',pack:'背包',relic:'神物'};
    let html=`<div class="modal-title">更换${names[kind]||'装备'}</div><div class="inv-grid equipment-picker">`;
    const ids=kind==='relic'?st.relics||[]:Object.keys(st.inv).filter(id=>{const it=ITEMS[id];if(!it)return false;if(kind==='pack')return !!it.packCapacity;if(kind==='tool')return !!it.tool;return kind==='weapon'?it.cat==='weapon'&&!it.ammo:kind==='weapon2'?['weapon','shield'].includes(it.cat)&&!it.ammo&&!it.twoHand:it.cat===kind;});
    for(const id of ids){const it=ITEMS[id]||RELICS[id],qty=kind==='relic'?1:st.inv[id];for(let i=0;i<(kind==='weapon'||kind==='weapon2'||['armor','cloth','accessory'].includes(kind)?qty:1);i++){const action=kind==='pack'?`data-pack="${id}"`:kind==='tool'?`data-equiptool="${id}"`:kind==='relic'?`data-equiprelic="${id}" ${id==='satchel'?'data-satchel-settings':''}`:`data-equip="${id}" data-idx="${i}" data-target-slot="${kind}"`;html+=`<button class="inv-item" ${action}>${itemIcon(id)}<span class="inv-name">${esc(it.name)}</span><small>${kind==='pack'?'容量 +'+it.packCapacity+(it.remoteWarehouse?' · 外出存仓':''):kind==='relic'?esc(it.desc||''):equipmentNumbers(id,i)}</small></button>`;}}
    if(!ids.length)html+='<div class="hint">背包里没有适合此槽位的物品。</div>';
    html+=`</div><div class="modal-actions ${kind==='tool'||kind==='pack'?'equipment-picker-actions':''}">`;
    if(kind==='pack'&&st.backpack)html+='<button data-unpack>卸下背包</button>';
    if(kind==='tool')for(const id of (st.toolkit||[]).filter(Boolean))html+=`<button data-unequiptool="${id}">卸下${ITEMS[id].name}</button>`;
    if(kind==='relic')for(const id of (st.relicEquip||[]).filter(Boolean))html+=`<button data-unequip="${id}">卸下${RELICS[id].name}</button>`;
    return html+'<button data-loadout-back>返回装备</button></div>';
  }
  function renderEquip() {
    const st = S();
    const tabs = [['p1','装备'],['skill','技能'],['attr','属性']];
    let html = `<div class="work-side">${tabs.map(([k,l]) => `<button class="tab ${equipTab === k ? 'active' : ''}" data-equiptab="${k}">${l}</button>`).join('')}</div><div class="work-content"><div class="work-scroll">`;
    if (equipTab === 'p1') {
      html += loadoutOverview(st);
    } else if (equipTab === 'skill') {
      html += '<div class="modal-title" style="margin-top:10px">技能 <span style="font-size:11px">制造／采集／战斗 · 消耗经验手动升级</span></div>' + skillBody();
    } else if (equipTab === 'attr') {
      const st = S();
      const cs = Game.charStats();
      const dw = st.equipment.weapon ? ITEMS[st.equipment.weapon] : null;
      const d2 = st.equipment.weapon2 ? ITEMS[st.equipment.weapon2] : null;
      const wline = (dw ? `${dw.glyph} ${Game.wNameOf(st.equipment.weapon)}` : '未装备') + (d2 && d2.cat !== 'shield' ? ` + ${d2.glyph} ${Game.wNameOf(st.equipment.weapon2)}` : '') + (d2 && d2.cat === 'shield' ? ` + ${d2.glyph} ${d2.name}(盾)` : '');
      html += '<div class="modal-title" style="margin-top:10px">人物属性 <span style="font-size:11px">c（a+b）· a 人物攻击 / b 武器加成 / c 当前攻击</span></div><div class="attr-wrap"><div class="attr-left"><div class="help-list">';
      const row = (k, v) => `<div class="help-item"><b>${k}</b><span>${v}</span></div>`;
      html += row('主手武器', wline);
      html += row('攻击力', `${cs.c}（${cs.a}+${cs.b}）`);
      html += row('防御力', cs.def);
      // 属性页只展示攻速数值；规则集中在简化后的战斗帮助。
      {
        const s = cs.spd;
        html += row('攻速', s);
      }
      html += row('格挡率', cs.block + '%');
      html += row('生命值', `${cs.hp}/${cs.maxhp}`);
      html += row('健康值', `${Game.healthValue()}/100${st.statuses.infection?' · 感染':''}`);
      // 作者2026-10-06要求移除体力括号说明，仅保留当前值与上限。
      html += row('体力', `${cs.stam}/${cs.maxstam}`);
      const spNow = Math.round(st.stats.spirit);
      const spNote = spNow >= 50 ? '体力上限 100%' : (spNow >= 20 ? '体力上限 -10%' : '体力上限 -20%，采集耗时 +10%');
      html += row('精神', `${spNow}/100（${spNote}）`);
      html += row('护甲', cs.armor);
      html += row('衣物·保暖', cs.cloth + `（暖${st.equipment.cloth && ITEMS[st.equipment.cloth].warm ? ITEMS[st.equipment.cloth].warm : 0}）`);
      const t = Game.temperatureInfo();
      html += row('环境温度', `${t.environment}℃（天气 ${t.weather}℃，因地点而变化）`);
      html += row('自身温度', `${t.body.toFixed(1)}℃（${t.state === 'cold' ? '过冷' : t.state === 'heat' ? '过热' : '舒适'}${t.suitThermal ? `，潜水服隔温 +${t.suitThermal.toFixed(1)}℃` : ''}${t.grace && t.state !== 'normal' ? `，换衣缓冲 ${t.grace} 分` : t.state !== 'normal' ? `，命中 -10%，每小时 -${t.state === 'cold' ? 5 : 3} 生命` : ''}）`);
      html += row('战斗中', `磨刀 ${S().weaponSharpen ? '生效中(剩'+S().weaponSharpen.fights+'场)' : '无'} · 武器命名+${(S().weaponNames && S().weaponNames[st.equipment.weapon] && S().weaponNames[st.equipment.weapon].bonus) || 0}`);
      // 水壶系：没建就**整条不显示**（玩家反馈"未装备水壶"这行看不懂，以为是装备格）；
      // 建了就写清楚效果；加装滤雨器也照样算有水壶（-20% 一直在）。
      if (cs.tank || st.furniture.rainfilter) {
        html += row('水壶', st.furniture.rainfilter ? `已建 + 滤雨器（口渴 -20%，储水 ${Math.max(0, Number(st.rainWater) || 0)}/20；营地手动取水）` : '已建（口渴消耗 -20%）');
      }
      html += '</div></div>';
      // 结局「结算」入口：人物立绘下方（作者 2026-09-23 从右下角搬过来）。
      // 没有可结算的结局时整块不出现，立绘下面保持干净。
      const sa = settleActions();
      html += `<div class="attr-right"><img class="attr-portrait" src="${portraitPath(st.identity || '')}" alt="" onerror="__portraitFail(this,'${st.identity || ''}')"><div class="attr-char">${(IDENTITIES[st.identity] || {}).name || ''}</div>`;
      if (sa.length) {
        html += '<div class="attr-settle"><div class="attr-settle-title">本局结局</div>'
          + sa.map(a => `<button class="mini-btn attr-settle-btn" data-settle="${esc(a.id.slice(7))}" title="${esc(a.desc)}">${esc(a.name)}</button>`).join('')
          + '<div class="attr-settle-note">一个存档只能结算一个结局；结算后本局照样能继续玩。</div></div>';
      }
      html += '</div>';
      html += '</div>';
    }
    html += '</div></div>';
    const title = '装备 <button class="helpbtn work-help" data-helprules="1" aria-label="战斗规则" title="战斗规则">?</button>';
    return layoutWorkModal(playerPanelTabs('equip'), html, '<button class="helpbtn work-help" data-helprules="1">?</button>');
  }
  function bindCellarControls(m){for(const dir of ['store','take'])m.querySelectorAll('[data-cellar-'+dir+']').forEach(b=>{const id=b.dataset[dir==='store'?'cellarStore':'cellarTake'],deposit=dir==='store';bindPress(b,()=>{const n=b.dataset.all?Game.cellarState().inv[id]:1,r=Game.transferCellar(id,n,deposit);centerToast(r.ok?(deposit?'存入':'取出')+ITEMS[id].name+'×'+r.moved:r.reason);if(r.ok)showModal('cellar');},start=>{showModal('batchn',{kind:'cellar',item:id,dir:deposit?'in':'out'});dragTransferQuantity(start);});});}
  function freshnessCards(id,fromWarehouse=false) {
    if(!ITEMS[id].spoil)return '';
    const rows=fromWarehouse?((fromWarehouse==='cellar'?S().cellar:(Game.warehouseSite()==='sea'?Game.atlantisCamp():S()).warehouse)?.items||[]).filter(x=>x.id===id).map(x=>({qty:x.qty,minutes:Number.isFinite(x.expiry)?Math.max(0,x.expiry-(S().tick||0)):null})):Game.foodFreshness(id);
    const groups=new Map();for(const r of rows)groups.set(r.minutes,(groups.get(r.minutes)||0)+r.qty);
    const fmt=m=>m===null?'保鲜时间未知':m<=0?'已腐坏':m>=1440?Math.floor(m/1440)+'天'+Math.floor(m%1440/60)+'小时':m>=60?Math.floor(m/60)+'小时'+Math.ceil(m%60)+'分钟':Math.ceil(m)+'分钟';
    return '<div class="freshness-batches" aria-label="保鲜批次">'+[...groups].sort((a,b)=>(a[0]??Infinity)-(b[0]??Infinity)).map(([m,n])=>'<div class="freshness-batch" data-qty="'+n+'" data-minutes="'+m+'">'+itemIcon(id)+'<b>×'+n+'</b><small>'+fmt(m)+'</small></div>').join('')+'</div><p class="hint">先使用最早腐坏的批次。</p>';
  }
  function itemUseButtons(id,source=false) {
    if(Game.itemUseCount(id,source)<1)return '';
    const it=ITEMS[id],btns=[];
    if (it.cat !== 'med' && (it.food || it.water || it.cat === 'food' || it.cat === 'drink' || it.curePoison || it.stopBleed)) btns.push(`<button data-use="${id}">${it.cat === 'drink' ? '饮用' : (it.curePoison ? '服用' : '食用')}（${it.food ? `+${it.food}饱 ` : ''}${it.water ? `+${it.water}水 ` : ''}${it.heal ? `+${it.heal}命 ` : ''}${it.spirit ? `+${it.spirit}神 ` : ''}${it.sta ? `+${it.sta}体力 ` : ''}${it.curePoison ? '解毒 ' : ''}）</button>`);
    if (it.cat === 'med') {
      const eff = [it.healthRestore ? `+${it.healthRestore}健康` : null, it.cureInfection ? '治疗感染' : null, it.heal ? `+${it.heal}命` : null, it.sta ? `+${it.sta}体力` : null, it.water ? `+${it.water}水` : null,
        it.spirit ? `${it.spirit > 0 ? '+' : ''}${it.spirit}神` : null, it.stopBleed ? '止血' : null, it.curePoison ? '解毒' : null].filter(Boolean).join(' · ');
      btns.push(`<button data-med="${id}">使用${eff ? `（${eff}）` : ''}</button>`);
    }

    return btns.join('');
  }
  function itemDetail(id,fromWarehouse=false) {
    const st = S();
    const it = ITEMS[id];
    if(fromWarehouse==='cellar'){const n=Game.cellarState().inv[id]||0;return '<div class="modal-title">'+itemIcon(id)+esc(it.name)+' ×'+n+'</div><p>'+esc(it.desc||'')+'</p>'+freshnessCards(id,'cellar')+'<p class="hint">显示在地窖中可保存的时间，取出后恢复普通腐坏速度。</p><div class="modal-actions item-actions">'+itemUseButtons(id,'cellar')+'<button data-cellar-take="'+id+'">取出</button><button data-cellar-take="'+id+'" data-all="1">全部取出</button></div>';}
    if(fromWarehouse){const w=Game.warehouseState(),n=w.inv[id]||0,rows=(w.site==='sea'?Game.atlantisCamp().warehouse:S().warehouse)?.items.filter(x=>x.id===id)||[];return '<div class="modal-title">'+itemIcon(id)+esc(it.name)+' ×'+n+'</div><p>'+esc(it.desc||'')+'</p>'+freshnessCards(id,true)+(rows[0]?.dur!==undefined?'<p>耐久 '+rows[0].dur+'/'+rows[0].maxDur+'</p>':'')+'<div class="modal-actions item-actions">'+itemUseButtons(id,true)+(it.cat==='bp'?'<button data-learn="'+id+'" '+(st.learnedBlueprints?.[id]?'disabled':'')+'>'+(st.learnedBlueprints?.[id]?'已学会':'学习')+'</button>':'')+'<button data-ware-transfer="'+id+'" data-dir="out" data-qty="1">取出</button>'+(n>1?'<button data-ware-transfer="'+id+'" data-dir="out" data-qty="all">全部取出</button>':'')+'</div>';}

    let btns = [];
    if(Game.cellarAccess()&&['food','drink'].includes(it.cat))btns.push('<button data-cellar-store="'+id+'">存入地窖</button>');
    if(Game.warehouseDepositAccess()&&Game.warehouseCapacity()>0&&Game.warehouseDepositCount(id)>0)btns.push('<button data-ware-transfer="'+id+'" data-dir="in" data-qty="1">存入</button>'+(Game.warehouseDepositCount(id)>1?'<button data-ware-transfer="'+id+'" data-dir="in" data-qty="all">全部存入</button>':''));
    btns.push(itemUseButtons(id));
    if (it.coatPoison) btns.push(`<button disabled>战斗中使用 · 淬毒</button>`);
    if (it.cat === 'weapon' || it.cat === 'armor' || it.cat === 'cloth') btns.push(`<button data-equip="${id}">${(st.equipment.weapon === id || st.equipment.armor === id || st.equipment.cloth === id) ? '已装备' : '装备'}</button>`);
    if (it.cat === 'seed') btns.push(`<button data-plant="${id}">去耕地播种</button>`);
    if(it.cat==='bp')btns.push(`<button data-learn="${id}" ${st.learnedBlueprints?.[id]?'disabled':''}>${st.learnedBlueprints?.[id]?'已学会':'学习'}</button>`);

    // 限定 · 神弓：详情页里给一个"存入邮箱（跨局）"的入口
    if (id === 'divineBow') {
      btns.push(`<button data-storebow="1">存入一把到邮箱（跨局）</button>`);
    }
    // 保鲜：显示真实剩余时间
    let spoilLine = '';
    const durNow = Game.durOf(id);
    if (durNow !== null) {
      const n = st.inv[id] || 1;
      if (n > 1) {   // 同名多件：逐件列出，避免"看起来都在掉"
        const shown = [];
        for (let i = 0; i < Math.min(n, 6); i++) shown.push(`${Game.durOf(id, i)}/${Game.durMaxOf(id, i)}`);
        spoilLine = `耐久（${n} 件）：${shown.join('、')}${n > 6 ? ' …' : ''}`;
      } else spoilLine = `耐久：${durNow} / ${Game.durMaxOf(id)}`;
    }
    return `<div class="modal-title">${it.glyph} ${it.name} ×${st.inv[id]}</div>
      <div class="item-desc">${it.desc}</div>
      ${it.spoil?freshnessCards(id):spoilLine?`<div class="item-desc warn-text">${spoilLine}</div>`:''}
      ${it.cat === 'accessory' && DURA[id] !== undefined ? '<div class="item-desc">佩戴时属性生效；战斗中受伤会损耗 1 点耐久。</div>' : ''}
      ${it.atk ? `<div class="item-desc">攻击 ${it.atk}</div>` : ''}
      ${it.def ? `<div class="item-desc">防御 ${it.def}</div>` : ''}
      ${it.warm ? `<div class="item-desc">保暖 ${it.warm}</div>` : ''}
      <div class="modal-actions item-actions">${btns.join('')}</div>`;
  }

  // ---------- 交易 ----------
  let laoTab = 'buy';
  // 交易面板顶部的"钱包"：玩家反馈买卖时看不到自己身上有多少钱（老潮是最常被问的）
  function walletBar() {
    const s = S(); if (!s) return '';
    return `<div class="wallet-bar">贝壳币 <b>${Game.invCount('beibi')}</b> · 金币 <b>${Game.invCount('coin')}</b></div>`;
  }
  function laochaoModal() {
    const st = S();
    let html = `<div class="modal-title">老潮的货摊 <span style="font-size:12px">（第${st.day}天，22 点离港）</span></div>
     ${walletBar()}
     <div class="trader-row"><img class="trader-img" src="assets/img/laochao.png" onerror="this.style.display='none'" alt="老潮">
      <div class="trader-talk">"带什么来啦？对岸最近什么都缺，好货不愁卖。"</div></div>
      <div class="tabs">
        <button class="tab ${laoTab === 'buy' ? 'active' : ''}" data-ttab="buy">买他的货</button>
        <button class="tab ${laoTab === 'sell' ? 'active' : ''}" data-ttab="sell">卖给他</button>
        <button class="tab ${laoTab === 'comm' ? 'active' : ''}" data-ttab="comm">委托</button>
      </div><div id="trade-body">${laochaoTab(laoTab || 'buy')}</div>
      <div class="trader-row"></div>
      <div class="modal-actions"><button id="modal-close">离 开</button></div>`;
    return html;
  }
  function laochaoTab(tab) {
    const st = S();
    const day = st.day;
    if (tab === 'buy') {
      let html = '';
      if (!st.flags.firstTrade) {
        const have = Game.materialCount('smokedFish');
        html += `<div class="first-trade"><div><b>首单交换</b><small>熏鱼 ${have}/10</small></div>
          <span>盐×1 · 铁锭×4 · 萝卜种子×1</span>
          <button class="mini-btn" data-firsttrade="1" ${have >= 10 ? '' : 'disabled'}>交 换</button></div>`;
      }
      html += '<div class="trade-grid"><div class="trade-col"><b>货物</b></div><div class="trade-col"><b>价（贝壳）</b></div><div class="trade-col"><b>买</b></div></div>';

      for (const e of LAOCHAO.sell) {
        if (e.from > day) continue;
        const p = Game.priceOf(e.base, false, e.id);
        const cur = e.currency || 'beibi';
        const curName = cur === 'coin' ? '金币' : '贝壳';
        const afford = st.inv[cur] >= p;
        html += `<div class="trade-grid">
          <div class="trade-col">${ITEMS[e.id].glyph} ${ITEMS[e.id].name}${e.kind === 'bp' && Game.invCount(e.id) > 0 ? '（已有）' : ''}</div>
          <div class="trade-col">${p} ${curName}</div>
          <div class="trade-col"><button class="mini-btn" data-buy="${e.id}" data-currency="${cur}" ${afford && !(e.kind === 'bp' && Game.invCount(e.id) > 0) ? '' : 'disabled'}>购买</button></div>
        </div>`;
      }
      return html;
    }
    if (tab === 'sell') {
      let html = '<div class="trade-grid"><div class="trade-col"><b>他收</b></div><div class="trade-col"><b>收购价</b></div><div class="trade-col"><b>卖</b></div></div>';

      for (const e of LAOCHAO.buy) {
        const p = Game.priceOf(e.base, true, e.id);
        const have = Game.merchantSellCount(e.id,LAOCHAO.buy);
        html += `<div class="trade-grid">
          <div class="trade-col">${ITEMS[e.id].glyph} ${ITEMS[e.id].name}（有 ${have}）</div>
          <div class="trade-col">${p} 贝壳</div>
          <div class="trade-col"><button class="mini-btn" data-sell="${e.id}" ${have > 0 ? '' : 'disabled'}>卖出</button></div>
        </div>`;
      }
      // 兑换（贝壳 ⇄ 金币）：**和上面的出售行同一套样式/同一套操作**——点一下换 1 份、长按批量。
      //   作者 2026-09-25："贝壳换金币和金币换贝壳沿用前面的出售（除了他们的单价不会变），
      //   没有其他的说明，和前面一致的 ui，也没有单独批量，而是长按批量。"
      //   所以这里不再有说明文字、也没有单独的「全部」按钮（那套确认弹窗一起去掉了）。
      //   单价固定：汇率不吃行情七折，也不会随季节/声望变。
      const shellN = st.inv.beibi || 0, coinN = st.inv.coin || 0;
      html += `<div class="trade-grid">
        <div class="trade-col">${ITEMS.beibi.glyph} 贝壳换金币（有 ${shellN}）</div>
        <div class="trade-col">${Game.SHELL_PER_COIN} 贝壳</div>
        <div class="trade-col"><button class="mini-btn" data-exshell="1" ${shellN >= Game.SHELL_PER_COIN ? '' : 'disabled'}>卖出</button></div>
      </div>`;
      html += `<div class="trade-grid">
        <div class="trade-col">${ITEMS.coin.glyph} 金币换贝壳（有 ${coinN}）</div>
        <div class="trade-col">${Game.SHELL_FOR_COIN} 贝壳</div>
        <div class="trade-col"><button class="mini-btn" data-exgold="1" ${coinN >= 1 ? '' : 'disabled'}>卖出</button></div>
      </div>`;
      return html;
    }
    if (tab === 'comm') {
      let html = '';
      for (const c of Game.commissions()) {
        if (c.from > day) continue;
        const done = Game.commissionDone(c);
        const accepted = Game.commissionAccepted(c);
        const inWin = accepted !== undefined && st.day >= accepted && st.day <= accepted + 2;
        const needStr = c.type === 'kill' ? `击败 ${ENEMIES[c.target].name}` : Object.entries(c.need).map(([k,v]) => `${ITEMS[k].name} ${Game.materialCount(k)}/${v}`).join('、');
        const rewardStr = Object.entries(c.reward).map(([k,v]) => k === 'fame' ? `声望+${v}` : `${ITEMS[k].name}×${v}`).join('、');
        html += `<div class="mission ${done ? 'done' : ''}">
          <div class="mission-name">${c.name} ${done ? '✔' : ''}</div>
          <div class="mission-text">${c.text}</div>
          <div class="mission-need">需求：${needStr}</div>
          <div class="mission-reward">报酬：${rewardStr}</div>
          ${done ? '' : c.type === 'kill' && accepted === undefined ? `<button class="mini-btn" data-acceptc="${c.id}">接取（持续3天）</button>` : c.type === 'kill' && !inWin ? `<button class="mini-btn" data-acceptc="${c.id}">重新接取（持续3天）</button>` : `<button class="mini-btn" data-comm="${c.id}">交任务</button>`}
        </div>`;
      }
      return html || '<div class="hint">暂无委托。</div>';
    }
    return '';
  }

  // ⚠️ 记住当前在哪个摊位：买/卖之后 UI 会整块重建（showModal('town')），
  //    如果这里不记住，玩家在铁匠/情报贩子买一件东西就被弹回杂货商，得重新点一次摊位。
  let activeMerchant=null, merchantLine=0, merchantTrades=0;
  let townShopNow = 'grocer';
  function townModal() {
    const st = S();
    const fame = st.fame;
    // ⚠️ 摊位标签必须从 TOWN **派生**（作者 2026-09-25 问"对岸美食家确定实装了吗"）：
    //    这里原来硬编码三家 grocer/smith/informant —— 于是 2026-09-24 加进 data 的「美食家」
    //    在界面上**根本没有入口**（数据、图纸、配方全都在，玩家就是打不开这个摊子）。
    //    TOWN_ORDER 现在只决定**排队顺序**（和战斗道具那个 pri 列表同一个用法）：
    //    没写进这里的新摊位照样会出现，只是排在后面 —— 少写一个名字不会再有"数据在、玩家摸不到"。
    const TOWN_ORDER = ['grocer', 'smith', 'informant', 'gourmet'];
    const shopIds = Object.keys(TOWN).sort((a, b) =>
      ((TOWN_ORDER.indexOf(a) + 1) || 99) - ((TOWN_ORDER.indexOf(b) + 1) || 99));
    const shops = shopIds.map(id => [id, TOWN[id].name, TOWN[id].needFame || 0]);
    // 声望掉下去（读档/换档）时别停在锁着的摊位上
    if ((TOWN[townShopNow] || {}).needFame > fame) townShopNow = 'grocer';
    const tabHtml = shops.map(([id, name, need]) =>
      `<button class="tab ${id === townShopNow ? 'active' : ''} ${fame >= need ? '' : 'locked'}" data-shop="${id}">${name}${fame >= need ? '' : ' 🔒'}</button>`).join('');
    let html = `<div class="modal-title">盐镇集市 <span style="font-size:12px">（声望 ${Number(fame || 0).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}/5）</span></div>
      ${walletBar()}
      <div class="tabs">${tabHtml}</div><div id="trade-body">${townShop(townShopNow)}</div>
      <div class="modal-actions"><button id="modal-close">离 开</button></div>`;
    return html;
  }
  function townShop(shop) {
    const st = S();
    const sh = TOWN[shop];
    if (!sh) return '';
    if (sh.needFame > st.fame) return `<div class="hint">需要盐镇声望 ${sh.needFame}。</div>`;
    let html = `<div class="trade-grid"><div class="trade-col"><b>货</b></div><div class="trade-col"><b>价</b></div><div class="trade-col"><b>买</b></div></div>`;

    for (const e of sh.sell) {
      if (e.kind === 'bp' && Game.invCount(e.id) > 0) continue;
      const p = Game.priceOf(e.base, false, e.id);
      const cur = e.currency || 'beibi';
      const curName = cur === 'coin' ? '金币' : '贝壳';
      html += `<div class="trade-grid"><div class="trade-col">${ITEMS[e.id].glyph} ${ITEMS[e.id].name}</div><div class="trade-col">${p} ${curName}</div>
        <div class="trade-col"><button class="mini-btn" data-tbuy="${shop}:${e.id}" ${(st.inv[cur] || 0) >= p ? '' : 'disabled'}>买</button></div></div>`;
    }
    html += `<div class="trade-grid" style="margin-top:10px"><div class="trade-col"><b>他收</b></div><div class="trade-col"><b>价</b></div><div class="trade-col"><b>卖</b></div></div>`;
    for (const e of sh.buy) {
      const p = Game.priceOf(e.base, true, e.id);
      html += `<div class="trade-grid"><div class="trade-col">${ITEMS[e.id].glyph} ${ITEMS[e.id].name}（有 ${st.inv[e.id] || 0}）</div><div class="trade-col">${p} 贝壳</div>
        <div class="trade-col"><button class="mini-btn" data-tsell="${e.id}" ${(st.inv[e.id] || 0) > 0 ? '' : 'disabled'}>卖</button></div></div>`;
    }
    return html;
  }

  function blackModal() {
    const st = S();
    let html = `<div class="modal-title">黑市 · 独眼</div>
    ${walletBar()}

      <div class="trade-grid"><div class="trade-col"><b>货</b></div><div class="trade-col"><b>价</b></div><div class="trade-col"><b>买</b></div></div>`;

    for (const e of BLACKMARKET.sell) {
      if (e.kind === 'bp' && Game.invCount(e.id) > 0) continue;
      const p = Game.priceOf(e.base, false, e.id);
      html += `<div class="trade-grid"><div class="trade-col">${ITEMS[e.id].glyph} ${ITEMS[e.id].name}</div><div class="trade-col">${p} 贝壳</div>
        <div class="trade-col"><button class="mini-btn" data-bbuy="${e.id}" ${(st.inv.beibi || 0) >= p ? '' : 'disabled'}>买</button></div></div>`;
    }
    html += `<div class="trade-grid" style="margin-top:10px"><div class="trade-col"><b>他收</b></div><div class="trade-col"><b>价</b></div><div class="trade-col"><b>卖</b></div></div>`;
    for (const e of BLACKMARKET.buy) {
      const p = Game.priceOf(e.base, true, e.id);
      html += `<div class="trade-grid"><div class="trade-col">${ITEMS[e.id].glyph} ${ITEMS[e.id].name}（有 ${st.inv[e.id] || 0}）</div><div class="trade-col">${p} 贝壳</div>
        <div class="trade-col"><button class="mini-btn" data-bsell="${e.id}" ${(st.inv[e.id] || 0) > 0 ? '' : 'disabled'}>卖</button></div></div>`;
    }
    html += `<div class="modal-actions"><button id="modal-close">离 开</button></div>`;
    return html;
  }

  function missionModal() {
    const st = S();
    let html = `<div class="modal-title">告示板（老潮也代收委托）</div>`;
    for (const c of Game.commissions()) {
      if (c.from > st.day) continue;
      const done = Game.commissionDone(c);
      const needStr = c.type === 'kill' ? `击败 ${ENEMIES[c.target].name}` : Object.entries(c.need).map(([k,v]) => `${ITEMS[k].name} ${Game.materialCount(k)}/${v}`).join('、');
      const rewardStr = Object.entries(c.reward).map(([k,v]) => k === 'fame' ? `声望+${v}` : `${ITEMS[k].name}×${v}`).join('、');
      html += `<div class="mission ${done ? 'done' : ''}"><div class="mission-name">${c.name} ${done ? '✔' : ''}</div><div class="mission-text">${c.text}</div>
        <div class="mission-need">需求：${needStr}</div><div class="mission-reward">报酬：${rewardStr}</div>
        ${done ? '' : `<button class="mini-btn" data-comm="${c.id}">交任务</button>`}</div>`;
    }
    html += `<div class="modal-actions"><button id="modal-close">离 开</button></div>`;
    return html;
  }

  function infoModal() {
    const st = S();
    if (st.fame < 2) return `<div class="modal-title">酒馆</div>
      <div class="hint">情报贩子只跟有门路的人说话（需要盐镇声望 2，你现在是 ${st.fame}/5）。</div>
      <div class="hint">声望来自告示板的委托：兽皮订单（第 8 天）、珍珠委托（第 14 天）、剿灭海盗（第 20 天）、古生物收藏（第 22 天）。</div>
      <div class="modal-actions"><button id="modal-close">离 开</button></div>`;
    let html = `<div class="modal-title">酒馆 · 情报贩子</div>
      <div class="trader-talk">"回家的海图，一百五十金币。远洋船、还有下海那套装备的图纸，我这儿都有。玄铁那种脏东西？去沉船湾找独眼。"</div>
      <div class="trade-grid"><div class="trade-col"><b>情报</b></div><div class="trade-col"><b>价</b></div><div class="trade-col"><b>买</b></div></div>`;
    for (const e of TOWN.informant.sell) {
      if (e.kind === 'bp' && Game.invCount(e.id) > 0) continue;
      const p = Game.priceOf(e.base, false, e.id);
      const cur = e.currency || 'beibi';
      html += `<div class="trade-grid"><div class="trade-col">${ITEMS[e.id].name}${e.id === 'seachart' ? '（结局·归乡关键）' : ''}</div><div class="trade-col">${p} ${cur === 'coin' ? '金币' : '贝壳'}</div>
        <div class="trade-col"><button class="mini-btn" data-tbuy="informant:${e.id}" ${(st.inv[cur] || 0) >= p ? '' : 'disabled'}>买</button></div></div>`;
    }
    html += `<div class="hint">海图：能开往亚克兰蒂斯（需配潜水服与氧气罩），也是「结局·归乡」的必需品——远洋船 + 海图 + 3 箱补给。</div>`;
    html += `<div class="hint">金币从哪来？对岸遗迹的石门守卫、海域的海盗与海盗头目、山顶的石碑守卫都会掉；也可以用贝壳币跟老潮换些日用品周转。</div>`;
    html += `<div class="trader-talk warn-text">"听说……集齐三块石板，能读懂这座岛的过去。"</div>`;
    html += `<div class="modal-actions"><button id="modal-close">离 开</button></div>`;
    return html;
  }

  // ---------- 战斗 ----------
  let fightSeq = 0, battleView = null;
  // 战斗记录随存档保存；读档、同步或界面重建后必须同时恢复战场。
  function restoreCombatView() {
    const st=S();
    if(!st?.combat || st.death || st.ending)return false;
    if(!battleView || battleView.C!==st.combat || !$('.battle-board'))renderCombat('start',st.combat);
    return true;
  }
  document.addEventListener('keydown',event=>{
    const board=$('.battle-board');if(!battleView||!board)return;
    if(event.key==='Tab'){
      const buttons=[...board.querySelectorAll('button:not(:disabled)')].filter(b=>b.offsetHeight>0);
      if(!buttons.length){event.preventDefault();return;}
      const i=buttons.indexOf(document.activeElement),next=event.shiftKey?(i<=0?buttons.length-1:i-1):(i+1)%buttons.length;
      event.preventDefault();buttons[next].focus({preventScroll:true});
    }
    if(event.key==='Escape' && battleView.phase==='idle' && battleView.panel){event.preventDefault();battlePanel(null);}
  },true);
  function renderCombat(kind, C) {
    const m = $('#modal');
    if (kind === 'start') {
      fightSeq++;
      modal=null;
      modalOpenedAt=Date.now();
      Game.setTimeFreeze(false);
      battleView = { C, ids:new WeakMap(), next:0, selected:null, phase:'idle', panel:null,visual:null,pendingEnd:null };
      const en=C.enemy;
      if (en && en.boss) try{ AudioFX.setBoss(true); }catch(e){}
      else try{AudioFX.setCombat(true);}catch(e){}
      const art=$('#scene-img') || $('#map-img');
      m.classList.add('open'); document.body.classList.add('modal-open');
      dom.dispose(m);m.innerHTML=`<section class="modal-content combat-modal battle-board ${en.nightmare?'nightmare-fight':''}" style="--night-depth:${en.nightmare||0}" role="dialog" aria-modal="true" aria-label="战斗">
        <header class="battle-header"><div class="hp-line player-health"><span>生命</span><div class="hp-bar"><div id="php" class="hp-fill me"></div></div><span id="php-txt"></span></div><span id="battle-stamina"></span><b>${esc(en.name)}${en.boss?' · 首领':''}</b><span id="battle-round"></span><span id="battle-buffs"></span><span id="fight-status"></span><span id="battle-summary" role="status"></span></header>
        <div class="battle-field">${art?`<img class="battle-backdrop" src="${esc(art.currentSrc||art.src)}" alt="">`:''}<aside class="battle-journal"><header><b>战斗日志</b></header><div id="fight-log" class="fight-log" role="log"></div></aside><div id="fight-targets"></div><div id="battle-floats" aria-live="polite"></div><div id="battle-impact" class="battle-impact" aria-hidden="true"></div></div>
        <div id="fight-btns" class="fight-btns"></div><aside id="battle-panel" hidden></aside>
      </section>`;
      m.querySelector('.battle-board').addEventListener('click',battleClick);
      m.querySelector('.battle-board').addEventListener('keydown',e=>{if(e.repeat && (e.key==='Enter'||e.key===' '))e.preventDefault();});
      m.querySelector('.battle-board').tabIndex=-1;
      m.querySelector('.battle-board').focus({preventScroll:true});
      updateCombat(C); return;
    }
    if(kind==='update'){updateCombat(C);return;}
    if (kind === 'end') {
      if(!battleView)return;
      if(['resolving','presenting'].includes(battleView.phase)){battleView.pendingEnd=C;return;}
      try{ AudioFX.setBoss(false); }catch(e){}
      try{AudioFX.setCombat(false);}catch(e){}
      const finishedView=battleView;
      battleView.phase='ended';
      if(C && C.enemies)paintTargetRows(C.enemies);
      $('#php').style.width=Math.max(0,S().stats.hp/Game.hpMax()*100)+'%';
      $('#php-txt').textContent=`${S().stats.hp}/${Game.hpMax()}`;
      $('#battle-summary').textContent=C.win?'击败敌人':S().stats.hp<=0?'你倒下了':'战斗结束';
      $('#fight-btns').classList.add('over');
      $('#fight-btns').querySelectorAll('button').forEach(b=>b.disabled=true);
      const seq=fightSeq;
      setTimeout(()=>{if(seq!==fightSeq)return;try{AudioFX.play(C.win?'good':'danger');}catch(e){}
        document.querySelector('#battle-buff-info')?.remove();battleView=null;m.classList.remove('open');document.body.classList.remove('modal-open');dom.dispose(m);m.innerHTML='';render();
        if(finishedView.ending){pendingPanels=[];showEnding(finishedView.ending.id,finishedView.ending.reason);}
        else showNextPendingPanel();
      },1000);
    }
  }
  let mailTab = 'mail';
  // ---------- 设置面板（主界面和游戏内菜单共用） ----------
  // 赶路遇袭开关：读当前存档的设置（没开局默认开）
  function roadAmbushOn() {
    const st = S();
    return !st || !st.settings || st.settings.roadAmbush !== false;
  }
  document.addEventListener('guyu-backup-notice',e=>centerToast(String(e.detail||'')));
  function backupSummary(info) {
    if(!info.ok)return info.reason;
    return [info.currentGame ? `第 ${info.day} 天 · ${DIFFICULTIES[info.difficulty]?.name || info.difficulty}` : '旧版账号备份（不覆盖当前局）',
      info.version,info.checked?'完整性校验通过':'旧码无校验信息'].filter(Boolean).join(' · ');
  }
  function downloadBackup(code) {
    if(!code){centerToast('导出失败，请重试');return;}
    if(window.GuyuFileBackup?.save){window.GuyuFileBackup.save(code);return;}
    const url=URL.createObjectURL(new Blob([code],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='Isle-of-Lost-Chapters-save-'+new Date().toISOString().replace(/[:.]/g,'-')+'.txt';
    document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function settingsModal() {
    const btn = (v, label, on) => `<button class="mini-btn ${on ? 'active' : ''}" data-set="${v}">${label}</button>`;
    const tgl = (v, label, on) => `<button class="mini-btn ${on ? 'active' : ''}" data-set="${v}">${label} ${on ? '开' : '关'}</button>`;
    return `<div class="modal-title">设 置</div>
      <div class="help-list">
        <div class="help-item"><b>图鉴 · 每日签到</b><span>图鉴是账号级的，不开局也能翻；签到每天可领 魂点 ×${Game.dailySignState().soul} + 备份点 ×${Game.dailySignState().backup}。</span>
          <div class="modal-actions"><button class="mini-btn" data-open="collection">📜 图 鉴</button><button class="mini-btn" data-open="sign">📅 每日签到${Game.dailySignState().canSign ? ' <b style="color:#e8c66a">· 可领</b>' : ''}</button></div></div>
        <div class="help-item"><b>语言 / Language</b>${window.Locale?Locale.control():''}</div>
        ${S() ? `<div class="help-item"><b>自动取用工具</b><span>开启后使用背包或当前营地仓库里等级最高的可用工具，正常消耗耐久；不改变工具槽，野外不能借用仓库。</span><div class="set-inline">${tgl('autoTools','自动取用工具',Game.autoToolsEnabled())}</div></div>` : ''}
        <div class="help-item"><b>声音</b><span>音乐（配乐与氛围）/ 音效（咔哒、采集、战斗）/ 环境音（海浪、风、鸟虫、雨）</span>
          <div class="set-inline">${tgl('audio:music', '音乐', AudioFX.enabledState())}${tgl('audio:sfx', '音效', AudioFX.sfxState())}${tgl('audio:voice', '角色语音', AudioFX.voiceState())}${tgl('audio:amb', '环境音', AudioFX.ambientState())}</div></div>
        <div class="help-item"><b>日志栏</b><span>怎么显示 / 多宽（窄一点能多看画面，宽一点看得清文字）</span>
          <div class="set-inline">
            <span class="set-lbl">显示</span>${btn('log:always', '常驻', logMode === 'always')}${btn('log:fade', '淡出', logMode === 'fade')}${btn('log:hidden', '隐藏', logMode === 'hidden')}
            <span class="set-lbl">宽度</span>${btn('logw:tiny', '极窄', logSize === 'tiny')}${btn('logw:narrow', '窄', logSize === 'narrow')}${btn('logw:mid', '中', logSize === 'mid')}${btn('logw:wide', '宽', logSize === 'wide')}
          </div></div>
        <div class="help-item"><b>场景上下滑动</b><span>关闭后小场景保持比例裁取画面，热点保留原位；大地图、日志和列表仍可滚动。</span><div class="set-inline">${tgl('sceneScroll','上下滑动',sceneScroll)}</div></div>
        <div class="help-item"><b>当前目标</b><span>营地顶部那行「当前目标：…」提示；嫌它占地方可以关掉</span>
          <div class="set-inline"><button class="mini-btn ${showObjective ? 'active' : ''}" data-set="obj:on">显示</button><button class="mini-btn ${!showObjective ? 'active' : ''}" data-set="obj:off">关闭</button></div></div>
        <div class="help-item"><b>皮肤包</b><span>当前：<b>${skinName()}</b></span>
          <div class="set-inline">${SKINS.filter(s => s.id !== 'ink' && (s.id!=='armory' || Game.skinOwned('armory'))).map(s => Game.skinOwned(s.id)
            ? btn('skin:' + s.id, s.id === 'seasons' ? s.name + ' · 免费' : s.name, skinOn(s.id))
            : `<button class="mini-btn" data-askin="${s.id}">🔒 ${s.name} · ${Game.skinCost()} 魂点</button>`).join('')}${btn('skinoff:1', '墨白原味（全部关闭）', skinSet.size === 0)}</div></div>
        <div class="help-item"><b>本地存档</b><span>进度保存在当前设备。覆盖更新可保留；卸载或清除数据会丢失，请导出存档码备份。</span><div class="set-inline"><button class="mini-btn" data-codex="export">导出存档码</button><button class="mini-btn" data-codex="import">导入存档码</button></div><span class="help-sub">版本 ${(typeof window !== 'undefined' && window.BUILD_VER) || '（未知版本）'}</span></div>
      </div>
      <div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
  }
  // ---------- 每日晨报：牧场消耗/产量 + 陷阱情况 ----------
  function dailyReportModal() {
    const st = S() || {};
    const rep = st.dailyReport || null;
    if (!rep) {
      return `<div class="modal-title">第 ${st.day || '?'} 天 · 晨报</div>
        <div class="overlay-text">今天没有什么新消息。</div>
        <div class="modal-actions"><button id="modal-close">知 道 了</button></div>`;
    }
    let html = `<div class="modal-title">第 ${rep.day} 天 · 晨报</div>`;
    // —— 牧场 ——
    const r = rep.ranch;
    if (r) {
      html += '<div class="help-list">';
      const line = (b, span) => `<div class="help-item"><b>${b}</b><span>${span}</span></div>`;
      html += line('牧场', `羊 ${r.pen} 只 · 鸡 ${r.coop} 只` + (r.autoFeed ? '（自动喂食：开）' : '（自动喂食：<b>关</b>）'));
      if (r.hayUsed || r.wool) html += line('羊圈', `吃干草 ${r.hayUsed || 0} · 产羊毛 <b>+${r.wool || 0}</b>`);
      if (r.wheatUsed || r.egg) html += line('鸡舍', `吃小麦 ${r.wheatUsed || 0} · 产鸡蛋 <b>+${r.egg || 0}</b>`);
      if (r.grown) html += line('成长', `小鸡长成了母鸡 ×${r.grown}`);
      if (r.meat) html += line('寿终', `留下兽肉 ×${r.meat}`);
      if (r.lackHay) html += line('⚠ 干草不足', `<b>${r.lackHay}</b> 只羊今天没吃上，没产毛（羊不会饿死，补上干草即可）`);
      if (r.lackWheat) html += line('⚠ 小麦不足', `<b>${r.lackWheat}</b> 只鸡今天没吃上，没下蛋（鸡不会饿死，补上小麦即可）`);
      if (!r.parts.length && !r.lackHay && !r.lackWheat) html += line('产出', '今天牧场没有变化。');
      html += '</div>';
    } else {
      html += `<div class="overlay-text">还没有鸡舍 / 羊圈。</div>`;
    }
    // —— 陷阱 ——
    const tp = rep.trap;
    html += '<div class="help-list" style="margin-top:8px">';
    if (!tp) {
      html += `<div class="help-item"><b>草地陷阱</b><span>没布陷阱。用「陷阱」道具去草地布一个，次日起每天清晨会汇报。</span></div>`;
    } else if (tp.waiting) {
      html += `<div class="help-item"><b>草地陷阱</b><span>昨天刚布下（共 ${tp.placed} 处），还没到收获的时候——明天清晨再看。</span></div>`;
    } else if (tp.caught && !tp.done) {
      html += `<div class="help-item"><b>草地陷阱 · 有收获！</b><span>你拨开草丛：陷阱里困着一头羊羔，正咩咩地叫。怎么处置？</span></div>`;
    } else {
      html += `<div class="help-item"><b>草地陷阱</b><span>还没被触发（共 ${tp.placed} 处），明天再来看看。</span></div>`;
    }
    html += '</div>';
    // 按钮：抢到羊羔时给两个选择，否则"知道了"
    const btns = (tp && tp.caught && !tp.done)
      ? `<button data-dailytrap="kill">杀灭<span class="choice-hint">收获兽肉×2、兽皮×1</span></button><button data-dailytrap="pen">放回羊圈<span class="choice-hint">羊圈未满就能留下它</span></button>`
      : `<button id="modal-close">知 道 了</button>`;
    return html + `<div class="modal-actions">${btns}</div>`;
  }

  // ---------- 冬季来临（作者 2026-09-25）----------
  // "冬天来的时候弹个窗，提示资源有限、很难熬。注意不要和其他弹窗冲突。"
  //   · 触发点：game.js 的 newDay()，只在冬天第一天（winterJustStarted）推一次；
  //   · 不抢屏幕：onOverlay 里发现已有弹窗就排队（pendingPanels），关掉上一个再弹；
  //   · 数字全部照抄 HOUR_EFFECTS / 采集公式的真实口径，别在文案里编数：
  //     采集 ×0.6（SEASONS 冬 gatherMul）、雪天再 ×0.6（WEATHER.snow.eff）、
  //     冬天保暖 < 2 时每小时 -5 生命。
  // ⚠️ 两条排版经验（都踩过）：
  //   ① `.help-item b` 是 display:block —— 正文里要加重只能用 <strong>，
  //      再用 <b> 会被拆成独立一行，5 条能撑成 10 行（横屏手机直接顶出屏幕）。
  //   ② 横屏手机只有 390px 高：条目控制在 4 条、每条正文一句话，
  //      保证「去河畔采雪 / 知道了」两个按钮不用滚动就能点到（浏览器探针会量这个）。
  function winterModal() {
    const st = S();
    const fur = st.equipment.cloth && ITEMS[st.equipment.cloth] ? (ITEMS[st.equipment.cloth].warm || 0) : 0;
    return `<div class="modal-title">❄ 冬季来临 · 第 ${st.day} 天</div>
      <div class="help-list">
        <div class="help-item"><b>① 采集只剩六成</b><span>野外产量 ×0.6，<strong>下雪天再 ×0.6</strong>。趁晴天囤木柴草药；兽皮反而 +50%。</span></div>
        <div class="help-item"><b>② 采雪烧水</b><span>河畔取水点结冰，请改点<strong>【采雪】（每天3次）</strong>。采雪不受雨雪天气减产；带回营地篝火，用积雪×2 + 木材×1 →【烧雪水】= 淡水×1。</span></div>
        <div class="help-item"><b>③ 冷会持续掉血</b><span>保暖不足<strong>每小时 -5 生命</strong>，营地也一样。${fur >= 2 ? '你这件衣服够暖。' : '草房+火塘或木屋，凑够 2 点即可。'}</span></div>
        <div class="help-item"><b>④ 中毒 / 流血睡觉不会停</b><span>每睡 1 小时照样发作；带伤过夜前先解毒、止血。</span></div>
      </div>
      <div class="modal-actions"><button id="winter-go">去河畔采雪</button><button id="modal-close">知道了</button></div>`;
  }

  // ---------- 每日签到 ----------
  function signModal() {
    const st = Game.dailySignState();
    return `<div class="modal-title">📅 每日签到</div>
      <div class="overlay-text">每天可领一次：<b>魂点 ×${st.soul}</b> + <b>备份点 ×${st.backup}</b>。<br>

      ${st.canSign ? '<b style="color:#9c6b1f">还没签到 · 可以领取</b>' : `已签到`}<br>
      当前：魂点 ${st.total} · 备份点 ${st.bp}</div>
      <div class="modal-actions">
        ${st.canSign ? '<button data-sign="go">领 取</button>' : '<button disabled>今天已领过</button>'}
        <button id="modal-close">关 闭</button>
      </div>`;
  }
  // Menu and mailbox share the same compact guide pages.
  let guidePage = 0;
  function guideContent() {
    const pages = GUIDE;
    guidePage = Math.max(0, Math.min(pages.length - 1, guidePage));
    const page = pages[guidePage];
    return `<div class="guide-nav"><button data-guide-step="-1" ${guidePage===0?'disabled':''}>上一页</button><select data-guide-page aria-label="攻略章节">${pages.map((p,i)=>`<option value="${i}" ${i===guidePage?'selected':''}>${esc(p.title)}</option>`).join('')}</select><button data-guide-step="1" ${guidePage===pages.length-1?'disabled':''}>下一页</button><span>${guidePage+1}/${pages.length}</span></div><section class="guide-page"><h3>${esc(page.title)}</h3>${page.steps.map((text,i)=>`<p><b>${i+1}.</b> ${esc(text)}</p>`).join('')}</section>`;
  }
  function guideModal() {
    return '<div class="modal-title">全流程攻略</div>'+guideContent()+'<div class="modal-actions"><button id="modal-close">关闭</button></div>';
  }

  function adAvailable() { return typeof TapAds!=='undefined' && TapAds.supported() && !TapAds.busy(); }
  function watchAd(action, done) {
    if (!adAvailable()) { done({ok:false,reason:'广告暂不可用，请在 TapTap 内打开游戏后重试。'}); return; }
    const frozen=Game.timeFrozen(), panels=[document.querySelector('#modal .modal-content')].filter(Boolean);
    panels.forEach(p=>p.inert=true); Game.setTimeFreeze(true);
    let applied;
    TapAds.onReward(()=>{applied=action();});
    TapAds.showRewardedVideo(result=>{
      panels.forEach(p=>p.inert=false); Game.setTimeFreeze(frozen);
      done(result.ok && applied ? applied : {ok:false,reason:result.reason || '奖励未能领取，请稍后再试。'});
    });
  }
  function adShopModal() {
    const shop=Game.adShopState(), soul=Game.metaState().soul || 0,currency=Game.adCurrencyName();
    const reward=Game.adRewardState(), tapShop=typeof TapAds!=='undefined' && TapAds.enabled();
    const video=tapShop ? `<button id="watch-reward-ad" class="cabinet-cell" ${!reward.canClaim || !adAvailable()?'disabled':''}><b>看广告领币</b><small>3～6 广告币 · ${reward.uses}/${reward.limit}</small><small>${reward.reason || (!adAvailable()?'请在 TapTap 内观看':'')}</small></button>` : '';
    return `<div class="modal-title shop-title"><b>售物柜</b><div class="shop-tools"><div class="cabinet-exchange"><div class="cabinet-controls"><input id="star-exchange-qty" aria-label="兑换数量" type="number" min="1" max="${Math.max(shop.coins,Math.floor(soul/15),1)}" value="1"><button data-soulexchange ${soul<15?'disabled':''}>换${currency}</button><button data-adexchange ${shop.coins<1?'disabled':''}>换魂点</button></div></div><span>◇ ${shop.coins} · 魂点 ${soul}</span>${inlineHelp(`15 魂点兑换 1 ${currency}；1 ${currency}兑换 15 魂点。输入兑换数量再选择方向。${currency}跨局保留，商品寄到邮箱；传奇档不能领取物资。`)}</div></div>
      <div class="shop-cabinet">${shop.goods.map(g=>{const item=ITEMS[g.id] || RELICS[g.id];return `<button class="cabinet-cell cabinet-product" data-adbuy="${g.id}" aria-label="购买${esc(item.name)}，${g.cost}${currency}，发到邮箱" ${shop.coins<g.cost?'disabled':''}><span class="cabinet-item">${itemIcon(g.id)}<b>${esc(item.name)}</b></span><small class="cabinet-price">◇ ${g.cost}</small></button>`;}).join('')}
      ${video}${Array.from({length:Math.max(0,12-shop.goods.length-(tapShop?1:0))},()=>'<div class="cabinet-cell cabinet-empty" aria-hidden="true"></div>').join('')}</div>`;
  }
  function mailboxModal() {
    const tabs = [['mail','邮箱'],['code','兑换码'],['event','活动'],['guide','攻略']];
    const mbox = Game.mailboxList();
    const st = S() || {};      // 当前存档（传奇难度判定要用；没开局时为 {}）
    // ⚠️ isLegend 必须声明在 if 外面：下面"兑换码"和"活动"两个分支都要用它。
    //    写进 if (mailTab === 'mail') 块里的话，切到兑换码页就 ReferenceError → 整个弹窗渲染中断、tab 永远切不过去。
    const isLegend = st.difficulty === 'legend';
    let inner = '';
    if (mailTab === 'mail') {
      // 传奇难度不能领物资邮件（物品/神物/魂点）——按钮直接置灰并写明原因，别让玩家点了才发现
      const supplyMail = (x) => !!(x && !x.notice && (x.item || x.relic || x.soul || x.adCoins));
      inner = mbox.length ? mbox.map(x => {
        const blocked = isLegend && supplyMail(x);
        const btn = blocked
          ? `<button class="mini-btn lockedb" disabled title="传奇模式下不能领取物资邮件">传奇档不可领</button>`
          : `<button class="mini-btn" data-claimmail="${x.i}">${x.notice ? '知道了' : '领取'}</button>`;
        const why = blocked ? `<div class="mail-body" style="color:#a8382a">传奇难度下不能领取物资邮件——邮件会留着，换低难度开局再来领。</div>` : '';
        return x.notice
        // ⚠️ 兼容老存档：以前发出去的公告邮件里 body 可能是数组（没归一化），
        //    直接 String(数组) 会变成逗号拼成一整行 —— 这里统一按行拆。
        ? `<div class="help-item"><b>📣 ${esc(x.title)}${x.date ? ` <small>（${esc(x.date)}）</small>` : ''}</b><div class="mail-body">${(Array.isArray(x.body) ? x.body.join('\n') : String(x.body || '')).split('\n').map(t => `<div>${esc(t)}</div>`).join('')}</div>${btn}</div>`
        : `<div class="help-item"><b>${x.item === 'divineBow' ? '◈ 限定 · ' : ''}${x.relic ? `◈ 神物 · ${esc(RELICS[x.relic].name)}` : (x.item ? `${ITEMS[x.item].glyph} ${esc(ITEMS[x.item].name)}×${x.qty}` : `魂点 ×${x.soul}${x.adCoins ? ` + 星之点 ×${x.adCoins}` : ''}`)}</b><span>${x.item === 'divineBow' ? esc(ITEMS.divineBow.desc) + (x.dur !== undefined ? `（剩余耐久 ${x.dur}）` : '') : (x.relic ? esc(RELICS[x.relic].desc) : '来自官方邮件')}</span>${why}${btn}</div>`;
      }).join('') : '<div class="hint">邮箱是空的。（兑换码/官方发放会送到这里）</div>';

    } else if (mailTab === 'code') {
      inner = isLegend
        ? `<div class="overlay-text">输入官方兑换码领取奖励。通用码每人一次，专属码只能被一人兑换。</div><div class="mail-body" style="color:#a8382a"><b>传奇难度下不能兑换物资</b>（物品 / 神物 / 魂点）——兑换码不会被消耗，换一个低难度开局再来兑换。</div><div class="batch-row"><span>兑换码</span><input id="redeem-code" style="flex:1" maxlength="64" placeholder="传奇档不可兑换" disabled></div><div class="modal-actions"><button id="redeem-do" disabled>不可兑换</button></div>`
        : `<div class="overlay-text">输入官方兑换码领取奖励。通用码每人一次，专属码只能被一人兑换。</div><div class="batch-row"><span>兑换码</span><input id="redeem-code" style="flex:1" maxlength="64" placeholder="输入兑换码"></div><div class="modal-actions"><button id="redeem-do">兑 换</button></div>`;
    } else if (mailTab === 'guide') {
      inner = guideContent();
    } else {
      // 核心补偿那段文案已撤下（CORE4 这个码本身还在，可以私下发给受影响的玩家）
      // 作者 2026-09-25：在「活动」页挂一条朋友的小广告 + 反馈渠道说明。
      inner = `<section class="overlay-text event-feedback"><b>🎁 攻略与反馈征集</b><p>欢迎大家分享自己的游戏心得！</p><p>在论坛发布原创攻略，或向我们提交有价值的 BUG、玩法建议与改进反馈，经确认后可获得：</p><p><b>300 魂点 + 30 星之点</b></p><p>奖励与评分、评价内容及星级无关。不要求发布评价，也无需提交评价截图或链接。</p><p>攻略或反馈可通过官方交流群提交，确认后发放奖励。</p></section><section class="overlay-text event-review"><b>欢迎留下真实评价</b><p>非常欢迎大家留下自己对《孤屿遗章》的真实评价。无论喜欢、吐槽还是建议，我们都会认真看，并用于后续版本改进。</p></section><div class="overlay-text"><b>【命名牌】</b><br>兑换码 <code>QQ1014679931</code> 可兑换 1 张命名牌。<br><br><code>GUYU2026</code> 可兑换 50 魂点。<br><br>QQ群：1014679931</div>`
        + `<div class="overlay-text event-ad"><b>【小广告】</b><br>中式心理咨询可加 QQ <code>1840585640</code>。</div>`;


    }
    return `<div class="modal-title">邮箱 · 兑换 · 活动 · 攻略</div><div class="tabs">${tabs.map(([k,l]) => `<button class="tab ${mailTab===k?'active':''}" data-mailtab="${k}">${l}</button>`).join('')}</div><div class="overlay-text">内</div>`.replace('<div class="overlay-text">内</div>', `<div>${inner}</div>`) + `<div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
  }
  // 敌人一条血条该显示什么：名字 + 意图标签 + 血量数字（抽出来给"首建"和"原地更新"共用）
  function tgNameHtml(e) {
    const it = e.intent;
    const tag = it === 'charge' ? '<i class="intent-tag charge">蓄力</i>'
              : it === 'cover' ? '<i class="intent-tag cover">掩护</i>'
              : it === 'heavy' ? '<i class="intent-tag heavy">猛击</i>' : '';
    const charged = e.charged ? '<i class="intent-tag charge">下一击双倍</i>' : '';
    const coverOn = (e.cover && it !== 'cover') ? '<i class="intent-tag cover-on">被掩护</i>' : '';
    const effects = `${e.heavy ? ' · 破绽（防御0）' : ''}${e.bleed ? ' · 流血'+e.bleed : ''}${e.poison ? ' · 中毒'+e.poison : ''}`;
    return `${esc(e.name)}${e.isBoss ? ' <b class="badge danger">BOSS</b>' : ''}${tag}${charged}${coverOn}${effects}`;
  }
  function tgPct(e) { const maxH = e.emax || 20; return Math.max(0, Math.min(100, e.ehp / maxH * 100)); }
  function tgHpText(e) { const maxH = e.emax || 20; return `${Math.max(0, Math.round(e.ehp))}/${Math.round(maxH)}`; }
  function battleId(e) {
    const v=battleView;if(!v.ids.has(e))v.ids.set(e,++v.next);return v.ids.get(e);
  }
  function battleName(e) {return e.name+' '+battleId(e);}
  function battleTarget() {
    const v=battleView;if(!v)return null;
    return (v.C.enemies||[]).find(e=>e.ehp>0 && battleId(e)===v.selected)||null;
  }
  function paintTargetRows(es) {
    const box=$('#fight-targets');if(!box||!battleView)return;
    const ids=new Set(es.map(battleId));
    box.querySelectorAll('.target').forEach(n=>{if(!ids.has(+n.dataset.eid))n.remove();});
    box.style.setProperty('--enemy-count',Math.max(1,es.length));box.classList.toggle('compact',es.length>5);
    es.forEach((e,i)=>{
      const id=battleId(e);let row=box.querySelector(`[data-eid="${id}"]`);
      if(!row){row=document.createElement('button');row.className='hp-line target';row.dataset.eid=id;
        const en=ENEMIES[e.id] || (e.id==='nightmareEcho'?ENEMIES.nightmare6:e.id==='wolfMinion'?ENEMIES.wolf: e.id==='spiderMinion'?ENEMIES.spider:null);
        row.innerHTML=`<span class="enemy-picture">${en?.img?`<img class="enemy-img" src="${esc(CombatStage.cutout(en.img,skinOn('seasons')))}" alt="${esc(e.name)}" onerror="this.hidden=true;this.parentNode.classList.add('missing-art')">`:''}<span class="enemy-fallback">${esc(e.name[0])}</span></span><span class="tg-name"></span><span class="hp-bar"><span class="hp-fill"></span></span><span class="tg-hp"></span><span class="enemy-intent"></span><span class="target-marker">▼ 目标</span>`;
        box.appendChild(row);
      }
      row.dataset.ti=i;row.disabled=e.ehp<=0;row.classList.toggle('selected',id===battleView.selected);row.classList.toggle('boss-line',!!e.isBoss);
      row.setAttribute('aria-pressed',String(id===battleView.selected));
      row.querySelector('.tg-name').textContent=battleName(e)+(e.isBoss?' · 首领':'');
      row.querySelector('.hp-fill').style.width=tgPct(e)+'%';row.querySelector('.tg-hp').textContent=tgHpText(e);
      row.querySelector('.enemy-intent').innerHTML=tgNameHtml(e).replace(esc(e.name),'').replace(/<b class="badge danger">BOSS<\/b>/,'');
      row.style.setProperty('--distance-scale',CombatStage.scale(battleView.visual?.dist??battleView.C.dist));
    });
  }
  let soundCombat=null, soundCombatLength=0, soundCombatRound=0, soundCombatLast='';
  function updateCombat(C) {
    if(!battleView||battleView.C!==C||!$('#php'))return;
    if(['resolving','presenting'].includes(battleView.phase))return;
    if (soundCombat!==C) { soundCombat=C; soundCombatLength=C.log.length; soundCombatRound=C.round; soundCombatLast=C.log[C.log.length-1]; }
    const newLines=C.log.slice(soundCombatLength);
    if(!newLines.length&&(C.round!==soundCombatRound||C.log[C.log.length-1]!==soundCombatLast))newLines.push(C.log[C.log.length-1]||'');
    soundCombatLength=C.log.length;soundCombatRound=C.round;soundCombatLast=C.log[C.log.length-1];
    const actionSound=newLines.some(l=>/暴击|会心|要害/.test(l))?'critical':newLines.some(l=>/格挡|挡住/.test(l))?'guard':newLines.some(l=>/落空|闪避|躲开|未命中/.test(l))?'dodge':newLines.some(l=>/造成|伤害|击中/.test(l))?'hit':null;
    if(actionSound && !battleView.silentUpdate)AudioFX.play(actionSound);
    const previous=battleView.selected;
    if(!battleTarget() && battleView.phase==='idle')battleView.selected=C.enemies.find(e=>e.ehp>0)?battleId(C.enemies.find(e=>e.ehp>0)):null;
    paintTargetRows(battleView.phase==='resolving'||battleView.phase==='presenting' ? (C.finalEnemies||C.enemies) : C.enemies);
    const enemy=battleTarget() || (C.finalEnemies||[]).find(e=>battleId(e)===battleView.selected), attack=Game.combatActionInfo('attack',enemy);
    $('#php').style.width=Math.max(0,Math.min(100,S().stats.hp/Game.hpMax()*100))+'%';
    $('#php-txt').textContent=`${S().stats.hp}/${Game.hpMax()}`;
    $('.battle-header').classList.toggle('critical-health',S().stats.hp/Game.hpMax()<.25);
    $('#battle-round').textContent='回合 '+C.round;
    $('#battle-stamina').textContent='体力 '+Math.round(S().stats.stamina);
    const combatBuffs=[S().statuses.fear?{name:'恐惧',text:'恐惧降低命中。防御可抵挡梦魇恐吓。'}:null,S().statuses.bleed?{name:'流血',text:'每小时失去5生命，并降低健康。止血绷带可以止血。'}:null,S().statuses.poison?{name:'中毒',text:'每小时失去3生命，并降低健康。解毒剂可以解毒。'}:null,C.nightStun?{name:'晕眩',text:'下一次行动会被晕眩打断。防御可抵挡梦魇施加晕眩。'}:null,...Game.activeBuffs().map(b=>({name:b.name,text:b.name+' +'+(b.stat==='accuracy'?Math.round(b.value*100)+'%':b.value)+'，剩余'+b.minutes+'分钟。'}))].filter(Boolean);
    $('#battle-buffs').innerHTML=combatBuffs.map((b,i)=>'<button class="battle-buff-name" data-combat-buff="'+i+'">'+esc(b.name)+'</button>').join('');
    $('#battle-buffs').querySelectorAll('[data-combat-buff]').forEach(b=>b.onclick=()=>{const v=combatBuffs[+b.dataset.combatBuff];showBuffInfo(v.name,v.text);});
    $('#fight-status').textContent=`${enemy?battleName(enemy):'无目标'} · 距离 ${C.dist||0} 步 · ${attack.approaching?'本次攻击先靠近':'命中 '+Math.round(attack.accuracy*100)+'%'}`;
    $('#battle-summary').textContent=previous&&previous!==battleView.selected&&enemy?'目标已切换：'+battleName(enemy):'';
    const journal=$('.battle-journal #fight-log');if(journal){journal.innerHTML=CombatStage.logHtml(C.log);journal.scrollTop=journal.scrollHeight;}
    const rwId=[S().equipment.weapon,S().equipment.weapon2].find(id=>ITEMS[id]?.ranged),rw=ITEMS[rwId];
    const ammo=rw?(rw.ammoItem|| (Game.invCount('eagleArrow')?'eagleArrow':'arrow')):null;
    const skill=Game.hasHeavy()||Game.hasSure()||ITEMS[S().equipment.weapon]?.throw||Game.sweepInfo().alive>1||Game.sweepInfo().usable;
    const left=Math.max(0,2-(C.usedItems||0));
    const button=(a,name,sub,disabled=false)=>`<button data-fact="${a}" ${disabled?'disabled':''}><b>${name}</b><small>${esc(sub)}</small></button>`;
    $('#fight-btns').innerHTML=button('attack',attack.approaching?'靠近目标':'攻击',attack.approaching?'本次先靠近':'命中 '+Math.round(attack.accuracy*100)+'%')
      +(rw?button('ranged','射击',Game.invCount(ammo)?ITEMS[ammo].name+' ×'+Game.invCount(ammo):'缺'+ITEMS[ammo].name,!Game.invCount(ammo)):'')
      +button('defend','防御','防护本次全部来袭')+(skill?button('skills','战技','技能与冷却'):'')+button('item','道具','剩余 '+left+'/2',!left)+button('flee','逃跑','脱离战斗');
    if(battleView.phase!=='idle')$('#fight-btns').querySelectorAll('button').forEach(b=>b.disabled=true);
    if(battleView.panel)battlePanel(battleView.panel);
  }
  function battlePanel(kind) {
    const v=battleView,box=$('#battle-panel');if(!v||!box)return;v.panel=kind;box.hidden=!kind;if(!kind)return;
    const C=v.C,enemy=battleTarget();
    let content='';
    if(kind==='log')content=`<div class="fight-log expanded-log">${CombatStage.logHtml(C.log)}</div>`;
    if(kind==='detail')content=`<p>${esc(enemy?(ENEMIES[enemy.id]?.desc||enemy.name):'没有目标')}</p><p>${enemy?tgNameHtml(enemy):''}</p>`;
    if(kind==='item'){
      const meds=Object.keys(ITEMS).filter(id=>(ITEMS[id].cat==='med'||id==='smokeBomb'||id==='poisonCoat')&&Game.invCount(id)>0);
      content=`<p>本场还可使用 ${Math.max(0,2-(C.usedItems||0))} 次</p><div class="battle-choices battle-item-cards">${meds.map(id=>`<button class="battle-item-card" data-med-id="${id}" ${(C.usedItems||0)>=2?'disabled':''}>${itemIcon(id)}<b>${esc(ITEMS[id].name)}</b><small>×${Game.invCount(id)}</small></button>`).join('')||'没有可用的战斗道具'}</div>`;
    }
    if(kind==='skills'){
      const acts=[];if(Game.hasHeavy())acts.push(['heavy','重击',Game.heavyInfo()]);if(Game.hasSure())acts.push(['sure','必中',Game.sureInfo()]);
      const sw=Game.sweepInfo();if(sw.alive>1||sw.usable)acts.push(['sweep','横扫 · 全体',sw]);
      if(ITEMS[S().equipment.weapon]?.throw)acts.push(['throw','投掷',{usable:!C.thrown,reason:C.thrown?'本场已使用':'每场一次'}]);
      content='<div class="battle-choices">'+acts.map(([a,n,info])=>{const q=Game.combatActionInfo(a,enemy),ok=info.usable&&q.available;return `<button data-fact="${a}" ${ok?'':'disabled'}><b>${n}</b><small>${esc(!q.available?'需要近战武器':!info.usable?info.reason:q.approaching?'本次先靠近':a==='sweep'?'全部目标':a==='throw'?'每场一次':'命中 '+Math.round(q.accuracy*100)+'%')}</small></button>`;}).join('')+'</div>';
    }
    box.innerHTML=`<header><b>${({log:'完整战况',detail:'敌人详情',item:'战斗道具',skills:'战技'})[kind]}</b><button data-bpanel="close">返回战场</button></header><div class="battle-panel-body">${content}</div>`;
    const log=box.querySelector('#fight-log');if(log)log.scrollTop=log.scrollHeight;
  }
  async function battleClick(event) {
    const v=battleView;if(!v||v.phase!=='idle')return;
    const target=event.target.closest('[data-eid]');
    if(target&&!target.disabled){v.selected=+target.dataset.eid;updateCombat(v.C);return;}
    const panel=event.target.closest('[data-bpanel]');if(panel){battlePanel(panel.dataset.bpanel==='close'?null:panel.dataset.bpanel);return;}
    const b=event.target.closest('[data-fact],[data-med-id]');if(!b||b.disabled)return;
    const act=b.dataset.fact;
    if(act==='skills'||act==='item'){battlePanel(act==='item'?'item':'skills');return;}
    const C=v.C,seq=fightSeq,round=C.round;
    const ti=C.enemies.indexOf(battleTarget());if(ti<0 && !['defend','flee'].includes(act)&&!b.dataset.medId)return;
    const valid=()=>seq===fightSeq&&battleView===v;
    Game.takeCombatEvents(C);v.visual=CombatStage.snapshot(C);v.phase='resolving';
    $('#fight-btns').querySelectorAll('button').forEach(button=>button.disabled=true);
    if(b.dataset.medId){
      const flying=CombatStage.itemFlight(b,itemIcon(b.dataset.medId),ITEMS[b.dataset.medId].name,valid);
      battlePanel(null);
      if(!await flying || !valid())return;
      if(S().combat!==C){v.phase='idle';v.visual=null;return;}
    } else battlePanel(null);
    let used=true;
    try{if(b.dataset.medId)used=Game.useItemInFight(b.dataset.medId);else Game.fightAction(act,ti);}
    catch(e){v.phase='idle';v.visual=null;if(valid()){updateCombat(C);$('#battle-summary').textContent='行动未完成，请重试';}console.error(e);return;}
    if(seq!==fightSeq)return;
    if(used===false || (!b.dataset.medId && S().combat===C && C.round===round)){
      v.phase='idle';v.visual=null;updateCombat(C);$('#battle-summary').textContent='当前行动不可用，请检查弹药、冷却或道具';return;
    }
    const events=Game.takeCombatEvents(C);
    v.phase='presenting';
    for(const enemy of C.finalEnemies||C.enemies)if(!v.visual.enemies.has(enemy))v.visual.enemies.set(enemy,enemy.emax);
    paintTargetRows(C.finalEnemies||C.enemies);CombatStage.frame(v,battleId);
    try{await CombatStage.present(events,v,battleId,valid);}
    catch(error){console.error(error);}
    if(!valid())return;
    v.visual=null;v.phase='idle';v.silentUpdate=true;
    $('#battle-floats').innerHTML='';
    if(v.pendingEnd){
      const fin=v.pendingEnd;v.pendingEnd=null;renderCombat('end',fin);
    }else{updateCombat(C);v.silentUpdate=false;}
  }
  function showMedPicker(){if(battleView)battlePanel('item');}

  // ---------- 弹窗系统 ----------
  // 这些弹窗是"纯管理界面"（看东西/翻页面），开着时时间不流逝：
  // 边翻背包边掉饱食度、或者看技能面板时天自己黑了，都不合理。
  // ⚠️ 刻意【不包含】：camp（营地里有睡觉/休息，本来就该花时间）、craft（制造要耗时间）、
  //    laochao/town/black/atlTrade（买卖）、farm（种收）、sleeppick、grind、repair、naming 等
  //    —— 这些面板里的操作本身就是"主动消耗时间"，冻住它们等于把功能关掉。
  // ⛔ 不要用原生 confirm() / alert() / prompt()。
  //    iPhone 上的 WKWebView 宿主，如果宿主没有实现 runJavaScriptConfirmPanel，
  //    原生 confirm() 会**永远不返回**——点击回调直接卡在那里，表现就是"点了没反应"，
  //    玩家点「空白备份槽」开始不了新游戏就是这么来的（2026-09-21 真机反馈）。
  //    统一改用游戏自己的确认弹窗：走 showModal('overlay')，和战斗、事件用的同一套。
  function askConfirm(text, onOk, okLabel) {
    showModal('overlay', {
      title: '确认',
      text: text,
      choices: [
        { label: okLabel || '确定', ok: () => { if (typeof onOk === 'function') onOk(); } },
        { label: '取消', hint: '什么都不做', ok: () => {} },
      ],
    });
  }
  function brokenWeaponRows() {
    if (!S().furniture.grindstone || S().scene!=='camp') return '';
    const ids=Object.keys(S().weaponNames||{}).filter(id=>Game.invCount(id)>0&&ITEMS[id]&&ITEMS[id].cat==='weapon'&&id!=='divineBow'&&Game.durOf(id)===0);
    return ids.map(id=>{ const cost=Game.repairMatOf(id); return cost?`<div class="recipe-row"><b>${esc(Game.wNameOf(id))} · 已损坏</b><span class="rcost">修复到上限 · ${ITEMS[cost[0]].name}×${cost[1]}</span><button class="mini-btn" data-repair-broken="${id}">修复</button></div>`:''; }).join('');
  }
  function prepareMerchant(root) {
      // 交易数据与按钮保持原有绑定；仅将同一货架的相邻行编排成双列卡片。
      root.querySelectorAll('.trade-grid,.merchant-goods .help-item').forEach(row=>{
        if (!row.querySelector('button')) { if(row.classList.contains('trade-grid')) row.classList.add('trade-heading'); return; }
        let grid=row.previousElementSibling;
        if (!grid || !grid.classList.contains('trade-cards')) { grid=document.createElement('div'); grid.className='trade-cards'; row.before(grid); }
        grid.appendChild(row); row.classList.add('trade-card');
        const button=row.querySelector('button');row.dataset.viewKey=[...button.attributes].filter(a=>a.name.startsWith('data-')&&!['data-reason','data-count','data-qty'].includes(a.name)).map(a=>a.name+'='+a.value).join('|');
      });
  }
  function showModal(kind, cfg) {
    if(kind==='loot')kind='inv';
    if(restoreCombatView())return;
    const m = $('#modal');
    const openedNow = Date.now();   // 记下"刚打开"的时刻，配合防点击穿透（见文件末尾的捕获监听）
    const wasOpen = m.classList.contains('open');
    const samePanel = wasOpen && modal && modal.kind === kind;
    if(!samePanel)modalOpenedAt=openedNow;
    const previousCategory=m.dataset.category || '';
    const category=kind==='warehouse'?warehouseCat:kind==='craft'?craftTab:kind==='inv'?invCat:kind==='equip'?equipTab:'';
    m.dataset.category = category;
    clearTimeout(lotteryTimer); lotteryTimer=null;
    if(!samePanel)panels.get(modal?.kind).dispose?.();
    modal = { kind, cfg };
    if(kind==='lootExpiry'){lootExpiryQueued=false;cfg.onShown?.();}
    maybeBatchTip(kind);
    // 开管理面板 → 冻结时间；并重绘一次顶栏，让时间前的 ⏸ 标记立刻出现（否则要等下次渲染才看得到）
    if (Game.setTimeFreeze) {
      const wasFrozen = Game.timeFrozen && Game.timeFrozen();
      Game.setTimeFreeze(!!panels.get(kind).freeze);
      if (wasFrozen !== Game.timeFrozen() && document.getElementById('top-time')) render();
    }
    let html = '';
    if(panels.get(kind).render)html=panels.get(kind).render(cfg);
    else if (kind === 'camp') html = campModal(cfg?.building);
    else if (kind === 'livestock') html = livestockModal(cfg);
    else if (kind === 'camphelp') html = renderCampHelp((cfg && cfg.mode) || 'build');
    else if (kind === 'craft') html = renderCraft();
    else if (kind === 'warehouse') html=warehouseModal();
    else if (kind === 'cellar') html=renderInventory('cellar');
    else if (kind === 'cellarDeposit') html='<div class="modal-title">存入地窖</div><p>选择随身食物或饮品，长按可批量存入。</p><div class="inv-grid">'+Object.keys(S().inv).filter(id=>['food','drink'].includes(ITEMS[id]?.cat)).map(id=>'<button class="inv-item" data-cellar-store="'+id+'">'+itemIcon(id)+'<span>'+esc(ITEMS[id].name)+'</span><b>×'+Game.invCount(id)+'</b></button>').join('')+'</div>';
    else if (kind === 'transferHelp')html='<div class="modal-title">仓库存取</div><p>轻点物品：向对面存入或取出1份。</p><p>长按物品，继续左右拖动选择数量，松开后确认批量存取。</p><div class="modal-actions"><button data-warehouse-open>返回仓库</button></div>';
    else if (kind === 'bookFocus') html='<div class="modal-title">书架 · 集中</div><p>选择一个集中方向。每次获得对应经验时，有50%概率获得双倍经验；可随时切换。</p><div class="focus-options">'+[['craft','制造集中'],['gather','采集集中'],['combat','战斗集中']].map(([id,name])=>'<button data-book-focus="'+id+'" class="'+(S().bookFocus===id?'active':'')+'">'+name+(S().bookFocus===id?' · 已选择':'')+'</button>').join('')+'</div>';
    else if (kind === 'inv') html = renderInventory();
    else if (kind === 'laochao') html = laochaoModal();
    else if (kind === 'guide') html = guideModal();
    else if (kind === 'share') html = shareModal();
    else if (kind === 'mailbox') html = mailboxModal();
    else if (kind === 'adshop') html = adShopModal();
    else if (kind === 'naming') html = `<div class="modal-title">为武器命名 <span style="font-size:11px">${Game.S().weaponNames && Game.S().weaponNames[Game.S().equipment.weapon] ? '已命名' : '消耗 1 命名牌 · 伤害永久+1 · 最多8字'}</span></div><div class="overlay-text">你的主手武器：${Game.S().equipment.weapon ? `「${Game.wNameOf(Game.S().equipment.weapon)}」` : '未装备'}</div><div class="batch-row"><span>名字</span><input id="name-input" style="flex:1" maxlength="8" placeholder="输入武器名"></div><div class="modal-actions"><button id="name-do">确 定</button><button id="modal-close">取 消</button></div>`;
    else if (kind === 'grind') {
      // 修补材料按当前主手武器实时显示；神弓不提供修补入口。
      const w0 = Game.S().equipment.weapon;
      const rm = (w0 && DURA[w0] !== undefined) ? Game.repairMatOf(w0) : null;
      const rmTxt = (rm && ITEMS[rm[0]]) ? `${ITEMS[rm[0]].name}×${rm[1]}` : '不可修复';
      html = `<div class="modal-title">磨刀石 <span style="font-size:11px">${Game.S().furniture.grindstone ? '· 只作用于当前主手武器' : '· 需先建造磨刀石家具'}</span></div><div class="overlay-text">${Game.S().furniture.grindstone ? `<b>作用于当前主手武器</b>：<br>磨刀：+3攻击 · 20%流血 · 持续3场（耗 燧石×1）<br>${w0 === 'divineBow' ? '神弓不可修复，耐久耗尽后仅作收藏' : `修补：耐久恢复满（耗 ${rmTxt}）`}<br>命名：武器伤害永久+1（耗 命名牌×1）` : '请先在营地·家具建造「磨刀石」石台（石头×4+燧石×1）。'}</div><div class="modal-actions"><button data-grind="sharpen">磨 刀</button>${w0 === 'divineBow' ? '' : '<button data-grind="repair">修 补</button>'}<button data-grind="name">命 名</button><button id="modal-close">关 闭</button></div>`;
    }
    else if (kind === 'town') html = townModal();
    else if (kind === 'black') html = blackModal();
    else if (kind === 'mission') html = missionModal();
    else if (kind === 'info') html = infoModal();
    else if (kind === 'farm') html = farmModal();
    else if (kind === 'diary') html = diaryModal();
    else if (kind === 'collection') html = collectionModal();
    else if (kind === 'itemInfo') html = itemInfoModal(cfg && cfg.id);
    else if (kind === 'nightmareInfusion') {
      const ids=['nightmareSoul','nightmareSoul2','nightmareSoul3'],selected=ids.includes(cfg?.soul)?cfg.soul:ids[0],used=(S().nightmareInfusions?.[selected] || []).length,ready=used<2&&Game.invCount(selected)>=30;
      const emblems={hard:'<path d="M50 8 83 27 77 69 50 92 23 69 17 27Z M50 18 50 80 M28 32 72 32 M28 32 50 55 72 32"/>',blade:'<path d="M70 8 65 42 38 70 30 62 58 35Z M22 54 46 78 M33 67 18 82 M14 78 23 87"/>',agile:'<path d="M15 62Q55 4 84 31Q47 24 23 78 M27 57Q65 38 85 52Q51 49 30 75 M36 68Q67 63 76 75Q49 67 38 84"/>'};
      html=`<div class="infusion-sanctum"><small class="infusion-warning">此类选择不可撤回。</small><h2>迷茫的人啊，你想成为什么？</h2><div class="infusion-tiers">${ids.map(id=>`<button data-infusion-tier="${id}" class="${id===selected?'active':''}">${ITEMS[id].name} · ${Game.invCount(id)}份 · ${Math.min(2,(S().nightmareInfusions?.[id] || []).length)}/2</button>`).join('')}</div><p class="infusion-cost">献上30份${ITEMS[selected].name}</p><div class="infusion-choices">${[['hard','坚硬','UNYIELDING'],['blade','利刃','BLADE'],['agile','灵活','AGILE']].map(([id,cn,en])=>`<button class="infusion-choice infusion-${id}" data-infuse="${id}" data-soul="${selected}" ${ready?'':'disabled'}><svg viewBox="0 0 100 100" aria-hidden="true">${emblems[id]}</svg><b>${cn}</b><span>${en}</span></button>`).join('')}</div><p role="status">${used>=2?'此阶魂魄的选择已经完成。':!ready?'同阶魂魄不足。':'选择之后，命运将不再回头。'}</p></div>`;
    }
    else if(kind==='separator') html=`<div class="modal-title">解魂器 ${inlineHelp('一阶只产初等物资；二阶1%、三阶2%产高等物资。秘银仅三阶掉落，总概率0.05%。每份独立20%获得1魂点、3%获得1星之点。')}</div><div class="soul-separator"><img src="assets/img/build/soulSeparator.png" alt="解魂器"><div>${['nightmareSoul','nightmareSoul2','nightmareSoul3'].map(id=>`<section><b>${ITEMS[id].name} · ${Game.invCount(id)}份</b><div class="modal-actions">${[1,10,100].map(n=>`<button data-separate="${n}" data-soul-id="${id}" ${Game.invCount(id)<n?'disabled':''}>分解${n}份</button>`).join('')}</div></section>`).join('')}<div id="separate-result" role="status"></div></div></div>`;
    else if (kind === 'autoHelp')html='<div class="modal-title">自动存入</div><p>选择需要自动存入的消耗品与材料，保存后在回到对应营地时自动搬到当地仓库。装备、武器和图纸不在自动存入列表中。</p><p>仓库装不下的部分会留在背包；海底仓库与岛上仓库分别存放。</p><p>“保存并立即存入”会立即按当前选择存放，普通“保存”只修改设置。</p><div class="modal-actions"><button data-warehouse-open>返回仓库</button></div>';
    else if (kind === 'warehouseAuto') {const selected=Game.warehouseAutoItems(),ids=[...new Set([...Object.keys(S().inv),...Object.keys(Game.warehouseState().inv),...selected])].filter(Game.warehouseAutoEligible);html='<div class="modal-title">自动存入</div><p class="hint">回到对应营地时存入所选消耗品和材料。仓库满时保留在背包。</p><div class="warehouse-auto-grid">'+ids.map(id=>`<label><input type="checkbox" data-auto-item="${id}" ${selected.includes(id)?'checked':''}>${itemIcon(id)}${esc(ITEMS[id].name)}</label>`).join('')+'</div><div class="modal-actions"><button data-save-warehouse-auto>保存</button><button data-save-warehouse-auto data-store-now>保存并立即存入</button><button data-warehouse-open>返回仓库</button></div>';}

    else if (kind === 'lottery') html = lotteryModal();
    else if (kind === 'lotteryPick') html = lotteryPickModal();
    else if (kind === 'lotteryPool') html = lotteryPoolModal();
    else if (kind === 'lotteryResult') html = lotteryResultModal(cfg);
    else if (kind === 'rune') html = renderRuneModal();
    else if (kind === 'atlTrade') html = atlTradeModal();
    else if (kind === 'fishman') html = fishmanModal();
    else if (kind === 'repair') html = repairModal();
    else if (kind === 'savemenu') html = `<div class="modal-title">菜单</div><div class="modal-actions save-menu"><button data-savemenu="guide">📖 攻略</button><button data-savemenu="mail">✉ 邮箱 ${Game.mailboxCount() || ''}</button><button data-savemenu="adshop">◇ 商城</button><button data-savemenu="sign">📅 每日签到</button><button data-savemenu="diary">📖 日记</button><button data-savemenu="col">📜 图鉴</button><button data-savemenu="settings">⚙ 设置</button><button data-savemenu="save">💾 保存进度</button><button data-savemenu="backup">📦 备份·读档</button><button data-savemenu="title">🏠 回到主菜单</button></div>`;
    else if (kind === 'settings') html = settingsModal();
    else if (kind === 'sleeppick') html = sleepModal();
    else if (kind === 'heirloom') html = renderHeirloom();
    else if (kind === 'equip') html = renderEquip();
    else if (kind === 'equipPick') html = equipmentPickModal(cfg);
    else if (kind === 'backup') html = renderBackup();
    else if (kind === 'rescue') html = rescueModal();
    else if (kind === 'skill') html = skillModal();
    else if (kind === 'skilltree') html = skillTreeModal(cfg && cfg.kind);
    else if (kind === 'batch') html = batchModal(cfg);
    else if (kind === 'batchn') html = batchnModal(cfg);
    else if (kind === 'comhelp') html = comHelpModal();
    else if (kind === 'crafthelp') html = `<div class="modal-title">制造说明</div><div class="overlay-text">· 制造工坊在营地里，回营地才能使用。<br>· 点配方 = 制作1个。<br>· <b>长按配方按钮</b> 弹出批量条，拖动数量从1到「当前材料最多可做数量」，一次做完多个。<br>· 批量时按数量×单个耗时（造越多耗时越长），经验也×N。<br>· <b>晾肉架例外</b>：它要挂上去等晾透，一副架子一次只能挂一批（肉×2），晾好取下来才能挂下一批。<br>· 火堆·烹饪，以及各工坊（工作台/熔炉/烟熏炉/灶台/晾肉架/制革架/纺车…）按你建了哪些来。</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
    else if (kind === 'buybp') html = `<div class="modal-title">购买备份点</div><div class="overlay-text">是否用 20 魂点购买一个备份点？</div><div class="modal-actions"><button data-buybp-yes="1">是</button><button data-buybp-no="1">否</button></div>`;
    else if (kind === 'buyslot') html = `<div class="modal-title">解锁第四存档位</div><div class="overlay-text">支付 100 魂点，永久解锁一个新的备份槽。购买后可消耗备份点向槽内备份。</div><div class="modal-actions"><button data-buyslot-yes="1">确认解锁</button><button data-buyslot-no="1">取消</button></div>`;
    else if (kind === 'codex') {
      html = cfg && cfg.mode === 'export'
        ? `<div class="modal-title">导出存档码</div><div class="overlay-text">备份包含当前进度与账号数据。请整段复制，或下载文本文件保存到设备外。</div>
           <textarea id="codex-text" readonly style="width:100%;height:90px;font-size:11px;line-height:1.4;padding:8px;box-sizing:border-box;background:var(--paper);color:var(--ink);border:2px solid var(--ink)">${esc(cfg.code || '')}</textarea>
           <div class="batch-hint">${esc(backupSummary(Game.inspectCode(cfg.code || '')))}</div><div class="modal-actions"><button id="codex-copy">复 制</button><button id="codex-download">下载备份文件</button><button id="modal-close">关 闭</button></div>`
        : `<div class="modal-title">导入存档码</div><div class="overlay-text">粘贴完整存档码或选择备份文件，确认前会显示内容预览；旧码可能只包含账号数据。</div>
           <textarea id="codex-text" placeholder="在这里粘贴存档码" style="width:100%;height:64px;font-size:11px;line-height:1.4;padding:8px;box-sizing:border-box;background:var(--paper);color:var(--ink);border:2px solid var(--ink)"></textarea>
           <div class="batch-hint" id="codex-preview" aria-live="polite">请先粘贴存档码</div><input id="codex-file" type="file" accept=".txt,text/plain" hidden><div class="modal-actions"><button id="codex-file-pick">选择备份文件</button><button id="codex-current-backup">备份当前进度</button><button id="codex-do">预览并导入</button><button id="modal-close">取 消</button></div>`;
    }
    else if (kind === 'devpw') html = devpwModal();
    else if (kind === 'daily') html = dailyReportModal();
    else if (kind === 'winter') html = winterModal();
    else if (kind === 'sign') html = signModal();
    else if (kind === 'buffInfo') html = buffInfoModal(cfg);
    else if (kind === 'overlay' || kind === 'lootExpiry') {
      html = `<div class="modal-title">${esc(cfg.title || '')}</div><div class="overlay-text">${esc(cfg.text || '').replace(/\n/g, '<br>')}</div><div class="modal-actions">${(cfg.choices || []).map((c, i) => `<button data-choice="${i}"><span class="choice-label">${esc(c.label)}</span>${c.hint ? `<span class="choice-hint">${esc(c.hint)}</span>` : ''}</button>`).join('')}</div>`;
    }
    else if (kind === 'medpick') {
      const leftNow = Math.max(0, 2 - ((Game.S().combat && Game.S().combat.usedItems) || 0));
      html = `<div class="modal-title">使用道具 <span style="font-size:11px">本场还能用 ${leftNow} 次</span></div><div class="modal-actions">${cfg.meds.map(md => `<button data-med-id="${md}">${ITEMS[md].glyph} ${ITEMS[md].name}（有${Game.invCount(md)}）</button>`).join('')}<button id="modal-back">返 回</button></div>`;
    }
    if(kind==='grind') html += brokenWeaponRows();
    const merchantId = kind==='town' ? townShopNow : ({laochao:'laochao',black:'black',fishman:'fishman',atlTrade:'atlTrade',info:'informant'})[kind];
    if (merchantId && MERCHANTS[merchantId]) {
      const changed=activeMerchant!==merchantId;
      if(changed) { activeMerchant=merchantId; merchantLine=0; merchantTrades=0; AudioFX.playVoice(merchantId,0); }
      const person=MERCHANTS[merchantId], col=person.cell%3, row=Math.floor(person.cell/3);
      html=`<div class="merchant-layout"><aside class="merchant-person"><div class="merchant-portrait${skinOn('seasons')?' art-colored':''}" style="background-position:${col*50}% ${row*50}%" role="button" tabindex="0" data-voice="${merchantId}" aria-label="听${esc(person.name)}说话"></div><b>${esc(person.name)}</b><p id="merchant-line" aria-live="polite">${esc(person.lines[merchantLine])}</p></aside><section class="merchant-goods">${html}</section></div>`;
    } else if (kind!=='batchn' && kind!=='overlay') { activeMerchant=null; AudioFX.stopVoice(); }
    const workPanel = !!panels.get(kind).work;
    m.classList.toggle('work-open', workPanel);
    // winter-modal 这个类只用来给「冬季来临」在横屏手机上压紧排版（见 css/ui-polish.css）：
    // 4 条提醒 + 两个按钮要塞进 375px 高，默认的 .help-item 内边距会让第 4 条藏进内滚动里。
    const panelMarkup = `<div class="modal-content${workPanel ? ' work-modal' : ''}${kind==='overlay' && (cfg?.compact || (cfg?.text?.length<160 && cfg?.choices?.length<=2))?' compact-prompt':''}${['inv','warehouse','cellar'].includes(kind)?' inventory-modal':''}${kind==='warehouse'?' warehouse-dual-modal':''}${['inv','equip','craft'].includes(kind)?' player-panel-modal':''}${merchantId ? ' merchant-modal' : ''}${['lottery','lotteryPick','lotteryPool','lotteryResult'].includes(kind) ? ' lottery-modal' : ''}${kind === 'equipPick' ? ' equipment-pick-modal' : ''}${kind === 'settings' ? ' set-wide' : ''}${kind === 'nightmareInfusion' ? ' infusion-modal' : ''}${kind === 'adshop' ? ' cabinet-modal' : ''}${kind === 'winter' ? ' winter-modal' : ''}${kind === 'guide' ? ' guide-modal' : ''}" role="dialog" aria-modal="true">${html}</div>`;
    // 关闭按钮属于面板外壳，必须在比较之前加入，避免每次重建。
    const withClose=(!cfg || !cfg.requiredChoice)?panelMarkup.replace('aria-modal="true">','aria-modal="true"><button class="modal-x" aria-label="关闭">×</button>'):panelMarkup;
    if(samePanel)dom.html(m,withClose,merchantId?prepareMerchant:undefined);
    else {dom.dispose(m);m.innerHTML=withClose;if(merchantId)prepareMerchant(m);}
    const mcx = m.querySelector('.modal-content');
    // A transfer updates this open window; it must not replay the opening animation.

    if (merchantId) {
      m.querySelectorAll('.merchant-portrait[data-voice]').forEach(b=>b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();b.click();}});
    m.querySelectorAll('[data-voice]').forEach(b=>b.onclick=()=>AudioFX.playVoice(b.dataset.voice,merchantLine));
    }
    if (!cfg || !cfg.requiredChoice) {
      mcx.querySelector('.modal-x').onclick = closeModal;
    }
    m.classList.add('open'); document.body.classList.add('modal-open');
    if(samePanel && previousCategory!==category)m.querySelectorAll('.work-scroll').forEach(node=>{node.scrollTop=0;});
    if (kind === 'rune') bindRune();
    if (kind === 'winter') {
      // 「去河畔采雪」：顺手把玩家送到河畔（能不能去由 travel 自己判，失败会 toast 说明原因）
      const wg = m.querySelector('#winter-go');
      if (wg) wg.onclick = () => { closeModal(); Game.travel('river'); };
    }
    bindModal(kind, cfg);
  }
  function bindModal(kind, cfg) {
    const m = $('#modal');panels.get(kind).bind?.(m,cfg);
    const watch=m.querySelector('#watch-reward-ad');
    if(watch)watch.onclick=()=>{
      const info=Game.adRewardState(),run=S()?._runId;
      if(!info.canClaim){centerToast(info.reason);return;}
      watchAd(()=>Game.claimAdReward(run,info.today),r=>{showModal('adshop');centerToast(r.ok?`获得 ${r.amount} 广告币。`:r.reason);});
    };
    m.querySelectorAll('[data-adbuy]').forEach(b=>b.onclick=()=>{const r=Game.buyAdShop(b.dataset.adbuy);centerToast(r.msg || r.reason);showModal('adshop');});
    m.querySelectorAll('[data-adexchange]').forEach(b=>b.onclick=()=>{const r=Game.exchangeAdCoins(Number(m.querySelector('#star-exchange-qty').value));centerToast(r.msg || r.reason);showModal('adshop');});
    m.querySelectorAll('[data-soulexchange]').forEach(b=>b.onclick=()=>{const r=Game.exchangeSoulForStars(Number(m.querySelector('#star-exchange-qty').value));centerToast(r.msg || r.reason);showModal('adshop');});
    m.querySelectorAll('#modal-close').forEach(b => b.onclick = closeModal);
    m.querySelectorAll('#modal-back').forEach(b => b.onclick = () => { if (kind === 'medpick') renderCombat('start', Game.S().combat); else if(panels.get(kind).back)showModal(panels.get(kind).back); else if (modal && modal.kind) showModal(modal.kind, modal.cfg); });
    m.querySelectorAll('[data-player-panel]').forEach(b=>b.onclick=()=>{if(b.dataset.playerPanel==='equip')equipTab='p1';showModal(b.dataset.playerPanel);});
    m.querySelectorAll('[data-building-detail]').forEach(b=>b.onclick=()=>showModal('camp',{building:b.dataset.buildingDetail}));
    m.querySelectorAll('[data-camp-back]').forEach(b=>b.onclick=()=>showModal('camp'));
    m.querySelectorAll('[data-chain]').forEach(b => b.onclick = () => { if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; } withAnimation('build', '建造', () => { const previous = modal; Game.buildChain(b.dataset.chain); if (modal === previous && !S().death) showModal('camp'); }); });
    m.querySelectorAll('[data-fid]').forEach(b => b.onclick = () => {
      if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; }
      const fid = b.dataset.fid;
      const f = FURNITURE.find(x => x.id === fid) || {};
      const si = Game.furnSlotInfo(fid);
      const fromFarm = (modal && modal.kind) === 'farm';
      const doBuild = () => withAnimation('build', '打造家具', () => { const previous = modal; Game.buildFurniture(fid); if (modal === previous && !S().death) showModal(fromFarm ? 'farm' : 'camp'); });
      // 作者 2026-09-23："最大的坑是家具限制，新手一般注意不到，如果制作家具前加一个弹窗提示……就会好很多"
      // 只有**会占位**的家具才问；不占位的（旗帜/书架/水壶/升级替换…）直接造，别拿废话拦人。
      if (!si.takes) { doBuild(); return; }
      showModal('overlay', {
        title: '确认打造',
        compact: true,
        text: `打造「${f.name}」占1格家具位：${si.used}/${si.cap} → ${si.used+1}/${si.cap}。`,
        choices: [
          { label: '继续打造', hint: `占用 1 格（还剩 ${si.left} 格）`, ok: () => doBuild() },
          { label: '取消', hint: '回到营地', ok: () => showModal('camp') },
        ],
      });
    });
    m.querySelectorAll('[data-live]').forEach(b => b.onclick = () => { showModal('livestock', { kind: b.dataset.live }); });
    m.querySelectorAll('[data-livefeed]').forEach(b => b.onclick = () => { Game.toggleAutoFeed(); showModal('livestock', modal && modal.cfg); });
    m.querySelectorAll('[data-liveadd]').forEach(b => b.onclick = () => { const r = Game.addChick(); if (!r.ok) addLog(r.reason, 'warn'); showModal('livestock', modal && modal.cfg); });
    m.querySelectorAll('[data-hsext]').forEach(b => b.onclick = () => { if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; } const r = Game.buildHouseExt(); if (!r.ok) addLog(r.reason, 'warn'); showModal('camp'); });
    m.querySelectorAll('[data-coopext]').forEach(b => b.onclick = () => { if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; } const r = Game.buildCoopExt(); if (!r.ok) addLog(r.reason, 'warn'); showModal('coop'); });
    m.querySelectorAll('[data-stext]').forEach(b => b.onclick = () => { if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; } const r = Game.buildStoreExt(); if (!r.ok) addLog(r.reason, 'warn'); showModal('camp'); });
    m.querySelectorAll('[data-afid]').forEach(b => b.onclick = () => { if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; } const r = Game.buildAtlantisFurniture(b.dataset.afid); if (!r.ok) addLog(r.reason, 'warn'); showModal('camp'); });
    m.querySelectorAll('[data-asell]').forEach(b => { const id = b.dataset.asell; const doTap = () => { Game.sellToMerchant(id, 1, ATL_SHOP, false); showModal('atlTrade'); }; const doLong = () => showModal('batchn', { kind:'sell', item:id, list:'ATL' }); b.onclick = null; bindPress(b, doTap, doLong); });
    m.querySelectorAll('[data-rfix]').forEach(b => b.onclick = () => { const k = b.dataset.rfix; if (k.startsWith('dive:')) { const r = Game.repairDive(k.slice(5)); if (!r.ok) addLog(r.reason, 'warn'); } else if (k === 'pistol') { Game.repairPistol(); } else { Game.fixBrokenPistol(); } showModal('repair'); });
    m.querySelectorAll('[data-fishman]').forEach(b => b.onclick = () => { const r = Game.fishmanBarter(b.dataset.fishman); if (!r.ok) { addLog(r.reason, 'warn'); centerToast(r.reason); } else { merchantLine=1+Math.floor(Math.random()*2); AudioFX.play('trade'); AudioFX.playVoice('fishman',merchantLine); } showModal('fishman'); });
    m.querySelectorAll('[data-arelic]').forEach(b => b.onclick = () => { const r = Game.buyRelicFromVendor(); if (!r.ok) addLog(r.reason, 'warn'); showModal('atlTrade'); });
    m.querySelectorAll('[data-abuy]').forEach(b => { const entry = ATL_BUY.find(e => e.id === b.dataset.abuy); const list = entry ? [entry] : []; const doTap = () => { Game.buyFromMerchant(b.dataset.abuy, 1, list, false); showModal('atlTrade'); }; const doLong = () => { const unit = Game.priceOf(entry ? entry.base : 0, false, b.dataset.abuy); const isBp = ITEMS[b.dataset.abuy].cat === 'bp'; const mx = isBp ? 1 : Math.max(1, Math.min(99, Math.floor(Game.invCount('beibi') / Math.max(1, unit)))); showModal('batchn', { kind:'buy', item:b.dataset.abuy, shop:'ATL', max:mx }); }; b.onclick = null; bindPress(b, doTap, doLong); });
    m.querySelectorAll('[data-help]').forEach(b => b.onclick = () => { showModal('camphelp', { mode: b.dataset.help }); });
    m.querySelectorAll('[data-invcat]').forEach(b=>b.onclick=()=>{if(b.dataset.invsource==='warehouse')warehouseCat=b.dataset.invcat;else invCat=b.dataset.invcat;showModal(modal?.kind==='warehouse'?'warehouse':'inv');});
    m.querySelectorAll('[data-auto-help]').forEach(b=>b.onclick=()=>showModal('autoHelp'));

    m.querySelectorAll('[data-invback]').forEach(b => b.onclick = () => showModal('inv'));
    m.querySelectorAll('[data-equip]').forEach(b => b.onclick = () => { const id = b.dataset.equip; const cat = ITEMS[id].cat; const idx = b.dataset.idx !== undefined ? +b.dataset.idx : undefined; if(b.dataset.targetSlot){const r=Game.equipToSlot(id,b.dataset.targetSlot,idx);if(!r.ok)centerToast(r.reason);showModal('equip');return;} if (cat === 'weapon') { const eq = S().equipment; const ei = S().equipIdx||{}; const SL = ['weapon','weapon2','armor','cloth','accessory']; const slotWith = idx !== undefined ? SL.find(s => eq[s]===id && ei[s]===idx) : SL.find(s => eq[s]===id); if (slotWith) Game.unequip(id, idx); else Game.equip(id, idx); } else { const eq = S().equipment; const on = (eq.weapon===id||eq.weapon2===id||eq.armor===id||eq.cloth===id||eq.accessory===id); if (on) Game.unequip(id); else Game.equip(id, idx); } rerenderEquip(); });
    m.querySelectorAll('[data-unlockslot]').forEach(b => b.onclick = () => { const r = Game.unlockRelicSlot(); if (!r.ok) addLog(r.reason, 'warn'); showModal('equip'); });
    m.querySelectorAll('[data-unequip]').forEach(b => b.onclick = () => { Game.unequipRelic(b.dataset.unequip); showModal('equip'); });
    m.querySelectorAll('[data-equiprelic]').forEach(b => {const equip=()=>{const r=Game.equipRelic(b.dataset.equiprelic);if(!r.ok)addLog(r.reason,'warn');rerenderEquip();};if(b.hasAttribute('data-satchel-settings')){b.onclick=null;bindPress(b,equip,()=>showModal('satchelSettings'));}else b.onclick=equip;});
    m.querySelectorAll('[data-toolslot]').forEach(b => b.onclick = () => { const tk = (Game.S().toolkit || []); const id = tk[+b.dataset.toolslot]; if (id) { Game.unequipTool(id); showModal('equip'); } });
    m.querySelectorAll('[data-equiptool]').forEach(b => b.onclick = () => { const r = Game.equipTool(b.dataset.equiptool); if (!r.ok) addLog(r.reason, 'warn'); rerenderEquip(); });
    m.querySelectorAll('[data-unequiptool]').forEach(b => b.onclick = () => { const r = Game.unequipTool(b.dataset.unequiptool); if (!r.ok) centerToast(r.reason); showModal('equip'); });
    m.querySelectorAll('[data-emptyslot]').forEach(b => b.onclick = () => addLog('请从下方已拥有的神物中点击装备。', 'warn'));
    // 食之包：三个分类各自最多选择三种，点击即保存。
    m.querySelectorAll('[data-bk]').forEach(b => b.onclick = () => {
      const r = Game.backupSlot(+b.dataset.bk);
      if (r.ok) {
        const cs = Game.cloudStatus();   // 备份也会顺带排一次云同步
        addLog(`已备份到备份槽 ${+b.dataset.bk + 1}（第 ${r.day} 天）。` + (cs.supported ? `云存档：${cs.msg}` : '（这台设备没有云存档，备份存在本机）'), 'good');
        centerToast(`已备份到槽 ${+b.dataset.bk + 1}`);
      } else { addLog(r.reason, 'warn'); centerToast(r.reason); }
      showModal('backup');
    });
    m.querySelectorAll('[data-delslot]').forEach(b => b.onclick = () => { const r = Game.delSlot(+b.dataset.delslot); addLog(r.ok ? `已删除备份槽 ${+b.dataset.delslot + 1}。` : r.reason, r.ok ? 'good' : 'warn'); centerToast(r.ok ? `已删除槽 ${+b.dataset.delslot + 1}` : r.reason); showModal('backup'); });
    // 救援：扫描本机所有存档痕迹 → 挑一份恢复
    m.querySelectorAll('[data-rescue="scan"]').forEach(b => b.onclick = () => showModal('rescue'));
    m.querySelectorAll('[data-rescue-go]').forEach(b => b.onclick = () => {
      const src = b.dataset.rescueGo;
      askConfirm('恢复这一份会替换掉当前这一局（当前这份会先自动滚进"上一次保存"里，还能再退回来）。确定吗？', () => {
        const r = Game.restoreLocalSave(src);
        if (!r.ok) { addLog('【救援】' + r.reason, 'warn'); centerToast(r.reason); return; }
        addLog(`【救援】已恢复到第 ${r.day} 天（来源：${src}）。`, 'good');
        centerToast(`已恢复到第 ${r.day} 天`);
        closeModal();
        if (document.querySelector('#title-screen')) showTitle(); else begin();
      }, '恢复这一份');
    });
    m.querySelectorAll('[data-ld]').forEach(b => b.onclick = () => {
      // 「从此继续」= 用备份槽这份覆盖当前这一局，先说清再动
      const cur = S();
      const doLoad = () => {
        const r = Game.loadSlot(+b.dataset.ld);
        if (r.ok) { closeModal(); begin(); } else addLog(r.reason, 'warn');
      };
      if (cur && cur.day > 1) {
        askConfirm(`「从此继续」会用这份备份覆盖你当前这一局（第 ${cur.day} 天）。确定吗？`, doLoad, '从这份继续');
        return;
      }
      doLoad();
    });
    m.querySelectorAll('[data-buybp]').forEach(b => b.onclick = () => { const r = Game.buyBackupPoint(); if (r.ok) { addLog('购买了 1 个备份点。', 'good'); } else addLog(r.reason, 'warn'); showModal('backup'); });
    m.querySelectorAll('[data-codex]').forEach(b => b.onclick = () => showModal('codex', { mode: b.dataset.codex, code: b.dataset.codex === 'export' ? Game.exportCode() : '' }));
    const ccopy = m.querySelector('#codex-copy'); if (ccopy) ccopy.onclick = () => { const t = m.querySelector('#codex-text'); try { t.select(); document.execCommand('copy'); centerToast('已复制，快去粘贴保存吧'); } catch (e) { centerToast('复制失败，请长按文本框手动复制'); } };
    const cd=m.querySelector('#codex-download');if(cd)cd.onclick=()=>downloadBackup(m.querySelector('#codex-text').value);
    const cb=m.querySelector('#codex-current-backup');if(cb)cb.onclick=()=>downloadBackup(Game.exportCode());
    const codeText=m.querySelector('#codex-text'),preview=m.querySelector('#codex-preview');
    const updatePreview=()=>{if(preview){preview.textContent=backupSummary(Game.inspectCode(codeText.value));window.Locale?.apply();}};
    if(preview)codeText.onchange=updatePreview;
    if(preview)codeText.oninput=updatePreview;
    const file=m.querySelector('#codex-file');
    if(file){m.querySelector('#codex-file-pick').onclick=()=>{if(window.GuyuFileBackup?.open)window.GuyuFileBackup.open();else file.click();};file.onchange=async()=>{
      const picked=file.files?.[0];if(!picked)return;
      if(picked.size>20*1024*1024){centerToast('备份文件过大，请确认选择的是存档文本文件。');return;}
      try{const text=await picked.text();if(!codeText.isConnected)return;codeText.value=text;updatePreview();}catch(e){centerToast('无法读取文件，请重新选择或粘贴存档码。');}
    };}
    const cdo=m.querySelector('#codex-do');if(cdo)cdo.onclick=()=>{
      const code=codeText.value,info=Game.inspectCode(code);updatePreview();if(!info.ok){centerToast(info.reason);return;}
      showModal('overlay',{title:'确认导入备份',text:backupSummary(info)+'\n导入会覆盖对应进度。需要保留当前档时，请先备份。',choices:[
        {label:'确认导入',ok:()=>{const r=Game.importCode(code);if(!r.ok){showModal('codex',{mode:'import'});centerToast(r.reason);return;}centerToast(`导入成功：魂点 ${r.soul}、传世 ${r.runs} 世、备份槽 ${r.slots} 个`);if(r.currentGame)begin();else showModal('backup');}},
        {label:'返回',ok:()=>{showModal('codex',{mode:'import'});const t=document.querySelector('#codex-text');t.value=code;t.dispatchEvent(new Event('input'));}}
      ]});
    };
    m.querySelectorAll('[data-titlebuybp]').forEach(b => b.onclick = () => showModal('buybp'));
    m.querySelectorAll('[data-buybp-yes]').forEach(b => b.onclick = () => { const r = Game.buyBackupPoint(); addLog(r.ok ? '购买了 1 个备份点。' : r.reason, r.ok ? 'good' : 'warn'); closeModal(); if ($('#select-screen') && $('.select-title') && $('#select-screen .identity-list').children.length) showJourneySelect(); });
    m.querySelectorAll('[data-buybp-no]').forEach(b => b.onclick = closeModal);
    m.querySelectorAll('[data-buyslot]').forEach(b => b.onclick = () => showModal('buyslot'));
    m.querySelectorAll('[data-buyslot-yes]').forEach(b => b.onclick = () => {
      const r = Game.buyExtraSlot();
      centerToast(r.ok ? '第四存档位已解锁' : r.reason);
      if (r.ok) addLog('用 100 魂点解锁了第四存档位。', 'good');
      if ($('#select-screen')) { closeModal(); showJourneySelect(); } else showModal('backup');
    });
    m.querySelectorAll('[data-buyslot-no]').forEach(b => b.onclick = () => { if ($('#select-screen')) closeModal(); else showModal('backup'); });
    m.querySelectorAll('[data-collectrain]').forEach(b => b.onclick = () => { const r = Game.collectRainWater(); if (!r.ok) addLog(r.reason, 'warn'); showModal('camp'); });
    m.querySelectorAll('[data-collecthoney]').forEach(b => b.onclick = () => { const r = Game.collectHiveHoney(); if (!r.ok) addLog(r.reason, 'warn'); showModal('camp'); });
    m.querySelectorAll('[data-train]').forEach(b => b.onclick = () => { const r = Game.train(b.dataset.train); if (!r.ok && r.reason !== '等待确认') addLog(r.reason, 'warn'); else if (r.ok) showModal('camp'); });
    m.querySelectorAll('[data-demolish]').forEach(b => b.onclick = () => {
      const fid = b.dataset.demolish;
      const furn = FURNITURE.find(f => f.id === fid);
      askConfirm(`确定拆除${furn ? furn.name : '这件家具'}吗？只返还部分材料，拆除后无法撤销。`, () => { Game.demolishFurniture(fid); showModal('camp'); }, '确认拆除');
    });
    m.querySelectorAll('[data-savemenu]').forEach(b => b.onclick = () => {
      const v = b.dataset.savemenu;
    if (v === 'save') {
      Game.save();
      const cs = Game.cloudStatus();                       // 保存 = 本地 + cookie + 尝试云同步（平台限制一分钟一次）
      addLog('已保存。' + (cs.supported ? `云存档：${cs.msg}` : '（这台设备没有云存档，已存到本地 + cookie）'), 'sys');
      showModal('savemenu');
    }
    else if (v === 'sign') showModal('sign');
    else if (v === 'diary') showModal('diary');
      else if (v === 'col') showModal('collection');
      else if (v === 'skill') showModal('skill');
      else if (v === 'backup') showModal('backup');
      else if (v === 'settings') showModal('settings');
      else if (v === 'title') { Game.save(); closeModal(); showTitle(); }
    else if (v === 'guide') showModal('guide');
    else if (v === 'mail') {mailTab='mail';showModal('mailbox');}
    else if (v === 'adshop') showModal('adshop');
    else closeModal();
  });
  // 每日签到：奖励从 Game.dailySignState() 获取（每天一次，账号级）
  m.querySelectorAll('[data-sign]').forEach(b => b.onclick = () => {
    const r = Game.dailySign();
    if (r.ok) {
      centerToast(`签到成功：魂点 +${r.soul} · 备份点 +${r.backup}`);
      addLog(`每日签到：魂点 +${r.soul}，备份点 +${r.backup}。`, 'good');
      try { AudioFX.play('good'); } catch (e) {}
    } else centerToast(r.reason || '今天已经签过了');
    showModal('sign');   // 重渲染，按钮变成"今天已领过"
  });
    // 设置面板里的「图鉴 · 每日签到」入口（标题页与游戏内共用这一块）
    m.querySelectorAll('[data-open]').forEach(b => b.onclick = () => {
      AudioFX.init();
      showModal(b.dataset.open === 'sign' ? 'sign' : 'collection');
    });
    // 设置面板
    m.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
      const v = b.dataset.set;
      const settingsScroll=m.querySelector('.help-list')?.scrollTop||0;
      AudioFX.init();
      // 声音三件套：现在是一行里的单按钮开关（点一下翻转）
      if (v === 'audio:music') AudioFX.toggle();
      else if (v === 'audio:sfx') AudioFX.toggleSfx();
      else if (v === 'audio:voice') AudioFX.toggleVoice();
      else if (v === 'audio:amb') AudioFX.toggleAmbient();
      // 「试听／停止首领曲」按钮已按作者 2026-09-25 要求删除。
      // ⚠️ 删的**只是这个试听入口**（和 previewBoss）：首领战本身照旧会切首领主题（见 renderCombat 里的 setBoss）。
      else if (v === 'music:on' && !AudioFX.enabledState()) AudioFX.toggle();
      else if (v === 'music:off' && AudioFX.enabledState()) AudioFX.toggle();
      else if (v === 'sfx:on' && !AudioFX.sfxState()) AudioFX.toggleSfx();
      else if (v === 'sfx:off' && AudioFX.sfxState()) AudioFX.toggleSfx();
      else if (v === 'amb:on' && !AudioFX.ambientState()) AudioFX.toggleAmbient();
      else if (v === 'amb:off' && AudioFX.ambientState()) AudioFX.toggleAmbient();
      else if (v==='autoTools') {const r=Game.setAutoTools(!Game.autoToolsEnabled());if(!r.ok)centerToast(r.reason);}
      else if (v==='sceneScroll') { sceneScroll=!sceneScroll;try{localStorage.setItem('guyuyizhang_scene_scroll',sceneScroll?'1':'0');}catch(e){} scenePanY=0;mapPanY=0;fitStage();render(); }
      else if (v === 'obj:on') setShowObjective(true);
      else if (v === 'obj:off') setShowObjective(false);
      else if (v.startsWith('log:')) setLogMode(v.slice(4));
      else if (v.startsWith('logw:')) setLogSize(v.slice(5));
      else if (v.startsWith('skin:')) {
        // 多选：同一个按钮点一下开、再点一下关（作者 2026-09-23）
        const id = v.slice(5);
        const wasOn = skinOn(id);
        enableSkin(id, !wasOn);
        const nm = (SKINS.find(s => s.id === id) || {}).name || id;
        addLog(wasOn ? `已关闭皮肤包「${nm}」——当前：${skinName()}。` : `已开启皮肤包「${nm}」——当前：${skinName()}。`, 'sys');
      }
      else if (v === 'skinoff:1') {
        clearSkins();
        addLog('已切回墨白原味（皮肤包全部关闭）。', 'sys');
      }
      showModal('settings');
      if(m.querySelector('.help-list'))m.querySelector('.help-list').scrollTop=settingsScroll;
    });
    // 付费皮肤各 50 魂点（账号级，永久解锁）；免费全彩地图包可直接切换。
    m.querySelectorAll('[data-askin]').forEach(b => b.onclick = () => {
      const id = b.dataset.askin;
      const r = Game.unlockSkin(id);
      if (r.ok) {
        enableSkin(id, true);
        const nm = (SKINS.find(s => s.id === id) || {}).name || id;
        addLog(`已解锁皮肤包「${nm}」（消耗 ${r.cost} 魂点，现有 ${Game.metaState().soul}）。`, 'good');
        try { centerToast(`解锁成功：${nm}`); } catch (e) {}
        try { AudioFX.play('good'); } catch (e) {}
      } else {
        addLog(r.reason, 'warn');
        try { centerToast(r.reason); } catch (e) {}
      }
      showModal('settings');
    });
    m.querySelectorAll('[data-sleep]').forEach(b => b.onclick = () => {
      const k = b.dataset.sleep;
      closeModal();
      if (k === 'watch') { Game.sleep(k); return; }          // 守夜是清醒的，不放睡觉动画
      const lbl = { nap:'小睡 2 小时', normal:'安稳睡觉 8 小时' }[k] || '睡觉';
      withAnimation('sleep', lbl, () => Game.sleep(k), k === 'nap' ? 'sleep_nap' : 'sleep_night');
    });
    m.querySelectorAll('[data-meta-buy]').forEach(b => b.onclick = () => {
      if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; }
      const nd = META_NODES.find(n => n.id === b.dataset.metaBuy);
      const r = Game.metaBuy(b.dataset.metaBuy);
      if (!r.ok) addLog(r.reason, 'warn');
      else { addLog(`${nd.name} 升至 Lv${r.level}！`, 'good'); AudioFX.play('good'); }
      showModal('heirloom');
    });
    const dp = $('#devpw'); if (dp) dp.focus();
    const doDev = (pw) => { const r = Game.unlockDev(pw); if (r.ok) { addLog('开发者模式已解锁！获得 10000 魂点。', 'good'); closeModal(); } else addLog(r.reason, 'warn'); };
    m.querySelectorAll('#devpw-ok').forEach(b => b.onclick = () => { const i = $('#devpw'); doDev(i ? i.value.trim() : ''); });
    m.querySelectorAll('#devpw').forEach(i => i.onkeydown = (e) => { if (e.key === 'Enter') doDev(i.value.trim()); });
    m.querySelectorAll('[data-sleeplock]').forEach(b => b.onclick = () => { addLog(`守夜将在第一次夜袭（第 ${Game.raidDay()} 天清晨）后解锁。`, 'warn'); });
    m.querySelectorAll('[data-craftbatch]').forEach(b => b.onclick = () => showModal('batch', {recipe:b.dataset.craftbatch}));
    m.querySelectorAll('[data-recipe]').forEach(b => {
      const doTap = () => {
        if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; }
        const r = Game.craftRecipe(RECIPES.find(x => x.id === b.dataset.recipe)); const cook = ['fire','pot','stove'].includes(r.station);
        withAnimation('craft', r.name, () => { const previous = modal; Game.craft(r); if (modal === previous && !S().death) rerenderCraft(); }, cook ? 'pot' : 'hammer_icon');
      };
      const doLong = () => {
        if (b.dataset.reason) { addLog(b.dataset.reason, 'warn'); return; }
        const r = Game.craftRecipe(RECIPES.find(x => x.id === b.dataset.recipe));
        // 晾肉架这类"挂上去等时间"的配方没有批量：一副架子一次只挂一批，长按只提醒一句
        if (r && r.hang) {
          addLog(`${r.name}一次只能挂一批（${Object.entries(Game.craftIn(r)).map(([k, v]) => `${ITEMS[k].name}×${v}`).join('、')}），晾好取下来再挂。`, 'sys');
          return;
        }
        showModal('batch', { recipe: r.id });
      };
      bindPress(b, doTap, doLong);
    });
    m.querySelectorAll('[data-item]').forEach(b=>{b.onclick=null;if(kind==='warehouse'){bindWarehouseCard(b,b.dataset.item,'in');return;}bindPress(b,()=>{const mc=m.querySelector('.work-scroll');invScroll=mc?mc.scrollTop:0;openItemDetail(b.dataset.item);},()=>showModal('batchn',{kind:'discard',item:b.dataset.item,fromWarehouse:false,returnKind:modal?.kind}));});
    m.querySelectorAll('[data-station]').forEach(b => b.onclick = () => {
      if (b.classList.contains('locked')) { addLog(b.dataset.station === 'fire' && S().scene === 'camp' ? '需要先建造篝火。' : S().scene !== 'camp' ? '这些工坊都在营地里，回营地才能使用。' : b.dataset.station === 'furniture' ? '需要先建造对应家具（纺车/织布机/研钵/药炉/灶台/晾肉架/制革架等）。' : '还没有这个工位，先去营地建造吧。', 'warn'); return; }
      craftTab = b.dataset.station;
      craftGroup = 'all';
      showModal('craft');
    });
    m.querySelectorAll('[data-craftgroup]').forEach(b => b.onclick = () => {
      craftGroup = b.dataset.craftgroup;
      showModal('craft');
    });
    m.querySelectorAll('[data-ttab]').forEach(b => b.onclick = () => { laoTab = b.dataset.ttab; m.querySelectorAll('[data-ttab]').forEach(x => x.classList.remove('active')); b.classList.add('active');
      showModal('laochao');
    });
    m.querySelectorAll('[data-shop]').forEach(b => b.onclick = () => {
      m.querySelectorAll('[data-shop]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      if (b.classList.contains('locked')) { addLog('声望不够，摊主摆摆手。', 'warn'); return; }
      townShopNow = b.dataset.shop;                 // 记住选的摊位：买完重建后还停在这家
      showModal('town');
    });
    m.querySelectorAll('[data-buy]').forEach(b => {
      const e = LAOCHAO.sell.find(x => x.id === b.dataset.buy) || {};
      const cur = b.dataset.currency || e.currency || 'beibi';
      const unit = Game.priceOf(e.base || 0, false, b.dataset.buy);
      const isBp = e.kind === 'bp';
      const doTap = () => {
        if (isBp && Game.invCount(b.dataset.buy) > 0) return;
        Game.buyFromMerchant(b.dataset.buy, 1, LAOCHAO.sell, false);
        showModal('laochao');
      };
      const doLong = () => {   // 长按 = 批量购买（图纸只能买一份，也照样弹批量条，避免"长按没反应"）
        if (isBp) { showModal('batchn', { kind:'buy', item:b.dataset.buy, shop:'LAOCHAO', max:1 }); return; }
        const mx = Math.max(1, Math.min(99, Math.floor(Game.invCount(cur) / Math.max(1, unit))));
        if (Game.invCount(cur) < unit) { doTap(); return; }
        showModal('batchn', { kind:'buy', item:b.dataset.buy, shop:'LAOCHAO', max:mx });
      };
      b.onclick = null; bindPress(b, doTap, doLong);
    });
    m.querySelectorAll('[data-sell]').forEach(b => {
      const id = b.dataset.sell;
      const doTap = () => { Game.sellToMerchant(id, 1, LAOCHAO.buy, false); showModal('laochao'); };
      const doLong = () => showModal('batchn', { kind:'sell', item:id, list:'LAOCHAO' });
      b.onclick = null; bindPress(b, doTap, doLong);
    });
    // 兑换（双向）：dir = 'shell' 贝壳→金币 / 'coin' 金币→贝壳。
    // 作者 2026-09-25：**和上面的出售完全一样** —— 点一下换 1 份、长按走批量面板，
    // 不再有单独的「全部」按钮，也没有那段兑换说明（原来那套确认弹窗一起去掉了）。
    const doExchange = (dir, want) => {
      const r = dir === 'coin' ? Game.exchangeGold(want) : Game.exchangeShells(want);
      if (!r || !r.ok) { const why = (r && r.reason) || '兑换失败。'; addLog(why, 'warn'); centerToast(why); }
      showModal('laochao');
    };
    m.querySelectorAll('[data-exshell]').forEach(b => {
      const doTap = () => doExchange('shell', 1);
      const doLong = () => showModal('batchn', { kind:'exchange', dir:'shell' });
      b.onclick = null; bindPress(b, doTap, doLong);
    });
    m.querySelectorAll('[data-exgold]').forEach(b => {
      const doTap = () => doExchange('coin', 1);
      const doLong = () => showModal('batchn', { kind:'exchange', dir:'coin' });
      b.onclick = null; bindPress(b, doTap, doLong);
    });
    m.querySelectorAll('[data-comm]').forEach(b => b.onclick = () => {
      Game.completeCommission(Game.commissions().find(c => c.id === b.dataset.comm));
      showModal('laochao');
    });
    bindCellarControls(m);
    m.querySelectorAll('[data-book-open]').forEach(b=>b.onclick=()=>showModal('bookFocus'));
    m.querySelectorAll('[data-cellar-open]').forEach(b=>b.onclick=()=>showModal('cellar'));
    m.querySelectorAll('[data-book-focus]').forEach(b=>b.onclick=()=>{const r=Game.setFocus(b.dataset.bookFocus);centerToast(r.ok?'集中方向已更新':r.reason);if(r.ok)showModal('bookFocus');});
    m.querySelectorAll('[data-cellar-deposit]').forEach(b=>b.onclick=()=>showModal('cellarDeposit'));
    m.querySelectorAll('[data-cellar-item]').forEach(b=>bindPress(b,()=>openItemDetail(b.dataset.cellarItem,'cellar'),()=>showModal('batchn',{kind:'discard',item:b.dataset.cellarItem,fromWarehouse:'cellar'})));
    m.querySelectorAll('[data-transfer-help]').forEach(b=>bindPress(b,()=>showModal('transferHelp')));
    m.querySelectorAll('[data-warehouse-auto]').forEach(b=>{b.onclick=null;bindPress(b,()=>{const a=Game.warehouseAccessCheck(false);if(!a.ok){centerToast(a.reason);return;}showModal('warehouseAuto');});});
    m.querySelectorAll('[data-save-warehouse-auto]').forEach(b=>b.onclick=()=>{const ids=[...m.querySelectorAll('[data-auto-item]:checked')].map(e=>e.dataset.autoItem),r=Game.setWarehouseAutoItems(ids);if(r.ok){if(b.hasAttribute('data-store-now')){const stored=Game.autoStoreWarehouse();centerToast(stored?.ok?(stored.moved?'已存入'+stored.moved+'份物品。':'暂无可存物资或仓库已满。'):(stored?.reason||'现在无法存入仓库。'));}else centerToast('已保存，下次回营时自动存入。');showModal('warehouse');}else centerToast(r.reason);});
    m.querySelectorAll('[data-eqpick]').forEach(b=>{const open=e=>{if(e?.target?.closest('[data-unequip-slot]'))return;e?.stopPropagation();showModal('equipPick',{kind:b.dataset.eqpick});};if(b.hasAttribute('data-satchel-settings')){b.onclick=null;bindPress(b,open,()=>showModal('satchelSettings'));}else b.onclick=open;b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(e);}};});
    m.querySelectorAll('[data-loadout-back]').forEach(b=>b.onclick=()=>showModal('equip'));
    m.querySelectorAll('[data-unpack]').forEach(b=>b.onclick=()=>{Game.equipBackpack(null);showModal('equip');});
    m.querySelectorAll('[data-equiptab]').forEach(b => b.onclick = () => { equipTab = b.dataset.equiptab; showModal('equip'); });
    // 「装备 → 属性」里的结局结算按钮（作者 2026-09-23 从右下角搬来）。
    // ⚠️ 结算成功会走 onEnding → showEnding 铺一层全屏 #ending-screen；
    //    不先关掉装备面板的话，结局画面会盖在面板上、面板还留着（时间被冻结看不出，但视觉是叠的）。
    // ⚠️ data-settle 存的是 **'endA' 这种完整 id**（a.id 是 'settle_endA'，slice(7) 正好切掉 'settle_'），
    //    所以这里直接把它交给 settleEnding —— 别再拼一次 'end'，那会变成 'endendA'，
    //    settleEnding 里取 flags['ended_endA'] 拿不到东西，按钮点了毫无反应（第一版就这么错的）。
    // 作者 2026-09-25："属性栏任务下面的点击之后也应该出现确认弹窗，而不是直接结算。"
    //   —— 结算**一局只能做一次、做完不能撤销**，手滑点一下就把这一生的收尾方式定死了，值得问一句。
    //   ⚠️ 这里不能图省事用 askConfirm()：它的「取消」是写死的空回调，而 [data-choice] 的处理器
    //      会**先 closeModal() 再调 ok()** —— 那样点「取消」会把整个装备面板关掉。
    //      所以自己写 overlay，两个分支各自回到该回的地方。
    const doSettle = (id) => {
      const r = Game.settleEnding(id);
      if (r && r.ok === false && r.reason) { addLog(r.reason, 'warn'); centerToast(r.reason); showModal('equip'); return; }
      closeModal();
    };
    m.querySelectorAll('[data-settle]').forEach(b => b.onclick = () => {
      const id = b.dataset.settle;
      const label = b.textContent.trim();
      showModal('overlay', {
        title: '确认结算',
        text: `确定要「${label}」吗？\n\n`
          + `· 一个存档只能结算一个结局：结算之后，别的结局不会再出现在这里（本局照样能继续玩）。\n`
          + `· 这一生的战绩会折算成魂点，汇入《历代遗章》。\n`
          + `· 结算不能撤销，请再确认一次。`,
        choices: [
          { label: '确定结算', ok: () => doSettle(id) },
          { label: '取消', hint: '回到属性面板', ok: () => showModal('equip') },
        ],
      });
    });
    m.querySelectorAll('[data-pack]').forEach(b=>b.onclick=()=>{const r=Game.equipBackpack(b.dataset.pack);if(!r.ok)centerToast(r.reason);showModal(modal?.kind==='equipPick'?'equip':'inv');});
    m.querySelectorAll('[data-bag-open]').forEach(b=>b.onclick=()=>showModal('inv'));
    m.querySelectorAll('[data-warehouse-item]').forEach(b=>{b.onclick=null;bindWarehouseCard(b,b.dataset.warehouseItem,'out');});
    m.querySelectorAll('[data-warehouse-open]').forEach(b=>b.onclick=()=>showModal('warehouse'));
    m.querySelectorAll('[data-infusion-open]').forEach(b=>b.onclick=()=>showModal('nightmareInfusion'));
    m.querySelectorAll('[data-infusion-tier]').forEach(b=>b.onclick=()=>showModal('nightmareInfusion',{soul:b.dataset.infusionTier}));
    m.querySelectorAll('[data-infuse]').forEach(b=>b.onclick=()=>{b.disabled=true;const r=Game.infuseNightmare(b.dataset.soul,b.dataset.infuse);showModal('nightmareInfusion',{soul:b.dataset.soul});centerToast(r.ok?'你的选择已被铭刻。':r.reason);});
    m.querySelectorAll('[data-separator-open]').forEach(b=>b.onclick=()=>showModal('separator'));
    m.querySelectorAll('[data-separate]').forEach(b=>b.onclick=()=>{const r=Game.separateSouls(+b.dataset.separate,b.dataset.soulId);showModal('separator');const out=document.getElementById('separate-result');if(out)out.textContent=r.ok?Object.entries(r.rewards).map(([id,n])=>ITEMS[id].name+'×'+n).join('、')+(r.soul?' · 魂点+'+r.soul:'')+(r.coins?' · 星之点+'+r.coins:''):r.reason;});
    m.querySelectorAll('[data-unequip-slot]').forEach(b => b.onclick = () => { const k = b.dataset.unequipSlot; const id = S().equipment[k]; if (id) { Game.unequip(id, (S().equipIdx || {})[k] || 0); } rerenderEquip(); });
    m.querySelectorAll('[data-crafthelp]').forEach(b => b.onclick = () => showModal('crafthelp'));
    m.querySelectorAll('[data-dry]').forEach(b => b.onclick = () => {
      const r = Game.dryCollect('rack');
      if (r && !r.ok) addLog(r.reason, 'warn');
      rerenderCraft();
    });
    m.querySelectorAll('[data-repair-broken]').forEach(b=>b.onclick=()=>{const r=Game.repairWeapon(b.dataset.repairBroken);if(!r.ok) centerToast('材料不足，或当前无法修复。');showModal(kind,cfg);});
    m.querySelectorAll('[data-grind]').forEach(b => b.onclick = () => { const a = b.dataset.grind; if (a === 'sharpen') Game.sharpen(); else if (a === 'repair') Game.repairWeapon(); else showModal('naming'); });
    m.querySelectorAll('[data-mailtab]').forEach(b => b.onclick = () => { mailTab = b.dataset.mailtab; showModal('mailbox'); });
    const changeGuidePage = page => {
      guidePage = Math.max(0, Math.min(GUIDE.length - 1, page));
      const host = kind === 'mailbox' ? 'mailbox' : 'guide';
      showModal(host, {guidePageChange:true});
      const content = $('#modal .modal-content'); if (content) content.scrollTop = 0;
    };
    m.querySelectorAll('[data-guide-step]').forEach(b => b.onclick = () => changeGuidePage(guidePage + Number(b.dataset.guideStep)));
    m.querySelectorAll('[data-guide-page]').forEach(b => b.onchange = () => changeGuidePage(Number(b.value)));
    // ⚠️ 这里以前写的是一个裸的 change 调用 —— 但 ui.js 的作用域里根本没有这个函数（那是 game.js 内部的），
    //    一调用就 ReferenceError：领邮件不会刷新、兑换码不切页、新手引导点"跳过"没反应。
    //    统一改成公开 API Game.change()（它会走到界面绑定的 onChange → render()）。
    m.querySelectorAll('[data-claimmail]').forEach(b => b.onclick = () => { const r = Game.claimMailbox(+b.dataset.claimmail); centerToast(r.msg || r.reason); Game.change(); showModal('mailbox'); });
    // 每日晨报里的陷阱选择
    m.querySelectorAll('[data-dailytrap]').forEach(b => b.onclick = () => {
      const r = Game.claimDailyTrap(b.dataset.dailytrap);
      if (r && !r.ok) addLog(r.reason, 'warn');
      closeModal();
    });
    const rd = m.querySelector('[data-revive2]') || null;
    const rdo = m.querySelector('#redeem-do'); if (rdo) rdo.onclick = async () => {
      if (rdo.disabled) return;
      const inp = m.querySelector('#redeem-code'), code = inp ? inp.value : '';
      rdo.disabled = true; rdo.textContent = '正在兑换…';
      let r;
      try { r = await Game.redeemCode(code); }
      catch (_) { r = {ok:false,reason:'兑换暂未完成，请保留兑换码并重试'}; }
      centerToast(r.msg || r.reason);
      if (!r.ok) addLog(r.reason, 'warn'); else { mailTab = 'mail'; Game.change(); }
      // A player may close this modal while waiting for the network.
      if (m.contains(rdo)) {
        if (r.ok) showModal('mailbox');
        else { rdo.disabled = false; rdo.textContent = '兑 换'; }
      }
    };
    const ndo = m.querySelector('#name-do'); if (ndo) ndo.onclick = () => { Game.nameWeapon(m.querySelector('#name-input').value); rerenderCraft(); };
    m.querySelectorAll('[data-helprules]').forEach(b => b.onclick = () => { comTab = 'p1'; showModal('comhelp'); });
    m.querySelectorAll('[data-commtab]').forEach(b => b.onclick = () => { comTab = b.dataset.commtab; showModal('comhelp'); });
    // ---- 技能树（B1）----
    m.querySelectorAll('[data-skilltree]').forEach(b => b.onclick = () => showModal('skilltree', { kind: b.dataset.skilltree }));
    m.querySelectorAll('[data-trunkup]').forEach(b => b.onclick = () => {
      const [k, o] = String(b.dataset.trunkup).split(':');
      const r = Game.skillUpTrunk(k, o);
      if (!r.ok) addLog(r.reason, 'warn');
      showModal('skilltree', { kind: k });
    });
    m.querySelectorAll('[data-nodelearn]').forEach(b => b.onclick = () => {
      const [k, id] = String(b.dataset.nodelearn).split(':');
      const r = Game.skillNodeLearn(k, id);
      if (!r.ok) addLog(r.reason, 'warn');
      showModal('skilltree', { kind: k });
    });
    m.querySelectorAll('[data-nodeforget]').forEach(b => b.onclick = () => {
      const [k, id] = String(b.dataset.nodeforget).split(':');
      const r = Game.skillNodeForget(k, id);
      if (!r.ok) addLog(r.reason, 'warn');
      showModal('skilltree', { kind: k });
    });
    // 主干遗忘：想换流派时把主干也退回去（只能从最末端退，返还一半）
    m.querySelectorAll('[data-trunkforget]').forEach(b => b.onclick = () => {
      const k = String(b.dataset.trunkforget);
      const r = Game.skillTrunkForget(k);
      if (!r.ok) addLog(r.reason, 'warn');
      else try { centerToast(`主干退到 ${r.lv} 级 · 返还 ${r.gain}`); } catch (e) {}
      showModal('skilltree', { kind: k });
    });
    { const stb = m.querySelector('#st-back'); if (stb) stb.onclick = () => showModal('skill'); }
    // 云存档：手动上传一次（内部仍受 60 秒节流保护，顶多提示"等一会儿"）
    const bn = $('#batch-n');
    if (bn) {
      const recipe = Game.craftRecipe(RECIPES.find(x => x.id === cfg.recipe));
      const up = () => { $('#batch-count').textContent = bn.value; $('#batch-time').textContent = Game.craftMinutes(recipe) * Number(bn.value); $('#batch-output').textContent = '产出：' + Object.entries(recipe.out).map(([k,v]) => `${ITEMS[k].name}×${v * Number(bn.value)}`).join('、') + ' · 材料：' + Object.entries(Game.craftIn(recipe,Number(bn.value))).map(([k,v]) => `${ITEMS[k].name}×${v}`).join('、'); };
      bn.oninput=up; bn.onchange=up;
      m.querySelectorAll('[data-cset]').forEach(b => b.onclick = () => {
        bn.value = b.dataset.cset === '1' ? 1 : b.dataset.cset === 'half' ? Math.max(1, Math.floor(+bn.max / 2)) : bn.max; up();
      });
      $('#batch-do').onclick = () => {
        const n=+bn.value,cook=['fire','pot','stove'].includes(recipe.station);
        const res=Game.craftBatch(recipe,n,(run,actual)=>{
          const previous=modal;
          withAnimation('craft',recipe.name+' ×'+actual,()=>{
            // 数量选择暂停被动时间；确认的制作仍须结算实际耗时。
            const frozen=Game.timeFrozen();let result;
            Game.setTimeFreeze(false);
            try{result=run();}finally{Game.setTimeFreeze(frozen);}
            if(result.pending||modal!==previous||S().death)return;
            if(!result.ok){centerToast(result.reason||'无法制作');return;}rerenderCraft();
          },cook?'pot':'hammer_icon');
        });
        if(!res.pending&&!res.ok)centerToast(res.reason||'无法制作');
      };
    }
    // 数量快捷档（手机端不用精确拖滑块）：1 / 一半 / 全部
    m.querySelectorAll('[data-bset]').forEach(x => x.onclick = () => {
      const inp = $('#batchn-n'); if (!inp) return;
      const mx = +inp.max || 1;
      const v = x.dataset.bset === '1' ? 1 : x.dataset.bset==='10'?Math.min(10,mx):(x.dataset.bset === 'half' ? Math.max(1, Math.round(mx / 2)) : mx);
      inp.value = v; inp.dispatchEvent(new Event('input'));
      const c = $('#batchn-count'); if (c) c.textContent = v;
    });
    // 批量条：数量/合计实时更新；确定后按商店类型回到正确的界面
    const bnn = $('#batchn-n');
    m.querySelectorAll('#modal-transfer-back').forEach(b=>b.onclick=()=>{if(cfg.returnKind==='warehouse'){showModal('warehouse');restoreInvScroll();}else openItemDetail(cfg.item,cfg.dir!=='in');});
    if (bnn) {
      const bc2 = $('#batchn-count');
      const up2 = () => {
        if (bc2) bc2.textContent = bnn.value;
        const tt = $('#batchn-total');
        if (tt && modal && modal.cfg) {
          const n2 = +bnn.value || 0;
          if (modal.cfg.kind === 'exchange') tt.textContent = modal.cfg.dir === 'coin' ? `${n2 * Game.SHELL_FOR_COIN} 贝壳` : `${n2} 金币`;
          else if (modal.cfg._unit) tt.textContent = modal.cfg._unit * n2;
        }
      };
      bnn.oninput=up2; bnn.onchange=up2;
      const bd2 = $('#batchn-do');
      if (bd2) bd2.onclick = () => {
        const cfg2 = modal.cfg, n = +bnn.value;
        if(cfg2.kind==='cellar'){const r=Game.transferCellar(cfg2.item,n,cfg2.dir==='in');if(!r.ok){centerToast(r.reason);return;}centerToast((cfg2.dir==='in'?'存入':'取出')+ITEMS[cfg2.item].name+'×'+r.moved);showModal('cellar');return;}
        if(cfg2.kind==='warehouse'){const deposit=cfg2.dir==='in',r=Game.transferWarehouse(cfg2.item,n,deposit);if(!r.ok){centerToast(r.reason);return;}centerToast((deposit?'存入':'取出')+ITEMS[cfg2.item].name+'×'+r.moved);showModal(cfg2.returnKind||(deposit?'inv':'warehouse'));return;}
        if(cfg2.kind==='discard'){const r=Game.discardItems(cfg2.item,n,cfg2.fromWarehouse||false);if(!r.ok){centerToast(r.reason);return;}centerToast('丢弃'+ITEMS[cfg2.item].name+'×'+r.moved);showModal(cfg2.returnKind||(cfg2.fromWarehouse==='cellar'?'cellar':cfg2.fromWarehouse?'warehouse':'inv'));return;}
        if (cfg2.kind === 'exchange') {
          const r = cfg2.dir === 'coin' ? Game.exchangeGold(n) : Game.exchangeShells(n);
          if (!r || !r.ok) { const why = (r && r.reason) || '兑换失败。'; addLog(why, 'warn'); centerToast(why); }
          closeModal(); showModal('laochao'); return;
        }
        if (cfg2.kind === 'buy') {
          const key = String(cfg2.shop || '').split(':')[0];
          Game.buyFromMerchant(cfg2.item, n, shopBuyList(cfg2.shop), key === 'BLACK');
          closeModal();
          showModal(key === 'BLACK' ? 'black' : key === 'LAOCHAO' ? 'laochao' : key === 'ATL' ? 'atlTrade' : (cfg2.back || 'town'));
          return;
        }
        const lk = cfg2.list || 'LAOCHAO';
        Game.sellToMerchant(cfg2.item, n, shopSellList(lk), lk === 'BLACK');
        closeModal(); showModal(lk === 'TOWN' ? 'town' : lk === 'BLACK' ? 'black' : lk === 'ATL' ? 'atlTrade' : 'laochao');
      };
    }
    m.querySelectorAll('[data-ctab]').forEach(b => b.onclick = () => { colTab = b.dataset.ctab; showModal('collection'); });
    m.querySelectorAll('[data-iteminfo]').forEach(b => b.onclick = () => showModal('itemInfo',{id:b.dataset.iteminfo}));
    m.querySelectorAll('[data-item-back]').forEach(b => b.onclick = () => showModal('collection'));
    bindLottery(m,kind,cfg);
    m.querySelectorAll('[data-acceptc]').forEach(b => b.onclick = () => {
      const r = Game.acceptCommission(Game.commissions().find(c => c.id === b.dataset.acceptc));
      if (!r.ok) addLog(r.reason, 'warn'); else centerToast('已接取委托，3 天内去海域找海盗头目');
      showModal('laochao');
    });
    m.querySelectorAll('[data-firsttrade]').forEach(b => b.onclick = () => { Game.doFirstTrade(); showModal('laochao'); });
    m.querySelectorAll('[data-tbuy]').forEach(b => {
      const [shop, id] = b.dataset.tbuy.split(':');
      // ⚠️ 货架必须按**这个摊位**取：以前写成"informant ? … : smith ? … : 杂货商"的三元链，
      //    任何新摊位（美食家）都会掉进最后的杂货商分支 —— 点「买」会拿杂货商的价格去买，
      //    图纸根本买不到（作者 2026-09-25 复核时发现的第二处硬编码）。
      const list = (TOWN[shop] && TOWN[shop].sell) || [];
      const entry = list.find(x => x.id === id) || {};
      const cur = entry.currency || 'beibi';
      const unit = Game.priceOf(entry.base || 0, false, id);
      const back = (modal && modal.kind === 'info') ? 'info' : 'town';
      const doTap = () => { Game.buyFromMerchant(id, 1, list, false); showModal(back); };
      const doLong = () => {
        if (TOWN[shop]) townShopNow = shop;   // 批量面板确认后回集市，也要停在原摊位（任意摊位，不再写死三家）
        if (ITEMS[id].cat === 'bp') { showModal('batchn', { kind:'buy', item:id, shop:b.dataset.tbuy, back, max:1 }); return; }
        const mx = Math.max(1, Math.min(99, Math.floor(Game.invCount(cur) / Math.max(1, unit))));
        if (Game.invCount(cur) < unit) { doTap(); return; }
        showModal('batchn', { kind:'buy', item:id, shop:b.dataset.tbuy, back, max:mx });
      };
      b.onclick = null; bindPress(b, doTap, doLong);
    });
    m.querySelectorAll('[data-tsell]').forEach(b => {
      const id = b.dataset.tsell;
      // ⚠️ 同样别写死三家：按**当前摊位**的收购表算价（美食家收蛋糕/炖肉的价格和杂货商不同）。
      const list = (TOWN[townShopNow] && TOWN[townShopNow].buy) || [];
      const doTap = () => { Game.sellToMerchant(id, 1, list, false); showModal('town'); };
      const doLong = () => showModal('batchn', { kind:'sell', item:id, list:'TOWN' });   // 长按 = 批量卖
      b.onclick = null; bindPress(b, doTap, doLong);
    });
    m.querySelectorAll('[data-bbuy]').forEach(b => { const e = BLACKMARKET.sell.find(x => x.id === b.dataset.bbuy) || {}; const unit = Game.priceOf(e.base || 0, false, b.dataset.bbuy); const doTap = () => { Game.buyFromMerchant(b.dataset.bbuy, 1, BLACKMARKET.sell, true); showModal('black'); }; const doLong = () => { if (ITEMS[b.dataset.bbuy].cat === 'bp') { showModal('batchn', { kind:'buy', item:b.dataset.bbuy, shop:'BLACK', max:1 }); return; } const mx = Math.max(1, Math.min(99, Math.floor(Game.invCount('beibi') / Math.max(1, unit)))); if (Game.invCount('beibi') < unit) { doTap(); return; } showModal('batchn', { kind:'buy', item:b.dataset.bbuy, shop:'BLACK', max:mx }); }; b.onclick = null; bindPress(b, doTap, doLong); });
    m.querySelectorAll('[data-bsell]').forEach(b => { const id = b.dataset.bsell; const doTap = () => { Game.sellToMerchant(id, 1, BLACKMARKET.buy, true); showModal('black'); }; const doLong = () => showModal('batchn', { kind:'sell', item:id, list:'BLACK' }); b.onclick = null; bindPress(b, doTap, doLong); });
    m.querySelectorAll('[data-choice]').forEach(b => b.onclick = () => {
      if (b.disabled || !modal || modal.cfg !== cfg) return;
      m.querySelectorAll('[data-choice]').forEach(x=>x.disabled=true);
      const c = cfg.choices[Number(b.dataset.choice)];
      if (modal && modal.cfg && modal.cfg.requiredChoice) modal.cfg.requiredChoice = false;
      closeModal();
      if (c && c.ok) c.ok();
    });
    m.querySelectorAll('[data-med-id]').forEach(b => b.onclick = () => { Game.useItemInFight(b.dataset.medId); if (Game.S().combat) renderCombat('start', Game.S().combat); else closeModal(); });
    // ⚠️ 战斗中点「道具」→ 这里右上角的 ✕ 原本是"关闭整个弹窗"= 直接把战斗界面关掉，
    //    玩家反馈"点道具再点叉就直接结束本次战斗了"。道具面板的 ✕ 应该 = 返回战斗。
    if (kind === 'medpick') m.querySelectorAll('#modal-close, .modal-x').forEach(b => b.onclick = () => renderCombat('start', Game.S().combat));
    m.querySelectorAll('[data-claim-ach]').forEach(b => b.onclick = () => { const r = Game.achClaim(b.dataset.claimAch); if (!r.ok) addLog(r.reason, 'warn'); showModal('collection'); });
    if (kind === 'farm') bindFarm();
  }
  let invScroll = 0;   // 背包列表的滚动位置：用完/看完东西回来时保留，不用重新翻
  let inventoryReturn='inv',inventoryDualScroll=[0,0];
  function openItemDetail(id,fromWarehouse=false) {
    if(['inv','warehouse','cellar'].includes(modal?.kind))inventoryReturn=modal.kind;
    const panes=$('#modal').querySelectorAll('.inventory-pane .work-scroll');
    if(panes.length===2)inventoryDualScroll=[...panes].map(e=>e.scrollTop);
    const m = $('#modal');
    modalOpenedAt=Date.now(); // pointerup切页后的补发click不得关闭详情
    dom.dispose(m);m.innerHTML = `<div class="modal-content item-detail-modal"><button class="modal-x" aria-label="返回${fromWarehouse==='cellar'?'地窖':fromWarehouse?'仓库':'背包'}">×</button>${itemDetail(id,fromWarehouse)}</div>`;
    m.querySelector('.modal-x').onclick=()=>{showModal(inventoryReturn);restoreInvScroll();};
    const mc = m.querySelector('.modal-content'); if (mc) mc.scrollTop = 0;
    bindItemDetail(id,fromWarehouse);
  }
  function restoreInvScroll() {
    const panes=$('#modal').querySelectorAll('.inventory-pane .work-scroll');
    if(panes.length===2){panes.forEach((e,i)=>e.scrollTop=inventoryDualScroll[i]||0);return;}
    const mc = $('#modal .work-scroll')||$('#modal .modal-content');
    if (mc && invScroll) mc.scrollTop = invScroll;
  }
  // 用掉一个之后：还有就留在这一页接着用（不重新翻背包），没了才回列表
  function afterItemUse(id,source=false) {
    if(S().death||S().ending)return;
    if (Game.itemUseCount(id,source) > 0) openItemDetail(id,source);
    else { showModal(inventoryReturn); restoreInvScroll(); }
  }
  function bindItemDetail(id,fromWarehouse=false) {
    const m = $('#modal');
    bindCellarControls(m);
    m.querySelectorAll('[data-ware-transfer]').forEach(b=>{const transfer=()=>{const r=Game.transferWarehouse(b.dataset.wareTransfer,b.dataset.qty==='all'?(b.dataset.dir==='in'?Game.warehouseDepositCount(b.dataset.wareTransfer):Game.warehouseState().inv[b.dataset.wareTransfer]||0):+b.dataset.qty,b.dataset.dir==='in');if(!r.ok){centerToast(r.reason);return;}centerToast((b.dataset.dir==='in'?'存入':'取出')+ITEMS[id].name+'×'+r.moved);const n=fromWarehouse?Game.warehouseState().inv[id]:Game.invCount(id);if(n>0)openItemDetail(id,fromWarehouse);else showModal(inventoryReturn);};b.onclick=null;b.style.touchAction='none';bindPress(b,transfer,start=>{showModal('batchn',{kind:'warehouse',item:b.dataset.wareTransfer,dir:b.dataset.dir});dragTransferQuantity(start);});});
    m.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { const id = b.dataset.use; const frozen=Game.timeFrozen();Game.setTimeFreeze(false);try{Game.consume(id,fromWarehouse);}finally{Game.setTimeFreeze(frozen);}afterItemUse(id,fromWarehouse); });
    m.querySelectorAll('[data-med]').forEach(b => b.onclick = () => { const id = b.dataset.med; Game.useMed(id,fromWarehouse); afterItemUse(id,fromWarehouse); });
    m.querySelectorAll('[data-equip]').forEach(b => b.onclick = () => { const id = b.dataset.equip; const idx = b.dataset.idx !== undefined ? +b.dataset.idx : undefined; const eq = S().equipment; const on = (eq.weapon===id||eq.weapon2===id||eq.armor===id||eq.cloth===id||eq.accessory===id); if (on) Game.unequip(id); else Game.equip(id, idx); showModal('inv'); restoreInvScroll(); });
    m.querySelectorAll('[data-learn]').forEach(b=>b.onclick=()=>{const r=Game.learnBlueprint(b.dataset.learn,fromWarehouse);centerToast(r.ok?'已学会'+ITEMS[b.dataset.learn].name:r.reason);if(r.ok)openItemDetail(b.dataset.learn,fromWarehouse);});
    // 限定 · 神弓：存入邮箱（跨局）
    m.querySelectorAll('[data-storebow]').forEach(b => b.onclick = () => {
      const r = Game.storeDivineBow();
      if (r && !r.ok) { addLog(r.reason, 'warn'); showModal('inv'); return; }
      showModal('mailbox'); mailTab = 'mail';
    });
    m.querySelectorAll('[data-plant]').forEach(b => b.onclick = () => { closeModal(); Game.travel('farm'); });
  }
  function closeModal() {
    if(restoreCombatView())return;
    if (modal && modal.cfg && modal.cfg.requiredChoice) return;
    clearTimeout(lotteryTimer); lotteryTimer=null; activeMerchant=null; AudioFX.stopVoice();
    const m = $('#modal');dom.dispose(m); m.classList.remove('open'); document.body.classList.remove('modal-open'); m.innerHTML = ''; modal = null;
    if (Game.setTimeFreeze) Game.setTimeFreeze(false); render();   // 关弹窗 → 恢复时间
    // 排队的提示性弹窗：等这个关掉再弹（作者 2026-09-25 要求"不要和其他弹窗冲突"）。
    // 用 setTimeout(0) 而不是直接 showModal：先让上面这轮 render() 跑完，弹窗换得干净。
    showNextPendingPanel();
  }
  function showNextPendingPanel() {
    if(modal || battleView || !pendingPanels.length)return;
    const cfg=pendingPanels.shift();
    setTimeout(()=>{
      if(modal || battleView){pendingPanels.unshift(cfg);return;}
      const kind=['lootExpiry','farm','black','town','mission','info','atlTrade','fishman','daily','winter'].includes(cfg.kind)?cfg.kind:'overlay';
      showModal(kind,cfg);
    },0);
  }
  function rerenderEquip() { const mc = $('#modal .modal-content'); const st = mc ? mc.scrollTop : 0; showModal('equip'); const mc2 = $('#modal .modal-content'); if (mc2) mc2.scrollTop = st; }
  function rerenderCraft() { const mc = $('#modal .recipe-list'); const st = mc ? mc.scrollTop : 0; showModal('craft'); const mc2 = $('#modal .recipe-list'); if (mc2) mc2.scrollTop = st; }
  function renderTut(st) {
    const step = st.tut;
    let t = document.getElementById('tut');
    if (!step && step !== 0) { if (t) t.remove(); return; }
    // ⚠️ 步骤 0 要写成 `step === 0` 单独判断：`if (!step)` 会把 0 当成"没有引导"直接返回。
    const hint = step === 0 ? '新手引导：先点底部【背包】看看开局带的东西（武器/工具可能已经在里面了，别急着做）'
      : step === 1 ? '新手引导：点击底部【制造】→【手工】→ 制作【石镐】'
      : '新手引导：点【装备】→ 工具栏 → 点【石镐】上栏装备';
    if (!t) { t = document.createElement('div'); t.id = 'tut'; t.className = 'tut-banner'; document.body.appendChild(t); }
    t.innerHTML = `<span class="tut-text">${hint}</span><button class="mini-btn" data-tutskip="1">跳过</button>`;
    const sk = t.querySelector('[data-tutskip]'); if (sk) sk.onclick = () => { const s = Game.S(); if (s) s.tut = null; Game.change(); };
  }
  // 引导第 0 步 → 第 1/2 步：玩家打开过一次【背包】就算看过。
  // 已经自带工具（多半是身份初始装备）就直接跳到"去装备"，别让人再白做一把。
  function tutAfterBag() {
    const s = Game.S();
    if (!s || s.tut !== 0) return;
    s.tut = Object.keys(s.inv || {}).some(id => ITEMS[id] && ITEMS[id].tool) ? 2 : 1;
    Game.change();
  }

  // ---------- 耕地 ----------
  function farmModal() {
   const st = S();
   const farm = BUILDING_CHAINS.farm[st.buildings.farm];
    const plots = Game.farmPlots(), ext = Game.farmExt(), extMax = Game.FARM_EXTRA_MAX;
    const hasHoe = Game.invCount('hoe') > 0;
    let html = `<div class="modal-title">耕地（${farm.name}，${st.crops.length}/${plots} 块田）</div>`;
    html += `<div class="hint">${hasHoe ? '锄头在手：可以「松土」让作物早一天成熟' : '没有锄头：只能播种/施肥/收获（锄头=木材×2+石头×1，手工做）'}${ext < extMax ? '，还能「开垦」新田（木材×2）' : ''}。</div>`;
    st.crops.forEach((c, i) => {
      const name = (CROPS[c.seed] && CROPS[c.seed].name) || '作物';
      const canLoosen = hasHoe && c.remain > 0 && !c.tilled;
      html += `<div class="crop-row">${name}：${c.remain <= 0 ? '<b style="color:#111">成熟了！</b>' : `还有 ${c.remain} 天成熟`}
        ${canLoosen ? `<button class="mini-btn" data-loosen="${i}">松土（早1天）</button>` : (c.tilled ? '<span class="hint">（已松土）</span>' : '')}
        ${c.fert ? '<span class="hint">（已施肥）</span>' : (Game.invCount('rot') >= 2 ? `<button class="mini-btn" data-fert="${i}">施肥（腐烂物×2）</button>` : '')}
        ${c.remain <= 0 ? `<button class="mini-btn" data-harvest="${i}">收获</button>` : ''}</div>`;
    });
    if (Game.invCount('rot') > 0 && Game.invCount('rot') < 2) html += `<div class="hint">腐烂物 ${Game.invCount('rot')}/2 —— 攒够 2 个可以给一块地施肥（收获 +50%）。</div>`;
    if (ext < extMax) {
      const canTill = hasHoe && Game.invCount('wood') >= 2;
      html += `<div class="plant-row">开垦新田：${canTill ? '<button class="mini-btn" data-till="1">开垦（木材×2 · 1 小时）</button>' : `<span class="hint">${hasHoe ? '需要木材×2' : '需要一把锄头'}</span>`} <span class="hint">（还能开 ${extMax - ext} 块）</span></div>`;
    }
    if (st.crops.length < plots) {
      html += '<div class="plant-row">播种：';
      let seedAny = false;
      for (const sd in CROPS) {
        if (Game.invCount(sd) > 0) { seedAny = true; html += `<button class="mini-btn" data-plant="${sd}">${ITEMS[sd].name}（有${Game.invCount(sd)}）</button>`; }
      }
      if (!seedAny) html += '<span class="hint">背包里没有种子（盐镇杂货商有卖）。</span>';
      html += '</div>';
    }
    html += '<div class="hint">雨天作物会多长一天；施肥一次 +50% 收成。</div>';
    // ---------- 农田畜牧位（作者 2026-09-25：鸡舍/羊圈搬到农田）----------
    // 农田每升一级 +1 个畜牧位；鸡舍、羊圈只能用这里的位子建，且**不占住房家具位**。
    {
      const cap = Game.farmLiveSlots(), used = Game.farmLiveUsed();
      const liveIds = Game.FARM_LIVESTOCK_IDS;
      html += `<div class="modal-title" style="margin-top:12px">农田畜牧位（${used}/${cap}）</div>`;
      html += `<div class="hint">鸡舍 / 羊圈建在这里，<b>不占住房家具位</b>。农田每升一级 +1 个畜牧位（水田 3 个）。</div>`;
      html += '<div class="furn-grid">';
      for (const id of liveIds) {
        const f = FURNITURE.find(x => x.id === id);
        if (!f) continue;
        const built = !!st.furniture[id];
        if (built) {
          const i = Game.liveInfo(id);
          html += `<div class="furn built">✔ <span class="furn-name">${f.name}（${i.count}/${i.cap}）</span>`
            + `<button class="mini-btn" data-live="${id}">管理</button>`
            + `<button class="mini-btn demolish" data-demolish="${id}">拆除</button></div>`;
          continue;
        }
        const free = used < cap;
        const okF = matsOk(f.mats) && free;
        const reason = !free ? `农田畜牧位满了（${used}/${cap}）——升级农田（营地·农田）会多一个位子。`
                             : (matsOk(f.mats) ? '' : missingReason(f.mats));
        html += `<div class="furn"><span class="furn-name">${f.name}<span class="slot-tag free" title="不占住房家具位，占 1 个农田畜牧位">农田 1 格</span></span><span class="furn-mats">${matsStr(f.mats)}</span>
          <button class="mini-btn ${okF ? '' : 'lockedb'}" data-fid="${f.id}" ${reason ? `data-reason="${esc(reason)}"` : ''}>建造(${(f.time/60).toFixed(1)}h)</button></div>`;
      }
      html += '</div>';
    }
    html += `<div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
    return html;
  }
  function bindFarm() {
    const m = $('#modal');
    m.querySelectorAll('[data-plant]').forEach(b => b.onclick = () => { Game.plant(b.dataset.plant); showModal('farm'); });
    m.querySelectorAll('[data-harvest]').forEach(b => b.onclick = () => { Game.harvest(+b.dataset.harvest); showModal('farm'); });
    m.querySelectorAll('[data-fert]').forEach(b => b.onclick = () => { const r = Game.fertilize(+b.dataset.fert); if (r && !r.ok) addLog(r.reason, 'warn'); showModal('farm'); });
    m.querySelectorAll('[data-loosen]').forEach(b => b.onclick = () => { const r = Game.loosenPlot(+b.dataset.loosen); if (r && !r.ok) addLog(r.reason, 'warn'); showModal('farm'); });
    m.querySelectorAll('[data-till]').forEach(b => b.onclick = () => { const r = Game.tillPlot(); if (r && !r.ok) addLog(r.reason, 'warn'); showModal('farm'); });
    m.querySelectorAll('#modal-close').forEach(b => b.onclick = closeModal);
  }

  // ---------- 日记 / 图鉴 ----------
  function diaryModal() {
    const st = S();
    let html = `<div class="modal-title">我的日记</div><div class="diary-list">`;
    if (!st.diary.length) html += '<div class="hint">日记还是空的。</div>';
    for (const d of st.diary.slice(-40).reverse()) {
      html += `<div class="diary-line"><span class="diary-day">第${d.day}天</span>${esc(d.line)}</div>`;
    }
    html += `</div><div class="modal-actions"><button id="modal-close">合 上</button></div>`;
    return html;
  }
  const COL_CAT_N = { mat:'材料', special:'特殊', bp:'元件', seed:'种子', food:'食物', drink:'饮品', med:'药品', weapon:'武器', armor:'防具', cloth:'衣物', tool:'工具', currency:'货币', accessory:'饰品' };
  const TRAIT_CN = { charge:'冲撞', poison:'剧毒', bleed:'流血', pack:'群袭', group:'群袭', enrage:'狂暴', ironImmune:'铁甲', evade:'闪避', dodge:'闪避', first:'先手', water:'水中', swim:'水中', summon:'召唤', gun:'持枪', flee:'逃跑', nightBuff:'夜战强化', stoneGuard:'石甲反噬', pierce:'穿透', dread:'恐吓', nightStun:'晕眩', nightSplit:'分裂' };
  const COL_STATION_N = { none:'手工', work1:'工具台', work2:'工具台', work3:'工具台', tailor:'裁缝台', furn1:'熔炉', furn2:'熔炉', furn3:'熔炉', smoke1:'烟熏炉', smoke2:'烟熏炉', fire:'篝火', pot:'药锅', spin:'纺车', loom:'织布机', mortar:'研钵', medPot:'药炉', stove:'灶台', rack:'晾肉架', tannery:'制革架' };
  let colTab = 'res';
  function collectionModal() {
    // 没在游戏里（主界面）也能看：账号级图鉴 = 历代存档解锁过的内容
    const st = S() || { seen: {}, killCount: {}, flags: {} };
    const c = Game.collection();
    const tabs = [['res',`资源 ${c.res}/${c.resTotal}`],['tool','工具'],['items','物品'],['mon',`怪物 ${c.mon}/${c.monTotal}`],['rec',`配方 ${RECIPES.filter(r=>!r.legacyPlank).length}`],['boss','首领'],['ach','成就']];
    let html = `<div class="modal-title">图 鉴</div><div class="tabs">${tabs.map(([k,l]) => `<button class="tab ${colTab === k ? 'active' : ''}" data-ctab="${k}">${l}</button>`).join('')}</div>`;
    // （原来这里有一行"标签上的数字是「已收录 / 图鉴总数」……"的说明，玩家要求删掉。
    //   标签上的 "已收录/总数" 本身就够直观，不用再解释一遍。）
    html += `<div class="col-body">`;
    if (colTab === 'res') html += colRes(st);
    else if (colTab === 'tool') html += colTool();
    else if (colTab === 'items') html += colItems(st);
    else if (colTab === 'mon') html += colMon(st);
    else if (colTab === 'rec') html += colRec();
    else if (colTab === 'boss') html += colBoss(st);
    else html += colAch();
    html += '</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>';
    return html;
  }
  function colRes(st) {
    const mm = Game.metaState();
    const ids = Game.resIds();   // 和标题的总数用同一份名单
    let html = '<div class="col-list">';
    for (const id of ids) {
      const it = ITEMS[id];
      const seen = st.seen[id] || mm.seenItems[id];
      html += seen ? `<button class="col-item col-item-button" data-iteminfo="${id}">${it.glyph} ${esc(it.name)}<small>${esc(it.desc || '点击查看数值与用途')}</small></button>` : `<div class="col-item unseen">？？？</div>`;
    }
    return html + '</div>';
  }
  function colTool() {
    const ids = Object.keys(ITEMS).filter(k => ['weapon','tool','armor','cloth'].includes(ITEMS[k].cat));
    let html = '<div class="col-list tools">';
    for (const id of ids) {
      const it = ITEMS[id];
      const parts = [];
      parts.push(COL_CAT_N[it.cat] || it.cat);
      if (it.tool && it.tool.kind) parts.push(`类型：${it.tool.kind === 'axe' ? '斧' : it.tool.kind === 'pick' ? '镐' : it.tool.kind === 'knife' ? '刀' : it.tool.kind === 'hoe' ? '锄' : it.tool.kind === 'net' ? '网' : it.tool.kind === 'rod' ? '钓竿' : it.tool.kind === 'bow' ? '弓' : it.tool.kind}`);
      if (it.atk) parts.push(`攻击 ${it.atk}`);
      if (it.def) parts.push(`防御 ${it.def}`);
      if (it.warm) parts.push(`保暖 ${it.warm}`);
      if (DURA[id] !== undefined) parts.push(`耐久 ${DURA[id]}`);
      if (it.ranged) parts.push('弓箭');
      if (it.throw) parts.push('可投掷');
      if (it.dur) parts.push('持续');
      html += `<button class="col-item col-item-button" data-iteminfo="${id}"><b>${it.glyph} ${esc(it.name)}</b><small>${parts.join(' · ')}</small>${it.desc ? `<small>${esc(it.desc)}</small>` : ''}</button>`;
    }
    return html + '</div>';
  }
  function colItems(st) {
    const seen=(Game.metaState().seenItems || {});
    const ids=Object.keys(ITEMS).filter(id=>st.seen[id] || seen[id]);
    if (!ids.length) return '<div class="hint">发现物品后，可在这里查看数值。</div>';
    return `<div class="col-list tools">${ids.map(id=>{
      const it=ITEMS[id];
      return `<button class="col-item col-item-button" data-iteminfo="${id}"><b>${it.glyph} ${esc(it.name)}</b><small>${COL_CAT_N[it.cat] || it.cat} · 点击查看详细数值</small></button>`;
    }).join('')}</div>`;
  }
  function itemInfoModal(id) {
    const it=ITEMS[id];
    if (!it) return '<div class="modal-title">物品不存在</div><div class="modal-actions"><button id="modal-back">返回图鉴</button></div>';
    const stats=[];
    const keys={atk:'攻击',atkBonus:'额外攻击',def:'防御',spd:'速度',warm:'保暖',food:'饱食',water:'水分',sta:'体力',spirit:'精神',heal:'生命回复',healthRestore:'健康回复',packCapacity:'装备后背包容量',crit:'暴击',acc:'命中',dodge:'闪避',block:'格挡',dive:'耐压等级',diveO2:'供氧',light:'照明等级',spoil:'保鲜时长（小时）',stack:'堆叠上限',price:'基础价值'};
    for (const [key,label] of Object.entries(keys)) if (it[key] !== undefined && it[key] !== null && (key !== 'price' || it[key]>0)) stats.push(`${label}：${['acc','dodge','crit','block'].includes(key) && Math.abs(it[key])<1 ? Math.round(it[key]*100)+'%' : it[key]}`);
    if (DURA[id] !== undefined) stats.push(`基础耐久：${DURA[id]}`);
    if (it.ranged) stats.push('远程武器');
    if(it.twoHand)stats.push('双手武器，占用主副手');
    if(it.hitHeal) stats.push(`受击回复 ${it.hitHeal} 生命`);
    if (it.tool && it.tool.kind) stats.push(`工具：${it.tool.kind}${it.tool.tier ? ' · 等阶 '+it.tool.tier : ''}`);
    const recipes=RECIPES.filter(r=>!r.legacyPlank && r.out && r.out[id]).slice(0,4);
    const made=recipes.map(r=>`${esc(r.name)}（${COL_STATION_N[r.station] || r.station}）`).join('、');
    return `<div class="modal-title">${it.glyph} ${esc(it.name)}</div><div class="overlay-text">${esc(it.desc || '暂无额外说明。')}</div><div class="help-list"><b>数值</b><div>${stats.length ? stats.join(' · ') : '无直接属性；可作材料、交易品或任务物品。'}</div>${made ? `<div>制造：${made}</div>` : ''}</div><div class="modal-actions"><button data-item-back>返回图鉴</button><button id="modal-close">关闭</button></div>`;
  }
  // 充能与抽奖独立结算；界面选项不写入存档。
  let lotteryChoice={id:null,qty:1,cat:'all',run:null};
  let lotteryLast=null, lotteryTimer=null;
  function lotteryIds() { return Object.keys(S().inv||{}).filter(id=>ITEMS[id] && Game.invCount(id)>0); }
  function lotteryNormalize() {
    if(lotteryChoice.run!==S()._runId) { lotteryChoice={id:null,qty:1,cat:'all',run:S()._runId}; lotteryLast=null; }
    const ids=lotteryIds();
    if(!ids.includes(lotteryChoice.id)) lotteryChoice.id=ids[0]||null;
    const have=Game.invCount(lotteryChoice.id);
    lotteryChoice.qty=Math.max(1,Math.min(have,Math.floor(lotteryChoice.qty)));
  }
  function lotteryModal() {
    lotteryNormalize(); const c=lotteryChoice, state=Game.lotteryState(), have=Game.invCount(c.id);
    const value=c.id ? Game.lotteryValue(c.id)*c.qty:0;
    const remaining=Math.max(0,state.limit-state.uses), draws=Math.min(Math.floor(state.credit/state.cost),remaining);
    return `<div class="modal-title">◇ 遗海交换机 <button class="help-dot" data-lottery-pool aria-label="查看奖池">?</button></div>
      <div class="lottery-split"><section class="lottery-charge"><h3>抽奖机充能</h3>
      <button class="lottery-chosen" data-lottery-pick>${c.id?itemIcon(c.id):'＋'}<span>${c.id?esc(ITEMS[c.id].name):'选择投入物品'}<small>背包 ${have} 件 · 点击换物品</small></span></button>
      <div class="lottery-charge-row"><label>数量</label><div class="number-stepper"><button data-lottery-change="qty:-1" aria-label="减少数量">−</button><output id="lottery-qty">${c.qty}</output><button data-lottery-change="qty:1" aria-label="增加数量">＋</button></div></div>
      <div class="lottery-presets">${[1,10,100].map(n=>`<button data-lottery-set="qty:${n}">${n}</button>`).join('')}${have>0?`<button data-lottery-set="qty:${have}">全部</button>`:''}</div>
      <div id="lottery-preview">本次充能 +${value}</div><button id="lottery-submit" ${!c.id||have<c.qty?'disabled':''}>确认充能</button></section>
      <section class="lottery-draw-panel"><h3>抽奖</h3><div class="lottery-energy">能量 <b>${state.credit}</b><small>可抽 ${draws} 次 · 今日 ${state.uses}/${state.limit}</small></div>
      <div class="lottery-draw-buttons">${[1,10].map(n=>`<button data-lottery-draw="${n}" ${draws<n?'disabled':''}><b>${n===1?'单抽':'十连抽'}</b><small>${state.cost*n} 能量</small></button>`).join('')}</div>
      <div class="lottery-guarantee">${state.misses>=9?'下一抽必中奖':`保底进度 ${state.misses}/9`}</div></section></div>
      <div class="modal-actions"><button data-lottery-pool>查看奖池</button>${lotteryLast?'<button data-lottery-last>上次结果</button>':''}<button id="modal-close">关闭</button></div>`;
  }
  function lotteryPickModal() {
    lotteryNormalize(); const cats={all:'全部',food:'食物',mat:'材料',tool:'工具',weapon:'武器',armor:'防具',bp:'图纸',other:'其他'};
    const ids=lotteryIds().filter(id=>lotteryChoice.cat==='all'||ITEMS[id].cat===lotteryChoice.cat||(lotteryChoice.cat==='other'&&!Object.keys(cats).includes(ITEMS[id].cat)));
    return `<div class="modal-title">选择投入物品</div><div class="lottery-inventory"><nav class="lottery-categories">${Object.entries(cats).map(([id,name])=>`<button data-lottery-cat="${id}" class="${id===lotteryChoice.cat?'active':''}">${name}</button>`).join('')}</nav><div class="lottery-items">${ids.map(id=>`<button class="lottery-item" data-lottery-item="${id}">${itemIcon(id)}<b>${esc((ITEMS[id]||RELICS[id]).name)}</b><small>×${Game.invCount(id)}</small><small>价值 ${Game.lotteryValue(id)}/件</small></button>`).join('')||'<div class="hint">没有这类物品。</div>'}</div></div><div class="modal-actions"><button data-lottery-back>返回交换机</button></div>`;
  }
  function lotteryPoolModal() {
    const pools=Game.lotteryPools();
    return `<div class="modal-title">遗海奖池</div><div class="lottery-warning">100 价值/抽 · 常规中奖率 10% · 连续 9 抽未中，第 10 抽保底。各池内奖品等概率；重复神物寄邮箱。</div><div class="lottery-pool">${pools.map(p=>`<section><b>${p.name} · ${p.weight}%</b><small>池内每种奖品各占 ${p.items.length===3?'1/3':p.items.length===8?'1/8':'1/5'}</small><div class="pool-items">${p.items.map(id=>id==='adCoins'?'<span>◇ 星之点 ×2–3</span>':`<span>${itemIcon(id)}${esc((ITEMS[id]||RELICS[id]).name)}${id==='wood'?' ×5–10':id==='honey'?' ×1–2':' ×1'}</span>`).join('')}</div></section>`).join('')}</div><div class="modal-actions"><button data-lottery-back>返回交换机</button></div>`;
  }
  function lotteryResultModal(cfg) {
    const r=lotteryLast; if(!r) return lotteryModal();
    const revealing=!!(cfg&&cfg.animate), rewards=r.rewards||[];
    return `<div class="modal-title">◇ 潮汐回响</div><div class="lottery-stage ${revealing?'is-spinning':'is-revealed'} ${rewards.length?'has-prize':'no-prize'}" aria-busy="${revealing}"><div class="astrolabe"><i class="orbit orbit-a"></i><i class="orbit orbit-b"></i><i class="orbit orbit-c"></i><span class="tide-orb">◇</span>${Array.from({length:12},(_,i)=>`<i class="tide-spark" style="--i:${i}"></i>`).join('')}</div><div class="lottery-outcome" role="status">${revealing?'星环正在归位……':esc(r.msg)}<div class="lottery-rewards">${rewards.map(p=>{if(p.adCoins)return `<span>◇ 星之点 ×${p.adCoins}</span>`;const id=p.item||p.relic; return `<span>${itemIcon(id)}${esc((ITEMS[id]||RELICS[id]).name)}${p.qty?' ×'+p.qty:''}</span>`;}).join('')}</div></div></div><div class="modal-actions">${revealing?'<button data-lottery-skip>跳过动画</button>':'<button data-lottery-back>继续投入</button><button id="modal-close">关闭</button>'}</div>`;
  }
  function revealLottery() {
    clearTimeout(lotteryTimer); lotteryTimer=null;
    if (!modal || modal.kind!=='lotteryResult' || !lotteryLast) return;
    showModal('lotteryResult',{animate:false}); AudioFX.play(lotteryLast.rewards.length?'lotteryWin':'lotteryEmpty');
  }
  function bindLottery(m,kind,cfg) {
    m.querySelectorAll('[data-lottery-pick]').forEach(b=>b.onclick=()=>showModal('lotteryPick'));
    m.querySelectorAll('[data-lottery-pool]').forEach(b=>b.onclick=()=>showModal('lotteryPool'));
    m.querySelectorAll('[data-lottery-back]').forEach(b=>b.onclick=()=>showModal('lottery'));
    m.querySelectorAll('[data-lottery-last]').forEach(b=>b.onclick=()=>showModal('lotteryResult',{animate:false}));
    m.querySelectorAll('[data-lottery-cat]').forEach(b=>b.onclick=()=>{lotteryChoice.cat=b.dataset.lotteryCat;showModal('lotteryPick');});
    m.querySelectorAll('[data-lottery-item]').forEach(b=>b.onclick=()=>{lotteryChoice.id=b.dataset.lotteryItem;lotteryChoice.qty=1;showModal('lottery');});
    m.querySelectorAll('[data-lottery-change],[data-lottery-set]').forEach(b=>b.onclick=()=>{
      const [key,num]=(b.dataset.lotteryChange||b.dataset.lotterySet).split(':');
      if(key!=='qty')return;
      lotteryChoice.qty=b.dataset.lotteryChange?lotteryChoice.qty+Number(num):Number(num);showModal('lottery');
    });
    m.querySelectorAll('[data-lottery-skip]').forEach(b=>b.onclick=revealLottery);
    m.querySelectorAll('[data-lottery-draw]').forEach(b=>b.onclick=()=>{if(b.disabled)return;b.disabled=true;const n=Number(b.dataset.lotteryDraw),state=Game.lotteryState();if(![1,10].includes(n)||state.credit<state.cost*n||state.limit-state.uses<n){centerToast('能量或今日剩余次数不足。');showModal('lottery');return;}const r=Game.lotteryDraw(n);if(!r.ok){centerToast(r.reason);showModal('lottery');return;}lotteryLast=r;showModal('lotteryResult',{animate:true});});
    const submit=m.querySelector('#lottery-submit');
    if(submit) submit.onclick=()=>{
      if(submit.disabled) return; submit.disabled=true;
      const c={...lotteryChoice};
      askConfirm(`消耗 ${ITEMS[c.id].name}×${c.qty}，充能 +${Game.lotteryValue(c.id)*c.qty}。充能不会自动抽奖，能量会保留。`,()=>{
        const r=Game.lotteryDeposit(c.id,c.qty);
        if(!r.ok) {centerToast(r.reason);showModal('lottery');return;}
        centerToast(`充能成功，当前能量 ${Game.lotteryState().credit}`);showModal('lottery');
      },'确认充能');
    };
    if(kind==='lotteryResult' && cfg && cfg.animate) {
      AudioFX.play('lotteryStart');
      const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      lotteryTimer=setTimeout(revealLottery,reduced?0:2200/animSpeed);
    }
  }
  function colMon(st) {
    const mm = Game.metaState();
    let html = '<div class="col-list">';
    for (const k of Game.monIds()) {   // 与标题总数同一份名单（自动排除 noDex 变体）
      const e = ENEMIES[k];
      const seen = st.seen['mon_' + k] || mm.seenMon[k];
      const killed = st.killCount[k] || 0;
      html += `<div class="col-item ${seen ? '' : 'unseen'}">${seen ? `<b>${e.name}</b><small>血量 ${e.hp} · 攻 ${e.atk} · 防 ${e.def} · 速 ${e.spd}${e.traits && e.traits.length ? ' · ' + e.traits.map(t => TRAIT_CN[t] || t).join('/') : ''}</small>${e.drops && e.drops.length ? `<small>掉落：${e.drops.map(d => d.ch ? `${ITEMS[d.id].name} ${Math.round(d.ch * 100)}%` : ITEMS[d.id].name).join('、')}</small>` : ''}${e.desc ? `<small>${e.desc}</small>` : ''}` : '？？？'}${killed ? `<small class="col-times">击败 ×${killed}</small>` : ''}</div>`;
    }
    return html + '</div>';
  }
  function colRec() {
    let html = '<div class="col-list">';
    for (const raw of RECIPES) {
        if (raw.legacyPlank) continue;
        const r = Game.craftRecipe(raw);
      const inS = Object.entries(r.in || {}).map(([k,v]) => `${ITEMS[k].name}×${v}`).join('、') || '—';
      const outS = Object.entries(r.out || {}).map(([k,v]) => `${ITEMS[k].name}×${v}`).join('、');
      html += `<div class="col-item"><b>${r.name}</b><small>工位：${COL_STATION_N[r.station] || r.station}${r.time ? ` · ${r.time}分` : ''}</small><small>材料：${inS}</small><small>产出：${outS}</small></div>`;
    }
    return html + '</div>';
  }
  function colBoss(st) {
    const mm = Game.metaState();
    let html = '<div class="col-list">';
    const bosses = Game.monIds().filter(k => ENEMIES[k].boss).map(k => [k, ENEMIES[k]]);
    for (const [k, e] of bosses) {
      const seen = st.seen['mon_' + k] || mm.seenMon[k];
      const killed = st.killCount[k] || 0;
      html += `<div class="col-item ${seen ? '' : 'unseen'}">${seen ? `<b>${e.name}</b><small>血量 ${e.hp} · 攻 ${e.atk} · 防 ${e.def} · 速 ${e.spd}${e.traits && e.traits.length ? ' · ' + e.traits.map(t => TRAIT_CN[t] || t).join('/') : ''}</small>${e.drops && e.drops.length ? `<small>掉落：${e.drops.map(d => `${ITEMS[d.id].name}${d.ch ? ' ' + Math.round(d.ch*100) + '%' : ''}`).join('、')}</small>` : ''}${e.desc ? `<small>${e.desc}</small>` : ''}` : '？？？'}${killed ? `<small class="col-times">击败 ×${killed}</small>` : ''}</div>`;
    }
    return html + '</div>';
  }
  function colAch() {
    const mm = Game.metaState();
    const ach = mm.ach || {};
    const tierCls = { '紫':'ach-purple', '金':'ach-gold', '红':'ach-red' };
    let html = '<div class="col-list">';
    for (const id in ACHIEVEMENTS) {
      const a = ACHIEVEMENTS[id];
      const st = ach[id];
      html += `<div class="col-item ach ${st ? 'done' : ''}"><span class="ach-glyph">${a.glyph}</span><b>${a.name}</b><span class="ach-tier ${tierCls[a.tier]||''}">${a.tier}</span><small>${a.desc}</small><small>奖励 ${a.reward} 魂点</small>${st === 'claimed' ? '<small class="col-times">已领取</small>' : (st === 'unlocked' ? `<button class="mini-btn" data-claim-ach="${id}">领取</button>` : '<small class="col-times">未达成</small>')}</div>`;
    }
    return html + '</div>';
  }

  // ---------- 结局 ----------
  // ---------- 通关分享图（作者 2026-09-24）----------
  // 把这一局渲染成一张 1080×1620 的竖版图，方便发论坛 / 评论区。
  // ⚠️ 关键取舍：**不依赖任何外部图片也能出图**。file:// 下 drawImage 会把 canvas 标记成
  //    "被污染"，之后 toDataURL 直接抛 SecurityError。所以策略是：
  //      ① 先用纯排版 + 画布自带纹理画一张（永远可用）；
  //      ② 结局插画能安全画上就画，drawImage/toBlob 一旦抛异常就**退回①**，绝不让按钮点了没反应。
  let shareImgUrl = null;
  function _wrapLines(ctx, text, maxW) {
    const out = [];
    for (const para of String(text == null ? '' : text).split('\n')) {
      let line = '';
      for (const ch of para) {
        if (line && ctx.measureText(line + ch).width > maxW) { out.push(line); line = ch; }
        else line += ch;
      }
      out.push(line);
    }
    return out;
  }
  function buildShareCard(id) {
    return new Promise((resolve) => {
      const st = S() || {};
      const end = ENDINGS[id] || ENDINGS.D;
      const W = 1080, H = 1620;
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d');
      let INK = '#16150f', PAPER = '#ece7d9', SUB = '#5a564a', ACC = '#8a7346';
      const F = (w, s) => `${w} ${s}px "Noto Serif SC","Songti SC","SimSun",serif`;

      // 底纹：assets/img/share/poster.png —— 风暴晨光、孤岛和沉没文明的电影感海报。
      // 中央为深色留白，文字由画布叠加；图片不含文字。
      // 拿不到底纹就退回"全部用画布生成"的纸底 + 墨框，保证任何情况下都能出图。
      // SAFE_TOP/SAFE_BOT：中央文字安全区边界。上方场景约到 y≈330，底部海面从 y≈1140 起。
      const SAFE_TOP = 300, SAFE_BOT = 1264;
      const paint = (poster) => {
        ctx.clearRect(0, 0, W, H);
        // 深底用暖白与浅金；底纹失效时恢复纸底墨字，仍能读清。
        INK = poster ? '#f5efe2' : '#16150f';
        PAPER = poster ? '#fff8e8' : '#ece7d9';
        SUB = poster ? '#d2d8d6' : '#5a564a';
        ACC = poster ? '#dcb879' : '#8a7346';
        if (poster && poster.naturalWidth) {
          ctx.drawImage(poster, 0, 0, W, H);
        } else {
          // —— 退路：纸底 + 中心提亮 + 四周暗角 + 木刻颗粒 + 双层墨框（全部画布生成）——
          ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
          const g = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.10, W / 2, H * 0.52, H * 0.80);
          g.addColorStop(0, 'rgba(255,255,255,0.52)');
          g.addColorStop(1, 'rgba(120,112,92,0.20)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          ctx.save(); ctx.globalAlpha = 0.05; ctx.fillStyle = INK;
          for (let i = 0; i < 2400; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
          ctx.restore();
          ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.strokeRect(46, 46, W - 92, H - 92);
          ctx.strokeStyle = 'rgba(22,21,15,0.32)'; ctx.lineWidth = 2; ctx.strokeRect(66, 66, W - 132, H - 132);
        }

        ctx.textAlign = 'center';
        let y = SAFE_TOP + 48;

        // 页眉
        ctx.fillStyle = SUB; ctx.font = F('500', 30);
        ctx.fillText('孤 屿 遗 章', W / 2, y); y += 34;
        ctx.strokeStyle = poster ? 'rgba(220,184,121,0.7)' : 'rgba(22,21,15,0.45)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(W / 2 - 78, y); ctx.lineTo(W / 2 + 78, y); ctx.stroke();
        y += 100;

        // 结局名
        ctx.fillStyle = INK; ctx.font = F('bold', 80);
        ctx.fillText(`结局「${end.name}」`, W / 2, y); y += 62;

        // 一行元信息
        const diff = (DIFFICULTIES[st.difficulty] || {}).name || '';
        const idn = (IDENTITIES[st.identity] || {}).name || '';
        ctx.fillStyle = SUB; ctx.font = F('400', 30);
        ctx.fillText(`第 ${st.day} 天 · ${Game.seasonInfo().name}季${diff ? ' · ' + diff : ''}${idn ? ' · ' + idn : ''}`, W / 2, y);
        y += 74;

        // 结局正文
        ctx.fillStyle = INK; ctx.font = F('400', 33);
        const body = id === 'D' ? '归途之外。' : (end.text || '');
        for (const ln of _wrapLines(ctx, body, W - 280)) { ctx.fillText(ln, W / 2, y); y += 47; }
        y += 42;

        // 战绩
        const kills = Object.values(st.killCount || {}).reduce((a, b) => a + b, 0);
        const kinds = Object.keys(st.killCount || {}).length;
        const builds = Object.values(st.buildings || {}).reduce((a, b) => a + b, 0);
        ctx.strokeStyle = poster ? 'rgba(220,184,121,0.38)' : 'rgba(22,21,15,0.3)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(150, y - 50); ctx.lineTo(W - 150, y - 50); ctx.stroke();
        ctx.fillStyle = SUB; ctx.font = F('400', 30);
        ctx.fillText(`战斗 ${kills} 场 · 击杀 ${kinds} 种 · 建筑 ${builds} 级`, W / 2, y); y += 46;
        y += 20;

        // 日记摘录（最近几行）
        const dlines = (st.diary || []).slice(-4);
        if (dlines.length) {
          ctx.fillStyle = ACC; ctx.font = F('500', 26);
          ctx.fillText('· 日 记 ·', W / 2, y); y += 44;
          ctx.fillStyle = SUB; ctx.font = F('400', 26);
          for (const d of dlines) {
            for (const ln of _wrapLines(ctx, `第${d.day}天　${d.line}`, W - 300)) { ctx.fillText(ln, W / 2, y); y += 38; }
          }
          y += 18;
        }

        // 魂点
        const ms2 = Game.metaLast();
        if (ms2 && ms2.gain) {
          ctx.fillStyle = INK; ctx.font = F('500', 30);
          ctx.fillText(`这一生化作 ${ms2.gain} 魂点，汇入《历代遗章》`, W / 2, y); y += 52;
        }

        // 朱印：收尾，同时把内容压在安全区内（底纹下方还有枯枝/水纹装饰，别压上去）
        {
          const s = 100;
          const sy = Math.min(SAFE_BOT - s - 86, y + 50);   // 下界保证朱印落在页脚之上
          const x0 = W / 2 - s / 2, r = 10;
          ctx.save();
          ctx.fillStyle = '#a8382a';
          ctx.beginPath();
          ctx.moveTo(x0 + r, sy); ctx.lineTo(x0 + s - r, sy); ctx.quadraticCurveTo(x0 + s, sy, x0 + s, sy + r);
          ctx.lineTo(x0 + s, sy + s - r); ctx.quadraticCurveTo(x0 + s, sy + s, x0 + s - r, sy + s);
          ctx.lineTo(x0 + r, sy + s); ctx.quadraticCurveTo(x0, sy + s, x0, sy + s - r);
          ctx.lineTo(x0, sy + r); ctx.quadraticCurveTo(x0, sy, x0 + r, sy);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = PAPER; ctx.font = F('bold', 35);
          ctx.textBaseline = 'middle';
          ctx.fillText('孤屿', W / 2, sy + s / 2 - 18);
          ctx.fillText('遗章', W / 2, sy + s / 2 + 18);
          ctx.restore();
          ctx.textBaseline = 'alphabetic';
        }

        // 联系方式与版本信息放在右下角，离开结局正文的阅读动线。
        const ver = (typeof window !== 'undefined' && window.BUILD_VER) || '';
        ctx.save();
        ctx.textAlign = 'right';
        ctx.fillStyle = poster ? 'rgba(240,232,217,0.88)' : 'rgba(90,86,74,0.85)';
        ctx.shadowColor = poster ? 'rgba(0,0,0,0.95)' : 'transparent';
        ctx.shadowBlur = poster ? 6 : 0;
        ctx.font = F('400', 21);
        ctx.fillText('QQ 群 1014679931', W - 78, H - 136);
        if (ver) { ctx.font = F('400', 18); ctx.fillText(ver, W - 78, H - 108); }
        ctx.restore();
        // 给回归探针留个读数：正文最低点 vs 安全区下界
        try { window.__shareContentBottom = y; window.__shareSafeBottom = SAFE_BOT; } catch (e) {}
      };

      const finish = () => {
        try {
          if (cv.toBlob) { cv.toBlob(b => b ? resolve(URL.createObjectURL(b)) : resolve(cv.toDataURL('image/png')), 'image/png'); return; }
          resolve(cv.toDataURL('image/png'));
        } catch (e) { resolve(null); }
      };
      const plain = () => { try { paint(null); } catch (e) {} finish(); };

      const img = new Image();
      img.onload = () => {
        try { paint(img); finish(); }
        catch (e) { plain(); }   // 画不上底纹（多半是 canvas 被污染）→ 退回纯代码版
      };
      img.onerror = plain;
      // 底纹是版画海报框（不含任何文字），文字全部由这里叠上去
      img.src = `assets/img/share/poster.png?v=${window.BUILD_VER || 'v1.09'}`;
    });
  }
  function shareModal() {
    if (!shareImgUrl) {
      return `<div class="modal-title">通关分享图</div><div class="hint">图片还没生成好，关掉重试一次。</div><div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
    }
    const st = S() || {};
    const nm = (ENDINGS[st.ending] || {}).name || '通关';
    return `<div class="modal-title">通关分享图</div>
      <div class="overlay-text">可下载图片发到论坛或评论区。手机上可用系统分享菜单保存；若浏览器不支持，长按图片选「存储图像」。</div>
      <img class="share-img" src="${shareImgUrl}" alt="通关分享图">
      <div class="modal-actions">
        <button id="share-native" type="button">分享到系统 / 保存到相册</button>
        <a class="mini-btn share-dl" download="孤屿遗章_结局_${esc(nm)}.png" href="${shareImgUrl}">⬇ 保存图片</a>
        <button id="modal-close">关 闭</button>
      </div>`;
  }
  function showEnding(id, reason, opts) {
    const revive = Game.reviveInfo();
    const noRevive = !revive.ok;
    const st = S();
    const end = ENDINGS[id] || ENDINGS.D;
    try { AudioFX.playEnding(id); } catch (e) {}
    let es = document.getElementById('ending-screen');
    if (!es) { es = document.createElement('div'); es.id = 'ending-screen'; document.body.appendChild(es); }
    const kills = Object.values(st.killCount || {}).reduce((a, b) => a + b, 0);
    const builds = Object.values(st.buildings || {}).reduce((a, b) => a + b, 0);
    let diary = st.diary.slice(-12).map(d => `<div class="diary-line"><span class="diary-day">第${d.day}天</span>${esc(d.line)}</div>`).join('');
    const ms = Game.metaLast();
    const metaSoul = Game.metaState().soul;
    es.innerHTML = `<div class="ending-wrap">
      <div class="ending-title">${id === 'D' ? '归途之外' : end.name}</div>
      <div class="ending-sub">${id === 'D' ? '第 ' + st.day + ' 天' : '第 ' + st.day + ' 天 · ' + Game.seasonInfo().name + '季'}</div>
      <img class="ending-img" src="${end.img || ''}" onerror="this.style.display='none'" alt="${end.name}">
      <div class="ending-text">${esc(id === 'D' ? (reason || '你死在了岛上。') : end.text)}</div>
      <div id="ending-lines" class="ending-lines"></div>
      ${ms ? `<div class="ending-sub soul-line">你的一生化作 <b>${ms.gain}</b> 魂点，汇入了《历代遗章》。</div>` : ''}
      ${id === 'D' ? '' : `<div class="ending-sub">达成条件：${end.cond}</div>`}
      <div class="ending-sub">一生战绩：战斗 ${kills} 场 · 击杀 ${Object.keys(st.killCount || {}).length} 种 · 建筑 ${builds} 级 · 声望 ${st.fame || 0}/5</div>
      <div class="ending-diary">${diary}</div>
      ${id === 'D' && noRevive ? `<div class="ending-sub">无法回溯：${esc(revive.reason || '没有日出记录')}</div>` : ''}
      <div class="ending-actions">
        ${id === 'D' ? (
          (noRevive ? `<button disabled>回到今天日出（不可用）</button>`
            : (st.difficulty !== 'legend' ? (metaSoul >= 50 ? `<button id="end-revive">回到今天日出（-50 魂点）</button>` : `<button id="end-revive" data-lack="1">回到今天日出（需 50 魂点）</button>`) : '')) +
          `<button id="end-retry">重新开始</button>`
        ) : `<button id="end-stay">留在岛上（自由模式）</button>`}
        <button id="end-share">📤 分享通关图</button>
        <button id="end-title">回到标题</button>
      </div>
    </div>`;
    es.classList.add('open'); document.body.classList.add('no-scroll');
    const linesEl = document.getElementById('ending-lines');
    if (linesEl) { const ls = (end.lines || []); ls.forEach((ln, i) => setTimeout(() => { const d = document.createElement('div'); d.className = 'ending-line'; d.textContent = ln; linesEl.appendChild(d); d.classList.add('in'); }, 900 + i * 1500)); }
    const hide = () => { es.classList.remove('open'); es.innerHTML = ''; document.body.classList.remove('no-scroll'); };
    $('#end-stay') && ($('#end-stay').onclick = () => { hide(); Game.continueRun(); addLog('你选择了留下来。海还在那里。', 'sys'); });
    $('#end-revive') && ($('#end-revive').onclick = (e) => {
      const result = Game.reviveToday();
      if (!result.ok) { centerToast(result.reason); return; }
      hide();
    });
    $('#end-title') && ($('#end-title').onclick = () => { hide(); Game.continueRun(); Game.save(); location.reload(); });
    $('#end-retry') && ($('#end-retry').onclick = () => {
      if (!Game.identityUnlocked(lastIdentity)) { hide();showIdentity();centerToast('重新开始前，请先解锁角色或选择其他角色。');return; }
      hide();const r=Game.newGame(lastIdentity,lastDifficulty);if(r && !r.ok){centerToast(r.reason);showIdentity();}
    });
    // 分享通关图：现画一张 1080×1620 的竖版图，再弹出来让玩家保存/长按
    $('#end-share') && ($('#end-share').onclick = async () => {
      const btn = $('#end-share');
      if (btn) { btn.disabled = true; btn.textContent = '正在生成…'; }
      try { centerToast('正在生成分享图…'); } catch (e) {}
      try { shareImgUrl = await buildShareCard(id); } catch (e) { shareImgUrl = null; }
      if (btn) { btn.disabled = false; btn.textContent = '📤 分享通关图'; }
      showModal('share');
      const nativeBtn = $('#share-native');
      if (nativeBtn) {
        if (typeof navigator.share !== 'function') nativeBtn.style.display = 'none';
        else nativeBtn.onclick = async () => {
          try {
            const blob = await (await fetch(shareImgUrl)).blob();
            const file = new File([blob], `孤屿遗章_结局_${(ENDINGS[id] || {}).name || '通关'}.png`, { type:'image/png' });
            if (navigator.canShare && !navigator.canShare({ files:[file] })) { centerToast('请点保存图片，或长按图片存储到相册。'); return; }
            await navigator.share({ files:[file], title:'孤屿遗章 · 通关分享图' });
          } catch (e) {
            if (e && e.name !== 'AbortError') centerToast('系统分享不可用，请点保存图片或长按存储。');
          }
        };
      }
    });
  }
  // 上一次选择：进游戏/读档时都会同步，重新开始时就不会莫名其妙变回渔夫
  let lastIdentity = (() => { try { return localStorage.getItem('guyuyizhang_identity') || 'fisher'; } catch (e) { return 'fisher'; } })();
  let lastDifficulty = (() => { try { return localStorage.getItem('guyuyizhang_difficulty') || 'normal'; } catch (e) { return 'normal'; } })();
  function rememberIdentity() {
    try {
      const st = S();
      if (st && st.identity) lastIdentity = st.identity;
      if (st && st.difficulty) lastDifficulty = st.difficulty;
      localStorage.setItem('guyuyizhang_identity', lastIdentity);
      localStorage.setItem('guyuyizhang_difficulty', lastDifficulty);
    } catch (e) {}
  }

  // ---------- 标题 / 开局 ----------
  function showTitle() {
    const app = $('#app');
    const has = Game.hasSave();
    // ⚠️ 日志栏收起按钮（#log-grip）是挂在 body 上的，不属于 #app，
    //    所以回到标题页时它不会被 app.innerHTML 清掉 —— 会孤零零留在左上角（玩家截图反馈过）。
    //    标题页/选择身份页都把它藏起来，只有真正进游戏后才显示。
    const grip = document.getElementById('log-grip');
    if (grip) grip.style.display = 'none';
    dom.dispose(app);app.innerHTML = `
      <div id="title-screen">
        <div class="title-language">${window.Locale?Locale.control():''}</div>
        <img src="assets/img/title.png" alt="">
        <div id="title-name"><span class="tt" data-ch="孤">孤</span><span class="tt" data-ch="屿">屿</span><span class="tt" data-ch="遗">遗</span><span class="tt" data-ch="章">章</span></div>
        <div id="title-sub">一座孤岛 · 一段余生 · 一本日记</div>
        <div id="title-btns">
          <button id="btn-new">新的旅程</button>
          ${has ? '<button id="btn-load">继续上次游戏</button>' : ''}
        <button id="btn-meta">◈ 历代遗章</button>
        <button id="btn-bak">📦 备份·读档</button>
        <button id="btn-set">⚙ 设 置</button>
        </div>
        <div id="title-tip">备份点 ${Game.backupPoints()}</div>
        <div id="modal"></div>
      </div>`;
    // 事件委托：标题按钮（防首次渲染/重渲染丢绑定）
    app.onclick = (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!btn) return;
      if (btn.id === 'btn-new') { AudioFX.init(); showJourneySelect(); }
      else if (btn.id === 'btn-load') {
        AudioFX.init();
        if (Game.load()) {
          // 上一局已经死了（生命归零 / 带着死亡记录）：别直接放进营地，
          // 先把结局画面弹出来——复活要花 50 魂点，吃口药复活是不算数的（作者 2026-09-19）
          const s0 = Game.S();
          begin();
        }
      }
      else if (btn.id === 'btn-meta') { AudioFX.init(); showModal('heirloom'); }
      else if (btn.id === 'btn-bak') { AudioFX.init(); showModal('backup'); }
      else if (btn.id === 'btn-set') { AudioFX.init(); showModal('settings'); }
    };
    // 隐藏开发者模式：连点"章"×4 → 输密码
    let devClicks = 0;
    app.querySelectorAll('.tt').forEach(sp => sp.onclick = () => {
      if (sp.dataset.ch !== '章') return;
      devClicks++;
      if (devClicks >= 4) { devClicks = 0; showModal('devpw'); }
    });
    // 现实 10 秒 = 游戏 1 分钟（紧迫感）；待机超过 10 分钟则暂停时间流逝（防挂机挂死）
    if (!window.__guyuLifecycleBound) {
    window.__guyuLifecycleBound = true;
    let lastActive = Date.now();
    const markActive = (e) => { if (e && e.isTrusted === false) return; lastActive = Date.now(); };
    ['pointerdown','touchstart','keydown','scroll'].forEach(ev => document.addEventListener(ev, markActive, { passive: true }));
    setInterval(() => {
      const stg = Game.S();
      if (!stg || !document.getElementById('top-day') || document.hidden || uiBusy || traveling || stg.ending || stg.death) return;
      if (Date.now() - lastActive > 10 * 60 * 1000) return;   // 待机超 10 分钟 → 时间暂停
      Game.timePass(1);
    }, 10000);
    // 离开/切后台/刷新时自动存盘（防止 iPad/移动端刷新丢档）
    const autoSave = () => { try { const s = Game.S(); if (s && !s.ending && !s.death) Game.save(); } catch(e){} };
    window.addEventListener('pagehide', autoSave);
    window.addEventListener('beforeunload', autoSave);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') autoSave(); });
    // ---- 存档加固（玩家反馈"退后台回来存档没了"）----
    // ① 每 20 秒兜底自动存一次：手机上被系统直接杀掉页面时，pagehide 不一定来得及跑
    if (!window.__guyuAutoSaveTimer) {
      window.__guyuAutoSaveTimer = setInterval(() => {
        const s = Game.S();
        if (!s || s.ending || s.death) return;
        if (!s._dirty) return;             // 没动过就不写，省得反复占用存储
        Game.save();
      }, 20000);
    }
    // ② 从后台/bfcache 回来时，如果别的标签页写过更新的存档，就用那份重新同步，避免拿旧进度覆盖
    window.addEventListener('pageshow', (e) => {
      const s = Game.S();
      if (!s || (!e.persisted && !s._dirty)) return;
      if (Game.saveRev() > (s._rev || 0)) {
        if (s._dirty) { Game.save(); return; } // 触发冲突提示，保留本页尚未保存的改动
        try { if (Game.load()) { render(); addLog('检测到另一处有更新的进度，已为你同步。', 'sys'); } } catch (err) {}
      }
    });
    } // 生命周期监听和计时器整页只注册一次
    AudioFX.setScene('title');
  }
  let lastSlot = -1;
  function showJourneySelect() {
    const app = $('#app');
    const slots = Game.slotList();
    const bp = Game.backupPoints();
    let html = `<div id="select-screen"><div class="select-title">开始新的旅程 <span style="font-weight:400;font-size:13px;letter-spacing:0.02em">｜ 备份点：${bp} <button class="mini-btn" data-titlebuybp="1">＋</button></span></div>
      <div class="identity-list">`;
    for (let i = 0; i < 4; i++) {
      const s = slots[i];
      if (i === 3 && !Game.extraSlotUnlocked()) {
        html += '<button class="identity" data-slot="3"><b>备份槽 4 · 未解锁</b><span>100 魂点永久解锁</span></button>';
        continue;
      }
      html += `<button class="identity" data-slot="${i}"><b>备份槽 ${i + 1}${s ? ` · 第${s.day}天` : ' · 空白'}</b><span>${s ? `第 ${s.day} 天${s.settled ? '（已结算）' : ''} · 点击从此处继续` : '空白 · 点击开始新游戏'}</span></button>`;
    }
    html += `</div><button id="sel-back">返回</button><div id="modal"></div></div>`;
    dom.dispose(app);app.innerHTML = html;
    app.querySelectorAll('.identity').forEach(b => b.onclick = () => {
      const i = +b.dataset.slot;
      if (i === 3 && !Game.extraSlotUnlocked()) { showModal('buyslot'); return; }
      const s = Game.slotList()[i];
      if (s) { const r = Game.loadSlot(i); if (r.ok) begin(); else addLog(r.reason, 'warn'); return; }
      // ⚠️ 开新游戏会覆盖"当前进行中的那一份"（备份槽不受影响）——先说清再动，
      //    玩家反馈"我新开了游戏，在读以前的档，没跳出来覆盖咋办"。
      let d = 0;
      try { const j = JSON.parse(localStorage.getItem('guyuyizhang_save') || 'null'); d = (j && j.day) || 0; } catch (e) {}
      const startNew = () => { lastSlot = i; showIdentity(); };
      // ⛔ 这里原来用原生 confirm()：iPhone / Taptap 的 WKWebView 里 confirm 不返回，
      //    点空白槽等于点了没反应，玩家根本开不了新游戏。改用游戏自己的确认弹窗。
      if (d > 1) {
        askConfirm(`你有一份进行中的存档（第 ${d} 天）——开新游戏会覆盖它（「备份 · 读档」里的备份槽不受影响）。确定开始新游戏吗？`, startNew, '开始新游戏');
        return;
      }
      startNew();
    });
    app.querySelectorAll('[data-titlebuybp]').forEach(b => b.onclick = () => showModal('buybp'));
    $('#sel-back').onclick = showTitle;
  }
  function showIdentity() {
    const app = $('#app');
    const grip0 = document.getElementById('log-grip');   // 同上：选择身份页也不该出现它
    if (grip0) grip0.style.display = 'none';
    let html = `<div id="select-screen"><div class="select-title">你是什么人？ <small>魂点 ${Game.metaState().soul || 0}</small></div><div class="identity-list">`;
    for (const [id, idn] of Object.entries(IDENTITIES).sort(([a],[b])=>Number(['trainer','beekeeper'].includes(a))-Number(['trainer','beekeeper'].includes(b)))) {
      // 立绘卡面：受皮肤包控制（"彩绘卡面"皮肤会整套换掉），缺图自动回退到默认立绘
      const locked=!Game.identityUnlocked(id);
      html += `<button class="identity" data-id="${id}"><span class="id-card"><img src="${portraitPath(id)}" alt="" onerror="__portraitFail(this,'${id}')"></span><span class="id-body"><b>${idn.name}${locked?' · 100 魂点解锁':''}</b><span class="id-desc">${idn.desc}${locked?' · 永久解锁，已有存档可继续。':''}</span></span></button>`;
    }
    html += `</div><button id="sel-back">返回</button><div id="modal"></div></div>`;
    dom.dispose(app);app.innerHTML = html;
    app.querySelectorAll('.identity').forEach(b => b.onclick = () => {
      const id=b.dataset.id;
      if (!Game.identityUnlocked(id)) {
        askConfirm(`花费 100 魂点永久解锁${IDENTITIES[id].name}？当前魂点 ${Game.metaState().soul || 0}。`,()=>{
          const r=Game.unlockIdentity(id);centerToast(r.ok?'角色已永久解锁':r.reason);showIdentity();
        },'解锁角色');return;
      }
      lastIdentity = id; try { localStorage.setItem('guyuyizhang_identity', lastIdentity); } catch (e) {} showDifficulty();
    });
    $('#sel-back').onclick = showTitle;
  }
  function showDifficulty() {
    const app = $('#app');
    let html = `<div id="select-screen"><div class="select-title">选择难度</div><div class="identity-list">`;
    for (const [id, d] of Object.entries(DIFFICULTIES)) {
      if (id === 'dev' && !Game.devEnabled()) continue;
      const unlocked=Game.difficultyUnlocked(id);
      html += `<button class="identity difficulty-${id}" data-id="${id}" ${unlocked?'':'disabled'}><span class="id-body"><b>${d.name}${unlocked?'':' · 未解锁'}${d.recommend ? ' <i style="font-style:normal;font-size:11px;border:1px solid var(--ink);padding:0 4px;border-radius:3px">新手推荐</i>' : ''}</b><span>${unlocked?d.desc:'幸存者模式完成任一通关结局解锁。'}</span></span></button>`;
    }
    html += `</div><div class="hint" style="margin-top:6px">第一次玩？选「求生者」就行，按喜欢的体验选择。</div><button id="sel-back">返回</button><div id="modal"></div></div>`;
    dom.dispose(app);app.innerHTML = html;
    // 开场分镜只在"真人点了难度"时播：程序化 click（探针/自动化，isTrusted === false）自动跳过，
    // 免得每次截图/回归都要先手动关掉分镜。探针想看分镜就设 window.__guyuForceComic = 1。
    app.querySelectorAll('.identity').forEach(b => b.onclick = (e) => {
      lastDifficulty = b.dataset.id;
      try { localStorage.setItem('guyuyizhang_difficulty', lastDifficulty); } catch (err) {}
      const result=Game.newGame(lastIdentity,lastDifficulty);
      if(result && result.ok===false){centerToast(result.reason);return;}
      freshRun = (e && e.isTrusted === false) ? !!window.__guyuForceComic : true;
      begin();
    });
    $('#sel-back').onclick = showIdentity;
  }
  // ---------- 开场分镜（只在"新的旅程"开新存档时播一次）----------
  // 作者 2026-09-17：新存档开头要有几格漫画交代来历 ——
  //   听说亚克兰蒂斯遗址的传说 → 出海 → 特大风暴 → 被海水淹没晕过去 → 醒来就在这座荒岛。
  // 图在 assets/img/comic/（黑白木刻版画，跟游戏同一套视觉）；缺图自动回退到已有的场景图，绝不空白。
  // 只在新存档播：读档 / 继续上次游戏 / 备份恢复 / 死后重新开始 都走不到这里（freshRun 只在选难度那一下置位）。
  const COMIC = [
    { t:'传闻', img:'assets/img/comic/1_legend.png', fb:'assets/img/laochao.png',
      s:'港口的酒馆里，那个老水手把杯底一磕：\n「小子，海底下埋着一座城。」\n\n他说那叫亚克兰蒂斯——沉了一千年，塔尖上的灯还亮着。\n我把这句话记了很多年。' },
    { t:'出海', img:'assets/img/comic/2_setsail.png', fb:'assets/img/endings/ending_a.png',
      s:'终于有一天，我用攒下的全部家当，换了一条小船、一张旧海图，和半个月的干粮。\n\n船离港的时候天刚亮，风是顺的。\n「我会回来的。」' },
    { t:'风暴', img:'assets/img/comic/3_storm.png', fb:'assets/img/sea.png',
      s:'第三天夜里，海翻了脸。\n\n浪头比桅杆还高，一道白线从黑暗里压下来。\n我听见木头断裂的声音——就在我头顶。' },
    { t:'沉没', img:'assets/img/comic/4_sink.png', fb:'assets/img/anim/dive.png',
      s:'冰冷的海水灌满了肺。\n\n我伸手去够最后那点光，光越来越远。\n然后，什么都没有了。' },
    { t:'醒来', img:'assets/img/comic/5_wake.png', fb:'assets/img/shore.png',
      s:'不知道过了多久，我被沙子磨醒了脸。\n\n船没了，海图也没了，手里只剩半截缆绳。\n天是灰的，海也是灰的——一座陌生的岛立在雾里。\n\n活下去，是我现在唯一要做的事。' },
  ];
  let freshRun = false;      // 选完难度、真正开一局新存档时置 true；begin() 消费一次就清掉
  function showComicIntro(done) {
    const st = S();
    const lk = !!(st && st.identity === 'linghui');   // 灵灰：冷蓝调，跟她在游戏里的表现一致
    const scr = el('div', '');
    scr.id = 'comic-screen';
    if (lk) scr.classList.add('lk');
    scr.innerHTML = `<img id="comic-img" alt="" draggable="false">
      <div class="comic-shade"></div>
      <div class="comic-cap"><div class="comic-step"></div><div class="comic-title"></div><div class="comic-text"></div></div>
      <div class="comic-bar"><div class="comic-dots">${COMIC.map(() => '<i></i>').join('')}</div>
        <button class="comic-skip" id="comic-skip">跳 过</button><button class="comic-next" id="comic-next">继续 ▶</button></div>`;
    document.body.appendChild(scr);
    const img = scr.querySelector('#comic-img');
    const stepEl = scr.querySelector('.comic-step');
    const titleEl = scr.querySelector('.comic-title');
    const textEl = scr.querySelector('.comic-text');
    const dots = [...scr.querySelectorAll('.comic-dots i')];
    const nextBtn = scr.querySelector('#comic-next');
    const openedAt = Date.now();
    let i = 0, ended = false;
    // 只预加载"下一格"：5 张全解码要白吃十几 MB 内存（玩家反馈过内存被杀），这样最多两张活着
    const preload = (k) => { if (COMIC[k]) { const x = new Image(); x.src = COMIC[k].img; } };
    const draw = () => {
      const c = COMIC[i];
      img.onerror = () => { if (img.src.indexOf(c.fb) < 0) img.src = c.fb; };   // 缺图 → 回退，绝不空白
      img.src = c.img;
      img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';   // 每格都重新"淡入 + 慢慢推近"
      stepEl.textContent = `开场 · 第 ${i + 1} / ${COMIC.length} 格`;
      titleEl.textContent = c.t;
      textEl.textContent = c.s;
      textEl.style.animation = 'none'; void textEl.offsetWidth; textEl.style.animation = '';   // 文字重新淡入
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
      nextBtn.textContent = (i === COMIC.length - 1) ? '爬上沙滩 ▶' : '继续 ▶';
      preload(i + 1);
    };
    const finish = () => {
      if (ended) return;
      ended = true;
      document.removeEventListener('keydown', onKey, true);
      scr.classList.add('out');
      setTimeout(() => scr.remove(), 440);
      if (done) done();
    };
    const next = () => {
      if (ended) return;
      if (i < COMIC.length - 1) { i++; try { AudioFX.play('click'); } catch (e) {} draw(); }
      else finish();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { finish(); return; }
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); next(); }
    };
    nextBtn.onclick = next;
    scr.querySelector('#comic-skip').onclick = () => { addLog('（开场分镜已跳过）', 'sys'); finish(); };
    scr.addEventListener('click', (e) => {
      if (e.target && e.target.closest && e.target.closest('button')) return;   // 按钮自己处理
      if (Date.now() - openedAt < 350) return;   // 防"开这一页的那一下顺手又翻一格"（同 #modal 那套防穿透）
      next();
    });
    document.addEventListener('keydown', onKey, true);
    draw();
  }
  function begin() {
    document.body.classList.remove('modal-open');
    const app = $('#app');
    roomView = false;
    rememberIdentity();   // 记下本局的身份/难度，重开时沿用
    // 加载画面（约 2.2 秒）：鸟鸣 + 树叶沙沙 + 随机提示
    const TIPS = ['悄悄告诉你，游戏官方群号是 1014679931 哦☆', '缺树枝？手工劈柴可把2木材做成4树枝。', '规律作息可以回复更多体力和血量。', '晚上 10 点到 12 点睡觉，体力回得最满。', '吃饱喝足再睡，才不会睡到掉血。', '越远的地方越危险，也越稀有。', '工具和武器都有耐久，用坏了要重新做。', '远古金币能买稀有货；老潮那儿 50 贝壳换 1 金币，1 金币也能换回 30 贝壳。', '雨天去树林，蘑菇会更多。', '瞭望台能让你看见更远的地方。', '死亡不是终点，魂点会沉淀进《历代遗章》。'];
    const L = document.createElement('div');
    L.id = 'loading';
    L.innerHTML = `<div class="load-glyph">◈</div><div class="load-tip">${TIPS[Math.floor(Math.random() * TIPS.length)]}</div><div class="load-bar"><i></i></div>`;
    document.body.appendChild(L);
    AudioFX.setScene('forest');   // 加载时播清脆鸟叫+树叶沙沙
    setTimeout(() => { L.classList.add('done'); setTimeout(() => L.remove(), 500); }, 2200);
    dom.dispose(app);app.innerHTML = `
      <div id="topbar">
        <!-- ⚠️ 邮箱按钮必须是顶栏最后一个、且不被裁掉：以前它排在状态条后面，窄屏下状态条把它挤到
             右边又被顶栏的 overflow:hidden 裁掉，看起来像"跑到格子栏右边"。
             现在拆成两层：状态区是 flex:1 且自身可横向滚动，邮箱 flex:none 永远钉在最右。 -->
        <div id="topstats">
        <span id="top-day">第 1 天</span>
        <span id="top-time">08:00</span>
        <span id="top-season">春季</span>
        <span id="top-weather">晴</span>
        <span id="top-temperature" class="top-temp" title="当前天气气温；所在地点的环境温度见装备·属性">20℃</span>
        <span class="stat"><span class="stat-name" title="生命" aria-label="生命">♥</span><div class="stat-bar"><div id="bar-hp" class="stat-fill hp"></div></div><span class="stat-num" id="num-hp"></span></span>
        <span class="stat"><span class="stat-name" title="体力" aria-label="体力">ϟ</span><div class="stat-bar"><div id="bar-stamina" class="stat-fill st"></div></div><span class="stat-num" id="num-stamina">100</span></span>
        <span class="stat"><span class="stat-name" title="饱食" aria-label="饱食">◒</span><div class="stat-bar"><div id="bar-hunger" class="stat-fill hu"></div></div><span class="stat-num" id="num-hunger">100</span></span>
        <span class="stat"><span class="stat-name" title="水分" aria-label="水分"><svg viewBox="0 0 16 20" width="12" height="14" aria-hidden="true"><path fill="currentColor" d="M8 0C6 5 0 10 0 14a8 6 0 0 0 16 0C16 10 10 5 8 0Z"/></svg></span><div class="stat-bar"><div id="bar-thirst" class="stat-fill th"></div></div><span class="stat-num" id="num-thirst">100</span></span>
        <span class="stat"><span class="stat-name" title="精神" aria-label="精神">✦</span><div class="stat-bar"><div id="bar-spirit" class="stat-fill sp"></div></div><span class="stat-num" id="num-spirit">100</span></span>
        <span class="stat"><span class="stat-name" title="健康" aria-label="健康">✚</span><div class="stat-bar"><div id="bar-health" class="stat-fill st"></div></div><span class="stat-num" id="num-health">100</span></span>
        <span id="cap">0/23 格</span>
        </div>
        <div id="status-badges" aria-live="polite"></div>
      </div>
      <div id="main"></div>
      <div id="log"><div id="logbody"></div></div>
      <div id="objective"></div>
      <button id="btn-backmap">← 返回地图</button>
      <div id="hud-bottomright">
        <div id="scene-actions"></div>
        <div id="rest-bar">
          <button id="btn-rest">休息 1 小时</button>
          <button id="btn-rest-h" title="切换休息时长（1 / 2 / 3 小时）">×1</button>
        </div>
      </div>
      <div id="nav">
        <button data-nav="map">🗺 地图</button>
        <button data-nav="craft">🔨 制造</button>
        <button data-nav="equip">⚔ 装备</button>
        <button data-nav="inv">🎒 背包</button>
        <button data-nav="save">☰ 菜单</button>
      </div>
      <div id="modal"></div>
      <div id="busy"></div>
      <button id="anim-speed" title="采集/建造/攻击动画速度">动画×1</button>`;
    replayLog();      // 界面搭好就把存档里的日志历史补回来（开新局的第 1 条、读档前的记录都在这）
    view = 'scene';
    const spd = $('#anim-speed');
    if (spd) { spd.textContent = '动画×' + animSpeed; spd.onclick = () => { animSpeed = (animSpeed % 3) + 1; spd.textContent = '动画×' + animSpeed; try { localStorage.setItem('guyuyizhang_anim', String(animSpeed)); } catch (e) {} AudioFX.play('pickup'); }; }
    const bb = $('#btn-backmap');
    if (bb) {
      // 在地图界面时它应该带你回场景，而不是重复打开地图
      bb.textContent = (view === 'map') ? '← 返回场景' : '← 返回地图';
      bb.onclick = () => {
        if (roomView) { roomView = false; render(); return; }
        if (view === 'map') { view = 'scene'; render(); return; }
        view = 'map'; render();
        const mw = $('#map-wrap'); if (mw) { mw.classList.remove('map-in'); void mw.offsetWidth; mw.classList.add('map-in'); }
      };
    }
    const br = $('#btn-rest');
    const brh = $('#btn-rest-h');
    if (br) {
      br.textContent = '休息 ' + restHours + ' 小时';
      br.onclick = () => { if (Game.S().stats.stamina >= Game.maxStam()) { addLog('体力充沛，不需要休息。', 'warn'); return; } withAnimation('rest', '休息 ' + restHours + ' 小时', () => Game.rest(restHours), 'rest'); };
    }
    if (brh) {
      brh.textContent = '×' + restHours;
      brh.onclick = () => {   // 1 → 2 → 3 → 1 循环
        restHours = (restHours % 3) + 1;
        brh.textContent = '×' + restHours;
        if (br) br.textContent = '休息 ' + restHours + ' 小时';
        try { localStorage.setItem('guyuyizhang_rest', String(restHours)); } catch (e) {}
        AudioFX.play('pickup');
      };
    }
    const bm = $('#btn-mail'); if (bm) bm.onclick = () => { mailTab = 'mail'; showModal('mailbox'); };
    // 主页右上角「攻略」（作者 2026-09-23）：打开全流程攻略弹窗
    const bg2 = $('#btn-guide'); if (bg2) bg2.onclick = () => showModal('guide');
    document.querySelectorAll('#nav [data-nav]').forEach(b => b.onclick = () => {
      if(restoreCombatView())return;
      const n = b.dataset.nav;
      if (n === 'map') { closeModal(); view = 'map'; render(); }
      else if (n === 'inv') { tutAfterBag(); showModal('inv'); }
      else if (n === 'equip') { equipTab = 'p1'; showModal('equip'); }
      else if (n === 'craft') showModal('craft');
      else if (n === 'save') showModal('savemenu');
    });
    // 点弹窗空白处 = 关闭（常规面板类；战斗/剧情选择除外）
    const modalEl = $('#modal');
    modalEl.addEventListener('click', (e) => {
      if (e.target !== modalEl) return;
      const k = modal && modal.kind;
      // 面板类都支持"点外面关闭"（战斗、剧情选择、结局、命名输入、掷骰子这种不能误关的除外）
      if (panels.get(k).dismiss) closeModal();
    });
    // 移动端：不预加载全部大图，改为按需加载（切换场景时才读取对应图），降低内存与首屏压力
    render();
    AudioFX.setScene(Game.S().scene);
    const s0 = Game.S();
    if (s0 && s0.ending === 'D') { freshRun=false;showEnding('D',s0.death || '你在上一局倒下了。',{noRevive: !Game.reviveInfo().ok});return; }
    // 序章叙事
    const introCard = () => showModal('overlay', {
      title: '第 1 天 · 海难',
      text: '风暴把船撕成了碎片。你被海浪冲上一片陌生的沙滩，浑身是伤，手里只剩半截缆绳。\n\n天是灰的，海也是灰的。身后有山的轮廓，脚下有河流入海，海平线上隐约有对岸的岛影。\n\n活下去。这是你接下来唯一要做的事。',
      choices: [{ label: '从沙滩上爬起来', ok: () => { addLog('你从沙滩上爬起来，把散落的物资收拢到一起。', 'sys'); } }],
    });
    // 新存档：先播 5 格开场分镜，播完（或点跳过）再出上面这张「第 1 天 · 海难」卡
    if (freshRun) {
      freshRun = false;
      [0, 1].forEach(k => { if (COMIC[k]) { const x = new Image(); x.src = COMIC[k].img; } });   // 加载画面那 2.4 秒里先把前两格拉下来
      setTimeout(() => showComicIntro(introCard), 2400);   // 等加载画面收掉再开始，别和它叠在一起
    }
    // 读档 / 继续上次游戏 / 备份恢复：不再重复弹这张"海难"卡（开场分镜已经讲过一遍来历了），
    // 直接进游戏。（以前每次打开存档都要再点一次"从沙滩上爬起来"）
  }

  // ---------- 初始化 ----------
  // 全局"咔哒"声：所有按钮/标签/热点/地图箭头，按下就给一次交互反馈（45ms 内不叠音）
  let _lastClickAt = 0;
  // ⚠️ 防"点击穿透"：打开弹窗的那一次点击，它的 click 事件要等弹窗渲染完之后才派发，
  //    于是经常正好落在弹窗里的**第一个按钮**上（玩家反馈"单击直接睡俩小时"—— 睡觉面板第一个按钮就是小睡）。
  //    弹窗刚打开的头 350ms 内，忽略落在 #modal 里的点击（捕获阶段拦，先于按钮自己的 onclick）。
  //    350ms 覆盖了老 iPad 那个"触摸后约 300ms 才补一发 click"的老毛病，人手正常点击快不过它。
  //    程序化点击（e.isTrusted === false，自动化探针用）不拦，避免探针被这层防护吞掉。
  document.addEventListener('click', (e) => {
    const mm = document.getElementById('modal');
    if (!mm || !mm.classList.contains('open')) return;
    if (e.isTrusted !== false && Date.now() - modalOpenedAt < 350 && mm.contains(e.target)) { e.stopPropagation(); e.preventDefault(); }
  }, true);
  document.addEventListener('pointerdown', (e) => {
    const t = (e.target && e.target.closest) ? e.target.closest('button, .mini-btn, .tab, .hotspot, .map-arrow, .action-btn, [data-choice]') : null;
    if (!t || t.disabled || t.classList.contains('lockedb') || t.classList.contains('locked')) return;
    const now = Date.now();
    if (now - _lastClickAt < 45) return;
    _lastClickAt = now;
    try { AudioFX.play('click'); } catch (err) {}
  }, true);

  function init() {
    applySkin();      // 开局先套上上次选的皮肤包
    applyLogMode();   // 开局先把上次选的日志显示方式套上
    const crashes = noteBootStart();   // 上次是不是"没走到渲染成功就没了"（=崩了）
    const inGame = inGameCrashes();
    // 标题页能画出来 = 启动成功（这一步以前漏了，导致"只开标题页"被算成崩溃）
    const go = () => { showTitle(); noteBootOk(); if (window.__guyuBoot) window.__guyuBoot.ready(); if (crashes >= 2 || inGame >= 2) showSafeMode(Math.max(crashes, inGame)); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
  }
  // 安全模式：连着两次启动都没成功 → 大概率是"某份存档/某个状态一进来就崩"。
  // 给玩家一个出口：看到报错、救出存档码、用上一次的备份存档继续。
  function showSafeMode(crashes) {
    const err = (function () { try { return localStorage.getItem('guyuyizhang_lasterr') || '（没记到具体报错）'; } catch (e) { return '（读不到）'; } })();
    showModal('overlay', {
      title: '启动异常 · 安全模式',
      text: '上次打开游戏时中途出错了（连续 ' + crashes + ' 次）。\n\n报错记录：' + String(err).slice(0, 160)
        + '\n\n建议先「导出存档码」保命，再试「用备份存档打开」（备份是上一次保存前的状态，最多丢几步）。',
      choices: [
        { label: '用备份存档打开', hint: '回退到上次保存前的状态', ok: () => {
          const r = Game.restoreBackupSave ? Game.restoreBackupSave() : { ok:false, reason:'这个版本没有备份存档功能' };
          if (r && r.ok) { begin(); addLog('已用备份存档打开。', 'good'); }
          else { centerToast('打不开备份：' + ((r && r.reason) || '未知')); }
        } },
        { label: '导出存档码', hint: '复制保存，换设备/找作者都能恢复', ok: () => showModal('codex', { mode: 'export', code: Game.exportCode() }) },
        { label: '继续进入游戏', hint: '我了解风险', ok: () => {} },
      ],
    });
  }
  // 原生壳只调用这两个明确接口，不直接修改场景、装备或存档字段。
  function setHostSuspended(on) {
    Game.setHostSuspended(on);
    AudioFX.setHostSuspended(on);
    if (on && Game.S()) return Game.save().ok;
    return true;
  }
  function handleBack() {
    if (uiBusy || traveling) return true;
    if (modal || battleView) { closeModal(); return true; }
    if (roomView) { roomView = false; render(); return true; }
    if (view === 'map' && Game.S()) { view = 'scene'; render(); return true; }
    return false; // 由原生壳弹出保存并退出确认。
  }
  return { init, showTitle, begin, render, setHostSuspended, handleBack };
})();

UI.init();
