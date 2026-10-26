/* KOGG Presenter service worker — offline-first */
const CACHE = 'kogg-presenter-v5';
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
  './data/kjv.json',
  './data/web.json',
  './data/asv.json',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
];

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
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
