/* ============================================================
   孤屿遗章 · 数据层
   全部游戏内容数据的唯一来源：物品 / 场景 / 配方 / 建筑 / 敌人 / 事件
   ============================================================ */

// ---------- 物品 ----------
// cat: mat原料 food食物 drink饮品 tool工具 weapon武器 armor防具 cloth衣物 med药品
//      special特殊 seed种子 bp图纸 currency货币
const ITEMS = {
  // ---- 货币 ----
  beibi:  { name:'贝壳币', cat:'currency', glyph:'贝', desc:'海边捡来的贝壳，岛上的通用零钱。', stack:9999 },
  coin:   { name:'金币',   cat:'currency', glyph:'币', desc:'沉船与遗迹里的古金币，1 枚可兑 30 贝壳。', stack:9999 },
  // ---- T1 原料 ----
  wood:    { name:'木材', cat:'mat', glyph:'木', desc:'从树林砍来的原木，一切建造的基础。', stack:20, price:2 },
  branch:  { name:'树枝', cat:'mat', glyph:'枝', desc:'细小的干枝，火把与燃料。', stack:20, price:1 },
  stone:   { name:'石头', cat:'mat', glyph:'石', desc:'坚硬的石块，工具与建材。', stack:20, price:2 },
  flint:   { name:'燧石', cat:'mat', glyph:'燧', desc:'可以打火的石头，制作石器。', stack:20, price:3 },
  thatch:  { name:'茅草', cat:'mat', glyph:'草', desc:'干茅草，屋顶与草床的材料。', stack:30, price:1 },
  bamboo:  { name:'竹子', cat:'mat', glyph:'竹', desc:'坚韧的空心竹，用途极广。', stack:20, price:3 },
  fiber:   { name:'竹纤维', cat:'mat', glyph:'纤', desc:'剖竹而得的纤维，可纺成布。', stack:30, price:2 },
  vine:    { name:'藤蔓', cat:'mat', glyph:'藤', desc:'柔韧的藤条，编织与捆绑。', stack:20, price:2 },
  clay:    { name:'黏土', cat:'mat', glyph:'泥', desc:'河畔的黏土，烧陶砌砖。', stack:20, price:3 },
  herb:    { name:'草药', cat:'mat', glyph:'药', desc:'常见的草药，制药原料。', stack:20, price:4 },
  // ---- T2 原料 ----
  ironore:   { name:'铁矿石', cat:'mat', glyph:'铁', desc:'含铁的矿石，炼铁原料。', stack:20, price:15 },
  hide:      { name:'兽皮', cat:'mat', glyph:'皮', desc:'野兽的皮毛，制革缝衣。冬天行情好（卖价 +50%）。', stack:20, price:15, winter:1.5 },
  meat:      { name:'兽肉', cat:'food', glyph:'肉', food:12, water:2, spoil:24, desc:'新鲜的兽肉，最好尽快处理。', stack:20, price:8 },
  sinew:     { name:'兽筋', cat:'mat', glyph:'筋', desc:'剥取的兽筋，做弓弦。', stack:20, price:6 },
  wool:      { name:'羊毛', cat:'mat', glyph:'毛', desc:'羊群身上剪下的羊毛。', stack:20, price:10 },
  resin:     { name:'树脂', cat:'mat', glyph:'脂', desc:'松树的树脂，防水与引火。', stack:20, price:8 },
  honey:     { name:'蜂蜜', cat:'food', glyph:'蜜', food:15, water:1, sta:7, spoil:240, desc:'蜂巢里的野蜂蜜，甜而珍贵。', stack:20, price:35 },
  mushroom:  { name:'蘑菇', cat:'food', glyph:'菇', food:4, water:1, spoil:48, desc:'林间野菇，有轻微毒性，煮汤更安全。', stack:20, price:5 },
  bambooShoot:{ id:'bambooShoot', name:'竹笋', cat:'food', glyph:'笋', food:8, water:2, spoil:72, desc:'鲜嫩的竹笋，春日限定。', stack:20, price:10 },
  niter:     { name:'硝石', cat:'mat', glyph:'硝', desc:'洞窟里的硝石，火药原料。', stack:20, price:10 },
  sulfur:    { name:'硫磺', cat:'mat', glyph:'硫', desc:'荒漠的硫磺，火药原料。', stack:20, price:10 },
  snakegall: { name:'蛇胆', cat:'mat', glyph:'胆', desc:'毒蛇的胆，解毒剂的药引，不能生服。', stack:20, price:20 },
  tusk:      { name:'野猪獠牙', cat:'special', glyph:'牙', desc:'弯曲的獠牙，商队喜欢收。', stack:20, price:25 },
  horn:      { name:'牛角', cat:'special', glyph:'角', desc:'野牛的大角。', stack:20, price:30 },
  venom:     { name:'蝎毒', cat:'special', glyph:'毒', desc:'沙蝎尾针里的毒液，是配制淬毒剂的原料。', stack:20, price:40 },
  poisonCoat:{ name:'淬毒剂', cat:'special', glyph:'淬', coatPoison:1, desc:'蝎毒调入树脂熬成的毒膏。战斗中使用可淬在武器上，接下来 3 次命中让敌人中毒（每回合掉血）。', stack:10, price:60 },
  silk:      { name:'蛛丝', cat:'mat', glyph:'丝', desc:'坚韧的蛛丝，可纺可卖。', stack:20, price:15 },
  // ---- T3 原料 ----
  goldore:   { name:'金矿石', cat:'mat', glyph:'金', desc:'闪着微光的金矿石。只能卖给铁匠换贝壳，不能打造任何东西。', stack:20, price:55 },
  crystal:   { name:'水晶', cat:'mat', glyph:'晶', desc:'洞窟深处的水晶。', stack:20, price:120 },
  blackiron: { name:'玄铁矿', cat:'mat', glyph:'玄', desc:'山顶的黑色矿石，沉重而稀有。', stack:20, price:200 },
  mithril:   { name:'秘银矿', cat:'mat', glyph:'秘', desc:'雪线之下的银色矿石，极为稀有。', stack:20, price:250 },
  snowlotus: { name:'雪莲', cat:'mat', glyph:'莲', desc:'山顶雪线上的雪莲。', stack:20, price:250 },
  eaglefeather:{ id:'eaglefeather', name:'鹰羽', cat:'mat', glyph:'羽', desc:'鹰巢里的长羽。', stack:20, price:60 },
  pearl:     { name:'珍珠', cat:'special', glyph:'珠', desc:'蚌壳里的珍珠，商人抢着要。', stack:20, price:200 },
  seasalt:   { name:'海盐', cat:'special', glyph:'盐', desc:'颗粒粗的晒制海盐（旧版遗留），杂货商按杂盐收。', stack:20, price:20 },
  fossil:    { name:'化石', cat:'mat', glyph:'化', desc:'荒漠里的骨化石，可能藏着龙骨。', stack:20, price:50 },
  shipwood:  { name:'船木', cat:'mat', glyph:'船', desc:'沉船上拆下的好木头。', stack:20, price:25 },
  sharkfin:  { name:'鲨鱼翅', cat:'special', glyph:'翅', desc:'鲨鱼的背鳍，远洋商人高价收。', stack:20, price:180 },
  wolfkingpelt:{ id:'wolfkingpelt', name:'狼王皮', cat:'special', glyph:'王', desc:'狼王的皮毛，整座岛最凶的凭证。', stack:5, price:300 },
  queenSilk: { name:'女王丝', cat:'special', glyph:'皇', desc:'蜘蛛女王的丝，顶级材料。', stack:5, price:400 },
  // ---- 加工件 ----
  plank:  { name:'木板', cat:'mat', glyph:'板', desc:'削平的木板。', stack:20, price:8 },
  pole:   { name:'木杆', cat:'mat', glyph:'杆', desc:'修长的木杆。', stack:20, price:4 },
  stonebrick:{ id:'stonebrick', name:'石砖', cat:'mat', glyph:'砖', desc:'烧制的石砖。', stack:20, price:10 },
  tile:   { name:'瓦片', cat:'mat', glyph:'瓦', desc:'烧制的瓦片。', stack:20, price:8 },
  charcoal:{ id:'charcoal', name:'木炭', cat:'mat', glyph:'炭', desc:'烧制的木炭，冶炼燃料。', stack:20, price:10 },
  ironingot:{ id:'ironingot', name:'铁锭', cat:'mat', glyph:'锭', desc:'炼成的铁锭。', stack:20, price:60 },
  steelingot:{ id:'steelingot', name:'钢锭', cat:'mat', glyph:'钢', desc:'炼成的钢锭。', stack:20, price:150 },
  blackingot:{ id:'blackingot', name:'玄铁锭', cat:'mat', glyph:'玄', desc:'玄铁炼成的锭，顶级材料。', stack:20, price:400 },
  mithrilingot:{ id:'mithrilingot', name:'秘银锭', cat:'mat', glyph:'秘', desc:'秘银炼成的锭。', stack:20, price:500 },
  nail:   { name:'铁钉', cat:'mat', glyph:'钉', desc:'锻造的铁钉。', stack:50, price:15 },
  ironpart:{ id:'ironpart', name:'铁件', cat:'mat', glyph:'件', desc:'加工的铁制零件。', stack:20, price:70 },
  rope:   { name:'绳索', cat:'mat', glyph:'绳', desc:'搓成的绳索。', stack:20, price:8 },
  cloth:  { name:'布', cat:'mat', glyph:'布', desc:'织成的布匹。', stack:20, price:15 },
  felt:   { name:'毛毡', cat:'mat', glyph:'毡', desc:'羊毛压成的毡。', stack:20, price:20 },
  canvas: { name:'帆布', cat:'mat', glyph:'帆', desc:'涂了树脂的防水帆布。', stack:20, price:50 },
  claypot:{ id:'claypot', name:'陶锅', cat:'tool', glyph:'锅', desc:'烧制的陶锅，煮汤熬药。', stack:5, price:20 },
  leather:{ id:'leather', name:'皮革', cat:'mat', glyph:'革', desc:'鞣制好的皮革。', stack:20, price:30 },
  basket: { name:'竹篓', cat:'tool', glyph:'篓', cap:10, desc:'编成的竹篓，背包装载+10。', stack:1, price:25 },
  salt:   { name:'盐', cat:'special', glyph:'盐', desc:'珍贵的盐，腌肉调味。', stack:20, price:20 },
  gunpowder:{ id:'gunpowder', name:'火药', cat:'special', glyph:'火', desc:'自制的火药，防御与爆破。', stack:20, price:80 },
  // ---- 食物 ----
  berry:  { name:'浆果', cat:'food', glyph:'莓', food:8, water:2, spoil:48, desc:'酸甜的野果。', stack:20, price:2 },
  wildveg:{ id:'wildveg', name:'野菜', cat:'food', glyph:'菜', food:6, water:1, spoil:36, desc:'河畔常见的野菜。', stack:20, price:2 },
  cactusfruit:{ id:'cactusfruit', name:'仙人掌果', cat:'food', glyph:'果', food:5, water:8, spoil:72, desc:'荒漠里的多汁果子。', stack:20, price:5 },
  water:  { name:'淡水', cat:'drink', glyph:'水', water:25, desc:'清澈的淡水。', stack:20, price:3 },
  fish:   { name:'鱼', cat:'food', glyph:'鱼', food:14, water:3, spoil:24, desc:'新鲜的河鱼。', stack:20, price:5 },
  roastFish:{ id:'roastFish', name:'烤鱼', cat:'food', glyph:'烤', food:25, water:2, sta:8, spoil:24, desc:'篝火上烤好的鱼，香气扑鼻。', stack:20, price:8 },
  roastMeat:{ id:'roastMeat', name:'烤肉', cat:'food', glyph:'炙', food:35, water:1, sta:8, spoil:24, desc:'大块的烤肉。', stack:20, price:15 },
  vegSoup:{ id:'vegSoup', name:'野菜汤', cat:'food', glyph:'汤', food:15, water:10, heal:8, spirit:2, sta:4, spoil:24, desc:'热乎乎的野菜汤。', stack:20, price:10 },
  vegFry:{ id:'vegFry', name:'爆炒野菜', cat:'food', glyph:'炒', food:20, water:2, heal:6, spirit:2, sta:5, spoil:24, desc:'大火快炒的野菜，油盐逼出香味，比汤更顶饱。', stack:20, price:18 },
  meatSoup:{ id:'meatSoup', name:'肉汤', cat:'food', glyph:'羹', food:40, water:12, heal:15, sta:8, spoil:24, desc:'浓香的肉汤，冬日最佳。', stack:20, price:20 },
  meatStew:{ id:'meatStew', name:'炖肉', cat:'food', glyph:'炖', food:45, water:6, heal:18, sta:10, spoil:24, desc:'小火慢炖的肉块，炖到脱骨，最解馋。', stack:20, price:32 },
  honeyWater:{ id:'honeyWater', name:'蜂蜜水', cat:'drink', glyph:'蜜', food:10, water:15, heal:10, spirit:7, sta:7, spoil:24, desc:'甜润的蜂蜜水。', stack:20, price:20 },
  smokedFish:{ id:'smokedFish', name:'熏鱼', cat:'food', glyph:'熏', food:25, water:2, heal:5, spoil:168, desc:'烟熏过的鱼，能存七天。', stack:20, price:15 },
  // ---- 牧场与蛋料理 ----
  hay:      { id:'hay', name:'干草', cat:'mat', glyph:'草', desc:'晒干的茅草，羊的口粮（每只羊每天 1 份）。', stack:50, price:3 },
  egg:      { id:'egg', name:'鸡蛋', cat:'food', glyph:'蛋', food:8, water:2, spoil:168, desc:'母鸡下的蛋，能存一周；也能做成各种蛋料理。', stack:30, price:12 },
  friedEgg: { id:'friedEgg', name:'煎蛋', cat:'food', glyph:'煎', food:15, spoil:72, desc:'一个煎蛋：饱食 +15，能存三天。', stack:20, price:15 },
  bigOmelette:{ id:'bigOmelette', name:'大煎蛋', cat:'food', glyph:'卷', food:60, water:60, heal:10, spoil:240, desc:'五颗蛋摊成的一大张蛋卷：饱食+60、水分+60、生命+10，能存十天。', stack:20, price:60 },
  superEgg: { id:'superEgg', name:'超级大蛋', cat:'food', glyph:'宴', food:100, water:100, sta:100, heal:30, spoil:2376, desc:'十颗蛋堆成的蛋宴：饱食/水分/体力全满，还回 30 生命，能存 99 天。', stack:10, price:200 },
  chick:    { id:'chick', name:'小鸡', cat:'special', glyph:'雏', desc:'外岛买来的小鸡。放进鸡舍，连喂 5 天小麦就长成母鸡。', stack:6, price:80 },
  smokedMeat:{ id:'smokedMeat', name:'熏肉', cat:'food', glyph:'腊', food:30, water:1, heal:8, spoil:168, desc:'烟熏过的肉。', stack:20, price:30 },
  saltedMeat:{ id:'saltedMeat', name:'腌肉', cat:'food', glyph:'腌', food:30, water:1, spoil:168, desc:'盐腌的肉，不易腐坏。', stack:20, price:25 },
  jerky:  { name:'肉干', cat:'food', glyph:'干', food:30, water:1, sta:6, spoil:720, desc:'彻底风干的肉，航海口粮。', stack:20, price:40 },
  mushroomSoup:{ id:'mushroomSoup', name:'蘑菇汤', cat:'food', glyph:'菇', food:20, water:10, heal:20, spoil:24, desc:'鲜美的蘑菇汤。', stack:20, price:12 },
  // ---- 工具（tool:{kind,tier}）----
  axeStone:{ id:'axeStone', name:'石斧', cat:'tool', glyph:'斧', tool:{kind:'axe',tier:1}, desc:'燧石斧，砍树的基本工具。', stack:1 },
  axeIron: { name:'铁斧', cat:'tool', glyph:'斧', tool:{kind:'axe',tier:2}, desc:'铁斧，伐木效率翻倍。', stack:1 },
  axeSteel:{ id:'axeSteel', name:'钢斧', cat:'tool', glyph:'斧', tool:{kind:'axe',tier:3}, desc:'钢斧，削木如泥。', stack:1 },
  pickStone:{ id:'pickStone', name:'石镐', cat:'tool', glyph:'镐', tool:{kind:'pick',tier:1}, desc:'石镐，能采浅层铁矿。', stack:1 },
  pickIron:{ id:'pickIron', name:'铁镐', cat:'tool', glyph:'镐', tool:{kind:'pick',tier:2}, desc:'铁镐，开采深层矿脉。', stack:1 },
  pickSteel:{ id:'pickSteel', name:'钢镐', cat:'tool', glyph:'镐', tool:{kind:'pick',tier:3}, desc:'钢镐，能凿开玄铁。', stack:1 },
  pickBlack:{ id:'pickBlack', name:'玄铁镐', cat:'tool', glyph:'镐', tool:{kind:'pick',tier:4}, desc:'玄铁镐，唯一能采秘银的工具。', stack:1 },
  knifeStone:{ id:'knifeStone', name:'石质匕首', cat:'weapon', glyph:'匕', atk:5, spd:15, dual:1, tool:{kind:'knife',tier:1}, desc:'磨利的石匕首，剥皮剖竹、也能近身划拉。', stack:1 },
  ironDagger:{ id:'ironDagger', name:'铁匕首', cat:'weapon', glyph:'匕', atk:8, spd:14, dual:1, tool:{kind:'knife',tier:2}, desc:'轻快的铁匕首，出手又快又狠。', stack:1 },
  hoe:    { name:'锄头', cat:'tool', glyph:'锄', tool:{kind:'hoe',tier:1}, desc:'翻土的锄头（占工具栏）：在耕地可以「开垦新田」和给作物「松土」提前成熟。', stack:1 },
  rod:    { name:'鱼竿', cat:'tool', glyph:'竿', tool:{kind:'rod',tier:1}, desc:'竹制鱼竿。', stack:1 },
  net:    { name:'渔网', cat:'tool', glyph:'网', tool:{kind:'net',tier:1}, desc:'藤编渔网：河畔、近海、海底鱼群都能撒（河畔一网下去要空几天）。', stack:1 },
  trap:   { name:'陷阱', cat:'tool', glyph:'阱', desc:'木藤陷阱（消耗品）：在草地布下，次日再去草地有 50% 概率捕到羊羔。', stack:5 },
  torch:  { name:'火把', cat:'tool', glyph:'炬', desc:'树脂火把，驱散黑暗。', stack:5 },
  tinder: { name:'火绒', cat:'tool', glyph:'绒', desc:'燧石与茅草做的火绒。', stack:5 },
  spyglass:{ id:'spyglass', name:'望远镜', cat:'tool', glyph:'镜', desc:'水晶镜片，瞭望台三级的关键。', stack:1 },
  // ---- 武器 ----
  club:   { name:'木棒', cat:'weapon', glyph:'棒', atk:5, spd:11, desc:'随手捡的木棒。', stack:1 },
  spear:  { name:'石矛', cat:'weapon', glyph:'矛', atk:6, spd:12, throw:1, desc:'燧石矛，可投掷一次。', stack:1 },
  ironSword:{ id:'ironSword', name:'铁剑', cat:'weapon', glyph:'剑', atk:11, spd:10, desc:'锻打的铁剑。', stack:1 },
  steelSword:{ id:'steelSword', name:'钢剑', cat:'weapon', glyph:'剑', atk:15, spd:9, desc:'百炼的钢剑。', stack:1 },
  blackSword:{ id:'blackSword', name:'玄铁剑', cat:'weapon', glyph:'剑', atk:18, spd:8, desc:'玄铁与秘银铸成的剑。', stack:1 },
  ironGreatSword:{ id:'ironGreatSword', name:'铁大剑', cat:'weapon', glyph:'剑', atk:22, spd:6, twoHand:1, desc:'双手巨剑，沉重缓慢，一击势大力沉。', stack:1 },
  bow:    { name:'猎弓', cat:'weapon', glyph:'弓', atk:10, spd:8, ranged:1, desc:'竹木猎弓，远程先手。', stack:1 },
  // ---------- 限定物：神弓（v1.06 限时活动，全账号唯一，可存进邮箱跨局） ----------
  // 数值与猎弓完全一致（攻10/攻速8），不靠数值膨胀；特权是"每场战斗第一次命中必定会心一击"
  divineBow: { name:'神弓', cat:'weapon', glyph:'弓', atk:10, spd:8, ranged:1, divineCrit:1, stack:1, price:0, alwaysFit:1, keepBroken:1,
    // keepBroken：耐久归零【不会消失】，只自动卸下 —— 它是限时绝版（活动结束后造不出来），
    // 删掉等于玩家白玩一场。回营地磨刀石修补（秘银锭×1）即可再战。
    desc:'传说中的古弓，弓身淌着熔金般的纹路。威力与竹木猎弓无异，但每场战斗的第一次命中必定会心一击。耐久 120，用坏了不会消失，回营地「磨刀石」用秘银锭×1 修补即可再战——全服仅此一把，可存入邮箱留给下一局。（限时制作 26.9.15-26.9.30，活动结束后不能再造，已做出的永久可用）' },
  arrow:  { name:'箭矢', cat:'weapon', glyph:'矢', ammo:1, desc:'燧石箭头的箭。', stack:30 },
  eagleArrow:{ id:'eagleArrow', name:'鹰羽箭', cat:'weapon', glyph:'鹰', ammo:1, atkBonus:8, desc:'鹰羽尾羽的箭，精准有力。', stack:30 },
  // ---- 防具 / 衣物 ----
  grassArmor:{ id:'grassArmor', name:'草甲', cat:'armor', glyph:'甲', def:2, desc:'茅草编的护甲。', stack:1 },
  leatherArmor:{ id:'leatherArmor', name:'皮甲', cat:'armor', glyph:'甲', def:4, desc:'皮革护甲。', stack:1 },
  ironArmor:{ id:'ironArmor', name:'铁甲', cat:'armor', glyph:'甲', def:6, desc:'铁片甲。', stack:1 },
  blackArmor:{ id:'blackArmor', name:'玄铁甲', cat:'armor', glyph:'甲', def:8, desc:'玄铁重甲。', stack:1 },
  grassCloth:{ id:'grassCloth', name:'草衣', cat:'cloth', glyph:'衣', warm:1, desc:'茅草编的衣服。', stack:1 },
  hempCloth:{ id:'hempCloth', name:'麻衣', cat:'cloth', glyph:'衣', warm:2, desc:'纤维织的麻衣。', stack:1 },
  leatherCloth:{ id:'leatherCloth', name:'皮衣', cat:'cloth', glyph:'衣', warm:3, desc:'皮革衣服。', stack:1 },
  furCoat:{ id:'furCoat', name:'毛皮大衣', cat:'cloth', glyph:'裘', warm:6, desc:'厚实的毛皮大衣，山顶必备。', stack:1 },
  shellAmulet:{ id:'shellAmulet', name:'贝壳护符', cat:'accessory', glyph:'贝', def:1, desc:'海贝串成的护符，替你挡一下擦伤。', stack:1, price:40 },
  beastFang:{ id:'beastFang', name:'兽牙吊坠', cat:'accessory', glyph:'牙', atk:1, desc:'猎物的獠牙，给你下手的狠劲。', stack:1, price:50 },
  pearlNeck:{ id:'pearlNeck', name:'珍珠项链', cat:'accessory', glyph:'珠', hp:10, desc:'莹润的珍珠，据说能养身。', stack:1, price:120 },
  hornAmulet:{ id:'hornAmulet', name:'牛角护符', cat:'accessory', glyph:'角', def:2, desc:'磨亮的牛角挂在胸前，硬得能替你挨一下。', stack:1, price:80 },
  woodShield:{ id:'woodShield', name:'木盾', cat:'shield', glyph:'盾', def:2, block:0.15, desc:'木板拼的盾，能挡一下。', stack:1, price:20 },
  ironShield:{ id:'ironShield', name:'铁盾', cat:'shield', glyph:'盾', def:4, block:0.25, desc:'铸铁盾，可靠。', stack:1, price:60 },
  steelShield:{ id:'steelShield', name:'钢盾', cat:'shield', glyph:'盾', def:6, block:0.30, desc:'钢制塔盾，几乎无懈可击。', stack:1, price:140 },
  // ---- 药品 ----
  herbPaste:{ id:'herbPaste', name:'草药膏', cat:'med', glyph:'膏', heal:20, desc:'外敷的草药膏，止血生肌。', stack:20, price:15 },
  bandage:{ id:'bandage', name:'止血绷带', cat:'med', glyph:'绷', heal:10, stopBleed:1, desc:'包扎止血的绷带，顺带回一点血。', stack:20, price:12 },
  antidote:{ id:'antidote', name:'解毒剂', cat:'med', glyph:'解', curePoison:1, desc:'解蛇蝎之毒。', stack:20, price:25 },
  tea:    { name:'提神茶', cat:'med', glyph:'茶', spirit:14, desc:'草药蜂蜜煮的茶，安神。', stack:20, price:18 },
  lotusPill:{ id:'lotusPill', name:'不死丹', cat:'med', glyph:'丹', heal:60, revive:1, reviveHp:30, desc:'吃下回复 60 生命；若你倒下，它替你留住 30 点生命。每局最多炼制 3 颗。', stack:3 },
  salve:{ id:'salve', name:'简易药膏', cat:'med', glyph:'膏', heal:10, desc:'草药捣成的膏，能止血养伤。', stack:20, price:8 },
  blueBull:{ id:'blueBull', name:'蓝牛', cat:'med', glyph:'牛', sta:70, water:30, spirit:-10, desc:'腥甜的蓝色体力药水：体力+70、水分+30，代价是精神-10——药劲是透支来的。', stack:10 },
  zhangLaoJi:{ id:'zhangLaoJi', name:'张老吉', cat:'med', glyph:'吉', sta:30, spirit:-10, desc:'草药熬出的苦茶，凉了更好喝：体力+30，但精神-10。一口就能再干小半天活。', stack:20 },
  smokeBomb:{ id:'smokeBomb', name:'简易烟雾弹', cat:'special', glyph:'烟', stack:5, price:20, desc:'掷出浓烟，本场战斗中逃跑必定成功（只能战斗中使用）。' },
  // ---- 种子 ----
  seedCarrot:{ id:'seedCarrot', name:'萝卜种子', cat:'seed', glyph:'种', desc:'萝卜种子，种在苗床。', stack:20, price:15 },
  seedWheat:{ id:'seedWheat', name:'小麦种子', cat:'seed', glyph:'种', desc:'小麦种子，种在田垄。', stack:20, price:20 },
  seedHerb:{ id:'seedHerb', name:'药草种子', cat:'seed', glyph:'种', desc:'药草种子，种在水田。', stack:20, price:30 },
  carrot:{ id:'carrot', name:'萝卜', cat:'food', glyph:'卜', food:10, water:3, spoil:120, desc:'收获的萝卜。', stack:20, price:5 },
  wheat:{ id:'wheat', name:'小麦', cat:'food', glyph:'麦', food:8, spoil:240, desc:'收获的小麦。', stack:30, price:4 },
  // ---- 图纸 / 剧情 ----
  bpGunpowder:{ id:'bpGunpowder', name:'火药配方', cat:'bp', glyph:'图', desc:'记载火药配方的旧纸。', stack:1 },
  bpFurnace:  { name:'高炉图纸', cat:'bp', glyph:'图', desc:'高炉的建造图纸。', stack:1 },
  bpShip:     { name:'远洋船图纸', cat:'bp', glyph:'图', desc:'远洋大船的建造图纸。', stack:1 },
  bpBlack:    { name:'玄铁武器图纸', cat:'bp', glyph:'图', desc:'玄铁装备的锻造图纸。', stack:1 },
  bpLotus:    { name:'不死丹方', cat:'bp', glyph:'图', desc:'不死丹的古方。', stack:1 },
  slate:  { name:'石板', cat:'special', glyph:'碑', desc:'刻着古文字的石板。（集齐三块可解谜；没人肯收，别无他用）', stack:3, price:0, alwaysFit:1 },
  relic:  { name:'遗物', cat:'special', glyph:'遗', desc:'山顶祭坛里的古老遗物。结局「秘辛」要把它放回祭坛（还需石板×3、龙骨×1）——不是那种加属性的「神物」，别混了。', stack:1, price:500, alwaysFit:1 },
  rot: { name:'腐烂物', cat:'mat', glyph:'烂', desc:'过期食物变质而来。埋进田里能肥地：施肥一次，该地块收获 +50%。', stack:20, price:1 },
  namecard:{ name:'命名牌', cat:'special', glyph:'铭', desc:'刻着名字的木牌，可让武器永久+1伤害。（暂不投放，作充值/活动奖励）', stack:1, price:0 },
  dragonbone:{ id:'dragonbone', name:'龙骨', cat:'special', glyph:'骨', desc:'巨大的龙骨，既是船材也是祭品。', stack:1, price:600, alwaysFit:1 },
  seachart:{ id:'seachart', name:'海图', cat:'special', glyph:'图', desc:'通向故乡的航海图。', stack:1 },
  supplybox:{ id:'supplybox', name:'补给箱', cat:'special', glyph:'箱', desc:'远航用的补给箱。', stack:3 },
  driftbottle:{ id:'driftbottle', name:'漂流瓶', cat:'special', glyph:'瓶', desc:'装着老潮的信的漂流瓶。', stack:1 },
  // ---- 亚特兰蒂斯（第二章）物资 ----
  diveSuit:{ id:'diveSuit', name:'潜水服', cat:'cloth', glyph:'潜', warm:2, dive:1, stack:1, price:0, desc:'孤岛工作台可做的基础潜水服（占衣物），决定耐受水压与可达深度；保暖 2，耐久 50。' },
  diveSuit2:{ id:'diveSuit2', name:'高级潜水服', cat:'cloth', glyph:'潜', warm:2, dive:2, stack:1, price:0, desc:'珠光工作台打造的高级潜水服，耐压更高、保暖 2，耐久 200。' },
  diveMask:{ id:'diveMask', name:'氧气罩', cat:'tool', glyph:'氧', tool:{kind:'o2',tier:1}, stack:1, price:0, diveO2:1, desc:'提供水下氧气（可装备到工具栏），可长期停留；耐久 100。' },
  goggles:{ id:'goggles', name:'潜水护目镜', cat:'tool', glyph:'镜', stack:1, price:0, light:1, desc:'照明道具（拥有即生效）：可探索沉没之城与珊瑚带。' },
  lightWeak:{ id:'lightWeak', name:'弱光防水手电', cat:'tool', glyph:'灯', stack:1, price:0, light:2, desc:'照明道具：照亮海沟，可探索中层黑暗区域。' },
  lightStrong:{ id:'lightStrong', name:'防水强光潜水手电', cat:'tool', glyph:'灯', stack:1, price:0, light:3, desc:'照明道具：照亮深水圣殿，可探索深海区域。' },
  sourceOre:{ id:'sourceOre', name:'源矿', cat:'mat', glyph:'源', stack:20, price:20, desc:'亚特兰蒂斯地层的能量矿石。' },
  sourceBar:{ id:'sourceBar', name:'源质锭', cat:'mat', glyph:'质', stack:20, price:60, desc:'源矿经源质熔炉精炼而成。' },
  deepCoral:{ id:'deepCoral', name:'深珊瑚', cat:'mat', glyph:'珊', stack:20, price:15, desc:'深海发光的珊瑚，可建可炼。' },
  anctDevice:{ id:'anctDevice', name:'发光远古装置', cat:'special', glyph:'机', stack:5, price:0, desc:'远古文明的能量装置，可精炼为源质。' },
  pearlGranule:{ id:'pearlGranule', name:'珍珠粒', cat:'mat', glyph:'珠', stack:20, price:10, desc:'深海底的细碎珍珠。' },
  coralArmor:{ id:'coralArmor', name:'珊瑚甲', cat:'armor', glyph:'甲', def:6, dodge:0.15, stack:1, price:0, desc:'略低于玄铁，却提高 15% 闪避率。' },
  sourceArmor:{ id:'sourceArmor', name:'源质重甲', cat:'armor', glyph:'甲', def:10, stack:1, price:0, desc:'源质锻造的重甲，深海的守护。' },
  coralBlade:{ id:'coralBlade', name:'珊瑚刺刃', cat:'weapon', glyph:'刃', atk:11, spd:11, acc:0.1, stack:1, price:0, desc:'珊瑚磨成的利刃，提高命中率。' },
  sourceSpear:{ id:'sourceSpear', name:'源质长枪', cat:'weapon', glyph:'枪', atk:20, spd:9, stack:1, price:0, desc:'源质铸成的长枪。' },
  bpDive:{ id:'bpDive', name:'深海装备图纸', cat:'bp', glyph:'图', stack:1, desc:'潜水服与氧气罩的制造图纸。' },
  atlantisCore:{ id:'atlantisCore', name:'源晶', cat:'special', glyph:'晶', stack:5, price:0, desc:'亚克兰蒂斯核心的结晶，远古装置的心脏——稀有，且总在危险之处。' },
  thruster:{ id:'thruster', name:'推进器', cat:'accessory', glyph:'推', stack:1, price:0, desc:'亚克兰蒂斯的水下推进器（饰品）：在第二张图内移动时，时间与体力消耗减半。' },
  energyCrystal:{ id:'energyCrystal', name:'源能晶石', cat:'special', glyph:'能', stack:10, price:0, desc:'亚克兰蒂斯深层的能量晶石，比源矿更精纯，是源能武器与高阶装备的核心材料。' },
  pistol:{ id:'pistol', name:'源能手枪', cat:'weapon', glyph:'枪', atk:50, spd:5, ranged:1, ammoItem:'bullet', stack:1, price:0, desc:'远古源能手枪：伤害极高但射速慢，每次射击消耗 1 颗源能子弹。' },
  bullet:{ id:'bullet', name:'源能子弹', cat:'weapon', glyph:'弹', ammo:1, stack:30, price:0, desc:'源能手枪的弹药。' },
  brokenPistol:{ id:'brokenPistol', name:'破损的源能手枪', cat:'special', glyph:'枪', stack:1, price:0, desc:'从海盗头目处夺来的破损手枪，可在礁石栖息地的修补台修复。' },
  rareFishA:{ id:'rareFishA', name:'深海鲷', cat:'food', glyph:'鱼', food:12, buffStat:'atk', buffVal:3, buffH:24, stack:5, desc:'稀有深海鱼，只能直接吃：24 小时内攻击 +3。' },
  rareFishB:{ id:'rareFishB', name:'幽光鳗', cat:'food', glyph:'鱼', food:12, buffStat:'spd', buffVal:2, buffH:24, stack:5, desc:'稀有深海鱼，只能直接吃：24 小时内攻速 +2。' },
  rareFishC:{ id:'rareFishC', name:'冰纹鳕', cat:'food', glyph:'鱼', food:12, buffStat:'def', buffVal:2, buffH:24, stack:5, desc:'稀有深海鱼，只能直接吃：24 小时内防御 +2。' },
  rareFishD:{ id:'rareFishD', name:'血红鲈', cat:'food', glyph:'鱼', food:12, buffStat:'spirit', buffVal:10, buffH:24, negChance:0.25, negHp:10, stack:5, desc:'稀有深海鱼，24 小时精神 +10；但有 25% 概率反胃（-10 生命）。' },
  rareFishE:{ id:'rareFishE', name:'幻彩鱼', cat:'food', glyph:'鱼', food:12, buffStat:'hp', buffVal:20, buffH:24, negChance:0.25, negPoison:1, stack:5, desc:'稀有深海鱼，24 小时生命上限 +20；但有 25% 概率中毒。' },
  bpPistol:{ id:'bpPistol', name:'手枪图纸', cat:'bp', glyph:'图', stack:1, desc:'一张画着远古手枪结构的图纸。' },
  bpBullet:{ id:'bpBullet', name:'子弹图纸', cat:'bp', glyph:'图', stack:1, desc:'一张画着弹丸与火药装填的图纸。' },
  bpCoralBlade:{ id:'bpCoralBlade', name:'珊瑚刺刃图纸', cat:'bp', glyph:'图', stack:1, desc:'珊瑚刺刃的铸造图纸。' },
  bpCoralArmor:{ id:'bpCoralArmor', name:'珊瑚甲图纸', cat:'bp', glyph:'图', stack:1, desc:'以深海珊瑚编织护甲的图纸。' },
  bpThruster:{ id:'bpThruster', name:'推进器图纸', cat:'bp', glyph:'图', stack:1, desc:'水下推进器的构造图纸。' },
  bpSourceSpear:{ id:'bpSourceSpear', name:'源质长枪图纸', cat:'bp', glyph:'图', stack:1, desc:'源质长枪的锻造图纸。' },
  bpSourceArmor:{ id:'bpSourceArmor', name:'源质重甲图纸', cat:'bp', glyph:'图', stack:1, desc:'源质重甲的锻造图纸。' },
  deepCore:{ id:'deepCore', name:'深殿核心', cat:'special', glyph:'核', stack:4, price:0, desc:'深水圣殿之门的四块核心之一；集齐四块才能推开守护者祭坛。' },
};

