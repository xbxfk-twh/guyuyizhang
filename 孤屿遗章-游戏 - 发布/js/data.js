/* ============================================================
   孤屿遗章 · 数据层
   全部游戏内容数据的唯一来源：物品 / 场景 / 配方 / 建筑 / 敌人 / 事件
   ============================================================ */

// ---------- 物品 ----------
// cat: mat原料 food食物 drink饮品 tool工具 weapon武器 armor防具 cloth衣物 med药品
//      special特殊 seed种子 bp图纸 currency货币
const ITEMS = {
  divinePack:{name:'神之包',cat:'special',glyph:'包',stack:1,packCapacity:15,remoteWarehouse:1,price:0,desc:'装备后背包+15格，外出可存入所在区域的仓库。'},
  divineSuperPack:{name:'神之超级大包',cat:'special',glyph:'包',stack:1,packCapacity:100,remoteWarehouse:1,price:0,desc:'装备后背包+100格，外出可存入所在区域的仓库。仅兑换码获取。'},
  reedPack:{name:'苇编背包',cat:'special',glyph:'包',stack:1,packCapacity:8,desc:'可装备背包，额外8格。'},
  leatherPack:{name:'皮革背包',cat:'special',glyph:'包',stack:1,packCapacity:16,desc:'可装备背包，额外16格。'},
  expeditionPack:{name:'远行背包',cat:'special',glyph:'包',stack:1,packCapacity:28,desc:'可装备背包，额外28格。'},
  nightmareSoul2:{name:'二阶噩梦魂魄',cat:'mat',glyph:'魂',stack:99,desc:'凝结的梦魇残魂，可在噩梦汲取仪中作出选择。'},
  nightmareSoul3:{name:'三阶噩梦魂魄',cat:'mat',glyph:'魂',stack:99,desc:'深渊中的梦魇残魂，可在噩梦汲取仪中作出选择。'},
  nightmareSoul:{name:'噩梦魂魄',cat:'mat',glyph:'魂',stack:99,desc:'一阶梦魇魂魄，可用解魂器分解，或在噩梦汲取仪中作出选择。'},
  // ---- 货币 ----
  beibi:  { name:'贝壳币', cat:'currency', glyph:'贝', desc:'海边捡来的贝壳，岛上的通用零钱。', stack:9999 },
  coin:   { name:'金币',   cat:'currency', glyph:'币', desc:'沉船与遗迹里的古金币；老潮那儿 50 贝壳换 1 枚，1 枚也能换回 30 贝壳。', stack:9999 },
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
  // 作者 2026-09-25：冬天水不够喝 → 河畔新增「积雪」采集点，积雪在篝火上「烧雪水」就是淡水。
  // 冬天河流取水会同时吃"季节 0.6 × 雪天 0.6"两重折扣（一次只剩 1 份），所以冬天必须有第二条水源。
  snow:    { name:'积雪', cat:'mat', glyph:'雪', desc:'冬季河畔每天可采3次，不受雨雪天气减产；营地篝火用积雪×2、木材×1烧成淡水×1。', stack:20, price:1 },
  herb:    { name:'草药', cat:'mat', glyph:'药', desc:'常见的草药，制药原料。', stack:20, price:4 },
  // ---- T2 原料 ----
  ironore:   { name:'铁矿石', cat:'mat', glyph:'铁', desc:'含铁的矿石，炼铁原料。', stack:20, price:15 },
  hide:      { name:'兽皮', cat:'mat', glyph:'皮', desc:'野兽的皮毛，制革缝衣。冬天行情好（卖价 +50%）。', stack:20, price:15, winter:1.5 },
  meat:      { name:'兽肉', cat:'food', glyph:'肉', food:12, water:2, spoil:24, desc:'新鲜的兽肉，最好尽快处理。', stack:20, price:8 },
  sinew:     { name:'兽筋', cat:'mat', glyph:'筋', desc:'剥取的兽筋，做弓弦。', stack:20, price:6 },
  wool:      { name:'羊毛', cat:'mat', glyph:'毛', desc:'羊群身上剪下的羊毛。', stack:20, price:10 },
  resin:     { name:'树脂', cat:'mat', glyph:'脂', desc:'松树的树脂，防水与引火。', stack:20, price:8 },
  honey:     { name:'蜂蜜', cat:'food', glyph:'蜜', food:15, water:1, sta:7, spoil:240, desc:'蜂巢里的野蜂蜜，甜而珍贵。', stack:20, price:35 },
  mushroom:  { name:'蘑菇', cat:'food', glyph:'菇', food:6, water:3, spoil:48, negChance:0.2, negPoison:1, poisonHours:6, desc:'雨天生长的林间野菇。生吃饱食+6、水分+3，但有20%概率中毒6小时；煮成汤就安全了。', stack:20, price:5 },
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
  goldore:   { name:'金矿石', cat:'mat', glyph:'金', desc:'闪着微光的金矿石；可在熔炉炼成金锭。', stack:20, price:55 },
  goldIngot: { name:'金锭', cat:'mat', glyph:'金', desc:'八份金矿石精炼成的沉甸甸金锭。鱼人愿意收下。', stack:20, price:440 },
  crystal:   { name:'水晶', cat:'mat', glyph:'晶', desc:'洞窟深处的水晶。', stack:20, price:120 },
  blackiron: { name:'玄铁矿', cat:'mat', glyph:'玄', desc:'山顶的黑色矿石，沉重而稀有。', stack:20, price:200 },
  mithril:   { name:'秘银矿', cat:'mat', glyph:'秘', desc:'雪线之下的银色矿石，极为稀有。', stack:20, price:250 },
  snowlotus: { name:'雪莲', cat:'mat', glyph:'莲', desc:'山顶雪线上的雪莲。', stack:20, price:250 },
  eaglefeather:{ id:'eaglefeather', name:'鹰羽', cat:'mat', glyph:'羽', desc:'鹰巢里的长羽。', stack:20, price:60 },
  pearl:     { name:'珍珠', cat:'special', glyph:'珠', desc:'蚌壳里的珍珠，商人抢着要。', stack:20, price:200 },
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
  basket: { name:'竹篓', cat:'tool', glyph:'篓', cap:10, packCapacity:10, desc:'装备到背包槽后容量+10格。', stack:1, price:25 },
  salt:   { name:'盐', cat:'special', glyph:'盐', desc:'晒制的海盐，可用于烹饪、腌肉和盐镇委托，杂货商也会收购。', stack:20, price:20 },
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
  // ---- 作者 2026-09-23 点名要的三道菜（萝卜炖肉 / 面包 / 蛋糕）----
  // 都是"让种田有奔头"的料理：萝卜和小麦本来只能生啃/卖钱，现在有正经去处。
  carrotStew:{ id:'carrotStew', name:'萝卜炖肉', cat:'food', glyph:'煲', food:52, water:10, heal:20, sta:10, spoil:24, desc:'萝卜吸饱了肉汁，比纯炖肉更养人。', stack:20, price:40 },
  bread:     { id:'bread',     name:'面包',     cat:'food', glyph:'包', food:34, water:2, heal:6, sta:6, spoil:240, desc:'面粉烤出来的主食，能存很久，出门带它最省心。', stack:20, price:26 },
  cake:      { id:'cake',      name:'蛋糕',     cat:'food', glyph:'糕', food:62, water:10, heal:15, spirit:12, sta:10, spoil:168, desc:'蛋、蜜、面粉一起烤的甜点——吃完心情都好了（精神 +12）。', stack:20, price:75 },
  // 作者 2026-09-25："改成小麦做成面粉，面粉再做其他东西吧"
  //   → 小麦不再是"直接扔进锅"，先磨成面粉（灶台），面包/蛋糕都用面粉。
  //     换算：面粉×2 = 小麦×3（所以面包的小麦成本一分没变）。
  flour:     { id:'flour',     name:'面粉',     cat:'mat', glyph:'粉', stack:20, price:6, desc:'小麦磨成的粉。面包、蛋糕都得先有它。' },
  honeyWater:{ id:'honeyWater', name:'蜂蜜水', cat:'drink', glyph:'蜜', food:10, water:15, heal:10, spirit:7, sta:7, spoil:24, desc:'甜润的蜂蜜水。', stack:20, price:20 },
  smokedFish:{ id:'smokedFish', name:'熏鱼', cat:'food', glyph:'熏', food:25, water:2, heal:5, spoil:84, desc:'烟熏过的鱼，能存七天。', stack:20, price:15 },
  // ---- 牧场与蛋料理 ----
  hay:      { id:'hay', name:'干草', cat:'mat', glyph:'草', desc:'晒干的茅草，羊的口粮（每只羊每天 1 份）。', stack:50, price:3 },
  egg:      { id:'egg', name:'鸡蛋', cat:'food', glyph:'蛋', food:8, water:2, spoil:84, desc:'母鸡下的蛋，能存一周；也能做成各种蛋料理。', stack:30, price:12 },
  friedEgg: { id:'friedEgg', name:'煎蛋', cat:'food', glyph:'煎', food:15, spoil:36, desc:'一个煎蛋：饱食 +15，能存三天。', stack:20, price:15 },
  bigOmelette:{ id:'bigOmelette', name:'大煎蛋', cat:'food', glyph:'卷', food:60, water:60, heal:10, spoil:120, desc:'五颗蛋摊成的一大张蛋卷：饱食+60、水分+60、生命+10，能存十天。', stack:20, price:60 },
  superEgg: { id:'superEgg', name:'超级大蛋', cat:'food', glyph:'宴', food:100, water:100, sta:100, heal:30, spoil:1188, desc:'十二颗蛋堆成的蛋宴：饱食/水分/体力全满，还回 30 生命，能存 99 天。', stack:10, price:200 },
  chick:    { id:'chick', name:'小鸡', cat:'special', glyph:'雏', desc:'外岛买来的小鸡。放进鸡舍，连喂 5 天小麦就长成母鸡。', stack:6, price:80 },
  smokedMeat:{ id:'smokedMeat', name:'熏肉', cat:'food', glyph:'腊', food:30, water:1, heal:8, spoil:168, desc:'烟熏过的肉。', stack:20, price:30 },
  saltedMeat:{ id:'saltedMeat', name:'腌肉', cat:'food', glyph:'腌', food:30, water:1, spoil:168, desc:'盐腌的肉，不易腐坏。', stack:20, price:25 },
  jerky:  { name:'肉干', cat:'food', glyph:'干', food:30, water:1, sta:6, spoil:720, desc:'彻底风干的肉，航海口粮。', stack:20, price:40 },
  mushroomSoup:{ id:'mushroomSoup', name:'蘑菇汤', cat:'food', glyph:'菇', food:20, water:10, heal:20, spoil:24, desc:'鲜美的蘑菇汤。', stack:20, price:12 },
  // ---- 工具（tool:{kind,tier}）----
  axeStone:{ id:'axeStone', name:'石斧', cat:'tool', glyph:'斧', tool:{kind:'axe',tier:1}, desc:'燧石斧，砍树的基本工具。', stack:1 },
  axeIron: { name:'铁斧', cat:'tool', glyph:'斧', tool:{kind:'axe',tier:2}, desc:'二级伐木工具；比石斧略增收获，可采需要铁斧的资源。', stack:1 },
  axeSteel:{ id:'axeSteel', name:'钢斧', cat:'tool', glyph:'斧', tool:{kind:'axe',tier:3}, desc:'钢斧，削木如泥。', stack:1 },
  pickStone:{ id:'pickStone', name:'石镐', cat:'tool', glyph:'镐', tool:{kind:'pick',tier:1}, desc:'石镐，能采浅层铁矿。', stack:1 },
  pickIron:{ id:'pickIron', name:'铁镐', cat:'tool', glyph:'镐', tool:{kind:'pick',tier:2}, desc:'铁镐，开采深层矿脉。', stack:1 },
  pickSteel:{ id:'pickSteel', name:'钢镐', cat:'tool', glyph:'镐', tool:{kind:'pick',tier:3}, desc:'钢镐，能凿开玄铁。', stack:1 },
  pickBlack:{ id:'pickBlack', name:'玄铁镐', cat:'tool', glyph:'镐', tool:{kind:'pick',tier:4}, desc:'玄铁镐，唯一能采秘银的工具。', stack:1 },
  knifeStone:{ id:'knifeStone', name:'石质匕首', cat:'weapon', glyph:'匕', atk:5, spd:13, dual:1, tool:{kind:'knife',tier:1}, desc:'磨利的石匕首，剥皮剖竹、也能近身划拉。', stack:1 },
  ironDagger:{ id:'ironDagger', name:'铁匕首', cat:'weapon', glyph:'匕', atk:7, spd:13, dual:1, tool:{kind:'knife',tier:2}, desc:'轻快的铁匕首，出手又快又狠。', stack:1 },
  steelDagger:{ id:'steelDagger', name:'钢匕首', cat:'weapon', glyph:'匕', atk:9, spd:13, dual:1, tool:{kind:'knife',tier:3}, desc:'钢制短刃，适合双持；与另一把匕首搭配可触发嗜血狂刀。', stack:1 },
  blackDagger:{ id:'blackDagger', name:'玄铁匕首', cat:'weapon', glyph:'匕', atk:11, spd:13, dual:1, tool:{kind:'knife',tier:4}, desc:'玄铁短刃，双匕首流派的进阶武器；可触发嗜血狂刀。', stack:1 },
  hoe:    { name:'锄头', cat:'tool', glyph:'锄', tool:{kind:'hoe',tier:1}, desc:'翻土的锄头（占工具栏）：在耕地可以「开垦新田」和给作物「松土」提前成熟。', stack:1 },
  rod:    { name:'鱼竿', cat:'tool', glyph:'竿', tool:{kind:'rod',tier:1}, desc:'竹制鱼竿。', stack:1 },
  net:    { name:'渔网', cat:'tool', glyph:'网', tool:{kind:'net',tier:1}, desc:'藤编渔网：河畔、近海、海底鱼群都能撒。河畔撒网后次日网点休整，鱼竿仍可垂钓。', stack:1 },
  trap:   { name:'陷阱', cat:'tool', glyph:'阱', desc:'木藤陷阱（消耗品）：在草地布下，次日再去草地有 50% 概率捕到羊羔。', stack:5 },
  lantern:{ name:'提灯', cat:'tool', glyph:'灯', desc:'装备在工具栏时，陆地移动与采集遇袭概率减半；每累计1小时消耗1耐久，海上和海底不生效。', stack:1, tool:{kind:'lantern',tier:1} },
  torch:  { name:'火把', cat:'tool', glyph:'炬', desc:'树脂火把，驱散黑暗。', stack:5 },
  tinder: { name:'火绒', cat:'tool', glyph:'绒', desc:'燧石与茅草做的火绒。', stack:5 },
  spyglass:{ id:'spyglass', name:'望远镜', cat:'tool', glyph:'镜', desc:'水晶镜片，瞭望台三级的关键。', stack:1 },
  // ---- 武器 ----
  club:   { name:'木棒', cat:'weapon', glyph:'棒', atk:5, spd:11, desc:'随手捡的木棒。', stack:1 },
  spear:  { name:'石矛', cat:'weapon', glyph:'矛', atk:6, spd:12, throw:1, desc:'燧石矛，可投掷一次。', stack:1 },
  ironSword:{ id:'ironSword', name:'铁剑', cat:'weapon', glyph:'剑', atk:11, spd:10, desc:'锻打的铁剑。', stack:1 },
  steelSword:{ id:'steelSword', name:'钢剑', cat:'weapon', glyph:'剑', atk:15, spd:10, desc:'百炼的钢剑。', stack:1 },
  blackSword:{ id:'blackSword', name:'玄铁剑', cat:'weapon', glyph:'剑', atk:18, spd:10, desc:'玄铁与秘银铸成的剑。', stack:1 },
  blackGreatSword:{ id:'blackGreatSword', name:'玄铁大剑', cat:'weapon', glyph:'剑', atk:40, spd:5, twoHand:1, desc:'双手重器：攻击40、攻速5。占用双手，不能搭配盾或副手武器；以极重一击击碎高甲。', stack:1 },
  ironGreatSword:{ id:'ironGreatSword', name:'铁大剑', cat:'weapon', glyph:'剑', atk:25, spd:6, twoHand:1, desc:'双手巨剑，沉重缓慢，一击势大力沉。', stack:1 },
  bow:    { name:'猎弓', cat:'weapon', glyph:'弓', atk:10, spd:8, ranged:1, desc:'竹木猎弓，远程先手。', stack:1 },
  // ---------- 神弓：限时制作已结束，可重复持有、存邮箱跨局 ----------
  // 数值与猎弓完全一致（攻10/攻速8），不靠数值膨胀；特权是"每场战斗第一次命中必定会心一击"
  divineBow: { name:'神弓', cat:'weapon', glyph:'弓', atk:10, spd:8, ranged:1, divineCrit:1, stack:1, price:0, alwaysFit:1, keepBroken:1,
    // keepBroken：耐久归零不消失，但不能修复或再次装备，只作为收藏保留。
    desc:'传说中的古弓，威力与猎弓相同；每场战斗第一次命中必定会心。基础耐久 120，不可修复；耐久耗尽后自动卸下，仍留在背包中作收藏。可持有多把并逐件存入邮箱跨局；商城售价 15 星之点，遗海交换机有极低概率出现。' },
  arrow:  { name:'箭矢', cat:'weapon', glyph:'矢', ammo:1, desc:'燧石箭头的箭。', stack:50 },
  eagleArrow:{ id:'eagleArrow', name:'鹰羽箭', cat:'weapon', glyph:'鹰', ammo:1, atkBonus:8, desc:'鹰羽尾羽的箭，精准有力。', stack:50 },
  // ---- 防具 / 衣物 ----
  grassArmor:{ id:'grassArmor', name:'草甲', cat:'armor', glyph:'甲', def:2, desc:'茅草编的护甲。', stack:1 },
  leatherArmor:{ id:'leatherArmor', name:'皮甲', cat:'armor', glyph:'甲', def:4, desc:'皮革护甲。', stack:1 },
  ironArmor:{ id:'ironArmor', name:'铁甲', cat:'armor', glyph:'甲', def:6, desc:'铁片甲。', stack:1 },
  divineArmor:{ id:'divineArmor', name:'神之甲', cat:'armor', glyph:'甲', def:6, hitHeal:2, stack:1, alwaysFit:1, price:0, desc:'铁甲档护甲，防御 +6；受到敌人的实际攻击伤害且存活时回复 2 生命。闪避、格挡和环境伤害不触发。基础耐久 110，商城售价 15 星之点，也可通过官方兑换码获得。' },
  blackArmor:{ id:'blackArmor', name:'玄铁甲', cat:'armor', glyph:'甲', def:8, desc:'玄铁重甲。', stack:1 },
  grassCloth:{ id:'grassCloth', name:'草衣', cat:'cloth', glyph:'衣', warm:1, desc:'茅草编的衣服。', stack:1 },
  hempCloth:{ id:'hempCloth', name:'麻衣', cat:'cloth', glyph:'衣', warm:2, desc:'纤维织的麻衣。', stack:1 },
  leatherCloth:{ id:'leatherCloth', name:'皮衣', cat:'cloth', glyph:'衣', warm:3, desc:'皮革衣服。', stack:1 },
  furCoat:{ id:'furCoat', name:'毛皮大衣', cat:'cloth', glyph:'裘', warm:6, desc:'厚实的毛皮大衣，严寒时很有用；炎热地区应及时脱下。', stack:1 },
  shellAmulet:{ id:'shellAmulet', name:'贝壳护符', cat:'accessory', glyph:'贝', def:1, desc:'海贝串成的护符，替你挡一下擦伤。', stack:1, price:40 },
  beastFang:{ id:'beastFang', name:'兽牙吊坠', cat:'accessory', glyph:'牙', atk:1, desc:'猎物的獠牙，给你下手的狠劲。', stack:1, price:50 },
  pearlNeck:{ id:'pearlNeck', name:'珍珠项链', cat:'accessory', glyph:'珠', hp:10, desc:'佩戴后生命上限 +10；摘下即失去这项加成。', stack:1, price:120 },
  hornAmulet:{ id:'hornAmulet', name:'牛角护符', cat:'accessory', glyph:'角', crit:0.10, desc:'锋利的牛角提醒你抓住破绽；暴击率 +10%。', stack:1, price:80 },
  woodShield:{ id:'woodShield', name:'木盾', cat:'shield', glyph:'盾', def:2, block:0.15, desc:'木板拼的盾，能挡一下。', stack:1, price:20 },
  ironShield:{ id:'ironShield', name:'铁盾', cat:'shield', glyph:'盾', def:4, block:0.25, desc:'铸铁盾，可靠。', stack:1, price:60 },
  steelShield:{ id:'steelShield', name:'钢盾', cat:'shield', glyph:'盾', def:6, block:0.30, desc:'钢制塔盾，几乎无懈可击。', stack:1, price:140 },
  // ---- 药品 ----
  herbPaste:{ id:'herbPaste', name:'草药膏', cat:'med', healthRestore:15, cureInfection:1, glyph:'膏', heal:15, desc:'生命+15、健康+15，治疗感染。兼顾伤势与体质。', stack:20, price:15 },
  bandage:{ id:'bandage', name:'止血绷带', cat:'med', glyph:'绷', heal:15, stopBleed:1, desc:'生命+15并止血。不恢复健康，适合紧急包扎。', stack:20, price:12 },
  antidote:{ id:'antidote', name:'解毒剂', cat:'med', healthRestore:10, glyph:'解', curePoison:1, desc:'解除中毒、健康+10。不回血、不治疗感染。', stack:20, price:25 },
  tea:    { name:'提神茶', cat:'med', glyph:'茶', spirit:14, desc:'草药蜂蜜煮的茶，恢复 14 点精神。', stack:20, price:18 },
  lotusPill:{ id:'lotusPill', name:'不死丹', cat:'med', glyph:'丹', heal:60, revive:1, reviveHp:30, desc:'吃下回复 60 生命；若你倒下，它替你留住 30 点生命。每局最多炼制 3 颗。', stack:3 },
  tideVitalPill:{ name:'潮生丹', cat:'med', glyph:'丹', desc:'服用后本局生命上限永久 +2；每局最多制作 5 颗，服用不限次数。', stack:5 },
  abyssBreathPill:{ name:'渊息丹', cat:'med', glyph:'丹', desc:'服用后本局体力上限永久 +3；每局最多制作 5 颗，服用不限次数。', stack:5 },
  salve:{ id:'salve', name:'简易药膏', cat:'med', healthRestore:20, glyph:'膏', desc:'健康+20。不回血、不止血，适合便宜地调理体质。', stack:20, price:8 },
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
  bpFurnace:  { retired:true, name:'高炉图纸', cat:'bp', glyph:'图', desc:'高炉结构的收藏图纸；建造高炉不需要图纸。', stack:1 },
  bpShip:     { name:'远洋船图纸', cat:'bp', glyph:'图', desc:'远洋大船的建造图纸。', stack:1 },
  bpBlack:    { name:'玄铁武器图纸', cat:'bp', glyph:'图', desc:'玄铁装备的锻造图纸。', stack:1 },
  bpLotus:    { name:'不死丹方', cat:'bp', glyph:'图', desc:'不死丹的古方。', stack:1 },
  slate:  { name:'石板', cat:'special', glyph:'碑', desc:'刻着古文字的石板。（集齐三块可解谜；没人肯收，别无他用）', stack:3, price:0, alwaysFit:1 },
  relic:  { name:'遗物', cat:'special', glyph:'遗', desc:'山顶祭坛里的古老遗物。结局「秘辛」要把它放回祭坛（还需石板×3、龙骨×1）——不是那种加属性的「神物」，别混了。', stack:1, price:500, alwaysFit:1 },
  rot: { name:'腐烂物', cat:'mat', glyph:'烂', desc:'过期食物变质而来。埋进田里能肥地：施肥一次，该地块收获 +50%。', stack:20, price:1 },
  namecard:{ name:'命名牌', cat:'special', glyph:'铭', desc:'刻着名字的木牌，可让武器永久+1伤害。', stack:1, price:0 },
  dragonbone:{ id:'dragonbone', name:'龙骨', cat:'special', glyph:'骨', desc:'巨大的龙骨，既是船材也是祭品。', stack:1, price:600, alwaysFit:1 },
  seachart:{ id:'seachart', name:'海图', cat:'special', glyph:'图', desc:'通向故乡的航海图。', stack:1 },
  supplybox:{ id:'supplybox', name:'补给箱', cat:'special', glyph:'箱', desc:'远航用的补给箱。', stack:3 },
  driftbottle:{ id:'driftbottle', name:'漂流瓶', cat:'special', glyph:'瓶', desc:'装着老潮的信的漂流瓶。', stack:1 },
  // ---- 亚特兰蒂斯（第二章）物资 ----
  diveSuit:{ id:'diveSuit', name:'潜水服', cat:'cloth', glyph:'潜', warm:2, dive:1, stack:1, price:0, desc:'孤岛工作台可做的基础潜水服（占衣物），耐受水压、保暖 2；普通海底区域额外隔温，极深处效果下降。耐久 50。' },
  diveSuit2:{ id:'diveSuit2', name:'高级潜水服', cat:'cloth', glyph:'潜', warm:2, dive:2, stack:1, price:0, desc:'珠光工作台打造的高级潜水服，耐压更高、保暖 2；包括深海区域在内都有稳定隔温。耐久 200。' },
  diveMask:{ id:'diveMask', name:'氧气罩', cat:'tool', glyph:'氧', tool:{kind:'o2',tier:1}, stack:1, price:0, diveO2:1, desc:'提供水下氧气（可装备到工具栏），可长期停留；耐久 100。' },
  goggles:{ id:'goggles', name:'潜水护目镜', cat:'tool', glyph:'镜', stack:1, price:0, light:1, desc:'照明道具（拥有即生效）：可探索沉没之城与珊瑚带。' },
  lightWeak:{ id:'lightWeak', name:'弱光防水手电', cat:'tool', glyph:'灯', stack:1, price:0, light:2, desc:'照明道具：照亮海沟，可探索中层黑暗区域。' },
  lightStrong:{ id:'lightStrong', name:'防水强光潜水手电', cat:'tool', glyph:'灯', stack:1, price:0, light:3, desc:'照明道具：照亮深水圣殿，可探索深海区域。' },
  sourceOre:{ id:'sourceOre', name:'源矿', cat:'mat', glyph:'源', stack:20, price:40, desc:'亚特兰蒂斯地层的能量矿石。' },
  sourceBar:{ id:'sourceBar', name:'源质锭', cat:'mat', glyph:'质', stack:20, price:260, desc:'源矿经源质熔炉精炼而成。' },
  tideSteel:{ id:'tideSteel', name:'潮鸣钢', cat:'mat', glyph:'潮', stack:20, price:80, desc:'深海高压把源矿反复挤压成的层纹钢。' },
  shipPlate:{ id:'shipPlate', name:'古船甲片', cat:'mat', glyph:'甲', stack:20, price:65, desc:'从沉船残骸上撬下的源质装甲片。' },
  deepCoral:{ id:'deepCoral', name:'深珊瑚', cat:'mat', glyph:'珊', stack:20, price:15, desc:'深海发光的珊瑚，可建可炼。' },
  anctDevice:{ id:'anctDevice', name:'发光远古装置', cat:'special', glyph:'机', stack:5, price:120, desc:'远古文明的能量装置，可精炼为源质。' },
  pearlGranule:{ id:'pearlGranule', name:'珍珠粒', cat:'mat', glyph:'珠', stack:20, price:10, desc:'深海底的细碎珍珠。' },
  coralArmor:{ id:'coralArmor', name:'珊瑚甲', cat:'armor', glyph:'甲', def:6, dodge:0.15, stack:1, price:0, desc:'略低于玄铁，却提高 15% 闪避率。' },
  sourceArmor:{ id:'sourceArmor', name:'源质重甲', cat:'armor', glyph:'甲', def:10, stack:1, price:0, desc:'源质锻造的重甲，深海的守护。' },
  coralBlade:{ id:'coralBlade', name:'珊瑚刺刃', cat:'weapon', glyph:'刃', atk:11, spd:11, acc:0.1, stack:1, price:0, desc:'珊瑚磨成的利刃，提高命中率。' },
  sourceSpear:{ id:'sourceSpear', name:'源质长枪', cat:'weapon', glyph:'枪', atk:20, spd:9, stack:1, price:0, desc:'源质铸成的长枪。' },
  bpDive:{ id:'bpDive', name:'深海装备图纸', cat:'bp', glyph:'图', stack:1, desc:'潜水服与氧气罩的制造图纸。' },
  atlantisCore:{ id:'atlantisCore', name:'海底矿晶', cat:'special', glyph:'晶', stack:5, price:0, desc:'海底岩层里的致密矿晶；源质长枪、重甲及两种丹药需要它。与源能晶石不同。' },
  thruster:{ id:'thruster', name:'推进器', cat:'accessory', glyph:'推', stack:1, price:0, desc:'亚克兰蒂斯的水下推进器（饰品）：在第二张图内移动时，时间与体力消耗减半。' },
  energyCrystal:{ id:'energyCrystal', name:'源能晶石', cat:'special', glyph:'能', stack:10, price:0, desc:'亚克兰蒂斯深层的能量晶石，比源矿更精纯，是源能武器与高阶装备的核心材料。' },
  // 新能源材料（作者 2026-09-22）：玩家反馈"矿一堆、发光装置太缺"。
  // 根因是死锁：强光手电要「源能晶石」，而晶石只产于**需要照明 3** 的深渊/源晶簇——
  // 没有强光就刷不到做强光的材料。荧光晶簇产自**不需要照明**的浅层点位，用来顶掉一部分矿物需求。
  glowCrystal:{ id:'glowCrystal', name:'荧光晶簇', cat:'mat', glyph:'荧', stack:20, price:0, desc:'海葵与发光丛里结出的自发光晶体，亮度不如源能晶石，但浅水就能采到；做灯具与潜水装备够用。' },
  pistol:{ id:'pistol', name:'源能手枪', cat:'weapon', glyph:'枪', atk:50, spd:5, ranged:1, ammoItem:'bullet', stack:1, price:0, desc:'远古源能手枪：伤害极高但射速慢，每次射击消耗 1 颗源能子弹。' },
  bullet:{ id:'bullet', name:'源能子弹', cat:'weapon', glyph:'弹', ammo:1, stack:50, price:0, desc:'源能手枪的弹药。' },
  brokenPistol:{ id:'brokenPistol', name:'破损的源能手枪', cat:'special', glyph:'枪', stack:1, price:0, desc:'从海盗头目处夺来的破损手枪，可在礁石栖息地的修补台修复。' },
  rareFishA:{ id:'rareFishA', name:'深海鲷', cat:'food', glyph:'鱼', food:12, buffStat:'atk', buffVal:3, buffH:24, stack:5, desc:'稀有深海鱼，只能直接吃：24 小时内攻击 +3。' },
  rareFishB:{ id:'rareFishB', name:'幽光鳗', cat:'food', glyph:'鱼', food:12, buffStat:'spd', buffVal:2, buffH:24, stack:5, desc:'稀有深海鱼，只能直接吃：24 小时内攻速 +2。' },
  rareFishC:{ id:'rareFishC', name:'冰纹鳕', cat:'food', glyph:'鱼', food:12, buffStat:'def', buffVal:2, buffH:24, stack:5, desc:'稀有深海鱼，只能直接吃：24 小时内防御 +2。' },
  rareFishD:{ id:'rareFishD', name:'血红鲈', cat:'food', glyph:'鱼', food:12, buffStat:'spirit', buffVal:10, buffH:24, negChance:0.25, negHp:10, stack:5, desc:'稀有深海鱼，食用立即恢复精神 +10；但有 25% 概率反胃（-10 生命）。' },
  rareFishE:{ id:'rareFishE', name:'幻彩鱼', cat:'food', glyph:'鱼', food:12, buffStat:'hp', buffVal:20, buffH:24, negChance:0.25, negPoison:1, stack:5, desc:'稀有深海鱼，24 小时生命上限 +20；但有 25% 概率中毒。' },
  bpPistol:{ id:'bpPistol', name:'手枪图纸', cat:'bp', glyph:'图', stack:1, desc:'一张画着远古手枪结构的图纸。' },
  bpBullet:{ id:'bpBullet', name:'子弹图纸', cat:'bp', glyph:'图', stack:1, desc:'一张画着弹丸与火药装填的图纸。' },
  bpCoralBlade:{ id:'bpCoralBlade', name:'珊瑚刺刃图纸', cat:'bp', glyph:'图', stack:1, desc:'珊瑚刺刃的铸造图纸。' },
  bpCoralArmor:{ id:'bpCoralArmor', name:'珊瑚甲图纸', cat:'bp', glyph:'图', stack:1, desc:'以深海珊瑚编织护甲的图纸。' },
  bpThruster:{ id:'bpThruster', name:'推进器图纸', cat:'bp', glyph:'图', stack:1, desc:'水下推进器的构造图纸。' },
  bpSourceSpear:{ id:'bpSourceSpear', name:'源质长枪图纸', cat:'bp', glyph:'图', stack:1, desc:'源质长枪的锻造图纸。' },
  bpSourceArmor:{ id:'bpSourceArmor', name:'源质重甲图纸', cat:'bp', glyph:'图', stack:1, desc:'源质重甲的锻造图纸。' },
  // 作者 2026-09-24：三道进阶料理改由对岸「美食家」卖图纸（声望 3 解锁）。
  // 拿到图纸前**不显示**这三道菜（UI 里 needBp 未拥有直接隐藏），不再摆着一堆做不了的灰按钮。
  bpStew:    { id:'bpStew', name:'萝卜炖肉食谱', cat:'bp', glyph:'谱', stack:1, desc:'对岸美食家写的食谱：萝卜炖肉。' },
  bpOmelette:{ id:'bpOmelette', name:'超级大蛋食谱', cat:'bp', glyph:'谱', stack:1, desc:'对岸美食家写的食谱：超级大蛋。' },
  bpCake:    { id:'bpCake', name:'蛋糕食谱', cat:'bp', glyph:'谱', stack:1, desc:'对岸美食家写的食谱：蛋糕。' },
  deepCore:{ id:'deepCore', name:'深殿核心', cat:'special', glyph:'核', stack:4, price:0, desc:'深水圣殿之门的四块核心之一；集齐四块才能推开守护者祭坛。' },
};

