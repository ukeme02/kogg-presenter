# KOGG Presenter repair progress

Updated: 30 October 2026

## Current state
Code repairs are applied in the existing Zcode repository and have been saved as commits after Git write approval became available. All remaining edits were approved for publishing on 30 October 2026. Source and test changes are committed in ordered groups; the commit log below records the repair IDs. Publishing verification is recorded in the release section below.

Existing user work has been retained, including corrected book-group ranges, NIV/NLT removal work, and earlier documentation changes. The user subsequently approved publishing all remaining edits, including the NIV/NLT deletions and the four overlapping landing-page lines. Those changes are included in the release commit.

## Repair checklist

| Audit | Repair | State | Evidence |
|---|---|---|---|
| 1 | Preserve verse-number slots in BSB/ASV/WEB; skip absent text | Implemented; source completeness still needs review | Canonical slot lengths, John 5 and Acts 8 assertions; original source wording unchanged |
| 2 | Versioned backup with settings, service, images and custom Bibles; validated restore | Implemented | Actual export/import handlers round-trip all referenced assets using synthetic DOM/storage |
| 3 | Theme deletion preserves all other settings | Implemented | Actual handler regression |
| 4 | Library edits set dirty status and increment mutation revision | Implemented | Mutation regression; only unchanged revisions can clear dirty status |
| 5 | Three-way edit/deletion merges and conditional cloud writes | Implemented; real Supabase test pending | Pure merge tests and simulated client race/conflict tests |
| 6 | Separate portable logo settings from device layout/mode/Bible selections | Implemented | Portable settings regression; account-switch guard |
| 7 | Numbered-book lookup retains number, exact names and aliases | Implemented | 1/2/3 John, 2 Samuel, 2 Corinthians and jn regressions |
| 8 | Validate chapter/verse bounds before preview/projection | Implemented | Invalid reference tests; no projection of empty slots |
| 9 | Bible load errors and stale requests | Implemented | Full operator smoke test resolves two requests out of order |
| 10 | Preview follows actual projected slide and blank state | Implemented | Full operator boots/projects/advances/blanks in synthetic DOM |
| 11 | Preserve lyric newlines while escaping/highlighting | Implemented | Output renderer regression |
| 12 | Bind both Docks launchers; remove duplicate menu ID | Implemented | Unique DOM IDs and visible-button smoke test |
| 13 | Previous chapter enters the previous book's final chapter | Implemented | Code repair; needs browser navigation check |
| 14 | Image/gradient switching and saved font weight | Implemented | Code repair; visual browser check pending |
| 15 | Blank hides lower thirds | Implemented | Output branch repair; actual OBS check pending |
| 16 | Optional loopback bridge for separate OBS browser process | Implemented; real OBS test pending | In-memory HTTP/SSE delivery, late viewer, malformed request and origin/path checks |
| 17 | Password-recovery redirect and new-password UI | Implemented; live email flow pending | Syntax/startup checks; deployed redirect configuration must be verified |
| 18 | Reconnect sync and retry SDK initialisation | Implemented | Failed SDK download/retry regression; online listener |
| 19 | Backup schema validation, unsafe-key rejection and safe attributes | Implemented; real quota checks pending | Malformed-import regressions; transactional restore/cloud application |
| 20 | Refit text on resize/font readiness and honour selected size | Implemented; hardware/visual verification pending | Syntax checks; needs actual long-text and fullscreen tests |
| Extra | Popup opens during click gesture before screen permission | Implemented | Code repair; browser permission-denial/popup check pending |
| Extra | Floating preview referenced undefined `plain` helper | Fixed | Reuses operator's existing Strong's stripping helper |
| Extra | Concurrent Strong's requests share one promise | Fixed | Code repair; live lexicon interaction pending |
| Landing | Correct Bible/theme counts, backup/privacy/sync/OBS claims | Implemented | Reviewed against current implementation |
| Landing | Retry failed Bible fetch, replay pending typed reference, validate ranges | Implemented | Landing inline syntax and actual liveVerse tests |
| Landing | Validate email/password, block duplicate auth clicks, announce status | Implemented | Inline syntax; live account test pending |
| Worker | New assets/cache version; scoped cleanup and background refresh lifetime | Implemented | All precache paths exist; syntax checks |