// ---------- 天赋 ----------
const IDENTITIES = {
  fisher:  { name:'渔夫', desc:'钓鱼收获 +50%，初始带鱼竿。', fishBonus:0.5, items:{ rod:1 } },
  woodcutter:{ id:'woodcutter', name:'樵夫', desc:'伐木收获 +50%，初始带石斧。', woodBonus:0.5, items:{ axeStone:1 } },
  herbalist:{ id:'herbalist', name:'药师', desc:'草药采集翻倍，初始带药膏。', herbBonus:1, items:{ herb:3, herbPaste:1 } },
  beekeeper:{ id:'beekeeper', name:'养蜂人', desc:'树林取蜜必定成功、还有额外收获（30% 多 1 份、10% 再多 2 份），且不会被蛰；能造专属家具「蜂箱」，每天清晨收 1 份蜂蜜。', honeyBonus:1, items:{ honey:2, thatch:4 } },
  smith:   { name:'铁匠学徒', desc:'制造耗时 -20%，初始带燧石。', craftTime:0.8, items:{ flint:3 } },
  linghui: { id:'linghui', name:'灵灰', desc:'从北方海域漂来的鲸鱼娘，没什么本事却很可爱，偶尔会跟你说说话。', items:{} },
};

const DIFFICULTIES = {
  easy:   { name:'求生者', resMul:1.5, enemyMul:0.6, drainMul:0.7, raidWolf:2, defEff:1.0, death:'day', stamina:0, start:{ food:12, spear:1 }, recommend:1,
            desc:'资源丰富、怪物更弱、饥渴更慢；防御 100% 生效，夜袭强度也最低。新手推荐从这里开始。开局获得 12 份随机食物和一支长矛。' },
  normal: { name:'冒险家', resMul:1.15, enemyMul:0.85, drainMul:0.85, raidWolf:2, defEff:0.9, death:'day', stamina:0, start:{ food:6 },
            desc:'标准体验：资源略多、怪物略弱，防御 90% 生效。开局获得 6 份随机食物。' },
  hard:   { name:'幸存者', resMul:1.0, enemyMul:1.3, defEff:0.8, death:'day', stamina:0, start:{}, desc:'资源不再打折，怪物更强（×1.3），防御只有 80% 生效；开局一无所有。' },
  legend: { name:'传奇', resMul:1.0, enemyMul:1.6, defEff:0.7, death:'perm', stamina:0, start:{}, desc:'怪物极强（×1.6），防御只有 70% 生效，死亡不可回退。' },
  dev:    { name:'开发者', resMul:1, enemyMul:1, defEff:1, death:'day', stamina:500, start:{}, desc:'调试用：初始全部资源×100，背包 200 格。（隐藏）' },
};

