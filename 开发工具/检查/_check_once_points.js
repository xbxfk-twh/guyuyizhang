/* 一次性点位体检：data.js 里标了 once:true 的点位，点过一次之后必须真的变成"搜刮过"。
   规则：doPoint 只会给 **非 adventure** 的点位自动打 pt_ 标记；
   adventure 类由自己的分支在"奖励真的到手"时调 markDone()。
   所以 adventure + once 的分支里如果没有 markDone()，玩家就能反复刷（"救了四个小满"）。
   用法：node _check_once_points.js  */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const t = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const G = require('../../回归测试/helpers/runtime.js').engineSource(path.join(ROOT, 'js', 'game.js'));

// 点位定义里带 need:{}/yields:[] 这类嵌套，简单正则抓不到；改成"按 id 切段"再看这一段有没有 once:true
const starts = [];
const re = /\{ id:'([A-Za-z_0-9]+)'/g;
let m;
while ((m = re.exec(t))) starts.push({ id: m[1], at: m.index });
const pts = [];
for (let i = 0; i < starts.length; i++) {
  const seg = t.slice(starts[i].at, i + 1 < starts.length ? starts[i + 1].at : starts[i].at + 600);
  if (!/once:\s*true/.test(seg)) continue;
  pts.push({ id: starts[i].id, type: (seg.match(/type:'([a-z]+)'/) || [])[1] || 'gather' });
}
let bad = 0;
console.log('一次性点位共 ' + pts.length + ' 个：');

// 精确取出某个 `id === 'x'` 分支的完整代码块（按大括号配对，别把后一个分支的 markDone 算进来）
function branchOf(id) {
  const key = "id === '" + id + "'";
  // 跳过 p.id === 'x' 这种（那是 pointAvailable / altarReady 里的判断，不是 adventure 分支）
  let at = -1, from = 0;
  for (;;) {
    const i = G.indexOf(key, from);
    if (i < 0) break;
    if (G[i - 1] !== '.') { at = i; break; }
    from = i + key.length;
  }
  if (at < 0) return null;
  const open = G.indexOf('{', at);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < G.length; i++) {
    const c = G[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return G.slice(open, i + 1); }
  }
  return null;
}
for (const p of pts) {
  const need = p.type === 'adventure';
  let note;
  if (!need) note = '（非 adventure：doPoint 会自动打标记）';
  else {
    const seg = branchOf(p.id);
    if (seg === null) { note = '★ 找不到对应分支，无法确认！'; bad++; }
    else {
      note = /markDone\(\)/.test(seg) ? 'markDone ✓' : '★ 分支里没有 markDone() —— 能反复刷！';
      if (!/markDone\(\)/.test(seg)) bad++;
    }
  }
  console.log('  ' + p.id.padEnd(18) + ' type=' + p.type.padEnd(10) + note);
}
console.log(bad ? '\n有 ' + bad + ' 个一次性点位可能重复触发' : '\n全部一次性点位都会正确关闭');
