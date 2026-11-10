const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('js/landing.js','utf8');const block=source.slice(source.indexOf(' /* The hero runs'),source.indexOf(' // Floating watch-style'));
function boot({reduce=false,focus=false}={}){const els=new Map(),timers=new Map();let timerId=0,observer,moves=0;function el(id){if(els.has(id))return els.get(id);const e={id,hidden:false,textContent:'',handlers:{},attrs:{},classList:{toggle(){}},addEventListener(t,f){(this.handlers[t]??=[]).push(f)},getAttribute(k){return this.attrs[k]},setAttribute(k,v){this.attrs[k]=v},querySelector(){return el('screen-'+id)},contains(a){return a===focused},animate(){moves++;return {cancel(){}}}};els.set(id,e);return e;}
const focused={},stage=el('stage'),buttons=[el('scripture'),el('lyrics')];buttons.forEach((b,i)=>b.attrs['aria-controls']=i?'hero-lyrics':'hero-scripture');const doc={hidden:false,activeElement:focus?focused:null,querySelector:()=>stage,querySelectorAll:s=>s==='[data-hero-tab]'?buttons:s==='.scene-dots i'?[el('dot0'),el('dot1'),el('dot2'),el('dot3')]:[],addEventListener(){}};
const context=vm.createContext({document:doc,window:{IntersectionObserver:true,addEventListener(){}},navigator:{},$:el,paused:false,motionBlocked:()=>false,reduced:{matches:reduce,addEventListener(){}},motion:el('motion'),IntersectionObserver:class{constructor(f){observer=f}observe(){}},setTimeout:f=>{timers.set(++timerId,f);return timerId},clearTimeout:id=>timers.delete(id)});vm.runInContext(block,context);observer([{isIntersecting:true}]);return {els,stage,timers,observer,moves:()=>moves,fire(){const [id,f]=timers.entries().next().value;timers.delete(id);f();},context};}
test('hero advances through local scenes without network access',()=>{const b=boot();assert.equal(b.timers.size,1);b.fire();assert.match(b.els.get('projText').textContent,/shepherd/);b.fire();assert.match(b.els.get('heroLyricText').textContent,/Amazing grace/);assert.equal(b.moves(),2);});
test('hero starts by default and pauses for keyboard focus, hover and offscreen',()=>{assert.equal(boot({reduce:true}).timers.size,1);assert.equal(boot({focus:true}).timers.size,0);const b=boot();b.stage.handlers.pointerenter[0]();assert.equal(b.timers.size,0);b.stage.handlers.pointerleave[0]();assert.equal(b.timers.size,1);b.observer([{isIntersecting:false}]);assert.equal(b.timers.size,0);});

test('motion preference unifies CSS and preview timers and persists a deliberate override',()=>{
 const start=source.indexOf(' const reduced=window.matchMedia'),end=source.indexOf(' const revealTargets=',start);
 for(const systemReduced of [false,true]){
  const classes=new Set(),handlers={},saved=new Map();let text='';
  const button={setAttribute(){},addEventListener:(key,fn)=>handlers[key]=fn,set textContent(value){text=value}};
  const media={matches:systemReduced,addEventListener(){}};
  vm.runInNewContext(source.slice(start,end),{window:{matchMedia:()=>media,dispatchEvent(){}},document:{body:{classList:{toggle:(key,on)=>on?classes.add(key):classes.delete(key)}}},localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},$:id=>id==='motionPreference'?button:{addEventListener(){}},Event:class{}});
  assert.equal(classes.has('motion-paused'),systemReduced);
  handlers.click();assert.equal(classes.has('motion-enabled'),systemReduced);
  assert.equal(saved.get('kogg-landing-motion'),systemReduced?'full':'reduced');
  assert.match(text,systemReduced?/reduced/:/Enable/);
 }
});
