const fs=require('node:fs'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const Server=new Function(fs.readFileSync('孤屿遗章-游戏 - 发布/js/storage/server.js','utf8')+';return ServerSaveStore')();
const wait=ms=>new Promise(r=>setTimeout(r,ms));let pass=0;
function fixture(){const data=new Map(),files=new Map(),control={loginFail:false,requestFail:false,authReject:false,requests:[],late:null},remote={version:0,body:null};
 const token='a'.repeat(64),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const host={login(o){if(control.loginFail)return o.fail({errMsg:'offline'});o.success({code:'single-use-code'});},request(o){control.requests.push(o);if(control.requestFail)return o.fail({errMsg:'network'});const path=new URL(o.url).pathname;let result,status=200;
  if(path.endsWith('/auth')){if(control.authReject){status=401;result={ok:false,reason:'invalid code'};}else result={ok:true,token,expires:Date.now()/1000+86400};}
  else if(o.header.Authorization!=='Bearer '+token){status=401;result={ok:false,reason:'unauthorized'};}
  else if(path.endsWith('/latest'))result={ok:true,found:!!remote.body,version:remote.version,...(remote.body?{body:remote.body}:{})};
  else if(o.data.baseVersion!==remote.version){status=409;result={ok:false,reason:'another device'};}
  else{remote.version++;remote.body=o.data.body;result={ok:true,version:remote.version};}o.success({statusCode:status,data:result});}};
 const fsm={readFile(o){files.has(o.filePath)?o.success({data:files.get(o.filePath)}):o.fail({errMsg:'missing'});},writeFile(o){files.set(o.filePath,o.data);o.success({});}};
 const opts={storage,getHost:()=>host,fetcher:null,timeout:25,timer:(f,n)=>{const t=setTimeout(f,n);t.unref();return t;},cancel:clearTimeout};const client=Server.create(opts);client.setFileSystem(fsm,'tapfile://usr');return{data,files,control,remote,storage,host,fsm,opts,client,token};
}
async function check(name,fn){await fn();pass++;console.log('OK '+name);}
(async()=>{
await check('只用Tap单次code换服务端身份，重复保存不重复登录',async()=>{const f=fixture();assert.equal(f.control.requests.length,0);const r=await f.client.load();assert.equal(r.found,false);await f.client.save('snapshot');assert.equal(f.remote.body,'snapshot');await f.client.load();assert.equal(f.control.requests.filter(r=>r.url.endsWith('/auth')).length,1);assert.deepEqual(f.control.requests[0].data,{code:'single-use-code'});assert.equal(f.control.requests.some(r=>'openid' in (r.data||{})),false);});
await check('两端修订冲突不覆盖备用存档',async()=>{const f=fixture();await f.client.load();f.remote.version=2;f.remote.body='new-phone';await assert.rejects(f.client.save('old-phone'),e=>e.status===409);assert.equal(f.remote.body,'new-phone');});
await check('没有核对备用版本时禁止直接上传',async()=>{const f=fixture();await assert.rejects(f.client.save('unverified'),/尚未核对/);assert.equal(f.control.requests.length,0);});
await check('网页凭据缺失时可读设备会话，登录暂不可用仍保留已有备用',async()=>{const f=fixture();await f.client.load();f.remote.body='saved';f.remote.version=1;f.data.clear();f.control.loginFail=true;const next=Server.create(f.opts);next.setFileSystem(f.fsm,'tapfile://usr');assert.equal((await next.load()).body,'saved');});
await check('服务器拒绝新身份时不能偷用上一身份会话',async()=>{const f=fixture();await f.client.load();f.control.authReject=true;const next=Server.create(f.opts);next.setFileSystem(f.fsm,'tapfile://usr');await assert.rejects(next.load(),e=>e.status===401);assert.equal(f.control.requests.filter(r=>r.url.endsWith('/latest')).length,1);});
await check('登录超时后的迟到回调不写会话',async()=>{const f=fixture();f.host.login=o=>f.control.late=o;const p=assert.rejects(f.client.load(),/超时/);await wait(40);await p;f.control.late.success({code:'late'});await wait(3);assert.equal(f.data.size,0);assert.equal(f.control.requests.length,0);});
await check('Tap网络传输失败后可通过浏览器HTTPS重试',async()=>{const f=fixture();f.control.requestFail=true;let calls=0;const next=Server.create({...f.opts,fetcher:async(url,o)=>{calls++;return{status:200,json:async()=>url.endsWith('/auth')?{ok:true,token:f.token,expires:Date.now()/1000+86400}:{ok:true,found:false,version:0}};}});assert.equal((await next.load()).found,false);assert.equal(calls,2);});
await check('备用接口异常不被误识别为空存档',async()=>{const f=fixture();f.host.request=o=>o.success({statusCode:200,data:{ok:true}});await assert.rejects(f.client.load(),/异常/);assert.equal(f.remote.body,null);});
const py=spawnSync('python',['-X','utf8','开发工具/存档服务/test_server.py'],{encoding:'utf8',windowsHide:true});assert.equal(py.status,0,py.stdout+py.stderr);const backendCount=Number((py.stdout+py.stderr).match(/Ran (\d+) tests/)?.[1]);assert.ok(backendCount>=9);console.log('OK 后端'+backendCount+'项：鉴权隔离、并发、幂等、冲突、保留、过期、损坏、磁盘失败、配额与登录限流');pass+=backendCount;
console.log('通过 '+pass+' 项，失败 0 项\nRESULT:PASS');
})().catch(e=>{console.error(e.stack);console.log('RESULT:FAIL');process.exitCode=1;});
