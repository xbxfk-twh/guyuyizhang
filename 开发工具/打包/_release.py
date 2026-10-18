"""发布工具共用路径、版本与完整性检查；导入不产生发布包。"""
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / '孤屿遗章-游戏 - 发布'
TOP = 'guyuyizhang'


def build_version():
    html = (SOURCE / 'index.html').read_text(encoding='utf-8')
    match = re.search(r"window\.BUILD_VER\s*=\s*'([^']+)'", html)
    if not match or not re.fullmatch(r'v\d+\.\d+[a-z]?-\d{8}-\d{6}', match[1]):
        raise ValueError('BUILD_VER 缺失或格式不正确')
    queries = re.findall(r'\?v=([^"\'>]+)', html)
    # 六个 JS（含 ads.js、battle-effects.js）与三张 CSS 均须携带同一构建号。
    # 固定数量，避免新加脚本漏掉缓存参数后仍然通过发布校验。
    if len(queries) != 9 or any(q != match[1] for q in queries):
        raise ValueError('9 处资源缓存参数必须与 BUILD_VER 完全一致')
    return match[1]


def default_output():
    return ROOT / ('孤屿遗章_发布版_' + build_version().split('-')[0] + '.zip')


def source_files(top=TOP):
    return {(top + '/' if top else '') + p.relative_to(SOURCE).as_posix(): p
            for p in sorted(SOURCE.rglob('*')) if p.is_file()
            and not any(part in ('.git', '__pycache__') for part in p.relative_to(SOURCE).parts)}


def verify(archive, top=TOP):
    build_version()
    files = source_files(top)
    problems = []
    with zipfile.ZipFile(archive) as z:
        names = z.namelist()
        if len(names) != len(set(names)):
            problems.append('包内存在重复条目')
        missing = sorted(files.keys() - set(names))
        extra = sorted(set(names) - files.keys())
        if missing:
            problems.append('缺少文件：' + ', '.join(missing))
        if extra:
            problems.append('多余文件或目录：' + ', '.join(extra))
        for name in sorted(files.keys() & set(names)):
            if z.read(name) != files[name].read_bytes():
                problems.append('内容与当前源码不一致：' + name)
    return problems
