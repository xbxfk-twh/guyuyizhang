/* 可重复的资源/工具/建造/武器对照；JSON为测试数据，不含真实玩家档。 */
const fs=require('fs'),path=require('path'),{fresh}=require('../../回归测试/progression-engine');
const out={conditions:'渔夫/冒险家/春晴，无传承；采集无技能，战斗统一皮甲/贴身。随机20种子，最多80次玩家操作；不代表全流程通关。',tools:[],construction:[],combat:[]};
for(const tool of ['axeStone','axeIron','axeSteel','pickStone','pickIron','pickSteel','pickBlack']){
 const e=fresh(),g=e.G,s=g.S();g.addItem(tool,1,true);g.equipTool(tool);s.scene=tool.startsWith('axe')?'forest':'quarry';
 const resource=tool.startsWith('axe')?'wood':'stone';
 const p={id:'budget_'+tool,name:'审计',type:'gather',time:25,energy:15,need:{tool:e.ITEMS[tool].tool.kind},yields:[{id:resource,min:3,max:3}]};
 const tick=s.tick,energy=s.stats.stamina;for(let i=0;i<10;i++)g.doPoint(p);
 out.tools.push({tool,name:e.ITEMS[tool].name,tenActions:{output:g.invCount(resource),minutes:s.tick-tick,energy:energy-s.stats.stamina,wear:e.DURA[tool]-g.durOf(tool)}});
}
out.raftDailyBudget=[];
for(const scene of ['forest','bamboo'])for(const id of scene==='forest'?['forest_tree','forest_vine']:['bamboo_cut'])for(const edge of ['min','max']){
 const e=fresh(),g=e.G,s=g.S();s.scene=scene;g.addItem('axeStone',1,true);g.equipTool('axeStone');const p=g.pointsOf().find(x=>x.id===id),y=p.yields[0],base=y[edge],fixed={...p,yields:[{id:y.id,min:base,max:base}]};const tick=s.tick,energy=s.stats.stamina;
 for(let i=0;i<p.daily;i++)g.doPoint(fixed);out.raftDailyBudget.push({point:id,resource:y.id,edge,count:g.invCount(y.id),actions:p.daily,minutes:s.tick-tick,energy:energy-s.stats.stamina});
}
const e=fresh();for(const [chain,rows]of Object.entries(e.BUILDING_CHAINS))for(let i=1;i<rows.length;i++){
 const row=rows[i];out.construction.push({id:chain+':'+i,name:row.name,mats:row.mats,time:row.time,
  plankProcessing:row.mats?.plank?{base:{wood:Math.ceil(row.mats.plank/2)*4,minutes:Math.ceil(row.mats.plank/2)*30},ironSteel:{wood:Math.ceil(row.mats.plank/3)*4,minutes:Math.ceil(row.mats.plank/3)*20}}:undefined});
}
for(const id of ['wb1','wb2','wb3','fr1','fr2','fr3']){const f=e.FURNITURE.find(x=>x.id===id);out.construction.push({id,name:f.name,mats:f.mats,time:f.time});}
for(const enemy of ['rabbit','wolf','ox','wolfKing','slateGuard'])for(const build of ['spear','ironSword','steelSword','blackDagger','blackDaggerVamp']){
 const rows=[];for(let seed=1;seed<=20;seed++){
  const e=fresh(),g=e.G,s=g.S();let state=seed;e.control.random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const id=build==='blackDaggerVamp'?'blackDagger':build;g.addItem(id,id==='blackDagger'?2:1,true);g.equip(id);if(id==='blackDagger')g.equip(id);
  if(build==='blackDaggerVamp')s.tree.combat.f_vamp=1;g.addItem('leatherArmor',1,true);s.equipment.armor='leatherArmor';s.stats.hp=100;s.stats.stamina=100;
  g.startFight(e.ENEMIES[enemy],true);const C=s.combat;C.dist=0;let turns=0;while(s.combat&&!s.death&&turns<80){g.fightAction('attack',0);turns++;}
  rows.push({won:!s.death&&!s.combat,hp:s.stats.hp,turns,armorWear:e.DURA.leatherArmor-(g.durOf('leatherArmor')||0)});
 }
 const avg=k=>Number((rows.reduce((n,r)=>n+r[k],0)/rows.length).toFixed(2));out.combat.push({enemy,build,samples:rows.length,wins:rows.filter(r=>r.won).length,meanHp:avg('hp'),meanActions:avg('turns'),meanArmorWear:avg('armorWear')});
}
// 同阶段可用护甲与副手：单手剑可带盾，双匕首不能占用同一副手。
out.preparedCombat=[];
for(const enemy of ['wolfKing','slateGuard','sunkenKing'])for(const build of ['steelSword','blackSword','blackDaggerVamp','sourceSpear']){
 const rows=[];for(let seed=1;seed<=20;seed++){
  const e=fresh(),g=e.G,s=g.S();let state=Math.imul(seed,2654435761)>>>0;e.control.random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const id=build==='blackDaggerVamp'?'blackDagger':build;g.addItem(id,id==='blackDagger'?2:1,true);g.equip(id);if(id==='blackDagger'){g.equip(id);s.tree.combat.f_vamp=1;}else if(!e.ITEMS[id].twoHand){g.addItem('steelShield',1,true);g.equip('steelShield');}
  g.addItem('blackArmor',1,true);s.equipment.armor='blackArmor';s.stats.hp=100;s.stats.stamina=100;g.startFight(e.ENEMIES[enemy],true);s.combat.dist=0;let turns=0;while(s.combat&&!s.death&&turns<80){g.fightAction('attack',0);turns++;}
  rows.push({won:!s.death&&!s.combat,hp:s.stats.hp,turns});
 }
 const avg=k=>Number((rows.reduce((n,r)=>n+r[k],0)/rows.length).toFixed(2));out.preparedCombat.push({enemy,build,armor:'blackArmor',shield:!['blackDaggerVamp','sourceSpear'].includes(build)?'steelShield':null,samples:20,wins:rows.filter(x=>x.won).length,meanHp:avg('hp'),meanActions:avg('turns')});
}
const dir=path.resolve(__dirname,'../../回归测试/_out');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'progression-budget.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));console.log('RESULT:PASS');
