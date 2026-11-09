 /* Lightweight lyrics operations; no media or rendering dependencies. */
 (function(scope){
  'use strict';
  function parse(text){let pending='';const result=[];for(const raw of String(text||'').replace(/\r\n?/g,'\n').replace(/^(Verse\s*\d+|Chorus|Bridge|Pre[- ]Chorus|Intro|Outro|Tag)\s*:?[ \t]*$/gim,'[$1]').split(/\n[ \t]*\n+/)){
    const block=raw.trim();if(!block)continue;
    const lead=block.match(/^\[([^\]\n]+)\][ \t]*(?:\n|$)/);
    let current=lead?lead[1].trim():pending;
    const local=[];const buf=[];
    const flush=()=>{const t=buf.join('\n').trim();if(t)local.push({section:current,text:t});buf.length=0;};
    let tail=lead?current:null;   // a block that ends bare after its lead defers the heading
    for(const line of (lead?block.slice(lead[0].length):block).split('\n')){
      const hm=line.match(/^\[([^\]\n]+)\][ \t]*$/);
      if(hm){flush();current=hm[1].trim();tail=hm[1].trim();continue;}   // a heading defers to the next lines
      buf.push(line);
      if(line.trim())tail=null;
    }
    flush();
    result.push(...local);
    pending=tail!==null?tail:'';
  }return result;}

 function serialize(sections){return sections.map(s=>(s.section?'['+s.section+']\n':'')+s.text.trim()).filter(Boolean).join('\n\n');}
 function ordered(song){const sections=parse(song.lyrics);const order=Array.isArray(song.order)&&song.order.length?song.order:sections.map((_,i)=>i);return order.filter(i=>Number.isInteger(i)&&sections[i]).map(i=>({...sections[i],sourceIndex:i}));}
 function slides(song){return ordered(song).map(s=>({text:s.text,label:song.title+(s.section?' — '+s.section:'')}));}
 function splitLines(sections,count=4){count=Number(count);if(!Number.isInteger(count)||count<1||count>12)throw Error('Choose 1–12 lines per slide.');return sections.flatMap(s=>{const lines=s.text.split('\n').map(x=>x.trim()).filter(Boolean).flatMap(line=>{if(line.length<=100)return [line];const parts=[];let current='';for(const word of line.split(/\s+/)){if(current&&current.length+word.length+1>70){parts.push(current);current='';}current+=(current?' ':'')+word;}if(current)parts.push(current);return parts;});const result=[];for(let i=0;i<lines.length;i+=count)result.push({...s,text:lines.slice(i,i+count).join('\n')});return result;});}
 function prepare(song,count=4){const original=parse(song.lyrics),groups=original.map(s=>splitLines([s],count)),starts=[];let n=0;for(const g of groups){starts.push(n);n+=g.length;}const order=(song.order?.length?song.order:original.map((_,i)=>i)).filter(i=>Number.isInteger(i)&&groups[i]).flatMap(i=>groups[i].map((_,j)=>starts[i]+j));return {...song,lyrics:serialize(groups.flat()),order,linesPerSlide:count};}

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
 function fromRecord(r){if(!r||!Number.isSafeInteger(r.id)||typeof r.trackName!=='string'||r.instrumental)return null;let text=typeof r.plainLyrics==='string'?r.plainLyrics.trim():'';if(!text&&typeof r.syncedLyrics==='string')text=r.syncedLyrics.replace(/^(?:\[\d{1,3}:\d{2}(?:[.:]\d+)?\])+[ \t]*/gm,'').replace(/^\[(?:ar|ti|al|by|offset):.*\]$/gm,'').trim();if(!text||text.length>100000)return null;return {title:r.trackName,author:typeof r.artistName==='string'?r.artistName:'',lyrics:text,source:{name:'LRCLIB',url:'https://lrclib.net/api/get/'+r.id,id:r.id}};}

 function importText(raw){let text=String(raw).replace(/\r\n?/g,'\n').trim();const lines=text.split('\n');let title=lines.shift()?.trim()||'Imported song';
  // SongSelect downloads often use an underline below the title.
  if(/^[-=]{3,}$/.test(lines[0]?.trim()||''))lines.shift();
  const credit=lines.findIndex(l=>/^(?:CCLI (?:Song|License) #|©|Copyright\b|All rights reserved\b)/i.test(l.trim()));
  const credits=credit>=0?lines.splice(credit).join('\n'):'';
  text=lines.join('\n').replace(/^(Verse\s*\d*|Chorus\s*\d*|Bridge\s*\d*|Intro|Outro|Ending|Tag|Pre[- ]Chorus\s*\d*)\s*$/gim,'[$1]').trim();
  return {title,author:'',lyrics:text,source:credits?{name:'Imported text',credits}:null};
 }
 const api={parse,serialize,ordered,slides,splitLines,prepare,key,duplicate,operation,fromRecord,importText};
 if(typeof module!=='undefined')module.exports=api;else scope.KOGGLyrics=api;
})(typeof window!=='undefined'?window:globalThis);
