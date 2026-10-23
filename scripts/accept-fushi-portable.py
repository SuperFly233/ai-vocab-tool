"""Read at most one existing favorite with the real portable worker; never create Fushi content."""
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'integrations/anki-bridge'))
from bridge.cloud import Cloud, Vault
from bridge.distribution import verified_files
import httpx

VERSION = '0.3.1'
origin = os.environ.get('QA_ORIGIN', 'https://integration-acceptance.ai-vocab-tool.pages.dev')
directory = ROOT / 'tmp/anki-bridge-qa' / ('来源 便携验收 ' + str(uuid.uuid4()))
directory.mkdir(parents=True)
with zipfile.ZipFile(ROOT / f'tmp/anki-bridge-build/LexiAnkiBridge-{VERSION}-Windows-portable.zip') as bundle:
    if any(not (directory / name).resolve().is_relative_to(directory.resolve()) for name in bundle.namelist()):
        raise RuntimeError('Unsafe archive path')
    bundle.extractall(directory)
runtime = directory / ('LexiAnkiBridge-' + VERSION)
exe = runtime / ('LexiAnkiBridge-' + VERSION + '.exe')
verified_files(runtime, VERSION)
env = {k: v for k, v in os.environ.items() if k not in ('PYTHONHOME', 'PYTHONPATH', 'VIRTUAL_ENV')}
env['PATH'] = str(Path(os.environ['SystemRoot']) / 'System32')
subprocess.run([str(exe), '--self-test'], cwd=directory, env=env, timeout=45, check=True)
cloud = Cloud(Vault(), origin=origin)
owner = cloud.current()['owner']
device = str(uuid.uuid4())
data = directory / 'data'
data.mkdir()
(data / 'device.json').write_text(json.dumps({'deviceId': device, 'owner': owner, 'accounts': {owner: device}, 'name': 'Lexi 来源只读验收', 'port': 8765, 'deck': 'Lexi 验收'}), 'utf-8')
connection = directory / 'loopback.json'
args = [str(exe), '--data-dir', str(data), '--origin', origin, '--no-browser', '--connection-file', str(connection)]
process = None
client = httpx.Client(timeout=35, trust_env=False)
loopback = None
report = {'version': VERSION, 'origin': origin, 'realExecutable': True, 'fushiMutations': 0, 'ankiWrites': 0}

def wait(check, seconds=100):
    until = time.monotonic() + seconds
    while time.monotonic() < until:
        value = check()
        if value:
            return value
        if process.poll() is not None:
            raise RuntimeError('Portable worker exited: ' + str(process.returncode))
        time.sleep(2)
    raise RuntimeError('Bounded acceptance timeout')

def connect():
    global process, loopback, headers
    process = subprocess.Popen(args, cwd=directory, env=env, creationflags=subprocess.CREATE_NO_WINDOW)
    wait(connection.is_file, 30)
    handshake = json.loads(connection.read_text('utf-8'))
    loopback = 'http://127.0.0.1:' + str(handshake['port'])
    headers = {'Origin': loopback, 'X-Bridge-Token': handshake['token']}
    wait(lambda: client.get(loopback).status_code == 200, 30)

def local(action):
    response = client.post(loopback + '/api/' + action, headers=headers, json={})
    response.raise_for_status()
    return response.json()

try:
    connect()
    assert local('status')['owner'] == owner
    local('register')
    request_args = dict(deviceId=device, kind='fushi_read', scope='favorites', limit=1, confirmed=True, clientRequestId=str(uuid.uuid4()))
    request = cloud.call('device_request', **request_args)
    assert cloud.call('device_request', **request_args)['id'] == request['id']
    result = wait(lambda: (v if (v := cloud.call('device_status', requestId=request['id']))['status'] in ('complete', 'error') else None))
    if result['status'] != 'complete':
        raise RuntimeError(result.get('error', 'Read failed'))
    items = result['result']['items']
    assert len(items) <= 1
    report.update(atomicDedupe=True, readComplete=True, favoriteCount=len(items), actualImportVerified=False)
    local('shutdown'); process.wait(40)
    connect()
    assert cloud.call('device_status', requestId=request['id'])['result'] == result['result']
    assert cloud.call('device_request', **request_args)['id'] == request['id']
    report.update(restartRecovery=True, passed=True)
    print('Portable Fushi read passed; favorite count=' + str(len(items)) + '; no content printed, no Fushi/Anki writes.', flush=True)
finally:
    if loopback and process and process.poll() is None:
        try:
            local('shutdown'); process.wait(40)
        except Exception:
            process.kill(); process.wait(10); report['forcedStop'] = True
    client.close(); cloud.http.close()
    (ROOT / 'tmp/anki-bridge-qa/fushi-portable-report.json').write_text(json.dumps(report, indent=2), 'utf-8')
