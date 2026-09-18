/* 生成人物立绘「彩绘卡面」：走阿里云百炼（DashScope）原生出图接口
   —— 中转站的 /v1/images/generations 在百炼上不存在（404），所以用原生接口。

   用法：
     $env:DASHSCOPE_API_KEY='sk-...'; node 开发工具\生成\_gen_portraits.js
     （可选环境变量：PORTRAIT_MODEL 默认 qwen-image-3.0；PORTRAIT_SIZE 默认 1024*1536）

   输出：孤屿遗章-游戏 - 发布/assets/img/identities-card/<身份id>.png
   风格：照作者给的样板 —— 日系全彩卡面、暖光、同主题道具背景、构图饱满、无文字无边框。
*/
const fs = require('fs');
const path = require('path');

const KEY = process.env.DASHSCOPE_API_KEY;
const MODE = process.env.PORTRAIT_MODE || 'card';   // card = 彩绘卡面；bw = 默认那套黑白木刻
const MODEL = process.env.PORTRAIT_MODEL || 'qwen-image-3.0';
const SIZE = process.env.PORTRAIT_SIZE || '1024*1536';
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const OUT = (MODE === 'bw')
  ? path.join(ROOT, 'assets', 'img', 'identities')
  : path.join(ROOT, 'assets', 'img', 'identities-card');
const API = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

const STYLE_CARD = 'Japanese anime style full-color character illustration card, vertical 3:4 composition, soft painterly shading, warm rim light, cinematic depth of field, subtle film grain, rich detailed themed background with related tools and props, expressive face, half-body shot, no text, no watermark, no logo, no frame, no border';
const STYLE_BW = 'black and white woodcut engraving style portrait, heavy cross-hatching, high contrast, aged paper texture, half-body shot of a person, plain pale background, no text, no watermark, no frame';
const STYLE = (MODE === 'bw') ? STYLE_BW : STYLE_CARD;

const LIST_CARD = [
  ['fisher',     'a young fisherman with a bamboo fishing rod over the shoulder, wet hair, coiled fishing net, seaside village at dawn, gulls, warm morning light'],
  ['woodcutter', 'a young woodcutter holding a stone axe, plaid shirt, forest clearing with cut logs and wood chips, dappled sunlight, birds'],
  ['herbalist',  'a young herbalist girl with twin tails holding two test tubes of glowing green and yellow potion above an open alchemy book, herb-filled workshop with drying plants and lanterns, warm amber light'],
  ['smith',      'a young apprentice blacksmith holding a hammer and tongs, leather apron, glowing forge and flying sparks, soot on cheek, dark smithy'],
  ['beekeeper',  'a young beekeeper holding a honeycomb frame beside a wooden bee box, bees flying around, straw hat with veil lifted, forest meadow, warm honey light'],
];
// 默认那套（黑白木刻）只差养蜂人这一张
const LIST_BW = [
  ['beekeeper',  'a beekeeper with a straw hat holding a honeycomb frame, bees around, a wooden bee box at the side'],
];
const LIST = (MODE === 'bw') ? LIST_BW : LIST_CARD;

async function gen(name, subject) {
  const prompt = STYLE + ', ' + subject;
  const body = {
    model: MODEL,
    input: { messages: [{ role: 'user', content: [{ text: prompt }] }] },
    parameters: { size: SIZE, n: 1, watermark: false, prompt_extend: true },
  };
  const r = await fetch(API, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  let j = null; try { j = JSON.parse(txt); } catch (e) {}
  if (!r.ok || !j) { console.log('  ✗ ' + name + ' 接口报错 HTTP ' + r.status + '：' + txt.slice(0, 220)); return false; }
  const choice = j.output && j.output.choices && j.output.choices[0];
  const item = choice && choice.message && choice.message.content && choice.message.content.find(c => c.image);
  if (!item) { console.log('  ✗ ' + name + ' 没拿到图片地址：' + txt.slice(0, 220)); return false; }
  const img = await fetch(item.image);
  if (!img.ok) { console.log('  ✗ ' + name + ' 下载失败 HTTP ' + img.status); return false; }
  const buf = Buffer.from(await img.arrayBuffer());
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, name + '.png');
  fs.writeFileSync(file, buf);
  console.log('  ✓ ' + name + '.png  ' + Math.round(buf.length / 1024) + 'KB');
  return true;
}

(async () => {
  if (!KEY) { console.log('缺 DASHSCOPE_API_KEY 环境变量'); process.exit(1); }
  console.log('模型 ' + MODEL + '，尺寸 ' + SIZE + '，输出到 ' + OUT);
  let ok = 0;
  for (const [name, subject] of LIST) {
    console.log('生成 ' + name + ' …');
    try { if (await gen(name, subject)) ok++; } catch (e) { console.log('  ✗ ' + name + ' 异常：' + (e && e.message)); }
  }
  console.log('完成：' + ok + '/' + LIST.length + ' 张');
})();
