/* 开发者模式全流程扫查：跑遍场景/点位/配方/面板，抓异常显示与报错。
   用法：node 开发工具/检查/_sweep_dev.js
   产出：控制台报告 + 回归测试/_out/sweep-*.png + sweep-report.json */
const fs=require('fs'), path=require('path'), os=require('os'), http=require('http');
const {spawn}=require('child_process');
const root=path.resolve(__dirname,'../..'), profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-sweep-'));
const PORT=9498, out=path.join(root,'回归测试/_out'); fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const json=url=>new Promise((res,rej)=>http.get(url,r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{res(JSON.parse(b));}catch(e){rej(e);}});}).on('error',rej));
// 显示异常的探针词：渲染出来的文字里出现这些，基本就是漏了兜底
const BAD=/\bundefined\b|\bNaN\b|\bnull\b|\[object |Infinity/;
let browser,ws,shotN=0;
const findings=[], notes=[];
async function main(){
  browser=spawn(process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
    '--headless=new','--disable-gpu','--no-first-run','--allow-file-access-from-files','--remote-debugging-port='+PORT,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
  let tab; for(let i=0;i<60&&!tab;i++){await sleep(200);try{tab=(await json('http://127.0.0.1:'+PORT+'/json/list')).find(t=>t.type==='page');}catch{}}
  ws=new WebSocket(tab.webSocketDebuggerUrl); await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let next=0; const pending=new Map(); const jsErrors=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);
    if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}
    if(m.method==='Runtime.exceptionThrown'){ const d=m.params.exceptionDetails;
      jsErrors.push((d.exception&&d.exception.description)||d.text); }};
  const send=(m,p={})=>new Promise((r,j)=>{const id=++next;pending.set(id,x=>x.error?j(Error(JSON.stringify(x.error))):r(x.result));ws.send(JSON.stringify({id,method:m,params:p}));});
  const ev=async ex=>{const r=await send('Runtime.evaluate',{expression:ex,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error((r.exceptionDetails.exception&&r.exceptionDetails.exception.description)||JSON.stringify(r.exceptionDetails));return r.result?.value;};
  const shot=async n=>{const p=path.join(out,`sweep-${String(++shotN).padStart(2,'0')}-${n}.png`);
    await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(p,Buffer.from(r.data,'base64')));return p;};
  const dismiss=`(function(){const m=document.querySelector('#modal');if(!m||!m.classList.contains('open'))return 0;
    const b=m.querySelector('[data-choice]')||m.querySelector('#modal-close')||m.querySelector('.modal-x');if(b){b.click();return 1;}return 0;})()`;
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:926,height:428,deviceScaleFactor:1,mobile:true});
  const url=require('url').pathToFileURL(path.join(root,'孤屿遗章-游戏 - 发布','index.html')).href;
  await send('Page.navigate',{url}); await sleep(2400);
  // —— 开发者模式开局，资源管够 ——
  await ev(`Game.newGame('fisher','dev');Game.S().tut=null;UI.begin();`); await sleep(1600);
  for(let i=0;i<8;i++){ if(!await ev(dismiss)) break; await sleep(300); }
  await ev(`(function(){const s=Game.S(); s.capacity=999;
    for(const k of Object.keys(ITEMS)) Game.addItem(k, 60, true);
    Game.buildChain('house');Game.buildChain('house');Game.buildChain('house');
    Game.buildChain('fire');Game.buildChain('fire');Game.buildChain('fire');
    Game.buildChain('storage');Game.buildChain('storage');
    Game.buildChain('wall');Game.buildChain('wall');
    Game.buildChain('watch');Game.buildChain('watch');Game.buildChain('watch');
    Game.buildChain('dock');Game.buildChain('dock');Game.buildChain('dock');Game.buildChain('dock');Game.buildChain('dock');
    Game.buildChain('farm');
    for(const f of FURNITURE) try{ Game.S().furniture[f.id]=true; }catch(e){}
    // ⚠️ 别直接写 s.buildings.*：等级一旦越过链长度，warmth() 会崩（那是我脚本的锅，不是游戏的）。
    //    只把等级夹到各链的实际最高级。
    for(const cid of Object.keys(BUILDING_CHAINS)) s.buildings[cid]=BUILDING_CHAINS[cid].length-1;
  })()`);
  await sleep(600);
  const badInText=async(sel)=>{ const t=await ev(`(document.querySelector(${JSON.stringify(sel)})||{}).innerText||''`); const m=t.match(BAD); return m?m[0]:null; };
  const scanUI=async(where)=>{
    for(const sel of ['#topbar','#main','#modal','#objective','#scene-actions','#log']){
      const bad=await badInText(sel); if(bad) findings.push(`${where} → ${sel} 出现「${bad}」`);
    }
  };
  // —— 场景 × 点位 全扫 ——
  const scenes=await ev(`SCENES.map(s=>s.id)`);
  const ptRows=[];
  for(const sid of scenes){
    const ok=await ev(`(function(){try{Game.travel(${JSON.stringify(sid)});return true;}catch(e){return String(e.message||e);}})()`);
    await sleep(500);
    if(ok!==true){ ptRows.push({scene:sid,travel:ok}); notes.push(`场景 ${sid} 走不进去：${ok}`); continue; }
    await scanUI('场景 '+sid);
    const pts=await ev(`(Game.pointsOf()||[]).map(p=>p.id)`);
    for(const pid of pts){
      let r;
      try{ r=await ev(`(function(){const p=(Game.pointsOf()||[]).find(x=>x.id===${JSON.stringify(pid)});if(!p)return '没有该点位';Game.doPoint(p);return 'ok';})()`); }
      catch(e){ r='异常: '+(e.message||e); }
      await sleep(450);
      // 自动打完
      for(let i=0;i<60;i++){ const c=await ev(`!!Game.S().combat`); if(!c) break; await ev(`Game.fightAction('attack')`); await sleep(90); }
      await sleep(300);
      for(let i=0;i<4;i++){ if(!await ev(dismiss)) break; await sleep(250); }
      const last=await ev(`((Game.S().log||[])[0]||{}).text||''`);
      const bad=BAD.test(last)?last.match(BAD)[0]:null;
      if(bad) findings.push(`点位 ${sid}/${pid} 日志出现「${bad}」：${last.slice(0,60)}`);
      if(String(r).startsWith('异常')) findings.push(`点位 ${sid}/${pid} 抛错：${r}`);
      ptRows.push({scene:sid,point:pid,result:r,log:last.slice(0,80),dead:await ev(`!!Game.S().death`)});
      if(await ev(`!!Game.S().death`)){ notes.push(`在 ${sid}/${pid} 死了，扫查中止`); await ev(`(function(){const e=document.getElementById('ending-screen');if(e){e.classList.remove('open');e.innerHTML='';document.body.classList.remove('no-scroll');}Game.S().death=undefined;Game.S().ending=undefined;Game.S().stats.hp=Game.hpMax();})()`); }
    }
  }
  // —— 面板 全扫 ——
  const panels=[];
  const openPanel=async(kind)=>{ const r=await ev(`(function(){const b=document.querySelector(${JSON.stringify(kind)});if(!b)return '没有入口';b.click();return 'ok';})()`); return r; };
  await ev(`Game.travel('camp');UI.render();`); await sleep(500);
  const navs=[['[data-nav="craft"]','制造'],['[data-nav="inv"]','背包'],['[data-nav="equip"]','装备'],['[data-nav="save"]','菜单'],['#btn-mail','邮箱']];
  for(const [sel,name] of navs){
    const r=await openPanel(sel); await sleep(500);
    if(r!=='ok'){ notes.push(`面板 ${name} 打不开（${r}）`); continue; }
    const t=await ev(`(document.querySelector('#modal')||{}).innerText||''`);
    const bad=t.match(BAD); if(bad) findings.push(`面板 ${name} 出现「${bad[0]}」`);
    if(t.trim().length<6) findings.push(`面板 ${name} 内容为空`);
    panels.push({name, len:t.length, head:t.slice(0,60).replace(/\n/g,' / ')});
    await shot('panel-'+name);
    if(name==='菜单'){
      for(const k of ['sign','diary','col','settings','backup']){
        await ev(`(function(){const b=document.querySelector('[data-savemenu="${k}"]');if(b)b.click();})()`); await sleep(500);
        const t2=await ev(`(document.querySelector('#modal')||{}).innerText||''`);
        const b2=t2.match(BAD); if(b2) findings.push(`菜单→${k} 出现「${b2[0]}」`);
        if(t2.trim().length<6) findings.push(`菜单→${k} 内容为空`);
        panels.push({name:'菜单→'+k, len:t2.length, head:t2.slice(0,60).replace(/\n/g,' / ')});
        await shot('menu-'+k);
        await ev(`(function(){const b=document.querySelector('#modal .modal-x');if(b)b.click();})()`); await sleep(300);
        await ev(`(function(){const b=document.querySelector('[data-nav="save"]');if(b)b.click();})()`); await sleep(300);
      }
    }
    await ev(`(function(){const b=document.querySelector('#modal .modal-x');if(b)b.click();})()`); await sleep(300);
  }
  // —— 配方 全扫 ——
  const recRows=[];
  const recipes=await ev(`RECIPES.map(r=>r.id)`);
  for(const rid of recipes){
    const r=await ev(`(function(){const r=RECIPES.find(x=>x.id===${JSON.stringify(rid)});try{const res=Game.craft(r);return (res&&res.ok===false)?(res.reason||'fail'):'ok';}catch(e){return '异常:'+e.message;}})()`);
    const last=await ev(`((Game.S().log||[])[0]||{}).text||''`);
    const bad=last.match(BAD);
    if(bad) findings.push(`配方 ${rid} 日志出现「${bad[0]}」`);
    if(String(r).startsWith('异常')) findings.push(`配方 ${rid} 抛错：${r}`);
    recRows.push({recipe:rid,result:r,log:last.slice(0,60)});
  }
  await scanUI('最终');
  const report={findings,notes,jsErrors:jsErrors.slice(0,20),ptRows,panels,recRows};
  fs.writeFileSync(path.join(out,'sweep-report.json'),JSON.stringify(report,null,2));
  console.log('\n===== 扫查结果 =====');
  console.log('JS 运行时异常：'+jsErrors.length);
  for(const e of jsErrors.slice(0,10)) console.log('  ! '+String(e).split('\n')[0]);
  console.log('显示/逻辑问题：'+findings.length);
  for(const f of findings.slice(0,60)) console.log('  ✗ '+f);
  console.log('备注：'+notes.length);
  for(const n of notes.slice(0,30)) console.log('  · '+n);
  console.log('点位 '+ptRows.length+' 个 / 面板 '+panels.length+' 个 / 配方 '+recRows.length+' 个');
  ws.close(); browser.kill(); try{fs.rmSync(profile,{recursive:true,force:true});}catch(e){}
}
main().catch(e=>{console.error('FAIL '+(e.message||e));try{browser&&browser.kill();}catch(_){}process.exitCode=1;});
