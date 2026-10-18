const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../孤屿遗章-游戏 - 发布/js');
let passed=0;function check(name,fn){fn();passed++;console.log('OK '+name);}
const memory={};let fail=false;
const storage={getItem:k=>memory[k]||null,setItem:(k,v)=>{if(fail&&k==='guyuyizhang_meta'){fail=false;throw Error('disk full');}memory[k]=String(v);},removeItem:k=>delete memory[k]};
const source=['data.js','game.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const G=new Function('localStorage','window','document',source+'\nreturn Game;')(storage,{},{});
G.bind({onChange(){},onLog(){},onFight(){},onEnding(){},onOverlay(){}});
G.newGame('fisher','normal');G.S().tut=null;
check('广告币兑换、商城四商品价格与消费，读旧码不退币或重复发货',()=>{
 G.newGame('fisher','normal');G.S().tut=null;
 G.metaState().adWallet={test:{coins:100}};G.metaState().mailbox=[];G.metaState().adDelivered={};
 const code=G.exportCode(), beforeSoul=G.metaState().soul;
 assert.equal(G.exchangeAdCoins(2).ok,true);assert.equal(G.adCoinBalance(),98);assert.equal(G.metaState().soul,beforeSoul+30);
 assert.equal(G.exchangeAdCoins(-1).ok,false);assert.equal(G.exchangeAdCoins(1.5).ok,false);
 for(const [id,price] of [['divineBow',15],['divineArmor',15],['satchel',7],['atlantisSeed',7]]){
   const before=G.adCoinBalance();assert.equal(G.buyAdShop(id).ok,true);assert.equal(G.adCoinBalance(),before-price);
 }
 assert.equal(G.adCoinBalance(),54);assert.equal(G.mailboxList().length,4);
 const bow=G.mailboxList().find(x=>x.item==='divineBow');assert.equal(G.claimMailbox(bow.i).ok,true);
 assert.equal(G.importCode(code).ok,true);assert.equal(G.adCoinBalance(),54);assert.equal(G.mailboxList().length,3);assert.equal(G.metaState().soul,beforeSoul+30);
 assert.equal(G.importCode(code).ok,true);assert.equal(G.adCoinBalance(),54);assert.equal(G.mailboxList().length,3);
});
check('商城支持多把神弓，存取逐件保留耐久和装备索引',()=>{
 G.newGame('fisher','normal');G.S().tut=null;G.metaState().mailbox=[];G.metaState().adWallet={test:{coins:30}};
 for(let i=0;i<2;i++){assert.equal(G.buyAdShop('divineBow').ok,true);assert.equal(G.claimMailbox(G.mailboxList().find(x=>x.item==='divineBow').i).ok,true);}
 assert.equal(G.invCount('divineBow'),2);assert.deepEqual(G.S().toolDurs.divineBow,[120,120]);
 G.S().toolDurs.divineBow=[27,83];G.S().dur.divineBow=27;G.S().equipment.weapon='divineBow';G.S().equipIdx.weapon=1;
 assert.equal(G.storeDivineBow().ok,true);assert.equal(G.invCount('divineBow'),1);assert.deepEqual(G.S().toolDurs.divineBow,[83]);assert.equal(G.S().equipIdx.weapon,0);
 assert.equal(G.storeDivineBow().ok,true);assert.equal(G.invCount('divineBow'),0);
 assert.equal(G.claimMailbox(G.mailboxList().find(x=>x.item==='divineBow').i).ok,true);
 assert.equal(G.claimMailbox(G.mailboxList().find(x=>x.item==='divineBow').i).ok,true);
 assert.deepEqual(G.S().toolDurs.divineBow,[27,83]);
});
check('商城与兑换写盘失败不扣广告币、不发货、不加魂点',()=>{
 const balance=G.adCoinBalance(),mails=G.mailboxList().length,soul=G.metaState().soul;
 fail=true;assert.equal(G.buyAdShop('divineArmor').ok,false);assert.equal(G.adCoinBalance(),balance);assert.equal(G.mailboxList().length,mails);
 fail=true;assert.equal(G.exchangeAdCoins(1).ok,false);assert.equal(G.adCoinBalance(),balance);assert.equal(G.metaState().soul,soul);
});
check('魂点复活保留已结算标记，并消费50魂点',()=>{
 G.newGame('fisher','normal');G.metaState().soul=50;G.S().death='test';G.S().ending='D';G.S().stats.hp=0;G.S().flags.metaSettled=1;
 assert.equal(G.reviveToday().ok,true);assert.ok(G.S().stats.hp>0);assert.equal(G.metaState().soul,0);assert.equal(G.S().flags.metaSettled,1);
});
check('普通池三奖等概率，广告币奖2至3枚并跨局保留',()=>{
 const hash=value=>{let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
 const random=(id,key)=>{let h=hash(`${id}:1:v2:${key}`);h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return (h>>>0)/4294967296;};
 const wanted=[null,null,null];for(let i=0;i<10000&&wanted.some(x=>!x);i++){const id='ad-pool-'+i;if(random(id,'pool')>=0.7)continue;const type=Math.floor(random(id,'item')*3);if(!wanted[type])wanted[type]=id;}
 assert.ok(wanted.every(Boolean));
 for(let type=0;type<3;type++){
  G.newGame('fisher','normal');const s=G.S();s.tut=null;s._runId=wanted[type];s.scene='atlantis';s.capacity=999;s.inv.beibi=100;
  for(let d=1;d<30;d++){s.day=d;if(G.lotteryState().active)break;}s.zone=G.lotteryState().zone;
  G.metaState().lotteryRuns=G.metaState().lotteryRuns || {};G.metaState().lotteryRuns[s._runId]={credit:0,misses:9,nonce:0,lastDay:s.day,uses:0};
  const before=G.adCoinBalance(),r=G.lotteryOffer('beibi',100);assert.equal(r.ok,true);
  if(type<2){assert.equal(r.reward.item,type===0?'wood':'honey');assert.equal(G.adCoinBalance(),before);}
  else {assert.ok(r.reward.adCoins===2 || r.reward.adCoins===3);assert.equal(G.adCoinBalance(),before+r.reward.adCoins);const total=G.adCoinBalance();G.newGame('fisher','normal');assert.equal(G.adCoinBalance(),total);}
 }
});

check('15魂点换1星之点，批量无损往返且不改变背包',()=>{
 G.newGame('fisher','normal');G.metaState().soul=150;G.metaState().adWallet={};const bag=JSON.stringify(G.S().inv);
 assert.equal(G.exchangeSoulForStars(4).ok,true);assert.equal(G.metaState().soul,90);assert.equal(G.adCoinBalance(),4);
 assert.equal(G.exchangeAdCoins(4).ok,true);assert.equal(G.metaState().soul,150);assert.equal(G.adCoinBalance(),0);assert.equal(JSON.stringify(G.S().inv),bag);
});
check('魂点不足、小数、非法或过大数量均不扣款不加币',()=>{
 G.metaState().soul=14;const before=JSON.stringify(G.metaState());
 for(const n of [1,0,-1,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER,'1'])assert.equal(G.exchangeSoulForStars(n).ok,false);
 assert.equal(JSON.stringify(G.metaState()),before);
});
check('魂点换星之点写盘失败原子回滚',()=>{
 G.metaState().soul=60;const before=JSON.stringify(G.metaState());fail=true;
 assert.equal(G.exchangeSoulForStars(2).ok,false);assert.equal(JSON.stringify(G.metaState()),before);
});
check('导入兑换前旧码不能撤销魂点支出，反复导入不增值',()=>{
 G.metaState().soul=150;G.metaState().adWallet={};const old=G.exportCode();
 assert.equal(G.exchangeSoulForStars(7).ok,true);assert.equal(G.metaState().soul,45);
 for(let i=0;i<3;i++){assert.equal(G.importCode(old).ok,true);assert.equal(G.metaState().soul,45);assert.equal(G.adCoinBalance(),7);}
 assert.equal(G.exchangeAdCoins(3).ok,true);
 for(let i=0;i<3;i++){assert.equal(G.importCode(old).ok,true);assert.equal(G.metaState().soul,90);assert.equal(G.adCoinBalance(),4);}
});
check('旧零魂码导入不会形成负魂点，正常消费流水保留',()=>{
 G.metaState().soul=0;G.metaState().adWallet={};const old=G.exportCode();G.metaState().soul=60;
 assert.equal(G.exchangeSoulForStars(4).ok,true);assert.equal(G.importCode(old).ok,true);assert.equal(G.metaState().soul,0);assert.equal(G.adCoinBalance(),4);
});
check('广告接口已移除，旧true参数不能免费备份或复活',()=>{
 assert.equal(G.claimAdReward,undefined);assert.equal(G.claimAdAction,undefined);assert.equal(G.adRewardState,undefined);
 assert.equal(fs.existsSync(path.join(root,'ads.js')),false);G.newGame('fisher','normal');G.metaState().backupPoints=0;G.metaState().soul=0;
 assert.equal(G.backupSlot(0,true).ok,false);G.S().death='test';G.S().stats.hp=0;assert.equal(G.reviveToday(true).ok,false);
});
check('命名牌商城售价3星点，购买寄信可领取，余额不足不扣款',()=>{
 G.newGame('fisher','normal');G.S().tut=null;G.metaState().mailbox=[];G.metaState().adWallet={test:{coins:3}};
 const goods=G.adShopState().goods.find(x=>x.id==='namecard');assert.equal(goods.item,'namecard');assert.equal(goods.cost,3);
 assert.equal(G.buyAdShop('namecard').ok,true);assert.equal(G.adCoinBalance(),0);
 const mail=G.mailboxList().find(x=>x.item==='namecard');assert.ok(mail);assert.equal(mail.qty,1);assert.equal(G.claimMailbox(mail.i).ok,true);assert.equal(G.invCount('namecard'),1);
 assert.equal(G.buyAdShop('namecard').ok,false);assert.equal(G.adCoinBalance(),0);assert.equal(G.mailboxList().filter(x=>x.item==='namecard').length,0);
});
console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
