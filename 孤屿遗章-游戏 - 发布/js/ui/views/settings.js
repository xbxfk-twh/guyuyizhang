/* settings：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const SettingsView = (() => {
  function create(deps) {
    const itemIcon=(...args)=>deps.itemIcon(...args);
    const S=(...args)=>deps.S(...args);
    const esc=(...args)=>deps.esc(...args);
    const inlineHelp=(...args)=>deps.inlineHelp(...args);
    const centerToast=(...args)=>deps.centerToast(...args);
    const skinOn=(...args)=>deps.skinOn(...args);
    const skinName=(...args)=>deps.skinName(...args);
    let guideRead = false;
    try { guideRead = localStorage.getItem('guyuyizhang_guide_read') === '1'; } catch (e) {}

    function guideBadge() {
      return guideRead ? '' : '<span class="guide-unread-dot" role="img" aria-label="未读攻略"></span>';
    }

    function markGuideRead() {
      guideRead = true;
      try { localStorage.setItem('guyuyizhang_guide_read', '1'); } catch (e) {}
      document.querySelectorAll('.guide-unread-dot').forEach(dot => dot.remove());
    }
function roadAmbushOn() {
    const st = S();
    return !st || !st.settings || st.settings.roadAmbush !== false;
  }

function backupSummary(info) {
    if(!info.ok)return info.reason;
    return [info.currentGame ? `第 ${info.day} 天 · ${DIFFICULTIES[info.difficulty]?.name || info.difficulty}` : '旧版账号备份（不覆盖当前局）',
      info.version,info.checked?'完整性校验通过':'旧码无校验信息'].filter(Boolean).join(' · ');
  }

function downloadBackup(code) {
    if(!code){centerToast('导出失败，请重试');return;}
    if(window.GuyuFileBackup?.save){window.GuyuFileBackup.save(code);return;}
    const url=URL.createObjectURL(new Blob([code],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='Isle-of-Lost-Chapters-save-'+new Date().toISOString().replace(/[:.]/g,'-')+'.txt';
    document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

function settingsModal() {
    const btn = (v, label, on) => `<button class="mini-btn ${on ? 'active' : ''}" data-set="${v}">${label}</button>`;
    const tgl = (v, label, on) => `<button class="mini-btn ${on ? 'active' : ''}" data-set="${v}">${label} ${on ? '开' : '关'}</button>`;
    return `<div class="modal-title">设 置</div>
      <div class="help-list">
        <div class="help-item"><b>图鉴 · 每日签到</b><span>图鉴是账号级的，不开局也能翻；签到每天可领 魂点 ×${Game.dailySignState().soul} + 备份点 ×${Game.dailySignState().backup}。</span>
          <div class="modal-actions"><button class="mini-btn" data-open="collection">📜 图 鉴</button><button class="mini-btn" data-open="sign">📅 每日签到${Game.dailySignState().canSign ? ' <b style="color:#e8c66a">· 可领</b>' : ''}</button></div></div>
        <div class="help-item"><b>语言 / Language</b>${window.Locale?Locale.control():''}</div>
        ${S() ? `<div class="help-item"><b>自动取用工具</b><span>开启后使用背包或当前营地仓库里等级最高的可用工具，正常消耗耐久；不改变工具槽，野外不能借用仓库。</span><div class="set-inline">${tgl('autoTools','自动取用工具',Game.autoToolsEnabled())}</div></div>` : ''}
        <div class="help-item"><b>声音</b><span>音乐（配乐与氛围）/ 音效（咔哒、采集、战斗）/ 环境音（海浪、风、鸟虫、雨）</span>
          <div class="set-inline">${tgl('audio:music', '音乐', AudioFX.enabledState())}${tgl('audio:sfx', '音效', AudioFX.sfxState())}${tgl('audio:voice', '角色语音', AudioFX.voiceState())}${tgl('audio:amb', '环境音', AudioFX.ambientState())}</div></div>
        <div class="help-item"><b>日志栏</b><span>怎么显示 / 多宽（窄一点能多看画面，宽一点看得清文字）</span>
          <div class="set-inline">
            <span class="set-lbl">显示</span>${btn('log:always', '常驻', deps.logMode === 'always')}${btn('log:fade', '淡出', deps.logMode === 'fade')}${btn('log:hidden', '隐藏', deps.logMode === 'hidden')}
            <span class="set-lbl">宽度</span>${btn('logw:tiny', '极窄', deps.logSize === 'tiny')}${btn('logw:narrow', '窄', deps.logSize === 'narrow')}${btn('logw:mid', '中', deps.logSize === 'mid')}${btn('logw:wide', '宽', deps.logSize === 'wide')}
          </div></div>
        <div class="help-item"><b>场景上下滑动</b><span>关闭后小场景保持比例裁取画面，热点保留原位；大地图、日志和列表仍可滚动。</span><div class="set-inline">${tgl('sceneScroll','上下滑动',deps.sceneScroll)}</div></div>
        <div class="help-item"><b>当前目标</b><span>营地顶部那行「当前目标：…」提示；嫌它占地方可以关掉</span>
          <div class="set-inline"><button class="mini-btn ${deps.showObjective ? 'active' : ''}" data-set="obj:on">显示</button><button class="mini-btn ${!deps.showObjective ? 'active' : ''}" data-set="obj:off">关闭</button></div></div>
        <div class="help-item"><b>皮肤包</b><span>当前：<b>${skinName()}</b></span>
          <div class="set-inline">${deps.SKINS.filter(s => s.id !== 'ink' && (s.id!=='armory' || Game.skinOwned('armory'))).map(s => Game.skinOwned(s.id)
            ? btn('skin:' + s.id, s.id === 'seasons' ? s.name + ' · 免费' : s.name, skinOn(s.id))
            : `<button class="mini-btn" data-askin="${s.id}">🔒 ${s.name} · ${Game.skinCost()} 魂点</button>`).join('')}${btn('skinoff:1', '墨白原味（全部关闭）', deps.skinSet.size === 0)}</div></div>
        <div class="help-item"><b>本地存档</b><span>进度保存在当前设备。卸载或清除数据会丢失，请保存备份文件。换设备可生成10分钟有效的取档码。</span><div class="set-inline"><button class="mini-btn" data-codex="export">取档码 / 文件备份</button><button class="mini-btn" data-codex="import">导入存档</button></div><span class="help-sub">版本 ${(typeof window !== 'undefined' && window.BUILD_VER) || '（未知版本）'}</span></div>
      </div>
      <div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
  }

function signModal() {
    const st = Game.dailySignState();
    return `<div class="modal-title">📅 每日签到</div>
      <div class="overlay-text">每天可领一次：<b>魂点 ×${st.soul}</b> + <b>备份点 ×${st.backup}</b>。<br>

      ${st.canSign ? '<b style="color:#9c6b1f">还没签到 · 可以领取</b>' : `已签到`}<br>
      当前：魂点 ${st.total} · 备份点 ${st.bp}</div>
      <div class="modal-actions">
        ${st.canSign ? '<button data-sign="go">领 取</button>' : '<button disabled>今天已领过</button>'}
        <button id="modal-close">关 闭</button>
      </div>`;
  }

function guideContent() {
    const pages = GUIDE;
    deps.guidePage = Math.max(0, Math.min(pages.length - 1, deps.guidePage));
    const page = pages[deps.guidePage];
    return `<div class="guide-nav"><button data-guide-step="-1" ${deps.guidePage===0?'disabled':''}>上一页</button><select data-guide-page aria-label="攻略章节">${pages.map((p,i)=>`<option value="${i}" ${i===deps.guidePage?'selected':''}>${esc(p.title)}</option>`).join('')}</select><button data-guide-step="1" ${deps.guidePage===pages.length-1?'disabled':''}>下一页</button><span>${deps.guidePage+1}/${pages.length}</span></div><section class="guide-page"><h3>${esc(page.title)}</h3>${page.steps.map((text,i)=>`<p><b>${i+1}.</b> ${esc(text)}</p>`).join('')}</section>`;
  }

function guideModal() {
    return '<div class="modal-title">全流程攻略</div>'+guideContent()+'<div class="modal-actions"><button id="modal-close">关闭</button></div>';
  }

function adAvailable() { return typeof TapAds!=='undefined' && TapAds.supported() && !TapAds.busy(); }

function watchAd(action, done) {
    if (!adAvailable()) { done({ok:false,reason:'广告暂不可用，请在 TapTap 内打开游戏后重试。'}); return; }
    const frozen=Game.timeFrozen(), panels=[document.querySelector('#modal .modal-content')].filter(Boolean);
    panels.forEach(p=>p.inert=true); Game.setTimeFreeze(true);
    let applied;
    TapAds.onReward(()=>{applied=action();});
    TapAds.showRewardedVideo(result=>{
      panels.forEach(p=>p.inert=false); Game.setTimeFreeze(frozen);
      done(result.ok && applied ? applied : {ok:false,reason:result.reason || '奖励未能领取，请稍后再试。'});
    });
  }

function adShopModal() {
    const shop=Game.adShopState(), soul=Game.metaState().soul || 0,currency=Game.adCurrencyName();
    const reward=Game.adRewardState(), tapShop=typeof TapAds!=='undefined' && TapAds.enabled();
    const video=tapShop ? `<button id="watch-reward-ad" class="cabinet-cell" ${!reward.canClaim || !adAvailable()?'disabled':''}><b>看广告领币</b><small>3～6 广告币 · ${reward.uses}/${reward.limit}</small><small>${reward.reason || (!adAvailable()?'请在 TapTap 内观看':'')}</small></button>` : '';
    return `<div class="modal-title shop-title"><b>售物柜</b><div class="shop-tools"><div class="cabinet-exchange"><div class="cabinet-controls"><input id="star-exchange-qty" aria-label="兑换数量" type="number" min="1" max="${Math.max(shop.coins,Math.floor(soul/15),1)}" value="1"><button data-soulexchange ${soul<15?'disabled':''}>换${currency}</button><button data-adexchange ${shop.coins<1?'disabled':''}>换魂点</button></div></div><span>◇ ${shop.coins} · 魂点 ${soul}</span>${inlineHelp(`15 魂点兑换 1 ${currency}；1 ${currency}兑换 15 魂点。输入兑换数量再选择方向。${currency}跨局保留，商品寄到邮箱；传奇档不能领取物资。`)}</div></div>
      <div class="shop-cabinet">${shop.goods.map(g=>{const item=ITEMS[g.id] || RELICS[g.id];return `<button class="cabinet-cell cabinet-product" data-adbuy="${g.id}" aria-label="购买${esc(item.name)}，${g.cost}${currency}，发到邮箱" ${shop.coins<g.cost?'disabled':''}><span class="cabinet-item">${itemIcon(g.id)}<b>${esc(item.name)}</b></span><small class="cabinet-price">◇ ${g.cost}</small></button>`;}).join('')}
      ${video}${Array.from({length:Math.max(0,12-shop.goods.length-(tapShop?1:0))},()=>'<div class="cabinet-cell cabinet-empty" aria-hidden="true"></div>').join('')}</div>`;
  }

function mailboxModal() {
    const tabs = [['mail','邮箱'],['code','兑换码'],['event','活动'],['guide','攻略']];
    const mbox = Game.mailboxList();
    const st = S() || {};      // 当前存档（传奇难度判定要用；没开局时为 {}）
    // ⚠️ isLegend 必须声明在 if 外面：下面"兑换码"和"活动"两个分支都要用它。
    //    写进 if (mailTab === 'mail') 块里的话，切到兑换码页就 ReferenceError → 整个弹窗渲染中断、tab 永远切不过去。
    const isLegend = st.difficulty === 'legend';
    let inner = '';
    if (deps.mailTab === 'mail') {
      // 传奇难度不能领物资邮件（物品/神物/魂点）——按钮直接置灰并写明原因，别让玩家点了才发现
      const supplyMail = (x) => !!(x && !x.notice && (x.item || x.relic || x.soul || x.adCoins));
      inner = mbox.length ? mbox.map(x => {
        const blocked = isLegend && supplyMail(x);
        const btn = blocked
          ? `<button class="mini-btn lockedb" disabled title="传奇模式下不能领取物资邮件">传奇档不可领</button>`
          : `<button class="mini-btn" data-claimmail="${x.i}">${x.notice ? '知道了' : '领取'}</button>`;
        const why = blocked ? `<div class="mail-body" style="color:#a8382a">传奇难度下不能领取物资邮件——邮件会留着，换低难度开局再来领。</div>` : '';
        return x.notice
        // ⚠️ 兼容老存档：以前发出去的公告邮件里 body 可能是数组（没归一化），
        //    直接 String(数组) 会变成逗号拼成一整行 —— 这里统一按行拆。
        ? `<div class="help-item"><b>📣 ${esc(x.title)}${x.date ? ` <small>（${esc(x.date)}）</small>` : ''}</b><div class="mail-body">${(Array.isArray(x.body) ? x.body.join('\n') : String(x.body || '')).split('\n').map(t => `<div>${esc(t)}</div>`).join('')}</div>${btn}</div>`
        : `<div class="help-item"><b>${x.item === 'divineBow' ? '◈ 限定 · ' : ''}${x.relic ? `◈ 神物 · ${esc(RELICS[x.relic].name)}` : (x.item ? `${ITEMS[x.item].glyph} ${esc(ITEMS[x.item].name)}×${x.qty}` : `魂点 ×${x.soul}${x.adCoins ? ` + 星之点 ×${x.adCoins}` : ''}`)}</b><span>${x.item === 'divineBow' ? esc(ITEMS.divineBow.desc) + (x.dur !== undefined ? `（剩余耐久 ${x.dur}）` : '') : (x.relic ? esc(RELICS[x.relic].desc) : '来自官方邮件')}</span>${why}${btn}</div>`;
      }).join('') : '<div class="hint">邮箱是空的。（兑换码/官方发放会送到这里）</div>';

    } else if (deps.mailTab === 'code') {
      inner = isLegend
        ? `<div class="overlay-text">输入官方兑换码领取奖励。通用码每人一次，专属码只能被一人兑换。</div><div class="mail-body" style="color:#a8382a"><b>传奇难度下不能兑换物资</b>（物品 / 神物 / 魂点）——兑换码不会被消耗，换一个低难度开局再来兑换。</div><div class="batch-row"><span>兑换码</span><input id="redeem-code" style="flex:1" maxlength="64" placeholder="传奇档不可兑换" disabled></div><div class="modal-actions"><button id="redeem-do" disabled>不可兑换</button></div>`
        : `<div class="overlay-text">输入官方兑换码领取奖励。通用码每人一次，专属码只能被一人兑换。</div><div class="batch-row"><span>兑换码</span><input id="redeem-code" style="flex:1" maxlength="64" placeholder="输入兑换码"></div><div class="modal-actions"><button id="redeem-do">兑 换</button></div>`;
    } else if (deps.mailTab === 'guide') {
      inner = guideContent();
    } else {
      // 核心补偿那段文案已撤下（CORE4 这个码本身还在，可以私下发给受影响的玩家）
      // 作者 2026-09-25：在「活动」页挂一条朋友的小广告 + 反馈渠道说明。
      inner = `<section class="overlay-text event-feedback"><b>🎁 攻略与反馈征集</b><p>欢迎大家分享自己的游戏心得！</p><p>在论坛发布原创攻略，或向我们提交有价值的 BUG、玩法建议与改进反馈，经确认后可获得：</p><p><b>300 魂点 + 30 星之点</b></p><p>奖励与评分、评价内容及星级无关。不要求发布评价，也无需提交评价截图或链接。</p><p>攻略或反馈可通过官方交流群提交，确认后发放奖励。</p></section><section class="overlay-text event-review"><b>欢迎留下真实评价</b><p>非常欢迎大家留下自己对《孤屿遗章》的真实评价。无论喜欢、吐槽还是建议，我们都会认真看，并用于后续版本改进。</p></section><div class="overlay-text"><b>【命名牌】</b><br>兑换码 <code>QQ1014679931</code> 可兑换 1 张命名牌。<br><br><code>GUYU2026</code> 可兑换 50 魂点。<br><br>QQ群：1014679931</div>`
        + `<div class="overlay-text event-ad"><b>【小广告】</b><br>中式心理咨询可加 QQ <code>1840585640</code>。</div>`;
      inner=`<section class="overlay-text event-download"><b>安卓独立测试版</b><p>可下载安装后离线游玩。迁移前，请在「菜单 → 备份·读档」导出完整进度，再到独立版导入。独立版的广告和平台功能有所不同。</p><p><a class="mini-btn" href="https://guyuyizhang.top:8443/download.html" target="_blank" rel="noopener noreferrer">打开官网下载页 ↗</a></p></section>`+inner;


    }
    return `<div class="modal-title">邮箱 · 兑换 · 活动 · 攻略</div><div class="tabs">${tabs.map(([k,l]) => `<button class="tab ${deps.mailTab===k?'active':''}" data-mailtab="${k}">${l}${k==='guide'?guideBadge():''}</button>`).join('')}</div><div class="overlay-text">内</div>`.replace('<div class="overlay-text">内</div>', `<div>${inner}</div>`) + `<div class="modal-actions"><button id="modal-close">关 闭</button></div>`;
  }
    return Object.freeze({guideBadge,markGuideRead,roadAmbushOn,backupSummary,downloadBackup,settingsModal,signModal,guideContent,guideModal,adAvailable,watchAd,adShopModal,mailboxModal});
  }
  return Object.freeze({create});
})();
