/* Real independent Chrome checks: challenge selection, soul workshop and boss. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'回归测试/_out'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-battle-')),port=9595;
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
 const check=async(name,expr)=>{const ok=await ev(expr);if(!ok){await shot('battle-ui-failure.png');}assert.ok(ok,name);passed++;console.log('OK '+name);};
 const shot=async(name)=>{const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name),Buffer.from(r.data,'base64'));};
 const until=async(expr)=>{for(let i=0;i<100;i++){if(await ev(expr))return;await sleep(100);}throw Error('timeout: '+expr);};
 const idle=()=>until(`!!document.querySelector('[data-fact="defend"]')&&!document.querySelector('[data-fact="defend"]').disabled`);
 await send('Runtime.enable');await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
 const url=require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布/index.html')).href;
 for(const colored of [false,true]){
  await send('Page.navigate',{url});await sleep(1000);
  await ev('localStorage.setItem("guyuyizhang_skin",'+JSON.stringify(JSON.stringify(colored?['seasons']:[]))+')');
  await send('Page.navigate',{url});await sleep(1000);
  await ev('Game.newGame("fisher","normal");Game.S().tut=null;UI.begin();');await until('!document.querySelector("#loading")');
  await ev('document.querySelector("#modal .modal-x")?.click();Game.startFight(ENEMIES.wolf,true);');
  await until('document.querySelector(".enemy-img").naturalWidth>0');
  await check('真实皮肤选择切换怪物 '+colored,'document.querySelector(".enemy-img").getAttribute("src").includes('+JSON.stringify(colored?'battle-colored':'battle-cutouts')+')');
  await check('战斗中原场景日志收起按钮不穿透 '+colored,'!document.querySelector("#log-grip")?.offsetHeight');
  await shot('battle-color-'+colored+'.png');
  await ev('Game.S().combat.smoke=true;document.querySelector("[data-fact=flee]").click();');await until('!document.querySelector(".battle-board")');
  await ev('Game.S().scene="forest";Game.S().stats.stamina=150;Game.S().stats.hp=100;UI.render();window.played=[];window.originalPlay=AudioFX.play;AudioFX.play=n=>played.push(n);[...document.querySelectorAll(".hotspot.point")].find(e=>e.textContent.includes("野莓")).click();');
  await until('document.querySelector("#busy.open .busy-img")?.naturalWidth>0');
  await check('采集透明图按皮肤切换 '+colored,'document.querySelector("#busy .busy-img").getAttribute("src").includes('+JSON.stringify(colored?'anim-colored':'anim-clean')+')&&played[0]==="forage"');
  if(colored)await check('全彩采集不会被样式灰度化','!getComputedStyle(document.querySelector("#busy .busy-img")).filter.includes("grayscale")');
  await shot('gather-color-'+colored+'.png');await until('!document.querySelector("#busy.open")');await ev('AudioFX.play=originalPlay;');
 }
 const imgNames=fs.readdirSync(path.join(root,'孤屿遗章-游戏 - 发布/assets/img/battle-colored'));
 const images=imgNames.map(n=>'assets/img/battle-colored/'+n).concat(['anim-colored','anim-clean'].flatMap(folder=>fs.readdirSync(path.join(root,'孤屿遗章-游戏 - 发布/assets/img',folder)).map(n=>'assets/img/'+folder+'/'+n)));
 await check('31张原彩色怪物、修整野猪及28张动作素材全部能加载', 'Promise.all('+JSON.stringify(images)+'.map(src=>new Promise(r=>{const i=new Image();i.onload=()=>r(i.naturalWidth>0);i.onerror=()=>r(false);i.src=src;}))).then(a=>a.length===60&&a.every(Boolean))');
 const audioSource=fs.readFileSync(path.join(root,'孤屿遗章-游戏 - 发布/js/audio.js'),'utf8');
 const metrics=await ev('(async()=>{const source='+JSON.stringify(audioSource)+';const result=[];for(const name of ["woodwork","stonework","metalwork","construction","forage","waterwork","fishing","cooking"]){const ctx=new OfflineAudioContext(1,24000,24000);const w={AudioContext:function(){return ctx;},localStorage:{getItem:()=>null}};const api=new Function("window","setInterval","clearInterval","setTimeout","clearTimeout",source+"\\nreturn AudioFX;")(w,()=>1,()=>{},(fn,ms)=>{ctx.suspend(ms/1000).then(()=>{fn();ctx.resume();});return 1;},()=>{});api.init();api.toggle();api.play(name);const b=await ctx.startRendering(),a=b.getChannelData(0);let sum=0,peak=0;for(const x of a){sum+=x*x;peak=Math.max(peak,Math.abs(x));}result.push({name,rms:Math.sqrt(sum/a.length),peak});}return result;})()');
 fs.writeFileSync(path.join(out,'work-audio-metrics.json'),JSON.stringify(metrics,null,2));
 assert.ok(metrics.every(x=>x.rms>0.0001&&x.peak<0.12));passed++;console.log('OK 八种音效实际离线渲染有声且不削波');
 assert.ok(new Set(metrics.map(x=>x.rms.toFixed(6))).size>=7);passed++;console.log('OK 材质声音各有不同包络');
 assert.deepEqual(errors,[]);passed++;console.log('OK 无脚本异常');
}catch(e){fail++;console.error(e.stack);}finally{try{ws?.close();ch?.kill();}catch{}console.log('通过 '+passed+' 项，失败 '+fail+' 项');console.log('RESULT:'+(fail?'FAIL':'PASS'));process.exitCode=fail?1:0;}})();
