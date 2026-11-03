# KOGG Presenter: functional audit and debugging report

Date: 3 November 2026, Africa/Lagos. Source revision: dec9301.

## Assessment

The basic presentation workflow is usable, but data integrity and live-service reliability need work before this build should be considered fully service-ready. **15 defects were reproduced**, through browser interaction or focused executions of actual implementation code. The existing suite still passes **171/171**: its coverage does not include several important combined workflows.

This is a bounded audit, not proof that no further defects exist. No application source, production data, schema or deployment was changed. Browser test content was created on an isolated localhost origin.

## Coverage

- Browser: Base entry; Scripture references; Scripture-to-song transition; lyrics paste/split/display/advance; Notes bullets/splitting/emphasis; custom background upload and dimming; deck navigation; landing validation, appearance toggle, Explorer, links and lazy images.
- Operator and output ran in separate tabs. Observed viewport sizes were approximately 983×930 for the visible operator, 1280×720 for hidden landing tabs and 1280×800 for output. Requested viewport overrides did not produce a true 390px layout; no phone/tablet visual certification is claimed.
- Public landing loaded at `https://kogg-presenter.pages.dev/landing` after redirect. Initial navigation timed out, then loaded successfully. Public feature copy matches the reviewed features; local interaction supplied most behavioural evidence.
- Browser error logs were clear during the tested flows. Most findings are silent logic failures.
- Known encoding-corruption markers were scanned across all 13 bundled Bible JSON files.
- Read-only Supabase inspection confirmed the library table, row security, owner checks and realtime publication. No accounts, credentials or library records were created/changed.
- Saved evidence: `docs/audit-evidence-2026-11-03/`. JSON probes contain dummy data; the test log records the full suite.

## Confirmed defects and fixes

| ID | Priority | Reproduction / failure | Suggested fix |
| --- | --- | --- | --- |
| F01 | P1 | **Sync can overwrite a newer cloud edit.** A pull merged “New remote A”; local application rejected its stale revision because another local edit occurred; the next push wrote “Old A” back to the mock remote. Actual sync-client and application functions were used. | Commit the merge baseline only after local application is accepted. Keep write-echo stamps separate. On revision changes, re-merge against the latest local snapshot before proceeding. |
| F02 | P1 | **Bible encoding corruption reaches output.** KJV flags 1,863 verses and ASV 1,932. Browser confirms `kingâ€™s` in KJV 2 Kings 7:9. This is a character-integrity screen, not a full textual certification. | Repair encoding reversibly, validate structural counts and changed punctuation against trusted sources, and release with explicit data-cache migration. Preserve legitimate Unicode and Bible wording. |
| F03 | P1 | **Cache upgrades preserve outdated code/data.** A previous cache seeded with OLD APP / OLD CORRUPT TEXT fetched neither changed URL during install; first app request and Bible request returned those old values. The existing upgrade test does not actually upgrade over its seeded old cache. | Use a hashed/versioned shell and data manifest. Retain unchanged large packs, fetch changed assets before activation, and invalidate corrected Bible entries explicitly. |
| F04 | P1 | **Sync work can resume after switching to Base.** Delayed `currentUser`, switched to Base, then resolved the old request. Mode stayed Base but the user was reinstated; the old flow can continue pulling. | Use a mode/account generation token. Check it after every await and before identity, subscription, asset or library changes. Cancel stale work on mode/account changes. |
| F05 | P1 | **Monitor removal can stack duplicate output windows.** With two popups and one remaining secondary screen, both were placed at [1280,0]. This was a simulated-screen reproduction, not a physical cable test. | Keep one managed output per selected screen; retire surplus windows on unplug and restore only intended assignments on reconnect. |
| F06 | P2 | **Whole-service playback loses later prepared themes.** A t2/t3 queue kept t2 on item two because Start Service flattened the slides. | Preserve item/slide provenance with a service cursor; apply each item's theme at its boundary. |
| F07 | P2 | **Quick Go bypasses a service item's theme.** The same t2 item uses t1 through Quick Go, unlike the normal Service play button. | Route all service firing paths through one presenter function with identical theme and identity rules. |
| F08 | P2 | **Quick text edits can change the entire live theme.** A+ changed a prepared t2 item to the operator's t1. | Adjust the active `live.themeId`, preserving its background/font; define persistence separately from live overrides. |
| F09 | P2 | **A+ has an invisible size plateau.** “Jesus wept.” remained about 95.98px through repeated A+ clicks while the saved theme increased to 9vh. | Separate desired size, fitting and maximum enlargement. Make size changes monotonic until a real fit limit and show explicit limit feedback. Resolve the larger-default request together with this. |
| F10 | P2 | **Lyrics single-word tap emphasis clears itself.** Confirmed in VM and browser: pointer-down writes the mark, pointer-up clears that newly written mark. | Compare with pre-gesture state, or defer the single-tap write until pointer-up. Keep range dragging separate. |
| F11 | P2 | **Notes mode-specific controls stay visible.** In Scrolling alert mode, split controls and the subtitle label had `hidden=true`, but computed display was flex/block with visible height. | Add a scoped `[hidden]{display:none!important}` rule and check other conditional controls with real computed-style assertions. |
| F12 | P2 | **End Base session can leave temporary lyrics live.** Whole-service playback loses `lyricsSession`; End session removes temporary queue items but leaves the song on output. Permanent-plan saving of temporary songs is correctly blocked. | Preserve session provenance during service playback and blank output when its owning session ends. Reuse the service cursor from F06. |
| F13 | P2 | **Install-success feedback fails.** An accepted prompt left the message empty and the install button visible. Its handler uses `pl.name` outside the scope where `pl` exists, then swallows the exception. Installation itself is not proven broken. | Resolve the platform inside the handler or retain it in shared state; handle accepted/dismissed outcomes explicitly. |
| F14 | P2 | **Preview loses paragraph spacing.** The operator helper converts two newline-separated paragraphs into a single line; output preserves them. | Preserve newlines when removing Strong's markers; share text tokenization/rendering between previews and output. |
| F15 | P3 | **Hero's knowledge highlight disappears on manual selection.** Initially one mark; selecting 2 Corinthians 4:6 again finishes with zero marks. | Use one escaped renderer and annotation metadata for initial, rotating and manually selected preview scenes. |

