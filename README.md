# KOGG Presenter

A lightweight, fully offline church presentation app for scriptures, lyrics and lower thirds.
Built on a **free stack only**: plain HTML/CSS/JS (no framework, no build step), IndexedDB/localStorage
for storage, and a service worker for offline use. The same code runs as an Android app, in any
browser, and can be packaged for Windows, iOS, and desktop.

## What's inside

| Feature | Details |
|---|---|
| Scripture display | **Five available Bibles** — KJV, BSB (Berean Standard), **KJV with Strong's numbers**, WEB and ASV. KJV, BSB and KJV with Strong’s are prepared with the offline core, including the Strong’s lexicon. WEB and ASV cache when selected. Licensed translations (NIV, ESV…) can be imported per device in Sync/Local mode. One-page dock layout: Books, Chapters, Verses and Memory on screen at once — tap numbers to go live instantly, with prev/next verse buttons that walk the Bible book by book |
| Add versions | Tools tab → **Scripture versions**: import your own Bible JSON in Sync/Local Mode; it is stored in the device (IndexedDB) and appears in the translation list everywhere |
| Strong's tap-to-define | In the KJV Strong's Bible, word numbers appear in the **"On the projector" preview only** — the congregation never sees them. Tap a number and the word's Hebrew/Greek meaning (original word, transliteration, definition, KJV usage) takes the projector screen; tap the same number again to flip back to the verse. Toggle off in Tools → Strong's numbers |
| Quick jump | Its own resizable dock: type `jn 3:16` / `jn 3 16` / `1sam 2` — a unique book completes after three letters, then Right Arrow/Tab advances chapter to verse; Enter displays |
| Whole-Bible search | Its own resizable dock: find verses by remembered words/phrase across the loaded translation |
| Word emphasis | In the "On the projector" preview, press and drag across words — the projector highlights them live, in a marker style; click anywhere else to clear |
| Screen startup | The projector starts **plain black** in Nunito Sans Expanded Bold — blank until you put something live; Blank/Logo buttons are one tap |
| Slide switcher (float) | The floating ◀ ▶ crew widget bottom-right is toggleable from the 🧩 Docks menu |
| Floating quick edit | A− / A+ / ⬌ text size + alignment in a small draggable floating window — toggle from the ⋯ menu ("Floating quick edit") |
| Version chips | A row of translation chips under the projector preview — switch the Bible mid-show with one tap and the current verses go live in the new translation |
| Memory dock | Scripture history and bookmarks persist on this device — tap a passage to display it |
| Lyrics deck | Find → Paste/Edit → Display. One empty line splits slides; headings label them. Click any slide to display, reuse sections in song order, split/merge/reorder/duplicate/delete, Undo, and optional four-line split |
| Hymnary | 300 traditional hymns bundled; optional 262-hymn expansion. Download once for offline use; source credits included |
| Church logo | Tools tab → upload once; it shows on the Logo screen and follows your sync account |
| Online lyrics | LRCLIB title/artist search with source credits; choose a result to review in the editor. Import downloaded SongSelect/plain-text files or paste lyrics. No generic webpage scraping or automatic SongSelect account connection |
| Voice control | One tap: speak commands — "next", "previous", "blank", "logo", or "John three sixteen" — the console obeys (Web Speech API, Chrome/Edge, online) |
| Quick Go | Type `jn 3:16-17`, `ps 23` or a song name in the top bar, hit Enter — it's live. Press `/` to focus from anywhere |
| Extended screen | Output window opens straight onto the second monitor (Chrome/Edge Window Management API — allow once) |
| Work modes | Choose on first load: **Base Mode** (basics once, offline scripture display, no cloud), **Sync Mode** (sign in — library follows the account), **Local Mode** (everything saved on this device — Windows/Android/macOS/iOS/Linux) |
| Cloud sync | Free Supabase account: songs, themes, plans **and your logo/background images** follow you to any PC or phone. Changes auto-push when you're signed in online; the Account tab shows synced/unsynced status |
| Typography | **Nunito Sans Expanded Bold** by default; font, size (+/− live in the top bar), weight and text alignment per theme |
| Light/dark | Operator console has light and dark modes |
| Landing page | `landing.html` — public page explaining the app with install/download steps |
| Service plan | Ordered queue of songs + scriptures, named plans save/load, whole-service live mode |
| Live output | `display.html` — clean full-screen projector view, synced instantly with the operator |
| Themes | 14 gradient backgrounds + custom background images, text color, font, font size |
| Docks | Seven movable/resizable docks over a 12×12 grid — drag the title grip to reposition, corner handle to size. Desktop defaults to four docks above three; compact displays reflow. **🧩 Docks menu** in the Scripture toolbar picks which docks are visible; layout locks with 🔒 |
| Lower thirds | Animated name/title banner — ideal as an OBS overlay over video |
| OBS pairing | `display.html?overlay=1` gives a transparent browser source for OBS Studio |
| Blank / Logo | One-tap blank screen and logo screen |
| Countdown | Pre-service countdown timer with clock |
| Backup | Export/import the whole library as JSON |
| Keyboard | ←/→ or space = slides, `B` = blank, `L` = logo |

