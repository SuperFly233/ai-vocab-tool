import base64
import hashlib
import html
import json
import re
import sqlite3
from pathlib import Path
from urllib.parse import urlparse

import httpx

MODEL = 'Lexi Scene v1'
FIELDS = ['LexiKey', 'Expression', 'Sentence', 'Translation', 'Meaning', 'Notes', 'Media', 'Source']
FRONT = '<main class="lexi"><div class="expression">{{Expression}}</div><div class="sentence">{{Sentence}}</div><div class="media">{{Media}}</div></main>'
BACK = '{{FrontSide}}<hr id="answer"><div class="translation">{{Translation}}</div><div class="meaning">{{Meaning}}</div><div class="notes">{{Notes}}</div><div class="source">{{Source}}</div>'
CSS = '.card{font:20px/1.6 system-ui;text-align:left;color:#222;background:#fff;padding:20px}.nightMode.card{color:#eee;background:#191b1a}.expression{font-size:28px;font-weight:700}.sentence{margin:16px 0}.media img{max-width:100%;max-height:300px;object-fit:contain}mark{background:#ead38c;color:#222}.meaning{font-weight:600;margin:12px 0}.source,.notes{font-size:15px;opacity:.8;overflow-wrap:anywhere}hr{border:0;border-top:1px solid #aaa;margin:20px 0}'
EXTENSIONS = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp', 'video/mp4': '.mp4', 'video/webm': '.webm', 'audio/mpeg': '.mp3', 'audio/ogg': '.ogg', 'audio/wav': '.wav'}


def media_mime(data):
    if data.startswith(b'\x89PNG\r\n\x1a\n'): return 'image/png'
    if data.startswith(b'\xff\xd8\xff'): return 'image/jpeg'
    if data.startswith((b'GIF87a', b'GIF89a')): return 'image/gif'
    if data.startswith(b'RIFF') and data[8:12] == b'WEBP': return 'image/webp'
    if data.startswith(b'RIFF') and data[8:12] == b'WAVE': return 'audio/wav'
    if data.startswith(b'OggS') and (b'OpusHead' in data[:4096] or b'vorbis' in data[:4096]): return 'audio/ogg'
    if data.startswith(b'ID3') or (len(data)>2 and data[0]==255 and data[1]&0xe0==0xe0): return 'audio/mpeg'
    if data[4:8] == b'ftyp': return 'video/mp4'
    if data.startswith(b'\x1aE\xdf\xa3') and b'webm' in data[:4096]: return 'video/webm'
    return ''


class BridgeError(Exception):
    pass


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def highlight(text, terms):
    text = str(text)
    ranges = []
    for term in terms[:30]:
        if isinstance(term, str) and term:
            ranges.extend((m.start(), m.end()) for m in re.finditer(re.escape(term), text, re.I))
    merged = []
    for start, end in sorted(ranges):
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(end, merged[-1][1]))
        else:
            merged.append((start, end))
    parts, offset = [], 0
    for start, end in merged:
        parts.extend([html.escape(text[offset:start]), '<mark>', html.escape(text[start:end]), '</mark>'])
        offset = end
    return ''.join(parts) + html.escape(text[offset:])


def filename(ref):
    if not re.fullmatch('[a-f0-9]{64}', ref.get('id', '')) or ref.get('mime') not in EXTENSIONS:
        raise BridgeError('素材标识或类型无效。')
    return 'lexi_' + ref['id'] + EXTENSIONS[ref['mime']]


def card_fields(card, owner, profile):
    for key, maximum in {'key': 160, 'title': 400, 'quote': 4000, 'translation': 4000, 'meaning': 12000, 'note': 12000, 'sourceTitle': 400, 'sourceUrl': 2048}.items():
        if not isinstance(card.get(key), str) or len(card[key]) > maximum:
            raise BridgeError('云任务字段无效，请重新提交。')
    if not card['key'] or not card['title'].strip() or not isinstance(card.get('media'), list) or len(card['media']) > 10:
        raise BridgeError('卡片内容不完整。')
    for key in ['exampleHighlights', 'translationHighlights']:
        if not isinstance(card.get(key), list) or len(card[key]) > 30 or any(not isinstance(x, str) or len(x) > 400 for x in card[key]):
            raise BridgeError('高亮内容无效。')
    media = []
    for ref in card['media']:
        name = filename(ref)
        if ref['mime'].startswith('image/'):
            media.append(f'<img src="{name}" alt="{html.escape(str(ref.get("name", "")), quote=True)}">')
        elif ref['mime'].startswith('audio/'):
            media.append(f'[sound:{name}]')
        else:
            media.append(f'<p><a href="{name}">视频原文件（播放取决于终端支持）</a></p>')
    url = urlparse(card['sourceUrl'])
    source = html.escape(card['sourceTitle'])
    if url.scheme in ('https', 'http') and url.netloc and not url.username and not url.password:
        source += f' <a href="{html.escape(card["sourceUrl"], quote=True)}">打开来源</a>'
    return dict(zip(FIELDS, [digest([owner, profile, card['key']]), html.escape(card['title']), highlight(card['quote'], card['exampleHighlights']), highlight(card['translation'], card['translationHighlights']), html.escape(card['meaning']), html.escape(card['note']), ''.join(media), source]))


