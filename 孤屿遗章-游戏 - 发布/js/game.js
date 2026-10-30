/* ============================================================
   孤屿遗章 · 游戏引擎
   时间 / 生存 / 行动 / 战斗 / 建造 / 交易 / 事件 / 结局 / 存档
   ============================================================ */

const Game = (() => {
  const LOG_KEEP = 200;
  const gameState=StateStore.create();
  const runTutorial=TutorialRules.create({getState:()=>gameState.run,changed:change,items:ITEMS});
  const lifecycleRules=RunLifecycle.create({
    gameState,
    get persistPair(){return persistPair;},
    get onEnding(){return onEnding;},
    get log(){return log;},
    get change(){return change;},
    get invCount(){return invCount;},
    get removeItem(){return removeItem;},
    get giveStart(){return giveStart;},
    get CK(){return CK;},
    get ckGet(){return ckGet;},
    get save(){return save;},
    get maxStam(){return maxStam;},
    get diaryAdd(){return diaryAdd;},
    get difficultyUnlocked(){return difficultyUnlocked;},
    get identityUnlocked(){return identityUnlocked;},
    get metaSave(){return metaSave;},
    get metaState(){return metaState;},
    get metaBonus(){return metaBonus;},
    get ensureRunId(){return ensureRunId;},
    get rememberSettledRun(){return rememberSettledRun;},
    get metaSettle(){return metaSettle;},
    get validSave(){return validSave;}
  });
  const saveSlotsRules=SaveSlotRules.create({
    gameState,
    get persistPair(){return persistPair;},
    get metaSave(){return metaSave;},
    get metaState(){return metaState;},
    get ensureRunId(){return ensureRunId;},
    get rememberSettledRun(){return rememberSettledRun;},
    get backupPoints(){return backupPoints;},
    get validSave(){return validSave;}
  });
  const shopRules=ShopRules.create({
    gameState,
    get persistPair(){return persistPair;},
    get rnd(){return rnd;},
    get log(){return log;},
    get change(){return change;},
    get metaSave(){return metaSave;},
    get metaState(){return metaState;}
  });
  const relicsRules=RelicRules.create({
    gameState,
    get chance(){return chance;},
    get log(){return log;},
    get change(){return change;},
    get invCount(){return invCount;},
    get removeItem(){return removeItem;},
    get buffV(){return buffV;},
    get accessoryStat(){return accessoryStat;},
    get trainingHp(){return trainingHp;},
    get metaSave(){return metaSave;},
    get metaState(){return metaState;},
    get VENDOR_RELIC_CHANCE(){return VENDOR_RELIC_CHANCE;}
  });
  const achievementsRules=AchievementRules.create({
    gameState,
    get log(){return log;},
    get metaSave(){return metaSave;},
    get metaState(){return metaState;}
  });
  const lotteryRules=LotteryRules.create({
    gameState,
    get persistPair(){return persistPair;},
    get log(){return log;},
    get change(){return change;},
    get invCount(){return invCount;},
    get hasItem(){return hasItem;},
    get addItem(){return addItem;},
    get removeItem(){return removeItem;},
    get syncToolkit(){return syncToolkit;},
    get metaSave(){return metaSave;},
    get updateMailCheckpoint(){return updateMailCheckpoint;},
    get metaState(){return metaState;},
    get todayKey(){return todayKey;},
    get walletEntry(){return walletEntry;}
  });
  const mailboxRules=MailboxRules.create({
    gameState,
    get persistPair(){return persistPair;},
    get log(){return log;},
    get change(){return change;},
    get addItem(){return addItem;},
    get fitsInBag(){return fitsInBag;},
    get metaLoad(){return metaLoad;},
    get metaSave(){return metaSave;},
    get walletEntry(){return walletEntry;},
    get walletId(){return walletId;}
  });
  const accountRules=AccountRules.create({
    gameState,
    get repository(){return repository;},
    get persistPair(){return persistPair;},
    get log(){return log;},
    get change(){return change;},
    get reviveInfo(){return reviveInfo;},
    get showOverlay(){return showOverlay;},
    get hardCompleted(){return hardCompleted;},
    get metaState(){return metaState;},
    get mergeLotteryHistory(){return mergeLotteryHistory;},
    get craftBatchConfirmed(){return craftBatchConfirmed;}, set craftBatchConfirmed(value){craftBatchConfirmed=value;},
    get validSave(){return validSave;},
    get adCurrencyName(){return adCurrencyName;}
  });
  const nightmareRules=NightmareRules.create({
    gameState,
    get persistPair(){return persistPair;},
    get chance(){return chance;},
    get log(){return log;},
    get change(){return change;},
    get invCount(){return invCount;},
    get removeItem(){return removeItem;},
    get lanternRiskMul(){return lanternRiskMul;},
    get gainItem(){return gainItem;},
    get startFight(){return startFight;},
    get metaState(){return metaState;},
    get lotteryRandom(){return lotteryRandom;},
    get walletEntry(){return walletEntry;}
  });
  const objectivesRules=ObjectiveRules.create({
    gameState,
    get invCount(){return invCount;},
    get hasItem(){return hasItem;},
    get knowsBlueprint(){return knowsBlueprint;},
    get seasonInfo(){return seasonInfo;},
    get materialCount(){return materialCount;},
    get priceOf(){return priceOf;}
  });
  const endingsRules=EndingRules.create({
    gameState,
    get persistPair(){return persistPair;},
    get onEnding(){return onEnding;},
    get log(){return log;},
    get change(){return change;},
    get invCount(){return invCount;},
    get hasItem(){return hasItem;},
    get save(){return save;},
    get showOverlay(){return showOverlay;},
    get diaryAdd(){return diaryAdd;},
    get unlockChallenges(){return unlockChallenges;},
    get metaState(){return metaState;},
    get achUnlock(){return achUnlock;},
    get metaSettle(){return metaSettle;}
  });
  const consumablesRules=ConsumableRules.create({
    gameState,
    get chance(){return chance;},
    get log(){return log;},
    get change(){return change;},
    get applyHarm(){return applyHarm;},
    get restoreHealth(){return restoreHealth;},
    get addMin(){return addMin;},
    get BUFF_NAMES(){return BUFF_NAMES;},
    get maxStam(){return maxStam;},
    get medHeal(){return medHeal;},
    get itemUseCount(){return itemUseCount;},
    get takeUseItem(){return takeUseItem;},
    get hpMax(){return hpMax;}
  });
  const tradingRules=TradingRules.create({
    gameState,
    get log(){return log;},
    get change(){return change;},
    get invCount(){return invCount;},
    get hasItem(){return hasItem;},
    get notifyBagFull(){return notifyBagFull;},
    get addItem(){return addItem;},
    get removeItem(){return removeItem;},
    get gainItem(){return gainItem;},
    get seasonInfo(){return seasonInfo;},
    get isNight(){return isNight;},
    get diaryAdd(){return diaryAdd;},
    get supplyCount(){return supplyCount;},
    get takeSupply(){return takeSupply;},
    get merchantSupplySites(){return merchantSupplySites;},
    get merchantSellCount(){return merchantSellCount;},
    get materialSupplySites(){return materialSupplySites;},
    get matsOk(){return matsOk;},
    get takeMats(){return takeMats;},
    get fitsInBag(){return fitsInBag;},
    get SHELL_PER_COIN(){return SHELL_PER_COIN;},
    get SHELL_FOR_COIN(){return SHELL_FOR_COIN;}
  });
  const productionRules=ProductionRules.create({
    gameState,
    get rnd(){return rnd;},
    get chance(){return chance;},
    get log(){return log;},
    get change(){return change;},
    get invCount(){return invCount;},
    get hasItem(){return hasItem;},
    get knowsBlueprint(){return knowsBlueprint;},
    get notifyBagFull(){return notifyBagFull;},
    get foodLots(){return foodLots;},
    get syncFood(){return syncFood;},
    get addItem(){return addItem;},
    get durList(){return durList;},
    get durMaxOf(){return durMaxOf;},
    get durSync(){return durSync;},
    get removeItem(){return removeItem;},
    get selectedTool(){return selectedTool;},
    get drainTool(){return drainTool;},
    get capUsed(){return capUsed;},
    get capacity(){return capacity;},
    get settleStoredFood(){return settleStoredFood;},
    get warehouseSite(){return warehouseSite;},
    get stackSize(){return stackSize;},
    get warehouseAccess(){return warehouseAccess;},
    get warehouseCapacity(){return warehouseCapacity;},
    get cellarBuilt(){return cellarBuilt;},
    get cellarAccess(){return cellarAccess;},
    get hasTool(){return hasTool;},
    get addMin(){return addMin;},
    get gainItem(){return gainItem;},
    get COOP_EXT_MAX(){return COOP_EXT_MAX;},
    get coopCap(){return coopCap;},
    get liveState(){return liveState;},
    get sceneOf(){return sceneOf;},
    get staminaCost(){return staminaCost;},
    get nodeLv(){return nodeLv;},
    get EXP_CRAFT(){return EXP_CRAFT;},
    get cxTimeMul(){return cxTimeMul;},
    get cxRefundChance(){return cxRefundChance;},
    get cxExtraChance(){return cxExtraChance;},
    get cxDurMul(){return cxDurMul;},
    get awardExperience(){return awardExperience;},
    get expLevel(){return expLevel;},
    get diaryAdd(){return diaryAdd;},
    get FARM_LIVESTOCK_IDS(){return FARM_LIVESTOCK_IDS;},
    get STORE_EXT_CAP(){return STORE_EXT_CAP;},
    get FARM_EXTRA_MAX(){return FARM_EXTRA_MAX;},
    get metaBonus(){return metaBonus;},
    get craftBatchConfirmed(){return craftBatchConfirmed;}, set craftBatchConfirmed(value){craftBatchConfirmed=value;},
    get longActWarn(){return longActWarn;},
    get hpMax(){return hpMax;}
  });
  const combatRules=CombatRules.create({
    gameState,
    get inventory(){return inventory;},
    get onFight(){return onFight;},
    get onEnding(){return onEnding;},
    get rnd(){return rnd;},
    get chance(){return chance;},
    get log(){return log;},
    get change(){return change;},
    get qtyParse(){return qtyParse;},
    get invCount(){return invCount;},
    get hasItem(){return hasItem;},
    get removeItem(){return removeItem;},
    get weaponTurnSlot(){return weaponTurnSlot;},
    get drainWeapon(){return drainWeapon;},
    get drainEquipSlot(){return drainEquipSlot;},
    get drainById(){return drainById;},
    get applyHarm(){return applyHarm;},
    get restoreHealth(){return restoreHealth;},
    get gainItem(){return gainItem;},
    get isNight(){return isNight;},
    get raidWolves(){return raidWolves;},
    get save(){return save;},
    get die(){return die;},
    get sceneOf(){return sceneOf;},
    get arriveAt(){return arriveAt;},
    get pointsOf(){return pointsOf;},
    get doPoint(){return doPoint;},
    get showOverlay(){return showOverlay;},
    get meleeWeapons(){return meleeWeapons;},
    get buffV(){return buffV;},
    get playerAtk(){return playerAtk;},
    get rangedAtk(){return rangedAtk;},
    get maxStam(){return maxStam;},
    get playerDef(){return playerDef;},
    get shieldBlock(){return shieldBlock;},
    get RANGE_MELEE(){return RANGE_MELEE;},
    get enemyRange(){return enemyRange;},
    get myAttackRange(){return myAttackRange;},
    get myMoveSpeed(){return myMoveSpeed;},
    get sweepInfo(){return sweepInfo;},
    get ACT_CD_BASE(){return ACT_CD_BASE;},
    get hasHeavy(){return hasHeavy;},
    get hasSure(){return hasSure;},
    get heavyInfo(){return heavyInfo;},
    get sureInfo(){return sureInfo;},
    get coverReduceOf(){return coverReduceOf;},
    get rollEnemyIntents(){return rollEnemyIntents;},
    get combatSpeed(){return combatSpeed;},
    get wNameOf(){return wNameOf;},
    get temperatureInfo(){return temperatureInfo;},
    get rangedWeapon(){return rangedWeapon;},
    get hasRanged(){return hasRanged;},
    get rangedKind(){return rangedKind;},
    get rangedAcc(){return rangedAcc;},
    get ammoConsume(){return ammoConsume;},
    get cxCrit(){return cxCrit;},
    get critMul(){return critMul;},
    get sweepCdTotal(){return sweepCdTotal;},
    get sweepMul(){return sweepMul;},
    get medHeal(){return medHeal;},
    get vampRate(){return vampRate;},
    get execThreshold(){return execThreshold;},
    get revengeBonus(){return revengeBonus;},
    get hasDualDagger(){return hasDualDagger;},
    get wallBlockBonus(){return wallBlockBonus;},
    get wallDurMul(){return wallDurMul;},
    get rageAtkMul(){return rageAtkMul;},
    get rageTakenMul(){return rageTakenMul;},
    get ironTakenMul(){return ironTakenMul;},
    get ironAtkMul(){return ironAtkMul;},
    get awardExperience(){return awardExperience;},
    get diaryAdd(){return diaryAdd;},
    get nightmareInfusionBonus(){return nightmareInfusionBonus;},
    get metaSave(){return metaSave;},
    get metaState(){return metaState;},
    get noteMissStreak(){return noteMissStreak;},
    get metaBonus(){return metaBonus;},
    get metaSettle(){return metaSettle;},
    get hasRelic(){return hasRelic;},
    get hpMax(){return hpMax;}
  });
  const skillsRules=SkillRules.create({
    gameState,
    get persistPair(){return persistPair;},
    get chance(){return chance;},
    get log(){return log;},
    get change(){return change;},
    get save(){return save;},
    get meleeWeapons(){return meleeWeapons;},
    get accessoryStat(){return accessoryStat;},
    get metaState(){return metaState;}
  });
  const weaponCareRules=WeaponCare.create({
    gameState,
    get chance(){return chance;},
    get log(){return log;},
    get change(){return change;},
    get hasItem(){return hasItem;},
    get durList(){return durList;},
    get durMaxOf(){return durMaxOf;},
    get durSync(){return durSync;},
    get removeItem(){return removeItem;},
    get keepsBroken(){return keepsBroken;},
    get addMin(){return addMin;},
    get gainItem(){return gainItem;},
    get pistolCalib(){return pistolCalib;},
    get cxRepairFree(){return cxRepairFree;}
  });
  const combatStatsRules=CombatStats.create({
    gameState,
    get chance(){return chance;},
    get log(){return log;},
    get invCount(){return invCount;},
    get removeItem(){return removeItem;},
    get meleeWeaponNow(){return meleeWeaponNow;},
    get drainEquipSlot(){return drainEquipSlot;},
    get healthValue(){return healthValue;},
    get seasonOnDay(){return seasonOnDay;},
    get BUFF_NAMES(){return BUFF_NAMES;},
    get RANGE_BOW(){return RANGE_BOW;},
    get RANGE_GUN(){return RANGE_GUN;},
    get RANGE_MELEE(){return RANGE_MELEE;},
    get sharpenAm(){return sharpenAm;},
    get nodeLv(){return nodeLv;},
    get cxAtk(){return cxAtk;},
    get cxDef(){return cxDef;},
    get swiftBonus(){return swiftBonus;},
    get gunNodeLv(){return gunNodeLv;},
    get ammoSaveChance(){return ammoSaveChance;},
    get bedStamBonus(){return bedStamBonus;},
    get trainingAtk(){return trainingAtk;},
    get nightmareInfusionBonus(){return nightmareInfusionBonus;},
    get metaBonus(){return metaBonus;},
    get hpMax(){return hpMax;}
  });
  const eventsRules=WorldEventRules.create({
    gameState,
    get onOverlay(){return onOverlay;},
    get chance(){return chance;},
    get log(){return log;},
    get change(){return change;},
    get hasItem(){return hasItem;},
    get removeItem(){return removeItem;},
    get applyHarm(){return applyHarm;},
    get addMin(){return addMin;},
    get gainItem(){return gainItem;},
    get raidDay(){return raidDay;},
    get die(){return die;},
    get startFight(){return startFight;},
    get diaryAdd(){return diaryAdd;},
    get gainRandomRelic(){return gainRandomRelic;}
  });
  const gatheringRules=GatheringRules.create({
    gameState,
    get onOverlay(){return onOverlay;},
    get rnd(){return rnd;},
    get chance(){return chance;},
    get pick(){return pick;},
    get log(){return log;},
    get change(){return change;},
    get qtyParse(){return qtyParse;},
    get invCount(){return invCount;},
    get hasItem(){return hasItem;},
    get notifyBagFull(){return notifyBagFull;},
    get addItem(){return addItem;},
    get removeItem(){return removeItem;},
    get selectedTool(){return selectedTool;},
    get bestToolTier(){return bestToolTier;},
    get autoToolsEnabled(){return autoToolsEnabled;},
    get wearSelectedTool(){return wearSelectedTool;},
    get autoToolkit(){return autoToolkit;},
    get drainById(){return drainById;},
    get hasTool(){return hasTool;},
    get applyHarm(){return applyHarm;},
    get lanternRiskMul(){return lanternRiskMul;},
    get addMin(){return addMin;},
    get gainItem(){return gainItem;},
    get seasonInfo(){return seasonInfo;},
    get isNight(){return isNight;},
    get triggerStory(){return triggerStory;},
    get die(){return die;},
    get sceneOf(){return sceneOf;},
    get canTravel(){return canTravel;},
    get staminaCost(){return staminaCost;},
    get travel(){return travel;},
    get triggerRandomEvent(){return triggerRandomEvent;},
    get showOverlay(){return showOverlay;},
    get EXP_GATHER(){return EXP_GATHER;},
    get gxYieldMul(){return gxYieldMul;},
    get gxTimeMul(){return gxTimeMul;},
    get gxEnergyMul(){return gxEnergyMul;},
    get gxPineBonus(){return gxPineBonus;},
    get gxWoodExtra(){return gxWoodExtra;},
    get awardExperience(){return awardExperience;},
    get startFight(){return startFight;},
    get diaryAdd(){return diaryAdd;},
    get doPeakRitual(){return doPeakRitual;},
    get nightmareEncounter(){return nightmareEncounter;},
    get achUnlock(){return achUnlock;}
  });
  const journeyRules=JourneyRules.create({
    gameState,
    get chance(){return chance;},
    get log(){return log;},
    get change(){return change;},
    get invCount(){return invCount;},
    get hasItem(){return hasItem;},
    get removeItem(){return removeItem;},
    get capUsed(){return capUsed;},
    get capacity(){return capacity;},
    get autoStoreWarehouse(){return autoStoreWarehouse;},
    get lanternRiskMul(){return lanternRiskMul;},
    get addMin(){return addMin;},
    get isNight(){return isNight;},
    get ROAD_AMBUSH_MIN_DANGER(){return ROAD_AMBUSH_MIN_DANGER;},
    get pointsOf(){return pointsOf;},
    get lightLevel(){return lightLevel;},
    get triggerRandomEvent(){return triggerRandomEvent;},
    get showOverlay(){return showOverlay;},
    get temperatureInfo(){return temperatureInfo;},
    get temperatureEntered(){return temperatureEntered;},
    get startFight(){return startFight;},
    get diaryAdd(){return diaryAdd;},
    get nightmareEncounter(){return nightmareEncounter;},
    get metaBonus(){return metaBonus;},
    get hasRelic(){return hasRelic;}
  });
  const livestockRules=LivestockRules.create({
    gameState,
    get rnd(){return rnd;},
    get chance(){return chance;},
    get log(){return log;},
    get change(){return change;},
    get hasItem(){return hasItem;},
    get removeItem(){return removeItem;},
    get warehouseCapacity(){return warehouseCapacity;},
    get deliverToBag(){return deliverToBag;},
    get COOP_EXT_MAX(){return COOP_EXT_MAX;},
    get supplyRecords(){return supplyRecords;},
    get supplyCount(){return supplyCount;},
    get takeSupply(){return takeSupply;}
  });
  const survivalRules=SurvivalRules.create({
    gameState,
    get onOverlay(){return onOverlay;},
    get rnd(){return rnd;},
    get chance(){return chance;},
    get pick(){return pick;},
    get log(){return log;},
    get change(){return change;},
    get hasItem(){return hasItem;},
    get drainById(){return drainById;},
    get HOUR_EFFECTS(){return HOUR_EFFECTS;},
    get session(){return session;},
    get deliverToBag(){return deliverToBag;},
    get gainItem(){return gainItem;},
    get collectDailyReport(){return collectDailyReport;},
    get raidDay(){return raidDay;},
    get storyDay(){return storyDay;},
    get triggerStory(){return triggerStory;},
    get snapshot(){return snapshot;},
    get save(){return save;},
    get die(){return die;},
    get maxStam(){return maxStam;},
    get chainTier(){return chainTier;},
    get nightRaid(){return nightRaid;},
    get diary(){return diary;},
    get hasRelic(){return hasRelic;},
    get hpMax(){return hpMax;},
    get sleepQuality(){return sleepQuality;}
  });
  const inventory=InventoryRules.create({state:gameState,
    get foodSatchel(){return foodSatchel;},
    get persistPair(){return persistPair;},
    get onOverlay(){return onOverlay;},
    get log(){return log;},
    get change(){return change;},
    get save(){return save;},
    get showOverlay(){return showOverlay;},
    get meleeWeapons(){return meleeWeapons;},
    get hasTwoHand(){return hasTwoHand;},
    get wNameOf(){return wNameOf;},
    get diaryAdd(){return diaryAdd;},
    get supplyContainer(){return supplyContainer;},
    get materialCount(){return materialCount;},
    get STORE_EXT_CAP(){return STORE_EXT_CAP;},
    get nowTick(){return nowTick;},
    get atlantisCamp(){return atlantisCamp;},
    get metaSave(){return metaSave;},
    get metaState(){return metaState;},
    get metaBonus(){return metaBonus;}
  });            // 全局状态
  const foodSatchel=FoodSatchel.create({getState:()=>gameState.run,ITEMS,warehouseSite,cellarBuilt,supplyCount,foodLots,nowTick,supplyRecords,supplyRecordsAll,supplyContainer,supplySites,invCount,hasRelic,save,change,log,takeSupply,applyFoodEffects});
  const migrations=StateMigrations.create({getState:()=>gameState.run,ITEMS,DIFFICULTIES,WEATHER,DURA,LOG_KEEP,SKILL_TRUNK_COST,costMul,log,combatLv,nodeLv,trainingCount,durList,autoToolkit,reconcileLotteryInputs,reconcileNightmareSouls,settleStoredFood,supplyRecordsAll,addItem,
    migrateFoodChoices:()=>foodSatchel.migrateSatchelChoices()});
  
  const storagePort = typeof window!=='undefined'&&window.GuyuSaveBridge ? window.GuyuSaveBridge.storage : {getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)};
  const saveTransactions=SaveTransactions.create({
    storage:{getItem:key=>storagePort.getItem(key),setItem:(key,value)=>storagePort.setItem(key,value),removeItem:key=>storagePort.removeItem(key)},
    getPair:()=>({save:gameState.run,meta:gameState.profile}),setPair:(save,meta)=>{gameState.run=save;gameState.profile=meta;},
    migrateMeta:()=>migrateSaltMeta(gameState.profile),normalize:revision=>{normalizeState();gameState.run._rev=revision;},
    reconcile:()=>{reconcileLotteryInputs();reconcileNightmareSouls();},saveRun:()=>save(),saveMeta:()=>metaSave(),
    mirror:()=>{if(gameState.run)ckMirror(CK.save,CK.saveAt,localStorage.getItem('guyuyizhang_save'));ckMirror(CK.meta,CK.metaAt,localStorage.getItem('guyuyizhang_meta'));},
    push:()=>cloudPush(false),onFailure:error=>{if(typeof onSaveFail==='function')onSaveFail(error);}
  });
  const repository=SaveRepository.create({
    storage:{getItem:key=>storagePort.getItem(key),setItem:(key,value)=>storagePort.setItem(key,value),removeItem:key=>storagePort.removeItem(key)},
    cookies:{get text(){return document.cookie;},set text(value){document.cookie=value;}},
    getState:()=>gameState.run,setState:value=>{gameState.run=value;},getMeta:()=>gameState.profile,setMeta:value=>{gameState.profile=value;},isStaging:()=>gameState.staging,
    transactions:saveTransactions,LOG_KEEP,validSave,normalizeState,migrateSaltMeta,migrateRedeemReceipts,
    onConflict:revision=>{if(typeof onSaveConflict==='function')onSaveConflict(revision);},
    onFailure:error=>{if(typeof onSaveFail==='function')onSaveFail(error);},push:()=>cloudPush(false)
  });
  function recoverPendingWrite(){saveTransactions.recover();}
  function persistPair(nextS,nextM,normalize){return saveTransactions.commit(nextS,nextM,normalize);}
  let onLog = null;        // 文本回调（ui 注册）
  let onChange = null;     // 状态刷新回调（ui 注册）
  let onFight = null;      // 战斗界面回调
  let onEnding = null;     // 结局回调
  let onOverlay = null;    // 弹窗（选择/事件）回调
  let onSaveFail = null;      // 存档写不进去时通知界面（配额满 / 被浏览器限制）
  let onSaveConflict = null;  // 检测到别的标签页有更新进度时通知界面

  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const chance = (p) => Math.random() < p;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const fmtTime = () => { const h = Math.floor(gameState.run.minute / 60), m = gameState.run.minute % 60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; };

  // 界面上的日志是 DOM 里最近 80 条；S.log 只是为了存档留个尾巴，绝不能无限长
  // （曾经一天天攒到 4810 条 / 378KB，把存档码顶到 940KB，逼近 localStorage 上限有掉档风险）

  function log(text, cls) {
    if (onLog) onLog(text, cls);
    if (gameState.run && text) {
      gameState.run.log.unshift({ t:`第${gameState.run.day}天 ${fmtTime()}`, text, cls });
      if (gameState.run.log.length > LOG_KEEP) gameState.run.log.length = LOG_KEEP;
    }
  }
function change() { 
    settleStoredFood();
    if(gameState.run?.relics?.includes('satchel')&&!gameState.run.flags.satchelHelpSeen){gameState.run.flags.satchelHelpSeen=true;log('长按食之包卡面，可选最多3种优先食物、饮料或禁食物品。','sys');}
    if (gameState.run) syncToolkit();   // 工具用坏了就从工具栏清掉、备用自动顶上（别让空壳一直挂在那）
    if (gameState.run && gameState.run.stats && gameState.run.stats.hp <= 0 && !gameState.run.ending && !gameState.run.death) { gameState.run.stats.hp = 0; die('你伤势太重，倒在了荒野里。'); return; }   // 兜底：生命≤0必定死亡
    // 精神低落会压低体力上限，体力要跟着上限走（喝药透支后不该还能顶着一管超额的体力）
    if (gameState.run && gameState.run.stats) { const ms = maxStam(); if (gameState.run.stats.stamina > ms) gameState.run.stats.stamina = ms; }
    if (gameState.run) gameState.run._dirty = true;      // 有改动 → 兜底自动存档（每 20 秒那次）才知道该不该写
    if (onChange) onChange();
    if (!gameState.run.death) achCheck();
    if (!gameState.run.death && !gameState.run.ending) dangerTip();
  }
  function qtyParse(q) { if (typeof q === 'string' && q.includes('-')) { const [a,b] = q.split('-').map(Number); return rnd(a,b); } return q; }

  // ---------- 物品 ----------
  function invCount(...args){return inventory.invCount(...args);}
  function hasItem(...args){return inventory.hasItem(...args);}
  function knowsBlueprint(...args){return inventory.knowsBlueprint(...args);}
  function learnBlueprint(...args){return inventory.learnBlueprint(...args);}
  // 背包/仓库满了：红字日志容易被忽略，这里额外弹一个提醒（每次间隔至少 1 小时游戏时间，避免刷屏）
  function notifyBagFull(...args){return inventory.notifyBagFull(...args);}
  // 危险状态醒目提示：生命 <30 且（饱食 <30 或水分 <30）时，每个游戏日只弹一次（跨日可再弹）。
  // 旧档没有 S.dangerTipDay 字段 → undefined，天然兼容（只新增字段，不迁移旧数据）。
  function dangerTip() {
    if (!gameState.run || gameState.run.death || gameState.run.ending) return;
    const hp = gameState.run.stats && gameState.run.stats.hp, hu = gameState.run.stats && gameState.run.stats.hunger, th = gameState.run.stats && gameState.run.stats.thirst;
    if (!(hp < 30) || !(hu < 30 || th < 30)) return;
    if (gameState.run.dangerTipDay === gameState.run.day) return;   // 今天已经弹过 → 不刷屏
    gameState.run.dangerTipDay = gameState.run.day;
    const parts = [];
    if (hu < 30) parts.push(`饱食仅 ${Math.round(hu)}`);
    if (th < 30) parts.push(`水分仅 ${Math.round(th)}`);
    showOverlay({
      kind: 'danger',
      title: '⚠ 状态危殆',
      text: `你的生命只剩 ${Math.round(hp)}，${parts.join('、')}——又饿/又渴又带伤，继续硬撑会出事。\n\n先吃点东西、喝口水、敷点药，把命稳住再动。`,
      choices: [{ label: '我这就去补充', ok: () => {} }],
    });
    log(`警告：生命 ${Math.round(hp)}、${parts.join('、')}，状态危殆。`, 'warn');
  }
  function foodLots(...args){return inventory.foodLots(...args);}
  function syncFood(...args){return inventory.syncFood(...args);}
  function foodFreshness(...args){return inventory.foodFreshness(...args);}
  function addItem(...args){return inventory.addItem(...args);}
  // ---- 同名多件的耐久：每件单独记在 toolDurs 数组里；S.dur 只作旧代码兼容，取"最快会坏的那件" ----
  function durList(...args){return inventory.durList(...args);}
  function durMaxOf(...args){return inventory.durMaxOf(...args);}
  function durSync(...args){return inventory.durSync(...args);}
  function fixEquipIdx(...args){return inventory.fixEquipIdx(...args);}
  function removeItem(...args){return inventory.removeItem(...args);}
  function durOf(...args){return inventory.durOf(...args);}
  // 损耗指定工具/武器：id 见 DURA；kind 用于"用最好的那把"（axe/pick/knife/hoe/rod/net）
  // 只决定本次使用哪一件，不改手动工具槽；默认手动，自动模式由设置明确开启。
  function selectedTool(...args){return inventory.selectedTool(...args);}
  function bestToolTier(...args){return inventory.bestToolTier(...args);}
  function autoToolsEnabled(...args){return inventory.autoToolsEnabled(...args);}
  function setAutoTools(...args){return inventory.setAutoTools(...args);}
  function wearSelectedTool(...args){return inventory.wearSelectedTool(...args);}
  function autoToolkit(...args){return inventory.autoToolkit(...args);}
  // 工具栏跟背包对齐：工具用坏被移出背包后，栏里不能还挂着它（玩家反馈"石斧耐久没了还挂在装备栏"）。
  // 清掉之后再把背包里同款的备用工具自动顶上 —— 就是玩家期望的"用完自动接着装"。
  function syncToolkit(...args){return inventory.syncToolkit(...args);}
  function equipTool(...args){return inventory.equipTool(...args);}
  function unequipTool(...args){return inventory.unequipTool(...args);}
  function drainTool(...args){return inventory.drainTool(...args);}
  
  // 双持近战时，"本轮轮到哪把武器出手"。伤害、耐久磨损、日志标注三处都读这里，
  // 保证"用哪把打 → 扣哪把耐久 → 日志写哪把"永远一致。
  function weaponTurnSlot(...args){return inventory.weaponTurnSlot(...args);}
  function meleeWeaponNow(...args){return inventory.meleeWeaponNow(...args);}
  function drainWeapon(...args){return inventory.drainWeapon(...args);}
  // 磨损"某个装备槽里那把"——近战挥砍和远程开火共用这一份逻辑。
  // ⚠️ 以前只有近战会调这里：弓/手枪开火只扣弹药、本体永远不坏
  //    （玩家反馈"神弓怎么不掉耐久"，而且邮件里那把是带着剩余耐久流转的）。
  function recordBroken(...args){return inventory.recordBroken(...args);}
  function drainEquipSlot(...args){return inventory.drainEquipSlot(...args);}
  function drainById(...args){return inventory.drainById(...args);}
  function keepsBroken(...args){return inventory.keepsBroken(...args);}
  // 货币/图纸/主线物品不占容量；工具装备一件 1 格；普通堆叠每 20 件 1 格。
  
  function capUsed(...args){return inventory.capUsed(...args);}
  function capacity(...args){return inventory.capacity(...args);}
  // 存储中的到期食物也原地腐坏，不等取出才转换；不创建未解锁的仓库。
  function settleStoredFood(...args){return inventory.settleStoredFood(...args);}
  function warehouseSite(...args){return inventory.warehouseSite(...args);}
  function stackSize(...args){return inventory.stackSize(...args);}
  function warehouseAccess(...args){return inventory.warehouseAccess(...args);}
  function warehouseDepositAccess(...args){return inventory.warehouseDepositAccess(...args);}
  function warehouseCapacity(...args){return inventory.warehouseCapacity(...args);}
  function storedCounts(...args){return inventory.storedCounts(...args);}
  function storedSlots(...args){return inventory.storedSlots(...args);}
  function warehouseState(...args){return inventory.warehouseState(...args);}
  function equipBackpack(...args){return inventory.equipBackpack(...args);}
  // 存仓保护实际占用的实例，不把所有同名备用件一起锁住。
  function warehouseReservedIndices(...args){return inventory.warehouseReservedIndices(...args);}
  function warehouseDepositCount(...args){return inventory.warehouseDepositCount(...args);}
  function warehouseAccessCheck(...args){return inventory.warehouseAccessCheck(...args);}
  function warehouseTransferMax(...args){return inventory.warehouseTransferMax(...args);}
  // 所有手动库存搬运使用同一事务边界：先在副本上操作，写盘成功才提交。
  // 玩法函数只负责校验与搬运，不各自维护回滚标志。
  function commitInventoryTransfer(...args){return inventory.commitInventoryTransfer(...args);}

  function transferWarehouse(...args){return inventory.transferWarehouse(...args);}
  function cellarBuilt(...args){return inventory.cellarBuilt(...args);}
  function cellarAccess(...args){return inventory.cellarAccess(...args);}
  function cellarState(...args){return inventory.cellarState(...args);}
  function cellarTransferMax(...args){return inventory.cellarTransferMax(...args);}
  function transferCellar(...args){return inventory.transferCellar(...args);}
  function satchelEligible(...args){return inventory.satchelEligible(...args);}
  function satchelSelections(...args){return inventory.satchelSelections(...args);}
  function setSatchelSelections(...args){return inventory.setSatchelSelections(...args);}
  function toggleSatchelSelection(...args){return inventory.toggleSatchelSelection(...args);}
  function satchelStatus(...args){return inventory.satchelStatus(...args);}
  function satchelAvailable(...args){return inventory.satchelAvailable(...args);}
  function discardItems(...args){return inventory.discardItems(...args);}
  function storeAllWarehouse(...args){return inventory.storeAllWarehouse(...args);}
  function warehouseAutoEligible(...args){return inventory.warehouseAutoEligible(...args);}
  function warehouseAutoItems(...args){return inventory.warehouseAutoItems(...args);}
  function setWarehouseAutoItems(...args){return inventory.setWarehouseAutoItems(...args);}
  function autoStoreWarehouse(...args){return inventory.autoStoreWarehouse(...args);}
  function replacePending(...args){return inventory.replacePending(...args);}

  function hasTool(...args){return inventory.hasTool(...args);}

  // ---------- 时间 ----------
  // 中毒 / 流血：**每过 1 小时**结算一次。抽成函数的唯一原因是 sleep()：
  // 睡觉走的是"直接推进 S.minute"，不经过 addMin()，所以以前这一觉里 debuff 一次都不结算 ——
  // 等于"睡一觉把中毒/流血白嫖过去"（作者 2026-09-25 反馈：中毒等 debuff 睡眠也要持续扣血）。
  // 返回 true = 人已经死了，调用方要立刻收工（保持和原来 `return die(...)` 一样的短路语义）。
  function healthValue(...args){return survivalRules.healthValue(...args);}
  function applyHarm(...args){return survivalRules.applyHarm(...args);}
  function healthTick(...args){return survivalRules.healthTick(...args);}
  function restoreHealth(...args){return survivalRules.restoreHealth(...args);}
  function debuffTick(...args){return survivalRules.debuffTick(...args);}

  const HOUR_EFFECTS = (effectTick) => {
    const season = seasonInfo();
    const nightNow = isNight();   // 与全局 isNight() 同一份判定，避免 22点/6点 边界散落两处
    // 食之包：饱食/水分低于 50 自动进食饮水
    // ⚠️ 作者 2026-09-19：自动吃的东西可以自己指定（玩家反馈"它总是吃超级大蛋，很心疼"）。
    //    没指定偏好时，改成"挑够用的里面最省的那份"，不再无脑拿第一件（背包顺序里超级大蛋常排前面）。

    foodSatchel.hourly();
    const mb = metaBonus();
    const diffMul = (DIFFICULTIES[gameState.run.difficulty] && DIFFICULTIES[gameState.run.difficulty].drainMul) || 1;   // 简单/普通：饥渴消耗更慢
    gameState.run.stats.hunger = Math.max(0, gameState.run.stats.hunger - (gameState.run.difficulty === 'dev' ? 0 : 2 * (1 - mb.cons) * diffMul));
    // ⚠️ 滤雨器是"在水壶上加装滤网"（升级），必须一并算作有水壶 ——
    //    否则升完级 tank 被删掉、-20% 口渴效果直接失效（玩家反馈"升级后水壶不见了、效果还有吗"）。
    const hasTank = !!(gameState.run.furniture.tank || gameState.run.furniture.rainfilter);
    gameState.run.stats.thirst = Math.max(0, gameState.run.stats.thirst - (gameState.run.difficulty === 'dev' ? 0 : 2 * (season.thirstMul || 1) * (hasTank ? 0.8 : 1) * (1 - mb.cons) * diffMul));
    if (gameState.run.stats.hunger <= 0 || gameState.run.stats.thirst <= 0) {
      applyHarm(10);
      log('饥渴正在侵蚀你的身体……（-10 生命）', 'danger');
      if (gameState.run.stats.hp <= 0) return die('你倒在荒野里，再也没能站起来。');
    }
    // 所有冷热来源合为同一体感值；跨区域的 30 分钟内只提醒、不伤血。
    const temp = temperatureInfo(gameState.run.scene, gameState.run.zone, effectTick);
    const oldTemp = gameState.run.statuses.cold ? 'cold' : (gameState.run.statuses.heat ? 'heat' : 'normal');
    gameState.run.statuses.cold = temp.state === 'cold';
    gameState.run.statuses.heat = temp.state === 'heat';
    if (temp.state !== 'normal' && temp.grace > 0) {
      if (oldTemp !== temp.state) log(`这里${temp.state === 'cold' ? '太冷' : '太热'}，你有 ${temp.grace} 分钟换衣缓冲。`, 'warn');
    } else if (temp.state !== 'normal') {
      const dmg = temp.state === 'cold' ? 5 : 3;
      applyHarm(dmg);
      log(`体感温度${temp.state === 'cold' ? '过低' : '过高'}（-${dmg} 生命）。调整衣物，或回到安全区域。`, 'danger');
      if (gameState.run.stats.hp <= 0) return die(temp.state === 'cold' ? '你在严寒中倒下了。' : '你在酷热中倒下了。');
    } else if (oldTemp !== 'normal') log('体感温度恢复舒适。', 'good');
    // 中毒/流血
    if (debuffTick()) return;
    // 食物变质
    for(const fid of Object.keys(gameState.run.foodExp || {})) {
      if(!ITEMS[fid] || !ITEMS[fid].spoil) continue;
      const lots=foodLots(fid), expired=lots.filter(x=>x.exp<=effectTick).reduce((n,x)=>n+x.qty,0);
      if(expired) {
        gameState.run.inv[fid]-=expired; if(!gameState.run.inv[fid]) delete gameState.run.inv[fid];
        syncFood(fid,lots.filter(x=>x.exp>effectTick));
        gainItem('rot',expired);
        log(`${ITEMS[fid].name}×${expired} 已经变质。`, 'warn');
      }
    }

    // 精神：深夜野外
    if (nightNow && gameState.run.scene !== 'camp' && gameState.run.scene !== 'shore') {
      gameState.run.stats.spirit = Math.max(0, gameState.run.stats.spirit - 2);
      if (gameState.run.stats.spirit < 30 && chance(0.3)) log('黑暗里似乎有眼睛在看你……（精神恍惚）', 'warn');
    }
    change();
  };

  // ---------- 弹窗暂停：开着"纯管理"弹窗时，时间不流逝 ----------
  // 看背包/装备/技能/图鉴这些界面时不该被时间推着走（也免得边翻东西边掉饱食度）。
  // 由 ui.js 在开关这些弹窗时调用 setTimeFreeze()；营地面板/制造/交易/耕地那些"要花时间的操作"
  // 不在此列（它们本身就是主动消耗时间的行为）。
  const session=GameSession.create();
  function setHostSuspended(...args){return survivalRules.setHostSuspended(...args);}
  function hostSuspended(...args){return survivalRules.hostSuspended(...args);}
  function setTimeFreeze(...args){return survivalRules.setTimeFreeze(...args);}
  function timeFrozen(...args){return survivalRules.timeFrozen(...args);}

  function lanternActive(...args){return survivalRules.lanternActive(...args);}
  function lanternRiskMul(...args){return survivalRules.lanternRiskMul(...args);}
  function wearLantern(...args){return survivalRules.wearLantern(...args);}

  function addMin(...args){return survivalRules.addMin(...args);}

  // ---------- 水下负面状态（顶栏徽标用）----------
  // 与上面 HOUR_EFFECTS 里的判定共用同一套条件（礁石栖息地是安全点，不判）。
  // ⚠️ 做成"每次渲染现算"而不是存进 S.statuses：玩家当场换上潜水服 / 氧气罩就该立刻消失，
  //    存字段的话要等下一次时间流逝才更新，中间那段时间徽标是骗人的。
  function diveWarn() {
    if (!gameState.run || gameState.run.scene !== 'atlantis' || gameState.run.zone === 'habitat') return { pressure: false, o2: false };
    const hasSuit = ['diveSuit', 'diveSuit2'].includes(gameState.run.equipment.cloth);
    const hasO2 = (gameState.run.toolkit || []).includes('diveMask') || hasItem('diveMask') || hasRelic('atlantisSeed');
    return { pressure: !hasSuit, o2: !hasO2 };
  }

  function pendingLootInfo() {return [];}
  function deliverToBag(id,n) {
    const before=capUsed(),ok=addItem(id,n,true,true),load=loadPenalty();
    if(ok&&load.excess>0&&capUsed()>before)log(`带了过多的物品（${capUsed()}/${capacity()}格），移动体力消耗增加${load.percent}%。`,'danger');
    return ok;
  }
  function gainItem(id,n) {return deliverToBag(id,n);}
  function giveStart(id,n,silent=true) {return addItem(id,n,silent,true);}
  function collectPending() {return {ok:false,reason:'战利品已直接收入背包。'};}

  // ---------- 牧场：鸡舍 / 羊圈（各最多 3 只） ----------
  // 羊：每天吃 1 干草 → 产 1 羊毛，40~60 天后寿终（留 3 兽肉）
  // 鸡：小鸡连喂 5 天小麦变母鸡；母鸡每天吃 1 小麦 → 下 1 蛋，20~30 天后寿终（留 1 兽肉）
  // 规则：没喂上就不产出也不长大（不会饿死）；产出直接进背包，满包时允许超载。
  
  const COOP_EXT_MAX = 2;                 // 鸡舍可扩建两次：3 只 → 4 只 → 5 只（羊圈不扩建）
  function coopCap(...args){return livestockRules.coopCap(...args);}
  function liveCap(...args){return livestockRules.liveCap(...args);}
  function liveState(...args){return livestockRules.liveState(...args);}
  function liveCount(...args){return livestockRules.liveCount(...args);}
  function liveFull(...args){return livestockRules.liveFull(...args);}
  function liveInfo(...args){return livestockRules.liveInfo(...args);}
  function addSheep(...args){return livestockRules.addSheep(...args);}
  function addChick(...args){return livestockRules.addChick(...args);}
  function toggleAutoFeed(...args){return livestockRules.toggleAutoFeed(...args);}
  function livestockNewDay(...args){return livestockRules.livestockNewDay(...args);}
  // 草地陷阱：**每天清晨结算**，结果进"每日晨报"；选项由弹窗给（见 claimDailyTrap）。
  // 以前是"次日去草地才掷骰"，玩家经常不知道到底触发没有 —— 现在每天固定汇报。
  function resolveTrapDaily(...args){return livestockRules.resolveTrapDaily(...args);}
  // 领取陷阱收获（弹窗里点了按钮才真正结算）
  function claimDailyTrap(...args){return livestockRules.claimDailyTrap(...args);}
  // 每日晨报：牧场消耗与产量 + 陷阱情况（供 ui 弹窗展示）
  function collectDailyReport(...args){return livestockRules.collectDailyReport(...args);}
  // 陷阱已全部并入"每日晨报"（collectDailyReport 每日清晨结算 + claimDailyTrap 领取）

  // 某一天属于哪个季节（seasonInfo 的直接来源）。抽出来是为了能问"昨天是什么季节"——
  // 判断"冬天是不是今天刚来"必须比前一天，不能只看 seasonInfo().name === '冬'
  // （那样第 46~60 天每天都会判成"冬天来了"）。day <= 0 落回春季。
  function seasonOnDay(...args){return survivalRules.seasonOnDay(...args);}
  function seasonInfo(...args){return survivalRules.seasonInfo(...args);}
  // 冬天是不是**今天**刚来（冬天第一天）。60 天一轮，所以第 46 天、第 106 天…都会命中一次。
  function winterJustStarted(...args){return survivalRules.winterJustStarted(...args);}
  function isNight(...args){return survivalRules.isNight(...args);}
  function isDusk(...args){return survivalRules.isDusk(...args);}

  function rollWeather(...args){return survivalRules.rollWeather(...args);}

  function newDay(...args){return survivalRules.newDay(...args);}

  // 夜袭剧情按难度推迟：越简单给越多发育时间（简单14 / 普通12 / 困难10 / 传奇7）
  const RAID_DAY = { easy: 14, normal: 12, hard: 10, legend: 7 };
  function raidDay() { return (gameState.run && RAID_DAY[gameState.run.difficulty]) || 7; }
  // 夜袭强度：随时间水涨船高，第 50 天到顶（5 匹狼）。与难度无关（难度只改狼的属性）。
  function raidWolves(...args){return eventsRules.raidWolves(...args);}
  function storyDay(...args){return eventsRules.storyDay(...args);}
  function triggerStory(...args){return eventsRules.triggerStory(...args);}

  // ---------- 存档 ----------
  // 技能改版迁移（旧等级 → 经验返还，双倍）。
  // ⚠️ load() 和 loadSlot() 都要跑：备份槽里存的是"当时那份 S"，可能是技能改版前的老格式。
  //    以前只在 load() 里迁移，于是"从备份继续"会拿到"有等级、没有成长选项"的档 ——
  //    等级还在但一点属性都不给（玩家反馈"前面升的级属于加了没？打雪鹰才 10 点血"）。
  // ---------- 存档救援：开新档自动保留上一局 + 扫描本机所有存档痕迹 ----------
  // 玩家反馈："开新档的时候选的三档，现在调1档覆盖不行……我那档能恢复吗，我一直玩这个档的"
  // —— 他当时那份存档没有任何备份，被新档直接顶掉了。
  
  // 开新游戏之前，把"正在玩的那一份"原样留一份（只在 day>1 时留，且始终保留最新一条）
  function rescueStash(...args){return lifecycleRules.rescueStash(...args);}
  function rescueInfo(...args){return lifecycleRules.rescueInfo(...args);}
  // 扫描本机所有还能读出来的存档痕迹（按时间从新到旧），给"救援"面板用
  function scanLocalSaves(...args){return lifecycleRules.scanLocalSaves(...args);}
  // 把某一份痕迹恢复成"当前这一局"（和从备份槽继续一样：补字段 + 迁移 + 立刻写主存档）
  function restoreLocalSave(...args){return lifecycleRules.restoreLocalSave(...args);}
  // 快照记录完整局内数据；排除递归检查点和仅用于本次行动的临时字段。
  function checkpointState(...args){return lifecycleRules.checkpointState(...args);}
  function snapshot(...args){return lifecycleRules.snapshot(...args);}
  function reviveInfo(...args){return lifecycleRules.reviveInfo(...args);}
  function rollback(...args){return lifecycleRules.rollback(...args);}

  // ---------- 存档多重落地：localStorage 之外再镜像一份 cookie ----------
  // 为什么：手机 WebView 里"清缓存、平台升级"有时只清 localStorage，
  // 而 cookie 往往能留下来（网页游戏最老牌的兜底）。两边都写，读的时候取"更新的那份"。
  // ⚠️ 单个 cookie 约 4KB 上限：只镜像主存档与账号数据，太长（比如带满三个备份槽的导出码）就跳过。
  const CK=SaveRepository.keys;
  function ckGet(key){return repository.cookieGet(key);}
  function ckMirror(key,atKey,json){return repository.mirror(key,atKey,json);}
  function save(){return repository.save();}
  async function saveAndFlush(){const result=save();if(!result.ok)return result;const bridge=typeof window!=='undefined'&&window.GuyuSaveBridge;return bridge?bridge.flush():result;}
  function initializeStorage(){recoverPendingWrite();return repository.metaReload();}
  function load(retried=false){return repository.load(retried);}
  function hasSave(){return repository.hasSave();}
  // 安全模式用：把"上次保存前的滚动备份"当主档读回来
  // （save() 每次写入前都会把旧档滚到 guyuyizhang_save_bak，所以最多退回几步）
  function restoreBackupSave() {
    try { return restoreLocalSave('bak'); }
    catch (e) { return {ok:false,reason:'备份存档暂时无法读取'}; }
  }
  // ---------- 新游戏 ----------
  function newGame(...args){return lifecycleRules.newGame(...args);}

  // ---------- 死亡 ----------
  function die(...args){return lifecycleRules.die(...args);}
  function endingD(...args){return lifecycleRules.endingD(...args);}
  // 继续游戏（"留在岛上"/死亡后回到标题再来/读档接着玩）时必须清掉本局的结算状态。
  // 否则 S.ending 一直挂着 → checkEndingActions 直接返回空（A/B/C/S 按钮全消失）、
  // 时间流逝与自动存档也会跟着停摆（ui.js 里用 ending/death 当暂停条件）。
  function continueRun(...args){return lifecycleRules.continueRun(...args);}

  // ---------- 场景与赶路 ----------
  function sceneOf(...args){return journeyRules.sceneOf(...args);}
  function sceneUnlocked(...args){return journeyRules.sceneUnlocked(...args);}
  function canTravel(...args){return journeyRules.canTravel(...args);}
  function atlantisTeleport(...args){return journeyRules.atlantisTeleport(...args);}
  function activatePortal(...args){return journeyRules.activatePortal(...args);}
  // 主岛上的场景（同岛之间走直路，不必绕回营地）
  
  // 赶路距离模型：
  // · 营地↔任意场景：就是那个场景到营地的距离（和以前一致）
  // · 主岛内部两点：按"到营地的距离差"走直路（最少 10 分钟），不再把两段相加
  // · 跨海（对岸/海域/海底）：海路那段为主，登陆后往内陆只加 25%，避免"去岛上别处比回家还贵"
  function travelDist(...args){return journeyRules.travelDist(...args);}
  function staminaCost(...args){return journeyRules.staminaCost(...args);}
  function loadPenalty(...args){return journeyRules.loadPenalty(...args);}
  function travelCost(...args){return journeyRules.travelCost(...args);}
  // 亚特兰蒂斯**区域内**游动的消耗（时间/体力）。推进器（饰品）在这里统一减半。
  // ⚠️ 玩家反馈"推进器装上之后体力消耗显示不变，实际是变的"：
  //    以前 setZone() 里减半了，而界面的「前往」确认框自己又抄了一遍公式（没减半）——
  //    于是显示的是没折扣的数、实际扣的是折后数。现在只有这一份公式，两边都读它。
  function zoneSwimCost(...args){return journeyRules.zoneSwimCost(...args);}
  // ---------- 赶路遇袭：危险度 ≥3 的区域，路上会被狼 / 熊拦路 ----------
  // 设置里可关（默认开）。为什么给"迎战/退回"两个选择而不是强制开战：
  // 危险度 5 的山顶走过去就撞上 120 血的洞穴熊，没得选太惩罚；退回的代价是白花体力与时间。
  const ROAD_AMBUSH_MIN_DANGER = 3;
  function roadAmbushChance(...args){return journeyRules.roadAmbushChance(...args);}   // 3→15% 4→20% 5→25%
  function roadAmbushPool(...args){return journeyRules.roadAmbushPool(...args);}
  // 返回 true 表示"拦路了，这次移动先不落地"（等玩家在弹窗里选）
  // force=true 供测试用：跳过概率判定直接触发（不要去固定 Math.random，否则连"选哪种怪"也会被定死）
  function rollTravelAmbush(...args){return journeyRules.rollTravelAmbush(...args);}

  function travel(...args){return journeyRules.travel(...args);}
  // 真正抵达目的地：切场景 + 场景描述 + 草地陷阱 + 随机事件
  function arriveAt(...args){return journeyRules.arriveAt(...args);}
  function sceneDesc(...args){return journeyRules.sceneDesc(...args);}
  function setZone(...args){return journeyRules.setZone(...args);}

  // ---------- 交互点 ----------
  function pointsOf(...args){return gatheringRules.pointsOf(...args);}
  function lightLevel(...args){return gatheringRules.lightLevel(...args);}
  // 山顶祭坛：材料齐了就算"拿过遗物"也重新可用（用来举行结局 C 的仪式）
  function altarReady(...args){return gatheringRules.altarReady(...args);}
  // 老存档抢救：旧版本在"点开弹窗"时就打了 pt_ 标记，玩家没拿走奖励的话这个一次性点位会永久消失
  // （山顶祭坛拿不到遗物就是这么来的）。这里判定"标记打了、奖励却没拿到"，把点位放出来让他再拿一次。
  function onceRewardMissing(...args){return gatheringRules.onceRewardMissing(...args);}
  function pointAvailable(...args){return gatheringRules.pointAvailable(...args);}
  function shortPt(...args){return gatheringRules.shortPt(...args);}
  function pointStatus(...args){return gatheringRules.pointStatus(...args);}
  // 撒网后的河湾次日需休整，鱼竿仍可垂钓。
  function riverNetBanned(...args){return gatheringRules.riverNetBanned(...args);}

  function pointMinutes(...args){return gatheringRules.pointMinutes(...args);}
  function pointEnergy(...args){return gatheringRules.pointEnergy(...args);}
  function pointReason(...args){return gatheringRules.pointReason(...args);}
  function doPoint(...args){return gatheringRules.doPoint(...args);}

  function adventure(...args){return gatheringRules.adventure(...args);}

  // ---------- 随机事件 ----------
  function hintOf(...args){return eventsRules.hintOf(...args);}
  // 当前场景/天气/营地等级下，可能触发的随机事件有哪些（cond 里的每一条都必须同时满足）
  // 以前这里写成 ||，结果"雾天也漏雨""砖瓦房还漏雨"——只要有一个 cond 字段没用到就整条判成 true。
  function randomEventPool(...args){return eventsRules.randomEventPool(...args);}
  function triggerRandomEvent(...args){return eventsRules.triggerRandomEvent(...args);}

  function showOverlay(...args){return eventsRules.showOverlay(...args);}

  // ---------- 石龛（洞穴奇遇）· 三件神物三选一 ----------
  // 作者 2026-09-25：玩家反馈"神器那个界面出来一下，接着就卡，没什么意思，就让你看一眼，也不让你选"。
  // 起因就是这里——文案写着"里面供着三件神物"，但以前只有一个「取走神物」按钮，点下去**随机**给一件。
  // 现在把还没拿到过的神物抽三件摆出来，由玩家自己挑一件（不够三件就摆几件）。
  // ⚠️ 池子里**没有**亚特兰蒂斯之种：作者 2026-09-23 定案"之种可从海底神秘鱼人交换或商城购买"，
  //    所以石龛和深海售卖机一样都要把它排除掉（以前 gainRandomRelic() 是全表随机，会漏出来）。
  function shrinePool(...args){return eventsRules.shrinePool(...args);}
  // 石龛弹窗的**内容**（标题 / 正文 / 选项）。抽成独立函数有两个好处：
  //   ① triggerShrine 只管"记日志 + 弹窗"，逻辑一眼看得完；
  //   ② 回归测试可以直接把这个配置拿出来，把每个选项的 ok() 真的执行一遍
  //      （"点这件拿到的是不是这件"这种问题，只有真跑 ok() 才测得出来）。
  function shrineChoices(...args){return eventsRules.shrineChoices(...args);}
  function triggerShrine(...args){return eventsRules.triggerShrine(...args);}

  // ---------- 战斗 ----------
  function meleeWeapons(...args){return combatStatsRules.meleeWeapons(...args);}
  function buffV(...args){return combatStatsRules.buffV(...args);}
  // 饰品属性访问器：集中兜住\"饰品没戴 / 物品表里没有\"两种空态，避免各公式各自写一遍易失配的取数。
  function accessoryStat(...args){return combatStatsRules.accessoryStat(...args);}
  // 已命名武器的额外攻击加成（S.weaponNames[id].bonus）；没命名/没这件就 0。
  function weaponBonus(...args){return combatStatsRules.weaponBonus(...args);}
  // 由 ITEMS 条目反查它的键（装备槽里存的正是这个键；对象自带的 .id 并非所有武器都有：木棒/石矛/猎弓等没有）。
  // 命名加成按键存取，必须用键去读，否则\"给无 id 字段的武器命名后 +1 伤害不生效\"。
  function itemKeyOf(...args){return combatStatsRules.itemKeyOf(...args);}
  const BUFF_NAMES = {atk:'攻击',def:'防御',spd:'攻速',hp:'生命上限',accuracy:'命中'};
  function activeBuffs(...args){return combatStatsRules.activeBuffs(...args);}
  // 近战伤害：双持时不再取两把平均，而是【轮流出手】——本轮轮到哪把就用哪把的伤害，
  // 每挥一次换手。所以快匕首配重武器是"一轻一重交替"，而不是"用匕首的攻速吃大剑的伤害"。
  function playerAtk(...args){return combatStatsRules.playerAtk(...args);}
  // 面板用：双持时给两把伤害的均值（期望值），免得面板显示"下一刀"让人误以为攻击变弱了
  function playerAtkAvg(...args){return combatStatsRules.playerAtkAvg(...args);}
  function rangedAtk(...args){return combatStatsRules.rangedAtk(...args);}
  function charStats(...args){return combatStatsRules.charStats(...args);}
  // 精神影响体力上限（透支机制）：≥50 满额；20~49 −10%；<20 −20%（并且采集更慢，见 doPoint）
  function spiritStamMul(...args){return combatStatsRules.spiritStamMul(...args);}
  // 基础 150 + 难度加成 + 局外成长 + **床给的体力上限**（作者 2026-09-23），再按精神打折
  function maxStam(...args){return combatStatsRules.maxStam(...args);}
  // 防御 = 基础 2 + 护甲 + 饰品 + 盾 + 神物buff + 战斗技能（每级 +1：打多了皮糙肉厚）
  function playerDef(...args){return combatStatsRules.playerDef(...args);}
  function shieldBlock(...args){return combatStatsRules.shieldBlock(...args);}
  // ---------- 横扫（双手重武器专属）与多目标敌人行为 ----------
  // ---------- 距离制战斗（作者 2026-09-19）----------
  // 原有"时间追赶"不变（出手次数、同时结算），上面再加一层**距离**：
  //   · 速度同时代表"每 100 时间单位（= 一个回合）前进的距离"，敌我平等；
  //   · 近战攻击距离 0（要贴到脸上），弓 30、手枪 15，远程怪各自带 range；
  //   · 距离不够时这一回合用来**逼近**（日志写明还差多少），不是白点。
  //   → 带弓的人可以在敌人冲到近身前先射好几轮，这就是"弓的额外回合"。
  // ⛔ 这里原来是 `RANGE_BOW = 30, RANGE_GUN = 15, RANGE_MELEE = 0, FIGHT_START_DIST = 30`。
  //    FIGHT_START_DIST 已删除：开局距离不再是一个固定值，改成"双方射程取大"（见 startFight）。
  const RANGE_BOW = 30, RANGE_GUN = 15, RANGE_MELEE = 0;
  
  function rangedRangeOf(...args){return combatStatsRules.rangedRangeOf(...args);}   // 手枪 15 / 弓 30
  function enemyRange(...args){return combatStatsRules.enemyRange(...args);}
  function myAttackRange(...args){return combatStatsRules.myAttackRange(...args);}
  function myMoveSpeed(...args){return combatStatsRules.myMoveSpeed(...args);}
    // 掩护：全体友方受到的伤害 -30%（不叠加，取最大值）
        // 猛击：攻击 ×1.3，但自身防御归零
  function hasTwoHand(...args){return combatStatsRules.hasTwoHand(...args);}
  // 横扫是否可用（战斗中由 UI 读这个来显示按钮）
  function sweepInfo(...args){return combatStatsRules.sweepInfo(...args);}
  // ---------- 战斗 2 级的互斥选择：重击 / 必中（作者 2026-09-25）----------
  //   重击以前是"主干 2 级白送"（UI 里写死 combatLv()>=2 就给按钮、且没有冷却，是事实上的最优解），
  //   现在两个都要在技能树里点（互斥），**不学重击就没有重击**；两个共用 20 单位时间的冷却
  //   （与横扫同一套时间单位：每次出手推进 100/攻速）。
  //   老存档兼容见 load 时的 migCombat2 迁移。
  const ACT_CD_BASE = 20;
  function heavyNodeLv(...args){return combatStatsRules.heavyNodeLv(...args);}
  function sureNodeLv(...args){return combatStatsRules.sureNodeLv(...args);}
  function hasHeavy(...args){return combatStatsRules.hasHeavy(...args);}
  function hasSure(...args){return combatStatsRules.hasSure(...args);}
  function heavyInfo(...args){return combatStatsRules.heavyInfo(...args);}
  function sureInfo(...args){return combatStatsRules.sureInfo(...args);}
  // 敌人是否该做"蓄力/掩护/猛击"：当前**活着**的敌人 ≥2 只时才会用（单挑保持原样）
  function enemyMultiActing(...args){return combatStatsRules.enemyMultiActing(...args);}
  // 敌人身上的掩护减伤（取最大值，不叠加）
  function coverReduceOf(...args){return combatStatsRules.coverReduceOf(...args);}
  // 回合末重掷敌人意图：20% 蓄力（本回合不出手，下回合双倍）／20% 掩护（不出手，全体友方 -30% 伤害）／30% 猛击（×1.3 但防御归零）
  function rollEnemyIntents(...args){return combatStatsRules.rollEnemyIntents(...args);}
  
  function intentOf(...args){return combatStatsRules.intentOf(...args);}

  // 出手速度（攻速）。历史 bug：旧版直接取"主手武器的 spd + 副手只垫一个下限 10"，  // 副手几乎不计入，于是「主手放快匕首 + 副手放高攻大剑」能同时吃到主手的快攻速和两把的平均伤害，
  // 互换主副手攻速差 150%（实测主手匕首 = 23、主手大剑 = 9）——玩家反馈"主手带匕首几乎无敌"。
  // 现在的主副手完全对称：只看装了哪两把，不看谁在主手；谁先出手另由 fightAction 的 enemyFirst 决定。
  // 双持加成：两把都是匕首（数据里标了 dual）→ ×1.4；其余双持 → ×1.5。
  // 旧版是按武器 id 正则判断的，所以"石质匕首"（knifeStone）从来吃不到加成 —— 改成数据标记后不再靠名字猜。
  // ⚠️ 数值平衡 P0-2：**双持匕首单极化**。原来 DUAL_MUL_DAGGER = 2.0，配上嗜血狂刀吸血后，
  //    双持玄铁匕首战力（423）是源质长枪（187）的 2.3 倍，成了全游戏唯一最优解，
  //    敌方出手率被压到 39%，"贴脸互秒"。
  //    改法（作者 2026-09-22 定案，二选一取"倍率"这条）：匕首倍率 2.0 → **1.4**。
  //    为什么改倍率而不是再砍吸血：吸血那 30% 已经是统一后的值、也是双匕首流的**唯一特色**，
  //    再砍就把流派砍死了；倍率才是"白送的那个额外收益"（匕首本身 spd 已经最高）。
  //    ⛔ 不要两个都砍（会矫枉过正——双持牺牲了盾牌格挡，需要保留速度特色）。
  
  function combatSpeed(...args){return combatStatsRules.combatSpeed(...args);}
  function sharpenAm(...args){return weaponCareRules.sharpenAm(...args);}
  function sharpen(...args){return weaponCareRules.sharpen(...args);}
  // 校准手枪：既修耐久，也把命中从 60% 提到 70%（一次性、永久）。
  // 旧版叫"校准"却只修耐久 —— 名字名不副实，而且副手也能开火，却要求"装备到主手"。
  function repairPistol(...args){return weaponCareRules.repairPistol(...args);}
  function fixBrokenPistol(...args){return weaponCareRules.fixBrokenPistol(...args);}
  // 高阶武器维修成本随材料档次提高；神弓不可修复。
  
  function repairMatOf(...args){return weaponCareRules.repairMatOf(...args);}
  function repairWeapon(...args){return weaponCareRules.repairWeapon(...args);}
  function nameWeapon(...args){return weaponCareRules.nameWeapon(...args);}
  function wNameOf(...args){return weaponCareRules.wNameOf(...args);}
  // ⚠️ 建筑链必须按"实际存在的最高级"夹一下：以前直接 BUILDING_CHAINS.fire[S.buildings.fire].warm，
  //    存档里等级越界（老版本层数更多、或改过的档）就会在**每次时间推进**时抛
  //    "Cannot read properties of undefined (reading 'warm')"，整局卡死。存档是红线，这里不能省兜底。
  function chainTier(...args){return combatStatsRules.chainTier(...args);}
  function warmth(...args){return combatStatsRules.warmth(...args);}
  // 气温只由游戏时间与天气决定：同一时刻反复打开面板不会随机跳数。
  function weatherTemperature(...args){return combatStatsRules.weatherTemperature(...args);}
  function environmentTemperature(...args){return combatStatsRules.environmentTemperature(...args);}
  function temperatureInfo(...args){return combatStatsRules.temperatureInfo(...args);}
  function temperatureEntered(...args){return combatStatsRules.temperatureEntered(...args);}
  // 当前装备里的远程武器（主手优先）；没装远程武器返回 null
  function rangedWeapon(...args){return combatStatsRules.rangedWeapon(...args);}
  // 有没有可开火的远程武器。口径与 rangedWeapon() 一致：主手优先，主手不是远程就看副手。
  // 返回 0（普通箭矢）/ 8（鹰羽箭 +8 攻击）/ null（没弹药或没远程武器）。
  // 旧版这里只看主手，于是「主手弓 + 副手手枪」会漏判。
  function hasRanged(...args){return combatStatsRules.hasRanged(...args);}
  // 扣弹药：必须扣"真正开火的那把武器"的弹药。
  // 旧版只按主手优先取带 ammoItem 的那把，导致「主手弓 + 副手手枪」时弓射一箭却扣掉一颗源能子弹。
  // 开火的那把远程武器 + 它的命中判定。
  // 旧版命中写死成"主手是手枪才 60%" → 把手枪挂副手就能用 ~90% 命中打出 50 伤害（弓才 10 伤害却吃 90%），
  // 而且"主手铁剑+副手手枪"时枪的命中根本不参与判定。现在命中跟伤害/弹药一样，都认"真正开火的那把"。
  // 返回 { gun: 手枪 / bow: 弓 / other: 其它远程 }
  function rangedKind(...args){return combatStatsRules.rangedKind(...args);}
  function pistolCalib(...args){return combatStatsRules.pistolCalib(...args);}
  function rangedAcc(...args){return combatStatsRules.rangedAcc(...args);}
  function ammoConsume(...args){return combatStatsRules.ammoConsume(...args);}
  // 现在握着的远程武器在哪个槽（口径与 rangedWeapon() 一致：主手优先）
  function equippedRangedSlot(...args){return combatStatsRules.equippedRangedSlot(...args);}
  function combatLv(...args){return skillsRules.combatLv(...args);}
  function gatherLv(...args){return skillsRules.gatherLv(...args);}
  // ⚠️ 旧版的 skillUp()/skillInfo()/skillCost() 已随技能树（B1）删除：
  //    它们只会"等级 +1"，不记录 S.skillPicks，会把主干和成长选项搞脱节。新入口是 skillUpTrunk()。

  // ==================== 技能树（B1：框架 + 主干三选一 + 遗忘 + 采集/制造分支）====================
  // 设计见 文档\技能树_设计规划.md §10（v2 定稿）。这里只放"数据查询 + 加点/遗忘"这些纯逻辑，
  // 具体数值钩子集中在下面 skillFx* 一小撮函数里，采集/制造/战斗各处只调它们，方便以后调平衡。
  function treeState(...args){return skillsRules.treeState(...args);}
  function nodeLv(...args){return skillsRules.nodeLv(...args);}
  function trunkPicks(...args){return skillsRules.trunkPicks(...args);}
  function trunkLv(...args){return skillsRules.trunkLv(...args);}
  function trunkCostNow(...args){return skillsRules.trunkCostNow(...args);}
  function treeDef(...args){return skillsRules.treeDef(...args);}
  function nodeDef(...args){return skillsRules.nodeDef(...args);}
  function nodeSpent(...args){return skillsRules.nodeSpent(...args);}
  // —— 数值钩子：采集 ——
  // ⚠️ 主干每级的加成在 2026-09-19 统一从 10% 削到 7%（作者要求，采集/制造都削）：
  //    主干 7 级满时是 +49%（原来是 +70%），专项节点数值没动。
  
  // 经验到手量：每次采集/每件制造都是 +1（**不要**改这里，作者 2026-09-19 澄清过口径），
  // 只有首领从 +10 提到 +15（见战斗结算里的 xg）。
  const EXP_GATHER = 1, EXP_CRAFT = 1;
  // 升级消耗的倍率（作者 2026-09-19 真正要的是这个）：采集树 ×2、制造树 ×3、战斗树不变。
  // data.js 里存的仍是基准数字，这里统一乘；显示 / 扣除 / 遗忘返还全走下面这几个函数，不会两处对不上。
  
  function costMul(...args){return skillsRules.costMul(...args);}
  function trunkCostOf(...args){return skillsRules.trunkCostOf(...args);}
  function nodeCostOf(...args){return skillsRules.nodeCostOf(...args);}
  function nodeSpentOf(...args){return skillsRules.nodeSpentOf(...args);}
  function gxYieldMul(...args){return skillsRules.gxYieldMul(...args);}
  function gxTimeMul(...args){return skillsRules.gxTimeMul(...args);}
  function gxEnergyMul(...args){return skillsRules.gxEnergyMul(...args);}
  function gxPineBonus(...args){return skillsRules.gxPineBonus(...args);}      // 美人松概率加成
  function gxWoodExtra(...args){return skillsRules.gxWoodExtra(...args);}         // 每次砍树额外木材（攒够 1 份给）
  // —— 数值钩子：制造 ——
  function cxTimeMul(...args){return skillsRules.cxTimeMul(...args);}
  function cxRefundChance(...args){return skillsRules.cxRefundChance(...args);}   // 制作返还材料
  function cxExtraChance(...args){return skillsRules.cxExtraChance(...args);}     // 制作多产 1 件
  function cxRepairFree(...args){return skillsRules.cxRepairFree(...args);}   // 修补匠：修补不消耗材料
  // ⚠️ 材料倍率现在按配方算（「精工细作 +30%」只对有耐久的成品生效）→ 见 cxMatMulFor()
  function cxDurMul(...args){return skillsRules.cxDurMul(...args);}
  // —— 数值钩子：战斗主干（攻/防/暴击；武器组合技在 B2 批次）——
  function cxAtk(...args){return skillsRules.cxAtk(...args);}
  function cxDef(...args){return skillsRules.cxDef(...args);}
  function cxCrit(...args){return skillsRules.cxCrit(...args);}
  // 会心一击倍率：基础 1.5。
  // 「弓术」作者 2026-09-22 改版 —— 不再是"弓命中 +5%"（命中在命中保底 + 0.9 基础值下已经很高，
  // 再加命中几乎摸不到收益），改成**用弓时暴击效果 +30%/+60%**，即倍率 1.5 → 1.8 / 2.1。
  // 只在使用弓时生效（手枪不吃这个加成）。
  // 会心倍率。⚠️ 弓术那档原来判的是 `weapon === 'bow'`（字符串），而调用点传的是**物品对象**，
  //    所以「弓术 +30%/+60% 暴击」实际上永远不生效（DPS 核查发现的 #2）。现在对象/键名都认。
  function critMul(...args){return skillsRules.critMul(...args);}
  // —— 战斗分支（B2 第一批）：阔刃横扫（时间制 CD）/ 处决、嗜血狂刀 / 复仇 ——
  // 攻速口径：每 100 时间单位出手「攻速」次 → 每出手一次推进 100/攻速 时间单位。
  // 横扫 CD 用同一套时间单位：基础 20「秒」，每级 -2（= 作者的"减到 1/10"一档）。
  
  function sweepNodeLv(...args){return skillsRules.sweepNodeLv(...args);}
  function sweepCdTotal(...args){return skillsRules.sweepCdTotal(...args);}     // 20 / 18 / 16 / 14
  function sweepMul(...args){return skillsRules.sweepMul(...args);}     // 0.8 / 1.0 / 1.2 / 1.4（取一位小数，别留浮点尾巴）
  // 作者 2026-09-22 定案：默认不吸 → 1 级 30% → 2 级 40%，**第三级删除**（原来 30/40/50/60 太强）。
  //   技能树节点 f_vamp 的 max 已同步改成 2，所以这里只会有 0/1/2 三种取值。
  // 药师（作者 2026-09-22 定案）：使用道具的**回复量 +50%**（先算基础值再 ×1.5）。
  // 只放大正面回复，毒/负面不放大。所有用药路径都必须走这里，否则会出现
  // "背包里吃药管用、战斗里吃药不管用"这种半成品。
  function medHealMul(...args){return skillsRules.medHealMul(...args);}
  function medHeal(...args){return skillsRules.medHeal(...args);}
  // 嗜血狂刀：作者 2026-09-22 定案 —— **吸血统一 30%**，升级不再提高比例（原 30/40/50/60%）。
  // 理由：双匕首配合高攻速与命中保底几乎不会断档，比例越高越难平衡；
  // 升级的价值改为解锁【复仇】链，而不是继续放大回血。
  function vampRate(...args){return skillsRules.vampRate(...args);}

  // ---------- 配方材料配比调整（作者 2026-09-22 定案）----------
  // 玩家反馈"后期建造消耗太多木头"。规则：**木材类 ×0.8，其它材料 ×1.1**（只调配方，不动掉落）。
  // 为什么写成规则而不是手改数字：
  //   ① 配方有一百多条，手改容易漏、也无法一眼看出改过哪些；
  //   ② 想回退或换比例时只改这一处；
  //   ③ 断言可以直接对"规则是否生效"下判断，而不是逐条对常量。
  // 取整用 Math.round 且**保底 1**：材料不能变成 0 份，否则配方会凭空少一味。
  // ⚠️ 这几个用 var：adjustRecipeMats() 在文件靠前处就被调用，const/let 会撞暂时性死区
  
  
  // 为什么加"堆量门槛"：配方里大量是 1~3 份的小数目，直接 ×0.8/×1.1 再四舍五入会
  // 把小配方砍得比大配方还狠（木材4→3、藤蔓8→9），手感很怪。只对**堆量大的材料**生效：
  //   木材类 ≥5 份才减 20%（4 份以内原样不动）
  //   其它材料 ≥5 份才加 10%
  // 这样"后期造大件省木头"的诉求达到了，早期小配方一点没动（也不影响食物配方的手感）。
  
  
  function adjustRecipeMats(...args){return productionRules.adjustRecipeMats(...args);}
  function execThreshold(...args){return skillsRules.execThreshold(...args);}
  function revengeBonus(...args){return skillsRules.revengeBonus(...args);}
  // 「嗜血狂刀」只认**双持两把匕首**（作者 2026-09-19：以前任何双持单手都吃吸血，等于白送）
  // dual:1 = 匕首类（石质匕首 / 铁匕首）
  function hasDualDagger(...args){return skillsRules.hasDualDagger(...args);}
  // B2b：盾墙 / 疾风连击 / 狂战 / 铁壁 / 弓术 / 枪械精通
  // 盾墙：格挡率 +15% / +20%（技能描述写的就是这两档；代码原来是 0.15×级 = 15%/30%，
  // 二级比文案强 50% —— DPS 核查发现的 #4，改成照文案来）
  function wallBlockBonus(...args){return skillsRules.wallBlockBonus(...args);}
  function wallDurMul(...args){return skillsRules.wallDurMul(...args);}   // 盾耐久消耗
  function swiftBonus(...args){return skillsRules.swiftBonus(...args);} // Legacy public API: 刀刀暴击不提供攻速。
  function bladeCritBonus(...args){return skillsRules.bladeCritBonus(...args);}
  function rageAtkMul(...args){return skillsRules.rageAtkMul(...args);}    // 狂战：攻击 +15/22/30%
  function rageTakenMul(...args){return skillsRules.rageTakenMul(...args);}               // 狂战：受伤 +10%
  function ironTakenMul(...args){return skillsRules.ironTakenMul(...args);}  // 铁壁：受伤 -12/18/25%
  function ironAtkMul(...args){return skillsRules.ironAtkMul(...args);}                 // 铁壁：攻击 -5%
  // 狂战/铁壁 对"打出去 / 挨下来"的最终修正（两棵互斥，同时只会有一个生效）
  function rageAtkFinal(...args){return skillsRules.rageAtkFinal(...args);}
  function rageTakenFinal(...args){return skillsRules.rageTakenFinal(...args);}
  function bowNodeLv(...args){return skillsRules.bowNodeLv(...args);}
  function gunNodeLv(...args){return skillsRules.gunNodeLv(...args);}
  function ammoSaveChance(...args){return skillsRules.ammoSaveChance(...args);}
  // —— 加点 ——
  function skillUpTrunk(...args){return skillsRules.skillUpTrunk(...args);}
  // 某个节点现在能不能学（返回 { ok, reason }）
  function nodeCheck(...args){return skillsRules.nodeCheck(...args);}
  function skillNodeLearn(...args){return skillsRules.skillNodeLearn(...args);}
  // 末端判定：没有任何"已经学会"的节点挂在它下面，才允许遗忘（作者要求：只能从最末端往外剥）
  function nodeIsLeaf(...args){return skillsRules.nodeIsLeaf(...args);}
  function nodeForgetGain(...args){return skillsRules.nodeForgetGain(...args);}
  function skillNodeForget(...args){return skillsRules.skillNodeForget(...args);}
  // ---------- 主干遗忘（作者 2026-09-19）：想换流派时，主干也得能退 ----------
  // 规矩和专项一样：只能从**最末端往外剥**（先退最后加的那一级），返还那一级的一半经验。
  // 额外一条：主干这一级如果正撑着某个已学会的专项（专项的 need 门槛），得先把专项忘掉。
  function trunkForgetInfo(...args){return skillsRules.trunkForgetInfo(...args);}
  function skillTrunkForget(...args){return skillsRules.skillTrunkForget(...args);}
  // UI 用的一份完整快照
  function skillTreeInfo(...args){return skillsRules.skillTreeInfo(...args);}
  // 累计获得过的经验 = 当前剩余 + 升级技能已经花掉的
  // （以前只看"剩余经验"，导致玩家花经验把技能升上去后，反而因为剩余经验变少而"等级下降"，
  //   出现"我制造 4 级了却说我制造经验不够 2"的矛盾）
  function setFocus(...args){return skillsRules.setFocus(...args);}
  function awardExperience(...args){return skillsRules.awardExperience(...args);}
  function expEarned(...args){return skillsRules.expEarned(...args);}
  function expLevel(...args){return skillsRules.expLevel(...args);}

  function startFight(...args){return combatRules.startFight(...args);}

  // 神弓（限定）：每场战斗的第一次**命中**必定会心一击。
  // ⚠️ 必须两处都调：① 远程先手的那几箭（C.bowShots 分支）② fightAction 里的普通射击。
  //    只加在②的话，玩家开局那几箭走了先手分支，特权就永远不会触发。
  //    没打中不算（先手分支本来就没有命中判定，视为命中）。
  function divineCritRoll(...args){return combatRules.divineCritRoll(...args);}
  function combatAccuracy(...args){return combatRules.combatAccuracy(...args);}
  function combatActionInfo(...args){return combatRules.combatActionInfo(...args);}
  // Presentation only: weak runtime storage, never serialized with combat/save snapshots.
  
  function takeCombatEvents(...args){return combatRules.takeCombatEvents(...args);}
  function fightAction(...args){return combatRules.fightAction(...args);}

  function endFight(...args){return combatRules.endFight(...args);}

  function useItemInFight(...args){return combatRules.useItemInFight(...args);}

  // ---------- 夜袭 ----------
  function raidLose(...args){return combatRules.raidLose(...args);}
  function startRaidFight(...args){return combatRules.startRaidFight(...args);}
  function nightRaid(...args){return combatRules.nightRaid(...args);}

  // ---------- 营地：睡觉 ----------
  // 睡眠结算的**纯计算**部分：sleep() 和 sleepForecast() 共用同一份公式。
  // 以前 ui.js 的 sleepRec()/napRec() 把公式又抄了一遍，面板上的数字和真实恢复会差一两点；
  // 现在只有一个来源。这个函数不修改任何状态。
  function sleepMath(...args){return survivalRules.sleepMath(...args);}
  // 给睡觉面板用：现在睡这一觉会怎么变（不改任何状态）。作者 2026-09-21 要求"会扣血就提示"。
  function sleepForecast(...args){return survivalRules.sleepForecast(...args);}
  function sleep(...args){return survivalRules.sleep(...args);}

  // ---------- 日记 ----------
  function diaryAdd(line) { gameState.run.diary.push({ day:gameState.run.day, line }); }
  function diary() {
    const h = Math.floor(gameState.run.minute/60);
    let entry = '';
    const w = WEATHER[gameState.run.weather].name;
    const kills = Object.keys(gameState.run.killCount).reduce((a,k)=>a+gameState.run.killCount[k],0);
    entry = `第${gameState.run.day}天，${w}。`;
    if (gameState.run.flags.xiaoman) entry += '小满在营地帮忙。';
    diaryAdd(entry);
    if (gameState.run.diary.length > 200) gameState.run.diary.splice(0, gameState.run.diary.length - 200);
  }

  // ---------- 建造 ----------
  function supplyContainer(...args){return productionRules.supplyContainer(...args);}
  function supplySites(...args){return productionRules.supplySites(...args);}
  function supplyRecordsAll(...args){return productionRules.supplyRecordsAll(...args);}
  function supplyRecords(...args){return productionRules.supplyRecords(...args);}
  function supplyCount(...args){return productionRules.supplyCount(...args);}
  function takeSupply(...args){return productionRules.takeSupply(...args);}
  function itemUseCount(...args){return productionRules.itemUseCount(...args);}
  function takeUseItem(...args){return productionRules.takeUseItem(...args);}
  function merchantSupplySites(...args){return productionRules.merchantSupplySites(...args);}
  function merchantSellCount(...args){return productionRules.merchantSellCount(...args);}
  function materialSupplySites(...args){return productionRules.materialSupplySites(...args);}
  function materialCount(...args){return productionRules.materialCount(...args);}
  function matsOk(...args){return productionRules.matsOk(...args);}
  function missingMats(...args){return productionRules.missingMats(...args);}
  function takeMats(...args){return productionRules.takeMats(...args);}

  function buildChain(...args){return productionRules.buildChain(...args);}

  // 裁缝台是否可用：真正建好的 S.furniture.tailor，或旧档一次性赠送（S.tailorGift===1）。
  // 赠送是一次性落定的顶层布尔，不进 furniture / flags，也不占家具位。
  function tailorGifted(...args){return productionRules.tailorGifted(...args);}
  function furnitureUsed(...args){return productionRules.furnitureUsed(...args);}
  // 作者 2026-09-23 反馈："最大的坑是家具限制，新手一般注意不到"。
  // 把"这件家具到底占不占位"单独抽出来，给【建造页标注 / 建造前确认 / 帮助页】共用，
  // 免得三处各抄一份名单、日子久了一定跑偏（原先这个判断只藏在 furnSlotFull 的返回值里）。
  function furnTakesSlot(...args){return productionRules.furnTakesSlot(...args);}
  // 农田畜牧位：农田每升一级 +1 个（苗床 1 / 田垄 2 / 水田 3）。
  // 鸡舍、羊圈只能建在这里，也只能在农田的「农场管理」里建（营地的家具列表已经不列它们了）。
  const FARM_LIVESTOCK_IDS = ['coop', 'pen'];
  function farmLiveSlots(...args){return productionRules.farmLiveSlots(...args);}
  function farmLiveUsed(...args){return productionRules.farmLiveUsed(...args);}
  function farmLiveFree(...args){return productionRules.farmLiveFree(...args);}
  // 给界面用：畜牧位够不够、还差几级
  function farmLiveInfo(...args){return productionRules.farmLiveInfo(...args);}
  // 家具位容量 = 住所等级给的 slots + 扩建次数
  function houseSlots(...args){return productionRules.houseSlots(...args);}
  function furnSlotFull(...args){return productionRules.furnSlotFull(...args);}
  // 给界面用：这一件占不占位、现在用了几格、还剩几格。
  // 建造页标注 + 建造前弹窗 + 帮助页说明，全部读这里，保证三处说法一致。
  function furnSlotInfo(...args){return productionRules.furnSlotInfo(...args);}
  // 体力上限加成：取当前拥有的**最高级**那张床（作者的"做高级床，每级 +5 体力上限"）。
  // 不叠加：床是升级替换关系（bed1→bed2 时 bed1 会被删掉），所以只会有一张。
  function bedStamBonus(...args){return productionRules.bedStamBonus(...args);}
  function trainingCount(...args){return productionRules.trainingCount(...args);}
  function trainingHp(...args){return productionRules.trainingHp(...args);}
  function trainingAtk(...args){return productionRules.trainingAtk(...args);}
  // 永久收益只从次数推导，绝不在存档的基础攻击/生命字段上累加；恢复旧备份也不能叠加刷属性。
  function train(...args){return productionRules.train(...args);}
  function canBuildFurniture(...args){return productionRules.canBuildFurniture(...args);}
  function buildFurniture(...args){return productionRules.buildFurniture(...args);}

  // ---------- 扩建住处（住所每升一级获得 1 次扩建，家具位 +1） ----------
  function houseExtMax(...args){return productionRules.houseExtMax(...args);}   // 帐篷即可扩建1次，之后每升一级 +1
  function houseExtMats(...args){return productionRules.houseExtMats(...args);}
  // ---------- 扩建鸡舍（3 只 → 4 只 → 5 只）----------
  // 作者 2026-09-17 要求：鸡舍能花材料扩建到 4 只，再花更多材料扩建到 5 只。
  function coopExtMats(...args){return productionRules.coopExtMats(...args);}
  function buildCoopExt(...args){return productionRules.buildCoopExt(...args);}
  function buildHouseExt(...args){return productionRules.buildHouseExt(...args);}

  // ---------- 扩建仓库（仓库每升一级获得 1 次扩建，仓库容量 +15） ----------
  const STORE_EXT_CAP = 15;
  function storeExtCap(...args){return productionRules.storeExtCap(...args);}
  function storeExtMax(...args){return productionRules.storeExtMax(...args);}   // 储物箱即可扩建1次，之后每升一级 +1，四阶最多4次
  function storeExtMats(...args){return productionRules.storeExtMats(...args);}
  function buildStoreExt(...args){return productionRules.buildStoreExt(...args);}

  // ---------- 制造 ----------
     // 不死丹：单局最多炼制 3 颗
  function lotusLeft(...args){return productionRules.lotusLeft(...args);}
  // 耐久物品的实际材料表：流水线 -40%，精工细作 +30%；不足一件材料的余量记账。
  // 全项目凡是要"扣 / 查 / 数"材料的地方都走这个函数，别再去读 r.in。
  // 「精工细作」的 +30% 材料只对**有耐久的成品**生效（作者 2026-09-19）：
  //    以前连烤肉、药剂、木板这种压根没有耐久的东西也一起涨价，技能点了纯亏，玩家反馈"不合理"。
  //    两个技能仅影响有耐久的产物，比例见下方 cxMatMulFor。
  function cxMatMulFor(...args){return productionRules.cxMatMulFor(...args);}
  // 只替换木板加工；保留历史配方 ID，避免旧入口重新使用旧比例。
  // 不改变玩家装备，也不把仓库里未装备的斧头视作已装备工具。
  function craftRecipe(...args){return productionRules.craftRecipe(...args);}
  function craftIn(...args){return productionRules.craftIn(...args);}
  function commitCraftMaterials(...args){return productionRules.commitCraftMaterials(...args);}
  function canCraft(...args){return productionRules.canCraft(...args);}
  // ---------- 晾晒（晾肉架）：挂 30 分钟，晾满 20 小时才能取 ----------
  // 晾晒期间这副架子被占住，不能晾别的东西、也不能批量。
  // 用 S.tick（addMin 累加的绝对时间计数器）记"什么时候能取"。
  function nowTick(...args){return productionRules.nowTick(...args);}
  function dryOf(...args){return productionRules.dryOf(...args);}
  function dryLeftMin(...args){return productionRules.dryLeftMin(...args);}
  function dryCollect(...args){return productionRules.dryCollect(...args);}
  // 剩余时间说人话（快到用分钟，久了用小时）
  function fmtLeft(...args){return productionRules.fmtLeft(...args);}
  // 背包能装下这些产出吗？（按 capUsed 同一套算法，逐件模拟）
  // ⚠️ 1) 关键道具（alwaysFit，如石板/遗物/龙骨）不占容量，直接跳过
  //    2) 还要管"往已有堆叠里塞会不会撑破那一格"：已有 19 个再加 3 个 = 溢出 2 个，多占 1 格
  //    3) removeMap 是"这次操作会顺带扣掉的东西"（比如买东西要先付钱）：不先减掉会把钱那一格白算
  function fitsInBag(...args){return productionRules.fitsInBag(...args);}
  function craftMinutes(...args){return productionRules.craftMinutes(...args);}
  function craft(...args){return productionRules.craft(...args);}
  function craftMax(...args){return productionRules.craftMax(...args);}
  function craftBatch(...args){return productionRules.craftBatch(...args);}

  // ---------- 礁石栖息地（亚特兰蒂斯营地，独立家具位） ----------
  function atlantisCamp(...args){return productionRules.atlantisCamp(...args);}
  function atlantisFurnitureUsed(...args){return productionRules.atlantisFurnitureUsed(...args);}
  function buildAtlantisFurniture(...args){return productionRules.buildAtlantisFurniture(...args);}
  
  function repairDiveCost(...args){return productionRules.repairDiveCost(...args);}
  function repairDive(...args){return productionRules.repairDive(...args);}

  // ---------- 种植 ----------
  const FARM_EXTRA_MAX = 2;   // 锄头最多能多开垦 2 块田
  function farmExt(...args){return productionRules.farmExt(...args);}
  function farmPlots(...args){return productionRules.farmPlots(...args);}
  function plant(...args){return productionRules.plant(...args);}
  function harvest(...args){return productionRules.harvest(...args);}
  // 锄头的两个正式用途：开垦新田、松土催熟
  function canHoe(...args){return productionRules.canHoe(...args);}
  function tillPlot(...args){return productionRules.tillPlot(...args);}
  function loosenPlot(...args){return productionRules.loosenPlot(...args);}
  function fertilize(...args){return productionRules.fertilize(...args);}

  // ---------- 交易 ----------
  function seasonPriceMul(...args){return tradingRules.seasonPriceMul(...args);}
  function fameDisc(...args){return tradingRules.fameDisc(...args);}
  // 收购价：商人一律按行情的**七折**收（作者 2026-09-22 定案，原八折）。
  // 固定折价，不会因为"卖得多"继续往下压。
  // ⚠️ 上一轮改这个撞过 audit 的「跨天也不会继续跌（恒定八折）」失败 —— 那条断言本身是
  //    "卖 1 件不掉价"的行为断言（前后取同一个 priceOf 比较），不是数值断言；它报错是因为
  //    当时 UI 文案里写死了"八折"。所以改倍率时**必须同步改 UI 文案**，否则文案与行为对不上。
  
  function priceOf(...args){return tradingRules.priceOf(...args);}
  // 价格浮动改成"按天+物品"固定：同一天同一件货，看多少就是多少
  // （以前每次取价都重新随机，导致"批量框写着最多买 6 个、点确定却因涨价买不起"）
  function priceJitter(...args){return tradingRules.priceJitter(...args);}
  function sellToMerchant(...args){return tradingRules.sellToMerchant(...args);}
  function buyFromMerchant(...args){return tradingRules.buyFromMerchant(...args);}

  // ---------- 神秘鱼人：只以物换物，不收贝壳 ----------
  // 两张源质装备图纸、神物「亚特兰蒂斯之种」与一次仓库扩容，各只能换一次；
  // 交换状态只新增字段 S.atlantis.fishmanTraded（不删改既有字段）。
  // ⚠️ 之种不进随机奖池；原「神秘商人」事件已删除，2026-10-04 新增商城购买。
  //    那条已按要求整个删除（见 data.js RANDOM_EVENTS 的说明），所以这里必须给出口，
  //    否则红成就「传世遗物」会变成不可达。
  //    图纸/神物的金锭门槛为 4/5/8，另需深海材料；旧存档已交换记录照旧有效。
  
  function fishmanTraded(...args){return tradingRules.fishmanTraded(...args);}
  function fishmanDeals(...args){return tradingRules.fishmanDeals(...args);}
  function fishmanBarter(...args){return tradingRules.fishmanBarter(...args);}

  function laochaoAvailable(...args){return tradingRules.laochaoAvailable(...args);}
  function signalFlag(...args){return tradingRules.signalFlag(...args);}
  function doFirstTrade(...args){return tradingRules.doFirstTrade(...args);}
  function acceptCommission(...args){return tradingRules.acceptCommission(...args);}
  function commissions(...args){return tradingRules.commissions(...args);}
  function commissionKey(...args){return tradingRules.commissionKey(...args);}
  function commissionDone(...args){return tradingRules.commissionDone(...args);}
  function commissionAccepted(...args){return tradingRules.commissionAccepted(...args);}
  function completeCommission(...args){return tradingRules.completeCommission(...args);}
  function grantReward(...args){return tradingRules.grantReward(...args);}

  // ---------- 吃喝 ----------
  function consume(...args){return consumablesRules.consume(...args);}
  // 手动和自动食用共用全部效果；自动触发不递归推进时间。
  function applyFoodEffects(...args){return consumablesRules.applyFoodEffects(...args);}
  function useMed(...args){return consumablesRules.useMed(...args);}
  function equipToSlot(...args){return inventory.equipToSlot(...args);}
  function equip(...args){return inventory.equip(...args);}
  function unequip(...args){return inventory.unequip(...args);}
  function rest(...args){return survivalRules.rest(...args);}

  // ---------- 结局 ----------
  function checkEndingActions(...args){return endingsRules.checkEndingActions(...args);}
  function doEnding(...args){return endingsRules.doEnding(...args);}
  // 山顶祭坛仪式（章节目标，不是结局）：不结算、不算结局列表，只发一次 50 魂点。
  // 老档已经用 ended_C=1 记了「仪式做过」→ 直接挡住，不能再领魂点。
  // 保留 S.flags.ended_C 与 atlantis 解锁链，不破坏传送石/亚特兰蒂斯，也不改老存档其它 flag。
  function doPeakRitual(...args){return endingsRules.doPeakRitual(...args);}
  // 结局达成之后，当面问一句"要不要现在看结算画面"（以前没有这一步，玩家以为按钮点坏了）
  // 话里必须讲清：一个存档只能结算一个结局（作者 2026-09-18 定的规矩）。
  function askSettleEnding(...args){return endingsRules.askSettleEnding(...args);}
  // 结算 = 本存档从此只认这一个结局，不可逆，所以单独再确认一次（别让手滑点掉）
  function confirmSettleEnding(...args){return endingsRules.confirmSettleEnding(...args);}
  function settleEnding(...args){return endingsRules.settleEnding(...args);}

  // ---------- 图鉴 ----------
  // 图鉴口径统一：总量与列表用同一份名单，避免"标题 25 条、列表 24 条"这种对不上
  function resIds(...args){return endingsRules.resIds(...args);}
  function monIds(...args){return endingsRules.monIds(...args);}   // 梦魇仅在专属模式计入图鉴
  function collection(...args){return endingsRules.collection(...args);}

  // ---------- 目标引导 ----------
  function currentObjective(...args){return objectivesRules.currentObjective(...args);}

  function demolishFurniture(...args){return productionRules.demolishFurniture(...args);}

  function collectRainWater(...args){return productionRules.collectRainWater(...args);}
  function collectHiveHoney(...args){return productionRules.collectHiveHoney(...args);}

  // ---------- 出售/兑换 ----------
  // （旧的"一键卖固定价表" sellPrice/sellItem 已删除：没有任何界面入口，属于遗留死代码）
  // 老潮的兑换：**双向**（作者 2026-09-25 定案）。两个方向各走各的价，中间留一道价差就套不了利：
  //   50 贝壳 → 1 金币      1 金币 → 30 贝壳
  // 于是「贝壳→金币→贝壳」走一圈 50 变 30（亏），「金币→贝壳→金币」走一圈 30 贝壳换不到 1 枚金币（也亏）。
  const SHELL_PER_COIN = 50;    // 换 1 枚金币要多少贝壳
  const SHELL_FOR_COIN = 30;    // 1 枚金币能换回多少贝壳
  function exchangeShells(...args){return tradingRules.exchangeShells(...args);}
  function exchangeGold(...args){return tradingRules.exchangeGold(...args);}

  function hardCompleted(...args){return nightmareRules.hardCompleted(...args);}
  function difficultyUnlocked(...args){return nightmareRules.difficultyUnlocked(...args);}
  function unlockChallenges(...args){return nightmareRules.unlockChallenges(...args);}
  function nightmareInfo(...args){return nightmareRules.nightmareInfo(...args);}
  function nightmareEncounter(...args){return nightmareRules.nightmareEncounter(...args);}
  function challengeNightmareBoss(...args){return nightmareRules.challengeNightmareBoss(...args);}
  function reconcileNightmareSouls(...args){return nightmareRules.reconcileNightmareSouls(...args);}
  
  function nightmareInfusionBonus(...args){return nightmareRules.nightmareInfusionBonus(...args);}
  function infuseNightmare(...args){return nightmareRules.infuseNightmare(...args);}
  function separateSouls(...args){return nightmareRules.separateSouls(...args);}

  // ---------- 局外成长：历代遗章 ----------
  
  
  function identityUnlocked(...args){return accountRules.identityUnlocked(...args);}
  function unlockIdentity(...args){return accountRules.unlockIdentity(...args);}
  function preserveMetaGrowth(...args){return accountRules.preserveMetaGrowth(...args);}
  function metaLoad(...args){return accountRules.metaLoad(...args);}
  function metaSave(...args){return accountRules.metaSave(...args);}
  function metaReload(...args){return accountRules.metaReload(...args);}

  // 平台适配器保留统一接口；普通浏览器使用本地存档。
  function cloudStatus(...args){return accountRules.cloudStatus(...args);}
  function cloudPush(...args){return accountRules.cloudPush(...args);}
  function cloudInit(...args){return accountRules.cloudInit(...args);}
  // 存档码：把「历代遗章 + 已解锁存档槽」打包，兼容旧版三个槽。
  function readSaveCode(...args){return accountRules.readSaveCode(...args);}
  function inspectCode(...args){return accountRules.inspectCode(...args);}
  function exportCode(...args){return accountRules.exportCode(...args);}
  function importCode(...args){return accountRules.importCode(...args);}
  function redeemCode(...args){return accountRules.redeemCode(...args);}
  
  function redeemOnlineCode(...args){return accountRules.redeemOnlineCode(...args);}
  // ---------- 神弓：可持有多把，每次存入一把，逐件保留耐久 ----------
  function hasDivineBowAnywhere(...args){return mailboxRules.hasDivineBowAnywhere(...args);}
  function hasMailboxDivineBow(...args){return mailboxRules.hasMailboxDivineBow(...args);}
  // 存入邮箱：**当前局立刻失去这把弓**（不是复制），否则等于无中生有
  function updateMailCheckpoint(...args){return mailboxRules.updateMailCheckpoint(...args);}
  function storeDivineBow(...args){return mailboxRules.storeDivineBow(...args);}
  // 内置更新公告：只有 approved 的才进邮箱，每个版本只发一次
  function syncPatchNotes(...args){return mailboxRules.syncPatchNotes(...args);}
  function mailboxList(...args){return mailboxRules.mailboxList(...args);}
  // 传奇难度不能靠邮箱白拿物资（物品 / 神物 / 魂点都算）——否则难度机制直接被抹平。
  // 公告（纯文本）不受影响，照常能读。
  // ⚠️ 只"拒绝领取"，**不消耗邮件**：留在邮箱里，换低难度还能领，不惩罚玩家。
  function mailIsSupply(...args){return mailboxRules.mailIsSupply(...args);}
  function claimMailbox(...args){return mailboxRules.claimMailbox(...args);}
  function mailboxCount(...args){return mailboxRules.mailboxCount(...args);}
  function metaState(...args){return mailboxRules.metaState(...args);}
  // 海底遗物交换机：位置和抽奖序列由局号、日期及账号级序号决定。
  // 进度放在账号档，读取较早的本局备份也不会倒退投入/每日次数或重抽同一结果。
  
  // 读旧导出码/云档也保留较新的抽取序号；不能用 max(pity)，因为出奖会清零。
  // 旧兑换邮件补上稳定收据；旧档中已兑换但不再待领的分项视为已领取，防止回读复制。
  function migrateRedeemReceipts(...args){return lotteryRules.migrateRedeemReceipts(...args);}
  function mergeLotteryHistory(...args){return lotteryRules.mergeLotteryHistory(...args);}
  function lotteryHash(...args){return lotteryRules.lotteryHash(...args);}
  function lotteryAccount(...args){return lotteryRules.lotteryAccount(...args);}
  function lotteryValue(...args){return lotteryRules.lotteryValue(...args);}
  function lotteryChance(...args){return lotteryRules.lotteryChance(...args);}
  
  
  
  function lotteryPools(...args){return lotteryRules.lotteryPools(...args);}
  // 独立用途的混合序列；结果与账号抽取序号绑定，读旧档不能重抽。
  function lotteryRandom(...args){return lotteryRules.lotteryRandom(...args);}
  function lotteryBalance(...args){return lotteryRules.lotteryBalance(...args);}
  // 账号投入累计与局内已扣累计对齐，旧码/备份不能同时恢复物品并保留充能。
  function reconcileLotteryInputs(...args){return lotteryRules.reconcileLotteryInputs(...args);}
  function lotteryState(...args){return lotteryRules.lotteryState(...args);}
  function lotteryOffer(...args){return lotteryRules.lotteryOffer(...args);}
  function lotteryDeposit(...args){return lotteryRules.lotteryDeposit(...args);}
  function lotteryPut(...args){return lotteryRules.lotteryPut(...args);}
  function lotteryDraw(...args){return lotteryRules.lotteryDraw(...args);}
  function lotteryTransact(...args){return lotteryRules.lotteryTransact(...args);}
  // 账号级一次性提示（首次交易/制作批量说明）：只新增 M.batchTipSeen 字段，旧元存档无此字段天然兼容。
  function batchTipSeen(...args){return lotteryRules.batchTipSeen(...args);}
  function markBatchTipSeen(...args){return lotteryRules.markBatchTipSeen(...args);}
  // ---------- 成就 ----------
  function achState(...args){return achievementsRules.achState(...args);}
  function achUnlocked(...args){return achievementsRules.achUnlocked(...args);}
  // 攻击连续落空计数：3 次紫、4 次金、6 次红（命中即清零）
  function noteMissStreak(...args){return achievementsRules.noteMissStreak(...args);}
  function achUnlock(...args){return achievementsRules.achUnlock(...args);}
  function achCheck(...args){return achievementsRules.achCheck(...args);}
  function achClaim(...args){return achievementsRules.achClaim(...args);}
  function metaNum(...args){return accountRules.metaNum(...args);}
  function metaAllowed(...args){return accountRules.metaAllowed(...args);}
  function metaBonus(...args){return accountRules.metaBonus(...args);}
  function metaBuy(...args){return accountRules.metaBuy(...args);}
  
  let craftBatchConfirmed = false;   // 批量制作"超过 5 小时"的二次确认：确认过这一次就不再拦
  // 统一的"长时间动手"预警（作者 2026-09-19）：批量制作、造家具、建建筑只要预计超过 5 小时，
  // 都先弹一次确认——这段时间饱食和水分一直在掉，已经有人把自己做没了。
  function longActWarn(...args){return accountRules.longActWarn(...args);}
  function metaLast(...args){return accountRules.metaLast(...args);}
  function reviveToday(...args){return accountRules.reviveToday(...args);}
  function ensureRunId(...args){return accountRules.ensureRunId(...args);}
  function legacySlotSettled(...args){return accountRules.legacySlotSettled(...args);}
  function rememberSettledRun(...args){return accountRules.rememberSettledRun(...args);}
  function metaSettle(...args){return accountRules.metaSettle(...args);}
  if(!(typeof window!=='undefined'&&window.GuyuSaveBridge)){recoverPendingWrite();metaLoad();}


  // ---------- 隐藏：开发者模式（点击"章"×4 → 输入密码解锁） ----------
  function devEnabled(...args){return relicsRules.devEnabled(...args);}
  function unlockDev(...args){return relicsRules.unlockDev(...args);}

  function hasRelic(...args){return relicsRules.hasRelic(...args);}
  function hpMax(...args){return relicsRules.hpMax(...args);}
  // 神物栏：三格，分别用 1/3/7 远古金币解锁
  function relicSlotCost(...args){return relicsRules.relicSlotCost(...args);}
  function unlockRelicSlot(...args){return relicsRules.unlockRelicSlot(...args);}
  function equipRelic(...args){return relicsRules.equipRelic(...args);}
  function unequipRelic(...args){return relicsRules.unequipRelic(...args);}
  // 睡眠质量系数：按"入睡时刻"算（22-0点睡8h最赚；白天睡大觉打折扣；中午午休最好）
  function sleepQuality(...args){return relicsRules.sleepQuality(...args);}
  function gainRandomRelic(...args){return relicsRules.gainRandomRelic(...args);}

  // ---------- 深海售卖机（遗失的交易机）：每天随机上架一件神物 ----------
  
  // 作者 2026-09-19：以前这台机器**每天必上架**一件神物，等于稳定白拿；现在改成每天 30% 概率有货
  const VENDOR_RELIC_CHANCE = 0.30;
  function atlVendor(...args){return relicsRules.atlVendor(...args);}
  function atlVendorInfo(...args){return relicsRules.atlVendorInfo(...args);}
  function buyRelicFromVendor(...args){return relicsRules.buyRelicFromVendor(...args);}

  // ---------- 备份系统（3 备份槽 + 备份点；防刷魂点） ----------
  // ---------- 每日签到（账号级，每天一次：30 魂点 + 2 备份点） ----------
  // 作者 2026-09-19：每日签到奖励下调为 魂点 ×10 + 备份点 ×1
  
  function todayKey(...args){return shopRules.todayKey(...args);}
  function dailySignState(...args){return shopRules.dailySignState(...args);}
  // 星之点为账号钱包，流水合并保留领取与消费，读旧码不能恢复已花余额。
  function walletEntry(...args){return shopRules.walletEntry(...args);}
  function adCoinBalance(...args){return shopRules.adCoinBalance(...args);}
  
  function walletId(...args){return shopRules.walletId(...args);}
  
  function adCurrencyName(...args){return shopRules.adCurrencyName(...args);}
  function adShopState(...args){return shopRules.adShopState(...args);}
  function buyAdShop(...args){return shopRules.buyAdShop(...args);}
  function exchangeAdCoins(...args){return shopRules.exchangeAdCoins(...args);}
  function exchangeSoulForStars(...args){return shopRules.exchangeSoulForStars(...args);}
  function adRewardState(...args){return shopRules.adRewardState(...args);}
  function claimAdReward(...args){return shopRules.claimAdReward(...args);}
  function dailySign(...args){return shopRules.dailySign(...args);}
  function backupPoints(...args){return shopRules.backupPoints(...args);}
  // ---------- 皮肤包解锁：全彩地图包免费；装备/界面/立绘包 50 魂点，账号级永久 ----------
  
  function skinCost(...args){return shopRules.skinCost(...args);}
  function skinOwned(...args){return shopRules.skinOwned(...args);}
  function unlockSkin(...args){return shopRules.unlockSkin(...args);}
  
  function extraSlotUnlocked(...args){return saveSlotsRules.extraSlotUnlocked(...args);}
  function slotList(...args){return saveSlotsRules.slotList(...args);}
  function buyExtraSlot(...args){return saveSlotsRules.buyExtraSlot(...args);}
  function delSlot(...args){return saveSlotsRules.delSlot(...args);}
  function buyBackupPoint(...args){return saveSlotsRules.buyBackupPoint(...args);}
  function backupSlot(...args){return saveSlotsRules.backupSlot(...args);}
  function loadSlot(...args){return saveSlotsRules.loadSlot(...args);}
  // 读进来一份 S 之后要做的收尾（load() / loadSlot() / 救援恢复 共用）：
  // ① 补缺失字段（老格式/备份槽里的档可能缺）② 跑技能迁移 ③ 耐久对齐实例数组
  // ④ 对齐存档版本号并【立刻写回主存档】——不然标题页「继续上次游戏」还是上一局，
  //    而且 save() 会以为"另一个标签页有更新进度"拒绝写入（玩家反馈"覆盖不行"）。
  function validSave(data){return migrations.validSave(data);}
  function migrateSaltMeta(meta){return migrations.migrateMeta(meta);}
  function normalizeState(){return migrations.normalize();}

  // 配方材料配比调整（木材 ×0.8 / 其它 ×1.1）：放在模块末尾执行 —— 必须等 RECIPES 与
  // WOOD_MATS 等声明都初始化完；函数内部有幂等保护，重复调用不会二次打折。
  adjustRecipeMats();

  // ---------- 导出 ----------
  return {
    S: () => gameState.run, setS: (s) => { gameState.run = s; }, validSave, initializeStorage, saveAndFlush,
    skipTutorial:()=>runTutorial.skip(), tutorialBagViewed:()=>runTutorial.bagViewed(),
    timePass: (m) => { if (gameState.run) addMin(m || 1); },
    bind: (o) => { if (o.onLog) onLog = o.onLog; if (o.onChange) onChange = o.onChange; if (o.onFight) onFight = o.onFight; if (o.onEnding) onEnding = o.onEnding; if (o.onOverlay) onOverlay = o.onOverlay; if (o.onSaveFail) onSaveFail = o.onSaveFail; if (o.onSaveConflict) onSaveConflict = o.onSaveConflict; },
    // 存档加固：给刚开的新局/刚读的档一个"当前存档版本号"基线，用来识别"另一个标签页有更新进度"
    saveRev: () => { try { return parseInt(localStorage.getItem('guyuyizhang_rev') || '0', 10) || 0; } catch (e) { return 0; } },
    savedAt: () => { try { return parseInt(localStorage.getItem('guyuyizhang_savedAt') || '0', 10) || 0; } catch (e) { return 0; } },
    forceSave: () => { if (gameState.run) { gameState.run._rev = 0; try { gameState.run._rev = parseInt(localStorage.getItem('guyuyizhang_rev') || '0', 10) || 0; } catch (e) {} } return save(); },
    difficultyUnlocked, nightmareInfo, nightmareEncounter, challengeNightmareBoss, separateSouls, infuseNightmare, nightmareInfusionBonus, loadPenalty, healthValue, pendingLootInfo, collectPending, setFocus, awardExperience, satchelAvailable, satchelEligible, satchelSelections, setSatchelSelections, toggleSatchelSelection, satchelStatus, cellarBuilt, cellarTransferMax, cellarState, cellarAccess, transferCellar, stackSize, itemUseCount, merchantSellCount, warehouseSite, warehouseAccess, warehouseDepositAccess, warehouseDepositCount, warehouseTransferMax, discardItems, warehouseAccessCheck, learnBlueprint, knowsBlueprint, storeAllWarehouse, warehouseCapacity, warehouseState, transferWarehouse, materialCount, warehouseAutoEligible, warehouseAutoItems, setWarehouseAutoItems, autoStoreWarehouse, equipBackpack, replacePending,
    newGame, load, hasSave, save,
    sceneOf, sceneUnlocked, canTravel, travel, atlantisTeleport, activatePortal, setZone, lightLevel, pointsOf, pointAvailable, pointStatus, doPoint, randomEventPool,
    onceRewardMissing,
    buildChain, canBuildFurniture, buildFurniture, buildHouseExt, houseExtMax, houseExtMats, buildStoreExt, storeExtMax, storeExtMats, storeExtCap, atlantisCamp, atlantisFurnitureUsed, buildAtlantisFurniture, repairDive, repairDiveCost, demolishFurniture, collectRainWater, collectHiveHoney, canCraft, craft, exchangeShells, exchangeGold, SHELL_PER_COIN, SHELL_FOR_COIN, shrinePool, shrineChoices, triggerShrine,
    liveInfo, liveCap, coopCap, coopExtMats, buildCoopExt, addSheep, addChick, toggleAutoFeed, deliverToBag,
    plant, harvest, consume, useMed, equipToSlot, equip, rest, sleep, farmPlots, farmExt, tillPlot, loosenPlot, FARM_EXTRA_MAX, raidWolves, continueRun, syncToolkit, drainTool, drainById, restoreBackupSave, dailySign, dailySignState,
    dryOf, dryLeftMin, dryCollect, fmtLeft,
    hasDivineBowAnywhere, storeDivineBow, hasMailboxDivineBow,
    collectDailyReport, claimDailyTrap, resolveTrapDaily,
    setTimeFreeze, timeFrozen, setHostSuspended, hostSuspended,
    rollTravelAmbush, roadAmbushChance, roadAmbushPool, ROAD_AMBUSH_MIN_DANGER,
    startFight, fightAction, useItemInFight, pointReason, furnSlotFull, furnSlotInfo, furnTakesSlot, houseSlots, bedStamBonus, furnitureUsed, tailorGifted, farmLiveSlots, farmLiveUsed, farmLiveFree, farmLiveInfo, FARM_LIVESTOCK_IDS,
    laochaoAvailable, signalFlag, doFirstTrade, completeCommission, commissions, commissionDone, commissionAccepted,
    sellToMerchant, buyFromMerchant, priceOf, fishmanDeals, fishmanBarter, fishmanTraded,
    checkEndingActions, doEnding, doPeakRitual, settleEnding, collection, currentObjective, metaState, identityUnlocked, unlockIdentity, metaBuy, metaBonus, metaSettle, metaNum, metaLast, reviveInfo, reviveToday, redeemCode, mailboxList, claimMailbox, mailboxCount, batchTipSeen, markBatchTipSeen, devEnabled, unlockDev, hasRelic, hpMax, gainRandomRelic, durOf, durMaxOf, sleepQuality, sleepForecast, unlockRelicSlot, equipRelic, unequipRelic, relicSlotCost, atlVendorInfo, buyRelicFromVendor, lotusLeft, backupPoints, slotList, extraSlotUnlocked, buyExtraSlot, buyBackupPoint, backupSlot, loadSlot, delSlot, exportCode, inspectCode, importCode, metaReload, raidDay, acceptCommission, sharpen, repairWeapon, nameWeapon, repairMatOf, wNameOf, selectedTool, autoToolsEnabled, setAutoTools, pointMinutes, craftRecipe, craftMax, craftMinutes, craftBatch, repairPistol, fixBrokenPistol, travelCost, zoneSwimCost, equipTool, unequipTool, capUsed, unequip, newGame, achCheck, achClaim, achUnlocked, achState,
    // 技能树（B1）
    skillTreeInfo, skillUpTrunk, skillNodeLearn, skillNodeForget, nodeLv, trunkPicks, trunkLv, nodeCheck, nodeIsLeaf, nodeForgetGain, craftIn,
    trunkForgetInfo, skillTrunkForget,          // 主干遗忘（只能从末端退，返还一半）
    skinCost, skinOwned, unlockSkin,            // 皮肤包解锁（深海琥珀 / 彩绘卡面 各 50 魂点）
    enemyRangeOf: enemyRange, myAttackRange, myMoveSpeed,   // 距离制：战斗面板要显示"还差多少步"
    satchelPref: () => ({food:satchelSelections('food')[0]||'',drink:satchelSelections('drink')[0]||''}),
    setSatchelPref: (kind,id) => setSatchelSelections(kind,id?[id]:[]),
    vendorRelicChance: () => VENDOR_RELIC_CHANCE,
    scanLocalSaves, restoreLocalSave, rescueInfo,   // 存档救援：扫描本机痕迹 / 恢复某一份
    confirmSettleEnding,   // 结算前二次确认（一局只能结算一个结局，所以要单独再问一次）
    skillCritRate: cxCrit, gatherYieldMul: gxYieldMul, gatherTimeMul: gxTimeMul, gatherEnergyMul: gxEnergyMul,
    sweepCdTotal, sweepMul, vampRate, execThreshold, revengeBonus, critMul, bowNodeLv, gunNodeLv, heavyInfo, sureInfo, hasHeavy, hasSure, ACT_CD_BASE,
    diveWarn,   // 水下负面状态（水压 / 缺氧）给顶栏徽标用
    takeCombatEvents, wallBlockBonus, wallDurMul, swiftBonus, rageAtkMul, rageTakenMul, ironTakenMul, ironAtkMul, ammoSaveChance, rangedAcc, combatAccuracy, combatActionInfo,
    cloudStatus, cloudPush, cloudInit,
    hasItem, invCount, addItem, removeItem, capacity, fertilize,
    lotteryState, lotteryValue, lotteryChance, lotteryOffer, lotteryDeposit, lotteryDraw, lotteryPools, adCoinBalance, adCurrencyName, adRewardState, claimAdReward, adShopState, buyAdShop, exchangeAdCoins, exchangeSoulForStars,
    sweepInfo, activeBuffs, pointEnergy, staminaCost, foodFreshness,
    playerAtk, playerAtkAvg, rangedAtk, playerDef, warmth, weatherTemperature, environmentTemperature, temperatureInfo, maxStam, combatLv, expLevel, charStats, combatSpeed, train, trainingHp, trainingAtk,
    isNight, isDusk, seasonInfo, seasonOnDay, winterJustStarted, fmtTime,
    log, change, addMin, die, diaryAdd,
    resIds, monIds,   // 图鉴名单（总量与列表共用，保证对得上）
  };
})();
