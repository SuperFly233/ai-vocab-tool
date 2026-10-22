"""Authorized synthetic acceptance through the preview API, normal account login and real test deck."""
import base64
import hashlib
import io
import json
import math
import os
import struct
import sys
import time
import wave
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'integrations/anki-bridge'))
from bridge.app import State
from bridge.cloud import Cloud, Vault, ORIGIN
from bridge.core import Anki, BridgeError, preview, undo_one
from bridge.remote import process_request

origin = os.environ.get('QA_ORIGIN', '')
if not origin or origin == ORIGIN:
    raise RuntimeError('Use an explicit official acceptance preview, not the production gate')
cloud = Cloud(Vault(), origin=origin)
state = State(ROOT / 'tmp/anki-bridge-qa/cloud-acceptance', cloud=cloud)
config_path = Path(os.environ['APPDATA']) / 'Anki2/addons21/2055492159'
config = {**json.loads((config_path/'config.json').read_text('utf-8')), **json.loads((config_path/'meta.json').read_text('utf-8')).get('config', {})}
if config.get('webBindAddress') != '127.0.0.1':
    raise RuntimeError('Refusing a non-loopback Anki target')
state.anki = lambda: Anki(config['webBindPort'], config.get('apiKey') or '')

def png_chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag+data) & 0xffffffff)
png = b'\x89PNG\r\n\x1a\n' + png_chunk(b'IHDR', struct.pack('>IIBBBBB',320,180,8,2,0,0,0)) + png_chunk(b'IDAT',zlib.compress(b''.join(b'\0'+bytes([43,121,134])*320 for _ in range(180)))) + png_chunk(b'IEND',b'')
audio = io.BytesIO()
with wave.open(audio,'wb') as wav:
    wav.setparams((1,2,16000,0,'NONE','not compressed'))
    wav.writeframes(b''.join(struct.pack('<h',int(1200*math.sin(2*math.pi*440*n/16000))) for n in range(6400)))
