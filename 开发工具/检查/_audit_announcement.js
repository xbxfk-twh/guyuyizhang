/* 公告自检：把公告里的每一条，逐项对照代码/数据验证是否真的生效。
   注意：下面的条目主要对应 v1.05 那一版公告 + 后续追加项；新版本公告请同步往 _verify_all.js 里补条目。
   用法：node _audit_announcement.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');
const UI = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
const AUDIO = fs.readFileSync(path.join(ROOT, 'js', 'audio.js'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const store = {};
const fakeLS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
let ok = 0, bad = [];
const box = {};
new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console', 'box',
  DATA + '\n' + GAME + '\n' +
  'Object.assign(box, this && {});' +
  'box.ITEMS=ITEMS; box.RECIPES=RECIPES; box.SCENES=SCENES; box.ENEMIES=ENEMIES; box.DIFFICULTIES=DIFFICULTIES;' +
  'box.FURNITURE=FURNITURE; box.DURA=DURA; box.RELICS=RELICS; box.PATCH_NOTES=PATCH_NOTES; box.REDEEM_CODES=REDEEM_CODES; box.Game=Game;'
)(fakeLS, {}, {}, fs, ROOT, DATA, GAME, console, box);
const { ITEMS, RECIPES, SCENES, ENEMIES, DIFFICULTIES, FURNITURE, DURA, RELICS, PATCH_NOTES, REDEEM_CODES, Game } = box;

const ck = (label, cond, extra) => { if (cond) { ok++; console.log('  ✓ ' + label + (extra ? '  —— ' + extra : '')); } else { bad.push(label); console.log('  ✗ ' + label + (extra ? '  —— ' + extra : '')); } };
const has = (hay, needle) => hay.indexOf(needle) >= 0;

console.log('=== 公告条目核对（v1.05）===');

console.log('\n【界面手感】');
ck('底部按钮：直角 + 无顶部高光 + 手机底栏 30px', /#nav button \{[\s\S]{0,400}?border-radius: 0;/.test(CSS) && !/#nav button \{[\s\S]{0,400}?inset 0 1px 0 rgba\(255,255,255/.test(CSS) && /:root \{ --navh: 30px; \}/.test(CSS));
ck('咔哒音效：清脆 clickTick + 独立音效总线', /function clickTick\(\)/.test(AUDIO) && /function toggleSfx\(\)/.test(AUDIO) && /if \(!ctx \|\| !sfxOn\) return;/.test(AUDIO));
ck('设置面板：音乐/音效/环境音三开关 + 日志三档 + 皮肤包（真按钮，不是占位符）', /function settingsModal\(\)/.test(UI) && /btn\('music:on'/.test(UI) && /btn\('sfx:on'/.test(UI) && /btn\('amb:on'/.test(UI) && /btn\('log:always'/.test(UI) && /btn\('log:fade'/.test(UI) && /btn\('log:hidden'/.test(UI) && /btn\('skin:' \+ s\.id/.test(UI) && !/敬请期待/.test(UI));
ck('主界面菜单化：只留设置按钮，图鉴/签到收进设置里（真能点开）',
   /id="btn-set"/.test(UI) && !/id="btn-codex"/.test(UI) && !/id="btn-sign"/.test(UI) &&
   /data-open="collection"/.test(UI) && /data-open="sign"/.test(UI) && /querySelectorAll\('\[data-open\]'\)/.test(UI));
ck('图鉴账号级、没存档也能看', /const st = S\(\) \|\| \{ seen: \{\}, killCount: \{\}, flags: \{\} \};/.test(UI) && /const seen = \(S && S\.seen\) \|\| \{\};/.test(GAME));

console.log('\n【大地图】');
ck('舞台铺满（不再锁 16:9）', /stage\.style\.width = w \+ 'px';/.test(UI) && !/Math\.round\(w \* 9 \/ 16\)/.test(UI));
// 作者 2026-09-15 定调：大地图【宽度=屏幕宽度】、只有上下能拖（横向锁死），热点跟着地图一起走
ck('地图宽度贴合屏幕 + 可上下拖（横向锁死）+ 热点跟着一起走',
   /function mapBox\(iw, ih, bw, bh\)/.test(UI) && /function bindPan\(sel, getPan, setPan, settle\)/.test(UI) &&
   /applyBox\('#map-arrows', box, mapPanY, 0\)/.test(UI) && /mapPanX = 0;/.test(UI));
// 曾试过"贴边浮动标签"和"滑出画面整条隐藏"，都不对。作者最终要求：
// 热点像印在地图上 —— 随图滑动、被屏幕裁掉就自然滑出去，不突然消失、不独立位移。
ck('地图热点完全锁定在地图上（不显隐、不独立位移、不贴边浮动）',
   /a\.classList\.remove\('offscreen'\)/.test(UI) && !/classList\.add\('offscreen'\)/.test(UI) &&
   /a\.style\.marginLeft = ''/.test(UI) && !/classList\.add\('pinned'/.test(UI) && !/\.map-arrow\.pinned \{/.test(CSS));
// 作者 2026-09-15 定调：回地图**要**自动对准当前所在地，但绝不越界（不出现黑边）；
// 热点本身仍然钉死在地图坐标上，不许有任何独立位移或动画（山顶、珍珠洞窟也一样）。
ck('★ 回地图自动对准当前所在地 + 不越界（热点仍只钉在地图坐标上）',
   /function centerMapOnHere/.test(UI) && /mapPendingCenter/.test(UI) &&
   /const limY = Math\.max\(0, \(box\.h - wrap\.clientHeight\) \/ 2\);/.test(UI) &&
   !/classList\.add\('arrow-below'/.test(UI) && !/classList\.toggle\('arrow-below'/.test(UI) && !/arrow-below/.test(CSS));
ck('第一章大地图显示天气', /mwo\.className = st\.scene === 'atlantis' \? '' : \(st\.weather === 'rain'/.test(UI));

console.log('\n【战斗与难度】');
ck('出手 = 时间追赶（比例攒出手 + 同时结算）', /C\.accE = Math\.max\(0, Math\.min\(3, \(C\.accE \|\| 0\) \+ _spdE \/ _spdP\)\)/.test(GAME) && /if \(twin\) \{ doEnemyTurn\(\); doPlayerTurn\(\); \}/.test(GAME));
ck('防御效率 100/90/80/70', DIFFICULTIES.easy.defEff === 1 && DIFFICULTIES.normal.defEff === 0.9 && DIFFICULTIES.hard.defEff === 0.8 && DIFFICULTIES.legend.defEff === 0.7 && /defPart = myDef \* defEff/.test(GAME));
ck('群袭 50% 两只 + 触手必两只', /packAlways/.test(DATA) && /enemy\.packAlways \? 2 : \(chance\(0\.5\) \? 2 : 1\)/.test(GAME) && ENEMIES.tentacle.packAlways === 1);
ck('沉没之王「穿透」实装', /includes\('pierce'\)/.test(GAME) && (ENEMIES.sunkenKing.traits || []).includes('pierce'));

console.log('\n【生存与平衡】');
ck('夏天中暑 / 冬天过冷（每小时扣血）', /season\.heat && clothWarm >= 4/.test(GAME) && /coldNeed > 0 && warm < coldNeed/.test(GAME));
ck('潜水服保暖 +2', ITEMS.diveSuit.warm === 2 && ITEMS.diveSuit2.warm === 2);
ck('工具每高一级快 20%', /\(1 - \(tt - 1\) \* 0\.2\)/.test(GAME));
ck('渔网造价 藤蔓6+木材3、耐久 10', RECIPES.find(r => r.id === 'r_net').in.vine === 6 && RECIPES.find(r => r.id === 'r_net').in.wood === 3 && DURA.net === 10);
ck('夜袭：首次之后才有随机 + 50 天 5 匹', /S\.flags\.firstRaidDone \|\| S\.day > raidDay\(\)/.test(GAME) && /1 \+ Math\.floor\(d \/ 12\.5\)/.test(GAME) && /Math\.min\(5, 1 \+ Math\.floor\(d \/ 12\.5\)\)/.test(GAME));
ck('草药膏 20 / 绷带 10+止血 / 大煎蛋 10', ITEMS.herbPaste.heal === 20 && ITEMS.bandage.heal === 10 && !!ITEMS.bandage.stopBleed && ITEMS.bigOmelette.heal === 10);
ck('熏鱼/熏肉 需要 2 树枝', RECIPES.find(r => r.id === 'r_smokedfish').in.branch === 2 && RECIPES.find(r => r.id === 'r_smokedmeat').in.branch === 2);
ck('精神恢复下调（床 6/7/9/10、提神茶 14）', ['bed1','bed2','bed3','bed4'].map(b => FURNITURE.find(f => f.id === b).spirit).join(',') === '6,7,9,10' && ITEMS.tea.spirit === 14);
ck('河畔撒网 = 竭泽而渔 4 天', /riverNetBan/.test(GAME) && /先前竭泽而渔了/.test(GAME));

console.log('\n【邮箱】');
ck('v1.05 公告已批准，会进邮箱', (PATCH_NOTES || []).some(n => n.version === 'v1.05' && n.approved === true));
{
  Game.newGame('fisher', 'normal');
  const m = Game.metaState();
  m.mailbox = (m.mailbox || []).filter(x => !x.notice);
  m.patchSent = m.patchSent || {}; delete m.patchSent['v1.05'];
  const got = Game.mailboxList().filter(x => x.notice === 'v1.05');
  const again = Game.mailboxList().filter(x => x.notice === 'v1.05').length;
  ck('公告只发一次，点「知道了」能移除', got.length === 1 && again === 1 && (() => { const i = Game.mailboxList().findIndex(x => x.notice === 'v1.05'); return i >= 0 && Game.claimMailbox(i).ok; })());
}

console.log('\n【重要修复】');
ck('死亡后继续游戏会清掉结算状态（结局按钮不再消失）', /function continueRun\(\)/.test(GAME) && /if \(S\.ending\) S\.ending = undefined;/.test(GAME) && /Game\.continueRun\(\)/.test(UI));
ck('山顶祭坛热点会重新亮起 + 可直接举行仪式', /function altarReady\(p\)/.test(GAME) && /ritualReady/.test(UI) && /祭坛 · 举行仪式/.test(UI));
ck('山顶祭坛：领奖才标记已搜刮（不会一点开就永久作废）',
   /if \(p\.once && p\.type !== 'adventure'\) S\.flags\['pt_'\+p\.id\] = 1;/.test(GAME) && /function onceRewardMissing\(p\)/.test(GAME) && /祭坛 · 取回遗物/.test(UI));
ck('存档日志截到 200 条（存档瘦身）', /const LOG_KEEP = 200;/.test(GAME) && /copy\.log\.length = LOG_KEEP/.test(GAME));
ck('随机事件条件改成"全部满足"（雾天漏雨 bug 已修）',
   /function randomEventPool\(sceneId\)/.test(GAME) && /if \(c\.rain && !\(S\.weather === 'rain' \|\| S\.weather === 'storm'\)\) return false;/.test(GAME) && /if \(c\.houseBelow && !\(S\.buildings\.house < c\.houseBelow\)\) return false;/.test(GAME));

console.log('\n【送礼码（不在公告/活动页）】');
{
  const codes = { HAPPY9: 'vampire', HAPPY8: 'dodge', HAPPY7: 'satchel', HAPPY6: 'bloodvest', HAPPY5: 'atlantisSeed' };
  const fine = Object.entries(codes).every(([c, rid]) => REDEEM_CODES[c] && REDEEM_CODES[c].relic === rid);
  ck('happy5~9 = 五个神物', fine && Object.keys(RELICS).length === 5, Object.keys(RELICS).join('、'));
  ck('resource1 = 10 金币', REDEEM_CODES.RESOURCE1 && REDEEM_CODES.RESOURCE1.item === 'coin' && REDEEM_CODES.RESOURCE1.qty === 10);
  ck('这些码没写进活动页/公告', !/HAPPY[5-9]|RESOURCE1/.test(UI) && !/HAPPY[5-9]|RESOURCE1/.test(JSON.stringify(PATCH_NOTES)));
}

console.log('\n【打包相关】');
ck('index.html 版本号已更新到本版', /BUILD_VER = 'v1\.\d+/.test(HTML) && /window\.BUILD_VER = '([^']+)'/.test(HTML) && (() => {
  const bv = (HTML.match(/window\.BUILD_VER = '([^']+)'/) || [])[1] || '';
  const qs = [...HTML.matchAll(/\?v=([^"]+)/g)].map(m => m[1]);
  return bv && qs.length >= 5 && qs.every(q => q === bv);   // 版本号必须和所有资源缓存参数一致，否则玩家浏览器会拿旧 js/css
})(), (HTML.match(/window\.BUILD_VER = '([^']+)'/) || [])[1]);

console.log('\n================ 汇总 ================');
console.log('通过 ' + ok + ' 项，失败 ' + bad.length + ' 项');
if (bad.length) { console.log('失败项：'); bad.forEach(b => console.log(' - ' + b)); }
console.log(bad.length ? 'RESULT:FAIL' : 'RESULT:PASS');
