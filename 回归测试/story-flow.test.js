const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createEngine} = require('./helpers/engine');

const root = path.resolve(__dirname, '../孤屿遗章-游戏 - 发布');
const view = (file, name, ...params) => new Function('Game', 'TOWN', 'ITEMS', 'document', 'window',
  fs.readFileSync(path.join(root, 'js/ui/views', file + '.js'), 'utf8') + ';return ' + name)(...params);

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log('OK ' + name);
}

function fresh(initial) {
  const engine = createEngine({initial});
  const overlays = [];
  engine.G.bind({onOverlay: cfg => overlays.push(cfg)});
  if (!initial) engine.G.newGame('fisher', 'normal');
  return {...engine, overlays};
}

check('开场可回读，首次翻漂流物获得一次线索，重复点位无重复瓶', () => {
  const {G} = fresh();
  const state = G.S();
  assert.ok(G.storyKnown('wreck'));
  assert.equal(G.storyKnown('bottle'), false);
  state.scene = 'river';
  const point = G.pointsOf().find(p => p.id === 'river_drift');
  G.doPoint(point);
  assert.equal(G.invCount('driftbottle'), 1);
  assert.equal(G.storyKnown('bottle'), true);
  G.doPoint(point);
  assert.equal(G.invCount('driftbottle'), 1);
});

check('对岸默认分区可在零声望免费询问，货架仍用实际定价和声望', () => {
  const {G, ITEMS, overlays} = fresh();
  const state = G.S();
  const TOWN = new Function(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8') + ';return TOWN;')();
  const trading = view('trading', 'TradingView', G, TOWN, ITEMS).create({S: G.S});
  assert.equal(G.storyInteract('informant'), false);
  state.scene = 'shore';
  state.zone = null;
  state.fame = 0;
  const before = {stamina: state.stats.stamina, coin: G.invCount('coin'), tick: state.tick};
  assert.match(trading.infoModal(), /data-story="informant"/);
  assert.doesNotMatch(trading.infoModal(), /data-tbuy/);
  const tavern = G.pointsOf().find(p => p.id === 'town_info');
  G.doPoint(tavern);
  assert.equal(overlays.at(-1).kind, 'info');
  assert.equal(G.storyInteract('informant'), true);
  assert.equal(overlays.at(-1).title, '两张海图');
  assert.match(G.storyDiary().next, /三级瞭望台/);
  assert.deepEqual({stamina: state.stats.stamina, coin: G.invCount('coin'), tick: state.tick}, before);
  assert.equal(G.storyInteract('informant'), false);
  state.fame = 2;
  assert.match(trading.infoModal(), new RegExp(G.priceOf(150, false, 'seachart') + ' 金币'));
  assert.match(trading.infoModal(), /data-tbuy="informant:seachart"/);
});

check('绕过盐镇仍可调查海底证据，回访只提交一次', () => {
  const {G, overlays} = fresh();
  const state = G.S();
  state.scene = 'atlantis';
  state.zone = 'city';
  assert.equal(G.storyInteract('decree'), false);
  assert.equal(G.storyInteract('ledger'), true);
  assert.equal(G.storyInteract('receipt'), true);
  assert.equal(G.storyKnown('map'), false);
  assert.equal(G.storyDiary().tide.filter(([title]) => title === '取货口的名牌').length, 1);
  state.zone = 'pearlCave';
  const decree = G.pointsOf().find(p => p.story === 'decree');
  assert.equal(G.pointEnergy(decree), 0);
  assert.equal(G.pointMinutes(decree), 0);
  G.doPoint(decree);
  assert.equal(overlays.at(-1).title, '封门令');
  state.scene = 'shore';
  state.zone = 'saltTown';
  G.storyInteract('informant');
  assert.equal(overlays.at(-1).title, '盐镇那一夜');
  assert.equal(G.storyKnown('returned'), true);
  assert.equal(G.storyInteract('informant'), false);
});

check('实战胜利依次留下卫兵与国王的证据，战斗中不打开叙事面板', () => {
  const {G, ENEMIES, overlays} = fresh();
  const state = G.S();
  state.scene = 'atlantis';
  state.zone = 'sanctum';
  const before = overlays.length;
  G.startFight(ENEMIES.deepGuard, true);
  assert.equal(G.storyInteract('escort'), false);
  G.endFight(true);
  assert.equal(G.storyKnown('guard'), true);
  assert.equal(G.storyKnown('king'), false);
  G.startFight(ENEMIES.sunkenKing, true);
  G.endFight(true);
  assert.equal(G.storyKnown('king'), true);
  assert.match(G.currentObjective(), /疏散名单/);
  assert.equal(overlays.length, before);
});

check('旧档胜利和石板独立回读，未玩支线也能赴宴，重载后继续', () => {
  const {G, data, overlays} = fresh();
  const state = G.S();
  state.scene = 'atlantis';
  state.zone = 'sanctum';
  assert.ok(!G.pointsOf().some(p => p.story === 'escort'));
  assert.equal(G.storyInteract('escort'), false);
  state.killCount.sunkenKing = 1;
  state.flags.pt_cave_slate = 1;
  state.flags.settledEnding = 'A';
  assert.equal(G.storyKnown('cave'), true);
  assert.equal(G.storyKnown('map'), false);
  const guard = G.pointsOf().find(p => p.story === 'escort');
  G.doPoint(guard);
  const invitation = overlays.at(-1);
  assert.equal(invitation.title, '公主的侍卫');
  assert.match(invitation.text, /正吃晚饭/);
  invitation.choices[1].ok();
  assert.equal(G.storyKnown('escort'), true);
  assert.equal(G.storyKnown('refuge'), false);
  state.zone = 'shipwreck';
  assert.equal(G.storyInteract('escort'), true);
  overlays.at(-1).choices[0].ok();
  assert.equal(overlays.at(-1).title, '第三章 · 地下聚落');
  assert.equal(G.storyKnown('refuge'), false);
  overlays.at(-1).choices[0].ok();
  assert.equal(G.storyKnown('refuge'), true);
  assert.ok(G.save().ok);
  const restored = fresh(Object.fromEntries(data)).G;
  assert.ok(restored.load());
  assert.equal(restored.storyKnown('refuge'), true);
  assert.equal(restored.S().flags.settledEnding, 'A');
  assert.equal(restored.S().zone, 'shipwreck');
});

check('标题实图随资源发布，有存档先显示继续，空档优先开始', () => {
  let hasSave = true;
  const Game = {hasSave: () => hasSave};
  const app = {querySelectorAll: () => []};
  const document = {getElementById: () => null};
  const window = {__guyuLifecycleBound: true};
  const source = fs.readFileSync(path.join(root, 'js/ui/views/title.js'), 'utf8');
  const TitleView = new Function('Game', 'document', 'window', 'AudioFX', 'NoticeBadges', source + ';return TitleView')(
    Game, document, window, {setScene() {}}, {dot: () => '', refresh() {}});
  const title = TitleView.create({$: () => app, dom: {dispose() {}}});
  title.showTitle();
  assert.match(app.innerHTML, /id="btn-load" class="title-primary"[\s\S]+id="btn-new"/);
  const asset = app.innerHTML.match(/<img src="([^"]+)"/)[1];
  assert.ok(fs.statSync(path.join(root, asset)).size > 0);
  hasSave = false;
  title.showTitle();
  assert.match(app.innerHTML, /id="btn-new" class="title-primary"/);
  assert.doesNotMatch(app.innerHTML, /id="btn-load"/);
  assert.match(app.innerHTML, /class="title-utility"[\s\S]+id="btn-bak"/);
});

console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
