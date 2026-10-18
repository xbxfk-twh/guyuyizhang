"""校验发布包的每个文件是否与当前游戏源码完全一致，不解压、不写包。"""
import argparse
from pathlib import Path
import sys
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / '打包'))
from _release import build_version, default_output, verify


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', nargs='?', type=Path, help='默认检查当前版本的根目录发布包')
    parser.add_argument('--web-root', action='store_true', help='检查index.html位于ZIP根目录的网页渠道包')
    args = parser.parse_args()
    archive = args.archive or default_output()
    print('当前构建：', build_version())
    print('检查文件：', archive)
    problems = verify(archive, '' if args.web_root else 'guyuyizhang')
    for problem in problems:
        print('FAIL ' + problem)
    print('RESULT:' + ('FAIL' if problems else 'PASS'))
    return 1 if problems else 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError, zipfile.BadZipFile) as exc:
        print('校验失败：' + str(exc))
        sys.exit(1)
