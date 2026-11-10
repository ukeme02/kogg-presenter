# Repair progress - 3 November 2026

## Christian online sources and automatic imports

Release v104 adds Christian songs & hymns as the default online scope. Hymnary's documented CSV search returns source-labeled hymn candidates; selecting one imports its public-domain text into slides. Supported hymnal.net page links import MusicComposition structured lyric text, preserving stanza breaks and source credits. Existing LRCLIB/lyrics.ovh retrieval stays available under the explicit All music sources scope. A failed Christian search never silently queries general databases.

Google discovery follows the chosen scope: Christian mode restricts its link to Hymnary, hymnal.net and hymnlyrics.org; All music sources uses general search. Google results themselves are not scraped or automatically imported; supported source links are pasted into the importer. This is source-based selection, not a claim to classify every song's theology. Christian-only coverage can miss modern worship songs available in general databases. Musixmatch still requires API access and is not advertised as connected.

Validation: 198 checks pass; 38 relevant checks passed again after updating landing source credits. Verified live Hymnary CSV and public-domain page formats; live hymnal.net import returned Amazing Grace with four stanzas. Local DNS failures intermittently affect Hymnary probes. Imports enforce fixed host/path allowlists, reject redirects, limit responses and time out; structured content is parsed as data and escaped in the operator. User's untracked hymn file remains excluded.

## Responsive Lyrics and Notes repair

Removed fixed viewport heights that collapsed the two projector monitors. Both retain 16:9 frames with fitted text, references and tag/alert placement. Desktop uses three columns; tablets place the monitor above the editor beside the library; phones stack readable controls and a rectangular monitor. Compact Scripture docks discard desktop grid spans. Docks settings now use a native modal dialog with opaque background, focus isolation, Close and Escape.

Bible search is isolated in its own password-free search form with autocomplete/password-manager exclusion hints. Browser verification presented John 10:16 from remembered words without sign-in. Third-party password-manager overlays cannot be universally controlled by site markup; the original reported prompt was not reproduced.

Lyrics search separates local results from online sources, labels offline hymns/session/saved songs, and offers a local filter. Online results distinguish lyrics-ready records from unverified title matches. Fetches have individual deadlines and title lookup races two sources, so one slow source does not block available lyrics. AZLyrics and Musixmatch website links are available for manual copy/paste, not automatic imports; authenticated Musixmatch API integration remains a separate connection requirement.

Every lyric slide has Quick Edit, preserving repeated order and requiring an explicit Display to update output. Notes adds text import/export and Ctrl/Cmd+Enter to display. Notes previews include underlying live Scripture/lyrics when showing a tag or alert. Existing bullets, splitting, live typing and yellow emphasis remain.

Validation: 193 automated checks pass. Browser widths checked: 320, 390, 820 and 1440 pixels. No horizontal page overflow at the measured phone/tablet widths. Verified modal behavior, Bible search, offline hymn display, quick editing, Notes bullets, and 16:9 monitors. Browser console had no warnings/errors in the final local check. Evidence is in docs/deck-evidence-2026-11-03. These are browser viewport tests, not physical iOS/Android tests. Final cross-deck fix moves the modal outside the hidden Scripture tab; 63 relevant checks pass afterward, and opening/closing it from Lyrics was browser-verified. Release cache v103 supersedes v102.

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

Release: seven repair commits, through 3b6783d, pushed to main. Cloudflare Pages reported successful production deployment at https://b736754b.kogg-presenter.pages.dev (v101). First deploy attempt failed DNS; retry completed successfully. Independent public URL smoke testing was blocked by local DNS/navigation failures, so public reachability remains unconfirmed from this machine. Local previous-install upgrade to the final release was confirmed after closing every client: A-minus changed output 63.6342px to 60.099px immediately. For existing users, close every KOGG app and Output window/tab, then reopen online after service.

## 4 November 2026 — Slides deck and bounded desktop Lyrics (v105)

- Added Slides between Notes and Service: service-moment presets, custom titles, ordering, deletion, one-tap display and whole-deck navigation.
- Uniform styling shares background, image, darkening, font, colour and size; free form restores each slide's own saved design. Manual text sizing still shrinks to fit; optional maximise fills available space.
- Design and live monitor views retain 16:9 proportions. Edits do not mutate already-live output or saved Service copies. Uploaded images use the existing resizing/IndexedDB path.
- Drafts persist per tab in Base, per device in Local/Sync. Adding slides to Service includes their theme and background in existing named-plan, backup and cloud-library flows. Extended library validation for text service items. Draft workspaces themselves are not cloud-synced.
- Desktop Lyrics uses main's available height at >=1001px width / >=601px height: search, editor, order and projector panels remain within the screen. Long content scrolls inside panels. Grid rows retain full card height instead of compressing into lines. Smaller screens use responsive flowing layouts.
- Fixed Local mode entry showing an empty overlay: the Local continuation panel is now explicitly revealed.
- Landing update cards describe Slides and the desktop Lyrics layout. Offline cache v105 includes both new scripts and regenerated content hashes.

