(()=>{'use strict';
 const status=$('wifiStatus'),offer=$('wifiOffer'),reply=$('wifiReply'),qr=$('wifiCode'),steps=$('wifiSteps');let peer=null,remote=null,scanStop=null,run=0;
 const snapshot=()=>({mode:live.mode,index:live.index||0,total:live.slides?.length||0,scripture:!!live.scripture,label:String(live.slides?.[live.index]?.label||live.title||'No slide').slice(0,200),text:String(live.slides?.[live.index]?.text||'').slice(0,2500)});
 const stopCamera=()=>{scanStop?.();scanStop=null;$('wifiCancelScan').hidden=true;};
 function stop(){run++;stopCamera();remote?.stop('Wi-Fi remote stopped.');peer?.close();peer=null;remote=null;offer.value='';reply.value='';qr.replaceChildren();steps.hidden=true;$('wifiStop').disabled=true;$('wifiStart').disabled=false;status.textContent='Stopped. The projected slide is unchanged.';}
 async function accept(value){try{if(!peer)throw Error('Start pairing first.');await peer.accept(value);reply.value='';stopCamera();status.textContent='Reply received. Connecting directly over Wi-Fi…';}catch(error){status.textContent=error.message;}}
 $('wifiStart').addEventListener('click',async()=>{
  stop();const current=run;$('wifiStart').disabled=true;$('wifiStop').disabled=false;status.textContent='Preparing your Wi-Fi code…';
  const transport={createPair:()=>({expiresAt:Date.now()+12*60*60*1000}),async connect(pair,receive,onStatus){
   peer=KOGGWiFiTransport.create({onPacket:receive,onStatus});const endpoint=peer;
   const token=await endpoint.offer();if(current!==run){endpoint.close();throw Error('Pairing stopped.');}
   const url=new URL('wifi-remote/',location.href);url.hash='offer='+token;offer.value=url.href;steps.hidden=false;
   try{await KOGGWiFiUI.qr(qr,url.href,()=>current===run);}catch{status.textContent='Use the copy-code option; the QR could not be displayed.';}
   if(current!==run)throw Error('Pairing stopped.');
   status.textContent='1. On the phone, open the saved Wi-Fi remote and scan this code. 2. Scan its reply here.';
   return endpoint.ready;
  }};
  remote=KOGGCloudSession.createOperator({transport,snapshot,execute:action=>KOGGRemoteOperator.execute(action),onStatus:message=>{if(current!==run)return;status.textContent=message.replace(/online/gi,'Wi-Fi');},onLink:pair=>{if(current!==run||!pair)return;steps.hidden=true;offer.value='';reply.value='';qr.replaceChildren();stopCamera();status.textContent='Direct Wi-Fi connected. No internet or bridge needed.';}});
  await remote.start();if(current===run)$('wifiStart').disabled=false;
 });
 $('wifiStop').addEventListener('click',stop);
 $('wifiScan').addEventListener('click',()=>{stopCamera();$('wifiCancelScan').hidden=false;status.textContent='Hold the phone’s reply code in front of this laptop’s camera.';scanStop=KOGGWiFiUI.scanner($('wifiCamera'),accept,error=>{status.textContent=error.message;$('wifiCancelScan').hidden=true;},{facingMode:'user'});});
 $('wifiCancelScan').addEventListener('click',stopCamera);
 $('wifiUseReply').addEventListener('click',()=>accept(reply.value));$('wifiCopy').addEventListener('click',()=>KOGGWiFiUI.copy(offer,status));
 $('wifiPrepare').addEventListener('click',async()=>{const url=new URL('wifi-remote/',location.href);$('wifiPreparePanel').hidden=false;await KOGGWiFiUI.qr($('wifiPrepareCode'),url.href).catch(error=>{status.textContent=error.message;});});
 window.KOGGWiFiRemote={publish:()=>remote?.publish(),stop};window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera();});
})();
