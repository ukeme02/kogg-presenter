"""Install/upgrade/uninstall acceptance in a known repository-local test folder.
Never touches a pre-existing desktop installation or browser library.
"""
from pathlib import Path
import hashlib, subprocess, winreg
ROOT=Path(__file__).resolve().parents[2]
work=ROOT/'work/desktop-build'
target=work/'installed-test'
key=r'Software\Microsoft\Windows\CurrentVersion\Uninstall\{B53D511A-126B-4F4A-91B3-570379846E86}_is1'
def installation():
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER,key) as k:return Path(winreg.QueryValueEx(k,'InstallLocation')[0])
    except FileNotFoundError:return None
previous=installation()
if previous and previous.resolve()!=target.resolve():raise RuntimeError('Existing user installation: do not replace it in acceptance tests')
setup=work/'release/kogg-presenter-0.1.0-preview-windows-x64-setup.exe'
for round in ['install','upgrade']:
    subprocess.run([str(setup),'/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/NOICONS','/DIR='+str(target),'/LOG='+str(work/('accept-'+round+'.log'))],check=True)
    assert installation().resolve()==target.resolve()
    for src in (work/'package').rglob('*'):
        if src.is_file():
            dest=target/src.relative_to(work/'package')
            assert dest.read_bytes()==src.read_bytes(),dest
    print('PASS:',round,'registry and all installed bytes match')
subprocess.run([str(target/'unins000.exe'),'/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/LOG='+str(work/'accept-uninstall.log')],check=True)
assert installation() is None
assert not (target/'KOGG Presenter.exe').exists()
print('PASS: uninstall removes program/registration; browser profile is outside the installer file list')
