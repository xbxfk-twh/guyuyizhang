(() => {
  const $ = id => document.getElementById(id);
  const colors = ['blue', 'red'];
  const tag = (name, text = '', className = '') => {
    const node = document.createElement(name);
    node.textContent = text;
    node.className = className;
    return node;
  };
  const button = (label, onClick, disabled = false) => {
    const node = tag('button', label);
    node.type = 'button';
    node.onclick = onClick;
    node.disabled = disabled;
    return node;
  };
  let session;
  let current;
  let key = '';
  let pending = false;
  let submitting = false;
  let requestDone = Promise.resolve();
  let lastReceived = 0;
  let lastEffect = 0;
  let battleKey = '';
  let playingAd = false;
  let pendingReward = null;
  try { session = JSON.parse(sessionStorage.getItem('guyuyizhang_coop') || 'null'); } catch (_) {}

  function nonce() {
    return crypto.randomUUID?.() || [...crypto.getRandomValues(new Uint8Array(18))]
      .map(value => value.toString(16).padStart(2, '0')).join('');
  }

  async function request(action, params = {}) {
    if (submitting || (action === 'state' && pending)) return;
    const mutation = action !== 'state';
    if (mutation) {
      submitting = true;
      await requestDone;
    }
    requestDone = send(action, params);
    try { return await requestDone; }
    finally { if (mutation) submitting = false; }
  }

  async function send(action, params) {
    pending = true;
    const saving = action === 'create' || action === 'join';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch('api/coop', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({...session, action, nonce:nonce(), ...params}),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '房间请求失败。');
      if (saving) {
        session = {room:data.room, secret:data.secret};
        try { sessionStorage.setItem('guyuyizhang_coop', JSON.stringify(session)); } catch (_) {}
      }
      if (current && data.lastFight && !data.fight && current.fight?.team.includes(data.seat)) {
        $('notice').textContent = data.lastFight.victory ? '战斗获胜。战利品已分到背包。' : '这场战斗结束了。';
      } else if (action !== 'state') $('notice').textContent = '';
      current = data;
      lastReceived = Date.now();
      render(data);
      return data;
    } catch (error) {
      if (action !== 'state' || !current || Date.now() - lastReceived > 3000) {
        $('notice').textContent = ['TypeError','SyntaxError','AbortError'].includes(error.name)
          ? '双人房间服务暂不可达。请从双人服务地址打开，或稍后重试。'
          : error.message;
      }
    } finally {
      clearTimeout(timeout);
      pending = false;
    }
  }

  function render(data) {
    $('lobby').hidden = true;
    $('room').hidden = false;
    $('room-code').textContent = '房间 ' + data.room;
    const me = data.players.find(p => p.seat === data.seat);
    const partner = data.players.find(p => p.seat !== data.seat);
    const enrolled = data.fight?.team.includes(me.seat);
    const busy = !!me.job || enrolled;
    const samePlace = partner?.online && !partner.job && partner.zone === me.zone;
    const signature = JSON.stringify([data.players, data.chest, data.fight, data.invite, data.lastFight]);
    if (signature !== key) {
      const details = [...$('inventory').querySelectorAll('details')].map(node => node.open);
      $('places').replaceChildren(...Object.entries(data.places).map(([id, [name]]) => {
        const place = button(name, () => request('travel', {zone:id}), busy || me.zone === id);
        place.className = 'place';
        place.style.left = MAP_ARROWS[id].x + '%';
        place.style.top = MAP_ARROWS[id].y + '%';
        return place;
      }));
      $('markers').replaceChildren(...data.players.map(p => {
        const marker = tag('span', '▼', 'marker ' + colors[p.seat]);
        const offset = partner && me.zone === partner.zone ? (p.seat === 0 ? -2 : 2) : 0;
        marker.style.left = MAP_ARROWS[p.zone].x + offset + '%';
        marker.style.top = MAP_ARROWS[p.zone].y - 3 + '%';
        marker.setAttribute('aria-label', p.name + '在' + data.places[p.zone][0]);
        marker.title = marker.getAttribute('aria-label');
        return marker;
      }));
      $('party').replaceChildren(...data.players.map(p => {
        const member = tag('article', '', 'member ' + colors[p.seat]);
        member.append(tag('b', (p.seat === me.seat ? '你 · ' : '') + p.name),
          tag('p', data.places[p.zone][0] + ' · 生命 ' + p.hp + (p.online ? '' : ' · 离线')));
        if (p.job) {
          const name = p.job.kind === 'travel' ? '前往' + data.places[p.job.zone][0]
            : p.job.kind === 'craft' ? '制作' : '采集';
          const status = tag('p', name);
          status.dataset.due = p.job.due;
          status.dataset.name = name;
          member.append(status);
        }
        return member;
      }));
      const actions = [];
      if (enrolled) {
        actions.push(button('使用绷带', () => request('heal'), !me.hp || !me.bag.bandage || me.hp === 60));
        actions.push(button('撤回营地', () => request('flee'), !me.hp));
      } else if (me.zone === 'camp') {
        actions.push(button('制作绷带', () => request('craft'), busy || !me.bag.wood || !me.bag.water));
        actions.push(button('营地休整', () => request('rest'), busy || me.hp === 60));
      } else {
        if (['forest','river','quarry'].includes(me.zone)) actions.push(button('采集', () => request('gather'), busy));
        if (['forest','cave'].includes(me.zone)) {
          actions.push(button('邀请并肩作战', () => request('invite'), busy || !samePlace || !!data.fight || !!data.invite));
          actions.push(button('独自迎战', () => request('solo'), busy || !!data.fight || !!data.invite));
          if (data.invite?.by === me.seat) actions.push(button('取消邀请', () => request('cancel')));
        }
      }
      $('actions').replaceChildren(...actions);
      renderCombat(data, me, enrolled);
      renderInventory(data, me, busy, details);
      key = signature;
    }
    const invite = data.invite;
    const dialog = $('invitation');
    if (invite?.to === me.seat) {
      $('invite-text').textContent = data.players[invite.by].name + '邀请你一起战斗，是否并肩作战？';
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) dialog.close();
    renderClock();
  }

  function renderInventory(data, me, busy, previous) {
    function list(title, bag, mode, index) {
      const section = tag('details');
      section.open = previous[index] ?? (index === 0);
      section.append(tag('summary', title));
      for (const [id, qty] of Object.entries(bag)) {
        if (qty <= 0) continue;
        const row = tag('div', '', 'item-row');
        row.append(tag('span', data.items[id] + ' ×' + qty));
        if (!busy && me.zone === 'camp') row.append(button(mode === 'store' ? '存 1' : '取 1', () => request(mode, {item:id})));
        section.append(row);
      }
      return section;
    }
    $('inventory').replaceChildren(list('我的背包',me.bag,'store',0),list('营地共享箱',data.chest,'take',1));
  }

  function renderCombat(data, me, enrolled) {
    const panel = $('combat');
    const fight = data.fight;
    panel.hidden = !enrolled;
    if (!enrolled) {
      panel.replaceChildren();
      battleKey = '';
      lastEffect = 0;
      return;
    }
    if (battleKey !== fight.id) {
      battleKey = fight.id;
      lastEffect = 0;
    }
    const foes = tag('div', '', 'foes');
    for (const foe of fight.foes) {
      const card = tag('article', '', 'foe');
      const portrait = tag('img');
      portrait.src = ENEMIES[foe.kind].img;
      portrait.alt = '';
      const hp = tag('progress');
      hp.max = foe.maxHp;
      hp.value = foe.hp;
      hp.setAttribute('aria-label', foe.name + '生命 ' + foe.hp);
      card.append(portrait, tag('strong', foe.name + ' · ' + foe.hp), hp);
      const targets = tag('div', ' ');
      for (const p of data.players.filter(p => fight.team.includes(p.seat) && p.target === foe.id && p.hp > 0)) {
        const mark = tag('span', '▼', 'target-mark ' + colors[p.seat]);
        mark.setAttribute('aria-label', p.name + '的目标');
        targets.append(mark);
      }
      const buttons = tag('div', '', 'buttons');
      const attack = button('攻击', () => request('attack', {target:foe.id}), !me.hp || !foe.hp || data.now < me.ready);
      if (me.hp && foe.hp) attack.dataset.ready = me.ready;
      buttons.append(button('选中', () => request('target', {target:foe.id}), !me.hp || !foe.hp), attack);
      card.append(targets, buttons);
      for (const effect of fight.effects.filter(effect => effect.target === foe.id && effect.id > lastEffect && data.now - effect.at < 1.1)) {
        card.append(tag('i', '', 'hit ' + colors[effect.seat]));
      }
      foes.append(card);
    }
    panel.replaceChildren(foes);
    lastEffect = fight.serial;
  }

  function renderClock() {
    if (!current) return;
    const elapsed = Math.max(0, Math.min(3, (Date.now() - lastReceived) / 1000));
    const now = current.now + elapsed;
    const edge = current.nextClockChange ?? Infinity;
    const gameMinute = current.clockMinute + (Math.min(now, edge) - current.now) * current.clockRate;
    const minute = Math.floor(gameMinute);
    $('clock').textContent = '第 ' + (Math.floor(minute / 1440) + 1) + ' 日 · ' +
      String(Math.floor(minute / 60) % 24).padStart(2,'0') + ':' + String(minute % 60).padStart(2,'0');
    document.querySelectorAll('[data-due]').forEach(node => {
      node.textContent = node.dataset.name + ' · ' + Math.max(0,Math.ceil(node.dataset.due - now)) + ' 秒';
    });
    document.querySelectorAll('[data-ready]').forEach(node => { node.disabled = now < Number(node.dataset.ready); });
    renderWaiting(now, gameMinute);
  }

  function availableAd() {
    if (TapAds.supported()) return TapAds;
    if (NativeAds.supported()) return NativeAds;
    return null;
  }

  function renderWaiting(now, gameMinute) {
    const job = current.players[current.seat].job;
    if (pendingReward && pendingReward.until < now && !playingAd) {
      pendingReward = null;
      $('notice').textContent = '广告奖励领取已超时。';
    }
    const offer = job && job.due - now > 25 ? current.adOffer : null;
    const reward = pendingReward || offer;
    const row = $('job-progress');
    row.hidden = !job && !pendingReward && !playingAd;
    if (row.hidden) return;
    $('job-bar').hidden = !job;
    if (job) $('job-bar').value = Math.min(1, Math.max(0,
      (gameMinute - job.startMinute) / (job.endMinute - job.startMinute)));
    $('wait-ad').hidden = !reward && !playingAd;
    $('ad-label').textContent = playingAd ? '正在处理' : pendingReward ? '领取广告奖励' : '看个广告吧';
    $('ad-button').disabled = playingAd || (!pendingReward && !availableAd());
    $('ad-button').setAttribute('aria-label', pendingReward ? '重试领取广告奖励' : '观看广告并领取房间物资');
    $('ad-reward').textContent = !reward ? '' : !pendingReward && !availableAd()
      ? '当前环境暂不可播放广告' : current.items[reward.item] + ' ×' + reward.quantity;
  }

  async function claimReward() {
    const result = await request('claimAd', {ticket:pendingReward.token});
    if (!result?.adReceipt?.claimed) return;
    const {item, quantity} = result.adReceipt;
    pendingReward = null;
    $('notice').textContent = '领取了' + result.items[item] + ' ×' + quantity + '，已放入房间背包。';
  }

  async function watchAd() {
    if (playingAd || submitting) return;
    playingAd = true;
    renderClock();
    try {
      if (pendingReward) {
        await claimReward();
        return;
      }
      const sdk = availableAd();
      const job = current?.adOffer?.job;
      if (!sdk || !job) return;
      const reservation = await request('reserveAd', {job});
      const receipt = reservation?.adReceipt;
      if (!receipt) return;
      const watched = await new Promise(resolve => {
        if (!sdk.showRewardedVideo(resolve)) resolve({ok:false, reason:'当前无法播放广告。'});
      });
      if (watched.ok) {
        pendingReward = receipt;
        await claimReward();
      } else {
        await request('cancelAd', {ticket:receipt.token});
        $('notice').textContent = watched.reason;
      }
    } finally {
      playingAd = false;
      renderClock();
    }
  }

  $('create').onclick = () => request('create');
  $('join').onsubmit = event => { event.preventDefault(); request('join', {room:event.currentTarget.elements.code.value.trim().toUpperCase()}); };
  $('copy').onclick = async () => {
    try { await navigator.clipboard.writeText(current.room); $('notice').textContent = '房间码已复制。'; }
    catch (_) { $('notice').textContent = '房间码 ' + current.room; }
  };
  $('leave').onclick = () => {
    if (pending || submitting || playingAd) return;
    pendingReward = null;
    session = current = null;
    key = battleKey = '';
    lastEffect = 0;
    try { sessionStorage.removeItem('guyuyizhang_coop'); } catch (_) {}
    $('room').hidden = true;
    $('lobby').hidden = false;
    $('clock').textContent = '';
  };
  $('accept').onclick = () => request('accept');
  $('decline').onclick = () => request('decline');
  $('ad-button').onclick = watchAd;
  $('invitation').addEventListener('cancel', event => { event.preventDefault(); request('decline'); });
  if (session) request('state');
  setInterval(() => { if (session) request('state'); }, 500);
  setInterval(renderClock, 250);
})();
