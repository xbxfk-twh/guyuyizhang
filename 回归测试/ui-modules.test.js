const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../孤屿遗章-游戏 - 发布');
let passed=0;const check=(name,fn)=>{fn();passed++;console.log('OK '+name);};
const timers=new Map();let serial=0;
const press=new Function('setTimeout','clearTimeout',fs.readFileSync(path.join(root,'js/ui/input/press.js'),'utf8')+';return PressInput;')(fn=>{timers.set(++serial,fn);return serial;},id=>timers.delete(id));
class Button{
 constructor(){this.events={};this.isConnected=true;this.disabled=false;this.locked=false;this.classList={contains:()=>this.locked};}
 addEventListener(type,fn){(this.events[type]??=new Set()).add(fn);}
 removeEventListener(type,fn){this.events[type]?.delete(fn);}
 dispatch(type,extra={}){for(const fn of this.events[type]||[])fn({clientX:0,clientY:0,button:0,preventDefault(){},...extra});}
}
check('100次重绑仍每种事件一个监听、一次点击执行一次最新动作',()=>{
 const b=new Button();let taps=0;for(let i=0;i<100;i++)press.bind(b,()=>taps++);for(const listeners of Object.values(b.events))assert.equal(listeners.size,1);
 b.dispatch('pointerdown');b.dispatch('pointerup');b.dispatch('click',{detail:1});assert.equal(taps,1);press.dispose(b);
});
check('刷新更新动作不打断长按；长按后松手不再短按',()=>{
 const b=new Button();let taps=0,long=0;press.bind(b,()=>taps++,()=>long++);b.dispatch('pointerdown');const oldTimer=[...timers.keys()][0];press.bind(b,()=>taps+=10,()=>long+=10);assert.ok(timers.has(oldTimer));timers.get(oldTimer)();timers.delete(oldTimer);b.dispatch('pointerup');assert.equal(long,10);assert.equal(taps,0);press.dispose(b);
});
check('滚动、取消、离开及节点退役均不触发点击或遗留计时器',()=>{
 for(const event of ['pointermove','pointercancel','pointerleave','dispose']){const b=new Button();let calls=0;press.bind(b,()=>calls++,()=>calls++);b.dispatch('pointerdown');if(event==='dispose')press.dispose(b);else b.dispatch(event,{clientX:30});b.dispatch('pointerup',{clientX:30});assert.equal(calls,0);assert.equal(timers.size,0);press.dispose(b);}
});
check('禁用/锁定按钮、非主指针及没有按下的松手不执行动作',()=>{
 const b=new Button();let calls=0;press.bind(b,()=>calls++);b.disabled=true;b.dispatch('pointerdown');b.dispatch('pointerup');b.disabled=false;b.locked=true;b.dispatch('click',{detail:0});b.locked=false;b.dispatch('pointerdown',{isPrimary:false});b.dispatch('pointerup');assert.equal(calls,0);press.dispose(b);
});
check('复用提案将动作转移到原节点，提案监听随即退役',()=>{
 const a=new Button(),b=new Button();let n=0;press.bind(a,()=>n++);press.bind(b,()=>n+=5);press.adopt(a,b);a.dispatch('click',{detail:0});b.dispatch('click',{detail:0});assert.equal(n,5);press.dispose(a);assert.equal(timers.size,0);
});
const registry=new Function(fs.readFileSync(path.join(root,'js/ui/panel-registry.js'),'utf8')+';return GamePanels.create();')();
check('面板注册保留暂停/关闭权限，动作面板仍可以推进时间',()=>{
 for(const key of ['inv','equip','warehouse','skilltree','guide','mailbox','settings','satchelfood','adshop'])assert.equal(registry.get(key).freeze,true,key);
 for(const key of ['camp','craft','farm','town','sleeppick','repair'])assert.ok(!registry.get(key).freeze,key);
 assert.equal(registry.get('winter').dismiss,true);assert.ok(!registry.get('overlay').dismiss);assert.ok(!registry.get('combat').dismiss);
 registry.register('satchelfood',{render:()=>'',back:'satchelSettings'});assert.equal(registry.get('satchelfood').freeze,true);assert.equal(registry.get('satchelfood').back,'satchelSettings');
});
check('静态入口完全按清单顺序加载，包含全部新模块与一致缓存号',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'runtime-manifest.json'),'utf8')),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const version=html.match(/window.BUILD_VER = '([^']+)'/)[1],refs=[...html.matchAll(/(?:src|href)="((?:js|css)\/[^"<>]+)"/g)].map(m=>m[1]);
 assert.deepEqual(refs,[...manifest.styles,...manifest.scripts].map(x=>x+'?v='+version));for(const file of [...manifest.styles,...manifest.scripts])assert.ok(fs.existsSync(path.join(root,file)),file);
 assert.ok(manifest.scripts.indexOf('js/ui/input/press.js')<manifest.scripts.indexOf('js/ui.js'));
});
console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
