/* 兑换网络适配：只负责传输，不读取存档、不决定奖励。所有回退携带同一领取资格。 */
const RedeemTransport = (() => {
  function send(env,url,payload,{timeoutMs=15000}={}) {
    return new Promise((resolve,reject)=>{
      let finished=false,attempt=0,cursor=0;
      const aborters=[],started=Date.now();
      const error=(kind,status)=>Object.assign(Error(kind),{redeemError:kind,status});
      const done=(failure,value)=>{
        if(finished)return;finished=true;clearTimeout(timer);
        if(failure)reject(failure);else resolve(value);
      };
      const decode=(data,status)=>{
        if(typeof data==='string'){try{return JSON.parse(data);}catch(_){throw error('response',status);}}
        if(!data||typeof data!=='object')throw error('response',status);
        return data;
      };
      const timer=setTimeout(()=>{
        done(error('timeout'));
        aborters.forEach(abort=>{try{abort();}catch(_){}});
      },timeoutMs);
      const transports=[];
      if(typeof env.tap?.request==='function'&&(!env.GUYU_CHANNEL||env.GUYU_CHANNEL==='taptap'))transports.push('tap');
      if(typeof env.fetch==='function')transports.push('fetch');
      if(typeof env.XMLHttpRequest==='function')transports.push('xhr');
      function next(){
        if(finished)return;
        if(cursor===transports.length){done(error(transports.length?'network':'unsupported'));return;}
        const kind=transports[cursor++],token=++attempt;
        const active=()=>!finished&&token===attempt;
        const fail=()=>{if(active())next();};
        const accept=(status,data)=>{
          if(!active())return;
          try{done(null,{status,data:decode(data,status)});}catch(failure){done(failure);}
        };
        try{
          if(kind==='tap'){
            const task=env.tap.request({url,method:'POST',header:{'content-type':'application/json'},data:payload,dataType:'json',timeout:Math.max(1,timeoutMs-(Date.now()-started)),success:r=>accept(r.statusCode,r.data),fail});
            if(task?.abort)aborters.push(()=>task.abort());
          }else if(kind==='fetch'){
            const controller=env.AbortController?new env.AbortController():null;
            if(controller)aborters.push(()=>controller.abort());
            env.fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'omit',signal:controller?.signal})
              .then(async response=>{
                if(!active())return;
                try{accept(response.status,await response.json());}
                catch(_){if(active())done(error('response',response.status));}
              }).catch(fail);
          }else{
            const request=new env.XMLHttpRequest();aborters.push(()=>request.abort());
            request.open('POST',url,true);request.setRequestHeader('Content-Type','application/json');
            request.timeout=Math.max(1,timeoutMs-(Date.now()-started));
            request.onload=()=>accept(request.status,request.responseText);
            request.onerror=fail;request.onabort=fail;request.ontimeout=()=>{if(active())done(error('timeout'));};
            request.send(JSON.stringify(payload));
          }
        }catch(_){fail();}
      }
      next();
    });
  }
  return Object.freeze({send});
})();
