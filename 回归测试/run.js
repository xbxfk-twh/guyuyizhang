/* 统一检查入口：node 回归测试/run.js [--browser]
   每项输出保存到 _out；退出码和 RESULT 标记必须同时成功。 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const out = path.join(__dirname, '_out');
const args = process.argv.slice(2);
// --only=<片段>：只跑名字里含该片段的检查组（不含 --only 时跑全部）。
// 为什么加：改一处就跑 12 组，输出和日志翻查很占上下文；开发中先用它做快速自检，
// **提交前仍然必须跑一次不带 --only 的完整回归**。
const onlyArg = args.find(a => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length) : '';
if (args.some(arg => arg !== '--browser' && !arg.startsWith('--only='))) {
  console.error('用法：node 回归测试/run.js [--browser] [--only=audit|checks|feedback|layout|scenes|...]');
  process.exit(1);
}
fs.mkdirSync(out, { recursive: true });
const checks = [
  '回归测试/sword-unity.test.js', '回归测试/camp-inventory.test.js', '回归测试/language.test.js',
  '回归测试/remote-redeem.test.js',
  '回归测试/legacy-latest.test.js',
  '回归测试/focus-cellar.test.js',
  '回归测试/rain-inventory.test.js',
  '回归测试/warehouse-recipe-food.test.js',
  '回归测试/october07-storage.test.js',
  '回归测试/divine-packs.test.js',
  '回归测试/toolkit-manual.test.js', '回归测试/lantern-hive-water.test.js', '回归测试/taptap-oct16.test.js', '回归测试/progression-plan.test.js',
  '回归测试/scene-storage-crop.test.js',
  '回归测试/warehouse-loadout-feedback.test.js',
  '回归测试/travel-continuation.test.js',
  '回归测试/battle-presentation.test.js',
  '回归测试/nightmare.test.js',
  '回归测试/mobile-overhaul.test.js',
  '回归测试/loadout-storage.test.js',
  '回归测试/lottery-simple.test.js',
  '回归测试/ui-modules.test.js', '回归测试/storage-modules.test.js', '回归测试/session-migrations.test.js', '回归测试/ads.test.js', '回归测试/ad-adapter.test.js',
  '回归测试/audit.js',
  '回归测试/feedback.test.js',
  '回归测试/release-safety.test.js',
  '回归测试/dawn-revive.test.js',
  '回归测试/fishman-equip.test.js',
  '回归测试/player-feedback.test.js',
  '回归测试/career-temperature-cloud.test.js',
  '回归测试/audio-theme.test.js',
  '回归测试/october-batch.test.js',
  '回归测试/october-simplify.test.js',
  '开发工具/检查/_smoke_test.js',
  '开发工具/检查/_verify_all.js',
  '开发工具/检查/_verify_save_safe.js',
  '开发工具/检查/_audit_announcement.js',
  // 场景热点标签重叠：纯静态计算（读 data.js），但正是它抓出了"洞穴热点挤在一起"那类反馈，
  // 所以固定在 core 组里跑，不再依赖浏览器探针。
  '开发工具/检查/_verify_hotspots.js',
  // 接线审计：每一份数据都要有真的入口/来源（2026-09-25 加 —— 「对岸美食家」数据齐全却进不去，
  // 这类"数据对、界面没接上"的 bug 不会让别的测试变红，只有从数据反查入口才抓得到）
  '开发工具/检查/_audit_wiring.js',
];
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_weapon_ui.js', '开发工具/检查/_verify_lantern.js', '开发工具/检查/_verify_oct16_feedback.js');
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_android_host.js', '开发工具/检查/_verify_storage_spoil.js', '开发工具/检查/_verify_camp_art.js', '开发工具/检查/_verify_inventory_compact.js', '开发工具/检查/_verify_mobile_refresh.js', '开发工具/检查/_verify_player_tabs_build.js', '开发工具/检查/_verify_language.js', '开发工具/检查/_verify_warehouse_feedback.js', '开发工具/检查/_verify_combat_resume.js', '开发工具/检查/_verify_camp_inventory_ui.js');
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_activity_order_mobile.js', '开发工具/检查/_verify_focus_cellar_camp.js', '开发工具/检查/_verify_rain_inventory.js', '开发工具/检查/_verify_storage_recipe_touch.js', '开发工具/检查/_verify_october07_ui.js', '开发工具/检查/_verify_divine_packs_ui.js', '开发工具/检查/_verify_plain_controls.js', '开发工具/检查/_verify_scene_crop_storage.js', '开发工具/检查/_verify_warehouse_feedback_ui.js', '开发工具/检查/_verify_scenes.js', '开发工具/检查/_verify_feedback_ui.js', '开发工具/检查/_verify_ui_layout.js', '开发工具/检查/_verify_newgame_confirm.js', '开发工具/检查/_verify_camp_panel.js', '开发工具/检查/_verify_atl_light.js', '开发工具/检查/_verify_third_batch.js', '开发工具/检查/_verify_status_badges.js', '开发工具/检查/_verify_settle_entry.js', // 老潮兑换：2026-09-25 定稿成"沿用出售那一套"（点一下换 1 份 / 长按批量，删掉「全部」+二次确认），
// 所以旧的 _verify_shell_confirm.js 改名成 _verify_exchange_flow.js，断言的契约跟着换。
'开发工具/检查/_verify_exchange_flow.js', '开发工具/检查/_verify_skins.js', '开发工具/检查/_verify_furn_slot.js', '开发工具/检查/_verify_guide.js', '开发工具/检查/_verify_craft_panel.js', '开发工具/检查/_verify_ui_compact.js', '开发工具/检查/_verify_share.js');
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_plank_processing.js');
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_progression_ui.js');
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_season_backgrounds.js');
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_extra_slot_ui.js');
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_equipment_art.js');
// 2026-09-25 批次：冬季弹窗（含"不和其他弹窗抢屏幕"的排队）/ 石龛真三选一 / 睡眠里的中毒流血 / 冬季采雪
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_winter_batch.js');
// 最后一击"停一秒"要停在结算之后（血条显示 0）—— 作者 2026-09-25
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_kill_pause.js');
// 战斗批：重击/必中的按钮与冷却、必中真的必中、老档迁移、混装射速 —— 作者 2026-09-25
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_combat_batch.js');
// 对岸美食家是否真的进得去（作者 2026-09-25 复核：曾经数据和配方都在、界面却进不去）
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_town_gourmet.js');
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_room_batch.js');
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_trade_lottery.js');
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_simplify.js');
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_ads.js','开发工具/检查/_verify_incremental_ui.js');
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_nightmare_ui.js');
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_mobile_overhaul_ui.js');
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_battle_board.js', '开发工具/检查/_verify_travel_danger.js');
if (args.includes('--browser')) checks.push('开发工具/检查/_verify_color_work.js');
let failed = 0;
const picked = only ? checks.filter(f => f.includes(only)) : checks;
if (only && !picked.length) { console.error('没有匹配 --only=' + only + ' 的检查组'); process.exit(1); }
for (const file of picked) {
  const result = spawnSync(process.execPath, [path.join(root, file)], {
    cwd: root, encoding: 'utf8', timeout: 180000, windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  const output = (result.stdout || '') + (result.stderr || '') + (result.error ? '\n' + result.error.message : '');
  const log = path.join(out, path.basename(file, '.js') + '.log');
  fs.writeFileSync(log, output);
  const passed = result.status === 0 && /^RESULT:PASS\s*$/m.test(output) && !/^RESULT:(FAIL|CRASH)\s*$/m.test(output);
  if (!passed) failed++;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${file} ${output.match(/通过 \d+ 项，失败 \d+ 项/)?.[0] || ''}`);
  if (!passed) console.error(output.slice(-3000));
}
console.log(`检查组：${picked.length - failed} 通过，${failed} 失败${only ? '（只跑了匹配 "' + only + '" 的组）' : ''}；完整日志：${out}`);
process.exitCode = failed ? 1 : 0;
