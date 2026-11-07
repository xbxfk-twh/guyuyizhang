/* art：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const GameArtView = (() => {
  function create(deps) {
    const $=(...args)=>deps.$(...args);
    const el=(...args)=>deps.el(...args);
    const render=(...args)=>deps.render(...args);
    const showModal=(...args)=>deps.showModal(...args);
const ACCENT = { pistol:1, bullet:1, brokenPistol:1, deepCore:1, divineBow:1, divineArmor:1, divinePack:1, divineSuperPack:1 };

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

function iconImage(src, classes='') {
    return `<img class="item-icon${classes}" width="32" height="32" src="${src}" alt="" onerror="this.style.display='none'">`;
  }
function itemIcon(id) {
    if(id==='lantern')return iconImage('assets/img/items/lantern-woodcut.png');
    if(['bread','flour'].includes(id))return iconImage(`assets/img/items/${id}-cut-v2.webp`);
    if(id==='blackGreatSword')return iconImage('assets/img/items/blackGreatSword.png');
    if(['nightmareSoul','nightmareSoul2','nightmareSoul3'].includes(id)) return iconImage('assets/img/items/nightmareSoul.png');
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
    if (!(id in deps.SPR)) return `<span class="inv-glyph">${it.glyph}</span>`;
    const dir = (ALWAYS_COLOR[id] || (skinOn('accent') && ACCENT[id])) ? 'items-accent' : 'items';
    return iconImage(`assets/img/${dir}/${id}.png?v=${window.BUILD_VER || 'v1.09'}`,ALWAYS_COLOR[id] ? ' always-color' : '');
  }

let currentZone = null;

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function inlineHelp(text) {
    return `<details class="ui-help"><summary class="help-dot" aria-label="查看说明">?</summary><div class="ui-help-text">${esc(text)}</div></details>`;
  }

let toastTimer = null;

function bindPress(el2,onTap,onLong) { PressInput.bind(el2,onTap,onLong); }

function bindWarehouseCard(button,id,dir) {
    button.style.touchAction='pan-y';
    const remember=()=>{deps.inventoryDualScroll=[...document.querySelectorAll('.inventory-pane .work-scroll')].map(e=>e.scrollTop);};
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

function maybeBatchTip(kind) {
    if (Game.batchTipSeen && Game.batchTipSeen()) return;
    const tradeKinds = ['laochao', 'town', 'black', 'atlTrade'];
    const craftKinds = ['craft'];
    if (!tradeKinds.includes(kind) && !craftKinds.includes(kind)) return;
    // 部分手机宿主把主指针报告为 fine；结合触点和移动端信息，避免误显示鼠标提示。
    const isTouch = (window.matchMedia && (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(any-pointer: coarse)').matches))
      || (typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')))
      || window.innerWidth <= 900;
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
    if (deps.logMode === 'fade') { const l = $('#log'); if (l) { l.classList.remove('dim'); clearTimeout(deps.logFadeTimer); deps.logFadeTimer = setTimeout(() => l.classList.add('dim'), 3000); } }
    AudioFX.notify(cls);
    const speech = typeof LINGHUI_LINES !== 'undefined' ? LINGHUI_LINES.findIndex(l=>l===text) : -1;
    if (speech >= 0) AudioFX.playVoice('linghui', speech);
    else if (cls==='blue' && /我好像.*见过这里/.test(text)) AudioFX.playVoice('linghui',8);
    else if (/^灵灰/.test(text)) AudioFX.play('linghuiCue');
    if (deps.activeMerchant && /^(购入|卖出|交换成功)/.test(text)) {
      AudioFX.play('trade'); deps.merchantTrades++;
      if (deps.merchantTrades % 3 === 0) {
        deps.merchantLine=1+Math.floor(Math.random()*2);
        const line=$('#merchant-line'); if(line) line.textContent=MERCHANTS[deps.activeMerchant].lines[deps.merchantLine];
        AudioFX.playVoice(deps.activeMerchant,deps.merchantLine);
      }
    }
  }

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

function skinOn(id) { return deps.skinSet.has(id); }

function saveSkins() { try { localStorage.setItem(deps.SKIN_LS_KEY, JSON.stringify([...deps.skinSet])); } catch (e) {} }

function applySkin() {
    // 没拥有的（改档 / 换账号 / 云端回滚）直接踢掉，别让界面标着"已开启"却什么都没变
    for (const id of [...deps.skinSet]) if (!Game.skinOwned(id)) deps.skinSet.delete(id);
    for (const s of deps.SKINS) if (s.cls) document.body.classList.toggle(s.cls, skinOn(s.id));
    if (document.getElementById('top-day')) render();   // 已进游戏：立刻重绘，让物品图标换成对应皮肤那套（items / items-accent）
  }

function enableSkin(id, on) {
    if (!deps.SKINS.some(s => s.id === id) || id === 'ink' || !Game.skinOwned(id)) return;
    if (on) deps.skinSet.add(id); else deps.skinSet.delete(id);
    saveSkins(); applySkin();
  }

function clearSkins() { deps.skinSet.clear(); saveSkins(); applySkin(); }

function skinName() {
    const on = deps.SKINS.filter(s => skinOn(s.id)).map(s => s.name);
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

function portraitPath(id) {
    const s = deps.SKINS.find(x => skinOn(x.id) && x.portrait);
    const dir = (s && s.portrait) || 'identities';
    return `assets/img/${dir}/${id}.png?v=${(typeof window !== 'undefined' && window.BUILD_VER) || '1'}`;
  }

let animFast = false;

const ANIM_GLYPH = { gather:'采', build:'建', craft:'制', fight:'战', sleep:'眠', rest:'歇' };
    return Object.freeze({itemIcon,esc,inlineHelp,bindPress,bindWarehouseCard,dragTransferQuantity,centerToast,floatingNotice,maybeBatchTip,addLog,replayLog,skinOn,saveSkins,applySkin,enableSkin,clearSkins,skinName,islandMapPath,sceneImagePath,mapImagePath,baseMapImagePath,atlantisVisualArrows,portraitPath});
  }
  return Object.freeze({create});
})();
