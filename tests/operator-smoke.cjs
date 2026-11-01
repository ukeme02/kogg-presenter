const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('js/app.js','utf8');
class Element {
 constructor(id=''){this.id=id;this.handlers={};this.style={};this.dataset={};this.options=[];this.children=[];this.hidden=false;this.textContent='';this._value='';this.parentNode={insertBefore(){}};this.classList={toggle(){},add(){},remove(){},contains(){return false;}};}
 addEventListener(t,fn){(this.handlers[t] ||= []).push(fn);} removeEventListener(){} dispatchEvent(e){for(const fn of this.handlers[e.type]||[])fn(e);} click(){this.dispatchEvent({type:'click',target:this,stopPropagation(){}});} focus(){} scrollIntoView(){} setAttribute(){} getBoundingClientRect(){return {left:0,top:0,width:500,height:300,bottom:300};} querySelector(){return new Element();} querySelectorAll(){return [];} appendChild(v){this.children.push(v);return v;}
 set innerHTML(value){this._html=value;const opts=[...value.matchAll(/<option(?:\s+value="([^"]*)")?[^>]*>(.*?)<\/option>/g)];if(opts.length){this.options=opts.map(m=>({value:m[1]??m[2],text:m[2]}));this._value=this.options[0].value;}}
 get innerHTML(){return this._html||'';} set value(v){this._value=String(v);} get value(){return this._value;}
}
function boot({recognition,session=new Map(),saved=new Map()}={}){
 const elements=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
 for(const m of html.matchAll(/<select[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g))elements.get(m[1]).innerHTML=m[2];
 const storage=new Map([['cp_settings',JSON.stringify({mode:'local',starterSeeded:true,hymnPackVersion:'traditional-basic-v1'})],...saved]);
 const document={getElementById:id=>elements.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>new Element(),addEventListener(){},removeEventListener(){},body:new Element(),head:new Element()};
 const context=vm.createContext({console,document,window:{SpeechRecognition:recognition,innerWidth:1280,innerHeight:720,KOGGSync:{configured:false},KOGGLibrary:require('../js/library.js'),KOGGScripture:require('../js/scripture-tools.js'),KOGGContent:require('../js/content.js'),KOGGNotes:require('../js/notes.js'),KOGGLyrics:require('../js/lyrics.js'),KOGGLyricsSources:require('../js/lyrics-sources.js'),addEventListener(){}},navigator:{onLine:false,userAgent:'Audit',platform:'',maxTouchPoints:0},location:{href:'http://127.0.0.1/index.html',protocol:'http:',pathname:'/index.html',search:'',hash:''},sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},AbortController,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setTimeout:()=>1,clearTimeout(){},URL,URLSearchParams,Blob,requestAnimationFrame(){},getComputedStyle:()=>({}),alert(){},confirm:()=>true,Event:class{constructor(type){this.type=type;}},fetch:async file=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(file,'utf8'))})});
 const sources=require('../js/lyrics-sources.js');context.window.KOGGLyricsSources={...sources,search:(q,o)=>sources.search(q,{...o,fetcher:(...a)=>context.fetch(...a)}),lookup:(song,o)=>sources.lookup(song,{...o,fetcher:(...a)=>context.fetch(...a)}),importLink:(raw,o)=>sources.importLink(raw,{...o,fetcher:(...a)=>context.fetch(...a)})};
 vm.runInContext(app,context);return {context,elements,storage,session};
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

