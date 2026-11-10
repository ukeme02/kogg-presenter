/* KOGG Presenter — Supabase sync with three-way merges and conditional writes. */
'use strict';
(function () {
  const cfg = window.KOGG_SUPABASE || {};
  const configured = !!(cfg.url && cfg.anonKey);
  let sb = null, ready = null, writing = false;
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => { script.remove(); reject(new Error('Cloud connection timed out. Retry when online.')); }, 15000);
      script.src = src;
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Could not load cloud tools. Check your connection and retry.')); };
      document.head.appendChild(script);
    });
  }
  async function getClient() {
    if (sb) return sb;
    if (!configured) throw new Error('not-configured');
    if (!ready) ready = loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js')
      .then(() => (sb = window.supabase.createClient(cfg.url, cfg.anonKey)))
      .catch(err => { ready = null; throw err; });
    return ready;
  }
  let mediaReady=null;
  async function mediaClient(client){if(!window.KOGGMediaSync){if(!mediaReady)mediaReady=loadScript('js/media-sync.js').catch(error=>{mediaReady=null;throw error;});await mediaReady;}return window.KOGGMediaSync.create({client,baseURL:cfg.url,assets:window.KOGGAssets,store:localStorage});}
  function hasMedia(data){return [...(data.service||[]),...Object.values(data.plans||{}).flat()].some(item=>item.slides?.some(s=>s.media));}
  async function prepareMedia(data,options={}){checkpoint(options);const client=await getClient(),user=await currentUser();checkpoint(options);if(!user)throw Error('Sign in to prepare cloud media.');verifyOwner(user.id);if(!hasMedia({service:data.service}))return {ready:0,total:0};return (await mediaClient(client)).prepare(window.KOGGLibrary.validate(data),user,options);}
  async function currentUser() {
    const client = await getClient();
    if(client.auth.getSession){const session = await client.auth.getSession();if(session.error)throw session.error;if(!session.data?.session)return null;}
    const {data,error} = await client.auth.getUser();
    if (error) throw error;
    return data?.user || null;
  }
  async function signUp(email,password) { const c = await getClient(); const {data,error} = await c.auth.signUp({email,password}); if (error) throw error; return data; }
  async function signIn(email,password) { const c = await getClient(); const {data,error} = await c.auth.signInWithPassword({email,password}); if (error) throw error; return data; }
  async function signOut() { const c = await getClient(); const {error} = await c.auth.signOut(); if (error) throw error; }
  async function resetPassword(email) {
    const c = await getClient();
    const redirectTo = new URL('index.html', location.href).href;
    const {error} = await c.auth.resetPasswordForEmail(email, {redirectTo}); if (error) throw error;
  }
  async function updatePassword(password) { const c = await getClient(); const {error} = await c.auth.updateUser({password}); if (error) throw error; }
  function read(key,fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function verifyOwner(id) {
    const owner = localStorage.getItem('cp_libraryOwner');
    if (owner && owner !== id) throw new Error('This device library belongs to a different account. Sign back into that account or export and reset local app data before switching accounts.');
    if (!owner) localStorage.setItem('cp_libraryOwner', id);
  }
  function baseKey(id) { return 'cp_sync_base_' + id; }
  function base(id) { return read(baseKey(id),null); }
  function mergeBase(id,local,remote) {
    const saved=base(id);if(saved)return portable(saved.data);
    // A newly opened device has factory themes, not independent user edits.
    // Use those seeds only for first contact with an existing cloud theme library.
    return remote?.themes ? {themes:(window.KOGG_DEFAULT_THEMES||[]).filter(t=>local.themes?.some(x=>x.id===t.id))} : {};
  }
  function remember(id,row) {
    const data = {...(row?.data || {})}; delete data.assets;
    localStorage.setItem(baseKey(id),JSON.stringify({data,revision:row?.updated_at || null}));
  }
  // The merge base advances only after the operator accepts this exact result.
  const pendingResults = new WeakMap();
  function checkpoint(options={}) { if(options.signal?.aborted || options.isCurrent && !options.isCurrent()) { const error=new Error('Sync operation cancelled');error.name='AbortError';throw error; } }
  function prepared(data,id,row,options) { pendingResults.set(data,{id,row,options});return data; }
  function accept(data) { const pending=pendingResults.get(data);if(!pending)return false;checkpoint(pending.options);if(localStorage.getItem('cp_libraryOwner')!==pending.id)return false;remember(pending.id,pending.row);pendingResults.delete(data);return true; }
  // True when a realtime update echoes this device's own last write.
  function isOwnWrite(id,stamp) { return !!stamp && stamp === localStorage.getItem('cp_sync_stamp_' + id); }
  /* Live updates: while signed in, a change written by another device pulls
     automatically. Degrades silently when Realtime is not enabled for the table. */
  let libraryChannel = null, subscriptionGeneration=0;
  async function subscribe(onRemoteChange,options={}) {
    unsubscribe();const generation=subscriptionGeneration;
    const client = await getClient();checkpoint(options);const user = await currentUser();checkpoint(options);if(generation!==subscriptionGeneration)return;
    if (!user) throw new Error('not-signed-in');
    libraryChannel = client
      .channel('kogg-libraries-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'libraries', filter: 'user_id=eq.' + user.id },
        payload => { if(generation!==subscriptionGeneration)return;try {checkpoint(options);onRemoteChange?.(payload); } catch {} });
    libraryChannel.subscribe();
  }
  function unsubscribe() {
    subscriptionGeneration++;
    if (!libraryChannel) return;
    try { libraryChannel.unsubscribe(); } catch {}
    libraryChannel = null;
  }
  async function libraryPayload() {
    const payload = {songs:read('cp_songs',[]),service:read('cp_service',[]),themes:read('cp_themes',[]),plans:read('cp_plans',{}),settings:window.KOGGLibrary.portableSettings(read('cp_settings',{})),mediaAssets:read('cp_media_cloud',{}),assets:{}};
    for (const id of window.KOGGLibrary.assetIds(payload,false)) {
      const value = await window.KOGGAssets?.get(id);
      if (!value) throw new Error('Missing library image: ' + id + '. Re-add the image before syncing.');
      payload.assets[id] = value;
    }
    return window.KOGGLibrary.validate(payload);
  }
  function portable(data) {
    if (!data || !Object.keys(data).length) return {};
    const value = window.KOGGLibrary.validate(data);
    value.settings = window.KOGGLibrary.portableSettings(value.settings || {});
    return value;
  }
  async function readRow(client,user) {
    const {data,error} = await client.from('libraries').select('data,updated_at').eq('user_id',user.id).maybeSingle();
    if (error) throw error;
    return data;
  }
  async function pull(options={}) {
    checkpoint(options);const client = await getClient();checkpoint(options);const user = await currentUser();checkpoint(options);
    if (!user) throw new Error('not-signed-in');
    verifyOwner(user.id);
    const row = await readRow(client,user);checkpoint(options);
    const local = await libraryPayload();checkpoint(options);
    const remote=portable(row?.data);
    const merged = window.KOGGLibrary.merge(mergeBase(user.id,local,remote),local,remote);
    return prepared(merged,user.id,row,options);
  }
  async function push(options={}) {
    if (writing) throw new Error('A sync is already in progress.');
    writing = true;
    try {
      checkpoint(options);const client = await getClient();checkpoint(options);const user = await currentUser();checkpoint(options);
      if (!user) throw new Error('not-signed-in');
    verifyOwner(user.id);
      const row = await readRow(client,user);checkpoint(options);
      const local = await libraryPayload();checkpoint(options);
      const remote=portable(row?.data);
      let merged = window.KOGGLibrary.merge(mergeBase(user.id,local,remote),local,remote);
      if(hasMedia(merged)){merged=await (await mediaClient(client)).publish(merged,user,options);checkpoint(options);}
      const stamp = new Date().toISOString();
      let response;
      if (row) response = await client.from('libraries').update({data:merged,updated_at:stamp}).eq('user_id',user.id).eq('updated_at',row.updated_at).select('updated_at').maybeSingle();
      else response = await client.from('libraries').insert({user_id:user.id,data:merged,updated_at:stamp}).select('updated_at').single();
      if (response.error) throw response.error;
      if (!response.data) throw new Error('The cloud library changed during sync. Retry to merge the latest version.');
      checkpoint(options);
      try{localStorage.setItem('cp_sync_stamp_'+user.id,response.data.updated_at);}catch{}
      return prepared(merged,user.id,{data:merged,updated_at:response.data.updated_at},options);
    } finally { writing = false; }
  }
  window.KOGGSync = {configured,getClient,currentUser,signUp,signIn,signOut,resetPassword,updatePassword,push,pull,prepareMedia,libraryPayload,subscribe,unsubscribe,isOwnWrite,accept};
})();
