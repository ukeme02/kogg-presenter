/* Plain-text Notes deck model; no network or DOM dependencies. */
(function(scope){'use strict';
const modes=['points','fullscreen','tag','alert'];
const text=(value,max)=>typeof value==='string'?value.slice(0,max):'';
function normalise(raw={}){return {id:text(raw.id,120),title:text(raw.title,140)||'Message notes',body:text(raw.body,30000),subtitle:text(raw.subtitle,200),mode:modes.includes(raw.mode)?raw.mode:'points',index:Number.isInteger(raw.index)&&raw.index>=0?raw.index:0,pointsPerSlide:[1,3,4,5,6].includes(Number(raw.pointsPerSlide))?Number(raw.pointsPerSlide):0,alertDuration:[18,30,45].includes(Number(raw.alertDuration))?Number(raw.alertDuration):30,alertMotion:raw.alertMotion==='static'?'static':'scroll'};}
function slides(raw){const n=normalise(raw);if(!n.body.trim())return [];if(n.mode!=='points')return [{text:n.body.trim(),label:n.title}];
 const groups=n.body.replace(/\r\n?/g,'\n').split(/\n\s*\n/).map(t=>t.split('\n').map(line=>line.trim().replace(/^(?:[•*\-]|\d+[.)])(?:\s+|$)/,'')).filter(Boolean)).filter(g=>g.length);
 const pages=[];for(const group of groups){const size=n.pointsPerSlide||group.length;for(let i=0;i<group.length;i+=size)pages.push(group.slice(i,i+size));}
 return pages.slice(0,200).map((lines,i)=>({text:lines.map(line=>'• '+line).join('\n'),bullets:true,label:n.title+(pages.length>1?' · '+(i+1):'')}));
}
function owns(raw,live){if(live.mode==='blank')return false;const n=normalise(raw);return n.mode==='tag'?live.lowerThird?.on&&live.lowerThird.notesKey===n.id:n.mode==='alert'?live.alert?.on&&live.alert.notesKey===n.id:live.mode==='normal'&&live.notesKey===n.id;}
function patch(raw,themeId,live={}){const n=normalise(raw);if(!n.body.trim())throw new Error('Type some text before displaying.');
 const overlay=live.mode==='blank'?{mode:'normal',slides:[],index:0}:{mode:live.mode||'normal'};
 if(n.mode==='tag')return {...overlay,lowerThird:{on:true,l1:n.body.trim().replace(/\n+/g,' ').slice(0,200),l2:n.subtitle||n.title,notesKey:n.id}};
 if(n.mode==='alert'){const value=n.body.trim().replace(/\n+/g,' • ').slice(0,2000);return {...overlay,alert:{on:true,text:value,duration:n.alertDuration,motion:n.alertMotion,notesKey:n.id}};}
 const list=slides(n);if(!list.length)throw new Error('Type a point before displaying.');return {mode:'normal',slides:list,index:Math.min(n.index,list.length-1),title:n.title,themeId,notesKey:n.id,lyricsKey:null,lyricsSongId:null,scripture:null};}
// Bullets are visible while writing as well as on the projector.
function pointEditor(body){return text(body,30000).replace(/\r\n?/g,'\n').split('\n').map(line=>line.trim()? '• '+line.trim().replace(/^(?:[•*\-]|\d+[.)])\s*/,''):line).join('\n');}
function enterPoint(body,start,end=start){
 const before=body.slice(0,start),after=body.slice(end),lineStart=before.lastIndexOf('\n')+1,line=before.slice(lineStart);
 if(!line.trim()){const prefix=before.slice(0,lineStart);return {body:prefix+'• '+after,cursor:prefix.length+2};}
 if(/^\s*•\s*$/.test(line)){const prefix=before.slice(0,lineStart);return {body:prefix+'\n'+after,cursor:prefix.length+1};}
 const prefix=before.slice(0,lineStart)+(line.trimStart().startsWith('•')?line:'• '+line);
 return {body:prefix+'\n• '+after,cursor:prefix.length+3};
}
const templates={sermon:{mode:'points',title:'Message notes',body:'The main thought\nPut it into practice\nTake it with you'},announcement:{mode:'fullscreen',title:'Church announcement',body:'Church announcement\n\nAdd the event, date, time and location.'},minister:{mode:'tag',title:'Now ministering',body:'Minister name',subtitle:'Now ministering'},alert:{mode:'alert',title:'Church notice',body:'Welcome! Please silence your phones and enjoy the service.'},welcome:{mode:'fullscreen',title:'Welcome',body:'Welcome home.\nWe are glad you are here.'}};
const api={normalise,slides,patch,owns,templates,pointEditor,enterPoint};if(typeof module!=='undefined')module.exports=api;else scope.KOGGNotes=api;
})(typeof window!=='undefined'?window:globalThis);
