"""Native Windows tray smoke test; no cloud account or external applications."""
import sys
import threading
import time
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'integrations/anki-bridge'))
from bridge.tray import ConnectorTray

state = SimpleNamespace(cloud=SimpleNamespace(origin='https://ai-vocab-tool.pages.dev'),
                        closed=threading.Event(), paused=threading.Event(), active=None,
                        worker_error='', latest_diagnostics={})
tray = ConnectorTray(state, 'http://127.0.0.1:3000/#token=synthetic-not-a-session')
try:
    tray.start()
    deadline = time.monotonic() + 8
    while not tray.icon.visible and time.monotonic() < deadline:
        time.sleep(.1)
    assert tray.icon.visible, 'Native notification icon did not become visible'
    labels = [item.text for item in tray.icon.menu.items]
    assert all(label in labels for label in ['打开 Lexi', '连接设置', '检查连接', '暂停接单', '退出'])
    assert '0.4.0' in labels[0]
    tray.pause()
    assert state.paused.is_set() and tray.status() == '暂停接单'
    assert '恢复接单' in [item.text for item in tray.icon.menu.items]
    tray.pause()
    assert not state.paused.is_set()
    print('Native Windows tray: icon registration, actual version, bounded menu, pause and resume passed; popup appearance not screenshot-verified.')
finally:
    tray.stop()
