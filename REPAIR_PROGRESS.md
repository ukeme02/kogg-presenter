# KOGG Presenter repair progress

Updated: 30 October 2026 — evening session

## Quick jump / Whole-Bible search docks restored

The prepare-before-live change had demoted the ⚡ Quick jump and 🔎 Whole-Bible search docks to
`legacy-lookup` elements with an unconditional `hidden` attribute and removed them from the
🧩 Docks menu, making them and their 🎤 voice buttons unreachable. Both are first-class docks
again (js `2383709`): visible by default, toggleable from the Docks menu, and their voice input
works from Chrome/Edge while online (Web Speech API needs that network, not a KOGG fault).

## Scripture prepare-and-live flow, quick-go responsiveness, hymnary, service sync

Commit slice list this session:

- `676d261` — prepare `stageScripture()` before "Go Live ↵"; persistent scripture history,
  bookmarks, "Resume last reading"; translation comparison panel; projector label now names the
  live version; Quick Go debounced to 200 ms and no longer stages a verse on every keystroke
  (stage on arrow-key/click only); guards before the Bible loads; boot does not restage when the
  passage is already live; `autoSync` clears the cached cloud profile on a real `not-signed-in`
  push failure.
- `ec6736f` — basic hymnary grows 34 → 300 bundled public-domain hymns; optional
  `data/hymns-extra.json` (262 more) via `data/content-catalog.json`, downloaded once through the
  validated `js/content.js` pack reader; Service Worker bumped to v31 (adds scripture-tools,
  content.js, pack catalog); offline status now reads "3 Bibles + basic hymnary".
- `884e28a` — the current service queue syncs to the cloud library like songs, themes and plans.
- `2383709` — the dock restoration above.

Tests: `node --test tests/*.cjs` → 44 pass, 0 fail after each slice. `node --check js/app.js` clean.

Release — same evening:

- Pushed to GitHub `origin/main`; Cloudflare production deploy **succeeded** via authenticated
  wrangler (the earlier `api.cloudflare.com` DNS failure is gone), `https://kogg-presenter.pages.dev/`.
- Staging excluded `.git`, `.wrangler`, `tests`, `tools`, docs and one stray untracked file
  (`data/hymns-basic.json`, UTF-16, "traditional-basic-v2", unreferenced — needs a decision).
- Integrity: 12 production files SHA-256-compared against local copies — 12/12 MATCH, including
  the three Bibles, hymns, SW v31, new scripts, and both HTML pages via the canonical `/` and
  `/display` routes.

Still outstanding (see "Remaining release gates" below): real-browser/hardware/OBS/Supabase
live checks; WEB Romans 16:25–27 empty slots; complete-hymnary edition choice; true offline
installer/portable distribution; performance budget measurement.

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

## Product requirements clarified — 30 October 2026

The user confirmed that low hardware demands, travel-ready schedules and installation/first presentation without internet are core requirements. `PRODUCT_PURPOSE.md` now distinguishes these requirements from the implementation's current capabilities. Remaining product work includes measuring performance on modest hardware, syncing the current service queue with its required content, and delivering an offline distribution that does not require a prior online visit. This documentation update does not claim those features are implemented.

## Output loading, extended screen and Base Mode — 30 October 2026

The user reported `ERR_FAILED` at Cloudflare’s `display.html` address and expected extended-screen placement. Confirmed Cloudflare returns a 308 redirect to `/display`. Output now opens that canonical route immediately, then requests screen details and moves/resizes to an extended screen when permitted. Denial leaves output usable with a manual-placement message. The output document reports successful connection to the operator.

Worker v29 normalises redirected responses and maps clean page routes to their cached HTML counterparts. Base Mode prepares KJV, operator/output assets, fonts and hymns first, reports explicit readiness, and does not contact the cloud client. Extra Bibles/lexicon are fetched and cached when used; already cached Bible reads do not initiate background downloads. Device-only Local Mode also avoids cloud initialisation.

Validation: **44 automated checks passed**. In an actual browser on loopback, the offline indicator reached Ready offline. Then the preview server was stopped: the operator reloaded with 66 books, both `/display.html` and `/display` reopened from cache, and Quick Go changed output from Genesis 1:1 to John 3:16 without the server. Extended-screen placement was exercised with synthetic screen details and denial tests; actual projector positioning remains a user hardware check. Published as `f5e829d` to GitHub and Cloudflare production (`https://c6e98e47.kogg-presenter.pages.dev`). In the live browser, Base Mode reached Ready offline, the operator reported Output connected, and John 3:16 appeared in the output. Reopening the exact previously failing `/display.html` address under the active worker also rendered John 3:16 successfully.

The current service queue still needs explicit cloud portability work; named plans sync today. A standalone offline distribution remains future work.

## Base content correction — 30 October 2026

Per the user’s clarification, worker v30 prepares KJV, BSB, KJV Strong’s, its word lexicon, output assets and the bundled starter hymns. WEB and ASV are excluded from initial preparation. Readiness reflects the three Bibles. The hymnary requirement remains pending the user's choice of hymnbook/edition or a defined traditional collection; the existing 34 hymns are still explicitly labelled starter content.

Publication status for the Base content correction: commit `7789205` pushed to GitHub. Cloudflare production deployment failed twice because `api.cloudflare.com` / `dash.cloudflare.com` could not be resolved. Its last verified production release remains the prior output/offline fix. The three-Bible change is not yet confirmed on the Cloudflare production URL.

## Traditional hymnary and three-tap Scripture — 30 October 2026

