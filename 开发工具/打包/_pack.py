"""显式打包；版本取自 index.html，默认不覆盖已有发布包。"""
import argparse
import hashlib
import zipfile
from _release import build_version, default_output, source_files, verify
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--force', action='store_true', help='覆盖同版本的现有发布包')
    parser.add_argument('--check', action='store_true', help='仅检查版本和源文件，不写包')
    parser.add_argument('--output', type=Path, help='指定渠道包路径；默认不覆盖')
    parser.add_argument('--web-root', action='store_true', help='网页渠道：index.html放ZIP根目录')
    args = parser.parse_args()
    output = args.output or default_output()
    top = '' if args.web_root else 'guyuyizhang'
    files = source_files(top)
    print('版本：', build_version())
    print('输出：', output)
    print('文件数：', len(files))
    if args.check:
        return
    with zipfile.ZipFile(output, 'w' if args.force else 'x', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, file in files.items():
            z.write(file, name)
    problems = verify(output, top)
    if problems:
        raise ValueError('\n'.join(problems))
    print('校验结果：全部文件与源码一致')
    print('SHA256：', hashlib.sha256(output.read_bytes()).hexdigest())


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, zipfile.BadZipFile) as exc:
        raise SystemExit('打包失败：' + str(exc))
