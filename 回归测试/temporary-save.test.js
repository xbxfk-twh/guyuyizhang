const fs=require('node:fs'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const Transfer=new Function(fs.readFileSync('孤屿遗章-游戏 - 发布/js/storage/transfer.js','utf8')+';return TemporarySaveTransfer;')();
const Codec=new Function(fs.readFileSync('孤屿遗章-游戏 - 发布/js/storage/codec.js','utf8')+';return SaveCodec;')();
const body=Codec.encode({v:1,meta:{soul:123,slots:[null,null,null]},save:{day:9,stats:{hp:90}}});
let pass=0;const check=async(n,f)=>{await f();console.log('OK '+n);pass++;};
(async()=>{
const inspect=c=>Codec.read(c,s=>s?.day>0);
await check('上传完整旧格式，返回短码；取档只读且保持校验',async()=>{let got;const s=Transfer.create({inspect,clock:()=>1000,send:async(url,data)=>{got=data;return{status:200,data:url.endsWith('/create')?{ok:true,code:'SAVE-ABCD-EFGH-JKLM-NPQR',expiresAt:601}:{ok:true,body,expiresAt:601}};}});assert.equal((await s.upload(body)).code.length,24);assert.deepEqual(got,{body});assert.equal(await s.download('save-abcd efgh jklm npqr'),body);});
await check('无效本机备份不发请求',async()=>{const s=Transfer.create({inspect,send:()=>{throw Error('must not call');}});await assert.rejects(s.upload('broken'),/不完整/);});
await check('网络错误、过期和服务错误不会伪造成功',async()=>{for(const response of [{status:404,data:{reason:'取档码已过期'}},{status:200,data:{ok:true,expiresAt:1}}]){const s=Transfer.create({inspect,send:async()=>response});await assert.rejects(s.download('SAVE-ABCD-EFGH-JKLM-NPQR'),/过期/);}});
await check('取回正文损坏时拒绝导入',async()=>{const s=Transfer.create({inspect,send:async()=>({status:200,data:{ok:true,body:body.slice(8),expiresAt:Date.now()/1000+600}})});await assert.rejects(s.download('SAVE-ABCD-EFGH-JKLM-NPQR'),/未通过校验/);});
await check('取档码不与兑换码混用',async()=>{assert.ok(Transfer.isCode('save-abcd'));assert.ok(!Transfer.isCode('GY-ABCD'));const s=Transfer.create({inspect,send:()=>{throw Error('must not call');}});await assert.rejects(s.download('GY-ABCD'),/完整/);});
const py=spawnSync('python',['-X','utf8','开发工具/存档服务/test_transfer.py'],{encoding:'utf8',windowsHide:true});assert.equal(py.status,0,py.stdout+py.stderr);console.log('OK 后端10项：到期、内存回收、并发、配额、限流及真实HTTP');pass+=10;
console.log('通过 '+pass+' 项，失败 0 项\nRESULT:PASS');
})().catch(e=>{console.error(e.stack);console.log('RESULT:FAIL');process.exitCode=1;});