## Source locations

- F01: `js/sync.js` pull/push/remember; `js/app.js` applyCloudLibrary.
- F02: `data/kjv.json`, `data/asv.json`.
- F03: `sw.js` prepareOffline/fetch; `tests/offline-worker.cjs` upgrade fixture.
- F04: `js/app.js` refreshUser, setWorkMode, autoSync/pullCloud/applyCloudLibrary.
- F05: `js/app.js` placeOutputOnScreens.
- F06/F12: `js/app.js` btnLiveService, pushLive, btnEndLyricsSession.
- F07/F08/F09: `js/app.js` quickGoLive, patchTheme, quickFontSize; `js/display.js` fitText.
- F10: `js/app.js` lyricsLiveText pointer handlers.
- F11: `css/app.css` Notes row/label rules; `index.html` conditional Notes controls.
- F13/F14: `js/app.js` btnInstallApp/showLocalPanel and stripStrongs.
- F15: `landing.html` showHit/liveVerse; `js/landing.js` hero scenes.

## What worked

- Base opens without account creation and shows offline-ready core status.
- Quick Jump displayed references. Ordinary Scripture-to-song playback advanced song slides instead of returning to old Scripture.
- Pasted lyrics split into two sections and displayed/advanced.
- Notes produced four actual output bullets; a three-point split created a second slide; Notes emphasis appeared on the separate output.
- PNG background upload decoded; 60% dimming appeared on the actual output.
- Temporary Base songs were blocked from permanent named-plan saving.
- Landing had no missing internal anchor targets. Lazy KOGG MEDIA images loaded after navigation. Valid references displayed; invalid references were rejected. Theme toggle and Explorer opening worked.
- Production libraries has RLS enabled, with owner equality in USING and WITH CHECK, and is in the realtime publication. This verifies configuration, not a fresh authenticated two-device round-trip.

## Backend advisories

Supabase reported these review items:

