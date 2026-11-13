/* 完整逻辑清单的隔离实例。时钟、随机和介质由测试提供，不读取作者或玩家数据。 */
const fs=require('node:fs'),path=require('node:path'),{logicFiles}=require('./runtime');
const root=path.resolve(__dirname,'../../孤屿遗章-游戏 - 发布/js');
function createEngine({seed=20261114,initial={},bridge,exposeChange=false}={}){
 const data=new Map(Object.entries(initial)),jar=new Map(),events=[];let calls=0,state=seed>>>0;
 const math=Object.create(Math);math.random=()=>{calls++;state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const epoch=Date.UTC(2026,10,14,6);class Clock extends Date{constructor(...a){super(...(a.length?a:[epoch]));}static now(){return epoch;}}
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
 const doc={get cookie(){return [...jar].map(([k,v])=>k+'='+v).join('; ');},set cookie(text){const [pair]=text.split(';'),i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}};
 let source=logicFiles.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
 source=source.replace('healthValue, pendingLootInfo','endFight, healthValue, pendingLootInfo');
 if(exposeChange)source=source.replace('healthValue, pendingLootInfo','change, healthValue, pendingLootInfo');
 const engine=new Function('localStorage','window','document','Math','Date','setTimeout','clearTimeout','console',source+';return {G:Game,ITEMS,RECIPES,ENEMIES,BUILDING_CHAINS};')(storage,bridge?{GuyuSaveBridge:bridge}:{},doc,math,Clock,()=>1,()=>{},{log(){},warn(){}});
 engine.G.bind({onLog:(text,cls)=>events.push(['log',text,cls]),onChange:()=>events.push(['change']),onFight:()=>events.push(['fight']),onEnding:(id,reason)=>events.push(['ending',id,reason]),onOverlay:cfg=>{events.push(['overlay',cfg.kind,cfg.title,cfg.choices?.map(x=>x.label)]);cfg.onShown?.();},onSaveFail:err=>events.push(['save-failure',err.name]),onSaveConflict:rev=>events.push(['conflict',rev])});
 return {...engine,data,storage,doc,jar,events,calls:()=>calls};
}
module.exports={createEngine};
