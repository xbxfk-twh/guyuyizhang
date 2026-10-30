/* camp：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const CampView = (() => {
  function create(deps) {
    const $=(...args)=>deps.$(...args);
    const S=(...args)=>deps.S(...args);
    const esc=(...args)=>deps.esc(...args);
    const centerToast=(...args)=>deps.centerToast(...args);
    const skinOn=(...args)=>deps.skinOn(...args);
    const render=(...args)=>deps.render(...args);
    const fitStage=(...args)=>deps.fitStage(...args);
    const atlantisCampModal=(...args)=>deps.atlantisCampModal(...args);
    const bedDesc=(...args)=>deps.bedDesc(...args);
    const showModal=(...args)=>deps.showModal(...args);
function campActions() {
    const st = S();
    const out = [];

    out.push({ label:'睡觉', cls:'sleep', desc: bedDesc(), fn:() => showModal('sleeppick') });
    out.push({ label:'休息 ' + deps.restHours + ' 小时', fn:() => Game.rest(deps.restHours), disabled: st.stats.stamina >= Game.maxStam(), reason:'体力充沛' });
    if (Game.laochaoAvailable()) out.push({ label:'与老潮交易', cls:'trade', desc:'商船停在南岸（22 点前）', fn:() => { deps.laoTab = 'buy'; showModal('laochao'); } });
    if (st.furniture.flag && !Game.laochaoAvailable() && !st.laochao.arrived) out.push({ label:'升起信号旗', desc:'消耗木材×5，商船明日必来', fn:() => Game.signalFlag() });
    if (st.buildings.watch === 0) out.push({ label:'建造一级瞭望台', cls:'build', desc:'木杆×8 · 木板×8 · 藤蔓×4 · 看清草地/荒漠/山洞', anim:{ t:'build', l:'建造一级瞭望台' }, fn:() => Game.buildChain('watch'), disabled: !matsOk(BUILDING_CHAINS.watch[1].mats), reason:'材料不足' });
    return out;
  }

function matsOk(mats) { for (const k in mats) if (Game.materialCount(k)<mats[k]) return false; return true; }

function renderCamp() {
    const st = S();
    showModal('camp');
  }

function renderCampHelp(mode) {
    const st = S() || {};
    let html = `<div class="modal-title">${mode === 'furn' ? '家具作用' : '建筑作用'}</div><div class="help-list camp-help-list">`;
    if (mode === 'furn') {
      // 作者 2026-09-23：家具位是新手最容易踩的坑 —— 帮助页先把规则讲清楚，再逐件标"占不占位"。
      // 判定统一走 Game.furnTakesSlot（和建造页标注、建造前弹窗**同一份规则**，不会三处说法不一致）。
      html += `<div class="help-item"><b>家具位</b><span>当前 ${Game.furnitureUsed()}/${Game.houseSlots()} 格。`
        + `多数家具占 1 格，满了就造不了新的——升级住所、或用营地的「扩建住处」都能 +1 格。</span><details class="furniture-slot-details"><summary>哪些家具不占位？</summary>`
        + `<b>不占位</b>的有：旗帜、路标、书架、水壶、滤雨器、织布机、药炉；`
        + `以及工具台 / 熔炉 / 烟熏炉 / 床的<b>升级替换</b>（往上升一级不额外占格）。</details></div>`;
      for (const f of [...FURNITURE].sort((a,b)=>Number(a.onlyDifficulty==='nightmare')-Number(b.onlyDifficulty==='nightmare'))) {
        // 身份专属家具也照常展示（养蜂人之外的玩家要能看到「蜂箱」是做什么的、为什么造不了），
        // 只是额外注明「当前身份不可造」，别让玩家以为哪里坏了。
        const isMine = !f.onlyIdentity || st.identity === f.onlyIdentity;
        const lockNote = (!isMine && f.onlyIdentity) ? ` <b style="color:#a8382a">（${(IDENTITIES[f.onlyIdentity]||{}).name||f.onlyIdentity}专属，当前身份不可造）</b>` : '';
        const slotNote = Game.furnTakesSlot(f.id) ? ' <b>（占 1 格）</b>' : ' <b>（不占家具位）</b>';
        html += `<div class="help-item"><b>${f.name}</b><span>${f.desc}${slotNote}${lockNote}</span></div>`;
      }
    } else {
      const bc = {
        house:['住所', c => `睡眠恢复 ${Math.round(c.rest*100)}% · 保暖 ${c.warm} · 家具位 ${c.slots}`],
        fire:['篝火', c => `可烹饪 · 保暖等级 ${c.warm}（升级提高保暖，不增加制作份数）`],
        storage:['储物', c => `仓库容量 ${c.cap} 格`],
        wall:['围墙', c => `营地防御 ${c.def} · 夜袭率 ${(c.raid*100).toFixed(c.raid<0.01?2:1)}%`],
        watch:['瞭望台', c => c.unlock ? `解锁：${c.unlock.map(u => ((SCENES.find(s=>s.id===u)||{}).name)||u).join('、')}` : '（地基）' + (c.weather12 ? ' · 预判12h天气' : '') + (c.weather24 ? ' · 预判24h天气' : '') + (c.info ? ' · 显示全岛情报' : '')],
        dock:['船坞', c => c.boat === 'none' ? '河边的小码头（未下水）' : (c.boat === 'raft' ? '木筏·近海' : c.boat === 'boat' ? '小船·对岸盐镇' : c.boat === 'ship' ? '大船·载货更多' : c.boat === 'ocean' ? '远洋船·结局A' : '')],
        farm:['耕地', c => `耕地田块 ${c.plots} 块`],
      };
      for (const [cid, [cname, eff]] of Object.entries(bc)) {
        const chain = BUILDING_CHAINS[cid];
        const tiers = chain.map(t => t.name).join(' → ');
        const tip = eff(chain[chain.length - 1]);
        const grow = chain.map(t => eff(t)).join(' ｜ ');
        html += `<div class="help-item"><b>${cname}（${tiers}）</b><span>最高：${tip}</span><div class="help-sub">逐级：${grow}</div></div>`;
      }
    }
    // 底部「关闭」去掉：右上角已经有 × 了（作者 2026-09-21 点名的是这个说明面板）
    html += '</div>';
    return html;
  }

const ROOM_FURNITURE_ATLAS = {
    wb1:0, wb2:1, wb3:1, fr1:2, fr2:3, fr3:3,
    bed1:4, bed2:5, bed3:6, bed4:6, floorRest:4, stove:7,
    rack:8, tannery:9, spin:10, loom:11,
    mortar:12, medPot:13, rainfilter:14, shelf:15,
    tailor:16, sm1:17, sm2:18, grindstone:19, beehive:20,
    treadmill:21, dumbbell:22, tank:23, flag:24, signpost:25,
  };

function roomFurniture(st) {
    const chains = [['wb1','wb2','wb3'],['fr1','fr2','fr3'],['sm1','sm2'],['bed1','bed2','bed3','bed4'],['tank','rainfilter']];
    const superseded = fid => { const chain = chains.find(c => c.includes(fid)); return chain && chain.slice(chain.indexOf(fid) + 1).some(id => st.furniture[id]); };
    const visible = FURNITURE.filter(f => !f.farmOnly && (!f.onlyDifficulty || f.onlyDifficulty===st.difficulty) && !['beehive','flag','signpost','cellar'].includes(f.id) && st.furniture[f.id] && !superseded(f.id)).sort((a,b)=>Number(a.onlyDifficulty==='nightmare')-Number(b.onlyDifficulty==='nightmare'));
    if (st.tailorGift === 1 && !st.furniture.tailor) visible.push(FURNITURE.find(f => f.id === 'tailor'));
    if (!visible.some(f => f.id.startsWith('bed'))) visible.push({ id:'floorRest', name:'铺地休息' });
    return visible;
  }

function roomAction(f) {
    if (f.id.startsWith('bed') || f.id === 'floorRest') return 'sleep';
    if (f.id === 'tank' || f.id === 'rainfilter') return 'water';
    if (f.id === 'treadmill') return 'train:run';
    if (f.id === 'dumbbell') return 'train:lift';
    if (f.id === 'nightmareExtractor') return 'nightmareInfusion';
    if (f.id === 'soulSeparator') return 'separator';
    if (f.id === 'grindstone') return 'grind';
    if (f.id === 'shelf') return 'bookFocus';
    if (f.id.startsWith('wb')) return 'craft:work1';
    if (f.id.startsWith('fr')) return 'craft:furn1';
    if (f.id.startsWith('sm')) return 'craft:fire:smoked';
    if (['spin','loom','tailor'].includes(f.id)) return 'craft:tailor';
    if (['medPot','mortar'].includes(f.id)) return 'craft:med';
    if (['rack','tannery'].includes(f.id)) return 'craft:furniture';
    if (f.id === 'stove') return 'craft:fire';
    if (f.id === 'flag') return 'flag';
    return `info:${f.id}`;
  }

function runRoomAction(value) {
    const [kind, arg, group] = value.split(':');
    if (kind === 'craft') { deps.craftTab = arg; deps.craftGroup = group || 'all'; showModal('craft'); }
    else if (kind === 'sleep') showModal('sleeppick');
    else if (kind === 'nightmareInfusion') showModal('nightmareInfusion');
    else if (kind === 'separator') showModal('separator');
    else if (kind === 'grind') showModal('grind');
    else if (kind === 'transferHelp')html='<div class="modal-title">仓库存取</div><p>轻点物品：向对面存入或取出1份。</p><p>长按物品，继续左右拖动选择数量，松开后确认批量存取。</p><div class="modal-actions"><button data-warehouse-open>返回仓库</button></div>';
    else if (kind === 'bookFocus') showModal('bookFocus');
    else if (kind === 'train') { const r = Game.train(arg); if (r && !r.ok && r.reason !== '等待确认') centerToast(r.reason); }
    else if (kind === 'water') { const r = Game.collectRainWater(); if (r && !r.ok) centerToast(r.reason); }
    else if (kind === 'flag') Game.signalFlag();
    else if (kind === 'info') { const f = FURNITURE.find(x => x.id === arg); showModal('overlay', {title:f ? f.name : '家具', text:f ? f.desc : '这件家具已经在房间里。', choices:[{label:'返回房间',ok:()=>{}}]}); }
  }

let roomPlacing=false;

function renderRoomScene(st) {
    const main = $('#main');
    const house = BUILDING_CHAINS.house[st.buildings.house] || BUILDING_CHAINS.house[0];
    const roomStyle = st.buildings.house === 0 ? 'tent' : st.buildings.house === 3 ? 'stone' : 'wood';
    const src = `assets/img/map-pack/interior/room-${roomStyle}.webp`;
    // 家具沿四面墙落位：中央约 30%~70% × 35%~65% 留成活动区，门前也不放东西。
    // 百分比坐标跟着房间底图缩放，旧档已有的家具也会自然落到对应位置。
    const roomPlaces = {
      wb1:[17,17], wb2:[17,17], wb3:[17,17],
      tailor:[30,16], spin:[10,47], loom:[46,83],
      fr1:[44,16], fr2:[44,16], fr3:[44,16],
      sm1:[56,16], sm2:[56,16], stove:[69,16], rack:[9,68],
      bed1:[86,24], bed2:[86,24], bed3:[86,24], bed4:[86,24], floorRest:[86,24],
      tannery:[21,83], shelf:[34,83], grindstone:[57,83],
      mortar:[68,83], medPot:[77,83], soulSeparator:[5,30], nightmareExtractor:[48,48],
      tank:[89,84], rainfilter:[89,84],
      treadmill:[89,64], dumbbell:[76,64],
    };
    const sparePlaces = [[10,37],[90,48],[27,78],[72,20],[90,68],[40,20]];
    const furniture = roomFurniture(st);
    let spareIndex = 0;
    const sprites = furniture.map(f => {
      const saved=st.roomLayout?.[f.id];
      const pos = Array.isArray(saved)&&saved.length===2?saved:roomPlaces[f.id] || sparePlaces[(spareIndex++) % sparePlaces.length];
      const baseSize = f.id === 'soulSeparator' ? 70 : f.id.startsWith('bed') || f.id === 'floorRest' ? 190
        : f.id.startsWith('wb') ? 148
        : ['tailor','loom','treadmill'].includes(f.id) ? 130
        : /^(fr|sm)/.test(f.id) || f.id === 'stove' ? 110
        : ['rack','tannery','spin','shelf'].includes(f.id) ? 112
        : ['tank','rainfilter'].includes(f.id) ? 96
        : ['mortar','medPot','grindstone','flag','signpost'].includes(f.id) ? 82 : 100;
      const desktopScale = Math.min(2, Math.max(1, (main ? main.clientWidth : 1200) / 1200));
      const densityScale = main && main.clientWidth >= 1100 ? 1 : furniture.length > 10 ? 0.82 : furniture.length > 6 ? 0.9 : 1;
      const size = Math.round(baseSize * densityScale * desktopScale);
      const atlas = ROOM_FURNITURE_ATLAS[f.id];
      const icon = f.id==='nightmareExtractor' ? '<svg class="room-furn-image" viewBox="0 0 100 110" aria-hidden="true"><g fill="#37352e" stroke="#d2cdbd" stroke-width="1.5"><path d="M18 91 50 76 84 91 50 106Z M25 89V35L35 25V85 M75 89V35L65 25V85 M18 38 50 17 82 38 50 53Z M35 36 50 27 65 36 50 45Z"/><ellipse cx="50" cy="83" rx="22" ry="9"/><path d="M42 79Q24 58 48 51Q62 60 54 73Q75 56 55 48Q83 63 61 81Z" fill="#ece8da" stroke="#39372d"/><path d="M15 39 15 80 M85 39 85 80 M20 49 30 53 M70 53 80 49 M20 60 30 64 M70 64 80 60"/></g></svg>' : f.id==='soulSeparator' ? '<img class="room-furn-image" src="assets/img/build/soulSeparator.png" alt="">' : atlas === undefined ? `<span class="room-furn-glyph">${esc(f.name.slice(0,1))}</span>`
        : `<span class="room-furn-icon${atlas >= 16 ? ' second' : ''}${skinOn('seasons') ? ' colored' : ''}" style="background-position:${(atlas % 4) * 100 / 3}% ${Math.floor((atlas % 16) / 4) * 100 / 3}%"></span>`;
      return `<button class="room-sprite" data-furniture="${f.id}" data-roomact="${roomAction(f)}" title="${esc(f.name)}" aria-label="使用${esc(f.name)}" style="left:${pos[0]}%;top:${pos[1]}%;--sprite-size:${size}px">${icon}</button>`;
    }).join('');
    let stage = main.querySelector('.room-stage');
    if (!stage || stage.dataset.roomStyle !== roomStyle) {
      deps.dom.dispose(main);main.innerHTML = `<div id="scene-wrap" class="stage room-stage" data-room-style="${roomStyle}"><div id="stage-inner"><img id="scene-img" class="room-scene-art" src="${src}" alt="${esc(house.name)}室内" draggable="false"><div id="hotspots" class="ready"></div><div id="camp-buildings"></div></div><div id="scene-name"></div></div>`;
      stage = main.querySelector('.room-stage');
      fitStage();
    }
    const hotspots = stage.querySelector('#hotspots');
    if (hotspots.dataset.sprites !== sprites) {
      deps.dom.html(hotspots,`${sprites}<button id="room-exit" title="返回营地" aria-label="返回营地" type="button">⌂ 出门</button>`);
      hotspots.dataset.sprites = sprites;
      hotspots.querySelectorAll('.room-sprite').forEach(b=>b.onclick=()=>runRoomAction(b.dataset.roomact));

      hotspots.querySelector('#room-reset')?.addEventListener('click',()=>{S().roomLayout={};Game.save();delete hotspots.dataset.sprites;renderRoomScene(S());});
      for(const sprite of hotspots.querySelectorAll('[data-furniture]')) {
        if(!roomPlacing)continue;
        sprite.onclick=e=>{e.stopPropagation();};let drag=null;
        sprite.onpointerdown=e=>{e.preventDefault();e.stopPropagation();const r=hotspots.getBoundingClientRect();drag={r};sprite.setPointerCapture(e.pointerId);};
        sprite.onpointermove=e=>{if(!drag)return;const r=drag.r,marginX=(sprite.offsetWidth/2+5)/r.width*100,marginY=(sprite.offsetHeight/2+5)/r.height*100;const x=Math.max(marginX,Math.min(100-marginX,(e.clientX-r.left)/r.width*100)),y=Math.max(marginY,Math.min(85-marginY,(e.clientY-r.top)/r.height*100));sprite.style.left=x+'%';sprite.style.top=y+'%';S().roomLayout=S().roomLayout || {};S().roomLayout[sprite.dataset.furniture]=[x,y];};
        sprite.onpointerup=e=>{if(drag){drag=null;Game.save();try{sprite.releasePointerCapture(e.pointerId);}catch{}}};sprite.onpointercancel=()=>{drag=null;};
      }
      hotspots.querySelector('#room-exit').onclick = () => { deps.roomView = false; roomPlacing=false;render(); };
    }
    const nameEl = stage.querySelector('#scene-name');
    const roomName = `${house.name} · 室内`;
    if (nameEl.textContent !== roomName) nameEl.textContent = roomName;
    deps.lastSceneKey = 'room|' + roomStyle;
  }

function campModal(selected) {
    if (S().scene === 'atlantis') return atlantisCampModal();
    const st = S();
    const chains = [
      ['house','住所'], ['fire','篝火'], ['storage','储物'], ['wall','围墙'], ['watch','瞭望台'], ['dock','船坞'], ['farm','耕地'], ['cellar','地窖'],
    ];
    let html = '<div class="modal-title">营地建造 <button class="helpbtn" data-help="build">?</button></div>';
    html += '<div class="'+(selected?'camp-building-detail':'camp-building-buttons')+'">';
    for (const [cid, cname] of chains) {
      const chain = BUILDING_CHAINS[cid];
      const cur = st.buildings[cid];
      const next = chain[cur + 1];
      if(selected && selected!==cid)continue;
      if(!selected){
        const ext=cid==='house' && (st.houseExt||0)<Game.houseExtMax()?Game.houseExtMats((st.houseExt||0)+1):cid==='storage' && (st.storeExt||0)<Game.storeExtMax()?Game.storeExtMats((st.storeExt||0)+1):null;
        const ready=!!((next&&matsOk(next.mats))||(ext&&matsOk(ext)));
        html+=`<button class="camp-building-button ${ready?'materials-ready':''}" data-building-detail="${cid}"><b>${cname}</b><span>${cur<0?'尚未建造':chain[cur].name}</span></button>`;
        continue;
      }
      let extra = '';
      if (cid === 'house') {
        const hExt = st.houseExt || 0, hMax = Game.houseExtMax();
        if (hExt < hMax) {
          const emats = Game.houseExtMats(hExt + 1);
          const okE = matsOk(emats);
          const rsn = okE ? '' : missingReason(emats, '');
          extra = `<div class="build-next">→ 扩建住处（${hExt + 1}/${hMax}）<span class="mats">${matsStr(emats)}</span><button class="mini-btn ${okE ? '' : 'lockedb'}" data-hsext="1" ${rsn ? `data-reason="${esc(rsn)}"` : ''}>扩建</button></div>`;
        } else {
          extra = '<div class="hint">扩建已达上限</div>';
        }
      }
      if(cid==='cellar'&&cur>=0)extra='<div class="hint">20格食物储藏 · 腐坏速度降至三分之一</div><button class="mini-btn" data-cellar-open>存取食物</button>';
      if (cid === 'storage') {
        const sExt = st.storeExt || 0, sMax = Game.storeExtMax();
        if (sExt < sMax) {
          const emats = Game.storeExtMats(sExt + 1);
          const okS = matsOk(emats);
          const rsnS = okS ? '' : missingReason(emats, '');
          extra = `<div class="build-next">→ 扩建仓库（${sExt + 1}/${sMax}）<span class="mats">${matsStr(emats)}</span><button class="mini-btn ${okS ? '' : 'lockedb'}" data-stext="1" ${rsnS ? `data-reason="${esc(rsnS)}"` : ''}>扩建（容量+${Game.storeExtCap()}）</button></div>`;
        } else {
          extra = '<div class="hint">扩建已达上限</div>';
        }
      }
      html += `<div class="camp-col"><div class="camp-col-title">${cname}</div>
        <div class="camp-cur">${cur < 0 ? '尚未建造' : chain[cur].name}</div>
        <p class="hint">${esc((next||chain[cur]||{}).desc||({house:'居住与恢复，升级住所可增加家具位。',fire:'烹饪食物，升级改善营地生活。',storage:'存放物品，升级与扩建增加容量。',wall:'保护营地，减少袭击损失。',watch:'观察周围环境与危险。',dock:'造船与出海探索。',farm:'开垦耕地，种植作物。',cellar:'储存20格食物，腐坏速度降至三分之一。'}[cid]))}</p>${next ? buildBtn(cid, next) : '<div class="hint">已满级</div>'}${extra}</div>`;
    }
    if(selected)return html+'</div><div class="modal-actions"><button data-camp-back>返回营地建造</button></div>';
    html += '</div><div class="modal-title" style="margin-top:12px">家具（家具位 ' + furnitureCount() + '/' + Game.furnSlotInfo().cap + '） <button class="helpbtn" data-help="furn">?</button></div><div class="furn-grid">';
    const CHAINS = [['wb1','wb2','wb3'],['fr1','fr2','fr3'],['sm1','sm2'],['bed1','bed2','bed3','bed4'],['tank','rainfilter']];
    const superseded = (fid) => { const ch = CHAINS.find(c => c.includes(fid)); if (!ch) return false; const idx = ch.indexOf(fid); for (let j = idx + 1; j < ch.length; j++) if (st.furniture[ch[j]]) return true; return false; };
    for (const f of [...FURNITURE].sort((a,b)=>Number(a.onlyDifficulty==='nightmare')-Number(b.onlyDifficulty==='nightmare'))) {
      // 鸡舍/羊圈已经搬到农田（作者 2026-09-25）：营地的家具列表不再列它们，
      // 想去建/去管理 → 农田场景的「农场管理」。老存档里已建好的也照样在那边管。
      if (f.farmOnly) continue;
      if (f.onlyDifficulty && st.difficulty!==f.onlyDifficulty) continue;
      if (superseded(f.id)) continue;   // 已被更高一级替代，隐藏
      if (f.onlyIdentity && st.identity !== f.onlyIdentity) continue;   // 身份专属家具（例：养蜂人的蜂箱）
      // 裁缝台若来自旧档赠送（S.tailorGift=1）：显示"已可用（附赠）"，不显示拆除按钮、也不允许重复建造
      const gifted = f.id === 'tailor' && Game.tailorGifted() && !st.furniture.tailor;
      const built = !!st.furniture[f.id];
      if (gifted) {
        html += `<div class="furn built">✔ ${f.name}<span class="hint">旧工坊附赠，无须重造（不占家具位）</span></div>`;
        continue;
      }
      if (built) {
        // 作者 2026-09-24："鸡舍跟羊圈名字怎么看不见" —— 以前这两件把名字塞进「管理」按钮里，
        // 结果卡片上只剩一个 ✔ 和两个按钮，看不出这是鸡舍还是羊圈。现在**名字照常当标题**，
        // 「管理 / 拆除」退到按钮行。
        const live = (f.id === 'coop' || f.id === 'pen') ? (() => { const i = Game.liveInfo(f.id); return `（${i.count}/${i.cap}）`; })() : '';
        html += `<div class="furn built"><span class="furn-name">✔ ${f.name}${live}</span>`
          + ((f.id === 'coop' || f.id === 'pen') ? `<button class="mini-btn" data-live="${f.id}">管理</button>` : '')
          + (f.id === 'rainfilter' ? `<span class="hint">储水 ${Math.max(0, Number(st.rainWater) || 0)}/20</span><button class="mini-btn" data-collectrain="1">取水</button>` : '')
          + (f.id === 'nightmareExtractor' ? `<button class="mini-btn" data-infusion-open="1">汲取魂魄</button>` : '')
          + (f.id === 'soulSeparator' ? `<button class="mini-btn" data-separator-open="1">分解魂魄</button>` : '')
          + (f.id === 'shelf' ? `<button class="mini-btn" data-book-open>选择集中</button>` : '')
          + (f.id === 'cellar' ? `<button class="mini-btn" data-cellar-open>存取食物</button>` : '')
          + (f.id === 'beehive' ? `<span class="hint">蜂蜜 ${Math.max(0, Number(st.hiveHoney) || 0)}/12</span><button class="mini-btn" data-collecthoney="1">收蜜</button>` : '')
          + (f.id === 'treadmill' || f.id === 'dumbbell' ? `<span class="hint">已练 ${Math.min(16, Number(st.training && st.training[f.id === 'treadmill' ? 'run' : 'lift']) || 0)}/16 次；每日限一器材，每次 6 小时</span><button class="mini-btn" data-train="${f.id === 'treadmill' ? 'run' : 'lift'}">锻炼</button>` : '')
          + `<button class="mini-btn demolish" data-demolish="${f.id}">拆除</button></div>`;
        continue;
      }
      const canShow = !f.needPrev || st.furniture[f.needPrev];
      if (!canShow) continue;
      const buildCheck = Game.canBuildFurniture(f.id);
      const okF = buildCheck.ok;
      const reason = buildCheck.reason;
      // 作者 2026-09-23："家具有的是不占用家具格的……建议直接在建造的页面就标注"。
      // 所以两种都标出来，玩家不用去翻帮助页：占位的写「占 1 格」，不占的写「不占位」。
      const si = Game.furnSlotInfo(f.id);
      const slotTag = si.takes
        ? `<span class="slot-tag takes" title="打造后会占用 1 格家具空间">占 1 格</span>`
        : `<span class="slot-tag free" title="这件不占用家具空间">不占位</span>`;
      html += `<div class="furn"><span class="furn-name">${f.name}${slotTag}</span><span class="furn-mats">${matsStr(f.mats)}</span>${!okF ? `<span class="hint furn-requirements">${buildCheck.reasons.map(esc).join('<br>')}</span>` : ''}
        <button class="mini-btn ${okF ? '' : 'lockedb'}" data-fid="${f.id}" ${reason ? `data-reason="${esc(reason)}"` : ''}>建造(${(f.time/60).toFixed(1)}h)</button></div>`;
    }
    // 底部的「关闭」按钮去掉：右上角已经有 × 了，白占一行高度（作者 2026-09-21）。
    html += '</div>';
    return html;
  }

function missingReason(mats, extra) {
    const miss = [];
    for (const k in mats) if (Game.materialCount(k)<mats[k]) miss.push(`${ITEMS[k].name} ${Game.materialCount(k)}/${mats[k]}`);
    let s = miss.length ? `材料不足：${miss.join('、')}` : '';
    if (extra) s += (s ? '；' : '') + extra;
    return s;
  }

function buildBtn(cid, next) {
    const ok = matsOk(next.mats) && (!next.needBp || Game.knowsBlueprint(next.needBp));
    const reason = ok ? '' : missingReason(next.mats, (next.needBp && !Game.knowsBlueprint(next.needBp)) ? `需要图纸：${ITEMS[next.needBp].name}` : '');
    const extra = next.needBp ? ` · 需${ITEMS[next.needBp].name}` : '';
    return `<div class="build-next">→ ${next.name}<span class="mats">${matsStr(next.mats)}${extra}</span>
      <button class="mini-btn ${ok ? '' : 'lockedb'}" data-chain="${cid}" ${reason ? `data-reason="${esc(reason)}"` : ''}>建造(${(next.time/60).toFixed(1)}h)</button></div>`;
  }

function matsStr(mats) {
    return Object.entries(mats).map(([k, v]) => {
      const have = Game.materialCount(k);
      const it = ITEMS[k] || {};
      const nm = it.name || k;
      const enough = have >= v;
      return `${nm} ${enough ? have : `<b class="lack">${have}</b>`}/${v}`;
    }).join(' · ');
  }

function furnitureCount() { return Game.furnitureUsed(); }
    return Object.freeze({campActions,matsOk,renderCamp,renderCampHelp,roomFurniture,roomAction,runRoomAction,renderRoomScene,campModal,missingReason,buildBtn,matsStr,furnitureCount});
  }
  return Object.freeze({create});
})();
