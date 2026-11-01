/* 隔离Chrome：手机背包、装备、仓库、旧布局与物资迁移、素材及语音。 */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-mobile-')),port=9589;
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
 const waitRoomLayout=async()=>{let last='',stable=0;for(let i=0;i<40;i++){const state=await ev(`(()=>{const imgs=[...document.querySelectorAll('.room-stage img')],sprites=[...document.querySelectorAll('.room-sprite')];if(!imgs.length||sprites.length<=10||imgs.some(e=>!e.complete||!e.naturalWidth))return '';return JSON.stringify(sprites.map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));})()`);stable=state&&state===last?stable+1:0;last=state;if(stable>=2)return;await sleep(100);}throw Error('房间图片或布局未稳定');};
 const check=async(name,expr)=>{const ok=await ev(expr);if(!ok){await shot('mobile-ui-failure.png');console.error(await ev(`JSON.stringify([...document.querySelectorAll('[data-separate], .room-sprite')].map(e=>({name:e.getAttribute('aria-label')||e.title,rect:e.getBoundingClientRect().toJSON(),hit:document.elementFromPoint(e.getBoundingClientRect().x+e.offsetWidth/2,e.getBoundingClientRect().y+e.offsetHeight/2)?.outerHTML.slice(0,180)})))`));}assert.ok(ok,name);passed++;console.log('OK '+name);};
 const shot=async(name)=>{const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name),Buffer.from(r.data,'base64'));};
 await send('Runtime.enable');await send('Page.enable');

 for(const [w,h]of [[667,375],[844,390],[1366,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<1000});
  await send('Page.navigate',{url:require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href});await sleep(4000);
  await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().capacity=999;Game.addItem('reedPack',1,true);UI.begin();document.querySelector('#modal .modal-x')?.click();document.querySelector('[data-nav="inv"]').click();`);await sleep(3200);
  for(let i=0;i<300;i++){if(await ev(`!document.querySelector('#loading')||getComputedStyle(document.querySelector('#loading')).display==='none'`))break;await sleep(100);}
  await check('背包更换和仓库入口 '+w,`!!document.querySelector('[data-player-panel="equip"]')&&[...document.querySelectorAll('#hotspots .hotspot')].some(e=>/仓库/.test(e.textContent))`);
  await check('背包显示独立立绘 '+w,`(()=>{const i=document.querySelector('[data-item="reedPack"] img');return !!i&&i.src.includes('/reedPack.png')&&i.complete&&i.naturalWidth>0;})()`);
  await ev(`document.querySelector('[data-player-panel="equip"]')?.click();document.querySelector('[data-eqpick="pack"]').click();document.querySelector('[data-pack="reedPack"]').click();`);
  await shot('mobile-inventory-'+w+'.png');
  await check('背包槽可见可点 '+w,`(()=>{const e=document.querySelector('[data-eqpick="pack"]');if(!e)return false;e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return r.width>0&&r.right<=innerWidth&&r.bottom<innerHeight&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})()`);
  await check('实际更换背包 '+w,`Game.S().backpack==='reedPack'`);
  await ev(`document.querySelector('#modal .modal-x')?.click();[...document.querySelectorAll('#hotspots .hotspot')].find(e=>/仓库|海底储物箱/.test(e.textContent)).click();`);await sleep(400);
  await check('仓库复用背包分类和卡片布局 '+w,`document.querySelectorAll('[data-invcat][data-invsource="bag"]').length===8&&document.querySelectorAll('[data-invcat][data-invsource="warehouse"]').length===8&&document.querySelector('#modal').textContent.includes('/15')&&!!document.querySelector('[data-bag-open]')`);
  await shot('mobile-warehouse-'+w+'.png');
  await ev(`document.querySelector('[data-bag-open]').click();document.querySelector('[data-item="wood"]').click();window.bagWood=Game.invCount('wood');window.storeWood=Game.warehouseState().inv.wood||0;document.querySelector('[data-ware-transfer][data-dir="in"][data-qty="1"]').click();`);
  await check('营地点击物品存入成功 '+w,`Game.invCount('wood')===bagWood-1&&(Game.warehouseState().inv.wood||0)===storeWood+1`);
  await ev(`document.querySelector('.item-detail-modal .modal-x').click();document.querySelector('#modal .modal-x')?.click();[...document.querySelectorAll('#hotspots .hotspot')].find(e=>/仓库|海底储物箱/.test(e.textContent)).click();`);await sleep(450);
  await check('仓库双栏物品有直接取出入口 '+w,`!!document.querySelector('[data-warehouse-item="wood"]')&&document.querySelectorAll('.inventory-pane').length===2`);
  const {pressElement}=require('../../回归测试/helpers/browser');
  await pressElement(send,ev,'[data-warehouse-item="wood"]',{touch:w<1000});
  await check('取出保留其他库存 '+w,`Game.invCount('wood')===bagWood&&(Game.warehouseState().inv.wood||0)===storeWood`);
  await ev(`document.querySelector('#modal .modal-x')?.click();document.querySelector('[data-nav="equip"]').click();`);await sleep(250);
  await shot('mobile-equipment-'+w+'.png');
  await check('合并总览五装备四工具三神物 '+w,`document.querySelectorAll('[data-equipped-slot]').length===5&&document.querySelectorAll('.loadout-tools>button').length===4&&document.querySelectorAll('.loadout-relics>button').length===3&&!document.querySelector('[data-equiptab="p2"]')&&!document.querySelector('[data-equiptab="p3"]')`);
  await check('装备槽都有可见图标，空槽保留占位 '+w,`(()=>{const rows=[...document.querySelectorAll('[data-equipped-slot]')];return rows.length===5&&rows.every(e=>{const i=e.querySelector('.item-icon'),r=i?.getBoundingClientRect();return r?.width>=20&&r.height>=20;});})()`);
  await check('神物解锁价格完整可读 '+w,`[...document.querySelectorAll('.loadout-relics .locked small')].every(e=>e.scrollWidth<=e.clientWidth&&e.textContent.includes('金币'))`);
  await check('总览所有槽位一屏可点 '+w,`[...document.querySelectorAll('.loadout-row,.loadout-slot')].every(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<innerHeight&&r.right<=innerWidth&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})`);
  await ev(`Game.S().identity='linghui';document.querySelector('[data-equiptab="p1"]').click();`);await sleep(600);await shot('loadout-linghui-'+w+'.png');
  await check('角色头像正方形完整填框 '+w,`(()=>{const f=document.querySelector('.loadout-card'),i=f.querySelector('img'),r=f.getBoundingClientRect();return Math.abs(r.width-r.height)<2&&i.complete&&i.naturalWidth>0&&getComputedStyle(i).objectFit==='cover';})()`);
  await ev(`document.querySelector('[data-eqpick="pack"]').click();document.querySelector('[data-unpack]').click();`);
  await check('背包槽卸下不再加容量 '+w,`!Game.S().backpack&&Game.capacity()===999`);
  await ev(`document.querySelector('[data-eqpick="pack"]').click();document.querySelector('[data-pack="reedPack"]').click();`);
  await check('黄框背包槽实际装备 '+w,`Game.S().backpack==='reedPack'&&Game.capacity()===1007&&!!document.querySelector('.backpack-slot')`);
  await ev(`Game.addItem('blackGreatSword',1,true);document.querySelector('[data-eqpick="weapon"]').click();document.querySelector('[data-equip="blackGreatSword"]').click();`);await sleep(250);
  await check('玄铁大剑可选并显示双手占用 '+w,`Game.S().equipment.weapon==='blackGreatSword'&&document.querySelector('[data-equipped-slot="weapon"]').textContent.includes('玄铁大剑')&&document.querySelector('[data-equipped-slot="weapon2"]').textContent.includes('双手占用')`);
  await ev(`document.querySelector('[data-equiptab="attr"]').click();`);await sleep(200);
  await check('属性两列与健康值 '+w,`(()=>{const a=document.querySelector('.attr-left .help-list');return getComputedStyle(a).gridTemplateColumns.split(' ').length===2&&a.textContent.includes('健康值');})()`);
  await check('属性人物卡取消固定 '+w,`getComputedStyle(document.querySelector('.attr-right')).position==='static'`);
  await shot('mobile-attributes-'+w+'.png');
  await ev(`document.querySelector('[data-equiptab="skill"]').click();`);await sleep(200);
  await check('技能三分支同排 '+w,`(()=>{const a=[...document.querySelectorAll('.skill-col')];return a.length===3&&Math.max(...a.map(e=>e.getBoundingClientRect().top))-Math.min(...a.map(e=>e.getBoundingClientRect().top))<2;})()`);
  await shot('mobile-skills-'+w+'.png');
  await ev(`document.querySelector('#modal .modal-x')?.click();[...document.querySelectorAll('.hotspot')].find(e=>e.textContent.includes('营地建造')).click();document.querySelector('[data-help="furn"]').click();`);await sleep(300);
  await check('家具作用名称说明分行 '+w,`(()=>{const e=document.querySelector('.camp-help-list .help-item');return !!e&&(innerWidth>820&&innerHeight>520||getComputedStyle(e).display==='block');})()`);
  await shot('mobile-furniture-help-'+w+'.png');
  await ev(`for(let i=0;i<12&&document.querySelector('#modal.open');i++)UI.handleBack();Game.S().roomLayout={floorRest:[78,30]};[...document.querySelectorAll('.hotspot')].find(e=>e.textContent.includes('进屋')).click();`);await sleep(1200);
  await check('室内保留简洁界面及旧档家具位置 '+w,`!document.querySelector('#room-arrange,#room-reset')&&document.querySelector('[data-furniture="floorRest"]').style.left==='78%'`);
  await ev(`Game.save();Game.load();UI.render();`);
  await check('保存重载保留已有家具布局且不绑定拖动 '+w,`Game.S().roomLayout.floorRest[0]===78&&Game.S().roomLayout.floorRest[1]===30&&typeof document.querySelector('[data-furniture="floorRest"]').onpointerdown!=='function'`);
  await require('../../回归测试/helpers/browser').pressElement(send,ev,'[data-furniture="floorRest"]',{touch:w<1000});
  await check('家具仍可实际点击打开休息界面 '+w,`!!document.querySelector('#modal.open [data-sleep]')`);
  await shot('mobile-room-'+w+'.png');
  await ev(`document.querySelector('#modal .modal-x').click();document.querySelector('#room-exit').click();Game.S().scene='forest';Game.S().zone='edge';UI.render();`);await sleep(500);
  await check('热点保留原位且无补入口 '+w,`(()=>{const spots=[...document.querySelectorAll('#hotspots>.hotspot')];return spots.length>0&&!document.querySelector('#crop-shortcuts')&&spots.every(e=>getComputedStyle(e).display!=='none');})()`);
  await shot('mobile-scene-'+w+'.png');await ev(`Game.S().statuses.poison=1;Game.startFight(ENEMIES.boar,true);`);await sleep(700);
  await check('战斗日志两按钮已删除 '+w,`document.querySelectorAll('[data-bpanel]').length===0`);
  await shot('mobile-battle-'+w+'.png');
  await check('战斗buff弹窗保留战場和回合 '+w,`(()=>{const r=Game.S().combat.round,board=document.querySelector('.battle-board'),b=[...document.querySelectorAll('[data-combat-buff]')].find(e=>e.textContent==='中毒');if(!b)return false;b.click();const p=document.querySelector('#battle-buff-info');if(!p||!p.textContent.includes('3'))return false;p.querySelector('button').click();return board===document.querySelector('.battle-board')&&Game.S().combat.round===r&&!document.querySelector('#battle-buff-info');})()`);
 }
 await ev(`Game.S().stats.hp=10000;Game.S().combat.enemies[0].ehp=1;Game.S().combat.dist=0;window.oldRand=Math.random;Math.random=()=>0;document.querySelector('[data-fact="attack"]').click();Math.random=oldRand;`);await sleep(2000);
 await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().statuses.poison=1;UI.begin();document.querySelector('#modal .modal-x')?.click();UI.render();`);await sleep(700);
 await check('buff只显示名称并支持弹窗',`(()=>{const b=document.querySelector('[data-buff-info="all"]');if(!b)return false;b.click();return document.querySelector('#modal').textContent.includes('3')&&document.querySelector('#modal').textContent.includes('中毒');})()`);
 await ev(`document.querySelector('#modal .modal-x')?.click();Game.S().scene='atlantis';Game.S().zone='habitat';Game.S().atlantis={camp:{furniture:{seaStorage1:true},buildings:{}}};UI.render();`);await sleep(500);
 await check('海底箱热点能打开独立仓库',`(()=>{const b=[...document.querySelectorAll('.hotspot')].find(e=>e.textContent.includes('海底储物箱'));if(!b)return false;b.click();return !!document.querySelector('[aria-label="海底仓库"]')&&Game.warehouseState().site==='sea'&&Game.warehouseCapacity()===20;})()`);
 for(let i=0;i<60;i++){if(await ev(`!document.querySelector('#loading')||getComputedStyle(document.querySelector('#loading')).display==='none'`))break;await sleep(100);}
 await shot('sea-storage-ui.png');
  await ev(`document.querySelector('[data-bag-open]').click();document.querySelector('[data-item="wood"]').click();window.seaWood=Game.invCount('wood');document.querySelector('[data-ware-transfer][data-dir="in"][data-qty="1"]').click();document.querySelector('.item-detail-modal .modal-x').click();document.querySelector('#modal .modal-x')?.click();[...document.querySelectorAll('#hotspots .hotspot')].find(e=>/海底储物箱/.test(e.textContent)).click();`);
  await check('海底营地存入与岛仓隔离',`Game.invCount('wood')===seaWood-1&&Game.warehouseState().inv.wood===1&&!Game.S().warehouse?.items.some(x=>x.id==='wood')`);
  await require('../../回归测试/helpers/browser').pressElement(send,ev,'[data-warehouse-item="wood"]');
  await ev(`document.querySelector('#modal .modal-x')?.click();Game.S().scene='forest';Game.S().zone='edge';document.querySelector('[data-nav="inv"]').click();document.querySelector('[data-item="wood"]').click();`);
 await check('野外物品详情没有存入按钮',`!document.querySelector('[data-ware-transfer]')&&Game.invCount('wood')===seaWood`);
 await ev(`document.querySelector('.item-detail-modal .modal-x').click();document.querySelector('#modal .modal-x')?.click();Game.S().scene='camp';Game.S().zone=null;document.querySelector('[data-nav="map"]').click();`);await sleep(300);
 await check('地图按钮半透明且当前位置保留边框',`(()=>{const n=document.querySelector('.map-arrow:not(.here) .arrow-label'),h=document.querySelector('.map-arrow.here .arrow-label');return !!n&&!!h&&getComputedStyle(n).backgroundColor==='rgba(10, 10, 8, 0.72)'&&parseFloat(getComputedStyle(h).outlineWidth)>0;})()`);
 // 现行规则允许超载：旧代收物资直接无损收入背包，不再生成到期/替换窗口。
 await ev(`Game.S().inv={ironSword:15};Game.S().capacity=15;Game.S().furnPending={wood:20};Game.S().pendingLootBatches=[];Game.S().stats.hp=10000;Game.S().stats.hunger=Game.S().stats.thirst=100;Game.save();Game.load();document.querySelector('[data-nav="inv"]').click();`);
 await check('旧代收无损转入超载背包，不要求丢物替换',`Game.invCount('ironSword')===15&&Game.invCount('wood')===20&&Object.keys(Game.S().furnPending).length===0&&Game.pendingLootInfo().length===0&&Game.capUsed()>Game.capacity()&&!!document.querySelector('.inventory-overload')&&!document.querySelector('[data-replace]')`);
 await check('超载物资在卡片上显示真实数量',`document.querySelector('[data-item="wood"] .inv-qty').textContent==='20'`);
 await shot('loot-pending-current.png');
 await ev(`document.querySelector('#modal .modal-x').click();Game.S().stats.hp=10000;window.lootStart=Game.S().tick;window.testRandom=Math.random;Math.random=()=>.99;Game.addMin(2000);Math.random=testRandom;Game.save();Game.load();document.querySelector('[data-nav="inv"]').click();`);
 await check('长行动和保存重载后超载物资不消失',`Game.S().tick===lootStart+2000&&Game.invCount('ironSword')===15&&Game.invCount('wood')===20&&!!document.querySelector('.inventory-overload')`);
 // Decode every rebuilt line through browser audio decoder, no sound playback.
 const artIds=['reedPack','leatherPack','expeditionPack','snow','goldIngot','tideSteel','shipPlate','glowCrystal','bpStew','bpOmelette','bpCake','chick'];
 await ev(`document.querySelector('#modal .modal-x')?.click();Game.newGame('fisher','normal');Game.S().tut=null;Game.S().capacity=999;for(const id of ${JSON.stringify(artIds)})Game.addItem(id,1,true);UI.begin();document.querySelector('#modal .modal-x')?.click();document.querySelector('[data-nav="inv"]').click();document.querySelector('[data-invcat="all"]').click();`);await sleep(1200);
 for(let i=0;i<300;i++){if(await ev(`!document.querySelector('#loading')||getComputedStyle(document.querySelector('#loading')).display==='none'`))break;await sleep(100);}
 await check('十二种补图与小鸡在实际背包中加载',`(async()=>{for(const id of ${JSON.stringify(artIds)}){const i=document.querySelector('[data-item="'+id+'"] img');if(!i||!i.src.includes('/'+id+'.png'))return false;try{await i.decode();}catch{return false;}if(!i.naturalWidth)return false;}return true;})()`);
 await shot('new-item-art-inventory.png');
 await ev(`document.querySelector('#modal .modal-x')?.click();document.querySelector('[data-nav="equip"]').click();document.querySelector('[data-eqpick="pack"]').click();`);await sleep(500);
 await check('三种背包装备选择使用不同立绘',`(async()=>{for(const id of ['reedPack','leatherPack','expeditionPack']){const i=document.querySelector('[data-pack="'+id+'"] img');if(!i||!i.src.includes('/'+id+'.png'))return false;try{await i.decode();}catch{return false;}}return true;})()`);
 await shot('new-backpack-picker.png');
 const audio=await ev(`(async()=>{const ctx=new AudioContext(),names=Object.entries(MERCHANTS).flatMap(([k,v])=>v.lines.map((_,i)=>k+'-'+i)).concat(LINGHUI_SPEECH.map((_,i)=>'linghui-'+i));const out=[];for(const n of names){const raw=await(await fetch('assets/audio/voices/'+n+'.mp3')).arrayBuffer(),b=await ctx.decodeAudioData(raw);let peak=0;for(const v of b.getChannelData(0))peak=Math.max(peak,Math.abs(v));out.push({name:n,duration:b.duration,peak});}await ctx.close();return out;})()`);
 assert.equal(audio.length,33);assert.ok(audio.every(x=>x.duration>.5&&x.duration<30&&x.peak>.01&&x.peak<=1));fs.writeFileSync(path.join(out,'mobile-voice-audit.json'),JSON.stringify(audio,null,2));passed++;console.log('OK 33条语音完整解码与时长音量检查');
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{try{ws?.close();ch?.kill();}catch{}console.log('通过 '+passed+' 项，失败 '+fail+' 项');console.log('RESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();
