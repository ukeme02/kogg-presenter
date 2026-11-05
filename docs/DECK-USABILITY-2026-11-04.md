# Deck usability review — 4 November 2026

## Changes implemented in this release

Notes now follows Choose a format → Write → Display. Templates apply immediately, with Undo draft change instead of a blocking confirmation. Bullet markers appear in the editor, Enter creates the next point, an empty bullet creates a slide break, and one-point-per-slide is available alongside grouped points. Empty bullet markers cannot be projected.

The actual Output page renders semantic bullet lists. Alerts use two identical copies for a continuous horizontal loop, starting visibly instead of entering from off screen. Preview and Output both move. Scrolling is an explicit function; Static notice is the motion-free alternative. Ordinary slide changes preserve the moving track. Stop alert and Hide name tag operate independently of the underlying slide. Projection reserves space for the alert so it does not cover the reference label.

Notes controls appear only for the chosen format. Saved notes, file operations and word emphasis sit behind labelled disclosure controls. Desktop panels remain within the available screen; small or short screens can scroll inside panels.

Lyrics separates My library and Online results. Its search field stays visible on desktop while results scroll. Results identify the source and say whether clicking will display or fetch-and-display. Review opens editing without displaying. Main actions are Display, Save and Service. Song order, bulk editing tools and extra per-slide operations are tucked under Arrange / More. One-tap display is retained.

## Recommended next changes across all decks

These are recommendations, not claims of implementation in this release.

| Deck | Keep prominent | Next simplification |
| --- | --- | --- |
| Scripture | Existing 4-over-3 dock arrangement, reference selection, Quick jump and Output | Keep optional settings in Explorer; show connected/licensed availability in one translation picker, and use consistent labels for search results and live state. Preserve the three-tap workflow. |
| Lyrics | Search, source selector, slide cards, live monitor | Keep the simplified layout; add a concise selected-song title/source line and a clear fetched-text failure/retry action beside an online result. Avoid adding another permanent dock. |
| Notes | Format, text, Display, live monitor | Keep templates focused on real service tasks; show advanced point/layout choices only when relevant. Use the new undo rather than confirmation dialogs for reversible draft changes. |
| Slides | Slide list, Design / Live preview, Display | Use a compact style strip for background/font/size; retain Uniform as one clearly labelled switch. Put image adjustments in a small expandable panel if more controls are added. |
| Service | Current item, Next item, Present | Separate queue editing from live navigation. Replace icon-only queue actions with accessible text labels/tooltips and make the live item conspicuous. Keep saved plans in a collapsible library. |
| Themes | Background, text appearance, preview, Apply to Live | Close advanced spacing/margins/label controls by default. Separate draft preview from applied appearance and retain the logo as a picker rather than a permanent dock. |
| Tools | Connection and offline readiness | Group into Setup, Library/backup and Diagnostics. Keep account, destructive reset and troubleshooting controls away from everyday presenting. |

## Consistency rules

- Display means send to the room; Review/Edit means change the draft. Never use the same label for both.
- Keep a 16:9 live monitor, with a visible live/blank status and a clear way to stop overlays.
- One primary action per task area. Secondary tools use labelled disclosure panels, not overlapping menus.
- Desktop decks fit the available height. Lists and long editors scroll internally. Phones and portrait tablets use a natural vertical flow with no horizontal overflow.
- Save feedback must state the scope: session, this device or cloud. Do not imply device-only Notes drafts are cloud-synced.
- Changes to draft content must not silently replace live content. Optional live typing starts only after Display and stops following when another item takes over.

## Validation

Browser checks: real Output bullet markers; new point insertion; one-point-per-slide navigation; name tag over existing content; ticker movement in preview and Output; Static notice; stopping an alert without clearing the slide; label stays above the alert; one-tap local hymn display; fixed desktop search field. Tested desktop 1280×720 and small desktop 1024×640, with phone/tablet responsive checks. Physical extended-screen placement and online provider availability were not changed by this release.
