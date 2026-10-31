/* On-demand content packs. Content is data, never executable code. */
(function(scope){
 'use strict';
 function hymnKey(h){const first=String(h.lyrics||'').split('\n').find(line=>line.trim()&&!line.trim().startsWith('['));const base = first || h.title;return base.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
 function validatePack(data){if(!data||typeof data.pack!=='string'||!Array.isArray(data.hymns)||!data.hymns.length||data.hymns.length>3000||!data.hymns.every(h=>h&&typeof h.title==='string'&&h.title.trim()&&typeof h.lyrics==='string'&&h.lyrics.trim()&&h.lyrics.length<30000))throw new Error('Invalid hymn pack');return data;}
 function mergeHymns(songs,raw){const pack=validatePack(raw),have=new Set(songs.map(hymnKey)),items=[...songs];let added=0;for(const h of pack.hymns){const key=hymnKey(h);if(have.has(key))continue;items.push({id:h.id||pack.pack+'-'+key.slice(0,120),title:h.title,author:h.author||'',lyrics:h.lyrics,source:h.source||null});have.add(key);added++;}return {songs:items,added,pack:pack.pack};}
 async function readPack(file){if(!/^data\/[a-z0-9-]+\.json$/.test(file))throw new Error('Unsupported content pack');const response=await fetch(file);if(!response.ok)throw new Error('Reconnect once to download this hymn pack');return validatePack(await response.json());}
 const api={hymnKey,validatePack,mergeHymns,readPack};if(typeof module!=='undefined')module.exports=api;else scope.KOGGContent=api;
})(typeof window!=='undefined'?window:globalThis);
