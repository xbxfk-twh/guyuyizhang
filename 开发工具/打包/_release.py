"""发布工具共用路径、版本与完整性检查；导入不产生发布包。"""
from pathlib import Path
import re
import json
import zipfile

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / '孤屿遗章-游戏 - 发布'
TOP = 'guyuyizhang'


def build_version():
    html = (SOURCE / 'index.html').read_text(encoding='utf-8')
    match = re.search(r"window\.BUILD_VER\s*=\s*'([^']+)'", html)
    if not match or not re.fullmatch(r'v\d+\.\d+[a-z]?-\d{8}-\d{6}', match[1]):
        raise ValueError('BUILD_VER 缺失或格式不正确')
    manifest = json.loads((SOURCE / 'runtime-manifest.json').read_text(encoding='utf-8'))
    expected = manifest['styles'] + manifest['scripts']
    if not expected or len(set(expected)) != len(expected):
        raise ValueError('运行加载清单为空或包含重复入口')
    logic = manifest['logic']
    if not logic or len(set(logic)) != len(logic) or [name for name in manifest['scripts'] if name in logic] != logic:
        raise ValueError('逻辑清单为空、重复、缺项或顺序错误')
    refs = re.findall(r'(?:src|href)="((?:js|css)/[^"<>]+)"', html)
    if refs != [name + '?v=' + match[1] for name in expected]:
        raise ValueError('资源顺序、清单或缓存构建号不一致')
    for name in expected:
        if '..' in Path(name).parts or not (SOURCE / name).is_file():
            raise ValueError('运行加载清单文件缺失或路径非法：' + name)
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
