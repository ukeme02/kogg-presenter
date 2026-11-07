const test=require('node:test'),assert=require('node:assert/strict'),{createOperator,createPhone}=require('../js/cloud-remote-session.js');
const settle=()=>new Promise(r=>setImmediate(r));
function fixture(){
 let time=100000,pair,live={mode:'normal',index:0,total:3,label:'First',text:'One'},executions=0,delay=null;
 const timers=[],clients=[],packets=[],phoneStatus=[],operatorStatus=[],states=[],auth=[];
 const setTimer=(fn,ms)=>{const t={fn,ms};timers.push(t);return t;},clearTimer=t=>{if(t)t.cancelled=true;};
 const transport={createPair:()=>({topic:'test-session',expiresAt:time+100000}),async connect(pair,receive,status){const c={receive,status,closed:false,async send(packet){if(c.closed)throw Error('closed');packets.push(packet);await Promise.all(clients.filter(x=>x!==c&&!x.closed).map(x=>x.receive(packet)));},close(){c.closed=true;status('closed');}};clients.push(c);status('SUBSCRIBED');return c;}};
 const operator=createOperator({transport,now:()=>time,setTimer,clearTimer,snapshot:()=>({...live}),async execute(action){executions++;if(delay)await delay;if(action==='next')live={...live,index:live.index+1,text:'Two'};if(action==='previous')live={...live,index:live.index-1};if(action==='blank')live={...live,mode:'blank'};if(action==='resume')live={...live,mode:'normal'};},onLink:p=>pair=p,onStatus:s=>operatorStatus.push(s)});
 let phone;async function connect(){await operator.start();phone=createPhone({pair,transport,now:()=>time,setTimer,clearTimer,uuid:()=>crypto.randomUUID(),onStatus:s=>phoneStatus.push(s),onState:(state,flags)=>states.push({state,...flags}),onForget:()=>auth.push('forgot')});await phone.start();await settle();return phone;}
 return {operator,connect,get phone(){return phone},clients,packets,timers,states,phoneStatus,operatorStatus,auth,get count(){return executions},get live(){return live},setDelay:p=>delay=p,advance:n=>time+=n,setLive:x=>live={...live,...x}};
}
test('phone follows live state, confirms next and supports explicit blank/resume',async()=>{
 const x=fixture(),phone=await x.connect();assert.equal(x.states.at(-1).active,true);assert.match(x.operatorStatus.at(-1),/Phone connected/);
 assert.equal(await phone.command('next'),true);assert.equal(x.live.index,1);assert.equal(x.states.at(-1).state.index,1);assert.equal(x.states.at(-1).pending,false);
 await phone.command('blank');assert.equal(x.live.mode,'blank');assert.equal(await phone.command('next'),false);await phone.command('resume');assert.equal(x.live.mode,'normal');phone.disconnect();x.operator.stop();
});
test('asynchronous command is confirmed only after completion and duplicate IDs execute once',async()=>{
 const x=fixture(),phone=await x.connect();let finish;x.setDelay(new Promise(r=>finish=r));const action=phone.command('next');await settle();
 const packet=x.packets.find(p=>p.type==='command');const duplicate=x.clients[0].receive(packet);await settle();assert.equal(x.count,1);assert.equal(x.packets.some(p=>p.type==='ack'),false);assert.equal(x.states.at(-1).pending,true);
 finish();await action;await duplicate;assert.equal(x.count,1);assert.equal(x.live.index,1);assert.equal(x.packets.filter(p=>p.type==='ack').length,2);phone.disconnect();x.operator.stop();
});
test('stale phone commands cannot advance a newer operator selection',async()=>{
 const x=fixture(),phone=await x.connect();x.setLive({text:'A newer laptop selection'});assert.equal(await phone.command('next'),false);assert.equal(x.count,0);assert.match(x.phoneStatus.at(-1),/Output changed/);assert.equal(x.states.at(-1).state.text,'A newer laptop selection');phone.disconnect();x.operator.stop();
});
test('stopping the laptop revokes the phone, cancels waiting and clears remembered pairing',async()=>{
 const x=fixture(),phone=await x.connect();x.operator.stop();await settle();assert.equal(x.states.at(-1).active,false);assert.equal(x.states.at(-1).state,null);assert.ok(x.auth.includes('forgot'));assert.equal(await phone.command('next'),false);assert.equal(x.count,0);
});
test('network interruption disables controls; a restored channel requests fresh state',async()=>{
 const x=fixture(),phone=await x.connect();x.clients[1].status('CHANNEL_ERROR');assert.equal(x.states.at(-1).active,false);assert.equal(await phone.command('next'),false);
 x.setLive({text:'Latest after reconnect'});x.clients[1].status('SUBSCRIBED');await settle();assert.equal(x.states.at(-1).active,true);assert.equal(x.states.at(-1).state.text,'Latest after reconnect');phone.disconnect();x.operator.stop();
});
test('expired guest pairing stops the laptop and phone',async()=>{
 const x=fixture(),phone=await x.connect();
 x.advance(100001);x.timers.find(t=>!t.cancelled&&t.ms===2000).fn();assert.match(x.operatorStatus.at(-1),/expired/);assert.equal(await phone.command('next'),false);
});
test('missing confirmation never retries a command automatically',async()=>{
 const x=fixture(),phone=await x.connect();x.clients[0].send=async p=>{if(p.type!=='ack')return;};const command=phone.command('next');await settle();x.timers.find(t=>!t.cancelled&&t.ms===6000).fn();assert.equal(await command,false);assert.equal(x.count,1);assert.equal(x.states.at(-1).active,false);assert.match(x.phoneStatus.at(-1),/No confirmation/);phone.disconnect();x.operator.stop();
});
test('late completion cannot send an old acknowledgement into a replacement session',async()=>{
 const x=fixture(),phone=await x.connect();let finish;x.setDelay(new Promise(r=>finish=r));const pending=phone.command('next');await settle();x.operator.stop();await settle();const before=x.packets.filter(p=>p.type==='ack').length;finish();await pending;await settle();assert.equal(x.packets.filter(p=>p.type==='ack').length,before);
});
