import tempfile
import unittest
from pathlib import Path
from bridge.distribution import verified_files, write_receipt


class DistributionTests(unittest.TestCase):
    def test_manifest_binds_every_runtime_file_and_version(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'runtime').mkdir()
            (root / 'bridge.exe').write_bytes(b'MZfixture')
            dll = root / 'runtime' / 'python.dll'
            dll.write_bytes(b'fixture')
            write_receipt(root, '0.3.0', '3.12')
            self.assertEqual(len(verified_files(root, '0.3.0')), 2)
            with self.assertRaises(RuntimeError):
                verified_files(root, 'old')
            dll.write_bytes(b'changed')
            with self.assertRaises(RuntimeError):
                verified_files(root, '0.3.0')

    def test_added_missing_and_unsuccessful_files_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'bridge.exe'
            source.write_bytes(b'MZfixture')
            with self.assertRaises(RuntimeError):
                verified_files(root, '0.3.0')
            write_receipt(root, '0.3.0', '3.12')
            extra = root / 'unexpected.txt'
            extra.write_text('extra')
            with self.assertRaises(RuntimeError):
                verified_files(root, '0.3.0')
            extra.unlink()
            source.unlink()
            with self.assertRaises(RuntimeError):
                verified_files(root, '0.3.0')
