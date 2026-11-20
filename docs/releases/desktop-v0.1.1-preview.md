# KOGG Presenter for Windows — 0.1.1 preview

Updates the lightweight Windows installer to browser runtime v138, including the full Ibibio Old and New Testaments, recent Scripture fixes, optional Bible download management and current service/media tools.

- Includes KJV, BSB, KJV Strong’s, Ibibio, the Strong’s lexicon and 300 hymns for offline presentation.
- Additional Bible and hymn packs download only when chosen. NLT is online only; its replacement connection is not yet activated.
- Windows 10/11 x64 with Microsoft Edge already installed. No Node installation, server setup or extra browser engine download.
- Quit KOGG from its tray icon before upgrading. The installer preserves the existing app identity and separate browser profile, including saved Local work.
- Online phone remote: Stream → Phone remote → Start, then scan with a phone. Internet is required on both devices; no Sync account is required. Direct offline Wi-Fi pairing remains experimental.

This is an unsigned preview. Rehearse on your actual projector, phone and OBS before a service. Physical-device acceptance and code signing remain outstanding; automated tests do not replace them.

Use the setup EXE and verify it against SHA256SUMS.txt or desktop-release.json. Uninstall removes program files but preserves `%LOCALAPPDATA%\KOGG Presenter\Browser`. Export a library backup before changing devices.
