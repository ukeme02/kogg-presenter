/* Mixed service playback uses the same output and remote navigation as every deck. */
(()=>{'use strict';
 let checkRun=0,relinkTarget=null;
 function renderLive(){
  const slide=live.slides?.[live.index],normal=live.mode==='normal',video=normal&&slide?.media?.kind==='video';
  $('serviceNow').textContent=normal&&slide?`${live.index+1} / ${live.slides.length} · ${slide.label||live.title||'Live output'}`:live.mode==='blank'?'Output is blank':'Logo is on Output';
  $('servicePrev').disabled=!normal||!slide||live.index<=0;
  $('serviceNext').disabled=!normal||!slide||live.index>=live.slides.length-1;
  $('serviceVideoControls').hidden=!video;
  $('serviceVideoPlay').disabled=!video||!!live.mediaControl?.playing;
  $('serviceVideoPause').disabled=!video||!live.mediaControl?.playing;
  const box=$('serviceLivePreview');applyOutputLook(box);
  projectorPreview(box,normal&&slide?esc(stripStrongs(slide.text)):'',normal?slide:null);
  const active=normal?live.serviceFrames?.[live.index]?.itemId:null;
  for(const row of $('serviceList').children)row.classList.toggle('is-live',row.dataset.id===active);
 }
 async function checkFiles(){
  const run=++checkRun;
  for(const row of $('serviceList').children){
   const item=service.find(x=>x.id===row.dataset.id),file=item?.slides?.[0]?.media;
   if(!file)continue;
   const status=row.querySelector('[data-media-status]');status.textContent='Checking file…';
   let ready=false;try{ready=(await KOGGAssets.get(file.id)) instanceof Blob;}catch{}
   if(run!==checkRun)return;
   status.textContent=ready?'Ready on this device':'File missing on this device';
   row.querySelector('[data-act="relink"]').hidden=ready;
   status.dataset.missing=String(!ready);
  }
 }
 function relink(item){relinkTarget={id:item.id,media:{...item.slides[0].media}};$('serviceMediaFile').click();}
 $('serviceMediaFile').addEventListener('change',async()=>{
  const input=$('serviceMediaFile'),file=input.files?.[0],target=relinkTarget;input.value='';relinkTarget=null;if(!file||!target)return;
  try{
   if(KOGGMedia.validate(file)!==target.media.kind)throw Error('Choose the same kind of file: '+target.media.kind+'.');
   if(!service.some(x=>x.id===target.id&&x.slides?.[0]?.media?.id===target.media.id))throw Error('The service changed. Select Relink again.');
   if(!await KOGGAssets.put(target.media.id,file))throw Error('Could not save the file. Check device storage.');
   $('serviceStatus').textContent='File linked on this device. Start the item when ready; Output has not changed.';
   checkFiles();
  }catch(error){$('serviceStatus').textContent=error.message;}
 });
 $('servicePrev').onclick=()=>prev();$('serviceNext').onclick=()=>next();
 $('serviceBlank').onclick=()=>pushLive({mode:live.mode==='blank'?'normal':'blank'});
 for(const [id,action] of [['serviceVideoPlay','play'],['serviceVideoPause','pause'],['serviceVideoRestart','restart']])$(id).onclick=()=>window.KOGGMediaDeck.control(action);
 window.KOGGServiceMedia={renderLive,checkFiles,relink};renderService();
})();
