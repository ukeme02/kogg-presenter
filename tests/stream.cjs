const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),M=require('../js/stream.js');
test('stream actions preserve content and suppress hidden old passages when unblanking',()=>{
 const patch=M.tag({l1:' Pastor ',l2:'Minister',style:'minimal',position:'left'},{mode:'normal'});
 assert.equal(patch.slides,undefined);assert.equal(patch.lowerThird.l1,'Pastor');assert.equal(patch.lowerThird.style,'minimal');assert.equal(patch.alert,undefined);
 assert.deepEqual(M.notice({alert:'Welcome'},{mode:'blank'}).slides,[]);assert.equal(M.tag({l1:'Name'},{mode:'blank'}).mode,'normal');assert.throws(()=>M.tag({l1:' '}));assert.throws(()=>M.notice({alert:' '}));
});
test('feed URLs isolate transparent graphics from full slide output',()=>{
 assert.equal(M.outputUrl('http://127.0.0.1:8766/index.html','full'),'http://127.0.0.1:8766/display.html');
 assert.equal(M.outputUrl('http://127.0.0.1:8766/','overlays'),'http://127.0.0.1:8766/display.html?overlay=1&layers=overlays');
 assert.equal(M.outputUrl('http://127.0.0.1:8766/','transparent'),'http://127.0.0.1:8766/display.html?overlay=1');
});
test('style and timing values are constrained before being rendered',()=>{
 const n=M.normalise({style:'injected',position:'wrong',size:'giant',accent:'red;display:none',duration:-1,motion:'fast'});
 assert.deepEqual(M.look(n),{style:'banner',position:'center',size:'medium',accent:'#4f8cff'});assert.equal(n.duration,30);assert.equal(n.motion,'scroll');
});
test('graphics-only output hides scripture and definitions while rendering tags and notices',()=>{
 const src=fs.readFileSync('js/display.js','utf8'),start=src.indexOf('function render(state)'),end=src.indexOf('/* word highlight',start),nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{style:{},classList:{toggle(k,v){this[k]=v;}}});return nodes.get(id);};let tag,notice;
 const c=vm.createContext({$:node,OVERLAY:true,OVERLAYS_ONLY:true,textEl:node('text'),labelEl:node('label'),contentEl:node('content'),renderNotesAlert:x=>notice=x,renderLowerThird:x=>tag=x,renderLogo(){},applyTheme:()=>({fontSize:15}),renderSlideText:()=>'',plain:x=>x,fitText(){},displayNumber:()=>1});
 vm.runInContext(src.slice(start,end),c);c.render({mode:'normal',slides:[{text:'Verse',label:'Reference'}],index:0,strongsShowing:true,strongsCard:{word:'test'},lowerThird:{on:true,l1:'Name'},alert:{on:true,text:'Notice'}});
 assert.equal(node('text').style.display,'none');assert.equal(node('label').style.display,'none');assert.equal(node('strongsCard').classList.on,false);assert.equal(tag.l1,'Name');assert.equal(notice.text,'Notice');
 c.render({mode:'blank',slides:[],index:0});assert.equal(tag,null);assert.equal(notice,null);
});
test('relay check recovers after failure and never probes a hosted site',async()=>{
 const src=fs.readFileSync('js/relay.js','utf8');let online=false,calls=0,posts=0;
 const window={KOGGLibrary:{portableSettings:x=>x,assetIds:()=>[]}};
 const c=vm.createContext({window,location:{hostname:'127.0.0.1',protocol:'http:',pathname:'/index.html'},AbortController,setTimeout,clearTimeout,console,localStorage:{getItem:k=>k==='cp_themes'?'[{"id":"t1"}]':null},fetch:async(url)=>{calls++;if(!online)throw Error('offline');if(url.endsWith('/state')){posts++;return {ok:true};}return {ok:true,json:async()=>({relay:true,readers:2})};}});
 vm.runInContext(src,c);await window.KOGGRelay.check();assert.equal(window.KOGGRelay.status().ready,false);online=true;await window.KOGGRelay.check();await new Promise(r=>setImmediate(r));assert.equal(window.KOGGRelay.status().ready,true);assert.match(window.KOGGRelay.status().message,/2 connected/);assert.ok(posts>0);
 c.location.hostname='example.org';const before=calls;vm.runInContext(src,c);await window.KOGGRelay.check();assert.equal(calls,before);
});

test('live tag reserves its measured height before fitting text and releases space when hidden',()=>{
 const source=fs.readFileSync('js/display.js','utf8'),a=source.indexOf('function renderLowerThird('),b=source.indexOf('function applyBackdrops(',a);
 const root={classList:{toggle(k,v){this[k]=v;}},style:{setProperty(k,v){this[k]=v;}}};
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{offsetHeight:id==='lowerThird'?100:0,style:{setProperty(k,v){this[k]=v;}},classList:{contains:()=>false,toggle(){},remove(){},add(){}},setAttribute(k,v){this[k]=v;}});return nodes.get(id);};
 const c=vm.createContext({$:node,document:{documentElement:root},window:{KOGGStream:M,innerHeight:1000},getComputedStyle:()=>({bottom:'90px'})});vm.runInContext(source.slice(a,b),c);
 c.renderLowerThird({on:true,l1:'Name',l2:'Now ministering',style:'minimal'});assert.equal(root.style['--live-tag-clearance'],'215px');assert.equal(root.classList['has-live-tag'],true);assert.equal(node('lowerThird')['data-style'],'minimal');
 c.renderLowerThird(null);assert.equal(root.classList['has-live-tag'],false);
});

test('broadcast layout and theme leave the room intact and route graphics explicitly',()=>{const state={mode:'normal',themeId:'room',slides:[{text:'Verse'}],lowerThird:{on:true,l1:'Name'},alert:{on:true,text:'Welcome'},broadcast:{layout:'lower',broadcastTheme:'camera',graphicsTarget:'stream'}};const room=M.route(state,false),stream=M.route(state,true);assert.equal(room.themeId,'room');assert.equal(room.lowerThird.on,false);assert.equal(room.alert.on,false);assert.equal(stream.themeId,'camera');assert.equal(stream.lowerThird.on,true);assert.equal(stream.slides,state.slides);assert.equal(state.lowerThird.on,true);assert.equal(M.route({...state,broadcast:{graphicsTarget:'room'}},true).lowerThird.on,false);assert.equal(M.route({...state,broadcast:undefined},false).lowerThird.on,true);assert.match(M.outputUrl('http://127.0.0.1:8766/','broadcast'),/overlay=1&feed=broadcast$/);});
test('invalid layout and graphic targets fall back to the existing shared output',()=>{const config=M.normalise({layout:'injected',graphicsTarget:'none',broadcastTheme:7});assert.equal(config.layout,'full');assert.equal(config.graphicsTarget,'both');assert.equal(config.broadcastTheme,'');});
