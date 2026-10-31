/* Plain-text Notes deck model; no network or DOM dependencies. */
(function(scope){'use strict';
const modes=['points','fullscreen','tag','alert'];
const text=(value,max)=>typeof value==='string'?value.slice(0,max):'';
function normalise(raw={}){return {id:text(raw.id,120),title:text(raw.title,140)||'Message notes',body:text(raw.body,30000),subtitle:text(raw.subtitle,200),mode:modes.includes(raw.mode)?raw.mode:'points',index:Number.isInteger(raw.index)&&raw.index>=0?raw.index:0};}
function slides(raw){const n=normalise(raw);if(!n.body.trim())return [];const parts=n.mode==='points'?n.body.replace(/\r/g,'').split(/\n\s*\n/).map(t=>t.trim()).filter(Boolean).slice(0,200):[n.body.trim()];return parts.map((t,i)=>({text:t,label:n.title+(parts.length>1?' · '+(i+1):'')}));}
function owns(raw,live){const n=normalise(raw);return n.mode==='tag'?live.lowerThird?.on&&live.lowerThird.notesKey===n.id:n.mode==='alert'?live.alert?.on&&live.alert.notesKey===n.id:live.mode==='normal'&&live.notesKey===n.id;}
function patch(raw,themeId,live={}){const n=normalise(raw);if(!n.body.trim())throw new Error('Type some text before displaying.');
 const overlay=live.mode==='blank'?{mode:'normal',slides:[],index:0}:{mode:live.mode||'normal'};
 if(n.mode==='tag')return {...overlay,lowerThird:{on:true,l1:n.body.trim().replace(/\n+/g,' ').slice(0,200),l2:n.subtitle||n.title,notesKey:n.id}};
 if(n.mode==='alert'){const value=n.body.trim().replace(/\n+/g,' • ').slice(0,2000);return {...overlay,alert:{on:true,text:value,duration:Math.max(15,Math.min(90,value.length/7)),notesKey:n.id}};}
 const list=slides(n);return {mode:'normal',slides:list,index:Math.min(n.index,list.length-1),title:n.title,themeId,notesKey:n.id,lyricsKey:null,lyricsSongId:null};}
const templates={sermon:{mode:'points',title:'Message notes',body:'1. The main thought\nType the first point here.\n\n2. Put it into practice\nType the next point here.\n\n3. Take it with you\nType the closing thought here.'},announcement:{mode:'fullscreen',title:'Church announcement',body:'Church announcement\n\nAdd the event, date, time and location.'},minister:{mode:'tag',title:'Now ministering',body:'Minister name',subtitle:'Now ministering'},alert:{mode:'alert',title:'Church notice',body:'Welcome! Please silence your phones and enjoy the service.'},welcome:{mode:'fullscreen',title:'Welcome',body:'Welcome home.\nWe are glad you are here.'}};
const api={normalise,slides,patch,owns,templates};if(typeof module!=='undefined')module.exports=api;else scope.KOGGNotes=api;
})(typeof window!=='undefined'?window:globalThis);
