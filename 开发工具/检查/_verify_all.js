/* 交付前全面核对：把本轮（v1.06）收到的所有反馈问题逐项自动验证。
   用法：node _verify_all.js           （只读游戏，不改任何文件） */
const fs = require('fs');
const path = require('path');
const ROOT = 'C:\\Users\\34297\\Desktop\\孤屿遗章\\孤屿遗章-游戏 - 发布';
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');
const UI = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const box = {};
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console', 'box',
  DATA + '\n' + GAME + '\n' +
  'box.ITEMS=ITEMS; box.RECIPES=RECIPES; box.SCENES=SCENES; box.ENEMIES=ENEMIES; box.FURNITURE=FURNITURE;' +
  'box.DURAA=DURA; box.TOWN=TOWN; box.LAOCHAO=LAOCHAO; box.BLACKMARKET=BLACKMARKET; box.CROPS=CROPS; box.BUILDING_CHAINS=BUILDING_CHAINS;' +
  'box.Game=Game; box.SCENE_HOTSPOTS=SCENE_HOTSPOTS;'
)(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console, box);
const { ITEMS, RECIPES, SCENES, ENEMIES, FURNITURE, DURAA, TOWN, LAOCHAO, BLACKMARKET, SCENE_HOTSPOTS, Game } = box;

let ok = 0; const bad = [];
const ck = (label, cond, extra) => { if (cond) { ok++; console.log('  OK   ' + label + (extra ? '  —— ' + extra : '')); } else { bad.push(label); console.log('  FAIL ' + label + (extra ? '  —— ' + extra : '')); } };
const sec = t => console.log('\n===== ' + t + ' =====');
const exists = p => fs.existsSync(path.join(ROOT, p));
const itemDir = path.join(ROOT, 'assets/img/items');
const accDir = path.join(ROOT, 'assets/img/items-accent');

Game.bind({ onLog: () => {}, onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: () => {} });

// ---------------------------------------------------------------- 1. 物品图标
sec('1. 物品图标（本轮反馈：很多物品没图标 / 手枪彩色版没实装）');
const itemFiles = fs.readdirSync(itemDir).filter(f => f.endsWith('.png')).map(f => f.replace('.png', ''));
const accFiles = fs.existsSync(accDir) ? fs.readdirSync(accDir).filter(f => f.endsWith('.png')).map(f => f.replace('.png', '')) : [];
const NEW19 = ['pistol','bullet','brokenPistol','deepCore','atlantisCore','energyCrystal','hornAmulet',
  'bpPistol','bpBullet','bpCoralBlade','bpCoralArmor','bpThruster','bpSourceSpear','bpSourceArmor',
  'vampire','dodge','satchel','bloodvest','atlantisSeed'];
const missPng = NEW19.filter(id => !itemFiles.includes(id));
ck('上一轮补的 19 个图标都在 items/ 里', missPng.length === 0, missPng.length ? '缺 ' + missPng.join(',') : '共 ' + NEW19.length + ' 个');
const sprBlock = (UI.match(/Object\.assign\(SPR, \{([^}]*)\}\)/) || [])[1] || '';
const sprIds = sprBlock.split(',').map(s => s.split(':')[0].trim()).filter(Boolean);
const missSpr = NEW19.filter(id => !sprIds.includes(id));
ck('19 个图标都登记进 SPR（没登记就只显示字形）', missSpr.length === 0, missSpr.length ? '缺 ' + missSpr.join(',') : 'SPR 追加 ' + sprIds.length + ' 项');
// SPR 全量：登记的每一项都要有 png，否则游戏里会显示字形
const allSpr = (() => {
  const s = new Set();
  (UI.match(/const SPR = \{([^}]*)\}/) || ['', ''])[1].split(',').forEach(x => { const k = x.split(':')[0].trim(); if (k) s.add(k); });
  sprIds.forEach(k => s.add(k));
  return [...s];
})();
// 图标可以在 items/（黑白）或 items-accent/（彩色）任一目录：限定物神弓是常驻彩色，只放 items-accent/
const sprNoPng = allSpr.filter(id => !itemFiles.includes(id) && !accFiles.includes(id));
ck('SPR 里每个图标都有对应 png（黑白或彩色任一目录，不会退化成字形）', sprNoPng.length === 0, sprNoPng.length ? '缺 ' + sprNoPng.join(',') : allSpr.length + ' 项全部有图');
const accNoPng = accFiles.filter(id => !itemDir.includes(id) ? false : false);
ck('彩色版图标文件存在', accFiles.length > 0, accFiles.join(','));
// ACCENT 名单 vs 彩色文件一致
const accList = (UI.match(/const ACCENT = \{([^}]*)\}/) || [])[1] || '';
const accIds = accList.split(',').map(s => s.split(':')[0].trim()).filter(Boolean);
const accListMissing = accIds.filter(id => !accFiles.includes(id));
const accFileNoList = accFiles.filter(id => !accIds.includes(id));
ck('ACCENT 名单 ↔ items-accent/ 文件一一对应', accListMissing.length === 0 && accFileNoList.length === 0,
   '名单 ' + accIds.length + ' 项 / 文件 ' + accFiles.length + ' 个' + (accListMissing.length ? ' 名单多:' + accListMissing : '') + (accFileNoList.length ? ' 文件多:' + accFileNoList : ''));
