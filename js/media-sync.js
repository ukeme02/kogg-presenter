/* Private, content-addressed media. Loaded only when Sync needs scheduled files. */
(function(scope){'use strict';
 const BUCKET='service-media',LIMIT=50*1024*1024,CHUNK=6*1024*1024;
 const hashes=new WeakMap();
 function check(options={}){if(options.signal?.aborted||options.isCurrent&&!options.isCurrent())throw new DOMException('Media transfer cancelled','AbortError');}
 async function digest(blob){if(!hashes.has(blob))hashes.set(blob,blob.arrayBuffer().then(b=>crypto.subtle.digest('SHA-256',b)).then(b=>Array.from(new Uint8Array(b),n=>n.toString(16).padStart(2,'0')).join('')));return hashes.get(blob);}
 function refs(data){const result=new Map();for(const item of [...(data.service||[]),...Object.values(data.plans||{}).flat()])for(const slide of item.slides||[])if(slide.media&&!result.has(slide.media.id))result.set(slide.media.id,{...slide.media,name:item.title||slide.label||'Media'});return [...result.values()];}
 function owned(meta,user){return !!meta&&/^[0-9a-f]{64}$/.test(meta.sha256)&&meta.path===user.id+'/'+meta.sha256&&Number.isInteger(meta.size)&&meta.size>0&&meta.size<=LIMIT;}
 function failure(status){if(status===413)return Error('Cloud media supports files up to 50 MB. Use a smaller video for Sync; the original still works locally.');if(status===401)return Error('Sign in again to finish media Sync.');if(status===403)return Error('Private media storage is not ready or access was denied. Your local files are safe.');return Error('Media transfer could not finish. Check your connection and retry.');}
 function create({client,baseURL,assets,store,fetcher=fetch}){
  const base=new URL(baseURL),endpoint=new URL('/storage/v1/upload/resumable',base);endpoint.hostname=base.hostname.replace(/\.supabase\.co$/,'.storage.supabase.co');
  const bucket=()=>client.storage.from(BUCKET);
  async function auth(user,options){check(options);const {data,error}=await client.auth.getSession();check(options);if(error)throw error;const session=data?.session;if(!session?.access_token||session.user?.id!==user.id)throw Error('Sign in to the same account to continue media Sync.');return {Authorization:'Bearer '+session.access_token};}
  async function send(url,init,user,options){check(options);const headers=await auth(user,options),controller=new AbortController(),cancel=()=>controller.abort();options.signal?.addEventListener('abort',cancel,{once:true});const timer=setTimeout(cancel,60000);try{const response=await fetcher(url,{...init,headers:{...headers,...init.headers},signal:controller.signal,redirect:'error',credentials:'omit',cache:'no-store'});check(options);return response;}finally{clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);}}
  function safeURL(raw){try{const u=new URL(raw);return (u.origin===endpoint.origin||u.origin===base.origin)&&u.pathname.startsWith(endpoint.pathname+'/')&&!u.username&&!u.password?u.href:null;}catch{return null;}}
  async function exists(meta,options){check(options);const {data,error}=await bucket().info(meta.path);check(options);if(error){const code=Number(error.statusCode||error.status);if([400,404].includes(code))return false;throw Error('Could not check private media storage. Complete Storage setup or retry when connected.');}return Number(data?.metadata?.size??data?.size)===meta.size;}
  async function upload(blob,meta,user,options){
   const resumeKey='cp_media_upload_'+user.id+'_'+meta.sha256;let url;try{const saved=JSON.parse(store.getItem(resumeKey));if(saved?.at>Date.now()-23*60*60*1000)url=safeURL(saved.url);}catch{}
   let offset=0;
   if(url){const response=await send(url,{method:'HEAD',headers:{'Tus-Resumable':'1.0.0'}},user,options);if(response.ok)offset=Number(response.headers.get('Upload-Offset'));else if([404,410].includes(response.status))url=null;else throw failure(response.status);}
   if(!url){const metadata={bucketName:BUCKET,objectName:meta.path,contentType:meta.type,cacheControl:'31536000'};
    const response=await send(endpoint.href,{method:'POST',headers:{'Tus-Resumable':'1.0.0','Upload-Length':String(blob.size),'Upload-Metadata':Object.entries(metadata).map(([key,value])=>key+' '+btoa(value)).join(',')}},user,options);
    if(!response.ok){if(response.status===409&&await exists(meta,options))return;throw failure(response.status);}
    url=safeURL(new URL(response.headers.get('Location')||'',endpoint).href);if(!url)throw Error('Unexpected media upload location. Transfer stopped.');
    try{store.setItem(resumeKey,JSON.stringify({url,at:Date.now()}));}catch{}
   }
   if(!Number.isInteger(offset)||offset<0||offset>blob.size)throw Error('Invalid upload progress. Retry media Sync.');
   while(offset<blob.size){check(options);const end=Math.min(blob.size,offset+CHUNK),response=await send(url,{method:'PATCH',headers:{'Tus-Resumable':'1.0.0','Upload-Offset':String(offset),'Content-Type':'application/offset+octet-stream'},body:blob.slice(offset,end)},user,options);
    if(!response.ok){if(response.status===409&&await exists(meta,options))break;throw failure(response.status);}
    const next=Number(response.headers.get('Upload-Offset'));if(next!==end)throw Error('Upload progress was not confirmed. Retry to resume.');offset=next;options.onProgress?.({phase:'upload',name:options.name,done:offset,total:blob.size});
   }
   check(options);if(!await exists(meta,options))throw Error('The uploaded file was not confirmed. Retry media Sync.');try{store.removeItem(resumeKey);}catch{}
  }
  async function publish(data,user,options={}){
   const manifest={},files=refs(data),confirmed=new Set();
   for(const file of files){check(options);options.onProgress?.({phase:'check',name:file.name});let meta=data.mediaAssets?.[file.id];if(meta&&(!owned(meta,user)||!meta.type.startsWith(file.kind+'/')))throw Error('This media belongs to another account. Upload your own copy.');
    const blob=await assets.get(file.id);check(options);
    if(blob instanceof Blob){if(blob.size>LIMIT)throw failure(413);if(!blob.size||!['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm','video/ogg'].includes(blob.type)||!blob.type.startsWith(file.kind+'/'))throw Error('Unsupported media file: '+file.name);
     const sha256=await digest(blob);check(options);if(meta&&meta.sha256!==sha256)throw Error(file.name+': this file differs from its cloud copy. Add it as new media to replace it.');
     meta={path:user.id+'/'+sha256,sha256,size:blob.size,type:blob.type};
     if(!confirmed.has(meta.path)&&!await exists(meta,options))await upload(blob,meta,user,{...options,name:file.name});
    }else if(!meta||!confirmed.has(meta.path)&&!await exists(meta,options))throw Error(file.name+': file missing here and in the cloud. Relink it before syncing.');
    confirmed.add(meta.path);manifest[file.id]=meta;
   }
   return {...data,mediaAssets:manifest};
  }
  async function download(meta,user,options){
   const response=await send(new URL('/storage/v1/object/authenticated/'+BUCKET+'/'+meta.path,base).href,{method:'GET'},user,options);if(!response.ok)throw failure(response.status);
   const length=Number(response.headers.get('Content-Length')||0);if(length>LIMIT||length&&length!==meta.size)throw Error('Cloud file size does not match the schedule.');
   const reader=response.body?.getReader();let blob;
   if(reader){const chunks=[];let received=0,timer,timedOut=false;const cancel=()=>reader.cancel().catch(()=>{});options.signal?.addEventListener('abort',cancel,{once:true});try{while(true){check(options);timer=setTimeout(()=>{timedOut=true;cancel();},60000);const {value,done}=await reader.read();clearTimeout(timer);if(timedOut)throw Error('Download paused. Check your connection and retry.');check(options);if(done)break;received+=value.byteLength;if(received>meta.size)throw Error('Cloud file exceeded its expected size.');chunks.push(value);options.onProgress?.({phase:'download',name:options.name,done:received,total:meta.size});}}catch(error){await reader.cancel();throw error;}finally{clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);}blob=new Blob(chunks,{type:meta.type});}
   else blob=new Blob([await response.arrayBuffer()],{type:meta.type});
   check(options);if(blob.size!==meta.size||await digest(blob)!==meta.sha256)throw Error('Cloud file verification failed. Retry the download.');check(options);return blob;
  }
  async function prepare(data,user,options={}){
   const files=refs({service:data.service||[],plans:{}}),downloaded=new Map();let ready=0;
   for(const file of files){check(options);const meta=data.mediaAssets?.[file.id];if(meta&&(!owned(meta,user)||!meta.type.startsWith(file.kind+'/')))throw Error('Media account does not match. Sign in to the owner account.');
    const local=await assets.get(file.id);check(options);
    if(local instanceof Blob&&(!meta||local.size===meta.size&&await digest(local)===meta.sha256)){ready++;continue;}
    if(!meta)throw Error(file.name+': not uploaded yet. Sync this service from the device that has the file.');
    const blob=downloaded.get(meta.path)||await download(meta,user,{...options,name:file.name});check(options);if(!await assets.put(file.id,blob))throw Error('Not enough device storage for '+file.name+'.');check(options);downloaded.set(meta.path,blob);ready++;
   }
   return {ready,total:files.length};
  }
  return {publish,prepare};
 }
 const api={create,digest,refs,owned,LIMIT};if(typeof module!=='undefined')module.exports=api;else scope.KOGGMediaSync=api;
})(typeof window!=='undefined'?window:globalThis);
