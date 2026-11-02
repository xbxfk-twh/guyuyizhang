/* 已达成结局的可见、可触控结算入口；隔离存储，覆盖四结局与每档一次。 */
const assert=require('node:assert/strict'),{openBrowser,pressElement}=require('../../回归测试/helpers/browser');
let b,n=0;const check=async(name,expr)=>{assert.ok(await b.ev(expr),name);console.log('OK '+name);n++;};
const tap=s=>pressElement(b.send,b.ev,s);
async function close(){await b.ev(`for(let i=0;i<15&&document.querySelector('#modal.open');i++)UI.handleBack()`);}
async function attr(){await close();await tap('[data-nav="equip"]');await tap('[data-equiptab="attr"]');}
async function boot(){await b.ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.metaState().batchTipSeen=1;if(!Game.load())throw Error("保存后重新载入失败");UI.begin()`);for(let i=0;i<100&&await b.ev(`!!document.querySelector('#loading')`);i++)await b.sleep(100);await close();}
const contrast=`(()=>{const lum=c=>{const a=c.match(/[\\d.]+/g).slice(0,3).map(v=>{v=Number(v)/255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return a[0]*.2126+a[1]*.7152+a[2]*.0722};return ['.attr-char','.attr-settle-title','.attr-settle-note'].every(s=>{const e=document.querySelector(s);if(!e)return false;let p=e,bg;while(p){bg=getComputedStyle(p).backgroundColor;if(bg!=='transparent'&&!/rgba\\([^)]*,\\s*0\\)/.test(bg))break;p=p.parentElement}const a=lum(getComputedStyle(e).color),b=lum(bg);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5})})()`;
(async()=>{try{
 for(const [key,w,h]of [['A',640,290],['B',844,390],['S',1280,720],['S2',390,844],['S2',640,290]]){
  b=await openBrowser({width:w,height:h,init:`localStorage.setItem('guyuyizhang_language','zh')`});if(w<h){await check('竖屏先提示横屏游玩',`getComputedStyle(document.documentElement,'::after').content.includes('请横屏游玩')`);await b.send('Emulation.setDeviceMetricsOverride',{width:h,height:w,deviceScaleFactor:2,mobile:true});}await boot();
  await attr();await check('无结局时没有空结算框 '+w,`!document.querySelector('.attr-settle')`);await close();
  await b.ev(`Game.S().scene='camp';Game.S().fame=4;Game.S().buildings.wall=3;Game.S().flags.boss_pirateBoss=1;UI.render()`);
  await check('达成入口保留，场景不放结算按钮 '+w,`[...document.querySelectorAll('#scene-actions .action-btn')].some(e=>e.textContent.includes('岛主'))&&![...document.querySelectorAll('#scene-actions .action-btn')].some(e=>e.textContent.includes('结算'))`);
  await b.ev(`Game.doEnding('end${key}')`);await tap('[data-choice="1"]');
  // 保留既有 ended_X 字段语义：实际持久化并重新载入后仍须能结算。
  await b.ev(`Game.save()`);await b.navigate(await b.ev('location.href'));await b.ev(`if(!Game.load())throw Error("保存后重新载入失败");UI.begin()`);for(let i=0;i<100&&await b.ev(`!!document.querySelector('#loading')`);i++)await b.sleep(100);
  await attr();
  await check('旧字段持久化后入口置顶且首屏可触控 '+key+' '+w,`(()=>{const e=document.querySelector('[data-settle="end${key}"]'),box=document.querySelector('.attr-settle'),wrap=document.querySelector('.attr-wrap'),sc=document.querySelector('.work-scroll');if(!e||!box||!wrap||!sc)return false;sc.scrollTop=0;const r=e.getBoundingClientRect(),s=sc.getBoundingClientRect();return !!(box.compareDocumentPosition(wrap)&Node.DOCUMENT_POSITION_FOLLOWING)&&r.height>=40&&r.top>=s.top-1&&r.bottom<=s.bottom+1&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})()`);
  await check('标题、说明和角色名对比度至少4.5 '+key+' '+w,contrast);
  await b.ev(`document.querySelector('.attr-portrait').dispatchEvent(new Event('error'))`);
  await check('立绘加载失败不阻断结算 '+key,`document.querySelector('.attr-portrait').getAttribute('src').includes('/identities/')&&!!document.querySelector('[data-settle="end${key}"]')`);
  await b.shot('nov02-settle-'+key+'-'+w+'.png');
  await b.ev(`window.__soul=Game.metaState().soul`);await tap('[data-settle="end'+key+'"]');
  await check('先确认且奖励和存档未动 '+key,`document.querySelector('.modal-title').textContent.includes('确认结算')&&document.querySelector('.overlay-text').textContent.includes('只能结算一个')&&Game.S().ending==null&&!Game.S().flags.settledEnding&&Game.metaState().soul===__soul&&!document.querySelector('#ending-screen')`);
  await tap('[data-choice="1"]');await check('取消返回属性，不改定局 '+key,`!!document.querySelector('[data-settle="end${key}"]')&&!Game.S().flags.settledEnding&&Game.metaState().soul===__soul`);
  await tap('[data-settle="end'+key+'"]');await tap('[data-choice="0"]');
  await check('确定后结算且关闭弹窗展示结局 '+key,`Game.S().ending==='${key}'&&Game.S().flags.settledEnding==='${key}'&&!!document.querySelector('#ending-screen')&&!document.querySelector('#modal.open')`);
  await tap('#end-stay');await attr();
  await check('继续探索显示锁定原因，不重复发奖 '+key,`!document.querySelector('[data-settle]')&&document.querySelector('.attr-settle-note').textContent.includes('每个存档只能结算一次')&&Game.checkEndingActions().every(a=>!a.id.startsWith('settle_'))`);
  await close();await b.ev(`window.__settledSoul=Game.metaState().soul;Game.doEnding('end${key==='S2'?'A':'S2'}')`);await tap('[data-choice="0"]');await attr();
  await check('已结算后新结局仍记录，明确说明不能再次结算 '+key,`Game.S().flags.ended_${key==='S2'?'A':'S2'}===1&&Game.S().flags.settledEnding==='${key}'&&Game.metaState().soul===__settledSoul&&!document.querySelector('[data-settle]')&&document.querySelector('.attr-settle-note').textContent.includes('其他结局的达成记录仍会保留')`);
  await b.ev(`Locale.set('en')`);await check('结算说明支持英文 '+key,`!/[\\u3400-\\u9fff]/.test(document.querySelector('.attr-settle-note').textContent)`);
  assert.deepEqual(b.errors,[]);await b.close();b=null;
 }
 console.log(`通过 ${n} 项，失败 0 项\nRESULT:PASS`);
}catch(e){console.error(e.stack);await b?.shot('nov02-settle-failure.png');console.log('RESULT:FAIL');process.exitCode=1;}finally{await b?.close();}})();
