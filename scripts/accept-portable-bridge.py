"""Authorized synthetic test deck only. Runs the extracted EXE, not an in-process State."""
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
import time
import uuid
import wave
import zipfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'integrations/anki-bridge'))
from bridge.cloud import Cloud, Vault, ORIGIN
from bridge.distribution import verified_files
import httpx

origin = os.environ.get('QA_ORIGIN', 'https://integration-acceptance.ai-vocab-tool.pages.dev')
if origin == ORIGIN and os.environ.get('QA_ALLOW_PRODUCTION') != 'dedicated-test-deck':
    raise RuntimeError('Production requires explicit dedicated-test-deck acceptance mode')
run = str(uuid.uuid4())
directory = ROOT / 'tmp' / 'anki-bridge-qa' / ('便携 验收 ' + run)
directory.mkdir(parents=True)
archive = ROOT / 'tmp/anki-bridge-build/LexiAnkiBridge-0.3.0-Windows-portable.zip'
with zipfile.ZipFile(archive) as bundle:
    for member in bundle.namelist():
        if not (directory / member).resolve().is_relative_to(directory.resolve()):
            raise RuntimeError('Unsafe archive path')
    bundle.extractall(directory)
runtime = directory / 'LexiAnkiBridge-0.3.0'
exe = runtime / 'LexiAnkiBridge-0.3.0.exe'
verified_files(runtime, '0.3.0')
tamper = runtime / '_internal/web/icons.js'
original = tamper.read_bytes()
tamper.write_bytes(original + b'\n/* simulated tamper */')
try:
    verified_files(runtime, '0.3.0')
except RuntimeError:
    pass
else:
    raise RuntimeError('Changed runtime was accepted')
finally:
    tamper.write_bytes(original)
environment = {key: value for key, value in os.environ.items() if key not in ('PYTHONPATH', 'PYTHONHOME', 'VIRTUAL_ENV')}
environment['PATH'] = str(Path(os.environ['SystemRoot']) / 'System32')
subprocess.run([str(exe), '--self-test'], cwd=directory, env=environment, timeout=45, check=True)
verified_files(runtime, '0.3.0')
cloud = Cloud(Vault(), origin=origin)
owner = cloud.current()['owner']
data = directory / 'data'
data.mkdir()
device = str(uuid.uuid4())
(data / 'device.json').write_text(json.dumps({'deviceId': device, 'owner': owner, 'accounts': {owner: device}, 'name': 'Lexi 便携程序专用验收', 'port': 8765, 'deck': 'Lexi 验收'}, ensure_ascii=False), 'utf-8')
connection_file = directory / 'loopback.json'
process = None
client = httpx.Client(timeout=35, trust_env=False)
loopback = None
jobs = []
old_key = cloud.vault.get('anki-key')
acceptance_key = None
report = {'version': '0.3.0', 'origin': origin, 'packagedExecutableTested': True, 'cleanEnvironment': True,
          'unicodeSpacePath': True, 'physicalPhoneTested': False, 'actualPlaybackTested': False, 'ankiOwnSyncTested': False}


def wait(check, seconds=150):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        value = check()
        if value:
            return value
        if process and process.poll() is not None:
            raise RuntimeError('Portable worker exited with ' + str(process.returncode))
        time.sleep(2)
    raise RuntimeError('Acceptance timed out; no success was inferred')


def local(action, **args):
    response = client.post(loopback + '/api/' + action, headers=headers, json=args)
    value = response.json()
    if response.status_code != 200:
        raise RuntimeError(value.get('error', 'Local request failed'))
    return value


def command(kind, **args):
    task = cloud.call('device_request', deviceId=device, kind=kind, **args)
    value = wait(lambda: (value if (value := cloud.call('device_status', requestId=task['id']))['status'] in ('complete', 'error') else None))
    if value['status'] != 'complete':
        raise RuntimeError(value.get('error', 'Device request failed'))
    return task, value['result']


def approve(job, label):
    session = cloud.current()
    result = subprocess.run(['node', 'scripts/accept-portable-review.cjs'], cwd=ROOT,
                            input=json.dumps({'origin': origin, 'owner': owner, 'access': session['access'], 'job': job, 'label': label}),
                            text=True, capture_output=True, timeout=100)
    if result.returncode:
        raise RuntimeError('Website approval failed: ' + result.stderr[-500:])
    print(result.stdout.strip(), flush=True)


