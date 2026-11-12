const test=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../js/bible-downloads.js');
test('every optional Bible advertises its real file size and stays outside Base preparation',()=>{
 const fs=require('node:fs'),catalogue=JSON.parse(fs.readFileSync('data/content-catalog.json','utf8'));
 const core=fs.readFileSync('sw.js','utf8').match(/const ASSETS = \[([\s\S]*?)\];/)[1];
 for(const bible of catalogue.bibles){assert.equal(bible.bytes,fs.statSync(bible.file).size,bible.name);assert.ok(!core.includes("'./"+bible.file+"'"),bible.name+' must be optional');}
});
function fixture(){
 const stores=new Map();
 const caches={keys:async()=>[...stores.keys()],open:async name=>{if(!stores.has(name))stores.set(name,new Map());const m=stores.get(name);return {match:async url=>m.get(url),delete:async url=>m.delete(url)};}};
 const href='https://example.test/kogg/index.html',files=['data/efik-nt.json','data/yoruba.json','data/kjv.json'];
 return {stores,caches,manager:create({caches,href,files})};
}
test('download status reads real KOGG cache entries, never a stored picker preference or another app cache',async()=>{
 const {stores,manager}=fixture(),url='https://example.test/kogg/data/efik-nt.json';
 stores.set('other-app',new Map([[url,{}]]));
 assert.equal((await manager.status()).get('data/efik-nt.json'),false);
 stores.set('kogg-presenter-v134',new Map([[url,{}]]));
 assert.equal((await manager.status()).get('data/efik-nt.json'),true);
 stores.get('kogg-presenter-v134').clear();
 assert.equal((await manager.status()).get('data/efik-nt.json'),false);
});
test('removal clears only the chosen optional pack across releases, preserving core and other app data',async()=>{
 const {stores,manager}=fixture(),url='https://example.test/kogg/data/efik-nt.json',core='https://example.test/kogg/data/kjv.json';
 for(const name of ['kogg-presenter-v134','kogg-presenter-v135','other-app'])stores.set(name,new Map([[url,{}],[core,{}]]));
 await manager.remove('data/efik-nt.json');
 for(const name of ['kogg-presenter-v134','kogg-presenter-v135']){assert.ok(!stores.get(name).has(url));assert.ok(stores.get(name).has(core));}
 assert.ok(stores.get('other-app').has(url));
 await assert.rejects(manager.remove('data/kjv.json'),/Only optional/);
 await assert.rejects(manager.remove('../data/efik-nt.json'),/Only optional/);
 await assert.rejects(manager.remove('data/unknown.json'),/Only optional/);
});
test('unavailable storage is unknown, not an offline-ready success',async()=>{
 const manager=create({href:'https://example.test/',files:['data/efik-nt.json']});
 assert.equal((await manager.status()).get('data/efik-nt.json'),null);
 await assert.rejects(manager.remove('data/efik-nt.json'),/unavailable/);
});
test('quota or cache permission errors propagate on removal',async()=>{
 const {caches,manager}=fixture();caches.keys=async()=>{throw Error('Storage denied');};
 assert.equal((await manager.status()).get('data/efik-nt.json'),null);
 await assert.rejects(manager.remove('data/efik-nt.json'),/Storage denied/);
});
