(function(scope){'use strict';
 const types={'image/png':'image','image/jpeg':'image','image/webp':'image','image/gif':'image','video/mp4':'video','video/webm':'video','video/ogg':'video'};
 function validate(file){const kind=types[file?.type];if(!kind)throw Error('Choose PNG, JPEG, WebP, GIF, MP4, WebM or Ogg video.');if(!file.size||file.size>(kind==='video'?250:20)*1024*1024)throw Error(kind==='video'?'Choose a video under 250 MB.':'Choose an image under 20 MB.');return kind;}
 function position(control,now=Date.now()){if(!control)return 0;return Math.max(0,Number(control.position)||0)+(control.playing?Math.max(0,now-(Number(control.at)||now))/1000:0);}
 function descriptor(raw){if(!raw||typeof raw.id!=='string'||!/^media-[a-z0-9-]+$/i.test(raw.id)||!['image','video'].includes(raw.kind))return null;return {id:raw.id,kind:raw.kind,fit:raw.fit==='cover'?'cover':'contain',dim:Math.max(0,Math.min(100,Number(raw.dim)||0)),muted:raw.muted!==false,loop:raw.loop===true};}
 function transition(live,patch,now,session){
  const slides=patch.slides??live.slides,index=patch.index??live.index,file=descriptor(slides?.[index]?.media);
  const changed=patch.slides!==undefined||(patch.index!==undefined&&patch.index!==live.index);
  if(changed&&patch.mediaControl===undefined)return {mediaControl:file?{position:0,at:now,playing:file.kind==='video'&&(patch.mode??live.mode)==='normal',session}:null};
  if(patch.mode&&patch.mode!=='normal'&&file)return {mediaControl:{...live.mediaControl,position:position(live.mediaControl,now),at:now,playing:false}};
  return {};
 }
 function serviceItem(item,options){const media=descriptor(item);if(!media)throw Error('Choose a valid media file first.');return {...options,type:'media',title:item.name,slides:[{text:'',label:item.name,media}]};}
 function referenced(id,queue,plans){return [...(queue||[]),...Object.values(plans||{}).flat()].some(item=>item.slides?.some(slide=>slide.media?.id===id));}
 const api={validate,position,descriptor,transition,serviceItem,referenced};if(typeof module!=='undefined')module.exports=api;else scope.KOGGMedia=api;
})(typeof window!=='undefined'?window:globalThis);
