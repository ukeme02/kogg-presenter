# KOGG Connect 0.1.1 — Windows OBS preview

Refreshes the bundled output renderer and fixes two omitted media-display scripts. Packaging now checks that every local script and stylesheet referenced by the renderer exists, preventing another incomplete installer.

1. Close OBS and run the installer. Reopen OBS 32 on Windows x64.
2. Add a KOGG Presenter source and copy its eight-character pairing code.
3. In KOGG, open Stream → KOGG Connect, enter the code and allow local-network access if your browser asks.

No Node installation or separate terminal bridge is needed. The plugin includes its font, logo and renderer for offline operation. This update does not add video transport; use Window Capture for local media, and rehearse your actual OBS scene.

The installer is unsigned and remains a preview. Real OBS rendering, clean-PC installation and browser-permission acceptance remain outstanding. The ZIP includes the manual package, corresponding source and licence. SHA256SUMS.txt and kogg-connect-release.json describe the release assets.
