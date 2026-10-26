# KOGG Presenter

A lightweight, fully offline church presentation app for scriptures, lyrics and lower thirds.
Built on a **free stack only**: plain HTML/CSS/JS (no framework, no build step), IndexedDB/localStorage
for storage, and a service worker for offline use. The same code runs as an Android app, in any
browser, and can be packaged for Windows, iOS, and desktop.

## What's inside

| Feature | Details |
|---|---|
| Scripture display | Full offline KJV Bible (public domain, 66 books / 31,102 verses) in `data/kjv.json` |
| Lyrics library | Songs split into slides with `[Verse 1]` / `[Chorus]` labels, search, editor |
| Web lyrics import | Paste any lyrics-page URL → text is fetched, cleaned and saved locally (offline after that) |
| Service plan | Ordered queue of songs + scriptures, named plans save/load, whole-service live mode |
| Live output | `display.html` — clean full-screen projector view, synced instantly with the operator |
| Themes | 14 gradient backgrounds + custom background images, text color, font, font size |
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

## Pair with OBS Studio

In OBS: **Sources → + → Browser**, paste `…/display.html?overlay=1` (the Tools tab shows and copies
the exact URL), set 1920×1080 @ 30 FPS. That source is **transparent** — it draws only slide text
and lower thirds on top of your camera/screenshare scenes. Put it as the top layer:

- Slide text appears/disappears over your video when the operator advances.
- Lower thirds (Tools tab) slide in over the video with names/titles.
- "Blank" in overlay mode hides everything from KOGG (full transparency), leaving your scene clean.

You can add a second browser source *without* `?overlay=1` for a full opaque slide scene.

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
church-presenter/
├── index.html          operator console
├── display.html        projector output screen
├── css/                app.css (operator), display.css (output)
├── js/                 app.js (operator), display.js (output)
├── data/kjv.json       offline KJV Bible (public domain)
├── icons/              SVG app icons
├── manifest.webmanifest  PWA manifest
└── sw.js               service worker (offline cache)
```

## Roadmap ideas

- Cross-device remote control (phone → laptop display) via a small WebRTC/WebSocket relay
- More translations (WEB, ASV — also public domain) with a translation picker
- Quick full-text Bible search; bookmarks; verse-of-the-day
- Announcement slides with auto-rotation
- Stage/confidence view showing the worship team what's next
- OpenLyrics import; import songs in bulk from CSV/text
- Cloud sync of the library (free tier of Firebase/Supabase) for shared song databases
- Native dual-display (different content on phone screen vs HDMI) would require the native
  Kotlin route — current design keeps one codebase instead

## Licensing notes

- KJV text: public domain.
- All code here: yours — no dependencies, no licenses to track.
- If you add modern translations (NIV, ESV, etc.), you must obtain permission from their
  publishers (they grant free church-use licenses) — WEB/ASV/KJV need nothing.