// ---------- 场景 ----------
// unlockWatch: 需要瞭望台等级；needBoat/needWarm: 额外条件；distMin: 赶路分钟
const SCENES = [
  { id:'camp', name:'营地', img:'assets/img/camp.png', distMin:0, danger:1, unlockWatch:0,
    desc:{
      intro:'你的营地。篝火的余温还在，晾绳上的鱼干轻轻摇晃。这里是全岛唯一能安心喘口气的地方。',
      night:'篝火噼啪作响，把黑夜挡在营地之外。远处传来不知名的叫声。',
      rain:'雨点打在帐篷上，营地一片泥泞，火光忽明忽暗。',
    },
    points:[], events:[], travelFrom:'你沿着熟悉的小路回到营地。', travelTo:'' },
  { id:'farm', name:'耕地', img:'assets/img/farm.png', distMin:5, danger:1, unlockWatch:0,
    desc:{
      intro:'帐篷前的苗床，土刚翻过，等着种子。',
      night:'苗床在月光下静悄悄的，像睡着了一样。',
      rain:'雨水顺着田垄流进小渠，苗床喝饱了水。',
    },
    points:[
      { id:'farm_veg', name:'野菜丛', type:'gather', time:20, energy:10, need:{}, yields:[{ id:'wildveg', min:1, max:2 }], daily:3, text:'你弯腰摘下一把野菜，根上还带着泥。' },
      { id:'farm_plant', name:'苗床', type:'farm', time:15, energy:10, text:'' },
    ], events:[], travelFrom:'你穿过营地前的空地，来到耕地。', travelTo:'' },
  { id:'river', name:'河畔', img:'assets/img/river.png', distMin:10, danger:2, unlockWatch:0,
    desc:{
      intro:'河水从山里流来，向海而去。浅滩上散着鹅卵石，芦苇丛沙沙作响。',
      night:'夜色下的河面泛着冷光，水声比白天更响。',
      rain:'河水涨了，浑黄的水裹着上游的枯枝向下游冲去。',
    },
    points:[
      { id:'river_water', name:'取水点', type:'gather', time:20, energy:8, need:{}, yields:[{ id:'water', min:2, max:3 }], daily:3, text:'你俯身捧起河水，冰凉清冽。' },
      { id:'river_fish', name:'垂钓点', type:'fish', time:40, energy:15, need:{ item:'rod' }, yields:[{ id:'fish', min:1, max:2 }], daily:3, text:'浮漂轻点，鱼线绷直——上钩了！' },
  { id:'river_net', name:'撒网点', type:'gather', time:55, energy:18, need:{ item:'net' }, yields:[{ id:'fish', min:3, max:5 }], daily:2, text:'你一扬手，渔网在水面铺开，兜起了不少鱼。' },
      { id:'river_clay', name:'黏土滩', type:'gather', time:25, energy:12, need:{}, yields:[{ id:'clay', min:2, max:3 }], daily:2, text:'你挖起一团细腻的河泥。' },
      { id:'river_reeds', name:'芦苇丛', type:'gather', time:20, energy:8, need:{}, yields:[{ id:'thatch', min:2, max:3 }], daily:3, text:'你割下一捆芦苇。' },
      { id:'river_drift', name:'漂流物', type:'drift', time:20, energy:5, need:{}, once:true, text:'你在河边仔细翻找上游漂来的东西。' },
      { id:'river_stones', name:'寻找可用石头', type:'gather', time:60, energy:0, need:{}, yields:[{ id:'flint', min:1, max:1 }, { id:'stone', min:1, max:2, chance:0.5 }], daily:2, firstDays:10, text:'你在河畔的浅滩上慢慢翻找能用的石头。' },
    ], events:[], travelFrom:'你顺着下坡小路来到河边。', travelTo:'' },
  { id:'forest', name:'树林', img:'assets/img/forest.png', distMin:15, danger:2, unlockWatch:0,
    desc:{
      intro:'林子里很静，松脂的气味混着露水。鸟在头顶的枝桠间跳来跳去。',
      night:'林子黑得伸手不见五指，只有风声在树梢游荡。',
      rain:'雨水从叶尖滴落，整片树林都在滴水。',
    },
    points:[
      { id:'forest_tree', name:'老松树', type:'gather', time:25, energy:15, need:{ tool:'axe' }, yields:[{ id:'wood', min:2, max:4 }, { id:'branch', min:1, max:2, chance:0.5 }], daily:4, text:'你抡起斧子，木屑飞溅，树干轰然倒下。' },
      { id:'forest_berry', name:'灌木丛', type:'gather', time:20, energy:8, need:{}, yields:[{ id:'berry', min:1, max:2 }], daily:2, text:'你摘下一捧紫黑的浆果。' },
      { id:'forest_vine', name:'藤蔓坡', type:'gather', time:20, energy:8, need:{}, yields:[{ id:'vine', min:1, max:3 }], daily:2, text:'你割下一段柔韧的藤蔓。' },
      { id:'forest_mushroom', name:'蘑菇圈', type:'gather', time:20, energy:8, need:{}, yields:[{ id:'mushroom', min:1, max:2 }], daily:2, cond:{ rain:true }, text:'雨后新出的蘑菇，沾着水珠。' },
      { id:'forest_herb', name:'草药丛', type:'gather', time:20, energy:8, need:{}, yields:[{ id:'herb', min:1, max:2 }, { id:'wood', min:1, max:1, chance:0.3 }], daily:2, text:'你认出几株草药的叶子。' },
      { id:'forest_resin', name:'老松树(割脂)', type:'gather', time:20, energy:8, need:{ tool:'knife' }, yields:[{ id:'resin', min:1, max:2 }], daily:1, text:'你用石刀在松树上割开一道口子。' },
      { id:'forest_hive', name:'蜂巢', type:'adventure', time:30, energy:15, need:{}, daily:1, text:'树杈上挂着一个蜂巢，蜂蜜诱人，蜂群凶悍。' },
      { id:'forest_hunt', name:'兽径', type:'hunt', time:30, energy:20, need:{}, daily:2, enemies:['boar'], text:'你顺着野兽的脚印摸过去。' },
    ], events:[], travelFrom:'你走进树林，光线暗了下来。', travelTo:'' },
  { id:'bamboo', name:'竹林', img:'assets/img/bamboo.png', distMin:15, danger:2, unlockWatch:0,
    desc:{
      intro:'竹林密不透风，竹影在地上织成网。风一过，满林沙沙。',
      night:'夜里的竹林一片漆黑，竹影晃动，像有活物穿行。',
      rain:'雨打竹叶，声音清脆，像谁在轻轻击节。',
    },
    points:[
      { id:'bamboo_cut', name:'竹丛', type:'gather', time:25, energy:15, need:{ tool:'axe' }, yields:[{ id:'bamboo', min:2, max:4 }], daily:3, text:'你砍倒几根粗竹，竹节脆响。' },
      { id:'bamboo_fiber', name:'剖竹', type:'gather', time:25, energy:10, need:{ tool:'knife' }, yields:[{ id:'fiber', min:2, max:3 }], daily:2, text:'你用石刀把竹片剖成细条。' },
      { id:'bamboo_shoot', name:'竹笋', type:'gather', time:20, energy:8, need:{}, yields:[{ id:'bambooShoot', min:1, max:2 }], daily:2, cond:{ season:['春','夏'] }, text:'你刨出一根带着晨露的竹笋。' },
      { id:'bamboo_deep', name:'竹林深处', type:'hunt', time:30, energy:20, need:{}, daily:1, enemies:['snake'], text:'你拨开竹枝，向深处走去。' },
    ], events:[], travelFrom:'你沿着坡地走入竹海。', travelTo:'' },
  { id:'quarry', name:'采石场', img:'assets/img/quarry.png', distMin:20, danger:3, unlockWatch:0,
    desc:{
      intro:'山脚的石料堆得像小山，崖壁上矿脉的纹理清晰可见。',
      night:'夜里的采石场阴森森的，碎石在脚下哗哗作响。',
      rain:'崖壁被雨水冲得发亮，远处有碎石滚落的闷响。',
    },
    points:[
      { id:'quarry_stone', name:'石堆', type:'gather', time:25, energy:15, need:{ tool:'pick' }, yields:[{ id:'stone', min:2, max:4 }], daily:3, text:'你从石堆里挑出合适的石块。' },
      { id:'quarry_flint', name:'燧石层', type:'gather', time:25, energy:12, need:{ tool:'pick' }, yields:[{ id:'flint', min:1, max:2 }], daily:2, text:'你敲下一块锋利的燧石。' },
      { id:'quarry_clay', name:'黏土堆', type:'gather', time:25, energy:12, need:{}, yields:[{ id:'clay', min:2, max:3 }], daily:2, text:'你挖走一捧黏土。' },
      { id:'quarry_ironShallow', name:'铁矿石露头', type:'gather', time:40, energy:20, need:{ tool:'pick', tier:1 }, yields:[{ id:'ironore', min:1, max:2 }], daily:2, text:'你用石镐一点点凿下含铁的矿石。' },
      { id:'quarry_deep', name:'深层矿脉', type:'gather', time:40, energy:20, need:{ tool:'pick', tier:2 }, yields:[{ id:'ironore', min:2, max:4 }], daily:3, text:'铁镐凿进矿层，铁矿石应声而落。' },
      { id:'quarry_pit', name:'废弃矿坑', type:'adventure', time:40, energy:25, need:{ tool:'pick', tier:2 }, daily:1, text:'矿坑深处黑黢黢的，有蛛网在晃动。' },
    ], events:[], travelFrom:'你绕过山脚，来到采石场。', travelTo:'' },
  { id:'grassland', name:'草地', img:'assets/img/grassland.png', distMin:40, danger:3, unlockWatch:1,
    desc:{
      intro:'草浪一直铺到天边，野牛群在远处缓缓移动，风声很大。',
      night:'夜里的草原没有遮蔽，狼嚎从四面八方传来。',
      rain:'雨水把草叶压弯，草原变成一片湿漉漉的墨色。',
    },
    points:[
      { id:'grass_wool', name:'羊群(剪毛)', type:'gather', time:30, energy:12, need:{ tool:'knife' }, yields:[{ id:'wool', min:1, max:2 }], daily:2, text:'你悄悄靠近羊群，割下一团羊毛。' },
      { id:'grass_hay', name:'干草丛', type:'gather', time:20, energy:8, need:{ tool:'knife' }, yields:[{ id:'hay', min:1, max:2 }], daily:2, text:'你割下几捆晒得干透的野草——正好当羊的饲料。' },
      { id:'grass_herb', name:'草药丛', type:'gather', time:20, energy:8, need:{}, yields:[{ id:'herb', min:1, max:2 }], daily:2, text:'草原上的草药长得更壮。' },
      { id:'grass_hunt', name:'狩猎', type:'hunt', time:35, energy:25, need:{}, daily:3, enemies:['wolf','ox'], text:'你压低身子，循着兽迹前进。' },
      { id:'grass_trap', name:'布设陷阱', type:'trap', time:25, energy:10, need:{ item:'trap' }, daily:2, text:'你在兽径上布下陷阱。' },
      { id:'grass_horse', name:'孤树下野马', type:'adventure', time:40, energy:20, need:{}, text:'一匹野马在孤树下吃草，它似乎不怕你。' },
      { id:'grass_wolfden', name:'狼穴', type:'hunt', time:40, energy:25, need:{}, enemies:['wolfKing'], text:'山丘下传来低沉的呜咽，狼王的目光比月亮还冷。' },
    ], events:[], travelFrom:'你翻过丘陵，草原在眼前展开。', travelTo:'' },
  { id:'desert', name:'荒漠', img:'assets/img/desert.png', distMin:45, danger:4, unlockWatch:1,
    desc:{
      intro:'沙丘连绵，一棵枯树立在天地之间，白骨半埋沙中。',
      night:'月光下的白骨泛着惨白，沙地里像有东西在爬。',
      rain:'荒漠难得下雨，沙地吸水的样子像在呼吸。',
    },
    points:[
      { id:'desert_niter', name:'硝石矿点', type:'gather', time:30, energy:15, need:{ tool:'pick' }, yields:[{ id:'niter', min:1, max:2 }], daily:2, text:'你刮下一层灰白的硝石。' },
      { id:'desert_sulfur', name:'硫磺矿点', type:'gather', time:30, energy:15, need:{ tool:'pick' }, yields:[{ id:'sulfur', min:1, max:2 }], daily:2, text:'黄色的硫磺在沙层下结块。' },
      { id:'desert_cactus', name:'仙人掌丛', type:'gather', time:20, energy:8, need:{}, yields:[{ id:'cactusfruit', min:1, max:2 }], daily:2, text:'你避开尖刺，摘下鲜红的果子。' },
      { id:'desert_fossil', name:'化石层', type:'gather', time:40, energy:20, need:{ tool:'pick', tier:2 }, yields:[{ id:'fossil', min:1, max:1, chance:0.6 }], daily:1, text:'你小心地刨开沙层，寻找远古的骨头。' },
      { id:'desert_remains', name:'前人遗骸', type:'adventure', time:30, energy:15, need:{}, once:true, text:'沙丘旁半埋着一具骸骨，旁边有个破旧的包裹。' },
      { id:'desert_guard', name:'白骨守卫出没处', type:'hunt', time:30, energy:20, need:{}, daily:1, nightOnly:true, enemies:['boneguard','scorpion'], text:'沙地里插着一把锈刀，风从白骨间穿过。' },
    ], events:[], travelFrom:'你走进荒漠，风沙扑面。', travelTo:'' },
  { id:'cave', name:'山洞', img:'assets/img/cave.png', distMin:35, danger:4, unlockWatch:1,
    desc:{
      intro:'拱形的洞口像一张嘴，向外吐着凉气。洞里有微光闪烁。',
      night:'黑夜让洞口更加深不可测，蝙蝠振翅声此起彼伏。',
      rain:'雨水在洞口挂成一道帘，洞里倒显得干爽。',
    },
    points:[
      { id:'cave_iron', name:'洞壁铁矿', type:'gather', time:40, energy:20, need:{ tool:'pick', tier:1 }, yields:[{ id:'ironore', min:2, max:4 }], daily:3, text:'洞壁上的铁矿闪着暗红的光。' },
      { id:'cave_bats', name:'蝙蝠粪堆', type:'gather', time:25, energy:10, need:{}, yields:[{ id:'niter', min:1, max:2 }], daily:2, text:'你捂着鼻子铲起一堆蝙蝠粪。' },
      { id:'cave_moss', name:'发光苔藓', type:'gather', time:25, energy:10, need:{}, yields:[{ id:'herb', min:1, max:2 }, { id:'crystal', min:1, max:1, chance:0.25 }], daily:2, text:'苔藓在暗处发出幽蓝的微光。' },
      { id:'cave_deep', name:'深处矿脉', type:'gather', time:45, energy:26, need:{ item:'torch', tool:'pick', tier:3 }, yields:[{ id:'goldore', min:1, max:2 }, { id:'ironore', min:2, max:3, chance:0.6 }], daily:1, text:'火把照亮深处的矿脉，金矿石在石缝里闪光。' },
      { id:'cave_slate', name:'洞中遗迹', type:'adventure', time:40, energy:20, need:{ item:'torch', tool:'pick', tier:2 }, once:true, text:'洞深处有一面刻满古文字的岩壁。' },
      { id:'cave_queen', name:'蛛巢', type:'hunt', time:40, energy:30, need:{ item:'torch' }, daily:1, enemies:['spider','spiderQueen'], text:'深处的通道挂满蛛网，有什么东西在网中央。' },
      { id:'cave_guard', name:'黑暗中的兽吼', type:'hunt', time:35, energy:25, need:{ item:'torch' }, daily:1, enemies:['bats','cavebear'], text:'火把惊动了黑暗中的居民。' },
    ], events:[], travelFrom:'你沿着山道攀到洞口，凉气扑面而来。', travelTo:'' },
  { id:'peak', name:'山顶', img:'assets/img/peak.png', distMin:60, danger:5, unlockWatch:2, needWarm:4,
    desc:{
      intro:'云海在脚下翻涌，风像刀子一样割脸。一座石阵祭坛矗立在雪线上。',
      night:'星子近得像能摘下来，但风比白天更狠。',
      rain:'山雨夹着雪粒打下来，天地一片灰白。',
    },
    points:[
      { id:'peak_blackiron', name:'玄铁矿脉', type:'gather', time:40, energy:22, need:{ tool:'pick', tier:3 }, guard:'eagle', yields:[{ id:'blackiron', min:1, max:2 }], daily:2, text:'钢镐凿进玄铁矿脉，火星四溅。' },
      { id:'peak_mithril', name:'秘银矿脉', type:'gather', time:40, energy:22, need:{ tool:'pick', tier:4 }, guardChoice:{ enemy:'slateGuard2', chance:0.5 }, yields:[{ id:'mithril', min:1, max:2 }], daily:2, text:'玄铁镐撬开雪线，露出银亮的秘银。' },
      { id:'peak_lotus', name:'雪莲花', type:'gather', time:30, energy:15, need:{}, guardChoice:{ enemy:'slateGuard2', chance:0.5 }, yields:[{ id:'snowlotus', min:1, max:1 }], daily:1, text:'你小心翼翼摘下那朵开在雪里的莲。' },
      { id:'peak_eagle', name:'鹰巢', type:'adventure', time:30, energy:15, need:{}, daily:1, text:'崖壁上的鹰巢里，几根长羽露出巢沿。' },
      { id:'peak_altar', name:'远古祭坛', type:'adventure', time:40, energy:10, need:{}, once:true, text:'祭坛的石柱刻满与洞中相同的古文字，中央有一个凹槽。' },
      { id:'peak_hunt', name:'雪线兽迹', type:'hunt', time:35, energy:25, need:{}, daily:1, enemies:['leopard'], text:'雪地上的爪印还很新鲜。' },
      { id:'peak_slate', name:'石碑残迹', type:'hunt', time:40, energy:20, need:{}, enemies:['slateGuard'], text:'山顶立着一块残碑，碑前跪着一尊石像守卫，似在沉睡。' },
    ], events:[], travelFrom:'你贴着山脊向上攀登，空气越来越冷。', travelTo:'' },
  { id:'sea', name:'海域', img:'assets/img/sea.png', distMin:90, danger:4, unlockWatch:2, needBoat:'raft',
    zones:{
      sea:  { name:'近海', hotspots:[
        { x:58, y:50, point:'sea_fish', label:'撒网' },
        { x:30, y:80, point:'sea_shell', label:'拾贝' },
        { x:80, y:55, point:'sea_salt', label:'晒盐' },
        { x:88, y:38, point:'sea_deep', label:'深水' },
    { x:29, y:42, point:'sea_rescue', label:'求救信' },   // 右移：别被左侧日志栏压住
        { x:64, y:26, point:'sea_pirate', label:'海盗' },
        { x:72, y:78, point:'sea_oyster', label:'退潮礁石' },
      ], points:[
        { id:'sea_fish', name:'撒网捕鱼', type:'gather', time:70, energy:20, need:{ item:'net' }, rareFishChance:0.3, yields:[{ id:'fish', min:4, max:6 }], daily:2, text:'你撒下渔网，拉上来一网银亮的鱼。' },
        { id:'sea_shell', name:'拾贝壳', type:'gather', time:30, energy:10, need:{}, yields:[{ id:'beibi', min:3, max:8 }], daily:2, text:'你弯腰捡起几枚好看的贝壳。' },
        { id:'sea_oyster', name:'撬牡蛎', type:'gather', time:35, energy:15, need:{ tool:'knife', tier:1 }, daily:2, yields:[{ id:'pearl', min:1, max:1, chance:0.4 },{ id:'beibi', min:1, max:3 }], text:'退潮后礁石露出来，牡蛎密密麻麻嵌在上面——你拿刀把它撬开。' },
      { id:'sea_salt', name:'晒盐', type:'gather', time:40, energy:12, need:{}, yields:[{ id:'salt', min:1, max:2 },{ id:'seasalt', min:1, max:1, chance:0.35 }], daily:2, cond:{ season:['夏','秋'] }, text:'海水在盐田里晒成雪白的盐，边角上还结着更纯的海盐。' },
        { id:'sea_deep', name:'深水区(捕大鱼)', type:'gather', time:55, energy:25, need:{ item:'net' }, yields:[{ id:'fish', min:2, max:4 }, { id:'sharkfin', min:1, max:1, chance:0.25 }], daily:1, cond:{ boat:'boat' }, risk:'shark', text:'你划到深水区，海面下暗流涌动。' },
        { id:'sea_rescue', name:'求救信号', type:'adventure', time:30, energy:10, need:{}, once:true, cond:{ day:12 }, text:'礁石上绑着一面破布条，像有人来过这里。' },
        { id:'sea_pirate', name:'海盗出没', type:'hunt', time:40, energy:20, need:{}, daily:1, cond:{ day:20, dayMod:5 }, enemies:['pirateBoss'], text:'海面上飘来一艘挂着骷髅旗的战船，船长站在船头磨刀——是海盗头目！' },
      ]},
      cove: { name:'沉船湾', hotspots:[
        { x:38, y:62, point:'cove_wood', label:'拆船木' },
    { x:22, y:56, point:'cove_chest', label:'宝箱' },   // 右移：别被左侧日志栏压住
        { x:28, y:38, point:'cove_black', label:'独眼(夜)' },
        { x:52, y:82, point:'cove_atlantis', label:'远方的海沟' },
      ], points:[
        { id:'cove_wood', name:'拆船木', type:'gather', time:40, energy:20, need:{}, yields:[{ id:'shipwood', min:1, max:2 }, { id:'plank', min:1, max:2, chance:0.5 }], daily:2, text:'你从残破的船体上拆下好木头。' },
        { id:'cove_chest', name:'船长宝箱', type:'adventure', time:30, energy:15, need:{}, daily:1, text:'半埋在沙里的铁箱，锁已经锈死了。' },
    { id:'cove_black', name:'夜访独眼', type:'trade', time:30, energy:5, need:{}, nightOnly:true, text:'沉船湾的夜里，有人提着灯等你。' },
        { id:'cove_atlantis', name:'远方的海沟', type:'atlantisGate', time:90, energy:20, need:{}, text:'沉船湾的尽头，海床裂开一道幽深的沟壑，深处透出一点微光。' },
      ]},
    },
    desc:{
      intro:'海风咸湿，浪一下下拍着船身。这里是岛的另一半世界。',
      night:'夜色里的大海黑得没有边界，只有浪声如呼吸。',
      rain:'雨点砸在海面上，天海之间灰茫茫一片。',
    },
    events:[], travelFrom:'你划着木筏离开海岸，陆地渐渐变小。', travelTo:'' },
  { id:'shore', name:'对岸', img:'assets/img/shore.png', distMin:120, danger:5, unlockWatch:2, needBoat:'boat',
    zones:{
      saltTown:{ name:'盐镇', hotspots:[
        { x:46, y:60, point:'town_market', label:'集市' },
        { x:52, y:44, point:'town_mission', label:'告示板' },
        { x:40, y:50, point:'town_info', label:'酒馆' },
      ], points:[
    // 面板类点位（集市/告示板/酒馆/黑市）不再限制"每天几次"——看一眼或交易一次不该被次数卡住。
    // 真正的限制交给各自面板内部（委托只能接一次、商品由库存/金币决定）。
    { id:'town_market', name:'集市', type:'townTrade', time:30, energy:5, need:{}, text:'码头的集市热闹得很，几个摊子前围着人。' },
    { id:'town_mission', name:'镇口告示板', type:'townMission', time:15, energy:5, need:{}, text:'告示板上贴着镇民们的委托。' },
    { id:'town_info', name:'酒馆情报', type:'townInfo', time:20, energy:5, need:{}, text:'酒馆里烟雾缭绕，一个戴兜帽的人向你招手。' },
      ]},
      ruins:{ name:'遗迹', hotspots:[
    // 这一格原来三个热点都挤在左边（12/15/22），全被 250px 宽的日志栏压住 —— 整体右移
    { x:18, y:30, point:'ruins_slate', label:'遗迹石板' },
    { x:26, y:42, point:'ruins_explore', label:'深入废墟' },
    { x:19, y:54, point:'ruins_guard', label:'石门守卫' },
      ], points:[
        { id:'ruins_slate', name:'遗迹石板', type:'adventure', time:40, energy:20, need:{}, once:true, text:'断柱之间立着一块完好的石板，字迹清晰。' },
        { id:'ruins_explore', name:'深入废墟', type:'adventure', time:40, energy:25, need:{}, daily:2, text:'废墟深处传来机关转动的声响。' },
        { id:'ruins_guard', name:'石门守卫', type:'hunt', time:40, energy:30, need:{}, daily:1, enemies:['guard'], text:'一尊石像动了起来，挡在石门前。' },
      ]},
    },
    desc:{
      intro:'船靠上对岸的码头。一个小镇依海而建，远处是荒废的遗迹。',
      night:'对岸的夜里灯火点点，遗迹方向却一片死寂。',
      rain:'雨中的码头人影匆匆，帆都收了。',
    },
    events:[], travelFrom:'你扬帆渡海，对岸的轮廓越来越近。', travelTo:'' },
  { id:'atlantis', name:'亚特兰蒂斯', img:'assets/img/atlantis_map.png', distMin:150, danger:5, unlockWatch:0, atlantis:1,
    desc:{
      intro:'沉在海底的失落之城，珊瑚在幽微的光里缓缓摇曳。',
      night:'海渊沉沉，只有远古装置睁着幽蓝的眼。',
      rain:'雨点落不进海里，世界安静得能听见自己的心跳。',
    },
    zones:{
      habitat:{ name:'礁石栖息地', img:'assets/img/atlantis/habitat.png', hotspots:[ { x:40, y:62, label:'礁石驻地' } ], points:[ { id:'atl_rest', name:'礁石驻地', type:'camp', time:0, energy:0, text:'' } ] },
      city:{ name:'沉没之城', img:'assets/img/atlantis/city.png', hotspots:[ { x:44, y:58, label:'遗迹残柱', point:'atl_ruin' }, { x:62, y:70, label:'遗迹石台', point:'atl_altar' }, { x:52, y:42, label:'遗失的交易机', point:'atl_vendor' } , { x:74, y:30, label:'遗物箱', point:'atl_pistol' }], points:[
        { id:'atl_ruin', name:'遗迹残柱', type:'gather', time:30, energy:15, need:{}, yields:[{ id:'deepCoral', min:1, max:2 },{ id:'pearlGranule', min:1, max:2, chance:0.5 }], daily:3, text:'你在断柱间摸索，找到发光的珊瑚。' },
        { id:'atl_altar', name:'遗迹石台', type:'hunt', time:30, energy:20, need:{}, daily:2, enemies:['deepGuard'], text:'石台后的阴影里，深海卫兵睁开了眼。' },
        { id:'atl_vendor', name:'遗失的交易机', type:'atlTrade', time:20, energy:5, need:{}, text:'街角立着一台还在微光闪烁的远古交易机。' }, { id:'atl_pistol', name:'船长遗物箱', type:'gather', time:45, energy:22, need:{}, once:true, yields:[{ id:'bpPistol', min:1, max:1 }], text:'你撬开一只锈死的箱子，里面是一张手枪图纸。' } ] },
      coral:{ name:'珊瑚生长带', img:'assets/img/atlantis/coral.png', hotspots:[ { x:36, y:60, label:'珊瑚丛', point:'atl_coral' }, { x:62, y:44, label:'珍珠滩', point:'atl_pearl' }, { x:46, y:76, label:'海葵丛', point:'atl_anemone' } , { x:58, y:84, label:'深殿核心', point:'atl_dcore_coral' }, { x:70, y:70, label:'深海鱼群', point:'atl_fishschool' }], points:[
        { id:'atl_coral', name:'珊瑚丛', type:'gather', time:25, energy:12, need:{}, yields:[{ id:'deepCoral', min:2, max:3 }], daily:3, text:'你采下一丛发光的珊瑚。' },
        { id:'atl_pearl', name:'珍珠滩', type:'gather', time:30, energy:15, need:{}, yields:[{ id:'pearlGranule', min:2, max:4 }], daily:2, text:'细沙里翻出许多珍珠粒。' },
        { id:'atl_anemone', name:'海葵丛', type:'gather', time:30, energy:15, need:{}, guard:['tentacle'], guardChance:0.6, yields:[{ id:'pearlGranule', min:1, max:2 },{ id:'atlantisCore', min:1, max:1, chance:0.15 }], daily:2, text:'海葵丛里结着发光的硬粒，但触手也会缠上来。' }, { id:'atl_dcore_coral', name:'深殿核心·珊瑚', type:'gather', time:45, energy:22, need:{}, once:true, guard:['deepGuard','tentacle','mechGuard'], guardChance:1, yields:[{ id:'deepCore', min:1, max:1 }], text:'珊瑚深处嵌着一块温热的核心。' }, { id:'atl_fishschool', name:'深海鱼群', type:'gather', time:40, energy:18, need:{ item:'net' }, daily:2, yields:[{ id:'fish', min:1, max:3 },{ id:'rareFishA', min:1, max:1, chance:0.18 },{ id:'rareFishB', min:1, max:1, chance:0.12 }], text:'鱼群里有几条从没见过的鱼。' } ] },
      trench:{ name:'海沟', img:'assets/img/atlantis/trench.png', hotspots:[ { x:60, y:62, label:'沟壁矿脉', point:'atl_source' }, { x:40, y:50, label:'深渊怪影', point:'atl_deep' }, { x:78, y:34, label:'无光深渊', point:'atl_dark' } , { x:25, y:68, label:'深殿核心', point:'atl_dcore_trench' }, { x:82, y:62, label:'暗流鱼群', point:'atl_deepfish' }], points:[
        { id:'atl_source', name:'沟壁矿脉', type:'gather', time:40, energy:22, need:{ tool:'pick', tier:3 }, needLight:2, guard:['tentacle','mechGuard'], guardChance:1, yields:[{ id:'sourceOre', min:1, max:2 }], daily:2, text:'你凿下几块发光的源矿。' },
        { id:'atl_deep', name:'深渊怪影', type:'hunt', time:35, energy:25, need:{}, needLight:2, daily:1, enemies:['tentacle','mechGuard'], text:'黑暗中，触手与机械在你周围游弋。' },
        { id:'atl_dark', name:'无光深渊', type:'gather', time:45, energy:25, need:{ tool:'pick', tier:3 }, needLight:3, guard:['mechGuard'], guardChance:0.8, yields:[{ id:'sourceOre', min:2, max:3 },{ id:'atlantisCore', min:1, max:1, chance:0.2 },{ id:'energyCrystal', min:1, max:1, chance:0.5 }], daily:1, text:'更深的沟底漆黑一片，源晶的光却透了出来——机械守卫守在那里。' }, { id:'atl_dcore_trench', name:'深殿核心·海沟', type:'gather', time:45, energy:22, need:{}, once:true, guard:['deepGuard','tentacle','mechGuard'], guardChance:1, yields:[{ id:'deepCore', min:1, max:1 }], text:'沟底的石匣里封着一块核心。' }, { id:'atl_deepfish', name:'暗流鱼群', type:'gather', time:45, energy:20, need:{ item:'net' }, needLight:2, daily:2, guard:['tentacle'], guardChance:0.3, yields:[{ id:'fish', min:1, max:3 },{ id:'rareFishC', min:1, max:1, chance:0.15 },{ id:'rareFishD', min:1, max:1, chance:0.1 },{ id:'rareFishE', min:1, max:1, chance:0.08 }], text:'暗流里藏着发光的鱼影。' } ] },
      sanctum:{ name:'深水圣殿', img:'assets/img/atlantis/sanctum.png', hotspots:[ { x:42, y:60, label:'圣殿之门', point:'atl_device' }, { x:62, y:72, label:'守护者祭坛', point:'atl_boss' }, { x:29, y:42, label:'符文密室', point:'atl_runelab' } ], points:[
        { id:'atl_device', name:'圣殿之门', type:'gather', time:40, energy:22, need:{}, needLight:3, guard:['deepGuard','tentacle','mechGuard'], guardChance:1, yields:[{ id:'anctDevice', min:1, max:1 }], daily:1, text:'圣殿之门旁，躺着一件发光远古装置。' },
        { id:'atl_boss', name:'守护者祭坛', type:'hunt', time:45, energy:30, need:{}, needLight:3, needCore:4, daily:1, enemies:['sunkenKing'], text:'沉没之王在祭坛中央缓缓起身。' },
        { id:'atl_runelab', name:'符文密室', type:'gather', time:45, energy:25, need:{}, needLight:3, guard:['tentacle','mechGuard'], guardChance:1, yields:[{ id:'anctDevice', min:1, max:2 },{ id:'atlantisCore', min:1, max:1, chance:0.35 },{ id:'energyCrystal', min:1, max:1, chance:0.4 }], daily:1, text:'密室的门要懂符文才开；门后是远古装置与一块源晶。' } ] },
      shipwreck:{ name:'沉船墓地', img:'assets/img/atlantis/shipwreck.png', hotspots:[ { x:38, y:62, label:'沉船残骸', point:'atl_wreck' }, { x:64, y:70, label:'船舱深处', point:'atl_wreckhunt' }, { x:25, y:38, label:'船长室', point:'atl_cabin' } , { x:78, y:52, label:'深殿核心', point:'atl_dcore_wreck' }], points:[
        { id:'atl_wreck', name:'沉船残骸', type:'gather', time:30, energy:15, need:{}, yields:[{ id:'shipwood', min:1, max:2 },{ id:'ironpart', min:1, max:1, chance:0.4 }], daily:3, text:'你从沉船里拆下可用的船木与铁件。' },
        { id:'atl_wreckhunt', name:'船舱深处', type:'hunt', time:30, energy:20, need:{}, daily:2, enemies:['deepGuard','tentacle'], text:'船舱深处，有东西在动。' },
        { id:'atl_cabin', name:'船长室', type:'gather', time:35, energy:18, need:{}, needLight:2, guard:'deepGuard', guardChance:0.7, yields:[{ id:'coin', min:2, max:4 },{ id:'anctDevice', min:1, max:1, chance:0.25 }], daily:1, text:'船长室里还锁着东西——也有不欢迎你的东西。' }, { id:'atl_dcore_wreck', name:'深殿核心·沉船', type:'gather', time:45, energy:22, need:{}, once:true, guard:['deepGuard','tentacle','mechGuard'], guardChance:1, yields:[{ id:'deepCore', min:1, max:1 }], text:'船骸的龙骨下压着一块核心。' } ] },
      coralForest:{ name:'珊瑚森林', img:'assets/img/atlantis/coralForest.png', hotspots:[ { x:40, y:62, label:'珊瑚林', point:'atl_cforest' }, { x:66, y:56, label:'发光丛', point:'atl_glow' }, { x:27, y:72, label:'幽光花', point:'atl_deepbloom' } ], points:[
        { id:'atl_cforest', name:'珊瑚林', type:'gather', time:25, energy:12, need:{}, yields:[{ id:'deepCoral', min:2, max:4 }], daily:3, text:'珊瑚林里资源丰饶。' },
        { id:'atl_glow', name:'发光丛', type:'gather', time:30, energy:15, need:{}, guard:'tentacle', guardChance:0.7, yields:[{ id:'anctDevice', min:1, max:1, chance:0.3 },{ id:'pearlGranule', min:1, max:3 }], daily:2, text:'你在发光丛里翻找。' },
        { id:'atl_deepbloom', name:'幽光花', type:'gather', time:35, energy:18, need:{}, needLight:1, guard:'tentacle', guardChance:0.7, yields:[{ id:'anctDevice', min:1, max:1, chance:0.4 },{ id:'atlantisCore', min:1, max:1, chance:0.1 }], daily:2, text:'幽光花会发光，也会招来触手。' } ] },
      pearlCave:{ name:'珍珠洞窟', img:'assets/img/atlantis/pearlCave.png', hotspots:[ { x:42, y:64, label:'珍珠壁', point:'atl_pearlcave' }, { x:64, y:52, label:'晶簇', point:'atl_crystal' }, { x:52, y:30, label:'珍珠之心', point:'atl_pearlheart' } , { x:34, y:44, label:'古匠工坊', point:'atl_bullet' }], points:[
        { id:'atl_pearlcave', name:'珍珠壁', type:'gather', time:30, energy:15, need:{}, needLight:1, yields:[{ id:'pearlGranule', min:3, max:5 }], daily:3, text:'洞壁上嵌满珍珠。' },
        { id:'atl_crystal', name:'晶簇', type:'gather', time:35, energy:18, need:{ tool:'pick', tier:2 }, needLight:1, yields:[{ id:'crystal', min:1, max:2 },{ id:'sourceOre', min:1, max:2, chance:0.5 }], daily:2, text:'你凿下发光晶簇。' },
        { id:'atl_pearlheart', name:'珍珠之心', type:'gather', time:40, energy:20, need:{}, needLight:1, guard:['deepGuard'], guardChance:0.7, yields:[{ id:'pearlGranule', min:4, max:6 },{ id:'atlantisCore', min:1, max:1, chance:0.2 },{ id:'energyCrystal', min:1, max:1, chance:0.5 }], daily:1, text:'洞窟最深处嵌着一颗"珍珠之心"，卫兵守在那里。' }, { id:'atl_bullet', name:'古匠工坊', type:'gather', time:45, energy:22, need:{}, once:true, yields:[{ id:'bpBullet', min:1, max:1 }], text:'工坊的台面上压着一张画满弹丸的图纸。' } ] },
      abyss:{ name:'深渊裂谷', img:'assets/img/atlantis/abyss.png', hotspots:[ { x:44, y:64, label:'裂谷深处', point:'atl_abyssore' }, { x:64, y:52, label:'机械残骸', point:'atl_mech' }, { x:56, y:78, label:'源晶簇', point:'atl_sourcecore' } , { x:32, y:34, label:'深殿核心', point:'atl_dcore_abyss' }], points:[
        { id:'atl_abyssore', name:'裂谷深处', type:'gather', time:40, energy:22, need:{ tool:'pick', tier:3 }, needLight:3, yields:[{ id:'sourceOre', min:2, max:3 }], daily:2, text:'裂谷深处，源矿遍布。' },
        { id:'atl_mech', name:'机械残骸', type:'hunt', time:40, energy:25, need:{}, needLight:3, daily:1, enemies:['mechGuard'], text:'残骸中，机械守卫缓缓站起。' },
        { id:'atl_sourcecore', name:'源晶簇', type:'gather', time:50, energy:28, need:{ tool:'pick', tier:3 }, needLight:3, guard:['mechGuard'], guardChance:1, yields:[{ id:'sourceOre', min:2, max:4 },{ id:'atlantisCore', min:1, max:1, chance:0.5 },{ id:'energyCrystal', min:1, max:1, chance:0.6 }], daily:1, text:'裂谷最底的源晶簇，机械守卫寸步不离。' }, { id:'atl_dcore_abyss', name:'深殿核心·深渊', type:'gather', time:45, energy:22, need:{}, once:true, guard:['deepGuard','tentacle','mechGuard'], guardChance:1, yields:[{ id:'deepCore', min:1, max:1 }], text:'裂谷最暗处，核心静静发光。' } ] },
    },
    events:[], travelFrom:'你潜入水下，向失落的亚特兰蒂斯游去。', travelTo:'你浮出水面，回到了孤岛。' },
];

