/* 手机横屏商品图片边界、交易长文布局；隔离存储和真实触控。 */
const assert=require('node:assert/strict'),{openBrowser}=require('../../回归测试/helpers/browser');
let b,count=0;const check=async(name,expr)=>{assert.ok(await b.ev(expr),name);console.log('OK '+name);count++;};
async function menu(){await b.ev(`for(let n=0;n<15&&document.querySelector('#modal.open');n++)UI.handleBack()`);await b.tap('[data-nav="save"]');}
(async()=>{try{
 for(const skin of [[],['seasons'],['armory','card','accent']]){
  b=await openBrowser({width:640,height:290,init:`window.GUYU_CHANNEL='taptap';localStorage.setItem('guyuyizhang_language','zh');localStorage.setItem('guyuyizhang_skin',${JSON.stringify(JSON.stringify(skin))});`});
  await b.ev(`Game.metaState().skins={armory:1,card:1,accent:1};Game.newGame('fisher','normal');Game.S().tut=null;Game.metaState().batchTipSeen=1;Game.metaState().adWallet={fixture:{coins:100,soul:0}};Game.S().inv.beibi=99999;Game.S().inv.coin=999;Game.S().laochao.arrived=true;UI.begin()`);
  for(let n=0;n<80&&await b.ev(`!!document.querySelector('#loading')`);n++)await b.sleep(100);
  await menu();await b.tap('[data-savemenu="settings"]');
  for(const id of skin) await b.ev(`(()=>{const e=document.querySelector('[data-set="skin:${id}"]');if(!e)throw Error('missing skin '+${JSON.stringify(id)});if(!e.classList.contains('active'))e.click()})()`);
  await check('皮肤实际启用 '+skin,`[...document.querySelectorAll('[data-set^="skin:"].active')].map(e=>e.dataset.set.slice(5)).sort().join()===${JSON.stringify([...skin].sort().join())}`);
  for(const [w,h]of [[640,290],[844,390],[1280,580]]){
   await b.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:2,mobile:true});await menu();await b.tap('[data-savemenu="adshop"]');
   for(const lang of ['zh','en']){
    await b.ev(`Locale.set('${lang}')`);await b.sleep(250);
    await check('全部商品图不溢出并保留原始尺寸兜底 '+skin+' '+w+' '+lang,`[...document.querySelectorAll('.cabinet-product')].every(e=>{const p=e.getBoundingClientRect();return [...e.querySelectorAll('img,.item-icon,b')].every(i=>{const r=i.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=p.left&&r.right<=p.right&&r.top>=p.top&&r.bottom<=p.bottom&&(!i.matches('img')||(i.complete&&i.naturalWidth>0&&i.getAttribute('width')==='32'&&i.getAttribute('height')==='32'&&r.width<=64&&r.height<=64))})})`);
   }
   await b.ev(`Locale.set('zh')`);await b.shot('nov02-cabinet-'+w+'-'+(skin[0]||'ink')+'.png');
   await menu();await b.tap('.modal-x');await b.ev(`Game.S().scene='atlantis';Game.S().relics=['atlantisSeed'];Game.S().atlantis=Game.S().atlantis||{unlocked:1,visited:1,camp:{furniture:{},buildings:{}}};Game.S().zone='city';Game.S().atlantis.vendor={day:Game.S().day,rolled:true,id:'vampire',sold:false};Game.doPoint(Game.pointsOf().find(p=>p.type==='atlTrade'))`);await b.sleep(350);
   await check('交易机长名称、说明、价格、按钮互不重叠 '+skin+' '+w,`[...document.querySelectorAll('.merchant-goods .help-item.trade-card')].every(e=>{const box=e.getBoundingClientRect(),title=e.querySelector('b').getBoundingClientRect(),text=e.querySelector('span').getBoundingClientRect(),button=e.querySelector('button').getBoundingClientRect();return title.width>=box.width*.45&&title.bottom<=text.top+1&&title.right<=button.left+1&&text.right<=button.left+1&&button.right<=box.right&&button.bottom<=box.bottom})`);
   await b.ev(`document.querySelector('[data-arelic]').scrollIntoView({block:'center'})`);await b.shot('nov02-trade-'+w+'-'+(skin[0]||'ink')+'.png');
   await b.ev(`for(let n=0;n<15&&document.querySelector('#modal.open');n++)UI.handleBack();Game.S().scene='camp';`);
  }
  await b.ev(`for(let n=0;n<15&&document.querySelector('#modal.open');n++)UI.handleBack();Game.S().scene='atlantis';Game.S().zone='shipwreck';Game.doPoint(Game.pointsOf().find(p=>p.id==='atl_fishman'))`);
  await b.sleep(350);await check('鱼人种子交换卡片保持正常宽度 '+skin,`(()=>{const e=[...document.querySelectorAll('.merchant-goods .trade-card')].find(e=>e.textContent.includes('亚特兰蒂斯之种'));if(!e)return false;const p=e.getBoundingClientRect(),name=e.querySelector('b').getBoundingClientRect(),button=e.querySelector('button').getBoundingClientRect();return name.width>=p.width*.45&&name.right<=button.left+1&&button.right<=p.right})()`);
  await b.shot('nov02-fishman-'+(skin[0]||'ink')+'.png');await b.ev(`for(let n=0;n<15&&document.querySelector('#modal.open');n++)UI.handleBack()`);
  // 真正点击神物交易，验证布局调整不改变购买扣款与授予。
  await b.ev(`Game.S().scene='atlantis';Game.S().atlantis=Game.S().atlantis||{unlocked:1,visited:1,camp:{furniture:{},buildings:{}}};Game.S().zone='city';Game.S().atlantis.vendor={day:Game.S().day,rolled:true,id:'vampire',sold:false};window.__shells=Game.invCount('beibi');window.__cost=Game.atlVendorInfo().price;Game.doPoint(Game.pointsOf().find(p=>p.type==='atlTrade'))`);
  await b.tap('[data-arelic]');await check('购买神物正确扣款且只授予一次 '+skin,`Game.S().relics.includes('vampire')&&Game.invCount('beibi')===__shells-__cost&&document.querySelector('.merchant-goods').textContent.includes('今日已售出')`);
  assert.deepEqual(b.errors,[]);await b.close();b=null;
 }
 console.log(`通过 ${count} 项，失败 0 项\nRESULT:PASS`);
}catch(e){console.error(e.stack);await b?.shot('nov02-shop-failure.png');process.exitCode=1;console.log('RESULT:FAIL');}finally{await b?.close();}})();