Validation: 205 automated checks passed. Browser checks covered 1440x900, 1280x720, 1024x640, 768x1024 and 390x844; no horizontal overflow at tablet/phone sizes. Thirty lyric slides stayed within the desktop deck with internal scrolling. Verified preset display, free-form style change, image upload/remove and design/live views. Local-mode entry now opens and closes normally. Output reported connected; physical extended-display placement was not re-tested. Local draft testing used a separate origin; the user's untracked data/hymns-basic.json remains untouched.

Evidence: work/slides-desktop.png and work/lyrics-desktop-fixed.png (local ignored screenshots). Existing installations must close all KOGG app and Output clients and reopen online to activate the update safely.

## 5 November 2026 — Notes repairs and clearer deck controls (v106)

- Notes templates select the correct format immediately, with a 10-step draft undo rather than a blocking native confirmation. Undo never changes live output and clears on a mode switch.
- Visible bullet editing and Enter continuation; empty bullet markers do not create phantom points. One-point-per-slide and grouped splits retain auto-fit and existing emphasis.
- Preview and Output have a continuous, initially visible scrolling alert with slow/normal/fast and explicit static mode. Explicit ticker motion is independent of reduced decorative motion. Track nodes survive unrelated rerenders; alerts reserve room above the reference label.
- Separate Stop alert / Hide name tag / Hide note slides actions preserve the other output layers. Contextual Notes controls and bounded desktop layout reduce clutter.
- Lyrics library and online panes are separate. Search stays visible while results scroll. Display / Save / Service are primary; extra editing and order tools are disclosed on demand.
- Landing release descriptions updated. All-deck recommendations and implemented scope recorded in docs/DECK-USABILITY-2026-11-04.md.
- Validation includes actual Output DOM markers and movement, template switching, tags, split navigation, static/stop behavior and responsive layouts. The user's untracked data/hymns-basic.json remains untouched.

Final validation: 209 automated checks passed. Browser evidence: work/notes-repaired.png and work/lyrics-simplified.png. Live Output checks confirmed semantic bullets, name tags, slide navigation, moving/static/stopped alerts and reference-label clearance.


## 6 November 2026 — Stream deck, typing-to-jump and organized Tools (v107)

- Scripture: letters and numbered-book prefixes focus Quick Jump and reveal it if hidden. Editing fields, IME composition, modal dialogs and command shortcuts are respected. Alt+B / Alt+L retain Blank / Logo access.
- Stream follows Service. Capture guidance for OBS, YouTube, Facebook, StreamYard and other platforms; optional local-bridge Browser Source URLs for full, transparent and graphics-only feeds. This supplies visuals, not an encoder or remote broadcast start/stop control.
- Now-ministering, speaker, welcome and announcement templates; banner/minimal/spotlight designs, position, size and accent controls. Notices have scrolling/static modes and speed. Countdown controls moved here from Tools.
- Draft edits require Show to affect output. Base drafts are session-scoped; Local/Sync drafts stay on this device. Tags and alerts share the Notes output layers. No independent projector/broadcast layout yet.
- Bridge health check supports retry and reports reader count without claiming that readers are necessarily OBS. Fresh installs no longer report an empty bootstrap as a failed connection. Logo style is included in bridge output settings.
- Tools has four selectable categories: Account & Sync, Bible versions, Backup & voice, Output & help. Stream has bounded desktop panels, responsive tablet/phone flow, and a 16:9 preview with resizing observation.
- Active name tags reserve output space above them; the shared preview also keeps passage text above the tag. Countdown input is bounded to 1–120 minutes.
- Landing updates describe the delivered features and next independent broadcast layouts. Offline release v107 includes both Stream scripts.

Validation: 218 automated checks passed, including measured live-tag clearance and reset. Browser checks at 1366x768, 820x1180 and 390x844 covered typing-to-jump, templates, show/hide, scrolling notice, Tools categories and light/dark mode. Local bridge with a separate output reader confirmed transparent background, graphics-only filtering and live notices. Screenshot: work/stream-deck-v107.png. Final browser recheck on 6 November was unavailable because browser use was disabled in Work settings; automated regression and deployed-file checks remain available. Hardware OBS capture and an actual broadcast were not performed.

Next priorities: independent broadcast/projector layouts; a packaged local bridge that avoids a Node setup; then a phone remote and service rehearsal/recovery controls. The user's untracked data/hymns-basic.json remains untouched.


## 6 November 2026 — Browser-first landing story and voice roadmap (v108)

- Reframed the hero around “Your browser. Your worship desk.” and the practical benefits of opening without an account, preparing offline essentials, and carrying a synced library to another device.
- Added an eight-deck feature directory using native expandable cards, including Scripture, Lyrics, Notes, Slides, Service, Stream, Themes and Tools. Condensed release notes avoid repeating the full feature list.
- Prominent current voice-input section explains reference lookup, remembered-word search, commands and microphone on/off feedback. Decorative waveform does not access a microphone.
- Minister-listening AI is explicitly planned, with a proposed suggest/review/display flow, no release claim, and a feedback email link. Added it to the roadmap.
- The “first ever browser presentation tool” claim was not published: GoSlide's own app page confirms an existing browser controller. Marketing emphasizes verified KOGG capabilities instead.
- Preserved the original font, blue palette, existing motion and interactive previews. No new scripts, libraries or external requests; native disclosures work without JavaScript. Tablet navigation collapses earlier to accommodate feature and voice links.
- Validation: 15 targeted landing/offline checks passed; HTML nesting, unique IDs and section anchors checked. Browser-based visual recheck unavailable because local browser use is disabled in Work settings. No current-layout screenshot claimed.


