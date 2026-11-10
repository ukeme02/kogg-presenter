const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const S=require('../js/lyrics-sources.js');const response=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
test('Christian search parses quoted CSV and allows only canonical hymn identifiers',()=>{
 const rows=S.hymnarySearch('displayTitle,authors,textAuthNumber\n"Grace, hope","Writer ""One""",grace_hope\nBad,x,../../private\nDuplicate,x,grace_hope\n');assert.equal(rows.length,1);assert.equal(rows[0].title,'Grace, hope');assert.equal(rows[0].author,'Writer "One"');assert.equal(rows[0].source.url,'https://hymnary.org/text/grace_hope');assert.equal(rows[0].provider,'hymnary');assert.equal(rows[0].pending,true);
});
test('Christian-only failure never falls back to general music databases',async()=>{const calls=[];await assert.rejects(()=>S.search('Grace',{scope:'christian',fetcher:async url=>{calls.push(url);throw Error('offline');}}));assert.equal(calls.length,1);assert.match(calls[0],/action=christian-search/);});
test('Google Christian scope restricts discovery to dedicated sources',()=>{const query=new URL(S.google('Grace','christian')).searchParams.get('q');assert.match(query,/site:hymnary.org/);assert.match(query,/site:hymnal.net/);assert.doesNotMatch(new URL(S.google('Grace','all')).searchParams.get('q'),/site:/);});
test('hymnal import extracts structured lyrics without comments or website content',()=>{const page='<p>Unrelated comment</p><script type="application/ld+json">'+JSON.stringify({'@type':'MusicComposition',name:'A hymn',lyricist:[{name:'A writer'}],lyrics:{text:'First line\nSecond line\n\nNext verse'}})+'</script>';const song=S.hymnal(page,'https://www.hymnal.net/en/hymn/h/313');assert.equal(song.lyrics,'First line\nSecond line\n\nNext verse');assert.equal(song.author,'A writer');assert.doesNotMatch(song.lyrics,/comment/);assert.throws(()=>S.hymnal('<h1>Login</h1>','x'),/No readable/);});
test('hymnal links cannot redirect imports to unrelated hosts or paths',()=>{assert.equal(S.importTarget('https://hymnal.net/en/hymn/h/313?x=1').url,'https://www.hymnal.net/en/hymn/h/313');for(const u of ['https://www.hymnal.net.evil.test/en/hymn/h/313','https://www.hymnal.net/en/login','https://www.hymnal.net/en/hymn/h/313/other'])assert.throws(()=>S.importTarget(u));});
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

