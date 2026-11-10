"""Exercise the actual Windows executable without opening a browser/profile."""
from pathlib import Path
import concurrent.futures, hashlib, http.client, json, subprocess, time, sys
ROOT=Path(__file__).resolve().parents[2]
package=ROOT/'work/desktop-build/package'
exe=package/'KOGG Presenter.exe'
def request(path,method='GET',headers=None):
    conn=http.client.HTTPConnection('127.0.0.1',8768,timeout=8)
    conn.request(method,path,headers=headers or {})
    result=conn.getresponse();body=result.read();status=result.status;conn.close()
    return status,body
process=subprocess.Popen([str(exe),'--test-host'],creationflags=subprocess.CREATE_NO_WINDOW)
try:
    for _ in range(80):
        if process.poll() is not None:raise RuntimeError('Host exited: '+str(process.returncode))
        try:
            assert request('/desktop-status')[0]==200
            break
        except OSError:time.sleep(.1)
    names=['index.html','display.html','data/kjv.json','data/bsb.json','data/kjvs.json','data/strongs.json','data/hymns.json','fonts/NunitoSans-Variable.woff2']
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results=list(pool.map(lambda n:request('/'+n),names))
    for name,(status,body) in zip(names,results):
        assert status==200,name
        assert hashlib.sha256(body).digest()==hashlib.sha256((package/'www'/name).read_bytes()).digest(),name
    hymnary=json.loads(request('/data/hymns.json')[1])
    assert len(hymnary['hymns'])==300
    for path in ['/../README.txt','/%2e%2e/README.txt','/js/../index.html','/data/hymns-basic.json','/files.txt','/js/app.js:secret']:
        assert request(path)[0] in (403,404),path
    assert request('/index.html',headers={'Host':'attacker.example'})[0]==403
    assert request('/index.html',headers={'Origin':'https://attacker.example'})[0]==403
    assert request('/index.html','POST')[0]==405
    assert request('/index.html','HEAD')==(200,b'')
    assert request('/api/lyrics?action=search&q=grace')[0]==503
    assert request('/data/web.json')[0]==503
    assert request('/display')[0]==200
    assert request('/index.html?launch=1')[0]==200
    print('PASS: bundled offline bytes, 300 hymns, concurrent loading, HEAD, routing, origin/host isolation, traversal denial, online separation',flush=True)
    if '--serve' in sys.argv:
        print('Offline browser acceptance: http://127.0.0.1:8768/index.html',flush=True)
        while True:time.sleep(1)
finally:
    process.terminate();process.wait(timeout=8)
