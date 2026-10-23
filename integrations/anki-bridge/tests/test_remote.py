import copy
import json
import tempfile
import unittest

from bridge.app import State
from bridge.core import digest, preview, execute_one
from bridge.remote import process_request
from bridge.cloud import Cloud
from bridge.core import BridgeError
from test_bridge import FakeAnki, FakeCloud, FakeVault, card


class CommandCloud(FakeCloud):
    def __init__(self):
        self.queue = []
        self.results = []

    def call(self, action, **args):
        if action == 'device_poll':
            return self.queue.pop(0) if self.queue else None
        if action == 'device_result':
            self.results.append(copy.deepcopy(args))
            return {'saved': True}
        if action == 'health':
            return {'schema': 1, 'bridgeVersion': '0.2.0', 'privateToken': 'never-export'}
        return super().call(action, **args)


class RemoteTests(unittest.TestCase):
    def test_preview_origin_is_restricted_to_this_project(self):
        for url in ['http://ai-vocab-tool.pages.dev','https://ai-vocab-tool.pages.dev.evil.test','https://evil.test','https://ai-vocab-tool.pages.dev/path']:
            with self.assertRaises(BridgeError):
                Cloud(FakeVault(), origin=url)
        cloud=Cloud(FakeVault(), origin='https://integration-acceptance.ai-vocab-tool.pages.dev')
        self.assertEqual(cloud.origin,'https://integration-acceptance.ai-vocab-tool.pages.dev')
        cloud.http.close()
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.cloud = CommandCloud()
        self.state = State(self.temp.name, cloud=self.cloud)
        self.anki = FakeAnki()
        self.state.anki = lambda: self.anki
        self.reads = []
        def sources(kind, limit):
            self.reads.append((kind, limit))
            return [{'id': 'favorites:1', 'title': 'clock', 'quote': 'I clocked it.', 'key': 'fixture', 'queued': False}][:limit]
        self.state.fushi = type('Fixture', (), {'sources': staticmethod(sources), 'call': lambda self, action: {'running': True, 'version': '3.0.0', 'token': 'never-export'}})()
        self.state.bind_account()
        self.target = {'profile': 'test', 'deck': 'Other deck', 'binding': digest([self.state.config['port'], 'test', 'Other deck'])}

    def tearDown(self):
        self.state.journal.db.close()
        self.temp.cleanup()

    def request(self, kind, payload):
        self.cloud.queue.append({'id': 'request', 'kind': kind, 'payload': payload, 'lease_token': 'fixture'})
        process_request(self.state)
        return self.cloud.results[-1]

    def create_note(self):
        row = preview(self.anki, [card()], 'fixture', self.target['binding'])[0]
        return execute_one(self.anki, row, 'fixture', self.target['binding'], 'job', 'Other deck', self.state.journal, lambda ref: b'')

    def test_bounded_sources_and_device_identity(self):
        value = self.request('fushi_read', {'scope': 'favorites', 'limit': 5})
        self.assertEqual(self.reads, [('favorites', 5)])
        self.assertEqual(len(value['result']['items']), 1)
        self.assertTrue(value['result']['items'][0]['id'].startswith(self.state.config['deviceId'] + ':'))
        self.assertNotIn('lease_token', value['result'])

    def test_invalid_source_scope_never_calls_cli(self):
        value = self.request('fushi_read', {'scope': 'shell', 'limit': 200})
        self.assertIn('error', value)
        self.assertEqual(self.reads, [])

    def test_undo_uses_original_target_not_current_default(self):
        self.create_note()
        value = self.request('undo', {'jobId': 'job', 'target': self.target})
        self.assertEqual(value['result']['rows'][0]['status'], 'undone')
        self.assertEqual(len(self.anki.notes), 0)
        again = self.request('undo', {'jobId': 'job', 'target': self.target})
        self.assertEqual(again['result']['rows'][0]['status'], 'undone')
        self.assertEqual(self.anki.calls.count('deleteNotes'), 1)

    def test_undo_preserves_studied_and_wrong_target(self):
        self.create_note()
        self.anki.reps = 1
        value = self.request('undo', {'jobId': 'job', 'target': self.target})
        self.assertEqual(value['result']['rows'][0]['status'], 'error')
        value = self.request('undo', {'jobId': 'job', 'target': {**self.target, 'profile': 'other'}})
        self.assertIn('error', value)
        self.assertEqual(len(self.anki.notes), 1)

    def test_open_requires_matching_local_receipt(self):
        result = self.create_note()
        value = self.request('open_note', {'jobId': 'job', 'target': self.target, 'cardKey': 'one', 'noteId': result['noteId']})
        self.assertTrue(value['result']['opened'])
        value = self.request('open_note', {'jobId': 'job', 'target': self.target, 'cardKey': 'one', 'noteId': '999'})
        self.assertIn('error', value)
        self.assertEqual(self.anki.calls.count('guiBrowse'), 1)

    def test_diagnostics_do_not_upload_tokens_or_entire_software_config(self):
        value = self.request('diagnostics', {})
        text = json.dumps(value['result'])
        self.assertNotIn('never-export', text)
        self.assertNotIn('decks', text)
        self.assertTrue(value['result']['anki']['ok'])
        self.assertFalse(value['result']['cloud']['detail']['learningContent'], 'An old service is not full-content compatible merely because it responds')


if __name__ == '__main__':
    unittest.main()
