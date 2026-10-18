"""发布校验的隔离测试：只在临时目录创建微型测试包。"""
from pathlib import Path
import sys
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
        self.html = "window.BUILD_VER = '" + version + "';\n" + '\n'.join(
            '<script src="js/%d.js?v=%s"></script>' % (i, version) for i in range(6))
        (release.SOURCE / 'index.html').write_text(self.html, encoding='utf-8')
        self.archive = Path(self.temp.name) / 'fixture.zip'

    def write_zip(self, mode='valid'):
        with zipfile.ZipFile(self.archive, 'w') as z:
            if mode != 'missing':
                z.writestr('guyuyizhang/index.html', (release.SOURCE / 'index.html').read_bytes() if mode != 'stale' else b'old build')
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

    def test_cache_mismatch(self):
        (release.SOURCE / 'index.html').write_text(self.html.replace('?v=v1.08', '?v=v1.07', 1), encoding='utf-8')
        with self.assertRaises(ValueError):
            release.build_version()


if __name__ == '__main__':
    unittest.main()
