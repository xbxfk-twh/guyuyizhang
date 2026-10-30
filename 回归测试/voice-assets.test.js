const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../孤屿遗章-游戏 - 发布'),dir=path.join(root,'assets/audio/voices');
const {MERCHANTS,LINGHUI_SPEECH}=new Function(fs.readFileSync(path.join(root,'js/data.js'),'utf8')+';return {MERCHANTS,LINGHUI_SPEECH};')();
const lines=Object.fromEntries(Object.entries(MERCHANTS).map(([key,value])=>[key,value.lines]));lines.linghui=LINGHUI_SPEECH;
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));let passed=0;
function check(name,fn){fn();passed++;console.log('OK '+name);}
check('9个角色台词逐句对应当前内容，全部本地文件有校验且无静音削波',()=>{
 const expected=Object.entries(lines).flatMap(([who,texts])=>texts.map((text,i)=>({id:who+'-'+i,text,who,index:i})));
 assert.equal(expected.length,33);assert.equal(manifest.clips.length,expected.length);assert.equal(Object.keys(manifest.characters).length,9);
 assert.equal(new Set(manifest.clips.map(c=>c.id)).size,expected.length);
 for(const line of expected){const clip=manifest.clips.find(c=>c.id===line.id);assert.ok(clip,line.id);assert.equal(clip.text,line.text);assert.equal(clip.character,line.who);assert.equal(clip.index,line.index);assert.equal(clip.file,line.id+'.mp3');assert.equal(clip.sha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,clip.file))).digest('hex'));assert.ok(clip.duration>.35&&clip.duration<20);assert.ok(clip.peak>.01&&clip.peak<1);assert.ok(clip.rms>.005);}
});
check('声音缓存依据音频内容更新，换包不会沿用同名旧录音',()=>{
 const revision='vox-'+crypto.createHash('sha256').update(manifest.clips.map(c=>c.id+c.sha256).join('')).digest('hex').slice(0,16);
 assert.equal(manifest.revision,revision);const code=fs.readFileSync(path.join(root,'js/audio.js'),'utf8');assert.ok(code.includes("const VOICE_ASSET_REV = '"+revision+"';"));assert.ok(code.includes('.mp3?v=${VOICE_ASSET_REV}'));
});
check('来源记录完整，公开资源清单不带本机绝对路径或原始参考录音',()=>{
 assert.ok(manifest.review.includes('尚待人工试听'));for(const profile of Object.values(manifest.characters))assert.ok(manifest.references[profile.reference]);assert.equal(/"[A-Za-z]:[\\/]/.test(JSON.stringify(manifest)),false);assert.equal(fs.readdirSync(dir).some(f=>f.endsWith('.wav')),false);
});
console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
