/* 自动玩家：按给定步骤串真玩一局（不改任何游戏代码，全部走 Game 自己的接口）。
   用法：node 开发工具/预览/_play.js fisher hard "sc:forest,pt:forest_tree,craft:r_axeStone,shot:day1"
   步骤语法：sc:<场景> | pt:<点位id> | craft:<配方id>[:数量] | build:<链id> | furn:<家具id> |
             rest:<小时> | sleep | eat:<物品id> | fight | shot:<名字> | wait
   每个步骤后打印一行状态；战斗自动接管（攻击为主，血低先吃药）。 */
const fs=require('fs'), path=require('path'), os=require('os'), http=require('http');
const {spawn}=require('child_process');
const root=path.resolve(__dirname,'../..'), profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-play-'));
const port=9497, out=path.join(root,'回归测试/_out/play'); fs.mkdirSync(out,{recursive:true});
const identity=process.argv[2]||'fisher', difficulty=process.argv[3]||'hard';
const steps=(process.argv[4]||'').split(',').map(s=>s.trim()).filter(Boolean);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const json=url=>new Promise((resolve,reject)=>http.get(url,r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{resolve(JSON.parse(b));}catch(e){reject(e);}});}).on('error',reject));
let browser,ws,shotN=0;
async function main(){
  browser=spawn(process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
    '--headless=new','--disable-gpu','--no-first-run','--allow-file-access-from-files','--remote-debugging-port='+port,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
  let tab; for(let i=0;i<60&&!tab;i++){await sleep(200);try{tab=(await json('http://127.0.0.1:'+port+'/json/list')).find(t=>t.type==='page');}catch{}}
  ws=new WebSocket(tab.webSocketDebuggerUrl); await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let next=0; const pending=new Map();
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}};
  const send=(method,params={})=>new Promise((r,j)=>{const id=++next;pending.set(id,m=>m.error?j(Error(JSON.stringify(m.error))):r(m.result));ws.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:926,height:428,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true});
  const url=require('url').pathToFileURL(path.join(process.env.GUYU_GAME_ROOT||path.join(root,'孤屿遗章-游戏 - 发布'),'index.html')).href;
  await send('Page.navigate',{url});await sleep(2400);
  // 开局：直接走引擎接口，等同于玩家在界面上点完身份/难度
  await ev(`Game.newGame(${JSON.stringify(identity)},${JSON.stringify(difficulty)});Game.S().tut=null;UI.begin();`);
  await sleep(1200);
  const dismiss=`(function(){const m=document.querySelector('#modal');if(!m||!m.classList.contains('open'))return 0;
    const b=m.querySelector('[data-choice]')||m.querySelector('#modal-close')||m.querySelector('.modal-x');if(b){b.click();return 1;}return 0;})()`;
  for(let i=0;i<6;i++){ if(!await ev(dismiss)) break; await sleep(500); }
  await sleep(800);
  const state=async()=>await ev(`(function(){const s=Game.S();const C=s.combat;
    return {day:s.day,time:Game.fmtTime(),scene:s.scene,hp:Math.round(s.stats.hp),st:Math.round(s.stats.stamina),
      hun:Math.round(s.stats.hunger),thi:Math.round(s.stats.thirst),sp:Math.round(s.stats.spirit),
      cap:(typeof Game.capUsed==='function'?Game.capUsed():Object.keys(s.inv||{}).length)+'/'+(s.capacity||0), dead:!!s.death, ending:s.ending||null,
      combat:C?{n:C.enemies.length,dist:C.dist,ehp:C.enemies.map(e=>Math.max(0,Math.round(e.ehp)))}:null,
      log:(s.log||[]).slice(0,3).map(x=>x.text)};})()`);
  const shot=async name=>{ await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(out,`${String(++shotN).padStart(2,'0')}-${name}.png`),Buffer.from(r.data,'base64'))); };
  const autoFight=async()=>{
    for(let i=0;i<80;i++){
      const c=await ev(`(function(){const C=Game.S().combat;return C?{hp:Game.S().stats.hp,n:C.enemies.length}:null;})()`);
      if(!c) break;
      if(c.hp<35){
        const used=await ev(`(function(){const k=['lotusPill','herbPaste','salve','bandage'].find(x=>Game.invCount(x)>0);if(!k)return null;Game.useItemInFight(k);return k;})()`);
        if(used) continue;
      }
      await ev(`Game.fightAction('attack')`);
      await sleep(120);
    }
    await sleep(400);
  };
  const rows=[];
  for(const raw of steps){
    const [cmd,...rest]=raw.split(':'); const arg=rest.join(':');
    try{
      if(cmd==='sc'){ await ev(`Game.travel(${JSON.stringify(arg)})`); }
      else if(cmd==='pt'){ await ev(`(function(){const p=(Game.pointsOf()||[]).find(x=>x.id===${JSON.stringify(arg)});if(!p)throw new Error('没有点位 '+${JSON.stringify(arg)});Game.doPoint(p);})()`); }
      else if(cmd==='craft'){ const [r,n]=arg.split(' '); await ev(`(function(){const r=RECIPES.find(x=>x.id===${JSON.stringify(r)});if(!r)throw new Error('没有配方 '+${JSON.stringify(r)});const n=${n?Number(n):1};const res=n>1?Game.craftBatch(r,n):Game.craft(r);window.__last=res&&res.ok===false?(res.reason||''):'ok';})()`); }
      else if(cmd==='build'){ await ev(`Game.buildChain(${JSON.stringify(arg)})`); }
      else if(cmd==='furn'){ await ev(`Game.buildFurniture(${JSON.stringify(arg)})`); }
      else if(cmd==='rest'){ await ev(`Game.rest(${Number(arg)||1})`); }
      else if(cmd==='sleep'){ await ev(`Game.sleep('night')`); }
      else if(cmd==='eat'){ await ev(`(function(){const k=${JSON.stringify(arg)};if(Game.S().combat)Game.useItemInFight(k);else Game.useMed(k);})()`); }
      else if(cmd==='wait'){ /* 只观察 */ }
      else if(cmd==='shot'){ await shot(arg); rows.push({step:raw,skipped:true}); continue; }
      else { throw new Error('未知步骤 '+cmd); }
      await sleep(700);
      if(cmd==='craft'){ const l=await ev(`window.__last||''`); if(l && l!=='ok') console.log('   ↳ 制作失败：'+l); }
      await autoFight();
      for(let i=0;i<3;i++){ if(!await ev(dismiss)) break; await sleep(350); }
      if(cmd==='pt'||cmd==='craft'||cmd==='build'||cmd==='furn') await shot(`${cmd}-${arg.replace(/:/g,'')}`);
      const st=await state();
      rows.push({step:raw,...st});
      console.log(raw.padEnd(26), `D${st.day} ${st.time} ${st.scene} HP${st.hp} 体${st.st} 饱${st.hun} 水${st.thi} 神${st.sp}`,
        st.combat?`⚔${st.combat.n}只/${st.combat.ehp}`:'', st.dead?'☠死了':'', '| '+(st.log[0]||'').slice(0,34));
    }catch(e){ rows.push({step:raw,error:String(e.message||e)}); console.log(raw.padEnd(26),'ERROR',e.message||e); }
  }
  fs.writeFileSync(path.join(out,'play-log.json'),JSON.stringify({identity,difficulty,rows},null,2));
  const inv=await ev(`Object.entries(Game.S().inv||{}).filter(([k,v])=>v>0).map(([k,v])=>k+'x'+v).join(' ')`);
  console.log('\n最终背包：'+inv);
  ws.close(); browser.kill(); try{fs.rmSync(profile,{recursive:true,force:true});}catch(e){}
}
main().catch(e=>{console.error('FAIL '+(e.message||e));try{browser&&browser.kill();}catch(_){}process.exitCode=1;});
