import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient
from bridge.app import State, create_app
from bridge.cloud import Cloud
from bridge.core import BridgeError
from bridge.remote import diagnose
from bridge.tray import ConnectorTray
from test_bridge import FakeAnki, FakeCloud, FakeVault


class ConnectionTests(unittest.TestCase):
    def test_required_checks_optional_sources_and_expiry(self):
        with tempfile.TemporaryDirectory() as directory:
            state = State(Path(directory), cloud=FakeCloud())
            state.set_receiving(True)
            state.bind_account()
            state.anki = lambda: FakeAnki()
            def unavailable(action):
                raise BridgeError('Optional source offline')
            state.fushi = type('Offline', (), {'call': staticmethod(unavailable)})()
            try:
                value = diagnose(state)
                self.assertEqual(value['deviceId'], state.config['deviceId'])
                self.assertIn('checkedAt', value)
                self.assertFalse(value['dictionary']['ok'])
                tray = object.__new__(ConnectorTray)
                tray.state = state
                self.assertEqual(tray.status(), '基础制卡连接正常')
                state.diagnostics_checked = time.monotonic() - 121
                self.assertEqual(tray.status(), '需重新检查')
                state.active = {'synthetic': True}
                tray.settings_url = 'http://127.0.0.1:3000/#token=fixture'
                with patch('bridge.tray.webbrowser.open') as opened:
                    tray.exit()
                    opened.assert_called_once_with(tray.settings_url)
                self.assertFalse(state.closed.is_set())
                self.assertTrue(state.paused.is_set())
            finally:
                state.journal.db.close()

    def test_active_batch_blocks_configuration_logout_shutdown(self):
        with tempfile.TemporaryDirectory() as directory:
            state = State(Path(directory), cloud=FakeCloud())
            state.active = {'synthetic': True}
            headers = {'Origin': 'http://127.0.0.1:3000', 'X-Bridge-Token': 'fixture'}
            try:
                with TestClient(create_app(state, 3000, 'fixture'), base_url='http://127.0.0.1:3000') as client:
                    for action in ('shutdown', 'logout', 'login', 'config', 'detect-anki'):
                        self.assertEqual(client.post('/api/' + action, headers=headers, json={}).status_code, 400)
                        self.assertIsNotNone(state.active)
                    self.assertFalse(state.closed.is_set())
                    state.latest_diagnostics = {'cloud': {'ok': False, 'message': 'private token'}, 'checkedAt': 'synthetic'}
                    export = client.post('/api/diagnostics-export', headers=headers, json={}).text
                    self.assertNotIn('private token', export)
            finally:
                state.journal.db.close()

    def test_public_release_request_does_not_forward_credentials(self):
        def reply(request):
            self.assertEqual(str(request.url), 'https://ai-vocab-tool.pages.dev/bridge-release.json')
            self.assertNotIn('authorization', request.headers)
            return httpx.Response(200, json={'schema': 1})
        with httpx.Client(transport=httpx.MockTransport(reply)) as http:
            self.assertEqual(Cloud(FakeVault(), http=http).release(), {'schema': 1})
        with httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(200, content=b'x' * 32769))) as http:
            with self.assertRaises(BridgeError):
                Cloud(FakeVault(), http=http).release()
