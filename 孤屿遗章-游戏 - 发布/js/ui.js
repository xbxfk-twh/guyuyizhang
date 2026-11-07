/* ============================================================
   孤屿遗章 · 界面层
   ============================================================ */
const UI = (() => {
  const startupView=StartupView.create({
    get view(){return view;}, set view(value){view=value;},
    get roomView(){return roomView;}, set roomView(value){roomView=value;},
    get modal(){return modal;},
    get $(){return $;},
    get dom(){return dom;},
    get panels(){return panels;},
    get centerToast(){return centerToast;},
    get addLog(){return addLog;},
    get replayLog(){return replayLog;},
    get applySkin(){return applySkin;},
    get applyLogMode(){return applyLogMode;},
    get render(){return render;},
    get noteBootStart(){return noteBootStart;},
    get noteBootOk(){return noteBootOk;},
    get inGameCrashes(){return inGameCrashes;},
    get animSpeed(){return animSpeed;}, set animSpeed(value){animSpeed=value;},
    get restHours(){return restHours;}, set restHours(value){restHours=value;},
    get uiBusy(){return uiBusy;},
    get withAnimation(){return withAnimation;},
    get traveling(){return traveling;},
    get equipTab(){return equipTab;}, set equipTab(value){equipTab=value;},
    get battleView(){return battleView;},
    get restoreCombatView(){return restoreCombatView;},
    get mailTab(){return mailTab;}, set mailTab(value){mailTab=value;},
    get showModal(){return showModal;},
    get closeModal(){return closeModal;},
    get backModal(){return backModal;},
    get tutAfterBag(){return tutAfterBag;},
    get showEnding(){return showEnding;},
    get rememberIdentity(){return rememberIdentity;},
    get showTitle(){return showTitle;},
    get COMIC(){return COMIC;},
    get freshRun(){return freshRun;}, set freshRun(value){freshRun=value;},
    get showComicIntro(){return showComicIntro;}
  });
  const titleView=TitleView.create({
    get $(){return $;},
    get el(){return el;},
    get S(){return S;},
    get dom(){return dom;},
    get centerToast(){return centerToast;},
    get addLog(){return addLog;},
    get portraitPath(){return portraitPath;},
    get render(){return render;},
    get uiBusy(){return uiBusy;},
    get traveling(){return traveling;},
    get askConfirm(){return askConfirm;},
    get showModal(){return showModal;},
    get lastIdentity(){return lastIdentity;}, set lastIdentity(value){lastIdentity=value;},
    get lastDifficulty(){return lastDifficulty;}, set lastDifficulty(value){lastDifficulty=value;},
    get COMIC(){return COMIC;},
    get freshRun(){return freshRun;}, set freshRun(value){freshRun=value;},
    get begin(){return begin;}
  });
  const endingsShareView=EndingShareView.create({
    get $(){return $;},
    get S(){return S;},
    get esc(){return esc;},
    get centerToast(){return centerToast;},
    get addLog(){return addLog;},
    get showModal(){return showModal;},
    get lastIdentity(){return lastIdentity;},
    get lastDifficulty(){return lastDifficulty;},
    get showIdentity(){return showIdentity;}
  });
  const lotteryView=LotteryView.create({
    get itemIcon(){return itemIcon;},
    get modal(){return modal;},
    get S(){return S;},
    get esc(){return esc;},
    get centerToast(){return centerToast;},
    get animSpeed(){return animSpeed;},
    get askConfirm(){return askConfirm;},
    get showModal(){return showModal;},
    get lotteryLast(){return lotteryLast;}, set lotteryLast(value){lotteryLast=value;},
    get lotteryTimer(){return lotteryTimer;}, set lotteryTimer(value){lotteryTimer=value;}
  });
  const collectionView=CollectionView.create({
    get itemIcon(){return itemIcon;},
    get S(){return S;},
    get esc(){return esc;},
    get colTab(){return colTab;}
  });
  const tutorialView=TutorialView.create({

  });
  const dialogsView=DialogView.create({
    get craftTab(){return craftTab;}, set craftTab(value){craftTab=value;},
    get craftGroup(){return craftGroup;}, set craftGroup(value){craftGroup=value;},
    get itemIcon(){return itemIcon;},
    get modal(){return modal;}, set modal(value){modal=value;},
    get pendingPanels(){return pendingPanels;},
    get lootExpiryQueued(){return lootExpiryQueued;}, set lootExpiryQueued(value){lootExpiryQueued=value;},
    get modalOpenedAt(){return modalOpenedAt;}, set modalOpenedAt(value){modalOpenedAt=value;},
    get $(){return $;},
    get S(){return S;},
    get dom(){return dom;},
    get panels(){return panels;},
    get esc(){return esc;},
    get inlineHelp(){return inlineHelp;},
    get bindPress(){return bindPress;},
    get bindWarehouseCard(){return bindWarehouseCard;},
    get dragTransferQuantity(){return dragTransferQuantity;},
    get centerToast(){return centerToast;},
    get maybeBatchTip(){return maybeBatchTip;},
    get addLog(){return addLog;},
    get SKINS(){return SKINS;},
    get skinOn(){return skinOn;},
    get enableSkin(){return enableSkin;},
    get clearSkins(){return clearSkins;},
    get skinName(){return skinName;},
    get setLogMode(){return setLogMode;},
    get sceneScroll(){return sceneScroll;}, set sceneScroll(value){sceneScroll=value;},
    get setShowObjective(){return setShowObjective;},
    get setLogSize(){return setLogSize;},
    get render(){return render;},
    get withAnimation(){return withAnimation;},
    get mapPanY(){return mapPanY;}, set mapPanY(value){mapPanY=value;},
    get scenePanY(){return scenePanY;}, set scenePanY(value){scenePanY=value;},
    get fitStage(){return fitStage;},
    get ATL_SHOP(){return ATL_SHOP;},
    get ATL_BUY(){return ATL_BUY;},
    get repairModal(){return repairModal;},
    get atlTradeModal(){return atlTradeModal;},
    get fishmanModal(){return fishmanModal;},
    get renderRuneModal(){return renderRuneModal;},
    get bindRune(){return bindRune;},
    get sleepModal(){return sleepModal;},
    get renderHeirloom(){return renderHeirloom;},
    get devpwModal(){return devpwModal;},
    get rescueModal(){return rescueModal;},
    get renderBackup(){return renderBackup;},
    get comHelpModal(){return comHelpModal;},
    get skillModal(){return skillModal;},
    get skillTreeModal(){return skillTreeModal;},
    get shopBuyList(){return shopBuyList;},
    get shopSellList(){return shopSellList;},
    get batchnModal(){return batchnModal;},
    get batchModal(){return batchModal;},
    get renderCampHelp(){return renderCampHelp;},
    get livestockModal(){return livestockModal;},
    get campModal(){return campModal;},
    get renderCraft(){return renderCraft;},
    get invCat(){return invCat;}, set invCat(value){invCat=value;},
    get warehouseCat(){return warehouseCat;}, set warehouseCat(value){warehouseCat=value;},
    get renderInventory(){return renderInventory;},
    get equipTab(){return equipTab;}, set equipTab(value){equipTab=value;},
    get warehouseModal(){return warehouseModal;},
    get buffInfoModal(){return buffInfoModal;},
    get equipmentPickModal(){return equipmentPickModal;},
    get renderEquip(){return renderEquip;},
    get bindCellarControls(){return bindCellarControls;},
    get itemDetail(){return itemDetail;},
    get laoTab(){return laoTab;}, set laoTab(value){laoTab=value;},
    get laochaoModal(){return laochaoModal;},
    get activeMerchant(){return activeMerchant;}, set activeMerchant(value){activeMerchant=value;},
    get merchantLine(){return merchantLine;}, set merchantLine(value){merchantLine=value;},
    get merchantTrades(){return merchantTrades;}, set merchantTrades(value){merchantTrades=value;},
    get townShopNow(){return townShopNow;}, set townShopNow(value){townShopNow=value;},
    get townModal(){return townModal;},
    get blackModal(){return blackModal;},
    get missionModal(){return missionModal;},
    get infoModal(){return infoModal;},
    get battleView(){return battleView;},
    get restoreCombatView(){return restoreCombatView;},
    get renderCombat(){return renderCombat;},
    get mailTab(){return mailTab;}, set mailTab(value){mailTab=value;},
    get backupSummary(){return backupSummary;},
    get downloadBackup(){return downloadBackup;},
    get settingsModal(){return settingsModal;},
    get dailyReportModal(){return dailyReportModal;},
    get winterModal(){return winterModal;},
    get signModal(){return signModal;},
    get guidePage(){return guidePage;}, set guidePage(value){guidePage=value;},
    get guideModal(){return guideModal;},
    get guideBadge(){return settingsView.guideBadge;},
    get markGuideRead(){return settingsView.markGuideRead;},
    get watchAd(){return watchAd;},
    get adShopModal(){return adShopModal;},
    get shopExchangeModal(){return settingsView.shopExchangeModal;},
    get mailboxModal(){return mailboxModal;},
    get askConfirm(){return askConfirm;},
    get inventoryReturn(){return inventoryReturn;}, set inventoryReturn(value){inventoryReturn=value;},
    get inventoryDualScroll(){return inventoryDualScroll;}, set inventoryDualScroll(value){inventoryDualScroll=value;},
    get farmModal(){return farmModal;},
    get bindFarm(){return bindFarm;},
    get diaryModal(){return diaryModal;},
    get colTab(){return colTab;}, set colTab(value){colTab=value;},
    get collectionModal(){return collectionModal;},
    get itemInfoModal(){return itemInfoModal;},
    get lotteryTimer(){return lotteryTimer;}, set lotteryTimer(value){lotteryTimer=value;},
    get lotteryModal(){return lotteryModal;},
    get lotteryPickModal(){return lotteryPickModal;},
    get lotteryPoolModal(){return lotteryPoolModal;},
    get lotteryResultModal(){return lotteryResultModal;},
    get bindLottery(){return bindLottery;},
    get shareModal(){return shareModal;},
    get showTitle(){return showTitle;},
    get showJourneySelect(){return showJourneySelect;},
    get begin(){return begin;}
  });
  const reportsView=ReportView.create({
    get S(){return S;}
  });
  const settingsView=SettingsView.create({
    get itemIcon(){return itemIcon;},
    get S(){return S;},
    get esc(){return esc;},
    get inlineHelp(){return inlineHelp;},
    get centerToast(){return centerToast;},
    get SKINS(){return SKINS;},
    get skinSet(){return skinSet;},
    get skinOn(){return skinOn;},
    get skinName(){return skinName;},
    get logMode(){return logMode;},
    get logSize(){return logSize;},
    get showObjective(){return showObjective;},
    get sceneScroll(){return sceneScroll;},
    get mailTab(){return mailTab;},
    get guidePage(){return guidePage;}, set guidePage(value){guidePage=value;}
  });
  const combatView=CombatView.create({
    get itemIcon(){return itemIcon;},
    get modal(){return modal;}, set modal(value){modal=value;},
    get pendingPanels(){return pendingPanels;}, set pendingPanels(value){pendingPanels=value;},
    get modalOpenedAt(){return modalOpenedAt;}, set modalOpenedAt(value){modalOpenedAt=value;},
    get $(){return $;},
    get S(){return S;},
    get dom(){return dom;},
    get esc(){return esc;},
    get skinOn(){return skinOn;},
    get render(){return render;},
    get showBuffInfo(){return showBuffInfo;},
    get fightSeq(){return fightSeq;}, set fightSeq(value){fightSeq=value;},
    get battleView(){return battleView;}, set battleView(value){battleView=value;},
    get showModal(){return showModal;},
    get showNextPendingPanel(){return showNextPendingPanel;},
    get showEnding(){return showEnding;}
  });
  const playerPanelsView=PlayerPanelView.create({
    get craftTab(){return craftTab;},
    get craftGroup(){return craftGroup;}, set craftGroup(value){craftGroup=value;},
    get itemIcon(){return itemIcon;},
    get el(){return el;},
    get S(){return S;},
    get esc(){return esc;},
    get bindPress(){return bindPress;},
    get dragTransferQuantity(){return dragTransferQuantity;},
    get centerToast(){return centerToast;},
    get portraitPath(){return portraitPath;},
    get settleActions(){return settleActions;},
    get skillBody(){return skillBody;},
    get invCat(){return invCat;},
    get warehouseCat(){return warehouseCat;},
    get equipTab(){return equipTab;},
    get battleView(){return battleView;},
    get brokenWeaponRows(){return brokenWeaponRows;},
    get showModal(){return showModal;}
  });
  const livestockFarmView=FarmView.create({
    get $(){return $;},
    get S(){return S;},
    get esc(){return esc;},
    get addLog(){return addLog;},
    get matsOk(){return matsOk;},
    get missingReason(){return missingReason;},
    get matsStr(){return matsStr;},
    get showModal(){return showModal;},
    get closeModal(){return closeModal;}
  });
  const campView=CampView.create({
    get roomView(){return roomView;}, set roomView(value){roomView=value;},
    get craftTab(){return craftTab;}, set craftTab(value){craftTab=value;},
    get craftGroup(){return craftGroup;}, set craftGroup(value){craftGroup=value;},
    get $(){return $;},
    get S(){return S;},
    get dom(){return dom;},
    get esc(){return esc;},
    get centerToast(){return centerToast;},
    get skinOn(){return skinOn;},
    get render(){return render;},
    get restHours(){return restHours;},
    get fitStage(){return fitStage;},
    get lastSceneKey(){return lastSceneKey;}, set lastSceneKey(value){lastSceneKey=value;},
    get atlantisCampModal(){return atlantisCampModal;},
    get bedDesc(){return bedDesc;},
    get laoTab(){return laoTab;}, set laoTab(value){laoTab=value;},
    get showModal(){return showModal;}
  });
  const batchTransferView=BatchTransferView.create({
    get shopBuyList(){return shopBuyList;},
    get shopSellList(){return shopSellList;}
  });
  const tradingView=TradingView.create({
    get S(){return S;},
    get ATL_SHOP(){return ATL_SHOP;},
    get ATL_BUY(){return ATL_BUY;},
    get laoTab(){return laoTab;},
    get townShopNow(){return townShopNow;}, set townShopNow(value){townShopNow=value;}
  });
  const skillsView=SkillView.create({
    get inlineHelp(){return inlineHelp;}
  });
  const progressionView=ProgressionView.create({
    get esc(){return esc;},
    get inlineHelp(){return inlineHelp;}
  });
  const restView=RestView.create({
    get S(){return S;}
  });
  const runePuzzleView=RunePuzzleView.create({
    get $(){return $;},
    get addLog(){return addLog;},
    get showModal(){return showModal;},
    get closeModal(){return closeModal;}
  });
  const atlantisView=AtlantisView.create({
    get S(){return S;},
    get esc(){return esc;},
    get ATL_SHOP(){return ATL_SHOP;},
    get ATL_BUY(){return ATL_BUY;},
    get matsOk(){return matsOk;},
    get missingReason(){return missingReason;},
    get matsStr(){return matsStr;},
    get walletBar(){return walletBar;}
  });
  const sceneView=SceneView.create({
    get view(){return view;}, set view(value){view=value;},
    get roomView(){return roomView;}, set roomView(value){roomView=value;},
    get craftTab(){return craftTab;}, set craftTab(value){craftTab=value;},
    get craftGroup(){return craftGroup;}, set craftGroup(value){craftGroup=value;},
    get $(){return $;},
    get el(){return el;},
    get S(){return S;},
    get dom(){return dom;},
    get esc(){return esc;},
    get bindPress(){return bindPress;},
    get centerToast(){return centerToast;},
    get addLog(){return addLog;},
    get skinOn(){return skinOn;},
    get sceneImagePath(){return sceneImagePath;},
    get render(){return render;},
    get restHours(){return restHours;},
    get withAnimation(){return withAnimation;},
    get scenePanY(){return scenePanY;}, set scenePanY(value){scenePanY=value;},
    get applyScenePan(){return applyScenePan;},
    get fitSceneLayers(){return fitSceneLayers;},
    get bindPan(){return bindPan;},
    get renderCampBuildings(){return renderCampBuildings;},
    get fitStage(){return fitStage;},
    get diveGateThen(){return diveGateThen;},
    get zoneTravelAnim(){return zoneTravelAnim;},
    get lastSceneKey(){return lastSceneKey;}, set lastSceneKey(value){lastSceneKey=value;},
    get PAPER_FALLBACK(){return PAPER_FALLBACK;},
    get startRunePuzzle(){return startRunePuzzle;},
    get matsOk(){return matsOk;},
    get renderRoomScene(){return renderRoomScene;},
    get showModal(){return showModal;}
  });
  const travelView=TravelView.create({
    get view(){return view;}, set view(value){view=value;},
    get $(){return $;},
    get el(){return el;},
    get S(){return S;},
    get centerToast(){return centerToast;},
    get addLog(){return addLog;},
    get skinOn(){return skinOn;},
    get atlantisVisualArrows(){return atlantisVisualArrows;},
    get render(){return render;},
    get traveling(){return traveling;}, set traveling(value){traveling=value;},
    get showModal(){return showModal;}
  });
  const mapView=MapView.create({
    get view(){return view;}, set view(value){view=value;},
    get roomView(){return roomView;},
    get $(){return $;},
    get el(){return el;},
    get S(){return S;},
    get dom(){return dom;},
    get centerToast(){return centerToast;},
    get addLog(){return addLog;},
    get skinOn(){return skinOn;},
    get mapImagePath(){return mapImagePath;},
    get baseMapImagePath(){return baseMapImagePath;},
    get atlantisVisualArrows(){return atlantisVisualArrows;},
    get logSize(){return logSize;},
    get sceneScroll(){return sceneScroll;},
    get logWidthFor(){return logWidthFor;},
    get alignLogGrip(){return alignLogGrip;},
    get render(){return render;},
    get mapPanY(){return mapPanY;}, set mapPanY(value){mapPanY=value;},
    get scenePanY(){return scenePanY;}, set scenePanY(value){scenePanY=value;},
    get startAtlantisTravel(){return startAtlantisTravel;},
    get startTravel(){return startTravel;},
    get PAPER_FALLBACK(){return PAPER_FALLBACK;},
    get showModal(){return showModal;}
  });
  const actionAnimationView=ActionAnimationView.create({
    get $(){return $;},
    get esc(){return esc;},
    get skinOn(){return skinOn;},
    get animSpeed(){return animSpeed;},
    get uiBusy(){return uiBusy;}, set uiBusy(value){uiBusy=value;}
  });
  const renderView=GameRenderView.create({
    get view(){return view;},
    get roomView(){return roomView;}, set roomView(value){roomView=value;},
    get $(){return $;},
    get S(){return S;},
    get dom(){return dom;},
    get skinOn(){return skinOn;},
    get bindLogCollapseBtn(){return bindLogCollapseBtn;},
    get renderObjective(){return renderObjective;},
    get renderTopbar(){return renderTopbar;},
    get bindLogGrip(){return bindLogGrip;},
    get renderMap(){return renderMap;},
    get fitStage(){return fitStage;},
    get renderScene(){return renderScene;},
    get renderExtras(){return renderExtras;},
    get restoreCombatView(){return restoreCombatView;},
    get renderTut(){return renderTut;}
  });
  const hudView=HudView.create({
    get modalOpenedAt(){return modalOpenedAt;}, set modalOpenedAt(value){modalOpenedAt=value;},
    get $(){return $;},
    get el(){return el;},
    get S(){return S;},
    get dom(){return dom;},
    get esc(){return esc;},
    get bindPress(){return bindPress;},
    get logMode(){return logMode;}, set logMode(value){logMode=value;},
    get logFadeTimer(){return logFadeTimer;}, set logFadeTimer(value){logFadeTimer=value;},
    get LOG_WIDTHS(){return LOG_WIDTHS;},
    get logSize(){return logSize;}, set logSize(value){logSize=value;},
    get logCollapsed(){return logCollapsed;}, set logCollapsed(value){logCollapsed=value;},
    get showObjective(){return showObjective;}, set showObjective(value){showObjective=value;},
    get fitStage(){return fitStage;},
    get showBuffInfo(){return showBuffInfo;}
  });
  const noticesView=NoticeView.create({
    get artView(){return artView;}
  });
  const artView=GameArtView.create({
    get SPR(){return SPR;},
    get $(){return $;},
    get el(){return el;},
    get SKINS(){return SKINS;},
    get SKIN_LS_KEY(){return SKIN_LS_KEY;},
    get skinSet(){return skinSet;},
    get logMode(){return logMode;},
    get logFadeTimer(){return logFadeTimer;}, set logFadeTimer(value){logFadeTimer=value;},
    get render(){return render;},
    get activeMerchant(){return activeMerchant;},
    get merchantLine(){return merchantLine;}, set merchantLine(value){merchantLine=value;},
    get merchantTrades(){return merchantTrades;}, set merchantTrades(value){merchantTrades=value;},
    get showModal(){return showModal;},
    get inventoryDualScroll(){return inventoryDualScroll;}, set inventoryDualScroll(value){inventoryDualScroll=value;}
  });
  let view = 'scene';        // scene | map
  let roomView = false;      // 临时室内场景；不写入玩家存档
  let craftTab = 'none';
  let craftGroup = 'all';
  // 物品立绘雪碧图（4x4）：{ itemId:[列,行] }，无映射则用汉字字形
  const SPR = { water:1, wood:1, branch:1, thatch:1, flint:1, stone:1, fish:1, berry:1, herb:1, mushroom:1, meat:1, hide:1, resin:1, bamboo:1, clay:1, salt:1, carrot:1, wheat:1, honey:1, wildveg:1, cactusfruit:1, snowlotus:1, leather:1, cloth:1, plank:1, stonebrick:1, ironore:1, ironingot:1, steelingot:1, charcoal:1, silk:1, pearl:1, sinew:1, tusk:1, horn:1, snakegall:1, herbPaste:1, salve:1, blueBull:1, zhangLaoJi:1, antidote:1, vegSoup:1, vegFry:1, meatSoup:1, meatStew:1, roastFish:1, roastMeat:1, jerky:1, smokedFish:1, furCoat:1, grassArmor:1, woodShield:1, ironShield:1, axeStone:1, axeIron:1, pickStone:1, pickIron:1, hoe:1, rod:1, net:1, trap:1, club:1, spear:1, torch:1, rope:1, vine:1, bow:1, arrow:1, eagleArrow:1, ironSword:1, steelSword:1, blackSword:1, ironGreatSword:1, ironDagger:1, steelDagger:1, blackDagger:1, knifeStone:1, pickSteel:1, pickBlack:1, axeSteel:1, ironArmor:1, steelArmor:1, blackArmor:1, leatherArmor:1, grassCloth:1, hempCloth:1, leatherCloth:1, supplybox:1, driftbottle:1, namecard:1, beibi:1, coin:1, slate:1, relic:1, dragonbone:1, fossil:1, niter:1, sulfur:1, gunpowder:1, blackingot:1, mithrilingot:1, spyglass:1, wool:1, felt:1, nail:1, ironpart:1, tile:1, claypot:1, basket:1, seedCarrot:1, seedWheat:1, seedHerb:1, honeyWater:1, tea:1, lotusPill:1, pearlNeck:1, shellAmulet:1, beastFang:1, fiber:1, bambooShoot:1, venom:1, poisonCoat:1, goldore:1, crystal:1, blackiron:1, mithril:1, eaglefeather:1, shipwood:1, sharkfin:1, wolfkingpelt:1, queenSilk:1, pole:1, canvas:1, smokedMeat:1, saltedMeat:1, mushroomSoup:1, tinder:1, steelShield:1, bandage:1, smokeBomb:1, diveSuit:1, diveSuit2:1, diveMask:1, goggles:1, lightWeak:1, lightStrong:1, sourceOre:1, sourceBar:1, deepCoral:1, anctDevice:1, pearlGranule:1, coralArmor:1, sourceArmor:1, coralBlade:1, sourceSpear:1, thruster:1, bpDive:1, bpGunpowder:1, bpFurnace:1, bpShip:1, bpBlack:1, bpLotus:1, rot:1, seachart:1 };
  // 独立彩色图标名单；未登记的物品沿用黑白图。
  
  // 神弓、神之甲默认彩色，不受皮肤选择影响。
  
  
  
  
  function itemIcon(...args){return artView.itemIcon(...args);}
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
  

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const S = () => Game.S();
  const dom=StableDOM.create({locale:Locale,onAdopt:PressInput.adopt,onDispose:PressInput.dispose});
  const panels=GamePanels.create();
  panels.register('mailbox',{bind:settingsView.bindDownload});
  const satchelPanels=FoodSatchelView.create({Game,ITEMS,itemIcon,esc,open:showModal,toast:centerToast});
  panels.register('satchelSettings',satchelPanels.menu);panels.register('satchelfood',satchelPanels.picker);

  function esc(...args){return artView.esc(...args);}
  function inlineHelp(...args){return artView.inlineHelp(...args);}

  // ---------- 绑定 ----------
  Game.bind({
    onLog: (text, cls) => addLog(text, cls),
    onChange: () => render(),
    // 存档写不进去（配额满 / 浏览器限制）时，必须让玩家知道，并马上引导他备份与迁移
    onSaveFail: (err) => {
      addLog('⚠ 存档写入失败！请到「菜单 → 备份·读档」生成取件码，在另一设备确认恢复后再刷新本页。电脑也可保存备份文件。', 'danger');
      try { centerToast('存档写入失败！'); } catch (e) {}
      showModal('overlay', { title:'存档写入失败', text:`浏览器没能把存档写进本地存储（${(err && err.name) || '未知原因'}）。\n\n这通常是存储空间满了或被浏览器限制。\n\n请到「菜单 → 备份·读档」生成取件码，在另一设备的10分钟内确认恢复，再刷新本页。电脑也可保存备份文件；确认备份成功前请保留本页。`, choices:[
        { label:'知道了', ok:()=>{} },
        { label:'去备份进度', ok:()=>showModal('codex', { mode:'export', code: Game.exportCode() }) },
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
  
  // 版本检测：换新包后进来自动提示"已更新"，存档不受影响
  (function(){ try {
    const v = window.BUILD_VER || 'v0';
    const old = localStorage.getItem('guyuyizhang_build');
    if (old && old !== v) setTimeout(() => centerToast('已更新到新版本(' + v + ')，存档保留，欢迎回来！'), 900);
    localStorage.setItem('guyuyizhang_build', v);
  } catch(e){} })();
  function bindPress(...args){return noticesView.bindPress(...args);}
  function bindWarehouseCard(...args){return noticesView.bindWarehouseCard(...args);}
  function dragTransferQuantity(...args){return noticesView.dragTransferQuantity(...args);}
  function centerToast(...args){return noticesView.centerToast(...args);}
  // 顶部小横幅：不挡死当前弹窗的醒目提示（自动消失，比 centerToast 停留更久、更明显）
  
  function floatingNotice(...args){return noticesView.floatingNotice(...args);}
  // 首次交易/制作批量说明：账号级只提示一次；用 floatingNotice 不挡死原操作。
  function maybeBatchTip(...args){return noticesView.maybeBatchTip(...args);}
  function addLog(...args){return noticesView.addLog(...args);}
  // ⚠️ 日志栏只靠 onLog 事件往里追加，而"建界面之前"发生的日志（开新局的第 1 条、读档前发生的一切）
  //    会因为 #logbody 还不存在而被直接丢掉（addLog 里 `if (!box) return`）。
  //    结果就是：开新局/读档进来，日志栏是空的，可 S.log 里明明存着 200 条历史。
  //    这里在界面搭好之后，把 S.log 倒着（它是最新在前）补画一遍，和 addLog 的追加顺序一致。
  function replayLog(...args){return noticesView.replayLog(...args);}
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
  function skinOn(...args){return artView.skinOn(...args);}
  function saveSkins(...args){return artView.saveSkins(...args);}
  function applySkin(...args){return artView.applySkin(...args);}
  function enableSkin(...args){return artView.enableSkin(...args);}
  function clearSkins(...args){return artView.clearSkins(...args);}
  function skinName(...args){return artView.skinName(...args);}
  function islandMapPath(...args){return artView.islandMapPath(...args);}
  
  
  function sceneImagePath(...args){return artView.sceneImagePath(...args);}
  function mapImagePath(...args){return artView.mapImagePath(...args);}
  function baseMapImagePath(...args){return artView.baseMapImagePath(...args);}
  function atlantisVisualArrows(...args){return artView.atlantisVisualArrows(...args);}
  // ---------- 人物立绘（受皮肤包控制）----------
  // 取"第一个开着、且自带 portrait 目录"的皮肤；一个都没开就用默认那套。
  function portraitPath(...args){return artView.portraitPath(...args);}
  // 皮肤包里缺这张图 → 自动退回默认那套；默认也没有 → 直接隐藏（避免裂图）
  window.__portraitFail = function (img, id) {
    if (img.dataset.fb) { img.style.display = 'none'; return; }
    img.dataset.fb = '1';
    img.src = `assets/img/identities/${id}.png?v=${(typeof window !== 'undefined' && window.BUILD_VER) || '1'}`;
  };

  // ---------- 日志栏显示方式（设置里可改，存在本机、跨存档） ----------
  let logMode = (() => { try { const v = localStorage.getItem('guyuyizhang_logmode'); return ['always', 'fade', 'hidden'].includes(v) ? v : 'hidden'; } catch (e) { return 'hidden'; } })();
  let logFadeTimer = null;
  function applyLogMode(...args){return hudView.applyLogMode(...args);}
  function setLogMode(...args){return hudView.setLogMode(...args);}
  // 日志栏：尺寸三档 + 收起/展开（都记在本机）
  const LOG_WIDTHS = { tiny:110, narrow: 190, mid: 250, wide: 330 };
  // 日志栏宽度三档：默认「窄」（作者 2026-09-21）。**只在没设置过时**用窄，
  // 玩家已经选过 wide/mid 的偏好照旧（不能被这次改默认覆盖）。
  let logSize = (() => { try { const v = localStorage.getItem('guyuyizhang_logw'); return LOG_WIDTHS[v] ? v : 'narrow'; } catch (e) { return 'narrow'; } })();
  let logCollapsed = (() => { try { return localStorage.getItem('guyuyizhang_logcollapse') === '1'; } catch (e) { return false; } })();
  // 营地里的「当前目标」提示：作者 2026-09-19 加开关（本机偏好，存 localStorage）
  let showObjective = (() => { try { return localStorage.getItem('guyuyizhang_obj') === '1'; } catch (e) { return false; } })();
  let sceneScroll=(()=>{try{return localStorage.getItem('guyuyizhang_scene_scroll')!=='0';}catch(e){return true;}})();
  function setShowObjective(...args){return hudView.setShowObjective(...args);}
  function logWidthFor(...args){return hudView.logWidthFor(...args);}
  function setLogSize(...args){return hudView.setLogSize(...args);}
  function applyLogCollapse(...args){return hudView.applyLogCollapse(...args);}
  function bindLogCollapseBtn(...args){return hudView.bindLogCollapseBtn(...args);}
  function alignLogGrip(...args){return hudView.alignLogGrip(...args);}
  function renderObjective(...args){return hudView.renderObjective(...args);}

  // ---------- 主渲染 ----------
  function render(...args){return renderView.render(...args);}
  // ⚠️ 玩家反馈"上午还好好的，下午一开就一直闪退"。手机 WebView 里的"闪退"通常是页面抛异常
  //    或者被系统判定内存吃紧后杀掉。纯前端游戏最怕的是：读档后某一步抛异常 → **每次打开都崩**，
  //    玩家再也进不去、还没法导出存档。所以这里加一道自检：
  //    ① 把最后一次报错留在本机  ② 数"连续几次启动没走到渲染成功"  ③ 连着崩就把玩家放进安全模式。
  
  
  function lsGet(...args){return renderView.lsGet(...args);}
  function lsSet(...args){return renderView.lsSet(...args);}
  function recordError(...args){return renderView.recordError(...args);}
  function bootCrashes(...args){return renderView.bootCrashes(...args);}
  function noteBootStart(...args){return renderView.noteBootStart(...args);}
  function noteBootOk(...args){return renderView.noteBootOk(...args);}
  // ⚠️ 以前 noteBootOk() 只在"进入游戏主界面"时才调，于是"只打开标题页就退出"也被当成崩溃 ——
  //    玩家反馈"什么叫刷新一次就启动异常，太频繁了"（安全模式误报）。
  //    现在分成两个计数：① 启动崩溃（连标题页都没出来）② 进游戏后崩溃（读档就崩那种）。
  function inGameCrashes(...args){return renderView.inGameCrashes(...args);}
  function noteInGameCrash(...args){return renderView.noteInGameCrash(...args);}
  function clearInGameCrash(...args){return renderView.clearInGameCrash(...args);}
  function onRenderCrash(...args){return renderView.onRenderCrash(...args);}
  window.addEventListener('error', (e) => { recordError((e && (e.message || (e.error && e.error.message))) || 'error'); });
  window.addEventListener('unhandledrejection', (e) => { recordError((e && e.reason && (e.reason.message || e.reason)) || 'rejection'); });
  function renderInner(...args){return renderView.renderInner(...args);}
  

  // ---------- 动作动画（采集/建造/制造/攻击）+ 二倍速 ----------
  
  let animSpeed = (() => { try { const v = parseInt(localStorage.getItem('guyuyizhang_anim') || '1', 10); return (v >= 1 && v <= 3) ? v : 1; } catch (e) { return 1; } })();
  let restHours = (() => { try { const v = parseInt(localStorage.getItem('guyuyizhang_rest') || '1', 10); return (v >= 1 && v <= 3) ? v : 1; } catch (e) { return 1; } })();   // 休息时长：1→2→3 循环
  let uiBusy = false;
  
  
  
  
  // ---------- 内联 SVG 动画图案（可选兜底）----------
  // 采集三件套（石镐 pick / 手摘浆果 berry_pick / 木勺舀水 water_ladle）已改为正式 PNG 素材，
  // 走下面的 assets/img/anim/<name>.png 通道，与斧/锤/剑同一套画风，不再内联自绘。
  // 这个表保留为空：将来某个图案暂时没有 PNG 时，可以临时在这里塞一段 data-URI 顶上。
  
  // 少数点位名和图标不是字面匹配（既不是"石/矿"也不是"网"），正则兜不住，这里点名指定。
  // 其余点位仍走下面的关键词判定，别把这张表越写越大。
  
  function showBusy(...args){return actionAnimationView.showBusy(...args);}
  function hideBusy(...args){return actionAnimationView.hideBusy(...args);}
  function withAnimation(...args){return actionAnimationView.withAnimation(...args);}

  function renderTopbar(...args){return hudView.renderTopbar(...args);}

  // ---------- 地图视图（带缓存：底图只加载一次，箭头动态刷新） ----------
  
  let mapPanY = 0;            // 大地图上下平移（像素）
              // 大地图左右平移（恒为 0：宽度已经和屏幕一致，横向锁死）
  
  // ---------- 大地图的尺寸规则（作者 2026-09-15 最终定调）----------
  // 【宽度 = 屏幕宽度】（手机 / 平板 / 电脑一视同仁），高度按原图比例算出来，
  //  多出来的部分靠上下拖动看。横向锁死（不留横向拖动，也不会左右裁掉内容）。
  //  ⛔ 以前用的是 cover（等比放大到"盖住整屏"）：为了让高度也铺满，图片被放得比屏幕宽，
  //     左右两边就被裁掉了 —— 玩家看到的正是"地图没显示完全"。现在不用那套了。
  function mapBox(...args){return mapView.mapBox(...args);}
  // ---------- 铺满（cover）：图片铺满舞台，热点层跟着同一套坐标缩放 ----------
  // 舞台现在吃满整个画面区（不再固定 16:9），所以图片一律按"铺满 + 可上下拖"来摆：
  // 图片内容盒 = 等比缩放到盖住舞台，多出来的纵向部分靠拖动看，热点/箭头始终贴在画面上。
  function coverBox(...args){return mapView.coverBox(...args);}
  function applyBox(...args){return mapView.applyBox(...args);}
  // 只更新位置（拖动时每帧走这里，不做昂贵的贴边重排）
  function applyMapPan(...args){return mapView.applyMapPan(...args);}
  function fitMapArrowsToImage(...args){return mapView.fitMapArrowsToImage(...args);}
  // 热点和建筑始终使用原图坐标。关闭滑动仅等比裁切，营地取偏下的建筑区域。
  let scenePanY = 0;
  function applyScenePan(...args){return mapView.applyScenePan(...args);}
  function fitSceneLayers(...args){return mapView.fitSceneLayers(...args);}
  // 上下拖动（地图 / 场景共用）：按住画面空白处拖，按热点和按钮不算拖动
  function bindPan(...args){return mapView.bindPan(...args);}
  function bindMapPan(...args){return mapView.bindMapPan(...args);}
  // 日志：可以上下滑看历史，但优先级低于热点/箭头
  //   1) 按到"日志下面的热点/箭头"→ 把这一下转发给它
  //   2) 日志自己有内容可滚 → 交给浏览器原生滚动
  //   3) 没得滚 → 拖着直接带动地图/场景平移（等于以前"日志不挡地图"）
  function bindLogGrip(...args){return mapView.bindLogGrip(...args);}
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
  function fitMapArrowsInView(...args){return mapView.fitMapArrowsInView(...args);}
  // ---------- 进地图：自动居中到"你现在所在的地方" ----------
  // 作者要求：进地图一定要自动居中（从营地出来就该看到营地），但**不许突破地图边界**——
  //   拖出黑边那种事不能干。所以：先算出"把锚点放到舞台正中"需要的平移量，
  //   再夹到"整张图仍然盖满舞台"的范围里。地图本身不够大时（宽屏上纵向常常只多几十像素），
  //   就居中到能居中的极限，锚点保证在画面里，绝不会出现空白。
  
  function centerMapOnHere(...args){return mapView.centerMapOnHere(...args);}
  function tryCenterMap(...args){return mapView.tryCenterMap(...args);}
  function renderMap(...args){return mapView.renderMap(...args);}
  // 地图上的建筑精灵：建造了才出现，升级就换更高等级（mix-blend 混合进底图）
  function renderBuildings(...args){return mapView.renderBuildings(...args);}
  // 营地场景：建造后显现的建筑精灵（尺寸按背景实际宽度百分比，随放大一起缩放）
  function renderCampBuildings(...args){return mapView.renderCampBuildings(...args);}
  // 营地场景：建造后显现的建筑精灵（尺寸按背景实际宽度百分比，随放大一起缩放）
  function refreshMapArrows(...args){return mapView.refreshMapArrows(...args);}

  // ---------- 舞台自适应：画面区多大，舞台就多大（铺满整个红框，左右不留黑边） ----------
  // 窄屏下「负面状态徽标条」是顶栏下方的浮层（style.css 里 position:fixed + top:33px），
  // 而 #objective（当前目标）也是绝对定位、默认贴在舞台左上角 10px 处 —— 徽标多的时候
  // 正好把「当前目标」那一行压住（实测 667×375 上「精神恍惚」就压在上面）。
  // 这里量一下浮条的实际高度，把目标整体往下让开：
  //   · 桌面端徽标内联在顶栏里（position 不是 fixed）→ 返回 0，布局与改动前完全一致；
  //   · 没有徽标时返回 0 → 目标不会被无谓地推下去。
  function badgeStripH(...args){return mapView.badgeStripH(...args);}

  function fitStage(...args){return mapView.fitStage(...args);}
  window.addEventListener('resize', () => { fitStage(); if (roomView && S()) renderRoomScene(S()); });   // 房间底图保持原节点，窗口变化时只校准家具尺寸

  // ---------- 大地图旅行动画（虚线连线 + 白点匀速移动，到达后落地） ----------
  let traveling = false;
  // 下潜/传送前先判定，别"播完动画才说下不去"（作者 2026-09-22）：
  // 以前 UI 先跑 atlantisTravelAnim()，Game.travel() 的检查在动画回调里才执行，
  // 于是没穿潜水服的玩家要看完整段下潜动画，才被告知上不去。
  function diveGateThen(...args){return travelView.diveGateThen(...args);}
  function atlantisTravelAnim(...args){return travelView.atlantisTravelAnim(...args);}
  function zoneTravelAnim(...args){return travelView.zoneTravelAnim(...args);}
  function startAtlantisTravel(...args){return travelView.startAtlantisTravel(...args);}
  // 行进动画期间把日志淡出：地图左下角（含行进线的起点）会被日志盖住，
  // 盖住就看不出"从一个热点走到另一个热点"。动画结束自动恢复。
  function beginTravelFx(...args){return travelView.beginTravelFx(...args);}
  function endTravelFx(...args){return travelView.endTravelFx(...args);}
  // 取某个箭头"glyph 尖端"的容器内坐标（向下 ▼ 的底边中点；返回孤岛那个是 ▲，取顶边中点）。
  // 用 data-zone / data-scene 精确定位，不再靠坐标模糊匹配——模糊匹配一旦对不上就会静默退回
  // "按百分比估算"，线就从箭头旁边出发，看起来"差一段"。
  function tipAnchor(...args){return travelView.tipAnchor(...args);}
  function animAtlantis(...args){return travelView.animAtlantis(...args);}
  // 建行进层：坐标必须用【屏幕坐标系】，不能直接用箭头的容器坐标。
  // 因为地图比画面宽/高时，#map-arrows 会伸出画面外（left/top 为负），
  // 而 SVG 是按元素盒渲染的 —— 直接塞进去线会整体偏移（手机竖屏能偏几百像素），
  // 看起来就像"行进轨迹从别的地方过来的"。加上容器的偏移就对齐了。
  // fromKey/toKey 用来做闭环校正：实测"线端点 vs 箭头尖"的偏差并整体平移（保持线的方向不变）
  function makeTravelLayer(...args){return travelView.makeTravelLayer(...args);}
  function startTravel(...args){return travelView.startTravel(...args);}

  // ---------- 场景视图（带缓存：同一场景不重建 DOM，避免图片反复解码闪烁） ----------
  let lastSceneKey = null;
  // 场景图预取：手机端切场景"等图"最明显。当前场景稳定后，用空闲时间把**相邻几个场景**的图先读进
  // 浏览器的缓存/解码表（只取少数邻居，不把 20 张图全塞内存——之前"内存被杀"的教训）。
  
  function prefetchScenes(...args){return sceneView.prefetchScenes(...args);}
  const PAPER_FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#d9d4c4"/><text x="640" y="340" font-size="38" text-anchor="middle" fill="#343126">场景图片暂时无法载入</text><text x="640" y="400" font-size="23" text-anchor="middle" fill="#555044">仍可使用地图与场景按钮，重新进入此场景可重试</text></svg>');
  function renderScene(...args){return sceneView.renderScene(...args);}
  function renderAtlantisBuildings(...args){return sceneView.renderAtlantisBuildings(...args);}
  const ATL_SHOP = [ { id:'deepCoral', base:10 }, { id:'pearlGranule', base:6 }, { id:'sourceOre', base:40 }, { id:'sourceBar', base:260 }, { id:'anctDevice', base:120 }, { id:'atlantisCore', base:300 } ];
  // 遗失的交易机 · 售卖的亚特兰蒂斯装备图纸（按阶递增）
  const ATL_BUY = [
    { id:'bpCoralBlade', base:260, kind:'bp' },
    { id:'bpCoralArmor', base:320, kind:'bp' },
    { id:'bpThruster', base:480, kind:'bp' },
  ];
  function repairModal(...args){return atlantisView.repairModal(...args);}
  function atlTradeModal(...args){return atlantisView.atlTradeModal(...args);}
  // 神秘鱼人 · 只以物换物（不收贝壳），复用 help-list / help-item / mini-btn 版画风弹窗
  function fishmanModal(...args){return atlantisView.fishmanModal(...args);}
  function atlantisCampModal(...args){return atlantisView.atlantisCampModal(...args);}
  
  
            // 关1 记忆
              // 关2 配对
                                              // 关3 点灯
  function startRunePuzzle(...args){return runePuzzleView.startRunePuzzle(...args);}
  function nextStage(...args){return runePuzzleView.nextStage(...args);}
  function finishRune(...args){return runePuzzleView.finishRune(...args);}
  function initStage1(...args){return runePuzzleView.initStage1(...args);}
  function initStage2(...args){return runePuzzleView.initStage2(...args);}
  function toggleLight(...args){return runePuzzleView.toggleLight(...args);}
  function initStage3(...args){return runePuzzleView.initStage3(...args);}
  function renderRuneModal(...args){return runePuzzleView.renderRuneModal(...args);}
  function playRuneSeq(...args){return runePuzzleView.playRuneSeq(...args);}
  function bindRune(...args){return runePuzzleView.bindRune(...args);}
  function pointWorkSummary(...args){return sceneView.pointWorkSummary(...args);}
  function renderHotspots(...args){return sceneView.renderHotspots(...args);}

  // ---------- 行动面板 ----------
  // 结局「结算」按钮（作者 2026-09-23 从右下角搬进「装备 → 属性」的人物立绘下方）。
  // 为什么搬：这批按钮**不跟场景绑定** —— 只要某个结局"已达成但没结算"，它连大地图都会挂出来，
  // 常年压住右下角画面（作者原话："放这里有点遮挡"）。
  // 搬走的只有「结算」；「达成」按钮仍留在右下角，因为它跟当前场景相关、且只在满足条件时出现。
  // ⚠️ 数据源仍然是 Game.checkEndingActions()（那是"本存档该显示哪些结局入口"的唯一真相），
  //    这里只做一次前缀过滤，避免在 game.js 里多养一份会跑的名单。
  function settleActions(...args){return sceneView.settleActions(...args);}

  // ⚠️ 这里原来有个 renderActions()，往 $('#actions') 里塞按钮 —— 但页面里根本没有 #actions 这个元素
  //    （真实容器是 #scene-actions，由下面的 renderExtras() 负责），而且这个函数从来没有被调用过。
  //    属于纯死代码（调用即报错），已删除。
  function renderExtras(...args){return sceneView.renderExtras(...args);}

  function sceneActions(...args){return sceneView.sceneActions(...args);}

  function sleepModal(...args){return restView.sleepModal(...args);}
  function napRec(...args){return restView.napRec(...args);}
  function renderHeirloom(...args){return progressionView.renderHeirloom(...args);}
  function devpwModal(...args){return progressionView.devpwModal(...args);}
  // 救援面板：把本机所有还能读出来的存档痕迹列出来，挑一份恢复
  function rescueModal(...args){return progressionView.rescueModal(...args);}
  function renderBackup(...args){return progressionView.renderBackup(...args);}
  
  function comHelpModal(...args){return progressionView.comHelpModal(...args);}
  function skillBody(...args){return progressionView.skillBody(...args);}
  function skillModal(...args){return progressionView.skillModal(...args);}
  // ---------- 技能树（树状图：主干竖着一串，专项从两侧伸出来）----------
  // 作者 2026-09-18：要的就是"从上往下一串基础升级，两侧延伸专项升级，大量互斥"的树状图。
  // 布局：每一级一行（三栏：左侧专项 | 中间主干节点 | 右侧专项），主干用一条竖线串起来，
  //       专项节点按 need（需要主干几级）挂到对应行，互斥的一对强制分居左右、中间画红色虚线。
  function stNodeCard(...args){return skillsView.stNodeCard(...args);}
  function skillTreeModal(...args){return skillsView.skillTreeModal(...args);}
  // 商店清单统一入口：批量弹窗和"确定"结算都用它，避免两处各写一份导致货架对不上
  // ⚠️ 这里原来把四家店硬编码成 if/else，加了「美食家」之后默认分支会把它吞成杂货商 ——
  //    改成"TOWN 里有就直接按摊位 id 取"，以后再加店铺不用回来改这里。
  function shopBuyList(...args){return tradingView.shopBuyList(...args);}
  function shopSellList(...args){return tradingView.shopSellList(...args);}
  function batchnModal(...args){return batchTransferView.batchnModal(...args);}
  function batchModal(...args){return batchTransferView.batchModal(...args);}
  function campActions(...args){return campView.campActions(...args);}
  function sleepRec(...args){return restView.sleepRec(...args);}
  function bedDesc(...args){return restView.bedDesc(...args);}
  function matsOk(...args){return campView.matsOk(...args);}

  // ---------- 营地管理（建造） ----------
  function renderCamp(...args){return campView.renderCamp(...args);}
  function renderCampHelp(...args){return campView.renderCampHelp(...args);}
  // 牧场面板：鸡舍 / 羊圈的牲畜、饲料与自动喂食
  function livestockModal(...args){return livestockFarmView.livestockModal(...args);}
  
  function roomFurniture(...args){return campView.roomFurniture(...args);}
  function roomAction(...args){return campView.roomAction(...args);}
  function runRoomAction(...args){return campView.runRoomAction(...args);}
  
  function renderRoomScene(...args){return campView.renderRoomScene(...args);}
  function campModal(...args){return campView.campModal(...args);}
  function missingReason(...args){return campView.missingReason(...args);}
  function buildBtn(...args){return campView.buildBtn(...args);}
  // 建造/升级需要的材料：**写全名**（以前只显示一个字 + 数量，例如"板4 石4"，玩家看不出是什么）。
  // 顺带带上"已有/需要"，材料够不够一眼就看得出来。
  function matsStr(...args){return campView.matsStr(...args);}
  function furnitureCount(...args){return campView.furnitureCount(...args);}

  // ---------- 共用管理面板：结构与玩法渲染分离 ----------
  function playerPanelTabs(...args){return playerPanelsView.playerPanelTabs(...args);}
  function layoutWorkModal(...args){return playerPanelsView.layoutWorkModal(...args);}
  
  function craftGroupOf(...args){return playerPanelsView.craftGroupOf(...args);}
  // ---------- 制造 ----------
  function renderCraft(...args){return playerPanelsView.renderCraft(...args);}
  function stationBuilt(...args){return playerPanelsView.stationBuilt(...args);}
  function stationFamily(...args){return playerPanelsView.stationFamily(...args);}

  // ---------- 背包 ----------
  let invCat = 'all', warehouseCat='all';
  function catOf(...args){return playerPanelsView.catOf(...args);}
  function renderInventory(...args){return playerPanelsView.renderInventory(...args);}
  let equipTab = 'p1';
  function warehouseModal(...args){return playerPanelsView.warehouseModal(...args);}
  function showBuffInfo(...args){return playerPanelsView.showBuffInfo(...args);}
  function buffInfoModal(...args){return playerPanelsView.buffInfoModal(...args);}
  function equipmentNumbers(...args){return playerPanelsView.equipmentNumbers(...args);}
  function loadoutOverview(...args){return playerPanelsView.loadoutOverview(...args);}
  function equipmentPickModal(...args){return playerPanelsView.equipmentPickModal(...args);}
  function renderEquip(...args){return playerPanelsView.renderEquip(...args);}
  function bindCellarControls(...args){return playerPanelsView.bindCellarControls(...args);}
  function freshnessCards(...args){return playerPanelsView.freshnessCards(...args);}
  function itemUseButtons(...args){return playerPanelsView.itemUseButtons(...args);}
  function itemDetail(...args){return playerPanelsView.itemDetail(...args);}

  // ---------- 交易 ----------
  let laoTab = 'buy';
  // 交易面板顶部的"钱包"：玩家反馈买卖时看不到自己身上有多少钱（老潮是最常被问的）
  function walletBar(...args){return tradingView.walletBar(...args);}
  function laochaoModal(...args){return tradingView.laochaoModal(...args);}
  function laochaoTab(...args){return tradingView.laochaoTab(...args);}

  // ⚠️ 记住当前在哪个摊位：买/卖之后 UI 会整块重建（showModal('town')），
  //    如果这里不记住，玩家在铁匠/情报贩子买一件东西就被弹回杂货商，得重新点一次摊位。
  let activeMerchant=null, merchantLine=0, merchantTrades=0;
  let townShopNow = 'grocer';
  function townModal(...args){return tradingView.townModal(...args);}
  function townShop(...args){return tradingView.townShop(...args);}

  function blackModal(...args){return tradingView.blackModal(...args);}

  function missionModal(...args){return tradingView.missionModal(...args);}

  function infoModal(...args){return tradingView.infoModal(...args);}

  // ---------- 战斗 ----------
  let fightSeq = 0, battleView = null;
  // 战斗记录随存档保存；读档、同步或界面重建后必须同时恢复战场。
  function restoreCombatView(...args){return combatView.restoreCombatView(...args);}
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
  function renderCombat(...args){return combatView.renderCombat(...args);}
  let mailTab = 'mail';
  // ---------- 设置面板（主界面和游戏内菜单共用） ----------
  // 赶路遇袭开关：读当前存档的设置（没开局默认开）
  function roadAmbushOn(...args){return settingsView.roadAmbushOn(...args);}
  document.addEventListener('guyu-backup-notice',e=>centerToast(String(e.detail||'')));
  function backupSummary(...args){return settingsView.backupSummary(...args);}
  function downloadBackup(...args){return settingsView.downloadBackup(...args);}
  function settingsModal(...args){return settingsView.settingsModal(...args);}
  // ---------- 每日晨报：牧场消耗/产量 + 陷阱情况 ----------
  function dailyReportModal(...args){return reportsView.dailyReportModal(...args);}

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
  function winterModal(...args){return reportsView.winterModal(...args);}

  // ---------- 每日签到 ----------
  function signModal(...args){return settingsView.signModal(...args);}
  // Menu and mailbox share the same compact guide pages.
  let guidePage = 0;
  function guideContent(...args){return settingsView.guideContent(...args);}
  function guideModal(...args){return settingsView.guideModal(...args);}

  function adAvailable(...args){return settingsView.adAvailable(...args);}
  function watchAd(...args){return settingsView.watchAd(...args);}
  function adShopModal(...args){return settingsView.adShopModal(...args);}
  function mailboxModal(...args){return settingsView.mailboxModal(...args);}
  // 敌人一条血条该显示什么：名字 + 意图标签 + 血量数字（抽出来给"首建"和"原地更新"共用）
  function tgNameHtml(...args){return combatView.tgNameHtml(...args);}
  function tgPct(...args){return combatView.tgPct(...args);}
  function tgHpText(...args){return combatView.tgHpText(...args);}
  function battleId(...args){return combatView.battleId(...args);}
  function battleName(...args){return combatView.battleName(...args);}
  function battleTarget(...args){return combatView.battleTarget(...args);}
  function paintTargetRows(...args){return combatView.paintTargetRows(...args);}
  
  function updateCombat(...args){return combatView.updateCombat(...args);}
  function battlePanel(...args){return combatView.battlePanel(...args);}
  function battleClick(...args){return combatView.battleClick(...args);}
  function showMedPicker(...args){return combatView.showMedPicker(...args);}

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
  function askConfirm(...args){return combatView.askConfirm(...args);}
  function brokenWeaponRows(...args){return dialogsView.brokenWeaponRows(...args);}
  function prepareMerchant(...args){return dialogsView.prepareMerchant(...args);}
  function showModal(...args){return dialogsView.showModal(...args);}
  function bindModal(...args){return dialogsView.bindModal(...args);}
     // 背包列表的滚动位置：用完/看完东西回来时保留，不用重新翻
  let inventoryReturn='inv',inventoryDualScroll=[0,0];
  function openItemDetail(...args){return dialogsView.openItemDetail(...args);}
  function restoreInvScroll(...args){return dialogsView.restoreInvScroll(...args);}
  // 用掉一个之后：还有就留在这一页接着用（不重新翻背包），没了才回列表
  function afterItemUse(...args){return dialogsView.afterItemUse(...args);}
  function bindItemDetail(...args){return dialogsView.bindItemDetail(...args);}
  function closeModal(...args){return dialogsView.closeModal(...args);}
  function backModal(...args){return dialogsView.backModal(...args);}
  function showNextPendingPanel(...args){return dialogsView.showNextPendingPanel(...args);}
  function rerenderEquip(...args){return dialogsView.rerenderEquip(...args);}
  function rerenderCraft(...args){return dialogsView.rerenderCraft(...args);}
  function renderTut(...args){return tutorialView.renderTut(...args);}
  // 引导第 0 步 → 第 1/2 步：玩家打开过一次【背包】就算看过。
  // 已经自带工具（多半是身份初始装备）就直接跳到"去装备"，别让人再白做一把。
  function tutAfterBag(...args){return tutorialView.tutAfterBag(...args);}

  // ---------- 耕地 ----------
  function farmModal(...args){return livestockFarmView.farmModal(...args);}
  function bindFarm(...args){return livestockFarmView.bindFarm(...args);}

  // ---------- 日记 / 图鉴 ----------
  function diaryModal(...args){return collectionView.diaryModal(...args);}
  
  
  
  let colTab = 'items';
  function collectionModal(...args){return collectionView.collectionModal(...args);}
  function colTool(...args){return collectionView.colTool(...args);}
  function colItems(...args){return collectionView.colItems(...args);}
  function itemInfoModal(...args){return collectionView.itemInfoModal(...args);}
  // 充能与抽奖独立结算；界面选项不写入存档。
  
  let lotteryLast=null, lotteryTimer=null;
  function lotteryIds(...args){return lotteryView.lotteryIds(...args);}
  function lotteryNormalize(...args){return lotteryView.lotteryNormalize(...args);}
  function lotteryModal(...args){return lotteryView.lotteryModal(...args);}
  function lotteryPickModal(...args){return lotteryView.lotteryPickModal(...args);}
  function lotteryPoolModal(...args){return lotteryView.lotteryPoolModal(...args);}
  function lotteryResultModal(...args){return lotteryView.lotteryResultModal(...args);}
  function revealLottery(...args){return lotteryView.revealLottery(...args);}
  function bindLottery(...args){return lotteryView.bindLottery(...args);}
  function colMon(...args){return collectionView.colMon(...args);}
  function colRec(...args){return collectionView.colRec(...args);}
  function colBoss(...args){return collectionView.colBoss(...args);}
  function colAch(...args){return collectionView.colAch(...args);}

  // ---------- 结局 ----------
  // ---------- 通关分享图（作者 2026-09-24）----------
  // 把这一局渲染成一张 1080×1620 的竖版图，方便发论坛 / 评论区。
  // ⚠️ 关键取舍：**不依赖任何外部图片也能出图**。file:// 下 drawImage 会把 canvas 标记成
  //    "被污染"，之后 toDataURL 直接抛 SecurityError。所以策略是：
  //      ① 先用纯排版 + 画布自带纹理画一张（永远可用）；
  //      ② 结局插画能安全画上就画，drawImage/toBlob 一旦抛异常就**退回①**，绝不让按钮点了没反应。
  
  function _wrapLines(...args){return endingsShareView._wrapLines(...args);}
  function buildShareCard(...args){return endingsShareView.buildShareCard(...args);}
  function shareModal(...args){return endingsShareView.shareModal(...args);}
  function showEnding(...args){return endingsShareView.showEnding(...args);}
  // 上一次选择：进游戏/读档时都会同步，重新开始时就不会莫名其妙变回渔夫
  let lastIdentity = (() => { try { return localStorage.getItem('guyuyizhang_identity') || 'fisher'; } catch (e) { return 'fisher'; } })();
  let lastDifficulty = (() => { try { return localStorage.getItem('guyuyizhang_difficulty') || 'normal'; } catch (e) { return 'normal'; } })();
  function rememberIdentity(...args){return titleView.rememberIdentity(...args);}

  // ---------- 标题 / 开局 ----------
  function showTitle(...args){return titleView.showTitle(...args);}
  
  function showJourneySelect(...args){return titleView.showJourneySelect(...args);}
  function showIdentity(...args){return titleView.showIdentity(...args);}
  function showDifficulty(...args){return titleView.showDifficulty(...args);}
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
  function showComicIntro(...args){return titleView.showComicIntro(...args);}
  function begin(...args){return startupView.begin(...args);}

  // ---------- 初始化 ----------
  // 全局"咔哒"声：所有按钮/标签/热点/地图箭头，确认点击后给一次交互反馈（45ms 内不叠音）
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
  PressInput.install(document);
  document.addEventListener('click', (e) => {
    const t = (e.target && e.target.closest) ? e.target.closest('button, .mini-btn, .tab, .hotspot, .map-arrow, .action-btn, [data-choice]') : null;
    if (!t || t.disabled || t.classList.contains('lockedb') || t.classList.contains('locked')) return;
    const now = Date.now();
    if (now - _lastClickAt < 45) return;
    _lastClickAt = now;
    try { AudioFX.play('click'); } catch (err) {}
  }, true);

  function init(...args){return startupView.init(...args);}
  // 安全模式：连着两次启动都没成功 → 大概率是"某份存档/某个状态一进来就崩"。
  // 给玩家一个出口：看到报错、救出存档码、用上一次的备份存档继续。
  function showSafeMode(...args){return startupView.showSafeMode(...args);}
  // 原生壳只调用这两个明确接口，不直接修改场景、装备或存档字段。
  function setHostSuspended(...args){return startupView.setHostSuspended(...args);}
  function handleBack(...args){return startupView.handleBack(...args);}
  return { init, showTitle, begin, render, setHostSuspended, handleBack };
})();

UI.init();