// ---------- 配方 ----------
// station: none/work1/work2/work3/furn1/furn2/furn3/smoke1/smoke2/fire/stove/spin/loom/mortar/pot/medPot/tannery
// 解锁: needCraft(制造经验等级) / needBp(图纸id)
const RECIPES = [
  // ----- 亚特兰蒂斯（第二章）配方：源质熔炉精炼 / 珠光工作台制造 -----
  { id:'r_sourcebar', name:'源质锭', out:{ sourceBar:1 }, in:{ sourceOre:2, anctDevice:1 }, station:'sourceForge', time:30 },
  { id:'r_divesuit', name:'潜水服', out:{ diveSuit:1 }, in:{ leather:4, resin:4, canvas:2, ironpart:2 }, station:'work2', time:240, needBp:'bpDive' },
  { id:'r_divesuit2', name:'高级潜水服', out:{ diveSuit2:1 }, in:{ deepCoral:6, sourceBar:2, canvas:2, energyCrystal:1 }, station:'pearlWork', time:300, needBp:'bpDive' },
  { id:'r_diveMask', name:'氧气罩', out:{ diveMask:1 }, in:{ leather:2, cloth:3, ironpart:2, flint:2 }, station:'work2', time:180, needBp:'bpDive' },
  { id:'r_goggles', name:'潜水护目镜', out:{ goggles:1 }, in:{ deepCoral:4, pearlGranule:4 }, station:'pearlWork', time:90 },
  { id:'r_lightweak', name:'弱光防水手电', out:{ lightWeak:1 }, in:{ sourceBar:1, anctDevice:1, crystal:1 }, station:'pearlWork', time:120 },
  { id:'r_lightstrong', name:'防水强光潜水手电', out:{ lightStrong:1 }, in:{ sourceBar:3, anctDevice:2, pearlGranule:6, energyCrystal:1 }, station:'pearlWork', time:180 },
  { id:'r_coralarmor', name:'珊瑚甲', out:{ coralArmor:1 }, in:{ deepCoral:12, pearlGranule:6, cloth:2 }, station:'pearlWork', time:180, needBp:'bpCoralArmor' },
  { id:'r_coralblade', name:'珊瑚刺刃', out:{ coralBlade:1 }, in:{ deepCoral:8, sourceBar:1 }, station:'pearlWork', time:150, needBp:'bpCoralBlade' },
  { id:'r_sourcearmor', name:'源质重甲', out:{ sourceArmor:1 }, in:{ sourceBar:8, deepCoral:10, energyCrystal:2 }, station:'pearlWork', time:300, needBp:'bpSourceArmor' },
  { id:'r_sourcespear', name:'源质长枪', out:{ sourceSpear:1 }, in:{ sourceBar:6, anctDevice:2, energyCrystal:2 }, station:'pearlWork', time:240, needBp:'bpSourceSpear' },
  { id:'r_thruster', name:'推进器', out:{ thruster:1 }, in:{ sourceBar:3, anctDevice:2, deepCoral:6, energyCrystal:2 }, station:'pearlWork', time:180, needBp:'bpThruster' },
  { id:'r_pistol', name:'源能手枪', out:{ pistol:1 }, in:{ sourceBar:6, energyCrystal:3, anctDevice:3, ironpart:4 }, station:'pearlWork', time:300, needBp:'bpPistol' },
  { id:'r_bullet', name:'源能子弹×2', out:{ bullet:2 }, in:{ energyCrystal:1, gunpowder:1, ironingot:1 }, station:'pearlWork', time:30, needBp:'bpBullet' },
  // 加工
  { id:'r_plank', name:'削木板', out:{ plank:1 }, in:{ wood:2 }, station:'none', time:15, text:'你用斧子把原木削成木板。' },
  { id:'r_pole', name:'削木杆', out:{ pole:1 }, in:{ branch:2 }, station:'none', time:15 },
  { id:'r_rope', name:'搓绳索', out:{ rope:1 }, in:{ vine:3 }, station:'none', time:15 },
  { id:'r_brick', name:'烧石砖', out:{ stonebrick:2 }, in:{ stone:2, clay:1 }, station:'furn1', time:30 },
  { id:'r_tile', name:'烧瓦片', out:{ tile:2 }, in:{ clay:2 }, station:'furn1', time:30 },
  { id:'r_charcoal', name:'烧木炭', out:{ charcoal:1 }, in:{ wood:2 }, station:'furn1', time:30 },
  { id:'r_ironingot', name:'炼铁锭', out:{ ironingot:1 }, in:{ ironore:2, charcoal:1 }, station:'furn1', time:45 },
  { id:'r_steelingot', name:'炼钢锭', out:{ steelingot:1 }, in:{ ironingot:1, charcoal:1 }, station:'furn2', time:60 },
  { id:'r_blackingot', name:'炼玄铁锭', out:{ blackingot:1 }, in:{ blackiron:2, charcoal:1 }, station:'furn3', time:90, needBp:'bpFurnace' },
  { id:'r_mithrilingot', name:'炼秘银锭', out:{ mithrilingot:1 }, in:{ mithril:2, charcoal:1 }, station:'furn3', time:90, needBp:'bpFurnace' },
  { id:'r_nail', name:'打铁钉', out:{ nail:4 }, in:{ ironingot:1 }, station:'furn1', time:30 },
  { id:'r_ironpart', name:'打铁件', out:{ ironpart:1 }, in:{ ironingot:1 }, station:'work1', time:45 },
  { id:'r_claypot', name:'烧陶锅', out:{ claypot:1 }, in:{ clay:2 }, station:'furn1', time:30 },
  { id:'r_leather', name:'鞣皮革', out:{ leather:1 }, in:{ hide:1 }, station:'tannery', time:30 },
  { id:'r_cloth', name:'纺布', out:{ cloth:1 }, in:{ fiber:4 }, station:'spin', time:45 },
  { id:'r_felt', name:'压毛毡', out:{ felt:1 }, in:{ wool:2 }, station:'spin', time:45 },
  { id:'r_canvas', name:'织帆布', out:{ canvas:1 }, in:{ cloth:2, resin:1 }, station:'loom', time:60 },
  { id:'r_silkcloth', name:'纺蛛丝', out:{ cloth:1 }, in:{ silk:2 }, station:'spin', time:40 },
  { id:'r_basket', name:'编竹篓', out:{ basket:1 }, in:{ bamboo:6, vine:2 }, station:'work1', time:45 },
  // 工具
  { id:'r_axestone', name:'石斧', out:{ axeStone:1 }, in:{ wood:1, flint:1 }, station:'none', time:20 },
  { id:'r_axeiron', name:'铁斧', out:{ axeIron:1 }, in:{ ironingot:1, wood:1 }, station:'work1', time:40 },
  { id:'r_axesteel', name:'钢斧', out:{ axeSteel:1 }, in:{ steelingot:1, wood:1 }, station:'work2', time:50 },
  { id:'r_pickstone', name:'石镐', out:{ pickStone:1 }, in:{ wood:1, flint:1 }, station:'none', time:20 },
  { id:'r_pickiron', name:'铁镐', out:{ pickIron:1 }, in:{ ironingot:1, wood:1 }, station:'work1', time:40 },
  { id:'r_picksteel', name:'钢镐', out:{ pickSteel:1 }, in:{ steelingot:1, wood:1 }, station:'work2', time:50 },
  { id:'r_pickblack', name:'玄铁镐', out:{ pickBlack:1 }, in:{ blackingot:1, wood:1 }, station:'work3', time:60, needBp:'bpBlack' },
  { id:'r_knife', name:'石质匕首', out:{ knifeStone:1 }, in:{ wood:1, flint:1 }, station:'none', time:15 },
  { id:'r_irondagger', name:'铁匕首', out:{ ironDagger:1 }, in:{ ironingot:1, wood:1 }, station:'work1', time:40 },
  { id:'r_irongreatsword', name:'铁大剑', out:{ ironGreatSword:1 }, in:{ ironingot:5, wood:2 }, station:'work2', time:120 },
  { id:'r_hoe', name:'锄头', out:{ hoe:1 }, in:{ wood:2, stone:1 }, station:'none', time:20 },
  { id:'r_rod', name:'鱼竿', out:{ rod:1 }, in:{ bamboo:2, vine:1 }, station:'none', time:15 },
    { id:'r_net', name:'渔网', out:{ net:1 }, in:{ vine:6, wood:3 }, station:'none', time:30 },
  { id:'r_trap', name:'陷阱', out:{ trap:1 }, in:{ wood:2, vine:2 }, station:'none', time:20 },
  { id:'r_split', name:'劈柴', out:{ branch:4 }, in:{ wood:2 }, station:'none', time:10 },
  { id:'r_torch', name:'火把', out:{ torch:1 }, in:{ branch:2, resin:1 }, station:'none', time:10 },
  { id:'r_tinder', name:'火绒', out:{ tinder:1 }, in:{ flint:1, thatch:2 }, station:'none', time:10 },
  { id:'r_spyglass', name:'望远镜', out:{ spyglass:1 }, in:{ crystal:1, eaglefeather:1, wood:2 }, station:'work2', time:60 },
  // 武器
  { id:'r_club', name:'木棒', out:{ club:1 }, in:{ wood:2 }, station:'none', time:10 },
  { id:'r_spear', name:'石矛', out:{ spear:1 }, in:{ wood:1, flint:1 }, station:'none', time:20 },
  { id:'r_ironsword', name:'铁剑', out:{ ironSword:1 }, in:{ ironingot:2, wood:1 }, station:'work1', time:60 },
  { id:'r_steelsword', name:'钢剑', out:{ steelSword:1 }, in:{ steelingot:2, wood:1 }, station:'work2', time:90 },
  { id:'r_blacksword', name:'玄铁剑', out:{ blackSword:1 }, in:{ blackingot:2, mithrilingot:1 }, station:'work3', time:120, needBp:'bpBlack' },
  { id:'r_bow', name:'猎弓', out:{ bow:1 }, in:{ bamboo:4, vine:2, sinew:1 }, station:'work1', time:60 },
  { id:'r_arrow', name:'箭矢×3', out:{ arrow:3 }, in:{ wood:1, flint:1 }, station:'none', time:15 },
  { id:'r_eaglearrow', name:'鹰羽箭', out:{ eagleArrow:1 }, in:{ arrow:1, eaglefeather:1 }, station:'work2', time:20 },
  // 防具衣物
  { id:'r_grassarmor', name:'草甲', out:{ grassArmor:1 }, in:{ thatch:6, vine:2 }, station:'none', time:30 },
  { id:'r_leatherarmor', name:'皮甲', out:{ leatherArmor:1 }, in:{ leather:3, vine:2 }, station:'work1', time:60 },
  { id:'r_ironarmor', name:'铁甲', out:{ ironArmor:1 }, in:{ ironingot:4 }, station:'work2', time:90 },
  { id:'r_blackarmor', name:'玄铁甲', out:{ blackArmor:1 }, in:{ blackingot:4, mithrilingot:1 }, station:'work3', time:120, needBp:'bpBlack' },
  { id:'r_grasscloth', name:'草衣', out:{ grassCloth:1 }, in:{ thatch:4 }, station:'none', time:20 },
  { id:'r_hempcloth', name:'麻衣', out:{ hempCloth:1 }, in:{ fiber:4 }, station:'none', time:20 },
  { id:'r_leathercloth', name:'皮衣', out:{ leatherCloth:1 }, in:{ leather:3 }, station:'work1', time:40 },
  { id:'r_furcoat', name:'毛皮大衣', out:{ furCoat:1 }, in:{ hide:4, wool:4 }, station:'work2', time:90 },
  // 食物
  { id:'r_roastfish', name:'烤鱼', out:{ roastFish:1 }, in:{ fish:1, wood:1 }, station:'fire', time:20 },
  { id:'r_roastmeat', name:'烤肉', out:{ roastMeat:1 }, in:{ meat:1, wood:1 }, station:'fire', time:20 },
  { id:'r_vegsoup', name:'野菜汤', out:{ vegSoup:1 }, in:{ wildveg:1, water:1 }, station:'fire', time:20, needItem:'claypot' },
  { id:'r_meatsoup', name:'肉汤', out:{ meatSoup:1 }, in:{ meat:1, water:1, wood:1 }, station:'fire', time:25, needItem:'claypot' },
  { id:'r_honeywater', name:'蜂蜜水', out:{ honeyWater:1 }, in:{ honey:1, water:1 }, station:'fire', time:15, needItem:'claypot' },
    { id:'r_smokedfish', name:'熏鱼', out:{ smokedFish:1 }, in:{ fish:1, branch:2 }, station:'smoke1', time:40 },
    { id:'r_smokedmeat', name:'熏肉', out:{ smokedMeat:1 }, in:{ meat:1, branch:2 }, station:'smoke1', time:40 },
  { id:'r_saltedmeat', name:'腌肉', out:{ saltedMeat:1 }, in:{ meat:1, salt:1 }, station:'fire', time:20 },
  { id:'r_jerky', name:'肉干', out:{ jerky:1 }, in:{ meat:1, salt:1, wood:1 }, station:'smoke2', time:60 },
  // 晾肉架：挂上去只花 30 分钟，然后要晾满 20 小时才能取（晾晒期间这副架子不能晾别的）
  { id:'r_rackmeat', name:'晾肉干', out:{ jerky:1 }, in:{ meat:1 }, station:'rack', time:30, hang:1200, hangQty:3 },
  { id:'r_shellamulet', name:'贝壳护符', out:{ shellAmulet:1 }, in:{ rope:1, flint:1 }, station:'work1', time:15 },
  { id:'r_beastfang', name:'兽牙吊坠', out:{ beastFang:1 }, in:{ tusk:1, rope:1 }, station:'work1', time:15 },
  { id:'r_pearlneck', name:'珍珠项链', out:{ pearlNeck:1 }, in:{ pearl:1, rope:1 }, station:'work1', time:20 },
  { id:'r_hornamulet', name:'牛角护符', out:{ hornAmulet:1 }, in:{ horn:2, rope:1, hide:1 }, station:'work1', time:25 },
  { id:'r_woodshield', name:'木盾', out:{ woodShield:1 }, in:{ plank:3, rope:2 }, station:'work2', time:45 },
  { id:'r_ironshield', name:'铁盾', out:{ ironShield:1 }, in:{ ironingot:2, woodShield:1 }, station:'work2', time:90 },
  { id:'r_steelshield', name:'钢盾', out:{ steelShield:1 }, in:{ steelingot:2, ironShield:1 }, station:'work2', time:180 },
  { id:'r_dragonbone', name:'提炼龙骨', out:{ dragonbone:1 }, in:{ fossil:2 }, station:'furn1', time:60 },
  { id:'r_vegfry', name:'爆炒野菜', out:{ vegFry:1 }, in:{ wildveg:2, salt:1 }, station:'stove', time:15 },
  { id:'r_meatstew', name:'炖肉', out:{ meatStew:1 }, in:{ meat:2, salt:1 }, station:'stove', time:25 },
  { id:'r_mushroomsoup', name:'蘑菇汤', out:{ mushroomSoup:1 }, in:{ mushroom:1, water:1, wood:1 }, station:'fire', time:20, needItem:'claypot' },
  // 药品
    { id:'r_herbpaste', name:'草药膏', out:{ herbPaste:1 }, in:{ herb:2, water:2 }, station:'mortar', time:30 },
  { id:'r_salve', name:'简易药膏', out:{ salve:1 }, in:{ herb:2 }, station:'none', time:10 },
    { id:'r_bandage', name:'止血绷带', out:{ bandage:1 }, in:{ cloth:2, herb:1 }, station:'work1', time:15 },
  { id:'r_antidote', name:'解毒剂', out:{ antidote:1 }, in:{ herb:2, snakegall:1 }, station:'mortar', time:30 },
  { id:'r_poisoncoat', name:'淬毒剂', out:{ poisonCoat:1 }, in:{ venom:1, resin:1 }, station:'mortar', time:20 },
  { id:'r_tea', name:'提神茶', out:{ tea:1 }, in:{ herb:1, honey:1, water:1 }, station:'pot', time:20, needItem:'claypot' },
  { id:'r_hay', name:'晒干草', out:{ hay:2 }, in:{ thatch:4 }, station:'none', time:15 },
  { id:'r_friedegg', name:'煎蛋', out:{ friedEgg:1 }, in:{ egg:1 }, station:'fire', time:15 },
  { id:'r_bigomelette', name:'大煎蛋', out:{ bigOmelette:1 }, in:{ egg:5, water:1, wood:1 }, station:'fire', time:25, needItem:'claypot' },
  { id:'r_superegg', name:'超级大蛋', out:{ superEgg:1 }, in:{ egg:10, water:3, wood:3 }, station:'stove', time:40, needItem:'claypot' },
  { id:'r_bluebull', name:'蓝牛', out:{ blueBull:1 }, in:{ water:2, herb:3, honey:1 }, station:'medPot', time:45 },
  { id:'r_zhanglaoji', name:'张老吉', out:{ zhangLaoJi:1 }, in:{ water:2, herb:2 }, station:'pot', time:20, needItem:'claypot' },
  { id:'r_lotuspill', name:'不死丹', out:{ lotusPill:1 }, in:{ snowlotus:3 }, station:'medPot', time:60, needBp:'bpLotus' },
  // 特殊
  { id:'r_gunpowder', name:'火药', out:{ gunpowder:1 }, in:{ niter:2, sulfur:1, charcoal:1 }, station:'mortar', time:30, needBp:'bpGunpowder' },
  { id:'r_smoke', name:'简易烟雾弹', out:{ smokeBomb:1 }, in:{ sulfur:1, niter:1, branch:2 }, station:'work1', time:20 },
  { id:'r_supplybox', name:'打包补给箱', out:{ supplybox:1 }, in:{ smokedMeat:20, water:20 }, station:'work2', time:60 },
  // 限时活动 · 神弓（26.9.15-26.9.30）：全账号唯一（手上有或邮箱里有就不再显示）。
  // ⚠️ 作者 2026-09-17 要求"把神弓的制造放到最下面"——所以它固定在 RECIPES 数组的**最后一条**
  //    （列表是按数组顺序渲染的，放最后就是精工工作台/制造页最底下一格）。
  // 活动结束后：把这一条配方删掉即可（物品定义与领取逻辑不用动，已做出的神弓照常可用）。
  { id:'r_divinebow', name:'限定 · 神弓（26.9.15-26.9.30）', out:{ divineBow:1 }, station:'work2', time:180, uniqueItem:'divineBow',
    in:{ mithrilingot:2, eaglefeather:6, queenSilk:1, deepCoral:3, sourceBar:1, rope:4 } },
];

