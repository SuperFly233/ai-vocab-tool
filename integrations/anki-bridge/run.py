import sys

if __name__ == '__main__':
    if '--self-test' in sys.argv:
        if sys.stdout:print('Self-test: importing runtime',flush=True)
        import socket
        import tempfile
        import threading
        import time
        from pathlib import Path
        from types import SimpleNamespace
        import httpx
        import uvicorn
        from bridge.app import ASSETS, State, create_app
        from bridge.cloud import Vault
        from bridge.dictionary import clean_html
        import nh3
        assert nh3.__version__ == '0.3.7'
        assert '<script' not in clean_html('<p>dictionary</p><script>bad()</script>')
        assert (ASSETS / 'index.html').is_file()
        assert (ASSETS / 'icons.js').is_file()
        Vault()
        if sys.stdout:print('Self-test: runtime and dictionary sanitizer ready',flush=True)
        with tempfile.TemporaryDirectory() as directory:
            state = State(Path(directory), cloud=SimpleNamespace(current=lambda: {'owner': 'fixture'}))
            sock = socket.socket();sock.bind(('127.0.0.1', 0));port = sock.getsockname()[1]
            server = uvicorn.Server(uvicorn.Config(create_app(state, port, 'self-test'), log_config=None, access_log=False))
            thread = threading.Thread(target=lambda: server.run(sockets=[sock]));thread.start()
            try:
                with httpx.Client(trust_env=False, timeout=1) as client:
                    for attempt in range(50):
                        try:
                            response = client.get(f'http://127.0.0.1:{port}/')
                            break
                        except httpx.ConnectError:
                            time.sleep(.1)
                    else:
                        raise RuntimeError('Local server did not start')
                    assert response.status_code == 200
                    if sys.stdout:print('Self-test: loopback HTTP ready',flush=True)
                    assert client.get(f'http://127.0.0.1:{port}/assets/icons.js').status_code == 200
                    assert client.post(f'http://127.0.0.1:{port}/api/status', json={}).status_code == 403
            finally:
                server.should_exit = True;thread.join(10);sock.close();state.journal.db.close()
            if thread.is_alive():raise RuntimeError('Self-test server did not stop')
        if getattr(sys,'frozen',False):
            import hashlib
            import json
            from bridge import __version__
            executable=Path(sys.executable)
            executable.with_suffix('.selftest.json').write_text(json.dumps({'passed':True,'version':__version__,'sha256':hashlib.sha256(executable.read_bytes()).hexdigest(),'python':sys.version.split()[0]}),'utf-8')
    else:
        from bridge.app import main
        main()
