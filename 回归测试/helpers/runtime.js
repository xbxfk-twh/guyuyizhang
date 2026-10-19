/* 逻辑测试与游戏静态入口共享加载清单，不再在各探针硬编码data+game。 */
const fs=require('node:fs'),path=require('node:path');
const defaultRoot=path.resolve(__dirname,'../../孤屿遗章-游戏 - 发布');
function readManifest(root){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'runtime-manifest.json'),'utf8'));
 const all=[...manifest.styles,...manifest.scripts],logic=manifest.logic;
 if(new Set(all).size!==all.length||!logic.length||new Set(logic).size!==logic.length||JSON.stringify(manifest.scripts.filter(name=>logic.includes(name)))!==JSON.stringify(logic))throw Error('运行或逻辑清单重复、缺项、顺序错误');
 for(const name of all)if(!/^(js\/.+\.js|css\/.+\.css)$/.test(name)||name.split('/').includes('..')||!fs.existsSync(path.join(root,name)))throw Error('清单路径或文件无效：'+name);
 return manifest;
}
const manifest=readManifest(defaultRoot);
function engineSource(gameFile=path.join(defaultRoot,'js/game.js')) {
 const root=path.dirname(path.dirname(gameFile));
 const list=readManifest(root).logic;
 return list.filter(name=>name!=='js/data.js').map(name=>fs.readFileSync(path.join(root,name),'utf8')).join('\n');
}
module.exports={logicFiles:manifest.logic.map(name=>name.replace(/^js\//,'')),engineSource};