function fillLyrics(elements,title='Example',lyrics='[Verse 1]\nOne\nTwo\n\n[Chorus]\nThree\nFour'){
 elements.get('songTitle').value=title;elements.get('songLyrics').value=lyrics;elements.get('songLyrics').handlers.input[0]();
}
test('lyrics paste produces escaped cards and direct slide display without publishing edits',async()=>{
 const {context,elements,storage}=boot();await new Promise(resolve=>setImmediate(resolve));const before=storage.get('cp_live');
 fillLyrics(elements,'Test','[Verse]\n<hello>\n\n[Chorus]\nWorld');assert.match(elements.get('songSlidesPreview').innerHTML,/&lt;hello&gt;/);assert.equal(storage.get('cp_live'),before);
 vm.runInContext('displayLyrics(1)',context);assert.equal(JSON.parse(storage.get('cp_live')).slides[1].text,'World');assert.equal(JSON.parse(storage.get('cp_live')).index,1);assert.match(elements.get('lyricsLiveText').innerHTML,/data-lyric-word="1">World</);
 elements.get('songLyrics').value='Changed';elements.get('songLyrics').handlers.input[0]();assert.match(elements.get('lyricsLiveText').innerHTML,/data-lyric-word="1">World</);
});
test('Local and Sync save lyrics with order and source for offline use',async()=>{
 for(const mode of ['local','sync']){const {context,elements,storage}=boot();await new Promise(resolve=>setImmediate(resolve));vm.runInContext(`LS.set(K.settings,{...LS.get(K.settings,{}),mode:'${mode}'})`,context);
 fillLyrics(elements);vm.runInContext("lyricsOrder=[0,1,0,1];lyricsSource={name:'Imported text',credits:'Writer'}",context);elements.get('btnSaveSong').click();
 const song=JSON.parse(storage.get('cp_songs'))[0];assert.deepEqual(song.order,[0,1,0,1]);assert.equal(song.source.credits,'Writer');assert.equal(vm.runInContext('songToSlides(songs[0]).length',context),4);
 }
});
test('Base session songs and queue survive refresh, stay out of permanent storage, and end cleanly',async()=>{
 const {context,elements,storage,session}=boot();await new Promise(resolve=>setImmediate(resolve));vm.runInContext("setWorkMode('base')",context);
 fillLyrics(elements,'Temporary');elements.get('btnSaveSong').click();elements.get('btnAddLyricsService').click();elements.get('btnLiveSong').click();
 assert.equal(storage.has('cp_songs'),false);assert.deepEqual(JSON.parse(storage.get('cp_service')),[]);assert.equal(JSON.parse(session.get('cp_lyrics_session')).songs.length,1);
 storage.set('cp_last_scripture',JSON.stringify({r:{bookIdx:42,ch:3,vFrom:16,vTo:16},translation:'data/kjv.json'}));
 const refreshed=boot({session,saved:storage});await new Promise(resolve=>setImmediate(resolve));assert.equal(vm.runInContext('lyricSession.songs.length',refreshed.context),1);assert.equal(vm.runInContext('service.filter(s=>s.sessionOnly).length',refreshed.context),1);assert.equal(JSON.parse(refreshed.storage.get('cp_live')).slides[0].text,'One\nTwo');
 refreshed.elements.get('btnEndLyricsSession').click();assert.equal(vm.runInContext('lyricSession.songs.length',refreshed.context),0);assert.equal(vm.runInContext('service.length',refreshed.context),0);assert.equal(JSON.parse(refreshed.storage.get('cp_live')).mode,'blank');
 const nextSession=boot({saved:storage});await new Promise(resolve=>setImmediate(resolve));assert.equal(vm.runInContext('lyricSession.songs.length',nextSession.context),0);assert.equal(JSON.parse(nextSession.storage.get('cp_live')).mode,'blank');
});
test('ending a Base session preserves an existing Local library',async()=>{
 const saved=new Map([['cp_songs',JSON.stringify([{id:'permanent',title:'Keep me',lyrics:'Saved words'}])]]);const {context,elements,storage}=boot({saved});await new Promise(resolve=>setImmediate(resolve));vm.runInContext("setWorkMode('base')",context);fillLyrics(elements,'Temporary','Session words');elements.get('btnSaveSong').click();elements.get('btnEndLyricsSession').click();assert.equal(JSON.parse(storage.get('cp_songs'))[0].title,'Keep me');
});
test('slide edit undo restores the previous text and order',async()=>{
 const {context,elements}=boot();await new Promise(resolve=>setImmediate(resolve));fillLyrics(elements);const original=elements.get('songLyrics').value;vm.runInContext('applyLyricsSections(LY.operation(LY.parse($("songLyrics").value),0,"delete"))',context);assert.notEqual(elements.get('songLyrics').value,original);elements.get('btnLyricsUndo').click();assert.equal(elements.get('songLyrics').value,original);
});
test('lyrics online search filters unusable records and reports service errors without losing drafts',async()=>{
 const {context,elements}=boot();await new Promise(resolve=>setImmediate(resolve));fillLyrics(elements);context.navigator.onLine=true;elements.get('songSearch').value='Example';
 context.fetch=async url=>new Response(JSON.stringify(url.startsWith('/api/')?{items:[{title:'Example',author:'Singer',lyrics:'One\n\nTwo',source:{name:'LRCLIB'}}],available:true}:[]),{headers:{'Content-Type':'application/json'}});await elements.get('btnSearchLyricsOnline').handlers.click[0]();assert.match(elements.get('lyricsOnlineResults').innerHTML,/Singer/);assert.doesNotMatch(elements.get('lyricsOnlineResults').innerHTML,/Instrumental/);
 context.fetch=async()=>new Response('{}',{status:503,headers:{'Content-Type':'application/json'}});await elements.get('btnSearchLyricsOnline').handlers.click[0]();assert.match(elements.get('lyricsSearchStatus').textContent,/unavailable/);assert.match(elements.get('songLyrics').value,/One/);
});