## Run it locally (required — the app needs http://, not file://)

Any of these free options:

```bash
# Python (already on your machine)
cd kogg-presenter
python -m http.server 8080
# then open http://localhost:8080

# or Node
npx serve .
```

**Using it in a service (two common setups):**

1. **Phone/tablet + projector** — install the app on Android (below), connect the device to the
   projector with an HDMI adapter or cast it (Chromecast/Miracast), tap **Output** for the clean
   full-screen view, and operate from the main screen.
2. **Laptop + projector** — open `display.html` in a Chrome window dragged to the projector screen
   and `index.html` on your laptop screen. Both windows stay in sync automatically (same browser).
   Press F11 on the display window.

## Enable cloud sync (5 minutes, free)

Accounts and library sync use [Supabase](https://supabase.com)'s free tier (no credit card):

1. Create a project at supabase.com (any name, e.g. `kogg-presenter`).
2. In the SQL Editor run:

   ```sql
   create table if not exists libraries (
     user_id uuid primary key references auth.users on delete cascade,
     data jsonb not null default '{}'::jsonb,
     updated_at timestamptz not null default now()
   );
   alter table libraries enable row level security;
   create policy "own library" on libraries
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
   ```

3. In Project Settings → API copy the **Project URL** and the **anon public key**.
4. Paste both into `js/supabase-config.js`, deploy, done. The Account tab (and the signup card on
   the landing page) come alive: sign up, sign in on any device, **Push/Pull** your library.
   Data is protected by row-level security — only you can read or write your row. The anon key
   is safe to ship publicly.

Everything else in the app works without any of this — sync is purely optional.

## Pair with OBS Studio

The operator and a normal output window share state within the same browser. OBS has a separate browser process, so it needs the optional local bridge:

1. From this repository folder, run `node tools/obs-relay.cjs` (Node.js 18 or newer).
2. Open `http://127.0.0.1:8766/` in Chrome or Edge as the operator. This origin has its own local storage; export/import a backup to transfer your existing library.
3. In OBS, add a Browser Source using `http://127.0.0.1:8766/display.html?overlay=1` at 1920×1080, 30 FPS.
4. Keep the local bridge running. Use Blank to hide both slide text and lower thirds. Omit `?overlay=1` for an opaque slide scene.

The bridge binds only to loopback, rejects unrelated web origins, and transmits output state and referenced images, not sign-in tokens. It is intended for OBS on the same computer; remote phones do not connect to this loopback URL. The bridge transport has simulated HTTP/SSE regression coverage; actual OBS and projector verification is still required.

## How KOGG Presenter compares

Competitors and where KOGG fits (researched Oct 2026):

| App | Model | Weakness KOGG addresses |
|---|---|---|
| ProPresenter | ~$29/mo subscription | Free; runs on any phone/laptop browser, no install |
| EasyWorship | ~$299 license | Free; zero install, works offline |
| OpenLP | Free, desktop app | No install at all — a URL; modern touch-first UI; phone-operable |
| Quelea | Free, Java desktop | No Java/desktop install; OBS-transparent overlay built in |

KOGG's niche: **free + offline-first + phone-operable + OBS-ready overlay + lower thirds** in
~20 KB of code with no dependencies.

## How to get it on each platform (all free)

### 1. Web / "internet version" (works everywhere, incl. Chrome)

Deploy the `church-presenter` folder to any free static host:

- **GitHub Pages** — push the folder to a repo, enable Pages. Free HTTPS URL forever.
- **Cloudflare Pages / Netlify** — drag-and-drop the folder. Free HTTPS + global CDN.

Because of the service worker, the site is **installable and works offline** after the first visit:
Chrome/Edge shows an "Install app" prompt. That installed web app *is* the Windows app (step 2).

### 2. Windows

- **Easiest:** open the deployed URL in Edge or Chrome → menu → *Install* / *Apps → Install this
  site as an app*. You get a standalone window, Start-menu icon, offline support. Zero extra code.
- **Optional (MSIX package):** [PWABuilder.com](https://www.pwabuilder.com) → paste your URL →
  download the Windows package. Free.

### 3. Android (APK / Play Store)

- **Sideload APK:** [PWABuilder.com](https://www.pwabuilder.com) → paste your deployed URL →
  *Android package* → download APK → install on the device (allow "install unknown apps").
- **Command line (Bubblewrap):**
  ```bash
  npm i -g @bubblewrap/cli
  bubblewrap init --manifest https://YOUR-URL/manifest.webmanifest
  bubblewrap build
  ```
  Produces `app-release-signed.apk`. Free, no Play account needed to sideload.
- **Play Store:** a one-time $25 Google developer fee is the only non-free item — only if you want
  store distribution; sideloading is completely free.

### 4. iPhone / iPad

- **Free (no App Store):** open the URL in Safari → Share → *Add to Home Screen*. It runs
  full-screen, offline, and looks like a native app.
- **App Store (optional):** PWABuilder can generate an iOS package, but publishing requires an
  Apple Developer account ($99/yr) — only needed for store distribution.

### 5. macOS / Linux

Same as Windows: install the PWA from Chrome/Edge/Brave. PWABuilder can also emit packaged builds.

> **Note for a multi-device setup:** operator on your phone + display on the laptop sync over the
> same browser. Cross-device sync (phone controls the laptop's Chrome) needs a tiny relay server —
> see the roadmap. Everything else works offline with no server at all.

## Project structure

```
kogg-presenter/
├── index.html          operator console
├── display.html        projector output screen
├── css/                app.css (operator), display.css (output)
├── js/                 app.js (operator), display.js (output), sync.js, idb.js (image assets)
├── data/               offline Bibles: kjv.json, bsb.json, kjvs.json (Strong's), niv.json, nlt.json, web.json, asv.json + hymns.json, strongs.json (lexicon)
├── fonts/              Nunito Sans variable font (local, works offline)
├── icons/              SVG app icons
├── manifest.webmanifest  PWA manifest
└── sw.js               service worker (offline cache)
```

## Roadmap ideas

- Cross-device remote control (phone → laptop display) via a small WebRTC/WebSocket relay
- Quick full-text Bible search; bookmarks; verse-of-the-day
- Announcement slides with auto-rotation
- Stage/confidence view showing the worship team what's next
- OpenLyrics import; import songs in bulk from CSV/text
- Native dual-display (different content on phone screen vs HDMI) would require the native
  Kotlin route — current design keeps one codebase instead

## Licensing notes

- KJV, WEB, ASV, YLT (Young's Literal 1898), Darby (1885), AKJV, Webster (1833), Geneva 1599
  texts: public domain. Optional versions download once on selection (Not bundled into the offline
  core). Sources encoded from the public-domain vol. 1 set distributed through the Scrollmapper
  Bible databases project; verse placement verified against the canonical 66-book slot template,
  with known source gaps kept explicitly empty.
- BSB (Berean Standard Bible): free to use and redistribute.
- Strong's lexicon data: public domain (OpenScriptures).
- **NIV**, **NLT**, **ESV** and similar modern translations are NOT bundled — their full texts are
  copyrighted and may not be redistributed in an open-source repo. If your church has a license,
  import the text per device (Tools → Scripture versions); it stays local to that device.
- Bundled hymn texts: all in the public domain (authors died well before 1930) — safe to distribute.
- All code here: yours — no dependencies, no licenses to track.
- Adding any further translations (ESV, etc.) requires permission from their publishers — they
  grant free church-use licenses.

## Stabilisation and regression checks

Run `node --test tests/*.cjs` with Node.js 18 or newer. These tests use synthetic DOM/client objects and in-memory HTTP requests; they do not claim a real browser, Supabase, or hardware pass.

- Backups use a versioned JSON format containing songs, themes, the current service, named plans, settings, and referenced image/custom-Bible assets. Import validates before applying and asks before replacing matching records. Keep a backup before switching devices or accounts.
- Sync uses three-way comparisons against a per-account baseline, detects conflicting edits, and conditionally writes the cloud row. Independent additions/edits and deletions can merge; conflicting edits stop rather than overwrite either device. The recovery UI requires the deployed Supabase project to allow the app's `index.html` redirect URL.
- Device work mode, layout and local custom-Bible selections are not synced. Switching to another account is blocked while this device library is associated with its prior account; back up before resetting app data to change accounts.
- Empty Bible array slots preserve verse numbers absent from the bundled source. They are skipped during projection, and an absent single verse leaves the current slide unchanged. No wording is copied from another translation. The bundled WEB source is missing Romans 16:25–27; these positions remain explicitly empty pending source verification. This is not a certification of source text/encoding quality.
- Offline readiness requires a completed successful cache installation. Test an offline restart before relying on it during a service.

See `REPAIR_PROGRESS.md` for the current repair status and remaining validation.

## Three modes and browser offline readiness

| Mode | Account | Where work lives | Offline preparation |
|---|---|---|---|
| Base | None | This browser/device | Open once online and wait for **Ready offline • 3 Bibles + starter hymns**. No installation is needed. |
| Sync | Required for cloud transfer | Local copy plus the account’s songs, named plans, themes and logo | Pull the required library and prepare this browser before disconnecting. Conflicts remain explicit. |
| Local | None | This device | Same offline browser core, with an optional installed app icon. A new laptop with no prior internet still needs a separately transferred offline distribution. |

The initial core downloads exactly three Bibles (KJV, BSB and KJV with Strong’s), the Strong’s lexicon, the operator/output pages, scripts, font and the existing 34 starter hymns. WEB and ASV cache only when selected. The complete basic hymnary is awaiting selection of a collection/edition. Reopening a cached Bible does not re-download it in the background. Older cached optional Bible data from v28 is preserved during this update.

Output opens its page before asking for Window Management permission. On a compatible Chrome/Edge browser, allow the request to place the output on an extended screen. If permission is denied, the browser lacks the API, or no second screen is detected, the output stays usable and the operator gives a manual-placement instruction. The congregation’s screen can intentionally be black while Blank is active; the operator’s **Output connected** status distinguishes this from a page that never loaded.

Cloudflare’s canonical `/display` and `/display.html` map to the same offline output. Redirected cached responses are normalised so they do not fail navigation with `ERR_FAILED`.

## Lyrics storage and session behaviour

Base songs/drafts and temporary Service items use the current tab's session storage. Refresh preserves that workspace; **End session** clears its songs, draft and Service items and blanks any session lyrics on output, without deleting saved libraries or hymn packs. A new session cannot resume expired Base lyrics. Temporary queue entries cannot be saved into permanent named plans or exported/synced. Switching modes does not silently promote session songs: save them explicitly in Local/Sync.

Local saves songs, order and source credits on the device; Sync uses that local copy and the existing account sync when connected. Unsaved Local/Sync drafts remain on the device until a song is saved. Bundled hymn texts and saved songs work offline. Online search and account operations need a connection. LRCLIB is a community provider; results can vary or be unavailable. Source attribution does not itself grant performance or redistribution rights. SongSelect imports keep supplied credit text outside the projected lyrics.

No audio playback, media library or extra runtime dependencies were added.

## Wider lyrics search and supported links

Online search combines LRCLIB plain-lyrics records with lyrics.ovh/Deezer song suggestions. A suggestion fetches lyrics only when selected. Either source may fail independently; saved songs, paste and import remain usable. The Google link opens an ordinary search in a new tab; Kogg does not scrape Google or require a paid search account.

The existing Cloudflare Pages site runs a small `functions/api/lyrics.js` endpoint for source requests and supported-page imports. Import accepts only fixed source hosts: Hymnary `/text/` pages explicitly marking the **text** Public Domain, LRCLIB API song links, and lyrics.ovh API song links. Unsupported pages use copy/paste. Page imports discard page furniture and keep stanza boundaries and credits. Redirects, custom ports and credential-bearing URLs are rejected. Responses are `no-store`; the offline worker bypasses API routes so temporary Base lyrics do not become offline cache entries. Hymnary imports are spaced at least five seconds apart per running server instance. All other source requests have timeouts and size bounds.

Deploy the committed website and `functions/` together with Wrangler Pages. Static-only hosting keeps browser source search and Google links, but supported-page imports need the Cloudflare endpoint. No Brave account or API key was created; its card-backed credits did not meet the requested fully-free fallback.
