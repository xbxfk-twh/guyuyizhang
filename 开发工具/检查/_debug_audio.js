/* 音效/配乐体检：不用耳朵，用"事件统计"看听感问题。
   做法：用一个假的 AudioContext 记录每一次发声（频率/波形/时长/音量），
        再用假时钟把 60 秒的配乐与环境音"快进"跑一遍，统计：
        · 每分钟响多少次（越密越吵）
        · 高频"叮铃"占比（>1200Hz）
        · 刺耳波形占比（square / sawtooth）
        · 各类事件（水滴/虫鸣/鸟鸣/篝火/系统提示音）的次数
   用法：node _debug_audio.js                （跑当前版本）
         node _debug_audio.js <audio.js 路径> （对比另一份，例如 git 里的旧版） */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const AUDIO_PATH = process.argv[2] || path.join(ROOT, 'js', 'audio.js');
const SRC = fs.readFileSync(AUDIO_PATH, 'utf8');

// ---------- 假时钟：让 setTimeout/setInterval 可以快进 ----------
const realTimeout = global.setTimeout, realInterval = global.setInterval;
let now = 0, seq = 0;
let timers = new Map();
function fakeSetTimeout(fn, ms) { const id = ++seq; timers.set(id, { fn, at: now + (ms || 0), every: 0 }); return id; }
function fakeSetInterval(fn, ms) { const id = ++seq; timers.set(id, { fn, at: now + (ms || 0), every: Math.max(1, ms || 1) }); return id; }
function fakeClear(id) { timers.delete(id); }
function advance(ms) {
  const end = now + ms;
  for (;;) {
    let next = null;
    for (const [id, t] of timers) if (t.at <= end && (!next || t.at < next.t.at)) next = { id, t };
    if (!next) break;
    now = next.t.at;
    try { next.t.fn(); } catch (e) { console.log('  定时器回调抛错：' + e.message); }
    if (next.t.every) next.t.at = now + next.t.every; else timers.delete(next.id);
  }
  now = end;
}
global.setTimeout = fakeSetTimeout; global.setInterval = fakeSetInterval;
global.clearTimeout = fakeClear; global.clearInterval = fakeClear;

// ---------- 假 AudioContext：把每次发声记下来 ----------
const events = [];
function param(v) {
  return { value: v, setValueAtTime() { return this; }, linearRampToValueAtTime() { return this; }, exponentialRampToValueAtTime() { return this; }, cancelScheduledValues() { return this; } };
}
function node(extra) { return Object.assign({ connect() { return this; }, disconnect() {} }, extra || {}); }
const fakeCtx = {
  sampleRate: 48000, currentTime: 0, state: 'running', destination: node(),
  resume() {}, suspend() {},
  createGain: () => node({ gain: param(1) }),
  createDelay: () => node({ delayTime: param(0.3) }),
  createBiquadFilter: () => node({ type: 'lowpass', frequency: param(1000), Q: param(1) }),
  createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
  createBufferSource: () => node({ buffer: null, loop: false, start() {}, stop() {} }),
  createOscillator: () => {
    const o = node({ type: 'sine', frequency: param(440), _freq: 440, _started: null, _stopped: null,
      start() { this._started = now; }, stop() { this._stopped = now; if (this._kind === 'audio') events.push({ kind: 'tone', f: this._freq, type: this.type, dur: Math.max(0.01, (this._stopped - this._started) / 1000) }); } });
    o._kind = 'audio';
    Object.defineProperty(o, 'type', { get() { return o._type; }, set(v) { o._type = v; } });
    o.type = 'sine';
    o.frequency = { set value(v) { o._freq = v; }, get value() { return o._freq; }, setValueAtTime(v) { o._freq = v; }, exponentialRampToValueAtTime() {} };
    return o;
  },
};
global.window = { AudioContext: function () { return fakeCtx; }, _dshReverb: null };
global.console = console;

// ---------- 跑起来 ----------
new Function('window', 'console', 'advance', SRC + `
  AudioFX.init();
  AudioFX.setScene('camp');                 // 白天营地：篝火 + 海浪 + 风
  AudioFX.setFire(true);
  AudioFX.setEnv(true, 'sun');              // 入夜
  advance(60000);
  AudioFX.setScene('cave');                 // 洞穴：水滴 + 低频嗡鸣
  advance(60000);
  // 模拟玩家操作：20 条系统日志 + 5 次拾取 + 3 次交易 + 2 场战斗 + 10 次敲击
  for (let i = 0; i < 20; i++) AudioFX.notify('sys');
  for (let i = 0; i < 5; i++) AudioFX.play('pickup');
  for (let i = 0; i < 3; i++) AudioFX.play('trade');
  for (let i = 0; i < 2; i++) AudioFX.play('clash');
  for (let i = 0; i < 10; i++) AudioFX.play('click');
  advance(4000);
`)(global.window, console, advance);

global.setTimeout = realTimeout; global.setInterval = realInterval;

// ---------- 统计 ----------
const tones = events.filter(e => e.kind === 'tone');
const hi = tones.filter(t => t.f > 1200);
const harsh = tones.filter(t => t.type === 'square' || t.type === 'sawtooth');
const veryHi = tones.filter(t => t.f > 2500);
const byFreq = {};
for (const t of tones) { const k = t.f > 2500 ? '>2500Hz(叮铃区)' : t.f > 1200 ? '1200~2500Hz' : t.f > 400 ? '400~1200Hz' : '<400Hz(低频)'; byFreq[k] = (byFreq[k] || 0) + 1; }
console.log('文件：' + AUDIO_PATH);
console.log('总发声次数：' + tones.length);
console.log('  高频 >1200Hz：' + hi.length + ' 次（占 ' + Math.round(hi.length / Math.max(1, tones.length) * 100) + '%）  其中叮铃区 >2500Hz：' + veryHi.length + ' 次');
console.log('  刺耳波形(square/saw)：' + harsh.length + ' 次（占 ' + Math.round(harsh.length / Math.max(1, tones.length) * 100) + '%）');
console.log('  按频段分布：' + JSON.stringify(byFreq));
console.log('提示：叮铃区 >2500Hz 的次数越多、刺耳波形占比越高，听感越"拉胯"。');
