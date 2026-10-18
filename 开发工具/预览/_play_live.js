/* 直播用：开一个"看得见"的 Chrome 窗口玩，窗口一直留着，作者可以直接看。
   用法：
     node 开发工具/预览/_play_live.js open [身份] [难度]   # 开窗口并开新局（只开一次）
     node 开发工具/预览/_play_live.js play "<步骤串>"       # 在已开的窗口里接着玩
   步骤语法同 _play.js：sc:/pt:/craft:/build:/furn:/rest:/sleep:/eat:/fight:/shot:/wait
   窗口用独立配置目录，不碰作者本人的 Chrome，也不碰真实玩家存档。 */
const fs=require('fs'), path=require('path'), os=require('os'), http=require('http');
const {spawn}=require('child_process');
const root=path.resolve(__dirname,'../..');
const PORT=9500;
const profile=path.join(os.tmpdir(),'guyu-live-profile');
const gameUrl=require('url').pathToFileURL(path.join(process.env.GUYU_GAME_ROOT||path.join(root,'孤屿遗章-游戏 - 发布'),'index.html')).href;
const out=path.join(root,'回归测试/_out/play'); fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const json=url=>new Promise((resolve,reject)=>http.get(url,r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{resolve(JSON.parse(b));}catch(e){reject(e);}});}).on('error',reject));
const mode=process.argv[2]||'open';
const DISMISS=`(function(){const m=document.querySelector('#modal');if(!m||!m.classList.contains('open'))return 0;
  const b=m.querySelector('[data-choice]')||m.querySelector('#modal-close')||m.querySelector('.modal-x');if(b){b.click();return 1;}return 0;})()`;

