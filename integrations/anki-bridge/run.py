import sys
sys.dont_write_bytecode = True

if __name__ == '__main__':
    import multiprocessing
    multiprocessing.freeze_support()
    if '--self-test' in sys.argv:
        if sys.stdout:print('Self-test: importing runtime',flush=True)
        import socket
        import tempfile
        import threading
        import time
        import ssl
        import certifi
        import pystray
        from PIL import Image
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
        assert (ASSETS / 'app-icon.png').is_file()
        assert (ASSETS / 'learning-card.css').is_file()
        Vault()
        ssl.create_default_context(cafile=certifi.where())
        if sys.stdout:print('Self-test: runtime and dictionary sanitizer ready',flush=True)
        with tempfile.TemporaryDirectory() as directory:
            state = State(Path(directory), cloud=SimpleNamespace(current=lambda: {'owner': 'fixture'}))
            sock = socket.socket();sock.bind(('127.0.0.1', 0));port = sock.getsockname()[1]
            server = uvicorn.Server(uvicorn.Config(create_app(state, port, 'self-test'), log_config=None, access_log=False))
            thread = threading.Thread(target=lambda: server.run(sockets=[sock]), daemon=True);thread.start()
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
            from bridge import __version__
            from bridge.distribution import write_receipt
            executable=Path(sys.executable)
            write_receipt(executable.parent, __version__, sys.version.split()[0])
    else:
        import argparse
        from bridge.app import main
        from bridge.cloud import ORIGIN
        parser = argparse.ArgumentParser(description='Lexi connection helper')
        parser.add_argument('--data-dir')
        parser.add_argument('--origin', default=ORIGIN)
        parser.add_argument('--no-browser', action='store_true')
        parser.add_argument('--connection-file', help='Local automation handshake; contains a temporary loopback token, never upload')
        args = parser.parse_args()
        sys.exit(main(args.data_dir, args.origin, not args.no_browser, args.connection_file))
