/* 检查器必须检查当前检出目录，不得偷读作者桌面上另一份源码。 */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');let passed=0;const check=(name,fn)=>{fn();passed++;console.log('OK '+name);};
check('核心检查不含作者机器上的绝对项目路径',()=>{
 const runner=fs.readFileSync(path.join(__dirname,'run.js'),'utf8').split("if (args.includes('--browser'))")[0];
 const files=[...runner.matchAll(/'(回归测试\/[\w.-]+\.js|开发工具\/检查\/[\w.-]+\.js)'/g)].map(m=>m[1]);
 for(const file of files){const source=fs.readFileSync(path.join(root,file),'utf8');assert.ok(!/['"][A-Za-z]:(?:\\\\|\/)[^'"\r\n]*(?:Desktop|孤屿遗章)[^'"\r\n]*['"]/.test(source),file);}
 assert.ok(files.length>=40);
});
check('热点检查在任意目录运行时确实读取相邻检出的数据文件',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'guyu-source-isolation-')),probe=path.join(temp,'开发工具/检查/_verify_hotspots.js'),data=path.join(temp,'孤屿遗章-游戏 - 发布/js/data.js');
 fs.mkdirSync(path.dirname(probe),{recursive:true});fs.mkdirSync(path.dirname(data),{recursive:true});fs.copyFileSync(path.join(root,'开发工具/检查/_verify_hotspots.js'),probe);fs.writeFileSync(data,"throw Error('isolated-source-marker');");
 const result=spawnSync(process.execPath,[probe],{cwd:os.tmpdir(),encoding:'utf8',windowsHide:true});assert.notEqual(result.status,0);assert.ok(result.stderr.includes('isolated-source-marker'),result.stderr);
});
console.log(`通过 ${passed} 项，失败 0 项\nRESULT:PASS`);
