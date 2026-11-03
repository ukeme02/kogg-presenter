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
