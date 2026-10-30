const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('js/app.js','utf8');
class Element {
 constructor(id=''){this.id=id;this.handlers={};this.style={};this.dataset={};this.options=[];this.children=[];this.hidden=false;this.textContent='';this._value='';this.parentNode={insertBefore(){}};this.classList={toggle(){},add(){},remove(){},contains(){return false;}};}
 addEventListener(t,fn){(this.handlers[t] ||= []).push(fn);} removeEventListener(){} dispatchEvent(e){for(const fn of this.handlers[e.type]||[])fn(e);} click(){this.dispatchEvent({type:'click',target:this,stopPropagation(){}});} focus(){} scrollIntoView(){} setAttribute(){} getBoundingClientRect(){return {left:0,top:0,width:500,height:300,bottom:300};} querySelector(){return new Element();} querySelectorAll(){return [];} appendChild(v){this.children.push(v);return v;}
 set innerHTML(value){this._html=value;const opts=[...value.matchAll(/<option(?:\s+value="([^"]*)")?[^>]*>(.*?)<\/option>/g)];if(opts.length){this.options=opts.map(m=>({value:m[1]??m[2],text:m[2]}));this._value=this.options[0].value;}}
 get innerHTML(){return this._html||'';} set value(v){this._value=String(v);} get value(){return this._value;}
}
function boot({recognition}={}){
 const elements=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
 for(const m of html.matchAll(/<select[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g))elements.get(m[1]).innerHTML=m[2];
 const storage=new Map([['cp_settings',JSON.stringify({mode:'local',starterSeeded:true,hymnPackVersion:'traditional-basic-v1'})]]);
 const document={getElementById:id=>elements.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>new Element(),addEventListener(){},removeEventListener(){},body:new Element(),head:new Element()};
 const context=vm.createContext({console,document,window:{SpeechRecognition:recognition,innerWidth:1280,innerHeight:720,KOGGSync:{configured:false},KOGGLibrary:require('../js/library.js'),KOGGScripture:require('../js/scripture-tools.js'),KOGGContent:require('../js/content.js'),addEventListener(){}},navigator:{onLine:false,userAgent:'Audit',platform:'',maxTouchPoints:0},location:{href:'http://127.0.0.1/index.html',protocol:'http:',pathname:'/index.html',search:'',hash:''},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setTimeout:()=>1,clearTimeout(){},URL,URLSearchParams,Blob,requestAnimationFrame(){},getComputedStyle:()=>({}),alert(){},confirm:()=>true,Event:class{constructor(type){this.type=type;}},fetch:async file=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(file,'utf8'))})});
 vm.runInContext(app,context);return {context,elements,storage};
}
test('operator boots, loads all books, projects a range, advances preview and blanks',async()=>{const {context,elements,storage}=boot();await new Promise(resolve=>setImmediate(resolve));assert.equal(elements.get('bookSelect').options.length,66);vm.runInContext('goLiveScripture({bookIdx:42,ch:3,vFrom:16,vTo:17})',context);assert.equal(JSON.parse(storage.get('cp_live')).slides.length,2);assert.match(elements.get('liveText').innerHTML,/John 3:16/);vm.runInContext('next()',context);assert.match(elements.get('liveText').innerHTML,/John 3:17/);elements.get('btnBlank').click();assert.equal(JSON.parse(storage.get('cp_live')).mode,'blank');assert.equal(elements.get('liveText').textContent,'Screen blank');});
test('visible Docks button opens the single menu',async()=>{const {elements}=boot();await new Promise(resolve=>setImmediate(resolve));elements.get('dockMenu').hidden=true;elements.get('btnDocks').click();assert.equal(elements.get('dockMenu').hidden,false);assert.match(elements.get('dockMenu').innerHTML,/Docks on screen/);});
test('rapid translation requests cannot overwrite the newer selection',async()=>{const {context,elements}=boot();await new Promise(resolve=>setImmediate(resolve));let first,second;context.fetch=file=>new Promise(resolve=>{if(file==='first')first=resolve;else second=resolve;});const old=context.old=JSON.parse(fs.readFileSync('data/kjv.json','utf8'));const fresh=context.fresh=JSON.parse(fs.readFileSync('data/bsb.json','utf8'));const a=vm.runInContext('loadBible("first")',context);const b=vm.runInContext('loadBible("second")',context);second({ok:true,json:async()=>fresh});assert.equal(await b,true);first({ok:true,json:async()=>old});assert.equal(await a,false);assert.equal(elements.get('translationSelect').value,'second');});
test('actual export and import handlers round-trip settings, themes, service and binary assets',async()=>{const {context,elements,storage}=boot();await new Promise(resolve=>setImmediate(resolve));const assets=new Map([['logo','data:image/png;base64,AAA'],['bg','data:image/png;base64,BBB'],['bible',fs.readFileSync('data/kjv.json','utf8')]]);context.window.KOGGAssets={get:async id=>assets.get(id),put:async(id,v)=>{assets.set(id,v);return true;}};context.URL=class extends URL {static createObjectURL(blob){context.exported=blob;return 'blob:audit';} static revokeObjectURL(){}};vm.runInContext(`songs=[{id:'roundtrip',title:'Round trip',lyrics:'Line one\\nLine two'}];themes=[{id:'custom',name:'Image',bg:'#000',bgImageId:'bg',textColor:'#fff',font:'Arial',fontSize:7}];service=[{id:'item',title:'Round trip',type:'song',slides:[{text:'Line one',label:'Round trip'}]}];LS.set(K.settings,{mode:'local',logoId:'logo',customVersions:[{name:'Custom',assetId:'bible'}],starterSeeded:true});`,context);await elements.get('btnExport').handlers.click[0]();const saved=JSON.parse(await context.exported.text());assert.equal(saved.version,2);assert.deepEqual(Object.keys(saved.assets).sort(),['bg','bible','logo']);assets.clear();vm.runInContext('songs=[];service=[];',context);elements.get('importFile').files=[{size:context.exported.size,text:async()=>JSON.stringify(saved)}];await elements.get('importFile').handlers.change[0]();assert.equal(vm.runInContext('songs[0].title',context),'Round trip');assert.equal(vm.runInContext('service[0].id',context),'item');assert.equal(JSON.parse(storage.get('cp_settings')).logoId,'logo');assert.equal(assets.size,3);assert.equal(vm.runInContext('themes.some(t=>t.bgImageId==="bg")',context),true);});
test('previous chapter crosses backwards to the previous book final chapter',async()=>{const {context,elements}=boot();await new Promise(resolve=>setImmediate(resolve));vm.runInContext("$('bookSelect').value=1;fillChapters();$('chapterSelect').value=1",context);elements.get('btnPrevChapter').click();assert.equal(elements.get('bookSelect').value,'0');assert.equal(elements.get('chapterSelect').value,'50');});
test('failed translation load preserves the successfully loaded choice',async()=>{const {context,elements,storage}=boot();await new Promise(resolve=>setImmediate(resolve));context.fetch=async()=>({ok:false,status:503});assert.equal(await vm.runInContext('loadBible("bad")',context),false);assert.equal(elements.get('translationSelect').value,'data/kjv.json');assert.equal(JSON.parse(storage.get('cp_settings')).currentTranslation,'data/kjv.json');});
test('blocked output popup is reported without requesting screen permission',async()=>{const {context,elements}=boot();await new Promise(resolve=>setImmediate(resolve));let permission=false;context.window.open=()=>null;context.window.getScreenDetails=()=>{permission=true;};await elements.get('btnOpenDisplay').handlers.click[0]();assert.equal(permission,false);assert.match(elements.get('btnOpenDisplay').textContent,/Allow popups/);});