// ---------- 天赋 ----------
const IDENTITIES = {
  fisher:  { name:'渔夫', desc:'钓鱼收获 +50%，初始带鱼竿。', fishBonus:0.5, items:{ rod:1 } },
  hunter:  { name:'猎人', desc:'基础命中率 +10 个百分点、暴击率 +5 个百分点；初始带石矛。', items:{ spear:1 } },
  trainer: { name:'健身教练', desc:'可建跑步机与哑铃；每次锻炼需 6 小时，同日只能练一种器材，逐步提高生命与攻击。', items:{ meat:2, water:2 } },
  woodcutter:{ id:'woodcutter', name:'樵夫', desc:'伐木收获 +50%，初始带石斧。', woodBonus:0.5, items:{ axeStone:1 } },
  herbalist:{ id:'herbalist', name:'药师', desc:'草药采集翻倍，初始带药膏；使用道具的回复量 +50%。', herbBonus:1, medBonus:1, items:{ herb:3, herbPaste:1 } },
  beekeeper:{ id:'beekeeper', name:'养蜂人', desc:'树林取蜜必定成功还能多拿，且不会被蛰；能造专属家具「蜂箱」（详情看营地·家具帮助）。', honeyBonus:1, items:{ honey:2, thatch:4 } },
  smith:   { name:'铁匠学徒', desc:'制造耗时 -20%，额外带木材×4、燧石×3。', craftTime:0.8, items:{ wood:4, flint:3 } },
  linghui: { id:'linghui', name:'灵灰', desc:'从北方海域漂来的鲸鱼娘，没什么本事却很可爱，每天都会跟你说说话，偶尔还带点小东西回来。', items:{} },
};

const DIFFICULTIES = {
  easy:   { name:'求生者', resMul:1.5, enemyMul:0.6, drainMul:0.7, raidWolf:2, defEff:1.0, death:'day', stamina:0, start:{ food:12, spear:1 }, recommend:1,
            desc:'资源丰富、怪物更弱、饥渴更慢；防御 100% 生效，夜袭强度也最低。新手推荐从这里开始。开局获得 12 份随机食物和一支长矛。' },
  normal: { name:'冒险家', resMul:1.15, enemyMul:0.85, drainMul:0.85, raidWolf:2, defEff:0.9, death:'day', stamina:0, start:{ food:6 },
            desc:'标准体验：资源略多、怪物略弱，防御 90% 生效。开局获得 6 份随机食物。' },
  hard:   { name:'幸存者', resMul:1.0, enemyMul:1.3, defEff:0.8, death:'day', stamina:0, start:{}, desc:'资源不再打折，怪物更强（×1.3），防御只有 80% 生效；享受历代遗章传承，开局物资由传承决定。' },
  legend: { name:'传奇', resMul:1.0, enemyMul:1.6, defEff:0.7, death:'perm', stamina:0, start:{}, desc:'仅携带职业自带物品，无基础补给、空营地开局，帐篷、储物箱和篝火都要自行建造；怪物极强（×1.6），防御只有 70% 生效，死亡不可回退，不享受历代遗章传承。' },
  nightmare: { name:'噩梦', resMul:1, enemyMul:1.3, defEff:0.8, death:'day', stamina:0, start:{}, desc:'岛上出现了不可名状的怪物。享受历代遗章传承；移动与采集可能遭遇逐日增强的梦魇，击败沉没之王后，在深水圣殿挑战噩梦之源通关。' },
  dev:    { name:'开发者', resMul:1, enemyMul:1, defEff:1, death:'day', stamina:500, start:{}, desc:'调试用：初始全部资源×100，背包 200 格。（隐藏）' },
};

