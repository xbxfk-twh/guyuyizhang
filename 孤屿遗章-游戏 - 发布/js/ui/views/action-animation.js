/* action-animation：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const ActionAnimationView = (() => {
  function create(deps) {
    const $=(...args)=>deps.$(...args);
    const esc=(...args)=>deps.esc(...args);
    const skinOn=(...args)=>deps.skinOn(...args);
const ANIM_MS = { gather: 3000, build: 3000, craft: 3000, fight: 1000, sleep: 2600, rest: 2000 };

const ANIM_SVG = {};

function showBusy(type, label, imgHint) {
    const b = $('#busy');
    if (!b) return;
    const im = imgHint || (type === 'fight' ? 'sword' : type === 'build' ? 'hammer_icon' : type === 'craft' ? 'pot' : type === 'sleep' ? 'sleep_night' : 'axe_icon');
    // 不挥砍、无刀光的图案：石镐（pick）照旧挥动，像斧子那样；手摘/舀水只轻轻动，不该"劈"
    const calm = (['pot','rest','dive','fish','gather','sleep_nap','sleep_night','berry_pick','water_ladle'].includes(im));
    // 有自绘 SVG 的图案直接用内联图（不需要 PNG 资源）；其余仍走 assets/img/anim/*.png
    const svg = ANIM_SVG[im];
    const inner = svg
      ? `<svg class="busy-img ${im} ${calm ? 'calm' : ''}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${svg.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>`
      : `<img class="busy-img ${im} ${calm ? 'calm' : ''} ${skinOn('seasons')?'art-colored':''}" src="assets/img/${skinOn('seasons')?'anim-colored':'anim-clean'}/${im}.png" alt="" onerror="this.onerror=null;this.src='assets/img/anim/${im}.png'">`;
    b.innerHTML = `<div class="busy-box">
      <div class="busy-scene ${type}">${inner}<span class="busy-slash" ${calm ? 'style="display:none"' : ''}></span></div>
      <div class="busy-label">${esc(label)}</div>
      <div class="busy-dots"><i></i><i></i><i></i></div>
    </div>`;
    b.classList.add('open');
    const workSound = im==='axe_icon'?'woodwork':im==='pick'?'stonework':im==='berry_pick'||im==='gather'?'forage':im==='water_ladle'?'waterwork':im==='fish'||im==='dive'?'fishing':im==='pot'?'cooking':type==='build'?'construction':type==='craft'?'metalwork':null;
    if (workSound) AudioFX.play(workSound);
    clearInterval(b.__chop);
    if (workSound && ['gather','build','craft'].includes(type)) b.__chop = setInterval(() => AudioFX.play(workSound), im==='pot'?1100:im==='fish'?1250:im==='gather'||im==='berry_pick'?950:820);
  }

function hideBusy() { const b = $('#busy'); if (b) { clearInterval(b.__chop); b.classList.remove('open'); } }

function withAnimation(type, label, fn, imgHint) {
    if (deps.uiBusy) return;
    deps.uiBusy = true;
    const dur = Math.round((ANIM_MS[type] || 2500) / deps.animSpeed);
    showBusy(type, label || '动作中…', imgHint);
    setTimeout(() => { hideBusy(); deps.uiBusy = false; fn(); }, dur);
  }
    return Object.freeze({showBusy,hideBusy,withAnimation});
  }
  return Object.freeze({create});
})();
