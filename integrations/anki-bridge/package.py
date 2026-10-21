import hashlib
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[1] / 'tmp' / 'anki-bridge-build'
exe = OUT / 'LexiAnkiBridge-0.2.0.exe'
if not exe.is_file() or exe.read_bytes()[:2] != b'MZ':
    raise RuntimeError('Build and self-test the Windows executable first')
files = [(exe, exe.name), (HERE / 'README.md', 'README.md'), (HERE / 'migration.sql', 'migration.sql'), (OUT / 'THIRD_PARTY_NOTICES.json', 'THIRD_PARTY_NOTICES.json')]
files += [(file, str(file.relative_to(OUT)).replace('\\', '/')) for file in (OUT / 'licenses').rglob('*') if file.is_file()]
checksums = '\n'.join(hashlib.sha256(file.read_bytes()).hexdigest() + '  ' + name for file, name in files) + '\n'
target = OUT / 'LexiAnkiBridge-0.2.0-Windows.zip'
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file, name in files:
        archive.write(file, name)
    archive.writestr('SHA256SUMS.txt', checksums)
print(target)
print('ZIP SHA256:', hashlib.sha256(target.read_bytes()).hexdigest())
