/* 临时数据库与测试密钥；不接生产、不调用SDK或商业广告。 */
const {spawnSync}=require('node:child_process'),path=require('node:path');
const result=spawnSync(process.env.PYTHON||'python',['-X','utf8',path.join(__dirname,'native_ad_receipt_test.py')],{encoding:'utf8',windowsHide:true});
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
if(result.error)console.error(result.error);
process.exitCode=result.status??1;
