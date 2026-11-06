const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('landing.html','utf8');
class Node{
 constructor(){this.value='';this.textContent='';this.style={};this.children=[];this.attrs={};this.dataset={};this.events={};this.hidden=false;this.clientWidth=0;this.clientHeight=0;}
 addEventListener(type,fn){(this.events[type]??=[]).push(fn);} fire(type,event={}){for(const fn of this.events[type]||[])fn(event);} click(){this.fire('click');} focus(){this.focused=true;}
 setAttribute(key,value){this.attrs[key]=String(value);} getAttribute(key){return this.attrs[key];} appendChild(el){this.children.push(el);} replaceChildren(...els){this.children=els;this.textContent='';}
}
function boot(){
 const nodes=new Map(),all=[];for(const match of html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)){
  const attrs=Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]])),el=new Node();el.attrs=attrs;el.value=attrs.value||'';el.hidden=/\bhidden\b/.test(match[2]);
  for(const [key,value] of Object.entries(attrs))if(key.startsWith('data-'))el.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;
  if(attrs.id)nodes.set(attrs.id,el);all.push(el);
 }
 for(const match of html.matchAll(/<textarea[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/textarea>/g))nodes.get(match[1]).value=match[2];
 const query=selector=>{const attr=selector.match(/^\[([^\]]+)\]$/)?.[1];return attr?all.filter(el=>attr in el.attrs):[];};
 const document={getElementById:id=>nodes.get(id),querySelectorAll:query,createElement:()=>new Node()};
 const context=vm.createContext({document,window:{addEventListener(){}},requestAnimationFrame:fn=>fn()});vm.runInContext(fs.readFileSync('js/landing-tour.js','utf8'),context);
 return {nodes,query,context};
}
test('all eight tour tabs support keyboard navigation without losing draft inputs',()=>{
 const b=boot(),source=fs.readFileSync('js/landing.js','utf8'),a=source.indexOf(' function tabs('),z=source.indexOf(" tabs('[data-hero-tab]');",a);b.context.$=id=>b.nodes.get(id);vm.runInContext(source.slice(a,z)+"tabs('[data-tour-tab]');",b.context);
 const buttons=b.query('[data-tour-tab]');assert.equal(buttons.length,8);b.nodes.get('tourNotesInput').value='Keep this draft';
 buttons[0].fire('keydown',{key:'End',preventDefault(){}});assert.equal(b.nodes.get('tour-tools').hidden,false);assert.equal(buttons[7].attrs['aria-selected'],'true');assert.equal(buttons[7].focused,true);
 buttons[7].fire('keydown',{key:'ArrowRight',preventDefault(){}});assert.equal(b.nodes.get('tour-scripture').hidden,false);assert.equal(b.nodes.get('tour-tools').hidden,true);
 for(const button of buttons){button.click();assert.equal(b.nodes.get('tour-'+button.dataset.tourTab).hidden,false);assert.equal(buttons.filter(x=>x.attrs['aria-selected']==='true').length,1);}
 assert.equal(b.nodes.get('tourNotesInput').value,'Keep this draft');
});
test('Notes produces safe bullet nodes and clears the preview for an empty draft',()=>{
 const {nodes}=boot(),input=nodes.get('tourNotesInput'),out=nodes.get('tourNotesOutput');input.value='• First point\n\n<script>not executable</script>';input.fire('input');assert.deepEqual(out.children[0].children.map(x=>x.textContent),['First point','<script>not executable</script>']);
 input.value='  ';input.fire('input');assert.equal(out.children.length,0);assert.match(out.textContent,/first point/);nodes.get('tourNotesReset').click();assert.equal(out.children[0].children.length,3);
});
test('Slides and Service controls change their own preview and stop at queue boundaries',()=>{
 const {nodes,query}=boot();query('[data-tour-moment]')[2].click();assert.equal(nodes.get('tourSlideOutput').textContent,'Offering');
 nodes.get('tourSlideTitle').value='Church anniversary';nodes.get('tourSlideTitle').fire('input');assert.equal(nodes.get('tourSlideOutput').textContent,'Church anniversary');
 assert.equal(nodes.get('tourServicePrev').disabled,true);nodes.get('tourServiceNext').click();assert.match(nodes.get('tourServiceOutput').textContent,/Amazing grace/);nodes.get('tourServiceNext').click();assert.match(nodes.get('tourServiceOutput').textContent,/shepherd/);assert.equal(nodes.get('tourServiceNext').disabled,true);nodes.get('tourServiceNext').click();assert.match(nodes.get('tourServiceStatus').textContent,/3 of 3/);
});
test('Stream keeps edits private until Show and hides only its sample tag',()=>{
 const {nodes}=boot();nodes.get('tourStreamName').value='Guest minister';assert.notEqual(nodes.get('tourStreamNameOut').textContent,'Guest minister');nodes.get('tourStreamShow').click();assert.equal(nodes.get('tourStreamNameOut').textContent,'Guest minister');nodes.get('tourStreamHide').click();assert.equal(nodes.get('tourStreamTag').hidden,true);
 nodes.get('tourStreamName').value='';nodes.get('tourStreamRole').value='';nodes.get('tourStreamShow').click();assert.equal(nodes.get('tourStreamTag').hidden,true);assert.match(nodes.get('tourStreamStatus').textContent,/Type a name/);
});
test('Themes change the sample look and Tools selects useful guides',()=>{
 const {nodes,query}=boot();nodes.get('tourThemeLook').value='black';nodes.get('tourThemeFont').value='serif';nodes.get('tourThemeSize').value='70';nodes.get('tourThemeSize').fire('input');assert.equal(nodes.get('tourThemeScreen').style.background,'#080b12');assert.equal(nodes.get('tourThemeScreen').style.fontFamily,'Georgia,serif');assert.equal(nodes.get('tourThemeSizeLabel').textContent,'70%');
 query('[data-tour-tool]')[2].click();assert.match(nodes.get('tourToolTitle').textContent,/copy of your work/);assert.equal(nodes.get('tourToolSteps').children.length,3);assert.equal(nodes.get('tourToolLink').href,'#voice');
});