## 6 November 2026 — Interactive eight-deck landing tour (v109)

- Replaced the two-tab demo with a single eight-deck workbench: Scripture, Lyrics, Notes, Slides, Service, Stream, Themes and Tools. Moved it immediately after the hero facts/service flow, with a clear Start presenting action.
- Removed the duplicated eight-card feature directory. Its navigation anchor now opens the tour. Existing blue palette, Nunito wordmark styling, hero motions, ticker, Explorer and voice roadmap remain.
- Scripture retains real lazy-loaded KJV book/chapter/verse and reference lookup. Lyrics retains actual blank-line parsing and selectable slides. Added editable bullet notes, service-moment titles/backgrounds, a three-item service queue, explicit Show/Hide name tags, theme/font/size controls and a guided Tools category explorer.
- Samples are local page state only: no storage, account handling, microphone access or output connection. User-entered text is inserted as text nodes. Keyboard arrows/Home/End move across all eight tabs without resetting edits.
- Responsive tour tabs use four columns on desktop/tablet and two on narrow phones; panels become a single column below 900px. Preview sizing observes its container and font readiness. No extra library dependencies.
- Validation: 20 targeted landing and offline checks passed, including five new behavioral tests. HTML nesting, section anchors and unique IDs validated. Browser visual inspection remains unavailable because local browser use is disabled in Work settings; no claim of a fresh screenshot or rendered-layout verification.


## 6 November 2026 — App-shaped landing previews and shorter copy (v110)

- Scripture tour mirrors the operator's four upper docks (Books, Chapters, Verses, Memory) and three lower docks (Quick jump, Whole-Bible search, On the projector), with bounded dock content and chapter/verse controls. Real KJV searches and recent-passage recall remain isolated from the app's library/output.
- Reworked tour chrome into eight compact deck tabs. Lyrics, Notes and Stream use their corresponding three-part workspace layouts; Lyrics slide cards sit beside the editor, with a separate rectangular output. Added selectable public-domain hymn samples and point templates. The remaining decks retain working previews with compact dock headings.
- Shortened the hero, feature benefits, voice, display, broadcast and partnership copy. Screen setup, OBS instructions, release notes, roadmap and platform details are native expandable disclosures. Preserved blue branding, the Nunito font, animated hero/ticker and floating Explorer.
- Responsive breakpoints rearrange Scripture into two columns on tablets and stack the lower docks on phones; three-part decks reflow without fixed page widths. Existing motion pauses offscreen.
- Validation: 44 targeted automated checks passed, covering all eight tabs, real Scripture lookup/search/history/navigation/retry, hymn switching, note templates, preview controls, JavaScript parsing and offline asset integrity. HTML nesting and section links checked. Browser visual QA was attempted but remains disabled in Work settings; responsive rendering has not been visually verified in this release.
- No added runtime library. The user's untracked data/hymns-basic.json remains untouched.


## 6 November 2026 — Restore visible landing-page sections (v111)

- Corrected v110's overuse of collapsed sections. Screen setup, current improvements, device support and roadmap now have visible cards with concise text.
- OBS now has two illustrated connection cards; detailed instructions expand within each card. Voice input shows its three-step flow immediately. FAQ and technical details retain disclosures.
- Restored section depth with spacious cards, two-column update/broadcast layouts and a responsive roadmap grid. Preserved app-shaped demos, existing animations, font and blue theme.
- Validation: 44 existing targeted checks passed. HTML nesting, anchors, unique IDs and visible main card grids checked. No browser-rendered visual verification: browser access remains disabled. Offline release v111 updates the changed assets.


## 7 November 2026 — Theme studio cleanup (v112)

- Replaced the mixed long form with keyboard-accessible Text, Background, Layout and Logo categories. Existing values and handlers are preserved; category changes do not save, apply or replace a draft.
- Theme selection/New stay above the editor. Destructive theme management is separated from styling controls. Logo remains a picker within its own category, with an explicit Send logo to output action.
- Preview keeps a 16:9 composition and fits sample text to its actual dimensions, including automatic/manual sizing and quick-edit scale. Save/Apply and status remain outside the scrollable editor. Layout reflows for smaller screens.
- Added a lightweight studio script to the offline shell. Landing release card reflects the delivered theme organization.
- Validation: 112 targeted operator, output, theme navigation/sizing, regression and offline checks passed. HTML nesting and retained control IDs checked. Browser visual verification was attempted but remains unavailable because browser use is disabled in Work settings.
- Recommended next: separate congregation/broadcast layouts, then phone remote control and service rehearsal/recovery. Minister-listening AI remains a later exploration.


## 7 November 2026 — Next build sequence

- [x] Stage 1: independent room/broadcast layouts, explicit graphics routing, source URL and preview; implemented and tested; publication tracked below.
- [x] Stage 2: paired phone remote, connection feedback and bounded controls; implemented and tested; publication tracked below.
- [x] Stage 3: private service rehearsal and readiness checks; implemented and tested; publication tracked below.

Preserve the lightweight browser/offline core. Each stage receives a separate commit and release. Browser visual inspection is unavailable until browser use is enabled in Work settings.

