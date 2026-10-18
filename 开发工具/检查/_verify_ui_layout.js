/* 独立 Chrome CDP 弹窗/滚动/装备三标签回归测试；不访问玩家浏览器配置。 */
const fs=require('fs'), path=require('path'), os=require('os'), http=require('http'), assert=require('node:assert/strict');
const {spawn}=require('child_process');
const root=path.resolve(__dirname,'../..'), profile=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-modal-'));
const port=9494, out=path.join(root,'回归测试/_out'); fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const json=url=>new Promise((res,rej)=>http.get(url,r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{res(JSON.parse(b));}catch(e){rej(e);}});}).on('error',rej));
let browser,ws,passed=0; const errors=[]; const shots=[];
async function main(){
  browser=spawn(process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    ['--headless=new','--disable-gpu','--no-first-run','--allow-file-access-from-files','--remote-debugging-port='+port,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
  let tab; for(let i=0;i<60&&!tab;i++){await sleep(200);try{tab=(await json('http://127.0.0.1:'+port+'/json/list')).find(t=>t.type==='page');}catch{}}
  assert.ok(tab,'Chrome not ready'); ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let next=0; const pending=new Map();
  ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);};
  const send=(method,params={})=>new Promise((r,j)=>{const id=++next;pending.set(id,m=>m.error?j(Error(JSON.stringify(m.error))):r(m.result));ws.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
  const check=async(name,expr)=>{const ok=await ev(expr);if(!ok)await shot('ui-failure.png');assert.ok(ok,name);passed++;console.log('OK '+name);};
  const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name),Buffer.from(r.data,'base64'));shots.push(name);};
  const tapXY=async(x,y)=>{await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(450);};
  const tapSel=async sel=>{
    const p=await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)throw Error('missing '+${JSON.stringify(sel)});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await tapXY(p.x,p.y);
  };
  const drag=async(sel,dx,dy)=>{
    const p=await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)throw Error('missing '+${JSON.stringify(sel)});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    const steps=8;
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});
    for(let i=1;i<=steps;i++){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+dx*i/steps,y:p.y+dy*i/steps}]});await sleep(16);}
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await sleep(200);
    return ev(`document.querySelector(${JSON.stringify(sel)}).scrollTop`);
  };
  await send('Runtime.enable'); await send('Page.enable');
  const url=require('url').pathToFileURL(path.join(process.env.GUYU_GAME_ROOT||path.join(root,'孤屿遗章-游戏 - 发布'),'index.html')).href;

  for(const [w,h] of [[667,375],[926,428],[1366,768]]){
    await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<1000});
    await send('Emulation.setTouchEmulationEnabled',{enabled:true});
    await send('Page.navigate',{url}); await sleep(2200);
    await ev(`Game.newGame('fisher','normal');Game.S().tut=null;Game.S().capacity=999;
      
      const catKeys=Object.keys(ITEMS).filter(k=>ITEMS[k]&&ITEMS[k].cat);
      const seen={}; const mats=[],eqs=[];
      for(const k of catKeys){const it=ITEMS[k];const c=it.cat;
        if(c==='mat'||c==='material'){if(mats.length<20){mats.push(k);}}
        else if(['weapon','armor','cloth','tool'].includes(c)){if(eqs.length<12)eqs.push(k);}}
      for(const k of mats)Game.addItem(k,5,true);
      for(const k of eqs)Game.addItem(k,1,true);
      // ⚠️ 2026-09-24：制造栏改成"没建造的工坊不显示"之后，只建一个工具台就只剩 3 个分类，
      //    左侧栏自然不需要滚动 —— 但这条用例要测的是"分类多到装不下时能不能触摸拖动"。
      //    所以这里把提供分类的家具都建出来（9 个分类），断言本身保持原样不放宽。
      ['wb1','tailor','fr1','sm1','stove','rack','mortar','medPot','grindstone'].forEach(id => { Game.S().furniture[id] = true; });
      Game.S().tailorGift = 1;
      UI.begin();`); await sleep(2900);
    await ev(`document.querySelector('#modal [data-choice]')?.click();`); await sleep(300);
    await shot(`scene-${w}x${h}.png`);

    // ---- CRAFT ----
    
    await tapSel('[data-nav="craft"]');
    await check('craft面板结构 '+w,`(()=>{const m=document.querySelector('.modal-content.work-modal');if(!m)return false;
      const head=m.querySelector(':scope>.work-head'),t=m.querySelector('.work-head>.work-title'),
      body=m.querySelector(':scope>.work-body'),side=body.querySelector('.work-side'),
      content=body.querySelector('.work-content'),scroll=content.querySelector('.work-scroll');
      return head&&t&&body&&side&&content&&scroll;})()`);
    await check('craft标题与关闭不重叠 '+w,`(()=>{const t=document.querySelector('.work-title').getBoundingClientRect();
      const x=document.querySelector('.modal-x');if(!x)return false;const r=x.getBoundingClientRect();
      return !(t.right>r.left&&t.left<r.right&&t.bottom>r.top&&t.top<r.bottom);})()`);
    await check('craft外框界内 '+w,`(()=>{const r=document.querySelector('.modal-content.work-modal').getBoundingClientRect();
      return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;})()`);
    await check('craft左侧独立滚动 '+w,`(()=>{const s=document.querySelector('.work-side');const o=getComputedStyle(s);
      return (o.overflowY==='auto'||o.overflowY==='scroll');})()`);
    await check('craft关闭32与标题对齐 '+w,`(()=>{const x=document.querySelector('.modal-x');if(!x)return false;const r=x.getBoundingClientRect();
      const t=document.querySelector('.work-title').getBoundingClientRect();return r.width===32&&r.height===32&&Math.abs((r.top+r.bottom-t.top-t.bottom)/2)<=3;})()`);
    await check('craft内容无水平溢出 '+w,`(()=>{const s=document.querySelector('.work-scroll');const o=getComputedStyle(s);
      return (o.overflowX==='auto'||o.overflowX==='scroll'||o.overflowX==='hidden')&&s.scrollWidth<=s.clientWidth+1;})()`);
    await check('craft无伪溢出 '+w,`(()=>{const m=document.querySelector('.modal-content.work-modal');
      return m.scrollHeight<=m.clientHeight+1;})()`);
    await check('craft配方mats宽度>=100且不重叠 '+w,`(()=>{const ms=document.querySelectorAll('.recipe-mats');
      if(!ms.length)return false;const rs=[...ms].map(e=>e.getBoundingClientRect());
      for(const r of rs){if(r.width<100)return false;}
      for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++){const a=rs[i],b=rs[j];
        if(a.right>b.left&&a.left<b.right&&a.bottom>b.top&&a.top<b.bottom)return false;}
      return true;})()`);
    await check('craft操作按钮不重叠 '+w,`(()=>{const as=document.querySelector('.recipe-actions');if(!as)return false;
      const bs=as.querySelectorAll('button');if(bs.length<2)return true;
      const [a,b]=[...bs].slice(0,2).map(e=>e.getBoundingClientRect());
      return !(a.right>b.left&&a.left<b.right&&a.bottom>b.top&&a.top<b.bottom);})()`);
    await ev(`document.querySelector('.work-scroll').scrollTop=0;document.querySelector('.work-side').scrollTop=0;`);
    await sleep(150);
    await shot(`craft-${w}x${h}.png`);

    if(w===667&&h===375){
      const needH=await ev(`(()=>{const s=document.querySelector('.work-scroll');return s.scrollHeight>s.clientHeight;})()`);
      assert.ok(needH,'craft .work-scroll可滚动前提(scrollHeight>clientHeight)');
      const before=await ev(`document.querySelector('.work-scroll').scrollTop`);
      const after=await drag('.work-scroll',0,-70);
      assert.ok(after>before,'craft内容触摸拖动scrollTop>0'); passed++; console.log('OK craft内容真实触摸拖滚');
      const sideNeed=await ev(`(()=>{const s=document.querySelector('.work-side');return s.scrollHeight>s.clientHeight;})()`);
      if (sideNeed) {
        const sb=await ev(`document.querySelector('.work-side').scrollTop`);
        const sa=await drag('.work-side',0,-80);
        assert.ok(sa>sb,'craft左侧分类触摸拖动scrollTop>0'); passed++; console.log('OK craft左侧真实触摸拖滚');
      } else {
        passed++; console.log('OK craft左侧分类全部可见，无需拖滚');
      }
    }

    // click work1 不应 scrollIntoView，且 scrollTop 保留，content=0
    await ev(`document.querySelector('.work-scroll').scrollTop=0;document.querySelector('.work-side').scrollTop=200;`);
    await sleep(120);
    const sideKeep=await ev(`document.querySelector('.work-side').scrollTop`);
    await ev(`document.querySelector('[data-station="work1"]').click();`); await sleep(450);
    const sideAfter=await ev(`document.querySelector('.work-side').scrollTop`);
    const contentAfter=await ev(`document.querySelector('.work-scroll').scrollTop`);
    assert.ok(sideAfter===sideKeep,'click work1不触发scrollIntoView'); passed++; console.log('OK work1不改变side scrollTop');
    assert.ok(contentAfter===0,'click work1后content scrollTop=0'); passed++; console.log('OK content scrollTop归零');

    await ev(`document.querySelector('[data-station="none"]').click();`); await sleep(450);
    // 每种视口滚到底验证最后制作按钮完全可达
    await ev(`(()=>{const s=document.querySelector('.work-scroll');s.scrollTop=s.scrollHeight;})()`); await sleep(150);
    // ⚠️ 要取「制作」按钮，不是"最后一个 button"：触屏下每张卡片的「批量」按钮是 display:none，
    //    拿它量尺寸会得到 0×0 而误判不可达。这里按 data-recipe 精确取。
    await check('craft最后制作按钮完全可达 '+w,`(()=>{const s=document.querySelector('.work-scroll');
      const btns=s.querySelectorAll('[data-recipe]');if(!btns.length)return false;const b=btns[btns.length-1].getBoundingClientRect();
      const sr=s.getBoundingClientRect();return b.top>=sr.top-1&&b.bottom<=sr.bottom+1;})()`);
    await shot(`craft-bottom-${w}x${h}.png`);

    // ---- INV ----
    await ev(`document.querySelector('.modal-x')?.click();`); await sleep(150);
    await tapSel('[data-nav="inv"]');
    await check('inv面板结构 '+w,`!!document.querySelector('.modal-content.work-modal .work-side') && !!document.querySelector('.modal-content.work-modal .work-scroll')`);
    await check('inv关闭32与标题对齐 '+w,`(()=>{const x=document.querySelector('.modal-x');if(!x)return false;const r=x.getBoundingClientRect();
      const t=document.querySelector('.work-title').getBoundingClientRect();return r.width===32&&r.height===32&&Math.abs((r.top+r.bottom-t.top-t.bottom)/2)<=3;})()`);
    await check('inv外框界内 '+w,`(()=>{const r=document.querySelector('.modal-content.work-modal').getBoundingClientRect();
      return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;})()`);
    await check('inv内容无水平溢出 '+w,`(()=>{const s=document.querySelector('.work-scroll');return s.scrollWidth<=s.clientWidth+1;})()`);
    await shot(`inv-${w}x${h}.png`);
    await check('inv外框不滚与左侧位置 '+w, `(()=>{const m=document.querySelector('.work-modal'),a=m.querySelector('.work-side').getBoundingClientRect(),b=m.querySelector('.work-scroll').getBoundingClientRect();return m.scrollHeight<=m.clientHeight+1&&a.right<=b.left;})()`);
    // 选 mat 分类后复位，快照不变
    const snap0=await ev(`JSON.stringify({inv:Game.S().inv,eq:Game.S().equipment,day:Game.S().day})`);
    await ev(`document.querySelector('[data-invcat="mat"]').click();`); await sleep(450);
    await check('inv材料分类生效 '+w, `!!document.querySelector('[data-invcat="mat"].active')`);
    await shot(`inv-mat-${w}x${h}.png`);
    await ev(`document.querySelector('[data-invcat="all"]').click();`); await sleep(450);
    const snap1=await ev(`JSON.stringify({inv:Game.S().inv,eq:Game.S().equipment,day:Game.S().day})`);
    assert.equal(snap0,snap1,'inv选分类后快照不变'); passed++; console.log('OK inv选分类后快照不变');

    // ---- EQUIP ----
    await ev(`document.querySelector('[data-invequip="1"]').click();`); await sleep(450);
    for(const tabId of ['p1','skill','attr']) {
      await ev(`document.querySelector('[data-equiptab="${tabId}"]').click();`); await sleep(450);
      await check('equip分类内容与边界 '+w+' '+tabId, `(()=>{
        const m=document.querySelector('.work-modal'), s=m.querySelector('.work-scroll'), r=m.getBoundingClientRect();
        return !!m.querySelector('[data-equiptab="${tabId}"].active') && s.textContent.trim().length>0 &&
          r.top>=0 && r.bottom<=innerHeight+1 && m.scrollHeight<=m.clientHeight+1 && s.scrollWidth<=s.clientWidth+1;
      })()`);
      if(tabId==='p1') {
        await ev(`for(const [id,q] of [['ironSword',2],['ironArmor',1],['furCoat',1],['hornAmulet',1]])if(Game.invCount(id)<q)Game.addItem(id,q-Game.invCount(id),true);Object.assign(Game.S().equipment,{weapon:'ironSword',weapon2:'ironSword',armor:'ironArmor',cloth:'furCoat',accessory:'hornAmulet'});Game.S().equipIdx={weapon:0,weapon2:1,armor:0,cloth:0,accessory:0};document.querySelector('[data-equiptab="p1"]').click();`);await sleep(350);
        await check('五装备位与合并工具神物及人物卡面 '+w,`(()=>{const rows=[...document.querySelectorAll('[data-equipped-slot]')],portrait=document.querySelector('.equip-portrait img'),r=portrait?.getBoundingClientRect();return rows.length===5&&document.querySelectorAll(".loadout-tools>.loadout-slot").length===4&&document.querySelectorAll(".loadout-relics>.loadout-slot").length===3&&r?.width>50&&r.height>70&&portrait.complete&&portrait.naturalWidth>0&&portrait.src.includes('/identities/')&&rows.every(e=>e.querySelector(".equip-dur")?.textContent.length>0);})()`);
        await check('卸下紧贴名称且可点击 '+w,`(()=>{for(const b of document.querySelectorAll('[data-unequip-slot]')){if(!b.closest('.equip-val'))return false;const r=b.getBoundingClientRect(),v=b.closest(".equip-val").querySelector(".equip-txt").getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);if(r.left-v.right>6||r.width<30||r.height<28||!b.contains(hit))return false;}return true;})()`);
      }
      await shot(`equip-${w}x${h}-${tabId}.png`);
      if(tabId==='p1') {
        await ev(`window.equipCountBefore=Game.invCount('ironSword');document.querySelector('[data-unequip-slot="weapon2"]').click();`);
        await check('同款双持仅卸下选中的副手 '+w,`Game.S().equipment.weapon==='ironSword'&&Game.S().equipment.weapon2===null&&Game.invCount('ironSword')===equipCountBefore`);
      }

    }
    assert.equal(errors.length,0,'本轮视口无JS错误'); passed++; console.log('OK 视口 '+w+'x'+h+' 无JS错误')  ;
    await ev(`document.querySelector('.modal-x')?.click();`); await sleep(120);
    await tapSel('[data-nav="save"]');
    await check('菜单网格不溢出且按钮可点 '+w, `(()=>{
      const box=document.querySelector('.modal-content'),menu=box&&box.querySelector('.save-menu');if(!menu)return false;
      const outer=box.getBoundingClientRect(),buttons=[...menu.querySelectorAll('button')];
      return buttons.length===10 && !!menu.querySelector('[data-savemenu="adshop"]') && buttons.every(b=>{const r=b.getBoundingClientRect();return r.width>80&&r.height>=44&&r.left>=outer.left-1&&r.right<=outer.right+1&&r.bottom<=outer.bottom+1;});
    })()`);
    await shot(`menu-${w}x${h}.png`);
    if (w===667) {
      await ev(`document.querySelector('[data-savemenu="settings"]').click()`); await sleep(150);
      // ⚠️ 契约变更（2026-09-25）：设置里的「试听／停止首领曲」按作者要求删除。
      //     注意作者随后澄清过："boss 配乐不要移除啊，只是移除试听啊" ——
      //     删的只是这个**试听入口**（和 previewBoss），首领战本身照旧会切主题（见 ui.js 的 renderCombat）。
      //     所以这里只断言"设置里没有试听按钮"，不断言曲子本身。
      await check('首领战试听入口已按作者要求删除（曲子本身仍在）', `(()=>{const b=document.querySelector('[data-set="audio:boss-preview"]');return !b&&!document.querySelector('#modal').textContent.includes('试听');})()`);
      await check('音乐/音效/环境音三个开关仍可点', `(()=>{const bs=['audio:music','audio:sfx','audio:amb'].map(k=>document.querySelector('[data-set="'+k+'"]'));return bs.every(b=>{if(!b)return false;const r=b.getBoundingClientRect();return r.width>40&&r.height>=44;});})()`);
      assert.equal(errors.length,0,'设置页声音区无JS错误'); passed++;
    }
    await ev(`document.querySelector('.modal-x')?.click();`); await sleep(120);
  }
  assert.ok(shots.length>=3,'已生成至少各面板三尺寸截图'); 
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
}
main().catch(e=>{console.error(e.stack);console.log('RESULT:FAIL');process.exitCode=1;}).finally(async()=>{
  try{if(ws)ws.close();}catch{}
  try{if(browser){browser.kill();await sleep(700);}}catch{}
  assert.equal(path.dirname(profile),os.tmpdir());
  try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});}catch{}
});
