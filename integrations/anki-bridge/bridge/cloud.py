import base64
import hashlib
import json
import math
import re
import time

import httpx
import keyring

from .core import BridgeError

ORIGIN = 'https://ai-vocab-tool.pages.dev'
SUPABASE = 'https://uoifrqehkfvpzqojaazh.supabase.co'
PUBLIC_KEY = 'sb_publishable_G-_4O-n-Q73TbJ4R2YmG9w_7WlKHC80'
SERVICE = 'LexiAnkiBridge.v1'


class Vault:
    def __init__(self):
        from keyring.backends.Windows import WinVaultKeyring
        self.backend = WinVaultKeyring()

    def get(self, key):
        try:
            return self.backend.get_password(SERVICE, key)
        except Exception:
            raise BridgeError('系统凭据存储不可用，不会降级明文保存。') from None

    def put(self, key, value):
        try:
            self.backend.set_password(SERVICE, key, value)
        except Exception:
            raise BridgeError('无法安全保存凭据，请检查 Windows 凭据管理器。') from None

    def delete(self, key):
        if self.get(key) is not None:
            try:
                self.backend.delete_password(SERVICE, key)
            except Exception:
                raise BridgeError('凭据删除失败，请检查系统凭据管理器。') from None


class Cloud:
    def __init__(self, vault, http=None, origin=ORIGIN):
        if not re.fullmatch(r'https://(?:[a-z0-9-]+\.)?ai-vocab-tool\.pages\.dev', origin):
            raise BridgeError('仅允许当前 Lexi 生产站点或其官方验收预览地址。')
        self.origin = origin
        self.vault = vault
        self.http = http or httpx.Client(timeout=30, follow_redirects=False)
        self.session = None

    def auth(self, grant, body):
        try:
            response = self.http.post(SUPABASE + '/auth/v1/token?grant_type=' + grant, headers={'apikey': PUBLIC_KEY}, json=body)
            if response.status_code != 200:
                raise BridgeError('Lexi 登录失败或已过期，请重新登录。')
            value = response.json()
            if not value.get('refresh_token') or not value.get('user', {}).get('id'):
                raise BridgeError('登录返回不完整。')
            self.vault.put('session', json.dumps({'refresh': value['refresh_token'], 'owner': value['user']['id']}))
            self.session = {'access': value['access_token'], 'owner': value['user']['id'], 'expires': time.time() + value.get('expires_in', 3600)}
            return self.session
        except httpx.HTTPError:
            raise BridgeError('无法连接 Lexi 登录服务。') from None

    def login(self, email, password):
        self.session = None
        return self.auth('password', {'email': email, 'password': password})

    def current(self):
        if self.session and self.session['expires'] > time.time() + 60:
            return self.session
        saved = self.vault.get('session')
        if not saved:
            raise BridgeError('请在本地程序独立登录 Lexi 账号。')
        try:
            return self.auth('refresh_token', {'refresh_token': json.loads(saved)['refresh']})
        except (ValueError, KeyError):
            raise BridgeError('保存的登录凭据无效，请重新登录。') from None

    def logout(self):
        self.session = None
        self.vault.delete('session')

    def post(self, path, body):
        session = self.current()
        try:
            response = self.http.post(self.origin + path, headers={'Authorization': 'Bearer ' + session['access']}, json=body)
            try:
                data = response.json()
            except ValueError:
                raise BridgeError(f'云端返回格式异常（HTTP {response.status_code}），任务未被标为成功。') from None
            if response.status_code != 200:
                raise BridgeError(str(data.get('error', '云端请求失败。'))[:300])
            return data
        except (httpx.HTTPError, ValueError):
            raise BridgeError('云端连接中断，任务未被标为成功。') from None

    def call(self, action, **args):
        return self.post('/api/anki-jobs', {'action': action, 'args': args})['data']

    def media(self, ref):
        manifest = self.post('/api/media', {'action': 'manifest', 'id': ref['id']}).get('manifest')
        if not manifest or manifest.get('size') != ref['size'] or manifest.get('mime') != ref['mime']:
            raise BridgeError('素材尚未同步完整，保留任务以便重试。')
        count = math.ceil(ref['size'] / (512 * 1024))
        if manifest.get('chunks') != count or not 1 <= count <= 40:
            raise BridgeError('素材清单无效。')
        chunks = {}
        for start in range(0, count, 2):
            result = self.post('/api/media', {'action': 'get', 'id': ref['id'], 'indexes': list(range(start, min(count, start + 2)))})
            for chunk in result.get('chunks', []):
                try:
                    chunks[chunk['index']] = base64.b64decode(chunk['data'], validate=True)
                except (ValueError, KeyError):
                    raise BridgeError('素材分片无效。') from None
        if len(chunks) != count:
            raise BridgeError('素材分片缺失。')
        data = b''.join(chunks[i] for i in range(count))
        if len(data) != ref['size'] or hashlib.sha256(data).hexdigest() != ref['id']:
            raise BridgeError('素材哈希校验失败。')
        return data