// ---------- 建筑 ----------
// ---------- 作物（生长天数 / 基础产量；收获时统一 +2 奖励） ----------
const CROPS = {
  seedCarrot: { name:'萝卜', out:'carrot', days:3, min:2, max:3 },
  seedWheat:  { name:'小麦', out:'wheat',  days:3, min:3, max:4 },
  seedHerb:   { name:'药草', out:'herb',   days:3, min:2, max:3 },
};

// 建筑链：house/fire/storage/wall/watch/dock/farm；家具：furniture 列表
const BUILDING_CHAINS = {
  house: [
    { tier:0, name:'帐篷', mats:{}, time:0, storage:30, rest:0.6, warm:0, slots:1, desc:'海难后搭起的第一个家。' },
    { tier:1, name:'草房', mats:{ plank:10, thatch:20, vine:6 }, time:240, storage:60, rest:0.8, warm:1, slots:2, desc:'铺着茅草顶的小屋，风雨不侵。' },
    { tier:2, name:'木屋', mats:{ plank:30, nail:15 }, time:480, storage:100, rest:1.0, warm:2, slots:4, desc:'结实的木屋，像个真正的家。' },
    { tier:3, name:'砖瓦房', mats:{ stonebrick:30, tile:20, nail:20 }, time:960, storage:150, rest:1.2, warm:3, slots:7, desc:'砖瓦房，全岛最体面的房子。' },
  ],
  fire: [
    { tier:0, name:'篝火', mats:{}, time:0, cook:1, warm:0, desc:'石与木搭的篝火，炊烟能招来商船。' },
    { tier:1, name:'火塘', mats:{ stonebrick:8, clay:4 }, time:120, cook:2, warm:1, desc:'石砌火塘，雨雪天也能生火。' },
    { tier:2, name:'壁炉', mats:{ stonebrick:12, ironpart:2 }, time:240, cook:3, warm:2, desc:'屋内的壁炉，整个冬天都是暖的。' },
  ],
  storage: [
    { tier:0, name:'储物箱', mats:{}, time:0, cap:20, desc:'木箱，装下全部家当。' },
    { tier:1, name:'大木箱', mats:{ plank:6, nail:2 }, time:120, cap:50, desc:'更大的木箱。' },
    { tier:2, name:'仓库', mats:{ plank:16, nail:8 }, time:360, cap:150, desc:'仓库，家底厚实起来。' },
  ],
  wall: [
    { tier:0, name:'无围墙', mats:{}, time:0, def:0, raid:0.15, desc:'营地毫无遮拦。' },
    { tier:1, name:'栅栏', mats:{ wood:20 }, time:60, def:10, raid:0.09, desc:'木栅栏，能拦住野猪。' },
    { tier:2, name:'木墙', mats:{ plank:30 }, time:180, def:30, raid:0.03, desc:'厚实的木墙。' },
    { tier:3, name:'石墙', mats:{ stonebrick:40 }, time:480, def:80, raid:0.015, desc:'石墙，海盗来了也要掂量。' },
  ],
  watch: [
    { tier:0, name:'未建造', mats:{}, time:0, desc:'营地旁的小丘空着。' },
    { tier:1, name:'一级瞭望台', mats:{ pole:8, plank:8, vine:4 }, time:120, unlock:['grassland','desert','cave'], desc:'能望见草原、荒漠与山洞口。' },
    { tier:2, name:'二级瞭望台', mats:{ plank:16, nail:8, rope:2 }, time:240, unlock:['peak','sea','shore'], weather12:1, desc:'能望见山顶、海域与对岸岛影。' },
    { tier:3, name:'三级瞭望台', mats:{ stonebrick:16, ironpart:8, canvas:2, spyglass:1 }, time:480, unlock:['ruins'], weather24:1, info:1, desc:'鹰眼全图，全岛动静尽收眼底。' },
  ],
  dock: [
    { tier:0, name:'未建造船坞', mats:{}, time:0, boat:'none', desc:'河边还没有码头。' },
    { tier:1, name:'船坞', mats:{ wood:10 }, time:60, boat:'none', desc:'河边的小码头。' },
    { tier:2, name:'木筏', mats:{ bamboo:20, vine:10, wood:10 }, time:120, boat:'raft', desc:'能划到近海的木筏。' },
    { tier:3, name:'小船', mats:{ plank:20, resin:4, canvas:2 }, time:240, boat:'boat', desc:'能渡海去对岸的小船。' },
    { tier:4, name:'大船', mats:{ plank:40, nail:20, canvas:4, shipwood:3 }, time:480, boat:'ship', desc:'载货量大的船。' },
    { tier:5, name:'远洋船', mats:{ plank:40, ironpart:10, canvas:4, dragonbone:1, shipwood:5 }, time:720, boat:'ocean', needBp:'bpShip', desc:'能跨越大海的远洋船。' },
  ],
  farm: [
    { tier:0, name:'苗床', mats:{}, time:0, plots:1, desc:'帐篷前的小苗床。' },
    { tier:1, name:'田垄', mats:{ wood:8, clay:4 }, time:120, plots:2, desc:'整整齐齐的田垄。' },
    { tier:2, name:'水田', mats:{ clay:8, stone:8 }, time:240, plots:3, desc:'引了河水的水田。' },
  ],
};

// 家具（独立建造，占家具位）
const FURNITURE = [
  { id:'wb1', name:'简易工作台', station:'work1', mats:{ plank:4, stone:4 }, time:60, desc:'敲敲打打的地方。' },
  { id:'wb2', name:'精工工作台', station:'work2', mats:{ plank:8, ironpart:2 }, time:180, needPrev:'wb1', needCraft:2, desc:'能加工精细铁件。' },
  { id:'wb3', name:'高级工坊', station:'work3', mats:{ ironpart:6, stonebrick:10 }, time:360, needPrev:'wb2', desc:'锻造顶级装备的工坊。' },
  { id:'fr1', name:'简易熔炉', station:'furn1', mats:{ clay:6, stone:6 }, time:120, desc:'烧陶炼铁的小炉子。' },
  { id:'fr2', name:'砖熔炉', station:'furn2', mats:{ stonebrick:8, clay:4 }, time:180, needPrev:'fr1', desc:'温度更高，能炼钢。' },
  { id:'fr3', name:'高炉', station:'furn3', mats:{ stonebrick:12, ironpart:4 }, time:360, needPrev:'fr2', needBp:'bpFurnace', desc:'熔炼玄铁秘银的高炉。' },
  { id:'sm1', name:'烟熏炉', station:'smoke1', mats:{ stone:6, wood:4 }, time:60, desc:'熏鱼熏肉，保鲜七日。' },
  { id:'sm2', name:'熏制房', station:'smoke2', mats:{ stonebrick:8, ironpart:2 }, time:180, needPrev:'sm1', desc:'批量熏制，能做肉干。' },
  // ⚠️ sleepH 统一 8 小时（作者 2026-09-15）：床的好坏体现在"体力恢复比例 rest"和"精神恢复 spirit"上，
  //    不再让好床睡得更短（以前 8/7/6/5，玩家会觉得"买了好床反而睡得更少"）。
  { id:'bed1', name:'草床', rest:0.7, sleepH:8, spirit:6, mats:{ thatch:10, wood:4 }, time:30, desc:'草铺的床。' },
  { id:'bed2', name:'木床', rest:0.9, sleepH:8, spirit:7, mats:{ plank:4, cloth:2 }, time:60, needPrev:'bed1', desc:'木床睡得踏实。' },
  { id:'bed3', name:'软床', rest:1.0, sleepH:8, spirit:9, mats:{ wool:4, felt:2, plank:4 }, time:120, needPrev:'bed2', desc:'铺着毛毡的软床。' },
  { id:'bed4', name:'大床', rest:1.2, sleepH:8, spirit:10, mats:{ wool:6, felt:3, plank:6 }, time:180, needPrev:'bed3', desc:'宽敞的大床。' },
  { id:'stove', name:'灶台', station:'stove', mats:{ stone:8, clay:4 }, time:60, desc:'能同时煮两锅。' },
  { id:'rack', name:'晾肉架', station:'rack', mats:{ wood:6, vine:2 }, time:30, desc:'风干肉条。' },
  { id:'tannery', name:'制革架', station:'tannery', mats:{ wood:4, stone:4 }, time:30, desc:'把兽皮鞣成皮革。' },
  { id:'spin', name:'纺车', station:'spin', mats:{ wood:6, bamboo:4 }, time:60, desc:'纺线织布。' },
  { id:'loom', name:'织布机', station:'loom', mats:{ wood:8, ironpart:2 }, time:120, needPrev:'spin', desc:'织出结实的布匹。' },
  { id:'mortar', name:'研钵', station:'mortar', mats:{ stone:2 }, time:15, desc:'研磨药材。' },
  { id:'medPot', name:'药炉', station:'medPot', mats:{ clay:4, stone:4 }, time:60, needPrev:'mortar', desc:'炼制丹药。' },
  // 水壶系（储水）——家具，但**不占家具位**（在既有家具上加装的次级工位）
  { id:'tank', name:'水壶', mats:{ clay:6 }, time:60, desc:'储水罐：造好后口渴消耗 -20%，长期有效、不占家具位。' },
  { id:'rainfilter', name:'滤雨器', mats:{ clay:8, stonebrick:4, charcoal:2 }, time:120, needPrev:'tank', desc:'在水壶上加装滤网：保留水壶的 -20% 口渴效果，另外下雨天自动收集 2~4 份淡水。不占家具位。' },
  { id:'shelf', name:'书架', craftBonus:0.1, mats:{ plank:8 }, time:120, desc:'制造经验+10%。' },
  { id:'flag', name:'信号旗', mats:{ wood:4, cloth:2 }, time:30, desc:'升起旗帜，次日商船必来。' },
  { id:'signpost', name:'路标', travelBonus:0.1, mats:{ wood:4 }, time:30, desc:'赶路时间-10%。' },
  { id:'grindstone', name:'磨刀石', station:'grind', mats:{ stone:4, flint:1 }, time:40, desc:'磨刀/修补武器的石台。', grind:1 },
  { id:'coop', name:'鸡舍', mats:{ wood:10, vine:4 }, time:60, desc:'最多养 3 只鸡（在鸡舍管理里可以扩建两次：3 → 4 → 5 只）：外岛买的小鸡连喂 5 天小麦就长成母鸡，母鸡每天吃 1 份小麦、下一颗蛋，20~30 天后寿终（留 1 份兽肉）。' },
  { id:'pen', name:'羊圈', mats:{ wood:12, vine:6 }, time:90, desc:'最多养 3 只羊：每只每天吃 1 份干草、产 1 份羊毛，40~60 天后寿终（留 3 份兽肉）。' },
  // 养蜂人专属：每天清晨自动产 1 份蜂蜜（走 newDay 的 dailyItems 通用机制）；占 1 个家具位
  { id:'beehive', name:'蜂箱', mats:{ wood:8, thatch:6 }, time:90, onlyIdentity:'beekeeper', dailyItems:{ honey:1 }, desc:'养蜂人专属：每天清晨收获 1 份蜂蜜。占 1 个家具位。' },
];

// 亚特兰蒂斯 · 礁石栖息地专属家具（独立家具位，与第一章互不干扰）
const ATLANTIS_FURNITURE = [
  { id:'pearlWork', name:'珠光工作台', station:'pearlWork', mats:{ deepCoral:8, pearlGranule:10 }, time:120, desc:'制造潜水与源质装备。' },
  { id:'sourceForge', name:'源质熔炉', station:'sourceForge', mats:{ sourceOre:10, stonebrick:8 }, time:180, desc:'把源矿精炼成源质锭。' },
  { id:'repairBench', name:'修补台', station:'repair', mats:{ deepCoral:4, sourceBar:1 }, time:60, desc:'用亚特兰蒂斯材料修补潜水服/氧气罩。', repairDive:1 },
];

// 礁石栖息地可点击热点
const ATLANTIS_HOTSPOTS = [
  { id:'camp',   x:40, y:58, glyph:'➤', label:'礁石营地 · 建造' },
  { id:'inv',    x:60, y:60, glyph:'➤', label:'储物箱 · 背包' },
  { id:'repair', x:56, y:72, glyph:'✚', label:'修补台' },
  { id:'stone',  x:50, y:48, glyph:'◈', label:'传送石 · 回孤岛', needFlag:'ended_C' },
  { id:'map',    x:22, y:30, glyph:'▣', label:'查看大地图' },   // 右移：别被左侧日志栏压住
];
// 礁石栖息地家具对位（建造后在该坐标显示贴图）
const ATLANTIS_BUILD_POS = {
  pearlWork:   { x:38, y:64 },
  sourceForge: { x:62, y:64 },
  repairBench: { x:50, y:80 },
};
// 亚特兰蒂斯大地图上的区域箭头（点箭头消耗时间移动）
const ATLANTIS_MAP_ARROWS = {
  habitat:     { x:78, y:22, label:'礁石栖息地' },
  city:        { x:50, y:35, label:'沉没之城' },
  coral:       { x:30, y:56, label:'珊瑚生长带' },
  shipwreck:   { x:15, y:45, label:'沉船墓地' },
  coralForest: { x:68, y:52, label:'珊瑚森林' },
  pearlCave:   { x:38, y:20, label:'珍珠洞窟' },
  trench:      { x:87, y:52, label:'海沟' },
  abyss:       { x:90, y:80, label:'深渊裂谷' },
  sanctum:     { x:50, y:80, label:'深水圣殿' },
  home:        { x:8,  y:20, label:'↑ 返回孤岛' },
};

// 深海区（要摸黑/开灯才敢走的海底区域）：在这些区域附近游动，40% 会被海底怪物拦截
// 注意：不包含 礁石栖息地（安全营地）、沉没之城、珊瑚生长带（较浅）
const ATLANTIS_DEEP_ZONES = ['coralForest','pearlCave','shipwreck','trench','abyss','sanctum'];

