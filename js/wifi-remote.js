(()=>{'use strict';const $=id=>document.getElementById(id),buttons=[...document.querySelectorAll('[data-command]')];let peer=null,remote=null,scanStop=null,run=0;
 const status=message=>{$('remoteStatus').textContent=message;};
 const stopCamera=()=>{scanStop?.();scanStop=null;$('wifiCancelScan').hidden=true;};
 function reset(){run++;stopCamera();remote?.disconnect();peer?.close();remote=null;peer=null;$('wifiReply').value='';$('wifiReplyCode').replaceChildren();$('wifiReplyStep').hidden=true;$('wifiScanStep').hidden=false;$('wifiPairing').hidden=false;$('wifiControls').hidden=true;$('wifiUseOffer').disabled=false;status('Scan a new code from Stream → Phone remote · direct Wi-Fi on the laptop.');}
 async function pair(token){
  reset();const current=run;status('Creating your reply…');$('wifiUseOffer').disabled=true;
  const transport={async connect(pair,receive,onStatus){
   peer=KOGGWiFiTransport.create({onPacket:receive,onStatus});const endpoint=peer;const answer=await endpoint.answer(token);if(current!==run){endpoint.close();throw Error('Pairing stopped.');}
   $('wifiOffer').value='';$('wifiReply').value=answer;$('wifiScanStep').hidden=true;$('wifiReplyStep').hidden=false;
   try{await KOGGWiFiUI.qr($('wifiReplyCode'),answer,()=>current===run);}catch{status('QR unavailable. Use Copy reply code.');}
   if(current!==run)throw Error('Pairing stopped.');status('Show this reply code to the laptop’s camera.');return endpoint.ready;
  }};
  remote=KOGGCloudSession.createPhone({pair:{expiresAt:Date.now()+12*60*60*1000},transport,onStatus:message=>{if(current===run)status(message);},onState:(state,{active,pending})=>{
   if(current!==run)return;$('remoteConnection').textContent=active?'DIRECT WI-FI':pending?'SENDING':'NOT CONNECTED';$('remoteConnection').dataset.connected=String(active);
   if(active){$('wifiPairing').hidden=true;$('wifiControls').hidden=false;$('wifiReply').value='';$('wifiReplyCode').replaceChildren();}
   $('remoteLabel').textContent=state?.label||'Your presentation will appear here';$('remoteText').textContent=state?.mode==='blank'?'Screen is blank':state?.mode==='logo'?'Logo screen':state?.text||'';$('remotePosition').textContent=state?.total?(state.index+1)+' / '+state.total:'';
   buttons.forEach(button=>{const action=button.dataset.command;button.disabled=!active||pending||(['next','previous'].includes(action)&&state?.mode!=='normal')||(action==='blank'&&state?.mode==='blank')||(action==='resume'&&state?.mode!=='blank')||(!state?.scripture&&action==='next'&&state?.index>=state?.total-1)||(!state?.scripture&&action==='previous'&&state?.index<=0);});
  }});
  await remote.start();if(current===run)$('wifiUseOffer').disabled=false;
 }
 $('wifiScan').addEventListener('click',()=>{stopCamera();$('wifiCancelScan').hidden=false;scanStop=KOGGWiFiUI.scanner($('wifiCamera'),pair,error=>{status(error.message);$('wifiCancelScan').hidden=true;});});
 $('wifiCancelScan').addEventListener('click',stopCamera);$('wifiUseOffer').addEventListener('click',()=>pair($('wifiOffer').value));$('wifiCopy').addEventListener('click',()=>KOGGWiFiUI.copy($('wifiReply'),$('remoteStatus')));
 $('wifiRestart').addEventListener('click',reset);$('wifiPairAgain').addEventListener('click',reset);$('remoteDisconnect').addEventListener('click',reset);buttons.forEach(button=>button.addEventListener('click',()=>remote?.command(button.dataset.command)));
 window.addEventListener('pagehide',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera();});
 const token=new URLSearchParams(location.hash.slice(1)).get('offer');if(token){history.replaceState(null,'',location.pathname);pair(token);}
 async function prepare(){try{if(!('serviceWorker'in navigator))throw Error('Offline saving is not supported here.');const reg=await navigator.serviceWorker.register('sw.js');const check=()=>{(reg.active||reg.waiting)?.postMessage({type:'wifi-ready'});};navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='wifi-ready')$('wifiOfflineStatus').textContent=event.data.ready?'Phone ready offline · bookmark this page.':'Still saving this phone. Keep internet connected.';});if(reg.active)check();const worker=reg.installing||reg.waiting;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='activated')check();if(worker.state==='redundant')$('wifiOfflineStatus').textContent='Offline preparation failed. Reconnect and reload before your service.';});}catch{$('wifiOfflineStatus').textContent='Not saved offline yet. Open this page online once and reload.';}}
 prepare();
})();
