/* 对照本轮前保存的隔离源码；固定时钟/随机数，比较状态、账号、磁盘与写入顺序。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'回归测试/_out/refactor-r4-baseline-20261019'),current=path.join(root,'孤屿遗章-游戏 - 发布');
function source(dir){const m=JSON.parse(fs.readFileSync(path.join(dir,'runtime-manifest.json'),'utf8'));return m.logic.map(file=>fs.readFileSync(path.join(dir,file),'utf8')).join('\n');}
const sources=[source(base),source(current)],copy=value=>JSON.parse(JSON.stringify(value));
function fresh(source,seed,disk={}){
 const trace=[],cookies=new Map(),math=Object.create(Math);let random=seed,failKey='';
 math.random=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
 class Clock extends Date{constructor(...args){super(...(args.length?args:[1792382400000]));}static now(){return 1792382400000;}}
 const storage={getItem:key=>disk[key]??null,setItem(key,value){trace.push(['set',key,String(value)]);if(key===failKey){const e=Error('quota');e.name='QuotaExceededError';throw e;}disk[key]=String(value);},removeItem(key){trace.push(['remove',key]);delete disk[key];}};
 const document={};Object.defineProperty(document,'cookie',{get(){return [...cookies].map(([k,v])=>k+'='+v).join('; ');},set(value){trace.push(['cookie',value]);const [k,v]=value.split(';')[0].split('=');cookies.set(k,v);}});
 const game=new Function('localStorage','window','document','Math','Date','console',source+';return Game;')(storage,{BUILD_VER:'comparison'},document,math,Clock,{warn(){}});
 game.bind({onLog(){},onChange(){},onOverlay(){},onFight(){},onEnding(){},onSaveFail(){trace.push(['save-failed']);},onSaveConflict(){trace.push(['conflict']);}});
 return {game,disk,trace,fail:key=>failKey=key};
}
function snapshot(e){return copy({state:e.game.S(),meta:e.game.metaState(),disk:e.disk,trace:e.trace});}
let passed=0;
for(let seed=1;seed<=16;seed++)for(let scenario=0;scenario<10;scenario++){
 const engines=sources.map(src=>fresh(src,seed));
 for(const e of engines){const g=e.game;g.newGame('fisher',seed%2?'normal':'hard');const s=g.S();s.tut=null;s.capacity=999;s.day=37;s.minute=713;g.addItem('wood',40,true);g.addItem('ironSword',2,true);g.metaState().soul=789;g.save();g.backupSlot(0);g.addItem('stone',13,true);g.save();e.trace.length=0;
  if(scenario===0){g.load();g.save();}
  if(scenario===1){e.disk.guyuyizhang_save='broken';g.load();g.save();}
  if(scenario===2){g.S().day=50;g.loadSlot(0);g.save();}
  if(scenario===3){const code=g.exportCode();g.S().day=55;assert.ok(g.importCode(code).ok);g.save();}
  if(scenario===4){const before=Object.fromEntries(['save','save_bak','savedAt','rev','meta','meta_bak'].map(k=>['guyuyizhang_'+k,e.disk['guyuyizhang_'+k]??null]));e.disk.guyuyizhang_write_journal=JSON.stringify({version:1,before});e.disk.guyuyizhang_save='partial';e.disk.guyuyizhang_meta='partial';const reboot=fresh(sources[engines.indexOf(e)],seed,copy(e.disk));reboot.game.load();e.game=reboot.game;e.disk=reboot.disk;e.trace=reboot.trace;}
  if(scenario===5){e.fail('guyuyizhang_save');assert.equal(g.loadSlot(0).ok,false);e.fail('');g.load();}
  if(scenario===6){e.disk.guyuyizhang_rev=String(Number(e.disk.guyuyizhang_rev)+20);assert.equal(g.save().ok,false);g.load();g.save();}
  if(scenario===7){const code=btoa(unescape(encodeURIComponent(JSON.stringify({meta:copy(g.metaState())}))));assert.ok(g.importCode(code).ok);g.load();}
  if(scenario===8){g.S()._snap={hidden:1};g.S()._dirty=true;g.S()._savedAt=5;g.exportCode();g.save();g.load();}
  if(scenario===9){e.disk.guyuyizhang_save='broken';e.disk.guyuyizhang_save_bak='also-broken';e.game=fresh(sources[engines.indexOf(e)],seed,e.disk).game;e.game.load();}
 }
 assert.deepEqual(snapshot(engines[1]),snapshot(engines[0]),`seed ${seed}, scenario ${scenario}`);
 assert.equal(engines[1].game.exportCode(),engines[0].game.exportCode(),`export bytes seed ${seed}, scenario ${scenario}`);
 passed++;
}
fs.writeFileSync(path.join(root,'回归测试/_out/refactor-storage-equivalence.json'),JSON.stringify({seeds:16,scenarios:10,cases:passed,state:true,profile:true,disk:true,writeTrace:true,exportCode:true},null,2));
console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
