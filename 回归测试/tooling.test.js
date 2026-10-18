/* 验证测试入口不会把断言失败、崩溃或缺失结果标记误报为成功。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const os = require('node:os');
const audit = fs.readFileSync(path.join(__dirname, 'audit.js'), 'utf8');
for (const [checks, expected] of [
  ['const FAIL = 0;', 0], ['const FAIL = 1;', 1], ['throw Error("fixture crash");', 1],
]) {
  const proc = { exitCode: 0 };
  vm.runInNewContext(audit, {
    __dirname, process: proc, console: { log() {} },
    require: name => name === 'fs' ? {
      readFileSync: file => file.endsWith('checks.js') ? checks : '',
    } : require(name),
  });
  assert.equal(proc.exitCode, expected);
}
// 独立临时目录模拟检查输出，不触碰真实游戏和测试文件。
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'guyu-tooling-'));
try {
  const regression = path.join(temp, '回归测试');
  const probes = path.join(temp, '开发工具', '检查');
  fs.mkdirSync(regression, { recursive: true });
  fs.mkdirSync(probes, { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'run.js'), path.join(regression, 'run.js'));
  fs.writeFileSync(path.join(regression, 'feedback.test.js'), 'console.log("RESULT:PASS");');
  fs.writeFileSync(path.join(regression, 'release-safety.test.js'), 'console.log("RESULT:PASS");');
  for (const name of ['_smoke_test', '_verify_all', '_verify_save_safe', '_audit_announcement']) {
    fs.writeFileSync(path.join(probes, name + '.js'), 'console.log("RESULT:PASS");');
  }
  for (const [script, expected] of [
    ['console.log("RESULT:PASS");', 0],
    ['console.log("RESULT:FAIL");', 1],
    ['console.log("RESULT:PASS"); process.exitCode = 1;', 1],
    ['console.log("没有结果标记");', 1],
  ]) {
    fs.writeFileSync(path.join(regression, 'audit.js'), script);
    const result = spawnSync(process.execPath, [path.join(regression, 'run.js')], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, expected, result.stdout + result.stderr);
  }
} finally {
  // temp 由 mkdtempSync 在系统临时目录创建，绝不使用用户提供的删除路径。
  assert.equal(path.dirname(temp), os.tmpdir());
  fs.rmSync(temp, { recursive: true, force: true });
}
console.log('PASS 工具入口：7 个成功/失败/崩溃场景');
