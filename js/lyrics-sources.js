/* Small source adapters shared by the browser and Cloudflare. */
(function(scope){
 'use strict';
 let core=typeof module!=='undefined'?require('./lyrics.js'):scope.KOGGLyrics;
 function setCore(lyricsCore){if(lyricsCore&&typeof lyricsCore.fromRecord==='function')core=lyricsCore;}
 function fromRecord(row){return core?core.fromRecord(row):null;}
 function checked(value,max=200){return typeof value==='string'&&value.trim()&&value.length<=max?value.trim():null;}
 // Cloudflare's outgoing fetches send no User-Agent; LRCLIB (and friends) are friendlier to one.
 const serverHeaders=typeof window==='undefined'?{'User-Agent':'KOGGPresenter/1.0 (https://kogg-presenter.pages.dev)'}:undefined;
 async function readJSON(url,{fetcher=fetch,signal,timeoutMs=4500}={}){
  const once=async()=>{
   const controller=new AbortController(),cancel=()=>controller.abort();
   if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',cancel,{once:true});
   const timer=setTimeout(cancel,timeoutMs);
   try{
   const response=await fetcher(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'manual',headers:serverHeaders});
   if((response.status>=300&&response.status<400)||response.type==='opaqueredirect')throw new Error('This source redirected. Use its final supported source link instead.');
   if(response.status>=500)throw new Error('Source unavailable');
   if(response.status===429)throw new Error('Source is busy. Try again shortly.');
   const type=response.headers?.get('content-type')||'';
   if(type && !type.includes('json'))throw new Error('Invalid source response');
   const raw=await response.text();if(raw.length>2000000)throw new Error('Source response too large');const data=JSON.parse(raw);
   if(!response.ok){const error=new Error(typeof data.error==='string'?data.error:response.status===404?'No lyrics found':'Source unavailable');error.code=data.code;throw error;}return data;
   }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
  };
  try{return await once();}
  catch(err){
   // These sources briefly return 503 under load — one quiet retry recovers most failures.
   if(signal?.aborted||err.message!=='Source unavailable')throw err;
   await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,800);if(signal)signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));},{once:true});});
   return once();
  }
 }
 function candidate(r){const title=checked(r?.title),author=checked(r?.artist?.name);if(!title||!author)return null;
  return {title,author,pending:true,provider:'lyrics.ovh',source:{name:'lyrics.ovh',url:'https://api.lyrics.ovh/v1/'+encodeURIComponent(author)+'/'+encodeURIComponent(title)}};
 }
 function unique(items){const seen=new Set();return items.filter(song=>{const key=core.key(song);if(seen.has(key))return false;seen.add(key);return true;}).slice(0,24);}
 async function searchDirect(q,options={}){
  if(!checked(q))throw new Error('Enter a song title or artist under 200 characters.');
  const settled=await Promise.allSettled([
   readJSON('https://lrclib.net/api/search?q='+encodeURIComponent(q),options).then(rows=>Array.isArray(rows)?rows.slice(0,100).map(core.fromRecord).filter(Boolean):[]),
   readJSON('https://api.lyrics.ovh/suggest/'+encodeURIComponent(q),options).then(data=>Array.isArray(data.data)?data.data.slice(0,15).map(candidate).filter(Boolean):[])
  ]);
  if(options.signal?.aborted)throw new DOMException('Search cancelled','AbortError');
  const items=unique(settled.flatMap(r=>r.status==='fulfilled'?r.value:[]));
  return {items,partial:settled.some(r=>r.status==='rejected'),available:settled.some(r=>r.status==='fulfilled')};
 }
 async function request(action,params,options={}){
  const url='/api/lyrics?'+new URLSearchParams({action,...params});
  return readJSON(url,{...options,timeoutMs:12000});
 }
 async function search(q,options={}){
  if(options.scope==='christian')return request('christian-search',{q},options);
  if(options.server!==false){try{const data=await request('search',{q},options);if(Array.isArray(data.items))return data;}catch(e){if(options.signal?.aborted)throw e;}}
  return searchDirect(q,options);
 }
 async function lookupDirect(song,options={}){
  if(!song.pending)return song;
  const title=checked(song.title),author=checked(song.author);if(song.provider!=='lyrics.ovh'||!title||!author)throw new Error('Unsupported lyrics source');
  const url='https://api.lyrics.ovh/v1/'+encodeURIComponent(author)+'/'+encodeURIComponent(title),data=await readJSON(url,options);
  if(typeof data.lyrics!=='string'||!data.lyrics.trim()||data.lyrics.length>100000)throw new Error('No lyrics found for this version. Try another result or paste the lyrics.');
  return {title,author,lyrics:data.lyrics.trim(),source:{name:'lyrics.ovh',url}};
 }
 const recentLyrics=new Map();
 async function lookup(song,options={}){
  if(options.signal?.aborted)throw new DOMException('Cancelled','AbortError');
  // Browser-session reuse only: no persistent cache or server-wide storage.
  const key=core.key(song)+'|'+(song.source?.url||song.provider||'');
  if(typeof window!=='undefined'&&recentLyrics.has(key))return recentLyrics.get(key);
  const result=await lookupUncached(song,options);
  if(options.signal?.aborted)throw new DOMException('Cancelled','AbortError');
  if(typeof window!=='undefined'&&result?.lyrics){recentLyrics.set(key,result);while(recentLyrics.size>12||[...recentLyrics.values()].reduce((n,s)=>n+s.lyrics.length,0)>200000)recentLyrics.delete(recentLyrics.keys().next().value);}
  return result;
 }
 async function lookupUncached(song,options={}){
  if(!song.pending)return song;
  if(['hymnary','hymnal'].includes(song.provider))return importLink(song.source?.url,options);
  if(options.server!==false){try{const data=await request('lookup',{title:song.title,artist:song.author},options);if(data.song)return data.song;}catch(e){if(options.signal?.aborted||e.code==='LYRICS_UNAVAILABLE')throw e;}}
  const exact=async()=>{
   const title=checked(song.title),author=checked(song.author);if(!title||!author)throw new Error('Title and artist required');
   try{const row=await readJSON('https://lrclib.net/api/get?'+new URLSearchParams({artist_name:author,track_name:title}),options);const mapped=fromRecord(row);if(mapped&&sameSong(song,mapped))return mapped;}catch(e){if(options.signal?.aborted)throw e;if(/busy/i.test(e.message))throw e;}
   // A catalogue's Live/Remastered suffix often prevents an exact signature match.
   // Search the same title + artist, then reject unrelated songs and covers.
   await new Promise((resolve,reject)=>{const cancel=()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));};const timer=setTimeout(()=>{options.signal?.removeEventListener('abort',cancel);resolve();},250);if(options.signal?.aborted)cancel();else options.signal?.addEventListener('abort',cancel,{once:true});});
   const rows=await readJSON('https://lrclib.net/api/search?'+new URLSearchParams({track_name:cleanTitle(title),artist_name:author}),options);
   const matches=(Array.isArray(rows)?rows:[]).map(fromRecord).filter(s=>s&&sameSong(song,s));
   const found=matches.find(s=>core.key(s)===core.key(song))||matches[0];
   if(found)return found;throw new Error('No matching lyric text');
  };
  try{return await Promise.any([lookupDirect(song,options),exact()]);}
  catch(e){if(options.signal?.aborted)throw new DOMException('Cancelled','AbortError');const error=new Error('No words available for this version. Try a lyrics-ready result or another artist/version.');error.code='LYRICS_UNAVAILABLE';throw error;}
 }
 function cleanTitle(title){return String(title).replace(/\s*[([](?:live|remaster(?:ed)?|radio edit|official (?:audio|video))\b[^)\]]*[)\]]/gi,'').replace(/\s+[-–—]\s+(?:live|remaster(?:ed)?|radio edit)\b.*$/i,'').trim();}
 function sameSong(a,b){return core.key({title:cleanTitle(a.title),author:a.author})===core.key({title:cleanTitle(b.title),author:b.author});}
 function importTarget(raw){let url;try{url=new URL(raw);}catch{throw new Error('Paste a complete https:// source link.');}
  if(url.protocol!=='https:'||url.username||url.password||url.port)throw new Error('Use a supported https:// source link.');
  const host=url.hostname.toLowerCase().replace(/^www\./,'');
  if(host==='hymnal.net' && /^\/en\/hymn\/[a-z]{1,8}\/\d{1,7}\/?$/.test(url.pathname))return {type:'hymnal',url:'https://www.hymnal.net'+url.pathname.replace(/\/$/,'')};
  if(host==='hymnary.org' && /^\/text\/[a-z0-9_]+\/?$/i.test(url.pathname))return {type:'hymnary',url:'https://hymnary.org'+url.pathname};
  if(host==='lrclib.net' && /^\/api\/get\/\d+$/.test(url.pathname))return {type:'lrclib',url:'https://lrclib.net'+url.pathname};
  if(host==='api.lyrics.ovh' && /^\/v1\/[^/]+\/[^/]+$/.test(url.pathname)){const [, ,artist,title]=url.pathname.split('/');return {type:'lyrics.ovh',artist:decodeURIComponent(artist),title:decodeURIComponent(title),url:'https://api.lyrics.ovh'+url.pathname};}
  throw new Error('This page is not supported for automatic import. Copy its lyrics and paste them into the editor.');
 }
 function decode(html){const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',mdash:'—',ndash:'–'};
  return String(html).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(all,key)=>{if(key[0]==='#'){const n=key[1]?.toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10);return Number.isFinite(n)&&n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}return named[key.toLowerCase()]??all;});
 }
 function plain(html){return decode(html.replace(/\r?\n[ \t]*/g,' ').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,'')).replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').trim();}
 function hymnary(html,url){
  // Check the text's own copyright table, never the tune or page footer.
  const info=html.match(/<div\b[^>]*\bid=["']text-info["'][^>]*>([\s\S]*?)<\/table>/i)?.[1];
  const copyright=info?.match(/Copyright:<\/span>[\s\S]*?<span\b[^>]*class=["']hy_infoItem["'][^>]*>([\s\S]*?)<\/span>/i)?.[1];
  if(!copyright||plain(copyright).toLowerCase()!=='public domain')throw new Error('This page does not mark the hymn text as public domain. Use an authorised song download or paste the lyrics you can use.');
  const representative=html.match(/<div\b[^>]*\bid=["']at_fulltext["'][^>]*>([\s\S]*?)<div\b[^>]*property=["']text["'][^>]*>([\s\S]*?)<\/div>/i)?.[2];
  if(!representative)throw new Error('No readable lyric text found on this page. Paste the lyrics instead.');
  const blocks=[];const credits=[];
  for(const match of representative.matchAll(/<p\b[^>]*>([\s\S]*?)(?:<\/p>|$)/gi)){
   const text=plain(match[1]);if(!text)continue;const verse=text.match(/^(\d+)[ .]+([\s\S]+)$/);
   if(verse)blocks.push('[Verse '+verse[1]+']\n'+verse[2]);
   else if(/^(?:refrain|chorus)[:\s]/i.test(text))blocks.push('[Chorus]\n'+text.replace(/^(?:refrain|chorus)[:\s]*/i,''));
   else if(text.includes('\n'))blocks.push(text);else credits.push(text);
  }
  if(!blocks.length)throw new Error('No clear hymn stanzas found. Paste the lyrics instead.');
  const title=plain(html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i)?.[1]||'Imported hymn');
  const author=plain(info.match(/Author:<\/span>[\s\S]*?<span\b[^>]*class=["']hy_infoItem["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]||'');
  return {title,author,lyrics:blocks.join('\n\n'),source:{name:'Hymnary.org',url,credits:['Text marked Public Domain',...credits].join(' • ')}};
 }
 async function importLink(raw,options={}){const target=importTarget(raw);const data=await request('import',{url:target.url},options);if(!data.song)throw new Error(data.error||'Page import is unavailable here. Paste the lyrics instead.');return data.song;}
 function hymnarySearch(csv){
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<csv.length;i++){const c=csv[i];if(c==='"'){if(quoted&&csv[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(field);field='';}else if(c==='\n'&&!quoted){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}else field+=c;}
  if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  const headers=rows.shift()||[];if(!headers.includes('textAuthNumber'))throw new Error('The hymn search source returned an unexpected response.');
  const seen=new Set();return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]||'']))).filter(r=>/^[a-z0-9_]+$/i.test(r.textAuthNumber)&&!seen.has(r.textAuthNumber)&&seen.add(r.textAuthNumber)).slice(0,24).map(r=>({title:r.displayTitle||r.textTitle||r.firstLine,author:r.authors,pending:true,provider:'hymnary',source:{name:'Hymnary.org',url:'https://hymnary.org/text/'+r.textAuthNumber}}));
 }
 function hymnal(html,url){
  for(const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
   let data;try{data=JSON.parse(match[1]);}catch{continue;}
   const rows=Array.isArray(data)?data:data['@graph']||[data];
   for(const r of rows){const lyrics=r?.lyrics?.text;if(r['@type']!=='MusicComposition'||typeof lyrics!=='string'||!lyrics.trim()||lyrics.length>100000||typeof r.name!=='string')continue;
    return {title:r.name.slice(0,200),author:(Array.isArray(r.lyricist)?r.lyricist:[r.lyricist]).map(p=>p?.name||'').filter(Boolean).join('; '),lyrics:lyrics.trim(),source:{name:'hymnal.net',url,credits:'Text imported from hymnal.net; review the source attribution before use.'}};
   }
  }throw new Error('No readable lyric text was found on this hymn page.');
 }
 function hymnalSearch(html){const result=[],seen=new Set();for(const match of html.matchAll(/<a\b[^>]*href=["'](\/en\/hymn\/[a-z]{1,8}\/\d{1,7})["'][^>]*>([\s\S]*?)<\/a>/gi)){const body=match[2],heading=body.match(/<span\b[^>]*class=["'][^"']*\bhn-sr__t\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1];if(!heading||seen.has(match[1]))continue;seen.add(match[1]);result.push({title:plain(heading),author:'',pending:true,provider:'hymnal',source:{name:'hymnal.net',url:'https://www.hymnal.net'+match[1]}});if(result.length>=18)break;}return result;}
 async function readHTML(url,options={}){const response=await (options.fetcher||fetch)(url,{signal:options.signal,redirect:'manual',headers:{'User-Agent':'KOGGPresenter/1.0 (individual hymn search)','Accept':'text/html,text/csv'}});if(!response.ok)throw Error('Source unavailable');if(Number(response.headers.get('content-length')||0)>2000000)throw Error('Source response too large');const text=await response.text();if(text.length>2000000)throw Error('Source response too large');return text;}
 async function christianSearch(q,options={}){if(!checked(q)||q.length<3)throw Error('Enter 3–200 characters.');const results=await Promise.allSettled([readHTML('https://hymnary.org/search?'+new URLSearchParams({qu:q.replace(/[":]/g,' ')+' in:texts',export:'csv'}),options).then(hymnarySearch),readHTML('https://www.hymnal.net/en/search/all/all/'+encodeURIComponent(q),options).then(hymnalSearch)]);if(options.signal?.aborted)throw new DOMException('Search cancelled','AbortError');const items=results.flatMap(r=>r.status==='fulfilled'?r.value:[]);return {items:items.slice(0,30),available:results.some(r=>r.status==='fulfilled'),partial:results.some(r=>r.status==='rejected'),scope:'christian'};}
 function google(q,scope='all'){return 'https://www.google.com/search?'+new URLSearchParams({q:q.trim()+' lyrics'+(scope==='christian'?' (site:hymnary.org OR site:hymnal.net OR site:hymnlyrics.org)':'')});}
 const api={readJSON,candidate,searchDirect,search,lookupDirect,lookup,importTarget,hymnary,hymnarySearch,hymnal,importLink,google,setCore,fromRecord,hymnalSearch,christianSearch};
 if(typeof module!=='undefined')module.exports=api;else scope.KOGGLyricsSources=api;
})(typeof window!=='undefined'?window:globalThis);
