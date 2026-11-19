const assert = require('node:assert/strict');
const {createEngine} = require('./helpers/engine');
const CORE = ['atl_dcore_coral','atl_dcore_wreck','atl_dcore_trench','atl_dcore_abyss'];

function fresh(seed) {
  const e = createEngine({seed});
  e.G.newGame('fisher','normal');
  const s = e.G.S();
  s.day = 35;
  s.scene = 'atlantis';
  s.zone = 'city';
  s.tut = null;
  s.inv.beibi = 1000;
  return e;
}

let passed = 0;
function check(name, run) { run(); console.log('OK ' + name); passed++; }

check('远古装置旧 ID、每日库存、扣费和读档一致', () => {
  const {G,ITEMS} = fresh();
  assert.equal(ITEMS.anctDevice.name,'远古装置');
  assert.equal(G.vendorDevice().price,360);
  assert.equal(G.buyVendorDevice().ok,true);
  assert.equal(G.invCount('beibi'),640);
  assert.equal(G.invCount('anctDevice'),1);
  assert.equal(G.buyVendorDevice().ok,false);
  assert.ok(G.load());
  assert.equal(G.vendorDevice().sold,true);
  G.S().day++;
  assert.equal(G.buyVendorDevice().ok,true);
  assert.equal(G.invCount('anctDevice'),2);
});

check('背包满、余额低或写盘失败时保留货款和库存', () => {
  const {G,storage} = fresh();
  G.addItem('stone',G.capacity()*20,true,true);
  assert.equal(G.buyVendorDevice().ok,false);
  assert.equal(G.invCount('beibi'),1000);
  delete G.S().inv.stone;
  G.S().inv.beibi = 100;
  assert.equal(G.buyVendorDevice().ok,false);
  G.S().inv.beibi = 1000;
  storage.setItem = () => { throw new Error('mock failure'); };
  assert.equal(G.buyVendorDevice().ok,false);
  assert.equal(G.vendorDevice().sold,false);
  assert.equal(G.invCount('beibi'),1000);
  assert.equal(G.invCount('anctDevice'),0);
});

check('泵房固定奖励，当天和读档后不会重复，旧工坊可只补领远古装置', () => {
  const {G} = fresh();
  const pump = () => G.pointsOf().find(p => p.id === 'atl_pumphouse');
  G.doPoint(pump());
  assert.equal(G.invCount('anctDevice'),2);
  assert.equal(G.invCount('sourceOre'),4);
  assert.equal(G.pointAvailable(pump()),false);
  assert.ok(G.save().ok && G.load());
  assert.equal(G.pointAvailable(pump()),false);
  G.S().zone = 'pearlCave';
  G.addItem('goggles',1,true,true);
  G.addItem('bpBullet',1,true,true);
  G.S().flags.pt_atl_bullet = 1;
  const shop = G.pointsOf().find(p => p.id === 'atl_bullet');
  assert.equal(G.pointAvailable(shop),true);
  G.doPoint(shop);
  assert.equal(G.invCount('bpBullet'),1);
  assert.equal(G.invCount('anctDevice'),3);
  assert.equal(G.pointAvailable(shop),false);
});

check('纯矿和污染矿是独立库存，清洗每批只产一份干净源矿', () => {
  const {G,RECIPES} = fresh();
  G.S().zone = 'habitat';
  G.atlantisCamp().furniture.sourceForge = true;
  G.addItem('taintedSourceOre',4,true,true);
  G.S().inv.water = 2;
  const before = G.invCount('sourceOre');
  const f = RECIPES.find(r => r.id === 'r_filter_source');
  assert.deepEqual(G.craftIn(f),{taintedSourceOre:2,water:1});
  assert.equal(G.canCraft(f).ok,true);
  G.craft(f);
  assert.equal(G.invCount('sourceOre'),before+1);
  assert.equal(G.invCount('taintedSourceOre'),2);
  assert.equal(G.invCount('water'),1);
});

check('归仓保留潜水工具和深殿核心，手动存核心后读档仍认领过', () => {
  const {G} = fresh();
  G.S().zone = 'habitat';
  G.atlantisCamp().furniture.seaStorage1 = true;
  for (const [id,count] of Object.entries({deepCore:4,diveMask:1,lightStrong:1,sourceOre:4})) G.addItem(id,count,true,true);
  assert.equal(G.storeAllWarehouse().ok,true);
  assert.equal(G.invCount('sourceOre'),0);
  assert.equal(G.invCount('deepCore'),4);
  assert.equal(G.invCount('lightStrong'),1);
  assert.equal(G.invCount('diveMask'),1);
  for (const id of CORE) G.S().flags['pt_'+id] = 1;
  assert.equal(G.transferWarehouse('deepCore',4,true).ok,true);
  assert.ok(G.save().ok && G.load());
  assert.equal(G.warehouseState().inv.deepCore,4);
  assert.ok(CORE.every(id => G.S().flags['pt_'+id]));
});

check('必要守卫先战斗，战斗后才登记核心到账', () => {
  const {G} = fresh();
  G.S().zone = 'coral';
  const point = G.pointsOf().find(p => p.id === CORE[0]);
  G.doPoint(point);
  assert.ok(G.S().combat);
  assert.equal(G.S().flags['pt_'+point.id],undefined);
  G.endFight(false);
  assert.equal(G.pointAvailable(point),true);
  G.doPoint(point);
  for (let i=0; i<5 && G.S().combat; i++) G.endFight(true);
  assert.equal(G.invCount('deepCore'),1);
  assert.equal(G.pointAvailable(point),false);
});

check('打完核心守卫后撤出第二场伏击，核心点保持可采', () => {
  let reproduced = false;
  for (let seed=1; seed<=64 && !reproduced; seed++) {
    const {G} = fresh(seed);
    const s = G.S();
    s.zone = 'trench';
    s.minute = 8*60;
    G.addItem('lightStrong',1,true,true);
    G.addItem('diveMask',1,true,true);
    G.addItem('diveSuit',1,true,true);
    s.equipment.cloth = 'diveSuit';
    const point = G.pointsOf().find(p => p.id === CORE[2]);
    G.doPoint(point);
    for (let turn=0; turn<4 && s.combat && s.combat.enemy.id!=='atlSentry'; turn++) G.endFight(true);
    if (s.combat?.enemy.id !== 'atlSentry') continue;
    G.endFight(false);
    assert.equal(G.invCount('deepCore'),0);
    assert.equal(G.pointAvailable(point),true);
    reproduced = true;
  }
  assert.equal(reproduced,true,'固定种子必须覆盖二次伏击');
});

console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
