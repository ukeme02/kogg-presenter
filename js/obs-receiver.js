/* Bundled native-plugin renderer. No account, network CDN or operator storage. */
(()=>{'use strict';
 if(!new URLSearchParams(location.search).has('obsconnect'))return;
 const token=location.hash.slice(1);if(!/^[a-f0-9]{64}$/.test(token))return;
 let revision=-1,ended=false;
 async function poll(){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),4000);try{
  const response=await fetch('/v1/state?since='+revision,{headers:{Authorization:'Bearer '+token},signal:controller.signal,cache:'no-store'});
  if(!response.ok)throw new Error('Waiting for OBS');const packet=await response.json();
  if(!packet.unchanged){const data=packet.snapshot||{};window.KOGGOBSState={live:data.live||{mode:'blank',slides:[],index:0},settings:data.settings||{}};
   publishedThemes=Array.isArray(data.themes)&&data.themes.length?data.themes:null;
   bgCache.clear();for(const [id,image]of Object.entries(data.assets||{})){if(typeof image==='string'&&/^data:image\/(png|jpeg|webp|gif);base64,/.test(image))bgCache.set(id,image);}
   // Custom logos use the shared asset reader, without a persistent browser database.
   window.KOGGAssets={get:async id=>bgCache.get(id)};render(window.KOGGOBSState.live);revision=packet.revision;
  }
 }catch{}finally{clearTimeout(timeout);if(!ended)setTimeout(poll,150);}}
 window.addEventListener('pagehide',()=>{ended=true;});poll();
})();
