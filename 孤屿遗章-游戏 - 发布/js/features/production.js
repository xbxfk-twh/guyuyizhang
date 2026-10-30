/* production：业务规则的唯一实现；Game 保留调用接口与装配。 */
const ProductionRules = (() => {
  function create(deps) {
    const gameState=deps.gameState;
    const rnd=(...args)=>deps.rnd(...args);
    const chance=(...args)=>deps.chance(...args);
    const log=(...args)=>deps.log(...args);
    const change=(...args)=>deps.change(...args);
    const invCount=(...args)=>deps.invCount(...args);
    const hasItem=(...args)=>deps.hasItem(...args);
    const knowsBlueprint=(...args)=>deps.knowsBlueprint(...args);
    const notifyBagFull=(...args)=>deps.notifyBagFull(...args);
    const foodLots=(...args)=>deps.foodLots(...args);
    const syncFood=(...args)=>deps.syncFood(...args);
    const addItem=(...args)=>deps.addItem(...args);
    const durList=(...args)=>deps.durList(...args);
    const durMaxOf=(...args)=>deps.durMaxOf(...args);
    const durSync=(...args)=>deps.durSync(...args);
    const removeItem=(...args)=>deps.removeItem(...args);
    const selectedTool=(...args)=>deps.selectedTool(...args);
    const drainTool=(...args)=>deps.drainTool(...args);
    const capUsed=(...args)=>deps.capUsed(...args);
    const capacity=(...args)=>deps.capacity(...args);
    const settleStoredFood=(...args)=>deps.settleStoredFood(...args);
    const warehouseSite=(...args)=>deps.warehouseSite(...args);
    const stackSize=(...args)=>deps.stackSize(...args);
    const warehouseAccess=(...args)=>deps.warehouseAccess(...args);
    const warehouseCapacity=(...args)=>deps.warehouseCapacity(...args);
    const cellarBuilt=(...args)=>deps.cellarBuilt(...args);
    const cellarAccess=(...args)=>deps.cellarAccess(...args);
    const hasTool=(...args)=>deps.hasTool(...args);
    const addMin=(...args)=>deps.addMin(...args);
    const gainItem=(...args)=>deps.gainItem(...args);
    const coopCap=(...args)=>deps.coopCap(...args);
    const liveState=(...args)=>deps.liveState(...args);
    const sceneOf=(...args)=>deps.sceneOf(...args);
    const staminaCost=(...args)=>deps.staminaCost(...args);
    const nodeLv=(...args)=>deps.nodeLv(...args);
    const cxTimeMul=(...args)=>deps.cxTimeMul(...args);
    const cxRefundChance=(...args)=>deps.cxRefundChance(...args);
    const cxExtraChance=(...args)=>deps.cxExtraChance(...args);
    const cxDurMul=(...args)=>deps.cxDurMul(...args);
    const awardExperience=(...args)=>deps.awardExperience(...args);
    const expLevel=(...args)=>deps.expLevel(...args);
    const diaryAdd=(...args)=>deps.diaryAdd(...args);
    const metaBonus=(...args)=>deps.metaBonus(...args);
    const longActWarn=(...args)=>deps.longActWarn(...args);
    const hpMax=(...args)=>deps.hpMax(...args);
var WOOD_MATS = { wood:1, plank:1, branch:1, bamboo:1, shipwood:1, pole:1 };

var WOOD_MUL = 0.8, OTHER_MUL = 1.1;

const MAT_TRIM_MIN = 5;

var _recipeMatsAdjusted = false;

function adjustRecipeMats() {
    if (_recipeMatsAdjusted) return;   // 幂等：重复调用会二次打折
    _recipeMatsAdjusted = true;
    // ⚠️ **食物/料理配方不参与**：这一轮要解决的是"后期建造太吃木头"，
    //    料理的配方是 2026-09-22「加料不加数值」那轮专门定过的门槛（盐/野菜/蜂蜜），
    //    再乘一遍会把那套设计整个推翻（大煎蛋 蛋5→6、超级大蛋 蛋12→13）。
    const isFoodRecipe = (r) => Object.keys(r.out || {}).some(id => {
      const it = ITEMS[id];
      return !!(it && (it.cat === 'food' || it.cat === 'drink'));
    });
    for (const r of RECIPES) {
      if (!r || !r.in || r.fixedMats) continue;
      if (isFoodRecipe(r)) continue;
      for (const k in r.in) {
        if (r.in[k] < MAT_TRIM_MIN) continue;
        const mul = WOOD_MATS[k] ? WOOD_MUL : OTHER_MUL;
        r.in[k] = Math.max(1, Math.round(r.in[k] * mul));
      }
    }
  }

function supplyContainer(site){return site==='cellar'?gameState.run.cellar:(site==='sea'?gameState.run.atlantis?.camp:gameState.run)?.warehouse;}

function supplySites(site){return (Array.isArray(site)?site:site?[site]:[]).filter(x=>x==='cellar'?cellarBuilt():warehouseCapacity(x)>0);}

function supplyRecordsAll(site) {settleStoredFood();return supplySites(site).flatMap(x=>supplyContainer(x)?.items||[]).filter(x=>x.expiry===undefined||x.expiry>nowTick());}

function supplyRecords(id,site) {return supplyRecordsAll(site).filter(x=>x.id===id);}

function supplyCount(id,site=null) {
    const bag=ITEMS[id]?.spoil?foodLots(id).filter(x=>x.exp>nowTick()).reduce((n,x)=>n+x.qty,0):invCount(id);
    return bag+supplyRecords(id,site).reduce((n,x)=>n+x.qty,0);
  }

function takeSupply(id,n,site=null) {
    if(supplyCount(id,site)<n)return false;
    for(let i=0;i<n;i++){
      const lots=ITEMS[id]?.spoil?foodLots(id):null,bi=lots?lots.findIndex(x=>x.exp>nowTick()):-1;
      const bagExp=lots?(bi>=0?lots[bi].exp:Infinity):(invCount(id)>0?-Infinity:Infinity);
      const rows=supplyRecords(id,site),rec=rows.sort((a,b)=>(a.expiry??Infinity)-(b.expiry??Infinity))[0];
      if(rec && (bagExp===Infinity || (rec.expiry??Infinity)<bagExp)) {rec.qty--;const items=supplySites(site).map(x=>supplyContainer(x)?.items).find(x=>x?.includes(rec));if(!rec.qty)items.splice(items.indexOf(rec),1);}
      else if(lots){gameState.run.inv[id]--;if(!gameState.run.inv[id])delete gameState.run.inv[id];lots[bi].qty--;syncFood(id,lots.filter(x=>x.qty>0));}
      else removeItem(id,1);
    }
    return true;
  }

function itemUseCount(id,source=false) {
    if(!source)return invCount(id);
    if(gameState.run.combat||gameState.run.death||gameState.run.ending)return 0;
    if(source==='cellar'?!cellarAccess():!warehouseAccess())return 0;
    return supplyRecords(id,source==='cellar'?'cellar':warehouseSite()).reduce((n,r)=>n+r.qty,0);
  }

function takeUseItem(id,source=false) {
    if(itemUseCount(id,source)<1)return false;
    if(!source)return removeItem(id,1);
    const site=source==='cellar'?'cellar':warehouseSite(),rows=supplyContainer(site).items;
    const rec=supplyRecords(id,site).sort((a,b)=>(a.expiry??Infinity)-(b.expiry??Infinity))[0];
    if(!rec)return false;rec.qty--;if(!rec.qty)rows.splice(rows.indexOf(rec),1);return true;
  }

function merchantSupplySites(list) {return list===LAOCHAO.buy&&gameState.run.scene==='camp'?materialSupplySites():[];}

function merchantSellCount(id,list) {return supplyCount(id,merchantSupplySites(list));}

function materialSupplySites(){return warehouseAccess()?[warehouseSite(),...(gameState.run.scene==='camp'&&cellarBuilt()?['cellar']:[])]:[];}

function materialCount(id) {
    return supplyCount(id,materialSupplySites());
  }

function matsOk(mats) {return Object.keys(mats).every(k=>materialCount(k)>=mats[k]);}

function missingMats(mats) {return Object.keys(mats).filter(k=>materialCount(k)<mats[k]).map(k=>`${ITEMS[k].name} ${materialCount(k)}/${mats[k]}`);}

function takeMats(mats) {
    if(!matsOk(mats))return false;
    for(const k in mats) {
      takeSupply(k,mats[k],materialSupplySites());
    }
    return true;
  }

function buildChain(chainId) {
    if(chainId==='cellar'&&gameState.run.scene!=='camp'){log('地窖只能在孤岛营地建造。','warn');return;}
    if(chainId==='cellar'&&cellarBuilt()){log('地窖已经建好了。','warn');return;}
    const chain = BUILDING_CHAINS[chainId];
    const cur = gameState.run.buildings[chainId];
    const next = chain[cur + 1];
    if (!next) { log('已经升到顶了。', 'warn'); return; }
    if (next.needBp && !knowsBlueprint(next.needBp)) { log(`需要图纸：${ITEMS[next.needBp].name}。`, 'warn'); return; }
    if (!matsOk(next.mats)) { log(`材料不足：${missingMats(next.mats).join('、')}。`, 'warn'); return; }
    // 建建筑动辄几小时（草房 4 小时、远洋船 12 小时）：超过 5 小时先提醒一次（作者 2026-09-19）
    if (longActWarn(Math.round(next.time * (1 - metaBonus().craft)), `建造${next.name}`, () => buildChain(chainId))) return;
    takeMats(next.mats);
    log(`开始建造${next.name}（需 ${next.time/60} 小时）……`, 'sys');
    addMin(Math.round(next.time * (1 - metaBonus().craft)));
    gameState.run.buildings[chainId]++;
    log(`建成了：${next.name}！`, 'good');
    diaryAdd(`我建起了${next.name}。`);
    awardExperience('craft',deps.EXP_CRAFT*2);
    if (chainId === 'watch') {
      const unlocks = next.unlock || [];
      if (unlocks.length) log(`视野扩展！现在可以前往：${unlocks.map(u => sceneOf(u).name).join('、')}。`, 'good');
    }
    if (chainId === 'dock' && next.boat === 'raft') {log('木筏下水！现在可以出海了。', 'good');log('打开地图前往近海；营地的船坞用于继续升级，小船造好后才能到盐镇。','sys');}
    if (chainId === 'dock' && next.boat === 'boat') log('小船下水！对岸的盐镇可以去了。', 'good');
    change();
  }

function tailorGifted() { return !!(gameState.run.furniture && gameState.run.furniture.tailor) || gameState.run.tailorGift === 1; }

function furnitureUsed() {   // 已占家具位（床系列算1；旗帜/路标/书架/水壶/滤雨器/织布机/药炉不占位）
    const g = { wb:0, fr:0, sm:0, bed:0, single:0 };
    for (const k in gameState.run.furniture) {
      if (!gameState.run.furniture[k]) continue; // 旧档未建造/已拆除的 false 键不占位
      // 工具台（wb1/2/3）算一组；裁缝台（tailor）是**独立**家具，新造时单独占一槽。
      // 旧档赠送（S.tailorGift=1）不写进 S.furniture，所以天然不占位。
      if (['wb1','wb2','wb3'].includes(k)) g.wb = 1;
      else if (['fr1','fr2','fr3'].includes(k)) g.fr = 1;
      else if (['sm1','sm2'].includes(k)) g.sm = 1;
      else if (['bed1','bed2','bed3','bed4'].includes(k)) g.bed = 1;
      else if (!['flag','signpost','shelf','cellar','tank','rainfilter','loom','medPot','coop','pen'].includes(k)) g.single++;
    }
    return g.wb + g.fr + g.sm + g.bed + g.single;
  }

function furnTakesSlot(fid) {
    if (['wb2','wb3','fr2','fr3','sm2','bed2','bed3','bed4','rainfilter'].includes(fid)) return false;   // 升级替换不占新位
    // 旧档赠送的裁缝台（S.tailorGift=1）不占位、也不重复建造（buildFurniture 有“已经可以用了”分支兜底）
    if (fid === 'tailor' && gameState.run.tailorGift === 1) return false;
    if (['flag','signpost','shelf','cellar','tank','loom','medPot'].includes(fid)) return false;   // 在既有家具上加装的次级工位，不占家具位
    // 鸡舍/羊圈（作者 2026-09-25）：搬到**农田**去建，占的是"农田畜牧位"，不再吃住房的家具位。
    if (deps.FARM_LIVESTOCK_IDS.includes(fid)) return false;
    return true;   // 上面都没命中 → 这件要占一格
  }

function farmLiveSlots() { return (gameState.run.buildings.farm || 0) + 1; }

function farmLiveUsed() { return deps.FARM_LIVESTOCK_IDS.filter(id => gameState.run.furniture[id]).length; }

function farmLiveFree() { return Math.max(0, farmLiveSlots() - farmLiveUsed()); }

function farmLiveInfo(fid) {
    const used = farmLiveUsed(), cap = farmLiveSlots();
    return { used, cap, free: Math.max(0, cap - used), onlyFarm: deps.FARM_LIVESTOCK_IDS.includes(fid), built: !!(fid && gameState.run.furniture[fid]) };
  }

function houseSlots() { return (gameState.run.buildings.house < 0 ? 0 : (BUILDING_CHAINS.house[gameState.run.buildings.house].slots || 1)) + (gameState.run.houseExt || 0); }

function furnSlotFull(fid) { return furnTakesSlot(fid) && furnitureUsed() >= houseSlots(); }

function furnSlotInfo(fid) {
    const cap = houseSlots(), used = furnitureUsed();
    return { takes: furnTakesSlot(fid), used, cap, left: Math.max(0, cap - used) };
  }

function bedStamBonus() {
    for (const b of ['bed4','bed3','bed2','bed1']) {
      if (gameState.run.furniture[b]) { const f = FURNITURE.find(x => x.id === b); return (f && f.stamCap) || 0; }
    }
    return 0;
  }

function trainingCount(kind) {
    const n = Number(gameState.run.training && gameState.run.training[kind]);
    return Number.isFinite(n) ? Math.max(0, Math.min(16, Math.floor(n))) : 0;
  }

function trainingHp() { const n = trainingCount('run'); return Math.min(n, 6) * 5 + Math.max(0, n - 6) * 2; }

function trainingAtk() { const n = trainingCount('lift'); return Math.round((Math.min(n, 6) * 0.5 + Math.max(0, n - 6) * 0.2) * 10) / 10; }

function train(kind) {
    if (!['run','lift'].includes(kind) || gameState.run.identity !== 'trainer') return {ok:false,reason:'只有健身教练可以使用器材。'};
    if (gameState.run.scene !== 'camp') return {ok:false,reason:'请回营地锻炼。'};
    const fid = kind === 'run' ? 'treadmill' : 'dumbbell';
    if (!gameState.run.furniture[fid]) return {ok:false,reason:'还没建好对应的器材。'};
    if (trainingCount(kind) >= 16) return {ok:false,reason:'这项训练已完成 16 次。'};
    if (gameState.run.training && gameState.run.training.lastDay === gameState.run.day) return {ok:false,reason:'今天已经练过一种器材，明天再来。'};
    const energy=staminaCost(30);
    if (gameState.run.stats.stamina < energy) return {ok:false,reason:`锻炼需消耗 ${energy} 体力，先休息。`};
    if (longActWarn(360, kind === 'run' ? '跑步训练' : '哑铃训练', () => train(kind))) return {ok:false,reason:'等待确认'};
    const day = gameState.run.day, previous = kind === 'run' ? trainingHp() : trainingAtk();
    gameState.run.stats.stamina -= energy;
    addMin(360);
    if (gameState.run.death || gameState.run.ending) { change(); return {ok:false,reason:'训练中断'}; }
    gameState.run.training = gameState.run.training || {run:0,lift:0,lastDay:0};
    gameState.run.training[kind] = trainingCount(kind) + 1;
    gameState.run.training.lastDay = day;
    const gain = (kind === 'run' ? trainingHp() : trainingAtk()) - previous;
    if (kind === 'run') gameState.run.stats.hp = Math.min(hpMax(), gameState.run.stats.hp + gain);
    log(`${kind === 'run' ? '跑步' : '哑铃'}训练完成（第 ${gameState.run.training[kind]}/16 次）：${kind === 'run' ? '生命上限' : '攻击'} +${gain}。`, 'good');
    change(); return {ok:true,gain,count:gameState.run.training[kind]};
  }

function canBuildFurniture(fid) {
    const f=FURNITURE.find(x=>x.id===fid),reasons=[];
    if(!gameState.run||!f)return {ok:false,reasons:['该家具不存在。'],reason:'该家具不存在。'};
    if(f.onlyDifficulty&&gameState.run.difficulty!==f.onlyDifficulty)reasons.push('仅限对应难度建造');
    if(gameState.run.furniture[fid]||(fid==='tailor'&&gameState.run.tailorGift===1))reasons.push('已经建好或已赠送');
    if(f.needPrev&&!gameState.run.furniture[f.needPrev])reasons.push('需要先建造：'+FURNITURE.find(x=>x.id===f.needPrev)?.name);
    if (f.onlyIdentity && gameState.run.identity !== f.onlyIdentity)reasons.push('需要身份：'+(IDENTITIES[f.onlyIdentity]?.name||f.onlyIdentity));
    if(f.needBp&&!knowsBlueprint(f.needBp))reasons.push('缺少图纸：'+ITEMS[f.needBp].name);
    if(f.needCraft&&expLevel('craft')<f.needCraft)reasons.push(`需要制造等级 ${f.needCraft}（当前 ${expLevel('craft')}）`);
    if(deps.FARM_LIVESTOCK_IDS.includes(fid)){if(gameState.run.scene!=='farm')reasons.push(f.name+'只能在农田里建——去农田点「农场管理」。');if(farmLiveFree()<1)reasons.push(`农田畜牧位不够了（${farmLiveUsed()}/${farmLiveSlots()}），请升级农田。`);}
    if(furnSlotFull(fid))reasons.push(`家具位已满（${furnitureUsed()}/${houseSlots()}），先升级住所。`);
    if(!matsOk(f.mats))reasons.push('材料不足：'+missingMats(f.mats).join('、'));
    return {ok:!reasons.length,reasons,reason:reasons.join('；')};
  }

function buildFurniture(fid) {
    if(fid==='cellar')return buildChain('cellar');
    const f = FURNITURE.find(x => x.id === fid);
    if (!f) return;
    const check=canBuildFurniture(fid);
    if(!check.ok){log(check.reason,'warn');return check;}
    const isUpgrade=['wb2','wb3','fr2','fr3','sm2','bed2','bed3','bed4','rainfilter'].includes(fid);
    // 「别把自己做没了」：耗时超过 5 小时的家具/建造先弹窗提醒（作者 2026-09-19）
    if (longActWarn(Math.round(f.time * (1 - metaBonus().craft)), `打造${f.name}`, () => buildFurniture(fid))) return;
    takeMats(f.mats);
    log(`开始打造${f.name}（需 ${f.time} 分钟）……`, 'sys');
    addMin(Math.round(f.time * (1 - metaBonus().craft)));
    // ⚠️ 滤雨器例外：它是"在水壶上加装滤网"，水壶本身要留着（-20% 口渴效果靠它，删了效果就没了）。
    if (isUpgrade) { const prev = f.needPrev; if (prev && fid !== 'rainfilter') delete gameState.run.furniture[prev]; }
    gameState.run.furniture[fid] = true;
    log(`完工了：${f.name}！`, 'good');
    diaryAdd(`我做好了${f.name}。`);
    awardExperience('craft',deps.EXP_CRAFT*2);
    change();
  }

function houseExtMax() { return Math.max(0, (gameState.run.buildings.house || 0) + 1); }

function houseExtMats(n) {
    const table = [ { wood:10, branch:5 }, { wood:15, branch:8, clay:4 }, { wood:22, branch:12, stonebrick:4 }, { wood:30, branch:16, stonebrick:8, ironpart:2 } ];
    return table[(n || 1) - 1] || table[table.length - 1];
  }

function coopExtMats(n) {
    const table = [
      { plank:8,  nail:10, thatch:20 },                    // 第 1 次：扩到 4 只
      { plank:16, nail:20, thatch:40, ironpart:3 },        // 第 2 次：扩到 5 只（贵一截）
    ];
    return table[(n || 1) - 1] || null;
  }

function buildCoopExt() {
    if (!gameState.run.furniture || !gameState.run.furniture.coop) return { ok:false, reason:'你还没有鸡舍。' };
    const ex = gameState.run.coopExt || 0;
    if (ex >= deps.COOP_EXT_MAX) return { ok:false, reason:'鸡舍已经扩建到极限了（最多 5 只）。' };
    const mats = coopExtMats(ex + 1);
    if (!mats) return { ok:false, reason:'无法再次扩建。' };
    if (!matsOk(mats)) return { ok:false, reason:`材料不足：${missingMats(mats).join('、')}` };
    takeMats(mats);
    gameState.run.coopExt = ex + 1;
    addMin(60);
    log(`你扩建了鸡舍，能多养一只鸡了！（现在最多 ${coopCap()} 只）`, 'good');
    diaryAdd('我把鸡舍往旁边又搭了一间。');
    change();
    return { ok:true, cap: coopCap() };
  }

function buildHouseExt() {
    const ex = gameState.run.houseExt || 0;
    const max = houseExtMax();
    if (ex >= max) return { ok:false, reason:'这次住处已扩建到极限，升级住所可获得更多扩建次数。' };
    const mats = houseExtMats(ex + 1);
    if (!mats) return { ok:false, reason:'无法再次扩建。' };
    if (!matsOk(mats)) return { ok:false, reason:`材料不足：${missingMats(mats).join('、')}` };
    takeMats(mats);
    gameState.run.houseExt = ex + 1;
    log(`你扩建了住处，家具位 +1！（当前扩建 ${gameState.run.houseExt}/${max}）`, 'good');
    diaryAdd('我把住处又往外扩了一格。');
    change();
    return { ok:true };
  }

function storeExtCap() { return deps.STORE_EXT_CAP; }

function storeExtMax() { return Math.max(0, (gameState.run.buildings.storage || 0) + 1); }

function storeExtMats(n) {
    const table = [
      { wood:10, branch:6 },
      { wood:16, branch:10, nail:4 },
      { plank:14, nail:8, ironpart:2 },
      { plank:20, nail:12, ironpart:4 },
    ];
    return table[(n || 1) - 1] || table[table.length - 1];
  }

function buildStoreExt() {
    const ex = gameState.run.storeExt || 0;
    const max = storeExtMax();
    if (ex >= max) return { ok:false, reason:'这次仓库已扩建到极限，升级仓库可获得更多扩建次数。' };
    const mats = storeExtMats(ex + 1);
    if (!mats) return { ok:false, reason:'无法再次扩建。' };
    if (!matsOk(mats)) return { ok:false, reason:`材料不足：${missingMats(mats).join('、')}` };
    takeMats(mats);
    gameState.run.storeExt = ex + 1;
    log(`你扩建了仓库，仓库容量 +${deps.STORE_EXT_CAP}！（当前扩建 ${gameState.run.storeExt}/${max}）`, 'good');
    diaryAdd('我把仓库又扩了一块。');
    change();
    return { ok:true };
  }

const LOTUS_LIMIT = 3;

function lotusLeft() { return Math.max(0, LOTUS_LIMIT - (gameState.run.lotusMade || 0)); }

function cxMatMulFor(r) {
    const outKey = Object.keys((r && r.out) || {})[0];
    const hasDur = !!(outKey && DURA[outKey] !== undefined);
    // 作者 2026-09-19 追加：**没有耐久的配方两个技能都不动**（以前流水线的 -50% 连烤肉/药剂/木板都减，
    // 等于凭空放大产能），流水线本身也从 -50% 削到 -40%。
    if (!hasDur) return 1;
    const line = nodeLv('craft','c_line') ? 0.6 : 1;
    const fine = nodeLv('craft','c_finework') ? 1.3 : 1;
    return line * fine;
  }

function craftRecipe(r) {
    if (!r || !['r_plank','r_plank_iron','r_plank_steel'].includes(r.id)) return r;
    const axe=selectedTool('axe');
    const tool = axe?.tier>=2 ? axe.id : null;
    return {...r, id:'r_plank', name:'削木板', in:{wood:4}, out:{plank:tool ? 3 : 2},
      station:'none', time:tool ? 20 : 30, needTool:undefined, needToolTier:undefined,
      processingTool:tool};
  }

function craftIn(r, n=1) {
    r=craftRecipe(r);
    const mul=cxMatMulFor(r), out={};
    for(const k in (r && r.in) || {}) {
      const key=`${r.id}:${mul}:${k}`, credit=(gameState.run.craftRemainders || {})[key] || 0;
      out[k]=Math.max(0,Math.ceil((Math.round(r.in[k]*mul*10)*n-credit)/10));
    }
    return out;
  }

function commitCraftMaterials(r,n=1) {
    const mul=cxMatMulFor(r); if(mul===1) return;
    const paid=craftIn(r,n); gameState.run.craftRemainders=gameState.run.craftRemainders || {};
    for(const k in paid) { const key=`${r.id}:${mul}:${k}`; gameState.run.craftRemainders[key]=((gameState.run.craftRemainders[key] || 0)+paid[k]*10-Math.round(r.in[k]*mul*10)*n); }
  }

function canCraft(r) {
    r=craftRecipe(r);
    const cin0 = craftIn(r);
    if (r.needBp && !knowsBlueprint(r.needBp)) return { ok:false, reason:`需要图纸：${ITEMS[r.needBp].name}` };
    if (r.needItem && materialCount(r.needItem)<1) return { ok:false, reason:`需要${ITEMS[r.needItem].name}` };
    // 不死丹：单局最多炼 3 颗（防止堆药把死亡机制抹平）
    if (r.out && r.out.lotusPill && lotusLeft() <= 0) return { ok:false, reason:`不死丹一局最多炼制 ${LOTUS_LIMIT} 颗（已炼 ${LOTUS_LIMIT}/${LOTUS_LIMIT}）` };
    if (r.permLimit) {
      const key = Object.keys(r.out)[0];
      if (((gameState.run.permMade && gameState.run.permMade[key]) || 0) >= r.permLimit) return { ok:false, reason:`${r.name}本局最多炼制 ${r.permLimit} 颗。` };
    }
    if (r.needTool && !hasTool(r.needTool, r.needToolTier || 1)) return { ok:false, reason:r.needTool==='axe' ? `需要装备${r.needToolTier>=3?'钢斧':'铁斧或更高级斧头'}` : `需要${r.needTool==='knife'?ITEMS.knifeStone.name:'工具'}` };
    if (r.station !== 'none') {
      if (r.station === 'pearlWork' || r.station === 'sourceForge' || r.station === 'repair') {
        const af = ATLANTIS_FURNITURE.find(x => x.station === r.station);
        const nm = af ? af.name : '亚特兰蒂斯工位';
        if (!(gameState.run.atlantis && gameState.run.atlantis.camp && gameState.run.atlantis.camp.furniture && gameState.run.atlantis.camp.furniture[r.station])) return { ok:false, reason:`需要先在礁石栖息地建造「${nm}」` };
      } else {
      const f = FURNITURE.find(x => x.station === r.station);
      const stationName = f ? f.name : ({ fire:'篝火', pot:'灶台' }[r.station] || '对应建筑');
      if (!f && r.station !== 'pot' && r.station !== 'fire') return { ok:false, reason:`需要建造${stationName}` };
      const ok = r.station === 'work1' ? (gameState.run.furniture.wb1||gameState.run.furniture.wb2||gameState.run.furniture.wb3) :
        r.station === 'work2' ? (gameState.run.furniture.wb2||gameState.run.furniture.wb3) :
        r.station === 'work3' ? gameState.run.furniture.wb3 :
        r.station === 'tailor' ? tailorGifted() :
        r.station === 'furn1' ? (gameState.run.furniture.fr1||gameState.run.furniture.fr2||gameState.run.furniture.fr3) :
        r.station === 'furn2' ? (gameState.run.furniture.fr2||gameState.run.furniture.fr3) :
        r.station === 'furn3' ? gameState.run.furniture.fr3 :
        r.station === 'smoke1' ? (gameState.run.furniture.sm1||gameState.run.furniture.sm2) :
        r.station === 'smoke2' ? gameState.run.furniture.sm2 :
        r.station === 'fire' ? gameState.run.buildings.fire >= 0 :
        gameState.run.furniture[{'spin':'spin','loom':'loom','mortar':'mortar','pot':'stove','medPot':'medPot','tannery':'tannery','rack':'rack','stove':'stove'}[r.station]];
      if (!ok) return { ok:false, reason:`需要建造${stationName}` };
      }
    }
    // 晾肉架：一副架子一次只晾一批。晾晒期间不能晾别的（作者明确要求），要先去把上一批取下来
    if (r.hang) {
      const d = dryOf(r.station);
      if (d) return { ok:false, reason: nowTick() >= d.readyAt
        ? '架子上那批已经晾透了，先去把它取下来。'
        : `架子上正晾着东西，还要 ${fmtLeft(d.readyAt - nowTick())}——晾晒期间晾不了别的。` };
    }
    for (const k in cin0) if (materialCount(k)<cin0[k]) return { ok:false, reason:`材料不足：${ITEMS[k].name} ${materialCount(k)}/${cin0[k]}` };
    return { ok:true };
  }

function nowTick() { return gameState.run.tick || (gameState.run.day || 1) * 1440 + (gameState.run.minute || 0); }

function dryOf(station) { gameState.run.drying = gameState.run.drying || {}; return gameState.run.drying[station] || null; }

function dryLeftMin(station) {
    const d = dryOf(station);
    if (!d) return 0;
    return Math.max(0, (d.readyAt || 0) - nowTick());
  }

function dryCollect(station) {
    const d = dryOf(station);
    if (!d) return { ok:false, reason:'架子上没有晾着东西。' };
    if (nowTick() < d.readyAt) return { ok:false, reason:`还没晾透，还要 ${fmtLeft(d.readyAt - nowTick())}。` };
    if (!fitsInBag(d.out)) return {ok:false, reason:'背包装不下，成品仍留在架子上。'};
    delete gameState.run.drying[station];
    for (const k in d.out) addItem(k, d.out[k]);
    log(`晾晒完成：${Object.keys(d.out).map(k => `${ITEMS[k].name}×${d.out[k]}`).join('、')}。`, 'good');
    change();
    return { ok:true };
  }

function fmtLeft(min) {
    if (min <= 0) return '好了';
    if (min < 60) return min + ' 分钟';
    const h = Math.floor(min / 60), m = min % 60;
    return h + ' 小时' + (m ? m + ' 分' : '');
  }

function fitsInBag(outMap, removeMap) {
    if(Object.keys(outMap).every(id=>{const it=ITEMS[id];return it&&(it.cat==='bp'||it.cat==='currency'||it.alwaysFit);}))return true;
    let slots = capUsed();
    const cap = capacity();
    const preview = {};
    for (const id in gameState.run.inv) preview[id] = gameState.run.inv[id];
    if (removeMap) for (const id in removeMap) {
      const it = ITEMS[id]; if (!it || it.cat === 'bp' || it.cat === 'currency' || it.alwaysFit) continue;
      const per = stackSize(id);
      const before = preview[id] || 0;
      const after = Math.max(0, before - (removeMap[id] || 0));
      preview[id] = after;
      slots += Math.ceil(after / per) - Math.ceil(before / per);
    }
    for (const id in outMap) {
      const it = ITEMS[id];
      if (!it || it.cat === 'bp' || it.cat === 'currency' || it.alwaysFit) continue;
      const per = stackSize(id);
      const before = preview[id] || 0;
      const after = before + (outMap[id] || 0);
      preview[id] = after;
      slots += Math.ceil(after / per) - Math.ceil(before / per);
    }
    return slots <= cap;
  }

function craftMinutes(r) {
    r=craftRecipe(r);
    let t = Math.round(r.time * (1 - metaBonus().craft));
    if (r.hang) return t;
    if (gameState.run.identity === 'smith') t = Math.round(t * 0.8);
    return Math.max(3, Math.round(t * cxTimeMul()));
  }

function craft(r) {
    r=craftRecipe(r);
    const chk = canCraft(r);
    if (!chk.ok) { log(chk.reason, 'warn'); return; }
    if (r.hang) {
      // 晾晒：材料先收走、挂上去只花 r.time 分钟，成品等 hang 分钟后来取
      const cinH = craftIn(r);
      takeMats(cinH);
      const t = Math.round(r.time * (1 - metaBonus().craft));
      addMin(t);
      // 一批的量：按配方 r.out 的倍数（晾肉干一批晾出 hangQty 份）
      const q = Math.max(1, r.hangQty || 1);
      const out = {};
      for (const k in r.out) out[k] = r.out[k] * q;
      gameState.run.drying = gameState.run.drying || {};
      gameState.run.drying[r.station] = { readyAt: nowTick() + r.hang, out };
      const names = Object.keys(out).map(k => `${ITEMS[k].name}×${out[k]}`).join('、');
      log(`你把肉挂上了晾肉架——${fmtLeft(r.hang)}后来取（晾好能得 ${names}；这期间架子占着，晾不了别的）。`, 'sys');
      change();
      return;
    }
    // ⚠️ 背包装不下就别开工：否则材料白扣、时间白花，产物被 addItem 拒掉 → 东西凭空消失
    //    （要把即将扣掉的材料算进去：材料腾出来的格子当然能放产物）
    if (!fitsInBag(r.out, craftIn(r))) { log('背包塞不下了——先腾出空位再做，免得材料白费。', 'warn'); notifyBagFull(); return; }
    if (longActWarn(craftMinutes(r), `制作${r.name}`, () => craft(r))) return {pending:true};
    const cin = craftIn(r);                       // 材料：技能树「流水线 / 精工细作」会改这个
    takeMats(cin);
    if (r.out && r.out.lotusPill) gameState.run.lotusMade = (gameState.run.lotusMade || 0) + 1;
    if (r.permLimit) { const key = Object.keys(r.out)[0]; gameState.run.permMade = gameState.run.permMade || {}; gameState.run.permMade[key] = (gameState.run.permMade[key] || 0) + 1; }
    const out = ITEMS[r.out ? Object.keys(r.out)[0] : ''];
    log(`你开始制作：${r.name}（${r.time} 分钟）……`, 'sys');
    const t = craftMinutes(r);
    const refundKeys = Object.keys(cin).filter(k=>cin[k]>0);
    const refund = chance(cxRefundChance()) && refundKeys.length ? refundKeys[Math.floor(Math.random()*refundKeys.length)] : null;
    addMin(t);
    // 跨日的家具产出可能占满背包：重新校验全部产物，失败按实际扣料返还，不能部分发货。
    if (!fitsInBag(r.out)) {
      for(const k in cin) gainItem(k,cin[k]);
      if(r.out.lotusPill) gameState.run.lotusMade--;
      if(r.permLimit) { const key = Object.keys(r.out)[0]; gameState.run.permMade[key]--; }
      log('制作期间背包装满了，材料已退回背包或待收；本次耗时已发生。','warn');change();return;
    }
    commitCraftMaterials(r);
    const made = {}; let bonus = false;
    for(const k in r.out) { addItem(k,r.out[k]);made[k]=r.out[k]; }
    if(!r.permLimit && chance(cxExtraChance())) {
      const k=Object.keys(r.out)[0];
      if(fitsInBag({[k]:1}) && addItem(k,1,true)) {made[k]++;bonus=true;log('【巧手】手底下多出来一件。','good');}
    }
    for(const k in made) if(DURA[k] !== undefined && cxDurMul() !== 1) {
      const nd=Math.max(1,Math.round(DURA[k]*cxDurMul())), arr=gameState.run.toolDurs && gameState.run.toolDurs[k];
      if(arr) for(let i=0;i<made[k];i++) { arr[arr.length-1-i]=nd; gameState.run.toolMaxDurs[k][arr.length-1-i]=nd; }
      durSync(k);
      log(`【${nodeLv('craft','c_line') ? '流水线' : '精工细作'}】这次成品的耐久上限是 ${nd}。`,'sys');
    }
    if(refund) {gainItem(refund,1);log(`【精算】退回 ${ITEMS[refund].name}×1。`,'good');}
    awardExperience('craft',deps.EXP_CRAFT);
    gameState.run.craftCount = (gameState.run.craftCount || 0) + 1;
    log(`完成：${Object.keys(r.out).map(k=>`${ITEMS[k].name}×${r.out[k]}`).join('、')}${bonus ? '（额外多做了 1 件！）' : ''}。`, 'good');
    if (gameState.run.tut === 1 && Object.keys(gameState.run.inv).some(id => ITEMS[id] && ITEMS[id].tool)) gameState.run.tut = 2;   // 已做出首件工具→去装备
    change();
  }

function craftMax(r) {
    r=craftRecipe(r);
    let m = 999;
    let lo=0,hi=m;
    while(lo<hi) { const n=Math.ceil((lo+hi)/2), costs=craftIn(r,n); if(Object.keys(costs).every(k=>materialCount(k)>=costs[k])) lo=n; else hi=n-1; }
    m=lo;
    if (r.out && r.out.lotusPill) m = Math.min(m, lotusLeft());
    if (r.permLimit) m = Math.min(m, r.permLimit - ((gameState.run.permMade && gameState.run.permMade[Object.keys(r.out)[0]]) || 0));
    return Math.max(0, m);
  }

function craftBatch(r, n, onReady) {
    if (!r) return { ok:false, reason:'没有这个配方' };
    r=craftRecipe(r);
    if (!Number.isSafeInteger(n) || n < 1 || n > 999) return {ok:false, reason:'制作数量需为 1 到 999 的整数'};
    const check = canCraft(r);
    if (!check.ok) return check;
    if (r.uniqueItem && n !== 1) return {ok:false, reason:'限定物每次只能制作一件'};
    if (r.permLimit) return {ok:false, reason:'永久属性丹药请逐颗炼制。'};
    // ⚠️ 晾晒类配方（晾肉架）**不能走下面的批量流程**：一副架子一次只挂一批，
    //    而且下面那段是"扣材料 → 立刻 addItem 产出成品" —— 以前长按晾肉干就能
    //    **当场拿到肉干**，20 小时的晾晒被整个绕过去（玩家反馈"晾肉架不能一次晾很多块吧"）。
    //    这里直接转成单批：走 craft() 的晾晒分支（扣材料 → 挂上去 → 等 hang 分钟来取）。
    if (r.hang) {
      if(typeof onReady==='function'){onReady(()=>craftBatch(r,1),1);return {pending:true};}
      const d0 = dryOf(r.station);
      if (d0) return { ok:false, reason:'晾肉架上还晾着东西，先把它取下来。' };
      craft(r);
      return { ok:true, n:1, hanging:true, hung: !!dryOf(r.station) };
    }
    if (n < 1) return { ok:false, reason:'至少要制作 1 个' };
    if (r.out && r.out.lotusPill && n > lotusLeft()) return { ok:false, reason:`不死丹一局最多炼制 ${LOTUS_LIMIT} 颗（还能炼 ${lotusLeft()} 颗）` };
    let cinB = craftIn(r,n);
    for (const k in cinB) if (materialCount(k)<cinB[k]) return { ok:false, reason:'材料不足' };
    // 批量制作最容易撑爆背包：先按"能装下几个"自动降到 n，一个都装不下就干脆别开工
    {
      let fit = 0;
      for (let i = 1; i <= n; i++) {
        const outMap = {}, inMap = {};
        for (const k in r.out) outMap[k] = r.out[k] * i;
        Object.assign(inMap,craftIn(r,i));      // 材料会腾出格子，算进去
        // 消耗整堆材料会释放格子；1件放不下不代表2件也放不下。
        if (fitsInBag(outMap, inMap)) fit = i;
      }
      if (fit === 0) { log('背包塞不下，先腾出空位再做。', 'warn'); notifyBagFull(); return { ok:false, reason:'背包塞不下' }; }
      if (fit < n) log(`背包只放得下 ${fit} 个，这次就先做 ${fit} 个。`, 'warn');
      n = fit;
    }
    if (longActWarn(craftMinutes(r) * n, `连续制作 ${n} 件「${r.name}」`, () => craftBatch(r,n,onReady))) return {ok:false, pending:true, reason:''};
    // 界面先确认长耗时，再播放动画；执行时重新验料和容量。
    if(typeof onReady==='function'){onReady(()=>{const previous=deps.craftBatchConfirmed;deps.craftBatchConfirmed=true;try{return craftBatch(r,n);}finally{deps.craftBatchConfirmed=previous;}},n);return {pending:true};}
    cinB=craftIn(r,n);
    takeMats(cinB);
    if (r.out && r.out.lotusPill) gameState.run.lotusMade = (gameState.run.lotusMade || 0) + n;
    // ⚠️ 批量制作以前是"另一条腿"：① 还在用旧版"每级 -8% 耗时"（技能改版后那套已经没了）
    //    ② **完全没应用「精工细作 +30% 耐久 / 流水线 -20% 耐久」**，也没算巧手/精算 ——
    //    玩家反馈"做装备点上（长按批量），做完取消，木板精不精加工都没耐久"就是这么来的。
    //    现在和单个制作走同一套加成。
    const t = craftMinutes(r);
    addMin(t * n);
    // 巧手：每做一件都有机会多产 1 件；精算：每做一件都有机会退回 1 份材料
    let bonusN = 0, backN = 0;
    const refunds = [], cinKeys = Object.keys(cinB).filter(k=>cinB[k]>0);
    for(let i=0;i<n;i++) {
      if(chance(cxExtraChance())) bonusN++;
      if(cinKeys.length && chance(cxRefundChance())) refunds.push(cinKeys[Math.floor(Math.random()*cinKeys.length)]);
    }
    const outKeys=Object.keys(r.out), baseOut={};
    for(const k of outKeys) baseOut[k]=r.out[k]*n;
    if(!fitsInBag(baseOut)) {
      for(const k in cinB) gainItem(k,cinB[k]);
      if(r.out.lotusPill) gameState.run.lotusMade-=n;
      log('制作期间背包装满了，材料已退回背包或待收；本次耗时已发生。','warn');change();
      return {ok:false,reason:'背包已满，材料已退回背包或待收'};
    }
    commitCraftMaterials(r,n);
    for(const k of outKeys) addItem(k,baseOut[k]);
    let extraMade=0;
    for(let i=0;i<bonusN;i++) {
      const k=outKeys[0];if(!fitsInBag({[k]:1}) || !addItem(k,1,true)) break;extraMade++;
    }
    bonusN=extraMade;
    // 成品耐久：精工细作 +30% / 流水线 -20%（批量也一样生效）
    // ⚠️ 必须"这批里真有带耐久的成品"才动手：否则点了精工细作去烤肉干，会白写一行
    //    "这批成品的初始耐久按 130% 算"（东西压根没耐久，玩家看得莫名其妙）。
    if (outKeys.some(k => DURA[k] !== undefined) && cxDurMul() !== 1) {
      for (const k of outKeys) {
        if (DURA[k] === undefined) continue;
        const nd = Math.max(1, Math.round(DURA[k] * cxDurMul()));
        const arr = gameState.run.toolDurs && gameState.run.toolDurs[k];
        const made = r.out[k] * n + (k === outKeys[0] ? bonusN : 0);
        for (let i = 0; i < made; i++) if (arr && arr.length) { arr[arr.length - 1 - i] = nd; gameState.run.toolMaxDurs[k][arr.length - 1 - i] = nd; }
        durSync(k);
      }
      log(`【${nodeLv('craft','c_line') ? '流水线' : '精工细作'}】这批成品的耐久上限按 ${Math.round(cxDurMul() * 100)}% 算。`, 'sys');
    }
    const refunded={};
    for(const k of refunds) {
      if((refunded[k] || 0)>=cinB[k]) continue;
      gainItem(k,1); refunded[k]=(refunded[k] || 0)+1; backN++;
    }
    awardExperience('craft',deps.EXP_CRAFT,n);
    gameState.run.craftCount = (gameState.run.craftCount || 0) + n;
    log(`连续制作：${r.name}×${n}${r.id==='r_plank' ? `批，木板×${baseOut.plank}` : ''}（耗时 ${t * n} 分钟）${bonusN ? `，其中【巧手】多做了 ${bonusN} 件` : ''}${backN ? `，【精算】退回 ${backN} 份材料` : ''}。`, 'good');
    change();
    return { ok:true, n };
  }

function atlantisCamp() {
    if (!gameState.run.atlantis) gameState.run.atlantis = { unlocked:0, visited:0, camp:{ furniture:{}, buildings:{} }, quest:0 };
    if (!gameState.run.atlantis.camp) gameState.run.atlantis.camp = { furniture:{}, buildings:{} };
    if (!gameState.run.atlantis.camp.furniture) gameState.run.atlantis.camp.furniture = {};
    if(gameState.run.atlantis.camp.furniture.seaStorage2)delete gameState.run.atlantis.camp.furniture.seaStorage1;
    return gameState.run.atlantis.camp;
  }

function atlantisFurnitureUsed() { return Object.keys(atlantisCamp().furniture).length; }

function buildAtlantisFurniture(fid) {
    const f = ATLANTIS_FURNITURE.find(x => x.id === fid);
    if (!f) return { ok:false, reason:'没有这件家具。' };
    if(gameState.run.scene!=='atlantis'||gameState.run.zone!=='habitat'||gameState.run.combat||gameState.run.death||gameState.run.ending)return {ok:false,reason:'只能在礁石栖息地建造。'};
    const camp = atlantisCamp();
    if (camp.furniture[fid]) return { ok:false, reason:'已经建好了。' };
    if(f.upgradeFrom&&!camp.furniture[f.upgradeFrom])return {ok:false,reason:'请先建造海底储物箱。'};
    if(fid==='seaStorage1'&&camp.furniture.seaStorage2)return {ok:false,reason:'已有加固海底储物箱。'};
    const MAX = 6;
    if (!f.upgradeFrom && Object.keys(camp.furniture).length >= MAX) return { ok:false, reason:`礁石栖息地家具位已满（${MAX}）。` };
    if (!matsOk(f.mats)) return { ok:false, reason:`材料不足：${missingMats(f.mats).join('、')}` };
    takeMats(f.mats);
    log(`开始打造${f.name}（需 ${f.time} 分钟）……`, 'sys');
    addMin(Math.round(f.time * (1 - metaBonus().craft)));
    if(gameState.run.death||gameState.run.ending||gameState.run.combat)return {ok:false,reason:'建造未完成。'};
    if(f.upgradeFrom)delete camp.furniture[f.upgradeFrom];
    camp.furniture[fid] = true;
    log(`礁石栖息地建成了：${f.name}！`, 'good');
    diaryAdd(`我在礁石栖息地做好了${f.name}。`);
    awardExperience('craft',deps.EXP_CRAFT*2);
    change();
    return { ok:true };
  }

const DIVE_REPAIR_MATS = {
    diveSuit:{deepCoral:4,resin:3},
    diveSuit2:{deepCoral:4,sourceBar:1,tideSteel:1},
    diveMask:{deepCoral:2,sourceOre:2},
  };

function repairDiveCost(id) { return DIVE_REPAIR_MATS[id] ? {...DIVE_REPAIR_MATS[id]} : null; }

function repairDive(id) {
    const camp = atlantisCamp();
    if (!camp.furniture.repairBench) return { ok:false, reason:'需要先在礁石栖息地建造修补台。' };
    const mats=repairDiveCost(id);
    if (!mats) return {ok:false,reason:'请选择要修补的潜水装备。'};
    if (!hasItem(id)) return {ok:false,reason:`背包里没有${ITEMS[id].name}。`};
    const a=durList(id);
    let idx=0;
    for(let i=1;i<a.length;i++) if(a[i]<a[idx]) idx=i;
    if(a[idx]>=durMaxOf(id,idx)) return {ok:false,reason:`${ITEMS[id].name}的耐久已经是满的。`};
    if (!matsOk(mats)) return {ok:false,reason:`材料不足：${missingMats(mats).join('、')}`};
    takeMats(mats);
    a[idx]=durMaxOf(id,idx); durSync(id);
    log(`${ITEMS[id].name}耐久已恢复。`, 'good');
    change();
    return { ok:true,id,index:idx };
  }

function farmExt() { return gameState.run.farmExt || 0; }

function farmPlots() { return (BUILDING_CHAINS.farm[gameState.run.buildings.farm].plots || 1) + farmExt(); }

function plant(seedId) {
    const crop = CROPS[seedId];
    if (!crop) { log('这个不能种。', 'warn'); return { ok:false, reason:'这个不能种。' }; }
    if (gameState.run.crops.length >= farmPlots()) { log('没有空闲的田了——用锄头可以在耕地里开垦新田。', 'warn'); return { ok:false, reason:'没有空闲的田。' }; }
    if (!hasItem(seedId)) { log('没有种子。', 'warn'); return { ok:false, reason:'没有种子。' }; }
    removeItem(seedId, 1);
    gameState.run.crops.push({ seed:seedId, remain:crop.days });
    log(`你种下了${ITEMS[seedId].name}，预计 ${crop.days} 天后收获。`, 'good');
    change();
    return { ok:true };
  }

function harvest(idx) {
    const ready = gameState.run.crops.map((c, i) => ({ c, i })).filter(x => x.c.remain <= 0);
    if (!ready.length) { log('作物还没成熟。', 'warn'); return { ok:false, reason:'作物还没成熟。' }; }
    // 点哪块收哪块（以前不管点哪个都收第一块成熟的）
    const pick = (idx !== undefined && idx !== null && ready.some(x => x.i === +idx)) ? ready.find(x => x.i === +idx).c : ready[0].c;
    gameState.run.crops = gameState.run.crops.filter(x => x !== pick);
    const crop = CROPS[pick.seed];
    // ⛔ 这里原来写的是 `Math.round((rnd(min,max) + 2) * 难度 * 施肥)` —— 那个固定 "+2" 等于每收一次白送两份，
    //    三块地一轮就吃不完。作者 2026-09-24 定的口径就是**直接把 +2 删掉**（不要另加系数常量）：
    //    删掉之后萝卜 4~5 → 2~3、小麦 5~6 → 3~4，收成自然落到合理区间。
    const q = Math.max(1, Math.round(rnd(crop.min, crop.max) * (pick.seed==='seedHerb'?1:DIFFICULTIES[gameState.run.difficulty].resMul) * (pick.fert ? 1.5 : 1)));
    gainItem(crop.out, q);
    log(`收获：${ITEMS[crop.out].name}×${q}。${pick.fert ? '（施过肥，收成格外好）' : ''}`, 'good');
    change();
    return { ok:true, qty:q, item:crop.out };
  }

function canHoe() { return hasItem('hoe'); }

function tillPlot() {
    if (farmExt() >= deps.FARM_EXTRA_MAX) return { ok:false, reason:`这块地已经全开出来了（最多再开 ${deps.FARM_EXTRA_MAX} 块）。` };
    if (!canHoe()) return { ok:false, reason:'需要一把锄头（手工：木材×2 + 石头×1）。' };
    if (!matsOk({ wood:2 })) return { ok:false, reason:'需要木材×2。' };
    takeMats({wood:2});
    gameState.run.farmExt = farmExt() + 1;
    drainTool('hoe');
    addMin(60);
    log(`你挥锄开出一块新田（现在共 ${farmPlots()} 块）。`, 'good');
    change();
    return { ok:true, plots:farmPlots() };
  }

function loosenPlot(idx) {
    const c = gameState.run.crops[idx];
    if (!c) return { ok:false, reason:'这块地没有作物。' };
    if (c.remain <= 0) return { ok:false, reason:'已经成熟了，不用松土。' };
    if (c.tilled) return { ok:false, reason:'这块地已经松过土了。' };
    if (!canHoe()) return { ok:false, reason:'需要一把锄头（手工：木材×2 + 石头×1）。' };
    c.tilled = 1;
    c.remain = Math.max(0, c.remain - 1);
    drainTool('hoe');
    addMin(15);
    log(c.remain <= 0 ? '你给这块地松了土——作物已经熟透了！' : `你给这块地松了土，还能提前 ${c.remain} 天成熟。`, 'good');
    change();
    return { ok:true, remain:c.remain };
  }

function fertilize(idx) {
    const c = gameState.run.crops[idx];
    if (!c) return { ok:false, reason:'这块地没有作物。' };
    if (c.fert) return { ok:false, reason:'这块地已经施过肥了。' };
    if (!hasItem('rot', 2)) return { ok:false, reason:'需要腐烂物×2。' };
    removeItem('rot', 2);
    c.fert = 1;
    addMin(20);
    log('你把腐烂物翻进土里——这块地的收成会好一些。', 'good');
    change();
    return { ok:true };
  }

function demolishFurniture(fid) {
    if (!gameState.run.furniture[fid]) { log('没有这个家具。', 'warn'); return; }
    const f = FURNITURE.find(x => x.id === fid);
    if (!f) return;
    if(fid==='cellar'&&gameState.run.cellar?.items?.length){log('请先取出地窖中的食物再拆除。','warn');return;}
    if(fid==='shelf')gameState.run.bookFocus='';
    delete gameState.run.furniture[fid];
    // 拆掉鸡舍/羊圈：里面的牲畜会跑掉（提示清楚，别让玩家白白损失）
    if (fid === 'coop' || fid === 'pen') {
      const L = liveState();
      const n = L[fid].length;
      if (n) { L[fid] = []; log(`你拆掉了${f.name}，里面的 ${n} 只跑了。`, 'warn'); }
    }
    const refund = [];
    for (const k in f.mats) { const q = Math.max(1, Math.round(f.mats[k] * 0.5)); gainItem(k, q); refund.push(`${ITEMS[k].name}×${q}`); }
    log(`你拆除了${f.name}，返还了部分材料：${refund.join('、')}。`, 'good');
    diaryAdd(`我拆掉了${f.name}。`);
    change();
  }

function collectRainWater() {
    if (!gameState.run.furniture.rainfilter) return { ok:false, reason:'还没有建造滤雨器。' };
    let stored = Math.max(0, Math.min(20, Math.floor(Number(gameState.run.rainWater) || 0)));
    if (!stored) return { ok:false, reason:'滤雨器里还没有水，下雨后再来看看。' };
    let taken = 0;
    while (stored > 0 && addItem('water', 1, true)) { stored--; taken++; }
    if (!taken) return { ok:false, reason:'背包已满，先腾出一个位置再取水。' };
    gameState.run.rainWater = stored;
    log(`从滤雨器取出淡水×${taken}（剩余 ${stored}/20）。`, 'good');
    change();
    return { ok:true, taken, stored };
  }

function collectHiveHoney() {
    if (!gameState.run.furniture.beehive) return { ok:false, reason:'还没有建造蜂箱。' };
    let stored = Math.max(0, Math.min(12, Math.floor(Number(gameState.run.hiveHoney) || 0)));
    if (!stored) return { ok:false, reason:'蜂箱里还没有蜂蜜，明天再来看看。' };
    let taken = 0;
    while (stored > 0 && addItem('honey', 1, true)) { stored--; taken++; }
    if (!taken) return { ok:false, reason:'背包已满，先腾出一个位置再收蜜。' };
    gameState.run.hiveHoney = stored;
    log(`从蜂箱收取蜂蜜×${taken}（剩余 ${stored}/12）。`, 'good');
    change();
    return { ok:true, taken, stored };
  }
    return Object.freeze({adjustRecipeMats,supplyContainer,supplySites,supplyRecordsAll,supplyRecords,supplyCount,takeSupply,itemUseCount,takeUseItem,merchantSupplySites,merchantSellCount,materialSupplySites,materialCount,matsOk,missingMats,takeMats,buildChain,tailorGifted,furnitureUsed,furnTakesSlot,farmLiveSlots,farmLiveUsed,farmLiveFree,farmLiveInfo,houseSlots,furnSlotFull,furnSlotInfo,bedStamBonus,trainingCount,trainingHp,trainingAtk,train,canBuildFurniture,buildFurniture,houseExtMax,houseExtMats,coopExtMats,buildCoopExt,buildHouseExt,storeExtCap,storeExtMax,storeExtMats,buildStoreExt,lotusLeft,cxMatMulFor,craftRecipe,craftIn,commitCraftMaterials,canCraft,nowTick,dryOf,dryLeftMin,dryCollect,fmtLeft,fitsInBag,craftMinutes,craft,craftMax,craftBatch,atlantisCamp,atlantisFurnitureUsed,buildAtlantisFurniture,repairDiveCost,repairDive,farmExt,farmPlots,plant,harvest,canHoe,tillPlot,loosenPlot,fertilize,demolishFurniture,collectRainWater,collectHiveHoney});
  }
  return Object.freeze({create});
})();
