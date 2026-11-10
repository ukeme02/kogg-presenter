(()=>{'use strict';
 const status=$('cloudRemoteStatus'),link=$('cloudRemoteLink'),code=$('cloudRemoteCode');let qrReady;
 function snapshot(){return {mode:live.mode,index:live.index||0,total:live.slides?.length||0,scripture:!!live.scripture,label:String(live.slides?.[live.index]?.label||live.title||'No slide').slice(0,200),text:String(live.slides?.[live.index]?.text||'').slice(0,2500)};}
 function loadQR(){if(window.qrcode)return Promise.resolve();if(!qrReady)qrReady=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='js/vendor/qrcode.js';script.onload=resolve;script.onerror=()=>{script.remove();qrReady=null;reject(Error('Code unavailable. Use Copy link instead.'));};document.head.appendChild(script);});return qrReady;}
 async function showLink(pair){
  code.replaceChildren();code.hidden=true;link.value='';$('cloudRemotePairing').hidden=!pair;$('cloudRemoteStart').textContent=pair?'Create new connection':'Connect phone';$('cloudRemoteSteps').hidden=!!pair;$('cloudRemoteCopy').disabled=!pair;$('cloudRemoteShare').disabled=!pair;$('cloudRemoteStop').disabled=!pair;
  if(!pair)return;
  const base=location.protocol==='https:'?location.href:'https://kogg-presenter.pages.dev/';const url=new URL('cloud-remote.html',base);url.hash='pair='+encodeURIComponent(btoa(JSON.stringify(pair)));link.value=url.href;const expected=url.href;
  try{await loadQR();if(link.value!==expected)return;const qr=window.qrcode(0,'M');qr.addData(expected);qr.make();code.innerHTML=qr.createSvgTag({cellSize:4,margin:16,scalable:true});code.hidden=false;}catch{if(link.value===expected)status.textContent='Pairing link ready. Use Copy link; the QR code could not load.';}
 }
 const remote=window.KOGGCloudSession.createOperator({transport:window.KOGGCloudTransport,snapshot,execute:action=>window.KOGGRemoteOperator.execute(action),onStatus:message=>{if(status.textContent!==message)status.textContent=message;},onLink:showLink});
 $('cloudRemoteStart').addEventListener('click',async()=>{const button=$('cloudRemoteStart');button.disabled=true;button.textContent='Connecting…';try{await remote.start();}finally{button.disabled=false;button.textContent=link.value?'Create new connection':'Connect phone';}});
 $('cloudRemoteStop').addEventListener('click',()=>remote.stop());
 async function copy(){if(!link.value)return;try{await navigator.clipboard.writeText(link.value);status.textContent='Private pairing link copied. Open it on your phone.';}catch{link.focus();link.select();status.textContent='Select and copy the pairing link.';}}
 $('cloudRemoteCopy').addEventListener('click',copy);
 $('cloudRemoteShare').addEventListener('click',async()=>{if(!link.value)return;if(!navigator.share){await copy();return;}try{await navigator.share({title:'KOGG phone remote',url:link.value});}catch(error){if(error.name!=='AbortError')await copy();}});
 window.KOGGCloudRemote=remote;window.addEventListener('pagehide',()=>remote.stop());
})();