test('a slow metadata provider does not hold up lyrics available at the other source',async()=>{
 const pending={title:'Example',author:'Singer',pending:true,provider:'lyrics.ovh'};const abort=new AbortController();
 try{const result=await Promise.race([S.lookup(pending,{server:false,signal:abort.signal,fetcher:async(url,{signal})=>{if(url.includes('lyrics.ovh'))return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError')),{once:true}));return response({id:8,trackName:'Example',artistName:'Singer',plainLyrics:'Available text'});}}),new Promise((_,reject)=>setTimeout(()=>reject(Error('Lookup waited for the slow provider')),200))]);assert.equal(result.lyrics,'Available text');}finally{abort.abort();}
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
test('a lyrics.ovh miss falls back to the LRCLIB exact title/artist record',async()=>{
 const song=await S.lookup({title:'Example',author:'Singer',pending:true,provider:'lyrics.ovh'},{server:false,fetcher:async url=>{
  if(url.includes('api.lyrics.ovh'))return response({error:'No lyrics'});
  assert.match(url,/lrclib\.net\/api\/get\?/);assert.match(url,/artist_name=Singer/);
  return response({id:9,trackName:'Example',artistName:'Singer',plainLyrics:'From LRCLIB'});
 }});
 assert.equal(song.lyrics,'From LRCLIB');assert.equal(song.source.name,'LRCLIB');
});
test('a briefly unavailable source is retried once before giving up',async()=>{
 let calls=0;const song=await S.lookupDirect({title:'Example',author:'Singer',pending:true,provider:'lyrics.ovh'},{server:false,fetcher:async()=>{
  calls++;
  if(calls===1)return new Response('busy',{status:503,headers:{'Content-Type':'text/plain'}});
  return response({lyrics:'Second try'});
 }});
 assert.equal(calls,2);assert.equal(song.lyrics,'Second try');
});
test('source fetches identify themselves with a User-Agent header',async()=>{
 let ua;await S.readJSON('https://example.test/x',{fetcher:async(url,init)=>{ua=init.headers['User-Agent'];return response({ok:1});}});
 assert.match(String(ua),/KOGGPresenter/);
});
function endpoint(fetcher){const source=fs.readFileSync('functions/api/lyrics.js','utf8').replace("import sources from '../../js/lyrics-sources.js';",'').replace("import lyricsCore from '../../js/lyrics.js';",'').replace('export async function','async function');const c=vm.createContext({sources:S,lyricsCore:require('../js/lyrics.js'),URL,URLSearchParams,Response,AbortController,setTimeout,clearTimeout,fetch:fetcher});vm.runInContext(source,c);return c.onRequestGet;}
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
test('Christian search keeps hymnal matches when Hymnary fails and never imports snippets as lyrics',async()=>{
 const html='<a class="hn-sr__item" href="/en/hymn/h/123"><span class="hn-sr__t">A <mark>fixture</mark> hymn</span><span class="hn-sr__snip">Incomplete snippet</span></a>';
 const result=await S.christianSearch('fixture',{fetcher:async url=>{if(url.includes('hymnary.org'))throw Error('unavailable');return new Response(html);}});
 assert.equal(result.partial,true);assert.equal(result.items.length,1);assert.equal(result.items[0].title,'A fixture hymn');assert.equal(result.items[0].lyrics,undefined);assert.equal(result.items[0].provider,'hymnal');assert.equal(result.items[0].pending,true);
 assert.equal(S.hymnalSearch(html.replace('/en/hymn/h/123','https://evil.test/file')).length,0);
});


test('catalogue Live suffix recovers matching artist lyrics through structured search',async()=>{
 const calls=[];const song=await S.lookup({title:'Example (Live)',author:'Singer',provider:'lyrics.ovh',pending:true},{server:false,fetcher:async url=>{calls.push(url);if(url.includes('/search?'))return response([{id:44,trackName:'Example',artistName:'Singer',plainLyrics:'Recovered words'},{id:45,trackName:'Example',artistName:'Other',plainLyrics:'Wrong cover'}]);return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:{'Content-Type':'application/json'}});}});
 assert.equal(song.lyrics,'Recovered words');assert.equal(song.author,'Singer');assert.equal(calls.length,3);assert.match(calls[2],/track_name=Example&artist_name=Singer/);
});
test('fallback never substitutes a different artist or a different song',async()=>{
 await assert.rejects(()=>S.lookup({title:'Example',author:'Singer',provider:'lyrics.ovh',pending:true},{server:false,fetcher:async url=>response(url.includes('/search?')?[{id:1,trackName:'Example',artistName:'Other',plainLyrics:'Wrong cover'},{id:2,trackName:'Example Two',artistName:'Singer',plainLyrics:'Wrong song'}]:{})}),e=>e.code==='LYRICS_UNAVAILABLE');
});
test('completed server lookup miss is not repeated from the browser',async()=>{
 let calls=0;await assert.rejects(()=>S.lookup({title:'Example',author:'Singer',pending:true,provider:'lyrics.ovh'},{fetcher:async()=>{calls++;return new Response(JSON.stringify({error:'No words',code:'LYRICS_UNAVAILABLE'}),{status:400,headers:{'Content-Type':'application/json'}});}}),e=>e.code==='LYRICS_UNAVAILABLE');assert.equal(calls,1);
});
test('404 and rate limits are not retried as temporary source failures',async()=>{
 for(const status of [404,429]){let calls=0;await assert.rejects(()=>S.readJSON('https://source.test',{fetcher:async()=>{calls++;return new Response('{}',{status,headers:{'Content-Type':'application/json'}});}}));assert.equal(calls,1);}
});


test('browser reuses successful session lyrics without another source request',async()=>{
 const browser={KOGGLyrics:require('../js/lyrics.js')};const c=vm.createContext({window:browser,URL,URLSearchParams,AbortController,DOMException,setTimeout,clearTimeout});vm.runInContext(fs.readFileSync('js/lyrics-sources.js','utf8'),c);
 const pending={title:'Cache fixture',author:'Singer',provider:'lyrics.ovh',pending:true};let calls=0;const options={server:false,fetcher:async url=>{calls++;return response(url.includes('lyrics.ovh')?{lyrics:'Fixture words'}:{id:55,trackName:'Cache fixture',artistName:'Singer',plainLyrics:'Fixture words'});}};
 await browser.KOGGLyricsSources.lookup(pending,options);const before=calls;const again=await browser.KOGGLyricsSources.lookup(pending,options);assert.equal(again.lyrics,'Fixture words');assert.equal(calls,before);
});
