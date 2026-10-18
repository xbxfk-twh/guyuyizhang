# 生成软著申请材料（源代码文档 + 软件说明书）
# 用法：python 开发工具\生成\_gen_copyright_docs.py [版本号] [发布包 zip]
#   指定发布包时从包内读取源码，避免把工作区未发布的改动写入登记材料。
# 产物：软著申请\源代码文档.docx（前 30 页 + 后 30 页，每页 50 行）、软著申请\软件说明书.docx
import os
import sys
import datetime
import zipfile

from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml.ns import qn

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GAME = os.path.join(ROOT, '孤屿遗章-游戏 - 发布')
OUT = os.path.join(ROOT, '软著申请')
VER = (sys.argv[1] if len(sys.argv) > 1 else 'V1.10').strip()
DOC_SUFFIX = '_' + VER.lower()
ARCHIVE = (sys.argv[2] if len(sys.argv) > 2 else '').strip()
NAME = '孤屿遗章 游戏软件'
TODAY = datetime.date.today().strftime('%Y年%m月%d日')
OWNER = os.environ.get('COPYRIGHT_OWNER', '________________（请填写）')
COMPLETED = os.environ.get('COPYRIGHT_COMPLETED', '________________（请按所登记版本的实际完成日期填写）')
PUBLISHED = os.environ.get('COPYRIGHT_PUBLISHED', '________________（已发表则填实际首次公开日期；未发表则注明未发表）')

FILES = ['index.html', 'css/style.css', 'js/data.js', 'js/game.js', 'js/ui.js', 'js/audio.js']
LINES_PER_PAGE = 50
PAGES_EACH_SIDE = 30     # 前 30 页 + 后 30 页
WRAP_COL = 100           # 单行"显示宽度"上限（中文按 2 计；防止超长行折行把页面撑爆）


def disp_width(s):
    """按显示宽度算长度：中文/全角按 2，其它按 1（宋体 9pt 下 100 单位 ≈ 一行的宽度）。"""
    return sum(2 if ord(c) > 0x2E80 else 1 for c in s)


def wrap_line(line, limit=WRAP_COL):
    if disp_width(line) <= limit:
        return [line]
    out, cur, w = [], '', 0
    for ch in line:
        cw = 2 if ord(ch) > 0x2E80 else 1
        if w + cw > limit:
            out.append(cur); cur, w = '', 0
        cur += ch; w += cw
    if cur:
        out.append(cur)
    return out


def read_code():
    out = []
    archive = zipfile.ZipFile(ARCHIVE) if ARCHIVE else None
    try:
        for rel in FILES:
            out.append('/* ============ %s ============ */' % rel)
            if archive:
                matches = [name for name in archive.namelist() if name.endswith('/' + rel)]
                if len(matches) != 1:
                    raise ValueError('发布包中未唯一匹配 %s：%s' % (rel, matches))
                source = archive.read(matches[0]).decode('utf-8-sig', errors='replace')
            else:
                path = os.path.join(GAME, rel.replace('/', os.sep))
                with open(path, 'r', encoding='utf-8', errors='replace') as f:
                    source = f.read()
            for line in source.split('\n'):
                line = line.rstrip('\r').replace('\t', '    ')
                # 超长行按显示宽度折行，避免排版后超过 60 页。
                out.extend(wrap_line(line))
    finally:
        if archive:
            archive.close()
    return out


def set_font(run, name='宋体', size=9):
    run.font.name = name
    run.font.size = Pt(size)
    run._element.rPr.rFonts.set(qn('w:eastAsia'), name)


def set_a4(doc, top=2.0, bottom=2.0, left=2.2, right=2.2):
    """软著材料必须是 A4（21.0 x 29.7 cm）；python-docx 默认模板是 Letter，必须显式改掉。"""
    sec = doc.sections[0]
    sec.page_width = Cm(21.0)
    sec.page_height = Cm(29.7)
    sec.top_margin = Cm(top); sec.bottom_margin = Cm(bottom)
    sec.left_margin = Cm(left); sec.right_margin = Cm(right)
    return sec


