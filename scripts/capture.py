"""Start a local server only when needed, capture, and stop only the owned server."""
import subprocess,time,urllib.request
server=None
try:
    try:
        with urllib.request.urlopen('http://127.0.0.1:8766/simulator/core.mjs',timeout=2) as r:
            assert b'sieve-1.1.0' in r.read(), 'Port 8766 belongs to another application.'
    except OSError:
        server=subprocess.Popen(['python3','-m','http.server','8766','--bind','127.0.0.1'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        time.sleep(.5)
        if server.poll() is not None:raise RuntimeError('Local server failed to start.')
    subprocess.run(['node','scripts/screenshots.mjs'],check=True)
finally:
    if server:
        server.terminate()
        server.wait(timeout=5)
