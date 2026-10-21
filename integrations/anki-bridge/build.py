import json
import os
import shutil
import subprocess
import sys
from importlib import metadata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
OUT = ROOT / 'tmp' / 'anki-bridge-build'
OUT.mkdir(parents=True, exist_ok=True)
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
        if any(part.lower() in ('licenses', 'license', 'license.txt', 'copying', 'copying.txt') for part in file.parts):
            source = Path(dist.locate_file(file))
            if source.is_file():
                target = licenses / name / Path(*file.parts[1:])
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, target)
(OUT / 'THIRD_PARTY_NOTICES.json').write_text(json.dumps(notices, ensure_ascii=False, indent=2), 'utf-8')
subprocess.run([sys.executable, '-m', 'PyInstaller', '--noconfirm', '--clean', '--onefile', '--noconsole', '--name', 'LexiAnkiBridge-0.2.0', '--specpath', str(OUT), '--workpath', str(OUT / 'work'), '--distpath', str(OUT), '--paths', str(HERE), '--add-data', str(HERE / 'web') + ';web', '--add-data', str(ROOT / 'icons.js') + ';web', '--add-data', str(ROOT / 'favicon.svg') + ';web', '--hidden-import', 'keyring.backends.Windows', str(HERE / 'run.py')], check=True, cwd=ROOT)
shutil.copyfile(HERE / 'README.md', OUT / 'README.md')
shutil.copyfile(ROOT / 'node_modules' / 'lucide' / 'LICENSE', licenses / 'lucide-LICENSE')
print(OUT / 'LexiAnkiBridge-0.2.0.exe')