def add_page(doc, title, lines, page_no, first_page=False):
    head = doc.add_paragraph()
    # 分页符挂在**本页页眉开头**（不是上一页末尾加一个空段落）——这样上一页正好 50 行代码收尾，
    # 每页 = 页眉 1 行 + 代码 50 行，软著审查看的就是这个。
    if not first_page:
        head.add_run().add_break(WD_BREAK.PAGE)
    head.paragraph_format.space_after = Pt(4)
    set_font(head.add_run('%s %s   第 %d 页' % (NAME, VER, page_no)), '宋体', 9)
    for ln in lines:
        p = doc.add_paragraph()
        pf = p.paragraph_format
        pf.space_before = Pt(0)
        pf.space_after = Pt(0)
        # ⚠️ 行高必须锁成"固定值"：用 1.0 倍行距时 Word 会按字体度量撑到 ~20pt/行，
        #    50 行一行页就装不下，整份文档会被排成 80 多页（软著要求正好 60 页、每页 50 行）。
        pf.line_spacing = Pt(11)
        set_font(p.add_run(ln if ln else ' '), '宋体', 9)


def build_source_doc():
    code = read_code()
    per = LINES_PER_PAGE
    front = code[:PAGES_EACH_SIDE * per]
    back = code[-PAGES_EACH_SIDE * per:]
    doc = Document()
    set_a4(doc, 2.0, 2.0, 2.2, 2.2)
    # 正文样式也用宋体 9pt：免得 Word 默认样式（Calibri 11 + 1.08 行距）把行撑开
    st = doc.styles['Normal']
    st.font.name = '宋体'; st.font.size = Pt(9)
    st._element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')
    st.paragraph_format.space_after = Pt(0)
    page = 1
    for i in range(0, len(front), per):
        add_page(doc, NAME, front[i:i + per], page, first_page=(page == 1))
        page += 1
    for i in range(0, len(back), per):
        add_page(doc, NAME, back[i:i + per], page)
        page += 1
    path = os.path.join(OUT, '源代码文档%s.docx' % DOC_SUFFIX)
    doc.save(path)
    print('源代码文档：%d 行 → %d 页（前 %d + 后 %d），%s' % (len(code), page - 1, PAGES_EACH_SIDE, PAGES_EACH_SIDE, path))


