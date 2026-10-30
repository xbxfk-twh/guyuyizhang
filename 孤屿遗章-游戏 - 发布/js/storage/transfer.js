/* 手动迁移仅传输已校验的完整导出，不接触账号会话或自动云备份。 */
const TemporarySaveTransfer = (() => {
  const BASE='https://guyuyizhang.top:8443/backup/v1/transfer';
  function normalize(code){return String(code||'').normalize('NFKC').toUpperCase().replace(/[\s-]/g,'');}
  function isCode(code){return /^SAVE/.test(normalize(code));}
  function create({send,inspect,clock=Date.now}){
    async function request(path,payload){
      let result;try{result=await send(BASE+path,payload);}catch(e){throw Error('连接取档服务失败，请稍后重试；也可使用备份文件。');}
      if(result.status!==200||!result.data?.ok)throw Error(result.data?.reason||'取档服务暂不可用');
      if(!Number.isFinite(result.data.expiresAt)||result.data.expiresAt*1000<=clock())throw Error('取档码已过期，请重新生成');
      return result.data;
    }
    async function upload(body){
      if(!inspect(body).ok)throw Error('当前备份不完整，未上传');
      const r=await request('/create',{body});
      if(!/^SAVE-[2-9A-HJ-NP-Z]{4}(?:-[2-9A-HJ-NP-Z]{4}){3}$/.test(r.code||''))throw Error('取档码返回不完整，请重新生成');
      return r;
    }
    async function download(code){
      const normalized=normalize(code);
      if(!/^SAVE[2-9A-HJ-NP-Z]{16}$/.test(normalized))throw Error('请输入完整的临时取档码');
      const r=await request('/read',{code:normalized});
      if(typeof r.body!=='string'||!inspect(r.body).ok)throw Error('下载的存档未通过校验，原进度未改变');
      return r.body;
    }
    return Object.freeze({upload,download});
  }
  return Object.freeze({create,isCode});
})();
