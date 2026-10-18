/* 音频主题回归：首领战主题（BOSS_BARS / setBoss）**仍在游戏里**，但设置里的「试听首领曲」入口已删除。
   ⚠️ 契约变更（2026-09-25）：这个文件原来还测 previewBoss 的试听开关（11 项）。作者先说
      "boss旋律不要让玩家听"，我误删了整首曲子；作者随即澄清 **"boss 配乐不要移除啊，只是移除试听啊"**。
      所以现在守两条：
        ① 曲子必须在、战斗开始能起、结束能停、切场景能收（和原来一样）；
        ② previewBoss 与设置里的试听入口必须**不存在**（这才是作者要删的那一半）。
      另外这首曲子另有一份离线渲染版：开发工具/音乐/_render_boss_theme.py → 孤屿遗章_首领战主题曲.wav。
   无真实音频设备，全部用假的 AudioContext / 计时器跑。 */
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '../孤屿遗章-游戏 - 发布');
const src = fs.readFileSync(path.join(ROOT, 'js/audio.js'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'js/ui.js'), 'utf8');
// ⚠️ 先剥注释再看：两个文件里都留了"这半边删了、那半边留着"的说明注释，
//    直接 grep 原文会被自己的注释骗过去（这个坑在本项目里反复出现）。
const NO_COMMENT = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const code = NO_COMMENT(src), uiCode = NO_COMMENT(ui);
const notes = [], noiseNodes=[], timers = new Map(),intervals=new Map(); let serial = 0;
const param = () => ({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){}});
const node = () => ({gain:param(),frequency:param(),Q:param(),delayTime:param(),connect(){},disconnect(){},start(){},stop(){}});
class AudioContextMock {
  constructor(){this.currentTime=0;this.sampleRate=8000;this.destination=node();this.state='running';}
  createGain(){return node();}
  createBiquadFilter(){return node();}
  createDelay(){return node();}
  createOscillator(){const x=node();notes.push(x);return x;}
  createBufferSource(){const x=node();noiseNodes.push(x);return x;}
  createBuffer(channels,frames){return {getChannelData(){return new Float32Array(frames);}};}
}
const win={AudioContext:AudioContextMock};
const audio=new Function('window','setInterval','clearInterval','setTimeout','clearTimeout','console',src+'\nreturn AudioFX;')(
  win,(fn,ms)=>{const id=++serial;timers.set(id,fn);intervals.set(id,ms);return id;},id=>timers.delete(id),()=>++serial,()=>{},console);

// ① 场景配乐照旧：一个时钟
audio.init();
assert.equal(timers.size,1,'场景配乐只有一个时钟');
assert.equal(typeof audio.play, 'function', '音效接口仍在');
const clickBefore=noiseNodes.length;audio.play('click');assert.ok(noiseNodes.length>clickBefore,'点击立即生成音频节点');
audio.play('pickup');
assert.ok(notes.length > 0, '音效仍然出声');

// ② 首领主题：起一个时钟、不叠加、能停、能把场景配乐还回来
audio.setBoss(true);
assert.equal(timers.size,2,'首领主题增加一个时钟');
audio.setBoss(true);
assert.equal(timers.size,2,'重复开始不能叠加时钟');
const bossBeat=[...timers.values()][1];
for(let i=0;i<18;i++)bossBeat();
const freqs=notes.map(n=>n.frequency.value);
assert.ok(freqs.includes(440) && freqs.includes(523.3) && freqs.includes(659.3),'主题应有可辨识的旋律音');
assert.ok(freqs.includes(110) && freqs.includes(87.3),'和声应走过至少两个根音');
audio.toggle();                       // 关掉音乐
audio.setBoss(false);
assert.equal(timers.size,1,'关闭音乐时结束战斗也必须清理首领时钟');
audio.toggle();                       // 打开音乐
audio.setBoss(true);
assert.equal(timers.size,2,'重新开战再次起时钟');
audio.setBoss(false);
assert.equal(timers.size,1,'结束后回到"只有场景配乐一个时钟"');

audio.setCombat(true);
assert.equal(timers.size,2,'普通战配乐也只增加一个时钟');
const regularInterval=intervals.get([...timers.keys()][1]);
assert.equal(regularInterval,60000/112/2,'普通战112BPM');
audio.setBoss(true);
assert.equal(timers.size,2,'普通战切首领不叠加主题时钟');
assert.equal(intervals.get([...timers.keys()][1]),60000/144/2,'首领144BPM更快');
audio.setBoss(false);audio.setCombat(false);
assert.equal(timers.size,1,'结束两类战斗只保留场景时钟');
for(const name of ['combatstrike','combatcritical','combatbite','combatclaw','combatslash','combatshot','combatrift','cardBreak']){const n=notes.length+noiseNodes.length;audio.play(name);assert.ok(notes.length+noiseNodes.length>n,'新音效真实创建节点 '+name);}

