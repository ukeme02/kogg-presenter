/* Small source adapters shared by the browser and Cloudflare. */
(function(scope){
 'use strict';
 const core=typeof module!=='undefined'?require('./lyrics.js'):scope.KOGGLyrics;
 function checked(value,max=200){return typeof value==='string'&&value.trim()&&value.length<=max?value.trim():null;}
 async function readJSON(url,{fetcher=fetch,signal}={}){
  const response=await fetcher(url,{signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'manual'});
  if((response.status>=300&&response.status<400)||response.type==='opaqueredirect')throw new Error('This source redirected. Use its final supported source link instead.');
  const type=response.headers?.get('content-type')||'';
  if(type && !type.includes('json'))throw new Error('Invalid source response');
  const raw=await response.text();if(raw.length>2000000)throw new Error('Source response too large');const data=JSON.parse(raw);
  if(!response.ok)throw new Error(typeof data.error==='string'?data.error:response.status===429?'Source is busy. Try again shortly.':'Source unavailable');return data;
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
  return readJSON(url,options);
 }
 async function search(q,options={}){
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
 async function lookup(song,options={}){
  if(!song.pending)return song;
  if(options.server!==false){try{const data=await request('lookup',{title:song.title,artist:song.author},options);if(data.song)return data.song;}catch(e){if(options.signal?.aborted)throw e;}}
  return lookupDirect(song,options);
 }
 function importTarget(raw){let url;try{url=new URL(raw);}catch{throw new Error('Paste a complete https:// source link.');}
  if(url.protocol!=='https:'||url.username||url.password||url.port)throw new Error('Use a supported https:// source link.');
  const host=url.hostname.toLowerCase().replace(/^www\./,'');
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
 function google(q){return 'https://www.google.com/search?'+new URLSearchParams({q:q.trim()+' lyrics'});}
 const api={readJSON,candidate,searchDirect,search,lookupDirect,lookup,importTarget,hymnary,importLink,google};
 if(typeof module!=='undefined')module.exports=api;else scope.KOGGLyricsSources=api;
})(typeof window!=='undefined'?window:globalThis);