- [Leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Review protections available for the project's plan.
- [Security-definer execution grants](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) on `public.rls_auto_enable()`. Catalog inspection shows an `event_trigger` function using pg_catalog search_path and DDL-trigger logic. It is not an ordinary application RPC; no exploit was demonstrated. Review unnecessary grants without calling this a proven data leak.
- [Per-row auth policy evaluation](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan). Consider `(select auth.uid())` and explicit intended roles, while retaining owner and write checks.

## Lightweight/offline fit

Declared core files total about **17.47 MiB uncompressed**, mainly KJV Strong's, KJV, BSB and the Strong's lexicon. This is source/storage size, not measured compressed transfer. Main app JS is about 192 KB, output JS 19.5 KB and app CSS 87 KB. No audio-playback UI was found.

Keep the three required Bibles and hymnary. Avoid repeat transfers with content hashes and complete-release activation rather than blindly retaining stale assets. Keep the requested motion; profile paint/compositing on actual low-power devices before adding more blur layers. No frame-rate or Lighthouse result is claimed here.

Sync currently transfers the full library and referenced image payloads. Incremental immutable assets would reduce growth-related latency and bandwidth. This is a scaling risk, not a measured current slowdown.

## Product gaps and landing corrections

- Default/new-theme size remains 7vh; the larger-default request is unfinished.
- App Explorer has not replaced the older Quick Edit panel. Landing Explorer works.
- The requested gallery of actual product screenshots is still missing; the hero is a coded demo.
- Notes remain device/session-local and outside normal portable-library/backup data. The landing discloses device-local Notes. Decide whether travelling ministers need portable Notes before promising that workflow.
- Styled previews are approximations: actual fitting, margins, vertical placement, labels and overlays differ. Share rendering rules before promising exact WYSIWYG.
- Preserve the blue identity and continuous motions. Fix F15; qualify absolute promises about live sync and remembered monitor choices until the corresponding defects are fixed. Place permission/fullscreen fallback guidance near the Output instructions.
- Public landing is reachable. Terminal requests had DNS failures and a lyrics-search 403; a browser subsequently loaded the landing. Those transport results do not establish that the production lyrics API is down. Provider availability needs a stable-network retest.

## Release gates still requiring real devices/services

1. Physical projector, multiple displays, cable unplug/replug, Extend mode and fullscreen recovery in Chrome/Edge.
2. Real microphone permission/capture/transcription and network loss. No microphone access was granted during this audit.
3. True phone/tablet widths, landscape, soft keyboard, touch dragging and low-memory performance. Tool viewport overrides were ineffective in this session.
4. Two authenticated devices: simultaneous edits, offline/reconnect, theme assets, mode switches during requests. Use disposable test libraries for races.
5. Provider/API-key-backed Bible editions and live lyric-source recovery.
6. Fresh installation and an actual previous-release browser-cache upgrade. Mock cache tests alone are insufficient.

## Fix order and acceptance

1. F01/F04: prevent lost cloud work and stale mode operations. Regress edits during pull/push/auth and account/mode changes.
2. F02/F03 together: correct Bible punctuation and ensure already-installed/offline users receive the corrected data.
3. F06/F07/F08/F12: introduce one item-aware service presenter and preserve theme/session metadata through every entry point.
4. F05/F09/F10: enforce output assignment, predictable sizing and correct gesture toggling.
5. F11/F13/F14/F15: conditional UI, install feedback, preview fidelity and landing demonstration.
6. Add these exact reproductions to the regression suite, then finish the hardware and two-device gates.

## Evidence files

`docs/audit-evidence-2026-11-03/` contains:

- `full-audit-probes.json`: themes, service cleanup, install feedback, mode race, screen collision and paragraph handling.
- `sync-cursor-probe.json`: newer remote edit overwritten after rejected local application.
- `cache-upgrade-probe.json`: stale shell and Bible carried forward.
- `full-audit-2026-11-03-tests.txt`: 171 passing tests.
- `notes-controls.jpg`: mode-inappropriate controls remain visible.
- `landing-hero.jpg`: knowledge is unhighlighted after selecting the same sample verse.

No application fixes, commits, pushes or deployments were performed in this audit.
