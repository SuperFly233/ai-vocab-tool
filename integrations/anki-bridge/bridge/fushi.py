"""Read-only adapter for the official desktop CLI; no database/token access."""
import json
import os
import subprocess
from pathlib import Path

from .core import BridgeError, digest

UPSTREAM = '185dcfdd940226631bbc42069088ae5ae24fdd12'
COMMANDS = {'status': ('status',), 'favorites': ('favorite', 'ls', '--limit', '200'),
            'pending': ('anki', 'pending'), 'staged': ('video', 'mine-queue')}


class Fushi:
    def __init__(self, runner=subprocess.run, executable=None):
        self.runner = runner
        self.executable = Path(executable) if executable else Path(os.environ.get('LOCALAPPDATA', str(Path.home() / 'AppData/Local'))) / 'Fushi' / 'fushi_cli.exe'

    def call(self, action):
        if action not in COMMANDS:
            raise BridgeError('Fushi 仅允许只读查询。')
        if not self.executable.is_file():
            raise BridgeError('未找到官方 Fushi CLI；请检查 Fushi 桌面安装。')
        try:
            result = self.runner([str(self.executable), '--no-launch', '--json', *COMMANDS[action]],
                                 capture_output=True, timeout=15, shell=False,
                                 creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            if len(result.stdout) > 4 * 1024 * 1024:
                raise BridgeError('Fushi 返回过大，请缩小来源范围。')
            value = json.loads(result.stdout.decode('utf-8-sig'))
            if result.returncode or not isinstance(value, dict):
                raise BridgeError('Fushi 当前来源不可用；请检查应用状态或打开对应视频。')
            return value
        except subprocess.TimeoutExpired:
            raise BridgeError('Fushi 响应超时；没有启动应用或修改内容。') from None
        except (OSError, ValueError, UnicodeError):
            raise BridgeError('Fushi 控制通道不可用或版本格式不兼容。') from None

    def sources(self, kind):
        value = self.call(kind)
        key = {'favorites': 'favorites', 'pending': 'pending', 'staged': 'items'}.get(kind)
        if key is None or not isinstance(value.get(key), list):
            raise BridgeError('Fushi 来源格式不兼容，未猜测导入。')
        output = []
        for row in value[key][:200]:
            if not isinstance(row, dict) or not isinstance(row.get('id'), (str, int)):
                raise BridgeError('Fushi 来源缺少稳定标识。')
            source_id = kind + ':' + str(row['id'])
            output.append({'id': source_id, 'title': str(row.get('expression') or '')[:400],
                           'quote': str((row.get('text') if kind == 'favorites' else row.get('sentence')) or '')[:4000],
                           'sourceTitle': str(row.get('bookTitle') or 'Fushi')[:400],
                           'chapter': str(row.get('chapter') or '')[:400],
                           'createdAt': row.get('createdAt'), 'queued': kind != 'favorites',
                           'status': str(row.get('status') or ''), 'sourceType': 'fushi',
                           'key': digest(['fushi', source_id]), 'mediaAvailable': False})
        return output


def make_card(source, values, media):
    card = {'key': source['key'], 'sourceType': 'fushi', 'sourceId': source['id'],
            'sceneId': 'fushi-' + source['key'][:32], 'entryId': source['id'],
            'origin': source['title'], 'sourceTitle': source['sourceTitle'], 'sourceUrl': '',
            'media': media, 'exampleHighlights': [], 'translationHighlights': []}
    for key, maximum in {'title': 400, 'quote': 4000, 'translation': 4000, 'meaning': 12000, 'note': 12000}.items():
        value = values.get(key, source.get(key, ''))
        if not isinstance(value, str) or len(value) > maximum:
            raise BridgeError('字段格式无效或过长。')
        card[key] = value.strip()
    if not card['title'] or not card['quote']:
        raise BridgeError('请填写词头和原句；Fushi 队列只提供摘要时不能凭空补全。')
    card['exampleHighlights'] = [card['title']]
    return card
