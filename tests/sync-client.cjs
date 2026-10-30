const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const lib=require('../js/library.js'),source=fs.readFileSync('js/sync.js','utf8');
const theme={id:'t1',name:'Black',bg:'#000',font:'Arial',textColor:'#fff',fontSize:7};
const song=title=>({id:'a',title,lyrics:'text'});
const payload=songs=>({songs,themes:[theme],plans:{},settings:{},assets:{}});
function setup({remote=null,local=[],base=null,owner=null,loseRace=false}={}) {
  const storage=new Map([['cp_songs',JSON.stringify(local)],['cp_themes',JSON.stringify([theme])]]);
  if(base)storage.set('cp_sync_base_user',JSON.stringify({data:base,revision:'old'}));
  if(owner)storage.set('cp_libraryOwner',owner);
  const state={remote,writes:0,last:null,failSDK:false,scriptCount:0};
  const client={auth:{getUser:async()=>({data:{user:{id:'user'}}})},from(){
    let action='read',data,filters={};
    const q={select(){return q;},eq(k,v){filters[k]=v;return q;},update(value){action='update';data=value;return q;},insert(value){action='insert';data=value;return q;},async maybeSingle(){if(action==='read')return {data:state.remote};if(loseRace)return {data:null};assert.equal(filters.updated_at,state.remote.updated_at);state.writes++;state.last=data;state.remote={data:data.data,updated_at:data.updated_at};return {data:{updated_at:data.updated_at}};},async single(){assert.equal(action,'insert');assert.equal(state.remote,null);state.writes++;state.last=data;state.remote={data:data.data,updated_at:data.updated_at};return {data:{updated_at:data.updated_at}};}};return q;
  }};
  const c=vm.createContext({window:{KOGG_SUPABASE:{url:'https://test.invalid',anonKey:'public-test'},KOGGLibrary:lib,supabase:{createClient:()=>client}},location:{href:'http://127.0.0.1/index.html'},URL,setTimeout:()=>1,clearTimeout(){},document:{createElement:()=>({remove(){}}),head:{appendChild(script){state.scriptCount++;queueMicrotask(()=>state.failSDK?script.onerror():script.onload());}}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});
  vm.runInContext(source,c);return {api:c.window.KOGGSync,state,storage};
}
test('first empty-cloud sync creates a library, and a later pull works',async()=>{const {api,state}=setup({local:[song('Local')]});const result=await api.push();assert.equal(state.writes,1);assert.equal(result.songs[0].title,'Local');assert.equal((await api.pull()).songs[0].title,'Local');});
test('actual client merges a remote edit over an unchanged local item',async()=>{const {api}=setup({local:[song('Old')],base:payload([song('Old')]),remote:{data:payload([song('Remote')]),updated_at:'new'}});assert.equal((await api.pull()).songs[0].title,'Remote');});
test('actual client never writes when both devices edited the same song',async()=>{const {api,state}=setup({local:[song('Local')],base:payload([song('Old')]),remote:{data:payload([song('Remote')]),updated_at:'new'}});await assert.rejects(api.push(),/conflict/);assert.equal(state.writes,0);});
test('actual client conditional write detects a racing cloud update',async()=>{const {api,state}=setup({local:[song('Local')],base:payload([song('Old')]),remote:{data:payload([song('Old')]),updated_at:'new'},loseRace:true});await assert.rejects(api.push(),/changed during sync/);assert.equal(state.writes,0);});
test('different-account library is blocked before data upload',async()=>{const {api,state}=setup({owner:'someone-else',local:[song('Private')]});await assert.rejects(api.push(),/different account/);assert.equal(state.writes,0);});
test('SDK download can retry after an initial network failure',async()=>{const {api,state}=setup();state.failSDK=true;await assert.rejects(api.getClient(),/Could not load/);state.failSDK=false;assert(await api.getClient());assert.equal(state.scriptCount,2);});
