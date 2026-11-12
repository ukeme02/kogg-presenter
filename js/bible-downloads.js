/* Inspect/remove optional downloads without fetching text or changing projection. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KOGGBibleDownloads=api;})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const core=new Set(['data/kjv.json','data/bsb.json','data/kjvs.json','data/strongs.json','data/hymns.json']);
  function create({caches,href,files}){
    const allowed=new Set(files.filter(file=>/^data\/[a-z0-9-]+\.json$/.test(file)&&!core.has(file)));
    const url=file=>new URL(file,href).href;
    async function stores(){if(!caches)throw new Error('Offline storage is unavailable in this browser.');return Promise.all((await caches.keys()).filter(name=>/^kogg-presenter-v\d+$/.test(name)).map(name=>caches.open(name)));}
    async function status(){
      const result=new Map();
      try{const list=await stores();await Promise.all([...allowed].map(async file=>result.set(file,(await Promise.all(list.map(cache=>cache.match(url(file))))).some(Boolean))));}
      catch{for(const file of allowed)result.set(file,null);}
      return result;
    }
    async function remove(file){
      if(!allowed.has(file))throw new Error('Only optional Bible downloads can be removed.');
      const list=await stores();await Promise.all(list.map(cache=>cache.delete(url(file))));
      if((await Promise.all(list.map(cache=>cache.match(url(file))))).some(Boolean))throw new Error('Could not remove this download. Please retry.');
    }
    return {status,remove};
  }
  return {create};
});
