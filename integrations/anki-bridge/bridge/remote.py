"""Website-requested, bounded operations. Never executes arbitrary commands or paths."""
from datetime import datetime, timezone
import time
from . import __version__
from .core import BridgeError, digest, undo_one
from .dictionary import lookup


def target_anki(state, target):
    anki = state.anki()
    try:
        connection = anki.diagnose()
        binding = digest([state.config['port'], connection['profile'], target.get('deck')])
        if target.get('profile') != connection['profile'] or binding != target.get('binding'):
            raise BridgeError('原批次的 Anki 配置或端口已变化，请恢复连接后重试。')
        return anki, binding
    except Exception:
        anki.http.close()
        raise


def undo_batch(state, job_id, target, before_write=lambda: None):
    owner = state.bind_account()
    anki, binding = target_anki(state, target)
    results = []
    try:
        rows = state.journal.rows(owner, binding, job_id)
        if not rows:
            raise BridgeError('此电脑没有该批次的匹配操作记录，未撤销任何内容。')
        for row in rows:
            before_write()
            if state.cloud.current()['owner'] != owner or anki.call('getActiveProfile') != target['profile']:
                raise BridgeError('账号或 Anki 配置已切换，停止撤销。')
            try:
                if row['operation'] == 'undone' or undo_one(anki, row):
                    # Persist before cloud acknowledgement, so a lost receipt does not undo twice.
                    state.journal.record(owner, binding, job_id, row['key'], row['noteId'], 'undone', row['before'], row['after'])
                    state.cloud.call('undo', jobId=job_id, deviceId=state.config['deviceId'], cardKey=row['key'])
                    results.append({'key': row['key'], 'status': 'undone'})
                else:
                    results.append({'key': row['key'], 'status': 'skipped', 'message': '该卡片未由本批新增或更新，保留。'})
            except BridgeError as error:
                results.append({'key': row['key'], 'status': 'error', 'message': str(error)})
        return {'rows': results}
    finally:
        anki.http.close()


def diagnose(state):
    result = {}
    checks = [('fushi', lambda: state.fushi.call('status')), ('cloud', lambda: state.cloud.call('health'))]
    for name, check in checks:
        try:
            value = check()
            fields = ('version', 'running', 'initialized') if name == 'fushi' else ('schema', 'bridgeVersion')
            result[name] = {'ok': True, 'detail': {key: value[key] for key in fields if key in value}}
            if name == 'cloud':
                versions = value.get('payloadVersions', [])
                result[name]['detail']['learningContent'] = value.get('learningContent') is True and isinstance(versions, list) and 4 in versions
        except BridgeError as error:
            result[name] = {'ok': False, 'message': str(error)}
    anki = state.anki()
    try:
        try:
            value = anki.diagnose()
            result['anki'] = {'ok': True, 'detail': {key: value[key] for key in ('version', 'profile')}}
        except BridgeError as error:
            result['anki'] = {'ok': False, 'message': str(error)}
    finally:
        anki.http.close()
    try:
        rows=state.fushi.call('dictionaries').get('dictionaries')
        if not isinstance(rows,list):raise BridgeError('词典列表格式不兼容。')
        names=[row['name'] for row in rows if isinstance(row,dict) and row.get('enabled') is True and isinstance(row.get('name'),str) and 1<=len(row['name'])<=200]
        result['dictionary']={'ok':bool(names),'names':names[:50]}
    except BridgeError as error:
        result['dictionary']={'ok':False,'message':str(error)}
    result.update(checkedAt=datetime.now(timezone.utc).isoformat(),
                  deviceName=state.config['name'], deviceId=state.config['deviceId'],
                  helperVersion=__version__)
    state.latest_diagnostics = result
    state.diagnostics_checked = time.monotonic()
    return result


def process_request(state):
    owner = state.bind_account()
    request = state.cloud.call('device_poll', deviceId=state.config['deviceId'])
    if not request:
        return
    lease = {'requestId': request['id'], 'deviceId': state.config['deviceId'], 'leaseToken': request['lease_token']}
    def check():
        if state.cloud.current()['owner'] != owner:
            raise BridgeError('账号已切换，停止设备操作。')
        state.cloud.call('device_heartbeat', **lease)
    try:
        check()
        payload = request['payload']
        if request['kind'] == 'fushi_read':
            limit = payload.get('limit')
            if not isinstance(limit, int) or not 1 <= limit <= 20 or payload.get('scope') not in ('favorites', 'pending', 'staged'):
                raise BridgeError('Fushi 选取范围无效。')
            result = {'items': state.fushi_sources(payload['scope'], limit)}
        elif request['kind'] == 'diagnostics':
            result = diagnose(state)
        elif request['kind'] == 'dictionary_lookup':
            result = lookup(state.fushi, payload.get('query'), payload.get('dictionary'))
        elif request['kind'] == 'undo':
            result = undo_batch(state, payload['jobId'], payload['target'], check)
        elif request['kind'] == 'open_note':
            anki, binding = target_anki(state, payload['target'])
            try:
                row = next((row for row in state.journal.rows(owner, binding, payload['jobId'])
                            if row['key'] == payload['cardKey'] and row['noteId'] == payload['noteId']), None)
                if not row:
                    raise BridgeError('本机未找到匹配笔记记录。')
                current = anki.existing(row['after']['LexiKey'])
                if not current or str(current['id']) != row['noteId']:
                    raise BridgeError('原笔记已不存在或来源不匹配。')
                check()
                anki.call('guiBrowse', query='nid:' + row['noteId'])
                result = {'opened': True}
            finally:
                anki.http.close()
        else:
            raise BridgeError('不支持的设备动作。')
    except BridgeError as error:
        state.cloud.call('device_result', **lease, error=str(error))
        return
    state.cloud.call('device_result', **lease, result=result)