class Anki:
    def __init__(self, port=8765, key='', transport=None):
        if not isinstance(port, int) or not 1024 <= port <= 65535:
            raise BridgeError('端口需在 1024–65535 之间。')
        self.port, self.key = port, key or None
        self.http = httpx.Client(base_url=f'http://127.0.0.1:{port}', timeout=30, trust_env=False, transport=transport)

    def call(self, action, **params):
        try:
            response = self.http.post('/', json={'action': action, 'version': 6, 'params': params, 'key': self.key})
            if response.status_code in (401, 403):
                raise BridgeError('AnkiConnect 认证失败，请检查本地密钥。')
            if response.status_code != 200:
                raise BridgeError('本地地址未提供兼容的 AnkiConnect 接口。')
            data = response.json()
            if not isinstance(data, dict) or 'result' not in data or 'error' not in data:
                raise BridgeError('本地服务不是兼容的 AnkiConnect。')
            if data['error']:
                raise BridgeError('AnkiConnect: ' + str(data['error'])[:250])
            return data['result']
        except (httpx.ConnectError, httpx.ConnectTimeout):
            raise BridgeError('无法连接 Anki：请启动 Anki，并检查插件与端口。') from None
        except (httpx.TimeoutException, httpx.NetworkError):
            raise BridgeError('Anki 响应超时。写入结果需要重新核对，请勿重复强行提交。') from None
        except ValueError:
            raise BridgeError('本地服务返回格式异常。') from None

    def diagnose(self):
        version = self.call('version')
        if not isinstance(version, int) or version < 6:
            raise BridgeError('需要支持 API v6 的 AnkiConnect。')
        return {'version': version, 'profile': str(self.call('getActiveProfile')), 'decks': self.call('deckNames')}

    def check_model(self):
        if MODEL in self.call('modelNames'):
            if self.call('modelFieldNames', modelName=MODEL) != FIELDS:
                raise BridgeError('专用模板字段已变化，请先检查模板，不会覆盖。')
            templates = self.call('modelTemplates', modelName=MODEL)
            if templates != {'Scene': {'Front': FRONT, 'Back': BACK}}:
                raise BridgeError('专用模板卡面已变化，不能使用失真的预览写入。')
            return True
        return False

    def ensure_model(self):
        if not self.check_model():
            self.call('createModel', modelName=MODEL, inOrderFields=FIELDS, css=CSS, cardTemplates=[{'Name': 'Scene', 'Front': FRONT, 'Back': BACK}])

    def existing(self, key):
        if not re.fullmatch('[a-f0-9]{64}', key):
            raise BridgeError('来源键无效。')
        ids = self.call('findNotes', query=f'"LexiKey:{key}"')
        if len(ids) > 1:
            raise BridgeError('发现重复来源键，请先在 Anki 中核对。')
        if not ids:
            return None
        row = self.call('notesInfo', notes=ids)[0]
        if row.get('modelName') != MODEL or row.get('fields', {}).get('LexiKey', {}).get('value') != key:
            raise BridgeError('来源键与模板不匹配，未写入。')
        return {'id': row['noteId'], 'fields': {k: v['value'] for k, v in row['fields'].items()}, 'cards': row['cards']}

    def media(self, ref, data):
        name = filename(ref)
        present = self.call('retrieveMediaFile', filename=name)
        if present:
            try:
                if hashlib.sha256(base64.b64decode(present, validate=True)).hexdigest() == ref['id']:
                    return
            except ValueError:
                pass
            raise BridgeError('同名素材内容不同，未覆盖。')
        data = data() if callable(data) else data
        if len(data) != ref['size'] or hashlib.sha256(data).hexdigest() != ref['id']:
            raise BridgeError('素材哈希或大小校验失败。')
        if media_mime(data) != ref['mime']:
            raise BridgeError('素材实际格式与声明不符。')
        self.call('storeMediaFile', filename=name, data=base64.b64encode(data).decode())