test('output follows a late projector without moving again on unchanged events',async()=>{
 const {context,elements}=boot();await new Promise(resolve=>setImmediate(resolve));
 const handlers={},home={left:0,top:0},details={currentScreen:home,screens:[home],addEventListener(t,fn){handlers[t]=fn;}};
 let moves=0;const popup={closed:false,focus(){},moveTo(x,y){moves++;this.position=[x,y];},resizeTo(){}};
 context.window.open=()=>popup;context.window.getScreenDetails=async()=>details;
 await elements.get('btnOpenDisplay').handlers.click[0]();assert.equal(moves,0);
 assert.match(elements.get('outputStatus').textContent,/waiting for an extended screen/);
 details.screens=[{left:0,top:0},{left:-1920,top:0,width:1920,height:1080}];
 await handlers.screenschange();assert.deepEqual(popup.position,[-1920,0]);assert.equal(moves,1);
 await handlers.screenschange();assert.equal(moves,1);
 details.screens=[home];await handlers.screenschange();
 details.screens=[home,{left:1920,top:0,width:1280,height:720}];await handlers.screenschange();
 assert.deepEqual(popup.position,[1920,0]);assert.equal(moves,2);
});
test('output awaits fullscreen exit before moving to a replacement screen',async()=>{
 const {context,elements}=boot();await new Promise(resolve=>setImmediate(resolve));const order=[];
 const popup={closed:false,focus(){},document:{fullscreenElement:{},async exitFullscreen(){order.push('exit');}},moveTo(){order.push('move');},resizeTo(){}};
 context.window.open=()=>popup;context.window.getScreenDetails=async()=>({currentScreen:{left:0,top:0},screens:[{left:0,top:0},{left:1920,top:0,width:1280,height:720}]});
 await elements.get('btnOpenDisplay').handlers.click[0]();assert.deepEqual(order,['exit','move']);
});

test('repeated Output clicks reuse the popup without navigating or dropping fullscreen',async()=>{const {context,elements}=boot();await new Promise(resolve=>setImmediate(resolve));let opens=0,requests=0;const popup={closed:false,focus(){},postMessage(m){if(m.type==='output-fullscreen')requests++;}};context.window.open=()=>{opens++;return popup;};await elements.get('btnOpenDisplay').handlers.click[0]();await elements.get('btnOpenDisplay').handlers.click[0]();assert.equal(opens,1);assert.equal(requests,1);popup.closed=true;await elements.get('btnOpenDisplay').handlers.click[0]();assert.equal(opens,2);});

test('More Bibles opens outside dock clipping and stays within viewport width',async()=>{const {context,elements}=boot();await new Promise(resolve=>setImmediate(resolve));const panel=elements.get('extraBiblePanel');panel.hidden=true;elements.get('btnMoreBibles').getBoundingClientRect=()=>({left:1200,top:520,bottom:562});await elements.get('btnMoreBibles').handlers.click[0]();assert.equal(panel.hidden,false);assert.ok(context.document.body.children.includes(panel));assert.equal(panel.style.position,'fixed');assert.ok(parseFloat(panel.style.left)+parseFloat(panel.style.width)<=context.window.innerWidth-12);assert.match(elements.get('extraBibleButtons').innerHTML,/class="bible-menu-row"/);});


