/* KOGG Presenter service worker — offline-first */
const CACHE = 'kogg-presenter-v9';
const ASSETS = [
  './',
  './index.html',
  './display.html',
  './landing.html',
  './css/app.css',
  './css/display.css',
  './js/app.js',
  './js/display.js',
  './js/sync.js',
  './js/supabase-config.js',
  './js/idb.js',
  './data/kjv.json',
  './data/bsb.json',
  './data/kjvs.json',
  './data/web.json',
  './data/asv.json',
  './data/hymns.json',
  './fonts/NunitoSans-Variable.woff2',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
];

/* heavy, rarely-changing files (bibles + font) stay cache-first so the
   ~23 MB of data isn't re-downloaded every visit; updates land by the next visit */
const BIG = /\.(json|woff2)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;   // Supabase, CDNs — leave to the network

  if (BIG.test(url.pathname)) {
    /* bibles + font: cached copy first, refresh in the background for next time */
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fresh = fetch(e.request).then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        }).catch(() => cached);
        return cached || fresh;
      })
    );
  } else {
    /* app shell (html/js/css): always try the network first — deploys show up
       on the very next load; cache is the offline fallback */
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() =>
        caches.match(e.request, { ignoreSearch: true })
          .then(c => c || new Response('Offline — not in cache yet', { status: 503 }))
      )
    );
  }
});
