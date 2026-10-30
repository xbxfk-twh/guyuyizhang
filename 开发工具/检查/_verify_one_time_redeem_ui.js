/* 当前兑换页真实触摸：投递、领取、重复拒绝；浏览器存储完全隔离。 */
const assert=require('node:assert/strict');
const {openBrowser}=require('../../回归测试/helpers/browser');
(async()=>{let browser,passed=0;try{
 browser=await openBrowser({width:667,height:375,init:`localStorage.setItem('guyuyizhang_language','zh');
 const nativeFetch=window.fetch.bind(window),claims=new Map();
 window.fetch=async(url,options)=>{if(!String(url).endsWith(':8443/v1/redeem'))return nativeFetch(url,options);
 const {code,owner}=JSON.parse(options.body),gifts={SHIYAN:{soul:0,adCoins:100},LAOBANDAQI:{soul:10000,adCoins:1000},XIEXIELAOBAN:{soul:0,adCoins:0,item:'divineSuperPack',qty:1}};
 if(claims.has(code)&&claims.get(code)!==owner)return{status:409,json:async()=>({ok:false,reason:'这个兑换码已经被使用'})};claims.set(code,owner);
 return{status:200,json:async()=>({ok:true,receipt:'remote:'+({SHIYAN:'1',LAOBANDAQI:'2',XIEXIELAOBAN:'3'}[code]).repeat(32),gift:gifts[code]})};};`});const {ev,tap,sleep}=browser;
 const check=async(name,expression)=>{assert.ok(await ev(expression),name);passed++;console.log('OK '+name);};
 await ev("Game.newGame('fisher','normal');Game.S().tut=null;UI.begin()");await sleep(2700);await ev("document.querySelector('#modal .modal-x')?.click()");
 await tap('[data-nav=save]');await tap('[data-savemenu=mail]');
 for(const [code,coins,item]of [['shiyan',100,null],['laobandaqi',1100,null],['xiexielaoban',1100,'divineSuperPack']]){
  await tap('[data-mailtab=code]');await ev(`document.querySelector('#redeem-code').value=${JSON.stringify(' '+code+' ')}`);await tap('#redeem-do');
  await check(code+' 从兑换页投递一封邮件',`Game.mailboxCount()===1&&!!Game.metaState().redeemed[${JSON.stringify(code.toUpperCase())}]`);
  await tap('[data-mailtab=mail]');await tap('[data-claimmail]');
  await check(code+' 实际领取正确奖励',`Game.mailboxCount()===0&&Game.adCoinBalance()===${coins}`+(item?`&&Game.invCount(${JSON.stringify(item)})===1`:''));
  await tap('[data-mailtab=code]');await ev(`document.querySelector('#redeem-code').value=${JSON.stringify(code.toUpperCase())}`);await tap('#redeem-do');
  await check(code+' 重复输入不重发邮件或广告点',`Game.mailboxCount()===0&&Game.adCoinBalance()===${coins}`);
 }
 await ev("window.fetch=async()=>{throw new TypeError('network unavailable')};window.XMLHttpRequest=class{constructor(){throw new TypeError('network unavailable')}};document.querySelector('#redeem-code').value='GY-'+ 'A'.repeat(32)");await tap('#redeem-do');
 await check('实际断网提示带可区分的NETWORK代号',"document.querySelector('#center-toast')?.textContent.includes('NETWORK')");
 await check('失败后保留输入且不消耗资格、不发邮件',"document.querySelector('#redeem-code').value==='GY-'+'A'.repeat(32)&&!Game.metaState().redeemed['GY-'+'A'.repeat(32)]&&Game.mailboxCount()===0&&!document.querySelector('#redeem-do').disabled");
 assert.deepEqual(browser.errors,[]);passed++;await browser.shot('one-time-redeem-667.png');await browser.shot('redeem-network-error-667.png');console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
 }finally{await browser?.close();}})().catch(error=>{console.error(error);console.log('RESULT:FAIL');process.exitCode=1;});
