const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const transport=require('../js/wifi-transport.js');
const sdp='v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=ice-ufrag:abcd\r\na=ice-pwd:abcdefghijklmnopqrstuvwxyz\r\na=fingerprint:sha-256 AA:BB:CC\r\na=setup:actpass\r\na=mid:0\r\na=sctp-port:5000\r\na=candidate:1 1 udp 2113937151 example.local 12345 typ host generation 0\r\na=end-of-candidates\r\n';
const pair=(kind='offer')=>({v:1,kind,id:crypto.randomUUID(),expires:Date.now()+300000,sdp});
test('compressed pairing round-trips, accepts QR URLs and rejects wrong type / expiry',async()=>{
 const data=pair(),token=await transport.encode(data);assert.ok(token.length<1200);assert.deepEqual(await transport.decode(token,'offer'),data);assert.deepEqual(await transport.decode('https://example.test/wifi-remote/#offer='+token,'offer'),data);
 await assert.rejects(transport.decode(token,'answer'),/Wrong or expired/);await assert.rejects(transport.decode(token,'offer',data.expires+1),/expired/);
 await assert.rejects(transport.decode('other code','offer'),/not a KOGG/);
 await assert.rejects(transport.decode(await transport.encode({...data,expires:Date.now()+9999999}),'offer'),/expired/);
});
test('scanned signaling cannot request media or relay candidates and decompression is bounded',async()=>{
 for(const bad of [sdp+'m=audio 9 UDP/TLS/RTP/SAVPF 111\r\n',sdp.replace('typ host','typ relay'),sdp.replace(/a=candidate:.*\r\n/,'')])await assert.rejects(transport.decode(await transport.encode({...pair(),sdp:bad}),'offer'));
 await assert.rejects(transport.encode({...pair(),sdp:'x'.repeat(20000)}),/Too many/);
 const compressed=new Uint8Array(await new Response(new Blob(['x'.repeat(100000)]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
 const bomb='KOGG1.'+Buffer.from(compressed).toString('base64url');await assert.rejects(transport.decode(bomb,'offer'),/Could not read/);
});
test('offer URL and reply QR are decoded by the bundled offline scanner',async()=>{
 const qrcode=require('../js/vendor/qrcode.js'),jsQR=require('../js/vendor/jsqr.js');
 for(const text of ['https://kogg-presenter.pages.dev/wifi-remote/#offer='+await transport.encode(pair()),await transport.encode(pair('answer'))]){
  const code=qrcode(0,'M');code.addData(text);code.make();const n=code.getModuleCount(),scale=5,margin=4,width=(n+margin*2)*scale,rgba=new Uint8ClampedArray(width*width*4).fill(255);
  for(let row=0;row<n;row++)for(let col=0;col<n;col++)if(code.isDark(row,col))for(let y=0;y<scale;y++)for(let x=0;x<scale;x++){const i=(((row+margin)*scale+y)*width+(col+margin)*scale+x)*4;rgba[i]=rgba[i+1]=rgba[i+2]=0;}
  assert.equal(jsQR(rgba,width,width).data,text);
 }
});
function fixture(){let pc;class Peer extends EventTarget{constructor(config){super();pc=this;this.config=config;this.iceGatheringState='complete';this.connectionState='new';}createDataChannel(label){this.dc={label,readyState:'connecting',bufferedAmount:0,sent:[],send(text){this.sent.push(text);},close(){this.readyState='closed';this.onclose?.();}};return this.dc;}async createOffer(){return {type:'offer',sdp};}async createAnswer(){return {type:'answer',sdp};}async setLocalDescription(value){this.localDescription=value;}async setRemoteDescription(value){this.remoteDescription=value;}close(){this.connectionState='closed';}}
 const statuses=[],received=[],timers=[];const context=vm.createContext({RTCPeerConnection:Peer,CompressionStream,DecompressionStream,Blob,TextEncoder,TextDecoder,Uint8Array,URL,URLSearchParams,crypto,btoa,atob,Date,Error,JSON,Promise,setTimeout:(fn,ms)=>{const t={fn,ms};timers.push(t);return t;},clearTimeout:t=>{if(t)t.cancelled=true;},module:{exports:{}}});vm.runInContext(fs.readFileSync('js/wifi-transport.js','utf8'),context);const api=context.module.exports,peer=api.create({onStatus:s=>statuses.push(s),onPacket:p=>received.push(p)});return {api,peer,statuses,received,timers,get pc(){return pc}};}
test('direct channel has zero ICE servers, verifies matching answer and only sends when open',async()=>{
 const x=fixture(),offer=await x.peer.offer(),data=await transport.decode(offer,'offer');assert.equal(x.pc.config.iceServers.length,0);
 await assert.rejects(x.peer.accept(await transport.encode({...data,kind:'answer',id:crypto.randomUUID()})),/another laptop/);
 await x.peer.accept(await transport.encode({...data,kind:'answer'}));await assert.rejects(x.peer.accept(await transport.encode({...data,kind:'answer'})),/already/);
 x.pc.dc.readyState='open';x.pc.dc.onopen();const session=await x.peer.ready;await session.send({type:'hello'});assert.equal(JSON.parse(x.pc.dc.sent[0]).type,'hello');
 x.pc.dc.onmessage({data:'invalid'});x.pc.dc.onmessage({data:JSON.stringify({type:'state',revision:1})});assert.equal(x.received.length,1);
 x.pc.dc.bufferedAmount=99999;await assert.rejects(session.send({type:'hello'}),/busy/);session.close();assert.equal(x.pc.connectionState,'closed');await assert.rejects(session.send({type:'hello'}),/interrupted/);
});
test('stop during pairing rejects pending ready; expiry closes the endpoint',async()=>{
 const x=fixture();await x.peer.offer();x.peer.close();await assert.rejects(x.peer.ready,/stopped/);assert.equal(x.pc.connectionState,'closed');
 const y=fixture();await y.peer.offer();y.timers.find(t=>!t.cancelled).fn();await assert.rejects(y.peer.ready,/expired/);assert.equal(y.pc.connectionState,'closed');
});
test('phone answers without creating another data channel; remote fingerprint comes from the scanned offer',async()=>{
 const x=fixture(),data=pair();const answer=await x.peer.answer(await transport.encode(data));assert.equal(x.pc.remoteDescription.sdp,sdp);assert.equal(x.pc.dc,undefined);assert.equal((await transport.decode(answer,'answer')).id,data.id);x.peer.close();
});
test('standalone phone cache reopens without a server and excludes Bible/cloud downloads',async()=>{
 const handlers={},cache=new Map(),calls=[],messages=[];let offline=false;
 const context=vm.createContext({URL,Response,Promise,caches:{open:async()=>({put:async(k,v)=>cache.set(k,v),match:async k=>cache.get(k)?.clone()}),keys:async()=>[],delete:async()=>{}},fetch:async url=>{if(offline)throw Error('offline');calls.push(url);return new Response('saved '+url);},self:{location:{href:'https://example.test/wifi-remote/sw.js',origin:'https://example.test'},clients:{claim:async()=>{}},addEventListener:(n,fn)=>handlers[n]=fn}});
 vm.runInContext(fs.readFileSync('wifi-remote/sw.js','utf8'),context);let task;handlers.install({waitUntil:p=>task=p});await task;
 assert.ok(calls.some(x=>x.endsWith('/js/vendor/jsqr.js')));assert.equal(calls.some(x=>/supabase|data\/|cloud-transport/.test(x)),false);offline=true;
 for(const path of ['/wifi-remote/','/wifi-remote/index.html','/js/wifi-transport.js','/js/vendor/jsqr.js']){handlers.fetch({request:{method:'GET',url:'https://example.test'+path},respondWith:p=>task=p});assert.equal((await task).status,200);}
 handlers.message({data:{type:'wifi-ready'},source:{postMessage:m=>messages.push(m)},waitUntil:p=>task=p});await task;assert.equal(messages.at(-1).ready,true);
});
test('cancelling camera while permission is pending releases any stream that arrives later',async()=>{
 let grant,stopped=0;const video={hidden:true,srcObject:null},context=vm.createContext({URL,Map,Promise,Error,setTimeout,clearTimeout,window:{},document:{currentScript:{src:'https://example.test/js/wifi-pairing.js'},createElement:()=>({remove(){}}),head:{appendChild:script=>queueMicrotask(()=>script.onload())}},navigator:{mediaDevices:{getUserMedia:()=>new Promise(resolve=>grant=resolve)}}});
 vm.runInContext(fs.readFileSync('js/wifi-pairing.js','utf8'),context);const cancel=context.window.KOGGWiFiUI.scanner(video,()=>assert.fail('cancelled camera cannot pair'),()=>assert.fail('cancel is not an error'));
 await new Promise(r=>setImmediate(r));cancel();grant({getTracks:()=>[{stop:()=>stopped++}]});await new Promise(r=>setImmediate(r));assert.equal(stopped,1);assert.equal(video.srcObject,null);assert.equal(video.hidden,true);
});
test('cancelled QR generation cannot replace the next pairing code',async()=>{
 let loaded;const element={innerHTML:'newer code'},context=vm.createContext({URL,Map,Promise,Error,window:{},document:{currentScript:{src:'https://example.test/js/wifi-pairing.js'},createElement:()=>({}),head:{appendChild:script=>loaded=script}},qrcode:()=>assert.fail('cancelled QR must not render')});
 vm.runInContext(fs.readFileSync('js/wifi-pairing.js','utf8'),context);const pending=context.window.KOGGWiFiUI.qr(element,'old code',()=>false);loaded.onload();await pending;assert.equal(element.innerHTML,'newer code');
});
