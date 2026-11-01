/* 官网真实清单/下载响应与游戏活动入口；只读线上文件，游戏使用隔离Chrome存储。 */
const assert=require('node:assert/strict'),{openBrowser}=require('../../回归测试/helpers/browser');let b,pass=0;
const check=async(name,expr)=>{assert.ok(await b.ev(expr),name);pass++;console.log('OK '+name);};
(async()=>{try{
 const origin='https://guyuyizhang.top:8443',manifest=await(await fetch(origin+'/downloads/latest.json',{cache:'no-store'})).json();assert.match(manifest.sha256,/^[a-f0-9]{64}$/);
 const head=await fetch(origin+manifest.url,{method:'HEAD'});assert.equal(head.status,200);assert.equal(Number(head.headers.get('content-length')),manifest.bytes);assert.equal(head.headers.get('content-type'),'application/vnd.android.package-archive');assert.equal(head.headers.get('content-disposition'),'attachment');pass++;console.log('OK 下载文件类型、大小与附件响应正确');
 const range=await fetch(origin+manifest.url,{headers:{Range:'bytes=0-3'}});assert.equal(range.status,206);assert.deepEqual([...new Uint8Array(await range.arrayBuffer())],[80,75,3,4]);pass++;console.log('OK APK支持断点续传且返回真实ZIP文件头');
 for(const [width,height] of [[390,844],[1280,720]]){
  b=await openBrowser({width,height});await b.send('Page.navigate',{url:origin+'/download.html'});
  let ready=false;for(let n=0;n<100;n++){try{ready=await b.ev(`!!document.querySelector('#apk-download')&&!document.querySelector('#apk-download').hidden`);}catch(e){}if(ready)break;await b.sleep(100);}assert.ok(ready,'下载按钮须由有效清单激活');
  await check(width+' 下载按钮首屏可见且无横向溢出',`(()=>{const r=document.querySelector('#apk-download').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth+1})()`);
  await check(width+' 链接版本、迁移提示和平台区别完整',`document.querySelector('#apk-download').getAttribute('href')===${JSON.stringify(manifest.url)}&&document.querySelector('#release-detail').textContent.includes(${JSON.stringify(manifest.version)})&&document.body.textContent.includes('8位')&&document.body.textContent.includes('10分钟')&&document.body.textContent.includes('每账号每小时最多生成3次')&&document.body.textContent.includes('不会自动跨版本出现')&&document.body.textContent.includes('Android 8.0')`);
  await b.tap('#release-check summary');await check(width+' 校验值与发行清单一致',`document.querySelector('#release-sha').textContent.includes(${JSON.stringify(manifest.sha256)})`);await b.shot('oct29-download-'+width+'.png');assert.deepEqual(b.errors,[]);await b.close();b=null;
 }
 b=await openBrowser({width:844,height:390});for(let n=0;n<100&&!await b.ev(`!!document.querySelector('#btn-new')`);n++)await b.sleep(100);
 await b.ev(`Game.newGame('fisher','normal');Game.S().tut=null;UI.begin()`);for(let n=0;n<60&&await b.ev(`!!document.querySelector('#loading')`);n++)await b.sleep(100);await b.ev('UI.handleBack()');await b.tap('[data-nav="save"]');await b.tap('[data-savemenu="mail"]');await b.tap('[data-mailtab="event"]');
 await check('游戏活动页真实提供官网下载入口和迁移说明',`(()=>{const a=document.querySelector('.event-download [data-apk-url]');return a?.value==='https://guyuyizhang.top:8443/download.html'&&a.readOnly&&!!document.querySelector('[data-copy-apk-url]')&&!document.querySelector('.event-download a[href]')&&document.querySelector('.event-download').textContent.includes('生成取件码')&&document.querySelector('.event-download').textContent.includes('10分钟内')})()`);await b.shot('oct29-game-download-entry.png');
 for(const [width,height] of [[568,320],[844,390],[1280,720]]){
  await b.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1000});
  await b.ev(`window.__opened=0;window.__copied='';window.open=()=>{__opened++};window.__oldCopy=document.execCommand;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text;}}});window.__eventLocation=location.href;`);
  await b.tap('[data-copy-apk-url]');
  await check(width+' 实际点击只复制正确网址、不打开TapTap网页',`__copied==='https://guyuyizhang.top:8443/download.html'&&__opened===0&&location.href===__eventLocation&&document.querySelector('[data-apk-copy-status]').textContent.includes('网址已复制')&&!document.querySelector('[data-copy-apk-url]').disabled`);
  await check(width+' 网址框与按钮在手机及桌面不横向溢出',`(()=>{const e=document.querySelector('.download-address'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&e.scrollWidth<=e.clientWidth+1})()`);
  await b.ev(`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(Error('denied'))}});document.execCommand=()=>false;`);
  await b.tap('[data-copy-apk-url]');
  await check(width+' 复制被拦截时明确提示手动复制、完整网址可选取',`(()=>{const e=document.querySelector('[data-apk-url]');return document.querySelector('[data-apk-copy-status]').textContent.includes('自动复制失败')&&e.readOnly&&e.value==='https://guyuyizhang.top:8443/download.html'&&e.selectionStart===0&&e.selectionEnd===e.value.length&&__opened===0&&!document.querySelector('[data-copy-apk-url]').disabled})()`);
  await b.ev(`document.execCommand=command=>command==='copy';`);await b.tap('[data-copy-apk-url]');
  await check(width+' 浏览器标准复制方式成功后才显示成功反馈',`document.querySelector('[data-apk-copy-status]').textContent.includes('网址已复制')&&__opened===0`);
  await b.ev(`document.execCommand=window.__oldCopy;Locale.set('en')`);await b.sleep(100);
  await check(width+' 英文复制按钮与提示完整且网址不变',`document.querySelector('[data-copy-apk-url]').textContent==='Copy download URL'&&document.querySelector('[data-apk-copy-status]').textContent.includes('system browser')&&document.querySelector('[data-apk-url]').value==='https://guyuyizhang.top:8443/download.html'`);
  await b.ev(`Locale.set('zh')`);await b.shot('apk-copy-entry-'+width+'.png');
 }
 assert.deepEqual(b.errors,[]);
 console.log('通过 '+pass+' 项，失败 0 项\nRESULT:PASS');
}catch(e){console.error(e.stack);await b?.shot('oct29-download-failure.png');process.exitCode=1;console.log('RESULT:FAIL');}finally{await b?.close();}})();
