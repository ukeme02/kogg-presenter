# KOGG Presenter for Windows — 0.1.0 preview

A small Windows installer for the presenter itself, separate from KOGG Connect for OBS. Install once, open from Start, choose Local, and present the included content without internet or server setup.

- Windows 10/11 x64; Microsoft Edge must already be installed.
- About 6.2 MB to download; about 19 MB of program files, plus Edge's separate app profile/cache.
- Includes KJV, BSB, KJV Strong’s, the Strong’s lexicon, and 300 traditional hymns.
- All eight decks use the same operator and output as the browser app.
- Per-user installation, Start-menu shortcut, optional desktop shortcut, Windows uninstall entry, and upgrades in place.
- No Node, Electron download, Windows service, startup task, firewall exception, or LAN listener. A small private local host runs automatically while KOGG is open.

## Using it

1. Run the Windows setup EXE from this release.
2. Open **KOGG Presenter** from Start and choose **Local** to retain songs and plans on this PC.
3. Choose a passage or song, then open **Output**. Allow screen-management permission if offered, and rehearse fullscreen placement with your projector.
4. After the service, close your operator/output windows and right-click the KOGG icon beside the Windows clock → **Quit KOGG Presenter**.

The desktop library is separate from your normal browser library. Sign in to KOGG Sync or import a library backup to bring existing work across. Online lyrics search, optional Bible downloads, Sync and online phone pairing require internet. Microphone recognition depends on Edge and its recognition service.

## Phone remote

**Stream → Phone remote · online → Start / renew online remote → scan with your phone.** No account or bridge is needed in Base, Local or Sync. Both devices must have internet; they may use different networks. Keep the operator open. The phone offers Previous, Next, Blank and Resume. Stop remote on the laptop revokes the pairing link.

The separate direct Wi-Fi browser mode remains experimental and requires a return pairing exchange. This release does not promise a one-scan, six-digit connection without internet.

## Preview limits

This installer is **unsigned** and published as a prerelease. Windows may show an unknown-publisher warning; use the official GitHub release and checksum. Code signing and independent clean-PC, physical phone/projector and OBS acceptance remain before declaring a stable Windows release. Browser features and permissions vary by Windows/Edge version. Extra translations still require their provider access; installing KOGG does not grant licensed Bible access.

Uninstall removes program files and shortcuts but preserves `%LOCALAPPDATA%\KOGG Presenter\Browser` with your saved work. It does not uninstall the OBS plugin. Export backups before changing devices. Quit the tray host before upgrading or uninstalling.

Source: `desktop/windows/`. Build instructions and acceptance checks are in `desktop/windows/BUILD.md`. `SHA256SUMS.txt` and `desktop-release.json` describe the uploaded installer.
