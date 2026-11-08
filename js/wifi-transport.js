/* Direct Wi-Fi data only. QR codes carry signaling; no network signaling servers. */
(function(scope){'use strict';
 const MAX_SDP=14000,MAX_TOKEN=6500,TTL=5*60*1000;
 const fail=message=>{throw Error(message);};
 function supported(){if(!scope.RTCPeerConnection||!scope.CompressionStream||!scope.DecompressionStream)fail('Use an up-to-date Chrome, Edge, Firefox or Safari browser for direct Wi-Fi pairing.');}
 async function bytes(stream,limit){const reader=stream.getReader(),parts=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)fail('Pairing code is too large.');parts.push(value);}}finally{await reader.cancel().catch(()=>{});}const out=new Uint8Array(size);let at=0;for(const part of parts){out.set(part,at);at+=part.length;}return out;}
 async function encode(data){const raw=new TextEncoder().encode(JSON.stringify(data));if(raw.length>MAX_SDP)fail('Too many network addresses. Disconnect unused VPNs and try again.');const compressed=await bytes(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate')),MAX_TOKEN);return 'KOGG1.'+btoa(String.fromCharCode(...compressed)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
 async function decode(input,kind,now=Date.now()){
  let token=String(input||'').trim();if(token.startsWith('https://')||token.startsWith('http://')){const url=new URL(token);token=new URLSearchParams(url.hash.slice(1)).get('offer')||'';}
  if(!/^KOGG1\.[A-Za-z0-9_-]+$/.test(token)||token.length>MAX_TOKEN)fail('This is not a KOGG Wi-Fi pairing code.');
  let data;try{const raw=Uint8Array.from(atob(token.slice(6).replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));data=JSON.parse(new TextDecoder().decode(await bytes(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate')),MAX_SDP)));}catch{fail('Could not read that pairing code. Scan again.');}
  if(data.v!==1||data.kind!==kind||!/^[-a-f0-9]{36}$/i.test(data.id||'')||!Number.isFinite(data.expires)||data.expires<=now||data.expires>now+TTL+30000)fail('Wrong or expired pairing code. Start again on the laptop.');
  if(typeof data.sdp!=='string'||data.sdp.length>MAX_SDP||!data.sdp.startsWith('v=0\r\n')||!data.sdp.includes('m=application ')||/^m=(audio|video) /m.test(data.sdp))fail('Invalid data connection.');
  // Do not allow scanned data to turn this into an internet relay or media call.
  const candidates=data.sdp.split(/\r?\n/).filter(line=>line.startsWith('a=candidate:'));
  if(!candidates.length||candidates.some(line=>!line.includes(' typ host')))fail('No direct Wi-Fi address in this code. Check your network and browser.');
  return data;
 }
 function create(options={}){
  supported();const pc=new scope.RTCPeerConnection({iceServers:[],bundlePolicy:'max-bundle'});
  let channel=null,closed=false,opened=false,answerApplied=false,pair=null,expiryTimer=null,gatherCancel=null;
  let resolveReady,rejectReady;const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});ready.catch(()=>{});
  const status=value=>options.onStatus?.(value);
  function close(reason='Wi-Fi remote stopped.') {if(closed)return;closed=true;clearTimeout(expiryTimer);gatherCancel?.(Error(reason));channel?.close();pc.close();rejectReady(Error(reason));status('closed');}
  function attach(dc){if(channel||dc.label!=='kogg-remote'){dc.close();return;}channel=dc;
   dc.onopen=()=>{if(closed)return;opened=true;clearTimeout(expiryTimer);expiryTimer=setTimeout(()=>close('Wi-Fi session expired. Pair again.'),12*60*60*1000);status('SUBSCRIBED');resolveReady(session);};
   dc.onmessage=event=>{if(closed||typeof event.data!=='string'||event.data.length>16000)return;try{const packet=JSON.parse(event.data);if(packet&&typeof packet==='object')Promise.resolve(options.onPacket?.(packet)).catch(()=>{});}catch{}};
   dc.onclose=()=>close('Wi-Fi connection closed. Pair again.');dc.onerror=()=>close('Wi-Fi connection failed. Pair again.');
  }
  pc.ondatachannel=event=>attach(event.channel);
  pc.onconnectionstatechange=()=>{if(closed)return;if(['failed','closed'].includes(pc.connectionState))close('Could not connect. Check both devices use the same Wi-Fi; guest networks may block devices.');else if(pc.connectionState==='disconnected')status('CHANNEL_ERROR');else if(pc.connectionState==='connected'&&opened)status('SUBSCRIBED');};
  async function gather(description){
   await pc.setLocalDescription(description);if(closed)fail('Pairing stopped.');
   if(pc.iceGatheringState!=='complete')await new Promise((resolve,reject)=>{
    const finish=error=>{clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',changed);gatherCancel=null;error?reject(error):resolve();};
    const changed=()=>{if(pc.iceGatheringState==='complete')finish();};
    const timer=setTimeout(()=>finish(Error('Could not find a local connection. Check your Wi-Fi and try again.')),12000);gatherCancel=finish;pc.addEventListener('icegatheringstatechange',changed);changed();
   });
   if(!pc.localDescription?.sdp.includes(' typ host'))fail('This browser did not expose a local Wi-Fi address. Try Chrome or Edge and check your network.');
   return pc.localDescription.sdp;
  }
  function arm(expires){clearTimeout(expiryTimer);expiryTimer=setTimeout(()=>close('Pairing expired. Start again on the laptop.'),Math.max(0,expires-Date.now()));}
  const session={async send(packet){if(closed||channel?.readyState!=='open')fail('Wi-Fi connection interrupted.');const text=JSON.stringify(packet);if(text.length>16000||channel.bufferedAmount>64000)fail('Wi-Fi connection is busy.');channel.send(text);},close};
  return {ready,close,
   async offer(){try{pair={v:1,kind:'offer',id:crypto.randomUUID(),expires:Date.now()+TTL};arm(pair.expires);attach(pc.createDataChannel('kogg-remote',{ordered:true}));pair.sdp=await gather(await pc.createOffer());return await encode(pair);}catch(error){close(error.message);throw error;}},
   async answer(token){try{pair=await decode(token,'offer');arm(pair.expires);await pc.setRemoteDescription({type:'offer',sdp:pair.sdp});const sdp=await gather(await pc.createAnswer());return await encode({...pair,kind:'answer',sdp});}catch(error){close(error.message);throw error;}},
   async accept(token){if(closed||!pair||pair.kind!=='offer')fail('Start a new Wi-Fi pairing first.');if(answerApplied)fail('Reply already received. Wait for the connection or start again.');const reply=await decode(token,'answer');if(reply.id!==pair.id||reply.expires!==pair.expires)fail('That reply belongs to another laptop code. Scan the current code.');await pc.setRemoteDescription({type:'answer',sdp:reply.sdp});answerApplied=true;},
  };
 }
 const api={create,encode,decode,supported};if(typeof module!=='undefined')module.exports=api;else scope.KOGGWiFiTransport=api;
})(typeof window!=='undefined'?window:globalThis);
