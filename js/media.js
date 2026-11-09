(function(scope){'use strict';
 const types={'image/png':'image','image/jpeg':'image','image/webp':'image','image/gif':'image','video/mp4':'video','video/webm':'video','video/ogg':'video'};
 function validate(file){const kind=types[file?.type];if(!kind)throw Error('Choose PNG, JPEG, WebP, GIF, MP4, WebM or Ogg video.');if(!file.size||file.size>(kind==='video'?250:20)*1024*1024)throw Error(kind==='video'?'Choose a video under 250 MB.':'Choose an image under 20 MB.');return kind;}
 function position(control,now=Date.now()){if(!control)return 0;return Math.max(0,Number(control.position)||0)+(control.playing?Math.max(0,now-(Number(control.at)||now))/1000:0);}
 function descriptor(raw){if(!raw||typeof raw.id!=='string'||!/^media-[a-z0-9-]+$/i.test(raw.id)||!['image','video'].includes(raw.kind))return null;return {id:raw.id,kind:raw.kind,fit:raw.fit==='cover'?'cover':'contain',dim:Math.max(0,Math.min(100,Number(raw.dim)||0)),muted:raw.muted!==false,loop:raw.loop===true};}
 const api={validate,position,descriptor};if(typeof module!=='undefined')module.exports=api;else scope.KOGGMedia=api;
})(typeof window!=='undefined'?window:globalThis);
