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
  let batch = 1;
  const local = location.protocol === 'http:' || ['localhost','127.0.0.1'].includes(location.hostname);
  const endpoint = local ? new URL('api/coop', location.href) : 'https://guyuyizhang.top:8443/coop/v1';
  const storageKey = 'guyuyizhang_coop';
  const host = window.frameElement?.roomHost;
  let saved = [];
  try {
    session = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    const previous = JSON.parse(localStorage.getItem(storageKey) || 'null') || session;
    saved = (Array.isArray(previous) ? previous : [previous]).filter(s => s?.room && s?.secret);
  } catch (_) {}
  renderSavedRooms();

  function renderSavedRooms() {
    $('saved-rooms').hidden = !saved.length;
    $('saved-room').replaceChildren(...saved.map(s => {
      const option = tag('option', s.room);
      option.value = s.room;
      return option;
    }));
  }

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
    try {
      const body = JSON.stringify({...session, action, nonce:nonce(), ...params});
      const response = await sendPacket(body, action !== 'state');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '房间请求失败。');
      if (saving) {
        session = {room:data.room, secret:data.secret};
        saved = [session, ...saved.filter(item => item.room !== session.room)];
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(session));
          localStorage.setItem(storageKey, JSON.stringify(saved));
        } catch (_) {}
      }
      if (current?.fight?.id && !data.fight && data.lastFight?.id === current.fight.id) {
        $('notice').textContent = data.lastFight.victory ? '战斗获胜。站到最后的旅者获得战利品。' : '这场战斗结束了。';
      } else if (action !== 'state') $('notice').textContent = '';
      current = data;
      lastReceived = Date.now();
      render(data);
      return data;
    } catch (error) {
      if (action !== 'state' || !current || Date.now() - lastReceived > 3000) {
        $('notice').textContent = ['TypeError','SyntaxError','AbortError'].includes(error.name)
          ? '联机服务暂不可达，房间存档已保留。'
          : error.message;
      }
    } finally {
      pending = false;
    }
  }

  async function sendPacket(body, retry) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    try {
      return await fetch(endpoint, {
        method:'POST', headers:{'Content-Type':'application/json'}, body, signal:controller.signal,
      });
    } catch (error) {
      if (!retry) throw error;
      return sendPacket(body, false);
    } finally {
      clearTimeout(timeout);
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
    const samePlace = partner?.online && !partner.job && !partner.inCombat && partner.zone === me.zone;
    $('partner-status').hidden = !partner;
    if (partner) $('partner-status').textContent = partnerStatus(partner, data.places);
    const visible = data.players.map(p => ({...p, job:p.job && [p.job.kind,p.job.zone,p.job.due]}));
    const signature = JSON.stringify([visible, data.chest, data.fight, data.invite, data.lastFight]);
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
          marker.classList.toggle('offline', !p.online);
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
          status.dataset.seat = p.seat;
          status.dataset.name = name;
          member.append(status);
        }
        return member;
      }));
      const actions = [];
      if (enrolled) {
        const heal = button('使用绷带', () => request('heal', {fight:data.fight.id}), !me.hp || !me.bag.bandage || me.hp === 60);
        if (!heal.disabled) heal.dataset.ready = me.healReady;
        actions.push(heal, button('撤回营地', () => request('flee', {fight:data.fight.id}), !me.hp));
      } else if (me.zone === 'camp') {
        actions.push(craftForm(me, busy));
        actions.push(button('营地休整', () => request('rest'), busy || me.hp === 60));
      } else {
        if (['forest','river','quarry'].includes(me.zone)) actions.push(button('采集', () => request('gather'), busy));
        if (['forest','cave'].includes(me.zone)) {
          actions.push(button('邀请并肩作战', () => request('invite'), busy || !samePlace || !!data.invite));
          actions.push(button('独自迎战', () => request('solo'), busy));
          if (data.invite?.by === me.seat) actions.push(button('取消邀请', () => request('cancel', {invite:data.invite.id})));
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

  function partnerStatus(partner, places) {
    if (!partner.online) return '队友离线';
    const zone = places[partner.zone][0];
    if (partner.inCombat) return '对方正在' + zone + '战斗';
    if (partner.job?.kind === 'travel') return '对方正在赶往' + places[partner.job.zone][0];
    if (partner.job?.kind === 'gather') return '对方正在' + zone + '采集';
    if (partner.job?.kind === 'craft') return '对方正在' + zone + '制作';
    return '对方在' + zone;
  }

  function craftForm(me, busy) {
    const limit = Math.min(20, me.bag.wood, me.bag.water);
    const form = tag('form', '', 'craft-form');
    const count = tag('input');
    count.type = 'number';
    count.setAttribute('aria-label', '制作绷带的数量');
    count.min = 1;
    count.max = Math.max(1, limit);
    count.value = Math.min(batch, Math.max(1, limit));
    count.disabled = busy || !limit;
    count.oninput = () => { if (count.validity.valid && count.value) batch = count.valueAsNumber; };
    const submit = tag('button', '制作绷带');
    submit.disabled = count.disabled;
    form.onsubmit = event => {
      event.preventDefault();
      if (count.validity.valid && count.value) request('craft', {count:count.valueAsNumber});
    };
    form.append(count, submit);
    return form;
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
      const attack = button('攻击', () => request('attack', {fight:fight.id, target:foe.id}), !me.hp || !foe.hp || data.now < me.ready);
      if (me.hp && foe.hp) attack.dataset.ready = me.ready;
      buttons.append(button('选中', () => request('target', {fight:fight.id, target:foe.id}), !me.hp || !foe.hp), attack);
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
    const gameMinute = current.clockMinute + Math.max(0, Math.min(now, edge) - current.now) * current.clockRate;
    const minute = Math.floor(gameMinute);
    $('clock').textContent = '第 ' + (Math.floor(minute / 1440) + 1) + ' 日 · ' +
      String(Math.floor(minute / 60) % 24).padStart(2,'0') + ':' + String(minute % 60).padStart(2,'0');
    document.querySelectorAll('[data-seat]').forEach(node => {
      const job = current.players[Number(node.dataset.seat)].job;
      if (!job) return;
      node.textContent = node.dataset.name + (job.due == null ? ' · 暂停' : ' · ' + Math.max(0, Math.ceil(job.due - now)) + ' 秒');
    });
    document.querySelectorAll('[data-ready]').forEach(node => { node.disabled = now < Number(node.dataset.ready); });
    renderWaiting(now, gameMinute);
  }

  function renderWaiting(now, gameMinute) {
    const job = current.players[current.seat].job;
    const ad = host?.adState();
    const offer = job?.due && job.due - now > current.adWait;
    const row = $('job-progress');
    row.hidden = !job && !ad?.pending && !playingAd;
    if (row.hidden) return;
    $('job-bar').hidden = !job;
    if (job) $('job-bar').value = Math.min(1, job.progress + (gameMinute - current.clockMinute) / job.minutes);
    $('wait-ad').hidden = !offer && !ad?.pending && !playingAd;
    $('ad-label').textContent = playingAd ? '正在播放' : ad?.pending ? '领取广告奖励' : '看个广告吧';
    $('ad-button').disabled = playingAd || !ad || (!ad.pending && !ad.available);
    $('ad-reward').textContent = ad?.pending ? '点按重新入账' : ad?.available
      ? ad.min + '–' + ad.max + ' ' + ad.currency : '当前环境暂不可播放广告';
  }

  async function watchAd() {
    renderClock();
    if (playingAd || $('ad-button').disabled || $('wait-ad').hidden) return;
    playingAd = true;
    renderClock();
    try {
      const result = await host.watchAd();
      $('notice').textContent = result.ok ? '已到账 ' + result.amount + ' ' + result.currency + '。' : result.reason;
    } finally {
      playingAd = false;
      if (session && !document.hidden) request('state');
      renderClock();
    }
  }

  $('create').onclick = () => request('create');
  $('saved-rooms').onsubmit = event => {
    event.preventDefault();
    session = saved.find(s => s.room === $('saved-room').value);
    if (!session) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify(session)); } catch (_) {}
    request('state');
  };
  $('join').onsubmit = event => { event.preventDefault(); request('join', {room:event.currentTarget.elements.code.value.trim().toUpperCase()}); };
  $('copy').onclick = async () => {
    try { await navigator.clipboard.writeText(current.room); $('notice').textContent = '房间码已复制。'; }
    catch (_) { $('notice').textContent = '房间码 ' + current.room; }
  };
  async function leave() {
    if (submitting || playingAd) return false;
    if (session) await request('leave');
    session = current = null;
    key = battleKey = '';
    lastEffect = 0;
    try { sessionStorage.removeItem(storageKey); } catch (_) {}
    renderSavedRooms();
    $('room').hidden = true;
    $('lobby').hidden = false;
    $('clock').textContent = '';
    return true;
  }
  $('leave').onclick = leave;
  if (host) $('back').onclick = async event => { event.preventDefault(); if (await leave()) host.close(); };
  $('accept').onclick = () => request('accept', {invite:current.invite?.id});
  $('decline').onclick = () => request('decline', {invite:current.invite?.id});
  $('ad-button').onclick = watchAd;
  $('invitation').addEventListener('cancel', event => { event.preventDefault(); $('decline').onclick(); });
  if (session) request('state');
  async function poll() {
    const active = current?.fight || current?.invite || current?.players.some(p => p.job && p.online);
    if (session && !document.hidden) await request('state');
    setTimeout(poll, active ? 750 : 3000);
  }
  document.addEventListener('visibilitychange', () => { if (session && !document.hidden) request('state'); });
  setTimeout(poll, 1500);
  setInterval(renderClock, 250);
})();