### Stage 1 implemented — independent broadcast layout (v113)

Stream → Layouts configures full-canvas or lower-third broadcast styling, a separate theme, and tag/notice routing. The normal projector retains its theme and full-screen composition. Browser Source → Separate broadcast supplies the dedicated transparent URL; the monitor switches between room and broadcast. Both feeds share passage navigation. Existing feeds retain their previous defaults. 117 targeted checks passed, including route isolation and invalid-input fallbacks; physical OBS and browser rendering remain unverified.

### Stage 2 implemented — paired Wi-Fi remote (v114)

Optional `--remote` bridge mode serves a phone controller with acknowledged Previous/Next/Blank/Resume. Pairing is laptop-only; random session links can be revoked. Explicit private-IP Host checks, same-origin checks, authenticated phone APIs, restricted phone assets, revision checks, deduplicated command IDs and a single operator connection bound the control path. Default bridge remains loopback-only. The operator shows network choices when multiple adapters exist. No account/internet is needed, but the laptop must run the optional Node bridge. Automated authorization, command acknowledgement, stale/duplicate rejection and revocation checks passed. Physical phone/firewall testing remains outstanding.

Publication note: v113 upload has twice failed resolving Cloudflare's API. Source commits are saved; publishing is pending retry while the remaining stage is completed.

### Stage 2 extension — online Sync remote (v115)

User requested both connectivity options. Added an explicit online session using existing signed-in Sync and private pairing links. Supabase Broadcast transports AES-GCM packets; the key remains in the pairing link/session and command state never enters the library. Phones sign in and wait for live operator acknowledgements. Session close, sign-out/account change and leaving Sync stop control. No new database schema is required; actual service availability still depends on project Realtime settings. Wi-Fi remote remains available separately. Automated encryption/tamper/session-isolation and authenticated transport lifecycle checks added; a real two-device account test remains outstanding.

### Stage 3 implemented — private rehearsal and readiness (v116)

Service → Rehearse & check snapshots the service without mutating live output or the queue. Its navigable 16:9 preview retains per-item themes and bullets. Checks cover empty/crowded slides, missing theme/background assets, actual offline-worker readiness and Output-window presence. Physical screen/OBS/phone connectivity is not inferred from these checks. The operator smoke test confirms rehearsal navigation leaves cp_live unchanged. Landing updates now explain independent output layouts, both phone-remote paths and rehearsal; delivered items were removed from the future roadmap.

Publication: Cloudflare API DNS now resolves again. Preparing combined release v116 containing the separately committed stages. Browser/hardware and real signed-in two-device verification remain unavailable in this session.

Final validation before publication: all 242 automated checks passed across the repository. Markup nesting and duplicate IDs were checked on the operator, landing and both remote pages. The untracked data/hymns-basic.json remains untouched.

### Publication verified — 7 November 2026

Combined release v116 is live at https://kogg-presenter.pages.dev/ (immutable release: https://74327be3.kogg-presenter.pages.dev/). Production operator, landing page, Wi-Fi remote page, online remote page and service-worker version returned HTTP 200 with the new release markers. A temporary loopback HTTP bridge also served the phone assets and verified pairing/authenticated state successfully; it was stopped after the check.

Implementation commits: 7e0a52c (independent broadcast), 7aa3079 (Wi-Fi remote), 9fbca45 (online remote), 1348392 (private rehearsal and feature notes). All 242 automated checks passed.

- [x] Stage 1 built, tested, committed and published.
- [x] Stage 2 built for both Wi-Fi and online Sync, tested, committed and published.
- [x] Stage 3 built, tested, committed and published.
- [ ] Manual acceptance: physical projector/OBS and a real phone on church Wi-Fi.
- [ ] Manual acceptance: two signed-in devices using the production online remote.
- [ ] Visual browser check: browser use remains disabled in Work settings.

No minister-listening AI was added. Existing offline essentials and the user's untracked hymn file were preserved.


## 7 November 2026 — KOGG Connect for OBS (Windows preview)

Goal: replace the separate OBS bridge process with an optional installed OBS source, while keeping the browser core lightweight. Phone remote paths remain separate.

- [x] Native Windows x64 OBS 32 plugin compiled. Adds KOGG Presenter with full presentation, transparent text, separate broadcast/lower-third, and name-tag/alert feeds. Uses OBS Browser Source internally; no added browser engine.
- [x] Bundled offline renderer, font and logos. Only presentation state, relevant images and portable display settings cross the loopback connection.
- [x] Eight-character expiring, single-use pairing code; persisted pairing; loopback-only server, origin/host checks, rate limits, revocation and competing-tab lease.
- [x] Native server integration tests: authentication, source files, pairing, conflicting tabs, state transfer, disconnect blanking, revocation and restart persistence.
- [x] Module registration and all four output choices verified against the installed OBS 32 library in an isolated harness, without opening/changing the user's OBS session.
- [x] Stream Connect/Disconnect controls, remembered pairing, automatic reconnect and latest-state delivery implemented. Manual bridge moved to Advanced.
- [x] Windows GUI installer, manual/source ZIP and checksum manifest built; embedded renderer matches repository files. Installer is unsigned; interactive installation acceptance is pending.
- [x] Landing page: plugin preview/download, visible phone remote connection cards, separate broadcast and rehearsal.
- [x] All 251 automated checks passed, including compiled native transport, browser connection lifecycle and embedded output isolation. Operator/landing/output markup and package integrity validated.
- [x] Deployment verified: production app, landing, connection script, v117 service worker and release manifest returned HTTP 200. Both published downloads match the final local SHA-256 checksums.
- [ ] Manual acceptance: installed OBS source rendering, hosted Chrome/Edge local-network permission, offline images, scene reuse and clean-account installer.
- [ ] Manual acceptance: actual phones for both existing Wi-Fi and online Sync remote.
- [ ] Later: macOS/Linux native builds after Windows acceptance.

