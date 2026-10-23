import base64
import hashlib
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from bridge.app import State, create_app
from bridge.core import BridgeError, card_fields, media_mime
from bridge.fushi import Fushi
from fastapi.testclient import TestClient
from test_bridge import FakeCloud, FakeAnki


class FushiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.exe = self.root / 'fushi_cli.exe'
        self.exe.write_bytes(b'fixture')
        self.calls = []
        def runner(args, **options):
            self.calls.append((args, options))
            return SimpleNamespace(returncode=0, stdout=json.dumps({'favorites':[{'id':1,'text':'I clocked it. <script>x</script>','expression':'clock','bookTitle':'Fixture'}]}).encode())
        self.adapter = Fushi(runner=runner, executable=self.exe)
        self.state = State(self.root / 'state', cloud=FakeCloud())
        self.anki = FakeAnki()
        self.state.anki = lambda: self.anki
        self.state.fushi = self.adapter

    def tearDown(self):
        self.state.journal.db.close()
        self.temp.cleanup()

    def test_whitelist_argv_and_no_launch(self):
        with self.assertRaises(BridgeError): self.adapter.call('mine')
        rows = self.adapter.sources('favorites')
        self.assertEqual(rows[0]['id'],'favorites:1')
        args, options = self.calls[0]
        self.assertEqual(args[1:4],['--no-launch','--json','favorite'])
        self.assertFalse(options['shell'])
        self.assertEqual(options['timeout'],15)
        self.assertFalse(rows[0]['mediaAvailable'])
        self.adapter.runner=lambda *a,**k: (_ for _ in ()).throw(subprocess.TimeoutExpired('fixture',15))
        with self.assertRaisesRegex(BridgeError,'超时'):self.adapter.call('status')

    def selection(self):
        rows=self.state.fushi_sources('favorites')
        return {'selections':[{'id':rows[0]['id'],'meaning':'notice','translation':'注意到了','mediaIds':[]}]}

    def test_source_bounds_do_not_silently_truncate(self):
        self.adapter.runner=lambda *a,**k:SimpleNamespace(returncode=0,stdout=json.dumps({'favorites':[{'id':1,'text':'x'*4001}]}).encode())
        with self.assertRaisesRegex(BridgeError,'未截断'):
            self.adapter.sources('favorites',1)

    def test_empty_missing_quote_and_unknown_timestamp(self):
        self.adapter.runner=lambda *a,**k:SimpleNamespace(returncode=0,stdout=b'{"favorites":[{"id":"","text":"valid sentence"}]}')
        with self.assertRaisesRegex(BridgeError,'稳定标识'):
            self.adapter.sources('favorites',1)
        self.adapter.runner=lambda *a,**k:SimpleNamespace(returncode=0,stdout=b'{"favorites":[]}')
        self.assertEqual(self.adapter.sources('favorites',1),[])
        self.adapter.runner=lambda *a,**k:SimpleNamespace(returncode=0,stdout=b'{"favorites":[{"id":1,"createdAt":{"unexpected":1}}]}')
        row=self.adapter.sources('favorites',1)[0]
        self.assertEqual(row['quote'],'')
        self.assertIsNone(row['createdAt'])

    def test_local_preview_write_retry_undo_and_export(self):
        body=self.selection();v=self.state.prepare_local(body)
        self.assertNotIn('<script>',v['rows'][0]['fields']['Sentence'])
        export=self.state.export_local_scene()
        self.assertTrue(export['standalone']);self.assertEqual(export['scenes'][0]['quote'],'I clocked it. <script>x</script>')
        first=self.state.execute(v['confirmation']);self.assertEqual(first['result']['status'],'complete')
        again=self.state.prepare_local({'jobId':v['jobId']});self.assertEqual(again['rows'][0]['operation'],'skip')
        self.state.execute(again['confirmation']);self.assertEqual(self.anki.calls.count('addNote'),1)
        self.assertEqual(self.state.journal.batches('fixture')[0]['status'],'complete')

    def test_media_audio_integrity_and_export_boundary(self):
        data=b'RIFF'+b'0000'+b'WAVE'+b'fixture'
        ref=self.state.add_local_media({'name':'../sample.wav','data':base64.b64encode(data).decode()})
        self.assertEqual(ref['mime'],'audio/wav');self.assertEqual(ref['name'],'sample.wav')
        body=self.selection();body['selections'][0]['mediaIds']=[ref['id']]
        v=self.state.prepare_local(body);self.assertIn('[sound:lexi_',v['rows'][0]['fields']['Media'])
        with self.assertRaisesRegex(BridgeError,'音频'):self.state.export_local_scene()
        self.assertEqual(self.state.export_local_scene(True)['files'],[])
        self.state.execute(v['confirmation']);self.assertEqual(len(self.anki.media_files),1)
        self.assertEqual(media_mime(b'<svg>bad</svg>'),'')

    def test_owner_change_and_queue_guard(self):
        body=self.selection();owner='fixture';self.state.cloud.current=lambda:{'owner':owner}
        v=self.state.prepare_local(body);owner='other'
        with self.assertRaises(BridgeError):self.state.execute(v['confirmation'])
        with self.assertRaises(BridgeError):self.state.prepare_local(body)
        owner='fixture';self.state.sources[(owner,body['selections'][0]['id'])]['queued']=True
        with self.assertRaisesRegex(BridgeError,'原队列'):self.state.prepare_local(body)

    def test_http_diagnostics_and_origin(self):
        with TestClient(create_app(self.state,34567,'secret'),base_url='http://127.0.0.1:34567') as client:
            headers={'origin':'http://127.0.0.1:34567','x-bridge-token':'secret'}
            self.assertEqual(client.post('/api/fushi-sources',json={},headers=headers).status_code,200)
            self.assertEqual(client.post('/api/fushi-media',json={'data':'not-base64'},headers=headers).status_code,400)
            self.assertEqual(client.get('/assets/connection.js').status_code,200)
            self.assertEqual(client.get('/assets/fushi.js').status_code,404)


if __name__=='__main__':unittest.main()
