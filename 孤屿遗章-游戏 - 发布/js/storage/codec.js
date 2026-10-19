/* 存档码的只读解析与完整性校验；不读写存储，不执行迁移或奖励。 */
const SaveCodec = (() => {
  function codeChecksum(data) {
    const text=JSON.stringify({v:data.v,t:data.t||'',meta:data.meta,save:data.save||null});
    let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return (hash>>>0).toString(16).padStart(8,'0');
  }
  function read(code,validSave) {
    const text=String(code||'').replace(/\s+/g,'');
    if(!text)return {ok:false,reason:'请先粘贴存档码'};
    if(/^https?:|^GY-/i.test(text) || text.startsWith('<'))return {ok:false,reason:'这是网址或兑换码，请使用「导出存档码」生成的备份。'};
    let data;try{data=JSON.parse(decodeURIComponent(escape(atob(text))));}catch(e){return {ok:false,reason:'存档码无法解析（可能复制不完整）；请重新复制整段或选择备份文件。'};}
    if(!data || !data.meta || typeof data.meta!=='object')return {ok:false,reason:'存档码内容不认识'};
    if(data.v!==undefined && data.v!==1)return {ok:false,reason:'存档格式版本不支持，请先更新游戏。'};
    if(data.checksum!==undefined && data.checksum!==codeChecksum(data))return {ok:false,reason:'存档完整性校验失败，未覆盖原档；请重新导出或使用另一份备份。'};
    if(Array.isArray(data.meta) || (data.meta.slots && (!Array.isArray(data.meta.slots)||![3,4].includes(data.meta.slots.length))))return {ok:false,reason:'账号数据格式不完整'};
    if(data.save && !validSave(data.save))return {ok:false,reason:'当前进度不完整，未覆盖原档'};
    return {ok:true,data};
  }
  function encode(payload){payload.checksum=codeChecksum(payload);return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));}
  return Object.freeze({checksum:codeChecksum,read,encode});
})();
