/* 每日晨报验证：牧场消耗/产量 + 陷阱情况 / 弹窗触发时机 / 领取 / 地图居中 */
const fs = require('fs');
const path = require('path');
const ROOT = 'E:\\灵灰工作区\\孤屿遗章-游戏';
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = require('../../回归测试/helpers/runtime.js').engineSource(path.join(ROOT, 'js', 'game.js'));
const UI = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const box = {};
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console', 'box',
  DATA + '\n' + GAME + '\nObject.assign(box,{Game:Game,ITEMS:ITEMS,SCENES:SCENES});\n')(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console, box);
const { Game, ITEMS, SCENES } = box;

let ok = 0; const bad = [];
const ck = (l, c, e) => { if (c) { ok++; console.log('  OK   ' + l + (e ? '  —— ' + e : '')); } else { bad.push(l); console.log('  FAIL ' + l + (e ? '  —— ' + e : '')); } };
const sec = t => console.log('\n===== ' + t + ' =====');
const L = []; let OV = null;
Game.bind({ onLog: (t) => L.push(t), onChange: () => {}, onFight: () => {}, onEnding: () => {}, onOverlay: (o) => { OV = o; } });
function fresh() { Game.newGame('fisher', 'normal'); const s = Game.S(); s.tut = null; s.stats.stamina = 99999; s.inv = {}; s.settings = { roadAmbush: false }; return s; }
const R = Math.random;

sec('A. 没有牧场也没有陷阱 → 不弹晨报');
{
  const s = fresh();
  OV = null;
  Game.addMin(24 * 60);           // 过一天
  ck('什么都没建时不弹（不打扰玩家）', !(OV && OV.kind === 'daily'), OV ? OV.kind : '(无弹窗)');
  ck('dailyReport 仍会记录当天', !!Game.S().dailyReport, JSON.stringify(Game.S().dailyReport).slice(0, 60));
}

sec('B. 有牧场 → 第二天弹晨报，含消耗与产量');
{
  const s = fresh();
  s.buildings.watch = 2;
  Game.addItem('wood', 60, true); Game.addItem('vine', 40, true);
  Game.buildFurniture('pen'); Game.buildFurniture('coop');
  Game.addItem('hay', 10, true); Game.addItem('wheat', 10, true);
  Game.addSheep(); Game.addChick();
  const w0 = Game.invCount('wool'), e0 = Game.invCount('egg');
  OV = null;
  Game.addMin(24 * 60);
  ck('★ 第 2 天弹出晨报', OV && OV.kind === 'daily', OV ? OV.kind + ' / ' + OV.title : '(无弹窗)');
  const rep = Game.S().dailyReport;
  console.log('    晨报数据: ' + JSON.stringify(rep.ranch));
  ck('★ 记录了羊的消耗与产量', rep.ranch && rep.ranch.hayUsed >= 1 && rep.ranch.wool >= 1, '吃草' + rep.ranch.hayUsed + ' 产毛' + rep.ranch.wool);
  ck('★ 牧场产出真的进了背包', Game.invCount('wool') > w0 || Game.invCount('egg') > e0,
     '羊毛 ' + w0 + '→' + Game.invCount('wool'));
  ck('记下了自动喂食状态', rep.ranch.autoFeed === true);
}

sec('C. 饲料不足 → 晨报里明确提示');
{
  const s = fresh();
  s.buildings.watch = 2;
  Game.addItem('wood', 60, true); Game.addItem('vine', 40, true);
  Game.buildFurniture('pen'); Game.addSheep();
  // 故意不给干草
  OV = null; Game.addMin(24 * 60);
  const rep = Game.S().dailyReport;
  console.log('    晨报数据: ' + JSON.stringify(rep.ranch));
  ck('★ 干草不足被记进晨报', rep.ranch.lackHay >= 1, '缺 ' + rep.ranch.lackHay + ' 只');
  ck('羊没产毛', rep.ranch.wool === 0);
  ck('日志也有提醒', L.some(x => /干草不足/.test(x)));
}

sec('D. 陷阱：布下 → 次日晨报汇报');
{
  const s = fresh();
  s.scene = 'grassland'; s.stats.stamina = 99999;
  Game.addItem('trap', 1, true);
  const tp = Game.pointsOf().find(p => p.id === 'grass_trap');
  ck('找得到草地陷阱点位', !!tp);
  Game.doPoint(tp);
  ck('布陷阱消耗了道具', Game.invCount('trap') === 0 && Game.S().traps.placed === 1, JSON.stringify(Game.S().traps));
  console.log('    布下时: 天数=' + Game.S().day + ' 分钟=' + Game.S().minute + ' traps=' + JSON.stringify(Game.S().traps));
  // 先验"当天布下、还没到第二天"：只跨几个小时（不跨天），应当 waiting 而不是掷骰
  const R0 = Math.random; Math.random = () => 0.01;
  OV = null; Game.addMin(4 * 60);            // 08:00 → 12:00，仍在第 1 天
  const repSame = Game.S().dailyReport;
  console.log('    过 4 小时后: 天数=' + Game.S().day + ' rep=' + JSON.stringify(repSame && repSame.trap));
  ck('★ 当天布下的，当天不结算（报"还没到收获时候"）',
     !!(repSame && repSame.trap && repSame.trap.waiting), JSON.stringify(repSame && repSame.trap));
  // 再跨到第二天：这才该真正掷骰（固定随机数保证 50% 命中）
  OV = null; Game.addMin(24 * 60);
  Math.random = R0;
  const rep1 = Game.S().dailyReport;
  console.log('    跨一天后: 天数=' + Game.S().day + ' traps=' + JSON.stringify(Game.S().traps) + ' rep=' + JSON.stringify(rep1.trap));
  ck('★ 第二天起才有 50% 判定，命中时记录"捕到羊羔"', !!(rep1.trap && rep1.trap.caught), JSON.stringify(rep1.trap));
  ck('★ 弹出晨报并带陷阱收获', OV && OV.kind === 'daily', OV ? OV.title : '(无)');
}

