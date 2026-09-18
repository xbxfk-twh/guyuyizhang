/* 技能图标：一张图 3×3 = 9 个图标，批量出图（主人建议的"3×3 画法"）
   用法：$env:DASHSCOPE_API_KEY='sk-...'; node 开发工具\生成\_gen_skill_icons.js
   可选：$env:ICON_SHEET='1' 只重画某一张；$env:ICON_FORCE='1' 强制重画
   原图 → 归档\素材实验\技能图标原图\sheetN.png，再由 _slice_skill_icons.py 切成
   assets\img\skills\<名字>.png（128×128，深色墨线 + 透明底） */
const fs = require('fs');
const path = require('path');

const KEY = process.env.DASHSCOPE_API_KEY;
const MODEL = process.env.ICON_MODEL || 'qwen-image-3.0';
const SIZE = process.env.ICON_SIZE || '1024*1024';
const ONLY = process.env.ICON_SHEET || '';
const OUT = path.join(__dirname, '..', '..', '归档', '素材实验', '技能图标原图');
const API = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

const STYLE = 'black ink woodcut icon set on plain white background, thick clean hand-carved linework, high contrast, ' +
  'no shading gradients, no text, no letters, no numbers, no watermark, no signature, ' +
  'nine separate icons arranged in a clean 3x3 grid, each icon centered inside its own cell, even margins';

// 每个格子一个名字（切片脚本按这个顺序切）——名字要和 data.js 里的 icon 对上
const SHEETS = [
  ['sheet1', [
    ['g_yield',   'a cupped hand holding a small bundle of wheat and berries'],
    ['g_speed',   'a running boot with three motion lines behind it'],
    ['g_stam',    'a sturdy ox head with a small heart above it'],
    ['g_wood',    'an axe stuck in a cut log with wood chips flying'],
    ['g_nature',  'a tall pine tree with a wide open eye in front of it'],
    ['g_fine',    'a magnifying glass over a single leaf'],
    ['g_rough',   'a big hay rake dragging a pile of leaves'],
    ['c_speed',   'a hammer striking an anvil with sparks'],
    ['c_refund',  'an abacus with two coins in front of it'],
  ]],
  ['sheet2', [
    ['c_extra',   'a wooden crate with an extra plank popping out and a sparkle'],
    ['c_patch',   'a sewing needle with a patch of cloth and a spool of thread'],
    ['c_line',    'three interlocking gears on a straight production line'],
    ['c_finework','a hammer and a polished gemstone side by side'],
    ['k_atk',     'a straight sword pointing upward'],
    ['k_def',     'a tall round shield with a small cross boss'],
    ['k_crit',    'a burst of sharp star spikes hitting a cracked bone'],
    ['k_sweep',   'a very wide curved blade sweeping a horizontal arc'],
    ['k_exec',    'a heavy guillotine blade above a small skull'],
  ]],
  ['sheet3', [
    ['k_vamp',    'two crossed curved daggers dripping three drops of blood'],
    ['k_revenge', 'a clenched fist with flames and a small broken knife'],
    ['k_shield',  'a wall built of three overlapping shields'],
    ['k_swift',   'three parallel motion slashes with a wind swirl'],
    ['k_rage',    'a screaming furious face with a spiked collar'],
    ['k_iron',    'a thick iron wall plate with rivets'],
    ['k_bow',     'a longbow drawn with an arrow and a feather'],
    ['k_gun',     'a flintlock pistol firing a small spark'],
    ['skill_emblem','a stylised laurel branch around a small open book'],
  ]],
];

async function gen(sheetName, cells) {
  const list = cells.map(([n, d], i) => `(${i + 1}) ${d}`).join('; ');
  const prompt = STYLE + '. The nine icons are: ' + list + '.';
  const body = { model: MODEL, input: { messages: [{ role: 'user', content: [{ text: prompt }] }] },
    parameters: { size: SIZE, n: 1, watermark: false, prompt_extend: false } };
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const r = await fetch(API, { method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const txt = await r.text();
      if (r.status === 429) { console.log('  … ' + sheetName + ' 被限流，等 20 秒重试'); await new Promise(z => setTimeout(z, 20000)); continue; }
      let j = null; try { j = JSON.parse(txt); } catch (e) {}
      if (!r.ok || !j) { console.log('  ✗ ' + sheetName + ' HTTP ' + r.status + '：' + txt.slice(0, 180)); return false; }
      const ch = j.output && j.output.choices && j.output.choices[0];
      const item = ch && ch.message && ch.message.content && ch.message.content.find(c => c.image);
      if (!item) { console.log('  ✗ ' + sheetName + ' 没拿到图：' + txt.slice(0, 180)); return false; }
      const img = await fetch(item.image);
      if (!img.ok) { console.log('  ✗ ' + sheetName + ' 下载失败 ' + img.status); return false; }
      fs.mkdirSync(OUT, { recursive: true });
      const buf = Buffer.from(await img.arrayBuffer());
      fs.writeFileSync(path.join(OUT, sheetName + '.png'), buf);
      console.log('  ✓ ' + sheetName + '  ' + Math.round(buf.length / 1024) + 'KB');
      return true;
    } catch (e) { console.log('  ✗ ' + sheetName + ' 第 ' + attempt + ' 次失败：' + e.message); }
  }
  return false;
}

async function main() {
  if (!KEY) { console.log("没有 DASHSCOPE_API_KEY，先 $env:DASHSCOPE_API_KEY='sk-...'"); return; }
  const todo = ONLY ? SHEETS.filter(([n]) => n === ONLY) : SHEETS;
  for (const [n, cells] of todo) {
    if (!process.env.ICON_FORCE && fs.existsSync(path.join(OUT, n + '.png'))) { console.log('  · ' + n + ' 已经在了，跳过'); continue; }
    await gen(n, cells);
    await new Promise(z => setTimeout(z, 15000));
  }
  console.log('完成。下一步：python 开发工具\\生成\\_slice_skill_icons.py');
}
main();