try:
    args = [str(exe), '--data-dir', str(data), '--origin', origin, '--no-browser', '--connection-file', str(connection_file)]
    process = subprocess.Popen(args, cwd=directory, env=environment, creationflags=subprocess.CREATE_NO_WINDOW)
    wait(lambda: connection_file.is_file(), 30)
    handshake = json.loads(connection_file.read_text('utf-8'))
    loopback = 'http://127.0.0.1:' + str(handshake['port'])
    headers = {'Origin': loopback, 'X-Bridge-Token': handshake['token']}
    wait(lambda: client.get(loopback).status_code == 200, 30)
    assert local('status')['owner'] == owner
    assert subprocess.run(args, env=environment, cwd=directory, timeout=15).returncode == 3
    report['singleInstance'] = True
    local('detect-anki', confirmed=True)
    acceptance_key = cloud.vault.get('anki-key')
    local('register')
    _, diagnosis = command('diagnostics')
    assert diagnosis['anki']['ok'] and diagnosis['fushi']['ok'] and diagnosis['dictionary']['ok']
    names = [name for name in diagnosis['dictionary']['names'] if name.startswith('OALDPE')]
    request, result = command('dictionary_lookup', query='clock', dictionary=names[0])
    entry = result['entries'][0]
    sense = next((sense for sense in entry['senses'] if 'notice' in sense['html'].lower()), entry['senses'][0])
    saved = cloud.call('dictionary_save', requestId=request['id'], entryIndex=0, senseIds=[sense['id']])
    def chunk(tag, value):
        return struct.pack('>I', len(value)) + tag + value + struct.pack('>I', zlib.crc32(tag + value) & 0xffffffff)
    image = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 8, 8, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress((b'\0' + bytes([40, 120, 150]) * 8) * 8)) + chunk(b'IEND', b'')
    audio = io.BytesIO()
    with wave.open(audio, 'wb') as stream:
        stream.setparams((1, 2, 16000, 0, 'NONE', 'not compressed'))
        stream.writeframes(b'\0\0' * 1600)
    cards = []
    for index, (blob, mime, filename) in enumerate([(image, 'image/png', 'synthetic.png'), (audio.getvalue(), 'audio/wav', 'synthetic.wav')]):
        ref = {'id': hashlib.sha256(blob).hexdigest(), 'size': len(blob), 'mime': mime, 'name': filename}
        cloud.post('/api/media', {'action': 'put', **ref, 'chunks': [{'index': 0, 'data': base64.b64encode(blob).decode()}]})
        cloud.post('/api/media', {'action': 'complete', **ref})
        cards.append({'key': 'portable-' + run + '-' + str(index), 'sourceType': 'lexi', 'sourceId': 'synthetic-' + run,
                      'sceneId': 'portable-test-scene', 'entryId': 'portable-test-' + str(index), 'title': 'clock', 'origin': 'clcok',
                      'quote': 'I clocked the detail.', 'translation': '我注意到了细节。', 'meaning': 'Synthetic test definition.',
                      'note': 'Dedicated acceptance only; no Anki cloud sync claim.', 'sourceTitle': 'Lexi synthetic portable acceptance',
                      'sourceUrl': '', 'exampleHighlights': ['clocked'], 'translationHighlights': ['注意到'], 'media': [ref],
                      **({'dictionaryRef': {'id': saved['id'], 'hash': saved['hash']}} if index == 0 else {})})
    payload = {'version': 3, 'cards': cards}
    job = cloud.call('submit', deviceId=device, payload=payload)
    jobs.append(job)
    review = wait(lambda: (value if (value := cloud.call('review_get', jobId=job['id'])).get('valid') else None))
    assert all(row['operation'] == 'create' for row in review['snapshot']['rows'])
    assert not cloud.call('results', jobId=job['id'])
    approve(job, 'new-cards')
    results = wait(lambda: (rows if len(rows := cloud.call('results', jobId=job['id'])) == 2 else None))
    assert all(row['status'] == 'complete' for row in results), results
    assert cloud.call('submit', deviceId=device, payload=payload)['id'] == job['id']
    report.update(created=2, dictionarySaved=True, websiteConfirmed=True, duplicateSubmissionReused=True, receiptVerified=True)
    # Reorder the same cards to create a different batch while preserving stable note keys.
    repeated = cloud.call('submit', deviceId=device, payload={**payload, 'cards': cards[::-1]})
    jobs.append(repeated)
    repeated_review = wait(lambda: (value if (value := cloud.call('review_get', jobId=repeated['id'])).get('valid') else None))
    assert all(row['operation'] == 'skip' for row in repeated_review['snapshot']['rows'])
    approve(repeated, 'unchanged-cards')
    skipped = wait(lambda: (rows if len(rows := cloud.call('results', jobId=repeated['id'])) == 2 else None))
    assert all(row['status'] == 'skipped' for row in skipped), skipped
    report['unchangedNotesSkipped'] = 2
    updated_card = {**cards[0], 'meaning': 'Updated synthetic definition.', 'origin': 'clock'}
    updated = cloud.call('submit', deviceId=device, payload={'version': 3, 'cards': [updated_card]})
    jobs.append(updated)
    updated_review = wait(lambda: (value if (value := cloud.call('review_get', jobId=updated['id'])).get('valid') else None))
    row = updated_review['snapshot']['rows'][0]
    assert row['operation'] == 'update'
    assert {change['field'] for change in row['changes']} == {'Origin', 'Meaning'}
    approve(updated, 'updated-card')
    changed = wait(lambda: (rows if len(rows := cloud.call('results', jobId=updated['id'])) == 1 else None))
    assert changed[0]['status'] == 'complete'
    _, restored = command('undo', jobId=updated['id'], confirmed=True)
    assert restored['rows'][0]['status'] == 'undone'
    report['updateDiffAndUndo'] = True
    _, undone = command('undo', jobId=job['id'], confirmed=True)
    assert len(undone['rows']) == 2 and all(row['status'] == 'undone' for row in undone['rows']), undone
    report['safelyUndone'] = 2
    local('shutdown')
    process.wait(40)
    assert not connection_file.exists()
    process = subprocess.Popen(args, cwd=directory, env=environment, creationflags=subprocess.CREATE_NO_WINDOW)
    wait(lambda: connection_file.is_file(), 30)
    handshake = json.loads(connection_file.read_text('utf-8'))
    loopback = 'http://127.0.0.1:' + str(handshake['port'])
    headers = {'Origin': loopback, 'X-Bridge-Token': handshake['token']}
    wait(lambda: client.get(loopback).status_code == 200, 30)
    assert local('status')['config']['deviceId'] == device
    time.sleep(7)
    assert all(row['status'] == 'undone' for row in cloud.call('results', jobId=job['id']))
    report['restartPreservesDeviceAndReceipts'] = True
    report['passed'] = True
    print('Extracted portable EXE: dictionary, two synthetic notes, website approval, receipts and safe undo passed', flush=True)
finally:
    if not report.get('safelyUndone'):
        for job in reversed(jobs):
            try:
                cloud.call('cancel', jobId=job['id'])
                if not cloud.call('results', jobId=job['id']):
                    report['noCreatedNotesToClean'] = True
                    continue
                _, result = command('undo', jobId=job['id'], confirmed=True)
                report['cleanup'] = [row['status'] for row in result['rows']]
            except Exception:
                report['cleanupNeedsAttention'] = True
    if loopback and process and process.poll() is None:
        try:
            local('shutdown')
            process.wait(40)
        except Exception:
            process.kill()
            process.wait(10)
            report['forcedStop'] = True
    if process and process.poll() is None:
        process.kill()
        process.wait(10)
    if acceptance_key is not None and cloud.vault.get('anki-key') == acceptance_key:
        if old_key is None:
            cloud.vault.delete('anki-key')
        else:
            cloud.vault.put('anki-key', old_key)
    connection_file.unlink(missing_ok=True)
    client.close()
    cloud.http.close()
    (ROOT / 'tmp/anki-bridge-qa/portable-acceptance-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), 'utf-8')
