# KOGG Connect 0.1.0 — Windows OBS preview

Adds **KOGG Presenter** as an OBS source. Pair the browser with OBS using an eight-character code, then send Scripture, lyrics, lower thirds and alerts to the broadcast.

## Downloads

- `kogg-connect-0.1.0-preview-windows-x64.exe` — Windows x64 installer for OBS 32.x.
- `kogg-connect-0.1.0-preview-windows-x64.zip` — manual installation package, source and setup instructions.
- `kogg-connect-release.json` and `SHA256SUMS.txt` — file sizes and SHA-256 checksums.

This is the OBS plugin, not an installer for the KOGG Presenter browser app. [Open the presenter here](https://kogg-presenter.pages.dev/index.html).

## Setup

1. Close OBS, run the installer, then reopen OBS.
2. Add **Sources → + → KOGG Presenter** and copy its pairing code.
3. In the browser app, choose **Stream → KOGG Connect**, enter the code and connect. Allow local-network access if the browser asks.
4. Send a verse and check OBS's preview. Reuse **Add existing** to share the source across scenes.

No Node installation or separate terminal bridge is needed for this OBS plugin. OBS and KOGG must run on the same computer. Phone remote pairing is separate.

## Preview limitations

The installer is unsigned and asks for administrator permission. Windows x64 / OBS 32.x is the supported build target; macOS, Linux and Windows ARM builds are not available. Real OBS rendering, clean-machine installation and browser permission acceptance still require testing. Window Capture remains the fallback. Do not bypass a browser security warning to download it.

Media videos are not sent through this plugin; use Output Window Capture for full media playback. The plugin bundles its display renderer for offline use; prepare KOGG's offline content separately before disconnecting.

Source is GPL-2.0-or-later. OBS binaries are not redistributed. The manual ZIP includes source for this build; the release tag points to the commit that produced the published files.
