/* 通知只记录已读位置；查询不写档，不改变游戏进度。 */
const NotificationRules = (() => {
  const TABS = ['tool','items','mon','boss','ach'];
  function known(meta, run, tab) {
    const seen = {...meta.seenItems,...run?.seen};
    if (tab === 'ach') return Object.keys(meta.ach || {}).filter(id => meta.ach[id]);
    if (tab === 'mon' || tab === 'boss') return Object.keys(ENEMIES).filter(id => !ENEMIES[id].noDex && (!ENEMIES[id].nightmare || ['nightmare','dev'].includes(run?.difficulty)) &&
      (tab !== 'boss' || ENEMIES[id].boss) && (meta.seenMon?.[id] || run?.seen?.['mon_'+id]));
    return Object.keys(ITEMS).filter(id => !ITEMS[id].retired && seen[id] &&
      (tab === 'items' || ['weapon','tool','armor','cloth'].includes(ITEMS[id].cat)));
  }
  function migrate(meta) {
    // 安装前已经收录的图鉴作为已读起点；新解锁才提醒。
    if (!meta.noticeRead || typeof meta.noticeRead !== 'object' || Array.isArray(meta.noticeRead)) {
      meta.noticeRead = {collection:Object.fromEntries(TABS.map(tab => [tab,known(meta,{difficulty:'dev'},tab)]))};
    }
  }
  function create({getMeta,getRun,persistPair,dailySignState,dailyGiftState,mailboxCount}) {
    function state() {
      const m=getMeta(), s=getRun(), read=m.noticeRead || {}, col={};
      for (const tab of TABS) { const old=new Set(read.collection?.[tab] || []); col[tab]=known(m,s,tab).some(id=>!old.has(id)); }
      col.rec=false;
      const collection=Object.values(col).some(Boolean), mail=mailboxCount()>0, event=!read.apkDownload;
      const sign=dailySignState().canSign, adshop=dailyGiftState().canClaim;
      const diary=!!s && s.diary.length-Math.max(0,Number(s.diaryReadCount)||0)>=10;
      return {...col,collection,mail,event,mailbox:mail||event,sign,adshop,diary,menu:collection||mail||event||sign||adshop||diary};
    }
    function read(kind,tab) {
      const current=getRun(), m=JSON.parse(JSON.stringify(getMeta()));
      const s=current ? JSON.parse(JSON.stringify(current)) : null;
      migrate(m);
      if (kind==='diary' && s) s.diaryReadCount=s.diary.length;
      else if (kind==='collection' && TABS.includes(tab)) {
        m.noticeRead.collection=m.noticeRead.collection || {};
        m.noticeRead.collection[tab]=known(m,s,tab);
      } else if (kind==='event') m.noticeRead.apkDownload=true;
      else return {ok:true};
      // 重复打开已读页无需产生一笔存档事务。
      if (JSON.stringify(m)===JSON.stringify(getMeta()) && (!s || s.diaryReadCount===current.diaryReadCount)) return {ok:true};
      return persistPair(s,m,false);
    }
    return Object.freeze({state,read});
  }
  return Object.freeze({create,migrate});
})();
