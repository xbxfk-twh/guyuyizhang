/* 界面连续重绘后图标尺寸和遮挡复现；隔离配置。 */
const assert=require('node:assert/strict'),{openBrowser,pressElement}=require('../../回归测试/helpers/browser');let b,n=0;
const check=async(name,expr)=>{const result=await b.ev(expr);assert.ok(result===true,name+' '+JSON.stringify(result));console.log('OK '+name);n++;};
async function menu(){await b.ev(`for(let i=0;i<20&&document.querySelector('#modal.open');i++)UI.handleBack()`);await pressElement(b.send,b.ev,await b.ev(`document.querySelector('[data-nav="save"]')?'[data-nav="save"]':'#btn-set'`));}
const bounds=`(()=>{const images=[...document.querySelectorAll('#modal .item-icon,#modal img')];if(!images.length)return 'no icons';const bad=images.filter(e=>{const r=e.getBoundingClientRect(),card=e.closest('.cabinet-product,.col-item-tile'),p=card?.getBoundingClientRect(),c=getComputedStyle(e);return !card||r.width>64||r.height>64||r.left<p.left-1||r.top<p.top-1||r.right>p.right+1||r.bottom>p.bottom+1||c.position==='absolute'||c.animationName.includes('kenburns')});return bad.length?bad.map(e=>({html:e.outerHTML,r:e.getBoundingClientRect().toJSON(),style:getComputedStyle(e).cssText})):true})()`;
(async()=>{try{
 for(const skins of [[],['seasons'],['armory','card','accent']]){
 // 主菜单没有当前局，弹窗仍嵌在标题容器里，必须先检查这条入口。
 b=await openBrowser({width:960,height:432,init:`window.GUYU_CHANNEL='standalone';localStorage.setItem('guyuyizhang_language','zh')`});
 await b.ev(`Game.metaState().skins={armory:1,card:1,accent:1};Game.metaState().adWallet={fixture:{coins:5,soul:0}};Game.metaState().soul=147;for(const id of Object.keys(ITEMS))Game.metaState().seenItems[id]=1`);
 await menu();await pressElement(b.send,b.ev,'[data-savemenu="settings"]');for(const skin of skins)await b.ev(`document.querySelector('[data-set="skin:${skin}"]').click()`);
 await menu();await pressElement(b.send,b.ev,'[data-savemenu="adshop"]');await check('主菜单商城初始图片 '+skins,bounds);
 await pressElement(b.send,b.ev,'[data-shop-gift]');await check('主菜单领取每日赠礼后图片 '+skins,bounds);await check('主菜单赠礼正确发放且不可重复',`Game.adCoinBalance()>=6&&Game.adCoinBalance()<=10&&document.querySelector('[data-shop-gift]').disabled&&Game.metaState().soul===147`);
 await check('主菜单关闭按钮未被图片挡住',`(()=>{const e=document.querySelector('.modal-x'),r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})()`);await b.shot('icon-title-gift-'+(skins[0]||'ink')+'.png');
 await menu();await pressElement(b.send,b.ev,'[data-savemenu="col"]');await check('主菜单图鉴物品图片 '+skins,bounds);
 await pressElement(b.send,b.ev,'[data-ctab="tool"]');await check('主菜单切换工具后图片 '+skins,bounds);
 await pressElement(b.send,b.ev,'[data-ctab="items"]');await check('主菜单切回物品后图片 '+skins,bounds);
 await pressElement(b.send,b.ev,'[data-iteminfo="divinePack"]');await pressElement(b.send,b.ev,'.modal-x');await check('主菜单图鉴详情逐级返回后图片 '+skins,bounds);
 await check('仅标题背景保留全屏动画',`(()=>{const e=document.querySelector('#title-screen>img'),c=getComputedStyle(e),r=e.getBoundingClientRect();return c.position==='absolute'&&c.animationName==='kenburns'&&r.width>=innerWidth*.95&&!document.querySelector('#modal .item-icon').getAnimations().some(a=>a.animationName==='kenburns')})()`);
 await b.shot('icon-title-collection-'+(skins[0]||'ink')+'.png');assert.deepEqual(b.errors,[]);await b.close();b=null;
 b=await openBrowser({width:844,height:390,init:`window.GUYU_CHANNEL='standalone';localStorage.setItem('guyuyizhang_language','zh')`});
 await b.ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.metaState().batchTipSeen=1;Game.metaState().skins={armory:1,card:1,accent:1};Game.metaState().adWallet={fixture:{coins:100,soul:0}};for(const id of Object.keys(ITEMS)){Game.metaState().seenItems[id]=1;Game.S().seen[id]=1}UI.begin()`);for(let i=0;i<90&&await b.ev(`!!document.querySelector('#loading')`);i++)await b.sleep(100);
 await menu();await pressElement(b.send,b.ev,'[data-savemenu="settings"]');for(const skin of skins)await b.ev(`document.querySelector('[data-set="skin:${skin}"]').click()`);
 await menu();await pressElement(b.send,b.ev,'[data-savemenu="adshop"]');await check('商城初始图标 '+skins,bounds);
 await pressElement(b.send,b.ev,'[data-shop-gift]');await check('领取每日赠礼后的所有图片 '+skins,bounds);await b.shot('icon-gift-'+(skins[0]||'ink')+'.png');
 for(let k=0;k<1;k++){
 await menu();await pressElement(b.send,b.ev,'[data-savemenu="col"]');await check('图鉴物品首屏 '+skins+' '+k,bounds);
 await pressElement(b.send,b.ev,'[data-ctab="tool"]');await check('图鉴切工具 '+skins+' '+k,bounds);
 await pressElement(b.send,b.ev,'[data-ctab="items"]');await check('图鉴切回物品 '+skins+' '+k,bounds);
 await pressElement(b.send,b.ev,'[data-iteminfo="divinePack"]');await pressElement(b.send,b.ev,'.modal-x');await check('图鉴详情返回 '+skins+' '+k,bounds);
 }
 assert.deepEqual(b.errors,[]);await b.close();b=null;
 }
 console.log(`通过 ${n} 项，失败 0 项\nRESULT:PASS`);
}catch(e){console.error(e.stack);await b?.shot('icon-refresh-failure.png');console.log('RESULT:FAIL');process.exitCode=1;}finally{await b?.close();}})();
