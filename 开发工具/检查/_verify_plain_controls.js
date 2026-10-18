/* Independent browser checks for plain single-row controls and real unequip clicks. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-mobile-')),port=9598;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const json=url=>new Promise((res,rej)=>http.get(url,r=>{let s='';r.on('data',x=>s+=x);r.on('end',()=>{try{res(JSON.parse(s));}catch(e){rej(e);}});}).on('error',rej));
let passed=0,fail=0,ws,ch;const errors=[];
(async()=>{try{
 ch=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--allow-file-access-from-files','--remote-debugging-port='+port,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
 let tab;for(let i=0;i<80&&!tab;i++){await sleep(200);try{tab=(await json('http://127.0.0.1:'+port+'/json/list')).find(t=>t.type==='page');}catch{}}
 assert.ok(tab);ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let seq=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);};
 const send=(method,params={})=>new Promise((r,j)=>{const id=++seq;pending.set(id,m=>m.error?j(Error(JSON.stringify(m.error))):r(m.result));ws.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
 const check=async(name,expr)=>{const ok=await ev(expr);if(!ok){await shot('mobile-ui-failure.png');console.error(await ev(`JSON.stringify([...document.querySelectorAll('[data-separate], .room-sprite')].map(e=>({name:e.getAttribute('aria-label')||e.title,rect:e.getBoundingClientRect().toJSON(),hit:document.elementFromPoint(e.getBoundingClientRect().x+e.offsetWidth/2,e.getBoundingClientRect().y+e.offsetHeight/2)?.outerHTML.slice(0,180)})))`));}assert.ok(ok,name);passed++;console.log('OK '+name);};
 const shot=async(name)=>{const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name),Buffer.from(r.data,'base64'));};
 await send('Runtime.enable');await send('Page.enable');



 const ready=async()=>{for(let i=0;i<80;i++){if(await ev(`(()=>{const e=document.querySelector('#scene-img');return e?.complete&&e.naturalWidth>0&&!document.querySelector('#loading')?.classList.contains('show');})()`))return;await sleep(100);}throw Error('场景图未就绪');};

 const tap=async selector=>{await sleep(250);const q=await ev(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`),x=q.x+q.width/2,y=q.y+q.height/2;assert.ok(x>0&&x<innerWidthValue&&y>0&&y<innerHeightValue,'按钮须真实在窗口内');await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});await sleep(250);};
 let innerWidthValue=0,innerHeightValue=0;
 for(const [w,h]of [[568,320],[667,375],[844,390],[1366,768]]){
  innerWidthValue=w;innerHeightValue=h;
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<1000});await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(4500);
  await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().capacity=999;Game.S().toolkit=[null,null,null];for(const id of ['axeStone','pickStone','knifeStone']){if(!Game.invCount(id))Game.addItem(id,1,true);Game.equipTool(id);}for(const id of Object.keys(ITEMS).filter(id=>ITEMS[id].tool)){if(!Game.invCount(id))Game.addItem(id,1,true);}if(!Game.invCount('basket'))Game.addItem('basket',1,true);Game.equipToSlot('knifeStone','weapon');UI.begin();document.querySelector('#modal .modal-x')?.click();`);await sleep(3200);
  await tap('[data-nav="equip"]');await tap('[data-unequip-slot="weapon"]');
  await check('装备总览卸下按钮真实点击且不误开更换页 '+w,`Game.S().equipment.weapon===null&&!!document.querySelector('[data-equipped-slot="weapon"]')&&Game.invCount('knifeStone')>0`);
  await tap('[data-eqpick="tool"]');
  await check('手机/电脑四个工具操作同一行且可完整点到 '+w,`(()=>{const a=[...document.querySelectorAll('.equipment-picker-actions button')],r=a.map(e=>e.getBoundingClientRect());return a.length===4&&r.every(q=>Math.abs(q.top-r[0].top)<1&&q.left>=0&&q.right<=innerWidth&&q.bottom<=innerHeight);})()`);
  await check('关闭按钮仍在标题右侧 '+w,`(()=>{const a=document.querySelector('.modal-x').getBoundingClientRect(),b=document.querySelector('.modal-title').getBoundingClientRect();return Math.abs(a.top-b.top)<2&&a.left>b.left+b.width*.8;})()`);
  await check('工具操作朴素方框无阴影或圆角 '+w,`[...document.querySelectorAll('.equipment-picker-actions button')].every(e=>{const c=getComputedStyle(e);return c.boxShadow==='none'&&c.borderRadius==='0px'&&c.borderTopWidth==='1px';})`);
  await check('物品列表可滚动但名称耐久不压扁 '+w,`[...document.querySelectorAll('.equipment-picker>.inv-item')].every(e=>{const r=e.getBoundingClientRect(),n=e.querySelector('small').getBoundingClientRect();return r.height>=104&&n.top>=r.top&&n.bottom<=r.bottom;})`);
  await shot('plain-tools-'+w+'.png');
  await ev(`window.beforeTools=Object.fromEntries(['axeStone','pickStone','knifeStone'].map(id=>[id,{qty:Game.invCount(id),dur:Game.durOf(id)}]));`);
  for(const id of ['axeStone','pickStone','knifeStone']){
   await tap('[data-unequiptool="'+id+'"]');
   await check('真实点击卸下 '+id+' 清空栏位并保留物品耐久 '+w,`!Game.S().toolkit.includes('${id}')&&Game.invCount('${id}')===beforeTools['${id}'].qty&&Game.durOf('${id}')===beforeTools['${id}'].dur&&!!document.querySelector('.loadout-tools')`);
   await tap('[data-eqpick="tool"]');
  }
  await check('工具选择页不再出现已卸下按钮 '+w,`document.querySelectorAll('[data-unequiptool]').length===0`);
  await tap('[data-loadout-back]');await tap('#modal .modal-x');await tap('[data-nav="inv"]');
  await check('背包精简入口同排方框 '+w,`(()=>{const e=document.querySelector('.inventory-view-tabs'),a=[...e.children],r=a.map(v=>v.getBoundingClientRect());return !document.querySelector('.pack-picker,[data-loot-open],[data-store-all],[data-invequip]')&&r.every(q=>Math.abs(q.top-r[0].top)<1)&&a.every(v=>getComputedStyle(v).borderRadius==='0px');})()`);
  await shot('plain-pack-'+w+'.png');
  await ev(`Game.save();Game.load();UI.render();`);
  await check('保存重载后工具仍未装备 '+w,`Game.S().toolkit.every(id=>id===null)`);
 }
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{try{ws?.close();ch?.kill();}catch{}console.log('通过 '+passed+' 项，失败 '+fail+' 项');console.log('RESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();
