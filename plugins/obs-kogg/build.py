"""Reproducible Windows x64 preview build; downloads verified build tools locally.
Run from the repository: python plugins/obs-kogg/build.py
OBS is needed for native integration tests, not for building the distributable.
"""
from pathlib import Path
import hashlib, json, shutil, subprocess, urllib.request, zipfile, re

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'work/obs-build'
WORK.mkdir(parents=True, exist_ok=True)
SOURCES = ROOT / 'plugins/obs-kogg/src'
VERSION = '0.1.0-preview'

def download(name, url, digest):
    dest = WORK / name
    if not dest.exists():
        urllib.request.urlretrieve(url, dest)
    if hashlib.sha256(dest.read_bytes()).hexdigest() != digest:
        raise RuntimeError('Checksum failed: ' + name)
    return dest

compiler = download('zig.zip', 'https://ziglang.org/download/0.14.1/zig-x86_64-windows-0.14.1.zip', '554f5378228923ffd558eac35e21af020c73789d87afeabf4bfd16f2e6feed2c')
zig = WORK / 'zig-x86_64-windows-0.14.1/zig.exe'
if not zig.exists():
    with zipfile.ZipFile(compiler) as z:
        z.extractall(WORK)
headers = download('obs.zip', 'https://codeload.github.com/obsproject/obs-studio/zip/refs/tags/32.0.2', '0dac01dc526058aea55001ef28772e1f296761c7fb64038abee414bd7a5f9a75')
include = WORK / 'obs-studio-32.0.2/libobs'
if not include.exists():
    with zipfile.ZipFile(headers) as z:
        for name in z.namelist():
            if '/libobs/' in name and not name.endswith('/'):
                z.extract(name, WORK)
(WORK / 'obsconfig.h').write_text('#pragma once\n#define OBS_RELEASE_CANDIDATE 0\n#define OBS_BETA 0\n')
text = '\n'.join((SOURCES / f).read_text() for f in ['plugin.c', 'server.c', 'test-module.c'])
imports = set(re.findall(r'\b(obs_[a-z_]+|bfree|blog)\(', text))
imports -= set(re.findall(r'\b(obs_module_[a-z_]+)\(', text))
imports -= {'obs_register_source'}
imports |= {'bmalloc', 'obs_register_source_s', 'obs_find_module_file', 'obs_module_get_config_path'}
(WORK / 'obs.def').write_text('LIBRARY obs.dll\nEXPORTS\n' + '\n'.join(sorted(imports)) + '\n')
def run(*args):
    subprocess.run([str(zig), *map(str,args)], cwd=ROOT, check=True)
run('dlltool', '-d', WORK/'obs.def', '-l', WORK/'obs.lib', '-m', 'i386:x86-64')
common = ['-O2', '-Wall', '-Wextra', '-I', WORK, '-I', include]
run('cc', '-shared', *common, SOURCES/'plugin.c', SOURCES/'server.c', WORK/'obs.lib', '-lws2_32', '-lbcrypt', '-o', WORK/'kogg-connect.dll')
run('cc', *common, SOURCES/'test-server.c', SOURCES/'server.c', WORK/'obs.lib', '-lws2_32', '-lbcrypt', '-o', WORK/'kogg-test-server.exe')
run('cc', *common, SOURCES/'test-module.c', WORK/'obs.lib', '-o', WORK/'kogg-test-module.exe')

package = WORK / ('package-' + VERSION)
plugin = package / 'kogg-connect'
renderer = plugin / 'data/renderer'
renderer.mkdir(parents=True, exist_ok=True)
files = ['display.html', 'css/display.css', 'js/display.js', 'js/obs-receiver.js', 'js/stream.js', 'fonts/NunitoSans-Variable.woff2']
files += [p.relative_to(ROOT).as_posix() for p in (ROOT/'icons').glob('*.svg')]
for name in files:
    target = renderer / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / name, target)
# Isolate the renderer: no service worker, cloud, database, bridge or external fetch.
html = (renderer/'display.html').read_text(encoding='utf-8')
html = re.sub(r'<link rel="manifest"[^>]*>\s*', '', html)
html = re.sub(r'<script src="js/(idb|library|relay)\.js"></script>\s*', '', html)
(renderer/'display.html').write_text(html, encoding='utf-8')
(renderer/'files.txt').write_text('\n'.join(files)+'\n')
(plugin/'bin/64bit').mkdir(parents=True, exist_ok=True)
shutil.copy2(WORK/'kogg-connect.dll', plugin/'bin/64bit/kogg-connect.dll')
shutil.copy2(ROOT/'plugins/obs-kogg/README.md', package/'README.md')
# Include corresponding plugin source and exact browser renderer source.
source = package/'source'
shutil.copytree(ROOT/'plugins/obs-kogg', source, dirs_exist_ok=True)
with zipfile.ZipFile(headers) as z:
    (package/'COPYING.txt').write_bytes(z.read('obs-studio-32.0.2/COPYING'))
# Build a small Windows installer with the verified payload embedded. No runtime dependency.
payload = []
for i,p in enumerate(sorted(plugin.rglob('*'))):
    if p.is_file():
        name=p.relative_to(plugin).as_posix()
        payload.append((name,p.read_bytes()))
generated=['#include <stddef.h>\n']
for i,(_,data) in enumerate(payload):
    generated.append('static const unsigned char file_%d[]={%s};\n'%(i,','.join(str(b) for b in data)))
generated.append('static const struct {const wchar_t *name;const unsigned char *data;size_t size;} files[]={\n')
for i,(name,data) in enumerate(payload):
    generated.append('{L"%s",file_%d,%d},\n'%(name.replace('/', '\\\\'),i,len(data)))
generated.append('};\n')
(WORK/'payload.h').write_text(''.join(generated))
run('rc','/:no-preprocess','/:auto-includes','none','/fo',WORK/'installer.res',ROOT/'plugins/obs-kogg/installer.rc')
installer = WORK/('kogg-connect-'+VERSION+'-windows-x64.exe')
run('cc','-O2','-I',WORK,SOURCES/'installer.c',WORK/'installer.res','-municode','-mwindows','-lcomctl32','-lshell32','-lole32','-o',installer)
dist=ROOT/'downloads'
dist.mkdir(exist_ok=True)
shutil.copy2(installer,dist/installer.name)
archive=dist/('kogg-connect-'+VERSION+'-windows-x64.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for p in package.rglob('*'):
        if p.is_file():z.write(p,p.relative_to(package))
manifest={'version':VERSION,'platform':'Windows x64','obs':'32.x','status':'preview; hardware acceptance pending','files':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [dist/installer.name,archive]}}
(dist/'kogg-connect-release.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
