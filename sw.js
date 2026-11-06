/* KOGG Presenter — lightweight offline browser core. */
const CACHE = 'kogg-presenter-v110';
const ASSETS = [
  './', './index.html', './display.html', './landing.html',
  './icons/kogg-wordmark.svg', './icons/kogg-media.webp', './css/app.css', './css/display.css', './css/landing.css', './js/landing.js', './js/landing-tour.js', './js/app.js', './js/display.js',
  './js/sync.js', './js/library.js', './js/relay.js', './js/offline.js', './js/scripture-tools.js', './js/bible-providers.js', './js/content.js', './js/notes.js', './js/slides.js', './js/slides-deck.js', './js/stream.js', './js/stream-deck.js', './js/lyrics.js', './js/lyrics-sources.js',
  './js/supabase-config.js', './js/idb.js', './data/kjv.json', './data/bsb.json', './data/kjvs.json', './data/strongs.json', './data/hymns.json', './data/content-catalog.json', './data/hymnary-sources.txt',
  './fonts/NunitoSans-Variable.woff2', './manifest.webmanifest',
  './icons/kogg-symbol.svg', './icons/kogg-symbol-light.svg', './icons/kogg-symbol-white.svg', './icons/kogg-symbol-ink.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/icon.svg', './icons/icon-maskable.svg',
];
// Base prepares exactly KJV, BSB and KJV Strong’s plus its lexicon. Extra translations cache only when used.
const OPTIONAL_ASSETS = ['./data/hymns-extra.json','./data/web.json','./data/asv.json','./data/ylt.json','./data/darby.json','./data/akjv.json','./data/webster.json','./data/geneva1599.json','./data/lsv.json','./data/bbe.json','./data/erv.json'];
// BEGIN ASSET HASHES
const ASSET_HASHES = {
  "./": "76a867162eacdc2399794282c6d0343225357200810d3627955597556850cd40",
  "./index.html": "76a867162eacdc2399794282c6d0343225357200810d3627955597556850cd40",
  "./display.html": "a63c5f02bc198e097c6c70823e9250bae515b227369184686df6e0f43a65ca28",
  "./landing.html": "fb7e84f36fb7c8b0a824f22dbff6ef75f217686554a1ec74b6b94d32a18c64e8",
  "./icons/kogg-wordmark.svg": "783e193881395f9c39477d864d60e66870bdab8898cc88c218972af690dde29a",
  "./icons/kogg-media.webp": "d984963b8679d789f8bc0e08be3071f455810c73ad007eba94c1d8ee9a69e3fd",
  "./css/app.css": "e2ae7f25f7952baf4de2804f3356c6487cc75e3b87ba2b1a67a2cc0718e14c5e",
  "./css/display.css": "cba5d04db5ab53b43b80f173702aae122fc191017208fc6fee745fead57117e0",
  "./css/landing.css": "cb1da5d817e91fd9f7242c67ae40850c31ecea51bb6e46cc78ec519308d01e2c",
  "./js/landing.js": "322558f0ac47eb60147afca5a9d12b024c93c87e5e87e21bcb708496a318ff52",
  "./js/landing-tour.js": "d8eae2a2c71eafa56dc03356a66ed1775c61784a2dacf56dacf69e938cabc1b4",
  "./js/app.js": "e6143dda7b2c905d1b1ab4db6bd292936c6d9bd204d5d98af71c77b42a205a99",
  "./js/display.js": "1d07f134d782888bc45213ea36d146af6087e037d971c84b7cb550d2cfcd8e10",
  "./js/sync.js": "4935240f949dee4d23dbe5a9f90526bab53b653940cfd548e095157700044979",
  "./js/library.js": "76e26b3a2f04dd09f82e17acb739bc387e7493d28732306289e6dc49195a8cdd",
  "./js/relay.js": "dc8f1d89b82cf9457962ee2f57f8f5af191749cff1c285949a766216394194f1",
  "./js/offline.js": "b3dff202ffd9c9fb5d32765e55f56be7895add817ade94064ce7a84d8c52138a",
  "./js/scripture-tools.js": "31c0dba75d46a86efec7112bac9db32d06ea04f0ab018b88af5782300ead9a28",
  "./js/bible-providers.js": "0483b7b0adba1ac49017722f7d9e52e09fe0c2e2d66a6ddc0b0bea15477fe0f1",
  "./js/content.js": "ecca94b0c53ad29bda1f7da84fb43029e136d6070025f851da142405947c137d",
  "./js/notes.js": "e51f91dd590bf44b39235cec80cd88d90dbb72f0cb2838d2f361dbc895cadff6",
  "./js/slides.js": "7c4967a44ad392434801b207a361d1def24e1c663a028f6725e2b998ab23ea44",
  "./js/slides-deck.js": "a8d8bc4cef3d188a45726f90c5616adae6572604de3ecf9ae0248ffcdb070b98",
  "./js/stream.js": "19f837e16548c10f24e5155b55986ad38efb09d8d250d1a6b72e24aa2a2c969d",
  "./js/stream-deck.js": "092e14cf176291aee6051c3f5a9a0484ee09a54773ebc9ddf37900692ddca4d4",
  "./js/lyrics.js": "3d81bec572db4ddb26924c42b0896abd80f74b2113f7dfc030ae44e022761de5",
  "./js/lyrics-sources.js": "aa496d232469ed3570d3a6b82085c19545d936649a0a4564b3461cb89c7e920b",
  "./js/supabase-config.js": "5c3ebf851c7a921f6fc47a847ebb46a2abb507d228f8839cc760f1802c80abe5",
  "./js/idb.js": "9d2b847520d2e7fb9f2046e8be8e9362848c225980f71d62a9806e23dbae4d0f",
  "./data/kjv.json": "ab22e4f47e597771af955496f73a597f912abe31ed470390170e39c9fa9823c0",
  "./data/bsb.json": "b7020de50a79027c7df3b80bef74de882bf613cbc08094f5bfd192b05876d9e8",
  "./data/kjvs.json": "f60939897ef101d0b364093d01ec3a9f0fbcd016beb1c3117bd99cc361b10c2c",
  "./data/strongs.json": "ba4c61ee811ea77baef46ff8005f474c3ca17e82789f35555a7dec526dcae2d3",
  "./data/hymns.json": "72971f0b07610cff43aacdaa7155af61ce61e3e9599d1f4a31d77018e74b3fb6",
  "./data/content-catalog.json": "9939776f3690b781f2c574dc6eef1d2804e7b4aa7b46f261510d841e6b9a48c8",
  "./data/hymnary-sources.txt": "9b2bf737a72571c502c81769d25cd5b6888e55e9c546b87c8a07774484429361",
  "./fonts/NunitoSans-Variable.woff2": "2aa25c4d77cd59bc487ac0318544c175a33b8fd3cf6df4583854b07dcf9497a5",
  "./manifest.webmanifest": "9b5a303c853a7c975a43ad932c5542363cd06bf3ebc733844c5ab97c193724bf",
  "./icons/kogg-symbol.svg": "182327147c07285aa5d839c0fa4701d1dd3f35a2018d821e0f90c84c19a0a4ca",
  "./icons/kogg-symbol-light.svg": "22f7fe9f168bb86ecb27a83c4749504f0132c73bf502f54901f5c543b0712fd2",
  "./icons/kogg-symbol-white.svg": "0578bc70b82a13978981edd3292e18f3795f008b10647a1140c096a84d39617e",
  "./icons/kogg-symbol-ink.svg": "6c085d79eaefda3acc04404283550aec742fd802f354e284c4eca65a68f10341",
  "./icons/icon-192.png": "cc502ad57df5015fb97855b5f0b7b8c9eaae2932291af006e455564926bd89b1",
  "./icons/icon-512.png": "815bddb79ec14395bca695335e31c6bd7d954eb87abd17917f17fe9962c0f626",
  "./icons/icon-maskable-512.png": "7d23e38042e3a6930ad8b6281ac9c8838d0713293604aa7d8333b189af7828a7",
  "./icons/apple-touch-icon.png": "a5b631a16c43bc5e5eb3afa00983c35e57ba9ea8048feb40c3f991b0ac249294",
  "./icons/icon.svg": "5a0f198d5f641be8ba303ba04515bd2a317c912f50445e1c33b89a2ca995b30a",
  "./icons/icon-maskable.svg": "3bae5f287c463637c98be5d0a4bef622d7d07d5d0eee6a33cc0d7585d946d4fd",
  "./data/hymns-extra.json": "9f30b9660889ba3a54068ffa56674df34d9a8698519067ef8e164f4a5de432fb",
  "./data/web.json": "29ef26a1b12dde5612d4cabd2a6b08d6925e1375244bc38aacc8fbf2864566e8",
  "./data/asv.json": "698bd7d0b21ecdf17061c43edf6aee8e13a45a755a6bdc6221300f39693b53e8",
  "./data/ylt.json": "94ded2ddfa69ce361ad257e2a2b5534f5a130dd5b0e213653b0a44b1de4afffc",
  "./data/darby.json": "0ccea1fe1c7257adbe098c8017c16bc7292c18e9e34c5a9ee6fd43fa065bee35",
  "./data/akjv.json": "facc7c20df5925e996bcadf7bbcc8edc935477d4a5e025ef3bc3e9a09ffd82ec",
  "./data/webster.json": "b647825d5f976de341fa9fed94b0afc0ab4e97ca7cd2687174fe0a42333d993d",
  "./data/geneva1599.json": "22ec538e99b823acb4a0783f037d79f23b6f4851cd6b48f98ae92240593c643a",
  "./data/lsv.json": "0645e5b2bacd0ec8ec450ebb3324a2f147e7ec19a63f198ea9e9de6426f1b28b",
  "./data/bbe.json": "4ab11d2c8143c2f2610dac80d832128f6a1db9d943581a4e7941986166e2a512",
  "./data/erv.json": "b8a3a9f70ef06dfc2c3e5b6c1669f3b3225760a103415f74c6fb30741613ca2b"
};
// END ASSET HASHES
const HASH_KEY = './__asset_hashes__';
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
    const refreshOptional=new Set();
    // Carry only verified unchanged content; legacy caches are hashed once.
    for(const prior of (await caches.keys()).filter(key=>key.startsWith('kogg-presenter-')&&key!==CACHE).reverse()){
      const old=await caches.open(prior);let priorHashes={};
      try{const metadata=await old.match(cacheKey(HASH_KEY));if(metadata)priorHashes=await metadata.json();}catch{}
      for(const asset of new Set([...ASSETS,...OPTIONAL_ASSETS])){
        if(await cache.match(cacheKey(asset)))continue;
        const response=await old.match(cacheKey(asset));if(!response)continue;
        let unchanged=priorHashes[asset]&&priorHashes[asset]===ASSET_HASHES[asset];
        if(!priorHashes[asset]&&typeof crypto!=='undefined'&&crypto.subtle){const digest=await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer());unchanged=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')===ASSET_HASHES[asset];}
        if(unchanged)await cache.put(cacheKey(asset),usableResponse(response));
        else if(OPTIONAL_ASSETS.includes(asset))refreshOptional.add(asset);
      }
    }
    await notify();
    await Promise.all([...ASSETS,...refreshOptional].map(async asset => {
      const key = cacheKey(asset);
      if (!await cache.match(key)) {
        const response = await fetch(key,{cache:'reload',redirect:'follow'});
        if (!response.ok) throw new Error('Could not prepare ' + asset);
        await cache.put(key,usableResponse(response));
      }
      await notify();
    }));
    await cache.put(cacheKey(HASH_KEY),new Response(JSON.stringify(ASSET_HASHES),{headers:{'Content-Type':'application/json'}}));
  })().catch(async error => { await notify(error.message); throw error; }).finally(() => { preparing = null; });
  return preparing;
}
self.addEventListener('install', event => { event.waitUntil(prepareOffline()); });
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
  // A release stays immutable. Update installation prepares the next complete
  // release separately; it activates after old operator/output tabs are closed.
  event.respondWith(cached().then(response=>response?usableResponse(response):network()).catch(offline));
});
