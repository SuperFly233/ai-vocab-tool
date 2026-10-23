"""Read-only adapter for the official desktop CLI; no database/token access."""
import json
import os
import subprocess
from pathlib import Path

from .core import BridgeError, digest

UPSTREAM = '725fcde6c9a1e2abef8c72009886a4cd66e4751a'
COMMANDS = {'status': ('status',), 'favorites': ('favorite', 'ls', '--limit', '200'),
            'pending': ('anki', 'pending'), 'staged': ('video', 'mine-queue'),
            'dictionaries': ('dict', 'ls'), 'dictionary': ('dict', 'search')}


class Fushi:
    def __init__(self, runner=subprocess.run, executable=None):
        self.runner = runner
        self.executable = Path(executable) if executable else Path(os.environ.get('LOCALAPPDATA', str(Path.home() / 'AppData/Local'))) / 'Fushi' / 'fushi_cli.exe'

    def call(self, action, limit=None, query=None):
        if action not in COMMANDS:
            raise BridgeError('Fushi 仅允许只读查询。')
        if not self.executable.is_file():
            raise BridgeError('未找到官方 Fushi CLI；请检查 Fushi 桌面安装。')
        if limit is not None and (not isinstance(limit, int) or not 1 <= limit <= 200):
            raise BridgeError('Fushi 读取数量无效。')
        command = ('favorite', 'ls', '--limit', str(limit)) if action == 'favorites' and limit is not None else COMMANDS[action]
        if action == 'dictionary':
            if not isinstance(query, str) or not query.strip() or len(query) > 200 or any(ord(char)<32 for char in query):
                raise BridgeError('词典查询需为 1–200 字的单词或词组。')
            command = ('dict', 'search', '--limit', '10', '--', query.strip())
        try:
            result = self.runner([str(self.executable), '--no-launch', '--json', *command],
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

    def sources(self, kind, limit=200):
        value = self.call(kind, limit)
        key = {'favorites': 'favorites', 'pending': 'pending', 'staged': 'items'}.get(kind)
        if key is None or not isinstance(value.get(key), list):
            raise BridgeError('Fushi 来源格式不兼容，未猜测导入。')
        output = []
        for row in value[key][:limit]:
            if not isinstance(row, dict) or isinstance(row.get('id'), bool) or not isinstance(row.get('id'), (str, int)) or not str(row['id']).strip():
                raise BridgeError('Fushi 来源缺少稳定标识。')
            if any(row.get(field) is not None and not isinstance(row[field], str) for field in ('text','sentence','expression','bookTitle')):
                raise BridgeError('Fushi 来源字段格式不兼容，未猜测导入。')
            source_id = kind + ':' + str(row['id'])
            fields = {'title': row.get('expression') or '', 'quote': (row.get('text') if kind == 'favorites' else row.get('sentence')) or '',
                      'sourceTitle': row.get('bookTitle') or 'Fushi', 'chapter': row.get('chapter') or '', 'status': row.get('status') or ''}
            if len(source_id)>100 or any(not isinstance(value,str) or len(value)>(4000 if name=='quote' else 400) for name,value in fields.items()):
                raise BridgeError('Fushi 来源过长或格式不兼容，未截断原句；请缩小范围或在原应用整理内容。')
            timestamp = row.get('createdAt')
            if isinstance(timestamp,bool) or not isinstance(timestamp,(str,int,float,type(None))):
                timestamp = None
            output.append({'id': source_id, **fields,
                           'createdAt': timestamp, 'queued': kind != 'favorites',
                           'sourceType': 'fushi',
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