blobs = [png,audio.getvalue()]
refs = [{'id':hashlib.sha256(data).hexdigest(),'size':len(data),'mime':mime,'name':name} for data,mime,name in zip(blobs,['image/png','audio/wav'],['synthetic-cloud.png','synthetic-cloud.wav'])]
cards = [{'key':'cloud-acceptance-20261022-'+str(i),'sourceType':'fushi' if i else 'lexi','sourceId':'synthetic-only-'+str(i),'sceneId':'cloud-test-scene','entryId':'cloud-test-entry-'+str(i),'title':title,'origin':title,'quote':quote,'translation':'无私人内容的专用牌库验收','meaning':'Synthetic cloud acceptance only','note':'Not a test of Anki own cloud sync or actual audio playback','sourceTitle':'Lexi synthetic cloud acceptance','sourceUrl':'','exampleHighlights':[title],'translationHighlights':[],'media':[refs[i]]} for i,(title,quote) in enumerate([('clock','I clocked the detail.'),('connect the dots','Connect the dots and understand the scene.')])]
job = None
lease = None
report = {'origin':origin,'deck':'Lexi 验收','ankiOwnSyncTested':False,'physicalPhoneTested':False,'actualPlaybackTested':False}
try:
    owner = state.bind_account()
    state.config.update(port=config['webBindPort'],deck='Lexi 验收',name='Lexi 合成云验收')
    state.save_config()
    cloud.call('register',deviceId=state.config['deviceId'],name=state.config['name'])
    print('Normal account authentication and dedicated device registration passed', flush=True)
    for ref, data in zip(refs,blobs):
        for start in range(0,len(data),512*1024):
            cloud.post('/api/media',{'action':'put',**ref,'chunks':[{'index':start//(512*1024),'data':base64.b64encode(data[start:start+512*1024]).decode()}]})
        cloud.post('/api/media',{'action':'complete',**ref})
        assert hashlib.sha256(cloud.media(ref)).hexdigest()==ref['id']
    print('Two private synthetic media uploads and hash-verified downloads passed', flush=True)
    payload={'version':2,'cards':cards}
    job=cloud.call('submit',deviceId=state.config['deviceId'],payload=payload)
    if job['status']=='complete':
        old=cloud.call('review_get',jobId=job['id'])
        journaled=state.journal.rows(owner,old.get('snapshot',{}).get('binding',''),job['id'])
        if len(journaled)!=2 or any(row['operation']!='undone' for row in journaled):
            raise RuntimeError('Acceptance already completed; refusing to overwrite its notes')
        for row in journaled:cloud.call('undo',jobId=job['id'],deviceId=state.config['deviceId'],cardKey=row['key'])
        job['status']='cancelled'
    if job['status'] in ('cancelled','partial','error'):
        cloud.call('retry',jobId=job['id'])
    view=state.prepare(job['id'])
    assert all(row['operation']=='create' for row in view['rows']), 'Refusing to change any existing note'
    lease=state.lease()
    blocked=False
    try:cloud.call('start',**lease)
    except BridgeError:blocked=True
    assert blocked,'Writing without website approval must be rejected'
    review=cloud.call('review_get',jobId=job['id'])
    assert review['valid'] and not review['approved']
    # The human explicitly authorized this dedicated synthetic test batch in chat.
    cloud.call('review_approve',jobId=job['id'],revision=review['revision'])
    result=state.execute(view['confirmation'])
    assert result['result']['status']=='complete',result
    receipts=cloud.call('results',jobId=job['id'])
    assert len(receipts)==2 and all(row['status']=='complete' for row in receipts)
    assert cloud.call('submit',deviceId=state.config['deviceId'],payload=payload)['id']==job['id']
    anki=state.anki()
    try:
        repeated=preview(anki,cards,owner,review['snapshot']['binding'])
        assert all(row['operation']=='skip' for row in repeated)
        for ref in refs:
            suffix='.png' if ref['mime']=='image/png' else '.wav'
            data=base64.b64decode(anki.call('retrieveMediaFile',filename='lexi_'+ref['id']+suffix))
            assert hashlib.sha256(data).hexdigest()==ref['id']
    finally:anki.http.close()
    print('Web approval, two real Anki notes, receipts, stable-key dedupe and both media hashes passed',flush=True)
    for attempt in range(3):
        diagnostic=cloud.call('device_request',deviceId=state.config['deviceId'],kind='diagnostics')
        process_request(state)
        details=cloud.call('device_status',requestId=diagnostic['id'])
        if details['status']=='complete' and details['result']['anki']['ok']:break
        print('Diagnostic request interrupted; bounded read-only retry',flush=True)
        time.sleep(1)
    else:raise RuntimeError('Device diagnostics did not complete after three attempts')
    undo=cloud.call('device_request',deviceId=state.config['deviceId'],kind='undo',jobId=job['id'],confirmed=True)
    process_request(state)
    undone=cloud.call('device_status',requestId=undo['id'])
    assert undone['status']=='complete' and len(undone['result']['rows'])==2 and all(row['status']=='undone' for row in undone['result']['rows']),undone
    receipts=cloud.call('results',jobId=job['id'])
    assert all(row['status']=='undone' for row in receipts)
    anki=state.anki()
    try:assert all(anki.existing(row['fields']['LexiKey']) is None for row in view['rows'])
    finally:anki.http.close()
    cancelled=cloud.call('submit',deviceId=state.config['deviceId'],payload={'version':2,'cards':[{**cards[0],'key':'cloud-cancel-probe','note':'Synthetic cancellation probe'}]})
    cloud.call('cancel',jobId=cancelled['id'])
    assert next(row for row in cloud.call('list') if row['id']==cancelled['id'])['status']=='cancelled'
    report.update(jobId=job['id'],created=2,duplicateSkipped=2,mediaHashVerified=2,remoteUndo=2,cancelledBeforeWrite=1,diagnostics=True,diagnosticAttempts=attempt+1,productionGateEnabled=False)
    (ROOT/'tmp/anki-bridge-qa/cloud-acceptance-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
    print(json.dumps(report,ensure_ascii=True),flush=True)
finally:
    # Any failed acceptance only attempts guarded cleanup of its own journaled synthetic notes.
    if job:
        anki=state.anki()
        try:
            try:
                current=next(row for row in cloud.call('list') if row['id']==job['id'])
                if current['status']=='running' and lease:
                    cloud.call('cancel',jobId=job['id'])
                    cloud.call('finish',**lease)
            except BridgeError:pass
            for row in state.journal.rows(state.cloud.current()['owner'],(locals().get('review') or {}).get('snapshot',{}).get('binding',''),job['id']):
                if row['operation'] in ('create','update'):
                    try:
                        if undo_one(anki,row):state.journal.record(owner,review['snapshot']['binding'],job['id'],row['key'],row['noteId'],'undone',row['before'],row['after'])
                    except BridgeError:pass
                if row['operation']=='undone' or any(r['key']==row['key'] and r['operation']=='undone' for r in state.journal.rows(owner,review['snapshot']['binding'],job['id'])):
                    try:cloud.call('undo',jobId=job['id'],deviceId=state.config['deviceId'],cardKey=row['key'])
                    except BridgeError:pass
        finally:anki.http.close()
    state.journal.db.close()
    cloud.http.close()
