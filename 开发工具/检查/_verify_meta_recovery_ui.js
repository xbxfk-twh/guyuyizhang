/* 账号空对象恢复的真实启动、历代遗章展示、升级保存与故障阻断。 */
const assert=require('node:assert/strict'),{openBrowser,pressElement}=require('../../回归测试/helpers/browser');let b,count=0;
const check=async(name,expr)=>{assert.ok(await b.ev(expr),name);console.log('OK '+name);count++;};
(async()=>{try{
 b=await openBrowser({width:844,height:390});
 const fixture=await b.ev(`(()=>{Game.newGame('fisher','normal');const m=Game.metaState(),id=META_NODES.find(n=>n.max>2).id;m.soul=321;m.nodes[id]=1;m.runs=4;m.totalSoul=900;m._accountRev=10;m.slots=[{data:JSON.parse(JSON.stringify(Game.S())),day:1},null,null];return {id,meta:JSON.stringify(m),save:JSON.stringify(Game.S())}})()`);await b.close();b=null;
 for(const primary of ['{}','{"_accountRev":999}']){
  const init=`if(!sessionStorage.seeded){localStorage.setItem('guyuyizhang_meta',${JSON.stringify(primary)});localStorage.setItem('guyuyizhang_meta_bak',${JSON.stringify(fixture.meta)});localStorage.setItem('guyuyizhang_save',${JSON.stringify(fixture.save)});sessionStorage.seeded='1';}`;
  b=await openBrowser({width:844,height:390,init});await b.sleep(250);
  await check('损坏主档启动恢复魂点和天赋 '+primary,`!!document.querySelector('#btn-load')&&Game.metaState().soul===321&&Game.metaState().nodes[${JSON.stringify(fixture.id)}]===1&&Game.metaState().runs===4&&Game.metaState().slots[0].day===1`);
  await pressElement(b.send,b.ev,'#btn-meta');await check('历代遗章实际显示恢复余额和已升级节点',`document.querySelector('#modal').textContent.includes('321')&&!!document.querySelector('[data-meta-buy="${fixture.id}"]')`);
  await pressElement(b.send,b.ev,`[data-meta-buy="${fixture.id}"]`);await check('恢复后合法升级不重置账号，立即持久化',`Game.metaState().soul<321&&Game.metaState().nodes[${JSON.stringify(fixture.id)}]===2&&JSON.parse(localStorage.getItem('guyuyizhang_meta')).nodes[${JSON.stringify(fixture.id)}]===2`);
  const soul=await b.ev('Game.metaState().soul');await b.navigate(await b.ev('location.href'));await b.sleep(250);
  await check('重新打开后保留新余额、天赋和结算史',`Game.metaState().soul===${soul}&&Game.metaState().nodes[${JSON.stringify(fixture.id)}]===2&&Game.metaState().runs===4&&Game.metaState().slots[0].day===1`);
  assert.deepEqual(b.errors,[]);await b.shot('nov02-meta-recovered.png');await b.close();b=null;
 }
 b=await openBrowser({width:844,height:390,init:`localStorage.setItem('guyuyizhang_meta','{}');localStorage.setItem('guyuyizhang_meta_bak','broken');localStorage.setItem('guyuyizhang_save',${JSON.stringify(fixture.save)});`});await b.sleep(300);
 await check('无有效备份时明确阻止启动，不创建空历代遗章',`document.querySelector('#boot-status').textContent.includes('账号记录损坏')&&!document.querySelector('#btn-new')&&localStorage.getItem('guyuyizhang_meta')==='{}'&&localStorage.getItem('guyuyizhang_meta_bak')==='broken'&&localStorage.getItem('guyuyizhang_save')===${JSON.stringify(fixture.save)}`);
 await b.shot('nov02-meta-blocked.png');assert.deepEqual(b.errors,[]);
 console.log(`通过 ${count} 项，失败 0 项\nRESULT:PASS`);
}catch(e){console.error(e.stack);await b?.shot('nov02-meta-failure.png');console.log('RESULT:FAIL');process.exitCode=1;}finally{await b?.close();}})();
