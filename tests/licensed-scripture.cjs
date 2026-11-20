const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const crypto=require('node:crypto').webcrypto,L=require('../js/licensed-scripture.js'),Library=require('../js/library.js');
const backend=import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('functions/api/scripture.js')).toString('base64'));
const NOW=Date.now(),env={API_BIBLE_KEY:'test-server-only-secret'},json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
const source={data:{content:[{name:'verse',attrs:{number:'1'}},{text:'First verse.'},{name:'verse',attrs:{number:'3'}},{text:'Third verse.'}],copyright:'Publisher attribution'},meta:{fumsToken:'fixture-token'}};
const req=(path='?chapter=JHN.3',init={})=>new Request('https://kogg-presenter.pages.dev/api/scripture'+path,init);
function memory(){const m=new Map();return{get length(){return m.size;},key:i=>[...m.keys()][i],getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
function cache(){const m=new Map();return{match:async r=>m.get(r.url)?.clone(),put:async(r,v)=>m.set(r.url,v.clone())};}
test('NLT gateway keeps the secret server-side, caches one chapter and rotates cache namespace with the key',async()=>{
 const {handle}=await backend,c=cache();let calls=0;
 const fetch=async(url,init)=>{calls++;assert.match(url,/d6e14a625393b4da-01\/chapters\/JHN.3/);assert.equal(init.headers['api-key'],env.API_BIBLE_KEY);return json(source);};
 const r=await handle({request:req(),env},{fetch,cache:c,now:()=>NOW});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');const body=await r.json();assert.equal(body.data.copyright,'Publisher attribution');assert.equal(body.expiresAt,NOW+14*86400000);assert.doesNotMatch(JSON.stringify(body),/test-server-only-secret/);
 await handle({request:req(),env},{fetch,cache:c,now:()=>NOW});assert.equal(calls,1);
 await handle({request:req(),env},{fetch,cache:c,now:()=>NOW+15*86400000});assert.equal(calls,2);
 const r2=await handle({request:req(),env:{API_BIBLE_KEY:'different-key'}},{fetch:async()=>{calls++;return json(source);},cache:c,now:()=>NOW});assert.equal(r2.status,200);assert.equal(calls,3);
});
test('NLT gateway rejects arbitrary routes, origins, book numbers and absent secrets',async()=>{
 const {handle,validChapter}=await backend;assert.equal(validChapter('NAM.3'),true);assert.equal(validChapter('NAM.4'),false);
 const fetch=()=>{throw Error('No upstream call expected');};
 for(const query of ['?chapter=JHN.22','?chapter=JHN.0','?chapter=../x','?chapter=JHN.3&url=https://evil.test','?chapter=NAH.1'])assert.equal((await handle({request:req(query),env},{fetch})).status,400);
 assert.equal((await handle({request:req('',{headers:{Origin:'https://evil.test'}}),env},{fetch})).status,403);
 assert.equal((await handle({request:req(),env:{}},{fetch})).status,503);
 const pre=await handle({request:req('',{method:'OPTIONS',headers:{Origin:'http://127.0.0.1:8768'}}),env},{fetch});assert.equal(pre.status,204);assert.equal(pre.headers.get('Access-Control-Allow-Origin'),'http://127.0.0.1:8768');
});
test('upstream failures and missing licence metadata fail closed without exposing response bodies',async()=>{
 const {handle}=await backend;
 const r=await handle({request:req(),env},{fetch:async()=>json({error:'secret '+env.API_BIBLE_KEY},403)});assert.equal(r.status,502);assert.doesNotMatch(await r.text(),/test-server-only-secret/);
 for(const bad of [{data:source.data},{...source,data:{...source.data,copyright:''}}])assert.equal((await handle({request:req(),env},{fetch:async()=>json(bad)})).status,502);
});
test('Cloudflare-compatible fetch rejects provider and reporting redirects without following them',async()=>{
 const {handle}=await backend;
 const guarded=(body,status=200)=>async(url,init)=>{assert.equal(init.redirect,'manual');return json(body,status);};
 const chapter=await (await handle({request:req(),env},{fetch:guarded(source),now:()=>NOW})).json();
 assert(chapter.report);
 for(const status of [301,302,307,308]){
  assert.equal((await handle({request:req(),env},{fetch:guarded({},status)})).status,502);
  const event={...chapter.report,device:crypto.randomUUID(),session:crypto.randomUUID(),id:crypto.randomUUID()};
  assert.equal((await handle({request:req('',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(event)}),env},{fetch:guarded({},status),now:()=>NOW})).status,502);
 }
});
test('reporting accepts only server-signed tokens, relays anonymous identifiers and acknowledges retries',async()=>{
 const {handle}=await backend;const chapter=await (await handle({request:req(),env},{fetch:async()=>json(source),now:()=>NOW})).json();
 const event={...chapter.report,device:crypto.randomUUID(),session:crypto.randomUUID(),id:crypto.randomUUID()};let reports=0;
 const send=e=>handle({request:req('',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(e)}),env},{now:()=>NOW,fetch:async(url,init)=>{reports++;assert.match(url,/^https:\/\/fums.api.bible\/f3\?/);assert.equal(new URL(url).searchParams.get('dId'),event.device);assert.equal(init.headers,undefined);return new Response('',{status:200});}});
 assert.equal((await send({...event,token:'tampered'})).status,403);assert.equal((await send(event)).status,204);assert.equal((await send(event)).status,204);assert.equal(reports,1);
 assert.equal((await send({...event,expiresAt:NOW-1})).status,400);
});
const slide=()=>({text:'Licensed words',label:'John 3:1',scriptureRef:{translation:'nlt:NLT',bookIdx:42,ch:3,vFrom:1,vTo:1},license:{copyright:'Publisher',expiresAt:NOW+10000,report:{token:'fixture',signature:'signature',expiresAt:NOW+10000}}});
test('view reporting deduplicates rerenders, queues offline, survives reload and resumes without Scripture text',async()=>{
 const storage=memory(),timers=[],calls=[];let online=false;
 const options={storage,crypto,url:'/api/scripture',now:()=>NOW,setTimer:fn=>{timers.push(fn);return 1;},clearTimer(){},fetch:async(url,o)=>{if(!online)throw Error('offline');calls.push(JSON.parse(o.body));return new Response(null,{status:204});}};
 const a=L.create(options),state={mode:'normal',slides:[slide()],index:0};assert.equal(a.view(state),true);assert.equal(a.view({...state,themeId:'changed'}),false);await a.flush();assert.equal(a.pending(),1);a.stop();
 online=true;const b=L.create(options);await b.flush();assert.equal(b.pending(),0);assert.equal(calls.length,1);assert.doesNotMatch(JSON.stringify(calls),/Licensed words|John|email|api-key/);
 b.view(state);await b.flush();b.view({mode:'blank'});b.view(state);await b.flush();assert.equal(calls.length,3);b.stop();
});
test('expired text is not considered displayable or reported; references survive export and Sync',()=>{
 const s=slide();assert.equal(L.current(s,NOW),true);assert.equal(L.current(s,NOW+10001),false);
 const data={service:[{id:'1',title:'John 3',type:'scripture',slides:[s]}],plans:{Sunday:[{id:'2',title:'John',type:'scripture',slides:[s]}]}};
 for(const out of [L.portable(data),Library.validate(data)]){assert.equal(out.service[0].slides[0].text,'');assert.equal(out.service[0].slides[0].license,undefined);assert.equal(out.plans.Sunday[0].slides[0].scriptureRef.ch,3);assert.doesNotMatch(JSON.stringify(out),/Licensed words|fixture|signature/);}
 assert.equal(s.text,'Licensed words');
});
test('managed provider validates metadata, retains omitted verses and refetches expired chapters',async()=>{
 const context=vm.createContext({AbortController,setTimeout,clearTimeout});vm.runInContext(fs.readFileSync('js/bible-providers.js','utf8'),context);const P=context.KOGGBibles;let time=NOW,calls=0;
 P.configure({managedNlt:true,managedEndpoint:'/api/scripture',now:()=>time,fetchImpl:async url=>{calls++;assert.equal(url,'/api/scripture?chapter=JHN.3');return json({...source,expiresAt:time+1000,report:{token:'fixture'}});}});
 const b=P.skeleton('nlt:NLT');await P.ensureChapter(b,42,3);assert.deepEqual(Array.from(b.books[42].chapters[2]),['First verse.','','Third verse.']);await P.ensureChapter(b,42,3);assert.equal(calls,1);time+=1001;assert.equal(P.chapterReady(b,42,3),false);await P.ensureChapter(b,42,3);assert.equal(calls,2);
});
test('rehearsal keeps licensed references visible without copying text or labelling them empty',()=>{
 const R=require('../js/rehearsal.js'),result=R.prepare([{id:'nlt',title:'John 3',type:'scripture',slides:[slide()]}],[{id:'t1'}],'t1');
 assert.equal(result.frames.length,1);assert.match(result.frames[0].slide.text,/loads online/);assert.doesNotMatch(JSON.stringify(result),/Licensed words/);assert.match(result.issues.join(' '),/online access/);assert.doesNotMatch(result.issues.join(' '),/empty/);
});