// ③ 战斗会真的切曲目（ui.js 的两个调用点都在）
assert.ok(/if \(en && en\.boss\) try\{ AudioFX\.setBoss\(true\); \}catch\(e\)\{\}/.test(uiCode), 'ui.js 战斗开始要切首领主题');
assert.ok(/if \(kind === 'end'\) \{[^}]*[\s\S]*?AudioFX\.setBoss\(false\)/.test(uiCode), 'ui.js 最后一击表现结束后要关首领主题');

// ④ 试听入口（这才是作者要删的）：函数、按钮、分支都不许在
assert.equal(code.includes('previewBoss'), false, 'audio.js 里不该再有 previewBoss');
assert.equal(audio.previewBoss, undefined, '导出接口里不该再有 previewBoss');
assert.equal(uiCode.includes('audio:boss-preview'), false, '设置里不该再有「试听首领曲」按钮');
assert.equal(/试听[^`'"<]*首领/.test(uiCode), false, 'ui.js 不该再出现"试听首领…"文案');
// 「音乐 / 音效 / 环境音」三个开关必须还在
assert.ok(/tgl\('audio:music'/.test(uiCode) && /tgl\('audio:sfx'/.test(uiCode) && /tgl\('audio:amb'/.test(uiCode), '三个声音开关仍在');

// ⑤ 实录音效与角色语音受开关控制，池上限、场景清理和本地资源可验证。
const media=[];
class AudioMock {
 constructor(src=''){this.src=src;this.paused=true;this.ended=false;this.count=0;media.push(this);}
 play(){this.paused=false;this.count++;return Promise.resolve();}
 pause(){this.paused=true;}
 removeAttribute(){this.src='';}
}
const preferences={};
const sampled=new Function('window','setInterval','clearInterval','setTimeout','clearTimeout','console',src+'\nreturn AudioFX;')(
 {AudioContext:AudioContextMock,Audio:AudioMock,localStorage:{getItem:k=>preferences[k],setItem:(k,v)=>preferences[k]=v}},()=>1,()=>{},()=>1,()=>{},console);
sampled.init();
const beforeGoodMedia=media.length,beforeGoodNotes=notes.length;
sampled.play('good');
assert.equal(media.length,beforeGoodMedia,'完成提示不再播放旧 good.mp3');
assert.deepEqual(notes.slice(beforeGoodNotes).map(n=>[n.frequency.value,n.type]),[[294,'sine'],[588,'sine']],'完成提示只有柔和基音与同刻谐音');
for(let i=0;i<30;i++) sampled.play('hit');
assert.equal(media.length,6,'密集短音效最多六个实例');
assert.ok(media.every(a=>a.src.endsWith('/hit.mp3')),'命中使用实录素材');
sampled.playVoice('fishman',0);const spoken=media.at(-1);
assert.ok(spoken.src.endsWith('/fishman-0.mp3')&&!spoken.paused,'人鱼短句已播放');
sampled.toggleVoice();assert.ok(spoken.paused&&preferences.guyu_voice==='off','关闭角色语音立即停止并记录偏好');
const count=media.length;sampled.playVoice('fishman',1);assert.equal(media.length,count,'静音不会创建或播放新语音');
sampled.toggleVoice();sampled.toggleSfx();assert.ok(media.every(a=>a.paused),'关闭音效同时停止短句与音效');
sampled.play('trade');assert.equal(media.length,count,'静音禁止新的实录音效');
sampled.toggleSfx();sampled.setEnv(false,'rain');sampled.setScene('sea');
const rain=media.findLast(a=>a.src.endsWith('/rain.mp3')),surf=media.findLast(a=>a.src.endsWith('/surf.mp3'));
assert.ok(rain&&surf&&rain.loop&&surf.loop,'海岸雨天使用实录循环');
sampled.setScene('atlantis',true);assert.ok(rain.paused&&surf.paused,'潜入海底停止地表海浪与降雨');
sampled.setScene('sea');sampled.toggle();assert.ok(media.filter(a=>a.loop).every(a=>a.paused),'关闭音乐停止所有实录环境层');
for(const f of ['assets/audio/voices/fishman-0.mp3','assets/audio/voices/linghui-0.mp3','assets/audio/sfx/hit.mp3','assets/audio/ambient/rain.mp3'])assert.ok(fs.statSync(path.join(ROOT,f)).size>1000,'已打入本地资源 '+f);
console.log('通过 49 项，失败 0 项\nRESULT:PASS');