class Journal:
    def __init__(self, path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute('create table if not exists operations (owner text, profile text, job text, card text, note_id text, operation text, before_json text, after_json text, primary key(owner,profile,job,card))')
        self.db.execute('create table if not exists local_batches (owner text,id text,payload text,status text,results text,primary key(owner,id))')
        self.db.commit()

    def record(self, owner, profile, job, card, note_id, operation, before, after):
        self.db.execute('insert or replace into operations values(?,?,?,?,?,?,?,?)', (owner, profile, job, card, str(note_id), operation, json.dumps(before, ensure_ascii=False), json.dumps(after, ensure_ascii=False)))
        self.db.commit()

    def rows(self, owner, profile, job):
        rows = self.db.execute('select card,note_id,operation,before_json,after_json from operations where owner=? and profile=? and job=?', (owner, profile, job)).fetchall()
        return [dict(key=r[0], noteId=r[1], operation=r[2], before=json.loads(r[3]), after=json.loads(r[4])) for r in rows]

    def save_batch(self, owner, job, cards, status, results):
        self.db.execute('insert or replace into local_batches values(?,?,?,?,?)', (owner, job, json.dumps(cards, ensure_ascii=False), status, json.dumps(results, ensure_ascii=False)))
        self.db.commit()

    def batches(self, owner):
        return [dict(id=r[0], cards=json.loads(r[1]), status=r[2], results=json.loads(r[3])) for r in self.db.execute('select id,payload,status,results from local_batches where owner=? order by rowid desc limit 50', (owner,))]


def preview(anki, cards, owner, profile):
    has_model = anki.check_model()
    output = []
    for card in cards:
        fields = card_fields(card, owner, profile)
        old = anki.existing(fields['LexiKey']) if has_model else None
        operation = 'create' if old is None else 'skip' if old['fields'] == fields else 'update'
        output.append({'card': card, 'fields': fields, 'before': old, 'operation': operation})
    return output


def execute_one(anki, row, owner, profile, job, deck, journal, fetch_media, before_write=lambda: None):
    fields, card = row['fields'], row['card']
    current = anki.existing(fields['LexiKey'])
    if current and current['fields'] == fields:
        # Preserve an earlier creation receipt when an acknowledgement was lost.
        if not any(r['key'] == card['key'] for r in journal.rows(owner, profile, job)):
            journal.record(owner, profile, job, card['key'], current['id'], 'skip', current['fields'], fields)
        return {'status': 'skipped', 'noteId': str(current['id'])}
    if current != row['before']:
        raise BridgeError('卡片在预览后发生变化，请重新预览。')
    for ref in card['media']:
        anki.media(ref, lambda: fetch_media(ref))
    before_write()
    operation = 'update' if current else 'create'
    journal.record(owner, profile, job, card['key'], current['id'] if current else '', operation, current['fields'] if current else None, fields)
    if current:
        anki.call('updateNoteFields', note={'id': current['id'], 'fields': fields})
        note_id = current['id']
    else:
        note_id = anki.call('addNote', note={'deckName': deck, 'modelName': MODEL, 'fields': fields, 'options': {'allowDuplicate': False}, 'tags': ['lexi-bridge', 'lexi-source-' + fields['LexiKey']]})
        if not note_id:
            raise BridgeError('Anki 未返回笔记 ID，请重新核对来源键。')
    journal.record(owner, profile, job, card['key'], note_id, operation, current['fields'] if current else None, fields)
    return {'status': 'complete', 'noteId': str(note_id)}


def undo_one(anki, row):
    if row['operation'] not in ('create', 'update'):
        return False
    current = anki.existing(row['after']['LexiKey'])
    if not current or (row['noteId'] and str(current['id']) != row['noteId']) or current['fields'] != row['after']:
        raise BridgeError('卡片已删除或有后续修改，未撤销。')
    if row['operation'] == 'create':
        cards = anki.call('cardsInfo', cards=current['cards'])
        if not cards or any(card.get('reps', 0) > 0 for card in cards):
            raise BridgeError('卡片已开始学习，未自动删除。')
        anki.call('deleteNotes', notes=[current['id']])
    else:
        anki.call('updateNoteFields', note={'id': current['id'], 'fields': row['before']})
    return True
