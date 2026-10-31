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

## Free scripture sources — 31 October 2026

Searched for free/open sources for the seven requested translations. NIV, NLT, NKJV, Amplified
and The Message have no free source: they are copyrighted and the public-domain repos exclude
them. Efik: the 1868 Goldie/Robb text is public domain but exists only as archive.org scans (the
1985/1989 editions are copyrighted); a digital text still has to be produced. ASB edition remains
unconfirmed. The More Bibles "text needed" buttons now show an honest per-version status
(`js/app.js` reads `requestedBibles[].status` from the catalogue).

Added three complete, freely licensed English volumes (66 books each, converted with the new
`tools/bible-convert.cjs` from the nigelmsipa/public-domain-bibles plain-text sources):

- `LSV` — Literal Standard Version 2020, released to the public domain ("no rights reserved").
- `BBE` — Bible in Basic English 1949, widely redistributed (licensing should be verified per
  jurisdiction before relying on it).
- `ERV` — English Revised Version 1885, public domain; the classic 17 "omitted in ancient
  authorities" notices (e.g. Matthew 17:21) mean those verse numbers are genuinely absent, which
  the app shows as empty slots — same handling as WEB's Romans 16:25–27 gap.

- Registered in `data/content-catalog.json` (More Bibles downloads) and in `sw.js`
  `OPTIONAL_ASSETS`, so a downloaded copy survives offline worker upgrades; cache bumped to v40.
- Left out: `OEB` (Open English Bible, CC0) — its free text covers only 44 of the 66 books, so
  it cannot satisfy the app's 66-book shape.
- Tests: `node --test tests/*.cjs` → 83 pass, 0 fail, including the new `tests/free-bibles.cjs`
  shape and John 3:16 wording checks. `node --check` clean on sw.js, app.js and the converter.
- Uncommitted at session end: the user's own output-screen scripture-enlargement edits plus this
  bible work await a commit decision.

## Licensed Bibles go live online (NLT + API.Bible) — 31 October 2026

Copyrighted translations can no longer be "text needed" only: they now stream live, chapter by
chapter, into session memory via official, non-commercial church APIs. Nothing is downloaded,
hosted or persisted — true offline independence stays with the bundled/public-domain Bibles.

- New `js/bible-providers.js`: canonical 66-book tables (names/USFM codes/chapter counts ≈1189
  chapters) build zero-network skeleton Bibles (`connected:true`), so the Books/Chapters docks,
  Quick jump and Whole-Bible search stay responsive before any fetch. `ensureChapter()` fetches
  on demand with a pending-promise dedupe; fetched chapters live only in session memory. NLT
  runs key-free through Tyndale's api.nlt.to (50 verses/request → consecutive windows until the
  API runs dry, so Psalm 119's 176 verses arrive over four requests). API.Bible versions
  (NIV/NKJV/NASB/CSB/AMP/MSG) stream through the operator's own free api-key; the Starter plan
  licenses up to three translations and `resolveApiBibleId` caches the resolved bible id per page
  life. Errors are explained to operators (unreachable, unlicensed 403, missing key).
- `js/app.js`: `loadBible()` takes the connected path from skeletons; `fillVerses()` fetches and
  renders on demand; `validScriptureRef()` allows unfetched provider chapters; `goLiveScripture()`
  awaits the chapter then recurses. Whole-Bible search over a connected version covers what is
  already in session memory and says so.
- Tools → Licensed versions: paste the API.Bible key (device-local only), pick up to three
  versions. The translation select gains a "Connected (online licensed)" optgroup built at boot;
  NLT appears always, API.Bible choices once a key is saved.
- `sw.js`: `js/bible-providers.js` precached; CACHE bumped v41 → v42 for already-cached devices.
- Fixed during the work: NLT footnotes are *nested* spans (`tn > tn-ref`), which orphaned
  alternate-wording text with a lazy strip; the cleaner now removes balanced span subtrees. A
  successful fetch formerly left its promise in the pending map, which could mask later
  refetches — success entries are now deleted too.
