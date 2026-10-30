/* Validated, versioned library backups and portable cloud data. */
(function (scope) {
  'use strict';
  const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
  function clean(value) {
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object') {
      const result = {};
      for (const [key, item] of Object.entries(value)) {
        if (forbidden.has(key)) throw new Error('Unsafe key in library data');
        result[key] = clean(item);
      }
      return result;
    }
    return value;
  }
  const fail = message => { throw new Error(message); };
  const text = value => typeof value === 'string';
  const identified = item => item && text(item.id) && item.id.length > 0 && item.id.length <= 200;
  function records(value, validate, label) {
    if (!Array.isArray(value) || !value.every(validate) || new Set(value.map(v => v.id)).size !== value.length) fail('Invalid ' + label);
    return value;
  }
  function slides(value) { return Array.isArray(value) && value.every(v => v && text(v.text) && text(v.label)); }
  function validate(raw) {
    const d = clean(raw);
    if (!d || typeof d !== 'object' || Array.isArray(d)) fail('Invalid library');
    if (d.version !== undefined && ![1, 2].includes(d.version)) fail('Unsupported backup version');
    if (d.songs !== undefined) records(d.songs, s => identified(s) && text(s.title) && text(s.lyrics) && (s.author === undefined || text(s.author)), 'songs');
    if (d.themes !== undefined) records(d.themes, t => identified(t) && text(t.name) && text(t.bg) && text(t.font) && text(t.textColor) && Number.isFinite(t.fontSize) && t.fontSize > 0 && t.fontSize <= 100 && (!t.bgImageId || text(t.bgImageId)) && (!t.bgImage || text(t.bgImage)), 'themes');
    if (d.service !== undefined) records(d.service, i => identified(i) && text(i.title) && ['song','scripture'].includes(i.type) && slides(i.slides), 'service');
    if (d.plans !== undefined) {
      if (!d.plans || typeof d.plans !== 'object' || Array.isArray(d.plans)) fail('Invalid plans');
      for (const items of Object.values(d.plans)) records(items, i => identified(i) && text(i.title) && ['song','scripture'].includes(i.type) && slides(i.slides), 'plan items');
    }
    if (d.settings !== undefined) {
      if (!d.settings || typeof d.settings !== 'object' || Array.isArray(d.settings)) fail('Invalid settings');
      const settings = d.settings;
      for (const key of ['currentThemeId','currentTranslation','logoId','logoImage','logoName','layoutVer']) if (settings[key] !== undefined && !text(settings[key])) fail('Invalid setting: ' + key);
      for (const key of ['light','strongsOn','panesLocked','fpFold','showFloatPreview','showFloatNav','showFloatEdit','starterSeeded','dirtyLibrary']) if (settings[key] !== undefined && typeof settings[key] !== 'boolean') fail('Invalid setting: ' + key);
      if (settings.mode !== undefined && !['','base','local','sync'].includes(settings.mode)) fail('Invalid work mode');
      if (settings.verseMode !== undefined && !['verse','range','chapter'].includes(settings.verseMode)) fail('Invalid verse mode');
      for (const key of ['dockOrder','hiddenDocks']) if (settings[key] !== undefined && (!Array.isArray(settings[key]) || !settings[key].every(text))) fail('Invalid setting: ' + key);
      for (const key of ['fpPos','fePos']) if (settings[key] !== undefined && (!settings[key] || !Number.isFinite(settings[key].x) || !Number.isFinite(settings[key].y))) fail('Invalid setting: ' + key);
      if (settings.dockSizes !== undefined && (!settings.dockSizes || typeof settings.dockSizes !== 'object' || Array.isArray(settings.dockSizes) || !Object.values(settings.dockSizes).every(v => Array.isArray(v) && v.length === 2 && v.every(n => Number.isFinite(n) && n > 0)))) fail('Invalid dock sizes');
      if (settings.paneHeights !== undefined && (!settings.paneHeights || typeof settings.paneHeights !== 'object' || Array.isArray(settings.paneHeights) || !Object.values(settings.paneHeights).every(n => Number.isFinite(n) && n > 0))) fail('Invalid pane heights');
      if (d.settings.customVersions !== undefined && (!Array.isArray(d.settings.customVersions) || !d.settings.customVersions.every(v => v && text(v.name) && text(v.assetId)))) fail('Invalid custom versions');
    }
    if (d.assets !== undefined && (!d.assets || typeof d.assets !== 'object' || Array.isArray(d.assets) || !Object.values(d.assets).every(text))) fail('Invalid backup assets');
    if (!['songs','themes','service','plans'].some(k => d[k] !== undefined)) fail('No library records found');
    return d;
  }
  function assetIds(d, includeBibles = true) {
    const ids = new Set();
    if (d.settings?.logoId) ids.add(d.settings.logoId);
    for (const t of d.themes || []) if (t.bgImageId) ids.add(t.bgImageId);
    if (includeBibles) for (const v of d.settings?.customVersions || []) ids.add(v.assetId);
    return [...ids];
  }
  function mergeRecords(local, incoming) { return [...new Map([...local, ...incoming].map(v => [v.id, v])).values()]; }
  function portableSettings(settings) {
    const result = {};
    for (const k of ['logoId','logoImage','logoName']) if (settings[k] !== undefined) result[k] = settings[k];
    return result;
  }
  // A three-way merge detects conflicts instead of overwriting either device.
  function merge(base, local, remote) {
    base = base || {}; local = local || {}; remote = remote || {};
    const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key,stable(value[key])])) : value;
    const same = (a,b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
    function choose(b,l,r,key) {
      if (same(l,r) || same(r,b)) return l;
      if (same(l,b)) return r;
      throw new Error('Sync conflict in ' + key + '. Your local data is unchanged. Export a backup before resolving this on your other device.');
    }
    function byId(key) {
      const b = new Map((base[key] || []).map(v => [v.id,v]));
      const l = new Map((local[key] || []).map(v => [v.id,v]));
      const r = new Map((remote[key] || []).map(v => [v.id,v]));
      return [...new Set([...b.keys(),...l.keys(),...r.keys()])].map(id => choose(b.get(id),l.get(id),r.get(id),key + '/' + id)).filter(Boolean);
    }
    const plans = {}, settings = {};
    for (const key of new Set([...Object.keys(base.plans || {}),...Object.keys(local.plans || {}),...Object.keys(remote.plans || {})])) {
      const v = choose(base.plans?.[key],local.plans?.[key],remote.plans?.[key],'plan/' + key);
      if (v !== undefined) plans[key] = v;
    }
    for (const key of ['logoId','logoImage','logoName']) {
      const v = choose(base.settings?.[key],local.settings?.[key],remote.settings?.[key],'settings/' + key);
      if (v !== undefined) settings[key] = v;
    }
    return {songs:byId('songs'),themes:byId('themes'),plans,settings,assets:{...(remote.assets || {}),...(local.assets || {})}};
  }
  const api = { validate, assetIds, mergeRecords, portableSettings, merge };
  if (typeof module !== 'undefined') module.exports = api;
  else scope.KOGGLibrary = api;
})(typeof window !== 'undefined' ? window : globalThis);