test('Notes points display directly, keep editing private, and use device/session storage',async()=>{const {context,elements,storage,session}=boot();await new Promise(resolve=>setImmediate(resolve));elements.get('notesTitle').value='Sunday message';elements.get('notesBody').value='First point\n\nSecond <point>';elements.get('notesBody').handlers.input[0]();assert.match(elements.get('notesCards').innerHTML,/Second &lt;point&gt;/);assert.equal(JSON.parse(storage.get('cp_live')||'{"mode":"blank"}').mode,'blank');vm.runInContext('notesState.index=1;displayNotes()',context);let output=JSON.parse(storage.get('cp_live'));assert.equal(output.slides[1].text,'• Second <point>');assert.equal(output.index,1);elements.get('notesBody').value='Edited in preview';elements.get('notesBody').handlers.input[0]();assert.equal(JSON.parse(storage.get('cp_live')).slides[1].text,'• Second <point>');assert.ok(storage.has('cp_notes_device'));vm.runInContext('setWorkMode("base")',context);elements.get('notesBody').value='Session only';elements.get('notesBody').handlers.input[0]();assert.ok(session.has('cp_notes_session'));assert.doesNotMatch(storage.get('cp_notes_device'),/Session only/);});
test('Notes tag and alert preserve Scripture and Hide notes keeps the verse',async()=>{const {context,elements,storage}=boot();await new Promise(resolve=>setImmediate(resolve));vm.runInContext('goLiveScripture({bookIdx:42,ch:3,vFrom:16,vTo:16})',context);const before=JSON.parse(storage.get('cp_live'));for(const mode of ['tag','alert']){elements.get('notesMode').value=mode;elements.get('notesBody').value=mode==='tag'?'Pastor Example':'Please silence phones';elements.get('notesMode').handlers.change[0]();elements.get('btnNotesDisplay').click();const after=JSON.parse(storage.get('cp_live'));assert.deepEqual(after.slides,before.slides);assert.deepEqual(after.scripture,before.scripture);}elements.get('btnHideNotes').click();const after=JSON.parse(storage.get('cp_live'));assert.deepEqual(after.slides,before.slides);assert.equal(after.alert.on,false);assert.equal(after.lowerThird.on,false);});
test('online lyric selection imports and immediately displays its first slide',async()=>{const {context,elements,storage}=boot();await new Promise(resolve=>setImmediate(resolve));context.window.KOGGLyricsSources.lookup=async()=>({title:'Result',author:'Writer',lyrics:'[Verse]\nFirst online slide\n\n[Chorus]\nSecond online slide'});vm.runInContext("lyricsOnline=[{title:'Result'}]",context);const button={dataset:{importLyric:'0'},disabled:false};await elements.get('lyricsOnlineResults').handlers.click[0]({target:{closest:()=>button}});const live=JSON.parse(storage.get('cp_live'));assert.equal(live.mode,'normal');assert.equal(live.slides[0].text,'First online slide');assert.equal(live.index,0);});
test('a local lyrics miss schedules online search, but local matches and offline misses do not',async()=>{const {context,elements}=boot();await new Promise(resolve=>setImmediate(resolve));let queued=[];context.setTimeout=(fn,ms)=>{if(ms===650)queued.push(fn);return 1;};context.navigator.onLine=true;elements.get('songSearch').value='A completely unknown title';elements.get('songSearch').handlers.input[0]();assert.equal(queued.length,1);queued=[];vm.runInContext("songs=[{id:'known',title:'Known hymn',lyrics:'Words'}]",context);elements.get('songSearch').value='Known';elements.get('songSearch').handlers.input[0]();assert.equal(queued.length,0);context.navigator.onLine=false;elements.get('songSearch').value='Unknown again';elements.get('songSearch').handlers.input[0]();assert.equal(queued.length,0);});

