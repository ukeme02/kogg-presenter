(function(scope){'use strict';
 function prepare(items,themes,defaultId){const frames=[],issues=[],looks=JSON.parse(JSON.stringify(themes||[]));if(!items?.length)issues.push('The service plan is empty.');
  for(const [itemIndex,item] of (items||[]).entries()){const title=String(item.title||'Untitled item'),themeId=looks.some(t=>t.id===item.themeId)?item.themeId:defaultId;
   if(item.themeId&&!looks.some(t=>t.id===item.themeId))issues.push(title+': saved theme is missing; the current theme will be used.');
   if(!Array.isArray(item.slides)||!item.slides.length){issues.push(title+': no slides.');continue;}
   for(const [index,slide] of item.slides.entries()){if(!slide?.media&&(typeof slide?.text!=='string'||!slide.text.trim())){issues.push(title+': slide '+(index+1)+' is empty.');continue;}frames.push({title,itemIndex,slide:{text:slide.text||'',...(slide.media?{media:JSON.parse(JSON.stringify(slide.media))}:{}),label:String(slide.label||title),bullets:slide.bullets===true},themeId});if(!slide.media&&(slide.text.length>800||slide.text.split('\n').length>12))issues.push(title+': slide '+(index+1)+' is crowded; consider splitting it.');}
  }return {frames,issues,themes:looks,sessionOnly:(items||[]).some(x=>x.sessionOnly)};
 }
 const api={prepare};if(typeof module!=='undefined')module.exports=api;else scope.KOGGRehearsal=api;
})(typeof window!=='undefined'?window:globalThis);
