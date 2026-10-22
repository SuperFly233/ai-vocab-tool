import hashlib
import json
import zipfile
from pathlib import Path
from bridge import __version__

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[1] / 'tmp' / 'anki-bridge-build'
exe = OUT / ('LexiAnkiBridge-'+__version__+'.exe')
if not exe.is_file() or exe.read_bytes()[:2] != b'MZ':
    raise RuntimeError('Build and self-test the Windows executable first')
receipt=exe.with_suffix('.selftest.json')
if not receipt.is_file():raise RuntimeError('No successful executable self-test receipt; refusing to package')
verification=json.loads(receipt.read_text('utf-8'))
if verification.get('passed') is not True or verification.get('version')!=__version__ or verification.get('sha256')!=hashlib.sha256(exe.read_bytes()).hexdigest():
    raise RuntimeError('Executable changed or self-test failed; refusing to package')
files = [(exe, exe.name), (HERE / 'README.md', 'README.md'), (HERE / 'migration.sql', 'migration.sql'), (HERE / 'migration-web-review.sql', 'migration-web-review.sql'), (OUT / 'THIRD_PARTY_NOTICES.json', 'THIRD_PARTY_NOTICES.json')]
files += [(file, str(file.relative_to(OUT)).replace('\\', '/')) for file in (OUT / 'licenses').rglob('*') if file.is_file()]
files += [(HERE / name,name) for name in ('migration-device-requests.sql','migration-pending-job.sql','migration-dictionary.sql')]
checksums = '\n'.join(hashlib.sha256(file.read_bytes()).hexdigest() + '  ' + name for file, name in files) + '\n'
target = OUT / ('LexiAnkiBridge-'+__version__+'-Windows.zip')
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file, name in files:
        archive.write(file, name)
    archive.writestr('SHA256SUMS.txt', checksums)
print(target)
print('ZIP SHA256:', hashlib.sha256(target.read_bytes()).hexdigest())
