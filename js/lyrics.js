 /* Lightweight lyrics operations; no media or rendering dependencies. */
 (function(scope){
  'use strict';
  /* Split a lone unbroken section (typical of lyrics scraped from the web) into
     balanced, four-line slides without cutting a repeated refrain in half. */
  function balanceSection(sole){
    const lines=sole.text.split('\n').map(l=>l.trim()).filter(l=>l);
    if(lines.length<8)return null;
    const norm=l=>l.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
    const counts=new Map();
    for(const line of lines){const k=norm(line);if(k)counts.set(k,(counts.get(k)||0)+1);}
    const repeated=lines.map(l=>norm(l)&&counts.get(norm(l))>1);
    const chorusish=lines.map((_,i)=>repeated[i]||(i>0&&i<lines.length-1&&repeated[i-1]&&repeated[i+1]));
    const runs=[];for(let i=0;i<lines.length;){if(!chorusish[i]){i++;continue;}let j=i;while(j<lines.length&&chorusish[j])j++;if(j-i>=2)runs.push([i,j-1]);i=j;}
    const runStart=runs.map(r=>r[0]);
    const chunks=[];let i=0;
    while(i<lines.length){
      let size;
      const run=runs.find(r=>r[0]===i);
      if(run&&run[1]-run[0]+1<=5){
        size=run[1]-run[0]+1;                             // a repeat block stays whole
        chunks.push({section:'Chorus',text:lines.slice(i,i+size).join('\n')});
      }else{
        size=4;
        const near=runStart.find(s=>s>i+1&&s<i+size+1);    // a refrain hard by the window
        if(near)size=near-i;
        size=Math.min(size,lines.length-i);
        chunks.push({section:'',text:lines.slice(i,i+size).join('\n')});
      }
      i+=size;
    }
    const last=chunks[chunks.length-1];
    if(last.section!=='Chorus'&&last.text.split('\n').length===1){
      const prev=chunks[chunks.length-2];
      prev.text+='\n'+last.text;chunks.pop();             // no orphan single-line slides
    }
    if(chunks.length<2)return null;
    return chunks.map((c,idx)=>({section:c.section||(idx===0&&sole.section)||'',text:c.text}));
  }
  function parse(text){let pending='';const result=[];for(const raw of String(text||'').replace(/\r\n?/g,'\n').split(/\n[ \t]*\n+/)){
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
  }if(result.length===1){const balanced=balanceSection(result[0]);if(balanced)return balanced;}return result;}

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
