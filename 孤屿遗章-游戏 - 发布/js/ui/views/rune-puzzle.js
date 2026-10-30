/* rune-puzzle：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const RunePuzzleView = (() => {
  function create(deps) {
    const $=(...args)=>deps.$(...args);
    const addLog=(...args)=>deps.addLog(...args);
    const showModal=(...args)=>deps.showModal(...args);
    const closeModal=(...args)=>deps.closeModal(...args);
const RUNE_G = ['☀','☾','⛰','≈'];

let runeStage = 1;

let runeSeq = [], runeStep = 0, runeMode = 'idle';

let pairCards = [], pairOpen = [], pairDone = 0;

let lights = [];

function startRunePuzzle() { runeStage = 1; initStage1(); showModal('rune'); }

function nextStage() { runeStage++; if (runeStage > 3) return finishRune(); if (runeStage === 2) initStage2(); else if (runeStage === 3) initStage3(); showModal('rune'); }

function finishRune() { runeMode = 'idle'; Game.activatePortal(); addLog('三块石板严丝合缝——传送石轰然亮起！', 'good'); closeModal(); }

function initStage1() { runeSeq = Array.from({ length: 6 }, () => Math.floor(Math.random() * 4)); runeStep = 0; runeMode = 'idle'; }

function initStage2() { const g = [0,1,2,3,0,1,2,3]; for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [g[i],g[j]] = [g[j],g[i]]; } pairCards = g; pairOpen = []; pairDone = 0; }

function toggleLight(i) { const r = Math.floor(i/3), c = i%3; [[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => { const rr = r+dr, cc = c+dc; if (rr>=0&&rr<3&&cc>=0&&cc<3) { const j = rr*3+cc; lights[j] = lights[j] ? 0 : 1; } }); }

function initStage3() { lights = Array(9).fill(1); for (let k = 0; k < 4; k++) toggleLight(Math.floor(Math.random() * 9)); if (lights.every(v => v)) toggleLight(4); }

function renderRuneModal() {
    const t = `<div class="modal-title">石板 · ${['第一块 · 记忆','第二块 · 配对','第三块 · 点灯'][runeStage-1]}（${runeStage}/3）</div>`;
    if (runeStage === 1) return t + '<div class="overlay-text">第一块石板：记住符文亮起的顺序（6 步），再照着点回去——点错重来。</div><div id="rune-status" class="overlay-text">准备好了吗……</div><div class="rune-grid">' + RUNE_G.map((g,i) => `<button class="rune-btn" data-rune="${i}">${g}</button>`).join('') + '</div><div class="modal-actions"><button id="rune-replay">再看一遍</button><button id="rune-cancel">取 消</button></div>';
    if (runeStage === 2) return t + '<div class="overlay-text">第二块石板：符文成了两两配对的卡，把它们成对翻开——找回全部 4 对。</div><div id="rune-status" class="overlay-text">翻开两张相同的符文即可消除。</div><div class="pair-grid">' + pairCards.map((v,i) => `<button class="pair-btn" data-pair="${i}"><span class="pair-face">✦</span></button>`).join('') + '</div><div class="modal-actions"><button id="rune-cancel">取 消</button></div>';
    return t + '<div class="overlay-text">第三块石板：点亮全部九格。点一格，它自己和上下左右一起翻转。<br>点亮的格子会 <b style="color:#8a7346">亮起暖光 ✦</b>，目标是九格全亮。</div><div id="rune-status" class="overlay-text">已点亮 ' + lights.filter(v => v).length + '/9</div><div class="light-grid">' + lights.map((v,i) => `<button class="light-btn ${v ? 'on' : ''}" data-light="${i}"></button>`).join('') + '</div><div class="modal-actions"><button id="rune-cancel">取 消</button></div>';
  }

function playRuneSeq() {
    const m = $('#modal'); if (!m) return;
    const btns = Array.from(m.querySelectorAll('.rune-btn'));
    const status = m.querySelector('#rune-status');
    runeMode = 'showing'; if (status) status.textContent = '看好了……';
    let i = 0;
    const tick = () => {
      if (i >= runeSeq.length) { runeMode = 'input'; runeStep = 0; if (status) status.textContent = '轮到你了：照着顺序点。'; return; }
      const b = btns[runeSeq[i]]; if (b) { b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), 400); }
      i++; setTimeout(tick, 620);
    };
    setTimeout(tick, 450);
  }

function bindRune() {
    const m = $('#modal'); if (!m) return;
    const cancel = m.querySelector('#rune-cancel'); if (cancel) cancel.onclick = closeModal;
    if (runeStage === 1) {
      m.querySelectorAll('.rune-btn').forEach(b => b.onclick = () => {
        if (runeMode !== 'input') return;
        const i = +b.dataset.rune;
        if (i === runeSeq[runeStep]) {
          runeStep++; b.classList.add('ok'); setTimeout(() => b.classList.remove('ok'), 200);
          if (runeStep >= runeSeq.length) { runeMode = 'idle'; addLog('第一块石板应和了。', 'good'); nextStage(); }
        } else {
          runeMode = 'idle'; runeStep = 0;
          const s = m.querySelector('#rune-status'); if (s) s.textContent = '符文错了……再看一遍。';
          addLog('第一块石板：顺序错了，重来。', 'warn'); setTimeout(playRuneSeq, 600);
        }
      });
      const rp = m.querySelector('#rune-replay'); if (rp) rp.onclick = () => { runeMode = 'idle'; playRuneSeq(); };
      playRuneSeq();
    } else if (runeStage === 2) {
      m.querySelectorAll('[data-pair]').forEach(b => b.onclick = () => {
        const i = +b.dataset.pair;
        if (b.classList.contains('flip') || b.classList.contains('done') || pairOpen.length >= 2) return;
        b.classList.add('flip'); b.querySelector('.pair-face').textContent = RUNE_G[pairCards[i]]; pairOpen.push(i);
        if (pairOpen.length === 2) {
          const [a, bb] = pairOpen;
          if (pairCards[a] === pairCards[bb]) { setTimeout(() => { [a,bb].forEach(k => { const e = m.querySelector(`[data-pair="${k}"]`); e.classList.remove('flip'); e.classList.add('done'); }); pairOpen = []; pairDone++; if (pairDone >= 4) { addLog('第二块石板应和了。', 'good'); nextStage(); } }, 380); }
          else { setTimeout(() => { pairOpen.forEach(k => { const e = m.querySelector(`[data-pair="${k}"]`); e.classList.remove('flip'); e.querySelector('.pair-face').textContent = '?'; }); pairOpen = []; }, 700); }
        }
      });
    } else {
      m.querySelectorAll('[data-light]').forEach(b => b.onclick = () => {
        toggleLight(+b.dataset.light);
    m.querySelectorAll('[data-light]').forEach((e, j) => e.classList.toggle('on', !!lights[j]));
    const rs = m.querySelector('#rune-status');   // 实时显示"已点亮 N/9"，别让玩家猜
    if (rs) rs.textContent = '已点亮 ' + lights.filter(v => v).length + '/9' + (lights.every(v => v) ? ' · 全亮了！' : '');
    if (lights.every(v => v)) { addLog('第三块石板应和了。', 'good'); nextStage(); }
      });
    }
  }
    return Object.freeze({startRunePuzzle,nextStage,finishRune,initStage1,initStage2,toggleLight,initStage3,renderRuneModal,playRuneSeq,bindRune});
  }
  return Object.freeze({create});
})();
