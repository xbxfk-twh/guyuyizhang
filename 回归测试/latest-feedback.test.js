const fs=require('fs'),path=require('path');
const base=path.resolve(__dirname,'../孤屿遗章-游戏 - 发布/js');
const source=require('./helpers/runtime.js').logicFiles.map(f=>fs.readFileSync(path.join(base,f),'utf8')).join('\n');
const store={};
const ls={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};
const {Game:G,ITEMS,RECIPES,FURNITURE}=new Function('localStorage','window','document','console',source+'\nreturn {Game,ITEMS,RECIPES,FURNITURE};')(ls,{}, {},{log(){},warn(){}});
let count=0, overlay=null;
function check(name, fn){ fn(); count++; console.log('OK '+name); }
function fresh(diff='normal'){
  G.bind({onChange(){},onLog(){},onFight(){},onEnding(){},onOverlay:o=>overlay=o});
  G.metaState().nodes={}; G.newGame('fisher',diff);
  const s=G.S(); s.tut=null; s.capacity=999; overlay=null; return s;
}
const originalRandom=Math.random;
try{
  // 1 工坊旧档迁移 / 新局不赠送
  check('新局不赠送裁缝台（tailorGift=0、裁缝台不可用）',()=>{
    const s=fresh();
    if(s.tailorGift!==0) throw new Error('tailorGift='+s.tailorGift);
    if(G.tailorGifted()!==false) throw new Error('新局应不可用');
  });
  check('旧档有 wb1 且无 tailorGift → 读档一次性补 tailorGift=1、不写 furniture.tailor',()=>{
    const s=fresh();
    delete s.tailorGift; s.furniture={wb1:true};
    G.save(); if(G.load()!==true) throw new Error('load fail');
    if(G.S().tailorGift!==1) throw new Error('gift='+G.S().tailorGift);
    if(G.S().furniture.tailor!==undefined) throw new Error('不应写进 furniture');
    if(G.tailorGifted()!==true) throw new Error('应可用');
  });
  check('旧档拆工具台后 gift 不回退（一次性落定）',()=>{
    const s=fresh();
    s.furniture={wb1:true}; delete s.tailorGift; G.save(); G.load();
    const g=G.S(); g.furniture={};
    if(g.tailorGift!==1) throw new Error('已落定不应回退');
    if(G.tailorGifted()!==true) throw new Error('使用权仍在');
  });
  // 2 工坊可达
  check('麻衣在 gift 时可达；新局无裁缝台即使有材料也不可达',()=>{
    const s=fresh(); const r=RECIPES.find(x=>x.id==='r_hempcloth');
    if(r.station!=='tailor') throw new Error('station='+r.station);
    s.inv.fiber=4;
    if(G.canCraft(r).ok!==false) throw new Error('新局应不可达');
    s.tailorGift=1;
    if(G.canCraft(r).ok!==true) throw new Error('gift 后应可达');
  });
  check('新造裁缝台（furniture.tailor）可达、拆掉后不可达',()=>{
    const s=fresh(); const r=RECIPES.find(x=>x.id==='r_hempcloth');
    s.inv.fiber=4; s.furniture.tailor=true;
    if(G.tailorGifted()!==true || G.canCraft(r).ok!==true) throw new Error('新造应可达');
    delete s.furniture.tailor;
    if(G.canCraft(r).ok!==false) throw new Error('拆掉后不可达');
  });
  check('裁缝台配方链无生产死锁（草衣/麻衣/皮衣/毛皮大衣材料均有出处）',()=>{
    for(const id of ['r_grasscloth','r_hempcloth','r_leathercloth','r_furcoat']){
      const r=RECIPES.find(x=>x.id===id); if(!r) throw new Error('缺配方 '+id);
      if(r.station!=='tailor') throw new Error(id+' station='+r.station);
      for(const k in r.in) if(!ITEMS[k]) throw new Error(id+' 材料 '+k);
      for(const k in r.out) if(!ITEMS[k]) throw new Error(id+' 产出 '+k);
    }
    if(!FURNITURE.find(f=>f.id==='tannery')) throw new Error('缺制革架');
    if(!RECIPES.find(r=>r.id==='r_leather')) throw new Error('缺鞣皮革配方');
  });
  // 3 床恢复数值
  check('床恢复数值：bed1=0.58 削弱，bed2=0.9、bed3=1.0 恢复原值',()=>{
    const bed1=FURNITURE.find(f=>f.id==='bed1'), bed2=FURNITURE.find(f=>f.id==='bed2'), bed3=FURNITURE.find(f=>f.id==='bed3');
    if(bed1.rest!==0.58) throw new Error('bed1='+bed1.rest);
    if(bed2.rest!==0.9) throw new Error('bed2='+bed2.rest);
    if(bed3.rest!==1.0) throw new Error('bed3='+bed3.rest);
    if(!(bed1.rest<bed2.rest && bed2.rest<bed3.rest)) throw new Error('递增被破坏');
  });
  // 4 家具位占用
  check('furnitureUsed：新造 tailor 独立占一槽，gift 不占',()=>{
    const s=fresh();
    s.furniture={wb1:true};
    if(G.furnitureUsed()!==1) throw new Error('工具台1槽，实得'+G.furnitureUsed());
    s.furniture.tailor=true;
    if(G.furnitureUsed()!==2) throw new Error('新造裁缝台应占第2槽，实得'+G.furnitureUsed());
    delete s.furniture.tailor; s.tailorGift=1;
    if(G.furnitureUsed()!==1) throw new Error('gift 不占槽，应仍1槽，实得'+G.furnitureUsed());
  });
  check('furnSlotFull：新造 tailor 受家具位限制，gift 不占位',()=>{
    const s=fresh();
    s.furniture={wb1:true};
    if(G.furnSlotFull('tailor')!==true) throw new Error('家具满应拒绝新造裁缝台');
    s.buildings.house=1;
    if(G.furnSlotFull('tailor')!==false) throw new Error('有空位应可建');
    s.furniture={}; s.tailorGift=1;
    if(G.furnSlotFull('tailor')!==false) throw new Error('gift 不占位不报满');
  });
  // 5 采集日志结束时间
  check('采集日志记在结束时刻：8:20 耗时 20 分钟 → 8:40',()=>{
    const s=fresh();
    s.minute=8*60+20; s.day=1; s.stats.stamina=s.stats.hunger=s.stats.thirst=100;
    Math.random=()=>0.999;
    G.bind({onChange(){},onFight(){},onEnding(){},onOverlay(){},onLog(){}});
    const p={id:'river_water',name:'取水点',type:'gather',time:20,energy:8,need:{},yields:[{id:'water',min:2,max:3}],daily:3,text:'你俯身捧起河水，冰凉清冽。'};
    G.doPoint(p);
    Math.random=originalRandom;
    if(s.minute!==520) throw new Error('结束时 minute='+s.minute+'，应 520');
    const gain=s.log.find(l=>l.text.indexOf('获得')===0);
    if(!gain) throw new Error('无获得日志');
    if(gain.t!=='第1天 08:40') throw new Error('日志时间='+gain.t);
  });
  // 6 当前目标顺序
  check('当前目标：已有床仍优先提示食水危急（不看床）',()=>{
    const s=fresh(); s.day=2; s.furniture={bed1:true,wb1:true}; s.stats.hunger=20; s.stats.thirst=80;
    if(G.currentObjective().indexOf('吃喝')<0) throw new Error(G.currentObjective());
  });
  check('当前目标：食水充足先提示缺斧镐（而不是床）',()=>{
    const s=fresh(); s.day=2; s.furniture={bed1:true}; s.stats.hunger=90; s.stats.thirst=90;
    if(!/石斧|石镐/.test(G.currentObjective())) throw new Error(G.currentObjective());
  });
  check('当前目标：有斧镐无工具台先提示工具台，工具台后有床才提示床',()=>{
    const s=fresh(); s.day=2; s.furniture={}; s.stats.hunger=90; s.stats.thirst=90; s.inv.axeStone=1;
    if(G.currentObjective().indexOf('工具台')<0) throw new Error(G.currentObjective());
    s.furniture={wb1:true};
    if(G.currentObjective().indexOf('草床')<0) throw new Error(G.currentObjective());
  });
  console.log(`通过 ${count} 项，失败 0 项\nRESULT:PASS`);
}catch(e){ console.error(e.stack); console.log('RESULT:FAIL'); process.exitCode=1; }
finally{ Math.random=originalRandom; }
