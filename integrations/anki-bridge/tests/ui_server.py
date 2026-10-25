import json
import socket
import tempfile
import threading
from pathlib import Path

import uvicorn
from bridge.app import State, create_app
from test_bridge import FakeAnki, FakeCloud, card

temp = tempfile.TemporaryDirectory()
cloud = FakeCloud()
cloud.release = lambda: json.loads((Path(__file__).resolve().parents[3] / 'bridge-release.json').read_text('utf-8'))
state = State(Path(temp.name), cloud=cloud)
anki = FakeAnki()
state.anki = lambda: anki
state.fushi = type('FushiFixture', (), {
    'call': lambda self, action: {'running':True,'version':'3.0.0'},
    'sources': lambda self, kind, limit=200: [{'id':kind+':1','key':'fixture','title':'clock','quote':'I clocked the detail. <script>unsafe</script>','sourceTitle':'Fushi fixture','queued':kind!='favorites','mediaAvailable':False}]
})()
job_id = '11111111-1111-4111-8111-111111111111'
job = {'id': job_id, 'device_id': '', 'status': 'awaiting_device', 'payload': {'cards': [card(), {**card('second'), 'title': 'connect the dots', 'meaning': '把线索串起来'}]}}
original = cloud.call


def call(action, **args):
    job['device_id'] = state.config['deviceId']
    if action == 'list': return [job]
    if action == 'claim': return {**job, 'lease_token': 'fixture'}
    if action == 'finish':
        job['status'] = 'complete'
        return {'status': 'complete'}
    return original(action, **args)


cloud.call = call
sock = socket.socket();sock.bind(('127.0.0.1', 0));port = sock.getsockname()[1]
server = uvicorn.Server(uvicorn.Config(create_app(state, port, 'qa-token'), access_log=False, log_level='error'))
print(json.dumps({'port': port}), flush=True)
threading.Thread(target=lambda: (state.closed.wait(), setattr(server, 'should_exit', True)), daemon=True).start()
try:
    server.run(sockets=[sock])
finally:
    state.journal.db.close();sock.close();temp.cleanup()
