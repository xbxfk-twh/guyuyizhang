"""发布校验的隔离测试：只在临时目录创建微型测试包。"""
from pathlib import Path
import sys
import json
import tempfile
import unittest
import warnings
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / '开发工具' / '打包'))
import _release as release


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='guyu-release-test-')
        self.addCleanup(self.temp.cleanup)
        previous = release.SOURCE
        self.addCleanup(setattr, release, 'SOURCE', previous)
        release.SOURCE = Path(self.temp.name) / 'game'
        release.SOURCE.mkdir()
        version = 'v1.08-20260919-232620'
        self.manifest = {'styles':['css/style.css'], 'scripts':['js/game.js'], 'logic':['js/game.js']}
        (release.SOURCE / 'runtime-manifest.json').write_text(json.dumps(self.manifest), encoding='utf-8')
        for name in self.manifest['styles'] + self.manifest['scripts']:
            file=release.SOURCE / name
            file.parent.mkdir(parents=True,exist_ok=True)
            file.write_text('/* fixture */',encoding='utf-8')
        self.html = "window.BUILD_VER = '" + version + "';\n" + '<link rel="stylesheet" href="css/style.css?v='+version+'">\n<script src="js/game.js?v='+version+'"></script>'
        (release.SOURCE / 'index.html').write_text(self.html, encoding='utf-8')
        self.archive = Path(self.temp.name) / 'fixture.zip'

    def write_zip(self, mode='valid'):
        with zipfile.ZipFile(self.archive, 'w') as z:
            for name,file in release.source_files().items():
                if name=='guyuyizhang/index.html' and mode=='missing':continue
                z.writestr(name,b'old build' if name=='guyuyizhang/index.html' and mode=='stale' else file.read_bytes())
            if mode == 'extra':
                z.writestr('unexpected/file.txt', 'extra')
            if mode == 'duplicate':
                with warnings.catch_warnings():
                    warnings.simplefilter('ignore', UserWarning)
                    z.writestr('guyuyizhang/index.html', (release.SOURCE / 'index.html').read_bytes())

    def test_valid(self):
        self.write_zip()
        self.assertEqual(release.verify(self.archive), [])

    def test_invalid_archives(self):
        for mode in ['missing', 'stale', 'extra', 'duplicate']:
            with self.subTest(mode=mode):
                self.write_zip(mode)
                self.assertTrue(release.verify(self.archive))

    def test_missing_entry_or_wrong_order(self):
        for html in [self.html.replace('<script src="js/game.js', '<script src="js/other.js'),
                     self.html.replace('?v=', '?wrong=', 1),
                     self.html + '<script src="js/game.js?v=v1.08-20260919-232620"></script>']:
            with self.subTest(html=html):
                (release.SOURCE/'index.html').write_text(html,encoding='utf-8')
                with self.assertRaises(ValueError):release.build_version()

    def test_cache_mismatch(self):
        (release.SOURCE / 'index.html').write_text(self.html.replace('?v=v1.08', '?v=v1.07', 1), encoding='utf-8')
        with self.assertRaises(ValueError):
            release.build_version()

    def test_logic_manifest_must_match_runtime(self):
        for logic in [[], ['js/missing.js'], ['js/game.js','js/game.js']]:
            with self.subTest(logic=logic):
                manifest=dict(self.manifest,logic=logic)
                (release.SOURCE/'runtime-manifest.json').write_text(json.dumps(manifest),encoding='utf-8')
                with self.assertRaises(ValueError):release.build_version()


if __name__ == '__main__':
    unittest.main()
