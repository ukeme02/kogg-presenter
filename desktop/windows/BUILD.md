# Windows presenter build

Build locally on Windows with Python 3, Zig **0.14.1** and Inno Setup **7.1.1 x64**. The presenter itself needs none of these tools.

Official build tools:

- Zig: https://ziglang.org/download/0.14.1/zig-x86_64-windows-0.14.1.zip — SHA-256 `554f5378228923ffd558eac35e21af020c73789d87afeabf4bfd16f2e6feed2c`.
- Inno Setup: https://github.com/jrsoftware/issrc/releases/download/is-7_1_1/innosetup-7.1.1-x64.exe — SHA-256 `8a5a6711c3766a6e5fb74f280ba0e3551e719ce94538d901fdbd1f8f9920b3f0`; valid Authenticode publisher **Pyrsys B.V.**. Upstream download/verification guidance: https://jrsoftware.org/isdl.php.

```powershell
node scripts/update-asset-manifest.cjs
python desktop/windows/build.py --zig path/to/zig.exe --iscc path/to/ISCC.exe
python desktop/windows/test_host.py
python desktop/windows/test_installer.py
node --test tests/*.cjs
```

`build.py` stages only tracked runtime paths and the seven core data files. The optional Bible/hymn packs are whitelisted but fetched only when requested online. It excludes untracked hymn data, development work, credentials, libraries, and downloads. Output is under ignored `work/desktop-build/release/`. The ICO wraps the existing official icon PNG without changing its artwork.

The native host binds **127.0.0.1:8768 only**, with an exclusive socket and one-process mutex. Its static allowlist rejects traversal, unexpected Host/Origin values and request bodies. It supports bounded parallel reads and only proxies GET requests to the fixed production lyrics endpoint or whitelisted optional packs, using normal WinHTTP TLS verification. No cookies, authorization or arbitrary destination URLs are forwarded.

Fixed origin and a separate Edge profile retain IndexedDB/local storage across upgrades. Edge sync and first-run UI are disabled for this app invocation; normal browser settings are not changed. The launch flags follow the same first-run/sync switches used by Microsoft's [eCDN runner](https://github.com/microsoft/eCDN-silent-testing-scripts/blob/main/silent-tester-runner-windows.ps1). Edge behaviour can change; check a fresh Windows account before each stable release.

`test_host.py --serve` runs the real executable with online proxying disabled and holds it for browser acceptance. `test_installer.py` refuses to replace a user installation outside its exact workspace test directory. It verifies installation/upgrade byte-for-byte and removes the test registration using the generated uninstaller. Neither check imports a user's library.

Release checklist: refresh asset manifest, pass suite/native tests, inspect real Edge launch and output, verify final installer after rebuilding, commit/push the exact source, upload installer/checksums as a prerelease, check GitHub asset digests, then deploy landing download links. Do not claim physical OBS/projector/mobile acceptance from simulated or automated checks.
