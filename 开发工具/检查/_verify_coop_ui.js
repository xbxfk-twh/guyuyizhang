/* 两个独立 Chrome 通过回环 HTTP 操作真实房间，广告由本地宿主回调模拟。 */
const assert = require('node:assert/strict');
const {spawn, execFileSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {openBrowser} = require('../../回归测试/helpers/browser');

const root = path.resolve(__dirname, '../..');
const python = process.env.PYTHON || 'python';
const db = path.join(fs.mkdtempSync(path.join(os.tmpdir(),'guyu-coop-ui-')), 'isolated.sqlite3');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = spawn(python,['-X','utf8',path.join(root,'开发工具/双人试验/server.py'),'--port','0','--db',db],{windowsHide:true});
let a,b,passed=0,logs='';
server.stderr.on('data', chunk => logs+=chunk.toString());

async function waitFor(name, condition, timeout=12000) {
  const end = Date.now()+timeout;
  while (Date.now()<end) {
    if (await condition()) return;
    await sleep(100);
  }
  throw new Error(name);
}
function check(name, condition) {
  assert.ok(condition,name);
  console.log('OK '+name);
  passed++;
}
const fakeHost = `
if(window===top){
  let nextAd;
  window.completeNextAd = ended => nextAd({isEnded:ended});
  window.tap = {createRewardedVideoAd(){return {
    onClose(fn){nextAd=fn;}, onLoad(){}, onError(){}, load(){return Promise.resolve();},
    show(){window.testAdShows=(window.testAdShows||0)+1;return Promise.resolve();}
  };}};
}
`;

function frame(browser) {
  const ev = expression => browser.ev(`(()=>{const win=document.querySelector('.coop-launch iframe')?.contentWindow;return win?.eval(${JSON.stringify(expression)});})()`);
  const tap = async selector => {
    const p = await browser.ev(`(()=>{
      const f=document.querySelector('.coop-launch iframe');
      const e=f.contentDocument.querySelector(${JSON.stringify(selector)});
      e.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
      const r=e.getBoundingClientRect(), x=r.x+r.width/2, y=r.y+r.height/2;
      if (!e.contains(f.contentDocument.elementFromPoint(x,y))) throw Error('控件未命中 '+e.outerHTML);
      const outer=f.getBoundingClientRect();
      return {x:outer.x+x,y:outer.y+y};
    })()`);
    await browser.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});
    await browser.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  };
  return {ev,tap};
}
const visible = id => `!document.querySelector(${JSON.stringify(id)}).hidden`;
const text = id => `document.querySelector(${JSON.stringify(id)}).textContent`;
async function open(browser,url) {
  await browser.navigate(url);
  await browser.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await waitFor('标题页尚未就绪',()=>browser.ev('!!document.querySelector("#btn-coop")'));
  await browser.tap('#btn-coop');
  const f = frame(browser);
  await waitFor('双人页面尚未就绪',()=>f.ev('!!document.querySelector("#create")'));
  return f;
}
const selectorFor = (f,label) => f.ev(`(()=>{
  const elements=[...document.querySelectorAll('#actions button,#places button')];
  const found=elements.find(e=>e.textContent===${JSON.stringify(label)}&&!e.disabled);
  if(!found)return '';
  found.dataset.probe='yes';
  return '[data-probe="yes"]';
})()`);
async function button(f,label){
  let selector;
  await waitFor('按钮不可用 '+label,async()=>{
    await f.ev("document.querySelector('[data-probe]')?.removeAttribute('data-probe')");
    selector=await selectorFor(f,label);
    return !!selector;
  });
  await f.tap(selector);
}

