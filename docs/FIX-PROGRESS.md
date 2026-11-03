# Repair progress — 3 November 2026

Audit baseline: dec9301. Work is being saved in separate tested commits.

| Audit issue | Status |
| --- | --- |
| F01 sync baseline/data overwrite | Fixed; regression tests |
| F04 pending sync after mode change | Fixed; regression tests |
| F02 Bible encoding | Fixed; reversible repairs, structure preserved |
| F03 stale release/data cache | Fixed; content-hash migration and complete release cache |
| F05 duplicate output after monitor removal | Pending |
| F06/F07 service theme consistency | Pending |
| F08/F09 live sizing/theme and maximum-screen defaults | Pending |
| F10 Lyrics single-tap emphasis | Pending |
| F11 hidden Notes controls | Pending |
| F12 session output cleanup | Pending |
| F13 installation feedback | Pending |
| F14 preview paragraph spacing | Pending |
| F15 landing emphasis | Pending |

Step 1: 176 automated checks pass. New sync acceptance and cancellation guards are client-only; no database schema or production library data changed. Physical device/two-account release gates remain listed in the audit report.

Step 2: 179 checks pass. Repaired 1,863 KJV and 1,953 ASV verses, including Hebrew/ligature encoding, without changing 66-book/31,102-verse structure. Cache reuses only unchanged assets, refreshes changed optional data too, and defers activation until old app/output tabs close. Run `node scripts/update-asset-manifest.cjs` before tests/deployment after cached-file edits.