## Test commands and results

`node --test tests/*.cjs`

Latest result: **36 automated checks passed, zero failures**. This includes the standalone theme-settings handler check. These tests use actual application functions/handlers with synthetic DOM, storage and Supabase clients, and in-memory HTTP/SSE requests. They are not real browser or hardware tests. `git diff --check` also passes.

## Local repair commits

- `567615f` — fix: preserve settings when deleting themes
- `eef2d48` — fix: preserve missing scripture verse positions
- `ed7813c` — fix: stabilize operator backups cloud sync and live output
- `b656ecb` — feat: connect local operator and OBS through loopback bridge
- `252fb89` — fix: handle landing demo errors and account submission states
- `c0e6471` — docs: explain local OBS pairing backups and release checks
- `c07a9e1` — test: cover scripture backups sync output and landing regressions

The final tracking commit can be located by its message, `docs: record repair commits and outstanding release checks`.

The operator, backups and sync changes were committed together because they share the new validated library module and HTML script integration. Earlier user edits were excluded using a separate staging index; the working files were not reset. The user subsequently approved committing and publishing the remaining work. The release commit includes the earlier removals and changes in README, index, app book groups, landing content and worker translation assets.

## Remaining release gates

- Verify original Bible sources and encoding; the bundled WEB file lacks Romans 16:25–27. Explicit empty slots prevent mislabelling but do not restore absent text. ASV/BSB source encoding defects have not been rewritten speculatively.
- Run actual browser visual/mobile/fullscreen/long-text/Strong's interaction checks.
- Test Supabase ownership policies with two accounts, real sign-in/out, recovery email redirects, two-device edits/deletes, expired tokens and reconnection.
- Test complete cache installation, first offline restart, worker update and browser quota failure.
- Test the local bridge with actual OBS, a real projector/spacedesk, window permission denial and popup blocking. The loopback bridge is same-computer only.
- Confirm conflict-resolution UX is sufficient: overlapping edits currently stop with an explanation and preserve local data; there is no side-by-side conflict editor.

## How to preview the optional local setup

With Node.js available, run `node tools/obs-relay.cjs`, then open `http://127.0.0.1:8766/` as the operator. Use `http://127.0.0.1:8766/landing.html` for the landing page and `http://127.0.0.1:8766/display.html?overlay=1` in OBS. Keep the process running. This origin has separate browser storage, so transfer an existing library using a full backup.

## Release — 30 October 2026

All 36 automated checks passed before publishing. A website-only upload was prepared; scratch files, Git metadata, account caches and test tooling are excluded. GitHub Pages publishes from main at the repository root. Published release: `92c4173` (`fix: finalize approved translation cleanup and release content`).

- GitHub push succeeded to `origin/main`; GitHub Pages reported `built` for the exact release commit with no build error.
- Cloudflare Pages production deployment succeeded: `https://ef1a175a.kogg-presenter.pages.dev`.
- Production app: https://kogg-presenter.pages.dev/
- Production landing page: https://kogg-presenter.pages.dev/landing.html
- GitHub Pages mirror: https://ukeme02.github.io/kogg-presenter/
- Verified 12 files on each public site against local SHA-256 content: index, landing, worker, app/library/sync/relay/display scripts, display CSS, and BSB/ASV/WEB data. All 24 comparisons matched.
- These checks confirm publication and file integrity; the browser, account/email, projector and real OBS release gates above remain outstanding.

## Docks close fix — 30 October 2026

The `.more-menu` flex display rule overrode the browser’s default `[hidden]` styling, so JavaScript toggled the menu state but the menu stayed visible. Added `.more-menu[hidden] { display: none; }`.

- Verified in a real local browser: open using the Scripture Docks button, click it again, and the Docks menu is removed from the visible accessibility tree.
- Added repeated-toggle coverage for both the Scripture and floating-console launchers.
- All 37 automated checks pass.
- Recorded the current product goal and decision principles in `PRODUCT_PURPOSE.md`.