// ---------- 敌人 ----------
// traits: charge首回合×2 / poison / flee高逃跑 / pack成群 / enrage狂暴 / evade高闪避 /
//         first先手 / water水中不可防御 / ironImmune免疫铁器 / summon召唤 / gun火枪
const ENEMIES = {
  boar: { id:'boar',  name:'野猪', img:'assets/img/enemies/boar.png', hp:30, atk:8, def:2, spd:8, traits:['charge'], drops:[{ id:'meat', qty:'1-2', ch:0.7 },{ id:'hide', qty:1, ch:0.5 },{ id:'tusk', qty:1, ch:0.4 },{ id:'sinew', qty:1, ch:0.3 }], desc:'一头鬃毛竖起的野猪，獠牙对着你。' },
  goat: { id:'goat',  name:'岩羊', img:'assets/img/enemies/goat.png', hp:26, atk:8, def:2, spd:12, traits:['charge'], drops:[{ id:'meat', qty:'1-2', ch:0.7 },{ id:'hide', qty:1, ch:0.5 },{ id:'horn', qty:1, ch:0.35 }], desc:'长着一对厚重弯角的岩羊，站在峭壁上打量你。' },
  eagle: { id:'eagle', name:'雪羽鹰', img:'assets/img/enemies/eagle.png', elite:1, hp:50, atk:18, def:5, spd:20, traits:['first','evade'], drops:[{ id:'eaglefeather', qty:'1-2', ch:0.7 },{ id:'meat', qty:1, ch:0.4 }], desc:'一只翼展惊人的雪羽鹰，尖啸着守着这片矿脉。' },
  snake: { id:'snake',  name:'毒蛇', img:'assets/img/enemies/snake.png', hp:18, atk:6, def:1, spd:12, traits:['poison'], drops:[{ id:'snakegall', qty:1, ch:0.6 }], desc:'一条盘起的毒蛇，吐着信子。' },
  rabbit: { id:'rabbit',  name:'野兔', img:'assets/img/enemies/rabbit.png', hp:10, atk:2, def:0, spd:16, traits:['flee'], drops:[{ id:'meat', qty:1, ch:0.8 },{ id:'hide', qty:1, ch:0.3 }], desc:'一只受惊的野兔。' },
  wolf: { id:'wolf',  name:'狼', img:'assets/img/enemies/wolf.png', hp:45, atk:12, def:3, spd:14, traits:['pack'], drops:[{ id:'hide', qty:'1-2', ch:0.7 },{ id:'meat', qty:1, ch:0.6 },{ id:'sinew', qty:1, ch:0.5 }], desc:'灰狼伏低身子，喉咙里滚着低吼。' },
  ox: { id:'ox',  name:'野牛', img:'assets/img/enemies/ox.png', hp:70, atk:16, def:5, spd:10, traits:['enrage'], drops:[{ id:'meat', qty:'2-3', ch:0.9 },{ id:'hide', qty:2, ch:0.8 },{ id:'horn', qty:1, ch:0.4 }], desc:'一头野牛刨着蹄子，随时要冲过来。' },
  scorpion:{ id:'scorpion', name:'沙蝎', img:'assets/img/enemies/scorpion.png', hp:25, atk:10, def:2, spd:12, traits:['poison'], drops:[{ id:'venom', qty:1, ch:0.5 }], desc:'一只尾针高举的沙蝎。' },
  boneguard:{ id:'boneguard', name:'白骨守卫', img:'assets/img/enemies/boneguard.png', hp:60, atk:14, def:5, spd:8, traits:['ironImmune'], nightBuff:1, drops:[{ id:'fossil', qty:1, ch:0.5 },{ id:'dragonbone', qty:1, ch:0.15 },{ id:'coin', qty:1, ch:0.05 }], desc:'一具持刀的白骨缓缓转身，眼窝里两点幽火。' },
  bats: { id:'bats',  name:'蝙蝠群', img:'assets/img/enemies/bats.png', hp:15, atk:6, def:1, spd:16, traits:['evade'], drops:[{ id:'niter', qty:'1-2', ch:0.7 }], desc:'黑压压的蝙蝠群向你扑来。' },
  spider: { id:'spider',  name:'巨型蜘蛛', img:'assets/img/enemies/spider.png', hp:55, atk:13, def:3, spd:10, traits:['poison'], drops:[{ id:'silk', qty:'1-2', ch:0.7 },{ id:'venom', qty:1, ch:0.3 }], desc:'一只磨盘大的蜘蛛从洞顶落下。' },
  // minDay：前 30 天不会出现（玩家反馈"洞穴熊有点强"）——路上拦路、洞里狩猎都按这个门槛过滤
  cavebear:{ id:'cavebear', name:'洞穴熊', img:'assets/img/enemies/cavebear.png', hp:120, atk:20, def:7, spd:8, traits:['enrage'], minDay:30, drops:[{ id:'hide', qty:2, ch:0.9 },{ id:'meat', qty:3, ch:0.9 }], desc:'冬眠被惊醒的巨熊，站起时几乎顶到洞顶。' },
  leopard:{ id:'leopard', name:'雪豹', img:'assets/img/enemies/leopard.png', hp:90, atk:18, def:6, spd:18, traits:['first'], drops:[{ id:'hide', qty:2, ch:0.8 },{ id:'meat', qty:2, ch:0.7 }], desc:'雪豹在岩石间移动，像一道白色的影子。' },
  shark: { id:'shark',  name:'鲨鱼', img:'assets/img/enemies/shark.png', hp:100, atk:18, def:5, spd:14, traits:['water'], drops:[{ id:'sharkfin', qty:1, ch:0.6 },{ id:'meat', qty:2, ch:0.8 },{ id:'pearl', qty:1, ch:0.3 }], desc:'背鳍划开水面，绕着你打转。' },
  pirate: { id:'pirate',  name:'海盗', img:'assets/img/enemies/pirate.png', hp:60, atk:14, def:4, spd:12, traits:['pack'], drops:[{ id:'coin', qty:'1-3', ch:0.5 },{ id:'rope', qty:1, ch:0.5 },{ id:'gunpowder', qty:1, ch:0.3 }], desc:'几个持刀的海盗狞笑着围上来。' },
  guard: { id:'guard',  name:'遗迹守卫', img:'assets/img/enemies/guard.png', hp:150, atk:24, def:9, spd:6, traits:['ironImmune'], drops:[{ id:'coin', qty:'2-5', ch:0.7 },{ id:'crystal', qty:1, ch:0.5 }], desc:'石像发出沉闷的轰鸣，挡住了去路。' },
  wolfKing:{ id:'wolfKing', name:'狼王', img:'assets/img/boss_wolf.png', boss:1, hp:130, atk:22, def:8, spd:16, traits:['summon'], drops:[{ id:'wolfkingpelt', qty:1, ch:1 },{ id:'hide', qty:3, ch:1 }], desc:'狼王站在山丘上，目光比月亮还冷。' },
  spiderQueen:{ id:'spiderQueen', name:'蜘蛛女王', img:'assets/img/boss_spider.png', boss:1, hp:160, atk:22, def:7, spd:10, traits:['summon','poison'], drops:[{ id:'queenSilk', qty:1, ch:1 },{ id:'silk', qty:3, ch:1 }], desc:'蛛网中央，蜘蛛女王缓缓睁开八只眼睛。' },
  pirateBoss:{ id:'pirateBoss', name:'海盗头目', img:'assets/img/boss_pirate.png', boss:1, hp:180, atk:26, def:9, spd:14, traits:['gun'], drops:[{ id:'coin', qty:20, ch:1 },{ id:'bpGunpowder', qty:1, ch:0.5 },{ id:'bpDive', qty:1, ch:0.12 },{ id:'bpShip', qty:1, ch:0.12 },{ id:'bpBlack', qty:1, ch:0.12 },{ id:'brokenPistol', qty:1, ch:0.35 }], desc:'独眼海盗头目举起火枪，狞笑着瞄准你。' },
  slateGuard:{ id:'slateGuard', name:'石板守卫', img:'assets/img/enemies/slateguard.png', boss:1, hp:170, atk:24, def:9, spd:7, traits:['stoneGuard'], drops:[{ id:'slate', qty:1, ch:1 },{ id:'coin', qty:12, ch:1 }], desc:'一尊通灵的石碑守卫镇守着石板：石甲把一部分伤害弹回给你，石躯符文闪烁。' },
  slateGuard2:{ id:'slateGuard2', name:'石板守卫', img:'assets/img/enemies/slateguard.png', elite:1, noDex:1, hp:150, atk:22, def:9, spd:7, traits:['stoneGuard'], drops:[{ id:'coin', qty:'4-8', ch:1 },{ id:'crystal', qty:1, ch:0.5 }], desc:'又一尊从碑前站起的石像守卫，守着山上的雪线。它不持石板，但石甲的符文照样反弹伤害。' },
  deepGuard:{ id:'deepGuard', name:'深海卫兵', img:'assets/img/enemies/deepGuard.png', hp:70, atk:16, def:6, spd:9, traits:[], drops:[{ id:'sourceOre', qty:1, ch:0.6 },{ id:'deepCoral', qty:1, ch:0.4 }], desc:'手持远古长矛的深海卫兵，眼灯幽蓝。' },
  tentacle:{ id:'tentacle', name:'触手哨兵', img:'assets/img/enemies/tentacle.png', hp:55, atk:14, def:4, spd:12, traits:['pack'], packAlways:1, drops:[{ id:'pearlGranule', qty:'1-2', ch:0.7 }], desc:'从深暗中伸出的触手哨兵，一下一下地收缩——而且从来不单独出现。' },
  mechGuard:{ id:'mechGuard', name:'机械守卫', img:'assets/img/enemies/mechGuard.png', hp:120, atk:20, def:8, spd:7, traits:['ironImmune'], drops:[{ id:'anctDevice', qty:1, ch:0.5 },{ id:'sourceBar', qty:1, ch:0.3 }], desc:'远古机械守卫，在尘埃中缓缓苏醒。' },
  sunkenKing:{ id:'sunkenKing', name:'沉没之王', img:'assets/img/boss_sunken.png', boss:1, hp:220, atk:28, def:10, spd:11, traits:['summon','pierce'], drops:[{ id:'sourceArmor', qty:1, ch:1 },{ id:'anctDevice', qty:3, ch:1 }], desc:'失落文明的最后守护者：它的必中一击，能撕裂深海。' },
};

// 采集遇袭怪表（按场景当地怪；低危用野兔缓和，采石场为岩羊）
const AMBUSH_MONSTERS = { forest:['boar'], bamboo:['snake'], river:['rabbit'], farm:['rabbit'], quarry:['goat'], cave:['bats','spider'], desert:['scorpion'], grassland:['ox'], peak:['leopard'] };

// ---------- 老潮商船 ----------
const LAOCHAO = {
  sell: [ // 他卖
    { id:'wood', base:8, from:1 },
    { id:'hay', base:8, from:3 },
    { id:'salt', base:20, from:1 }, { id:'ironingot', base:60, from:1 },
    { id:'seedCarrot', base:15, from:1 }, { id:'seedWheat', base:20, from:5 }, { id:'seedHerb', base:30, from:5 },
    { id:'cloth', base:35, from:7 }, { id:'canvas', base:90, from:12 }, { id:'felt', base:30, from:7 },
    { id:'nail', base:15, from:5 }, { id:'ironpart', base:70, from:7 },
    { id:'steelingot', base:150, from:15 }, { id:'gunpowder', base:80, from:10 },
    { id:'blackingot', base:400, from:20 },
    { id:'bpLotus', base:200, from:20, kind:'bp' },
  ],
  buy: [ // 他收
    { id:'smokedFish', base:15 }, { id:'smokedMeat', base:30 }, { id:'roastFish', base:8 },
    { id:'hide', base:15, winter:1.5 }, { id:'jerky', base:40 }, { id:'wool', base:10 },
    { id:'pearl', base:200 }, { id:'sharkfin', base:180 }, { id:'honey', base:35 },
    { id:'tusk', base:25 }, { id:'horn', base:30 },
  ],
  commissions: [
    { id:'c1', name:'熏鱼订单', need:{ smokedFish:20 }, reward:{ ironingot:5, beibi:50 }, from:5, text:'老潮要 20 条熏鱼，运去对岸卖。' },
    { id:'c2', name:'兽皮订单', need:{ hide:10 }, reward:{ steelingot:2, beibi:80, fame:1 }, from:8, text:'对岸的裁缝要 10 张兽皮。' },
    { id:'c3', name:'珍珠委托', need:{ pearl:3 }, reward:{ coin:10, beibi:50, fame:1 }, from:14, text:'有人高价求 3 颗珍珠。' },
    { id:'c4', name:'剿灭海盗', type:'kill', target:'pirateBoss', reward:{ coin:30, steelingot:3, fame:1 }, from:20, text:'海岸海盗为祸，悬赏海盗头目！' },
    { id:'c5', name:'古生物收藏', need:{ fossil:3 }, reward:{ coin:20, blackingot:2, fame:1 }, from:22, text:'对岸的学者想收三块骨化石做研究——石板那种东西，他让你自己留着。' },
  ],
};

// 盐镇集市
const TOWN = {
  grocer: { name:'杂货商', needFame:0, sell:[
      { id:'salt', base:20 }, { id:'seedCarrot', base:15 }, { id:'seedWheat', base:20 }, { id:'seedHerb', base:30 },
      { id:'cloth', base:35 }, { id:'felt', base:30 }, { id:'nail', base:15 }, { id:'rope', base:8 },
      { id:'hay', base:6, from:5 }, { id:'chick', base:80, from:10 },
      { id:'wheat', base:8, from:3 },
    ], buy:[ { id:'fish', base:5 }, { id:'carrot', base:5 }, { id:'wheat', base:4 }, { id:'honey', base:35 }, { id:'snakegall', base:18 }, { id:'seasalt', base:15 }, { id:'silk', base:18 }, { id:'rot', base:2 } ] },
  smith: { name:'铁匠', needFame:1, sell:[
      { id:'steelingot', base:150 }, { id:'blackingot', base:400 }, { id:'ironSword', base:200 },
      { id:'steelSword', base:400 }, { id:'ironArmor', base:350 }, { id:'bpFurnace', base:200, kind:'bp' },
    ], buy:[ { id:'ironore', base:15 }, { id:'charcoal', base:10 }, { id:'goldore', base:55 } ] },
  informant:{ id:'informant', name:'情报贩子', needFame:2, sell:[
      { id:'seachart', base:150, currency:'coin' }, { id:'bpShip', base:500, currency:'beibi', kind:'bp' },
      { id:'bpDive', base:400, currency:'beibi', kind:'bp' },
    ], buy:[ { id:'relic', base:600 }, { id:'pearl', base:220 }, { id:'anctDevice', base:120 } ] },
};

// 黑市（沉船湾 · 独眼）
const BLACKMARKET = {
  sell: [ { id:'gunpowder', base:120 }, { id:'antidote', base:40 }, { id:'niter', base:35 }, { id:'sulfur', base:35 }, { id:'bpBlack', base:400, kind:'bp' } ],
  buy: [ { id:'venom', base:60 }, { id:'silk', base:20 }, { id:'queenSilk', base:500 }, { id:'relic', base:600 } ],
};

// ---------- 事件 ----------
const STORY_EVENTS = [
  { day:3, id:'e_driftbottle', text:'你在河畔的漂流物里发现一个瓶子，瓶口用蜡封着。', scene:'river', once:1 },
  { day:5, id:'e_laochao', text:'海平线上出现一面帆。一个戴斗笠的老头把船靠上南岸，朝你的炊烟挥手。', scene:'camp', once:1 },
  { day:7, id:'e_wolfraid', text:'入夜后，营地外的黑暗里亮起几双绿眼睛。狼群来了。', scene:'camp', once:1 },
  { day:10, id:'e_caveTip', text:'老潮临走前说："山里那个洞，有富铁矿。不过夜里别去，里头有东西。"', scene:'camp', once:1 },
  { day:15, id:'e_storm', text:'一场风暴横扫海岸。风停之后，沉船湾的方向露出更多残骸。', scene:'camp', once:1 },
  { day:20, id:'e_pirate', text:'对岸传来消息：海盗船常在近海出没，盐镇贴出了悬赏。', scene:'camp', once:1 },
  { day:25, id:'e_altar', text:'深夜，山顶方向亮起微光，像有人在云海之上点灯。', scene:'camp', once:1 },
  { day:30, id:'e_bell', text:'对岸的方向传来遥远的钟声，像隔着海在呼唤什么。', scene:'camp', once:1 },
  { day:45, id:'e_winter', text:'第一场雪落下来。冬天到了，这是孤岛最漫长的季节。', scene:'camp', once:1 },
  { day:60, id:'e_newyear', text:'新的一年。海还是那片海，而你已经不是刚漂来时的你了。', scene:'camp', once:0 },
];

// 随机事件：scene 触发，带选择
const RANDOM_EVENTS = [
  { id:'re_hive', scene:'forest', w:10, text:'砍树的动静惊动了一窝野蜂！', choices:[
      { label:'抢蜂蜜', items:{ honey:1 }, dmg:8, status:'poison' },
      { label:'抱头逃跑', time:10 },
  ]},
  { id:'re_rockfall', scene:'quarry', w:12, text:'头顶传来碎石的响动，崖壁似乎要塌！', choices:[
      { label:'躲开', time:10 },
      { label:'赌一把冲过去', dmg:12, items:{ ironore:1 }, chance:0.5 },
  ]},
  { id:'re_flood', scene:'river', w:10, cond:{ rain:1 }, text:'上游涨水，漂流物比平时多。', choices:[
      { label:'翻找漂流物', items:{ wood:2 }, chance:0.7, time:10 },
      { label:'远离河岸', noop:1 },
  ]},
  { id:'re_migration', scene:'grassland', w:10, text:'草原远处烟尘滚滚——兽群在迁徙！', choices:[
      { label:'趁机捡漏', items:{ hide:2, meat:2 }, chance:0.6, dmg:15 },
      { label:'远远观望', spirit:-3 },
  ]},
  { id:'re_sandstorm', scene:'desert', w:12, text:'天际黄沙翻涌，沙暴来了！', choices:[
      { label:'找沙丘避风', time:20 },
      { label:'顶着沙暴前进', dmg:10, items:{ fossil:1 }, chance:0.4, time:30 },
  ]},
  { id:'re_remains', scene:'desert', w:8, once:1, text:'你发现一具白骨，旁边有个破包裹。', choices:[
      { label:'搜刮包裹', items:{ coin:3 }, chance:0.5, dmg:8 },
      { label:'合十离开', spirit:2 },
  ]},
  { id:'re_remains2', scene:'cave', w:8, once:1, text:'洞深处靠墙坐着一具矿工的骸骨。', choices:[
      { label:'翻找遗物', items:{ coin:2 }, chance:0.5, dmg:8 },
      { label:'不打扰他', spirit:2 },
  ]},
  { id:'re_leak', scene:'camp', w:8, cond:{ rain:1, houseBelow:2 }, text:'雨下大了，屋顶开始漏雨。', choices:[
      { label:'补一补', items:{}, time:20, need:{ thatch:2 }, text2:'你用茅草堵住漏处。' },
      { label:'熬过去', spirit:-5 },
  ]},
  { id:'re_wind', scene:'peak', w:12, text:'山顶的风突然转猛，站都站不稳。', choices:[
      { label:'贴着岩壁走', time:15 },
      { label:'顶风前进', dmg:8, items:{ blackiron:1 }, chance:0.3, time:25 },
  ]},
  { id:'re_shark', scene:'sea', w:10, cond:{ zone:'sea' }, text:'水面下掠过一道巨大的黑影。', choices:[
      { label:'收网快撤', time:10 },
      { label:'跟它搏一搏', fight:'shark' },
  ]},
  { id:'re_pirates', scene:'sea', w:8, cond:{ zone:'sea', day:20 }, text:'一艘挂着黑帆的旗舰切进你的航线——甲板上站着的，正是盐镇悬赏的海盗头目！', choices:[
      { label:'调头逃跑', time:30 },
      { label:'迎战', fight:'pirateBoss' },
  ]},
  { id:'re_shrine', scene:'cave', w:4, once:1, text:'洞壁暗处，一扇被藤蔓掩埋的石龛微微发光，里面供着三件神物。', choices:[
      { label:'取走神物', relic:1 },
      { label:'不敢妄动', spirit:2 },
  ]},
  { id:'re_peddler', scene:'shore', w:5, once:1, cond:{ zone:'saltTown' }, text:'一个裹着破斗篷的神秘人拦住你："三十枚远古金币，换一件神物，换不换？"', choices:[
      { label:'成交', need:{ coin:30 }, relic:1 },
      { label:'摇头离开', noop:1 },
  ]},
];

// ---------- 天气 / 季节 ----------
const WEATHER = {
  sun:  { name:'晴', glyph:'☀', eff:1.0 },
  cloud:{ id:'cloud', name:'阴', glyph:'☁', eff:0.9 },
  rain: { name:'雨', glyph:'☂', eff:0.7 },
  fog:  { name:'雾', glyph:'≋', eff:1.0, travelMul:1.5 },
  storm:{ id:'storm', name:'雷暴', glyph:'⚡', eff:0.5, block:['quarry','peak','sea'] },
  snow: { name:'雪', glyph:'❄', eff:0.6 },
};
const SEASONS = [
  { name:'春', days:[1,15], gatherMul:1.1, desc:'万物复苏，采集+10%。' },
    { name:'夏', days:[16,30], thirstMul:1.3, heat:1, desc:'酷热，口渴加剧、海产丰富；穿太厚的衣服会中暑。' },
  { name:'秋', days:[31,45], desc:'天高气爽，远征的最佳季节。' },
  { name:'冬', days:[46,60], gatherMul:0.6, cold:1, desc:'严寒，野外需保暖，兽皮行情上涨。' },
];

// ---------- 限时活动：神弓（26.9.15 - 26.9.30） ----------
// 活动结束后按 DIVINE_BOW_EVENT.removeAfter 的清单把"制作相关"摘掉即可；
// 已经做出来的神弓、以及存在邮箱里的那把【不受影响】，会保留（含剩余耐久）。
const DIVINE_BOW_EVENT = { from: '26.9.15', to: '26.9.30', label: '限时制作 26.9.15-26.9.30' };

