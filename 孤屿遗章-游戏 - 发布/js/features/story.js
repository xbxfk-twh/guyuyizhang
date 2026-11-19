/* 剧情笔记使用存档里的事实。旧档从已发生的行动直接回读。 */
const StoryRules = (() => {
  const main = {
    ledger: ['街灯的账', '交易机吐出一小截账纸。街灯、水闸的拨给一项项被划掉，末尾盖着王廷的收讫印。'],
    decree: ['封门令', '工匠刻下「闸水返流，西街已染黑，请开疏散门」。铜板翻过来，王印压着两行字「继续抽取。锁门，违令者交卫兵处置」。'],
    guard: ['盔甲内侧', '护甲里刻着姓名和巡防编号。护住膝盖的铜片裂开了，黑色结晶从关节一直长到脚下的石缝里。'],
    king: ['停下来的命令', '沉没之王倒下。石座旁留着他的口授稿「那声音允我长生，也允我有足够的力量。继续抽取」。末页夹着一张被划掉的疏散名单，几户名字旁有同样的暗记。'],
    escort: ['公主的侍卫', '人鱼曾奉公主之命，带西街的居民从旧水渠撤走。她们在下闸前分开。如今封门的命令停了，她愿意带我过去。'],
    refuge: ['门后的第一顿饭', '溪水擦着石桥流过，远处有人收湿碗。桌边传来椅脚拖过石地的声音，他们给我腾了一个位置。'],
  };
  const tide = {
    wreck: ['半截缆绳', '醒来时我还攥着半截缆绳。旧海图冲丢了，左下角那两短一长的划痕倒还记得。'],
    bottle: ['瓶口的刻痕', '瓶里是老潮的信「看到商船就在南岸升烟。带上鱼干，换什么都行。」蜡封上有两短、一长三道刻痕。'],
    map: ['两张海图', '情报贩子认出我记得的接应图。他的姐姐许遥带着同一张图出海，再没回盐镇。对岸遗迹的哨站也许留有交班记录。'],
    cave: ['洞里的值守记录', '「上岸后，先取水。脚伤者留在洞内。第三班接应须备火。」'],
    ruins: ['三个人上了岸', '「今夜到岸三人。二人转送盐镇。一人自愿回船接应。」石板上没有名字。'],
    peak: ['回灯', '「深处开灯，外站回以两短一长。收妥来船，记名交班。」'],
    receipt: ['取货口的名牌', '小灯闪了两短一长。取货口卡着许遥的名牌和领用单「氧气罩、应急灯。用途，接应。归还签名＿＿＿＿」。'],
    returned: ['盐镇那一夜', '他把铜钱压在名牌上。「是我姐的字。我以为她连岸都没碰到。知道她上过岸，我今晚能睡了。」他把灯塔值守席的方位抄在我的日记里。'],
    watch: ['最后一班', '灯塔的值守册留着许遥的名字。「下一班还在路上。门给他们留着。」签名栏下一行空着。'],
  };

  function has(run, id) {
    const f = run.flags;
    const k = run.killCount;
    return !!(f['storyClue_' + id] || {
      wreck: true,
      bottle: f.story_e_driftbottle || run.inv.driftbottle,
      cave: f.pt_cave_slate,
      ruins: f.pt_ruins_slate,
      peak: f.slateGuardDone || k.slateGuard,
      decree: f.pt_atl_bullet && (run.inv.bpBullet || run.learnedBlueprints?.bpBullet),
      guard: k.deepGuard,
      king: k.sunkenKing || f.boss_sunkenKing,
    }[id]);
  }

  function create({gameState, log, change, showOverlay, gainItem, invCount, knowsBlueprint, lightLevel}) {
    const current = () => gameState.run;
    const known = id => has(current(), id);
    function record(id) {
      const run = current();
      const key = 'storyClue_' + id;
      if (run.flags[key]) return;
      const alreadyKnown = known(id);
      run.flags[key] = 1;
      if (!alreadyKnown) log('日记记录了新线索。', 'sys');
      change();
    }

    function findBottle() {
      if (known('bottle')) return false;
      current().flags.storyClue_bottle = 1;
      gainItem('driftbottle', 1);
      found('bottle');
      return true;
    }

    function routeHint() {
      const run = current();
      const f = run.flags;
      if (known('refuge')) return '';
      if (known('escort')) return '在深水圣殿或沉船墓地请侍卫带路。';
      if (known('king')) return run.scene === 'atlantis' && run.zone === 'sanctum'
        ? '给石门旁的人鱼看疏散名单。' : '去沉船墓地找神秘人鱼，给她看疏散名单。';
      if (f.ended_C && !run.atlantis?.stoneActive && run.scene !== 'atlantis' && !known('ledger') && !known('guard')) return '回山顶解开传送石的符文。';
      if (run.scene === 'atlantis' || run.atlantis?.unlocked || known('guard') || known('ledger')) {
        if (run.zone === 'city' && !known('ledger')) return '去交易机查一查城市的旧账。';
        if (run.zone === 'pearlCave' && !known('decree')) return '看看古匠工坊旁的铜板。';
        if (lightLevel() < 3) return '探索深水圣殿前，备好防水强光潜水手电。';
        if (invCount('deepCore') < 4) return '找齐四块深殿核心。珊瑚生长带、沉船墓地、海沟和深渊裂谷各有一块。';
        return '带四块深殿核心去深水圣殿的守护者祭坛。';
      }
      if (invCount('slate') >= 3 && invCount('relic') && invCount('dragonbone')) return '带三块石板、遗物和龙骨回山顶祭坛。';
      if (known('map') && known('ruins') && known('cave') && known('peak')) return '山顶祭坛有遗物。夜里去荒漠找白骨守卫，有机会找到龙骨。';
      return '';
    }

    function sideHint() {
      if (known('returned')) return known('watch') ? '' : known('king') ? '去深水圣殿找灯塔值守席。' : '击败国王后，去深水圣殿找灯塔值守席。';
      if (known('receipt')) return '愿意的话，把许遥的领用单带回盐镇酒馆。';
      if (known('watch')) return '沉没之城的交易机或许还存着许遥的领用记录。';
      const run = current();
      if (known('map') && (run.scene === 'atlantis' || known('guard') || known('ledger'))) return '到沉没之城查看交易机的取货口。';
      if (known('map')) {
        if (!known('ruins')) return run.buildings.watch < 3
          ? '升到三级瞭望台，就能在对岸找到遗迹。' : '从对岸进遗迹，找断柱间的石板。';
        if (!known('cave')) return '带火把和二阶镐，去山洞找洞中遗迹。';
        if (!known('peak')) return '二级瞭望台能望见山顶。石碑前有守卫。';
      }
      return known('bottle') && !known('map') ? '航船能到对岸时，把瓶口的刻痕告诉盐镇酒馆的人。' : '';
    }

    function diary() {
      const entries = group => Object.entries(group).filter(([id]) => known(id)).map(([, entry]) => entry);
      const side = sideHint();
      return {next:routeHint() || side, main:entries(main), tide:entries(tide), side};
    }

    function informant() {
      const run = current();
      let label = '';
      let speech;
      if (known('returned')) speech = '「那张领用单，我留着。灯塔的值守席就在圣殿后面。」';
      else if (known('receipt')) {
        speech = '他把找零收进抽屉，目光停在你手里的名牌上。';
        label = '交给他许遥的领用记录';
      } else if (known('watch')) {
        speech = '「值守册上是她的字。你若再去沉城，看看交易机还记不记得什么。」';
        if (!known('map')) label = '问他认不认识许遥';
      } else if (known('map')) {
        speech = '「我姐许遥带着接应图出过海。我只想知道她最后在哪儿上了岸。」';
      } else {
        speech = '他摆出一张返航海图。柜里还有一张旧拓印，角上是两短一长。';
        label = '问起旧拓印';
      }
      let sailing = '';
      if (!run.atlantis?.unlocked && run.fame >= TOWN.informant.needFame) {
        if (!knowsBlueprint('bpDive')) sailing = '下海前先准备潜水装备。货架上有潜水服图纸。';
        else sailing = '带海图，穿潜水服、备氧气罩，从沉船湾的远方海沟下水。';
      }
      return {speech, label, hint:sideHint(), sailing};
    }

    function escort() {
      if (!known('king')) return;
      const first = !known('escort');
      showOverlay({
        title:'公主的侍卫',
        text:(first ? '她解下腕上的旧军徽。「我奉公主的命，带西街的人走旧水渠。我们在下闸前分开。」\n\n' : '') +
          '她看向石门后面。「过了门，把剑收起来。他们正吃晚饭。」',
        choices:[
          {label:'跟她穿过石门', ok:() => {
            if (current().combat || current().death || current().ending) return;
            record('escort');
            showOverlay({
              title:'第三章 · 地下聚落',
              text:'石桥下淌着清水。暖灯挂在菜畦和石屋之间，小孩追着一颗滚走的果子。有人从长桌边拖出一把旧凳。\n\n「你从上面来？坐。上面的事，等你吃完再说。」',
              choices:[{label:'在长桌边坐下', ok:()=>record('refuge')}],
            });
          }},
          {label:'晚些再来', ok:()=>record('escort')},
        ],
      });
    }

    function read(id, group, dialogue) {
      const [title, note] = group[id];
      record(id);
      showOverlay({title, text:dialogue || note, choices:[{label:'记在日记里', ok:()=>{}}]});
    }

    function interact(id) {
      const run = current();
      if (!run || run.combat || run.death || run.ending) return false;
      const zone = run.zone || (run.scene === 'shore' ? 'saltTown' : null);
      const at = (scene, area) => run.scene === scene && zone === area;
      if (id === 'informant' && at('shore', 'saltTown') && !known('returned')) {
        if (known('receipt')) {
          read('returned', tide);
        } else if (!known('map')) {
          read('map', tide, '他把两张图分开，指出旧拓印上圈住的南岸。\n\n「这张管接人。船靠到这儿，就算交班。我姐许遥那晚带着它出海。你要去对岸，看一眼遗迹的石板。」');
        } else return false;
      } else if (at('atlantis', 'city') && id === 'ledger') read(id, main);
      else if (at('atlantis', 'city') && id === 'receipt') read(id, tide);
      else if (at('atlantis', 'pearlCave') && id === 'decree') read(id, main);
      else if (at('atlantis', 'sanctum') && id === 'watch' && known('king')) read(id, tide);
      else if ((at('atlantis', 'sanctum') || at('atlantis', 'shipwreck')) && id === 'escort' && known('king')) escort();
      else return false;
      return true;
    }

    function found(id) {
      const [title] = main[id] || tide[id];
      log(title + ' · 已记入日记', 'sys');
    }

    return {known, diary, informant, interact, findBottle, found, routeHint};
  }

  return {create};
})();