def build_manual():
    doc = Document()
    set_a4(doc, 2.2, 2.2, 2.5, 2.5)

    def title(t, size=18):
        p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_font(p.add_run(t), '黑体', size); return p

    def h(t, size=13):
        p = doc.add_paragraph(); p.paragraph_format.space_before = Pt(10); p.paragraph_format.space_after = Pt(4)
        set_font(p.add_run(t), '黑体', size); return p

    def body(t, size=10.5):
        p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(3)
        set_font(p.add_run(t), '宋体', size); return p

    # 统一正文字体/行距（别让 Word 默认样式把行撑开）
    st = doc.styles['Normal']
    st.font.name = '宋体'; st.font.size = Pt(10.5)
    st._element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')
    st.paragraph_format.space_after = Pt(3)
    st.paragraph_format.line_spacing = 1.25

    title('%s 使用说明书' % NAME)
    body('')
    body('软件名称：孤屿遗章 游戏软件')
    body('软件简称：孤屿遗章')
    body('版本号：%s' % VER)
    body('著作权人：%s' % OWNER)
    body('开发完成日期：%s' % COMPLETED)
    body('首次发表日期：%s' % PUBLISHED)
    body('')
    h('一、软件概述')
    body('《孤屿遗章》是一款中文网页文字生存游戏。玩家扮演海难后漂流到孤岛上的幸存者，'
         '通过采集、制造、建造、烹饪、战斗与探索维持生存，逐步造出船只、揭开失落文明「亚克兰蒂斯」的秘密，'
         '并可在通关后以死亡结算的形式，把本局成果沉淀进跨局成长系统《历代遗章》。'
         '游戏为单机运行，不需要服务器；画面为黑白版画风格（其中隐藏角色「灵灰」为彩色）。')
    h('二、开发与运行环境')
    body('开发语言与框架：HTML5 + CSS3 + 原生 JavaScript（不使用第三方框架，无后端服务）。')
    body('开发工具：代码编辑器、Node.js（自动化测试脚本）、Python（资源与打包脚本）。')
    body('运行环境：任意支持 HTML5 的浏览器（Chrome / Edge / Safari / Firefox 等）；'
         '支持 Windows / macOS / Linux 桌面浏览器与 Android / iOS 移动端浏览器，'
         '也支持以 H5 小游戏形式在 TapTap 平台内运行。')
    body('运行方式：直接双击 index.html 即可在浏览器中运行（纯前端运行，无需安装）。')
    body('存储方式：本地浏览器存储（localStorage + Cookie 双份镜像），可选 TapTap 云存档；'
         '另提供「存档码」文本导出，便于跨设备迁移与备份。')
    h('三、主要功能模块')
    for t in [
        '1. 身份与开局：6 种身份（渔夫 / 樵夫 / 药师 / 养蜂人 / 铁匠学徒 / 隐藏角色灵灰），各自有专属加成与初始物资；'
        '新存档开场播放 5 格黑白木刻分镜。',
        '2. 生存状态：生命、体力、饱食、水分、精神五项数值，配合流血 / 中毒 / 寒冷 / 恐惧等状态，'
        '以及昼夜、四季、天气（晴 / 云 / 雨 / 雷暴 / 雾 / 雪）对采集与战斗的影响。',
        '3. 采集与探索：孤岛 11 个场景（营地 / 树林 / 竹林 / 河畔 / 草地 / 采石场 / 荒漠 / 山洞 / 山顶 / 海域 / 对岸盐镇）'
        '与第二章海底 9 个区域，每个场景含若干热点采集点、狩猎点与一次性遗迹点位，点位有每日次数与体力消耗。',
        '4. 制造与建造：配方按工位分组（手工 / 工作台 / 熔炉 / 烟熏炉 / 篝火烹饪 / 药炉 / 灶台 / 晾肉架 / 制革架 / 纺车织布机等），'
        '支持长按批量制作；住所、围墙、瞭望台、船坞等建筑按等级链升级；家具提供休息、储物、加工与每日产出。',
        '5. 战斗系统：回合制 + 时间追赶出手（攻速决定出手频率），支持双持、盾牌格挡、重击、横扫、'
        '武器附毒 / 磨刀 / 命名、道具使用、逃跑；新增距离制（近战需贴身、弓 30 步、手枪 15 步，双方按速度接近）。',
        '6. 牧场与农业：鸡舍、羊圈（喂食、成长、产出、寿终），开垦耕地、播种、浇水、收获。',
        '7. 技能树：《采集 / 制造 / 战斗》三棵技能树，主干 7 级（每级三选一）+ 两侧专项分支，'
        '专项含互斥结构，支持从末端遗忘并返还一半经验（主干同样可退）。',
        '8. 图鉴与成就：《图鉴》账号级收录物品与怪物；成就解锁后可在《历代遗章》领取魂点。',
        '9. 跨局成长《历代遗章》：魂点继承、开局加成、备份槽、每日签到、存档救援等。',
        '10. 剧情与结局：主线任务链、老潮商船、盐镇交易与委托、隐藏角色灵灰的对话，'
        '以及 6 个结局（归乡 / 岛主 / 秘辛 / 归途之外 / 重燃文明 / 深海长眠），'
        '一个存档只能结算一个结局，结算前有二次确认。',
        '11. 存档安全：本地存储 + Cookie 双写、滚动备份、存档码导出导入、误开新档后的救援找回、'
        '主存档损坏时自动从备份继续。',
    ]:
        body('· ' + t)
    h('四、操作说明')
    for t in [
        '开始游戏：打开 index.html → 点「新的旅程」→ 选择身份与难度（求生者 / 冒险家 / 幸存者 / 传奇）。',
        '移动：底部导航或场景内热点切换场景；大地图可上下拖动查看全岛，箭头进入其他区域。',
        '采集 / 干活：点击场景中的热点（砍树、采集、钓鱼、狩猎等），消耗时间与体力并产出物资。',
        '制造：点底部「制造」→ 选工位 → 点配方制作；长按配方可弹出批量条一次做多个。',
        '战斗：遇敌后选择攻击 / 射击 / 防御 / 道具 / 逃跑；上方显示双方血条与距离。',
        '存档：系统自动保存；也可在「菜单 → 保存进度」「菜单 → 备份 · 读档」手动备份、'
        '导出存档码。',
        '设置：主界面或游戏内「设置」可调整音乐 / 音效 / 环境音、日志栏显示方式与宽度、皮肤包、'
        '关闭「当前目标」提示，查看云存档状态。',
    ]:
        body('· ' + t)
    h('五、版本与更新说明')
    body('本软件持续迭代更新：每次发布都会在游戏内「邮箱 → 更新公告」中说明本次改动内容，'
         '并在设置面板展示当前版本号。历史版本可在打包目录中查询（孤屿遗章_发布版_vX.XX.zip）。')
    h('六、注意事项')
    body('· 游戏进度保存在本地，清理浏览器数据会清除进度，建议定期使用「导出存档码」备份；'
         '在 TapTap 平台运行时，可在设置中开启云存档。')
    body('· 长时间制造、睡觉、建造会持续消耗饱食与水分，操作前请先吃饱喝足。')
    path = os.path.join(OUT, '软件说明书%s.docx' % DOC_SUFFIX)
    doc.save(path)
    print('软件说明书：%s' % path)