The plugin serves only the bundled renderer on 127.0.0.1:8767; it does not expose the phone remote over LAN or require a Sync account. Same-Wi-Fi phone remote still requires the optional bridge; online remote requires internet and sign-in. Browser visual testing remains unavailable in this session. No user hymn data was changed.

Reconnect checks also cover an OBS restart between heartbeat polls and browser-tab duplication: the latest snapshot is resent when OBS has no state; each presenter page has a fresh writer identity. OBS rendering never claims the room projector lock or opens another output window. The plugin assets are downloaded on demand, not added to the app's offline essentials.

Final native lifecycle check: the bundled browser is now enumerated as an active child, so OBS scene visibility propagates to it. An isolated libobs harness registers a stub browser source, creates the actual KOGG source, and verifies child visibility on show/hide. This exercises source lifecycle without claiming CEF/visual rendering acceptance. Installer/package rebuilt with this correction before final publication verification.

### KOGG Connect publication verified

Release v117 is live at https://kogg-presenter.pages.dev/landing. Final immutable release: https://12892efe.kogg-presenter.pages.dev/. Published code: 53a8089. Windows preview installer: https://kogg-presenter.pages.dev/downloads/kogg-connect-0.1.0-preview-windows-x64.exe (568,832 bytes). The ZIP includes source; downloads are not precached with the browser core.

Completed commits: 966c914 (native plugin), a207db4 (browser pairing/reconnect), cbefdac (landing and distribution), 53a8089 (source child lifecycle). 251 automated checks passed; compiled module registration, feed choices and child visibility were additionally checked against OBS 32. Real CEF rendering, interactive installer, hosted browser permission and actual phone acceptance remain outstanding, explicitly marked as such on the landing page and in the plugin guide.


## 7–8 November 2026 — Landing experience, six improvements (v118)

User confirmed KOGG Presenter now appears in OBS Sources. Actual output rendering has not yet been tested by the user.

- [x] Interactive Scripture hero with immediate sample passages and linked control/output feedback.
- [x] A five-moment service walkthrough; retain the complete eight-deck tour.
- [x] Varied section arrangements while preserving blue branding, Nunito Sans Expanded, wordmarks and continuous scroll.
- [x] Interactive phone/laptop and broadcast illustrations, clearly separate from real device connections.
- [x] Purposeful transitions; visible-only animation work, touch-friendly controls and reduced-motion support.
- [x] Shorter primary journey; practical setup and detailed roadmap remain accessible.
- [x] Desktop, phone/tablet layout and interaction checks: 320, 390, 768 and 1280px; no horizontal overflow or browser errors. Both appearances reviewed.

256 automated checks passed. Hero samples match the bundled KJV without downloading the complete Bible; additional references load it on demand. Service bullets, phone Next/Blank/Resume, broadcast layout switching and guide deep links verified in the browser. These are isolated landing illustrations; actual OBS rendering and physical phone acceptance remain pending.

- [x] Commit, deploy and verify production v118.

Published code: 88dd281. Production: https://kogg-presenter.pages.dev/landing. Immutable deployment: https://c8dcf38f.kogg-presenter.pages.dev/landing. Canonical landing, v118 service worker and both new experience assets returned HTTP 200 and matched the committed release bytes. The immutable live page was also opened and visually verified. Screenshot: work/landing-v118-live.jpg (local verification artifact).

Existing open KOGG tabs may retain an older offline release until all KOGG tabs/windows are closed and reopened; do this between services. No saved presentation data was cleared.


## 8 November 2026 — Text rhythm, Quick Jump autofill and online remote (v119)

