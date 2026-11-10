/* KOGG Presenter — lightweight offline browser core. */
const CACHE = 'kogg-presenter-v129';
const ASSETS = [
  './wifi-remote/index.html', './wifi-remote/sw.js', './css/remote.css', './css/wifi-remote.css', './js/wifi-transport.js', './js/wifi-pairing.js', './js/wifi-remote.js', './js/wifi-remote-operator.js', './js/vendor/qrcode.js', './js/vendor/jsqr.js',
  './js/media-sync.js', './js/service-media.js', './js/media.js', './js/media-deck.js', './js/media-display.js',
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
  "./wifi-remote/index.html": "40c42b1e5696c264854f6075897578a1c2c20bd97672e616751c28718b150764",
  "./wifi-remote/sw.js": "edadf9e2bcc6d204dcccacd63ad9a4fbfe89852b169be84ff6d24e2423f1ca09",
  "./css/remote.css": "0f11fc5fcc0762265eecbec39f14db3f1e77255640f393cbfe4a3a631784d3c4",
  "./css/wifi-remote.css": "23cd80b84907376af0f559adb10c97a689eaff5058fb4753dc7729811b4c7480",
  "./js/wifi-transport.js": "50e7b0159df25a15576998eddff4826d8ee74265d299605538a94b692f6f1710",
  "./js/wifi-pairing.js": "e8b0d9a970b2dfe7682285c1954327bebfa0fcec417bb150a84efee0062e8fcb",
  "./js/wifi-remote.js": "1e6906d7aebd8c8f555ee086f2f16e6fb102b1c45bdb6c883f3449c8039a04f2",
  "./js/wifi-remote-operator.js": "eee67005315847d3fc6ccc44a3936b2097bbb28a82b74a42f72bb890a7ca50a7",
  "./js/vendor/qrcode.js": "79ec86f82856005b1c887905cfccfcfbec3821ca61c7fd5a952faa5f778f791c",
  "./js/vendor/jsqr.js": "bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859",
  "./js/media-sync.js": "5bfc8d70552d3c737be02d61ebf32066bfb345c33bcbba3fc2c0d15d109ed1a7",
  "./js/service-media.js": "cd0c0f5985b23de6849e0bd86c8a64ad5ff46c97023203f9e6e9fe1c265b73bc",
  "./js/media.js": "e6ee2ab9c19eb553a91bc736c42d095554d67b32550f5638f94b2caae758d0cb",
  "./js/media-deck.js": "f66a3bb4ac806f1a2f44fe3c475c20032fe63914a6bfe16a9587ce75f1ab947d",
  "./js/media-display.js": "967ca42aa916c9f03b5672975f2e051377dd2da3b8e2086b5ba4162be93d9ca0",
  "./": "307ff9a8aaf951ebb91377fbff2874bd5ed581b35fc4f2bc142d07a89a0bae2a",
  "./index.html": "307ff9a8aaf951ebb91377fbff2874bd5ed581b35fc4f2bc142d07a89a0bae2a",
  "./display.html": "d670ba104fe9d491126a947c701c1e6d774253f4e472b0f6ef3d7c0096702f48",
  "./landing.html": "838deb417839241f3fbd9698722a1ce592d8f8162184a6e6ee40ae3c13925411",
  "./icons/kogg-wordmark.svg": "783e193881395f9c39477d864d60e66870bdab8898cc88c218972af690dde29a",
  "./icons/kogg-media.webp": "d984963b8679d789f8bc0e08be3071f455810c73ad007eba94c1d8ee9a69e3fd",
  "./css/app.css": "d731ef40fc0b69deae511f7cb8ebf22f369e72bd3eef907854ff3d2e87d2b929",
  "./css/display.css": "f7fde52d8a7a9e18cbb75099e4270c4978a95786d8561018a5a97b69bc942c81",
  "./css/landing.css": "050661cb16be3fb6671b0b164223999bb2c492ca535a981d630a86c1fdcf819a",
  "./js/landing.js": "94363bf462c6b6609865e987b06893dadd40d59213fc9cec79846772a206bb29",
  "./js/landing-tour.js": "9d4a74a9c470a38a31b68d9b10893502d461a5428401d72ccb1a0203a65fec3e",
  "./js/landing-experience.js": "69cee2145444bb1cf4f1ac16c7e3be6e6ddae0e5ef66ec3b93f4f89c4fe9a62e",
  "./css/landing-experience.css": "160a8a532061ddbe0211dfc5cbb0eb149d06e2d08a7c9de4214acb2a874cd477",
  "./js/app.js": "1ac7ab9da34e0ed8d95dbaed4880c8b00a7befbbf15734218f9fc8dc7594bd42",
  "./js/theme-studio.js": "34a167a219d0e9d7aee62293d5c2ce2deb26a839acf4907499a9e8d19244bde9",
  "./js/display.js": "67529a06691400468288be2146572adea20a7a249b6e3b760e88b6ef360c69f3",
  "./js/sync.js": "d447cd697db6291039db9f961e2f86b157e54b9073e13cc517aa1311c1c8c083",
  "./js/library.js": "ed00e5f1da6da2fd6bed56bffd8e4b49360db22efb08136440e073458895da1d",
  "./js/relay.js": "effcd13dce55c706a06aa43d20605d93d6043270eb73e38514657cbb7d45cf31",
  "./js/obs-connect.js": "b49be45073c8eed17170762ae2502ded249d62223fa46f50a972503e368dba4a",
  "./js/obs-receiver.js": "41a9a876b45b6b077572b8db11aecaa15f52f82383afbd506070b5fd9a6aee43",
  "./js/offline.js": "2705490a62161f17bfc9d49fd3150a0e6b8954170242d712e2b4f59f5e09e491",
  "./js/scripture-tools.js": "31c0dba75d46a86efec7112bac9db32d06ea04f0ab018b88af5782300ead9a28",
  "./js/bible-providers.js": "0483b7b0adba1ac49017722f7d9e52e09fe0c2e2d66a6ddc0b0bea15477fe0f1",
  "./js/content.js": "a2a02214e36ae3c2d99b592fdb00efdf98dc6e38648ae48dd4dca17575e833a5",
  "./js/notes.js": "19a7c289292a2bf363f5467d03ffb5dbd1df4405e945a73fce9e6a568378b305",
  "./js/slides.js": "218bfe920a1fd4e17b7616bf1752bf3374438f04f3f27fe85254482de20dbdce",
  "./js/slides-deck.js": "fe7effe5577335e0e531d260e0acff27c2a871b63114fb0935d2fbcef698db62",
  "./js/stream.js": "bd17d6bc117706b39eaca9d6f9e5b2c43acd196ca9ad106cc6173de03aa01db8",
  "./js/stream-deck.js": "a61d6507ca86e0569755f5f43d24b41eb3ac9451eed0f2aeda8f76f2bf545950",
  "./js/remote-operator.js": "1861a92a04a2bb92259724cc82056b1affb27771ea25aac1b787c498cc395d68",
  "./js/cloud-transport.js": "ba27c50efd060f604adb61d3467abf80dab6ce0b99fa49fd5f86b8b31cef2350",
  "./js/cloud-remote-session.js": "605cc2afdc44f2692cb00df4963cf83d8c96a3b6d6c8f17ae092e5d23cd0dd47",
  "./js/cloud-remote-operator.js": "2cb9712de517586c9774d52dae65248d4b8ba1d0fa426fdb8b9cd6135500f6f5",
  "./js/rehearsal.js": "0f977495ef65cca8d006560be6735ea49037a0f212738ea6233f23b1a44c1657",
  "./js/rehearsal-deck.js": "9ded76d2a063babe8e36819058cc57b595ae965df3627b47379b6208111bb2c7",
  "./js/lyrics.js": "19f0c3cab06e856736d2d139f06c45bf90d1d3836a4457e0e4190e3fbeed802a",
  "./js/lyrics-sources.js": "a5e1ce064b7873e4422325fa761043c28b36f4c541995c6464dfd5880f1e2da3",
  "./js/supabase-config.js": "5c3ebf851c7a921f6fc47a847ebb46a2abb507d228f8839cc760f1802c80abe5",
  "./js/idb.js": "9d2b847520d2e7fb9f2046e8be8e9362848c225980f71d62a9806e23dbae4d0f",
  "./data/kjv.json": "ab22e4f47e597771af955496f73a597f912abe31ed470390170e39c9fa9823c0",
  "./data/bsb.json": "b7020de50a79027c7df3b80bef74de882bf613cbc08094f5bfd192b05876d9e8",
  "./data/kjvs.json": "f60939897ef101d0b364093d01ec3a9f0fbcd016beb1c3117bd99cc361b10c2c",
  "./data/strongs.json": "ba4c61ee811ea77baef46ff8005f474c3ca17e82789f35555a7dec526dcae2d3",
  "./data/hymns.json": "72971f0b07610cff43aacdaa7155af61ce61e3e9599d1f4a31d77018e74b3fb6",
  "./data/content-catalog.json": "6b9425fa6241946fe4b53497c2a4400296095178600666bb7b9c71f887e74f80",
  "./data/hymnary-sources.txt": "9b2bf737a72571c502c81769d25cd5b6888e55e9c546b87c8a07774484429361",
  "./fonts/NunitoSans-Variable.woff2": "2aa25c4d77cd59bc487ac0318544c175a33b8fd3cf6df4583854b07dcf9497a5",
  "./manifest.webmanifest": "609a751b1c2f44b406ffd2dc0713f1aa901cccd5af1ce3fe06cf2ee64a66cfb6",
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
  if (/\/wifi-remote\/?$/.test(url.pathname)) url.pathname = url.pathname.replace(/\/?$/, '/index.html');
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