test('both Docks launchers close the menu on the second click',async()=>{const {elements}=boot();await new Promise(resolve=>setImmediate(resolve));for(const id of ['btnDocks','feDocks']){elements.get('dockMenu').hidden=true;elements.get(id).click();assert.equal(elements.get('dockMenu').hidden,false);elements.get(id).click();assert.equal(elements.get('dockMenu').hidden,true);}});

test('output navigates before waiting for extended-screen permission',async()=>{const {context,elements}=boot();await new Promise(resolve=>setImmediate(resolve));let permissionResolve,opened;const popup={closed:false,focus(){},moveTo(x,y){this.position=[x,y];},resizeTo(w,h){this.size=[w,h];}};context.location.hostname='kogg-presenter.pages.dev';context.location.href='https://kogg-presenter.pages.dev/';context.window.open=url=>{opened=url;return popup;};context.window.getScreenDetails=()=>new Promise(resolve=>{permissionResolve=resolve;});const opening=elements.get('btnOpenDisplay').handlers.click[0]();assert.equal(opened,'https://kogg-presenter.pages.dev/display');permissionResolve({currentScreen:{left:0,top:0},screens:[{left:0,top:0},{left:1920,top:0,width:1280,height:720}]});await opening;assert.deepEqual(popup.position,[1920,0]);assert.deepEqual(popup.size,[1280,720]);});
test('denying screen permission leaves the output window open',async()=>{const {context,elements}=boot();await new Promise(resolve=>setImmediate(resolve));let opened;context.window.open=url=>{opened=url;return {focus(){}};};context.window.getScreenDetails=async()=>{throw new Error('denied');};await elements.get('btnOpenDisplay').handlers.click[0]();assert.match(opened,/display.html$/);assert.match(elements.get('outputStatus').textContent,/move it manually/);});
test('Base and Local mode never initialise the cloud client on startup',async()=>{const {context}=boot();await new Promise(resolve=>setImmediate(resolve));let calls=0;context.window.KOGGSync={configured:true,currentUser:async()=>{calls++;return null;},getClient:async()=>{calls++;throw new Error('must not load');}};await vm.runInContext('setWorkMode("base");refreshUser()',context);await vm.runInContext('setWorkMode("local");refreshUser()',context);assert.equal(calls,0);});

