/* Online remote lifecycle. Transport carries encrypted packets; no library writes. */
(function(scope){'use strict';
 const failed=['CHANNEL_ERROR','TIMED_OUT','CLOSED','closed'];
 function createOperator(o){
  const now=o.now||Date.now,set=o.setTimer||setTimeout,clear=o.clearTimer||clearTimeout;
  let connection=null,generation=0,revision=0,view={},busy=false,timer=null,lastPhone=0,ready=false;
  const handled=new Map();
  const status=message=>o.onStatus?.(message);
  function refresh(){const next=o.snapshot();if(JSON.stringify(next)!==JSON.stringify(view)){view=next;revision++;}return {type:'state',...view,revision};}
  async function publish(){const session=connection;if(!session||!ready)return;const state=refresh();try{await session.send(state);}catch{if(session===connection)status('Connection interrupted. Reconnecting…');}}
  function stop(message='Online remote stopped. Create a new link to connect again.'){
   generation++;const old=connection;connection=null;ready=false;busy=false;lastPhone=0;clear(timer);handled.clear();o.onLink?.('');status(message);
   // The laptop stops accepting commands immediately, even if revocation cannot be delivered.
   if(old)Promise.resolve(old.send({type:'ended'})).catch(()=>{}).finally(()=>old.close());
  }
  async function start(){
   stop('Connecting online remote…');const run=generation;let session;
   try{
    await o.canStart?.();const pair=o.transport.createPair();
    const receive=async packet=>{
     if(run!==generation||!connection||!ready)return;
     if(packet.type==='hello'){lastPhone=now();status('Phone connected · ready to control this presentation.');await session.send(refresh());return;}
     if(packet.type==='bye'){lastPhone=0;status('Phone disconnected. Scan or share the link to reconnect.');return;}
     if(packet.type!=='command'||typeof packet.id!=='string'||!/^[a-zA-Z0-9-]{12,80}$/.test(packet.id))return;
     lastPhone=now();
     if(!handled.has(packet.id)){
      const task=(async()=>{
       let error='';refresh();
       if(busy)error='Another command is still finishing.';
       else if(packet.revision!==revision)error='Output changed. Review the preview and try again.';
       else if(!['next','previous','blank','resume'].includes(packet.action))error='Unsupported command.';
       else {busy=true;try{await o.execute(packet.action);}catch(e){error=e.message||'The command could not finish.';}finally{if(run===generation)busy=false;}}
       return {type:'ack',id:packet.id,ok:!error,message:error||'Operator confirmed.',state:refresh()};
      })();
      handled.set(packet.id,task);if(handled.size>200)handled.delete(handled.keys().next().value);
     }
     const ack=await handled.get(packet.id);if(run===generation&&connection===session)await session.send(ack);
    };
    session=await o.transport.connect(pair,receive,state=>{
     if(run!==generation)return;ready=state==='SUBSCRIBED';
     if(state==='SIGNED_OUT'){stop('Sign in to Sync again, then create a new remote link.');return;}
     if(failed.includes(state))status('Connection interrupted. Waiting to reconnect…');
     if(state==='SUBSCRIBED'&&connection){status('Connection restored. Waiting for the phone…');publish();}
    });
    if(run!==generation){session.close();return;}
    connection=session;ready=true;revision=0;view={};refresh();o.onLink?.(pair);status('Scan the code or share the link. Sign in on your phone to connect.');
    function tick(){if(run!==generation)return;if(pair.expiresAt&&now()>=pair.expiresAt){stop('Pairing expired. Start a new online remote.');return;}if(lastPhone&&now()-lastPhone>8000){lastPhone=0;status('Phone is not responding. Its controls will reconnect when it returns.');}timer=set(tick,2000);}
    tick();await publish();
   }catch(error){if(session)session.close();if(run===generation){connection=null;ready=false;o.onLink?.('');status(error.message);}}
  }
  return {start,stop,publish};
 }
 function createPhone(o){
  const now=o.now||Date.now,set=o.setTimer||setTimeout,clear=o.clearTimer||clearTimeout;
  let pair=o.pair,connection=null,generation=0,revision=-1,seen=0,ready=false,stopped=true,timer=null,pending=null,lastState=null;
  const status=message=>o.onStatus?.(message);
  function draw(){const active=!!connection&&ready&&!stopped&&seen>0&&now()-seen<7000;o.onState?.(lastState,{active,pending:!!pending});}
  function accept(state){if(!Number.isInteger(state?.revision)||state.revision<revision)return;revision=state.revision;seen=now();lastState=state;draw();}
  function stop(message='Disconnected.',forget=false){
   generation++;stopped=true;ready=false;clear(timer);const old=connection;connection=null;old?.close();
   if(pending){clear(pending.timer);pending.resolve(false);pending=null;}seen=0;if(forget){pair=null;lastState=null;o.onForget?.();}status(message);draw();
  }
  async function start(){
   stop('Connecting…');stopped=false;revision=-1;lastState=null;const run=generation;draw();
   try{
    if(!pair)throw Error('Scan a new pairing code from Stream on the laptop.');
    const session=await o.transport.connect(pair,packet=>{
     if(run!==generation)return;
     if(packet.type==='ended'){stop('The laptop ended this session. Scan a new pairing code to reconnect.',true);return;}
     if(packet.type==='state'){accept(packet);if(!pending)status('Connected · ready');}
     else if(packet.type==='ack'&&pending?.id===packet.id){if(packet.state)accept(packet.state);clear(pending.timer);pending.resolve(packet.ok);pending=null;status(packet.message||'Operator confirmed.');draw();}
    },state=>{
     if(run!==generation)return;
     if(state==='SIGNED_OUT'){stop('Sign in again to reconnect.');o.onAuth?.(true);return;}
     ready=state==='SUBSCRIBED';
     if(!ready){seen=0;status('Connection interrupted. Controls paused.');draw();}
     if(ready&&connection)ping();
    });
    if(run!==generation){session.close();return;}connection=session;ready=true;o.onAuth?.(false);ping();
   }catch(error){if(run===generation){stop(error.message);o.onAuth?.(/sign in/i.test(error.message));}}
  }
  async function ping(){
   clear(timer);if(!connection||stopped)return;const run=generation,session=connection;
   if(pair.expiresAt&&now()>=pair.expiresAt){stop('Pairing expired. Scan a new code from the laptop.',true);return;}
   try{await session.send({type:'hello'});}catch{}
   if(run!==generation)return;
   if(!seen||now()-seen>=7000){status('Waiting for the laptop. Controls paused.');draw();}
   timer=set(ping,2000);
  }
  async function command(action){
   if(!connection||!ready||stopped||pending||!seen||now()-seen>=7000)return false;
   if(!['next','previous','blank','resume'].includes(action))return false;
   if(['next','previous'].includes(action)&&lastState?.mode!=='normal')return false;
   const run=generation,id=(o.uuid||(()=>crypto.randomUUID()))(),session=connection;
   let resolve;const result=new Promise(r=>resolve=r);
   pending={id,resolve,timer:set(()=>{if(pending?.id!==id)return;pending=null;seen=0;status('No confirmation received. Check the laptop before trying again.');draw();resolve(false);},6000)};
   status('Sending…');draw();
   try{await session.send({type:'command',id,action,revision});}catch(error){if(run===generation&&pending?.id===id){clear(pending.timer);pending=null;seen=0;status('Could not send. Waiting for the laptop…');draw();resolve(false);}}
   return result;
  }
  function disconnect(){const old=connection;if(old)old.send({type:'bye'}).catch(()=>{});stop('Disconnected. Scan a pairing code to reconnect.',true);}
  return {start,stop,command,disconnect,wake(){if(stopped){if(pair)start();}else ping();}};
 }
 const api={createOperator,createPhone};if(typeof module!=='undefined')module.exports=api;else scope.KOGGCloudSession=api;
})(typeof window!=='undefined'?window:globalThis);
