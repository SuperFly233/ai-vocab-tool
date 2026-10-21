from bridge.app import main
import sys

if __name__ == '__main__':
    if '--self-test' in sys.argv:
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
        assert (ASSETS / 'index.html').is_file()
        assert (ASSETS / 'icons.js').is_file()
        Vault()
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
                    assert client.get(f'http://127.0.0.1:{port}/assets/icons.js').status_code == 200
                    assert client.post(f'http://127.0.0.1:{port}/api/status', json={}).status_code == 403
            finally:
                server.should_exit = True;thread.join(10);sock.close();state.journal.db.close()
    else:
        main()
