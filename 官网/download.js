/* 只有已上传并校验的发行清单才能激活下载，不推送安装或自动下载。 */
(async()=>{const status=document.getElementById('download-status');try{
 const response=await fetch('/downloads/latest.json',{cache:'no-store'});if(!response.ok)throw Error('清单未就绪');const r=await response.json();
 if(typeof r.version!=='string'||!/^v\d+\.\d+-\d{8}-\d{6}$/.test(r.version)||!/^\/downloads\/[A-Za-z0-9_.-]+\.apk$/.test(r.url)||!Number.isSafeInteger(r.bytes)||r.bytes<=0||!/^[a-f0-9]{64}$/.test(r.sha256))throw Error('发行信息不完整');
 const link=document.getElementById('apk-download');link.href=r.url;link.setAttribute('download',r.url.split('/').pop());link.hidden=false;status.textContent='官方签名安装包 · 安卓独立测试版';
 document.getElementById('release-detail').textContent=r.version+' · '+(r.bytes/1024/1024).toFixed(1)+' MB';document.getElementById('release-sha').textContent='SHA256 '+r.sha256;document.getElementById('release-check').hidden=false;
 }catch(e){status.textContent='安装包正在准备中，请稍后刷新，或继续通过 TapTap 游玩。';}})();
