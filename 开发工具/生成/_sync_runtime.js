/* 静态入口由单一加载清单生成；游戏运行不fetch清单，保留file://和WebView。 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../孤屿遗章-游戏 - 发布');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'runtime-manifest.json'),'utf8'));
const file=path.join(root,'index.html');let html=fs.readFileSync(file,'utf8');
const version=html.match(/window\.BUILD_VER\s*=\s*'([^']+)'/)[1];
const all=[...manifest.styles,...manifest.scripts],logic=manifest.logic;
if(new Set(all).size!==all.length||!logic.length||new Set(logic).size!==logic.length||JSON.stringify(manifest.scripts.filter(name=>logic.includes(name)))!==JSON.stringify(logic))throw Error('运行或逻辑清单重复、缺项、顺序错误');
for(const name of [...manifest.styles,...manifest.scripts])if(!fs.existsSync(path.join(root,name)))throw Error('加载清单文件缺失：'+name);
const css=manifest.styles.map(x=>`  <link rel="stylesheet" href="${x}?v=${version}">`).join('\n');
const scripts=manifest.scripts.map(x=>`  <script src="${x}?v=${version}"></script>`).join('\n');
html=html.replace(/  <link rel="stylesheet"[^\n]*(?:\r?\n  <link rel="stylesheet"[^\n]*)*/,css);
html=html.replace(/  <script src=[^\n]*(?:\r?\n  <script src=[^\n]*)*/,scripts);
fs.writeFileSync(file,html.replace(/\r?\n/g,'\r\n'));
console.log(`静态加载入口已同步：${manifest.scripts.length} JS + ${manifest.styles.length} CSS`);
