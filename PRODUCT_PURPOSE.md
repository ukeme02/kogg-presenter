# KOGG Presenter: product purpose

KOGG Presenter helps a church media operator follow a live service and put the correct scripture, lyrics or supporting information on the congregation’s screen quickly. The operator must respond to unplanned references and changes while maintaining clear, reliable output.

The core problem is the delay and mental effort between hearing a request and getting the right content on screen. Fast lookup is only useful if references are accurate, the operator knows what is live, and ordinary controls behave predictably.

## Confirmed requirements

The user confirmed these requirements on 30 October 2026:

1. **Light on ordinary hardware.** Remove the need for the heavy system requirements associated with presentation software. Keep CPU, memory, storage, startup time and downloads small. Measure these costs on modest hardware before claiming performance; avoid adding large runtimes or dependencies without a demonstrated need.
2. **A schedule that travels with the operator.** Prepare a service schedule on one device, then access that same schedule and its required content on another device when travelling without the original laptop. A manual export is a useful fallback, not a replacement for dependable account sync. Saved named plans and the current service schedule must have explicit, understandable sync behaviour.
3. **Present from an offline laptop immediately.** Provide a complete offline distribution that can be transferred or obtained ahead of losing connectivity, installed or opened on a compatible laptop without an internet-dependent setup, and used to present immediately. Include the required app files, Bible texts, fonts and startup support. A website that works offline only after a successful online visit does not fully meet this requirement.

An offline package can provide the app and bundled content without network access. A personal schedule must also have reached that laptop beforehand, either through prior sync or an included/transferred schedule file; no implementation can fetch unseen cloud data without a connection.

## Current gaps against those requirements

- The app uses a small browser-based codebase, but no agreed CPU/RAM/startup/download budget has been measured on target hardware.
- Named plans are included in cloud sync. The current service queue remains local in the present implementation; complete schedule portability needs further implementation and real multi-device testing.
- Cached offline use exists after preparation. A complete offline installer/portable package with a verified first-run experience is not yet delivered.

## Decisions this purpose should guide

- Prioritise a short path from reference or remembered words to the correct projected passage.
- Keep the live output and its operator preview consistent. Avoid accidental changes to what the congregation sees.
- Make scripture, chapter and verse navigation easy to operate under live-service pressure.
- Let operators arrange useful docks and hide distractions. Menus must open, close and get out of the way predictably.
- Support both prepared offline use and a complete offline first-run distribution.
- Protect songs, plans, themes and settings through reliable saving, backups and explicit sync conflicts.
- Support the user’s free, lightweight, cross-platform direction without introducing complexity into routine presentation.

Guiding questions: does this change reduce the operator’s time, effort or uncertainty when putting the right content on screen? Does it preserve low hardware demands, schedule portability and offline readiness?

This records the current understanding from the project and conversation. It is a direction for implementation, not a claim that every listed behaviour has passed live-service testing.

## Three-mode contract

The user clarified that Base Mode is specifically a browser workflow: load once online, complete preparation, then present offline without installation. Sync adds portable account libraries and schedules; Local keeps the work on the device with optional installation. These are storage/account choices around the same presentation tool, not three separate heavyweight applications.

The offline-first startup now prepares KJV and the operator/output core first and exposes readiness explicitly. Other translations are cached when selected. A complete installer/portable package for a laptop that has never prepared the browser is still separate future work.
