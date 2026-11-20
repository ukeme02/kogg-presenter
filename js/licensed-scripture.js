/* NLT display metadata and a small anonymous, durable view-report queue. No SDK. */
(function(scope){'use strict';
 const PREFIX='cp_nlt_view:',LIMIT=500;
 function endpoint(location){return location?.protocol==='https:'&&/^(?:[a-z0-9-]+\.)?kogg-presenter\.pages\.dev$/.test(location.hostname)?'/api/scripture':'https://kogg-presenter.pages.dev/api/scripture';}
 function current(slide,now=Date.now()){return !!slide?.license&&Number.isFinite(slide.license.expiresAt)&&slide.license.expiresAt>now&&slide.license.expiresAt<=now+30*86400000&&!!slide.license.report&&!!slide.license.copyright;}
 function portable(value){
  if(Array.isArray(value))return value.map(portable);
  if(!value||typeof value!=='object')return value;
  const out=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,portable(v)]));
  if(out.scriptureRef?.translation==='nlt:NLT'){out.text='';delete out.license;}
  return out;
 }
 function create({storage,fetch,url,crypto,now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout,locks,onError=()=>{}}){
  const uuid=()=>crypto.randomUUID();let busy=null,timer=null,last='',stopped=false;
  const session=uuid();let device;
  try{device=storage.getItem('cp_nlt_device');if(!/^[a-f0-9-]{20,64}$/.test(device||'')){device=uuid();storage.setItem('cp_nlt_device',device);}}catch{device=uuid();}
  function entries(){const keys=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k?.startsWith(PREFIX))keys.push(k);}return keys;}
  async function drain(){
   for(const key of entries().slice(0,LIMIT)){
    let item;try{item=JSON.parse(storage.getItem(key));}catch{storage.removeItem(key);continue;}
    if(!item||item.expiresAt<=now()){storage.removeItem(key);continue;}
    const controller=new AbortController(),timeout=setTimer(()=>controller.abort(),10000);
    try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item),cache:'no-store',credentials:'omit',signal:controller.signal});
     if(r.ok||[400,403].includes(r.status))storage.removeItem(key);else break;
    }catch{break;}finally{clearTimer(timeout);}
   }
  }
  function flush(){if(stopped||busy)return busy;clearTimer(timer);busy=(async()=>{try{if(locks?.request)await locks.request('kogg-nlt-reports',drain);else await drain();}catch{onError('NLT usage reporting could not access storage.');}})().finally(()=>{busy=null;try{if(!stopped&&entries().length)timer=setTimer(flush,60000);}catch{}});return busy;}
  function view(state){
   const slide=state?.mode==='normal'&&!state.strongsShowing?state.slides?.[state.index]:null;
   if(!current(slide,now())){last='';return false;}
   const identity=JSON.stringify([slide.license.report.token,slide.label,slide.text]);
   if(identity===last)return false;last=identity;
   try{if(entries().length>=LIMIT)throw Error('queue full');const id=uuid();storage.setItem(PREFIX+id,JSON.stringify({...slide.license.report,id,device,session}));flush();return true;}
   catch{last='';onError('NLT usage reporting needs available device storage. Reconnect or free storage.');return false;}
  }
  return {view,flush,stop(){stopped=true;clearTimer(timer);},pending:()=>entries().length};
 }
 const api={endpoint,current,portable,create};
 if(typeof module!=='undefined')module.exports=api;else scope.KOGGLicensed=api;
})(typeof window!=='undefined'?window:globalThis);
