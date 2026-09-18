/* 生成《武器 DPS 对照》——数据全部从 js/data.js 现算，公式照 game.js 的战斗逻辑。
   用法：node _gen_dps_doc.js  → 写出 文档/武器DPS对照.md */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const OUT = path.join(__dirname, '..', '..', '文档', '武器DPS对照.md');
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
new Function('console', DATA + '\nObject.assign(globalThis, {ITEMS});')(console);
const { ITEMS } = globalThis;

const REF = 8;                 // 参照敌人防御
const ACC = 0.9;               // 近战/弓命中基准
const CRIT = 1 + 0.10 * 0.5;   // 10% 会心 ×1.5 的期望
const PISTOL_ACC = 0.6, PISTOL_ACC_CAL = 0.7;

// 攻速公式照 game.js 的 combatSpeed()：双持 = 两把攻速按攻击力加权平均 × 加成（双匕首 ×2、其余 ×1.5）
function dualSpeed(a, b) {
  const A = ITEMS[a], B = ITEMS[b];
  const wa = Math.max(1, A.atk || 1), wb = Math.max(1, B.atk || 1);
  const both = !!(A.dual && B.dual);
  return Math.round(((A.spd * wa + B.spd * wb) / (wa + wb)) * (both ? 2.0 : 1.5) * 10) / 10;
}
const hit = (dmg, acc) => acc * Math.max(1, dmg - REF) * CRIT;
const fmt = (x) => (Math.round(x * 10) / 10).toFixed(1);
const dps = (per, spd) => Math.round(per * spd);

const SOLO = ['knifeStone','ironDagger','club','spear','ironSword','coralBlade','steelSword','ironGreatSword','blackSword','sourceSpear'];
const DUAL = [['ironDagger','knifeStone'],['ironSword','ironDagger'],['blackSword','ironDagger'],['ironGreatSword','ironDagger'],['steelSword','blackSword']];

let md = '';
md += '# 《孤屿遗章》武器 DPS 对照\n\n';
md += '> 本表由 `开发工具\\生成\\_gen_dps_doc.js` 从 `js/data.js` **现算**，公式照 `js/game.js` 的战斗逻辑，不是手抄。\n';
md += '> 参照敌人防御 ' + REF + '；近战/弓命中 ' + Math.round(ACC*100) + '%；会心 10%×1.5 已折进期望。\n\n';
md += '**怎么读「单位 DPS」**：出手时间表里，攻速 = 单位时间能出手几次，\n';
md += '所以「每次行动伤害 × 攻速」越大，单位时间输出越高。\n';
md += '但攻速低同时意味着**挨打更多**（你出手一次的时间里，敌人按 敌速÷我速 还手），这部分代价没算进本表。\n\n';

md += '## 单手近战\n\n| 武器 | 攻击 | 攻速 | 每次行动伤害 | 单位 DPS |\n|---|---|---|---|---|\n';
md += '| 空手 | 5 | 10 | ' + fmt(hit(5, ACC)) + ' | ' + dps(hit(5, ACC), 10) + ' |\n';
for (const k of SOLO) {
  const it = ITEMS[k];
  const dmg = 5 + it.atk;
  const per = hit(dmg, ACC);
  md += '| ' + it.name + (it.twoHand ? '（双手）' : '') + ' | ' + it.atk + ' | ' + (it.spd || 10) + ' | ' + fmt(per) + ' | ' + dps(per, it.spd) + ' |\n';
}

md += '\n## 双持（伤害轮流出手，取两把均值）\n\n| 配置 | 两把攻击 | 攻速 | 每次行动伤害 | 单位 DPS |\n|---|---|---|---|---|\n';
for (const [a, b] of DUAL) {
  const A = ITEMS[a], B = ITEMS[b];
  const spd = dualSpeed(a, b);
  const per = (hit(5 + A.atk, ACC) + hit(5 + B.atk, ACC)) / 2;
  md += '| ' + A.name + ' + ' + B.name + ' | ' + A.atk + ' / ' + B.atk + ' | ' + spd + ' | ' + fmt(per) + ' | ' + dps(per, spd) + ' |\n';
}

md += '\n## 远程\n\n| 武器 | 攻击 | 攻速 | 命中 | 每次行动伤害 | 单位 DPS |\n|---|---|---|---|---|---|\n';
const bow = ITEMS.bow;
{
  const dmg = 5 + bow.atk + 8;   // 带鹰羽箭 +8
  const per = hit(dmg, ACC);
  md += '| ' + bow.name + '（带鹰羽箭） | ' + dmg + ' | ' + bow.spd + ' | 90% | ' + fmt(per) + ' | ' + dps(per, bow.spd) + ' |\n';
}
{
  const p = ITEMS.pistol;
  const dmg = 5 + p.atk;
  const per1 = hit(dmg, PISTOL_ACC), per2 = hit(dmg, PISTOL_ACC_CAL);
  md += '| ' + p.name + '（未校准） | ' + dmg + ' | ' + p.spd + ' | 60% | ' + fmt(per1) + ' | ' + dps(per1, p.spd) + ' |\n';
  md += '| ' + p.name + '（已校准） | ' + dmg + ' | ' + p.spd + ' | 70% | ' + fmt(per2) + ' | ' + dps(per2, p.spd) + ' |\n';
}

md += '\n## 抢先射击（开局白打的几发）\n\n';
md += '- 弓：装备弓且带箭 → 开局先射 **2~3 发**（攻击 ≥8 或战斗技能 ≥2 时 3 发）\n';
md += '- 手枪：**只抢射 1 发**\n\n';
md += '战斗越短，弓多出来的先手越值钱；但枪单发伤害是弓的 5 倍，实测累计伤害仍然领先：\n\n';
md += '| 玩家总出手 | 只拿弓 | 手枪未校准 | 手枪已校准 |\n|---|---|---|---|\n';
const bowPer = hit(5 + bow.atk + 8, ACC);
const gunPer = hit(5 + ITEMS.pistol.atk, PISTOL_ACC);
const gunPer2 = hit(5 + ITEMS.pistol.atk, PISTOL_ACC_CAL);
for (const N of [4, 6, 8, 12, 20, 40]) {
  md += '| ' + N + ' 次 | ' + Math.round((N + 2) * bowPer) + ' | ' + Math.round((N + 1) * gunPer) + ' | ' + Math.round((N + 1) * gunPer2) + ' |\n';
}

md += '\n---\n\n**已知取舍**：\n';
md += '- 手枪攻速 5 是全游戏最低档（与大剑 6 同属"重/慢"档），但单位 DPS 反而最高（148 / 173）。\n';
md += '  代价是**挨打频率**：攻速 5 时，速度 12 的敌人会在你每次行动期间还手约 2.4 次；攻速 14 的铁匕首只需挨 0.86 次。\n';
md += '- 命中 60% 看着低，但每次命中 55 点，期望仍是全游戏最高。\n';
md += '- 校准费 源矿×2，命中 60%→70%，一次性永久。\n';

fs.writeFileSync(OUT, md, 'utf8');
console.log('OK →', OUT, (md.length / 1024).toFixed(1) + ' KB');
