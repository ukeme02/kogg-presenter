/* Service title slides: small, offline, plain-data model. */
(function(scope){'use strict';
 const fonts=["'Nunito Sans Expanded', Georgia, serif",'Arial, sans-serif','Georgia, serif','Verdana, sans-serif','system-ui, sans-serif','Impact, Arial Black, sans-serif'];
 const backgrounds={blue:'linear-gradient(135deg,#07172f,#164ca0)',black:'#000000',purple:'linear-gradient(135deg,#170e31,#633f91)',green:'linear-gradient(135deg,#082d2a,#176c58)',gold:'linear-gradient(135deg,#281d0a,#785020)'};
 const presets=['Welcome','Opening Prayers','Praise and Worship','Offering','Scripture Reading','The Word','Announcements','Closing Prayers'];
 const str=(v,n)=>typeof v==='string'?v.slice(0,n):'';
 const num=(v,d,min,max)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):d;
 function style(raw={}){return {background:Object.hasOwn(backgrounds,raw.background)?raw.background:'blue',bgImage:str(raw.bgImage,16000000),bgImageId:str(raw.bgImageId,120),dim:num(raw.dim,20,0,100),font:fonts.includes(raw.font)?raw.font:fonts[0],fontSize:num(raw.fontSize,16,3,60),fillScreen:raw.fillScreen===true,textColor:/^#[0-9a-f]{6}$/i.test(raw.textColor||'')?raw.textColor:'#ffffff'};}
 function normalise(raw={},id=()=>Math.random().toString(36).slice(2)){
  const source=Array.isArray(raw.items)?raw.items:presets.slice(0,4).map(title=>({title}));
  const used=new Set();const items=source.slice(0,100).filter(x=>x&&typeof x==='object').map(x=>{let key=str(x.id,120);if(!key||used.has(key))key=id();used.add(key);return {id:key,title:str(x.title,240),style:style(x.style)};});
  return {id:str(raw.id,120)||id(),uniform:raw.uniform!==false,shared:style(raw.shared),items,selected:items.some(x=>x.id===raw.selected)?raw.selected:items[0]?.id||''};
 }
 function effective(state,item){return style(state.uniform?state.shared:item.style);}
 function setUniform(state,on){if(on&&!state.uniform){const item=state.items.find(x=>x.id===state.selected);if(item)state.shared=style(item.style);}state.uniform=!!on;return state;}
 function theme(state,item){const s=effective(state,item);return {id:'slide-'+state.id+'-'+(state.uniform?'shared':item.id),name:'Slides · '+(state.uniform?'Uniform':item.title||'Untitled'),bg:backgrounds[s.background],bgImage:s.bgImage,bgImageId:s.bgImageId,dim:s.dim,font:s.font,fontSize:s.fontSize,fillScreen:s.fillScreen,textColor:s.textColor,fontScale:1,margin:5,lineHeight:1.15,align:'center',vertical:'center',weight:'800',showLabel:false,shadow:true,imageFit:'cover'};}
 function move(state,id,delta){const i=state.items.findIndex(x=>x.id===id),j=i+delta;if(i>=0&&j>=0&&j<state.items.length)[state.items[i],state.items[j]]=[state.items[j],state.items[i]];return state;}
 const api={fonts,backgrounds,presets,style,normalise,effective,setUniform,theme,move};if(typeof module!=='undefined')module.exports=api;else scope.KOGGSlides=api;
})(typeof window!=='undefined'?window:globalThis);