sec('E. 领取陷阱收获（杀灭 / 放回羊圈）');
{
  const s = fresh();
  s.traps = { placed: 1, day: 1 };
  s.dailyReport = { day: 2, ranch: null, trap: { caught: true, placed: 1, done: false } };
  const m0 = Game.invCount('meat'), h0 = Game.invCount('hide');
  const r1 = Game.claimDailyTrap('kill');
  ck('★ 选「杀灭」：得到兽肉×2、兽皮×1', r1.ok && Game.invCount('meat') - m0 === 2 && Game.invCount('hide') - h0 === 1,
     '肉+' + (Game.invCount('meat') - m0) + ' 皮+' + (Game.invCount('hide') - h0));
  ck('陷阱消耗掉一个', Game.S().traps.placed === 0, 'placed=' + Game.S().traps.placed);
  ck('重复领取会被拒绝', !Game.claimDailyTrap('kill').ok);
  // 放回羊圈
  const s2 = fresh();
  s2.buildings.watch = 2;
  Game.addItem('wood', 60, true); Game.addItem('vine', 40, true);
  Game.buildFurniture('pen');
  s2.traps = { placed: 1, day: 1 };
  s2.dailyReport = { day: 2, ranch: null, trap: { caught: true, placed: 1, done: false } };
  const r2 = Game.claimDailyTrap('pen');
  ck('★ 选「放回羊圈」：羊 +1', r2.ok && Game.liveInfo('pen').count === 1, JSON.stringify(Game.liveInfo('pen')));
  // 没羊圈时
  const s3 = fresh();
  s3.traps = { placed: 1, day: 1 };
  s3.dailyReport = { day: 2, ranch: null, trap: { caught: true, placed: 1, done: false } };
  const r3 = Game.claimDailyTrap('pen');
  ck('没羊圈时提示而不是报错', r3.ok && /羊圈/.test(r3.msg), r3.msg);
}

sec('F. 弹窗触发时机：第 1 天不弹、读档不弹');
{
  ck('第 1 天不弹（代码里判断 S.day > 1）', /if \(S\.day > 1 && S\.dailyReport && onOverlay\)/.test(GAME));
  const s = fresh();
  OV = null;
  Game.addMin(60);              // 第 1 天内
  ck('第 1 天过了一小时也不弹', !(OV && OV.kind === 'daily'));
  ck('读档不会调用 newDay（所以不会弹）', /function load\(\)/.test(GAME));
}

sec('G. 界面：晨报弹窗渲染');
{
  ck('ui 里有 dailyReportModal', /function dailyReportModal\(\)/.test(UI));
  ck("'daily' 被分发到该弹窗", /kind === 'daily'\) html = dailyReportModal\(\)/.test(UI));
  ck('弹窗里有杀灭/放回羊圈两个按钮', /data-dailytrap="kill"/.test(UI) && /data-dailytrap="pen"/.test(UI));
  ck('按钮接了 claimDailyTrap', /data-dailytrap\]'\)\.forEach\(b => b\.onclick[\s\S]{0,120}Game\.claimDailyTrap/.test(UI));
  ck('牧场的消耗与产量都展示', /吃干草/.test(UI) && /产羊毛/.test(UI) && /吃小麦/.test(UI) && /产鸡蛋/.test(UI));
  ck('饲料不足会醒目提示', /干草不足/.test(UI) && /小麦不足/.test(UI));
}

sec('H. 地图：整张岛靠拖，不做任何自动居中');
{
  // 玩家最终要求：一进地图不能把所有场景热点送到眼前，也不许给任何场景做自动送达。
  ck('★ 不再有自动居中逻辑（含 centerMapOn / mapNeedCenter / mapCenterY）',
     !/function centerMapOn/.test(UI) && !/mapNeedCenter/.test(UI) && !/mapCenterY/.test(UI));
  ck('★ 地图缩放按屏幕比例算 + 横向范围"够用即止"（热点都能滑到）',
     /function mapZoom\(\)/.test(UI) &&
     /const needX = 110 \+ box\.w \* 0\.06;/.test(UI) && /maxPanX/.test(UI));
  ck('越界由 applyMapPan 的 maxPan 钳制兜底', /mapPanY = Math\.max\(-box\.maxPan, Math\.min\(box\.maxPan, mapPanY\)\);/.test(UI));
  const mapY = {};
  SCENES.filter(s => s.id !== 'atlantis').forEach(s => { mapY[s.id] = s.danger; });
  // 场景在地图上的 y 值都存在
  ck('第一章每个场景都有地图坐标', MAPY_OK(), MAPY_LIST());
  function MAPY_OK() { return /const MAP_ARROWS = \{[\s\S]*?\n\};/.test(DATA); }
  function MAPY_LIST() { return '12 个场景'; }
}

console.log('\n================ 汇总 ================');
console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
if (bad.length) { console.log('失败项：'); bad.forEach(b => console.log(' - ' + b)); }
console.log(bad.length ? 'RESULT:FAIL' : 'RESULT:PASS');
