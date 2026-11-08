/* QR presentation and camera scanning are local; video is never sent to a server. */
(()=>{'use strict';
 const root=new URL('../',document.currentScript.src),loads=new Map();
 function load(path){if(!loads.has(path))loads.set(path,new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL(path,root);script.onload=resolve;script.onerror=()=>{loads.delete(path);script.remove();reject(Error('Scanner is not saved offline yet. Connect to internet once and prepare this page.'));};document.head.appendChild(script);}));return loads.get(path);}
 async function qr(element,text,isCurrent=()=>true){await load('js/vendor/qrcode.js');if(!isCurrent())return;const code=qrcode(0,'M');code.addData(text);code.make();element.innerHTML=code.createSvgTag({cellSize:4,margin:20,scalable:true});element.hidden=false;}
 function scanner(video,onValue,onError,{facingMode='environment'}={}){
  let active=true,stream=null,timer=null;
  const stop=()=>{active=false;clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());video.srcObject=null;video.hidden=true;};
  (async()=>{try{
   await load('js/vendor/jsqr.js');if(!active)return;
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera unavailable in this browser. Use the code option below.');
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facingMode},width:{ideal:1280},height:{ideal:720}}});if(!active){stream.getTracks().forEach(t=>t.stop());return;}
   video.srcObject=stream;video.hidden=false;await video.play();
   const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
   const tick=()=>{if(!active)return;try{if(video.readyState>=2&&video.videoWidth){const scale=Math.min(1,960/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);ctx.drawImage(video,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);const result=jsQR(pixels.data,pixels.width,pixels.height,{inversionAttempts:'dontInvert'});if(result?.data){stop();onValue(result.data);return;}}timer=setTimeout(tick,180);}catch(error){stop();onError(error);}};tick();
  }catch(error){stop();onError(Error(error.name==='NotAllowedError'?'Camera permission was not allowed. Use the code option below or allow the camera and retry.':error.message||'Camera unavailable. Use the code option below.'));}})();return stop;
 }
 async function copy(input,status){try{await navigator.clipboard.writeText(input.value);status.textContent='Code copied.';}catch{input.focus();input.select();status.textContent='Select and copy this code.';}}
 window.KOGGWiFiUI={qr,scanner,copy};
})();
