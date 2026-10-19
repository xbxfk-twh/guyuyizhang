/* 场景热点标签重叠检查（复刻 checks.js 的亚特兰蒂斯口径，扩展到全部场景）
   ⚠️ 这个检查器是有来历的：「黑暗兽吼 / 蛛巢」移位时发现——回归里**只查了亚特兰蒂斯**的热点重叠，
   场景热点从来没被查过，所以 2026-09-22 那两条反馈（"热点挤在一起/遮挡"）一直没被测出来。 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../孤屿遗章-游戏 - 发布');
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const box = {};
new Function('console', 'box', DATA + '\nObject.assign(box,{SCENE_HOTSPOTS:SCENE_HOTSPOTS,SCENES:SCENES});\n')(console, box);
const { SCENE_HOTSPOTS, SCENES } = box;

// 标签框估算：字号 15px + 12% 字距，多字标签更宽
const labelW = (label) => (String(label).replace(/[↑★]/g, '').length) * 16.8 + 26;
const labelH = 21;

function overlapsAt(sceneId, hotspots, sw, sh, baseW, baseH) {
  // ⚠️ 场景底图是 1280×720（不是 1536×1024 —— 那是亚特兰蒂斯海图的尺寸）
  const sCover = Math.max(sw / baseW, sh / baseH);
  const s = Math.min(Math.max(sw / baseW * 1.10, sh / baseH), sCover);   // 与 coverBox 同一口径
  const iw = baseW * s, ih = baseH * s;
  const ox = (sw - iw) / 2, oy = (sh - ih) / 2;
  const boxes = hotspots.map(h => {
    const w = labelW(h.label);
    const cx = ox + h.x / 100 * iw;
    const cy = oy + h.y / 100 * ih - 40;               // 箭头在上，标签在其上方
    return { label: h.label, l: cx - w / 2, r: cx + w / 2, t: cy - labelH / 2, b: cy + labelH / 2 };
  });
  const bad = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const A = boxes[i], B = boxes[j];
    if (A.l < B.r && B.l < A.r && A.t < B.b && B.t < A.b) bad.push(`${A.label}×${B.label}`);
  }
  // 也要检查是否跑出画面（跑出去 = 点不到）
  const off = boxes.filter(b => b.r < 0 || b.l > sw || b.b < 0 || b.t > sh).map(b => b.label);
  return { bad: [...new Set(bad)], off: [...new Set(off)] };
}

const sizes = [[1280, 720], [1600, 900], [2340, 1080], [1024, 640], [926, 428], [667, 375]];
console.log('=== 洞穴热点（新坐标） ===');
(SCENE_HOTSPOTS.cave || []).forEach(h => console.log(`  ${String(h.label).padEnd(6)} x=${h.x} y=${h.y}`));
console.log('');
let anyBad = false;
for (const sc of SCENES) {
  const hs = SCENE_HOTSPOTS[sc.id];
  if (!hs || !hs.length) continue;
  const problems = [];
  for (const [w, h] of sizes) {
    const r = overlapsAt(sc.id, hs, w, h, 1280, 720);
    if (r.bad.length) problems.push(`${w}×${h} 重叠: ${r.bad.join(',')}`);
    if (r.off.length) problems.push(`${w}×${h} 跑出画面: ${r.off.join(',')}`);
  }
  if (problems.length) { anyBad = true; console.log('★ ' + sc.name + '（' + sc.id + '）'); problems.forEach(p => console.log('    ' + p)); }
  else console.log('✅ ' + sc.name + '（' + sc.id + '）' + hs.length + ' 个热点：全部尺寸无重叠、无跑出画面');
}
console.log('');
console.log('通过 ' + (anyBad ? 0 : 1) + ' 项，失败 ' + (anyBad ? 1 : 0) + ' 项');
console.log(anyBad ? 'RESULT:FAIL' : 'RESULT:PASS');
if (anyBad) process.exitCode = 1;