Preserved the user's latest layout and direct-to-screen edits. Finished removing calls to the deleted Scripture preparation function: clicking a search result or selecting a downloaded Bible presents immediately; keyboard arrows select a search result and Enter presents it.

Verified the existing basic pack contains 300 unique traditional hymns and the optional expansion adds 262 more (562 total). Reinstalling either pack keeps saved edits and avoids duplicate first lines. Basic installation now records the pack version consistently, including manual retry; initial download failures show a retry message. Worker v32 caches the pack catalogue and carries downloaded optional packs forward before removing old caches, so the expansion survives offline upgrades. Credits remain in data/hymnary-sources.txt.

Requested Bible roadmap: NIV and NLT in place of ASV/WEB in the preferred menu; NKJV, Amplified, ASB (edition to clarify), The Message, and Efik as additional choices. Full texts have not been added or relabelled: publisher-approved distributable sources are still needed. Focus for this change is the hymnary, as requested.

## Dock controls and requested Bible choices — 30 October 2026

Replaced WEB/ASV in the preferred translation selector with NIV/NLT, explicitly disabled until approved text is connected. Added NIV, NLT, NKJV, Amplified, ASB (edition to confirm), The Message and Efik to the requested catalogue; available public-domain downloads remain separately labelled. No translation text was renamed or fabricated.

Fixed projector dock flex sizing: version chips have reserved space above scrollable passage text, footer buttons wrap, and comparison content scrolls. Added Docks → Rearrange docks to clear a saved layout lock. Dock dragging now recalculates positions as it moves instead of holding stale explicit grid rows; pointer cancellation cleans up the drag. Worker v33 refreshes the changed assets. Validation: 50 automated checks passed; physical pointer dragging and screen-size visual checks remain to verify in-browser.

## Balanced seven-dock layout — 30 October 2026

Replaced content-dependent row sizing with two equal default bands. Top: Books, Chapters, Verses, Memory (three columns each); bottom: Quick jump, Whole-Bible search, On the projector (four columns each). Explicit column placement preserves order. Removed all Span buttons and their handlers. Corner resizing now adjusts both width and row height. Layout migration v7 resets old hidden/order/size/lock preferences once, including the already-read size state, so the requested default appears on loading. Corrected the content-fit algorithm to find the largest fitting scale rather than overshrinking content during reflow.

Validation: 52 automated checks pass. Actual browser at 1280×720 showed seven docks in the required 4/3 order, equal 207.5px row heights, every dock body within its boundary, and no Span buttons. Mouse corner dragging changed the projector width. The base Bibles and hymnary reached Ready offline. Requested licensed Bibles remain unconnected: user confirmed no API.Bible account yet; account and applicable translation access are still needed, not a missing text-credit label.

## Readable projector passage and responsive layouts — 30 October 2026

Kept the desktop four-over-three order and saved layout preferences. Removed Previous passage, Resume last reading and Compare controls and handlers. Bookmark remains in the dock header. Projector text is no longer transformed/scaled or limited to a fixed 90px box: it fills the available body with readable 16px text, and Bible version switches sit below it in an independent footer. Desktop now uses the previously wasted lower workspace.

Tablet portrait/landscape and short landscape displays use two natural-height columns with a full-width projector; phones use one column. Compact views clear all desktop row/column placements, preserve dock order, keep readable unscaled controls, and scroll naturally. Desktop corner resizing remains available; compact views use responsive sizing rather than drag handles. Rotation/resize uses the existing resize observer and fit scheduling.

Validation: 55 automated checks pass, including phone/tablet/short-landscape reflow and removed control checks. Actual desktop browser confirmed unscaled passage text and translation footer below the passage; sample John 3:16 renders in the enlarged area. Physical tablet/phone testing remains useful; the browser tooling does not provide device emulation.

## Guided Quick jump — 30 October 2026

Quick jump now completes a unique book prefix after three letters, prioritising name prefixes so Joh resolves to John rather than numbered John letters. Ambiguous prefixes offer clickable choices; numbered books remain supported. Right Arrow, Tab or Enter accepts a book and advances a typed chapter to the verse position. A 650ms typing pause adds the colon automatically, allowing multi-digit chapters to be entered first. A visible chapter/verse-range hint guides keyboard and touch users. Deleting text and editing mid-input do not trigger unwanted completion. Typing a verse no longer publishes after a timer: Enter displays the selected verse/range; voice input remains an explicit display action.

Validation: 60 automated checks pass, including numbered books, ranges, invalid references, multi-digit chapter auto-colon, deletion and Enter-only display. Actual browser verified Joh → John, John 3 → John 3:, and John 3:17 remaining off-air until Enter, then appearing in the projector dock. Worker v36 carries the new UI offline.

## Scripture checkpoint before Lyrics — 30 October 2026

Chapter and Verse navigation footers now live outside their scaled content and stay anchored at their dock bottoms. Browser verified both button rows fully visible, 10px from the dock edge. Existing dock arrangement is preserved.

Microphone input only: confirmed no audio-file/music playback feature exists. Tested Quick jump and Whole search with simulated recognised speech. Found and fixed number-word parsing that merged "three sixteen" into "nineteen". Added readable microphone error messages; continuous listening stops on capture/network/permission failures rather than silently restarting, and Stop updates the buttons immediately. 62 automated checks pass. Real microphone capture and browser speech-service availability require an actual device test; simulated recognition verifies app handling, not hardware recording. Chrome/Edge may require internet for recognition.

Saved checkpoint: Scripture UI work is parked. Next focus is the Lyrics deck and the existing 300-hymn basic collection plus 262-hymn expansion. Requested Bible integrations remain pending API.Bible account access. No audio playback is planned; keep the app lightweight.
