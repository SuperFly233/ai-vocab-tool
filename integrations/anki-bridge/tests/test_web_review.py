import copy
import tempfile
import unittest
from unittest.mock import Mock

from bridge.app import State
from bridge.core import BridgeError
from test_bridge import FakeCloud, FakeAnki, card


class ReviewCloud(FakeCloud):
    def __init__(self):
        self.snapshot = None
        self.approved = False
        self.requested = None
        self.status = 'awaiting_device'
        self.device = ''

    def call(self, action, **args):
        if action == 'list':
            return [{'id': 'fixture', 'device_id': self.device, 'status': self.status,
                     'payload': {'confirmationMode': 'web', 'cards': [card()]}}]
        if action == 'next_job':
            return {'id': 'fixture'} if self.status in ('awaiting_device','awaiting_confirmation','running') else None
        if action == 'claim':
            self.status = 'awaiting_confirmation'
            return {'id': 'fixture', 'lease_token': 'lease', 'payload': {'confirmationMode': 'web', 'cards': [card()]}}
        if action == 'review_get':
            return {'snapshot': self.snapshot, 'requestedDeck': self.requested,
                    'valid': self.snapshot is not None, 'approved': self.approved}
        if action == 'review_publish':
            self.snapshot = copy.deepcopy(args['snapshot'])
            self.requested = None
            self.approved = False
            return {'revision': 'new'}
        if action == 'start':
            if not self.approved:
                raise BridgeError('Website confirmation required')
            self.status = 'running'
        if action == 'finish':
            self.status = 'complete'
        return super().call(action, **args)


class WebReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.cloud = ReviewCloud()
        self.state = State(self.temp.name, cloud=self.cloud)
        self.anki = FakeAnki()
        self.state.anki = lambda: self.anki
        self.state.bind_account()
        self.cloud.device = self.state.config['deviceId']

    def tearDown(self):
        self.state.journal.db.close()
        self.temp.cleanup()

    def test_web_confirmation_is_required_before_write(self):
        self.state.web_tick()
        self.assertEqual(self.cloud.snapshot['rows'][0]['operation'], 'create')
        self.assertEqual(self.anki.calls.count('addNote'), 0)
        self.state.web_tick()
        self.assertEqual(self.anki.calls.count('addNote'), 0)
        self.cloud.approved = True
        self.state.web_tick()
        self.assertEqual(self.anki.calls.count('addNote'), 1)
        self.assertIsNone(self.state.active)

    def test_target_change_reprepares_and_revokes_approval(self):
        self.state.web_tick()
        self.cloud.snapshot = None
        self.cloud.approved = True
        self.cloud.requested = 'Missing deck'
        with self.assertRaises(BridgeError):
            self.state.web_tick()
        self.assertEqual(self.anki.calls.count('addNote'), 0)
        self.assertIsNone(self.state.active)

    def test_restart_recovers_pending_preview_not_a_false_write(self):
        self.cloud.status = 'awaiting_confirmation'
        self.state.web_tick()
        self.assertIsNotNone(self.state.active)
        self.assertFalse(self.cloud.approved)
        self.assertEqual(self.anki.calls.count('addNote'), 0)

    def test_interrupted_execution_requires_another_preview(self):
        self.cloud.status = 'running'
        self.cloud.approved = True
        self.state.web_tick()
        self.assertFalse(self.cloud.approved)
        self.assertEqual(self.anki.calls.count('addNote'), 0)

    def test_preview_never_uploads_unrelated_fields(self):
        self.state.web_tick()
        self.assertEqual(self.cloud.snapshot['rows'][0]['previous'], {})
        self.assertNotIn('token', self.cloud.snapshot)
        self.assertNotIn('lease_token', self.cloud.snapshot)

    def test_legacy_job_cannot_attach_dictionary_reference(self):
        original=self.cloud.call
        def response(action, **args):
            result=original(action, **args)
            if action=='claim':
                result['payload']['version']=2
                result['payload']['cards'][0]['dictionaryRef']={'id':'fixture','hash':'a'*64}
            return result
        self.cloud.call=Mock(side_effect=response)
        with self.assertRaisesRegex(BridgeError,'新版任务'):
            self.state.prepare('fixture')
        self.assertIsNone(self.state.active)
        self.assertFalse(any(call.args[0]=='dictionary_get' for call in self.cloud.call.call_args_list))
        self.assertEqual(self.anki.calls.count('addNote'),0)

    def test_invalid_dictionary_snapshot_never_becomes_writable(self):
        original=self.cloud.call
        def response(action, **args):
            if action=='dictionary_get':return {'canonical':'{','hash':'a'*64}
            result=original(action, **args)
            if action=='claim':
                result['payload']['version']=3
                result['payload']['cards'][0]['dictionaryRef']={'id':'fixture','hash':'a'*64}
            return result
        self.cloud.call=Mock(side_effect=response)
        with self.assertRaisesRegex(BridgeError,'快照校验失败'):
            self.state.prepare('fixture')
        self.assertIsNone(self.state.active)
        self.assertEqual(self.anki.calls.count('addNote'),0)


if __name__ == '__main__':
    unittest.main()
