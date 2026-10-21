import json
import base64
import os
import secrets
import socket
import threading
import uuid
import webbrowser
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, Response

from . import __version__
from .cloud import Cloud, Vault
from .core import Anki, BridgeError, Journal, digest, execute_one, preview, undo_one

ASSETS = Path(__file__).parent.parent / 'web'


class State:
    def __init__(self, directory, cloud=None):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.journal = Journal(self.directory / 'journal.sqlite3')
        self.config_file = self.directory / 'device.json'
        self.config = json.loads(self.config_file.read_text('utf-8')) if self.config_file.exists() else {'deviceId': str(uuid.uuid4()), 'name': '我的电脑', 'port': 8765, 'deck': 'Lexi 验收'}
        self.save_config()
        self.cloud = cloud or Cloud(Vault())
        self.active = None
        self.lock = threading.RLock()
        self.closed = threading.Event()

    def save_config(self):
        temporary = self.config_file.with_suffix('.tmp')
        temporary.write_text(json.dumps(self.config, ensure_ascii=False), 'utf-8')
        temporary.replace(self.config_file)

    def anki(self):
        return Anki(self.config['port'], self.cloud.vault.get('anki-key') or '')

    def bind_account(self):
        owner = self.cloud.current()['owner']
        if self.config.get('owner') != owner:
            self.active = None
            accounts = self.config.setdefault('accounts', {})
            accounts.setdefault(owner, str(uuid.uuid4()))
            self.config.update(owner=owner, deviceId=accounts[owner], deck='Lexi 验收')
            self.save_config()
        return owner

    def renew(self):
        while not self.closed.wait(20):
            with self.lock:
                if self.active:
                    try:
                        result = self.cloud.call('heartbeat', **self.lease())
                        if result.get('cancelRequested'):
                            self.active = None
                    except BridgeError:
                        self.active = None

    def lease(self):
        if not self.active:
            raise BridgeError('预览已过期，请重新领取并预览。')
        return {'jobId': self.active['job']['id'], 'deviceId': self.config['deviceId'], 'leaseToken': self.active['job']['lease_token']}

    def prepare(self, job_id):
        owner = self.bind_account()
        previous = self.active
        self.active = None
        anki = self.anki()
        try:
            connection = anki.diagnose()
            deck = self.config['deck']
            if deck not in connection['decks'] and deck != 'Lexi 验收':
                raise BridgeError('目标牌库不存在，请重新选择。')
            job = self.cloud.call('claim', jobId=job_id, deviceId=self.config['deviceId'], **({'leaseToken': previous['job']['lease_token']} if previous and previous['job']['id'] == job_id else {}))
            cards = job['payload'].get('cards', [])
            if not 1 <= len(cards) <= 20:
                raise BridgeError('任务快照无效。')
            refs = {ref.get('id'): ref for card in cards for ref in card.get('media', [])}
            if any(not isinstance(ref.get('size'), int) or not 1 <= ref['size'] <= 20 * 1024 * 1024 for ref in refs.values()) or sum(ref['size'] for ref in refs.values()) > 50 * 1024 * 1024:
                raise BridgeError('单批素材最多 50 MB，每份最多 20 MB。')
            binding = digest([self.config['port'], connection['profile'], deck])
            rows = preview(anki, cards, owner, binding)
            token = secrets.token_urlsafe(24)
            self.active = {'job': job, 'rows': rows, 'owner': owner, 'profile': connection['profile'], 'binding': binding, 'deck': deck, 'token': token, 'media': {}}
            return {'confirmation': token, 'deck': deck, 'profile': connection['profile'], 'rows': rows}
        finally:
            anki.http.close()

    def execute(self, confirmation):
        active = self.active
        if not active or not secrets.compare_digest(str(confirmation), active['token']):
            raise BridgeError('请先预览并确认当前批次。')
        if self.cloud.current()['owner'] != active['owner']:
            self.active = None
            raise BridgeError('账号已切换，请重新预览。')
        anki = self.anki()
        try:
            connection = anki.diagnose()
            if connection['profile'] != active['profile'] or self.config['deck'] != active['deck']:
                raise BridgeError('Anki 配置或牌库已变化，请重新预览。')
            lease = self.lease()
            if self.cloud.call('heartbeat', **lease).get('cancelRequested'):
                raise BridgeError('任务已取消。')
            self.cloud.call('start', **lease)
            anki.ensure_model()
            if active['deck'] == 'Lexi 验收' and active['deck'] not in connection['decks']:
                anki.call('createDeck', deck=active['deck'])
            output = []
            def before_write():
                if self.cloud.call('heartbeat', **lease).get('cancelRequested'):
                    raise BridgeError('任务已取消，停止剩余写入。')
                if anki.call('getActiveProfile') != active['profile']:
                    raise BridgeError('Anki 配置已切换，停止写入。')
            for row in active['rows']:
                if self.cloud.call('heartbeat', **lease).get('cancelRequested'):
                    break
                try:
                    result = execute_one(anki, row, active['owner'], active['binding'], active['job']['id'], active['deck'], self.journal, self.load_media, before_write)
                except BridgeError as error:
                    result = {'status': 'error', 'message': str(error)}
                # A lost acknowledgement aborts the batch; the stable source key is reconciled on retry.
                self.cloud.call('ack', **lease, cardKey=row['card']['key'], **result)
                output.append({'key': row['card']['key'], **result})
            result = self.cloud.call('finish', **lease)
            return {'result': result, 'rows': output}
        finally:
            self.active = None
            anki.http.close()

    def load_media(self, ref):
        if not self.active or self.cloud.current()['owner'] != self.active['owner']:
            raise BridgeError('请重新登录并预览。')
        if ref['id'] not in self.active['media']:
            self.active['media'][ref['id']] = self.cloud.media(ref)
        return self.active['media'][ref['id']]


