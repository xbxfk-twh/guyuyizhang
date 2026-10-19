/* 本地读写、滚动备份与cookie恢复。迁移/业务通过显式适配器提供。 */
const SaveRepository = (() => {
  const CK = { save: 'guyu_save', saveAt: 'guyu_saveAt', meta: 'guyu_meta', metaAt: 'guyu_metaAt' };
  function create({storage,cookies,getState,setState,getMeta,setMeta,isStaging,transactions,LOG_KEEP,validSave,normalizeState,migrateSaltMeta,migrateRedeemReceipts,onConflict,onFailure,push}) {
    function ckSet(k, v, days) {
      try { cookies.text = k + '=' + encodeURIComponent(v) + '; expires=' + new Date(Date.now() + days * 864e5).toUTCString() + '; path=/; SameSite=Lax'; } catch (e) {}
    }
    function ckGet(k) {
      try { const m = cookies.text.match(new RegExp('(?:^|;\\s*)' + k + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; } catch (e) { return null; }
    }
    function ckMirror(k, atKey, json) {
      if (!json || json.length > 3600) return false;   // 超长就不写，免得整个 cookie 被浏览器丢掉
      ckSet(k, json, 180); ckSet(atKey, String(Date.now()), 180);
      return true;
    }
    function save() {
      const S=getState();
      try {
        if (!transactions.active() && transactions.pending()) throw new Error('上次存储恢复尚未完成');
        const copy = JSON.parse(JSON.stringify(S));
        copy._snap = undefined;   // 不保存临时快照；持久化日出点在 dawnCheckpoint
        copy._dirty = undefined; copy._savedAt = undefined;   // 这两个只是运行时状态，不写进存档
        if (copy.log && copy.log.length > LOG_KEEP) copy.log.length = LOG_KEEP;   // 老存档也会在下次保存时瘦下来
        // ---- 存档加固 ①：多标签页/被后台恢复的旧页面不许用旧进度覆盖更新的存档 ----
        try {
          const revNow = parseInt(storage.getItem('guyuyizhang_rev') || '0', 10) || 0;
          if (revNow > (S._rev || 0)) {
            if (typeof onConflict === 'function') onConflict(revNow);
            return { ok:false, reason:'other-tab' };
          }
        } catch (e) {}
        const prev = storage.getItem('guyuyizhang_save');
        if (prev) storage.setItem('guyuyizhang_save_bak', prev);   // 滚动备份：始终保留上一份
        const json = JSON.stringify(copy);
        storage.setItem('guyuyizhang_save', json);
        // ---- 存档加固 ②：写完读回来验一遍，确认真的落盘了（配额满/被系统限制时会写不进去） ----
        const back = storage.getItem('guyuyizhang_save');
        if (back !== json) throw new Error('verify failed');
        S._rev = (S._rev || 0) + 1;
        try { storage.setItem('guyuyizhang_rev', String(S._rev)); } catch (e) {}
        // ---- 存档加固 ③：留一份"上次保存时间"，面板里能看到，别再无声无息 ----
        try { storage.setItem('guyuyizhang_savedAt', String(Date.now())); } catch (e) {}
        S._savedAt = Date.now(); S._dirty = false;
        if (!transactions.active()) ckMirror(CK.save, CK.saveAt, json);
        try { if (!transactions.active()) push(); } catch (e) {}
        return { ok:true, size: json.length };
      } catch (e) {
        console.warn('save failed', e);
        if (typeof onFailure === 'function') onFailure(e);
        return { ok:false, reason:(e && e.name) || 'error' };
      }
    }
    function load(loadRetried = false) {
      const previousS = getState();
      try {
        let raw = storage.getItem('guyuyizhang_save');
        // —— cookie 兜底①：localStorage 被清空（平台清缓存/WebView 换存储）时用 cookie 里那份 ——
        const ckRaw = loadRetried ? null : ckGet(CK.save);
        // 本地主档只要完整，就以它为准。cookie 的时间戳可能因设备时钟变化而更晚，
        // 不能让一份旧镜像无提示地覆盖玩家数十天的进度。
        if (raw) {
          const original = raw;
          try { if (!validSave(JSON.parse(raw))) raw = null; } catch (e) { raw = null; }
          if (!raw) try { storage.setItem('guyuyizhang_save_corrupt', original); } catch (e) {}
        }
        // 主档损坏时，先试本地滚动备份；它通常只差一次保存，比可能滞后的 cookie 更可靠。
        if (!raw) {
          const bak = storage.getItem('guyuyizhang_save_bak');
          if (bak) try { if (validSave(JSON.parse(bak))) raw = bak; } catch (e) {}
        }
        if (!raw && ckRaw) {
          try { if (validSave(JSON.parse(ckRaw))) raw = ckRaw; } catch (e) {}
        }
        if (raw && raw !== storage.getItem('guyuyizhang_save')) try { storage.setItem('guyuyizhang_save', raw); } catch (e) {}
        if (!raw) return false;
        setState(JSON.parse(raw));
        const S=getState();
        if (!validSave(S)) throw new Error('bad save');
        normalizeState();
        S._rev = (() => { try { return parseInt(storage.getItem('guyuyizhang_rev') || '0', 10) || 0; } catch (e) { return 0; } })();
        return true;
      } catch(e) {
        console.warn('load failed, try backup', e);
        // 主档解析失败时把原始串留底，别让后面的保存把它冲掉
        try { const broken = storage.getItem('guyuyizhang_save'); if (broken) storage.setItem('guyuyizhang_save_corrupt', broken); } catch (e0) {}
        // 主档坏了 → 把 _bak 挪到主档位，再把**整条正常读档流程重走一遍**：这样救回来的这份能拿到
        // 和正常读档完全一样的待遇（补字段 / 技能迁移 / 耐久对齐 / 对齐存档版本号）。
        // ⚠️ 以前这里只 JSON.parse(bak) 就 return true，S._rev 是空的 → 之后每一次 save() 都会被
        //    "另一个标签页有更新进度"那道守卫拒掉，玩家看到的就是"进度存不进去 / 覆盖不上"。
        // 只重试一次，免得 _bak 也坏掉时反复递归。
        if (!loadRetried) {
          loadRetried = true;
          try {
            const bak = storage.getItem('guyuyizhang_save_bak');
            if (bak) { storage.setItem('guyuyizhang_save', bak); const ok=load(true); if(!ok)setState(previousS); return ok; }
          } catch (e2) {}
        }
        setState(previousS); return false;
      }
    }
    // 主档不在时也要看 cookie 里那份（平台清 localStorage 后靠它救回来）
    function hasSave() { try { return !!(storage.getItem('guyuyizhang_save') || ckGet(CK.save)); } catch(e){ return false; } }

    function metaLoad() {
      let M;
      const read = (k) => { try { const raw = storage.getItem(k); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } };
      let rawPrimary = null;
      try { rawPrimary = storage.getItem('guyuyizhang_meta'); } catch (e) {}
      M = read('guyuyizhang_meta');
      if (!M && rawPrimary) {
        try { storage.setItem('guyuyizhang_meta_corrupt', rawPrimary); } catch (_) {}
      }
      // 本地滚动备份比可能滞后的 cookie 更可靠，主档损坏时优先使用。
      if (!M) M = read('guyuyizhang_meta_bak');
      // cookie 兜底：平台清掉 localStorage 后，账号数据（魂点 / 历代遗章 / 图鉴）靠这一份救回来
      if (!M) {
        const ckMeta = ckGet(CK.meta);
        if (ckMeta) {
          try { M = JSON.parse(ckMeta); } catch (e) { M = null; }
          if (M) { try { storage.setItem('guyuyizhang_meta', ckMeta); } catch (e) {} }
        }
      }
      if (!M && rawPrimary) {   // 主档坏了：先把原始串留底，别让它被后面的写入覆盖掉
        try { storage.setItem('guyuyizhang_meta_corrupt', rawPrimary); } catch (e) {}
      }
      if (!M) {
        M = read('guyuyizhang_meta_bak');   // 主档读不出来（换包/写入中断）时用备份
        if (M) { try { console.warn('meta 主档损坏，已从备份恢复'); } catch (e) {} }
      }
      if (!M) {
        M = {};
      }
      if (M.soul === undefined) M.soul = 0;
      if (!M.nodes) M.nodes = {};
      if (M.runs === undefined) M.runs = 0;
      if (M.totalSoul === undefined) M.totalSoul = 0;
      if (!(M.backupPoints >= 0)) M.backupPoints = 3;
      if (!Array.isArray(M.slots)) M.slots = [null, null, null];
      while (M.slots.length < 3) M.slots.push(null);
      if (M.slots.length >= 4) M.extraSlotUnlocked = 1;
      if (M.extraSlotUnlocked && M.slots.length < 4) M.slots.push(null);
      if (!M.seenMon) M.seenMon = {};
      if (!M.seenItems) M.seenItems = {};
      if (!M.mailbox) M.mailbox = [];
      if (!M.redeemed) M.redeemed = {};
      if (!M.ach) M.ach = {};
      if (!M.settledRuns || typeof M.settledRuns !== 'object') M.settledRuns = {};
      setMeta(M);
      migrateSaltMeta(M);
      migrateRedeemReceipts(M);
      return M;
    }
    function metaSave() {
      const M=getMeta();
      if (isStaging()) return {ok:true};
      try {
        if (!transactions.active() && transactions.pending()) throw new Error('上次存储恢复尚未完成');
        const prev = storage.getItem('guyuyizhang_meta');
        if (prev) storage.setItem('guyuyizhang_meta_bak', prev);   // 滚动备份：永远留下上一份
        const json = JSON.stringify(M);
        storage.setItem('guyuyizhang_meta', json);
        if (storage.getItem('guyuyizhang_meta') !== json) throw new Error('账号数据写入校验失败');
        if (!transactions.active()) ckMirror(CK.meta, CK.metaAt, json);
        try { if (!transactions.active()) push(); } catch (e) {}
        return {ok:true};
      } catch (e) {
        if (!transactions.active() && typeof onFailure === 'function') onFailure(e);
        return {ok:false, reason:(e && e.name) || 'error'};
      }
    }
    function metaReload() { setMeta(null); return metaLoad(); }   // 强制重新读盘（导入存档码 / 自检用）
    return Object.freeze({save,load,hasSave,metaLoad,metaSave,metaReload,cookieGet:ckGet,mirror:ckMirror});
  }
  return Object.freeze({create,keys:Object.freeze(CK)});
})();
