/* TapTap持久文件与云备份。只在启动完成读取后开放写入；不把网络失败当作空账号。 */
const PlatformSaveStore = (() => {
  const KEYS=['guyuyizhang_save','guyuyizhang_save_bak','guyuyizhang_meta','guyuyizhang_meta_bak','guyuyizhang_rev','guyuyizhang_savedAt','guyuyizhang_rescue','guyuyizhang_write_journal','guyuyizhang_alternate_save'];
  const ARCHIVE='guyuyizhang_main',IMPORT='guyuyizhang_platform_import',LOCAL_ONLY='guyuyizhang_local_mode';
  const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const bytes=s=>new TextEncoder().encode(s).byteLength;
  function hash(s){let n=2166136261;for(let i=0;i<s.length;i++)n=Math.imul(n^s.charCodeAt(i),16777619);return (n>>>0).toString(16);}
  function create({storage,getHost,fallback=null,platformHint=false,clock=Date.now,timer=setTimeout,cancel=clearTimeout,timeout=8000}){
    let ready=false,initTask,fs,cloud,root='',validate,remote,listed=false,acceptedRemote='',acceptedServer='',conflict=null,seq=0,lastSlot=-1,localAvailable=false,localOnly=false,deviceVerified=false;
    let queue,writing=null,writeTimer,cloudTimer,busy=false,lastUpload=0,uploaded='',lastLocal=0,notice='本地存档',cloudError='',fileError='';
    const parse=s=>{try{return JSON.parse(s);}catch(e){return null;}};
    const runOf=k=>{for(const key of ['guyuyizhang_save','guyuyizhang_save_bak']){const r=parse(k[key]);if(validate(r))return r;}return null;};
    const metaOf=k=>{for(const key of ['guyuyizhang_meta','guyuyizhang_meta_bak']){const m=parse(k[key]);if(object(m))return m;}return null;};
    const meaningful=k=>!!runOf(k)||(()=>{const m=metaOf(k);return !!m&&(m.runs>0||m.soul>0||(m.slots||[]).some(Boolean)||Object.keys(m.nodes||{}).length>0);})();
    function needsChoice(local,other){const a=runOf(local),b=runOf(other),am=metaOf(local),bm=metaOf(other);return !!(bm&&(!am||(bm._accountRev||0)>(am._accountRev||0)))||!!(b&&other.guyuyizhang_save!==local.guyuyizhang_save&&(!(a?._runId&&a._runId===b._runId)||(b._rev||0)>(a._rev||0)));}
    function capture(){const k={};for(const key of KEYS)k[key]=storage.getItem(key);return k;}
    function safeLocal(){const k=capture();if(k.guyuyizhang_write_journal)return false;const hasRun=!!(k.guyuyizhang_save||k.guyuyizhang_save_bak),hasMeta=!!(k.guyuyizhang_meta||k.guyuyizhang_meta_bak);return (!hasRun||!!runOf(k))&&(!hasMeta||!!metaOf(k))&&(!hasRun||!!metaOf(k));}
    function validKeys(k){return object(k)&&!k.guyuyizhang_write_journal&&KEYS.every(key=>k[key]===undefined||k[key]===null||typeof k[key]==='string')&&!!metaOf(k)&&(!(k.guyuyizhang_save||k.guyuyizhang_save_bak)||!!runOf(k));}
    function encode(keys){const payload={format:'guyu-persistent-v1',seq:++seq,capturedAt:clock(),keys};const body=JSON.stringify(payload),result=JSON.stringify({payload,checksum:hash(body)});if(bytes(result)>10*1024*1024)throw Error('备份超过平台大小上限，请先导出存档。');return result;}
    function decode(text){
      if(typeof text!=='string'||text.length>10*1024*1024||bytes(text)>10*1024*1024)return null;
      const v=parse(text);if(!object(v))return null;
      if(v.payload?.format==='guyu-persistent-v1'){
        if(!Number.isSafeInteger(v.payload.seq)||v.payload.seq<0||v.checksum!==hash(JSON.stringify(v.payload))||!validKeys(v.payload.keys))return null;
        return v.payload;
      }
      // 读取历史Tap云档的save/meta字符串，也接受存档码载荷的对象形式。
      if(v.save!==undefined&&v.meta!==undefined){const keys={};keys.guyuyizhang_save=typeof v.save==='string'?v.save:JSON.stringify(v.save);keys.guyuyizhang_meta=typeof v.meta==='string'?v.meta:JSON.stringify(v.meta);keys.guyuyizhang_savedAt=String(v.savedAt||0);const run=parse(keys.guyuyizhang_save);keys.guyuyizhang_rev=String(run?._rev||0);if(validKeys(keys))return {seq:0,capturedAt:v.savedAt||0,keys};}
      return null;
    }
    function invoke(target,method,args){return new Promise((resolve,reject)=>{
      let done=false;const finish=(ok,value)=>{if(done)return;done=true;cancel(id);ok?resolve(value||{}):reject(Object.assign(new Error(value?.errMsg||value?.message||method+'失败'),value));};
      const id=timer(()=>finish(false,{errMsg:method+'超时'}),timeout);
      try{const r=target[method]({...args,success:v=>finish(true,v),fail:e=>finish(false,e)});if(r?.then)r.then(v=>finish(true,v),e=>finish(false,e));}catch(e){finish(false,e);}
    });}
    const read=p=>invoke(fs,'readFile',{filePath:p,encoding:'utf8'}).then(r=>r.data);
    const write=(p,data)=>invoke(fs,'writeFile',{filePath:p,data,encoding:'utf8'});
    async function optionalRead(path){try{return await read(path);}catch(e){if(Number(e.errno)===400101||/no such file|not exist|not found|ENOENT/i.test(e.message))return null;throw e;}}
    function restoreImport(){const raw=storage.getItem(IMPORT);if(!raw)return;const journal=parse(raw);if(!object(journal?.before))throw Error('存档恢复记录异常，请先导出原始备份。');for(const key of KEYS){const v=journal.before[key];if(v===null||v===undefined)storage.removeItem(key);else if(typeof v==='string')storage.setItem(key,v);else throw Error('存档恢复记录不完整。');}storage.removeItem(IMPORT);}
    function install(keys){
      const before=capture();storage.setItem(IMPORT,JSON.stringify({before}));
      try{for(const key of KEYS){const v=keys[key];if(v===null||v===undefined)storage.removeItem(key);else storage.setItem(key,v);}for(const key of KEYS)if(storage.getItem(key)!==(keys[key]??null))throw Error('恢复存档写入校验失败');storage.removeItem(IMPORT);}
      catch(e){try{restoreImport();}catch(_){}throw e;}
    }
    async function remoteRead(){
      listed=false;
      const response=await invoke(cloud,'getArchiveList',{});
      if(!Array.isArray(response.saves))throw Error('云存档列表不完整，请重新尝试。');
      const entries=response.saves.filter(a=>a.uuid&&a.fileId).sort((a,b)=>(Number(b.modifiedTime)||0)-(Number(a.modifiedTime)||0));
      if(entries.length!==response.saves.length)throw Error('云存档暂时无法读取，未创建空存档。');
      const preferred=entries.filter(a=>a.name===ARCHIVE),candidates=preferred.length?preferred:entries.slice(0,10);
      let found=null;
      for(const a of candidates){const r=await invoke(cloud,'getArchiveData',{archiveUUID:a.uuid,archiveFileId:a.fileId,targetFilePath:root+'/guyu_cloud_download.json'});const body=await read(r.filePath||root+'/guyu_cloud_download.json');const data=decode(body);if(data){found={...data,archive:a};break;}}
      if(entries.length&&!found)throw Error('云端记录未通过完整性检查，原记录已保留。');
      remote=found?.archive||null;listed=true;return found;
    }
    async function serverRead(){if(!fallback)throw Error('没有可用的服务器备用连接');const r=await fallback.load();if(!r.found)return null;const data=decode(r.body);if(!data)throw Error('服务器备用记录未通过完整性检查，原记录保留');return data;}
    async function initialize(validSave){
      if(ready)return {ok:true};if(initTask)return initTask;
      validate=validSave;
      initTask=(async()=>{
        localAvailable=false;deviceVerified=false;restoreImport();let host=getHost();
        if(platformHint){for(let n=0;n<30&&(!host?.getFileSystemManager||!host.env?.USER_DATA_PATH);n++){await new Promise(r=>timer(r,100));host=getHost();}if(!host?.getFileSystemManager||!host.env?.USER_DATA_PATH){localAvailable=safeLocal();throw Error('TapTap存档服务尚未就绪，可重试或选择本机模式。');}}
        let local=capture();
        if(!host?.getFileSystemManager||!host.env?.USER_DATA_PATH){ready=true;return {ok:true};}
        root=host.env.USER_DATA_PATH;
        try{fs=host.getFileSystemManager();if(typeof fs?.readFile!=='function'||typeof fs?.writeFile!=='function')throw Error('unsupported');}catch(e){fs=null;localAvailable=safeLocal();throw Error('设备存档接口暂不可用，可重试或选择本机模式。');}
        let cloudUnavailable=false;
        try{cloud=typeof host.getCloudSaveManager==='function'?host.getCloudSaveManager():null;}catch(e){cloud=null;cloudUnavailable=true;cloudError='云存档接口尚未就绪';}
        fallback?.setFileSystem?.(fs,root);
        const records=await Promise.all([0,1].map(async index=>{try{const text=await optionalRead(root+'/guyu_progress_'+index+'.json');return {index,data:decode(text),exists:!!text};}catch(e){return {index,error:e};}}));
        deviceVerified=records.every(r=>!r.error&&!(r.exists&&!r.data));
        const valid=records.filter(r=>r.data).sort((a,b)=>b.data.seq-a.data.seq);if(valid[0]){seq=valid[0].data.seq;lastSlot=valid[0].index;}
        if(storage.getItem(LOCAL_ONLY)==='1'){
          if(records.some(r=>r.error||r.exists&&!r.data)){fs=null;cloud=null;localAvailable=safeLocal();throw Error('设备备份暂不可读，可以保留原文件并继续本机模式。');}
          if(valid[0]&&needsChoice(local,valid[0].data.keys)){
            const other=valid[0].data.keys;conflict={local,distant:other};
            return {ok:true,conflict:{kind:'device',localDay:runOf(local)?.day||0,cloudDay:runOf(other)?.day||0,localSoul:metaOf(local)?.soul||0,cloudSoul:metaOf(other)?.soul||0,localSlots:(metaOf(local)?.slots||[]).filter(Boolean).length,cloudSlots:(metaOf(other)?.slots||[]).filter(Boolean).length}};
          }
        }
        const localRun=runOf(local),diskRun=valid[0]&&runOf(valid[0].data.keys);
        if(valid[0]&&(!meaningful(local)||(localRun?._runId&&localRun._runId===diskRun?._runId&&(diskRun._rev||0)>(localRun._rev||0)))){const restored={...valid[0].data.keys};if((metaOf(local)?._accountRev||0)>(metaOf(restored)?._accountRev||0))for(const key of ['guyuyizhang_meta','guyuyizhang_meta_bak'])restored[key]=local[key];install(restored);local=capture();notice='已从设备持久备份恢复';}
        else if(!localRun&&diskRun){const restored={...valid[0].data.keys};for(const key of ['guyuyizhang_meta','guyuyizhang_meta_bak'])if(local[key])restored[key]=local[key];restored.guyuyizhang_rev=String(Math.max(Number(local.guyuyizhang_rev)||0,Number(restored.guyuyizhang_rev)||0));install(restored);local=capture();notice='已找回本机进度，账号记录保持不变';}
        else if(valid[0]&&localRun&&!metaOf(local)&&metaOf(valid[0].data.keys)){const restored={...local};for(const key of ['guyuyizhang_meta','guyuyizhang_meta_bak'])restored[key]=valid[0].data.keys[key];install(restored);local=capture();notice='已找回本机账号记录';}
        if(valid[0]&&(metaOf(valid[0].data.keys)?._accountRev||0)>(metaOf(local)?._accountRev||0)){const restored={...local};for(const key of ['guyuyizhang_meta','guyuyizhang_meta_bak'])restored[key]=valid[0].data.keys[key];install(restored);local=capture();notice='已恢复较新的设备账号记录';}
        localAvailable=safeLocal();
        if(!meaningful(local)&&records.some(r=>r.error||r.exists&&!r.data)&&!cloud)throw Error('持久备份暂时无法读取，未新建空档。');
        if(cloudUnavailable&&!meaningful(local))throw Error('云存档接口尚未就绪，可重试或选择本机模式。');
        if(cloud){
          let distant;try{distant=await remoteRead();}catch(e){cloudError=e.message;try{distant=await serverRead();if(distant){acceptedServer=hash(JSON.stringify(distant.keys));notice='已读取服务器备用进度';}}catch(serverError){cloudError+='；'+serverError.message;}if(!distant&&!meaningful(local))throw Error('云端备份暂时无法核对，请联网重试；没有创建或覆盖存档。 '+e.message);}
          // “列表为空”也可能是平台记录暂不可见；新设备先核对已有备用，避免直接开空局。
          if(!distant&&!meaningful(local)&&fallback?.supported?.()){
            try{distant=await serverRead();if(distant)acceptedServer=hash(JSON.stringify(distant.keys));}
            catch(e){throw Error('正在核对服务器备用进度，请联网重试；原记录未覆盖。 '+e.message);}
          }
          if(distant){
            seq=Math.max(seq,distant.seq||0);
            acceptedRemote=hash(JSON.stringify(distant.keys));
            const a=runOf(local),b=runOf(distant.keys);
            if(!meaningful(local)){install(distant.keys);notice='已恢复云端进度';}
            else if(needsChoice(local,distant.keys)){conflict={local,distant:distant.keys};return {ok:true,conflict:{localDay:a?.day||0,cloudDay:b?.day||0,localSoul:metaOf(local)?.soul||0,cloudSoul:metaOf(distant.keys)?.soul||0,localSlots:(metaOf(local)?.slots||[]).filter(Boolean).length,cloudSlots:(metaOf(distant.keys)?.slots||[]).filter(Boolean).length}};}
          }
        }
        if(!meaningful(capture())&&records.some(r=>r.error||r.exists&&!r.data))throw Error('设备备份尚未恢复，原记录已保留，请重试或导出诊断。');
        if(!deviceVerified){fs=null;cloud=null;localOnly=true;storage.setItem(LOCAL_ONLY,'1');notice='仅本机保存，设备备份尚未核对';}
        else storage.removeItem(LOCAL_ONLY);
        ready=true;return {ok:true};
      })().catch(e=>{initTask=null;throw e;});return initTask;
    }
    function choose(which){if(!conflict||!['local','cloud'].includes(which))throw Error('无效存档选择');const selected={...(which==='cloud'?conflict.distant:conflict.local)},other={...(which==='cloud'?conflict.local:conflict.distant)};delete other.guyuyizhang_alternate_save;selected.guyuyizhang_alternate_save=JSON.stringify(other);install(selected);storage.removeItem(LOCAL_ONLY);conflict=null;ready=true;notice=which==='cloud'?'已恢复备份进度':'保留本机进度';}
    function continueLocally(){if(!localAvailable||initTask||conflict)throw Error('本机记录尚未核对，请先重试或抢救备份。');if(!safeLocal())throw Error('本机记录不完整，原记录已保留。');storage.setItem(LOCAL_ONLY,'1');if(!deviceVerified)fs=null;localOnly=true;cloud=null;listed=false;ready=true;notice='仅保存在本机，云端原记录未覆盖';cloudError='';return {ok:true};}
    function snapshot(){const keys=capture();if(keys.guyuyizhang_write_journal||!validKeys(keys))return null;return encode(keys);}
    function schedule(){if(!ready||!fs)return false;try{queue=snapshot();}catch(e){fileError=e.message;return false;}if(!queue)return false;if(!writeTimer)writeTimer=timer(()=>{writeTimer=null;flush();},250);return true;}
    async function flush(){
      if(!ready)return {ok:false,reason:'存档服务正在读取，请稍后重试。'};
      if(!fs)return {ok:true};if(writeTimer){cancel(writeTimer);writeTimer=null;}
      if(writing){await writing;if(queue)return flush();return fileError?{ok:false,reason:fileError}:{ok:true};}
      if(!queue){try{queue=snapshot();}catch(e){return {ok:false,reason:e.message};}}if(!queue)return {ok:true};
      writing=(async()=>{while(queue){const body=queue;queue=null;const index=lastSlot===0?1:0,path=root+'/guyu_progress_'+index+'.json';try{await write(path,body);if(await read(path)!==body)throw Error('设备持久备份校验失败');lastSlot=index;lastLocal=clock();fileError='';scheduleCloud(body);}catch(e){fileError=e.message;queue=queue||body;return {ok:false,reason:'本地进度仍保留，但设备持久备份失败：'+e.message};}}return {ok:true};})();
      try{return await writing;}finally{writing=null;}
    }
    let cloudQueued=null;
    function scheduleCloud(body){if(!cloud)return;cloudQueued=body;if(!busy&&!cloudTimer)cloudTimer=timer(()=>{cloudTimer=null;upload();},Math.max(0,61000-(clock()-lastUpload)));}
    async function upload(){
      if(busy||!cloudQueued||!ready)return;busy=true;
      const body=cloudQueued;
      try{
        // 每次上传重新核对，防止另一设备在本次启动后推进了云端进度。
        const distant=await remoteRead(),local=decode(body);
        if(distant&&hash(JSON.stringify(distant.keys))!==acceptedRemote&&local&&needsChoice(local.keys,distant.keys))throw Error('云端存在另一份进度；请重新打开游戏选择，不会自动覆盖。');
        // 列表未知时绝不创建新档，避免暂时失联覆盖原云档。
        if(!listed)throw Error('云存档尚未完成核对');
        if(body===uploaded){cloudQueued=null;return;}cloudQueued=null;
        await write(root+'/guyu_cloud_upload.json',body);lastUpload=clock();
        const args={archiveMetaData:{name:ARCHIVE,summary:'Guyu progress backup',playtime:0},archiveFilePath:root+'/guyu_cloud_upload.json'};
        const r=remote?await invoke(cloud,'updateArchive',{...args,archiveUUID:remote.uuid}):await invoke(cloud,'createArchive',args);
        if(!remote){if(!r.uuid)throw Error('云存档未返回保存标识');remote={uuid:r.uuid,fileId:r.fileId,name:ARCHIVE};}
        uploaded=body;acceptedRemote=hash(JSON.stringify(local.keys));cloudError='';notice='设备备份已保存，云端已同步';
      }catch(e){
        cloudError=e.message;listed=false;lastUpload=clock();let backedUp=false;
        if(fallback)try{const distant=await serverRead(),local=decode(body);if(distant&&hash(JSON.stringify(distant.keys))!==acceptedServer&&needsChoice(local.keys,distant.keys))throw Error('服务器备用中存在另一份进度，请重新打开游戏选择');await fallback.save(body);acceptedServer=hash(JSON.stringify(local.keys));if(cloudQueued===body)cloudQueued=null;notice='Tap云暂不可用，已保存服务器备用';cloudError='';backedUp=true;}catch(serverError){cloudError+='；'+serverError.message;}
        if(!backedUp)cloudQueued=cloudQueued||body;
      }
      finally{busy=false;if(cloudQueued)scheduleCloud(cloudQueued);}
    }
    const port={getItem:key=>ready?storage.getItem(key):null,setItem(key,value){if(!ready)throw Error('存档读取尚未完成，已阻止提前写入');storage.setItem(key,value);},removeItem(key){if(!ready)throw Error('存档读取尚未完成，已阻止提前写入');storage.removeItem(key);}};
    return Object.freeze({initialize,choose,continueLocally,canContinueLocally:()=>localAvailable&&!ready&&!initTask&&!conflict,schedule,flush,storage:port,ready:()=>ready,status:()=>({supported:!!cloud,pendingLocal:!!queue||!!writing,pending:!!queue||!!writing||busy||!!cloudQueued,msg:fileError||cloudError||(localOnly?'仅保存在本机，云端原记录未覆盖':busy||cloudQueued?'设备备份已保存，云端同步中':notice),at:lastUpload,applied:lastLocal,uuid:remote?.uuid||null,diag:localOnly?'local-only-selected':fs?'tap-persistent':'local-only'}),decode});
  }
  return Object.freeze({create,keys:KEYS});
})();
if(typeof window!=='undefined')window.GuyuSaveBridge=PlatformSaveStore.create({storage:localStorage,getHost:()=>window.tap,fallback:typeof ServerSaveStore!=='undefined'?ServerSaveStore.create({storage:localStorage,getHost:()=>window.tap}):null,platformHint:/TapTap|tapfile/i.test((typeof navigator!=='undefined'?navigator.userAgent:'')+' '+(typeof location!=='undefined'?location.protocol:''))});
