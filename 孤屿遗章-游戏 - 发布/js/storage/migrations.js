/* 当前格式缺省值、历史转换与读档收尾。顺序固定，所有读档入口共用。 */
const StateMigrations = (() => {
  function create({getState,ITEMS,DIFFICULTIES,WEATHER,DURA,LOG_KEEP,SKILL_TRUNK_COST,costMul,log,combatLv,nodeLv,trainingCount,durList,autoToolkit,reconcileLotteryInputs,reconcileNightmareSouls,settleStoredFood,supplyRecordsAll,addItem,migrateFoodChoices}) {
    function validSave(data) {
      return !!(data && typeof data === 'object' && !Array.isArray(data) && Number.isInteger(data.day) && data.day > 0
        && data.stats && Number.isFinite(data.stats.hp) && (data.inv === undefined || (data.inv && typeof data.inv === 'object' && !Array.isArray(data.inv)))
        && DIFFICULTIES[data.difficulty]);
    }
    // 海盐并入盐：直接合并数量，不走背包容量检查；删除旧键使重复读档不会重复加料。
    function migrateSaltMap(map, discovered=false) {
      if (!map || typeof map !== 'object' || !Object.prototype.hasOwnProperty.call(map,'seasalt')) return;
      if (discovered) { if (map.seasalt) map.salt = 1; }
      else {
        const qty = Math.max(0, Number(map.seasalt) || 0);
        if (qty > 0) map.salt = (Number(map.salt) || 0) + qty;
      }
      delete map.seasalt;
    }
    function migrateSaltState(state, visited=new Set()) {
      if (!state || typeof state !== 'object' || visited.has(state)) return;
      visited.add(state);
      const hadSalt = state.inv && state.inv.seasalt > 0;
      for (const key of ['inv','furnPending','sold']) migrateSaltMap(state[key]);
      migrateSaltMap(state.seen,true);
      if (hadSalt) { state.seen = state.seen || {}; state.seen.salt = 1; }
      if (state.dawnCheckpoint) migrateSaltState(state.dawnCheckpoint.state,visited);
      for (const snapshot of Object.values(state._snap || {})) migrateSaltState(snapshot,visited);
    }
    function migrateSaltMeta(meta) {
      if (!meta || typeof meta !== 'object') return;
      migrateSaltMap(meta.seenItems,true);
      for (const slot of meta.slots || []) if (slot) migrateSaltState(slot.data);
      for (const mail of meta.mailbox || []) if (mail && mail.item === 'seasalt') mail.item = 'salt';
    }
    // 兼容旧档代收字段：一次迁入背包，允许超载，不再过期或暂存。
    function migratePendingLoot() {
      const S=getState();
      if(!S)return;
      const counts={...(S.furnPending||{})},batchCounts={};
      migrateSaltMap(counts);
      for(const b of S.pendingLootBatches||[]){const id=b.id==='seasalt'?'salt':b.id;if(ITEMS[id]&&Number.isSafeInteger(b.qty)&&b.qty>0)batchCounts[id]=(batchCounts[id]||0)+b.qty;}
      for(const [id,n]of Object.entries(batchCounts))counts[id]=Math.max(Number(counts[id])||0,n);
      S.furnPending={};S.pendingLootBatches=[];
      S.seen=S.seen||{};S.furniture=S.furniture||{};
      for(const [id,n]of Object.entries(counts))if(ITEMS[id]&&Number.isSafeInteger(n)&&n>0)addItem(id,n,true,true);
    }
    function migrateSkills() {
      const S=getState();
      if (S.tree) return;                       // 已经迁移过（新存档在 newGame 里就有 S.tree）→ 幂等
      const who = { gather:'采集', craft:'制造', combat:'战斗' };
      for (const k of ['gather','craft','combat']) {
        const old = Math.min(5, (S.skill && S.skill[k]) || 0);
        if (!old) continue;
        let newTo = 0;
        // 这条历史迁移按当时的完整费用表折算；不能套用新的首点优惠，避免旧档补偿缩水。
        for (let i = 0; i < Math.min(old, SKILL_TRUNK_COST.length); i++) newTo += Math.round((SKILL_TRUNK_COST[i] || 0) * costMul(k));
        const back = Math.round(newTo * 2);
        S.exp = S.exp || {}; S.exp[k] = Math.round(((S.exp[k] || 0) + back) * 10) / 10;
        S.skill[k] = 0;
        log(`【技能改版】${who[k]}技能旧等级 ${old} 已折算成 ${back} 点${who[k]}经验——打开「技能」自己重新加点。`, 'good');
      }
      S.tree = { gather:{}, craft:{}, combat:{} };
      S.skillPicks = { gather:[], craft:[], combat:[] };
    }
    // 仅在读档/恢复/导入边界运行。发行版本未写进存档，按原有字段标记识别旧格式。
    function migrateSatchelChoices() { return migrateFoodChoices(); }
    function migrateLegacyState() {
      const S=getState();
      migrateSatchelChoices();
      if (!S.blueprintKnowledgeVersion) {
        S.learnedBlueprints = S.learnedBlueprints || {};
        const ids = new Set([
          ...Object.keys(S.inv), ...Object.keys(S.seen),
          ...(S.warehouse?.items || []).map(x => x.id),
          ...(S.atlantis?.camp?.warehouse?.items || []).map(x => x.id)
        ]);
        for (const id of ids) if (ITEMS[id]?.cat === 'bp') S.learnedBlueprints[id] = true;
        S.blueprintKnowledgeVersion = 1;
      }
      // 原终级仓库移到新链的tier 3，不能把已有容量退回中级。
      if ((Number(S.storageChainVersion) || 0) < 2) {
        if (S.buildings.storage >= 2) S.buildings.storage = 3;
        S.storageChainVersion = 2;
      }
      if (S.inventoryBaseSlots === undefined || S.inventoryBaseSlots === 12) S.inventoryBaseSlots = 15;
      if (S.capacity === 12) S.capacity = 15;
      migrateSaltState(S);
      // 保留旧工作台拆分时已经获得的裁缝台使用权。
      if (S.tailorGift === undefined) S.tailorGift = (S.furniture.wb1 || S.furniture.wb2 || S.furniture.wb3) ? 1 : 0;
      migrateSkills();
      if (S.migCombat2 === undefined) {
        S.migCombat2 = 1;
        if (combatLv() >= 2 && nodeLv('combat', 'f_heavy') === 0 && nodeLv('combat', 'f_sure') === 0 && S.tree && S.tree.combat) {
          S.tree.combat.f_heavy = 1;
        }
      }
      if (S.buildings.cellar === undefined || (S.furniture.cellar && S.buildings.cellar < 0)) S.buildings.cellar = S.furniture.cellar ? 0 : -1;
      // 祭坛C是章节，其他已结算结局仍保留唯一性。
      if (S.flags.settledEnding === 'C') delete S.flags.settledEnding;
      if (!S.flags.settledEnding) {
        for (const k of ['A','B','S','S2']) if (S.flags['settled_' + k]) { S.flags.settledEnding = k; break; }
      }
      // 旧守卫可能提前消耗一次性核心点标记，退回尚未取得核心的点。
      const corePoints = ['atl_dcore_coral','atl_dcore_trench','atl_dcore_wreck','atl_dcore_abyss'];
      const flagged = corePoints.filter(id => S.flags['pt_' + id]);
      let extra = flagged.length - Math.min(4, S.inv.deepCore || 0);
      for (const id of flagged) {
        if (extra <= 0) break;
        delete S.flags['pt_' + id]; extra--;
      }
    }
    // 当前格式的缺省值与数据校验，不与历史奖励/改名混写。
    function fillStateDefaults() {
      const S=getState();
      const defaults={
        skill:{craft:0,gather:0,combat:0}, toolkit:[null,null,null], toolDurs:{},
        equipIdx:{weapon:0,weapon2:0,armor:0,cloth:0,accessory:0}, flags:{}, log:[],
        seen:{}, killCount:{}, sold:{}, pointUses:{}, crops:[], diary:[], dur:{}, inv:{}, furniture:{},
        exp:{gather:0,craft:0,combat:0},
        buildings:{house:0,fire:0,storage:0,wall:0,watch:0,dock:0,farm:0},
        equipment:{weapon:null,weapon2:null,armor:null,cloth:null,accessory:null},
        statuses:{bleed:0,poison:0,cold:false,fear:0},
        stats:{hp:100,stamina:100,hunger:100,thirst:100,spirit:100},
        relicEquip:[null,null,null], weaponNames:{}, cellar:{items:[]}, satchelPref:{food:'',drink:''},
        settings:{roadAmbush:true}, foodExp:{}, relics:[], furnPending:{},
        laochao:{nextVisit:Math.max(5,S.day+1),arrived:false,arrivedDay:0,done:{},accepted:{}}
      };
      for(const [key,value]of Object.entries(defaults))if(!S[key])S[key]=value;
      for(const key of ['farmExt','houseExt','gatherCount','craftCount','missStreak'])if(S[key]===undefined)S[key]=0;
      if (S.coopExt === undefined) S.coopExt = 0;
      if (S.storeExt === undefined) S.storeExt = 0;
      if (S.pistolCalibrated === undefined) S.pistolCalibrated = false;
      if(S.atlantis===undefined)S.atlantis=null;
      if(S.settings.roadAmbush===undefined)S.settings.roadAmbush=true;
      S.settings.autoTools=S.settings.autoTools===true;
      if(!S.gatherRemainders || typeof S.gatherRemainders!=='object' || Array.isArray(S.gatherRemainders))S.gatherRemainders={};
      for(const key of Object.keys(S.gatherRemainders))if(!Number.isFinite(S.gatherRemainders[key]) || Math.abs(S.gatherRemainders[key])>0.500001)delete S.gatherRemainders[key];
      if(S.stats.health===undefined)S.stats.health=100;
      for(const key of ['stamina','hunger','thirst','spirit'])if(!Number.isFinite(S.stats[key]))S.stats[key]=100;
      if(S.log.length>LOG_KEEP)S.log.length=LOG_KEEP;
      if(!WEATHER[S.weather])S.weather='sun';
      if(!['craft','gather','combat'].includes(S.bookFocus))S.bookFocus='';
      const objects={lottery:{meter:0,day:0,uses:0},livestock:{pen:[],coop:[],autoFeed:true},traps:{placed:0},permMade:{},permUsed:{},training:{run:0,lift:0,lastDay:0}};
      for(const [key,value]of Object.entries(objects))if(!S[key]||typeof S[key]!=='object')S[key]=value;
      for(const key of ['pen','coop'])if(!Array.isArray(S.livestock[key]))S.livestock[key]=[];
      if(S.livestock.autoFeed===undefined)S.livestock.autoFeed=true;
      S.rainWater=Math.max(0,Math.min(20,Math.floor(Number(S.rainWater)||0)));
      S.hiveHoney=Math.max(0,Math.min(12,Math.floor(Number(S.hiveHoney)||0)));
      S.training.run=trainingCount('run');
      S.training.lift=trainingCount('lift');
      S.training.lastDay=Math.max(0,Math.floor(Number(S.training.lastDay)||0));
    }
    function normalizeLoadedSession() {
      const S=getState();
      // 退出后继续游戏不能绕过死亡结算；活着的存档恢复正常操作。
      if(S.death||(Number(S.stats.hp)||0)<=0){
        S.stats.hp=0;S.death=S.death||'你在上一局倒下了。';S.ending='D';
      }else{
        if(S.ending)S.ending=undefined;
        if(S.death)S.death=undefined;
      }
    }
    function normalizeState() {for(const stage of stages)stage.run();}
    // 平衡迁移集中在读档边界。后续版本追加条目，不在玩法入口散布旧字段判断。
    function applyBalanceMigrations() {
      const S=getState();
      const migrations=[function initialBalanceRevision(){
        let shells=0;
        if(S.learnedBlueprints?.bpFurnace || (S.inv.bpFurnace||0)>0 || S.furniture.fr3 || supplyRecordsAll(['island','cellar','sea']).some(x=>x.id==='bpFurnace'))shells=200;
        if(shells){S.inv.beibi=(S.inv.beibi||0)+shells;log('高炉图纸已改为收藏品，返还200贝壳币。','good');}
        for(const [kind,refund]of [['gather',8],['craft',12]])if((S.skill[kind]||0)>0){S.exp[kind]=(S.exp[kind]||0)+refund;log((kind==='gather'?'采集':'制造')+'首个主干点费用调整，返还'+refund+'经验。','good');}
      }];
      let version=Math.max(0,Math.floor(Number(S.balanceMigrationVersion)||0));
      while(version<migrations.length){migrations[version]();S.balanceMigrationVersion=++version;}
    }
    const stages=[
      {id:'defaults',run:fillStateDefaults},
      {id:'legacy',run:migrateLegacyState},
      {id:'session',run:normalizeLoadedSession},
      {id:'durability',run:()=>{for(const id in ITEMS)if(DURA[id]!==undefined)durList(id);}},
      {id:'toolkit',run:autoToolkit},
      {id:'lottery-ledger',run:reconcileLotteryInputs},
      {id:'nightmare-ledger',run:reconcileNightmareSouls},
      {id:'pending-loot',run:migratePendingLoot},
      {id:'food-expiry',run:settleStoredFood},
      {id:'balance',run:applyBalanceMigrations}
    ];
    return Object.freeze({validSave,migrateMeta:migrateSaltMeta,normalize:normalizeState,steps:Object.freeze(stages.map(stage=>stage.id))});
  }
  return Object.freeze({create});
})();
