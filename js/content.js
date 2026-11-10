/* On-demand content packs. Content is data, never executable code. */
(function(scope){
 'use strict';
 function hymnKey(h){const first=String(h.lyrics||'').split('\n').find(line=>line.trim()&&!line.trim().startsWith('['));const base = first || h.title;return base.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
 function validatePack(data){if(!data||typeof data.pack!=='string'||!Array.isArray(data.hymns)||!data.hymns.length||data.hymns.length>3000||!data.hymns.every(h=>h&&typeof h.title==='string'&&h.title.trim()&&typeof h.lyrics==='string'&&h.lyrics.trim()&&h.lyrics.length<30000))throw new Error('Invalid hymn pack');return data;}
 function mergeHymns(songs,raw){const pack=validatePack(raw),have=new Set(songs.map(hymnKey)),items=[...songs];let added=0;for(const h of pack.hymns){const key=hymnKey(h);if(have.has(key))continue;items.push({id:h.id||pack.pack+'-'+key.slice(0,120),title:h.title,author:h.author||'',lyrics:h.lyrics,source:h.source||null});have.add(key);added++;}return {songs:items,added,pack:pack.pack};}
 async function readPack(file){if(!/^data\/[a-z0-9-]+\.json$/.test(file))throw new Error('Unsupported content pack');const response=await fetch(file);if(!response.ok)throw new Error('Reconnect once to download this hymn pack');return validatePack(await response.json());}
 function packText(value,max,label){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Invalid '+label+' in song pack.');return value.trim();}
 function songPack(raw){
  if(!raw||raw.format!=='kogg-song-pack'||raw.version!==1||!Array.isArray(raw.songs)||raw.songs.length<1||raw.songs.length>200)throw Error('Choose a KOGG song pack with 1–200 songs.');
  const name=packText(raw.name,200,'pack name'),permission=packText(raw.permission,2000,'permission statement'),contributor=packText(raw.contributor,200,'contributor');
  if(raw.permissionConfirmed!==true)throw Error('The contributor must confirm permission to share this pack.');
  let size=0;
  const songs=raw.songs.map(song=>{
   const title=packText(song?.title,200,'song title'),lyrics=packText(song?.lyrics,30000,'lyrics');size+=lyrics.length;
   if(size>500000)throw Error('Song pack is too large. Use smaller packs.');
   const author=typeof song.author==='string'?song.author.slice(0,300):'',credits=typeof song.source?.credits==='string'?song.source.credits.slice(0,2000):'';
   let url='';try{const parsed=new URL(song.source?.url);if(parsed.protocol==='https:'&&!parsed.username&&!parsed.password)url=parsed.href;}catch{}
   return {title,author,lyrics,source:{name:'Community song pack',url,credits,permission,contributor,packName:name}};
  });
  return {format:'kogg-song-pack',version:1,name,permission,contributor,permissionConfirmed:true,songs};
 }
 function mergeSongPack(existing,raw,makeId){const keyOf=s=>[s.title,s.author||'',s.lyrics].map(v=>v.trim().normalize('NFKC')).join('\n'),pack=songPack(raw),items=[...existing],have=new Set(existing.map(keyOf));let added=0;for(const song of pack.songs){const key=keyOf(song);if(have.has(key))continue;items.push({...song,id:makeId()});have.add(key);added++;}return {songs:items,added,pack};}
 const api={hymnKey,validatePack,mergeHymns,readPack,songPack,mergeSongPack};if(typeof module!=='undefined')module.exports=api;else scope.KOGGContent=api;
})(typeof window!=='undefined'?window:globalThis);
