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
  function remember(id,row) {
    const data = {...(row?.data || {})}; delete data.assets;
    localStorage.setItem(baseKey(id),JSON.stringify({data,revision:row?.updated_at || null}));
  }
  async function libraryPayload() {
    const payload = {songs:read('cp_songs',[]),service:read('cp_service',[]),themes:read('cp_themes',[]),plans:read('cp_plans',{}),settings:window.KOGGLibrary.portableSettings(read('cp_settings',{})),assets:{}};
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
  async function pull() {
    const client = await getClient(), user = await currentUser();
    if (!user) throw new Error('not-signed-in');
    verifyOwner(user.id);
    const row = await readRow(client,user);
    const local = await libraryPayload();
    const merged = window.KOGGLibrary.merge(portable(base(user.id)?.data),local,portable(row?.data));
    remember(user.id,row);
    return merged;
  }
  async function push() {
    if (writing) throw new Error('A sync is already in progress.');
    writing = true;
    try {
      const client = await getClient(), user = await currentUser();
      if (!user) throw new Error('not-signed-in');
    verifyOwner(user.id);
      const row = await readRow(client,user);
      const local = await libraryPayload();
      const merged = window.KOGGLibrary.merge(portable(base(user.id)?.data),local,portable(row?.data));
      const stamp = new Date().toISOString();
      let response;
      if (row) response = await client.from('libraries').update({data:merged,updated_at:stamp}).eq('user_id',user.id).eq('updated_at',row.updated_at).select('updated_at').maybeSingle();
      else response = await client.from('libraries').insert({user_id:user.id,data:merged,updated_at:stamp}).select('updated_at').single();
      if (response.error) throw response.error;
      if (!response.data) throw new Error('The cloud library changed during sync. Retry to merge the latest version.');
      remember(user.id,{data:merged,updated_at:response.data.updated_at});
      return merged;
    } finally { writing = false; }
  }
  window.KOGGSync = {configured,getClient,currentUser,signUp,signIn,signOut,resetPassword,updatePassword,push,pull,libraryPayload};
})();
