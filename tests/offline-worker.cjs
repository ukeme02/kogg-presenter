const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function worker(){const handlers={},stores=new Map(),calls=[],messages=[];let offline=false;const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {async match(key){return map.get(typeof key==='string'?key:key.url)?.clone();},async put(key,response){map.set(typeof key==='string'?key:key.url,response);}};},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}};const c=vm.createContext({crypto:require('node:crypto').webcrypto,Uint8Array,URL,Response,Promise,location:{href:'https://example.test/app/sw.js',origin:'https://example.test'},caches,fetch:async(input)=>{if(offline)throw new Error('offline');const url=typeof input==='string'?input:input.url;calls.push(url);const response=new Response('fixture '+url,{status:200});if(url.endsWith('display.html'))Object.defineProperty(response,'redirected',{value:true});return response;},self:{addEventListener:(name,fn)=>handlers[name]=fn,clients:{matchAll:async()=>[{postMessage:message=>messages.push(message)}],claim:async()=>{}},skipWaiting:async()=>{}}});vm.runInContext(fs.readFileSync('sw.js','utf8'),c);return {hashes:vm.runInContext('ASSET_HASHES',c),handlers,stores,calls,messages,caches,setOffline(){offline=true;},async install(){let promise;handlers.install({waitUntil:p=>promise=p});await promise;},async fetch(path){let promise;handlers.fetch({request:{url:'https://example.test/app/'+path,method:'GET'},respondWith:p=>promise=p});return promise;}};}
test('Base prepares exactly the three specified Bibles and the Strong’s lexicon',async()=>{const w=worker();await w.install();for(const file of ['kjv.json','bsb.json','kjvs.json','strongs.json','hymns.json'])assert(w.calls.some(u=>u.endsWith('/data/'+file)),file);for(const file of ['asv.json','web.json'])assert(!w.calls.some(u=>u.endsWith(file)),file);assert(w.messages.at(-1).ready);});
test('offline output works at both redirected and canonical page addresses',async()=>{const w=worker();await w.install();w.setOffline();for(const path of ['display.html','display']){const response=await w.fetch(path);assert.equal(response.status,200);assert.equal(response.redirected,false);assert.match(await response.text(),/display.html/);}});
test('cached Bible reopening performs no network download',async()=>{const w=worker();await w.install();const count=w.calls.length;const response=await w.fetch('data/kjv.json');assert.equal(response.status,200);assert.equal(w.calls.length,count);});
test('incomplete initial preparation never reports ready',async()=>{const w=worker();w.setOffline();await assert.rejects(w.install());assert(w.messages.every(m=>m.ready===false));assert(w.messages.some(m=>m.error));});

test('a cache upgrade retains a downloaded hymn expansion for offline use',async()=>{
 const w=worker();const old=await w.caches.open('kogg-presenter-v31');
 await old.put('https://example.test/app/data/hymns-extra.json',new Response('saved expansion'));
 await old.put('https://example.test/app/__asset_hashes__',new Response(JSON.stringify(w.hashes)));
 await w.install();w.setOffline();
 assert.equal(await (await w.fetch('data/hymns-extra.json')).text(),'saved expansion');
});

test('online lyric API responses bypass offline cache interception',async()=>{
 const w=worker();await w.install();assert.equal(await w.fetch('api/lyrics?action=search&q=test'),undefined);
});
test('the app shell answers from cache online and offline — never network-first',async()=>{
 const w=worker();await w.install();
 const online=await w.fetch('index.html');assert.match(await online.text(),/index\.html/);
 w.setOffline();
 const shell=await w.fetch('js/app.js');assert.match(await shell.text(),/app\.js/);
 const page=await w.fetch('index.html');assert.match(await page.text(),/index\.html/);
});
test('upgrade replaces changed shell and corrected data while carrying unchanged legacy Bible',async()=>{const w=worker(),old=await w.caches.open('kogg-presenter-v97');await old.put('https://example.test/app/js/app.js',new Response('OLD APP'));await old.put('https://example.test/app/data/kjv.json',new Response('OLD CORRUPTION'));await old.put('https://example.test/app/data/bsb.json',new Response(fs.readFileSync('data/bsb.json','utf8')));await old.put('https://example.test/app/data/asv.json',new Response('OLD OPTIONAL'));await w.install();assert.ok(w.calls.some(u=>u.endsWith('/js/app.js')));assert.ok(w.calls.some(u=>u.endsWith('/data/kjv.json')));assert.ok(w.calls.some(u=>u.endsWith('/data/asv.json')));assert.ok(!w.calls.some(u=>u.endsWith('/data/bsb.json')));assert.notEqual(await(await w.fetch('js/app.js')).text(),'OLD APP');w.setOffline();assert.notEqual(await(await w.fetch('data/kjv.json')).text(),'OLD CORRUPTION');});
test('asset manifest describes current deployed file content',()=>{const w=worker(),crypto=require('node:crypto');for(const [asset,hash] of Object.entries(w.hashes)){const path=asset==='./'?'index.html':asset;assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'),hash,asset);}assert.ok(Object.keys(w.hashes).length>40);});
test('cached text has canonical line endings so Git release archives preserve its integrity',()=>{
 const w=worker();
 for(const asset of Object.keys(w.hashes)){
  const file=asset==='./'?'index.html':asset;
  if(/\.(?:html|js|css|json|txt|svg|webmanifest)$/.test(file))
   assert.ok(!fs.readFileSync(file).includes(Buffer.from('\r\n')), 'Noncanonical cache asset: '+file);
 }
});