test('Notes live typing updates only its own live item and never takes over later Scripture',async()=>{const {context,elements,storage}=boot();await new Promise(resolve=>setImmediate(resolve));elements.get('notesBody').value='Initial note';elements.get('notesBody').handlers.input[0]();elements.get('btnNotesDisplay').click();elements.get('notesFollow').checked=true;let queued=[];context.setTimeout=(fn,ms)=>{if(ms===180)queued.push(fn);return 1;};elements.get('notesBody').value='Updated live note';elements.get('notesBody').handlers.input[0]();assert.equal(queued.length,1);queued.shift()();assert.equal(JSON.parse(storage.get('cp_live')).slides[0].text,'• Updated live note');elements.get('notesBody').value='Pending edit';elements.get('notesBody').handlers.input[0]();vm.runInContext('goLiveScripture({bookIdx:42,ch:3,vFrom:16,vTo:16})',context);queued.shift()();assert.match(JSON.parse(storage.get('cp_live')).slides[0].label,/John 3:16/);});
test('image background stays selected after reload and Apply saves new display controls',async()=>{const {context,elements,storage}=boot();await new Promise(r=>setImmediate(r));vm.runInContext("themes[0].bgImage='data:image/png;base64,BG';renderThemesTab()",context);assert.equal(elements.get('themeBg').value,'image');elements.get('themeFontSize').value='9';elements.get('themeDim').value='35';elements.get('themeVertical').value='bottom';elements.get('themeImageFit').value='contain';elements.get('themeShowLabel').checked=false;elements.get('btnApplyTheme').click();const t=JSON.parse(storage.get('cp_themes'))[0];assert.equal(t.bgImage,'data:image/png;base64,BG');assert.equal(t.fontSize,9);assert.equal(t.dim,35);assert.equal(t.vertical,'bottom');assert.equal(t.imageFit,'contain');assert.equal(t.showLabel,false);assert.equal(JSON.parse(storage.get('cp_live')).themeId,t.id);});
test('custom image upload decodes, resizes and selects image before Save',async()=>{const {context,elements,storage}=boot();await new Promise(r=>setImmediate(r));vm.runInContext('renderThemesTab()',context);let canvas,encoding;const original=context.document.createElement;context.document.createElement=tag=>tag==='canvas'?(canvas={getContext:()=>({drawImage(){}}),toDataURL:type=>{encoding=type;return 'data:image/jpeg;base64,BG';}}):original(tag);context.FileReader=class{readAsDataURL(){this.result='data:image/png;base64,INPUT';this.onload();}};context.Image=class{constructor(){this.naturalWidth=4000;this.naturalHeight=2000;}set src(v){this.onload();}};elements.get('themeBgImage').files=[{type:'image/png',size:1000}];await elements.get('themeBgImage').handlers.change[0]();assert.equal(canvas.width,2560);assert.equal(canvas.height,1280);assert.equal(encoding,'image/jpeg');assert.equal(elements.get('themeBg').value,'image');elements.get('btnSaveTheme').click();assert.match(JSON.parse(storage.get('cp_themes'))[0].bgImage,/base64,BG/);});
test('invalid upload preserves existing theme background',async()=>{const {context,elements,storage}=boot();await new Promise(r=>setImmediate(r));vm.runInContext("themes[0].bgImage='data:image/png;base64,KEEP';renderThemesTab()",context);elements.get('themeBgImage').files=[{type:'text/plain',size:5}];await elements.get('themeBgImage').handlers.change[0]();assert.match(elements.get('themeStatus').textContent,/Choose a PNG/);assert.equal(vm.runInContext('themes[0].bgImage',context),'data:image/png;base64,KEEP');});
test('logo presets and cycle retain custom upload; remove restores default',async()=>{const {context,elements,storage}=boot();await new Promise(r=>setImmediate(r));vm.runInContext("LS.set(K.settings,{...LS.get(K.settings,{}),logoImage:'data:image/png;base64,CUSTOM'});refreshLogoStatus()",context);assert.equal(elements.get('logoStyle').value,'custom');for(const [id,style] of [['btnLogoCombination','combination'],['btnLogoWordmark','wordmark'],['btnLogoMark','mark']]){elements.get(id).click();const s=JSON.parse(storage.get('cp_settings'));assert.equal(s.logoStyle,style);assert.equal(s.logoImage,'data:image/png;base64,CUSTOM');}elements.get('btnCycleLogo').click();assert.equal(elements.get('logoStyle').value,'combination');elements.get('logoStyle').value='custom';elements.get('logoStyle').handlers.change[0]();elements.get('btnPreviewLogo').click();assert.equal(JSON.parse(storage.get('cp_live')).mode,'logo');elements.get('btnLogoClear').click();const s=JSON.parse(storage.get('cp_settings'));assert.equal(s.logoStyle,'combination');assert.equal(s.logoImage,'');});
test('logo upload preserves transparency and avoids displaying file name',async()=>{const {context,elements,storage}=boot();await new Promise(r=>setImmediate(r));let canvas,encoding;context.document.createElement=()=>canvas={getContext:()=>({drawImage(){}}),toDataURL:type=>{encoding=type;return 'data:image/png;base64,LOGO';}};context.FileReader=class{readAsDataURL(){this.result='data:image/png;base64,INPUT';this.onload();}};context.Image=class{constructor(){this.naturalWidth=3200;this.naturalHeight=1600;}set src(v){this.onload();}};elements.get('logoFile').files=[{type:'image/png',size:1000,name:'private-file-name.png'}];await elements.get('logoFile').handlers.change[0]();const s=JSON.parse(storage.get('cp_settings'));assert.equal(encoding,'image/png');assert.equal(canvas.width,1600);assert.equal(s.logoStyle,'custom');assert.equal(s.logoName,'');assert.equal(s.logoImage,'data:image/png;base64,LOGO');});
test('large background upload uses IndexedDB and remains linked after Save',async()=>{const {context,elements,storage}=boot();await new Promise(r=>setImmediate(r));vm.runInContext('renderThemesTab()',context);const assets=new Map();context.window.KOGGAssets={put:async(id,data)=>{assets.set(id,data);return true;},get:async id=>assets.get(id)};context.readPresentationImage=async()=> 'data:image/jpeg;base64,'+'A'.repeat(170000);elements.get('themeBgImage').files=[{type:'image/jpeg',size:170000}];await elements.get('themeBgImage').handlers.change[0]();elements.get('btnSaveTheme').click();const t=JSON.parse(storage.get('cp_themes'))[0];assert.ok(t.bgImageId);assert.equal(t.bgImage,'');assert.ok(assets.has(t.bgImageId));vm.runInContext('loadThemeForm()',context);assert.equal(elements.get('themeBg').value,'image');});
test('a delayed background upload belongs to the original theme after selection changes',async()=>{const {context,elements}=boot();await new Promise(r=>setImmediate(r));vm.runInContext('renderThemesTab()',context);let finish;context.readPresentationImage=()=>new Promise(r=>finish=r);elements.get('themeBgImage').files=[{type:'image/png',size:1000}];const pending=elements.get('themeBgImage').handlers.change[0]();elements.get('themeSelect').value='t2';elements.get('themeSelect').handlers.change[0]();finish('data:image/jpeg;base64,FIRST');await pending;assert.equal(vm.runInContext('themes[0].bgImage',context),'data:image/jpeg;base64,FIRST');assert.equal(vm.runInContext('themes[1].bgImage',context),'');assert.notEqual(elements.get('themeBg').value,'image');});

