const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const S=require('../js/lyrics-sources.js');const response=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
test('connected search combines source results and deduplicates title/artist',async()=>{
 const result=await S.searchDirect('Example',{fetcher:async url=>response(url.includes('lrclib')?[{id:1,trackName:'Example',artistName:'Singer',plainLyrics:'One\n\nTwo'}]:{data:[{title:'Example',artist:{name:'Singer'}},{title:'Other',artist:{name:'Singer'}}]})});
 assert.equal(result.items.length,2);assert.equal(result.items[0].source.name,'LRCLIB');assert.equal(result.items[1].pending,true);assert.equal(result.partial,false);
});
test('a failed source does not hide results from the other',async()=>{
 const result=await S.searchDirect('Example',{fetcher:async url=>{if(url.includes('lrclib'))throw Error('offline');return response({data:[{title:'Example',artist:{name:'Singer'}}]});}});
 assert.equal(result.items.length,1);assert.equal(result.partial,true);
});
test('metadata selection fetches plain lyrics and retains provenance',async()=>{
 const song=await S.lookupDirect({title:'Example',author:'Singer',pending:true,provider:'lyrics.ovh'},{fetcher:async url=>{assert.match(url,/\/Singer\/Example$/);return response({lyrics:'One\n\nTwo'});}});
 assert.equal(song.lyrics,'One\n\nTwo');assert.equal(song.source.name,'lyrics.ovh');
});
test('web search is a normal encoded Google link, not an automated Google request',()=>{
 const url=new URL(S.google('title & artist'));assert.equal(url.hostname,'www.google.com');assert.equal(url.searchParams.get('q'),'title & artist lyrics');
});
test('import only accepts fixed source hosts and supported paths',()=>{
 for(const raw of ['http://hymnary.org/text/title','https://user:secret@hymnary.org/text/title','https://hymnary.org:8443/text/title','https://hymnary.org.evil.test/text/title','https://127.0.0.1/text/title','https://hymnary.org/search?q=title','https://google.com/search?q=lyrics'])assert.throws(()=>S.importTarget(raw));
 assert.equal(S.importTarget('https://hymnary.org/text/title?tracking=1').url,'https://hymnary.org/text/title');
 assert.equal(S.importTarget('https://lrclib.net/api/get/123').type,'lrclib');
});
const hymn=`<meta property="og:title" content="A hymn &amp; hope"><div id='at_fulltext'><h2>Text</h2><div property='text'><div class="authority_columns"><p>1 First line<br />\r\nSecond line</p><p>2 Third line<br />\r\nFourth line</p><p>Historical source, 1890</p></div></div></div><div id="text-info"><table><tr><td><span class="hy_infoLabel">Author:</span></td><td><span class="hy_infoItem">An Author</span></td></tr><tr><td><span class="hy_infoLabel">Copyright:</span></td><td><span class="hy_infoItem">Public Domain</span></td></tr></table></div>`;
test('supported hymn page extracts stanza text and credits without page furniture',()=>{
 const song=S.hymnary(hymn,'https://hymnary.org/text/title');assert.equal(song.title,'A hymn & hope');assert.equal(song.author,'An Author');
 assert.equal(require('../js/lyrics.js').parse(song.lyrics).length,2);assert.match(song.lyrics,/First line\nSecond line/);assert.doesNotMatch(song.lyrics,/Historical source/);assert.match(song.source.credits,/Historical source/);
});
test('tune/page public-domain notices do not authorise importing a copyrighted text',()=>{
 assert.throws(()=>S.hymnary(hymn.replace('Public Domain','© Publisher')+'<p>Tune: Public Domain</p>','https://hymnary.org/text/title'),/does not mark the hymn text/);
});
function endpoint(fetcher){const source=fs.readFileSync('functions/api/lyrics.js','utf8').replace("import sources from '../../js/lyrics-sources.js';",'').replace('export async function','async function');const c=vm.createContext({sources:S,URL,Response,AbortController,setTimeout,clearTimeout,fetch:fetcher});vm.runInContext(source,c);return c.onRequestGet;}
test('Cloudflare importer rejects unrelated hosts before fetching and marks all responses no-store',async()=>{
 let fetched=false;const handle=endpoint(async()=>{fetched=true;return new Response('');});
 const r=await handle({request:new Request('https://kogg.test/api/lyrics?action=import&url='+encodeURIComponent('https://127.0.0.1/private'))});assert.equal(r.status,400);assert.equal(fetched,false);assert.equal(r.headers.get('cache-control'),'no-store');
});
test('Cloudflare extracts a supported public-domain page without following redirects',async()=>{
 const handle=endpoint(async(url,opts)=>{assert.equal(url,'https://hymnary.org/text/title');assert.equal(opts.redirect,'manual');return new Response(hymn,{headers:{'Content-Type':'text/html'}});});
 const r=await handle({request:new Request('https://kogg.test/api/lyrics?action=import&url='+encodeURIComponent('https://hymnary.org/text/title'))});assert.equal(r.status,200);assert.match((await r.json()).song.lyrics,/First line/);
});

test('source redirects are rejected without fetching a new location',async()=>{
 let calls=0;await assert.rejects(()=>S.readJSON('https://lrclib.net/api/search?q=test',{fetcher:async()=>{calls++;return new Response('',{status:302,headers:{Location:'https://127.0.0.1/private'}});}}),/redirected/);assert.equal(calls,1);
});