test('NIV uses a fixed authorized edition and never shares cached chapters with NLT',async()=>{
 const {handle,NIV_ID,NLT_ID}=await backend,c=cache(),calls=[];
 const fetch=async(url,init)=>{calls.push(url);assert.equal(init.headers['api-key'],env.API_BIBLE_KEY);const edition=url.includes(NIV_ID)?'NIV':'NLT';return json({...source,data:{...source.data,copyright:edition+' publisher'}});};
 for(const edition of ['NLT','NIV','NLT','NIV']){
  const response=await handle({request:req('?chapter=JHN.3&edition='+edition),env},{fetch,cache:c});
  assert.equal(response.status,200);const body=await response.json();assert.equal(body.data.bibleId,edition==='NIV'?NIV_ID:NLT_ID);assert.equal(body.data.copyright,edition+' publisher');assert(body.report.signature);
 }
 assert.equal(calls.length,2);
 for(const query of ['?chapter=JHN.3&edition=MSG','?chapter=JHN.3&edition=__proto__','?chapter=JHN.3&edition=NIV&edition=NLT','?chapter=JHN.3&chapter=GEN.1&edition=NIV'])assert.equal((await handle({request:req(query),env},{fetch})).status,400);
 assert.equal(calls.length,2);
});

test('managed NIV bypasses personal keys, deduplicates fetches and refreshes expired chapters',async()=>{
 const context=vm.createContext({AbortController,setTimeout,clearTimeout});vm.runInContext(fs.readFileSync('js/bible-providers.js','utf8'),context);const P=context.KOGGBibles;let time=NOW,calls=0;
 P.configure({managedNiv:true,managedNlt:true,managedEndpoint:'/api/scripture',getSettings:()=>({apiBibleKey:'must-not-be-used'}),now:()=>time,fetchImpl:async(url,options)=>{calls++;assert.equal(url,'/api/scripture?chapter=NAM.3&edition=NIV');assert.equal(options.headers,undefined);return json({...source,expiresAt:time+1000,report:{token:'fixture-niv'}});}});
 const b=P.skeleton('api:NIV');await Promise.all([P.ensureChapter(b,33,3),P.ensureChapter(b,33,3)]);assert.equal(calls,1);assert.equal(P.managedEdition(b),'NIV');assert.equal(P.managedEdition(P.skeleton('api:AMP')),null);
 assert.deepEqual(Array.from(b.books[33].chapters[2]),['First verse.','','Third verse.']);time+=1001;assert.equal(P.chapterReady(b,33,3),false);await P.ensureChapter(b,33,3);assert.equal(calls,2);
});

test('NIV references survive Sync and rehearsal while licensed text and tokens stay out',()=>{
 const s=slide();s.scriptureRef.translation='api:NIV';assert.equal(L.edition(s.scriptureRef.translation),'NIV');assert.equal(L.edition('api:MSG'),null);
 const data={service:[{id:'niv',title:'John 3',type:'scripture',slides:[s]}],plans:{Sunday:[{id:'niv',title:'John',type:'scripture',slides:[s]}]}};
 for(const out of [L.portable(data),Library.validate(data)]){assert.equal(out.service[0].slides[0].text,'');assert.equal(out.service[0].slides[0].scriptureRef.translation,'api:NIV');assert.doesNotMatch(JSON.stringify(out),/Licensed words|fixture|signature/);}
 const result=require('../js/rehearsal.js').prepare(data.service,[{id:'t1'}],'t1');assert.match(result.frames[0].slide.text,/NIV passage loads online/);assert.doesNotMatch(JSON.stringify(result),/Licensed words/);
});
