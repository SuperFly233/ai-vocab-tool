import json
import subprocess
import sys
import time
from pathlib import Path
from bridge import __version__
from bridge.distribution import RECEIPT, verified_files, EXECUTABLE

OUT = Path(__file__).resolve().parents[2] / 'tmp' / 'anki-bridge-build'
name = 'LexiAnkiBridge-' + __version__
exe = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else OUT / name / EXECUTABLE
if not exe.is_file() or exe.read_bytes()[:2] != b'MZ':
    raise RuntimeError('Expected a built Windows executable')
(exe.parent / RECEIPT).unlink(missing_ok=True)
report = {'stage': 'portable-self-test', 'version': __version__, 'passed': False}
started = time.monotonic()
try:
    with (OUT / 'portable-selftest.log').open('w', encoding='utf-8') as log:
        result = subprocess.run([str(exe), '--self-test'], cwd=exe.parent, timeout=45,
                                stdout=log, stderr=subprocess.STDOUT)
    report['exitCode'] = result.returncode
    if result.returncode:
        raise RuntimeError('Self-test failed; see portable-selftest.log')
    verified_files(exe.parent, __version__)
    report['passed'] = True
except subprocess.TimeoutExpired:
    report['timedOut'] = True
    raise RuntimeError('Self-test exceeded 45 seconds; stopped') from None
finally:
    report['seconds'] = round(time.monotonic() - started, 2)
    (OUT / 'portable-selftest-result.json').write_text(json.dumps(report, indent=2), 'utf-8')
print('Portable runtime self-test passed')
