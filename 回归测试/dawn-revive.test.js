const fs=require('fs'),path=require('path');
const base=path.resolve(__dirname,'../孤屿遗章-游戏 - 发布/js');
const source=['data.js','game.js'].map(f=>fs.readFileSync(path.join(base,f),'utf8')).join('\n');
const store={};
const ls={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};
const {Game:G,ITEMS}=new Function('localStorage','window','document','console',source+'\nreturn {Game,ITEMS};')(ls,{}, {},{log(){},warn(){}});
let count=0;
function check(name, fn){ fn(); count++; console.log('OK '+name); }
function fresh(diff='normal'){
  G.bind({onChange(){},onLog(){},onFight(){},onEnding(){},onOverlay(){}});
  G.metaState().nodes={}; G.metaState().soul=0; G.newGame('fisher',diff);
  const s=G.S(); s.tut=null; s.capacity=999; return s;
}
function jsonEq(a,b){ return JSON.stringify(a)===JSON.stringify(b); }
// 与 game.js checkpointState()/snapshot('day') 同构：重拍当天日出快照（等价于 newDay 末尾拍的那张）。
// 用于在“设置好材料/装备之后”把当前状态定为日出基准，然后验证 reviveToday 能否完整恢复它。
function retakeDawn(){
  const S=G.S();
  const state={};
  for(const key of Object.keys(S)){
    if(key[0]==='_'||['dawnCheckpoint','combat','death','ending'].includes(key)) continue;
    state[key]=S[key];
  }
  const snap=JSON.parse(JSON.stringify(state));
  S._snap=S._snap||{}; S._snap.day=snap;
  S.dawnCheckpoint={version:1,state:snap};
  return snap;
}
const originalRandom=Math.random;
try{
  // ---------- 闭环一：日出回溯存档安全与材料返还 ----------
  check('首次回溯：日出快照后木材/食物/耐久/装备/时间完整恢复，魂点扣 50 不被返还',()=>{
    const s=fresh();
    const day=s.day;
    s.inv.wood=20; s.inv.berry=10;
    s.inv.axeStone=1; s.toolDurs={ axeStone:[40] }; s.toolMaxDurs={axeStone:[40]}; s.equipment.weapon='axeStone';
    s.minute=8*60; s.stats.hp=100; s.stats.hunger=s.stats.thirst=100;
    const dawn=retakeDawn();
    // 当天消耗材料 + 耐久 + 装备 + 推进时间（仍在同一天）
    G.removeItem('wood',10);
    G.removeItem('berry',4);
    s.toolDurs.axeStone[0]=22;
    s.equipment.weapon='club';
    G.addMin(60*5); // 5 小时，同一天
    G.metaState().soul=50;
    const r=G.reviveToday();
    if(!r.ok) throw new Error('reviveToday 失败：'+r.reason);
    const st=G.S();
    if(st.day!==day) throw new Error('跨日了：day='+st.day);
    if((st.inv.wood||0)!==20) throw new Error('木材未恢复：'+st.inv.wood);
    if((st.inv.berry||0)!==10) throw new Error('食物未恢复：'+st.inv.berry);
    if(st.inv.axeStone!==1 || st.toolDurs.axeStone?.[0]!==40 || st.toolMaxDurs.axeStone?.[0]!==40) throw new Error('耐久未恢复：'+JSON.stringify(st.toolDurs));
    if(st.equipment.weapon!=='axeStone') throw new Error('装备未恢复：'+st.equipment.weapon);
    if(st.minute!==8*60) throw new Error('时间未恢复：'+st.minute);
    if(G.metaState().soul!==0) throw new Error('魂点未按规则扣 50：'+G.metaState().soul);
  });
  check('连续两次回溯：每次扣 50 魂、都回到同一日出快照，魂点不被快照反向返还',()=>{
    const s=fresh();
    const day=s.day; s.inv.wood=30; s.minute=9*60; s.stats.hp=100;
    retakeDawn();
    G.metaState().soul=120;
    G.removeItem('wood',15); G.addMin(120);
    let r=G.reviveToday(); if(!r.ok) throw new Error(r.reason);
    if((G.S().inv.wood||0)!==30) throw new Error('第一次未恢复');
    if(G.metaState().soul!==70) throw new Error('第一次应为 70：'+G.metaState().soul);
    G.removeItem('wood',12); G.addMin(180);
    r=G.reviveToday(); if(!r.ok) throw new Error(r.reason);
    if((G.S().inv.wood||0)!==30) throw new Error('第二次未恢复');
    if(G.metaState().soul!==20) throw new Error('第二次应为 20（不允许反向返还）：'+G.metaState().soul);
    if(G.S().day!==day) throw new Error('连续回溯后跨日');
  });
  check('旧档没有 dawnCheckpoint：reviveInfo 返回不可用，reviveToday 不崩不扣魂',()=>{
    const s=fresh();
    // 模拟真正的旧档：dawnCheckpoint 与运行时临时快照 _snap.day 都没有（save 时 _snap 不会落盘）
    delete G.S().dawnCheckpoint;
    if(G.S()._snap) delete G.S()._snap.day;
    const info=G.reviveInfo();
    if(info.ok!==false) throw new Error('旧档无快照应不可回溯');
    G.metaState().soul=50;
    const r=G.reviveToday();
    if(r.ok!==false) throw new Error('reviveToday 应返回失败');
    if(G.metaState().soul!==50) throw new Error('无快照回溯不应扣魂');
  });
  check('跨日后新快照生效：回到的是新一天的日出，不是旧一天',()=>{
    const s=fresh();
    s.day=1; s.inv.wood=40; s.minute=23*60; s.stats.hp=100; s.stats.hunger=s.stats.thirst=100;
    s.crops=[]; s.laochao={nextVisit:99,arrived:false}; s.furniture={}; s.pointUses={};
    G.save();
    G.addMin(60); // 23:00 跨过午夜进入第 2 天，newDay 会拍第 2 天日出快照
    const st=G.S();
    if(st.day!==2) throw new Error('应进入第 2 天，实际 '+st.day);
    const cpState=st.dawnCheckpoint.state;
    if(cpState.day!==2) throw new Error('快照应是第 2 天：'+cpState.day);
    G.removeItem('wood',10);
    G.metaState().soul=50;
    G.reviveToday();
    const after=G.S();
    if(after.day!==2) throw new Error('回不到第 2 天');
    if((after.inv.wood||0)!==cpState.inv.wood) throw new Error('第 2 天快照未恢复：'+after.inv.wood+' 应 '+cpState.inv.wood);
  });
  console.log(`通过 ${count} 项，失败 0 项\nRESULT:PASS`);
}catch(e){ console.error(e.stack); console.log('RESULT:FAIL'); process.exitCode=1; }
finally{ Math.random=originalRandom; }
