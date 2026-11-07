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

- [x] Stage 1: independent room/broadcast layouts, explicit graphics routing, source URL and preview; verify and publish.
- [x] Stage 2: paired phone remote, connection feedback and bounded controls; verify and publish.
- [ ] Stage 3: private service rehearsal and readiness checks; verify and publish.

Preserve the lightweight browser/offline core. Each stage receives a separate commit and release. Browser visual inspection is unavailable until browser use is enabled in Work settings.

### Stage 1 delivered — independent broadcast layout (v113)

Stream → Layouts configures full-canvas or lower-third broadcast styling, a separate theme, and tag/notice routing. The normal projector retains its theme and full-screen composition. Browser Source → Separate broadcast supplies the dedicated transparent URL; the monitor switches between room and broadcast. Both feeds share passage navigation. Existing feeds retain their previous defaults. 117 targeted checks passed, including route isolation and invalid-input fallbacks; physical OBS and browser rendering remain unverified.

### Stage 2 implemented — paired Wi-Fi remote (v114)

Optional `--remote` bridge mode serves a phone controller with acknowledged Previous/Next/Blank/Resume. Pairing is laptop-only; random session links can be revoked. Explicit private-IP Host checks, same-origin checks, authenticated phone APIs, restricted phone assets, revision checks, deduplicated command IDs and a single operator connection bound the control path. Default bridge remains loopback-only. The operator shows network choices when multiple adapters exist. No account/internet is needed, but the laptop must run the optional Node bridge. Automated authorization, command acknowledgement, stale/duplicate rejection and revocation checks passed. Physical phone/firewall testing remains outstanding.

Publication note: v113 upload has twice failed resolving Cloudflare's API. Source commits are saved; publishing is pending retry while the remaining stage is completed.
