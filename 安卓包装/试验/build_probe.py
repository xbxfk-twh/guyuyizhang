"""Build a separate ARM-only native ad diagnostic; never packages the game."""
import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
import zipfile

PINS = {
    'dirichlet_ad_5.3.1.8.aar': '5a5b36fc0dfcf6d8a989f1316d8def3becb798498b760fe3dbe00c9e5907c5ad',
    'okhttp-3.10.0.jar': '4aca3e552afb1ceb47f8956685f6295a276e49fa03f9066f8b6be83bec56fb66',
    'okio-1.14.0.jar': '4633c331f50642ebe795dc089d6a5928aff43071c9d17e7840a009eea2fe95a3',
}
PACKAGE = 'top.guyuyizhang.adsprobe'


def run(args, env=None):
    result = subprocess.run([str(v) for v in args], env=env, capture_output=True,
                            encoding='utf-8', errors='replace')
    if result.returncode:
        raise RuntimeError(result.stdout[-2500:] + result.stderr[-2500:])
    return result.stdout


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', required=True, type=Path, help='Private SDK config outside Git')
    parser.add_argument('--vendor-dir', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--sdk', type=Path, default=Path.home()/'.codex/android-sdk')
    parser.add_argument('--java', type=Path, default=Path('C:/Program Files/Microsoft/jdk-25.0.3.9-hotspot'))
    args = parser.parse_args()
    if args.output.exists():
        raise RuntimeError('Refuse to replace an existing diagnostic APK')
    config = json.loads(args.config.read_text(encoding='utf-8'))
    if config.get('testMode') is not True or config.get('ssvEnabled') is not False:
        raise RuntimeError('This diagnostic only supports the separately configured client-test placement')
    if not re.fullmatch(r'[A-Za-z0-9_-]{32,128}', config.get('mediaKey','')):
        raise RuntimeError('Invalid private media config')
    if not all(isinstance(config.get(k), int) and config[k]>0 for k in ['mediaId','spaceId']):
        raise RuntimeError('Media and placement IDs must come from the real test platform')
    for name, expected in PINS.items():
        if hashlib.sha256((args.vendor_dir/name).read_bytes()).hexdigest() != expected:
            raise RuntimeError('Vendor artifact hash mismatch: '+name)
    tools = args.sdk/'build-tools/36.0.0'
    android = args.sdk/'platforms/android-36/android.jar'
    java, javac = args.java/'bin/java.exe', args.java/'bin/javac.exe'
    signing = Path.home()/'.codex/signing/guyuyizhang-test'
    if not (signing/'test.jks').is_file():
        raise RuntimeError('Expected existing local test certificate; do not alter the game signing identity')
    env = dict(os.environ)
    env['GUYU_NATIVE_PROBE_PASSWORD'] = json.loads((signing/'private.json').read_text())['password']
    with tempfile.TemporaryDirectory(prefix='guyu-native-probe-') as folder:
        work = Path(folder)
        with zipfile.ZipFile(args.vendor_dir/'dirichlet_ad_5.3.1.8.aar') as archive:
            vendor = work/'vendor'
            for name in archive.namelist():
                if not (vendor/name).resolve().is_relative_to(vendor.resolve()):
                    raise RuntimeError('Invalid vendor archive path')
            archive.extractall(vendor)
        namespace = '{http://schemas.android.com/apk/res/android}'
        ET.register_namespace('android', namespace[1:-1])
        manifest = ET.Element('manifest', {'package':PACKAGE})
        for permission in ['INTERNET','ACCESS_NETWORK_STATE']:
            ET.SubElement(manifest,'uses-permission',{namespace+'name':'android.permission.'+permission})
        ET.SubElement(manifest,'uses-sdk',{namespace+'minSdkVersion':'26',namespace+'targetSdkVersion':'36'})
        app = ET.SubElement(manifest,'application',{
            namespace+'label':'孤屿原生广告测试', namespace+'theme':'@android:style/Theme.Material.Light.NoActionBar',
            namespace+'allowBackup':'false',namespace+'usesCleartextTraffic':'false',namespace+'extractNativeLibs':'true'})
        activity = ET.SubElement(app,'activity',{namespace+'name':'.MainActivity',namespace+'exported':'true'})
        intent = ET.SubElement(activity,'intent-filter')
        ET.SubElement(intent,'action',{namespace+'name':'android.intent.action.MAIN'})
        ET.SubElement(intent,'category',{namespace+'name':'android.intent.category.LAUNCHER'})
        sdk_manifest = ET.parse(vendor/'AndroidManifest.xml').getroot()
        # Exact, pinned AAR only. Production integration should use a normal manifest merger.
        for child in sdk_manifest.find('application'):
            node = copy.deepcopy(child)
            for entry in node.iter():
                for attr in list(entry.attrib):
                    if attr.startswith('{http://schemas.android.com/tools}'):
                        del entry.attrib[attr]
                    else:
                        entry.attrib[attr] = entry.attrib[attr].replace('${applicationId}', PACKAGE)
            app.append(node)
        ET.ElementTree(manifest).write(work/'AndroidManifest.xml',encoding='utf-8',xml_declaration=True)
        run([tools/'aapt2.exe','compile','--dir',vendor/'res','-o',work/'res.zip'])
        run([tools/'aapt2.exe','link','-o',work/'unsigned.apk','--manifest',work/'AndroidManifest.xml',
             '-I',android,'--version-code','1','--version-name','native-ad-test-20261101',
             '--java',work/'generated','--extra-packages','com.tapsdk.tapad',work/'res.zip'])
        source = work/'src'; source.mkdir()
        shutil.copyfile(Path(__file__).with_name('MainActivity.java'),source/'MainActivity.java')
        (source/'ProbeConfig.java').write_text(
            'package '+PACKAGE+'; final class ProbeConfig {static final long MEDIA='+str(config['mediaId'])+
            'L, SPACE='+str(config['spaceId'])+'L; static final String KEY='+json.dumps(config['mediaKey'])+';}',encoding='utf-8')
        jars = [vendor/'classes.jar', args.vendor_dir/'okhttp-3.10.0.jar', args.vendor_dir/'okio-1.14.0.jar']
        classes = work/'classes'; classes.mkdir()
        run([javac,'-J-Duser.language=en','-encoding','UTF-8','-source','8','-target','8','-bootclasspath',str(android)+os.pathsep+str(tools/'core-lambda-stubs.jar'),
             '-classpath',os.pathsep.join(str(p) for p in jars),'-d',classes,
             *source.glob('*.java'),*(work/'generated').rglob('*.java')])
        dex = work/'dex'; dex.mkdir()
        run([java,'-cp',tools/'lib/d8.jar','com.android.tools.r8.D8','--lib',android,
             '--min-api','26','--output',dex,*classes.rglob('*.class'),*jars])
        with zipfile.ZipFile(work/'unsigned.apk','a',compression=zipfile.ZIP_DEFLATED) as apk:
            for prefix, directory in [('assets',vendor/'assets'),('lib',vendor/'jni')]:
                for path in directory.rglob('*'):
                    if path.is_file(): apk.write(path,prefix+'/'+path.relative_to(directory).as_posix())
            for path in dex.glob('*.dex'): apk.write(path,path.name)
        run([tools/'zipalign.exe','-p','-f','4',work/'unsigned.apk',work/'aligned.apk'])
        run([java,'-jar',tools/'lib/apksigner.jar','sign','--ks',signing/'test.jks',
             '--ks-key-alias','guyu-test','--ks-pass','env:GUYU_NATIVE_PROBE_PASSWORD',
             '--key-pass','env:GUYU_NATIVE_PROBE_PASSWORD','--out',work/'signed.apk',work/'aligned.apk'],env)
        run([java,'-jar',tools/'lib/apksigner.jar','verify',work/'signed.apk'])
        badging = run([tools/'aapt2.exe','dump','badging',work/'signed.apk'])
        if "name='"+PACKAGE+"'" not in badging or 'top.guyuyizhang.game' in badging:
            raise RuntimeError('Diagnostic package identity is wrong')
        args.output.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(work/'signed.apk',args.output)
    digest = hashlib.sha256(args.output.read_bytes()).hexdigest()
    receipt = {'package':PACKAGE,'diagnostic':True,'mediaId':config['mediaId'],'spaceId':config['spaceId'],
               'bytes':args.output.stat().st_size,'sha256':digest,'gameAssetsIncluded':False,'serverValidationEnabled':False}
    args.output.with_suffix('.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(receipt,ensure_ascii=False))
    print('RESULT:PASS')


if __name__ == '__main__':
    main()
