import hashlib
import zipfile
from pathlib import Path
from bridge import __version__
from bridge.distribution import RECEIPT, verified_files, EXECUTABLE

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[1] / 'tmp' / 'anki-bridge-build'
name = 'LexiAnkiBridge-' + __version__
bundle = OUT / name
exe = bundle / EXECUTABLE
if not exe.is_file() or exe.read_bytes()[:2] != b'MZ':
    raise RuntimeError('Build and self-test the Windows executable first')
files = verified_files(bundle, __version__)
checksums = '\n'.join(value + '  ' + name + '/' + path for path, value in files.items()) + '\n'
target = OUT / (name + '-Windows-portable.zip')
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in files:
        archive.write(bundle / path, name + '/' + path)
    archive.write(bundle / RECEIPT, name + '/' + RECEIPT)
    archive.writestr('SHA256SUMS.txt', checksums)
print(target)
print('ZIP SHA256:', hashlib.sha256(target.read_bytes()).hexdigest())
