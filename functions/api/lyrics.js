import sources from '../../js/lyrics-sources.js';
let lastHymnaryRequest=0;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function onRequestGet({request}){
 const incoming=new URL(request.url),origin=request.headers.get('Origin');
 if(origin && origin!==incoming.origin)return json({error:'Origin not allowed'},403);
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000),options={signal:controller.signal};
 try{
  const action=incoming.searchParams.get('action')||'search';
  if(action==='search')return json(await sources.searchDirect(incoming.searchParams.get('q')||'',options));
  if(action==='lookup')return json({song:await sources.lookupDirect({pending:true,provider:'lyrics.ovh',title:incoming.searchParams.get('title'),author:incoming.searchParams.get('artist')},options)});
  if(action!=='import')return json({error:'Unknown action'},400);
  const target=sources.importTarget(incoming.searchParams.get('url')||'');
  if(target.type==='lyrics.ovh')return json({song:await sources.lookupDirect({pending:true,provider:'lyrics.ovh',title:target.title,author:target.artist},options)});
  if(target.type==='lrclib'){
   const row=await sources.readJSON(target.url,options);
   if(typeof row.trackName!=='string'||typeof row.plainLyrics!=='string'||!row.plainLyrics.trim()||row.plainLyrics.length>100000)throw new Error('No plain lyrics available at this source link.');
   return json({song:{title:row.trackName,author:row.artistName||'',lyrics:row.plainLyrics,source:{name:'LRCLIB',url:target.url}}});
  }
  if(Date.now()-lastHymnaryRequest<5000)return json({error:'Please wait five seconds between hymn page imports.'},429);
  lastHymnaryRequest=Date.now();
  const response=await fetch(target.url,{signal:controller.signal,redirect:'manual',headers:{'User-Agent':'KOGGPresenter/1.0 (individual hymn text import)','Accept':'text/html'}});
  if(!response.ok)throw new Error('This source page could not be reached. Paste the lyrics instead.');
  if(!(response.headers.get('content-type')||'').includes('text/html'))throw new Error('Unsupported page format');
  const length=Number(response.headers.get('content-length')||0);if(length>2000000)throw new Error('Source page too large');
  const html=await response.text();if(html.length>2000000)throw new Error('Source page too large');
  return json({song:sources.hymnary(html,target.url)});
 }catch(error){return json({error:error.name==='AbortError'?'The lyrics source timed out. Try again or paste the lyrics.':error.message},400);}
 finally{clearTimeout(timeout);}
}
