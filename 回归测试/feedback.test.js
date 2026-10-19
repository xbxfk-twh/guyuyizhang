/* 玩家反馈专项：只使用内存存储和固定随机数，不接触真实存档。 */
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const base = path.resolve(__dirname, '../孤屿遗章-游戏 - 发布/js');
const source = require('./helpers/runtime.js').logicFiles.map(f => fs.readFileSync(path.join(base,f),'utf8')).join('\n');
const store = {};
const ls = {getItem:k=>store[k] || null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};
const {Game:G, ITEMS,RECIPES,ENEMIES,DURA} = new Function('localStorage','window','document',source+'\nreturn {Game,ITEMS,RECIPES,ENEMIES,DURA};')(ls,{},{});
let count=0, overlay;
function check(name, fn) { fn(); count++; console.log('OK '+name); }
function fresh(diff='normal') {
  G.bind({onChange(){},onLog(){},onFight(){},onEnding(){},onOverlay:o=>overlay=o});
  G.metaState().nodes={}; if(diff==='legend')G.metaState().challengeUnlocked=true; G.newGame('fisher',diff);
  const s=G.S(); s.tut=null; s.capacity=999; overlay=null; return s;
}
const originalRandom=Math.random;
try {
  check('重新加载后的日出回溯完整恢复，保留定局且只扣50魂',()=>{
    let s=fresh(); G.metaState().soul=500;
    const dawn=JSON.parse(JSON.stringify(s.dawnCheckpoint.state));
    s.inv.blackSword=8; s.flags.settledEnding='A'; s.flags.settled_A=1;
    s.newProgressAfterDawn={made:1}; s.stats.hp=0; s.death='test'; s.ending='D';
    G.save(); assert.ok(G.load()); assert.equal(G.reviveInfo().ok,true);
    const soul=G.metaState().soul;
    assert.equal(G.reviveToday().ok,true); s=G.S();
    assert.equal(s.stats.hp,dawn.stats.hp); assert.deepEqual(s.inv,dawn.inv);
    assert.equal(s.newProgressAfterDawn,undefined); assert.equal(s.flags.settledEnding,'A');
    assert.equal(s.flags.settled_A,1); assert.equal(G.metaState().soul,soul-50);
  });
  check('旧档缺少日出记录不扣魂，并可在下个日出建立记录',()=>{
    const s=fresh(); delete s.dawnCheckpoint; delete s._snap; G.metaState().soul=500;
    assert.equal(G.reviveToday().ok,false); assert.equal(G.metaState().soul,500);
    s.minute=1439; G.timePass(2); assert.equal(G.reviveInfo().ok,true);
  });
  check('传奇拒绝回溯；魂不足拒绝扣费',()=>{
    fresh('legend'); G.metaState().soul=500; assert.equal(G.reviveToday().ok,false);
    fresh(); G.metaState().soul=49; assert.equal(G.reviveToday().ok,false); assert.equal(G.metaState().soul,49);
  });
  check('困难吃历代遗章，传奇不吃',()=>{
    fresh('hard'); G.metaState().nodes={whet:3,tough:3}; assert.equal(G.metaBonus().atk,.1); assert.equal(G.metaBonus().armor,.15);
    G.S().difficulty='legend'; assert.equal(G.metaBonus().atk,0); assert.equal(G.metaBonus().armor,0);
  });
  check('四难度命中一致；闪避和恐惧修正可查询',()=>{
    for(const d of ['easy','normal','hard','legend']) {
      const s=fresh(d); assert.ok(Math.abs(G.combatAccuracy('attack',ENEMIES.eagle)-.7)<1e-9);
      assert.ok(Math.abs(G.combatAccuracy('attack',ENEMIES.guard)-.9)<1e-9);
      s.statuses.fear=1; assert.ok(Math.abs(G.combatAccuracy('heavy',ENEMIES.eagle)-.3)<1e-9);
    }
  });
  check('批量长制作确认前不耗材料，取消不生效，确认后实际产出',()=>{
    const s=fresh(); s.inv.wood=200; const r=RECIPES.find(x=>x.id==='r_plank');
    const old=JSON.stringify(s.inv), minute=s.minute;
    const result=G.craftBatch(r,40); assert.equal(result.pending,true); assert.ok(overlay.choices);
    assert.equal(JSON.stringify(s.inv),old); assert.equal(s.minute,minute);
    overlay.choices[1].ok(); assert.equal(JSON.stringify(s.inv),old);
    G.craftBatch(r,40); const expected=(s.inv.plank||0)+40*r.out.plank;
    overlay.choices[0].ok(); assert.equal(G.S().inv.plank,expected);
  });
  check('非法批量数量不会改变材料',()=>{
    const s=fresh(); s.inv.wood=200; const r=RECIPES.find(x=>x.id==='r_plank'); const old=JSON.stringify(s.inv);
    for(const n of [0,-1,1.5,Infinity,NaN,1000]) assert.equal(G.craftBatch(r,n).ok,false);
    assert.equal(JSON.stringify(s.inv),old);
  });
  check('钢与玄铁匕首装备、耐久和修理入口可用',()=>{
    for(const id of ['steelDagger','blackDagger']) {
      fresh(); G.addItem(id,2,true); G.equip(id); G.equip(id);
      assert.equal(G.S().equipment.weapon,id); assert.equal(G.S().equipment.weapon2,id);
      assert.equal(ITEMS[id].dual,1); assert.ok(DURA[id]>=80); assert.ok(G.repairMatOf(id));
      assert.ok(RECIPES.some(r=>r.out[id]));
    }
  });
  check('远程落空仍消耗弹药',()=>{
    const s=fresh(); G.addItem('bow',1,true); G.addItem('arrow',5,true); G.equip('bow');
    G.startFight(ENEMIES.guard,true); s.combat.dist=0; const n=G.invCount('arrow');
    Math.random=()=>.999; G.fightAction('ranged'); Math.random=originalRandom;
    assert.equal(G.invCount('arrow'),n-1);
  });
  check('先手致死后不能再攻击；保留最后一击同时结算规则',()=>{
    const s=fresh(); G.addItem('blackSword',1,true); G.equip('blackSword');
    G.startFight({...ENEMIES.guard,spd:100,atk:9999,traits:[]},true);
    const c=s.combat; c.dist=0; c.enemies[0].intent='attack'; const hp=c.enemies[0].ehp;
    Math.random=()=>.1; G.fightAction('attack'); Math.random=originalRandom;
    assert.equal(c.enemies[0].ehp,hp); assert.ok(s.death || s.stats.hp<=0);
  });
  check('双持进阶匕首实际触发嗜血回血',()=>{
    for(const id of ['steelDagger','blackDagger']) {
      const s=fresh(); G.addItem(id,2,true); G.equip(id); G.equip(id);
      G.nodeLv('combat','f_vamp'); s.tree.combat.f_vamp=1; s.stats.hp=30;
      G.startFight({...ENEMIES.guard,spd:1,traits:[]},true);s.combat.dist=0;
      Math.random=()=>.1;G.fightAction('attack');Math.random=originalRandom;
      assert.ok(s.stats.hp>30);assert.ok(s.combat.log.some(x=>x.includes('嗜血狂刀')));
    }
  });
  check('慢手掩护维持到下次行动；猛击破绽可被下一次攻击利用',()=>{
    for(const intent of ['cover','heavy']){
      const s=fresh();G.addItem('blackSword',1,true);G.equip('blackSword');s.stats.hp=9999;
      G.startFight({...ENEMIES.guard,spd:1,traits:[]},true);const c=s.combat;c.dist=0;c.accE=1;
      c.enemies.push({...c.enemies[0]});c.enemies.forEach(e=>{e.ehp=e.emax=9999;e.intent=intent;});
      Math.random=()=>.99;G.fightAction('attack');Math.random=originalRandom;
      assert.equal(c.enemies[0][intent],1);if(intent==='heavy')assert.equal(c.enemies[0].def,0);
      c.enemies.forEach(e=>e.intent='attack');c.accE=0;
      Math.random=()=>.1;const hp=c.enemies[0].ehp;G.fightAction('attack');Math.random=originalRandom;
      assert.ok(c.enemies[0].ehp<hp);assert.equal(c.enemies[0][intent],1);
      c.accE=1;G.fightAction('defend');assert.equal(c.enemies[0][intent],0);
    }
  });
  check('防御从先手起覆盖多次攻击',()=>{
    function taken(action){const s=fresh();G.addItem('blackSword',1,true);G.addItem('blackArmor',1,true);G.equip('blackSword');G.equip('blackArmor');s.stats.hp=9999;
      G.startFight({...ENEMIES.guard,spd:35,traits:[]},true);s.combat.dist=0;
      Math.random=()=>.8;G.fightAction(action);Math.random=originalRandom;return 9999-s.stats.hp;}
    assert.ok(taken('defend')<taken('attack'));
  });
  check('仅最终一击致死时仍同时造成玩家攻击伤害',()=>{
    const s=fresh();G.addItem('blackSword',1,true);G.equip('blackSword');
    const atk=10, def=G.playerDef();s.stats.hp=Math.max(1,atk-Math.round(def*.9))+1;
    G.startFight({...ENEMIES.guard,spd:G.combatSpeed()*2,atk,traits:[]},true);
    const c=s.combat;c.dist=0;const hp=c.enemies[0].ehp;
    Math.random=()=>.1;G.fightAction('attack');Math.random=originalRandom;assert.ok(c.enemies[0].ehp<hp);
  });
  check('只有弓时不能重击；无长矛不能投掷',()=>{
    const s=fresh();G.addItem('bow',1,true);G.addItem('arrow',5,true);G.equip('bow');G.startFight(ENEMIES.guard,true);
    const c=s.combat, round=c.round;assert.equal(G.combatActionInfo('heavy').available,false);
    G.fightAction('heavy');G.fightAction('throw');assert.equal(c.round,round);assert.equal(G.invCount('arrow'),5);
  });
  check('计时增益在近战和远程命中中同样生效，到期移除',()=>{
    const s=fresh();s.buffs={accuracy:{v:.1,until:(s.tick||0)+5}};
    assert.equal(G.combatAccuracy('attack',ENEMIES.guard),1);assert.equal(G.activeBuffs()[0].minutes,5);
    G.addItem('bow',1,true);G.addItem('arrow',5,true);G.equip('bow');
    assert.equal(G.combatAccuracy('ranged',ENEMIES.guard),1);
    G.timePass(6);assert.equal(G.activeBuffs().length,0);assert.equal(G.combatAccuracy('ranged',ENEMIES.guard),.9);
  });
  check('攻击食物增益同样增加弓的实际伤害',()=>{
    function damage(buff){const s=fresh();G.addItem('bow',1,true);G.addItem('arrow',5,true);G.equip('bow');
      if(buff)s.buffs={atk:{v:3,until:(s.tick||0)+100}};
      G.startFight({...ENEMIES.guard,spd:1,traits:[]},true);const c=s.combat;c.dist=0;const hp=c.enemies[0].ehp;
      Math.random=()=>.5;G.fightAction('ranged');Math.random=originalRandom;return hp-c.enemies[0].ehp;}
    assert.equal(damage(true)-damage(false),3);
  });
  console.log(`通过 ${count} 项，失败 0 项\nRESULT:PASS`);
} catch(e) {console.error(e.stack); console.log('RESULT:FAIL'); process.exitCode=1;}
finally {Math.random=originalRandom;}
