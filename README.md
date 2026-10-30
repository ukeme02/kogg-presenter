# KOGG Presenter

A lightweight, fully offline church presentation app for scriptures, lyrics and lower thirds.
Built on a **free stack only**: plain HTML/CSS/JS (no framework, no build step), IndexedDB/localStorage
for storage, and a service worker for offline use. The same code runs as an Android app, in any
browser, and can be packaged for Windows, iOS, and desktop.

## What's inside

| Feature | Details |
|---|---|
| Scripture display | **Five offline Bibles out of the box** — KJV, BSB (Berean Standard), **KJV with Strong's numbers**, **NIV** and **NLT** (WEB and ASV still included). One-page dock layout: Books, Chapters, Verses and Memory on screen at once — tap numbers to go live instantly, with prev/next verse buttons that walk the Bible book by book |
| Add versions | Tools tab → **Scripture versions**: import your own Bible JSON in Sync/Local Mode; it is stored in the device (IndexedDB) and appears in the translation list everywhere |
| Strong's tap-to-define | In the KJV Strong's Bible, word numbers appear in the **"On the projector" preview only** — the congregation never sees them. Tap a number and the word's Hebrew/Greek meaning (original word, transliteration, definition, KJV usage) takes the projector screen; tap the same number again to flip back to the verse. Toggle off in Tools → Strong's numbers |
| Quick jump | Its own resizable dock: type `jn 3:16` / `jn 3 16` / `1sam 2` — the book auto-completes on 1–2 letters, then chapter, then verse goes live as you type |
| Whole-Bible search | Its own resizable dock: find verses by remembered words/phrase across the loaded translation |
| Word emphasis | In the "On the projector" preview, press and drag across words — the projector highlights them live, in a marker style; click anywhere else to clear |
| Screen startup | The projector starts **plain black** in Nunito Sans Expanded Bold — blank until you put something live; Blank/Logo buttons are one tap |
| Slide switcher (float) | The floating ◀ ▶ crew widget bottom-right is toggleable from the 🧩 Docks menu |
| Floating quick edit | A− / A+ / ⬌ text size + alignment in a small draggable floating window — toggle from the ⋯ menu ("Floating quick edit") |
| Version chips | A row of translation chips under the projector preview — switch the Bible mid-show with one tap and the current verses go live in the new translation |
| Memory dock | Every scripture you put live stays in the session Memory dock — tap to re-show during the sermon (clears on reload) |
| Lyrics library | Songs split into slides with `[Verse 1]` / `[Chorus]` labels, search, editor |
| Starter hymns | 34 public-domain hymns bundled (`data/hymns.json`) — added on first run, or via the **+ Starter Hymns** button |
| Church logo | Tools tab → upload once; it shows on the Logo screen and follows your sync account |
| Web lyrics import | Paste any lyrics-page URL → text is fetched, cleaned and saved locally (offline after that) |
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
| Docks | Seven movable/resizable docks over a 12×12 grid — drag the title grip to reposition, corner handle to size, double/halve with Span. **🧩 Docks menu** in the Scripture toolbar picks which docks are visible; layout locks with 🔒 |
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

- KJV, WEB, ASV texts: public domain. BSB (Berean Standard Bible): free to use and redistribute.
- Strong's lexicon data: public domain (OpenScriptures).
- **NIV** © Biblica and **NLT** © Tyndale House Foundation are bundled in this repository for
  personal/church use — both grant free use of Scripture quotations in non-commercial settings.
  If you redistribute this app commercially or at scale, check each translation's current policy
  (`www.biblica.com`, `www.tyndale.com`) first.
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
