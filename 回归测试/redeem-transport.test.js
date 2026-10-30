const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const code=fs.readFileSync(path.join(__dirname,'../孤屿遗章-游戏 - 发布/js/network/redeem.js'),'utf8');
function create(){const control={};const api=new Function('setTimeout','clearTimeout',code+';return RedeemTransport;')(fn=>{control.timeout=fn;return 1;},()=>{});return {api,control};}
const payload={code:'中文自定义码',owner:'a'.repeat(64)};let passed=0;
async function check(name,fn){await fn();passed++;console.log('OK '+name);}
(async()=>{
 await check('Tap原生接口优先，字符串JSON解析且不额外发fetch',async()=>{const{api}=create();let fetches=0;const result=await api.send({tap:{request(o){assert.equal(o.data,payload);o.success({statusCode:200,data:'{"ok":true}'});return{abort(){}};}},fetch(){fetches++;}},'https://example.test',payload);assert.equal(result.data.ok,true);assert.equal(fetches,0);});
 await check('原生失败回退fetch，同资格且迟到的原生成功不能覆盖',async()=>{const{api}=create();let native;const result=await api.send({tap:{request(o){native=o;o.fail();}},fetch:async(url,o)=>{assert.deepEqual(JSON.parse(o.body),payload);native.success({statusCode:200,data:{ok:false}});return{status:200,json:async()=>({ok:true})};}},'https://example.test',payload);assert.equal(result.data.ok,true);});
 await check('无fetch宿主使用XHR，HTTP409拒绝不当作网络失败重试',async()=>{const{api}=create();class XHR{open(method){assert.equal(method,'POST');}setRequestHeader(){}send(body){assert.deepEqual(JSON.parse(body),payload);this.status=409;this.responseText='{"ok":false}';this.onload();}abort(){}}const result=await api.send({XMLHttpRequest:XHR},'https://example.test',payload);assert.equal(result.status,409);assert.equal(result.data.ok,false);});
 await check('畸形响应、无传输接口、超时与迟到回调分辨且不漏终止',async()=>{
  const{api,control}=create();await assert.rejects(api.send({},'https://example.test',payload),e=>e.redeemError==='unsupported');
  await assert.rejects(api.send({fetch:async()=>({status:502,json:async()=>{throw Error('html');}})},'https://example.test',payload),e=>e.redeemError==='response'&&e.status===502);
  let callbacks,aborted=0;const pending=api.send({tap:{request(o){callbacks=o;return{abort(){aborted++;}};}}},'https://example.test',payload);control.timeout();await assert.rejects(pending,e=>e.redeemError==='timeout');callbacks.success({statusCode:200,data:{ok:true}});assert.equal(aborted,1);
 });
 console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
})().catch(e=>{console.error(e);process.exitCode=1;});
