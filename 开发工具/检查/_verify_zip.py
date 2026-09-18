# 发布包终检：确认 zip 里装的是 v1.06 的最新内容
import zipfile, json, re

Z = r'C:\Users\34297\Desktop\孤屿遗章\孤屿遗章_发布版_v1.06.zip'
NEW_ITEMS = ['pistol','bullet','brokenPistol','deepCore','atlantisCore','energyCrystal','hornAmulet',
             'bpPistol','bpBullet','bpCoralBlade','bpCoralArmor','bpThruster','bpSourceSpear','bpSourceArmor',
             'vampire','dodge','satchel','bloodvest','atlantisSeed']
ACC = ['pistol','bullet','brokenPistol','deepCore']
ANIM = ['sleep_nap.png','sleep_night.png']

ok = 0; bad = []
def ck(label, cond, extra=''):
    global ok
    if cond: ok += 1; print('  OK   ' + label + ('  —— ' + str(extra) if extra else ''))
    else: bad.append(label); print('  FAIL ' + label + ('  —— ' + str(extra) if extra else ''))

with zipfile.ZipFile(Z) as z:
    names = z.namelist()
    nset = set(names)
    idx = z.read('guyuyizhang/index.html').decode('utf-8')
    bv = (re.search(r"window\.BUILD_VER = '([^']+)'", idx) or [None, ''])[1]
    ck('index.html 版本号是 v1.06', bv.startswith('v1.06'), bv)
    qs = re.findall(r'\?v=([^"]+)', idx)
    ck('所有资源缓存参数与版本号一致', len(qs) >= 5 and all(q == bv for q in qs), str(len(qs)) + ' 处')

    miss = [i for i in NEW_ITEMS if 'guyuyizhang/assets/img/items/%s.png' % i not in nset]
    ck('19 个新图标都在包里', not miss, '缺 ' + ','.join(miss) if miss else '19 个')
    missA = [i for i in ACC if 'guyuyizhang/assets/img/items-accent/%s.png' % i not in nset]
    ck('彩色图标都在包里', not missA, '缺 ' + ','.join(missA) if missA else str(len(ACC)) + ' 个')
    missN = [i for i in ANIM if 'guyuyizhang/assets/img/anim/%s' % i not in nset]
    ck('睡觉动画图都在包里', not missN, '缺 ' + ','.join(missN) if missN else str(len(ANIM)) + ' 个')

    data = z.read('guyuyizhang/js/data.js').decode('utf-8')
    ck('内置公告含 v1.06 且已批准', "version: 'v1.06'" in data and 'approved: true' in data)
    # 只截出 v1.06 这一条公告的正文来查（v1.05 等历史公告里本来就有【重要修复】，不该被算进来）
    m6 = re.search(r"version: 'v1\.06'[\s\S]*?body: \[([\s\S]*?)\n\s*\],", data)
    v6 = m6.group(1) if m6 else ''
    ck('能截出 v1.06 公告正文', len(v6) > 200, str(len(v6)) + ' 字符')
    ck('公告正文是作者确认的那版（双持/横扫/意图/图标皮肤/界面/平衡）',
       all(k in v6 for k in ['【双持重做：轮流挥砍 + 攻速对称】', '【新增：横扫（双手重武器专属）】',
                             '【多目标战斗：敌人开始有意图了】', '【图标与皮肤】', '【界面】', '【平衡】',
                             '金价略微削弱', '目前仅仅作为功能尝试']),
       '6 节齐全')
    ck('v1.06 公告不含未公开章节（暗改不写公告）',
       '【重要修复】' not in v6 and '校准终于校得准' not in v6 and '【双手武器规则明确了】' not in v6)
    ck('金矿新数值在包里', "id:'goldore', base:55" in data or 'base:55' in data)
    ck('石板已下架（货架上没有 slate）', data.count("{ id:'slate'") <= 1, 'data.js 里 slate 出现 ' + str(data.count("id:'slate'")) + ' 次')
    ck('竹林热点已右移', 'x:82, y:22, point:' in data)

    game = z.read('guyuyizhang/js/game.js').decode('utf-8')
    ck('横扫机制在包里', 'const SWEEP_CD = 20;' in game and "act === 'sweep'" in game)
    ck('多目标意图在包里', 'function rollEnemyIntents' in game and 'ENEMY_COVER_REDUCE' in game)
    ck('副手手枪漏洞已修（按开火武器判命中）', 'function rangedAcc(kind)' in game)
    ck('轮流出砍在包里', 'function weaponTurnSlot()' in game)
    ck('双手武器拦截在包里', '请先把它卸下' in game)

    ui = z.read('guyuyizhang/js/ui.js').decode('utf-8')
    ck('皮肤切图标在包里', "const ACCENT = {" in ui and "items-accent" in ui)
    ck('睡觉动画已接在包里', "withAnimation('sleep'" in ui)
    ck('工具栏用图标在包里', 'data-toolslot="${i}">${itemIcon(tid)}' in ui)
    ck('旧的占位符已不存在', '敬请期待' not in ui)

    css = z.read('guyuyizhang/css/style.css').decode('utf-8')
    ck('状态条新配色在包里', '--hp: #d9a094;' in css and '--sta: #dcc9a2;' in css)
    ck('右下角 HUD 同列布局在包里', '#hud-bottomright' in css)
    ck('意图标签样式在包里', '.intent-tag.charge' in css)

    ck('没有残留的旧版缓存参数 v1.05', 'v1.05-20260913-220000' not in idx)
    ck('条目数合理（>300）', len(names) > 300, len(names))
    ck('无空目录条目', not any(n.endswith('/') for n in names))

print('')
print('通过 %d 项，失败 %d 项' % (ok, len(bad)))
if bad: print('失败项：'); [print(' - ' + b) for b in bad]
print('RESULT:' + ('FAIL' if bad else 'PASS'))
