/* 成长整合：所有存储、随机和存档均隔离，不接触玩家数据。 */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const src=require('./helpers/runtime.js').logicFiles.map(f=>fs.readFileSync(path.join(__dirname,'../孤屿遗章-游戏 - 发布/js',f),'utf8')).join('\n');
function fresh(){const store={},math=Object.create(Math),control={random:.99,failKey:null};math.random=()=>typeof control.random==='function'?control.random():control.random;
 const e=new Function('localStorage','window','document','console','Math','setTimeout','clearTimeout',src+'\nreturn {G:Game,ITEMS,RECIPES,DURA,ENEMIES,DIFFICULTIES,BUILDING_CHAINS,SCENES,FURNITURE};')({getItem:k=>store[k]??null,setItem(k,v){if(control.failKey===k){control.failKey=null;throw Error('quota');}store[k]=String(v);},removeItem:k=>delete store[k]}, {},{cookie:''},{log(){},warn(){}},math,()=>1,()=>{});
 const overlays=[];e.G.bind({onChange(){},onLog(){},onFight(){},onOverlay(c){overlays.push(c);c.onShown?.();},onEnding(){},onSaveFail(){}});e.G.newGame('fisher','normal');const s=e.G.S();s.tut=null;s.capacity=999;s.inv={};s.toolkit=[null,null,null];s.stats.stamina=9999;s.weather='sun';s._testNoAmbush=true;return {...e,store,control,overlays};}

module.exports={fresh};