test('Rearrange docks explicitly clears a saved lock',async()=>{
 const {context,elements,storage}=boot();await new Promise(resolve=>setImmediate(resolve));
 vm.runInContext('LS.set(K.settings,{...LS.get(K.settings,{}),panesLocked:true})',context);
 elements.get('dockMenu').handlers.click[0]({target:{closest:()=>({dataset:{dockkey:'__arrange'}})}});
 assert.equal(JSON.parse(storage.get('cp_settings')).panesLocked,false);
});

test('Quick jump completes a book, advances with Right Arrow, and displays only on Enter',async()=>{
 const {context,elements,storage}=boot();await new Promise(resolve=>setImmediate(resolve));
 const input=elements.get('bookSearch'),before=storage.get('cp_live');
 input.value='Joh';input.handlers.input[0]({inputType:'insertText'});assert.equal(input.value,'John ');
 assert.match(elements.get('jumpHint').textContent,/chapters 1–21/);
 input.value='John 3';input.handlers.keydown[0]({key:'ArrowRight',preventDefault(){}});assert.equal(input.value,'John 3:');
 input.value+='16';input.handlers.input[0]({inputType:'insertText'});assert.equal(storage.get('cp_live'),before);
 input.handlers.keydown[0]({key:'Enter',preventDefault(){}});
 assert.match(elements.get('liveText').innerHTML,/John 3:16/);
});
test('Quick jump inserts the colon after a pause, preserving multi-digit chapters',async()=>{
 const {context,elements}=boot();await new Promise(resolve=>setImmediate(resolve));
 const input=elements.get('bookSearch');let pending;context.setTimeout=fn=>{pending=fn;return 1;};context.document.activeElement=input;
 input.value='Psalms 119';input.handlers.input[0]({inputType:'insertText'});assert.equal(input.value,'Psalms 119');
 pending();assert.equal(input.value,'Psalms 119:');assert.match(elements.get('jumpHint').textContent,/verses 1–176/);
});
test('Quick jump supports numbered books and verse ranges with Tab advancement',async()=>{
 const {context,elements}=boot();await new Promise(resolve=>setImmediate(resolve));
 const input=elements.get('bookSearch');input.value='1 Cor';input.handlers.input[0]({inputType:'insertText'});assert.equal(input.value,'1 Corinthians ');
 input.value+='13';input.handlers.keydown[0]({key:'Tab',preventDefault(){}});assert.equal(input.value,'1 Corinthians 13:');
 input.value+='4-7';input.handlers.keydown[0]({key:'Enter',preventDefault(){}});
 assert.equal(vm.runInContext('live.slides.length',context),4);assert.match(elements.get('liveText').innerHTML,/1 Corinthians 13:4/);assert.equal(vm.runInContext('live.slides[3].label',context),'1 Corinthians 13:7');
});
test('Quick jump rejects invalid verses and never changes live output on invalid Enter',async()=>{
 const {context,elements,storage}=boot();await new Promise(resolve=>setImmediate(resolve));
 const input=elements.get('bookSearch'),before=storage.get('cp_live');input.value='John 3:999';input.handlers.keydown[0]({key:'Enter',preventDefault(){}});
 assert.equal(storage.get('cp_live'),before);
 input.value='John 99';assert.equal(vm.runInContext('advanceJumpChapter()',context),false);assert.equal(input.value,'John 99');
});
test('Quick jump keeps ambiguous book prefixes selectable and allows deleting a colon',async()=>{
 const {context,elements}=boot();await new Promise(resolve=>setImmediate(resolve));
 const input=elements.get('bookSearch');input.value='Jo';input.handlers.input[0]({inputType:'insertText'});
 assert.equal(input.value,'Jo');assert.equal(elements.get('quickBookSug').hidden,false);
 let timers=0;context.setTimeout=()=>{timers++;return 1;};input.value='John 3';input.handlers.input[0]({inputType:'deleteContentBackward'});
 assert.equal(input.value,'John 3');assert.equal(timers,0);
});