(async()=>{
  let startup='';
  server.stdout.on('data',d=>startup+=d.toString());
  await waitFor('未启动本地房间服务',()=>/127\.0\.0\.1:\d+/.test(startup));
  const url='http://'+startup.match(/127\.0\.0\.1:\d+/)[0]+'/index.html';
  [a,b]=await Promise.all([openBrowser({width:844,height:390,init:fakeHost}),openBrowser({width:390,height:844})]);
  const [fa,fb]=await Promise.all([open(a,url),open(b,url)]);
  await fa.tap('#create');
  await waitFor('建房后未进入地图',()=>fa.ev(visible('#room')));
  const code=(await fa.ev(text('#room-code'))).slice(-8);
  assert.match(code,/^[A-F0-9]{8}$/);
  await fb.ev(`document.querySelector('#join input').value=${JSON.stringify(code)}`);
  await fb.tap('#join button');
  await waitFor('另一设备未成功加入',()=>fb.ev(visible('#room')));
  await waitFor('房主未看到第二个位置标记',()=>fa.ev('document.querySelectorAll("#markers .marker").length===2'));
  check('横屏建房、窄竖屏加入，双色玩家标记及地图均可见',
    await fa.ev('document.querySelector(".map img").naturalWidth>0 && !!document.querySelector(".marker.blue") && !!document.querySelector(".marker.red")') &&
    await fb.ev('document.documentElement.scrollWidth===innerWidth'));
  await a.shot('coop-landscape.png');

  // 在临时测试库准备一笔足够长的制作任务，测试仍通过正常按钮开工和观看。
  execFileSync(python,['-X','utf8','-c',`
import json,sqlite3,sys
with sqlite3.connect(sys.argv[1]) as db:
 db.execute('BEGIN IMMEDIATE')
 room=json.loads(db.execute('SELECT state FROM rooms WHERE code=?',(sys.argv[2],)).fetchone()[0])
 room['players'][0]['bag'].update(wood=12,water=12)
 db.execute('UPDATE rooms SET state=? WHERE code=?',(json.dumps(room),sys.argv[2]))
`,db,code],{windowsHide:true});
  await waitFor('制作材料未刷新',()=>fa.ev('document.querySelector(".craft-form input").max==="12"'));
  const balance=await a.ev('Game.adCoinBalance()');
  await fa.ev("const input=document.querySelector('.craft-form input');input.value=12;input.dispatchEvent(new Event('input'))");
  await fa.tap('.craft-form button');
  await waitFor('长等待未显示广告',()=>fa.ev(visible('#wait-ad')));
  await fa.tap('#ad-button');
  await waitFor('宿主未收到广告请求',()=>a.ev('window.testAdShows===1'));
  await a.ev('completeNextAd(false)');
  await waitFor('退出广告未返回提示',()=>fa.ev(text('#notice')+' .includes("未完整观看")'));
  check('提前关闭不给奖励',await a.ev('Game.adCoinBalance()')===balance);
  await fa.tap('#ad-button');
  await waitFor('第二次广告未开始',()=>a.ev('window.testAdShows===2'));
  await a.ev('completeNextAd(true)');
  await waitFor('完整广告未到账',()=>fa.ev(text('#notice')+' .includes("已到账")'));
  const reward=await a.ev('Game.adCoinBalance()')-balance;
  check('完整观看向单机钱包发 3–6 币，长等待仍可播放',reward>=3&&reward<=6&&await fa.ev('!document.querySelector("#ad-button").disabled'));
  await waitFor('队友状态未刷新',()=>fb.ev(text('#partner-status')+' .includes("制作")'));
  check('队友左上角能看到制作状态',true);
  await a.shot('coop-wait-ad.png');

  // 再开一个战斗房，走真实邀请、选敌、攻击和从联机存档恢复。
  await fa.tap('#leave');await fb.tap('#leave');
  await waitFor('未退回大厅',async()=>await fa.ev(visible('#lobby'))&&await fb.ev(visible('#lobby')));
  await fa.tap('#create');
  await waitFor('第二个房间未建好',()=>fa.ev(visible('#room')));
  const second=(await fa.ev(text('#room-code'))).slice(-8);
  await fb.ev(`document.querySelector('#join input').value=${JSON.stringify(second)}`);
  await fb.tap('#join button');
  await waitFor('未加入战斗房',()=>fb.ev(visible('#room')));
  await Promise.all([button(fa,'树林'),button(fb,'树林')]);
  await button(fa,'邀请并肩作战');
  await waitFor('队友未收到邀请',()=>fb.ev('document.querySelector("#invitation").open'));
  await b.shot('coop-invite-portrait.png');
  await fb.tap('#accept');
  for (const f of [fa,fb]) await waitFor('双方未进入双敌战斗',()=>f.ev('document.querySelectorAll("#combat .foe").length>=2'));
  await Promise.all([fa.tap('.foe:nth-child(1) .buttons button:nth-child(1)'),fb.tap('.foe:nth-child(2) .buttons button:nth-child(1)')]);
  await waitFor('未显示各自选中的目标',()=>fa.ev('!!document.querySelector(".foe:nth-child(1) .target-mark.blue")&&!!document.querySelector(".foe:nth-child(2) .target-mark.red")'));
  const hp=f=>f.ev('[...document.querySelectorAll("#combat .foe progress")].slice(0,2).map(n=>n.value)');
  const before=await hp(fa);
  await Promise.all([fa.tap('.foe:nth-child(1) .buttons button:nth-child(2)'),fb.tap('.foe:nth-child(2) .buttons button:nth-child(2)')]);
  await waitFor('双端攻击未分别扣两个目标生命',async()=>{const after=await hp(fa);return after[0]<before[0]&&after[1]<before[1];});
  check('两人同时攻击各自选中的敌人',true);
  await a.shot('coop-battle-landscape.png');
  await fb.tap('#leave');
  await waitFor('队友离线未同步',()=>fa.ev(text('#partner-status')+' .includes("离线")'));
  await fb.tap('#saved-rooms button');
  await waitFor('联机存档未回到原座位和战斗',()=>fb.ev(visible('#combat')));
  check('离开再从本机联机存档回到同一座位和战斗',await fb.ev(text('#room-code')+' .endsWith('+JSON.stringify(second)+')'));
  assert.deepEqual([...a.errors,...b.errors],[]);
  console.log('通过 '+passed+' 项，失败 0 项\nRESULT:PASS');
})().catch(e=>{
  console.error(e,logs);
  console.log('RESULT:FAIL');
  process.exitCode=1;
}).finally(async()=>{
  await Promise.all([a?.close(),b?.close()]);
  server.kill();
});
