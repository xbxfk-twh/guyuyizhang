/* objectives：业务规则的唯一实现；Game 保留调用接口与装配。 */
const ObjectiveRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const invCount=(...args)=>deps.invCount(...args);
    const hasItem=(...args)=>deps.hasItem(...args);
    const knowsBlueprint=(...args)=>deps.knowsBlueprint(...args);
    const seasonInfo=(...args)=>deps.seasonInfo(...args);
    const materialCount=(...args)=>deps.materialCount(...args);
    const priceOf=(...args)=>deps.priceOf(...args);
function currentObjective() {
    if (!gameState.run) return '';
    const day = gameState.run.day;
    // 凑齐结局 C 材料后，直接指路山顶祭坛（传送石/亚克兰蒂斯的入口）
    if (!gameState.run.flags.ended_C && hasItem('relic') && invCount('slate') >= 3 && hasItem('dragonbone')) return '遗物、三块石板、龙骨都齐了——回【山顶】举行祭坛仪式。';
    if (gameState.run.flags.ended_C && !(gameState.run.atlantis && gameState.run.atlantis.stoneActive)) return '回【山顶】点「传送石」——用三块石板解出符文（三小关：记忆顺序 / 成对翻牌 / 点亮九格），解开就能去亚克兰蒂斯。';
    // ⚠️ 同上：帐篷/篝火开局就有，别写"生起篝火、搭好帐篷"让人以为要自己做（作者 2026-09-23）
    if (gameState.run.difficulty === 'legend' && (gameState.run.buildings.house < 0 || gameState.run.buildings.storage < 0 || gameState.run.buildings.fire < 0)) return '传奇求生：去「营地建造」亲手搭帐篷、储物箱和篝火；材料可在周边采集。';
    // 顺序（作者 2026-09-21）：先食水危急 → 缺斧镐 → 工具台 → 床。
    // ⚠️ 食水与工具提示**不看床**——已有床也一样要提醒急需吃喝/缺工具。
    if (gameState.run.stats.hunger < 30 || gameState.run.stats.thirst < 30) return seasonInfo().name === '冬'
      ? '先解决吃喝：采点野莓/野菜、去河畔采雪并烧成淡水，别把自己耗垮了。'
      : '先解决吃喝：采点野莓/野菜、到河边取水，别把自己耗垮了。';
    if (day === 1) return '帐篷和篝火已经搭好了——先点开看看，再摸清营地周边的物资。';
    if(gameState.run.atlantis?.unlocked)return '前往礁石栖息地整备潜水装备与照明，逐步探索各片海域的遗迹。';
    const hasAxe = hasItem('axeStone') || hasItem('axeIron') || hasItem('axeSteel');
    const hasPick = hasItem('pickStone') || hasItem('pickIron') || hasItem('pickSteel') || hasItem('pickBlack');
    if (!hasAxe && !hasPick) return '做一把石斧或石镐（各需木材×2、燧石×2）。';
    if (!gameState.run.furniture.wb1 && !gameState.run.furniture.wb2 && !gameState.run.furniture.wb3) return '先造一张工具台（木板×4、石头×4），解锁制作。';
    if(gameState.run.buildings.watch===0 && materialCount('plank')<8)return '先在制作页削木板、制木杆，为一级瞭望台备料；削木板每批4木材出2木板，装备铁斧或钢斧后自动出3木板。';
    if (gameState.run.buildings.watch === 0) return '下一步建一级瞭望台（木杆×8、木板×8、藤蔓×4），开出草地、荒漠与山洞；草床可按需再造。';
    if (!gameState.run.flags.firstTrade && day < 5) return '囤积 10 条熏鱼（烟熏炉制作），第 5 天老潮会靠岸收货。';
    if (gameState.run.laochao.arrived && !gameState.run.flags.firstTrade) return '老潮就在岸边！用 10 条熏鱼完成首笔交易。';
    if (!gameState.run.furniture.fr1 && !gameState.run.furniture.fr2 && !gameState.run.furniture.fr3) return '造简易熔炉（黏土×6、石头×6），把铁矿石炼成铁锭。';
    if (!hasItem('axeIron') && !hasItem('pickIron')) return '打造铁斧与铁镐，去采石场深层挖铁矿。';
    if (gameState.run.buildings.wall === 0 && day >= 5) return '建一圈栅栏（木材×20），夜里会有野兽。';
    if (gameState.run.buildings.watch === 1) return '升级二级瞭望台（木板×16、铁钉×8、绳索×2），望向山顶与大海。';
    if (gameState.run.buildings.dock < 2) return '建船坞并造木筏（竹子×20、藤蔓×10、木材×10），出海看看。';
    if (gameState.run.buildings.watch === 2 && !hasItem('spyglass')) return '凑齐望远镜（水晶×1+鹰羽×1），升级三级瞭望台。';
    if (!hasItem('seachart')) {
      if (gameState.run.fame < 2) return '盐镇酒馆的情报贩子只跟有声望的人做生意——先做告示板的委托，把盐镇声望刷到 2。';
      return `攒够约 ${priceOf(150, false, 'seachart')} 金币，去盐镇酒馆找情报贩子买「海图」（归乡结局的关键）。金币来自遗迹守卫、海盗/海盗头目与山顶的石碑守卫。`;
    }
    if(gameState.run.buildings.dock>=2&&!knowsBlueprint('bpDive'))return '乘船前往盐镇，完成委托提升声望；查看商店的潜水服图纸，为水下探索准备潜水装备和照明。';
    return '集齐结局所需的遗物与图纸，这座岛的真相在等你。';
  }
    return Object.freeze({currentObjective});
  }
  return Object.freeze({create});
})();
