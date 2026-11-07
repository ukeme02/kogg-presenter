/* Optional same-origin loopback bridge for OBS's separate browser process. */
(function () {
  'use strict';
  const local = location.hostname === '127.0.0.1' && location.protocol === 'http:';
  let active = false, sequence = 0, receiving = 0, sendQueue = Promise.resolve();
  async function publish(live, themes, settings) {
    if (!active) return;
    const token = ++sequence;
    try {
      const data = {live,themes,settings:window.KOGGLibrary.portableSettings(settings),assets:{}};
      for (const id of window.KOGGLibrary.assetIds(data,false)) {
        const image = await window.KOGGAssets?.get(id);
        if (image) data.assets[id] = image;
      }
      if (token !== sequence) return;
      sendQueue = sendQueue.catch(() => {}).then(async () => {
        if (token !== sequence) return;
        const response = await fetch('/__kogg/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        if (!response.ok) throw new Error('Output bridge failed (' + response.status + ')');
        if(!connection.ready)connection={ready:true,message:'Bridge connected. Latest output sent. Check connection to count readers.'};
      });
      await sendQueue;
    } catch (err) { connection={ready:false,message:'Could not send the latest output. Check the local bridge and retry.'}; console.warn(err.message); }
  }
  let events=null, commands=null, commandHandler=null, checking=null;
  let connection={ready:false,message:local?'Bridge not checked yet.':'Window Capture works here. Browser Source needs the local bridge.'};
  function check(){
    if(!local)return Promise.resolve(connection);
    if(checking)return checking;
    checking=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4000);
    try{const response=await fetch('/__kogg/status',{signal:controller.signal,cache:'no-store'});const status=response.ok?await response.json():null;
    if(!status?.relay)throw new Error('Local bridge is not running at this address.');
    active=true;connection={ready:true,message:'Bridge ready · '+(Number(status.readers)||0)+' connected output reader(s) at last check. Readers may be browsers or OBS.'};
    await connect();if(status.remote)connectCommands();
    }catch(error){active=false;connection={ready:false,message:'Bridge unavailable. Start it and open its local operator, then check again.'};}
    finally{clearTimeout(timer);checking=null;}return connection;})();return checking;
  }
  window.KOGGRelay = {publish,check,status:()=>({...connection}),setCommandHandler:fn=>{commandHandler=fn;if(active)check();}};
  function connectCommands(){if(commands||!commandHandler||typeof EventSource==='undefined')return;commands=new EventSource('/__kogg/remote/operator');commands.onmessage=async event=>{let command;try{command=JSON.parse(event.data);await commandHandler(command.action);const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))||f;}catch{return f;}};await publish(read('cp_live',{}),read('cp_themes',[]),read('cp_settings',{}));await fetch('/__kogg/remote/ack',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:command.id,ok:true})});}catch(error){if(command)await fetch('/__kogg/remote/ack',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:command.id,ok:false,message:error.message})}).catch(()=>{});}};}

  function connect(){
    if (!location.pathname.endsWith('display.html')) {
      const read = (k,fallback) => { try { return JSON.parse(localStorage.getItem(k)) || fallback; } catch { return fallback; } };
      const themes=read('cp_themes',[]);
      // On a fresh install the operator has not seeded its themes yet. Its first
      // publish will send them; an empty bootstrap must not report a false error.
      if(themes.length)return publish(read('cp_live',{mode:'blank',slides:[],index:0}),themes,read('cp_settings',{}));
      return;
    }
    if(events)return;
    events = new EventSource('/__kogg/events');
    events.onmessage = async event => {
      const token = ++receiving;
      try {
        const data = JSON.parse(event.data);
        for (const [id,image] of Object.entries(data.assets || {})) await window.KOGGAssets?.put(id,image);
        if (token !== receiving) return;
        localStorage.setItem('cp_themes',JSON.stringify(data.themes));
        localStorage.setItem('cp_settings',JSON.stringify(data.settings));
        localStorage.setItem('cp_live',JSON.stringify(data.live));
        if (typeof render === 'function') render(data.live);
      } catch (err) { console.warn('Output bridge:',err.message); }
    };
  }
  if(local)check();
})();