test('voice Quick jump recognises a spoken reference and searches remembered words',async()=>{
 const sessions=[];class Recognition{constructor(){sessions.push(this);}start(){this.started=true;}stop(){}}
 const {elements}=boot({recognition:Recognition});await new Promise(resolve=>setImmediate(resolve));
 elements.get('btnVoiceJump').click();assert.equal(sessions[0].started,true);
 sessions[0].onresult({results:[[{transcript:'show John chapter three verse sixteen'}]]});
 assert.match(elements.get('liveText').innerHTML,/John 3:16/);
 elements.get('btnVoiceSearch').click();sessions[1].onresult({results:[[{transcript:'sheep hear my voice'}]]});
 assert.equal(elements.get('bibleSearch').value,'sheep hear my voice');assert.match(elements.get('bibleResults').innerHTML,/John/);
});
test('voice navigation starts, advances, and stops without restarting after a microphone failure',async()=>{
 const sessions=[];class Recognition{constructor(){sessions.push(this);}start(){this.starts=(this.starts||0)+1;}stop(){this.stopped=true;}}
 const {context,elements}=boot({recognition:Recognition});await new Promise(resolve=>setImmediate(resolve));
 vm.runInContext('goLiveScripture({bookIdx:42,ch:3,vFrom:16,vTo:17})',context);
 elements.get('btnVoice2').click();assert.equal(vm.runInContext('voiceOn',context),true);
 const event={resultIndex:0,results:[Object.assign([{transcript:'next'}],{isFinal:true})]};sessions[0].onresult(event);
 assert.match(elements.get('liveText').innerHTML,/John 3:17/);
 sessions[0].onerror({error:'audio-capture'});sessions[0].onend();
 assert.equal(vm.runInContext('voiceOn',context),false);assert.equal(sessions[0].starts,1);assert.match(elements.get('feVoice').textContent,/Microphone unavailable/);
});