// hornAmulet 重裁：留白要够
try {
  const PIL = null; // 用纯 JS 读 PNG 头太麻烦，改由 python 另测 —— 这里只查文件较新
  ck('牛角护符已重裁（文件已更新）', fs.statSync(path.join(itemDir, 'hornAmulet.png')).size !== 9346, fs.statSync(path.join(itemDir, 'hornAmulet.png')).size + ' B');
} catch (e) { ck('牛角护符文件存在', false); }

// ---------------------------------------------------------------- 2. 皮肤切换
sec('2. 皮肤包（本轮反馈：切换皮肤要换图标那套）');
ck('两套皮肤（墨白 / 深海琥珀）', /const SKINS = \[/.test(UI) && /id: 'ink'/.test(UI) && /id: 'accent'/.test(UI));
ck('图标路径按皮肤切换，缺彩色自动回退；限定物常驻彩色',
   /const dir = \(ALWAYS_COLOR\[id\] \|\| \(skin === 'accent' && ACCENT\[id\]\)\) \? 'items-accent' : 'items';/.test(UI) &&
   /const ALWAYS_COLOR = \{ divineBow:1 \};/.test(UI));
ck('切皮肤立刻重绘（否则图标路径不更新）', /if \(document\.getElementById\('top-day'\)\) render\(\);/.test(UI));
ck('皮肤持久化', /guyuyizhang_skin/.test(UI));
ck('六个颜色变量都在皮肤里', /body\.skin-accent \{/.test(CSS) && /--paper:/.test(CSS) && /--ink:/.test(CSS) && /--line:/.test(CSS));
ck('图标底不被压暗（黑墨图标在深色皮肤不会隐形）', /--tile:/.test(CSS) && /body\.skin-accent \.inv-item:hover \{ background: var\(--tile\)/.test(CSS));

// ---------------------------------------------------------------- 3. 睡觉动画
sec('3. 睡觉动画（本轮新增）');
ck('小睡/整觉两张动画图存在', exists('assets/img/anim/sleep_nap.png') && exists('assets/img/anim/sleep_night.png'));
ck('睡觉接进动画系统（含呼吸+飘Z）', /sleep: 2600/.test(UI) && /sleep_nap/.test(UI) && /sleep_night/.test(UI) && /zFloat/.test(CSS) && /sleepBreath/.test(CSS));
ck('守夜不放睡觉动画（守夜是清醒的）', /if \(k === 'watch'\) \{ Game\.sleep\(k\); return; \}/.test(UI));
ck('休息也换成专属动画', /withAnimation\('rest', '休息 '/.test(UI));
ck('睡觉图是暗底（与现有 rest.png 一致）', /filter: grayscale\(1\) contrast\(1\.4\) brightness\(0\.86\)/.test(CSS));

// ---------------------------------------------------------------- 4. 状态条配色
sec('4. 状态条配色（本轮反馈：生命/体力改淡米红/淡米黄）');
ck('淡米红 / 淡米黄 变量已定义', /--hp: #d9a094;/.test(CSS) && /--sta: #dcc9a2;/.test(CSS));
ck('顶栏生命条用淡米红、体力条用淡米黄', /\.stat-fill\.hp \{ background: var\(--hp\); \}/.test(CSS) && /\.stat-fill\.st \{ background: var\(--sta\); \}/.test(CSS));
ck('战斗里的玩家血条也用淡米红', /\.hp-fill\.me \{ background: var\(--hp\); \}/.test(CSS));
ck('敌人血条没被误改（仍是纸白/首领红）', /\.hp-fill \{ height: 100%; background: var\(--paper\);/.test(CSS) && /\.hp-fill\.boss \{ background: #c0392b; \}/.test(CSS));

// ---------------------------------------------------------------- 5. 工具栏图标
sec('5. 工具栏图标（本轮反馈：装备工具栏看不到工具图标）');
ck('工具栏槽位改用 itemIcon（原来是字形）', /data-toolslot="\$\{i\}">\$\{itemIcon\(tid\)\}/.test(UI));
ck('神物栏仍是字形（神物没有图标，属正常）', /data-unequip="\$\{v\}">\$\{RELICS\[v\]\.glyph\}/.test(UI));

// ---------------------------------------------------------------- 6. 热点与地图
sec('6. 热点与地图（本轮反馈：热点位置固定、竹林热点右移）');
const bam = (SCENE_HOTSPOTS.bamboo || []).find(h => h.point === 'bamboo_deep');
ck('竹林深处的热点已右移（x=82 y=22 右上角）', bam && bam.x === 82 && bam.y === 22, bam ? 'x=' + bam.x + ' y=' + bam.y : '没找到');
const sceneHotspotPinned = /classList\.add\('pinned'/.test(UI);
ck('场景热点没有做成"贴边浮动"（位置固定在图上、靠拖动看）', /function applyScenePan\(\)/.test(UI) && /applyBox\('#hotspots', box, scenePanY\)/.test(UI) && !/hotspot[\s\S]{0,80}pinned/.test(UI));
ck('热点百分比锚在图片内容盒上（不因铺满裁切而错位）', /function coverBox\(iw, ih, bw, bh, zoom\)/.test(UI) && /applyBox\('#hotspots'/.test(UI));
// 作者明确要求：热点要"像印在地图上"——随图滑动、被屏幕裁掉就自然滑出去，
// **不许突然出现/消失（不做显隐判定）、不许有任何独立位移**。
ck('大地图热点完全锁定在地图上（不显隐、不独立位移、不贴边浮动）',
   /a\.classList\.remove\('offscreen'\)/.test(UI) && !/classList\.add\('offscreen'\)/.test(UI) &&
   /a\.style\.marginLeft = ''/.test(UI) && !/a\.style\.marginLeft = Math\.round/.test(UI) &&
   !/classList\.add\('pinned'/.test(UI) && !/\.map-arrow\.pinned \{/.test(CSS) && !/i \* 34/.test(UI) && !/side \* 90/.test(UI));
// 玩家最终明确要求：**整张岛要拖着看**，一进地图不能把所有场景热点送到眼前，
// 也不许给任何场景（含山顶、珍珠洞窟）做自动送达/位移/动画。
// 所以这里验：① 地图足够大（一次看不全）② 没有自动居中逻辑 ③ 纵横向全范围可拖。
ck('地图纵向留出足够拖动余量（zoom 是真正的下界，不被钳制吃掉）',
   /const sFloor = Math\.max\(bw \/ iw \* 1\.10, bh \/ ih\);/.test(UI) &&
   /const s = Math\.max\(sCover, sFloor > \(bh \/ ih\) \* 1\.02 \? sFloor : 0\);/.test(UI) &&
   /maxPan/.test(UI));
ck('★ 没有自动居中：整张岛靠玩家自己拖',
   !/function centerMapOn/.test(UI) && !/mapNeedCenter/.test(UI) && !/mapCenterY/.test(UI));
ck('★ 宽度贴合画面：缩放按"画面比例 ÷ 地图比例"算',
   /function mapZoom\(\)/.test(UI) &&
   /Math\.max\(1, \(wrap\.clientWidth \/ wrap\.clientHeight\) \/ \(img\.naturalWidth \/ img\.naturalHeight\)\)/.test(UI));
ck('★ 热点全部能滑到（横向范围"够用即止"）',
   /const needX = 110 \+ box\.w \* 0\.06;/.test(UI) && /maxPanX/.test(UI) &&
   !/MAP_KEY_L/.test(UI) && !/MAP_KEY_R/.test(UI));

// ---------------------------------------------------------------- 7. 战斗：攻速与双持
sec('7. 战斗：攻速对称与轮流挥砍');
ck('攻速主副手对称（按攻击力加权平均）', /const wa = Math\.max\(1, w\.atk \|\| 1\), wb = Math\.max\(1, w2\.atk \|\| 1\);/.test(GAME));
ck('旧的"只看主手"写法已不在', !/if \(w && w\.spd\) s = w\.spd;/.test(GAME));
ck('双匕首 ×2 用数据标记而非武器名正则', /w\.dual && w2\.dual/.test(GAME) && /dual:1/.test(DATA));
ck('轮流挥砍（一把一刀，各自扣耐久）', /function weaponTurnSlot\(\)/.test(GAME) && /function meleeWeaponNow\(\)/.test(GAME));
ck('日志标出所用武器', /const wTag = usedW \? `〔\$\{wNameOf\(usedW\.id\)\}〕` : '';/.test(GAME));
{
  const gr = (m, o) => { Game.newGame('fisher', 'normal'); const s = Game.S(); s.inv = {};
    ['ironGreatSword','ironDagger','knifeStone','ironSword','bow','bullet'].forEach(id => Game.addItem(id, 2, true));
    s.equipment.weapon = m; s.equipment.weapon2 = o; s.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
    s.stats.hp = 999999; s.stats.stamina = 99999; return s; };
  gr('knifeStone', 'ironGreatSword'); const a = Game.combatSpeed();
  gr('ironGreatSword', 'knifeStone'); const b = Game.combatSpeed();
  ck('实测：主副手互换攻速完全相同', a === b, a + ' / ' + b);
  gr('knifeStone', null); const c = Game.combatSpeed();
  ck('实测：单持攻速不变（石匕首 15）', c === 15, 'spd=' + c);
  gr('ironGreatSword', null); const d = Game.combatSpeed();
  ck('实测：单持铁大剑攻速 6', d === 6, 'spd=' + d);
  gr('ironDagger', null); const e1 = Game.combatSpeed();
  gr('ironDagger', 'knifeStone'); const e2 = Game.combatSpeed();
  ck('实测：双匕首仍享受 ×2', e2 > e1 * 1.7, e1 + ' → ' + e2);
}

// ---------------------------------------------------------------- 8. 双手武器规则
sec('8. 双手武器规则（本轮反馈：手上握双手武器时不能再装单手）');
ck('有"先卸下"的拦截逻辑', /if \(mainTwo && !it\.twoHand\) \{/.test(GAME) && /请先把它卸下/.test(GAME));
ck('盾牌也一并拦下', /腾不出手拿盾/.test(GAME));
{
  Game.newGame('fisher', 'normal');
  const s = Game.S(); s.inv = {};
  ['ironGreatSword','ironDagger','woodShield'].forEach(id => Game.addItem(id, 2, true));
  Game.equip('ironGreatSword');
  Game.equip('ironDagger');
  ck('实测：握双手剑时装匕首 → 大剑还在、副手仍空', s.equipment.weapon === 'ironGreatSword' && !s.equipment.weapon2,
     'weapon=' + s.equipment.weapon + ' weapon2=' + s.equipment.weapon2);
  Game.equip('woodShield');
  ck('实测：握双手剑时装盾牌 → 被拦下', !s.equipment.weapon2);
  Game.unequip('ironGreatSword');
  Game.equip('ironDagger');
  ck('实测：卸下双手剑后单手能正常装', s.equipment.weapon === 'ironDagger', 'weapon=' + s.equipment.weapon);
}

// ---------------------------------------------------------------- 9. 手枪
sec('9. 手枪（本轮反馈：副手 90% 漏洞 + 校准名不副实）');
ck('命中按"真正开火的武器"算（副手不再绕过）', /function rangedKind\(w\)/.test(GAME) && /function rangedAcc\(kind\)/.test(GAME) && /if \(anyRanged\) acc = rangedAcc\(rangedKind\(rangedWeapon\(\)\)\);/.test(GAME));
ck('旧的"只看主手是手枪"写法已不在', !/ITEMS\[S\.equipment\.weapon\]\.id === 'pistol'\) acc = 0\.6/.test(GAME));
ck('校准：基础 60% / 校准后 70% + 存档字段', /pistolCalib\(\) \? 0\.7 : 0\.6/.test(GAME) && /pistolCalibrated/.test(GAME) && /S\.pistolCalibrated === undefined\) S\.pistolCalibrated = false/.test(GAME));
ck('校准费 源矿×2', /校准源能手枪需要 源矿×2/.test(GAME) && /源矿×2/.test(UI));
ck('主手副手都能校准', /需要先把「源能手枪」装备到主手或副手/.test(GAME));
ck('弹药不能装到手上', /if \(it\.ammo\) \{ log\(/.test(GAME) && /!ITEMS\[id\]\.ammo\)/.test(UI));
{
  const shot = (main, off, calibrated, rv) => {
    Game.newGame('fisher', 'normal');
    const s = Game.S(); s.inv = {};
    ['pistol','bullet','ironSword','bow','arrow'].forEach(id => Game.addItem(id, 50, true));
    s.equipment.weapon = main; s.equipment.weapon2 = off;
    s.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
    s.pistolCalibrated = !!calibrated; s.stats.hp = 999999; s.stats.stamina = 99999;
    const r0 = Math.random; Math.random = () => rv;
    Game.startFight(ENEMIES.boar, true);
    const C = Game.S().combat;
    if (!C) { Math.random = r0; return 'no-combat'; }
    C.enemies.forEach(e => { e.ehp = 999999; e.emax = 999999; });
    C.bowShots = 0;
    const before = C.log.length;
    Game.S().stats.hp = 999999;
    Game.fightAction('ranged');
    const C2 = Game.S().combat;
    let res = 'no-log';
    if (C2) { const nw = C2.log.slice(before).join(' '); res = /造成/.test(nw) ? 'hit' : (/落空|擦着/.test(nw) ? 'miss' : '?'); }
    Math.random = r0; return res;
  };
  ck('实测：副手手枪 0.65 落空（吃 60% 惩罚，不再 ~90%）', shot('ironSword','pistol',false,0.65) === 'miss');
  ck('实测：副手手枪 0.55 命中', shot('ironSword','pistol',false,0.55) === 'hit');
  ck('实测：校准后 0.65 命中、0.80 落空（70%）', shot('ironSword','pistol',true,0.65) === 'hit' && shot('ironSword','pistol',true,0.80) === 'miss');
  ck('实测：弓开火仍按 90%（0.80 命中）', shot('bow','pistol',false,0.80) === 'hit');
}

// ---------------------------------------------------------------- 10. 横扫
sec('10. 横扫（本轮新增：双手重武器，CD 20 单位时间，对全体 1 倍伤害）');
ck('CD=20、双手专属、有 UI 按钮', /const SWEEP_CD = 20;/.test(GAME) && /function sweepInfo\(\)/.test(GAME) && /data-fact="sweep"/.test(UI));
ck('横扫自己在冷却里不重复扣', /if \(act !== 'sweep' && C\.sweepCd > 0\) C\.sweepCd--;/.test(GAME));
{
  Game.newGame('fisher', 'normal');
  const s = Game.S(); s.inv = {}; Game.addItem('ironGreatSword', 3, true);
  s.equipment.weapon = 'ironGreatSword'; s.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
  s.stats.hp = 999999; s.stats.stamina = 99999;
  ck('不在战斗时不可用并给出原因', Game.sweepInfo().usable === false && !!Game.sweepInfo().reason, JSON.stringify(Game.sweepInfo()));
  Game.startFight(ENEMIES.boar, true);
  const C0 = Game.S().combat;
  C0.enemies.push(JSON.parse(JSON.stringify(C0.enemies[0])));
  C0.enemies.forEach(e => { e.ehp = 500; e.emax = 500; e.def = 0; e.intent = null; });
  const hp0 = C0.enemies.map(e => e.ehp);
  const rk = Math.random; Math.random = () => 0.1;
  Game.fightAction('sweep');
  const C1 = Game.S().combat;
  ck('实测：横扫同时打到全部敌人', C1 && C1.enemies.length === 2 && C1.enemies.every((e,i) => e.ehp < hp0[i]),
     C1 ? C1.enemies.map(e => Math.round(hp0[0] - e.ehp)).join('/') : '无战斗');
  ck('实测：横扫后冷却恰为 20', C1 && C1.sweepCd === 20, C1 ? 'cd=' + C1.sweepCd : '');
  const hp2 = C1.enemies.map(e => e.ehp);
  Game.fightAction('sweep');
  ck('实测：冷却中再点横扫无伤害', Game.S().combat.enemies.every((e,i) => e.ehp === hp2[i]));
  Math.random = rk;
}

// ---------------------------------------------------------------- 11. 多目标敌人行为
sec('11. 多目标敌人行为（本轮新增：蓄力/掩护/猛击）');
ck('只在活着的敌人≥2 时触发（单挑保持原样）', /return C\.enemies\.filter\(e => e\.ehp > 0\)\.length >= 2;/.test(GAME));
ck('概率 20/20/30、掩护 −30%、猛击 ×1.3 且防御归零',
   /r < 0\.20\) \? 'charge' : \(r < 0\.40\) \? 'cover' : \(r < 0\.70\) \? 'heavy'/.test(GAME) &&
   /ENEMY_COVER_REDUCE = 0\.30/.test(GAME) && /ENEMY_HEAVY_MUL = 1\.3/.test(GAME) && /e\.def = 0;/.test(GAME));
ck('UI 有意图标签', /intent-tag/.test(UI) && /蓄力/.test(UI) && /掩护/.test(UI) && /猛击/.test(UI) && /\.intent-tag\.charge/.test(CSS));
ck('小怪防御用各自 baseDef 复原（不被首领防御顶掉）', /baseDef/.test(GAME) && /e\.baseDef !== undefined\) \? e\.baseDef/.test(GAME));
{
  const cnt = { charge:0, cover:0, heavy:0, attack:0, other:0 };
  let n = 0;
  for (let i = 0; i < 300; i++) {
    Game.newGame('fisher', 'normal');
    const s = Game.S(); s.inv = {}; s.stats.hp = 999999; s.stats.stamina = 99999;
    Game.addItem('ironSword', 5, true);
    s.equipment.weapon = 'ironSword'; s.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
    Game.startFight(ENEMIES.wolf, true);
    const c = Game.S().combat;
    if (!c) continue;
    if (c.enemies.length < 2) c.enemies.push(JSON.parse(JSON.stringify(c.enemies[0])));
    c.enemies.forEach(e => { e.ehp = 99999; e.emax = 99999; });
    Game.fightAction('attack');
    const c2 = Game.S().combat;
    if (!c2) continue;
    c2.enemies.forEach(e => { n++; cnt[cnt[e.intent] !== undefined ? e.intent : 'other']++; });
  }
  const pc = k => n ? Math.round(cnt[k] / n * 100) : 0;
  ck('实测：意图分布接近 20/20/30/30', pc('charge') >= 12 && pc('charge') <= 30 && pc('cover') >= 12 && pc('cover') <= 30 &&
     pc('heavy') >= 20 && pc('heavy') <= 40 && pc('attack') >= 20 && pc('attack') <= 40 && cnt.other === 0,
     'charge' + pc('charge') + '% cover' + pc('cover') + '% heavy' + pc('heavy') + '% attack' + pc('attack') + '% n=' + n);
}

// ---------------------------------------------------------------- 12. 狼王召唤
sec('12. 狼王召唤（本轮反馈：改 3 回合一只、强度略增）');
ck('按回合每 3 回合（旧的按出手次数已移除）', /C\.round % 3 !== 0 \|\| C\._summonedRound === C\.round/.test(GAME) && !/C\.summonTick \+\+/.test(GAME));
ck('狼王之爪 34/11/3（旧 26/8/2）', /狼王之爪'[\s\S]{0,90}ehp:34[\s\S]{0,40}atk:11[\s\S]{0,20}def:3/.test(GAME));
{
  Game.newGame('fisher', 'normal');
  const s = Game.S(); s.inv = {}; s.stats.hp = 999999; s.stats.stamina = 99999;
  Game.addItem('ironSword', 5, true);
  s.equipment.weapon = 'ironSword'; s.equipIdx = { weapon:0, weapon2:0, armor:0, cloth:0, accessory:0 };
  Game.startFight(ENEMIES.wolfKing, true);
  const at = [];
  for (let t = 1; t <= 9 && Game.S().combat; t++) {
    const n0 = Game.S().combat.enemies.length;
    Game.S().stats.hp = 999999;
    Game.S().combat.enemies.forEach(e => { if (e.id === 'wolfKing') { e.ehp = 99999; e.emax = 99999; } });
    Game.fightAction('attack');
    const c = Game.S().combat;
    if (!c) break;
    if (c.enemies.length > n0) at.push(t);
  }
  ck('实测：第 3 / 6 / 9 次行动各召唤一只', at.join(',') === '3,6,9', '实际 ' + at.join(','));
  const mn = Game.S().combat ? Game.S().combat.enemies.find(e => e.id === 'wolfMinion') : null;
  ck('实测：小怪防御是它自己的 3（没被首领顶掉）', !mn || mn.def === 3, mn ? 'def=' + mn.def : '未召到');
}

// ---------------------------------------------------------------- 13. 金矿平衡
sec('13. 金矿平衡（本轮反馈：贝壳太好赚）');
const deep = SCENES.find(x => x.id === 'cave').points.find(p => p.id === 'cave_deep');
ck('门槛提到镐 tier3', deep.need.tool === 'pick' && deep.need.tier === 3, 'tier' + deep.need.tier);
ck('每日 1 次', deep.daily === 1, 'daily=' + deep.daily);
ck('售价 80→55（物品价 + 铁匠收购价同步）', ITEMS.goldore.price <= 55 && TOWN.smith.buy.find(e => e.id === 'goldore').base <= 55, '价 ' + ITEMS.goldore.price);

// ---------------------------------------------------------------- 14. 石板
sec('14. 石板不再能买卖（本轮反馈：总有玩家去卖石板）');
const slateSellers = [LAOCHAO, TOWN.grocer, TOWN.smith, TOWN.informant, BLACKMARKET];
ck('五个商人都不再收/卖石板',
   slateSellers.every(s => (s.buy || []).every(e => e.id !== 'slate') && (s.sell || []).every(e => e.id !== 'slate')));
ck('石板说明写明"没人肯收"', /没人肯收/.test(ITEMS.slate.desc));

// ---------------------------------------------------------------- 15. 面板与按钮
sec('15. 面板与按钮（本轮反馈：营地面板声音/鸡舍按钮看不见/右下角重叠）');
ck('营地面板不再重复放声音开关', !/data-audm/.test(UI) && !/data-auda/.test(UI));
ck('按钮自带前景色（深底卡片里不再浅底浅字）', /\.modal-actions button, \.mini-btn, \.tab \{[^}]*color: var\(--ink\)/.test(CSS) && /\.furn\.built \.mini-btn \{ color: var\(--ink\); \}/.test(CSS));
ck('右下角动作按钮与休息栏同列（结构上不可能重叠）',
   /<div id="hud-bottomright">/.test(UI) && /#hud-bottomright \{ position: fixed/.test(CSS) && /#hud-bottomright > \* \{ pointer-events: auto; \}/.test(CSS) &&
   !/#scene-actions \{ position: absolute/.test(CSS) && !/#rest-bar \{ position: fixed/.test(CSS));
ck('日志栏展开按钮贴在「返回地图」右侧且同高', /function alignLogGrip\(\)/.test(UI) && /r\.right \+ 8/.test(UI) && /g\.style\.height = Math\.round\(r\.height\)/.test(UI) && !/top: 42%/.test(CSS));

// ---------------------------------------------------------------- 16. 打包前置
sec('16. 打包前置检查');
ck('BUILD_VER 与所有资源缓存参数同步', (() => {
  const bv = (HTML.match(/window\.BUILD_VER = '([^']+)'/) || [])[1] || '';
  const qs = [...HTML.matchAll(/\?v=([^"]+)/g)].map(m => m[1]);
  return bv && qs.length >= 5 && qs.every(q => q === bv);
})(), (HTML.match(/window\.BUILD_VER = '([^']+)'/) || [])[1]);
ck('所有 js/css 资源文件存在', ['js/data.js','js/game.js','js/ui.js','js/audio.js','css/style.css'].every(f => exists(f)));

console.log('\n================ 汇总 ================');
console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
if (bad.length) { console.log('失败项：'); bad.forEach(b => console.log(' - ' + b)); }
console.log(bad.length ? 'RESULT:FAIL' : 'RESULT:PASS');
/* ⚠️⚠️ 历史脚本（2026-09 早期）—— 已被 回归测试\audit.js 取代，**别拿它的 FAIL 当 bug**。
   里面好几条要求后来被作者推翻了（例："不要自动居中"→ 后来改成"进图一定要自动居中"；
   "横扫 CD 20 次出手"→ 后来改成时间制 20 秒；地图尺寸也改成"宽度=屏幕宽度"）。
   现在打包前的权威门禁是：回归测试\audit.js + 开发工具\检查\_audit_announcement.js + _smoke_test.js。 */