- Tests: new `tests/bible-providers.cjs` (12 checks: tables/skeletons, both parsers, window
  chunking, key/licensing errors, parallel-caller dedupe) → whole suite `node --test tests/*.cjs`
  = 106 pass, 0 fail. Live probes against the real NLT API: John 3 → 36 clean verses
  (footnotes gone), Psalm 119 → 176 verses over four windows. API.Bible live chapter flow needs
  the operator's key and is covered by mocked tests meanwhile.
- Legal note kept: NIV/NLT/NKJV/Amplified/The Message remain copyrighted; The Message's official
  live terms still need verification before it is offered as a choice.

Release — same session:

- Pushed `61f2268` + `32d1d50` to GitHub `origin/main`. The second commit tracks
  `data/hymns-combined.json` (catalogue v4's "Complete basic hymnary", 562 hymns) after
  converting it from UTF-16 LE to UTF-8 — the pack reader decodes UTF-8 only and would have
  rejected the original bytes.
- Production deploy succeeded via wrangler 4.78 (`d0196abe.kogg-presenter.pages.dev`, production
  alias `kogg-presenter.pages.dev`). The staging copy excluded `.git`, `.wrangler`, `tests`,
  `tools`, the internal `work/` scratch folder, stray `data/hymns-basic.json` and `*.md`.
- Verified live on production: `sw.js` at v42 with `bible-providers.js` precached, the Connected
  optgroup and Tools licensed panel present in `index.html`, LSV/BBE/ERV + combined hymnary
  serving, and excluded paths return only the operator-page fallback, not their files.
- API.Bible note: users set their own key in Tools; NLT streams key-free immediately.

## Centered short output passages — 31 October 2026

Fixed output text sitting near the top of an 88vh box. Added a separate inline-content container inside a vertically centered flex box, preserving word highlighting and line breaks. Fit logic measures the content against the padded safe area. Short Scripture may enlarge up to 1.6 times the selected size (bounded by 12vh); long Scripture still shrinks to fit. Lyrics retain the selected font-size upper bound. Resize/font loading continue to trigger a fresh fit.

Validation: 63 automated checks pass. Actual browser showed John 11:35 (Jesus wept.) at approximately 80.6px, with content center at y=360 on a 720px-high output, without clipping. Scripture checkpoint saved; Lyrics is next.

## Lyrics deck implementation — 31 October 2026

Replaced the stacked song form and generic third-party webpage fetcher with Find → Paste/Edit → On the projector docks. Paste one empty line between slides; headings become labels. Added clickable numbered cards, visible LIVE state, Previous/Next and existing keyboard navigation, split/merge/reorder/duplicate/delete, Undo, crowded-slide warnings, optional four-line splitting, and reusable section order chips. The paste panel can fold away for quick slide access. Saved/library songs can be opened or displayed directly; duplicates are detected on save. No media player, framework, package installation or extra runtime was added.

Storage: Base songs and drafts use sessionStorage, and its temporary Service items survive reload in that same session while staying out of cp_service, named plans, backup exports and cloud sync. End session clears temporary songs/draft/queue and blanks session lyrics; existing saved libraries and hymn packs are preserved. New sessions cannot resume expired Base content. Local saves songs/order/source credits for offline use. Sync uses the same local-first save plus the existing account sync. Local/Sync unsaved drafts stay device-local. Cloud library application preserves temporary queue items separately. Removed the old automatic last-Scripture startup command, which could replace a live lyric on refresh.

Sources: added LRCLIB title/artist search with validated plain-lyrics results, duplicate result filtering, cancellation, 15-second timeout, offline/error fallback, and retained provenance. Live browser search for Amazing Grace returned real source results. SongSelect integration is downloaded plain-text import (not a connected account API); pasted/file lyrics keep supplied copyright/CCLI credit lines outside the projected lyrics. Source links added to the landing page; no publisher endorsement or blanket rights grant is claimed.

Validation: 76 automated checks passed, including paragraph parsing, headings, section order, slide editing, source validation, duplicate detection, local/sync storage, session isolation/refresh/end, existing library preservation, XSS escaping, online failure recovery and metadata sync. Actual browser verified paste → three cards → direct Chorus display, LIVE marker, draft/queue persistence, live lyric surviving reload, successful LRCLIB search, and delivery to a separate output window. Stopped the local preview server, reopened cached operator, and Next still updated output to Verse 2. Physical phone/tablet visual testing and a signed-in two-device sync exercise remain useful; no new account was created or messages sent.


## Wider lyrics search and no-account web fallback — 31 October 2026

Kept the Lyrics deck structure. Connected LRCLIB plus lyrics.ovh/Deezer suggestions, with deduplicated title/artist results and lyrics fetched when a suggestion is selected. Added a normal Google search link and a collapsed source-link import. No Google results scraping or Brave account was created: Brave requires a payment card even with monthly free credits, so the user selected the no-account fallback.

Added a small Cloudflare Pages function for source requests and imports. It accepts only fixed LRCLIB/lyrics.ovh API links and Hymnary text pages explicitly marking their text Public Domain. Tune/page notices cannot authorise copyrighted text. Imports preserve stanzas and source credits while excluding page furniture and source notes from slides. Redirects, custom ports, credentials and unrelated hosts are rejected. Request time/size bounds apply; Hymnary requests are spaced five seconds per server instance. API responses are no-store and bypass offline cache interception. Static-only hosting keeps direct browser source search and Google links; page import needs Cloudflare.

Validation: source adapter and endpoint tests cover partial outages, metadata lookup, URL restrictions, text-specific copyright checks, markup line breaks, Google URL encoding and API cache bypass. A real Hymnary Amazing Grace page produced six stanzas with separate source credits. Wrangler compiled the function successfully. Unrelated concurrent Bible files/catalogue/notes were preserved and excluded from this release.


Live Cloudflare verification identified an edge-runtime difference: fetch does not accept redirect="error". Replaced it with manual redirects plus explicit rejection, added a regression check, and advanced the offline worker to v41. No redirect targets are followed.


Live verification completed on Cloudflare production after the redirect correction: combined Amazing Grace search returned both LRCLIB and lyrics.ovh results; importing the supported Hymnary page produced six section/slide cards and retained source credits. The current projector remained unchanged. Deployment: https://61ef27f2.kogg-presenter.pages.dev (production alias kogg-presenter.pages.dev). No Brave signup, card entry or paid search plan was used.


## Landing page refresh and project review — 31 October 2026

Reviewed the committed Scripture, Lyrics, connected Bible providers, hymn catalogue, offline worker and recent changes. Replaced the outdated landing page with a responsive editorial design, light/dark appearance, keyboard-accessible previews, an editable blank-line lyrics demo, a three-mode connection explorer, device-specific browser-install instructions, current release notes and practical FAQs. Copy reflects three offline core Bibles, 300 included hymns plus 262 optional, session-only Base lyrics, saved Local/Sync libraries, connected translations and the no-account Google search fallback. Removed unsupported native-download and old account claims. Source credits remain available.

Landing interactions are isolated from operator storage, auth, projector and work-mode selection; only appearance is stored under a landing-specific key. Reuses local font and existing lyrics parser, adds no package or external runtime, and loads real KJV only on preview interaction. New assets are precached in worker v43.

Validation: 106 automated checks pass. Browser verified both appearances, real John 3:16 preview, editable lyrics splitting and card selection/reset, Sync/offline explanation and iOS instructions. Longer hero passages use a smaller type size with protected label spacing. Phone/tablet breakpoints implemented; physical-device checks and signed-in two-device sync are still outstanding. Lyrics interface simplification remains the next product refinement.


## Official landing branding restored — 31 October 2026

Restored the original Nunito Sans Expanded font definition and blue palette across the refreshed landing page, including headings, buttons and preview accents. Kept the current layout, demos and accurate product updates. Offline worker advanced to v44.


## Stage-inspired landing motion and texture — 31 October 2026

Added blue projected-light beams, a fine grid and embedded grain texture, animated headline light, a service-flow signal, scroll reading progress, once-only section reveals, pointer-responsive preview lighting/tilt, slide transitions and button/card responses. Refined both light and dark blue surfaces while preserving Nunito Sans Expanded. Added a decorative-motion pause control; reduced-motion preferences disable effects automatically and keep content visible. No animation library, video, external asset or runtime dependency added. Worker v45.

Validation: 106 checks pass; browser verified both themes, textured hero and section flow. The preview browser requests reduced motion, and correctly received the static, fully visible version. Full-motion effects are implemented through CSS and bounded page events; physical-device motion/performance verification remains outstanding.


## Landing light/dark contrast correction — 31 October 2026

Fixed pale Scripture book chips inheriting white text in dark mode. Separated button fill from theme text accent so white button labels keep a sufficiently dark blue background in either theme. Strengthened muted copy, placeholder text, control outlines and selected states; made dark preview/update panels use explicit light text independent of page theme. Darkened the light-theme headline gradient and increased small preview/chip label sizes. Offline worker v46. Browser checked theme toggles and Scripture controls; flat-background text contrast spot checks were performed, excluding translucent/gradient surfaces from the simple numeric scan.


## Complete extended-screen output follow — 31 October 2026

Reviewed OpenCode commit 0bf7848. Removed competing placement between operator and popup, identity-based screen comparisons, invalid display-count media queries, and incorrect fullscreen exit calls. Operator now places its popup using coordinates, retries after output-ready navigation, watches screens/current-screen changes, handles late connection/reconnection, and avoids repeated moves for unchanged geometry. Fullscreen exit is awaited before moving. Clear status explains permission/manual fallback and Extend display mode. Standalone output keeps a stable target rather than alternating away from its own current screen; an existing permission grant is reused without an unsolicited prompt. OBS overlay remains excluded. Worker v57.

Validation: 110 tests pass, including new late attachment/reconnection, idempotent screen events, fullscreen exit order, standalone target stability and operator/popup ownership tests. Browser screen permission and actual two-monitor hardware placement/fullscreen still need physical-device confirmation. Opening a popup requires the Output click; automatic screen placement requires a supporting browser and user-granted window-management permission.


## Smooth hero and Kingdom partnership — 31 October 2026

Replaced conflicting hero autoplay/synthetic tab clicks and heavy repeated blur effects with a stable stage and cancellable native text/screen arrival transitions. Local sample scenes need no Bible fetch; only manual Scripture lookup loads the real KJV. Autoplay pauses while offscreen, tab hidden, hovered, keyboard-focused, manually paused or reduced-motion requested. Reduced-motion status is now visible instead of silently hiding the motion control. Fixed reveal-delay units and aligned scene indicators with four scenes.

Added a church partnership section: KOGG serves the Body of Christ, seeks to resolve longstanding Scripture-display friction and is part of further church-focused work. Invites use/feedback, sharing, skills/resources and financial support with confident mission-led language. Share uses native sharing or copies the public link; GitHub feedback/partnership links open drafts, with public-privacy notice. No payment collection or invented contact details. Worker v58.

Validation: 112 checks pass including hero local-scene progression and reduced-motion/focus/hover/offscreen pauses. Fresh visual QA unavailable because the browser tool could not start its local assets; no visual check claimed for this release.


## Direct ministry contact and current OBS guide — 31 October 2026

Added email partnership/feature-request links to koggpresenter@gmail.com and a WhatsApp developer-team button using the supplied Nigerian number, without displaying the number as page text. Invites churches to request specific features. Replaced public GitHub partnership enquiry as the primary contact route.

Added an OBS Scripture Browser Source guide with local bridge prerequisites, separate local presenter origin, copyable overlay URL, canvas sizing, opaque/transparent options and troubleshooting. Guide follows the implemented relay and official OBS Browser Source properties. Clarifies the website and OBS do not share browser storage; a same-computer bridge is required. Added coming-soon fuller OBS workflows for Scripture, lyrics and alerts without removing existing output capabilities. Worker v59. Validation: 112 tests pass. Browser preview remains unavailable from the preceding tool failure; actual OBS/visual verification not claimed.


## Single output and persistent fullscreen clicks — 31 October 2026

Repeated Output clicks reuse/focus the existing popup without renavigating it, preserving its live state and fullscreen. Added an origin/profile-scoped Web Locks guard for ordinary output documents so a competing output remains hidden and its script-opened duplicate closes. OBS overlays are intentionally excluded. BFCache restoration reloads to reacquire the lock. Unsupported Web Locks browsers still use the existing named-window reuse; separate browsers/profiles/origins cannot be globally coordinated by a website.

Output clicks enter fullscreen only, never toggle out; Esc/browser controls retain exit. Operator requests fullscreen after placement and on reuse; output attempts it after acquiring its exclusive role. Rejected automatic fullscreen requests are caught, leaving the one-click fallback. Landing explains Chrome/Edge screen-management permission, Extend mode, optional automatic-fullscreen availability and one-click/Esc behavior. No permission bypass or forced re-entry after Esc. Worker v60.

Validation: 115 tests pass, including popup reuse, no click-to-exit, duplicate guard suppression/notification and existing screen placement tests. Physical extended-screen and browser fullscreen/permission verification remains outstanding; fresh browser preview unavailable in this session.


## OBS ease-first options — 31 October 2026

Made capturing the existing Output window the recommended OBS route: Sources > Window Capture > KOGG Presenter — Output, with fit/crop/fullscreen guidance. No Node or bridge required for window capture. Kept transparent Browser Source with the local bridge as a collapsed advanced second option. Clarified these are separate OBS source types and Window Capture includes the output background. Updated FAQ and roadmap copy. Worker v61.


## Motion opt-in and screenshot carousel preparation — 31 October 2026

Fixed reduced-motion handling: visitors retain their OS preference by default, but Play motion now explicitly enables page animation for this visit, with Pause restoring stillness. Consolidated competing reduced-motion CSS blocks into one scoped rule so explicit opt-in works. Tickers now have two identical groups and continuous movement even on hover. Added prepared premium blue-glass gallery styling and an unshipped template under ignored work. Worker v62. Validation: 116 tests pass, including opt-in/play/pause with reduced-motion active.

Screenshot carousel NOT complete/published: both CUA and native Computer Use node runtimes fail before initialization (missing kernel assets path), including after reset. Older saved Scripture/lyrics/landing captures were inspected and show superseded content; no current mode-chooser image exists. Need four current screenshots from recovered capture tools or user attachments before installing the carousel. Do not represent old captures as current screenshots.


## Platform coverage and KOGG MEDIA attribution — 31 October 2026

Added Windows, macOS, Linux, ChromeOS, Android, iOS/iPadOS and other compatible browser devices to landing installation choices, with browser/device-specific capability qualifications. Added KOGG MEDIA (Africa) developer attribution and the user-supplied vision of effective worship and broadcast worldwide. Copied the supplied logo unchanged into icons/kogg-media.png and added a seamless horizontal contributor-logo bar; only KOGG MEDIA is named as confirmed founding developer, with an aria-hidden repeat for looping. No unconfirmed sponsor logos. Logo is precached; worker v63.

Verified git author labels: Ukeme Emmanuel Inyang-Otu, ukeme02 and local KOGG Presenter author. Discussion also confirms ZCode/OpenCode/Codex development assistance. Infrastructure and content-source credits must remain distinct from contributors/sponsors. Physical device coverage and fresh visual verification remain unverified; browser capture tools unavailable.


## Default landing animation — 31 October 2026

At the user’s explicit request, enabled decorative motion by default for every landing visit and removed the Play/Pause motion button. Hero playback continues to pause for hover/focus/offscreen/hidden-tab interaction. Updated tests for the new default. Worker v64. Screenshot slider remains blocked on four current captures: capture runtime still fails before browser initialization. Do not claim it is installed or reuse outdated screenshots as the current UI.


## Compact closing mission ribbon — 31 October 2026

Moved KOGG MEDIA recognition below the Ready for your next service card. Replaced the large isolated logo bar with a compact themed signature ribbon, smaller logo, horizontally drifting Join the mission link and shared-purpose tagline. Includes a fixed email CTA; duplicate loop group is inert/aria-hidden. Hover/focus pause lets visitors activate the moving link. No new partner names or assets. Worker v65. Fresh visual verification remains unavailable due to capture tool initialization failure.


## Dark-first landing and stacked wordmark — 31 October 2026

Landing HTML starts dark and initialization keeps dark as the default on each visit, with light toggle retained. Added stacked KOGG / Presenter wordmark to landing header/footer and operator header. KOGG prefers local Anurati; Presenter stays Nunito Sans Expanded. No Anurati font is present in repository/system/downloads; exact consistent web rendering remains pending a user-supplied appropriately licensed font asset. Official designer page currently labels the free download personal-use only. No font downloaded or purchase made. Current fallback is clearly documented; do not claim Anurati is bundled. Worker v66. Official icon/logo design remains next.


## Worship without limits and fast brand entrance — 31 October 2026

Applied official tagline to page title/social title, hero subtitle, both scrolling strips and closing mission ribbon. Replaced long feature tickers with equal-width repeated tagline groups and a soft passing light sweep. Reduced KOGG MEDIA logo to 88x34 desktop / 78x30 mobile and shortened strip span/spacing. Added a sub-second CSS-only wordmark entrance with no network/font/JS dependency and no click interception, plus reduced-motion no-JS fallback. Removed stacked hero entrance delays/heavy blur and shortened section reveals. Worker v67. Validation: 116 checks pass; visual QA remains blocked by browser capture initialization failure. Exact Anurati still pending font asset.


## Shared card finish, supplied lettering and responsive polish — 31 October 2026

Applied shared blue stage-card lighting, fine-pointer-only subtle depth and touch-safe static geometry to major/demo cards. Reflowed tablet library/setup grids and phone mode choices, sized key touch controls, tightened vertical rhythm, protected narrow text/code and constrained hero width.

Used the KOGG lettering from the supplied KOGG MEDIA artwork through a self-contained cropped SVG viewport (original artwork embedded unchanged); this reproduces the supplied lettering consistently without pretending an Anurati font file is installed. Presenter remains Nunito. Added a blue book/cross/light icon direction in the app/favicon/maskable SVG assets. Rendered and inspected the wordmark and icon as PNGs using bundled Sharp. Full-page visual/physical phone/tablet QA remains unavailable. Worker v68; 116 automated tests pass. Screenshot carousel still needs current captures.


## Monogram exploration and performance-first step flow — 31 October 2026

Created three original SVG monogram directions under docs/branding and rendered a comparison sheet (work/monogram-exploration.png). Current icon retained pending user selection; balanced existing symbol/wordmark arrangement in header/footer/operator with centred Presenter subtitle and mobile sizing.

User reported site hangs. Replaced perpetual feature tickers with a three-step flow, manual Previous/Next and short opacity/translation transitions. Auto steps run only onscreen and pause for hover/focus or hidden tab. Removed per-pointer geometry reads/style writes, perpetual card sheen, huge blur/conic layers, background drift, fact bobbing, repeated glows and header backdrop blur. Mission ribbon is stationary and retains its compact CTA. Scroll progress writes directly to its own transform instead of inheriting a document-wide custom property. Hero retains its bounded visibility-aware alternating scenes. Worker v70. No claimed performance measurements: browser runtime remains unavailable and hardware retest required.


## Restore motion and restructure landing into chapters — 31 October 2026

Corrected interpretation: user wanted less continuous page length, not less animation. Restored continuous tagline tickers, compact moving mission ribbon, hero/card lighting/depth, ambient effects and pointer responses. Removed the temporary three-message strips and performance overrides. Retained the direct scroll-progress transform improvement.

Added seven chapter views with sticky, horizontally scrollable navigation and Previous/Next controls: Welcome; Explore; Screens & OBS; Work modes; Updates; Get started; The mission. Only the selected chapter’s top-level sections show, while internal content remains ordinary scrollable HTML. Existing anchor links, direct hashes and Back/Forward select the right chapter; without JavaScript the full original content is available. New chapter behavior test plus existing checks: 117 pass. Worker v71. Current icon and monogram concepts unchanged. Fresh browser/physical-device QA still unavailable.


## Vertical story rail experiment — 31 October 2026

Moved the seven chapter tabs out of the top stack into a fixed left-side rail with connected numbered markers, narrative titles, short captions and active-step treatment. Added offset content widths so hero/cards/footer stay clear of the rail. Below 1000px, a compact bottom-side Our story control opens a vertically stacked guide, with current-step label, outside-click/Escape dismissal and close-on-selection. Simplified top links to Help/setup, Our mission and Contact. Existing continuous animations, anchor/back navigation and Previous/Next chapter links retained. Worker v72. This is an isolated reversible layout experiment; previous chapter-top layout at 4b1b6ec, earlier continuous-page baseline at 1269e5a. No full-page visual QA available because capture tools remain unavailable.


## Continuous page with transient story guide — 31 October 2026

Restored the full continuous downward landing page and removed chapter hiding/Previous-Next controls/content offsets. Continuous hero, tickers, card effects and compact moving mission ribbon retained. Story rail is thinner, overlays without resizing content, starts tucked offscreen, glides in during scrolling and retracts after 1.35s idle. Hover/focus keep it available; link selection/Escape/mobile close dismiss it. Hidden guide is inert/aria-hidden, with an accessible keyboard reveal button. IntersectionObserver tracks the section in view. Added short reveal underline accents rather than another continuous background loop. Worker v73. Tests cover initial/scroll/idle rail states and active-section tracking without hiding content. Full-page visual and device performance QA remain unverified because capture tools are unavailable.


## Bouncing loader and draggable app constellation — 31 October 2026

Replaced story rail with a floating KOGG launcher and seven circular smartwatch-style chapter links. Launcher has a gentle idle bounce, pauses while hovered/focused/dragged, supports pointer/touch dragging, clamps to viewport, saves only its UI position, and moves inward before opening the circular app grid. Outside tap/Escape/close dismiss; labelled links and focus feedback remain. Continuous page and existing motion retained.

Wordmark loading animation now bounces with three dots until load completes, or a three-second JS/four-second independent CSS safety timeout; pointer interaction clears it too. No fake progress or dependency on a loaded font. Worker v74. Tests cover narrow-screen placement, drag limits/persistence, no accidental open after dragging, and Escape. Full visual/device QA remains unavailable.


## Polished curiosity orb — 31 October 2026

Removed the visible Explore tag under the floating launcher while retaining its accessible name. Added a glass-blue finish, restrained orbit ring/specular highlight and multi-hop bounce with randomized per-visit timing/direction/amplitude. Bounce stays close to the user-positioned anchor, limits upward travel near the viewport edge, and pauses for hover/focus/open/drag. No random full-screen roaming or animation library. Landing only; in-app widget functions deliberately deferred as requested. Worker v75. Fresh visual QA unavailable.
