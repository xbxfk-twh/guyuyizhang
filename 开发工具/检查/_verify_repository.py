"""Read-only check of tracked repository boundaries. Does not scan ignored files."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
FORBIDDEN_PARTS = {
    '.codex-remote-attachments', '_主开发线档案', '软著申请', '归档',
    '发行产物', 'node_modules', '__pycache__', '_out', '.gradle',
}
FORBIDDEN_SUFFIXES = {'.apk', '.zip', '.jks', '.keystore', '.pem', '.p12', '.pfx', '.key', '.sqlite3', '.sqlite', '.db', '.log', '.pyc'}
TOKEN_PATTERNS = {
    'private key': rb'-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----',
    'API token': rb'\bsk-[A-Za-z0-9_-]{24,}',
    'GitHub token': rb'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})',
    'AWS access key': rb'\bAKIA[A-Z0-9]{16}\b',
}


def main():
    names = [n.decode('utf-8') for n in subprocess.check_output(
        ['git', 'ls-files', '-z'], cwd=ROOT).split(b'\0') if n]
    errors = []
    required = ['README.md', 'CONTRIBUTING.md', '.gitignore', '.gitattributes',
                '.github/workflows/verify.yml', '文档/维护现状.md',
                '孤屿遗章-游戏 - 发布/runtime-manifest.json', '回归测试/run.js']
    for name in required:
        if name not in names or not (ROOT / name).is_file():
            errors.append(f'missing tracked entry: {name}')
    for name in names:
        p = Path(name)
        if (set(p.parts) & FORBIDDEN_PARTS or p.suffix.lower() in FORBIDDEN_SUFFIXES
                or p.name in {'测试名单.txt', 'local.properties', 'signing.properties'}
                or (p.name.startswith('.env') and p.name != '.env.example')
                or p.name.startswith('.private-') or name.startswith('开发工具/上传/')
                or name == '开发工具/存档服务/deploy.js'):
            errors.append(f'private/generated file tracked: {name}')
        file = ROOT / name
        if not file.is_file():
            errors.append(f'tracked file missing: {name}')
            continue
        if file.stat().st_size > 20 * 1024 * 1024:
            errors.append(f'file exceeds 20 MiB source limit: {name}')
        if p.suffix.lower() in {'.md', '.txt', '.js', '.json', '.py', '.html', '.yml', '.yaml', '.xml', '.ps1', '.properties'}:
            data = file.read_bytes()
            for label, pattern in TOKEN_PATTERNS.items():
                match = re.search(pattern, data)
                if match:
                    line = data[:match.start()].count(b'\n') + 1
                    errors.append(f'possible {label}: {name}:{line}')
    for error in errors:
        print(error)
    print(f'Repository: {len(names)} tracked files; {len(errors)} problems')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
