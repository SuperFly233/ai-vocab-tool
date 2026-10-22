"""Explicitly authorized personal dictionary lookup and dedicated Anki test note."""
import copy
import json
import os
import sys
import uuid
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'integrations/anki-bridge'))
from bridge.app import State
from bridge.cloud import Cloud,Vault,ORIGIN
from bridge.core import Anki,BridgeError,preview,undo_one
from bridge.dictionary import validate_snapshot
from bridge.remote import process_request

origin=os.environ.get('QA_ORIGIN','https://integration-acceptance.ai-vocab-tool.pages.dev')
if origin==ORIGIN:raise RuntimeError('Use the acceptance preview; production remains gated')
cloud=Cloud(Vault(),origin=origin)
run=str(uuid.uuid4())
state=State(ROOT/'tmp/anki-bridge-qa/dictionary-acceptance',cloud=cloud)
config_path=Path(os.environ['APPDATA'])/'Anki2/addons21/2055492159'
config={**json.loads((config_path/'config.json').read_text('utf-8')),**json.loads((config_path/'meta.json').read_text('utf-8')).get('config',{})}
if config.get('webBindAddress')!='127.0.0.1':raise RuntimeError('Anki must use loopback')
state.anki=lambda:Anki(config['webBindPort'],config.get('apiKey') or '')
report={'origin':origin,'deck':'Lexi 验收','run':run,'physicalPhoneTested':False,'ankiOwnSyncTested':False,'packagedExecutableTested':False}
job=None
binding=None
try:
 owner=state.bind_account();state.config.update(port=config['webBindPort'],deck='Lexi 验收',name='Lexi 词典专用验收');state.save_config()
 connection=state.anki()
 try:connection.diagnose()
 finally:connection.http.close()
 names=[row['name'] for row in state.fushi.call('dictionaries').get('dictionaries',[]) if row.get('enabled') is True and str(row.get('name','')).startswith('OALDPE')]
 if not names:raise BridgeError('没有可用的 OALDPE，未猜测词典来源。')
 cloud.call('register',deviceId=state.config['deviceId'],name=state.config['name'])
 request=cloud.call('device_request',deviceId=state.config['deviceId'],kind='dictionary_lookup',query='clock',dictionary=names[0])
 process_request(state)
 response=cloud.call('device_status',requestId=request['id'])
 if response['status']!='complete':raise BridgeError(response.get('error') or 'Dictionary request did not complete')
 entry=response['result']['entries'][0];sense=next((sense for sense in entry['senses'] if 'notice' in sense['html'].lower()),entry['senses'][0])
 saved=cloud.call('dictionary_save',requestId=request['id'],entryIndex=0,senseIds=[sense['id']])
 ref={'id':saved['id'],'hash':saved['hash']};snapshot=cloud.call('dictionary_get',snapshotId=saved['id']);validate_snapshot(snapshot,ref)
 assert len(snapshot['payload']['senses'])==1
 report.update(dictionary=names[0],requestId=request['id'],snapshotId=saved['id'],selectedSenses=1)
 print('Official Fushi lookup, cloud device receipt and immutable selected-sense snapshot passed',flush=True)
 card={'key':'dictionary-acceptance-'+run,'sourceType':'lexi','sourceId':'synthetic-dictionary-acceptance','sceneId':'dictionary-test-scene','entryId':'dictionary-test-entry','title':'clock','origin':'clcok','quote':'I clocked the detail.','translation':'我注意到了细节。','meaning':'Synthetic AI definition, kept separate from dictionary content.','note':'Authorized test only; not Anki cloud-sync acceptance.','sourceTitle':'Lexi dedicated dictionary acceptance','sourceUrl':'','exampleHighlights':['clocked'],'translationHighlights':['注意到'],'media':[],'dictionaryRef':ref}
 payload={'version':3,'cards':[card]};job=cloud.call('submit',deviceId=state.config['deviceId'],payload=payload)
 view=state.prepare(job['id']);binding=state.active['binding'];prepared=copy.deepcopy(state.active['job']['payload']['cards'])
 assert view['rows'][0]['operation']=='create','Refuse any existing-note update'
 assert view['rows'][0]['fields']['Origin']=='clcok' and view['rows'][0]['fields']['Dictionary']
 try:cloud.call('start',**state.lease())
 except BridgeError:pass
 else:raise AssertionError('Unconfirmed write was accepted')
 review=cloud.call('review_get',jobId=job['id']);assert review['valid'] and not review['approved']
 # User authorized this synthetic dedicated-deck batch; do not generalize to real tasks.
 cloud.call('review_approve',jobId=job['id'],revision=review['revision'])
 executed=state.execute(view['confirmation']);assert executed['result']['status']=='complete',executed
 receipts=cloud.call('results',jobId=job['id']);assert len(receipts)==1 and receipts[0]['status']=='complete'
 assert cloud.call('submit',deviceId=state.config['deviceId'],payload=payload)['id']==job['id']
 anki=state.anki();anki.model_version=2
 try:
  repeated=preview(anki,prepared,owner,binding);assert repeated[0]['operation']=='skip'
  note=anki.existing(repeated[0]['fields']['LexiKey']);assert note['fields']['DictionarySource']==names[0]
  assert note['fields']['Meaning']!=note['fields']['Dictionary']
 finally:anki.http.close()
 report.update(jobId=job['id'],created=1,duplicateSkipped=1,receiptVerified=True,model='Lexi Scene v2')
 print('Dedicated v2-template note, independent Origin/AI/dictionary fields, receipt and duplicate skip passed',flush=True)
finally:
 cleanup=[]
 if job and binding:
  anki=state.anki();anki.model_version=2
  try:
   for row in state.journal.rows(state.bind_account(),binding,job['id']):
    if row['operation']=='create' and row['noteId'] and undo_one(anki,row):
     state.journal.record(owner,binding,job['id'],row['key'],row['noteId'],'undone',row['before'],row['after'])
     cloud.call('undo',jobId=job['id'],deviceId=state.config['deviceId'],cardKey=row['key']);cleanup.append(row['noteId'])
  finally:anki.http.close()
 report['safelyUndone']=len(cleanup)
 state.journal.db.close();cloud.http.close()
 path=ROOT/'tmp/anki-bridge-qa/dictionary-acceptance-report.json';path.write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
 print('Dedicated-note safe undo:',len(cleanup),flush=True)
