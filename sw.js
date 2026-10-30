/* KOGG Presenter service worker — offline-first */
const CACHE = 'kogg-presenter-v28';
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
  './js/library.js',
  './js/relay.js',
  './js/supabase-config.js',
  './js/idb.js',
  './data/kjv.json',
  './data/bsb.json',
  './data/kjvs.json',
  './data/web.json',
  './data/asv.json',
  './data/strongs.json',
  './data/hymns.json',
  './fonts/NunitoSans-Variable.woff2',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
];

/* heavy, rarely-changing files (bibles + font + lexicon) stay cache-first so the
   ~35 MB of data isn't re-downloaded every visit; updates land by the next visit */
const BIG = /\.(json|woff2)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('kogg-presenter-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/__kogg/')) return;
  const cached = caches.open(CACHE).then(c => c.match(e.request, {ignoreSearch: !BIG.test(url.pathname)}));
  const network = fetch(e.request).then(async response => {
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(e.request, response.clone()).catch(() => {});
    }
    return response;
  });
  // Register background work during event dispatch so it survives a cached response.
  e.waitUntil(network.then(() => undefined).catch(() => undefined));
  const offline = () => new Response('Offline — not in cache yet', {status:503});
  if (BIG.test(url.pathname)) {
    e.respondWith(cached.then(value => value || network).catch(offline));
  } else {
    e.respondWith(network.then(async response => response.ok ? response : (await cached) || response)
      .catch(() => cached.then(value => value || offline())));
  }
});
