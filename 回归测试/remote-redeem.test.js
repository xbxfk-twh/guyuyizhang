const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const source=['data.js','game.js'].map(f=>fs.readFileSync(path.join(__dirname,'../孤屿遗章-游戏 - 发布/js',f),'utf8')).join('\n');
function fresh(){const store={},control={fail:false,calls:[],mode:'ok',claimed:null};
 const win={crypto:require('node:crypto').webcrypto};
 win.fetch=async(url,options)=>{const b=JSON.parse(options.body);control.calls.push(b);if(control.mode==='offline')throw Error('offline');
   if(control.claimed&&control.claimed!==b.owner)return {status:409,json:async()=>({ok:false,reason:'这个兑换码已经被使用'})};
   control.claimed=b.owner;if(control.mode==='saveFail')control.fail=true;
   return {status:200,json:async()=>({ok:true,receipt:'remote:'+'b'.repeat(32),gift:{soul:300,adCoins:30}})};
 };
 const G=new Function('localStorage','window','document','console','setTimeout','clearTimeout',source+'\nreturn Game;')({getItem:k=>store[k]??null,setItem:(k,v)=>{if(control.fail){control.fail=false;throw Error('quota');}store[k]=String(v);},removeItem:k=>delete store[k]},win,{cookie:''},{log(){},warn(){}},()=>1,()=>{});
 G.bind({onChange(){},onLog(){},onOverlay(){}});G.newGame('fisher','normal');G.S().tut=null;return{G,control};
}
const code='GY-'+'A'.repeat(32);let pass=0,fail=0;
async function check(name,f){try{await f();pass++;console.log('OK '+name);}catch(e){fail++;console.error(name,e.stack);}}
(async()=>{
 await check('完整兑换进邮箱、领取双币、重载不重复',async()=>{const{G:g,control:c}=fresh(),soul=g.metaState().soul;assert.ok((await g.redeemCode(code.toLowerCase())).ok);assert.equal(c.calls.length,1);assert.equal(g.mailboxList()[0].soul,300);assert.ok(g.claimMailbox(0).ok);assert.equal(g.metaState().soul,soul+300);assert.equal(g.adCoinBalance(),30);g.save();g.load();assert.equal((await g.redeemCode(code)).ok,false);assert.equal(c.calls.length,1);});
 await check('领取资格先落盘，失败不请求服务器',async()=>{const{G:g,control:c}=fresh();c.fail=true;assert.equal((await g.redeemCode(code)).ok,false);assert.equal(c.calls.length,0);assert.ok((await g.redeemCode(code)).ok);});
 await check('服务器已消耗但本地写盘失败，可用同资格恢复同邮件',async()=>{const{G:g,control:c}=fresh();c.mode='saveFail';assert.equal((await g.redeemCode(code)).ok,false);const owner=c.calls[0].owner;assert.equal(g.mailboxCount(),0);c.mode='ok';assert.ok((await g.redeemCode(code)).ok);assert.equal(c.calls[1].owner,owner);assert.equal(g.mailboxCount(),1);});
 await check('断网保留资格，传奇不消耗码，重复点击不并发',async()=>{const{G:g,control:c}=fresh();g.S().difficulty='legend';assert.equal((await g.redeemCode(code)).ok,false);assert.equal(c.calls.length,0);g.S().difficulty='normal';c.mode='offline';assert.equal((await g.redeemCode(code)).ok,false);c.mode='ok';const result=await Promise.all([g.redeemCode(code),g.redeemCode(code)]);assert.equal(result.filter(x=>x.ok).length,1);assert.equal(g.mailboxCount(),1);});
 await check('另一领取资格拒绝，不虚构奖励',async()=>{const{G:g,control:c}=fresh();c.claimed='c'.repeat(64);assert.equal((await g.redeemCode(code)).ok,false);assert.equal(g.mailboxCount(),0);assert.equal(g.adCoinBalance(),0);});
 console.log(`通过 ${pass} 项，失败 ${fail} 项\nRESULT:${fail?'FAIL':'PASS'}`);process.exitCode=fail?1:0;
})();
