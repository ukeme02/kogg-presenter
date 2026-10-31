/* KOGG Presenter — lightweight offline browser core. */
const CACHE = 'kogg-presenter-v52';
const ASSETS = [
  './', './index.html', './display.html', './landing.html',
  './css/app.css', './css/display.css', './css/landing.css', './js/landing.js', './js/app.js', './js/display.js',
  './js/sync.js', './js/library.js', './js/relay.js', './js/offline.js', './js/scripture-tools.js', './js/bible-providers.js', './js/content.js', './js/lyrics.js', './js/lyrics-sources.js',
  './js/supabase-config.js', './js/idb.js', './data/kjv.json', './data/bsb.json', './data/kjvs.json', './data/strongs.json', './data/hymns.json', './data/content-catalog.json', './data/hymnary-sources.txt',
  './fonts/NunitoSans-Variable.woff2', './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-maskable.svg',
];
// Base prepares exactly KJV, BSB and KJV Strong’s plus its lexicon. Extra translations cache only when used.
const OPTIONAL_ASSETS = ['./data/hymns-extra.json','./data/web.json','./data/asv.json','./data/ylt.json','./data/darby.json','./data/akjv.json','./data/webster.json','./data/geneva1599.json','./data/lsv.json','./data/bbe.json','./data/erv.json'];
const BIG = /\.(json|woff2)$/;
let preparing = null;
function cacheKey(input) {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  if (/\/(display|landing|index)$/.test(url.pathname)) url.pathname += '.html';
  url.search = '';
  return url.href;
}
function usableResponse(response) {
  // A cached redirected response can fail navigation requests with ERR_FAILED.
  return response.redirected ? new Response(response.body, {status:response.status,statusText:response.statusText,headers:response.headers}) : response;
}
async function offlineStatus(error) {
  const cache = await caches.open(CACHE);
  const present = await Promise.all(ASSETS.map(asset => cache.match(cacheKey(asset))));
  const done = present.filter(Boolean).length;
  return {type:'offline-status',ready:done === ASSETS.length,done,total:ASSETS.length,error:error || ''};
}
async function notify(error) {
  const message = await offlineStatus(error);
  const clients = await self.clients.matchAll({includeUncontrolled:true});
  clients.forEach(client => client.postMessage(message));
}
async function prepareOffline() {
  if (preparing) return preparing;
  preparing = (async () => {
    const cache = await caches.open(CACHE);
    // Keep already-downloaded optional data from the previous verified data version.
    for (const prior of (await caches.keys()).filter(key => key.startsWith('kogg-presenter-') && key !== CACHE).reverse()) {
      if (!(await caches.keys()).includes(prior)) continue;
      const old = await caches.open(prior);
      for (const asset of OPTIONAL_ASSETS) {
        const response = await old.match(cacheKey(asset));
        if (response && !await cache.match(cacheKey(asset))) await cache.put(cacheKey(asset),usableResponse(response));
      }
    }
    await notify();
    await Promise.all(ASSETS.map(async asset => {
      const key = cacheKey(asset);
      if (!await cache.match(key)) {
        const response = await fetch(key,{cache:'reload',redirect:'follow'});
        if (!response.ok) throw new Error('Could not prepare ' + asset);
        await cache.put(key,usableResponse(response));
      }
      await notify();
    }));
  })().catch(async error => { await notify(error.message); throw error; }).finally(() => { preparing = null; });
  return preparing;
}
self.addEventListener('install', event => { event.waitUntil(prepareOffline().then(() => self.skipWaiting())); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('kogg-presenter-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()).then(() => notify()));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'offline-status-request') event.waitUntil(offlineStatus().then(status => event.source?.postMessage(status)));
  if (event.data?.type === 'prepare-offline') event.waitUntil(prepareOffline());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin || (url.pathname.startsWith('/__kogg/') || /\/api\//.test(url.pathname))) return;
  const cached = () => caches.open(CACHE).then(cache => cache.match(cacheKey(event.request)));
  const network = async () => {
    const response = usableResponse(await fetch(event.request,{redirect:'follow'}));
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(cacheKey(event.request),response.clone()).catch(() => {});
    }
    return response;
  };
  const offline = () => new Response('Not available offline yet. Reconnect in the operator and retry preparing offline.',{status:503});
  if (BIG.test(url.pathname)) {
    // Reopening a cached Bible does not start another multi-megabyte background download.
    event.respondWith(cached().then(response => response ? usableResponse(response) : network()).catch(offline));
  } else {
    event.respondWith(network().then(async response => response.ok ? response : usableResponse(await cached() || response))
      .catch(async () => { const response = await cached(); return response ? usableResponse(response) : offline(); }));
  }
});
