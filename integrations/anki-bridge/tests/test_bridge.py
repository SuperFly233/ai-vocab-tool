import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

import httpx
from fastapi.testclient import TestClient
from bridge.core import Anki, BridgeError, FIELDS, MODEL, FRONT, BACK, Journal, card_fields, preview, execute_one, undo_one, highlight
from bridge.cloud import Cloud
from bridge.app import State, create_app


def card(key='one'):
    return {'key': key, 'title': 'clock', 'quote': 'I clocked it. <script>bad()</script>', 'translation': '注意到了', 'meaning': '注意到', 'note': '', 'sourceTitle': '', 'sourceUrl': 'javascript:alert(1)', 'media': [], 'exampleHighlights': ['clocked'], 'translationHighlights': ['注意']}


class FakeAnki:
    def __init__(self):
        self.notes = {}
        self.lost = False
        self.reps = 0
        self.calls = []
        self.media_files = {}
        self.http = type('HTTP', (), {'close': lambda self: None})()

    def diagnose(self):
        return {'profile': 'test', 'decks': ['Lexi 验收'], 'version': 6}

    def ensure_model(self):
        pass

    def check_model(self):
        return True

    def existing(self, key):
        return copy.deepcopy(self.notes.get(key))

    def call(self, action, **args):
        self.calls.append(action)
        if action == 'getActiveProfile':
            return 'test'
        if action == 'addNote':
            fields = args['note']['fields']
            nid = len(self.notes) + 1
            self.notes[fields['LexiKey']] = {'id': nid, 'fields': copy.deepcopy(fields), 'cards': [nid], 'tags': copy.deepcopy(args['note'].get('tags', []))}
            if self.lost:
                self.lost = False
                raise BridgeError('Lost write response')
            return nid
        if action == 'updateNoteFields':
            fields = args['note']['fields']
            self.notes[fields['LexiKey']]['fields'] = copy.deepcopy(fields)
        if action == 'cardsInfo':
            return [{'reps': self.reps}]
        if action == 'deleteNotes':
            self.notes = {k: v for k, v in self.notes.items() if v['id'] not in args['notes']}
        if action == 'retrieveMediaFile':
            return self.media_files.get(args['filename'], False)
        if action == 'storeMediaFile':
            self.media_files[args['filename']] = args['data']

    media = Anki.media


class FakeVault:
    def get(self, key):
        return None


class FakeCloud:
    vault = FakeVault()

    def current(self):
        return {'owner': 'fixture'}

    def call(self, action, **args):
        if action == 'claim': return {'id': args['jobId'], 'lease_token': 'lease', 'payload': {'cards': [card()]}}
        if action == 'heartbeat': return {'cancelRequested': False}
        if action == 'finish': return {'status': 'complete'}
        return {}

    def media(self, ref):
        return b''


