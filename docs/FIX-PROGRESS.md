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
| F05 output assignment | Pending |
| F10 Lyrics tapping | Pending |
| F11 conditional controls | Pending |
| F13 install feedback | Pending |
| F14 paragraph spacing | Pending |
| F15 landing annotation | Pending |

Step 1: 176 checks. Sync baseline acceptance and stale-mode cancellation.
Step 2: 179 checks. Repaired 1,863 KJV and 1,953 ASV verses; retained 66 books and 31,102 verses each. Updated files migrate by content hash; no mid-service worker activation.
Step 3: shared item-aware service playback, prepared themes, session cleanup and live-theme adjustment.
Step 4: 182 checks. Projection fills the usable area by default, with safe 4vw/4vh edges and reference space. Quick sizing changes fitted scale, with explicit Maximum fit feedback; manual sizing remains available.

Run node scripts/update-asset-manifest.cjs before tests/deployment after cached-file edits. Physical hardware/two-account gates remain in the audit report.
