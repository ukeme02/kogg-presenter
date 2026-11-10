const test=require('node:test'),assert=require('node:assert/strict'),M=require('../js/media-sync.js'),L=require('../js/library.js');
const user={id:'11111111-1111-4111-8111-111111111111'},other={id:'22222222-2222-4222-8222-222222222222'};
const item=(id='media-one',kind='video')=>({id:'item-'+id,type:'media',title:'Sunday media',slides:[{text:'',label:'Media',media:{id,kind,fit:'contain',dim:0,muted:true,loop:false}}]});
function fixture(){
 const objects=new Map(),uploads=new Map(),local=new Map(),store=new Map(),state={posts:0,patches:0,gets:0,failAfterChunk:false,foreignLocation:false,badDownload:false,saveFails:false};
 const assets={get:async id=>local.get(id),put:async(id,blob)=>{if(state.saveFails)return false;local.set(id,blob);return true;}};
 const client={auth:{getSession:async()=>({data:{session:{access_token:'fixture-token',user}}})},storage:{from:()=>({info:async path=>objects.has(path)?{data:{size:objects.get(path).size}}:{error:{statusCode:'404'}}})}};
 const fetcher=async(raw,init)=>{const url=new URL(raw);assert.equal(init.headers.Authorization,'Bearer fixture-token');assert.equal(init.redirect,'error');
  if(init.method==='POST'){state.posts++;const metadata=Object.fromEntries(init.headers['Upload-Metadata'].split(',').map(x=>{const [k,v]=x.split(' ');return [k,atob(v)];}));assert.equal(metadata.bucketName,'service-media');assert.ok(metadata.objectName.startsWith(user.id+'/'));const id=String(uploads.size+1);uploads.set(id,{metadata,parts:[],offset:0,length:Number(init.headers['Upload-Length'])});return new Response(null,{status:201,headers:{Location:state.foreignLocation?'https://foreign.invalid/steal':url.origin+url.pathname+'/'+id}});}
  if(init.method==='HEAD'){const upload=uploads.get(url.pathname.split('/').at(-1));return upload?new Response(null,{status:200,headers:{'Upload-Offset':String(upload.offset)}}):new Response(null,{status:404});}
  if(init.method==='PATCH'){state.patches++;const upload=uploads.get(url.pathname.split('/').at(-1));assert.equal(Number(init.headers['Upload-Offset']),upload.offset);assert.ok(init.body.size<=6*1024*1024);upload.parts.push(init.body);upload.offset+=init.body.size;if(upload.offset===upload.length)objects.set(upload.metadata.objectName,new Blob(upload.parts,{type:upload.metadata.contentType}));if(state.failAfterChunk){state.failAfterChunk=false;throw Error('connection dropped');}return new Response(null,{status:204,headers:{'Upload-Offset':String(upload.offset)}});}
  if(init.method==='GET'){state.gets++;const path=url.pathname.split('/service-media/')[1],blob=objects.get(path);if(!blob)return new Response(null,{status:404});return new Response(state.badDownload?new Blob(['bad']):blob,{headers:{'Content-Length':String(blob.size)}});}
  throw Error('Unexpected request '+init.method);
 };
 const api=M.create({client,baseURL:'https://fixture.supabase.co',assets,store:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},fetcher});return {api,state,objects,uploads,local,store};
}
test('referenced files upload once and a new device downloads the active service only',async()=>{
 const f=fixture(),blob=new Blob(['fixture video'],{type:'video/mp4'});f.local.set('media-one',blob);f.local.set('media-two',blob);
 const data=await f.api.publish({service:[item()],plans:{Later:[item('media-two')]}},user);assert.equal(f.state.posts,1);assert.equal(f.state.patches,1);assert.equal(Object.keys(data.mediaAssets).length,2);L.validate(data);
 await f.api.publish(data,user);assert.equal(f.state.posts,1);
 f.local.clear();const result=await f.api.prepare(data,user);assert.deepEqual(result,{ready:1,total:1});assert.equal(f.state.gets,1);assert.ok(f.local.get('media-one') instanceof Blob);assert.equal(f.local.has('media-two'),false);
 await f.api.prepare(data,user);assert.equal(f.state.gets,1);
 await f.api.prepare({...data,service:data.plans.Later},user);assert.equal(f.state.gets,2);
});
test('an interrupted upload resumes at the server-confirmed offset',async()=>{
 const f=fixture();f.local.set('media-one',new Blob([new Uint8Array(8*1024*1024)],{type:'video/mp4'}));f.state.failAfterChunk=true;
 await assert.rejects(f.api.publish({service:[item()]},user),/connection dropped/);assert.equal(f.state.posts,1);assert.equal(f.store.size,1);
 const data=await f.api.publish({service:[item()]},user);assert.equal(f.state.posts,1);assert.equal(f.state.patches,2);assert.equal(data.mediaAssets['media-one'].size,8*1024*1024);assert.equal(f.store.size,0);
});
test('unsafe upload redirect, wrong account, and corrupt downloads never save a local file',async()=>{
 const f=fixture();f.local.set('media-one',new Blob(['fixture'],{type:'video/mp4'}));f.state.foreignLocation=true;await assert.rejects(f.api.publish({service:[item()]},user),/Unexpected/);assert.equal(f.state.patches,0);
 f.state.foreignLocation=false;const data=await f.api.publish({service:[item()]},user);f.local.clear();await assert.rejects(f.api.prepare(data,other),/account/);assert.equal(f.state.gets,0);
 f.state.badDownload=true;await assert.rejects(f.api.prepare(data,user),/verification failed/);assert.equal(f.local.size,0);
});
test('cancellation, changed local media, quota errors and files above the cloud limit stay explicit',async()=>{
 const f=fixture();f.local.set('media-one',new Blob(['fixture'],{type:'video/mp4'}));await assert.rejects(f.api.publish({service:[item()]},user,{isCurrent:()=>false}),/cancelled/);assert.equal(f.state.posts,0);
 const data=await f.api.publish({service:[item()]},user);f.local.set('media-one',new Blob(['different'],{type:'video/mp4'}));await assert.rejects(f.api.publish(data,user),/differs/);
 f.local.clear();f.state.saveFails=true;await assert.rejects(f.api.prepare(data,user),/device storage/);
 f.local.set('media-one',new Blob([new Uint8Array(M.LIMIT+1)],{type:'video/mp4'}));await assert.rejects(f.api.publish({service:[item()]},user),/50 MB/);
});
test('cloud metadata validates and merges without embedding binary data',async()=>{
 const f=fixture();f.local.set('media-one',new Blob(['fixture'],{type:'video/mp4'}));const data=await f.api.publish({service:[item()]},user),copy=L.validate(JSON.parse(JSON.stringify(data)));
 const merged=L.merge({}, {service:[],songs:[],themes:[],plans:{}},copy);assert.deepEqual(merged.mediaAssets,copy.mediaAssets);assert.ok(JSON.stringify(merged).length<1500);
 copy.mediaAssets['media-one'].path='https://foreign.invalid/file';assert.throws(()=>L.validate(copy),/Invalid cloud media/);
});