// ---------- 场景 ----------
// unlockWatch: 需要瞭望台等级；needBoat/needWarm: 额外条件；distMin: 赶路分钟
const SCENES = [
  { id:'camp', name:'营地', img:'assets/img/build/camp-ground-bw-v2.png', distMin:0, danger:1, unlockWatch:0,
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
      { id:'river_mushroom', name:'岸边蘑菇', type:'gather', time:20, energy:8, need:{}, yields:[{id:'mushroom',min:1,max:2}], daily:2, cond:{rain:true}, hideWhenDry:true, text:'雨水浸透了地面，成簇的新蘑菇冒了出来。' },
      { id:'river_water', name:'取水点', type:'gather', time:20, energy:8, need:{}, yields:[{ id:'water', min:2, max:3 }], daily:3, cond:{ season:['春','夏','秋'] }, text:'你俯身捧起河水，冰凉清冽。' },
      // 冬季专属（作者 2026-09-25）：冬天取水要同时吃"季节 0.6 × 雪天 0.6"两重折扣，一天只剩 3 份淡水。
      // 采雪保留冬季产量折扣，但不再因正在降雪而额外减产；回篝火烧雪取水：
      // 一天 3 次 → 约 3~6 份积雪 →「烧雪水」2 积雪 + 1 木材 = **1** 淡水 → 每天多出 1~3 份淡水。
      { id:'river_snow', name:'采雪', type:'gather', time:15, energy:6, need:{}, yields:[{ id:'snow', min:3, max:5 }], daily:3, cond:{ season:['冬'] }, text:'你拨开表层，把底下干净的积雪压实装进袋子。' },
      { id:'river_fish', name:'垂钓点', type:'fish', time:40, energy:15, need:{ item:'rod' }, yields:[{ id:'fish', min:1, max:2 }], daily:3, text:'浮漂轻点，鱼线绷直——上钩了！' },
  { id:'river_net', name:'撒网点', type:'gather', time:55, energy:18, need:{ item:'net' }, yields:[{ id:'fish', min:3, max:5 }], daily:1, text:'你一扬手，渔网在水面铺开，兜起了不少鱼。' },
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
      { id:'forest_vine', name:'藤蔓坡', type:'gather', time:20, energy:8, need:{}, yields:[{ id:'vine', min:4, max:6 }], daily:2, text:'你割下一段柔韧的藤蔓。' },
      { id:'forest_mushroom', name:'蘑菇圈', type:'gather', time:20, energy:8, need:{}, yields:[{ id:'mushroom', min:1, max:2 }], daily:2, cond:{ rain:true }, hideWhenDry:true, text:'雨中新出的蘑菇，沾着水珠。' },
      { id:'forest_herb', name:'草药丛', type:'gather', time:20, energy:8, need:{}, yields:[{ id:'herb', min:1, max:2 }, { id:'wood', min:1, max:1, chance:0.3 }], daily:2, text:'你认出几株草药的叶子。' },
      { id:'forest_resin', name:'老松树(割脂)', type:'gather', time:20, energy:8, need:{ tool:'knife', tier:1 }, yields:[{ id:'resin', min:1, max:2 }], daily:1, text:'你用石质匕首在松树上割开一道口子。' },
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
      { id:'bamboo_mushroom', name:'竹根蘑菇', type:'gather', time:20, energy:8, need:{}, yields:[{id:'mushroom',min:1,max:2}], daily:2, cond:{rain:true}, hideWhenDry:true, text:'雨水浸透了地面，成簇的新蘑菇冒了出来。' },
      { id:'bamboo_cut', name:'竹丛', type:'gather', time:25, energy:15, need:{ tool:'axe' }, yields:[{ id:'bamboo', min:6, max:8 }], daily:3, text:'你砍倒几根粗竹，竹节脆响。' },
      { id:'bamboo_fiber', name:'剖竹', type:'gather', time:25, energy:10, need:{ tool:'knife' }, yields:[{ id:'fiber', min:2, max:3 }], daily:2, text:'你用石质匕首把竹片剖成细条。' },
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
      { id:'grass_mushroom', name:'雨生蘑菇', type:'gather', time:20, energy:8, need:{}, yields:[{id:'mushroom',min:1,max:2}], daily:2, cond:{rain:true}, hideWhenDry:true, text:'雨水浸透了地面，成簇的新蘑菇冒了出来。' },
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
        { id:'sea_oyster', name:'撬牡蛎', type:'gather', time:35, energy:15, need:{ tool:'knife', tier:1 }, daily:2, yields:[{ id:'pearl', min:1, max:1, chance:0.32 },{ id:'beibi', min:1, max:3 }], text:'退潮后礁石露出来，牡蛎密密麻麻嵌在上面——你拿刀把它撬开。' },
      { id:'sea_salt', name:'晒盐', type:'gather', time:40, energy:12, need:{}, yields:[{ id:'salt', min:1, max:2 },{ id:'salt', min:1, max:1, chance:0.35 }], daily:2, cond:{ season:['夏','秋'] }, text:'海水在盐田里晒成雪白的盐，你把结晶收拢起来。' },
        { id:'sea_deep', name:'深水区(捕大鱼)', type:'gather', time:55, energy:25, need:{ item:'net' }, yields:[{ id:'fish', min:2, max:4 }, { id:'sharkfin', min:1, max:1, chance:0.25 }], daily:1, cond:{ boat:'boat' }, risk:'shark', text:'你划到深水区，海面下暗流涌动。' },
        { id:'sea_rescue', name:'求救信号', type:'adventure', time:30, energy:10, need:{}, once:true, cond:{ day:12 }, text:'礁石上绑着一面破布条，像有人来过这里。' },
        // ⚠️ 两套文案：头目日走 text，小喽啰日走 textMinion。
    //    以前只有 text（写着"是海盗头目！"），非头目日却刷两只小喽啰 —— 日志在骗人
    //    （作者 2026-09-23 反馈"普通海盗的文案和海盗头目的文案一样"）。
    { id:'sea_pirate', name:'海盗出没', type:'hunt', time:40, energy:20, need:{}, daily:1, cond:{ day:20, dayMod:5 }, enemies:['pirateBoss','pirate','pirate'],
      text:'海面上飘来一艘挂着骷髅旗的战船，船长站在船头磨刀——是海盗头目！',
      textMinion:'海面上飘来一艘挂着骷髅旗的战船，甲板上跳下来两个拎着弯刀的海盗——头目不在船上。' },
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
      coral:{ name:'珊瑚生长带', img:'assets/img/atlantis/coral.png', hotspots:[ { x:36, y:60, label:'珊瑚丛', point:'atl_coral' }, { x:62, y:44, label:'淡化残罐', point:'atl_pearl' }, { x:46, y:76, label:'海葵丛', point:'atl_anemone' } , { x:58, y:84, label:'深殿核心', point:'atl_dcore_coral' }, { x:70, y:70, label:'深海鱼群', point:'atl_fishschool' }], points:[
        { id:'atl_coral', name:'珊瑚丛', type:'gather', time:25, energy:12, need:{}, yields:[{ id:'deepCoral', min:1, max:2 },{ id:'shipPlate', min:1, max:1, chance:0.3 }], daily:3, text:'你采下一丛发光的珊瑚。' },
        { id:'atl_pearl', name:'淡化残罐', type:'gather', time:30, energy:15, need:{}, yields:[{ id:'water', min:2, max:3, chance:0.7 }], daily:3, text:'检查浅水区古老的密封淡化罐，寻找仍可饮用的淡水。' },
        { id:'atl_anemone', name:'海葵丛', type:'gather', time:30, energy:15, need:{}, guard:['tentacle'], guardChance:0.6, yields:[{ id:'pearlGranule', min:1, max:2 },{ id:'glowCrystal', min:1, max:1, chance:0.5 },{ id:'atlantisCore', min:1, max:1, chance:0.15 }], daily:2, text:'海葵丛里结着发光的硬粒，但触手也会缠上来。' }, { id:'atl_dcore_coral', name:'深殿核心·珊瑚', type:'gather', time:45, energy:22, need:{}, once:true, guard:['deepGuard','tentacle','mechGuard'], guardChance:1, yields:[{ id:'deepCore', min:1, max:1 }], text:'珊瑚深处嵌着一块温热的核心。' }, { id:'atl_fishschool', name:'深海鱼群', type:'gather', time:40, energy:18, need:{ item:'net' }, daily:2, yields:[{ id:'fish', min:1, max:3 },{ id:'rareFishA', min:1, max:1, chance:0.18 },{ id:'rareFishB', min:1, max:1, chance:0.12 }], text:'鱼群里有几条从没见过的鱼。' } ] },
      trench:{ name:'海沟', img:'assets/img/atlantis/trench.png', needLight:2, hotspots:[ { x:60, y:62, label:'沟壁矿脉', point:'atl_source' }, { x:40, y:50, label:'深渊怪影', point:'atl_deep' }, { x:78, y:34, label:'无光深渊', point:'atl_dark' } , { x:25, y:68, label:'深殿核心', point:'atl_dcore_trench' }, { x:82, y:62, label:'暗流鱼群', point:'atl_deepfish' }], points:[
        { id:'atl_source', name:'沟壁矿脉', type:'gather', time:40, energy:22, need:{ tool:'pick', tier:3 }, needLight:2, guard:['tentacle','mechGuard'], guardChance:1, yields:[{ id:'sourceOre', min:1, max:2 },{ id:'tideSteel', min:1, max:1, chance:0.35 }], daily:2, text:'你凿下几块发光的源矿。' },
        { id:'atl_deep', name:'深渊怪影', type:'hunt', time:35, energy:25, need:{}, needLight:2, daily:1, enemies:['tentacle','mechGuard'], text:'黑暗中，触手与机械在你周围游弋。' },
        { id:'atl_dark', name:'无光深渊', type:'gather', time:45, energy:25, need:{ tool:'pick', tier:3 }, needLight:3, guard:['mechGuard'], guardChance:0.8, yields:[{ id:'sourceOre', min:1, max:2 },{ id:'tideSteel', min:1, max:2, chance:0.6 },{ id:'atlantisCore', min:1, max:1, chance:0.2 },{ id:'energyCrystal', min:1, max:1, chance:0.5 }], daily:1, text:'更深的沟底漆黑一片，海底矿晶反射出一点微光——机械守卫守在那里。' }, { id:'atl_dcore_trench', name:'深殿核心·海沟', type:'gather', time:45, energy:22, need:{}, once:true, guard:['deepGuard','tentacle','mechGuard'], guardChance:1, yields:[{ id:'deepCore', min:1, max:1 }], text:'沟底的石匣里封着一块核心。' }, { id:'atl_deepfish', name:'暗流鱼群', type:'gather', time:45, energy:20, need:{ item:'net' }, needLight:2, daily:2, guard:['tentacle'], guardChance:0.3, yields:[{ id:'fish', min:1, max:3 },{ id:'rareFishC', min:1, max:1, chance:0.15 },{ id:'rareFishD', min:1, max:1, chance:0.1 },{ id:'rareFishE', min:1, max:1, chance:0.08 }], text:'暗流里藏着发光的鱼影。' } ] },
      sanctum:{ name:'深水圣殿', img:'assets/img/atlantis/sanctum.png', needLight:3, hotspots:[ { x:42, y:60, label:'圣殿之门', point:'atl_device' }, { x:62, y:72, label:'守护者祭坛', point:'atl_boss' }, { x:29, y:42, label:'符文密室', point:'atl_runelab' } ], points:[
        { id:'atl_device', name:'圣殿之门', type:'gather', time:40, energy:22, need:{}, needLight:3, guard:['deepGuard','tentacle','mechGuard'], guardChance:1, yields:[{ id:'anctDevice', min:1, max:1 }], daily:1, text:'圣殿之门旁，躺着一件发光远古装置。' },
        { id:'atl_boss', name:'守护者祭坛', type:'hunt', time:45, energy:30, need:{}, needLight:3, needCore:4, daily:1, enemies:['sunkenKing'], text:'沉没之王在祭坛中央缓缓起身。' },
        { id:'atl_runelab', name:'符文密室', type:'gather', time:45, energy:25, need:{}, needLight:3, guard:['tentacle','mechGuard'], guardChance:1, yields:[{ id:'anctDevice', min:1, max:2 },{ id:'atlantisCore', min:1, max:1, chance:0.35 },{ id:'energyCrystal', min:1, max:1, chance:0.4 }], daily:1, text:'密室的门要懂符文才开；门后是远古装置与一块源晶。' } ] },
      shipwreck:{ name:'沉船墓地', img:'assets/img/atlantis/shipwreck.png', hotspots:[ { x:38, y:62, label:'沉船残骸', point:'atl_wreck' }, { x:64, y:70, label:'船舱深处', point:'atl_wreckhunt' }, { x:25, y:38, label:'船长室', point:'atl_cabin' } , { x:78, y:52, label:'深殿核心', point:'atl_dcore_wreck' }, { x:70, y:84, label:'神秘人鱼', point:'atl_fishman' }], points:[
        { id:'atl_wreck', name:'沉船残骸', type:'gather', time:30, energy:15, need:{}, yields:[{ id:'shipwood', min:1, max:2 },{ id:'ironpart', min:1, max:1, chance:0.4 },{ id:'shipPlate', min:1, max:1, chance:0.5 }], daily:3, text:'你从沉船里拆下可用的船木与铁件。' },
        { id:'atl_wreckhunt', name:'船舱深处', type:'hunt', time:30, energy:20, need:{}, daily:2, enemies:['deepGuard','tentacle'], text:'船舱深处，有东西在动。' },
        { id:'atl_cabin', name:'船长室', type:'gather', time:35, energy:18, need:{}, needLight:2, guard:'deepGuard', guardChance:0.7, yields:[{ id:'coin', min:2, max:4 },{ id:'anctDevice', min:1, max:1, chance:0.25 }], daily:1, text:'船长室里还锁着东西——也有不欢迎你的东西。' }, { id:'atl_dcore_wreck', name:'深殿核心·沉船', type:'gather', time:45, energy:22, need:{}, once:true, guard:['deepGuard','tentacle','mechGuard'], guardChance:1, yields:[{ id:'deepCore', min:1, max:1 }], text:'船骸的龙骨下压着一块核心。' }, { id:'atl_fishman', name:'神秘人鱼', type:'trade', time:0, energy:0, need:{}, text:'蒙面的人鱼女子坐在沉船龙骨旁，银发与鳞片泛着微光。她收金锭与深海材料，不收贝壳。' } ] },
      coralForest:{ name:'珊瑚森林', img:'assets/img/atlantis/coralForest.png', hotspots:[ { x:40, y:62, label:'珊瑚林', point:'atl_cforest' }, { x:66, y:56, label:'发光丛', point:'atl_glow' }, { x:27, y:72, label:'幽光花', point:'atl_deepbloom' } ], points:[
        { id:'atl_cforest', name:'珊瑚林', type:'gather', time:25, energy:12, need:{}, yields:[{ id:'deepCoral', min:2, max:4 }], daily:3, text:'珊瑚林里资源丰饶。' },
        { id:'atl_glow', name:'发光丛', type:'gather', time:30, energy:15, need:{}, guard:'tentacle', guardChance:0.7, yields:[{ id:'anctDevice', min:1, max:1, chance:0.3 },{ id:'glowCrystal', min:1, max:2 },{ id:'pearlGranule', min:1, max:3 }], daily:2, text:'你在发光丛里翻找。' },
        { id:'atl_deepbloom', name:'幽光花', type:'gather', time:35, energy:18, need:{}, needLight:1, guard:'tentacle', guardChance:0.7, yields:[{ id:'anctDevice', min:1, max:1, chance:0.4 },{ id:'atlantisCore', min:1, max:1, chance:0.1 }], daily:2, text:'幽光花会发光，也会招来触手。' } ] },
      pearlCave:{ name:'珍珠洞窟', img:'assets/img/atlantis/pearlCave.png', needLight:1, hotspots:[ { x:42, y:64, label:'珍珠壁', point:'atl_pearlcave' }, { x:64, y:52, label:'晶簇', point:'atl_crystal' }, { x:52, y:30, label:'珍珠之心', point:'atl_pearlheart' } , { x:34, y:44, label:'古匠工坊', point:'atl_bullet' }], points:[
        { id:'atl_pearlcave', name:'珍珠壁', type:'gather', time:30, energy:15, need:{}, needLight:1, yields:[{ id:'pearlGranule', min:3, max:5 }], daily:3, text:'洞壁上嵌满珍珠。' },
        { id:'atl_crystal', name:'晶簇', type:'gather', time:35, energy:18, need:{ tool:'pick', tier:2 }, needLight:1, yields:[{ id:'crystal', min:1, max:2 },{ id:'sourceOre', min:1, max:2, chance:0.5 }], daily:2, text:'你凿下发光晶簇。' },
        { id:'atl_pearlheart', name:'珍珠之心', type:'gather', time:40, energy:20, need:{}, needLight:1, guard:['deepGuard'], guardChance:0.7, yields:[{ id:'pearlGranule', min:4, max:6 },{ id:'atlantisCore', min:1, max:1, chance:0.2 },{ id:'energyCrystal', min:1, max:1, chance:0.5 }], daily:1, text:'洞窟最深处嵌着一颗"珍珠之心"，卫兵守在那里。' }, { id:'atl_bullet', name:'古匠工坊', type:'gather', time:45, energy:22, need:{}, once:true, yields:[{ id:'bpBullet', min:1, max:1 }], text:'工坊的台面上压着一张画满弹丸的图纸。' } ] },
      abyss:{ name:'深渊裂谷', img:'assets/img/atlantis/abyss.png', needLight:3, hotspots:[ { x:44, y:64, label:'裂谷深处', point:'atl_abyssore' }, { x:64, y:52, label:'机械残骸', point:'atl_mech' }, { x:56, y:78, label:'源晶簇', point:'atl_sourcecore' } , { x:32, y:34, label:'深殿核心', point:'atl_dcore_abyss' }], points:[
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
  { id:'r_divesuit2', name:'高级潜水服', out:{ diveSuit2:1 }, in:{ deepCoral:6, sourceBar:2, tideSteel:2, canvas:2, glowCrystal:3 }, station:'pearlWork', time:300, needBp:'bpDive' },
  { id:'r_diveMask', name:'氧气罩', out:{ diveMask:1 }, in:{ leather:2, cloth:3, ironpart:2, flint:2 }, station:'work2', time:180, needBp:'bpDive' },
  { id:'r_goggles', name:'潜水护目镜', out:{ goggles:1 }, in:{ deepCoral:4, pearlGranule:4 }, station:'pearlWork', time:90 },
  { id:'r_lightweak', name:'弱光防水手电', out:{ lightWeak:1 }, in:{ sourceBar:1, glowCrystal:2, crystal:1 }, station:'pearlWork', time:120 },
  // 强光手电：源能晶石 1→**0**（改由荧光晶簇承担），并下调远古装置 2→1。
  // 这样"没强光就刷不到做强光的材料"的死锁被打断：浅层点位就能凑齐。
  { id:'r_lightstrong', name:'防水强光潜水手电', out:{ lightStrong:1 }, in:{ sourceBar:3, glowCrystal:4, anctDevice:1, pearlGranule:6 }, station:'pearlWork', time:180 },
  { id:'r_coralarmor', name:'珊瑚甲', out:{ coralArmor:1 }, in:{ deepCoral:12, pearlGranule:6, cloth:2 }, station:'pearlWork', time:180, needBp:'bpCoralArmor' },
  { id:'r_coralblade', name:'珊瑚刺刃', out:{ coralBlade:1 }, in:{ deepCoral:8, sourceBar:1 }, station:'pearlWork', time:150, needBp:'bpCoralBlade' },
  { id:'r_sourcearmor', name:'源质重甲', out:{ sourceArmor:1 }, in:{ sourceBar:6, shipPlate:4, deepCoral:6, energyCrystal:2, atlantisCore:2 }, station:'pearlWork', time:300, needBp:'bpSourceArmor' },
  { id:'r_sourcespear', name:'源质长枪', out:{ sourceSpear:1 }, in:{ sourceBar:4, tideSteel:4, anctDevice:2, energyCrystal:2, atlantisCore:1 }, station:'pearlWork', time:240, needBp:'bpSourceSpear' },
  { id:'r_thruster', name:'推进器', out:{ thruster:1 }, in:{ sourceBar:3, anctDevice:2, deepCoral:6, energyCrystal:2 }, station:'pearlWork', time:180, needBp:'bpThruster' },
  { id:'r_pistol', name:'源能手枪', out:{ pistol:1 }, in:{ sourceBar:6, energyCrystal:3, anctDevice:3, ironpart:4 }, station:'pearlWork', time:300, needBp:'bpPistol' },
  { id:'r_bullet', name:'源能子弹×2', out:{ bullet:2 }, in:{ energyCrystal:1, gunpowder:1, ironingot:1 }, station:'pearlWork', time:30, needBp:'bpBullet' },
  // 加工
  { id:'r_plank', name:'削木板', out:{ plank:2 }, in:{ wood:4 }, station:'none', time:30, text:'你用斧子把原木削成木板。' },
  { id:'r_pole', name:'削木杆', out:{ pole:1 }, in:{ branch:2 }, station:'none', time:15 },
  { id:'r_rope', name:'搓绳索', out:{ rope:1 }, in:{ vine:3 }, station:'none', time:15 },
  { id:'r_plank_iron', name:'精细削板', legacyPlank:true, out:{plank:3}, in:{wood:4}, station:'none', needTool:'axe', needToolTier:2, time:20 },
  { id:'r_plank_steel', name:'高效削板', legacyPlank:true, out:{plank:3}, in:{wood:4}, station:'none', needTool:'axe', needToolTier:3, time:20 },
  { id:'r_brick_bulk', name:'成批烧砖', out:{stonebrick:5}, in:{stone:4,clay:2}, station:'furn2', time:45 },
  { id:'r_brick', name:'烧石砖', out:{ stonebrick:2 }, in:{ stone:2, clay:1 }, station:'furn1', time:30 },
  { id:'r_tile', name:'烧瓦片', out:{ tile:2 }, in:{ clay:2 }, station:'furn1', time:30 },
  { id:'r_charcoal', name:'烧木炭', out:{ charcoal:1 }, in:{ wood:2 }, station:'furn1', time:30 },
  { id:'r_ironingot', name:'炼铁锭', out:{ ironingot:1 }, in:{ ironore:2, charcoal:1 }, station:'furn1', time:45 },
  { id:'r_steelingot', name:'炼钢锭', out:{ steelingot:1 }, in:{ ironingot:1, charcoal:1 }, station:'furn2', time:60 },
  { id:'r_blackingot', name:'炼玄铁锭', out:{ blackingot:1 }, in:{ blackiron:2, charcoal:1 }, station:'furn3', time:90 },
  { id:'r_mithrilingot', name:'炼秘银锭', out:{ mithrilingot:1 }, in:{ mithril:2, charcoal:1 }, station:'furn3', time:90 },
  { id:'r_goldingot', name:'熔炼金锭', out:{ goldIngot:1 }, in:{ goldore:8, charcoal:4 }, station:'furn2', time:120, fixedMats:true },
  { id:'r_nail', name:'打铁钉', out:{ nail:4 }, in:{ ironingot:1 }, station:'furn1', time:30 },
  { id:'r_ironpart', name:'打铁件', out:{ ironpart:1 }, in:{ ironingot:1 }, station:'work1', time:45 },
  { id:'r_claypot', name:'烧陶锅', out:{ claypot:1 }, in:{ clay:2 }, station:'furn1', time:30 },
  // 盐的用途规划（作者 2026-09-19）：鞣革要盐、熏肉要盐、肉汤要盐 —— 盐不再只服务腌肉/肉干
  { id:'r_leather', name:'鞣皮革', out:{ leather:1 }, in:{ hide:1 }, station:'tannery', time:30 },
  { id:'r_cloth', name:'纺布', out:{ cloth:1 }, in:{ fiber:4 }, station:'spin', time:45 },
  { id:'r_felt', name:'压毛毡', out:{ felt:1 }, in:{ wool:2 }, station:'spin', time:45 },
  { id:'r_canvas', name:'织帆布', out:{ canvas:1 }, in:{ cloth:2, resin:1 }, station:'loom', time:60 },
  { id:'r_silkcloth', name:'纺蛛丝', out:{ cloth:1 }, in:{ silk:2 }, station:'spin', time:40 },
  { id:'r_basket', name:'编竹篓', out:{ basket:1 }, in:{ bamboo:6, vine:2 }, station:'work1', time:45 },
  // 工具
  {id:'r_reedpack',name:'苇编背包',out:{reedPack:1},in:{thatch:12,vine:4},station:'none',time:30},
  {id:'r_leatherpack',name:'皮革背包',out:{leatherPack:1},in:{leather:6,rope:3},station:'work1',time:60},
  {id:'r_expeditionpack',name:'远行背包',out:{expeditionPack:1},in:{canvas:6,leather:4,ironpart:2},station:'work2',time:90},
  { id:'r_axestone', name:'石斧', out:{ axeStone:1 }, in:{ wood:2, flint:2 }, station:'none', time:20 },
  { id:'r_axestone_vine', name:'石斧·枝藤配方', out:{axeStone:1}, in:{branch:2,vine:1,flint:2}, station:'none', time:20 },
  { id:'r_axeiron', name:'铁斧', out:{ axeIron:1 }, in:{ ironingot:2, wood:2 }, station:'work1', time:40 },
  { id:'r_axesteel', name:'钢斧', out:{ axeSteel:1 }, in:{ steelingot:2, wood:2 }, station:'work2', time:50 },
  { id:'r_pickstone', name:'石镐', out:{ pickStone:1 }, in:{ wood:2, flint:2 }, station:'none', time:20 },
  { id:'r_pickiron', name:'铁镐', out:{ pickIron:1 }, in:{ ironingot:2, wood:2 }, station:'work1', time:40 },
  { id:'r_picksteel', name:'钢镐', out:{ pickSteel:1 }, in:{ steelingot:2, wood:2 }, station:'work2', time:50 },
  { id:'r_pickblack', name:'玄铁镐', out:{ pickBlack:1 }, in:{ blackingot:2, wood:2 }, station:'work3', time:60, needBp:'bpBlack' },
  { id:'r_knife', name:'石质匕首', out:{ knifeStone:1 }, in:{ wood:1, flint:1 }, station:'none', time:15 },
  { id:'r_irondagger', name:'铁匕首', out:{ ironDagger:1 }, in:{ ironingot:1, wood:1 }, station:'work1', time:40 },
  { id:'r_blackgreatsword', name:'玄铁大剑', out:{blackGreatSword:1}, in:{blackingot:8,steelingot:4,plank:3}, station:'work2', time:180, needBp:'bpBlack' },
  { id:'r_irongreatsword', name:'铁大剑', out:{ ironGreatSword:1 }, in:{ ironingot:5, wood:2 }, station:'work2', time:120 },
  { id:'r_hoe', name:'锄头', out:{ hoe:1 }, in:{ wood:2, stone:2 }, station:'none', time:20 },
  { id:'r_rod', name:'鱼竿', out:{ rod:1 }, in:{ bamboo:3, vine:2 }, station:'work1', time:15 },
    // 渔网（作者 2026-09-19：造价略微提高 6藤蔓+3木 → 8藤蔓+4木）
    { id:'r_net', name:'渔网', out:{ net:1 }, in:{ vine:8, wood:4 }, station:'work1', time:30 },
  { id:'r_trap', name:'陷阱', out:{ trap:1 }, in:{ wood:3, vine:3 }, station:'work1', time:20 },
  { id:'r_split', name:'劈柴', out:{ branch:4 }, in:{ wood:2 }, station:'none', time:10 },
  { id:'r_lantern', name:'提灯', out:{lantern:1}, in:{ironpart:2,wood:2,resin:2,cloth:1}, station:'work2', time:60, sortPriority:-20 },
  { id:'r_torch', name:'火把', out:{ torch:1 }, in:{ branch:2, resin:1 }, station:'none', time:10 },
  { id:'r_tinder', name:'火绒', out:{ tinder:1 }, in:{ flint:1, thatch:2 }, station:'none', time:10 },
  { id:'r_spyglass', name:'望远镜', out:{ spyglass:1 }, in:{ crystal:1, eaglefeather:1, wood:2 }, station:'work2', time:60 },
  // 武器
  { id:'r_club', name:'木棒', out:{ club:1 }, in:{ wood:2 }, station:'none', time:10 },
  { id:'r_spear', name:'石矛', out:{ spear:1 }, in:{ wood:1, flint:1 }, station:'none', time:20 },
  { id:'r_ironsword', name:'铁剑', out:{ ironSword:1 }, in:{ ironingot:2, wood:1 }, station:'work1', time:60 },
  { id:'r_steeldagger', name:'钢匕首', out:{ steelDagger:1 }, in:{ steelingot:2, leather:1 }, station:'work2', time:70 },
  { id:'r_blackdagger', name:'玄铁匕首', out:{ blackDagger:1 }, in:{ blackingot:2, mithrilingot:1, dragonbone:1 }, station:'work3', time:100, needBp:'bpBlack' },
  { id:'r_steelsword', name:'钢剑', out:{ steelSword:1 }, in:{ steelingot:2, wood:1 }, station:'work2', time:90 },
  { id:'r_blacksword', name:'玄铁剑', out:{ blackSword:1 }, in:{ blackingot:2, mithrilingot:1, dragonbone:1 }, station:'work3', time:120, needBp:'bpBlack' },
  { id:'r_bow', name:'猎弓', out:{ bow:1 }, in:{ bamboo:4, vine:2, sinew:1 }, station:'work1', time:60 },
  { id:'r_arrow', name:'箭矢×3', out:{ arrow:3 }, in:{ wood:1, flint:1 }, station:'none', time:15 },
  { id:'r_eaglearrow', name:'鹰羽箭', out:{ eagleArrow:1 }, in:{ arrow:1, eaglefeather:1 }, station:'work2', time:20 },
  // 防具衣物
  { id:'r_grassarmor', name:'草甲', out:{ grassArmor:1 }, in:{ thatch:6, vine:2 }, station:'none', time:30 },
  { id:'r_leatherarmor', name:'皮甲', out:{ leatherArmor:1 }, in:{ leather:3, vine:2 }, station:'work1', time:60 },
  { id:'r_ironarmor', name:'铁甲', out:{ ironArmor:1 }, in:{ ironingot:4 }, station:'work2', time:90 },
  { id:'r_blackarmor', name:'玄铁甲', out:{ blackArmor:1 }, in:{ blackingot:4, mithrilingot:1, dragonbone:1 }, station:'work3', time:120, needBp:'bpBlack' },
  { id:'r_grasscloth', name:'草衣', out:{ grassCloth:1 }, in:{ thatch:4 }, station:'tailor', time:20 },
  { id:'r_hempcloth', name:'麻衣', out:{ hempCloth:1 }, in:{ fiber:4 }, station:'tailor', time:20 },
  { id:'r_leathercloth', name:'皮衣', out:{ leatherCloth:1 }, in:{ leather:3 }, station:'tailor', time:40 },
  { id:'r_furcoat', name:'毛皮大衣', out:{ furCoat:1 }, in:{ hide:4, wool:4 }, station:'tailor', time:90 },
  // 食物
  // 烧雪水（作者 2026-09-25）：冬季专属水源。**2 积雪 + 1 木材 = 1 淡水**（15 分钟，不要陶罐）。
  // ⚠️ 作者 2026-09-25 二次调整："削弱一下雪，变成两个雪只能烧一份淡水"（原来 2 积雪 → 2 淡水）。
  //    现在比「取水」贵：取水 20 分钟 2~3 份，烧雪水 15 分钟 1 份 + 还要 1 木材。
  //    冬天取水被双重折扣压到每次 1 份，所以这条线仍然值得跑，只是不再比取水更划算。
  { id:'r_meltwater', name:'烧雪水', out:{ water:1 }, in:{ snow:2, wood:1 }, station:'fire', time:15 },
  { id:'r_roastfish', name:'烤鱼', out:{ roastFish:1 }, in:{ fish:1, wood:1 }, station:'fire', time:20 },
  { id:'r_roastmeat', name:'烤肉', out:{ roastMeat:1 }, in:{ meat:1, wood:1 }, station:'fire', time:20 },
  { id:'r_vegsoup', name:'野菜汤', out:{ vegSoup:1 }, in:{ wildveg:1, water:1 }, station:'fire', time:20, needItem:'claypot' },
  { id:'r_meatsoup', name:'肉汤', out:{ meatSoup:1 }, in:{ meat:1, water:1, wood:1, salt:1 }, station:'fire', time:25, needItem:'claypot' },
  // 蜂蜜水：五维全给，原料却只要蜂箱白给的蜂蜜 —— 加一份草药把它变成"药膳"（作者 2026-09-22 定案）
  { id:'r_honeywater', name:'蜂蜜水', out:{ honeyWater:1 }, in:{ honey:2, water:1, herb:1 }, station:'fire', time:15, needItem:'claypot' },
    { id:'r_smokedfish', name:'熏鱼', out:{ smokedFish:1 }, in:{ fish:1, branch:2 }, station:'smoke1', time:40 },
    { id:'r_smokedmeat', name:'熏肉', out:{ smokedMeat:1 }, in:{ meat:1, branch:2 }, station:'smoke1', time:40 },
  { id:'r_saltedmeat', name:'腌肉', out:{ saltedMeat:1 }, in:{ meat:1, salt:1 }, station:'fire', time:20 },
  { id:'r_jerky', name:'肉干', out:{ jerky:1 }, in:{ meat:1, salt:1, wood:1 }, station:'smoke2', time:60 },
  // 晾肉架：一次挂两份肉（作者 2026-09-18：一批只晾 1 份、效率太低 → 改成一次晾两个）；
  // 挂上去只花 30 分钟，然后要晾满 20 小时才能取（晾晒期间这副架子不能晾别的）。
  // ⚠️ 出肉率（作者 2026-09-19 校准）：**1 份肉只晾出 2 条肉干**，所以一批（肉×2）= 肉干×4。
  //    原来是 1 份肉出 3 条 = 90 饱食/肉，是烟熏炉「肉×1+盐+柴 → 肉干×1（30 饱食）」的整整 3 倍，
  //    而且不要盐不要柴；改成 2 条后是 60 饱食/肉（烟熏炉的 2 倍），20 小时的等待才对得上收益。
  // 晾肉干：不加盐的肉干撑不到 30 天。要盐之后，肉干才从"白嫖口粮"变成"拿到盐才解锁的远行干粮"
  { id:'r_rackmeat', name:'晾肉干', out:{ jerky:4 }, in:{ meat:2, salt:2 }, station:'rack', time:30, hang:1200 },
  { id:'r_shellamulet', name:'贝壳护符', out:{ shellAmulet:1 }, in:{ rope:1, flint:1 }, station:'work1', time:15 },
  { id:'r_beastfang', name:'兽牙吊坠', out:{ beastFang:1 }, in:{ tusk:1, rope:1 }, station:'work1', time:15 },
  { id:'r_pearlneck', name:'珍珠项链', out:{ pearlNeck:1 }, in:{ pearl:1, rope:1 }, station:'work1', time:20 },
  { id:'r_hornamulet', name:'牛角护符', out:{ hornAmulet:1 }, in:{ horn:2, rope:1, hide:1 }, station:'work1', time:25 },
  { id:'r_woodshield', name:'木盾', out:{ woodShield:1 }, in:{ plank:3, rope:2 }, station:'work2', time:45 },
  { id:'r_ironshield', name:'铁盾', out:{ ironShield:1 }, in:{ ironingot:2, woodShield:1 }, station:'work2', time:90 },
  { id:'r_steelshield', name:'钢盾', out:{ steelShield:1 }, in:{ steelingot:2, ironShield:1 }, station:'work2', time:180 },
  { id:'r_dragonbone', name:'提炼龙骨', out:{ dragonbone:1 }, in:{ fossil:2 }, station:'furn1', time:60 },
  { id:'r_vegfry', name:'爆炒野菜', out:{ vegFry:1 }, in:{ wildveg:2, salt:1 }, station:'stove', time:15 },
  { id:'r_meatstew', name:'炖肉', out:{ meatStew:1 }, in:{ meat:2, salt:1, wood:1 }, station:'stove', time:25 },
  // 作者 2026-09-23 点名加的三道菜：萝卜炖肉 / 面包 / 蛋糕
  // 造价刻意压在"种田有回报"上：萝卜 2 根就能把一份炖肉升级；面包/蛋糕吃小麦。
  { id:'r_carrotstew', name:'萝卜炖肉', out:{ carrotStew:1 }, in:{ meat:2, carrot:2, water:1, salt:1 }, station:'stove', time:30, needItem:'claypot', needBp:'bpStew' },
  // 作者 2026-09-25：小麦 → 面粉 → 面包/蛋糕（面粉是中间产物）。
  //   · 磨面粉放在**灶台**，和面包/蛋糕同一个工位 —— 玩家在同一格里就能看见整条链，
  //     不用为了磨粉再去做一件家具（研钵虽然更像"研磨"，但它的配方都归在「药品」页，放吃的不合适）。
  //   · 换算：小麦×3 → 面粉×2；面包 面粉×2（≡小麦×3，成本没变）；蛋糕 面粉×3（≈小麦 4.5，原来 4，略贵一点点）。
  { id:'r_flour', name:'面粉', out:{ flour:2 }, in:{ wheat:3 }, station:'stove', time:20 },
  { id:'r_bread', name:'面包', out:{ bread:2 }, in:{ flour:2, water:1, wood:1 }, station:'stove', time:30 },
  { id:'r_cake', name:'蛋糕', out:{ cake:1 }, in:{ flour:3, egg:3, honey:2 }, station:'stove', time:45, needItem:'claypot', needBp:'bpCake' },
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
  // 大煎蛋：往锅里倒了两份淡水，那 水+60 就该被看见 —— 加野菜和盐，让它成为"菜蛋饼"而不是纯蛋
  { id:'r_bigomelette', name:'大煎蛋', out:{ bigOmelette:1 }, in:{ egg:5, wildveg:2, salt:1, water:2, wood:1 }, station:'fire', time:25, needItem:'claypot' },
  // 超级大蛋：不该是一份早餐，该是一场宴席。加兽肉与野菜、要盐调味，天然变成中期料理（数值不动）
  { id:'r_superegg', name:'超级大蛋', out:{ superEgg:1 }, in:{ egg:12, wildveg:4, salt:2, water:3, wood:3 }, station:'stove', time:40, needItem:'claypot', needBp:'bpOmelette' },
  // 蓝牛：运动饮料要有电解质 —— 蜂蜜从 1 提到 2，不能靠蜂箱白嫖
  // （2026-09-22 二次修订已去掉盐，注释同步修正，别让后来人以为配方里还有盐）
  { id:'r_bluebull', name:'蓝牛', out:{ blueBull:1 }, in:{ water:2, herb:3, honey:2 }, station:'medPot', time:45 },
  { id:'r_zhanglaoji', name:'张老吉', out:{ zhangLaoJi:1 }, in:{ water:2, herb:2 }, station:'pot', time:20, needItem:'claypot' },
  { id:'r_lotuspill', name:'不死丹', out:{ lotusPill:1 }, in:{ snowlotus:3 }, station:'medPot', time:60, needBp:'bpLotus' },
  { id:'r_tidevital', name:'潮生丹', out:{ tideVitalPill:1 }, in:{ queenSilk:1, rareFishE:1, atlantisCore:1, water:2 }, station:'medPot', time:120, permLimit:5 },
  { id:'r_abyssbreath', name:'渊息丹', out:{ abyssBreathPill:1 }, in:{ sharkfin:1, rareFishC:1, atlantisCore:1, water:2 }, station:'medPot', time:120, permLimit:5 },
  // 特殊
  { id:'r_gunpowder', name:'火药', out:{ gunpowder:1 }, in:{ niter:2, sulfur:1, charcoal:1 }, station:'mortar', time:30, needBp:'bpGunpowder' },
  { id:'r_smoke', name:'简易烟雾弹', out:{ smokeBomb:1 }, in:{ sulfur:1, niter:1, branch:2 }, station:'work1', time:20 },
  { id:'r_supplybox', name:'打包补给箱', out:{ supplybox:1 }, in:{ smokedMeat:20, water:20 }, station:'work2', time:60 },
  // 神弓限时制造已结束；物品与存档保留，旧玩家仍可使用。
];

// ---------- 建筑 ----------
// ---------- 作物（生长天数 / 基础产量；具体收获见 harvest） ----------
const CROPS = {
  seedCarrot: { name:'萝卜', out:'carrot', days:3, min:2, max:3 },
  seedWheat:  { name:'小麦', out:'wheat',  days:3, min:3, max:4 },
  seedHerb:   { name:'药草', out:'herb',   days:3, min:2, max:3 },
};

// 建筑链：house/fire/storage/wall/watch/dock/farm；家具：furniture 列表
const BUILDING_CHAINS = {
  cellar: [
    { tier:0, name:'地窖', mats:{ stonebrick:30, plank:20, ironpart:8, clay:20 }, time:240, cap:20, desc:'营地地下的20格独立食物储藏空间，仅存食物和饮品，腐坏速度降至三分之一。存取不会刷新保鲜；食之包可远程取食。' },
  ],
  house: [
    { tier:0, name:'帐篷', mats:{ wood:4, branch:4, thatch:6 }, time:60, storage:30, rest:0.6, warm:0, slots:1, desc:'海难后搭起的第一个家。传奇难度需自行建造。' },
    { tier:1, name:'草房', mats:{ plank:10, thatch:20, vine:6 }, time:240, storage:60, rest:0.8, warm:1, slots:2, desc:'铺着茅草顶的小屋，风雨不侵。' },
    { tier:2, name:'木屋', mats:{ plank:30, nail:15 }, time:480, storage:100, rest:1.0, warm:2, slots:4, desc:'结实的木屋，像个真正的家。' },
    { tier:3, name:'砖瓦房', mats:{ stonebrick:30, tile:20, nail:20 }, time:960, storage:150, rest:1.2, warm:3, slots:7, desc:'砖瓦房，全岛最体面的房子。' },
  ],
  fire: [
    { tier:0, name:'篝火', mats:{ wood:2, stone:3, flint:1 }, time:30, cook:1, warm:0, desc:'石与木搭的篝火，炊烟能招来商船。传奇难度需自行建造。' },
    // 火塘起要一份火绒（tinder）——把「火绒」这个原本没处用的物品接进生火链路。
    // 火绒是手工制作（燧石×1+茅草×2，station none），不卡工作台；旧档已建过火的不追缴。
    { tier:1, name:'火塘', mats:{ stonebrick:8, clay:4, tinder:1 }, time:120, cook:2, warm:1, desc:'石砌火塘，寒冷时温和供暖。' },
    { tier:2, name:'壁炉', mats:{ stonebrick:12, ironpart:2 }, time:240, cook:3, warm:2, desc:'屋内的壁炉，寒冷时供暖更强，不会因供暖过热。' },
  ],
  storage: [
    { tier:0, name:'储物箱', mats:{ wood:4, branch:4 }, time:45, cap:15, desc:'初级木箱，独立储存15格物品。传奇难度需自行建造。' },
    { tier:1, name:'大木箱', mats:{ plank:6, nail:2 }, time:120, cap:40, desc:'更大的木箱。' },
    { tier:2, name:'储物棚', mats:{ plank:12, nail:6 }, time:240, cap:80, desc:'木棚里整齐摆放着箱子，遮风挡雨。' },
    { tier:3, name:'仓库', mats:{ plank:16, nail:8 }, time:360, cap:120, desc:'仓库，家底厚实起来。' },
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
    { tier:3, name:'三级瞭望台', mats:{ stonebrick:16, ironpart:8, canvas:2, spyglass:1 }, time:480, unlock:['ruins'], weather24:1, info:1, desc:'解锁海域的遗迹分区，显示全岛情报与 24 小时天气；前往海域仍需造船。' },
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
  {id:'nightmareExtractor',name:'噩梦汲取仪',onlyDifficulty:'nightmare',station:'nightmareInfusion',mats:{plank:16,steelingot:12,mithrilingot:6,energyCrystal:4,anctDevice:4},time:360,desc:'以30份同阶魂魄作出不可撤回的选择；每阶魂魄仅可选择两次。'},
  {id:'soulSeparator',name:'解魂器',onlyDifficulty:'nightmare',station:'soul',mats:{wood:8,stone:6,ironpart:2},time:120,desc:'分解噩梦魂魄，获得物资；每份独立有20%概率获得1魂点、3%概率获得1星之点。'},
  // ⚠️ 作者 2026-09-21：原来的「工作台」拆成两条线——
  //   · 工具台（wb1/wb2/wb3，station 仍是 work1/2/3）：沿用旧 ID 语义，负责工具/武器原配方
  //   · 裁缝台（tailor，station='tailor'）：负责麻衣与适合的衣物配方；纺车/织布机职责保留
  { id:'wb1', name:'简易工具台', station:'work1', mats:{ plank:4, stone:4 }, time:60, desc:'敲敲打打的地方，做工具与武器。' },
  { id:'wb2', name:'精工工具台', station:'work2', mats:{ plank:8, ironpart:2 }, time:180, needPrev:'wb1', needCraft:2, desc:'能加工精细铁件。' },
  { id:'wb3', name:'高级工具坊', station:'work3', mats:{ ironpart:6, stonebrick:10 }, time:360, needPrev:'wb2', desc:'锻造顶级装备的工坊。' },
  // 裁缝台：成本刻意避开自身产物（不用 fiber/cloth），wood6+branch4+vine1（绳=藤蔓）即可，避免卡死
  { id:'tailor', name:'裁缝台', station:'tailor', mats:{ wood:6, branch:4, vine:1 }, time:90, desc:'缝制麻衣与各类衣物的地方。' },
  { id:'fr1', name:'简易熔炉', station:'furn1', mats:{ clay:6, stone:6 }, time:120, desc:'烧陶炼铁的小炉子。' },
  { id:'fr2', name:'砖熔炉', station:'furn2', mats:{ stonebrick:8, clay:4 }, time:180, needPrev:'fr1', desc:'温度更高，能炼钢。' },
  { id:'fr3', name:'高炉', station:'furn3', mats:{ stonebrick:12, ironpart:4 }, time:360, needPrev:'fr2', desc:'熔炼玄铁秘银的高炉。' },
  { id:'sm1', name:'烟熏炉', station:'smoke1', mats:{ stone:6, wood:4 }, time:60, desc:'熏鱼保鲜七日，熏肉保鲜十四日。' },
  { id:'sm2', name:'熏制房', station:'smoke2', mats:{ stonebrick:8, ironpart:2 }, time:180, needPrev:'sm1', desc:'批量熏制，能做肉干。' },
  // ⚠️ sleepH 统一 8 小时（作者 2026-09-15）：床的好坏体现在"体力恢复比例 rest"和"精神恢复 spirit"上，
  //    不再让好床睡得更短（以前 8/7/6/5，玩家会觉得"买了好床反而睡得更少"）。
  // ⚠️ 作者 2026-09-21：初期草床/木床/软床的体力恢复下调约 20~22%（原 0.7/0.9/1.0），
  //    保持"无床 < 草床 < 木床 < 软床 < 大床"的清晰递增；最高的「大床」属后期，维持 1.2 不削弱。
  // 作者 2026-09-23 反馈："希望有方法增加体力上限，比如做高级床，每级+5体力上限"
  // → stamCap 就是该床提供的**体力上限加成**（取当前拥有里最高的那张，不叠加）
  { id:'bed1', name:'草床', rest:0.58, sleepH:8, spirit:6, stamCap:5,  mats:{ thatch:10, wood:4 }, time:30, desc:'草铺的床。体力上限 +5。' },
  { id:'bed2', name:'木床', rest:0.9, sleepH:8, spirit:7, stamCap:10, mats:{ plank:4, cloth:2 }, time:60, needPrev:'bed1', desc:'木床睡得踏实。体力上限 +10。' },
  { id:'bed3', name:'软床', rest:1.0, sleepH:8, spirit:9, stamCap:15, mats:{ wool:4, felt:2, plank:4 }, time:120, needPrev:'bed2', desc:'铺着毛毡的软床。体力上限 +15。' },
  { id:'bed4', name:'大床', rest:1.2, sleepH:8, spirit:10, stamCap:20, mats:{ wool:6, felt:3, plank:6 }, time:180, needPrev:'bed3', desc:'宽敞的大床。体力上限 +20。' },
  { id:'stove', name:'灶台', station:'stove', mats:{ stone:8, clay:4 }, time:60, desc:'能同时煮两锅。' },
  { id:'rack', name:'晾肉架', station:'rack', mats:{ wood:6, vine:2 }, time:30, desc:'风干肉条。' },
  { id:'tannery', name:'制革架', station:'tannery', mats:{ wood:4, stone:4 }, time:30, desc:'把兽皮鞣成皮革。' },
  { id:'spin', name:'纺车', station:'spin', mats:{ wood:6, bamboo:4 }, time:60, desc:'纺线织布。' },
  { id:'loom', name:'织布机', station:'loom', mats:{ wood:8, ironpart:2 }, time:120, needPrev:'spin', desc:'织出结实的布匹。' },
  { id:'mortar', name:'研钵', station:'mortar', mats:{ stone:2 }, time:15, desc:'研磨药材。' },
  { id:'medPot', name:'药炉', station:'medPot', mats:{ clay:4, stone:4 }, time:60, needPrev:'mortar', desc:'炼制丹药。' },
  // 水壶系（储水）——家具，但**不占家具位**（在既有家具上加装的次级工位）
  { id:'tank', name:'水壶', mats:{ clay:6 }, time:60, desc:'储水罐：造好后口渴消耗 -20%，长期有效、不占家具位。' },
  { id:'rainfilter', name:'滤雨器', mats:{ clay:8, stonebrick:4, charcoal:2 }, time:120, needPrev:'tank', desc:'在水壶上加装滤网：保留 -20% 口渴效果。雨天将 2~4 份淡水存入滤雨器，去营地点击取水；储水上限 20。不占家具位。' },
  { id:'shelf', name:'书架', mats:{ plank:30, leather:10, ironpart:6 }, time:240, desc:'点击选择制造、采集或战斗集中，只能生效一种。获得对应经验时，有50%概率获得双倍经验；可随时切换。' },
  { id:'flag', name:'信号旗', mats:{ wood:4, cloth:2 }, time:30, desc:'升起旗帜，次日商船必来。' },
  { id:'signpost', name:'路标', travelBonus:0.1, mats:{ wood:4 }, time:30, desc:'赶路时间-10%。' },
  { id:'grindstone', name:'磨刀石', station:'grind', mats:{ stone:4, flint:1 }, time:40, desc:'磨刀/修补武器的石台。', grind:1 },
  { id:'coop', name:'鸡舍', mats:{ wood:10, vine:4 }, time:60, farmOnly:1, desc:'最多养 3 只鸡（在鸡舍管理里可以扩建两次：3 → 4 → 5 只）：外岛买的小鸡连喂 5 天小麦就长成母鸡，母鸡每天吃 1 份小麦、下一颗蛋，20~30 天后寿终（留 1 份兽肉）。**建在农田**，占 1 个农田畜牧位（不占住房家具位）。' },
  { id:'pen', name:'羊圈', mats:{ wood:12, vine:6 }, time:90, farmOnly:1, desc:'最多养 3 只羊：每只每天吃 1 份干草、产 1 份羊毛，40~60 天后寿终（留 3 份兽肉）。**建在农田**，占 1 个农田畜牧位（不占住房家具位）。' },
  // 养蜂人专属：每天清晨自动产 1 份蜂蜜（走 newDay 的 dailyItems 通用机制）；占 1 个家具位
  { id:'beehive', name:'蜂箱', mats:{ wood:8, thatch:6 }, time:90, onlyIdentity:'beekeeper', desc:'养蜂人专属。每天清晨储存蜂蜜×1，最多储存 12 份；点击蜂箱收取。占 1 个家具位。' },
  { id:'treadmill', name:'跑步机', mats:{ ironingot:10, ironpart:8, plank:10, leather:4 }, time:360, onlyIdentity:'trainer', desc:'健身教练专属。每天可选一种器材锻炼 6 小时；跑步最多 16 次，前 6 次生命上限各 +5，之后各 +2。占 1 个家具位。' },
  { id:'dumbbell', name:'哑铃架', mats:{ ironingot:8, ironpart:6, stonebrick:8, leather:3 }, time:300, onlyIdentity:'trainer', desc:'健身教练专属。每天可选一种器材锻炼 6 小时；举重最多 16 次，前 6 次攻击各 +0.5，之后各 +0.2。占 1 个家具位。' },
];

// 亚特兰蒂斯 · 礁石栖息地专属家具（独立家具位，与第一章互不干扰）
const ATLANTIS_FURNITURE = [
  {id:'seaStorage1',name:'海底储物箱',station:'seaStorage',mats:{deepCoral:4,stonebrick:2},time:45,capacity:20,desc:'独立储存20格物品，只能在礁石栖息地存取。'},
  {id:'seaStorage2',name:'加固海底储物箱',station:'seaStorage',mats:{deepCoral:6,sourceBar:2,pearlGranule:4},time:90,capacity:40,upgradeFrom:'seaStorage1',desc:'将海底储物箱升级为40格，原库存保留，替换原家具位。'},
  { id:'pearlWork', name:'珠光工作台', station:'pearlWork', mats:{ deepCoral:8, pearlGranule:10 }, time:120, desc:'制造潜水与源质装备。' },
  { id:'sourceForge', name:'源质熔炉', station:'sourceForge', mats:{ sourceOre:10, stonebrick:8 }, time:180, desc:'把源矿精炼成源质锭。' },
  { id:'repairBench', name:'修补台', station:'repair', mats:{ deepCoral:4, sourceBar:1 }, time:60, desc:'用亚特兰蒂斯材料修补潜水服/氧气罩。', repairDive:1 },
];

// 礁石栖息地可点击热点
const ATLANTIS_HOTSPOTS = [
  { id:'camp',   x:34, y:50, glyph:'➤', label:'礁石营地 · 建造' },
  { id:'warehouse', x:77, y:51, glyph:'➤', label:'海底储物箱' },
  { id:'repair', x:53, y:80, glyph:'✚', label:'修补台' },
  { id:'stone',  x:50, y:48, glyph:'◈', label:'传送石 · 回孤岛', needFlag:'ended_C' },
];
// 礁石栖息地家具对位（建造后在该坐标显示贴图）
const ATLANTIS_BUILD_POS = {
  seaStorage1: { x:77, y:54 },
  seaStorage2: { x:77, y:54 },
  pearlWork:   { x:28, y:69 },
  sourceForge: { x:52, y:60 },
  repairBench: { x:53, y:83 },
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
// 全彩地图重新绘制了地标，只调整画面热点；航行耗时继续使用上方原坐标。
const ATLANTIS_MAP_ARROWS_COLOR = {
  habitat:     { x:92, y:30, label:'礁石栖息地' },
  city:        { x:50, y:43, label:'沉没之城' },
  coral:       { x:36, y:23, label:'珊瑚生长带' },
  shipwreck:   { x:14, y:33, label:'沉船墓地' },
  coralForest: { x:17, y:76, label:'珊瑚森林' },
  pearlCave:   { x:55, y:18, label:'珍珠洞窟' },
  trench:      { x:81, y:52, label:'海沟' },
  abyss:       { x:91, y:78, label:'深渊裂谷' },
  sanctum:     { x:51, y:83, label:'深水圣殿' },
  home:        { x:8,  y:12, label:'↑ 返回孤岛' },
};

// 深海区（要摸黑/开灯才敢走的海底区域）：在这些区域附近游动，40% 会被海底怪物拦截
// 注意：不包含 礁石栖息地（安全营地）、沉没之城、珊瑚生长带（较浅）
const ATLANTIS_DEEP_ZONES = ['coralForest','pearlCave','shipwreck','trench','abyss','sanctum'];

// ---------- 敌人 ----------
// traits: charge首回合×2 / poison / flee高逃跑 / pack成群 / enrage狂暴 / evade高闪避 /
//         first先手 / water水中不可防御 / summon召唤 / gun火枪
//         （⛔ ironImmune「免疫铁器」已按作者 2026-09-23 要求**整个移除**：金属武器数值本身就高，
//           再给它们豁免减免等于双重优势。三个曾经的"铁甲"敌人 traits 已清空，别再恢复。）
const ENEMIES = {
  nightmare1:{id:'nightmare1',name:'梦魇·窃影',img:'assets/img/enemies/nightmare1.png',nightmare:1,hp:28,atk:7,def:1,spd:9,traits:['dread'],drops:[{id:'nightmareSoul',qty:'1-4',ch:1}],desc:'它伏在你的影子里，却比影子多出一张脸。'},
  nightmare2:{id:'nightmare2',name:'梦魇·枯行',img:'assets/img/enemies/nightmare2.png',nightmare:2,hp:48,atk:10,def:2,spd:10,traits:['dread'],drops:[{id:'nightmareSoul',qty:'1-4',ch:1}],desc:'细长的脚踩过落叶，声音却从你的耳后响起。'},
  nightmare3:{id:'nightmare3',name:'梦魇·缠骸',img:'assets/img/enemies/nightmare3.png',nightmare:3,hp:75,atk:13,def:4,spd:11,traits:['dread','enrage'],drops:[{id:'nightmareSoul2',qty:'1-4',ch:1}],desc:'骨架间的空洞里，另一副骨架正在缓慢爬动。'},
  nightmare4:{id:'nightmare4',name:'梦魇·空面',img:'assets/img/enemies/nightmare4.png',nightmare:4,hp:110,atk:16,def:5,spd:12,traits:['dread','nightStun'],drops:[{id:'nightmareSoul2',qty:'1-4',ch:1}],desc:'你看不见它的脸，却知道它一直在看你。'},
  nightmare5:{id:'nightmare5',name:'梦魇·百目',img:'assets/img/enemies/nightmare5.png',nightmare:5,hp:160,atk:20,def:7,spd:13,traits:['dread','enrage'],drops:[{id:'nightmareSoul3',qty:'1-4',ch:1}],desc:'每只眼睛里，都映着一个尚未发生的死亡。'},
  nightmare6:{id:'nightmare6',name:'梦魇·裂渊',img:'assets/img/enemies/nightmare6.png',nightmare:6,hp:225,atk:24,def:9,spd:14,traits:['dread','nightStun'],drops:[{id:'nightmareSoul3',qty:'1-4',ch:1}],desc:'裂口深处没有尽头。连风吹过它时，也会停下来。'},
  nightmareBoss:{id:'nightmareBoss',name:'噩梦之源',img:'assets/img/enemies/nightmare7.png',nightmare:7,boss:1,hp:580,atk:29,def:12,spd:13,traits:['nightSplit','dread','nightStun'],drops:[{id:'nightmareSoul',qty:'1-4',ch:1}],desc:'整个岛的恶梦，正在这张王座上醒来。分裂、恐吓与晕眩将轮流降临；防御可抵挡恐吓和晕眩。'},

  boar: { id:'boar',  name:'野猪', img:'assets/img/enemies/boar.png', hp:30, atk:8, def:2, spd:8, traits:['charge'], drops:[{ id:'meat', qty:'1-2', ch:0.7 },{ id:'hide', qty:1, ch:0.5 },{ id:'tusk', qty:1, ch:0.4 },{ id:'sinew', qty:1, ch:0.3 }], desc:'一头鬃毛竖起的野猪，獠牙对着你。' },
  goat: { id:'goat',  name:'岩羊', img:'assets/img/enemies/goat.png', hp:26, atk:8, def:2, spd:12, traits:['charge'], drops:[{ id:'meat', qty:'1-2', ch:0.7 },{ id:'hide', qty:1, ch:0.5 },{ id:'horn', qty:1, ch:0.35 }], desc:'长着一对厚重弯角的岩羊，站在峭壁上打量你。' },
  eagle: { id:'eagle', name:'雪羽鹰', img:'assets/img/enemies/eagle.png', elite:1, hp:50, atk:16, def:5, spd:14, traits:['first','evade'], drops:[{ id:'eaglefeather', qty:'1-2', ch:0.7 },{ id:'meat', qty:1, ch:0.4 }], desc:'一只翼展惊人的雪羽鹰，尖啸着守着这片矿脉。' },
  snake: { id:'snake',  name:'毒蛇', img:'assets/img/enemies/snake.png', hp:18, atk:6, def:1, spd:12, traits:['poison'], drops:[{ id:'snakegall', qty:1, ch:0.6 }], desc:'一条盘起的毒蛇，吐着信子。' },
  rabbit: { id:'rabbit',  name:'野兔', img:'assets/img/enemies/rabbit.png', hp:10, atk:2, def:0, spd:16, traits:['flee'], drops:[{ id:'meat', qty:1, ch:0.8 },{ id:'hide', qty:1, ch:0.3 }], desc:'一只受惊的野兔。' },
  wolf: { id:'wolf',  name:'狼', img:'assets/img/enemies/wolf.png', hp:45, atk:12, def:3, spd:14, traits:['pack'], drops:[{ id:'hide', qty:'1-2', ch:0.7 },{ id:'meat', qty:1, ch:0.6 },{ id:'sinew', qty:1, ch:0.5 }], desc:'灰狼伏低身子，喉咙里滚着低吼。' },
  ox: { id:'ox',  name:'野牛', img:'assets/img/enemies/ox.png', hp:70, atk:16, def:5, spd:10, traits:['enrage'], drops:[{ id:'meat', qty:'2-3', ch:0.9 },{ id:'hide', qty:2, ch:0.8 },{ id:'horn', qty:1, ch:0.4 }], desc:'一头野牛刨着蹄子，随时要冲过来。' },
  scorpion:{ id:'scorpion', name:'沙蝎', img:'assets/img/enemies/scorpion.png', hp:25, atk:10, def:2, spd:12, traits:['poison'], drops:[{ id:'venom', qty:1, ch:0.5 }], desc:'一只尾针高举的沙蝎。' },
  boneguard:{ id:'boneguard', name:'白骨守卫', img:'assets/img/enemies/boneguard.png', hp:60, atk:14, def:5, spd:8, traits:[], nightBuff:1, drops:[{ id:'fossil', qty:1, ch:0.5 },{ id:'dragonbone', qty:1, ch:0.15 },{ id:'coin', qty:1, ch:0.05 }], desc:'一具持刀的白骨缓缓转身，眼窝里两点幽火。' },
  bats: { id:'bats',  name:'蝙蝠群', img:'assets/img/enemies/bats.png', hp:15, atk:6, def:1, spd:16, traits:['evade'], drops:[{ id:'niter', qty:'1-2', ch:0.7 }], desc:'黑压压的蝙蝠群向你扑来。' },
  spider: { id:'spider',  name:'巨型蜘蛛', img:'assets/img/enemies/spider.png', hp:55, atk:13, def:3, spd:10, traits:['poison'], drops:[{ id:'silk', qty:'1-2', ch:0.7 },{ id:'venom', qty:1, ch:0.3 }], desc:'一只磨盘大的蜘蛛从洞顶落下。' },
  // minDay：前 30 天不会出现（玩家反馈"洞穴熊有点强"）——路上拦路、洞里狩猎都按这个门槛过滤
  cavebear:{ id:'cavebear', name:'洞穴熊', img:'assets/img/enemies/cavebear.png', hp:120, atk:20, def:7, spd:8, traits:['enrage'], minDay:30, drops:[{ id:'hide', qty:2, ch:0.9 },{ id:'meat', qty:3, ch:0.9 }], desc:'冬眠被惊醒的巨熊，站起时几乎顶到洞顶。' },
  leopard:{ id:'leopard', name:'雪豹', img:'assets/img/enemies/leopard.png', hp:90, atk:18, def:6, spd:18, traits:['first'], drops:[{ id:'hide', qty:2, ch:0.8 },{ id:'meat', qty:2, ch:0.7 }], desc:'雪豹在岩石间移动，像一道白色的影子。' },
  shark: { id:'shark',  name:'鲨鱼', img:'assets/img/enemies/shark.png', hp:100, atk:18, def:5, spd:14, traits:['water'], drops:[{ id:'sharkfin', qty:1, ch:0.6 },{ id:'meat', qty:2, ch:0.8 },{ id:'pearl', qty:1, ch:0.24 }], desc:'背鳍划开水面，绕着你打转。' },
  pirate: { id:'pirate',  name:'海盗', img:'assets/img/enemies/pirate.png', hp:60, atk:14, def:4, spd:12, traits:['pack'], drops:[{ id:'coin', qty:'1-3', ch:0.5 },{ id:'rope', qty:1, ch:0.5 },{ id:'gunpowder', qty:1, ch:0.3 }], desc:'几个持刀的海盗狞笑着围上来。' },
  guard: { id:'guard',  name:'遗迹守卫', img:'assets/img/enemies/guard.png', hp:120, atk:20, def:8, spd:6, traits:[], drops:[{ id:'coin', qty:'2-5', ch:0.7 },{ id:'crystal', qty:1, ch:0.5 }], desc:'石像发出沉闷的轰鸣，挡住了去路。' },
  wolfKing:{ id:'wolfKing', name:'狼王', img:'assets/img/boss_wolf.png', boss:1, hp:130, atk:22, def:8, spd:16, traits:['summon'], drops:[{ id:'wolfkingpelt', qty:1, ch:1 },{ id:'hide', qty:3, ch:1 }], desc:'狼王站在山丘上，目光比月亮还冷。' },
  spiderQueen:{ id:'spiderQueen', name:'蜘蛛女王', img:'assets/img/boss_spider.png', boss:1, hp:160, atk:22, def:7, spd:10, traits:['summon','poison'], drops:[{ id:'queenSilk', qty:1, ch:1 },{ id:'silk', qty:3, ch:1 }], desc:'蛛网中央，蜘蛛女王缓缓睁开八只眼睛。' },
  // 海盗头目：作者 2026-09-22 —— 金币 20→**12**、图纸概率 0.12→**0.08**（这个点位每天可刷，原数值刷烂了经济）
  pirateBoss:{ id:'pirateBoss', name:'海盗头目', img:'assets/img/boss_pirate.png', boss:1, hp:180, atk:26, def:9, spd:14, traits:['gun'], drops:[{ id:'coin', qty:12, ch:1 },{ id:'bpGunpowder', qty:1, ch:0.5 },{ id:'bpDive', qty:1, ch:0.08 },{ id:'bpShip', qty:1, ch:0.08 },{ id:'bpBlack', qty:1, ch:0.08 },{ id:'brokenPistol', qty:1, ch:0.35 }], desc:'独眼海盗头目举起火枪，狞笑着瞄准你。' },
  slateGuard:{ id:'slateGuard', name:'石板守卫', img:'assets/img/enemies/slateguard.png', boss:1, hp:170, atk:24, def:9, spd:7, traits:['stoneGuard'], drops:[{ id:'slate', qty:1, ch:1 },{ id:'coin', qty:12, ch:1 }], desc:'一尊通灵的石碑守卫镇守着石板：石甲把一部分伤害弹回给你，石躯符文闪烁。' },
  slateGuard2:{ id:'slateGuard2', name:'石板守卫', img:'assets/img/enemies/slateguard.png', elite:1, noDex:1, hp:150, atk:22, def:9, spd:7, traits:['stoneGuard'], drops:[{ id:'coin', qty:'4-8', ch:1 },{ id:'crystal', qty:1, ch:0.5 }], desc:'又一尊从碑前站起的石像守卫，守着山上的雪线。它不持石板，但石甲的符文照样反弹伤害。' },
  // 海底远程精英（作者 2026-09-19）：攻击距离 20，玩家近战要贴到它身边才打得着；它只在中层黑暗（照明 ≥2）出没。
  // 经验固定 +5（比普通怪高、比首领低）。
  atlSentry:{ id:'atlSentry', name:'深海哨兵', img:'assets/img/enemies/mechGuard.png', elite:1, exp:5, range:20,
    hp:110, atk:21, def:8, spd:9, traits:['pierce'], drops:[{ id:'sourceOre', qty:'1-2', ch:0.6 },{ id:'energyCrystal', qty:1, ch:0.35 }],
    desc:'悬在暗水里的机械哨兵，枪口始终对着你——它会在你靠近之前先开火。' },
  deepGuard:{ id:'deepGuard', name:'深海卫兵', img:'assets/img/enemies/deepGuard.png', hp:70, atk:16, def:6, spd:9, traits:[], drops:[{ id:'sourceOre', qty:1, ch:0.6 },{ id:'deepCoral', qty:1, ch:0.4 }], desc:'手持远古长矛的深海卫兵，眼灯幽蓝。' },
  tentacle:{ id:'tentacle', name:'触手哨兵', img:'assets/img/enemies/tentacle.png', hp:55, atk:14, def:4, spd:12, traits:['pack'], packAlways:1, drops:[{ id:'pearlGranule', qty:'1-2', ch:0.7 }], desc:'从深暗中伸出的触手哨兵，一下一下地收缩——而且从来不单独出现。' },
  mechGuard:{ id:'mechGuard', name:'机械守卫', img:'assets/img/enemies/mechGuard.png', hp:120, atk:20, def:8, spd:7, traits:[], drops:[{ id:'anctDevice', qty:1, ch:0.5 },{ id:'sourceBar', qty:1, ch:0.3 }], desc:'远古机械守卫，在尘埃中缓缓苏醒。' },
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
    { id:'c2', name:'兽皮订单', need:{ hide:10 }, reward:{ steelingot:2, beibi:80, fame:0.5 }, from:8, text:'对岸的裁缝要 10 张兽皮。' },
    { id:'c3', name:'珍珠委托', need:{ pearl:3 }, reward:{ coin:10, beibi:50, fame:0.5 }, from:14, text:'有人高价求 3 颗珍珠。' },
    { id:'c4', name:'剿灭海盗', type:'kill', target:'pirateBoss', reward:{ coin:30, steelingot:3, fame:0.5 }, from:20, text:'海岸海盗为祸，悬赏海盗头目！' },
    { id:'c5', name:'古生物收藏', need:{ fossil:3 }, reward:{ coin:20, blackingot:2, fame:0.5 }, from:22, text:'对岸的学者想收三块骨化石做研究——石板那种东西，他让你自己留着。' },
  ],
};

// 季度委托：每季从候选里稳定随机出一份，同一轮四季结束后才可再做。
const SEASONAL_COMMISSIONS = {
  '春': [
    { id:'s_spring_wood', name:'春修木料', need:{ wood:15, branch:15 }, reward:{ coin:8, fame:0.5 }, text:'盐镇修船，急需一批新伐木料。' },
    { id:'s_spring_food', name:'春季野味', need:{ berry:12, fish:8 }, reward:{ beibi:50, fame:0.5 }, text:'春市要摆一桌岛上的新鲜野味。' },
  ],
  '夏': [
    { id:'s_summer_hide', name:'夏日皮革', need:{ hide:6, bamboo:12 }, reward:{ coin:12, fame:0.5 }, text:'裁缝要做一批遮阳棚和皮具。' },
    { id:'s_summer_fish', name:'盛夏鱼获', need:{ fish:16, salt:4 }, reward:{ beibi:80, fame:0.5 }, text:'炎热天气里，鱼商想收鱼和盐作为腌鱼原料。' },
  ],
  '秋': [
    { id:'s_autumn_grain', name:'秋收粮食', need:{ wheat:18, mushroom:8 }, reward:{ coin:15, fame:0.5 }, text:'镇上的粮仓要补足入冬的口粮。' },
    { id:'s_autumn_cake', name:'秋市甜点', need:{ cake:3 }, reward:{ beibi:270, fame:0.5 }, text:'秋市需要新烤的蛋糕，赏钱比日常回收丰厚。' },
    { id:'s_autumn_honey', name:'秋日甜酿', need:{ honey:6, carrot:12 }, reward:{ beibi:90, fame:0.5 }, text:'酒馆收些蜂蜜和秋菜。' },
  ],
  '冬': [
    { id:'s_winter_smoke', name:'寒冬熏鱼', need:{ smokedFish:12, wool:6 }, reward:{ coin:20, fame:0.5 }, text:'冬季船队需要耐放的粮食和保暖羊毛。' },
    { id:'s_winter_cloth', name:'冬衣备料', need:{ felt:8, smokedMeat:8 }, reward:{ beibi:100, fame:0.5 }, text:'镇上裁缝与守夜人要备过冬物资。' },
  ],
};

// 盐镇集市
const TOWN = {
  grocer: { name:'杂货商', needFame:0, sell:[
      { id:'salt', base:20 }, { id:'seedCarrot', base:15 }, { id:'seedWheat', base:20 }, { id:'seedHerb', base:30 },
      { id:'cloth', base:35 }, { id:'felt', base:30 }, { id:'nail', base:15 }, { id:'rope', base:8 },
      { id:'hay', base:6, from:5 }, { id:'chick', base:80, from:10 },
      { id:'wheat', base:8, from:3 },
      { id:'arrow', base:24, from:3 }, { id:'eagleArrow', base:95, from:20 },
    ], buy:[ { id:'fish', base:5 }, { id:'carrot', base:5 }, { id:'wheat', base:4 }, { id:'honey', base:35 }, { id:'snakegall', base:18 }, { id:'salt', base:15 }, { id:'silk', base:18 } ] },
  smith: { name:'铁匠', needFame:1, sell:[
      { id:'steelingot', base:150 }, { id:'blackingot', base:400 }, { id:'ironSword', base:200 },
      { id:'steelSword', base:400 }, { id:'ironArmor', base:350 },
    ], buy:[ { id:'ironore', base:15 }, { id:'charcoal', base:10 }, { id:'goldore', base:55 }, { id:'goldIngot', base:650 } ] },
  informant:{ id:'informant', name:'情报贩子', needFame:2, sell:[
      { id:'seachart', base:150, currency:'coin' }, { id:'bpShip', base:500, currency:'beibi', kind:'bp' },
      { id:'bpDive', base:400, currency:'beibi', kind:'bp' },
    ], buy:[ { id:'pearl', base:220 }, { id:'anctDevice', base:120 }, { id:'sourceOre', base:40 }, { id:'sourceBar', base:260 }, { id:'tideSteel', base:180 } ] },
  // 作者 2026-09-24：对岸新增「美食家」，卖三道进阶料理的食谱（声望 3 解锁）。
  // 拿到食谱前这三道菜在制造栏里**完全不显示**（见 renderCraft 的 needBp 过滤）。
  gourmet: { name:'美食家', needFame:3, sell:[
      { id:'honey', base:120 },
      { id:'bpStew', base:260, kind:'bp' }, { id:'bpOmelette', base:320, kind:'bp' }, { id:'bpCake', base:360, kind:'bp' },
    ], buy:[ { id:'carrotStew', base:28 }, { id:'cake', base:50 }, { id:'superEgg', base:130 }, { id:'roastFish', base:8 }, { id:'meatStew', base:22 } ] },
};

// 黑市（沉船湾 · 独眼）
const BLACKMARKET = {
  sell: [ { id:'gunpowder', base:120 }, { id:'antidote', base:40 }, { id:'niter', base:35 }, { id:'sulfur', base:35 }, { id:'bpBlack', base:400, kind:'bp' } ],
  buy: [ { id:'venom', base:60 }, { id:'silk', base:20 }, { id:'queenSilk', base:500 } ],
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
  // ⚠️ 送神物的奇遇：作者 2026-09-19 要求"获得概率减半" → 出现权重砍半（4→2、5→2.5）
  // ⚠️ 石龛的选项在 game.js 的 triggerShrine() 里**动态生成**（作者 2026-09-25：
  //    "文案写着供着三件神物，却只让你看一眼、不让你选" → 改成真·三选一），
  //    所以这里 choices 是空的，别往这里加选项，加了也不会被读到。
  //    另外：石龛的池子里**没有**亚特兰蒂斯之种（之种可从海底神秘鱼人交换或商城购买，见 triggerShrine）。
  { id:'re_shrine', scene:'cave', w:2, once:1, text:'洞壁暗处，一扇被藤蔓掩埋的石龛微微发光，里面供着三件神物。', choices:[] },
  // ⛔ 「神秘商人」(re_peddler) 已按作者 2026-09-23 要求**删除**。
  //    亚特兰蒂斯之种可通过商城购买或海底「神秘鱼人」交换获得（见沉船墓地 atl_fishman），
  //    不再有"对岸遇到神秘人 30 金币换神物"这条线。不要再把它加回来。
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
  { id:'camp', x:43, y:28, glyph:'➤', label:'营地建造' },
  { id:'room', x:28, y:61, glyph:'◈', label:'进屋', needBuild:'house', lvl:0 },
  { id:'sleep', x:28, y:61, glyph:'☾', label:'睡觉' },
  { id:'honey', x:46, y:46, glyph:'⬡', label:'蜂箱 · 收蜜', needFurn:['beehive'] },
  { id:'warehouse',  x:66, y:55, glyph:'➤', label:'仓库', needBuild:'storage', lvl:0 },
  { id:'cellar', x:79, y:68, glyph:'▣', label:'地窖', needBuild:'cellar', lvl:0 },
  { id:'fire', x:49, y:66, glyph:'➤', label:'篝火 · 烹饪', needBuild:'fire', lvl:0 },   // 烹饪区位于营地内部，入口通道留空
  { id:'atlantis', x:80, y:28, glyph:'◈', label:'传送石 · 亚特兰蒂斯', needFlag:'ended_C' },
];

// 营地场景铺地上的建筑精灵位置（% 坐标，均为中心；宽度按背景宽度百分比）
const CAMP_BUILD_POS = {
  // ⚠️ y 越大表示越靠画面下方（越近），渲染时会按 y 排叠放次序 —— 见 ui.js renderCampBuildings
  // 住处与蜂箱在左侧，仓库在右后方，烹饪区向内移，前方入口留空。
  house:[28,52], hive:[46,42], fire:[49,64], store:[66,47], cellar:[79,72], wall:[50,74], dock:[87,26], farm:[68,80],
};

// ---------- 各场景可点击热点（point = 对应交互点 id，直接点击图片触发） ----------
const SCENE_HOTSPOTS = {
  forest: [
    { x:21, y:44, point:'forest_tree',   label:'砍伐' },   // 右移：别被左侧日志栏压住
    { x:30, y:28, point:'forest_hive',   label:'蜂巢' },
    { x:62, y:52, point:'forest_vine',   label:'藤蔓' },
    { x:74, y:76, point:'forest_mushroom', label:'蘑菇' },
    { x:50, y:82, point:'forest_herb',   label:'草药' },
    // 作者 2026-09-19：兽径挪到「草药」和「蘑菇」中间，三个采集点看着成一条线
    { x:62, y:79, point:'forest_hunt',   label:'兽径' },
    { x:28, y:64, point:'forest_resin',  label:'割脂' },
    { x:46, y:76, point:'forest_berry',  label:'野莓' },
  ],
  bamboo: [
    {x:80,y:72,point:'bamboo_mushroom',label:'蘑菇'},
    // 作者 2026-09-19：砍竹/剖竹再右移一点，彻底躲开左侧日志栏
    { x:26, y:50, point:'bamboo_cut',    label:'砍竹' },
    { x:34, y:38, point:'bamboo_fiber',  label:'剖竹' },
    { x:36, y:74, point:'bamboo_shoot',  label:'竹笋' },
    // 竹影深处：挪进底图那大片最暗的竹林里（按底图亮度算出来的最暗区中心 ≈ x66 / y50）
    { x:66, y:50, point:'bamboo_deep',   label:'竹影深处' },
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
    {x:72,y:78,point:'river_mushroom',label:'蘑菇'},
    { x:48, y:50, point:'river_water', label:'取水' },
    { x:37, y:42, point:'river_snow',  label:'采雪' },   // 冬季才亮；贴着取水点，冬天一眼能看到第二条水源
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
    // 作者 2026-09-25：鸡舍/羊圈搬到农田 → 农田多一个「农场管理」热点（农事 + 畜牧位都在这里）
    { id:'ranch', x:78, y:46, glyph:'⛭', label:'农场管理' },
  ],
  grassland: [
    {x:78,y:82,point:'grass_mushroom',label:'蘑菇'},
    { x:74, y:62, point:'grass_wool',  label:'剪羊毛' },
    { x:52, y:42, point:'grass_hunt',  label:'狩猎' },
    { x:30, y:72, point:'grass_herb',  label:'草药' },
    { x:82, y:32, point:'grass_horse', label:'野马' },
    { x:40, y:58, point:'grass_trap',  label:'布陷阱' },
    { x:58, y:74, point:'grass_hay',   label:'干草' },
    { x:20, y:62, point:'grass_wolfden', label:'狼穴' },   // 右移：别被左侧日志栏压住
  ],
  cave: [
    { x:18, y:40, point:'cave_iron',   label:'洞壁铁矿' },
    { x:62, y:30, point:'cave_bats',   label:'蝙蝠粪' },
    { x:84, y:54, point:'cave_moss',   label:'发光苔藓' },
    { x:18, y:72, point:'cave_deep',   label:'深处矿脉' },
    // 作者 2026-09-22：蛛巢移到「中央偏下」，与深处矿脉/发光苔藓拉开（保证不遮挡）
    { x:84, y:78, point:'cave_queen',  label:'蛛巢' },
    // 作者 2026-09-22：黑暗兽吼放到「洞穴中央」（原来在 28,72 太靠左下，和深处矿脉挤在一角）
    { x:48, y:62, point:'cave_guard',  label:'黑暗兽吼' },
    { x:40, y:16, point:'cave_slate',  label:'遗迹石板' },
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
  'LAOBANDAQI': { retired:true, soul:10000, adCoins:1000 },
  'GANXIEPINGJIA': { retired:true, soul:300, adCoins:30 },
  'XIEXIELAOBAN': { retired:true, item:'divineSuperPack', qty:1 },
  'SHENJIA2026': { retired:true, item:'divineArmor', qty:1 },
  'SHENGONG2026': { retired:true, item:'divineBow', qty:1 },  // 神弓：每个账号一次，先投递到邮箱
  // 已下架，仅保留旧邮件回执迁移所需的奖励定义。
  'GUOQING2026': { retired:true, mails:[{ soul:200 }, { item:'namecard', qty:1 }] },
  'GUYU2026': { soul: 50 },
  'QQ1014679931': { item: 'namecard', qty: 1 },
  'NEICEWANJIA': { retired:true, soul: 300 },   // 内部秘密码：300魂点（不展示在活动页）
  'HAPPY1': { item: 'namecard', qty: 1 },
  'HAPPY2': { soul: 80 },
  'CORE4': { retired:true, item: 'deepCore', qty: 4 },   // 神殿核心补偿：受"守卫怪顶掉一次性点位"影响的玩家，可领 4 块深殿核心
  // 送礼用的码（只在代码里，不写进活动页/公告，玩家不会自己看到）
  'HAPPY9': { retired:true, relic: 'vampire' },        // 吸血宝石
  'HAPPY8': { retired:true, relic: 'dodge' },          // 闪避护符
  'HAPPY7': { retired:true, relic: 'satchel' },        // 食之包
  'HAPPY6': { retired:true, relic: 'bloodvest' },      // 血色背心
  'HAPPY5': { retired:true, relic: 'atlantisSeed' },   // 亚特兰蒂斯之种
  'RESOURCE1': { retired:true, item: 'coin', qty: 10 },   // 10 枚古金币
  'SHIBAN': { retired:true, item: 'slate', qty: 1 },      // 石板补给：石板×1（救济码，不写公告）
};

// ---------- 内置更新公告（会以邮件形式发到游戏里）----------
// ---------- 全流程攻略（主页右上角「攻略」按钮）----------
// ⚠️ 作者要求写明"版本每天变化，仅供参考" —— 数值/配方/门槛每个版本都可能动，
//    所以顶部那句免责声明必须保留，改攻略时也要顺手核对里面的数字。
const GUIDE_NOTE = '按页查看流程与操作，具体材料和属性可在制作页、图鉴查看。';
const GUIDE = [
  {
    "title": "开局与营地",
    "enTitle": "Getting Started",
    "steps": [
      "先打开背包，查看已有的食物、工具和武器；点击物品看详情，食物和药品从详情页使用。",
      "先保证淡水、食物和休息。河畔取水，树林和河畔采集食物；生鱼、生肉可能引起反胃，优先烹饪。",
      "准备石斧、石镐，收集木材、燧石、石头和茅草，再发展工具台、熔炉和床。所需材料看制作与营地建造页。",
      "点击营地建筑进入管理；床和住所改善休息，仓库收纳物资，围墙降低夜袭风险。生命、体力、饱食、水分、精神和健康要分别照顾。"
    ],
    "enSteps": [
      "Open your backpack to check starting supplies. Tap an item for details; use food and medicine from that screen.",
      "Secure water, food and rest. Collect water at the river and forage nearby. Raw fish and meat can cause nausea; cook them when possible.",
      "Prepare a stone axe and pickaxe, gather basic materials, then develop your workbench, furnace and bed. Check crafting and camp construction for costs.",
      "Tap camp buildings to manage them. Beds and housing improve rest, storage holds supplies, and walls reduce raid risk. Health, stamina, hunger, thirst, spirit and wellness need separate care."
    ]
  },
  {
    "title": "背包、装备与仓库",
    "enTitle": "Inventory and Storage",
    "steps": [
      "背包、装备、制作的顶部页签可以直接切换；背包分类帮助快速找到食物、工具、药品。",
      "普通背包：轻点看详情，长按物品选择批量丢弃。食物详情可食用；装备页点击槽位更换，点击卸下移除装备。",
      "仓库：左侧是背包，右侧是当地仓库。轻点物品搬一份；长按后可继续左右拖动选数量，松开后确认批量存入或取出。",
      "自动存入可勾选物资，回到对应营地时执行；保存并立即存入可当场执行。仓库满时物品留在背包。",
      "营地内制作、建造可使用当地仓库材料；野外不能借用营地库存。超载会增加移动体力消耗，整理后恢复。"
    ],
    "enSteps": [
      "Use the top tabs to switch directly between backpack, equipment and crafting. Categories help you find supplies quickly.",
      "In the backpack, tap for details or hold an item to discard a chosen quantity. Eat from food details. Tap equipment slots to change gear, or use Unequip.",
      "Storage shows your backpack on the left and local stock on the right. Tap to move one item; hold and drag horizontally to choose a quantity, then confirm.",
      "Choose supplies under Auto Store. They are deposited when you return to the matching camp. Save and Store Now runs it immediately; a full warehouse leaves items in your bag.",
      "At camp, crafting and construction can use local stored materials. Outside camp, they cannot. Overloading increases travel stamina costs until you reduce your load."
    ]
  },
  {
    "title": "制造与长按操作",
    "enTitle": "Crafting and Hold Actions",
    "steps": [
      "制作页先选工位与分类，再查看配方材料；缺少工位、图纸或材料时，按钮会提示原因。",
      "高炉需先建砖熔炉，准备石砖12、铁件4，并满足建造页的制造等级和家具位要求；不需要高炉图纸。削木板每批消耗4木材：基础产出2木板（30分钟），使用铁斧或钢斧产出3木板（20分钟）；砖熔炉可成批烧砖。营地建造里的船坞负责升级船只，地图上的地点用于出海探索。",
      "轻点制作按钮制作一份，长按打开批量制作并选择次数。晾晒等需等待的配方一次只能挂一批，完成后先收取。",
      "商人界面的购买、出售、贝壳和金币兑换按钮，轻点操作一份，长按选择批量数量；图纸等物品按实际可买数量处理。",
      "长按食之包卡面，选择优先食物、优先饮料和禁食物品，每类最多3种；点已选物品可取消。优先物品用完会自动选择其他安全物品，禁食始终生效。地窖物品长按可批量存入或丢弃。",
      "潮生丹和渊息丹各有制作上限，但服用不限次数。查看物品说明区分回复生命、恢复健康和提高上限的效果。",
      "自动取用工具默认关闭，可在设置开启；开启后会选背包或当前营地仓库中等级最高的可用工具，不填工具槽，野外不借仓。关闭时使用已装备工具。钢工具的价值还包括采集更快、更省体力和更长耐久。",
      "食之包需要装备才会生效，每游戏小时检查一次：饱食或水分低于50时，各补一份合规物品，不会立即补满。可取用背包与对应区域仓库；岛上有地窖时也可取用地窖，地窖并非必需。岛海库存不互通。"
    ],
    "enSteps": [
      "Choose a crafting station and category, then check recipe costs. Disabled actions explain missing stations, blueprints or materials.",
      "A Blast Furnace needs a Brick Furnace, 12 Stone Bricks, 4 Iron Parts, and the crafting level and furniture space shown in construction; no furnace blueprint is needed. Planks cost 4 Wood per batch: 2 in 30 minutes normally, or 3 in 20 minutes with an Iron or Steel Axe. A Brick Furnace unlocks bulk brick firing. Upgrade boats under Camp Construction; map destinations are for sailing and exploration.",
      "Tap Craft for one batch; hold it to choose multiple batches. Drying recipes can run only one batch at a time; collect it before starting another.",
      "At merchants, tap buy, sell or currency exchange for one unit; hold for a quantity selector. Blueprints follow their purchase limits.",
      "Hold the Food Satchel card to select up to three preferred foods, drinks or excluded items per category. Tap selected items to remove them. When preferences run out, other safe items are used; exclusions always apply. Hold cellar items for bulk storage or discard.",
      "Vital Tide Pills and Abyss Breath Pills have crafting limits but no consumption limit. Read item details to distinguish healing, wellness recovery and maximum-stat bonuses.",
      "Auto Tools is off by default and can be enabled in Settings. It selects the highest usable tier from your bag or the current camp warehouse without filling tool slots. Outside camp it cannot borrow stored tools. With it off, equipped tools are used. Steel tools also gather faster, save stamina and last longer.",
      "Equip the Food Satchel to activate it. Once per game hour, hunger or thirst below 50 triggers one eligible item each, rather than an instant refill. It uses your bag and the matching regional warehouse, plus an island cellar if built; a cellar is optional. Island and underwater stock remain separate."
    ]
  },
  {
    "title": "战斗：选目标再行动",
    "enTitle": "Combat Controls",
    "steps": [
      "遇敌后先点击想攻击的怪物立绘，确认选中标记，再选择攻击、射击或技能；多个敌人时可随时换目标。",
      "距离不够时，攻击会先用于逼近。近战要贴身，弓和手枪有不同射程；射击需要携带相应箭矢或子弹。",
      "观察敌人血条、技能预告和左侧战斗日志。防御降低本次行动受到的伤害；生命危险时可以选择逃跑。",
      "技能有装备条件与冷却：横扫需要双手重武器，第一回合在近战范围内使用时先于普通敌人出手（首领战除外）；重击与必中需要学习。刀刀暴击提高会心率，不是每次攻击都必定暴击。",
      "战斗道具从道具入口选择，每场最多使用两次。行动与伤害反馈结束后再操作，别在动画中连续点按；战斗结束再换装备。"
    ],
    "enSteps": [
      "Tap the enemy you want to attack, check the selection marker, then choose Attack, Shoot or a skill. Switch targets when fighting a group.",
      "An attack outside your range first moves you closer. Melee requires contact; bows and pistols have different ranges and need the matching ammunition.",
      "Watch enemy health bars, intent previews and the combat log on the left. Defend reduces damage for that action; flee when survival is doubtful.",
      "Skills have equipment requirements and cooldowns. Sweep needs a two-handed weapon. On turn one, an in-range Sweep acts before ordinary enemies, except in boss fights; Heavy Strike and Sure Hit must be learned. Critical Edge improves critical chance; it does not guarantee every hit.",
      "Choose combat items from the item panel; you may use two per battle. Wait for action feedback before the next input, and change equipment after combat."
    ]
  },
  {
    "title": "技能升级与成长",
    "enTitle": "Skills and Progression",
    "steps": [
      "进入装备→技能，选择采集、制造或战斗，再展开对应技能树。采集、制作和战斗分别积累自己的经验。",
      "主干经验足够时，选择一个成长方向完成升级；例如战斗主干可选攻击、防御或会心率。不是所有方向同时获得。",
      "专项技能单独点击学习，需要达到主干等级，并满足前置与互斥条件；灰色按钮下会写明缺少什么。",
      "每个技能卡显示等级与效果，二级效果以卡面说明为准。刀刀暴击一级增加20个百分点会心率，二级增加30个百分点，二级不与一级相加。",
      "需要调整路线时，可遗忘允许移除的末端技能并返还部分经验；有后续技能依赖时，先处理后续技能。"
    ],
    "enSteps": [
      "Open Equipment, then Skills, and expand Gathering, Crafting or Combat. Each activity earns experience for its own tree.",
      "When you have enough experience, choose one main-tree growth option. Combat offers attack, defense or critical chance; you receive only the option selected.",
      "Learn branch skills separately. They require the stated main level and prerequisites, and may exclude each other. Disabled buttons explain why.",
      "Skill cards show rank and effects. Critical Edge adds 20 percentage points of critical chance at rank one and 30 at rank two; the ranks do not add together.",
      "To change your build, forget removable end skills to recover some experience. Remove dependent skills before their prerequisites."
    ]
  },
  {
    "title": "探索与照明等级",
    "enTitle": "Exploration and Light",
    "steps": [
      "打开地图选择目的地，再点击场景中的采集热点。轻点直接采集；长按查看实际工具、耗时、体力、基础产出与当日剩余次数，预览不消耗资源。留意出发前的工具要求和危险程度。",
      "升级瞭望台逐步开放新的探索区域；升级工具和武器后，再去采石场深层、山洞、荒漠与山顶。",
      "部分热点有次数、工具等级、照明或前置事件要求。点灰色入口查看缺少条件，不必反复尝试。",
      "黑暗地区先准备照明。照明不够会挡住部分探索入口；所需等级看热点提示，别只看是否携带火把。",
      "提灯在精工工具台制作，放入工具栏后使陆地移动和采集遇袭概率减半，每累计1小时消耗1耐久；海上和海底不生效，固定守卫仍会出现。",
      "出远门前补吃喝、修工具、清背包，准备衣物应对寒热。可在设置调整场景滑动与日志显示。"
    ],
    "enSteps": [
      "Choose a destination on the map, then use gathering hotspots. Tap to gather, or hold to preview the actual tool, time, stamina, base yield and daily uses left without spending resources. Check tool requirements and danger before leaving.",
      "Upgrade the watchtower to open more areas. Improve tools and weapons before exploring deeper quarries, caves, deserts and the peak.",
      "Some hotspots require remaining uses, tool tiers, light or earlier events. Tap disabled entries to read their requirements.",
      "Prepare lighting for dark places. Insufficient light blocks some actions; check the required light level, not just whether you carry a torch.",
      "Craft a lantern at the Precision Workbench and equip it in a tool slot to halve random ambush chances on land. It uses one durability per hour of game time, is inactive at sea and underwater, and does not prevent fixed guards.",
      "Before a long trip, replenish food and water, repair tools, reduce your load and prepare clothing for heat or cold. Settings control scene scrolling and log display."
    ]
  },
  {
    "title": "海底探索流程",
    "enTitle": "Underwater Exploration",
    "steps": [
      "先推进瞭望台、船坞和出海路线，到盐镇提升声望、取得海图与深海装备图纸。也可按山顶祭坛线索开启传送路线。",
      "下潜前装备潜水服，并把氧气罩放入工具栏；检查食水、装备耐久和药品。",
      "到达海底后先熟悉栖居区，再准备当地仓库、工坊与修补设施；海底仓库与岛上仓库各自独立。",
      "珊瑚生长带的淡化残罐可寻找淡水，每天最多检查3次；出发前仍需准备备用食水。",
      "逐步探索珊瑚生长带、海沟、沉船墓地和深渊裂谷，击败守卫并收集深殿核心；危险区域先升级装备与照明。",
      "集齐四块深殿核心，满足圣殿之门提示的照明要求后进入深水圣殿，准备挑战沉没之王。"
    ],
    "enSteps": [
      "Develop the watchtower, dock and sailing route. Build reputation in Salt Town and obtain the chart and diving blueprint, or follow the peak altar clues to unlock a portal.",
      "Equip a diving suit and place the oxygen hood in a tool slot. Check supplies, equipment durability and medicines before diving.",
      "Learn the habitat area first, then establish local storage, workshops and repair facilities. Underwater and island storage are separate.",
      "Search the Desalination Canister in the coral beds for fresh water, up to three times daily. Still carry backup food and water.",
      "Explore the coral beds, trench, shipwreck graveyard and abyss rift. Defeat guards and collect temple cores; improve equipment and light before dangerous zones.",
      "Collect four temple cores and meet the light requirement shown at the temple gate, then prepare to challenge the Sunken King."
    ]
  },
  {
    "title": "通关与结局",
    "enTitle": "Endings",
    "steps": [
      "不同结局对应不同准备路线：营地建设与声望、航海准备、山顶祭坛或海底探索。先选择喜欢的方向，不必一次完成所有路线。",
      "打开装备→属性查看当前可用的结局入口；未满足的条件会在相关入口说明中提示。",
      "航海路线需准备船只、海图与补给；山顶路线按祭坛线索寻找遗物、石板和龙骨。材料来源可结合地图热点与图鉴查找。",
      "海底路线击败沉没之王后，根据结局提示作出选择。重要选择前保存进度，并阅读确认说明。"
    ],
    "enSteps": [
      "Endings follow different routes: camp development and reputation, sailing, the peak altar or underwater exploration. Choose a route; you need not complete all of them at once.",
      "Open Equipment, then Attributes, to check ending actions. Relevant entries explain unmet requirements.",
      "For sailing, prepare a ship, chart and supplies. For the peak, follow clues to the relic, stone slabs and dragon bone. Use map hotspots and the collection for reference.",
      "After defeating the Sunken King, follow the ending choices. Save before important decisions and read their confirmation text."
    ]
  },
  {
    "title": "图鉴、说明与保存",
    "enTitle": "Collection and Saving",
    "steps": [
      "菜单→图鉴可查看已发现的物品与怪物。物品条目可点开，查看攻击、防御、速度、耐久、食用效果等数值。",
      "怪物图鉴可查看生命、攻击、防御、速度、特性与掉落；遇到陌生敌人前，先了解它擅长什么。",
      "生命与健康不同：简易药膏恢复20健康；草药膏恢复15生命、15健康并治疗感染；解毒剂解除中毒并恢复10健康，但不治疗感染。点击状态查看当前异常及其效果，带伤睡觉仍会结算。",
      "菜单可保存进度、使用备份与读档，并导出存档码或下载文本文件。导入可粘贴或选文件，先预览再确认覆盖；取消不会替换进度。换设备前先备份，不要随意卸载或清除游戏数据。",
      "遇到不明白的操作，先看按钮旁的问号、灰色提示和日志；攻略也可从邮箱的攻略页打开，两处内容相同。"
    ],
    "enSteps": [
      "Open Collection from the menu to inspect discovered items and enemies. Tap items for attack, defense, speed, durability and use effects.",
      "Enemy entries show health, attack, defense, speed, traits and drops. Learn unfamiliar enemies before taking risks.",
      "HP and wellness are different. Simple Salve restores 20 wellness; Herbal Paste restores 15 HP and 15 wellness and cures infection. Antidote removes poison and restores 10 wellness, but does not cure infection. Tap Status to inspect ailments; they still progress during sleep.",
      "The menu offers saving, backups and save-code or text-file export. Paste a code or choose a file to import, preview it, then confirm replacement; cancel keeps your current progress. Back up before switching devices, uninstalling or clearing data.",
      "Check question-mark help, disabled-action explanations and the log when unsure. The Guide tab in Mail uses the same pages as the menu guide."
    ]
  }
];


// approved 必须由作者点头改成 true 才会发；false 时代码里留着但玩家看不到。
// 对外版本号以 index.html 的 BUILD_VER 为准；此列表只控制游戏内公告邮件。
const PATCH_NOTES = [
  {
    // 公告由作者审阅后决定启用；草稿仍随版本包保存。
    version: 'v1.10',
    date: '2026-10-01',
    approved: false,
    title: 'v1.10 更新公告（体感温度、新身份与制造分类）',
    body: [
      "【体感温度与两种新身份】",
      "· 季节、地点、衣物、营地住所与火源、移动后的活动状态现在共同决定「温度」。太冷或太热会按游戏小时损失生命；进入新的冷热区域有 30 游戏分钟换衣缓冲。山顶不再硬性要求先穿厚衣，但贸然久留仍危险。",
      "· 猎人重新开放：近战和远程基础命中各提高 10 个百分点，暴击率提高 5 个百分点，开局带石矛。",
      "· 健身教练可建专属跑步机和哑铃架。每次锻炼耗 6 小时与 30 体力，同一天只能练一次；两种器材各限 16 次。跑步最多提高 50 点生命上限，哑铃最多提高 5 点攻击。",
      "",
      "【制造、食物与冬季】",
      "· 制造页新增第二列配方分类，原料、工具、武器、防具、饮食等可以直接筛选。纺布与衣物归到一起，篝火、灶台、烟熏炉的食物归到一起；原有图纸和工位要求不变。",
      "· 冬季河畔可以采雪，带回篝火烧成淡水；入冬时会提示水源与保暖风险。小麦先加工成面粉，再制作面包和蛋糕；鸡舍、羊圈改在农田管理，不再占住房家具位。",
      "· 对岸美食家摊位现可正常购买萝卜炖肉、超级大蛋和蛋糕的食谱。制作需要相应图纸。",
      "",
      "【战斗、道具与海底】",
      "· 战斗 2 级可在「重击」和「必中」间选择：重击伤害更高但更难命中，必中稳定命中；二者共用冷却。修正混装射速、弓术暴击、盾墙与复仇层数等问题。",
      "· 牛角护符改为暴击率 +10 个百分点。潮生丹和渊息丹每局各最多制作 5 颗，服用不限次数。海底材料「遗城晶核」更名为「海底矿晶」，已有存档和配方保持可用。",
      "· 山顶祭坛遗物不能再卖给商人反复领取刷贝壳币。旧档若已经失去遗物，仍可回祭坛补领以继续结局。",
      "",
      "【体验与存档】",
      "· 冬季取水、石龛选神物、战斗最后一击血条、推进器体力显示等反馈已修正；中毒和流血在睡眠中仍会按时间生效。",
      "· 制造、物品及身份补充了黑白图像，修复部分场景悬浮小方块和手机界面拥挤问题。",
      "· Tap 云存档上传增加排队与防并发保护；本机即时进度、备份槽和存档码继续保留。更新后建议先确认原有存档能正常继续，再进行云端同步。",
      "",
      "感谢大家的反馈，更多问题欢迎继续告诉我。QQ群：1014679931。",
    ],
  },

];

const ENDINGS = {
  N:{name:'长夜终醒',cond:'噩梦模式击败噩梦之源',text:'破晓的光穿过最后一道裂隙。岛上的影子，终于重新属于它们自己。',img:'assets/img/enemies/nightmare7.png',lines:['你看清了恐惧的形状，也亲手撕开了它。','那个醒不过来的夜晚，终于结束了。','—— 长夜终醒。']},
  A: { name:'归乡', cond:'远洋船 + 海图 + 补给箱×3', text:'日出时分，你升起帆。孤岛在身后缩成一个小小的黑点。', img:'assets/img/endings/ending_a.png', lines:[    '你曾以为会死在岛上，可你造出了船。',
    '帆吃得满满了，风从故乡的方向吹来。',
    '回头时，那座困住你一百多天的岛，已经小得像一枚邮票。',
    '—— 你回家了。',
  ] },
  B: { name:'岛主', cond:'击败海盗头目 + 盐镇声望4 + 石墙', text:'篝火从你的营地连到盐镇。人们说，岛上有主了。', img:'assets/img/endings/ending_b.png', lines:[
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
      { id:'yield', name:'熟手', icon:'g_yield', desc:'采集 / 捕捞产出 +7%' },
      { id:'speed', name:'迅捷', icon:'g_speed', desc:'采集 / 钓鱼 / 砍伐耗时 -7%' },
      { id:'stam',  name:'耐劳', icon:'g_stam',  desc:'采集体力消耗 -7%' },
    ],
    nodes: [
      // ⚠️ 作者 2026-09-19：所有专项最大等级 -1（一级/二级的数值照旧），所以这里 max 都降了一档
      { id:'g_wood',   name:'伐木专精', icon:'g_wood', need:2, side:'r', max:1, cost:[30], mutex:'g_nature',
        desc:['砍树额外 +0.5 木材（攒够 1 份就给）'] },
      { id:'g_nature', name:'自然感知', icon:'g_nature', need:2, side:'l', max:1, cost:[30], mutex:'g_wood',
        desc:['遇到美人松的概率 +7%'] },
      { id:'g_fine',   name:'精细采集', icon:'g_fine', need:4, side:'r', max:2, cost:[60,90], mutex:'g_rough',
        desc:['单点产出 +20%，但体力消耗 +15%', '单点产出提升至 +30%，体力消耗仍 +15%'] },
      { id:'g_rough',  name:'粗放采集', icon:'g_rough', need:4, side:'l', max:2, cost:[30,60], mutex:'g_fine',
        desc:['体力消耗 -20%，产出 -10%', '体力消耗提升至 -30%，产出仍 -10%'] },
    ],
  },
  craft: {
    name: '制造', glyph: '🔨', expName: '制造经验',
    trunk: [
      { id:'speed',  name:'熟手', icon:'c_speed',  desc:'制造耗时 -7%' },
      { id:'refund', name:'精算', icon:'c_refund', desc:'每次制作 7% 概率返还材料' },
      { id:'extra',  name:'巧手', icon:'c_extra',  desc:'每次制作 7% 概率多产 1 件' },
    ],
    nodes: [
      { id:'c_patch',  name:'修补匠', icon:'c_patch', need:3, side:'r', max:2, cost:[30,70],
        desc:['修补 25% 概率不消耗材料','50% 概率不消耗材料'] },
      { id:'c_line',   name:'流水线', icon:'c_line', need:4, side:'r', max:1, cost:[60], mutex:'c_finework',
        desc:['有耐久的成品耗材料 -40%、耐久上限 -20%（食物/药剂这类不受影响）'] },
      { id:'c_finework', name:'精工细作', icon:'c_finework', need:4, side:'l', max:1, cost:[60], mutex:'c_line',
        desc:['成品耐久上限 +30%，耗材料 +30%（只对武器/工具/防具这类有耐久的东西生效）'] },
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
      // 作者 2026-09-25：战斗 2 级给一对**互斥**选择 —— 重击 / 必中。
      //   重击以前是"主干 2 级白送"（代码里写死 combatLv()>=2 就给按钮），现在必须在这里点出来：
      //   **不学重击就没有重击技能**。两个都带 20 单位时间冷却（和横扫同一套时间单位）。
      //   老存档（这一版之前开的局、战斗已到 2 级）读档时会自动补上重击，不会凭空少一个技能。
      { id:'f_heavy', name:'重击', icon:'k_heavy', need:2, side:'l', max:1, cost:[30], mutex:'f_sure',
        desc:['重击：1.5 倍伤害、命中 −20%，冷却 20 秒'] },
      { id:'f_sure',  name:'必中', icon:'k_sure',  need:2, side:'r', max:1, cost:[30], mutex:'f_heavy',
        desc:['必中：必定命中、1.0 倍伤害，冷却 20 秒'] },
      { id:'f_sweep', name:'阔刃横扫', icon:'k_sweep', need:3, side:'r', max:2, cost:[30,70], mutex:'f_vamp',
        req:'双手重武器',
        desc:['横扫 1.0 倍伤害 · CD 18 秒（需双手重武器）；首回合近战先于普通敌人（首领战除外）','横扫 1.2 倍伤害 · CD 16 秒；首回合近战先于普通敌人（首领战除外）'] },
      { id:'f_exec', name:'处决', icon:'k_exec', need:4, needNode:'f_sweep', side:'r', max:2, cost:[30,70],
        desc:['敌人生命 <20% 时，你的伤害 +50%','敌人生命 <25% 时，你的伤害 +50%'] },
      { id:'f_vamp', name:'嗜血狂刀', icon:'k_vamp', need:3, side:'l', max:2, cost:[30,70], mutex:'f_sweep',
        req:'双持两把匕首',
        desc:['造成伤害的 30% 回血（需双持两把匕首）','同样 30% 回血；升级只延长【复仇】链、不再提高吸血比例'] },
      { id:'f_revenge', name:'复仇', icon:'k_revenge', need:4, needNode:'f_vamp', side:'l', max:2, cost:[30,70],
        desc:['每被打一次，下一次攻击 +20%','下一次攻击 +30%'] },
      { id:'f_shield', name:'盾墙', icon:'k_shield', need:3, side:'l', max:2, cost:[30,70], mutex:'f_swift',
        req:'盾',
        desc:['格挡率 +15% · 盾耐久消耗 -20%（需盾）','格挡率 +20% · 盾耐久消耗 -35%'] },
      { id:'f_swift', name:'刀刀暴击', icon:'k_swift', need:3, side:'r', max:2, cost:[30,70], mutex:'f_shield',
        desc:['会心一击率 +20 个百分点','会心一击率 +30 个百分点'] },
      { id:'f_rage', name:'狂战', icon:'k_rage', need:6, side:'l', max:2, cost:[40,90], mutex:'f_iron',
        desc:['攻击 +15%，但受到伤害 +10%','攻击 +22%，受到伤害 +10%'] },
      { id:'f_iron', name:'铁壁', icon:'k_iron', need:6, side:'r', max:2, cost:[40,90], mutex:'f_rage',
        desc:['受到伤害 -12%，但攻击 -5%','受到伤害 -18%，攻击 -5%'] },
      { id:'f_bow', name:'弓术', icon:'k_bow', need:3, side:'l', max:2, cost:[30,70],
        req:'弓',
        desc:['用弓时暴击效果 +30%（会心倍率 1.5 → 1.8）','用弓时暴击效果 +60%（会心倍率 1.5 → 2.1）'] },
      { id:'f_gun', name:'枪械精通', icon:'k_gun', need:3, side:'r', max:2, cost:[30,70],
        req:'手枪',
        desc:['手枪命中 +10% · 20% 不消耗子弹','手枪命中 +10% · 30% 不消耗子弹'] },
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

// ---------- 神物（作战被动；远古金币换取 / 小概率奇遇获取 / 海底神秘鱼人以物换物） ----------
// ⚠️ 其中「亚特兰蒂斯之种」按作者 2026-09-23 定案，可从商城购买或沉船墓地的神秘鱼人换（见 game.js FISHMAN_DEALS），
//    原来那条"对岸神秘商人 30 金币换神物"的随机事件已删除，不要再加回来。
const RELICS = {
  vampire:   { name:'吸血宝石', glyph:'血', desc:'攻击时回复所造成伤害 10% 的生命。' },
  dodge:     { name:'闪避护符', glyph:'闪', desc:'有 10% 概率完全闪避敌人的攻击。' },
  satchel:   { name:'食之包',   glyph:'囊', desc:'饱食或水分低于50时自动进食饮水，获得完整食用效果；可远程使用当前章节营地仓库与地窖中的安全食物。' },
  bloodvest: { name:'血色背心', glyph:'胄', desc:'生命上限 +20。' },
  atlantisSeed: { name:'亚特兰蒂斯之种', glyph:'种', desc:'携带此神物，水下无需装备氧气罩（氧气无限）。' },
};

// ---------- 工具/武器耐久上限（用到 0 会损坏） ----------
const DURA = {
  lantern:50,
  axeStone:25, axeIron:50, axeSteel:90,
  pickStone:25, pickIron:50, pickSteel:90, pickBlack:120,
  knifeStone:18, hoe:40, rod:40, net:10,
  club:8, spear:12, bow:70, divineBow:120, ironSword:70, steelSword:110, blackSword:160, ironDagger:40, steelDagger:80, blackDagger:120, ironGreatSword:140, blackGreatSword:240,
  coralBlade:90, sourceSpear:130, woodShield:40, ironShield:70, steelShield:110,
  shellAmulet:50, beastFang:50, pearlNeck:60, hornAmulet:70,
  diveSuit:50, diveSuit2:200, diveMask:100, pistol:50,
  grassArmor:40, leatherArmor:60, ironArmor:90, divineArmor:110, blackArmor:130, coralArmor:110, sourceArmor:150,
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

// ---------- 灵灰台词（身份为「灵灰」时，每天必说一句） ----------
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

// 角色演出数据：语音离线随包，默认版画，彩绘皮肤保留原色。
const MERCHANTS = {
  "laochao": {"name":"老潮","cell":0,"lines":["海风正好，来看看这趟的新货。","好货配好价，下回靠岸还找你。","真是一次愉快的交易。"]},
  "grocer": {"name":"杂货商","cell":1,"lines":["粮食和日用都在这儿，慢慢挑。","这些东西带回去，总有用得上的时候。","收好啦，路上留心天气。"]},
  "smith": {"name":"铁匠","cell":2,"lines":["试试分量，好铁经得住敲打。","趁手的家伙，才不辜负好材料。","成了，带上它，好好活着回来。"]},
  "informant": {"name":"情报贩子","cell":3,"lines":["消息也有价。你想知道哪一条？","你拿走消息，我收下报酬。","有些秘密，只说给识货的人。"]},
  "gourmet": {"name":"美食家","cell":4,"lines":["这味道，值得多花一点心思。","记得慢火，别糟蹋了好食材。","好味道，总要留给懂吃的人。"]},
  "black": {"name":"独眼","cell":5,"lines":["嘘，夜里的买卖，少问来路。","货交给你，咱们两清。","眼光不错，下次还走这条路。"]},
  "fishman": {"name":"神秘人鱼","cell":6,"lines":["把金锭放下。海会记住这次交换。","深海的赠礼，交给你了。","潮汐带走旧物，也带来新的缘分。"]},
  "atlTrade": {"name":"远古交易机","cell":7,"lines":["交换协议已就绪。请提交物资。","交易完成。物资已交付。","价值核算完毕。欢迎再次交换。"]}
};
const LINGHUI_SPEECH = ["今天也要加油哦。","海风把我头发都吹乱啦。","这里的海，好安静呀。","要不要去海边捡贝壳？我认识好多好看的。","好困，你困不困呀。","那颗星星好亮，像你的眼睛。","今天的鱼汤好香！我闻到啦！","你在做什么呀？让我看看。","我好像，见过这里。"];