def check_copyright_docs():
    """按软著登记的硬性要求自检：A4、页眉（软件名+版本+页码）、每页 50 行、共 60 页。"""
    print('\n===== 软著材料格式自检 =====')
    d = Document(os.path.join(OUT, '源代码文档%s.docx' % DOC_SUFFIX))
    sec = d.sections[0]
    print('纸张：%.1f x %.1f cm  %s' % (sec.page_width.cm, sec.page_height.cm,
          'OK（A4）' if abs(sec.page_width.cm - 21.0) < 0.2 and abs(sec.page_height.cm - 29.7) < 0.2 else 'X 不是 A4'))
    pages, cur = [], None
    for p in d.paragraphs:
        t = p.text
        if t.startswith(NAME + ' ' + VER) and '第' in t and '页' in t:
            if cur is not None:
                pages.append(cur)
            n = int(t.rsplit('第', 1)[1].replace('页', '').strip())
            cur = {'no': n, 'head': t, 'lines': 0}
        elif cur is not None:
            cur['lines'] += 1
    if cur is not None:
        pages.append(cur)
    bad_head = [x for x in pages if not x['head'].startswith('%s %s' % (NAME, VER))]
    bad_lines = [x for x in pages if x['lines'] != LINES_PER_PAGE]
    print('页数：%d  %s' % (len(pages), 'OK（前 30 + 后 30 = 60）' if len(pages) == PAGES_EACH_SIDE * 2 else 'X 不是 60 页'))
    print('页眉：%s  %s' % (pages[0]['head'] if pages else '无',
          'OK（软件名 + 版本号 + 页码）' if not bad_head else 'X 有 %d 页页眉不对' % len(bad_head)))
    print('每页行数：%d 行/页  %s' % (LINES_PER_PAGE, 'OK（每页 50 行）' if not bad_lines else 'X 有 %d 页行数不对：%s' % (len(bad_lines), [x['no'] for x in bad_lines][:5])))
    print('页码连续：%s' % ('OK' if [x['no'] for x in pages] == list(range(1, len(pages) + 1)) else 'X 页码不连续'))
    m = Document(os.path.join(OUT, '软件说明书%s.docx' % DOC_SUFFIX))
    ms = m.sections[0]
    txt = '\n'.join(p.text for p in m.paragraphs)
    need = ['软件名称', '版本号', '运行环境', '主要功能', '操作说明', '开发']
    miss = [k for k in need if k not in txt]
    print('说明书：%.1f x %.1f cm  %s；必备章节 %s' % (ms.page_width.cm, ms.page_height.cm,
          'OK（A4）' if abs(ms.page_width.cm - 21.0) < 0.2 else 'X 不是 A4',
          'OK' if not miss else 'X 缺：' + '、'.join(miss)))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    build_source_doc()
    build_manual()
    # 自检：把软著材料的硬性格式再核一遍，免得交上去才发现不合规
    check_copyright_docs()
