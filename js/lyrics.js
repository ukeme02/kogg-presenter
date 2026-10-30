/* Lightweight lyrics operations; no media or rendering dependencies. */
(function(scope){
 'use strict';
 function parse(text){let pending='';const result=[];for(const raw of String(text||'').replace(/\r\n?/g,'\n').split(/\n[ \t]*\n+/)){
   const block=raw.trim();if(!block)continue;const m=block.match(/^\[([^\]\n]+)\][ \t]*(?:\n|$)/);
   const section=m?m[1].trim():pending,body=(m?block.slice(m[0].length):block).trim();
   if(body){result.push({section,text:body});pending='';}else if(m)pending=section;
 }return result;}

 function serialize(sections){return sections.map(s=>(s.section?'['+s.section+']\n':'')+s.text.trim()).filter(Boolean).join('\n\n');}
 function ordered(song){const sections=parse(song.lyrics);const order=Array.isArray(song.order)&&song.order.length?song.order:sections.map((_,i)=>i);return order.filter(i=>Number.isInteger(i)&&sections[i]).map(i=>({...sections[i],sourceIndex:i}));}
 function slides(song){return ordered(song).map(s=>({text:s.text,label:song.title+(s.section?' — '+s.section:'')}));}
 function splitLines(sections,count=4){return sections.flatMap(s=>{const lines=s.text.split('\n');const result=[];for(let i=0;i<lines.length;i+=count)result.push({section:s.section,text:lines.slice(i,i+count).join('\n')});return result;});}
 function key(song){return String(song.title||'').normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'')+'|'+String(song.author||'').normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
 function duplicate(songs,song){return songs.find(s=>s.id!==song.id && (key(s)===key(song) || String(s.lyrics).trim()===String(song.lyrics).trim()));}
 function operation(sections,index,action){const a=sections.map(s=>({...s}));if(!a[index])return a;
  if(action==='delete')a.splice(index,1);
  if(action==='duplicate')a.splice(index+1,0,{...a[index]});
  if(action==='up'&&index>0)[a[index-1],a[index]]=[a[index],a[index-1]];
  if(action==='down'&&index<a.length-1)[a[index+1],a[index]]=[a[index],a[index+1]];
  if(action==='merge'&&a[index+1]){a[index].text+='\n'+a[index+1].text;a.splice(index+1,1);}
  if(action==='split'){const lines=a[index].text.split('\n'),mid=Math.ceil(lines.length/2);if(lines.length>1)a.splice(index,1,{...a[index],text:lines.slice(0,mid).join('\n')},{...a[index],text:lines.slice(mid).join('\n')});}
  return a;
 }
 function fromRecord(r){if(!r || !Number.isSafeInteger(r.id)||typeof r.trackName!=='string'||typeof r.plainLyrics!=='string'||!r.plainLyrics.trim()||r.plainLyrics.length>100000)return null;return {title:r.trackName,author:typeof r.artistName==='string'?r.artistName:'',lyrics:r.plainLyrics,source:{name:'LRCLIB',url:'https://lrclib.net/api/get/'+r.id,id:r.id}};}
 function importText(raw){let text=String(raw).replace(/\r\n?/g,'\n').trim();const lines=text.split('\n');let title=lines.shift()?.trim()||'Imported song';
  // SongSelect downloads often use an underline below the title.
  if(/^[-=]{3,}$/.test(lines[0]?.trim()||''))lines.shift();
  const credit=lines.findIndex(l=>/^(?:CCLI (?:Song|License) #|©|Copyright\b|All rights reserved\b)/i.test(l.trim()));
  const credits=credit>=0?lines.splice(credit).join('\n'):'';
  text=lines.join('\n').replace(/^(Verse\s*\d*|Chorus\s*\d*|Bridge\s*\d*|Intro|Outro|Ending|Tag|Pre[- ]Chorus\s*\d*)\s*$/gim,'[$1]').trim();
  return {title,author:'',lyrics:text,source:credits?{name:'Imported text',credits}:null};
 }
 const api={parse,serialize,ordered,slides,splitLines,key,duplicate,operation,fromRecord,importText};
 if(typeof module!=='undefined')module.exports=api;else scope.KOGGLyrics=api;
})(typeof window!=='undefined'?window:globalThis);
