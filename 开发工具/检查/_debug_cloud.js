/* 云存档（TapTap 小游戏云存档 v4）专项探针：
   用一个假的 window.tap（含 FileSystemManager + CloudSaveManager）在 Node 里跑真实 game.js，
   验证：没 tap 时静默跳过 / 上传节流一分钟一次 / 换设备能从云端恢复 / 旧云档不会覆盖新本地档。
   用法：node _debug_cloud.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '孤屿遗章-游戏 - 发布');
const DATA = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const GAME = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');

// ---- 假的本地文件系统 + 假的云 ----
// ⚠️ 两种文件 API 都要测：TapTap 真机是【回调风格】writeFile({filePath,data,encoding,success,fail})，
//    没有 writeFileSync —— 第一版上线就是栽在这（"fs2.writeFileSync is not a function"）。
function makeEnv(style) {
  const files = {}, cloudStore = [], calls = { create: 0, update: 0, list: 0, data: 0, write: 0 };
  const fsm = {};
  if (style === 'sync') {
    fsm.writeFileSync = (p, d) => { files[p] = String(d); calls.write++; };
    fsm.readFileSync = (p) => { if (!(p in files)) throw new Error('no file ' + p); return files[p]; };
  } else {                       // 回调风格（TapTap 真机）
    fsm.writeFile = (o) => { try { files[o.filePath] = String(o.data); calls.write++; o.success && o.success({}); } catch (e) { o.fail && o.fail({ errMsg: 'write fail' }); } };
    fsm.readFile = (o) => { if (!(o.filePath in files)) { o.fail && o.fail({ errMsg: 'no such file' }); return; } o.success && o.success({ data: files[o.filePath] }); };
  }
  const tap = {
    env: { USER_DATA_PATH: '/userdata' },
    getFileSystemManager: () => fsm,
    getCloudSaveManager: () => ({
    createArchive: (o) => {
      calls.create++;
      const uuid = 'uuid-' + calls.create;
      cloudStore.push({ uuid, fileId: 'f' + calls.create, name: o.archiveMetaData.name, modifiedTime: Math.floor(Date.now() / 1000), body: files[o.archiveFilePath] });
      o.success && o.success({ uuid, fileId: 'f' + calls.create });
    },
    updateArchive: (o) => {
      calls.update++;
      const s = cloudStore.find(x => x.uuid === o.archiveUUID);
      if (s) { s.body = files[o.archiveFilePath]; s.modifiedTime = Math.floor(Date.now() / 1000); }
      o.success && o.success({ uuid: o.archiveUUID, fileId: 'f' + calls.update });
    },
    getArchiveList: (o) => { calls.list++; o.success && o.success({ saves: cloudStore.map(s => ({ uuid: s.uuid, fileId: s.fileId, name: s.name, modifiedTime: s.modifiedTime })) }); },
    getArchiveData: (o) => {
      calls.data++;
      const s = cloudStore.find(x => x.uuid === o.archiveUUID);
      if (!s) { o.fail && o.fail({ errMsg: 'not found' }); return; }
      const p = '/tmp/cloud_' + s.uuid + '.json'; files[p] = s.body;
      o.success && o.success({ filePath: p });
    },
    }),
  };
  return { tap, files, cloudStore, calls };
}

const store = {};
const fakeLS = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};

const PROBE = `
return (async () => {
const G = Game;
const tick = () => new Promise(r => setTimeout(r, 30));   // cloudPush 内部是"先写文件再上传"的异步链
let bad = 0;
const P = (k, v) => console.log('  ' + k + ' → ' + v);
const EQ = (name, got, want) => { const ok = (typeof want === 'number' && Math.abs(got - want) < 1e-6) || got === want; if (!ok) bad++; console.log((ok ? '  ok   ' : '  FAIL ') + name + ' — ' + got + (ok ? '' : '（应为 ' + want + '）')); };

console.log('【1】有 tap：初始化 → 云端还没有档（createArchive 一次，写入本地文件一次）');
EQ('supported', G.cloudStatus().supported, true);
EQ('第一次列表查询次数', CALLS.list, 1);
EQ('云端为空、还没开局 → 不乱建档', CALLS.create, 0);
EQ('还没进度时也不上传（不吃掉一分钟一次的配额）', G.cloudPush(false), false);

G.newGame('fisher', 'normal');
await tick();
P('新开一局后 save() → 应该触发一次上传（当前文件 API：' + STYLE + '）', '');
EQ('createArchive 调了 1 次', CALLS.create, 1);
EQ('上传前先写了本地文件', CALLS.write >= 1, true);
P('云端里那份的字节数', CLOUD[0] ? CLOUD[0].body.length : 0);
{
  const pack = JSON.parse(CLOUD[0].body);
  EQ('云端包里带了 savedAt / save / meta', !!(pack.savedAt && pack.save && pack.meta), true);
  const j = JSON.parse(pack.save);
  P('云端存档内容', '第 ' + j.day + ' 天 · ' + j.identity);
}

console.log('【2】一分钟内再存：必须被节流（官方限制 60 秒一次）');
{
  const before = CALLS.create + CALLS.update;
  G.S().day = 3; G.save();
  G.S().day = 4; G.save();
  await tick();
  EQ('节流生效：没有再上传', CALLS.create + CALLS.update, before);
}

console.log('【3】换设备：本地是空的，云端有第 7 天 → 应该自动恢复');
{
  Object.keys(LS).forEach(k => delete LS[k]);              // 模拟"新手机，啥都没有"
  const pack = JSON.parse(CLOUD[0].body);
  const j = JSON.parse(pack.save); j.day = 7; j.scene = 'camp';
  pack.save = JSON.stringify(j); pack.savedAt = Date.now() + 60000;   // 云端更新
  CLOUD[0].body = JSON.stringify(pack);
  G.cloudInit();
  await tick();
  EQ('云端的"第 7 天"被写回了本地', JSON.parse(localStorage.getItem('guyuyizhang_save')).day, 7);
  EQ('状态里记下了恢复的进度', G.cloudStatus().applied, 7);
  P('提示', G.cloudStatus().msg);
}

console.log('【4】旧云档不能覆盖新本地档');
{
  const before = localStorage.getItem('guyuyizhang_save');
  const pack = JSON.parse(CLOUD[0].body);
  pack.savedAt = Date.now() - 3600 * 1000;                  // 云端那份是"一小时前"的
  CLOUD[0].body = JSON.stringify(pack);
  G.cloudInit();
  await tick();
  EQ('本地没被旧档覆盖', localStorage.getItem('guyuyizhang_save'), before);
}

return bad;
})();
`;

(async () => {
  let bad = 0;
  for (const style of ['sync', 'callback']) {
    const env = makeEnv(style);
    Object.keys(store).forEach(k => delete store[k]);     // 每个风格都从干净的本地存储开始
    const r = await new Function('localStorage', 'window', 'document', 'fs', 'ROOT', 'DATA', 'GAME', 'console', 'CALLS', 'CLOUD', 'LS', 'STYLE',
      DATA + '\n' + GAME + '\n' + PROBE)(fakeLS, { tap: env.tap }, {}, fs, ROOT, DATA, GAME, console, env.calls, env.cloudStore, store, style);
    bad += r || 0;
  }
  console.log(bad ? ('\\n✗ 有 ' + bad + ' 项不对') : '\\n✓ 云存档逻辑全部通过（sync + 回调两种文件 API 都测了）');
  process.exit(bad ? 1 : 0);   // 别被云同步的节流定时器拖住
})();
