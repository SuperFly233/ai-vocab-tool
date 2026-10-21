"""Explicitly authorized synthetic test-deck acceptance; never prints credentials."""
import base64
import hashlib
import io
import json
import math
import os
import struct
import sys
import wave
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'integrations/anki-bridge'))
from bridge.core import Anki, Journal, digest, execute_one, preview, undo_one

root=Path(__file__).resolve().parents[1]
config_path=Path(os.environ['APPDATA'])/'Anki2/addons21/2055492159'
config={**json.loads((config_path/'config.json').read_text('utf-8')),**json.loads((config_path/'meta.json').read_text('utf-8')).get('config',{})}
if config.get('webBindAddress')!='127.0.0.1':raise RuntimeError('Not a loopback target')
anki=Anki(config['webBindPort'],config.get('apiKey') or '')
journal=Journal(root/'tmp/anki-bridge-qa/real-acceptance.sqlite3')
deck='Lexi 验收'
def chunk(tag,data):return struct.pack('>I',len(data))+tag+data+struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',320,180,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(b'\0'+bytes([43,121,134])*320 for _ in range(180))))+chunk(b'IEND',b'')
audio=io.BytesIO()
with wave.open(audio,'wb') as wav:
    wav.setparams((1,2,16000,0,'NONE','not compressed'))
    wav.writeframes(b''.join(struct.pack('<h',int(1200*math.sin(2*math.pi*440*n/16000))) for n in range(6400)))
blobs=[png,audio.getvalue()]
refs=[{'id':hashlib.sha256(data).hexdigest(),'name':name,'mime':mime,'size':len(data)} for data,name,mime in zip(blobs,['acceptance.png','acceptance.wav'],['image/png','audio/wav'])]
cards=[{'key':'acceptance-20261022-'+str(i),'sourceType':'fushi' if i else 'lexi','sourceId':'synthetic-'+str(i),'title':title,'quote':quote,'translation':'仅用于专用牌库验收','meaning':'Synthetic acceptance only','note':'无私人数据；不测试 Anki 自身云同步','sourceTitle':'Lexi controlled acceptance','sourceUrl':'','exampleHighlights':[title],'translationHighlights':[],'media':[refs[i]]} for i,(title,quote) in enumerate([('clock','I clocked the detail.'),('connect the dots','Connect the dots and understand the scene.')])]
try:
    connection=anki.diagnose()
    anki.ensure_model()
    if deck not in connection['decks']:anki.call('createDeck',deck=deck)
    binding=digest([config['webBindPort'],connection['profile'],deck])
    rows=preview(anki,cards,'synthetic-acceptance',binding)
    if any(row['operation']!='create' for row in rows):raise RuntimeError('Acceptance source already exists; refusing to overwrite')
    receipts=[]
    for row in rows:
        receipts.append(execute_one(anki,row,'synthetic-acceptance',binding,'acceptance-20261022',deck,journal,lambda ref:blobs[refs.index(ref)]))
    repeated=preview(anki,cards,'synthetic-acceptance',binding)
    assert all(row['operation']=='skip' for row in repeated)
    for row in repeated:assert execute_one(anki,row,'synthetic-acceptance',binding,'acceptance-20261022',deck,journal,lambda ref:(_ for _ in ()).throw(RuntimeError('Unexpected media fetch')))['status']=='skipped'
    for ref in refs:
        ext='png' if ref['mime']=='image/png' else 'wav'
        raw=anki.call('retrieveMediaFile',filename='lexi_'+ref['id']+'.'+ext)
        assert hashlib.sha256(base64.b64decode(raw)).hexdigest()==ref['id']
    assert '[sound:lexi_' in repeated[1]['fields']['Media']
    restored=[]
    for row in journal.rows('synthetic-acceptance',binding,'acceptance-20261022'):
        assert undo_one(anki,row)
        restored.append(row['noteId'])
        journal.record('synthetic-acceptance',binding,'acceptance-20261022',row['key'],row['noteId'],'undone',row['before'],row['after'])
    assert all(anki.existing(row['fields']['LexiKey']) is None for row in rows)
    report={'deck':deck,'created':len(receipts),'duplicateSkipped':len(repeated),'mediaHashVerified':len(refs),'safeUndo':len(restored),'originalFushiModified':False,'ankiCloudSyncTested':False}
    (root/'tmp/anki-bridge-qa/real-acceptance-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
    print(json.dumps(report,ensure_ascii=True))
finally:
    anki.http.close();journal.db.close()
