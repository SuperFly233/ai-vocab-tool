import tempfile
import unittest
from pathlib import Path
from contextlib import contextmanager
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from bridge.app import State, create_app
from test_bridge import FakeCloud


class OnDemandTests(unittest.TestCase):
    @contextmanager
    def state_context(self):
        with tempfile.TemporaryDirectory() as directory:
            state = State(Path(directory), cloud=FakeCloud())
            state.cloud.call = Mock(return_value={})
            try:
                yield state
            finally:
                state.journal.db.close()

    def run_ticks(self, state):
        with patch.object(state.closed, 'wait', side_effect=[False] * 100 + [True]):
            state.renew()

    def test_startup_has_no_auth_registration_or_poll(self):
        with self.state_context() as state:
            state.bind_account = Mock(side_effect=AssertionError('unexpected network auth'))
            self.run_ticks(state)
            self.assertTrue(state.paused.is_set())
            state.bind_account.assert_not_called()
            state.cloud.call.assert_not_called()

    def test_manual_stop_has_no_cloud_calls(self):
        with self.state_context() as state:
            state.set_receiving(True)
            state.set_receiving(False)
            self.run_ticks(state)
            state.cloud.call.assert_not_called()

    def test_expiry_precedes_network(self):
        with self.state_context() as state:
            with patch('bridge.app.time.monotonic', return_value=100):
                state.set_receiving(True)
                self.assertEqual(state.receiving_until, 700)
            with patch('bridge.app.time.monotonic', return_value=700):
                self.run_ticks(state)
            state.cloud.call.assert_not_called()
            self.assertTrue(state.paused.is_set())

    def test_explicit_start_allows_worker(self):
        with self.state_context() as state:
            state.web_tick = Mock()
            state.set_receiving(True)
            self.run_ticks(state)
            actions = [call.args[0] for call in state.cloud.call.call_args_list]
            self.assertIn('register', actions)
            self.assertIn('device_poll', actions)
            self.assertEqual(state.web_tick.call_count, 100)

    def test_stop_finishes_claimed_job_without_new_poll(self):
        with self.state_context() as state:
            state.active = {'local': False}
            state.lease = lambda: {}
            state.web_tick = Mock()
            self.run_ticks(state)
            self.assertEqual([call.args[0] for call in state.cloud.call.call_args_list], ['heartbeat'] * 100)
            self.assertEqual(state.web_tick.call_count, 100)
            self.assertIsNotNone(state.active)
            state.active = None
            state.cloud.call.reset_mock()
            self.run_ticks(state)
            state.cloud.call.assert_not_called()

    def test_status_refresh_is_local_only(self):
        with self.state_context() as state:
            state.config['owner'] = 'fixture'
            state.bind_account = Mock(side_effect=AssertionError('unexpected network auth'))
            headers = {'Origin': 'http://127.0.0.1:3000', 'X-Bridge-Token': 'fixture'}
            with TestClient(create_app(state, 3000, 'fixture'), base_url='http://127.0.0.1:3000') as client:
                for _ in range(20):
                    response = client.post('/api/status', headers=headers, json={})
                    self.assertEqual(response.status_code, 200)
                    self.assertTrue(response.json()['paused'])
            state.bind_account.assert_not_called()
            state.cloud.call.assert_not_called()


if __name__ == '__main__':
    unittest.main()
