# Repair progress - 3 November 2026

Audit baseline: dec9301. Separate tested commits; no database schema changes.

| Issue | Status |
| --- | --- |
| F01 sync baseline/data overwrite | Fixed; regression tests |
| F04 pending sync after mode change | Fixed; regression tests |
| F02 Bible encoding | Fixed; reversible repairs, structure preserved |
| F03 stale release/data cache | Fixed; content-hash migration and complete release cache |
| F06/F07 service themes | Fixed; shared item-aware presenter |
| F08/F09 live sizing and screen-fill default | Fixed; active-theme controls, automatic maximum fit |
| F12 temporary session output cleanup | Fixed; playback preserves session identity |
| F05 output assignment | Fixed; targeted checks |
| F10 Lyrics tapping | Fixed; targeted checks |
| F11 conditional controls | Fixed; targeted checks |
| F13 install feedback | Fixed; targeted checks |
| F14 paragraph spacing | Fixed; targeted checks |
| F15 landing annotation | Fixed; targeted checks |

Step 1: 176 checks. Sync baseline acceptance and stale-mode cancellation.
Step 2: 179 checks. Repaired 1,863 KJV and 1,953 ASV verses; retained 66 books and 31,102 verses each. Updated files migrate by content hash; no mid-service worker activation.
Step 3: shared item-aware service playback, prepared themes, session cleanup and live-theme adjustment.
Step 4: 182 checks. Projection fills the usable area by default, with safe 4vw/4vh edges and reference space. Quick sizing changes fitted scale, with explicit Maximum fit feedback; manual sizing remains available.

Run node scripts/update-asset-manifest.cjs before tests/deployment after cached-file edits. Physical hardware/two-account gates remain in the audit report.

Step 5: surplus windows retire after hot-unplug; Lyrics taps toggle from pre-gesture state; hidden controls stay hidden; paragraph breaks are preserved; accepted installation feedback resolves the platform in scope; manual hero selection preserves knowledge emphasis.

Step 6: Explorer is now the app quick-settings launcher. It opens circular size, alignment, docks, voice, theme, lock and mode controls; it is draggable, closes outside/Escape, and indicates active microphone listening. It starts closed unless the user explicitly saved it open. Landing features include automatic full-screen fitting and Explorer settings.

Step 7: 187 checks pass. Theme edits broadcast explicitly to existing outputs and also respond to storage events; fitting runs immediately in background/OBS windows and after fonts load. Output placement waits for fullscreen exit before moving; an output deliberately opened on the console screen stays windowed. Release cache: v101.

Browser verification: fresh Base installation, 2 Corinthians 4:6 at maximum fit, live decrease/increase (70.7047px to 67.1695px and back at 1280x720), long Esther 8:9, Lyrics first-tap emphasis, hidden Notes controls, corrected KJV punctuation, and landing sample knowledge emphasis. No warning/error logs on the final projection and landing checks. Previous-release cache migration was exercised locally; updates intentionally wait for all old app and Output clients to close.

Projection proof: docs/repair-evidence-2026-11-03/projection-max-fit.jpg. The old functional audit remains the before-fix record. Hardware, browser-permission, provider-backed content and authenticated two-device gates remain unverified; backend advisory settings are separate review items. The user's untracked data/hymns-basic.json was not changed or included in the release.
