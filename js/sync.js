/* KOGG Presenter — cloud sync via Supabase (free tier).
   Loads supabase-js lazily only when configured; everything degrades gracefully offline. */
'use strict';

(function () {
  const cfg = window.KOGG_SUPABASE || {};
  const configured = !!(cfg.url && cfg.anonKey);
  let sb = null;          // supabase client
  let ready = null;       // promise

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('load failed'));
      document.head.appendChild(s);
    });
  }

  async function getClient() {
    if (sb) return sb;
    if (!configured) throw new Error('not-configured');
    if (!ready) ready = loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js')
      .then(() => { sb = window.supabase.createClient(cfg.url, cfg.anonKey); return sb; });
    return ready;
  }

  async function currentUser() {
    const client = await getClient();
    const { data } = await client.auth.getUser();
    return data && data.user ? data.user : null;
  }

  async function signUp(email, password) {
    const client = await getClient();
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async function signIn(email, password) {
    const client = await getClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const client = await getClient();
    await client.auth.signOut();
  }

  async function resetPassword(email) {
    const client = await getClient();
    const { error } = await client.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  async function libraryPayload() {
    const get = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
    const payload = {
      songs: get('cp_songs') || [],
      themes: get('cp_themes') || [],
      plans: get('cp_plans') || {},
      settings: get('cp_settings') || {},
      assets: {},
    };
    // upload the actual image data (IndexedDB assets) that the library references
    if (window.KOGGAssets) {
      const ids = new Set();
      if (payload.settings.logoId) ids.add(payload.settings.logoId);
      (payload.themes || []).forEach(t => { if (t.bgImageId) ids.add(t.bgImageId); });
      for (const id of ids) {
        const v = await window.KOGGAssets.get(id).catch(() => null);
        if (v) payload.assets[id] = v;
      }
    }
    return payload;
  }

  async function push() {
    const client = await getClient();
    const user = await currentUser();
    if (!user) throw new Error('not-signed-in');
    const payload = await libraryPayload();
    const { error } = await client.from('libraries').upsert({
      user_id: user.id, data: payload, updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return payload;
  }

  async function pull() {
    const client = await getClient();
    const user = await currentUser();
    if (!user) throw new Error('not-signed-in');
    const { data, error } = await client.from('libraries').select('data').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return data ? data.data : null;
  }

  window.KOGGSync = { configured, getClient, currentUser, signUp, signIn, signOut, resetPassword, push, pull, libraryPayload };
})();
