/* ============================================================
   孤屿遗章 · 程序化音频引擎（Web Audio，无外部音频文件）
   环境音分层 + 生成式氛围配乐 + 音效
   ============================================================ */
const AudioFX = (() => {
  let ctx = null;
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
  let step = 0;

  // ---------- 基础 ----------
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.9;
      musicBus = ctx.createGain(); musicBus.gain.value = enabled ? 1 : 0; musicBus.connect(master);
      sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? 1 : 0; sfxBus.connect(master);
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
  function toggle() { enabled = !enabled; if (musicBus) musicBus.gain.value = enabled ? 1 : 0; return enabled; }
  function toggleSfx() { sfxOn = !sfxOn; if (sfxBus) sfxBus.gain.value = sfxOn ? 1 : 0; return sfxOn; }
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
    currentScene = sceneId; currentDeep = !!deep;
    melIdx = 2;               // 换场景 → 旋律从音阶中段重新起步
    stopLayers();
    if (!ambientOn) return;   // 环境音关了：只留配乐
    const night = currentNight;
    // 风
    if (['title','camp','grassland','desert','peak','sea','shore'].includes(sceneId)) {
      const wind = loopNoise('lowpass', sceneId === 'peak' ? 500 : 380, 0.5, sceneId === 'peak' ? 0.05 : 0.028);
      wind.g.gain.value *= (night ? 1.3 : 1);
      layer('wind', () => ({ stop: () => { try{ wind.src.stop(); }catch(e){} } }));
    }
    // 海浪
    if (['title','sea','shore','camp','atlantis'].includes(sceneId)) {
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
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8;
      const g = ctx.createGain(); g.gain.value = 0.035;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.25;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.02;
      lfo.connect(lfoG); lfoG.connect(g.gain);
      src.connect(f); f.connect(g); g.connect(musicBus);
      src.start(); lfo.start();
      layer('river', () => ({ stop: () => { try{ src.stop(); lfo.stop(); }catch(e){} } }));
    }
    // 森林：风声+树叶沙沙
    if (['forest','bamboo'].includes(sceneId)) {
      const src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = sceneId === 'bamboo' ? 2200 : 1600; f.Q.value = 1.2;
      const g = ctx.createGain(); g.gain.value = 0.012;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.6;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.01;
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
      if (sceneId === 'cave') {
        const dripTimer = setInterval(() => { drip(); }, 900);
        layer('drip', () => ({ stop: () => { clearInterval(dripTimer); } }));
      }
    }
    // 篝火噼啪（建成篝火后才响）
    if (sceneId === 'camp' && campfireOn) {
      crackleTimer = setInterval(() => { crackle(); }, 260);
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
    if (night && !['cave'].includes(sceneId)) {
      const critTimer = setInterval(() => { if (currentNight) cricket(); }, rnd(380, 900));
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
      S:  [261.6, 329.6, 392.0, 523.3],   // 重燃文明：明亮上行
      S2: [196.0, 174.6],                 // 深海长眠：寂寥单音
      A:  [261.6, 293.7, 392.0, 440.0],   // 归乡
      B:  [220.0, 261.6, 329.6],          // 岛主
      C:  [174.6, 196.0, 233.1, 174.6],   // 秘辛
      D:  [110.0, 98.0, 87.3],            // 归途之外
    };
    const seq = seqs[id] || seqs.D;
    seq.forEach((f, i) => setTimeout(() => { try { tone(f, 2.4, 'sine', 0.05); } catch (e) {} }, 300 + i * 640));
  }
  // 第5层：里程碑动机旋律
  function motif(kind) {
    if (!ctx || !enabled) return;
    const m = { unlock: [392.0, 523.3], clue: [329.6, 392.0, 440.0], danger: [146.8, 138.6], relic: [523.3, 659.3, 784.0], boss: [110.0, 103.8, 98.0] }[kind] || [392.0, 440.0];
    m.forEach((f, i) => setTimeout(() => { try { tone(f, 1.1, 'triangle', 0.04); } catch (e) {} }, i * 210));
  }
  function setWeather(w) {
    if (!ctx || currentWeather !== w) return;
    if (w === 'rain' || w === 'storm' || w === 'snow') {
      if (!layers['rain']) {
        const src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.5;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4600;
        const g = ctx.createGain(); g.gain.value = w === 'storm' ? 0.05 : 0.026;
        src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(musicBus); src.start();
        layers['rain'] = { stop: () => { try{ src.stop(); }catch(e){} } };
      }
    }
    if (w === 'storm') {
      const th = setInterval(() => thunder(), rnd(4000, 9000));
      if (!layers['thunder']) layers['thunder'] = { stop: () => clearInterval(th) };
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
    noiseHit(rnd(2, 8) / 100, 0.02 + Math.random() * 0.03, rnd(1500, 4000), 'bandpass');
  }
  // 清脆的"咔哒"：极短的高频瞬态 + 两颗干净的高音，起音/收尾都很快（不是闷响）
  function clickTick() {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noise();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t0);
    ng.gain.linearRampToValueAtTime(0.085, t0 + 0.002);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.028);
    src.connect(hp); hp.connect(ng); ng.connect(sfxBus || master);
    src.start(t0); src.stop(t0 + 0.04);
    const tick = (freq, at, dur, vol) => {
      const o = ctx.createOscillator(); o.type = 'square';
      o.frequency.setValueAtTime(freq, t0 + at);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.linearRampToValueAtTime(vol, t0 + at + 0.0015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
      o.connect(g); g.connect(sfxBus || master);
      o.start(t0 + at); o.stop(t0 + at + dur + 0.02);
    };
    tick(3200, 0, 0.022, 0.034);      // 主"嗒"
    tick(2150, 0.009, 0.017, 0.021);  // 一点点木质回响，让声音干净但不单薄
  }
  function drip() {
    const f = rnd(1400, 2400);
    tone(f, 0.08, 'sine', 0.03, true, -f * 0.5);
  }
 function bird() {
    const base = rnd(2600, 3800);
    tone(base, 0.09, 'sine', 0.011, true);
    setTimeout(() => tone(base * 1.3, 0.07, 'sine', 0.008, true), 120);
  }
  function cricket() {
    // 以前是 4 声 4.3kHz 的方波 —— 又尖又"塑料"，夜里一直在耳边响。改成两声柔和的正弦。
    for (let i = 0; i < 2; i++) setTimeout(() => tone(3400 + rnd(0, 260), 0.05, 'sine', 0.0035), i * 90);
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
  // 旋律在音阶上的位置：靠"级进"走动，而不是每个音都重新随机抽
  let melIdx = 2;
  function startMusic() {
    if (musicTimer) return;
    const tick = () => {
      if (!ctx || !enabled) return;
      step++;
      const scale = scaleFor();
      const night = currentNight;
      const w = currentWeather;
      const calm = (w === 'rain' || w === 'storm');
      const crisp = (w === 'snow');
      const misty = (w === 'fog');
      // 玩家反馈"背景音乐像湿塑料拖鞋蹭地板"：以前是**每个音都从音阶里重新随机抽**，
      // 于是只有乱跳、没有旋律（还会随机翻八度），随机撞上邻近音就成了刺耳的摩擦声。
      // 现在改成五声音阶上的**级进**：每次最多走两格、绝大多数走相邻音，
      // 再加慢起音（0.45s）和低八度轻和声 —— 听感是林间悠悠的一段哼唱。
      if (step % 3 === 0 && Math.random() < (night ? 0.55 : 0.68)) {
        const move = [-2, -1, -1, 0, 1, 1, 2][rnd(0, 6)];
        melIdx = Math.max(0, Math.min(scale.length - 1, melIdx + move));
        const note = scale[melIdx];
        const type = crisp ? 'triangle' : 'sine';
        const dur = misty ? 5.4 : (crisp ? 4.0 : 4.6);
        const vol = (night ? 0.015 : 0.020) * (calm ? 0.9 : 1);
        tone(note, dur, type, vol, true, 0, null, 0.45);
        if (Math.random() < 0.35) tone(note / 2, dur + 1.2, 'sine', vol * 0.5, true, 0, null, 0.7);   // 低八度轻和声
      }
      // 低音长垫（更悠长、更淡）
      if (step % 8 === 0) tone(scale[0] / 2, 9, 'sine', night ? 0.012 : 0.009, true, 0, null, 1.4);
      // 低血紧张层：低沉不安
      if (currentTension > 0 && step % 2 === 0 && Math.random() < 0.35) tone(scale[0] / 4, 1.6, 'sine', 0.022 * currentTension, true);
    };
    musicTimer = setInterval(tick, 1500);
  }

  // ---------- 音效 ----------
  function play(sfx) {
    if (!ctx || !sfxOn) return;   // 音效跟着"音效"开关走，和音乐开关互不影响
    const B = sfxBus;
    switch (sfx) {
      case 'pickup': tone(660, 0.1, 'sine', 0.06, false, 0, B); setTimeout(() => tone(880, 0.12, 'sine', 0.05, false, 0, B), 60); break;
      case 'good':   tone(523, 0.12, 'sine', 0.05, false, 0, B); setTimeout(() => tone(659, 0.16, 'sine', 0.045, false, 0, B), 90); break;
      case 'danger': tone(196, 0.5, 'sine', 0.09, false, -40, B); break;
      case 'trade':  tone(1046, 0.06, 'square', 0.03, false, 0, B); setTimeout(() => tone(1318, 0.09, 'square', 0.025, false, 0, B), 50); break;
      case 'build':  tone(392, 0.14, 'triangle', 0.05, false, 0, B); setTimeout(() => tone(523, 0.14, 'triangle', 0.05, false, 0, B), 120); setTimeout(() => tone(659, 0.22, 'triangle', 0.05, false, 0, B), 240); break;
      case 'hit':    noiseHit(0.12, 0.08, 900, 'lowpass', B); break;
      case 'work':   tone(280, 0.08, 'triangle', 0.05, false, 0, B); setTimeout(() => tone(340, 0.1, 'triangle', 0.04, false, 0, B), 130); break;
      case 'clash':  noiseHit(0.16, 0.09, 1500, 'bandpass', B); tone(520, 0.12, 'square', 0.03, false, 0, B); break;
      case 'travel': noiseHit(0.3, 0.04, 500, 'lowpass', B); break;
      case 'click':  clickTick(); break;   // 界面咔哒声（清脆、短促）
      case 'fire':   for (let i = 0; i < 3; i++) setTimeout(() => crackle(), i * 120); break;
      case 'death':  tone(220, 1.2, 'sawtooth', 0.04, false, -140, B); noiseHit(1.0, 0.05, 200, 'lowpass', B); break;
      default: break;
    }
  }
  // 日志声音联动
  function notify(cls) {
    if (!ctx || !sfxOn) return;
    if (cls === 'danger') play('danger');
    else if (cls === 'good') play('good');
    else if (cls === 'sys' && Math.random() < 0.4) play('pickup');
  }

  const BOSS_NODES = {};
  function setBoss(on) {
    if (!ctx || !enabled) return;
    if (on && !BOSS_NODES.drone) {
      stopLayers();   // 屏蔽场景背景音乐，只留 boss 激昂音乐
      // 持续低音床（sawtooth→低通），给战斗一个连贯的"紧张底色"（无高音）
      const drone = ctx.createOscillator(); drone.type = 'sawtooth'; drone.frequency.value = 41;
      const df = ctx.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 180;
      const dg = ctx.createGain(); dg.gain.value = 0.20; drone.connect(df); df.connect(dg); dg.connect(musicBus); drone.start();
      BOSS_NODES.drone = drone; BOSS_NODES.dg = dg;
      // 不和谐高音刺音层（与低音相差约半音，产生拍频 → 压迫感）
      const hi = ctx.createOscillator(); hi.type = 'square'; hi.frequency.value = 43.5;
      const hf = ctx.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 320;
      const hg = ctx.createGain(); hg.gain.value = 0.065; hi.connect(hf); hf.connect(hg); hg.connect(musicBus); hi.start();
      BOSS_NODES.hi = hi; BOSS_NODES.hg = hg;
      // 节奏脉冲：更快的鼓点、更强力度
      const pulse = () => { if (!BOSS_NODES.dg || !ctx) return; const t = ctx.currentTime; dg.gain.cancelScheduledValues(t); dg.gain.setValueAtTime(0.46, t); dg.gain.exponentialRampToValueAtTime(0.20, t + 0.18); };
      pulse(); BOSS_NODES.timer = setInterval(pulse, 210);
    } else if (!on && BOSS_NODES.drone) {
      clearInterval(BOSS_NODES.timer); BOSS_NODES.timer = null;
      try { if (BOSS_NODES.drone) { BOSS_NODES.drone.stop(); BOSS_NODES.drone.disconnect(); } } catch(e){}
      try { if (BOSS_NODES.hi) { BOSS_NODES.hi.stop(); BOSS_NODES.hi.disconnect(); } } catch(e){}
      BOSS_NODES.drone = BOSS_NODES.hi = null; BOSS_NODES.dg = BOSS_NODES.hg = null;
      setScene(currentScene);   // 恢复场景背景氛围音乐
    }
  }

  return { init, toggle, toggleSfx, sfxState, setScene, setFire, setEnv, setWeather, setBoss, setTension, playEnding, motif, play, notify, out, toggleAmbient, ambientState, enabledState };
})();
