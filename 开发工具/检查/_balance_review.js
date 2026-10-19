/* 固定种子的实战抽样；不读写玩家存档。node ... [输出名] */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../..');
const base = path.join(root, '孤屿遗章-游戏 - 发布/js');
const source = require('../../回归测试/helpers/runtime.js').logicFiles.map(f => fs.readFileSync(path.join(base, f), 'utf8')).join('\n');
const store = {};
const ls = { getItem:k=>store[k] || null, setItem:(k,v)=>store[k]=String(v), removeItem:k=>delete store[k] };
const {Game:G,ENEMIES} = new Function('localStorage','window','document', source+'\nreturn {Game,ENEMIES};')(ls,{},{});
G.bind({onLog(){},onChange(){},onEnding(){},onFight(){},onOverlay(){}});
const samples = 100, results = [];
const originalRandom = Math.random;
let seed;
const sets = [
  ['iron', 'ironSword', 'ironArmor', null],
  ['steel', 'steelSword', 'ironArmor', null],
  ['black', 'blackSword', 'blackArmor', null],
  ['blackShield', 'blackSword', 'blackArmor', 'steelShield'],
];
try {
  for (const difficulty of ['easy','normal','hard','legend']) for (const [gear,weapon,armor,off] of sets) {
    for (const enemy of ['boar','wolf','eagle','guard','slateGuard','pirateBoss','deepGuard','sunkenKing']) {
      let wins=0, hp=0, rounds=0;
      for (let trial=0;trial<samples;trial++) {
        seed=trial+12345;
        Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
        G.newGame('fisher',difficulty);
        const s=G.S(); s.capacity=999; s.minute=720; s.stats.hp=100;
        G.metaState().nodes={};
        G.addItem(weapon,1,true);G.addItem(armor,1,true);G.equip(weapon);G.equip(armor);
        if(off){G.addItem(off,1,true);G.equip(off);}
        G.startFight(ENEMIES[enemy],true);
        let turns=0;
        while(s.combat && !s.death && s.stats.hp>0 && turns++<150) G.fightAction('attack');
        if(!s.death && s.stats.hp>0 && !s.combat){wins++;hp+=s.stats.hp;}
        rounds+=turns;
      }
      results.push({difficulty,gear,enemy,samples,winRate:wins/samples,meanHpOnWin:wins?Math.round(hp/wins):0,meanTurns:+(rounds/samples).toFixed(1)});
    }
  }
} finally {Math.random=originalRandom;}
const out=path.join(root,'回归测试/_out');fs.mkdirSync(out,{recursive:true});
const name=process.argv[2] || 'balance';
if(!/^[a-z0-9_-]+$/i.test(name))throw Error('Invalid output name');
fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(results,null,2));
console.table(results.filter(r=>r.gear.startsWith('black') && ['eagle','guard'].includes(r.enemy)));
console.log('场景数 '+results.length+'，每场景 '+samples+' 次；无技能、无遗章、满血、仅普攻、不用药；结果不代表完整策略玩法。');