def create_app(state, port, token):
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    origin = f'http://127.0.0.1:{port}'

    @app.middleware('http')
    async def guard(request: Request, call_next):
        if request.headers.get('host') != f'127.0.0.1:{port}':
            return JSONResponse({'error': 'Invalid host'}, status_code=403)
        if request.method not in ('GET', 'HEAD'):
            if request.headers.get('origin') != origin or not secrets.compare_digest(request.headers.get('x-bridge-token', ''), token):
                return JSONResponse({'error': 'Forbidden'}, status_code=403)
            if int(request.headers.get('content-length', '0')) > 16384:
                return JSONResponse({'error': 'Request too large'}, status_code=413)
        response = await call_next(request)
        response.headers.update({'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self'; frame-ancestors 'none'; base-uri 'none'"})
        return response

    @app.get('/')
    def index():
        return FileResponse(ASSETS / 'index.html')

    @app.get('/assets/{name}')
    def asset(name: str):
        if name not in ('app.js', 'style.css', 'icons.js', 'favicon.svg'):
            return Response(status_code=404)
        path = ASSETS / name
        if name in ('icons.js', 'favicon.svg') and not path.exists():
            path = Path(__file__).resolve().parents[3] / name
        return FileResponse(path)

    @app.post('/api/{action}')
    def api(action: str, body: dict):
        with state.lock:
            try:
                if action == 'login':
                    state.active = None
                    state.cloud.login(str(body.get('email', '')), str(body.get('password', '')))
                    state.bind_account()
                    return {'ok': True}
                if action == 'logout':
                    state.active = None
                    state.cloud.logout()
                    return {'ok': True}
                if action == 'status':
                    owner = state.bind_account()
                    return {'version': __version__, 'owner': owner, 'config': {k: state.config[k] for k in ['deviceId', 'name', 'port', 'deck']}}
                if action == 'register':
                    state.bind_account()
                    return state.cloud.call('register', deviceId=state.config['deviceId'], name=state.config['name'])
                if action == 'config':
                    port_value = int(body.get('port', 8765))
                    if not 1024 <= port_value <= 65535:
                        raise BridgeError('端口无效。')
                    name, deck = str(body.get('name', '')).strip(), str(body.get('deck', '')).strip()
                    if not 1 <= len(name) <= 80 or not 1 <= len(deck) <= 150:
                        raise BridgeError('请输入电脑名称与目标牌库。')
                    if body.get('key'):
                        state.cloud.vault.put('anki-key', str(body['key']))
                    state.config.update(port=port_value, name=name, deck=deck)
                    state.save_config()
                    state.active = None
                    return {'ok': True}
                if action == 'diagnose':
                    anki = state.anki()
                    try:
                        return anki.diagnose()
                    finally:
                        anki.http.close()
                if action == 'jobs':
                    return state.cloud.call('list')
                if action == 'prepare':
                    return state.prepare(str(body.get('jobId', '')))
                if action == 'media':
                    refs = [ref for row in (state.active or {}).get('rows', []) for ref in row['card']['media']]
                    ref = next((ref for ref in refs if ref['id'] == body.get('id') and ref['mime'].startswith('image/')), None)
                    if not ref:
                        raise BridgeError('素材不在当前预览中。')
                    return {'url': 'data:' + ref['mime'] + ';base64,' + base64.b64encode(state.load_media(ref)).decode()}
                if action == 'execute':
                    return state.execute(body.get('confirmation', ''))
                if action in ('cancel', 'retry'):
                    state.active = None
                    return state.cloud.call(action, jobId=str(body.get('jobId', '')))
                if action == 'open':
                    note_id = str(body.get('noteId', ''))
                    if not note_id.isdigit():
                        raise BridgeError('笔记 ID 无效。')
                    anki = state.anki()
                    try:
                        return {'opened': anki.call('guiBrowse', query='nid:' + note_id)}
                    finally:
                        anki.http.close()
                if action == 'undo':
                    if body.get('confirmed') is not True:
                        raise BridgeError('请确认撤销本批写入。')
                    owner, job_id = state.cloud.current()['owner'], str(body.get('jobId', ''))
                    anki = state.anki()
                    try:
                        connection = anki.diagnose()
                        binding = digest([state.config['port'], connection['profile'], state.config['deck']])
                        results = []
                        for row in state.journal.rows(owner, binding, job_id):
                            try:
                                if row['operation'] == 'undone':
                                    state.cloud.call('undo', jobId=job_id, deviceId=state.config['deviceId'], cardKey=row['key'])
                                    results.append({'key': row['key'], 'status': 'undone'})
                                    continue
                                if undo_one(anki, row):
                                    state.journal.record(owner, binding, job_id, row['key'], row['noteId'], 'undone', row['before'], row['after'])
                                    state.cloud.call('undo', jobId=job_id, deviceId=state.config['deviceId'], cardKey=row['key'])
                                    results.append({'key': row['key'], 'status': 'undone'})
                            except BridgeError as error:
                                results.append({'key': row['key'], 'status': 'error', 'message': str(error)})
                        return results
                    finally:
                        anki.http.close()
                if action == 'shutdown':
                    state.closed.set()
                    return {'ok': True}
                raise BridgeError('未知操作。')
            except BridgeError as error:
                return JSONResponse({'error': str(error)}, status_code=400)
            except Exception:
                return JSONResponse({'error': '操作未完成，请检查连接或本地存储后重新预览。'}, status_code=500)

    return app


def main():
    directory = Path(os.environ.get('LOCALAPPDATA', str(Path.home()))) / 'LexiAnkiBridge'
    state = State(directory)
    token = secrets.token_urlsafe(32)
    sock = socket.socket()
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
    app = create_app(state, port, token)
    threading.Thread(target=state.renew, daemon=True).start()
    threading.Timer(1, lambda: webbrowser.open(f'http://127.0.0.1:{port}/#token={token}')).start()
    try:
        server = uvicorn.Server(uvicorn.Config(app, access_log=False, log_level='warning', log_config=None))
        def stop():
            state.closed.wait()
            server.should_exit = True
        threading.Thread(target=stop, daemon=True).start()
        server.run(sockets=[sock])
    finally:
        state.closed.set()
        sock.close()


if __name__ == '__main__':
    main()
