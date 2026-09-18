/* 生成《孤屿遗章》开场分镜（新存档专属的 5 格漫画）
   走阿里云百炼（DashScope）原生出图接口 —— 和 _gen_portraits.js 同一套。

   用法：
     $env:DASHSCOPE_API_KEY='sk-...'; node 开发工具\生成\_gen_comic.js
     可选：$env:COMIC_SIZE（默认 1536*1024 横版）、$env:COMIC_ONLY（只重跑某一格，如 3）

   原图落到：归档\素材实验\开场分镜原图\<n>_<name>.png
   再由 开发工具\生成\_shrink_comic.py 压成 assets\img\comic\<n>_<name>.png

   风格：跟游戏一致的【黑白木刻版画】——密排排线、高对比、做旧纸纹；
   一律 no text（分镜文字由界面排版，不烧进图里）。 */
const fs = require('fs');
const path = require('path');

const KEY = process.env.DASHSCOPE_API_KEY;
const MODEL = process.env.COMIC_MODEL || 'qwen-image-3.0';
const SIZE = process.env.COMIC_SIZE || '1536*1024';
const ONLY = process.env.COMIC_ONLY || '';
const OUT = path.join(__dirname, '..', '..', '归档', '素材实验', '开场分镜原图');
const API = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

const STYLE = 'black and white woodcut engraving illustration, dense cross-hatching, high contrast chiaroscuro, ' +
  'aged rough paper texture, dramatic cinematic composition, moody stormy atmosphere, hand-carved print look, ' +
  'no text, no letters, no caption, no watermark, no signature, no border, no frame';

const LIST = [
  ['1_legend', 'a dim candle-lit harbour tavern at night, a young sailor leaning over an old sea chart spread on a wooden table, ' +
    'an old bearded sailor pointing at a drawing of a sunken ruined city with tall towers, mugs and a lantern, rain streaming down the window, ' +
    'other sailors listening in the shadows'],
  ['2_setsail', 'a small wooden sailing boat leaving a stone harbour at dawn, canvas sail full of wind, a young sailor standing at the tiller ' +
    'looking toward the open horizon, a lighthouse and rocky cliffs behind, gulls overhead, long morning shadows on the water'],
  ['3_storm', 'a tiny wooden sailing boat on a monstrous black stormy ocean, a towering wave about to break over it, bent mast and torn sail, ' +
    'lightning splitting the dark sky, torrential rain, a young sailor gripping the tiller, spray flying everywhere'],
  ['4_sink', 'a young sailor sinking deep under dark churning water, one arm reaching up toward the fading light far above, ' +
    'broken planks and rope and a torn sail sinking around, streams of bubbles, wreckage fading into black depths'],
  ['5_wake', 'a young sailor lying face down on a wet grey deserted beach, half buried in sand, seaweed and broken ship debris and a length of rope ' +
    'beside him, the storm breaking apart above, low fog, a distant forested mountain island on the horizon'],
];

async function gen(name, subject) {
  const prompt = STYLE + ', ' + subject;
  const body = {
    model: MODEL,
    input: { messages: [{ role: 'user', content: [{ text: prompt }] }] },
    parameters: { size: SIZE, n: 1, watermark: false, prompt_extend: true },
  };
  // ⚠️ 百炼的免费额度有"每分钟请求数"限制，并发 5 条会被 429 挡回来（实测）。
  //    所以这里串行 + 退避：失败等 20 秒再来，最多 6 次。
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const txt = await r.text();
      let j = null; try { j = JSON.parse(txt); } catch (e) {}
      if (r.status === 429) { console.log('  … ' + name + ' 被限流（第 ' + attempt + ' 次），等 20 秒重试'); await new Promise(z => setTimeout(z, 20000)); continue; }
      if (!r.ok || !j) { console.log('  ✗ ' + name + ' HTTP ' + r.status + '：' + txt.slice(0, 200)); return false; }
      const ch = j.output && j.output.choices && j.output.choices[0];
      const item = ch && ch.message && ch.message.content && ch.message.content.find(c => c.image);
      if (!item) { console.log('  ✗ ' + name + ' 没拿到图：' + txt.slice(0, 200)); return false; }
      const img = await fetch(item.image);
      if (!img.ok) { console.log('  ✗ ' + name + ' 下载失败 HTTP ' + img.status); return false; }
      const buf = Buffer.from(await img.arrayBuffer());
      fs.mkdirSync(OUT, { recursive: true });
      const f = path.join(OUT, name + '.png');
      fs.writeFileSync(f, buf);
      console.log('  ✓ ' + name + '  ' + Math.round(buf.length / 1024) + 'KB  → ' + f);
      return true;
    } catch (e) {
      console.log('  ✗ ' + name + ' 第 ' + attempt + ' 次失败：' + e.message);
    }
  }
  return false;
}

async function main() {
  if (!KEY) { console.log('没有 DASHSCOPE_API_KEY，先 $env:DASHSCOPE_API_KEY=\'sk-...\''); return; }
  const todo = ONLY ? LIST.filter(([n]) => n.startsWith(ONLY + '_')) : LIST;
  console.log('生成开场分镜 ' + todo.length + ' 格（' + MODEL + ' / ' + SIZE + '）→ ' + OUT);
  // 串行：一张一张来（并发会 429）；已经出过的格子直接跳过，省钱省时间
  const results = [];
  for (const [n, s] of todo) {
    if (!process.env.COMIC_FORCE && fs.existsSync(path.join(OUT, n + '.png'))) { console.log('  · ' + n + ' 已经在了，跳过（要重出就 $env:COMIC_FORCE=1）'); results.push(true); continue; }
    results.push(await gen(n, s));
    await new Promise(z => setTimeout(z, 15000));   // 两格之间歇一会儿，别撞限流
  }
  console.log('完成：成功 ' + results.filter(Boolean).length + ' / ' + todo.length);
  if (results.some(x => !x)) console.log('有失败格，重跑：$env:COMIC_ONLY=\'<编号>\'; node 开发工具\\生成\\_gen_comic.js');
}
main();