test('Notes Enter adds bullets on one slide and split control groups points without changing private output',async()=>{const {context,elements,storage}=boot();await new Promise(r=>setImmediate(r));elements.get('notesBody').value='One\nTwo\nThree\nFour';elements.get('notesBody').handlers.input[0]();elements.get('btnNotesDisplay').click();let live=JSON.parse(storage.get('cp_live'));assert.equal(live.slides.length,1);assert.equal(live.slides[0].bullets,true);assert.equal(live.slides[0].text,'• One\n• Two\n• Three\n• Four');elements.get('notesSplit').value='3';elements.get('notesSplit').handlers.change[0]();assert.equal(JSON.parse(storage.get('cp_live')).slides.length,1);elements.get('btnNotesDisplay').click();live=JSON.parse(storage.get('cp_live'));assert.equal(live.slides.length,2);assert.equal(live.slides[1].text,'• Four');});
test('Notes emphasis activates from live preview, reaches output and clears on a new slide',async()=>{const {context,elements,storage}=boot();await new Promise(r=>setImmediate(r));elements.get('notesBody').value='First point\nSecond point\n\nAnother slide';elements.get('notesBody').handlers.input[0]();elements.get('btnNotesDisplay').click();elements.get('btnNotesAnnotate').click();assert.match(elements.get('notesLiveText').innerHTML,/data-note-word="2"/);const word={dataset:{noteWord:'2'}};elements.get('notesLiveText').handlers.pointerdown[0]({target:{closest:()=>word},pointerId:1,preventDefault(){}});let live=JSON.parse(storage.get('cp_live'));assert.equal(live.textHighlight.from,2);assert.equal(live.textHighlight.key,live.notesKey);assert.match(elements.get('notesLiveText').innerHTML,/note-word marked/);elements.get('btnNotesClearHighlight').click();assert.equal(JSON.parse(storage.get('cp_live')).textHighlight,null);elements.get('notesLiveText').handlers.pointerdown[0]({target:{closest:()=>word},pointerId:1,preventDefault(){}});elements.get('btnNotesNext').click();assert.equal(JSON.parse(storage.get('cp_live')).textHighlight,null);});
test('background darkening slider updates its percentage and saves the chosen opacity',async()=>{const {context,elements,storage}=boot();await new Promise(r=>setImmediate(r));vm.runInContext('renderThemesTab()',context);elements.get('themeDim').value='67';await elements.get('themeDim').handlers.input[0]();assert.equal(elements.get('themeDimValue').textContent,'67%');elements.get('btnApplyTheme').click();assert.equal(JSON.parse(storage.get('cp_themes'))[0].dim,67);assert.match(html,/id="themeDim" type="range"/);});
test('Lyrics preview emphasis marks words live and mirrors the output theme',async()=>{
 const {context,elements,storage}=boot();await new Promise(r=>setImmediate(r));
 fillLyrics(elements);elements.get('btnLiveSong').click();
 const box=elements.get('lyricsLiveText');
 assert.match(box.innerHTML,/data-lyric-word="1"/);
 assert.ok(box.style.fontFamily);assert.ok(box.style.background);   // WYSIWYG: live theme applied
 const word={dataset:{lyricWord:'2'}};
 box.handlers.pointerdown[0]({target:{closest:()=>word},pointerId:1,preventDefault(){}});
 assert.match(box.innerHTML,/class="lyw marked"/);
 assert.equal(JSON.parse(storage.get('cp_live')).textHighlight.from,2);
 box.handlers.pointerup[0]();
 box.handlers.pointerdown[0]({target:{closest:()=>word},pointerId:1,preventDefault(){}});
 box.handlers.pointerup[0]();
 assert.equal(JSON.parse(storage.get('cp_live')).textHighlight ?? null,null);   // same-word tap toggles off
 box.handlers.pointerdown[0]({target:{closest:()=>null},pointerId:1,preventDefault(){}});
 assert.equal(JSON.parse(storage.get('cp_live')).textHighlight ?? null,null);
});
test('service items remember their theme and fire with it on any device',async()=>{
 const {context,elements,storage}=boot();await new Promise(r=>setImmediate(r));
 vm.runInContext("currentThemeId='t2';goLiveScripture({bookIdx:42,ch:3,vFrom:16,vTo:16})",context);
 elements.get('btnAddScripture').click();
 assert.equal(JSON.parse(storage.get('cp_service'))[0].themeId,'t2');
 vm.runInContext("currentThemeId='t1'",context);
 const fire=()=>{const id=JSON.parse(storage.get('cp_service'))[0].id;const btn={dataset:{act:'live'},closest:s=>s==='li'?{dataset:{id}}:btn};elements.get('serviceList').handlers.click[0]({target:{closest:()=>btn}});};
 fire();
 assert.equal(JSON.parse(storage.get('cp_live')).themeId,'t2');   // the prepared look travels with the schedule
 vm.runInContext("service[0].themeId='theme-not-on-this-device'",context);
 fire();
 assert.equal(JSON.parse(storage.get('cp_live')).themeId,'t1');   // missing theme falls back to this device's choice
});
test('gate signup shows a prominent friendly error and re-enables the buttons',async()=>{
 const {context,elements}=boot();await new Promise(r=>setImmediate(r));
 context.window.KOGGSync={configured:true,getClient:async()=>({}),signUp:async()=>{throw new Error('email rate limit exceeded');}};
 elements.get('btnGateUp').textContent='Create Account';elements.get('btnGateIn').textContent='Sign In';
 elements.get('gateEmail').value='you@church.org';elements.get('gatePass').value='secret1';
 await elements.get('btnGateUp').handlers.click[0]();await new Promise(r=>setImmediate(r));
 assert.match(elements.get('gateStatus').textContent,/email service is busy/);
 assert.equal(elements.get('btnGateUp').disabled,false);
 assert.equal(elements.get('btnGateUp').textContent,'Create Account');
 context.window.KOGGSync.signIn=async()=>{throw new Error('Invalid login credentials');};
 await elements.get('btnGateIn').handlers.click[0]();await new Promise(r=>setImmediate(r));
 assert.match(elements.get('gateStatus').textContent,/Wrong email or password/);
});