class Tests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.journal = Journal(Path(self.temp.name) / 'test.sqlite3')
        self.anki = FakeAnki()

    def tearDown(self):
        self.journal.db.close()
        self.temp.cleanup()

    def execute(self, row):
        return execute_one(self.anki, row, 'owner', 'profile', 'job', 'deck', self.journal, lambda _: b'fixture')

    def test_escaping_and_binding(self):
        fields = card_fields(card(), 'owner', 'profile')
        self.assertIn('<mark>clocked</mark>', fields['Sentence'])
        self.assertNotIn('<script>', fields['Sentence'])
        self.assertNotIn('javascript:', fields['Source'])
        self.assertNotEqual(fields['LexiKey'], card_fields(card(), 'another-owner', 'profile')['LexiKey'])
        self.assertNotEqual(fields['LexiKey'], card_fields(card('other'), 'owner', 'profile')['LexiKey'])

    def test_lost_write_retry_does_not_duplicate(self):
        row = preview(self.anki, [card()], 'owner', 'profile')[0]
        self.anki.lost = True
        with self.assertRaises(BridgeError): self.execute(row)
        recovered = preview(self.anki, [card()], 'owner', 'profile')[0]
        self.assertEqual(self.execute(recovered)['status'], 'skipped')
        self.assertEqual(self.anki.calls.count('addNote'), 1)
        receipt = self.journal.rows('owner', 'profile', 'job')[0]
        self.assertEqual(receipt['operation'], 'create')
        self.assertTrue(undo_one(self.anki, receipt))

    def test_preview_conflict(self):
        row = preview(self.anki, [card()], 'owner', 'profile')[0]
        self.execute(row)
        changed = card();changed['meaning'] = 'new meaning'
        row = preview(self.anki, [changed], 'owner', 'profile')[0]
        self.anki.notes[row['fields']['LexiKey']]['fields']['Notes'] = 'Later user edit'
        with self.assertRaisesRegex(BridgeError, '预览后'): self.execute(row)

    def test_undo_refuses_studied_or_modified(self):
        row = preview(self.anki, [card()], 'owner', 'profile')[0];self.execute(row)
        receipt = self.journal.rows('owner', 'profile', 'job')[0]
        self.anki.reps = 1
        with self.assertRaisesRegex(BridgeError, '学习'): undo_one(self.anki, receipt)
        self.anki.reps = 0;self.anki.notes[row['fields']['LexiKey']]['fields']['Notes'] = 'Later'
        with self.assertRaisesRegex(BridgeError, '后续修改'): undo_one(self.anki, receipt)

    def test_update_undo(self):
        self.execute(preview(self.anki, [card()], 'owner', 'profile')[0])
        updated = card();updated['meaning'] = 'new'
        self.execute(preview(self.anki, [updated], 'owner', 'profile')[0])
        self.assertTrue(undo_one(self.anki, self.journal.rows('owner', 'profile', 'job')[0]))
        self.assertEqual(next(iter(self.anki.notes.values()))['fields']['Meaning'], '注意到')

    def test_media_integrity_and_no_repeat_fetch(self):
        data = b'\x89PNG\r\n\x1a\nfixture';ref = {'id': hashlib.sha256(data).hexdigest(), 'mime': 'image/png', 'size': len(data)}
        with self.assertRaises(BridgeError): self.anki.media(ref, b'bad')
        self.anki.media(ref, data)
        self.anki.media(ref, lambda: self.fail('Repeated media download'))

    def test_cached_media_still_checks_actual_format(self):
        import base64
        data=b'\xff\xd8\xfffixture'
        ref={'id':hashlib.sha256(data).hexdigest(),'mime':'image/png','size':len(data)}
        self.anki.media_files['lexi_'+ref['id']+'.png']=base64.b64encode(data).decode()
        with self.assertRaises(BridgeError):self.anki.media(ref,lambda:self.fail('Unexpected download'))

    def test_undo_requires_known_creation_receipt(self):
        row=preview(self.anki,[card()],'owner','profile')[0]
        self.anki.lost=True
        with self.assertRaises(BridgeError):self.execute(row)
        uncertain=self.journal.rows('owner','profile','job')[0]
        self.assertEqual(uncertain['noteId'],'')
        with self.assertRaises(BridgeError):undo_one(self.anki,uncertain)
        self.assertEqual(len(self.anki.notes),1,'Do not delete a note without a proven creation receipt')

    def test_uncertain_creation_cannot_adopt_another_batch(self):
        row=preview(self.anki,[card()],'owner','profile')[0]
        self.execute(row)
        self.journal.record('owner','profile','other-job','one','','create',None,row['fields'])
        recovered=preview(self.anki,[card()],'owner','profile')[0]
        self.assertEqual(execute_one(self.anki,recovered,'owner','profile','other-job','deck',self.journal,lambda _:b'')['status'],'skipped')
        uncertain=self.journal.rows('owner','profile','other-job')[0]
        self.assertEqual(uncertain['noteId'],'')
        with self.assertRaises(BridgeError):undo_one(self.anki,uncertain)
        self.assertEqual(len(self.anki.notes),1)

    def test_creation_undo_preserves_later_user_tags(self):
        row=preview(self.anki,[card()],'owner','profile')[0]
        self.execute(row)
        self.anki.notes[row['fields']['LexiKey']]['tags'].append('my-later-tag')
        with self.assertRaisesRegex(BridgeError,'标签'):undo_one(self.anki,self.journal.rows('owner','profile','job')[0])
        self.assertEqual(len(self.anki.notes),1)

    def test_before_write_cancellation(self):
        row = preview(self.anki, [card()], 'owner', 'profile')[0]
        with self.assertRaises(BridgeError):
            execute_one(self.anki, row, 'owner', 'profile', 'job', 'deck', self.journal, lambda _: b'', lambda: (_ for _ in ()).throw(BridgeError('Cancelled')))
        self.assertFalse(self.anki.notes)

    def test_transport_diagnostics(self):
        def no_key(request):
            self.assertIsNone(json.loads(request.content)['key'])
            return httpx.Response(200,json={'result':6,'error':None})
        unkeyed=Anki(8765,transport=httpx.MockTransport(no_key))
        self.assertEqual(unkeyed.call('version'),6);unkeyed.http.close()
        for status, data in [(404, {}), (403, {}), (200, {'unexpected': True})]:
            with self.subTest(status=status):
                anki = Anki(8765, transport=httpx.MockTransport(lambda req: httpx.Response(status, json=data)))
                with self.assertRaises(BridgeError): anki.call('version')
                anki.http.close()

    def test_dedicated_template_protocol(self):
        exists = False
        changed = False
        def handler(request):
            nonlocal exists
            body = json.loads(request.content);action = body['action']
            result = None
            if action == 'modelNames': result = [MODEL] if exists else []
            if action == 'modelFieldNames': result = FIELDS
            if action == 'modelTemplates': result = {'Scene': {'Front': 'changed' if changed else FRONT, 'Back': BACK}}
            if action == 'createModel':
                self.assertEqual(body['params']['modelName'], MODEL)
                self.assertEqual(body['params']['inOrderFields'], FIELDS)
                exists = True;result = 1
            return httpx.Response(200, json={'result': result, 'error': None})
        anki = Anki(8765, transport=httpx.MockTransport(handler))
        anki.ensure_model();self.assertTrue(anki.check_model());changed = True
        with self.assertRaisesRegex(BridgeError, '卡面'): anki.ensure_model()
        anki.http.close()

    def test_cloud_credentials_never_save_password(self):
        saved = {}
        vault = type('Vault', (), {'put': lambda self,k,v: saved.update({k:v}), 'get': lambda self,k: saved.get(k)})()
        transport = httpx.MockTransport(lambda request: httpx.Response(200, json={'refresh_token': 'fixture-refresh', 'access_token': 'fixture-access', 'user': {'id': 'owner'}}))
        cloud = Cloud(vault, httpx.Client(transport=transport))
        cloud.login('fixture@example.invalid', 'fixture-password')
        self.assertNotIn('fixture-password', json.dumps(saved))
        self.assertNotIn('fixture-access', json.dumps(saved))
        vault.put = lambda *args: (_ for _ in ()).throw(BridgeError('Vault unavailable'))
        with self.assertRaises(BridgeError): cloud.login('fixture@example.invalid', 'another-password')
        self.assertIsNone(cloud.session)
        cloud.http.close()

    def test_loopback_auth_and_no_cors(self):
        state = State(Path(self.temp.name) / 'state', cloud=FakeCloud())
        app = create_app(state, 34567, 'secret')
        with TestClient(app, base_url='http://127.0.0.1:34567') as client:
            self.assertEqual(client.post('/api/status', json={}).status_code, 403)
            self.assertEqual(client.post('/api/status', json={}, headers={'origin': 'https://evil.example', 'x-bridge-token': 'secret'}).status_code, 403)
            good = {'origin': 'http://127.0.0.1:34567', 'x-bridge-token': 'secret'}
            self.assertEqual(client.post('/api/status', json={}, headers=good).status_code, 200)
            self.assertEqual(client.post('/api/execute', json={}, headers=good).status_code, 400)
            self.assertEqual(client.get('/', headers={'host': 'evil.example'}).status_code, 403)
        state.journal.db.close()

    def test_state_confirmation_and_account_change(self):
        state = State(Path(self.temp.name) / 'state', cloud=FakeCloud())
        state.anki = lambda: self.anki
        value = state.prepare('job')
        with self.assertRaises(BridgeError): state.execute('wrong')
        result = state.execute(value['confirmation'])
        self.assertEqual(result['result']['status'], 'complete')
        with self.assertRaises(BridgeError): state.execute(value['confirmation'])
        state.prepare('other-job');state.cloud.current = lambda: {'owner': 'another'}
        with self.assertRaisesRegex(BridgeError, '账号'): state.execute(state.active['token'])
        state.journal.db.close()


if __name__ == '__main__':
    unittest.main()
