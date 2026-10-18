"""Build a local signed test APK from the single game source, using official SDK tools."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import tempfile
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PROJECT = Path(__file__).resolve().parent
SOURCE = ROOT / '孤屿遗章-游戏 - 发布'


def run(args, env=None):
    result = subprocess.run([str(x) for x in args], env=env, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, encoding='utf-8', errors='replace')
    if result.returncode:
        raise RuntimeError(result.stdout)
    if result.stdout.strip():
        print(result.stdout.strip()[-1800:], flush=True)


def source_files():
    return {p.relative_to(SOURCE).as_posix(): p for p in SOURCE.rglob('*') if p.is_file()
            and not any(x in ('.git', '__pycache__') for x in p.relative_to(SOURCE).parts)}


def verify_assets(apk):
    with zipfile.ZipFile(apk) as archive:
        expected = source_files()
        actual = {n.removeprefix('assets/web/') for n in archive.namelist()
                  if n.startswith('assets/web/') and not n.endswith('/')}
        if actual != set(expected):
            raise RuntimeError('APK resource list differs from the current source')
        for name, path in expected.items():
            if archive.read('assets/web/' + name) != path.read_bytes():
                raise RuntimeError('APK resource content differs: ' + name)
    print('All ' + str(len(expected)) + ' game files match the source byte for byte.', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sdk', type=Path, default=Path.home() / '.codex/android-sdk')
    parser.add_argument('--java', type=Path, default=Path(os.getenv('JAVA_HOME', 'C:/Program Files/Microsoft/jdk-25.0.3.9-hotspot')))
    parser.add_argument('--verify', type=Path, help='Only verify resources in an existing APK')
    parser.add_argument('--debug-test', action='store_true', help='Emulator-only diagnostic build; never publish')
    args = parser.parse_args()
    if args.verify:
        verify_assets(args.verify)
        return
    config = json.loads((PROJECT / 'config.json').read_text(encoding='utf-8'))
    manifest = ET.parse(PROJECT / 'app/src/main/AndroidManifest.xml').getroot()
    android_ns = '{http://schemas.android.com/apk/res/android}'
    sdk = manifest.find('uses-sdk')
    if (manifest.get('package') != config['applicationId'] or
        sdk.get(android_ns + 'minSdkVersion') != str(config['minSdk']) or
        sdk.get(android_ns + 'targetSdkVersion') != str(config['targetSdk'])):
        raise RuntimeError('Manifest and APK config disagree')
    version = re.search(r"window\.BUILD_VER\s*=\s*'([^']+)'", (SOURCE / 'index.html').read_text(encoding='utf-8'))[1]
    tools = args.sdk / ('build-tools/' + config['buildTools'])
    android = args.sdk / ('platforms/android-' + str(config['targetSdk']) + '/android.jar')
    java = args.java / 'bin/java.exe'
    javac = args.java / 'bin/javac.exe'
    keytool = args.java / 'bin/keytool.exe'
    for path in [tools / 'aapt2.exe', tools / 'zipalign.exe', android, java, javac, keytool]:
        if not path.exists():
            raise RuntimeError('Missing build tool: ' + str(path))

    # One persistent local TEST certificate; never put passwords or the key in the repository/APK.
    signing = Path.home() / '.codex/signing/guyuyizhang-test'
    signing.mkdir(parents=True, exist_ok=True)
    keystore = signing / 'test.jks'
    secret_file = signing / 'private.json'
    if keystore.exists() and not secret_file.exists():
        raise RuntimeError('Existing certificate password record missing; preserve the key')
    if not secret_file.exists():
        secret_file.write_text(json.dumps({'password': secrets.token_hex(24)}), encoding='utf-8')
    env = dict(os.environ)
    env['GUYU_APK_TEST_PASSWORD'] = json.loads(secret_file.read_text(encoding='utf-8'))['password']
    if not keystore.exists():
        run([keytool, '-genkeypair', '-keystore', keystore, '-alias', 'guyu-test',
             '-storepass:env', 'GUYU_APK_TEST_PASSWORD', '-keypass:env', 'GUYU_APK_TEST_PASSWORD',
             '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000', '-dname',
             'CN=Guyu Test Build, OU=Development, O=Guyu, C=CN', '-noprompt'], env)

    output_dir = ROOT / '发行产物'
    output_dir.mkdir(exist_ok=True)
    apk = output_dir / ('孤屿遗章_' + version + ('_仅模拟器调试.apk' if args.debug_test else '_安卓独立版.apk'))
    # Each build gets an isolated staging directory; never delete or compile in the web source.
    with tempfile.TemporaryDirectory(prefix='guyu-apk-') as folder:
        work = Path(folder)
        # Native Windows SDK tools cannot reliably read Unicode source paths.
        shutil.copytree(PROJECT / 'app/src/main/res', work / 'res')
        shutil.copytree(PROJECT / 'app/src/main/java', work / 'java')
        shutil.copyfile(PROJECT / 'app/src/main/AndroidManifest.xml', work / 'AndroidManifest.xml')
        if args.debug_test:
            activity = work / 'java/top/guyuyizhang/game/MainActivity.java'
            activity.write_text(activity.read_text(encoding='utf-8').replace('setWebContentsDebuggingEnabled(false)', 'setWebContentsDebuggingEnabled(true)'), encoding='utf-8')
        assets = work / 'assets'
        shutil.copytree(SOURCE, assets / 'web', ignore=shutil.ignore_patterns('.git', '__pycache__'))
        resources = work / 'resources.zip'
        run([tools / 'aapt2.exe', 'compile', '--dir', work / 'res', '-o', resources])
        unsigned = work / 'unsigned.apk'
        run([tools / 'aapt2.exe', 'link', '-o', unsigned, '--manifest', work / 'AndroidManifest.xml',
             '-I', android, '--version-code', config['versionCode'], '--version-name', version, resources])
        classes = work / 'classes'
        classes.mkdir()
        sources = list((work / 'java').rglob('*.java'))
        run([javac, '-encoding', 'UTF-8', '-source', '8', '-target', '8', '-bootclasspath',
             str(android) + os.pathsep + str(tools / 'core-lambda-stubs.jar'),
             '-d', classes, *sources])
        dex = work / 'dex'
        dex.mkdir()
        run([java, '-cp', tools / 'lib/d8.jar', 'com.android.tools.r8.D8', '--lib', android,
             '--min-api', config['minSdk'], '--output', dex, *classes.rglob('*.class')])
        with zipfile.ZipFile(unsigned, 'a', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            # Python writes UTF-8 ZIP entry names correctly even for the legacy Chinese-named art.
            for path in (assets / 'web').rglob('*'):
                if path.is_file():
                    archive.write(path, 'assets/web/' + path.relative_to(assets / 'web').as_posix())
            for path in dex.glob('*.dex'):
                archive.write(path, path.name)
        aligned = work / 'aligned.apk'
        run([tools / 'zipalign.exe', '-p', '-f', '4', unsigned, aligned])
        signed = work / 'signed.apk'
        run([java, '-jar', tools / 'lib/apksigner.jar', 'sign', '--ks', keystore,
             '--ks-key-alias', 'guyu-test', '--ks-pass', 'env:GUYU_APK_TEST_PASSWORD',
             '--key-pass', 'env:GUYU_APK_TEST_PASSWORD', '--out', signed, aligned], env)
        run([tools / 'zipalign.exe', '-c', '4', signed])
        shutil.copyfile(signed, apk)
    run([java, '-jar', tools / 'lib/apksigner.jar', 'verify', '--verbose', '--print-certs', apk])
    verify_assets(apk)
    digest = hashlib.sha256(apk.read_bytes()).hexdigest()
    (apk.with_suffix('.sha256')).write_text(digest + '  ' + apk.name + '\n', encoding='utf-8')
    print('APK: ' + str(apk))
    print('SHA256: ' + digest)


if __name__ == '__main__':
    main()
