/* Encrypted, short-lived remote packets over Supabase Broadcast. No library writes. */
(function(scope){'use strict';
 // The remote has its own guest client. Never reuse Sync credentials or library storage.
 let guestClient=null,guestReady=null;
 async function getGuestClient(){
  if(guestClient)return guestClient;
  const cfg=scope.KOGG_SUPABASE||{};
  if(!cfg.url||!cfg.anonKey)throw Error('Online remote is not configured on this deployment.');
  if(!guestReady)guestReady=(async()=>{
   if(!scope.supabase?.createClient)await new Promise((resolve,reject)=>{
    const script=scope.document.createElement('script');
    const timer=setTimeout(()=>{script.remove();reject(Error('Remote connection timed out. Check your internet and retry.'));},15000);
    script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.min.js';
    script.onload=()=>{clearTimeout(timer);resolve();};
    script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('Could not load online remote. Check your internet and retry.'));};
    scope.document.head.appendChild(script);
   });
   guestClient=scope.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'kogg-remote-guest'}});
   return guestClient;
  })().catch(error=>{guestReady=null;throw error;});
  return guestReady;
 }
 const encode=bytes=>btoa(String.fromCharCode(...bytes)),decode=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0)),utf=new TextEncoder();
 function createPair(){return {topic:crypto.randomUUID(),secret:encode(crypto.getRandomValues(new Uint8Array(32))),expiresAt:Date.now()+12*60*60*1000};}
 async function keyFor(pair){if(pair?.expiresAt!==undefined&&(!Number.isFinite(pair.expiresAt)||pair.expiresAt<=Date.now()))throw Error('Pairing link expired. Create a new one on the laptop.');if(!/^[a-f0-9-]{36}$/i.test(pair?.topic||''))throw Error('Invalid pairing link');const bytes=decode(pair.secret||'');if(bytes.length!==32)throw Error('Invalid pairing link');return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);}
 async function seal(pair,packet){const iv=crypto.getRandomValues(new Uint8Array(12)),key=await keyFor(pair),bytes=utf.encode(JSON.stringify({...packet,sentAt:Date.now()}));if(bytes.length>16000)throw Error('Remote packet too large');const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:utf.encode(pair.topic)},key,bytes);return {iv:encode(iv),cipher:encode(new Uint8Array(cipher))};}
 async function open(pair,packet){if(typeof packet?.cipher!=='string'||packet.cipher.length>24000||typeof packet.iv!=='string')throw Error('Invalid packet');const key=await keyFor(pair),iv=decode(packet.iv);if(iv.length!==12)throw Error('Invalid packet');const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:utf.encode(pair.topic)},key,decode(packet.cipher)),data=JSON.parse(new TextDecoder().decode(bytes));if(!Number.isFinite(data.sentAt)||Math.abs(Date.now()-data.sentAt)>20000)throw Error('Expired packet');return data;}
 async function connect(pair,onPacket,onStatus=()=>{},provider={getClient:getGuestClient}){
  await keyFor(pair);const client=await provider.getClient();let closed=false,connected=false,channel;
  const session={async send(packet){if(closed)throw Error('Remote disconnected');if(!connected)throw Error('Remote connection interrupted');const payload=await seal(pair,packet);if(closed)throw Error('Remote disconnected');const result=await channel.send({type:'broadcast',event:'remote',payload});if(result!=='ok')throw Error('Remote connection interrupted');},close(){if(closed)return;closed=true;connected=false;client.removeChannel(channel);onStatus('closed');}};
  channel=client.channel('kogg-remote-'+pair.topic,{config:{broadcast:{ack:true,self:false}}}).on('broadcast',{event:'remote'},async({payload})=>{try{const packet=await open(pair,payload);if(!closed)await onPacket(packet);}catch{/* Invalid or unauthenticated packets never control output. */}});
  try{await new Promise((resolve,reject)=>{let joined=false;const timer=setTimeout(()=>{session.close();reject(Error('Online remote timed out. Check your connection.'));},12000);channel.subscribe(status=>{connected=status==='SUBSCRIBED';onStatus(status);if(status==='SUBSCRIBED'){joined=true;clearTimeout(timer);resolve();}else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)&&!joined){clearTimeout(timer);reject(Error('Online remote unavailable. Try again when connected.'));}});});}catch(error){session.close();throw error;}
  return session;
 }
 const api={createPair,seal,open,connect,getGuestClient};if(typeof module!=='undefined')module.exports=api;else scope.KOGGCloudTransport=api;
})(typeof window!=='undefined'?window:globalThis);
