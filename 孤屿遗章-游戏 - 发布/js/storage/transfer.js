/* 临时迁移传输完整校验内容；配额由服务器计时、原子结算。 */
const TemporarySaveTransfer = (() => {
  const BASE='https://guyuyizhang.top:8443/backup/v1/transfer';
  function newId(){const bytes=new Uint8Array(16);globalThis.crypto.getRandomValues(bytes);return Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');}
  function normalize(code){return String(code||'').normalize('NFKC').toUpperCase().replace(/[\s-]/g,'');}
  function isCode(code){return /^[A-Z0-9]{8}$/.test(normalize(code));}
  function create({send,inspect,owner,authorize=async()=>null,randomId=newId,clock=Date.now}){
    let pending=null;
    async function request(path,payload){
      let result;try{result=await send(BASE+path,payload);}catch(e){throw Error('连接取档服务失败，请稍后重试；也可使用备份文件。');}
      if(result.status!==200||!result.data?.ok)throw Object.assign(Error(result.data?.reason||'取件服务暂不可用'),{status:result.status});
      if(!Number.isFinite(result.data.expiresAt)||result.data.expiresAt*1000<=clock())throw Error('取件码已过期，请重新生成');
      return result.data;
    }
    async function upload(body){
      if(!inspect(body).ok)throw Error('当前备份不完整，未上传');
      const account=typeof owner==='function'?owner():owner;
      if(!/^[a-f0-9]{32}$/.test(account||''))throw Error('迁移身份未能保存，请重试');
      if(!pending||pending.body!==body||clock()-pending.at>=600000)pending={body,requestId:randomId(),at:clock()};
      let session;try{session=await authorize();}catch(e){} // Tap故障仍可使用本机应急迁移。
      let r;
      try { r=await request('/create',{body,requestId:pending.requestId,owner:account,format:'short8',...(session?.token?{session:session.token}:{})}); }
      catch(e){
        if(e.status===401&&session?.token){
          const fresh=await authorize(true);
          r=await request('/create',{body,requestId:pending.requestId,owner:account,format:'short8',session:fresh.token});
        }else{if(e.status===404)pending=null;throw e;}
      }
      if(!/^[A-Z0-9]{8}$/.test(r.code||''))throw Error('取件码返回不完整，请重新生成');
      pending=null;return r;
    }
    async function download(code){
      const normalized=normalize(code);
      if(!/^[A-Z0-9]{8}$/.test(normalized))throw Error('请输入8位字母和数字取件码');
      const r=await request('/read',{code:normalized});
      if(typeof r.body!=='string'||!inspect(r.body).ok)throw Error('下载的存档未通过校验，原进度未改变');
      return r.body;
    }
    return Object.freeze({upload,download});
  }
  return Object.freeze({create,isCode,newId});
})();
