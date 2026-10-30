/* tutorial：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const TutorialView = (() => {
  function create(deps) {

function renderTut(st) {
    const step = st.tut;
    let t = document.getElementById('tut');
    if (!step && step !== 0) { if (t) t.remove(); return; }
    // ⚠️ 步骤 0 要写成 `step === 0` 单独判断：`if (!step)` 会把 0 当成"没有引导"直接返回。
    const hint = step === 0 ? '新手引导：先点底部【背包】看看开局带的东西（武器/工具可能已经在里面了，别急着做）'
      : step === 1 ? '新手引导：点击底部【制造】→【手工】→ 制作【石镐】'
      : '新手引导：点【装备】→ 工具栏 → 点【石镐】上栏装备';
    if (!t) { t = document.createElement('div'); t.id = 'tut'; t.className = 'tut-banner'; document.body.appendChild(t); }
    t.innerHTML = `<span class="tut-text">${hint}</span><button class="mini-btn" data-tutskip="1">跳过</button>`;
    const sk = t.querySelector('[data-tutskip]'); if (sk) sk.onclick = () => Game.skipTutorial();
  }

function tutAfterBag() {
    Game.tutorialBagViewed();
  }
    return Object.freeze({renderTut,tutAfterBag});
  }
  return Object.freeze({create});
})();
