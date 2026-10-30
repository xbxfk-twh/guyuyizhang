/* 隔离 Chrome 验证真实 MP3 解码/播放与单路开关，不触碰玩家存储。 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {openBrowser}=require('../../回归测试/helpers/browser');
(async()=>{let b;try{
 b=await openBrowser({width:900,height:650,init:`window.__voiceMedia=[];const NativeAudio=window.Audio;window.Audio=function(...args){const a=new NativeAudio(...args);window.__voiceMedia.push(a);return a;};window.Audio.prototype=NativeAudio.prototype;`});
 const manifest=JSON.parse(fs.readFileSync(path.join(b.root,'孤屿遗章-游戏 - 发布/assets/audio/voices/manifest.json'),'utf8'));
 const decoded=await b.ev(`(async()=>{const ctx=new AudioContext(),rows=[];try{for(const clip of ${JSON.stringify(manifest.clips)}){const data=await fetch('assets/audio/voices/'+clip.file+'?v='+${JSON.stringify(manifest.revision)}).then(r=>r.arrayBuffer());const audio=await ctx.decodeAudioData(data);rows.push({id:clip.id,duration:audio.duration,channels:audio.numberOfChannels});}return rows;}finally{await ctx.close();}})()`);
 assert.equal(decoded.length,33);for(const c of decoded){assert.equal(c.channels,1);assert.ok(Math.abs(c.duration-manifest.clips.find(x=>x.id===c.id).duration)<.1);}
 console.log('OK 33 个 MP3 在真实 Chrome 解码，声道与时长对应');
 await b.ev("document.addEventListener('pointerdown',()=>AudioFX.init(),{once:true})");
 await b.send('Input.dispatchMouseEvent',{type:'mousePressed',x:5,y:5,button:'left',clickCount:1});await b.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:5,y:5,button:'left',clickCount:1});
 await b.ev("AudioFX.playVoice('linghui',0)");await b.sleep(450);
 assert.ok(await b.ev("__voiceMedia.some(a=>a.src.includes('linghui-0.mp3')&&!a.paused&&a.currentTime>0&&!a.error)"));
 await b.ev("AudioFX.playVoice('laochao',0)");await b.sleep(300);
 assert.ok(await b.ev("__voiceMedia.filter(a=>a.src.includes('/voices/')&&!a.paused).length===1&&__voiceMedia.find(a=>a.src.includes('linghui-0.mp3')).paused"));
 await b.ev("AudioFX.toggleVoice()");assert.ok(await b.ev("__voiceMedia.filter(a=>a.src.includes('/voices/')).every(a=>a.paused)&&localStorage.getItem('guyu_voice')==='off'"));
 await b.ev("AudioFX.toggleVoice();AudioFX.playVoice('laochao',1);AudioFX.setHostSuspended(true)");assert.ok(await b.ev("__voiceMedia.filter(a=>a.src.includes('/voices/')).every(a=>a.paused)&&AudioFX.voiceState()"));
 await b.ev("AudioFX.setHostSuspended(false)");assert.equal(await b.ev("__voiceMedia.filter(a=>a.src.includes('/voices/')&&!a.paused).length"),0);
 assert.deepEqual(b.errors,[]);console.log('OK 灵灰/老潮实际播放、切换不叠声、关闭与宿主暂停保留偏好');
 console.log('通过 2 项，失败 0 项\nRESULT:PASS');
 }finally{await b?.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