async function launch(){
  fs.mkdirSync(profile,{recursive:true});
  const ch=spawn(process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
    '--remote-debugging-port='+PORT,'--user-data-dir='+profile,
    '--allow-file-access-from-files','--no-first-run','--no-default-browser-check',
    '--window-size=1180,760','--window-position=80,60','--new-window',gameUrl,
  ],{detached:true,stdio:'ignore'});      // ⚠️ 不加 --headless：这是给作者看的窗口
  ch.unref();                              // 否则 node 会一直挂着等这个子进程
  for(let i=0;i<50;i++){ await sleep(300); try{ const l=await json('http://127.0.0.1:'+PORT+'/json/list'); if(l.some(t=>t.type==='page'&&/index\.html/.test(t.url))) return true; }catch{} }
  return false;
}
let shotN=0;
async function attach(){
  const list=await json('http://127.0.0.1:'+PORT+'/json/list');
  const tab=list.find(t=>t.type==='page'&&/index\.html/.test(t.url))||list.find(t=>t.type==='page');
  if(!tab) throw new Error('没有可用页面，先跑 open');
  const ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let next=0; const pending=new Map();
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}};
  const send=(method,params={})=>new Promise((r,j)=>{const id=++next;pending.set(id,m=>m.error?j(Error(JSON.stringify(m.error))):r(m.result));ws.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
  const capture=async name=>{ const p=path.join(out,`live-${String(++shotN).padStart(2,'0')}-${name}.png`);
    await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(p,Buffer.from(r.data,'base64'))); console.log('  📷 '+path.basename(p)); };
  return {ws,send,ev,capture};
}
async function main(){
  if(mode==='open'){
    if(!await launch()) throw new Error('Chrome 没起来');
    const {ev,ws}=await attach();
    await sleep(2600);
    const identity=process.argv[3]||'woodcutter', difficulty=process.argv[4]||'hard';
    await ev(`Game.newGame(${JSON.stringify(identity)},${JSON.stringify(difficulty)});Game.S().tut=null;UI.begin();`);
    await sleep(1500);
    for(let i=0;i<6;i++){ if(!await ev(DISMISS)) break; await sleep(500); }
    console.log('窗口已打开：孤屿遗章 · 新局 '+identity+' / '+difficulty);
    ws.close(); return;                       // 不关窗口，留给作者看
  }
  const {ws,ev,capture,send}=await attach();
  const steps=(process.argv[3]||'').split(',').map(s=>s.trim()).filter(Boolean);
  const state=async()=>await ev(`(function(){const s=Game.S();const C=s.combat;return {day:s.day,time:Game.fmtTime(),scene:s.scene,
    hp:Math.round(s.stats.hp),st:Math.round(s.stats.stamina),hun:Math.round(s.stats.hunger),thi:Math.round(s.stats.thirst),sp:Math.round(s.stats.spirit),
    dead:!!s.death,combat:C?{n:C.enemies.length,ehp:C.enemies.map(e=>Math.max(0,Math.round(e.ehp)))}:null,
    log:(s.log||[]).slice(0,3).map(x=>x.text)};})()`);
  const autoFight=async()=>{
    for(let i=0;i<80;i++){
      const c=await ev(`(function(){const C=Game.S().combat;return C?{hp:Game.S().stats.hp,n:C.enemies.length}:null;})()`);
      if(!c) break;
      // 打法：血 <45% 先吃药，没药就逃（困难难度硬扛纯亏）；否则攻击
      if(c.hp<45){
        const u=await ev(`(function(){const k=['lotusPill','herbPaste','salve','bandage'].find(x=>Game.invCount(x)>0);if(!k)return null;Game.useItemInFight(k);return k;})()`);
        if(u) continue;
        await ev(`Game.fightAction('flee')`); await sleep(200);
        const still=await ev(`!!Game.S().combat`);
        if(!still){ console.log('  🏃 血少，逃了'); break; }
        continue;
      }
      await ev(`Game.fightAction('attack')`); await sleep(120);
    }
    await sleep(400);
  };
  for(const raw of steps){
    const [cmd,...rest]=raw.split(':'); const arg=rest.join(':');
    try{
      if(cmd==='sc') await ev(`Game.travel(${JSON.stringify(arg)})`);
      else if(cmd==='pt') await ev(`(function(){const p=(Game.pointsOf()||[]).find(x=>x.id===${JSON.stringify(arg)});if(!p)throw new Error('没有点位 '+${JSON.stringify(arg)});Game.doPoint(p);})()`);
      else if(cmd==='craft'){ const [r,n]=arg.split(' '); await ev(`(function(){const r=RECIPES.find(x=>x.id===${JSON.stringify(r)});if(!r)throw new Error('没有配方 '+${JSON.stringify(r)});const n=${n?Number(n):1};const res=n>1?Game.craftBatch(r,n):Game.craft(r);window.__last=res&&res.ok===false?(res.reason||''):'ok';})()`); }
      else if(cmd==='build') await ev(`Game.buildChain(${JSON.stringify(arg)})`);
      else if(cmd==='furn') await ev(`Game.buildFurniture(${JSON.stringify(arg)})`);
      else if(cmd==='rest') await ev(`Game.rest(${Number(arg)||1})`);
      else if(cmd==='sleep') await ev(`Game.sleep('night')`);
      else if(cmd==='eat') await ev(`(function(){const k=${JSON.stringify(arg)};const it=ITEMS[k];
        if(Game.S().combat){Game.useItemInFight(k);return;}
        if(it&&it.cat==='med')Game.useMed(k);else Game.consume(k);})()`);
      else if(cmd==='fight') await ev(`Game.fightAction('attack')`);
      else if(cmd==='hideend') await ev(`(function(){const e=document.getElementById('ending-screen');if(e){e.classList.remove('open');e.innerHTML='';document.body.classList.remove('no-scroll');return true;}return false;})()`);
      else if(cmd==='click') await ev(`(function(){const t=${JSON.stringify(arg)};
        const els=[...document.querySelectorAll('button,.hotspot,.action-btn,.mini-btn,.tab,[data-choice]')];
        const e=els.find(x=>x.textContent.includes(t)); if(!e)throw new Error('界面上找不到可点的：'+t); e.click();})()`);
      else if(cmd==='dbg'){ const d2=await ev(`({modalOpen:!!(document.querySelector('#modal')&&document.querySelector('#modal').classList.contains('open')),frozen:!!(Game.timeFrozen&&Game.timeFrozen()),combat:!!Game.S().combat,dead:!!Game.S().death,water:Game.invCount('water'),fish:Game.invCount('fish'),roast:Game.invCount('roastFish'),berry:Game.invCount('berry')})`);
        console.log('  DBG '+JSON.stringify(d2)); continue; }
      else if(cmd==='reload'){ await send('Page.reload',{ignoreCache:true}); await sleep(3000);
        await ev(`(function(){Game.load();UI.begin();})()`); await sleep(1500);
        for(let i=0;i<6;i++){ if(!await ev(DISMISS)) break; await sleep(400); }
        console.log('  已强制重新载入（绕过缓存）'); }
      else if(cmd==='new'){ const [id,df]=arg.split(' ');
        // 结局页是独立的 #ending-screen，正常流程由它的按钮关掉；脚本直接开局要自己收掉，否则会盖住整个游戏
        await ev(`(function(){const e=document.getElementById('ending-screen');if(e){e.classList.remove('open');e.innerHTML='';document.body.classList.remove('no-scroll');}})()`);
        await ev(`Game.newGame(${JSON.stringify(id||'woodcutter')},${JSON.stringify(df||'hard')});Game.S().tut=null;UI.begin();`);
        await sleep(1500);
        for(let i=0;i<6;i++){ if(!await ev(DISMISS)) break; await sleep(400); }
        console.log('  新开一局：'+(id||'woodcutter')+' / '+(df||'hard')); }
      else if(cmd==='shot'){ await capture(arg); continue; }
      else if(cmd==='wait'){ /* 只观察 */ }
      else throw new Error('未知步骤 '+cmd);
      await sleep(700);
      if(cmd==='click') await sleep(2600);   // 点面板里的按钮可能要等动画演完（睡觉动画 ~2.6s）
      if(cmd==='craft'){ const l=await ev(`window.__last||''`); if(l&&l!=='ok') console.log('  ↳ 失败：'+l); }
      await autoFight();
      if(cmd!=='click'){ for(let i=0;i<3;i++){ if(!await ev(DISMISS)) break; await sleep(350); } }
      const st=await state();
      console.log(raw.padEnd(24), `D${st.day} ${st.time} ${st.scene} HP${st.hp} 体${st.st} 饱${st.hun} 水${st.thi} 神${st.sp}`,
        st.combat?`⚔${st.combat.n}只`:'', st.dead?'☠死了':'', '| '+(st.log[0]||'').slice(0,30));
    }catch(e){ console.log(raw.padEnd(24),'ERROR',e.message||e); }
  }
  ws.close();
}
main().catch(e=>{console.error('FAIL '+(e.message||e));process.exitCode=1;});
