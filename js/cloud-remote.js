(()=>{'use strict';const $=id=>document.getElementById(id),buttons=[...document.querySelectorAll('[data-command]')];let pair;
 try{const saved=location.hash.startsWith('#pair=')?decodeURIComponent(location.hash.slice(6)):sessionStorage.getItem('kogg-cloud-pair');if(saved){pair=JSON.parse(atob(saved));try{sessionStorage.setItem('kogg-cloud-pair',saved);}catch{}history.replaceState(null,'',location.pathname);}}catch{}
 const remote=window.KOGGCloudSession.createPhone({pair,transport:window.KOGGCloudTransport,
  onForget(){try{sessionStorage.removeItem('kogg-cloud-pair');}catch{}},
  onStatus(message){if($('remoteStatus').textContent!==message)$('remoteStatus').textContent=message;},
  onState(state,{active,pending}){
   $('remoteConnection').textContent=active?'CONNECTED':pending?'SENDING':'NOT CONNECTED';$('remoteConnection').dataset.connected=String(active);
   $('remoteLabel').textContent=state?.label||'Your presentation will appear here';
   $('remoteText').textContent=state?.mode==='blank'?'Screen is blank':state?.mode==='logo'?'Logo screen':state?.text||'';
   $('remotePosition').textContent=state?.total?(state.index+1)+' / '+state.total:'';
   buttons.forEach(button=>{const action=button.dataset.command;button.disabled=!active||pending||(['next','previous'].includes(action)&&state?.mode!=='normal')||(action==='blank'&&state?.mode==='blank')||(action==='resume'&&state?.mode!=='blank')||(!state?.scripture&&action==='next'&&state?.index>=state?.total-1)||(!state?.scripture&&action==='previous'&&state?.index<=0);});
  }
 });

 buttons.forEach(button=>button.addEventListener('click',()=>remote.command(button.dataset.command)));
 $('remoteDisconnect').addEventListener('click',()=>remote.disconnect());$('remoteReconnect').addEventListener('click',()=>remote.start());
 window.addEventListener('pagehide',()=>remote.stop('Disconnected.'));
 window.addEventListener('pageshow',event=>{if(event.persisted)remote.wake();});window.addEventListener('online',()=>remote.wake());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)remote.wake();});
 if(pair){$('remoteReconnect').hidden=false;remote.start();}else{remote.stop('On the laptop, open Stream → Phone remote → Online. Scan its QR code to connect. No account needed.');$('remoteReconnect').hidden=true;}
})();
