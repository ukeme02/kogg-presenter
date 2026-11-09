const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),M=require('../js/media.js');
test('media checks format and size before storage and defaults flyers to uncropped muted output',()=>{
 assert.equal(M.validate({type:'image/png',size:1024}),'image');assert.equal(M.validate({type:'video/mp4',size:1000}),'video');
 for(const file of [{type:'image/svg+xml',size:500},{type:'video/mp4',size:300*1024*1024},{type:'image/png',size:0}])assert.throws(()=>M.validate(file));
 assert.equal(M.descriptor({id:'media-123',kind:'image'}).fit,'contain');assert.equal(M.descriptor({id:'https://example.test/video',kind:'video'}),null);
 assert.equal(M.descriptor({id:'media-123',kind:'video',dim:200}).dim,100);
});
test('video clock remains still while paused and advances only during play',()=>{assert.equal(M.position({position:12,playing:false,at:1000},5000),12);assert.equal(M.position({position:12,playing:true,at:1000},5000),16);assert.equal(M.position({position:12,playing:true,at:9000},5000),12);});
function output(){const pending=[],created=[],revoked=[];let paused=0;const box={hidden:true,replaceChildren(){this.child=null;},appendChild(e){this.child=e;}},notice={hidden:true};const context=vm.createContext({window:{addEventListener(){}},document:{getElementById:id=>id==='mediaScreen'?box:notice,createElement:kind=>{const el={tagName:kind.toUpperCase(),style:{},currentTime:0,duration:60,play:async()=>{},pause:()=>paused++,removeAttribute(){},load(){}};created.push(el);return el;}},KOGGMedia:M,KOGGAssets:{get:()=>new Promise(resolve=>pending.push(resolve))},Blob,URL:{createObjectURL:()=> 'blob:fixture',revokeObjectURL:u=>revoked.push(u)},Date,JSON,Number});vm.runInContext(fs.readFileSync('js/media-display.js','utf8'),context);return {render:context.window.KOGGMediaDisplay.render,pending,created,revoked,box,get paused(){return paused}};}
const state={mode:'normal',index:0,slides:[{text:'',label:'Fixture',media:{id:'media-123',kind:'video'}}],mediaControl:{position:0,at:Date.now(),playing:true}};
test('late media load cannot cover a newer Scripture slide',async()=>{const x=output();x.render(state);x.render({mode:'normal',slides:[{text:'Scripture'}],index:0});x.pending[0](new Blob(['fixture']));await Promise.resolve();assert.equal(x.created.length,0);assert.equal(x.box.hidden,true);});
test('blanking or replacing live media stops video and releases its local URL',async()=>{const x=output();x.render(state);x.pending[0](new Blob(['fixture']));await Promise.resolve();assert.equal(x.created[0].muted,true);x.render({...state,mode:'blank'});assert.ok(x.paused>0);assert.deepEqual(x.revoked,['blob:fixture']);assert.equal(x.box.hidden,true);});

test('media plan references survive backup validation without bundling video files',()=>{
 const L=require('../js/library.js'),item=M.serviceItem({id:'media-fixture',kind:'video',name:'Welcome',fit:'cover',dim:15,muted:false,loop:true},{id:'service-video'});
 const copy=L.validate(JSON.parse(JSON.stringify({version:2,service:[item],plans:{Sunday:[item]}})));
 assert.equal(copy.plans.Sunday[0].slides[0].media.muted,false);assert.equal(copy.service[0].slides[0].media.fit,'cover');assert.deepEqual(L.assetIds(copy),[]);
 assert.equal(M.referenced('media-fixture',[],copy.plans),true);assert.equal(M.referenced('media-missing',copy.service,copy.plans),false);
 copy.service[0].slides[0].media.id='https://unsafe.test/video';assert.throws(()=>L.validate(copy),/Invalid service/);
});
test('media transitions reset repeated video entries and pause for blank or logo without losing position',()=>{
 const slides=[{text:'',media:{id:'media-a',kind:'video'}},{text:'',media:{id:'media-a',kind:'video'}},{text:'Words'}];
 const initial={mode:'normal',slides,index:0,mediaControl:{position:3,at:1000,playing:true,session:'old'}};
 const next=M.transition(initial,{index:1},5000,'new');assert.equal(next.mediaControl.position,0);assert.equal(next.mediaControl.session,'new');assert.equal(next.mediaControl.playing,true);
 const logo=M.transition(initial,{mode:'logo'},5000,'unused');assert.equal(logo.mediaControl.position,7);assert.equal(logo.mediaControl.playing,false);
 assert.equal(M.transition(initial,{index:2},5000,'new').mediaControl,null);assert.deepEqual(M.transition(initial,{themeId:'blue'},5000,'same'),{});
});
