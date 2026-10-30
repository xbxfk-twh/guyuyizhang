/* travel：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const TravelView = (() => {
  function create(deps) {
    const $=(...args)=>deps.$(...args);
    const el=(...args)=>deps.el(...args);
    const S=(...args)=>deps.S(...args);
    const centerToast=(...args)=>deps.centerToast(...args);
    const addLog=(...args)=>deps.addLog(...args);
    const skinOn=(...args)=>deps.skinOn(...args);
    const atlantisVisualArrows=(...args)=>deps.atlantisVisualArrows(...args);
    const render=(...args)=>deps.render(...args);
    const showModal=(...args)=>deps.showModal(...args);
function diveGateThen(go) {
    const ck = Game.canTravel('atlantis');
    if (ck && ck.ok === false) { addLog(ck.reason, 'warn'); centerToast(ck.reason); return; }
    atlantisTravelAnim(go);
  }

function atlantisTravelAnim(cb) {
    if (deps.traveling) return;
    deps.traveling = true;
    const l = el('div', 'atl-portal', `<img src="assets/img/${skinOn('seasons')?'anim-colored':'anim-clean'}/atlantis_gate.png" onerror="this.onerror=null;this.src='assets/img/anim/atlantis_gate.png'"><div class="atl-portal-text">你穿过传送石，坠入深海的微光……</div>`);
    document.body.appendChild(l);
    requestAnimationFrame(() => l.classList.add('show'));
    setTimeout(() => { try { AudioFX.motif('unlock'); } catch (e) {} l.classList.remove('show'); setTimeout(() => { l.remove(); deps.traveling = false; cb && cb(); }, 450); }, 3000);
  }

function zoneTravelAnim(zid) {
    if (deps.traveling) return;
    const wrap = $('#scene-wrap'); if (!wrap) { Game.setZone(zid); return; }
    deps.traveling = true;
    const layer = el('div', 'travel-layer', '<div class="travel-dot" style="left:50%;top:50%"></div>');
    layer.style.opacity = '0'; wrap.appendChild(layer);
    let p = 0;
    const step = () => {
      p += 0.08; layer.style.opacity = String(Math.min(1, p));
      if (p < 1) requestAnimationFrame(step);
      else { deps.traveling = false; layer.remove(); Game.setZone(zid); }
    };
    requestAnimationFrame(step);
  }

function startAtlantisTravel(zid) {
    if (deps.traveling) return;
    const st = S();
    const arrows = atlantisVisualArrows();
    const A = arrows[st.zone] || arrows.habitat;
    const B = arrows[zid];
    if (!B) { Game.setZone(zid); return; }
    if (st.zone === zid) { deps.view = 'scene'; render(); return; }
    // ⚠️ 这里必须读 Game.zoneSwimCost（和 setZone 结算用的是同一份公式）：
    //    以前界面自己抄了一遍、漏掉了推进器的减半 —— 玩家反馈"装上推进器显示不变、实际是变的"。
    const c = Game.zoneSwimCost(st.zone, zid);
    const t = c.time, ec = c.energy;
    if (st.stats.stamina < ec) { addLog('你太累了，游不动了。', 'warn'); deps.view = 'map'; render(); return; }
    showModal('overlay', { title:'前往 ' + (B.label || zid), text:`耗时 ${t} 分钟 · 消耗体力 ${ec}${c.thruster ? '（推进器已减半）' : ''}。`, choices:[
      { label:'前往', ok:() => {  animAtlantis(A, B, zid); } },
      { label:'取 消', ok:() => { deps.view = 'map'; render(); } },
    ]});
  }

function beginTravelFx() { document.body.classList.add('traveling'); }

function endTravelFx() { document.body.classList.remove('traveling'); }

function tipAnchor(inner, box, key, attr) {
    const sel = attr === 'zone' ? `[data-zone="${key}"]` : `[data-scene="${key}"]`;
    const el = inner.querySelector('.map-arrow' + sel);
    if (!el) return null;
    const g = el.querySelector('.arrow-glyph');
    if (!g) return null;
    const gr = g.getBoundingClientRect();
    const up = (g.textContent || '').indexOf('▲') >= 0;
    return { x: gr.left - box.left + gr.width / 2, y: (up ? gr.top : gr.bottom) - box.top };
  }

function animAtlantis(A, B, zid) {
    deps.traveling = true; deps.view = 'map'; render();
    const inner = $('#map-arrows') || $('#map-wrap');   // 用"图片内容盒"当坐标系：箭头在哪，线就从哪起（原来用舞台会偏）
    if (!inner) { deps.traveling = false; deps.view = 'scene'; Game.setZone(zid); return; }
    const W = Math.max(10, inner.clientWidth), H = Math.max(10, inner.clientHeight);
    const box = inner.getBoundingClientRect();
    const pa = tipAnchor(inner, box, S().zone || 'habitat', 'zone');
    const pb = tipAnchor(inner, box, zid, 'zone');
    const fx = pa ? pa.x : A.x / 100 * W, fy = pa ? pa.y : A.y / 100 * H;
    const tx = pb ? pb.x : B.x / 100 * W, ty = pb ? pb.y : B.y / 100 * H;
    const dist = Math.hypot(tx - fx, ty - fy);
    const durMs = Math.round(Math.min(3000, Math.max(500, dist / Math.max(W, 1) * 3000)));
    beginTravelFx();
    const layer = makeTravelLayer(inner, W, H, fx, fy, tx, ty, S().zone || 'habitat', zid, 'zone');
    const dot = layer.querySelector('.travel-dot');
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / durMs);
      dot.style.left = (fx + (tx - fx) * p) + 'px'; dot.style.top = (fy + (ty - fy) * p) + 'px';
      if (p < 1) requestAnimationFrame(step);
      else { deps.traveling = false; layer.remove(); endTravelFx(); deps.view = 'scene'; Game.setZone(zid); }
    };
    requestAnimationFrame(step);
  }

function makeTravelLayer(inner, W, H, fx, fy, tx, ty, fromKey, toKey, attr) {
    const layer = el('div', 'travel-layer', '');
    layer.innerHTML = `<svg style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:visible;pointer-events:none"><line x1="${fx}" y1="${fy}" x2="${tx}" y2="${ty}" stroke="rgba(240,240,234,0.8)" stroke-width="2.5" stroke-dasharray="10 8"/></svg><div class="travel-dot" style="left:${fx}px;top:${fy}px"></div>`;
    inner.appendChild(layer);
    // ⚠️ 闭环校正（这条线以前整体偏 136px、竖向还额外差 30px）：
    //    layer appendChild 到 inner 之后，定位基准是 inner 的**内边距盒**，而 inner 自己可能
    //    已经被平移/缩放 —— 按屏幕矩形直接放会重复计入一次偏移。
    //    所以不猜基准：先按 inner 的屏幕矩形放，再**实测**"线端点 vs 箭头尖"的差，整体补掉。
    const ib = inner.getBoundingClientRect();
    const lb = layer.getBoundingClientRect();
    layer.style.left = (parseFloat(layer.style.left || '0') + (ib.left - lb.left)) + 'px';
    layer.style.top = (parseFloat(layer.style.top || '0') + (ib.top - lb.top)) + 'px';
    const gTip = (key) => {
      if (!key) return null;
      const el2 = inner.querySelector('.map-arrow[data-' + (attr || 'scene') + '="' + key + '"]');
      const g = el2 && el2.querySelector('.arrow-glyph');
      if (!g) return null;
      const r = g.getBoundingClientRect();
      const up = (g.textContent || '').indexOf('▲') >= 0;
      return { x: r.left + r.width / 2, y: up ? r.top : r.bottom };
    };
    const pF = gTip(fromKey), pT = gTip(toKey);
    if (pF && pT) {
      const lb2 = layer.getBoundingClientRect();
      const svg = layer.querySelector('line');
      const lF = { x: lb2.left + parseFloat(svg.getAttribute('x1')), y: lb2.top + parseFloat(svg.getAttribute('y1')) };
      const lT = { x: lb2.left + parseFloat(svg.getAttribute('x2')), y: lb2.top + parseFloat(svg.getAttribute('y2')) };
      // 取两端偏差的平均做整体平移：这样线不会变形，只挪位置
      const ddx = ((pF.x - lF.x) + (pT.x - lT.x)) / 2, ddy = ((pF.y - lF.y) + (pT.y - lT.y)) / 2;
      if (Math.abs(ddx) > 0.5 || Math.abs(ddy) > 0.5) {
        layer.style.left = (parseFloat(layer.style.left) + ddx) + 'px';
        layer.style.top = (parseFloat(layer.style.top) + ddy) + 'px';
      }
    }
    return layer;
  }

function startTravel(target) {
    const st2 = S();
    if (deps.traveling) return;
    const chk = Game.canTravel(target);
    if (!chk.ok) { addLog(chk.reason, 'warn'); centerToast(chk.reason); return; }
    const cost = Game.travelCost(target);
    if (st2.stats.stamina < cost.energy) { addLog('你太累了，走不动这么远。休息一下。', 'warn'); centerToast('体力不够，走不动这么远。'); return; }
    if (target === st2.scene) { deps.view = 'scene'; render(); return; }
    // 亚特兰蒂斯（海底）的旅行动画走专门那套：它的区域坐标在 ATLANTIS_MAP_ARROWS 里，
    // 用第一章地图的 MAP_ARROWS 会取到 undefined → 行进线从画面左上角窜出来。
    if (st2.scene === 'atlantis' || target === 'atlantis') {
      if (target === 'atlantis') { Game.travel('atlantis'); return; }   // 上浮/下潜：直接切，不做区域动画
      startAtlantisTravel(target); return;
    }
    deps.traveling = true;
    deps.view = 'map';
    render();
    const inner = $('#map-arrows') || $('#map-wrap');   // 同上：行进线的起终点与箭头严格同一套坐标
    if (!inner) { deps.traveling = false; deps.view = 'scene'; Game.travel(target); return; }
    const W = Math.max(10, inner.clientWidth), H = Math.max(10, inner.clientHeight);
    const f = MAP_ARROWS[st2.scene], t = MAP_ARROWS[target];
    // 坐标查不到就跳过动画直接过去，绝不让行进线从 (0,0) 左上角乱跑
    if (!f || !t || typeof f.x !== 'number' || typeof t.x !== 'number') {
      deps.traveling = false; deps.view = 'scene'; Game.travel(target); return;
    }
    // 锚点用【箭头 glyph 的尖端】，按 data-scene 精确取——不用百分比估算，也不用坐标模糊匹配
    const box0 = inner.getBoundingClientRect();
    const pa = tipAnchor(inner, box0, st2.scene, 'scene'), pb = tipAnchor(inner, box0, target, 'scene');
    const fx = pa ? pa.x : f.x / 100 * W, fy = pa ? pa.y : f.y / 100 * H;
    const tx = pb ? pb.x : t.x / 100 * W, ty = pb ? pb.y : t.y / 100 * H;
    const dist = Math.hypot(tx - fx, ty - fy);
    const durMs = Math.round(Math.min(3000, Math.max(500, dist / Math.max(W, 1) * 3000)));
    beginTravelFx();
    const layer = makeTravelLayer(inner, W, H, fx, fy, tx, ty, st2.scene, target, 'scene');
    const dot = layer.querySelector('.travel-dot');
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / durMs);
      dot.style.left = (fx + (tx - fx) * p) + 'px';
      dot.style.top = (fy + (ty - fy) * p) + 'px';
      if (p < 1) requestAnimationFrame(step);
      else { deps.traveling = false; layer.remove(); endTravelFx(); deps.view = 'scene'; Game.travel(target); }
    };
    requestAnimationFrame(step);
  }
    return Object.freeze({diveGateThen,atlantisTravelAnim,zoneTravelAnim,startAtlantisTravel,beginTravelFx,endTravelFx,tipAnchor,animAtlantis,makeTravelLayer,startTravel});
  }
  return Object.freeze({create});
})();
