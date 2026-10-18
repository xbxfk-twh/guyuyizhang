/* ============================================================
   孤屿遗章 · 音频引擎
   本地实录音效/环境音/角色短句 + Web Audio 氛围配乐与回退音效
   ============================================================ */
const AudioFX = (() => {
  let ctx = null;
  let hostSuspended = false;
  let master = null;      // 总音量
  let musicBus = null;    // 音乐 / 环境音总线（受"音乐"开关控制）
  let sfxBus = null;      // 音效总线（受"音效"开关控制，和音乐互不影响）
  let enabled = true;
  let sfxOn = true;
  let currentScene = 'title';
  let currentNight = false;
  let currentWeather = 'sun';
  let layers = {};   // 环境层
  let musicTimer = null;
  let currentDeep = false;
  let currentTension = 0;
  let crackleTimer = null;

  // 短音效池避免密集操作无限创建音频；短句单路播放，不互相叠加。
  const sampleNames = new Set(['click','pickup','trade','good','work','build','travel','swing','clash','hit','critical','guard','dodge','bow','lotteryTick','lotteryStart','lotteryEmpty','lotteryWin']);
  const samples = []; let voice = null; let voiceOn = true;
  try { voiceOn = window.localStorage.getItem('guyu_voice') !== 'off'; } catch(e) {}
  function sample(name) {
    if (!sampleNames.has(name) || !window.Audio) return false;
    try {
      let slot = samples.find(s => s.audio.paused || s.audio.ended);
      if (!slot && samples.length < 6) { slot={audio:new window.Audio(), stamp:0}; samples.push(slot); }
      if (!slot) slot=samples.reduce((a,b)=>a.stamp<b.stamp?a:b);
      slot.audio.pause(); slot.audio.src=`assets/audio/sfx/${name}.mp3`;
      slot.audio.volume=name==='click' ? 0.18 : name.startsWith('lottery') ? 0.45 : 0.32;
      slot.stamp=Date.now(); const p=slot.audio.play(); if(p && p.catch) p.catch(()=>{});
      return true;
    } catch(e) { return false; }
  }
  function stopVoice() { if (voice) { voice.pause(); voice=null; } }
  function playVoice(who, index) {
    if (hostSuspended || !ctx || !sfxOn || !voiceOn || !window.Audio || !/^(laochao|grocer|smith|informant|gourmet|black|fishman|atlTrade|linghui)$/.test(who) || !Number.isInteger(index)) return;
    stopVoice();
    try { voice=new window.Audio(`assets/audio/voices/${who}-${index}.mp3`); voice.volume=0.65; const p=voice.play(); if(p && p.catch) p.catch(()=>{}); } catch(e) {}
  }
  function voiceState() { return voiceOn; }
  function toggleVoice() { voiceOn=!voiceOn; if(!voiceOn) stopVoice(); try { window.localStorage.setItem('guyu_voice',voiceOn?'on':'off'); }catch(e){} return voiceOn; }
  // ---------- 基础 ----------
  function init() {
    if (hostSuspended) return;
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)({latencyHint:'interactive'});
      master = ctx.createGain();
      master.gain.value = 0.9;
      // 两路各自过一道"温暖"低通：把方波/高频尖角磨掉，听感不刺耳但依然清楚
      musicBus = ctx.createGain(); musicBus.gain.value = enabled ? 1 : 0;
      const musicWarm = ctx.createBiquadFilter(); musicWarm.type = 'lowpass'; musicWarm.frequency.value = 2000; musicWarm.Q.value = 0.5;
      musicBus.connect(musicWarm); musicWarm.connect(master);
      sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? 1 : 0;
      const sfxWarm = ctx.createBiquadFilter(); sfxWarm.type = 'lowpass'; sfxWarm.frequency.value = 7000; sfxWarm.Q.value = 0.4;
      sfxBus.connect(sfxWarm); sfxWarm.connect(master);
      // 主混响（反馈延迟做空间感）
      // 反馈延迟当混响用：以前 0.42s/35% 反馈太"金属"，听感发闷发塑（玩家反馈像"湿塑料蹭地"）。
      // 改短、减弱反馈，只留一层淡淡的尾音。
      const delay = ctx.createDelay(1.5);
      delay.delayTime.value = 0.30;
      const fb = ctx.createGain(); fb.gain.value = 0.22;
      const wet = ctx.createGain(); wet.gain.value = 0.18;
      delay.connect(fb); fb.connect(delay);
      delay.connect(wet); wet.connect(musicBus);
      master.connect(ctx.destination);
      window._dshReverb = delay;
      startMusic();
    } catch(e) { console.warn('audio init failed', e); }
  }
  // 包装宿主的生命周期接口；保留玩家音量开关，恢复时重建环境层。
  function setHostSuspended(on) {
    if (hostSuspended === !!on) return;
    hostSuspended = !!on;
    if (hostSuspended) {
      stopLayers(); samples.forEach(slot => slot.audio.pause()); stopVoice();
      if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
    } else if (ctx) {
      ctx.resume().catch(() => {});
      setScene(currentScene, currentDeep);
    }
  }
  function toggle() { enabled = !enabled; if (musicBus) musicBus.gain.value = enabled ? 1 : 0; if(ctx) setScene(currentScene,currentDeep); return enabled; }
  function toggleSfx() { sfxOn = !sfxOn; if (!sfxOn) { samples.forEach(s=>s.audio.pause()); stopVoice(); } if (sfxBus) sfxBus.gain.value = sfxOn ? 1 : 0; return sfxOn; }
  function sfxState() { return sfxOn; }
  function out() { return master; }

  // ---------- 噪声 ----------
  let noiseBuf = null;
  function noise() {
    if (noiseBuf) return noiseBuf;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  function loopNoise(filterType, freq, q, gain) {
    const src = ctx.createBufferSource();
    src.buffer = noise(); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q || 0.7;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(musicBus);
    src.start();
    return { src, g, f };
  }

  // ---------- 环境层 ----------
  function stopLayers() {
    for (const k in layers) { try { layers[k].stop(); } catch(e){} }
    layers = {};
    if (crackleTimer) { clearInterval(crackleTimer); crackleTimer = null; }
  }
  function layer(id, builder) {
    if (layers[id]) return;
    layers[id] = builder();
  }
  function recordedLayer(id, volume) {
    if (!window.Audio) return false;
    try {
      const a=new window.Audio(`assets/audio/ambient/${id}.mp3`);
      a.loop=true; a.volume=volume;
      const start=()=>{ if(enabled&&ambientOn) { const p=a.play(); if(p&&p.catch)p.catch(()=>{}); } };
      start(); layers[id]={stop:()=>{a.pause();a.removeAttribute('src');}};
      return true;
    } catch(e) { return false; }
  }
  let campfireOn = false;
  function setFire(on) { campfireOn = !!on; }
  // 环境音开关（海浪/风/鸟虫/雨声这些）：音乐不受影响，玩家嫌吵可以关掉
  let ambientOn = true;
  function toggleAmbient() {
    ambientOn = !ambientOn;
    if (!ctx) return ambientOn;
    if (ambientOn) setScene(currentScene, currentDeep); else stopLayers();
    return ambientOn;
  }
  function ambientState() { return ambientOn; }
  function enabledState() { return enabled; }

  function setScene(sceneId, deep) {
    if (!ctx) return;
    if (deep === undefined) deep = currentDeep;
    if (sceneId !== currentScene || !!deep !== currentDeep) { musicStep = 0; restEndAt = 0; }
    currentScene = sceneId; currentDeep = !!deep;
    stopLayers();
    if (hostSuspended || !ambientOn || !enabled) return;   // 所有环境音均受这两个开关控制
    if (BOSS_NODES.active) return;
    const night = currentNight;
    // 风
    if (['title','camp','grassland','desert','peak','sea','shore'].includes(sceneId)) {
      const wind = loopNoise('lowpass', sceneId === 'peak' ? 500 : 380, 0.5, sceneId === 'peak' ? 0.05 : 0.028);
      wind.g.gain.value *= (night ? 1.3 : 1);
      layer('wind', () => ({ stop: () => { try{ wind.src.stop(); }catch(e){} } }));
    }
    // 海浪
    if (['title','sea','shore','camp'].includes(sceneId) && !recordedLayer('surf',sceneId==='sea' ? 0.16 : 0.07)) {
      const src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = 0.6;
      const g = ctx.createGain(); g.gain.value = sceneId === 'sea' ? 0.07 : 0.02;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.05;
      lfo.connect(lfoG); lfoG.connect(g.gain);
      src.connect(f); f.connect(g); g.connect(musicBus);
      src.start(); lfo.start();
      layer('surf', () => ({ stop: () => { try{ src.stop(); lfo.stop(); }catch(e){} } }));
    }
    // 河流
    if (sceneId === 'river') {
      const src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
      // 玩家反馈"湖畔偶尔一股很振的嗡声"：原来是 900Hz、Q 0.8 的窄带噪声 + 0.25Hz 慢速音量摆动，
      // 听起来像一股"嗡嗡抖"的电流声。现在把带宽放宽（Q 0.8→0.5）、摆动幅度砍到 1/3、速度减半。
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 780; f.Q.value = 0.5;
      const g = ctx.createGain(); g.gain.value = 0.028;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.006;
      lfo.connect(lfoG); lfoG.connect(g.gain);
      src.connect(f); f.connect(g); g.connect(musicBus);
      src.start(); lfo.start();
      layer('river', () => ({ stop: () => { try{ src.stop(); lfo.stop(); }catch(e){} } }));
    }
    // 森林：风声+树叶沙沙
    if (['forest','bamboo'].includes(sceneId)) {
      const src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
      // 树林同理：Q 1.2→0.8、摆动 0.6Hz→0.18Hz 且幅度砍到 1/3，从"颤音嗡"变成"树叶沙沙"
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = sceneId === 'bamboo' ? 1800 : 1400; f.Q.value = 0.8;
      const g = ctx.createGain(); g.gain.value = 0.010;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.18;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.003;
      lfo.connect(lfoG); lfoG.connect(g.gain);
      src.connect(f); f.connect(g); g.connect(musicBus);
      src.start(); lfo.start();
      layer('leaves', () => ({ stop: () => { try{ src.stop(); lfo.stop(); }catch(e){} } }));
    }
    // 洞穴：水滴 + 低频嗡鸣
    if (['cave','quarry'].includes(sceneId)) {
      const drone = ctx.createOscillator(); drone.type = 'sine'; drone.frequency.value = sceneId === 'cave' ? 55 : 66;
      const g1 = ctx.createGain(); g1.gain.value = 0.035;
      drone.connect(g1); g1.connect(musicBus); drone.start();
      layer('drone', () => ({ stop: () => { try{ drone.stop(); }catch(e){} } }));
      // 水滴：以前每 0.9 秒一滴（"叮、叮、叮"停不下来，玩家反馈最多的就是这个）。
      // 现在随机 4.5~11 秒才一滴，音量降到 1/3、音高也压下来，变成"偶尔一滴"的空间感。
      if (sceneId === 'cave') {
        let dripTimer = null;
        const scheduleDrip = () => {
          dripTimer = setTimeout(() => { if (ambientOn && enabled) drip(); scheduleDrip(); }, rnd(4500, 11000));
        };
        scheduleDrip();
        layer('drip', () => ({ stop: () => { if (dripTimer) clearTimeout(dripTimer); dripTimer = null; } }));
      }
    }
    // 篝火噼啪（建成篝火后才响）
    if (sceneId === 'camp' && campfireOn) {
      crackleTimer = setInterval(() => { crackle(); }, 420);
    }
    // 鸟鸣：只在真正有林子的地方（树林/竹林/草地），而且间隔拉长到 9~22 秒并每次重新随机，
    // 偶尔才来一小群——以前是每 2.4~5.2 秒叫一声、连河畔和农场都响，玩家反馈"一直有鸟叫"。
    if (!night && ['forest','bamboo','grassland'].includes(sceneId)) {
      let birdTimer = null;
      const scheduleBird = () => {
        birdTimer = setTimeout(() => {
          if (currentNight || !enabled || !ambientOn) { scheduleBird(); return; }
          bird();
          if (Math.random() < 0.22) setTimeout(() => bird(), rnd(180, 420));
          scheduleBird();
        }, rnd(9000, 22000));
      };
      scheduleBird();
      layer('birds', () => ({ stop: () => { if (birdTimer) clearTimeout(birdTimer); birdTimer = null; } }));
    }
    // 虫鸣（夜晚）
    // 虫鸣：以前 0.4~0.9 秒一次、3400Hz，夜里像耳鸣。现在 1.8~5.2 秒一次、音高压到 2400 左右、音量减半。
    if (night && !['cave'].includes(sceneId)) {
      const critTimer = setInterval(() => { if (currentNight) cricket(); }, rnd(1800, 5200));
      layer('crickets', () => ({ stop: () => { clearInterval(critTimer); } }));
    }
    setWeather(currentWeather);
  }

  function setEnv(night, weather) {
    currentNight = night;
    currentWeather = weather;
    if (!ctx) return;
    setScene(currentScene);
  }
  function setTension(v) { currentTension = Math.max(0, Math.min(1, v || 0)); }
  // 第4层：结局专属音乐
  function playEnding(id) {
    if (!ctx || !enabled) return;
    const seqs = {
      S:  [261.6, 329.6, 392.0, 523.3, 392.0, 523.3],
      S2: [196.0, 174.6, 146.8, 174.6, 130.8, 98.0],
      A:  [261.6, 293.7, 392.0, 440.0, 392.0, 523.3],
      B:  [220.0, 261.6, 329.6, 392.0, 329.6, 440.0],
      C:  [174.6, 196.0, 233.1, 174.6, 261.6, 233.1],
      D:  [110.0, 98.0, 87.3, 73.4, 87.3, 55.0],
    };
    const seq = seqs[id] || seqs.D;
    const dark = id === 'D' || id === 'S2';
    seq.forEach((f, i) => setTimeout(() => {
      if (!ctx || !enabled) return;
      tone(f, i === seq.length - 1 ? 4.5 : 1.8, dark ? 'sine' : 'triangle', dark ? 0.018 : 0.022, true, 0, null, 0.06);
      if (i === 0 || i === 3) tone(seq[0] / 2, 5.6, 'sine', 0.009, true, 0, null, 0.8);
    }, 300 + i * 790));
  }
  // 第5层：里程碑动机旋律
  function motif(kind) {
    if (!ctx || !enabled) return;
    const m = { unlock: [392.0, 523.3], clue: [329.6, 392.0, 440.0], danger: [146.8, 138.6], relic: [523.3, 659.3, 784.0], boss: [110.0, 103.8, 98.0] }[kind] || [392.0, 440.0];
    m.forEach((f, i) => setTimeout(() => { try { tone(f, 1.1, 'triangle', 0.04); } catch (e) {} }, i * 210));
  }
  function setWeather(w) {
    if (!ctx || !ambientOn || !enabled || currentWeather !== w || ['atlantis','cave'].includes(currentScene)) return;
    if (w === 'rain' || w === 'storm') {
      if (!layers['rain'] && !recordedLayer('rain',w==='storm'?0.16:0.09)) {
        const src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.5;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4600;
        const g = ctx.createGain(); g.gain.value = w === 'storm' ? 0.05 : 0.026;
        src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(musicBus); src.start();
        layers['rain'] = { stop: () => { try{ src.stop(); }catch(e){} } };
      }
    }
    if (w === 'storm') {
      if (!layers['thunder']) { const th = setInterval(() => thunder(), rnd(8000, 16000)); layers['thunder'] = { stop: () => clearInterval(th) }; }
    }
  }

  // ---------- 单发音色 ----------
  function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function tone(freq, dur, type, gain, delayTime, slide, bus, attack) {
    if (!ctx) return;
    const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + dur);
    const g = ctx.createGain();
    const atk = Math.max(0.008, attack || 0.01);   // 起音时间：音效要"脆"（0.01s），配乐要"柔"（给 0.4s 以上）
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(bus || musicBus);
    if (delayTime) g.connect(window._dshReverb);
    o.start(); o.stop(ctx.currentTime + dur + 0.05);
  }
  function noiseHit(dur, gain, freq, type, bus) {
    if (!ctx) return;
    const src = ctx.createBufferSource(); src.buffer = noise();
    const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq || 800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.connect(f); f.connect(g); g.connect(bus || musicBus);
    src.start(); src.stop(ctx.currentTime + dur);
  }
  function crackle() {
    if (Math.random() < 0.6) return;
    noiseHit(rnd(2, 8) / 100, 0.012 + Math.random() * 0.018, rnd(900, 2600), 'bandpass');
  }
  // 清脆的"咔哒"：极短的高频瞬态 + 两颗干净的高音，起音/收尾都很快（不是闷响）
  function clickTick() {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noise();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t0);
    ng.gain.linearRampToValueAtTime(0.06, t0 + 0.002);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.028);
    src.connect(hp); hp.connect(ng); ng.connect(sfxBus || master);
    src.start(t0); src.stop(t0 + 0.04);
    const tick = (freq, at, dur, vol) => {
      const o = ctx.createOscillator(); o.type = 'triangle';   // 方波太"塑料"，换三角波，还是有棱有角但是温和的
      o.frequency.setValueAtTime(freq, t0 + at);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.linearRampToValueAtTime(vol, t0 + at + 0.0015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
      o.connect(g); g.connect(sfxBus || master);
      o.start(t0 + at); o.stop(t0 + at + dur + 0.02);
    };
    tick(2600, 0, 0.022, 0.026);      // 主"嗒"
    tick(1700, 0.009, 0.017, 0.016);  // 一点点木质回响，让声音干净但不单薄
  }
  function drip() {
    const f = rnd(900, 1500);                       // 压到中低频：像水滴落进水里，而不是金属叮
    tone(f, 0.11, 'sine', 0.012, true, -f * 0.35);
  }
 function bird() {
    const base = rnd(2000, 2900);
    tone(base, 0.09, 'sine', 0.008, true);
    setTimeout(() => tone(base * 1.25, 0.07, 'sine', 0.006, true), 120);
  }
  function cricket() {
    // 以前是 4 声 4.3kHz 方波（又尖又塑料），后来改成 3400Hz 正弦但太频繁。
    // 现在：1~2 声、2400Hz 上下、音量减半——夜里是"远处有虫"，不是贴着耳朵响。
    const n = Math.random() < 0.4 ? 1 : 2;
    for (let i = 0; i < n; i++) setTimeout(() => tone(2300 + rnd(0, 300), 0.05, 'sine', 0.0016), i * 95);
  }
  function thunder() {
    noiseHit(1.6, 0.12, 180, 'lowpass');
    setTimeout(() => noiseHit(0.8, 0.05, 140, 'lowpass'), 220);
  }

  // ---------- 生成式配乐（五声音阶） ----------
  const SCALES = {
    title:  [220, 261.6, 293.7, 329.6, 392],        // 苍凉 a 小调
    camp:   [261.6, 293.7, 329.6, 392, 440],        // 温暖 C 大调五声
    explore:[220, 246.9, 293.7, 329.6, 370],        // 空灵
    cave:   [110, 116.5, 146.8, 155.6, 174.6],      // 低暗
    danger: [98, 103.8, 116.5, 146.8],              // 压迫
    sea:    [196, 220, 261.6, 293.7, 329.6],        // 辽阔
    atl:    [174.6, 196, 220, 261.6, 329.6],     // 亚克兰蒂斯 · 宁静深海
    atlDeep:[146.8, 155.6, 174.6, 196, 233.1],   // 深海底层 · 隐隐危险
  };
  function scaleFor() {
    if (currentScene === 'camp' || currentScene === 'farm' || currentScene === 'shore') return SCALES.camp;
    if (currentScene === 'cave' || currentScene === 'peak') return SCALES.cave;
    if (currentScene === 'atlantis') return currentDeep ? SCALES.atlDeep : SCALES.atl;
    if (currentScene === 'sea' || currentScene === 'title') return currentScene === 'title' ? SCALES.title : SCALES.sea;
    if (['desert','grassland','forest','bamboo','river','quarry'].includes(currentScene)) return SCALES.explore;
    return SCALES.explore;
  }
  // 原创短句：每格 1.5 秒，0..4 是场景五声音阶，-1 是留白。
  // 固定旋律和呼吸点让音乐有主题；场景换调，夜间收音量，环境音独立继续播放。
  const MELODIES = {
    home: [2,-1,3,4, 3,-1,2,-1, 1,2,3,-1, 2,-1,0,-1,
           2,-1,3,4, 4,-1,3,-1, 2,1,0,-1, 1,-1,0,-1],
    wild: [2,-1,1,0, 2,-1,3,-1, 4,3,2,-1, 1,-1,0,-1,
           0,-1,2,3, 2,-1,1,-1, 3,4,3,-1, 2,-1,0,-1],
    deep: [0,-1,-1,2, -1,1,-1,-1, 3,-1,2,-1, 1,-1,-1,-1,
           0,-1,-1,1, -1,2,-1,-1, 3,-1,1,-1, 0,-1,-1,-1],
  };
  let musicStep = 0;
  // 48 秒主题后留约 18 秒给海浪、风和篝火；此静默段仍尊重音乐开关。
  let restEndAt = 0;
  function startMusic() {
    if (musicTimer) return;
    const tick = () => {
      if (!ctx || !enabled || hostSuspended || (typeof document !== 'undefined' && document.hidden) || BOSS_NODES.active) return;   // 首领战期间让位给首领主题
      const nowMs = Date.now();
      if (nowMs < restEndAt) return;
      if (restEndAt && nowMs >= restEndAt) { restEndAt = 0; musicStep = 0; }
      const scale = scaleFor();
      const kind = currentScene === 'cave' || currentScene === 'peak' || currentDeep ? 'deep'
        : ['camp','farm','shore','title'].includes(currentScene) ? 'home' : 'wild';
      const melody = MELODIES[kind];
      const i = musicStep++;
      const quiet = currentNight || currentWeather === 'rain' || currentWeather === 'storm';
      const note = melody[i];
      if (note >= 0) {
        // 木质拨弦作主旋律，极轻的正弦同音补足尾韵；避免纯长音连续嗡鸣。
        tone(scale[note], note === 0 ? 1.9 : 1.35, 'triangle', quiet ? 0.009 : 0.015, true, 0, null, 0.035);
        tone(scale[note], 2.1, 'sine', quiet ? 0.003 : 0.004, true, 0, null, 0.10);
      }
      if (i % 8 === 0) {
        const root = scale[(i / 8) % 2 === 0 ? 0 : 1] / 2;
        tone(root, 7.5, 'sine', quiet ? 0.004 : 0.006, true, 0, null, 1.1);
        tone(scale[3] / 2, 6.5, 'sine', quiet ? 0.0015 : 0.002, true, 0, null, 1.8);
      }
      if (currentTension > 0 && i % 4 === 0) tone(scale[0] / 4, 2.4, 'sine', 0.01 * currentTension, false, 0, null, 0.3);
      if (musicStep >= melody.length) restEndAt = nowMs + 18000;
    };
    tick();
    musicTimer = setInterval(tick, 1500);
  }

  // ---------- 音效 ----------
  let workStroke=0;
  function workSound(name) {
    if(!['woodwork','stonework','metalwork','construction','forage','waterwork','fishing','cooking'].includes(name))return false;
    const bus=sfxBus, v=[.98,1.03,1,.96][workStroke++%4];
    const later=(ms,fn)=>setTimeout(()=>{if(sfxOn&&ctx)fn();},ms);
    if(name==='woodwork') {
      noiseHit(.07,.035,850*v,'lowpass',bus);tone(115*v,.09,'sine',.022,false,-40,bus,.002);
      later(70,()=>noiseHit(.12,.018,2400*v,'bandpass',bus));
    } else if(name==='stonework') {
      noiseHit(.055,.031,2100*v,'highpass',bus);tone(610*v,.13,'sine',.012,false,-45,bus,.002);
      later(60,()=>noiseHit(.10,.018,1100*v,'bandpass',bus));
    } else if(name==='metalwork'||name==='construction') {
      noiseHit(.035,.027,1400*v,'bandpass',bus);
      [730,1193,1880].forEach((f,i)=>tone(f*v,.16-i*.03,'sine',.009/(i+1),false,-18,bus,.002));
      if(name==='construction')later(140,()=>noiseHit(.07,.023,520*v,'lowpass',bus));
    } else if(name==='forage') {
      noiseHit(.23,.014,2300*v,'bandpass',bus);later(140,()=>noiseHit(.15,.009,3200*v,'highpass',bus));
    } else if(name==='waterwork'||name==='fishing') {
      noiseHit(.27,.018,850*v,'lowpass',bus);later(100,()=>noiseHit(.17,.012,1900*v,'bandpass',bus));
      if(name==='waterwork')later(190,()=>tone(430*v,.06,'sine',.006,false,-150,bus,.003));
    } else if(name==='cooking') {
      noiseHit(.36,.012,1700*v,'bandpass',bus);later(90,()=>noiseHit(.075,.009,550*v,'lowpass',bus));
      later(210,()=>noiseHit(.08,.007,760*v,'lowpass',bus));
    } else return false;
    return true;
  }
  function play(sfx) {
    if (hostSuspended) return;
    if(sfx==='click' && sfxOn)init();
    if (!ctx || !sfxOn) return;   // 音效跟着"音效"开关走，和音乐开关互不影响
    if (workSound(sfx)) return;
    if (sfx !== 'good' && sfx !== 'click' && sample(sfx)) return;
    const B = sfxBus;
    const later=(ms,fn)=>setTimeout(()=>{if(sfxOn&&ctx)fn();},ms);
    switch (sfx) {
      // 拾取/获得：以前是 660→880 两颗高音（每捡一次"叮"一下，日志多了就一直叮）。
      // 现在改成往下走的小三度（540→405），音量也收了一半——像"东西放进包里"，不像铃铛。
      case 'pickup': tone(540, 0.10, 'sine', 0.032, false, 0, B, 0.02); setTimeout(() => tone(405, 0.13, 'sine', 0.022, false, 0, B, 0.03), 110); break;
      // 睡醒/传送等完成提示：一记轻柔木琴音，短而低声，不使用上扬庆祝音。
      case 'good':   tone(294, 0.22, 'sine', 0.012, false, 0, B, 0.008); tone(588, 0.12, 'sine', 0.0025, false, 0, B, 0.004); break;
      case 'danger': tone(196, 0.5, 'sine', 0.09, false, -40, B); break;
      case 'trade':  tone(784, 0.08, 'triangle', 0.024, false, 0, B, 0.015); setTimeout(() => tone(1046, 0.10, 'triangle', 0.018, false, 0, B, 0.02), 70); break;
      case 'build':  tone(392, 0.14, 'triangle', 0.05, false, 0, B); setTimeout(() => tone(523, 0.14, 'triangle', 0.05, false, 0, B), 120); setTimeout(() => tone(659, 0.22, 'triangle', 0.05, false, 0, B), 240); break;
      case 'hit':    noiseHit(0.12, 0.07, 700, 'lowpass', B); break;
      case 'combatstrike': noiseHit(.10,.045,4000,'highpass',B);later(70,()=>noiseHit(.035,.027,2200,'bandpass',B));break;
      case 'combatcritical': noiseHit(.12,.054,4300,'highpass',B);later(65,()=>noiseHit(.050,.035,2700,'bandpass',B));break;
      case 'combatbite': noiseHit(.075,.052,1900,'bandpass',B);later(42,()=>noiseHit(.045,.025,3600,'highpass',B));break;
      case 'combatclaw': noiseHit(.085,.044,3100,'bandpass',B);later(35,()=>noiseHit(.055,.020,4800,'highpass',B));break;
      case 'combatslash': noiseHit(.11,.040,4200,'highpass',B);later(65,()=>noiseHit(.045,.025,2400,'bandpass',B));break;
      case 'combatshot': noiseHit(.10,.07,2800,'highpass',B);tone(85,.24,'sine',.045,false,-45,B,.003);break;
      case 'combatrift': noiseHit(.23,.035,320,'lowpass',B);tone(65,.35,'triangle',.03,false,-25,B,.05);break;
      case 'cardBreak': noiseHit(.14,.045,1700,'bandpass',B);tone(440,.10,'sine',.012,false,-160,B,.004);break;
      case 'work':   tone(280, 0.08, 'triangle', 0.05, false, 0, B); setTimeout(() => tone(340, 0.1, 'triangle', 0.04, false, 0, B), 130); break;
      case 'clash':  noiseHit(0.14, 0.07, 900, 'bandpass', B); tone(392, 0.12, 'triangle', 0.024, false, 0, B, 0.01); break;
      case 'travel': noiseHit(0.3, 0.04, 500, 'lowpass', B); break;
      case 'click':  clickTick(); break;   // 界面咔哒声（清脆、短促）
      case 'linghuiCue': if(voiceOn) { tone(659,0.15,'sine',0.025,false,0,B,0.025); setTimeout(()=>{if(sfxOn&&voiceOn)tone(784,0.2,'sine',0.018,false,0,B,0.03);},90); } break;
      case 'fire':   for (let i = 0; i < 3; i++) setTimeout(() => crackle(), i * 120); break;
      case 'death':  tone(220, 1.4, 'triangle', 0.035, false, -120, B, 0.06); noiseHit(1.1, 0.05, 180, 'lowpass', B); break;
      default: break;
    }
  }
  // 日志声音联动；短时间内的连串收获合并提示，避免不断叮响。
  let lastNoticeAt=0;
  function notify(cls) {
    if (!ctx || !sfxOn) return;
    const now=Date.now();
    if (now-lastNoticeAt<500) return;
    if(cls==='danger'||cls==='good') lastNoticeAt=now;
    if (cls === 'danger') play('danger');
    else if (cls === 'good') play('good');
    // ⚠️ 这里以前是 40% 概率放"拾取铃"：系统日志很密集（采集/制作/赶路都会写），
    //    听感就是"一直在叮铃"。现在压到 8%，而且用一声很闷的低音，不再抢耳朵。
    else if (cls === 'sys' && Math.random() < 0.08) tone(300, 0.07, 'sine', 0.014, false, 0, sfxBus, 0.01);
  }

  // 战斗主题：A 小调四小节，普通战112BPM、首领144BPM，八分音符推进。
  // 四小节走 Am → F → C → G，鼓点、低音与琶音叠合，首领增加旋律八度。
  // ⚠️ 2026-09-25 作者澄清："boss 配乐不要移除啊，只是移除试听啊" ——
  //    曲子**留在游戏里**（首领战照旧切这段主题），删掉的只有设置里那个「试听／停止首领曲」入口
  //    （连同 previewBoss）。所以这里没有 preview 分支，只留战斗开始/结束用的 setBoss(on)。
  const BOSS_BARS = [
    { bass:110, chord:[220,261.6,329.6], lead:[440,0,523.3,0,659.3,0,523.3,0,440,0,392,0,523.3,0,0,0] },
    { bass:87.3, chord:[174.6,220,261.6], lead:[440,0,523.3,0,698.5,0,523.3,0,440,0,349.2,0,523.3,0,0,0] },
    { bass:130.8, chord:[261.6,329.6,392], lead:[523.3,0,659.3,0,784,0,659.3,0,523.3,0,392,0,659.3,0,0,0] },
    { bass:98, chord:[196,246.9,293.7], lead:[493.9,0,587.3,0,784,0,587.3,0,493.9,0,392,0,587.3,0,0,0] },
  ];
  const BOSS_NODES = { active:false, timer:null, step:0, boss:false };
  function setBoss(on) { if(on || BOSS_NODES.boss)setBattle(on,true); }
  function setCombat(on) { if(on || !BOSS_NODES.boss)setBattle(on,false); }
  function setBattle(on,boss) {
    if(!ctx)return;
    if(on && BOSS_NODES.active && BOSS_NODES.boss===boss)return;
    if(BOSS_NODES.active){
      BOSS_NODES.active=false;clearInterval(BOSS_NODES.timer);BOSS_NODES.timer=null;
      const previous=BOSS_NODES.bus;BOSS_NODES.bus=null;
      if(previous){previous.gain.setValueAtTime(previous.gain.value,ctx.currentTime);previous.gain.linearRampToValueAtTime(0,ctx.currentTime+.2);setTimeout(()=>{try{previous.disconnect();}catch(e){}},250);}
    }
    if(!on){setScene(currentScene);return;}
    stopLayers();BOSS_NODES.active=true;BOSS_NODES.boss=boss;BOSS_NODES.step=0;
    const bus=ctx.createGain();bus.gain.value=1;bus.connect(musicBus);BOSS_NODES.bus=bus;
    // 112 / 144 BPM, eighth-note ostinato and layered drums. Boss keeps the
    // existing melodic identity but adds urgency and a lower octave answer.
    const interval=60000/(boss?144:112)/2;
    const beat=()=>{
      if(!BOSS_NODES.active || !enabled)return;
      const i=BOSS_NODES.step++,pos=i%16,bar=BOSS_BARS[Math.floor(i/16)%BOSS_BARS.length];
      if(pos===0)bar.chord.forEach((f,n)=>tone(f,interval*7/1000,'triangle',n===0?.012:.006,true,0,bus,.08));
      const chord=bar.chord[(pos%4)%3];
      tone(chord*(pos%4===3?2:1),interval*.8/1000,'triangle',boss?.028:.018,true,0,bus,.015);
      if(pos%4===0 || (boss && pos%4===3)){
        tone(bar.bass/2,.20,'sine',boss?.085:.060,false,-30,bus,.006);
        tone(bar.bass,.20,'triangle',.012,false,-12,bus,.012);
      }
      if(pos%4===2){noiseHit(.11,boss?.032:.022,1300,'bandpass',bus);tone(145,.06,'triangle',.016,false,-35,bus,.004);}
      if(pos%2===1)noiseHit(.035,boss?.009:.006,4300,'highpass',bus);
      const lead=bar.lead[pos];
      if(lead){tone(lead,interval*1.2/1000,'triangle',boss?.040:.023,true,0,bus,.025);if(boss)tone(lead/2,.35,'triangle',.015,true,0,bus,.025);}
    };
    beat();BOSS_NODES.timer=setInterval(beat,interval);
  }

  return { setHostSuspended, playVoice, stopVoice, toggleVoice, voiceState, init, toggle, toggleSfx, sfxState, setScene, setFire, setEnv, setWeather, setBoss, setCombat, setTension, playEnding, motif, play, notify, out, toggleAmbient, ambientState, enabledState };
})();
