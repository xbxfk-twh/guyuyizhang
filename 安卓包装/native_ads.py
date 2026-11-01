"""Pinned non-aggregate TapADN packaging for the full-game Android wrapper."""
import copy
import hashlib
import json
from pathlib import Path
import re
import zipfile
import xml.etree.ElementTree as ET

PINS = {
    'dirichlet_ad_5.3.1.8.aar': '5a5b36fc0dfcf6d8a989f1316d8def3becb798498b760fe3dbe00c9e5907c5ad',
    'okhttp-3.10.0.jar': '4aca3e552afb1ceb47f8956685f6295a276e49fa03f9066f8b6be83bec56fb66',
    'okio-1.14.0.jar': '4633c331f50642ebe795dc089d6a5928aff43071c9d17e7840a009eea2fe95a3',
}
ANDROID = '{http://schemas.android.com/apk/res/android}'


def prepare(work, config_path, vendor_dir, package, test=False):
    config = json.loads(config_path.read_text(encoding='utf-8'))
    if config.get('testMode') is not test or config.get('ssvEnabled') is not False:
        raise RuntimeError('Ad configuration mode mismatch; this build uses SDK client verification')
    if not re.fullmatch(r'[A-Za-z0-9_-]{32,128}', config.get('mediaKey', '')):
        raise RuntimeError('Invalid private native SDK configuration')
    if not all(type(config.get(k)) is int and config[k] > 0 for k in ['mediaId', 'spaceId']):
        raise RuntimeError('Invalid media or placement ID')
    if not test and config.get('approved') is not True:
        raise RuntimeError('Formal media and placement approval must be verified before publication')
    for name, expected in PINS.items():
        if hashlib.sha256((vendor_dir/name).read_bytes()).hexdigest() != expected:
            raise RuntimeError('Vendor artifact hash mismatch: '+name)
    vendor = work/'vendor'
    with zipfile.ZipFile(vendor_dir/'dirichlet_ad_5.3.1.8.aar') as archive:
        for name in archive.namelist():
            if not (vendor/name).resolve().is_relative_to(vendor.resolve()):
                raise RuntimeError('Invalid vendor archive path')
        archive.extractall(vendor)
    tree = ET.parse(work/'AndroidManifest.xml')
    manifest, sdk_manifest = tree.getroot(), ET.parse(vendor/'AndroidManifest.xml').getroot()
    # Only the exact pinned SDK component declarations are merged. Optional intrusive permissions are omitted.
    ET.register_namespace('android', ANDROID[1:-1])
    ET.SubElement(manifest, 'uses-permission', {ANDROID+'name': 'android.permission.ACCESS_NETWORK_STATE'})
    application = manifest.find('application')
    application.set(ANDROID+'extractNativeLibs', 'true')
    for child in sdk_manifest.find('application'):
        node = copy.deepcopy(child)
        for entry in node.iter():
            for attr in list(entry.attrib):
                if attr.startswith('{http://schemas.android.com/tools}'):
                    del entry.attrib[attr]
                else:
                    entry.attrib[attr] = entry.attrib[attr].replace('${applicationId}', package)
        application.append(node)
    tree.write(work/'AndroidManifest.xml', encoding='utf-8', xml_declaration=True)
    generated = work/'java'/Path(*package.split('.'))
    generated.mkdir(parents=True, exist_ok=True)
    (generated/'NativeAdConfig.java').write_text('package '+package+'; final class NativeAdConfig {'
        'static final long MEDIA='+str(config['mediaId'])+'L, SPACE='+str(config['spaceId'])+'L;'
        'static final String KEY='+json.dumps(config['mediaKey'])+';}', encoding='utf-8')
    return vendor, [vendor/'classes.jar', vendor_dir/'okhttp-3.10.0.jar', vendor_dir/'okio-1.14.0.jar']