// ---------- 地图箭头（全景图百分比坐标，按最新成图构图校准） ----------
const MAP_ARROWS = {
  peak:     { x:25, y:14, label:'山顶' },   // 对准山峰上部；下移到 14% 是为了矮屏（手机横屏可视高度只有 378px）也能完整看到标签，不被顶边切
  cave:     { x:26, y:32, label:'山洞' },
  forest:   { x:42, y:44, label:'树林' },
  bamboo:   { x:19, y:66, label:'竹林' },   // 原来 x=7 太贴左边缘；右移到竹丛主体，并上抬一点和「采石场」错开
                                            // ⚠️ 别小于 19：热点标签左边也要放得下（x=15 时最左也滑不到、标签被裁）
  quarry:   { x:30, y:84, label:'采石场' },
  desert:   { x:60, y:44, label:'荒漠' },
  grassland:{ x:78, y:44, label:'草地' },
  river:    { x:34, y:60, label:'河畔' },
  camp:     { x:48, y:88, label:'营地' },
  farm:     { x:68, y:88, label:'耕地' },
  sea:      { x:82, y:64, label:'海域' },   // 原来 x=90 太贴右边缘：热点标签左右各占约 110px，x=90 时在最右也滑不到、
                                            // 标签必被裁掉（实测 2340 宽屏下差 85px）。挪到 82 让它完整可见。
  shore:    { x:76, y:30, label:'对岸' },
};

// ---------- 营地场景可点击热点（建造后才会显现；needBuild/needFurn 控制显隐；与建筑中心对齐） ----------
const CAMP_HOTSPOTS = [
  { id:'camp', x:30, y:60, glyph:'➤', label:'住处 · 营地升级' },
  { id:'sleep', x:30, y:73, glyph:'☾', label:'睡觉' },
  { id:'inv',  x:62, y:66, glyph:'➤', label:'储物箱 · 背包' },
  { id:'fire', x:52, y:81, glyph:'➤', label:'篝火 · 烹饪' },   // 跟篝火精灵对齐（精灵下移了）
  { id:'atlantis', x:80, y:28, glyph:'◈', label:'传送石 · 亚特兰蒂斯', needFlag:'ended_C' },
];

// 营地场景铺地上的建筑精灵位置（% 坐标，均为中心；宽度按背景宽度百分比）
const CAMP_BUILD_POS = {
  // ⚠️ y 越大表示越靠画面下方（越近），渲染时会按 y 排叠放次序 —— 见 ui.js renderCampBuildings
  // fire 原来 78：仓库(66)画在它后面，把篝火盖掉了一半。下移到 84，并且现在按深度排序（篝火在仓库前面）。
  house:[30,60], fire:[52,81], store:[62,66], wall:[14,62], dock:[84,38], farm:[68,80],
};

// ---------- 各场景可点击热点（point = 对应交互点 id，直接点击图片触发） ----------
const SCENE_HOTSPOTS = {
  forest: [
    { x:21, y:44, point:'forest_tree',   label:'砍伐' },   // 右移：别被左侧日志栏压住
    { x:30, y:28, point:'forest_hive',   label:'蜂巢' },
    { x:62, y:52, point:'forest_vine',   label:'藤蔓' },
    { x:74, y:76, point:'forest_mushroom', label:'蘑菇' },
    { x:50, y:82, point:'forest_herb',   label:'草药' },
    { x:84, y:50, point:'forest_hunt',   label:'兽径' },
    { x:36, y:66, point:'forest_resin',  label:'割脂' },
    { x:44, y:70, point:'forest_berry',  label:'野莓' },
  ],
  bamboo: [
    { x:20, y:50, point:'bamboo_cut',    label:'砍竹' },   // 右移：别被左侧日志栏压住
    { x:28, y:38, point:'bamboo_fiber',  label:'剖竹' },
    { x:36, y:74, point:'bamboo_shoot',  label:'竹笋' },
    { x:82, y:22, point:'bamboo_deep',   label:'竹影深处' },
  ],
  quarry: [
    { x:50, y:62, point:'quarry_stone',  label:'石堆' },
    { x:72, y:54, point:'quarry_flint',  label:'燧石层' },
    { x:80, y:62, point:'quarry_ironShallow', label:'铁矿露头' },
    { x:64, y:38, point:'quarry_deep',   label:'深层矿脉' },
    { x:22, y:72, point:'quarry_clay',   label:'黏土堆' },   // 右移：别被左侧日志栏压住
    { x:82, y:32, point:'quarry_pit',    label:'废矿坑' },
  ],
  desert: [
    { x:32, y:70, point:'desert_niter',  label:'硝石' },
    { x:56, y:66, point:'desert_sulfur', label:'硫磺' },
    { x:78, y:55, point:'desert_cactus', label:'仙人掌' },
    { x:46, y:82, point:'desert_fossil', label:'化石层' },
    { x:23, y:76, point:'desert_remains', label:'遗骸' },   // 右移：别被左侧日志栏压住
    { x:66, y:42, point:'desert_guard',  label:'白骨守卫' },
  ],
  river: [
    { x:48, y:50, point:'river_water', label:'取水' },
    { x:53, y:62, point:'river_fish',  label:'垂钓' },
    { x:64, y:44, point:'river_net',   label:'撒网' },
    { x:24, y:60, point:'river_reeds', label:'芦苇丛' },
    { x:20, y:74, point:'river_clay',  label:'黏土滩' },   // 右移：别被左侧日志栏压住
    { x:24, y:86, point:'river_drift', label:'漂流物' },   // 右移：别被左侧日志栏压住
    { x:86, y:64, point:'river_stones', label:'找石头' },
  ],
  farm: [
    { x:62, y:58, point:'farm_veg',   label:'野菜' },
    { x:45, y:72, point:'farm_plant', label:'苗床' },
  ],
  grassland: [
    { x:74, y:62, point:'grass_wool',  label:'剪羊毛' },
    { x:52, y:42, point:'grass_hunt',  label:'狩猎' },
    { x:30, y:72, point:'grass_herb',  label:'草药' },
    { x:82, y:32, point:'grass_horse', label:'野马' },
    { x:40, y:58, point:'grass_trap',  label:'布陷阱' },
    { x:58, y:74, point:'grass_hay',   label:'干草' },
    { x:20, y:62, point:'grass_wolfden', label:'狼穴' },   // 右移：别被左侧日志栏压住
  ],
  cave: [
    { x:34, y:50, point:'cave_iron',   label:'洞壁铁矿' },
    { x:60, y:38, point:'cave_bats',   label:'蝙蝠粪' },
    { x:70, y:60, point:'cave_moss',   label:'发光苔藓' },
    { x:56, y:72, point:'cave_deep',   label:'深处矿脉' },
    { x:76, y:76, point:'cave_queen',  label:'蛛巢' },
    { x:28, y:72, point:'cave_guard',  label:'黑暗兽吼' },
    { x:44, y:46, point:'cave_slate',  label:'遗迹石板' },
  ],
  peak: [
    { x:56, y:66, point:'peak_blackiron', label:'玄铁矿' },
    { x:66, y:74, point:'peak_mithril',   label:'秘银矿' },
    { x:30, y:56, point:'peak_lotus',     label:'雪莲' },
    { x:62, y:42, point:'peak_eagle',     label:'鹰巢' },
    { x:45, y:28, point:'peak_altar',     label:'祭坛' },
    { x:23, y:62, point:'peak_hunt',      label:'雪线兽迹' },   // 右移：别被左侧日志栏压住
    { x:19, y:40, point:'peak_slate',     label:'石碑残迹' },   // 右移：别被左侧日志栏压住
  ],
};

// ---------- 结局 ----------
// 官方兑换码（纯前端：每人本地用一次；你手动放出这些码，以后可随时加）
const REDEEM_CODES = {
  'GUYU2026': { soul: 50 },
  'QQ1014679931': { item: 'namecard', qty: 1 },
  'NEICEWANJIA': { soul: 300 },   // 内部秘密码：300魂点（不展示在活动页）
  'HAPPY1': { item: 'namecard', qty: 1 },
  'HAPPY2': { soul: 80 },
  'CORE4': { item: 'deepCore', qty: 4 },   // 神殿核心补偿：受"守卫怪顶掉一次性点位"影响的玩家，可领 4 块深殿核心
  // 送礼用的码（只在代码里，不写进活动页/公告，玩家不会自己看到）
  'HAPPY9': { relic: 'vampire' },        // 吸血宝石
  'HAPPY8': { relic: 'dodge' },          // 闪避护符
  'HAPPY7': { relic: 'satchel' },        // 食之包
  'HAPPY6': { relic: 'bloodvest' },      // 血色背心
  'HAPPY5': { relic: 'atlantisSeed' },   // 亚特兰蒂斯之种
  'RESOURCE1': { item: 'coin', qty: 10 },   // 10 枚古金币
};

// ---------- 内置更新公告（会以邮件形式发到游戏里）----------
// approved 必须由作者点头改成 true 才会发；false 时代码里留着但玩家看不到。
// 玩家对外版本号：当前宣传是 v1.04，本次打包为 v1.05。
const PATCH_NOTES = [
  {
    version: 'v1.08',
    date: '2026-09-18',
    approved: true,
    title: 'v1.08 更新公告（技能树 + 存档加固 + 开头分镜）',
    body: [
      '【大更新 · 技能树】',
      '· 技能从"点一下升一级"改成技能树：点技能卡片展开整棵树——中间一条主干（Lv1→7），专项技能挂在两侧，互斥的一对分居左右、中间一条红虚线。',
      '· 主干每升一级，从几个方向里选一个：采集是「产出 +10% / 耗时 -10% / 体力 -10%」，制造是「耗时 -10% / 10% 概率返还材料 / 10% 概率多产 1 件」，战斗是「攻击 +1 / 防御 +0.5 / 暴击率 +5%」。同一个方向可以重复选，效果叠加。',
      '· 每个技能都配了图标，按钮上写清了要花多少经验；经验不够时会写明"现有多少、还差多少"，不再让你猜为什么点不动。',
      '· 学错了能忘：「遗忘」只作用于最末端的技能，返还一半经验——忘掉最外层，里面那层就能接着忘。',
      '· 战斗专项：阔刃横扫（双手重武器，横扫 1.0→1.4 倍伤害、CD 18/16/14 秒）+ 处决；嗜血狂刀（双持两把单手，伤害的 30~60% 回血）+ 复仇；盾墙 ⇄ 疾风连击；狂战 ⇄ 铁壁；弓术；枪械精通。',
      '· 采集专项：伐木专精 ⇄ 自然感知；精细采集 ⇄ 粗放采集。制造专项：修补匠（最高 75% 修补不耗材料）；流水线 ⇄ 精工细作。',
      '· 技能经验不跨局，但《历代遗章》新增「采集 / 制造 / 战斗心得」：买了以后每局开局直接送 30 / 60 / 100 点对应经验。',
      '· ⚠️ 老玩家注意：旧技能等级会折算成经验返还（按新曲线升到同一等级所需经验的 2 倍），等级回到 0 级让你自己重新加点——折算给得比原来多，不会吃亏；读档时会有一条提示。',
      '',
      '【存档更稳了】',
      '· 存档仍然同时写「本地存储 + cookie」两份，读取时取时间最新的那一份——平台清缓存只清掉一份也能恢复回来。',
      '· 还是那句老话：隔一段时间去「菜单 → 备份 · 读档 → 导出存档码」复制一串存好，这是最稳的保命手段。',
      '',
      '【新存档开头有分镜了】',
      '· 开新存档时会先播 5 格黑白木刻分镜：听说亚克兰蒂斯的传说 → 出海 → 特大风暴 → 沉没 → 醒来在荒岛。点画面 / 空格翻页，也能「跳过」，只在开新存档时播一次。',
      '',
      '【结局 & 山顶】',
      '· 达成结局后会弹出「结局达成」，可以直接「观看结算画面」，也可以先继续玩——右下角会留一个「结算 · 结局「XX」」按钮随时回看。',
      '· 材料齐了去山顶会有指路；条件不满足（瞭望台不够 / 雷暴 / 保暖不够 / 体力不够）时，点大地图箭头会当场在屏幕中央说清原因。',
      '',
      '【限定 · 神弓】',
      '· 神弓耐久归零不再消失：只自动卸下，回营地用磨刀石修补（秘银锭 ×1）就能接着用。',
      '· 制造列表里神弓配方挪到最下面一格。',
      '',
      '【牧场 · 鸡舍】',
      '· 鸡舍可以扩建两次：3 → 4 只（木板×8、铁钉×10、茅草×20）、4 → 5 只（木板×16、铁钉×20、茅草×40、铁件×3）。',
      '',
      '【界面与手感】',
      '· 主界面按钮缩小约 1/3，图鉴与每日签到收进「设置」面板。',
      '· 选角色界面的立绘改成小头像 + 说明，一屏能看完所有身份。',
      '· 弹窗刚打开的头 0.35 秒不接收点击（防止"单击直接睡俩小时"这种误触）。',
      '· 赶路遇袭不能再关闭了；山洞里一直可能遇到洞穴熊（洞外拦路的熊仍是第 30 天起）。',
      '',
      '喜欢的话麻烦给个好评吧——个人作者一个人在做，这对我真的很重要！',
      '',
      '有任何问题欢迎进群反馈：QQ 群 1014679931。',
    ],
  },
  {
    version: 'v1.07',
    date: '2026-09-17',
    approved: true,
    title: 'v1.07 更新公告',
    body: [
      '【重要 · 存档安全再加一层】',
      '· 存档现在会同时写两份：浏览器本地存储 + cookie。哪份新就用哪份 —— 万一平台清缓存只清掉了本地存储，游戏会自动从 cookie 把进度和魂点恢复回来，并写回本地。',
      '· 配合上一版的"启动异常自动进安全模式"（连续两次打不开会自动提示，让你先导出存档码、或用上一次的备份档继续）。',
      '· 还是那句话：过一段时间就去「菜单 → 备份 · 读档 → 导出存档码」复制一串存好，这是最稳的保命手段。',
      '',
      '【新增：每日签到】',
      '· 每天可领 魂点 ×30 + 备份点 ×2。主界面和游戏内菜单都有入口，领完按钮会变成"明天再来"。',
      '',
      '【新增：养蜂人 + 专属家具「蜂箱」】',
      '· 养蜂人：树林取蜜必定成功、不会被蛰，还额外多产（30% 多 1 份、10% 再多 2 份）；开局带 蜂蜜 ×2、茅草 ×4。',
      '· 蜂箱（养蜂人专属，占 1 个家具位）：每天清晨自动收获 1 份蜂蜜。',
      '',
      '【新增：人物立绘「彩绘卡面」皮肤】',
      '· 新增皮肤包「彩绘卡面」：渔夫 / 樵夫 / 药师 / 铁匠学徒 / 养蜂人 换成整套全彩立绘（灵灰保持原样），在「设置 → 皮肤包」里一键切换。',
      '· 默认那套黑白立绘里也补上了「养蜂人」。',
      '',
      '【新增：邮箱「攻略」页】',
      '· 邮箱多了「攻略」标签：第二章传送门、深殿核心、蜂蜜/淡水/干草、雪莲与秘银、图纸去哪儿买、魂点怎么来、夜袭与赶路遇袭、工具耐久……群里问得最多的几条都在里面。',
      '',
      '【体验修复】',
      '· 交易界面顶部现在显示"你身上：贝壳币 ×N · 金币 ×M"（老潮、盐镇集市、黑市、海底交易机都有）。',
      '· 打开弹窗那一下会顺手点到弹窗里第一个按钮（有人反映"单击直接睡俩小时"）——现在弹窗刚打开的头 0.35 秒不接收点击。',
      '· 一次性点位不关弹窗连点也能重复领（救小海、荒漠白骨包裹）——修好了。',
      '· 水壶升级成滤雨器之后水壶"消失"、口渴 -20% 失效、属性面板显示"未装备水壶"——现在滤雨器算作水壶的升级，效果保留；没建水壶时也不再显示那行看不懂的字。',
      '· 图纸不再占背包格子（背包满了也收得下）。',
      '· 石板第三关"点灯"：以前"点亮"画成纯黑（看着像全黑），现在点亮是暖光 + ✦，并且实时显示"已点亮 N/9"。',
      '· 海域的「沉船湾」、对岸的「盐镇 / 遗迹」点不动（界面层级把点击挡住了）——修好了。',
      '',
      '喜欢的话麻烦给个好评吧——个人作者一个人在做，这对我真的很重要！',
      '',
      '有任何问题欢迎进群反馈：QQ 群 1014679931。',
    ],
  },
  {
    // ⚠️ version 是"发没发过"的键：v1.06 已经发过，所以这版用 v1.06b，保证老玩家也能收到这条。
    version: 'v1.06b',
    date: '2026-09-15',
    approved: true,
    title: 'v1.06b 更新公告（存档安全提醒 + 一批修复）',
    body: [
      '【重要 · 先说存档安全】',
      '· 这个游戏的存档只存在你自己的手机 / 浏览器本地，不在服务器上——换手机、换浏览器、清缓存都不会自动跟过去。',
      '· 手机浏览器 / 微信 / QQ 内置浏览器偶尔会因为内存吃紧，把整个页面回收掉（表现就是"游戏突然退出去"）。这种小概率意外一旦发生，本地存档可能来不及写完。',
      '· 所以强烈建议：过一段时间就去「菜单 → 备份 · 读档 → 导出存档码」复制一串码存好（微信收藏、备忘录都行）。真出了意外，把码粘回来就能恢复进度。',
      '· 这一版已经把图片整体瘦身（省掉约三成内存），并且加上了"启动异常自动进安全模式"：万一连续两次打不开，会自己弹出提示，让你先导出存档码、或用上一次的备份存档继续。',
      '',
      '【本版修复与调整】',
      '· 存档加固：写完会读回来校验；"另一个标签页有更新进度"时不再互相覆盖；切后台/锁屏/关页面都会立刻存一次；每 20 秒兜底自动存。',
      '· 双持两把近战武器时战斗会崩（血条不动、武器不掉耐久）——修好了：现在两把轮流出手、轮流掉耐久，日志里标出这一刀用的是哪把。',
      '· 远程武器以前永远不掉耐久（弓 / 手枪 / 神弓都不掉）——修好了。顺带调整了数值：神弓耐久 50 → 120，手枪 120 → 50。',
      '· 蛛巢这类"点进去只弹讨伐确认"的地点，以前撤退也会白扣体力、还占掉当日次数——现在确认了才扣。',
      '· 一次性地点能重复刷：救小满能救四次、荒漠白骨包裹能无限刷金币——都修好了，老存档也会自动收口。',
      '· 新手引导点「跳过」没反应——修好了（同一个毛病还顺带修了"领完邮件不刷新""兑换码不切页"）。',
      '· 工具用坏后还挂在工具栏里、看不到耐久——现在工具栏和背包直接写耐久数字，坏了自动换背包里的备用。',
      '· 洞穴熊太强：改成第 30 天起才会出现（拦路和洞里狩猎都算）。',
      '· 珍珠之心的源能水晶爆率 30% → 50%。',
      '· 睡觉得到统一：安稳睡觉一律 8 小时（床的好坏只体现在体力/精神恢复上）；睡觉与小睡那两张动画图发灰、看不清，也重新调好了。',
      '· 营地篝火被仓库挡住——现在按远近叠放，篝火在仓库前面，位置也往下挪了一点。',
      '· 大地图尺寸规则统一：宽度 = 屏幕宽度（手机 / 平板 / 电脑都一样），左右都能看全，多出来的高度上下拖动看；进地图会自动对准你当前所在的位置。',
      '· 背景音乐太吓人：原来的音是"每个音都重新随机抽"，听着像刮擦声；现在改成五声音阶的级进旋律 + 慢起音，柔和很多。',
      '· 手机端体验：底栏加高到 30px、可点区域变大；全屏模糊特效在手机上关掉（省电省内存）；左侧日志栏不再压住场景热点（热点现在画在它上面，永远看得见、点得到）。',
      '· 海域的「沉船湾」、对岸的「盐镇 / 遗迹」这些分区按钮点不动——修好了（界面层级把点击挡住了）。',
      '',
      '【一句心里话】',
      '这是个人作者做的第一个游戏，作者每天都在努力更新。觉得还不错的话，麻烦给个好评吧——非常感谢，这对我非常重要！',
      '',
      '有任何问题欢迎进群反馈：QQ 群 1014679931。',
    ],
  },
  {
    version: 'v1.06',
    date: '2026-09-13',
    approved: true,
    title: 'v1.06 更新公告',
    body: [
      '【双持重做：轮流挥砍 + 攻速对称】',
      '· 双持不再取两把平均伤害，而是轮流出手：这一刀用哪把就按哪把算，也扣哪把耐久，日志会标出〔所用武器〕。',
      '· 攻速不再只看主手：以前主手塞把快匕首、副手放高攻武器就能近乎无敌（互换主副手差 150%）。现在两把按攻击力加权平均，主副手完全对称。',
      '',
      '【新增：横扫（双手重武器专属）】',
      '· 装备铁大剑这类双手重武器时，战斗里多出「横扫」：对全部敌人各造成 1 倍伤害，命中略降，冷却 20 个单位时间（按出手次数扣）。',
      '',
      '【多目标战斗：敌人开始有意图了】',
      '· 当场上活着的敌人 ≥2 只时，敌人每回合掷一次意图（单挑完全不触发）：',
      '  蓄力 20%：本回合不出手，下一击双倍；掩护 20%：不出手，全体友方减伤 30%；猛击 30%：攻击 ×1.3 但自身防御归零。',
      '· 每只怪的血条后会标出它下回合要干什么，"先打谁"终于有依据：打断蓄力、先清掩护、趁猛击破绽。',
      '',
      '【图标与皮肤】',
      '· 补齐 19 个缺失的物品图标：源能手枪、源能子弹、破损的源能手枪、深殿核心、亚特兰蒂斯核心、源能晶石、兽角吊坠，以及 7 张图纸和 5 件神物。以前这些在背包里只能显示一个汉字（比如"枪"）。',
      '· 皮肤包真的能换图标了：「深海琥珀」皮肤，目前仅仅作为功能尝试。',
      '· 睡觉有动画了：小睡是靠着石头打盹，整觉是蜷在睡袋里、旁边一堆将熄的篝火；画面会缓慢呼吸起伏，头顶还会飘出 z。守夜（清醒）不播放。',
      '',
      '【界面】',
      '· 生命条 / 体力条改成淡米红与淡米黄，比原来的纯白/灰更好认，两套皮肤下都生效。',
      '· 工具栏能看到工具图标了：以前槽位里只显示一个汉字，现在是物品图标 + 名字 + 耐久条。',
      '· 营地面板底部重复的"声音"开关删掉了（设置里已经有音乐/音效/环境音三个独立开关）。',
      '· 鸡舍 / 羊圈的按钮文字看不见——修好了。原因是深色卡片里的浅底按钮继承了父级的浅色字，变成"浅底浅字"，现在按钮自带前景色。',
      '· 右下角按钮不再互相压住：窄屏下"与老潮交易"会和"休息"栏重叠 23px，现在两者排成一列，结构上不可能重叠。',
      '· 日志栏展开按钮挪到「返回地图」右侧、高度与它一致（以前悬在画面正中间，像穿帮）。',
      '· 竹林·竹影深处热点移到画面右上角（以前在正中偏右，容易和别的热点挤在一起）。',
      '',
      '【平衡】',
      '· 金价略微削弱：山洞·深处矿脉的门槛提到镐 tier3（钢镐），每日 1 次，耗时/体力略增；收购价 80 → 55。',
      '· 石板改成只能捡、不能买卖：以前老潮、盐镇情报贩子、黑市都收石板（300~350），总有玩家跑到山顶捡到石板顺手就卖了，结果解谜材料没了。现在没人肯收，道具说明也写清楚了。',
      '',
      '有任何问题欢迎进群反馈：QQ 群 1014679931。',
    ],
  },
  {
    version: 'v1.05',
    date: '2026-09-13',
    approved: true,
    title: 'v1.05 更新公告',
    body: [
      '【界面手感】',
      '· 底部按钮换成了棱角分明的黑白立体样式，点下去会沉一下，并伴一声清脆的咔哒声。',
      '· 新增「设置」：音乐 / 音效 / 环境音分开开关；日志栏可设为常驻、3 秒没新日志自动淡出、或直接隐藏。',
      '· 皮肤包管理入口已放好（敬请期待）。',
      '· 主界面也打包成了菜单：设置、图鉴都能直接在标题页打开。',
      '· 图鉴改成账号级：历代存档解锁过的内容都会记住，不开局也能在主界面查看。',
      '',
      '【大地图】',
      '· 地图与场景改成铺满整个画面，左右不留黑边；多余部分上下拖动查看。',
      '· 滑出画面的热点会整条隐藏，拖回来才出现；从场景返回地图会自动对准你所在的地点。',
      '· 第一章大地图也会显示当前天气。',
      '',
      '【战斗与难度】',
      '· 出手改成「时间追赶」：攻速 = 出手频率。你点一次算你出手一次，敌人按（敌速 ÷ 我速）攒出手次数——你 6 打它 7：前几轮它先出手，攒满两次的那一轮它打你两下，第二下与你这一击同时结算（你这一下照样打得出去）。攻速越高，对手还手次数越少。',
      '· 防御效率按难度区分：简单 100% / 普通 90% / 困难 80% / 传奇 70%。',
      '· 群袭（狼、海盗）有 50% 概率一次来两只；触手哨兵必定两只。',
      '· 沉没之王的「穿透」实装：无视你一半防御。',
      '',
      '【生存与平衡】',
      '· 夏天穿太厚会中暑（每小时掉血），冬天没保暖照样挨冻。',
      '· 潜水服保暖改为 +2；工具每高一级采集快 20%；渔网造价与耐久调整。',
      '· 夜袭改为「打过第一次之后才会有随机夜袭」，强度随时间上涨，第 50 天到顶 5 匹狼。',
      '· 草药膏、止血绷带、大煎蛋、熏鱼熏肉、精神恢复、河畔撒网等一批数值调整。',
      '',
      '【邮箱】',
      '· 更新公告以后会直接发到游戏邮箱，不用再翻论坛。',
      '',
      '【重要修复】',
      '· 修复：死亡后回标题再"继续上次游戏"，会导致结局按钮全部消失（连累时间流逝与自动存档也停摆）。现在读档 / 从备份继续 / 结局界面点「留在岛上」都会自动清掉本局结算状态，魂点不会重复结算。',
      '· 修复：山顶祭坛拿过遗物后热点消失，玩家找不到结局 C 的入口。现在凑齐"遗物+石板×3+龙骨"时，祭坛热点会重新亮起并直接给出仪式选项。',
      '· 存档瘦身：以前存档会把整局日志全存进去（一天天攒到 4800 多条 / 378KB，存档码 940KB），现在只留最近 200 条。同一份存档 706KB → 58KB，也降低了占满浏览器存储导致丢档的风险。',
      '· 修复：随机事件的触发条件以前用错了判断（写成"满足任意一条"），导致"雾天也漏雨""住了木屋/砖瓦房还漏雨"、河畔非雨天也会涨水。现在条件必须全部满足：漏雨只在雨天/雷暴且住处低于 2 级时出现。',
    ].join('\n'),
  },
];

