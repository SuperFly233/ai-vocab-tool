"""Fresh portable bundle, isolated identity and blocking proxy; no private Anki/cloud writes."""
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
import time
import uuid
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import httpx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'integrations/anki-bridge'))
from bridge import __version__
from bridge.distribution import verified_files

directory = ROOT / 'tmp' / ('bridge-idle-' + str(uuid.uuid4()))
directory.mkdir()
archive = ROOT / 'tmp/anki-bridge-build' / f'LexiAnkiBridge-{__version__}-Windows-portable.zip'
with zipfile.ZipFile(archive) as bundle:
    for member in bundle.namelist():
        if not (directory / member).resolve().is_relative_to(directory.resolve()):
            raise RuntimeError('Unsafe archive path')
    bundle.extractall(directory)
runtime = directory / f'LexiAnkiBridge-{__version__}'
verified_files(runtime, __version__)
target = runtime / '_internal/web/connection.js'
original = target.read_bytes()
target.write_bytes(original + b'\n/* tampered fixture */')
try:
    try:
        verified_files(runtime, __version__)
    except RuntimeError:
        pass
    else:
        raise RuntimeError('Tampered package accepted')
finally:
    target.write_bytes(original)

requests = []


class BlockProxy(BaseHTTPRequestHandler):
    def do_CONNECT(self):
        requests.append(self.path)
        self.send_error(503)

    def do_GET(self):
        requests.append(self.path)
        self.send_error(503)

    do_POST = do_GET

    def log_message(self, *_):
        pass


proxy = ThreadingHTTPServer(('127.0.0.1', 0), BlockProxy)
threading.Thread(target=proxy.serve_forever, daemon=True).start()
environment = {key: value for key, value in os.environ.items() if key not in ('PYTHONPATH', 'PYTHONHOME', 'VIRTUAL_ENV')}
environment.update(HTTP_PROXY=f'http://127.0.0.1:{proxy.server_port}', HTTPS_PROXY=f'http://127.0.0.1:{proxy.server_port}', ALL_PROXY=f'http://127.0.0.1:{proxy.server_port}', NO_PROXY='127.0.0.1,localhost')
data = directory / 'isolated-data'
data.mkdir()
identity = str(uuid.uuid4())
(data / 'device.json').write_text(json.dumps({'deviceId': identity, 'owner': 'synthetic', 'accounts': {'synthetic': identity}, 'name': 'Synthetic idle verification', 'port': 8765, 'deck': 'Lexi 验收'}), encoding='utf-8')
connection = directory / 'loopback.json'
exe = runtime / 'LexiConnect.exe'
flags = subprocess.CREATE_NO_WINDOW
client = httpx.Client(trust_env=False, timeout=3)
process = None


def launch():
    child = subprocess.Popen([str(exe), '--data-dir', str(data), '--no-browser', '--connection-file', str(connection)], env=environment, creationflags=flags)
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        if child.poll() is not None:
            raise RuntimeError('Portable exited before handshake')
        if connection.exists():
            value = json.loads(connection.read_text('utf-8'))
            return child, value
        time.sleep(.1)
    child.terminate()
    child.wait(10)
    raise RuntimeError('Portable startup timeout')


try:
    process, value = launch()
    base = f'http://127.0.0.1:{value["port"]}'
    headers = {'Origin': base, 'X-Bridge-Token': value['token']}
    duplicate = subprocess.run([str(exe), '--data-dir', str(data), '--no-browser'], env=environment, timeout=15, creationflags=flags)
    assert duplicate.returncode == 3
    for _ in range(12):
        response = client.post(base + '/api/status', headers=headers, json={})
        assert response.status_code == 200
        assert response.json()['paused'] is True
        time.sleep(1)
    assert requests == [], f'Unexpected outbound requests: {len(requests)}'
    assert client.post(base + '/api/shutdown', headers=headers, json={}).status_code == 200
    process.wait(15)
    assert process.returncode == 0
    process, value = launch()
    base = f'http://127.0.0.1:{value["port"]}'
    headers = {'Origin': base, 'X-Bridge-Token': value['token']}
    response = client.post(base + '/api/status', headers=headers, json={})
    assert response.json()['config']['deviceId'] == identity
    assert response.json()['paused'] is True
    assert requests == []
    assert client.post(base + '/api/shutdown', headers=headers, json={}).status_code == 200
    process.wait(15)
    assert process.returncode == 0
    result = {'version': __version__, 'freshExtraction': True, 'duplicateStartupGuard': True, 'restartIdentityPreserved': True, 'defaultPaused': True, 'outboundRequests': len(requests), 'tamperRejected': True, 'privateRecordsTouched': False, 'liveAnkiTested': False}
    (directory / 'result.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result))
finally:
    if process and process.poll() is None:
        process.terminate()
        process.wait(10)
    client.close()
    proxy.shutdown()
    proxy.server_close()
