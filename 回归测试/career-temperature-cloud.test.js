const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../孤屿遗章-游戏 - 发布/js');
const source = fs.readFileSync(path.join(root, 'data.js'), 'utf8') + '\n' + require('./helpers/runtime.js').engineSource(path.join(root, 'game.js'));
const memory = {};
let failMetaWriteOnce = false;
const localStorage = {getItem:k=>memory[k]??null,setItem:(k,v)=>{if(k==='guyuyizhang_meta'&&failMetaWriteOnce){failMetaWriteOnce=false;throw Error('simulated write failure')}memory[k]=String(v)},removeItem:k=>{delete memory[k]}};
const document = {get cookie(){return ''},set cookie(_) {}};
const pending = [];
const files = {};
let created = 0, updated = 0, upload = null;
let deferList=false, listReply=null;
const tap = {
  env:{USER_DATA_PATH:'/user'},
  getFileSystemManager:()=>({writeFile:({filePath,data,success})=>{files[filePath]=data;success({})},readFile:({filePath,success})=>success({data:files[filePath]})}),
  getCloudSaveManager:()=>({
    getArchiveList:({success})=>{if(deferList)listReply=success;else success({saves:[]})},
    createArchive:(args)=>{created++;upload=args},
    updateArchive:(args)=>{updated++;upload=args},
  }),
};
const {Game:G,ITEMS,IDENTITIES} = new Function('localStorage','window','document','setTimeout','console',source+'\nreturn {Game,ITEMS,IDENTITIES};')(localStorage,{tap},document,(fn,ms)=>{pending.push({fn,ms});return pending.length},{warn(){},log(){}});
let passed=0; const check=(yes,name)=>{if(!yes)throw Error(name);passed++};
(async()=>{
  check(!!IDENTITIES.hunter && !!IDENTITIES.trainer,'两种身份出现在开局选择');
  check(['bread','cake','carrotStew','flour','tideVitalPill','abyssBreathPill'].every(id=>fs.existsSync(path.join(root,'../assets/img/items',id+'.png'))) && ['hunter','trainer'].every(id=>fs.existsSync(path.join(root,'../assets/img/identities',id+'.png')) && fs.existsSync(path.join(root,'../assets/img/identities-card',id+'.png'))),'新增物品图与两种身份的黑白/彩绘立绘齐全');
  G.newGame('hunter','normal');
  check(Math.abs(G.skillCritRate()-0.15)<1e-9,'猎人基础暴击增加 5 个百分点');
  check(G.combatAccuracy('attack')===1,'猎人近战基础命中增加 10 个百分点');
  G.S().equipment.accessory='hornAmulet';
  check(Math.abs(G.skillCritRate()-0.25)<1e-9 && !ITEMS.hornAmulet.def,'牛角护符提供 10 个百分点暴击、不加防御');
  G.addItem('relic',1);
  const relicBefore=G.invCount('relic'), shellsBefore=G.invCount('beibi');
  G.sellToMerchant('relic',1,[{id:'relic',base:600}],false);
  check(G.invCount('relic')===relicBefore && G.invCount('beibi')===shellsBefore,'即使旧交易列表仍含遗物也无法卖出刷贝壳币');
  G.removeItem('relic',1);G.S().flags.pt_peak_altar=1;
  check(G.onceRewardMissing({id:'peak_altar',once:true}),'旧档已失去遗物时仍能在祭坛补领');
  G.metaState().identityUnlocks={...(G.metaState().identityUnlocks || {}),trainer:1};G.newGame('trainer','normal');
  let s=G.S();s.tut=null;s.furniture.treadmill=true;s.furniture.dumbbell=true;
  G.bind({onOverlay:o=>{if(o.choices&&o.choices[0])o.choices[0].ok()}});
  const hp0=G.hpMax(),tick0=s.tick;
  G.train('run');
  check(s.training.run===1&&s.training.lift===0&&G.hpMax()===hp0+5&&s.tick===tick0+360,'第一次跑步耗时 6 小时，生命上限加 5');
  check(!G.train('lift').ok&&s.training.lift===0,'同日不能改练哑铃');
  s.training.run=16;s.training.lift=16;
  check(G.trainingHp()===50&&G.trainingAtk()===5,'16 次两器材合计分别加 50 生命与 5 攻击');
  G.save();G.load();s=G.S();
  check(G.trainingHp()===50&&G.trainingAtk()===5,'训练收益读档后按次数推导、不重复叠加');
  s.day=46;s.scene='peak';s.equipment.cloth=null;
  check(G.temperatureInfo().state==='cold','冬季山顶无厚衣过冷');
  s.equipment.cloth='furCoat';
  check(G.temperatureInfo().state==='normal','冬季山顶穿毛皮大衣恢复舒适');
  s.day=16;s.scene='desert';
  check(G.temperatureInfo().state==='heat','夏季荒漠穿毛皮大衣过热');
  s.scene='camp';s.buildings.house=2;s.equipment.cloth=null;
  check(G.temperatureInfo().state==='normal','夏季进屋换掉厚衣后恢复舒适');
  // 穿同一件衣物，升级火塘/壁炉不能新增过热；同时保留低温升级收益。
  const savedTemp={day:s.day,minute:s.minute,weather:s.weather,fire:s.buildings.fire,cloth:s.equipment.cloth};
  s.scene='camp';s.buildings.house=3;s.equipment.cloth='furCoat';s.tempActiveUntil=(s.tick||0)+100;
  for(const day of [1,16,31,46]) for(const weather of ['sun','rain','snow']) for(const minute of [120,840]) {
    s.day=day;s.weather=weather;s.minute=minute;s.buildings.fire=0;
    const before=G.temperatureInfo();s.buildings.fire=2;const after=G.temperatureInfo();
    check(before.state==='heat'||after.state!=='heat','同衣物回营地升级壁炉不新增过热');
  }
  s.day=46;s.weather='snow';s.minute=120;s.equipment.cloth=null;s.buildings.house=0;s.buildings.fire=0;s.tempActiveUntil=0;
  const unheated=G.temperatureInfo().body;s.buildings.fire=2;
  check(G.temperatureInfo().body>unheated&&G.temperatureInfo().fire>0,'寒冷营地壁炉仍有实际保暖收益');
  Object.assign(s,{day:savedTemp.day,minute:savedTemp.minute,weather:savedTemp.weather});s.buildings.fire=savedTemp.fire;s.buildings.house=2;s.equipment.cloth=savedTemp.cloth;
  s.weather='sun';s.minute=14*60;
  const summerNoon=G.weatherTemperature();
  check(summerNoon===G.weatherTemperature(),'同一时刻气温稳定，不因重复渲染跳动');
  s.weather='rain';
  check(G.weatherTemperature()<summerNoon,'同季节同时间雨天比晴天凉');
  s.weather='sun';s.minute=2*60;
  check(G.weatherTemperature()<summerNoon,'夜间比午后凉');
  const campAir=G.environmentTemperature('camp');
  check(G.environmentTemperature('desert')>campAir && G.environmentTemperature('cave')<campAir,'荒漠比营地热、山洞比营地凉');
  check(G.environmentTemperature('atlantis','abyss')<G.environmentTemperature('atlantis','habitat'),'深渊比海底栖息地冷');
  s.day=46;s.weather='snow';s.minute=2*60;s.scene='atlantis';s.zone='coral';s.equipment.cloth='diveSuit';
  check(G.temperatureInfo().state==='normal' && G.temperatureInfo().suitThermal>0,'基础潜水服在寒冬普通海底仍可隔温');
  s.zone='abyss';
  check(G.temperatureInfo().state==='cold','基础潜水服在极深海低温中不保证舒适');
  s.equipment.cloth='diveSuit2';
  check(G.temperatureInfo().state==='normal','高级潜水服在极深海有额外隔温');
  s.day=46;s.scene='peak';s.equipment.cloth=null;s.tempGraceUntil=0;
  const coldBody=G.temperatureInfo().body,coldAcc=G.combatAccuracy('attack');
  s.equipment.cloth='furCoat';
  check(G.temperatureInfo().body>coldBody && G.temperatureInfo().state==='normal' && G.combatAccuracy('attack')>coldAcc,'衣物提高自身温度，过冷的命中惩罚可通过换衣解除');
  s.day=1;s.weather='sun';s.scene='camp';s.equipment.cloth=null;s.buildings.watch=2;s.settings.roadAmbush=false;s.stats.stamina=999;
  const random0=Math.random;Math.random=()=>0.99;
  try { G.travel('peak'); } finally { Math.random=random0; }
  check(s.scene==='peak'&&G.temperatureInfo().state==='cold'&&G.temperatureInfo().grace===30,`进入寒冷山顶后有 30 分钟换衣缓冲：${s.scene}/${G.temperatureInfo().state}/${G.temperatureInfo().grace}`);
  G.addMin(29);
  check(G.temperatureInfo().grace===1,'缓冲按游戏分钟递减');
  G.addMin(1);
  check(G.temperatureInfo().grace===0,'30 分钟后缓冲结束');
  s.day=46;s.weather='snow';s.minute=12*60+50;s.tempGraceUntil=s.tick+30;s.stats.hp=100;
  G.addMin(15);
  check(s.stats.hp===100,'在缓冲内跨整点也不会提前受到寒冷伤害');
  G.addMin(55);
  check(s.stats.hp===95,'缓冲结束后的下一个整点受到一次寒冷伤害');
  G.save();
  check(created===0&&updated===0&&upload===null&&!G.cloudPush(true)&&!G.cloudStatus().supported,'独立版不创建或更新平台云档，本地仍保存');
  const old=JSON.parse(memory.guyuyizhang_save);
  delete old.training;delete old.tempGraceUntil;delete old.tempActiveUntil;
  memory.guyuyizhang_save=JSON.stringify(old);
  check(G.load()&&G.trainingHp()===0&&G.trainingAtk()===0&&G.temperatureInfo().grace===0,'旧存档缺少新字段仍可读取并安全迁移');
  check(G.slotList().length===4&&!G.extraSlotUnlocked()&&!G.backupSlot(3).ok,'旧账号保留前三槽，第四槽未付款不能写入');
  G.metaState().soul=150;
  const oldThreeSlotCode=G.exportCode();
  failMetaWriteOnce=true;
  check(!G.buyExtraSlot().ok&&!G.extraSlotUnlocked()&&G.metaState().soul===150,'账号数据写入失败时第四槽不解锁也不扣魂点');
  check(G.buyExtraSlot().ok&&G.extraSlotUnlocked()&&G.metaState().soul===50&&G.slotList().length===4,'支付 100 魂点后永久解锁第四槽');
  check(!G.buyExtraSlot().ok&&G.metaState().soul===50,'第四槽不能重复购买扣费');
  check(G.backupSlot(3).ok&&!!G.slotList()[3],'第四槽能备份当前进度');
  const fourSlotCode=G.exportCode();
  check(G.importCode(fourSlotCode).ok&&!!G.slotList()[3],'四槽存档码可正常导入');
  check(G.importCode(oldThreeSlotCode).ok&&G.extraSlotUnlocked()&&!!G.slotList()[3]&&G.metaState().soul===50,'导入旧三槽码不吞第四槽，也不退回购买前的 100 魂点');
  G.addItem('divineBow',1,true);
  check(!G.redeemCode('shengong2026').ok,'神弓码下架后拒绝新兑换');G.metaState().redeemed.SHENGONG2026=1;G.metaState().mailbox.push({code:'SHENGONG2026',item:'divineBow',qty:1});
  check(!G.redeemCode('SHENGONG2026').ok,'同一账号无法重复兑换神弓码');
  const bowMail=G.mailboxList().find(x=>x.item==='divineBow');
  check(G.claimMailbox(bowMail.i).ok && G.invCount('divineBow')===2 && !G.mailboxList().some(x=>x.item==='divineBow'),'已持有神弓仍能领第二把，邮件被消费');
  console.log(`通过 ${passed} 项，失败 0 项`);
  console.log('RESULT:PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