const ENDINGS = {
  A: { name:'归乡', cond:'远洋船 + 海图 + 补给箱×3', text:'日出时分，你升起帆。孤岛在身后缩成一个小小的黑点。', img:'assets/img/endings/ending_a.png', lines:[    '你曾以为会死在岛上，可你造出了船。',
    '帆吃得满满了，风从故乡的方向吹来。',
    '回头时，那座困住你一百多天的岛，已经小得像一枚邮票。',
    '—— 你回家了。',
  ] },
  B: { name:'岛主', cond:'击败海盗头目 + 盐镇声望2 + 石墙', text:'篝火从你的营地连到盐镇。人们说，岛上有主了。', img:'assets/img/endings/ending_b.png', lines:[
    '你赶走了海盗，修起了石墙，建起了自己的家。',
    '盐镇的人不再怕你，他们开始叫你"岛主"。',
    '海风里，篝火次第亮起，这条岛从此有了人烟。',
    '—— 这座岛，是你的了。',
  ] },
  C: { name:'秘辛', cond:'遗物 + 石板×3 + 龙骨，于山顶祭坛', text:'祭坛亮起。你终于读懂了这座岛：它是沉没文明最后的哨站。', img:'assets/img/endings/ending_c.png', lines:[
    '三块石板拼齐，龙骨归位，山顶的祭坛轰然点亮。',
    '你读懂了那些刻了一千年的文字：这里曾是文明的灯塔，也是文明最后的墓。',
    '你把这段往事深深记下——总有人，要知道这座岛的故事。',
    '—— 你成了岛的记忆。',
  ] },
  D: { name:'归途之外', cond:'死亡', text:'海还在那里，日记写到了最后一页。', img:'assets/img/endings/ending_d.png', lines:[
    '海浪一遍遍拍着岸，像什么都没发生过。',
    '你把日记合上，字迹停在了最后一页。',
    '可没有人能抹去，你曾在这座岛上，拼命活过的每一天。',
    '—— 日记写完了，但故事还很长。',
  ] },
  S: { name:'重燃文明', cond:'击败「沉没之王」，重启亚特兰蒂斯的灯塔', text:'灯塔亮起，沉没的文明重新呼吸。', img:'assets/img/endings/ending_s.png', lines:[
    '沉没之王倒下，亚特兰蒂斯的灯塔重新点亮。',
    '光穿透深海，一路照回了海面。',
    '你成了这个失落文明的续章。',
    '—— 文明的灯火，重新亮起。',
  ] },
  S2: { name:'深海长眠', cond:'击败「沉没之王」后，选择封存灯塔', text:'灯塔始终没有亮起。你让这座城，重新睡了过去。', img:'assets/img/endings/ending_s2.png', lines:[
    '你把最后一枚符文按灭，合上传送石。',
    '沉没的城重新沉入黑暗，安静得像从未来过。',
    '有些文明，最好的归宿是安眠。',
    '—— 深海长眠。',
  ] },
};

// ---------- 局外成长：历代遗章（传承魂点永久加成） ----------
// ---------- 技能树（作者 2026-09-17 二次定稿；分批实现，B1 = 框架 + 主干 + 采集/制造分支） ----------
// 主干：等级 0→SKILL_TRUNK_MAX，每升一级从 trunk 里**选一个**选项（可重复叠加，记在 S.skillPicks）。
// 分支节点：need=主干等级门槛、needNode=前置节点、mutex=互斥节点、max=最高等级、cost[级]。
// ⚠️ 效果文案写在 desc 里给玩家看，真正的数值钩子在 game.js 的 skillFx* 系列函数里按 id 查。
const SKILL_TRUNK_MAX = 7;
const SKILL_TRUNK_COST = [12, 28, 50, 80, 120, 170, 240];   // 0→1、1→2 … 6→7
const SKILL_TREES = {
  gather: {
    name: '采集', glyph: '⛏', expName: '采集经验',
    trunk: [
      { id:'yield', name:'熟手', icon:'g_yield', desc:'采集 / 捕捞产出 +10%' },
      { id:'speed', name:'迅捷', icon:'g_speed', desc:'采集 / 钓鱼 / 砍伐耗时 -10%' },
      { id:'stam',  name:'耐劳', icon:'g_stam',  desc:'采集体力消耗 -10%' },
    ],
    nodes: [
      { id:'g_wood',   name:'伐木专精', icon:'g_wood', need:2, side:'r', max:2, cost:[30,70], mutex:'g_nature',
        desc:['砍树额外 +0.5 木材（攒够 1 份就给）','砍树额外 +1 木材'] },
      { id:'g_nature', name:'自然感知', icon:'g_nature', need:2, side:'l', max:2, cost:[30,70], mutex:'g_wood',
        desc:['遇到美人松的概率 +7%','再 +7%（合计 +14%）'] },
      { id:'g_fine',   name:'精细采集', icon:'g_fine', need:4, side:'r', max:1, cost:[60], mutex:'g_rough',
        desc:['单点产出 +20%，但体力消耗 +15%'] },
      { id:'g_rough',  name:'粗放采集', icon:'g_rough', need:4, side:'l', max:2, cost:[30,70], mutex:'g_fine',
        desc:['体力消耗 -30%，产出 -10%','体力消耗 -40%，产出 -10%'] },
    ],
  },
  craft: {
    name: '制造', glyph: '🔨', expName: '制造经验',
    trunk: [
      { id:'speed',  name:'熟手', icon:'c_speed',  desc:'制造耗时 -10%' },
      { id:'refund', name:'精算', icon:'c_refund', desc:'每次制作 10% 概率返还材料' },
      { id:'extra',  name:'巧手', icon:'c_extra',  desc:'每次制作 10% 概率多产 1 件' },
    ],
    nodes: [
      { id:'c_patch',  name:'修补匠', icon:'c_patch', need:3, side:'r', max:3, cost:[30,70,130],
        desc:['修补 25% 概率不消耗材料','50% 概率不消耗材料','75% 概率不消耗材料'] },
      { id:'c_line',   name:'流水线', icon:'c_line', need:4, side:'r', max:1, cost:[60], mutex:'c_finework',
        desc:['耗材料 -50%，但成品耐久 -20%'] },
      { id:'c_finework', name:'精工细作', icon:'c_finework', need:4, side:'l', max:1, cost:[60], mutex:'c_line',
        desc:['成品耐久 +30%，但耗材料 +30%'] },
    ],
  },
  combat: {
    name: '战斗', glyph: '⚔', expName: '战斗经验',
    trunk: [
      { id:'atk',  name:'攻',   icon:'k_atk',  desc:'攻击 +1' },
      { id:'def',  name:'防',   icon:'k_def',  desc:'防御 +0.5' },
      { id:'crit', name:'暴击', icon:'k_crit', desc:'暴击率（会心一击率）+5%' },
    ],
    // B2 第一批：横扫（时间制）/ 处决、嗜血狂刀 / 复仇 —— 两两成对互斥
    // 攻速口径：每 100 时间单位出手「攻速」次；横扫 CD 按同一套时间单位算（基础 20 秒）
    nodes: [
      { id:'f_sweep', name:'阔刃横扫', icon:'k_sweep', need:3, side:'r', max:3, cost:[30,70,130], mutex:'f_vamp',
        req:'双手重武器',
        desc:['横扫 1.0 倍伤害 · CD 18 秒（需双手重武器）','横扫 1.2 倍伤害 · CD 16 秒','横扫 1.4 倍伤害 · CD 14 秒'] },
      { id:'f_exec', name:'处决', icon:'k_exec', need:3, needNode:'f_sweep', side:'r', max:3, cost:[30,70,130],
        desc:['敌人生命 <20% 时，你的伤害 +50%','敌人生命 <25% 时，你的伤害 +50%','敌人生命 <30% 时，你的伤害 +50%'] },
      { id:'f_vamp', name:'嗜血狂刀', icon:'k_vamp', need:3, side:'l', max:4, cost:[30,70,130,190], mutex:'f_sweep',
        req:'双持两把单手',
        desc:['造成伤害的 30% 回血（需双持两把单手）','造成伤害的 40% 回血','造成伤害的 50% 回血','造成伤害的 60% 回血'] },
      { id:'f_revenge', name:'复仇', icon:'k_revenge', need:3, needNode:'f_vamp', side:'l', max:3, cost:[30,70,130],
        desc:['每被打一次，下一次攻击 +20%','下一次攻击 +30%','下一次攻击 +40%'] },
      { id:'f_shield', name:'盾墙', icon:'k_shield', need:4, side:'l', max:3, cost:[30,70,130], mutex:'f_swift',
        req:'盾',
        desc:['格挡率 +15% · 盾耐久消耗 -20%（需盾）','格挡率 +20% · 盾耐久消耗 -35%','格挡率 +25% · 盾耐久消耗 -50%'] },
      { id:'f_swift', name:'疾风连击', icon:'k_swift', need:4, side:'r', max:3, cost:[30,70,130], mutex:'f_shield',
        desc:['攻速 +1','攻速 +2','攻速 +3'] },
      { id:'f_rage', name:'狂战', icon:'k_rage', need:6, side:'l', max:3, cost:[40,90,160], mutex:'f_iron',
        desc:['攻击 +15%，但受到伤害 +10%','攻击 +22%，受到伤害 +10%','攻击 +30%，受到伤害 +10%'] },
      { id:'f_iron', name:'铁壁', icon:'k_iron', need:6, side:'r', max:3, cost:[40,90,160], mutex:'f_rage',
        desc:['受到伤害 -12%，但攻击 -5%','受到伤害 -18%，攻击 -5%','受到伤害 -25%，攻击 -5%'] },
      { id:'f_bow', name:'弓术', icon:'k_bow', need:3, side:'l', max:3, cost:[30,70,130],
        req:'弓',
        desc:['弓命中 +5% · 15% 不消耗箭矢','弓命中 +5% · 25% 不消耗箭矢','弓命中 +5% · 35% 不消耗箭矢'] },
      { id:'f_gun', name:'枪械精通', icon:'k_gun', need:3, side:'r', max:3, cost:[30,70,130],
        req:'手枪',
        desc:['手枪命中 +10% · 20% 不消耗源能子弹','手枪命中 +10% · 30% 不消耗子弹','手枪命中 +10% · 40% 不消耗子弹'] },
    ],
  },
};

const META_NODES = [
  { id:'vital', name:'强健体魄', desc:'体力上限 +5 / +10 / +15', max:3, cost:[20,60,140] },
  { id:'feast', name:'铁胃', desc:'饱食/水分消耗 -5% / -8% / -12%', max:3, cost:[20,60,140] },
  { id:'hands', name:'老练之手', desc:'制作/建造耗时 -5% / -10% / -15%', max:3, cost:[20,60,140] },
  { id:'stride', name:'神行', desc:'赶路耗时 -5% / -10% / -15%', max:3, cost:[20,60,140] },
  { id:'luck', name:'幸运', desc:'稀有物品掉落 +5% / +10% / +15%', max:3, cost:[30,80,180] },
  { id:'pack', name:'坚实背包', desc:'背包容量 +5 / +10 / +15 格', max:3, cost:[20,60,140] },
  { id:'whet', name:'磨刀石', desc:'攻击 +3% / +6% / +10%', max:3, cost:[30,80,180] },
  { id:'tough', name:'坚韧', desc:'受到的伤害 -5% / -10% / -15%', max:3, cost:[30,80,180] },
  { id:'kit', name:'家传补给', desc:'开局携带 火把/草药膏 ×1 / ×2 / ×3', max:3, cost:[40,100,220] },
  // 作者 2026-09-17：技能经验不跨局，但《历代遗章》可以给"各技能模块初始经验"
  { id:'startG', name:'采集心得', desc:'每局开局获得 采集经验 +30 / +60 / +100', max:3, cost:[30,80,180] },
  { id:'startC', name:'制造心得', desc:'每局开局获得 制造经验 +30 / +60 / +100', max:3, cost:[30,80,180] },
  { id:'startF', name:'战斗心得', desc:'每局开局获得 战斗经验 +30 / +60 / +100', max:3, cost:[30,80,180] },
];

// ---------- 神物（作战被动；远古金币换取 或 小概率奇遇获取） ----------
const RELICS = {
  vampire:   { name:'吸血宝石', glyph:'血', desc:'攻击时回复所造成伤害 10% 的生命。' },
  dodge:     { name:'闪避护符', glyph:'闪', desc:'有 10% 概率完全闪避敌人的攻击。' },
  satchel:   { name:'食之包',   glyph:'囊', desc:'饱食或水分低于 50 时，自动进食饮水。' },
  bloodvest: { name:'血色背心', glyph:'胄', desc:'生命上限 +20。' },
  atlantisSeed: { name:'亚特兰蒂斯之种', glyph:'种', desc:'携带此神物，水下无需装备氧气罩（氧气无限）。' },
};

// ---------- 工具/武器耐久上限（用到 0 会损坏） ----------
const DURA = {
  axeStone:25, axeIron:50, axeSteel:90,
  pickStone:25, pickIron:50, pickSteel:90, pickBlack:120,
  knifeStone:18, hoe:40, rod:40, net:10,
  club:8, spear:12, bow:70, divineBow:120, ironSword:70, steelSword:110, blackSword:160, ironDagger:40, ironGreatSword:140,
  coralBlade:90, sourceSpear:130, woodShield:40, ironShield:70, steelShield:110,
  shellAmulet:50, beastFang:50, pearlNeck:60, hornAmulet:70,
  diveSuit:50, diveSuit2:200, diveMask:100, pistol:50,
  grassArmor:40, leatherArmor:60, ironArmor:90, blackArmor:130, coralArmor:110, sourceArmor:150,
};

// 图鉴统计口径
const COLLECTION = { resources: Object.keys(ITEMS).filter(k=>ITEMS[k].cat==='mat'||ITEMS[k].cat==='special').length, monsters: Object.keys(ENEMIES).filter(k=>!ENEMIES[k].noDex).length, recipes: RECIPES.length };

// ---------- 成就（图鉴 · 品阶 紫/金/红，领取魂点） ----------
const ACHIEVEMENTS = {
  initCraft:  { name:'初次锻造',   glyph:'匠', tier:'紫', reward:20, desc:'累计制作 10 件物品。' },
  initGather: { name:'初次采集',   glyph:'采', tier:'紫', reward:20, desc:'累计采集/捕捞 30 次。' },
  initKill:   { name:'初次狩猎',   glyph:'狩', tier:'紫', reward:20, desc:'累计击杀 8 只野兽。' },
  firstNight: { name:'初夜',       glyph:'夜', tier:'紫', reward:20, desc:'在孤岛度过第 5 个夜晚。' },
  humanDraw:  { name:'人体描边大师',glyph:'描', tier:'紫', reward:20, desc:'连续 3 次攻击落空。' },
  bigPine:    { name:'好大一颗美人松啊', glyph:'松', tier:'紫', reward:20, desc:'连续两次砍树都遇上超大美人松。' },
  drawDragon: { name:'左边画个龙龙', glyph:'龙', tier:'金', reward:50, desc:'连续 4 次攻击落空。' },
  neverHurt:  { name:'我永远不会伤害你', glyph:'柔', tier:'红', reward:200, desc:'连续 6 次攻击落空。' },
  craftLv3:   { name:'熟能生巧',   glyph:'巧', tier:'金', reward:50, desc:'制造技能达到 3 级。' },
  gather50:   { name:'采集达人',   glyph:'勤', tier:'金', reward:50, desc:'累计采集/捕捞 50 次。' },
  bossFirst:  { name:'初战告捷',   glyph:'胜', tier:'金', reward:50, desc:'击败一个首领。' },
  stoneWall:  { name:'铜墙铁壁',   glyph:'垒', tier:'金', reward:50, desc:'营地围墙升到石墙。' },
  raftBuilt:  { name:'渡海之舟',   glyph:'舟', tier:'金', reward:50, desc:'造出木筏出海。' },
  allBoss:    { name:'万兽之王',   glyph:'王', tier:'红', reward:200, desc:'击败所有首领。' },
  endA:       { name:'归乡',       glyph:'归', tier:'金', reward:50, desc:'达成结局「归乡」。' },
  survive100: { name:'百战余生',   glyph:'生', tier:'金', reward:50, desc:'孤岛生存满 100 天。' },
  relicAll:   { name:'传世遗物',   glyph:'遗', tier:'红', reward:200, desc:'集齐所有神物。' },
  lighthouse:{ name:'重燃灯塔',   glyph:'灯', tier:'红', reward:200, desc:'重启失落文明，点亮亚特兰蒂斯。' },
  abyssal:    { name:'深潜者',     glyph:'潜', tier:'红', reward:200, desc:'深入亚特兰蒂斯最深处。' },
};

// ---------- 灵灰台词（身份为「灵灰」时，偶尔会在日志里冒出） ----------
const LINGHUI_LINES = [
  '灵灰甩了甩尾巴：今天也要加油哦～',
  '灵灰：海风把我头发都吹乱啦。',
  '灵灰趴在船边发呆，尾巴尖轻轻拍着水面。',
  '灵灰：要不要去海边捡贝壳？我认识好多好看的～',
  '灵灰打了个哈欠：好困……你困不困呀。',
  '灵灰望着星空：那颗星星好亮，像你的眼睛。',
  '灵灰：今天的鱼汤好香！我闻到啦！',
  '灵灰歪着头：你在做什么呀？让我看看～',
];
