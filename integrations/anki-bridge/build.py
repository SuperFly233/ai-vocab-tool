import json
import os
import shutil
import subprocess
import sys
import time
from importlib import metadata
from pathlib import Path
from bridge import __version__
from bridge.distribution import EXECUTABLE

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
OUT = ROOT / 'tmp' / 'anki-bridge-build'
OUT.mkdir(parents=True, exist_ok=True)
NAME='LexiAnkiBridge-'+__version__
diagnostic='--diagnostic' in sys.argv
if diagnostic:NAME+='-diagnostic'
from bridge.distribution import RECEIPT
(OUT / NAME / RECEIPT).unlink(missing_ok=True)
os.environ['PYINSTALLER_CONFIG_DIR'] = str(OUT / 'cache')
os.environ['PYTHONHASHSEED'] = '0'
os.environ['PYTHONDONTWRITEBYTECODE'] = '1'
notices = []
licenses = OUT / 'licenses'
licenses.mkdir(exist_ok=True)
python_license = Path(sys.base_prefix) / 'LICENSE.txt'
if python_license.is_file():
    shutil.copyfile(python_license, licenses / 'Python-LICENSE.txt')
for dist in metadata.distributions():
    name = dist.metadata['Name']
    notices.append({'name': name, 'version': dist.version, 'license': dist.metadata.get('License-Expression') or dist.metadata.get('License') or [c for c in dist.metadata.get_all('Classifier', []) if c.startswith('License ::')], 'source': dist.metadata.get('Home-page') or dist.metadata.get_all('Project-URL', [])})
    for file in dist.files or []:
        if any(part.lower() == 'licenses' or part.lower().startswith(('license', 'copying')) for part in file.parts):
            source = Path(dist.locate_file(file))
            if source.is_file():
                target = licenses / name / Path(*file.parts[1:])
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, target)
(OUT / 'THIRD_PARTY_NOTICES.json').write_text(json.dumps(notices, ensure_ascii=False, indent=2), 'utf-8')
started = time.monotonic()
report = {'stage': 'build', 'version': __version__, 'format': 'onedir'}
version_file=OUT/'windows-version.txt'
version_tuple=tuple(int(v) for v in __version__.split('.'))+(0,)
version_file.write_text("VSVersionInfo(ffi=FixedFileInfo(filevers="+repr(version_tuple)+",prodvers="+repr(version_tuple)+",mask=0x3f,flags=0,OS=0x40004,fileType=1,subtype=0,date=(0,0)),kids=[StringFileInfo([StringTable('040904B0',[StringStruct('CompanyName','Lexi'),StringStruct('FileDescription','Lexi 连接助手'),StringStruct('ProductName','Lexi 连接助手'),StringStruct('FileVersion','"+__version__+"'),StringStruct('ProductVersion','"+__version__+"'),StringStruct('OriginalFilename','"+EXECUTABLE+"')])]),VarFileInfo([VarStruct('Translation',[1033,1200])])])",'utf-8')
runtime_data = []
for shared in ('bridge-release.js', 'bridge-connection.css'):
    runtime_data += ['--add-data', str(ROOT / shared) + ';web']
certificate_policy = Path(sys.base_prefix) / 'Lib' / 'codex-rejected-cas.pem'
if certificate_policy.is_file():
    runtime_data += ['--add-data', str(certificate_policy) + ';.']
try:
    with (OUT / 'portable-build.log').open('w', encoding='utf-8') as log:
        result = subprocess.run([sys.executable, '-m', 'PyInstaller', '--noconfirm', '--clean', '--onedir', '--console' if diagnostic else '--noconsole', '--name', NAME, '--icon',str(HERE/'web/app-icon.ico'),'--version-file',str(version_file), '--specpath', str(OUT), '--workpath', str(OUT / 'work'), '--distpath', str(OUT), '--paths', str(HERE), '--add-data', str(HERE / 'web') + ';web', '--add-data', str(ROOT / 'learning-card.css') + ';web', '--add-data', str(ROOT / 'icons.js') + ';web', '--add-data', str(ROOT / 'favicon.svg') + ';web', '--hidden-import', 'keyring.backends.Windows','--hidden-import','pystray._win32', *runtime_data, str(HERE / 'run.py')], cwd=ROOT, timeout=180, stdout=log, stderr=subprocess.STDOUT)
    report['exitCode'] = result.returncode
    if result.returncode:
        raise RuntimeError('Portable build failed; see portable-build.log. Do not retry automatically.')
except subprocess.TimeoutExpired:
    report['timedOut'] = True
    raise RuntimeError('Portable build exceeded 180 seconds; stopped') from None
finally:
    report['seconds'] = round(time.monotonic() - started, 2)
    (OUT / 'portable-build-result.json').write_text(json.dumps(report, indent=2), 'utf-8')
shutil.copyfile(ROOT / 'node_modules' / 'lucide' / 'LICENSE', licenses / 'lucide-LICENSE')
shutil.copyfile(ROOT / 'vendor' / 'tabler' / 'LICENSE', licenses / 'tabler-LICENSE')
bundle = OUT / NAME
(bundle/(NAME+'.exe')).replace(bundle/EXECUTABLE)
shutil.copyfile(HERE / 'README.md', bundle / 'README.md')
shutil.copyfile(OUT / 'THIRD_PARTY_NOTICES.json', bundle / 'THIRD_PARTY_NOTICES.json')
shutil.copytree(licenses, bundle / 'licenses', dirs_exist_ok=True)
shutil.copytree(metadata.distribution('pystray').locate_file('pystray'), bundle / 'third-party-source' / 'pystray',
                ignore=shutil.ignore_patterns('__pycache__', '*.pyc'), dirs_exist_ok=True)
for source in HERE.glob('migration*.sql'):
    shutil.copyfile(source, bundle / source.name)
print(bundle / EXECUTABLE)
