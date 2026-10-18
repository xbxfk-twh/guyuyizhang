const fs=require('fs'),path=require('path');
const base=path.resolve(__dirname,'../孤屿遗章-游戏 - 发布/js');
const DATA=fs.readFileSync(path.join(base,'data.js'),'utf8');
const GAME=fs.readFileSync(path.join(base,'game.js'),'utf8');
const ROOT=path.join(__dirname,'..','孤屿遗章-游戏 - 发布');
const UI=fs.readFileSync(path.join(base,'ui.js'),'utf8');
const source=DATA+'\n'+GAME;
const store={};
const ls={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};
const reRun=new Function('localStorage','window','document','console',source+'\nreturn {Game,ITEMS,RECIPES,SCENES};')(ls,{}, {}, {log(){},warn(){}});
const {Game:G,ITEMS,RECIPES,SCENES}=reRun;
let count=0;
function check(name, fn){ fn(); count++; console.log('OK '+name); }
function fresh(diff='normal'){
  G.bind({onChange(){},onLog(){},onFight(){},onEnding(){},onOverlay(){}});
  G.metaState().nodes={}; G.newGame('fisher',diff);
  const s=G.S(); s.tut=null; s.capacity=999; return s;
}
function grantDeal(id, multiplier=1){
  const deal=G.fishmanDeals().find(d=>d.id===id);
  for(const [item,qty] of Object.entries(deal.need)) G.addItem(item,qty*multiplier,true);
  return deal.need;
}
function atlPoint(id){
  const ATL=SCENES.find(s=>s.id==='atlantis');
  for(const zk of Object.keys(ATL.zones)){ const p=(ATL.zones[zk].points||[]).find(x=>x.id===id); if(p) return p; }
  return null;
}
const originalRandom=Math.random;
try{
  // ---------- 闭环二：源质长枪/重甲可获取链 ----------
  // 0 新料定义
  check('新材料 tideSteel/shipPlate 已定义（mat，带 glyph 占位）',()=>{
    if(!ITEMS.tideSteel || ITEMS.tideSteel.cat!=='mat') throw new Error('缺 tideSteel');
    if(!ITEMS.shipPlate || ITEMS.shipPlate.cat!=='mat') throw new Error('缺 shipPlate');
    if(!ITEMS.tideSteel.glyph || !ITEMS.shipPlate.glyph) throw new Error('缺字形占位');
  });
  check('配方含新料（结构断言：不再引用旧料，新料与核心料都在）',()=>{
    const ra=RECIPES.find(r=>r.id==='r_sourcearmor');
    const rs=RECIPES.find(r=>r.id==='r_sourcespear');
    // ⚠️ 不再写死份数：2026-09-22 起有「配方配比调整」（木材类≥5 份 ×0.8、其它≥5 份 ×1.1），
    //    写死数字每调一次配比就要改一次。这里只验结构：新料在里面、旧料不在了、核心料还够。
    if(!ra.in.shipPlate || ra.in.shipPlate < 1) throw new Error('重甲缺古船甲片：'+JSON.stringify(ra.in));
    if(!ra.in.sourceBar || !ra.in.deepCoral || !ra.in.energyCrystal) throw new Error('重甲缺核心料：'+JSON.stringify(ra.in));
    if(!rs.in.tideSteel || rs.in.tideSteel < 1) throw new Error('长枪缺潮鸣钢：'+JSON.stringify(rs.in));
    if(!rs.in.sourceBar || !rs.in.anctDevice || !rs.in.energyCrystal) throw new Error('长枪缺核心料：'+JSON.stringify(rs.in));
    // 长枪不应再要古船甲片、重甲不应再要潮鸣钢（各归各的产地）
    if(rs.in.shipPlate) throw new Error('长枪不该要古船甲片');
    if(ra.in.tideSteel) throw new Error('重甲不该要潮鸣钢');
    if(ra.needBp!=='bpSourceArmor'||rs.needBp!=='bpSourceSpear') throw new Error('needBp 错');
  });
  check('掉落表精确：沟壁矿脉 / 无光深渊 / 珊瑚丛 / 沉船残骸',()=>{
    const y=id=>atlPoint(id).yields;
    const src=y('atl_source');
    if(JSON.stringify(src.find(x=>x.id==='sourceOre'))!==JSON.stringify({id:'sourceOre',min:1,max:2})) throw new Error('沟壁源矿错');
    if(JSON.stringify(src.find(x=>x.id==='tideSteel'))!==JSON.stringify({id:'tideSteel',min:1,max:1,chance:0.35})) throw new Error('沟壁潮鸣钢错');
    const dark=y('atl_dark');
    if(JSON.stringify(dark.find(x=>x.id==='sourceOre'))!==JSON.stringify({id:'sourceOre',min:1,max:2})) throw new Error('无光源矿错');
    if(JSON.stringify(dark.find(x=>x.id==='tideSteel'))!==JSON.stringify({id:'tideSteel',min:1,max:2,chance:0.6})) throw new Error('无光潮鸣钢错');
    const coral=y('atl_coral');
    if(JSON.stringify(coral.find(x=>x.id==='deepCoral'))!==JSON.stringify({id:'deepCoral',min:1,max:2})) throw new Error('珊瑚丛深珊瑚错');
    if(JSON.stringify(coral.find(x=>x.id==='shipPlate'))!==JSON.stringify({id:'shipPlate',min:1,max:1,chance:0.3})) throw new Error('珊瑚丛古船甲片错');
    const wreck=y('atl_wreck');
    if(JSON.stringify(wreck.find(x=>x.id==='shipPlate'))!==JSON.stringify({id:'shipPlate',min:1,max:1,chance:0.5})) throw new Error('沉船古船甲片错');
    // 其他掉落不变
    if(!dark.some(x=>x.id==='atlantisCore'&&x.chance===0.2) || !dark.some(x=>x.id==='energyCrystal'&&x.chance===0.5)) throw new Error('无光深渊其他掉落被改');
    if(!wreck.some(x=>x.id==='shipwood') || !wreck.some(x=>x.id==='ironpart'&&x.chance===0.4)) throw new Error('沉船其他掉落被改');
  });
  check('神秘鱼人点位存在且为新加 type（trade）',()=>{
    const p=atlPoint('atl_fishman');
    if(!p) throw new Error('缺 atl_fishman 点位');
    if(p.type!=='trade') throw new Error('类型错：'+p.type);
  });
  // 交易行为
  check('鱼人交换：材料不足拒绝、不扣物',()=>{
    const s=fresh();
    s.atlantis={};
    const r=G.fishmanBarter('spear');
    if(r.ok!==false) throw new Error('材料不足应拒绝');
    if(G.invCount('tideSteel')||G.invCount('pearl')) throw new Error('不足时不应扣物');
  });
  check('鱼人交换长枪：材料足时精确扣除并获得图纸，状态落定',()=>{
    const s=fresh();
    const need=grantDeal('spear');
    const r=G.fishmanBarter('spear');
    if(!r.ok) throw new Error('交换失败：'+r.reason);
    for(const item of Object.keys(need)) if(G.invCount(item)!==0) throw new Error(item+'未扣净：'+G.invCount(item));
    if(G.invCount('bpSourceSpear')!==1) throw new Error('图纸未获得');
    if(!G.fishmanTraded().spear) throw new Error('交换状态未落定');
  });
  check('鱼人交换重甲：精确扣料，且不碰无关材料',()=>{
    const s=fresh();
    const need=grantDeal('armor');
    G.addItem('pearl',9,true); G.addItem('tideSteel',5,true);
    const r=G.fishmanBarter('armor');
    if(!r.ok) throw new Error('交换失败：'+r.reason);
    for(const item of Object.keys(need)) if(G.invCount(item)!==0) throw new Error(item+'未扣净');
    if(G.invCount('bpSourceArmor')!==1) throw new Error('重甲图纸未获得');
    if(G.invCount('pearl')!==9||G.invCount('tideSteel')!==5) throw new Error('无关材料被误扣');
  });
  check('鱼人交换：重复兑换拒绝、无可交换提示，材料不被二次扣除',()=>{
    const s=fresh();
    const need=grantDeal('spear',2);
    G.fishmanBarter('spear');
    const t0=Object.fromEntries(Object.keys(need).map(k=>[k,G.invCount(k)]));
    const r=G.fishmanBarter('spear');
    if(r.ok!==false) throw new Error('重复应拒绝');
    if(Object.keys(need).some(k=>G.invCount(k)!==t0[k])) throw new Error('重复兑换不应再扣料');
  });
  // ⚠️ 2026-09-24 契约变更：作者反馈"为什么人鱼我根本没交易却显示已经换过了"。
  //    以前 traded 字段把"换过"和"已有"混在一起，旧档（从交易机买过图纸）会被标成"已经换过了"。
  //    现在拆成 traded（真换过）/ owned（别处已有）：**行为不变**（两种都不再给交换入口），
  //    但语义要分开 —— 这条用例改成断言 owned，并额外断言 traded 仍然是 false。
  check('兼容旧档：已经持有源质图纸时不再显示可交换（但不算"换过"）',()=>{
    const s=fresh();
    G.addItem('bpSourceSpear',1,true);
    if(s.atlantis) delete s.atlantis.fishmanTraded;
    const spear=G.fishmanDeals().find(d=>d.id==='spear');
    if(!spear || !spear.owned) throw new Error('旧档已有图纸却没被认出"已有"');
    if(spear.traded) throw new Error('从没在鱼人这儿换过，不该显示"已经换过了"');
    grantDeal('spear');
    const before=[G.invCount('tideSteel'),G.invCount('pearl')];
    const r=G.fishmanBarter('spear');
    if(r.ok!==false) throw new Error('已有图纸时应拒绝重复交换');
    if(G.invCount('tideSteel')!==before[0]||G.invCount('pearl')!==before[1]) throw new Error('已有图纸时不应扣料');
  });
  check('真的换过之后才算"已换过"',()=>{
    const s=fresh();
    grantDeal('spear');
    G.fishmanBarter('spear');
    const spear=G.fishmanDeals().find(d=>d.id==='spear');
    if(!spear.traded) throw new Error('换过了却没标 traded');
    if(!spear.owned) throw new Error('换到手了却没标 owned');
  });
  check('鱼人交换：两张都能换（各一次），旧档加载不崩',()=>{
    const s=fresh();
    grantDeal('spear'); grantDeal('armor');
    G.fishmanBarter('spear'); G.fishmanBarter('armor');
    if(G.invCount('bpSourceSpear')!==1||G.invCount('bpSourceArmor')!==1) throw new Error('两张图纸未齐');
    // 旧档兼容：state 里没有 atlantis.fishmanTraded 也不会崩
    delete G.S().atlantis.fishmanTraded;
    G.save(); if(G.load()!==true) throw new Error('旧档加载失败');
    if(G.invCount('bpSourceSpear')!==1||G.invCount('bpSourceArmor')!==1) throw new Error('加载后图纸丢失');
  });
  // 获取路径：从新局出发，材料可来自掉落点（行为级，不靠给图纸）
  check('新局完整获取路径：图纸不可购得（交易机已下架）、只能靠鱼人',()=>{
    // 交易机（ATL_BUY 在 ui.js，这里校验源码不含这两张图纸的售卖条目）
    const buyBlock=(UI.match(/const ATL_BUY = \[([\s\S]*?)\];/)||[])[1]||'';
    if(buyBlock.indexOf('bpSourceSpear')>=0 || buyBlock.indexOf('bpSourceArmor')>=0)
      throw new Error('交易机仍卖源质图纸');
    // 鱼人交换由 fishmanBarter 提供，材料掉落由具体点位提供（前面已精确断言掉落表）
    const p=atlPoint('atl_fishman');
    if(!p) throw new Error('无鱼人，图纸无来源');
  });
  console.log(`通过 ${count} 项，失败 0 项\nRESULT:PASS`);
}catch(e){ console.error(e.stack); console.log('RESULT:FAIL'); process.exitCode=1; }
finally{ Math.random=originalRandom; }
