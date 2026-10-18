/* 从真实上一版ZIP加载旧引擎生成存档，再交给现版读取。仅内存，不执行网页脚本。 */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'), archive=process.argv[2] || path.join(root,'孤屿遗章_发布版_v1.08.zip');
const raw=spawnSync('python',['-X','utf8','-c',`import sys,json,zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
 print(json.dumps([z.read('guyuyizhang/js/'+n).decode('utf-8-sig') for n in ['data.js','game.js']],ensure_ascii=False))`,archive],{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
assert.equal(raw.status,0,raw.stderr);
const oldSource=JSON.parse(raw.stdout).join('\n');
const currentSource=['data.js','game.js'].map(f=>fs.readFileSync(path.join(root,'孤屿遗章-游戏 - 发布/js',f),'utf8')).join('\n');
const copy=x=>JSON.parse(JSON.stringify(x));
function create(source,store){const ls={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};const g=new Function('localStorage','window','document','console',source+'\nreturn Game;')(ls,{},{cookie:''},{log(){},warn(){}});g.bind({onChange(){},onLog(){},onOverlay(){},onEnding(){},onFight(){}});return g;}
let pass=0;
try {
  for(const difficulty of ['easy','normal','hard','legend']) {
    const store={},old=create(oldSource,store);old.newGame('fisher',difficulty);let s=old.S();s.capacity=999;s.day=37;s.minute=700;s.tut=null;
    old.addItem('blackSword',1,true);old.addItem('ironArmor',1,true);old.equip('blackSword');old.equip('ironArmor');s.toolDurs.blackSword=[23];
    s.flags.ended_C=1;s.flags.settled_A=1;s.flags.settledEnding='A';s.exp.craft=120;s.livestock={pen:[],coop:[{age:3}],autoFeed:true};
    s.atlantis={unlocked:1,stoneActive:1,quest:2,camp:{furniture:{repair:1},buildings:{}}};
    old.metaState().soul=789;old.metaState().nodes={whet:2};assert.equal(old.backupSlot(0).ok,true);assert.equal(old.save().ok,true);
    const expected=copy(s),code=old.exportCode();
    const fields=['inv','equipment','toolDurs','flags','tree','skillPicks','exp','atlantis','livestock'];
    for(const route of ['main','slot','code']){
      const disk=copy(store),g=create(currentSource,disk);
      if(route==='main') assert.equal(g.load(),true);
      if(route==='slot')assert.equal(g.loadSlot(0).ok,true);
      if(route==='code'){assert.equal(g.importCode(code).ok,true);assert.equal(g.loadSlot(0).ok,true);}
      assert.equal(g.S().day,37);assert.equal(g.S().difficulty,difficulty);assert.equal(g.metaState().soul,789);
      for(const field of fields) {
        if(field==='toolDurs') {
          // 新旧读档器都会为未持有的耐久物品补空数组；已持有实例必须逐项原样保留。
          for(const id of Object.keys(expected.toolDurs))assert.deepEqual(g.S().toolDurs[id],expected.toolDurs[id],id);
          for(const id of Object.keys(g.S().toolDurs))if(!(id in expected.toolDurs))assert.deepEqual(g.S().toolDurs[id],[],id);
        } else assert.deepEqual(g.S()[field],expected[field],difficulty+' '+route+' '+field);
      }
      assert.equal(g.save().ok,true);assert.equal(g.load(),true);assert.equal(g.S().toolDurs.blackSword[0],23);
      pass++;console.log('OK 上一版 '+difficulty+' '+route+' 进度与耐久保留');
    }
  }
  console.log(`通过 ${pass} 项，失败 0 项\nRESULT:PASS`);
}catch(e){console.error(e.stack);console.log('RESULT:FAIL');process.exitCode=1;}