- [x] Landing text grouping, readable line lengths and balanced mobile headings.
- [x] Isolate Scripture search from sign-in forms; verify Quick Jump keyboard flow.
- [x] Online pairing QR, clear laptop/phone status and expiring/revocable sessions.
- [x] Confirm commands after completion; prevent duplicate commands and stale session updates.
- [x] Recover connection after network/sleep; show sign-in again when authentication ends.
- [x] Automated lifecycle and responsive browser checks: 269 full-suite checks passed. Final changed-asset checks passed.
- [x] Production v119 deployment and verification.
- [ ] Real signed-in laptop/phone acceptance (requires the user's devices/account).

Verified in browser: Quick Jump Enter displays John 3:16; search and every credential field belong to separate forms; Base mode remote start gives clear Sync sign-in guidance. Landing checked at 1280/390/320px. The remote fits 320px without horizontal overflow and disables actions before a connection. No password-manager credentials were accessed; the user confirmed the issue is suggestions, not a password inserted into the field. Exact third-party password-manager behavior remains user acceptance.

Production Supabase Broadcast reachability was independently verified using two anonymous SDK clients and one synthetic encrypted test packet. No accounts were created, no passwords used and no library data read/written. This proves transport reachability, not signed-in two-device acceptance. User explicitly chose “Build and test what you can first.”

QR encoder qrcode-generator 2.0.4 is vendored with its original copyright/license notice and loads only when pairing starts. Pair keys stay in URL fragments and phone session storage. Documentation: docs/REMOTE-ONLINE.md. User's untracked hymn file is untouched.

Publication verified: runtime commit 17ad508 (text layout commit 277818a), immutable release https://29b261ab.kogg-presenter.pages.dev/. Canonical operator, landing, online phone page, session controller, QR encoder, remote CSS and v119 worker all returned HTTP 200 and matched the committed archive. Live landing and online-remote empty state opened in-browser; screenshot work/landing-v119-live.jpg. Existing open tabs can retain the previous offline release until all KOGG windows are closed and reopened between services. No user data was cleared.


## 8 November 2026 — Account-free online remote in every mode (v120)

- [x] Separate, on-demand guest transport; no Sync identity or library access.
- [x] Remove laptop mode gate and phone sign-in; allow mode changes during pairing.
- [x] Keep encrypted private links, expiry, stale-command checks, deduplication and revocation.
- [x] Update Stream instructions, phone UI, landing page and remote guide.
- [x] Base and Local real-browser pairing and command round trip verified against production Broadcast. Sync-mode gate removal covered by the same adapter tests.
- [x] 275 automated checks passed.
- [x] Commit, deploy and verify production.
- [ ] Physical phone camera/network acceptance by user.

Browser acceptance: started guest pairing from Base, opened the private link in a separate browser tab, and received John 3:16 without login. Next changed the actual operator to John 3:17; Blank, Resume and Previous were confirmed. Changed the laptop to Local while keeping the same pairing; Next still worked. Stop remote delivered revocation and disabled the phone controls. No accounts or credentials were used. The phone URL fragment was removed after opening.

User requested simpler Wi-Fi setup during implementation. The normal remote requires only scan-and-connect on Wi-Fi or mobile data with internet. The existing bridge is now explicitly labelled Advanced/offline. A direct offline browser connection via WebRTC is a potential later task; it requires its own pairing design and is not claimed by this release.

Published runtime: 62cf2a8, release v120. Canonical operator, phone page, guest transport, phone adapter, landing and service worker returned HTTP 200 and matched the committed archive. Immutable release: https://15028c6f.kogg-presenter.pages.dev/.

Live acceptance: a fresh Base-mode operator on the deployed release generated a QR/link; a separate browser tab opened that exact link without login and connected. Next changed the actual laptop passage from Psalms 23:1 to 23:2. Stop revoked that pairing and disabled the phone. Screenshot: work/remote-v120-live.jpg. All test links were revoked afterward. Actual phone camera and a separate physical network remain user acceptance, not an implementation blocker. No user accounts were created or modified, and no saved library was uploaded.


## 8 November 2026 — Landing page: scan-and-connect remote (v121)

- [x] Announce account-free phone remote beside the hero and interactive phone demonstration.
- [x] Show Base, Local and Sync availability, internet requirements and three clear pairing steps.
- [x] Keep offline Wi-Fi bridge instructions under Advanced; update current features, FAQ and sharing metadata.
- [x] Responsive/interaction checks: desktop, tablet and phone layouts; valid anchors and unique IDs; demo Next updates both previews; no console errors. Dark-mode step badges retain accessible blue contrast.
- [x] Landing/offline automated checks: 30 passed.
- [x] Committed and published v121 (64db1dc). Canonical landing, stylesheet and service worker returned HTTP 200 and matched the committed release. Fresh deployed browser preview confirmed the new guide.

Release: https://e9680266.kogg-presenter.pages.dev/landing. Screenshot: work/landing-v121-live.jpg. Existing browser session retained an older cached landing; fresh release verified. No user library data changed.

Blue branding, typography, animation and the existing isolated demonstrations are preserved. The page does not generate real pairing links or connect to an operator; pairing starts inside KOGG.


## 8 November 2026 — Direct offline Wi-Fi remote (v122)

- [x] Confirm browser constraint: WebRTC needs a two-way offer/answer exchange. Without internet or a local server, one QR scan alone is insufficient.
- [x] Build direct encrypted data connection with no STUN, TURN, cloud signaling or bridge.
- [x] Guided two-scan pairing; local camera decoding and paste fallback; stop/revoke controls.
- [x] Save a lightweight phone remote offline and expose readiness clearly.
- [x] Test commands, expiry, stale/duplicate commands, cancellation, invalid pairing and offline assets.
- [x] Browser verification, commit and publish; record physical-device limitations.

Both devices must prepare the pages online before offline use. Guest Wi-Fi isolation can prevent direct connections. Two-scan pairing is the supported offline design; a one-scan/no-internet promise is not made.

Implementation evidence: real browser operator and phone-view tabs paired over a WebRTC data channel with empty ICE-server configuration. Next changed John 3:16 to 3:17; Blank, Resume, Previous and stop/revocation worked. Then the local web server was terminated. Both pages reloaded from their caches, generated a new offer/reply, connected, and Next changed the operator passage. No signaling endpoint or bridge was running. This is a same-computer browser test, not a claim of physical phone/router acceptance or a disconnected OS internet connection.

Phone storage is a small separate cache with no Bible data or cloud SDK. QR scanner jsQR 1.4.0 is bundled under its Apache-2.0 license (js/vendor/jsqr-LICENSE.txt) and loaded only when scanning. Code generation is local. Camera tracks stop after decoding, cancel, tab hiding or page exit. Scanned offers and answers are compressed, size-limited, session-matched and expire after five minutes. Connected sessions expire after twelve hours. The existing command protocol confirms actions, rejects stale revisions and suppresses duplicates.

Physical acceptance remaining: Android/iPhone scanning laptop code, laptop camera reading reply, same-router operation with WAN removed, and restrictive guest-network behavior. Two-way code exchange using the paste fallback was exercised in the browser; live camera capture was not used.

Published v122: runtime commit a4af904; https://6fcd41ee.kogg-presenter.pages.dev/. Canonical phone page, phone worker, transport, landing and main worker returned HTTP 200 and matched the committed archive. Full suite: 282 passed; two additional cancellation tests passed afterward (9/9 Wi-Fi tests). Git excludes the pre-existing untracked data/hymns-basic.json.

Live release acceptance: Base operator and fresh phone page paired by exchanging their actual codes. Next changed John 3:16 to John 3:17. Phone ready-offline badge confirmed; 440px phone viewport had no horizontal overflow. Stopping on the operator disabled the remote. All test pairings were ended and temporary tabs closed. Proof: work/wifi-remote-v122-live.jpg and work/wifi-remote-v122-offline.jpg.


## 9 November 2026 — Sunday feedback: lyrics and media (v123)
- [x] Fix lyric parsing, visible configurable split controls, and out-of-order online selection.
- [x] Expand verified Christian source discovery and text extraction; identify unavailable lyrics honestly.
- [x] Add local image/flyer/video presentation with safe deck transitions and playback controls.
- [x] Run focused regressions, full checks and browser/output verification; publish and record remaining limits.

No exact failed song was available from the team. Reproductions cover title-only results, provider failures, delayed selection and overlong sections.

Implementation: every imported non-hymn section is capped at four lines by default; visible choices are 2/3/4/5/6/8 lines. Explicit whole-song splitting preserves repeated song order; per-card Split is beside Edit. Synced-only LRCLIB text is accepted; title-only results are labelled unconfirmed; late search, link and file imports cannot replace newer selections. Christian discovery now searches both Hymnary and hymnal.net, with partial-source tolerance. Google remains a discovery link, not an AI lyric generator.

Media lives in Slides → Images & video. Images default to uncropped fit; video supports mute, loop, play, pause and restart. Files use device IndexedDB and object URLs, with no added media framework. Limits: 20 MB images, 250 MB video, 40 files. Media is device-local, excluded from Sync/backups and OBS plugin transfer; use Output Window Capture. Browser codec and sound-autoplay support varies.

Validation before release: full suite 293/293 passed; 43 focused tests passed again after final race guards. Browser: 11-line verse split 4/4/3 plus a separate two-line chorus; lyric first slide reached Output. Portrait PNG retained its full border. MP4 played muted, paused, restarted, looped; Blank removed playback; displaying lyrics removed video and restored text. Responsive media styles added; viewport override was ineffective in this browser session, so phone layout acceptance is not claimed. Final deployment verification completed below.

Published v123: runtime commit a763a7a; https://f3223da0.kogg-presenter.pages.dev/. Canonical operator, landing, media output module and service worker returned HTTP 200 and matched the committed release archive. Production Christian search returned 30 results from both Hymnary and hymnal.net (no partial failure); a hymnal.net result imported successfully. In the fresh release browser, selecting Amazing Grace from hymnal.net loaded four four-line slides and its first slide appeared on the separate Output page. Final desktop media Display button was fully visible (bottom 602px in a 720px viewport). Screenshot: work/media-v123-live.png.

Remaining acceptance: exact Sunday song failures cannot be reproduced without titles; provider availability is outside KOGG control. Physical projector/audio and phone layout acceptance are not claimed by these browser checks. Existing untracked data/hymns-basic.json remains untouched and unpublished.


## 9 November 2026 — Mixed media service schedules and roadmap (v124)
- [x] Add selected images/videos to the Service queue with their chosen fit, darkening, mute and loop settings.
- [x] Keep media references in named plans and portable library data; offer missing-file checks and relinking without transferring binary files.
- [x] Add schedule preview, Previous/Next and video controls; restart videos on entry and stop them when leaving.
- [x] Extend private rehearsal and protect files still referenced by schedules/plans.
- [x] Refine and publish clearly planned Service Copilot and Pocket Presenter concepts on the landing page.
- [x] Test mixed schedules, remote command routing, missing-file recovery, saved plans and desktop controls; commit and publish.

Roadmap direction: Service Copilot takes a spoken/typed brief, drafts the run of service, resolves actual library/source content, flags gaps, and presents the plan for operator review. Optional listening suggests the current cue or passage. Manual control remains default; armed automatic cues must have clear scope, confidence checks and instant pause/override. Consent and visible microphone state are required. Base keeps its small offline core; online AI and optional native/on-device modules can be separate, capability-checked features.

Pocket Presenter: the presentation phone is the content authority and output host; the second phone is a paired controller with private UI. The host could show clean output locally or on a compatible receiver. Native Android/iOS apps should explore Cast, AirPlay and wired displays, with same-network discovery/authentication, disconnect recovery, screen-lock/battery handling and physical receiver tests. Offline pairing and prepared content are goals; universal offline casting is not promised. Google Cast requires sender/receiver integration (https://developers.google.com/cast/docs/overview); Apple display routing needs separate platform validation (https://developer.apple.com/airplay/). No native app, AI listener or casting capability ships in v124.


Validation: 298/298 full-suite tests passed. Browser verification built and saved a five-slide queue containing John 3:16, an MP4, a portrait flyer and two lyric slides. Next crossed all item types, Pause stopped the video, and Previous restarted it from zero. Importing a plan with a missing video produced a visible missing-file warning; relinking restored playback. Loading the saved mixed plan restored its entries; private rehearsal included all five slides and checked media availability. Shared paired-remote command handling is covered by an integration test across video entry/exit. No physical casting, native apps, AI or new phone-to-phone feature is claimed. Published and verified below.


Published v124: implementation 739ff78, landing polish 5d389a1; final release https://566491ad.kogg-presenter.pages.dev/. Canonical operator, landing, landing CSS, service-media module and service worker matched the committed archive byte-for-byte. The local resolver briefly failed; checks used a publicly resolved Cloudflare IP with normal HTTPS certificate verification and no system DNS changes. Fresh release browser: uploaded a portrait PNG in Base, added it to Service, started it, and verified the preview and file-ready status. Landing visibly shows both planned concepts in balanced cards. Proof: work/service-v124-live.png and work/roadmap-v124-live.png. Full suite 298 passed; 87 operator/offline tests and 9 final landing/offline checks passed after final refinements. Physical mobile/casting and real-account cross-device Sync acceptance remain outside this release's verification. The pre-existing data/hymns-basic.json remains untouched and unpublished.


## 9 November 2026 — Private service media Sync (v125, in progress)
- [x] Implement private content-addressed file storage, deduplication and resumable 6 MiB chunk uploads without another runtime dependency.
- [x] Keep only verified metadata in schedule/library JSON; require successful file publication before marking the cloud copy saved.
- [x] Prepare the active service automatically on another signed-in device; cache verified media in IndexedDB for offline output.
- [x] Add cloud/device readiness, explicit retry, account/mode cancellation and a 50 MiB per-file cloud limit. Original local video support stays 250 MiB.
- [x] Activate the private Supabase bucket and owner-scoped restrictive policies; verify access boundaries.
- [ ] Complete regression tests, real storage round-trip, UI verification, publication and travel-readiness guidance.

Setup file: supabase/migrations/20261109_private_service_media.sql. Signed-in Supabase dashboard access is pending. No service-role credentials are included in the app. Only files referenced by current/saved service plans upload; other local files stay local. Only the active service downloads automatically. Cloud objects are immutable and not automatically deleted when a queue changes, to protect saved plans/other devices. Initial provider-compatible cloud cap is 50 MiB per file; oversized media fails explicitly instead of silently claiming full Sync.

Checkpoint: 305/305 automated tests passed, including interrupted chunk resume, duplicate upload avoidance, active-service-only downloads, corrupt-file rejection, account mismatch, quota/size errors and preventing library publication before file success. After UI/copy refinements the full 305-test suite passed again. Fresh browser preview at 1280 x 720 verified visible Service controls and Base/Local sign-in guidance; travel instructions collapse to preserve space. Screenshot: work/service-v125-preview.png. Landing travel/media copy is prepared locally. Supabase dashboard remains at sign-in; bucket activation, actual authenticated storage round-trip and deployment are still pending. No production media-sync claim is verified yet.

10 November activation: signed-in Supabase SQL Editor applied 20261109_private_service_media.sql successfully. Read-only verification returned service-media, public=false, 52428800-byte limit, seven allowed image/video MIME types and all five KOGG policies. There were no pre-existing storage.objects policies. Proof: work/media-storage-private-v125.png. Real transfer acceptance awaits KOGG app sign-in (separate from dashboard login); an isolated local test page is ready to exercise image/video uploads, fresh-cache verified downloads, duplicate prevention, offline cache reuse and rejected public/foreign-folder access without writing the service library.

Real authenticated acceptance passed on 10 November: generated PNG and 1.1 MB MP4 uploaded via the production TUS endpoint, confirmed by object info, reused without duplicate creation, downloaded into an empty destination cache and verified by SHA-256. Cached preparation required no storage network request. Anonymous authenticated-route access, public-route access and uploads to a foreign account folder were denied. Downloaded video decoded at 960 x 540 with 5.055-second duration and no media error. Test page never wrote the service library. Proof: work/media-sync-v125-verified.png. This simulates a second device with an empty cache; a physical second-device rehearsal is still recommended.

During app sign-in, found a first-sync conflict between untouched factory themes and the saved cloud theme. Added a factory-theme baseline only for first contact with an existing library; modified local themes still conflict rather than being overwritten. Full suite: 307/307 passed, including both new first-sync regression tests.
