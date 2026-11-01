/* 图鉴与多级弹窗：独立存储，可信手机触控，验证实际返回与滚动。 */
const assert=require('node:assert/strict'),{openBrowser}=require('../../回归测试/helpers/browser');
let b,passed=0;
const check=async(name,expression)=>{assert.ok(await b.ev(expression),name);console.log('OK '+name);passed++;};
(async()=>{try{
 for(const [width,height] of [[568,320],[667,375],[1280,720]]){
  b=await openBrowser({width,height,init:"window.GUYU_CHANNEL='taptap';"});
  await check('语言按钮紧凑透明 '+width,`(()=>{const e=document.querySelector('[data-language-toggle]'),r=e.getBoundingClientRect();return e.tagName==='BUTTON'&&r.width<=48&&r.height<=40&&getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)'&&!document.querySelector('select[data-language]')})()`);
  await b.tap('[data-language-toggle]');await check('一键切换英文 '+width,`Locale.current()==='en'&&document.querySelector('[data-language-toggle]').textContent==='中'`);
  await b.tap('[data-language-toggle]');await check('一键切回中文 '+width,`Locale.current()==='zh'&&document.querySelector('[data-language-toggle]').textContent==='EN'`);
  await b.ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().seen=Object.fromEntries(Object.keys(ITEMS).map(id=>[id,1]));for(const id of Game.monIds().slice(1))Game.S().seen['mon_'+id]=1;Game.S().seen.mon_boar=1;UI.begin()`);
  for(let n=0;n<80&&await b.ev(`!!document.querySelector('#loading')`);n++)await b.sleep(100);
  await b.ev(`UI.handleBack()`);await b.tap('[data-nav="save"]');await b.tap('[data-savemenu="settings"]');await b.tap('[data-open="collection"]');await b.tap('[data-ctab="items"]');
  await check('图鉴X固定右上且首行卡片完整可见 '+width,`(()=>{const x=document.querySelector('.modal-x').getBoundingClientRect(),m=document.querySelector('.modal-content').getBoundingClientRect(),a=document.querySelector('.col-item-tile').getBoundingClientRect(),body=document.querySelector('.col-body').getBoundingClientRect();return x.left>m.left+m.width*.8&&x.top<m.top+35&&a.bottom<=body.bottom+1})()`);
  await check('多列图标卡片且没有说明小字 '+width,`(()=>{const cards=[...document.querySelectorAll('.col-item-tile')],columns=new Set(cards.slice(0,8).map(e=>Math.round(e.getBoundingClientRect().left)));return columns.size>=4&&cards.every(e=>!!e.querySelector('.item-icon'))&&!document.querySelector('.col-item-tile small')})()`);
  await b.ev(`document.querySelector('.col-body').scrollTop=180`);
  const scroll=await b.ev(`document.querySelector('.col-body').scrollTop`);
  await b.ev(`document.querySelector('[data-iteminfo="branch"]').click()`);
  await check('详情只留关闭按钮 '+width,`!document.querySelector('[data-item-back]')&&document.querySelector('#modal-close')&&document.querySelector('.modal-x').getAttribute('aria-label')==='返回上一级'`);
  await b.tap('#modal-close');
  await check('关闭回到同一页签和滚动位置 '+width,`document.querySelector('[data-ctab="items"]').classList.contains('active')&&Math.abs(document.querySelector('.col-body').scrollTop-${scroll})<=1`);
  await b.ev(`document.querySelector('[data-iteminfo="branch"]').click()`);await b.tap('.modal-x');
  await check('详情X同样返回图鉴 '+width,`!!document.querySelector('[data-ctab="items"].active')`);
  await b.tap('[data-ctab="mon"]');await b.sleep(300);
  await check('怪物透明图加载、未发现不泄露图像 '+width,`(()=>{const e=document.querySelector('[data-monster="boar"] img');return e.complete&&e.naturalWidth>0&&+getComputedStyle(e).opacity>0&&+getComputedStyle(e).opacity<.3&&[...document.querySelectorAll('.col-mon-grid .unseen')].every(e=>e.textContent==='未发现'&&!e.querySelector('img'))&&!/[a-zA-Z?]/.test(document.querySelector('.col-mon-grid').textContent)})()`);
  await b.ev(`document.querySelector('.col-body').scrollTop=0`);await b.shot('collection-monsters-'+width+'.png');await b.tap('[data-ctab="items"]');await b.ev(`document.querySelector('.col-body').scrollTop=0`);await b.shot('collection-items-'+width+'.png');
  await b.tap('.modal-x');await check('图鉴X返回设置 '+width,`!!document.querySelector('[data-open="collection"]')`);
  await b.ev(`UI.handleBack()`);await check('原生返回键回大菜单 '+width,`!!document.querySelector('[data-savemenu="col"]')`);
  await b.tap('.modal-x');await check('根弹窗X关闭整个菜单 '+width,`!document.querySelector('#modal.open')`);
  assert.deepEqual(b.errors,[]);await b.close();b=null;
 }
 console.log('通过 '+passed+' 项，失败 0 项\nRESULT:PASS');
}catch(e){console.error(e.stack);await b?.shot('collection-navigation-failure.png');process.exitCode=1;console.log('RESULT:FAIL');}finally{await b?.close();}})();
