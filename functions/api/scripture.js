// Fixed-edition, chapter-at-a-time gateway. Secrets and provider errors never reach clients.
export const NLT_ID = 'd6e14a625393b4da-01';
const DAYS = 14 * 86400000;
const codes = 'GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split(' ');
const counts = [50,40,27,36,34,24,21,4,31,24,22,25,29,36,10,13,10,42,150,31,12,8,66,52,5,48,12,14,3,9,1,4,7,3,3,3,2,14,4,28,16,24,21,28,16,16,13,6,6,4,4,5,3,6,4,3,1,13,5,5,3,5,1,1,1,22];
export function validChapter(chapter) {
  const m = /^([A-Z0-9]{3})\.([1-9]\d{0,2})$/.exec(chapter || '');
  return !!m && Number(m[2]) <= (counts[codes.indexOf(m[1])] || 0);
}
function allowed(origin, host) {
  if (!origin) return true;
  try { const u = new URL(origin); return u.origin === host ||
    (u.protocol === 'https:' && /^(?:[a-z0-9-]+\.)?kogg-presenter\.pages\.dev$/.test(u.hostname) && !u.port) ||
    (u.protocol === 'http:' && ['127.0.0.1','localhost'].includes(u.hostname) && ['8766','8767','8768'].includes(u.port));
  } catch { return false; }
}
const encoder = new TextEncoder();
async function sign(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
const budgets = new Map(), reports = new Map();
function permit(ip, now) {
  if (budgets.size > 3000) for (const [key,v] of budgets) if (v.until <= now) budgets.delete(key);
  if (budgets.size > 3000) budgets.delete(budgets.keys().next().value);
  let b = budgets.get(ip); if (!b || b.until <= now) { b={until:now+60000,count:0}; budgets.set(ip,b); }
  return ++b.count <= 60;
}
export async function handle({request, env}, deps = {}) {
  const fetcher = deps.fetch || fetch, now = deps.now || Date.now;
  const url = new URL(request.url), origin = request.headers.get('Origin');
  const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  if (!allowed(origin,url.origin)) return new Response('{"error":"Origin not allowed"}',{status:403,headers});
  if (origin) headers['Access-Control-Allow-Origin']=origin;
  const reply=(data,status=200)=>new Response(data === null ? null : JSON.stringify(data),{status,headers});
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'3600'}});
  if (!['GET','POST'].includes(request.method)) return reply({error:'Method not allowed'},405);
  if (!env.API_BIBLE_KEY) return reply({error:'NLT is being connected. Please choose an offline Bible for now.'},503);
  if (!permit(request.method+':'+(request.headers.get('CF-Connecting-IP') || 'unknown'),now())) return reply({error:'Please wait a minute before requesting more Scripture.'},429);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try {
    if (request.method === 'POST') {
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply({error:'JSON required'},415);
      if (Number(request.headers.get('Content-Length'))>5000) return reply({error:'Report too large'},413);
      const raw=await request.text(); if(raw.length>5000)return reply({error:'Report too large'},413);
      let event;try{event=JSON.parse(raw);}catch{return reply({error:'Invalid report'},400);}
      const {token,expiresAt,signature,device,session,id}=event;
      const identifier=v=>typeof v==='string'&&/^[a-f0-9-]{20,64}$/.test(v);
      if(typeof token!=='string'||!token||token.length>2048||!Number.isSafeInteger(expiresAt)||expiresAt<=now()||expiresAt>now()+30*86400000+60000||!identifier(device)||!identifier(session)||!identifier(id)||typeof signature!=='string'||signature.length!==64)return reply({error:'Invalid or expired report'},400);
      if(signature!==await sign(env.API_BIBLE_KEY,token+'|'+expiresAt))return reply({error:'Invalid report'},403);
      for(const [key,until] of reports)if(until<=now())reports.delete(key);
      if(reports.has(id))return reply(null,204);
      const target=new URL('https://fums.api.bible/f3');target.searchParams.set('t',token);target.searchParams.set('dId',device);target.searchParams.set('sId',session);
      const response=await fetcher(target.href,{signal:controller.signal,redirect:'error'});
      if(!response.ok)return reply({error:'Usage reporting will retry.'},502);
      if(reports.size>3000)reports.delete(reports.keys().next().value);
      reports.set(id,now()+600000);return reply(null,204);
    }
    const chapter=url.searchParams.get('chapter');
    if(!validChapter(chapter)||[...url.searchParams.keys()].some(k=>k!=='chapter'))return reply({error:'Choose a valid NLT chapter.'},400);
    const cache=deps.cache || globalThis.caches?.default;
    // Include a secret-derived namespace so rotation cannot serve a prior licence's content.
    const namespace=(await sign(env.API_BIBLE_KEY,'cache-v1')).slice(0,16);
    const cacheKey=new Request(url.origin+'/__nlt_cache/'+namespace+'/'+chapter);
    const cached=await cache?.match(cacheKey);
    if(cached){const data=await cached.json();if(data.expiresAt>now())return reply(data);}
    const target=`https://rest.api.bible/v1/bibles/${NLT_ID}/chapters/${chapter}?content-type=json&include-notes=false&include-titles=false&include-verse-numbers=false`;
    const response=await fetcher(target,{headers:{'api-key':env.API_BIBLE_KEY},signal:controller.signal,redirect:'error'});
    if(!response.ok)return reply({error:response.status===429?'NLT usage limit reached. Choose an offline Bible or try again later.':[401,403].includes(response.status)?'NLT access needs attention. Choose another Bible for now.':'NLT could not be reached. Please retry while online.'},response.status===429?429:502);
    const raw=await response.text();if(raw.length>600000)throw Error('Oversize');
    const source=JSON.parse(raw),token=source.meta?.fumsToken,copyright=source.data?.copyright;
    if(!Array.isArray(source.data?.content)||typeof token!=='string'||!token||token.length>2048||typeof copyright!=='string'||!copyright.trim()||copyright.length>3000)throw Error('Missing content or licence metadata');
    const expiresAt=now()+DAYS, reportExpiry=now()+30*86400000;
    const data={data:{content:source.data.content,copyright,id:chapter,bibleId:NLT_ID},fetchedAt:now(),expiresAt,report:{token,expiresAt:reportExpiry,signature:await sign(env.API_BIBLE_KEY,token+'|'+reportExpiry)}};
    if(cache)await cache.put(cacheKey,new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=1209600'}}));
    return reply(data);
  }catch{return reply({error:'NLT is temporarily unavailable. Please retry while online.'},502);}
  finally{clearTimeout(timer);}
}
export const onRequest = context => handle(context);
