/* Optional native OBS connection. Loaded with the app; idle until paired. */
(function(scope){'use strict';
 const BASE='http://127.0.0.1:8767',KEY='cp_obs_connection';
 function create({fetch,storage,session,crypto,onStatus=()=>{},snapshot,setTimer=setTimeout,clearTimer=clearTimeout}){
  let saved={};try{saved=JSON.parse(storage.getItem(KEY))||{};}catch{}
  let token=/^[a-f0-9]{64}$/.test(saved.token||'')?saved.token:'',enabled=false,timer=null,pending=null,latest=0,ready=false,stopped=0;
  // Duplicating a browser tab copies sessionStorage. A fresh page identity prevents
  // both tabs from accidentally sharing the same presentation lease.
  const client=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
  const save=()=>{saved={token,enabled};try{storage.setItem(KEY,JSON.stringify(saved));}catch{}};
  const status=(message,connected=false)=>{ready=connected;onStatus({message,connected});};
  async function request(path,body,authenticated=true){const controller=new AbortController(),timeout=setTimer(()=>controller.abort(),5000);try{
   const response=await fetch(BASE+'/v1/'+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(authenticated?{Authorization:'Bearer '+token,'X-Kogg-Client':client}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,cache:'no-store'});
   let data={};try{data=await response.json();}catch{}
   if(!response.ok){const e=new Error(data.message||'OBS connection failed.');e.status=response.status;throw e;}return data;
  }finally{clearTimer(timeout);}}
  function failure(error){if(error.status===401){enabled=false;token='';save();status('OBS pairing was removed. Enter a new code from its source properties.');}else if(error.status===409)status('Another KOGG tab is connected. Disconnect it first.');else if(error.status===413)status('This presentation exceeds the OBS transfer limit. Use a smaller background or logo, then retry.');else status('Waiting for OBS. Open OBS and allow local-network access if your browser asks. Retrying automatically.');}
  async function publish(){if(!enabled||!token)return;latest++;if(pending)return pending;const epoch=stopped;
   pending=(async()=>{let sent=-1;while(enabled&&epoch===stopped&&sent!==latest){sent=latest;const packet=await snapshot();if(!enabled||epoch!==stopped)return;if(sent!==latest)continue;await request('state',packet);if(epoch===stopped)status('Connected to OBS · latest presentation sent.',true);}})().catch(e=>{if(epoch===stopped)failure(e);}).finally(()=>{pending=null;});return pending;
  }
  async function heartbeat(){if(!enabled)return;const epoch=stopped;try{await request('claim',{});if(epoch!==stopped)return;const info=await request('status',undefined,false);if(!ready||info.hasState===false)await publish();if(epoch===stopped&&ready)status(info.sources?'Connected to OBS · '+info.sources+' source(s). Check the OBS preview.':'Connected · add a KOGG Presenter source in OBS.',true);}catch(e){if(epoch===stopped)failure(e);}finally{if(enabled&&epoch===stopped)timer=setTimer(heartbeat,2500);}}
  async function connect(code=''){clearTimer(timer);stopped++;enabled=false;await pending;status('Connecting to OBS…');try{
   const info=await request('status',undefined,false);if(info.plugin!=='kogg-connect'||info.version!==1)throw new Error('Update KOGG Connect in OBS.');
   if(code){const paired=await request('pair',{code:code.trim().toLowerCase()},false);if(!/^[a-f0-9]{64}$/.test(paired.token||''))throw new Error('Invalid pairing response.');token=paired.token;}
   if(!token)throw new Error('Enter the eight-character pairing code from KOGG Presenter source properties in OBS.');
   enabled=true;save();await heartbeat();
  }catch(e){enabled=false;save();status(e.name==='TypeError'||e.name==='AbortError'?'Could not reach the OBS plugin. Open OBS, add KOGG Presenter and allow local-network access if prompted.':e.message);}}
  async function disconnect(){enabled=false;stopped++;clearTimer(timer);await pending;try{if(token)await request('disconnect',{});}catch{}save();status('Disconnected from OBS. Your pairing is remembered on this device.');}
  function stop(){enabled=false;stopped++;clearTimer(timer);}
  function resume(){if(saved.enabled&&token){ready=false;enabled=true;heartbeat();}}
  return {connect,disconnect,publish,resume,stop,status:()=>({connected:ready,enabled})};
 }
 if(typeof module!=='undefined'){module.exports={create,BASE};return;}
 const statusEl=document.getElementById('obsConnectStatus');if(!statusEl)return;
 const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}};
 const api=create({fetch:window.fetch.bind(window),storage:localStorage,session:sessionStorage,crypto:window.crypto,onStatus:s=>{statusEl.textContent=s.message;statusEl.dataset.connected=String(s.connected);},snapshot:async()=>{
  const current=read('cp_live',{mode:'blank',slides:[],index:0}),themes=read('cp_themes',[]),ids=new Set([current.themeId,current.broadcast?.broadcastTheme,themes[0]?.id]);
  const packet={live:current,themes:themes.filter(t=>ids.has(t.id)),settings:window.KOGGLibrary.portableSettings(read('cp_settings',{})),assets:{}};
  for(const id of window.KOGGLibrary.assetIds(packet,false)){const image=await window.KOGGAssets?.get(id);if(image)packet.assets[id]=image;}return packet;
 }});
 document.getElementById('obsConnect').addEventListener('click',async()=>{const b=document.getElementById('obsConnect');b.disabled=true;try{await api.connect(document.getElementById('obsPairCode').value);document.getElementById('obsPairCode').value='';}finally{b.disabled=false;}});
 document.getElementById('obsDisconnect').addEventListener('click',()=>api.disconnect());
 window.KOGGOBS=api;window.addEventListener('pagehide',()=>api.stop());window.addEventListener('pageshow',event=>{if(event.persisted)api.resume();});api.resume();
})(typeof window!=='undefined'?window:globalThis);
