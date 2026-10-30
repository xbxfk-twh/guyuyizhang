const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const source=require('./helpers/runtime.js').logicFiles.map(f=>fs.readFileSync(path.join(__dirname,'../孤屿遗章-游戏 - 发布/js',f),'utf8')).join('\n');
const gifts={LAOBANDAQI:{soul:10000,adCoins:1000},XIEXIELAOBAN:{soul:0,adCoins:0,item:'divineSuperPack',qty:1},SHIYAN:{soul:0,adCoins:100}};
function boot(server=new Map(),disk={}){
 const control={failKey:'',offline:false,saveFail:false,calls:0};
 const storage={getItem:k=>disk[k]??null,setItem(k,v){if(control.failKey===k){control.failKey='';throw Error('quota');}disk[k]=String(v);},removeItem:k=>delete disk[k]};
 const win={crypto:crypto.webcrypto,fetch:async(url,opt)=>{control.calls++;if(control.offline)throw Error('offline');const {code,owner}=JSON.parse(opt.body);let row=server.get(code);
  if(row&&row.owner!==owner)return{status:409,json:async()=>({ok:false,reason:'这个兑换码已经被使用'})};
  if(!row){row={owner,receipt:'remote:'+crypto.randomBytes(16).toString('hex'),gift:gifts[code]};server.set(code,row);}
  if(control.saveFail)control.failKey='guyuyizhang_meta';
  return{status:200,json:async()=>({ok:true,receipt:row.receipt,gift:row.gift})};}};
 const game=new Function('localStorage','window','document','console','setTimeout','clearTimeout',source+';return Game;')(storage,win,{cookie:''},{warn(){}},setTimeout,clearTimeout);
 game.bind({onChange(){},onLog(){},onOverlay(){},onSaveFail(){}});return{game,disk,control};
}
function fresh(server){const e=boot(server);e.game.newGame('fisher','normal');e.game.S().tut=null;return e;}
let passed=0;async function check(name,fn){await fn();passed++;console.log('OK '+name);}
(async()=>{
 for(const [code,gift] of Object.entries(gifts)){
  await check(code+' 全服一个资格成功，重载、开新局、导入不复制奖励',async()=>{
   const server=new Map(),e=fresh(server),g=e.game,before=g.exportCode(),base=g.metaState().soul;
   const results=await Promise.all([g.redeemCode(' '+code.toLowerCase()+' '),fresh(server).game.redeemCode(code)]);
   assert.equal(results.filter(r=>r.ok).length,1);assert.ok(results[0].ok);assert.equal(e.control.calls,1);
   const pending=g.exportCode(),mail=g.mailboxList()[0];assert.equal(mail.soul,gift.soul);assert.equal(mail.adCoins,gift.adCoins);assert.equal(mail.item,gift.item||null);
   assert.ok(g.claimMailbox(mail.i).ok);assert.equal(g.metaState().soul,base+gift.soul);assert.equal(g.adCoinBalance(),gift.adCoins);if(gift.item)assert.equal(g.invCount(gift.item),1);
   assert.ok(g.importCode(pending).ok);assert.equal(g.mailboxCount(),0);assert.ok(g.importCode(before).ok);assert.equal((await g.redeemCode(code)).ok,false);
   g.newGame('fisher','normal');assert.equal((await g.redeemCode(code)).ok,false);g.save();const reload=boot(server,e.disk).game;reload.load();assert.equal((await reload.redeemCode(code)).ok,false);assert.equal(reload.mailboxCount(),0);
  });
  await check(code+' 失败不占码，服务器成功后落盘失败可以原资格恢复',async()=>{
   const server=new Map(),e=fresh(server),g=e.game;g.S().difficulty='legend';assert.equal((await g.redeemCode(code)).ok,false);assert.equal(e.control.calls,0);
   g.S().difficulty='normal';e.control.failKey='guyuyizhang_meta';assert.equal((await g.redeemCode(code)).ok,false);assert.equal(e.control.calls,0);assert.equal(server.size,0);
   e.control.offline=true;assert.equal((await g.redeemCode(code)).ok,false);assert.equal(server.size,0);e.control.offline=false;
   e.control.saveFail=true;assert.equal((await g.redeemCode(code)).ok,false);assert.equal(server.size,1);assert.equal(g.mailboxCount(),0);
   const owner=server.get(code).owner;e.control.saveFail=false;assert.ok((await g.redeemCode(code)).ok);assert.equal(server.get(code).owner,owner);assert.equal(g.mailboxCount(),1);
   e.control.failKey='guyuyizhang_meta';assert.equal(g.claimMailbox(0).ok,false);assert.equal(g.mailboxCount(),1);assert.ok(g.claimMailbox(0).ok);assert.equal(g.mailboxCount(),0);
  });
 }
 await check('旧待领邮件可领取，历史标记保留，不重新向服务端占码',async()=>{
  const {game:g,control}=fresh();g.metaState().redeemed.XIEXIELAOBAN=1;g.metaState().mailbox.push({code:'XIEXIELAOBAN',item:'divineSuperPack',qty:1});assert.ok(g.backupSlot(0).ok);g.metaReload();
  assert.equal((await g.redeemCode('xiexielaoban')).ok,false);assert.equal(control.calls,0);const mail=g.mailboxList().find(m=>m.item==='divineSuperPack');assert.ok(mail);assert.ok(g.claimMailbox(mail.i).ok);assert.equal(g.invCount('divineSuperPack'),1);assert.equal((await g.redeemCode('ganxiepingjia')).ok,false);
 });
 console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
})().catch(e=>{console.error(e);process.exitCode=1;});
