"""Windows tray uses pystray's native event loop; no second learning editor."""
import threading
import webbrowser
from pathlib import Path

import pystray
from PIL import Image

from . import __version__


class ConnectorTray:
    def __init__(self, state, settings_url):
        self.state, self.settings_url = state, settings_url
        self.icon = pystray.Icon('LexiConnect', Image.open(Path(__file__).parent.parent / 'web/app-icon.png'),
                                 'Lexi 连接助手 ' + __version__, menu=pystray.Menu(
            pystray.MenuItem(lambda _: 'Lexi '+__version__+' · '+self.status(), None, enabled=False),
            pystray.MenuItem('打开 Lexi', lambda: webbrowser.open(state.cloud.origin), default=True),
            pystray.MenuItem('连接设置', lambda: webbrowser.open(settings_url)),
            pystray.MenuItem('检查连接', self.check),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(lambda _: '恢复接单' if state.paused.is_set() else '暂停接单', self.pause),
            pystray.MenuItem('退出', lambda: state.closed.set())))

    def status(self):
        if self.state.closed.is_set(): return '正在退出'
        if self.state.paused.is_set(): return '暂停接单'
        if self.state.active: return '任务处理中'
        if self.state.worker_error: return '连接待检查'
        checks = self.state.latest_diagnostics
        return '连接正常' if checks and all(row.get('ok') for row in checks.values()) else '已启动，待检查'

    def pause(self):
        if self.state.paused.is_set(): self.state.paused.clear()
        else: self.state.paused.set()
        self.icon.update_menu()

    def check(self):
        # Opening settings is an explicit user action, unlike normal startup.
        webbrowser.open(self.settings_url + '&diagnostics=1')

    def start(self):
        threading.Thread(target=self.icon.run, daemon=True).start()

    def stop(self):
        self.icon.stop()
