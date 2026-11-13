const assert=require('node:assert/strict'),{createEngine}=require('./helpers/engine');
let pass=0;const check=(name,fn)=>{fn();pass++;console.log('OK '+name);};
check('标题页无当前局时刷新仍通知界面，不能访问空局的死亡字段',()=>{const e=createEngine({exposeChange:true});assert.equal(e.G.S(),null);assert.doesNotThrow(()=>e.G.change());assert.deepEqual(e.events,[['change']]);assert.equal(e.G.S(),null);});
check('拥有神物提示可先展示，效果只在装备后生效，往返不合并字段',()=>{
 const e=createEngine({exposeChange:true}),g=e.G;g.newGame('fisher','normal');g.S().tut=null;g.S().relics=['satchel'];g.S().relicEquip=[null,null,null];delete g.S().flags.satchelHelpSeen;
 g.change();assert.equal(g.S().flags.satchelHelpSeen,true);assert.equal(g.hasRelic('satchel'),false);assert.equal(g.satchelStatus().equipped,false);
 assert.ok(g.save().ok);assert.ok(g.load());assert.deepEqual(g.S().relics,['satchel']);assert.ok(!g.S().relicEquip.includes('satchel'));
 g.S().relicSlots=1;assert.ok(g.equipRelic('satchel').ok);assert.equal(g.hasRelic('satchel'),true);
});
console.log(`通过 ${pass} 项，失败 0 项\nRESULT:PASS`);
