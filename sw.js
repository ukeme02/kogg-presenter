/* KOGG Presenter — lightweight offline browser core. */
const CACHE = 'kogg-presenter-v121';
const ASSETS = [
  './', './index.html', './display.html', './landing.html',
  './icons/kogg-wordmark.svg', './icons/kogg-media.webp', './css/app.css', './css/display.css', './css/landing.css', './js/landing.js', './js/landing-tour.js', './js/landing-experience.js', './css/landing-experience.css', './js/app.js', './js/theme-studio.js', './js/display.js',
  './js/sync.js', './js/library.js', './js/relay.js', './js/obs-connect.js', './js/obs-receiver.js', './js/offline.js', './js/scripture-tools.js', './js/bible-providers.js', './js/content.js', './js/notes.js', './js/slides.js', './js/slides-deck.js', './js/stream.js', './js/stream-deck.js', './js/remote-operator.js', './js/cloud-transport.js', './js/cloud-remote-session.js', './js/cloud-remote-operator.js', './js/rehearsal.js', './js/rehearsal-deck.js', './js/lyrics.js', './js/lyrics-sources.js',
  './js/supabase-config.js', './js/idb.js', './data/kjv.json', './data/bsb.json', './data/kjvs.json', './data/strongs.json', './data/hymns.json', './data/content-catalog.json', './data/hymnary-sources.txt',
  './fonts/NunitoSans-Variable.woff2', './manifest.webmanifest',
  './icons/kogg-symbol.svg', './icons/kogg-symbol-light.svg', './icons/kogg-symbol-white.svg', './icons/kogg-symbol-ink.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/icon.svg', './icons/icon-maskable.svg',
];
// Base prepares exactly KJV, BSB and KJV Strong’s plus its lexicon. Extra translations cache only when used.
const OPTIONAL_ASSETS = ['./data/hymns-extra.json','./data/web.json','./data/asv.json','./data/ylt.json','./data/darby.json','./data/akjv.json','./data/webster.json','./data/geneva1599.json','./data/lsv.json','./data/bbe.json','./data/erv.json'];
// BEGIN ASSET HASHES
const ASSET_HASHES = {
  "./": "dcbab28c6154538ab7b7086f8337322ba41491fdacdb33f3c61055f72d38c63d",
  "./index.html": "dcbab28c6154538ab7b7086f8337322ba41491fdacdb33f3c61055f72d38c63d",
  "./display.html": "f0bbf1c1d810c4e6e58b785e9b3b8ac936487144e43eedffacdc028d2d01536b",
  "./landing.html": "a8b30f14b2fc413dfdb609152e0966b74954bcac24114dfc1c1e5ad6f0e83008",
  "./icons/kogg-wordmark.svg": "783e193881395f9c39477d864d60e66870bdab8898cc88c218972af690dde29a",
  "./icons/kogg-media.webp": "d984963b8679d789f8bc0e08be3071f455810c73ad007eba94c1d8ee9a69e3fd",
  "./css/app.css": "cced905bcf67658195f156e44cd94d386d0ff2e8f36b0d846a84c5dca32af8c1",
  "./css/display.css": "020d348a049a5cbf45f01b2c32669773bb444e0e2b5486d3108a15ded6b5975b",
  "./css/landing.css": "79c876e579c2a032accbbb24e4a9651260cad4383b2e27d963af8a8f40c7eaff",
  "./js/landing.js": "12dfe3b01b89fa48124e9a9f4a4581c8b2bd5c73debfcb799ae78d90e3ec3173",
  "./js/landing-tour.js": "d8eae2a2c71eafa56dc03356a66ed1775c61784a2dacf56dacf69e938cabc1b4",
  "./js/landing-experience.js": "a3bfebd9a84c486554069be7fbd884bbb33419fd46d6f198eeba2c7e07fb9520",
  "./css/landing-experience.css": "b52666180eb258152fdc73d453ff82850ca42be7988389cdf59ce8be1cb12ba0",
  "./js/app.js": "45b8cc97c432d21fe32332c7d33a5ea239d22ada228394a9750cb8a4509066f8",
  "./js/theme-studio.js": "f566118922d25f926d5d35b127ce482fad155c1e8a197ae67a7fe157ea456463",
  "./js/display.js": "ca6c97175a89973a670e2c1ed796b13250b33ec7eed8ac1a48d18863e873cf55",
  "./js/sync.js": "4935240f949dee4d23dbe5a9f90526bab53b653940cfd548e095157700044979",
  "./js/library.js": "76e26b3a2f04dd09f82e17acb739bc387e7493d28732306289e6dc49195a8cdd",
  "./js/relay.js": "815f63d30b713de1896ed859f5158e82641cc4345d671626329e62a153ef11a7",
  "./js/obs-connect.js": "b49be45073c8eed17170762ae2502ded249d62223fa46f50a972503e368dba4a",
  "./js/obs-receiver.js": "41a9a876b45b6b077572b8db11aecaa15f52f82383afbd506070b5fd9a6aee43",
  "./js/offline.js": "9ce23f047a824bc84ee1814aa6c7c657f18551b3de5b6fe855420a4b99b19acb",
  "./js/scripture-tools.js": "31c0dba75d46a86efec7112bac9db32d06ea04f0ab018b88af5782300ead9a28",
  "./js/bible-providers.js": "0483b7b0adba1ac49017722f7d9e52e09fe0c2e2d66a6ddc0b0bea15477fe0f1",
  "./js/content.js": "ecca94b0c53ad29bda1f7da84fb43029e136d6070025f851da142405947c137d",
  "./js/notes.js": "e51f91dd590bf44b39235cec80cd88d90dbb72f0cb2838d2f361dbc895cadff6",
  "./js/slides.js": "7c4967a44ad392434801b207a361d1def24e1c663a028f6725e2b998ab23ea44",
  "./js/slides-deck.js": "a8d8bc4cef3d188a45726f90c5616adae6572604de3ecf9ae0248ffcdb070b98",
  "./js/stream.js": "56b355c17acf7e230ce0ae3d7574f77fe44d644bf72283dd81771b7d9e34e250",
  "./js/stream-deck.js": "fa81812c28efa72f4455b56976f1ac303d208feeb1e13051e3a9855b03432c96",
  "./js/remote-operator.js": "1815befed61f7b24de0f52abf945f0507bf39150afb7fb8e0c5770a364dc30e6",
  "./js/cloud-transport.js": "44bc38eac718786ce846a5e468bd86e4535ac7ce65f0bfc9b41d3a307df22a88",
  "./js/cloud-remote-session.js": "b6de0f159dfb9e140b5ade68e862fe0479cb3c4af85e674bee0c7715e2dd82e5",
  "./js/cloud-remote-operator.js": "ba513843b5db359a78658c4b19afca017bbc671c10a378e9c51c77094c262732",
  "./js/rehearsal.js": "3f384aa4865dce3970cb3fb9b98346286419e0cda728ff466a0ca0e3179a3c01",
  "./js/rehearsal-deck.js": "78dc8329e8cedf9819c2d57227382ee40f124d764235e2b5aa82d37c47fb985d",
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
