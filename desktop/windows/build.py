"""Build the small native host and Inno installer from tracked runtime files.
Prerequisites: pinned Zig 0.14.1 and Inno Setup 7.1.1 (official sources).
python desktop/windows/build.py --iscc path/to/ISCC.exe
No user data or untracked content enters the package.
"""
from pathlib import Path
import argparse, hashlib, json, re, shutil, struct, subprocess, zipfile

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'work/desktop-build'
PACKAGE = WORK / 'package'
parser = argparse.ArgumentParser()
parser.add_argument('--iscc')
parser.add_argument('--zig', default=str(ROOT / 'work/obs-build/zig-x86_64-windows-0.14.1/zig.exe'))
args = parser.parse_args()
PACKAGE.mkdir(parents=True, exist_ok=True)
tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
core = {'kjv.json', 'bsb.json', 'kjvs.json', 'strongs.json', 'hymns.json', 'content-catalog.json', 'hymnary-sources.txt'}
top = {'index.html', 'display.html', 'landing.html', 'remote.html', 'cloud-remote.html', 'sw.js', 'manifest.webmanifest'}
names = [n for n in tracked if n in top or n.startswith(('js/', 'css/', 'fonts/', 'icons/', 'wifi-remote/')) or n.startswith('data/') and Path(n).name in core]
# A fresh versioned staging directory prevents obsolete files from entering releases.
stage = PACKAGE / 'www'
if stage.exists():
    resolved = stage.resolve()
    if resolved != (WORK / 'package/www').resolve() or ROOT not in resolved.parents:
        raise RuntimeError('Unsafe staging directory')
    shutil.rmtree(resolved)
stage.mkdir()
for n in names:
    dest = stage / n
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / n, dest)
optional = re.search(r'const OPTIONAL_ASSETS = \[([\s\S]*?)\];', (ROOT/'sw.js').read_text()).group(1)
extra = [s.removeprefix('./') for s in re.findall(r"'([^']+)'", optional)]
(stage/'files.txt').write_text('\n'.join(sorted(set(names+extra)))+'\n', encoding='utf-8')
# Native ICO wraps our existing PNG unchanged; no redrawing of the official logo.
png = (ROOT/'icons/icon-192.png').read_bytes()
ico = struct.pack('<HHH',0,1,1)+struct.pack('<BBBBHHII',192,192,0,0,1,32,len(png),22)+png
(PACKAGE/'kogg.ico').write_bytes(ico)
manifest = '<?xml version="1.0"?><assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0"><assemblyIdentity version="0.1.0.0" processorArchitecture="amd64" name="KOGG.Presenter" type="win32"/><trustInfo xmlns="urn:schemas-microsoft-com:asm.v3"><security><requestedPrivileges><requestedExecutionLevel level="asInvoker" uiAccess="false"/></requestedPrivileges></security></trustInfo></assembly>'
(WORK/'app.manifest').write_text(manifest)
(WORK/'app.rc').write_text('1 ICON "'+(PACKAGE/'kogg.ico').as_posix()+'"\n1 24 "'+(WORK/'app.manifest').as_posix()+'"\n')
def run(*cmd):
    subprocess.run([str(c) for c in cmd], cwd=ROOT, check=True)
run(args.zig,'rc','/:no-preprocess','/:auto-includes','none','/fo',WORK/'app.res',WORK/'app.rc')
run(args.zig,'cc','-Os','-Wall','-Wextra','-Werror',ROOT/'desktop/windows/launcher.c',WORK/'app.res','-municode','-Wl,/subsystem:windows','-lws2_32','-lwinhttp','-lshell32','-luser32','-o',PACKAGE/'KOGG Presenter.exe')
shutil.copy2(ROOT/'desktop/windows/README.txt',PACKAGE/'README.txt')
print('Packaged',len(names),'runtime files;',sum(p.stat().st_size for p in PACKAGE.rglob('*') if p.is_file()),'bytes expanded')
if args.iscc:
    run(args.iscc,'/DPackageDir='+str(PACKAGE),ROOT/'desktop/windows/setup.iss')
    release=WORK/'release'
    files={p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in release.glob('*.exe')}
    (release/'SHA256SUMS.txt').write_text(''.join(v['sha256']+'  '+n+'\n' for n,v in files.items()))
    (release/'desktop-release.json').write_text(json.dumps({'version':'0.1.0-preview','files':files},indent=2)+'\n')
    print(json.dumps(files,indent=2))
