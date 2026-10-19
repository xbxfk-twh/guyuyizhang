/* 食之包唯一规则与操作实现；Game保留旧调用者的薄代理。 */
const FoodSatchel = (() => {
  function create({getState,ITEMS,warehouseSite,cellarBuilt,supplyCount,foodLots,nowTick,supplyRecords,supplyRecordsAll,supplyContainer,supplySites,invCount,hasRelic,save,change,log,takeSupply,applyFoodEffects}) {
    function satchelSites() {
      return warehouseSite() === 'sea'
        ? ['sea']
        : ['island', ...(cellarBuilt() ? ['cellar'] : [])];
    }
    function satchelEligible(id, kind) {
      const it=ITEMS[id];
      if(!it||!['food','drink'].includes(it.cat)||['fish','meat','rot'].includes(id)||it.negChance||it.negPoison)return false;
      return kind==='food'?it.cat==='food'&&it.food>0:kind==='drink'?(it.cat==='drink'||it.water>0):kind==='blocked'&&(it.food>0||it.water>0);
    }
    function satchelSelections(kind) {
      const S=getState();
      if(!['food','drink','blocked'].includes(kind))return [];
      return [...new Set(Array.isArray(S?.satchelChoices?.[kind])?S.satchelChoices[kind]:[])].filter(id=>satchelEligible(id,kind)).slice(0,3);
    }
    function setSatchelSelections(kind, ids) {
      const S=getState();
      if(!S||!['food','drink','blocked'].includes(kind)||!Array.isArray(ids)||ids.some(id=>!satchelEligible(id,kind)))return {ok:false,reason:'请选择有效的食物或饮料。'};
      const selected=[...new Set(ids)];
      if(selected.length>3)return {ok:false,reason:'最多选择3种。'};
      const previous=S.satchelChoices,previousNotices=S.satchelEmptyNotices;
      S.satchelChoices={...previous,[kind]:selected};S.satchelEmptyNotices={};
      const r=save();if(r?.ok===false){S.satchelChoices=previous;if(previousNotices===undefined)delete S.satchelEmptyNotices;else S.satchelEmptyNotices=previousNotices;return r;}change();return {ok:true};
    }
    function toggleSatchelSelection(kind, id) {
      const S=getState();
      const ids=satchelSelections(kind);
      return setSatchelSelections(kind,ids.includes(id)?ids.filter(k=>k!==id):[...ids,id]);
    }
    function satchelPick(kind) {
      const S=getState();
        const site=satchelSites(),blocked=satchelSelections('blocked');
        const has = k=>!!(ITEMS[k]&&k!=='rot'&&!ITEMS[k].negChance&&!ITEMS[k].negPoison&&!['fish','meat'].includes(k)&&supplyCount(k,site)>0&&!blocked.includes(k));
        const val = (k) => kind === 'food' ? (ITEMS[k].food || 0) : (ITEMS[k].water || 0);
        // 食之包挑食规则（作者 2026-09-22 定案，通用、不硬编码某一件）：
        //   「普通口粮」= 只有饱食/水分、没有额外收益（治疗/体力/精神/增益）的食物。
        //   先吃普通口粮里「快坏的那份」（省得眼睁睁放烂），同档再按饱食值从小到大。
        //   「增益食物」= 有额外收益（治疗/体力/精神/增益）的食物，
        //   排在普通口粮之后；只剩它们时仍会吃（饿肚子更危险），按附加价值从低到高吃。
        //   蜂蜜因体力+7自然靠后；蛋、肉、鱼、野菜虽可烹饪，仍属于正常口粮。
        const extraGain = (k) => { const it = ITEMS[k] || {};
          return (it.heal || 0) + (it.sta || 0) + (it.spirit || 0) * 2 + (it.buffStat ? 10 : 0); };
        const precious = (k) => extraGain(k);
        // 还差多久坏（分钟）：普通口粮里快坏的先吃，避免浪费。
        const spoilIn = k=>Math.min(...foodLots(k).filter(x=>x.exp>nowTick()).map(x=>x.exp),...(site?supplyRecords(k,site).map(x=>x.expiry??Infinity):[]),Infinity)-nowTick();
        const okFood = (k) => has(k) && ITEMS[k].cat === 'food' && val(k) > 0;
        const okDrink = (k) => has(k) && (ITEMS[k].cat === 'drink' || val(k) > 0);
        const eligible=kind==='food'?okFood:okDrink;
        const all=[...new Set([...Object.keys(S.inv),...supplyRecordsAll(site).map(x=>x.id)])].filter(eligible);
        const preferred=satchelSelections(kind).find(id=>all.includes(id));
        if(preferred)return preferred;
        if (kind === 'food') {
          const foods = all.filter(okFood).sort((a, b) => {
            const pa = precious(a), pb = precious(b);
            if (pa !== pb) return pa - pb;          // 普通口粮(0)先吃，珍贵材料后吃
            if (pa === 0) {
              const ea = spoilIn(a), eb = spoilIn(b);
              if (ea !== eb) return ea - eb;        // 都是普通口粮：快坏的那份先吃
            }
            return val(a) - val(b);                 // 同档：饱食值小的先吃（小份先用掉）
          });
          return foods[0] || null;
        }
        // 喝：**淡水优先**（作者 2026-09-19：口渴了当然先喝淡水），没有淡水才喝别的饮品；
        //     只剩带水分的食物时挑水分最多的那份。
        if (all.includes('water')) return 'water';
        const drinks = all.filter(k => has(k) && ITEMS[k].cat === 'drink' && val(k) > 0)
          .sort((a, b) => (a === 'water' ? -1 : b === 'water' ? 1 : val(a) - val(b)));
        if (drinks.length) return drinks[0];
        const juicy = all.filter(okDrink).sort((a, b) => val(b) - val(a));
        return juicy[0] || null;
      }
    function satchelNext(kind) {
      const S=getState();
      const id=satchelPick(kind);if(!id)return null;
      const lots=ITEMS[id]?.spoil?foodLots(id).filter(x=>x.exp>nowTick()):null;
      const bagExp=lots?(lots[0]?.exp??Infinity):(invCount(id)>0?-Infinity:Infinity);
      const rows=supplyRecords(id,satchelSites()).slice().sort((a,b)=>(a.expiry??Infinity)-(b.expiry??Infinity)), rec=rows[0];
      const site=rec&&(bagExp===Infinity||(rec.expiry??Infinity)<bagExp)?satchelSites().find(x=>supplyContainer(x)?.items?.includes(rec)):'bag';
      return {id,site:site||'bag',name:ITEMS[id].name,count:supplyCount(id,satchelSites())};
    }
    function satchelStatus() {
      const S=getState();
      const equipped=hasRelic('satchel'),food=satchelNext('food'),drink=satchelNext('drink');
      return {equipped,food,drink,sites:supplySites(satchelSites()),reason:!equipped?'未装备食之包':!food&&!drink?'没有符合设置的食物或饮水':'饱食或水分低于50时，每游戏小时检查一次'};
    }
    function satchelEmptyNotice(kind) {
      const S=getState();
      S.satchelEmptyNotices=S.satchelEmptyNotices||{};
      if(!S.satchelEmptyNotices[kind]){log('食之包：没有符合设置的'+(kind==='food'?'食物':'饮水')+'，请检查禁食和指定物品。','warn');S.satchelEmptyNotices[kind]=true;}
    }
    function satchelAvailable() {
      const S=getState();
      const inv = {};
      for (const id of new Set([
        ...Object.keys(S.inv),
        ...supplyRecordsAll(satchelSites()).map((x) => x.id)
      ])) {
        const n = supplyCount(id, satchelSites());
        if (n) inv[id] = n;
      }
      return inv;
    }
    function migrateSatchelChoices() {
      const S=getState();
      if(S.satchelChoices)return;
      const blocked=Object.keys(S.satchelRules||{}).filter(id=>S.satchelRules[id]?.blocked&&satchelEligible(id,'blocked'));
      S.satchelChoices={
        food:[S.satchelPref?.food].filter(id=>satchelEligible(id,'food')),
        drink:[S.satchelPref?.drink].filter(id=>satchelEligible(id,'drink')),
        blocked:blocked.slice(0,3)
      };
      if(blocked.length>3)log('食之包禁食最多3种，请长按卡面确认禁食选择。','warn');
    }
    function hourly() {
      const S=getState();
      if (hasRelic('satchel')) {
        if (S.stats.hunger < 50) {
          const f = satchelPick('food');if(!f)satchelEmptyNotice('food');
          if (f && takeSupply(f,1,satchelSites())) {applyFoodEffects(f);if(S.satchelEmptyNotices)delete S.satchelEmptyNotices.food;log(`食之包自动喂了你：${ITEMS[f].name}。`, 'good');}
        }
        if (S.stats.thirst < 50) {
          const d = satchelPick('drink');if(!d)satchelEmptyNotice('drink');
          if (d && takeSupply(d,1,satchelSites())) {applyFoodEffects(d);if(S.satchelEmptyNotices)delete S.satchelEmptyNotices.drink;log(`食之包自动喂了你：${ITEMS[d].name}。`, 'good');}
        }
      }
    }
    return Object.freeze({satchelEligible,satchelSelections,setSatchelSelections,toggleSatchelSelection,satchelStatus,satchelAvailable,migrateSatchelChoices,hourly});
  }
  return Object.freeze({create});
})();
