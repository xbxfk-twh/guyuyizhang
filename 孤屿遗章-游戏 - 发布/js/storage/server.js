/* 自有服务器仅做备用存档。身份由服务器验证Tap登录code；客户端不保存MiniApp Secret。 */
const ServerSaveStore=(()=>{
  const BASE='https://guyuyizhang.top:8443/backup/v1',KEY='guyuyizhang_server_session';
  function create({storage,getHost,fetcher=typeof fetch==='function'?fetch.bind(globalThis):null,timer=setTimeout,cancel=clearTimeout,timeout=6000}){
    let session=null,authTask=null,authenticated=false,fs,root='',version=null;
    function call(target,name,args){return new Promise((resolve,reject)=>{let done=false;const end=(ok,v)=>{if(done)return;done=true;cancel(t);ok?resolve(v||{}):reject(Error(v?.errMsg||v?.message||'备用存档连接失败'));};const t=timer(()=>end(false,{message:'备用存档连接超时'}),timeout);try{const r=target[name]({...args,success:v=>end(true,v),fail:e=>end(false,e)});if(r?.then)r.then(v=>end(true,v),e=>end(false,e));}catch(e){end(false,e);}});}
    async function request(path,method='GET',data,token){
      const headers={'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})};let status,result;
      const host=getHost();
      if(host?.request)try{const r=await call(host,'request',{url:BASE+path,method,header:headers,timeout,...(data?{data}:{})});status=r.statusCode;result=typeof r.data==='string'?JSON.parse(r.data):r.data;}catch(e){if(!fetcher)throw e;}
      if(status===undefined){if(!fetcher)throw Error('此环境不支持备用存档连接');const controller=new AbortController(),t=timer(()=>controller.abort(),timeout);try{const r=await fetcher(BASE+path,{method,headers,body:data?JSON.stringify(data):undefined,signal:controller.signal,credentials:'omit',cache:'no-store'});status=r.status;result=await r.json();}finally{cancel(t);}}
      if(status!==200||!result?.ok){if(status===401){session=null;authenticated=false;try{storage.removeItem(KEY);}catch(e){}}throw Object.assign(Error(result?.reason||'备用存档暂不可用'),{status});}
      return result;
    }
    const valid=s=>!!s&&/^[a-f0-9]{64}$/.test(s.token)&&Number.isFinite(s.expires)&&s.expires>Date.now()/1000+60;
    async function remember(s){session=s;try{storage.setItem(KEY,JSON.stringify(s));}catch(e){}if(fs)try{await call(fs,'writeFile',{filePath:root+'/guyu_backup_session.json',data:JSON.stringify(s),encoding:'utf8'});}catch(e){} }
    async function cached(){try{const s=JSON.parse(storage.getItem(KEY)||'null');if(valid(s))return s;}catch(e){}if(fs)try{const r=await call(fs,'readFile',{filePath:root+'/guyu_backup_session.json',encoding:'utf8'}),s=JSON.parse(r.data);if(valid(s))return s;}catch(e){}return null;}
    async function identity(force=false){
      if(force){session=null;authenticated=false;}
      if(authenticated&&valid(session))return session;
      if(authTask)return authTask;
      authTask=(async()=>{const previous=force?null:session||await cached(),host=getHost();
        try{if(!host?.login)throw Error('当前环境没有TapTap登录能力');const login=await call(host,'login',{timeout});if(typeof login.code!=='string'||!login.code)throw Error('TapTap没有返回登录凭证');const r=await request('/auth','POST',{code:login.code});if(!valid(r))throw Error('备用存档登录返回异常');await remember({token:r.token,expires:r.expires});authenticated=true;return session;}
        catch(e){if(e.status!==401&&valid(previous)){session=previous;authenticated=true;return session;}throw e;}
      })();try{return await authTask;}finally{authTask=null;}
    }
    async function load(){const s=await identity(),r=await request('/latest','GET',undefined,s.token);if(typeof r.found!=='boolean'||!Number.isSafeInteger(r.version)||r.version<0||r.found&&typeof r.body!=='string')throw Error('备用存档返回不完整');version=r.version;return r;}
    async function save(body){if(version===null)throw Error('备用存档尚未核对，未覆盖原记录');const s=await identity(),r=await request('/save','POST',{baseVersion:version,body},s.token);if(!Number.isSafeInteger(r.version)||r.version<1)throw Error('备用存档写入返回异常');version=r.version;return r;}
    return Object.freeze({load,save,authorize:identity,setFileSystem:(value,path)=>{fs=value;root=path;},supported:()=>!!getHost()?.login||!!session});
  }
  return Object.freeze({create});
})();
